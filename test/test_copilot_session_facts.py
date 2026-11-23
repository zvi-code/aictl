"""What a Copilot CLI events.jsonl stores, checked against records shaped like a real session's.

The texts are invented; the event types and field names are the ones Copilot CLI writes.
"""

from __future__ import annotations

import json
import time

from core_store_fakes import current

from aictl.ingesters.call_facts import CopilotFacts, FactBuffer, stored_input
from aictl.session_facts import SessionFacts
from aictl.stores.testing import MemoryWriter
from aictl.tool_calls import ToolCalls

T = time.time() - 600


def at(seconds: float) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(T + seconds)) + f".{int(seconds * 1000) % 1000:03d}Z"


def event(kind: str, seconds: float, data: dict, **envelope) -> dict:
    return {"type": kind, "data": data, "timestamp": at(seconds), "id": f"{kind}-{seconds}", **envelope}


def usage(seconds: float, api: str, model: str, finish: str, agent: str = "") -> dict:
    record = {"model": model, "inputTokens": 1200, "outputTokens": 40, "cacheReadTokens": 1000, "cacheWriteTokens": 0,
              "duration": 900, "apiCallId": api, "finishReason": finish}
    return event("session.usage_record", seconds, {"usage": record}, **({"agentId": agent} if agent else {}))


def read(events: list[dict], *, keep_text: bool = True) -> MemoryWriter:
    writer = MemoryWriter()
    buf = FactBuffer(SessionFacts(writer, keeps_text=lambda: keep_text),
                     tool_calls=ToolCalls(writer, keeps_text=lambda: keep_text))
    cop = CopilotFacts("cp-session", buf)
    for obj in events:
        cop.feed(obj)
    buf.flush()
    return writer


def test_a_call_that_finished_with_an_error_is_stored_as_failed():
    writer = read([
        event("user.message", 1, {"content": "Summarize the plan", "interactionId": "i1"}),
        usage(2, "api-1", "gemini-4-argon", "error"),
        usage(3, "api-2", "gemini-4-argon", "stop"),
    ])
    rows = sorted(current(writer, "requests"), key=lambda r: r["ts"])
    assert [(r["finish_reason"], r["is_error"]) for r in rows] == [("error", 1), ("stop", 0)]
    assert rows[0]["error_type"] == "error"


def test_a_model_is_stored_under_its_canonical_id():
    writer = read([
        usage(2, "api-1", "claude-opus-5.5", "stop"),
        event("subagent.started", 3, {"toolCallId": "call-a", "agentName": "task", "agentType": "task",
                                      "model": "claude-opus-5.5"}, agentId="agent-a"),
    ])
    assert [r["model"] for r in current(writer, "requests")] == ["claude-opus-5-5"]
    assert [r["model"] for r in current(writer, "agents")] == ["claude-opus-5-5"]


def test_tool_arguments_keep_lists_and_objects_masked():
    args = {"ids": ["cli-overview", "cli-hooks"], "filter": {"kind": "doc", "token": "token=abcd1234efgh"},
            "query": "hooks"}
    kept = stored_input(args, keep_text=True)
    assert kept["ids"] == ["cli-overview", "cli-hooks"]
    assert kept["query"] == "hooks"
    assert "abcd1234efgh" not in json.dumps(kept) and kept["filter"]["kind"] == "doc"
    assert stored_input(args, keep_text=False) == {}
    writer = read([
        event("tool.execution_start", 1, {"toolCallId": "call-d", "toolName": "fetch_copilot_cli_documentation",
                                          "arguments": {"ids": ["cli-overview"]}}),
        event("tool.execution_complete", 2, {"toolCallId": "call-d", "success": True, "result": {"content": "ok"}}),
    ])
    text = current(writer, "tool_invocations_text")
    assert [json.loads(r["input"]) for r in text] == [{"ids": ["cli-overview"]}]


def spawn_events(call: str, agent: str, seconds: float, *, failed: bool = False) -> list[dict]:
    """A task call that starts a subagent, as Copilot CLI writes it (invented texts)."""
    args = {"name": "otel-check", "description": "Check the exporter", "agent_type": "task", "mode": "sync",
            "prompt": "Look at the exporter settings"}
    out = [
        event("tool.execution_start", seconds, {"toolCallId": call, "toolName": "task", "arguments": args}),
        event("subagent.started", seconds + 0.01, {"toolCallId": call, "agentName": "task", "agentType": "task",
                                                   "agentDisplayName": "otel-check",
                                                   "agentDescription": "Check the exporter", "model": "claude-opus-5"},
              agentId=agent),
    ]
    if failed:
        return out + [event("subagent.failed", seconds + 0.1, {
            "toolCallId": call, "agentName": "task", "agentDisplayName": "otel-check", "model": "claude-opus-5",
            "error": "Model not available for this plan", "durationMs": 89, "totalToolCalls": 0}, agentId=agent)]
    return out + [
        usage(seconds + 5, f"{agent}-api", "claude-opus-5.5", "stop", agent=agent),
        event("subagent.completed", seconds + 18, {
            "toolCallId": call, "agentName": "task", "agentDisplayName": "otel-check", "model": "claude-opus-5.5",
            "durationMs": 18757, "totalTokens": 103729, "totalToolCalls": 2}, agentId=agent),
    ]


