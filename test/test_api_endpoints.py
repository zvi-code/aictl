"""Tests for dashboard API endpoints.

Exercises the HTTP layer by spinning up a real _DashboardHTTPServer on a
random port and making requests with urllib. Tests that read history use
replayed Kusto views.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import threading
import time
import urllib.error
import urllib.request
from contextlib import contextmanager

import pytest

from aictl.dashboard.models import DashboardSnapshot
from aictl.orchestrator import AllowedPaths, SnapshotStore
from aictl.records import EventRow
from aictl.stores import Store
from aictl.stores.kusto.reader import KustoReader, _query
from aictl.stores.kusto.recorded import RecordedKustoClient

# ── Fixtures ──────────────────────────────────────────────────────


def _make_snapshot(sessions=None):
    """Build a minimal DashboardSnapshot for testing."""
    return DashboardSnapshot(
        timestamp=time.time(),
        root="/tmp/test-project",
        tools=[],
        sessions=sessions or [],
    )


@pytest.fixture()
def server(tmp_path):
    store = SnapshotStore()
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

    yield from _serve_test_store(store, tmp_path / "project")


@pytest.fixture
def metrics_server(kusto_store, tmp_path, monkeypatch):
    from types import SimpleNamespace

    from aictl.dashboard import hooks_status

    monkeypatch.setattr(hooks_status, "time", SimpleNamespace(time=lambda: 100_000.0))
    for ts, metric, value, tags in (
        (99_940, "cpu.core.0", 45.2, {}), (99_970, "cpu.core.0", 52.1, {}),
        (100_000, "cpu.core.0", 48.7, {}), (99_940, "cpu.core.1", 12.8, {}),
        (100_000, "mem.total", 8192, {"tool": "claude-code"}),
    ):
        kusto_store.insert("metrics", ts=ts, metric=metric, value=value, tags=json.dumps(tags))
    kusto_store.insert("datapoint_catalog", key="runtime.cpu", tab="machine", source_type="raw")
    kusto_store.insert("system_snapshots", ts=100_000, cpu_percent=42)
    kusto_store.insert("process_snapshots", ts=100_000, pid=1, tool="claude-code", cpu_percent=8)
    yield from _serve_test_store(SnapshotStore(history_store=kusto_store.history_store), tmp_path / "project")


def _serve_test_store(store, project_path):
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

    srv = _DashboardHTTPServer(
        ("127.0.0.1", 0),
        _DashboardHandler,
        store,
        AllowedPaths(),
        project_path,
    )
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        srv.shutdown()
        srv.server_close()


@pytest.fixture()
def recorded_server(tmp_path):
    """Run the HTTP handler with only a Kusto reader. Record parameters as well as payloads."""
    seen = []

    class Client(RecordedKustoClient):
        def execute_query(self, database, text, properties):
            seen.append((text, properties))
            return super().execute_query(database, text, properties)

    def serve(queries):
        tape = tmp_path / "api.jsonl.gz"
        with gzip.open(tape, "wt", encoding="utf-8") as file:
            for view, columns, rows in (("history.system", {"ts": "real"}, []),
                                         ("history.tools", {"ts": "real"}, []), *queries):
                record = {
                    "kind": "query", "kql": _query(view), "outcome": "ok",
                    "response": [{"columns": [{"name": k, "type": t} for k, t in columns.items()], "rows": rows}],
                }
                file.write(json.dumps(record) + "\n")
        store = SnapshotStore(history_store=Store(reader=KustoReader(Client(tape), "aictl_perf_test")))
        seen.clear()
        store.update(_make_snapshot())
        yield from _serve_test_store(store, tmp_path / "project")

    return contextmanager(serve), seen


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


def _post_json(url, payload):
    """POST JSON, returning (status, parsed_body) even on HTTP errors."""
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, {}


@pytest.fixture()
def config_server(tmp_path):
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

    root = tmp_path / "project"
    root.mkdir()
    store = SnapshotStore()
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
    def test_list_metrics(self, metrics_server):
        server = metrics_server
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

    def test_list_metrics_with_prefix(self, metrics_server):
        server = metrics_server
        data = _get_json(f"{server}/api/samples?list=1&prefix=cpu.")
        names = [m["metric"] for m in data]
        assert "cpu.core.0" in names
        assert "mem.total" not in names


class TestObservabilitySubstrateAPI:
    def test_hooks_status_endpoint_returns_counts(self, metrics_server):
        server = metrics_server
        data = _get_json(f"{server}/api/hooks-status")
        assert "tools" in data
        assert "counts_by_kind" in data
        assert "skill_usage" in data
        assert "subagents" in data

    def test_tool_config_put_updates_claude_project_permissions(self, config_server):
        base_url, root = config_server
        updated = _put_json(
            f"{base_url}/api/tool-config/claude-code",
            {"permissions": {"allow": ["Read(*)"], "deny": ["Bash(rm -rf *)"]}},
        )

        assert updated["permissions"]["allow"] == ["Read(*)"]
        assert updated["permissions"]["deny"] == ["Bash(rm -rf *)"]
        assert json.loads((root / ".claude" / "settings.json").read_text())["permissions"]["allow"] == ["Read(*)"]

    def test_series(self, metrics_server):
        server, since = metrics_server, 96_400
        data = _get_json(f"{server}/api/samples?series=cpu.core.0&since={since}")
        assert "ts" in data
        assert "value" in data
        assert len(data["ts"]) == 3
        assert len(data["value"]) == 3
        # Values should match what we inserted
        assert data["value"][-1] == pytest.approx(48.7)

    def test_query_by_metric(self, metrics_server):
        server, since = metrics_server, 96_400
        data = _get_json(f"{server}/api/samples?metric=mem.total&since={since}")
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["metric"] == "mem.total"
        assert data[0]["value"] == 8192
        assert data[0]["tags"]["tool"] == "claude-code"

    def test_query_by_prefix(self, metrics_server):
        server, since = metrics_server, 96_400
        data = _get_json(f"{server}/api/samples?prefix=cpu.core&since={since}")
        assert len(data) == 4  # 3 for core.0 + 1 for core.1

    def test_query_with_tag_filter(self, metrics_server):
        server, since = metrics_server, 96_400
        data = _get_json(f"{server}/api/samples?since={since}&tag.tool=claude-code")
        assert len(data) >= 1
        assert all(s["tags"]["tool"] == "claude-code" for s in data)

    def test_catalog_filters_by_tab(self, metrics_server):
        rows = _get_json(f"{metrics_server}/api/datapoints?tab=machine")
        assert [row["key"] for row in rows] == ["runtime.cpu"]

    def test_empty_db_returns_empty(self):
        """Samples endpoint with no DB returns []."""
        from pathlib import Path

        from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

        # SnapshotStore with no DB
        store = SnapshotStore()
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


# ── Session detail API (processes) ────────────────────────────────


class TestSessionDetailAPI:
    def test_session_processes_genealogy(self, recorded_server):
        serve, seen = recorded_server
        columns = dict(row_type="string", role="string", count="long", pid="long", tool="string", joined_at="real")
        rows = [
            ["count", "lead", 1, None, "", None],
            ["count", "subagent", 1, None, "", None],
            ["process", "lead", None, 4242, "claude-code", 100.0],
            ["process", "subagent", None, 4243, "claude-code", 110.0],
        ]
        with serve([("sessions.processes", columns, rows)]) as server:
            data = _get_json(f"{server}/api/session-processes?session_id=sess-detail")
        assert seen[0][1].get_parameter("requested_session", None) == "sess-detail"
        assert data["session_id"] == "sess-detail"
        assert data["total"] == 2
        assert data["by_role"] == {"lead": 1, "subagent": 1}
        pids = {p["pid"] for p in data["processes"]}
        assert pids == {4242, 4243}

    def test_session_processes_requires_session_id(self, server):
        assert _get_status(f"{server}/api/session-processes") == 400


class TestSessionKillAPI:
    """POST /api/session-kill — control action with a confirm gate."""

    def test_kill_force_falls_back_to_sigterm_without_sigkill(self, monkeypatch):
        """On Windows ``signal.SIGKILL`` does not exist; the force-kill path must
        degrade to SIGTERM instead of raising AttributeError (which would crash
        the dashboard kill endpoint out of the box on Windows)."""
        import os
        import signal

        from aictl.dashboard import session_routes

        # Simulate the Windows signal module (no SIGKILL attribute).
        monkeypatch.delattr(signal, "SIGKILL", raising=False)
        sent: list[int] = []
        monkeypatch.setattr(os, "kill", lambda pid, sig: sent.append(sig))

        result = session_routes._kill_session_pids([999999], "KILL")

        assert sent == [signal.SIGTERM]
        assert result["signaled"] == [999999]

    def test_kill_signals_tracked_pids(self, server, monkeypatch):
        from aictl.dashboard import session_routes

        calls = {}

        def fake_kill(pids, sig_name):
            calls["pids"] = list(pids)
            calls["sig"] = sig_name
            return {"signaled": list(pids), "failed": []}

        # Module global resolved at call time → patch is seen by server thread.
        monkeypatch.setattr(session_routes, "_kill_session_pids", fake_kill)
        status, body = _post_json(
            f"{server}/api/session-kill",
            {"session_id": "live-001", "confirm": True},
        )
        assert status == 200
        assert calls["pids"] == [1234]
        assert calls["sig"] == "TERM"
        assert body["signal"] == "SIGTERM"
        assert body["signaled"] == [1234]

    def test_kill_that_reaches_no_process_is_an_error(self, server, monkeypatch):
        from aictl.dashboard import session_routes

        monkeypatch.setattr(session_routes, "_kill_session_pids", lambda pids, sig: {"signaled": [], "failed": list(pids)})
        status, body = _post_json(f"{server}/api/session-kill", {"session_id": "live-001", "confirm": True})
        assert status == 409
        assert "could be stopped" in body["error"]

    def test_kill_of_an_agent_with_no_process_is_not_found(self, server, monkeypatch):
        from aictl.dashboard import session_details, session_routes

        monkeypatch.setattr(session_details, "live_pids_of", lambda *a: [])
        monkeypatch.setattr(session_routes, "_kill_session_pids", lambda *a: pytest.fail("should not signal"))
        status, body = _post_json(f"{server}/api/session-kill", {"session_id": "stored-id", "confirm": True})
        assert status == 404
        assert "no running process" in body["error"]

    def test_kill_requires_confirm(self, server, monkeypatch):
        from aictl.dashboard import session_routes

        monkeypatch.setattr(session_routes, "_kill_session_pids", lambda *a: pytest.fail("should not kill"))
        status, body = _post_json(
            f"{server}/api/session-kill",
            {"session_id": "live-001"},
        )
        assert status == 400
        assert "confirm" in body["error"].lower()

    def test_kill_unknown_session_404(self, recorded_server):
        serve, _seen = recorded_server
        with serve([]) as server:
            status, body = _post_json(
                f"{server}/api/session-kill",
                {"session_id": "nope", "confirm": True},
            )
        assert status == 404

    def test_kill_rejects_bad_signal(self, server):
        status, body = _post_json(
            f"{server}/api/session-kill",
            {"session_id": "live-001", "confirm": True, "signal": "HUP"},
        )
        assert status == 400


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
            "Allowlist must not over-broaden — only .context.toml files, not arbitrary files under root."
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

    def test_api_file_serves_context_toml_after_update(self, tmp_path):
        """End-to-end: GET /api/file?path=<root>/.context.toml returns 200
        with the file body. Prior to the fix this returned 403 'Path not in
        discovered resource set' — see new-ui/captured/SHAPES.md finding #3."""
        from pathlib import Path

        from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

        ctx = tmp_path / ".context.toml"
        ctx_body = "# project context\n[plugin]\nname = 'demo'\n"
        ctx.write_text(ctx_body)

        snap = DashboardSnapshot(
            timestamp=time.time(),
            root=str(tmp_path),
            tools=[],
            sessions=[],
        )
        store = SnapshotStore()
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

            url = f"http://127.0.0.1:{port}/api/file?" + urllib.parse.urlencode({"path": str(ctx)})
            with urllib.request.urlopen(url, timeout=5) as resp:
                assert resp.status == 200, resp.status
                body = resp.read().decode("utf-8")
                assert body == ctx_body, body
        finally:
            srv.shutdown()


