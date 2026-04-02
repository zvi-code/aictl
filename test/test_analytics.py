"""Tests for the /api/analytics endpoint and supporting storage methods."""

from __future__ import annotations

import json
import time

import pytest

from aictl.storage import (
    EventRow,
    HistoryDB,
    RequestRow,
    ToolInvocationRow,
)


@pytest.fixture()
def db():
    """In-memory DB with immediate flush."""
    d = HistoryDB(db_path=":memory:", flush_interval=0)
    yield d
    d.close()


def _seed_requests(db: HistoryDB, base_ts: float):
    """Insert a realistic set of requests across two sessions and two models."""
    reqs = [
        # Session A — 4 requests, mixed models
        RequestRow(ts=base_ts,       session_id="s-a", model="opus-4", input_tokens=500,
                   output_tokens=200, duration_ms=1000, finish_reason="stop"),
        RequestRow(ts=base_ts + 10,  session_id="s-a", model="opus-4", input_tokens=1500,
                   output_tokens=400, duration_ms=2000, finish_reason="tool_use"),
        RequestRow(ts=base_ts + 20,  session_id="s-a", model="sonnet-4", input_tokens=800,
                   output_tokens=300, duration_ms=500, finish_reason="stop"),
        RequestRow(ts=base_ts + 30,  session_id="s-a", model="opus-4", input_tokens=3000,
                   output_tokens=600, duration_ms=4000, finish_reason="stop"),
        # Session B — 2 requests
        RequestRow(ts=base_ts + 5,   session_id="s-b", model="sonnet-4", input_tokens=200,
                   output_tokens=100, duration_ms=300, finish_reason="stop"),
        RequestRow(ts=base_ts + 15,  session_id="s-b", model="sonnet-4", input_tokens=600,
                   output_tokens=250, duration_ms=700, finish_reason="stop", is_error=1),
    ]
    for r in reqs:
        db.append_request(r)


def _seed_tool_invocations(db: HistoryDB, base_ts: float):
    """Insert tool invocations for testing."""
    invocations = [
        ToolInvocationRow(ts=base_ts,      source_ts=base_ts,      session_id="s-a", tool_name="Read", duration_ms=50),
        ToolInvocationRow(ts=base_ts + 5,  source_ts=base_ts + 5,  session_id="s-a", tool_name="Read", duration_ms=30),
        ToolInvocationRow(ts=base_ts + 10, source_ts=base_ts + 10, session_id="s-a", tool_name="Edit", duration_ms=200),
        ToolInvocationRow(ts=base_ts + 15, source_ts=base_ts + 15, session_id="s-a", tool_name="Bash", duration_ms=5000, is_error=1),
        ToolInvocationRow(ts=base_ts + 20, source_ts=base_ts + 20, session_id="s-a", tool_name="Read", duration_ms=80),
    ]
    for inv in invocations:
        db.append_tool_invocation(inv)


def _seed_memory_files(db: HistoryDB, base_ts: float):
    """Insert memory files with history."""
    # Create the file entries
    db.upsert_file("/mem/user.md", tool="claude-code", category="memory",
                   content="# User\nrole: engineer", mtime=base_ts)
    db.upsert_file("/mem/feedback.md", tool="claude-code", category="memory",
                   content="# Feedback\nkeep it short", mtime=base_ts + 10)
    # Simulate growth by upserting with different content
    db.upsert_file("/mem/user.md", tool="claude-code", category="memory",
                   content="# User\nrole: engineer\nprefers: terse responses", mtime=base_ts + 20)


# ── file_history_bulk ─────────────────────────────────────────────

