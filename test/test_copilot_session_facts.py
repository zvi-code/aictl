"""What a Copilot CLI events.jsonl stores, checked against records shaped like a real session's.

The texts are invented; the event types and field names are the ones Copilot CLI writes.
"""

from __future__ import annotations

import time

from core_store_fakes import current
from aictl.ingesters.call_facts import CopilotFacts, FactBuffer
from aictl.session_facts import SessionFacts
from aictl.stores.testing import MemoryWriter

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
    buf = FactBuffer(SessionFacts(writer, keeps_text=lambda: keep_text))
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
