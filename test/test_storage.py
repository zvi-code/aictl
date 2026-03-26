"""Tests for aictl.storage — SQLite persistence layer."""

from __future__ import annotations

import json
import time

import pytest

from aictl.storage import (
    EventRow, FileEntry, HistoryDB, MetricsRow,
    Sample, TelemetryRow, ToolMetricsRow,
)


@pytest.fixture()
def db():
    """In-memory DB with immediate flush (flush_interval=0)."""
    d = HistoryDB(db_path=":memory:", flush_interval=0)
    yield d
    d.close()


# ── Basic CRUD ─────────────────────────────────────────────────────

class TestMetrics:
    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_metrics(MetricsRow(ts=now, files=10, tokens=5000, cpu=12.3, mem_mb=512.5))
        db.append_metrics(MetricsRow(ts=now + 5, files=11, tokens=5100, cpu=15.0, mem_mb=520.0))
        result = db.query_metrics()
        assert len(result["ts"]) == 2
        assert result["files"] == [10, 11]
        assert result["tokens"] == [5000, 5100]

    def test_query_with_since(self, db: HistoryDB):
        now = time.time()
        db.append_metrics(MetricsRow(ts=now - 100, files=1))
        db.append_metrics(MetricsRow(ts=now, files=2))
        result = db.query_metrics(since=now - 50)
        assert len(result["ts"]) == 1
        assert result["files"] == [2]

    def test_query_empty(self, db: HistoryDB):
        result = db.query_metrics()
        assert result["ts"] == []
        assert result["files"] == []

    def test_upsert_on_duplicate_ts(self, db: HistoryDB):
        now = time.time()
        db.append_metrics(MetricsRow(ts=now, files=10))
        db.append_metrics(MetricsRow(ts=now, files=20))  # same ts
        result = db.query_metrics()
        assert len(result["ts"]) == 1
        assert result["files"] == [20]  # replaced


class TestToolMetrics:
    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_tool_metrics([
            ToolMetricsRow(ts=now, tool="claude-code", cpu=5.0, mem_mb=300),
            ToolMetricsRow(ts=now, tool="copilot-cli", cpu=2.0, mem_mb=100),
        ])
        result = db.query_tool_metrics()
        assert "claude-code" in result
        assert "copilot-cli" in result
        assert result["claude-code"]["cpu"] == [5.0]

    def test_query_by_tool(self, db: HistoryDB):
        now = time.time()
        db.append_tool_metrics([
            ToolMetricsRow(ts=now, tool="claude-code", cpu=5.0),
            ToolMetricsRow(ts=now, tool="copilot-cli", cpu=2.0),
        ])
        result = db.query_tool_metrics(tool="claude-code")
        assert "claude-code" in result
        assert "copilot-cli" not in result

    def test_query_with_since(self, db: HistoryDB):
        now = time.time()
        db.append_tool_metrics([
            ToolMetricsRow(ts=now - 100, tool="claude-code", cpu=1.0),
            ToolMetricsRow(ts=now, tool="claude-code", cpu=5.0),
        ])
        result = db.query_tool_metrics(since=now - 50)
        assert len(result["claude-code"]["ts"]) == 1


class TestEvents:
    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_event(EventRow(
            ts=now, tool="claude-code", kind="session_start",
            detail={"pid": 123, "model": "claude-opus-4-6"},
        ))
        events = db.query_events()
        assert len(events) == 1
        assert events[0].tool == "claude-code"
        assert events[0].kind == "session_start"
        assert events[0].detail["pid"] == 123

    def test_query_by_tool(self, db: HistoryDB):
        now = time.time()
        db.append_events([
            EventRow(ts=now, tool="claude-code", kind="session_start"),
            EventRow(ts=now, tool="copilot-cli", kind="session_start"),
        ])
        events = db.query_events(tool="claude-code")
        assert len(events) == 1

    def test_query_by_kind(self, db: HistoryDB):
        now = time.time()
        db.append_events([
            EventRow(ts=now, tool="claude-code", kind="session_start"),
            EventRow(ts=now + 1, tool="claude-code", kind="config_change"),
        ])
        events = db.query_events(kind="config_change")
        assert len(events) == 1
        assert events[0].kind == "config_change"

    def test_batch_append(self, db: HistoryDB):
        now = time.time()
        db.append_events([
            EventRow(ts=now + i, tool="claude-code", kind=f"event_{i}")
            for i in range(10)
        ])
        events = db.query_events()
        assert len(events) == 10


