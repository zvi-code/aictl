"""Collector base classes."""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable

from ..events import EventKind, UnifiedEvent


EmitFn = Callable[[UnifiedEvent], Awaitable[None]]


class BaseCollector(ABC):
    """Async collector base."""

    name = "collector"

    @abstractmethod
    async def run(self, emit: EmitFn) -> None:
        """Emit events until cancelled."""

    async def emit_status(
        self,
        emit: EmitFn,
        *,
        status: str,
        mode: str,
        detail: str,
    ) -> None:
        await emit(
            UnifiedEvent(
                kind=EventKind.COLLECTOR_STATUS,
                source=self.name,
                metrics={"status": status, "mode": mode, "detail": detail},
            )
        )

    async def sleep(self, seconds: float) -> None:
        await asyncio.sleep(seconds)
