"""Project context budgets, inventory, and growth."""

from __future__ import annotations

import json
import os
import re
import threading
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import parse_qs

from ..data.provenance import CACHE_NOT_REPORTED, NO_LIST_PRICE
from ..stores.base import StoreConfigurationError
from ..tool_scope import normalize_selection, stored_ids_for
from .board_filters import MEMO_TTL_S
from .board_projection import _list_cost
from .projection_utils import _as_number, _basename, _label
from .projections.history import (
    HistoryScope,
)
from .queryable_context import _SENT_TO_MODEL

CONTEXT_RECENT_S = 300.0


CONTEXT_DAYS = 7


CONTEXT_GROWTH_S = 7 * 86400.0


CONTEXT_GROWTH_POINTS = 120


# Files listed for each tool, largest first. The category totals count every file.
CONTEXT_MAX_FILES = 400


CONTEXT_MAP_ITEMS = 15


CONTEXT_ERRORS = 20


CONTEXT_DB_TTL_S = 60.0


CONTEXT_MEMO_KEYS = 8


# Where a budget's model came from when the tool's calls named it.
OBSERVED_MODEL = "most used in the last 7 days"


_CONTEXT_SKIP = frozenset({"aictl", "any"})


_CONTEXT_GLOBAL_SCOPES = frozenset({"global", "session"})


_CONTEXT_GLOBAL_PARTS = ("/.claude/", "/.config/", "/Library/", "/AppData/")


_CONTEXT_FIXTURE_RE = re.compile(r"/(fixtures?|__fixtures__|__tests__)/")


_CONTEXT_SENTINEL_RE = re.compile(r"^(SKILL|skill|index|INDEX|README|readme)$")


# A folder a tool reads from inside a repository; the folder above it names the repository.
_REPO_MARKERS = frozenset({".github", ".claude", ".cursor", ".windsurf", ".codex", ".gemini", ".agents", ".vscode", ".continue"})


_MEMORY_LABELS = {
    "claude-user-memory": "Claude user memory",
    "claude-project-memory": "Claude project memory",
    "claude-auto-memory": "Claude auto memory",
    "copilot-memory": "Copilot memory",
    "copilot-agent-definition": "Copilot agent definition",
    "copilot-session-state": "Copilot session state",
    "copilot-user-memory": "Copilot instructions",
    "codex-user-memory": "Codex instructions",
    "windsurf-user-memory": "Windsurf global rules",
}


_context_memo: dict[tuple, bytes] = {}


_context_db_memo: dict[tuple, tuple[float, dict]] = {}


_context_lock = threading.Lock()


def _ctx_field(obj: Any, name: str, default: Any = None) -> Any:
    value = obj.get(name, default) if isinstance(obj, dict) else getattr(obj, name, default)
    return default if value is None else value


def _ctx_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def context_policy(sent_to_llm: str | None) -> str:
    """The Context Window Map's policy of a file: yes, on-demand, conditional or no."""
    v = (sent_to_llm or "").lower()
    if v in ("yes", "on-demand", "unknown"):
        return v
    if v in ("conditional", "partial"):
        return "conditional"
    return "no"


def _repository(path: str) -> str | None:
    """The folder that holds a tool folder such as ``.github`` or ``.claude``: the repository's name."""
    parts = path.split("/")
    for i, part in enumerate(parts):
        if i > 0 and parts[i - 1] and part.lower() in _REPO_MARKERS:
            return parts[i - 1]
    return None


def is_context(f: Any) -> bool:
    """Whether the path tables say the tool loads this file into the model's context. Transcripts,
    databases, logs, caches, settings and credentials are not; a file no row describes is not known."""
    return (f.sent_to_llm or "") in _SENT_TO_MODEL


