"""OTLP export requests to collector-compatible Kusto rows, without a cluster."""

from __future__ import annotations

import base64
import copy
import hashlib
import json
import math

import pytest

from aictl.stores.kusto import otel
from aictl.stores.kusto.otel import (
    BAG_BYTES,
    CHUNK_BYTES,
    PAYLOADS,
    SPILL_BYTES,
    TABLES_BY_NAME,
    chunk_text,
    convert_logs,
    convert_metrics,
    convert_traces,
    create_commands,
    format_time,
    json_line,
    otel_id,
)

json_format = pytest.importorskip("google.protobuf.json_format")
logs_service = pytest.importorskip("opentelemetry.proto.collector.logs.v1.logs_service_pb2")
metrics_service = pytest.importorskip("opentelemetry.proto.collector.metrics.v1.metrics_service_pb2")
trace_service = pytest.importorskip("opentelemetry.proto.collector.trace.v1.trace_service_pb2")

HOST = "recv-host"
RECV = 1_700_000_100_000_000_000
T1 = 1_700_000_012_123_456_700
T1_TEXT = "2023-11-14T22:13:32.1234567Z"
T0 = 1_700_000_000_000_000_000
T0_TEXT = "2023-11-14T22:13:20Z"
TRACE = "5b8efff798038103d269b633813fc60c"
SPAN = "eee19b7ec3c1b174"
PARENT = "eee19b7ec3c1b173"
TRACE2 = "0af7651916cd43dd8448eb211c80319c"
SPAN2 = "b7ad6b7169203331"


def s(v):
    return {"stringValue": v}


def promoted(table, **values):
    """The promoted columns of *table* (those after node_id): null unless given."""
    names = TABLES_BY_NAME[table].column_names
    out = dict.fromkeys(names[names.index("node_id") + 1:])
    assert set(values) <= set(out), set(values) - set(out)
    return {**out, **values}


def kv(key, value):
    return {"key": key, "value": value}


RESOURCE = {
    "attributes": [
        kv("service.name", s("codex-cli")),
        kv("host.name", s("box1")),
        kv("session.id", s("res-session")),
    ]
}


def _hex_to_b64(d):
    """OTLP/JSON dict to the shape ParseDict expects: ids in base64."""
    if isinstance(d, dict):
        out = {}
        for k, v in d.items():
            if k in ("traceId", "spanId", "parentSpanId") and isinstance(v, str) and v:
                out[k] = base64.b64encode(bytes.fromhex(v)).decode()
            else:
                out[k] = _hex_to_b64(v)
        return out
    if isinstance(d, list):
        return [_hex_to_b64(x) for x in d]
    return d


def proto_shape(body, cls):
    msg = json_format.ParseDict(_hex_to_b64(body), cls())
    return json_format.MessageToDict(msg)


def both(convert, body, cls, **kw):
    """Convert OTLP/JSON and the MessageToDict shape; they must give identical rows."""
    kw = {"received_ns": RECV, "host": HOST, **kw}
    original = copy.deepcopy(body)
    a = convert(body, **kw)
    assert body == original, "the converter changed its input"
    pb = proto_shape(body, cls)
    b = convert(pb, **kw)
    assert a.rows == b.rows
    assert a.stats == b.stats
    return a


# ── Logs ──────────────────────────────────────────────────────────────


def _log_body():
    return {
        "resourceLogs": [
            {
                "resource": RESOURCE,
                "scopeLogs": [
                    {
                        "scope": {"name": "codex_otel", "version": "1.2"},
                        "logRecords": [
                            {
                                "timeUnixNano": str(T1),
                                "observedTimeUnixNano": str(T0),
                                "severityNumber": 9,
                                "severityText": "INFO",
                                "traceId": TRACE,
                                "spanId": SPAN,
                                "body": {"stringValue": "hello"},
                                "attributes": [
                                    kv("event.name", s("codex.api_request")),
                                    kv("model", s("gpt-5")),
                                    kv("count", {"intValue": "7"}),
                                    kv("ratio", {"doubleValue": 0.25}),
                                    kv("ok", {"boolValue": True}),
                                    kv("raw", {"bytesValue": "AAEC"}),
                                    kv(
                                        "nested",
                                        {
                                            "kvlistValue": {
                                                "values": [
                                                    kv("a", {"intValue": "1"}),
                                                    kv("b", {"arrayValue": {"values": [s("x"), {"intValue": 2}]}}),
                                                ]
                                            }
                                        },
                                    ),
                                    kv("list", {"arrayValue": {"values": [s("p"), {"boolValue": False}]}}),
                                    kv("scope.name", s("record-side")),
                                    kv("dup", s("first")),
                                    kv("dup", s("second")),
                                ],
                            }
                        ],
                    }
                ],
            }
        ]
    }


def test_daemon_id_is_never_taken_from_the_otlp_resource_even_for_spilled_chunks():
    body = _log_body()
    body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]["body"] = s("z" * (otel.SPILL_BYTES + 1))
    for node in ("build-a", "build-b"):
        out = convert_logs(body, received_ns=RECV, host=HOST, node_id=node)
        assert out.rows[PAYLOADS]
        for r in [*out.rows["OTELLogs"], *out.rows[PAYLOADS]]:
            assert (r["MachineId"], r["node_id"]) == ("box1", node)


def test_log_exact_row_from_both_shapes():
    out = both(convert_logs, _log_body(), logs_service.ExportLogsServiceRequest)
    [row] = out.rows["OTELLogs"]
    attrs = {
        "event.name": "codex.api_request",
        "model": "gpt-5",
        "count": 7,
        "ratio": 0.25,
        "ok": True,
        "raw": "AAEC",
        "nested": {"a": 1, "b": ["x", 2]},
        "list": ["p", False],
        "scope.name": "codex_otel",
        "dup": "second",
        "scope.version": "1.2",
    }
    expected = {
        "Timestamp": T1_TEXT,
        "ObservedTimestamp": T0_TEXT,
        "TraceID": TRACE,
        "SpanID": SPAN,
        "SeverityText": "INFO",
        "SeverityNumber": 9,
        "Body": "hello",
        "ResourceAttributes": {"service.name": "codex-cli", "host.name": "box1", "session.id": "res-session"},
        "LogsAttributes": attrs,
        "EventName": "codex.api_request",
        "SessionId": "res-session",
        "Tool": "codex-cli",
        "Model": "gpt-5",
        "MachineId": "box1",
        "node_id": HOST,
        "RowKey": otel._row_key("codex-cli", T1_TEXT, T0_TEXT, TRACE, SPAN, "codex.api_request", "hello", attrs),
        **promoted("OTELLogs"),
    }
    assert row == expected
    assert list(row) == list(TABLES_BY_NAME["OTELLogs"].column_names)
    assert out.rows[PAYLOADS] == []
    assert out.stats["records"] == 1 and out.stats["bad_records"] == 0


def test_log_body_map_and_array_render_as_go_json():
    body = _log_body()
    rec = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    rec["body"] = {
        "kvlistValue": {
            "values": [
                kv("z", {"doubleValue": 1.0}),
                kv("a", s("<b>&")),
                kv("m", {"arrayValue": {"values": [{"intValue": "3"}, {"doubleValue": 1e-7}]}}),
            ]
        }
    }
    [row] = both(convert_logs, body, logs_service.ExportLogsServiceRequest).rows["OTELLogs"]
    assert row["Body"] == '{"a":"\\u003cb\\u003e\\u0026","m":[3,1e-7],"z":1}'
    rec["body"] = {"arrayValue": {"values": [s("x"), {"boolValue": True}]}}
    [row] = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert row["Body"] == '["x",true]'
    rec["body"] = {"doubleValue": 2.5}
    [row] = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert row["Body"] == "2.5"


