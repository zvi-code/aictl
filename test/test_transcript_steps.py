"""Copilot events.jsonl -> searchable steps. All transcripts here are synthetic."""

import json
import sqlite3
import time
from types import SimpleNamespace

import pytest

from aictl.ingesters.call_facts import CopilotFacts, FactBuffer
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.storage import STEP_TEXT_LIMIT, HistoryDB, SessionStepRow, TurnRequestLink


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


def test_command_requests_are_not_applied_changes():
    buf = FactBuffer(SimpleNamespace(_keeps_text=lambda: False))
    cop = CopilotFacts("s", buf)
    for msg in ("/model gpt-5-mini", "/clear", "/new worktree", "/new", "/reset", "/compact", "/reset-allowed-tools",
                "use /clear", "`/clear`", "/clear the buffer in my script", "/model is not working",
                "/model\ngpt-5-mini", "/clearance", "/new-file"):
        cop.feed(event("user.message", {"content": msg}))
    for data in ({"source": "autopilot"}, {"source": "agent-1"}, {"isAutopilotContinuation": True},
                 {"source": "skill-hidden"}, {"parentAgentTaskId": "p"}):
        cop.feed(event("user.message", {"content": "/reset", **data}))
    cop.feed(event("assistant.message", {"content": "/reset"}))
    cop.feed(event("command.queued", {"requestId": "q", "command": "/clear PRIVATE-PROMPT"}))
    cop.feed(event("command.execute", {"requestId": "q", "command": "/clear PRIVATE-PROMPT", "commandName": "clear"}))
    cop.feed(event("command.completed", {"requestId": "q"}))  # dismisses a notification
    cop.feed(event("session.usage_info", {"currentTokens": 21}))
    cop.feed(event("session.usage_info", {"currentTokens": 0}))
    rows = list(buf.steps.values())
    assert [(r.name, r.phase) for r in rows if r.kind == "session_command"] == [
        ("model", "requested"), ("clear", "requested"), ("new_worktree", "requested"),
        ("new", "requested"), ("reset", "requested"), ("compact", "requested"),
        ("clear", "queued"), ("clear", "dispatched"),
    ]
    assert not any(r.name == "reset" and r.kind == "context" for r in rows)
    assert all(not r.text for r in rows) and "PRIVATE-PROMPT" not in repr(rows)


@pytest.mark.parametrize("full", [False, True])
def test_explicit_context_lifecycle_and_model_change(full):
    buf = FactBuffer(SimpleNamespace(_keeps_text=lambda: full))
    cop = CopilotFacts("s", buf)
    events = [
        event("session.model_change", {"previousModel": "gpt-6.1-terra", "newModel": "gpt-5-mini", "cause": "rate_limit_fallback"}),
        event("session.context_cleared", {"messagesCleared": 12, "initialMessage": "PRIVATE-RESET"}, agentId="child"),
        event("session.snapshot_rewind", {"eventsRemoved": 2, "upToEventId": "e"}),
        event("session.compaction_start", {"currentTokens": 71, "tokenLimit": 128}),
        event("session.compaction_complete", {"outcome": "cancelled", "success": False, "error": "PRIVATE-ERROR"}),
        event("session.compaction_complete", {"success": True, "preCompactionTokens": 71, "postCompactionTokens": 15,
                                              "tokenAccountingBasis": "local_full_context_estimate", "summaryContent": "PRIVATE-SUMMARY"}),
        event("session.compaction_complete", {"success": False}),
    ]
    for _ in range(2):
        cop.reset()
        for i, obj in enumerate(events):
            cop.feed({**obj, "id": f"e{i}"})
    model, reset, rewind, start, cancelled, compacted, failed = buf.steps.values()
    assert (model.kind, model.name, model.phase) == ("session_command", "model_change", "applied")
    assert model.text == ("previousModel: gpt-6.1-terra\nnewModel: gpt-5-mini" if full else "")
    assert (reset.kind, reset.name, reset.phase, reset.agent_id, reset.after_tokens) == ("context", "reset", "applied", "child", None)
    assert (rewind.name, rewind.kind) == ("rewind", "session_command")
    assert (start.phase, start.context_tokens, start.context_limit) == ("compaction_start", 71, 128)
    assert (cancelled.name, cancelled.phase, failed.phase) == ("compaction", "compaction_cancelled", "compaction_failed")
    assert (compacted.before_tokens, compacted.after_tokens, compacted.estimated) == (71, 15, 1)
    assert not any(r.text for r in (reset, rewind, start, cancelled, compacted, failed)) and "PRIVATE-" not in repr(buf.steps)


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
    legacy.add_cost_link(TurnRequestLink("ignored", 6, "s"))
    CopilotFacts("s", legacy).feed(event("user.message", {"content": "not for legacy steps"}))
    assert len(legacy) == 1  # legacy prompt observation, no new fact family
    legacy.flush()
    assert batches[-1].prompts and not batches[-1].steps and not batches[-1].cost_links


def test_link_only_write_retries_with_latest_attribution():
    batches = []
    def write(facts):
        batches.append(facts)
        if len(batches) == 1:
            raise sqlite3.OperationalError("locked")
        return len(facts)

    buf = FactBuffer(SimpleNamespace(write_call_facts=write))
    buf.add_cost_link(TurnRequestLink("k", 5, "s", basis="unattributed"))
    buf.flush()
    buf.add_cost_link(TurnRequestLink("k", 5, "s", turn_id="1", basis="api_call_id"))
    assert len(buf) == 1
    buf.flush()
    assert len(buf) == 0 and buf.written == 1
    assert [(b.cost_links[0].request_key, b.cost_links[0].basis) for b in batches] == [("k", "unattributed"), ("k", "api_call_id")]


