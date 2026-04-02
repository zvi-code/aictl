"""Tests for aictl.storage — SQLite persistence layer (v20 schema)."""

from __future__ import annotations

import json
import time

import pytest

from aictl.storage import (
    AgentRow, EventRow, FileEntry, HistoryDB, Metric, MetricsRow,
    ProcessRow, RequestRow, Sample, SessionRow, SystemSnapshotRow,
    ToolInvocationRow, ToolMetricsRow, ToolStatsRow, TelemetryRow,
    _session_pid, _merge_session_stats, _dedup_key,
)


@pytest.fixture()
def db():
    """In-memory DB with immediate flush (flush_interval=0)."""
    d = HistoryDB(db_path=":memory:", flush_interval=0)
    yield d
    d.close()


# ── Basic CRUD ─────────────────────────────────────────────────────

class TestSystemSnapshots:
    """Tests for system_snapshots (was metrics table)."""

    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_metrics(SystemSnapshotRow(ts=now, files=10, tokens=5000,
                                            cpu_percent=12.3, memory_used_mb=512.5))
        db.append_metrics(SystemSnapshotRow(ts=now + 5, files=11, tokens=5100,
                                            cpu_percent=15.0, memory_used_mb=520.0))
        result = db.query_metrics()
        assert len(result["ts"]) == 2
        assert result["files"] == [10, 11]
        assert result["tokens"] == [5000, 5100]

    def test_query_with_since(self, db: HistoryDB):
        now = time.time()
        db.append_metrics(SystemSnapshotRow(ts=now - 100, files=1))
        db.append_metrics(SystemSnapshotRow(ts=now, files=2))
        result = db.query_metrics(since=now - 50)
        assert len(result["ts"]) == 1
        assert result["files"] == [2]

    def test_query_empty(self, db: HistoryDB):
        result = db.query_metrics()
        assert result["ts"] == []
        assert result["files"] == []

    def test_upsert_on_duplicate_ts(self, db: HistoryDB):
        now = time.time()
        db.append_metrics(SystemSnapshotRow(ts=now, files=10))
        db.append_metrics(SystemSnapshotRow(ts=now, files=20))  # same ts
        result = db.query_metrics()
        assert len(result["ts"]) == 1
        assert result["files"] == [20]  # replaced

    def test_backward_compat_alias(self):
        """MetricsRow is an alias for SystemSnapshotRow."""
        assert MetricsRow is SystemSnapshotRow


class TestProcessSnapshots:
    """Tests for process_snapshots (was tool_metrics)."""

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
            ToolMetricsRow(ts=now + 0.001, tool="copilot-cli", cpu=2.0),
        ])
        result = db.query_tool_metrics(tool="claude-code")
        assert "claude-code" in result
        assert "copilot-cli" not in result

    def test_query_with_since(self, db: HistoryDB):
        now = time.time()
        db.append_tool_metrics([
            ToolMetricsRow(ts=now - 100, tool="claude-code", cpu=1.0, mem_mb=100),
        ])
        # Need different enough values to pass dedup
        db.append_tool_metrics([
            ToolMetricsRow(ts=now, tool="claude-code", cpu=5.0, mem_mb=300),
        ])
        result = db.query_tool_metrics(since=now - 50)
        assert len(result.get("claude-code", {}).get("ts", [])) == 1


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


# ── Session profile helpers ────────────────────────────────────────

class TestSessionHelpers:
    def test_session_pid_correlator_format(self):
        assert _session_pid("claude-code:49719:1743450000") == "49719"

    def test_session_pid_non_correlator(self):
        assert _session_pid("some-uuid-abc123") is None
        assert _session_pid("claude-code:abc:123") is None
        assert _session_pid("tool:123") is None

    def test_merge_session_stats_sums_files(self):
        primary = {"files_modified": 10, "unique_files": 3, "bytes_written": 100,
                   "source_files": 5, "conversations": 2, "subagents": 1, "activity": []}
        secondary = {"files_modified": 5, "unique_files": 2, "bytes_written": 50,
                     "source_files": 3, "conversations": 1, "subagents": 2, "activity": []}
        _merge_session_stats(primary, secondary)
        assert primary["files_modified"] == 15
        assert primary["unique_files"] == 5
        assert primary["bytes_written"] == 150
        assert primary["source_files"] == 8
        assert primary["conversations"] == 2
        assert primary["subagents"] == 2

    def test_merge_session_stats_merges_activity_buckets(self):
        primary = {"files_modified": 0, "unique_files": 0, "bytes_written": 0,
                   "source_files": 0, "conversations": 0, "subagents": 0,
                   "activity": [[1000, 3], [2000, 5]]}
        secondary = {"files_modified": 0, "unique_files": 0, "bytes_written": 0,
                     "source_files": 0, "conversations": 0, "subagents": 0,
                     "activity": [[2000, 2], [3000, 4]]}
        _merge_session_stats(primary, secondary)
        assert primary["activity"] == [(1000, 3), (2000, 7), (3000, 4)]


