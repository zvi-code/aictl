"""Reconcile tool call observations before handing complete rows to the store."""

from __future__ import annotations

import hashlib
import json
import threading
import time
from collections import OrderedDict, defaultdict
from collections.abc import Callable, Iterable
from dataclasses import replace
from typing import TYPE_CHECKING

from .records import COPILOT_STORE_SOURCE
from .stores import writer_or_discard
from .stores.base import Row, Writer
from .tool_targets import describe_call, split_mcp

# Sources that are the tool's own record of its calls: they win over hooks and telemetry.
_OWN_RECORD = frozenset({"transcript", COPILOT_STORE_SOURCE})
# The fields of a ToolInvocationRow that say what the call acted on (``target_id`` is column ``target``).
_TARGET_FIELDS = ("target_kind", "target_id", "target_chars", "target_truncated", "command_name", "url_host",
                  "search_path", "arg_names", "read_offset", "read_limit", "agent_label")

if TYPE_CHECKING:
    from .records import ToolInvocationRow


def call_key(*parts: str) -> str:
    return hashlib.sha256("".join(parts).encode("utf-8", errors="replace")).hexdigest()[:16]


def _key(row: ToolInvocationRow) -> str:
    if row.dedup_key and row.source != "otel":
        return row.dedup_key
    if row.source_event_id:
        if row.source == "hook" and row.tool == "claude-code":
            return call_key("claude-tool", row.source_event_id)
        return call_key(row.session_id, row.tool_name, row.source_event_id, row.source)
    if row.source_ts > 0:
        return call_key(row.session_id, str(int(row.source_ts * 1000)), row.tool_name)
    return call_key(row.session_id, row.tool_name, json.dumps(row.input, sort_keys=True, default=str),
                    str(row.is_error), row.source)


