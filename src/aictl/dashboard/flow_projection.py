"""Build session flow and transcript views."""

from __future__ import annotations

import bisect
import json
import threading
import time
from collections import defaultdict
from collections.abc import Callable
from typing import Any

from ..stores import reader_feature
from ..utils import estimate_tokens_from_size
from .projection_utils import AGENT_SEPARATOR, _is_reported_history, _one_line, _resolve_agent, _usd, mask_secrets
from .projections.history import (
    HistoryScope,
    capture_mode,
    text_floor,
)
from .session_details import _median

MAX_FLOW_EVENTS = 5000


FLOW_DEFAULT_EVENTS = 500


FLOW_TARGET_CHARS = 300


FLOW_MATCH_S = 2.0


FLOW_SESSION_MATCH_S = 60.0


FLOW_PREVIEW_CHARS = 200


ACTION_SUMMARY_CHARS = 200


REPLY_NOT_KEPT = "The reply text is not kept"


# Tables that keep the text of a conversation, both sides, for the tools whose ingesters read it.
_MESSAGE_TABLES = ("copilot_session_messages", "vscode_chat_messages", "cursor_session_messages")


_FLOW_ORDER = {"session_start": 0, "user_message": 1, "subagent": 2, "task_prompt": 2.5, "api_call": 3, "api_response": 4, "tool_use": 5, "error": 6}


_FLOW_MARKERS = frozenset({"session_start", "session_end"})


_EMPTY = (None, "", [], {})


# The store keeps the model calls and tool calls of hooks and OpenTelemetry as rows of its own,
# so a legacy one of these that matches no row is the same call at another time stamp.
_STORE_COUNTED = frozenset({"api_call", "tool_use"})


def _zero_tokens() -> dict:
    return {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0}


