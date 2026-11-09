# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Cross-platform process monitoring via psutil.

Also contains tool and root-process classification.

Uses CSV ps_grep_pattern from the process registry as the sole
matching strategy.  All patterns are defined in the CSV data files —
no hardcoded tool names or regex patterns in Python code.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from ...data.schema import metric_name as M
from ...platforms import IS_WINDOWS
from ..config import MonitorConfig
from ..pace import PACE
from ..session import ProcessInfo
from . import BaseCollector

log = logging.getLogger(__name__)

# ─── Process classification ─────────────────────────────────────────────────


def _normalize_name(name: str) -> str:
    lowered = name.lower().strip()
    if lowered.endswith(".exe"):
        lowered = lowered[:-4]
    return lowered


@dataclass(frozen=True, slots=True)
class MatchResult:
    """Classification result for one process."""

    tool: str | None
    root_candidate: bool = False


# ─── CSV-driven classification ─────────────────────────────────

_CSV_PATTERNS: list[tuple[re.Pattern, str]] | None = None
# True while the process registry cannot be loaded. Exposed via
# classification_degraded() so the collector can surface the failure
# instead of silently recording zero sessions forever.
_LOAD_FAILED: bool = False
_LAST_LOAD_ERROR_TS: float = 0.0
_LOAD_ERROR_LOG_INTERVAL: float = 60.0  # seconds between repeated error logs


def classification_degraded() -> bool:
    """True while the process registry cannot be loaded (no classification)."""
    return _LOAD_FAILED


def _load_csv_patterns() -> list[tuple[re.Pattern, str]]:
    """Lazy-load compiled regex patterns from process CSV specs."""
    global _CSV_PATTERNS, _LOAD_FAILED, _LAST_LOAD_ERROR_TS
    if _CSV_PATTERNS is not None:
        return _CSV_PATTERNS
    try:
        from ...tools import get_registry

        patterns: list[tuple[re.Pattern, str]] = []
        for spec in get_registry().process_specs():
            if not spec.ps_grep_pattern:
                continue
            for pat_str in spec.ps_grep_pattern.split("|"):
                pat_str = pat_str.strip()
                if not pat_str:
                    continue
                try:
                    patterns.append((re.compile(pat_str, re.IGNORECASE), spec.ai_tool))
                except re.error:
                    continue
        _CSV_PATTERNS = patterns
        _LOAD_FAILED = False
        return _CSV_PATTERNS
    except Exception as exc:
        # Do NOT cache the failure: leave _CSV_PATTERNS unset so the next
        # call retries. A transient error (partial install, locked file)
        # must never permanently disable session classification.
        _LOAD_FAILED = True
        now = time.time()
        if now - _LAST_LOAD_ERROR_TS >= _LOAD_ERROR_LOG_INTERVAL:
            _LAST_LOAD_ERROR_TS = now
            log.error("Process registry load failed — classification degraded until it recovers: %s", exc)
        return []


# ─── Public API ────────────────────────────────────────────────


def classify_process(process: ProcessInfo) -> MatchResult:
    """Map a process to a monitored tool family.

    Uses CSV ps_grep_pattern patterns exclusively (priority from CSV
    row order).  Returns MatchResult(tool=None) if no pattern matches.
    """
    name = _normalize_name(process.name)
    cmdline = " ".join(part.lower() for part in process.cmdline)
    exe = (process.exe or "").lower()
    combined = " ".join(part for part in (name, cmdline, exe) if part)

    patterns = _load_csv_patterns()
    for pattern, tool_name in patterns:
        if pattern.search(name) or pattern.search(combined):
            return MatchResult(tool=tool_name, root_candidate=True)

    return MatchResult(tool=None, root_candidate=False)


# ─── Collector ─────────────────────────────────────────────────

# A process can change its working directory, so a cached cwd is read again after this long.
CWD_REFRESH_S = 60.0


