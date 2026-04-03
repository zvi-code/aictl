# Tests for aictl.analysis — session identity, transcript, and analyzer
"""Comprehensive tests for the session analysis layer."""
from __future__ import annotations

import time

import pytest

from aictl.analysis.session_id import (
    SessionIdentity,
    can_merge,
    fingerprint_session,
    id_type,
    merge_identities,
    resolve_session_id,
)
from aictl.analysis.transcript import (
    Action,
    ActionKind,
    SessionTranscript,
    TranscriptSummary,
    Turn,
)
from aictl.analysis.analyzer import SessionAnalyzer
from aictl.storage import EventRow


# ══════════════════════════════════════════════════════════════
# session_id tests
# ══════════════════════════════════════════════════════════════

class TestIdType:
    def test_uuid(self):
        assert id_type("550e8400-e29b-41d4-a716-446655440000") == "uuid"

    def test_uuid_uppercase(self):
        assert id_type("550E8400-E29B-41D4-A716-446655440000") == "uuid"

    def test_correlator(self):
        assert id_type("claude-code:12345:1672531200") == "correlator"

    def test_ephemeral(self):
        assert id_type("claude-code:ephemeral") == "ephemeral"

    def test_empty(self):
        assert id_type("") == "unknown"

    def test_random_string(self):
        assert id_type("some-random-thing") == "unknown"


class TestFingerprintSession:
    def test_deterministic(self):
        fp1 = fingerprint_session("claude-code", 12345, 1672531200.0)
        fp2 = fingerprint_session("claude-code", 12345, 1672531200.0)
        assert fp1 == fp2

    def test_different_for_different_input(self):
        fp1 = fingerprint_session("claude-code", 12345, 1672531200.0)
        fp2 = fingerprint_session("claude-code", 12346, 1672531200.0)
        assert fp1 != fp2

    def test_format(self):
        fp = fingerprint_session("copilot", 999, 1000.0)
        assert fp.startswith("copilot-")
        assert len(fp) == len("copilot-") + 8

    def test_workspace_affects_hash(self):
        fp1 = fingerprint_session("claude-code", 1, 1000.0, "/project-a")
        fp2 = fingerprint_session("claude-code", 1, 1000.0, "/project-b")
        assert fp1 != fp2


class TestSessionIdentity:
    def test_has_id_canonical(self):
        si = SessionIdentity(canonical_id="abc", tool="t")
        assert si.has_id("abc")

    def test_has_id_alias(self):
        si = SessionIdentity(canonical_id="abc", tool="t",
                             source_ids=["def", "ghi"])
        assert si.has_id("def")
        assert si.has_id("ghi")
        assert not si.has_id("xyz")

    def test_has_pid(self):
        si = SessionIdentity(canonical_id="abc", tool="t",
                             pids={100, 200})
        assert si.has_pid(100)
        assert not si.has_pid(300)

    def test_add_alias_dedup(self):
        si = SessionIdentity(canonical_id="abc", tool="t")
        si.add_alias("def")
        si.add_alias("def")
        si.add_alias("abc")  # same as canonical, skip
        assert si.source_ids == ["def"]

    def test_add_pid(self):
        si = SessionIdentity(canonical_id="abc", tool="t")
        si.add_pid(100)
        si.add_pid(0)  # skip zero
        assert si.pids == {100}

    def test_to_dict(self):
        si = SessionIdentity(canonical_id="abc", tool="t",
                             pids={3, 1, 2}, started_at=1000.0)
        d = si.to_dict()
        assert d["canonical_id"] == "abc"
        assert d["pids"] == [1, 2, 3]  # sorted