def _store_flow_events(conn: Any | None, sid: str, since: float, until: float, *, keep_text: bool = True,
                       text_floor: float = 0.0, facts: dict[str, list[tuple]] | None = None) -> tuple[list[dict], bool]:
    """Stored events and whether the native transcript supplied message authorship in this range."""
    from .session_flow import _input_preview

    def rows(kind):
        return facts.get(kind, [])

    def one(kind):
        return next(iter(rows(kind)), None)

    session = one("session")
    tool = (session[0] if session else "") or ""
    if not tool:
        row = one("tool")
        tool = row[0] if row else ""
    events: list[dict] = []

    def inside(ts: float | None) -> bool:
        return bool(ts) and since <= ts < until

    if session and inside(session[2]):
        events.append({"ts": session[2], "type": "session_start", "tool": tool, "cwd": session[1] or "", "source": "store"})
    if session and inside(session[3]):
        events.append({"ts": session[3], "type": "session_end", "tool": tool, "source": "store"})

    task_prompts: dict[str, str] = {}
    prompts: list[tuple[float, str]] = []
    for ts, aid, text in rows("prompt"):
        if aid:
            task_prompts.setdefault(aid, mask_secrets(text))
        else:
            prompts.append((ts, mask_secrets(text)))
    if not prompts:
        messages = facts.get("user", [])
        prompts = [(ts, mask_secrets(text)) for ts, text, _model in messages]
    prompt_info: list[dict] = [{} for _ in prompts]
    native_authorship = False
    native = rows("native")
    # The task a subagent received, from its own transcript: (ts, text, step_key, text_status) by agent.
    agent_tasks: dict[str, tuple[float, str, str, str]] = {}
    if native:
        native_authorship = True
        prompts, prompt_info = [], []
        for row in native:
            ts, kind, role, key, turn, status, text = row[:7]
            agent = row[7] if len(row) > 7 else ""
            if kind == "agent_prompt" and role == "user" and agent:
                agent_tasks.setdefault(agent, (ts, text or "", key, status))
                continue
            if kind != "message" or role != "user":
                continue
            prompts.append((ts, text or ""))
            if not keep_text:
                status = "withheld"
            elif not text and status in ("captured", "truncated"):
                status = "expired"
            prompt_info.append({"step_key": key, "turn_id": turn, "text_status": status, "source": "user.message"})
    for (ts, text), info in zip(prompts, prompt_info, strict=True):
        if not keep_text or ts < text_floor:
            text = ""
        message = {
            "ts": ts,
            "type": "user_message",
            "from": "user",
            "to": tool,
            "message": text,
            "preview": text[:FLOW_PREVIEW_CHARS],
            "redacted": not text,
            "tokens": _zero_tokens(),
            "model": "",
            "api_calls": 0,
            "duration_ms": 0,
            "end_ts": ts,
            "source": "store",
            **info,
        }
        if text:
            message["prompt_length"] = len(text)
        events.append(message)

    for row in rows("call"):
        ts, aid, model, i, o, cr, cw, cost, duration, ttft, finish, is_error, error_type, status = row[:14]
        # Columns added after the first fourteen: read only when the view returns them.
        request_bytes, thinking_chars, reasoning_tokens = (*row[14:17], None, None, None)[:3]
        call = {
            "ts": ts,
            "type": "api_call",
            "from": tool,
            "to": "api",
            "model": model or "",
            # A count the source did not report stays None: the page says unknown, never 0.
            "tokens": {"input": i, "output": o, "cache_read": cr, "cache_creation": cw},
            "duration_ms": duration,
            "is_error": bool(is_error),
            "source": "store",
        }
        for key, value in (("ttft_ms", ttft), ("cost_usd", _usd(cost) if cost else None), ("finish_reason", finish), ("agent_id", aid),
                           ("request_bytes", request_bytes), ("thinking_chars", thinking_chars), ("reasoning_tokens", reasoning_tokens)):
            if value not in _EMPTY and value != 0:
                call[key] = value
        if is_error:
            call["error_type"] = error_type or ""
            if status:
                call["http_status"] = status
        events.append(call)

    for row in rows("use"):
        ts, aid, name, target, raw_input, result, duration, is_error, exit_code, confirm = row[:10]
        input_bytes, output_bytes, confirm_wait = (*row[10:13], None, None, None)[:3]
        use = {"ts": ts, "type": "tool_use", "from": tool, "to": name or "", "success": not is_error, "duration_ms": duration, "source": "store"}
        if target:
            use["target"] = _one_line(target, FLOW_TARGET_CHARS)
        try:
            args = json.loads(raw_input) if raw_input else None
        except ValueError:
            args = None
        if isinstance(args, dict) and args:
            masked = {k: mask_secrets(v) if isinstance(v, str) else v for k, v in args.items()}
            use["params"] = json.dumps(masked, ensure_ascii=False)
            use["input_preview"] = _input_preview(masked)
        if result:
            use["result_summary"] = mask_secrets(result)
        for key, value in (("exit_code", exit_code), ("confirm", confirm), ("agent_id", aid),
                           ("input_bytes", input_bytes), ("output_bytes", output_bytes)):
            if value not in _EMPTY:
                use[key] = value
        if output_bytes is not None:
            # An estimate from the result's size, never a count: the field name says so.
            use["result_tokens_est"] = estimate_tokens_from_size(int(output_bytes))
        if confirm_wait:
            use["confirm_wait_ms"] = confirm_wait
        events.append(use)

    # What the transcript says each subagent ended with: its subagent.completed or subagent.failed step.
    outcomes = {aid: phase for _ts, kind, _name, phase, aid, *_rest in rows("step") if kind == "agent" and aid and phase in _AGENT_OUTCOMES}
    for aid, task, model, started, ended, completed in rows("agent"):
        label = task or "subagent"
        if inside(started):
            start = {"ts": started, "type": "subagent", "from": tool, "to": label, "agent_id": aid, "source": "store"}
            if model:
                start["model"] = model
            if task_prompts.get(aid):
                start["prompt"] = task_prompts[aid]
            events.append(start)
            task = _task_prompt(aid, started, agent_tasks.get(aid), task_prompts.get(aid), keep_text=keep_text, text_floor=text_floor)
            if task:
                events.append(task)
        if inside(ended):
            outcome = outcomes.get(aid) or ("completed" if completed else "not reported")
            end = {"ts": ended, "type": "subagent_end", "from": label, "to": tool, "agent_id": aid,
                   "completed": outcome == "completed", "outcome": outcome, "source": "store"}
            if outcome == "failed":
                end["is_error"] = True
            if started and ended >= started:
                end["duration_ms"] = round((ended - started) * 1000)
            events.append(end)

    compactions = rows("compaction")
    numbered = compactions
    for n, ts, aid, trigger, before, after, took in numbered:
        if not inside(ts):
            continue
        compaction = {"ts": ts, "type": "compaction", "compaction_count": n, "duration_ms": took, "source": "store"}
        if took:
            compaction["end_ts"] = ts + took / 1000
        for key, value in (("trigger", trigger), ("before_tokens", before), ("after_tokens", after), ("agent_id", aid)):
            if value not in _EMPTY:
                compaction[key] = value
        events.append(compaction)

    for ts, kind, name, phase, aid, turn_id, used, capacity, before, after, estimated, source in rows("step"):
        if kind == "agent":
            continue  # read above as the outcome of a subagent; its start and end are the agent rows
        event = {"ts": ts, "type": {"context": "context_update", "skill": "skill_event"}.get(kind, kind),
                 "name": name, "phase": phase, "source": source, "agent_id": aid, "turn_id": turn_id}
        event.update({k: v for k, v in (("context_tokens", used), ("context_limit", capacity),
                                        ("before_tokens", before), ("after_tokens", after), ("estimated", estimated)) if v is not None})
        events.append(event)

    messages = facts.get("assistant", [])
    for ts, text, model in messages:
        reply = mask_secrets(text)
        events.append(
            {
                "ts": ts,
                "type": "api_response",
                "from": "api",
                "to": tool,
                "model": model or "",
                "response": reply,
                "response_preview": reply[:FLOW_PREVIEW_CHARS],
                "source": "store",
            }
        )
    return events, native_authorship


_AGENT_OUTCOMES = frozenset({"completed", "failed"})


