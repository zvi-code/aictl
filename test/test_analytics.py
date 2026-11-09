"""Tests for the analytics computation and supporting storage methods."""

from __future__ import annotations

import re
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
        RequestRow(
            ts=base_ts,
            session_id="s-a",
            model="opus-4",
            input_tokens=500,
            output_tokens=200,
            duration_ms=1000,
            finish_reason="stop",
        ),
        RequestRow(
            ts=base_ts + 10,
            session_id="s-a",
            model="opus-4",
            input_tokens=1500,
            output_tokens=400,
            duration_ms=2000,
            finish_reason="tool_use",
        ),
        RequestRow(
            ts=base_ts + 20,
            session_id="s-a",
            model="sonnet-4",
            input_tokens=800,
            output_tokens=300,
            duration_ms=500,
            finish_reason="stop",
        ),
        RequestRow(
            ts=base_ts + 30,
            session_id="s-a",
            model="opus-4",
            input_tokens=3000,
            output_tokens=600,
            duration_ms=4000,
            finish_reason="stop",
        ),
        # Session B — 2 requests
        RequestRow(
            ts=base_ts + 5,
            session_id="s-b",
            model="sonnet-4",
            input_tokens=200,
            output_tokens=100,
            duration_ms=300,
            finish_reason="stop",
        ),
        RequestRow(
            ts=base_ts + 15,
            session_id="s-b",
            model="sonnet-4",
            input_tokens=600,
            output_tokens=250,
            duration_ms=700,
            finish_reason="stop",
            is_error=1,
        ),
    ]
    for r in reqs:
        db.append_request(r)


def _seed_tool_invocations(db: HistoryDB, base_ts: float):
    """Insert tool invocations for testing."""
    invocations = [
        ToolInvocationRow(ts=base_ts, source_ts=base_ts, session_id="s-a", tool_name="Read", duration_ms=50),
        ToolInvocationRow(ts=base_ts + 5, source_ts=base_ts + 5, session_id="s-a", tool_name="Read", duration_ms=30),
        ToolInvocationRow(ts=base_ts + 10, source_ts=base_ts + 10, session_id="s-a", tool_name="Edit", duration_ms=200),
        ToolInvocationRow(
            ts=base_ts + 15, source_ts=base_ts + 15, session_id="s-a", tool_name="Bash", duration_ms=5000, is_error=1
        ),
        ToolInvocationRow(ts=base_ts + 20, source_ts=base_ts + 20, session_id="s-a", tool_name="Read", duration_ms=80),
    ]
    for inv in invocations:
        db.append_tool_invocation(inv)


def _seed_memory_files(db: HistoryDB, base_ts: float):
    """Insert memory files with history."""
    # Create the file entries
    db.upsert_file(
        "/mem/user.md", tool="claude-code", category="memory", content="# User\nrole: engineer", mtime=base_ts
    )
    db.upsert_file(
        "/mem/feedback.md",
        tool="claude-code",
        category="memory",
        content="# Feedback\nkeep it short",
        mtime=base_ts + 10,
    )
    # Simulate growth by upserting with different content
    db.upsert_file(
        "/mem/user.md",
        tool="claude-code",
        category="memory",
        content="# User\nrole: engineer\nprefers: terse responses",
        mtime=base_ts + 20,
    )


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
        db.append_event(
            EventRow(
                ts=base_ts + i * 0.5,
                tool="claude-code",
                kind="file_modified",
                detail={"path": paths[i], "growth_bytes": (i % 50) * 100},
                session_id=f"s-{i % 20}",
            )
        )


def _seed_many_requests(db: HistoryDB, base_ts: float, count: int = 3000):
    """Insert many requests to simulate a 7-day load."""
    models = ["opus-4", "sonnet-4", "haiku-4.5"]
    for i in range(count):
        db.append_request(
            RequestRow(
                ts=base_ts + i * 2,
                source_ts=base_ts + i * 2,
                session_id=f"s-{i % 30}",
                model=models[i % len(models)],
                input_tokens=500 + (i % 100) * 50,
                output_tokens=100 + (i % 50) * 20,
                duration_ms=200 + (i % 200) * 10,
                finish_reason="stop" if i % 3 else "tool_use",
            )
        )


