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
import urllib.error
import urllib.request

import pytest

from aictl.dashboard.models import DashboardSnapshot
from aictl.orchestrator import AllowedPaths, SnapshotStore
from aictl.storage import (
    EventRow,
    FileWriteRow,
    HistoryDB,
    Sample,
    TelemetryRow,
)

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
    db.append_samples(
        [
            Sample(ts=now - 60, metric="cpu.core.0", value=45.2),
            Sample(ts=now - 30, metric="cpu.core.0", value=52.1),
            Sample(ts=now, metric="cpu.core.0", value=48.7),
            Sample(ts=now - 60, metric="cpu.core.1", value=12.8),
            Sample(ts=now, metric="mem.total", value=8192, tags={"tool": "claude-code"}),
        ]
    )

    # Events (including session_end for historical sessions)
    db.append_event(
        EventRow(
            ts=now - 300,
            tool="claude-code",
            kind="session_start",
            detail={"session_id": "sess-001"},
        )
    )
    db.append_event(
        EventRow(
            ts=now - 100,
            tool="claude-code",
            kind="session_end",
            detail={"session_id": "sess-001", "duration_s": 200},
        )
    )
    db.append_event(
        EventRow(
            ts=now - 50,
            tool="copilot-cli",
            kind="session_start",
            detail={"session_id": "sess-002"},
        )
    )

    # Telemetry
    db.append_telemetry(
        TelemetryRow(
            ts=now - 60,
            tool="claude-code",
            source="stats-cache",
            confidence=0.95,
            input_tokens=1000,
            output_tokens=5000,
            cache_read_tokens=500,
            total_sessions=3,
            total_messages=42,
            model="claude-opus-4-6",
            by_model={"claude-opus-4-6": {"input": 1000, "output": 5000}},
        )
    )
    db.append_telemetry(
        TelemetryRow(
            ts=now,
            tool="copilot-cli",
            source="direct",
            confidence=0.8,
            input_tokens=200,
            output_tokens=800,
        )
    )

    # Files
    db.upsert_file(path="/project/README.md", tool="claude-code", category="instructions", content="# Hello\nWorld")
    db.upsert_file(path="/project/.env", tool="copilot-cli", category="config", content="KEY=val")
    db.record_file_write(
        FileWriteRow(
            ts=now - 20,
            session_id="sess-001",
            tool="claude-code",
            tool_name="Write",
            operation="write",
            path="/project/new.py",
            project_path="/project",
            source_event_kind="hook:PostToolUse",
            source_event_id="write-1",
        )
    )
    db.record_data_quality(
        "ingester:copilot-session-store",
        "schema_unknown",
        kind="ingester",
        severity="warning",
        message="schema drift",
        source="/tmp/session-store.db",
        ts=now - 10,
    )

    # Session rows (persist files_modified for /api/session-runs file_churn enrichment)
    from aictl.storage import SessionRow

    db.upsert_session(
        SessionRow(
            session_id="sess-001",
            tool="claude-code",
            project_path="/project",
            started_at=now - 300,
            ended_at=now - 100,
            input_tokens=1000,
            output_tokens=500,
            files_modified=7,
        )
    )
    db.upsert_session(
        SessionRow(
            session_id="sess-table-only",
            tool="claude-code",
            project_path="/project",
            started_at=now - 90,
            ended_at=now - 30,
            input_tokens=321,
            output_tokens=123,
            files_modified=2,
            source="hook",
        )
    )
    db.upsert_session(
        SessionRow(
            session_id="cursor:historic-chat",
            tool="cursor",
            project_path="/project",
            started_at=now - 200,
            source="cursor-ingester",
        )
    )

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
    from pathlib import Path

    from aictl.dashboard.web_server import (
        _DashboardHandler,
        _DashboardHTTPServer,
    )

    store = SnapshotStore(db=populated_db)
    # Give the store a snapshot so /api/sessions doesn't 503
    store.update(
        _make_snapshot(
            sessions=[
                {
                    "session_id": "live-001",
                    "tool": "claude-code",
                    "duration_s": 120,
                    "cpu_percent": 5.2,
                    "exact_input_tokens": 500,
                    "exact_output_tokens": 2000,
                    "file_events": 3,
                    "pids": [1234],
                },
            ]
        )
    )

    allowed = AllowedPaths()
    srv = _DashboardHTTPServer(
        ("127.0.0.1", 0),
        _DashboardHandler,
        store,
        allowed,
        Path("/tmp/test-project"),
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


def _put_json(url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        method="PUT",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200
        return json.loads(resp.read())


@pytest.fixture()
def config_server(populated_db, tmp_path):
    from aictl.dashboard.web_server import (
        _DashboardHandler,
        _DashboardHTTPServer,
    )

    root = tmp_path / "project"
    root.mkdir()
    store = SnapshotStore(db=populated_db)
    store.update(_make_snapshot())
    srv = _DashboardHTTPServer(
        ("127.0.0.1", 0),
        _DashboardHandler,
        store,
        AllowedPaths(),
        root,
    )
    port = srv.server_address[1]
    thread = threading.Thread(target=srv.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{port}", root
    srv.shutdown()


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


class TestObservabilitySubstrateAPI:
    def test_hooks_status_endpoint_returns_counts(self, server):
        data = _get_json(f"{server}/api/hooks-status")
        assert "tools" in data
        assert "counts_by_kind" in data
        assert "skill_usage" in data
        assert "subagents" in data

    def test_file_writes_endpoint_filters_by_session(self, server):
        data = _get_json(f"{server}/api/file-writes?session_id=sess-001")
        assert data["count"] == 1
        assert data["writes"][0]["path"] == "/project/new.py"
        assert data["writes"][0]["operation"] == "write"

    def test_data_quality_endpoint_returns_summary(self, server):
        data = _get_json(f"{server}/api/data-quality?kind=ingester")
        assert data["summary"]["schema_unknown"] == 1
        assert data["items"][0]["component"] == "ingester:copilot-session-store"

    def test_tool_config_put_updates_claude_project_permissions(self, config_server):
        base_url, root = config_server
        updated = _put_json(
            f"{base_url}/api/tool-config/claude-code",
            {"permissions": {"allow": ["Read(*)"], "deny": ["Bash(rm -rf *)"]}},
        )

        assert updated["permissions"]["allow"] == ["Read(*)"]
        assert updated["permissions"]["deny"] == ["Bash(rm -rf *)"]
        assert json.loads((root / ".claude" / "settings.json").read_text())["permissions"]["allow"] == [
            "Read(*)"
        ]

    def test_series(self, server):
        since = int(time.time()) - 3600
        data = _get_json(f"{server}/api/samples?series=cpu.core.0&since={since}")
        assert "ts" in data
        assert "value" in data
        assert len(data["ts"]) == 3
        assert len(data["value"]) == 3
        # Values should match what we inserted
        assert data["value"][-1] == pytest.approx(48.7)

    def test_query_by_metric(self, server):
        since = int(time.time()) - 3600
        data = _get_json(f"{server}/api/samples?metric=mem.total&since={since}")
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["metric"] == "mem.total"
        assert data[0]["value"] == 8192
        assert data[0]["tags"]["tool"] == "claude-code"

    def test_query_by_prefix(self, server):
        since = int(time.time()) - 3600
        data = _get_json(f"{server}/api/samples?prefix=cpu.core&since={since}")
        assert len(data) == 4  # 3 for core.0 + 1 for core.1

    def test_query_with_tag_filter(self, server):
        since = int(time.time()) - 3600
        data = _get_json(f"{server}/api/samples?since={since}&tag.tool=claude-code")
        assert len(data) >= 1
        assert all(s["tags"]["tool"] == "claude-code" for s in data)

    def test_empty_db_returns_empty(self):
        """Samples endpoint with no DB returns []."""
        from pathlib import Path

        from aictl.dashboard.web_server import (
            _DashboardHandler,
            _DashboardHTTPServer,
        )

        # SnapshotStore with no DB
        store = SnapshotStore(db=None)
        allowed = AllowedPaths()
        srv = _DashboardHTTPServer(
            ("127.0.0.1", 0),
            _DashboardHandler,
            store,
            allowed,
            Path("/tmp"),
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
        assert ended["lifecycle_status"] == "ended"
        assert ended["duration_s"] == 200

        imported = next(s for s in data if s["session_id"] == "cursor:historic-chat")
        assert imported["active"] is False
        assert imported["lifecycle_status"] == "imported"

    def test_filter_by_tool(self, server):
        data = _get_json(f"{server}/api/sessions?tool=claude-code")
        assert all(s["tool"] == "claude-code" for s in data)

    def test_no_snapshot_returns_503(self):
        """Sessions endpoint with no snapshot returns 503."""
        from pathlib import Path

        from aictl.dashboard.web_server import (
            _DashboardHandler,
            _DashboardHTTPServer,
        )

        store = SnapshotStore(db=None)
        # Don't call store.update() → snapshot is None
        allowed = AllowedPaths()
        srv = _DashboardHTTPServer(
            ("127.0.0.1", 0),
            _DashboardHandler,
            store,
            allowed,
            Path("/tmp"),
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
        for key in (
            "path",
            "tool",
            "category",
            "scope",
            "content_hash",
            "size_bytes",
            "tokens",
            "lines",
            "mtime",
            "first_seen",
            "last_read",
            "last_changed",
            "meta",
        ):
            assert key in f, f"Missing key: {key}"
        assert f["lines"] == 2
        assert f["tokens"] > 0


# ── /api/file allowlist (aictl-owned .context.toml) ─────────────────


class TestContextTomlAllowlist:
    """Regression: the dashboard (and the new-ui prototype) ask /api/file for
    the project's own .context.toml. The file is aictl-owned and is not part
    of any tool's discovered file set, so prior to this fix AllowedPaths.update
    never included it and every request hit 403.

    The hierarchical case matters too — a project can have nested .context.toml
    files (see AGENTS.md), so a per-folder allowlist is required, not just
    the root file."""

    def test_root_context_toml_is_allowed(self, tmp_path):
        """A root-level .context.toml must be in the allowlist after update."""
        from pathlib import Path as _Path

        ctx = tmp_path / ".context.toml"
        ctx.write_text("# .context.toml\n[plugin]\nname = 'test'\n")

        snap = DashboardSnapshot(
            timestamp=time.time(),
            root=str(tmp_path),
            tools=[],
            sessions=[],
        )
        allowed = AllowedPaths()
        allowed.update(snap)

        assert allowed.is_allowed(str(ctx)), (
            f"Root .context.toml at {ctx} should be allowed after update — "
            "AllowedPaths must include aictl-owned context files, not just "
            "files discovered via tools[].files[]."
        )
        # And nothing else under the root snuck in.
        unrelated = tmp_path / "README.md"
        unrelated.write_text("# readme\n")
        assert not allowed.is_allowed(str(unrelated)), (
            "Allowlist must not over-broaden — only .context.toml files, "
            "not arbitrary files under root."
        )
        # Sanity: cleanup type hint usage (silence lint)
        assert isinstance(ctx, _Path)

    def test_nested_context_toml_is_allowed(self, tmp_path):
        """Hierarchical .context.toml files (one per folder) must all be
        included — the project's per-folder layering is a core feature."""
        root_ctx = tmp_path / ".context.toml"
        root_ctx.write_text("# root\n")

        sub = tmp_path / "services" / "ingestion"
        sub.mkdir(parents=True)
        nested_ctx = sub / ".context.toml"
        nested_ctx.write_text("# nested\n")

        snap = DashboardSnapshot(
            timestamp=time.time(),
            root=str(tmp_path),
            tools=[],
            sessions=[],
        )
        allowed = AllowedPaths()
        allowed.update(snap)

        assert allowed.is_allowed(str(root_ctx))
        assert allowed.is_allowed(str(nested_ctx)), (
            f"Nested .context.toml at {nested_ctx} must be allowed — "
            "hierarchical project context files are first-class."
        )

    def test_missing_root_is_safe(self, tmp_path):
        """A snapshot with a non-existent root must not crash or widen the
        allowlist — defensive behavior matters because snapshot.root is
        whatever the daemon was launched with."""
        snap = DashboardSnapshot(
            timestamp=time.time(),
            root=str(tmp_path / "does-not-exist"),
            tools=[],
            sessions=[],
        )
        allowed = AllowedPaths()
        allowed.update(snap)  # must not raise

        # Allowlist should be empty (no tools, no memory, no readable root).
        assert not allowed.is_allowed(str(tmp_path / "anything"))

    def test_api_file_serves_context_toml_after_update(self, populated_db, tmp_path):
        """End-to-end: GET /api/file?path=<root>/.context.toml returns 200
        with the file body. Prior to the fix this returned 403 'Path not in
        discovered resource set' — see new-ui/captured/SHAPES.md finding #3."""
        from pathlib import Path

        from aictl.dashboard.web_server import (
            _DashboardHandler,
            _DashboardHTTPServer,
        )

        ctx = tmp_path / ".context.toml"
        ctx_body = "# project context\n[plugin]\nname = 'demo'\n"
        ctx.write_text(ctx_body)

        snap = DashboardSnapshot(
            timestamp=time.time(),
            root=str(tmp_path),
            tools=[],
            sessions=[],
        )
        store = SnapshotStore(db=populated_db)
        store.update(snap)
        allowed = AllowedPaths()
        allowed.update(snap)

        srv = _DashboardHTTPServer(
            ("127.0.0.1", 0),
            _DashboardHandler,
            store,
            allowed,
            Path(str(tmp_path)),
        )
        port = srv.server_address[1]
        t = threading.Thread(target=srv.serve_forever, daemon=True)
        t.start()
        try:
            import urllib.parse

            url = (
                f"http://127.0.0.1:{port}/api/file?"
                + urllib.parse.urlencode({"path": str(ctx)})
            )
            with urllib.request.urlopen(url, timeout=5) as resp:
                assert resp.status == 200, resp.status
                body = resp.read().decode("utf-8")
                assert body == ctx_body, body
        finally:
            srv.shutdown()


# ── File History API ──────────────────────────────────────────────


class TestFileHistoryAPI:
    def test_missing_path_returns_400(self, server):
        status = _get_status(f"{server}/api/files/history")
        assert status == 400

    def test_history_timeline(self, server, populated_db):
        # Add a second version
        time.sleep(0.01)
        populated_db.upsert_file(path="/project/README.md", tool="claude-code", content="# Hello\nWorld\nUpdated")
        data = _get_json(f"{server}/api/files/history?path=/project/README.md")
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_content_at_timestamp(self, server, populated_db):
        # Insert a version, record its time, then insert another
        t1 = time.time()
        time.sleep(0.01)
        populated_db.upsert_file(path="/project/new.md", tool="t", content="version-1")
        time.sleep(0.01)
        t2 = time.time()
        time.sleep(0.01)
        populated_db.upsert_file(path="/project/new.md", tool="t", content="version-2")

        # Get content at t2 (should be version-1)
        req = urllib.request.Request(f"{server}/api/files/history?path=/project/new.md&ts={t2}")
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
        data = _get_json(f"{server}/api/telemetry?tool=claude-code&since={since}")
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
        for key in (
            "ts",
            "tool",
            "source",
            "confidence",
            "input_tokens",
            "output_tokens",
            "cache_read_tokens",
            "cache_creation_tokens",
            "total_sessions",
            "total_messages",
            "cost_usd",
            "model",
            "by_model",
        ):
            assert key in r, f"Missing key: {key}"


# ── Session Runs API ──────────────────────────────────────────────


class TestSessionRunsAPI:
    def test_returns_session_end_runs(self, server):
        data = _get_json(f"{server}/api/session-runs?days=1")
        assert isinstance(data, list)
        assert len(data) >= 1
        run = next(r for r in data if r["session_id"] == "sess-001")
        assert run["duration_s"] == 200
        assert run["tool"] == "claude-code"
        assert run["project"] == "/project"
        assert run["input_tokens"] == 1000
        assert run["output_tokens"] == 500
        assert run["total_tokens"] == 1500

    def test_returns_completed_sessions_without_event_pair(self, server):
        data = _get_json(f"{server}/api/session-runs?days=1")
        run = next(r for r in data if r["session_id"] == "sess-table-only")
        assert run["duration_s"] == 60
        assert run["project"] == "/project"
        assert run["input_tokens"] == 321
        assert run["output_tokens"] == 123
        assert run["total_tokens"] == 444
        assert run["file_churn"] == 2

    def test_includes_file_churn_field(self, server):
        """file_churn should be present on every run (0 when no session row)."""
        data = _get_json(f"{server}/api/session-runs?days=1")
        assert len(data) >= 1
        for run in data:
            assert "file_churn" in run
            assert isinstance(run["file_churn"], int)
        run = next(r for r in data if r["session_id"] == "sess-001")
        # Populated session row has files_modified=7.
        assert run["file_churn"] == 7


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
        data = _get_json(f"{server}/api/events?tool=copilot-cli&since={since}")
        assert all(e["tool"] == "copilot-cli" for e in data)

    def test_filter_by_kind(self, server):
        since = int(time.time()) - 3600
        data = _get_json(f"{server}/api/events?kind=session_end&since={since}")
        assert all(e["kind"] == "session_end" for e in data)

    def test_event_has_detail(self, server):
        since = int(time.time()) - 3600
        data = _get_json(f"{server}/api/events?kind=session_end&since={since}")
        assert len(data) >= 1
        assert "session_id" in data[0]["detail"]

    def test_filter_by_session_id(self, server):
        since = int(time.time()) - 3600
        # Get all events first to find a valid session_id
        all_events = _get_json(f"{server}/api/events?kind=session_end&since={since}")
        if all_events:
            sid = all_events[0]["detail"]["session_id"]
            filtered = _get_json(f"{server}/api/events?session_id={sid}&since={since}")
            assert all(e["detail"].get("session_id") == sid for e in filtered)


# ── API Calls endpoint: OTel attribute extraction ─────────────────


@pytest.fixture()
def api_calls_server(tmp_path):
    """Server with DB pre-populated with OTel api_request/api_error events
    whose detail dicts use the real OTel attribute keys."""
    from pathlib import Path

    from aictl.dashboard.web_server import (
        _DashboardHandler,
        _DashboardHTTPServer,
    )

    db = HistoryDB(db_path=str(tmp_path / "apicalls.db"), flush_interval=0)
    now = time.time()

    # Successful request with real OTel keys: finish_reasons list + http.status_code
    db.append_event(
        EventRow(
            ts=now - 10,
            tool="claude-code",
            kind="otel:claude_code.api_request",
            detail={
                "model": "claude-opus-4-6",
                "duration_ms": 250,
                "gen_ai.response.finish_reasons": ["length"],
                "http.status_code": 200,
            },
        )
    )
    # Error with real OTel keys: error.type + http.response.status_code (newer)
    db.append_event(
        EventRow(
            ts=now - 5,
            tool="claude-code",
            kind="otel:claude_code.api_error",
            detail={
                "model": "claude-opus-4-6",
                "error": "429 Too Many Requests",
                "error.type": "rate_limit",
                "http.response.status_code": "429",  # string — must coerce to int
            },
        )
    )
    # Current-format Claude Code kind (receiver emits "otel:api_request")
    db.append_event(
        EventRow(
            ts=now - 20,
            tool="claude-code",
            kind="otel:api_request",
            detail={"model": "claude-sonnet-4-5", "duration_ms": 180},
        )
    )
    # Copilot / generic OTel GenAI span — uses namespaced gen_ai.* keys only
    db.append_event(
        EventRow(
            ts=now - 30,
            tool="copilot-vscode",
            kind="otel:gen_ai.client.inference.operation.details",
            detail={
                "gen_ai.request.model": "gpt-4o",
                "gen_ai.response.model": "gpt-4o-2024-08-06",
                "gen_ai.usage.input_tokens": 1200,
                "gen_ai.usage.output_tokens": 45,
            },
        )
    )
    # Codex
    db.append_event(
        EventRow(
            ts=now - 40,
            tool="codex-cli",
            kind="otel:codex.api_request",
            detail={"model": "gpt-5", "duration_ms": 300},
        )
    )
    db.flush()

    store = SnapshotStore(db=db)
    store.update(_make_snapshot())

    allowed = AllowedPaths()
    srv = _DashboardHTTPServer(
        ("127.0.0.1", 0),
        _DashboardHandler,
        store,
        allowed,
        Path("/tmp/test-project"),
    )
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}"
    srv.shutdown()
    db.close()


class TestApiCallsOtelEnrichment:
    def test_extracts_finish_reason_from_otel_list(self, api_calls_server):
        data = _get_json(f"{api_calls_server}/api/api-calls?since=0")
        ok = [c for c in data["calls"] if c["status"] == "ok" and c.get("finish_reason")]
        assert len(ok) == 1
        assert ok[0]["finish_reason"] == "length"

    def test_extracts_http_status_from_otel_key_as_int(self, api_calls_server):
        data = _get_json(f"{api_calls_server}/api/api-calls?since=0")
        ok = [c for c in data["calls"] if c["status"] == "ok" and c.get("http_status")]
        assert len(ok) == 1
        assert ok[0]["http_status"] == 200
        assert isinstance(ok[0]["http_status"], int)

    def test_extracts_error_type_and_http_status_on_error(self, api_calls_server):
        data = _get_json(f"{api_calls_server}/api/api-calls?since=0")
        err = [c for c in data["calls"] if c["status"] == "error"]
        assert len(err) == 1
        assert err[0]["error_type"] == "rate_limit"
        # http.response.status_code was a string "429" — must be coerced to int
        assert err[0]["http_status"] == 429
        assert isinstance(err[0]["http_status"], int)

    def test_returns_calls_for_all_known_api_request_kinds(self, api_calls_server):
        """Regression: handler must query every kind the OTel receiver emits,
        not just the legacy `otel:claude_code.api_request`. Without this the
        session-detail API Calls panel shows "No OTel API call data" even
        when OTel is enabled and data is flowing."""
        data = _get_json(f"{api_calls_server}/api/api-calls?since=0")
        models = {c.get("model") for c in data["calls"] if c["status"] == "ok"}
        # From the four inserted ok-request events across all tools
        assert "claude-opus-4-6" in models  # otel:claude_code.api_request
        assert "claude-sonnet-4-5" in models  # otel:api_request
        assert "gpt-4o-2024-08-06" in models  # otel:gen_ai.client.inference.operation.details (gen_ai.response.model)
        assert "gpt-5" in models  # otel:codex.api_request

    def test_resolves_model_from_gen_ai_namespaced_keys(self, api_calls_server):
        """Regression: OTel GenAI semconv uses `gen_ai.request.model` /
        `gen_ai.response.model`, not plain `model`. The handler must resolve
        either or the model column shows `—` for every call."""
        data = _get_json(f"{api_calls_server}/api/api-calls?since=0")
        # All ok-calls should have a non-empty model string
        ok = [c for c in data["calls"] if c["status"] == "ok"]
        assert all(c.get("model") for c in ok), [c for c in ok if not c.get("model")]


# ── Session Subprocesses endpoint ─────────────────────────────────


class TestSessionSubprocessesAPI:
    def test_returns_sorted_counts_for_live_session(self, server):
        data = _get_json(f"{server}/api/session-subprocesses?session_id=live-001")
        assert data["session_id"] == "live-001"
        assert isinstance(data["counts"], list)
        assert isinstance(data["recent"], list)
        # Fixture session has no subprocess_count, so counts/total are empty —
        # this test primarily confirms the shape + that unknown keys don't crash.
        assert data["total"] == 0
        assert data["counts"] == []

    def test_sorted_and_total_when_snapshot_has_subprocesses(self, populated_db):
        from pathlib import Path

        from aictl.dashboard.web_server import (
            _DashboardHandler,
            _DashboardHTTPServer,
        )

        store = SnapshotStore(db=populated_db)
        store.update(
            _make_snapshot(
                sessions=[
                    {
                        "session_id": "live-sub",
                        "tool": "claude-code",
                        "duration_s": 30,
                        "subprocess_count": {"git": 10, "rg": 3, "node": 7},
                        "recent_subprocesses": [
                            {"ts": 1.0, "name": "git"},
                            {"ts": 2.0, "name": "rg"},
                        ],
                    },
                ]
            )
        )

        allowed = AllowedPaths()
        srv = _DashboardHTTPServer(
            ("127.0.0.1", 0),
            _DashboardHandler,
            store,
            allowed,
            Path("/tmp/test-project"),
        )
        port = srv.server_address[1]
        t = threading.Thread(target=srv.serve_forever, daemon=True)
        t.start()
        try:
            data = _get_json(f"http://127.0.0.1:{port}/api/session-subprocesses?session_id=live-sub")
            assert data["total"] == 20
            # Sorted by count desc
            names = [c["name"] for c in data["counts"]]
            assert names == ["git", "node", "rg"]
            assert data["counts"][0]["count"] == 10
            assert len(data["recent"]) == 2
        finally:
            srv.shutdown()

    def test_unknown_session_returns_empty_shape(self, server):
        data = _get_json(f"{server}/api/session-subprocesses?session_id=does-not-exist")
        assert data == {"session_id": "does-not-exist", "total": 0, "counts": [], "recent": []}

    def test_missing_session_id_returns_400(self, server):
        status = _get_status(f"{server}/api/session-subprocesses")
        assert status == 400


# ── Session Messages endpoint (Slice 3.2) ─────────────────────────


class TestSessionMessagesAPI:
    def test_requires_session_id(self, server):
        status = _get_status(f"{server}/api/session-messages")
        assert status == 400

    def test_returns_copilot_store_messages(self, server, populated_db):
        conn = populated_db._conn()
        now = time.time()
        conn.executemany(
            "INSERT INTO copilot_session_messages"
            "(session_id, source_row_id, source_table, role, content, ts, ingested_at)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                ("sess-msg", 1, "messages", "user", "hello", now - 10, now),
                ("sess-msg", 2, "messages", "assistant", "hi there", now - 5, now),
            ],
        )
        conn.commit()

        data = _get_json(f"{server}/api/session-messages?session_id=sess-msg")
        assert data["session_id"] == "sess-msg"
        assert data["sources"]["copilot_store"] == 2
        roles = [m["role"] for m in data["messages"]]
        assert roles == ["user", "assistant"]
        assert data["messages"][0]["content"] == "hello"
        assert all(m["source"] == "copilot_store" for m in data["messages"])

    def test_dedup_across_otel_and_copilot_store(self, server, populated_db):
        from aictl.storage import EventRow

        now = int(time.time())
        # OTel-derived user message
        populated_db.append_event(
            EventRow(
                ts=float(now),
                tool="copilot-cli",
                kind="otel:user_prompt",
                session_id="sess-dedup",
                detail={"session_id": "sess-dedup", "message": "duplicate question"},
            )
        )
        # Same content & rounded ts in copilot store + one unique copilot row
        conn = populated_db._conn()
        conn.executemany(
            "INSERT INTO copilot_session_messages"
            "(session_id, source_row_id, source_table, role, content, ts, ingested_at)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                ("sess-dedup", 11, "messages", "user", "duplicate question", float(now), float(now)),
                ("sess-dedup", 12, "messages", "assistant", "unique answer", float(now + 1), float(now)),
            ],
        )
        conn.commit()

        data = _get_json(f"{server}/api/session-messages?session_id=sess-dedup")
        contents = [m["content"] for m in data["messages"]]
        # Dedup collapsed the duplicate user line.
        assert contents.count("duplicate question") == 1
        assert "unique answer" in contents
        assert data["sources"]["otel"] >= 1
        assert data["sources"]["copilot_store"] == 2
