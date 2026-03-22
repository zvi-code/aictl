# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Entity state reconstruction from hook event sequences.

Processes hook events (SessionStart, SubagentStart, TaskCreated, etc.)
and maintains entity state machines for sessions, agents, teams, and
context windows.  The reconstructed state is exposed via the dashboard
API so the frontend can render entity-first views.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field


# ── State constants ──────────────────────────────────────────────

SESSION_STATES = ("inactive", "active", "compacting", "ending")
AGENT_STATES = ("not_spawned", "active", "idle", "ended")
CONTEXT_STATES = ("empty", "base_loaded", "filling", "compacting")


# ── Entity dataclasses ──────────────────────────────────────────

@dataclass
class AgentState:
    """State of a single agent (subagent/teammate)."""
    agent_id: str
    session_id: str
    state: str = "active"
    task: str = ""
    started_at: float = 0.0
    ended_at: float | None = None
    parent_agent_id: str = ""  # stub: populated when Claude Code emits parent_conversation_id
    relationship: str = ""  # primary, sequential, parallel, sidechain
    # Deduced metrics (enriched from subagent JSONL when available)
    input_tokens: int = 0
    output_tokens: int = 0
    tool_calls: int = 0
    messages: int = 0
    model: str = ""

    def to_dict(self) -> dict:
        duration = ((self.ended_at or 0) - self.started_at) if self.started_at else 0
        return {
            "agent_id": self.agent_id,
            "session_id": self.session_id,
            "state": self.state,
            "task": self.task,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "parent_agent_id": self.parent_agent_id,
            "relationship": self.relationship,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "tool_calls": self.tool_calls,
            "messages": self.messages,
            "model": self.model,
            "duration_s": round(duration, 1) if duration > 0 else 0,
        }


@dataclass
class TaskState:
    """State of a task within a session/agent."""
    task_id: str
    session_id: str
    agent_id: str = ""
    name: str = ""
    state: str = "pending"  # pending, active, done
    created_at: float = 0.0
    completed_at: float | None = None

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "session_id": self.session_id,
            "agent_id": self.agent_id,
            "name": self.name,
            "state": self.state,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
        }


@dataclass
class SessionEntityState:
    """Reconstructed entity state for a session from hook events."""
    session_id: str
    state: str = "active"
    tool: str = "claude-code"
    cwd: str = ""
    started_at: float = 0.0
    ended_at: float | None = None
    agents: dict[str, AgentState] = field(default_factory=dict)
    tasks: dict[str, TaskState] = field(default_factory=dict)
    context_state: str = "empty"
    compaction_count: int = 0
    instructions_loaded: bool = False
    last_event_at: float = 0.0
    rate_limits: dict[str, dict] = field(default_factory=dict)
    # rate_limits: {"5h": {"used_pct": 42.5, "resets_at": "..."}, "7d": {...}}

    # ── Deduced metrics ──────────────────────────────────────────
    tool_calls: int = 0
    tool_call_breakdown: dict[str, int] = field(default_factory=dict)
    skill_calls: int = 0
    skill_call_breakdown: dict[str, int] = field(default_factory=dict)
    prompt_count: int = 0

    def to_dict(self) -> dict:
        duration = (self.ended_at or self.last_event_at) - self.started_at if self.started_at else 0
        return {
            "session_id": self.session_id,
            "state": self.state,
            "tool": self.tool,
            "cwd": self.cwd,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "agents": [a.to_dict() for a in self.agents.values()],
            "tasks": [t.to_dict() for t in self.tasks.values()],
            "context_state": self.context_state,
            "compaction_count": self.compaction_count,
            "instructions_loaded": self.instructions_loaded,
            "last_event_at": self.last_event_at,
            "rate_limits": self.rate_limits,
            # Deduced metrics
            "tool_calls": self.tool_calls,
            "tool_call_breakdown": self.tool_call_breakdown,
            "skill_calls": self.skill_calls,
            "skill_call_breakdown": self.skill_call_breakdown,
            "prompt_count": self.prompt_count,
            "tool_call_rate": round(self.tool_calls / max(duration / 60, 1), 2) if duration > 0 else 0,
        }


# ── State tracker ───────────────────────────────────────────────

