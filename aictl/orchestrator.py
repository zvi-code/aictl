# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Server orchestration: persistent monitor, refresh loop, collection, entry point.

Contains:
  - PersistentMonitor: runs MonitorRuntime continuously on a background thread
  - RefreshLoop: periodic snapshot collection (discovery + live merge + sink)
  - collect(): single snapshot combining discovery, live, enrichment
  - start_server(): wiring and startup
"""

from __future__ import annotations

import asyncio
import logging
import os
import signal
import subprocess
import sys
import time
import threading
import webbrowser
from pathlib import Path

log = logging.getLogger(__name__)

from .dashboard.models import DashboardSnapshot, DashboardTool
from .data.schema import metric_name as M
from .tools import (
    ResourceFile,
    ToolResources,
    collect_agent_memory,
    collect_mcp_status,
    discover_all,
    tool_vendor,
    tool_hosts,
    tool_is_meta,
    TOOL_LABELS,
    get_registry,
)
from .monitoring.tool_config import collect_tool_configs
from .monitoring.tool_telemetry import collect_tool_telemetry, scan_agent_teams


# ─── Persistent live monitor ─────────────────────────────────────

class PersistentMonitor:
    """Runs MonitorRuntime continuously on a background asyncio loop.

    Unlike the old approach (create runtime -> run 5s -> discard), this
    keeps the correlator alive so sessions, network deltas, and telemetry
    diffs accumulate across snapshot cycles.
    """

    def __init__(self, root: Path, sink=None) -> None:
        self._runtime = None
        self._loop = None
        self._thread = None
        self._root = root
        self._sink = sink  # SampleSink passed to MonitorRuntime
        self._ready = threading.Event()

    def start(self) -> None:
        """Start the monitor on a background thread."""
        self._thread = threading.Thread(target=self._run, daemon=True,
                                         name="aictl-monitor")
        self._thread.start()
        # Wait up to 10s for collectors to start
        self._ready.wait(timeout=10.0)

    def _run(self) -> None:
        from .monitoring.config import MonitorConfig
        from .monitoring.runtime import MonitorRuntime

        config = MonitorConfig.for_root(
            self._root,
            sample_interval=1.0,
            refresh_interval=1.0,
            process_interval=1.0,
            network_interval=1.0,
            telemetry_interval=5.0,
            filesystem_enabled=True,
            telemetry_enabled=True,
        )
        self._runtime = MonitorRuntime(config, sink=self._sink)

        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        async def _run_forever():
            collector_tasks = [
                asyncio.create_task(
                    collector.run(),
                    name=f"collector:{collector.name}")
                for collector in self._runtime.collectors
            ]
            self._ready.set()
            try:
                await asyncio.gather(*collector_tasks)
            except asyncio.CancelledError:
                pass
            finally:
                for task in collector_tasks:
                    task.cancel()

        try:
            self._loop.run_until_complete(_run_forever())
        except Exception as exc:
            log.warning("Monitor event loop exited: %s", exc)

    def snapshot_dict(self) -> dict | None:
        """Take a snapshot from the running runtime (instant, no blocking)."""
        if not self._runtime:
            return None
        try:
            snap = self._runtime.snapshot()
            return {
                "platform": snap.platform,
                "diagnostics": snap.diagnostics,
                "tools": snap.tools,
                "workspace_paths": snap.workspace_paths,
                "state_paths": snap.state_paths,
                "events": getattr(snap, "events", []),
                "sessions": getattr(snap, "sessions", []),
            }
        except Exception as exc:
            log.debug("snapshot_dict failed: %s", exc)
            return None

    def stop(self) -> None:
        if self._loop and self._loop.is_running():
            for task in asyncio.all_tasks(self._loop):
                self._loop.call_soon_threadsafe(task.cancel)


# ─── Background refresh loop ─────────────────────────────────────

class RefreshLoop(threading.Thread):
    """Periodically collects a new snapshot.

    Uses PersistentMonitor for live data instead of creating a new
    MonitorRuntime on each cycle.
    """

    def __init__(
        self,
        root: Path,
        interval: float,
        store: SnapshotStore,
        allowed: AllowedPaths,
        include_live_monitor: bool,
        monitor: "PersistentMonitor | None" = None,
    ) -> None:
        super().__init__(daemon=True)
        self._root = root
        self._interval = interval
        self._store = store
        self._allowed = allowed
        self._include_live_monitor = include_live_monitor
        self._monitor = monitor
        self._stop = threading.Event()

    def run(self) -> None:
        self._cycle = 0
        while not self._stop.is_set():
            try:
                # Get live monitor data from persistent runtime (instant)
                live_monitor = {}
                if self._include_live_monitor and self._monitor:
                    live_monitor = self._monitor.snapshot_dict() or {}

                # Use DiscoveryCollector's cached results if available
                # (avoids redundant discover_all() when the collector
                # already ran within the persistent monitor)
                discovered_cache = self._get_discovery_cache()

                snap = collect(
                    self._root,
                    include_processes=True,
                    _live_monitor_override=live_monitor,
                    _discovered_override=discovered_cache,
                    _sink=self._store._sink,
                )
                self._store.update(snap)
                self._allowed.update(snap)

                # Auto-compact every ~10 minutes (100 cycles at 6s)
                self._cycle += 1
                if self._cycle % 100 == 0 and self._store._db:
                    try:
                        self._store._db.compact()
                    except Exception as exc:
                        log.debug("DB compact failed: %s", exc)
            except Exception as exc:
                log.warning("Refresh loop error: %s", exc)
            self._stop.wait(self._interval)

    def _get_discovery_cache(self):
        """Read cached discover_all() result from the DiscoveryCollector."""
        if not self._monitor or not self._monitor._runtime:
            return None
        from .monitoring.runtime import DiscoveryCollector
        for c in self._monitor._runtime.collectors:
            if isinstance(c, DiscoveryCollector) and c.latest is not None:
                return c.latest
        return None

    def stop(self) -> None:
        self._stop.set()


# ─── Snapshot collection ─────────────────────────────────────────

def collect(
    root: Path,
    include_processes: bool = True,
    *,
    _live_monitor_override: dict | None = None,
    _discovered_override: list | None = None,
    _sink=None,
) -> DashboardSnapshot:
    """Take a single snapshot combining discovery, live, and enrichment.

    If *_live_monitor_override* is provided (from PersistentMonitor),
    it's used directly. If *_discovered_override* is provided (from
    DiscoveryCollector cache), it skips redundant scanning.
    """
    root_path = root.resolve()
    discovered = _discovered_override or discover_all(root_path, include_processes=include_processes)

    # Emit discovery data through sink (skip when DiscoveryCollector handled it)
    if _sink and _discovered_override is None:
        ts = time.time()
        for tool_res in discovered:
            tool = tool_res.tool
            if tool == "aictl":
                continue
            tags = {"tool": tool}
            _sink.emit_if_changed(M("aictl.discovery.files"), float(len(tool_res.files)), tags, ts=ts)
            _sink.emit_if_changed(M("aictl.discovery.tokens"), float(sum(f.tokens for f in tool_res.files)), tags, ts=ts)
            _sink.emit_if_changed(M("aictl.discovery.size"), float(sum(f.size for f in tool_res.files)), tags, ts=ts)
            _sink.emit_if_changed(M("aictl.discovery.processes"), float(len(tool_res.processes)), tags, ts=ts)
            _sink.emit_if_changed(M("aictl.discovery.mcp_servers"), float(len(tool_res.mcp_servers)), tags, ts=ts)
            # Per-file metrics: only emit on change (not every cycle).
            # The sink's dedup handles this — we just need a stable cache key.
            for f in tool_res.files:
                ftags = {"aictl.tool": tool, "file.path": f.path,
                         "aictl.file.kind": f.kind, "aictl.file.scope": f.scope,
                         "aictl.file.sent_to_llm": f.sent_to_llm}
                _sink.emit_if_changed(M("aictl.file.tokens"), float(f.tokens), ftags, ts=ts)
                _sink.emit_if_changed(M("aictl.file.bytes"), float(f.size), ftags, ts=ts)
            for m in tool_res.mcp_servers:
                mname = m.get("name", "")
                if mname:
                    _sink.emit_if_changed(M("aictl.mcp.status"),
                               1.0 if m.get("status") == "running" else 0.0,
                               {"aictl.tool": tool, "aictl.mcp.server": mname}, ts=ts)

    live_monitor = _live_monitor_override if _live_monitor_override is not None else {}
    tools = _merge_dashboard_tools(discovered, live_monitor)
    agent_memory = collect_agent_memory(root_path)
    mcp_detail = collect_mcp_status(discovered)
    telemetry_reports = collect_tool_telemetry(root_path)
    tool_telemetry = [r.to_dict() for r in telemetry_reports]
    agent_teams = scan_agent_teams(root_path)
    tool_configs = [c.to_dict() for c in collect_tool_configs(root_path)]
    _merge_telemetry_into_tools(tools, telemetry_reports)

    # Emit enrichment data through sink
    if _sink:
        ts = time.time()
        for m in agent_memory:
            if m.file:
                _sink.emit_if_changed(M("aictl.memory.tokens"), float(m.tokens),
                           {"file.path": m.file, "aictl.source": m.source}, ts=ts)
        for s in mcp_detail:
            if s.name:
                _sink.emit_if_changed(M("aictl.mcp.detail.status"),
                           1.0 if s.status == "running" else 0.0,
                           {"aictl.mcp.server": s.name, "aictl.tool": s.tool}, ts=ts)
        for r in telemetry_reports:
            if r.tool:
                rtags = {"tool": r.tool, "source": r.source}
                _sink.emit(M("gen_ai.client.token.usage.verified"), float(r.input_tokens),
                           {**rtags, "gen_ai.token.type": "input"}, ts=ts)
                _sink.emit(M("gen_ai.client.token.usage.verified"), float(r.output_tokens),
                           {**rtags, "gen_ai.token.type": "output"}, ts=ts)
                _sink.emit(M("aictl.telemetry.sessions"), float(r.total_sessions), rtags, ts=ts)
                _sink.emit(M("aictl.telemetry.messages"), float(r.total_messages), rtags, ts=ts)
                if r.cost_usd:
                    _sink.emit(M("aictl.telemetry.cost"), float(r.cost_usd), rtags, ts=ts)
        for c in tool_configs:
            if c.get("tool") and c.get("model"):
                _sink.emit_if_changed(M("aictl.config.model"), 1.0,
                           {"aictl.tool": c["tool"], "gen_ai.request.model": c["model"]}, ts=ts)

    monitor_events = live_monitor.get("events", [])
    monitor_sessions = live_monitor.get("sessions", [])

    return DashboardSnapshot(
        timestamp=time.time(),
        root=str(root_path),
        tools=tools,
        agent_memory=agent_memory,
        mcp_detail=mcp_detail,
        live_monitor=live_monitor,
        tool_telemetry=tool_telemetry,
        tool_configs=tool_configs,
        events=monitor_events,
        sessions=monitor_sessions,
        agent_teams=agent_teams,
    )


_S2L_CATEGORY: dict[str, str] = {
    "yes": "always_loaded",
    "on-demand": "on_demand",
    "conditional": "conditional",
    "partial": "conditional",
}


def _compute_token_breakdown(files: list[ResourceFile]) -> dict:
    cats: dict[str, int] = {"always_loaded": 0, "on_demand": 0, "conditional": 0, "never_sent": 0}
    by_kind: dict[str, int] = {}
    for f in files:
        tok = f.tokens
        cat = _S2L_CATEGORY.get((f.sent_to_llm or "").lower(), "never_sent")
        cats[cat] += tok
        by_kind[f.kind or "other"] = by_kind.get(f.kind or "other", 0) + tok
    return {**cats, "total": sum(cats.values()), "by_kind": by_kind}


def _sum_process_stat(processes, attr: str) -> float:
    """Sum a numeric string attribute (cpu_pct or mem_mb) across processes."""
    return sum(
        float(getattr(p, attr))
        for p in processes
        if hasattr(p, attr) and str(getattr(p, attr)).replace(".", "", 1).isdigit()
    )


def _make_dt(name: str) -> DashboardTool:
    return DashboardTool(
        tool=name, label=TOOL_LABELS.get(name, name),
        vendor=tool_vendor(name), host=",".join(tool_hosts(name)),
        meta=tool_is_meta(name),
    )


def _merge_dashboard_tools(discovered: list[ToolResources], live_monitor: dict) -> list[DashboardTool]:
    tools_by_name: dict[str, DashboardTool] = {}

    # Seed with all tracked tools. Skip internal/infrastructure entries that
    # are never shown as interactive AI tools in the UI.
    ui_skip = {"aictl", "any"}
    try:
        registry = get_registry()
        all_tool_names = {s.ai_tool for s in registry.path_specs()} | {s.ai_tool for s in registry.process_specs()}
        for name in sorted(all_tool_names - ui_skip):
            tools_by_name[name] = _make_dt(name)
    except Exception as exc:
        log.warning("Registry loading failed: %s", exc)
    for tr in discovered:
        if tr.tool in ui_skip:
            continue
        dt = tools_by_name.get(tr.tool) or _make_dt(tr.tool)
        dt.files = list(tr.files)
        dt.processes = list(tr.processes)
        dt.mcp_servers = list(tr.mcp_servers)
        dt.memory = tr.memory
        dt.token_breakdown = _compute_token_breakdown(tr.files)
        tools_by_name[tr.tool] = dt

    # Merge live monitor data
    for live_report in live_monitor.get("tools", []):
        tool_name = live_report.get("tool", "")
        if not tool_name or tool_name in ui_skip:
            continue
        dt = tools_by_name.setdefault(tool_name, _make_dt(tool_name))
        dt.live = live_report

    # Sort: active first, then by file count
    return sorted(tools_by_name.values(),
                  key=lambda t: (len(t.files) + (10 if t.live else 0)), reverse=True)


def _merge_telemetry_into_tools(tools: list[DashboardTool], telemetry_reports) -> None:
    by_tool = {r.tool: r for r in telemetry_reports}
    for dt in tools:
        report = by_tool.get(dt.tool)
        if report is None:
            continue
        if dt.live is None:
            dt.live = {}
        dt.live.setdefault("telemetry", {
            "source": report.source, "confidence": report.confidence,
            "input_tokens": report.input_tokens, "output_tokens": report.output_tokens,
            "cache_read_tokens": report.cache_read_tokens, "cache_creation_tokens": report.cache_creation_tokens,
            "total_sessions": report.total_sessions, "total_messages": report.total_messages,
            "by_model": report.by_model, "cost_usd": report.cost_usd,
            "active_session_input": report.active_session_input,
            "active_session_output": report.active_session_output,
            "active_session_messages": report.active_session_messages,
        })


# ─── Port management ─────────────────────────────────────────────

def _kill_stale_server(port: int) -> None:
    """Kill a previous aictl on *port*, or abort if the port is taken by something else."""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}"],
            capture_output=True, text=True, timeout=5,
        )
    except (FileNotFoundError, subprocess.SubprocessError, OSError):
        return  # lsof unavailable, let the bind fail naturally
    if result.returncode != 0 or not result.stdout.strip():
        return  # port is free
    my_pid = os.getpid()
    for line in result.stdout.strip().splitlines():
        try:
            pid = int(line.strip())
        except ValueError:
            continue
        if pid == my_pid:
            continue
        try:
            import psutil
            proc = psutil.Process(pid)
            cmdline = " ".join(proc.cmdline())
        except (ImportError, psutil.Error, OSError):
            cmdline = ""
        if "aictl" in cmdline:
            print(f"  killing stale aictl on port {port} (pid {pid})", file=sys.stderr)
            try:
                os.kill(pid, signal.SIGTERM)
                psutil.Process(pid).wait(timeout=5)
            except (OSError, psutil.Error):
                pass
        else:
            name = cmdline.split()[0] if cmdline else f"pid {pid}"
            print(f"  error: port {port} is in use by {name}", file=sys.stderr)
            print(f"  either kill it or use --port <other>", file=sys.stderr)
            sys.exit(1)


# ─── Entry point ─────────────────────────────────────────────────

def start_server(
    root: Path,
    host: str = "127.0.0.1",
    port: int = 8484,
    interval: float = 5.0,
    open_browser: bool = True,
    include_live_monitor: bool = True,
    db_path: "Path | str | None" = None,
) -> None:
    """Start the dashboard HTTP server. Blocks until Ctrl-C."""
    # Import HTTP classes from the web layer
    from .dashboard.web_server import _DashboardHTTPServer, _DashboardHandler

    # Initialize datapoint file logger (if configured)
    dp_logger = None
    try:
        from .platforms import load_config
        cfg = load_config()
        if cfg.logging_enabled:
            from .sink import DatapointLogger
            dp_logger = DatapointLogger(
                log_dir=cfg.logging_dir,
                max_bytes=cfg.logging_max_file_bytes,
                backup_count=cfg.logging_backup_count,
            )
            print(f"  datapoint log: {cfg.logging_dir}/", file=sys.stderr)
    except Exception as exc:
        print(f"  warning: datapoint logger unavailable ({exc})", file=sys.stderr)

    # Initialize SQLite persistence
    db = None
    try:
        from .storage import HistoryDB
        db = HistoryDB(db_path=db_path, datapoint_logger=dp_logger)
        print(f"  history db: {db_path or '~/.config/aictl/history.db'}", file=sys.stderr)
    except Exception as exc:
        print(f"  warning: history db unavailable ({exc})", file=sys.stderr)

    # Initialize SampleSink for universal metric emission
    from .sink import SampleSink
    sink = SampleSink(db=db, buffer_size=5000, datapoint_logger=dp_logger)

    store = SnapshotStore(db=db, sink=sink)
    allowed = AllowedPaths()

    # Start persistent live monitor (runs continuously, accumulates state)
    monitor = None
    if include_live_monitor:
        print("  starting persistent live monitor ...", file=sys.stderr)
        monitor = PersistentMonitor(root, sink=sink)
        monitor.start()

    # Initial collection so /api/snapshot is ready immediately
    print("  collecting initial snapshot ...", file=sys.stderr)
    live_override = monitor.snapshot_dict() if monitor else None
    snap = collect(
        root,
        include_processes=True,
        _live_monitor_override=live_override or {},
        _sink=sink,
    )
    store.update(snap)
    allowed.update(snap)

    # Start background refresh (uses persistent monitor for live data)
    refresh = RefreshLoop(root, interval, store, allowed,
                          include_live_monitor, monitor=monitor)
    refresh.start()

    # Kill any existing aictl on this port before binding
    _kill_stale_server(port)

    # Start HTTP server
    server = _DashboardHTTPServer((host, port), _DashboardHandler,
                                  store, allowed, root)

    # Register SSE pre-serialization callback so build_sse_summary runs once
    # per update cycle (in the RefreshLoop thread) instead of per-SSE-client.
    from .dashboard.web_server import build_sse_summary as _build_sse
    import json as _json_mod
    store._sse_builder = lambda snap: _json_mod.dumps(_build_sse(snap))
    url = f"http://{host}:{port}"
    print(f"  aictl serve — dashboard at {url}", file=sys.stderr)
    print(f"  press Ctrl-C to stop\n", file=sys.stderr)

    if open_browser:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        refresh.stop()
        if monitor:
            monitor.stop()
        server.shutdown()
        sink.close()
        if db:
            db.close()


# ── SnapshotStore / AllowedPaths ────────────────────────────────────

import collections
import json as _json
import os as _os
import threading as _threading
import time as _time
from typing import TYPE_CHECKING as _TYPE_CHECKING

from .dashboard.models import DashboardSnapshot as _DashboardSnapshot

if _TYPE_CHECKING:
    from .sink import SampleSink as _SampleSink
    from .storage import HistoryDB as _HistoryDB


# ─── Metric emission ────────────────────────────────────────────

HISTORY_TUPLE_LEN = 11  # bump when adding fields to the history tuple


# emit_snapshot_to_sink DELETED.
#
# All metrics are now emitted at the point of collection:
#   cpu.core.*            → PsutilProcessCollector
#   proc.{pid}.cpu/mem    → PsutilProcessCollector
#   file.tokens/size      → DiscoveryCollector
#   discovery.*           → DiscoveryCollector
#   mcp.status            → DiscoveryCollector
#   memory.tokens         → collect() enrichment block
#   fs.change/size        → WatchdogFileCollector
#   telemetry.*           → StructuredTelemetryCollector
#   net.{pid}.*           → Network collectors
#   tool.*                → SessionCorrelator.tool_reports()
#   collector.*.status    → BaseCollector.report_status()


# ─── Thread-safe snapshot store ──────────────────────────────────


class SnapshotState:
    """Version-tracked snapshot with ring buffers and change notification."""

    def __init__(self) -> None:
        self._snap: _DashboardSnapshot | None = None
        self._snap_json_bytes: bytes = b""
        self._version: int = 0
        self._lock = _threading.Lock()
        self._condition = _threading.Condition(self._lock)
        self._sse_json: str = ""
        self._sse_builder: "callable | None" = None
        # Ring buffer for global time-series sparklines.
        # At ~5.86s/tick, 360 entries ≈ 35 min.
        self._history: collections.deque[tuple] = collections.deque(maxlen=360)
        # Per-tool history: {tool_name: deque[(ts, cpu, mem_mb, tokens, traffic_bps)]}
        self._tool_history: dict[str, collections.deque] = {}

    def load_from_db(self, db: "_HistoryDB") -> None:
        """Populate ring buffers from SQLite so charts start with history."""
        if not db:
            return
        try:
            since = _time.time() - 3600  # load last 1 hour
            data = db.query_metrics(since=since)
            if data["ts"]:
                me_list = data.get("memory_entries") or [0] * len(data["ts"])
                for i in range(len(data["ts"])):
                    row = (
                        data["ts"][i], data["files"][i], data["tokens"][i],
                        data["cpu"][i], data["mem_mb"][i], data["mcp"][i],
                        data["mem_tokens"][i], me_list[i],
                        data["live_sessions"][i],
                        data["live_tokens"][i], data["live_in_rate"][i],
                        data["live_out_rate"][i],
                    )
                    self._history.append(row)
            # Per-tool history
            tool_data = db.query_tool_metrics(since=since)
            for tool_name, td in tool_data.items():
                dq = collections.deque(maxlen=120)
                for i in range(len(td["ts"])):
                    dq.append((td["ts"][i], td["cpu"][i], td["mem_mb"][i],
                               td["tokens"][i], td["traffic"][i]))
                self._tool_history[tool_name] = dq
        except Exception as exc:
            log.warning("Failed to load history from DB: %s", exc)

    def update(self, snap: _DashboardSnapshot,
               serializer: "SnapshotSerializer") -> list[tuple]:
        """Update state, pre-serialize, notify waiters. Returns tool_rows."""
        with self._condition:
            self._snap = snap
            self._version += 1
            row = (
                snap.timestamp, snap.total_files, snap.total_tokens,
                snap.total_cpu, snap.total_mem_mb,
                snap.total_mcp_servers, snap.total_memory_tokens,
                snap.total_memory_entries,
                snap.total_live_sessions, snap.total_live_estimated_tokens,
                snap.total_live_inbound_rate_bps, snap.total_live_outbound_rate_bps,
            )
            # Clear history if schema changed (prevents zip unpack crash)
            if self._history and len(self._history[0]) != len(row):
                self._history.clear()
            self._history.append(row)

            # Per-tool history
            ts = snap.timestamp
            tool_rows: list[tuple] = []
            for t in snap.tools:
                if t.tool == "aictl":
                    continue
                cpu = _sum_process_stat(t.processes, "cpu_pct")
                mem = _sum_process_stat(t.processes, "mem_mb")
                tok = sum(f.tokens for f in t.files)
                traffic = 0.0
                if t.live:
                    traffic = float(t.live.get("outbound_rate_bps", 0)) + float(t.live.get("inbound_rate_bps", 0))
                if t.tool not in self._tool_history:
                    self._tool_history[t.tool] = collections.deque(maxlen=120)  # ~12 min
                self._tool_history[t.tool].append((ts, cpu, mem, tok, traffic))
                tool_rows.append((t.tool, cpu, mem, tok, traffic))

            # Pre-serialize snapshot + SSE BEFORE notifying clients.
            # This ensures readers see data matching the version they woke for.
            self._snap_json_bytes = serializer.serialize_snapshot(snap)
            self._sse_json = serializer.serialize_sse(snap, self._sse_builder)

            self._condition.notify_all()
        return tool_rows

    def wait_for_update(self, known_version: int,
                        timeout: float = 30.0) -> tuple[_DashboardSnapshot | None, int]:
        """Block until a new version is available or timeout."""
        with self._condition:
            self._condition.wait_for(
                lambda: self._version > known_version, timeout=timeout)
            return self._snap, self._version

    @property
    def snapshot(self) -> _DashboardSnapshot | None:
        with self._lock:
            return self._snap

    @property
    def snapshot_json_bytes(self) -> bytes:
        """Pre-serialized compact JSON snapshot (slim agent_teams)."""
        return self._snap_json_bytes

    @property
    def sse_json(self) -> str:
        """Pre-serialized SSE summary JSON."""
        return self._sse_json

    @sse_json.setter
    def sse_json(self, value: str) -> None:
        self._sse_json = value

    @property
    def version(self) -> int:
        with self._lock:
            return self._version

    def history_data(self) -> tuple[list[tuple], dict[str, collections.deque]]:
        """Extract ring buffer data for serialization."""
        with self._lock:
            rows = list(self._history)
        return rows, self._tool_history


class SnapshotSerializer:
    """Pre-serializes snapshots to JSON/SSE formats."""

    @staticmethod
    def serialize_snapshot(snap: _DashboardSnapshot) -> bytes:
        """Compact JSON bytes from a DashboardSnapshot."""
        try:
            return snap.to_json_slim().encode("utf-8")
        except Exception:
            return b""

    @staticmethod
    def serialize_sse(snap: _DashboardSnapshot,
                      builder: "callable | None") -> str:
        """SSE-formatted JSON via the registered builder callback."""
        if builder:
            try:
                return builder(snap)
            except Exception:
                return ""
        return ""

    @staticmethod
    def serialize_history(rows: list[tuple],
                          tool_history: dict[str, collections.deque]) -> str:
        """Return time-series history as column-major JSON (uPlot format)."""
        from .storage import METRICS_KEYS
        if not rows:
            return _json.dumps({k: [] for k in METRICS_KEYS})
        # Transpose rows → columns; order must match METRICS_KEYS
        cols = zip(*rows)
        _ROUND2 = {"cpu", "live_in_rate", "live_out_rate"}
        _ROUND1 = {"mem_mb"}
        result: dict = {}
        for key, col in zip(METRICS_KEYS, cols):
            vals = list(col)
            if key in _ROUND1:
                result[key] = [round(v, 1) for v in vals]
            elif key in _ROUND2:
                result[key] = [round(v, 2) for v in vals]
            else:
                result[key] = vals
        # Per-tool history
        tool_hist: dict[str, dict] = {}
        for tool_name, dq in tool_history.items():
            if not dq:
                continue
            t_ts, t_cpu, t_mem, t_tok, t_traffic = zip(*dq)
            tool_hist[tool_name] = {
                "ts": list(t_ts),
                "cpu": [round(v, 1) for v in t_cpu],
                "mem_mb": [round(v, 1) for v in t_mem],
                "tokens": list(t_tok),
                "traffic": [round(v, 2) for v in t_traffic],
            }
        result["by_tool"] = tool_hist
        return _json.dumps(result)


class SnapshotPersistence:
    """Writes snapshot data to HistoryDB (injected dependency)."""

    def __init__(self, db: "_HistoryDB | None") -> None:
        self._db = db

    def persist(self, snap: _DashboardSnapshot,
                tool_rows: list[tuple]) -> None:
        """Persist metrics, events, telemetry, and agent teams to SQLite."""
        if not self._db:
            return
        try:
            from .storage import MetricsRow, ToolMetricsRow, EventRow
            self._db.append_metrics(MetricsRow(
                ts=snap.timestamp, files=snap.total_files,
                tokens=snap.total_tokens, cpu=snap.total_cpu,
                mem_mb=snap.total_mem_mb, mcp=snap.total_mcp_servers,
                mem_tokens=snap.total_memory_tokens,
                memory_entries=snap.total_memory_entries,
                live_sessions=snap.total_live_sessions,
                live_tokens=snap.total_live_estimated_tokens,
                live_in_rate=snap.total_live_inbound_rate_bps,
                live_out_rate=snap.total_live_outbound_rate_bps,
            ))
            self._db.append_tool_metrics([
                ToolMetricsRow(ts=snap.timestamp, tool=name,
                               cpu=cpu, mem_mb=mem, tokens=tok, traffic=tr)
                for name, cpu, mem, tok, tr in tool_rows
            ])
            # Persist events from live monitor
            if snap.events:
                self._db.append_events([
                    EventRow(ts=e.get("ts", snap.timestamp),
                             tool=e.get("tool", ""),
                             kind=e.get("kind", ""),
                             detail=e.get("detail", {}),
                             session_id=e.get("detail", {}).get("session_id", ""),
                             pid=int(e.get("detail", {}).get("pid", 0) or 0))
                    for e in snap.events if e.get("tool") and e.get("kind")
                ])
                # Also write to sessions table for session_start/end events
                self._persist_session_events(snap.events, snap.timestamp)
            # Persist telemetry snapshots (from stats-cache, events.jsonl, etc.)
            if snap.tool_telemetry:
                from .storage import TelemetryRow
                self._db.append_telemetry_batch([
                    TelemetryRow(
                        ts=snap.timestamp, tool=t.get("tool", ""),
                        source=t.get("source", ""),
                        confidence=t.get("confidence", 0),
                        input_tokens=t.get("input_tokens", 0),
                        output_tokens=t.get("output_tokens", 0),
                        cache_read_tokens=t.get("cache_read_tokens", 0),
                        cache_creation_tokens=t.get("cache_creation_tokens", 0),
                        total_sessions=t.get("total_sessions", 0),
                        total_messages=t.get("total_messages", 0),
                        cost_usd=t.get("cost_usd", 0),
                        model=t.get("model", ""),
                        by_model=t.get("by_model", {}),
                    )
                    for t in snap.tool_telemetry if t.get("tool")
                ])
            # Persist agent teams (agents + per-turn requests)
            if snap.agent_teams:
                self._persist_agent_teams(snap.agent_teams, snap.timestamp)

            # All metric emission now happens at collection time
            # (collectors + DiscoveryCollector + collect() enrichment).
            # No snapshot-level emission needed.

            # Refresh dynamic source provenance for the datapoint catalog.
            try:
                from .sink import update_provenance
                update_provenance(self._db, snap)
            except Exception as exc:
                log.debug("Provenance update failed: %s", exc)
        except Exception as exc:
            log.warning("DB write failed: %s", exc)

    def _persist_agent_teams(self, agent_teams: list[dict],
                             snapshot_ts: float) -> None:
        """Write agent team data to the sessions, agents, and requests tables."""
        if not self._db or not agent_teams:
            return
        try:
            from .storage import AgentRow, RequestRow, SessionRow
            from .monitoring.tool_telemetry import _parse_iso_ts
            for team in agent_teams:
                session_id = team.get("session_id", "")
                # Upsert a session row for this UUID session with aggregated token totals
                if session_id:
                    agents = team.get("agents", [])
                    ts_vals = [_parse_iso_ts(a.get("started_at", "")) for a in agents]
                    ts_vals = [t for t in ts_vals if t > 0]
                    session_started = min(ts_vals) if ts_vals else snapshot_ts
                    self._db.upsert_session(SessionRow(
                        session_id=session_id,
                        tool="claude-code",
                        started_at=session_started,
                        source="claude-code-jsonl",
                        input_tokens=team.get("total_input_tokens", 0),
                        output_tokens=team.get("total_output_tokens", 0),
                    ))
                for agent in team.get("agents", []):
                    agent_id = agent.get("agent_id", "")
                    if not agent_id:
                        continue
                    self._db.upsert_agent(AgentRow(
                        agent_id=agent_id,
                        session_id=session_id,
                        tool="claude-code",
                        task=agent.get("task", ""),
                        model=agent.get("model", ""),
                        is_sidechain=1 if agent.get("is_sidechain") else 0,
                        started_at=_parse_iso_ts(agent.get("started_at", "")),
                        ended_at=_parse_iso_ts(agent.get("ended_at", "")) or None,
                        completed=1 if agent.get("completed") else 0,
                        input_tokens=agent.get("input_tokens", 0),
                        output_tokens=agent.get("output_tokens", 0),
                        cache_read_tokens=agent.get("cache_read_tokens", 0),
                        cache_creation_tokens=agent.get("cache_creation_tokens", 0),
                    ))
                    # Write per-turn requests from this agent's JSONL
                    for turn in agent.get("turns", []):
                        self._db.append_request(RequestRow(
                            ts=snapshot_ts,
                            source_ts=turn.get("source_ts", 0.0),
                            session_id=session_id,
                            agent_id=agent_id,
                            tool="claude-code",
                            model=turn.get("model", "") or agent.get("model", ""),
                            input_tokens=turn.get("input_tokens", 0),
                            output_tokens=turn.get("output_tokens", 0),
                            cache_read_tokens=turn.get("cache_read_tokens", 0),
                            cache_creation_tokens=turn.get("cache_creation_tokens", 0),
                            source="claude-code-jsonl",
                        ))
        except Exception as exc:
            log.warning("Agent team persistence failed: %s", exc)

    def _persist_session_events(self, events: list[dict],
                                fallback_ts: float) -> None:
        """Write session_start/session_end events to the sessions table."""
        if not self._db:
            return
        try:
            from .storage import SessionRow
            for e in events:
                kind = e.get("kind", "")
                detail = e.get("detail", {})
                sid = detail.get("session_id", "")
                if not sid:
                    continue
                if kind == "session_start":
                    ev_pid = int(detail.get("pid", 0) or 0)
                    self._db.upsert_session(SessionRow(
                        session_id=sid,
                        tool=e.get("tool", ""),
                        pid=ev_pid,
                        started_at=e.get("ts", fallback_ts),
                        project_path=detail.get("project", ""),
                        source="correlator",
                    ))
                    self._db.link_session_process(
                        sid, ev_pid, tool=e.get("tool", ""))
                elif kind == "session_end":
                    self._db.update_session_end(
                        sid,
                        ended_at=e.get("ts", fallback_ts),
                        input_tokens=detail.get("input_tokens", 0),
                        output_tokens=detail.get("output_tokens", 0),
                        files_modified=detail.get("files_modified", 0),
                    )
        except Exception as exc:
            log.warning("Session event persistence failed: %s", exc)


class SnapshotStore:
    """Facade composing state, serialization, and persistence.

    Optionally backed by a HistoryDB for persistence across restarts.
    Uses SampleSink for universal metric emission.
    """

    def __init__(self, db: "_HistoryDB | None" = None, sink: "_SampleSink | None" = None) -> None:
        self._state = SnapshotState()
        self._serializer = SnapshotSerializer()
        self._persistence = SnapshotPersistence(db)
        # Exposed for callers that access these directly
        self._db = db
        self._sink = sink
        if db:
            self._state.load_from_db(db)

    @property
    def _sse_builder(self):
        return self._state._sse_builder

    @_sse_builder.setter
    def _sse_builder(self, value):
        self._state._sse_builder = value

    def update(self, snap: _DashboardSnapshot) -> None:
        tool_rows = self._state.update(snap, self._serializer)
        self._persistence.persist(snap, tool_rows)

    def wait_for_update(self, known_version: int,
                        timeout: float = 30.0) -> tuple[_DashboardSnapshot | None, int]:
        """Block until a new version is available or timeout."""
        return self._state.wait_for_update(known_version, timeout)

    @property
    def snapshot(self) -> _DashboardSnapshot | None:
        return self._state.snapshot

    @property
    def snapshot_json_bytes(self) -> bytes:
        """Pre-serialized compact JSON snapshot (slim agent_teams)."""
        return self._state.snapshot_json_bytes

    @property
    def sse_json(self) -> str:
        """Pre-serialized SSE summary JSON (set by web_server after build)."""
        return self._state.sse_json

    @sse_json.setter
    def sse_json(self, value: str) -> None:
        self._state.sse_json = value

    @property
    def version(self) -> int:
        return self._state.version

    def history_json(self) -> str:
        """Return time-series history as column-major JSON (uPlot native format)."""
        rows, tool_history = self._state.history_data()
        return self._serializer.serialize_history(rows, tool_history)


class AllowedPaths:
    """Maintains the set of file paths that may be served via /api/file."""

    def __init__(self) -> None:
        self._paths: set[str] = set()
        self._lock = _threading.Lock()

    def update(self, snap: _DashboardSnapshot) -> None:
        paths: set[str] = set()
        for tr in snap.tools:
            for f in tr.files:
                try:
                    paths.add(_os.path.realpath(f.path))
                except (OSError, ValueError):
                    pass
        for mem in snap.agent_memory:
            if mem.file:
                try:
                    paths.add(_os.path.realpath(mem.file))
                except (OSError, ValueError):
                    pass
        with self._lock:
            self._paths = paths

    def is_allowed(self, path: str) -> bool:
        try:
            real = _os.path.realpath(path)
        except (OSError, ValueError):
            return False
        with self._lock:
            return real in self._paths