# ── Hook ingest: Stop vs SessionEnd ───────────────────────────────


@pytest.fixture()
def hook_server(tmp_path):
    yield from _hook_writer_server(tmp_path, keep_text=True)


def _hook_writer_server(tmp_path, *, keep_text):
    from aictl.stores import Store
    from aictl.stores.testing import MemoryWriter

    writer = MemoryWriter()
    store = SnapshotStore(history_store=Store(writer=writer), keeps_text=lambda: keep_text)
    store.update(_make_snapshot())
    writer.operations.clear()
    for url in _serve_test_store(store, tmp_path):
        yield url, writer


def _hook_rows(writer, family):
    return [row for _, table, rows in writer.operations if table == family for row in rows]


def _hook_session(writer, sid):
    return next((row for row in reversed(_hook_rows(writer, "sessions")) if row["session_id"] == sid), None)


@pytest.fixture()
def tool_hook_server(tmp_path):
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.stores import Store
    from aictl.stores.testing import MemoryWriter

    writer = MemoryWriter()
    store = SnapshotStore(history_store=Store(writer=writer), keeps_text=lambda: True)
    with _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), tmp_path,
                              start_ingesters_now=False) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_address[1]}", writer
        finally:
            server.shutdown()
            thread.join()


def _written_tool_calls(writer):
    calls = {}
    text = {}
    for _, table, rows in writer.operations:
        if table == "tool_invocations":
            calls.update({row["dedup_key"]: row for row in rows})
        elif table == "tool_invocations_text":
            text.update({row["dedup_key"]: row for row in rows})
    return [row | text.get(key, {}) for key, row in calls.items()]


