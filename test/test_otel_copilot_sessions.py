"""Copilot CLI OpenTelemetry tied to its session, end to end.

The fixture uses Copilot CLI 1.0.108's file-export shape with synthetic identifiers,
timestamps, measurements and installed-tool names. It is turned into the OTLP/JSON
body its exporter posts. Every record must reach the session
named by ``gen_ai.conversation.id``: spans directly, span events through their span,
spans without the attribute through their trace. Stored events of the old shape (no
session id) get it from the one-time backfill, and the agent detail shows the OTel-only
values without changing a token count.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from aictl.dashboard import board_projection, runtime_health
from aictl.dashboard.flow_projection import agent_flow
from aictl.dashboard.otel_receiver import OtelReceiver
from aictl.dashboard.projections.history import HistoryScope
from aictl.dashboard.runtime_health import compute_health
from aictl.dashboard.session_details import agent_detail
from aictl.ingesters.call_facts import copilot_call_key
from aictl.monitoring.tool_config import copilot_cli_otel_endpoint
from aictl.stores import Store
from aictl.stores.testing import FixtureReader

FIXTURE = Path(__file__).parent / "fixtures" / "otel" / "copilot_cli_synthetic_session.jsonl"
SID = "00000000-0000-4000-8000-000000000001"
TRACE = "11111111111111111111111111111111"


def _lines() -> list[dict]:
    return [json.loads(line) for line in FIXTURE.read_text().splitlines() if line.strip()]


def _attrs(d: dict) -> list[dict]:
    out = []
    for k, v in d.items():
        if isinstance(v, bool):
            out.append({"key": k, "value": {"boolValue": v}})
        elif isinstance(v, int):
            out.append({"key": k, "value": {"intValue": str(v)}})
        elif isinstance(v, float):
            out.append({"key": k, "value": {"doubleValue": v}})
        elif isinstance(v, list):
            out.append({"key": k, "value": {"arrayValue": {"values": [{"stringValue": str(x)} for x in v]}}})
        else:
            out.append({"key": k, "value": {"stringValue": str(v)}})
    return out


def _nanos(t: list[int]) -> str:
    return str(t[0] * 1_000_000_000 + t[1])


def _otlp_span(line: dict) -> dict:
    span = {
        "traceId": line["traceId"],
        "spanId": line["spanId"],
        "name": line["name"],
        "kind": line["kind"],
        "startTimeUnixNano": _nanos(line["startTime"]),
        "endTimeUnixNano": _nanos(line["endTime"]),
        "attributes": _attrs(line["attributes"]),
        "status": line["status"],
        "events": [
            {"name": e["name"], "timeUnixNano": _nanos(e["time"]), "attributes": _attrs(e["attributes"])}
            for e in line["events"]
        ],
    }
    if line.get("parentSpanId"):
        span["parentSpanId"] = line["parentSpanId"]
    return span


def _body(spans: list[dict]) -> dict:
    """The OTLP/JSON traces body Copilot posts: one resource, one scope."""
    resource = _lines()[0]["resource"]["attributes"]
    return {
        "resourceSpans": [
            {
                "resource": {"attributes": _attrs(resource)},
                "scopeSpans": [{"scope": {"name": "github.copilot"}, "spans": spans}],
            }
        ]
    }


def _spans() -> list[dict]:
    return [_otlp_span(x) for x in _lines() if x["type"] == "span"]


def _without_conversation(span: dict) -> dict:
    span = copy.deepcopy(span)
    span["attributes"] = [a for a in span["attributes"] if a["key"] != "gen_ai.conversation.id"]
    return span


class TestReceiverTiesEveryRecord:
    def test_every_span_and_span_event_of_the_example_session_has_its_session_id(self):
        _samples, events = OtelReceiver().parse_traces(_body(_spans()))
        spans = [e for e in events if "span.name" in e.detail]
        span_events = [e for e in events if "parent_span" in e.detail]
        assert len(spans) == 4 and len(span_events) == 19
        assert {e.session_id for e in events} == {SID}
        assert all(e.tool == "copilot-cli" for e in events)

    def test_a_span_event_carries_its_span_and_trace(self):
        _s, events = OtelReceiver().parse_traces(_body(_spans()))
        usage = [e for e in events if e.kind == "otel:github.copilot.session.usage_info"]
        assert [e.detail["github.copilot.current_tokens"] for e in usage] == [12000, 15000]
        assert {e.detail["otel.span_id"] for e in usage} == {"5555555555555555"}  # invoke_agent
        assert {e.detail["otel.trace_id"] for e in usage} == {TRACE}
        assert {e.detail["session_id"] for e in usage} == {SID}

    def test_a_span_without_the_attribute_takes_its_trace_session_wherever_it_is_in_the_export(self):
        spans = _spans()
        tool = next(s for s in spans if s["name"].startswith("execute_tool"))
        rest = [s for s in spans if s is not tool]
        # The span that names nothing comes first in the export.
        _s, events = OtelReceiver().parse_traces(_body([_without_conversation(tool), *rest]))
        tool_events = [e for e in events if e.detail.get("otel.span_id") == tool["spanId"]]
        assert tool_events and {e.session_id for e in tool_events} == {SID}

    def test_a_trace_named_by_a_later_export_adds_a_link_without_patching_events(self):
        from aictl.session_facts import SessionFacts
        from aictl.stores.testing import MemoryWriter

        receiver = OtelReceiver()
        spans = _spans()
        tool = next(s for s in spans if s["name"].startswith("execute_tool"))
        _s, first = receiver.parse_traces(_body([_without_conversation(tool)]))
        assert {e.session_id for e in first} == {""}
        assert receiver.take_trace_links() == []
        writer = MemoryWriter()
        facts = SessionFacts(writer)
        facts.events(first, source="traces")
        _s, second = receiver.parse_traces(_body([s for s in spans if s is not tool]))
        assert {e.session_id for e in second} == {SID}
        late = receiver.take_trace_links()
        assert late == [(TRACE, SID)]
        assert receiver.take_trace_links() == []
        facts.trace_links(late)
        assert [table for _, table, _ in writer.operations] == ["events", "otel_trace_sessions"]
        assert {row["session_id"] for row in writer.operations[0][2]} == {""}
        assert writer.operations[1][2] == [{"trace_id": TRACE, "session_id": SID, "project": ""}]

    def test_a_log_record_takes_the_session_of_its_trace(self):
        receiver = OtelReceiver()
        receiver.parse_traces(_body(_spans()))
        body = {
            "resourceLogs": [
                {
                    "resource": {"attributes": _attrs({"service.name": "github-copilot"})},
                    "scopeLogs": [
                        {
                            "logRecords": [
                                {
                                    "timeUnixNano": "1700000002000000000",
                                    "traceId": TRACE,
                                    "attributes": _attrs({"event.name": "some.log"}),
                                },
                            ]
                        }
                    ],
                }
            ]
        }
        (event,) = receiver.parse_logs(body)
        assert event.session_id == SID

    def test_metrics_stay_without_a_session(self):
        # Copilot's metric points carry no conversation id; a span-only attribute must not split them.
        lines = [
            x for x in _lines() if x["type"] == "metric" and x["name"] == "gen_ai.client.inference.usage.output_tokens"
        ]
        point = lines[0]["dataPoints"][0]
        body = {
            "resourceMetrics": [
                {
                    "resource": {"attributes": _attrs({"service.name": "github-copilot"})},
                    "scopeMetrics": [
                        {
                            "metrics": [
                                {
                                    "name": lines[0]["name"],
                                    "sum": {
                                        "dataPoints": [
                                            {
                                                "timeUnixNano": _nanos(point["endTime"]),
                                                "asInt": str(point["value"]),
                                                "attributes": _attrs(
                                                    {**point["attributes"], "gen_ai.conversation.id": SID}
                                                ),
                                            }
                                        ]
                                    },
                                },
                            ]
                        }
                    ],
                }
            ]
        }
        (sample,) = OtelReceiver().parse_metrics(body)
        assert "session_id" not in sample.tags

    def test_span_token_samples_carry_no_session(self):
        # The span-derived token samples must never count toward a session: the session file does.
        samples, _e = OtelReceiver().parse_traces(_body(_spans()))
        assert samples and all("session_id" not in s.tags for s in samples)


# ─── Backfill of events stored before the receiver named the session ─────


# ─── The agent detail: the otel block, and the session file's numbers untouched ─────

NOW = 1700000010.0 + 3600


def _seed_session(db, project: str) -> None:
    """The session as aictl reads it from the session file: its two model calls and one tool call."""
    fields = {"session_id": SID, "tool": "copilot-cli", "project_path": project, "source": "transcript"}
    db.insert("sessions", **fields, started_at=1700000000.0)
    for ts, i, o, cr, cw, cost, duration in (
        (1700000005.0, 10000, 50, 6000, 3000, 0.02, 3000.0),
        (1700000009.8, 12000, 100, 10000, 1000, 0.005, 4000.0),
    ):
        db.insert("requests", **fields, dedup_key=copilot_call_key(SID, (i, o, cr, cw), 0), ts=ts,
                  model="example-model", input_tokens=max(0, i - cr - cw), output_tokens=o, cache_read_tokens=cr,
                  cache_creation_tokens=cw, cost_usd=cost, duration_ms=duration)
    db.insert("tool_invocations", **fields, dedup_key="t1", ts=1700000005.2, tool_name="bash")


def _seed_events(db):
    _, events = OtelReceiver().parse_traces(_body(_spans()))
    for row in events:
        db.insert("events", ts=row.ts, tool=row.tool, kind=row.kind, session_id=row.session_id,
                  pid=row.pid, detail=json.dumps(row.detail))


class OtelFixtureReader(FixtureReader):
    def __init__(self, replay):
        super().__init__({"files.inventory": []})
        self.replay = replay

    def read(self, view, params):
        return super().read(view, params) if view in self.views else self.replay.read(view, params)


@pytest.fixture
def history_store(kusto_store):
    kusto_store.history_store = Store(reader=OtelFixtureReader(kusto_store.history_store.reader))
    return kusto_store


@pytest.fixture
def seeded(tmp_path, history_store):
    _seed_session(history_store, str(tmp_path))
    return history_store


class TestAgentDetail:
    def test_the_otel_block_has_the_otel_only_values_matched_to_the_session_file_calls(self, seeded):
        before = agent_detail(seeded, SID, None, NOW)[1]
        assert before["otel"] is None
        _seed_events(seeded)
        code, d = agent_detail(seeded, SID, None, NOW)
        assert code == 200
        otel = d["otel"]
        assert otel["spans"] == {"count": 4, "last_ts": pytest.approx(1700000005.1)}
        assert otel["span_events"]["count"] == 19
        assert otel["metrics"] is None
        calls = otel["calls"]
        assert [c["matched"] for c in calls] == [True, True]
        assert [c["request_ts"] for c in calls] == [1700000005.0, 1700000009.8]
        assert [c["ai_credits"] for c in calls] == [2.0, 0.5]
        assert [c["server_ms"] for c in calls] == [3000.0, 4000.0]
        assert [c["ttft_ms"] for c in calls] == [1500.0, 2000.0]
        assert all("tokens" not in c for c in calls)  # matched: the session file's tokens count
        assert otel["totals"] == {
            "calls": 2,
            "matched": 2,
            "nano_aiu": 2500000000.0,
            "ai_credits": 2.5,
            "cost": 2.0,
        }
        assert otel["context"] == {
            "ts": pytest.approx(1700000005.3),
            "current": 15000,
            "limit": 100000,
            "share": 0.15,
            "messages": 7,
            "reports": 2,
        }
        ic = otel["in_context"]
        assert ic["turns"] == 1 and len(ic["skills"]) == 3 and ic["custom_agents"][0] == "example-agent"
        assert len(ic["mcp_servers"]) == 7 and all(s["state"] for s in ic["mcp_servers"])
        assert len(otel["mcp_lifecycle"]) == 13
        assert d["sources"] == {
            "session_file": 3,
            "otel_spans": 4,
            "otel_span_events": 19,
            "otel_last_ts": pytest.approx(1700000005.3),
            "hooks": 0,
            "hooks_last_ts": None,
        }
        # OTel changes no number the session file gives.
        for key in ("input", "output", "cache_read", "cache_write", "cost_usd", "tool_calls"):
            assert d["agent"][key] == before["agent"][key], key
        assert d["by_model"] == before["by_model"]

    def test_a_call_the_session_file_does_not_have_shows_its_tokens_and_counts_nowhere(self, seeded):
        seeded.facts.rows["requests"][:] = [row for row in seeded.facts.rows["requests"] if row["ts"] <= 1700000006]
        _seed_events(seeded)
        d = agent_detail(seeded, SID, None, NOW)[1]
        calls = d["otel"]["calls"]
        assert [c["matched"] for c in calls] == [True, False]
        assert calls[1]["tokens"] == {"input": 12000, "output": 100, "cache_read": 10000, "cache_write": 1000}
        assert d["agent"]["output"] == 50

    def test_a_named_mcp_server_shows_its_name(self, seeded):
        _seed_events(seeded)
        seeded.insert("tool_invocations", dedup_key="t2", ts=1700000006.0, session_id=SID, tool="copilot-cli",
                      tool_name="github-mcp-server-get_me", source="transcript")
        d = agent_detail(seeded, SID, None, NOW)[1]
        names = {s["hash"][:8]: s["name"] for s in d["otel"]["mcp_servers"]}
        assert names["4c96a3dc"] == "github-mcp-server"

    def test_the_flow_gains_no_subagent_and_no_second_reply_from_the_spans(self, seeded):
        _seed_events(seeded)
        _code, flow = agent_flow(seeded, SID, now=NOW)
        kinds = [e["type"] for e in flow["turns"]]
        assert "subagent" not in kinds
        assert kinds.count("api_call") == 2
        assert all(e["type"] != "api_response" or not e.get("tokens") for e in flow["turns"])

    def test_machine_events_are_found_for_a_session_with_a_project(self, tmp_path, history_store):
        project = tmp_path / "proj"
        (project / ".git").mkdir(parents=True)
        fields = dict(session_id=SID, tool="copilot-cli", project_path=str(project))
        history_store.insert("sessions", **fields, started_at=1700000000.0)
        history_store.insert(
            "requests", **fields, ts=1700000005.0, model="example-model", input_tokens=1000, output_tokens=50,
            cache_read_tokens=6000, cache_creation_tokens=3000,
            dedup_key=copilot_call_key(SID, (10000, 50, 6000, 3000), 0), source="transcript",
        )
        _seed_events(history_store)
        d = agent_detail(history_store, SID, None, NOW, history=HistoryScope.local(history_store))[1]
        assert d["otel"]["spans"]["count"] == 4
        assert d["otel"]["calls"][0]["matched"] is True


# ─── Setup: the variable Copilot CLI reads ─────


class TestCopilotCliEndpoint:
    def test_enable_writes_the_standard_endpoint_and_not_the_one_copilot_cli_ignores(self):
        from aictl.commands.integrations import RETIRED_ENV_KEYS, _build_env_block
        from aictl.hook_removal import KNOWN_ENV_KEYS

        env = _build_env_block(8484, ["copilot"])
        assert env["OTEL_EXPORTER_OTLP_ENDPOINT"] == "http://localhost:8484"
        assert env["COPILOT_OTEL_ENABLED"] == "true"
        assert "COPILOT_OTEL_ENDPOINT" not in env
        # Old setups still get it removed.
        assert "COPILOT_OTEL_ENDPOINT" in KNOWN_ENV_KEYS and "COPILOT_OTEL_ENDPOINT" in RETIRED_ENV_KEYS

    @pytest.mark.parametrize(
        ("env", "status"),
        [
            ({"OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:8484"}, "ok"),
            ({"OTEL_EXPORTER_OTLP_ENDPOINT": "http://127.0.0.1:8484/"}, "ok"),
            ({"OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318"}, "elsewhere"),
            ({"OTEL_EXPORTER_OTLP_ENDPOINT": "https://collector.example.com"}, "elsewhere"),
            ({}, "missing"),
            ({"COPILOT_OTEL_ENDPOINT": "http://localhost:8484"}, "missing"),
        ],
    )
    def test_the_check_says_plainly_where_copilot_cli_sends(self, env, status):
        got = copilot_cli_otel_endpoint(8484, env)
        assert got["status"] == status
        assert "OTEL_EXPORTER_OTLP_ENDPOINT" in got["text"]
        if "COPILOT_OTEL_ENDPOINT" in env:
            assert "ignores" in got["text"]

    def test_the_health_payload_reports_it(self, monkeypatch, kusto_store):
        monkeypatch.setattr(runtime_health, "_otel_setup", lambda port: {"copilot-cli": copilot_cli_otel_endpoint(port, {})})
        payload = compute_health(kusto_store, None, now=NOW, port=8597)
        assert payload["pipeline"]["otel_setup"]["copilot-cli"]["status"] == "missing"

    def test_the_settings_catalog_says_copilot_cli_ignores_it(self):
        import yaml

        catalog = yaml.safe_load((Path(board_projection.__file__).parents[1] / "data" / "settings-catalog.yaml").read_text(encoding="utf-8"))
        entries = [
            e
            for tool in catalog["tools"].values()
            for e in tool.get("keys", [])
            if e.get("key") == "env.COPILOT_OTEL_ENDPOINT"
        ]
        assert entries and all("Copilot CLI ignores it" in e["description"] for e in entries)
