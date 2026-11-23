"""MCP servers and tools on the board: per-server and per-tool calls, sessions, failures, time and result size."""

from __future__ import annotations

import math
import time
from collections import defaultdict
from typing import Any

from ..tool_scope import stored_ids_for
from ..utils import estimate_tokens_from_size
from .board_filters import Filters
from .board_projection import _tool_error_key
from .panel_kql import query_block
from .projection_utils import _one_line, known_mcp_servers, mcp_server_of
from .projections.history import HistoryScope

TOOL_LIMIT = 500
SESSION_LIMIT = 200
FAILURE_LIMIT = 500
# A histogram bucket b holds durations of about 10^(b/20) ms.
BUCKETS_PER_DECADE = 20

BUILTIN = "builtin"
UNKNOWN = "unknown"
DEFINITIONS = {
    "calls": "Tool calls in the time range, newest version of each call.",
    "sessions": "Sessions with at least one call of the tool or server.",
    "failures": "Calls the tool reported as failed (is_error).",
    "fail_rate": "Failures divided by calls.",
    "total_ms": "Sum of the recorded call durations. Calls without a duration add nothing.",
    "p50_ms": "Median call duration, read from a log-scale histogram (within 6 %).",
    "p95_ms": "95th percentile call duration, read from a log-scale histogram (within 6 %).",
    "output_bytes": "Sum of the recorded result sizes.",
    "est_tokens": "Estimate: result bytes divided by 4. Not a tokenizer count.",
    "time_share": "This row's total duration divided by the total duration of all tool calls in the range.",
    "server": "The MCP server named by the tool name (mcp__server__tool, mcp:server:tool, server/tool). "
              "For mcp_a_b names the server is resolved only against server names seen in other forms.",
}


def _group_of(name: str, known: set[str]) -> tuple[str, str]:
    server = mcp_server_of(name, known)
    if server is None:
        return BUILTIN, ""
    return ("mcp", server) if server else (UNKNOWN, "")


def _group_id(kind: str, server: str) -> str:
    return f"mcp:{server}" if kind == "mcp" else kind


def _group_label(kind: str, server: str) -> str:
    return server if kind == "mcp" else "Built-in tools" if kind == BUILTIN else "Unknown MCP server"


def _merge(into: dict[int, int], hist: Any) -> None:
    for key, count in (hist or {}).items():
        try:
            into[int(key)] += int(count)
        except (TypeError, ValueError):
            continue


def _quantile(hist: dict[int, int], q: float) -> float | None:
    total = sum(hist.values())
    if not total:
        return None
    rank = max(1, math.ceil(q * total))
    seen = 0
    for bucket in sorted(hist):
        seen += hist[bucket]
        if seen >= rank:
            return round(10 ** (bucket / BUCKETS_PER_DECADE), 1)
    return None


def _figures(calls: int, failures: int, total_ms: float | None, output_bytes: int | None, output_count: int,
             hist: dict[int, int], all_ms: float) -> dict:
    measured = output_bytes if output_count else None
    return {
        "calls": calls,
        "failures": failures,
        "fail_rate": round(failures / calls, 4) if calls else None,
        "total_ms": round(total_ms, 1) if total_ms else None,
        "p50_ms": _quantile(hist, 0.50),
        "p95_ms": _quantile(hist, 0.95),
        "output_bytes": measured,
        "est_tokens": estimate_tokens_from_size(measured) if measured is not None else None,
        "time_share": round(total_ms / all_ms, 4) if total_ms and all_ms else None,
    }


