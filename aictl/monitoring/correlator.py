# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Correlate collector events into tool-level live reports."""

from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass

from .config import MonitorConfig
from .estimator import estimate_mcp, estimate_tokens
from .events import ProcessInfo
from .process_classifier import classify_process
from .session import MCPState, SessionState, TokenEstimate, ToolReport, _derive_project
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
            self.pending_events.append({
                "ts": ts, "tool": session.tool, "kind": "file_modified",
                "detail": {"path": path, "growth_bytes": growth_bytes,
                           "session_id": session.session_id},
            })

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
            self.pending_events.append({
                "ts": now, "tool": session.tool, "kind": "session_end",
                "detail": {"session_id": sid,
                           "project": session.project,
                           "duration_s": round(session.last_seen_at - session.started_at, 1),
                           "pids": len(session.pids),
                           "input_tokens": session.exact_input_tokens,
                           "output_tokens": session.exact_output_tokens},
            })
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
            self.pending_events.append({
                "ts": ts, "tool": match.tool, "kind": "session_start",
                "detail": {"pid": process.pid, "name": process.name,
                           "session_id": session_id},
            })

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
