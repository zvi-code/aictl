"""Session-scoped execution evidence. A span and a transcript event are not two billable calls."""

from __future__ import annotations

import re
import time
from typing import Any

from ..records import _STEP_FIELDS
from .projections.history import HistoryScope, capture_mode, text_floor

_FILTERS = ("kind", "agent_id", "turn_id", "round_id", "tool_call_id", "request_id", "step_key", "message_id", "trace_id", "span_id")


class EvidenceInputError(ValueError):
    pass


def _param(params: dict[str, list[str]], name: str, maximum: int = 384) -> str:
    values = params.get(name, [""])
    if len(values) != 1 or len(values[0]) > maximum or any(ord(c) < 32 for c in values[0]):
        raise EvidenceInputError(f"Invalid {name}")
    return values[0].strip()


def _number(params: dict, key: str, default: int, low: int, high: int) -> int:
    raw = _param(params, key, 8)
    if not raw:
        return default
    if not raw.isascii() or not raw.isdecimal() or not low <= int(raw) <= high:
        raise EvidenceInputError(f"{key} must be between {low} and {high}")
    return int(raw)


def session_evidence(db: Any, params: dict[str, list[str]], *, history: HistoryScope | None = None) -> dict:
    history = history or HistoryScope.local(db)
    reported = history.qualified or getattr(db, "_reported_history", False) is True
    sid = _param(params, "session_id", 4096 if reported else 384)
    if not sid:
        raise EvidenceInputError("session_id is required")
    limit = _number(params, "limit", 100, 1, 100)
    offset = _number(params, "offset", 0, 0, 10000)
    filters = {k: v for k in _FILTERS if (v := _param(params, k))}
    group = _param(params, "context_group")
    if group not in ("", "usage", "changes", "inputs"):
        raise EvidenceInputError("Unknown context group")
    q = _param(params, "q", 160)
    terms = list(dict.fromkeys(re.findall(r"[^\W_]+", q.lower())))
    if (q and not terms) or len(terms) > 8:
        raise EvidenceInputError("Search requires one to eight words")
    keep = capture_mode(db) == "full"
    floor = 0 if reported else text_floor(db, time.time())
    detail = bool(filters.get("step_key"))
    node, raw = history.split(sid)
    if history.qualified:
        from .history_scope import identity, identity_parts

        for key in ("agent_id", "parent_agent_id"):
            if key in filters:
                parts = identity_parts(filters[key])
                if parts is None or parts[0] != node:
                    return {"session_id": sid, "rows": [], "has_more": False, "offset": offset, "limit": limit}
                filters[key] = parts[1]
    include_spans = not reported and getattr(db, "streams_observations", False) is True
    include_spans &= filters.get("kind") not in ("context", "message", "user_message", "assistant_message", "command", "skill", "turn", "round")
    rows = [r["data"] for r in history.read(
        "sequence.evidence", sid=sid, limit=limit + 1, page=True, keep_text=keep, text_floor=floor,
        evidence_filters=filters, search_terms=terms, context_group=group, page_offset=offset,
        include_detail=detail, include_spans=include_spans,
    )]
    for r in rows:
        if not include_spans:
            for field in r.keys() - {*_STEP_FIELDS, "text", "text_preview"}:
                del r[field]
        if not detail:
            r.pop("text", None)
    if reported:
        # The scoped route still returns the qualified session in each row.
        for r in rows:
            if r.get("session_id") == raw:
                r["session_id"] = sid
            if history.qualified:
                for field in ("agent_id", "parent_agent_id"):
                    if r.get(field):
                        r[field] = identity(node, r[field])
    for r in rows:
        for field in ("reported_skills", "reported_mcp_servers"):
            if field in r:
                from ..stores import context_names

                r[field] = context_names(r[field])
        if r["text_status"] in ("captured", "truncated") and not r.get("text_preview"):
            r["text_status"] = "expired" if keep else "withheld"
    return {"session_id": sid, "rows": rows[:limit], "has_more": len(rows) > limit, "offset": offset, "limit": limit}