# ── Stats ──────────────────────────────────────────────────────────

class TestStats:
    def test_stats_empty(self, db: HistoryDB):
        s = db.stats()
        assert s["metrics_count"] == 0
        assert s["tool_metrics_count"] == 0
        assert s["events_count"] == 0

    def test_stats_with_data(self, db: HistoryDB):
        now = time.time()
        for i in range(5):
            db.append_metrics(MetricsRow(ts=now + i, files=i))
        db.append_event(EventRow(ts=now, tool="x", kind="y"))
        s = db.stats()
        assert s["metrics_count"] == 5
        assert s["events_count"] == 1
        assert s["earliest_ts"] is not None


# ── Compaction ─────────────────────────────────────────────────────

class TestCompaction:
    def test_delete_old(self, db: HistoryDB):
        old_ts = time.time() - (31 * 86400)  # 31 days ago
        db.append_metrics(MetricsRow(ts=old_ts, files=1))
        db.append_event(EventRow(ts=old_ts, tool="x", kind="y"))
        result = db.compact()
        assert result["metrics_deleted_30d"] == 1
        assert result["events_deleted_30d"] == 1
        assert db.query_metrics()["ts"] == []

    def test_downsample_preserves_recent(self, db: HistoryDB):
        now = time.time()
        # Add 10 recent rows (within last 24h)
        for i in range(10):
            db.append_metrics(MetricsRow(ts=now - i * 60, files=i))
        result = db.compact()
        # Recent data should be untouched
        data = db.query_metrics()
        assert len(data["ts"]) == 10

    def test_downsample_7d_range(self, db: HistoryDB):
        now = time.time()
        # Add 120 rows in the 2-day-ago range (within 24h-7d window)
        base = now - (2 * 86400)
        for i in range(120):
            db.append_metrics(MetricsRow(ts=base + i * 10, files=i % 10))
        result = db.compact()
        # Should be downsampled to ~minute buckets (120 rows @ 10s → ~20 buckets)
        data = db.query_metrics()
        assert len(data["ts"]) < 120
        assert len(data["ts"]) > 0


# ── File-based DB ──────────────────────────────────────────────────

class TestFileBased:
    def test_create_and_reopen(self, tmp_path):
        db_file = tmp_path / "test.db"
        db1 = HistoryDB(db_path=db_file, flush_interval=0)
        now = time.time()
        db1.append_metrics(MetricsRow(ts=now, files=42))
        db1.close()

        # Reopen
        db2 = HistoryDB(db_path=db_file, flush_interval=0)
        result = db2.query_metrics()
        assert result["files"] == [42]
        db2.close()

    def test_custom_path_via_string(self, tmp_path):
        db_file = str(tmp_path / "custom.db")
        db1 = HistoryDB(db_path=db_file, flush_interval=0)
        db1.append_metrics(MetricsRow(ts=time.time(), files=1))
        db1.close()
        assert (tmp_path / "custom.db").exists()

    def test_parent_dir_created(self, tmp_path):
        db_file = tmp_path / "sub" / "dir" / "test.db"
        db1 = HistoryDB(db_path=db_file, flush_interval=0)
        db1.append_metrics(MetricsRow(ts=time.time(), files=1))
        db1.close()
        assert db_file.exists()


# ── KV File Store ──────────────────────────────────────────────────

