"""Insights on the work itself: what each repository cost and produced, where the time went, what was changed.

Each card reads one Kusto view (stores/kusto/queries/insights.<view>.kql) that aggregates in the store and groups
project folders into repositories by the evidence it holds (the ``<repository map>`` block every view carries).
The cards register in insights.py through CARDS, SHAPES, READS and PARAMS. A figure the source does not report
is None, never 0. A group with too little data is marked ``small``: it never drives a headline or a comparison.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from typing import Any

from ..data.model_pricing import canonical_model_id
from .board_filters import Filters
from .projections.history import HistoryScope

ROW_LIMIT = 1000
WEEK = 7 * 86400.0
# A repository with fewer model requests than this is too small to compare: spend stands on requests.
MIN_REQUESTS = 50
# A share of sessions (changed nothing, started by a script) needs this many sessions.
MIN_SESSIONS = 3
# Cost per commit needs this many commits; cost per changed file this many files.
MIN_COMMITS = 3
MIN_FILES = 5

# Percentiles of session times need this many sessions; a tool's or model's 95th percentile this many calls or requests.
MIN_TIMED_SESSIONS = 5
MIN_CALLS = 20

CARDS = {
    "repos": "insights.repositories",
    "durations": "insights.durations",
}


def _n(value: Any) -> float:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else 0.0


def _int(value: Any) -> int:
    return int(_n(value))


def _num(value: Any) -> float | None:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _ms(seconds: Any) -> float | None:
    value = _num(seconds)
    return value * 1000 if value is not None else None


def _ratio(part: float | None, whole: float | None) -> float | None:
    return part / whole if part is not None and whole else None


def _of(rows: list[dict], kind: str) -> list[dict]:
    return [row for row in rows if row.get("row_type") == kind]


def folder_name(path: str) -> str:
    """The last folder of a path, as the project picker names a project."""
    parts = [part for part in str(path).replace("\\", "/").split("/") if part]
    return parts[-1] if parts else str(path)


def step_for(filters: Filters) -> float:
    """Width of a time bin: a week, or whole weeks so the period has at most 8 bins (all history: a year)."""
    span = filters.until - filters.since if filters.since > 0 else 365 * 86400.0
    return WEEK * max(1, math.ceil(span / (8 * WEEK)))


def filter_params(filters: Filters) -> dict:
    """The page's tool and model filters, as the work views take them."""
    params: dict = {}
    if filters.tools is not None:
        params |= {"restrict_tools": True, "requested_tools": list(filters.tools)}
    if filters.model and filters.model != "all":
        params["requested_models"] = [canonical_model_id(filters.model)]
    return params