class TestSessionProfileDedup:
    """query_session_profiles should collapse same-PID sessions into one tab."""

    def _emit_session(self, db, session_id, tool, start_ts, end_ts=None, files=0):
        db.append_event(EventRow(
            ts=start_ts, tool=tool, kind="session_start",
            detail={"session_id": session_id},
        ))
        if end_ts is not None:
            db.append_event(EventRow(
                ts=end_ts, tool=tool, kind="session_end",
                detail={"session_id": session_id,
                        "duration_s": round(end_ts - start_ts, 1)},
            ))
        for i in range(files):
            db.append_event(EventRow(
                ts=start_ts + i, tool=tool, kind="file_modified",
                detail={"session_id": session_id,
                        "path": f"/repo/file_{i}.py", "growth_bytes": 10},
            ))

    def test_same_pid_sessions_merged(self, db: HistoryDB):
        base = 1_743_000_000.0
        self._emit_session(db, "claude-code:49719:1743000000", "claude-code",
                           base, files=10)
        self._emit_session(db, "claude-code:49719:1743003600", "claude-code",
                           base + 3600, files=5)
        self._emit_session(db, "claude-code:49719:1743007200", "claude-code",
                           base + 7200, files=8)

        profiles = db.query_session_profiles(since=base - 1)
        assert len(profiles) == 1
        p = profiles[0]
        assert p["tool"] == "claude-code"
        assert p["session_id"] == "claude-code:49719:1743000000"
        assert p["files_modified"] == 23

    def test_different_pids_not_merged(self, db: HistoryDB):
        base = 1_743_000_000.0
        self._emit_session(db, "claude-code:11111:1743000000", "claude-code",
                           base, end_ts=base + 1800, files=10)
        self._emit_session(db, "claude-code:22222:1743000000", "claude-code",
                           base + 60, end_ts=base + 3600, files=5)

        profiles = db.query_session_profiles(since=base - 1)
        assert len(profiles) == 2

    def test_non_correlator_ids_not_affected(self, db: HistoryDB):
        base = 1_743_000_000.0
        self._emit_session(db, "abc123def456", "copilot-vscode",
                           base, end_ts=base + 3600, files=10)
        self._emit_session(db, "xyz789uvw012", "copilot-vscode",
                           base + 7200, end_ts=base + 10800, files=5)

        profiles = db.query_session_profiles(since=base - 1)
        assert len(profiles) == 2


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
            db.append_metrics(SystemSnapshotRow(ts=now + i, files=i))
        db.append_event(EventRow(ts=now, tool="x", kind="y"))
        s = db.stats()
        assert s["metrics_count"] == 5
        assert s["events_count"] == 1
        assert s["earliest_ts"] is not None


# ── Compaction ─────────────────────────────────────────────────────

class TestCompaction:
    def test_delete_old(self, db: HistoryDB):
        old_ts = time.time() - (31 * 86400)  # 31 days ago
        db.append_metrics(SystemSnapshotRow(ts=old_ts, files=1))
        db.append_event(EventRow(ts=old_ts, tool="x", kind="y"))
        result = db.compact()
        assert result["metrics_deleted_30d"] == 1
        assert result["events_deleted_30d"] == 1
        assert db.query_metrics()["ts"] == []

    def test_downsample_preserves_recent(self, db: HistoryDB):
        now = time.time()
        for i in range(10):
            db.append_metrics(SystemSnapshotRow(ts=now - i * 60, files=i))
        result = db.compact()
        data = db.query_metrics()
        assert len(data["ts"]) == 10

    def test_downsample_7d_range(self, db: HistoryDB):
        now = time.time()
        base = now - (2 * 86400)
        for i in range(120):
            db.append_metrics(SystemSnapshotRow(ts=base + i * 10, files=i % 10))
        result = db.compact()
        data = db.query_metrics()
        assert len(data["ts"]) < 120
        assert len(data["ts"]) > 0


# ── File-based DB ──────────────────────────────────────────────────

class TestFileBased:
    def test_create_and_reopen(self, tmp_path):
        db_file = tmp_path / "test.db"
        db1 = HistoryDB(db_path=db_file, flush_interval=0)
        now = time.time()
        db1.append_metrics(SystemSnapshotRow(ts=now, files=42))
        db1.close()

        db2 = HistoryDB(db_path=db_file, flush_interval=0)
        result = db2.query_metrics()
        assert result["files"] == [42]
        db2.close()

    def test_custom_path_via_string(self, tmp_path):
        db_file = str(tmp_path / "custom.db")
        db1 = HistoryDB(db_path=db_file, flush_interval=0)
        db1.append_metrics(SystemSnapshotRow(ts=time.time(), files=1))
        db1.close()
        assert (tmp_path / "custom.db").exists()

    def test_parent_dir_created(self, tmp_path):
        db_file = tmp_path / "sub" / "dir" / "test.db"
        db1 = HistoryDB(db_path=db_file, flush_interval=0)
        db1.append_metrics(SystemSnapshotRow(ts=time.time(), files=1))
        db1.close()
        assert db_file.exists()


# ── Tool Stats (was Telemetry) ────────────────────────────────────

