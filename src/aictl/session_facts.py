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

from . import context_lists
from .data.model_pricing import canonical_model_id
from .ingesters.session_titles import clean_title, outranks
from .memory_changes import ABSENT, BLOB_MAX_BYTES, PREVIOUS_VERSION, blob_hash, fill_write
from .records import TEXT_PREVIEW_CHARS, SessionRow, _dedup_key, newer_observation, strip_event_text
from .session_lifecycle import END_GRACE_S, END_OBSERVED, PROCESS_SOURCE
from .state_file import StateFile
from .stores import writer_or_discard
from .stores.base import InvalidRowError
from .stores.kusto.tables import TABLES
from .tool_calls import call_key

_LIMIT = 20_000
# The agent rows the restart state keeps (the newest written).
AGENTS_KEPT_ACROSS_RESTART = 2_000
PAYLOAD_CHUNK_CHARS = 200_000  # a chunk stays under what one Kusto string value holds
log = logging.getLogger(__name__)
_COUNTERS = ("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens",
             "cost_usd", "request_count", "tool_call_count")
# What a telemetry report of a model call knows and its transcript line may not.
_TELEMETRY_ONLY = ("duration_ms", "ttft_ms", "prompt_id", "pid", "finish_reason", "request_id", "response_id")
# What a request tombstone must carry of the row it deletes; a waiting telemetry call keeps it.
_TOMBSTONE_SCOPE = TABLES["requests"].tombstone_scope
_FAMILIES = {
    "prompts": "session_prompts", "skills": "skill_uses", "context_events": "context_events",
    "loaded_files": "session_loaded_files", "context_items": "session_context_items",
    "cost_links": "turn_request_links", "turns": "session_turns", "session_files": "session_files",
    "outcomes": "session_outcomes", "digests": "session_digests", "thinking": "session_thinking",
    "file_versions": "file_history", "commits": "session_commits",
}


def _child_row(kind: str, data: dict):
    """A held child row read back from the restart state."""
    from .records import AgentRow, SessionTurnRow

    return (AgentRow if kind == "agents" else SessionTurnRow)(**data)


# Values a write row lacks: another report of the same write may fill them.
_UNSET = ("", None, 0, "{}")


def _json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, default=str)


