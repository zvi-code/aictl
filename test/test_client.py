"""Tests for aictl.client — ServerClient."""

from __future__ import annotations

import io
import json
from urllib.parse import parse_qs, urlsplit

import pytest

from aictl.client import LiveProtocolError, ServerClient
from aictl.dashboard.contract import CONTRACT_VERSION


class TestServerClient:
    def test_try_connect_no_server(self):
        """Should return None when no server is running."""
        import socket

        # A port this test holds without listening: nothing else can serve it, and a connect is refused.
        with socket.socket() as held:
            held.bind(("127.0.0.1", 0))
            client = ServerClient.try_connect(port=held.getsockname()[1], timeout=0.05)
        assert client is None

    def test_constructor(self):
        client = ServerClient("http://127.0.0.1:8484")
        assert client.base_url == "http://127.0.0.1:8484"

    def test_constructor_strips_trailing_slash(self):
        client = ServerClient("http://127.0.0.1:8484/")
        assert client.base_url == "http://127.0.0.1:8484"

    def test_repr(self):
        client = ServerClient("http://localhost:8484")
        assert "localhost:8484" in repr(client)


def frame(event, sequence, *, epoch="daemon", scope="", **payload):
    cursor = f"{epoch}:{sequence}"
    envelope = dict(protocol=1, epoch=epoch, sequence=sequence, cursor=cursor, scope=scope, **payload)
    head, tail = json.dumps(envelope, ensure_ascii=False).split(", ", 1)
    return f"id: {cursor}\r\nevent: {event}\r\ndata: {head},\r\ndata:{tail}\r\n\r\n".encode()


def entity(topic, entity_id, **data):
    return {"topic": topic, "id": entity_id, "data": data}


@pytest.mark.parametrize("changes, expected", [
    ({}, True), ({"protocol": 99}, False), ({"contract_version": -1}, False), ({"enabled": False}, False),
])
def test_probe_checks_live_versions(monkeypatch, changes, expected):
    def open_capabilities(request, *, timeout):
        assert urlsplit(request.full_url).path == "/api/live/capabilities"
        assert timeout == 0.25
        caps = {"enabled": True, "protocol": 1, "contract_version": CONTRACT_VERSION, "stream": "/api/live/stream"}
        return io.BytesIO(json.dumps(caps | changes).encode())

    monkeypatch.setattr("urllib.request.urlopen", open_capabilities)
    assert (ServerClient.try_connect(timeout=0.25) is not None) == expected


def test_live_bootstrap_changes_removal_and_resume(monkeypatch):
    process = entity("runtime.process", "same", pid=42, name="日本")
    field = entity("history.board", "same", field="kpis", value={"sessions": 2})
    scope = "project=x+y"
    first = io.BytesIO(
        b": keepalive\n\n"
        + frame("bootstrap", 2, scope=scope, entities=[process, field])
        + frame("change", 8, scope=scope, upserts=[], removals=[{"topic": "runtime.process", "id": "same"}])
        + frame("change", 7, scope=scope, upserts=[process], removals=[])
    )
    second = io.BytesIO(
        frame("change", 14, scope=scope, upserts=[entity("runtime.process", "new", pid=43)], removals=[])
    )
    requests = []

    def open_stream(request, **_):
        assert request.get_header("Accept") == "text/event-stream"
        requests.append(urlsplit(request.full_url))
        return (first, second)[len(requests) - 1]

    monkeypatch.setattr("urllib.request.urlopen", open_stream)
    client = ServerClient("http://localhost:8484")
    boot, changed = client.stream({"project": "x y"})
    assert list(boot.values("runtime.process")) == [process["data"]]
    assert list(changed.values("runtime.process")) == []
    assert list(changed.values("history.board")) == [field["data"]]
    resumed, = client.stream({"project": "x y"}, resume=changed)
    assert resumed.cursor == "daemon:14"
    assert list(resumed.values("runtime.process")) == [{"pid": 43}]
    assert list(resumed.values("history.board")) == [field["data"]]
    assert all(r.path == "/api/live/stream" for r in requests)
    assert parse_qs(requests[0].query) == {"history": ["1"], "project": ["x y"]}
    assert parse_qs(requests[1].query)["cursor"] == ["daemon:8"]
    assert first.closed and second.closed


