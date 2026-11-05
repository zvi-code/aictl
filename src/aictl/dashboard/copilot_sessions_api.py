# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Handlers for ``/api/copilot-sessions``: the session index over HTTP, read-only.

Each request scans afresh and keeps nothing. File content is read on request and
confined by ``observe.sessions.confine``. Returns ``(status, payload)``.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import unquote

from ..observe.sessions import API_MAX_BYTES, ArtifactRefused, SessionIndex, read_artifact

PREFIX = "/api/copilot-sessions"
DEFAULT_LIMIT = 200


def _one(index: SessionIndex, sid: str) -> tuple[int, dict[str, Any]]:
    result = index.resolve(sid)
    if result["status"] == "ok":
        return 200, result["session"]
    if result["status"] == "ambiguous":
        return 409, {"error": "ambiguous", "matches": [r["id"] for r in result["matches"]]}
    return 404, {"error": "not found", "looked_in": result["looked_in"]}


def handle(path: str, qs: dict[str, list[str]]) -> tuple[int, Any]:
    """Route one GET under ``PREFIX``."""
    first = lambda key: (qs.get(key) or [None])[0]  # noqa: E731
    rest = path[len(PREFIX) :].strip("/")
    index = SessionIndex()
    if not rest:
        try:
            limit = int(first("limit") or DEFAULT_LIMIT)
        except ValueError:
            return 400, {"error": "limit must be a number"}
        rows, total = index.list(
            tool=first("tool"), project=first("project"), include_partial=first("all") == "1", limit=max(limit, 0)
        )
        return 200, {"total": total, "sessions": rows}
    sid, _, action = rest.partition("/")
    status, rec = _one(index, unquote(sid))
    if status != 200:
        return status, rec
    if not action:
        return 200, index.details(rec)
    if action == "artifacts":
        return 200, {"id": rec["id"], "folder": rec["folder"], "artifacts": index.artifacts(rec, first("type"))}
    if action == "artifact":
        requested = first("path")
        if not requested:
            return 400, {"error": "missing path"}
        try:
            result = read_artifact(rec, requested, API_MAX_BYTES)
        except ArtifactRefused as exc:
            return exc.status, {"error": str(exc)}
        return 200, result
    return 404, {"error": "no such route"}
