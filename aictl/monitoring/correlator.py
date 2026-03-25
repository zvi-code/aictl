"""Correlate collector events into tool-level live reports."""

from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass

from .config import MonitorConfig
from .estimator import estimate_mcp, estimate_tokens
from .events import EventKind, ProcessInfo, UnifiedEvent
from .process_classifier import classify_process
from .session import MCPState, SessionState, TokenEstimate, ToolReport


@dataclass(frozen=True, slots=True)
class MonitorSnapshot:
    """Serializable point-in-time monitoring snapshot."""

    generated_at: float
    platform: str
    diagnostics: dict[str, dict[str, object]]
    tools: list[dict[str, object]]
    workspace_paths: list[str]
    state_paths: list[str]


class SessionCorrelator:
    """Builds live tool sessions from process, network, file, and telemetry events."""

    def __init__(self, config: MonitorConfig, workspace_sizes: dict[str, int] | None = None) -> None:
        self.config = config
        self.workspace_sizes = workspace_sizes or {}
        self.sessions: dict[str, SessionState] = {}
        self.pid_to_session: dict[int, str] = {}
        self.pid_to_process: dict[int, ProcessInfo] = {}
        self.pid_parent: dict[int, int | None] = {}
        self.collector_status: dict[str, dict[str, object]] = {}

    def ingest(self, event: UnifiedEvent) -> None:
        """Accept one event from any collector."""

        if event.kind == EventKind.COLLECTOR_STATUS:
            self.collector_status[event.source] = {
                "status": str(event.metrics.get("status", "unknown")),
                "mode": str(event.metrics.get("mode", "unknown")),
                "detail": str(event.metrics.get("detail", "")),
            }
            return

        if event.kind in (EventKind.PROCESS_START, EventKind.PROCESS_SAMPLE):
            self._handle_process_event(event)
            return

        if event.kind == EventKind.PROCESS_EXIT:
            self._handle_exit_event(event)
            return

        if event.kind == EventKind.NETWORK_SAMPLE:
            self._handle_network_event(event)
            return

        if event.kind == EventKind.FILE_ACTIVITY:
            self._handle_file_event(event)
            return

        if event.kind == EventKind.TELEMETRY:
            self._handle_telemetry_event(event)

    def tool_reports(self) -> list[ToolReport]:
        """Aggregate current sessions into tool-level reports."""

        cutoff = time.time() - 180
        # GC: remove stale sessions (>300s) to prevent unbounded growth
        gc_cutoff = time.time() - 300
        stale_ids = [sid for sid, s in self.sessions.items() if s.last_seen_at < gc_cutoff]
        for sid in stale_ids:
            session = self.sessions.pop(sid)
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
        return reports

    def diagnostics(self) -> dict[str, dict[str, object]]:
        """Collector health/status map."""

        return dict(sorted(self.collector_status.items()))

    def _handle_process_event(self, event: UnifiedEvent) -> None:
        if event.process is None:
            return

        process = event.process
        self.pid_to_process[process.pid] = process
        self.pid_parent[process.pid] = process.ppid

        session = self._resolve_session_for_process(process, event.ts)
        if session is None:
            return

        session.pids.add(process.pid)
        if process.cwd:
            workspace = self.config.workspace_for_path(process.cwd)
            if workspace:
                session.workspaces.add(workspace)

        session.add_cpu(event.ts, float(event.metrics.get("cpu_percent", 0.0)))
        if event.kind == EventKind.PROCESS_START:
            session.add_subprocess(event.ts, process.name)

    def _handle_exit_event(self, event: UnifiedEvent) -> None:
        if event.pid is None:
            return
        session_id = self.pid_to_session.pop(event.pid, None)
        self.pid_parent.pop(event.pid, None)
        self.pid_to_process.pop(event.pid, None)
        if session_id and session_id in self.sessions:
            self.sessions[session_id].pids.discard(event.pid)
            self.sessions[session_id].last_seen_at = max(self.sessions[session_id].last_seen_at, event.ts)

    def _handle_network_event(self, event: UnifiedEvent) -> None:
        session = self._resolve_session_for_event(event)
        if session is None:
            return
        session.add_network(
            event.ts,
            int(event.metrics.get("bytes_in", 0)),
            int(event.metrics.get("bytes_out", 0)),
        )

    def _handle_file_event(self, event: UnifiedEvent) -> None:
        session = self._resolve_session_for_event(event)
        if session is None:
            return
        path = str(event.payload.get("path", ""))
        session.add_file_activity(
            event.ts,
            path,
            event.workspace,
            self.config.state_root_for_path(path),
            int(event.metrics.get("growth_bytes", 0)),
        )

    def _handle_telemetry_event(self, event: UnifiedEvent) -> None:
        session = self._resolve_session_for_event(event, allow_ephemeral=True)
        if session is None:
            return
        session.add_telemetry(
            event.ts,
            int(event.metrics.get("input_tokens", 0)),
            int(event.metrics.get("output_tokens", 0)),
        )

    def _resolve_session_for_event(
        self,
        event: UnifiedEvent,
        *,
        allow_ephemeral: bool = False,
    ) -> SessionState | None:
        if event.pid is not None and event.pid in self.pid_to_session:
            return self.sessions[self.pid_to_session[event.pid]]

        if event.process is not None:
            session = self._resolve_session_for_process(event.process, event.ts)
            if session is not None:
                return session

        if event.tool_hint:
            return self._session_for_tool(event.tool_hint, event.ts, allow_ephemeral=allow_ephemeral)

        if event.workspace:
            candidates = [session for session in self.sessions.values() if event.workspace in session.workspaces]
            if candidates:
                return max(candidates, key=lambda session: session.last_seen_at)

        return None

    def _resolve_session_for_process(self, process: ProcessInfo, ts: float) -> SessionState | None:
        if process.pid in self.pid_to_session:
            return self.sessions[self.pid_to_session[process.pid]]

        match = classify_process(process)
        parent_session = self._find_parent_session(process.ppid)

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
            )
            self.sessions[session_id] = session

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
        cpu_percent = sum(session.cpu_percent for session in session_list)
        peak_cpu_percent = max((session.peak_cpu_percent for session in session_list), default=0.0)
        pids = {pid for session in session_list for pid in session.pids}
        confidence = min(1.0, token_estimate.confidence * 0.65 + mcp.confidence * 0.35)

        return ToolReport(
            tool=tool,
            label=session_list[0].label,
            session_count=len(session_list),
            pid_count=len(pids),
            workspaces=workspaces,
            workspace_size_mb=workspace_size_mb,
            files_touched=files_touched,
            file_events=file_events,
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