class TestTelemetry:
    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_telemetry(TelemetryRow(
            ts=now, tool="claude-code", source="stats-cache",
            confidence=0.95, input_tokens=1000, output_tokens=5000,
            cache_read_tokens=500, total_sessions=3, total_messages=42,
            model="claude-opus-4-6",
            by_model={"claude-opus-4-6": {"input": 1000, "output": 5000}},
        ))
        rows = db.query_telemetry(tool="claude-code")
        assert len(rows) == 1
        assert rows[0].source == "stats-cache"
        assert rows[0].input_tokens == 1000
        assert rows[0].by_model["claude-opus-4-6"]["output"] == 5000

    def test_batch_append(self, db: HistoryDB):
        now = time.time()
        db.append_telemetry_batch([
            TelemetryRow(ts=now, tool="claude-code", input_tokens=100),
            TelemetryRow(ts=now, tool="copilot-cli", input_tokens=200),
        ])
        rows = db.query_telemetry()
        assert len(rows) == 2

    def test_latest_telemetry(self, db: HistoryDB):
        now = time.time()
        db.append_telemetry(TelemetryRow(
            ts=now - 10, tool="claude-code", input_tokens=100))
        db.append_telemetry(TelemetryRow(
            ts=now, tool="claude-code", input_tokens=500))
        db.append_telemetry(TelemetryRow(
            ts=now, tool="copilot-cli", input_tokens=200))
        latest = db.latest_telemetry()
        assert "claude-code" in latest
        assert latest["claude-code"].input_tokens == 500
        assert "copilot-cli" in latest

    def test_query_with_time_range(self, db: HistoryDB):
        now = time.time()
        db.append_telemetry(TelemetryRow(ts=now - 100, tool="t", input_tokens=1))
        db.append_telemetry(TelemetryRow(ts=now, tool="t", input_tokens=2))
        rows = db.query_telemetry(since=now - 50)
        assert len(rows) == 1
        assert rows[0].input_tokens == 2


class TestMigration:
    def test_v1_to_v2_migration(self, tmp_path):
        """Simulate a v1 DB missing the tool_telemetry table and model column."""
        db_file = tmp_path / "migrate.db"
        # Create a bare v1 DB (without tool_telemetry table)
        import sqlite3
        conn = sqlite3.connect(str(db_file))
        conn.executescript("""
            CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
            INSERT INTO schema_version VALUES (1);
            CREATE TABLE metrics (ts REAL PRIMARY KEY, files INTEGER, tokens INTEGER,
                cpu REAL, mem_mb REAL, mcp INTEGER, mem_tokens INTEGER,
                live_sessions INTEGER DEFAULT 0, live_tokens INTEGER DEFAULT 0,
                live_in_rate REAL DEFAULT 0, live_out_rate REAL DEFAULT 0);
            CREATE TABLE tool_metrics (ts REAL, tool TEXT, cpu REAL, mem_mb REAL,
                tokens INTEGER, traffic REAL, PRIMARY KEY(ts, tool));
            CREATE TABLE events (ts REAL, tool TEXT, kind TEXT, detail TEXT,
                PRIMARY KEY(ts, tool, kind));
            CREATE TABLE file_store (path TEXT PRIMARY KEY, tool TEXT, category TEXT DEFAULT '',
                scope TEXT DEFAULT '', content TEXT DEFAULT '', content_hash TEXT DEFAULT '',
                size_bytes INTEGER DEFAULT 0, tokens INTEGER DEFAULT 0, lines INTEGER DEFAULT 0,
                mtime REAL DEFAULT 0, first_seen REAL DEFAULT 0, last_read REAL DEFAULT 0,
                last_changed REAL DEFAULT 0, meta TEXT DEFAULT '{}');
            CREATE TABLE file_history (path TEXT, ts REAL, content TEXT DEFAULT '',
                content_hash TEXT DEFAULT '', size_bytes INTEGER DEFAULT 0,
                tokens INTEGER DEFAULT 0, lines INTEGER DEFAULT 0, PRIMARY KEY(path, ts));
        """)
        # Insert v1 data
        conn.execute("INSERT INTO metrics VALUES (1000, 10, 500, 5.0, 256.0, 1, 100, 0, 0, 0, 0)")
        conn.execute("INSERT INTO tool_metrics VALUES (1000, 'claude-code', 5.0, 256.0, 500, 0)")
        conn.commit()
        conn.close()

        # Open with HistoryDB — should migrate to v2
        db = HistoryDB(db_path=db_file, flush_interval=0)

        # Old data should still be accessible
        result = db.query_metrics()
        assert result["files"] == [10]

        # tool_metrics should now have 'model' column
        tm = db.query_tool_metrics(tool="claude-code")
        assert "claude-code" in tm

        # tool_telemetry table should exist
        db.append_telemetry(TelemetryRow(
            ts=time.time(), tool="test", input_tokens=42))
        rows = db.query_telemetry(tool="test")
        assert len(rows) == 1

        # Schema version should be updated
        conn2 = sqlite3.connect(str(db_file))
        ver = conn2.execute("SELECT MAX(version) FROM schema_version").fetchone()[0]
        assert ver >= 3  # migrates all the way to latest
        conn2.close()
        db.close()


