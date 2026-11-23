"""Project tool, error, skill, file, and prompt details."""

from __future__ import annotations

import bisect
import difflib
import json
import time
from collections import defaultdict
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..context_audit import _git_states, _path_key, skill_description, skill_field, skill_locations
from ..ingesters._common import project_root
from ..tool_scope import stored_ids_for
from .board_filters import Filters, _detail_filters
from .board_projection import _agent_key, _api_error_key, _Board, _tool_error_key
from .projection_utils import MAX_DETAIL_ROWS, _ms, _one_line, _parse_detail, _usd, mask_secrets
from .projections.history import (
    HistoryScope,
)
from .skill_inventory import _SKILL_TEXT_CHARS, _read_text

MAX_DIFF_LINES = 500


_EXCERPT_SUFFIXES = frozenset({".md", ".mdc", ".json", ".jsonc", ".toml", ".yaml", ".yml", ".txt"})


_EXCERPT_MAX_CHARS = 2_000_000


_EXCERPT_LINES_AROUND = 3


def file_excerpt(path: str, line: int, is_allowed: Callable[[str], bool] | None = None) -> tuple[int, dict]:
    """A few masked lines of a text file that a scan or the file list found. No other file is read."""
    from .audit_cache import AUDIT_CACHE

    if Path(path).suffix.lower() not in _EXCERPT_SUFFIXES:
        return 403, {"error": "aictl shows only text settings and instruction files."}
    if _path_key(path) not in AUDIT_CACHE.source_paths() and not (is_allowed and is_allowed(path)):
        return 403, {"error": "aictl has not found this file in a scan."}
    text = _read_text(path, _EXCERPT_MAX_CHARS)
    if text is None:
        return 404, {"error": "The file cannot be read."}
    lines = mask_secrets(text).splitlines()
    first = max(0, line - 1 - _EXCERPT_LINES_AROUND)
    return 200, {
        "path": path,
        "line": line,
        "lines": [{"n": first + i + 1, "text": value} for i, value in enumerate(lines[first : line + _EXCERPT_LINES_AROUND])],
    }


def _skill_starter(text: str) -> str:
    """Who can start a skill, from its front matter. Both can by default."""
    person = skill_field(text, "user-invocable").lower() != "false"
    model = skill_field(text, "disable-model-invocation").lower() != "true"
    if person and model:
        return "You and the model"
    if person:
        return "Only you, because of disable-model-invocation"
    if model:
        return "Only the model, because of user-invocable"
    return "Nobody, because of both settings"


def _skill_reach(row: dict, git_state: str) -> str:
    """Who can see this skill file, in words."""
    if row["scope"] == "user":
        return "Only this user on this machine, in every project."
    if row["scope"] == "plugin" and row.get("install_project"):
        return f"Anyone who installs the plugin {row['owner']} for the project {row['install_project']}, and only in that project."
    if row["scope"] == "plugin":
        return f"Anyone who installs the plugin {row['owner']}, in every project."
    if row["scope"] == "custom":
        return f"Only sessions on this machine that have this folder in {row['owner']}."
    if git_state == "tracked":
        return f"Everyone with the repository at {row['owner']}, because the file is in git."
    if git_state in ("untracked", "ignored"):
        return f"Only people who work in {row['owner']} on this machine, because the file is not in git."
    return f"Anyone who works in {row['owner']}."


def _skill_file_reads(history: HistoryScope, name: str, params: dict) -> list[dict]:
    """Calls that read ``<skill>/SKILL.md`` with a file-read tool. A real way to use a skill, apart from starting it.

    A read in a turn that also started this skill is the skill's own load, so it is left out.
    """
    base = name.rsplit(":", 1)[-1]
    if not base:
        return []
    reads = history.read("tools.detail", limit=2000, page=True, query_mode="skill_reads",
                         requested_skill=base, inclusive_end=False, **params)
    if not reads:
        return []
    session_keys = history.keys(r["session_id"] for r in reads if r["session_id"])
    starts: dict[str, list[float]] = defaultdict(list)
    for row in reversed(history.read("prompts.page", session_keys=session_keys)):
        starts[row["session_id"]].append(row["ts"])
    started: dict[str, list[float]] = defaultdict(list)
    for row in history.read("skills.detail", requested_skill=name, query_mode="starts", session_keys=session_keys):
        started[row["session_id"]].append(row["ts"])

    def same_turn_started(sid: str, ts: float) -> bool:
        line = starts.get(sid, [])
        i = bisect.bisect_right(line, ts) - 1
        begin = line[i] if i >= 0 else float("-inf")
        end = line[i + 1] if i + 1 < len(line) else float("inf")
        return any(begin <= used < end for used in started.get(sid, []))

    return [
        {**r, "project": r["project_path"] if history.qualified else project_root(r["project_path"])}
        for r in reads if not same_turn_started(r["session_id"], r["ts"])
    ]


