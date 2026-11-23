"""The Insights screen: what the stored agent history shows, one finding per card.

Each card reads one Kusto view for the board's period and returns its figures, the sessions to open
first, when the view ran and the KQL it ran. Cards are separate routes, so one slow or failed card
does not hold up another. A figure the source does not report is None, never 0.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

from .board_filters import Filters
from .panel_kql import query_block
from .projections.history import HistoryScope

ROW_LIMIT = 1000
CARDS = {
    "pause": "insights.pause_tax",
    "carry": "insights.context_carry",
    "subagents": "insights.subagents",
    "failures": "insights.after_failure",
    "rereads": "insights.rereads",
}
ROUTES = {f"/api/board/insights/{card}": card for card in CARDS}
BUCKETS = ("under_1m", "1_5m", "5_60m", "over_60m")
LONG_PAUSE = ("5_60m", "over_60m")
OUTCOMES = ("identical_failed", "identical_succeeded", "changed_failed", "changed_succeeded", "other_tool")
SHOWN_TOOL_NAMES = 10


def _n(value: Any) -> float:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else 0.0


def _int(value: Any) -> int:
    return int(_n(value))


def _cost(value: Any) -> float | None:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _ratio(part: float, whole: float) -> float | None:
    return part / whole if whole else None


def _of(rows: list[dict], kind: str) -> list[dict]:
    return [row for row in rows if row.get("row_type") == kind]


def _sessions(rows: list[dict], fields: tuple[str, ...]) -> list[dict]:
    return [{"session_id": row.get("session_id"), "node_id": row.get("node_id"), "tool": row.get("tool"),
             **{field: row.get(field) for field in fields}} for row in _of(rows, "session") if row.get("session_id")]


def pause_tax(rows: list[dict]) -> dict:
    """Per tool and pause bucket: requests, cache-hit share of input and cost; the tax of pauses over 5 minutes."""
    reported = {row.get("tool"): _n(row.get("cache_creation_tokens")) > 0 for row in _of(rows, "tool")}
    cells = {(row.get("tool"), row.get("bucket")): row for row in _of(rows, "bucket")}
    tools = []
    for tool in sorted(reported):
        buckets = []
        for bucket in BUCKETS:
            row = cells.get((tool, bucket), {})
            requests = _int(row.get("requests"))
            priced = _int(row.get("priced"))
            cost = _cost(row.get("cost_usd")) if priced else None
            sent = _n(row.get("input_tokens")) + _n(row.get("cache_read_tokens")) + _n(row.get("cache_creation_tokens"))
            buckets.append({
                "bucket": bucket, "requests": requests, "priced": priced,
                "cache_hit_share": _ratio(_n(row.get("cache_read_tokens")), sent) if reported[tool] else None,
                "avg_cost_usd": cost / priced if cost is not None else None, "cost_usd": cost,
            })
        tools.append({"tool": tool, "cache_reported": reported[tool], "buckets": buckets})
    long_requests, long_cost, baseline, counted = 0, 0.0, 0.0, []
    for tool in tools:
        if not tool["cache_reported"]:
            continue
        quick = tool["buckets"][0]["avg_cost_usd"]
        late = [cell for cell in tool["buckets"] if cell["bucket"] in LONG_PAUSE and cell["cost_usd"] is not None]
        if quick is None or not late:
            continue
        counted.append(tool["tool"])
        priced = sum(cell["priced"] for cell in late)
        long_requests += priced
        long_cost += sum(cell["cost_usd"] for cell in late)
        baseline += priced * quick
    return {
        "tools": tools,
        "summary": {
            "tools": counted, "requests": long_requests, "cost_usd": long_cost if counted else None,
            "baseline_usd": baseline if counted else None, "extra_usd": long_cost - baseline if counted else None,
            "not_reported": [tool["tool"] for tool in tools if not tool["cache_reported"]],
        },
        "sessions": sorted(_sessions(rows, ("requests", "cost_usd")),
                           key=lambda row: (-_n(row["cost_usd"]), -_n(row["requests"]))),
    }


def context_carry(rows: list[dict]) -> dict:
    """Per tool name: calls, result bytes, later requests and bytes carried (an upper bound)."""
    names = sorted(_of(rows, "tool_name"), key=lambda row: -_n(row.get("carried_bytes")))
    tool_names = [{
        "tool": row.get("tool"), "tool_name": row.get("tool_name"), "calls": _int(row.get("calls")),
        "output_bytes": _int(row.get("output_bytes")), "carried_bytes": _n(row.get("carried_bytes")),
        "avg_later_requests": _ratio(_n(row.get("later_requests")), _n(row.get("calls"))),
    } for row in names[:SHOWN_TOOL_NAMES]]
    tools = [{
        "tool": row.get("tool"), "calls": _int(row.get("calls")), "reported": _int(row.get("reported")),
        "output_bytes": _int(row.get("output_bytes")) if _int(row.get("reported")) else None,
        "carried_bytes": _n(row.get("carried_bytes")) if _int(row.get("reported")) else None,
    } for row in sorted(_of(rows, "tool"), key=lambda row: -_n(row.get("carried_bytes")))]
    produced = sum(_n(tool["output_bytes"]) for tool in tools)
    carried = sum(_n(tool["carried_bytes"]) for tool in tools)
    top = tool_names[0] if tool_names else None
    return {
        "tool_names": tool_names, "tools": tools,
        "summary": {
            "output_bytes": produced if any(tool["reported"] for tool in tools) else None,
            "carried_bytes": carried if any(tool["reported"] for tool in tools) else None,
            "top": top, "not_reported": [tool["tool"] for tool in tools if not tool["reported"]],
        },
        "sessions": sorted(_sessions(rows, ("calls", "output_bytes", "carried_bytes")),
                           key=lambda row: -_n(row["carried_bytes"])),
    }


def subagents(rows: list[dict]) -> dict:
    """Per tool: requests and cost of the main agent against subagents, and how many subagents ran."""
    split: dict[str, dict] = {}
    for row in _of(rows, "split"):
        side = "subagents" if row.get("subagent") else "main"
        priced = _int(row.get("priced"))
        split.setdefault(row.get("tool"), {})[side] = {
            "requests": _int(row.get("requests")), "priced": priced,
            "cost_usd": _cost(row.get("cost_usd")) if priced else None,
            **({"agents": _int(row.get("agents"))} if side == "subagents" else {}),
        }
    empty = {"requests": 0, "priced": 0, "cost_usd": None}
    tools = []
    for tool, sides in sorted(split.items()):
        main, sub = sides.get("main", empty), sides.get("subagents", {**empty, "agents": 0})
        both = _n(main["cost_usd"]) + _n(sub["cost_usd"])
        priced = main["cost_usd"] is not None or sub["cost_usd"] is not None
        tools.append({"tool": tool, "main": main, "subagents": sub,
                      "subagent_share": _ratio(_n(sub["cost_usd"]), both) if priced else None})
    tools.sort(key=lambda tool: -(_n(tool["main"]["cost_usd"]) + _n(tool["subagents"]["cost_usd"])))
    main_cost = sum(_n(tool["main"]["cost_usd"]) for tool in tools)
    sub_cost = sum(_n(tool["subagents"]["cost_usd"]) for tool in tools)
    priced = any(tool["subagent_share"] is not None for tool in tools)
    return {
        "tools": tools,
        "summary": {
            "main_cost_usd": main_cost if priced else None, "subagent_cost_usd": sub_cost if priced else None,
            "subagent_share": _ratio(sub_cost, main_cost + sub_cost) if priced else None,
            "subagents": sum(tool["subagents"]["agents"] for tool in tools),
            "subagent_requests": sum(tool["subagents"]["requests"] for tool in tools),
        },
        "sessions": sorted(_sessions(rows, ("requests", "cost_usd", "main_cost", "agents")),
                           key=lambda row: (-_n(row["cost_usd"]), -_n(row["requests"]))),
    }


def after_failure(rows: list[dict]) -> dict:
    """Per tool: what the next call after a failed call is, and runs of three or more failed calls."""
    outcomes: dict[str, dict[str, int]] = {}
    for row in _of(rows, "outcome"):
        if row.get("outcome") in OUTCOMES:
            outcomes.setdefault(row.get("tool"), dict.fromkeys(OUTCOMES, 0))[row["outcome"]] = _int(row.get("calls"))
    streaks = {row.get("tool"): row for row in _of(rows, "streaks")}
    tools = []
    for row in _of(rows, "tool"):
        tool = row.get("tool")
        failures = _int(row.get("failures"))
        if not failures:
            continue
        found = streaks.get(tool, {})
        tools.append({
            "tool": tool, "calls": _int(row.get("calls")), "failures": failures,
            "last_failures": _int(row.get("last_failures")), "outcomes": outcomes.get(tool, dict.fromkeys(OUTCOMES, 0)),
            "streaks": _int(found.get("streaks")), "streak_calls": _int(found.get("streak_calls")),
            "longest": _int(found.get("longest")) or None,
        })
    tools.sort(key=lambda tool: -tool["failures"])
    longest = max((tool["longest"] or 0 for tool in tools), default=0)
    return {
        "tools": tools,
        "summary": {
            "failures": sum(tool["failures"] for tool in tools),
            "followed": sum(sum(tool["outcomes"].values()) for tool in tools),
            **{name: sum(tool["outcomes"][name] for tool in tools) for name in OUTCOMES},
            "streaks": sum(tool["streaks"] for tool in tools), "streak_calls": sum(tool["streak_calls"] for tool in tools),
            "longest": longest or None,
        },
        "sessions": sorted(_sessions(rows, ("longest", "streaks", "streak_calls")),
                           key=lambda row: (-_n(row["longest"]), -_n(row["streak_calls"]))),
    }


def rereads(rows: list[dict]) -> dict:
    """Per tool: reads of a file the same session and agent already read, files read 5 times or more, bytes again."""
    coverage = {row.get("tool"): row for row in _of(rows, "coverage")}
    tools = []
    for row in _of(rows, "tool"):
        reads, again = _int(row.get("reads")), _int(row.get("repeat_reads"))
        tools.append({
            "tool": row.get("tool"), "reads": reads, "repeat_reads": again, "repeat_share": _ratio(again, reads),
            "files": _int(row.get("files")), "files_5plus": _int(row.get("files_5plus")), "most_reads": _int(row.get("most_reads")),
            "repeat_bytes": _n(row.get("repeat_bytes")) if _int(row.get("sized")) else None,
            "unmatched": _int(coverage.get(row.get("tool"), {}).get("unmatched")),
        })
    tools.sort(key=lambda tool: -tool["repeat_reads"])
    reads = sum(tool["reads"] for tool in tools)
    again = sum(tool["repeat_reads"] for tool in tools)
    sized = [tool["repeat_bytes"] for tool in tools if tool["repeat_bytes"] is not None]
    return {
        "tools": tools,
        "summary": {
            "reads": reads, "repeat_reads": again, "repeat_share": _ratio(again, reads),
            "files_5plus": sum(tool["files_5plus"] for tool in tools),
            "repeat_bytes": sum(sized) if sized else None, "unmatched": sum(tool["unmatched"] for tool in tools),
        },
        "sessions": sorted(_sessions(rows, ("repeat_reads", "reads", "files_5plus", "most_reads")),
                           key=lambda row: -_n(row["repeat_reads"])),
    }


SHAPES: dict[str, Callable[[list[dict]], dict]] = {
    "pause": pause_tax, "carry": context_carry, "subagents": subagents, "failures": after_failure, "rereads": rereads,
}
# Each view is named literally where it is read, so the history paging guard can check that it is bounded.
READS: dict[str, Callable[[HistoryScope, dict], list[dict]]] = {
    "pause": lambda history, params: history.read("insights.pause_tax", limit=ROW_LIMIT, **params),
    "carry": lambda history, params: history.read("insights.context_carry", limit=ROW_LIMIT, **params),
    "subagents": lambda history, params: history.read("insights.subagents", limit=ROW_LIMIT, **params),
    "failures": lambda history, params: history.read("insights.after_failure", limit=ROW_LIMIT, **params),
    "rereads": lambda history, params: history.read("insights.rereads", limit=ROW_LIMIT, **params),
}


def insight(card: str, filters: Filters, now: float | None = None, *, history: HistoryScope) -> tuple[int, dict]:
    """One card: its figures for the board's period, the sessions to open, and the KQL that produced them."""
    if card not in CARDS:
        return 404, {"error": "No such insight"}
    view = CARDS[card]
    params = {"since": filters.since, "until": filters.until}
    rows = READS[card](history, params)
    meta = next(iter(_of(rows, "meta")), {})
    node = {} if history.node is None else {"all_nodes": False, "requested_node": history.node}
    return 200, {
        "card": card, "view": view,
        "range": {"since": filters.since, "until": filters.until},
        "data_range": {"first_ts": meta.get("first_ts"), "last_ts": meta.get("last_ts")},
        "computed_at": _cost(meta.get("computed_at")) or (time.time() if now is None else now),
        **SHAPES[card](rows),
        "query": query_block(history, view, {**params, **node, "limit": ROW_LIMIT}),
    }
