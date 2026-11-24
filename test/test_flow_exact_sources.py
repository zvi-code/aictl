"""Session Flow built from view rows and telemetry events shaped like a Copilot CLI session's."""

from __future__ import annotations

from aictl.dashboard import flow_projection
from aictl.stores import Store
from aictl.stores.testing import FixtureReader

T = 1_795_400_000.0
SID = "cp-session"


def call(ts, aid="", model="gemini-4-argon", finish="tool_calls", is_error=0):
    return {"row_type": "call",
            "values": [ts, aid, model, 10, 20, 300, 0, 0.01, 900.0, 250.0, finish, is_error, "", None]}


BASE = [
    {"row_type": "session", "values": ["copilot-cli", "/p", T, None]},
    {"row_type": "known", "values": [True]},
    {"row_type": "prompt", "values": [T + 1, "", "Check the exporter"]},
]


def flow(rows, legacy=None, **kwargs):
    store = Store(reader=FixtureReader({
        "agents.resolve": lambda params: [{"session_id": SID, "priority": 0}],
        "sequence.flow": rows,
    }))
    status, body = flow_projection.agent_flow(store, SID, now=T + 10_000, legacy_flow=lambda *_: legacy or {}, **kwargs)
    assert status == 200
    return body


def test_every_event_names_a_model_by_its_canonical_id():
    legacy = {"summary": {"source": "otel"}, "turns": [
        {"ts": T + 50, "type": "api_call", "model": "claude-opus-5.5", "tokens": {}},
    ]}
    body = flow([*BASE, call(T + 2, model="claude-opus-5-5"), call(T + 3, model="claude-opus-5.5")], legacy)
    models = {e["model"] for e in body["turns"] if e.get("model")}
    assert models == {"claude-opus-5-5"}


def agent(aid, task="otel-check", model="claude-opus-5-5", started=None, ended=None, completed=0, call="", status=""):
    return {"row_type": "agent", "values": [aid, task, model, started, ended, completed, call, "Check the exporter", status]}


def lifecycle(ts, kind, aid, trigger, duration=None, call="", detail=""):
    return {"row_type": "lifecycle", "values": [ts, kind, aid, trigger, duration, call, detail]}


def test_a_subagent_end_comes_from_the_reported_end_with_its_totals():
    rows = [
        *BASE,
        # The agent row lost its end (written again from a call record): the reported end still shows.
        agent("agent-c", started=T + 25, call="call-c"),
        lifecycle(T + 20, "subagent_start", "agent-c", "started", call="call-c",
                  detail='{"name": "otel-check", "type": "task", "model": "claude-opus-5"}'),
        lifecycle(T + 38, "subagent_end", "agent-c", "completed", 18757.0, "call-c",
                  '{"model": "claude-opus-5.5", "total_tokens": 103729, "tool_calls": 2}'),
    ]
    body = flow(rows)
    start = next(e for e in body["turns"] if e["type"] == "subagent")
    end = next(e for e in body["turns"] if e["type"] == "subagent_end")
    assert (start["ts"], start["agent_type"], start["tool_call_id"]) == (T + 20, "task", "call-c")
    assert (end["ts"], end["outcome"], end["duration_ms"], end["reported_total_tokens"], end["reported_tool_calls"]) == (
        T + 38, "completed", 18757.0, 103729, 2)


def use(ts, name="task", call="", aid="", duration=10.0):
    return {"row_type": "use", "values": [ts, aid, name, "", "", "", duration, 0, None, "auto", None, None, None, call]}


def otel_spawn(ts, call=""):
    event = {"ts": ts, "type": "subagent", "to": "task", "detail": {"otel.span_id": "span-b", "otel.parent_span_id": "span-a"}}
    if call:
        event["tool_call_id"] = call
    return event


def spawn_rows():
    return [
        *BASE,
        use(T + 10, call="call-f"), use(T + 20, call="call-c"),
        agent("agent-f", started=T + 10.01, ended=T + 10.1, completed=1, call="call-f", status="failed"),
        lifecycle(T + 10.01, "subagent_start", "agent-f", "started", call="call-f"),
        lifecycle(T + 10.1, "subagent_end", "agent-f", "failed", 89.0, "call-f"),
        # Started 14 s before its first call, which the agent row's time says.
        agent("agent-c", started=T + 34, call="call-c"),
        lifecycle(T + 20.01, "subagent_start", "agent-c", "started", call="call-c"),
    ]


def test_a_telemetry_spawn_joins_the_store_spawn_on_its_tool_call_id_only():
    legacy = {"summary": {"source": "otel"}, "turns": [otel_spawn(T + 10.0, "call-f"), otel_spawn(T + 40.0, "call-c")]}
    body = flow(spawn_rows(), legacy)
    spawns = [e for e in body["turns"] if e["type"] == "subagent"]
    assert sorted((e["agent_id"], e["source"]) for e in spawns) == [("agent-c", "store+otel"), ("agent-f", "store+otel")]
    assert body["summary"]["subagents"] == 2


