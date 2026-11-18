"""Copilot events.jsonl -> searchable steps. All transcripts here are synthetic."""

import json
import sqlite3
import time
from types import SimpleNamespace

import pytest

from aictl.ingesters.call_facts import CopilotFacts, FactBuffer
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.storage import STEP_TEXT_LIMIT, HistoryDB, SessionStepRow


def event(kind, data, **envelope):
    return {"type": kind, "data": data, **envelope}


def reader(db, root):
    return TranscriptUsageIngester(
        db, copilot_state=root / "session-state", codex_sessions=root / "codex",
        claude_projects=root / "claude", vscode_workspaces=root / "vscode",
    )


def test_flow_across_polls_and_restart(tmp_path):
    path = tmp_path / "session-state" / "session" / "events.jsonl"
    path.parent.mkdir(parents=True)
    ts = time.time() - 3  # same time for all records: the reader must not join by time
    command = {"command": "pytest\n# token=privatevalue"}
    prompt = "first line\n" + "x" * 8200 + "\nlast line"
    first = [
        event("session.start", {"context": {"cwd": str(tmp_path)}}),
        event("user.message", {"messageId": "u1", "turnId": "t1", "content": prompt}),
        event("assistant.turn_start", {"turnId": "t1"}),
        event("assistant.message", {"messageId": "m1", "turnId": "t1", "apiCallId": "api1", "requestId": "r1",
                                    "content": "running tests", "toolRequests": [
                                        {"name": "bash", "toolCallId": "c1", "arguments": command},
                                        {"name": "view", "toolCallId": "never-started"},
                                    ]}),
        event("session.usage_record", {"usage": {"apiCallId": "api1", "requestId": "r1", "model": "gpt-5",
                                                 "inputTokens": 21, "cacheReadTokens": 10, "outputTokens": 3,
                                                 "maxPromptTokens": 512}}),
        event("tool.execution_start", {"toolName": "bash", "toolCallId": "c1", "arguments": command}),
    ]
    second = [
        event("tool.execution_complete", {"toolCallId": "c1", "success": True, "shellExecution": {"exitCode": 2},
                                          "result": {"content": "failed\none test"}, "toolTelemetry": {
                                              "metrics": {"context_current_tokens": 0, "context_token_limit": 1024}}}),
        event("tool.execution_start", {"toolName": "task", "toolCallId": "child-call", "arguments": {"prompt": "fix it"}}),
        event("subagent.started", {"agentName": "helper", "toolCallId": "child-call"}, agentId="child"),
        event("tool.execution_start", {"parentToolCallId": "child-call", "toolName": "task", "toolCallId": "nested"}),
        event("subagent.started", {"toolCallId": "nested"}, agentId="grandchild", parentId="previous-event"),
        event("session.usage_info", {"currentTokens": 23, "systemTokens": 8, "conversationTokens": 11,
                                     "toolDefinitionsTokens": 4, "tokenLimit": 1024}, agentId="child"),
        event("session.compaction_complete", {"success": True, "preCompactionTokens": 23, "postCompactionTokens": 8}, agentId="child"),
        event("subagent.completed", {"toolCallId": "child-call"}, agentId="child"),
        event("assistant.turn_end", {"turnId": "t1"}),
        # Identical ID-less records are distinct source records but replay does not duplicate them.
        event("user.message", {"content": "again"}), event("user.message", {"content": "again"}),
    ]
    db = HistoryDB(tmp_path / "db", flush_interval=0)
    try:
        ingester = reader(db, tmp_path)
        for batch in (first, second):
            with path.open("a", encoding="utf-8") as f:
                for obj in batch:
                    f.write(json.dumps({**obj, "timestamp": ts}) + "\n")
            ingester.poll()

        def timeline():
            conn = db._conn()
            cur = conn.execute("SELECT s.*, t.text FROM session_steps s LEFT JOIN session_step_text t USING(step_key) ORDER BY source_order")
            return [dict(zip([c[0] for c in cur.description], row, strict=True)) for row in cur]

        rows = timeline()
        reader(db, tmp_path).poll()
        assert timeline() == rows
        assert len({r["step_key"] for r in rows}) == len(rows)
        assert [r["text"] for r in rows if r["role"] == "user"] == [prompt, "again", "again"]
        assert {r["project_path"] for r in rows} == {str(tmp_path)}
        assert [(r["kind"], r["phase"]) for r in rows if r["tool_call_id"] == "c1"] == [
            ("tool_call", "requested"), ("tool_call", "started"), ("command", "started"),
            ("tool_result", "failed"), ("context", "snapshot"),
        ]
        assert [r["phase"] for r in rows if r["tool_call_id"] == "never-started"] == ["requested"]
        cmd, result = [r for r in rows if r["kind"] in ("command", "tool_result")]
        assert (cmd["turn_id"], cmd["round_id"], cmd["message_id"], cmd["request_id"]) == ("t1", "api1", "m1", "r1")
        assert cmd["name"] == "bash" and "privatevalue" not in cmd["text"] and "\n" in cmd["text"]
        assert result["text"] == "failed\none test" and result["exit_code"] == 2
        rnd, = (r for r in rows if r["kind"] == "round")
        assert (rnd["round_id"], rnd["input_tokens"], rnd["output_tokens"], rnd["context_tokens"]) == ("api1", 21, 3, None)
        assert rnd["context_limit"] is None  # maxPromptTokens limits input, not the whole context window
        assert [(r["agent_id"], r["parent_agent_id"]) for r in rows if r["kind"] == "agent"] == [
            ("child", ""), ("grandchild", "child"), ("child", ""),
        ]
        task, = (r for r in rows if r["kind"] == "agent_prompt")
        assert (task["text"], task["agent_id"], task["tool_call_id"]) == ("fix it", "", "child-call")
        tool_ctx, child_ctx, compact = [r for r in rows if r["kind"] == "context"]
        assert (tool_ctx["context_tokens"], tool_ctx["context_limit"]) == (0, 1024)
        assert (child_ctx["agent_id"], child_ctx["turn_id"], child_ctx["context_tokens"], child_ctx["estimated"]) == ("child", "", 23, 0)
        assert child_ctx["context_limit"] == 1024
        assert (child_ctx["system_tokens"], child_ctx["conversation_tokens"], child_ctx["tool_tokens"]) == (8, 11, 4)
        assert (compact["before_tokens"], compact["after_tokens"], compact["context_limit"]) == (23, 8, None)
    finally:
        db.close()


