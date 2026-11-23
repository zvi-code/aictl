# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The agent-team scan (``monitoring.tool_telemetry.scan_agent_teams``) feeds the live view only.

It used to write session and agent rows: the session named by the folder the subagent
files are in (a resumed session's copied ``subagents/`` folder named the wrong session),
the session's folder taken from a subagent's working folder (another worktree), and the
first user message as the agent's task. The transcript reader stores sessions and agents
from the evidence in each line, so the scan writes nothing.
"""

from __future__ import annotations

import time

from aictl.dashboard.models import DashboardSnapshot
from aictl.orchestrator import SnapshotPersistence
from aictl.stores.testing import MemoryWriter

SESSION_UUID = "fb1fced0-59a8-4c9e-b6cf-1e6b1f4d9a01"


def _team():
    agent = {
        "agent_id": "a1", "session_id": SESSION_UUID, "model": "claude-opus-4-8", "task": "prompt text",
        "started_at": "2025-03-26T14:40:00+00:00", "ended_at": "", "is_sidechain": True, "completed": True,
        "input_tokens": 100, "output_tokens": 50, "cache_read_tokens": 0, "cache_creation_tokens": 0,
        "turns": [], "cwd": "/work/repo/.claude/worktrees/agent-a1",
    }
    return {"session_id": SESSION_UUID, "agent_count": 1, "total_input_tokens": 100,
            "total_output_tokens": 50, "agents": [agent]}


def test_the_team_scan_writes_no_sessions_agents_or_requests():
    writer = MemoryWriter()
    snap = DashboardSnapshot(timestamp=time.time(), root="/", tools=[], agent_teams=[_team()])
    SnapshotPersistence(None, writer).persist(snap, [])

    assert not {"sessions", "agents", "agents_text", "requests"} & {name for _, name, _ in writer.operations}
