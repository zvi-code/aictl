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
import json
import logging
import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

from .monitoring.pace import PACE  # noqa: E402

log = logging.getLogger(__name__)

from . import stores
from .collection_status import CollectionStatus, DatapointCatalog
from .dashboard.models import DashboardSnapshot, DashboardTool
from .data.schema import metric_name as M
from .file_inventory import FileInventory, inventory_row
from .monitoring.tool_config import collect_tool_configs
from .monitoring.tool_telemetry import collect_tool_telemetry, scan_agent_teams
from .session_evidence import SessionEvidence
from .session_facts import SessionFacts
from .state_file import StateFile, TextWatermark, restart_directory, sync_data_epoch
from .tool_calls import ToolCalls, call_key
from .tools import (
    TOOL_LABELS,
    ResourceFile,
    ToolResources,
    collect_agent_memory,
    collect_mcp_status,
    discover_all,
    get_registry,
    tool_hosts,
    tool_is_meta,
    tool_vendor,
)

# ─── Persistent live monitor ─────────────────────────────────────


class PersistentMonitor:
    """Runs MonitorRuntime continuously on a background asyncio loop.

    Unlike the old approach (create runtime -> run 5s -> discard), this
    keeps the correlator alive so sessions, network deltas, and telemetry
    diffs accumulate across snapshot cycles.
    """

    def __init__(self, root: Path, sink=None, live_sources=None) -> None:
        self._runtime = None
        self._loop = None
        self._thread = None
        self._root = root
        self._sink = sink  # SampleSink passed to MonitorRuntime
        self._live_sources = live_sources
        self._ready = threading.Event()

    def start(self) -> None:
        """Start the monitor on a background thread."""
        self._thread = threading.Thread(target=self._run, daemon=True, name="aictl-monitor")
        self._thread.start()
        # Wait up to 10s for collectors to start
        self._ready.wait(timeout=10.0)

    def _run(self) -> None:
        from .monitoring.config import MonitorConfig
        from .monitoring.runtime import MonitorRuntime
        from .platforms import config_dir, load_config

        cfg = load_config()
        config = MonitorConfig.for_root(
            self._root,
            sample_interval=cfg.sample_interval,
            refresh_interval=cfg.refresh_interval,
            process_interval=cfg.process_interval,
            network_interval=cfg.network_interval,
            telemetry_interval=cfg.telemetry_interval,
            filesystem_enabled=cfg.filesystem_enabled,
            telemetry_enabled=cfg.telemetry_enabled,
            ignored_paths=(str(Path(cfg.logging_dir).resolve()), str(config_dir())),
            repo_state_path=config_dir() / "repo_changes.json",
        )
        self._runtime = MonitorRuntime(config, sink=self._sink)
        if self._live_sources is not None:
            self._live_sources.attach_runtime(self._runtime)

        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        async def _supervise(collector):
            while True:
                try:
                    await collector.run()
                    return
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    log.warning("Collector %s failed (%s); restarting in 5s", collector.name, exc)
                    await asyncio.sleep(5.0)

        async def _run_forever():
            collector_tasks = [
                asyncio.create_task(_supervise(collector), name=f"collector:{collector.name}")
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


# A requested refresh waits at least this long after the last one began.
MIN_REFRESH_GAP_S = 1.5


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
        monitor: PersistentMonitor | None = None,
    ) -> None:
        super().__init__(daemon=True)
        self._root = root
        self._interval = interval
        self._store = store
        self._allowed = allowed
        self._include_live_monitor = include_live_monitor
        self._monitor = monitor
        self._stop = threading.Event()
        # Set by stop() and by the store when a hook or telemetry arrives.
        self._wake = store.refresh_requested

    def _wait_paced(self, started: float) -> None:
        """Wait one interval times the pace from *started*.

        A refresh request (a hook or telemetry arrived while someone watches) ends
        the wait once MIN_REFRESH_GAP_S has passed, so the board shows a tool's
        step within a second or two instead of at the next interval.
        """
        while not self._stop.is_set():
            now = time.monotonic()
            due = started + self._interval * PACE.factor()
            if now >= due:
                return
            if self._wake.is_set():
                if now - started >= MIN_REFRESH_GAP_S:
                    self._wake.clear()
                    return
                timeout = MIN_REFRESH_GAP_S - (now - started)
            else:
                timeout = min(1.0, due - now)
            self._wake.wait(timeout)

    def run(self) -> None:
        enrichment: dict = {}
        while not self._stop.is_set():
            started = time.monotonic()
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
                    _enrichment_cache=enrichment,
                    _shared_config_cache=self._store.live_sources is not None,
                )
                self._store.update(snap)
                self._allowed.update(snap)
            except Exception as exc:
                log.warning("Refresh loop error: %s", exc)
            self._wait_paced(started)

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
        self._wake.set()


# ─── Snapshot collection ─────────────────────────────────────────


# The last complete tool configuration records, with every documented knob.
# The snapshot carries only the knobs that a file sets; the settings API serves these.
_FULL_TOOL_CONFIGS: list[dict] = []


def full_tool_configs() -> list[dict]:
    """The complete tool configuration records from the last snapshot build."""
    return list(_FULL_TOOL_CONFIGS)


def slim_tool_configs(configs: list[dict]) -> list[dict]:
    """The same records without the rows for knobs that no file sets."""
    out = []
    for cfg in configs:
        sections = []
        for sec in cfg.get("sections") or []:
            rows = [r for r in sec.get("rows") or [] if r.get("set") is not False]
            if rows:
                sections.append({**sec, "rows": rows})
        slim = {**cfg, "sections": sections} if "sections" in cfg else dict(cfg)
        if "env_vars" in cfg:
            slim["env_vars"] = [e for e in cfg["env_vars"] or [] if e.get("set")]
        out.append(slim)
    return out


def _cached(cache: dict | None, key: str, ttl: float, produce):
    """Return ``produce()``, reusing the value in ``cache`` for ``ttl`` seconds."""
    if cache is None:
        return produce()
    now = time.monotonic()
    hit = cache.get(key)
    if hit is None or now - hit[0] >= ttl:
        hit = (now, produce())
        cache[key] = hit
    return hit[1]


