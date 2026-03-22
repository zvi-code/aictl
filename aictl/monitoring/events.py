# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Data models for live monitoring."""

from __future__ import annotations

from dataclasses import dataclass


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
