"""The board's on-demand reads of agent memory: the diff of two contents, a memory file's versions, the files of a
rewind point and a session's memory recalls.

Contents are read by their file_blobs hash (``memory.diff``). A side whose content is not there says why:
``absent`` (the file did not exist), ``not_recorded`` (no hash was recorded), ``not_kept`` (text capture is off) or
``expired`` (the hash was recorded, the content is no longer stored). A diff is made only from two known sides.
"""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from typing import Any

from ..memory_changes import memory_mechanism
from .artifact_details import _diff_lines, _history_titles
from .projection_utils import _resolve_agent, mask_secrets
from .projections.history import HistoryScope, capture_mode

# A memory file is short; a diff this long is cut and says so.
MAX_MEMORY_DIFF_LINES = 5000
SIDES = ("first", "second")


def memory_diff(history: HistoryScope, first: str, second: str, *, keep_text: bool, absent: str = "") -> dict:
    """The two contents named by hash, and their line diff when both are known. ``absent`` names a side
    that is the empty file because the file did not exist (a change's before-image)."""
    if absent not in ("", *SIDES):
        raise ValueError("absent must be first or second")
    hashes = {"first": first, "second": second}
    rows = history.read("memory.diff", first_hash=first, second_hash=second, keep_text=keep_text) \
        if keep_text and (first or second) else []
    found = {row["hash"]: row for row in rows}
    sides: dict[str, dict] = {}
    for side in SIDES:
        value = hashes[side]
        if side == absent and not value:
            sides[side] = {"hash": "", "state": "absent", "bytes": 0, "text": ""}
        elif not value:
            sides[side] = {"hash": "", "state": "not_recorded", "bytes": None, "text": None}
        elif not keep_text:
            sides[side] = {"hash": value, "state": "not_kept", "bytes": None, "text": None}
        elif (row := found.get(value)) is None:
            sides[side] = {"hash": value, "state": "expired", "bytes": None, "text": None}
        else:
            sides[side] = {"hash": value, "state": "kept", "bytes": row.get("size_bytes"),
                           "text": mask_secrets(row.get("content") or "")}
    old, new = sides["first"]["text"], sides["second"]["text"]
    diff = _diff_lines([(old, new)], MAX_MEMORY_DIFF_LINES + 1) if old is not None and new is not None else None
    truncated = diff is not None and len(diff) > MAX_MEMORY_DIFF_LINES
    return {**sides, "diff": diff[:MAX_MEMORY_DIFF_LINES] if diff is not None else None, "truncated": truncated}


_VERSION_FIELDS = (
    "ts", "origin", "session_id", "agent_id", "actor", "operation", "content_hash", "size_bytes", "before_hash",
    "before_source", "after_source", "lines_added", "lines_removed", "state",
)


def memory_versions(history: HistoryScope, path: str, now: float) -> dict:
    """Every recorded version of a memory or instruction file, oldest first, with the title of each session.

    A file of no memory mechanism has no versions here (its edits are the file detail's)."""
    mechanism = memory_mechanism(path)
    rows = history.read("memory.versions", requested_path=path) if mechanism else []
    titles = _history_titles(history, {(r["session_id"], r["session_id"]) for r in rows if r["session_id"]}, now)
    return {"path": path, "mechanism": mechanism, "versions": [
        {name: row.get(name) for name in _VERSION_FIELDS} | {"title": titles.get((row["session_id"], row["session_id"]), "")}
        for row in rows
    ]}


_FILE_FIELDS = (
    "path", "ts", "origin", "mechanism", "version", "state", "blob_hash", "size_bytes", "lines", "lines_added",
    "lines_removed",
)


def checkpoint_files(history: HistoryScope, agent_id: str, message_id: str) -> dict:
    """The files one rewind point (its message id) of the agent's session covers, at the version each was."""
    sid, _bare = _resolve_agent(history, agent_id)
    rows = history.read("checkpoints.files", sid=sid, requested_message=message_id)
    return {"message_id": message_id, "files": [{name: row.get(name) for name in _FILE_FIELDS} for row in rows]}


def memory_recalls(history: HistoryScope, agent_id: str) -> dict:
    """The memory recalls of an agent: all of its session's for a main agent, the subagent's own for a subagent."""
    sid, bare = _resolve_agent(history, agent_id)
    from .board_projection import _agent_key

    root = _agent_key(sid, bare) == sid
    requested = "" if root else history.split(bare)[1]
    recalls = []
    for row in history.read("memory.recalls", sid=sid):
        if not root and (history.split(row["agent_id"])[1] if row.get("agent_id") else "") != requested:
            continue
        try:
            detail = json.loads(row.get("detail") or "{}")
        except ValueError:
            detail = {}
        size = detail.get("bytes") if isinstance(detail, dict) else None
        recalls.append({
            "ts": row["ts"], "agent_id": row.get("agent_id") or "", "tool": row.get("tool") or "",
            "trigger": row.get("trigger") or "", "path": row.get("path") or "", "content_hash": row.get("content_hash") or "",
            "tool_call_id": row.get("tool_call_id") or "", "prompt_id": row.get("prompt_id") or "",
            "turn_index": row.get("turn_index"), "bytes": size if type(size) is int else None,
        })
    return {"recalls": recalls}


ROUTES = frozenset({
    "/api/board/memory/diff", "/api/board/memory/versions", "/api/board/agent/recalls", "/api/board/agent/checkpoint/files",
})


def handle(path: str, one: Callable[[str], str], db: Any, history: HistoryScope, now: float | None = None,
           *, agent: str | None = None) -> tuple[int, dict]:
    """Answer one of ``ROUTES``. ``agent`` is the agent identity already checked by a scoped caller."""
    now = time.time() if now is None else now
    if path == "/api/board/memory/diff":
        try:
            return 200, memory_diff(history, one("first"), one("second"),
                                    keep_text=capture_mode(db, default="full") == "full", absent=one("absent"))
        except ValueError as exc:
            return 400, {"error": str(exc)}
    if path == "/api/board/memory/versions":
        return (200, memory_versions(history, one("path"), now)) if one("path") else (400, {"error": "Missing path"})
    agent_id = agent if agent is not None else one("id")
    if not agent_id:
        return 400, {"error": "Missing id"}
    if path == "/api/board/agent/recalls":
        return 200, memory_recalls(history, agent_id)
    if not one("message_id"):
        return 400, {"error": "Missing message_id"}
    return 200, checkpoint_files(history, agent_id, one("message_id"))
