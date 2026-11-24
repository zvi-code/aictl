"""Insights on what the agents do: the flow of their work, skills, MCP servers and Kusto queries.

Each function shapes the rows of one view (insights.flows, ...) into a card's answer. A group with too little data
never drives a headline, a chart or a coloured cell: it is moved to a "too small" list the card names in one line.
A figure the source does not report is None, never 0.
"""

from __future__ import annotations

from typing import Any

# The step kinds of insights.flows, in the order the card lists them.
STEPS = ("read", "search", "edit", "command", "test", "commit", "mcp", "skill", "delegate", "web", "ask", "finish", "other")
OUTCOMES = ("committed", "changed", "no_change")
# Evidence: the least data a group needs before the card compares it.
MIN_FROM_CALLS = 30          # transitions out of a step kind
MIN_PATH_SESSIONS = 3        # a first or last path
MIN_CYCLE_SESSIONS = 3       # a cycle
MIN_PROJECT_SESSIONS = 5     # a project
MIN_SESSIONS = 10            # the whole period, before the card states a finding
SHOWN_NEXT = 4


def _n(value: Any) -> float:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else 0.0


def _int(value: Any) -> int:
    return int(_n(value))


def _num(value: Any) -> float | None:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _ratio(part: float, whole: float) -> float | None:
    return part / whole if whole else None


def _of(rows: list[dict], kind: str) -> list[dict]:
    return [row for row in rows if row.get("row_type") == kind]


def _cost(row: dict) -> float | None:
    """A cost total, or None when none of its requests was priced."""
    return _num(row.get("cost_usd")) if _int(row.get("priced")) else None


def _path(text: Any) -> list[str]:
    return [step for step in str(text or "").split(" > ") if step]


