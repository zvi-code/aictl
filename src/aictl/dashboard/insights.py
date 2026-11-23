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
from .projection_utils import _label
from .projections.history import HistoryScope

ROW_LIMIT = 1000
CARDS = {
    "pause": "insights.pause_tax",
    "carry": "insights.context_carry",
    "subagents": "insights.subagents",
    "failures": "insights.after_failure",
    "rereads": "insights.rereads",
    "time": "insights.time_split",
    "context": "insights.context_weight",
    "orientation": "insights.orientation",
    "fixed": "insights.fixed_context",
    "problems": "insights.problem_sessions",
    "autonomy": "insights.work_per_instruction",
    "verified": "insights.verified_commits",
}
ROUTES = {f"/api/board/insights/{card}": card for card in CARDS}
BUCKETS = ("under_1m", "1_5m", "5_60m", "over_60m")
LONG_PAUSE = ("5_60m", "over_60m")
OUTCOMES = ("identical_failed", "identical_succeeded", "changed_failed", "changed_succeeded", "other_tool")
SHOWN_TOOL_NAMES = 10
CONTEXT_BUCKETS = ("under_50k", "50_100k", "100_200k", "200_500k", "over_500k")
HEAVY_CONTEXT = ("200_500k", "over_500k")
# The kinds of a session's fixed context (ingesters/context_items.py), in the order the card stacks them.
FIXED_KINDS = ("instruction_file", "memory_file", "system_prompt_other", "skills", "mcp_instructions", "custom_agents",
               "tools_listed")
# The problem signals of insights.problem_sessions, in the order the card lists them.
SIGNALS = ("compaction", "failure_streak", "failed_delegation", "api_error", "open_todos", "hook_failure")
# The runs of failed calls, as insights.after_failure and insights.problem_sessions both define them (each view
# carries this text as it is; test_insights checks it).
# The counts of insights.verified_commits, one row per tool; the view leaves a count null where the tool does not
# record it (no command text: commits; no recorded result: failed; no exit code of 0: passed).
VERIFIED_COUNTS = ("commits", "passed", "unreported", "failed", "changed_after", "never_tested", "no_change", "unknown_change",
                   "not_recorded", "by_subagent", "own_unseen", "commit_sessions", "top_session_commits", "edit_sessions",
                   "untested_sessions", "commands", "commands_with_text", "test_runs", "test_results", "remote_commits",
                   "edits_no_file", "sessions_no_text", "sessions_edits_unrecorded")
# The tools whose rows record an exit code of 0, so a pass can be reported (PassTools in insights.verified_commits).
VERIFIED_PASS_TOOLS = ("copilot-cli", "copilot-desktop")
# The runs of failed calls, as insights.after_failure and insights.problem_sessions both define them (each view
# carries this text as it is; test_insights checks it).
FAILURE_RUNS_KQL = """let failure_runs = (calls:(node_id:string, session_id:string, agent_id:string, ts:real, fact_key:string, failed:bool)) {
    // A run: consecutive calls of one session and agent, in time order, that all failed. Each call gets its run's id.
    calls
    | sort by node_id asc, session_id asc, agent_id asc, ts asc, fact_key asc
    | extend restart=row_number() == 1 or prev(node_id) != node_id or prev(session_id) != session_id
        or prev(agent_id) != agent_id or not(failed) or not(prev(failed))
    | extend run=row_cumsum(tolong(restart))
};
let failure_streaks = (ordered:(run:long, failed:bool, tool:string, node_id:string, session_id:string)) {
    // A failure streak: a run of 3 or more failed calls.
    ordered
    | where failed
    | summarize calls=count(), tool=take_any(tool), node_id=take_any(node_id), session_id=take_any(session_id) by run
    | where calls >= 3
};
"""


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
            "unpriced_requests": _unpriced([cell for tool in tools if tool["cache_reported"]
                                            for cell in tool["buckets"] if cell["bucket"] in LONG_PAUSE]),
        },
        "sessions": sorted(_sessions(rows, ("requests", "cost_usd")),
                           key=lambda row: (-_n(row["cost_usd"]), -_n(row["requests"]))),
    }


