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
