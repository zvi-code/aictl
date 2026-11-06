# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Keep the hidden-context audit for a while so a poll does not walk the disk.

``run_audit`` reads the project tree, the tool folders and the transcripts, and
takes about a second on a large tree. The dashboard asks for it once a minute,
so the answer is kept for ``TTL_S`` and a request that carries ``refresh=1``
(the Rescan button) always runs it again. ``poll`` runs the audit on its own
thread and answers at once, so a slow disk never holds a request open.
"""

from __future__ import annotations

import os
import threading
import time
from collections.abc import Callable
from pathlib import Path

TTL_S = 300.0
_MAX_ENTRIES = 16


class AuditCache:
    """Results of ``run_audit`` by project, tool and home folder."""

    def __init__(self, ttl_s: float = TTL_S, clock: Callable[[], float] = time.monotonic) -> None:
        self._ttl_s = ttl_s
        self._clock = clock
        self._lock = threading.Lock()
        self._items: dict[tuple, tuple[float, dict]] = {}
        self._key_locks: dict[tuple, threading.Lock] = {}
        self._jobs: dict[tuple, dict] = {}
        self._errors: dict[tuple, str] = {}

    def source_paths(self) -> set[str]:
        """Comparison keys of the files that the kept scans found."""
        from ..context_audit import _path_key

        with self._lock:
            results = [result for _stored, result in self._items.values()]
        return {_path_key(source["path"]) for result in results for source in result.get("sources", []) if source.get("path")}

    def poll(self, project: str | Path, tool: str | None = None, *, refresh: bool = False) -> dict:
        """The audit if it is ready, otherwise what is running now. Never waits for a scan.

        While it runs the answer is ``{"status": "scanning", "step": name, "elapsed_s": n}``.
        A later call without *refresh* collects the result, or ``{"error": text}`` once.
        """
        key = self._key(project, tool)
        if not refresh and (hit := self._fresh(key)) is not None:
            return hit
        with self._lock:
            job = self._jobs.get(key)
            if job is None:
                error = self._errors.pop(key, None)
                if error is not None and not refresh:
                    return {"error": error}
                job = {"step": "starting", "started": self._clock()}
                self._jobs[key] = job
                threading.Thread(target=self._run_job, args=(key, job, project, tool), daemon=True).start()
        return {"status": "scanning", "step": job["step"], "elapsed_s": round(self._clock() - job["started"], 1)}

    def _run_job(self, key: tuple, job: dict, project: str | Path, tool: str | None) -> None:
        def progress(step: str) -> None:
            job["step"] = step

        try:
            self.get(project, tool, refresh=True, progress=progress)
        except Exception as exc:  # noqa: BLE001 - the panel shows this instead of waiting for ever
            with self._lock:
                self._errors[key] = f"{type(exc).__name__}: {exc}"
        finally:
            with self._lock:
                self._jobs.pop(key, None)

    @staticmethod
    def _key(project: str | Path, tool: str | None) -> tuple:
        return (str(Path(project).expanduser().resolve()), tool or "", os.environ.get("HOME", ""))

    def get(
        self,
        project: str | Path,
        tool: str | None = None,
        *,
        refresh: bool = False,
        progress: Callable[[str], None] | None = None,
    ) -> dict:
        """The cached audit, or a new one when none is fresh or *refresh* is set.

        Requests for the same key wait for one run; other keys and other
        routes are not held up.
        """
        from .. import context_audit  # looked up here so a test can replace run_audit

        key = self._key(project, tool)
        if not refresh and (hit := self._fresh(key)) is not None:
            return hit
        arrived = self._clock()
        with self._lock:
            key_lock = self._key_locks.setdefault(key, threading.Lock())
        with key_lock:
            # A request that waited for another run reuses its result. A refresh does so only
            # when that run finished after the refresh was asked for.
            hit = self._fresh(key)
            if hit is not None and (not refresh or self._stored_at(key) > arrived):
                return hit
            if progress is None:
                result = context_audit.run_audit(project, tool)
            else:
                result = context_audit.run_audit(project, tool, progress=progress)
            with self._lock:
                if len(self._items) >= _MAX_ENTRIES and key not in self._items:
                    oldest = min(self._items, key=lambda k: self._items[k][0])
                    del self._items[oldest]
                    self._key_locks.pop(oldest, None)
                self._items[key] = (self._clock(), result)
            return result

    def _fresh(self, key: tuple) -> dict | None:
        with self._lock:
            item = self._items.get(key)
        if item is not None and self._clock() - item[0] < self._ttl_s:
            return item[1]
        return None

    def _stored_at(self, key: tuple) -> float:
        with self._lock:
            item = self._items.get(key)
        return item[0] if item is not None else float("-inf")

    def clear(self) -> None:
        with self._lock:
            self._items.clear()
            self._errors.clear()


AUDIT_CACHE = AuditCache()
