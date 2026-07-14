"""Tests for entity state reconstruction from hook events."""

from __future__ import annotations

import time

from aictl.monitoring.correlator import EntityStateTracker


def test_session_lifecycle():
    """SessionStart → active, SessionEnd → inactive."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-1", "cwd": "/tmp/proj"},
        }
    )

    state = tracker.get_session_state("sess-1")
    assert state is not None
    assert state.state == "active"
    assert state.cwd == "/tmp/proj"

    tracker.process_event(
        {
            "ts": ts + 60,
            "tool": "claude-code",
            "kind": "hook:SessionEnd",
            "detail": {"session_id": "sess-1"},
        }
    )

    state = tracker.get_session_state("sess-1")
    assert state.state == "inactive"
    assert state.ended_at == ts + 60


def test_stop_marks_session_idle_not_ended():
    """Claude Code fires Stop after EVERY agent response — it must mark the
    session idle, not end it (SessionEnd is the terminal event).

    Regression: Stop used to set state="inactive" + ended_at, splitting one
    logical session into a new dashboard row per prompt/response turn.
    """
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-stop"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 5,
            "tool": "claude-code",
            "kind": "hook:Stop",
            "detail": {"session_id": "sess-stop"},
        }
    )

    state = tracker.get_session_state("sess-stop")
    assert state.state == "idle"
    assert state.ended_at is None
    assert state.last_stop_at == ts + 5


def test_stop_then_prompt_reactivates_session():
    """Stop → UserPromptSubmit is a normal turn boundary: the session
    returns to active with ended_at unset and counters preserved."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-turns"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 1,
            "tool": "claude-code",
            "kind": "hook:UserPromptSubmit",
            "detail": {"session_id": "sess-turns", "prompt": "first"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 2,
            "tool": "claude-code",
            "kind": "hook:PostToolUse",
            "detail": {"session_id": "sess-turns", "tool_name": "Read"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 10,
            "tool": "claude-code",
            "kind": "hook:Stop",
            "detail": {"session_id": "sess-turns"},
        }
    )

    state = tracker.get_session_state("sess-turns")
    assert state.state == "idle"

    # Next turn: prompt reactivates the same session object
    tracker.process_event(
        {
            "ts": ts + 60,
            "tool": "claude-code",
            "kind": "hook:UserPromptSubmit",
            "detail": {"session_id": "sess-turns", "prompt": "second"},
        }
    )

    state = tracker.get_session_state("sess-turns")
    assert state.state == "active"
    assert state.ended_at is None
    assert state.prompt_count == 2  # counters preserved across the turn
    assert state.tool_calls == 1
    assert state.started_at == ts  # still the same session, not a new one


def test_pre_tool_use_reactivates_idle_session():
    """Tool activity after a Stop proves the session is still running."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-ptu"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 5,
            "tool": "claude-code",
            "kind": "hook:Stop",
            "detail": {"session_id": "sess-ptu"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 20,
            "tool": "claude-code",
            "kind": "hook:PreToolUse",
            "detail": {"session_id": "sess-ptu", "tool_name": "Bash"},
        }
    )

    state = tracker.get_session_state("sess-ptu")
    assert state.state == "active"
    assert state.ended_at is None


def test_session_end_still_terminal_after_stops():
    """SessionEnd remains the terminal lifecycle event, even after Stops."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-final"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 5,
            "tool": "claude-code",
            "kind": "hook:Stop",
            "detail": {"session_id": "sess-final"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 30,
            "tool": "claude-code",
            "kind": "hook:SessionEnd",
            "detail": {"session_id": "sess-final"},
        }
    )

    state = tracker.get_session_state("sess-final")
    assert state.state == "inactive"
    assert state.ended_at == ts + 30