class ToolCalls:
    def __init__(self, writer: Writer | None, *, keeps_text: Callable[[], bool], limit: int = 20_000,
                 text_floor: Callable[[], float] = lambda: 0.0) -> None:
        self._writer = writer_or_discard(writer)
        self._keeps_text = keeps_text
        # Tool content (arguments, edit text, result excerpt) older than its retention is not written.
        self._text_floor = text_floor
        self._limit = limit
        self._lock = threading.Lock()
        self._calls: OrderedDict[str, tuple[Row, Row]] = OrderedDict()
        self._sessions: dict[str, set[str]] = defaultdict(set)
        self._coverage: OrderedDict[str, float] = OrderedDict()
        self._coverage_pending: dict[str, Row] = {}
        self._pending: OrderedDict[tuple[str, str, str, str], tuple[float, ToolInvocationRow]] = OrderedDict()

    def record(self, rows: Iterable[ToolInvocationRow]) -> int:
        count = 0
        transcript = False
        with self._lock:
            for row in rows:
                transcript = transcript or row.source in _OWN_RECORD
                count += self._record(row)
        if transcript and count:
            pace = getattr(self._writer, "pace", None)
            if callable(pace):
                pace()
        return count

    def _record(self, row: ToolInvocationRow) -> int:
        key = _key(row)
        previous, prev_text = self._calls.get(key, ({}, {}))
        sid = row.session_id
        transcript = row.source in _OWN_RECORD
        if (not transcript and previous.get("source") not in _OWN_RECORD
                and row.ts <= self._coverage.get(sid, -1)):
            return 0
        project = row.project_path or previous.get("project", "")
        metadata = dict(
            project=project, dedup_key=key, ts=previous.get("ts", row.ts),
            session_id=sid, tool=row.tool, tool_name=row.tool_name, source=row.source,
            is_error=max(row.is_error, previous.get("is_error", 0)),
        )
        for field in ("project_path", "source_event_id", "agent_id", "confirm", "duration_ms",
                      "confirm_wait_ms", "pid", "request_id", "prompt_id", "request_key", "error_summary"):
            metadata[field] = getattr(row, field) or previous.get(field, getattr(row, field))
        for field in ("exit_code", "input_bytes", "output_bytes", "turn_index", "interrupted"):
            value = getattr(row, field)
            metadata[field] = value if value is not None else previous.get(field)
        # What the call acted on, kept a year: from the reader, else from the name and arguments.
        found = {name: getattr(row, name) for name in _TARGET_FIELDS}
        found["target"] = found.pop("target_id")
        if not row.target_kind:
            found = describe_call(row.tool_name, row.input, keep_text=self._keeps_text())
        server, tool = (row.mcp_server, row.mcp_tool) if row.mcp_server else split_mcp(row.tool_name)
        found.update(mcp_server=server, mcp_tool=tool)
        for field, value in found.items():
            metadata[field] = value if value not in ("", None) else previous.get(field, value)
        if metadata["confirm"] == "pending" and previous.get("confirm") in ("auto", "approved", "denied"):
            metadata["confirm"] = previous["confirm"]
        if previous.get("source") in _OWN_RECORD and not transcript:
            for field in ("tool", "source", "confirm", "confirm_wait_ms", "agent_id", "project_path",
                          "duration_ms", "exit_code", "input_bytes", "output_bytes", "turn_index", "prompt_id",
                          "request_key", "error_summary", "interrupted", "mcp_server", "mcp_tool",
                          *(name if name != "target_id" else "target" for name in _TARGET_FIELDS)):
                if previous.get(field) not in (None, ""):
                    metadata[field] = previous[field]
            metadata["source"] = previous["source"]
            metadata["project"] = project = metadata["project_path"]
        if previous and project != previous["project"]:
            self._writer.delete("tool_invocations", [previous])
        text = {}
        if self._keeps_text() and row.ts >= self._text_floor():
            text = self._key_fields(metadata) | {
                "input": (row.input if isinstance(row.input, str) else json.dumps(row.input, default=str))
                if row.input else prev_text.get("input", "{}"),
                "result_summary": row.result_summary or prev_text.get("result_summary", ""),
                "target": row.target or prev_text.get("target", ""),
            }
        self._save(metadata, text, previous, prev_text)
        if transcript and sid and row.ts > self._coverage.get(sid, -1):
            self._coverage[sid] = row.ts
            self._coverage.move_to_end(sid)
            if len(self._coverage) > self._limit:
                self._coverage.popitem(last=False)
            self._coverage_pending[sid] = {"project": project, "session_id": sid, "covered_through": row.ts}
            if len(self._coverage_pending) >= 500:
                self._publish_coverage()
            for other_key in self._sessions.get(sid, set()).copy():
                other, _ = self._calls[other_key]
                if other["source"] in ("hook", "otel") and other["ts"] <= row.ts:
                    self._writer.delete("tool_invocations", [other])
                    self._forget(other_key, sid)
        return 1

    def publish_coverage(self) -> None:
        with self._lock:
            self._publish_coverage()

    def _publish_coverage(self) -> None:
        if self._coverage_pending:
            self._writer.upsert("tool_invocation_coverage", self._coverage_pending.values())
            self._coverage_pending.clear()

    def hook(self, row: ToolInvocationRow, *, start: bool) -> Row | str:
        """Pair hook start and completion. Return the input for file edit extraction."""
        identity = row.session_id, row.tool, row.tool_name, row.source_event_id
        with self._lock:
            now = time.monotonic()
            while self._pending and next(iter(self._pending.values()))[0] <= now - 600:
                self._pending.popitem(last=False)
            if row.source_event_id:
                if start:
                    self._pending[identity] = now, row
                    self._pending.move_to_end(identity)
                    if len(self._pending) > self._limit:
                        self._pending.popitem(last=False)
                elif pending := self._pending.pop(identity, None):
                    pre = pending[1]
                    row = replace(row, ts=pre.ts, duration_ms=max(0.0, (row.ts - pre.ts) * 1000),
                                  input=pre.input or row.input)
            self._record(row)
            return row.input

    @staticmethod
    def _key_fields(row: Row) -> Row:
        return {"project": row["project"], "dedup_key": row["dedup_key"]}

    def _forget(self, key: str, sid: str) -> None:
        self._calls.pop(key)
        self._sessions[sid].discard(key)
        if not self._sessions[sid]:
            del self._sessions[sid]

    def _save(self, row: Row, text: Row, previous: Row, prev_text: Row) -> None:
        if row != previous:
            self._writer.upsert("tool_invocations", [row])
        if text and text != prev_text:
            self._writer.upsert("tool_invocations_text", [text])
        key = row["dedup_key"]
        self._calls[key] = row, text
        self._calls.move_to_end(key)
        self._sessions[row["session_id"]].add(key)
        if len(self._calls) > self._limit:
            old_key, (old, _) = next(iter(self._calls.items()))
            self._forget(old_key, old["session_id"])

    def expire(self, before: float) -> None:
        with self._lock:
            for row, text in list(self._calls.values()):
                if row["confirm"] == "pending" and row["ts"] < before:
                    self._save(row | {"confirm": ""}, text, row, text)

    def attribute(self, sessions: list[str], tool: str) -> None:
        with self._lock:
            for sid in sessions:
                for key in self._sessions.get(sid, ()):
                    row, text = self._calls[key]
                    self._save(row | {"tool": tool}, text, row, text)


def write_size_fills(writer: Writer, rows: Iterable[ToolInvocationRow]) -> int:
    """Keep replayed size evidence separate so it cannot overwrite an existing call."""
    sizes = [
        {"project": row.project_path, "dedup_key": _key(row),
         "input_bytes": row.input_bytes, "output_bytes": row.output_bytes}
        for row in rows if row.input_bytes is not None or row.output_bytes is not None
    ]
    pace = getattr(writer, "pace", None)
    chunk = max(1, min(2000, getattr(writer, "_max_rows", 4000) // 2))
    for start in range(0, len(sizes), chunk):
        writer.upsert("tool_invocation_sizes", sizes[start : start + chunk])
        if callable(pace):
            pace()
    return len(sizes)