def flows(rows: list[dict], order: list[dict] | None = None) -> dict:
    """What follows what, where sessions stop, the paths they start and end on, and the cycles they repeat.

    Each bar is split by repository (``repos``): how sessions ended and each last step (sessions, cost_usd), each path
    and project (sessions; a project also committed, changed, no_change), each cycle (seconds) and each tool (calls,
    seconds). The ending, path and project rows carry their own split (repo_parts); the cycles shown and the tools
    are split in repo_split rows. The transitions are a matrix of shares, not split.
    """
    nexts: dict[str, list[dict]] = {}
    for row in _of(rows, "transition"):
        nexts.setdefault(str(row.get("from_step")), []).append({"to_step": row.get("to_step"), "calls": _int(row.get("calls"))})
    transitions, small_steps = [], []
    for step, items in nexts.items():
        total = sum(item["calls"] for item in items)
        if total < MIN_FROM_CALLS:
            small_steps.append(step)
            continue
        items.sort(key=lambda item: (-item["calls"], str(item["to_step"])))
        transitions.append({"from_step": step, "calls": total, "next": [
            {**item, "share": item["calls"] / total} for item in items[:SHOWN_NEXT]]})
    transitions.sort(key=lambda item: -item["calls"])

    endings: dict[str, dict] = {outcome: {"sessions": 0, "priced": 0, "cost_usd": 0.0, "last_steps": []} for outcome in OUTCOMES}
    for row in _of(rows, "ending"):
        outcome = endings.get(str(row.get("outcome")))
        if outcome is None:
            continue
        sessions = _int(row.get("sessions"))
        outcome["sessions"] += sessions
        outcome["priced"] += _int(row.get("priced"))
        outcome["cost_usd"] += _n(row.get("cost_usd"))
        outcome["last_steps"].append({"step": row.get("last_step"), "sessions": sessions, "cost_usd": _cost(row),
                                      "parts": _parts(row)})
    for outcome in endings.values():
        outcome["last_steps"].sort(key=lambda item: (-item["sessions"], str(item["step"])))
        outcome["cost_usd"] = outcome["cost_usd"] if outcome.pop("priced") else None

    def paths(kind: str) -> tuple[list[dict], int]:
        found = [{"steps": _path(row.get("path")), "sessions": _int(row.get("sessions")), "parts": _parts(row)}
                 for row in _of(rows, kind)]
        kept = sorted((item for item in found if item["sessions"] >= MIN_PATH_SESSIONS and item["steps"]),
                      key=lambda item: -item["sessions"])
        return kept, len(found) - len(kept)

    first_paths, small_first = paths("first_path")
    last_paths, small_last = paths("last_path")

    tools = [{"tool": row.get("tool"), "calls": _int(row.get("calls")), "sessions": _int(row.get("sessions")),
              "seconds": _n(row.get("seconds")), "test_runs": _int(row.get("test_runs")),
              "unflagged_tests": _int(row.get("unflagged_tests"))} for row in _of(rows, "tool")]
    tools.sort(key=lambda tool: -tool["calls"])
    working = sum(tool["seconds"] for tool in tools)

    cycles, small_cycles = [], 0
    for row in _of(rows, "cycle"):
        if _int(row.get("sessions")) < MIN_CYCLE_SESSIONS:
            small_cycles += 1
            continue
        seconds = _n(row.get("seconds"))
        cycles.append({"key": f"cycle:{row.get('pair') or ''}", "pair": str(row.get("pair") or "").split(" <> "),
                       "loops": _int(row.get("loops")),
                       "sessions": _int(row.get("sessions")), "calls": _int(row.get("calls")), "rounds": _int(row.get("rounds")),
                       "seconds": seconds, "time_share": _ratio(seconds, working)})
    cycles.sort(key=lambda item: -item["seconds"])

    projects, small_projects = [], []
    for row in _of(rows, "project"):
        sessions = _int(row.get("sessions"))
        name = str(row.get("project_name") or "")
        if sessions < MIN_PROJECT_SESSIONS:
            small_projects.append(name)
            continue
        no_change = _int(row.get("no_change"))
        projects.append({
            "project": name, "sessions": sessions, "committed": _int(row.get("committed")), "changed": _int(row.get("changed")),
            "no_change": no_change, "no_change_share": _ratio(no_change, sessions), "cost_usd": _cost(row),
            "no_change_cost": _num(row.get("no_change_cost")) if _int(row.get("priced")) else None,
            "loops": _int(row.get("loops")), "cycle_seconds": _n(row.get("seconds")),
            "tools": sorted(str(tool) for tool in (row.get("tools") or [])), "parts": _parts(row),
        })
    projects.sort(key=lambda item: (-item["sessions"], item["project"]))

    _split_flows(rows, order or [], endings, first_paths + last_paths, cycles, projects, tools)

    meta = next(iter(_of(rows, "meta")), {})
    sessions = _int(meta.get("sessions"))
    total_cost = _cost(meta)
    stop = endings["no_change"]
    cycle_seconds = sum(item["seconds"] for item in cycles)
    enough = sessions >= MIN_SESSIONS
    summary = {
        "sessions": sessions, "cost_usd": total_cost, "enough": enough,
        "no_change": stop["sessions"], "no_change_share": _ratio(stop["sessions"], sessions),
        "no_change_cost": stop["cost_usd"],
        "no_change_cost_share": _ratio(_n(stop["cost_usd"]), _n(total_cost)) if stop["cost_usd"] is not None else None,
        "no_change_last": stop["last_steps"][0] if stop["last_steps"] else None,
        "committed": endings["committed"]["sessions"], "changed": endings["changed"]["sessions"],
        "working_seconds": working, "cycle_seconds": cycle_seconds, "cycle_share": _ratio(cycle_seconds, working),
        "top_cycle": cycles[0] if cycles else None,
        "no_test_tools": [tool["tool"] for tool in tools if tool["calls"] and not tool["test_runs"]],
        "unflagged_tests": sum(tool["unflagged_tests"] for tool in tools),
        "small_steps": sorted(small_steps), "small_paths": small_first + small_last, "small_cycles": small_cycles,
        "small_projects": sorted(small_projects),
    }
    sessions_rows = [{
        "session_id": row.get("session_id"), "node_id": row.get("node_id"), "tool": row.get("tool"),
        "project_name": row.get("project_name") or None, "outcome": row.get("outcome"), "last_step": row.get("last_step"),
        "loops": _int(row.get("loops")), "cycle_seconds": _n(row.get("seconds")),
        "pair": [step for step in str(row.get("pair") or "").split(" <> ") if step], "cost_usd": _cost(row),
    } for row in _of(rows, "session") if row.get("session_id")]
    sessions_rows.sort(key=lambda row: (-row["cycle_seconds"], -_n(row["cost_usd"])))
    return {"transitions": transitions, "endings": endings, "first_paths": first_paths, "last_paths": last_paths,
            "cycles": cycles, "projects": projects, "tools": tools, "summary": summary, "sessions": sessions_rows}


ENDING_SPLIT = ("sessions", "cost_usd")
PROJECT_SPLIT = ("sessions", "committed", "changed", "no_change")
TOOL_SPLIT = ("calls", "seconds")