def test_gc_keeps_idle_sessions_and_reclaims_stale_ones():
    """A session that only saw Stop (no SessionEnd) must survive the
    ended-session GC window, but abandoned sessions (no events at all for
    _stale_interval) are still reclaimed so memory cannot grow forever."""
    tracker = EntityStateTracker()
    now = time.time()

    # Idle session: last Stop 2h ago, no SessionEnd — must survive
    tracker.process_event(
        {
            "ts": now - 7200,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-idle"},
        }
    )
    tracker.process_event(
        {
            "ts": now - 7200 + 10,
            "tool": "claude-code",
            "kind": "hook:Stop",
            "detail": {"session_id": "sess-idle"},
        }
    )
    # Ended session: SessionEnd 2h ago — must be reclaimed (gc window 1h)
    tracker.process_event(
        {
            "ts": now - 7300,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-ended"},
        }
    )
    tracker.process_event(
        {
            "ts": now - 7200,
            "tool": "claude-code",
            "kind": "hook:SessionEnd",
            "detail": {"session_id": "sess-ended"},
        }
    )
    # Abandoned session: silent for >24h, never ended — must be reclaimed
    tracker.process_event(
        {
            "ts": now - 100000,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-abandoned"},
        }
    )

    tracker._last_gc = 0  # force the GC to run
    ids = {s["session_id"] for s in tracker.all_sessions()}
    assert "sess-idle" in ids, "idle (Stop-only) session must not be GC'd"
    assert "sess-ended" not in ids, "SessionEnd'd session past the window must be GC'd"
    assert "sess-abandoned" not in ids, "abandoned session must be reclaimed after _stale_interval"


def test_subagent_tracking():
    """SubagentStart/Stop creates and ends agent state."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-2"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 1,
            "tool": "claude-code",
            "kind": "hook:SubagentStart",
            "detail": {"session_id": "sess-2", "agent_id": "agent-a"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 2,
            "tool": "claude-code",
            "kind": "hook:SubagentStart",
            "detail": {"session_id": "sess-2", "agent_id": "agent-b"},
        }
    )

    state = tracker.get_session_state("sess-2")
    assert len(state.agents) == 2
    assert state.agents["agent-a"].state == "active"

    tracker.process_event(
        {
            "ts": ts + 10,
            "tool": "claude-code",
            "kind": "hook:SubagentStop",
            "detail": {"session_id": "sess-2", "agent_id": "agent-a"},
        }
    )

    assert state.agents["agent-a"].state == "ended"
    assert state.agents["agent-b"].state == "active"


def test_task_tracking():
    """TaskCreated/TaskCompleted tracks task state."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-3"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 1,
            "tool": "claude-code",
            "kind": "hook:TaskCreated",
            "detail": {"session_id": "sess-3", "task_id": "t1", "name": "fix auth"},
        }
    )

    state = tracker.get_session_state("sess-3")
    assert len(state.tasks) == 1
    assert state.tasks["t1"].name == "fix auth"
    assert state.tasks["t1"].state == "active"

    tracker.process_event(
        {
            "ts": ts + 30,
            "tool": "claude-code",
            "kind": "hook:TaskCompleted",
            "detail": {"session_id": "sess-3", "task_id": "t1"},
        }
    )

    assert state.tasks["t1"].state == "done"
    assert state.tasks["t1"].completed_at == ts + 30


def test_compaction_tracking():
    """PreCompact/PostCompact updates context and compaction count."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-4"},
        }
    )

    state = tracker.get_session_state("sess-4")
    assert state.compaction_count == 0

    tracker.process_event(
        {
            "ts": ts + 100,
            "tool": "claude-code",
            "kind": "hook:PreCompact",
            "detail": {"session_id": "sess-4"},
        }
    )
    assert state.context_state == "compacting"

    tracker.process_event(
        {
            "ts": ts + 105,
            "tool": "claude-code",
            "kind": "hook:PostCompact",
            "detail": {"session_id": "sess-4"},
        }
    )
    assert state.context_state == "filling"
    assert state.compaction_count == 1


def test_serialization():
    """all_sessions returns serializable dicts with agents and tasks."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-5", "cwd": "/proj"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 1,
            "tool": "claude-code",
            "kind": "hook:SubagentStart",
            "detail": {"session_id": "sess-5", "agent_id": "a1"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 2,
            "tool": "claude-code",
            "kind": "hook:TaskCreated",
            "detail": {"session_id": "sess-5", "task_id": "t1", "name": "research"},
        }
    )

    sessions = tracker.all_sessions()
    assert len(sessions) == 1
    s = sessions[0]
    assert s["session_id"] == "sess-5"
    assert s["state"] == "active"
    assert len(s["agents"]) == 1
    assert len(s["tasks"]) == 1
    assert s["agents"][0]["agent_id"] == "a1"
    assert s["tasks"][0]["name"] == "research"