class TestFileStore:
    def test_upsert_new_file(self, db: HistoryDB):
        changed = db.upsert_file(
            path="/home/user/.claude/CLAUDE.md",
            tool="claude-code", category="instructions",
            content="# My instructions\nBe helpful.",
        )
        assert changed is True
        entry = db.get_file("/home/user/.claude/CLAUDE.md")
        assert entry is not None
        assert entry.tool == "claude-code"
        assert entry.category == "instructions"
        assert entry.content == "# My instructions\nBe helpful."
        assert entry.lines == 2
        assert entry.tokens > 0
        assert entry.content_hash != ""

    def test_upsert_unchanged_content(self, db: HistoryDB):
        content = "same content"
        db.upsert_file(path="/a.md", tool="t", content=content)
        changed = db.upsert_file(path="/a.md", tool="t", content=content)
        assert changed is False

    def test_upsert_changed_content(self, db: HistoryDB):
        db.upsert_file(path="/a.md", tool="t", content="v1")
        changed = db.upsert_file(path="/a.md", tool="t", content="v2")
        assert changed is True

    def test_metadata_only_update(self, db: HistoryDB):
        db.upsert_file(path="/a.md", tool="t", content="hello")
        db.upsert_file(path="/a.md", tool="t2", category="config")
        entry = db.get_file("/a.md")
        assert entry.tool == "t2"
        assert entry.category == "config"
        assert entry.content == "hello"  # content preserved

    def test_list_files(self, db: HistoryDB):
        db.upsert_file(path="/a.md", tool="claude-code", category="instructions", content="a")
        db.upsert_file(path="/b.md", tool="copilot-cli", category="config", content="b")
        db.upsert_file(path="/c.md", tool="claude-code", category="rules", content="c")

        all_files = db.list_files()
        assert len(all_files) == 3
        # Content should be empty in list (efficiency)
        assert all(f.content == "" for f in all_files)

        claude_files = db.list_files(tool="claude-code")
        assert len(claude_files) == 2

        config_files = db.list_files(category="config")
        assert len(config_files) == 1

    def test_file_history(self, db: HistoryDB):
        db.upsert_file(path="/a.md", tool="t", content="v1")
        time.sleep(0.01)
        db.upsert_file(path="/a.md", tool="t", content="v2")
        time.sleep(0.01)
        db.upsert_file(path="/a.md", tool="t", content="v3")

        history = db.file_history("/a.md")
        assert len(history) == 3
        # Most recent first
        assert history[0]["tokens"] > 0

    def test_file_content_at(self, db: HistoryDB):
        t1 = time.time()
        db.upsert_file(path="/a.md", tool="t", content="version-1")
        time.sleep(0.01)
        t2 = time.time()
        db.upsert_file(path="/a.md", tool="t", content="version-2")

        # Query at t1 should get v1
        content = db.file_content_at("/a.md", t1 + 0.001)
        assert content == "version-1"

        # Query at t2 should get v2
        content = db.file_content_at("/a.md", t2 + 0.001)
        assert content == "version-2"

    def test_remove_file(self, db: HistoryDB):
        db.upsert_file(path="/a.md", tool="t", content="x")
        assert db.remove_file("/a.md") is True
        assert db.get_file("/a.md") is None
        assert db.remove_file("/nonexistent") is False

    def test_sync_from_discovery(self, db: HistoryDB):
        discovered = [
            {"path": "/a.md", "tool": "claude-code", "category": "instructions",
             "scope": "project", "mtime": 1000.0, "content": "hello"},
            {"path": "/b.md", "tool": "copilot-cli", "category": "config",
             "scope": "global", "mtime": 2000.0, "content": "world"},
        ]
        result = db.sync_files_from_discovery(discovered)
        assert result["added"] == 2
        assert result["unchanged"] == 0

        # Sync again with same mtime → unchanged (lazy)
        result = db.sync_files_from_discovery(discovered)
        assert result["unchanged"] == 2
        assert result["updated"] == 0

        # Sync with one removed
        result = db.sync_files_from_discovery([discovered[0]])
        assert result["removed"] == 1

    def test_stats_include_files(self, db: HistoryDB):
        db.upsert_file(path="/a.md", tool="t", content="hello world")
        s = db.stats()
        assert s["file_store_count"] == 1
        assert s["files_tracked"] == 1
        assert s["files_total_bytes"] > 0
        assert s["files_total_tokens"] > 0


