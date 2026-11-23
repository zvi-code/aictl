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
        "sequence.stamp": [{"revision": 1}],
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