class TestStopHookIsNotTerminal:
    """Regression: Stop fires after EVERY response — it must record per-turn
    stats without stamping ended_at (which made every open session look
    finished and spawn duplicate timeline rows)."""

    SID = "e2fa11bc-aaaa-4abc-9def-1234567890ab"

    def _hook(self, url, event, **detail):
        status, _ = _post_json(
            f"{url}/api/hooks",
            {"event": event, "session_id": self.SID, "tool": "claude-code", **detail},
        )
        assert status == 200

    def test_stop_records_stats_without_ending(self, hook_server):
        url, db = hook_server
        self._hook(url, "SessionStart")
        self._hook(url, "Stop", input_tokens=1200, output_tokens=300)
        row = _hook_session(db, self.SID)
        assert row is not None
        assert row.get("ended_at") in (None, 0), "Stop must not stamp ended_at"
        assert int(row.get("input_tokens") or 0) == 1200
        assert int(row.get("output_tokens") or 0) == 300

    def test_session_end_is_terminal(self, hook_server):
        url, db = hook_server
        self._hook(url, "SessionStart")
        self._hook(url, "Stop")
        self._hook(url, "SessionEnd", input_tokens=1500)
        row = _hook_session(db, self.SID)
        assert row is not None
        assert float(row.get("ended_at") or 0) > 0

    def test_stop_clears_stale_ended_at(self, hook_server):
        """Activity on a session marked ended proves it is not over (resume)."""
        url, db = hook_server
        self._hook(url, "SessionStart")
        self._hook(url, "SessionEnd")
        assert float(_hook_session(db, self.SID).get("ended_at") or 0) > 0
        self._hook(url, "Stop", input_tokens=2000)
        row = _hook_session(db, self.SID)
        assert row.get("ended_at") in (None, 0)
        assert int(row.get("input_tokens") or 0) == 2000


# ── Hook ingest: tool invocation dedup by tool_use_id ─────────────


class TestToolInvocationHookDedup:
    """Regression: hooks always send source_ts=0, so the value-based dedup
    key collapsed legitimate identical repeats — Bash('git status') run
    twice persisted once, and the second PostToolUse overwrote the first
    row's duration.  tool_use_id must keep invocations apart end-to-end."""

    SID = "1b7de111-bbbb-4abc-9def-1234567890ab"

    def _hook(self, url, event, **detail):
        status, _ = _post_json(
            f"{url}/api/hooks",
            {"event": event, "session_id": self.SID, "tool": "claude-code", **detail},
        )
        assert status == 200

    def _pre_post(self, url, tool_use_id, pre_ts, post_ts):
        """One full identical Bash('git status') invocation."""
        self._hook(
            url,
            "PreToolUse",
            ts=pre_ts,
            tool_use_id=tool_use_id,
            tool_name="Bash",
            tool_input={"command": "git status"},
        )
        self._hook(
            url,
            "PostToolUse",
            ts=post_ts,
            tool_use_id=tool_use_id,
            tool_name="Bash",
            tool_input={"command": "git status"},
            tool_response="ok",
        )

    def test_identical_repeats_persist_with_own_durations(self, tool_hook_server):
        url, writer = tool_hook_server
        now = time.time()
        self._pre_post(url, "toolu_01", now, now + 1.0)
        self._pre_post(url, "toolu_02", now + 10.0, now + 12.0)

        rows = {r["source_event_id"]: r for r in _written_tool_calls(writer)}
        assert set(rows) == {"toolu_01", "toolu_02"}
        assert rows["toolu_01"]["duration_ms"] == pytest.approx(1000.0, abs=1.0)
        assert rows["toolu_02"]["duration_ms"] == pytest.approx(2000.0, abs=1.0)
        assert all(r["result_summary"] == "ok" for r in rows.values())

    def test_same_tool_use_id_retried_stays_one_row(self, tool_hook_server):
        url, writer = tool_hook_server
        now = time.time()
        for _ in range(2):
            self._hook(
                url,
                "PreToolUse",
                ts=now,
                tool_use_id="toolu_09",
                tool_name="Bash",
                tool_input={"command": "git status"},
            )
        assert len([r for _, table, rows in writer.operations if table == "tool_invocations" for r in rows]) == 1