def _task_prompt(aid: str, started: float, native: tuple[float, str, str, str] | None, stored: str | None, *,
                 keep_text: bool, text_floor: float) -> dict | None:
    """The task a subagent received, as the first step of its span: from its own transcript, else from
    the prompt its main agent stored for it. None when neither reports one."""
    if native is None and not stored:
        return None
    ts, text, key, status = native if native is not None else (started, stored or "", "", "captured")
    text = mask_secrets(text)
    length = len(text)
    if not keep_text or ts < text_floor:
        status, text = ("withheld" if not keep_text else "expired"), ""
    elif not text and status in ("captured", "truncated"):
        status = "expired"
    task = {"ts": max(ts, started), "type": "task_prompt", "from": "parent", "to": aid, "agent_id": aid,
            "message": text, "preview": text[:FLOW_PREVIEW_CHARS], "redacted": not text, "text_status": status,
            "source": "user.message" if native is not None else "store"}
    if length:
        task["prompt_length"] = length
    if key:
        task["step_key"] = key
    return task


def _link_spawns(events: list[dict]) -> None:
    """Give a tool call that started a subagent the subagent's id (``spawned_agent_id``), and the
    subagent start the parent call's time (``spawned_by_ts``). A call is the one of the same agent whose
    run contains the subagent's start, within FLOW_MATCH_S."""
    calls = [e for e in events if e["type"] == "tool_use"]
    taken: set[int] = set()
    for start in (e for e in events if e["type"] == "subagent" and e.get("agent_id")):
        best = None
        for call in calls:
            if id(call) in taken or (call.get("agent_id") or "") == start.get("agent_id"):
                continue
            begin, end = call["ts"] - FLOW_MATCH_S, call["ts"] + (call.get("duration_ms") or 0) / 1000 + FLOW_MATCH_S
            if begin <= start["ts"] <= end and (best is None or abs(call["ts"] - start["ts"]) < abs(best["ts"] - start["ts"])):
                best = call
        if best is not None:
            taken.add(id(best))
            best["spawned_agent_id"] = start["agent_id"]
            start["spawned_by_ts"] = best["ts"]


def _legacy_flow_events(legacy: dict) -> tuple[list[dict], str]:
    """The events of a legacy session flow, with the tools of a hook turn as events of their own."""
    source = (legacy.get("summary") or {}).get("source") or "hooks"
    out: list[dict] = []
    for turn in legacy.get("turns") or []:
        event = {**turn, "source": source}
        for tool_use in event.pop("tools", None) or []:
            ts = tool_use.get("ts") or event["ts"]
            if tool_use.get("is_agent"):
                out.append({"ts": ts, "type": "subagent", "to": tool_use.get("agent_type") or "subagent", "prompt": tool_use.get("args_summary") or "", "source": source})
                continue
            use = {"ts": ts, "type": "tool_use", "to": tool_use.get("name") or "tool", "duration_ms": tool_use.get("duration_ms") or 0, "source": source}
            for key in ("input_preview", "result_summary"):
                if tool_use.get(key):
                    use[key] = tool_use[key]
            if tool_use.get("args_summary"):
                use["target"] = tool_use["args_summary"]
            out.append(use)
        out.append(event)
    return out, source


def _match_key(event: dict) -> tuple:
    return (event.get("type"), event.get("to") or "") if event.get("type") == "tool_use" else (event.get("type"),)


def _merge_flow(store: list[dict], legacy: list[dict]) -> list[dict]:
    """Store events with the legacy events added. A legacy event of the same kind within
    FLOW_MATCH_S of a store event is the same event: it fills the fields the store lacks.
    A legacy model call or tool call that matches nothing is added only when the store has
    none of that kind."""
    index: dict[tuple, list[dict]] = defaultdict(list)
    for event in store:
        index[_match_key(event)].append(event)
    for group in index.values():
        group.sort(key=lambda e: e["ts"])
    times = {key: [e["ts"] for e in group] for key, group in index.items()}
    taken: set[int] = set()
    store_kinds = {e["type"] for e in store}
    merged = list(store)
    for event in legacy:
        key = _match_key(event)
        group, ts_list = index.get(key, []), times.get(key, [])
        window = FLOW_SESSION_MATCH_S if event.get("type") in _FLOW_MARKERS else FLOW_MATCH_S
        at = bisect.bisect_left(ts_list, event["ts"])
        best = None
        for j in (at - 1, at):
            if 0 <= j < len(group) and id(group[j]) not in taken and abs(group[j]["ts"] - event["ts"]) <= window:
                if best is None or abs(group[j]["ts"] - event["ts"]) < abs(best["ts"] - event["ts"]):
                    best = group[j]
        if best is None:
            if event.get("type") in _STORE_COUNTED and event.get("type") in store_kinds:
                continue
            if event.get("type") == "api_response" and "api_call" in store_kinds:
                # The reply half of a model call the store counts already: its text only, never its tokens.
                if not event.get("response"):
                    continue
                event = {**event, "tokens": {}}
            merged.append(event)
            continue
        taken.add(id(best))
        for field, value in event.items():
            if field not in ("ts", "source", "tokens", "api_calls", "duration_ms", "end_ts", "wall_ms") and value not in _EMPTY and best.get(field) in _EMPTY:
                best[field] = value
        if best.get("type") == "user_message" and best.get("message"):
            best["redacted"] = False
            best["preview"] = best.get("preview") or best["message"][:FLOW_PREVIEW_CHARS]
        best["source"] = "store+" + str(event.get("source") or "")
    merged.sort(key=lambda e: (e["ts"], _FLOW_ORDER.get(e.get("type"), 9)))
    return merged


