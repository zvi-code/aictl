# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Background analytics cache and aggregate computation.

Pre-computes analytics in a background thread so HTTP endpoints never
block on database queries.
"""

from __future__ import annotations

import logging
import threading
import time

logger = logging.getLogger(__name__)


class _AnalyticsCache:
    """Pre-computes analytics in a background thread so the HTTP endpoint
    never blocks on database queries.  Follows the same pattern as the
    SSE snapshot system: compute in background, serve from memory."""

    _INTERVAL = 15  # seconds between recomputes

    def start(self, store) -> None:
        self._store = store
        self._thread = threading.Thread(target=self._loop, daemon=True,
                                        name="analytics-cache")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()

    def request_range(self, since: float, until: float) -> None:
        """Update the time range; wake the background thread if it changed."""
        old = self._requested_range
        self._requested_range = (since, until)
        if old != (since, until):
            self._wake.set()

    def get(self, since: float, until: float) -> dict:
        """Return cached analytics instantly.  If the range changed, the
        background thread will recompute within seconds."""
        self.request_range(since, until)
        with self._lock:
            return self._result

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._result: dict = {}
        self._range_key: tuple[float, float] = (0.0, 0.0)
        self._store = None
        self._stop = threading.Event()
        self._wake = threading.Event()
        self._thread: threading.Thread | None = None
        self._requested_range: tuple[float, float] | None = None

    def _loop(self) -> None:
        # Initial computation on startup
        try:
            self._recompute()
        except Exception:
            logger.exception("Analytics cache initial compute error")
        while not self._stop.is_set():
            # Wait for either the interval or a wake signal
            self._wake.wait(timeout=self._INTERVAL)
            self._wake.clear()
            if self._stop.is_set():
                break
            try:
                self._recompute()
            except Exception:
                logger.exception("Analytics cache recompute error")

    def _recompute(self) -> None:
        db = getattr(self._store, '_db', None) if self._store else None
        if not db:
            return
        rng = self._requested_range
        if not rng:
            rng = (time.time() - 86400, time.time())
        since, until = rng
        if until <= 0:
            until = time.time()

        result = {}
        result["response_time"] = _compute_response_time(db, since, until)
        result["tools"] = _compute_tools(db, since, until)
        result["files"] = _compute_files(db, since, until)

        with self._lock:
            self._result = result
            self._range_key = (since, until)


def _compute_response_time(db, since: float, until: float, limit: int = 2000) -> dict:
    """Build response-time analytics (runs in background thread)."""
    rows = db.query_requests_analytics(since=since, until=until, limit=limit)
    if not rows:
        return {"requests": [], "by_model": []}

    by_session: dict[str, list] = {}
    for r in rows:
        by_session.setdefault(r.get("session_id", ""), []).append(r)

    requests_out = []
    for sid, reqs in by_session.items():
        reqs.sort(key=lambda r: r["ts"])
        for seq, r in enumerate(reqs, 1):
            requests_out.append({
                "ts": r["ts"], "duration_ms": r.get("duration_ms", 0),
                "input_tokens": r.get("input_tokens", 0),
                "output_tokens": r.get("output_tokens", 0),
                "cache_read_tokens": r.get("cache_read_tokens", 0),
                "model": r.get("model", ""),
                "session_id": sid, "agent_id": r.get("agent_id", ""),
                "finish_reason": r.get("finish_reason", ""),
                "cost_usd": r.get("cost_usd", 0),
                "is_error": r.get("is_error", 0), "seq": seq,
            })

    model_groups: dict[str, list[float]] = {}
    model_tokens: dict[str, int] = {}
    for req in requests_out:
        m = req["model"] or "(unknown)"
        model_groups.setdefault(m, []).append(req["duration_ms"])
        model_tokens[m] = model_tokens.get(m, 0) + req["input_tokens"] + req["output_tokens"]

    by_model = []
    for m, durations in sorted(model_groups.items()):
        ds = sorted(durations)
        n = len(ds)
        by_model.append({
            "model": m, "count": n,
            "avg_ms": round(sum(ds) / n, 1) if n else 0,
            "p50_ms": round(ds[n // 2], 1) if n else 0,
            "p95_ms": round(ds[min(int(n * 0.95), n - 1)], 1) if n else 0,
            "total_tokens": model_tokens.get(m, 0),
        })

    requests_out.sort(key=lambda r: r["ts"])
    return {"requests": requests_out, "by_model": by_model}


def _compute_tools(db, since: float, until: float) -> dict:
    """Build tool-usage analytics (runs in background thread).

    Primary source: Pre/PostToolUse event pairs in the events table (joined
    by tool_use_id).  This gives accurate counts and real durations.
    Fallback: tool_invocations table (for OTel-sourced invocations that
    don't go through hooks).
    """
    # Try event-based analytics first (accurate durations from Pre/Post matching)
    agg = db.query_tool_analytics_from_events(since=since, until=until)

    if not agg:
        # Fallback to tool_invocations table
        agg = db.query_tool_invocations_agg(since=since, until=until)

    if not agg:
        # Check if there's data outside this range
        all_time = db.query_tool_analytics_from_events()
        if not all_time:
            all_time = db.query_tool_invocations_agg()
        total_all_time = sum(r["count"] for r in all_time) if all_time else 0
        return {"invocations": [], "total_all_time": total_all_time}

    # Determine which query path we used (events have avg_ms pre-computed)
    use_events = "avg_ms" in agg[0]

    # Get per-tool breakdown by CLI tool (e.g. claude-code vs codex)
    breakdown: dict[str, list[dict]] = {}
    if use_events:
        breakdown = db.query_tool_breakdown_from_events(since=since, until=until)

    invocations = []
    for row in agg[:30]:
        name = row["tool_name"] or "(unknown)"
        count = row["count"]
        total_ms = row.get("total_ms") or 0
        avg_ms = row.get("avg_ms") or (round(total_ms / count, 1) if count else 0)

        # Get per-invocation durations for percentile calculation
        if use_events:
            durations = sorted(db.query_tool_durations_from_events(
                name, since=since, until=until, limit=500))
        else:
            durations = sorted(db.query_tool_invocations_durations(
                name, since=since, until=until, limit=500))
        n = len(durations)
        p95 = round(durations[min(int(n * 0.95), n - 1)], 1) if n else 0

        entry: dict = {
            "tool_name": name, "count": count,
            "avg_ms": avg_ms, "p95_ms": p95,
            "error_count": row.get("error_count", 0),
        }
        if name in breakdown:
            entry["by_cli"] = breakdown[name]
        invocations.append(entry)

    # Collect all unique CLI tools across all invocations for consistent coloring
    cli_tools = sorted({s["cli_tool"] for segs in breakdown.values() for s in segs})
    return {"invocations": invocations, "cli_tools": cli_tools}


def _compute_files(db, since: float, until: float) -> dict:
    """Build file-write analytics (runs in background thread)."""
    # Try structured file_history first
    memory_files = db.list_files(category="memory")
    if memory_files:
        memory_files.sort(key=lambda f: f.last_changed or 0, reverse=True)
        paths = [f.path for f in memory_files[:20]]
        bulk = db.file_history_bulk(paths, since=since, until=until)
        memory_timeline = {}
        for p, entries in bulk.items():
            if entries:
                memory_timeline[p] = {
                    "ts": [e["ts"] for e in entries],
                    "size_bytes": [e["size_bytes"] for e in entries],
                    "tokens": [e.get("tokens", 0) for e in entries],
                }
        memory_events = []
        for p, entries in bulk.items():
            prev_size = 0
            for e in entries:
                sz = e["size_bytes"]
                memory_events.append({
                    "ts": e["ts"], "path": p, "size_bytes": sz,
                    "prev_size": prev_size, "delta": sz - prev_size,
                    "tokens": e.get("tokens", 0),
                })
                prev_size = sz
        memory_events.sort(key=lambda e: e["ts"], reverse=True)
        return {"memory_timeline": memory_timeline, "memory_events": memory_events[:50]}

    # Fallback: single-scan file_modified events
    conn = db._conn()
    rows = conn.execute(
        "SELECT ts, json_extract(detail, '$.path'),"
        " CAST(json_extract(detail, '$.growth_bytes') AS INTEGER)"
        " FROM events WHERE kind = 'file_modified' AND ts >= ? AND ts <= ?"
        " ORDER BY ts LIMIT 5000",
        (since, until),
    ).fetchall()
    if not rows:
        return {"memory_timeline": {}, "memory_events": []}

    path_growth: dict[str, int] = {}
    path_events: dict[str, list] = {}
    for ts_val, path, growth in rows:
        if not path:
            continue
        gb = max(growth or 0, 0)
        path_growth[path] = path_growth.get(path, 0) + gb
        path_events.setdefault(path, []).append((ts_val, gb))

    top_paths = sorted(path_growth.items(), key=lambda x: -x[1])[:8]
    memory_timeline = {}
    for path, total in top_paths:
        if total <= 0:
            continue
        events = path_events[path][:200]
        if len(events) < 2:
            continue
        ts_list, cumulative = [], []
        running = 0
        for ts_val, gb in events:
            running += gb
            ts_list.append(ts_val)
            cumulative.append(running)
        memory_timeline[path] = {
            "ts": ts_list, "size_bytes": cumulative, "tokens": [c // 4 for c in cumulative],
        }

    memory_events = []
    for ts_val, path, growth in reversed(rows):
        if growth and growth > 0:
            memory_events.append({
                "ts": ts_val, "path": path or "", "size_bytes": growth,
                "prev_size": 0, "delta": growth, "tokens": growth // 4,
            })
            if len(memory_events) >= 50:
                break

    return {"memory_timeline": memory_timeline, "memory_events": memory_events}