class PsutilProcessCollector(BaseCollector):
    """Poll process trees and emit process start/sample/exit events."""

    name = "process:psutil"

    def __init__(self, config: MonitorConfig) -> None:
        super().__init__(config=config)
        self._known_pids: set[int] = set()
        self._handles: dict[int, object] = {}
        self._identity: dict[tuple[int, str], tuple[tuple[str, ...], str | None]] = {}
        # Sticky set: once a PID is classified as AI-tool-related, keep
        # tracking it until the process actually exits.  Prevents losing
        # long-running sessions when classify_process is inconsistent
        # across poll cycles (e.g. cmdline temporarily unavailable).
        self._sticky_pids: set[int] = set()
        # Classification per (pid, name), kept like _identity: the regexes run once per process.
        self._classified: dict[tuple[int, str], MatchResult] = {}
        # cwd per pid with the time it was read. A failed read is kept as None.
        self._cwd: dict[int, tuple[str | None, float]] = {}
        # Last classification-health state pushed via report_status, so
        # status flips are reported once per transition (not per cycle).
        self._classification_degraded_reported: bool = False

    async def run(self) -> None:
        try:
            import psutil
        except ImportError:
            await self.report_status(
                status="disabled",
                mode="missing-dependency",
                detail="Install psutil or use aictl[monitor]",
            )
            return

        await self.report_status(
            status="active",
            mode="polling",
            detail="Polling process tree, CPU, and subprocess creation via psutil",
        )

        while True:
            snapshot = await asyncio.to_thread(self._snapshot, psutil)
            current_pids = set(snapshot)

            # Surface registry-load failures (classification kill-switch)
            # through the collector status + data-quality plumbing.
            await self._report_classification_health()

            # Per-core CPU (system-wide)
            try:
                per_core = psutil.cpu_percent(interval=0, percpu=True)
                for i, pct in enumerate(per_core):
                    self.sink_emit_cpu(M("system.cpu.utilization"), pct / 100, {"cpu.id": str(i)})
            except (psutil.Error, OSError):
                pass

            for pid, sample in snapshot.items():
                is_new = pid not in self._known_pids
                self._known_pids.add(pid)
                proc = sample["process"]
                cpu_pct = sample["cpu_percent"]
                mem_rss = sample["memory_rss"]

                # Correlator: typed session tracking
                if self.correlator:
                    self.correlator.on_process(proc, cpu_pct, mem_rss, sample["child_count"], is_new=is_new)

                # Sink: full-resolution per-PID metrics (OTel conventions)
                ptags = {"process.pid": str(pid), "process.name": proc.name}
                match = self._classified.get((pid, proc.name)) or classify_process(proc)
                if match.tool:
                    ptags["aictl.tool"] = match.tool
                if cpu_pct is not None:
                    self.sink_emit_cpu(M("process.cpu.utilization"), cpu_pct / 100, ptags)
                self.sink_emit_memory(M("process.memory.usage"), float(mem_rss or 0), ptags)
                self.sink_emit_if_changed(M("process.thread.count"), float(sample["child_count"]), ptags)

            for pid in sorted(self._known_pids - current_pids):
                self._handles.pop(pid, None)
                self._cwd.pop(pid, None)
                self._known_pids.discard(pid)
                self._sticky_pids.discard(pid)
                if self.correlator:
                    self.correlator.on_process_exit(pid)

            await self.sleep_paced(self.config.process_interval)

    async def _report_classification_health(self) -> None:
        """Report registry-load degradation once per state transition.

        When ``_load_csv_patterns`` cannot load the process registry,
        ``classify_process`` matches nothing and no sessions are recorded.
        Surface that as a degraded collector status (visible in doctor
        diagnostics and the ``data_quality_status`` table) instead of
        letting the collector report healthy while producing nothing.
        """
        degraded = classification_degraded()
        if degraded == self._classification_degraded_reported:
            return
        self._classification_degraded_reported = degraded
        if degraded:
            await self.report_status(
                status="degraded",
                mode="registry-load-failed",
                detail="Process registry failed to load — session classification disabled until it recovers",
            )
        else:
            await self.report_status(
                status="active",
                mode="polling",
                detail="Polling process tree, CPU, and subprocess creation via psutil",
            )

    def _snapshot(self, psutil_module):
        all_processes: dict[int, dict[str, object]] = {}
        children: dict[int, set[int]] = defaultdict(set)

        # cmdline and exe need a syscall per process and change only on exec,
        # which also changes the name, so they are cached per (pid, name).
        # username is not read anywhere and takes a user lookup per process.
        identity: dict[tuple[int, str], tuple[tuple[str, ...], str | None]] = {}
        for process in psutil_module.process_iter(["pid", "ppid", "name"]):
            try:
                info = process.info
                pid = int(info["pid"])
                ppid = int(info["ppid"]) if info["ppid"] is not None else None
                name = str(info.get("name") or "")
                cached = self._identity.get((pid, name))
                if cached is None:
                    extra = process.as_dict(["cmdline", "exe"])
                    cached = (
                        tuple(str(part) for part in (extra.get("cmdline") or ())),
                        str(extra["exe"]) if extra.get("exe") else None,
                    )
                # An empty cmdline can be a race during exec: read it again. Windows
                # has no exec, and protected processes would be denied every time.
                if cached[0] or IS_WINDOWS:
                    identity[(pid, name)] = cached
                all_processes[pid] = {
                    "pid": pid,
                    "ppid": ppid,
                    "name": name,
                    "cmdline": cached[0],
                    "exe": cached[1],
                    "username": None,
                }
                if ppid is not None:
                    children[ppid].add(pid)
            except (psutil_module.Error, OSError, KeyError, TypeError):
                continue
        self._identity = identity

        tracked = self._tracked_pids(all_processes, children)
        snapshot: dict[int, dict[str, object]] = {}
        for pid in tracked:
            base = all_processes[pid]
            handle = self._handles.get(pid)
            primed_now = handle is None
            if handle is None:
                try:
                    handle = psutil_module.Process(pid)
                    handle.cpu_percent(None)
                    self._handles[pid] = handle
                except (psutil_module.Error, OSError):
                    continue

            cwd_cached = self._cwd.get(pid)
            now = time.monotonic()
            cwd = cwd_cached[0] if cwd_cached else None
            cpu_percent: float | None = 0.0
            memory_rss = 0
            child_count = len(children.get(pid, set()))
            try:
                with handle.oneshot():
                    cpu_percent = float(handle.cpu_percent(None))
                    if primed_now:
                        # psutil measures CPU between two calls. Right after the priming
                        # call the interval is a few milliseconds, so this value is noise
                        # (it can exceed what the cores can give). It is not known yet.
                        cpu_percent = None
                    else:
                        # One process cannot use more than all cores.
                        cpu_percent = min(cpu_percent, 100.0 * (os.cpu_count() or 1))
                    memory_rss = int(handle.memory_info().rss)
                    if cwd_cached is None or now - cwd_cached[1] >= CWD_REFRESH_S:
                        try:
                            cwd = str(handle.cwd())
                        except (psutil_module.Error, OSError):
                            cwd = None
                        self._cwd[pid] = (cwd, now)
            except (psutil_module.Error, OSError):
                continue

            snapshot[pid] = {
                "process": ProcessInfo(
                    pid=pid,
                    ppid=base["ppid"],
                    name=str(base["name"]),
                    exe=base["exe"],
                    cmdline=base["cmdline"],
                    username=base["username"],
                    cwd=cwd,
                ),
                "cpu_percent": cpu_percent,
                "memory_rss": memory_rss,
                "child_count": child_count,
            }

        return snapshot

    def _tracked_pids(self, all_processes, children) -> set[int]:
        # Same rule as _identity: an empty cmdline may be an exec race, and a result
        # from a registry that failed to load must not stick.
        classified: dict[tuple[int, str], MatchResult] = {}
        roots: set[int] = set()
        for pid, info in all_processes.items():
            key = (pid, str(info["name"]))
            match = self._classified.get(key)
            if match is None:
                match = classify_process(
                    ProcessInfo(
                        pid=pid,
                        ppid=info["ppid"],
                        name=str(info["name"]),
                        exe=info["exe"],
                        cmdline=info["cmdline"],
                        username=info["username"],
                    )
                )
            if info["cmdline"] or IS_WINDOWS:
                classified[key] = match
            if match.root_candidate:
                roots.add(pid)
        self._classified = {} if classification_degraded() else classified
        # Persist newly-found roots so they survive inconsistent classification
        self._sticky_pids.update(roots)
        # Prune sticky PIDs that no longer exist as live processes
        self._sticky_pids &= set(all_processes)
        # Use sticky set as roots (superset of current-cycle roots)
        tracked = set(self._sticky_pids)
        queue = list(tracked)
        while queue:
            pid = queue.pop()
            for child_pid in children.get(pid, set()):
                if child_pid not in tracked:
                    tracked.add(child_pid)
                    queue.append(child_pid)
        return tracked


