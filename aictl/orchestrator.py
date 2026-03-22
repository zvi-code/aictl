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
import os
import sys
import time
import threading
from pathlib import Path

from .dashboard.models import DashboardSnapshot, DashboardTool
from .data.schema import metric_name as M
from .discovery import (
    ResourceFile,
    ToolResources,
    collect_agent_memory,
    collect_mcp_status,
    discover_all,
)
from .monitoring.tool_config import collect_tool_configs
from .monitoring.tool_telemetry import collect_tool_telemetry, scan_agent_teams
from .store import AllowedPaths, SnapshotStore


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
        except Exception:
            pass

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
        except Exception:
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
                    except Exception:
                        pass
            except Exception:
                pass  # don't crash the refresh loop
            self._stop.wait(self._interval)

    def _get_discovery_cache(self):
        """Read cached discover_all() result from the DiscoveryCollector."""
        if not self._monitor or not self._monitor._runtime:
            return None
        from .monitoring.collectors.discovery import DiscoveryCollector
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
                mname = m.get("name", "") if isinstance(m, dict) else getattr(m, "name", "")
                status = m.get("status", "") if isinstance(m, dict) else getattr(m, "status", "")
                if mname:
                    _sink.emit_if_changed(M("aictl.mcp.status"), 1.0 if status == "running" else 0.0,
                               {"aictl.tool": tool, "aictl.mcp.server": mname}, ts=ts)

    live_monitor = _live_monitor_override if _live_monitor_override is not None else {}
    tools = _merge_dashboard_tools(discovered, live_monitor)
    agent_memory = collect_agent_memory(root_path)
    mcp_detail = collect_mcp_status(discovered)
    telemetry_reports = collect_tool_telemetry(root_path)
    tool_telemetry = [r.to_dict() for r in telemetry_reports]
    agent_teams = scan_agent_teams(root_path)
    tool_configs_list = collect_tool_configs(root_path)
    tool_configs = [c.to_dict() for c in tool_configs_list]
    _merge_telemetry_into_tools(tools, telemetry_reports)

    # Emit enrichment data through sink
    if _sink:
        ts = time.time()
        for m in agent_memory:
            path = m.file if hasattr(m, "file") else ""
            tokens = m.tokens if hasattr(m, "tokens") else 0
            source = m.source if hasattr(m, "source") else ""
            if path:
                _sink.emit_if_changed(M("aictl.memory.tokens"), float(tokens),
                           {"file.path": path, "aictl.source": source}, ts=ts)
        for s in mcp_detail:
            name = s.name if hasattr(s, "name") else (s.get("name", "") if isinstance(s, dict) else "")
            stool = s.tool if hasattr(s, "tool") else (s.get("tool", "") if isinstance(s, dict) else "")
            status_val = s.status if hasattr(s, "status") else (s.get("status", "") if isinstance(s, dict) else "")
            if name:
                _sink.emit_if_changed(M("aictl.mcp.detail.status"), 1.0 if status_val == "running" else 0.0,
                           {"aictl.mcp.server": name, "aictl.tool": stool}, ts=ts)
        for r in telemetry_reports:
            t = r.tool if hasattr(r, "tool") else ""
            if t:
                rtags = {"tool": t, "source": getattr(r, "source", "")}
                _sink.emit(M("gen_ai.client.token.usage.verified"), float(getattr(r, "input_tokens", 0)),
                           {**rtags, "gen_ai.token.type": "input"}, ts=ts)
                _sink.emit(M("gen_ai.client.token.usage.verified"), float(getattr(r, "output_tokens", 0)),
                           {**rtags, "gen_ai.token.type": "output"}, ts=ts)
                _sink.emit(M("aictl.telemetry.sessions"), float(getattr(r, "total_sessions", 0)), rtags, ts=ts)
                _sink.emit(M("aictl.telemetry.messages"), float(getattr(r, "total_messages", 0)), rtags, ts=ts)
                cost = getattr(r, "cost_usd", 0)
                if cost:
                    _sink.emit(M("aictl.telemetry.cost"), float(cost), rtags, ts=ts)
        for c in tool_configs_list:
            t = c.tool if hasattr(c, "tool") else ""
            if t:
                model = getattr(c, "model", None)
                if model:
                    _sink.emit_if_changed(M("aictl.config.model"), 1.0,
                               {"aictl.tool": t, "gen_ai.request.model": model}, ts=ts)

    monitor_events = live_monitor.get("events", []) if live_monitor else []
    monitor_sessions = live_monitor.get("sessions", []) if live_monitor else []

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


