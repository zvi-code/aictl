# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A one-time pass that gives stored OTel events the session they belong to.

Before the receiver read ``gen_ai.conversation.id``, every Copilot span and span
event was stored with an empty session id. They are all in the machine store
(an event without a session id is routed there). This pass sets the session id
of each such event, in this order:

1. its own ``gen_ai.conversation.id``;
2. the session of its trace (``otel.trace_id``), when another event of the trace has one;
3. for an event stored without a trace id (a span event, or a span that named no
   conversation): the session whose ``invoke_agent`` span of the same tool holds
   the event's time, when exactly one does. When two sessions overlap there, the
   event keeps no session.

It changes only the session id column of events that have none. When it is done,
``maintenance_state`` records it, and it does not run again.
"""

from __future__ import annotations

import json
import logging
import sqlite3
import time
from typing import Any

log = logging.getLogger(__name__)

STATE_KEY = "otel_sessions_backfilled_at"
CONVERSATION_KEY = "gen_ai.conversation.id"
# A span event is stamped inside its span; this much slack at the ends of a span.
EDGE_S = 0.001

_SQL = "SELECT rowid, ts, tool, kind, detail FROM events WHERE session_id = '' AND kind LIKE 'otel:%' ORDER BY ts"


def _detail(raw: Any) -> dict:
    try:
        d = json.loads(raw or "{}")
    except (TypeError, ValueError):
        return {}
    return d if isinstance(d, dict) else {}


def plan(conn: sqlite3.Connection) -> list[tuple[int, str]]:
    """(rowid, session id) for each stored OTel event without a session that can be tied to one."""
    rows = [(rowid, ts, tool, kind, _detail(raw)) for rowid, ts, tool, kind, raw in conn.execute(_SQL)]
    out: dict[int, str] = {}
    traces: dict[str, str] = {}
    # invoke_agent windows per tool: (start, end, session id).
    windows: dict[str, list[tuple[float, float, str]]] = {}

    def window(ts: float, d: dict, sid: str, tool: str, kind: str) -> None:
        if kind.startswith("otel:invoke_agent"):
            end = ts + float(d.get("duration_ms") or 0) / 1000.0
            windows.setdefault(tool, []).append((ts - EDGE_S, end + EDGE_S, sid))

    for rowid, ts, tool, kind, d in rows:
        sid = d.get(CONVERSATION_KEY)
        if isinstance(sid, str) and sid:
            out[rowid] = sid
            if d.get("otel.trace_id"):
                traces.setdefault(str(d["otel.trace_id"]), sid)
            window(ts, d, sid, tool, kind)
    # Traces whose events already carry a session id (stored after the receiver named them).
    for trace_id, sid in conn.execute(
        "SELECT json_extract(detail, '$.\"otel.trace_id\"'), session_id FROM events"
        " WHERE session_id != '' AND kind LIKE 'otel:%' AND json_extract(detail, '$.\"otel.trace_id\"') IS NOT NULL"
    ):
        traces.setdefault(str(trace_id), sid)
    for rowid, _ts, _tool, _kind, d in rows:
        if rowid not in out and d.get("otel.trace_id") and str(d["otel.trace_id"]) in traces:
            out[rowid] = traces[str(d["otel.trace_id"])]
    for rowid, ts, tool, _kind, d in rows:
        if rowid in out or d.get("otel.trace_id"):
            continue
        hits = {sid for start, end, sid in windows.get(tool, ()) if start <= ts <= end}
        if len(hits) == 1:
            out[rowid] = hits.pop()
    return sorted(out.items())


def _machine(store: Any) -> Any:
    """The store that holds events without a session id: the machine store."""
    return getattr(store, "machine", None) or store


def run(store: Any) -> bool:
    """Run the pass once. Returns True when it is done (now or before)."""
    if store.state_value(STATE_KEY) is not None:
        return True
    machine = _machine(store)
    started = time.monotonic()
    machine.flush()
    pairs = plan(machine._conn())
    changed = machine.set_event_sessions(pairs, "otel session backfill") if pairs else 0
    store.set_state(STATE_KEY, time.time())
    log.info("OTel session backfill: %d events got their session in %.1f s", changed, time.monotonic() - started)
    return True
