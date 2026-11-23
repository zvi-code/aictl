"""Source-owned runtime, native output, and configured-on-disk live producers.

Collectors only enqueue current observations. Separate workers publish resources,
follow bounded active native tails, and watch configuration signatures. None of
these workers calls Kusto or mutates historical usage/activity totals.
"""

from __future__ import annotations

import logging
import os
import socket
import threading
import time
from collections import OrderedDict, deque
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .. import session_lifecycle
from ..dashboard.live.protocol import stable_id
from ..dashboard.projection_utils import mask_secrets
from ..observe.collect import capture_mode as storage_capture_mode
from .collectors.process import classify_process
from .native_sessions import NativeSessionTail
from .session import ProcessInfo
from .tool_config import _scrub, _secret_name, current_tool_configs

log = logging.getLogger(__name__)
_EFFECTIVE_KEYS = ("model", "reasoning_effort", "approval_policy", "sandbox_policy")
_MAX_NATIVE_FILES = 64
_DISCOVERY_BATCH = 256
_DISCOVERY_RECONCILE_S = 5.0
_MAX_CANDIDATES = 8192
_CONFIG_PRIVATE_KEYS = frozenset({"systemprompt", "system_prompt", "prompt", "instructions", "systemmessage"})


def _private_setting(key: object) -> bool:
    compact = "".join(char for char in str(key).lower() if char.isalnum())
    return "systemprompt" in compact or "instruction" in compact or compact in ("prompt", "systemmessage")


def _safe(value: object) -> object:
    if isinstance(value, str):
        return mask_secrets(value)
    if isinstance(value, list):
        return [_safe(item) for item in value]
    if isinstance(value, dict):
        return {
            key: _safe(item)
            for key, item in value.items()
            if not _secret_name(key) and not _private_setting(key)
        }
    return value


def _config_payload(configs: list[dict]) -> dict:
    """Use normalized settings rows, never raw config/env/prompt text."""
    tools = []
    for config in configs:
        normalized = {
            key: value
            for key, value in config.items()
            if key not in ("settings", "features", "feature_groups")
        }
        sections = []
        for section in config.get("sections") or []:
            rows = []
            for row in section.get("rows") or []:
                key = str(row.get("key") or "")
                compact = "".join(char for char in key.lower() if char.isalnum())
                if row.get("set") is False or _secret_name(key) or _private_setting(key):
                    continue
                if compact in _CONFIG_PRIVATE_KEYS:
                    continue
                rows.append(row)
            if rows:
                sections.append({**section, "rows": rows})
        normalized["sections"] = sections
        if "env_vars" in normalized:
            # These are already env_display()-masked settings rows, not a
            # process's environment. Keep only the values set on disk.
            normalized["env_vars"] = [
                {key: value for key, value in row.items() if key not in ("process", "in_process")}
                for row in normalized["env_vars"]
                if row.get("set") and row.get("persisted")
            ]
        normalized.update(configured_only=True)
        tools.append(_safe(_scrub(normalized)))
    return {"tool_configs": tools, "configured_only": True}


def _identity(process: ProcessInfo) -> tuple[int, float | None]:
    return process.pid, process.created_at


def _flag_evidence(process: ProcessInfo, ts: float) -> dict[str, dict]:
    """Allowlisted observed launch flags; never expose the command line."""
    tool = classify_process(process).tool
    if tool not in ("copilot-cli", "codex-cli", "claude-code", "gemini-cli"):
        return {}
    flags = {"--model": "model"}
    if tool in ("codex-cli", "gemini-cli"):
        flags["-m"] = "model"
    if tool == "copilot-cli":
        flags["--reasoning-effort"] = "reasoning_effort"
    if tool == "codex-cli":
        flags.update({"--ask-for-approval": "approval_policy", "--sandbox": "sandbox_policy"})
    out = {}
    args = process.cmdline
    for index, arg in enumerate(args):
        key, sep, value = arg.partition("=")
        setting = flags.get(key)
        if setting is None:
            continue
        if not sep:
            value = args[index + 1] if index + 1 < len(args) else ""
        if not value or value.startswith("-"):
            continue
        out[setting] = {
            "key": setting,
            "value": mask_secrets(value)[:160],
            "source": "process-flag",
            "observed_at": ts,
        }
    return out