# ── Hook ingest: one hook_calls row per hook call ─────────────────


@pytest.fixture()
def metadata_hook_server(tmp_path):
    yield from _hook_writer_server(tmp_path, keep_text=False)


def _hook_calls(writer) -> list[dict]:
    # One hook call, one row: its text columns are empty while text is not kept.
    meta = {r["call_id"]: r for r in _hook_rows(writer, "hook_calls")}
    return [row | {"command": row.get("command") or "", "output": row.get("output") or "",
                   "payload": row.get("full_payload") or row["payload"]} for row in meta.values()]


class TestHookCallsTable:
    SID = "5c0ffee1-cccc-4abc-9def-1234567890ab"

    def _v1(self, call_id="a" * 32, ts=None, **payload):
        """A body as the v1 wrapper sends it."""
        return {
            "session_id": self.SID,
            "cwd": "/work/repo",
            "hook_event_name": "PreToolUse",
            "permission_mode": "default",
            "tool_name": "Bash",
            "tool_use_id": "toolu_77",
            "tool_input": {"command": "git status --short"},
            "agent_id": "agent-3",
            **payload,
            "event": "PreToolUse",
            "aictl_hook": {
                "v": 1,
                "call_id": call_id,
                "ts": time.time() - 60 if ts is None else ts,
                "source": "root.claude-user",
                "pid": 4242,
                "ppid": 4241,
                "py": "/usr/bin/python3",
                "payload_bytes": 321,
                "truncated": False,
                "added": [],
            },
        }

    def test_a_post_stores_one_typed_row(self, hook_server):
        url, writer = hook_server
        call_ts = time.time() - 60
        before = time.time()
        assert _post_json(f"{url}/api/hooks", self._v1(ts=call_ts))[0] == 200
        [r] = _hook_rows(writer, "hook_calls")
        text = r | {"payload": r["full_payload"]}  # one hook call, one row
        assert r["call_id"] == "a" * 32
        assert r["ts"] == call_ts
        assert (text["call_id"], text["project"], text["ts"]) == (r["call_id"], "/work/repo", call_ts)
        assert r["received_at"] >= before
        assert (r["format_version"], r["tool"], r["event"], r["hook_event_name"]) == (1, "claude-code", "PreToolUse", "PreToolUse")
        assert (r["source"], r["session_id"], r["agent_id"], r["project_path"]) == (
            "root.claude-user",
            self.SID,
            "agent-3",
            "/work/repo",
        )
        assert (r["hook_pid"], r["hook_ppid"], r["tool_name"], r["tool_use_id"]) == (4242, 4241, "Bash", "toolu_77")
        assert (r["permission_mode"], r["payload_bytes"], r["truncated"], r["wrapped"]) == ("default", 321, 0, 0)
        assert r["exit_code"] is None
        payload = json.loads(text["payload"])
        assert "aictl_hook" not in payload and "event" not in payload
        assert payload["tool_input"] == {"command": "git status --short"}
        assert payload["hook_event_name"] == "PreToolUse"
        # The events row is still written as before.
        kinds = [r["kind"] for r in _hook_rows(writer, "events") if r["session_id"] == self.SID]
        assert kinds == ["hook:PreToolUse"]

    def test_the_same_body_posted_twice_is_one_row(self, hook_server):
        url, db = hook_server
        body = self._v1(call_id="b" * 32)
        for _ in range(2):
            assert _post_json(f"{url}/api/hooks", body)[0] == 200
        assert len(_hook_calls(db)) == 1

    def test_a_post_from_an_old_wrapper_gets_version_0_and_a_derived_id(self, hook_server):
        url, db = hook_server
        old = {"event": "Stop", "session_id": self.SID, "cwd": "/w", "aictl_hook": {"source": "root.claude-user", "pid": 9}}
        for _ in range(2):
            assert _post_json(f"{url}/api/hooks", old)[0] == 200
        assert _post_json(f"{url}/api/hooks", {**old, "stop_hook_active": True})[0] == 200
        rows = _hook_calls(db)
        assert len(rows) == 2  # the identical retry dedups; another body does not
        assert {r["format_version"] for r in rows} == {0}
        assert all(r["call_id"].startswith("body:") and len(r["call_id"]) == 37 for r in rows)
        assert rows[0]["call_id"] != rows[1]["call_id"]
        assert rows[0]["ts"] == rows[0]["received_at"]  # no call time was sent
        assert rows[0]["hook_event_name"] == ""

    def test_an_insane_call_time_falls_back_to_receipt(self, hook_server):
        url, db = hook_server
        _post_json(f"{url}/api/hooks", self._v1(call_id="c" * 32, ts=-5))
        r = _hook_calls(db)[0]
        assert r["ts"] == r["received_at"]

    def test_a_verify_ping_stores_no_call(self, hook_server):
        url, db = hook_server
        status, body = _post_json(f"{url}/api/hooks", {"event": "Stop", "session_id": "aictl-verify", "_aictl_verify": True})
        assert status == 200 and body.get("verify") is True
        assert _hook_calls(db) == []

    def test_a_wrapped_user_hook_stores_only_its_call(self, hook_server):
        """aictl's own hook on the same event reports the event: a wrapped call must not count it twice."""
        url, writer = hook_server
        body = self._v1(call_id="d" * 32)
        body["aictl_hook"]["wrapped"] = {
            "command": "~/bin/guard.sh --strict",
            "exit_code": 2,
            "duration_ms": 12.5,
            "overhead_ms": 3.25,
            "stdout_bytes": 61,
            "stderr_bytes": 4,
            "stdout": json.dumps({"hookSpecificOutput": {"permissionDecision": "deny"}}),
        }
        assert _post_json(f"{url}/api/hooks", body)[0] == 200
        [r] = _hook_rows(writer, "hook_calls")
        text = r  # one hook call, one row
        assert (r["call_id"], r["project"]) == (text["call_id"], text["project"]) == ("d" * 32, "/work/repo")
        assert (r["wrapped"], r["exit_code"], r["duration_ms"], r["overhead_ms"]) == (1, 2, 12.5, 3.25)
        assert (r["stdout_bytes"], r["stderr_bytes"], r["decision"]) == (61, 4, "deny")
        assert text["command"] == "~/bin/guard.sh --strict"
        assert r["command_hash"] == hashlib.sha256(b"~/bin/guard.sh --strict").hexdigest()[:16]
        assert "permissionDecision" in text["output"]
        assert not _hook_rows(writer, "events")
        assert not _hook_rows(writer, "tool_invocations")
        assert _hook_session(writer, self.SID) is None

    @pytest.mark.parametrize(
        ("stdout", "exit_code", "decision"),
        [
            ('{"decision": "block", "reason": "no"}', 0, "block"),
            ('{"continue": false}', 0, "stop"),
            ("not json", 2, "block"),
            ("", 0, ""),
        ],
    )
    def test_the_decision_of_a_wrapped_hook(self, stdout, exit_code, decision):
        from aictl.dashboard.ingest_http import _hook_decision

        assert _hook_decision(stdout, exit_code) == decision

    def test_metadata_mode_stores_no_text(self, metadata_hook_server):
        url, db = metadata_hook_server
        body = self._v1(call_id="e" * 32, prompt="my secret prompt", tool_response={"stdout": "secret output"})
        body["aictl_hook"]["wrapped"] = {"command": "secret.sh --token X", "exit_code": 0, "stdout": "secret"}
        _post_json(f"{url}/api/hooks", self._v1(call_id="f" * 32, prompt="my secret prompt"))
        _post_json(f"{url}/api/hooks", body)
        assert all(r.get("command") is None and r.get("full_payload") is None for r in _hook_rows(db, "hook_calls"))
        rows = _hook_calls(db)
        assert len(rows) == 2
        for r in rows:
            assert "secret" not in r["payload"] and "git status" not in r["payload"]
            payload = json.loads(r["payload"])
            assert "tool_input" not in payload and "prompt" not in payload and "tool_response" not in payload
            assert payload["prompt_chars"] == len("my secret prompt")
            assert payload["tool_name"] == "Bash"  # names stay
            assert r["command"] == "" and r["output"] == ""
        assert rows[1]["command_hash"] == hashlib.sha256(b"secret.sh --token X").hexdigest()[:16]


