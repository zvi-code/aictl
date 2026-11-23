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

# sessions.source of a row written from process evidence (a bound process family) before the
# tool's own records arrived. It fills empty fields only; the transcript's source replaces it.
PROCESS_SOURCE = "process"
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


# What a tool's own session file or log says the session is doing, as a status.
_NATIVE_STATUS = {"working": "running", "running": "running", "idle": "idle", "waiting": "waiting"}

# The evidence a status rests on, in the order session_status consults it.
BASIS_SESSION_FILE = "session file"  # a live process, and the tool's own file reports its activity
BASIS_PROCESS = "live process"  # a live process; its activity is read from the time of the last line
BASIS_LAST_ACTIVITY = "last activity"  # no process seen; the time of the last line decides
BASIS_END = "end record"  # an end that was observed
BASIS_IDLE_WINDOW = "idle window"  # no process and no activity for the idle window: an inferred end


@dataclass(frozen=True, slots=True)
class SessionStatus:
    """The one status of a session, the evidence that decided it, and the kind of that evidence.

    ``evidence`` is ``"<process part>; <activity part>"`` while a process is seen, so a reader
    that knows the process from elsewhere can pair its own process words with ``activity``.
    """

    status: str  # running | waiting | looping | idle | unknown | ended | failed
    evidence: str
    basis: str
    end_reason: str  # "" while live
    activity: str  # the activity part of the evidence alone
    live: bool

    @property
    def inferred(self) -> bool:
        return self.end_reason == IDLE


def session_status(
    *,
    now: float,
    pids: Iterable[int] = (),
    native_activity: str | None = None,
    native_source: str = "session file",
    last_activity: float | None = None,
    ended_at: float | None = None,
    end_reason: str = "",
    matched_by: str = "",
    idle_window: float = IDLE_END_S,
    pending: bool = False,
    looping: bool = False,
    turn_ended: bool = False,
    failed: bool = False,
    assume_process: bool = False,
) -> SessionStatus:
    """The status of a session, from the evidence in this order; every panel and the drawer use it.

    1. Not live by :func:`assess` (an observed end, or no process and no activity for the idle
       window): ``ended``, or ``failed`` when its last call failed.
    2. A tool call waiting to return: ``waiting``. A loop at the end of the session: ``looping``.
    3. A live process and the tool's own file reports the activity: that activity.
    4. A live process and a known last activity: ``running`` within the idle window and while
       the last turn has not ended, else ``idle``. With no known last activity: ``unknown``.
    5. No process seen and activity within the idle window: ``running``, or ``idle`` when the
       last turn ended.

    ``assume_process`` decides as if a process were seen without naming it: the history of a
    session states what its status is once the runtime report shows its process.
    """
    alive = sorted({int(pid) for pid in pids if pid})
    seen = float(last_activity or 0.0)
    life = assess(now=now, pids=alive or ([1] if assume_process else ()), last_activity=seen, ended_at=ended_at,
                  end_reason=end_reason, matched_by=matched_by, idle_window=idle_window)
    if not life.live:
        basis = BASIS_END if life.end_reason in END_OBSERVED else BASIS_IDLE_WINDOW
        return SessionStatus("failed" if failed else "ended", life.evidence, basis, life.end_reason, life.evidence, False)
    process = bool(alive) or assume_process
    head = (process_words(alive) + (" (matched by project)" if matched_by == "project" else "")) if alive else ""
    native = _NATIVE_STATUS.get(str(native_activity or ""))
    recent = bool(seen) and now - seen < idle_window
    if process and native:
        status, basis, activity = native, BASIS_SESSION_FILE, f"{native_source} reports {native}"
    elif process and seen:
        status = "running" if recent and not turn_ended else "idle"
        basis, activity = BASIS_PROCESS, f"last activity {clock(seen, now)}" + ("; its last turn ended" if turn_ended and recent else "")
    elif process:
        status, basis, activity = "unknown", BASIS_PROCESS, "activity unknown"
    else:
        status = "idle" if turn_ended else "running"
        basis, activity = BASIS_LAST_ACTIVITY, life.evidence.split("; ", 1)[1]
        head = "no process seen"
    if pending:
        status = "waiting"
    elif looping and status in ("running", "idle", "unknown"):
        status = "looping"
    evidence = f"{head}; {activity}" if head else activity
    return SessionStatus(status, evidence, basis, "", activity, True)
