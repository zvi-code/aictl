"""Data collector that wraps discovery for dashboard consumption.

Provides snapshot and periodic-refresh helpers that both the TUI
dashboard and the HTML report can use.
"""

from __future__ import annotations

import asyncio
import dataclasses
import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path

from ..discovery import (
    McpServerInfo,
    MemoryEntry,
    ResourceFile,
    ToolResources,
    collect_agent_memory,
    collect_mcp_status,
    discover_all,
)
from ..monitoring.config import MonitorConfig
from ..monitoring.runtime import MonitorRuntime


@dataclass
class DashboardTool:
    """Dashboard-friendly tool record with optional live monitor data."""

    tool: str
    label: str
    files: list[ResourceFile] = field(default_factory=list)
    processes: list = field(default_factory=list)
    mcp_servers: list[dict] = field(default_factory=list)
    memory: dict | None = None
    live: dict | None = None
    token_breakdown: dict = field(default_factory=dict)


@dataclass
class DashboardSnapshot:
    """A point-in-time snapshot of all AI tool resources."""

    timestamp: float
    root: str
    tools: list[DashboardTool]

    # ── New enriched data ────────────────────────────────────────
    agent_memory: list[MemoryEntry] = field(default_factory=list)
    mcp_detail: list[McpServerInfo] = field(default_factory=list)
    live_monitor: dict = field(default_factory=dict)

    # ── System info ────────────────────────────────────────────
    cpu_cores: int = 0

    # ── Aggregate stats (computed once) ──────────────────────────
    total_files: int = 0
    total_tokens: int = 0
    total_size: int = 0
    total_processes: int = 0
    total_cpu: float = 0.0
    total_mem_mb: float = 0.0
    total_mcp_servers: int = 0
    total_memory_entries: int = 0
    total_memory_tokens: int = 0
    total_live_sessions: int = 0
    total_live_tools: int = 0
    total_live_inbound_bytes: int = 0
    total_live_outbound_bytes: int = 0
    total_live_inbound_rate_bps: float = 0.0
    total_live_outbound_rate_bps: float = 0.0
    total_live_estimated_tokens: int = 0
    total_live_files_touched: int = 0

    def __post_init__(self):
        self._compute_aggregates()

    def _compute_aggregates(self):
        self.cpu_cores = os.cpu_count() or 1
        # Exclude aictl (.aictx) files from main stats — they have their own tab
        tool_list = [t for t in self.tools if t.tool != "aictl"]
        self.total_files = sum(len(t.files) for t in tool_list)
        self.total_tokens = sum(f.tokens for t in tool_list for f in t.files)
        self.total_size = sum(f.size for t in tool_list for f in t.files)
        self.total_processes = sum(len(t.processes) for t in self.tools)
        # Use deduplicated mcp_detail count when available, fall back to raw sum
        if self.mcp_detail:
            self.total_mcp_servers = len(self.mcp_detail)
        else:
            seen: set[str] = set()
            for t in self.tools:
                for s in t.mcp_servers:
                    seen.add(s.get("name", ""))
            self.total_mcp_servers = len(seen)

        cpu = 0.0
        mem = 0.0
        for t in self.tools:
            for p in t.processes:
                try:
                    cpu += float(p.cpu_pct)
                except (ValueError, TypeError):
                    pass
                try:
                    mem += float(p.mem_mb)
                except (ValueError, TypeError):
                    pass
        self.total_cpu = round(cpu, 1)
        self.total_mem_mb = round(mem, 1)

        # Memory aggregates
        self.total_memory_entries = len(self.agent_memory)
        self.total_memory_tokens = sum(m.tokens for m in self.agent_memory)

        live_tools = [live for live in (getattr(t, "live", None) for t in tool_list) if live]
        self.total_live_tools = len(live_tools)
        self.total_live_sessions = sum(int(t.get("session_count", 0)) for t in live_tools)
        self.total_live_inbound_bytes = sum(int(t.get("inbound_bytes", 0)) for t in live_tools)
        self.total_live_outbound_bytes = sum(int(t.get("outbound_bytes", 0)) for t in live_tools)
        self.total_live_inbound_rate_bps = round(
            sum(float(t.get("inbound_rate_bps", 0.0)) for t in live_tools), 2
        )
        self.total_live_outbound_rate_bps = round(
            sum(float(t.get("outbound_rate_bps", 0.0)) for t in live_tools), 2
        )
        self.total_live_estimated_tokens = sum(
            int(t.get("token_estimate", {}).get("input_tokens", 0))
            + int(t.get("token_estimate", {}).get("output_tokens", 0))
            for t in live_tools
        )
        self.total_live_files_touched = sum(int(t.get("files_touched", 0)) for t in live_tools)

    def to_dict(self) -> dict:
        """Serialisable dict for JSON export and HTML template."""
        return {
            "timestamp": self.timestamp,
            "root": self.root,
            "cpu_cores": self.cpu_cores,
            "total_files": self.total_files,
            "total_tokens": self.total_tokens,
            "total_size": self.total_size,
            "total_processes": self.total_processes,
            "total_cpu": self.total_cpu,
            "total_mem_mb": self.total_mem_mb,
            "total_mcp_servers": self.total_mcp_servers,
            "total_memory_entries": self.total_memory_entries,
            "total_memory_tokens": self.total_memory_tokens,
            "total_live_sessions": self.total_live_sessions,
            "total_live_tools": self.total_live_tools,
            "total_live_inbound_bytes": self.total_live_inbound_bytes,
            "total_live_outbound_bytes": self.total_live_outbound_bytes,
            "total_live_inbound_rate_bps": self.total_live_inbound_rate_bps,
            "total_live_outbound_rate_bps": self.total_live_outbound_rate_bps,
            "total_live_estimated_tokens": self.total_live_estimated_tokens,
            "total_live_files_touched": self.total_live_files_touched,
            "tools": [dataclasses.asdict(t) for t in self.tools],
            "agent_memory": [dataclasses.asdict(m) for m in self.agent_memory],
            "mcp_detail": [dataclasses.asdict(s) for s in self.mcp_detail],
            "live_monitor": self.live_monitor,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)


