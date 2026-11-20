from pathlib import Path
from types import SimpleNamespace

import pytest

from aictl.dashboard.board_routes import handle_get
from aictl.dashboard.history_scope import Scope, identity
from aictl.dashboard.metrics_routes import MetricsRoutes
from aictl.dashboard.node_views import NodeViewError, node_view
from aictl.dashboard.projections.history import HistoryScope, event_rows, node_overview, session_processes
from aictl.dashboard.scoped_history import route
from aictl.dashboard.session_routes import SessionRoutes
from aictl.stores import Store
from aictl.stores.base import ReadResult, StoreError
from aictl.stores.kusto.reader import KustoReader
from aictl.stores.kusto.recorded import RecordedKustoClient

RECORDING = Path(__file__).parent / "recordings" / "r1-kusto.jsonl.gz"


def test_fixed_recording_event_count_exceeds_page():
    reader = KustoReader(RecordedKustoClient(RECORDING), "aictl_perf_test")
    result = reader.read("events.page", {"since": 0.0, "until": 2000000000.0, "limit": 1})
    assert result.truncated and len(result.rows) == 1
    assert set(event_rows(result)[0]) == {"ts", "tool", "kind", "detail", "session_id", "pid"}
    assert reader.read("events.count", {}).rows == [{"count": 5018}]


def test_fixed_recording_session_and_usage_empty_results_are_distinct_from_no_reader():
    reader = KustoReader(RecordedKustoClient(RECORDING), "aictl_perf_test")
    query = {"view": ["overview"], "scope": ["fleet"]}
    with pytest.raises(NodeViewError, match="No store configured"):
        node_view(None, query)
    data = node_view(None, query, now=1795134600, reader=reader)
    assert data["rows"] == data["sessions"] == []
    assert data["totals"]["sessions"] == 0
    assert reader.read("requests.models", {"requested_session": "example"}).rows == []


def test_projection_preserves_exact_totals_and_legacy_node_when_page_is_bounded():
    result = ReadResult([
        {"row_type": "total", "sessions": 3, "requests": 19},
        {"row_type": "node", "node_id": "", "sessions": 1, "requests": 2},
        {"row_type": "node", "node_id": "host-a", "sessions": 1, "requests": 5},
        {"row_type": "session", "node_id": "", "session_id": "shared"},
        {"row_type": "session", "node_id": "host-a", "session_id": "shared"},
    ])
    payload = node_overview(result, max_nodes=1, max_sessions=1)
    assert payload["totals"]["requests"] == 19 and payload["truncated"]
    assert payload["rows"][0]["node_id"] == payload["sessions"][0]["node_id"] == "legacy"


def test_process_projection_does_not_replace_empty_role_in_the_page():
    data = session_processes("a", ReadResult([
        {"row_type": "count", "role": "unknown", "count": 1},
        {"row_type": "process", "pid": 4, "tool": "codex-cli", "role": "", "joined_at": 1.0},
    ]))
    assert data["total"] == 1 and data["by_role"] == {"unknown": 1}
    assert data["processes"][0]["role"] == ""


def test_qualified_scope_retains_node_identity_and_refuses_incomplete_totals():
    def read(_view, params):
        assert params["session_keys"] == ["0:shared", "6:host-ashared"]
        return ReadResult([], truncated=True)

    scope = HistoryScope(SimpleNamespace(read=read), None, qualified=True)
    keys = scope.keys(['["host-a","shared"]', '["legacy","shared"]'])
    with pytest.raises(StoreError, match="incomplete"):
        scope.read("board.sessions", session_keys=keys)


class EventHandler(MetricsRoutes, SessionRoutes):
    def __init__(self, reader=None):
        self.server = SimpleNamespace(store=SimpleNamespace(history_store=Store(reader=reader)))
        self.messages = []

    def _qs_get(self, _key, default=None):
        return default

    def _qs_float(self, _key, default):
        return default

    def _qs_float_opt(self, _key):
        return None

    def _json_response(self, payload, status=200):
        self.messages.append((status, payload))


def test_no_store_is_not_zero_events_or_zero_calls():
    handler = EventHandler()
    handler._serve_events()
    handler._serve_events_count()
    handler._serve_api_calls()
    assert handler.messages[0] == (503, {"error": "No store configured"})
    assert handler.messages[1] == (200, {"count": None})
    assert handler.messages[2] == (503, {"calls": [], "summary": {}, "error": "No store configured"})


def test_scoped_calls_use_the_reader_without_a_legacy_database():
    import json

    reader = KustoReader(RecordedKustoClient(RECORDING), "aictl_perf_test")
    status, data = route(None, Scope("node", "example-node"), "/api/board/session/records", "",
                         {"session_id": [identity("example-node", "example")], "part": ["calls"]},
                         1795134600, reader=reader)
    assert status == 200
    result = json.loads(data)
    assert result["calls"] == []
    assert result["summary"] == {
        "total_calls": 0, "total_errors": 0, "by_model": {}, "avg_latency_ms": None, "p95_latency_ms": None,
    }


def test_keyed_history_record_routes_return_503_when_the_reader_is_missing():
    import json

    for path, query in (
        ("tool", "name=Read"), ("error", "key=api:error:"), ("prompt", "ts=2.0&session_id=example"),
        ("skill", "name=example"),
    ):
        status, data = handle_get(f"/api/board/{path}", query, None, SimpleNamespace(history_store=Store()))
        assert status == 503
        assert json.loads(data) == {"error": "No store configured"}
