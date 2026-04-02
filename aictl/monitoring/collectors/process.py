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
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from . import BaseCollector
from ..config import MonitorConfig
from ..session import ProcessInfo
from ...data.schema import metric_name as M


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


def _load_csv_patterns() -> list[tuple[re.Pattern, str]]:
    """Lazy-load compiled regex patterns from process CSV specs."""
    global _CSV_PATTERNS
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
        return _CSV_PATTERNS
    except Exception:
        _CSV_PATTERNS = []
        return _CSV_PATTERNS


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


class PsutilProcessCollector(BaseCollector):
    """Poll process trees and emit process start/sample/exit events."""

    name = "process:psutil"

    def __init__(self, config: MonitorConfig) -> None:
        super().__init__(config=config)
        self._known_pids: set[int] = set()
        self._handles: dict[int, object] = {}
        # Sticky set: once a PID is classified as AI-tool-related, keep
        # tracking it until the process actually exits.  Prevents losing
        # long-running sessions when classify_process is inconsistent
        # across poll cycles (e.g. cmdline temporarily unavailable).
        self._sticky_pids: set[int] = set()

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

            # Per-core CPU (system-wide)
            try:
                per_core = psutil.cpu_percent(interval=0, percpu=True)
                for i, pct in enumerate(per_core):
                    self.sink_emit_cpu(M("system.cpu.utilization"),
                                      pct / 100, {"cpu.id": str(i)})
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
                    self.correlator.on_process(
                        proc, cpu_pct, mem_rss, sample["child_count"],
                        is_new=is_new)

                # Sink: full-resolution per-PID metrics (OTel conventions)
                ptags = {"process.pid": str(pid), "process.name": proc.name}
                match = classify_process(proc)
                if match.tool:
                    ptags["aictl.tool"] = match.tool
                self.sink_emit_cpu(M("process.cpu.utilization"),
                               cpu_pct / 100, ptags)
                self.sink_emit_memory(M("process.memory.usage"),
                               float(mem_rss or 0), ptags)
                self.sink_emit_if_changed(M("process.thread.count"),
                               float(sample["child_count"]), ptags)

            for pid in sorted(self._known_pids - current_pids):
                self._handles.pop(pid, None)
                self._known_pids.discard(pid)
                self._sticky_pids.discard(pid)
                if self.correlator:
                    self.correlator.on_process_exit(pid)

            await self.sleep(self.config.process_interval)

    def _snapshot(self, psutil_module):
        all_processes: dict[int, dict[str, object]] = {}
        children: dict[int, set[int]] = defaultdict(set)

        for process in psutil_module.process_iter(["pid", "ppid", "name", "cmdline", "exe", "username"]):
            try:
                info = process.info
                pid = int(info["pid"])
                ppid = int(info["ppid"]) if info["ppid"] is not None else None
                all_processes[pid] = {
                    "pid": pid,
                    "ppid": ppid,
                    "name": str(info.get("name") or ""),
                    "cmdline": tuple(str(part) for part in (info.get("cmdline") or ())),
                    "exe": str(info["exe"]) if info.get("exe") else None,
                    "username": str(info["username"]) if info.get("username") else None,
                }
                if ppid is not None:
                    children[ppid].add(pid)
            except (psutil.Error, OSError, KeyError, TypeError):
                continue

        tracked = self._tracked_pids(all_processes, children)
        snapshot: dict[int, dict[str, object]] = {}
        for pid in tracked:
            base = all_processes[pid]
            handle = self._handles.get(pid)
            if handle is None:
                try:
                    handle = psutil_module.Process(pid)
                    handle.cpu_percent(None)
                    self._handles[pid] = handle
                except (psutil.Error, OSError):
                    continue

            cwd = None
            cpu_percent = 0.0
            memory_rss = 0
            child_count = len(children.get(pid, set()))
            try:
                with handle.oneshot():
                    cpu_percent = float(handle.cpu_percent(None))
                    memory_rss = int(handle.memory_info().rss)
                    try:
                        cwd = str(handle.cwd())
                    except (psutil.Error, OSError):
                        cwd = None
            except (psutil.Error, OSError):
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
        roots = {
            pid
            for pid, info in all_processes.items()
            if classify_process(
                ProcessInfo(
                    pid=pid,
                    ppid=info["ppid"],
                    name=str(info["name"]),
                    exe=info["exe"],
                    cmdline=info["cmdline"],
                    username=info["username"],
                )
            ).root_candidate
        }
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

        watch_paths = [path for path in (*self.config.workspace_paths, *self.config.state_paths) if path.exists()]
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
                    self.correlator.on_file(
                        path, growth, event_type,
                        tool_hint=tool_hint, workspace=workspace)

                # Sink: per-file metrics
                if path:
                    ftags = {"path": path}
                    if tool_hint:
                        ftags["tool"] = tool_hint
                    self.sink_emit(M("process.disk.io"), float(abs(growth) or 1), ftags)
                    if size:
                        self.sink_emit_if_changed(M("aictl.file.size"), float(size), ftags)
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

    def dispatch(self, event) -> None:
        self._delegate.dispatch(event)

    def _emit(self, event_type: str, event, path_override: str | None = None) -> None:
        if event.is_directory:
            return
        path = str(Path(path_override or event.src_path).expanduser())
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
            self._size_cache[path] = size_bytes

        self._loop.call_soon_threadsafe(
            self._queue.put_nowait,
            {
                "path": path,
                "event_type": event_type,
                "tool_hint": _tool_hint_for_path(path),
                "workspace": workspace,
                "growth_bytes": growth_bytes,
                "size_bytes": size_bytes,
            },
        )


from ...platforms import tool_hint_for_path as _tool_hint_for_path