def _unpriced(cells: list[dict]) -> int:
    """Requests a cost total leaves out: their model had no list price when they were stored, or they were
    stored with no cost because none can be known (data.provenance.CACHE_NOT_REPORTED)."""
    return sum(cell["requests"] - cell["priced"] for cell in cells)


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
            "unpriced_requests": _unpriced([tool[side] for tool in tools for side in ("main", "subagents")]),
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


def _timed(value: Any, timed: int) -> float | None:
    return _n(value) if timed else None


def time_split(rows: list[dict]) -> dict:
    """Per tool: summed request time (of which thinking) and summed tool-call time; per program: calls and time.

    A row with no duration, or one over 24 hours (a recording error), is not summed and is counted apart.
    """
    model = {row.get("tool"): row for row in _of(rows, "model")}
    calls = {row.get("tool"): row for row in _of(rows, "calls")}
    tools = []
    for tool in sorted(set(model) | set(calls)):
        m, c = model.get(tool, {}), calls.get(tool, {})
        requests, timed, reported = _int(m.get("requests")), _int(m.get("timed")), _int(m.get("thinking_reported"))
        made, called = _int(c.get("calls")), _int(c.get("timed"))
        tools.append({
            "tool": tool, "requests": requests, "untimed_requests": requests - timed - _int(m.get("overlong")),
            "overlong_requests": _int(m.get("overlong")),
            "model_ms": _timed(m.get("duration_ms"), timed), "thinking_ms": _timed(m.get("thinking_ms"), reported),
            "calls": made, "untimed_calls": made - called - _int(c.get("overlong")), "overlong_calls": _int(c.get("overlong")),
            "overlong_ms": _n(m.get("overlong_ms")) + _n(c.get("overlong_ms")),
            "tool_ms": _timed(c.get("duration_ms"), called),
        })
    tools.sort(key=lambda tool: -(_n(tool["model_ms"]) + _n(tool["tool_ms"])))
    programs = [{
        "group": row.get("group"), "program": row.get("program") or None, "calls": _int(row.get("calls")),
        "untimed": _int(row.get("calls")) - _int(row.get("timed")) - _int(row.get("overlong")),
        "overlong": _int(row.get("overlong")),
        "duration_ms": _timed(row.get("duration_ms"), _int(row.get("timed"))),
        "p50_ms": _cost(row.get("p50_ms")), "p95_ms": _cost(row.get("p95_ms")),
        "failure_share": _ratio(_n(row.get("failures")), _n(row.get("calls"))),
    } for row in _of(rows, "program")]
    programs.sort(key=lambda row: (-_n(row["duration_ms"]), row["group"] or "", row["program"] or ""))
    named = [row for row in programs if row["group"] == "program"]
    model_ms = [tool["model_ms"] for tool in tools if tool["model_ms"] is not None]
    thinking = [tool["thinking_ms"] for tool in tools if tool["thinking_ms"] is not None]
    tool_ms = [tool["tool_ms"] for tool in tools if tool["tool_ms"] is not None]
    return {
        "tools": tools, "programs": programs,
        "summary": {
            "model_ms": sum(model_ms) if model_ms else None, "thinking_ms": sum(thinking) if thinking else None,
            "tool_ms": sum(tool_ms) if tool_ms else None,
            "thinking_reported": [tool["tool"] for tool in tools if tool["thinking_ms"] is not None],
            "untimed_requests": sum(tool["untimed_requests"] for tool in tools),
            "untimed_calls": sum(tool["untimed_calls"] for tool in tools),
            "overlong": sum(tool["overlong_requests"] + tool["overlong_calls"] for tool in tools),
            "overlong_ms": sum(tool["overlong_ms"] for tool in tools),
            "top_program": named[0] if named else None,
        },
        "sessions": sorted(_sessions(rows, ("tool_ms", "calls", "model_ms", "requests")), key=lambda row: -_n(row["tool_ms"])),
    }


