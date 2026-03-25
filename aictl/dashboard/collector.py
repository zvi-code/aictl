"""Data collector that wraps discovery for dashboard consumption.

Provides snapshot and periodic-refresh helpers that both the TUI
dashboard and the HTML report can use.
"""

from __future__ import annotations

import dataclasses
import json
import time
from dataclasses import dataclass, field
from pathlib import Path

from ..discovery import (
    McpServerInfo,
    MemoryEntry,
    ToolResources,
    collect_agent_memory,
    collect_mcp_status,
    discover_all,
)


@dataclass
class DashboardSnapshot:
    """A point-in-time snapshot of all AI tool resources."""

    timestamp: float
    root: str
    tools: list[ToolResources]

    # ── New enriched data ────────────────────────────────────────
    agent_memory: list[MemoryEntry] = field(default_factory=list)
    mcp_detail: list[McpServerInfo] = field(default_factory=list)

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

    def __post_init__(self):
        self._compute_aggregates()

    def _compute_aggregates(self):
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

    def to_dict(self) -> dict:
        """Serialisable dict for JSON export and HTML template."""
        return {
            "timestamp": self.timestamp,
            "root": self.root,
            "total_files": self.total_files,
            "total_tokens": self.total_tokens,
            "total_size": self.total_size,
            "total_processes": self.total_processes,
            "total_cpu": self.total_cpu,
            "total_mem_mb": self.total_mem_mb,
            "total_mcp_servers": self.total_mcp_servers,
            "total_memory_entries": self.total_memory_entries,
            "total_memory_tokens": self.total_memory_tokens,
            "tools": [dataclasses.asdict(t) for t in self.tools],
            "agent_memory": [dataclasses.asdict(m) for m in self.agent_memory],
            "mcp_detail": [dataclasses.asdict(s) for s in self.mcp_detail],
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)


def collect(root: Path, include_processes: bool = True) -> DashboardSnapshot:
    """Take a single snapshot."""
    root_path = root.resolve()
    tools = discover_all(root_path, include_processes=include_processes)
    agent_memory = collect_agent_memory(root_path)
    mcp_detail = collect_mcp_status(tools)
    return DashboardSnapshot(
        timestamp=time.time(),
        root=str(root_path),
        tools=tools,
        agent_memory=agent_memory,
        mcp_detail=mcp_detail,
    )