def context_project(path: str, root: str, scope: str = "") -> str:
    """The project a file belongs to: the first folder under the root, the repository that holds
    the tool folder (a reported node has no root here), or a bracketed place."""
    if scope in _CONTEXT_GLOBAL_SCOPES:
        return "(global)"
    p = (path or "").replace("\\", "/")
    r = (root or "").replace("\\", "/").rstrip("/")
    if not p:
        return "(unknown)"
    if r and p.startswith(r + "/"):
        first = p[len(r) + 1 :].split("/")[0]
        return "(root)" if first.startswith(".") else first
    if "/.claude/projects/" in p:
        return "(shadow)"
    repository = _repository(p) if scope == "project" else None
    if repository:
        return repository
    if any(part in p for part in _CONTEXT_GLOBAL_PARTS):
        return "(global)"
    return "(other)"


def context_item_name(path: str) -> str:
    """A file's short name without extension. SKILL.md, index.md and README.md take their folder's name."""
    parts = (path or "").replace("\\", "/").split("/")
    fname = parts.pop() if parts else ""
    if not fname:
        return "unknown"
    dot = fname.rfind(".")
    base = fname[:dot] if dot > 0 else fname
    if _CONTEXT_SENTINEL_RE.match(base) and parts and parts[-1]:
        return parts[-1]
    return base


def _context_tools(snapshot: Any, tools: tuple[str, ...] | None) -> list[Any]:
    from ..tools import budget_tools

    listed = [t for t in (_ctx_field(snapshot, "tools", []) or []) if _ctx_field(t, "tool", "") not in _CONTEXT_SKIP]
    return budget_tools(listed, tools)


def _context_model(tool: str, configs: list, telemetry: dict[str, dict],
                   observed: dict[str, list[dict]] | None = None) -> tuple[str | None, str | None]:
    """The model a tool's budget is measured against, and where that came from.

    The model its calls used most in the last seven days comes first: a setting such as
    "sonnet" names what new sessions start with, not what the sessions ran.
    """
    used = _observed_for(tool, observed)
    if used:
        return str(used[0]["model"]), OBSERVED_MODEL
    for c in configs:
        if isinstance(c, dict) and c.get("tool") == tool and c.get("model"):
            return str(c["model"]), "settings"
    tel = telemetry.get(tool) or {}
    current = (tel.get("quota_state") or {}).get("current_model")
    if current:
        return str(current), "telemetry"
    by_model = tel.get("by_model") or {}
    if isinstance(by_model, dict) and by_model:
        used = max(by_model, key=lambda m: _ctx_int((by_model[m] or {}).get("input_tokens")) + _ctx_int((by_model[m] or {}).get("output_tokens")))
        return str(used), "most used"
    return None, None


def _observed_for(tool: str, observed: dict[str, list[dict]] | None) -> list[dict]:
    if not observed:
        return []
    for name in (tool, *stored_ids_for([tool])):
        if observed.get(name):
            return observed[name]
    return []


def _share(tokens: int, window: int | None) -> float | None:
    return round(tokens / window, 4) if window else None


def _context_budget(tool: Any, root: str, model: str | None, model_from: str | None,
                    observed: list[dict] | None = None) -> dict:
    from ..data.model_pricing import context_window_for
    from ..tools import compute_token_budget

    b = compute_token_budget([tool], root)
    # No limit is assumed: a model whose limit no source states gives no share.
    window = context_window_for(model) if model else None
    window_note = None if window else (f"no context limit is known for {model}" if model else "no model observed or set")
    global_tokens = b["global_tokens"]
    projects = []
    for name, buckets in (b.get("projects") or {}).items():
        own = buckets["always"] + buckets["on_demand"] + buckets["conditional"]
        projects.append(
            {
                "project": name,
                "always": buckets["always"],
                "on_demand": buckets["on_demand"],
                "conditional": buckets["conditional"],
                "tokens": own,
                "estimate": global_tokens + own,
                "share": _share(global_tokens + own, window),
            }
        )
    projects.sort(key=lambda p: -p["tokens"])
    always = b["always_loaded_tokens"]
    potential = b["total_potential_tokens"]
    return {
        "tool": tool.tool,
        "label": _ctx_field(tool, "label", "") or _label(tool.tool),
        "model": model,
        "model_from": model_from,
        "window": window,
        "window_assumed": False,
        "window_note": window_note,
        # Each model the tool's calls named in the last seven days, with its own limit when known.
        "models_observed": observed or [],
        "always": always,
        "on_demand": b["on_demand_tokens"],
        "conditional": b["conditional_tokens"],
        "cacheable": b["cacheable_tokens"],
        "survives_compaction": b["survives_compaction_tokens"],
        "never_sent_files": b["never_sent_count"],
        "max_potential": potential,
        "always_share": _share(always, window),
        "potential_share": _share(potential, window),
        "global_tokens": global_tokens,
        "largest_project": b["largest_project"] or None,
        "raw_total": b["raw_total_all_projects"],
        "projects": projects,
    }