def _with_session_file(state: dict, samples: list[dict]) -> dict:
    """A tool's session file states the session's activity directly; it wins over a transcript guess.

    Each process of the family carries the state read at its own last event, so a process that
    was sampled before the tool wrote ``status`` still says "unknown": the newest known state wins.
    """
    sid = state.get("session_id")
    known = [sample for sample in samples if sid and sample.get("native_session_id") == sid
             and sample.get("native_state") not in (None, "", "unknown")]
    for sample in sorted(known, key=lambda sample: sample.get("native_status_at") or 0.0, reverse=True)[:1]:
        reported = sample["native_state"]
        if reported:
            out = dict(state)
            out["status"] = "working" if reported == "running" else reported
            out["native_activity"] = "working" if reported == "running" else reported
            at = max(state.get("last_native_at") or 0.0, sample.get("native_status_at") or 0.0)
            out["last_native_at"] = at or None
            out["status_source"] = "session file"
            return out
    return state


# What the native binder (monitoring/native_binding.NativeBinder) checks per tool, in plain words:
# the reason a process of that tool is not linked to a session. A tool not listed here has no
# per-process session source at all. test_live_sources keeps this in step with the binder.
UNLINKED_REASONS = {
    "claude-code": "no session file names this process (Claude Code writes sessions/<pid>.json per session process)",
    "copilot-cli": "holds no single session lock (session-state/<id>/inuse.<pid>.lock) and its command line names no "
                   "known session",
    "codex-cli": "its command line names no known session; Codex CLI writes no per-process session file",
}
_NO_SOURCE = {
    "copilot-desktop": "aictl links only Copilot CLI processes to a session; the desktop app holds many sessions and no "
                       "per-process session lock",
    "copilot-vscode": "aictl links only Copilot CLI processes to a session; VS Code holds many chat sessions and no "
                      "per-process session lock",
    "claude-desktop": "aictl has no per-process session source for the desktop app; its Claude Code sessions are "
                      "linked through their own processes",
}


def unlinked_reason(tool: str) -> str:
    """Why a process of *tool* is not linked to a session, from what the binder checked."""
    return UNLINKED_REASONS.get(tool) or _NO_SOURCE.get(tool) or "aictl has no session source for this tool"


def _runtime_evidence(processes: list[ProcessInfo], status: str, native: dict) -> str:
    """Why a runtime agent has its status: its processes, and what the tool itself reports."""
    pids = [process.pid for process in processes]
    words = session_lifecycle.process_words(pids) if pids else "no process"
    if status == "ended":
        return f"tool reported end; {words}"
    if not native.get("session_id"):
        return f"{words}; not linked to a session, activity unknown"
    if status in ("unknown", ""):
        return f"{words}; activity unknown"
    source = native.get("status_source") or "session log"
    return f"{words}; {source} reports {'running' if status == 'working' else status}"


