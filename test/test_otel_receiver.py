"""Tests for OTel OTLP receiver — JSON parsing, metric mapping, endpoints."""

from __future__ import annotations

import json
import threading
import time
import urllib.request

import pytest

from aictl.dashboard.web_server import (
    METRIC_MAP,
    OtelReceiver,
    _extract_otel_data_points as _extract_data_points,
    _extract_otel_value as _extract_value,
    _nano_to_epoch,
    _parse_otel_attributes as _parse_attributes,
    _promote_session_id,
)
from aictl.storage import EventRow, HistoryDB, Sample


# ── Unit tests: OTLP JSON parsing helpers ────────────────────────


def test_parse_attributes_basic():
    attrs = [
        {"key": "model", "value": {"stringValue": "claude-opus-4-6"}},
        {"key": "input_tokens", "value": {"intValue": "1234"}},
        {"key": "temperature", "value": {"doubleValue": 0.7}},
        {"key": "stream", "value": {"boolValue": True}},
    ]
    result = _parse_attributes(attrs)
    assert result == {
        "model": "claude-opus-4-6",
        "input_tokens": 1234,
        "temperature": 0.7,
        "stream": True,
    }


def test_parse_attributes_empty():
    assert _parse_attributes([]) == {}


def test_parse_attributes_array_value():
    attrs = [
        {"key": "tags", "value": {"arrayValue": {
            "values": [
                {"stringValue": "a"},
                {"intValue": "42"},
            ]
        }}},
    ]
    result = _parse_attributes(attrs)
    assert result["tags"] == ["a", "42"]


def test_nano_to_epoch():
    # 1 second = 1e9 nanoseconds
    assert _nano_to_epoch("1000000000") == 1.0
    assert _nano_to_epoch(1000000000) == 1.0
    # Invalid input falls back to current time
    result = _nano_to_epoch("invalid")
    assert abs(result - time.time()) < 2


def test_extract_value():
    assert _extract_value({"asInt": "42"}) == 42.0
    assert _extract_value({"asDouble": 3.14}) == 3.14
    assert _extract_value({}) == 0.0
    assert _extract_value({"asInt": "bad"}) == 0.0


def test_extract_data_points_sum():
    metric = {"name": "test", "sum": {"dataPoints": [{"asInt": "1"}]}}
    assert len(_extract_data_points(metric)) == 1


def test_extract_data_points_gauge():
    metric = {"name": "test", "gauge": {"dataPoints": [{"asDouble": 2.5}]}}
    assert len(_extract_data_points(metric)) == 1


def test_extract_data_points_empty():
    assert _extract_data_points({"name": "test"}) == []


# ── Unit tests: OtelReceiver.parse_metrics ────────────────────────


def _make_otlp_metrics(metric_name, value, ts_nano="1700000000000000000",
                        attrs=None, tool="claude-code"):
    """Build a minimal OTLP JSON metrics payload."""
    dp_attrs = [{"key": k, "value": {"stringValue": str(v)}}
                for k, v in (attrs or {}).items()]
    return {
        "resourceMetrics": [{
            "resource": {"attributes": [
                {"key": "service.name", "value": {"stringValue": tool}},
            ]},
            "scopeMetrics": [{
                "scope": {"name": "claude_code"},
                "metrics": [{
                    "name": metric_name,
                    "sum": {"dataPoints": [{
                        "asInt": str(value),
                        "timeUnixNano": ts_nano,
                        "attributes": dp_attrs,
                    }]},
                }],
            }],
        }],
    }


def test_parse_metrics_token_usage():
    receiver = OtelReceiver()
    body = _make_otlp_metrics(
        "claude_code.token.usage", 5000,
        attrs={"token_type": "input", "model": "claude-opus-4-6"},
    )
    samples = receiver.parse_metrics(body)

    assert len(samples) == 1
    s = samples[0]
    assert isinstance(s, Sample)
    assert s.metric == "otel.token.usage"
    assert s.value == 5000.0
    assert s.tags["tool"] == "claude-code"
    assert s.tags["model"] == "claude-opus-4-6"
    assert s.tags["otel_metric"] == "claude_code.token.usage"
    assert receiver.stats.metrics_received == 1


