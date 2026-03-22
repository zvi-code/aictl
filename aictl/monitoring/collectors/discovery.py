# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Discovery collector — wraps static file/process scanning as a BaseCollector.

Runs ``discover_all()`` periodically on a thread (CPU-bound: file stat,
glob, CSV parsing) and emits results through the correlator and sink,
just like every other collector.

This replaces the synchronous ``discover_all()`` call that was previously
embedded in the RefreshLoop.  By running as a collector, discovery
participates in the same lifecycle (start/cancel) as process, network,
filesystem, and telemetry collectors.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from .base import BaseCollector
from ..config import MonitorConfig
from ...data.schema import metric_name as M


class DiscoveryCollector(BaseCollector):
    """Periodically scan for AI tool files, configs, MCP servers, and processes."""

    name = "discovery:csv"

    def __init__(self, config: MonitorConfig, *, interval: float = 10.0,
                 include_processes: bool = True) -> None:
        super().__init__()
        self.config = config
        self._interval = interval
        self._include_processes = include_processes
        self._root = config.workspace_paths[0] if config.workspace_paths else Path(".")
        # Latest scan result, read by RefreshLoop to build DashboardSnapshot
        self._latest: list | None = None

    @property
    def latest(self):
        """Most recent discover_all() result (list[ToolResources] or None)."""
        return self._latest

    async def run(self) -> None:
        from ...discovery import discover_all

        await self.report_status(
            status="active",
            mode="csv-scan",
            detail=f"Scanning {self._root} every {self._interval}s",
        )

        while True:
            discovered = await asyncio.to_thread(
                discover_all, self._root,
                include_processes=self._include_processes)
            self._latest = discovered

            # Emit per-tool discovery metrics through sink
            for tool_res in discovered:
                tool = tool_res.tool
                if tool == "aictl":
                    continue
                tags = {"tool": tool}
                self.sink_emit_if_changed(M("aictl.discovery.files"), float(len(tool_res.files)), tags)
                self.sink_emit_if_changed(M("aictl.discovery.tokens"),
                               float(sum(f.tokens for f in tool_res.files)), tags)
                self.sink_emit_if_changed(M("aictl.discovery.size"),
                               float(sum(f.size for f in tool_res.files)), tags)
                self.sink_emit_if_changed(M("aictl.discovery.processes"),
                               float(len(tool_res.processes)), tags)
                self.sink_emit_if_changed(M("aictl.discovery.mcp_servers"),
                               float(len(tool_res.mcp_servers)), tags)

                # Per-file metrics (only emit when file tokens/size change)
                for f in tool_res.files:
                    ftags = {"aictl.tool": tool, "file.path": f.path,
                             "aictl.file.kind": f.kind, "aictl.file.scope": f.scope,
                             "aictl.file.sent_to_llm": f.sent_to_llm}
                    self.sink_emit_if_changed(M("aictl.file.tokens"), float(f.tokens), ftags)
                    self.sink_emit_if_changed(M("aictl.file.bytes"), float(f.size), ftags)

                # Per-MCP-server status
                for m in tool_res.mcp_servers:
                    mname = m.get("name", "") if isinstance(m, dict) else getattr(m, "name", "")
                    status = m.get("status", "") if isinstance(m, dict) else getattr(m, "status", "")
                    if mname:
                        self.sink_emit_if_changed(M("aictl.mcp.status"),
                                       1.0 if status == "running" else 0.0,
                                       {"aictl.tool": tool, "aictl.mcp.server": mname})

            await self.sleep(self._interval)