def _context_categories(tool: Any) -> dict:
    from ..tools import budget_bucket

    # Only files the tool loads into the model count; transcripts, databases and logs never do.
    kinds: dict[str, dict] = {}
    for f in tool.files:
        if not is_context(f):
            continue
        kind = f.kind or "other"
        row = kinds.setdefault(kind, {"kind": kind, "files": 0, "bytes": 0, "tokens": 0, "always": 0, "on_demand": 0, "conditional": 0})
        tok = _ctx_int(f.tokens)
        row["files"] += 1
        row["bytes"] += _ctx_int(f.size)
        row["tokens"] += tok
        row[budget_bucket(f.sent_to_llm, f.loaded_when)] += tok
    rows = sorted(kinds.values(), key=lambda r: (-r["tokens"], r["kind"]))
    return {
        "tool": tool.tool,
        "label": _ctx_field(tool, "label", "") or _label(tool.tool),
        **{key: sum(r[key] for r in rows) for key in ("files", "tokens", "always", "on_demand", "conditional")},
        "kinds": rows,
    }


def _context_excluded(tool: Any) -> list[dict]:
    """The files a tool keeps that are not model context, counted by kind: never sent, or no known policy."""
    out: dict[tuple, dict] = {}
    for f in tool.files:
        if is_context(f):
            continue
        kind = f.kind or "other"
        policy = "unknown" if (f.sent_to_llm or "unknown") == "unknown" else "no"
        row = out.setdefault((kind, policy), {"kind": kind, "policy": policy, "files": 0, "bytes": 0})
        row["files"] += 1
        row["bytes"] += _ctx_int(f.size)
    return sorted(out.values(), key=lambda r: (-r["files"], r["kind"], r["policy"]))


def _file_sessions() -> dict[str, list[str]]:
    """Live sessions each discovered file can affect, by normalized path (see tree_walk.session_links)."""
    from ..tree_walk import session_links

    out: dict[str, list[str]] = {}
    try:
        links = session_links()
    except Exception:  # noqa: BLE001 - discovery data is optional for this view
        return out
    for link in links.values():
        for f in link.get("files", []):
            out.setdefault(os.path.normcase(os.path.normpath(f["path"])), []).extend(f.get("sessions", []))
    return out


def _context_file(f: Any, tool: str, root: str, now: float, sessions: dict[str, list[str]] | None = None) -> dict:
    from ..tools import budget_bucket

    mtime = _as_number(f.mtime) or None
    return {
        # Live sessions are known from this machine's discovery only; a reported inventory does not have them.
        "sessions": None if sessions is None else sorted(set(sessions.get(os.path.normcase(os.path.normpath(str(f.path))), []))),
        "path": f.path,
        "name": _basename(f.path),
        "tool": tool,
        "kind": f.kind or "other",
        "scope": f.scope or None,
        "project": context_project(f.path, root, f.scope),
        "size": _ctx_int(f.size),
        "tokens": _ctx_int(f.tokens),
        "sent_to_llm": f.sent_to_llm or None,
        "policy": context_policy(f.sent_to_llm),
        "load": None if f.sent_to_llm == "unknown" else budget_bucket(f.sent_to_llm, f.loaded_when),
        "loaded_when": f.loaded_when or None,
        "cacheable": f.cacheable or None,
        "mtime": mtime,
        "recent": bool(mtime and 0 <= now - mtime < CONTEXT_RECENT_S),
    }


