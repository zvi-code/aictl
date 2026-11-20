"""Adapt the named event view to the analysis projections."""

import json

from ..records import EventRow
from ..stores.base import Reader


def session_events(reader: Reader, session_id: str, limit: int) -> list[EventRow]:
    result = reader.read("events.page", {"requested_session": session_id, "row_limit": limit})
    rows = []
    for row in result.rows:
        detail = row.get("detail")
        if isinstance(detail, str):
            try:
                detail = json.loads(detail)
            except ValueError:
                detail = {}
        rows.append(EventRow(ts=row["ts"], tool=row["tool"], kind=row["kind"], detail=detail or {},
                             session_id=row.get("session_id") or "", pid=row.get("pid") or 0))
    return rows