def context_weight(rows: list[dict]) -> dict:
    """Per tool and context bucket: requests and cost; per tool: median and 90th percentile context, and small steps."""
    cells = {(row.get("tool"), row.get("bucket")): row for row in _of(rows, "bucket")}
    tools = []
    for row in sorted(_of(rows, "tool"), key=lambda row: str(row.get("tool") or "")):
        tool, reported = row.get("tool"), _int(row.get("reported"))
        found = [cells.get((tool, bucket), {}) for bucket in CONTEXT_BUCKETS]
        priced = [cell for cell in found if _int(cell.get("priced"))]
        cost = sum(_n(cell.get("cost_usd")) for cell in priced) if priced else None
        buckets = [{
            "bucket": bucket, "requests": _int(cell.get("requests")), "priced": _int(cell.get("priced")),
            "cost_usd": _cost(cell.get("cost_usd")) if _int(cell.get("priced")) else None,
            "request_share": _ratio(_n(cell.get("requests")), reported) if reported else None,
            "cost_share": _ratio(_n(cell.get("cost_usd")), cost) if cost is not None else None,
        } for bucket, cell in zip(CONTEXT_BUCKETS, found)]
        heavy = [cell for cell in buckets if cell["bucket"] in HEAVY_CONTEXT]
        small, small_priced = _int(row.get("small")), _int(row.get("small_priced"))
        tools.append({
            "tool": tool, "requests": _int(row.get("requests")), "reported": reported,
            "p50_context": _cost(row.get("p50_context")) if reported else None,
            "p90_context": _cost(row.get("p90_context")) if reported else None,
            "cost_usd": cost, "buckets": buckets,
            "heavy_requests": sum(cell["requests"] for cell in heavy),
            "heavy_cost_usd": sum(_n(cell["cost_usd"]) for cell in heavy) if cost is not None else None,
            "small_requests": small if reported else None,
            "small_cost_usd": None if not reported or cost is None or (small and not small_priced) else _n(row.get("small_cost")),
        })
    tools.sort(key=lambda tool: (-_n(tool["cost_usd"]), -tool["requests"]))
    counted = [tool for tool in tools if tool["reported"]]
    priced = [tool for tool in counted if tool["cost_usd"] is not None]
    reported = sum(tool["reported"] for tool in counted)
    heavy = sum(tool["heavy_requests"] for tool in counted)
    cost = sum(tool["cost_usd"] for tool in priced) if priced else None
    heavy_cost = sum(_n(tool["heavy_cost_usd"]) for tool in priced) if priced else None
    small_costs = [tool["small_cost_usd"] for tool in counted if tool["small_cost_usd"] is not None]
    return {
        "tools": tools,
        "summary": {
            "reported": reported, "heavy_requests": heavy, "heavy_share": _ratio(heavy, reported),
            "cost_usd": cost, "heavy_cost_usd": heavy_cost,
            "heavy_cost_share": _ratio(heavy_cost, cost) if cost is not None and heavy_cost is not None else None,
            "small_requests": sum(_int(tool["small_requests"]) for tool in counted) if counted else None,
            "small_cost_usd": sum(small_costs) if small_costs else None,
            "not_reported": [tool["tool"] for tool in tools if not tool["reported"]],
            "unpriced_requests": _unpriced([cell for tool in counted for cell in tool["buckets"]]),
        },
        "sessions": sorted(_sessions(rows, ("requests", "cost_usd")), key=lambda row: (-_n(row["cost_usd"]), -_n(row["requests"]))),
    }


def orientation(rows: list[dict]) -> dict:
    """Per project: sessions that edit, median main-agent requests and cost before the first edit; per tool: the rest."""
    projects = [{
        "project_path": row.get("project_path"), "sessions": _int(row.get("sessions")),
        "tools": sorted(str(tool) for tool in (row.get("tools") or []) if tool),
        "p50_requests": _cost(row.get("p50_requests")),
        "p50_cost_usd": _cost(row.get("p50_cost")) if _int(row.get("priced")) else None,
    } for row in _of(rows, "project")]
    projects.sort(key=lambda row: (-row["sessions"], str(row["project_path"])))
    tools = []
    for row in _of(rows, "tool"):
        edited, never, never_requests = _int(row.get("edited")), _int(row.get("never")), _int(row.get("never_requests"))
        tools.append({
            "tool": row.get("tool"), "sessions": _int(row.get("sessions")), "edited": edited,
            "no_project": _int(row.get("no_project")),
            "p50_requests": _cost(row.get("p50_requests")) if edited else None,
            "never": never, "never_requests": never_requests,
            "never_unpriced": never_requests - _int(row.get("never_priced")),
            "never_cost_usd": _n(row.get("never_cost")) if _int(row.get("never_priced")) or not never_requests else None,
        })
    tools.sort(key=lambda tool: -tool["sessions"])
    never_costs = [tool["never_cost_usd"] for tool in tools if tool["never"] and tool["never_cost_usd"] is not None]
    sessions = []
    for row in _sessions(rows, ("requests", "before_priced", "before_cost")):
        priced = _int(row.pop("before_priced"))
        sessions.append({**row, "before_cost": _n(row["before_cost"]) if priced else None})
    sessions.sort(key=lambda row: (-_n(row["before_cost"]), -_n(row["requests"])))
    return {
        "projects": projects, "tools": tools,
        "summary": {
            "sessions": sum(tool["sessions"] for tool in tools), "edited": sum(tool["edited"] for tool in tools),
            "projects": len(projects), "never": sum(tool["never"] for tool in tools),
            "never_cost_usd": sum(never_costs) if never_costs else None,
            "no_project": sum(tool["no_project"] for tool in tools),
            "unpriced_requests": sum(tool["never_unpriced"] for tool in tools if tool["never"]),
        },
        "sessions": sessions,
    }