# ── Filesystem collector ────────────────────────────────


def _is_under(path: str, roots: tuple[str, ...]) -> bool:
    """True when ``path`` is one of ``roots`` or below it, as this OS compares paths."""
    candidate = os.path.normcase(path)
    for root in roots:
        norm = os.path.normcase(root)
        if candidate == norm or candidate.startswith(norm.rstrip(os.sep) + os.sep):
            return True
    return False


# Samples per second for files that no AI tool owns. A build or a checkout changes thousands
# of files per second, and each sample would crowd out the data people opened the dashboard for.
MAX_FILE_EVENT_SAMPLES_PER_S = 200
# A tool that writes one file many times per second gets one sample per second for it,
# and only this many files per second get a sample of their own.
MAX_TOOL_FILE_SAMPLES_PER_S = 500
# Repeated change events for a file inside this time are dropped before the size lookup.
# The next event still adds the growth, because growth comes from the last known size.
FILE_EVENT_MIN_GAP_S = 0.25
# Stands in for the files over that limit, so totals stay right.
OTHER_FILES_PATH = "(other files)"
# Paths whose last size is kept, so a long build cannot grow this without limit.
MAX_TRACKED_FILE_SIZES = 50_000
# Dropped even under a tool's own folder: ~/.copilot/pkg holds whole node_modules trees.
ALWAYS_IGNORED_DIR_NAMES = frozenset({".git", "node_modules", "__pycache__"})


