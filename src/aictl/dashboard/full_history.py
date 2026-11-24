"""The board's "All history": a window from the earliest stored activity in scope to now.

The page asks for it with ``since=all`` and the ``until`` of its own window. A board read resolves that to
one window here before it reads anything else: the start is the earliest session start in the scope (the
node or the fleet, and the project filter), read with one small view (``board.history_start``) and kept
for ``TTL_S``, so the board answer, each of its sections and the live board of one selection use the same
window. The buckets are whole hours for a store younger than a few days, else whole days, at most
``MAX_FULL_BUCKETS`` of them; the window ends at the end of the bucket that holds ``until``.

A route that does not resolve the window (a detail of one tool or error) reads ``since=all`` as the start
of time: its totals are then over all history, as on Insights.
"""

from __future__ import annotations

import math
import threading
import time
from dataclasses import replace
from typing import Any

from .board_filters import Filters

HOUR = 3600.0
DAY = 86400.0
MAX_FULL_BUCKETS = 60
# Bucket sizes in hours, tried in turn before whole days: a store up to 7.5 days old is drawn by hours.
HOUR_STEPS = (1, 2, 3)
# How long a resolved start is used before it is read again.
TTL_S = 300.0
_CACHE_KEYS = 32
_cache: dict[tuple, tuple[float, float | None]] = {}
_lock = threading.Lock()


def history_start(history: Any) -> float | None:
    """The earliest session start in *history*'s scope (epoch seconds), or None when it holds no session."""
    key = (history.reader, history.node)
    with _lock:
        hit = _cache.get(key)
    if hit is not None and time.monotonic() - hit[0] < TTL_S:
        return hit[1]
    rows = history.read("board.history_start", limit=1)
    value = rows[0].get("first_ts") if rows else None
    start = float(value) if isinstance(value, (int, float)) and math.isfinite(value) and value > 0 else None
    with _lock:
        _cache.pop(key, None)
        _cache[key] = (time.monotonic(), start)
        while len(_cache) > _CACHE_KEYS:
            _cache.pop(next(iter(_cache)))
    return start


def window(start: float | None, until: float) -> tuple[float, float, int]:
    """(since, until, buckets) of all history from *start* to *until*. No start: the last day."""
    if start is None or start >= until:
        start = until - DAY
    for hours in HOUR_STEPS:
        step = hours * HOUR
        since = math.floor(start / step) * step
        buckets = math.ceil((until - since) / step)
        if buckets <= MAX_FULL_BUCKETS:
            return since, since + buckets * step, buckets
    since = math.floor(start / DAY) * DAY
    days = math.ceil((until - since) / DAY)
    per_bucket = math.ceil(days / MAX_FULL_BUCKETS)
    buckets = math.ceil(days / per_bucket)
    return since, since + buckets * per_bucket * DAY, buckets


def resolve(filters: Filters, history: Any) -> Filters:
    """*filters* with the window of all history in *history*'s scope when they ask for it (``since=all``)."""
    if not filters.full_history:
        return filters
    from .project_filter import resolve as members
    from .project_filter import scoped

    projects = members(history, filters.projects, filters.repos) if filters.repos else filters.projects
    since, until, buckets = window(history_start(scoped(history, projects)), filters.until)
    return replace(filters, since=since, until=until, buckets=buckets)