class TestResolveSessionId:
    def test_prefers_uuid(self):
        si = resolve_session_id(
            hook_id="550e8400-e29b-41d4-a716-446655440000",
            correlator_id="claude-code:12345:1672531200",
            tool="claude-code",
        )
        assert si.canonical_id == "550e8400-e29b-41d4-a716-446655440000"
        assert "claude-code:12345:1672531200" in si.source_ids
        assert si.source == "hook"

    def test_falls_back_to_correlator(self):
        si = resolve_session_id(
            correlator_id="copilot:9999:1000",
            tool="copilot",
        )
        assert si.canonical_id == "copilot:9999:1000"

    def test_creates_fingerprint(self):
        si = resolve_session_id(
            tool="gemini", pid=555, start_ts=1000.0,
            workspace="/my/project",
        )
        assert si.canonical_id.startswith("gemini-")
        assert 555 in si.pids

    def test_otel_uuid(self):
        si = resolve_session_id(
            otel_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            tool="copilot-vscode",
        )
        assert si.canonical_id == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        assert si.source == "otel"

    def test_unknown_fallback(self):
        si = resolve_session_id(tool="unknown")
        assert si.canonical_id.startswith("unknown-")

    def test_pid_recorded(self):
        si = resolve_session_id(
            hook_id="550e8400-e29b-41d4-a716-446655440000",
            pid=42,
            tool="claude-code",
        )
        assert 42 in si.pids


class TestMergeIdentities:
    def test_prefers_uuid_canonical(self):
        a = SessionIdentity(
            canonical_id="claude-code:12345:1000",
            tool="claude-code", pids={12345},
        )
        b = SessionIdentity(
            canonical_id="550e8400-e29b-41d4-a716-446655440000",
            tool="claude-code", pids={12345, 12346},
        )
        merged = merge_identities(a, b)
        assert merged.canonical_id == "550e8400-e29b-41d4-a716-446655440000"
        assert "claude-code:12345:1000" in merged.source_ids
        assert merged.pids == {12345, 12346}

    def test_unions_pids(self):
        a = SessionIdentity(canonical_id="a", tool="t", pids={1, 2})
        b = SessionIdentity(canonical_id="b", tool="t", pids={2, 3})
        merged = merge_identities(a, b)
        assert merged.pids == {1, 2, 3}

    def test_earliest_start(self):
        a = SessionIdentity(canonical_id="a", tool="t", started_at=100.0)
        b = SessionIdentity(canonical_id="b", tool="t", started_at=50.0)
        merged = merge_identities(a, b)
        assert merged.started_at == 50.0


class TestCanMerge:
    def test_shared_pid(self):
        a = SessionIdentity(canonical_id="a", tool="t", pids={100})
        b = SessionIdentity(canonical_id="b", tool="t", pids={100, 200})
        assert can_merge(a, b)

    def test_shared_alias(self):
        a = SessionIdentity(canonical_id="a", tool="t",
                            source_ids=["shared"])
        b = SessionIdentity(canonical_id="shared", tool="t")
        assert can_merge(a, b)

    def test_different_tools(self):
        a = SessionIdentity(canonical_id="a", tool="claude", pids={100})
        b = SessionIdentity(canonical_id="b", tool="copilot", pids={100})
        assert not can_merge(a, b)

    def test_no_overlap(self):
        a = SessionIdentity(canonical_id="a", tool="t", pids={1})
        b = SessionIdentity(canonical_id="b", tool="t", pids={2})
        assert not can_merge(a, b)


# ══════════════════════════════════════════════════════════════
# transcript tests
# ══════════════════════════════════════════════════════════════

class TestAction:
    def test_to_dict_minimal(self):
        a = Action(ts=100.0, kind=ActionKind.TOOL_USE, name="read_file")
        d = a.to_dict()
        assert d["kind"] == "tool_use"
        assert d["name"] == "read_file"
        assert "tokens" not in d  # no tokens, excluded

    def test_to_dict_with_tokens(self):
        a = Action(ts=100.0, kind=ActionKind.API_CALL, name="gpt-4",
                   tokens_in=100, tokens_out=50)
        d = a.to_dict()
        assert d["tokens"]["input"] == 100
        assert d["tokens"]["output"] == 50