def test_cost_links_join_canonical_requests_across_polls_and_nested_agents(tmp_path):
    ts = time.time() - 3
    usage = {"model": "gpt-4o", "inputTokens": 1000, "outputTokens": 100}
    before = [
        event("assistant.turn_start", {"turnId": "spawn"}),
        event("assistant.message", {"turnId": "spawn", "toolRequests": [{"name": "task", "toolCallId": "outer"}]}),
        event("subagent.started", {"toolCallId": "outer"}, agentId="child"),
        event("assistant.turn_end", {"turnId": "spawn"}),
        event("assistant.turn_start", {"turnId": "1"}),
        event("assistant.turn_start", {"turnId": "1", "parentToolCallId": "outer"}, agentId="child"),
        event("session.usage_record", {"usage": usage | {"apiCallId": "child-api", "parentToolCallId": "outer"}}, agentId="child"),
        event("session.usage_record", {"usage": usage | {"apiCallId": "root-api"}}),
    ]
    after = [
        event("assistant.message", {"apiCallId": "child-api", "turnId": "1", "phase": "commentary",
                                    "content": "work", "reasoningText": "HIDDEN"}, agentId="child"),
        event("assistant.message", {"apiCallId": "root-api", "turnId": "1", "phase": "final_answer", "content": "done"}),
        event("tool.execution_start", {"toolName": "task", "toolCallId": "inner", "parentToolCallId": "outer"}),
        event("subagent.started", {"toolCallId": "inner"}, agentId="grandchild"),
        event("assistant.turn_start", {"turnId": "1", "parentToolCallId": "inner"}),
        # Only the parentToolCallId identifies this agent.
        event("session.usage_record", {"usage": usage | {"parentToolCallId": "inner"}}),
        event("assistant.turn_end", {"turnId": "1"}),
        event("session.usage_record", {"usage": usage}),  # closed root turn
        # Explicit local turn with no evidence of any parent, even though its ID matches.
        event("session.usage_record", {"usage": usage | {"turnId": "1"}}, agentId="orphan"),
    ]
    db = HistoryDB(tmp_path / "turns.db", flush_interval=0)
    try:
        buf = FactBuffer(db)
        buf.surface = lambda _: "copilot-desktop"
        cop = CopilotFacts("sid", buf)
        conn = db._conn()
        for _ in range(2):
            cop.reset()  # repeat the entire file: same canonical request keys, no second cost
            for batch in (before, after):
                for obj in batch:
                    cop.feed(obj | {"timestamp": ts})
                buf.flush()
        joined = list(conn.execute(
            "SELECT l.agent_id,l.turn_id,l.root_session_id,l.root_turn_id,l.basis,l.tool,r.cost_usd "
            "FROM requests r JOIN turn_request_links l ON l.request_key=r.dedup_key ORDER BY r.id"
        ))
        assert [tuple(row[:5]) for row in joined] == [
            ("child", "1", "sid", "spawn", "api_call_id"), ("", "1", "sid", "1", "api_call_id"),
            ("grandchild", "1", "sid", "spawn", "open_turn"), ("", "", "", "", "unattributed"),
            ("orphan", "1", "", "", "explicit_turn"),
        ]
        assert all(row[5] == "copilot-desktop" and row[6] > 0 for row in joined)
        assert conn.execute("SELECT COUNT(*) FROM requests").fetchone()[0] == len(joined)
        assert conn.execute("SELECT COUNT(*) FROM turn_request_links").fetchone()[0] == len(joined)
        assert {r[0] for r in conn.execute("SELECT phase FROM session_steps WHERE role='assistant' AND phase!=''")} == {"commentary", "final_answer"}
        assert not conn.execute("SELECT 1 FROM session_step_text WHERE text LIKE '%HIDDEN%'").fetchone()
    finally:
        db.close()


def test_ambiguous_usage_stays_unattributed_until_same_agent_api_id_arrives():
    buf = FactBuffer(SimpleNamespace(_keeps_text=lambda: False))
    cop = CopilotFacts("s", buf)
    for tid in ("a", "b"):
        cop.feed(event("assistant.turn_start", {"turnId": tid}, id=tid))
    opaque = "provider/" + "x" * 415
    cop.feed(event("session.usage_record", {"usage": {"apiCallId": opaque}}, parentId="a"))
    key, = buf.requests
    assert buf.cost_links[key].basis == "unattributed"  # preceding envelope event is not a causal edge
    cop.feed(event("assistant.message", {"turnId": "other", "apiCallId": opaque}, agentId="sibling"))
    assert not buf.cost_links[key].turn_id
    cop.feed(event("assistant.message", {"turnId": "b", "apiCallId": opaque}))
    assert (buf.cost_links[key].turn_id, buf.cost_links[key].basis) == ("b", "api_call_id")
    assert opaque not in repr(buf.steps)
    cop.feed(event("session.usage_record", {"usage": {"parentToolCallId": "unknown-spawn", "turnId": "a"}}))
    assert any(r.basis == "unknown_agent" and not r.root_turn_id for r in buf.cost_links.values())
    cop.feed(event("session.compaction_complete", {"requestId": "comp", "compactionTokensUsed": {"inputTokens": 123}}))
    cop.feed(event("assistant.turn_end", {"turnId": "b"}))
    cop.finish_poll(time.time(), 1)
    comp, = (r for r in buf.requests.values() if r.input_tokens == 123)
    assert buf.cost_links[comp.dedup_key].basis == "unattributed"
    assert set(buf.cost_links) == set(buf.requests)