# ── Events API ────────────────────────────────────────────────────


class TestEventsAPI:
    columns = dict(ts="real", tool="string", kind="string", detail="string", session_id="string", pid="long")
    end = [200.0, "copilot-cli", "session_end", '{"session_id":"sess-001"}', "sess-001", 0]
    start = [100.0, "claude-code", "session_start", '{"session_id":"sess-002"}', "sess-002", 0]

    def test_count_is_not_limited_by_the_page(self, recorded_server):
        serve, seen = recorded_server
        queries = [
            ("events.page", self.columns, [self.end, self.start]),
            ("events.count", {"count": "long"}, [[2]]),
        ]
        with serve(queries) as server:
            page = _get_json(f"{server}/api/events?since=50&limit=1")
            count = _get_json(f"{server}/api/events/count?since=50")["count"]
            all_events = _get_json(f"{server}/api/events?since=50&limit=2000")
        assert len(page) == 1 and count == len(all_events) == 2
        assert {e["kind"] for e in all_events} == {"session_end", "session_start"}
        assert seen[0][1].get_parameter("row_limit", None) == "2"
        assert seen[1][1].get_parameter("since", None) == seen[0][1].get_parameter("since", None) == "50.0"

    @pytest.mark.parametrize(("filter_query", "parameter", "value"), [
        ("tool=copilot-cli", "requested_tool", "copilot-cli"),
        ("kind=session_end", "requested_kinds", 'dynamic(["session_end"])'),
        ("session_id=sess-001", "requested_session", "sess-001"),
    ])
    def test_filter_and_detail(self, recorded_server, filter_query, parameter, value):
        serve, seen = recorded_server
        with serve([("events.page", self.columns, [self.end])]) as server:
            data = _get_json(f"{server}/api/events?since=50&{filter_query}")
        assert data == [{
            "ts": 200.0, "tool": "copilot-cli", "kind": "session_end",
            "detail": {"session_id": "sess-001"}, "session_id": "sess-001", "pid": 0,
        }]
        assert seen[0][1].get_parameter(parameter, None) == value


# ── API Calls endpoint: OTel attribute extraction ─────────────────