class SessionFacts:
    def __init__(self, writer, *, keeps_text=lambda: False, state: StateFile | None = None,
                 content_days: int = 14, trim_before=lambda: 0.0, retention: dict[str, int] | None = None,
                 large_payload_bytes: int = 32768) -> None:
        self.writer = writer_or_discard(writer)
        self.keeps_text = keeps_text
        self.state = state
        self.content_days = content_days
        # Hours each retention class is kept (stores.kusto.tables.TABLE_RETENTION_CLASS): text older than its
        # class keeps is not imported. Without a configuration, text classes keep content_days.
        self.retention = {**dict.fromkeys(("text", "message", "file_text"), content_days * 24),
                          "prompt": 365 * 24, "thinking": 365 * 24, "tool_content": 24, "large_payload": 24,
                          **(retention or {})}
        self.large_payload_bytes = large_payload_bytes
        self.trim_before = trim_before
        self._lock = threading.RLock()
        self._dirty = False
        self._sessions: OrderedDict = OrderedDict()
        self._agents: OrderedDict = OrderedDict()
        # The files_changed of each session's last outcome row: the session row's files_modified.
        self._outcome_files: OrderedDict = OrderedDict()
        # Agent rows known from the restart state only: the store may hold a newer version of them.
        self._restored_agents: set[tuple[str, str]] = set()
        self._requests: OrderedDict = OrderedDict()
        self._usage_projects: OrderedDict = OrderedDict()
        self._hook_times: OrderedDict = OrderedDict()
        self._heartbeats: OrderedDict = OrderedDict()
        # A model call reported by OpenTelemetry and read again from the transcript is one
        # call. Both carry the same four token counts, so the n-th call of a session with
        # the same counts is paired; these hold the calls still waiting for the other side.
        self._otel_calls: OrderedDict = OrderedDict()
        self._transcript_calls: OrderedDict = OrderedDict()
        self._call_counts: OrderedDict = OrderedDict()
        # list_id -> when this node last wrote that list to context_lists (see context_lists.py).
        self._lists: OrderedDict = OrderedDict()
        # The last stored row of each recent write event, by dedup_key (see file_writes).
        self._file_writes: OrderedDict = OrderedDict()
        # path -> (dedup_key, ts, after_hash, after_bytes) of the last stored change of a memory file.
        self._versions: OrderedDict = OrderedDict()
        # The file_blobs hashes this process has stored.
        self._blobs: OrderedDict = OrderedDict()
        # A session's child rows (agents, agents_text, session_turns) are filed under the project of
        # the session row. Rows of a session this node holds no row of yet wait here, by session id;
        # _filed holds what each written child row was filed under, so it moves with its session.
        self._waiting_children: OrderedDict = OrderedDict()
        self._filed: OrderedDict = OrderedDict()
        self.event_listener = None
        if state is not None:
            try:
                saved = state.read()
                self._sessions.update(saved.get("sessions", {}))
                self._hook_times.update(saved.get("hook_times", {}))
                self._lists.update(saved.get("context_lists", {}))
                for key, row in saved.get("agents", []):
                    self._agents[tuple(key)] = row
                    self._restored_agents.add(tuple(key))
                for counts, waiting in saved.get("otel_calls", []):
                    self._otel_calls[tuple(counts)] = waiting
                for sid, rows in saved.get("waiting_children", []):
                    self._waiting_children[sid] = [(kind, _child_row(kind, row)) for kind, row in rows]
            except (OSError, ValueError, TypeError):
                log.warning("Could not load session restart state", exc_info=True)

    def save(self) -> None:
        with self._lock:
            if self.state is not None and self._dirty:
                self.state.replace({"sessions": self._sessions, "hook_times": self._hook_times,
                                    "otel_calls": list(self._otel_calls.items()), "context_lists": self._lists,
                                    # The newest agent rows: an agent row is written whole, so a row a reader
                                    # gives after a restart (a call's agent id, no end) must merge with the
                                    # stored one, not replace its end, status and label.
                                    "agents": [[list(key), row] for key, row in
                                               list(self._agents.items())[-AGENTS_KEPT_ACROSS_RESTART:]],
                                    "waiting_children": [[sid, [[kind, asdict(row)] for kind, row in rows]]
                                                         for sid, rows in self._waiting_children.items()]})
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
                row = self._gated(row)
                entry = staged.get(sid, self._sessions.get(sid, {}))
                merged = self._merge_session(row, activity, terminal, entry)
                if (files := self._outcome_files.get(sid)) is not None:
                    merged["row"]["files_modified"] = files
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
            moved = {sid: (self._sessions[sid]["row"]["project_path"] if sid in self._sessions else None,
                           entry["row"]["project_path"]) for sid, entry in staged.items()}
            for sid, entry in staged.items():
                self._remember(self._sessions, sid, entry)
            if staged:
                self._dirty = True
            for sid, (before, after) in moved.items():
                if before is not None and before != after:
                    self._move_children(sid, before, after)
                if sid in self._waiting_children:
                    self._release_children(sid)

    def _hold_child(self, sid: str, kind: str, row) -> None:
        """Keep a child row of a session this node holds no row of: it is written under that
        session's project when the session row comes (never under a guessed one)."""
        self._waiting_children.setdefault(sid, []).append((kind, row))
        self._waiting_children.move_to_end(sid)
        self._dirty = True
        if len(self._waiting_children) > _LIMIT:
            _, rows = self._waiting_children.popitem(last=False)
            log.warning("%d child rows of a session with no session row are left out", len(rows))

    def _release_children(self, sid: str) -> None:
        rows = self._waiting_children.pop(sid, [])
        self._dirty = True
        agents = [row for kind, row in rows if kind == "agents"]
        turns = [row for kind, row in rows if kind == "turns"]
        if agents:
            self.agents(agents)
        if turns:
            self._turns(turns)

    def _file(self, table: str, key: tuple, project: str, row: dict) -> None:
        self._remember(self._filed, (table, *key), (project, row))

    def _move_children(self, sid: str, before: str, after: str) -> None:
        """The session's row moved from project *before* to *after*: so do its child rows, each
        with a tombstone under the old project, as the session row itself."""
        moved: dict[str, list[tuple[tuple, dict]]] = {}
        for filed_key, (project, row) in list(self._filed.items()):
            table, *key = filed_key
            if key[0] == sid and project == before:
                moved.setdefault(table, []).append((tuple(key), row))
        for table, items in moved.items():
            if table == "agents":
                items = [(key, self._agents.get(key, row)) for key, row in items]
            self.writer.delete(table, [dict(row, project=before) for _, row in items])
            self.writer.upsert(table, [dict(row, project=after) for _, row in items])
            for key, row in items:
                self._file(table, key, after, row)

    def _turns(self, rows) -> None:
        """session_turns rows, under the project of their session row."""
        values = []
        with self._lock:
            for row in rows:
                if row.session_id not in self._sessions:
                    self._hold_child(row.session_id, "turns", row)
                    continue
                project = self.project_for(row.session_id)
                data = asdict(row)
                self._file("session_turns", (row.session_id, row.prompt_id), project, data)
                values.append(dict(data, project=project))
        if values:
            self.writer.append("session_turns", values)

    def _gated(self, row: SessionRow) -> SessionRow:
        """A name made from prompt text is stored only while the store keeps text."""
        if row.title_source == "prompt" and not self.keeps_text():
            return replace(row, title="", title_source="")
        return row

    def titles(self, items: Iterable[tuple[str, tuple[str, str]]] | dict[str, tuple[str, str]]) -> set[str]:
        """Give stored sessions a name. Returns the ids this node has no session row for.

        A row is sent whole, so a session this node holds no row for is left alone: its
        name arrives with its first row.
        """
        pairs = items.items() if isinstance(items, dict) else items
        unknown: set[str] = set()
        with self._lock:
            staged = OrderedDict()
            for sid, (text, source) in pairs:
                entry = staged.get(sid, self._sessions.get(sid))
                if not entry:
                    unknown.add(sid)
                    continue
                if source == "prompt" and not self.keeps_text():
                    continue
                merged = dict(entry["row"])
                if self._set_title(merged, clean_title(text), source):
                    staged[sid] = {"row": merged, "clock": entry.get("clock", 0)}
            if staged:
                self.writer.upsert("sessions", [dict(e["row"], project=e["row"]["project_path"])
                                                 for e in staged.values()])
                for sid, entry in staged.items():
                    self._remember(self._sessions, sid, entry)
                self._dirty = True
        return unknown

    @staticmethod
    def _set_title(row: dict, text: str, source: str) -> bool:
        if not outranks(row.get("title", ""), row.get("title_source", ""), text, source):
            return False
        row["title"], row["title_source"] = text, source
        return True

    def retire(self, sessions: Iterable[tuple[str, str]]) -> None:
        """Delete session rows that stand for another session, such as a monitor row for a bound process.

        Takes ``(session_id, project)`` or ``(session_id, project, merged_into)``; the project of the
        row already written wins. ``merged_into`` is the session that holds the deleted one's
        processes now: the tombstone keeps it, so rows that name the deleted id (events,
        session_processes) still find their session by a key.
        """
        with self._lock:
            gone = []
            for sid, project, *into in sessions:
                entry = self._sessions.pop(sid, None)
                if entry is not None:
                    project = entry["row"]["project_path"]
                    self._dirty = True
                # The tombstone is the last row written, when this node holds it.
                gone.append(dict(entry["row"] if entry else {}, project=project, session_id=sid,
                                 merged_into=(into[0] if into else "") or ""))
            if gone:
                self.writer.delete("sessions", gone)

    @staticmethod
    def _merge_session(row: SessionRow, activity: float, terminal: bool, entry: dict) -> dict:
        incoming = asdict(row)
        if row.source == "otel":
            incoming["title"] = incoming["title_source"] = ""
        prior = entry.get("row")
        merged = dict(prior) if prior else incoming.copy()
        clock = entry.get("clock", 0)
        for name in ("tool", "pid", "project_path", "model", "git_branch", "git_commit", "source", "resumed_from"):
            # OTel and process evidence only fill what is empty; a process still sets the pid.
            fills_only = row.source == "otel" or (row.source == PROCESS_SOURCE and name != "pid")
            if incoming[name] and (not fills_only or not merged.get(name)):
                merged[name] = incoming[name]
        SessionFacts._set_title(merged, incoming["title"], incoming["title_source"])
        starts = [ts for ts in (merged["started_at"], row.started_at) if ts > 0]
        merged["started_at"] = min(starts, default=0.0)
        for name in _COUNTERS:
            merged[name] = max(merged[name], incoming[name])
        # One source: the files the session's outcome row counts (files_changed), never a reader's own count.
        merged["files_modified"] = prior.get("files_modified", 0) if prior else 0
        # Lifecycle: an event with a time (activity) orders by the clock; a row without one
        # (a transcript's idle end) ends the session only when it is newer than the clock, so
        # an idle end cannot close a session that a live process or a hook reported later.
        merged["last_activity_at"] = max(merged.get("last_activity_at") or 0.0, row.last_activity_at)
        merged.setdefault("end_reason", "")
        if activity and activity >= clock:
            # If two sources share a timestamp, keep the terminal event.
            # A second observed end (the process exits after the hook reported the end) keeps the first.
            already = terminal and merged["ended_at"] is not None and merged["end_reason"] in END_OBSERVED
            if (activity > clock or terminal) and not already:
                merged["ended_at"] = row.ended_at if terminal else None
                merged["end_reason"] = row.end_reason if terminal and row.ended_at is not None else ""
            clock = activity
        elif not activity and row.ended_at is not None and row.ended_at > clock:
            if row.ended_at >= (merged["ended_at"] or 0):
                merged["ended_at"] = row.ended_at
                merged["end_reason"] = row.end_reason
        if merged["ended_at"] is not None and merged["last_activity_at"] > merged["ended_at"] + END_GRACE_S:
            # The session did something after its end: it was resumed.
            merged["ended_at"] = None
            merged["end_reason"] = ""
        return {"row": merged, "clock": clock}

    def _files_modified(self, outcomes: list[dict]) -> None:
        """Give each known session the file count of its outcome row, so sessions.files_modified and
        session_outcomes.files_changed are one number. A session this node holds no row of keeps
        its stored row: a session row is written whole."""
        with self._lock:
            changed = []
            for outcome in outcomes:
                count = outcome.get("files_changed")
                if count is None:
                    continue
                self._remember(self._outcome_files, outcome["session_id"], int(count))
                entry = self._sessions.get(outcome["session_id"])
                if entry is None or entry["row"].get("files_modified") == count:
                    continue
                entry["row"] = dict(entry["row"], files_modified=int(count))
                self._remember(self._sessions, outcome["session_id"], entry)
                changed.append(dict(entry["row"], project=entry["row"]["project_path"]))
            if changed:
                self.writer.upsert("sessions", changed)
                self._dirty = True

    def started_at(self, session_id: str) -> float:
        with self._lock:
            return self._sessions.get(session_id, {}).get("row", {}).get("started_at", 0)

    def session_tool(self, session_id: str) -> str:
        with self._lock:
            return self._sessions.get(session_id, {}).get("row", {}).get("tool", "")

    def project_for(self, session_id: str) -> str:
        with self._lock:
            return self._sessions.get(session_id, {}).get("row", {}).get("project_path", "")

    def text_floor(self, cls: str = "text") -> float:
        """The oldest time whose text of retention class *cls* (text, prompt, thinking) is still kept."""
        return max(self.trim_before(), time.time() - self.retention.get(cls, self.content_days * 24) * 3600)

    def allows_text(self, ts: float, cls: str = "text") -> bool:
        return self.keeps_text() and ts >= self.text_floor(cls)

    def spill(self, table: str, key: str, field: str, text: str, *, ts: float, session_id: str = "",
              project: str = "") -> str:
        """The value to store in *table*: *text* itself, or for a large one a preview with its size.

        The full text of a value over ``large_payload_bytes`` goes to ``text_payloads`` in chunks,
        kept as long as the ``large_payload`` class (24 hours by default). The preview says so,
        so a reader shows it as it is once the full text is gone. Prompts and thinking never come here.
        """
        size = len(text.encode("utf-8", "replace"))
        if size <= self.large_payload_bytes:
            return text
        # Two sessions can use the same key for their own value (their summary #1): the stored
        # key names the session, so one never overwrites the other.
        if session_id and session_id not in key:
            key = f"{session_id}/{key}"
        period = self.retention["large_payload"]
        kept = f"{period // 24} days" if period % 24 == 0 and period > 48 else f"{period} hours"
        if self.allows_text(ts, "large_payload"):
            chunks = [text[i:i + PAYLOAD_CHUNK_CHARS] for i in range(0, len(text), PAYLOAD_CHUNK_CHARS)]
            self.writer.append("text_payloads", [
                dict(project=project, source_table=table, source_key=key, field=field, chunk_no=n,
                     chunk_count=len(chunks), total_bytes=size, session_id=session_id, ts=ts, text=chunk)
                for n, chunk in enumerate(chunks)])
        return (f"{text[:TEXT_PREVIEW_CHARS]}\n[preview of {size} bytes; the full text is kept {kept} in "
                f"text_payloads ({table}, {field}, {key}) and is no longer retained after that]")

    def blobs(self, contents: Iterable[tuple[str, str, float]]) -> None:
        """Store file or summary contents once per hash in file_blobs (the file_text class): (hash, text, ts)."""
        with self._lock:
            # A memory file loaded in every turn is the same content each time: it is stored once.
            rows = {digest: dict(project="", hash=digest, content=text, size_bytes=len(text.encode("utf-8", "replace")),
                                 created_at=ts)
                    for digest, text, ts in contents
                    if digest and digest not in self._blobs and self.allows_text(ts, "file_text")}
            if rows:
                self.writer.upsert("file_blobs", list(rows.values()))
                for digest in rows:
                    self._remember(self._blobs, digest, True)

    def _digest_text(self, row, project: str) -> dict:
        """A digest's stored text. A large one keeps a preview here and its whole text in file_blobs.

        A summary is the record of what a checkpoint kept, so its whole text is kept as long as file
        contents (365 days by default), not as a 24-hour large payload. The blob is content-addressed,
        so two sessions' summaries can never overwrite each other.
        """
        raw = row.text.encode("utf-8", "replace")
        if len(raw) <= self.large_payload_bytes:
            return dict(text=row.text, text_hash="", text_bytes=len(raw))
        if len(raw) > BLOB_MAX_BYTES or not self.allows_text(row.ts, "file_text"):
            return dict(text=self.spill("session_digests", f"{row.agent_id}/{row.kind}:{row.seq}", "text", row.text,
                                        ts=row.ts, session_id=row.session_id, project=project),
                        text_hash="", text_bytes=len(raw))
        digest = blob_hash(raw)
        self.blobs([(digest, row.text, row.ts)])
        return dict(text=f"{row.text[:TEXT_PREVIEW_CHARS]}\n[preview of {len(raw)} bytes; the full text is kept in "
                         f"file_blobs under text_hash {digest}]", text_hash=digest, text_bytes=len(raw))

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
                # This node keeps only the project of the earlier row; the rest is the same session's.
                self.writer.delete("session_usage", [dict(data, project=prior, project_path=prior)])
            self._remember(self._usage_projects, sid, project)

    def _retire_projects(self, table, key_name, known, updates, *, previous_row=lambda row: row):
        retired = []
        for key, row in updates.items():
            if key in known:
                previous = previous_row(known[key])
                project = previous["project_path"]
                if project != row["project_path"]:
                    retired.append(dict(previous, project=project))
        if retired:
            self.writer.delete(table, retired)

    @staticmethod
    def _call_counts_of(data: dict) -> tuple | None:
        counts = tuple(int(data[name] or 0) for name in (
            "input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens"))
        return (data["session_id"], *counts) if data["session_id"] and any(counts) else None

    def _waiting(self, cache: OrderedDict, counts: tuple | None) -> list:
        return cache.get(counts, []) if counts else []

    def _wait(self, cache: OrderedDict, counts: tuple, entry) -> None:
        self._remember(cache, counts, [*cache.get(counts, []), entry])

    def _take(self, cache: OrderedDict, counts: tuple):
        waiting = cache[counts]
        entry = waiting.pop(0)
        if not waiting:
            del cache[counts]
        return entry

    def requests(self, rows, *, transcript: bool = False) -> None:
        with self._lock:
            staged = {}
            dropped = []
            for row in rows:
                data = asdict(row)
                embedded = data.pop("source_ts")
                if transcript:
                    data["source"] = "transcript"
                identity = (str(int(embedded * 1000)), row.model) if embedded > 0 else (
                    row.model, str(row.input_tokens), str(row.output_tokens))
                key = data["dedup_key"] or _dedup_key(row.session_id, *identity, data["source"])
                data.update(dedup_key=key)
                # One spelling per model whichever reader reports it (Copilot writes claude-opus-5.5).
                data["model"] = canonical_model_id(data["model"])
                if data["finish_reason"] == "error" and not data["is_error"]:
                    # The source reports the call as ended by an error (Copilot finishReason "error").
                    data.update(is_error=1, error_type=data["error_type"] or "error")
                if data["cost_usd"] is not None:
                    data["cost_usd"] = round(data["cost_usd"], 6)
                for name in ("duration_ms", "ttft_ms"):
                    data[name] = round(data[name], 1)
                prior = staged.get(key, self._requests.get(key))
                counts = self._call_counts_of(data)
                if transcript:
                    waited = self._call_counts.get(key)
                    if waited != "paired" and waited != counts:
                        # A reply still streaming is read with growing counts: the call
                        # waits under its latest counts only.
                        if waited in self._transcript_calls and key in self._transcript_calls[waited]:
                            self._transcript_calls[waited].remove(key)
                            if not self._transcript_calls[waited]:
                                del self._transcript_calls[waited]
                        if counts and self._waiting(self._otel_calls, counts):
                            reported = self._take(self._otel_calls, counts)
                            # The tombstone is the telemetry row as stored, so a view that selects
                            # the session's rows before it reduces versions also sees the delete.
                            stored = staged.pop(reported["dedup_key"], None) or self._requests.pop(
                                reported["dedup_key"], None) or {**data, "source": "otel", **reported}
                            self._requests.pop(reported["dedup_key"], None)
                            dropped.append(dict(stored, project=reported["project_path"]))
                            self._remember(self._call_counts, reported["dedup_key"], "paired")
                            for name in _TELEMETRY_ONLY:
                                data[name] = data[name] or reported.get(name)
                            self._remember(self._call_counts, key, "paired")
                        elif counts:
                            self._wait(self._transcript_calls, counts, key)
                            self._remember(self._call_counts, key, counts)
                elif data["source"] == "otel" and not prior and counts:
                    if self._call_counts.get(key) == "paired":
                        continue  # a retried export of a call already paired
                    if self._waiting(self._transcript_calls, counts):
                        self._remember(self._call_counts, key, "paired")
                        # The transcript already stored this call: add what only the
                        # telemetry knows and store nothing under a second key.
                        key = self._take(self._transcript_calls, counts)
                        self._remember(self._call_counts, key, "paired")
                        read = staged.get(key, self._requests.get(key))
                        if read:
                            merged = dict(read)
                            for name in _TELEMETRY_ONLY:
                                merged[name] = merged[name] or data[name]
                            if merged != read:
                                staged[key] = merged
                        continue
                    self._wait(self._otel_calls, counts, {
                        name: data[name] for name in ("dedup_key", "project_path", *_TELEMETRY_ONLY,
                                                      *_TOMBSTONE_SCOPE)})
                    self._dirty = True
                if prior and transcript:
                    for name in ("tool_tokens", "max_prompt_tokens", "request_bytes", "available_tools",
                                 "turn_index", "thinking_ms", "thinking_chars", "thinking_blocks",
                                 "thinking_redacted", "thinking_tokens"):
                        if data[name] is None:
                            data[name] = prior[name]
                    for name in ("project_path", "agent_id", "finish_reason", "duration_ms", "ttft_ms",
                                 "request_id", "response_id", "api_call_id", "effort", "prompt_id",
                                 "attribution_mcp_server",
                                 "attribution_skill", "requested_model"):
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
            if dropped:
                self.writer.delete("requests", dropped)
                self._dirty = True

    def agents(self, rows) -> None:
        """Merge agent rows by (session, agent id): an agent id is unique only within its session
        (a resumed Claude Code session copies its subagents' files, ids included)."""
        with self._lock:
            staged = OrderedDict()
            text = []
            for row in rows:
                if not row.session_id or not row.agent_id:
                    log.debug("An agent row without a session or agent id is not stored")
                    continue
                if row.session_id not in self._sessions:
                    self._hold_child(row.session_id, "agents", row)
                    continue
                data = asdict(row)
                task = data.pop("task")
                data["model"] = canonical_model_id(data["model"])
                data["resolved_model"] = canonical_model_id(data["resolved_model"])
                key = (row.session_id, row.agent_id)
                saved = staged.get(key)
                prior = saved[0] if saved else self._agents.get(key)
                if prior:
                    data = {k: v or prior[k] for k, v in data.items()}
                    data["started_at"] = min(t for t in (data["started_at"], prior["started_at"]) if t) if (
                        data["started_at"] or prior["started_at"]) else 0
                    # Finished or not is what the latest observation says (a resumed agent runs
                    # again), never the maximum of all rows.
                    if newer_observation(row.observed_at, prior.get("observed_at")):
                        data["completed"], data["ended_at"] = row.completed, row.ended_at
                    else:
                        for name in ("completed", "ended_at", "observed_at"):
                            data[name] = prior.get(name)
                project = self._sessions.get(row.session_id, {}).get("row", {}).get("project_path", "")
                if data != prior:
                    staged[key] = (data, project)
                    staged.move_to_end(key)
                ts = row.started_at or row.ended_at or time.time()
                if task and self.allows_text(ts):
                    task = self.spill("agents_text", f"{row.session_id}/{row.agent_id}", "task", task, ts=ts,
                                      session_id=row.session_id, project=project)
                    text_row = dict(session_id=row.session_id, agent_id=row.agent_id, task=task, ts=ts)
                    self._file("agents_text", key, project, text_row)
                    text.append(dict(text_row, project=project))
            if staged:
                self.writer.upsert("agents", [dict(data, project=project) for data, project in staged.values()])
                for key, (data, project) in staged.items():
                    self._remember(self._agents, key, data)
                    self._file("agents", key, project, data)
                    self._restored_agents.discard(key)
                self._dirty = True
            if text:
                self.writer.append("agents_text", text)

    def forget_agents(self, keys: Iterable[tuple[str, str]]) -> None:
        """Delete the agent rows of (session, agent id) pairs the evidence says do not exist, such as
        a resumed session's copy of an earlier session's subagent. Rows are stored under the project
        of their session's row."""
        with self._lock:
            gone = []
            for sid, agent_id in keys:
                if sid in self._waiting_children:
                    # A row still waiting for its session row is dropped before it is ever written.
                    self._waiting_children[sid] = [
                        (kind, row) for kind, row in self._waiting_children[sid]
                        if not (kind == "agents" and row.agent_id == agent_id)]
                prior = self._agents.pop((sid, agent_id), None) or {}
                gone.append(dict(prior, project=self.project_for(sid), session_id=sid, agent_id=agent_id))
            if gone:
                self.writer.delete("agents", gone)

    def complete_agents(self, items: Iterable[tuple[dict, dict]]) -> int:
        """Give stored agent rows fields they lack. Each item is (the stored row, its ``project``
        included; the fields its evidence gives). A field the row has is kept; a row is written
        whole, under its stored project, only when it gains a field. A version this node wrote
        since its start is the row that gains them. Returns the rows written."""
        with self._lock:
            staged = []
            for stored, fields in items:
                key = (stored["session_id"], stored["agent_id"])
                cached = None if key in self._restored_agents else self._agents.get(key)
                data = dict(cached or {k: v for k, v in stored.items() if k != "project"})
                gained = {k: v for k, v in fields.items() if v not in (None, "") and data.get(k) in (None, "")}
                if gained:
                    staged.append((key, {**data, **gained}, stored["project"]))
            if staged:
                self.writer.upsert("agents", [dict(data, project=project) for _, data, project in staged])
                for key, data, _ in staged:
                    self._remember(self._agents, key, data)
                    self._restored_agents.discard(key)
            return len(staged)

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
                text.append(dict(project=project, source_key=key, ts=row.ts, detail=self.spill(
                    "events_text", key, "detail", _json(detail), ts=row.ts, session_id=row.session_id, project=project)))
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
        keep = self.allows_text(row.ts or row.received_at, "tool_content")
        self.writer.upsert("hook_calls", [dict(data, project=project,
                                              payload="{}" if keep else _json(strip_event_text(payload)))])
        if keep:
            self.writer.upsert("hook_calls_text", [dict(project=project, call_id=row.call_id,
                                                        command=command, output=output, payload=_json(payload),
                                                        ts=row.ts or row.received_at)])

    def file_writes(self, rows, *, transcript: bool) -> None:
        """Store write events. A hook and the transcript report one edit under one key (see
        ``memory_changes.claude_write_key``): the row is the transcript's, with what only the hook
        knows (its pid, the hash of the text it sent) kept from whichever came first."""
        values = []
        with self._lock:
            for row in rows:
                fill_write(row)
                key = row.dedup_key or call_key(row.session_id, row.operation, row.path, row.source_event_id or str(row.ts))
                if row.mechanism:
                    self._previous_version(row, key)
                data = asdict(row)
                data["dedup_key"] = key
                if transcript:
                    data["source_event_kind"] = "transcript"
                data["detail"] = _json(data["detail"]) if self.allows_text(row.ts) else "{}"
                data["project"] = row.project_path
                prior = self._file_writes.get(data["dedup_key"])
                if prior is not None:
                    later_hook = not transcript and prior["source_event_kind"] == "transcript"
                    winner, other = (prior, data) if later_hook else (data, prior)
                    merged = dict(winner)
                    for name, value in other.items():
                        if merged.get(name) in _UNSET and value not in _UNSET:
                            merged[name] = value
                    if merged == prior:
                        continue
                    data = merged
                self._remember(self._file_writes, data["dedup_key"], data)
                values.append(data)
        if values:
            self.writer.upsert("file_write_events", values)

    def _previous_version(self, row, key: str) -> None:
        """A memory change whose source has no before-image starts from the after-image of the last
        change of its path this node stored (before_source ``previous_version``); a change made between
        the two that no event reported is then inside the diff. Only an earlier change counts."""
        last = self._versions.get(row.path)
        if (last and last[0] != key and last[1] <= row.ts and not row.before_hash
                and not row.before_source.startswith(ABSENT)):
            row.before_hash, row.before_bytes, row.before_source = last[2], last[3], PREVIOUS_VERSION
        if row.after_hash and (not last or last[1] <= row.ts):
            self._remember(self._versions, row.path, (key, row.ts, row.after_hash, row.after_bytes))

    def _list_refresh_s(self) -> float:
        """How long a written list counts as stored. Retention drops a list's rows by their age, so
        a list still pointed to is written again within this period: a pointer outlives its list's
        rows by at most this long at the end of its own retention."""
        return min(24 * 3600.0, self.retention.get("history", 365 * 24) * 3600 / 8)

    def _context_items(self, values: list[dict]) -> list[dict]:
        """The rows for session_context_items, after the lists not yet stored went to context_lists."""
        rows, lists = context_lists.group(values)
        now = time.time()
        with self._lock:
            new = {lid: items for lid, items in lists.items()
                   if now - self._lists.get(lid, float("-inf")) >= self._list_refresh_s()}
            if new:
                self.writer.append("context_lists", [item for items in new.values() for item in items])
                for lid in new:
                    self._remember(self._lists, lid, now)
                self._dirty = True
        return rows

    def write(self, facts, *, only: str | None = None) -> int:
        if only is None:
            self.requests(facts.requests, transcript=True)
            self.agents(facts.agents)
            # Contents first: a write row never points to a blob that is not stored yet.
            self.blobs(facts.blobs)
            self.file_writes(facts.file_writes, transcript=True)
        count = len(facts) if only is None else len(getattr(facts, only))
        for attr, table in _FAMILIES.items():
            rows = getattr(facts, attr)
            if not rows or (only is not None and attr != only):
                continue
            if attr == "turns":
                self._turns(rows)
                continue
            values = []
            for row in rows:
                data = dict(row) if isinstance(row, dict) else asdict(row)
                project = data.get("project_path", "")
                if attr in ("loaded_files", "context_items", "digests", "thinking", "commits"):
                    data.pop("project_path", None)
                if attr == "digests":
                    if not self.allows_text(row.ts):
                        continue
                    data.update(self._digest_text(row, project))
                if attr == "thinking" and not self.allows_text(row.ts, "thinking"):
                    continue
                if attr == "context_events":
                    data["detail"] = _json(data["detail"]) if data["detail"] else ""
                if attr == "prompts":
                    if not self.allows_text(row.ts, "prompt"):
                        data["text"] = ""
                    if row.ts < time.time() - self.retention["prompt"] * 3600:
                        continue
                values.append(dict(data, project=project))
            if attr == "context_items":
                values = self._context_items(values)
            if attr == "outcomes":
                self._files_modified(values)
            try:
                self.writer.append(table, values)
            except InvalidRowError:
                # A row the table can never take failed the whole handoff: the reader sent the
                # same batch again at every poll and no later session file was ever read. The
                # rows go again one at a time and that row is left out with a warning. A row
                # the failed batch had already handed over is handed over twice, once.
                for value in values:
                    try:
                        self.writer.append(table, [value])
                    except InvalidRowError as exc:
                        count -= 1
                        log.warning("A %s row is left out, it can never be stored: %s", table, exc)
        if only is None and facts.steps:
            metadata, text = [], []
            floor = self.text_floor("message")
            for step in facts.steps:
                data = asdict(step)
                content = data.pop("text")
                data["project"] = step.project_path
                if content and step.ts >= floor and self.keeps_text():
                    stored = self.spill("session_step_text", step.step_key, "text", content, ts=step.ts,
                                        session_id=step.session_id, project=step.project_path)
                    if stored is not content:  # only a preview stays in session_step_text
                        data["text_status"] = "truncated"
                    text.append(dict(project=step.project_path, step_key=step.step_key,
                                     session_id=step.session_id, ts=step.ts, text=stored))
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
