# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Correlate collector events into tool-level live reports."""

from __future__ import annotations

import logging
import threading
import time
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable
from dataclasses import asdict, dataclass, field

from .. import tree_walk
from ..data.schema import metric_name as M
from ..platforms import path_key
from .collectors.process import classify_process
from .config import MonitorConfig
from .launch_flags import launch_flags
from .session import (
    MCPState,
    ProcessInfo,
    SessionState,
    TokenEstimate,
    ToolReport,
    _derive_project,
    estimate_mcp,
    estimate_tokens,
)

log = logging.getLogger(__name__)

LIVE_SESSION_S = 120.0  # a session without processes still owns repository changes this long after it was last seen
# A bound session whose process is alive says so this often, so that an idle end inferred
# from its transcript cannot close it while the process runs.
ALIVE_EVERY_S = 300.0
MAX_CWD_WORKSPACES = 4096
_UNATTRIBUTED_TOOL = "unknown"

def _launch(tool: str, process: ProcessInfo) -> dict:
    """The process that holds a session and its masked, allow-listed launch flags (``launch_flags``)."""
    return {"pid": process.pid, "started_at": process.created_at, "name": process.name,
            "flags": launch_flags(tool, process.cmdline)}


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

    def __init__(
        self,
        config: MonitorConfig,
        workspace_sizes: dict[str, int] | None = None,
        sink=None,
        native_binder: Callable[[ProcessInfo, str], dict | None] | None = None,
    ) -> None:
        self.config = config
        # (process, tool) -> the tool's own session for that process, from a file the tool writes.
        self.native_binder = native_binder
        # Monitor session id -> the binding of its root process to a native session.
        self.native: dict[str, dict] = {}
        self._alive_at: dict[str, float] = {}
        self._ended: set[str] = set()
        # Monitor session id -> the pid of the family member whose evidence gave the binding.
        self._binding_pid: dict[str, int] = {}
        self.workspace_sizes = workspace_sizes or {}
        self.sink = sink  # SampleSink for derived metric emission
        self.sessions: dict[str, SessionState] = {}
        self.pid_to_session: dict[int, str] = {}
        self.pid_to_process: dict[int, ProcessInfo] = {}
        self.pid_parent: dict[int, int | None] = {}
        self.pid_cpu: dict[int, float] = {}  # latest CPU per PID
        self.pid_mem: dict[int, float] = {}  # latest mem MB per PID
        self.collector_status: dict[str, dict[str, object]] = {}
        # Pending events for the dashboard/storage layer to drain
        self.pending_events: list[dict] = []
        self._runtime_observers: tuple[Callable[[str, dict], None], ...] = ()
        self._runtime_latest: dict[int, dict] = {}
        self._runtime_snapshot: dict | None = None
        self._runtime_lock = threading.RLock()
        self._cwd_workspaces: dict[str, str | None] = {}

    def observe_runtime(self, observer: Callable[[str, dict], None]) -> Callable[[], None]:
        """Observe current process/file notifications, not historical telemetry.

        Observers must only enqueue work: collectors must never wait for storage
        or a dashboard query. Registration also supplies the existing process
        cache, so attaching after collector startup does not lose live processes.
        """
        with self._runtime_lock:
            self._runtime_observers += (observer,)
            for data in self._runtime_latest.values():
                observer("process", data)
            if self._runtime_snapshot is not None:
                observer("process_snapshot", self._runtime_snapshot)

        def detach() -> None:
            with self._runtime_lock:
                self._runtime_observers = tuple(item for item in self._runtime_observers if item is not observer)

        return detach

    def _notify_runtime(self, kind: str, data: dict) -> None:
        with self._runtime_lock:
            if kind == "process":
                self._runtime_latest[data["process"].pid] = data
            elif kind == "process_exit":
                self._runtime_latest.pop(data["pid"], None)
            elif kind == "process_snapshot":
                self._runtime_snapshot = data
            for observer in self._runtime_observers:
                try:
                    observer(kind, data)
                except Exception:
                    log.exception("Runtime observer failed for %s", kind)

    # ── Public API ────────────────────────────────────────────────

    def _emit_event(self, ts: float, tool: str, kind: str, detail: dict) -> None:
        """Append a structured event to the pending queue."""
        self.pending_events.append({"ts": ts, "tool": tool, "kind": kind, "detail": detail})

    def on_collector_status(self, source: str, status: str, mode: str, detail: str) -> None:
        self.collector_status[source] = {"status": status, "mode": mode, "detail": detail}
        self._notify_runtime("collector_status", {"source": source, "status": status, "mode": mode})

    def on_process_snapshot(self, process_count: int, ts: float | None = None) -> None:
        """Mark completion of a process sample cycle, including a known-empty one."""
        self._notify_runtime("process_snapshot", {"process_count": process_count, "observed_at": ts or time.time()})

    def on_process(
        self,
        process: ProcessInfo,
        cpu_percent: float | None,
        memory_rss: int | None,
        child_count: int,
        ts: float | None = None,
        is_new: bool = False,
    ) -> None:
        """Record one process sample. ``cpu_percent`` is None when not yet measured."""
        ts = ts or time.time()
        previous = self.pid_to_process.get(process.pid)
        if (
            previous is not None
            and previous.created_at is not None
            and process.created_at is not None
            and previous.created_at != process.created_at
        ):
            self.on_process_exit(process.pid, ts)
        if cpu_percent is not None:
            self.pid_cpu[process.pid] = cpu_percent
        if memory_rss is not None:
            self.pid_mem[process.pid] = memory_rss / 1048576
        self._handle_process_event_typed(process, cpu_percent, ts, is_new)
        sid = self.pid_to_session.get(process.pid)
        session = self.sessions.get(sid) if sid else None
        binding = self.native.get(sid) if sid else None
        self._notify_runtime(
            "process",
            {
                "process": process,
                "cpu_percent": cpu_percent,
                "memory_rss": memory_rss,
                "session_id": sid,
                "tool": session.tool if session else None,
                "root_pid": session.root_pid if session else None,
                "native_session_id": binding["session_id"] if binding else None,
                "native_state": binding["state"] if binding else None,
                "native_status_at": binding["status_at"] if binding else None,
                "ts": ts,
            },
        )

    def on_process_exit(self, pid: int, ts: float | None = None) -> None:
        ts = ts or time.time()
        process = self.pid_to_process.get(pid)
        session_id = self.pid_to_session.pop(pid, None)
        self.pid_parent.pop(pid, None)
        self.pid_to_process.pop(pid, None)
        self.pid_cpu.pop(pid, None)
        self.pid_mem.pop(pid, None)
        if session_id and session_id in self.sessions:
            session = self.sessions[session_id]
            session.pids.discard(pid)
            session.cpu_percent = sum(self.pid_cpu.get(p, 0.0) for p in session.pids)
            session.last_seen_at = max(session.last_seen_at, ts)
            if process is not None and session_id not in self._ended and classify_process(process).tool == session.tool:
                # The agent ends when its last process of the tool exits, at the time that was seen.
                same_tool = [
                    p for p in session.pids
                    if (info := self.pid_to_process.get(p)) is not None and classify_process(info).tool == session.tool
                ]
                if not same_tool:
                    self._end_session(session, ts, "process_exit")
        self._notify_runtime("process_exit", {"pid": pid, "process": process, "session_id": session_id, "ts": ts})

    def on_network(
        self,
        pid: int,
        bytes_in: int,
        bytes_out: int,
        process: ProcessInfo | None = None,
        tool_hint: str | None = None,
        workspace: str | None = None,
        ts: float | None = None,
    ) -> str | None:
        """Attribute network bytes to a session. Returns session_id or None."""
        ts = ts or time.time()
        session = self._resolve_session_typed(pid, process, tool_hint, workspace, ts)
        if session:
            session.add_network(ts, bytes_in, bytes_out)
            return session.session_id
        return None

    def on_file(
        self,
        path: str,
        growth_bytes: int = 0,
        event_type: str = "modified",
        pid: int | None = None,
        process: ProcessInfo | None = None,
        tool_hint: str | None = None,
        ts: float | None = None,
        sent_to_llm: str | None = None,
    ) -> None:
        """A file that no tracked git repository holds, such as a file in a tool home. Repository files go to :meth:`on_repo_change`."""
        ts = ts or time.time()
        self._notify_runtime("file", {"path": path, "event_type": event_type, "ts": ts})
        session = self._resolve_session_typed(pid, process, tool_hint, None, ts)
        if session is None:
            return
        session.add_file_activity(ts, path, None, self.config.state_root_for_path(path), growth_bytes)
        if sent_to_llm and sent_to_llm.lower() in ("yes", "conditional", "partial"):
            session.files_loaded.add(path)
        if growth_bytes != 0 or event_type in ("created", "modified"):
            self._emit_event(
                ts,
                session.tool,
                "file_modified",
                {"path": path, "growth_bytes": growth_bytes, "session_id": session.session_id, "project_path": session.project},
            )

    def workspace_for_cwd(self, cwd: str) -> str | None:
        """The project of a working folder: the top of its git work tree; None outside git."""
        if cwd in self._cwd_workspaces:
            return self._cwd_workspaces[cwd]
        top = tree_walk.git_root(cwd)
        workspace = str(top) if top is not None else None
        if len(self._cwd_workspaces) >= MAX_CWD_WORKSPACES:
            self._cwd_workspaces.clear()
        self._cwd_workspaces[cwd] = workspace
        return workspace

    def session_workspaces(self) -> list[str]:
        """The projects of the sessions seen recently."""
        cutoff = time.time() - LIVE_SESSION_S
        return sorted({w for s in list(self.sessions.values()) if s.pids or s.last_seen_at >= cutoff for w in s.workspaces})

    def _session_for_repo(self, repo: str, tool_hint: str | None, ts: float) -> SessionState | None:
        """The one live session that works in *repo*; None when there is none or more than one."""
        key = path_key(repo)
        live = [
            s
            for s in self.sessions.values()
            if (s.pids or ts - s.last_seen_at <= LIVE_SESSION_S) and any(path_key(w) == key for w in s.workspaces)
        ]
        if tool_hint:
            same_tool = [s for s in live if s.tool == tool_hint]
            if same_tool:
                live = same_tool
        return live[0] if len(live) == 1 else None

    def on_repo_change(self, change) -> None:
        """A file in a git repository whose git status or content changed (a ``repo_changes.FileChange``)."""
        ts = change.ts
        self._notify_runtime("file", {"path": change.path, "event_type": change.change, "ts": ts})
        session = self._session_for_repo(change.repo, change.tool_hint, ts)
        if session is not None:
            session.add_file_activity(ts, change.path, change.repo, None, change.growth_bytes)
        detail = {
            "path": change.path,
            "project_path": change.repo,
            "change": change.change,
            "git_status": change.status,
            "tracked": change.tracked,
            "growth_bytes": change.growth_bytes,
            "size_bytes": change.size_bytes,
            "session_id": session.session_id if session else "",
        }
        if change.lines_added is not None:
            detail["lines_added"] = change.lines_added
        if change.lines_removed is not None:
            detail["lines_removed"] = change.lines_removed
        if change.renamed_from:
            detail["renamed_from"] = change.renamed_from
        tool = session.tool if session else (change.tool_hint or _UNATTRIBUTED_TOOL)
        self._emit_event(ts, tool, "file_modified", detail)

    def on_head_move(self, move) -> None:
        """A new line of a repository's HEAD reflog (a ``repo_changes.HeadMove``): a commit, checkout, reset ..."""
        session = self._session_for_repo(move.repo, None, move.ts)
        if session is not None:
            session.last_seen_at = max(session.last_seen_at, move.ts)
        self._emit_event(
            move.ts,
            session.tool if session else _UNATTRIBUTED_TOOL,
            "git_head",
            {
                "project_path": move.repo,
                "action": move.action,
                "message": move.message,
                "old": move.old,
                "new": move.new,
                "session_id": session.session_id if session else "",
            },
        )

    def on_telemetry(
        self,
        input_tokens: int,
        output_tokens: int,
        tool_hint: str | None = None,
        pid: int | None = None,
        process: ProcessInfo | None = None,
        workspace: str | None = None,
        ts: float | None = None,
    ) -> None:
        ts = ts or time.time()
        session = self._resolve_session_typed(pid, process, tool_hint, workspace, ts, allow_ephemeral=True)
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
            if sid not in self._ended:
                # No exit was seen: the session ends when it was last seen, not now. One that
                # had a process lost it; one that never had a process went quiet.
                self._end_session(session, session.last_seen_at, "process_exit" if session.root_pid else "idle")
            self._ended.discard(sid)
            self.native.pop(sid, None)
            self._alive_at.pop(sid, None)
            self._binding_pid.pop(sid, None)
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
            self._emit_tool_report_samples(reports)
        return reports

    def _emit_tool_report_samples(self, reports: list[ToolReport]) -> None:
        """Persist the changed tool-report samples; Kusto mode sends them as one batch."""
        sink = self.sink
        streaming = getattr(sink, "streams_observations", False) is True
        ts = time.time()
        samples: list[tuple[str, float, dict]] = []

        def sensitive(metric: str, value: float, tags: dict, **limits) -> None:
            if not streaming:
                sink.emit_with_sensitivity(metric, value, tags, ts, **limits)
                return
            admitted = sink.admit_with_sensitivity(metric, value, tags, ts, **limits)
            if admitted is not None:
                samples.append((metric, admitted, tags))

        def changed(metric: str, value: float, tags: dict) -> None:
            if not streaming:
                sink.emit_if_changed(metric, value, tags, ts)
            elif sink.admit_if_changed(metric, value, tags, ts):
                samples.append((metric, value, tags))

        for r in reports:
            tags = {"aictl.tool": r.tool}
            # Continuously varying — use sensitivity-aware emission
            sensitive(M("aictl.tool.cpu"), r.cpu_percent / 100, tags, abs_threshold=0.10, max_threshold=0.05, rounding=3)
            sensitive(
                M("aictl.tool.memory"),
                round(float(r.memory_rss_bytes) / 65536) * 65536,
                tags,
                abs_threshold=1_048_576,
                max_threshold=10_485_760,
                rounding=0,
            )
            sensitive(
                M("aictl.tool.network.io"),
                r.inbound_rate_bps,
                {**tags, "network.io.direction": "receive"},
                abs_threshold=1024,
                max_threshold=512,
                rounding=0,
            )
            sensitive(
                M("aictl.tool.network.io"),
                r.outbound_rate_bps,
                {**tags, "network.io.direction": "transmit"},
                abs_threshold=1024,
                max_threshold=512,
                rounding=0,
            )
            # Change infrequently — skip if unchanged
            changed(M("aictl.tool.sessions"), float(r.session_count), tags)
            changed(M("aictl.tool.pids"), float(r.pid_count), tags)
            changed(M("aictl.tool.token.usage"), float(r.token_estimate.input_tokens), {**tags, "gen_ai.token.type": "input"})
            changed(M("aictl.tool.token.usage"), float(r.token_estimate.output_tokens), {**tags, "gen_ai.token.type": "output"})
            changed(M("aictl.tool.token.confidence"), r.token_estimate.confidence, tags)
            changed(M("aictl.tool.mcp.score"), r.mcp.confidence, tags)
        if samples:
            try:
                sink.emit_batch(samples, ts=ts)
            except Exception as exc:
                log.warning("Correlator tool-report sample delivery failed: %s", exc)

    def active_sessions(self) -> list[dict]:
        """Return active sessions as serializable dicts with process trees."""
        cutoff = time.time() - 180
        results = []
        for session in self.sessions.values():
            if session.last_seen_at >= cutoff:
                d = session.to_dict()
                d["process_tree"] = self._build_process_tree(session)
                binding = self.native.get(session.session_id) or {}
                d["native_session_id"] = binding.get("session_id")
                d["native_state"] = binding.get("state")
                d["native_status_at"] = binding.get("status_at")
                d["ended"] = session.session_id in self._ended
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

    def _classify_process_role(self, pid: int, info: ProcessInfo, session: SessionState) -> str:
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

    def _end_session(self, session: SessionState, ts: float, reason: str) -> None:
        """Report the end of a monitor session once, at the time the end was observed."""
        sid = session.session_id
        self._ended.add(sid)
        binding = self.native.get(sid)
        self._emit_event(
            ts,
            session.tool,
            "session_end",
            {
                "session_id": sid,
                "native_session_id": binding["session_id"] if binding else "",
                "end_reason": reason,
                "project": session.project,
                "duration_s": round(max(0.0, ts - session.started_at), 1),
                "pids": len(session.pids),
                "input_tokens": session.exact_input_tokens,
                "output_tokens": session.exact_output_tokens,
                **self._process_facts(session, binding),
            },
        )

    def _process_facts(self, session: SessionState, binding: dict | None) -> dict:
        """What the processes say about a session, for a row written from them: never empty."""
        root = self.pid_to_process.get(session.root_pid) if session.root_pid else None
        started = session.root_created_at or (root.created_at if root else None) or session.started_at
        cwd = (binding or {}).get("cwd") or (root.cwd if root else None) or ""
        return {
            "pid": session.root_pid or 0,
            "process_started_at": float(started or 0.0),
            "native_started_at": float((binding or {}).get("started_at") or 0.0),
            "cwd": cwd,
        }

    def _tool_of(self, process: ProcessInfo) -> str | None:
        return classify_process(process).tool

    def _join_family(self, session: SessionState, process: ProcessInfo, ts: float) -> SessionState:
        """One session per process family: a session whose root's parent belongs to a session of
        the same tool is the same agent (a wrapper and the native process it started), so it
        moves into that session. This happens when the child was seen before its parent."""
        if process.pid != session.root_pid or process.ppid is None:
            return session
        parent = self._find_parent_session(process.ppid)
        if (
            parent is None
            or parent is session
            or parent.tool != session.tool
            or parent.session_id in self._ended
            or session.session_id in self._ended
        ):
            return session
        child = session
        for pid in {*child.pids, process.pid}:
            self.pid_to_session[pid] = parent.session_id
            parent.pids.add(pid)
        parent.workspaces |= child.workspaces
        parent.started_at = min(parent.started_at, child.started_at)
        parent.last_seen_at = max(parent.last_seen_at, child.last_seen_at)
        self.sessions.pop(child.session_id, None)
        binding = self.native.pop(child.session_id, None)
        holder = self._binding_pid.pop(child.session_id, None)
        self._alive_at.pop(child.session_id, None)
        self._emit_event(ts, child.tool, "session_merged", {
            "session_id": child.session_id,
            "into": parent.session_id,
            "native_session_id": binding["session_id"] if binding else "",
            "project": child.project,
        })
        if binding is not None and parent.session_id not in self.native:
            self.native[parent.session_id] = binding
            self._binding_pid[parent.session_id] = holder or process.pid
            self._alive_at[parent.session_id] = ts
            detail = self._binding_detail(parent, binding, self.pid_to_process.get(holder or 0, process))
            detail["previous_native_session_id"] = ""
            self._emit_event(ts, parent.tool, "session_bound", detail)
        return parent

    def _lookup_native(self, process: ProcessInfo, tool: str) -> dict | None:
        if self.native_binder is None:
            return None
        try:
            return self.native_binder(process, tool)
        except Exception:  # noqa: BLE001 - a binder failure leaves the process unbound
            log.debug("Native session lookup failed for pid %s", process.pid, exc_info=True)
            return None

    def _bind(self, session: SessionState, process: ProcessInfo, ts: float) -> None:
        """Keep the family's native session current; report a new or changed binding.

        Evidence on any process of the tool in the family binds the whole family. The process
        that gave the binding keeps it while it lives, so a nested process of the same tool
        cannot flip the session back and forth.
        """
        sid = session.session_id
        if sid in self._ended or self._tool_of(process) != session.tool:
            return  # helpers (shells, MCP servers) are not evidence
        holder = self._binding_pid.get(sid)
        current = self.native.get(sid)
        if current is not None and holder != process.pid and holder in session.pids:
            return
        binding = self._lookup_native(process, session.tool)
        if binding is None:
            return  # an unreadable file keeps the binding it had
        self.native[sid] = binding
        self._binding_pid[sid] = process.pid
        if current is not None and current["session_id"] == binding["session_id"]:
            if ts - self._alive_at.get(sid, 0.0) >= ALIVE_EVERY_S:
                self._alive_at[sid] = ts
                alive = self._binding_detail(session, binding, process)
                alive.pop("launch")  # stated once, when the session is bound
                self._emit_event(ts, session.tool, "session_alive", alive)
            return
        self._alive_at[sid] = ts
        detail = self._binding_detail(session, binding, process)
        detail["previous_native_session_id"] = current["session_id"] if current else ""
        if current is not None:
            detail["previous_native_started_at"] = float(current.get("started_at") or 0.0)
        self._emit_event(ts, session.tool, "session_bound", detail)

    def _binding_detail(self, session: SessionState, binding: dict, process: ProcessInfo) -> dict:
        return {
            "session_id": session.session_id,
            "native_session_id": binding["session_id"],
            "project": session.project,
            **self._process_facts(session, binding),
            "evidence_pid": process.pid,
            "launch": _launch(session.tool, process),
        }

    def drain_events(self) -> list[dict]:
        """Return and clear all pending events."""
        events = self.pending_events
        self.pending_events = []
        return events

    def diagnostics(self) -> dict[str, dict[str, object]]:
        """Collector health/status map."""

        return dict(sorted(self.collector_status.items()))

    # ── Internal typed handlers ────────────────────────────────────

    def _handle_process_event_typed(
        self, process: ProcessInfo, cpu_percent: float | None, ts: float, is_new: bool
    ) -> None:
        self.pid_to_process[process.pid] = process
        self.pid_parent[process.pid] = process.ppid

        session = self._resolve_session_for_process(process, ts)
        if session is None:
            return
        session = self._join_family(session, process, ts)
        session.pids.add(process.pid)
        self._bind(session, process, ts)

        if process.cwd:
            workspace = self.workspace_for_cwd(process.cwd)
            if workspace:
                session.workspaces.add(workspace)

        if cpu_percent is None:
            session.last_seen_at = max(session.last_seen_at, ts)
        else:
            # The session's CPU is the sum over the processes it owns (each sample is
            # one process), not the last sample of whichever process reported last.
            session.add_cpu(ts, sum(self.pid_cpu.get(pid, 0.0) for pid in session.pids))
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
            return self._session_for_tool(tool_hint, ts, workspace=workspace, allow_ephemeral=allow_ephemeral)

        if workspace:
            candidates = [s for s in self.sessions.values() if workspace in s.workspaces]
            # Two sessions in one project: the file cannot tell which one wrote it.
            if len(candidates) == 1:
                return candidates[0]

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

        identity = f"{process.created_at:.6f}" if process.created_at is not None else str(int(ts))
        session_id = f"{match.tool}:{process.pid}:{identity}"
        # Check for a *recent* existing session for this tool:pid.
        # Reattach if the session was seen within the last 10 minutes —
        # long enough to survive missed scan cycles, short enough that
        # a genuinely reused PID (hours later) creates a new session.
        _SESSION_REUSE_WINDOW = 600  # seconds
        for sid, sess in self.sessions.items():
            if (
                sess.tool == match.tool
                and sess.root_pid == process.pid
                and ts - sess.last_seen_at < _SESSION_REUSE_WINDOW
                and (
                    process.created_at is None
                    or getattr(sess, "root_created_at", None) in (None, process.created_at)
                )
            ):
                session_id = sid
                break
        session = self.sessions.get(session_id)
        if session is not None and session.root_created_at is None:
            session.root_created_at = process.created_at
        if session is None:
            session = SessionState(
                session_id=session_id,
                tool=match.tool,
                root_pid=process.pid,
                started_at=ts,
                last_seen_at=ts,
                project=_derive_project(process.cwd),
                root_created_at=process.created_at,
            )
            self.sessions[session_id] = session
            detail = {"pid": process.pid, "name": process.name, "session_id": session_id}
            # A process bound from the start never gets a monitor session row of its own.
            binding = self._lookup_native(process, match.tool)
            if binding is not None:
                self.native[session_id] = binding
                self._binding_pid[session_id] = process.pid
                self._alive_at[session_id] = ts
                detail["native_session_id"] = binding["session_id"]
                detail["launch"] = _launch(match.tool, process)
            detail.update(self._process_facts(session, binding), pid=process.pid)
            if not detail["cwd"] and process.cwd:
                detail["cwd"] = process.cwd
            if not detail["process_started_at"]:
                detail["process_started_at"] = float(process.created_at or ts)
            self._emit_event(ts, match.tool, "session_start", detail)

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
        workspace: str | None = None,
        allow_ephemeral: bool,
    ) -> SessionState | None:
        """Resolve a session from a bare tool hint.

        When *workspace* is provided, sessions whose workspaces contain it
        are preferred, so two concurrent same-tool sessions in different
        projects each receive their own events.  Without a workspace hint
        the most recently seen session wins — a known residual limitation:
        callers that only know the tool (e.g. the structured telemetry
        collector, whose state files carry no workspace) can still route
        events to the wrong one of two concurrent same-tool sessions.
        """
        sessions = [session for session in self.sessions.values() if session.tool == tool]
        if sessions:
            if workspace:
                matching = [session for session in sessions if workspace in session.workspaces]
                if matching:
                    return max(matching, key=lambda session: session.last_seen_at)
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
        peak_cpu_percent = max((session.peak_cpu_percent for session in session_list), default=0.0)
        pids = {pid for session in session_list for pid in session.pids}
        # Same basis as memory: the latest sample of each live process, summed. A
        # session's own figure is only refreshed when one of its processes reports.
        cpu_percent = sum(self.pid_cpu.get(pid, 0.0) for pid in pids)
        peak_cpu_percent = max(peak_cpu_percent, cpu_percent)  # the peak is never below the present value
        # pid_mem stores MB (see on_process); the report/metric unit is bytes.
        memory_rss_bytes = int(sum(self.pid_mem.get(pid, 0.0) for pid in pids) * 1048576)
        confidence = min(1.0, token_estimate.confidence * 0.65 + mcp.confidence * 0.35)

        # Collect per-PID details with parent info for tree rendering
        proc_details = []
        for pid in sorted(pids):
            proc_info = self.pid_to_process.get(pid)
            if proc_info:
                proc_details.append(
                    {
                        "pid": pid,
                        "ppid": proc_info.ppid,
                        "name": proc_info.name,
                        "exe": proc_info.exe or "",
                        "cwd": proc_info.cwd or "",
                        "cpu_pct": round(self.pid_cpu.get(pid, 0), 1),
                        "mem_mb": round(self.pid_mem.get(pid, 0), 1),
                    }
                )

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
            memory_rss_bytes=memory_rss_bytes,
            processes=proc_details,
        )