def test_log_zero_time_falls_back_to_observed_then_received():
    body = _log_body()
    rec = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    rec["timeUnixNano"] = "0"
    [row] = both(convert_logs, body, logs_service.ExportLogsServiceRequest).rows["OTELLogs"]
    assert row["Timestamp"] == T0_TEXT and row["ObservedTimestamp"] == T0_TEXT
    del rec["timeUnixNano"]
    del rec["observedTimeUnixNano"]
    [row] = both(convert_logs, body, logs_service.ExportLogsServiceRequest).rows["OTELLogs"]
    assert row["Timestamp"] == format_time(RECV) and row["ObservedTimestamp"] == format_time(RECV)


def test_event_name_and_session_fallbacks():
    body = _log_body()
    rec = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    rec["eventName"] = "from.field"
    rec["attributes"].append(kv("session_id", s("rec-session")))
    [row] = both(convert_logs, body, logs_service.ExportLogsServiceRequest).rows["OTELLogs"]
    assert row["EventName"] == "from.field"
    assert row["SessionId"] == "rec-session"
    assert row["LogsAttributes"]["session_id"] == "rec-session"
    del rec["eventName"]
    rec["attributes"] = [kv("name", s("plain")), kv("gen_ai.conversation.id", s("conv-1"))]
    body["resourceLogs"][0]["resource"] = {"attributes": [kv("service.name", s("x"))]}
    [row] = both(convert_logs, body, logs_service.ExportLogsServiceRequest).rows["OTELLogs"]
    assert row["EventName"] == "plain"
    assert row["SessionId"] == "conv-1"
    assert row["MachineId"] == HOST


def test_dynamic_columns_stay_nested_in_json_line():
    [row] = convert_logs(_log_body(), received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert isinstance(row["LogsAttributes"], dict) and isinstance(row["ResourceAttributes"], dict)
    line = json_line(row)
    assert "\n" not in line and line.isascii()
    back = json.loads(line)
    assert isinstance(back["LogsAttributes"], dict)
    assert back["LogsAttributes"]["nested"] == {"a": 1, "b": ["x", 2]}


# ── Timestamps and ids ────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("ns", "text"),
    [
        (T1, T1_TEXT),
        (T0, T0_TEXT),
        (T0 + 1, "2023-11-14T22:13:20.000000001Z"),
        (T0 + 500_000_000, "2023-11-14T22:13:20.5Z"),
        (0, "1970-01-01T00:00:00Z"),
        (2**63 - 1, "2262-04-11T23:47:16.854775807Z"),
    ],
)
def test_format_time(ns, text):
    assert format_time(ns) == text


def test_ids():
    raw = bytes.fromhex(TRACE)
    assert otel_id(TRACE) == TRACE
    assert otel_id(TRACE.upper()) == TRACE
    assert otel_id(base64.b64encode(raw).decode()) == TRACE
    assert otel_id(base64.b64encode(bytes.fromhex(SPAN)).decode()) == SPAN
    assert otel_id("0" * 32) == ""
    assert otel_id(base64.b64encode(bytes(16)).decode()) == ""
    assert otel_id("") == "" and otel_id(None) == ""
    assert otel_id("not-an-id") == ""


# ── Traces ────────────────────────────────────────────────────────────


def _trace_body():
    return {
        "resourceSpans": [
            {
                "resource": RESOURCE,
                "scopeSpans": [
                    {
                        "scope": {"name": "copilot", "version": ""},
                        "spans": [
                            {
                                "traceId": TRACE,
                                "spanId": PARENT,
                                "name": "invoke_agent",
                                "kind": 1,
                                "startTimeUnixNano": str(T0),
                                "endTimeUnixNano": str(T1),
                                "attributes": [kv("gen_ai.conversation.id", s("conv-9"))],
                                "status": {},
                            },
                            {
                                "traceId": TRACE,
                                "spanId": SPAN,
                                "parentSpanId": PARENT,
                                "name": "chat gpt-5",
                                "kind": 3,
                                "startTimeUnixNano": str(T0 + 1_500_000),
                                "endTimeUnixNano": str(T0 + 4_000_000),
                                "attributes": [
                                    kv("gen_ai.request.model", s("gpt-5")),
                                    kv("scope.name", s("span-side")),
                                ],
                                "events": [
                                    {
                                        "timeUnixNano": str(T0 + 2_000_000),
                                        "name": "gen_ai.content.prompt",
                                        "attributes": [kv("n", {"intValue": "1"})],
                                    }
                                ],
                                "links": [
                                    {
                                        "traceId": TRACE2,
                                        "spanId": SPAN2,
                                        "traceState": "k=v",
                                        "attributes": [kv("why", s("follows"))],
                                    }
                                ],
                                "status": {"code": 2, "message": "boom"},
                            },
                        ],
                    }
                ],
            }
        ]
    }


def test_trace_exact_rows_from_both_shapes():
    out = both(convert_traces, _trace_body(), trace_service.ExportTraceServiceRequest)
    root, child = out.rows["OTELTraces"]
    res = {"service.name": "codex-cli", "host.name": "box1", "session.id": "res-session"}
    assert root == {
        "TraceID": TRACE,
        "SpanID": PARENT,
        "ParentID": "",
        "SpanName": "invoke_agent",
        "SpanStatus": "STATUS_CODE_UNSET",
        "SpanKind": "SPAN_KIND_INTERNAL",
        "StartTime": T0_TEXT,
        "EndTime": T1_TEXT,
        "ResourceAttributes": res,
        "TraceAttributes": {"gen_ai.conversation.id": "conv-9", "scope.name": "copilot"},
        "Events": [],
        "Links": [],
        "SpanStatusMessage": "",
        "DurationMs": 12123,
        "SessionId": "res-session",
        "Tool": "codex-cli",
        "Model": "",
        "MachineId": "box1",
        "RowKey": otel._row_key(TRACE, PARENT, T0_TEXT),
        "TurnId": "", "OperationName": "", "AgentName": "", "ToolName": "", "ToolCallId": "",
        "InputTokens": None, "OutputTokens": None,
        "CacheReadInputTokens": None, "CacheWriteInputTokens": None, "ReasoningOutputTokens": None,
        "ReportedSkillNames": "", "ReportedMcpServers": "", "ReportedContext": {"skills": [], "mcp_servers": []}, "node_id": HOST,
        **promoted("OTELTraces", ConversationId="conv-9"),
    }
    assert child == {
        "TraceID": TRACE,
        "SpanID": SPAN,
        "ParentID": PARENT,
        "SpanName": "chat gpt-5",
        "SpanStatus": "STATUS_CODE_ERROR",
        "SpanKind": "SPAN_KIND_CLIENT",
        "StartTime": "2023-11-14T22:13:20.0015Z",
        "EndTime": "2023-11-14T22:13:20.004Z",
        "ResourceAttributes": res,
        "TraceAttributes": {"gen_ai.request.model": "gpt-5", "scope.name": "copilot"},
        "Events": [
            {"EventName": "gen_ai.content.prompt", "Timestamp": "2023-11-14T22:13:20.002Z", "EventAttributes": {"n": 1}}
        ],
        "Links": [{"TraceID": TRACE2, "SpanID": SPAN2, "TraceState": "k=v", "SpanLinkAttributes": {"why": "follows"}}],
        "SpanStatusMessage": "boom",
        "DurationMs": 2,
        "SessionId": "res-session",
        "Tool": "codex-cli",
        "Model": "gpt-5",
        "MachineId": "box1",
        "RowKey": otel._row_key(TRACE, SPAN, "2023-11-14T22:13:20.0015Z"),
        "TurnId": "", "OperationName": "", "AgentName": "", "ToolName": "", "ToolCallId": "",
        "InputTokens": None, "OutputTokens": None,
        "CacheReadInputTokens": None, "CacheWriteInputTokens": None, "ReasoningOutputTokens": None,
        "ReportedSkillNames": "", "ReportedMcpServers": "", "ReportedContext": {"skills": [], "mcp_servers": []}, "node_id": HOST,
        **promoted("OTELTraces"),
    }
    assert list(child) == list(TABLES_BY_NAME["OTELTraces"].column_names)
    assert json.loads(json_line(child))["Events"][0]["EventAttributes"] == {"n": 1}