def _context_map(tool_list: list[Any], root: str) -> dict:
    cells: dict[tuple, dict] = {}
    items: dict[tuple, dict[str, int]] = {}
    policy = {"yes": 0, "on-demand": 0, "conditional": 0}
    total = 0
    for t in tool_list:
        for f in t.files:
            if not is_context(f):
                continue
            tok = _ctx_int(f.tokens)
            kind = f.kind or "other"
            scope = f.scope or "external"
            project = context_project(f.path, root, f.scope)
            pol = context_policy(f.sent_to_llm)
            cell = cells.setdefault((t.tool, kind, scope, project, pol), {"files": 0, "tokens": 0})
            cell["files"] += 1
            cell["tokens"] += tok
            named = items.setdefault((project, kind), {})
            name = context_item_name(f.path)
            named[name] = named.get(name, 0) + tok
            policy[pol] = policy.get(pol, 0) + tok
            total += tok
    rows = [
        {"tool": k[0], "kind": k[1], "scope": k[2], "project": k[3], "policy": k[4], **v}
        for k, v in sorted(cells.items(), key=lambda kv: (-kv[1]["tokens"], kv[0]))
    ]
    item_rows = []
    for (project, kind), named in sorted(items.items()):
        ranked = sorted(named.items(), key=lambda kv: (-kv[1], kv[0]))
        top = ranked[:CONTEXT_MAP_ITEMS]
        rest = sum(v for _, v in ranked[CONTEXT_MAP_ITEMS:])
        item_rows.extend({"project": project, "kind": kind, "name": n, "tokens": v} for n, v in top)
        if rest:
            item_rows.append({"project": project, "kind": kind, "name": "(other)", "tokens": rest})
    return {"total": total, "policy": policy, "rows": rows, "items": item_rows}


def _context_memory(snapshot: Any, now: float) -> list[dict]:
    out = []
    for m in _ctx_field(snapshot, "agent_memory", []) or []:
        path = str(_ctx_field(m, "file", "") or "")
        source = str(_ctx_field(m, "source", "") or "")
        mtime = _as_number(_ctx_field(m, "mtime", 0)) or None
        out.append(
            {
                "file": path,
                "name": _basename(path),
                "source": source,
                "source_label": _MEMORY_LABELS.get(source, source or "Other"),
                "profile": str(_ctx_field(m, "profile", "") or ""),
                "tokens": _ctx_int(_ctx_field(m, "tokens", 0)),
                "lines": _ctx_int(_ctx_field(m, "lines", 0)),
                "mtime": mtime,
                "recent": bool(mtime and 0 <= now - mtime < CONTEXT_RECENT_S),
            }
        )
    return out


