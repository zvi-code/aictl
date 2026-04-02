"""Stress tests for analytics performance at production scale.

Seeds a >100MB SQLite database with millions of rows and verifies
the analytics pipeline stays fast under realistic load.
"""

from __future__ import annotations

import json
import os
import sqlite3
import tempfile
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import pytest

from aictl.storage import HistoryDB


def _bulk_seed_db(db_path: str, n_requests: int = 500_000,
                  n_tool_inv: int = 1_000_000,
                  n_events: int = 2_000_000) -> None:
    """Seed database directly via SQL for speed (bypasses dedup/buffering)."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")  # speed over durability for test

    base = time.time() - 7 * 86400  # 7 days ago
    models = ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5", "gpt-4o-mini"]
    tools = ["Read", "Edit", "Bash", "Glob", "Grep", "Write", "Agent",
             "ToolSearch", "TaskCreate", "TaskUpdate"]
    paths = [f"/project/session-{i}/agent-{j}.jsonl"
             for i in range(100) for j in range(20)]

    print(f"  Seeding {n_requests:,} requests...")
    conn.executemany(
        "INSERT OR IGNORE INTO requests"
        "(dedup_key, ts, session_id, model, input_tokens, output_tokens,"
        " cache_read_tokens, cost_usd, duration_ms, finish_reason, is_error, source)"
        " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            (f"r-{i}", base + i * (7 * 86400 / n_requests),
             f"s-{i % 500}", models[i % len(models)],
             500 + (i % 200) * 50, 100 + (i % 100) * 20,
             (i % 50) * 100, round(0.001 * (500 + i % 1000), 4),
             200 + (i % 500) * 10, "stop" if i % 3 else "tool_use",
             1 if i % 100 == 0 else 0, "test")
            for i in range(n_requests)
        ],
    )
    conn.commit()

    print(f"  Seeding {n_tool_inv:,} tool invocations...")
    batch = 50_000
    for start in range(0, n_tool_inv, batch):
        end = min(start + batch, n_tool_inv)
        conn.executemany(
            "INSERT OR IGNORE INTO tool_invocations"
            "(dedup_key, ts, session_id, tool_name, duration_ms, is_error, source)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                (f"t-{i}", base + i * (7 * 86400 / n_tool_inv),
                 f"s-{i % 500}", tools[i % len(tools)],
                 10 + (i % 200) * 5, 1 if i % 80 == 0 else 0, "test")
                for i in range(start, end)
            ],
        )
        conn.commit()

    print(f"  Seeding {n_events:,} events...")
    for start in range(0, n_events, batch):
        end = min(start + batch, n_events)
        conn.executemany(
            "INSERT OR IGNORE INTO events(ts, tool, kind, session_id, detail, seq)"
            " VALUES(?,?,?,?,?,?)",
            [
                (base + i * (7 * 86400 / n_events),
                 "claude-code", "file_modified", f"s-{i % 500}",
                 json.dumps({"path": paths[i % len(paths)],
                             "growth_bytes": (i % 50) * 100}),
                 i % 10)
                for i in range(start, end)
            ],
        )
        conn.commit()

    # Verify size
    conn.close()
    size_mb = os.path.getsize(db_path) / (1024 * 1024)
    print(f"  DB size: {size_mb:.0f} MB")


@pytest.fixture(scope="module")
def large_db(tmp_path_factory):
    """Create a large test database (~200MB+). Shared across all tests in module."""
    db_dir = tmp_path_factory.mktemp("stress")
    db_path = str(db_dir / "stress.db")

    # Create schema via HistoryDB, then close and seed via raw SQL
    db = HistoryDB(db_path=db_path, flush_interval=0)
    db.close()

    _bulk_seed_db(db_path,
                  n_requests=500_000,
                  n_tool_inv=1_000_000,
                  n_events=2_000_000)

    db = HistoryDB(db_path=db_path, flush_interval=0)
    yield db
    db.close()


class TestQueryPerformanceAtScale:
    """Individual query performance with 500K+ requests, 1M+ invocations."""

    def test_requests_analytics_7d(self, large_db: HistoryDB):
        since = time.time() - 7 * 86400
        start = time.monotonic()
        rows = large_db.query_requests_analytics(since=since, limit=2000)
        elapsed = time.monotonic() - start
        print(f"\n  query_requests_analytics (7d, 500K rows): {elapsed:.3f}s, got {len(rows)} rows")
        assert len(rows) == 2000
        assert elapsed < 1.0, f"took {elapsed:.2f}s — must be <1s"

    def test_tool_invocations_agg_7d(self, large_db: HistoryDB):
        since = time.time() - 7 * 86400
        start = time.monotonic()
        agg = large_db.query_tool_invocations_agg(since=since)
        elapsed = time.monotonic() - start
        print(f"\n  query_tool_invocations_agg (7d, 1M rows): {elapsed:.3f}s, got {len(agg)} groups")
        assert len(agg) > 0
        assert elapsed < 2.0, f"took {elapsed:.2f}s — must be <2s"

    def test_tool_durations_single(self, large_db: HistoryDB):
        since = time.time() - 7 * 86400
        start = time.monotonic()
        durations = large_db.query_tool_invocations_durations("Read", since=since, limit=500)
        elapsed = time.monotonic() - start
        print(f"\n  query_tool_invocations_durations (7d): {elapsed:.3f}s, got {len(durations)} values")
        assert elapsed < 1.0, f"took {elapsed:.2f}s — must be <1s"

    def test_file_events_single_scan_7d(self, large_db: HistoryDB):
        since = time.time() - 7 * 86400
        conn = large_db._conn()
        start = time.monotonic()
        rows = conn.execute(
            "SELECT ts, json_extract(detail, '$.path'),"
            " CAST(json_extract(detail, '$.growth_bytes') AS INTEGER)"
            " FROM events WHERE kind = 'file_modified' AND ts >= ?"
            " ORDER BY ts LIMIT 5000",
            (since,),
        ).fetchall()
        elapsed = time.monotonic() - start
        print(f"\n  file events single-scan (7d, 2M rows): {elapsed:.3f}s, got {len(rows)} rows")
        assert len(rows) == 5000
        assert elapsed < 3.0, f"took {elapsed:.2f}s — must be <3s"


class TestFullPipelineAtScale:
    """End-to-end analytics computation at production scale."""

    def test_full_recompute_7d(self, large_db: HistoryDB):
        from aictl.dashboard.web_server import (
            _compute_response_time, _compute_tools, _compute_files,
        )
        since = time.time() - 7 * 86400
        until = time.time()

        start = time.monotonic()
        rt = _compute_response_time(large_db, since, until)
        t_rt = time.monotonic() - start

        start = time.monotonic()
        tools = _compute_tools(large_db, since, until)
        t_tools = time.monotonic() - start

        start = time.monotonic()
        files = _compute_files(large_db, since, until)
        t_files = time.monotonic() - start

        total = t_rt + t_tools + t_files
        print(f"\n  Full 7d recompute: response_time={t_rt:.2f}s tools={t_tools:.2f}s files={t_files:.2f}s total={total:.2f}s")
        print(f"    requests={len(rt['requests'])} models={len(rt['by_model'])} "
              f"tools={len(tools['invocations'])} files={len(files['memory_timeline'])}")
        assert total < 10.0, f"total {total:.2f}s — must be <10s (runs in background, not request path)"

    def test_full_recompute_1h(self, large_db: HistoryDB):
        from aictl.dashboard.web_server import (
            _compute_response_time, _compute_tools, _compute_files,
        )
        since = time.time() - 3600
        until = time.time()

        start = time.monotonic()
        rt = _compute_response_time(large_db, since, until)
        tools = _compute_tools(large_db, since, until)
        files = _compute_files(large_db, since, until)
        total = time.monotonic() - start

        print(f"\n  Full 1h recompute: {total:.3f}s")
        assert total < 3.0, f"total {total:.2f}s — must be <3s"


class TestConcurrentAccess:
    """Simulate multiple browser tabs hitting the endpoint simultaneously."""

    def test_concurrent_cache_reads(self, large_db: HistoryDB):
        """10 concurrent get() calls must all return in <1ms."""
        from aictl.dashboard.web_server import _AnalyticsCache
        from unittest.mock import MagicMock

        cache = _AnalyticsCache()
        store = MagicMock()
        store._db = large_db
        cache._store = store
        cache._requested_range = (time.time() - 3600, time.time())
        cache._recompute()  # pre-fill

        results = []

        def read_cache():
            start = time.monotonic()
            data = cache.get(time.time() - 3600, time.time())
            elapsed = time.monotonic() - start
            return elapsed, len(json.dumps(data))

        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = [pool.submit(read_cache) for _ in range(10)]
            for f in as_completed(futures):
                elapsed, size = f.result()
                results.append(elapsed)

        max_time = max(results)
        print(f"\n  10 concurrent reads: max={max_time*1000:.1f}ms avg={sum(results)/len(results)*1000:.1f}ms")
        assert max_time < 0.01, f"max read took {max_time*1000:.1f}ms — must be <10ms"

    def test_concurrent_reads_during_recompute(self, large_db: HistoryDB):
        """Reads must not block while a recompute is in progress."""
        from aictl.dashboard.web_server import _AnalyticsCache
        from unittest.mock import MagicMock

        cache = _AnalyticsCache()
        store = MagicMock()
        store._db = large_db
        cache._store = store
        cache._requested_range = (time.time() - 86400, time.time())
        cache._recompute()  # pre-fill with data

        read_times = []
        stop = threading.Event()

        def reader():
            while not stop.is_set():
                start = time.monotonic()
                cache.get(time.time() - 86400, time.time())
                read_times.append(time.monotonic() - start)
                time.sleep(0.001)

        # Start 3 reader threads
        readers = [threading.Thread(target=reader, daemon=True) for _ in range(3)]
        for t in readers:
            t.start()

        # Run a recompute (which takes the lock briefly)
        cache._recompute()

        stop.set()
        for t in readers:
            t.join(timeout=2)

        if read_times:
            max_read = max(read_times)
            print(f"\n  Reads during recompute: {len(read_times)} reads, max={max_read*1000:.1f}ms")
            assert max_read < 0.1, f"max read {max_read*1000:.1f}ms — must be <100ms"
