"""A relaunch closes the daemon's port only while the process starts.

The port opens before the first snapshot: hooks and OpenTelemetry are taken at once, so a
tool that sends during a relaunch is not refused; the board's requests wait for the snapshot.
"""

from __future__ import annotations

import json
import socket
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from aictl.dashboard import web_server
from aictl.dashboard.models import DashboardSnapshot
from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
from aictl.orchestrator import AllowedPaths, SnapshotStore
from aictl.storage import HistoryDB


@pytest.fixture
def starting(tmp_path):
    """A server whose first snapshot is not ready yet."""
    db = HistoryDB(db_path=str(tmp_path / "start.db"), flush_interval=0)
    store = SnapshotStore(db=db)
    srv = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), Path("/tmp"))
    srv.ready.clear()
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{srv.server_address[1]}", srv, store
    srv.ready.set()
    srv.shutdown()
    db.close()


def _post(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        return resp.status


def test_telemetry_and_hooks_are_taken_before_the_first_snapshot(starting):
    base, _srv, _store = starting
    t0 = time.monotonic()
    assert _post(base + "/v1/metrics", {"resourceMetrics": []}) == 200
    assert _post(base + "/v1/logs", {"resourceLogs": []}) == 200
    assert _post(base + "/api/hooks", {"event": "Stop", "session_id": "s-start", "_aictl_verify": True}) == 200
    assert time.monotonic() - t0 < 3.0  # not held until the snapshot


def test_the_board_waits_for_the_first_snapshot_then_answers(starting, monkeypatch):
    base, srv, store = starting
    monkeypatch.setattr(web_server, "READY_WAIT_S", 0.2)
    with pytest.raises(urllib.error.HTTPError) as err:
        urllib.request.urlopen(base + "/api/snapshot", timeout=5)
    assert err.value.code == 503 and err.value.headers["Retry-After"] == "2"
    store.update(DashboardSnapshot(timestamp=time.time(), root="/tmp", tools=[], sessions=[]))
    srv.ready.set()
    with urllib.request.urlopen(base + "/api/snapshot", timeout=5) as resp:
        assert resp.status == 200


def test_start_server_opens_the_port_before_it_collects(tmp_path, monkeypatch):
    """The slow part of the start runs with the port already open."""
    from aictl import orchestrator

    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    seen: dict = {}
    servers: list = []

    class Capture(_DashboardHTTPServer):
        def __init__(self, *a, **kw):
            super().__init__(*a, **kw)
            servers.append(self)

    def slow_part(self, *, quiet=False):
        with socket.socket() as c:
            c.settimeout(2)
            seen["open"] = c.connect_ex(("127.0.0.1", port)) == 0
        seen["ready"] = servers[0].ready.is_set()
        threading.Timer(0.2, servers[0].shutdown).start()

    monkeypatch.setattr(web_server, "_DashboardHTTPServer", Capture)
    monkeypatch.setattr(orchestrator.CollectionService, "run", slow_part)
    monkeypatch.setattr(orchestrator, "_kill_stale_server", lambda port: None)
    orchestrator.start_server(tmp_path, port=port, open_browser=False, include_live_monitor=False, db_path=tmp_path / "h.db")
    assert seen == {"open": True, "ready": False}
    assert servers[0].ready.is_set()  # set once the slow part is done