@pytest.fixture()
def api_calls_server(recorded_server):
    """Replay OTel API request and error rows with real OTel attribute names."""
    from aictl.dashboard.otel_receiver import API_ERROR_EVENTS, API_REQUEST_EVENTS

    events = []
    now = time.time()

    # Successful request with real OTel keys: finish_reasons list + http.status_code
    events.append(
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
    events.append(
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
    events.append(
        EventRow(
            ts=now - 20,
            tool="claude-code",
            kind="otel:api_request",
            detail={"model": "claude-sonnet-4-5", "duration_ms": 180},
        )
    )
    # Copilot / generic OTel GenAI span — uses namespaced gen_ai.* keys only
    events.append(
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
    events.append(
        EventRow(
            ts=now - 40,
            tool="codex-cli",
            kind="otel:codex.api_request",
            detail={"model": "gpt-5", "duration_ms": 300},
        )
    )
    columns = dict(ts="real", tool="string", kind="string", detail="string", session_id="string", pid="long")
    queries = []
    for name in (*API_REQUEST_EVENTS, *API_ERROR_EVENTS):
        rows = [
            [e.ts, e.tool, e.kind, json.dumps(e.detail), e.session_id, e.pid]
            for e in events if e.kind == f"otel:{name}"
        ]
        queries.append(("events.page", columns, rows))
    serve, _seen = recorded_server
    with serve(queries) as url:
        yield url


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


class TestHookVerifyPingIsNotPersisted:
    """`aictl hooks verify` POSTs synthetic payloads flagged _aictl_verify for
    every event. They must be acknowledged (HTTP 200) but never stored — the
    SessionStart ping used to upsert a phantom 'aictl-verify' session that
    showed up in every session list."""

    def test_verify_ping_returns_ok_without_writing(self, hook_server):
        url, db = hook_server
        for event in ("SessionStart", "UserPromptSubmit", "Stop", "SessionEnd"):
            status, body = _post_json(
                f"{url}/api/hooks",
                {"event": event, "session_id": "aictl-verify", "_aictl_verify": True},
            )
            assert status == 200
            assert body.get("ok") is True
        assert not db.operations


class TestPostToolUseFailureMarksError:
    """Claude Code fires PostToolUse only on success; failures arrive as
    PostToolUseFailure with an ``error`` field. The receiver used to ignore
    that event, so hook-sourced tool error rate was structurally 0%."""

    SID = "c3d4e5f6-cccc-4abc-9def-1234567890ab"

    def _hook(self, url, event, **detail):
        status, _ = _post_json(
            f"{url}/api/hooks",
            {"event": event, "session_id": self.SID, "tool": "claude-code", **detail},
        )
        assert status == 200

    def test_failure_closes_pending_invocation_with_error(self, tool_hook_server):
        url, writer = tool_hook_server
        now = time.time()
        self._hook(url, "PreToolUse", ts=now, tool_use_id="toolu_f1", tool_name="Bash", tool_input={"command": "false"})
        self._hook(
            url,
            "PostToolUseFailure",
            ts=now + 0.5,
            tool_use_id="toolu_f1",
            tool_name="Bash",
            tool_input={"command": "false"},
            error="exit status 1",
        )
        rows = _written_tool_calls(writer)
        assert len(rows) == 1
        row = rows[0]
        assert row["is_error"] == 1
        assert row["duration_ms"] == pytest.approx(500.0, abs=1.0)
        assert "exit status 1" in row["result_summary"]

    def test_failure_without_pre_is_stored_as_error(self, tool_hook_server):
        url, writer = tool_hook_server
        self._hook(url, "PostToolUseFailure", tool_use_id="toolu_f2", tool_name="Read", error="ENOENT")
        rows = _written_tool_calls(writer)
        assert [r["is_error"] for r in rows] == [1]


# ── Settings files API ────────────────────────────────────────────

SETTINGS_FILE_KEYS = {
    "path",
    "name",
    "location",
    "location_root",
    "scope",
    "kind",
    "tools",
    "settings",
    "top_level_keys",
    "bytes",
    "mtime",
    "git_state",
    "loading",
    "exists",
    "is_dir",
}


@pytest.fixture()
def settings_files_server(tmp_path, monkeypatch):
    """A server whose snapshot names files in a temp home and a temp project."""
    from aictl import context_audit, platforms, tool_homes
    from aictl.dashboard.audit_cache import AUDIT_CACHE
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

    home = tmp_path / "home"
    root = tmp_path / "project"
    (home / ".claude").mkdir(parents=True)
    (root / ".claude").mkdir(parents=True)
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setattr(platforms, "claude_global_dir", lambda: home / ".claude")
    monkeypatch.setattr(platforms, "vscode_user_dir", lambda: home / "Library" / "Code" / "User")
    monkeypatch.setattr(tool_homes, "homes", lambda tool=None: [])

    def no_scan(*_a, **_k):
        raise AssertionError("the settings files route must not start an audit scan")

    monkeypatch.setattr(context_audit, "run_audit", no_scan)
    AUDIT_CACHE.clear()

    user_file = home / ".claude" / "settings.json"
    user_file.write_text('{"model": "opus"}')
    account_file = home / ".claude.json"
    account_file.write_text("{}")
    proj_file = root / ".claude" / "settings.json"
    proj_file.write_text('{"model": "sonnet"}')
    missing = home / ".codex" / "config.toml"

    def rows(*sources):
        return [
            {"id": "other", "title": "Other", "rows": [{"key": f"k{i}", "source": s} for i, s in enumerate(sources)]}
        ]

    snap = _make_snapshot()
    snap.tool_configs = [
        {
            "tool": "claude-code",
            "config_files": [str(user_file), str(account_file), str(proj_file)],
            "sections": rows(str(user_file), str(user_file), str(proj_file), "", "user"),
        },
        {"tool": "codex-cli", "config_files": [str(missing)], "sections": rows(str(missing))},
        {"tool": "claude-desktop", "config_files": [str(user_file)], "sections": []},
    ]
    snap.live_monitor = {"workspace_paths": [str(root)], "state_paths": [str(home / ".claude")]}
    store = SnapshotStore()
    store.update(snap)
    srv = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), root)
    thread = threading.Thread(target=srv.serve_forever, daemon=True)
    thread.start()
    yield (
        f"http://127.0.0.1:{srv.server_address[1]}",
        {
            "home": home,
            "root": root,
            "user": user_file,
            "account": account_file,
            "proj": proj_file,
            "missing": missing,
        },
    )
    srv.shutdown()
    AUDIT_CACHE.clear()


class TestSettingsFilesAPI:
    def test_shape(self, settings_files_server):
        url, _paths = settings_files_server
        data = _get_json(f"{url}/api/settings/files")
        assert set(data) == {"files", "generated_at"}
        assert isinstance(data["generated_at"], float)
        assert data["files"]
        for f in data["files"]:
            assert set(f) == SETTINGS_FILE_KEYS, f["path"]
            assert f["location"] in ("home", "tool-home", "project", "vscode-user", "other")
            assert f["kind"] in (
                "settings",
                "instructions",
                "agents",
                "skills",
                "prompts",
                "hooks",
                "mcp",
                "memory",
                "other",
            )
            assert f["git_state"] in ("tracked", "ignored", "untracked", "outside-repo", "")

    def test_location_grouping_home_vs_project(self, settings_files_server):
        url, p = settings_files_server
        files = {f["path"]: f for f in _get_json(f"{url}/api/settings/files")["files"]}
        user = files[str(p["user"])]
        assert (user["location"], user["location_root"]) == ("tool-home", str(p["home"] / ".claude"))
        assert user["scope"] == "user" and user["kind"] == "settings"
        account = files[str(p["account"])]
        assert (account["location"], account["location_root"]) == ("home", str(p["home"]))
        proj = files[str(p["proj"])]
        assert (proj["location"], proj["location_root"]) == ("project", str(p["root"]))
        assert proj["scope"] == "project"
        assert user["git_state"] == "outside-repo"

    def test_settings_counts_and_tools(self, settings_files_server):
        url, p = settings_files_server
        files = {f["path"]: f for f in _get_json(f"{url}/api/settings/files")["files"]}
        assert files[str(p["user"])]["settings"] == 2
        assert files[str(p["proj"])]["settings"] == 1
        assert files[str(p["account"])]["settings"] == 0
        assert files[str(p["user"])]["tools"] == ["claude-code", "claude-desktop"]
        assert files[str(p["user"])]["exists"] is True and files[str(p["user"])]["bytes"] > 0

    def test_missing_path_is_listed_with_exists_false(self, settings_files_server):
        url, p = settings_files_server
        files = {f["path"]: f for f in _get_json(f"{url}/api/settings/files")["files"]}
        missing = files[str(p["missing"])]
        assert missing["exists"] is False
        assert missing["bytes"] is None and missing["mtime"] is None  # unknown, never 0
        assert missing["tools"] == ["codex-cli"] and missing["settings"] == 1

    def test_monitor_folders_are_dir_entries(self, settings_files_server):
        url, p = settings_files_server
        files = {f["path"]: f for f in _get_json(f"{url}/api/settings/files")["files"]}
        folder = files[str(p["home"] / ".claude")]
        assert folder["is_dir"] is True and folder["kind"] == "other"
        assert files[str(p["root"])]["is_dir"] is True

    def test_cached_audit_rows_are_merged(self, settings_files_server, monkeypatch):
        from aictl.dashboard.audit_cache import AUDIT_CACHE

        url, p = settings_files_server
        agents_md = p["root"] / "AGENTS.md"
        agents_md.write_text("# rules\nSECRET-TEXT\n")
        audit = {
            "sources": [
                {
                    "tool": "codex-cli",
                    "scope": "project",
                    "path": str(agents_md),
                    "kind": "instructions",
                    "loading": "always",
                },
                {
                    "tool": "claude-code",
                    "scope": "project",
                    "path": str(p["proj"]),
                    "kind": "settings",
                    "loading": "config",
                },
                {
                    "tool": "claude-code",
                    "scope": "dynamic",
                    "path": "process flags",
                    "kind": "system-prompt",
                    "loading": "dynamic",
                    "readable": False,
                },
            ]
        }
        monkeypatch.setattr(AUDIT_CACHE, "_fresh", lambda key: audit)
        data = _get_json(f"{url}/api/settings/files")
        files = {f["path"]: f for f in data["files"]}
        assert files[str(agents_md)]["kind"] == "instructions"
        assert files[str(agents_md)]["loading"] == "always"
        assert files[str(agents_md)]["tools"] == ["codex-cli"]
        assert files[str(p["proj"])]["loading"] == "config"
        assert "process flags" not in files
        assert "SECRET-TEXT" not in json.dumps(data)  # file contents are never returned

    def test_git_state_for_project_files_only(self, settings_files_server):
        import shutil
        import subprocess

        if shutil.which("git") is None:
            pytest.skip("git not installed")
        url, p = settings_files_server
        root = p["root"]
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run(["git", "-C", str(root), "add", ".claude/settings.json"], check=True)
        files = {f["path"]: f for f in _get_json(f"{url}/api/settings/files")["files"]}
        assert files[str(p["proj"])]["git_state"] == "tracked"
        assert files[str(p["user"])]["git_state"] == "outside-repo"


class TestSettingsToolsAPI:
    """The settings screen's own data: complete records, while the snapshot carries only set knobs."""

    @staticmethod
    def _records():
        rows = [
            {"key": "model", "label": "Model", "value": "opus", "set": True, "source": "/x/settings.json"},
            {"key": "effortLevel", "label": "Reasoning effort", "value": "high", "set": False, "source": ""},
        ]
        return [{"tool": "claude-code", "sections": [{"id": "model", "title": "Model", "rows": rows}], "scopes": []}]

    def test_slim_drops_only_unset_rows(self):
        from aictl.orchestrator import slim_tool_configs

        slim = slim_tool_configs(self._records())
        keys = [r["key"] for sec in slim[0]["sections"] for r in sec["rows"]]
        assert keys == ["model"]
        # The input is left alone.
        assert len(self._records()[0]["sections"][0]["rows"]) == 2

    def test_slim_keeps_records_without_sections(self):
        from aictl.orchestrator import slim_tool_configs

        assert slim_tool_configs([{"tool": "copilot365", "hints": ["x"]}]) == [{"tool": "copilot365", "hints": ["x"]}]

    def test_endpoint_returns_full_records_and_labels(self, tmp_path, monkeypatch):
        from aictl import orchestrator
        from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

        monkeypatch.setattr(orchestrator, "_FULL_TOOL_CONFIGS", self._records())
        snap = _make_snapshot()
        snap.tool_configs = orchestrator.slim_tool_configs(self._records())
        from aictl.dashboard.models import DashboardTool

        snap.tools = [DashboardTool(tool="claude-code", label="Claude Code")]
        snap.live_monitor = {"diagnostics": {"process:psutil": {"status": "active"}}, "workspace_paths": [str(tmp_path)]}
        store = SnapshotStore()
        store.update(snap)
        srv = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), str(tmp_path))
        thread = threading.Thread(target=srv.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{srv.server_address[1]}"
            data = _get_json(f"{url}/api/settings/tools")
            assert set(data) == {"generated_at", "tools", "tool_configs", "monitor"}
            assert data["tools"] == [{"tool": "claude-code", "label": "Claude Code"}]
            keys = [r["key"] for sec in data["tool_configs"][0]["sections"] for r in sec["rows"]]
            assert keys == ["model", "effortLevel"]
            assert data["monitor"]["workspace_paths"] == [str(tmp_path)]
            assert data["monitor"]["diagnostics"]["process:psutil"]["status"] == "active"
        finally:
            srv.shutdown()
            srv.server_close()


# ── Settings file editor ──────────────────────────────────────────


@pytest.fixture()
def editor_server(tmp_path):
    """A server whose allowed file set holds one settings file in a temp folder."""
    import os
    from pathlib import Path

    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

    root = tmp_path / "project"
    (root / ".claude").mkdir(parents=True)
    f = root / ".claude" / "settings.json"
    f.write_text('{\n  "a": 1\n}\n', newline="\n")
    other = root / ".claude" / "other.json"
    other.write_text("{}\n")
    store = SnapshotStore()
    store.update(_make_snapshot())
    allowed = AllowedPaths()
    allowed._paths.add(os.path.realpath(str(f)))
    srv = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, allowed, Path(root))
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}", f, other
    srv.shutdown()


