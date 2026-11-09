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


def test_telemetry_and_hooks_are_taken_before_the_first_snapshot(starting, monkeypatch):
    """With no wait at all, a route held for the snapshot answers 503: a 200 shows it is not held."""
    base, _srv, _store = starting
    monkeypatch.setattr(web_server, "READY_WAIT_S", 0)
    assert _post(base + "/v1/metrics", {"resourceMetrics": []}) == 200
    assert _post(base + "/v1/logs", {"resourceLogs": []}) == 200
    assert _post(base + "/api/hooks", {"event": "Stop", "session_id": "s-start", "_aictl_verify": True}) == 200


def test_the_board_waits_for_the_first_snapshot_then_answers(starting, monkeypatch):
    base, srv, store = starting
    monkeypatch.setattr(web_server, "READY_WAIT_S", 0)
    with pytest.raises(urllib.error.HTTPError) as err:
        urllib.request.urlopen(base + "/api/snapshot", timeout=5)
    assert err.value.code == 503 and err.value.headers["Retry-After"] == "2"
    assert json.loads(err.value.read())["starting"] is True  # the board says it is starting
    store.update(DashboardSnapshot(timestamp=time.time(), root="/tmp", tools=[], sessions=[]))
    srv.ready.set()
    with urllib.request.urlopen(base + "/api/snapshot", timeout=5) as resp:
        assert resp.status == 200


def test_the_page_loads_at_once_while_starting(starting, monkeypatch):
    """The page needs no snapshot; a held page is what a browser showed as a blank 503 text."""
    base, _srv, _store = starting
    monkeypatch.setattr(web_server, "READY_WAIT_S", 0)  # a held route answers 503 at once
    with urllib.request.urlopen(base + "/", timeout=5) as resp:
        assert resp.status == 200 and "text/html" in resp.headers["Content-Type"]


def test_the_wait_stays_under_the_socket_timeout():
    assert web_server.READY_WAIT_S < _DashboardHandler.timeout


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
        seen["ingesters while collecting"] = dict(servers[0].ingesters)
        servers[0].shutdown()  # serve_forever runs on its own thread; start_server then returns

    started: list = []
    from aictl.dashboard import ingester_runner

    monkeypatch.setattr(ingester_runner, "start_ingesters", lambda store: started.append(store) or {"x": object()})

    monkeypatch.setattr(web_server, "_DashboardHTTPServer", Capture)
    monkeypatch.setattr(orchestrator.CollectionService, "run", slow_part)
    monkeypatch.setattr(orchestrator, "_kill_stale_server", lambda port: None)
    orchestrator.start_server(tmp_path, port=port, open_browser=False, include_live_monitor=False, db_path=tmp_path / "h.db")
    # The ingesters and their backfills read every session file; they start after the snapshot.
    assert seen == {"open": True, "ready": False, "ingesters while collecting": {}}
    assert servers[0].ready.is_set()  # set once the slow part is done
    assert len(started) == 1 and "x" in servers[0].ingesters