@pytest.mark.parametrize("capture", ["full", "metadata", "off"])
def test_privacy_at_buffer_boundary_and_skill_phases(capture):
    store = SimpleNamespace(_keeps_text=lambda: capture == "full")
    buf = FactBuffer(store)
    cop = CopilotFacts("s", buf)
    for obj in [
        event("user.message", {"content": "public\nBearer abcdefghijklmnop", "transformedContent": "DO-NOT-INDEX"}),
        event("user.message", {"source": "skill-hidden", "content": "DO-NOT-INDEX"}),
        event("user.message", {"source": "agent-1", "content": "child task"}, agentId="child"),
        event("assistant.reasoning", {"content": "DO-NOT-INDEX"}),
        event("system.message", {"content": "DO-NOT-INDEX"}),
        event("assistant.message", {"phase": "thinking", "content": "DO-NOT-INDEX"}),
        event("assistant.message", {"content": "x" * (STEP_TEXT_LIMIT + 10), "reasoningText": "DO-NOT-INDEX"}),
        event("session.skills_loaded", {"skills": [{"name": "review", "description": "DO-NOT-INDEX"}]}),
        event("skill.invoked", {"name": "review", "trigger": "context-load", "content": "DO-NOT-INDEX"}),
        event("skill.invoked", {"name": "review", "trigger": "user-invoked"}),
        event("tool.execution_start", {"toolCallId": "c", "toolName": "bash", "arguments": {"command": "check --token abcdefghijklmnop"}}),
        event("tool.execution_start", {"toolCallId": "broken", "toolName": "echo DO-NOT-INDEX"}),
        event("tool.execution_start", {"toolCallId": "p", "toolName": "apply_patch",
                                       "arguments": "*** Begin Patch\n*** Update File: x\n+PATCH-BODY\n*** End Patch"}),
        event("tool.execution_complete", {"toolCallId": "c", "result": {"content": "token=secretvalue\noutput"}}),
    ]:
        cop.feed(obj)
    rows = list(buf.steps.values())
    assert "DO-NOT-INDEX" not in repr(rows) and "abcdefghijklmnop" not in repr(rows) and "secretvalue" not in repr(rows)
    assert [r.phase for r in rows if r.kind == "skill"] == ["resolved", "loaded", "invoked"]
    assert [r.text_status for r in rows if r.role == "assistant"] == ["omitted", "truncated" if capture == "full" else "withheld"]
    if capture == "full":
        assert rows[0].text == "public\nBearer <redacted>"
        assert max(len(r.text) for r in rows) == STEP_TEXT_LIMIT
    else:
        assert not any(r.text for r in rows)
        assert all(r.text_status == "withheld" for r in rows if r.kind in ("command", "agent_prompt", "tool_result"))
        assert "PATCH-BODY" not in repr(cop._patches) and "PATCH-BODY" not in repr(cop._running)


def test_native_ids_survive_replay_at_different_positions():
    buf = FactBuffer(SimpleNamespace(_keeps_text=lambda: False))
    cop = CopilotFacts("s", buf)
    obj = event("session.truncation", {"preTruncationTokensInMessages": 62, "postTruncationTokensInMessages": 31}, id="stable-id")
    cop.feed(obj)
    original, = buf.steps.values()
    cop.reset()
    cop.feed(event("assistant.turn_start", {"turnId": "t1"}))
    cop.feed(obj)
    assert len(buf.steps) == 2 and buf.steps[original.step_key] is original
    assert (original.before_tokens, original.after_tokens, original.context_tokens) == (62, 31, None)


def test_step_only_batch_retry_surface_and_legacy_exclusion(monkeypatch):
    batches = []
    def write(facts):
        batches.append(facts)
        if len(batches) == 1:
            raise sqlite3.OperationalError("busy")
        return len(facts)

    monkeypatch.setattr("aictl.ingesters.call_facts.BUFFER_FLUSH_ROWS", 2)
    store = SimpleNamespace(write_call_facts=write, _keeps_text=lambda: False)
    buf = FactBuffer(store, cutoff=5)
    buf.surface = lambda sid: "copilot-desktop"
    def step(key, ts):
        return SessionStepRow(key, ts, "s", "message", tool="copilot-cli", text="private")

    buf.add_step(step("old", 4))
    buf.add_step(step("1", 5))
    buf.add_step(step("2", 6))
    assert len(batches) == 1 and len(buf) == 2
    buf.flush()
    buf.flush()
    assert len(buf) == 0 and buf.written == 2
    assert [[r.step_key for r in batch.steps] for batch in batches] == [["1", "2"], ["1", "2"]]
    assert all(r.tool == "copilot-desktop" and r.text == "" for r in batches[-1].steps)

    store.streams_observations = True
    legacy = FactBuffer(store)
    legacy.add_step(step("ignored", 6))
    CopilotFacts("s", legacy).feed(event("user.message", {"content": "not for legacy steps"}))
    assert len(legacy) == 1  # legacy prompt observation, no new fact family
    legacy.flush()
    assert batches[-1].prompts and not batches[-1].steps