def _combine_token_estimates(estimates: Iterable[TokenEstimate]) -> TokenEstimate:
    estimate_list = list(estimates)
    if not estimate_list:
        return TokenEstimate(input_tokens=0, output_tokens=0, confidence=0.0, source="network-inference")
    sources = {estimate.source for estimate in estimate_list}
    source = (
        "telemetry"
        if "telemetry" in sources
        else "session-files"
        if "session-files" in sources
        else "network-inference"
    )
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
    agent_type: str = ""  # Claude Code SubagentStart ``agent_type`` (Explore, Plan, general-purpose, ...)
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
    last_stop_at: float | None = None
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
            "last_stop_at": self.last_stop_at,
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
        self._gc_interval = 3600  # GC sessions ended more than 1h ago
        self._stale_interval = 86400  # GC never-ended sessions silent for 24h
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
        """Remove sessions that ended more than _gc_interval ago.

        Sessions without an end event (the tool crashed or was killed
        before ``SessionEnd`` fired) are reclaimed after a much longer
        ``_stale_interval`` of total silence, so idle-but-open sessions
        survive while abandoned ones cannot accumulate forever.
        """
        now = time.time()
        if now - self._last_gc < 60:
            return
        self._last_gc = now
        cutoff = now - self._gc_interval
        stale_cutoff = now - self._stale_interval
        stale = [
            sid
            for sid, s in self.sessions.items()
            if (s.ended_at and s.ended_at < cutoff)
            or (not s.ended_at and s.last_event_at and s.last_event_at < stale_cutoff)
        ]
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

    def _on_agent_stop(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        """Handle Claude Code's ``Stop`` hook.

        ``Stop`` fires after *every* agent response, not when the session
        ends — the session is idle awaiting the next prompt.  Marking it
        inactive here (the old behavior) split one logical session into a
        new row per prompt/response turn.  ``SessionEnd`` remains the only
        terminal lifecycle event.
        """
        session.state = "idle"
        session.last_stop_at = ts

    def _reactivate(self, session: SessionEntityState) -> None:
        """Return an idle (or prematurely ended) session to the active state.

        New activity proves the session is still open, so any end time
        recorded by a non-terminal event is cleared.
        """
        session.state = "active"
        session.ended_at = None

    def _on_subagent_start(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        agent_id = detail.get("agent_id") or detail.get("subagent_id") or f"agent-{len(session.agents)}"
        # Future-proof: capture parent_conversation_id when Claude Code adds it
        parent_id = detail.get("parent_conversation_id", "")
        # agent_type is the useful human label ("Explore", "Plan",
        # "general-purpose"); it used to be dropped so agents showed as UUIDs.
        agent_type = str(detail.get("agent_type") or "")
        session.agents[agent_id] = AgentState(
            agent_id=agent_id,
            session_id=session.session_id,
            state="active",
            task=str(detail.get("task") or detail.get("description") or agent_type),
            agent_type=agent_type,
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
        self._reactivate(session)
        session.context_state = "filling"

    def _on_user_prompt_submit(self, session: SessionEntityState, detail: dict, ts: float) -> None:
        self._reactivate(session)
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
            tool_input = detail.get("tool_input") if isinstance(detail.get("tool_input"), dict) else {}
            legacy_input = detail.get("input") if isinstance(detail.get("input"), dict) else {}
            skill_name = (
                detail.get("skill_name", "")
                or tool_input.get("skill", "")
                or tool_input.get("name", "")
                or legacy_input.get("skill", "")
                or legacy_input.get("name", "")
                or "unknown"
            )
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
        "Stop": _on_agent_stop,
    }
