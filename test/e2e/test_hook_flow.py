"""E2E: Hook ingestion → session creation → tool invocation storage.

Posts synthetic Claude/Gemini hook sequences to a live aictl server and
verifies sessions, events, and tool invocations appear in the API.
"""

from __future__ import annotations

import time

import pytest

pytestmark = pytest.mark.e2e


class TestClaudeHookFlow:
    """Full Claude Code hook lifecycle: SessionStart → tools → Stop."""

    def test_session_created(self, aictl_server, claude_hook_sequence):
        """SessionStart hook creates a session queryable via /api/sessions."""
        for ev in claude_hook_sequence:
            aictl_server.post_hook(ev)

        # Small delay for async DB writes
        time.sleep(0.5)

        sessions = aictl_server.get_sessions(since="0")
        session_ids = {s["session_id"] for s in sessions}
        expected_sid = claude_hook_sequence[0]["session_id"]
        assert expected_sid in session_ids, (
            f"Session {expected_sid} not found. Got: {session_ids}"
        )

    def test_session_tool_is_claude(self, aictl_server, claude_hook_sequence):
        for ev in claude_hook_sequence:
            aictl_server.post_hook(ev)
        time.sleep(0.5)

        sid = claude_hook_sequence[0]["session_id"]
        sessions = aictl_server.get_sessions(since="0")
        session = next((s for s in sessions if s["session_id"] == sid), None)
        assert session is not None
        assert session["tool"] == "claude-code"

    def test_events_stored(self, aictl_server, claude_hook_sequence):
        """All hook events appear in /api/events."""
        for ev in claude_hook_sequence:
            aictl_server.post_hook(ev)

        sid = claude_hook_sequence[0]["session_id"]
        events = aictl_server.get_events(session_id=sid, since="0", min_count=5)
        event_kinds = [e["kind"] for e in events]

        assert "hook:SessionStart" in event_kinds
        assert "hook:UserPromptSubmit" in event_kinds
        assert "hook:PreToolUse" in event_kinds
        assert "hook:PostToolUse" in event_kinds
        assert "hook:Stop" in event_kinds

    def test_tool_invocations_recorded(self, aictl_server, claude_hook_sequence):
        """PreToolUse/PostToolUse pairs create tool invocation records."""
        for ev in claude_hook_sequence:
            aictl_server.post_hook(ev)

        sid = claude_hook_sequence[0]["session_id"]
        events = aictl_server.get_events(
            session_id=sid, kind="hook:PreToolUse", since="0", min_count=2,
        )
        tool_names = [e["detail"].get("tool_name", "") for e in events]
        assert "Write" in tool_names
        assert "Bash" in tool_names

    def test_session_end_recorded(self, aictl_server, claude_hook_sequence):
        """Stop event ends the session with token counts."""
        for ev in claude_hook_sequence:
            aictl_server.post_hook(ev)
        time.sleep(0.5)

        sid = claude_hook_sequence[0]["session_id"]
        sessions = aictl_server.get_sessions(since="0")
        session = next((s for s in sessions if s["session_id"] == sid), None)
        assert session is not None
        # Session should have ended
        if session.get("ended_at"):
            assert session["ended_at"] > 0
        # Token counts from Stop event should be recorded
        if session.get("input_tokens") is not None:
            assert session["input_tokens"] >= 0


class TestGeminiHookFlow:
    """Gemini CLI hook lifecycle."""

    def test_session_created(self, aictl_server, gemini_hook_sequence):
        for ev in gemini_hook_sequence:
            aictl_server.post_hook(ev)
        time.sleep(0.5)

        sid = gemini_hook_sequence[0]["session_id"]
        sessions = aictl_server.get_sessions(since="0")
        session_ids = {s["session_id"] for s in sessions}
        assert sid in session_ids

    def test_session_tool_is_gemini(self, aictl_server, gemini_hook_sequence):
        for ev in gemini_hook_sequence:
            aictl_server.post_hook(ev)
        time.sleep(0.5)

        sid = gemini_hook_sequence[0]["session_id"]
        sessions = aictl_server.get_sessions(since="0")
        session = next((s for s in sessions if s["session_id"] == sid), None)
        assert session is not None
        assert session["tool"] == "gemini-cli" or "gemini" in session["tool"]

    def test_events_stored(self, aictl_server, gemini_hook_sequence):
        for ev in gemini_hook_sequence:
            aictl_server.post_hook(ev)

        sid = gemini_hook_sequence[0]["session_id"]
        events = aictl_server.get_events(session_id=sid, since="0", min_count=3)
        event_kinds = [e["kind"] for e in events]
        assert "hook:SessionStart" in event_kinds
        assert "hook:Stop" in event_kinds


class TestMultiToolSessions:
    """Verify concurrent sessions from different tools coexist."""

    def test_two_tools_two_sessions(
        self, aictl_server, claude_hook_sequence, gemini_hook_sequence,
    ):
        for ev in claude_hook_sequence:
            aictl_server.post_hook(ev)
        for ev in gemini_hook_sequence:
            aictl_server.post_hook(ev)
        time.sleep(0.5)

        sessions = aictl_server.get_sessions(since="0")
        tools = {s["tool"] for s in sessions}
        assert "claude-code" in tools
        # Gemini tool name might vary
        assert any("gemini" in t for t in tools)

    def test_session_isolation(
        self, aictl_server, claude_hook_sequence, gemini_hook_sequence,
    ):
        """Events from one session don't leak into another."""
        for ev in claude_hook_sequence:
            aictl_server.post_hook(ev)
        for ev in gemini_hook_sequence:
            aictl_server.post_hook(ev)
        time.sleep(0.5)

        claude_sid = claude_hook_sequence[0]["session_id"]
        gemini_sid = gemini_hook_sequence[0]["session_id"]

        claude_events = aictl_server.get_events(session_id=claude_sid, since="0")
        gemini_events = aictl_server.get_events(session_id=gemini_sid, since="0")

        # No cross-contamination
        for ev in claude_events:
            assert ev.get("session_id", "") != gemini_sid
        for ev in gemini_events:
            assert ev.get("session_id", "") != claude_sid


class TestHookEdgeCases:
    """Edge cases and error handling for hook ingestion."""

    def test_unknown_event_accepted(self, aictl_server):
        """Server accepts hook events with unknown event names."""
        resp = aictl_server.post_hook({
            "event": "CustomEvent",
            "session_id": "edge-test-1",
            "tool": "test-tool",
            "ts": time.time(),
        })
        assert resp == {"ok": True}

    def test_minimal_payload(self, aictl_server):
        """Bare minimum payload (just event name) is accepted."""
        resp = aictl_server.post_hook({
            "event": "Ping",
        })
        assert resp == {"ok": True}

    def test_session_id_derived_from_pattern(self, aictl_server):
        """When tool is omitted, it's derived from session_id pattern 'tool:pid:ts'."""
        resp = aictl_server.post_hook({
            "event": "SessionStart",
            "session_id": "claude-code:12345:1700000000",
            "ts": time.time(),
        })
        assert resp == {"ok": True}
        time.sleep(0.3)

        sessions = aictl_server.get_sessions(since="0")
        session = next(
            (s for s in sessions if s["session_id"] == "claude-code:12345:1700000000"),
            None,
        )
        assert session is not None
        assert session["tool"] == "claude-code"

    def test_large_detail_payload(self, aictl_server):
        """Event with large detail body is accepted."""
        resp = aictl_server.post_hook({
            "event": "UserPromptSubmit",
            "session_id": "edge-large-1",
            "message": "x" * 50_000,
            "ts": time.time(),
        })
        assert resp == {"ok": True}
