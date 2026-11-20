"""Tests for the analytics computation and supporting storage methods."""

from __future__ import annotations

import time

import pytest

from aictl.dashboard.analytics import _compute_files, _compute_response_time, _compute_tools
from aictl.stores import Store
from aictl.stores.testing import FixtureReader


@pytest.fixture()
def db():
    return Store(reader=FixtureReader({
        "analytics.requests": [
            dict(row_type="model", model="opus", count=3, avg_ms=100, p50_ms=100, p95_ms=150,
                 input_tokens=30, output_tokens=15),
            dict(row_type="request", ts=30, session_id="a", duration_ms=150),
            dict(row_type="request", ts=20, session_id="b", duration_ms=100),
            dict(row_type="request", ts=10, session_id="a", duration_ms=50),
        ],
        "analytics.tools": [
            dict(row_type="tool", tool_name="Bash", count=3, avg_ms=40, p95_ms=50, error_count=1),
            dict(row_type="cli", tool_name="Bash", cli_tool="claude-code", count=3),
        ],
        "analytics.memory": [
            dict(row_type="inventory", count=2),
            dict(row_type="revision", path="/mem/user.md", ts=10, size_bytes=20, tokens=5),
            dict(row_type="revision", path="/mem/user.md", ts=20, size_bytes=44, tokens=11),
            dict(row_type="revision", path="/mem/feedback.md", ts=15, size_bytes=40, tokens=10),
        ],
    }))


def test_response_time_numbers_and_sequence(db):
    payload = _compute_response_time(db, 0, 100, limit=3)
    assert [(r["session_id"], r["seq"]) for r in payload["requests"]] == [("a", 1), ("b", 1), ("a", 2)]
    assert payload["by_model"] == [dict(model="opus", count=3, avg_ms=100, p50_ms=100, p95_ms=150, total_tokens=45)]
    assert db.reader.calls[0][1]["page_size"] == 3


def test_tool_aggregates_include_error_and_cli_counts(db):
    payload = _compute_tools(db, 0, 100)
    row, = payload["invocations"]
    assert row == dict(tool_name="Bash", count=3, avg_ms=40, p95_ms=50, error_count=1,
                       by_cli=[dict(cli_tool="claude-code", count=3)])


def test_memory_timeline_has_data(db):
    payload = _compute_files(db, 0, 100)
    assert set(payload["memory_timeline"]) == {"/mem/user.md", "/mem/feedback.md"}
    assert payload["memory_timeline"]["/mem/user.md"] == dict(ts=[10, 20], size_bytes=[20, 44], tokens=[5, 11])
    assert payload["memory_events"][0]["delta"] == 24


def test_native_analytics_views_preserve_attribution_and_bounded_pages(kusto_store):
    from aictl.dashboard.projections.history import HistoryScope

    seed = kusto_store.insert
    seed("sessions", session_id="s", tool="claude-code", started_at=100, ended_at=140, input_tokens=40)
    for i, duration in enumerate((0, 100, 200, 300)):
        seed("requests", session_id="s", ts=110 + i, duration_ms=duration, model="m", input_tokens=10)
    seed("requests", session_id="unknown", tool="any", ts=119, duration_ms=1000, model="m")
    response = _compute_response_time(kusto_store, 100, 150, limit=1, tools=("claude-code",))
    assert response["by_model"] == [dict(model="m", count=4, avg_ms=150, p50_ms=200, p95_ms=300, total_tokens=40)]
    assert response["unattributed_hidden"] == 1
    assert [r["ts"] for r in response["requests"]] == [113]

    seed("events", session_id="s", ts=120, kind="hook:PreToolUse",
         detail='{"tool_use_id": "read-1", "tool_name": "Read"}')
    seed("events", session_id="s", ts=121, kind="hook:PostToolUse", detail='{"tool_use_id": "read-1"}')
    seed("tool_invocations", session_id="s", ts=125, tool="claude-code", tool_name="Bash", duration_ms=23)
    tools = _compute_tools(kusto_store, 100, 150, tools=("claude-code",))
    assert [(r["tool_name"], r["count"], r["avg_ms"]) for r in tools["invocations"]] == [("Read", 1, 1000)]

    seed("files", path="/mem/user.md", tool="claude-code", category="memory", last_changed=120)
    seed("file_history", path="/mem/user.md", ts=120, size_bytes=100, tokens=25)
    memory = _compute_files(kusto_store, 100, 150, tools=("claude-code",))
    assert memory["memory_timeline"] == {"/mem/user.md": {"ts": [120], "size_bytes": [100], "tokens": [25]}}
    profile, = HistoryScope.local(kusto_store).read("analytics.profiles", since=100, until=150)
    assert (profile["session_id"], profile["input_tokens"]) == ("s", 40)


class TestAnalyticsCache:
    """Test the background analytics cache serves results without blocking."""

    def test_cache_recomputes_and_serves(self, db: Store):
        from aictl.dashboard.analytics import _AnalyticsCache

        base = time.time()

        cache = _AnalyticsCache()
        cache._store = db
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

    def test_cache_get_never_reads_history(self, monkeypatch):
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

    def test_cache_get_serves_a_computed_key_without_recomputing(self, db: Store, monkeypatch):
        """Ten readers on ten threads get the stored result; none of them computes."""
        from concurrent.futures import ThreadPoolExecutor
        from aictl.dashboard import analytics
        from aictl.dashboard.analytics import _AnalyticsCache

        base = time.time()
        cache = _AnalyticsCache()
        cache._store = db
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

    def test_recompute_does_not_hold_the_lock_that_get_takes(self, db: Store, monkeypatch):
        """A recompute runs its queries outside the cache lock, so a read during a
        long recompute gets the previous result instead of waiting for it."""
        from aictl.dashboard import analytics
        from aictl.dashboard.analytics import _AnalyticsCache

        base = time.time()
        cache = _AnalyticsCache()
        cache._store = db
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

    def test_health_surfaces_recompute_failures(self, db: Store):
        """A failing background recompute must become an observable signal
        in get()['_health'], not a silently-swallowed log line."""
        from aictl.dashboard.analytics import _AnalyticsCache

        cache = _AnalyticsCache()
        cache._store = db
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

    def test_recompute_failure_recorded_to_data_quality(self):
        """The analytics-thread failure must reach the data-quality table
        (read by the board's machine view), not just get()['_health']."""
        from types import SimpleNamespace

        from aictl.collection_status import CollectionStatus
        from aictl.dashboard.analytics import _AnalyticsCache
        from aictl.stores.testing import MemoryWriter

        writer = MemoryWriter()
        cache = _AnalyticsCache()
        cache._store = SimpleNamespace(collection_status=CollectionStatus(writer))

        def latest():
            action, table, batch = writer.operations[-1]
            assert (action, table) == ("upsert", "data_quality_status")
            [row] = batch
            assert (row["component"], row["source"]) == ("dashboard:analytics-cache", "")
            return row

        cache._mark_error(RuntimeError("boom"))
        assert len(writer.operations) == 1
        row = latest()
        assert (row["status"], row["severity"]) == ("failed", "warning")

        # Severity escalates once failures persist.
        for _ in range(3):
            cache._mark_error(RuntimeError("boom"))
        row = latest()
        assert (row["status"], row["severity"]) == ("failed", "error")

        # Recovery records an ok signal.
        cache._mark_success()
        assert latest()["status"] == "ok"