def _parts(row: dict) -> list[dict]:
    """The split of an ending, path or project row by repository (its repo_parts), as split rows."""
    parts = row.get("repo_parts")
    return [part for part in parts if isinstance(part, dict)] if isinstance(parts, list) else []


def _split_flows(rows: list[dict], order: list[dict], endings: dict, paths: list[dict], cycles: list[dict], projects: list[dict],
                 tools: list[dict]) -> None:
    """Put the segments per repository on each bar of the flows card (insights.attach_repos); see flows()."""
    from .insights import attach_repos, repo_splits, reported_totals

    splits = repo_splits(rows)

    def found(key: str, tool: str = "") -> list[dict]:
        return splits.get((tool, key), [])

    # An outcome's split is the sum of its last steps' splits (every ended session has one last step).
    ended = [(endings[outcome], [part for item in endings[outcome]["last_steps"] for part in item["parts"]]) for outcome in OUTCOMES]
    # Every ended session is in one outcome: a repository's own sessions and cost are the sum over the outcomes.
    totals = reported_totals(ended, ENDING_SPLIT)
    for outcome, (ending, segments) in zip(OUTCOMES, ended):
        attach_repos(ending, segments, ENDING_SPLIT, order, totals)
        for item in ending["last_steps"]:
            attach_repos(item, item.pop("parts"), ENDING_SPLIT, order, totals)
    # A project's own outcome counts are of the repository's sessions that ended that way.
    outcome_totals = {repo: {"sessions": values["sessions"], **{outcome: 0.0 for outcome in OUTCOMES}}
                      for repo, values in totals.items()}
    for outcome, (_ending, segments) in zip(OUTCOMES, ended):
        for row in segments:
            outcome_totals.setdefault(str(row.get("repo") or ""), dict.fromkeys(PROJECT_SPLIT, 0.0))[outcome] += _n(row.get("sessions"))
    for item in paths:
        attach_repos(item, item.pop("parts"), ("sessions",), order, totals)
    for item in projects:
        attach_repos(item, item.pop("parts"), PROJECT_SPLIT, order, outcome_totals)
    tool_bars = [(tool, found("", str(tool["tool"] or ""))) for tool in tools]
    tool_totals = reported_totals(tool_bars, TOOL_SPLIT)
    for tool, segments in tool_bars:
        attach_repos(tool, segments, TOOL_SPLIT, order, tool_totals)
    # A cycle's working time is part of the working time of every tool call: a repository's own total is its tools' seconds.
    for item in cycles:
        attach_repos(item, found(item.pop("key")), ("seconds",), order, tool_totals)


# Skills: a skill with fewer uses or sessions than these is too small to compare.
MIN_SKILL_USES = 5
MIN_SKILL_SESSIONS = 3
MIN_PROJECT_USES = 5
# The tools that record which skills are listed to the model (session_context_items of kind skills).
LISTING_TOOLS = ("claude-code",)


def _names(value: Any) -> list[str]:
    return sorted(str(item) for item in (value or []))