class TestToolStats:
    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_telemetry(ToolStatsRow(
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
            ToolStatsRow(ts=now, tool="claude-code", input_tokens=100),
            ToolStatsRow(ts=now, tool="copilot-cli", input_tokens=200),
        ])
        rows = db.query_telemetry()
        assert len(rows) == 2

    def test_latest_telemetry(self, db: HistoryDB):
        now = time.time()
        db.append_telemetry(ToolStatsRow(
            ts=now - 10, tool="claude-code", input_tokens=100))
        db.append_telemetry(ToolStatsRow(
            ts=now, tool="claude-code", input_tokens=500))
        db.append_telemetry(ToolStatsRow(
            ts=now, tool="copilot-cli", input_tokens=200))
        latest = db.latest_telemetry()
        assert "claude-code" in latest
        assert latest["claude-code"].input_tokens == 500
        assert "copilot-cli" in latest

    def test_query_with_time_range(self, db: HistoryDB):
        now = time.time()
        db.append_telemetry(ToolStatsRow(ts=now - 100, tool="t", input_tokens=1))
        db.append_telemetry(ToolStatsRow(ts=now, tool="t", input_tokens=2))
        rows = db.query_telemetry(since=now - 50)
        assert len(rows) == 1
        assert rows[0].input_tokens == 2

    def test_backward_compat_alias(self):
        """TelemetryRow is an alias for ToolStatsRow."""
        assert TelemetryRow is ToolStatsRow


class TestMigration:
    def test_fresh_install_schema(self, tmp_path):
        """Fresh DB should get full v20 schema with all tables and indexes."""
        import sqlite3
        db_file = tmp_path / "fresh.db"
        db = HistoryDB(db_path=db_file, flush_interval=0)
        conn = sqlite3.connect(str(db_file))

        ver = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0]
        from aictl.storage import SCHEMA_VERSION
        assert ver == SCHEMA_VERSION
        assert ver == 21

        # New tables should exist
        tables = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()}
        for t in ("system_snapshots", "process_snapshots", "sessions",
                   "session_processes", "agents", "requests",
                   "tool_invocations", "files", "file_blobs",
                   "file_history", "tool_config", "environment_vars",
                   "tool_stats", "events", "metrics", "path_defs",
                   "process_defs", "tools", "projects", "processes"):
            assert t in tables, f"Missing table: {t}"

        # events table should have v20 columns
        event_cols = {r[1] for r in conn.execute("PRAGMA table_info(events)")}
        for col in ("session_id", "pid", "project_path", "detail", "seq"):
            assert col in event_cols, f"events missing column: {col}"

        # metrics table should have v20 columns
        metric_cols = {r[1] for r in conn.execute("PRAGMA table_info(metrics)")}
        for col in ("metric", "value", "tool", "session_id", "seq"):
            assert col in metric_cols, f"metrics missing column: {col}"

        conn.close()
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
        assert entry.content == "hello"

    def test_list_files(self, db: HistoryDB):
        db.upsert_file(path="/a.md", tool="claude-code", category="instructions", content="a")
        db.upsert_file(path="/b.md", tool="copilot-cli", category="config", content="b")
        db.upsert_file(path="/c.md", tool="claude-code", category="rules", content="c")

        all_files = db.list_files()
        assert len(all_files) == 3
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
        assert history[0]["tokens"] > 0

    def test_file_content_at(self, db: HistoryDB):
        t1 = time.time()
        db.upsert_file(path="/a.md", tool="t", content="version-1")
        time.sleep(0.01)
        t2 = time.time()
        db.upsert_file(path="/a.md", tool="t", content="version-2")

        content = db.file_content_at("/a.md", t1 + 0.001)
        assert content == "version-1"

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

        result = db.sync_files_from_discovery(discovered)
        assert result["unchanged"] == 2
        assert result["updated"] == 0

        result = db.sync_files_from_discovery([discovered[0]])
        assert result["removed"] == 1

    def test_stats_include_files(self, db: HistoryDB):
        db.upsert_file(path="/a.md", tool="t", content="hello world")
        s = db.stats()
        assert s["file_store_count"] == 1
        assert s["files_tracked"] == 1
        assert s["files_total_bytes"] > 0
        assert s["files_total_tokens"] > 0


# ── CSV Spec Tables (renamed to path_defs/process_defs) ───────────

class TestSpecSync:
    def test_sync_specs_loads_from_registry(self, db: HistoryDB):
        result = db.sync_specs()
        assert result["path_specs"] > 0
        assert result["process_specs"] > 0

    def test_query_path_specs_no_filter(self, db: HistoryDB):
        db.sync_specs()
        specs = db.query_path_specs()
        assert len(specs) > 0
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
        assert r1 == r2

    def test_stats_include_spec_counts(self, db: HistoryDB):
        db.sync_specs()
        s = db.stats()
        assert s["path_specs_count"] > 0
        assert s["process_specs_count"] > 0


# ── Universal Metrics (was Samples) ───────────────────────────────