def _event_tokens(event: dict) -> int:
    tokens = event.get("tokens") or {}
    return int(tokens.get("input") or 0) + int(tokens.get("output") or 0)


def _aggregate_flow(events: list[dict]) -> tuple[int, int]:
    """Each prompt takes the model calls up to the next prompt. Each event gets the tokens so
    far in the session and in its turn, and the number of its turn (0 before the first prompt).
    Returns the session total and the largest turn."""
    recount = any(e["type"] == "api_call" for e in events)
    cumulative = turn_tokens = largest = turn = 0
    current: dict | None = None
    for event in events:
        kind = event["type"]
        if kind == "user_message":
            current, turn_tokens = event, 0
            turn += 1
            if recount:
                event.update(tokens=_zero_tokens(), api_calls=0, duration_ms=0, model="", end_ts=event["ts"])
        elif current is not None and kind not in _FLOW_MARKERS:
            current["end_ts"] = max(current.get("end_ts") or current["ts"], event.get("end_ts") or event["ts"])
            if kind == "api_call" and recount:
                tokens = current["tokens"]
                for key in ("input", "output", "cache_read", "cache_creation"):
                    tokens[key] += int((event.get("tokens") or {}).get(key) or 0)
                current["api_calls"] += 1
                current["duration_ms"] += event.get("duration_ms") or 0
                current["model"] = current["model"] or event.get("model") or ""
        if kind == "api_call":
            cumulative += _event_tokens(event)
            turn_tokens += _event_tokens(event)
            largest = max(largest, turn_tokens)
        event["cum_tokens"] = cumulative
        event["rt_tokens"] = turn_tokens
        event["turn_index"] = turn
    for event in events:
        if event["type"] == "user_message":
            end = event.get("end_ts") or event["ts"]
            event["wall_ms"] = round((end - event["ts"]) * 1000) if end > event["ts"] else event.get("duration_ms") or 0
    return cumulative, largest


def _flow_summary(events: list[dict], source: str, cumulative: int, largest: int) -> dict:
    api = [e for e in events if e["type"] == "api_call"]
    prompts = [e for e in events if e["type"] == "user_message"]
    token_rows = api or prompts
    total_input = sum(int((e.get("tokens") or {}).get("input") or 0) for e in token_rows)
    total_output = sum(int((e.get("tokens") or {}).get("output") or 0) for e in token_rows)
    total_cache = sum(int((e.get("tokens") or {}).get("cache_read") or 0) for e in token_rows)
    total_cache_write = sum(int((e.get("tokens") or {}).get("cache_creation") or 0) for e in token_rows)
    costs = [float(e["cost_usd"]) for e in api if e.get("cost_usd") is not None]
    calls = len(api) or sum(e.get("api_calls") or 0 for e in prompts)
    ttfts = sorted(float(e["ttft_ms"]) for e in api if (e.get("ttft_ms") or 0) > 0)
    count: dict[str, int] = defaultdict(int)
    for event in events:
        count[event["type"]] += 1
    first = events[0]["ts"] if events else 0
    last = max((e.get("end_ts") or e["ts"] for e in events), default=0)
    return {
        "total_turns": count["user_message"],
        "total_api_calls": calls,
        "total_tool_uses": count["tool_use"],
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_cache_tokens": total_cache,
        "total_cache_creation_tokens": total_cache_write,
        "total_cost_usd": round(sum(costs), 6) if costs else None,
        "priced_calls": len(costs),
        "total_tokens": total_input + total_output,
        "avg_tokens_per_call": round((total_input + total_output) / calls) if calls else 0,
        "compactions": count["compaction"],
        "duration_s": round(last - first, 1) if first else 0,
        "source": source,
        "event_count": len(events),
        "subagents": count["subagent"],
        "hooks": count["hook"],
        "errors": count["error"] + sum(1 for e in api if e.get("is_error")) + sum(1 for e in events if e["type"] == "tool_use" and e.get("success") is False),
        "cumulative_tokens": cumulative,
        "largest_turn_tokens": largest,
        "ttft_ms": _median(ttfts),
        "ttft_calls": len(ttfts),
    }


# A tool call or a reply joins the open model round of its agent; these events close it.
_STEP_JOINS = frozenset({"tool_use", "api_response"})
_STEP_CLOSES = frozenset({"user_message", "compaction", "subagent_end"})


def _number_steps(events: list[dict]) -> int:
    """Number the steps of a flow in place and return how many there are.

    A step is one model round with the tool calls and the reply that follow it from the same
    agent, or one other event: a prompt, a subagent start or end, a compaction, a skill, a hook
    or an error. Each event gets ``step`` (1 is the first step) and each model call
    ``request_n`` (1 is the first request). Numbering runs over the whole flow before filters
    and paging, so a step keeps its number in every window.
    """
    open_round: dict[str, int] = {}
    # A subagent's configuration right after its start (its model) belongs to the start step.
    starting: dict[str, int] = {}
    step = request = 0
    for event in events:
        kind = event["type"]
        agent = event.get("agent_id") or ""
        if kind in _STEP_JOINS and agent in open_round:
            event["step"] = open_round[agent]
            continue
        if kind == "session_command" and agent in starting:
            event["step"] = starting[agent]
            continue
        step += 1
        event["step"] = step
        starting.pop(agent, None)
        if kind == "subagent":
            starting[agent] = step
        if kind == "api_call":
            request += 1
            event["request_n"] = request
            open_round[agent] = step
        elif kind in _STEP_CLOSES:
            open_round.pop(agent, None)
    return step