def _context_telemetry(raw: dict) -> dict:
    quota = raw.get("quota_state") if isinstance(raw.get("quota_state"), dict) else {}
    by_model = raw.get("by_model") if isinstance(raw.get("by_model"), dict) else {}
    errors = [e for e in raw.get("errors") or [] if isinstance(e, dict)]
    errors.sort(key=lambda e: str(e.get("timestamp") or ""), reverse=True)
    quality = raw.get("cost_quality") or "unknown"
    cost = _as_number(raw.get("cost_usd"))
    changes = quota.get("code_changes") if isinstance(quota.get("code_changes"), dict) else None
    active_in = _ctx_int(raw.get("active_session_input"))
    active_out = _ctx_int(raw.get("active_session_output"))
    tool = str(raw.get("tool") or "")
    return {
        "tool": tool,
        "label": _label(tool),
        "source": raw.get("source") or None,
        "confidence": _as_number(raw.get("confidence")),
        "as_of": raw.get("as_of") or None,
        "token_quality": raw.get("token_quality") or None,
        "input": _ctx_int(raw.get("input_tokens")),
        "output": _ctx_int(raw.get("output_tokens")),
        "cache_read": _ctx_int(raw.get("cache_read_tokens")),
        "cache_write": _ctx_int(raw.get("cache_creation_tokens")),
        "sessions": _ctx_int(raw.get("total_sessions")),
        "messages": _ctx_int(raw.get("total_messages")),
        # A cost of 0 with no price source is not known, not free.
        "cost_usd": None if quality == "unknown" and not cost else cost,
        "cost_quality": quality,
        "cost_reason": raw.get("cost_reason") or None,
        "premium_requests": _as_number(quota.get("premium_requests_used")) or None,
        "quota": {
            "premium_requests": _as_number(quota.get("premium_requests_used")) or None,
            "api_duration_ms": _as_number(quota.get("total_api_duration_ms")) or None,
            "current_model": quota.get("current_model") or None,
            "lines_added": _ctx_int(changes.get("lines_added")) if changes else None,
            "lines_removed": _ctx_int(changes.get("lines_removed")) if changes else None,
            "files_modified": _ctx_int(changes.get("files_modified")) if changes else None,
        },
        "active": {"input": active_in, "output": active_out, "messages": _ctx_int(raw.get("active_session_messages"))} if active_in or active_out else None,
        "by_model": sorted(
            (
                {
                    "model": str(model),
                    "input": _ctx_int(u.get("input_tokens")),
                    "output": _ctx_int(u.get("output_tokens")),
                    "cache_read": _ctx_int(u.get("cache_read_tokens")),
                    "cache_write": _ctx_int(u.get("cache_creation_tokens")),
                    "requests": _ctx_int(u.get("requests")) or None,
                    "cost_usd": _as_number(u.get("cost_usd")) or None,
                }
                for model, u in by_model.items()
                if isinstance(u, dict)
            ),
            key=lambda r: -(r["input"] + r["output"]),
        ),
        "errors": [
            {"ts": e.get("timestamp") or None, "type": e.get("type") or None, "message": str(e.get("message") or ""), "model": e.get("model") or None}
            for e in errors[:CONTEXT_ERRORS]
        ],
    }


def _is_workflow(path: str, kind: str) -> bool:
    lower = path.lower()
    return path.endswith(".workflow.md") or kind in ("workflow", "workflows") or (kind in ("command", "commands") and "/workflows/" in lower)


def _is_prompt(path: str, kind: str) -> bool:
    lower = path.lower()
    return path.endswith(".prompt.md") or kind == "prompt" or (kind in ("command", "commands") and ("/prompts/" in lower or "/commands/" in lower))


def _context_workflows(tool_list: list[Any], root: str) -> list[dict]:
    out: dict[str, dict] = {}
    for t in tool_list:
        for f in t.files:
            path = (f.path or "").replace("\\", "/")
            kind = f.kind or ""
            if not path or path in out or _CONTEXT_FIXTURE_RE.search("/" + path.lower()):
                continue
            if _is_workflow(path, kind):
                what, suffix = "workflow", ".workflow.md"
            elif _is_prompt(path, kind):
                what, suffix = "prompt", ".prompt.md"
            else:
                continue
            name = _basename(path)
            name = name[: -len(suffix)] if name.endswith(suffix) else (name[:-3] if name.endswith(".md") else name)
            out[path] = {
                "path": f.path,
                "name": name,
                "type": what,
                "kind": kind or None,
                "tool": t.tool,
                # Files of one name in several repositories differ only here.
                "project": context_project(path, root, f.scope or ""),
                "size": _ctx_int(f.size),
                "tokens": _ctx_int(f.tokens),
                "mtime": _as_number(f.mtime) or None,
            }
    return sorted(out.values(), key=lambda w: (w["type"], w["name"].lower(), w["project"].lower(), w["path"]))