class TestMetrics:
    """Tests for the universal metrics table (was samples)."""

    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Metric(ts=now, metric="cpu.core.0", value=45.2),
            Metric(ts=now, metric="cpu.core.1", value=12.8),
            Metric(ts=now, metric="proc.123.cpu", value=5.5,
                   tags={"tool": "claude-code", "pid": "123"}),
        ])
        rows = db.query_samples(metric="cpu.core.0")
        assert len(rows) == 1
        assert rows[0].value == 45.2

    def test_query_prefix(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Metric(ts=now, metric="cpu.core.0", value=10),
            Metric(ts=now, metric="cpu.core.1", value=20),
            Metric(ts=now, metric="cpu.core.2", value=30),
            Metric(ts=now, metric="mem.total", value=8000),
        ])
        rows = db.query_samples(metric_prefix="cpu.core")
        assert len(rows) == 3

    def test_query_tag_filter(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Metric(ts=now, metric="proc.1.cpu", value=5, tags={"tool": "claude-code"}),
            Metric(ts=now, metric="proc.2.cpu", value=10, tags={"tool": "copilot-cli"}),
        ])
        rows = db.query_samples(metric_prefix="proc.", tag_filter={"tool": "claude-code"})
        assert len(rows) == 1
        assert rows[0].tags["tool"] == "claude-code"

    def test_query_series(self, db: HistoryDB):
        now = time.time()
        for i in range(5):
            db.append_samples([Metric(ts=now + i, metric="cpu.core.0", value=10 + i)])
        series = db.query_samples_series("cpu.core.0")
        assert len(series["ts"]) == 5
        assert series["value"] == [10, 11, 12, 13, 14]

    def test_list_metrics(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Metric(ts=now, metric="cpu.core.0", value=10),
            Metric(ts=now, metric="cpu.core.1", value=20),
            Metric(ts=now + 1, metric="cpu.core.0", value=15),
            Metric(ts=now, metric="mem.total", value=8000),
        ])
        metrics = db.list_metrics()
        assert len(metrics) == 3
        names = [m["metric"] for m in metrics]
        assert "cpu.core.0" in names
        assert "mem.total" in names
        core0 = next(m for m in metrics if m["metric"] == "cpu.core.0")
        assert core0["count"] == 2

    def test_list_metrics_prefix(self, db: HistoryDB):
        now = time.time()
        db.append_samples([
            Metric(ts=now, metric="cpu.core.0", value=10),
            Metric(ts=now, metric="mem.total", value=8000),
        ])
        cpu_metrics = db.list_metrics(prefix="cpu.")
        assert len(cpu_metrics) == 1

    def test_stats_include_samples(self, db: HistoryDB):
        db.append_samples([
            Metric(ts=time.time(), metric="test.x", value=1),
            Metric(ts=time.time()+0.001, metric="test.y", value=2),
        ])
        s = db.stats()
        assert s["samples_count"] == 2

    def test_backward_compat_alias(self):
        """Sample is an alias for Metric."""
        assert Sample is Metric


# ── Sessions (new) ─────────────────────────────────────────────────

class TestSessions:
    def test_upsert_and_query(self, db: HistoryDB):
        now = time.time()
        db.upsert_session(SessionRow(
            session_id="sess-1", tool="claude-code",
            project_path="/repo", model="claude-opus-4-6",
            started_at=now, source="hook",
        ))
        sessions = db.query_sessions()
        assert len(sessions) == 1
        assert sessions[0]["session_id"] == "sess-1"
        assert sessions[0]["tool"] == "claude-code"

    def test_upsert_is_idempotent(self, db: HistoryDB):
        now = time.time()
        db.upsert_session(SessionRow(session_id="s1", started_at=now))
        db.upsert_session(SessionRow(session_id="s1", started_at=now + 10))
        sessions = db.query_sessions()
        assert len(sessions) == 1
        assert sessions[0]["started_at"] == now  # first insert wins

    def test_update_session_end(self, db: HistoryDB):
        now = time.time()
        db.upsert_session(SessionRow(session_id="s1", started_at=now))
        db.update_session_end("s1", ended_at=now + 100, input_tokens=500)
        sessions = db.query_sessions()
        assert sessions[0]["ended_at"] == now + 100
        assert sessions[0]["input_tokens"] == 500

    def test_query_active_sessions(self, db: HistoryDB):
        now = time.time()
        db.upsert_session(SessionRow(session_id="active", started_at=now))
        db.upsert_session(SessionRow(session_id="ended", started_at=now,
                                     ended_at=now + 100))
        active = db.query_sessions(active=True)
        assert len(active) == 1
        assert active[0]["session_id"] == "active"

    def test_session_profiles_enriched_with_file_events(self, db: HistoryDB):
        """Session profiles must include file_modified counts from events,
        even when the sessions table has files_modified=0 (Bug #2 regression)."""
        now = time.time()
        sid = "claude-code:1234:1700000000"
        db.upsert_session(SessionRow(
            session_id=sid, tool="claude-code",
            started_at=now - 100, source="correlator",
        ))
        # Simulate file_modified events (written by correlator)
        for i in range(3):
            db.append_event(EventRow(
                ts=now - 50 + i, tool="claude-code",
                kind="file_modified", session_id=sid,
                detail={"path": f"/repo/file{i}.py", "growth_bytes": 100},
            ))
        profiles = db.query_session_profiles(since=now - 200)
        assert len(profiles) == 1
        assert profiles[0]["files_modified"] == 3

    def test_query_session_flow(self, db: HistoryDB):
        now = time.time()
        db.upsert_session(SessionRow(session_id="s1", started_at=now))
        db.append_request(RequestRow(ts=now, session_id="s1", model="claude-opus-4-6",
                                     input_tokens=100, source="test"))
        db.append_tool_invocation(ToolInvocationRow(
            ts=now, session_id="s1", tool_name="bash", source="test"))
        flow = db.query_session_flow("s1")
        assert len(flow["requests"]) == 1
        assert len(flow["tool_invocations"]) == 1


# ── Requests (new) ─────────────────────────────────────────────────

