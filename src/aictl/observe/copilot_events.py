# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Incremental parser for Copilot ``events.jsonl`` logs and VS Code transcripts.

Only new bytes are read on refresh, and only counters and bounded previews are
kept, so a long-lived view stays cheap on large and growing logs.
"""

from __future__ import annotations

import json
import re
from collections import Counter, deque
from pathlib import Path
from typing import Any

from ..ingesters._common import coerce_ts

_CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f‪-‮⁦-⁩]+")
_READ_TOOLS = {"view", "read", "read_file", "readfile", "get_file", "open_file"}
_WRITE_TOOLS = {
    "edit",
    "create",
    "write",
    "write_file",
    "str_replace",
    "insert",
    "multi_edit",
    "apply_patch",
    "create_file",
    "replace_string_in_file",
    "multi_replace_string_in_file",
    "insert_edit_into_file",
}
_PATH_KEYS = ("path", "file_path", "filePath", "filepath", "file", "uri")
_WAIT_TOOLS = {"ask_user", "askuser", "ask_question", "vscode_askquestions"}
MAX_TRACKED_FILES = 500
PREVIEW_CHARS = 200
MAX_RECENT_PROMPTS = 5


def clean(text: Any, limit: int = 120) -> str:
    """One bounded line with control and bidi characters removed (input is untrusted)."""
    out = " ".join(_CONTROL.sub(" ", str(text)).split())
    return out if len(out) <= limit else out[: max(limit - 3, 0)] + "..."


class ToolStats:
    __slots__ = ("calls", "failures", "by_tool")

    def __init__(self) -> None:
        self.calls = 0
        self.failures = 0
        # name -> [calls, failures, completed, total_ms, max_ms, mcp_server]
        self.by_tool: dict[str, list[Any]] = {}

    def entry(self, name: str) -> list[Any]:
        return self.by_tool.setdefault(name, [0, 0, 0, 0.0, 0.0, None])


class EventsParse:
    """Accumulated state of one events log, fed one record at a time."""

    def __init__(self, keep_previews: bool) -> None:
        self.keep_previews = keep_previews
        self.session_id = ""
        self.first_ts = 0.0
        self.last_ts = 0.0
        self.cwd = ""
        self.git_root = ""
        self.branch = ""
        self.model = ""
        self.vscode = False
        self.shutdown = False
        self.turns = 0
        self.open_turns: set[str] = set()
        self.pending: dict[str, dict[str, Any]] = {}
        self.pending_permissions: set[str] = set()
        self.parent_of: dict[str, str] = {}
        self.scopes: dict[str, ToolStats] = {}
        self.agents: dict[str, dict[str, Any]] = {}
        self.tokens: dict[str, int] = {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0, "reasoning": 0}
        self.has_usage = False
        self.requests = 0
        self.premium_requests: float | None = None
        self.api_ms: float | None = None
        self.context_current: int | None = None
        self.context_limit: int | None = None
        self.prompt_count = 0
        self.recent_prompts: deque[dict[str, Any]] = deque(maxlen=MAX_RECENT_PROMPTS)
        self.skills: Counter[str] = Counter()
        self.instructions: Counter[str] = Counter()
        self.read: dict[str, list[Any]] = {}
        self.written: dict[str, list[Any]] = {}

    def _scope(self, parent: str | None) -> ToolStats:
        return self.scopes.setdefault(parent or "", ToolStats())

    def _touch(self, table: dict[str, list[Any]], path: Any, ts: float) -> None:
        if not isinstance(path, str) or not path:
            return
        path = clean(path.removeprefix("file://"), 240)
        slot = table.get(path)
        if slot is None:
            if len(table) < MAX_TRACKED_FILES:
                table[path] = [1, ts]
        else:
            slot[0] += 1
            slot[1] = max(slot[1], ts)

    def _tool_start(self, d: dict[str, Any], ts: float) -> None:
        call_id = str(d.get("toolCallId") or "")
        name = clean(d.get("toolName") or "?", 60)
        parent = d.get("parentToolCallId")
        if parent:
            self.parent_of[call_id] = parent
        scope = self._scope(parent)
        scope.calls += 1
        entry = scope.entry(name)
        entry[0] += 1
        if d.get("mcpServerName"):
            entry[5] = clean(d["mcpServerName"], 60)
        self.pending[call_id] = {"name": name, "ts": ts, "parent": parent or ""}
        args = d.get("arguments")
        if not isinstance(args, dict):
            return
        lname = name.lower()
        target = next((args[k] for k in _PATH_KEYS if isinstance(args.get(k), str)), None)
        if lname == "str_replace_editor":
            self._touch(self.read if args.get("command") == "view" else self.written, target, ts)
        elif lname in _READ_TOOLS:
            self._touch(self.read, target, ts)
        elif lname in _WRITE_TOOLS:
            self._touch(self.written, target, ts)

    def _tool_end(self, d: dict[str, Any], ts: float) -> None:
        started = self.pending.pop(str(d.get("toolCallId") or ""), None)
        if started is None:
            return
        scope = self._scope(started["parent"])
        entry = scope.entry(started["name"])
        if d.get("success") is False:
            scope.failures += 1
            entry[1] += 1
        if started["ts"] and ts >= started["ts"]:
            ms = (ts - started["ts"]) * 1000.0
            entry[2] += 1
            entry[3] += ms
            entry[4] = max(entry[4], ms)
        for edit in d.get("fileEdits") or ():
            if isinstance(edit, dict):
                self._touch(self.written, edit.get("path") or edit.get("filePath"), ts)
        telemetry = d.get("toolTelemetry")
        metrics = telemetry.get("metrics") if isinstance(telemetry, dict) else None
        if isinstance(metrics, dict):
            if metrics.get("context_current_tokens"):
                self.context_current = int(metrics["context_current_tokens"])
            if metrics.get("context_token_limit"):
                self.context_limit = int(metrics["context_token_limit"])

    def _usage(self, u: dict[str, Any]) -> None:
        self.has_usage = True
        self.requests += 1
        for key, src in (
            ("input", "inputTokens"),
            ("output", "outputTokens"),
            ("cache_read", "cacheReadTokens"),
            ("cache_write", "cacheWriteTokens"),
            ("reasoning", "reasoningTokens"),
        ):
            value = u.get(src)
            if isinstance(value, (int, float)):
                self.tokens[key] += int(value)
        if u.get("maxPromptTokens"):
            self.context_limit = int(u["maxPromptTokens"])

    def _totals(self, d: dict[str, Any]) -> None:
        if isinstance(d.get("totalPremiumRequests"), (int, float)):
            self.premium_requests = d["totalPremiumRequests"]
        if isinstance(d.get("totalApiDurationMs"), (int, float)):
            self.api_ms = float(d["totalApiDurationMs"])
        details = d.get("tokenDetails")
        if not self.has_usage and isinstance(details, dict):
            for key in ("input", "output", "cache_read", "cache_write"):
                slot = details.get(key)
                if isinstance(slot, dict) and isinstance(slot.get("tokenCount"), (int, float)):
                    self.tokens[key] = int(slot["tokenCount"])
                    self.has_usage = True

    def feed(self, rec: dict[str, Any]) -> None:
        kind = rec.get("type")
        data = rec.get("data")
        d: dict[str, Any] = data if isinstance(data, dict) else {}
        ts = coerce_ts(rec.get("timestamp"))
        if ts:
            self.first_ts = self.first_ts or ts
            self.last_ts = max(self.last_ts, ts)
        if kind == "tool.execution_start":
            self._tool_start(d, ts)
        elif kind == "tool.execution_complete":
            self._tool_end(d, ts)
        elif kind == "assistant.turn_start":
            parent = d.get("parentToolCallId")
            if parent:
                if parent in self.agents:
                    self.agents[parent]["turns"] += 1
            else:
                self.turns += 1
                self.open_turns.add(str(d.get("turnId") or rec.get("id") or ""))
            self.shutdown = False
        elif kind == "assistant.turn_end":
            self.open_turns.discard(str(d.get("turnId") or ""))
        elif kind == "user.message":
            self.shutdown = False
            if not d.get("isAutopilotContinuation") and not d.get("parentAgentTaskId"):
                self.prompt_count += 1
                text = d.get("content")
                item: dict[str, Any] = {"ts": ts, "length": len(text) if isinstance(text, str) else None}
                if self.keep_previews and isinstance(text, str):
                    item["text"] = clean(text[: PREVIEW_CHARS * 4], PREVIEW_CHARS)
                self.recent_prompts.append(item)
        elif kind == "session.usage_record":
            if isinstance(d.get("usage"), dict):
                self._usage(d["usage"])
        elif kind == "assistant.usage":
            self._usage(d)
        elif kind == "session.usage_checkpoint":
            self._totals(d)
        elif kind == "session.shutdown":
            self._totals(d)
            self.shutdown = True
            self.open_turns.clear()
            if isinstance(d.get("currentTokens"), (int, float)):
                self.context_current = int(d["currentTokens"])
        elif kind in ("session.start", "session.resume"):
            self.shutdown = False
            self.session_id = self.session_id or clean(d.get("sessionId") or "", 80)
            self.model = clean(d.get("selectedModel") or self.model, 60)
            self.vscode = self.vscode or bool(d.get("vscodeVersion"))
            ctx = d.get("context")
            if isinstance(ctx, dict):
                self.cwd = clean(ctx.get("cwd") or self.cwd, 240)
                self.git_root = clean(ctx.get("gitRoot") or self.git_root, 240)
                self.branch = clean(ctx.get("branch") or self.branch, 80)
        elif kind == "session.model_change":
            self.model = clean(d.get("newModel") or self.model, 60)
        elif kind == "permission.requested":
            self.pending_permissions.add(str(d.get("requestId") or ""))
        elif kind == "permission.completed":
            self.pending_permissions.discard(str(d.get("requestId") or ""))
        elif kind == "skill.invoked":
            self.skills[clean(d.get("name") or "?", 60)] += 1
        elif kind == "instruction.update":
            self.instructions[clean(d.get("name") or "?", 60)] += 1
        elif isinstance(kind, str) and kind.startswith("subagent."):
            self._subagent(kind, d, rec, ts)

    def _subagent(self, kind: str, d: dict[str, Any], rec: dict[str, Any], ts: float) -> None:
        call_id = str(d.get("toolCallId") or "")
        if kind == "subagent.started" and call_id:
            self.agents[call_id] = {
                "id": clean(rec.get("agentId") or call_id, 80),
                "tool_call_id": call_id,
                "name": clean(d.get("agentDisplayName") or d.get("agentName") or "agent", 60),
                "model": clean(d.get("model") or "", 60),
                "started_at": ts,
                "ended_at": None,
                "failed": False,
                "turns": 0,
                "total_tokens": None,
                "reported_tool_calls": None,
                "duration_ms": None,
            }
            if d.get("parentToolCallId"):
                self.parent_of[call_id] = d["parentToolCallId"]
        elif kind in ("subagent.completed", "subagent.failed") and call_id in self.agents:
            agent = self.agents[call_id]
            agent["ended_at"] = ts
            agent["failed"] = kind == "subagent.failed"
            agent["total_tokens"] = d.get("totalTokens")
            agent["reported_tool_calls"] = d.get("totalToolCalls")
            agent["duration_ms"] = d.get("durationMs")

    def owning_agent(self, call_id: str) -> str:
        """Nearest ancestor tool call that started a sub-agent, or '' for the main agent."""
        seen = set()
        cur = self.parent_of.get(call_id)
        while cur and cur not in seen:
            if cur in self.agents:
                return cur
            seen.add(cur)
            cur = self.parent_of.get(cur)
        return ""

    def waiting(self) -> bool:
        if self.pending_permissions:
            return True
        return any(p["name"].lower() in _WAIT_TOOLS for p in self.pending.values())


class EventsFile:
    """A log plus its parse state; ``refresh`` consumes only bytes not seen yet."""

    def __init__(self, path: Path, keep_previews: bool) -> None:
        self.path = path
        self.keep_previews = keep_previews
        self.parse = EventsParse(keep_previews)
        self.offset = 0
        self.signature: tuple[int, int] | None = None

    def refresh(self) -> EventsParse:
        try:
            st = self.path.stat()
        except OSError:
            return self.parse
        signature = (st.st_mtime_ns, st.st_size)
        if signature == self.signature:
            return self.parse
        if st.st_size < self.offset:
            self.parse = EventsParse(self.keep_previews)
            self.offset = 0
        try:
            with self.path.open("rb") as fh:
                fh.seek(self.offset)
                blob = fh.read()
        except OSError:
            return self.parse
        end = blob.rfind(b"\n") + 1
        for raw in blob[:end].splitlines():
            try:
                rec = json.loads(raw.decode("utf-8", errors="replace"))
            except ValueError:
                continue
            if isinstance(rec, dict):
                self.parse.feed(rec)
        self.offset += end
        self.signature = signature
        return self.parse
