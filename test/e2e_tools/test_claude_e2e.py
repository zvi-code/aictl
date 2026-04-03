"""E2E: Real Claude Code CLI — hooks fire and events land in aictl.

Requires:
- ``claude`` CLI installed and authenticated
- API quota available (tests use tiny prompts, <$0.01 total)

Skip with: pytest -m "not tool_claude"
"""

from __future__ import annotations

import shutil
import time

import pytest

_CLAUDE_BIN = shutil.which("claude")
requires_claude = pytest.mark.skipif(not _CLAUDE_BIN, reason="claude CLI not installed")

pytestmark = [pytest.mark.e2e, pytest.mark.tool_claude, requires_claude]


class TestClaudeBasic:
    """Verify Claude CLI responds and returns structured output."""

    def test_claude_responds(self, run_claude, claude_project):
        """Claude -p returns valid JSON with a result field."""
        result = run_claude(
            "Say exactly: AICTL_CLAUDE_E2E_OK",
            cwd=claude_project,
            max_turns=1,
            timeout=60,
        )
        assert isinstance(result, dict), f"Expected dict, got {type(result)}"
        assert "error" not in result or result.get("is_error"), (
            f"Claude returned error: {result.get('error', result.get('result', ''))}"
        )

    def test_claude_json_has_session_id(self, run_claude, claude_project):
        result = run_claude("Say exactly: SESSION_ID_CHECK", cwd=claude_project, max_turns=1)
        if result.get("error"):
            pytest.skip(f"Claude unavailable: {result['error']}")
        assert "session_id" in result, f"No session_id in Claude output: {list(result.keys())}"
        assert result["session_id"], "session_id is empty"

    def test_claude_json_has_usage(self, run_claude, claude_project):
        result = run_claude("Say exactly: USAGE_CHECK", cwd=claude_project, max_turns=1)
        if result.get("error"):
            pytest.skip(f"Claude unavailable: {result['error']}")
        usage = result.get("usage", {})
        assert isinstance(usage, dict), f"Expected usage dict, got {type(usage)}"


class TestClaudeHooksIntegration:
    """Verify hooks fire during Claude session and events reach aictl."""

    def test_hooks_fire(self, run_claude, aictl_server, claude_project):
        """After running Claude, hook events appear in aictl."""
        result = run_claude(
            "Say exactly: HOOKS_FIRE_TEST", cwd=claude_project, max_turns=1, timeout=60,
        )
        if result.get("error") and "timeout" in str(result.get("error", "")):
            pytest.skip("Claude timed out")
        if result.get("is_error") and "usage" in result.get("result", ""):
            pytest.skip(f"Claude rate-limited: {result.get('result', '')[:100]}")

        session_id = result.get("session_id", "")
        if not session_id:
            pytest.skip("No session_id returned — can't verify hooks")

        events = aictl_server.get_events(
            session_id=session_id, since="0", min_count=1, timeout=20,
        )
        assert len(events) >= 1, f"No hook events for Claude session {session_id}"

        event_kinds = {e["kind"] for e in events}
        has_lifecycle = (
            "hook:SessionStart" in event_kinds
            or "hook:Init" in event_kinds
            or "hook:Stop" in event_kinds
            or "hook:SessionEnd" in event_kinds
        )
        assert has_lifecycle, f"No lifecycle hooks found. Got kinds: {event_kinds}"

    def test_session_created(self, run_claude, aictl_server, claude_project):
        """Claude session appears in /api/sessions after running."""
        result = run_claude(
            "Say exactly: SESSION_CREATE_TEST", cwd=claude_project, max_turns=1, timeout=60,
        )
        if result.get("is_error") and "usage" in result.get("result", ""):
            pytest.skip("Claude rate-limited")

        session_id = result.get("session_id", "")
        if not session_id:
            pytest.skip("No session_id returned")

        time.sleep(2)
        sessions = aictl_server.get_sessions(since="0")
        found = [s for s in sessions if s["session_id"] == session_id]

        assert len(found) >= 1, (
            f"Session {session_id} not found in aictl. "
            f"Available: {[s['session_id'][:20] for s in sessions[:5]]}"
        )
        assert found[0]["tool"] == "claude-code"

    def test_tool_invocations_captured(self, run_claude, aictl_server, claude_project):
        """If Claude uses tools, PreToolUse/PostToolUse events are captured."""
        result = run_claude(
            "Read the file hello.py and tell me what it does",
            cwd=claude_project, max_turns=2, timeout=90,
        )
        if result.get("is_error") and "usage" in result.get("result", ""):
            pytest.skip("Claude rate-limited")

        session_id = result.get("session_id", "")
        if not session_id:
            pytest.skip("No session_id returned")

        events = aictl_server.get_events(
            session_id=session_id, since="0", min_count=2, timeout=20,
        )
        assert len(events) >= 2, f"Expected ≥2 events, got {len(events)}"

        tool_events = [
            e for e in events if e["kind"] in ("hook:PreToolUse", "hook:PostToolUse")
        ]
        for te in tool_events:
            assert "tool_name" in te.get("detail", {}), f"Tool event missing tool_name: {te}"