class EntityStateTracker:
    """Processes hook events and maintains entity state machines.

    Usage::

        tracker = EntityStateTracker()
        tracker.process_event(event_dict)
        state = tracker.get_session_state("session-123")
        all_states = tracker.all_sessions()
    """

    def __init__(self) -> None:
        self.sessions: dict[str, SessionEntityState] = {}
        self._gc_interval = 3600  # GC sessions older than 1h
        self._last_gc = time.time()

    def process_event(self, event: dict) -> None:
        """Process a single hook event and update state machines."""
        kind = event.get("kind", "")
        detail = event.get("detail", {})
        ts = event.get("ts", time.time())
        tool = event.get("tool", "claude-code")

        # Strip "hook:" prefix if present
        if kind.startswith("hook:"):
            kind = kind[5:]

        session_id = detail.get("session_id", "")
        if not session_id:
            return

        session = self._ensure_session(session_id, tool, ts)
        session.last_event_at = ts
        if detail.get("cwd"):
            session.cwd = detail["cwd"]

        # Extract rate_limits if present in any event's detail
        if detail.get("rate_limits"):
            session.rate_limits = detail["rate_limits"]

        # Dispatch by event type
        handler = self._handlers.get(kind)
        if handler:
            handler(self, session, detail, ts)

    def get_session_state(self, session_id: str) -> SessionEntityState | None:
        """Return reconstructed state for a session."""
        return self.sessions.get(session_id)

    def all_sessions(self) -> list[dict]:
        """Return all tracked sessions as serializable dicts."""
        self._gc()
        return [s.to_dict() for s in self.sessions.values()]

    def _ensure_session(self, session_id: str, tool: str, ts: float) -> SessionEntityState:
        if session_id not in self.sessions:
            self.sessions[session_id] = SessionEntityState(
                session_id=session_id,
                tool=tool,
                started_at=ts,
            )
        return self.sessions[session_id]

    def enrich_from_agent_teams(self, agent_teams: list[dict]) -> None:
        """Enrich agent states with parsed JSONL data from scan_agent_teams().

        Matches agents by agent_id and populates token usage, tool call
        count, message count, model, and duration from the authoritative
        JSONL source.
        """
        # Build agent_id → parsed-agent lookup across all team entries
        jsonl_agents: dict[str, dict] = {}
        for team in agent_teams:
            for a in team.get("agents", []):
                aid = a.get("agent_id", "")
                if aid:
                    jsonl_agents[aid] = a

        for session in self.sessions.values():
            for agent in session.agents.values():
                parsed = jsonl_agents.get(agent.agent_id)
                if not parsed:
                    continue
                agent.input_tokens = parsed.get("input_tokens", 0)
                agent.output_tokens = parsed.get("output_tokens", 0)
                agent.tool_calls = parsed.get("tool_use_count", len(parsed.get("tools_used", [])))
                agent.messages = parsed.get("messages", 0)
                agent.model = parsed.get("model", "")
                if not agent.task and parsed.get("task"):
                    agent.task = parsed["task"]

    def _gc(self) -> None:
        """Remove sessions that ended more than _gc_interval ago."""
        now = time.time()
        if now - self._last_gc < 60:
            return
        self._last_gc = now
        cutoff = now - self._gc_interval
        stale = [sid for sid, s in self.sessions.items()
                 if s.ended_at and s.ended_at < cutoff]
        for sid in stale:
            del self.sessions[sid]

    # ── Event handlers ──────────────────────────────────────────

    def _on_session_start(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        session.state = "active"
        session.started_at = ts
        session.context_state = "base_loaded"

    def _on_session_end(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        session.state = "inactive"
        session.ended_at = ts

    def _on_subagent_start(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        agent_id = detail.get("agent_id") or detail.get("subagent_id") or f"agent-{len(session.agents)}"
        # Future-proof: capture parent_conversation_id when Claude Code adds it
        parent_id = detail.get("parent_conversation_id", "")
        session.agents[agent_id] = AgentState(
            agent_id=agent_id,
            session_id=session.session_id,
            state="active",
            started_at=ts,
            parent_agent_id=parent_id,
        )

    def _on_subagent_stop(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        agent_id = detail.get("agent_id") or detail.get("subagent_id") or ""
        if agent_id in session.agents:
            session.agents[agent_id].state = "ended"
            session.agents[agent_id].ended_at = ts

    def _on_task_created(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        task_id = detail.get("task_id") or f"task-{len(session.tasks)}"
        session.tasks[task_id] = TaskState(
            task_id=task_id,
            session_id=session.session_id,
            agent_id=detail.get("agent_id", ""),
            name=detail.get("name", detail.get("description", "")),
            state="active",
            created_at=ts,
        )

    def _on_task_completed(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        task_id = detail.get("task_id", "")
        if task_id in session.tasks:
            session.tasks[task_id].state = "done"
            session.tasks[task_id].completed_at = ts

    def _on_pre_compact(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        session.state = "compacting"
        session.context_state = "compacting"

    def _on_post_compact(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        session.state = "active"
        session.context_state = "filling"
        session.compaction_count += 1

    def _on_instructions_loaded(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        session.instructions_loaded = True
        if session.context_state == "empty":
            session.context_state = "base_loaded"

    def _on_pre_tool_use(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        session.context_state = "filling"

    def _on_user_prompt_submit(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        session.context_state = "filling"
        session.prompt_count += 1

    def _on_notification(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        pass  # Notification events (stop reasons, etc.)

    def _on_post_tool_use(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        tool_name = detail.get("tool_name", "") or detail.get("name", "")
        if not tool_name:
            return
        session.tool_calls += 1
        session.tool_call_breakdown[tool_name] = session.tool_call_breakdown.get(tool_name, 0) + 1
        # Skill tool invocations track separately
        if tool_name == "Skill":
            skill_name = detail.get("skill_name", "") or detail.get("input", {}).get("skill", "unknown")
            session.skill_calls += 1
            session.skill_call_breakdown[skill_name] = session.skill_call_breakdown.get(skill_name, 0) + 1

    _handlers: dict[str, object] = {
        "SessionStart": _on_session_start,
        "SessionEnd": _on_session_end,
        "SubagentStart": _on_subagent_start,
        "SubagentStop": _on_subagent_stop,
        "TaskCreated": _on_task_created,
        "TaskCompleted": _on_task_completed,
        "PreCompact": _on_pre_compact,
        "PostCompact": _on_post_compact,
        "InstructionsLoaded": _on_instructions_loaded,
        "PreToolUse": _on_pre_tool_use,
        "PostToolUse": _on_post_tool_use,
        "UserPromptSubmit": _on_user_prompt_submit,
        "Notification": _on_notification,
        "Stop": _on_notification,
    }
