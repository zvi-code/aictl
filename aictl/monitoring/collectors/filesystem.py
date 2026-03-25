"""File activity monitoring via watchdog."""

from __future__ import annotations

import asyncio
from pathlib import Path

from .base import BaseCollector
from ..config import MonitorConfig
from ..events import EventKind, UnifiedEvent


class WatchdogFileCollector(BaseCollector):
    """Watch project and state directories for file activity."""

    name = "filesystem:watchdog"

    def __init__(self, config: MonitorConfig) -> None:
        self.config = config

    async def run(self, emit) -> None:
        try:
            from watchdog.events import FileSystemEventHandler
            from watchdog.observers import Observer
        except ImportError:
            await self.emit_status(
                emit,
                status="disabled",
                mode="missing-dependency",
                detail="Install watchdog or use aictl[monitor]",
            )
            return

        watch_paths = [path for path in (*self.config.workspace_paths, *self.config.state_paths) if path.exists()]
        if not watch_paths:
            await self.emit_status(
                emit,
                status="disabled",
                mode="no-paths",
                detail="No workspace or state paths exist on disk",
            )
            return

        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[UnifiedEvent] = asyncio.Queue()
        handler = _WatchHandler(loop=loop, queue=queue, config=self.config)
        observer = Observer()
        for path in watch_paths:
            observer.schedule(handler, str(path), recursive=True)
        observer.start()

        await self.emit_status(
            emit,
            status="active",
            mode="native-fs-events",
            detail=f"Watching {len(watch_paths)} paths for edits and growth",
        )

        try:
            while True:
                await emit(await queue.get())
        except asyncio.CancelledError:
            raise
        finally:
            observer.stop()
            observer.join(timeout=2.0)


class _WatchHandler:  # pragma: no cover - exercised through watchdog integration
    def __init__(self, *, loop, queue: asyncio.Queue[UnifiedEvent], config: MonitorConfig) -> None:
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
            UnifiedEvent(
                kind=EventKind.FILE_ACTIVITY,
                source="filesystem:watchdog",
                tool_hint=_tool_hint_for_path(path),
                workspace=workspace,
                metrics={"growth_bytes": growth_bytes, "size_bytes": size_bytes},
                payload={"path": path, "event_type": event_type},
            ),
        )


def _tool_hint_for_path(path: str) -> str | None:
    lowered = path.lower()
    if "/.vscode/" in lowered or "\\.vscode\\" in lowered:
        return "copilot-vscode"
    if "/.copilot/" in lowered or "\\.copilot\\" in lowered or "github/copilot" in lowered:
        return "copilot-cli"
    if "/.claude/" in lowered or "\\.claude\\" in lowered or lowered.endswith("claude.md"):
        return "claude-code"
    if "/.codex/" in lowered or "\\.codex\\" in lowered:
        return "codex-cli"
    return None