class TestRequests:
    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_request(RequestRow(
            ts=now, session_id="s1", model="claude-opus-4-6",
            input_tokens=100, output_tokens=500,
            cost_usd=0.01, source="test",
        ))
        rows = db.query_requests(session_id="s1")
        assert len(rows) == 1
        assert rows[0]["model"] == "claude-opus-4-6"
        assert rows[0]["input_tokens"] == 100

    def test_dedup(self, db: HistoryDB):
        now = time.time()
        for _ in range(3):
            db.append_request(RequestRow(
                ts=now, session_id="s1", model="m1", source="x",
            ))
        rows = db.query_requests()
        assert len(rows) == 1  # deduped


# ── Tool Invocations (new) ─────────────────────────────────────────

class TestToolInvocations:
    def test_append_and_query(self, db: HistoryDB):
        now = time.time()
        db.append_tool_invocation(ToolInvocationRow(
            ts=now, session_id="s1", tool_name="bash",
            input={"command": "ls"}, result_summary="ok",
            source="test",
        ))
        rows = db.query_tool_invocations(session_id="s1")
        assert len(rows) == 1
        assert rows[0]["tool_name"] == "bash"


# ── Processes (new) ────────────────────────────────────────────────

class TestProcesses:
    def test_upsert_and_query(self, db: HistoryDB):
        now = time.time()
        db.upsert_process(ProcessRow(
            pid=12345, tool="claude-code", started_at=now,
            cmdline="/usr/bin/node claude",
        ))
        procs = db.query_processes(tool="claude-code")
        assert len(procs) == 1
        assert procs[0]["pid"] == 12345

    def test_update_process_exit(self, db: HistoryDB):
        now = time.time()
        db.upsert_process(ProcessRow(pid=111, started_at=now))
        db.update_process_exit(pid=111, started_at=now,
                               ended_at=now + 60, exit_code=0)
        procs = db.query_processes()
        assert procs[0]["ended_at"] == now + 60
        assert procs[0]["exit_code"] == 0


# ── Agents (new) ───────────────────────────────────────────────────

class TestAgents:
    def test_upsert_and_query(self, db: HistoryDB):
        now = time.time()
        db.upsert_agent(AgentRow(
            agent_id="agent-1", session_id="s1", tool="claude-code",
            task="refactor storage.py", model="claude-opus-4-6",
            started_at=now,
        ))
        agents = db.query_agents("s1")
        assert len(agents) == 1
        assert agents[0]["task"] == "refactor storage.py"


# ── Config/Env (new) ──────────────────────────────────────────────

class TestConfigEnv:
    def test_upsert_tool_config(self, db: HistoryDB):
        now = time.time()
        changed = db.upsert_tool_config(now, "claude-code", "/repo",
                                         "max_tokens", "4096")
        assert changed is True
        # Same value again
        changed = db.upsert_tool_config(now + 1, "claude-code", "/repo",
                                         "max_tokens", "4096")
        assert changed is False
        # Different value
        changed = db.upsert_tool_config(now + 2, "claude-code", "/repo",
                                         "max_tokens", "8192")
        assert changed is True

    def test_upsert_env_var(self, db: HistoryDB):
        now = time.time()
        changed = db.upsert_env_var(now, "/repo", "claude-code",
                                     "ANTHROPIC_API_KEY", "sk-***",
                                     is_secret=True)
        assert changed is True
        changed = db.upsert_env_var(now + 1, "/repo", "claude-code",
                                     "ANTHROPIC_API_KEY", "sk-***",
                                     is_secret=True)
        assert changed is False


# ── UI layout seed + queries ──────────────────────────────────────