def _request_status(url, method="GET", payload=None, headers=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


class TestSettingsFileEditor:
    def test_get_returns_the_text_and_the_mtime(self, editor_server):
        base, f, _other = editor_server
        data = _get_json(f"{base}/api/settings/file?path={urllib.parse.quote(str(f))}")
        assert data["text"] == '{\n  "a": 1\n}\n'
        assert data["mtime"] == f.stat().st_mtime
        assert data["masked"] is False

    def test_put_writes_the_file_and_answers_with_the_new_text(self, editor_server):
        base, f, _other = editor_server
        before = _get_json(f"{base}/api/settings/file?path={urllib.parse.quote(str(f))}")
        status, data = _request_status(f"{base}/api/settings/file", "PUT", {"path": str(f), "text": '{"a": 2}\n', "expected_mtime": before["mtime"]})
        assert status == 200
        assert f.read_text() == '{"a": 2}\n'
        assert data["text"] == '{"a": 2}\n'
        assert data["backup_path"].startswith(str(f) + ".bak.")

    def test_a_file_outside_the_found_set_is_refused_on_both_verbs(self, editor_server):
        base, _f, other = editor_server
        assert _get_status(f"{base}/api/settings/file?path={urllib.parse.quote(str(other))}") == 403
        status, data = _request_status(f"{base}/api/settings/file", "PUT", {"path": str(other), "text": '{"b": 1}'})
        assert status == 403
        assert other.read_text() == "{}\n"
        assert "scan" in data["error"]

    def test_a_write_with_a_foreign_host_header_is_refused(self, editor_server):
        base, f, _other = editor_server
        status, _ = _request_status(f"{base}/api/settings/file", "PUT", {"path": str(f), "text": "{}"}, headers={"Host": "evil.example"})
        assert status == 403
        assert f.read_text() == '{\n  "a": 1\n}\n'

    def test_invalid_json_is_refused_with_the_parser_message(self, editor_server):
        base, f, _other = editor_server
        status, data = _request_status(f"{base}/api/settings/file", "PUT", {"path": str(f), "text": "{nope"})
        assert status == 400
        assert "unchanged" in data["error"]
        assert f.read_text() == '{\n  "a": 1\n}\n'

# ── Removed routes stay removed ───────────────────────────────────

# Routes the old tab UI called. The board, the Python client and the CLI do
# not, so the server answers 404 for them; a route added back here must have
# a caller first.
REMOVED_ROUTES = (
    "/api/board",
    "/api/budget",
    "/api/history",
    "/api/self-status",
    "/api/session-timeline",
    "/api/sessions",
    "/api/file-writes",
    "/api/data-quality",
    "/api/files/history",
    "/api/files",
    "/api/telemetry",
    "/api/usage",
    "/api/project-costs",
    "/api/session-runs",
    "/api/session-cost-by-model",
    "/api/session-tool-calls",
    "/api/session-subprocesses",
    "/api/session-flow",
    "/api/session-memory-diff",
    "/api/session-messages",
    "/api/transcript/some-session",
    "/api/transcripts",
    "/api/ingesters",
    "/api/analytics",
    "/api/agent-teams",
)


@pytest.mark.parametrize("path", REMOVED_ROUTES)
def test_removed_route_is_not_served(server, path):
    assert _get_status(f"{server}{path}?session_id=sess-001") == 404
