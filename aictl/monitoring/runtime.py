# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Runtime orchestration for the live monitor."""

from __future__ import annotations

import asyncio
import os
import platform
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from .collectors.discovery import DiscoveryCollector
from .collectors.filesystem import WatchdogFileCollector
from .collectors.network.fallback import PsutilFallbackNetworkCollector
from .collectors.network.linux import LinuxNetworkCollector
from .collectors.network.macos import MacOSNetworkCollector
from .collectors.network.windows import WindowsNetworkCollector
from .collectors.process import PsutilProcessCollector
from .collectors.telemetry import StructuredTelemetryCollector
from .config import MonitorConfig
from .correlator import MonitorSnapshot, SessionCorrelator


@dataclass(slots=True)
class CollectorPlan:
    """Resolved collector choices for the current platform."""

    names: list[str]


class MonitorRuntime:
    """Owns collector lifecycle and snapshot rendering."""

    def __init__(self, config: MonitorConfig, sink: "Any | None" = None) -> None:
        self.config = config
        self.platform = _platform_name()
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

    async def run_live(self) -> int:
        """Run until duration/interrupt and render snapshots as we go."""

        collector_tasks = [
            asyncio.create_task(collector.run(), name=f"collector:{collector.name}")
            for collector in self.collectors
        ]
        try:
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
        finally:
            for task in collector_tasks:
                task.cancel()
            await asyncio.gather(*collector_tasks, return_exceptions=True)

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
        collector_tasks = [
            asyncio.create_task(collector.run(), name=f"collector:{collector.name}")
            for collector in self.collectors
        ]
        try:
            await asyncio.sleep(seconds)
            return self.snapshot()
        finally:
            for task in collector_tasks:
                task.cancel()
            await asyncio.gather(*collector_tasks, return_exceptions=True)

    def _print_snapshot(self, snapshot: MonitorSnapshot) -> None:
        if self.config.json_output:
            print(_snapshot_json(snapshot))
            return
        if sys.stdout.isatty():
            print("\033[2J\033[H", end="")
        print(render_text_snapshot(snapshot))

    def _build_collectors(self):
        collectors = [
            PsutilProcessCollector(self.config),
            _select_network_collector(self.config),
            DiscoveryCollector(self.config, interval=10.0, include_processes=True),
        ]
        if self.config.filesystem_enabled:
            collectors.append(WatchdogFileCollector(self.config))
        if self.config.telemetry_enabled:
            collectors.append(StructuredTelemetryCollector(self.config))
        return collectors


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
    import json

    return json.dumps(
        {
            "generated_at": snapshot.generated_at,
            "platform": snapshot.platform,
            "diagnostics": snapshot.diagnostics,
            "tools": snapshot.tools,
            "workspace_paths": snapshot.workspace_paths,
            "state_paths": snapshot.state_paths,
        },
        indent=2,
    )


def _select_network_collector(config: MonitorConfig):
    system = platform.system()
    if system == "Darwin" and MacOSNetworkCollector.is_supported():
        return MacOSNetworkCollector(config.network_interval, debug=config.debug_network)
    if system == "Linux" and LinuxNetworkCollector.is_supported():
        return LinuxNetworkCollector(config.network_interval)
    if system == "Windows":
        return WindowsNetworkCollector(config.network_interval)
    return PsutilFallbackNetworkCollector(config.network_interval)


def _platform_name() -> str:
    system = platform.system()
    if system == "Darwin":
        return "macos"
    if system == "Windows":
        return "windows"
    if system == "Linux":
        return "linux"
    return system.lower()


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


def _format_bytes(value: int) -> str:
    if value < 1024:
        return f"{value} B"
    if value < 1024 * 1024:
        return f"{value / 1024:.1f} KB"
    if value < 1024 * 1024 * 1024:
        return f"{value / (1024 * 1024):.1f} MB"
    return f"{value / (1024 * 1024 * 1024):.1f} GB"


def _format_rate(value: float) -> str:
    return f"{_format_bytes(int(value))}/s"


def _format_tokens(value: int) -> str:
    if value >= 1000:
        return f"{value / 1000:.1f}k"
    return str(value)