def fixed_context(rows: list[dict]) -> dict:
    """Per tool: the fixed context of its sessions by kind; the skills listed against those used; the heaviest files.

    A kind no session of a tool reports is not reported (None), and so is the skill listing of a tool that has uses only.
    """
    kinds = {(row.get("tool"), row.get("kind")): row for row in _of(rows, "kind")}
    tools = []
    for row in _of(rows, "tool"):
        tool, sessions = row.get("tool"), _int(row.get("sessions"))
        cells = []
        for kind in FIXED_KINDS:
            cell = kinds.get((tool, kind), {})
            found = _int(cell.get("sessions"))
            cells.append({
                "kind": kind, "reported": bool(found), "sessions": found or None,
                "session_share": _ratio(found, sessions) if found else None,
                "p50_tokens": _cost(cell.get("p50_tokens")) if found else None,
                "avg_tokens": _ratio(_n(cell.get("sum_tokens")), sessions) if found else None,
                "p50_items": _cost(cell.get("p50_items")) if found else None,
                "estimated": bool(_int(cell.get("estimated"))),
            })
        tools.append({
            "tool": tool, "sessions": sessions, "p50_tokens": _cost(row.get("p50_tokens")),
            "p90_tokens": _cost(row.get("p90_tokens")), "avg_tokens": _ratio(_n(row.get("sum_tokens")), sessions),
            "p50_skills": _cost(row.get("p50_skills")), "estimated": bool(_int(row.get("estimated"))), "kinds": cells,
        })
    tools.sort(key=lambda tool: (-_n(tool["p50_tokens"]), str(tool["tool"])))
    listings = {row.get("tool"): row for row in _of(rows, "skills")}
    uses = {row.get("tool"): row for row in _of(rows, "uses")}
    skills = []
    for tool in sorted(set(listings) | set(uses), key=str):
        listing, used = listings.get(tool), uses.get(tool, {})
        skills.append({
            "tool": tool, "listed": _int(listing.get("listed")) if listing else None,
            "used": _int(listing.get("used")) if listing else None,
            "listing_tokens": _n(listing.get("sum_tokens")) if listing else None,
            "unused_tokens": _n(listing.get("unused_tokens")) if listing else None,
            "uses": _int(used.get("uses")), "skills_used": _int(used.get("used")),
            "triggers": sorted(str(trigger) for trigger in (used.get("triggers") or []) if trigger),
        })
    skills.sort(key=lambda row: (-_n(row["listing_tokens"]), -row["uses"]))
    top_skills = sorted(({"tool": row.get("tool"), "name": row.get("name"), "sessions": _int(row.get("sessions")),
                          "tokens": _n(row.get("sum_tokens")), "uses": _int(row.get("uses"))} for row in _of(rows, "skill")),
                        key=lambda row: (-row["tokens"], str(row["name"])))
    files = sorted(({"tool": row.get("tool"), "file": row.get("file"), "sessions": _int(row.get("sessions")),
                     "loads": _int(row.get("loads")), "avg_tokens": _cost(row.get("avg_tokens")),
                     "max_tokens": _cost(row.get("max_tokens")), "tokens": _n(row.get("sum_tokens"))}
                    for row in _of(rows, "file")), key=lambda row: (-row["tokens"], str(row["file"])))
    listed = [row for row in skills if row["listed"] is not None]
    count = sum(row["listed"] for row in listed)
    never = sum(row["listed"] - row["used"] for row in listed)
    heaviest = tools[0] if tools and tools[0]["p50_tokens"] is not None else None
    return {
        "tools": tools, "skills": skills, "top_skills": top_skills, "files": files,
        "summary": {
            "sessions": sum(tool["sessions"] for tool in tools),
            "heaviest": {"tool": heaviest["tool"], "p50_tokens": heaviest["p50_tokens"]} if heaviest else None,
            "listed": count if listed else None, "never_used": never if listed else None,
            "never_used_share": _ratio(never, count) if listed else None,
            "listing_tokens": sum(_n(row["listing_tokens"]) for row in listed) if listed else None,
            "unused_tokens": sum(_n(row["unused_tokens"]) for row in listed) if listed else None,
            "listing_not_reported": [row["tool"] for row in skills if row["listed"] is None],
        },
        "sessions": sorted(_sessions(rows, ("tokens", "skills")), key=lambda row: -_n(row["tokens"])),
    }


