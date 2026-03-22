"""Tests for dashboard API endpoints.

Exercises the HTTP layer by spinning up a real _DashboardHTTPServer on a
random port and making requests with urllib.  Each test class gets a
fresh in-memory HistoryDB pre-populated with realistic data so the
endpoints return meaningful results rather than empty arrays.
"""

from __future__ import annotations

import json
import threading
import time
import urllib.request

import pytest

from aictl.storage import (
    EventRow, FileEntry, HistoryDB, Sample, TelemetryRow,
)
from aictl.store import AllowedPaths, SnapshotStore
from aictl.dashboard.models import DashboardSnapshot, DashboardTool


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture()
def populated_db(tmp_path):
    """File-based DB pre-populated with samples, events, telemetry, and files.

    Uses a real file so the server thread can access the same data
    (in-memory DBs are per-thread with SQLite).
    """
    db = HistoryDB(db_path=str(tmp_path / "test.db"), flush_interval=0)
    now = time.time()

    # Samples
    db.append_samples([
        Sample(ts=now - 60, metric="cpu.core.0", value=45.2),
        Sample(ts=now - 30, metric="cpu.core.0", value=52.1),
        Sample(ts=now, metric="cpu.core.0", value=48.7),
        Sample(ts=now - 60, metric="cpu.core.1", value=12.8),
        Sample(ts=now, metric="mem.total", value=8192,
               tags={"tool": "claude-code"}),
    ])

    # Events (including session_end for historical sessions)
    db.append_event(EventRow(
        ts=now - 300, tool="claude-code", kind="session_start",
        detail={"session_id": "sess-001"},
    ))
    db.append_event(EventRow(
        ts=now - 100, tool="claude-code", kind="session_end",
        detail={"session_id": "sess-001", "duration_s": 200},
    ))
    db.append_event(EventRow(
        ts=now - 50, tool="copilot-cli", kind="session_start",
        detail={"session_id": "sess-002"},
    ))

    # Telemetry
    db.append_telemetry(TelemetryRow(
        ts=now - 60, tool="claude-code", source="stats-cache",
        confidence=0.95, input_tokens=1000, output_tokens=5000,
        cache_read_tokens=500, total_sessions=3, total_messages=42,
        model="claude-opus-4-6",
        by_model={"claude-opus-4-6": {"input": 1000, "output": 5000}},
    ))
    db.append_telemetry(TelemetryRow(
        ts=now, tool="copilot-cli", source="direct",
        confidence=0.8, input_tokens=200, output_tokens=800,
    ))

    # Files
    db.upsert_file(path="/project/README.md", tool="claude-code",
                   category="instructions", content="# Hello\nWorld")
    db.upsert_file(path="/project/.env", tool="copilot-cli",
                   category="config", content="KEY=val")

    yield db
    db.close()


def _make_snapshot(sessions=None):
    """Build a minimal DashboardSnapshot for testing."""
    return DashboardSnapshot(
        timestamp=time.time(),
        root="/tmp/test-project",
        tools=[],
        sessions=sessions or [],
    )


@pytest.fixture()
def server(populated_db):
    """Start a real HTTP server on a random port, yield its base URL."""
    from aictl.dashboard.web_server import (
        _DashboardHTTPServer, _DashboardHandler,
    )
    from pathlib import Path

    store = SnapshotStore(db=populated_db)
    # Give the store a snapshot so /api/sessions doesn't 503
    store.update(_make_snapshot(sessions=[
        {"session_id": "live-001", "tool": "claude-code",
         "duration_s": 120, "cpu_percent": 5.2,
         "exact_input_tokens": 500, "exact_output_tokens": 2000,
         "file_events": 3, "pids": [1234]},
    ]))

    allowed = AllowedPaths()
    srv = _DashboardHTTPServer(
        ("127.0.0.1", 0), _DashboardHandler,
        store, allowed, Path("/tmp/test-project"),
    )
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}"
    srv.shutdown()


def _get_json(url):
    """GET a URL and parse JSON response."""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200
        return json.loads(resp.read())


def _get_status(url):
    """GET a URL and return status code (handles errors)."""
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code


# ── Samples API ───────────────────────────────────────────────────