def test_span_flow_columns_preserve_reported_values_without_inferring_usage_or_identity():
    body = _trace_body()
    attrs = body["resourceSpans"][0]["scopeSpans"][0]["spans"][1]["attributes"]
    attrs.extend([
        kv("github.copilot.turn_id", s("turn-7")), kv("gen_ai.operation.name", s("execute_tool")),
        kv("gen_ai.tool.name", s("shell")), kv("gen_ai.tool.call.id", s("call-42")),
        kv("gen_ai.agent.name", s("reviewer")), kv("gen_ai.usage.input_tokens", {"intValue": "0"}),
        kv("gen_ai.usage.output_tokens", {"intValue": "21"}),
        kv("gen_ai.usage.cache_read.input_tokens", {"intValue": "0"}),
        kv("github.copilot.context.skills", s('["testing","testing","review","not a skill body"]')),
    ])
    _, child = both(convert_traces, body, trace_service.ExportTraceServiceRequest).rows["OTELTraces"]
    assert (child["TurnId"], child["OperationName"], child["AgentName"], child["ToolName"], child["ToolCallId"]) == (
        "turn-7", "execute_tool", "reviewer", "shell", "call-42",
    )
    assert (child["InputTokens"], child["OutputTokens"]) == (0, 21)
    assert child["CacheReadInputTokens"] == 0 and child["ReportedSkillNames"] == "testing\nreview"
    assert child["ReportedContext"]["skills"] == ["testing", "review"]
    attrs.extend([kv("gen_ai.tool.call.id", s("x" * 1000)), kv("gen_ai.usage.input_tokens", {"boolValue": True})])
    child = convert_traces(body, received_ns=RECV, host=HOST, keep_text=False).rows["OTELTraces"][1]
    assert child["ToolCallId"] == "" and child["InputTokens"] is None


def test_trace_duration_null_when_a_time_is_missing():
    body = _trace_body()
    del body["resourceSpans"][0]["scopeSpans"][0]["spans"][0]["endTimeUnixNano"]
    root = convert_traces(body, received_ns=RECV, host=HOST).rows["OTELTraces"][0]
    assert root["DurationMs"] is None
    assert root["EndTime"] is None
    assert '"EndTime":null' in json_line(root)


def test_a_span_without_times_is_not_stored_in_1970():
    body = _trace_body()
    spans = body["resourceSpans"][0]["scopeSpans"][0]["spans"]
    root, child = spans[0], spans[1]
    del root["startTimeUnixNano"]  # an end only: the start takes it
    child["startTimeUnixNano"] = child["endTimeUnixNano"] = "0"  # neither: the time it was received
    child["events"][0]["timeUnixNano"] = "0"
    first = convert_traces(body, received_ns=RECV, host=HOST).rows["OTELTraces"]
    assert first[0]["StartTime"] == first[0]["EndTime"] == T1_TEXT
    assert first[1]["StartTime"] == format_time(RECV)
    assert first[1]["EndTime"] is None
    assert first[1]["Events"][0]["Timestamp"] == format_time(RECV)
    assert [r["DurationMs"] for r in first] == [None, None]
    assert "1970" not in json.dumps(first)
    # Sent again a second later, each span keeps its key.
    again = convert_traces(body, received_ns=RECV + 10**9, host=HOST).rows["OTELTraces"]
    assert [r["RowKey"] for r in again] == [r["RowKey"] for r in first]
    assert again[1]["StartTime"] != first[1]["StartTime"]


# ── Metrics ───────────────────────────────────────────────────────────


def _metric_body(*metrics):
    return {
        "resourceMetrics": [
            {
                "resource": {"attributes": [kv("service.name", s("claude-code")), kv("host.id", s("hid"))]},
                "scopeMetrics": [{"scope": {"name": "com.anthropic"}, "metrics": list(metrics)}],
            }
        ]
    }


def _point(**extra):
    return {
        "startTimeUnixNano": str(T0),
        "timeUnixNano": str(T1),
        "attributes": [kv("session.id", s("sess")), kv("model", s("opus"))],
        **extra,
    }


RES_M = {"service.name": "claude-code", "host.id": "hid"}
ATTRS_M = {"scope.name": "com.anthropic", "session.id": "sess", "model": "opus"}


def _mrow(name, mtype, value, desc="d", attrs=None, temporality="", monotonic=None, unit="1"):
    attrs = attrs if attrs is not None else dict(ATTRS_M)
    return {
        "Timestamp": T1_TEXT,
        "MetricName": name,
        "MetricType": mtype,
        "MetricUnit": unit,
        "MetricDescription": desc,
        "MetricValue": value,
        "Host": HOST,
        "ResourceAttributes": RES_M,
        "MetricAttributes": attrs,
        "StartTime": T0_TEXT,
        "Temporality": temporality,
        "Monotonic": monotonic,
        "SessionId": "sess",
        "Tool": "claude-code",
        "Model": "opus",
        "MachineId": "hid",
        "node_id": HOST,
        "RowKey": otel._row_key(name, mtype, T1_TEXT, T0_TEXT, attrs, RES_M),
        **promoted("OTELMetrics"),
    }


def _metrics(*metrics):
    return both(convert_metrics, _metric_body(*metrics), metrics_service.ExportMetricsServiceRequest)


def test_a_metric_point_without_a_time_takes_the_time_it_was_received():
    point = _point(asDouble=1.5)
    point["timeUnixNano"] = "0"
    metric = {"name": "g", "description": "d", "unit": "1", "gauge": {"dataPoints": [point]}}
    [row] = _metrics(metric).rows["OTELMetrics"]
    assert row["Timestamp"] == format_time(RECV)
    [again] = convert_metrics(_metric_body(metric), received_ns=RECV + 10**9, host=HOST).rows["OTELMetrics"]
    assert again["RowKey"] == row["RowKey"]


