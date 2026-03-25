"""Unified event model for live monitoring."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class EventKind(StrEnum):
    PROCESS_START = "process.start"
    PROCESS_SAMPLE = "process.sample"
    PROCESS_EXIT = "process.exit"
    NETWORK_SAMPLE = "network.sample"
    FILE_ACTIVITY = "file.activity"
    TELEMETRY = "telemetry"
    COLLECTOR_STATUS = "collector.status"


@dataclass(slots=True, frozen=True)
class ProcessInfo:
    """Normalized process details shared across collectors."""

    pid: int
    ppid: int | None
    name: str
    exe: str | None = None
    cmdline: tuple[str, ...] = ()
    username: str | None = None
    cwd: str | None = None


@dataclass(slots=True)
class UnifiedEvent:
    """A platform-independent monitoring event."""

    kind: EventKind
    source: str
    ts: float = field(default_factory=time.time)
    pid: int | None = None
    process: ProcessInfo | None = None
    tool_hint: str | None = None
    workspace: str | None = None
    metrics: dict[str, float | int | bool | str] = field(default_factory=dict)
    payload: dict[str, Any] = field(default_factory=dict)