def _priced(row: dict) -> float | None:
    """The list-price cost of a row's sessions: 0 for no session, None when sessions exist but none is priced."""
    if not _int(row.get("sessions")):
        return 0.0
    return _cost(row.get("cost_usd")) if _int(row.get("priced")) else None


def problem_sessions(rows: list[dict]) -> dict:
    """Per signal and tool: sessions flagged, their share of the tool's sessions and their cost; pairs; projects.

    A signal a tool's source cannot show is not reported (None) for that tool, and the tool is left out of its share.
    """
    cells = {(row.get("tool"), row.get("signal")): row for row in _of(rows, "signal")}
    tools = []
    for row in _of(rows, "tool"):
        tool, sessions = row.get("tool"), _int(row.get("sessions"))
        signals = []
        for signal in SIGNALS:
            cell = cells.get((tool, signal))
            signals.append({
                "signal": signal, "reported": cell is not None,
                "sessions": _int(cell.get("sessions")) if cell else None,
                "share": _ratio(_int(cell.get("sessions")), sessions) if cell else None,
                "cost_usd": _priced(cell) if cell else None,
            })
        reports = any(cell["reported"] for cell in signals)
        tools.append({
            "tool": tool, "sessions": sessions, "reports": reports,
            "flagged": _int(row.get("flagged")) if reports else None, "multi": _int(row.get("multi")) if reports else None,
            "flagged_cost_usd": _priced({"sessions": row.get("flagged"), "priced": row.get("priced"),
                                         "cost_usd": row.get("cost_usd")}) if reports else None,
            "cost_usd": _cost(row.get("all_cost_usd")) if _int(row.get("all_priced")) else None, "signals": signals,
        })
    tools.sort(key=lambda tool: (-tool["sessions"], str(tool["tool"])))
    counted = [tool for tool in tools if tool["reports"]]
    totals = []
    for i, signal in enumerate(SIGNALS):
        found = [tool for tool in counted if tool["signals"][i]["reported"]]
        flagged = sum(_int(tool["signals"][i]["sessions"]) for tool in found)
        of = sum(tool["sessions"] for tool in found)
        totals.append({"signal": signal, "tools": [tool["tool"] for tool in found], "sessions": flagged if found else None,
                       "share": _ratio(flagged, of) if found else None})
    pairs = sorted(({"signals": [row.get("signal"), row.get("other")], "sessions": _int(row.get("sessions")),
                     "cost_usd": _priced(row)} for row in _of(rows, "pair")),
                   key=lambda row: (-row["sessions"], row["signals"]))
    projects = sorted(({"project": row.get("project_name"), "sessions": _int(row.get("sessions")),
                        "all_sessions": _int(row.get("all_sessions")),
                        "tools": sorted(str(tool) for tool in (row.get("tools") or []) if tool), "cost_usd": _priced(row)}
                       for row in _of(rows, "project")), key=lambda row: (-row["sessions"], str(row["project"])))
    sessions = []
    for row in _sessions(rows, ("signals", "names", "project_name", "priced", "cost_usd")):
        priced = _int(row.pop("priced"))
        sessions.append({**row, "signals": _int(row["signals"]), "names": [name for name in SIGNALS if name in (row["names"] or [])],
                         "cost_usd": _cost(row["cost_usd"]) if priced else None})
    sessions.sort(key=lambda row: (-row["signals"], -_n(row["cost_usd"])))
    flagged = sum(_int(tool["flagged"]) for tool in counted)
    of = sum(tool["sessions"] for tool in counted)
    costs = [tool["flagged_cost_usd"] for tool in counted if tool["flagged_cost_usd"] is not None]
    return {
        "tools": tools, "signals": totals, "pairs": pairs, "projects": projects,
        "summary": {
            "sessions": of, "flagged": flagged, "flagged_share": _ratio(flagged, of),
            "multi": sum(_int(tool["multi"]) for tool in counted), "flagged_cost_usd": sum(costs) if costs else None,
            "not_reporting": [tool["tool"] for tool in tools if not tool["reports"]],
        },
        "sessions": sessions,
    }