def skills(rows: list[dict]) -> dict:
    """Per skill: uses, sessions, projects, the cost of the turns it ran in and what followed it in the same turn;
    the skills listed to the model and never used, with the tokens their listing took."""
    meta = next(iter(_of(rows, "meta")), {})
    total_cost = _cost(meta)
    found, small = [], []
    for row in _of(rows, "skill"):
        uses, with_turn = _int(row.get("uses")), _int(row.get("with_turn"))
        item = {
            "name": row.get("name"), "uses": uses, "sessions": _int(row.get("sessions")), "projects": _int(row.get("projects")),
            "tools": _names(row.get("tools")), "turns": _int(row.get("turns")),
            "turn_tokens": _int(row.get("turn_tokens")) if row.get("turns") is not None else None,
            "cost_usd": _cost(row), "with_turn": with_turn,
            "after_edit": _ratio(_n(row.get("after_edit")), with_turn), "after_test": _ratio(_n(row.get("after_test")), with_turn),
            "after_commit": _ratio(_n(row.get("after_commit")), with_turn),
        }
        item["cost_share"] = _ratio(_n(item["cost_usd"]), _n(total_cost)) if item["cost_usd"] is not None else None
        (found if uses >= MIN_SKILL_USES and item["sessions"] >= MIN_SKILL_SESSIONS else small).append(item)
    found.sort(key=lambda item: (-_n(item["cost_usd"]), -item["uses"]))
    small.sort(key=lambda item: (-item["uses"], str(item["name"])))
    unused = [{"tool": row.get("tool"), "name": row.get("name"), "sessions": _int(row.get("sessions")),
               "list_tokens": _int(row.get("list_tokens"))} for row in _of(rows, "unused")]
    unused.sort(key=lambda item: -item["list_tokens"])
    listings = [{"tool": row.get("tool"), "listed": _int(row.get("listed")), "unused": _int(row.get("unused")),
                 "sessions": _int(row.get("sessions")), "list_tokens": _int(row.get("list_tokens")),
                 "unused_tokens": _int(row.get("unused_tokens"))} for row in _of(rows, "listing")]
    tools = sorted(({"tool": row.get("tool"), "uses": _int(row.get("uses")), "skills": _int(row.get("skills")),
                     "sessions": _int(row.get("sessions")), "with_turn": _int(row.get("with_turn"))}
                    for row in _of(rows, "tool")), key=lambda item: -item["uses"])
    projects, small_projects = [], []
    for row in _of(rows, "project"):
        item = {"project": str(row.get("project_name") or ""), "uses": _int(row.get("uses")), "skills": _int(row.get("skills")),
                "sessions": _int(row.get("sessions"))}
        (projects if item["uses"] >= MIN_PROJECT_USES else small_projects).append(item)
    projects.sort(key=lambda item: (-item["uses"], item["project"]))
    summary = {
        "uses": sum(tool["uses"] for tool in tools), "skills": len(found) + len(small),
        "sessions": sum(tool["sessions"] for tool in tools), "cost_usd": total_cost,
        "top": found[0] if found and found[0]["cost_usd"] is not None else None,
        "use_tools": [tool["tool"] for tool in tools], "listing_tools": list(LISTING_TOOLS),
        "listed": sum(item["listed"] for item in listings), "unused": sum(item["unused"] for item in listings),
        "unused_tokens": sum(item["unused_tokens"] for item in listings) if listings else None,
        "listed_sessions": max((item["sessions"] for item in listings), default=0),
        "small_skills": len(small), "small_projects": sorted(item["project"] for item in small_projects),
    }
    sessions = [{"session_id": row.get("session_id"), "node_id": row.get("node_id"), "tool": row.get("tool"),
                 "project_name": row.get("project_name") or None, "uses": _int(row.get("uses")),
                 "skills": _names(row.get("skill_names"))} for row in _of(rows, "session") if row.get("session_id")]
    sessions.sort(key=lambda row: -row["uses"])
    return {"skills": found, "small_skills": small, "unused": unused, "listings": listings, "tools": tools,
            "projects": projects, "summary": summary, "sessions": sessions}


# MCP: a server or server tool with fewer calls or sessions than these is too small to compare.
MIN_MCP_CALLS = 20
MIN_MCP_SESSIONS = 3
MIN_MCP_PROJECT_CALLS = 20
SHOWN_LISTED = 25


def _mcp_figures(row: dict) -> dict:
    calls, timed, sized = _int(row.get("calls")), _int(row.get("timed")), _int(row.get("sized"))
    sessions = _int(row.get("sessions"))
    enough = calls >= MIN_MCP_CALLS and sessions >= MIN_MCP_SESSIONS
    return {
        "calls": calls, "sessions": sessions, "projects": _int(row.get("projects")), "failures": _int(row.get("failures")),
        "failure_share": _ratio(_n(row.get("failures")), calls) if enough else None, "enough": enough,
        "p50_ms": _num(row.get("p50_ms")) if timed else None, "p95_ms": _num(row.get("p95_ms")) if timed else None,
        "sum_ms": _n(row.get("sum_ms")) if timed else None,
        "output_bytes": _int(row.get("output_bytes")) if sized else None,
        "carried_bytes": _num(row.get("carried_bytes")) if sized else None,
    }


