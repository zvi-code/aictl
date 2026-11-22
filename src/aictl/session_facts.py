"""Publish session facts without consulting stored history."""

from __future__ import annotations

import json
import logging
import threading
import time
from collections import OrderedDict
from collections.abc import Iterable
from dataclasses import asdict, replace
from typing import Any

from .ingesters._common import project_key
from .records import STEP_TEXT_LIMIT, SessionRow, _dedup_key, strip_event_text
from .state_file import StateFile
from .stores import writer_or_discard
from .tool_calls import call_key

_LIMIT = 20_000
log = logging.getLogger(__name__)
_COUNTERS = ("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens",
             "cost_usd", "request_count", "tool_call_count", "files_modified")
_FAMILIES = {
    "prompts": "session_prompts", "skills": "skill_uses", "context_events": "context_events",
    "loaded_files": "session_loaded_files", "context_items": "session_context_items",
    "cost_links": "turn_request_links",
}


def _json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, default=str)


class SessionFacts:
    def __init__(self, writer, *, keeps_text=lambda: False, state: StateFile | None = None,
                 content_days: int = 14, trim_before=lambda: 0.0) -> None:
        self.writer = writer_or_discard(writer)
        self.keeps_text = keeps_text
        self.state = state
        self.content_days = content_days
        self.trim_before = trim_before
        self._lock = threading.RLock()
        self._dirty = False
        self._sessions: OrderedDict = OrderedDict()
        self._agents: OrderedDict = OrderedDict()
        self._requests: OrderedDict = OrderedDict()
        self._usage_projects: OrderedDict = OrderedDict()
        self._hook_times: OrderedDict = OrderedDict()
        self._heartbeats: OrderedDict = OrderedDict()
        self.event_listener = None
        if state is not None:
            try:
                saved = state.read()
                self._sessions.update(saved.get("sessions", {}))
                self._hook_times.update(saved.get("hook_times", {}))
            except (OSError, ValueError, TypeError):
                log.warning("Could not load session restart state", exc_info=True)

    def save(self) -> None:
        with self._lock:
            if self.state is not None and self._dirty:
                self.state.replace({"sessions": self._sessions, "hook_times": self._hook_times})
                self._dirty = False

    @staticmethod
    def _remember(cache, key, value) -> None:
        cache[key] = value
        cache.move_to_end(key)
        if len(cache) > _LIMIT:
            cache.popitem(last=False)

    def session(self, row: SessionRow, *, activity: float = 0, terminal: bool = False) -> None:
        self.sessions(((row, activity, terminal),))

    def sessions(self, updates: Iterable[tuple[SessionRow, float, bool]]) -> None:
        """Merge lifecycle updates in order and send the changed rows in one batch."""
        with self._lock:
            staged = OrderedDict()
            for row, activity, terminal in updates:
                sid = row.session_id
                if not sid:
                    continue
                if sid == "aictl-verify":
                    continue
                entry = staged.get(sid, self._sessions.get(sid, {}))
                merged = self._merge_session(row, activity, terminal, entry)
                if merged != entry:
                    staged[sid] = merged
                    staged.move_to_end(sid)
            changed = [
                dict(entry["row"], project=entry["row"]["project_path"])
                for sid, entry in staged.items()
                if entry["row"] != self._sessions.get(sid, {}).get("row")
            ]
            if changed:
                self.writer.upsert("sessions", changed)
                self._retire_projects("sessions", "session_id", self._sessions, {
                    sid: entry["row"] for sid, entry in staged.items()
                }, previous_row=lambda entry: entry["row"])
            for sid, entry in staged.items():
                self._remember(self._sessions, sid, entry)
            if staged:
                self._dirty = True

    @staticmethod
    def _merge_session(row: SessionRow, activity: float, terminal: bool, entry: dict) -> dict:
        incoming = asdict(row)
        prior = entry.get("row")
        merged = dict(prior) if prior else incoming.copy()
        clock = entry.get("clock", 0)
        for name in ("tool", "pid", "project_path", "model", "git_branch", "git_commit", "source"):
            if incoming[name] and (row.source != "otel" or not merged[name]):
                merged[name] = incoming[name]
        starts = [ts for ts in (merged["started_at"], row.started_at) if ts > 0]
        merged["started_at"] = min(starts, default=0.0)
        for name in _COUNTERS:
            merged[name] = max(merged[name], incoming[name])
        if activity and activity >= clock:
            # If two sources share a timestamp, keep the terminal event.
            if activity > clock or terminal:
                merged["ended_at"] = row.ended_at if terminal else None
            clock = activity
        elif not activity and not clock and row.ended_at is not None:
            merged["ended_at"] = max(merged["ended_at"] or 0, row.ended_at)
        return {"row": merged, "clock": clock}

    def started_at(self, session_id: str) -> float:
        with self._lock:
            return self._sessions.get(session_id, {}).get("row", {}).get("started_at", 0)

    def session_tool(self, session_id: str) -> str:
        with self._lock:
            return self._sessions.get(session_id, {}).get("row", {}).get("tool", "")

    def project_for(self, session_id: str) -> str:
        with self._lock:
            return self._sessions.get(session_id, {}).get("row", {}).get("project_path", "")

    def active_session(self, tool: str, project: str, ts: float) -> str:
        project = project_key(project)
        if not project:
            return ""
        with self._lock:
            return max(
                ((row["started_at"], sid) for sid, entry in self._sessions.items()
                 if (row := entry["row"])["tool"] == tool
                 and not row["source"].endswith("-ingester")
                 and row["started_at"] <= ts <= (row["ended_at"] or float("inf"))
                 and project_key(row["project_path"]) == project),
                default=(0, ""),
            )[1]

    def text_floor(self) -> float:
        return max(self.trim_before(), time.time() - self.content_days * 86400)

    def allows_text(self, ts: float) -> bool:
        return self.keeps_text() and ts >= self.text_floor()

    def hook_time(self, call_id: str, ts: float) -> float:
        """A hook without a source timestamp keeps its first receipt time on retry."""
        with self._lock:
            if call_id in self._hook_times:
                return self._hook_times[call_id]
            self._remember(self._hook_times, call_id, ts)
            self._dirty = True
            return ts

    def link(self, sid: str, pid: int, tool: str, ts: float, role: str, project: str = "") -> None:
        self.links(((sid, pid, tool, ts, role, project),))

    def links(self, links: Iterable[tuple[str, int, str, float, str, str]]) -> None:
        rows = [dict(session_id=sid, pid=pid, tool=tool, joined_at=ts, role=role, project=project)
                for sid, pid, tool, ts, role, project in links if sid and pid > 0]
        if rows:
            self.writer.append("session_processes", rows)

    def usage(self, row: dict) -> None:
        sid = row["session_id"]
        with self._lock:
            data = dict(row)
            for name in ("models", "daily"):
                data[f"{name}_json"] = _json(data.pop(name))
            data["unpriced_models"] = _json(data["unpriced_models"])
            prior = self._usage_projects.get(sid, "")
            project = row["project_path"] or prior or self.project_for(sid)
            data.update(project=project, project_path=project, updated_at=time.time())
            self.writer.upsert("session_usage", [data])
            if sid in self._usage_projects and prior != project:
                self.writer.delete("session_usage", [dict(project=prior, session_id=sid)])
            self._remember(self._usage_projects, sid, project)

    def _retire_projects(self, table, key_name, known, updates, *, previous_row=lambda row: row):
        retired = []
        for key, row in updates.items():
            if key in known:
                project = previous_row(known[key])["project_path"]
                if project != row["project_path"]:
                    retired.append({"project": project, key_name: key})
        if retired:
            self.writer.delete(table, retired)

    def requests(self, rows, *, transcript: bool = False) -> None:
        with self._lock:
            staged = {}
            for row in rows:
                data = asdict(row)
                embedded = data.pop("source_ts")
                if transcript:
                    data["source"] = "transcript"
                identity = (str(int(embedded * 1000)), row.model) if embedded > 0 else (
                    row.model, str(row.input_tokens), str(row.output_tokens))
                key = data["dedup_key"] or _dedup_key(row.session_id, *identity, data["source"])
                data.update(dedup_key=key)
                data["cost_usd"] = round(data["cost_usd"], 6)
                for name in ("duration_ms", "ttft_ms"):
                    data[name] = round(data[name], 1)
                prior = staged.get(key, self._requests.get(key))
                if prior and transcript:
                    for name in ("tool_tokens", "max_prompt_tokens", "request_bytes", "available_tools"):
                        if data[name] is None:
                            data[name] = prior[name]
                    for name in ("project_path", "agent_id", "finish_reason", "duration_ms", "ttft_ms"):
                        data[name] = data[name] or prior[name]
                    if data["model"] in ("", "unknown"):
                        data["model"] = prior["model"]
                    data["ts"] = prior["ts"]
                elif prior:
                    continue
                if data != prior:
                    staged[key] = data
            if staged:
                self.writer.upsert("requests", [dict(data, project=data["project_path"]) for data in staged.values()])
                self._retire_projects("requests", "dedup_key", self._requests, staged)
                for key, data in staged.items():
                    self._remember(self._requests, key, data)

    def agents(self, rows) -> None:
        with self._lock:
            staged = OrderedDict()
            text = []
            for row in rows:
                data = asdict(row)
                task = data.pop("task")
                agent_id = row.agent_id
                saved = staged.get(agent_id)
                prior = saved[0] if saved else self._agents.get(agent_id)
                if prior:
                    data = {k: v or prior[k] for k, v in data.items()}
                    data["started_at"] = min(t for t in (data["started_at"], prior["started_at"]) if t) if (
                        data["started_at"] or prior["started_at"]) else 0
                    data["completed"] = max(data["completed"], prior["completed"])
                    if row.ended_at and prior["ended_at"]:
                        data["ended_at"] = max(row.ended_at, prior["ended_at"])
                project = self._sessions.get(row.session_id, {}).get("row", {}).get("project_path", "")
                if data != prior:
                    staged[agent_id] = (data, project)
                    staged.move_to_end(agent_id)
                ts = row.started_at or row.ended_at or time.time()
                if task and self.allows_text(ts):
                    text.append(dict(agent_id=agent_id, task=task, project=project, ts=ts))
            if staged:
                self.writer.upsert("agents", [dict(data, project=project) for data, project in staged.values()])
                for agent_id, (data, _) in staged.items():
                    self._remember(self._agents, agent_id, data)
            if text:
                self.writer.append("agents_text", text)

    def attribution(self, session_ids: list[str], tool: str) -> None:
        if session_ids:
            self.writer.upsert("session_attribution", [dict(project="", session_id=sid, tool=tool)
                                                        for sid in session_ids])

    def events(self, rows, *, source: str, source_key: str = "") -> None:
        output, text = [], []
        keep = self.keeps_text()
        floor = self.text_floor()
        for row in rows:
            if row.kind in ("otel:health", "otel:proc_stats"):
                with self._lock:
                    heartbeat = (row.tool, row.kind, row.session_id)
                    prior = self._heartbeats.get(heartbeat)
                    if prior is not None and 0 <= row.ts - prior < 60:
                        continue
                    self._remember(self._heartbeats, heartbeat, row.ts)
            detail = dict(row.detail)
            trace = str(detail.get("otel.trace_id") or "")
            identity = {k: v for k, v in detail.items() if not (trace and k == "session_id")}
            metadata = strip_event_text(detail)
            if self.event_listener is not None:
                try:
                    self.event_listener(replace(row, detail=detail if keep else metadata))
                except Exception:  # noqa: BLE001 - a live listener must not block capture
                    log.debug("Live event delivery failed", exc_info=True)
            key = source_key or getattr(row, "source_event_id", "") or call_key(
                source, row.tool, row.kind, str(row.ts), _json(identity))
            project = str(detail.get("project_path") or detail.get("cwd") or detail.get("project") or "")
            output.append(dict(ts=row.ts, tool=row.tool, kind=row.kind, detail=_json(metadata),
                               session_id=row.session_id, pid=row.pid, project_path=project, project=project,
                               source_key=key, seq=int(call_key(key), 16) & (2**63 - 1)))
            if keep and row.ts >= floor and detail != metadata:
                text.append(dict(project=project, source_key=key, detail=_json(detail), ts=row.ts))
        if output:
            self.writer.append("events", output)
            if text:
                self.writer.append("events_text", text)

    def trace_links(self, links) -> None:
        if links:
            self.writer.upsert("otel_trace_sessions", [dict(project="", trace_id=tid, session_id=sid)
                                                        for tid, sid in links])

    def hook(self, row) -> None:
        data = asdict(row)
        command, output, payload = (data.pop(k) for k in ("command", "output", "payload"))
        project = row.project_path
        keep = self.allows_text(row.ts or row.received_at)
        self.writer.upsert("hook_calls", [dict(data, project=project,
                                              payload="{}" if keep else _json(strip_event_text(payload)))])
        if keep:
            self.writer.upsert("hook_calls_text", [dict(project=project, call_id=row.call_id,
                                                        command=command, output=output, payload=_json(payload),
                                                        ts=row.ts or row.received_at)])

    def file_writes(self, rows, *, transcript: bool) -> None:
        values = []
        for row in rows:
            data = asdict(row)
            data["dedup_key"] = row.dedup_key or call_key(
                row.session_id, row.operation, row.path, row.source_event_id or str(row.ts))
            if transcript:
                data["source_event_kind"] = "transcript"
            data["detail"] = _json(data["detail"]) if self.allows_text(row.ts) else "{}"
            values.append(dict(data, project=row.project_path))
        if values:
            self.writer.upsert("file_write_events", values)

    def write(self, facts, *, only: str | None = None) -> int:
        if only is None:
            self.requests(facts.requests, transcript=True)
            self.agents(facts.agents)
            self.file_writes(facts.file_writes, transcript=True)
        count = len(facts) if only is None else len(getattr(facts, only))
        for attr, table in _FAMILIES.items():
            rows = getattr(facts, attr)
            if not rows or (only is not None and attr != only):
                continue
            values = []
            for row in rows:
                data = asdict(row)
                project = data.get("project_path", "")
                if attr in ("loaded_files", "context_items"):
                    data.pop("project_path", None)
                if attr == "prompts":
                    if not self.allows_text(row.ts):
                        data["text"] = ""
                    if row.ts < time.time() - self.content_days * 86400:
                        continue
                values.append(dict(data, project=project))
            self.writer.append(table, values)
        if only is None and facts.steps:
            metadata, text = [], []
            floor = self.text_floor()
            for step in facts.steps:
                data = asdict(step)
                content = data.pop("text")
                data["project"] = step.project_path
                if content and step.ts >= floor and self.keeps_text():
                    text.append(dict(project=step.project_path, step_key=step.step_key,
                                     session_id=step.session_id, ts=step.ts, text=content[:STEP_TEXT_LIMIT]))
                elif content:
                    data["text_status"] = "expired" if self.keeps_text() else "withheld"
                metadata.append(data)
            self.writer.append("session_steps", metadata)
            self.writer.append("session_step_text", text)
        pace = getattr(self.writer, "pace", None)
        if callable(pace):
            pace()
        return count

    write_call_facts = write
    upsert_session = session
    upsert_session_usage = usage
    def _keeps_text(self) -> bool:
        return self.keeps_text()