def test_a_subagent_keeps_its_name_end_and_reported_totals():
    writer = read([*spawn_events("call-f", "agent-f", 10, failed=True), *spawn_events("call-c", "agent-c", 20)])
    agents = {r["agent_id"]: r for r in current(writer, "agents")}
    assert {aid: (r["status"], r["completed"], bool(r["ended_at"]), r["description"]) for aid, r in agents.items()} == {
        "agent-f": ("failed", 1, True, "Check the exporter"), "agent-c": ("completed", 1, True, "Check the exporter")}
    assert {r["agent_id"]: r["task"] for r in current(writer, "agents_text")} == {"agent-f": "otel-check",
                                                                                  "agent-c": "otel-check"}
    events = {(r["agent_id"], r["kind"]): r for r in current(writer, "context_events") if r["kind"].startswith("subagent_")}
    end = events["agent-c", "subagent_end"]
    assert (end["trigger"], end["duration_ms"], end["tool_call_id"]) == ("completed", 18757.0, "call-c")
    assert json.loads(end["detail"]) == {"model": "claude-opus-5.5", "total_tokens": 103729, "tool_calls": 2}
    failed = events["agent-f", "subagent_end"]
    assert failed["trigger"] == "failed" and json.loads(failed["detail"])["error"] == "Model not available for this plan"
    start = json.loads(events["agent-c", "subagent_start"]["detail"])
    assert start == {"name": "otel-check", "type": "task", "description": "Check the exporter", "model": "claude-opus-5",
                     "mode": "sync"}


def test_reading_the_file_again_stores_no_second_lifecycle_row():
    events = [*spawn_events("call-c", "agent-c", 20)]
    writer = MemoryWriter()
    buf = FactBuffer(SessionFacts(writer, keeps_text=lambda: True))
    cop = CopilotFacts("cp-session", buf)
    for _ in range(2):
        cop.reset()
        for obj in events:
            cop.feed(obj)
        buf.flush()
    kinds = [r["kind"] for r in current(writer, "context_events")]
    assert sorted(k for k in kinds if k.startswith("subagent_")) == ["subagent_end", "subagent_start"]


def test_an_agent_row_written_after_a_restart_keeps_the_stored_end(tmp_path):
    from aictl.records import AgentRow
    from aictl.state_file import StateFile

    writer = MemoryWriter()
    first = SessionFacts(writer, state=StateFile(tmp_path / "sessions.json"))
    first.agents([AgentRow(agent_id="agent-c", session_id="cp-session", tool="copilot-cli", model="claude-opus-5-5",
                           started_at=T, ended_at=T + 18, completed=1, status="completed",
                           description="Check the exporter", parent_tool_use_id="call-c", observed_at=T + 18)])
    first.save()
    # After a restart another reader of the session gives the agent again: its first call's time, no end.
    second = SessionFacts(writer, state=StateFile(tmp_path / "sessions.json"))
    second.agents([AgentRow(agent_id="agent-c", session_id="cp-session", tool="copilot-cli", model="claude-opus-5.5",
                            is_sidechain=1, started_at=T + 5)])
    row, = current(writer, "agents")
    assert (row["started_at"], row["ended_at"], row["completed"], row["status"], row["description"]) == (
        T, T + 18, 1, "completed", "Check the exporter")


def test_a_reply_and_a_task_summary_are_kept_only_while_text_is_kept():
    events = [
        event("user.message", 1, {"content": "Check the exporter", "interactionId": "i1"}),
        event("assistant.message", 2, {"content": "The exporter sends to the local collector.", "messageId": "m1"}),
        event("session.task_complete", 3, {"success": True, "summary": "Checked the exporter settings."}),
    ]
    kept = read(events)
    reply = [r for r in current(kept, "session_steps") if r["role"] == "assistant" and r["kind"] == "message"]
    texts = {r["step_key"]: r["text"] for r in current(kept, "session_step_text")}
    assert [texts[r["step_key"]] for r in reply] == ["The exporter sends to the local collector."]
    assert [r["text"] for r in current(kept, "session_digests") if r["kind"] == "task_summary"] == [
        "Checked the exporter settings."]
    withheld = read(events, keep_text=False)
    assert current(withheld, "session_step_text") == [] and current(withheld, "session_digests") == []
    assert {r["text_status"] for r in current(withheld, "session_steps") if r["role"] == "assistant"} == {"withheld"}