def _agent_scope(events: list[dict], agent_raw: str, session_raw: str) -> list[dict] | None:
    """The events of one subagent, or None when the id names the main agent or no event carries it."""
    # A subagent is named "<session>/<agent>"; its events carry the agent id alone.
    agent_raw = agent_raw.rpartition(AGENT_SEPARATOR)[2]
    if not agent_raw or agent_raw == session_raw:
        return None
    own = [event for event in events if (event.get("agent_id") or "") == agent_raw]
    return own or None


FLOW_MEMO_S = 120.0


# Flows kept per store. A large session holds tens of thousands of events, so only a few stay.
FLOW_MEMO_ENTRIES = 4


_FLOW_STAMP_TABLES = ("requests", "tool_invocations", "session_prompts", "events", "session_steps")


def _session_flow(db: Any, agent_id: str, since: float, until: float,
                  legacy_flow: Callable[[str, float, float], dict] | None,
                  history: HistoryScope, *, open_end: bool = False,
                  reuse: bool = False) -> tuple[str, list[dict], str] | None:
    """(session id, merged events, source) of a board agent, or None for an unknown agent.

    Building the flow reads every record of the session, so the result is kept on the store
    for FLOW_MEMO_S as long as the session's records have not changed. The flow of one
    session is asked for several times in a row: the flow tab, the transcript, each turn.
    ``open_end`` marks a range that ends now, whose end moves with each request. With
    ``reuse``, a kept flow of the same range is returned without checking the records again,
    so that the windows of one long flow read the same events.
    """
    sid, _agent = _resolve_agent(history, agent_id)
    node, raw = history.split(sid)
    # A PID bridge may add events from another session, so it cannot use a session stamp.
    use_memo = legacy_flow is None and ":" not in raw and hasattr(db, "__dict__")
    if not use_memo:
        return _session_flow_build(db, None, sid, since, until, legacy_flow, history=history)
    memo = db.__dict__.setdefault("_reader_flow_memo", {})
    guard = db.__dict__.setdefault("_reader_flow_guard", threading.Lock())
    with guard:
        lock = db.__dict__.setdefault("_reader_flow_locks", {}).setdefault((history.reader, node, sid), threading.Lock())
    scope = (history.reader, node, sid, since, None if open_end else until, capture_mode(db, default="full"))
    # One build at a time for a session: the live loop and the HTTP route ask for the same flow,
    # and a request that waited for a build takes its result.
    with guard:
        before = memo.get(scope)
    with lock:
        with guard:
            hit = memo.get(scope)
        fresh = hit is not None and 0 <= time.monotonic() - hit[0] < FLOW_MEMO_S
        if fresh and (reuse or hit is not before):
            return hit[2]
        revision = tuple(history.read("sequence.stamp", sid=sid, since=since, until=until, limit=1)[0].values())
        if fresh and hit[1] == revision:
            return hit[2]
        found = _session_flow_build(db, None, sid, since, until, legacy_flow, history=history)
        with guard:
            memo.pop(scope, None)
            while len(memo) >= FLOW_MEMO_ENTRIES:
                del memo[min(memo, key=lambda k: memo[k][0])]
            memo[scope] = (time.monotonic(), revision, found)
        return found

def _session_flow_build(db: Any, conn: Any | None, sid: str, since: float, until: float,
                        legacy_flow: Callable[[str, float, float], dict] | None, *,
                        history: HistoryScope | None = None) -> tuple[str, list[dict], str] | None:
    if _is_reported_history(db) or (history is not None and history.qualified):
        legacy_flow = lambda *_args: {}
    elif legacy_flow is None:
        def legacy_flow(session_id: str, lo: float, hi: float) -> dict:
            from .session_flow import reader_session_flow

            return reader_session_flow(history, session_id, lo, hi)

    keep = capture_mode(db, default="full") == "full"
    floor = text_floor(db, time.time())
    facts = None
    if history is not None:
        from .projections.history import typed_rows

        facts = typed_rows(history.read("sequence.flow", sid=sid, since=since, until=until,
                                        keep_text=keep, text_floor=floor))
    store, native_authorship = _store_flow_events(conn, sid, since, until, keep_text=keep, text_floor=floor, facts=facts)
    legacy, legacy_source = _legacy_flow_events(legacy_flow(sid, since, until) or {})
    if native_authorship:
        legacy = [event for event in legacy if event["type"] != "user_message"]
    known = bool(facts.get("known"))
    if not store and not legacy and not known:
        return None
    source = ("store+" + legacy_source if legacy else "store") if store else (legacy_source if legacy else "store")
    merged = _merge_flow(store, legacy)
    for ev in merged:
        if ev["type"] == "user_message" and (not keep or ev["ts"] < floor):
            ev.update(message="", preview="", redacted=True, text_status="expired" if keep else "withheld")
    return sid, merged, source