# Without a change in any file the settings were read from, they are read again this often.
TOOL_CONFIGS_RECHECK_S = 60.0
_TOOL_CONFIGS_AT = 0.0


def _tool_configs(cache: dict | None, root: Path, *, shared: bool = False) -> list[dict]:
    """Every tool's settings records, read again when a file they came from changed.

    The last collection's files and folders are stat'ed on every call, so an edited
    settings file, an agent added to a folder or a changed shell profile shows on
    the next tick. Without any change they are read again after TOOL_CONFIGS_RECHECK_S,
    for what a stat cannot see (the registry).
    """
    global _TOOL_CONFIGS_AT
    from .monitoring.tool_config import current_tool_configs, last_watched, watch_signature

    if shared:
        configs = current_tool_configs(root)
        if configs != _FULL_TOOL_CONFIGS:
            _FULL_TOOL_CONFIGS[:] = configs
            _TOOL_CONFIGS_AT = time.time()
        return configs

    now = time.monotonic()
    hit = cache.get("tool_configs") if cache is not None else None
    if hit is not None:
        at, (configs, watched, signature) = hit
        if now - at < TOOL_CONFIGS_RECHECK_S and watch_signature(watched) == signature:
            return configs
    configs = [c.to_dict() for c in collect_tool_configs(root)]
    watched = last_watched()
    if cache is not None:
        cache["tool_configs"] = (now, (configs, watched, watch_signature(watched)))
    if configs != _FULL_TOOL_CONFIGS:
        _FULL_TOOL_CONFIGS[:] = configs
        _TOOL_CONFIGS_AT = time.time()
    return configs


def tool_configs_at() -> float:
    """When the settings records last changed (unix time), for clients that cache them."""
    return _TOOL_CONFIGS_AT


def collect(
    root: Path,
    include_processes: bool = True,
    *,
    _live_monitor_override: dict | None = None,
    _discovered_override: list | None = None,
    _sink=None,
    _enrichment_cache: dict | None = None,
    _shared_config_cache: bool = False,
) -> DashboardSnapshot:
    """Take a single snapshot combining discovery, live, and enrichment.

    If *_live_monitor_override* is provided (from PersistentMonitor),
    it's used directly. If *_discovered_override* is provided (from
    DiscoveryCollector cache), it skips redundant scanning.
    """
    root_path = root.resolve()
    discovered = _discovered_override or discover_all(root_path, include_processes=include_processes)
    streaming = getattr(_sink, "streams_observations", False) is True
    samples = []

    def emit(metric, value, tags, *, ts, gauge=False):
        # Kusto mode sends the changed samples as one batch; both modes keep only changes.
        if not streaming:
            _sink.emit_if_changed(metric, value, tags, ts=ts, gauge=gauge)
        elif _sink.admit_if_changed(metric, value, tags, ts, gauge=gauge):
            samples.append((metric, value, tags))

    # Emit discovery data through sink (skip when DiscoveryCollector handled it)
    if _sink and _discovered_override is None:
        ts = time.time()
        for tool_res in discovered:
            tool = tool_res.tool
            if tool == "aictl":
                continue
            tags = {"tool": tool}
            emit(M("aictl.discovery.files"), float(len(tool_res.files)), tags, ts=ts)
            emit(
                M("aictl.discovery.tokens"), float(sum(f.tokens for f in tool_res.files)), tags, ts=ts
            )
            emit(M("aictl.discovery.size"), float(sum(f.size for f in tool_res.files)), tags, ts=ts)
            emit(M("aictl.discovery.processes"), float(len(tool_res.processes)), tags, ts=ts)
            emit(M("aictl.discovery.mcp_servers"), float(len(tool_res.mcp_servers)), tags, ts=ts)
            for m in tool_res.mcp_servers:
                mname = m.get("name", "")
                if mname:
                    emit(
                        M("aictl.mcp.status"),
                        1.0 if m.get("status") == "running" else 0.0,
                        {"aictl.tool": tool, "aictl.mcp.server": mname},
                        ts=ts,
                    )
        if streaming and samples:
            try:
                _sink.emit_batch(samples, ts=ts)
            except Exception as exc:
                log.warning("Discovery metric batch delivery failed: %s", exc)
            samples.clear()

    live_monitor = _live_monitor_override if _live_monitor_override is not None else {}
    tools = _merge_dashboard_tools(discovered, live_monitor)
    cache = _enrichment_cache

    agent_memory = _cached(cache, "agent_memory", 30.0, lambda: collect_agent_memory(root_path))
    mcp_detail = collect_mcp_status(discovered)
    telemetry_reports = _cached(cache, "telemetry", 15.0, lambda: collect_tool_telemetry(root_path))
    tool_telemetry = [r.to_dict() for r in telemetry_reports]
    agent_teams = _cached(cache, "agent_teams", 30.0, lambda: scan_agent_teams(root_path))
    tool_configs = _tool_configs(cache, root_path, shared=_shared_config_cache)
    tool_configs = slim_tool_configs(tool_configs)
    _merge_telemetry_into_tools(tools, telemetry_reports)

    # Emit enrichment data through sink
    if _sink:
        ts = time.time()
        for m in agent_memory:
            if m.file:
                emit(
                    M("aictl.memory.tokens"), float(m.tokens), {"file.path": m.file, "aictl.source": m.source}, ts=ts
                )
        for s in mcp_detail:
            if s.name:
                emit(
                    M("aictl.mcp.detail.status"),
                    1.0 if s.status == "running" else 0.0,
                    {"aictl.mcp.server": s.name, "aictl.tool": s.tool},
                    ts=ts,
                )
        for r in telemetry_reports:
            if r.tool:
                rtags = {"tool": r.tool, "source": r.source}
                # Cumulative counters: an unchanged value carries no news, and
                # the 5 min re-emit keeps the series continuous.
                emit(
                    M("gen_ai.client.token.usage.verified"),
                    float(r.input_tokens),
                    {**rtags, "gen_ai.token.type": "input"},
                    ts=ts,
                    gauge=True,
                )
                emit(
                    M("gen_ai.client.token.usage.verified"),
                    float(r.output_tokens),
                    {**rtags, "gen_ai.token.type": "output"},
                    ts=ts,
                    gauge=True,
                )
                emit(M("aictl.telemetry.sessions"), float(r.total_sessions), rtags, ts=ts, gauge=True)
                emit(M("aictl.telemetry.messages"), float(r.total_messages), rtags, ts=ts, gauge=True)
                if r.cost_usd:
                    emit(M("aictl.telemetry.cost"), float(r.cost_usd), rtags, ts=ts, gauge=True)
        for c in tool_configs:
            if c.get("tool") and c.get("model"):
                emit(
                    M("aictl.config.model"), 1.0, {"aictl.tool": c["tool"], "gen_ai.request.model": c["model"]}, ts=ts
                )
        if streaming and samples:
            try:
                _sink.emit_batch(samples, ts=ts)
            except Exception as exc:
                log.warning("Enrichment metric batch delivery failed: %s", exc)

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