class TestTurn:
    def test_add_action_accumulates_api_tokens(self):
        turn = Turn(ts=100.0)
        turn.add_action(Action(
            ts=101.0, kind=ActionKind.API_CALL, name="gpt-4",
            tokens_in=100, tokens_out=50, duration_ms=500,
        ))
        turn.add_action(Action(
            ts=102.0, kind=ActionKind.API_CALL, name="gpt-4",
            tokens_in=200, tokens_out=100, duration_ms=300,
        ))
        assert turn.input_tokens == 300
        assert turn.output_tokens == 150
        assert turn.api_calls == 2
        assert turn.duration_ms == 800

    def test_tool_uses_filtered(self):
        turn = Turn(ts=100.0)
        turn.add_action(Action(ts=101.0, kind=ActionKind.TOOL_USE,
                               name="read_file"))
        turn.add_action(Action(ts=102.0, kind=ActionKind.API_CALL,
                               name="gpt-4"))
        turn.add_action(Action(ts=103.0, kind=ActionKind.TOOL_USE,
                               name="write_file"))
        assert len(turn.tool_uses) == 2

    def test_total_tokens(self):
        turn = Turn(ts=100.0, input_tokens=500, output_tokens=200)
        assert turn.total_tokens == 700

    def test_end_ts_updated(self):
        turn = Turn(ts=100.0)
        turn.add_action(Action(ts=105.0, kind=ActionKind.TOOL_USE))
        assert turn.end_ts == 105.0

    def test_model_from_first_api_call(self):
        turn = Turn(ts=100.0)
        turn.add_action(Action(ts=101.0, kind=ActionKind.API_CALL,
                               name="claude-3.5"))
        turn.add_action(Action(ts=102.0, kind=ActionKind.API_CALL,
                               name="claude-3"))
        assert turn.model == "claude-3.5"

    def test_to_dict_wall_ms(self):
        turn = Turn(ts=100.0, end_ts=102.5, duration_ms=500)
        d = turn.to_dict()
        assert d["wall_ms"] == 2500  # (102.5 - 100.0) * 1000


class TestSessionTranscript:
    def test_start_turn(self):
        t = SessionTranscript(session_id="test")
        turn = t.start_turn(100.0, "Hello, fix this bug")
        assert turn.prompt == "Hello, fix this bug"
        assert turn.prompt_preview == "Hello, fix this bug"
        assert t.current_turn is turn
        assert len(t.turns) == 1

    def test_multiple_turns(self):
        t = SessionTranscript(session_id="test")
        t.start_turn(100.0, "First prompt")
        t.start_turn(200.0, "Second prompt")
        assert len(t.turns) == 2
        assert t.current_turn.prompt == "Second prompt"

    def test_build_summary(self):
        t = SessionTranscript(session_id="test", started_at=100.0)
        turn1 = t.start_turn(100.0, "First")
        turn1.add_action(Action(ts=101.0, kind=ActionKind.API_CALL,
                                name="gpt-4", tokens_in=100,
                                tokens_out=50))
        turn1.add_action(Action(ts=102.0, kind=ActionKind.TOOL_USE,
                                name="read_file"))
        turn2 = t.start_turn(200.0, "Second")
        turn2.add_action(Action(ts=201.0, kind=ActionKind.API_CALL,
                                name="gpt-4", tokens_in=200,
                                tokens_out=100))
        t.add_lifecycle_event({"type": "compaction", "ts": 150.0})

        summary = t.build_summary()
        assert summary.total_turns == 2
        assert summary.total_api_calls == 2
        assert summary.total_tool_uses == 1
        assert summary.total_input_tokens == 300
        assert summary.total_output_tokens == 150
        assert summary.compactions == 1
        assert summary.source == "hooks"

    def test_empty_transcript_summary(self):
        t = SessionTranscript(session_id="test")
        summary = t.build_summary()
        assert summary.total_turns == 0
        assert summary.total_tokens == 0

    def test_to_dict(self):
        t = SessionTranscript(session_id="test", tool="claude-code",
                              started_at=100.0, pids={1, 2})
        d = t.to_dict()
        assert d["session_id"] == "test"
        assert d["pids"] == [1, 2]
        assert "summary" in d
        assert "turns" in d