# ── CSV Spec Tables ────────────────────────────────────────────────

class TestSpecSync:
    def test_sync_specs_loads_from_registry(self, db: HistoryDB):
        result = db.sync_specs()
        # Should have loaded specs from the actual CSV files
        assert result["path_specs"] > 0
        assert result["process_specs"] > 0

    def test_query_path_specs_no_filter(self, db: HistoryDB):
        db.sync_specs()
        specs = db.query_path_specs()
        assert len(specs) > 0
        # Each row should be a dict with expected keys
        assert "path_template" in specs[0]
        assert "ai_tool" in specs[0]
        assert "vendor" in specs[0]
        assert "host" in specs[0]

    def test_query_path_specs_by_tool(self, db: HistoryDB):
        db.sync_specs()
        claude_specs = db.query_path_specs(tool="claude-code")
        all_specs = db.query_path_specs()
        assert 0 < len(claude_specs) < len(all_specs)
        assert all(s["ai_tool"] == "claude-code" for s in claude_specs)

    def test_query_path_specs_by_vendor(self, db: HistoryDB):
        db.sync_specs()
        anthropic_specs = db.query_path_specs(vendor="anthropic")
        assert len(anthropic_specs) > 0
        assert all(s["vendor"] == "anthropic" for s in anthropic_specs)

    def test_query_process_specs_by_tool(self, db: HistoryDB):
        db.sync_specs()
        claude_procs = db.query_process_specs(tool="claude-code")
        assert len(claude_procs) > 0
        assert all(s["ai_tool"] == "claude-code" for s in claude_procs)

    def test_sync_is_idempotent(self, db: HistoryDB):
        r1 = db.sync_specs()
        r2 = db.sync_specs()
        assert r1 == r2  # same counts after re-sync

    def test_stats_include_spec_counts(self, db: HistoryDB):
        db.sync_specs()
        s = db.stats()
        assert s["path_specs_count"] > 0
        assert s["process_specs_count"] > 0

    def test_migration_v2_to_v3(self, tmp_path):
        """Simulate a v2 DB and verify migration creates spec tables."""
        import sqlite3 as _sqlite3
        db_file = tmp_path / "v2.db"
        conn = _sqlite3.connect(str(db_file))
        conn.executescript("""
            CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
            INSERT INTO schema_version VALUES (2);
            CREATE TABLE metrics (ts REAL PRIMARY KEY, files INTEGER, tokens INTEGER,
                cpu REAL, mem_mb REAL, mcp INTEGER, mem_tokens INTEGER,
                live_sessions INTEGER DEFAULT 0, live_tokens INTEGER DEFAULT 0,
                live_in_rate REAL DEFAULT 0, live_out_rate REAL DEFAULT 0);
            CREATE TABLE tool_metrics (ts REAL, tool TEXT, cpu REAL, mem_mb REAL,
                tokens INTEGER, traffic REAL, model TEXT DEFAULT '',
                PRIMARY KEY(ts, tool));
            CREATE TABLE events (ts REAL, tool TEXT, kind TEXT, detail TEXT,
                PRIMARY KEY(ts, tool, kind));
            CREATE TABLE tool_telemetry (ts REAL, tool TEXT, source TEXT DEFAULT '',
                confidence REAL DEFAULT 0, input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0, cache_read_tokens INTEGER DEFAULT 0,
                cache_creation_tokens INTEGER DEFAULT 0, total_sessions INTEGER DEFAULT 0,
                total_messages INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0,
                model TEXT DEFAULT '', by_model_json TEXT DEFAULT '{}',
                PRIMARY KEY(ts, tool));
            CREATE TABLE file_store (path TEXT PRIMARY KEY, tool TEXT, category TEXT DEFAULT '',
                scope TEXT DEFAULT '', content TEXT DEFAULT '', content_hash TEXT DEFAULT '',
                size_bytes INTEGER DEFAULT 0, tokens INTEGER DEFAULT 0, lines INTEGER DEFAULT 0,
                mtime REAL DEFAULT 0, first_seen REAL DEFAULT 0, last_read REAL DEFAULT 0,
                last_changed REAL DEFAULT 0, meta TEXT DEFAULT '{}');
            CREATE TABLE file_history (path TEXT, ts REAL, content TEXT DEFAULT '',
                content_hash TEXT DEFAULT '', size_bytes INTEGER DEFAULT 0,
                tokens INTEGER DEFAULT 0, lines INTEGER DEFAULT 0, PRIMARY KEY(path, ts));
        """)
        conn.commit()
        conn.close()

        # Open with HistoryDB — should migrate v2 → v3
        db = HistoryDB(db_path=db_file, flush_interval=0)
        # Verify spec tables exist and are populated
        specs = db.query_path_specs()
        assert len(specs) > 0
        procs = db.query_process_specs()
        assert len(procs) > 0
        # Schema version should be 3
        conn2 = _sqlite3.connect(str(db_file))
        ver = conn2.execute("SELECT MAX(version) FROM schema_version").fetchone()[0]
        assert ver >= 3
        conn2.close()
        db.close()


