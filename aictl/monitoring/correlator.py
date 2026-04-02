# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Correlate collector events into tool-level live reports."""

from __future__ import annotations

import time
from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import asdict, dataclass, field

from .config import MonitorConfig
from .collectors.process import classify_process
from .session import (MCPState, ProcessInfo, SessionState, TokenEstimate, ToolReport,
                      _derive_project, estimate_mcp, estimate_tokens)
from ..data.schema import metric_name as M


@dataclass(frozen=True, slots=True)
class MonitorSnapshot:
    """Serializable point-in-time monitoring snapshot."""

    generated_at: float
    platform: str
    diagnostics: dict[str, dict[str, object]]
    tools: list[dict[str, object]]
    workspace_paths: list[str]
    state_paths: list[str]
    events: list[dict] = ()  # type: ignore[assignment]  # structural events from correlator
    sessions: list[dict] = ()  # type: ignore[assignment]  # individual session data


class SessionCorrelator:
    """Builds live tool sessions from process, network, file, and telemetry events.

    Emits structured events (session_start, session_end, anomaly, etc.)
    into ``self.pending_events`` for consumption by the dashboard layer.
    """

    def __init__(self, config: MonitorConfig, workspace_sizes: dict[str, int] | None = None,
                 sink=None) -> None:
        self.config = config
        self.workspace_sizes = workspace_sizes or {}
        self.sink = sink  # SampleSink for derived metric emission
        self.sessions: dict[str, SessionState] = {}
        self.pid_to_session: dict[int, str] = {}
        self.pid_to_process: dict[int, ProcessInfo] = {}
        self.pid_parent: dict[int, int | None] = {}
        self.pid_cpu: dict[int, float] = {}   # latest CPU per PID
        self.pid_mem: dict[int, float] = {}   # latest mem MB per PID
        self.collector_status: dict[str, dict[str, object]] = {}
        # Pending events for the dashboard/storage layer to drain
        self.pending_events: list[dict] = []

    # ── Public API ────────────────────────────────────────────────

    def _emit_event(self, ts: float, tool: str, kind: str, detail: dict) -> None:
        """Append a structured event to the pending queue."""
        self.pending_events.append({"ts": ts, "tool": tool, "kind": kind, "detail": detail})

    def on_collector_status(self, source: str, status: str, mode: str, detail: str) -> None:
        self.collector_status[source] = {"status": status, "mode": mode, "detail": detail}

    def on_process(self, process: ProcessInfo, cpu_percent: float,
                   memory_rss: int, child_count: int, ts: float | None = None,
                   is_new: bool = False) -> None:
        ts = ts or time.time()
        self.pid_cpu[process.pid] = cpu_percent
        self.pid_mem[process.pid] = memory_rss / 1048576 if memory_rss else 0
        self._handle_process_event_typed(process, cpu_percent, ts, is_new)

    def on_process_exit(self, pid: int, ts: float | None = None) -> None:
        ts = ts or time.time()
        session_id = self.pid_to_session.pop(pid, None)
        self.pid_parent.pop(pid, None)
        self.pid_to_process.pop(pid, None)
        self.pid_cpu.pop(pid, None)
        self.pid_mem.pop(pid, None)
        if session_id and session_id in self.sessions:
            self.sessions[session_id].pids.discard(pid)
            self.sessions[session_id].last_seen_at = max(
                self.sessions[session_id].last_seen_at, ts)

    def on_network(self, pid: int, bytes_in: int, bytes_out: int,
                   process: ProcessInfo | None = None,
                   tool_hint: str | None = None,
                   workspace: str | None = None,
                   ts: float | None = None) -> str | None:
        """Attribute network bytes to a session. Returns session_id or None."""
        ts = ts or time.time()
        session = self._resolve_session_typed(pid, process, tool_hint, workspace, ts)
        if session:
            session.add_network(ts, bytes_in, bytes_out)
            return session.session_id
        return None

    def on_file(self, path: str, growth_bytes: int = 0,
                event_type: str = "modified",
                pid: int | None = None, process: ProcessInfo | None = None,
                tool_hint: str | None = None, workspace: str | None = None,
                ts: float | None = None,
                sent_to_llm: str | None = None) -> None:
        ts = ts or time.time()
        session = self._resolve_session_typed(pid, process, tool_hint, workspace, ts)
        if session is None:
            return
        session.add_file_activity(
            ts, path, workspace,
            self.config.state_root_for_path(path), growth_bytes)
        if sent_to_llm and sent_to_llm.lower() in ("yes", "conditional", "partial"):
            session.files_loaded.add(path)
        if growth_bytes != 0 or event_type in ("created", "modified"):
            self._emit_event(ts, session.tool, "file_modified",
                             {"path": path, "growth_bytes": growth_bytes,
                              "session_id": session.session_id})

    def on_telemetry(self, input_tokens: int, output_tokens: int,
                     tool_hint: str | None = None, pid: int | None = None,
                     process: ProcessInfo | None = None,
                     workspace: str | None = None,
                     ts: float | None = None) -> None:
        ts = ts or time.time()
        session = self._resolve_session_typed(
            pid, process, tool_hint, workspace, ts, allow_ephemeral=True)
        if session:
            session.add_telemetry(ts, input_tokens, output_tokens)


    def tool_reports(self) -> list[ToolReport]:
        """Aggregate current sessions into tool-level reports."""

        cutoff = time.time() - 180
        # GC: remove stale sessions (>300s) to prevent unbounded growth
        gc_cutoff = time.time() - 300
        now = time.time()
        stale_ids = [sid for sid, s in self.sessions.items() if s.last_seen_at < gc_cutoff]
        for sid in stale_ids:
            session = self.sessions.pop(sid)
            self._emit_event(now, session.tool, "session_end",
                             {"session_id": sid,
                              "project": session.project,
                              "duration_s": round(session.last_seen_at - session.started_at, 1),
                              "pids": len(session.pids),
                              "input_tokens": session.exact_input_tokens,
                              "output_tokens": session.exact_output_tokens})
            for pid in session.pids:
                self.pid_to_session.pop(pid, None)

        grouped: dict[str, list[SessionState]] = defaultdict(list)
        for session in self.sessions.values():
            if session.last_seen_at >= cutoff:
                grouped[session.tool].append(session)

        reports = [self._build_tool_report(tool, sessions) for tool, sessions in grouped.items()]
        reports.sort(
            key=lambda report: (
                report.outbound_bytes + report.inbound_bytes,
                report.cpu_percent,
                report.file_events,
                report.last_seen_at,
            ),
            reverse=True,
        )
        # Emit derived metrics through sink (OTel units: ratio 0-1, bytes)
        # Display path (ToolReport) uses 0-100% and MB for human readability.
        if self.sink:
            for r in reports:
                tags = {"aictl.tool": r.tool}
                # Continuously varying — use sensitivity-aware emission
                self.sink.emit_with_sensitivity(
                    M("aictl.tool.cpu"), r.cpu_percent / 100, tags,
                    abs_threshold=0.10, max_threshold=0.05, rounding=3)
                self.sink.emit_with_sensitivity(
                    M("aictl.tool.memory"),
                    round(float(r.peak_cpu_percent * 1048576) / 65536) * 65536,
                    tags, abs_threshold=1_048_576, max_threshold=10_485_760, rounding=0)
                self.sink.emit_with_sensitivity(
                    M("aictl.tool.network.io"), r.inbound_rate_bps,
                    {**tags, "network.io.direction": "receive"},
                    abs_threshold=1024, max_threshold=512, rounding=0)
                self.sink.emit_with_sensitivity(
                    M("aictl.tool.network.io"), r.outbound_rate_bps,
                    {**tags, "network.io.direction": "transmit"},
                    abs_threshold=1024, max_threshold=512, rounding=0)
                # Change infrequently — skip if unchanged
                self.sink.emit_if_changed(M("aictl.tool.sessions"), float(r.session_count), tags)
                self.sink.emit_if_changed(M("aictl.tool.pids"), float(r.pid_count), tags)
                self.sink.emit_if_changed(M("aictl.tool.token.usage"), float(r.token_estimate.input_tokens),
                               {**tags, "gen_ai.token.type": "input"})
                self.sink.emit_if_changed(M("aictl.tool.token.usage"), float(r.token_estimate.output_tokens),
                               {**tags, "gen_ai.token.type": "output"})
                self.sink.emit_if_changed(M("aictl.tool.token.confidence"), r.token_estimate.confidence, tags)
                self.sink.emit_if_changed(M("aictl.tool.mcp.score"), r.mcp.confidence, tags)
        return reports

    def active_sessions(self) -> list[dict]:
        """Return active sessions as serializable dicts with process trees."""
        cutoff = time.time() - 180
        results = []
        for session in self.sessions.values():
            if session.last_seen_at >= cutoff:
                d = session.to_dict()
                d["process_tree"] = self._build_process_tree(session)
                results.append(d)
        return results

    def _build_process_tree(self, session: SessionState) -> list[dict]:
        """Build a hierarchical process tree for a session's PIDs.

        Each node includes role classification:
        - lead: the root PID that started the session
        - teammate: a same-tool process directly spawned by the lead
        - subagent: a same-tool process spawned by another agent
        - subprocess: a non-tool process (git, npm, etc.)
        """
        nodes: dict[int, dict] = {}
        for pid in session.pids:
            info = self.pid_to_process.get(pid)
            if not info:
                continue
            nodes[pid] = {
                "pid": pid,
                "ppid": info.ppid,
                "name": info.name,
                "exe": info.exe or "",
                "cwd": info.cwd or "",
                "cpu_pct": round(self.pid_cpu.get(pid, 0), 1),
                "mem_mb": round(self.pid_mem.get(pid, 0), 1),
                "role": self._classify_process_role(pid, info, session),
                "children": [],
            }

        # Link children to parents within the session
        roots: list[dict] = []
        for pid, node in nodes.items():
            ppid = node["ppid"]
            if ppid in nodes:
                nodes[ppid]["children"].append(node)
            else:
                roots.append(node)
        return roots

    def _classify_process_role(self, pid: int, info: ProcessInfo,
                               session: SessionState) -> str:
        """Classify a process's role within a session."""
        if pid == session.root_pid:
            return "lead"
        match = classify_process(info)
        if match.tool == session.tool:
            # Same tool — teammate or subagent depending on depth
            if info.ppid == session.root_pid:
                return "teammate"
            # Check if parent is also a same-tool process (subagent)
            parent = self.pid_to_process.get(info.ppid)
            if parent and classify_process(parent).tool == session.tool:
                return "subagent"
            return "teammate"
        return "subprocess"

    def drain_events(self) -> list[dict]:
        """Return and clear all pending events."""
        events = self.pending_events
        self.pending_events = []
        return events

    def diagnostics(self) -> dict[str, dict[str, object]]:
        """Collector health/status map."""

        return dict(sorted(self.collector_status.items()))

    # ── Internal typed handlers ────────────────────────────────────

    def _handle_process_event_typed(self, process: ProcessInfo, cpu_percent: float,
                                     ts: float, is_new: bool) -> None:
        self.pid_to_process[process.pid] = process
        self.pid_parent[process.pid] = process.ppid

        session = self._resolve_session_for_process(process, ts)
        if session is None:
            return

        session.pids.add(process.pid)
        if process.cwd:
            workspace = self.config.workspace_for_path(process.cwd)
            if workspace:
                session.workspaces.add(workspace)

        session.add_cpu(ts, cpu_percent)
        if is_new:
            session.add_subprocess(ts, process.name)

    def _resolve_session_typed(
        self,
        pid: int | None,
        process: ProcessInfo | None,
        tool_hint: str | None,
        workspace: str | None,
        ts: float,
        *,
        allow_ephemeral: bool = False,
    ) -> SessionState | None:
        if pid is not None and pid in self.pid_to_session:
            return self.sessions[self.pid_to_session[pid]]

        if process is not None:
            session = self._resolve_session_for_process(process, ts)
            if session is not None:
                return session

        if tool_hint:
            return self._session_for_tool(tool_hint, ts, allow_ephemeral=allow_ephemeral)

        if workspace:
            candidates = [s for s in self.sessions.values() if workspace in s.workspaces]
            if candidates:
                return max(candidates, key=lambda s: s.last_seen_at)

        return None

    def _resolve_session_for_process(self, process: ProcessInfo, ts: float) -> SessionState | None:
        if process.pid in self.pid_to_session:
            return self.sessions[self.pid_to_session[process.pid]]

        match = classify_process(process)

        # When classification fails (e.g. nettop provides only short name
        # like "node"), retry with the richer ProcessInfo from the process
        # collector which has the full cmdline.
        if match.tool is None and process.pid in self.pid_to_process:
            rich = self.pid_to_process[process.pid]
            if rich is not process:
                match = classify_process(rich)

        # Use the stored ppid when the caller didn't provide one (network
        # collector creates ProcessInfo with ppid=None).
        ppid = process.ppid
        if ppid is None:
            ppid = self.pid_parent.get(process.pid)
        parent_session = self._find_parent_session(ppid)

        if match.tool is None and parent_session is not None:
            self.pid_to_session[process.pid] = parent_session.session_id
            return parent_session

        if match.tool is None:
            return None

        if parent_session is not None and parent_session.tool == match.tool:
            self.pid_to_session[process.pid] = parent_session.session_id
            return parent_session

        session_id = f"{match.tool}:{process.pid}:{int(ts)}"
        # Check for existing session for this tool:pid (may have different timestamp suffix)
        for sid, sess in self.sessions.items():
            if sess.tool == match.tool and sess.root_pid == process.pid:
                session_id = sid
                break
        session = self.sessions.get(session_id)
        if session is None:
            session = SessionState(
                session_id=session_id,
                tool=match.tool,
                root_pid=process.pid,
                started_at=ts,
                last_seen_at=ts,
                project=_derive_project(process.cwd),
            )
            self.sessions[session_id] = session
            self._emit_event(ts, match.tool, "session_start",
                             {"pid": process.pid, "name": process.name,
                              "session_id": session_id})

        self.pid_to_session[process.pid] = session_id
        return session

    def _find_parent_session(self, pid: int | None) -> SessionState | None:
        current = pid
        seen: set[int] = set()
        while current is not None and current not in seen:
            seen.add(current)
            session_id = self.pid_to_session.get(current)
            if session_id and session_id in self.sessions:
                return self.sessions[session_id]
            current = self.pid_parent.get(current)
        return None

    def _session_for_tool(
        self,
        tool: str,
        ts: float,
        *,
        allow_ephemeral: bool,
    ) -> SessionState | None:
        sessions = [session for session in self.sessions.values() if session.tool == tool]
        if sessions:
            return max(sessions, key=lambda session: session.last_seen_at)
        if not allow_ephemeral:
            return None
        session_id = f"{tool}:ephemeral"
        session = self.sessions.get(session_id)
        if session is None:
            session = SessionState(
                session_id=session_id,
                tool=tool,
                root_pid=None,
                started_at=ts,
                last_seen_at=ts,
            )
            self.sessions[session_id] = session
        return session

    def _build_tool_report(self, tool: str, sessions: Iterable[SessionState]) -> ToolReport:
        session_list = list(sessions)
        workspaces = sorted({workspace for session in session_list for workspace in session.workspaces})
        workspace_size_mb = sum(self.workspace_sizes.get(workspace, 0) for workspace in workspaces) / (1024 * 1024)
        inbound_rate_bps = sum(_recent_rate(session.recent_network, 1) for session in session_list)
        outbound_rate_bps = sum(_recent_rate(session.recent_network, 2) for session in session_list)
        token_estimate = _combine_token_estimates(estimate_tokens(session) for session in session_list)
        mcp = _combine_mcp_states(estimate_mcp(session) for session in session_list)

        inbound_bytes = sum(session.inbound_bytes for session in session_list)
        outbound_bytes = sum(session.outbound_bytes for session in session_list)
        files_touched = len({path for session in session_list for path in session.files_touched})
        file_events = sum(session.file_events for session in session_list)
        state_bytes_written = sum(session.state_bytes_written for session in session_list)
        cpu_percent = sum(session.cpu_percent for session in session_list)
        peak_cpu_percent = max((session.peak_cpu_percent for session in session_list), default=0.0)
        pids = {pid for session in session_list for pid in session.pids}
        confidence = min(1.0, token_estimate.confidence * 0.65 + mcp.confidence * 0.35)

        # Collect per-PID details with parent info for tree rendering
        proc_details = []
        for pid in sorted(pids):
            proc_info = self.pid_to_process.get(pid)
            if proc_info:
                proc_details.append({
                    "pid": pid,
                    "ppid": proc_info.ppid,
                    "name": proc_info.name,
                    "exe": proc_info.exe or "",
                    "cwd": proc_info.cwd or "",
                    "cpu_pct": round(self.pid_cpu.get(pid, 0), 1),
                    "mem_mb": round(self.pid_mem.get(pid, 0), 1),
                })

        return ToolReport(
            tool=tool,
            label=session_list[0].label,
            session_count=len(session_list),
            pid_count=len(pids),
            workspaces=workspaces,
            workspace_size_mb=workspace_size_mb,
            files_touched=files_touched,
            file_events=file_events,
            state_bytes_written=state_bytes_written,
            cpu_percent=cpu_percent,
            peak_cpu_percent=peak_cpu_percent,
            inbound_bytes=inbound_bytes,
            outbound_bytes=outbound_bytes,
            inbound_rate_bps=inbound_rate_bps,
            outbound_rate_bps=outbound_rate_bps,
            token_estimate=token_estimate,
            mcp=mcp,
            confidence=confidence,
            sources=sorted({token_estimate.source}),
            last_seen_at=max(session.last_seen_at for session in session_list),
            processes=proc_details,
        )