def _sum_process_stat(processes, attr: str) -> float | None:
    """Sum a numeric string attribute (cpu_pct or mem_mb) across processes.

    0 when the tool runs no process; None when it runs some and none of them has a value yet
    (CPU is not measured on a process's first scan), so an unmeasured value is not stored as 0.
    """
    values = [
        float(getattr(p, attr))
        for p in processes
        if hasattr(p, attr) and str(getattr(p, attr)).replace(".", "", 1).isdigit()
    ]
    if processes and not values:
        return None
    return sum(values)


def _make_dt(name: str) -> DashboardTool:
    return DashboardTool(
        tool=name,
        label=TOOL_LABELS.get(name, name),
        vendor=tool_vendor(name),
        host=",".join(tool_hosts(name)),
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
    return sorted(tools_by_name.values(), key=lambda t: len(t.files) + (10 if t.live else 0), reverse=True)


def _merge_telemetry_into_tools(tools: list[DashboardTool], telemetry_reports) -> None:
    by_tool = {r.tool: r for r in telemetry_reports}
    for dt in tools:
        report = by_tool.get(dt.tool)
        if report is None:
            continue
        if dt.live is None:
            dt.live = {}
        dt.live.setdefault(
            "telemetry",
            {
                "source": report.source,
                "confidence": report.confidence,
                "input_tokens": report.input_tokens,
                "output_tokens": report.output_tokens,
                "cache_read_tokens": report.cache_read_tokens,
                "cache_creation_tokens": report.cache_creation_tokens,
                "total_sessions": report.total_sessions,
                "total_messages": report.total_messages,
                "by_model": report.by_model,
                "cost_usd": report.cost_usd,
                "active_session_input": report.active_session_input,
                "active_session_output": report.active_session_output,
                "active_session_messages": report.active_session_messages,
            },
        )


# ─── Port management ─────────────────────────────────────────────


def _kill_stale_server(port: int) -> None:
    """Kill a previous aictl on *port*, or abort if the port is taken by something else."""
    from .platforms import listening_pids, terminate_pid

    my_pid = os.getpid()
    for pid in listening_pids(port):
        if pid == my_pid:
            continue
        try:
            import psutil

            proc = psutil.Process(pid)
            cmdline = " ".join(proc.cmdline())
        except (ImportError, psutil.Error, OSError):
            cmdline = ""
        if "aictl" in cmdline.lower():
            print(f"  killing stale aictl on port {port} (pid {pid})", file=sys.stderr)
            try:
                terminate_pid(pid)
                psutil.Process(pid).wait(timeout=5)
            except (OSError, psutil.Error):
                pass
        else:
            name = cmdline.split()[0] if cmdline else f"pid {pid}"
            print(f"  error: port {port} is in use by {name}", file=sys.stderr)
            print("  either kill it or use --port <other>", file=sys.stderr)
            sys.exit(1)


# ─── Collection service (UI-independent) ─────────────────────────


class LogMaintenanceLoop(threading.Thread):
    """Keep the daemon log within its size limit."""

    FIRST_RUN_DELAY_S = 600.0
    INTERVAL_S = 1800.0
    LOG_MAX_BYTES = 5 * 1024 * 1024

    def __init__(self) -> None:
        super().__init__(daemon=True, name="aictl-log-maintenance")
        self._stop_event = threading.Event()

    def run(self) -> None:
        delay = self.FIRST_RUN_DELAY_S
        while not self._stop_event.wait(delay):
            delay = self.INTERVAL_S
            try:
                from .platforms import cap_log_file, load_config

                cap_log_file(load_config().effective_log_file(), self.LOG_MAX_BYTES)
            except Exception as exc:
                log.warning("Log maintenance failed: %s", exc)

    def stop(self) -> None:
        self._stop_event.set()


class CollectionService:
    """The data-collection half of aictl, fully independent of any UI.

    Owns the live collection engine — datapoint logger, history writer,
    metric sink, persistent monitor, periodic refresh loop, and per-tool
    ingesters — and exposes the resulting data through ``store``.

    The web server (:func:`start_server`) and the TUI are pure *consumers*:
    they read from ``store`` and never construct collectors
    themselves. This lets collection run on its own (headless, low resource,
    from startup) with visualization attached on demand via web or CLI.
    """

    def __init__(
        self,
        root: Path,
        *,
        interval: float = 5.0,
        include_live_monitor: bool = True,
        reporting_only: bool = False,
    ) -> None:
        self.root = root
        self.interval = interval
        self.include_live_monitor = include_live_monitor
        # A reporting node writes to the store and serves nothing: it does not
        # start what only a dashboard on this machine reads.
        self.reporting_only = reporting_only
        # Populated by start()
        self.history_store = stores.Store()
        self._history_stop = threading.Event()
        self._history_thread: threading.Thread | None = None
        self.sink = None
        self.store: SnapshotStore | None = None
        self.allowed = AllowedPaths()
        self._dp_logger = None
        self._monitor: PersistentMonitor | None = None
        self._refresh: RefreshLoop | None = None
        self._maintenance: LogMaintenanceLoop | None = None
        self._ingesters = {}

    def start(self, *, quiet: bool = False) -> None:
        """Build and start the collection engine. Non-blocking."""
        self.open_stores(quiet=quiet)
        self.run(quiet=quiet)
        # The HTTP server starts its own supervised ingesters.
        from .dashboard.ingester_runner import start_ingesters

        self._ingesters = start_ingesters(self.store)

    def open_stores(self, *, quiet: bool = False) -> None:
        """The fast part of the start: the stores, the sink and an empty snapshot store.

        Hooks and OpenTelemetry need only these, so a server can take them while
        :meth:`run` collects the first snapshot.
        """

        def _say(msg: str) -> None:
            if not quiet:
                print(msg, file=sys.stderr)

        # Discovery reads the repositories of active sessions at once and the others in the
        # background, so a folder of many repositories does not hold up the start.
        from . import tree_walk

        tree_walk.set_lazy(True)

        # Datapoint file logger (optional)
        try:
            from .platforms import load_config

            cfg = load_config()
            if cfg.logging_enabled and cfg.capture != "off":
                from .sink import DatapointLogger

                self._dp_logger = DatapointLogger(
                    log_dir=cfg.logging_dir,
                    max_bytes=cfg.logging_max_file_bytes,
                    backup_count=cfg.logging_backup_count,
                )
                _say(f"  datapoint log: {cfg.logging_dir}/")
        except Exception as exc:
            _say(f"  warning: datapoint logger unavailable ({exc})")

        # History persistence
        from .kusto import kusto_settings
        from .platforms import load_config

        store_cfg = load_config()
        settings = kusto_settings()
        restart_dir = None
        watermark = None
        if settings is not None and store_cfg.capture != "off":
            restart_dir = restart_directory(settings.cluster, settings.database, settings.node_id)
            # The watermark reads its file on first use, after the data epoch check below.
            watermark = TextWatermark(StateFile(restart_dir / "text_trim.json"))
            self.history_store = stores.open_store("kusto", settings=settings, trim_before=watermark)
            _say(f"  history store: {settings.uri} (Kusto, {settings.auth_mode} auth)")
            if layout := self.history_store.layout:
                # Restart state of another data epoch (the database was reset) is discarded
                # here, before any reader loads a checkpoint.
                sync_data_epoch(restart_dir, layout.get("data_epoch"), kept_data=bool(layout.get("epoch_kept_data")))
                _say(f"  data layout: {layout['version']} (stored {layout['stored_version']}, compatible since "
                     f"{layout['compatible_since']}), data epoch {layout['data_epoch']}")
        else:
            self.history_store = stores.Store()
            _say("  history store: capture is off" if settings is not None else "  history store: no store configured")

        # Metric sink
        from .observe.collect import capture_mode
        from .sink import SampleSink

        def mode():
            return capture_mode() if store_cfg.capture == "full" else store_cfg.capture

        writer = stores.writer_or_discard(self.history_store.writer)
        inventory = None
        if restart_dir is not None:
            from .records import _is_sensitive_path

            inventory = FileInventory(writer, StateFile(restart_dir / "file_inventory.json"),
                                      keeps_text=lambda: mode() == "full", sensitive=_is_sensitive_path)
        self.store = SnapshotStore(sink=self.sink, history_store=self.history_store,
                                   inventory=inventory, keeps_text=lambda: mode() == "full",
                                   restart_dir=restart_dir, content_days=store_cfg.content_retention_days,
                                   retention=store_cfg.retention_by_class() if hasattr(store_cfg, "retention_by_class") else None,
                                   large_payload_bytes=getattr(store_cfg, "large_payload_bytes", 32768),
                                   trim_before=watermark or (lambda: 0.0))
        self.sink = self.store._sink = SampleSink(datapoint_logger=self._dp_logger,
                                                 history_store=self.history_store,
                                                 quality=self.store.collection_status)
        if not self.reporting_only:
            # The live hub feeds the dashboard stream of this machine only.
            from .dashboard.live.hub import LiveHub
            from .monitoring.live_sources import LiveRuntimeSources

            self.store.live_hub = LiveHub()
            self.store.live_sources = LiveRuntimeSources(self.store.live_hub, self.root, capture_mode=mode)
            self.store.live_sources.start()
        self.store._persistence.capture_mode = mode
        if restart_dir is not None:
            from .stores.kusto.tables import TABLES

            self.store._persistence.node_settings = {
                "node_source": settings.node_id_source,
                "ingestion_mode": settings.ingestion,
                "retention_days": TABLES["system_snapshots"].retention_days,
                "content_retention_days": TABLES["session_step_text"].retention_days,
            }

            def flush_history():
                while not self._history_stop.wait(1):
                    writer.flush()
                    try:
                        self.store.session_facts.save()
                        self.store.collection_status.save()
                    except OSError:
                        log.warning("Could not save session restart state", exc_info=True)

            self._history_thread = threading.Thread(target=flush_history, name="history-writer", daemon=True)
            self._history_thread.start()

    def run(self, *, quiet: bool = False) -> None:
        """The slow part of the start: the live monitor, the first snapshot and the loops."""

        def _say(msg: str) -> None:
            if not quiet:
                print(msg, file=sys.stderr)

        # Initial collection so consumers see data immediately without competing with monitor threads
        _say("  collecting initial snapshot ...")
        snap = collect(
            self.root,
            include_processes=True,
            _live_monitor_override={},
            _sink=self.sink,
            _shared_config_cache=self.store.live_sources is not None,
        )
        self.store.update(snap)
        self.allowed.update(snap)

        # Persistent live monitor (runs continuously, accumulates state)
        if self.include_live_monitor:
            _say("  starting persistent live monitor ...")
            self._monitor = PersistentMonitor(self.root, sink=self.sink, live_sources=self.store.live_sources)
            self._monitor.start()

        # Background refresh (uses the persistent monitor for live data)
        self._refresh = RefreshLoop(
            self.root,
            self.interval,
            self.store,
            self.allowed,
            self.include_live_monitor,
            monitor=self._monitor,
        )
        self._refresh.start()

        self._maintenance = LogMaintenanceLoop()
        self._maintenance.start()

    def stop(self) -> None:
        """Stop background collection. Best-effort; safe to call once."""
        from . import tree_walk

        tree_walk.set_lazy(False)
        for handle in self._ingesters.values():
            handle.stop_event.set()
        if self._maintenance is not None:
            self._maintenance.stop()
        if self._refresh is not None:
            self._refresh.stop()
        if self.store is not None and self.store.live_sources is not None:
            self.store.live_sources.stop()
        if self._monitor is not None:
            self._monitor.stop()
        if self.sink is not None:
            self.sink.close()
        self._history_stop.set()
        if self._history_thread is not None:
            self._history_thread.join(timeout=2)
            try:
                self.store.session_facts.save()
                self.store.collection_status.save()
            except OSError:
                log.warning("Could not save session restart state", exc_info=True)
        if self.store is not None and self.store.live_hub is not None:
            self.store.live_hub.close()
        stores.close_writer(self.history_store)


def start_collector(
    root: Path,
    *,
    interval: float = 5.0,
    include_live_monitor: bool = True,
    receive_at: tuple[str, int] | None = None,
) -> None:
    """Run a reporting node: collect and write to the store, serve nothing. Blocks until Ctrl-C.

    No dashboard, no live stream and no state kept for a dashboard on this
    machine. A dashboard on any machine reads this node's data from the store.
    With ``receive_at`` (host, port) the node also takes the hook events and
    OpenTelemetry that the tools on it post, and stores them.
    """
    service = CollectionService(
        root,
        interval=interval,
        include_live_monitor=include_live_monitor,
        reporting_only=True,
    )
    # The stores, then the port, then the first snapshot: posts are taken from the first second.
    service.open_stores()
    receiver = _start_receiver(service.store, receive_at)
    service.run()
    from .dashboard.ingester_runner import start_ingesters

    service._ingesters = start_ingesters(service.store)
    print("  aictl reporting node running — no web UI on this machine", file=sys.stderr)
    print("  view from a machine that runs:  aictl daemon serve", file=sys.stderr)
    print("  press Ctrl-C to stop\n", file=sys.stderr)
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        print("\n  shutting down ...", file=sys.stderr)
    finally:
        if receiver is not None:
            receiver.shutdown()
            receiver.server_close()
        service.stop()


def _start_receiver(store, receive_at: tuple[str, int] | None):
    """Open the receive-only port of a reporting node. A port in use is reported, not fatal."""
    if receive_at is None:
        return None
    from .dashboard.receive_server import ReceiveServer

    host, port = receive_at
    try:
        receiver = ReceiveServer((host, port), store)
    except OSError as exc:
        log.warning("Hooks and telemetry are not received: %s:%s cannot be opened (%s)", host, port, exc)
        print(f"  warning: hooks and telemetry are NOT received: {host}:{port} cannot be opened ({exc})",
              file=sys.stderr)
        return None
    threading.Thread(target=receiver.serve_forever, name="aictl-receive", daemon=True).start()
    print(f"  receiving hooks and telemetry at http://{host}:{port}", file=sys.stderr)
    return receiver


# ─── Entry point ─────────────────────────────────────────────────


def start_server(
    root: Path,
    host: str = "127.0.0.1",
    port: int = 8484,
    interval: float = 5.0,
    open_browser: bool = True,
    include_live_monitor: bool = True,
) -> None:
    """Start the dashboard HTTP server. Blocks until Ctrl-C.

    Visualization layer only: it starts a :class:`CollectionService` for data
    and serves it over HTTP (REST + SSE + static UI). The web server reads
    exclusively from ``service.store`` / ``service.db`` and owns no collectors.
    """
    from .dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

    # Start the collection engine (UI-independent)
    service = CollectionService(
        root,
        interval=interval,
        include_live_monitor=include_live_monitor,
    )
    # Open the stores, then the port, then collect: a relaunch closes the port only for the
    # time the process takes to start. Hooks and OpenTelemetry are taken from the first
    # second; the board's requests wait until the first snapshot is ready.
    service.open_stores()
    store = service.store
    allowed = service.allowed
    # Kill any existing aictl on this port before binding
    _kill_stale_server(port)

    # Start HTTP server (presentation layer)
    server = _DashboardHTTPServer((host, port), _DashboardHandler, store, allowed, root, start_ingesters_now=False)
    server.ready.clear()
    serving = threading.Thread(target=server.serve_forever, name="aictl-http", daemon=True)
    serving.start()
    print(f"  receiving hooks and telemetry at http://{host}:{port}", file=sys.stderr)
    try:
        service.run()
    finally:
        server.ready.set()
    # The ingesters and their one-time backfills read every session file: after the snapshot,
    # as before the port opened early, so they do not compete with it.
    from .dashboard.ingester_runner import start_ingesters

    server.ingesters = start_ingesters(store)
    server.attach_live_ingesters()
    # Other nodes' Index screens read this node's breakdown from the store.
    writer = getattr(getattr(store, "history_store", None), "writer", None)
    if writer is not None:
        from .index_breakdown import Publisher

        server.index_publisher = Publisher(server, writer).start()

    url = f"http://{host}:{port}"
    print(f"  aictl daemon serve — dashboard at {url}", file=sys.stderr)
    print("  press Ctrl-C to stop\n", file=sys.stderr)

    if open_browser:
        webbrowser.open(url)

    try:
        while serving.is_alive():
            serving.join(1.0)
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        server.server_close()
        service.stop()


# ── SnapshotStore / AllowedPaths ────────────────────────────────────

import os as _os
import threading as _threading
import time as _time
from typing import TYPE_CHECKING as _TYPE_CHECKING

from .dashboard.models import DashboardSnapshot as _DashboardSnapshot

if _TYPE_CHECKING:
    from .sink import SampleSink as _SampleSink


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
    """Current snapshot and the version used to invalidate local detail caches."""

    def __init__(self) -> None:
        self._snap: _DashboardSnapshot | None = None
        self._version: int = 0
        self._lock = _threading.Lock()

    def update(self, snap: _DashboardSnapshot) -> list[tuple]:
        """Publish the new snapshot and return per-tool samples for storage."""
        with self._lock:
            self._snap = snap
            self._version += 1
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
                tool_rows.append((t.tool, cpu, mem, tok, traffic))

        return tool_rows

    @property
    def snapshot(self) -> _DashboardSnapshot | None:
        with self._lock:
            return self._snap

    @property
    def version(self) -> int:
        with self._lock:
            return self._version

# Minimum seconds between file-store sync passes. The ~5s refresh cadence
# never pays file-sync cost more than once a minute.
FILE_SYNC_INTERVAL = 60.0


TELEMETRY_HEARTBEAT_S = 300.0
# An unchanged host or process sample is written again after this long. runtime.resources.kql
# holds a sample until the next one for a little longer than this (its `hold`).
SAMPLE_HEARTBEAT_S = 300.0


class SnapshotPersistence:
    """Write snapshot facts through the configured store writer."""

    def __init__(self, _unused=None, writer=None, inventory: FileInventory | None = None,
                 session_facts: SessionFacts | None = None, quality=None, catalog=None) -> None:
        self._writer = stores.writer_or_discard(writer)
        self._inventory = inventory
        self._last_file_sync = 0.0
        self._last_samples: dict[str, tuple[dict, float]] = {}
        self.capture_mode = lambda: ""
        self.node_settings: dict = {}
        self.runtime_sample = None
        self.transport_sample = None
        self._next_health_sample = 0.0
        # Unchanged data is not written again (see _changed_telemetry, persist).
        self._telemetry_last: dict[tuple[str, str], tuple[tuple, float]] = {}
        self._facts = session_facts or SessionFacts(writer)
        self._quality = quality or CollectionStatus(writer)
        self._catalog = catalog or DatapointCatalog(writer)

    def persist(self, snap: _DashboardSnapshot, tool_rows: list[tuple]) -> None:
        """Send changed samples, file inventory, and session facts."""
        try:
            self._persist_samples(snap, tool_rows)
        except Exception:
            log.warning("Snapshot samples could not be handed to the writer", exc_info=True)
        self._sync_files(snap)
        try:
            from .records import EventRow
            # Persist events from live monitor
            if snap.events:
                self._facts.events(
                    [
                        EventRow(
                            ts=e.get("ts", snap.timestamp),
                            tool=e.get("tool", ""),
                            kind=e.get("kind", ""),
                            detail=e.get("detail", {}),
                            session_id=e.get("detail", {}).get("session_id", ""),
                            pid=int(e.get("detail", {}).get("pid", 0) or 0),
                        )
                        for e in snap.events
                        if e.get("tool") and e.get("kind")
                    ],
                    source="monitor",
                )
                # Also write to sessions table for session_start/end events
                self._persist_session_events(snap.events, snap.timestamp)
            # The agent-team scan (snap.agent_teams) is for the live view only. The transcript
            # reader stores sessions and agents from evidence in each line: the scan named a
            # session by its folder (wrong for a resumed session's copied subagents) and took
            # the session's folder from a subagent's, which can be another worktree.

            # All metric emission now happens at collection time
            # (collectors + DiscoveryCollector + collect() enrichment).
            # No snapshot-level emission needed.

            # Refresh dynamic source provenance for the datapoint catalog.
            try:
                self._catalog.refresh(snap)
            except Exception as exc:
                log.debug("Provenance update failed: %s", exc)
        except Exception as exc:
            log.warning("DB write failed: %s", exc)

    def _persist_samples(self, snap: _DashboardSnapshot, tool_rows: list[tuple]) -> None:
        writer = self._writer
        ts = snap.timestamp
        host = dict(
            cpu_percent=round(snap.total_cpu, 2), cpu_per_core=json.dumps(snap.cpu_per_core),
            active_processes=snap.total_processes, memory_used_mb=round(snap.total_mem_mb, 1),
            files=snap.total_files, tokens=snap.total_tokens, mcp=snap.total_mcp_servers,
            mem_tokens=snap.total_memory_tokens, memory_entries=snap.total_memory_entries,
            live_sessions=snap.total_live_sessions, live_tokens=snap.total_live_estimated_tokens,
            live_in_rate=round(snap.total_live_inbound_rate_bps, 2),
            live_out_rate=round(snap.total_live_outbound_rate_bps, 2),
        )
        sample_health = (self.runtime_sample is not None or self.transport_sample is not None) and ts >= self._next_health_sample
        if self._sample_changed("host", host, ts) or sample_health:
            from .health import host_memory

            memory = host_memory()
            used, total = memory["memory_used_bytes"], memory["memory_total_bytes"]
            host.update(project="", ts=ts, daemon_pid=os.getpid(), capture_mode=self.capture_mode(),
                        settings_captured_at=ts,
                        host_cpu_percent=(sum(snap.cpu_per_core) / len(snap.cpu_per_core)
                                          if snap.cpu_per_core else None),
                        host_memory_used_mb=used / (1024 ** 2) if used is not None else None,
                        host_memory_total_mb=total / (1024 ** 2) if total is not None else None)
            host.update(self.node_settings)
            if sample_health:
                self._next_health_sample = ts + 30
                try:
                    host["node_health_counters"] = json.dumps(
                        {"pid": os.getpid(), "at": ts,
                         "store": self.transport_sample() if self.transport_sample is not None else {},
                         "runtime": self.runtime_sample() if self.runtime_sample is not None else {}},
                        separators=(",", ":"),
                    )
                except Exception:
                    log.debug("Node runtime sample failed", exc_info=True)
            writer.append("system_snapshots", [host])
        processes = []
        for tool, cpu, mem, _, _ in tool_rows:
            pid = int(call_key(tool), 16) % 2_000_000_000
            row = dict(tool=tool, pid=pid, cpu_percent=None if cpu is None else round(cpu, 2),
                       memory_rss_mb=None if mem is None else round(mem, 1))
            if self._sample_changed(tool, row, ts):
                processes.append(row | {"project": "", "ts": ts})
        if processes:
            writer.append("process_snapshots", processes)
        telemetry = [
            {name: t.get(name, default) for name, default in (
                ("tool", ""), ("source", ""), ("confidence", 0), ("input_tokens", 0),
                ("output_tokens", 0), ("cache_read_tokens", 0), ("cache_creation_tokens", 0),
                ("total_sessions", 0), ("total_messages", 0), ("cost_usd", 0), ("model", ""),
            )} | dict(project="", ts=ts, by_model=json.dumps(t.get("by_model", {})), by_project="{}")
            for t in self._changed_telemetry(snap.tool_telemetry or [], ts)
        ]
        if telemetry:
            writer.append("tool_stats", telemetry)

    def _sample_changed(self, key: str, values: dict, ts: float) -> bool:
        previous = self._last_samples.get(key)
        if previous is not None and previous[0] == values and ts - previous[1] < SAMPLE_HEARTBEAT_S:
            return False
        self._last_samples[key] = values.copy(), ts
        return True

    def _changed_telemetry(self, reports: list[dict], ts: float) -> list[dict]:
        """Reports whose totals changed, plus one per tool every TELEMETRY_HEARTBEAT_S.

        These are cumulative totals; storing an identical row every 5 s made
        tool_stats 89k rows of mostly repeats.
        """
        changed = []
        for t in reports:
            tool = t.get("tool")
            if not tool:
                continue
            key = (tool, t.get("source", ""))
            value = tuple(sorted((k, repr(v)) for k, v in t.items()))
            last = self._telemetry_last.get(key)
            if last is None or last[0] != value or ts - last[1] >= TELEMETRY_HEARTBEAT_S:
                self._telemetry_last[key] = (value, ts)
                changed.append(t)
        return changed

    def _sync_files(self, snap: _DashboardSnapshot, now: float | None = None) -> None:
        """Sync discovered files into the files/file_history store.

        Throttled to one pass per ``FILE_SYNC_INTERVAL``. Failures are
        logged + recorded as data-quality signals and never propagate.
        """
        if self._inventory is None:
            return
        now = _time.time() if now is None else now
        if now - self._last_file_sync < FILE_SYNC_INTERVAL:
            return
        # Set before the pass so a failing sync also waits out the interval.
        self._last_file_sync = now
        try:
            from .tools import files_to_sample, memory_inventory_files

            discovered: dict[str, dict] = {}
            for tool_rec in snap.tools:
                for f in files_to_sample(tool_rec.files):
                    entry = inventory_row(f, tool_rec.tool)
                    prev = discovered.get(f.path)
                    if prev is None or (not prev.get("tool") and entry["tool"]):
                        discovered[f.path] = entry
            # Memory of every project lies outside the project folders: it is found on its own.
            for f in memory_inventory_files():
                discovered[f.path] = inventory_row(f, f.tool)
            if not discovered:
                # Empty discovery (e.g. transient failure) must not wipe
                # the file store via removed-files handling.
                return
            stats = self._inventory.sync(discovered.values(), now=now)
            log.debug("File sync: %s", stats)
            self._quality.record_data_quality("file-sync", "ok", kind="persistence", detail=stats)
        except Exception as exc:
            log.warning("File sync failed: %s", exc)
            try:
                self._quality.record_data_quality(
                    "file-sync", "failed", kind="persistence", severity="warning",
                    message=f"File sync failed: {type(exc).__name__}", detail={"error": str(exc)},
                )
            except Exception:
                log.debug("file-sync: failed to record data-quality signal", exc_info=True)

    def _persist_session_events(self, events: list[dict], fallback_ts: float) -> None:
        """Write session_start/session_end events to the sessions table."""
        try:
            from . import session_lifecycle
            from .records import CallFacts, SessionRow, launch_flags_event

            updates = []
            links = []
            launches = []
            retired = []
            facts = self._facts
            # A family bound in this same batch never gets its monitor row written first.
            bound_now = {e["detail"].get("session_id") for e in events
                         if e.get("kind") == "session_bound" and isinstance(e.get("detail"), dict)}

            def process_row(session_id: str, detail: dict, tool: str, ts: float, **extra) -> SessionRow:
                """A row from process evidence: never an empty tool or a 1970 start."""
                started = (float(detail.get("native_started_at") or 0.0)
                           or float(detail.get("process_started_at") or 0.0) or ts)
                return SessionRow(session_id, tool or "unknown", int(detail.get("pid", 0) or 0),
                                  detail.get("cwd") or detail.get("project") or "", started_at=started,
                                  source=session_lifecycle.PROCESS_SOURCE, **extra)

            for e in events:
                kind = e.get("kind", "")
                detail = e.get("detail", {})
                sid = detail.get("session_id", "")
                if not sid:
                    continue
                ts = e.get("ts", fallback_ts)
                tool = e.get("tool", "")
                project = detail.get("project", "")
                native = detail.get("native_session_id") or ""
                ev_pid = int(detail.get("pid", 0) or 0)
                if native and kind in ("session_start", "session_bound", "session_alive"):
                    # The process family belongs to the tool's own session: link it there and
                    # keep that row open; a monitor row for it would list the agent twice. The
                    # row only fills fields the tool's own records have not set.
                    updates.append((process_row(native, detail, tool, ts), ts, False))
                    if kind != "session_alive":
                        pids = {ev_pid, int(detail.get("evidence_pid", 0) or 0)} - {0}
                        links.extend((native, pid, tool, ts, "lead", project) for pid in sorted(pids))
                        if isinstance(detail.get("launch"), dict):
                            launches.append(launch_flags_event(native, tool, detail["launch"], ts))
                    if kind == "session_bound":
                        retired.append((sid, project, native))
                        previous = detail.get("previous_native_session_id") or ""
                        if previous and previous != native:
                            before = dict(detail, native_started_at=detail.get("previous_native_started_at") or 0.0)
                            updates.append((process_row(previous, before, tool, ts, ended_at=ts,
                                                        end_reason=session_lifecycle.SWITCHED), ts, True))
                elif kind == "session_start":
                    if sid in bound_now:
                        continue
                    row = SessionRow(sid, tool, ev_pid, project,
                                     started_at=float(detail.get("process_started_at") or 0.0) or ts,
                                     source="correlator")
                    updates.append((row, ts, False))
                    links.append((sid, ev_pid, tool, ts, "lead", project))
                elif kind == "session_merged":
                    # Another monitor session of the same process family holds these processes now.
                    retired.append((sid, project, native or str(detail.get("into") or "")))
                elif kind == "session_end":
                    reason = detail.get("end_reason") or session_lifecycle.IDLE
                    if native:
                        updates.append((process_row(native, detail, tool, ts, ended_at=ts, end_reason=reason),
                                        ts, True))
                        continue
                    row = SessionRow(
                        sid, tool, project_path=project, started_at=ts, ended_at=ts, end_reason=reason,
                        source="correlator",
                        input_tokens=detail.get("input_tokens", 0),
                        output_tokens=detail.get("output_tokens", 0),
                        files_modified=detail.get("files_modified", 0),
                    )
                    updates.append((row, ts, True))
            facts.sessions(updates)
            facts.links(links)
            if launches:
                facts.write(CallFacts(context_events=launches), only="context_events")
            if retired:
                facts.retire(retired)
        except Exception as exc:
            log.warning("Session event persistence failed: %s", exc)


class SnapshotStore:
    """Facade composing state, serialization, and persistence.

    Uses the configured store for history and local files for restart state.
    Uses SampleSink for universal metric emission.
    """

    def __init__(
        self, db=None, sink: _SampleSink | None = None, *,
        history_store: stores.Store | None = None, inventory: FileInventory | None = None,
        keeps_text=lambda: False, restart_dir: Path | None = None, content_days: int = 14,
        trim_before=lambda: 0.0, retention: dict[str, int] | None = None, large_payload_bytes: int = 32768,
    ) -> None:
        self._state = SnapshotState()
        self.history_store = history_store or stores.Store()
        # Tool content older than its retention class keeps is not imported (24 hours by default).
        self.tool_calls = ToolCalls(self.history_store.writer, keeps_text=keeps_text,
                                    text_floor=lambda: self.session_facts.text_floor("tool_content"))
        self.restart_dir = restart_dir
        def state(name: str):
            return StateFile(restart_dir / f"{name}.json") if restart_dir is not None else None

        writer = stores.writer_or_discard(self.history_store.writer)
        session_state = state("session_lifecycle")
        self.session_facts = SessionFacts(self.history_store.writer, keeps_text=keeps_text, state=session_state,
                                          content_days=content_days, trim_before=trim_before,
                                          retention=retention, large_payload_bytes=large_payload_bytes)
        self.collection_status = CollectionStatus(writer, state("collection_status"))
        self.session_evidence = SessionEvidence(self.session_facts, state("session_artifacts"), self.collection_status)
        catalog = DatapointCatalog(writer, state("datapoint_catalog"))
        self._persistence = SnapshotPersistence(writer=writer, inventory=inventory, session_facts=self.session_facts,
                                                quality=self.collection_status, catalog=catalog)
        from .health import node_transport_counters

        self._persistence.transport_sample = lambda: node_transport_counters(
            stores.reader_feature(self.history_store.history_reader(), "transport_diagnostics", writer) or {},
            self.history_store.writer.health() if self.history_store.writer is not None else None,
        )
        # Exposed for callers that access these directly
        self._db = db
        self._sink = sink
        # Incremental channels are configured by the dashboard runtime.
        self.live_hub = None
        self.live_sources = None
        # The refresh loop waits on this; request_refresh sets it.
        self.refresh_requested = _threading.Event()

    def update(self, snap: _DashboardSnapshot) -> None:
        tool_rows = self._state.update(snap)
        self._persistence.persist(snap, tool_rows)

    def request_refresh(self) -> None:
        """A hook or telemetry arrived: refresh soon, while a dashboard client watches.

        With no client the data is stored anyway and the next interval shows it.
        """
        if PACE.watched():
            self.refresh_requested.set()

    @property
    def snapshot(self) -> _DashboardSnapshot | None:
        return self._state.snapshot

    @property
    def version(self) -> int:
        return self._state.version

# A path's real path is looked up again after this long; a symlink seldom changes.
REALPATH_TTL_S = 300.0


class AllowedPaths:
    """Maintains the set of file paths that may be served via /api/file."""

    def __init__(self) -> None:
        self._paths: set[str] = set()
        self._lock = _threading.Lock()
        # Thousands of files are discovered, and realpath is a syscall per path part.
        # The answers are kept across refreshes, for the paths still discovered.
        self._real: dict[str, str] = {}
        self._real_at = 0.0

    def _realpaths(self, candidates: list[str]) -> set[str]:
        now = _time.monotonic()
        known = self._real if now - self._real_at < REALPATH_TTL_S else {}
        if not known:
            self._real_at = now
        real: dict[str, str] = {}
        for path in candidates:
            hit = known.get(path)
            if hit is None:
                try:
                    hit = _os.path.realpath(path)
                except (OSError, ValueError):
                    continue
            real[path] = hit
        self._real = real
        return set(real.values())

    def update(self, snap: _DashboardSnapshot) -> None:
        candidates = [f.path for tr in snap.tools for f in tr.files]
        candidates += [mem.file for mem in snap.agent_memory if mem.file]
        paths = self._realpaths(candidates)
        # aictl-owned .context.toml files (hierarchical, per the AGENTS.md note)
        # are not part of any tool's discovered file set, so they would never be
        # added by the loops above. Walk the project root and include them so
        # the dashboard (and `aictl ctx` inspection UIs) can preview the canonical
        # context source via /api/file.
        root = getattr(snap, "root", None)
        if root:
            try:
                from .context import AICTX_FILENAME, _walk

                for aictx in _walk(Path(root)):
                    try:
                        paths.add(_os.path.realpath(aictx))
                    except (OSError, ValueError):
                        pass
                # Also allow a bare root-level .context.toml that may have been
                # created after the last walk filter (defensive — _walk already
                # yields it when present, but a freshly-touched file with an
                # iterdir race is cheap to cover explicitly).
                root_aictx = Path(root) / AICTX_FILENAME
                if root_aictx.is_file():
                    try:
                        paths.add(_os.path.realpath(root_aictx))
                    except (OSError, ValueError):
                        pass
            except (OSError, ValueError, ImportError):
                # Defensive: never let allowlist construction crash the
                # snapshot pipeline. A missing or unreadable root simply
                # narrows the allowlist — it does not widen it.
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
