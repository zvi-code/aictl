"""Session Flow steps, subagent scope and per-call numbers, built from synthetic view rows."""

from __future__ import annotations

from aictl.dashboard import flow_projection
from aictl.stores import Store
from aictl.stores.testing import FixtureReader

T = 1_795_000_000.0
SID = "main-s"
SUB = "sub-a"


def call(ts, aid="", model="claude-opus-5-5", i=10, o=20, cr=300, cw=5, cost=0.01, duration=1500.0, extra=()):
    return {
        "row_type": "call",
        "values": [ts, aid, model, i, o, cr, cw, cost, duration, 250.0, "tool_use", 0, "", None, *extra],
    }


def use(ts, name="Bash", aid="", target="ls", extra=(), is_error=0, exit_code=None, duration=40.0):
    return {"row_type": "use", "values": [ts, aid, name, target, "", "", duration, is_error, exit_code, "auto", *extra]}


ROWS = [
    {"row_type": "session", "values": ["claude-code", "/p", T, T + 900]},
    {"row_type": "known", "values": [True]},
    {"row_type": "prompt", "values": [T + 1, "", "Review the parser"]},
    {"row_type": "prompt", "values": [T + 20, SUB, "Explore the code"]},
    call(T + 2, extra=(4096, 120, None)),
    use(T + 2, "Read", target="a.py", extra=(30, 8000, None)),
    use(T + 2.1, "Grep", target="parse", extra=(40, 1200, 0.0)),
    {"row_type": "agent", "values": [SUB, "Explore", "claude-sonnet-5-5", T + 20, T + 60, 1]},
    call(T + 21, aid=SUB, model="claude-sonnet-5-5"),
    use(T + 21, "Bash", aid=SUB, target="grep -rn x", is_error=1, exit_code=2),
    call(T + 30, aid=SUB, model="claude-sonnet-5-5", extra=(None,)),
    call(T + 200),  # a round with no tool call: the old fourteen columns only
]


def store(rows=ROWS):
    return Store(
        reader=FixtureReader(
            {
                "agents.resolve": lambda params: [{"session_id": SID, "priority": 0}],
                "sequence.flow": rows,
            }
        )
    )


def flow(agent_id, rows=ROWS, **kwargs):
    status, body = flow_projection.agent_flow(store(rows), agent_id, now=T + 1000, legacy_flow=lambda *_: {}, **kwargs)
    assert status == 200
    return body


def test_a_round_and_its_tool_calls_share_one_step():
    body = flow(SID)
    steps = [(e["type"], e.get("model") if e["type"] == "api_call" else e.get("to"), e["step"]) for e in body["turns"]]
    main = [s for s in steps if s[0] in ("api_call", "tool_use") and s[1] in ("claude-opus-5-5", "Read", "Grep")]
    assert main[:3] == [("api_call", "claude-opus-5-5", 3), ("tool_use", "Read", 3), ("tool_use", "Grep", 3)]
    # The subagent's round is its own step even though it overlaps the main agent's events.
    sub = [e for e in body["turns"] if e.get("agent_id") == SUB and e["type"] in ("api_call", "tool_use")]
    assert sub[0]["step"] == sub[1]["step"] != main[0][2]
    assert [e["request_n"] for e in body["turns"] if e["type"] == "api_call"] == [1, 2, 3, 4]
    assert body["summary"]["total_steps"] == max(e["step"] for e in body["turns"])
    assert body["flow_scope"] == {"kind": "session", "agent_id": SID, "session_id": SID, "subagent": False}


def test_tool_payloads_and_the_result_estimate_are_reported():
    body = flow(SID)
    read = next(e for e in body["turns"] if e.get("to") == "Read")
    assert (read["input_bytes"], read["output_bytes"], read["result_tokens_est"]) == (30, 8000, 2000)
    first = next(e for e in body["turns"] if e["type"] == "api_call")
    assert first["request_bytes"] == 4096 and first["thinking_chars"] == 120 and "reasoning_tokens" not in first
    old = [e for e in body["turns"] if e["type"] == "api_call"][-1]
    assert "request_bytes" not in old and old["tokens"]["cache_read"] == 300
    assert body["summary"]["total_cost_usd"] == 0.04 and body["summary"]["priced_calls"] == 4
    assert body["summary"]["total_cache_creation_tokens"] == 20