# The coverage counts of insights.work_per_instruction: why a tool's sessions are not all in its figures.
AUTONOMY_COVERAGE = ("active", "prompted", "scripted", "store_only", "start_unread", "no_calls", "unread",
                     "unread_sessions")


def _chain_figures(row: dict, sessions: int, multi: int) -> dict:
    """The longest-chain figures of a tool or bin row: None for a group with no session in it, never 0."""
    return {
        "p50_longest": _cost(row.get("p50_longest")) if sessions else None,
        "p90_longest": _cost(row.get("p90_longest")) if sessions else None,
        "mean_longest": _cost(row.get("mean_longest")) if sessions else None,
        "p50_multi": _cost(row.get("p50_multi")) if multi else None,
        "p90_multi": _cost(row.get("p90_multi")) if multi else None,
    }


def _wait_figures(row: dict) -> dict:
    """The wait figures of a tool or bin row. The view leaves the median and the long count null when too few of the
    turns a person answered have a measured wait; they stay None here."""
    waits, wait = _int(row.get("waits")), _cost(row.get("p50_wait_s"))
    over = _int(row.get("over_5m")) if wait is not None else None
    return {
        "turns_answered": _int(row.get("turns_answered")), "waits": waits, "queued": _int(row.get("queued")),
        "p50_wait_s": wait, "over_5m": over, "over_5m_share": _ratio(over, waits) if over is not None else None,
    }


def work_per_instruction(rows: list[dict]) -> dict:
    """Per tool and time bin: the longest run of main-agent tool calls between two turns of a person, and how long the
    person took to answer after the agent stopped.

    A tool that records no prompts is not reported, and a figure with no session behind it is None, never 0.
    """
    figures = {row.get("tool"): row for row in _of(rows, "tool")}
    coverage = {row.get("tool"): row for row in _of(rows, "coverage")}
    tools = []
    for tool in sorted(set(figures) | set(coverage), key=str):
        row, cover = figures.get(tool, {}), coverage.get(tool, {})
        sessions, multi = _int(row.get("sessions")), _int(row.get("multi_sessions"))
        tools.append({
            "tool": tool, "reported": bool(_int(cover.get("prompted")) or sessions),
            **{name: _int(cover.get(name)) for name in AUTONOMY_COVERAGE},
            "sessions": sessions, "instructions": _int(row.get("instructions")), "calls": _int(row.get("calls")),
            "delegated": _int(row.get("delegated")), "one_instruction": _int(row.get("one_instruction")),
            "multi_sessions": multi, **_chain_figures(row, sessions, multi),
            "mean_multi": _cost(row.get("mean_multi")) if multi else None,
            **_wait_figures(row), "resumed": _int(row.get("resumed")), "no_stop": _int(row.get("no_stop")),
        })
    tools.sort(key=lambda tool: (not tool["reported"], -tool["multi_sessions"], -tool["sessions"], str(tool["tool"])))
    bins = []
    for row in _of(rows, "bin"):
        sessions, multi = _int(row.get("sessions")), _int(row.get("multi_sessions"))
        bins.append({"tool": row.get("tool"), "bin_ts": _cost(row.get("bin_ts")), "sessions": sessions,
                     "multi_sessions": multi, **_chain_figures(row, sessions, multi), **_wait_figures(row)})
    bins.sort(key=lambda row: (str(row["tool"]), _n(row["bin_ts"])))
    meta = next(iter(_of(rows, "meta")), {})
    measured = [tool for tool in tools if tool["sessions"]]
    sessions = []
    for row in _sessions(rows, ("longest", "instructions", "calls", "delegated", "waits", "queued", "p50_wait_s", "first_ts")):
        instructions, waits = _int(row["instructions"]), _int(row["waits"])
        sessions.append({**row, "longest": _int(row["longest"]), "instructions": instructions, "calls": _int(row["calls"]),
                         "delegated": _int(row["delegated"]), "waits": waits, "queued": _int(row["queued"]),
                         "p50_wait_s": _cost(row["p50_wait_s"]) if waits else None, "first_ts": _cost(row["first_ts"]),
                         "single": instructions < 2})
    sessions.sort(key=lambda row: (-row["longest"], -row["calls"]))
    return {
        "tools": tools, "bins": bins,
        "bin_unit": meta.get("bin_unit") or None, "prompts_from": _cost(meta.get("prompts_from")),
        "summary": {
            # The tool the card leads with: the one with the most sessions of two or more instructions.
            "lead": measured[0]["tool"] if measured else None,
            "sessions": sum(tool["sessions"] for tool in tools),
            "multi_sessions": sum(tool["multi_sessions"] for tool in tools),
            "one_instruction": sum(tool["one_instruction"] for tool in tools),
            "not_reported": [tool["tool"] for tool in tools if not tool["reported"]],
        },
        "sessions": sessions,
    }


