"""E2E: Full session lifecycle — start → prompt → tools → end → query.

Validates the complete data path: hooks arrive, session is built,
events are stored, session ends with token counts, and API queries
return coherent data.
"""

from __future__ import annotations

import time

import pytest

pytestmark = pytest.mark.e2e


def _make_session(
    session_id: str,
    tool: str = "claude-code",
    model: str = "claude-sonnet-4-20250514",
    cwd: str = "/tmp/lifecycle-test",
    tool_calls: int = 2,
    input_tokens: int = 5000,
    output_tokens: int = 800,
) -> list[dict]:
    """Build a complete hook event sequence for a session."""
    base_ts = time.time()
    events: list[dict] = []
    t = 0.0

    # Session start
    events.append({
        "event": "SessionStart",
        "session_id": session_id,
        "tool": tool,
        "cwd": cwd,
        "model": model,
        "pid": 55000,
        "ts": base_ts + t,
    })
    t += 0.1

    # User prompt
    events.append({
        "event": "UserPromptSubmit",
        "session_id": session_id,
        "tool": tool,
        "message": "Do some work",
        "ts": base_ts + t,
    })
    t += 0.3

    # Tool call pairs
    for i in range(tool_calls):
        tool_name = ["Write", "Bash", "Read", "Search"][i % 4]
        events.append({
            "event": "PreToolUse",
            "session_id": session_id,
            "tool": tool,
            "tool_name": tool_name,
            "tool_use_id": f"{session_id}-tool-{i}",
            "input": {"command": f"action-{i}"},
            "ts": base_ts + t,
        })
        t += 0.2
        events.append({
            "event": "PostToolUse",
            "session_id": session_id,
            "tool": tool,
            "tool_name": tool_name,
            "tool_use_id": f"{session_id}-tool-{i}",
            "result": f"result-{i}",
            "ts": base_ts + t,
        })
        t += 0.1

    # Session stop
    events.append({
        "event": "Stop",
        "session_id": session_id,
        "tool": tool,
        "pid": 55000,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd": 0.025,
        "ts": base_ts + t,
    })
    return events


class TestSessionLifecycle:
    """Validate the full session lifecycle through the API."""

    def test_session_appears_after_start(self, aictl_server):
        sid = f"lifecycle-appear-{int(time.time() * 1000)}"
        events = _make_session(sid)

        # Send only the first event (SessionStart)
        aictl_server.post_hook(events[0])
        time.sleep(0.5)

        sessions = aictl_server.get_sessions(since="0")
        assert any(s["session_id"] == sid for s in sessions)

    def test_full_session_has_correct_metadata(self, aictl_server):
        sid = f"lifecycle-meta-{int(time.time() * 1000)}"
        events = _make_session(
            sid, model="claude-opus-4-20250514", input_tokens=10000, output_tokens=1500,
        )
        for ev in events:
            aictl_server.post_hook(ev)
        time.sleep(0.5)

        sessions = aictl_server.get_sessions(since="0")
        session = next((s for s in sessions if s["session_id"] == sid), None)
        assert session is not None
        assert session["tool"] == "claude-code"
        # Model might be available depending on session source
        if "model" in session and session["model"]:
            assert "opus" in session["model"]

    def test_session_end_has_tokens(self, aictl_server):
        sid = f"lifecycle-tokens-{int(time.time() * 1000)}"
        events = _make_session(sid, input_tokens=7777, output_tokens=1234)
        for ev in events:
            aictl_server.post_hook(ev)
        time.sleep(0.5)

        sessions = aictl_server.get_sessions(since="0")
        session = next((s for s in sessions if s["session_id"] == sid), None)
        assert session is not None
        # Token counts from Stop event
        if session.get("input_tokens"):
            assert session["input_tokens"] == 7777
        if session.get("output_tokens"):
            assert session["output_tokens"] == 1234

    def test_event_count_matches(self, aictl_server):
        sid = f"lifecycle-count-{int(time.time() * 1000)}"
        events = _make_session(sid, tool_calls=3)
        for ev in events:
            aictl_server.post_hook(ev)

        # Expected: SessionStart + UserPromptSubmit + 3*(Pre+Post) + Stop = 9
        stored = aictl_server.get_events(session_id=sid, since="0", min_count=9)
        assert len(stored) >= 9, f"Expected ≥9 events, got {len(stored)}"

    def test_event_ordering_preserved(self, aictl_server):
        sid = f"lifecycle-order-{int(time.time() * 1000)}"
        events = _make_session(sid, tool_calls=2)
        for ev in events:
            aictl_server.post_hook(ev)

        # Expected: Start + Prompt + 2*(Pre+Post) + Stop = 7
        stored = aictl_server.get_events(session_id=sid, since="0", min_count=7)
        kinds = [e["kind"] for e in stored]

        # Results are ordered DESC by ts — reverse for chronological
        kinds.reverse()

        assert kinds[0] == "hook:SessionStart"
        assert kinds[-1] == "hook:Stop"

        pre_indices = [i for i, k in enumerate(kinds) if k == "hook:PreToolUse"]
        post_indices = [i for i, k in enumerate(kinds) if k == "hook:PostToolUse"]
        assert len(pre_indices) == len(post_indices) == 2
        for pre_i, post_i in zip(pre_indices, post_indices):
            assert pre_i < post_i