class TestTranscriptSummary:
    def test_total_tokens(self):
        s = TranscriptSummary(total_input_tokens=100,
                              total_output_tokens=50)
        assert s.total_tokens == 150

    def test_avg_tokens_zero_calls(self):
        s = TranscriptSummary()
        d = s.to_dict()
        assert d["avg_tokens_per_call"] == 0

    def test_avg_tokens(self):
        s = TranscriptSummary(total_input_tokens=300,
                              total_output_tokens=100,
                              total_api_calls=4)
        d = s.to_dict()
        assert d["avg_tokens_per_call"] == 100


# ══════════════════════════════════════════════════════════════
# analyzer tests
# ══════════════════════════════════════════════════════════════

def _ev(ts=100.0, tool="claude-code", kind="hook:UserPromptSubmit",
        detail=None, session_id="sess-1", pid=1000):
    return EventRow(
        ts=ts, tool=tool, kind=kind,
        detail=detail or {},
        session_id=session_id, pid=pid,
    )


class TestAnalyzerBasic:
    def test_create_empty(self):
        a = SessionAnalyzer()
        assert a.get_all_transcripts() == []

    def test_ingest_creates_transcript(self):
        a = SessionAnalyzer()
        ev = _ev(kind="hook:SessionStart", detail={"cwd": "/project"})
        t = a.ingest_event(ev)
        assert t is not None
        assert t.session_id is not None
        assert t.tool == "claude-code"

    def test_ingest_none_for_no_identity(self):
        a = SessionAnalyzer()
        ev = _ev(session_id="", pid=0)
        t = a.ingest_event(ev)
        assert t is None

    def test_lookup_by_session_id(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:SessionStart"))
        t = a.get_transcript("sess-1")
        assert t is not None

    def test_lookup_by_pid(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:SessionStart"))
        t = a.get_transcript_by_pid(1000)
        assert t is not None


class TestAnalyzerHookEvents:
    def test_user_prompt_creates_turn(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:SessionStart"))
        a.ingest_event(_ev(ts=101.0,
                           kind="hook:UserPromptSubmit",
                           detail={"message": "Fix the auth bug"}))
        t = a.get_transcript("sess-1")
        assert len(t.turns) == 1
        assert t.turns[0].prompt == "Fix the auth bug"

    def test_tool_use_added_to_turn(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:UserPromptSubmit",
                           detail={"message": "Read this file"}))
        a.ingest_event(_ev(ts=101.0,
                           kind="hook:PreToolUse",
                           detail={"tool_name": "read_file",
                                   "input": {"file_path": "/src/main.py"}}))
        t = a.get_transcript("sess-1")
        assert len(t.turns[0].actions) == 1
        assert t.turns[0].actions[0].name == "read_file"
        assert t.turns[0].actions[0].input_summary == "/src/main.py"

    def test_post_tool_use_sets_duration(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:UserPromptSubmit",
                           detail={"message": "test"}))
        a.ingest_event(_ev(ts=101.0,
                           kind="hook:PreToolUse",
                           detail={"tool_name": "bash"}))
        a.ingest_event(_ev(ts=103.0,
                           kind="hook:PostToolUse",
                           detail={"tool_name": "bash"}))
        t = a.get_transcript("sess-1")
        assert t.turns[0].actions[0].duration_ms == 2000

    def test_session_end_marks_not_live(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:SessionStart"))
        a.ingest_event(_ev(ts=200.0, kind="hook:SessionEnd"))
        t = a.get_transcript("sess-1")
        assert not t.is_live
        assert t.ended_at == 200.0

    def test_multiple_turns(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(ts=100.0, kind="hook:UserPromptSubmit",
                           detail={"message": "First"}))
        a.ingest_event(_ev(ts=101.0, kind="hook:PreToolUse",
                           detail={"tool_name": "read_file"}))
        a.ingest_event(_ev(ts=200.0, kind="hook:UserPromptSubmit",
                           detail={"message": "Second"}))
        a.ingest_event(_ev(ts=201.0, kind="hook:PreToolUse",
                           detail={"tool_name": "write_file"}))
        t = a.get_transcript("sess-1")
        assert len(t.turns) == 2
        assert t.turns[0].prompt == "First"
        assert t.turns[1].prompt == "Second"
        assert t.turns[0].actions[0].name == "read_file"
        assert t.turns[1].actions[0].name == "write_file"

    def test_subagent(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:UserPromptSubmit",
                           detail={"message": "test"}))
        a.ingest_event(_ev(ts=101.0, kind="hook:SubagentStart",
                           detail={"agent_id": "agent-1",
                                   "task": "Refactor utils"}))
        t = a.get_transcript("sess-1")
        action = t.turns[0].actions[0]
        assert action.kind == ActionKind.SUBAGENT
        assert action.name == "agent-1"
        assert action.input_summary == "Refactor utils"

    def test_compaction_lifecycle(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:PreCompact"))
        a.ingest_event(_ev(ts=105.0, kind="hook:PostCompact",
                           detail={"compaction_count": 3}))
        t = a.get_transcript("sess-1")
        comp = [e for e in t.lifecycle_events
                if e["type"] == "compaction"]
        assert len(comp) == 1
        assert comp[0]["compaction_count"] == 3


class TestAnalyzerOtelEvents:
    def test_user_prompt(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="otel:user_prompt",
                           detail={"prompt": "Help me debug"}))
        t = a.get_transcript("sess-1")
        assert len(t.turns) == 1
        assert t.turns[0].prompt == "Help me debug"

    def test_redacted_prompt(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="otel:user_prompt",
                           detail={"prompt": "<REDACTED>"}))
        t = a.get_transcript("sess-1")
        assert t.turns[0].prompt == ""

    def test_api_request(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="otel:user_prompt",
                           detail={"prompt": "test"}))
        a.ingest_event(_ev(ts=101.0, kind="otel:api_request",
                           detail={"model": "gpt-4",
                                   "input_tokens": 500,
                                   "output_tokens": 200,
                                   "duration_ms": 1500}))
        t = a.get_transcript("sess-1")
        # Should have API call + API response actions
        api_calls = [act for act in t.turns[0].actions
                     if act.kind == ActionKind.API_CALL]
        assert len(api_calls) == 1
        assert api_calls[0].name == "gpt-4"
        assert api_calls[0].tokens_in == 500
        # Turn-level accumulation
        assert t.turns[0].input_tokens == 500
        assert t.turns[0].output_tokens == 200

    def test_copilot_embedded_user_request(self):
        """Copilot chat spans embed user_request — should synthesize turn."""
        a = SessionAnalyzer()
        a.ingest_event(_ev(
            kind="otel:chat completion",
            detail={
                "copilot_chat.user_request": "Explain this code",
                "model": "gpt-4",
                "input_tokens": 300,
                "output_tokens": 100,
                "duration_ms": 800,
            },
        ))
        t = a.get_transcript("sess-1")
        assert len(t.turns) == 1
        assert t.turns[0].prompt == "Explain this code"
        assert t.turns[0].input_tokens == 300

    def test_tool_decision_and_result(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="otel:user_prompt",
                           detail={"prompt": "test"}))
        a.ingest_event(_ev(ts=101.0, kind="otel:tool_decision",
                           detail={"tool_name": "search",
                                   "decision": "allowed"}))
        a.ingest_event(_ev(ts=102.0, kind="otel:tool_result",
                           detail={"tool_name": "search",
                                   "success": "true",
                                   "duration_ms": 150}))
        t = a.get_transcript("sess-1")
        actions = t.turns[0].actions
        assert len(actions) == 2
        assert actions[0].detail["subtype"] == "decision"
        assert actions[1].detail["subtype"] == "result"
        assert actions[1].success is True

    def test_exception_event(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="otel:user_prompt",
                           detail={"prompt": "test"}))
        a.ingest_event(_ev(ts=101.0, kind="otel:exception",
                           detail={"exception.type": "RateLimitError",
                                   "exception.message": "Too many requests"}))
        t = a.get_transcript("sess-1")
        err = t.turns[0].actions[0]
        assert err.kind == ActionKind.ERROR
        assert err.name == "RateLimitError"
        assert err.success is False

    def test_subagent_invocation(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="otel:invoke_agent code_agent"))
        t = a.get_transcript("sess-1")
        assert t.turns[0].actions[0].kind == ActionKind.SUBAGENT
        assert t.turns[0].actions[0].name == "code_agent"


