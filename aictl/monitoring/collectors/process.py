# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Cross-platform process monitoring via psutil."""

from __future__ import annotations

import asyncio
from collections import defaultdict

from .base import BaseCollector
from ..config import MonitorConfig
from ..events import ProcessInfo
from ...data.schema import metric_name as M
from ..process_classifier import classify_process


class PsutilProcessCollector(BaseCollector):
    """Poll process trees and emit process start/sample/exit events."""

    name = "process:psutil"

    def __init__(self, config: MonitorConfig) -> None:
        super().__init__()
        self.config = config
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
            except Exception:
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
