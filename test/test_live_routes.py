"""Exercise the new HTTP methods without binding a server or starting collectors."""

import io
import json
import threading
from types import SimpleNamespace

import pytest

from aictl.dashboard.live.hub import LiveHub
from aictl.dashboard.web_server import _DashboardHandler


def handler(path, live=None):
    request = object.__new__(_DashboardHandler)
    request.path = path
    request.headers = {"Host": "localhost:8484"}
    request.client_address = ("127.0.0.1", 1)
    request.server = SimpleNamespace(live_dashboard=live, _closing=False, ready=threading.Event())
    request.wfile = io.BytesIO()
    request.send_response = lambda status, *_: setattr(request, "status", status)
    request.send_header = lambda *_: None
    request.end_headers = lambda: None
    request._send_cors_header = lambda: None
    request._wait_ready = lambda: pytest.fail("Live capabilities/stream must not wait for discovery")
    return request


def test_live_capabilities_are_cheap_and_always_enabled():
    request = handler("/api/live/capabilities")
    request._do_GET()
    value = json.loads(request.wfile.getvalue())
    assert request.status == 200 and value["enabled"] is True
    assert value["stream"] == "/api/live/stream" and "legacy_stream" not in value


def test_incremental_sse_writes_baseline_frames_and_forwards_resume_controls():
    hub = LiveHub(epoch="daemon")
    hub.publish("runtime.agent", "a", {"id": "a"}, source="runtime.collector")
    seen = []

    class Subscription:
        def __init__(self):
            self.value = hub.subscribe(history=False)
            self.sent = False

        def next(self, timeout):
            if self.sent:
                raise StopIteration
            self.sent = True
            return self.value.next(0)

        def close(self):
            self.value.close()
            seen.append("closed")

    def subscribe(query, **kwargs):
        seen.append((query, kwargs))
        return Subscription()

    request = handler("/api/live/stream?history=0&cursor=query-cursor", SimpleNamespace(subscribe=subscribe))
    request.headers["Last-Event-ID"] = "header-cursor"
    request._do_GET()
    wire = request.wfile.getvalue().decode()
    assert request.status == 200 and "event: bootstrap\n" in wire
    assert "id: daemon:1\n" in wire
    assert seen[0][1] == {"history": False, "cursor": "header-cursor"}
    assert seen[-1] == "closed"


def test_live_payloads_keep_existing_loopback_access_rule():
    request = handler("/api/live/stream")
    request.client_address = ("192.0.2.1", 1)
    request._do_GET()
    assert request.status == 403


@pytest.mark.parametrize("route", ["context", "board"])
def test_unresolved_history_is_a_structured_conflict_not_a_server_error(monkeypatch, caplog, route):
    from aictl.dashboard import context_projection, history_board
    from aictl.kusto.observations import UnresolvedObservationsError

    def unresolved(*_args, **_kwargs):
        raise UnresolvedObservationsError(("requests",))

    if route == "context":
        monkeypatch.setattr(context_projection, "context_bytes", unresolved)
    else:
        monkeypatch.setattr(history_board, "read_board", unresolved)
    request = handler("/api/board/context" if route == "context" else "/api/history/board")
    request.server.store = SimpleNamespace(_db=object())
    request.server.allowed = SimpleNamespace(is_allowed=lambda _: True)
    if route == "context":
        request._serve_board_context()
    else:
        request._wait_ready = lambda: True
        request._do_GET()
    body = json.loads(request.wfile.getvalue())
    assert request.status == 409
    assert body["incomplete"] is True and body["retryable"] is False
    assert body["unresolved_families"] == ["requests"]
    assert body["reason"] == "unresolved_observations"
    assert not caplog.records


def test_context_still_reports_unexpected_errors_as_server_errors(monkeypatch):
    from aictl.dashboard import context_projection

    def failed(*_args, **_kwargs):
        raise RuntimeError("unexpected context failure")

    monkeypatch.setattr(context_projection, "context_bytes", failed)
    request = handler("/api/board/context")
    request.server.store = SimpleNamespace(_db=object())
    request._serve_board_context()
    assert request.status == 500
    assert "unexpected context failure" in json.loads(request.wfile.getvalue())["error"]