def _outermost_paths(paths: list[Path]) -> list[Path]:
    """Drop paths inside another path in the list. Each is watched recursively, so a
    nested root would deliver every event twice."""
    keyed = [(os.path.normcase(str(path)).rstrip(os.sep) + os.sep, path) for path in paths]
    kept: list[Path] = []
    seen: set[str] = set()
    for key, path in keyed:
        if key in seen or any(key != other and key.startswith(other) for other, _ in keyed):
            continue
        seen.add(key)
        kept.append(path)
    return kept


class _FileEventSampler:
    """Turn file events into samples, within a limit per second for files that no AI tool owns."""

    def __init__(self, collector: BaseCollector, clock=time.monotonic) -> None:
        self._collector = collector
        self._clock = clock
        self._window_start = 0.0
        self._sampled = 0
        self._other_bytes = 0.0
        self._tool_pending: dict[str, tuple[str, float, int]] = {}

    def record(self, path: str, growth: int, size: int, tool_hint: str | None) -> None:
        if tool_hint:
            # A tool is at work. A build in the same folder must not keep polling at full speed.
            PACE.note_activity()
        now = self._clock()
        if now - self._window_start >= 1.0:
            if self._other_bytes:
                self._collector.sink_emit(M("process.disk.io"), self._other_bytes, {"path": OTHER_FILES_PATH})
            for tool_path, (hint, held, latest) in self._tool_pending.items():
                if held:
                    self._sample(tool_path, held, latest, hint)
            self._window_start, self._sampled, self._other_bytes = now, 0, 0.0
            self._tool_pending = {}
        if not tool_hint:
            if self._sampled >= MAX_FILE_EVENT_SAMPLES_PER_S:
                self._other_bytes += abs(growth) or 1
                return
            self._sampled += 1
        else:
            pending = self._tool_pending.get(path)
            if pending is not None:
                self._tool_pending[path] = (tool_hint, pending[1] + (abs(growth) or 1), size or pending[2])
                return
            if len(self._tool_pending) >= MAX_TOOL_FILE_SAMPLES_PER_S:
                self._other_bytes += abs(growth) or 1
                return
            self._tool_pending[path] = (tool_hint, 0.0, size)
        self._sample(path, float(abs(growth) or 1), size, tool_hint)

    def _sample(self, path: str, value: float, size: int, tool_hint: str | None) -> None:
        ftags = {"path": path}
        if tool_hint:
            ftags["tool"] = tool_hint
        self._collector.sink_emit(M("process.disk.io"), value, ftags)
        if size:
            self._collector.sink_emit_if_changed(M("aictl.file.size"), float(size), ftags)


