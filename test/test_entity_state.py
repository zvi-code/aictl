"""Tests for entity state reconstruction from hook events."""

from __future__ import annotations

import time

from aictl.monitoring.entity_state import EntityStateTracker


def test_session_lifecycle():
    """SessionStart → active, SessionEnd → inactive."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-1", "cwd": "/tmp/proj"},
    })

    state = tracker.get_session_state("sess-1")
    assert state is not None
    assert state.state == "active"
    assert state.cwd == "/tmp/proj"

    tracker.process_event({
        "ts": ts + 60, "tool": "claude-code", "kind": "hook:SessionEnd",
        "detail": {"session_id": "sess-1"},
    })

    state = tracker.get_session_state("sess-1")
    assert state.state == "inactive"
    assert state.ended_at == ts + 60


def test_subagent_tracking():
    """SubagentStart/Stop creates and ends agent state."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-2"},
    })
    tracker.process_event({
        "ts": ts + 1, "tool": "claude-code", "kind": "hook:SubagentStart",
        "detail": {"session_id": "sess-2", "agent_id": "agent-a"},
    })
    tracker.process_event({
        "ts": ts + 2, "tool": "claude-code", "kind": "hook:SubagentStart",
        "detail": {"session_id": "sess-2", "agent_id": "agent-b"},
    })

    state = tracker.get_session_state("sess-2")
    assert len(state.agents) == 2
    assert state.agents["agent-a"].state == "active"

    tracker.process_event({
        "ts": ts + 10, "tool": "claude-code", "kind": "hook:SubagentStop",
        "detail": {"session_id": "sess-2", "agent_id": "agent-a"},
    })

    assert state.agents["agent-a"].state == "ended"
    assert state.agents["agent-b"].state == "active"


def test_task_tracking():
    """TaskCreated/TaskCompleted tracks task state."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-3"},
    })
    tracker.process_event({
        "ts": ts + 1, "tool": "claude-code", "kind": "hook:TaskCreated",
        "detail": {"session_id": "sess-3", "task_id": "t1", "name": "fix auth"},
    })

    state = tracker.get_session_state("sess-3")
    assert len(state.tasks) == 1
    assert state.tasks["t1"].name == "fix auth"
    assert state.tasks["t1"].state == "active"

    tracker.process_event({
        "ts": ts + 30, "tool": "claude-code", "kind": "hook:TaskCompleted",
        "detail": {"session_id": "sess-3", "task_id": "t1"},
    })

    assert state.tasks["t1"].state == "done"
    assert state.tasks["t1"].completed_at == ts + 30


def test_compaction_tracking():
    """PreCompact/PostCompact updates context and compaction count."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-4"},
    })

    state = tracker.get_session_state("sess-4")
    assert state.compaction_count == 0

    tracker.process_event({
        "ts": ts + 100, "tool": "claude-code", "kind": "hook:PreCompact",
        "detail": {"session_id": "sess-4"},
    })
    assert state.context_state == "compacting"

    tracker.process_event({
        "ts": ts + 105, "tool": "claude-code", "kind": "hook:PostCompact",
        "detail": {"session_id": "sess-4"},
    })
    assert state.context_state == "filling"
    assert state.compaction_count == 1


def test_serialization():
    """all_sessions returns serializable dicts with agents and tasks."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-5", "cwd": "/proj"},
    })
    tracker.process_event({
        "ts": ts + 1, "tool": "claude-code", "kind": "hook:SubagentStart",
        "detail": {"session_id": "sess-5", "agent_id": "a1"},
    })
    tracker.process_event({
        "ts": ts + 2, "tool": "claude-code", "kind": "hook:TaskCreated",
        "detail": {"session_id": "sess-5", "task_id": "t1", "name": "research"},
    })

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

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-tc"},
    })
    tracker.process_event({
        "ts": ts + 1, "tool": "claude-code", "kind": "hook:PostToolUse",
        "detail": {"session_id": "sess-tc", "tool_name": "Read"},
    })
    tracker.process_event({
        "ts": ts + 2, "tool": "claude-code", "kind": "hook:PostToolUse",
        "detail": {"session_id": "sess-tc", "tool_name": "Edit"},
    })
    tracker.process_event({
        "ts": ts + 3, "tool": "claude-code", "kind": "hook:PostToolUse",
        "detail": {"session_id": "sess-tc", "tool_name": "Read"},
    })

    state = tracker.get_session_state("sess-tc")
    assert state.tool_calls == 3
    assert state.tool_call_breakdown == {"Read": 2, "Edit": 1}


def test_skill_call_counting():
    """PostToolUse with tool_name=Skill increments skill counters."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-sk"},
    })
    tracker.process_event({
        "ts": ts + 1, "tool": "claude-code", "kind": "hook:PostToolUse",
        "detail": {"session_id": "sess-sk", "tool_name": "Skill",
                   "input": {"skill": "commit"}},
    })
    tracker.process_event({
        "ts": ts + 2, "tool": "claude-code", "kind": "hook:PostToolUse",
        "detail": {"session_id": "sess-sk", "tool_name": "Skill",
                   "input": {"skill": "review-pr"}},
    })
    tracker.process_event({
        "ts": ts + 3, "tool": "claude-code", "kind": "hook:PostToolUse",
        "detail": {"session_id": "sess-sk", "tool_name": "Bash"},
    })

    state = tracker.get_session_state("sess-sk")
    assert state.tool_calls == 3
    assert state.skill_calls == 2
    assert state.skill_call_breakdown == {"commit": 1, "review-pr": 1}


def test_prompt_counting():
    """UserPromptSubmit increments prompt counter."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-pr"},
    })
    for i in range(5):
        tracker.process_event({
            "ts": ts + i + 1, "tool": "claude-code",
            "kind": "hook:UserPromptSubmit",
            "detail": {"session_id": "sess-pr"},
        })

    state = tracker.get_session_state("sess-pr")
    assert state.prompt_count == 5


def test_deduced_metrics_in_serialization():
    """Deduced metrics appear in to_dict() output."""
    tracker = EntityStateTracker()
    ts = time.time()

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-dm"},
    })
    tracker.process_event({
        "ts": ts + 60, "tool": "claude-code", "kind": "hook:PostToolUse",
        "detail": {"session_id": "sess-dm", "tool_name": "Read"},
    })
    tracker.process_event({
        "ts": ts + 120, "tool": "claude-code", "kind": "hook:UserPromptSubmit",
        "detail": {"session_id": "sess-dm"},
    })

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

    tracker.process_event({
        "ts": ts, "tool": "claude-code", "kind": "hook:SessionStart",
        "detail": {"session_id": "sess-en"},
    })
    tracker.process_event({
        "ts": ts + 1, "tool": "claude-code", "kind": "hook:SubagentStart",
        "detail": {"session_id": "sess-en", "agent_id": "agent-x"},
    })

    # Simulate JSONL-parsed agent data
    agent_teams = [{
        "session_id": "sess-en",
        "agents": [{
            "agent_id": "agent-x",
            "input_tokens": 5000,
            "output_tokens": 2000,
            "tool_use_count": 15,
            "tools_used": ["Read", "Edit", "Bash"],
            "messages": 30,
            "model": "claude-sonnet-4-6",
            "task": "refactor auth module",
        }],
    }]

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
