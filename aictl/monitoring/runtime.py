# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Runtime orchestration for the live monitor.

Also contains DiscoveryCollector.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path

from .collectors import BaseCollector, build_collectors
from .collectors.process import WatchdogFileCollector
from .collectors.network import (
    LinuxNetworkCollector,
    MacOSNetworkCollector,
    PsutilFallbackNetworkCollector,
    WindowsNetworkCollector,
)
from .collectors.process import PsutilProcessCollector
from .collectors.telemetry import StructuredTelemetryCollector
from .config import MonitorConfig
from .correlator import MonitorSnapshot, SessionCorrelator
from ..platforms import CURRENT_PLATFORM, IS_MACOS, IS_WINDOWS
from ..utils import human_size as _format_bytes, human_tokens as _format_tokens


# ── Discovery collector ─────────────────────────────────────────────────────


class DiscoveryCollector(BaseCollector):
    """Periodically scan for AI tool files, configs, MCP servers, and processes.

    Runs ``discover_all()`` periodically on a thread (CPU-bound: file stat,
    glob, CSV parsing) and emits results through the correlator and sink,
    just like every other collector.
    """

    name = "discovery:csv"

    def __init__(self, config: MonitorConfig, *, interval: float = 10.0,
                 include_processes: bool = True) -> None:
        super().__init__(config=config)
        self._interval = interval
        self._include_processes = include_processes
        self._root = config.workspace_paths[0] if config.workspace_paths else Path(".")
        self._latest: list | None = None

    @property
    def latest(self):
        """Most recent discover_all() result (list[ToolResources] or None)."""
        return self._latest

    async def run(self) -> None:
        from ..tools import discover_all
        from ..data.schema import metric_name as _M

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

            for tool_res in discovered:
                tool = tool_res.tool
                if tool == "aictl":
                    continue
                tags = {"tool": tool}
                self.sink_emit_if_changed(_M("aictl.discovery.files"), float(len(tool_res.files)), tags)
                self.sink_emit_if_changed(_M("aictl.discovery.tokens"),
                               float(sum(f.tokens for f in tool_res.files)), tags)
                self.sink_emit_if_changed(_M("aictl.discovery.size"),
                               float(sum(f.size for f in tool_res.files)), tags)
                self.sink_emit_if_changed(_M("aictl.discovery.processes"),
                               float(len(tool_res.processes)), tags)
                self.sink_emit_if_changed(_M("aictl.discovery.mcp_servers"),
                               float(len(tool_res.mcp_servers)), tags)

                for f in tool_res.files:
                    ftags = {"aictl.tool": tool, "file.path": f.path,
                             "aictl.file.kind": f.kind, "aictl.file.scope": f.scope,
                             "aictl.file.sent_to_llm": f.sent_to_llm}
                    self.sink_emit_if_changed(_M("aictl.file.tokens"), float(f.tokens), ftags)
                    self.sink_emit_if_changed(_M("aictl.file.bytes"), float(f.size), ftags)

                for m in tool_res.mcp_servers:
                    mname = m.get("name", "")
                    if mname:
                        self.sink_emit_if_changed(_M("aictl.mcp.status"),
                                       1.0 if m.get("status") == "running" else 0.0,
                                       {"aictl.tool": tool, "aictl.mcp.server": mname})

            await self.sleep(self._interval)


@dataclass(slots=True)
class CollectorPlan:
    """Resolved collector choices for the current platform."""

    names: list[str]


class MonitorRuntime:
    """Owns collector lifecycle and snapshot rendering."""

    def __init__(self, config: MonitorConfig, sink: "Any | None" = None) -> None:
        self.config = config
        self.platform = CURRENT_PLATFORM
        self.sink = sink
        self.workspace_sizes = {
            str(path): _dir_size(path, config.ignored_dir_names) for path in config.workspace_paths
        }
        self.correlator = SessionCorrelator(config, workspace_sizes=self.workspace_sizes, sink=sink)
        self.collectors = self._build_collectors()
        for collector in self.collectors:
            if sink:
                collector.set_sink(sink)
            collector.set_correlator(self.correlator)

    async def snapshot_after(self, seconds: float) -> MonitorSnapshot:
        """Run collectors briefly, then return a single snapshot."""

        return await self._run_temporarily(seconds)

    @contextlib.asynccontextmanager
    async def _collectors_running(self):
        """Start all collector tasks; cancel and join them on exit."""
        tasks = [
            asyncio.create_task(c.run(), name=f"collector:{c.name}")
            for c in self.collectors
        ]
        try:
            yield tasks
        finally:
            for t in tasks:
                t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    async def run_live(self) -> int:
        """Run until duration/interrupt and render snapshots as we go."""

        async with self._collectors_running():
            if self.config.once:
                await asyncio.sleep(max(self.config.sample_interval * 2, self.config.refresh_interval))
                self._print_snapshot(self.snapshot())
                return 0

            if self.config.duration_seconds is None:
                while True:
                    await asyncio.sleep(self.config.refresh_interval)
                    self._print_snapshot(self.snapshot())

            deadline = time.time() + self.config.duration_seconds
            while time.time() < deadline:
                await asyncio.sleep(self.config.refresh_interval)
                self._print_snapshot(self.snapshot())
            return 0

    def snapshot(self) -> MonitorSnapshot:
        """Current in-memory snapshot."""

        return MonitorSnapshot(
            generated_at=time.time(),
            platform=self.platform,
            diagnostics=self.correlator.diagnostics(),
            tools=[report.to_dict() for report in self.correlator.tool_reports()],
            workspace_paths=[str(path) for path in self.config.workspace_paths],
            state_paths=[str(path) for path in self.config.state_paths],
            events=self.correlator.drain_events(),
            sessions=self.correlator.active_sessions(),
        )

    def collector_plan(self) -> CollectorPlan:
        """Names of collectors planned for this run."""

        return CollectorPlan(names=[collector.name for collector in self.collectors])

    async def _run_temporarily(self, seconds: float) -> MonitorSnapshot:
        async with self._collectors_running():
            await asyncio.sleep(seconds)
            return self.snapshot()

    def _print_snapshot(self, snapshot: MonitorSnapshot) -> None:
        if self.config.json_output:
            print(_snapshot_json(snapshot))
            return
        if sys.stdout.isatty():
            print("\033[2J\033[H", end="")
        print(render_text_snapshot(snapshot))

    def _build_collectors(self):
        return build_collectors(self.config)