# ── Universal Samples ──────────────────────────────────────────────

class TestSamples:
    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Sample(ts=now, metric="cpu.core.0", value=45.2),
            Sample(ts=now, metric="cpu.core.1", value=12.8),
            Sample(ts=now, metric="proc.123.cpu", value=5.5,
                   tags={"tool": "claude-code", "pid": "123"}),
        ])
        rows = db.query_samples(metric="cpu.core.0")
        assert len(rows) == 1
        assert rows[0].value == 45.2

    def test_query_prefix(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Sample(ts=now, metric="cpu.core.0", value=10),
            Sample(ts=now, metric="cpu.core.1", value=20),
            Sample(ts=now, metric="cpu.core.2", value=30),
            Sample(ts=now, metric="mem.total", value=8000),
        ])
        rows = db.query_samples(metric_prefix="cpu.core")
        assert len(rows) == 3

    def test_query_tag_filter(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Sample(ts=now, metric="proc.1.cpu", value=5, tags={"tool": "claude-code"}),
            Sample(ts=now, metric="proc.2.cpu", value=10, tags={"tool": "copilot-cli"}),
        ])
        rows = db.query_samples(metric_prefix="proc.", tag_filter={"tool": "claude-code"})
        assert len(rows) == 1
        assert rows[0].tags["tool"] == "claude-code"

    def test_query_series(self, db: HistoryDB):
        now = time.time()
        for i in range(5):
            db.append_samples([Sample(ts=now + i, metric="cpu.core.0", value=10 + i)])
        series = db.query_samples_series("cpu.core.0")
        assert len(series["ts"]) == 5
        assert series["value"] == [10, 11, 12, 13, 14]

    def test_list_metrics(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Sample(ts=now, metric="cpu.core.0", value=10),
            Sample(ts=now, metric="cpu.core.1", value=20),
            Sample(ts=now + 1, metric="cpu.core.0", value=15),
            Sample(ts=now, metric="mem.total", value=8000),
        ])
        metrics = db.list_metrics()
        assert len(metrics) == 3
        names = [m["metric"] for m in metrics]
        assert "cpu.core.0" in names
        assert "mem.total" in names
        # cpu.core.0 should have count=2
        core0 = next(m for m in metrics if m["metric"] == "cpu.core.0")
        assert core0["count"] == 2

    def test_list_metrics_prefix(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Sample(ts=now, metric="cpu.core.0", value=10),
            Sample(ts=now, metric="mem.total", value=8000),
        ])
        cpu_metrics = db.list_metrics(prefix="cpu.")
        assert len(cpu_metrics) == 1

    def test_stats_include_samples(self, db: HistoryDB):
        db.append_samples([
            Sample(ts=time.time(), metric="test.x", value=1),
            Sample(ts=time.time()+0.001, metric="test.y", value=2),
        ])
        s = db.stats()
        assert s["samples_count"] == 2