class TestFileHistoryBulk:
    def test_empty_paths(self, db: HistoryDB):
        assert db.file_history_bulk([]) == {}

    def test_returns_keyed_by_path(self, db: HistoryDB):
        base = time.time()
        _seed_memory_files(db, base)
        result = db.file_history_bulk(["/mem/user.md", "/mem/feedback.md"])
        assert "/mem/user.md" in result
        assert "/mem/feedback.md" in result

    def test_user_file_has_two_snapshots(self, db: HistoryDB):
        base = time.time()
        _seed_memory_files(db, base)
        result = db.file_history_bulk(["/mem/user.md"])
        # upsert_file inserts into file_history on each content change
        entries = result["/mem/user.md"]
        assert len(entries) >= 2
        # Should be ordered by ts ascending
        assert entries[0]["ts"] <= entries[-1]["ts"]
        # Size should grow
        assert entries[-1]["size_bytes"] > entries[0]["size_bytes"]

    def test_since_filter(self, db: HistoryDB):
        base = time.time()
        _seed_memory_files(db, base)
        result = db.file_history_bulk(["/mem/user.md"], since=base + 15)
        entries = result["/mem/user.md"]
        # Only the second snapshot should pass the filter
        for e in entries:
            assert e["ts"] >= base + 15

    def test_missing_path_returns_empty_list(self, db: HistoryDB):
        result = db.file_history_bulk(["/nonexistent"])
        assert result == {"/nonexistent": []}


# ── Analytics: response_time section ──────────────────────────────