def test_a_log_without_a_time_keeps_its_key_when_sent_again():
    body = _log_body()
    rec = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    del rec["timeUnixNano"]
    del rec["observedTimeUnixNano"]
    [first] = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"]
    [again] = convert_logs(body, received_ns=RECV + 10**9, host=HOST).rows["OTELLogs"]
    assert again["RowKey"] == first["RowKey"]
    assert again["Timestamp"] != first["Timestamp"]


def test_gauge_and_monotonic_cumulative_sum():
    out = _metrics(
        {"name": "g", "description": "d", "unit": "1", "gauge": {"dataPoints": [_point(asDouble=1.5)]}},
        {
            "name": "c",
            "description": "d",
            "unit": "1",
            "sum": {"dataPoints": [_point(asInt="42")], "aggregationTemporality": 2, "isMonotonic": True},
        },
    )
    assert out.rows["OTELMetrics"] == [
        _mrow("g", "Gauge", 1.5),
        _mrow("c", "Sum", 42.0, temporality="Cumulative", monotonic=True),
    ]
    assert list(out.rows["OTELMetrics"][0]) == list(TABLES_BY_NAME["OTELMetrics"].column_names)


def test_histogram_with_min_and_max():
    out = _metrics(
        {
            "name": "h",
            "description": "d",
            "unit": "1",
            "histogram": {
                "aggregationTemporality": 1,
                "dataPoints": [
                    _point(
                        count="6",
                        sum=12.5,
                        min=0.5,
                        max=9.0,
                        explicitBounds=[1.0, 2.5],
                        bucketCounts=["1", "2", "3"],
                    )
                ],
            },
        }
    )

    def b(le, v):
        return _mrow("h_bucket", "Histogram", v, attrs={**ATTRS_M, "le": le}, temporality="Delta")

    assert out.rows["OTELMetrics"] == [
        _mrow("h_sum", "Histogram", 12.5, desc="d(Sum total of samples)", temporality="Delta"),
        _mrow("h_count", "Histogram", 6.0, desc="d(Count of samples)", temporality="Delta"),
        _mrow("h_min", "Histogram", 0.5, desc="d(Min of samples)", temporality="Delta"),
        _mrow("h_max", "Histogram", 9.0, desc="d(Max of samples)", temporality="Delta"),
        b("1", 1.0),
        b("2.5", 3.0),
        b("+Inf", 6.0),
    ]


def test_summary():
    out = _metrics(
        {
            "name": "s",
            "description": "d",
            "unit": "ms",
            "summary": {
                "dataPoints": [
                    _point(
                        count="4",
                        sum=10.0,
                        quantileValues=[{"quantile": 0.5, "value": 2.0}, {"quantile": 0.99, "value": 7.0}],
                    )
                ]
            },
        }
    )
    assert out.rows["OTELMetrics"] == [
        _mrow("s_sum", "Summary", 10.0, desc="d(Sum total of samples)", unit="ms"),
        _mrow("s_count", "Summary", 4.0, desc="d(Count of samples)", unit="ms"),
        _mrow(
            "s_0.5", "Summary", 2.0, desc="d(Count of samples)", unit="ms", attrs={**ATTRS_M, "qt": "0.5", "s_0.5": 2.0}
        ),
        _mrow(
            "s_0.99",
            "Summary",
            7.0,
            desc="d(Count of samples)",
            unit="ms",
            attrs={**ATTRS_M, "qt": "0.99", "s_0.99": 7.0},
        ),
    ]


def test_exponential_histogram():
    out = _metrics(
        {
            "name": "e",
            "description": "d",
            "unit": "1",
            "exponentialHistogram": {
                "aggregationTemporality": 2,
                "dataPoints": [
                    _point(
                        count="10",
                        sum=20.0,
                        scale=1,
                        zeroCount="1",
                        positive={"offset": 1, "bucketCounts": ["2", "3"]},
                        negative={"offset": 0, "bucketCounts": ["4"]},
                    )
                ],
            },
        }
    )
    # scale 1: base sqrt(2); index i has upper bound 2 ** ((i + 1) / 2).
    up2, up3 = 2.0, 2.0**1.5

    def b(le, v):
        return _mrow("e_bucket", "ExponentialHistogram", v, attrs={**ATTRS_M, "le": le}, temporality="Cumulative")

    assert out.rows["OTELMetrics"] == [
        _mrow("e_sum", "ExponentialHistogram", 20.0, desc="d(Sum total of samples)", temporality="Cumulative"),
        _mrow("e_count", "ExponentialHistogram", 10.0, desc="d(Count of samples)", temporality="Cumulative"),
        b("0", 5.0),
        b(otel.go_format_g(up2), 7.0),
        b(otel.go_format_g(up3), 10.0),
        b("+Inf", 10.0),
    ]
    assert otel.go_format_g(up3) == "2.8284271247461903"