def test_parse_metrics_cost():
    receiver = OtelReceiver()
    body = _make_otlp_metrics("claude_code.cost.usage", 42)
    samples = receiver.parse_metrics(body)
    assert samples[0].metric == "otel.cost.usage"


def test_parse_metrics_unknown_maps_to_otel_prefix():
    receiver = OtelReceiver()
    body = _make_otlp_metrics("custom.metric.name", 99)
    samples = receiver.parse_metrics(body)
    assert samples[0].metric == "otel.custom.metric.name"


def test_parse_metrics_multiple_data_points():
    receiver = OtelReceiver()
    body = {
        "resourceMetrics": [{
            "resource": {"attributes": []},
            "scopeMetrics": [{
                "scope": {"name": "test"},
                "metrics": [{
                    "name": "claude_code.session.count",
                    "sum": {"dataPoints": [
                        {"asInt": "1", "timeUnixNano": "1700000000000000000", "attributes": []},
                        {"asInt": "2", "timeUnixNano": "1700000001000000000", "attributes": []},
                    ]},
                }],
            }],
        }],
    }
    samples = receiver.parse_metrics(body)
    assert len(samples) == 2
    assert receiver.stats.metrics_received == 2


def test_parse_metrics_empty_payload():
    receiver = OtelReceiver()
    assert receiver.parse_metrics({}) == []
    assert receiver.parse_metrics({"resourceMetrics": []}) == []
    assert receiver.stats.metrics_received == 0


def test_parse_metrics_all_known_metrics():
    """Every metric in METRIC_MAP should be correctly mapped."""
    receiver = OtelReceiver()
    for otel_name, aictl_name in METRIC_MAP.items():
        body = _make_otlp_metrics(otel_name, 100)
        samples = receiver.parse_metrics(body)
        assert samples[0].metric == aictl_name, f"{otel_name} -> {aictl_name}"


# ── Unit tests: OtelReceiver.parse_logs ───────────────────────────


def _make_otlp_logs(event_name, attrs=None, tool="claude-code",
                     ts_nano="1700000000000000000"):
    """Build a minimal OTLP JSON logs payload."""
    log_attrs = [
        {"key": "event.name", "value": {"stringValue": event_name}},
    ]
    log_attrs += [{"key": k, "value": {"stringValue": str(v)}}
                  for k, v in (attrs or {}).items()]
    return {
        "resourceLogs": [{
            "resource": {"attributes": [
                {"key": "service.name", "value": {"stringValue": tool}},
            ]},
            "scopeLogs": [{
                "logRecords": [{
                    "timeUnixNano": ts_nano,
                    "attributes": log_attrs,
                }],
            }],
        }],
    }


def test_parse_logs_api_request():
    receiver = OtelReceiver()
    body = _make_otlp_logs("claude_code.api_request", attrs={
        "model": "claude-opus-4-6",
        "duration_ms": "350",
        "input_tokens": "1500",
    })
    events = receiver.parse_logs(body)

    assert len(events) == 1
    ev = events[0]
    assert isinstance(ev, EventRow)
    assert ev.kind == "otel:claude_code.api_request"
    assert ev.tool == "claude-code"
    assert ev.detail["model"] == "claude-opus-4-6"
    assert receiver.stats.api_calls_total == 1
    assert receiver.stats.events_received == 1


def test_parse_logs_api_error():
    receiver = OtelReceiver()
    body = _make_otlp_logs("claude_code.api_error", attrs={
        "error": "rate_limit_exceeded",
    })
    events = receiver.parse_logs(body)
    assert events[0].kind == "otel:claude_code.api_error"
    assert receiver.stats.api_errors_total == 1


