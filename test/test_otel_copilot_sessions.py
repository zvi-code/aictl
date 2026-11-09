"""Copilot CLI OpenTelemetry tied to its session, end to end.

The spans come from Copilot CLI 1.0.108's own file export of one session (fixtures/otel),
turned into the OTLP/JSON body its exporter posts. Every record must reach the session
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

from aictl.dashboard import board_api
from aictl.dashboard.board_api import agent_detail, agent_flow, compute_machine
from aictl.dashboard.otel_receiver import OtelReceiver
from aictl.ingesters import otel_sessions_backfill
from aictl.ingesters.call_facts import copilot_call_key
from aictl.monitoring.tool_config import copilot_cli_otel_endpoint
from aictl.storage import EventRow, HistoryDB

FIXTURE = Path(__file__).parent / "fixtures" / "otel" / "copilot_cli_1.0.108_session.jsonl"
SID = "8a3ae832-efeb-4ca0-a8af-0ea646505a85"
TRACE = "24ee12faf5cba39170b42d79e7e90b48"


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
    def test_every_span_and_span_event_of_the_real_session_has_its_session_id(self):
        _samples, events = OtelReceiver().parse_traces(_body(_spans()))
        spans = [e for e in events if "span.name" in e.detail]
        span_events = [e for e in events if "parent_span" in e.detail]
        assert len(spans) == 4 and len(span_events) == 19
        assert {e.session_id for e in events} == {SID}
        assert all(e.tool == "copilot-cli" for e in events)

    def test_a_span_event_carries_its_span_and_trace(self):
        _s, events = OtelReceiver().parse_traces(_body(_spans()))
        usage = [e for e in events if e.kind == "otel:github.copilot.session.usage_info"]
        assert [e.detail["github.copilot.current_tokens"] for e in usage] == [20548, 21957]
        assert {e.detail["otel.span_id"] for e in usage} == {"a65407dde206f81f"}  # invoke_agent
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

    def test_a_trace_named_by_a_later_export_is_reported_and_its_stored_events_are_tied(self, tmp_path):
        receiver = OtelReceiver()
        spans = _spans()
        tool = next(s for s in spans if s["name"].startswith("execute_tool"))
        _s, first = receiver.parse_traces(_body([_without_conversation(tool)]))
        assert {e.session_id for e in first} == {""}
        assert receiver.take_late_traces() == []
        db = HistoryDB(db_path=str(tmp_path / "h.db"), flush_interval=0)
        db.append_events(first)
        _s, second = receiver.parse_traces(_body([s for s in spans if s is not tool]))
        assert {e.session_id for e in second} == {SID}
        late = receiver.take_late_traces()
        assert late == [(TRACE, SID)]
        assert receiver.take_late_traces() == []
        assert db.tie_otel_traces(late) == len(first)
        stored = db._conn().execute("SELECT DISTINCT session_id FROM events WHERE kind LIKE 'otel:%'").fetchall()
        assert stored == [(SID,)]
        db.close()

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
                                    "timeUnixNano": "1794186181000000000",
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


def _old_shape(events: list[EventRow]) -> list[EventRow]:
    """Events as the old receiver stored them: no session id, no trace or span ids."""
    out = []
    for e in events:
        d = {
            k: v
            for k, v in e.detail.items()
            if k not in ("session_id", "otel.trace_id", "otel.span_id", "otel.parent_span_id")
        }
        out.append(EventRow(ts=e.ts, tool=e.tool, kind=e.kind, detail=d, session_id="", pid=e.pid))
    return out


class TestBackfill:
    def test_old_events_get_the_session_of_their_conversation_or_of_the_turn_they_fall_in(self, tmp_path):
        _s, events = OtelReceiver().parse_traces(_body(_spans()))
        db = HistoryDB(db_path=str(tmp_path / "h.db"), flush_interval=0)
        db.append_events(_old_shape(events))
        assert otel_sessions_backfill.run(db) is True
        rows = db._conn().execute("SELECT session_id, COUNT(*) FROM events GROUP BY session_id").fetchall()
        assert rows == [(SID, len(events))]
        assert db.state_value(otel_sessions_backfill.STATE_KEY) is not None
        db.close()

    def test_it_runs_once(self, tmp_path):
        db = HistoryDB(db_path=str(tmp_path / "h.db"), flush_interval=0)
        assert otel_sessions_backfill.run(db) is True
        _s, events = OtelReceiver().parse_traces(_body(_spans()))
        db.append_events(_old_shape(events))
        assert otel_sessions_backfill.run(db) is True
        assert db._conn().execute("SELECT COUNT(*) FROM events WHERE session_id = ''").fetchone()[0] == len(events)
        db.close()

    def test_a_span_event_in_two_overlapping_turns_of_two_sessions_keeps_no_session(self, tmp_path):
        db = HistoryDB(db_path=str(tmp_path / "h.db"), flush_interval=0)
        turn = {"gen_ai.operation.name": "invoke_agent", "span.name": "invoke_agent", "duration_ms": 10_000.0}
        db.append_events(
            [
                EventRow(
                    ts=100.0,
                    tool="copilot-cli",
                    kind="otel:invoke_agent",
                    detail={**turn, "gen_ai.conversation.id": "a"},
                ),
                EventRow(
                    ts=105.0,
                    tool="copilot-cli",
                    kind="otel:invoke_agent",
                    detail={**turn, "gen_ai.conversation.id": "b"},
                ),
                EventRow(
                    ts=102.0,
                    tool="copilot-cli",
                    kind="otel:github.copilot.user.message",
                    detail={"parent_span": "invoke_agent"},
                ),
                EventRow(
                    ts=107.0,
                    tool="copilot-cli",
                    kind="otel:github.copilot.user.message",
                    detail={"parent_span": "invoke_agent"},
                ),
                EventRow(
                    ts=112.0,
                    tool="copilot-cli",
                    kind="otel:github.copilot.user.message",
                    detail={"parent_span": "invoke_agent"},
                ),
                EventRow(
                    ts=103.0,
                    tool="other-tool",
                    kind="otel:github.copilot.user.message",
                    detail={"parent_span": "invoke_agent"},
                ),
            ]
        )
        otel_sessions_backfill.run(db)
        got = db._conn().execute("SELECT ts, tool, session_id FROM events ORDER BY ts, tool").fetchall()
        assert got == [
            (100.0, "copilot-cli", "a"),
            (102.0, "copilot-cli", "a"),
            (103.0, "other-tool", ""),
            (105.0, "copilot-cli", "b"),
            (107.0, "copilot-cli", ""),  # inside both turns
            (112.0, "copilot-cli", "b"),
        ]
        db.close()

    def test_an_event_with_a_trace_id_takes_its_trace_session(self, tmp_path):
        db = HistoryDB(db_path=str(tmp_path / "h.db"), flush_interval=0)
        db.append_events(
            [
                EventRow(
                    ts=1.0,
                    tool="t",
                    kind="otel:chat m",
                    detail={"span.name": "chat m", "otel.trace_id": "T", "gen_ai.conversation.id": "s"},
                ),
                EventRow(
                    ts=2.0,
                    tool="t",
                    kind="otel:execute_tool x",
                    detail={"span.name": "execute_tool x", "otel.trace_id": "T"},
                ),
                EventRow(
                    ts=3.0,
                    tool="t",
                    kind="otel:execute_tool y",
                    detail={"span.name": "execute_tool y", "otel.trace_id": "U"},
                ),
            ]
        )
        otel_sessions_backfill.run(db)
        assert db._conn().execute("SELECT session_id FROM events ORDER BY ts").fetchall() == [("s",), ("s",), ("",)]
        db.close()


# ─── The agent detail: the otel block, and the session file's numbers untouched ─────

NOW = 1794186189.0 + 3600


def _seed_session(db: HistoryDB, project: str) -> None:
    """The session as aictl reads it from the session file: its two model calls and one tool call."""
    conn = db._conn()
    conn.execute(
        "INSERT INTO sessions (session_id, tool, project_path, started_at, source) VALUES (?, 'copilot-cli', ?, ?, 'transcript')",
        (SID, project, 1794186176.56),
    )
    for n, (ts, i, o, cr, cw, cost, dur) in enumerate(
        [
            (1794186184.5, 21367, 31, 11662, 9702, 0.025737, 3416.0),
            (1794186189.113, 21482, 71, 21364, 115, 0.00314, 4546.0),
        ]
    ):
        conn.execute(
            "INSERT INTO requests (dedup_key, ts, session_id, tool, project_path, model, input_tokens, output_tokens,"
            " cache_read_tokens, cache_creation_tokens, cost_usd, duration_ms, source)"
            " VALUES (?, ?, ?, 'copilot-cli', ?, 'gpt-6.1-sol', ?, ?, ?, ?, ?, ?, 'transcript')",
            (copilot_call_key(SID, (i, o, cr, cw), 0), ts, SID, project, max(0, i - cr - cw), o, cr, cw, cost, dur),
        )
    conn.execute(
        "INSERT INTO tool_invocations (dedup_key, ts, session_id, tool, tool_name, source) VALUES ('t1', 1794186184.54, ?, 'copilot-cli', 'bash', 'transcript')",
        (SID,),
    )
    conn.commit()


@pytest.fixture()
def seeded(tmp_path):
    db = HistoryDB(db_path=str(tmp_path / "h.db"), flush_interval=0)
    _seed_session(db, str(tmp_path))
    yield db
    db.close()


class TestAgentDetail:
    def test_the_otel_block_has_the_otel_only_values_matched_to_the_session_file_calls(self, seeded):
        before = agent_detail(seeded, SID, None, NOW)[1]
        assert before["otel"] is None
        _s, events = OtelReceiver().parse_traces(_body(_spans()))
        seeded.append_events(events)
        code, d = agent_detail(seeded, SID, None, NOW)
        assert code == 200
        otel = d["otel"]
        assert otel["spans"] == {"count": 4, "last_ts": pytest.approx(1794186184.504)}
        assert otel["span_events"]["count"] == 19
        assert otel["metrics"] is None
        calls = otel["calls"]
        assert [c["matched"] for c in calls] == [True, True]
        assert [c["request_ts"] for c in calls] == [1794186184.5, 1794186189.113]
        assert [c["ai_credits"] for c in calls] == [2.57372, 0.31399]
        assert [c["server_ms"] for c in calls] == [3416.0, 4546.0]
        assert [c["ttft_ms"] for c in calls] == [3651.1, 3554.8]
        assert all("tokens" not in c for c in calls)  # matched: the session file's tokens count
        assert otel["totals"] == {
            "calls": 2,
            "matched": 2,
            "nano_aiu": 2887710000.0,
            "ai_credits": 2.88771,
            "cost": 2.0,
        }
        assert otel["context"] == {
            "ts": pytest.approx(1794186184.564),
            "current": 21957,
            "limit": 272000,
            "share": 0.0807,
            "messages": 7,
            "reports": 2,
        }
        ic = otel["in_context"]
        assert ic["turns"] == 1 and len(ic["skills"]) == 53 and ic["custom_agents"][0] == "tools-expert"
        assert len(ic["mcp_servers"]) == 7 and all(s["state"] for s in ic["mcp_servers"])
        assert len(otel["mcp_lifecycle"]) == 13
        assert d["sources"] == {
            "session_file": 3,
            "otel_spans": 4,
            "otel_span_events": 19,
            "otel_last_ts": pytest.approx(1794186184.564),
            "hooks": 0,
            "hooks_last_ts": None,
        }
        # OTel changes no number the session file gives.
        for key in ("input", "output", "cache_read", "cache_write", "cost_usd", "tool_calls"):
            assert d["agent"][key] == before["agent"][key], key
        assert d["by_model"] == before["by_model"]

    def test_a_call_the_session_file_does_not_have_shows_its_tokens_and_counts_nowhere(self, seeded):
        seeded._conn().execute("DELETE FROM requests WHERE ts > 1794186185")
        seeded._conn().commit()
        _s, events = OtelReceiver().parse_traces(_body(_spans()))
        seeded.append_events(events)
        d = agent_detail(seeded, SID, None, NOW)[1]
        calls = d["otel"]["calls"]
        assert [c["matched"] for c in calls] == [True, False]
        assert calls[1]["tokens"] == {"input": 21482, "output": 71, "cache_read": 21364, "cache_write": 115}
        assert d["agent"]["output"] == 31

    def test_a_named_mcp_server_shows_its_name(self, seeded):
        _s, events = OtelReceiver().parse_traces(_body(_spans()))
        seeded.append_events(events)
        conn = seeded._conn()
        conn.execute(
            "INSERT INTO tool_invocations (dedup_key, ts, session_id, tool, tool_name, source) VALUES ('t2', 1794186185.0, ?, 'copilot-cli', 'github-mcp-server-get_me', 'transcript')",
            (SID,),
        )
        conn.commit()
        d = agent_detail(seeded, SID, None, NOW)[1]
        names = {s["hash"][:8]: s["name"] for s in d["otel"]["mcp_servers"]}
        assert names["4c96a3dc"] == "github-mcp-server"

    def test_the_flow_gains_no_subagent_and_no_second_reply_from_the_spans(self, seeded):
        _s, events = OtelReceiver().parse_traces(_body(_spans()))
        seeded.append_events(events)
        _code, flow = agent_flow(seeded, SID, now=NOW)
        kinds = [e["type"] for e in flow["turns"]]
        assert "subagent" not in kinds
        assert kinds.count("api_call") == 2
        assert all(e["type"] != "api_response" or not e.get("tokens") for e in flow["turns"])

    def test_events_backfilled_in_the_machine_store_are_found_for_a_session_in_a_project_store(self, tmp_path):
        from aictl.project_stores import ProjectStores

        project = tmp_path / "proj"
        (project / ".git").mkdir(parents=True)
        stores = ProjectStores(db_path=tmp_path / "history.db", flush_interval=0)
        try:
            from aictl.storage import RequestRow, SessionRow

            stores.upsert_session(
                SessionRow(session_id=SID, tool="copilot-cli", project_path=str(project), started_at=1794186176.56)
            )
            stores.append_request(
                RequestRow(
                    ts=1794186184.5,
                    session_id=SID,
                    tool="copilot-cli",
                    project_path=str(project),
                    model="gpt-6.1-sol",
                    input_tokens=3,
                    output_tokens=31,
                    cache_read_tokens=11662,
                    cache_creation_tokens=9702,
                    dedup_key=copilot_call_key(SID, (21367, 31, 11662, 9702), 0),
                    source="transcript",
                )
            )
            stores.flush()
            assert stores.store_of_session(SID) not in ("", None)
            _s, events = OtelReceiver().parse_traces(_body(_spans()))
            stores.machine.append_events(_old_shape(events))
            stores.machine.flush()
            otel_sessions_backfill.run(stores)
            d = agent_detail(stores, SID, None, NOW)[1]
            assert d["otel"]["spans"]["count"] == 4
            assert d["otel"]["calls"][0]["matched"] is True
        finally:
            stores.close()


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

    def test_the_machine_payload_reports_it(self, monkeypatch, tmp_path):
        monkeypatch.setattr(board_api, "_otel_setup", lambda port: {"copilot-cli": copilot_cli_otel_endpoint(port, {})})
        db = HistoryDB(db_path=str(tmp_path / "h.db"), flush_interval=0)
        try:
            payload = compute_machine(db, None, now=NOW, port=8597)
        finally:
            db.close()
        assert payload["pipeline"]["otel_setup"]["copilot-cli"]["status"] == "missing"

    def test_the_settings_catalog_says_copilot_cli_ignores_it(self):
        import yaml

        catalog = yaml.safe_load((Path(board_api.__file__).parents[1] / "data" / "settings-catalog.yaml").read_text())
        entries = [
            e
            for tool in catalog["tools"].values()
            for e in tool.get("keys", [])
            if e.get("key") == "env.COPILOT_OTEL_ENDPOINT"
        ]
        assert entries and all("Copilot CLI ignores it" in e["description"] for e in entries)