def collect(
    root: Path,
    include_processes: bool = True,
    *,
    include_live_monitor: bool = False,
    live_sample_seconds: float = 1.2,
) -> DashboardSnapshot:
    """Take a single snapshot."""
    root_path = root.resolve()
    discovered = discover_all(root_path, include_processes=include_processes)
    live_monitor = _collect_live_monitor(root_path, live_sample_seconds) if include_live_monitor else {}
    tools = _merge_dashboard_tools(discovered, live_monitor)
    agent_memory = collect_agent_memory(root_path)
    mcp_detail = collect_mcp_status(discovered)
    return DashboardSnapshot(
        timestamp=time.time(),
        root=str(root_path),
        tools=tools,
        agent_memory=agent_memory,
        mcp_detail=mcp_detail,
        live_monitor=live_monitor,
    )


def _compute_token_breakdown(files: list[ResourceFile]) -> dict:
    """Compute per-tool token breakdown from file metadata."""
    always = on_demand = conditional = never = 0
    by_kind: dict[str, int] = {}
    for f in files:
        tok = f.tokens
        s2l = (f.sent_to_llm or "").lower()
        if s2l == "yes":
            always += tok
        elif s2l == "on-demand":
            on_demand += tok
        elif s2l in ("conditional", "partial"):
            conditional += tok
        else:
            never += tok
        kind = f.kind or "other"
        by_kind[kind] = by_kind.get(kind, 0) + tok
    return {
        "always_loaded": always,
        "on_demand": on_demand,
        "conditional": conditional,
        "never_sent": never,
        "total": always + on_demand + conditional + never,
        "by_kind": by_kind,
    }


def _merge_dashboard_tools(discovered: list[ToolResources], live_monitor: dict) -> list[DashboardTool]:
    tools_by_name: dict[str, DashboardTool] = {}
    for resource in discovered:
        files = list(resource.files)
        tools_by_name[resource.tool] = DashboardTool(
            tool=resource.tool,
            label=resource.label,
            files=files,
            processes=list(resource.processes),
            mcp_servers=list(resource.mcp_servers),
            memory=resource.memory,
            token_breakdown=_compute_token_breakdown(files),
        )

    for live_report in live_monitor.get("tools", []):
        tool_name = str(live_report.get("tool", ""))
        if not tool_name:
            continue
        if tool_name not in tools_by_name:
            tools_by_name[tool_name] = DashboardTool(
                tool=tool_name,
                label=str(live_report.get("label", tool_name)),
            )
        tools_by_name[tool_name].live = live_report

    return list(tools_by_name.values())


def _collect_live_monitor(root: Path, live_sample_seconds: float) -> dict:
    try:
        # Network needs ≥2 samples to compute deltas, so use a short
        # network interval (0.5s) and ensure the sample window is ≥2s.
        sample_window = max(2.5, live_sample_seconds)
        config = MonitorConfig.for_root(
            root,
            sample_interval=0.5,
            refresh_interval=1.0,
            process_interval=1.0,
            network_interval=0.5,
            telemetry_interval=5.0,
            filesystem_enabled=True,
            telemetry_enabled=True,
        )
        runtime = MonitorRuntime(config)

        async def _guarded_snapshot():
            return await asyncio.wait_for(
                runtime.snapshot_after(sample_window), timeout=sample_window + 5.0
            )

        snapshot = asyncio.run(_guarded_snapshot())
        return {
            "platform": snapshot.platform,
            "diagnostics": snapshot.diagnostics,
            "tools": snapshot.tools,
            "workspace_paths": snapshot.workspace_paths,
            "state_paths": snapshot.state_paths,
        }
    except Exception as exc:  # pragma: no cover - defensive path
        return {
            "platform": "",
            "diagnostics": {
                "monitor": {
                    "status": "error",
                    "mode": "snapshot",
                    "detail": str(exc),
                }
            },
            "tools": [],
            "workspace_paths": [],
            "state_paths": [],
        }