@pytest.mark.parametrize("replacement", ["resync", "bootstrap", "reset"])
def test_resync_discards_old_entities(monkeypatch, replacement):
    marker = frame("reset", 4) if replacement == "reset" else b""
    event = "bootstrap" if replacement == "reset" else replacement
    response = io.BytesIO(
        frame("bootstrap", 3, entities=[entity("runtime.agent", "old", session_id="old")])
        + marker
        + frame(event, 1, epoch="new-daemon", entities=[entity("runtime.agent", "new", session_id="new")])
        + frame("change", 5, epoch="new-daemon", upserts=[], removals=[{"topic": "runtime.agent", "id": "new"}])
    )
    monkeypatch.setattr("urllib.request.urlopen", lambda *_args, **_kw: response)
    boot, reset, change = ServerClient("http://localhost:8484").stream()
    assert boot.cursor == "daemon:3"
    assert reset.cursor == "new-daemon:1"
    assert list(reset.values("runtime.agent")) == [{"session_id": "new"}]
    assert not list(change.values("runtime.agent"))


def test_one_shot_requires_bootstrap_and_closes_response(monkeypatch):
    client = ServerClient("http://localhost:8484")
    response = io.BytesIO(frame("bootstrap", 1, entities=[]))
    monkeypatch.setattr("urllib.request.urlopen", lambda *_args, **_kw: response)
    assert client.read_live().cursor == "daemon:1"
    assert response.closed
    response = io.BytesIO(frame("change", 1, upserts=[], removals=[]))
    with pytest.raises(LiveProtocolError, match="matching bootstrap"):
        client.read_live()
    assert response.closed


@pytest.fixture
def terminal_transport(monkeypatch):
    from aictl.dashboard.models import DashboardSnapshot, DashboardTool
    from aictl.dashboard.projections.terminal import terminal_detail
    from aictl.tools import ProcessInfo, ResourceFile

    snapshot = DashboardSnapshot(
        100, ".", [DashboardTool(
            "copilot-cli", "Copilot CLI",
            files=[ResourceFile("guide.md", "instructions", tokens=3)],
            processes=[ProcessInfo(42, "copilot", "copilot --flag"), ProcessInfo(99, "gone", "gone")],
        )],
        sessions=[{"session_id": "monitor", "tool": "copilot-cli", "pids": [42], "exact_input_tokens": 4}],
    )
    _, resources = terminal_detail("resources", {"export": ["1"]}, snapshot, None, None, 100)
    runtime = [
        entity("runtime.process", "pid-42", tool="copilot-cli", pid=42, name="copilot", present=True,
               cpu_percent=2.5, memory_rss_bytes=3 * 1048576),
        entity("runtime.agent", "agent-42", tool="copilot-cli", session_id="native",
               monitor_session_id="monitor", pids=[42], running=True, cpu_percent=2.5),
    ]
    responses = {
        "/api/live/capabilities": {"enabled": True, "protocol": 1, "contract_version": CONTRACT_VERSION,
                                   "stream": "/api/live/stream"},
        "/api/board/terminal/resources": resources,
        "/api/board/terminal/sessions": snapshot.sessions,
        "/api/board/terminal/events": [],
        "/api/board/terminal/metrics": [{"metric": "aictl.cpu", "last_value": 2.5, "count": 1}],
    }
    paths = []

    def open_request(request, **_):
        url = urlsplit(request.full_url)
        paths.append(url.path)
        if url.path == "/api/live/stream":
            assert parse_qs(url.query) == {"history": ["0"]}
            return io.BytesIO(frame("bootstrap", 5, entities=runtime))
        return io.BytesIO(json.dumps(responses[url.path]).encode())

    monkeypatch.setattr("urllib.request.urlopen", open_request)
    return paths