def test_parse_logs_user_prompt():
    receiver = OtelReceiver()
    body = _make_otlp_logs("claude_code.user_prompt", attrs={
        "prompt.id": "abc-123",
    })
    events = receiver.parse_logs(body)
    assert events[0].kind == "otel:claude_code.user_prompt"
    assert events[0].detail.get("prompt.id") == "abc-123"


def test_parse_logs_unknown_event_fallback():
    receiver = OtelReceiver()
    body = {
        "resourceLogs": [{
            "resource": {"attributes": []},
            "scopeLogs": [{
                "logRecords": [{
                    "timeUnixNano": "1700000000000000000",
                    "body": {"stringValue": "some log message"},
                    "attributes": [],
                }],
            }],
        }],
    }
    events = receiver.parse_logs(body)
    assert events[0].kind == "otel:some log message"


def test_parse_logs_empty_payload():
    receiver = OtelReceiver()
    assert receiver.parse_logs({}) == []
    assert receiver.parse_logs({"resourceLogs": []}) == []


# ── Unit tests: OtelReceiver.status ───────────────────────────────


def test_status_inactive():
    receiver = OtelReceiver()
    st = receiver.status()
    assert st["active"] is False
    assert st["metrics_received"] == 0
    assert st["events_received"] == 0


def test_status_active_after_data():
    receiver = OtelReceiver()
    receiver.parse_metrics(_make_otlp_metrics("claude_code.token.usage", 100))
    st = receiver.status()
    assert st["active"] is True
    assert st["metrics_received"] == 1


# ── Integration: receiver → HistoryDB ────────────────────────────


def test_metrics_stored_in_db(tmp_path):
    """Parsed OTel metrics should be storable via HistoryDB.append_samples."""
    db = HistoryDB(db_path=str(tmp_path / "otel.db"), flush_interval=0)
    receiver = OtelReceiver()

    body = _make_otlp_metrics("claude_code.token.usage", 5000)
    samples = receiver.parse_metrics(body)
    db.append_samples(samples)

    # Query back
    result = db.query_samples(
        metric="otel.token.usage",
        since=0, until=time.time() + 3600,
    )
    assert len(result) == 1
    assert result[0].value == 5000.0
    db.close()


def test_events_stored_in_db(tmp_path):
    """Parsed OTel events should be storable via HistoryDB.append_events."""
    db = HistoryDB(db_path=str(tmp_path / "otel.db"), flush_interval=0)
    receiver = OtelReceiver()

    body = _make_otlp_logs("claude_code.api_request", attrs={
        "model": "claude-opus-4-6",
        "duration_ms": "350",
    })
    events = receiver.parse_logs(body)
    db.append_events(events)

    # Query back
    result = db.query_events(
        since=0, until=time.time() + 3600,
        kind="otel:claude_code.api_request",
    )
    assert len(result) == 1
    assert result[0].tool == "claude-code"
    db.close()


# ── Integration: HTTP endpoints ──────────────────────────────────


@pytest.fixture()
def otel_server(tmp_path):
    """Start a real HTTP server for OTel endpoint testing."""
    from pathlib import Path

    from aictl.dashboard.web_server import (
        _DashboardHTTPServer, _DashboardHandler,
    )
    from aictl.orchestrator import AllowedPaths, SnapshotStore
    from aictl.dashboard.models import DashboardSnapshot

    db = HistoryDB(db_path=str(tmp_path / "otel.db"), flush_interval=0)
    store = SnapshotStore(db=db)
    store.update(DashboardSnapshot(
        timestamp=time.time(), root="/tmp", tools=[], sessions=[],
    ))

    allowed = AllowedPaths()
    srv = _DashboardHTTPServer(
        ("127.0.0.1", 0), _DashboardHandler,
        store, allowed, Path("/tmp"),
    )
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}", srv, db
    srv.shutdown()
    db.close()


