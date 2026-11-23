# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""What a subagent is called, which call started it, and whether it still runs.

A subagent's name is, in order: the description its tool stored for it, the description its
caller gave the Agent/Task call that started it, its agent type with a short id, or "Subagent"
with a short id. Its prompt is never the name. The call that started it is known only from the
tool-use id the tool recorded for it in the same session; without one it stays unknown.

Its status comes from its own transcript, not from the ``completed`` flag alone and not from
its parent's activity:

1. The parent session is not live: the subagent ended, by its own final reply or else with its parent.
2. A permission prompt waits: waiting.
3. Its newest tool call has no result yet: running, waiting for that call.
4. It wrote a line within ``QUIET_AFTER_S``: running.
5. Its last line is a final reply (``completed``) and it has been quiet since: ended.
6. Quiet for less than ``idle_window``: idle (live, but nothing written).
7. Otherwise ended, inferred from the idle window.

With no line and no start time at all, the status is "unknown", never "ended".
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable, Mapping
from typing import TypeVar

from .. import session_lifecycle
from .projection_utils import _one_line

K = TypeVar("K", bound=Hashable)

QUIET_AFTER_S = 120.0
NAME_CHARS = 80
PROMPT_LINE_CHARS = 140
NOW_CHARS = 140
# The longest text read as an agent type or role rather than as a prompt.
ROLE_CHARS = 48

_ENDED_WORDS = {"completed", "complete", "done", "finished", "succeeded", "success"}
_FAILED_WORDS = {"failed", "error", "errored", "killed", "cancelled", "canceled", "aborted"}


def _norm(text: str | None) -> str:
    return " ".join((text or "").split())


def match_spawns(subs: Mapping[K, dict], spawns: Iterable[dict]) -> dict[K, dict]:
    """The Agent/Task call that started each subagent, from evidence only.

    A subagent's spawning call is the call of its own session whose tool-use id the subagent
    row records (``parent_tool_use_id``: Claude Code's ``meta.json`` ``toolUseId``, Copilot CLI's
    ``toolCallId``). A subagent without that link, or whose link names no call of its session,
    has no known spawning call: it is never matched by start time or by prompt text.
    """
    by_use = {(s.get("session_id") or "", s["spawn_tool_use_id"]): s for s in spawns if s.get("spawn_tool_use_id")}
    used: set[tuple[str, str]] = set()
    found: dict[K, dict] = {}
    for key, sub in subs.items():
        use = (sub.get("session_id") or "", sub.get("parent_tool_use_id") or "")
        if use[1] and use in by_use and use not in used:
            found[key] = by_use[use]
            used.add(use)
    return found


def _role(task: str | None, first_prompt: str | None, task_is_prompt: bool) -> str:
    """The stored task when it reads as an agent's role (Copilot's agent name), not as a prompt."""
    text = _norm(task)
    if not text or task_is_prompt or len(text) > ROLE_CHARS:
        return ""
    if first_prompt and _norm(first_prompt).startswith(text):
        return ""
    return text


def subagent_name(sub: Mapping, spawn: Mapping | None, short: str, first_prompt: str | None = None,
                  *, task_is_prompt: bool = False) -> tuple[str, str]:
    """(name, where it came from) for one subagent."""
    if own := _one_line(sub.get("description"), NAME_CHARS):
        return own, "description"
    if spawn and (called := _one_line(spawn.get("description"), NAME_CHARS)):
        return called, "caller"
    role = _one_line(spawn.get("agent_type"), ROLE_CHARS) if spawn else ""
    role = role or _role(sub.get("task"), first_prompt, task_is_prompt)
    if role:
        return f"{role} {short}".strip(), "agent type"
    return f"Subagent {short}".strip(), "id"


def prompt_line(text: str | None) -> str | None:
    """The first non-empty line of a prompt, for secondary text."""
    for line in (text or "").splitlines():
        if line.strip():
            return _one_line(line, PROMPT_LINE_CHARS)
    return None


def _ago(seconds: float) -> str:
    seconds = max(0.0, seconds)
    if seconds < 90:
        return f"{int(seconds)} s"
    if seconds < 5400:
        return f"{int(seconds // 60)} min"
    return f"{int(seconds // 3600)} h"


def subagent_status(*, now: float, parent_live: bool, parent_evidence: str, parent_end_reason: str,
                    sub: Mapping, last_line: float | None, pending: bool = False, looping: bool = False,
                    failed: bool = False, idle_window: float = session_lifecycle.IDLE_END_S) -> tuple[str, str, str]:
    """(status, evidence, end_reason) of one subagent. end_reason is "" while it is live."""
    stored = _norm(sub.get("agent_status")).lower()
    started = sub.get("started_at")
    if stored in _FAILED_WORDS:
        return "failed", f"tool recorded {stored}", session_lifecycle.TRANSCRIPT
    if stored in _ENDED_WORDS:
        return "ended", f"tool recorded {stored}", session_lifecycle.TRANSCRIPT
    if not last_line and not started:
        return "unknown", "no transcript lines imported for this subagent yet", ""
    last = float(last_line or started)
    quiet = now - last
    # agents.completed only says the newest imported line is an assistant line; say no more than that.
    finished = (f"finished: its last recorded line ({session_lifecycle.clock(last, now)}) is the assistant's, "
                "nothing recorded since")
    if not parent_live:
        # Its own end comes first; the parent's end only closes a subagent that had not ended by itself.
        if sub.get("completed"):
            return "ended", finished, session_lifecycle.TRANSCRIPT
        words = f"parent session ended ({parent_evidence})" if parent_evidence else "parent session ended"
        return ("failed" if failed else "ended"), words, parent_end_reason or session_lifecycle.IDLE
    if pending:
        return "waiting", f"waiting for a confirmation; last line {_ago(quiet)} ago", ""
    call_ts = sub.get("last_call_ts")
    if sub.get("last_call_open") and call_ts and float(call_ts) >= last - 1.0 and now - float(call_ts) < idle_window:
        name = _one_line(sub.get("last_call_name"), 40) or "tool"
        return "running", (f"waiting for its {name} call to return, started "
                           f"{session_lifecycle.clock(float(call_ts), now)} ({_ago(now - float(call_ts))} ago)"), ""
    if quiet < QUIET_AFTER_S:
        return ("looping" if looping else "running"), f"last line {_ago(quiet)} ago", ""
    if sub.get("completed"):
        return "ended", finished, session_lifecycle.TRANSCRIPT
    if quiet < idle_window:
        return "idle", f"no line for {_ago(quiet)}; its last line is not a final reply", ""
    return ("failed" if failed else "ended"), session_lifecycle.end_words(
        session_lifecycle.IDLE, None, now, idle_window), session_lifecycle.IDLE


def now_text(sub: Mapping, status: str) -> str | None:
    """What a live subagent does: its newest tool call and that call's target."""
    if status not in ("running", "waiting", "looping") or not sub.get("last_call_name"):
        return None
    target = _one_line(sub.get("last_call_target"), NOW_CHARS)
    return f"{sub['last_call_name']} {target}".strip()