def mcp(rows: list[dict]) -> dict:
    """Per MCP server and per tool of a server: calls, sessions, projects, failures, duration, result bytes and bytes
    carried; the servers whose tools were listed to the model in sessions that never called them."""
    per_tool: dict[str, list[dict]] = {}
    for row in _of(rows, "server_tool"):
        per_tool.setdefault(str(row.get("server")), []).append({"tool_name": row.get("server_tool"), **_mcp_figures(row)})
    servers, small = [], []
    for row in _of(rows, "server"):
        name = str(row.get("server"))
        item = {"server": name, "tools": _names(row.get("tools")), "server_tools": _int(row.get("server_tools")),
                **_mcp_figures(row),
                "calls_by_tool": sorted(per_tool.get(name, []), key=lambda tool: -tool["calls"])}
        (servers if item["enough"] else small).append(item)
    servers.sort(key=lambda item: (-_n(item["sum_ms"]), -item["calls"]))
    small.sort(key=lambda item: -item["calls"])
    listed = [{"server": row.get("server"), "tool": row.get("tool"), "sessions": _int(row.get("sessions")),
               "called_sessions": _int(row.get("called_sessions")), "list_tokens": _int(row.get("list_tokens")),
               "unused_tokens": _int(row.get("unused_tokens")), "listed_tools": _int(row.get("listed_tools"))}
              for row in _of(rows, "listed")]
    listed.sort(key=lambda item: -item["unused_tokens"])
    projects, small_projects = [], []
    for row in _of(rows, "project"):
        item = {"project": str(row.get("project_name") or ""), "calls": _int(row.get("calls")), "sessions": _int(row.get("sessions")),
                "servers": _int(row.get("servers")), "failures": _int(row.get("failures")), "sum_ms": _n(row.get("sum_ms")),
                "output_bytes": _int(row.get("output_bytes"))}
        (projects if item["calls"] >= MIN_MCP_PROJECT_CALLS else small_projects).append(item)
    projects.sort(key=lambda item: (-item["calls"], item["project"]))
    meta = next(iter(_of(rows, "meta")), {})
    every = servers + small
    calls = sum(item["calls"] for item in every)
    sum_ms = sum(_n(item["sum_ms"]) for item in every)
    carried = [item["carried_bytes"] for item in every if item["carried_bytes"] is not None]
    summary = {
        "calls": calls, "all_calls": _int(meta.get("calls")), "call_share": _ratio(calls, _n(meta.get("calls"))),
        "sum_ms": sum_ms if every else None, "time_share": _ratio(sum_ms, _n(meta.get("sum_ms"))) if every else None,
        "output_bytes": sum(_n(item["output_bytes"]) for item in every) if every else None,
        "carried_bytes": sum(carried) if carried else None,
        "failures": sum(item["failures"] for item in every), "servers": len(every),
        "top": servers[0] if servers else None, "listing_tools": list(LISTING_TOOLS),
        "listed_servers": len(listed), "never_called": sum(1 for item in listed if not item["called_sessions"]),
        "unused_tokens": sum(item["unused_tokens"] for item in listed) if listed else None,
        "small_servers": len(small), "small_projects": sorted(item["project"] for item in small_projects),
    }
    sessions = [{"session_id": row.get("session_id"), "node_id": row.get("node_id"), "tool": row.get("tool"),
                 "project_name": row.get("project_name") or None, "calls": _int(row.get("calls")),
                 "failures": _int(row.get("failures")), "servers": _int(row.get("servers")), "sum_ms": _n(row.get("sum_ms")),
                 "output_bytes": _num(row.get("output_bytes"))} for row in _of(rows, "session") if row.get("session_id")]
    sessions.sort(key=lambda row: -row["calls"])
    return {"servers": servers, "small_servers": small, "listed": listed[:SHOWN_LISTED], "projects": projects, "summary": summary,
            "sessions": sessions}


# Kusto runs: the period needs this many runs in this many sessions before it states a finding or a failure share; a
# project needs MIN_KQL_PROJECT_RUNS; a shape repeated in a session counts from REPEAT_RUNS runs.
MIN_KQL_RUNS = 20
MIN_KQL_SESSIONS = 3
MIN_KQL_PROJECT_RUNS = 5
REPEAT_RUNS = 3
LARGE_RESULT_BYTES = 100_000
FAILURE_KINDS = ("syntax", "not_found", "auth", "throttled", "timeout", "limits", "network", "other", "not_recorded")


def _figures(row: dict) -> dict:
    return {"runs": _int(row.get("runs")), "sessions": _int(row.get("sessions")), "failures": _int(row.get("failures")),
            "changes": _int(row.get("changes")), "large": _int(row.get("large")), "sum_ms": _n(row.get("sum_ms")),
            "output_bytes": _int(row.get("output_bytes"))}


