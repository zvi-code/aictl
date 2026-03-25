"""Cross-platform process monitoring via psutil."""

from __future__ import annotations

import asyncio
from collections import defaultdict

from .base import BaseCollector
from ..config import MonitorConfig
from ..events import EventKind, ProcessInfo, UnifiedEvent
from ..process_classifier import classify_process


class PsutilProcessCollector(BaseCollector):
    """Poll process trees and emit process start/sample/exit events."""

    name = "process:psutil"

    def __init__(self, config: MonitorConfig) -> None:
        self.config = config
        self._known_pids: set[int] = set()
        self._handles: dict[int, object] = {}

    async def run(self, emit) -> None:
        try:
            import psutil
        except ImportError:
            await self.emit_status(
                emit,
                status="disabled",
                mode="missing-dependency",
                detail="Install psutil or use aictl[monitor]",
            )
            return

        await self.emit_status(
            emit,
            status="active",
            mode="polling",
            detail="Polling process tree, CPU, and subprocess creation via psutil",
        )

        while True:
            snapshot = await asyncio.to_thread(self._snapshot, psutil)
            current_pids = set(snapshot)

            for pid, sample in snapshot.items():
                event_kind = EventKind.PROCESS_START if pid not in self._known_pids else EventKind.PROCESS_SAMPLE
                self._known_pids.add(pid)
                await emit(
                    UnifiedEvent(
                        kind=event_kind,
                        source=self.name,
                        pid=pid,
                        process=sample["process"],
                        metrics={
                            "cpu_percent": sample["cpu_percent"],
                            "memory_rss": sample["memory_rss"],
                            "child_count": sample["child_count"],
                        },
                    )
                )

            for pid in sorted(self._known_pids - current_pids):
                self._handles.pop(pid, None)
                self._known_pids.discard(pid)
                await emit(UnifiedEvent(kind=EventKind.PROCESS_EXIT, source=self.name, pid=pid))

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
            except Exception:
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
                except Exception:
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
                    except Exception:
                        cwd = None
            except Exception:
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
        tracked = set(roots)
        queue = list(roots)
        while queue:
            pid = queue.pop()
            for child_pid in children.get(pid, set()):
                if child_pid not in tracked:
                    tracked.add(child_pid)
                    queue.append(child_pid)
        return tracked