class TestAnalyzerCorrelatorEvents:
    def test_session_start(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="session_start",
                           detail={"pid": 1000}))
        t = a.get_transcript("sess-1")
        assert t.is_live
        assert len(t.lifecycle_events) == 1

    def test_session_end(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="session_start"))
        a.ingest_event(_ev(ts=200.0, kind="session_end"))
        t = a.get_transcript("sess-1")
        assert not t.is_live

    def test_file_modified_in_turn(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:UserPromptSubmit",
                           detail={"message": "edit it"}))
        a.ingest_event(_ev(ts=101.0, kind="file_modified",
                           detail={"path": "/src/main.py"}))
        t = a.get_transcript("sess-1")
        file_edits = [act for act in t.turns[0].actions
                      if act.kind == ActionKind.FILE_EDIT]
        assert len(file_edits) == 1
        assert file_edits[0].name == "/src/main.py"


class TestAnalyzerSessionMerge:
    def test_same_session_different_events(self):
        """Events with same session_id go to same transcript."""
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:SessionStart", session_id="X"))
        a.ingest_event(_ev(ts=101.0, kind="hook:UserPromptSubmit",
                           session_id="X",
                           detail={"message": "hello"}))
        assert len(a.get_all_transcripts()) == 1

    def test_pid_bridges_sessions(self):
        """Same PID, different session IDs → same transcript."""
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:SessionStart",
                           session_id="hook-id", pid=5000))
        a.ingest_event(_ev(ts=101.0, kind="otel:api_request",
                           session_id="otel-id", pid=5000,
                           detail={"model": "gpt-4",
                                   "input_tokens": 100,
                                   "output_tokens": 50}))
        # Should have merged into one transcript
        assert len(a.get_all_transcripts()) == 1
        t = a.get_transcript("hook-id")
        assert t is not None
        # OTel session_id should be recorded as alias
        assert "otel-id" in t.source_ids or a.get_transcript("otel-id") is t

    def test_different_pids_different_transcripts(self):
        a = SessionAnalyzer()
        a.ingest_event(_ev(kind="hook:SessionStart",
                           session_id="s1", pid=100))
        a.ingest_event(_ev(kind="hook:SessionStart",
                           session_id="s2", pid=200))
        assert len(a.get_all_transcripts()) == 2