class TestAnalyticsResponseTime:
    """Test the analytics response_time aggregation logic by calling the
    underlying storage queries and replicating the web_server aggregation."""

    def test_lightweight_query(self, db: HistoryDB):
        base = time.time()
        _seed_requests(db, base)
        rows = db.query_requests_analytics(since=base - 1, until=base + 100, limit=100)
        assert len(rows) == 6
        # Should NOT include heavy fields like error_type, source, prompt_id
        assert "error_type" not in rows[0]
        assert "source" not in rows[0]
        # Should include needed fields
        assert "duration_ms" in rows[0]
        assert "model" in rows[0]
        assert "session_id" in rows[0]

    def test_sequence_numbering(self, db: HistoryDB):
        base = time.time()
        _seed_requests(db, base)
        rows = db.query_requests_analytics(since=base - 1, until=base + 100, limit=100)
        assert len(rows) == 6

        # Group by session and assign seq
        by_session: dict[str, list] = {}
        for r in rows:
            by_session.setdefault(r["session_id"], []).append(r)
        for reqs in by_session.values():
            reqs.sort(key=lambda r: r["ts"])

        # Session A should have 4 requests with seq 1-4
        assert len(by_session["s-a"]) == 4
        # Session B should have 2 requests with seq 1-2
        assert len(by_session["s-b"]) == 2

    def test_by_model_percentiles(self, db: HistoryDB):
        base = time.time()
        _seed_requests(db, base)
        rows = db.query_requests(since=base - 1, until=base + 100, limit=100)

        # Aggregate by model
        model_groups: dict[str, list[float]] = {}
        for r in rows:
            m = r.get("model", "")
            model_groups.setdefault(m, []).append(r["duration_ms"])

        # Opus-4: durations [1000, 2000, 4000] → avg=2333, p50=2000
        opus = sorted(model_groups["opus-4"])
        assert len(opus) == 3
        assert opus == [1000, 2000, 4000]
        avg = sum(opus) / len(opus)
        assert round(avg, 1) == pytest.approx(2333.3, abs=1)
        p50 = opus[len(opus) // 2]
        assert p50 == 2000

        # Sonnet-4: durations [300, 500, 700] → avg=500, p50=500
        sonnet = sorted(model_groups["sonnet-4"])
        assert len(sonnet) == 3
        p95_idx = min(int(len(sonnet) * 0.95), len(sonnet) - 1)
        assert sonnet[p95_idx] == 700  # p95 for 3 items = last


# ── Analytics: tools section ──────────────────────────────────────

class TestAnalyticsTools:
    def test_sql_aggregation(self, db: HistoryDB):
        base = time.time()
        _seed_tool_invocations(db, base)
        agg = db.query_tool_invocations_agg(since=base - 1, until=base + 100)
        # Should have 3 distinct tools
        by_name = {r["tool_name"]: r for r in agg}
        assert "Read" in by_name
        assert "Edit" in by_name
        assert "Bash" in by_name

        # Read: 3 invocations, total_ms = 50+30+80 = 160
        assert by_name["Read"]["count"] == 3
        assert by_name["Read"]["total_ms"] == 160

        # Bash: 1 invocation, 1 error
        assert by_name["Bash"]["count"] == 1
        assert by_name["Bash"]["error_count"] == 1

        # Edit: 1 invocation, 0 errors
        assert by_name["Edit"]["count"] == 1
        assert by_name["Edit"]["error_count"] == 0

    def test_durations_for_percentile(self, db: HistoryDB):
        base = time.time()
        _seed_tool_invocations(db, base)
        durations = db.query_tool_invocations_durations("Read", since=base - 1, until=base + 100)
        assert sorted(durations) == [30, 50, 80]


# ── Analytics: files section ──────────────────────────────────────

class TestAnalyticsFiles:
    def test_memory_files_listed(self, db: HistoryDB):
        base = time.time()
        _seed_memory_files(db, base)
        files = db.list_files(category="memory")
        paths = [f.path for f in files]
        assert "/mem/user.md" in paths
        assert "/mem/feedback.md" in paths

    def test_memory_timeline_has_data(self, db: HistoryDB):
        base = time.time()
        _seed_memory_files(db, base)
        files = db.list_files(category="memory")
        paths = [f.path for f in files]
        bulk = db.file_history_bulk(paths, since=base - 1)
        # user.md should have multiple history entries (content changed)
        assert len(bulk["/mem/user.md"]) >= 2


# ── Analytics endpoint performance ────────────────────────────────

def _seed_many_events(db: HistoryDB, base_ts: float, count: int = 10000):
    """Insert many file_modified events to simulate realistic load."""
    paths = [f"/project/session-{i % 20}/file-{i % 100}.jsonl" for i in range(count)]
    for i in range(count):
        db.append_event(EventRow(
            ts=base_ts + i * 0.5,
            tool="claude-code",
            kind="file_modified",
            detail={"path": paths[i], "growth_bytes": (i % 50) * 100},
            session_id=f"s-{i % 20}",
        ))


def _seed_many_requests(db: HistoryDB, base_ts: float, count: int = 3000):
    """Insert many requests to simulate a 7-day load."""
    models = ["opus-4", "sonnet-4", "haiku-4.5"]
    for i in range(count):
        db.append_request(RequestRow(
            ts=base_ts + i * 2,
            source_ts=base_ts + i * 2,
            session_id=f"s-{i % 30}",
            model=models[i % len(models)],
            input_tokens=500 + (i % 100) * 50,
            output_tokens=100 + (i % 50) * 20,
            duration_ms=200 + (i % 200) * 10,
            finish_reason="stop" if i % 3 else "tool_use",
        ))


def _seed_many_tool_invocations(db: HistoryDB, base_ts: float, count: int = 5000):
    """Insert many tool invocations."""
    tools = ["Read", "Edit", "Bash", "Glob", "Grep", "Write", "Agent"]
    for i in range(count):
        db.append_tool_invocation(ToolInvocationRow(
            ts=base_ts + i * 0.3,
            source_ts=base_ts + i * 0.3,
            session_id=f"s-{i % 30}",
            tool_name=tools[i % len(tools)],
            duration_ms=10 + (i % 100) * 5,
            is_error=1 if i % 50 == 0 else 0,
        ))


class TestAnalyticsCache:
    """Test the background analytics cache serves results without blocking."""

    def test_cache_recomputes_and_serves(self, db: HistoryDB):
        from aictl.dashboard.web_server import _AnalyticsCache
        from unittest.mock import MagicMock
        base = time.time()
        _seed_requests(db, base)
        _seed_tool_invocations(db, base)

        cache = _AnalyticsCache()
        store = MagicMock()
        store._db = db
        cache._store = store
        cache._requested_range = (base - 1, base + 100)

        # Directly call _recompute (simulating background thread)
        cache._recompute()

        # get() should return pre-computed result instantly
        result = cache.get(base - 1, base + 100)
        assert "response_time" in result
        assert "tools" in result
        assert "files" in result
        assert len(result["response_time"]["requests"]) > 0
        assert len(result["tools"]["invocations"]) > 0

    def test_cache_get_never_blocks_on_sql(self, db: HistoryDB):
        """Verify get() returns in <1ms even with no pre-computed data."""
        from aictl.dashboard.web_server import _AnalyticsCache
        cache = _AnalyticsCache()

        start = time.monotonic()
        result = cache.get(0, time.time())
        elapsed = time.monotonic() - start

        assert elapsed < 0.001, f"get() took {elapsed*1000:.1f}ms (must be <1ms)"
        assert isinstance(result, dict)


class TestAnalyticsPerformance:
    """Ensure analytics queries complete within acceptable time bounds.

    These tests insert realistic data volumes and verify the endpoint
    logic finishes fast — preventing regressions where slow queries
    block server threads and cause the dashboard to hang.
    """

    def test_response_time_under_2s_with_3k_requests(self, db: HistoryDB):
        base = time.time()
        _seed_many_requests(db, base, count=3000)

        start = time.monotonic()
        rows = db.query_requests_analytics(since=base - 1, until=base + 10000, limit=2000)
        elapsed = time.monotonic() - start

        assert len(rows) > 0
        assert elapsed < 2.0, f"query_requests_analytics took {elapsed:.2f}s (limit 2s)"

    def test_tool_agg_under_1s_with_5k_invocations(self, db: HistoryDB):
        base = time.time()
        _seed_many_tool_invocations(db, base, count=5000)

        start = time.monotonic()
        agg = db.query_tool_invocations_agg(since=base - 1, until=base + 5000)
        elapsed = time.monotonic() - start

        assert len(agg) > 0
        assert elapsed < 1.0, f"query_tool_invocations_agg took {elapsed:.2f}s (limit 1s)"

    def test_file_events_under_2s_with_10k_events(self, db: HistoryDB):
        """The critical test: file_modified events used json_extract N+1
        queries that caused thread exhaustion. The single-scan approach
        must stay fast even with 10k events."""
        base = time.time()
        _seed_many_events(db, base, count=10000)

        conn = db._conn()
        start = time.monotonic()

        # Replicate the single-scan approach from _analytics_files_from_events
        rows = conn.execute(
            "SELECT ts, json_extract(detail, '$.path'),"
            " CAST(json_extract(detail, '$.growth_bytes') AS INTEGER)"
            " FROM events WHERE kind = 'file_modified' AND ts >= ? AND ts <= ?"
            " ORDER BY ts LIMIT 5000",
            (base - 1, base + 10000),
        ).fetchall()
        elapsed = time.monotonic() - start

        assert len(rows) == 5000  # hit the LIMIT
        assert elapsed < 2.0, f"file events single-scan took {elapsed:.2f}s (limit 2s)"

    def test_full_analytics_under_3s(self, db: HistoryDB):
        """End-to-end: seed all data, run all three analytics sections."""
        base = time.time()
        _seed_many_requests(db, base, count=2000)
        _seed_many_tool_invocations(db, base, count=3000)
        _seed_many_events(db, base, count=5000)

        start = time.monotonic()

        # Response time section
        rows = db.query_requests_analytics(since=base - 1, until=base + 10000, limit=2000)
        assert len(rows) > 0

        # Tools section
        agg = db.query_tool_invocations_agg(since=base - 1, until=base + 10000)
        assert len(agg) > 0
        for row in agg[:30]:
            db.query_tool_invocations_durations(
                row["tool_name"], since=base - 1, until=base + 10000, limit=500)

        # Files section (single-scan)
        conn = db._conn()
        conn.execute(
            "SELECT ts, json_extract(detail, '$.path'),"
            " CAST(json_extract(detail, '$.growth_bytes') AS INTEGER)"
            " FROM events WHERE kind = 'file_modified' AND ts >= ? AND ts <= ?"
            " ORDER BY ts LIMIT 5000",
            (base - 1, base + 10000),
        ).fetchall()

        elapsed = time.monotonic() - start
        assert elapsed < 3.0, f"full analytics took {elapsed:.2f}s (limit 3s)"
