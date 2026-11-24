"""The thinking text of model calls (table ``session_thinking``): the blocks of one call, read when the flow
opens the call.

A block's ``chars`` is the length the source reported. Its ``text`` is "" when the text is not shown, and
``text_state`` says why: ``not_kept`` (this node keeps no text), ``expired`` (older than the text period) or
``not_stored`` (the row holds no text).
"""

from __future__ import annotations

import time
from typing import Any

from .projection_utils import mask_secrets
from .projections.history import HistoryScope, capture_mode, text_floor

ROUTES = frozenset({"/api/board/thinking"})
# A call has a few blocks; the read stops here whatever the store holds.
MAX_CALL_BLOCKS = 500
_BLOCK_FIELDS = ("thinking_key", "request_key", "ts", "agent_id", "model", "turn_index", "block_index", "chars", "tool")


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


def handle(path: str, one, db: Any, history: HistoryScope, now: float | None = None, *, reported: bool = False,
           session: str | None = None) -> tuple[int, dict]:
    """Answer one of ``ROUTES``. ``session`` is the session identity a scoped caller already parsed; ``reported``
    is true for a node history read, whose text this node shows as stored."""
    now = time.time() if now is None else now
    keep, floor = _text_policy(db, reported, now)
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