def render_text_snapshot(snapshot: MonitorSnapshot) -> str:
    """Human-readable monitor snapshot."""

    lines = [
        f"aictl monitor  {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(snapshot.generated_at))}",
        f"Platform: {snapshot.platform}",
        f"Workspaces: {', '.join(snapshot.workspace_paths) if snapshot.workspace_paths else '(none)'}",
    ]

    if snapshot.diagnostics:
        lines.append("")
        lines.append("Collectors:")
        for name, diagnostic in snapshot.diagnostics.items():
            lines.append(
                f"  {name}: {diagnostic.get('status', 'unknown')} [{diagnostic.get('mode', 'unknown')}]"
                f" - {diagnostic.get('detail', '')}"
            )

    if not snapshot.tools:
        lines.append("")
        lines.append("No active AI-tool sessions detected yet.")
        return "\n".join(lines)

    for tool in snapshot.tools:
        lines.extend(
            [
                "",
                f"Tool: {tool['label']}",
                f"  sessions: {tool['session_count']}  pids: {tool['pid_count']}  confidence: {tool['confidence']:.2f}",
                "  Traffic:",
                f"    outbound: {_format_bytes(tool['outbound_bytes'])} total  ({_format_rate(tool['outbound_rate_bps'])})",
                f"    inbound:  {_format_bytes(tool['inbound_bytes'])} total  ({_format_rate(tool['inbound_rate_bps'])})",
                "  Tokens (est):",
                f"    input: {_format_tokens(tool['token_estimate']['input_tokens'])}",
                f"    output: {_format_tokens(tool['token_estimate']['output_tokens'])}",
                f"    confidence: {tool['token_estimate']['confidence']:.2f} via {tool['token_estimate']['source']}",
                "  MCP:",
                f"    detected: {'YES' if tool['mcp']['detected'] else 'NO'}",
                f"    loops: {tool['mcp']['loops']}  confidence: {tool['mcp']['confidence']:.2f}",
                "  Context:",
                f"    repo: {tool['workspace_size_mb']:.1f} MB",
                f"    files touched: {tool['files_touched']}  events: {tool['file_events']}",
                f"    cpu: {tool['cpu_percent']:.1f}%  peak: {tool['peak_cpu_percent']:.1f}%",
                f"    sources: {', '.join(tool['sources']) if tool['sources'] else 'none'}",
                f"    workspaces: {', '.join(tool['workspaces']) if tool['workspaces'] else '(unknown)'}",
            ]
        )

    return "\n".join(lines)


def _snapshot_json(snapshot: MonitorSnapshot) -> str:
    d = asdict(snapshot)
    d.pop("events")
    d.pop("sessions")
    return json.dumps(d, indent=2)


def _select_network_collector(config: MonitorConfig):
    if IS_MACOS and MacOSNetworkCollector.is_supported():
        return MacOSNetworkCollector(config.network_interval, debug=config.debug_network)
    if not IS_MACOS and not IS_WINDOWS and LinuxNetworkCollector.is_supported():
        return LinuxNetworkCollector(config.network_interval)
    if IS_WINDOWS:
        return WindowsNetworkCollector(config.network_interval)
    return PsutilFallbackNetworkCollector(config.network_interval)


def _dir_size(path: Path, ignored_dir_names: tuple[str, ...]) -> int:
    total = 0
    if not path.exists():
        return 0
    for current_root, dir_names, file_names in os.walk(path):
        dir_names[:] = [name for name in dir_names if name not in ignored_dir_names]
        for filename in file_names:
            try:
                total += (Path(current_root) / filename).stat().st_size
            except OSError:
                continue
    return total


def _format_rate(value: float) -> str:
    return f"{_format_bytes(int(value))}/s"