def _read_context_daily(history: HistoryScope, tools: tuple[str, ...] | None, now: float) -> list[dict]:
    days, _ = _context_days(now)
    dates = [datetime.strptime(day, "%Y-%m-%d") for day in days]
    starts = [day.timestamp() for day in dates] + [(dates[-1] + timedelta(days=1)).timestamp()]
    return history.read("context.daily", since=starts[0], until=starts[-1], calendar_days=days,
                        calendar_starts=starts, restrict_tools=tools is not None,
                        requested_tools=list(stored_ids_for(tools)) if tools is not None else [])


def _daily_from_rows(rows: list[dict], now: float) -> dict:
    days, first = _context_days(now)
    sums = ("calls", "input", "output", "cache_read", "cache_write", "stored", "ri", "ro", "rcr", "rcw", "unknown")
    # The view answers per tool; the daily table is per day and model.
    merged: dict[tuple[str, str], dict] = {}
    for r in rows:
        # Kusto can parse a date in the dynamic calendar as a datetime.
        key = (str(r["day"])[:10], r["model"] or "")
        into = merged.setdefault(key, {"model": r["model"], **{k: None for k in sums}, "last_ts": None})
        for k in sums:
            if r.get(k) is not None:
                into[k] = (into[k] or 0) + r[k]
        if r.get("last_ts") is not None:
            into["last_ts"] = max(into["last_ts"] or 0.0, r["last_ts"])
    fields = ("model", *sums, "last_ts")
    return _project_context_daily(days, first, [(day, *(row[k] for k in fields)) for (day, _m), row in merged.items()])


def observed_models(rows: list[dict]) -> dict[str, list[dict]]:
    """The models each tool's calls named in the last seven days, most tokens first, with each one's context limit.

    A limit comes from data/model_pricing.context_window_for; None when no source states it.
    """
    from ..data.model_pricing import context_window_for

    tokens: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for r in rows:
        if r.get("model") and r.get("tool"):
            tokens[str(r["tool"])][str(r["model"])] += sum(_ctx_int(r.get(k)) for k in ("input", "output", "cache_read", "cache_write"))
    return {tool: [{"model": m, "tokens": n, "window": context_window_for(m)}
                   for m, n in sorted(models.items(), key=lambda kv: (-kv[1], kv[0]))]
            for tool, models in tokens.items()}


def _project_context_daily(days, first, values):
    rows = []
    models: dict[str, dict] = {}
    for day, model, n, i, o, cr, cw, stored, ri, ro, rcr, rcw, unknown, last in values:
        if day not in days:
            continue
        name = model or None
        i, o, cr, cw = (_ctx_int(v) for v in (i, o, cr, cw))
        rest = _ctx_int(ri) + _ctx_int(ro) + _ctx_int(rcr) + _ctx_int(rcw)
        listed = _list_cost(model, _ctx_int(ri), _ctx_int(ro), _ctx_int(rcr), _ctx_int(rcw), last)[0] if rest and model else None
        cost = None if rest and listed is None else round((stored or 0.0) + (listed or 0.0), 6)
        reason = NO_LIST_PRICE if cost is None else None
        if _ctx_int(unknown):
            # Calls stored with no cost have none that can be known, so the day's cost of the model is not known.
            cost, reason = None, CACHE_NOT_REPORTED
        tokens = i + o + cr + cw
        rows.append(
            {"date": day, "model": name, "requests": n, "input": i, "output": o, "cache_read": cr, "cache_write": cw,
             "tokens": tokens, "cost_usd": cost} | ({"cost_reason": reason} if reason and tokens else {})
        )
        m = models.setdefault(name or "", {"model": name, "tokens": 0, "requests": 0, "cost_usd": 0.0})
        m["tokens"] += tokens
        m["requests"] += n
        m["cost_usd"] = None if m["cost_usd"] is None or cost is None else round(m["cost_usd"] + cost, 6)
    rows.sort(key=lambda r: (r["date"], -r["tokens"]))
    return {"days": days, "since": first, "models": sorted(models.values(), key=lambda m: -m["tokens"]), "rows": rows}