def _count(value: Any) -> int | None:
    return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _total(values: list[int | None]) -> int | None:
    """The sum of the counts that are reported; None when none is."""
    found = [value for value in values if value is not None]
    return sum(found) if found else None


def verified_commits(rows: list[dict]) -> dict:
    """Per tool: agent commits split by whether a test run saw their source changes; sessions that changed source untested.

    A commit is classified when the tool records the session's edits and its deciding change names a file. A tool's
    share of commits no test run saw (changed after the last test, or never tested) is over its classified commits, and
    only when at least half of its commits are classified: otherwise the tool is "not classified" and its commits are
    counted as unchecked. A tool that keeps no command text reports no commits (None), and a tool with no recorded exit
    code of 0 reports no passes; pass_tool says whether the tool can record one at all.
    """
    tools = []
    for row in _of(rows, "tool"):
        tool = {"tool": row.get("tool"), **{name: _count(row.get(name)) for name in VERIFIED_COUNTS}}
        commits = tool["commits"]
        classified = None if commits is None else commits - _int(tool["not_recorded"]) - _int(tool["unknown_change"])
        checked = bool(classified) and _int(classified) * 2 >= _int(commits)
        unseen = None if commits is None else _int(tool["changed_after"]) + _int(tool["never_tested"])
        tool.update(classified=classified, unseen=unseen, checked=checked, pass_tool=tool["tool"] in VERIFIED_PASS_TOOLS,
                    unseen_share=_ratio(_n(unseen), _n(classified)) if checked else None,
                    own_unseen_share=_ratio(_n(tool["own_unseen"]), _n(classified)) if checked and tool["own_unseen"] is not None
                    else None,
                    unchecked=None if commits is None else commits - (_int(classified) if checked else 0))
        tools.append(tool)
    tools.sort(key=lambda tool: (-_n(tool["commits"]), str(tool["tool"])))
    counted = [tool for tool in tools if tool["commits"] is not None]
    pooled = [tool for tool in counted if tool["checked"]]
    classified = sum(_int(tool["classified"]) for tool in pooled)
    unseen = sum(_int(tool["unseen"]) for tool in pooled)
    own = _total([tool["own_unseen"] for tool in pooled])
    reporting = [tool for tool in counted if tool["untested_sessions"] is not None]
    sessions = []
    for row in _sessions(rows, ("commits", "untested", "never_tested", "own_unseen", "by_subagent", "last_commit")):
        sessions.append({**{key: value for key, value in row.items() if key != "untested"}, "unseen": _count(row["untested"])})
    sessions.sort(key=lambda row: (-_n(row["unseen"]), -_n(row["commits"])))
    return {
        "tools": tools,
        "summary": {
            "commits": _total([tool["commits"] for tool in tools]), "classified": classified if counted else None,
            "unseen": unseen if pooled else None, "unseen_share": _ratio(unseen, classified) if classified else None,
            "own_unseen": own, "own_unseen_share": _ratio(_n(own), classified) if classified and own is not None else None,
            "changed_after": sum(_int(tool["changed_after"]) for tool in pooled) if pooled else None,
            "never_tested": sum(_int(tool["never_tested"]) for tool in pooled) if pooled else None,
            "no_change": sum(_int(tool["no_change"]) for tool in pooled) if pooled else None,
            "failed": _total([tool["failed"] for tool in counted]), "passed": _total([tool["passed"] for tool in counted]),
            "unchecked": sum(_int(tool["unchecked"]) for tool in counted) if counted else None,
            "edit_sessions": sum(_int(tool["edit_sessions"]) for tool in reporting) if reporting else None,
            "untested_sessions": sum(_int(tool["untested_sessions"]) for tool in reporting) if reporting else None,
            "remote_commits": _total([tool["remote_commits"] for tool in tools]),
            "sessions_no_text": _total([tool["sessions_no_text"] for tool in tools]),
            "checked_tools": [tool["tool"] for tool in pooled],
            "not_reported": [tool["tool"] for tool in tools if tool["commits"] is None],
            "not_classified": [tool["tool"] for tool in counted if tool["commits"] and not tool["checked"]],
            "one_session": [tool["tool"] for tool in counted
                            if tool["commits"] and _n(tool["top_session_commits"]) * 2 > tool["commits"]],
        },
        "sessions": sessions,
    }