class TestUILayout:
    """Tests for UI schema seed data and layout queries."""

    def test_seed_dashboard(self, db: HistoryDB):
        conn = db._conn()
        count = conn.execute("SELECT COUNT(*) FROM ui_dashboard").fetchone()[0]
        assert count == 1
        row = conn.execute("SELECT slug, title FROM ui_dashboard").fetchone()
        assert row == ("main", "aictl live dashboard")

    def test_seed_tabs(self, db: HistoryDB):
        conn = db._conn()
        count = conn.execute("SELECT COUNT(*) FROM ui_tab").fetchone()[0]
        assert count == 7
        keys = [r[0] for r in conn.execute(
            "SELECT key FROM ui_tab ORDER BY sort_order"
        ).fetchall()]
        assert keys == ["overview", "procs", "mcp", "memory", "live", "events", "budget"]

    def test_seed_sections(self, db: HistoryDB):
        conn = db._conn()
        count = conn.execute("SELECT COUNT(*) FROM ui_section").fetchone()[0]
        assert count == 16
        keys = {r[0] for r in conn.execute("SELECT key FROM ui_section").fetchall()}
        assert "sparklines" in keys
        assert "overview_tools" in keys
        assert "procs_tree" in keys
        assert "budget_verified" in keys

    def test_seed_widgets(self, db: HistoryDB):
        conn = db._conn()
        count = conn.execute("SELECT COUNT(*) FROM ui_widget").fetchone()[0]
        assert count == 31

    def test_seed_datasources(self, db: HistoryDB):
        conn = db._conn()
        count = conn.execute("SELECT COUNT(*) FROM ui_datasource").fetchone()[0]
        assert count == 6

    def test_seed_group_by_options(self, db: HistoryDB):
        conn = db._conn()
        count = conn.execute("SELECT COUNT(*) FROM ui_group_by_option").fetchone()[0]
        assert count == 3

    def test_seed_preferences(self, db: HistoryDB):
        conn = db._conn()
        count = conn.execute("SELECT COUNT(*) FROM ui_preference").fetchone()[0]
        assert count == 3

    def test_get_layout_structure(self, db: HistoryDB):
        layout = db.get_layout("main")
        assert layout["slug"] == "main"
        assert layout["title"] == "aictl live dashboard"
        assert len(layout["tabs"]) == 7
        assert len(layout["sections"]) == 16
        assert len(layout["datasources"]) == 6
        assert layout["preferences"]["theme"] == "auto"
        assert layout["preferences"]["range"] == "live"
        assert layout["preferences"]["active_tab"] == "overview"

    def test_get_layout_tabs_have_group_by(self, db: HistoryDB):
        layout = db.get_layout("main")
        overview = next(t for t in layout["tabs"] if t["key"] == "overview")
        assert len(overview["group_by_options"]) == 3
        assert overview["group_by_options"][0]["key"] == "product"
        assert overview["group_by_options"][0]["is_default"] is True

    def test_get_layout_sections_have_widgets(self, db: HistoryDB):
        layout = db.get_layout("main")
        sparklines = next(s for s in layout["sections"] if s["key"] == "sparklines")
        assert len(sparklines["widgets"]) == 5
        files_w = next(w for w in sparklines["widgets"] if w["key"] == "files")
        assert files_w["kind"] == "sparkline"
        assert files_w["config"]["field"] == "files"

    def test_get_layout_global_vs_tab_scoped(self, db: HistoryDB):
        layout = db.get_layout("main")
        for s in layout["sections"]:
            if s["key"] in ("sparklines", "inventory", "live_metrics",
                            "event_timeline", "resource_bars"):
                assert s["tab_key"] is None, f"{s['key']} should be global"
            elif s["key"] == "tool_charts":
                assert s["tab_key"] == "events"

    def test_get_layout_nonexistent_slug(self, db: HistoryDB):
        assert db.get_layout("nonexistent") == {}

    def test_set_and_get_preferences(self, db: HistoryDB):
        db.set_preference("main", "theme", "dark")
        prefs = db.get_preferences("main")
        assert prefs["theme"] == "dark"
        assert prefs["range"] == "live"

    def test_set_preference_new_key(self, db: HistoryDB):
        db.set_preference("main", "sidebar_width", "300")
        prefs = db.get_preferences("main")
        assert prefs["sidebar_width"] == "300"

    def test_user_preference_overlay(self, db: HistoryDB):
        db.set_preference("main", "theme", "light", user_id="user1")
        system_prefs = db.get_preferences("main")
        assert system_prefs["theme"] == "auto"
        user_prefs = db.get_preferences("main", user_id="user1")
        assert user_prefs["theme"] == "light"
        assert user_prefs["range"] == "live"

    def test_migration_idempotency(self, tmp_path):
        db_file = tmp_path / "idem.db"
        db1 = HistoryDB(db_path=db_file, flush_interval=0)
        conn1 = db1._conn()
        counts1 = {
            t: conn1.execute(f"SELECT COUNT(*) FROM ui_{t}").fetchone()[0]
            for t in ("dashboard", "tab", "section", "widget",
                      "datasource", "group_by_option", "preference")
        }
        db1.close()
        db2 = HistoryDB(db_path=db_file, flush_interval=0)
        conn2 = db2._conn()
        counts2 = {
            t: conn2.execute(f"SELECT COUNT(*) FROM ui_{t}").fetchone()[0]
            for t in ("dashboard", "tab", "section", "widget",
                      "datasource", "group_by_option", "preference")
        }
        db2.close()
        assert counts1 == counts2

    def test_export_layout_json(self, db: HistoryDB):
        raw = db.export_layout("main")
        layout = json.loads(raw)
        assert layout["slug"] == "main"
        assert len(layout["tabs"]) == 7

    def test_import_export_roundtrip(self, db: HistoryDB):
        """export -> import into a fresh DB -> export again -> identical."""
        original = db.get_layout("main")
        db2 = HistoryDB(db_path=":memory:", flush_interval=0)
        db2.import_layout(original)
        reimported = db2.get_layout("main")
        db2.close()
        assert reimported["slug"] == original["slug"]
        assert reimported["title"] == original["title"]
        assert len(reimported["tabs"]) == len(original["tabs"])
        assert len(reimported["sections"]) == len(original["sections"])
        assert len(reimported["datasources"]) == len(original["datasources"])
        assert reimported["preferences"] == original["preferences"]
        for orig_s in original["sections"]:
            re_s = next(s for s in reimported["sections"] if s["key"] == orig_s["key"])
            orig_wkeys = {w["key"] for w in orig_s["widgets"]}
            re_wkeys = {w["key"] for w in re_s["widgets"]}
            assert orig_wkeys == re_wkeys, f"widgets differ in section {orig_s['key']}"

    def test_import_custom_layout(self, db: HistoryDB):
        """Import a minimal custom layout and verify it replaces the seed."""
        custom = {
            "slug": "main",
            "title": "custom dashboard",
            "tabs": [
                {"key": "home", "title": "Home", "shortcut": "1", "sort_order": 0,
                 "visible": True, "group_by_options": []},
            ],
            "sections": [
                {"key": "hero", "title": "Hero", "sort_order": 0, "visible": True,
                 "columns": 2, "tab_key": None,
                 "widgets": [
                     {"key": "greeting", "kind": "text", "title": "Welcome",
                      "sort_order": 0, "config": {"message": "hello"}},
                 ]},
            ],
            "datasources": {
                "snapshot": {"kind": "rest", "endpoint": "/api/snapshot", "config": {}},
            },
            "preferences": {"theme": "dark"},
        }
        db.import_layout(custom)
        layout = db.get_layout("main")
        assert layout["title"] == "custom dashboard"
        assert len(layout["tabs"]) == 1
        assert layout["tabs"][0]["key"] == "home"
        assert len(layout["sections"]) == 1
        assert layout["sections"][0]["widgets"][0]["config"]["message"] == "hello"
        assert len(layout["datasources"]) == 1
        assert layout["preferences"] == {"theme": "dark"}


