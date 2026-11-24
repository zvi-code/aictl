"""The thinking text of model calls (table ``session_thinking``): the blocks of one call, read when the flow
opens the call, and the search over the blocks of a period.

A block's ``chars`` is the length the source reported. Its ``text`` is "" when the text is not shown, and
``text_state`` says why: ``not_kept`` (this node keeps no text), ``expired`` (older than the text period) or
``not_stored`` (the row holds no text).
"""

from __future__ import annotations

import re
import time
from typing import Any

from ..tool_scope import stored_ids_for
from .projection_utils import mask_secrets
from .projections.history import HistoryScope, capture_mode, text_floor

ROUTES = frozenset({"/api/board/thinking", "/api/board/thinking/search"})
# A call has a few blocks; the read stops here whatever the store holds.
MAX_CALL_BLOCKS = 500
MAX_PAGE = 200
MAX_OFFSET = 20_000
MAX_TERMS = 12
MAX_PHRASES = 4
MAX_QUERY = 400
SORTS = ("ts", "chars")
# The total, one row per tool (a few), per model (at most 30), per UTC day (at most 400) and one page.
_SEARCH_ROWS = 1 + 50 + 30 + 400 + MAX_PAGE
_PHRASE = re.compile(r'"([^"]*)"')
# A Kusto term: a run of letters and digits (has matches whole terms of the text).
_TERM = re.compile(r"[^\W_]+")
_BLOCK_FIELDS = ("thinking_key", "request_key", "ts", "agent_id", "model", "turn_index", "block_index", "chars", "tool")


class ThinkingRequestError(ValueError):
    """A search parameter the thinking routes cannot use."""


def parse_search(q: str) -> tuple[list[str], list[str]]:
    """(terms, phrases) of a search: each quoted part is a phrase (a substring), every other word a whole term."""
    if len(q) > MAX_QUERY:
        raise ThinkingRequestError(f"The search is longer than {MAX_QUERY} characters")
    phrases = list(dict.fromkeys(p.strip() for p in _PHRASE.findall(q) if p.strip()))
    rest = _PHRASE.sub(" ", q).replace('"', " ")
    terms = list(dict.fromkeys(term.lower() for term in _TERM.findall(rest)))
    if len(terms) > MAX_TERMS or len(phrases) > MAX_PHRASES:
        raise ThinkingRequestError(f"A search takes at most {MAX_TERMS} terms and {MAX_PHRASES} quoted phrases")
    return terms, phrases


def _text_policy(db: Any, reported: bool, now: float) -> tuple[bool, float]:
    """Whether text is shown, and the time before which it is not (the text period of this node)."""
    if reported:
        return True, 0.0
    return capture_mode(db, default="full") == "full", text_floor(db, now)


def _block(row: dict, keep: bool, floor: float) -> dict:
    text = row.get("text") or ""
    if text:
        state = "kept"
    elif not keep:
        state = "not_kept"
    elif row["ts"] < floor:
        state = "expired"
    else:
        state = "not_stored"
    return {name: row.get(name) for name in _BLOCK_FIELDS} | {"text": mask_secrets(text) if text else "", "text_state": state}


def call_thinking(history: HistoryScope, session_id: str, ts: float, agent_id: str = "", *, keep: bool,
                  floor: float) -> dict:
    """The thinking blocks of the model call of ``session_id`` and ``agent_id`` at ``ts`` (the flow's time), in block
    order. A call whose blocks are no longer stored has none: the flow says so with the call's reported size."""
    rows = history.read("thinking.blocks", sid=session_id, call_ts=ts, call_agent=agent_id, keep_text=keep,
                        text_floor=floor, limit=MAX_CALL_BLOCKS)
    return {"ts": ts, "agent_id": agent_id, "blocks": [_block(row, keep, floor) for row in rows]}


def one_block(history: HistoryScope, session_id: str, key: str, *, keep: bool, floor: float) -> dict:
    """The block of ``session_id`` with thinking key ``key``: the full text of a search result."""
    rows = history.read("thinking.blocks", sid=session_id, block_key=key, keep_text=keep, text_floor=floor,
                        limit=MAX_CALL_BLOCKS)
    return {"ts": rows[0]["ts"] if rows else None, "agent_id": rows[0]["agent_id"] if rows else "",
            "blocks": [_block(row, keep, floor) for row in rows]}