class TestSamplesAPI:
    def test_list_metrics(self, server):
        data = _get_json(f"{server}/api/samples?list=1")
        assert isinstance(data, list)
        assert len(data) >= 3  # cpu.core.0, cpu.core.1, mem.total
        # Each entry should be a dict with metric, count, latest_ts, last_value
        names = [m["metric"] for m in data]
        assert "cpu.core.0" in names
        assert "mem.total" in names
        core0 = next(m for m in data if m["metric"] == "cpu.core.0")
        assert core0["count"] == 3
        assert "latest_ts" in core0
        assert "last_value" in core0

    def test_list_metrics_with_prefix(self, server):
        data = _get_json(f"{server}/api/samples?list=1&prefix=cpu.")
        names = [m["metric"] for m in data]
        assert "cpu.core.0" in names
        assert "mem.total" not in names

    def test_series(self, server):
        since = int(time.time()) - 3600
        data = _get_json(
            f"{server}/api/samples?series=cpu.core.0&since={since}")
        assert "ts" in data
        assert "value" in data
        assert len(data["ts"]) == 3
        assert len(data["value"]) == 3
        # Values should match what we inserted
        assert data["value"][-1] == pytest.approx(48.7)

    def test_query_by_metric(self, server):
        since = int(time.time()) - 3600
        data = _get_json(
            f"{server}/api/samples?metric=mem.total&since={since}")
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["metric"] == "mem.total"
        assert data[0]["value"] == 8192
        assert data[0]["tags"]["tool"] == "claude-code"

    def test_query_by_prefix(self, server):
        since = int(time.time()) - 3600
        data = _get_json(
            f"{server}/api/samples?prefix=cpu.core&since={since}")
        assert len(data) == 4  # 3 for core.0 + 1 for core.1

    def test_query_with_tag_filter(self, server):
        since = int(time.time()) - 3600
        data = _get_json(
            f"{server}/api/samples?since={since}&tag.tool=claude-code")
        assert len(data) >= 1
        assert all(s["tags"]["tool"] == "claude-code" for s in data)

    def test_empty_db_returns_empty(self):
        """Samples endpoint with no DB returns []."""
        from aictl.dashboard.web_server import (
            _DashboardHTTPServer, _DashboardHandler,
        )
        from pathlib import Path

        # SnapshotStore with no DB
        store = SnapshotStore(db=None)
        allowed = AllowedPaths()
        srv = _DashboardHTTPServer(
            ("127.0.0.1", 0), _DashboardHandler,
            store, allowed, Path("/tmp"),
        )
        port = srv.server_address[1]
        t = threading.Thread(target=srv.serve_forever, daemon=True)
        t.start()
        try:
            data = _get_json(f"http://127.0.0.1:{port}/api/samples?list=1")
            assert data == []
        finally:
            srv.shutdown()


# ── Sessions API ──────────────────────────────────────────────────

class TestSessionsAPI:
    def test_active_sessions(self, server):
        data = _get_json(f"{server}/api/sessions?active=true")
        assert isinstance(data, list)
        assert len(data) >= 1
        live = next(s for s in data if s["session_id"] == "live-001")
        assert live["tool"] == "claude-code"
        assert live["active"] is True
        assert live["duration_s"] == 120

    def test_all_sessions_includes_historical(self, server):
        data = _get_json(f"{server}/api/sessions")
        assert isinstance(data, list)
        ids = [s["session_id"] for s in data]
        # Should have the live session
        assert "live-001" in ids
        # Should have the ended session from events
        assert "sess-001" in ids
        ended = next(s for s in data if s["session_id"] == "sess-001")
        assert ended["active"] is False
        assert ended["duration_s"] == 200

    def test_filter_by_tool(self, server):
        data = _get_json(f"{server}/api/sessions?tool=claude-code")
        assert all(s["tool"] == "claude-code" for s in data)

    def test_no_snapshot_returns_503(self):
        """Sessions endpoint with no snapshot returns 503."""
        from aictl.dashboard.web_server import (
            _DashboardHTTPServer, _DashboardHandler,
        )
        from pathlib import Path

        store = SnapshotStore(db=None)
        # Don't call store.update() → snapshot is None
        allowed = AllowedPaths()
        srv = _DashboardHTTPServer(
            ("127.0.0.1", 0), _DashboardHandler,
            store, allowed, Path("/tmp"),
        )
        port = srv.server_address[1]
        t = threading.Thread(target=srv.serve_forever, daemon=True)
        t.start()
        try:
            status = _get_status(f"http://127.0.0.1:{port}/api/sessions")
            assert status == 503
        finally:
            srv.shutdown()


# ── Files API ─────────────────────────────────────────────────────