def skill_detail(
    db: Any, name: str, now: float | None = None, since: float | None = None, until: float | None = None,
    tools: tuple[str, ...] | None = None, *, history: HistoryScope | None = None,
) -> tuple[int, dict]:
    """Who can see a skill, each use of it, and the text of its files."""
    now = time.time() if now is None else now
    history = history or HistoryScope.local(db)
    params: dict = {}
    if since is not None and until is not None:
        params |= {"since": since, "until": until}
    if tools is not None:
        params |= {"restrict_tools": True, "requested_tools": list(stored_ids_for(tools))}
    page = history.read("skills.detail", requested_skill=name, limit=MAX_DETAIL_ROWS + 2, page=True, **params)
    overall = next(r for r in page if r["row_type"] == "all")
    counts = next(r for r in page if r["row_type"] == "counts")
    fields = ("ts", "session_id", "agent_id", "tool", "project_path", "trigger")
    rows = [tuple(r[k] for k in fields) for r in page if r["row_type"] == "item"]
    file_reads = _skill_file_reads(history, name, params)
    read_pairs = {(r["session_id"], _agent_key(r["session_id"], r["agent_id"])) for r in file_reads[:MAX_DETAIL_ROWS]}
    projects = [] if history.qualified else list(dict.fromkeys(p for raw in overall["projects"] for p in (project_root(raw), raw) if p))
    pairs = {(sid, _agent_key(sid, aid)) for _ts, sid, aid, *_ in rows} | read_pairs
    titles = _history_titles(history, pairs, now)

    locations = []
    seen_text: dict[str, str] = {}
    for row in ([] if history.qualified else skill_locations(name, projects)):
        git_state = ""
        if row["scope"] == "project":
            git_state = _git_states(Path(row["owner"]), [row["path"]]).get(row["path"], "outside-repo")
        text = _read_text(row["path"], _SKILL_TEXT_CHARS + 1)
        truncated = text is not None and len(text) > _SKILL_TEXT_CHARS
        content = mask_secrets(text[:_SKILL_TEXT_CHARS]) if text is not None else None
        same_as = seen_text.get(content) if content is not None else None
        if content is not None:
            seen_text.setdefault(content, row["path"])
        locations.append(
            {
                **row,
                "git_state": git_state or None,
                "reach": _skill_reach(row, git_state),
                "description": skill_description(content or "") or None,
                "starter": _skill_starter(content or ""),
                "allowed_tools": skill_field(content or "", "allowed-tools") or None,
                "content": None if same_as else content,
                "same_as": same_as,
                "truncated": truncated,
            }
        )
    return 200, {
        "name": name,
        "uses": counts["uses"],
        "agents": counts["agents"],
        "total_uses": overall["total"],
        # Reads of the skill file: a way to use the skill that is counted apart from the uses.
        "file_reads": len(file_reads),
        "reads": [
            {
                "ts": r["ts"],
                "agent_id": _agent_key(r["session_id"], r["agent_id"]),
                "title": titles.get((r["session_id"], _agent_key(r["session_id"], r["agent_id"])), ""),
                "tool": r["tool"],
                "project": r["project"],
            }
            for r in file_reads[:MAX_DETAIL_ROWS]
        ],
        "first_ts": overall["first_ts"],
        "last_ts": overall["last_ts"],
        "locations": locations,
        "calls": [
            {
                "ts": ts,
                "agent_id": _agent_key(sid, aid),
                "title": titles.get((sid, _agent_key(sid, aid)), ""),
                "tool": tool,
                "project": project if history.qualified else project_root(project),
                "trigger": trigger or None,
            }
            for ts, sid, aid, tool, project, trigger in rows
        ],
    }