def _context_db_parts(db: Any, tools: tuple[str, ...] | None, now: float, *, history=None) -> dict:
    from ..stores import UnresolvedObservationsError

    history = history or HistoryScope.local(db)
    key = (history.reader, tools)
    with _context_lock:
        hit = _context_db_memo.get(key)
    if hit and 0 <= now - hit[0] < CONTEXT_DB_TTL_S:
        return hit[1]
    observed: dict[str, list[dict]] = {}
    try:
        daily_rows = _read_context_daily(history, tools, now)
        daily, observed = _daily_from_rows(daily_rows, now), observed_models(daily_rows)
    except UnresolvedObservationsError as exc:
        daily = {**_context_daily_empty(now), "available": False, **exc.to_dict()}
    except StoreConfigurationError as exc:
        return {"daily": {**_context_daily_empty(now), "available": False, "reason": str(exc).lower()}, "growth": [],
                "observed": {}}
    growth = history.read("context.growth", since=now - CONTEXT_GROWTH_S, until=now,
                          growth_points=CONTEXT_GROWTH_POINTS)
    parts = {"daily": daily, "observed": observed, "growth": [
        {"ts": r["ts"], "mem_tokens": _ctx_int(r["mem_tokens"]), "memory_entries": _ctx_int(r["memory_entries"])}
        for r in growth
    ]}
    with _context_lock:
        _context_db_memo[key] = (now, parts)
        while len(_context_db_memo) > CONTEXT_MEMO_KEYS:
            _context_db_memo.pop(next(iter(_context_db_memo)))
    return parts


def _context_days(now: float) -> tuple[list[str], float]:
    """The last CONTEXT_DAYS local dates, oldest first, and the start of the first."""
    today = datetime.fromtimestamp(now)
    days = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(CONTEXT_DAYS - 1, -1, -1)]
    return days, datetime.strptime(days[0], "%Y-%m-%d").timestamp()


def _context_daily_empty(now: float) -> dict:
    days, first = _context_days(now)
    return {"days": days, "since": first, "models": [], "rows": []}


def compute_context(db: Any, store: Any, tools: tuple[str, ...] | None = None, now: float | None = None, *,
                    projects: tuple[str, ...] = ()) -> dict:
    """Everything ``GET /api/board/context`` returns. Token counts are estimates at four characters per token.

    *projects* narrows what the history shows (the daily use by model); the tools' files are this machine's."""
    from .project_filter import scoped

    now = time.time() if now is None else now
    snapshot = getattr(store, "snapshot", None)
    history = scoped(HistoryScope.local(db), projects)
    from .queryable_context import context_snapshot

    try:
        snapshot = context_snapshot(db, snapshot, history=history)
    except StoreConfigurationError:
        return _context_from_snapshot(snapshot, tools, now, False, _context_db_parts(db, tools, now, history=history))
    return _context_from_snapshot(snapshot, tools, now, True, _context_db_parts(db, tools, now, history=history))