def repositories(rows: list[dict]) -> dict:
    """One row per repository (or folder): spend at list price and its share, and what its sessions produced."""
    models: dict[str, list[dict]] = {}
    for row in _of(rows, "model"):
        models.setdefault(str(row.get("repo")), []).append({"model": row.get("model") or None, "requests": _int(row.get("requests")),
                                                            "cost_usd": _num(row.get("cost_usd"))})
    sessions: dict[str, list[dict]] = {}
    for row in _of(rows, "session"):
        sessions.setdefault(str(row.get("repo")), []).append({
            "session_id": row.get("session_id"), "node_id": row.get("node_id"), "tool": row.get("tool"),
            "repo": row.get("repo"), "cost_usd": _num(row.get("cost_usd")), "requests": _int(row.get("requests")),
            "agent_ms": _ms(row.get("agent_s")), "files": _int(row.get("files")), "commits": _int(row.get("commits")),
            "calls": _int(row.get("calls")), "failed": _int(row.get("failed")),
            "scripted": None if row.get("scripted") is None else bool(row.get("scripted")), "started_at": _num(row.get("started_at")),
        })
    bins: dict[str, list[dict]] = {}
    for row in _of(rows, "bin"):
        bins.setdefault(str(row.get("repo")), []).append({"start": _n(row.get("bin_start")), "cost_usd": _n(row.get("cost_usd")),
                                                          "commits": _int(row.get("commits")), "sessions": _int(row.get("sessions"))})
    repos = []
    for row in _of(rows, "repo"):
        repo = str(row.get("repo") or "")
        priced, requests = _int(row.get("priced")), _int(row.get("requests"))
        cost = _n(row.get("cost_usd")) if priced else None
        commits, files = _int(row.get("commits")), _int(row.get("files"))
        calls = _int(row.get("calls"))
        timed = _int(row.get("timed_sessions"))
        sessions_n = _int(row.get("sessions"))
        repos.append({
            "repo": repo, "name": folder_name(repo), "kind": "repository" if _int(row.get("repository")) else "folder",
            "projects": _int(row.get("projects")), "nodes": _int(row.get("nodes")), "sessions": sessions_n,
            "scripted": _int(row.get("scripted")), "person": _int(row.get("person")),
            "unclassified": sessions_n - _int(row.get("scripted")) - _int(row.get("person")),
            "cost_usd": cost, "priced": priced, "requests": requests, "unpriced": _int(row.get("unpriced")),
            "agent_ms": _n(row.get("agent_s")) * 1000 if timed else None, "timed_sessions": timed,
            "calls": calls, "failed": _int(row.get("failed")), "failed_share": _ratio(_n(row.get("failed")), calls),
            "test_runs": _int(row.get("test_runs")), "writes": _int(row.get("writes")), "files": files,
            "lines_added": _int(row.get("lines_added")), "lines_removed": _int(row.get("lines_removed")),
            "lines_unknown": _int(row.get("lines_unknown")), "commits": commits, "commit_sessions": _int(row.get("commit_sessions")),
            "idle_sessions": _int(row.get("idle_sessions")),
            "cost_per_commit": _ratio(cost, commits) if commits >= MIN_COMMITS else None,
            "cost_per_file": _ratio(cost, files) if files >= MIN_FILES else None,
            "small": requests < MIN_REQUESTS,
            "models": sorted(models.pop(repo, []), key=lambda item: (-item["requests"], str(item["model"]))),
            "top_sessions": sorted(sessions.pop(repo, []), key=lambda item: -(item["cost_usd"] or 0.0)),
            "bins": sorted(bins.pop(repo, []), key=lambda item: item["start"]),
        })
    total = sum(repo["cost_usd"] or 0.0 for repo in repos)
    for repo in repos:
        repo["cost_share"] = _ratio(repo["cost_usd"], total)
    repos.sort(key=lambda repo: (-(repo["cost_usd"] or 0.0), -repo["sessions"], repo["repo"]))
    compared = [repo for repo in repos if not repo["small"]]
    top = compared[0] if compared and compared[0]["cost_usd"] else None
    per_commit = sorted((repo for repo in compared if repo["cost_per_commit"] is not None), key=lambda repo: -repo["cost_per_commit"])
    commits = sum(repo["commits"] for repo in repos)
    priced = any(repo["priced"] for repo in repos)
    summary = {
        "repos": len(repos), "sessions": sum(repo["sessions"] for repo in repos), "cost_usd": total if priced else None,
        "commits": commits, "files": sum(repo["files"] for repo in repos),
        "scripted": sum(repo["scripted"] for repo in repos), "person": sum(repo["person"] for repo in repos),
        "idle_sessions": sum(repo["idle_sessions"] for repo in repos),
        "agent_ms": sum(repo["agent_ms"] or 0.0 for repo in repos) if any(repo["agent_ms"] is not None for repo in repos) else None,
        "unpriced": sum(repo["unpriced"] for repo in repos),
        "top": _brief(top) if top else None,
        "dearest_per_commit": _brief(per_commit[0]) if len(per_commit) > 1 else None,
        "cheapest_per_commit": _brief(per_commit[-1]) if len(per_commit) > 1 else None,
        "cost_per_commit": _ratio(total, commits) if priced and commits >= MIN_COMMITS else None,
        "small": [repo["name"] for repo in repos if repo["small"]],
        "folders": sum(repo["kind"] == "folder" for repo in repos),
    }
    flat = [session for repo in repos for session in repo["top_sessions"]]
    return {"repos": repos, "summary": summary, "sessions": flat}


def _brief(repo: dict) -> dict:
    return {key: repo[key] for key in ("repo", "name", "kind", "sessions", "cost_usd", "cost_share", "commits", "files",
                                        "cost_per_commit", "cost_per_file", "idle_sessions")}


_TIMES = ("agent_s", "wait_s", "p50_agent_s", "p90_agent_s", "max_agent_s", "p50_wall_s", "p90_wall_s", "max_wall_s",
          "p50_first_change_s", "p90_first_change_s")


def _times(row: dict) -> dict:
    """The session-time figures of a repo or 'all' row, in ms; a percentile of no session is None."""
    timed, walled, changed = _int(row.get("timed")), _int(row.get("walled")), _int(row.get("changed"))
    out = {"sessions": _int(row.get("sessions")), "timed": timed, "walled": walled, "changed": changed,
           "waits": _int(row.get("waits")), "requests": _int(row.get("requests")), "calls": _int(row.get("calls")),
           "model_ms": _num(row.get("model_ms")), "tool_ms": _num(row.get("tool_ms"))}
    for key in _TIMES:
        known = {"agent": timed, "wait": timed, "wall": walled, "first": changed}[key.split("_")[1 if key[0] in "pm" else 0]]
        out[key.removesuffix("_s") + "_ms"] = _ms(row.get(key)) if known else None
    return out


