"""The routes behind the session tabs of the drawer (Integrations, Processes, Source steps, Artifacts)
say what the store holds, say where it came from, and never answer 0 for what is not known."""

from __future__ import annotations

from types import SimpleNamespace

from aictl.dashboard.session_routes import SessionRoutes
from aictl.stores import Store
from aictl.stores.base import ReadResult

SID = "sess-1"


class FakeReader:
    """A reader that answers each view from a dict of rows (a list, or a function of the params) and records the asks."""

    def __init__(self, **views):
        self.views = views
        self.asked: list[tuple[str, dict]] = []

    def capabilities(self):
        return {}

    def health(self):
        return {}

    def read(self, view, params):
        self.asked.append((view, dict(params)))
        rows = self.views.get(view, [])
        return ReadResult(rows(params) if callable(rows) else rows)


class Handler(SessionRoutes):
    def __init__(self, reader, **query):
        self.server = SimpleNamespace(store=SimpleNamespace(history_store=Store(reader=reader)))
        self.query = {"session_id": SID, **query}
        self.messages: list[tuple[int, dict]] = []

    def _qs_get(self, key, default=None):
        return self.query.get(key, default)

    def _qs_float(self, key, default):
        return float(self.query[key]) if key in self.query else default

    def _qs_float_opt(self, key):
        return float(self.query[key]) if key in self.query else None

    def _json_response(self, payload, status=200):
        self.messages.append((status, payload))

    def send_error(self, status, message=""):
        self.messages.append((status, {"error": message}))


def _stored_requests(*durations):
    rows = [{"row_type": "example", "ts": 100.0 + n, "session_id": SID, "model": "m1", "input_tokens": 5, "output_tokens": 2,
             "duration_ms": duration, "is_error": 0, "error_type": None, "http_status": None, "finish_reason": "stop"}
            for n, duration in enumerate(durations)]
    timed = [d for d in durations if d]
    return [*rows, {"row_type": "model", "model": "m1", "calls": len(durations), "errors": 0},
            {"row_type": "latency", "times": timed, "timed": len(timed)}]


def test_a_session_without_otel_events_still_shows_the_requests_the_store_holds_and_names_that_source():
    reader = FakeReader(**{"requests.records": _stored_requests(100.0, 300.0)})
    handler = Handler(reader, since="0", limit="200")
    handler._serve_api_calls()
    (status, body), = handler.messages
    assert status == 200
    assert body["summary"]["total_calls"] == 2 and body["summary"]["by_model"] == {"m1": 2}
    assert (body["summary"]["avg_latency_ms"], body["summary"]["source"]) == (200.0, "stored requests")
    assert len(body["calls"]) == 2 and body["calls"][0]["status"] == "ok"


def test_requests_without_a_recorded_duration_have_no_latency_not_zero():
    handler = Handler(FakeReader(**{"requests.records": _stored_requests(None, None, None)}), since="0")
    handler._serve_api_calls()
    summary = handler.messages[0][1]["summary"]
    assert summary["total_calls"] == 3
    assert summary["avg_latency_ms"] is None and summary["p95_latency_ms"] is None


def test_a_session_with_no_events_and_no_requests_has_no_latency_not_zero():
    # The view always answers with its latency row, an empty one when the session has no requests.
    handler = Handler(FakeReader(**{"requests.records": [{"row_type": "latency", "times": [], "timed": 0}]}), since="0")
    handler._serve_api_calls()
    summary = handler.messages[0][1]["summary"]
    assert summary["total_calls"] == 0 and summary["source"] is None
    assert summary["avg_latency_ms"] is None and summary["p95_latency_ms"] is None


def _tool_row(tool_name, calls, failures=0, total_duration=None, last_ts=50.0):
    return {"tool_name": tool_name, "calls": calls, "failures": failures, "total_duration": total_duration, "last_ts": last_ts}


def test_the_mcp_servers_a_session_used_come_from_its_stored_tool_calls_when_no_event_names_one():
    reader = FakeReader(**{"tools.totals": [
        _tool_row("mcp__computer-use__screenshot", 3, 1, 450.0), _tool_row("mcp__computer-use__click", 2, 0, 50.0),
        _tool_row("github/search", 1), _tool_row("Read", 9)]})
    handler = Handler(reader)
    handler._serve_session_mcp_usage()
    (status, body), = handler.messages
    assert status == 200
    servers = {row["server_name"]: row for row in body["servers"]}
    assert set(servers) == {"computer-use", "github"}
    assert (servers["computer-use"]["call_count"], servers["computer-use"]["err_count"],
            servers["computer-use"]["total_duration_ms"]) == (5, 1, 500.0)
    assert body["total_calls"] == 6