def _turn_marks(events: list[dict]) -> list[dict]:
    """Where each turn starts among ``events`` and what it holds, for a scrubber over a long flow."""
    marks: list[dict] = []
    for index, event in enumerate(events):
        turn = event.get("turn_index")
        if turn is None:
            continue
        if not marks or marks[-1]["turn"] != turn:
            marks.append({"turn": turn, "offset": index, "ts": event["ts"], "end_ts": event["ts"], "events": 0,
                          "tokens": 0, "tools": 0, "errors": 0, "subagents": 0, "prompt": ""})
        mark = marks[-1]
        kind = event["type"]
        mark["events"] += 1
        mark["end_ts"] = max(mark["end_ts"], event.get("end_ts") or event["ts"])
        mark["tokens"] = max(mark["tokens"], int(event.get("rt_tokens") or 0))
        mark["tools"] += kind == "tool_use"
        mark["subagents"] += kind == "subagent"
        mark["errors"] += kind == "error" or bool(event.get("is_error")) or (kind == "tool_use" and event.get("success") is False)
        if kind == "user_message" and not mark["prompt"]:
            mark["prompt"] = _clip(event.get("preview") or event.get("message"), 120)
    return marks


def agent_flow(
    db: Any,
    agent_id: str,
    since: float | None = None,
    until: float | None = None,
    now: float | None = None,
    legacy_flow: Callable[[str, float, float], dict] | None = None,
    limit: int | None = None,
    *,
    q: str = "", category: str = "", tool_name: str = "", flow_agent: str = "", failed: bool = False,
    skill_name: str = "", skill_phase: str = "",
    offset: int | None = None,
    history: HistoryScope | None = None,
    whole: bool = False,
) -> tuple[int, dict]:
    """The session flow of a board agent: ``{turns, summary}`` like ``build_session_flow``.

    Each event carries ``cum_tokens`` (input and output so far in the session), ``rt_tokens``
    (so far in its turn) and ``turn_index``. The summary counts every event in the range and
    marks where each turn starts among the matching events. One window of ``limit`` matching
    events is returned, FLOW_DEFAULT_EVENTS by default and at most MAX_FLOW_EVENTS: the newest
    events, or the events from position ``offset`` (0 is the oldest matching event). A window
    with an offset reads the flow kept for the previous window, so all windows of one flow
    count the same events.

    A subagent id gives the steps of that subagent alone (``flow_scope.kind`` "agent"), so the
    summary counts what the subagent did; ``whole`` gives the whole session of its main agent.
    Events carry ``step`` and model calls ``request_n``, numbered over the scope before filters.
    """
    now = time.time() if now is None else now
    history = history or HistoryScope.local(db)
    lo, hi = since if since is not None else 0.0, until if until is not None else now + 60.0
    from .flow_filters import select_events, session_kql_url

    if category == "skills" or skill_name or skill_phase:
        from .flow_skills import skill_events

        sid, _ = _resolve_agent(history, agent_id)
        events = skill_events(db, sid, lo, hi, live_end=until is None, history=history)
        if not events and not _session_flow(db, sid, lo, hi, legacy_flow, history, open_end=until is None):
            return 404, {"error": "No such agent"}
        summary = {"skill_evidence": True, "event_count": len(events)}
        flow_scope = {"kind": "session", "agent_id": agent_id, "session_id": sid, "subagent": False}
    else:
        found = _session_flow(db, agent_id, lo, hi, legacy_flow, history, open_end=until is None,
                              reuse=offset is not None)
        if found is None:
            return 404, {"error": "No such agent"}
        sid, records, source = found
        events = [dict(e) for e in records]  # aggregation annotates events; don't mutate another reader's cached flow
        agent_raw, session_raw = history.split(agent_id)[1], history.split(sid)[1]
        own = None if whole else _agent_scope(events, agent_raw, session_raw)
        flow_scope = {"kind": "agent" if own is not None else "session", "agent_id": agent_id, "session_id": sid,
                      "subagent": bool(agent_raw and agent_raw != session_raw)}
        if own is not None:
            events = own
        _link_spawns(events)
        cumulative, largest = _aggregate_flow(events)
        summary = _flow_summary(events, source, cumulative, largest)
        summary["total_steps"] = _number_steps(events)
        if own is not None:
            # A subagent's prompt is the task its main agent gave it.
            summary["total_turns"] = sum(1 for e in events if e["type"] == "subagent")
    keep = max(1, min(int(limit or FLOW_DEFAULT_EVENTS), MAX_FLOW_EVENTS))
    capture = capture_mode(db, default="full")
    matches, scope = select_events(events, q=q, category=category, tool_name=tool_name, flow_agent=flow_agent,
                                   failed=failed, allow_text=capture == "full", skill_name=skill_name, skill_phase=skill_phase)
    start = max(0, len(matches) - keep) if offset is None else max(0, min(int(offset), len(matches)))
    shown = matches[start:start + keep]
    summary["offset"] = start
    summary["matched_events"] = len(matches)
    summary["shown_events"] = len(shown)
    summary["omitted_events"] = start
    summary["turn_marks"] = _turn_marks(matches)
    settings = reader_feature(HistoryScope.local(db).reader, "connection_info")
    return 200, {"session_id": sid, "turns": shown, "summary": summary, "scope": scope, "flow_scope": flow_scope,
                 "capture_mode": capture,
                 "node_id": settings.node_id if settings else None,
                 "session_kql_url": session_kql_url(settings, sid, since, until)}