def group_rows(rows: list[dict]) -> dict:
    """The panel body from the rows of ``tools.mcp``: one row per group with its tools as children."""
    tools = [r for r in rows if r.get("row_type") == "tool"]
    totals = next((r for r in rows if r.get("row_type") == "totals"), {}) or {}
    all_ms = float(totals.get("total_ms") or 0.0)
    known = known_mcp_servers(r["tool_name"] for r in tools)
    groups: dict[str, dict] = {}
    for row in tools:
        kind, server = _group_of(row["tool_name"], known)
        gid = _group_id(kind, server)
        group = groups.setdefault(gid, {
            "id": gid, "kind": kind, "server": server, "label": _group_label(kind, server),
            "calls": 0, "failures": 0, "total_ms": 0.0, "output_bytes": 0, "output_count": 0,
            "hist": defaultdict(int), "session_set": set(), "sessions_capped": False, "tools": [],
            "first_ts": None, "last_ts": None,
        })
        hist: dict[int, int] = defaultdict(int)
        _merge(hist, row.get("hist"))
        calls, failures = int(row.get("calls") or 0), int(row.get("failures") or 0)
        group["calls"] += calls
        group["failures"] += failures
        group["total_ms"] += float(row.get("total_ms") or 0.0)
        group["output_bytes"] += int(row.get("output_bytes") or 0)
        group["output_count"] += int(row.get("output_count") or 0)
        _merge(group["hist"], hist)
        members = row.get("session_set") or []
        group["session_set"].update(members)
        group["sessions_capped"] |= len(members) < int(row.get("sessions") or 0)
        for key, pick in (("first_ts", min), ("last_ts", max)):
            if row.get(key) is not None:
                group[key] = row[key] if group[key] is None else pick(group[key], row[key])
        group["tools"].append({
            "name": row["tool_name"], "sessions": row.get("sessions"),
            **_figures(calls, failures, row.get("total_ms"), row.get("output_bytes"), int(row.get("output_count") or 0),
                       hist, all_ms),
            "last_ts": row.get("last_ts"),
        })
    out = []
    for group in groups.values():
        sessions: int | None = len(group["session_set"])
        if group["kind"] == BUILTIN:
            sessions = totals.get("builtin_sessions")
        out.append({
            "id": group["id"], "kind": group["kind"], "server": group["server"], "label": group["label"],
            "sessions": sessions, "sessions_at_least": group["kind"] != BUILTIN and group["sessions_capped"],
            "tool_count": len(group["tools"]),
            **_figures(group["calls"], group["failures"], group["total_ms"], group["output_bytes"], group["output_count"],
                       group["hist"], all_ms),
            "first_ts": group["first_ts"], "last_ts": group["last_ts"],
            "tools": sorted(group["tools"], key=lambda t: (-t["calls"], t["name"])),
        })
    # MCP servers first by calls, then the unknown-server group, then the built-in tools.
    order = {"mcp": 0, UNKNOWN: 1, BUILTIN: 2}
    out.sort(key=lambda g: (order[g["kind"]], -g["calls"], g["label"]))
    shown = sum(g["tool_count"] for g in out)
    return {
        "groups": out,
        "totals": {
            "calls": totals.get("calls"), "failures": totals.get("failures"), "sessions": totals.get("sessions"),
            "total_ms": round(all_ms, 1) if all_ms else None, "tool_names": totals.get("tool_names"),
            "tool_names_shown": shown,
        },
        "definitions": DEFINITIONS,
    }


def _scope_params(history: HistoryScope, filters: Filters, now: float) -> dict:
    """Window and selection of the board. A tool selection alone is passed as it is; any other
    narrowing selects the board's sessions first, as the tool and error drawers do."""
    params: dict[str, Any] = {"since": filters.since, "until": filters.until}
    if filters.tools is not None:
        params |= {"restrict_tools": True, "requested_tools": stored_ids_for(filters.tools)}
    if filters.project or filters.model or filters.q or filters.status != "all":
        from .artifact_details import _detail_scope

        params |= {k: v for k, v in _detail_scope(history, filters, now).items() if k in ("restrict_sessions", "session_keys")}
    return params


def mcp_board(filters: Filters, now: float | None = None, *, history: HistoryScope) -> tuple[int, dict]:
    """The MCP servers and tools panel for the board's filters. One query when only the time or tools are chosen."""
    now = time.time() if now is None else now
    params = _scope_params(history, filters, now)
    rows = history.read("tools.mcp", limit=TOOL_LIMIT, page=True, **params)
    body = group_rows(rows)
    body["range"] = {"since": filters.since, "until": filters.until}
    body["query"] = query_block(history, "tools.mcp", {**params, **_node(history), "limit": TOOL_LIMIT})
    return 200, body