SHAPES: dict[str, Callable[[list[dict]], dict]] = {
    "pause": pause_tax, "carry": context_carry, "subagents": subagents, "failures": after_failure, "rereads": rereads,
    "time": time_split, "context": context_weight, "orientation": orientation, "fixed": fixed_context,
    "problems": problem_sessions,
    "autonomy": work_per_instruction,
    "verified": verified_commits,
}
# Each view is named literally where it is read, so the history paging guard can check that it is bounded.
READS: dict[str, Callable[[HistoryScope, dict], list[dict]]] = {
    "pause": lambda history, params: history.read("insights.pause_tax", limit=ROW_LIMIT, **params),
    "carry": lambda history, params: history.read("insights.context_carry", limit=ROW_LIMIT, **params),
    "subagents": lambda history, params: history.read("insights.subagents", limit=ROW_LIMIT, **params),
    "failures": lambda history, params: history.read("insights.after_failure", limit=ROW_LIMIT, **params),
    "rereads": lambda history, params: history.read("insights.rereads", limit=ROW_LIMIT, **params),
    "time": lambda history, params: history.read("insights.time_split", limit=ROW_LIMIT, **params),
    "context": lambda history, params: history.read("insights.context_weight", limit=ROW_LIMIT, **params),
    "orientation": lambda history, params: history.read("insights.orientation", limit=ROW_LIMIT, **params),
    "fixed": lambda history, params: history.read("insights.fixed_context", limit=ROW_LIMIT, **params),
    "problems": lambda history, params: history.read("insights.problem_sessions", limit=ROW_LIMIT, **params),
    "autonomy": lambda history, params: history.read("insights.work_per_instruction", limit=ROW_LIMIT, **params),
    "verified": lambda history, params: history.read("insights.verified_commits", limit=ROW_LIMIT, **params),
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
    shape = SHAPES[card](rows)
    return 200, {
        "card": card, "view": view,
        "range": {"since": filters.since, "until": filters.until},
        "data_range": {"first_ts": meta.get("first_ts"), "last_ts": meta.get("last_ts")},
        "computed_at": _cost(meta.get("computed_at")) or (time.time() if now is None else now),
        **shape,
        # The cards name a tool as the board does; the board's own labels are not loaded on this screen.
        "tool_labels": {tool: _label(tool) for tool in sorted({str(row.get("tool") or "") for row in rows} - {""})},
        "query": query_block(history, view, {**params, **node, "limit": ROW_LIMIT}),
    }