def kql(rows: list[dict]) -> dict:
    """Kusto queries and management commands the agents ran: by kind and verb, failure kind, cluster and database,
    project, the same query shape run again, and the results of 100 KB or more brought into the context."""
    with_text = {row.get("tool"): _int(row.get("with_text")) for row in _of(rows, "tool")}
    coverage = sorted(({"tool": row.get("tool"), "runs": _int(row.get("runs")), "unrecognised": _int(row.get("unrecognised")),
                        "mcp": _int(row.get("mcp")), "cli": _int(row.get("cli")), "script": _int(row.get("script")),
                        "with_text": with_text.get(row.get("tool"), 0)} for row in _of(rows, "coverage")),
                      key=lambda item: (-item["runs"], -item["unrecognised"]))
    kinds = sorted(({"kind": row.get("run_kind"), "verb": row.get("verb") or None, **_figures(row),
                     "change": _int(row.get("changes")) > 0} for row in _of(rows, "kind")),
                   key=lambda item: -item["runs"])
    failures = {str(row.get("failure")): _int(row.get("runs")) for row in _of(rows, "failure")}
    failure_kinds = [{"failure": kind, "runs": failures[kind]} for kind in FAILURE_KINDS if failures.get(kind)]
    failure_kinds.sort(key=lambda item: -item["runs"])
    targets = [{"cluster": row.get("cluster") or None, "database": row.get("database") or None, **_figures(row)}
               for row in _of(rows, "target")]
    repeats: dict[str, dict] = {}
    for row in _of(rows, "repeat"):
        item = repeats.setdefault(str(row.get("shape_key")), {"most_in_session": 0, "repeated_sessions": 0, "repeat_runs": 0})
        item["most_in_session"] = max(item["most_in_session"], _int(row.get("runs")))
        item["repeated_sessions"] += 1
        item["repeat_runs"] += _int(row.get("runs"))
    shapes = sorted(({"shape_key": row.get("shape_key"), "snippet": row.get("snippet"), "kind": row.get("run_kind"),
                      "verb": row.get("verb") or None, **_figures(row),
                      **repeats.get(str(row.get("shape_key")), {"most_in_session": None, "repeated_sessions": 0, "repeat_runs": 0})}
                     for row in _of(rows, "shape")), key=lambda item: -item["runs"])
    projects, small_projects = [], []
    for row in _of(rows, "project"):
        item = {"project": str(row.get("project_name") or ""), **_figures(row)}
        (projects if item["runs"] >= MIN_KQL_PROJECT_RUNS else small_projects).append(item)
    large = [{"session_id": row.get("session_id"), "node_id": row.get("node_id"), "tool": row.get("tool"), "ts": _num(row.get("ts")),
              "route": row.get("route"), "kind": row.get("run_kind"), "verb": row.get("verb") or None,
              "output_bytes": _int(row.get("output_bytes")), "snippet": row.get("snippet"), "text": row.get("text"),
              "project_name": row.get("project_name") or None} for row in _of(rows, "large")]
    large.sort(key=lambda item: -item["output_bytes"])
    meta = next(iter(_of(rows, "meta")), {})
    total = _figures(meta)
    enough = total["runs"] >= MIN_KQL_RUNS and total["sessions"] >= MIN_KQL_SESSIONS
    repeated = max((item for item in shapes if item["repeat_runs"]), key=lambda item: item["repeat_runs"], default=None)
    unrecognised = sum(item["unrecognised"] for item in coverage)
    summary = {
        **total, "enough": enough, "failure_share": _ratio(total["failures"], total["runs"]) if enough else None,
        "large_bytes": _int(meta.get("large_bytes")), "with_text": _int(meta.get("with_text")),
        "top_failure": failure_kinds[0] if failure_kinds and enough else None,
        "change_verbs": sorted({str(item["verb"]) for item in kinds if item["change"] and item["verb"]}),
        "top_shape": shapes[0] if shapes and enough else None, "repeated": repeated if enough else None,
        "unrecognised": unrecognised, "routes": {route: sum(item[route] for item in coverage) for route in ("mcp", "cli", "script")},
        "small_projects": sorted(item["project"] for item in small_projects),
    }
    sessions = [{"session_id": row.get("session_id"), "node_id": row.get("node_id"), "tool": row.get("tool"),
                 "project_name": row.get("project_name") or None, **_figures(row)}
                for row in _of(rows, "session") if row.get("session_id")]
    sessions.sort(key=lambda row: -row["runs"])
    return {"coverage": coverage, "kinds": kinds, "failure_kinds": failure_kinds, "targets": targets, "shapes": shapes,
            "projects": sorted(projects, key=lambda item: -item["runs"]), "large": large, "summary": summary, "sessions": sessions}