def _node(history: HistoryScope) -> dict:
    return {} if history.node is None else {"all_nodes": False, "requested_node": history.node}


def mcp_server_detail(group: str, filters: Filters, now: float | None = None, *, history: HistoryScope) -> tuple[int, dict]:
    """One group of the panel (``mcp:<server>``, ``unknown`` or ``builtin``): its tools, a time series,
    the failure texts grouped as in the error panel, and the sessions that called it."""
    now = time.time() if now is None else now
    params = _scope_params(history, filters, now)
    panel = group_rows(history.read("tools.mcp", limit=TOOL_LIMIT, page=True, **params))
    found = next((g for g in panel["groups"] if g["id"] == group), None)
    if found is None:
        return 200, {"id": group, "label": group.removeprefix("mcp:") if group.startswith("mcp:") else group,
                     "group": None, "series": [], "errors": [], "sessions": [], "failures_read": 0,
                     "definitions": DEFINITIONS, "range": {"since": filters.since, "until": filters.until},
                     "query": None}
    names = [tool["name"] for tool in found["tools"]]
    grid = max(1, min(filters.buckets, 96))
    detail_params = {**params, "grid": grid, "requested_tool_names": names}
    rows = history.read("tools.mcp_detail", limit=SESSION_LIMIT + FAILURE_LIMIT + grid + 1, page=True, **detail_params)
    step = (filters.until - filters.since) / grid
    series = [{"ts": filters.since + g * step, "calls": 0, "failures": 0, "total_ms": None} for g in range(grid)]
    for row in rows:
        if row.get("row_type") == "bucket" and row.get("g") is not None and 0 <= int(row["g"]) < grid:
            series[int(row["g"])] |= {"calls": row["calls"], "failures": row["failures"], "total_ms": row.get("total_ms") or None}
    sessions = sorted((r for r in rows if r.get("row_type") == "session"), key=lambda r: (-r["calls"], r["session_id"]))
    titles = _titles(history, {r["session_id"] for r in sessions}, now)
    errors: dict[str, dict] = {}
    failures = [r for r in rows if r.get("row_type") == "failure"]
    for row in failures:
        key = _tool_error_key(row["tool_name"], row.get("result_summary"))
        entry = errors.setdefault(key, {"key": key, "tool": row["tool_name"], "count": 0, "last_ts": row["ts"],
                                        "sample": _one_line(row.get("result_summary"), 200) or None})
        entry["count"] += 1
        entry["last_ts"] = max(entry["last_ts"], row["ts"])
    return 200, {
        "id": group, "label": found["label"], "group": found,
        "series": series, "bucket_s": step,
        "errors": sorted(errors.values(), key=lambda e: (-e["count"], -e["last_ts"])),
        "failures_read": len(failures), "failures_total": found["failures"],
        "sessions": [{
            "session_id": r["session_id"], "node_id": r.get("node_id"), "title": titles.get(r["session_id"]) or r["session_id"],
            "calls": r["calls"], "failures": r["failures"], "total_ms": r.get("total_ms") or None,
            "output_bytes": r.get("output_bytes"), "first_ts": r.get("first_ts"), "last_ts": r.get("last_ts"),
            "tools": sorted(r.get("tool_list") or []),
        } for r in sessions],
        "sessions_total": found["sessions"],
        "definitions": DEFINITIONS, "range": {"since": filters.since, "until": filters.until},
        "query": query_block(history, "tools.mcp_detail", {**detail_params, **_node(history),
                                                           "limit": SESSION_LIMIT + FAILURE_LIMIT + grid + 1}),
    }


def _titles(history: HistoryScope, sids: set[str], now: float) -> dict[str, str]:
    from .artifact_details import _history_titles

    if not sids:
        return {}
    return {sid: title for (sid, _aid), title in _history_titles(history, {(sid, sid) for sid in sids}, now).items()}