def _combine_token_estimates(estimates: Iterable[TokenEstimate]) -> TokenEstimate:
    estimate_list = list(estimates)
    if not estimate_list:
        return TokenEstimate(input_tokens=0, output_tokens=0, confidence=0.0, source="network-inference")
    sources = {estimate.source for estimate in estimate_list}
    source = "telemetry" if "telemetry" in sources else "session-files" if "session-files" in sources else "network-inference"
    return TokenEstimate(
        input_tokens=sum(estimate.input_tokens for estimate in estimate_list),
        output_tokens=sum(estimate.output_tokens for estimate in estimate_list),
        confidence=max(estimate.confidence for estimate in estimate_list),
        source=source,
    )


def _combine_mcp_states(states: Iterable[MCPState]) -> MCPState:
    state_list = list(states)
    if not state_list:
        return MCPState(detected=False, confidence=0.0, loops=0)
    return MCPState(
        detected=any(state.detected for state in state_list),
        confidence=min(1.0, sum(state.confidence for state in state_list)),
        loops=sum(state.loops for state in state_list),
    )


def _recent_rate(samples: Iterable[tuple[float, int, int]], index: int) -> float:
    sample_list = list(samples)
    if len(sample_list) < 2:
        return 0.0
    window = sample_list[-6:]
    duration = max(window[-1][0] - window[0][0], 1.0)
    total = sum(sample[index] for sample in window)
    return total / duration


# ── Entity state reconstruction ─────────────────────────────────────────────
# Processes hook events (SessionStart, SubagentStart, TaskCreated, etc.)
# and maintains entity state machines for sessions, agents, teams, and
# context windows.  The reconstructed state is exposed via the dashboard
# API so the frontend can render entity-first views.

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
        return {**asdict(self), "duration_s": round(duration, 1) if duration > 0 else 0}


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
        return asdict(self)


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
    tool_call_breakdown: Counter = field(default_factory=Counter)
    skill_calls: int = 0
    skill_call_breakdown: Counter = field(default_factory=Counter)
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
        session.tool_call_breakdown[tool_name] += 1
        # Skill tool invocations track separately
        if tool_name == "Skill":
            skill_name = detail.get("skill_name", "") or detail.get("input", {}).get("skill", "unknown")
            session.skill_calls += 1
            session.skill_call_breakdown[skill_name] += 1

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