class WatchdogFileCollector(BaseCollector):
    """Watch project and state directories for file activity."""

    name = "filesystem:watchdog"

    def __init__(self, config: MonitorConfig) -> None:
        super().__init__()
        self.config = config

    async def run(self) -> None:
        try:
            from watchdog.events import FileSystemEventHandler
            from watchdog.observers import Observer
        except ImportError:
            await self.report_status(
                status="disabled",
                mode="missing-dependency",
                detail="Install watchdog or use aictl[monitor]",
            )
            return

        watch_paths = _outermost_paths(
            [path for path in (*self.config.workspace_paths, *self.config.state_paths) if path.exists()]
        )
        if not watch_paths:
            await self.report_status(
                status="disabled",
                mode="no-paths",
                detail="No workspace or state paths exist on disk",
            )
            return

        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[dict] = asyncio.Queue()
        handler = _WatchHandler(loop=loop, queue=queue, config=self.config)
        observer = Observer()
        for path in watch_paths:
            observer.schedule(handler, str(path), recursive=True)
        observer.start()

        await self.report_status(
            status="active",
            mode="native-fs-events",
            detail=f"Watching {len(watch_paths)} paths for edits and growth",
        )

        sampler = _FileEventSampler(self)
        try:
            while True:
                fe = await queue.get()  # dict with path, growth, size, tool_hint, workspace, event_type
                path = fe.get("path", "")
                growth = fe.get("growth_bytes", 0)
                size = fe.get("size_bytes", 0)
                tool_hint = fe.get("tool_hint")
                workspace = fe.get("workspace")
                event_type = fe.get("event_type", "modified")

                # Correlator: typed session tracking
                if self.correlator and path:
                    self.correlator.on_file(path, growth, event_type, tool_hint=tool_hint, workspace=workspace)

                # Sink: per-file metrics
                if path:
                    sampler.record(path, growth, size, tool_hint)
        except asyncio.CancelledError:
            raise
        finally:
            observer.stop()
            observer.join(timeout=2.0)


class _WatchHandler:  # pragma: no cover - exercised through watchdog integration
    def __init__(self, *, loop, queue: asyncio.Queue[dict], config: MonitorConfig) -> None:
        from watchdog.events import FileSystemEventHandler

        class Handler(FileSystemEventHandler):
            def on_created(inner_self, event) -> None:
                self._emit("created", event)

            def on_modified(inner_self, event) -> None:
                self._emit("modified", event)

            def on_moved(inner_self, event) -> None:
                self._emit("moved", event, path_override=event.dest_path)

            def on_deleted(inner_self, event) -> None:
                self._emit("deleted", event)

        self._delegate = Handler()
        self._loop = loop
        self._queue = queue
        self._config = config
        self._size_cache: dict[str, int] = {}
        self._last_change: dict[str, float] = {}
        self._ignored_names = frozenset(config.ignored_dir_names)

    def dispatch(self, event) -> None:
        self._delegate.dispatch(event)

    def _emit(self, event_type: str, event, path_override: str | None = None) -> None:
        if event.is_directory:
            return
        path = str(Path(path_override or event.src_path).expanduser())
        if _is_under(path, self._config.ignored_paths):
            return
        parts = Path(path).parts
        if not ALWAYS_IGNORED_DIR_NAMES.isdisjoint(parts):
            return
        tool_hint = _tool_hint_for_path(path)
        # Build output says nothing about AI tools. A tool's own state stays in, even under
        # a folder named like one of these.
        if not tool_hint and not self._ignored_names.isdisjoint(parts):
            return
        if event_type == "modified":
            now = time.monotonic()
            if now - self._last_change.get(path, -FILE_EVENT_MIN_GAP_S) < FILE_EVENT_MIN_GAP_S:
                return
            if len(self._last_change) >= MAX_TRACKED_FILE_SIZES:
                self._last_change.clear()
            self._last_change[path] = now
        workspace = self._config.workspace_for_path(path)
        growth_bytes = 0
        size_bytes = 0
        if event_type != "deleted":
            try:
                size_bytes = Path(path).stat().st_size
            except OSError:
                size_bytes = 0
            previous = self._size_cache.get(path, 0)
            growth_bytes = max(0, size_bytes - previous)
            if len(self._size_cache) >= MAX_TRACKED_FILE_SIZES:
                self._size_cache.clear()
            self._size_cache[path] = size_bytes

        self._loop.call_soon_threadsafe(
            self._queue.put_nowait,
            {
                "path": path,
                "event_type": event_type,
                "tool_hint": tool_hint,
                "workspace": workspace,
                "growth_bytes": growth_bytes,
                "size_bytes": size_bytes,
            },
        )


from ...platforms import tool_hint_for_path as _tool_hint_for_path
