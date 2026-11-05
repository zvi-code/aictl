# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Adaptive collection pace: full speed while someone watches or a tool works.

Polling collectors multiply their interval by :meth:`Pace.factor`. Push sources
(hooks, OTel, file events) are not affected, so no event is lost by slowing down.
"""

from __future__ import annotations

import threading
import time

# Interval multiplier with no dashboard client and no recent tool activity.
IDLE_FACTOR = 6
# Seconds after the last file event during which tools count as active.
ACTIVITY_WINDOW_S = 120.0


class Pace:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._clients = 0
        self._last_activity = 0.0

    def client_connected(self) -> None:
        with self._lock:
            self._clients += 1

    def client_disconnected(self) -> None:
        with self._lock:
            self._clients = max(0, self._clients - 1)

    def note_activity(self, now: float | None = None) -> None:
        self._last_activity = time.time() if now is None else now

    def factor(self, now: float | None = None) -> int:
        now = time.time() if now is None else now
        with self._lock:
            watched = self._clients > 0
        return 1 if watched or now - self._last_activity < ACTIVITY_WINDOW_S else IDLE_FACTOR


PACE = Pace()