# ── File Blob Support (new) ────────────────────────────────────────

class TestFileBlobs:
    def test_large_file_uses_blob(self, db: HistoryDB):
        """Files larger than LARGE_FILE_THRESHOLD should store in blobs."""
        large_content = "x" * 150_000  # > 100KB threshold
        db.upsert_file(path="/big.txt", tool="t", content=large_content)
        entry = db.get_file("/big.txt")
        assert entry is not None
        assert entry.content == large_content  # still accessible
        assert entry.blob_hash != ""  # blob was stored

        # History should have blob_hash and empty content
        conn = db._conn()
        hist = conn.execute(
            "SELECT content, blob_hash FROM file_history WHERE path = ?",
            ("/big.txt",),
        ).fetchone()
        assert hist[0] == ""  # content stored in blob, not inline
        assert hist[1] != ""  # blob hash set

    def test_small_file_no_blob(self, db: HistoryDB):
        """Files smaller than threshold store content inline."""
        small_content = "hello world"
        db.upsert_file(path="/small.txt", tool="t", content=small_content)
        entry = db.get_file("/small.txt")
        assert entry.blob_hash == ""  # no blob needed


# ── Dedup Key ──────────────────────────────────────────────────────

class TestDedupKey:
    def test_deterministic(self):
        k1 = _dedup_key("a", "b", "c")
        k2 = _dedup_key("a", "b", "c")
        assert k1 == k2
        assert len(k1) == 16

    def test_different_inputs(self):
        k1 = _dedup_key("a", "b", "c")
        k2 = _dedup_key("x", "y", "z")
        assert k1 != k2


# ── Session flow PID correlation (Bug #1 fix) ───────────────────────