def _seed_many_tool_invocations(db: HistoryDB, base_ts: float, count: int = 5000):
    """Insert many tool invocations."""
    tools = ["Read", "Edit", "Bash", "Glob", "Grep", "Write", "Agent"]
    for i in range(count):
        db.append_tool_invocation(
            ToolInvocationRow(
                ts=base_ts + i * 0.3,
                source_ts=base_ts + i * 0.3,
                session_id=f"s-{i % 30}",
                tool_name=tools[i % len(tools)],
                duration_ms=10 + (i % 100) * 5,
                is_error=1 if i % 50 == 0 else 0,
            )
        )


class TestAnalyticsCache:
    """Test the background analytics cache serves results without blocking."""

    def test_cache_recomputes_and_serves(self, db: HistoryDB):
        from unittest.mock import MagicMock

        from aictl.dashboard.analytics import _AnalyticsCache

        base = time.time()
        _seed_requests(db, base)
        _seed_tool_invocations(db, base)

        cache = _AnalyticsCache()
        store = MagicMock()
        store._db = db
        cache._store = store
        cache.request_range(base - 1, base + 100)

        # Directly call _recompute (simulating background thread)
        cache._recompute()

        # get() should return pre-computed result instantly
        result = cache.get(base - 1, base + 100)
        assert "response_time" in result
        assert "tools" in result
        assert "files" in result
        assert len(result["response_time"]["requests"]) > 0
        assert len(result["tools"]["invocations"]) > 0

    def test_cache_get_never_runs_sql(self, monkeypatch):
        """get() answers from memory: with nothing computed it says pending, and
        neither the store nor the compute path is touched."""
        from aictl.dashboard import analytics
        from aictl.dashboard.analytics import _AnalyticsCache

        class _NoStore:
            def __getattr__(self, name):
                raise AssertionError(f"get() touched the store: {name}")

        def no_compute(*_a, **_k):
            raise AssertionError("get() ran the analytics queries")

        monkeypatch.setattr(analytics, "compute_analytics", no_compute)
        cache = _AnalyticsCache()
        cache._store = _NoStore()

        result = cache.get(0, None)
        assert result["pending"] is True
        assert "response_time" not in result

    def test_cache_get_serves_a_computed_key_without_recomputing(self, db: HistoryDB, monkeypatch):
        """Ten readers on ten threads get the stored result; none of them computes."""
        from concurrent.futures import ThreadPoolExecutor
        from unittest.mock import MagicMock

        from aictl.dashboard import analytics
        from aictl.dashboard.analytics import _AnalyticsCache

        base = time.time()
        _seed_requests(db, base)
        cache = _AnalyticsCache()
        store = MagicMock()
        store._db = db
        cache._store = store
        cache.request_range(base - 1, base + 100)
        cache._recompute()

        def no_compute(*_a, **_k):
            raise AssertionError("get() ran the analytics queries")

        monkeypatch.setattr(analytics, "compute_analytics", no_compute)
        with ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(lambda _i: cache.get(base - 1, base + 100), range(10)))
        assert all(r["pending"] is False for r in results)
        assert len({len(r["response_time"]["requests"]) for r in results}) == 1
        assert len(results[0]["response_time"]["requests"]) > 0

    def test_recompute_does_not_hold_the_lock_that_get_takes(self, db: HistoryDB, monkeypatch):
        """A recompute runs its queries outside the cache lock, so a read during a
        long recompute gets the previous result instead of waiting for it."""
        from unittest.mock import MagicMock

        from aictl.dashboard import analytics
        from aictl.dashboard.analytics import _AnalyticsCache

        base = time.time()
        _seed_requests(db, base)
        cache = _AnalyticsCache()
        store = MagicMock()
        store._db = db
        cache._store = store
        cache.request_range(base - 1, base + 100)
        cache._recompute()  # the previous result

        real = analytics.compute_analytics
        seen: list[tuple[bool, bool]] = []

        def compute_and_read(*args, **kwargs):
            held = cache._lock.locked()
            # Lock is not re-entrant: reading only when it is free cannot deadlock.
            served = not held and cache.get(base - 1, base + 100)["pending"] is False
            seen.append((held, served))
            return real(*args, **kwargs)

        monkeypatch.setattr(analytics, "compute_analytics", compute_and_read)
        cache._recompute()
        assert seen == [(False, True)]

    def test_health_surfaces_recompute_failures(self, db: HistoryDB):
        """A failing background recompute must become an observable signal
        in get()['_health'], not a silently-swallowed log line."""
        from unittest.mock import MagicMock

        from aictl.dashboard.analytics import _AnalyticsCache

        cache = _AnalyticsCache()
        store = MagicMock()
        store._db = db
        cache._store = store
        cache.request_range(0, None)

        # Healthy after a successful compute.
        cache._recompute()
        cache._mark_success()
        assert cache.get(0, None)["_health"]["ok"] is True

        # Simulate the loop catching a recompute error.
        try:
            raise RuntimeError("db exploded")
        except RuntimeError as exc:
            cache._mark_error(exc)

        health = cache.get(0, None)["_health"]
        assert health["ok"] is False
        assert health["consecutive_errors"] == 1
        assert "db exploded" in health["last_error"]

        # Recovery clears the signal.
        cache._mark_success()
        assert cache.get(0, None)["_health"]["ok"] is True

    def test_recompute_failure_recorded_to_data_quality(self, db: HistoryDB):
        """The analytics-thread failure must reach the data-quality table
        (read by the board's machine view), not just get()['_health']."""
        from unittest.mock import MagicMock

        from aictl.dashboard.analytics import _AnalyticsCache

        cache = _AnalyticsCache()
        store = MagicMock()
        store._db = db
        cache._store = store

        try:
            raise RuntimeError("boom")
        except RuntimeError as exc:
            cache._mark_error(exc)

        rows = db.query_data_quality(component="dashboard:analytics-cache")
        assert len(rows) == 1
        assert rows[0]["status"] == "failed"
        assert rows[0]["severity"] == "warning"

        # Severity escalates once failures persist.
        for _ in range(3):
            try:
                raise RuntimeError("boom")
            except RuntimeError as exc:
                cache._mark_error(exc)
        rows = db.query_data_quality(component="dashboard:analytics-cache")
        assert rows[0]["severity"] == "error"

        # Recovery records an ok signal.
        cache._mark_success()
        rows = db.query_data_quality(component="dashboard:analytics-cache")
        assert rows[0]["status"] == "ok"