def test_status_json_reads_contract(terminal_transport):
    from click.testing import CliRunner

    from aictl.commands.status import status

    result = CliRunner().invoke(status, ["--json"])
    assert result.exit_code == 0, result.exception
    snapshot = json.loads(result.stdout)
    assert [p["pid"] for p in snapshot["tools"][0]["processes"]] == [42]
    assert snapshot["tools"][0]["files"][0]["tokens"] == 3
    assert snapshot["sessions"][0]["exact_input_tokens"] == 4
    assert "tools_rev" in snapshot
    assert terminal_transport[:2] == ["/api/live/capabilities", "/api/live/stream"]


def test_tui_refresh_uses_live_state_and_contract_details(monkeypatch, tmp_path, terminal_transport):
    from types import SimpleNamespace

    pytest.importorskip("textual")
    from aictl.dashboard import tui

    app = tui.DashboardApp(tmp_path, include_live_monitor=False)
    app._client = ServerClient.try_connect()
    app._live_state = app._client.read_live()
    collected = []
    monkeypatch.setattr(tui, "get_current_worker", lambda: SimpleNamespace(is_cancelled=False))
    monkeypatch.setattr(app, "call_from_thread", lambda callback, *args: callback(*args))
    monkeypatch.setattr(app, "_apply_snapshot", collected.append)
    monkeypatch.setattr(app, "_update_metrics_table", collected.append)
    app._do_refresh.__wrapped__(app)
    snap, metrics = collected
    assert snap.sessions[0]["pids"] == [42]
    assert snap.tools[0].processes[0].cpu_pct == "2.5"
    assert metrics[0]["last_value"] == 2.5
    assert "/api/board/terminal/metrics" in terminal_transport


class TestDashboardSnapshotFromDict:
    def test_round_trip(self):
        """from_dict should reconstruct a snapshot from to_dict output."""
        from aictl.dashboard.models import DashboardSnapshot, DashboardTool
        from aictl.tools import ResourceFile

        snap = DashboardSnapshot(
            timestamp=1000.0,
            root="/test",
            tools=[
                DashboardTool(
                    tool="claude-code",
                    label="Claude Code",
                    vendor="anthropic",
                    host="cli,vscode",
                    files=[
                        ResourceFile(
                            path="/test/CLAUDE.md",
                            tool="claude-code",
                            kind="instructions",
                            size=100,
                            tokens=25,
                        )
                    ],
                    processes=[{"pid": 123, "name": "claude", "cpu_pct": 5.0, "mem_mb": 256}],
                ),
            ],
        )

        d = snap.to_dict()
        restored = DashboardSnapshot.from_dict(d)

        assert restored.timestamp == 1000.0
        assert restored.root == "/test"
        assert len(restored.tools) == 1
        assert restored.tools[0].tool == "claude-code"
        assert restored.tools[0].vendor == "anthropic"
        assert len(restored.tools[0].files) == 1
        assert restored.tools[0].files[0].tokens == 25

    def test_from_empty_dict(self):
        from aictl.dashboard.models import DashboardSnapshot

        snap = DashboardSnapshot.from_dict({})
        assert snap.timestamp == 0
        assert snap.tools == []
        assert snap.agent_memory == []

    def test_from_partial_dict(self):
        from aictl.dashboard.models import DashboardSnapshot

        snap = DashboardSnapshot.from_dict(
            {
                "timestamp": 2000.0,
                "root": "/x",
                "tools": [{"tool": "test", "label": "Test"}],
            }
        )
        assert snap.timestamp == 2000.0
        assert len(snap.tools) == 1
        assert snap.tools[0].tool == "test"
