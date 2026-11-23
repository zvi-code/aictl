# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Whether a session runs or has ended, from evidence, and the words that say why.

The stored path (board projection) and the live path (runtime agents) both decide with
:func:`assess`, so a session reads the same in both:

1. A bound process that is alive: the session runs, whatever its last activity time.
2. An end that was observed (``END_OBSERVED``) and no activity after it: the session ended.
3. Activity within the idle window and no process: the session counts as live, and the
   evidence says that no process was seen.
4. Otherwise the session ended, inferred from the idle window (``end_reason="idle"``).
"""

from __future__ import annotations

import time
from collections.abc import Iterable
from dataclasses import dataclass

IDLE_END_S = 900.0
# Lines a tool writes just after it reported its end do not reopen the session.
END_GRACE_S = 5.0

# end_reason values stored in sessions.end_reason. Empty: not ended.
HOOK = "hook"  # the tool's hook reported the end (SessionEnd)
TRANSCRIPT = "transcript"  # the tool's own session log recorded the end (Copilot session.shutdown)
PROCESS_EXIT = "process_exit"  # the bound process was seen to exit
SWITCHED = "switched"  # the bound process moved on to another session (Claude /clear)
IDLE = "idle"  # no activity for the idle window and no bound process: inferred, not observed
END_OBSERVED = frozenset({HOOK, TRANSCRIPT, PROCESS_EXIT, SWITCHED})
END_REASONS = (HOOK, TRANSCRIPT, PROCESS_EXIT, SWITCHED, IDLE)


@dataclass(frozen=True, slots=True)
class Lifecycle:
    live: bool
    end_reason: str  # "" while live
    evidence: str

    @property
    def inferred(self) -> bool:
        return self.end_reason == IDLE


def clock(ts: float, now: float | None = None) -> str:
    """Local wall-clock time of *ts*; the date is added when it is not today."""
    moment = time.localtime(ts)
    today = time.localtime(now if now is not None else time.time())
    if moment[:3] == today[:3]:
        return time.strftime("%H:%M", moment)
    return time.strftime("%b %d %H:%M", moment)


def _minutes(seconds: float) -> str:
    minutes = max(0, int(seconds // 60))
    if minutes < 1:
        return "under 1 min"
    if minutes < 120:
        return f"{minutes} min"
    return f"{minutes // 60} h"


def process_words(pids: Iterable[int]) -> str:
    ordered = sorted({int(pid) for pid in pids})
    if len(ordered) == 1:
        return f"process {ordered[0]} running"
    shown = ", ".join(str(pid) for pid in ordered[:3]) + (" ..." if len(ordered) > 3 else "")
    return f"processes {shown} running"


def end_words(reason: str, ended_at: float | None, now: float, idle_window: float = IDLE_END_S) -> str:
    if reason == HOOK:
        return "tool reported end"
    if reason == TRANSCRIPT:
        return "tool reported end in its session log"
    if reason == PROCESS_EXIT:
        return f"process exited {clock(ended_at, now)}" if ended_at else "process exited"
    if reason == SWITCHED:
        return "process moved to another session"
    return f"no activity for {int(idle_window // 60)} min (inferred)"


def ended_by_fact(ended_at: float | None, end_reason: str, last_activity: float) -> bool:
    """An observed end that no later activity has overtaken."""
    return bool(ended_at) and end_reason in END_OBSERVED and last_activity <= float(ended_at) + END_GRACE_S


def assess(
    *,
    now: float,
    pids: Iterable[int] = (),
    last_activity: float = 0.0,
    ended_at: float | None = None,
    end_reason: str = "",
    matched_by: str = "",
    idle_window: float = IDLE_END_S,
) -> Lifecycle:
    alive = sorted({int(pid) for pid in pids if pid})
    if alive:
        words = process_words(alive)
        if matched_by == "project":
            words += " (matched by project)"
        return Lifecycle(True, "", words)
    if ended_by_fact(ended_at, end_reason, last_activity):
        return Lifecycle(False, end_reason, end_words(end_reason, ended_at, now, idle_window))
    if last_activity and now - last_activity < idle_window:
        return Lifecycle(True, "", f"no process seen; last activity {_minutes(now - last_activity)} ago")
    return Lifecycle(False, IDLE, end_words(IDLE, None, now, idle_window))