def _context_from_snapshot(snapshot: Any, tools: tuple[str, ...] | None, now: float, queryable: bool, db_parts: dict,
                           *, global_budget: bool = False) -> dict:
    from ..tool_scope import is_selected
    from ..tools import compute_token_budget

    root = str(_ctx_field(snapshot, "root", "") or "")
    tool_list = _context_tools(snapshot, tools) if snapshot is not None else []
    configs = list(_ctx_field(snapshot, "tool_configs", []) or [])
    raw_telemetry = [t for t in _ctx_field(snapshot, "tool_telemetry", []) or [] if isinstance(t, dict)]
    by_tool = {str(t.get("tool") or ""): t for t in raw_telemetry}
    budget_rows = []
    budget_tools = []
    for t in tool_list:
        if not t.files:
            continue
        budget_tool = t
        if queryable:
            from ..tools import ToolResources

            budget_tool = ToolResources(t.tool, t.label, files=[
                f for f in t.files if f.sent_to_llm != "unknown" and (not global_budget or f.scope in _CONTEXT_GLOBAL_SCOPES)
            ])
            if global_budget and not budget_tool.files:
                continue
        budget_tools.append(budget_tool)
        observed = db_parts.get("observed") or {}
        model, model_from = _context_model(t.tool, configs, by_tool, observed)
        budget_row = _context_budget(budget_tool, root, model, model_from, _observed_for(t.tool, observed))
        if queryable:
            budget_row["unknown_policy_tokens"] = sum(f.tokens for f in t.files if f.sent_to_llm == "unknown")
        budget_rows.append(budget_row)
    budget_rows.sort(key=lambda b: (-b["always"], b["tool"]))
    totals = compute_token_budget(budget_tools, root)
    files = []
    affects = None if queryable else _file_sessions()
    for t in tool_list:
        # Only files the tool loads into the model are listed; the rest are counted by kind.
        listed = sorted((f for f in t.files if is_context(f)), key=lambda f: (-_ctx_int(f.tokens), f.path))
        files.append(
            {
                "tool": t.tool,
                "label": _ctx_field(t, "label", "") or _label(t.tool),
                "count": len(listed),
                "truncated": len(listed) > CONTEXT_MAX_FILES,
                "files": [_context_file(f, t.tool, root, now, affects) for f in listed[:CONTEXT_MAX_FILES]],
                "excluded": _context_excluded(t),
            }
        )
    files = [f for f in files if f["count"] or f["excluded"]]
    files.sort(key=lambda f: (-sum(x["tokens"] for x in f["files"]), f["tool"]))
    categories = [c for c in (_context_categories(t) for t in tool_list) if c["files"]]
    categories.sort(key=lambda c: (-c["tokens"], c["tool"]))
    telemetry = [_context_telemetry(t) for t in raw_telemetry if t.get("tool") and is_selected(str(t["tool"]), tools)]
    telemetry.sort(key=lambda t: (-(t["input"] + t["output"]), t["tool"]))
    memory = _context_memory(snapshot, now) if snapshot is not None else []
    return {
        "generated_at": now,
        "root": root or None,
        "budget": {
            "tools": budget_rows,
            "totals": {
                "always": totals["always_loaded_tokens"],
                "on_demand": totals["on_demand_tokens"],
                "conditional": totals["conditional_tokens"],
                "cacheable": totals["cacheable_tokens"],
                "max_potential": totals["total_potential_tokens"],
                "never_sent_files": totals["never_sent_count"],
            },
        },
        "categories": categories,
        "map": _context_map(tool_list, root),
        "memory": {"entries": memory, "tokens": sum(m["tokens"] for m in memory), "growth": db_parts["growth"]},
        "files": files,
        "telemetry": telemetry,
        "daily": db_parts["daily"],
        "workflows": _context_workflows(tool_list, root),
        **({
            "source": "kusto.queryable",
            "configuration_scope": "configured-on-disk; not the model or settings loaded by a running agent",
            "policy_note": "Budgets cover known stored/catalog loading policies; unknown policies remain in the file inventory.",
        } if queryable else {}),
    }


def context_bytes(db: Any, store: Any, query: str, now: float | None = None) -> bytes:
    """The answer for ``/api/board/context``, kept for each snapshot version. ``tool`` is as on ``/api/board``."""
    qs = parse_qs(query, keep_blank_values=True)
    tools = normalize_selection(part for raw in qs["tool"] for part in raw.split(",")) if "tool" in qs else None
    from .board_filters import _projects
    from .project_filter import resolve

    repos = _projects(qs, "repo")
    projects = resolve(HistoryScope.local(db), _projects(qs), repos) if repos else _projects(qs)
    version = (getattr(store, "version", None), int((time.time() if now is None else now) / MEMO_TTL_S))
    key = (id(store), version, tools, projects)
    if version is not None:
        with _context_lock:
            body = _context_memo.get(key)
        if body is not None:
            return body
    body = json.dumps(compute_context(db, store, tools, now, projects=projects)).encode("utf-8")
    if version is not None:
        with _context_lock:
            _context_memo[key] = body
            while len(_context_memo) > CONTEXT_MEMO_KEYS:
                _context_memo.pop(next(iter(_context_memo)))
    return body