class TestSessionFlowPidCorrelation:
    """Prove that two concurrent sessions of the same tool get different
    events when correlated via PID through session_processes.

    This is the core regression test for the bug where _serve_session_flow
    fetched OTel events by tool+time window, causing every session to show
    the same flow chart.
    """

    def test_concurrent_sessions_get_different_events(self, db):
        """Two Claude Code sessions (different PIDs) must each see only
        their own OTel events after PID-based correlation."""
        ts = time.time() - 3600

        # ── Simulate correlator creating two sessions with different PIDs ──
        corr_sid_1 = "claude-code:1111:1711900000"
        corr_sid_2 = "claude-code:2222:1711900500"

        db.upsert_session(SessionRow(
            session_id=corr_sid_1, tool="claude-code", pid=1111,
            started_at=ts, source="correlator"))
        db.link_session_process(corr_sid_1, 1111, tool="claude-code")

        db.upsert_session(SessionRow(
            session_id=corr_sid_2, tool="claude-code", pid=2222,
            started_at=ts + 500, source="correlator"))
        db.link_session_process(corr_sid_2, 2222, tool="claude-code")

        # ── Simulate OTel events arriving for each PID with different UUIDs ──
        otel_sid_1 = "uuid-aaaa-1111"
        otel_sid_2 = "uuid-bbbb-2222"

        db.upsert_session(SessionRow(
            session_id=otel_sid_1, tool="claude-code", pid=1111,
            started_at=ts, source="otel"))
        db.link_session_process(otel_sid_1, 1111, tool="claude-code")

        db.upsert_session(SessionRow(
            session_id=otel_sid_2, tool="claude-code", pid=2222,
            started_at=ts + 500, source="otel"))
        db.link_session_process(otel_sid_2, 2222, tool="claude-code")

        # OTel API request events — each session gets different token counts
        db.append_event(EventRow(
            ts=ts + 10, tool="claude-code", kind="otel:api_request",
            detail={"input_tokens": 100, "session_id": otel_sid_1},
            session_id=otel_sid_1, pid=1111))
        db.append_event(EventRow(
            ts=ts + 20, tool="claude-code", kind="otel:api_request",
            detail={"input_tokens": 200, "session_id": otel_sid_1},
            session_id=otel_sid_1, pid=1111))

        db.append_event(EventRow(
            ts=ts + 510, tool="claude-code", kind="otel:api_request",
            detail={"input_tokens": 999, "session_id": otel_sid_2},
            session_id=otel_sid_2, pid=2222))
        db.flush()

        # ── Verify PID correlation ──
        # PID 1111 should find both corr_sid_1 and otel_sid_1
        sids_for_pid1 = set(db.find_session_ids_by_pid(1111))
        assert corr_sid_1 in sids_for_pid1
        assert otel_sid_1 in sids_for_pid1
        assert otel_sid_2 not in sids_for_pid1

        sids_for_pid2 = set(db.find_session_ids_by_pid(2222))
        assert corr_sid_2 in sids_for_pid2
        assert otel_sid_2 in sids_for_pid2
        assert otel_sid_1 not in sids_for_pid2

        # ── Simulate what _serve_session_flow does for session 1 ──
        # Step 1: Direct events for correlator session_id
        direct_events = db.query_events(
            since=ts - 60, until=ts + 7200,
            session_id=corr_sid_1, limit=5000)

        # Step 2: Find related sessions via PID
        related = set(db.find_session_ids_by_pid(1111))
        related.discard(corr_sid_1)

        api_events_1 = []
        for rel_sid in related:
            rel = db.query_events(
                since=ts - 7200, until=ts + 7200,
                session_id=rel_sid, limit=5000)
            api_events_1.extend(
                e for e in rel if e.kind.startswith("otel:"))

        # Session 1 should see exactly 2 OTel events (tokens 100 and 200)
        assert len(api_events_1) == 2
        tokens_1 = sorted(e.detail.get("input_tokens", 0) for e in api_events_1)
        assert tokens_1 == [100, 200]

        # ── Same for session 2 ──
        related2 = set(db.find_session_ids_by_pid(2222))
        related2.discard(corr_sid_2)

        api_events_2 = []
        for rel_sid in related2:
            rel = db.query_events(
                since=ts - 7200, until=ts + 7200,
                session_id=rel_sid, limit=5000)
            api_events_2.extend(
                e for e in rel if e.kind.startswith("otel:"))

        # Session 2 should see exactly 1 OTel event (tokens 999)
        assert len(api_events_2) == 1
        assert api_events_2[0].detail.get("input_tokens") == 999

        # ── THE BUG: without PID correlation, both would see all 3 events ──
        # Verify that tool+time query (old broken path) returns ALL events
        all_tool_events = db.query_events(
            since=ts - 7200, until=ts + 7200,
            tool="claude-code", limit=5000)
        otel_all = [e for e in all_tool_events if e.kind.startswith("otel:")]
        assert len(otel_all) == 3  # all 3 events mixed — the old bug

    def test_pid_stored_on_session(self, db):
        """PID must be stored as a structured column, not buried in session_id."""
        db.upsert_session(SessionRow(
            session_id="claude-code:4242:1711900000",
            tool="claude-code", pid=4242,
            started_at=time.time(), source="correlator"))
        rows = db.query_sessions(tool="claude-code")
        assert len(rows) == 1
        assert rows[0]["pid"] == 4242

    def test_event_row_carries_pid_and_session_id(self, db):
        """EventRow must carry pid and session_id as first-class fields."""
        db.append_event(EventRow(
            ts=time.time(), tool="test", kind="otel:api_request",
            detail={"foo": "bar"},
            session_id="uuid-123", pid=9999))
        db.flush()

        events = db.query_events(tool="test")
        assert len(events) == 1
        assert events[0].session_id == "uuid-123"
        assert events[0].pid == 9999

    def test_query_events_pid_filter(self, db):
        """query_events(pid=X) must return only events for that PID."""
        ts = time.time()
        db.append_event(EventRow(
            ts=ts, tool="claude-code", kind="otel:api_request",
            detail={}, session_id="a", pid=111))
        db.append_event(EventRow(
            ts=ts + 1, tool="claude-code", kind="otel:api_request",
            detail={}, session_id="b", pid=222))
        db.flush()

        pid111 = db.query_events(tool="claude-code", pid=111)
        assert len(pid111) == 1
        assert pid111[0].session_id == "a"

        pid222 = db.query_events(tool="claude-code", pid=222)
        assert len(pid222) == 1
        assert pid222[0].session_id == "b"

    def test_otel_pid_promotion(self):
        """OTel receiver must extract process.pid from resource attributes."""
        from aictl.dashboard.web_server import OtelReceiver

        receiver = OtelReceiver()
        body = {
            "resourceLogs": [{
                "resource": {"attributes": [
                    {"key": "service.name", "value": {"stringValue": "claude-code"}},
                    {"key": "session.id", "value": {"stringValue": "otel-uuid-123"}},
                    {"key": "process.pid", "value": {"intValue": 5555}},
                ]},
                "scopeLogs": [{"logRecords": [{
                    "timeUnixNano": "1711900000000000000",
                    "attributes": [
                        {"key": "event.name", "value": {"stringValue": "api_request"}},
                        {"key": "input_tokens", "value": {"intValue": 100}},
                    ],
                }]}],
            }],
        }
        events = receiver.parse_logs(body)
        assert len(events) == 1
        e = events[0]
        assert e.session_id == "otel-uuid-123"
        assert e.pid == 5555
        assert e.detail["pid"] == 5555
        assert e.detail["session_id"] == "otel-uuid-123"

        # extract_requests must also carry the pid
        reqs = receiver.extract_requests(events)
        assert len(reqs) == 1
        assert reqs[0].pid == 5555
        assert reqs[0].session_id == "otel-uuid-123"

    def test_session_processes_not_populated_without_pid(self, db):
        """link_session_process must be a no-op when pid is 0."""
        db.link_session_process("some-session", 0, tool="test")
        assert db.find_session_ids_by_pid(0) == []
