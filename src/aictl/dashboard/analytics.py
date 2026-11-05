# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Background analytics cache and aggregate computation.

Pre-computes analytics in a background thread so HTTP endpoints never
block on database queries.
"""

from __future__ import annotations

import logging
import sqlite3
import threading
import time
from datetime import datetime

from ..data.model_pricing import PRICING_AS_OF, PRICING_SOURCES, context_window_for
from ..data.provenance import COPILOT_COST_REASON, USD_PER_AI_CREDIT, combine_cost_quality, combine_tokens_quality
from ..ingesters.transcript_usage import local_day
from ..tool_scope import is_selected, is_unattributed, normalize_selection, selection_block

logger = logging.getLogger(__name__)


# One cached result is keyed by everything that shapes it: the time range and
# the tool selection. ``None`` for since/until means "the default window at
# compute time" and ``None`` for tools means every tool.
AnalyticsKey = tuple[float | None, float | None, tuple[str, ...] | None]


def analytics_key(since: float | None, until: float | None, tools=None) -> AnalyticsKey:
    return (since, until, normalize_selection(tools))


class _AnalyticsCache:
    """Pre-computes analytics in a background thread so the HTTP endpoint
    never blocks on database queries.  Follows the same pattern as the
    SSE snapshot system: compute in background, serve from memory.

    A result is only ever served for the exact (range, tool selection) it was
    computed for. A request for another key gets a ``pending`` answer until the
    background thread has computed that key, so a new filter never shows the
    previous selection's numbers."""

    _INTERVAL = 15  # seconds between recomputes
    _MAX_KEYS = 6  # distinct (range, selection) pairs kept warm
    _KEY_TTL = 120.0  # seconds a key stays warm after its last request

    def start(self, store) -> None:
        self._store = store
        self._thread = threading.Thread(target=self._loop, daemon=True, name="analytics-cache")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()

    def request_range(self, since: float | None, until: float | None, tools=None) -> AnalyticsKey:
        """Mark a (range, selection) as wanted; wake the background thread if it is new."""
        key = analytics_key(since, until, tools)
        with self._lock:
            is_new = key not in self._results and key not in self._wanted
            self._wanted[key] = time.monotonic()
            while len(self._wanted) > self._MAX_KEYS:
                oldest = min(self._wanted, key=self._wanted.__getitem__)
                self._wanted.pop(oldest)
                self._results.pop(oldest, None)
        if is_new:
            self._wake.set()
        return key

    def get(self, since: float | None, until: float | None, tools=None) -> dict:
        """Return cached analytics instantly.

        The answer always names the selection it covers. When that exact
        (range, selection) has not been computed yet the answer is
        ``{"pending": True, ...}`` with no figures, and the background thread
        computes it within seconds.

        The returned dict carries a ``_health`` block so consumers (the
        analytics endpoint, the UI) can detect a degraded background thread
        instead of silently rendering stale data as if it were fresh.
        """
        key = self.request_range(since, until, tools)
        with self._lock:
            cached = self._results.get(key)
            if cached is None:
                result: dict = {
                    "pending": True,
                    "selection": selection_block(key[2]),
                    "range": {"since": since, "until": until},
                }
            else:
                result = dict(cached)
                result["pending"] = False
        result["_health"] = self.health()
        return result

    def health(self) -> dict:
        """Current background-thread health. ``ok`` is False once recompute
        has failed at least once without a subsequent success."""
        with self._health_lock:
            return {
                "ok": self._consecutive_errors == 0,
                "consecutive_errors": self._consecutive_errors,
                "last_error": self._last_error,
                "last_success_ts": self._last_success_ts,
            }

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._results: dict[AnalyticsKey, dict] = {}
        self._wanted: dict[AnalyticsKey, float] = {}
        self._store = None
        self._stop = threading.Event()
        self._wake = threading.Event()
        self._thread: threading.Thread | None = None
        # Health tracking so the silent background-thread swallow becomes an
        # observable signal a consumer can act on.
        self._health_lock = threading.Lock()
        self._consecutive_errors = 0
        self._last_error: str | None = None
        self._last_success_ts: float | None = None

    def _mark_success(self) -> None:
        recovered = False
        with self._health_lock:
            recovered = self._consecutive_errors > 0
            self._consecutive_errors = 0
            self._last_error = None
            self._last_success_ts = time.time()
        if recovered:
            self._record_quality("ok", severity="info", message="Analytics background thread recovered")

    def _mark_error(self, exc: BaseException) -> None:
        with self._health_lock:
            self._consecutive_errors += 1
            self._last_error = f"{type(exc).__name__}: {exc}"
            count = self._consecutive_errors
        # Surface to the operator-facing /api/data-quality endpoint (the actor
        # that consumes this signal) instead of only logging. Escalate severity
        # once failures persist so a transient blip isn't treated like an outage.
        severity = "error" if count >= 3 else "warning"
        self._record_quality(
            "failed",
            severity=severity,
            message=f"Analytics background recompute failed ({count}x): {type(exc).__name__}",
            detail={"consecutive_errors": count, "error": str(exc)},
        )

    def _record_quality(self, status: str, *, severity: str, message: str, detail: dict | None = None) -> None:
        db = getattr(self._store, "_db", None) if self._store else None
        if db is None or not hasattr(db, "record_data_quality"):
            return
        try:
            db.record_data_quality(
                "dashboard:analytics-cache",
                status,
                kind="aggregator",
                severity=severity,
                message=message,
                detail=detail,
            )
        except (OSError, sqlite3.Error):
            logger.debug("analytics cache: failed to record data-quality signal", exc_info=True)

    def _loop(self) -> None:
        # Initial computation on startup
        try:
            self._recompute()
            self._mark_success()
        except Exception as exc:
            self._mark_error(exc)
            logger.exception("Analytics cache initial compute error")
        while not self._stop.is_set():
            # Wait for either the interval or a wake signal
            self._wake.wait(timeout=self._INTERVAL)
            self._wake.clear()
            if self._stop.is_set():
                break
            try:
                self._recompute()
                self._mark_success()
            except Exception as exc:
                self._mark_error(exc)
                logger.exception("Analytics cache recompute error")

    def _recompute(self) -> None:
        db = getattr(self._store, "_db", None) if self._store else None
        if not db:
            return
        now = time.monotonic()
        with self._lock:
            for key in [k for k, seen in self._wanted.items() if now - seen > self._KEY_TTL]:
                self._wanted.pop(key)
                self._results.pop(key, None)
            keys = list(self._wanted) or [analytics_key(None, None)]
        failure: Exception | None = None
        for key in keys:
            try:
                result = compute_analytics(db, *key)
            except Exception as exc:
                logger.exception("Analytics compute error for key %s", key)
                failure = failure or exc
                continue
            with self._lock:
                if key in self._wanted or not self._wanted:
                    self._results[key] = result
        if failure is not None:
            raise failure