def test_a_subagent_flow_lists_only_its_own_steps_and_counts_them():
    body = flow(SUB)
    assert body["flow_scope"] == {"kind": "agent", "agent_id": SUB, "session_id": SID, "subagent": True}
    assert {e.get("agent_id") for e in body["turns"]} == {SUB}
    assert [e["type"] for e in body["turns"]] == ["subagent", "task_prompt", "api_call", "tool_use", "api_call", "subagent_end"]
    summary = body["summary"]
    assert (summary["total_api_calls"], summary["total_tool_uses"], summary["errors"], summary["total_turns"]) == (
        2,
        1,
        1,
        1,
    )
    assert body["scope"]["models"] == ["claude-sonnet-5-5"]
    assert [e["request_n"] for e in body["turns"] if e["type"] == "api_call"] == [1, 2]
    # The whole session stays one parameter away.
    whole = flow(SUB, whole=True)
    assert whole["flow_scope"]["kind"] == "session" and whole["summary"]["total_api_calls"] == 4


def test_step_numbers_hold_across_windows_and_filters():
    body = flow(SID)
    numbers = {(e["type"], e["ts"]): e["step"] for e in body["turns"]}
    older = flow(SID, offset=0, limit=4)["turns"]
    newer = flow(SID, offset=4, limit=50)["turns"]
    assert {(e["type"], e["ts"]): e["step"] for e in older + newer} == numbers
    tools = flow(SID, category="tools")["turns"]
    assert all(numbers[(e["type"], e["ts"])] == e["step"] for e in tools)


def test_a_prompt_closes_the_open_round():
    events = [
        {"type": "api_call", "ts": 1},
        {"type": "user_message", "ts": 2},
        {"type": "tool_use", "ts": 3},
        {"type": "api_call", "ts": 4},
        {"type": "api_response", "ts": 5},
        {"type": "tool_use", "ts": 6},
    ]
    assert flow_projection._number_steps(events) == 4
    assert [e["step"] for e in events] == [1, 2, 3, 4, 4, 4]


def test_a_subagent_id_without_events_falls_back_to_the_session():
    assert flow_projection._agent_scope([{"type": "api_call", "agent_id": ""}], "other", SID) is None
    assert flow_projection._agent_scope([{"type": "api_call"}], SID, SID) is None


def test_a_count_or_duration_the_source_did_not_report_stays_unknown():
    rows = [
        *ROWS[:3],
        {"row_type": "call", "values": [T + 2, "", "m", None, 5, None, None, None, None, None, "", 0, "", None]},
        use(T + 2, duration=None),
    ]
    body = flow(SID, rows=rows)
    call_event = next(e for e in body["turns"] if e["type"] == "api_call")
    assert call_event["tokens"] == {"input": None, "output": 5, "cache_read": None, "cache_creation": None}
    assert call_event["duration_ms"] is None and "cost_usd" not in call_event
    assert next(e for e in body["turns"] if e["type"] == "tool_use")["duration_ms"] is None
    assert body["summary"]["total_output_tokens"] == 5 and body["summary"]["total_cost_usd"] is None


def step_row(ts, kind, name, phase, aid, source=""):
    return {"row_type": "step", "values": [ts, kind, name, phase, aid, "", None, None, None, None, None, source]}


def native_row(ts, kind, role, key, text, aid="", status="captured"):
    return {"row_type": "native", "values": [ts, kind, role, key, "turn", status, text, aid]}