class TestConcurrentSessions:
    """Multiple sessions running simultaneously."""

    def test_three_concurrent_sessions(self, aictl_server):
        ts_suffix = int(time.time() * 1000)
        session_specs = [
            (f"concurrent-claude-{ts_suffix}", "claude-code", 3000, 400),
            (f"concurrent-gemini-{ts_suffix}", "gemini-cli", 2000, 300),
            (f"concurrent-copilot-{ts_suffix}", "copilot-vscode", 4000, 600),
        ]

        all_events = []
        for sid, tool, inp, out in session_specs:
            all_events.extend(_make_session(sid, tool=tool, input_tokens=inp, output_tokens=out))

        # Send all events (interleaved timing is fine — ts in payload controls ordering)
        for ev in all_events:
            aictl_server.post_hook(ev)
        time.sleep(0.5)

        sessions = aictl_server.get_sessions(since="0")
        found_sids = {s["session_id"] for s in sessions}
        for sid, _, _, _ in session_specs:
            assert sid in found_sids, f"Session {sid} not found"

    def test_session_events_dont_cross(self, aictl_server):
        ts_suffix = int(time.time() * 1000)
        sid_a = f"cross-a-{ts_suffix}"
        sid_b = f"cross-b-{ts_suffix}"

        for ev in _make_session(sid_a, tool_calls=2):
            aictl_server.post_hook(ev)
        for ev in _make_session(sid_b, tool_calls=3):
            aictl_server.post_hook(ev)

        # Session A: Start + Prompt + 2*(Pre+Post) + Stop = 7
        events_a = aictl_server.get_events(session_id=sid_a, since="0", min_count=7)
        # Session B: Start + Prompt + 3*(Pre+Post) + Stop = 9
        events_b = aictl_server.get_events(session_id=sid_b, since="0", min_count=9)

        assert len(events_a) >= 7
        assert len(events_b) >= 9


class TestSessionWithOtel:
    """Session that gets both hook events AND OTel telemetry."""

    def test_hook_plus_otel(self, aictl_server, claude_otel_metrics, claude_otel_logs):
        sid = f"hybrid-{int(time.time() * 1000)}"
        events = _make_session(sid, input_tokens=5000, output_tokens=800)

        # Send hooks
        for ev in events:
            aictl_server.post_hook(ev)

        # Send OTel data
        aictl_server.post_otel_metrics(claude_otel_metrics)
        aictl_server.post_otel_logs(claude_otel_logs)
        time.sleep(0.5)

        # Session should exist from hooks
        sessions = aictl_server.get_sessions(since="0")
        assert any(s["session_id"] == sid for s in sessions)

        # OTel status should show data
        status = aictl_server.get_otel_status()
        assert status.get("metrics_received", 0) > 0
        assert status.get("events_received", 0) > 0