class TestFilesAPI:
    def test_list_all_files(self, server):
        data = _get_json(f"{server}/api/files")
        assert isinstance(data, list)
        assert len(data) == 2
        paths = [f["path"] for f in data]
        assert "/project/README.md" in paths
        assert "/project/.env" in paths

    def test_filter_by_tool(self, server):
        data = _get_json(f"{server}/api/files?tool=claude-code")
        assert len(data) == 1
        assert data[0]["path"] == "/project/README.md"
        assert data[0]["tool"] == "claude-code"
        assert data[0]["category"] == "instructions"

    def test_filter_by_category(self, server):
        data = _get_json(f"{server}/api/files?category=config")
        assert len(data) == 1
        assert data[0]["path"] == "/project/.env"

    def test_file_has_expected_fields(self, server):
        data = _get_json(f"{server}/api/files?tool=claude-code")
        f = data[0]
        for key in ("path", "tool", "category", "scope", "content_hash",
                     "size_bytes", "tokens", "lines", "mtime",
                     "first_seen", "last_read", "last_changed", "meta"):
            assert key in f, f"Missing key: {key}"
        assert f["lines"] == 2
        assert f["tokens"] > 0


# ── File History API ──────────────────────────────────────────────

class TestFileHistoryAPI:
    def test_missing_path_returns_400(self, server):
        status = _get_status(f"{server}/api/files/history")
        assert status == 400

    def test_history_timeline(self, server, populated_db):
        # Add a second version
        time.sleep(0.01)
        populated_db.upsert_file(
            path="/project/README.md", tool="claude-code",
            content="# Hello\nWorld\nUpdated")
        data = _get_json(
            f"{server}/api/files/history?path=/project/README.md")
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_content_at_timestamp(self, server, populated_db):
        # Insert a version, record its time, then insert another
        t1 = time.time()
        time.sleep(0.01)
        populated_db.upsert_file(
            path="/project/new.md", tool="t", content="version-1")
        time.sleep(0.01)
        t2 = time.time()
        time.sleep(0.01)
        populated_db.upsert_file(
            path="/project/new.md", tool="t", content="version-2")

        # Get content at t2 (should be version-1)
        req = urllib.request.Request(
            f"{server}/api/files/history?path=/project/new.md&ts={t2}")
        with urllib.request.urlopen(req, timeout=5) as resp:
            assert resp.status == 200
            body = resp.read().decode()
            assert body == "version-1"


# ── Telemetry API ─────────────────────────────────────────────────

class TestTelemetryAPI:
    def test_query_all(self, server):
        since = int(time.time()) - 3600
        data = _get_json(f"{server}/api/telemetry?since={since}")
        assert isinstance(data, list)
        assert len(data) == 2
        tools = {r["tool"] for r in data}
        assert tools == {"claude-code", "copilot-cli"}

    def test_filter_by_tool(self, server):
        since = int(time.time()) - 3600
        data = _get_json(
            f"{server}/api/telemetry?tool=claude-code&since={since}")
        assert len(data) == 1
        r = data[0]
        assert r["tool"] == "claude-code"
        assert r["input_tokens"] == 1000
        assert r["output_tokens"] == 5000
        assert r["model"] == "claude-opus-4-6"
        assert "claude-opus-4-6" in r["by_model"]

    def test_has_expected_fields(self, server):
        since = int(time.time()) - 3600
        data = _get_json(f"{server}/api/telemetry?since={since}")
        r = data[0]
        for key in ("ts", "tool", "source", "confidence",
                     "input_tokens", "output_tokens",
                     "cache_read_tokens", "cache_creation_tokens",
                     "total_sessions", "total_messages",
                     "cost_usd", "model", "by_model"):
            assert key in r, f"Missing key: {key}"


# ── Events API ────────────────────────────────────────────────────

class TestEventsAPI:
    def test_query_all(self, server):
        since = int(time.time()) - 3600
        data = _get_json(f"{server}/api/events?since={since}")
        assert isinstance(data, list)
        assert len(data) >= 3
        kinds = {e["kind"] for e in data}
        assert "session_start" in kinds
        assert "session_end" in kinds

    def test_filter_by_tool(self, server):
        since = int(time.time()) - 3600
        data = _get_json(
            f"{server}/api/events?tool=copilot-cli&since={since}")
        assert all(e["tool"] == "copilot-cli" for e in data)

    def test_filter_by_kind(self, server):
        since = int(time.time()) - 3600
        data = _get_json(
            f"{server}/api/events?kind=session_end&since={since}")
        assert all(e["kind"] == "session_end" for e in data)

    def test_event_has_detail(self, server):
        since = int(time.time()) - 3600
        data = _get_json(
            f"{server}/api/events?kind=session_end&since={since}")
        assert len(data) >= 1
        assert "session_id" in data[0]["detail"]

    def test_filter_by_session_id(self, server):
        since = int(time.time()) - 3600
        # Get all events first to find a valid session_id
        all_events = _get_json(
            f"{server}/api/events?kind=session_end&since={since}")
        if all_events:
            sid = all_events[0]["detail"]["session_id"]
            filtered = _get_json(
                f"{server}/api/events?session_id={sid}&since={since}")
            assert all(
                e["detail"].get("session_id") == sid for e in filtered)