def _clip(text: Any, limit: int = ACTION_SUMMARY_CHARS) -> str:
    text = " ".join(str(text or "").split())
    return text[: limit - 1] + "…" if len(text) > limit else text


def _flow_action(event: dict) -> dict | None:
    """One transcript action of a flow event, or None for an event that is not an action."""
    kind = event["type"]
    if kind not in ("api_call", "api_response", "tool_use", "subagent", "error", "hook", "compaction"):
        return None
    name = {
        "api_call": event.get("model"),
        "api_response": event.get("model"),
        "tool_use": event.get("to"),
        "subagent": event.get("to"),
        "error": event.get("error_type"),
        "hook": event.get("hook_name"),
        "compaction": event.get("trigger") or "compaction",
    }[kind]
    action: dict = {"ts": event["ts"], "kind": kind, "name": name or "", "duration_ms": event.get("duration_ms") or 0}
    inputs = {"tool_use": event.get("target") or event.get("input_preview"), "subagent": event.get("prompt")}
    outputs = {
        "tool_use": event.get("result_summary"),
        "api_response": event.get("response_preview"),
        "error": event.get("error_message"),
        "api_call": event.get("error_type") if event.get("is_error") else None,
    }
    if inputs.get(kind):
        action["input_summary"] = _clip(inputs[kind])
    if outputs.get(kind):
        action["output_summary"] = _clip(outputs[kind])
    if kind == "api_call":
        action["tokens"] = dict(event.get("tokens") or _zero_tokens())
        action["success"] = not event.get("is_error")
    if kind == "tool_use" and isinstance(event.get("success"), bool):
        action["success"] = event["success"]
    detail = {key: event[key] for key in ("exit_code", "confirm", "agent_id") if event.get(key) not in _EMPTY}
    if kind == "api_response" and event.get("response"):
        detail["response"] = event["response"]
    if detail:
        action["detail"] = detail
    return action


def _transcript_turn(ts: float, prompt: str = "", opened_by_prompt: bool = False) -> dict:
    return {
        "ts": ts,
        "end_ts": ts,
        "prompt": prompt,
        "prompt_preview": prompt[:FLOW_PREVIEW_CHARS],
        "prompt_event": opened_by_prompt,
        "response": "",
        "response_preview": "",
        "model": "",
        "tokens": {**_zero_tokens(), "total": 0},
        "api_calls": 0,
        "duration_ms": 0,
        "wall_ms": 0,
        "reply_ms": None,
        "actions": [],
        "tool_use_count": 0,
    }


def _flow_transcript(events: list[dict]) -> list[dict]:
    """Turns from flow events: each prompt opens a turn, and what follows belongs to it."""
    turns: list[dict] = []
    current: dict | None = None
    for event in events:
        if event["type"] == "user_message":
            current = _transcript_turn(event["ts"], event.get("message") or "", True)
            current["end_ts"] = event.get("end_ts") or event["ts"]
            turns.append(current)
            continue
        action = _flow_action(event)
        if action is None:
            continue
        if current is None:
            current = _transcript_turn(event["ts"])
            turns.append(current)
        current["actions"].append(action)
        current["end_ts"] = max(current["end_ts"], event.get("end_ts") or event["ts"])
        if action["kind"] == "api_response" and event.get("response"):
            current["response"] = (current["response"] + "\n\n" + event["response"]) if current["response"] else event["response"]
    for turn in turns:
        _tally_turn(turn)
    return turns


def _tally_turn(turn: dict) -> None:
    """Tokens, model calls, reply time and counts of a turn, from its actions."""
    calls = [a for a in turn["actions"] if a["kind"] == "api_call"]
    tokens = _zero_tokens()
    models: dict[str, int] = defaultdict(int)
    for call in calls:
        for key in tokens:
            tokens[key] += int((call.get("tokens") or {}).get(key) or 0)
        if call.get("name"):
            models[call["name"]] += 1
    if calls:
        turn["tokens"] = {**tokens, "total": tokens["input"] + tokens["output"]}
        turn["api_calls"] = len(calls)
        turn["model"] = max(models, key=models.get) if models else turn.get("model") or ""
    durations = [a["duration_ms"] for a in calls if a.get("duration_ms")]
    turn["duration_ms"] = sum(durations) if durations else turn.get("duration_ms") or 0
    turn["reply_ms"] = sum(durations) if durations else turn.get("reply_ms")
    turn["wall_ms"] = round((turn["end_ts"] - turn["ts"]) * 1000) if turn["end_ts"] > turn["ts"] else turn["duration_ms"]
    turn["tool_use_count"] = sum(1 for a in turn["actions"] if a["kind"] == "tool_use")
    turn["response_preview"] = turn["response"][:FLOW_PREVIEW_CHARS]