def durations(rows: list[dict]) -> dict:
    """Where the sessions' time goes, per repository: working time, waiting, model and tool time, and how long things take."""
    repos = []
    for row in _of(rows, "repo"):
        repo = str(row.get("repo") or "")
        figures = _times(row)
        repos.append({"repo": repo, "name": folder_name(repo), "kind": "repository" if _int(row.get("repository")) else "folder",
                      **figures, "small": figures["timed"] < MIN_TIMED_SESSIONS})
    total = next(iter(_of(rows, "all")), {})
    overall = _times(total) if total else _times({})
    agent = sum(repo["agent_ms"] or 0.0 for repo in repos)
    for repo in repos:
        repo["agent_share"] = _ratio(repo["agent_ms"], agent)
    repos.sort(key=lambda repo: (-(repo["agent_ms"] or 0.0), -repo["sessions"], repo["repo"]))
    tools = [{
        "name": row.get("name") or None, "program": bool(row.get("program")), "calls": _int(row.get("calls")),
        "timed": _int(row.get("timed")), "total_ms": _num(row.get("total_ms")), "p50_ms": _num(row.get("p50_ms")),
        "p95_ms": _num(row.get("p95_ms")), "failed": _int(row.get("failed")),
        "failed_share": _ratio(_n(row.get("failed")), _n(row.get("calls"))), "repo": row.get("repo") or None,
        "repo_name": folder_name(row.get("repo")) if row.get("repo") else None, "repo_ms": _num(row.get("repo_ms")),
        "small": _int(row.get("timed")) < MIN_CALLS,
    } for row in _of(rows, "tool")]
    tools.sort(key=lambda tool: -(tool["total_ms"] or 0.0))
    models = [{
        "model": row.get("model") or None, "requests": _int(row.get("requests")), "timed": _int(row.get("timed")),
        "total_ms": _num(row.get("total_ms")), "p50_ms": _num(row.get("p50_ms")), "p95_ms": _num(row.get("p95_ms")),
        "small": _int(row.get("timed")) < MIN_CALLS,
    } for row in _of(rows, "model")]
    models.sort(key=lambda model: -(model["total_ms"] or 0.0))
    sessions = [{
        "session_id": row.get("session_id"), "node_id": row.get("node_id"), "tool": row.get("tool"), "repo": row.get("repo"),
        "agent_ms": _ms(row.get("agent_s")), "wait_ms": _ms(row.get("wait_s")), "wall_ms": _ms(row.get("wall_s")),
        "model_ms": _num(row.get("model_ms")), "tool_ms": _num(row.get("tool_ms")), "first_change_ms": _ms(row.get("first_change_s")),
        "requests": _int(row.get("requests")), "calls": _int(row.get("calls")),
    } for row in _of(rows, "session") if row.get("session_id")]
    compared = [repo for repo in repos if not repo["small"] and repo["agent_ms"]]
    slow_tools = sorted((tool for tool in tools if not tool["small"] and tool["p95_ms"] is not None), key=lambda tool: -tool["p95_ms"])
    slow_models = sorted((model for model in models if not model["small"] and model["p95_ms"] is not None),
                         key=lambda model: -model["p95_ms"])
    top_tool = next((tool for tool in tools if tool["total_ms"]), None)
    summary = {
        **overall,
        "top": {key: compared[0][key] for key in ("repo", "name", "kind", "sessions", "agent_ms", "agent_share", "p50_agent_ms")}
        if compared else None,
        "top_tool": {**top_tool, "share": _ratio(top_tool["total_ms"], overall["tool_ms"])} if top_tool else None,
        "slowest_tool": slow_tools[0] if slow_tools else None,
        "slowest_model": slow_models[0] if slow_models else None,
        "small": [repo["name"] for repo in repos if repo["small"]],
    }
    return {"repos": repos, "tools": tools, "models": models, "summary": summary, "sessions": sessions}


SHAPES: dict[str, Callable[[list[dict]], dict]] = {
    "repos": repositories,
    "durations": durations,
}
# Each view is named literally where it is read, so the history paging guard can check that it is bounded.
READS: dict[str, Callable[[HistoryScope, dict], list[dict]]] = {
    "repos": lambda history, params: history.read("insights.repositories", limit=ROW_LIMIT, **params),
    "durations": lambda history, params: history.read("insights.durations", limit=ROW_LIMIT, **params),
}
# The parameters a work view takes besides the period: the page's tool and model filters, and the bin width.
PARAMS: dict[str, Callable[[Filters], dict]] = {
    "repos": lambda filters: {**filter_params(filters), "step": step_for(filters)},
    "durations": filter_params,
}