def _history_titles(history: HistoryScope, pairs: set[tuple[str, str]], now: float) -> dict[tuple[str, str], str]:
    if not pairs:
        return {}
    board = _Board(None, _detail_filters(now), now, history=history)
    keys = history.keys(sid for sid, _ in pairs)
    for row in history.read("board.sessions", session_keys=keys):
        board.session_tool[row["session_id"]] = row["tool"]
        board.session_project[row["session_id"]] = row["project_path"]
    if any(sid != aid for sid, aid in pairs):
        for row in history.read("board.agents", session_keys=keys):
            if row.get("row_kind") == "spawn":
                board.spawns.append(row)
            else:
                board.sub_rows[(row["session_id"], _agent_key(row["session_id"], row["agent_id"]))] = row
    return board._titles(pairs)


def _detail_scope(history: HistoryScope, filters: Filters | None, now: float, board: _Board | None = None) -> dict:
    if filters is None:
        return {}
    params = {"since": filters.since, "until": filters.until}
    if filters.narrowed:
        board = board or _Board(None, filters, now, history=history).load()
        params |= {"restrict_sessions": True, "session_keys": history.keys(board.scope)}
    return params


def tool_detail(db: Any, name: str, now: float | None = None, since: float | None = None, until: float | None = None,
                *, filters: Filters | None = None, history: HistoryScope | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    history = history or HistoryScope.local(db)
    params = _detail_scope(history, filters, now)
    if filters is None and since is not None and until is not None:
        params = {"since": since, "until": until, "inclusive_end": False}
    page = history.read("tools.detail", limit=MAX_DETAIL_ROWS + 1, page=True, requested_tool_name=name,
                        real_calls=filters is not None, **params)
    total = next(r["total"] for r in page if r["row_type"] == "count")
    fields = ("ts", "target", "session_id", "agent_id", "duration_ms", "is_error", "confirm")
    rows = [tuple(r[k] for k in fields) for r in page if r["row_type"] == "item"]
    pairs = {(sid, _agent_key(sid, aid)) for _ts, _t, sid, aid, *_ in rows}
    titles = _history_titles(history, pairs, now)
    return 200, {
        "name": name,
        "total": total,
        "calls": [
            {
                "ts": ts,
                "target": _one_line(target, 300),
                "agent_id": _agent_key(sid, aid),
                "title": titles.get((sid, _agent_key(sid, aid)), ""),
                "duration_ms": duration or None,
                "failed": bool(failed),
                "confirm": confirm or None,
            }
            for ts, target, sid, aid, duration, failed, confirm in rows
        ],
    }


def error_detail(db: Any, key: str, now: float | None = None, *, filters: Filters | None = None,
                 history: HistoryScope | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    history = history or HistoryScope.local(db)
    found: list[tuple[float, str, str, str]] = []
    parts = key.split(":", 2)
    if len(parts) < 3 or parts[0] not in ("tool", "api"):
        return 400, {"error": "Bad error key"}
    board = _Board(None, filters, now, history=history).load() if filters is not None and filters.narrowed else None
    params = _detail_scope(history, filters, now, board)
    if parts[0] == "tool":
        for row in history.read("tools.detail", limit=5000, page=True, requested_tool_name=parts[1], query_mode="errors", **params):
            ts, summary, sid, aid = (row[k] for k in ("ts", "result_summary", "session_id", "agent_id"))
            if _tool_error_key(parts[1], summary) == key:
                found.append((ts, _one_line(summary, 500), sid, aid))
                if len(found) >= MAX_DETAIL_ROWS:
                    break
    else:
        # The chosen model stands for every spelling the tools stored of it: one read for each, newest first.
        spellings = board.model_spellings() if board is not None and filters is not None and filters.model else [""]
        rows = sorted((row for model in spellings
                       for row in history.read("requests.errors", limit=5000, page=True, restrict_error=True,
                                               requested_error="" if parts[1] == "error" else parts[1],
                                               **params, **({"requested_model": model} if model else {}))),
                      key=lambda row: -row["ts"])
        for row in rows:
            ts, error_type, status, sid, aid = (row[k] for k in ("ts", "error_type", "http_status", "session_id", "agent_id"))
            if _api_error_key(error_type, status) == key:
                found.append((ts, " ".join(str(p) for p in (error_type, status) if p), sid, aid))
                if len(found) >= MAX_DETAIL_ROWS:
                    break
    titles = _history_titles(history, {(sid, _agent_key(sid, aid)) for _t, _d, sid, aid in found}, now)
    return 200, {
        "key": key,
        "items": [
            {
                "ts": ts,
                "detail": detail,
                "agent_id": _agent_key(sid, aid),
                "title": titles.get((sid, _agent_key(sid, aid)), ""),
            }
            for ts, detail, sid, aid in found
        ],
    }


def _edit_pairs(raw: str | None) -> list[tuple[str, str]] | None:
    """(old, new) text pairs from a stored edit input, or None when it holds none."""
    try:
        data = json.loads(raw or "{}")
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    if isinstance(data.get("edits"), list):
        pairs = []
        for edit in data["edits"]:
            if isinstance(edit, dict):
                pairs.append((str(edit.get("old_string") or ""), str(edit.get("new_string") or "")))
        return pairs or None
    for old_key, new_key in (("old_string", "new_string"), ("oldString", "newString"), ("old_str", "new_str")):
        if old_key in data or new_key in data:
            return [(str(data.get(old_key) or ""), str(data.get(new_key) or ""))]
    for key in ("content", "file_text"):
        if isinstance(data.get(key), str):
            return [("", data[key])]
    return None


def _diff_lines(pairs: list[tuple[str, str]]) -> list[dict]:
    lines: list[dict] = []
    for old, new in pairs:
        old_lines = mask_secrets(old).splitlines()
        new_lines = mask_secrets(new).splitlines()
        old_n = new_n = 0
        for row in difflib.ndiff(old_lines, new_lines):
            tag, text = row[:2], row[2:]
            if tag == "? ":
                continue
            if tag == "- ":
                old_n += 1
                lines.append({"kind": "del", "n": old_n, "text": text})
            elif tag == "+ ":
                new_n += 1
                lines.append({"kind": "add", "n": new_n, "text": text})
            else:
                old_n += 1
                new_n += 1
                lines.append({"kind": "same", "n": new_n, "text": text})
            if len(lines) >= MAX_DIFF_LINES:
                return lines
    return lines


def file_detail(db: Any, path: str, now: float | None = None, *, since: float | None = None,
                until: float | None = None, history: HistoryScope | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    history = history or HistoryScope.local(db)
    rows = history.read("files.detail", requested_path=path, keep_text=getattr(db, "capture", "full") == "full",
                        edit_limit=MAX_DETAIL_ROWS, limit=MAX_DETAIL_ROWS + 2,
                        **{k: v for k, v in (("since", since), ("until", until)) if v is not None})
    writes = [r for r in rows if r["row_type"] == "edit"]
    titles = _history_titles(history, {(r["session_id"], r["session_id"]) for r in writes if r["session_id"]}, now)
    edits = []
    for r in writes:
        sid = r["session_id"]
        detail = _parse_detail(r["detail"])
        edits.append({"ts": r["ts"], "agent_id": sid, "title": titles.get((sid, sid), ""),
                      "lines_added": detail.get("lines_added"), "lines_removed": detail.get("lines_removed")})
    diff, as_of = None, None
    if history.node is not None:
        pairs = next((p for r in writes if (p := _edit_pairs(r["input"]))), None)
        if pairs:
            diff = _diff_lines(pairs)
        else:
            revisions = [r for r in rows if r["row_type"] == "revision"]
            if revisions and (since is None or revisions[0]["ts"] >= since):
                texts = [r["content"] if r["found_blob"] else r["content"] or None for r in revisions]
                new, old = texts[0], texts[1] if len(texts) > 1 else ""
                if new is not None and old is not None:
                    diff, as_of = _diff_lines([(old, new)]), revisions[0]["ts"]
    return 200, {"path": path, "edits": edits, "diff": diff, "diff_as_of": as_of}


def prompt_detail(db: Any, ts: float, session_id: str, now: float | None = None, *,
                  history: HistoryScope | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    history = history or HistoryScope.local(db)
    rows = history.read("prompts.detail", sid=session_id, prompt_ts=ts, open_end=now + 60.0, limit=1)
    if not rows:
        return 404, {"error": "No such prompt"}
    row = rows[0]
    titles = _history_titles(history, {(session_id, session_id)}, now)
    return 200, {
        "text": mask_secrets(row["text"]),
        "prompt_file": row["prompt_file"],
        "project": row["project_path"],
        "title": titles.get((session_id, session_id), ""),
        "input": row["input_tokens"],
        "output": row["output_tokens"],
        "cache_read": row["cache_read_tokens"],
        "cache_write": row["cache_creation_tokens"],
        "cost_usd": _usd(row["cost_usd"]) if row["cost_usd"] else None,
        "calls": row["calls"],
        "subagent_calls": row["subagent_calls"],
        "reply_ms": _ms(row["reply_ms"]),
        "tool_calls": row["tool_calls"],
    }
