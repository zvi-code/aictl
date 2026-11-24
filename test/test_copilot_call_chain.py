# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A Copilot CLI turn is put back together by keys alone: person's message -> turn -> model call ->
tool call, with the ids the steps carry.

Before, a Copilot tool call named no model call (request_key empty), no call or tool call named its
turn (prompt_id empty, no session_turns row), and requests kept none of the ids session_steps holds,
so the chain could be rebuilt only by time. The records are invented; the event types and field
names are the ones Copilot CLI writes.
"""

from __future__ import annotations

import time

import pytest
from core_store_fakes import current

from aictl.ingesters.call_facts import CopilotFacts, FactBuffer
from aictl.records import SessionRow
from aictl.session_facts import SessionFacts
from aictl.stores.testing import MemoryWriter
from aictl.tool_calls import ToolCalls

T = time.time() - 600
SID = "cp-chain"


def at(seconds: float) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(T + seconds)) + f".{int(seconds * 1000) % 1000:03d}Z"


def event(kind: str, seconds: float, data: dict) -> dict:
    return {"type": kind, "data": data, "timestamp": at(seconds), "id": f"{kind}-{seconds}"}


def turn_events(*, message_first: bool) -> list[dict]:
    usage = event("session.usage_record", 3, {"usage": {
        "model": "gpt-6", "inputTokens": 900, "outputTokens": 30, "cacheReadTokens": 0, "cacheWriteTokens": 0,
        "apiCallId": "api-1", "requestId": "req-1", "finishReason": "tool_calls"}})
    message = event("assistant.message", 4, {
        "content": "", "messageId": "msg-1", "apiCallId": "api-1", "turnId": "0",
        "toolRequests": [{"toolCallId": "call-1", "name": "view", "arguments": {"path": "README.md"}}]})
    return [
        event("session.start", 0, {"context": {"cwd": "/work/app"}}),
        event("user.message", 1, {"content": "Read the readme", "interactionId": "inter-1"}),
        event("assistant.turn_start", 2, {"turnId": "0"}),
        *([message, usage] if message_first else [usage, message]),
        event("tool.execution_start", 5, {"toolCallId": "call-1", "toolName": "view", "arguments": {"path": "README.md"}}),
        event("tool.execution_complete", 6, {"toolCallId": "call-1", "success": True, "result": {"content": "ok"}}),
        event("assistant.turn_end", 7, {"turnId": "0"}),
    ]


def read(events: list[dict]) -> MemoryWriter:
    writer = MemoryWriter()
    facts = SessionFacts(writer, keeps_text=lambda: True)
    facts.session(SessionRow(SID, "copilot-cli", project_path="/work/app", started_at=T))
    buf = FactBuffer(facts, tool_calls=ToolCalls(writer, keeps_text=lambda: True))
    cop = CopilotFacts(SID, buf)
    for obj in events:
        cop.feed(obj)
    buf.flush()
    return writer


@pytest.mark.parametrize("message_first", [False, True], ids=["usage-then-message", "message-then-usage"])
def test_a_turn_rebuilds_from_keys(message_first):
    writer = read(turn_events(message_first=message_first))
    turn, = current(writer, "session_turns")
    assert (turn["prompt_id"], turn["tool"], turn["request_count"], turn["tool_call_count"]) == (
        "inter-1", "copilot-cli", 1, 1)
    prompt, = current(writer, "session_prompts")
    assert prompt["prompt_id"] == "inter-1"
    request, = current(writer, "requests")
    assert (request["prompt_id"], request["api_call_id"], request["request_id"]) == ("inter-1", "api-1", "req-1")
    if not message_first:
        # The reply's message id reaches the call only when the message comes after its usage record.
        assert request["response_id"] == "msg-1"
    call, = current(writer, "tool_invocations")
    assert (call["request_key"], call["prompt_id"]) == (request["dedup_key"], "inter-1")
    steps = current(writer, "session_steps")
    assert steps and {s["prompt_id"] for s in steps} == {"inter-1"}
    rounds = {s["round_id"] for s in steps if s["round_id"]}
    assert rounds == {request["api_call_id"]}
    assert {s["request_id"] for s in steps if s["kind"] == "round"} == {request["request_id"]}
    links = current(writer, "turn_request_links")
    assert [(link["request_key"], link["prompt_id"]) for link in links] == [(request["dedup_key"], "inter-1")]


def test_a_vscode_chat_request_is_a_turn_that_its_prompt_call_and_tool_calls_name():
    from aictl.ingesters.call_facts import VSCodeChatFacts

    writer = MemoryWriter()
    facts = SessionFacts(writer, keeps_text=lambda: True)
    buf = FactBuffer(facts, tool_calls=ToolCalls(writer, keeps_text=lambda: True))
    chat = VSCodeChatFacts("vs-chat", buf, "/work/app", has_debug_log=False)
    request = {"requestId": "request_1", "timestamp": int(T * 1000), "modelId": "copilot/gpt-6",
               "message": {"text": "Fix the test"},
               "response": [{"kind": "toolInvocationSerialized", "toolCallId": "tc-1", "toolId": "read_file",
                             "invocationMessage": "Reading a file"}],
               "result": {"metadata": {"promptTokens": 500, "outputTokens": 20}}}
    chat.feed({"kind": 0, "v": {"requests": [request]}})
    buf.flush()
    facts.session(SessionRow("vs-chat", "copilot-vscode", project_path="/work/app", started_at=T))
    turn, = current(writer, "session_turns")
    assert (turn["prompt_id"], turn["request_count"], turn["tool_call_count"]) == ("request_1", 1, 1)
    call, = current(writer, "requests")
    tool, = current(writer, "tool_invocations")
    prompt, = current(writer, "session_prompts")
    assert call["prompt_id"] == tool["prompt_id"] == prompt["prompt_id"] == "request_1"
    assert tool["request_key"] == call["dedup_key"]


def test_a_second_message_opens_a_second_turn():
    events = turn_events(message_first=False)
    events += [event("user.message", 10, {"content": "Thanks", "interactionId": "inter-2"})]
    writer = read(events)
    assert sorted((t["prompt_id"], t["turn_index"]) for t in current(writer, "session_turns")) == [
        ("inter-1", 1), ("inter-2", 2)]
