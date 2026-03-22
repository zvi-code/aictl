# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""File activity monitoring via watchdog."""

from __future__ import annotations

import asyncio
from pathlib import Path

from .base import BaseCollector
from ..config import MonitorConfig
from ...data.schema import metric_name as M


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