def test_a_telemetry_spawn_without_an_id_is_shown_but_not_counted_twice():
    # Within a second of the store's spawn, but no shared id: never joined by time.
    legacy = {"summary": {"source": "otel"}, "turns": [otel_spawn(T + 10.2)]}
    body = flow(spawn_rows(), legacy)
    spawns = [e for e in body["turns"] if e["type"] == "subagent"]
    assert len(spawns) == 3 and body["summary"]["subagents"] == 2
    lone = next(e for e in spawns if not e.get("agent_id"))
    assert lone["counted"] is False and lone["source"] == "otel"


def test_a_spawn_is_linked_to_the_call_that_reports_its_id():
    body = flow(spawn_rows())
    calls = {e["tool_call_id"]: e for e in body["turns"] if e["type"] == "tool_use"}
    assert (calls["call-f"]["spawned_agent_id"], calls["call-c"]["spawned_agent_id"]) == ("agent-f", "agent-c")
    # A spawn whose id names no call is linked to none, however close in time.
    rows = [r for r in spawn_rows() if not (r["row_type"] == "use" and r["values"][-1] == "call-c")]
    rows.append(use(T + 20.0, call="call-other"))
    body = flow(rows)
    other = next(e for e in body["turns"] if e.get("tool_call_id") == "call-other")
    assert "spawned_agent_id" not in other


def test_an_invoke_agent_span_takes_the_tool_call_id_of_its_execute_tool_parent():
    from aictl.dashboard.session_flow import build_turns_from_otel
    from aictl.records import EventRow

    spans = [
        EventRow(ts=T, tool="copilot-cli", kind="otel:execute_tool task",
                 detail={"otel.span_id": "span-a", "gen_ai.tool.call.id": "call-c", "gen_ai.tool.name": "task"}),
        EventRow(ts=T + 0.01, tool="copilot-cli", kind="otel:invoke_agent task",
                 detail={"otel.span_id": "span-b", "otel.parent_span_id": "span-a", "gen_ai.agent.name": "task"}),
        EventRow(ts=T + 1, tool="copilot-cli", kind="otel:invoke_agent task",
                 detail={"otel.span_id": "span-c", "otel.parent_span_id": "span-z", "gen_ai.agent.name": "task"}),
    ]
    spawns = [t for t in build_turns_from_otel([], spans, SID) if t["type"] == "subagent"]
    assert [s.get("tool_call_id") for s in spawns] == ["call-c", None]


def native(ts, role, text, key, status="", kind="message", aid=""):
    return {"row_type": "native", "values": [ts, kind, role, key, "0", status, text, aid]}


def transcript(rows, **kwargs):
    store = Store(reader=FixtureReader({
        "agents.resolve": lambda params: [{"session_id": SID, "priority": 0}],
        "sequence.flow": rows,
    }))
    status, body = flow_projection.agent_transcript(store, SID, now=T + 10_000, legacy_flow=lambda *_: {}, brief=False,
                                                    **kwargs)
    assert status == 200
    return body


def test_copilot_replies_and_the_task_summary_are_the_turns_reply_and_outcome():
    rows = [
        {"row_type": "session", "values": ["copilot-cli", "/p", T, None]},
        native(T + 1, "user", "Check the exporter", "u1"),
        call(T + 2),
        native(T + 2.5, "assistant", "The exporter sends to the local collector.", "a1"),
        {"row_type": "outcome", "values": [T + 3, "Checked the exporter settings.", ""]},
        native(T + 60, "user", "And the endpoint?", "u2"),
        call(T + 61),
    ]
    body = transcript(rows)
    assert body["replies_kept"] is True and body["reply_note"] is None
    first, second = body["turns"]
    assert first["response"] == "The exporter sends to the local collector."
    assert first["outcome"] == "Checked the exporter settings."
    assert (second["response"], second["outcome"]) == ("", "")


def step(ts, kind, name, phase, source, aid=""):
    return {"row_type": "step", "values": [ts, kind, name, phase, aid, "", 1000, 100000, None, None, 0, source]}


def test_a_turn_ends_with_its_own_last_event_not_at_the_next_resume():
    rows = [
        {"row_type": "session", "values": ["copilot-cli", "/p", T, None]},
        native(T + 1, "user", "Check the exporter", "u1"),
        call(T + 2), use(T + 41, name="task_complete", call="call-done"),
        # The session then sat idle for three hours: its shutdown, the context it reported, its resume.
        step(T + 10_900, "context", "snapshot", "shutdown", "session.shutdown"),
        lifecycle(T + 10_900, "session_shutdown", "", "routine"),
        lifecycle(T + 10_930, "config.session_resume", "", ""),
        native(T + 10_940, "user", "And the endpoint?", "u2"),
        call(T + 10_941),
    ]
    body = flow(rows)
    first = next(e for e in body["turns"] if e["type"] == "user_message")
    assert first["end_ts"] == T + 41 and first["wall_ms"] == 40_000
    kinds = [(e["type"], e.get("shutdown_type")) for e in body["turns"] if e["type"].startswith("session_")]
    assert ("session_shutdown", "routine") in kinds and ("session_resumed", None) in kinds
    assert (body["summary"]["shutdowns"], body["summary"]["resumes"]) == (1, 1)
    turn = transcript(rows)["turns"][0]
    assert turn["wall_ms"] == 40_000