def test_tool_call_counting():
    """PostToolUse increments tool call counters."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-tc"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 1,
            "tool": "claude-code",
            "kind": "hook:PostToolUse",
            "detail": {"session_id": "sess-tc", "tool_name": "Read"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 2,
            "tool": "claude-code",
            "kind": "hook:PostToolUse",
            "detail": {"session_id": "sess-tc", "tool_name": "Edit"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 3,
            "tool": "claude-code",
            "kind": "hook:PostToolUse",
            "detail": {"session_id": "sess-tc", "tool_name": "Read"},
        }
    )

    state = tracker.get_session_state("sess-tc")
    assert state.tool_calls == 3
    assert state.tool_call_breakdown == {"Read": 2, "Edit": 1}


def test_skill_call_counting():
    """PostToolUse with tool_name=Skill increments skill counters."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-sk"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 1,
            "tool": "claude-code",
            "kind": "hook:PostToolUse",
            "detail": {"session_id": "sess-sk", "tool_name": "Skill", "input": {"skill": "commit"}},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 2,
            "tool": "claude-code",
            "kind": "hook:PostToolUse",
            "detail": {"session_id": "sess-sk", "tool_name": "Skill", "tool_input": {"skill": "review-pr"}},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 3,
            "tool": "claude-code",
            "kind": "hook:PostToolUse",
            "detail": {"session_id": "sess-sk", "tool_name": "Bash"},
        }
    )

    state = tracker.get_session_state("sess-sk")
    assert state.tool_calls == 3
    assert state.skill_calls == 2
    assert state.skill_call_breakdown == {"commit": 1, "review-pr": 1}


def test_prompt_counting():
    """UserPromptSubmit increments prompt counter."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-pr"},
        }
    )
    for i in range(5):
        tracker.process_event(
            {
                "ts": ts + i + 1,
                "tool": "claude-code",
                "kind": "hook:UserPromptSubmit",
                "detail": {"session_id": "sess-pr"},
            }
        )

    state = tracker.get_session_state("sess-pr")
    assert state.prompt_count == 5


def test_deduced_metrics_in_serialization():
    """Deduced metrics appear in to_dict() output."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-dm"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 60,
            "tool": "claude-code",
            "kind": "hook:PostToolUse",
            "detail": {"session_id": "sess-dm", "tool_name": "Read"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 120,
            "tool": "claude-code",
            "kind": "hook:UserPromptSubmit",
            "detail": {"session_id": "sess-dm"},
        }
    )

    sessions = tracker.all_sessions()
    s = sessions[0]
    assert s["tool_calls"] == 1
    assert s["prompt_count"] == 1
    assert "tool_call_rate" in s
    assert s["tool_call_breakdown"] == {"Read": 1}


def test_enrich_from_agent_teams():
    """enrich_from_agent_teams populates agent token/tool metrics."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event(
        {
            "ts": ts,
            "tool": "claude-code",
            "kind": "hook:SessionStart",
            "detail": {"session_id": "sess-en"},
        }
    )
    tracker.process_event(
        {
            "ts": ts + 1,
            "tool": "claude-code",
            "kind": "hook:SubagentStart",
            "detail": {"session_id": "sess-en", "agent_id": "agent-x"},
        }
    )

    # Simulate JSONL-parsed agent data
    agent_teams = [
        {
            "session_id": "sess-en",
            "agents": [
                {
                    "agent_id": "agent-x",
                    "input_tokens": 5000,
                    "output_tokens": 2000,
                    "tool_use_count": 15,
                    "tools_used": ["Read", "Edit", "Bash"],
                    "messages": 30,
                    "model": "claude-sonnet-4-6",
                    "task": "refactor auth module",
                }
            ],
        }
    ]

    tracker.enrich_from_agent_teams(agent_teams)

    agent = tracker.get_session_state("sess-en").agents["agent-x"]
    assert agent.input_tokens == 5000
    assert agent.output_tokens == 2000
    assert agent.tool_calls == 15
    assert agent.messages == 30
    assert agent.model == "claude-sonnet-4-6"
    assert agent.task == "refactor auth module"

    # Verify serialization includes agent metrics
    d = agent.to_dict()
    assert d["input_tokens"] == 5000
    assert d["duration_s"] == 0  # no ended_at yet