def test_nonfinite_values_become_null_and_are_counted():
    out = _metrics(
        {"name": "g", "description": "d", "unit": "1", "gauge": {"dataPoints": [_point(asDouble="NaN")]}},
        {"name": "i", "description": "d", "unit": "1", "gauge": {"dataPoints": [_point(asDouble="Infinity")]}},
        {"name": "n", "description": "d", "unit": "1", "gauge": {"dataPoints": [_point(asDouble="-Infinity")]}},
    )
    assert [r["MetricValue"] for r in out.rows["OTELMetrics"]] == [None, None, None]
    assert out.stats["dropped_nonfinite"] == 3
    for row in out.rows["OTELMetrics"]:
        json.loads(json_line(row))
    logs = _log_body()
    logs["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]["attributes"] = [kv("x", {"doubleValue": "NaN"})]
    [row] = convert_logs(logs, received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert row["LogsAttributes"]["x"] == "NaN"
    json.loads(json_line(row))


def test_go_float_formatting():
    assert [otel.go_format_g(v) for v in (1.0, 0.5, 1e6, 123456.0, 1e-7, math.inf)] == [
        "1",
        "0.5",
        "1e+06",
        "123456",
        "1e-07",
        "+Inf",
    ]
    assert [otel.go_format_f(v) for v in (0.5, 0.99, 1.0, 1e-7)] == ["0.5", "0.99", "1", "0.0000001"]


# ── Malformed input ───────────────────────────────────────────────────


def test_malformed_record_in_the_middle_is_skipped():
    body = _log_body()
    recs = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"]
    good = recs[0]
    recs[:] = [good, {"timeUnixNano": "not-a-number"}, "garbage", {**good, "body": s("last")}]
    out = convert_logs(body, received_ns=RECV, host=HOST)
    assert [r["Body"] for r in out.rows["OTELLogs"]] == ["hello", "last"]
    assert out.stats["bad_records"] == 2 and out.stats["records"] == 2

    mbody = _metric_body(
        {"name": "a", "gauge": {"dataPoints": [_point(asDouble=1.0), _point(asInt="x"), _point(asInt="3")]}},
        {"name": "weird"},
    )
    out = convert_metrics(mbody, received_ns=RECV, host=HOST)
    assert [r["MetricValue"] for r in out.rows["OTELMetrics"]] == [1.0, 3.0]
    assert out.stats["bad_records"] == 1 and out.stats["unsupported_metrics"] == 1


def test_snake_case_keys_accepted():
    msg = json_format.ParseDict(_hex_to_b64(_log_body()), logs_service.ExportLogsServiceRequest())
    snake = json_format.MessageToDict(msg, preserving_proto_field_name=True)
    a = convert_logs(_log_body(), received_ns=RECV, host=HOST)
    b = convert_logs(snake, received_ns=RECV, host=HOST)
    assert a.rows == b.rows


# ── RowKey ────────────────────────────────────────────────────────────


def test_row_key_stable_and_distinct():
    a = convert_logs(_log_body(), received_ns=RECV, host=HOST).rows["OTELLogs"][0]["RowKey"]
    b = convert_logs(_log_body(), received_ns=RECV + 5, host="other").rows["OTELLogs"][0]["RowKey"]
    assert a == b
    other = _log_body()
    other["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]["body"] = s("bye")
    assert convert_logs(other, received_ns=RECV, host=HOST).rows["OTELLogs"][0]["RowKey"] != a
    spans = convert_traces(_trace_body(), received_ns=RECV, host=HOST).rows["OTELTraces"]
    assert len({r["RowKey"] for r in spans}) == 2
    h = _metrics(
        {
            "name": "h",
            "histogram": {"dataPoints": [_point(count="1", sum=1.0, explicitBounds=[1.0], bucketCounts=["1", "0"])]},
        }
    )
    keys = [r["RowKey"] for r in h.rows["OTELMetrics"]]
    assert len(set(keys)) == len(keys)


# ── Size safety ───────────────────────────────────────────────────────


def _big_text(n_bytes):
    unit = "word Ünïcødé 漢字 😀 "
    reps = n_bytes // len(unit.encode()) + 1
    return (unit * reps)[: n_bytes // 2]


def _payload_text(out, pid):
    chunks = sorted((r for r in out.rows[PAYLOADS] if r["PayloadId"] == pid), key=lambda r: r["ChunkNo"])
    assert [c["ChunkNo"] for c in chunks] == list(range(chunks[0]["ChunkCount"]))
    for c in chunks:
        assert len(c["Text"].encode("utf-8")) <= CHUNK_BYTES
    return "".join(c["Text"] for c in chunks), chunks


def _assert_lines_fit(out):
    for rows in out.rows.values():
        for row in rows:
            assert len(json_line(row).encode()) <= 1024 * 1024


def test_large_body_and_attribute_spill_to_payloads():
    text = _big_text(6_000_000)
    assert len(text.encode()) > 3_000_000
    attr_text = "attr " + text[::-1]
    body = _log_body()
    rec = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    rec["body"] = s(text)
    rec["attributes"].append(kv("gen_ai.prompt", s(attr_text)))
    plain = convert_logs(copy.deepcopy(body), received_ns=RECV, host=HOST)
    [row] = plain.rows["OTELLogs"]
    _assert_lines_fit(plain)

    assert row["Body"] == text[:256]
    ref = row["LogsAttributes"]["aictl.body_payload"]
    assert ref == {"payload_id": hashlib.sha256(text.encode()).hexdigest(), "bytes": len(text.encode())}
    joined, chunks = _payload_text(plain, ref["payload_id"])
    assert joined == text
    assert len(chunks) > 1
    assert {(c["PayloadKind"], c["SourceTable"], c["SourceField"], c["SourceRowKey"]) for c in chunks} == {
        ("body", "OTELLogs", "Body", row["RowKey"])
    }
    for c in chunks[1:]:
        assert not c["Text"][0].isalnum()

    aref = row["LogsAttributes"]["gen_ai.prompt"]
    assert aref["bytes"] == len(attr_text.encode()) and aref["preview"] == attr_text[:256]
    joined, chunks = _payload_text(plain, aref["payload_id"])
    assert joined == attr_text
    assert chunks[0]["PayloadKind"] == "gen_ai.prompt"
    assert chunks[0]["SourceField"] == "LogsAttributes.gen_ai.prompt"
    assert chunks[0]["SessionId"] == "res-session" and chunks[0]["Tool"] == "codex-cli"
    assert plain.stats["spilled_values"] == 2

    small = _log_body()
    expected_key = None
    small_rec = small["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    small_rec["body"] = s(text)
    small_rec["attributes"].append(kv("gen_ai.prompt", s(attr_text)))
    expected_key = convert_logs(small, received_ns=RECV, host=HOST, keep_text=False).rows["OTELLogs"][0]["RowKey"]
    assert expected_key == row["RowKey"]


def test_same_payload_twice_is_emitted_once():
    text = "x" * (SPILL_BYTES + 10)
    body = _log_body()
    recs = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"]
    recs.append({**recs[0], "timeUnixNano": str(T1 + 1), "body": s(text)})
    recs[0] = {**recs[0], "body": s(text)}
    out = convert_logs(body, received_ns=RECV, host=HOST)
    assert len(out.rows["OTELLogs"]) == 2
    assert len(out.rows[PAYLOADS]) == 1
    assert out.rows[PAYLOADS][0]["Text"] == text


def test_bag_of_many_medium_values_is_brought_under_budget():
    body = _log_body()
    rec = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    rec["attributes"] = [kv(f"k{i}", s(f"{i}:" + "é" * 10_000)) for i in range(60)]
    out = convert_logs(body, received_ns=RECV, host=HOST)
    [row] = out.rows["OTELLogs"]
    assert len(json.dumps(row["LogsAttributes"], separators=(",", ":"))) <= BAG_BYTES
    _assert_lines_fit(out)
    for key, value in row["LogsAttributes"].items():
        if isinstance(value, dict) and "payload_id" in value:
            joined, _ = _payload_text(out, value["payload_id"])
            assert joined.startswith(key[1:] + ":")
    assert out.stats["spilled_values"] > 0


def test_large_span_event_attribute_spills():
    body = _trace_body()
    span = body["resourceSpans"][0]["scopeSpans"][0]["spans"][1]
    big = "prompt " * 200_000
    span["events"][0]["attributes"].append(kv("gen_ai.prompt", s(big)))
    out = convert_traces(body, received_ns=RECV, host=HOST)
    child = out.rows["OTELTraces"][1]
    ref = child["Events"][0]["EventAttributes"]["gen_ai.prompt"]
    joined, chunks = _payload_text(out, ref["payload_id"])
    assert joined == big
    assert chunks[0]["SourceField"] == "Events[0].EventAttributes.gen_ai.prompt"
    _assert_lines_fit(out)


SECRET = "s3cret"


def _no_secret(out):
    for rows in out.rows.values():
        for row in rows:
            assert SECRET not in json_line(row)


def test_keep_text_false_stores_no_log_text():
    long = (SECRET + " ") * 100
    body = _log_body()
    rec = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    rec["body"] = s("the user asked for " + SECRET)
    rec["attributes"] += [
        kv("gen_ai.prompt", s(_big_text(200_000) + SECRET)),
        kv("prompt", s(SECRET)),  # short, and still text
        kv("note", s(long)),
        kv("nested", {"kvlistValue": {"values": [kv("tool_input", s(SECRET)), kv("depth", {"intValue": "2"})]}}),
        kv(
            "parts",
            {"arrayValue": {"values": [s(long), s("short"), {"kvlistValue": {"values": [kv("text", s(SECRET))]}}]}},
        ),
    ]
    full = convert_logs(body, received_ns=RECV, host=HOST)
    out = convert_logs(body, received_ns=RECV, host=HOST, keep_text=False)
    [row] = out.rows["OTELLogs"]
    _no_secret(out)
    assert out.rows[PAYLOADS] == [] and out.stats["payload_rows"] == 0
    assert row["Body"] == ""
    attrs = row["LogsAttributes"]
    assert attrs["aictl.body_chars"] == len("the user asked for " + SECRET)
    assert attrs["gen_ai.prompt_chars"] == len(_big_text(200_000) + SECRET)
    assert attrs["prompt_chars"] == len(SECRET)
    assert attrs["note_chars"] == len(long)
    assert attrs["nested"] == {"tool_input_chars": len(SECRET), "depth": 2}
    assert attrs["parts"] == [{"chars": len(long)}, "short", {"text_chars": len(SECRET)}]
    # What is not text stays, and the row is the same row.
    assert (attrs["model"], attrs["count"], attrs["ratio"], attrs["ok"]) == ("gpt-5", 7, 0.25, True)
    assert (row["EventName"], row["Model"], row["SessionId"]) == ("codex.api_request", "gpt-5", "res-session")
    assert row["RowKey"] == full.rows["OTELLogs"][0]["RowKey"]


def test_keep_text_false_follows_the_stores_rule():
    from aictl.records import strip_event_text

    detail = {"prompt": "p", "n": 1, "long": "x" * 300, "name": "Bash", "inner": {"command": "ls", "ok": True}}
    assert otel._no_text(detail) == strip_event_text(detail)


def test_a_body_that_names_the_event_is_the_event_name_and_is_kept():
    body = _log_body()
    rec = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    rec["body"] = s("claude_code.tool_result")
    rec["attributes"] = [kv("tool_name", s("Bash"))]
    for keep in (True, False):
        [row] = convert_logs(body, received_ns=RECV, host=HOST, keep_text=keep).rows["OTELLogs"]
        assert (row["EventName"], row["Body"]) == ("claude_code.tool_result", "claude_code.tool_result")
        assert "aictl.body_chars" not in row["LogsAttributes"]
    rec["body"] = s("two words")
    [row] = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert row["EventName"] == ""


def test_keep_text_false_stores_no_span_or_metric_text():
    long = (SECRET + " ") * 100
    body = _trace_body()
    span = body["resourceSpans"][0]["scopeSpans"][0]["spans"][1]
    span["attributes"] += [kv("gen_ai.input.messages", s(SECRET)), kv("note", s(long))]
    span["events"][0]["attributes"].append(kv("gen_ai.prompt", s(SECRET)))
    span["links"][0]["attributes"].append(kv("message", s(SECRET)))
    span["status"] = {"code": 2, "message": long}
    out = convert_traces(body, received_ns=RECV, host=HOST, keep_text=False)
    child = out.rows["OTELTraces"][1]
    _no_secret(out)
    assert out.rows[PAYLOADS] == []
    assert child["SpanStatusMessage"] == ""
    assert child["TraceAttributes"]["aictl.status_message_chars"] == len(long)
    assert child["TraceAttributes"]["gen_ai.input.messages_chars"] == len(SECRET)
    assert child["Events"][0]["EventAttributes"] == {"n": 1, "gen_ai.prompt_chars": len(SECRET)}
    assert child["Links"][0]["SpanLinkAttributes"] == {"why": "follows", "message_chars": len(SECRET)}
    assert child["SpanName"] and child["Model"] == "gpt-5"

    point = _point(asDouble=1.0)
    point["attributes"].append(kv("command", s(SECRET)))
    metric = {"name": "g", "description": "d", "unit": "1", "gauge": {"dataPoints": [point]}}
    out = convert_metrics(_metric_body(metric), received_ns=RECV, host=HOST, keep_text=False)
    [row] = out.rows["OTELMetrics"]
    _no_secret(out)
    assert row["MetricAttributes"]["command_chars"] == len(SECRET)
    assert (
        row["RowKey"]
        == convert_metrics(_metric_body(metric), received_ns=RECV, host=HOST).rows["OTELMetrics"][0]["RowKey"]
    )


def test_half_a_surrogate_pair_is_stored_as_the_replacement_character():
    body = _log_body()
    rec = body["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    rec["body"] = s("cut here \ud83d")
    rec["attributes"] = [kv("note", s("\ude00 and a whole 😀"))]
    [row] = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"]
    stored = json.loads(json_line(row))
    assert stored["Body"] == "cut here \ufffd"
    assert stored["LogsAttributes"]["note"] == "\ufffd and a whole 😀"


def test_chunk_text_never_splits_a_character_or_needs_a_word_boundary():
    text = "😀" * (CHUNK_BYTES // 2)
    chunks = chunk_text(text)
    assert "".join(chunks) == text
    assert all(len(c.encode()) <= CHUNK_BYTES for c in chunks)
    assert chunk_text("") == []


# ── Tables ────────────────────────────────────────────────────────────


COLLECTOR = {
    "OTELLogs": "Timestamp:datetime, ObservedTimestamp:datetime, TraceID:string, SpanID:string, SeverityText:string, "
    "SeverityNumber:int, Body:string, ResourceAttributes:dynamic, LogsAttributes:dynamic",
    "OTELMetrics": "Timestamp:datetime, MetricName:string, MetricType:string, MetricUnit:string, "
    "MetricDescription:string, MetricValue:real, Host:string, ResourceAttributes:dynamic, MetricAttributes:dynamic",
    "OTELTraces": "TraceID:string, SpanID:string, ParentID:string, SpanName:string, SpanStatus:string, "
    "SpanKind:string, StartTime:datetime, EndTime:datetime, ResourceAttributes:dynamic, TraceAttributes:dynamic, "
    "Events:dynamic, Links:dynamic, SpanStatusMessage:string",
}


def test_create_commands_begin_with_the_collector_columns():
    commands = create_commands()
    assert len(commands) == 4
    for cmd in commands:
        name = cmd.split()[2]
        if name in COLLECTOR:
            assert cmd.startswith(f".create-merge table {name} ({COLLECTOR[name]}, ")
            assert TABLES_BY_NAME[name].collector_columns == COLLECTOR[name].count(":")
        assert "rowid" not in cmd and "_v:" not in cmd and "_deleted" not in cmd
    for table in TABLES_BY_NAME.values():
        assert all(c.doc for c in table.columns)


# ── Promoted attribute columns ────────────────────────────────────────
# Attribute names follow docs/tools-analysis-docs/ai-tools-observability.md (Claude Code)
# and test/fixtures/otel/copilot_cli_synthetic_session.jsonl (Copilot CLI).

SECRET = "rm -rf /secret/project && echo hunter2"


def _claude_logs(*records):
    """A Claude Code logs export: each record is (event name, [KeyValue, ...])."""
    resource = {"attributes": [kv("service.name", s("claude-code")), kv("service.version", s("2.1.3")),
                               kv("host.name", s("box1"))]}
    log_records = [
        {"timeUnixNano": str(T1 + i), "body": s(f"claude_code.{name}"),
         "attributes": [kv("event.name", s(name)), kv("session.id", s("sess-1")), *attrs]}
        for i, (name, attrs) in enumerate(records)
    ]
    return {"resourceLogs": [{"resource": resource,
                              "scopeLogs": [{"scope": {"name": "com.anthropic.claude_code"}, "logRecords": log_records}]}]}


def _promoted_of(row, table):
    names = TABLES_BY_NAME[table].column_names
    return {k: row[k] for k in names[names.index("node_id") + 1:]}


def test_claude_api_request_columns_are_typed_and_string_numbers_parse():
    body = _claude_logs(("api_request", [
        kv("model", s("claude-opus-4-6")), kv("input_tokens", s("1200")), kv("output_tokens", {"intValue": "345"}),
        kv("cache_read_tokens", s("9000")), kv("cache_creation_tokens", {"intValue": 120}),
        kv("cost_usd", s("0.0123")), kv("duration_ms", {"doubleValue": 1234.6}), kv("speed", s("fast")),
        kv("prompt.id", s("p-1")), kv("event.sequence", s("7")), kv("request_id", s("req_01")),
        kv("app.version", s("2.1.4")), kv("terminal.type", s("vscode")), kv("organization.id", s("org-1")),
        kv("user.account_uuid", s("acct-1")), kv("user.email", s("a@example.com")),
    ]))
    out = both(convert_logs, body, logs_service.ExportLogsServiceRequest)
    [row] = out.rows["OTELLogs"]
    assert _promoted_of(row, "OTELLogs") == promoted(
        "OTELLogs", EventSequence=7, PromptId="p-1", InputTokens=1200, OutputTokens=345,
        CacheReadInputTokens=9000, CacheWriteInputTokens=120, CostUsd=0.0123, DurationMs=1235,
        Speed="fast", RequestId="req_01", AppVersion="2.1.4", TerminalType="vscode",
        OrganizationId="org-1", UserAccountUuid="acct-1",
    )
    assert type(row["InputTokens"]) is int and type(row["CostUsd"]) is float
    assert "a@example.com" not in json.dumps(_promoted_of(row, "OTELLogs"))
    assert row["LogsAttributes"]["input_tokens"] == "1200", "the bag keeps the value as sent"
    assert out.stats["bad_values"] == 0


def test_app_version_falls_back_to_the_resource_service_version():
    [row] = convert_logs(_claude_logs(("user_prompt", [])), received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert row["AppVersion"] == "2.1.3"


def test_claude_api_error_and_retry_columns():
    body = _claude_logs(("api_error", [
        kv("error", s("Request rate limited")), kv("status_code", s("429")), kv("attempt", {"intValue": "3"}),
        kv("duration_ms", s("80")),
    ]))
    [row] = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert (row["Error"], row["StatusCode"], row["Attempt"], row["DurationMs"]) == ("Request rate limited", 429, 3, 80)
    assert row["Success"] is None and row["CostUsd"] is None


def test_claude_tool_result_mcp_server_from_parameters_and_from_the_tool_name():
    params = json.dumps({"mcp_server_name": "github", "mcp_tool_name": "create_issue", "body": SECRET})
    body = _claude_logs(
        ("tool_result", [kv("tool_name", s("mcp_tool")), kv("success", s("false")), kv("duration_ms", s("15")),
                         kv("decision_type", s("accept")), kv("decision_source", s("config")),
                         kv("tool_result_size_bytes", s("2048")), kv("tool_parameters", s(params))]),
        ("tool_result", [kv("tool_name", s("mcp__kusto__query")), kv("success", {"boolValue": True})]),
        ("tool_result", [kv("tool_name", s("Skill")), kv("tool_parameters", s('{"skill_name": "pdf"}'))]),
        ("tool_result", [kv("tool_name", s("Bash")), kv("tool_parameters", s('{"skill_name": "not a name!"}'))]),
    )
    explicit, derived, skill, bash = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert (explicit["McpServer"], explicit["McpToolName"], explicit["Success"]) == ("github", "create_issue", False)
    assert (explicit["Decision"], explicit["DecisionSource"], explicit["ToolResultBytes"]) == ("accept", "config", 2048)
    assert explicit["ToolInputChars"] == len(params)
    assert (derived["ToolName"], derived["McpServer"], derived["McpToolName"], derived["Success"]) == (
        "mcp__kusto__query", "kusto", "query", True)
    assert (skill["SkillName"], skill["McpServer"]) == ("pdf", None)
    assert bash["SkillName"] is None
    for keep_text in (True, False):
        rows = convert_logs(body, received_ns=RECV, host=HOST, keep_text=keep_text).rows["OTELLogs"]
        assert rows[0]["McpServer"] == "github" and rows[0]["ToolInputChars"] == len(params)


def test_mcp_tool_parts():
    assert otel.mcp_tool_parts("mcp__plugin_x_y__do__it") == ("plugin_x_y", "do__it")
    for name in ("mcp__", "mcp__srv", "mcp__srv__", "Bash", None, 3):
        assert otel.mcp_tool_parts(name) == (None, None)


def test_tool_decision_source_comes_from_source_only_beside_a_decision():
    body = _claude_logs(
        ("tool_decision", [kv("tool_name", s("Edit")), kv("decision", s("reject")), kv("source", s("user_reject"))]),
        ("user_prompt", [kv("prompt_length", s("42")), kv("source", s("cli"))]),
    )
    decision, prompt = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert (decision["Decision"], decision["DecisionSource"], decision["ToolName"]) == ("reject", "user_reject", "Edit")
    assert (prompt["PromptLength"], prompt["DecisionSource"]) == (42, None)


def test_unreadable_and_nonfinite_values_are_null_and_counted_once():
    body = _claude_logs(("api_request", [
        kv("input_tokens", s("lots")), kv("cost_usd", {"doubleValue": "NaN"}), kv("output_tokens", {"boolValue": True}),
        kv("duration_ms", s("inf")), kv("success", s("maybe")), kv("event.sequence", {"doubleValue": 1e30}),
    ]))
    out = convert_logs(body, received_ns=RECV, host=HOST)
    [row] = out.rows["OTELLogs"]
    columns = ("InputTokens", "CostUsd", "OutputTokens", "DurationMs", "Success", "EventSequence")
    assert [row[c] for c in columns] == [None] * 6
    # lots, True, maybe and 1e30 (out of range) are bad; NaN was counted in the bag, inf here.
    assert out.stats["bad_values"] == 4
    assert out.stats["nonfinite_values"] == 2


def test_error_text_follows_the_capture_mode():
    body = _claude_logs(("api_error", [kv("error", s("E" * 2000))]), ("api_error", [kv("error", s("short"))]))
    full = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"]
    assert full[0]["Error"] == "E" * otel.TEXT_COLUMN_CHARS and full[1]["Error"] == "short"
    meta = convert_logs(body, received_ns=RECV, host=HOST, keep_text=False).rows["OTELLogs"]
    assert meta[0]["Error"] is None and meta[1]["Error"] == "short"


def test_text_off_leaves_no_text_in_promoted_columns():
    body = _claude_logs(
        ("tool_result", [kv("tool_name", s("Bash")), kv("tool_parameters", s(json.dumps({"command": SECRET}))),
                         kv("tool_input", s(SECRET)), kv("error", s(SECRET + "x" * 300))]),
        ("user_prompt", [kv("prompt", s(SECRET)), kv("prompt_length", {"intValue": len(SECRET)})]),
    )
    rows = convert_logs(body, received_ns=RECV, host=HOST, keep_text=False).rows["OTELLogs"]
    for row in rows:
        assert "hunter2" not in json_line(row)
    assert rows[0]["ToolInputChars"] == len(json.dumps({"command": SECRET}))
    assert rows[1]["PromptLength"] == len(SECRET)


def test_a_retried_export_gives_the_same_row_key_and_columns():
    body = _claude_logs(("api_request", [kv("input_tokens", s("5")), kv("request_id", s("req_9"))]))
    first = convert_logs(body, received_ns=RECV, host=HOST).rows["OTELLogs"][0]
    again = convert_logs(copy.deepcopy(body), received_ns=RECV + 10**9, host=HOST).rows["OTELLogs"][0]
    assert first["RowKey"] == again["RowKey"] and first["RequestId"] == "req_9"
    assert _promoted_of(first, "OTELLogs") == _promoted_of(again, "OTELLogs")


def _copilot_spans():
    """Spans shaped like test/fixtures/otel/copilot_cli_synthetic_session.jsonl."""
    resource = {"attributes": [kv("service.name", s("github-copilot")), kv("service.version", s("1.0.108-1"))]}
    chat = [
        kv("gen_ai.provider.name", s("github")), kv("gen_ai.conversation.id", s("conv-1")),
        kv("gen_ai.operation.name", s("chat")), kv("gen_ai.request.model", s("example-model")),
        kv("gen_ai.response.model", s("example-model")),
        kv("gen_ai.response.finish_reasons", {"arrayValue": {"values": [s("tool_calls")]}}),
        kv("gen_ai.usage.input_tokens", {"intValue": "10000"}), kv("gen_ai.usage.output_tokens", {"intValue": "50"}),
        kv("gen_ai.response.id", s("example-response-2")),
        kv("gen_ai.request.previous_response.id", s("example-response-1")),
        kv("github.copilot.service_request_id", s("svc-req-2")), kv("github.copilot.cost", {"doubleValue": 1.0}),
        kv("github.copilot.nano_aiu", {"intValue": "2000000000"}),
        kv("github.copilot.server_duration", {"doubleValue": 3000.0}),
        kv("github.copilot.turn_id", s("1")), kv("github.copilot.initiator", s("agent")),
        kv("github.copilot.interaction_id", s("inter-1")),
        kv("gen_ai.response.time_to_first_chunk", {"doubleValue": 1.5}),
    ]
    tool = [
        kv("gen_ai.conversation.id", s("conv-1")), kv("gen_ai.operation.name", s("execute_tool")),
        kv("gen_ai.tool.name", s("mcp__github__list_issues")), kv("gen_ai.tool.call.id", s("call-1")),
        kv("gen_ai.tool.type", s("function")), kv("process.exit.code", {"intValue": "0"}),
        kv("gen_ai.tool.call.arguments", s(json.dumps({"q": SECRET}))),
    ]
    agent = [
        kv("gen_ai.conversation.id", s("conv-1")), kv("gen_ai.operation.name", s("invoke_agent")),
        kv("github.copilot.agent.type", s("builtin")), kv("github.copilot.turn_count", {"intValue": "2"}),
        kv("github.copilot.context.custom_agent_names", s('["example-agent"]')),
    ]
    spans = [
        {"traceId": TRACE, "spanId": f"{i + 1:016x}", "name": name, "kind": 3,
         "startTimeUnixNano": str(T0 + i), "endTimeUnixNano": str(T1 + i), "attributes": attrs}
        for i, (name, attrs) in enumerate((("chat example-model", chat), ("execute_tool", tool), ("invoke_agent", agent)))
    ]
    return {"resourceSpans": [{"resource": resource,
                               "scopeSpans": [{"scope": {"name": "github.copilot"}, "spans": spans}]}]}


def test_copilot_cli_span_columns():
    out = both(convert_traces, _copilot_spans(), trace_service.ExportTraceServiceRequest)
    chat, tool, agent = out.rows["OTELTraces"]
    assert _promoted_of(chat, "OTELTraces") == promoted(
        "OTELTraces", ResponseId="example-response-2", RequestId="svc-req-2", PreviousResponseId="example-response-1",
        ConversationId="conv-1", InteractionId="inter-1", Initiator="agent", ProviderName="github",
        ResponseModel="example-model", FinishReasons="tool_calls", CopilotCost=1.0, CopilotNanoAiu=2_000_000_000,
        ServerDurationMs=3000.0, TimeToFirstChunkMs=1500.0, AppVersion="1.0.108-1",
    )
    assert (tool["McpServer"], tool["McpToolName"], tool["ToolType"], tool["ProcessExitCode"]) == (
        "github", "list_issues", "function", 0)
    assert tool["ToolInputChars"] == len(json.dumps({"q": SECRET}))
    assert (agent["AgentType"], agent["TurnCount"], agent["ReportedCustomAgentNames"]) == ("builtin", 2, "example-agent")
    assert list(chat) == list(TABLES_BY_NAME["OTELTraces"].column_names)
    off = convert_traces(_copilot_spans(), received_ns=RECV, host=HOST, keep_text=False).rows["OTELTraces"][1]
    assert off["ToolInputChars"] == len(json.dumps({"q": SECRET}))
    assert "hunter2" not in json.dumps(_promoted_of(off, "OTELTraces"))


def test_metric_dimension_columns():
    def sum_metric(name, *attrs):
        point = {"timeUnixNano": str(T1), "asInt": "1", "attributes": [kv("session.id", s("sess")), *attrs]}
        return {"name": name, "sum": {"aggregationTemporality": 1, "isMonotonic": True, "dataPoints": [point]}}

    body = _metric_body(
        sum_metric("claude_code.token.usage", kv("type", s("cacheRead")), kv("model", s("opus"))),
        sum_metric("claude_code.lines_of_code.count", kv("type", s("added"))),
        sum_metric("claude_code.code_edit_tool.decision", kv("tool_name", s("Edit")), kv("decision", s("accept")),
                   kv("source", s("config")), kv("language", s("Python"))),
        sum_metric("copilot_chat.tool.call.count", kv("gen_ai.tool.name", s("mcp__kusto__query"))),
        {"name": "gen_ai.client.token.usage", "histogram": {"aggregationTemporality": 1, "dataPoints": [
            {"timeUnixNano": str(T1), "count": "2", "sum": 30.0, "explicitBounds": [10.0], "bucketCounts": ["1", "1"],
             "attributes": [kv("gen_ai.token.type", s("input")), kv("gen_ai.operation.name", s("chat"))]}]}},
    )
    out = both(convert_metrics, body, metrics_service.ExportMetricsServiceRequest)
    rows = out.rows["OTELMetrics"]
    tokens, loc, decision, calls = rows[:4]
    assert (tokens["Type"], tokens["TokenType"]) == ("cacheRead", "cacheRead")
    assert (loc["Type"], loc["TokenType"]) == ("added", None)
    assert (decision["ToolName"], decision["Decision"], decision["DecisionSource"], decision["Language"]) == (
        "Edit", "accept", "config", "Python")
    assert (calls["ToolName"], calls["McpServer"]) == ("mcp__kusto__query", "kusto")
    histogram = rows[4:]
    assert len(histogram) == 4 and {(r["TokenType"], r["OperationName"]) for r in histogram} == {("input", "chat")}
    assert out.stats["bad_values"] == 0


def test_the_native_otel_tables_match_the_converter_columns():
    from aictl.stores.kusto.tables import TABLES as NATIVE

    for table in TABLES_BY_NAME.values():
        native = [name for name, _ in NATIVE[table.name].columns if name not in ("project", "_v")]
        assert native == list(table.column_names)
        assert dict(NATIVE[table.name].columns).items() >= {c.name: c.kusto_type for c in table.columns}.items()