def compute_analytics(db, since: float | None, until: float | None, tools: tuple[str, ...] | None) -> dict:
    """Every analytics section for one (range, tool selection), stating both."""
    now = time.time()
    since = since if since is not None else now - 86400
    until = until if until and until > 0 else now
    return {
        "selection": selection_block(tools),
        "range": {"since": since, "until": until},
        "response_time": _compute_response_time(db, since, until, tools=tools),
        "tools": _compute_tools(db, since, until, tools=tools),
        "files": _compute_files(db, since, until, tools=tools),
    }


def _unattributed_hidden(count_fn, since: float, until: float, tools) -> int:
    """Rows a selection hides because no tool can be recovered for them (0 with All tools)."""
    return count_fn(since=since, until=until) if tools is not None else 0


def _compute_response_time(db, since: float, until: float, limit: int = 2000, tools=None) -> dict:
    """Build response-time analytics (runs in background thread).

    `tools` is the tool selection (None is every tool). Percentiles and per-model
    groups are computed from the selected tools' own rows. ``unattributed_hidden``
    counts rows with no recoverable tool, which no selection includes.
    """
    hidden = _unattributed_hidden(db.count_requests_unattributed, since, until, tools)
    rows = db.query_requests_analytics(since=since, until=until, limit=limit, tools=tools)
    if not rows:
        return {"requests": [], "by_model": [], "unattributed_hidden": hidden}

    by_session: dict[str, list] = {}
    for r in rows:
        by_session.setdefault(r.get("session_id", ""), []).append(r)

    requests_out = []
    for sid, reqs in by_session.items():
        reqs.sort(key=lambda r: r["ts"])
        for seq, r in enumerate(reqs, 1):
            # TODO(#token-usage): migrate to TokenUsage.from_dict
            requests_out.append(
                {
                    "ts": r["ts"],
                    "duration_ms": r.get("duration_ms", 0),
                    "input_tokens": r.get("input_tokens", 0),
                    "output_tokens": r.get("output_tokens", 0),
                    "cache_read_tokens": r.get("cache_read_tokens", 0),
                    "model": r.get("model", ""),
                    "session_id": sid,
                    "agent_id": r.get("agent_id", ""),
                    "finish_reason": r.get("finish_reason", ""),
                    "cost_usd": r.get("cost_usd", 0),
                    "is_error": r.get("is_error", 0),
                    "seq": seq,
                }
            )

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
        by_model.append(
            {
                "model": m,
                "count": n,
                "avg_ms": round(sum(ds) / n, 1) if n else 0,
                "p50_ms": round(ds[n // 2], 1) if n else 0,
                "p95_ms": round(ds[min(int(n * 0.95), n - 1)], 1) if n else 0,
                "total_tokens": model_tokens.get(m, 0),
            }
        )

    requests_out.sort(key=lambda r: r["ts"])
    return {"requests": requests_out, "by_model": by_model, "unattributed_hidden": hidden}


def _compute_tools(db, since: float, until: float, tools=None) -> dict:
    """Build tool-usage analytics (runs in background thread).

    Primary source: Pre/PostToolUse event pairs in the events table (joined
    by tool_use_id).  This gives accurate counts and real durations.
    Fallback: tool_invocations table (for OTel-sourced invocations that
    don't go through hooks).

    `tools` is the tool selection (None is every tool); every count, average and
    percentile comes from the selected tools' rows only.
    """
    # Try event-based analytics first (accurate durations from Pre/Post matching)
    agg = db.query_tool_analytics_from_events(since=since, until=until, tools=tools)
    use_events = bool(agg)
    count_hidden = db.count_tool_events_unattributed

    # The source does not depend on the selection: when hook pairs exist for other
    # tools, a selection with none has no usage, rather than switching source.
    if not agg and tools is not None and db.query_tool_analytics_from_events(since=since, until=until):
        use_events = True
    elif not agg:
        # Fallback to tool_invocations table
        agg = db.query_tool_invocations_agg(since=since, until=until, tools=tools)
        count_hidden = db.count_tool_invocations_unattributed
    hidden = _unattributed_hidden(count_hidden, since, until, tools)

    if not agg:
        # Check if there's data outside this range
        all_time = db.query_tool_analytics_from_events(tools=tools)
        if not all_time:
            all_time = db.query_tool_invocations_agg(tools=tools)
        total_all_time = sum(r["count"] for r in all_time) if all_time else 0
        return {"invocations": [], "total_all_time": total_all_time, "unattributed_hidden": hidden}

    # Get per-tool breakdown by CLI tool (e.g. claude-code vs codex)
    breakdown: dict[str, list[dict]] = {}
    if use_events:
        breakdown = db.query_tool_breakdown_from_events(since=since, until=until, tools=tools)

    invocations = []
    for row in agg[:30]:
        name = row["tool_name"] or "(unknown)"
        count = row["count"]
        total_ms = row.get("total_ms") or 0
        avg_ms = row.get("avg_ms") or (round(total_ms / count, 1) if count else 0)

        # Get per-invocation durations for percentile calculation
        if use_events:
            durations = sorted(
                db.query_tool_durations_from_events(name, since=since, until=until, limit=500, tools=tools)
            )
        else:
            durations = sorted(
                db.query_tool_invocations_durations(name, since=since, until=until, limit=500, tools=tools)
            )
        n = len(durations)
        p95 = round(durations[min(int(n * 0.95), n - 1)], 1) if n else 0

        entry: dict = {
            "tool_name": name,
            "count": count,
            "avg_ms": avg_ms,
            "p95_ms": p95,
            "error_count": row.get("error_count", 0),
        }
        if name in breakdown:
            entry["by_cli"] = breakdown[name]
        invocations.append(entry)

    # Collect all unique CLI tools across all invocations for consistent coloring
    cli_tools = sorted({s["cli_tool"] for segs in breakdown.values() for s in segs})
    return {"invocations": invocations, "cli_tools": cli_tools, "unattributed_hidden": hidden}


def _compute_files(db, since: float, until: float, tools=None) -> dict:
    """Build file-write analytics (runs in background thread).

    `tools` is the tool selection (None is every tool). Memory files carry the
    tool that owns them; ``unattributed_hidden`` counts files and write events
    with no recoverable tool, which no selection includes.
    """
    # Try structured file_history first
    memory_files = db.list_files(category="memory")
    if memory_files:
        hidden = 0
        if tools is not None:
            # Files with no recoverable owner and some change in the window.
            orphans = [f.path for f in memory_files if is_unattributed(f.tool)]
            hidden = sum(1 for entries in db.file_history_bulk(orphans, since=since, until=until).values() if entries)
            memory_files = [f for f in memory_files if is_selected(f.tool, tools)]
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
                memory_events.append(
                    {
                        "ts": e["ts"],
                        "path": p,
                        "size_bytes": sz,
                        "prev_size": prev_size,
                        "delta": sz - prev_size,
                        "tokens": e.get("tokens", 0),
                    }
                )
                prev_size = sz
        memory_events.sort(key=lambda e: e["ts"], reverse=True)
        return {"memory_timeline": memory_timeline, "memory_events": memory_events[:50], "unattributed_hidden": hidden}

    # Fallback: single-scan file_modified events
    hidden = _unattributed_hidden(db.count_file_modified_unattributed, since, until, tools)
    rows = db.query_file_modified_events(since=since, until=until, tools=tools)
    if not rows:
        return {"memory_timeline": {}, "memory_events": [], "unattributed_hidden": hidden}

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
            "ts": ts_list,
            "size_bytes": cumulative,
            "tokens": [c // 4 for c in cumulative],
        }

    memory_events = []
    for ts_val, path, growth in reversed(rows):
        if growth and growth > 0:
            memory_events.append(
                {
                    "ts": ts_val,
                    "path": path or "",
                    "size_bytes": growth,
                    "prev_size": 0,
                    "delta": growth,
                    "tokens": growth // 4,
                }
            )
            if len(memory_events) >= 50:
                break

    return {"memory_timeline": memory_timeline, "memory_events": memory_events, "unattributed_hidden": hidden}


CLOUD_ONLY_TOOLS = ("copilot365",)
_TOKEN_KEYS = ("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens")


def window_sessions(db, since: float, until: float | None = None) -> tuple[list[dict], int]:
    """Every session with usage in the window, each logical session exactly once.

    Returns ``(sessions, ignored_rows)``. A session's token classes, cost and
    ``daily`` splits cover only the local days inside the window (a day is the
    smallest unit; a session running across midnight lands on both days).

    Double counting is prevented here for every caller: a transcript row wins
    over any ``sessions`` row with the same UUID, and a row with no UUID (a
    correlator ``tool:pid:start`` id) is ignored for a tool that has transcript
    coverage, since it can only be another view of the same tokens.
    """
    from ..storage import _session_uuid

    until = until or time.time()
    first, last = local_day(since), local_day(until)
    out: list[dict] = []
    covered_ids: set[str] = set()
    covered_tools: set[str] = set()
    for u in db.query_session_usage(active_since=since, active_until=until):
        covered_ids.add(u["session_id"].lower())
        covered_tools.add(u["tool"])
        days = {d: v for d, v in u["daily"].items() if first <= d <= last}
        if not days:
            continue
        entry = {
            "session_id": u["session_id"],
            "tool": u["tool"],
            "project": u["project_path"],
            "model": u["model"],
            "daily": days,
            "tool_calls": u["tool_call_count"],
            "turns": u["turn_count"],
            "tokens_source": u["source"],
            "tokens_quality": u["quality"],
            "cost_quality": u["cost_quality"],
            "cost_reason": u["cost_reason"],
            "unpriced_models": u["unpriced_models"],
            "billing_unit": u["billing_unit"],
            "billing_amount": (sum(d.get("billing_amount", 0.0) for d in days.values()) or None) if u["billing_unit"] else None,
            "premium_requests": u["premium_requests"] or None,
            "estimated_list_usd": (round(sum(d.get("estimated_list_usd", 0.0) for d in days.values()), 6) or None) if u["billing_unit"] else None,
            "requests": sum(m.get("requests", 0) for d in days.values() for m in d.get("models", {}).values()),
        }
        for key in _TOKEN_KEYS:
            entry[key] = sum(d.get(key, 0) for d in days.values())
        entry["cost_usd"] = None if u["cost_usd"] is None else round(sum(d.get("cost_usd", 0.0) for d in days.values()), 6)
        out.append(entry)

    ignored = 0
    for p in db.query_session_profiles(since=since, until=until):
        if p.get("tokens_source") == "transcript" or not any(p.get(k) for k in _TOKEN_KEYS):
            continue
        ids = [p.get("session_id", ""), *(p.get("alt_session_ids") or [])]
        uuids = {(_session_uuid(i) or "") for i in ids} - {""}
        if uuids & covered_ids:
            continue
        if not uuids and p.get("tool") in covered_tools:
            ignored += 1
            continue
        day = local_day(p.get("started_at") or since)
        out.append(
            {
                "session_id": p.get("session_id", ""),
                "tool": p.get("tool", ""),
                "project": p.get("project_path", ""),
                "model": p.get("model", ""),
                "daily": {day: {**{k: p.get(k, 0) or 0 for k in _TOKEN_KEYS}, "cost_usd": p.get("cost_usd") or 0.0}},
                "tool_calls": p.get("tool_call_count", 0) or 0,
                "turns": 0,
                "requests": p.get("request_count", 0) or 0,
                "tokens_source": p.get("tokens_source", "none"),
                "tokens_quality": p.get("tokens_quality", "unknown"),
                "cost_usd": p.get("cost_usd"),
                "cost_quality": p.get("cost_quality", "unknown"),
                "cost_reason": p.get("cost_reason", ""),
                "unpriced_models": p.get("unpriced_models") or [],
                "billing_unit": p.get("billing_unit") or "",
                "billing_amount": p.get("billing_amount"),
                "premium_requests": p.get("premium_requests"),
                "estimated_list_usd": p.get("estimated_list_usd"),
                **{k: p.get(k, 0) or 0 for k in _TOKEN_KEYS},
            }
        )
    return out, ignored


def _rollup(sessions: list[dict]) -> dict:
    tokens = {k: sum(s[k] for s in sessions) for k in _TOKEN_KEYS}
    priced = [s["cost_usd"] for s in sessions if s["cost_usd"] is not None]
    unpriced = sorted({m for s in sessions for m in s["unpriced_models"]})
    cost_quality = combine_cost_quality({s["cost_quality"] for s in sessions})
    credits_rows = [s for s in sessions if s.get("billing_unit")]
    credit_amounts = [s["billing_amount"] for s in credits_rows if s.get("billing_amount") is not None]
    premium = [s["premium_requests"] for s in credits_rows if s.get("premium_requests") is not None]
    estimates = [s["estimated_list_usd"] for s in credits_rows if s.get("estimated_list_usd") is not None]
    billing = {
        # ai_credits as Copilot reports them. billing_usd_value is credits x $0.01:
        # consumption value, which a plan allowance may cover, so not an invoice.
        "billing_unit": "ai_credits" if credits_rows else "",
        "billing_amount": round(sum(credit_amounts), 4) if credit_amounts else None,
        "billing_usd_value": round(sum(credit_amounts) * USD_PER_AI_CREDIT, 4) if credit_amounts else None,
        "premium_requests": round(sum(premium), 2) if premium else None,
        "estimated_list_usd": round(sum(estimates), 4) if estimates else None,
    }
    return {
        **billing,
        "sessions": len(sessions),
        "requests": sum(s["requests"] for s in sessions),
        "turns": sum(s["turns"] for s in sessions),
        "tool_calls": sum(s["tool_calls"] for s in sessions),
        **tokens,
        "total_tokens": sum(tokens.values()),
        "cost_usd": round(sum(priced), 4) if priced else None,
        "cost_quality": cost_quality,
        "cost_source": "list_price" if priced else "none",
        "cost_reason": (
            "no list price for: " + ", ".join(unpriced)
            if unpriced
            else (
                COPILOT_COST_REASON
                if credits_rows
                else "list price x tokens; plan or partner billing may differ"
            )
        ),
        "unpriced_models": unpriced,
        "tokens_source": sorted({s["tokens_source"] for s in sessions}),
        "tokens_quality": combine_tokens_quality({s["tokens_quality"] for s in sessions}),
    }


def compute_usage_summary(db, since: float, until: float | None = None) -> dict:
    """Headline usage per tool and per local day, with provenance on each figure."""
    until = until or time.time()
    sessions, ignored = window_sessions(db, since, until)
    tools = []
    for tool in sorted({s["tool"] for s in sessions}):
        group = [s for s in sessions if s["tool"] == tool]
        by_model: dict[str, dict] = {}
        for s in group:
            for day in s["daily"].values():
                for model, v in day.get("models", {}).items():
                    m = by_model.setdefault(model, {"model": model, "requests": 0, **dict.fromkeys(_TOKEN_KEYS, 0), "cost_usd": 0.0})
                    m["requests"] += v.get("requests", 0)
                    for k in _TOKEN_KEYS:
                        m[k] += v.get(k, 0)
                    m["cost_usd"] += v.get("cost_usd", 0.0)
                    m["billing_amount"] = (m.get("billing_amount") or 0.0) + v.get("billing_amount", 0.0)
        unpriced = {m for s in group for m in s["unpriced_models"]}
        bills_credits = any(s.get("billing_unit") for s in group)
        for m in by_model.values():
            m["cost_usd"] = None if bills_credits or m["model"] in unpriced else round(m["cost_usd"], 4)
            m["billing_amount"] = round(m["billing_amount"], 4) if m.get("billing_amount") else None
            m["context_window"] = context_window_for(m["model"])
        tools.append(
            {"tool": tool, **_rollup(group), "by_model": sorted(by_model.values(), key=lambda m: -m["requests"])}
        )
    daily: dict[tuple[str, str], dict] = {}
    for s in sessions:
        for date, v in s["daily"].items():
            d = daily.setdefault((date, s["tool"]), {"date": date, "tool": s["tool"], **dict.fromkeys(_TOKEN_KEYS, 0), "cost_usd": 0.0})
            for k in _TOKEN_KEYS:
                d[k] += v.get(k, 0)
            d["cost_usd"] = round(d["cost_usd"] + v.get("cost_usd", 0.0), 4)
    return {
        "since": since,
        "until": until,
        "day_boundary": "local",
        "timezone": datetime.now().astimezone().tzname() or "",
        "tools": tools,
        "totals": _rollup(sessions) if sessions else None,
        "daily": [daily[k] for k in sorted(daily)],
        "ignored_rows": ignored,
        # Cloud-only tools leave nothing local to count: not available, never 0.
        "not_available": [
            {"tool": t, "reason": "cloud-only tool with no local usage data"}
            for t in CLOUD_ONLY_TOOLS
            if t not in {x["tool"] for x in tools}
        ],
        "pricing": {"as_of": PRICING_AS_OF, "sources": list(PRICING_SOURCES)},
    }
