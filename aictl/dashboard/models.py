# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Dashboard data models.

``DashboardTool`` and ``DashboardSnapshot`` are the primary data models
for all dashboard renderers (web, TUI, static HTML report).
"""

from __future__ import annotations

import dataclasses
import json
import os
from dataclasses import dataclass, field

from ..utils import norm_path


@dataclass
class DashboardTool:
    """Dashboard-friendly tool record with optional live monitor data."""

    tool: str
    label: str
    vendor: str = ""
    host: str = ""
    meta: bool = False   # True = infrastructure/context, not an interactive AI tool
    files: list = field(default_factory=list)
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

    # ── Enriched data ─────────────────────────────────────────────
    agent_memory: list = field(default_factory=list)
    mcp_detail: list = field(default_factory=list)
    live_monitor: dict = field(default_factory=dict)
    tool_telemetry: list[dict] = field(default_factory=list)
    tool_configs: list[dict] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)
    sessions: list[dict] = field(default_factory=list)
    agent_teams: list[dict] = field(default_factory=list)

    # ── System info ───────────────────────────────────────────────
    cpu_cores: int = 0
    cpu_per_core: list[float] = field(default_factory=list)

    # ── Aggregate stats (computed once) ───────────────────────────
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
        self.root = norm_path(self.root)
        self._compute_aggregates()

    def _compute_aggregates(self):
        self.cpu_cores = os.cpu_count() or 1
        try:
            import psutil
            # interval=0 returns since last call; first call is always 0.
            # Use interval=0.1 to get a real sample on every snapshot.
            self.cpu_per_core = psutil.cpu_percent(interval=0.1, percpu=True)
        except Exception:
            self.cpu_per_core = []
        tool_list = [t for t in self.tools if t.tool != "aictl"]
        self.total_files = sum(len(t.files) for t in tool_list)
        self.total_tokens = sum(f.tokens for t in tool_list for f in t.files)
        self.total_size = sum(f.size for t in tool_list for f in t.files)
        # total_processes computed below (uses max of discovery + live pid_count)
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
        proc_count = 0
        for t in self.tools:
            # Prefer live correlator data for CPU/memory (accurate, real-time)
            live = getattr(t, "live", None) or (t.live if hasattr(t, "live") else None)
            if live and live.get("cpu_percent"):
                try:
                    cpu += float(live["cpu_percent"])
                except (ValueError, TypeError):
                    pass
            else:
                # Fallback to per-process data from discovery
                for p in t.processes:
                    try:
                        v = p.get("cpu_pct", 0) if isinstance(p, dict) else getattr(p, "cpu_pct", 0)
                        cpu += float(v) if v else 0
                    except (ValueError, TypeError):
                        pass
            # Memory: sum from process data OR use peak from live
            if live and live.get("peak_cpu_percent"):
                # peak_cpu_percent is actually used as mem indicator in some paths
                pass
            for p in t.processes:
                try:
                    v = p.get("mem_mb", 0) if isinstance(p, dict) else getattr(p, "mem_mb", 0)
                    mem += float(v) if v else 0
                except (ValueError, TypeError):
                    pass
            # Process count: max of discovery and live pid_count
            disc_procs = len(t.processes)
            live_pids = int(live.get("pid_count", 0)) if live else 0
            proc_count += max(disc_procs, live_pids)
        self.total_cpu = round(cpu, 1)
        self.total_mem_mb = round(mem, 1)
        self.total_processes = proc_count

        self.total_memory_entries = len(self.agent_memory)
        self.total_memory_tokens = sum(
            m.tokens if hasattr(m, "tokens") else (m.get("tokens", 0) if isinstance(m, dict) else 0)
            for m in self.agent_memory
        )

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
            "cpu_per_core": self.cpu_per_core,
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
            "agent_memory": [dataclasses.asdict(m) if dataclasses.is_dataclass(m) else m
                             for m in self.agent_memory],
            "mcp_detail": [dataclasses.asdict(s) if dataclasses.is_dataclass(s) else s
                           for s in self.mcp_detail],
            "live_monitor": self.live_monitor,
            "tool_telemetry": self.tool_telemetry,
            "tool_configs": self.tool_configs,
            "events": self.events,
            "sessions": self.sessions,
            "agent_teams": self.agent_teams,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, d: dict) -> "DashboardSnapshot":
        """Reconstruct from a dict (e.g. from /api/snapshot JSON)."""
        from ..discovery import ResourceFile, MemoryEntry, McpServerInfo

        tools = []
        for td in d.get("tools", []):
            files = [ResourceFile(**f) if isinstance(f, dict) else f
                     for f in td.get("files", [])]
            tools.append(DashboardTool(
                tool=td.get("tool", ""),
                label=td.get("label", ""),
                vendor=td.get("vendor", ""),
                host=td.get("host", ""),
                files=files,
                processes=td.get("processes", []),
                mcp_servers=td.get("mcp_servers", []),
                memory=td.get("memory"),
                live=td.get("live"),
                token_breakdown=td.get("token_breakdown", {}),
            ))

        memory = []
        for md in d.get("agent_memory", []):
            try:
                memory.append(MemoryEntry(**md) if isinstance(md, dict) else md)
            except TypeError:
                pass

        mcp = []
        for sd in d.get("mcp_detail", []):
            try:
                mcp.append(McpServerInfo(**sd) if isinstance(sd, dict) else sd)
            except TypeError:
                pass

        return cls(
            timestamp=d.get("timestamp", 0),
            root=d.get("root", ""),
            tools=tools,
            agent_memory=memory,
            mcp_detail=mcp,
            live_monitor=d.get("live_monitor", {}),
            tool_telemetry=d.get("tool_telemetry", []),
            tool_configs=d.get("tool_configs", []),
            events=d.get("events", []),
            sessions=d.get("sessions", []),
            cpu_per_core=d.get("cpu_per_core", []),
        )
