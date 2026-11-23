"""Build agent details and session-level projections."""

from __future__ import annotations

import bisect
import hashlib
import json
import re
import time
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import replace
from types import SimpleNamespace
from typing import Any

from ..utils import estimate_tokens_from_size
from .board_filters import SPARK_POINTS, _detail_filters
from .board_projection import (
    _agent_key,
    _api_error_key,
    _Board,
    _cost_of,
    _fallback_models,
    _fallback_rows,
    _gather,
    _list_cost,
    _store_facts,
    _test_failed,
    _tool_error_key,
    is_command_tool,
    is_test_command,
)
from .history_scope import identity, identity_parts
from .projection_utils import (
    AGENT_SEPARATOR,
    MAX_DETAIL_ROWS,
    MAX_LIST_ROWS,
    _as_number,
    _basename,
    _json_list,
    _ms,
    _num_or_none,
    _one_line,
    _parse_detail,
    _percentile,
    _ratio,
    _resolve_agent,
    _session_row,
    _session_uuid,
    _short,
    _usd,
    known_mcp_servers,
    mask_secrets,
    mcp_server_of,
)
from .projections.history import (
    HistoryScope,
    capture_mode,
    exact_values,
    node_scope,
    session_events,
)

# Lets the detail's board and its own reads run side by side, as the board does; no other flag is set.
_CLUSTER_READS = SimpleNamespace(_live_latency_bound=True)


def live_pids_of(store: Any, snapshot: Any, agent_id: str, now: float | None = None,
                 *, history: HistoryScope | None = None) -> list[int]:
    """The processes of a board agent, for Stop. A subagent has none of its own."""
    if not getattr(snapshot, "sessions", None):
        return []
    now = time.time() if now is None else now
    history = history or HistoryScope.local(store)
    only_session = None
    placeholder = agent_id.startswith("live:")
    if not placeholder:
        sid, agent = _resolve_agent(history, agent_id)
        if agent != sid:
            return []
        only_session = sid
    board = _Board(None, _detail_filters(now), now, snapshot, only_session=only_session, history=history)
    board._load_identity()
    board._match_live()
    if placeholder:
        for group in board.placeholders:
            if f"live:{group['tool']}:{group['project']}" == agent_id:
                return sorted(group["pids"])
        return []
    return sorted((board.live_by_sid.get(only_session) or {}).get("pids", ()))


def _session_board(db: Any, conn: Any, sid: str, snapshot: Any, now: float,
                   history: HistoryScope, counts_only: bool = False) -> _Board:
    """The board of one session over its whole life, as the agent detail reads it."""
    first = history.read("sessions.first_activity", sid=sid, limit=1)[0]["first_ts"]
    filters = _detail_filters(now)
    if first and first < filters.until:
        filters = replace(filters, since=first)
    facts = _store_facts(str(getattr(db, "_path", "memory")), history)
    return _Board(conn, filters, now, snapshot, only_session=sid, facts=facts, history=history).load(counts_only=counts_only)


def session_numbers(db: Any, sid: str, now: float | None = None, *, history: HistoryScope | None = None) -> dict | None:
    """Tokens, cost, tool calls and prompts of a main agent, the same as its agent detail.

    Read in the session's own read scope, so rows of a session that are in two stores
    (a move that is not done) are all counted. None when the board has no such session.
    """
    now = time.time() if now is None else now
    history = history or HistoryScope.local(db)
    board = _session_board(db, _CLUSTER_READS, sid, None, now, history, counts_only=True)
    if sid not in board.scope:
        return None
    row = board._agent_row(sid, sid, "", [0] * SPARK_POINTS)
    parts = [row.get(k) for k in ("input", "output", "cache_read", "cache_write")]
    return {
        "tokens": sum(int(v or 0) for v in parts) if any(v is not None for v in parts) else None,
        "cost_usd": row["cost_usd"],
        "tool_calls": row["tool_calls"],
        "prompts": (row.get("msgs") or {}).get("user"),
    }