def _merge_transcript(turns: list[dict], legacy: dict | None) -> list[dict]:
    """Turns with the live analyzer's turns merged in. A legacy turn whose prompt is within
    FLOW_MATCH_S of a turn's is the same turn: it adds the text and actions the turn lacks."""
    if not legacy or not legacy.get("turns"):
        return turns
    prompted = sorted((t for t in turns if t["prompt_event"]), key=lambda t: t["ts"])
    times = [t["ts"] for t in prompted]
    for other in legacy["turns"]:
        at = bisect.bisect_left(times, other.get("ts") or 0)
        near = [prompted[j] for j in (at - 1, at) if 0 <= j < len(prompted) and abs(prompted[j]["ts"] - (other.get("ts") or 0)) <= FLOW_MATCH_S]
        if not near:
            turn = _transcript_turn(other.get("ts") or 0, other.get("prompt") or "", bool(other.get("prompt")))
            turn.update({k: other[k] for k in ("end_ts", "model", "tokens", "api_calls", "duration_ms", "wall_ms") if other.get(k) not in _EMPTY})
            turn["response"] = other.get("response") or ""
            turn["actions"] = list(other.get("actions") or [])
            turn["tool_use_count"] = sum(1 for a in turn["actions"] if a.get("kind") == "tool_use")
            turn["response_preview"] = turn["response"][:FLOW_PREVIEW_CHARS]
            turns.append(turn)
            continue
        turn = min(near, key=lambda t: abs(t["ts"] - (other.get("ts") or 0)))
        for key in ("prompt", "prompt_preview", "response"):
            if other.get(key) and not turn.get(key):
                turn[key] = other[key]
        for action in other.get("actions") or []:
            same = any(
                a["kind"] == action.get("kind") and a.get("name") == action.get("name") and abs(a["ts"] - (action.get("ts") or 0)) <= FLOW_MATCH_S
                for a in turn["actions"]
            )
            if not same:
                turn["actions"].append(action)
        turn["actions"].sort(key=lambda a: a.get("ts") or 0)
        turn["end_ts"] = max(turn["end_ts"], other.get("end_ts") or 0)
        _tally_turn(turn)
    turns.sort(key=lambda t: t["ts"])
    return turns


def agent_transcript(
    db: Any,
    agent_id: str,
    now: float | None = None,
    legacy_flow: Callable[[str, float, float], dict] | None = None,
    legacy_transcript: Callable[[str], dict | None] | None = None,
    turn: float | None = None,
    brief: bool = True,
    *,
    history: HistoryScope | None = None,
) -> tuple[int, dict]:
    """The transcript of a board agent's session: one turn per prompt, with its reply and actions.

    ``replies_kept`` is False when no reply text is stored for the session; the turns then
    carry the prompts, actions and tokens, and ``reply_note`` says that the text is not kept.

    By default each turn is brief: the first FLOW_PREVIEW_CHARS of its prompt and reply, its
    counts and tokens, no actions, and ``detail`` True when the full turn holds more. ``turn``
    names one turn by its timestamp and returns that turn whole under ``turn``; ``brief=False``
    returns every turn whole.
    """
    now = time.time() if now is None else now
    found = _session_flow(db, agent_id, 0.0, now + 60.0, legacy_flow, history or HistoryScope.local(db), open_end=True)
    if found is None:
        return 404, {"error": "No such agent"}
    sid, events, source = found
    cumulative, largest = _aggregate_flow(events)
    flow_summary = _flow_summary(events, source, cumulative, largest)
    live = None
    turns = _merge_transcript(_flow_transcript(events), live)
    replies_kept = any(t["response"] for t in turns)
    actions = [a for t in turns for a in t["actions"]]
    summary = {
        **{k: flow_summary[k] for k in ("total_input_tokens", "total_output_tokens", "total_cache_tokens", "total_tokens", "avg_tokens_per_call", "duration_s", "source")},
        "total_turns": sum(1 for t in turns if t["prompt_event"]),
        "total_api_calls": sum(t["api_calls"] for t in turns),
        "total_tool_uses": sum(t["tool_use_count"] for t in turns),
        "compactions": sum(1 for a in actions if a.get("kind") == "compaction"),
        "errors": sum(1 for a in actions if a.get("kind") == "error" or (a.get("kind") in ("api_call", "tool_use") and a.get("success") is False)),
        "subagents": sum(1 for a in actions if a.get("kind") == "subagent"),
        "event_count": len(actions) + sum(1 for t in turns if t["prompt_event"]),
    }
    body = {
        "session_id": sid,
        "summary": summary,
        "capture_mode": capture_mode(db, default="full"),
        "replies_kept": replies_kept,
        "reply_note": None if replies_kept else REPLY_NOT_KEPT,
        "is_live": bool(live and live.get("is_live")),
    }
    if turn is not None:
        match = min(turns, key=lambda t: abs(t["ts"] - turn), default=None)
        if match is None or abs(match["ts"] - turn) > 0.001:
            return 404, {"error": "No such turn"}
        return 200, {**body, "turn": match}
    return 200, {**body, "turns": [_brief_turn(t) for t in turns] if brief else turns}


def _brief_turn(turn: dict) -> dict:
    """A turn without its actions and long texts, and ``detail`` when the whole turn holds more."""
    prompt, response = turn.get("prompt") or "", turn.get("response") or ""
    more = bool(turn.get("actions")) or len(prompt) > FLOW_PREVIEW_CHARS or len(response) > FLOW_PREVIEW_CHARS
    return {**turn, "prompt": prompt[:FLOW_PREVIEW_CHARS], "response": response[:FLOW_PREVIEW_CHARS], "actions": [], "detail": more}