class TestAnalyzerGC:
    def test_gc_removes_stale(self):
        a = SessionAnalyzer(stale_seconds=10)
        old_time = time.time() - 100
        a.ingest_event(_ev(ts=old_time, kind="session_start",
                           session_id="old"))
        # Mark as ended (not live) so GC considers it
        a.ingest_event(_ev(ts=old_time + 1, kind="session_end",
                           session_id="old"))
        a.ingest_event(_ev(kind="session_start",
                           session_id="new", pid=2))
        removed = a.gc()
        assert removed == 1
        assert a.get_transcript("old") is None
        assert a.get_transcript("new") is not None

    def test_gc_lru_eviction(self):
        a = SessionAnalyzer(max_cached=2, stale_seconds=999999)
        for i in range(5):
            a.ingest_event(_ev(kind="session_start",
                               session_id=f"s{i}", pid=i + 1))
        a.gc()
        assert len(a.get_all_transcripts()) == 2

    def test_active_transcripts_filter(self):
        a = SessionAnalyzer()
        old_time = time.time() - 600
        a.ingest_event(_ev(ts=old_time, kind="session_start",
                           session_id="old", pid=1))
        now = time.time()
        a.ingest_event(_ev(ts=now, kind="session_start",
                           session_id="new", pid=2))
        active = a.get_active_transcripts(cutoff_seconds=300)
        assert len(active) == 1
        assert active[0].session_id is not None


