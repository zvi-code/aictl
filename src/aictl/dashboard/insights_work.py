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


def flows(rows: list[dict]) -> dict:
    """What follows what, where sessions stop, the paths they start and end on, and the cycles they repeat."""
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
        outcome["last_steps"].append({"step": row.get("last_step"), "sessions": sessions, "cost_usd": _cost(row)})
    for outcome in endings.values():
        outcome["last_steps"].sort(key=lambda item: (-item["sessions"], str(item["step"])))
        outcome["cost_usd"] = outcome["cost_usd"] if outcome.pop("priced") else None

    def paths(kind: str) -> tuple[list[dict], int]:
        found = [{"steps": _path(row.get("path")), "sessions": _int(row.get("sessions"))} for row in _of(rows, kind)]
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
        cycles.append({"pair": str(row.get("pair") or "").split(" <> "), "loops": _int(row.get("loops")),
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
            "tools": sorted(str(tool) for tool in (row.get("tools") or [])),
        })
    projects.sort(key=lambda item: (-item["sessions"], item["project"]))

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