class LiveRuntimeSources:
    """Attach existing collectors/ingesters to the central, source-enforcing hub."""

    def __init__(
        self,
        hub: Any,
        root: Path,
        *,
        native_poll_s: float = 0.5,
        config_poll_s: float = 1.0,
        lifecycle_limit: int = 2048,
        capture_mode: Callable[[], str] | None = None,
        config_provider: Callable[[Path], list[dict]] | None = None,
        host: str | None = None,
    ) -> None:
        self.hub = hub
        self.root = root
        self.host = host or socket.gethostname()
        self.native_poll_s = max(0.05, native_poll_s)
        self.config_poll_s = max(0.05, config_poll_s)
        self.lifecycle_limit = max(1, lifecycle_limit)
        self._capture = capture_mode or storage_capture_mode
        self._config_provider = config_provider or current_tool_configs
        self._lock = threading.RLock()
        self._stop = threading.Event()
        self._runtime_wake = threading.Event()
        self._native_wake = threading.Event()
        self._config_wake = threading.Event()
        self._threads: list[threading.Thread] = []
        self._detach: list[Callable[[], None]] = []
        self._samples: dict[int, dict] = {}
        self._lifecycle: deque[tuple[str, dict]] = deque()
        self._gauges: dict[int, dict] = {}
        self._resync = False
        self._native_gap = False
        self._runtime_ready: dict = {"ready": False, "observed_at": None, "process_count": None}
        self._published_processes: set[str] = set()
        self._published_agents: set[str] = set()
        self._published_loaded: dict[str, str] = {}
        self._flag_cache: dict[tuple[int, float | None], dict[str, dict]] = {}
        self._candidates: OrderedDict[Path, str] = OrderedDict()
        self._priority_candidates: OrderedDict[Path, str] = OrderedDict()
        self._copilot_roots: set[Path] = set()
        self._native_roots: dict[str, set[Path]] = {}
        self._root_scans: dict[Path, tuple[tuple, Any]] = {}
        self._root_scan_finished: dict[Path, float] = {}
        self._root_cursor = 0
        self._tails: dict[Path, NativeSessionTail] = {}
        self._native: dict[Path, dict] = {}
        self._tail_processes: dict[Path, set[tuple[int, float | None]]] = {}
        self._native_processes: set[tuple[int, float | None]] = set()
        self._keeps_text: list[Callable[[], bool]] = []
        self._filesystem_mode = "bounded-polling"
        self._candidate_overflow = False
        self._native_capacity_reached = False
        self._last_config: dict | None = None
        self._capturing: bool | None = None
        self._output_ids: OrderedDict[str, None] = OrderedDict()

    def attach_runtime(self, runtime: Any) -> None:
        self._detach.append(runtime.correlator.observe_runtime(self._on_runtime))
        for name, status in runtime.correlator.diagnostics().items():
            self._on_runtime("collector_status", {"source": name, **status})

    def attach_ingester(self, transcript_ingester: Any) -> None:
        self._detach.append(transcript_ingester.observe_transcript_paths(self._queue_candidate))
        found = []
        for name, tool, default in (
            ("copilot", "copilot-cli", transcript_ingester.copilot_state),
            ("claude", "claude-code", transcript_ingester.claude_projects),
            ("codex", "codex-cli", transcript_ingester.codex_sessions),
        ):
            found.append((name, tool, transcript_ingester._roots(name, default)))
        with self._lock:
            for name, tool, roots in found:
                self._native_roots.setdefault(tool, set()).update(roots)
                if name == "copilot":
                    self._copilot_roots.update(roots)
        keeps = getattr(transcript_ingester.store, "_keeps_text", None)
        if callable(keeps):
            self._keeps_text.append(keeps)
        self._native_wake.set()

    def start(self) -> None:
        if self._threads:
            return
        self.hub.publish(
            "source.status",
            "configuration",
            self._configuration_status(ready=self._last_config is not None, pending=self._last_config is None),
            source="runtime.operational",
        )
        for name, target in (
            ("runtime", self._runtime_loop),
            ("native", self._native_loop),
            ("configuration", self._configuration_loop),
        ):
            thread = threading.Thread(target=target, name=f"aictl-live-{name}", daemon=True)
            self._threads.append(thread)
            thread.start()

    def stop(self) -> None:
        self._stop.set()
        for wake in (self._runtime_wake, self._native_wake, self._config_wake):
            wake.set()
        for detach in self._detach:
            detach()
        self._detach.clear()
        for thread in self._threads:
            thread.join(timeout=2.0)
        for _, scan in self._root_scans.values():
            if scan is not None:
                scan.close()

    def _queue_candidate(self, path: Path, tool: str, *, priority: bool = False, wake: bool = True) -> None:
        with self._lock:
            if priority:
                self._candidates.pop(path, None)
                self._priority_candidates[path] = tool
                if len(self._priority_candidates) > _DISCOVERY_BATCH * 2:
                    self._priority_candidates.popitem(last=False)
                    self._candidate_overflow = True
            elif path not in self._priority_candidates:
                self._candidates[path] = tool
                if len(self._candidates) > _MAX_CANDIDATES:
                    self._candidates.popitem(last=False)
                    self._candidate_overflow = True
        if wake:
            self._native_wake.set()

    def _native_tool(self, path: Path) -> str | None:
        with self._lock:
            roots = [(tool, tuple(paths)) for tool, paths in self._native_roots.items()]
        for tool, paths in roots:
            for root in paths:
                try:
                    relative = path.relative_to(root)
                except ValueError:
                    continue
                if tool == "copilot-cli":
                    if path.name == "events.jsonl" and len(relative.parts) == 2:
                        return tool
                elif path.suffix == ".jsonl":
                    return tool
        return None

    def _queue_lifecycle(self, kind: str, data: dict) -> None:
        if self._resync:
            return
        if len(self._lifecycle) >= self.lifecycle_limit:
            self._lifecycle.clear()
            self._gauges.clear()
            self._resync = True
        else:
            self._lifecycle.append((kind, data))

    def _on_runtime(self, kind: str, data: dict) -> None:
        if self._stop.is_set():
            return
        if kind == "file":
            path = Path(data["path"])
            if path.name.startswith("inuse.") and path.name.endswith(".lock"):
                path = path.parent / "events.jsonl"
            tool = self._native_tool(path)
            if tool is not None:
                self._queue_candidate(path, tool, priority=True)
            return
        if kind == "process_snapshot":
            with self._lock:
                self._runtime_ready = {"ready": True, **data}
            self._runtime_wake.set()
            return
        if kind == "collector_status":
            if data.get("source") == "filesystem:watchdog":
                with self._lock:
                    self._filesystem_mode = (
                        "native-fs-events+bounded-polling"
                        if data.get("status") == "active"
                        else "bounded-polling"
                    )
                self._native_wake.set()
            return
        with self._lock:
            if kind == "process":
                process = data["process"]
                previous = self._samples.get(process.pid)
                if previous is None or _identity(previous["process"]) != _identity(process):
                    if previous is not None:
                        self._queue_lifecycle("exit", previous)
                    self._queue_lifecycle("start", data)
                    self._native_wake.set()
                else:
                    self._gauges[process.pid] = data
                self._samples[process.pid] = data
            elif kind == "process_exit":
                previous = self._samples.get(data["pid"])
                process = data.get("process")
                if previous is not None and (
                    process is None or _identity(previous["process"]) == _identity(process)
                ):
                    self._samples.pop(data["pid"], None)
                    self._gauges.pop(data["pid"], None)
                    self._queue_lifecycle("exit", previous)
                    self._native_wake.set()
        self._runtime_wake.set()

    def _tool(self, sample: dict) -> str:
        return str(sample.get("tool") or classify_process(sample["process"]).tool or "")

    def _process_id(self, sample: dict) -> str:
        process = sample["process"]
        return stable_id(self.host, "process", process.pid, process.created_at)

    def _publish_process(self, sample: dict) -> None:
        process = sample["process"]
        entity_id = self._process_id(sample)
        self.hub.publish(
            "runtime.process",
            entity_id,
            {
                "pid": process.pid,
                "ppid": process.ppid,
                "created_at": process.created_at,
                "name": mask_secrets(process.name)[:120],
                "tool": self._tool(sample),
                "cwd": mask_secrets(process.cwd) if process.cwd else None,
                "cpu_percent": sample.get("cpu_percent"),
                "memory_rss_bytes": sample.get("memory_rss"),
                "present": True,
                "session_id": sample.get("session_id"),
            },
            source="runtime.collector",
        )
        self._published_processes.add(entity_id)

    def flush_runtime(self) -> None:
        """Drain ordered lifecycle changes and coalesced latest resource gauges."""
        with self._lock:
            events, self._lifecycle = self._lifecycle, deque()
            gauges, self._gauges = self._gauges, {}
            samples = dict(self._samples)
            resync, self._resync = self._resync, False
            native_gap, self._native_gap = self._native_gap, False
        if resync:
            expected = {self._process_id(sample) for sample in samples.values()}
            for entity_id in self._published_processes - expected:
                self.hub.remove("runtime.process", entity_id, source="runtime.collector")
            self._published_processes &= expected
            for sample in samples.values():
                self._publish_process(sample)
        else:
            for kind, sample in events:
                if kind == "start":
                    self._publish_process(sample)
                else:
                    entity_id = self._process_id(sample)
                    self.hub.remove("runtime.process", entity_id, source="runtime.collector")
                    self._published_processes.discard(entity_id)
            for sample in gauges.values():
                self._publish_process(sample)
        self._publish_agents(samples)
        identities = {_identity(sample["process"]) for sample in samples.values()}
        self._flag_cache = {key: value for key, value in self._flag_cache.items() if key in identities}
        with self._lock:
            ready = dict(self._runtime_ready)
        self.hub.publish(
            "source.status",
            stable_id(self.host, "runtime-collector"),
            {"producer": "runtime-collector", "mode": "existing-process-collector", **ready},
            source="runtime.operational",
        )
        if resync:
            self.hub.invalidate("runtime-lifecycle-overflow", ordered_gap=True)
        elif native_gap:
            self.hub.invalidate("native-record-gap", ordered_gap=True)

    def _agent_data(self, sid: str, samples: list[dict], native: dict | None = None) -> dict:
        processes = [sample["process"] for sample in samples]
        native = native or {}
        project = native.get("project_path") or next((p.cwd for p in processes if p.cwd), "")
        status = native.get("status", "unknown")
        return {
            "id": sid,
            "session_id": sid,
            "native_session_id": native.get("session_id"),
            "monitor_session_id": samples[0].get("session_id") if samples else None,
            "tool": native.get("tool") or (self._tool(samples[0]) if samples else ""),
            "project": mask_secrets(project),
            "project_path": mask_secrets(project),
            "pids": sorted(p.pid for p in processes),
            "running": bool(processes) and status != "ended",
            "native_activity": native.get("native_activity", "unknown"),
            "status": "running" if status == "working" else status,
            "cpu_percent": (
                sum(sample["cpu_percent"] for sample in samples)
                if samples and all(sample.get("cpu_percent") is not None for sample in samples)
                else None
            ),
            "mem_mb": (
                sum(sample["memory_rss"] for sample in samples) / 1048576
                if samples and all(sample.get("memory_rss") is not None for sample in samples)
                else None
            ),
            "started_at": min((p.created_at for p in processes if p.created_at is not None), default=None),
            "last_native_at": native.get("last_native_at"),
            "status_evidence": _runtime_evidence(processes, status, native),
            # Set only when no evidence links these processes to a session: they are not a session.
            "unlinked_reason": None if native.get("session_id") else unlinked_reason(
                native.get("tool") or (self._tool(samples[0]) if samples else "")),
        }

    def _publish_loaded(self, sid: str, tool: str, evidence: dict[str, dict], *, native: bool) -> str:
        entity_id = stable_id(self.host, tool, sid)
        self.hub.publish(
            "configuration.loaded",
            entity_id,
            {
                "session_id": sid,
                "native_session_id": sid if native else None,
                "tool": tool,
                "configured_on_disk": False,
                "effective_known": bool(evidence),
                "evidence": list(evidence.values()),
                "unknown": [key for key in _EFFECTIVE_KEYS if key not in evidence],
            },
            source="runtime.native" if native else "runtime.evidence",
        )
        return entity_id

    def _process_evidence(self, samples: list[dict]) -> dict[str, dict]:
        root = next(
            (sample for sample in samples if sample.get("root_pid") == sample["process"].pid),
            samples[0] if samples else None,
        )
        if root is None:
            return {}
        process = root["process"]
        identity = _identity(process)
        evidence = _flag_evidence(process, root["ts"])
        previous = self._flag_cache.get(identity, {})
        for key, record in evidence.items():
            if previous.get(key, {}).get("value") == record["value"]:
                evidence[key] = previous[key]
        self._flag_cache[identity] = evidence
        return dict(evidence)

    def _publish_agents(self, samples: dict[int, dict]) -> None:
        with self._lock:
            native = [dict(state) for state in self._native.values()]
        groups: dict[str, list[dict]] = {}
        for sample in samples.values():
            # A process bound to the tool's own session is listed under that session's id.
            sid = (
                sample.get("native_session_id")
                or sample.get("session_id")
                or stable_id(self.host, *_identity(sample["process"]))
            )
            groups.setdefault(sid, []).append(sample)
        current = set()
        loaded: dict[str, str] = {}
        bound_groups = set()
        for state in native:
            owned = [
                samples[pid]
                for pid in state["pids"]
                if pid in samples and _identity(samples[pid]["process"]) in state["identities"]
            ]
            if not owned:
                continue
            sid = state["session_id"]
            data = self._agent_data(sid, owned, _with_session_file(state, owned))
            # A desktop process may hold several sessions; its resource use is
            # not attributable to each one independently.
            if any(sum(pid in other["pids"] for other in native) > 1 for pid in state["pids"]):
                data["cpu_percent"] = data["mem_mb"] = None
            entity_id = stable_id(self.host, state["tool"], sid)
            self.hub.publish("runtime.agent", entity_id, data, source="runtime.collector")
            current.add(entity_id)
            bound_groups.update(sample.get("session_id") for sample in owned)
            bound_groups.add(sid)
            evidence = self._process_evidence(owned)
            evidence.update(state["evidence"])
            loaded[self._publish_loaded(sid, state["tool"], evidence, native=True)] = "runtime.native"
        for sid, owned in groups.items():
            if sid in bound_groups or any(sample.get("session_id") in bound_groups for sample in owned):
                continue
            native_id = next((s["native_session_id"] for s in owned if s.get("native_session_id")), None)
            file_state = _with_session_file({"session_id": native_id}, owned) if native_id else None
            data = self._agent_data(sid, owned, file_state)
            entity_id = stable_id(self.host, data["tool"], sid)
            self.hub.publish("runtime.agent", entity_id, data, source="runtime.collector")
            current.add(entity_id)
            evidence = self._process_evidence(owned)
            loaded[self._publish_loaded(sid, data["tool"], evidence, native=native_id is not None)] = (
                "runtime.native" if native_id else "runtime.evidence")
        for entity_id in self._published_agents - current:
            self.hub.remove("runtime.agent", entity_id, source="runtime.collector")
        for entity_id, source in self._published_loaded.items():
            if entity_id not in loaded:
                self.hub.remove("configuration.loaded", entity_id, source=source)
        self._published_agents = current
        self._published_loaded = loaded

    def _holders(self, path: Path, tool: str, samples: dict[int, dict]) -> tuple[str, set[int]]:
        sid = path.parent.name if tool.startswith("copilot") else ""
        pids = set()
        if tool.startswith("copilot"):
            try:
                for marker in path.parent.glob("inuse.*.lock"):
                    raw = marker.name[6:-5]
                    sample = samples.get(int(raw)) if raw.isdigit() else None
                    if sample is None or self._tool(sample) not in ("copilot-cli", "copilot-vscode", "copilot-desktop"):
                        continue
                    birth = sample["process"].created_at
                    if birth is not None and birth <= marker.stat().st_mtime:
                        pids.add(sample["process"].pid)
            except OSError:
                pass
        for pid, sample in samples.items():
            if self._tool(sample) != tool:
                continue
            native = sample.get("native_session_id")
            if native and native in (path.stem, path.parent.name):
                # The tool names this session for this exact process (aictl.monitoring.native_binding).
                sid = native
                pids.add(pid)
                continue
            args = sample["process"].cmdline
            for index, arg in enumerate(args):
                key, sep, value = arg.partition("=")
                if key not in ("--session-id", "--resume", "resume"):
                    continue
                if not sep:
                    value = args[index + 1] if index + 1 < len(args) else ""
                if value and (value == path.parent.name or value in path.stem):
                    sid = value
                    pids.add(pid)
        return sid, pids

    def _discover_copilot(self, *, force: bool) -> None:
        with self._lock:
            roots = sorted(self._copilot_roots)
        if not roots:
            return
        start = self._root_cursor % len(roots)
        remaining = _DISCOVERY_BATCH
        for index in range(len(roots)):
            self._root_cursor = (start + index + 1) % len(roots)
            root = roots[(start + index) % len(roots)]
            try:
                stat = root.stat()
                signature = stat.st_mtime_ns, stat.st_ino
                previous = self._root_scans.get(root)
                if previous is None or previous[1] is None and (
                    force
                    or previous[0] != signature
                    or time.monotonic() - self._root_scan_finished.get(root, 0) >= _DISCOVERY_RECONCILE_S
                ):
                    self._root_scans[root] = (signature, os.scandir(root))
                signature, scan = self._root_scans[root]
                if scan is None:
                    continue
                while remaining:
                    entry = next(scan, None)
                    if entry is None:
                        scan.close()
                        self._root_scans[root] = (signature, None)
                        self._root_scan_finished[root] = time.monotonic()
                        break
                    remaining -= 1
                    if entry.is_dir(follow_symlinks=False):
                        self._queue_candidate(Path(entry.path) / "events.jsonl", "copilot-cli", wake=False)
                if not remaining:
                    return
            except OSError:
                continue

    def poll_native(self) -> None:
        with self._lock:
            samples = dict(self._samples)
        native_processes = {
            _identity(sample["process"])
            for sample in samples.values()
            if classify_process(sample["process"]).tool
            in ("copilot-cli", "copilot-vscode", "copilot-desktop", "codex-cli", "claude-code")
        }
        force = native_processes != self._native_processes
        self._native_processes = native_processes
        if self._filesystem_mode == "bounded-polling":
            # With watchdog, use the existing collector's events and history
            # ingester's path cache. Only the explicit fallback enumerates
            # immediate session folders, in bounded batches.
            self._discover_copilot(force=force)
        with self._lock:
            candidates = [
                self._priority_candidates.popitem(last=False)
                for _ in range(min(_DISCOVERY_BATCH, len(self._priority_candidates)))
            ]
            candidates.extend(
                self._candidates.popitem(last=False)
                for _ in range(min(_DISCOVERY_BATCH - len(candidates), len(self._candidates)))
            )
        for path, tool in candidates:
            sid, pids = self._holders(path, tool, samples)
            if not pids or not sid or path in self._tails:
                continue
            if len(self._tails) < _MAX_NATIVE_FILES:
                birth = min(
                    (samples[pid]["process"].created_at for pid in pids if samples[pid]["process"].created_at is not None),
                    default=None,
                )
                self._tails[path] = NativeSessionTail(path, self._tool(samples[min(pids)]), sid, process_started_at=birth)
                self._tail_processes[path] = {_identity(samples[pid]["process"]) for pid in pids}
            else:
                self._native_capacity_reached = True
        capture = self._capture()
        if any(keeps() is not True for keeps in self._keeps_text):
            capture = "metadata"
        retaining = capture == "full"
        if self._capturing and not retaining:
            for entity_id in self._output_ids:
                self.hub.remove("runtime.output", entity_id, source="runtime.native")
            self._output_ids.clear()
            # Remove already-queued full-text copies as well as replay cursors.
            self.hub.invalidate("native-capture-policy-changed", ordered_gap=False)
        self._capturing = retaining
        for path, tail in list(self._tails.items()):
            sid, pids = self._holders(path, tail.tool, samples)
            if not pids or sid != tail.session_id:
                self._tails.pop(path, None)
                self._tail_processes.pop(path, None)
                with self._lock:
                    self._native.pop(path, None)
                self._runtime_wake.set()
                continue
            identities = {_identity(samples[pid]["process"]) for pid in pids}
            if not identities.intersection(self._tail_processes[path]):
                order = tail.order
                birth = min((birth for _, birth in identities if birth is not None), default=None)
                tail = NativeSessionTail(path, tail.tool, sid, process_started_at=birth)
                tail.order = order
                self._tails[path] = tail
            self._tail_processes[path] = identities
            try:
                gaps = tail.order_gaps
                tail.refresh(
                    capture=capture,
                    emit=self._publish_output,
                )
            except OSError:
                continue
            with self._lock:
                if tail.order_gaps != gaps:
                    self._native_gap = True
                self._native[path] = {
                    "session_id": tail.session_id,
                    "tool": tail.tool,
                    "pids": pids,
                    "identities": identities,
                    "status": tail.status,
                    "native_activity": tail.native_activity,
                    "project_path": tail.project_path,
                    "last_native_at": tail.last_native_at,
                    "evidence": dict(tail.evidence),
                }
            self._runtime_wake.set()
        self.hub.publish(
            "source.status",
            stable_id(self.host, "native-session-adapter"),
            {
                "producer": "native-session-adapter",
                "mode": self._filesystem_mode,
                "fallback": self._filesystem_mode == "bounded-polling",
                "poll_interval_s": self.native_poll_s,
                "discovery_batch": _DISCOVERY_BATCH,
                "discovery_reconcile_s": _DISCOVERY_RECONCILE_S,
                "active_files": len(self._tails),
                "native_file_capacity": _MAX_NATIVE_FILES,
                "native_file_capacity_reached": self._native_capacity_reached,
                "capture": capture,
                "candidate_capacity_reached": self._candidate_overflow,
                "discarded_oversize_lines": sum(tail.discarded_lines for tail in self._tails.values()),
                "native_record_gaps": sum(tail.order_gaps for tail in self._tails.values()),
                "tail_truncated": any(tail.tail_truncated for tail in self._tails.values()),
                "native_metadata_limited": any(tail.metadata_limited for tail in self._tails.values()),
                "detail": (
                    "Existing filesystem events plus bounded active-tail polling"
                    if self._filesystem_mode != "bounded-polling"
                    else "Filesystem watcher unavailable or disabled; bounded polling and nonrecursive lock discovery"
                ),
            },
            source="runtime.operational",
        )

    def _publish_output(self, data: dict) -> None:
        entity_id = stable_id(self.host, data["tool"], data["session_id"], data["entry_id"])
        try:
            self.hub.publish("runtime.output", entity_id, data, source="runtime.native")
        except Exception:
            with self._lock:
                self._native_gap = True
            self._runtime_wake.set()
            raise
        # Match the hub's insertion-order retention. Updating an existing entry
        # must not evict a different ID here and leave retained text untracked.
        self._output_ids[entity_id] = None
        limit = getattr(getattr(self.hub, "limits", None), "output_entries", 2000)
        while len(self._output_ids) > limit:
            self._output_ids.popitem(last=False)

    @staticmethod
    def _configuration_status(*, ready: bool, pending: bool = False, error: str | None = None) -> dict:
        return {
            "component": "configuration",
            "producer": "configured-files",
            "topic": "configuration.file",
            "ready": ready,
            "pending": pending,
            "stale": error is not None,
            "error": error,
            "reason": error,
        }

    def poll_configuration(self) -> None:
        try:
            payload = _config_payload(self._config_provider(self.root))
            self.hub.commit([
                ("configuration.file", "current", payload, "filesystem.config"),
                (
                    "source.status",
                    "configuration",
                    self._configuration_status(ready=True),
                    "runtime.operational",
                ),
            ])
        except Exception as exc:
            error = mask_secrets(str(exc)).strip()[:500] or type(exc).__name__
            self.hub.publish(
                "source.status",
                "configuration",
                self._configuration_status(ready=self._last_config is not None, error=error),
                source="runtime.operational",
            )
            log.warning("Live configuration refresh failed: %s", error)
            return
        self._last_config = payload

    def _loop(self, action: Callable[[], None], wake: threading.Event, interval: float) -> None:
        while not self._stop.is_set():
            wake.clear()
            try:
                action()
            except Exception:
                log.exception("Live source %s failed; retrying", action.__name__)
            wake.wait(interval)

    def _runtime_loop(self) -> None:
        self._loop(self.flush_runtime, self._runtime_wake, 0.1)

    def _native_loop(self) -> None:
        self._loop(self.poll_native, self._native_wake, self.native_poll_s)

    def _configuration_loop(self) -> None:
        self._loop(self.poll_configuration, self._config_wake, self.config_poll_s)