def _compute_token_breakdown(files: list[ResourceFile]) -> dict:
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
        "always_loaded": always, "on_demand": on_demand,
        "conditional": conditional, "never_sent": never,
        "total": always + on_demand + conditional + never,
        "by_kind": by_kind,
    }


def _merge_dashboard_tools(discovered: list[ToolResources], live_monitor: dict) -> list[DashboardTool]:
    from .registry import tool_vendor, tool_hosts, tool_is_meta, TOOL_LABELS, get_registry

    tools_by_name: dict[str, DashboardTool] = {}

    # Seed with all tracked tools. Skip internal/infrastructure entries that
    # are never shown as interactive AI tools in the UI.
    ui_skip = {"aictl", "any"}
    try:
        registry = get_registry()
        all_tool_names = set()
        for s in registry.path_specs():
            all_tool_names.add(s.ai_tool)
        for s in registry.process_specs():
            all_tool_names.add(s.ai_tool)
        for name in sorted(all_tool_names - ui_skip):
            tools_by_name[name] = DashboardTool(
                tool=name, label=TOOL_LABELS.get(name, name),
                vendor=tool_vendor(name), host=",".join(tool_hosts(name)),
                meta=tool_is_meta(name),
            )
    except Exception:
        pass

    # Merge discovered files/processes (overwrites empty shells)
    for tr in discovered:
        if tr.tool in ui_skip:
            continue
        dt = tools_by_name.get(tr.tool)
        if dt is None:
            dt = DashboardTool(
                tool=tr.tool, label=TOOL_LABELS.get(tr.tool, tr.tool),
                vendor=tool_vendor(tr.tool), host=",".join(tool_hosts(tr.tool)),
                meta=tool_is_meta(tr.tool),
            )
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
        dt = tools_by_name.get(tool_name)
        if dt is None:
            dt = DashboardTool(
                tool=tool_name, label=TOOL_LABELS.get(tool_name, tool_name),
                vendor=tool_vendor(tool_name), host=",".join(tool_hosts(tool_name)),
                meta=tool_is_meta(tool_name),
            )
            tools_by_name[tool_name] = dt
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
            "cache_read": report.cache_read_tokens, "cache_creation": report.cache_creation_tokens,
            "total_sessions": report.total_sessions, "total_messages": report.total_messages,
            "by_model": report.by_model, "cost_usd": report.cost_usd,
            "active_session_input": report.active_session_input,
            "active_session_output": report.active_session_output,
            "active_session_messages": report.active_session_messages,
        })


# ─── Port management ─────────────────────────────────────────────

def _kill_stale_server(port: int) -> None:
    """Kill a previous aictl on *port*, or abort if the port is taken by something else."""
    import signal
    import subprocess
    try:
        result = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}"],
            capture_output=True, text=True, timeout=5,
        )
    except Exception:
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
        except Exception:
            cmdline = ""
        if "aictl" in cmdline:
            print(f"  killing stale aictl on port {port} (pid {pid})", file=sys.stderr)
            try:
                os.kill(pid, signal.SIGTERM)
                psutil.Process(pid).wait(timeout=5)
            except Exception:
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
        from .config import load_config
        cfg = load_config()
        if cfg.logging_enabled:
            from .datapoint_logger import DatapointLogger
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
    url = f"http://{host}:{port}"
    print(f"  aictl serve — dashboard at {url}", file=sys.stderr)
    print(f"  press Ctrl-C to stop\n", file=sys.stderr)

    if open_browser:
        import webbrowser
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