# A turn that starts two subagents with a task tool: the first fails at once, the second runs.
FAILED, RAN = "sub-failed", "sub-ran"
TURN = [
    {"row_type": "session", "values": ["copilot-cli", "/p", T, T + 900]},
    native_row(T + 1, "message", "user", "p1", "Launch a subagent\nand have it check OTel"),
    call(T + 2),
    # The task call's id is the one each subagent reports (toolCallId): the only link between them.
    use(T + 2.1, "task", target="Check OTel", is_error=1, extra=(None, None, None, "call-failed")),
    {"row_type": "agent", "values": [FAILED, "task", "claude-opus-5", T + 2.15, T + 2.2, 1, "call-failed"]},
    step_row(T + 2.16, "session_command", "model_change", "applied", FAILED, "session.model_change"),
    step_row(T + 2.19, "agent", "task", "failed", FAILED, "subagent.failed"),
    call(T + 3),
    use(T + 3.1, "task", target="Check OTel", extra=(None, None, None, "call-ran")),
    {"row_type": "agent", "values": [RAN, "task", "claude-opus-5.5", T + 3.2, T + 22, 1, "call-ran"]},
    step_row(T + 3.25, "session_command", "model_change", "applied", RAN, "session.model_change"),
    native_row(T + 3.3, "agent_prompt", "user", "a1", "Check if OpenTelemetry is enabled", aid=RAN),
    call(T + 10, aid=RAN, model="claude-opus-5.5"),
    use(T + 10, "bash", aid=RAN, target="env"),
    step_row(T + 21.9, "agent", "task", "completed", RAN, "subagent.completed"),
]


def test_a_failed_subagent_says_it_failed_and_the_task_call_names_it():
    body = flow(SID, rows=TURN)
    ends = {e["agent_id"]: e for e in body["turns"] if e["type"] == "subagent_end"}
    assert (ends[FAILED]["outcome"], ends[FAILED]["completed"], ends[FAILED]["is_error"]) == ("failed", False, True)
    assert (ends[RAN]["outcome"], ends[RAN]["completed"]) == ("completed", True)
    tasks = [e for e in body["turns"] if e["type"] == "tool_use" and e["to"] == "task"]
    assert [t.get("spawned_agent_id") for t in tasks] == [FAILED, RAN]
    assert not any(e["type"] == "agent" for e in body["turns"])


def test_a_subagent_task_prompt_is_the_first_step_of_its_span_and_its_model_change_joins_the_start():
    body = flow(SID, rows=TURN)
    ran = [e for e in body["turns"] if e.get("agent_id") == RAN]
    assert [e["type"] for e in ran] == ["subagent", "session_command", "task_prompt", "api_call", "tool_use", "subagent_end"]
    start, change, task = ran[:3]
    assert change["step"] == start["step"] and task["step"] == start["step"] + 1
    assert (task["message"], task["prompt_length"], task["step_key"]) == ("Check if OpenTelemetry is enabled", 33, "a1")
    # A task prompt is not a person's prompt: the session still counts one.
    assert body["summary"]["total_turns"] == 1
    assert [e["type"] for e in flow(RAN, rows=TURN)["turns"]][:3] == ["subagent", "session_command", "task_prompt"]


def test_a_subagent_named_with_its_session_gets_its_own_events():
    events = [{"type": "api_call", "agent_id": "a1"}, {"type": "api_call", "agent_id": "a2"}, {"type": "api_call", "agent_id": ""}]
    assert flow_projection._agent_scope(events, f"{SID}/a1", SID) == [events[0]]
    assert flow_projection._agent_scope(events, "a1", SID) == [events[0]]


def test_the_models_of_a_flow_list_one_id_for_both_spellings_and_a_search_finds_either():
    from aictl.dashboard.flow_filters import select_events

    events = [
        {"type": "api_call", "ts": 1.0, "model": "claude-opus-5.5", "agent_id": "a"},
        {"type": "api_call", "ts": 2.0, "model": "claude-opus-5-5", "agent_id": "a"},
        {"type": "api_call", "ts": 3.0, "model": "gpt-5.5", "agent_id": "a"},
    ]
    _, scope = select_events(events)
    assert scope["models"] == ["claude-opus-5-5", "gpt-5.5"]
    for term in ("claude-opus-5-5", "claude-opus-5.5", "CLAUDE-OPUS-5.5"):
        assert [e["ts"] for e in select_events(events, q=term)[0]] == [1.0, 2.0]
    assert [e["ts"] for e in select_events(events, q="gpt-5.5")[0]] == [3.0]