def agent_detail(db: Any, agent_id: str, snapshot: Any = None, now: float | None = None,
                 *, history: HistoryScope | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    history = history or HistoryScope.local(db)
    conn = None
    sid, bare = _resolve_agent(history, agent_id)
    # The board keys a subagent by its address, "<session>/<agent>"; the store reads take the agent id.
    agent = _agent_key(sid, bare)
    board = _session_board(db, _CLUSTER_READS, sid, snapshot, now, history)
    if sid not in board.scope:
        return 404, {"error": "No such agent"}
    root = agent == sid
    requested_agent = "" if root else history.split(bare)[1]
    detail_scope = {"sid": sid, "requested_agent": requested_agent}
    from .projections.history import typed_rows

    keys = [(sid, a) for a in {sid, *board.agents_by_root.get(sid, ())}]
    # None of these reads needs another's result, so on a cluster they run side by side.
    # More reads than workers: the slowest ones are listed first so that none of them waits for a worker.
    (activity, otel_facts, page, by_model, turns, test_rows, context_facts, error_rows, tool_totals, write_summary,
     titles, lm_by_extension, api_error_rows, session, skills) = _gather(_CLUSTER_READS, [
        lambda: board._activity_for(keys),
        lambda: typed_rows(history.read("sequence.otel", sid=sid)) if root else {},
        lambda: history.read("tools.detail", limit=MAX_DETAIL_ROWS + 1, page=True, **detail_scope),
        lambda: _agent_models(history, sid, requested_agent, root, now),
        lambda: _agent_turns(history, sid, requested_agent),
        lambda: history.read("tools.detail", query_mode="tests", real_calls=False, **detail_scope),
        lambda: typed_rows(history.read("sequence.context", sid=sid)),
        lambda: history.read("tools.detail", limit=MAX_DETAIL_ROWS, page=True, query_mode="errors", **detail_scope),
        # The call list is capped, so the figures per tool come from all calls.
        lambda: _tool_totals(history.read("tools.totals", **detail_scope)),
        lambda: history.read("files.changes", sid=sid, limit=MAX_DETAIL_ROWS, page=True) if root else [],
        lambda: board._titles(keys),
        lambda: _lm_by_extension(history, sid) if root else None,
        lambda: history.read("requests.errors", limit=MAX_DETAIL_ROWS, page=True, **detail_scope),
        lambda: _session_row(history, sid),
        lambda: _agent_skills(history, sid, bare, root),
    ])
    row = board._agent_row(sid, agent, titles.get((sid, agent), _short(agent)), activity.get((sid, agent), [0] * SPARK_POINTS))
    subagents = [
        board._agent_row(sid, a, titles[(sid, a)], activity[(sid, a)])
        for a in sorted(board.agents_by_root.get(sid, ()))
        if a != sid and root
    ]
    git, runs, record = _gather(_CLUSTER_READS, [
        lambda: _agent_git(history, session, sid),
        lambda: _agent_runs(history, session, sid, row, now) if root else [],
        lambda: _agent_record(db, conn, session, sid, row, root, history, context_facts=context_facts),
    ])

    live = board.live_by_sid.get(sid) if root else None
    process = {
        "cpu_percent": row["cpu_percent"],
        "mem_mb": row["mem_mb"],
        "pids": row["pids"],
        "started_at": row["started_at"],
    }
    if live is None:
        process["cpu_percent"] = process["mem_mb"] = None

    fields = ("ts", "tool_name", "target", "duration_ms", "is_error", "confirm", "input_bytes", "output_bytes")
    tool_calls = [
        {
            "ts": ts,
            "name": name,
            "target": _one_line(target, 300),
            "duration_ms": duration or None,
            "failed": bool(failed),
            "confirm": confirm or None,
            "input_bytes": in_bytes,
            "output_bytes": out_bytes,
        }
        for ts, name, target, duration, failed, confirm, in_bytes, out_bytes
        in (tuple(r[k] for k in fields) for r in page if r["row_type"] == "item")
    ]
    files = [
        {"path": path, "lines_added": _maybe_int(added), "lines_removed": _maybe_int(removed), "edits": edits}
        for path, added, removed, edits in ((r["path"], r["added"], r["removed"], r["edits"]) for r in write_summary)
    ]
    tests = []
    for r in test_rows:
        ts, name, target, is_error, exit_code, duration = (
            r[k] for k in ("ts", "tool_name", "target", "is_error", "exit_code", "duration_ms")
        )
        if is_command_tool(name) and is_test_command(target):
            tests.append(
                {
                    "ts": ts,
                    "command": _one_line(target, 200),
                    "passed": not _test_failed(is_error, exit_code),
                    "duration_ms": duration or None,
                }
            )
        if len(tests) >= MAX_DETAIL_ROWS:
            break
    errors = []
    for r in error_rows:
        ts, name, summary = r["ts"], r["tool_name"], r["result_summary"]
        errors.append({"ts": ts, "key": _tool_error_key(name, summary), "detail": _one_line(summary, 500)})
    for r in api_error_rows:
        ts, error_type, status = r["ts"], r["error_type"], r["http_status"]
        errors.append(
            {
                "ts": ts,
                "key": _api_error_key(error_type, status),
                "detail": " ".join(str(p) for p in (error_type, status) if p),
            }
        )
    errors.sort(key=lambda e: e["ts"], reverse=True)
    otel = _agent_otel(conn, sid, root, [t.get("mcp_server") or t["name"] for t in tool_totals], facts=otel_facts)
    own_loops = [loop for loop in board.loops if loop["agent_id"] == agent or (root and loop["session_id"] == sid)]
    loop = None
    if own_loops:
        newest = own_loops[0]
        loop = {
            "pattern": newest["pattern"],
            "repeats": newest["repeats"],
            "since_ts": newest["since_ts"],
            "at_end": newest["at_end"],
            "tokens": newest.get("tokens"),
            "cost_usd": newest.get("cost_usd"),
        }
    return 200, {
        "agent": row,
        "by_model": by_model,
        "subagents": subagents,
        "process": process,
        "skills": skills,
        "context": _agent_context(conn, sid, bare, root, facts=context_facts, raw_agent=requested_agent,
                                  raw_sid=history.split(sid)[1],
                                  keep_text=not history.qualified and capture_mode(db, default="full") == "full"),
        "turns": turns,
        "tool_totals": tool_totals,
        "tool_calls": tool_calls,
        "files": files,
        "tests": tests,
        "loop": loop,
        "errors": errors[:MAX_DETAIL_ROWS],
        "git": git,
        "runs": runs,
        "resources": _agent_resources(db, conn, board, sid, row, root, now, otel_facts=otel_facts,
                                      lm_by_extension=lm_by_extension),
        "otel": otel,
        "sources": _agent_sources(conn, sid, otel, facts=otel_facts) if root else None,
        **record,
    }


def _agent_models(history: HistoryScope, sid: str, requested_agent: str, root: bool, now: float) -> list[dict]:
    """Calls, tokens and cost per model. A main agent without request rows uses its fallback usage, as estimates."""
    by_model = []
    for model_row in history.read("requests.models", sid=sid, requested_agent=requested_agent):
        model, n, i, o, cr, cw, ts, stored = (
            model_row[k] for k in ("model", "calls", "input_tokens", "output_tokens", "cache_read_tokens",
                                   "cache_creation_tokens", "last_ts", "cost_usd")
        )
        cost = _cost_of(stored, model, i, o, cr, cw, ts)
        by_model.append(
            {
                "model": model,
                "msgs": n,
                "tokens": i + o + cr + cw,
                "input": i,
                "output": o,
                "cache_read": cr,
                "cache_write": cw,
                "cached_share": _ratio(cr, i + cr + cw),
                "cost_usd": _usd(cost),
            }
        )
    if not by_model and root:
        for fallback in _fallback_rows(history, 0.0, now + 60.0, sid):
            for model, usage in _fallback_models(fallback).items():
                cost, _ = _list_cost(
                    model, usage["input"], usage["output"], usage["cache_read"], usage["cache_write"], fallback["last_activity_at"]
                )
                by_model.append(
                    {
                        "model": model,
                        "msgs": usage["requests"],
                        "tokens": usage["input"] + usage["output"] + usage["cache_read"] + usage["cache_write"],
                        "input": usage["input"],
                        "output": usage["output"],
                        "cache_read": usage["cache_read"],
                        "cache_write": usage["cache_write"],
                        "cached_share": _ratio(usage["cache_read"], usage["input"] + usage["cache_read"] + usage["cache_write"]),
                        "cost_usd": _usd(cost),
                        "estimated": True,
                    }
                )
    return by_model


def _agent_record(db: Any, conn: Any, session: dict, sid: str, row: dict, root: bool,
                  history: HistoryScope, *, context_facts=None) -> dict:
    """Artifacts and commits of a main agent's session. A subagent shares its session's, so it has none here.

    Both have ``context_files``: a subagent's ``loaded`` holds the files it loaded itself, else its main agent's.
    """
    from .session_record import empty_record, record_section

    project = str(session.get("project_path") or row.get("project") or "")
    agent = "" if root else str(row.get("id") or "")
    # A subagent's row id is its address, "<session>/<agent>"; the store keeps the agent id.
    raw_agent = history.split(agent)[1].rpartition(AGENT_SEPARATOR)[2] if agent else ""
    loaded = _loaded_files(conn, history.split(sid)[1], raw_agent,
                           facts=context_facts)
    from .queryable_context import session_context_files

    context_files = session_context_files(project, loaded, session.get("tool") or "", history=history)
    if not root:
        return {**empty_record(), "context_files": context_files}
    return {**record_section(db, session, sid, project, history=history), "context_files": context_files}


OTEL_MCP_ROWS = 200


# Copilot counts AI credits in nano AIU: 1e9 of them make one credit, as in its session file.
NANO_PER_CREDIT = 1e9


# A chat span whose session-file call is not found by its tokens matches a call of the
# same model and output that ended this close to the span's end.
OTEL_MATCH_S = 5.0


def _signal(rows: list[tuple[float, dict]]) -> dict:
    return {"count": len(rows), "last_ts": max((ts for ts, _d in rows), default=None)}


def _otel_calls(conn: Any, sid: str, chats: list[tuple[float, dict]], *, facts=None) -> list[dict]:
    """Each chat span of the session, with the OTel-only values, matched to its session-file call."""
    from ..ingesters.call_facts import copilot_call_key

    stored = facts.get("call", [])
    by_key = {key: (ts, model, out) for key, ts, model, out in stored if key}
    taken: set[float] = set()
    seen: set[str] = set()
    occurrence: dict[tuple, int] = defaultdict(int)
    calls = []
    for ts, d in chats:
        ident = str(d.get("otel.span_id") or d.get("gen_ai.response.id") or "")
        if ident and ident in seen:
            continue
        seen.add(ident)
        tokens = tuple(int(_num_or_none(d.get(k)) or 0) for k in (
            "gen_ai.usage.input_tokens", "gen_ai.usage.output_tokens",
            "gen_ai.usage.cache_read.input_tokens", "gen_ai.usage.cache_write.input_tokens"))
        n = occurrence[tokens]
        occurrence[tokens] += 1
        model = str(d.get("gen_ai.response.model") or d.get("gen_ai.request.model") or "")
        end = ts + (_num_or_none(d.get("duration_ms")) or 0) / 1000.0
        hit = by_key.get(copilot_call_key(sid, tokens, n))
        if hit is None:
            near = [r for r in stored if r[2] == model and r[3] == tokens[1] and abs(r[1] - end) <= OTEL_MATCH_S and r[1] not in taken]
            hit = (near[0][1], near[0][2], near[0][3]) if near else None
        ttft = _num_or_none(d.get("gen_ai.response.time_to_first_chunk"))
        nano = _num_or_none(d.get("github.copilot.nano_aiu"))
        call: dict = {
            "ts": ts,
            "end_ts": end,
            "model": model,
            "turn_id": str(d.get("github.copilot.turn_id") or ""),
            "initiator": str(d.get("github.copilot.initiator") or ""),
            "cost": _num_or_none(d.get("github.copilot.cost")),
            "nano_aiu": nano,
            "ai_credits": round(nano / NANO_PER_CREDIT, 6) if nano is not None else None,
            "ttft_ms": round(ttft * 1000, 1) if ttft is not None else None,
            "server_ms": _num_or_none(d.get("github.copilot.server_duration")),
            "duration_ms": _num_or_none(d.get("duration_ms")),
            "matched": hit is not None,
            "request_ts": hit[0] if hit else None,
        }
        if hit is not None:
            taken.add(hit[0])
        else:
            # Not in the session file: the span's own tokens, which no total of the board adds.
            call["tokens"] = dict(zip(("input", "output", "cache_read", "cache_write"), tokens))
        calls.append(call)
    return calls


def _agent_otel(conn: Any, sid: str, root: bool, mcp_names: Iterable[str] = (), *, facts=None) -> dict | None:
    """What OpenTelemetry sent for the session: counts per signal, and the values only OTel has.

    None for a subagent: the spans name the session, not an agent of it.
    """
    if not root:
        return None
    spans: list[tuple[float, dict]] = []
    span_events: list[tuple[float, dict]] = []
    logs: list[tuple[float, dict]] = []
    by_kind: dict[str, list[tuple[float, dict]]] = defaultdict(list)
    signals = facts.get("signal", [])
    for ts, kind, raw in signals:
        d = _parse_detail(raw)
        row = (ts, d)
        (spans if "span.name" in d else span_events if "parent_span" in d else logs).append(row)
        by_kind[kind[5:]].append(row)
    if not spans and not span_events and not logs:
        return None
    chats = [r for r in spans if str(r[1].get("gen_ai.operation.name") or "") == "chat" or str(r[1].get("span.name") or "").startswith("chat ")]
    calls = _otel_calls(conn, sid, chats, facts=facts)
    usage = by_kind.get("github.copilot.session.usage_info") or []
    context = None
    if usage:
        ts, d = usage[-1]
        current, limit = _num_or_none(d.get("github.copilot.current_tokens")), _num_or_none(d.get("github.copilot.token_limit"))
        context = {
            "ts": ts,
            "current": int(current) if current is not None else None,
            "limit": int(limit) if limit is not None else None,
            "share": _ratio(current, limit) if current is not None and limit else None,
            "messages": _maybe_int(_num_or_none(d.get("github.copilot.messages_length"))),
            "reports": len(usage),
        }
    agents = [r for r in spans if str(r[1].get("gen_ai.operation.name") or "") == "invoke_agent"]
    in_context = None
    if agents:
        ts, d = agents[-1]
        in_context = {
            "ts": ts,
            "turns": len(agents),
            "skills": _json_list(d.get("github.copilot.context.skills")),
            "custom_agents": _json_list(d.get("github.copilot.context.custom_agent_names")),
            "mcp_servers": _json_list(d.get("github.copilot.context.mcp_server_names")),
            "agent_type": str(d.get("github.copilot.agent.type") or ""),
        }
    # Copilot names an MCP server by the SHA-256 of its name; a name the session used is shown.
    # Copilot CLI calls a server's tool "<server>-<tool>", so each leading part of a tool name is tried.
    candidates: set[str] = set()
    for n in mcp_names:
        candidates.update(n[:i] for i, ch in enumerate(n) if ch in "-_/")
        candidates.add(n)
    names = {hashlib.sha256(n.encode("utf-8")).hexdigest(): n for n in candidates if n}
    lifecycle = []
    servers: dict[str, dict] = {}
    for ts, d in (by_kind.get("github.copilot.mcp.server.lifecycle") or [])[-OTEL_MCP_ROWS:]:
        h = str(d.get("github.copilot.mcp.server.name_hash") or "")
        entry = {"ts": ts, "state": str(d.get("github.copilot.mcp.server.state") or ""), "hash": h,
                 "name": names.get(h), "source": str(d.get("github.copilot.mcp.server.source") or "")}
        lifecycle.append(entry)
        servers[h] = entry
    if in_context:
        in_context["mcp_servers"] = [{"hash": h, "name": names.get(h), "state": (servers.get(h) or {}).get("state")} for h in in_context["mcp_servers"]]
    priced = [c for c in calls if c["nano_aiu"] is not None]
    return {
        "spans": _signal(spans),
        "span_events": _signal(span_events),
        "logs": _signal(logs),
        # Copilot CLI's metrics carry no session id: they are the process's, not this session's.
        "metrics": None,
        "calls": calls[:MAX_DETAIL_ROWS],
        "totals": {
            "calls": len(calls),
            "matched": sum(1 for c in calls if c["matched"]),
            "nano_aiu": sum(c["nano_aiu"] for c in priced) if priced else None,
            "ai_credits": round(sum(c["nano_aiu"] for c in priced) / NANO_PER_CREDIT, 6) if priced else None,
            "cost": sum(c["cost"] or 0 for c in calls) if any(c["cost"] is not None for c in calls) else None,
        },
        "context": context,
        "in_context": in_context,
        "mcp_lifecycle": lifecycle,
        "mcp_servers": list(servers.values()),
    }


def _agent_sources(conn: Any, sid: str, otel: dict | None, *, facts=None) -> dict:
    """How many records of the session came from each source: its session file, OTel, hooks."""
    one = facts["source"][0]
    hooks, hook_ts = facts["hooks"][0]
    otel = otel or {}
    span = otel.get("spans") or {"count": 0, "last_ts": None}
    return {
        "session_file": sum(int(v or 0) for v in one),
        "otel_spans": span["count"],
        "otel_span_events": (otel.get("span_events") or {}).get("count", 0),
        "otel_last_ts": max((x for x in (span["last_ts"], (otel.get("span_events") or {}).get("last_ts"), (otel.get("logs") or {}).get("last_ts")) if x), default=None),
        "hooks": int(hooks or 0),
        "hooks_last_ts": hook_ts,
    }


def _loaded_files(conn: Any, sid: str, agent: str = "", *, facts=None) -> list[dict]:
    """The files the session's own record shows it loaded, oldest first. See ingesters/loaded_files.

    For a subagent (*agent* set): its own rows, else the main agent's (rows without an agent).
    """
    rows = facts.get("loaded", [])
    if agent:
        own = [r for r in rows if r[4] == agent]
        rows = own or [r for r in rows if not r[4] or r[4] == sid]
    return [
        {"path": path, "name": _basename(path), "how": how, "detail": detail or "", "ts": ts or 0.0}
        for path, how, detail, ts, _a in rows[:MAX_LIST_ROWS]
    ]


def _session_context_files(folder: str, loaded: list[dict] | None = None) -> dict:
    """Instruction and config files that can affect a session working in *folder* (see tree_walk).

    ``loaded`` lists the files the session did load, inside the git root or not; a file of
    ``files`` that is among them has ``loaded: true``.
    """
    from ..tree_walk import files_for_folder

    found = files_for_folder(folder) if folder else {"git_root": None, "files": [], "read": False}
    loaded = loaded or []
    loaded_paths = {e["path"] for e in loaded}
    files = []
    for p in found["files"][:MAX_LIST_ROWS]:
        entry: dict = {"path": p, "name": _basename(p)}
        if p in loaded_paths:
            entry["loaded"] = True
        files.append(entry)
    return {
        "git_root": found["git_root"],
        "read": found["read"],
        "files": files,
        "total": len(found["files"]),
        "loaded": loaded,
    }


RUN_HISTORY_DAYS = 30


MAX_RUN_ROWS = 200


def _agent_git(history: HistoryScope, session: dict, sid: str) -> dict:
    """Branch and commit the session started on, and the commits attributed to it so far."""
    sid_stored = session.get("session_id") or sid
    counts = history.read("sessions.commit_counts", session_keys=history.keys((sid_stored,)))
    return {
        "branch": session.get("git_branch") or None,
        "commit": session.get("git_commit") or None,
        "commits_in_session": sum(row["count"] for row in counts),
    }


def _median(values: list[float]) -> float | None:
    ordered = sorted(values)
    if not ordered:
        return None
    mid = len(ordered) // 2
    return ordered[mid] if len(ordered) % 2 else (ordered[mid - 1] + ordered[mid]) / 2


def _agent_runs(history: HistoryScope, session: dict, sid: str, row: dict, now: float) -> list[dict]:
    """Ended runs of the same tool in the same project over the last 30 days, newest first.

    Each run has its duration, tokens (input and output) and changed files as a ratio to the
    median of the other runs in the list. A ratio is null when that median is zero or unknown.
    """
    from .session_details import _one_row_per_session

    tool = session.get("tool") or row.get("tool") or ""
    project = session.get("project_path") or row.get("project") or ""
    if not tool or not project:
        return []
    since = now - RUN_HISTORY_DAYS * 86400.0
    # A run counts when it ended in the window. Starts are read further back so a long run is not lost.
    node, _ = history.split(sid)
    result = history.require_reader().read("sessions.runs", {
        **node_scope(node), "since": since - RUN_HISTORY_DAYS * 86400.0, "until": since,
        "requested_tool": tool, "requested_path": project, "limit": 5000,
    })
    rows = _one_row_per_session(history.identify(result.rows))
    own = {sid, session.get("session_id") or sid}
    runs = []
    for r in rows:
        ended = float(r.get("ended_at") or 0)
        started = float(r.get("started_at") or 0)
        runs.append(
            {
                "session_id": r.get("session_id", ""),
                "started_at": started or None,
                "ended_at": ended,
                "duration_s": round(ended - started, 1) if started else None,
                "tokens": int(r.get("input_tokens") or 0) + int(r.get("output_tokens") or 0),
                "file_churn": int(r.get("files_modified") or 0),
                "cost_usd": _usd(r.get("cost_usd")),
                "current": r.get("session_id") in own,
            }
        )
    runs.sort(key=lambda r: r["ended_at"], reverse=True)
    runs = runs[:MAX_RUN_ROWS]
    others = [r for r in runs if not r["current"]]
    medians = {
        key: _median([float(r[key]) for r in others if r[key] is not None])
        for key in ("duration_s", "tokens", "file_churn")
    }
    for r in runs:
        for key, out in (("duration_s", "duration_ratio"), ("tokens", "tokens_ratio"), ("file_churn", "churn_ratio")):
            med = medians[key]
            r[out] = round(r[key] / med, 3) if r[key] is not None and med else None
    return runs


def _live_matches(board: _Board, sid: str) -> list[dict]:
    """The monitor's live sessions that belong to a board session: the same processes or the same UUID."""
    pids = set((board.live_by_sid.get(sid) or {}).get("pids", ()))
    uuid = _session_uuid(sid)
    out = []
    for live in board.live_sessions:
        live_id = str(live.get("session_id") or "")
        same_pids = pids & {int(p) for p in live.get("pids") or []}
        if live_id == sid or (uuid and _session_uuid(live_id) == uuid) or same_pids:
            out.append(live)
    return out


def _flat_tree(nodes: list[dict], depth: int, out: list[dict]) -> None:
    for node in nodes:
        out.append(
            {
                "pid": node.get("pid"),
                "ppid": node.get("ppid"),
                "name": node.get("name") or "",
                "role": node.get("role") or None,
                "cpu_percent": _as_number(node.get("cpu_pct")),
                "mem_mb": _as_number(node.get("mem_mb")),
                "depth": depth,
            }
        )
        _flat_tree(node.get("children") or [], depth + 1, out)


def _rate_limit(conn: Any, sid: str, *, facts=None) -> dict | None:
    """The newest rate-limit report that the tool sent for this session, or None."""
    row = next(iter(facts.get("rate", [])), None)
    if not row:
        return None
    try:
        limits = (json.loads(row[1] or "{}") or {}).get("rate_limits")
    except (TypeError, ValueError):
        return None
    if not isinstance(limits, dict) or not limits:
        return None
    windows = []
    for name, value in limits.items():
        if not isinstance(value, dict):
            continue
        used = _as_number(value.get("used_pct", value.get("used_percentage")))
        windows.append({"window": str(name), "used_pct": used, "resets_at": value.get("resets_at") or None})
    return {"ts": row[0], "windows": windows} if windows else None


def _lm_by_extension(history: HistoryScope, sid: str) -> list[dict] | None:
    """VS Code language-model tokens by extension, or None when the session has no such record."""
    from ..analysis.lm_usage import lm_usage

    node, raw = history.split(sid)
    usage = lm_usage(session_events(history.require_reader(), raw, node_scope(node), raw_session=history.qualified,
                                    view="events.lm_usage"))
    rows = [
        {
            "extension": ext,
            "input_tokens": stats.get("input_tokens", 0),
            "output_tokens": stats.get("output_tokens", 0),
            "total_tokens": stats.get("total_tokens", 0),
            "calls": stats.get("calls", 0),
            "models": stats.get("models", []),
        }
        for ext, stats in (usage.get("by_extension") or {}).items()
    ]
    rows.sort(key=lambda r: (-r["total_tokens"], r["extension"]))
    return rows or None


def _agent_resources(
    db: Any, conn: Any, board: _Board, sid: str, row: dict, root: bool, now: float, *, otel_facts=None,
    lm_by_extension: list[dict] | None = None,
) -> dict:
    """Network, state writes, peak CPU and processes from the live monitor, plus rates from the store.

    The monitor values are null when the agent has no live process: aictl keeps them only while it runs.
    """
    started = row.get("started_at")
    calls = row.get("tool_calls")
    minutes = ((row.get("ended_at") or now) - started) / 60.0 if started else 0.0
    per_min = round(calls / max(minutes, 1.0), 2) if calls is not None and minutes > 0 else None
    out: dict = {
        "bytes_in": None,
        "bytes_out": None,
        "state_writes": None,
        "cpu_peak": None,
        "tool_calls_per_min": per_min,
        "rate_limit": None,
        "lm_by_extension": None,
        "process_tree": [],
        "subprocesses": [],
    }
    if not root:
        return out
    out["rate_limit"] = _rate_limit(conn, sid, facts=otel_facts)
    out["lm_by_extension"] = lm_by_extension
    live = _live_matches(board, sid) if sid in board.live_by_sid else []
    if not live:
        return out
    out["bytes_in"] = sum(int(x.get("inbound_bytes") or 0) for x in live)
    out["bytes_out"] = sum(int(x.get("outbound_bytes") or 0) for x in live)
    out["state_writes"] = sum(int(x.get("state_bytes_written") or 0) for x in live)
    peaks = [float(x["peak_cpu_percent"]) for x in live if x.get("peak_cpu_percent") is not None]
    out["cpu_peak"] = round(max(peaks), 2) if peaks else None
    tree: list[dict] = []
    for x in live:
        _flat_tree(x.get("process_tree") or [], 0, tree)
    out["process_tree"] = tree[:MAX_DETAIL_ROWS]
    counts: dict[str, int] = defaultdict(int)
    for x in live:
        for name, n in (x.get("subprocess_count") or {}).items():
            counts[str(name)] += int(n or 0)
    out["subprocesses"] = [{"name": n, "count": c} for n, c in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]
    return out


def _maybe_int(value: Any) -> int | None:
    return None if value is None else int(value)


def _agent_skills(history: HistoryScope, sid: str, agent: str, root: bool) -> list[dict]:
    """The skills that one agent used. A main agent's list also holds its subagents' uses."""
    rows = history.read("skills.agents", sid=sid, requested_agent="" if root else history.split(agent)[1])
    return [
        row | {"started_by": ",".join(row["started_by"]) or None} for row in rows
    ]


_CONTEXT_POINTS = 200


def _agent_context(conn: Any, sid: str, agent: str, root: bool, *,
                   facts=None, raw_agent=None, raw_sid=None, keep_text: bool = True) -> dict | None:
    """Context size per model call of one agent: input, cache read and cache write together.

    A subagent has its own context, so a main agent's figure leaves its subagents out. A drop
    of more than half means that the tool made the context smaller, as compaction does.
    A value that the tool did not report is None. A split belongs to the whole session, so
    only its main agent has one. A main agent's record also has by_agent: the same figures
    (calls, first, last, peak) for the main agent and for each subagent of the session.
    """
    selected = "" if root else (raw_agent or agent)
    sizes = [
        row
        for row in ([r[1:-1] for r in facts.get("call", []) if r[0] == selected])
        if row[0]
    ]
    if not sizes:
        return None
    values = [row[0] for row in sizes]
    step = max(1, len(values) // _CONTEXT_POINTS)

    def newest(index: int) -> int | None:
        return next((row[index] for row in reversed(sizes) if row[index] is not None), None)

    limit = newest(2)
    body_sizes = [row[3] for row in sizes if row[3] is not None]
    events = [r[1:] for r in facts.get("compaction", []) if r[0] == selected]
    split = None
    if root:
        split = next(iter(reversed(facts.get("split", []))), None)
    by_agent = None
    if root:
        per_agent: dict[str, list[int]] = {}
        groups = [(r[0], r[1]) for r in facts.get("call", [])]
        for agent_id, size in groups:
            if size:
                per_agent.setdefault(agent_id or "", []).append(size)
        parts = identity_parts(sid)
        by_agent = [
            # address: how a link opens that agent, with its session (an agent id alone is not unique).
            {"agent_id": a, "address": _agent_key(sid, identity(parts[0], a) if parts and a else a),
             "calls": len(v), "first": v[0], "last": v[-1], "peak": max(v)}
            for a, v in sorted(per_agent.items())
        ]
    result = {
        "tool_tokens": newest(1),
        "prompt_limit": limit,
        "limit_share": values[-1] / limit if limit else None,
        "request_bytes_last": body_sizes[-1] if body_sizes else None,
        "request_bytes_peak": max(body_sizes) if body_sizes else None,
        "available_tools": newest(4),
        "compactions": [
            {
                "ts": ts,
                "tool": tool,
                "trigger": trigger or None,
                "before": before,
                "after": after,
                "freed": before - after if before is not None and after is not None else None,
                "duration_ms": took,
            }
            for ts, tool, trigger, before, after, took in events
        ],
        "split": dict(zip(("ts", "current", "system", "conversation", "tools"), split)) if split else None,
        "calls": len(values),
        "first": values[0],
        "last": values[-1],
        "peak": max(values),
        "drops": sum(1 for before, after in zip(values, values[1:]) if after < before / 2),
        "series": values[::step][:_CONTEXT_POINTS + 1],
    }
    if by_agent is not None:
        result["by_agent"] = by_agent
    breakdown = _context_breakdown(
        conn, raw_sid or sid, raw_agent or agent, root, facts=facts,
        tool=str(sizes[-1][6] or ""), at_ts=float(sizes[-1][5] or 0.0), total=values[-1],
        limit=limit, tool_tokens=sizes[-1][1], split=result["split"], model=str(sizes[-1][7] or ""),
        keep_text=keep_text,
    )
    if breakdown is not None:
        result["breakdown"] = breakdown
    return result


# Context parts: key -> label. See ingesters/context_items for what each kind holds.
_CLAUDE_PARTS = {
    "memory_file": ("memory_files", "Memory files"),
    "skills": ("skills", "Skills"),
    "mcp_instructions": ("mcp_instructions", "MCP instructions"),
    "custom_agents": ("custom_agents", "Custom agents"),
    "tools_listed": ("tools_listed", "Deferred tools"),
}


_COPILOT_SECTION_KINDS = ("instruction_file", "skills", "custom_agents", "system_prompt_other")


_CLAUDE_REST = "System prompt and tool definitions (not itemized)"


_COPILOT_REST = "Conversation (not itemized)"


def _context_item_rows(conn: Any, sid: str, agent: str, root: bool, at_ts: float, *, facts=None) -> list[tuple]:
    """(kind, name, path, tokens) of the items in an agent's context at *at_ts*.

    The newest record of each item counts, unless the tool removed it, or a reset of
    its kind (or of all kinds: a compaction, a new system prompt) came after it.
    A subagent has only its own rows; a main agent the rows without an agent.
    """
    agents = ("", sid) if root else (agent,)
    rows = ([r[1:-1] for r in facts.get("item", []) if r[0] in agents and (r[6] or 0) <= at_ts])
    resets: dict[str, float] = {}
    for kind, name, _p, _t, _r, ts in rows:
        if kind == "reset":
            resets[name] = max(resets.get(name, 0.0), ts or 0.0)
    everything = resets.get("*", 0.0)
    return [
        (kind, name, path or "", int(tokens or 0))
        for kind, name, path, tokens, removed, ts in rows
        if kind != "reset" and not removed and (ts or 0.0) >= max(everything, resets.get(kind, 0.0))
    ]


def _part(key: str, label: str, tokens: int | None, estimated: bool, items: list[dict]) -> dict:
    items = sorted(items, key=lambda i: (-(i["tokens"] or 0), i["name"]))
    return {"key": key, "label": label, "tokens": tokens, "estimated": estimated, "items": items[:MAX_LIST_ROWS], "count": len(items)}


def _read_item_file(path: str) -> str:
    from pathlib import Path

    from ..records import _is_sensitive_path

    p = Path(path) if path else None
    if p is None or not p.is_absolute() or p.suffix.lower() not in {".md", ".mdc"} or _is_sensitive_path(str(p)):
        return ""
    try:
        if p.is_symlink() or not p.is_file() or p.stat().st_size > 500_000:
            return ""
        with p.open(encoding="utf-8", errors="replace") as fh:
            return fh.read(32_768)
    except OSError:
        return ""


def _item(name: str, path: str, tokens: int, texts: dict[str, str] | None = None, *, keep_text: bool = True) -> dict:
    label = _basename(path) if path else name
    row: dict[str, Any] = {"name": label, "path": path or None, "tokens": tokens, "estimated": True}
    raw = ((texts or {}).get(path or name) or (texts or {}).get(label) or _read_item_file(path)) if keep_text else ""
    if raw:
        masked = mask_secrets(raw[:32_768]).strip()
        if masked:
            row["detail"] = _one_line(masked, 120)
            row["text"] = masked
    return row


def _tool_groups(rows: list[tuple]) -> list[dict]:
    """Listed tool names grouped by their MCP server (``mcp__<server>__x``); other names one by one."""
    groups: dict[str, list[int]] = {}
    for _k, name, _p, tokens in rows:
        server = mcp_server_of(name)
        groups.setdefault(f"{server} (MCP)" if server else name, []).append(tokens)
    return [
        {"name": f"{g}: {len(v)} tools" if len(v) > 1 else g, "path": None, "tokens": sum(v), "estimated": True}
        for g, v in groups.items()
    ]


def _segment_calls(conn: Any, sid: str, agent: str, root: bool, at_ts: float, *, facts=None) -> list[tuple[float, int, int]]:
    """(ts, context size, output tokens) of the calls since the agent's last compaction up to *at_ts*."""
    calls = [
        (float(ts or 0.0), int(size), int(out or 0))
        for ts, size, out in ([(r[6], r[1], r[9]) for r in facts.get("call", [])
                               if r[0] == ("" if root else agent) and r[6] <= at_ts])
        if size
    ]
    cut = (max((r[1] for r in facts.get("compaction", []) if r[0] == ("" if root else agent) and r[1] <= at_ts),
               default=None))
    if cut is not None:
        after = [c for c in calls if c[0] > cut]
        calls = after or calls[-1:]
    return calls


# A reply is weighed by its output tokens, which also count thinking and tool call input.
_TOOL_RESULTS, _REPLIES, _PROMPTS = "Tool results", "Replies and tool calls", "User prompts"


def _call_steps(conn: Any, sid: str, agent: str, root: bool, calls: list[tuple[float, int, int]], *, facts=None) -> list[dict]:
    """The growth of the context from each call to the next, given to what came between them.

    A step's growth (call k minus call k-1, measured; below zero counts 0) is shared, in
    proportion to their sizes, among the tool results of the tools called after call k-1,
    the prompts sent after it and the reply of call k-1 (its output tokens). Each tool
    result and prompt belongs to the first call after it.
    """
    if len(calls) < 2:
        return []
    lo, hi = calls[0][0], calls[-1][0]
    agents = ("", sid) if root else (agent,)
    tools = ([r[1:] for r in facts.get("tool", []) if r[0] in agents and lo <= r[1] < hi])
    prompts = ([r[1:] for r in facts.get("prompt", []) if r[0] in agents and lo <= r[1] < hi])
    stamps = [c[0] for c in calls]
    by_call: dict[int, list[tuple[str, str, float]]] = defaultdict(list)
    for ts, name, size in tools:
        by_call[bisect.bisect_right(stamps, ts)].append((_TOOL_RESULTS, str(name or "?"), estimate_tokens_from_size(size or 0)))
    for ts, size in prompts:
        by_call[bisect.bisect_right(stamps, ts)].append((_PROMPTS, "", estimate_tokens_from_size(size or 0)))
    steps = []
    for k in range(1, len(calls)):
        grew = max(0, calls[k][1] - calls[k - 1][1])
        parts = [*by_call.get(k, []), (_REPLIES, "", float(calls[k - 1][2]))]
        weight = sum(w for _k, _n, w in parts)
        if weight <= 0:
            parts = [p for p in parts if p[0] != _REPLIES] or parts
            parts, weight = [(a, b, 1.0) for a, b, _w in parts], float(len(parts))
        shares: dict[tuple[str, str], float] = defaultdict(float)
        for kind, name, w in parts:
            shares[(kind, name)] += grew * w / weight
        top = max(shares.items(), key=lambda kv: kv[1])[0]
        steps.append({"ts": calls[k][0], "tokens": grew, "kind": top[0], "name": top[1] or None, "shares": shares})
    return steps


def _conversation_part(fixed: int, last: int, steps: list[dict]) -> tuple[dict, bool]:
    """The measured conversation: last call minus the first of the segment, with its items by call delta."""
    tokens = last - fixed
    clamped = tokens < 0
    totals: dict[tuple[str, str], float] = defaultdict(float)
    for step in steps:
        for key, value in step["shares"].items():
            totals[key] += value
    items = [
        # The step totals are measured; their share among the items is by size, so the items are estimates.
        {"name": f"{kind}: {name}" if name else kind, "path": None, "tokens": round(v), "estimated": True, "basis": "call delta"}
        for (kind, name), v in totals.items()
        if round(v) > 0
    ]
    return _part("conversation", "Conversation", max(0, tokens), False, items), clamped


def _heaviest(steps: list[dict]) -> list[dict]:
    top = sorted(steps, key=lambda s: -s["tokens"])[:5]
    return [{"ts": s["ts"], "tokens": s["tokens"], "kind": s["kind"], "name": s["name"]} for s in top if s["tokens"] > 0]


def _context_report(conn: Any, sid: str, agent: str, root: bool, *, facts=None) -> dict | None:
    """The latest ``/context`` report of the agent: Claude Code's own count, by category and item."""
    agents = ("", sid) if root else (agent,)
    items = [r for r in facts.get("item", []) if r[0] in agents]
    head = (next(((r[6], r[3], r[4], r[7]) for r in reversed(items) if r[1] == "report"), None))
    if head is None:
        return None
    ts, model, total, limit = head
    rows = ([r[1:5] for r in items if r[1] in ("report_category", "report_item") and r[6] == ts])
    sections: dict[str, list[dict]] = defaultdict(list)
    for kind, name, detail, tokens in rows:
        if kind == "report_item":
            section, _sep, item = name.partition("|")
            sections[section.lower()].append({"name": item, "detail": detail or None, "tokens": tokens})
    parts = []
    for kind, name, _d, tokens in rows:
        if kind != "report_category":
            continue
        # A category's table, when the report has one: "MCP tools" -> "### MCP Tools".
        items = sorted(sections.get(name.lower(), []), key=lambda i: -i["tokens"])[:MAX_LIST_ROWS]
        parts.append({"key": re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_"), "label": name, "tokens": tokens, "items": items})
    parts.sort(key=lambda p: -p["tokens"])
    return {"ts": ts, "model": model or None, "total": total or None, "limit": limit or None, "parts": parts, "source": "claude /context"}


def _context_breakdown(
    conn: Any,
    sid: str,
    agent: str,
    root: bool,
    *,
    tool: str,
    at_ts: float,
    total: int,
    limit: int | None,
    tool_tokens: int | None,
    split: dict | None,
    model: str = "",
    facts=None,
    keep_text: bool = True,
) -> dict | None:
    """What fills an agent's context at its last model call, by part and item, as /context shows it.

    Claude Code: the calls since the last compaction are a segment. Its first call is ``fixed``
    (system prompt, tools, attachments, first prompt); the conversation is the last call minus
    it, measured, with items by call delta. The attachment parts inside ``fixed`` are size
    estimates (utils.estimate_tokens_from_size), scaled down when they add up to more than ``fixed``; ``rest`` is what they leave
    of it. Copilot CLI: the measured split at shutdown, else the system prompt estimate and the
    measured tool definitions. ``clamped`` says that a figure was below zero and is shown as 0.
    ``heaviest`` holds the five calls that grew the context most. ``reported`` is the latest
    ``/context`` report of Claude Code, when the session has one. None when nothing is known.
    """
    rows = _context_item_rows(conn, sid, agent, root, at_ts, facts=facts)
    calls = _segment_calls(conn, sid, agent, root, at_ts, facts=facts) if total else []
    steps = _call_steps(conn, sid, agent, root, calls, facts=facts)
    parts: list[dict] = []
    fixed: int | None = None
    clamped = False
    rest_tokens: int | None = None
    copilot = tool.startswith("copilot") or any(r[0] in ("instruction_file", "system_prompt_other") for r in rows)
    reported = None if copilot else _context_report(conn, sid, agent, root, facts=facts)
    if copilot:
        from ..ingesters.context_items import copilot_system_prompt_texts

        texts = copilot_system_prompt_texts(sid) if keep_text else {}
        if not root:
            split = None
        items = [_item(name, path, tokens, texts, keep_text=keep_text) for kind, name, path, tokens in rows if kind in _COPILOT_SECTION_KINDS and kind != "skills"]
        skills = [r[3] for r in rows if r[0] == "skills"]
        if skills:
            skill_item: dict[str, Any] = {"name": f"Skills: {len(skills)} skills", "path": None, "tokens": sum(skills), "estimated": True}
            if skill_text := texts.get("available_skills"):
                masked = mask_secrets(skill_text[:32_768]).strip()
                if masked:
                    skill_item["detail"] = _one_line(masked, 120)
                    skill_item["text"] = masked
            items.append(skill_item)
        if not items and split is None:
            return None
        if split is not None:
            parts.append(_part("system_prompt", "System prompt", split.get("system"), False, items))
            parts.append(_part("tool_definitions", "Tool definitions", split.get("tools"), False, []))
            parts.append(_part("conversation", "Conversation", split.get("conversation"), False, []))
            rest_label = "Not itemized"
        else:
            parts.append(_part("system_prompt", "System prompt", sum(i["tokens"] for i in items), True, items))
            parts.append(_part("tool_definitions", "Tool definitions", tool_tokens, False, []))
            rest_label = _COPILOT_REST
        known = [p["tokens"] for p in parts]
        if total and all(t is not None for t in known):
            rest_tokens = total - sum(known)
            if rest_tokens < 0:
                rest_tokens, clamped = 0, True
        if calls:
            fixed = calls[0][1]
    elif tool.startswith("claude") or rows:
        if not calls:
            return None
        fixed = calls[0][1]
        by_kind: dict[str, list[tuple]] = {}
        for r in rows:
            if r[0] in _CLAUDE_PARTS:
                by_kind.setdefault(r[0], []).append(r)
        estimate = sum(r[3] for kind_rows in by_kind.values() for r in kind_rows)
        scale = fixed / estimate if estimate > fixed else 1.0
        for kind, kind_rows in by_kind.items():
            key, label = _CLAUDE_PARTS[kind]
            scaled = [(k, n, p, round(t * scale)) for k, n, p, t in kind_rows]
            items = _tool_groups(scaled) if kind == "tools_listed" else [_item(n, p, t, keep_text=keep_text) for _k, n, p, t in scaled]
            part = _part(key, label, sum(r[3] for r in scaled), True, items)
            if scale < 1.0:
                part["scaled"] = round(scale, 4)
            parts.append(part)
        rest_tokens = max(0, fixed - sum(p["tokens"] for p in parts))
        conversation, clamped = _conversation_part(fixed, total, steps)
        parts.append(conversation)
        rest_label = _CLAUDE_REST
        if limit is None and reported and reported["limit"] and (not model or reported["model"] in (None, model)):
            limit = reported["limit"]
    else:
        return None
    parts.sort(key=lambda p: -(p["tokens"] or 0))
    out = {
        "at_ts": at_ts or None,
        "total": total or None,
        "limit": limit or None,
        "fixed": fixed,
        "parts": parts,
        "rest": {"key": "rest", "label": rest_label, "tokens": rest_tokens, "clamped": clamped},
        "heaviest": _heaviest(steps),
    }
    if reported is not None:
        out["reported"] = reported
    return out


def _tool_totals(rows: Iterable[dict]) -> list[dict]:
    """Per tool: calls, failures, run time (total, median, p95, max) and input and output size.

    A call with no recorded time or size does not count toward that figure.
    """
    rows = list(rows)
    servers = known_mcp_servers(t["tool_name"] for t in rows)
    out = []
    for t in rows:
        name = t["tool_name"]
        ms = sorted(exact_values(t, "durations", "timed"))
        ni, no = t["input_count"], t["output_count"]
        out.append({
            "name": name,
            "mcp_server": mcp_server_of(name, servers),
            "calls": t["calls"],
            "failed": t["failures"],
            "total_ms": _ms(sum(ms)) if ms else None,
            "p50_ms": _ms(_percentile(ms, 0.50)),
            "p95_ms": _ms(_percentile(ms, 0.95)),
            "max_ms": _ms(ms[-1]) if ms else None,
            "input_bytes": t["input_bytes"] if ni else None,
            "output_bytes": t["output_bytes"] if no else None,
            "avg_input_bytes": round(t["input_bytes"] / ni) if ni else None,
            "avg_output_bytes": round(t["output_bytes"] / no) if no else None,
            "max_output_bytes": t["max_output_bytes"] if no else None,
        })
    out.sort(key=lambda t: (-t["calls"], t["name"]))
    return out


def _agent_turns(history: HistoryScope, sid: str, requested_agent: str) -> list[dict]:
    """One row per prompt, or per model call for a session with no stored prompt."""
    return [
        {
            "ts": row["ts"], "text": mask_secrets(row["text"]), "tools": row["tools"],
            "model": row["model"] if row["calls"] else None,
            "input": row["input_tokens"], "output": row["output_tokens"],
            "cache_read": row["cache_read_tokens"], "cache_write": row["cache_creation_tokens"],
            "cost_usd": _usd(row["cost_usd"]), "subagent_calls": row["subagent_calls"], "reply_ms": row["reply_ms"] or None,
        }
        for row in history.read("prompts.turns", sid=sid, requested_agent=requested_agent, limit=MAX_DETAIL_ROWS, page=True)
    ]


def _one_row_per_session(rows: list[dict]) -> list[dict]:
    """Drop extra rows for a session recorded under several ids (in place order).

    A hook row and a correlator ``tool:pid:<uuid>`` row share a UUID, so both
    resolve to one transcript and would each report its full totals. The first
    row stays (a live row keeps its live fields) and takes the transcript's
    numbers if another row has them.
    """
    from ..records import _USAGE_PROFILE_KEYS, _session_uuid

    kept: dict[str, dict] = {}
    out: list[dict] = []
    for row in rows:
        uuid = _session_uuid(row.get("session_id", ""))
        if uuid is None:
            out.append(row)
            continue
        first = kept.get(uuid)
        if first is None:
            kept[uuid] = row
            out.append(row)
        elif row.get("tokens_source") == "transcript" and first.get("tokens_source") != "transcript":
            first.update({k: row[k] for k in _USAGE_PROFILE_KEYS if k in row})
    return out
