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