class TestAnalyticsQueryShape:
    """The analytics queries stay cheap as the history grows.

    Wall-clock budgets fail on a loaded machine, so these check the causes of a
    slow page instead: a query per row (the json_extract N+1 that once exhausted
    the server threads) and a windowed query that reads the whole table.
    """

    @staticmethod
    def _statements(db: HistoryDB, run) -> list[str]:
        conn = db._conn()
        seen: list[str] = []
        conn.set_trace_callback(seen.append)
        try:
            run()
        finally:
            conn.set_trace_callback(None)
        return seen

    def _seeded(self, count: int) -> HistoryDB:
        d = HistoryDB(db_path=":memory:", flush_interval=0)
        base = 1_700_000_000.0
        _seed_many_requests(d, base, count=count)
        _seed_many_tool_invocations(d, base, count=count)
        _seed_many_events(d, base, count=count)
        return d

    def test_statement_count_does_not_grow_with_the_rows(self):
        """The same statements run for 70 rows and for 700: no query per row."""
        from aictl.dashboard.analytics import compute_analytics

        counts = []
        for count in (70, 700):
            d = self._seeded(count)
            try:
                stmts = self._statements(d, lambda d=d: compute_analytics(d, 1_699_999_999.0, 1_700_010_000.0, None))
            finally:
                d.close()
            counts.append(len(stmts))
        assert counts[0] == counts[1], counts

    @pytest.mark.parametrize(
        "call",
        [
            pytest.param(lambda d: d.query_requests_analytics(since=1.0, until=2.0, limit=2000), id="requests"),
            pytest.param(
                lambda d: d.query_requests_analytics(since=1.0, until=2.0, limit=2000, tools=("claude-code",)),
                id="requests-by-tool",
            ),
            pytest.param(lambda d: d.query_tool_invocations_agg(since=1.0, until=2.0), id="tool-agg"),
            pytest.param(
                lambda d: d.query_tool_invocations_durations("Read", since=1.0, until=2.0, limit=500),
                id="tool-durations",
            ),
            pytest.param(lambda d: d.query_file_modified_events(since=1.0, until=2.0), id="file-events"),
        ],
    )
    def test_windowed_queries_search_an_index(self, db: HistoryDB, call):
        """Every analytics query over a time window reads through an index, never a full table scan."""
        stmts = [s for s in self._statements(db, lambda: call(db)) if s.lstrip().upper().startswith(("SELECT", "WITH"))]
        assert stmts
        conn = db._conn()
        for sql in stmts:
            plan = [row[3] for row in conn.execute("EXPLAIN QUERY PLAN " + sql)]
            scans = [step for step in plan if re.match(r"SCAN \w+$", step)]
            assert not scans, (sql, plan)
            assert any("USING INDEX" in step or "USING COVERING INDEX" in step for step in plan), (sql, plan)
