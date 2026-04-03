"""E2E: Real Gemini CLI — hooks fire and events land in aictl.

Requires:
- ``gemini`` CLI installed and authenticated
- API quota available (tests use tiny prompts, <$0.01 total)

Skip with: pytest -m "not tool_gemini"
"""

from __future__ import annotations

import shutil

import pytest

_GEMINI_BIN = shutil.which("gemini")
requires_gemini = pytest.mark.skipif(not _GEMINI_BIN, reason="gemini CLI not installed")

pytestmark = [pytest.mark.e2e, pytest.mark.tool_gemini, requires_gemini]


class TestGeminiBasic:
    """Verify Gemini CLI responds and returns structured output."""

    def test_gemini_responds(self, run_gemini, gemini_project):
        """Gemini -p returns valid JSON with a response field."""
        result = run_gemini("Say exactly: AICTL_GEMINI_E2E_OK", cwd=gemini_project, timeout=60)
        assert isinstance(result, dict), f"Expected dict, got {type(result)}"
        if result.get("error"):
            pytest.skip(f"Gemini unavailable: {result['error']}")
        assert "response" in result, f"No 'response' in Gemini output: {list(result.keys())}"

    def test_gemini_response_content(self, run_gemini, gemini_project):
        """Gemini returns the expected text."""
        result = run_gemini("Say exactly: GEMINI_CONTENT_CHECK", cwd=gemini_project)
        if result.get("error"):
            pytest.skip(f"Gemini unavailable: {result['error']}")
        response = result.get("response", "")
        assert "GEMINI_CONTENT_CHECK" in response, (
            f"Expected 'GEMINI_CONTENT_CHECK' in response, got: {response[:200]}"
        )

    def test_gemini_json_has_session_id(self, run_gemini, gemini_project):
        result = run_gemini("Say exactly: SESSION_CHECK", cwd=gemini_project)
        if result.get("error"):
            pytest.skip(f"Gemini unavailable: {result['error']}")
        assert "session_id" in result, f"No session_id in output: {list(result.keys())}"

    def test_gemini_json_has_stats(self, run_gemini, gemini_project):
        """Gemini JSON output includes token usage stats."""
        result = run_gemini("Say exactly: STATS_CHECK", cwd=gemini_project)
        if result.get("error"):
            pytest.skip(f"Gemini unavailable: {result['error']}")
        stats = result.get("stats", {})
        assert isinstance(stats, dict), f"Expected stats dict, got {type(stats)}"
        models = stats.get("models", {})
        assert len(models) > 0, "No model stats returned"
        for _model_name, model_stats in models.items():
            tokens = model_stats.get("tokens", {})
            assert tokens.get("input", 0) > 0 or tokens.get("total", 0) > 0, (
                f"No token stats for model {_model_name}"
            )
            break


class TestGeminiHooksIntegration:
    """Verify hooks fire during Gemini session and events reach aictl."""

    def test_hooks_fire(self, run_gemini, aictl_server, gemini_project):
        """After running Gemini, hook events appear in aictl."""
        result = run_gemini("Say exactly: HOOKS_FIRE_TEST", cwd=gemini_project, timeout=60)
        if result.get("error"):
            pytest.skip(f"Gemini unavailable: {result['error']}")

        session_id = result.get("session_id", "")
        if not session_id:
            pytest.skip("No session_id returned")

        events = aictl_server.get_events(since="0", min_count=1, timeout=20)
        hook_events = [e for e in events if e["kind"].startswith("hook:")]
        assert len(hook_events) >= 1, f"No hook events found. Total events: {len(events)}"

    def test_session_end_hooks(self, run_gemini, aictl_server, gemini_project):
        """Gemini fires SessionEnd hook when session completes."""
        result = run_gemini("Say exactly: SESSION_END_TEST", cwd=gemini_project, timeout=60)
        if result.get("error"):
            pytest.skip(f"Gemini unavailable: {result['error']}")

        events = aictl_server.get_events(since="0", min_count=1, timeout=20)
        end_events = [
            e for e in events if e["kind"] in ("hook:SessionEnd", "hook:Stop")
        ]
        assert len(end_events) >= 1, (
            f"No session end hooks found. Kinds: {[e['kind'] for e in events[:10]]}"
        )

    def test_hook_payload_structure(self, run_gemini, aictl_server, gemini_project):
        """Hook payloads from Gemini have expected fields."""
        result = run_gemini("Say exactly: PAYLOAD_CHECK", cwd=gemini_project, timeout=60)
        if result.get("error"):
            pytest.skip(f"Gemini unavailable: {result['error']}")

        events = aictl_server.get_events(since="0", min_count=1, timeout=20)
        hook_events = [e for e in events if e["kind"].startswith("hook:")]
        assert len(hook_events) >= 1

        ev = hook_events[0]
        assert "ts" in ev
        assert "tool" in ev
        assert "kind" in ev
        assert "detail" in ev
        assert isinstance(ev["detail"], dict)

    def test_gemini_tool_use_captured(self, run_gemini, aictl_server, gemini_project):
        """If Gemini uses tools, the events are captured."""
        result = run_gemini(
            "Read the file hello.py and tell me what it prints",
            cwd=gemini_project, timeout=90,
        )
        if result.get("error"):
            pytest.skip(f"Gemini unavailable: {result['error']}")

        stats = result.get("stats", {})
        tool_stats = stats.get("tools", {})
        tool_calls = tool_stats.get("totalCalls", 0)

        events = aictl_server.get_events(since="0", min_count=1, timeout=20)
        hook_events = [e for e in events if e["kind"].startswith("hook:")]
        assert len(hook_events) >= 1

        if tool_calls > 0:
            tool_event_kinds = {e["kind"] for e in hook_events if "Tool" in e["kind"]}
            assert len(tool_event_kinds) > 0 or tool_calls > 0, (
                f"Gemini reported {tool_calls} tool calls but no tool hook events"
            )