def search_thinking(history: HistoryScope, *, since: float, until: float, q: str = "", tools: tuple[str, ...] | None = None,
                    model: str = "", sort: str = "ts", ascending: bool = False, offset: int = 0, limit: int = 50,
                    keep: bool, floor: float, now: float) -> dict:
    """One page of the thinking blocks of a period that match a search, with their count and splits by tool, model
    and UTC day, all counted in the store. An empty search lists the blocks of the period, newest first."""
    from .artifact_details import _history_titles

    if sort not in SORTS:
        raise ThinkingRequestError("sort must be ts or chars")
    if not 1 <= limit <= MAX_PAGE or not 0 <= offset <= MAX_OFFSET:
        raise ThinkingRequestError(f"limit must be 1 to {MAX_PAGE} and offset 0 to {MAX_OFFSET}")
    terms, phrases = parse_search(q)
    params: dict[str, Any] = {"since": since, "until": until, "sort_key": sort, "ascending": ascending,
                              "page_offset": offset, "page_size": limit, "keep_text": keep, "text_floor": floor}
    if terms:
        params["search_terms"] = terms
    if phrases:
        params["search_phrases"] = phrases
    if tools is not None:
        params |= {"restrict_tools": True, "requested_tools": list(stored_ids_for(tools))}
    if model:
        params["requested_models"] = [model]
    rows = history.read("thinking.search", limit=_SEARCH_ROWS, **params)
    total = next((row for row in rows if row["row_type"] == "total"), {})
    blocks = sorted((row for row in rows if row["row_type"] == "block"), key=lambda row: row["position"])
    titles = _history_titles(history, {(row["session_id"], row["session_id"]) for row in blocks}, now)

    def split(kind: str) -> list[dict]:
        return sorted(({"name": row["name"] or "", "blocks": row["blocks"], "chars": row["chars"]}
                       for row in rows if row["row_type"] == kind), key=lambda item: (-item["blocks"], item["name"]))

    return {
        "range": {"since": since, "until": until},
        "search": {"q": q, "terms": terms, "phrases": phrases, "sort": sort, "ascending": ascending,
                   "offset": offset, "limit": limit},
        "text_kept": keep,
        "total": total.get("blocks") or 0,
        "chars": total.get("chars") or 0,
        "first_ts": total.get("first_ts"),
        "last_ts": total.get("last_ts"),
        "by_tool": split("tool"),
        "by_model": split("model"),
        "by_day": sorted(({"day": row["day"], "blocks": row["blocks"], "chars": row["chars"]}
                          for row in rows if row["row_type"] == "day"), key=lambda item: item["day"]),
        "blocks": [
            {name: row.get(name) for name in (*_BLOCK_FIELDS, "session_id", "call_ts", "snippet_at")}
            | {"node_id": row.get("node_id") or "", "position": row["position"],
               "title": titles.get((row["session_id"], row["session_id"]), ""),
               "snippet": mask_secrets(row.get("snippet") or "")}
            for row in blocks
        ],
    }


def _search(one, filters, history: HistoryScope, keep: bool, floor: float, now: float) -> tuple[int, dict]:
    order = one("order") or "desc"
    if order not in ("asc", "desc"):
        return 400, {"error": "order must be asc or desc"}
    try:
        offset, limit = int(one("offset") or 0), int(one("limit") or 50)
    except ValueError:
        return 400, {"error": "offset and limit must be integers"}
    try:
        return 200, search_thinking(
            history, since=filters.since, until=filters.until, q=one("q"), tools=filters.tools, model=filters.model,
            sort=one("sort") or "ts", ascending=order == "asc", offset=offset, limit=limit, keep=keep, floor=floor, now=now)
    except ThinkingRequestError as exc:
        return 400, {"error": str(exc)}


def handle(path: str, one, db: Any, history: HistoryScope, now: float | None = None, *, reported: bool = False,
           session: str | None = None, query: str = "") -> tuple[int, dict]:
    """Answer one of ``ROUTES``. ``session`` is the session identity a scoped caller already parsed; ``reported``
    is true for a node history read, whose text this node shows as stored. ``query`` is the request's query
    string: the search reads the page's period, tools and model from it."""
    from .board_filters import parse_filters

    now = time.time() if now is None else now
    keep, floor = _text_policy(db, reported, now)
    if path == "/api/board/thinking/search":
        return _search(one, parse_filters(query, now), history, keep, floor, now)
    sid = session if session is not None else one("session_id")
    if not sid:
        return 400, {"error": "Missing session_id"}
    if key := one("key"):
        return 200, one_block(history, sid, key, keep=keep, floor=floor)
    try:
        ts = float(one("ts"))
    except ValueError:
        return 400, {"error": "Missing ts or key"}
    if not 0 <= ts < 1e12:
        return 400, {"error": "ts is out of range"}
    return 200, call_thinking(history, sid, ts, one("agent"), keep=keep, floor=floor)