def _post_json(url, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        return resp.status, json.loads(resp.read())


def _get_json(url):
    with urllib.request.urlopen(url, timeout=5) as resp:
        return json.loads(resp.read())


def test_post_v1_metrics(otel_server):
    base, srv, db = otel_server
    body = _make_otlp_metrics("claude_code.token.usage", 5000)
    status, resp = _post_json(f"{base}/v1/metrics", body)
    assert status == 200
    assert resp["ok"] is True

    # Verify stored
    samples = db.query_samples(metric="otel.token.usage", since=0,
                                until=time.time() + 3600)
    assert len(samples) == 1


def test_post_v1_logs(otel_server):
    base, srv, db = otel_server
    body = _make_otlp_logs("claude_code.api_request", attrs={"model": "opus"})
    status, resp = _post_json(f"{base}/v1/logs", body)
    assert status == 200
    assert resp["ok"] is True

    events = db.query_events(since=0, until=time.time() + 3600,
                              kind="otel:claude_code.api_request")
    assert len(events) == 1


def test_otel_status_endpoint(otel_server):
    base, srv, db = otel_server
    data = _get_json(f"{base}/api/otel-status")
    assert "active" in data
    assert data["metrics_received"] == 0

    # Push some data then check again
    _post_json(f"{base}/v1/metrics",
               _make_otlp_metrics("claude_code.cost.usage", 10))
    data = _get_json(f"{base}/api/otel-status")
    assert data["metrics_received"] == 1
    assert data["active"] is True


def test_api_calls_endpoint(otel_server):
    base, srv, db = otel_server

    # Push API request events
    for i in range(3):
        _post_json(f"{base}/v1/logs", _make_otlp_logs(
            "claude_code.api_request",
            attrs={"model": "claude-opus-4-6", "duration_ms": str(200 + i * 50)},
            ts_nano=str(int((time.time() - i) * 1e9)),
        ))
    # Push one error
    _post_json(f"{base}/v1/logs", _make_otlp_logs(
        "claude_code.api_error",
        attrs={"error": "rate_limit", "model": "opus"},
        ts_nano=str(int(time.time() * 1e9)),
    ))

    data = _get_json(f"{base}/api/api-calls?since=0")
    assert data["summary"]["total_calls"] == 3
    assert data["summary"]["total_errors"] == 1
    assert "claude-opus-4-6" in data["summary"]["by_model"]
    assert len(data["calls"]) == 4


def test_api_calls_empty(otel_server):
    base, srv, db = otel_server
    data = _get_json(f"{base}/api/api-calls")
    assert data["calls"] == []
    assert data["summary"]["total_calls"] == 0


# ── Session ID promotion ──────────────────────────────────────────


def test_promote_session_id_from_attrs():
    attrs = {"session.id": "abc-123", "model": "opus"}
    _promote_session_id(attrs)
    assert attrs["session_id"] == "abc-123"


def test_promote_session_id_from_resource():
    attrs = {"model": "opus"}
    resource = {"session.id": "res-456"}
    _promote_session_id(attrs, resource)
    assert attrs["session_id"] == "res-456"


def test_promote_session_id_no_overwrite():
    attrs = {"session_id": "existing", "session.id": "new"}
    _promote_session_id(attrs)
    assert attrs["session_id"] == "existing"


def test_promote_session_id_noop():
    attrs = {"model": "opus"}
    _promote_session_id(attrs)
    assert "session_id" not in attrs


def test_metrics_include_session_id():
    r = OtelReceiver()
    body = {
        "resourceMetrics": [{
            "resource": {"attributes": [
                {"key": "service.name", "value": {"stringValue": "claude-code"}},
                {"key": "session.id", "value": {"stringValue": "sess-789"}},
            ]},
            "scopeMetrics": [{"metrics": [{
                "name": "claude_code.cost.usage",
                "gauge": {"dataPoints": [{
                    "timeUnixNano": "1700000000000000000",
                    "asDouble": 0.05,
                    "attributes": [],
                }]},
            }]}],
        }],
    }
    samples = r.parse_metrics(body)
    assert len(samples) == 1
    assert samples[0].tags["session_id"] == "sess-789"


def test_logs_include_session_id():
    r = OtelReceiver()
    body = {
        "resourceLogs": [{
            "resource": {"attributes": [
                {"key": "service.name", "value": {"stringValue": "claude-code"}},
            ]},
            "scopeLogs": [{"logRecords": [{
                "timeUnixNano": "1700000000000000000",
                "attributes": [
                    {"key": "event.name", "value": {"stringValue": "tool_use"}},
                    {"key": "session.id", "value": {"stringValue": "log-sess-1"}},
                ],
            }]}],
        }],
    }
    events = r.parse_logs(body)
    assert len(events) == 1
    assert events[0].detail["session_id"] == "log-sess-1"


def test_traces_include_session_id():
    r = OtelReceiver()
    body = {
        "resourceSpans": [{
            "resource": {"attributes": [
                {"key": "service.name", "value": {"stringValue": "claude-code"}},
                {"key": "session.id", "value": {"stringValue": "trace-sess-2"}},
            ]},
            "scopeSpans": [{"spans": [{
                "name": "api_request",
                "startTimeUnixNano": "1700000000000000000",
                "endTimeUnixNano": "1700000001000000000",
                "attributes": [],
                "status": {},
            }]}],
        }],
    }
    samples, events = r.parse_traces(body)
    assert any(e.detail.get("session_id") == "trace-sess-2" for e in events)


def test_extract_requests_list_finish_reason():
    """finish_reason from Copilot OTel is a list ["stop"] — must not crash flush."""
    from aictl.storage import EventRow
    r = OtelReceiver()
    events = [EventRow(
        ts=1700000001.0,
        tool="copilot-vscode",
        kind="otel:gen_ai.client.inference.operation.details",
        detail={
            "gen_ai.request.model": "gpt-4o-mini",
            "gen_ai.response.finish_reasons": ["stop"],   # list, not string
            "gen_ai.usage.input_tokens": 500,
            "gen_ai.usage.output_tokens": 20,
            "session_id": "test-copilot-sess",
        },
    )]
    requests = r.extract_requests(events)
    assert len(requests) == 1
    req = requests[0]
    assert req.finish_reason == "stop"   # coerced from ["stop"]
    assert req.input_tokens == 500
    assert req.model == "gpt-4o-mini"
    assert req.session_id == "test-copilot-sess"


def test_extract_requests_scalar_finish_reason():
    """Claude Code sends finish_reason as a plain string — must also work."""
    from aictl.storage import EventRow
    r = OtelReceiver()
    events = [EventRow(
        ts=1700000002.0,
        tool="claude-code",
        kind="otel:api_request",
        detail={
            "model": "claude-sonnet-4-6",
            "gen_ai.response.finish_reasons": "end_turn",
            "input_tokens": "100",
            "output_tokens": "50",
            "session_id": "test-claude-sess",
        },
    )]
    requests = r.extract_requests(events)
    assert len(requests) == 1
    assert requests[0].finish_reason == "end_turn"


# ── Hook handler integration ─────────────────────────────────────


def test_hook_handler_returns_200(otel_server):
    """Hook POST must return 200 and store the event (Bug #1 regression:
    NameError on event_record crashed the handler after DB write)."""
    base, srv, db = otel_server
    hook_payload = {
        "event": "UserPromptSubmit",
        "session_id": "hook-test-sess",
        "message": "hello world",
        "tool": "claude-code",
        "ts": time.time(),
    }
    status, resp = _post_json(f"{base}/api/hooks", hook_payload)
    assert status == 200
    assert resp["ok"] is True

    # Verify event is stored
    events = db.query_events(since=0, until=time.time() + 3600,
                              kind="hook:UserPromptSubmit")
    assert len(events) >= 1
    assert events[0].session_id == "hook-test-sess"