class TestAnalyzerFullFlow:
    """Integration-style test: simulate a complete Claude Code session."""

    def test_full_claude_session(self):
        a = SessionAnalyzer()
        sid = "550e8400-e29b-41d4-a716-446655440000"
        pid = 12345

        # Session start
        a.ingest_event(_ev(
            ts=1000.0, kind="hook:SessionStart", session_id=sid, pid=pid,
            detail={"cwd": "/project", "model": "claude-3.5-sonnet"},
        ))

        # Turn 1: user prompt + tool use + API call
        a.ingest_event(_ev(
            ts=1001.0, kind="hook:UserPromptSubmit", session_id=sid, pid=pid,
            detail={"message": "Fix the login validation bug in auth.py"},
        ))
        a.ingest_event(_ev(
            ts=1002.0, kind="hook:PreToolUse", session_id=sid, pid=pid,
            detail={"tool_name": "read_file",
                    "input": {"file_path": "auth.py"}},
        ))
        a.ingest_event(_ev(
            ts=1003.0, kind="hook:PostToolUse", session_id=sid, pid=pid,
            detail={"tool_name": "read_file"},
        ))
        a.ingest_event(_ev(
            ts=1004.0, kind="hook:PreToolUse", session_id=sid, pid=pid,
            detail={"tool_name": "write_file",
                    "input": {"file_path": "auth.py"}},
        ))
        a.ingest_event(_ev(
            ts=1005.0, kind="hook:PostToolUse", session_id=sid, pid=pid,
            detail={"tool_name": "write_file"},
        ))

        # Turn 2: follow-up
        a.ingest_event(_ev(
            ts=1010.0, kind="hook:UserPromptSubmit", session_id=sid, pid=pid,
            detail={"message": "Now add unit tests for the fix"},
        ))
        a.ingest_event(_ev(
            ts=1011.0, kind="hook:PreToolUse", session_id=sid, pid=pid,
            detail={"tool_name": "write_file",
                    "input": {"file_path": "test_auth.py"}},
        ))
        a.ingest_event(_ev(
            ts=1012.0, kind="hook:PostToolUse", session_id=sid, pid=pid,
            detail={"tool_name": "write_file"},
        ))

        # Compaction
        a.ingest_event(_ev(
            ts=1020.0, kind="hook:PreCompact", session_id=sid, pid=pid,
        ))
        a.ingest_event(_ev(
            ts=1022.0, kind="hook:PostCompact", session_id=sid, pid=pid,
            detail={"compaction_count": 1},
        ))

        # Session end
        a.ingest_event(_ev(
            ts=1030.0, kind="hook:SessionEnd", session_id=sid, pid=pid,
        ))

        # Verify transcript
        t = a.get_transcript(sid)
        assert t is not None
        assert t.tool == "claude-code"
        assert not t.is_live
        assert t.ended_at == 1030.0

        # Turns
        assert len(t.turns) == 2

        turn1 = t.turns[0]
        assert turn1.prompt == "Fix the login validation bug in auth.py"
        assert len(turn1.actions) == 2
        assert turn1.actions[0].name == "read_file"
        assert turn1.actions[0].duration_ms == 1000  # 1003-1002
        assert turn1.actions[1].name == "write_file"

        turn2 = t.turns[1]
        assert turn2.prompt == "Now add unit tests for the fix"
        assert len(turn2.actions) == 1
        assert turn2.actions[0].name == "write_file"
        assert turn2.actions[0].input_summary == "test_auth.py"

        # Summary
        summary = t.build_summary()
        assert summary.total_turns == 2
        assert summary.total_tool_uses == 3
        assert summary.compactions == 1
        assert summary.source == "hooks"

        # Serialization
        d = t.to_dict()
        assert d["session_id"] == sid
        assert len(d["turns"]) == 2
        assert d["summary"]["total_turns"] == 2
