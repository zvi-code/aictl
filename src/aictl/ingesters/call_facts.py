# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Per-call facts from the session files the tools write.

:mod:`.transcript_usage` folds these files into one row per session. The classes
here read the same lines, in the same pass, and keep each model call, tool call,
prompt, skill use, subagent and file edit as a row of its own.

Every row has a key built from the source's own identifiers, and a repeated key
merges into the stored row. So a re-read adds nothing, and a line read in a later
poll can complete a row written in an earlier one.

Token classes are disjoint, as everywhere in aictl: ``input_tokens`` excludes
cache. ``cost_usd`` is list price times tokens, for every tool. For Copilot that
is an estimate of value, not the amount billed, which is in AI credits.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sqlite3
from collections import Counter
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..context_audit import _redact
from ..data.model_pricing import is_billable_model, normalize_model_id, request_cost_usd
from ..storage import (
    AgentRow,
    CallFacts,
    ContextEventRow,
    FileWriteRow,
    RequestRow,
    SessionPromptRow,
    SkillUseRow,
    ToolInvocationRow,
    _dedup_key,
)
from ._common import coerce_ts, decode_file_uri

log = logging.getLogger(__name__)

# Long enough to hold most shell commands, so a test runner late in one is still found.
TARGET_MAX_CHARS = 4000
PROMPT_MAX_CHARS = 8000
INPUT_VALUE_MAX_CHARS = 500
EDIT_VALUE_MAX_CHARS = 4000
RESULT_MAX_CHARS = 500
BUFFER_FLUSH_ROWS = 2000

# Longest believable gap between a request's start and its last line; beyond this
# the two lines belong to a session that was suspended, not to one reply.
MAX_REPLY_MS = 3_600_000.0


def to_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def to_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def to_count(value: Any) -> int | None:
    """A number the source reported, or None when it reported none."""
    return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def list_price(model: str, input_tokens: int, output_tokens: int, read: int, write: int, write_1h: int, ts: float) -> float:
    """List-price USD for one call; 0 for a placeholder or a model with no known rate."""
    if not is_billable_model(model):
        return 0.0
    cost = request_cost_usd(model, input_tokens, output_tokens, read, write - write_1h, write_1h, ts=ts or None)
    return cost or 0.0


def copilot_model(model: Any) -> str:
    """The Copilot store sometimes records a sub-agent's name where the model belongs."""
    m = str(model or "")
    return m if m.startswith(("claude", "gpt", "gemini", "o1", "o3", "o4")) else "unknown"


# ── Display text ───────────────────────────────────────────────────────

_COMMAND_KEYS = ("command", "cmd", "commandLine")
_PATH_KEYS = ("file_path", "filePath", "notebook_path", "path", "dirPath")
_TEXT_KEYS = ("url", "query", "pattern", "skill", "description")
_TEST_RUNNER = re.compile(
    r"\b(pytest|vitest|jest|npm test|pnpm test|yarn test|go test|cargo test|make test|dotnet test|mvn test|gradle test|tox|ctest)\b"
)


def byte_size(value: Any) -> int | None:
    """The size of a tool call's input or output as UTF-8 text; None when there is none."""
    if value is None:
        return None
    if isinstance(value, str):
        return len(value.encode("utf-8", "replace"))
    try:
        return len(json.dumps(value, ensure_ascii=False).encode("utf-8", "replace"))
    except (TypeError, ValueError):
        return None


_SKILL_FILE = re.compile(r"[\\/]([^\\/]+)[\\/]SKILL\.md$", re.IGNORECASE)


def skill_of_path(path: Any) -> str:
    """The skill a SKILL.md file defines: its folder's name. '' for any other file."""
    m = _SKILL_FILE.search(str(path or "").split("?", 1)[0])
    return m.group(1) if m else ""


def _short(text: str, limit: int = TARGET_MAX_CHARS) -> str:
    return _redact(" ".join(text.split()))[:limit]


def command_head(command: str) -> str:
    """What a command may leave behind when text is not kept: its test runner or program name."""
    runner = _TEST_RUNNER.search(command)
    if runner:
        return runner.group(1)
    words = command.split()
    return re.sub(r"[^\w.+-]", "", words[0].replace("\\", "/").rsplit("/", 1)[-1])[:40] if words else ""


def target_of(args: Any, keep_text: bool) -> str:
    """Short text naming what a tool call acted on. Paths stay in every mode, like ``file_write_events.path``."""
    if not isinstance(args, dict):
        return ""
    for key in _COMMAND_KEYS:
        value = args.get(key)
        if isinstance(value, str) and value:
            return _short(value) if keep_text else command_head(value)
    for key in _PATH_KEYS:
        value = args.get(key)
        if isinstance(value, str) and value:
            return _short(value)
    paths = args.get("paths")
    if isinstance(paths, list) and paths and isinstance(paths[0], str):
        return _short(paths[0])
    if keep_text:
        for key in _TEXT_KEYS:
            value = args.get(key)
            if isinstance(value, str) and value:
                return _short(value)
    return ""


_EDIT_KEYS = {"old_string", "new_string", "oldString", "newString", "content", "new_source", "input", "patch"}


def stored_input(args: Any, keep_text: bool) -> dict:
    """Arguments kept for display. Edit text is kept longer, because a diff is built from it."""
    if not keep_text or not isinstance(args, dict):
        return {}
    out: dict[str, Any] = {}
    for key, value in list(args.items())[:16]:
        if isinstance(value, str):
            out[key] = _redact(value[: EDIT_VALUE_MAX_CHARS if key in _EDIT_KEYS else INPUT_VALUE_MAX_CHARS])
        elif isinstance(value, (int, float, bool)):
            out[key] = value
    return out


def _lines(text: str) -> list[str]:
    return text.splitlines()


def edit_line_counts(old: str, new: str) -> tuple[int, int]:
    """(added, removed) for replacing *old* by *new*, ignoring the lines they share at each end."""
    a, b = _lines(old), _lines(new)
    start = 0
    while start < len(a) and start < len(b) and a[start] == b[start]:
        start += 1
    end = 0
    while end < len(a) - start and end < len(b) - start and a[-1 - end] == b[-1 - end]:
        end += 1
    return len(b) - start - end, len(a) - start - end


def patch_line_counts(hunks: Any) -> tuple[int, int] | None:
    """(added, removed) from a structured patch, or None when it has no hunks."""
    if not isinstance(hunks, list) or not hunks:
        return None
    added = removed = 0
    for hunk in hunks:
        for line in hunk.get("lines") or [] if isinstance(hunk, dict) else []:
            if isinstance(line, str) and line.startswith("+"):
                added += 1
            elif isinstance(line, str) and line.startswith("-"):
                removed += 1
    return added, removed


_PATCH_FILE = re.compile(r"^\*\*\* (?:Update|Add|Delete) File: (.+)$")
_PATCH_MOVE = re.compile(r"^\*\*\* Move to: (.+)$")


def _patch_counts(stored_input: str, cwd: str) -> dict[str, tuple[int, int]]:
    """Lines per file of a stored apply_patch call, or nothing when the text is not there."""
    try:
        data = json.loads(stored_input or "{}")
    except ValueError:
        return {}
    patch = next((v for v in (data.get("input"), data.get("patch")) if isinstance(v, str)), "") if isinstance(data, dict) else ""
    return {absolute_path(path, cwd): (added, removed) for path, added, removed in apply_patch_files(patch)}


def apply_patch_files(patch: str) -> list[tuple[str, int, int]]:
    """(path, added, removed) for each file of an ``*** Update File:`` style patch.

    A file that the patch moves is listed under its new path as well, because the tool reports the new path.
    """
    files: list[tuple[str, int, int]] = []
    path = moved = ""
    added = removed = 0

    def close() -> None:
        if path:
            files.append((path, added, removed))
            if moved:
                files.append((moved, added, removed))

    for line in patch.splitlines():
        match = _PATCH_FILE.match(line)
        if match:
            close()
            path, moved, added, removed = match.group(1).strip(), "", 0, 0
        elif _PATCH_MOVE.match(line):
            moved = _PATCH_MOVE.match(line).group(1).strip()
        elif line.startswith("+"):
            added += 1
        elif line.startswith("-"):
            removed += 1
    close()
    return files


def absolute_path(path: str, cwd: str) -> str:
    if os.path.isabs(path) or re.match(r"^[a-zA-Z]:[\\/]", path) or not cwd:
        return path
    return os.path.normpath(os.path.join(cwd, path))


# ── Buffer ─────────────────────────────────────────────────────────────


class FactBuffer:
    """Collects rows and writes them in batches.

    A batch that fails stays here and is written on the next flush, because the
    file offsets have already moved past the lines it came from.
    """

    def __init__(self, store: Any, cutoff: float = 0.0) -> None:
        self.store = store
        self.cutoff = cutoff
        self.requests: dict[str, RequestRow] = {}
        self.tools: dict[str, ToolInvocationRow] = {}
        self.prompts: dict[str, SessionPromptRow] = {}
        self.skills: dict[str, SkillUseRow] = {}
        self.agents: dict[str, AgentRow] = {}
        self.file_writes: dict[str, FileWriteRow] = {}
        self.context_events: dict[str, ContextEventRow] = {}
        self.surface: Callable[[str], str] | None = None
        self.written = 0

    def _in_window(self, ts: float) -> bool:
        return not self.cutoff or not ts or ts >= self.cutoff

    def add_request(self, row: RequestRow) -> None:
        if self._in_window(row.ts):
            self.requests[row.dedup_key] = row
            self._maybe_flush()

    def add_tool(self, row: ToolInvocationRow) -> None:
        if self._in_window(row.ts):
            self.tools[row.dedup_key] = row
            self._maybe_flush()

    def add_prompt(self, row: SessionPromptRow) -> None:
        if self._in_window(row.ts):
            self.prompts[row.dedup_key] = row

    def add_skill(self, row: SkillUseRow) -> None:
        if self._in_window(row.ts):
            self.skills[row.dedup_key] = row

    def add_agent(self, row: AgentRow) -> None:
        if self._in_window(row.started_at or row.ended_at or 0.0):
            prior = self.agents.get(row.agent_id)
            if prior is not None:
                row.task = row.task or prior.task
                row.model = row.model or prior.model
                row.started_at = row.started_at or prior.started_at
                row.ended_at = row.ended_at if row.ended_at is not None else prior.ended_at
                row.completed = max(row.completed, prior.completed)
            self.agents[row.agent_id] = row

    def add_file_write(self, row: FileWriteRow) -> None:
        if self._in_window(row.ts):
            self.file_writes[row.dedup_key] = row

    def add_context_event(self, row: ContextEventRow) -> None:
        if self._in_window(row.ts):
            # Files are read oldest first, so the first line of a replayed event is the original.
            self.context_events.setdefault(row.dedup_key, row)

    def __len__(self) -> int:
        return (
            len(self.context_events)
            + len(self.requests)
            + len(self.tools)
            + len(self.prompts)
            + len(self.skills)
            + len(self.agents)
            + len(self.file_writes)
        )

    def _maybe_flush(self) -> None:
        if len(self) >= BUFFER_FLUSH_ROWS:
            self.flush()

    def flush(self) -> None:
        if not len(self):
            return
        writer = getattr(self.store, "write_call_facts", None)
        if writer is None:  # a store without fact tables
            self._clear()
            return
        rows = [*self.requests.values(), *self.tools.values(), *self.prompts.values(), *self.skills.values()]
        rows += [*self.agents.values(), *self.file_writes.values(), *self.context_events.values()]
        if self.surface is not None:
            for row in rows:
                if row.tool == "copilot-cli":
                    row.tool = self.surface(row.session_id)
        facts = CallFacts(
            requests=list(self.requests.values()),
            tools=list(self.tools.values()),
            prompts=list(self.prompts.values()),
            skills=list(self.skills.values()),
            agents=list(self.agents.values()),
            file_writes=list(self.file_writes.values()),
            context_events=list(self.context_events.values()),
        )
        try:
            self.written += writer(facts)
        except sqlite3.Error as exc:
            log.debug("call facts: write failed, retrying next poll: %s", exc)
            return
        self._clear()

    def _clear(self) -> None:
        self.requests, self.tools, self.prompts = {}, {}, {}
        self.skills, self.agents, self.file_writes = {}, {}, {}
        self.context_events = {}


def _keep_text(store: Any) -> bool:
    return getattr(store, "_keeps_text", lambda: True)() is True


# ── Claude Code ────────────────────────────────────────────────────────

# Slash commands that act locally and never reach a model.
_LOCAL_COMMANDS = frozenset(
    {"clear", "compact", "config", "context", "cost", "exit", "help", "agents", "login", "logout", "mcp", "model", "quit", "resume", "status"}
)
_NON_PROMPT_PREFIXES = ("<cross-session-message", "<side-sessions-event", "[Request interrupted by user", "<local-command", "<task-notification", "<system-reminder", "<bash-input", "<bash-stdout", "<bash-stderr")
_LEADING_REMINDERS = re.compile(r"^(?:\s*<system-reminder>.*?</system-reminder>)+", re.DOTALL)
_COMMAND_NAME = re.compile(r"<command-name>\s*(.*?)\s*</command-name>", re.DOTALL)
_COMMAND_ARGS = re.compile(r"<command-args>(.*?)</command-args>", re.DOTALL)
_EXIT_CODE = re.compile(r"^Exit code (-?\d+)")
_CLAUDE_WRITE_TOOLS = {"Write": "write", "Edit": "edit", "MultiEdit": "edit", "NotebookEdit": "edit"}


def _has_image(content: Any) -> bool:
    return isinstance(content, list) and any(isinstance(b, dict) and b.get("type") == "image" for b in content)


def _text_of(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(str(b.get("text") or "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def resolve_command_file(name: str, cwd: str, home: Path | None = None) -> tuple[str, bool]:
    """Find the file behind a slash command: (path, is_skill). Project paths are relative to the project."""
    base = name.lstrip("/")
    if not base or ":" in base or "/" in base or "\\" in base:
        return "", False
    roots: list[tuple[Path, str]] = []
    if cwd:
        roots.append((Path(cwd), ""))
    roots.append((home or Path.home(), "user"))
    for root, scope in roots:
        for relative, is_skill in ((f".claude/commands/{base}.md", False), (f".claude/skills/{base}/SKILL.md", True)):
            try:
                if (root / relative).is_file():
                    return (str(root / relative) if scope else relative), is_skill
            except OSError:
                continue
    return "", False


class ClaudeFacts:
    """Reads Claude Code session lines across all files of a poll.

    Keys are global, because a resumed or forked session replays earlier lines:
    a call stays on the session and agent that first reported it.
    """

    def __init__(self, buffer: FactBuffer) -> None:
        self.buffer = buffer
        self.keep_text = _keep_text(buffer.store)
        self._calls: dict[tuple[str, str], tuple] = {}
        self._api_starts: dict[str, float] = {}
        self._last_user_ts: dict[str, float] = {}
        self._tools_seen: set[str] = set()
        self._tool_message: dict[str, str] = {}
        self._last_command: dict[str, tuple[str, str]] = {}
        self._message_last_block: dict[str, float] = {}
        self._pending: dict[str, tuple[ToolInvocationRow, str, dict]] = {}
        self._open_agents: dict[str, AgentRow] = {}

    def feed(self, sid: str, obj: dict, *, agent_id: str = "", role: str = "") -> None:
        kind = obj.get("type")
        ts = coerce_ts(obj.get("timestamp"))
        if kind == "api-request":
            if obj.get("id"):
                self._api_starts[str(obj["id"])] = ts
            return
        if kind == "system":
            self._system_line(sid, obj, ts, agent_id)
            return
        if kind not in ("assistant", "user"):
            return
        agent_id = agent_id or (str(obj.get("agentId") or "") if obj.get("isSidechain") else "")
        cwd = str(obj.get("cwd") or "")
        if agent_id:
            self._touch_agent(agent_id, sid, role, ts, obj)
        msg = obj.get("message") if isinstance(obj.get("message"), dict) else {}
        if kind == "user":
            self._last_user_ts[f"{sid}/{agent_id}"] = ts
            self._prompt(sid, obj, msg, ts, agent_id, cwd)
            self._tool_results(sid, obj, msg, ts)
            return
        self._tool_uses(sid, msg, ts, agent_id, cwd)
        self._request(sid, obj, msg, ts, agent_id, cwd)

    def _touch_agent(self, agent_id: str, sid: str, role: str, ts: float, obj: dict) -> None:
        row = self._open_agents.get(agent_id)
        if row is None:
            row = AgentRow(agent_id=agent_id, session_id=sid, tool="claude-code", task=role, is_sidechain=1, started_at=ts)
            self._open_agents[agent_id] = row
        row.ended_at = ts or row.ended_at
        msg = obj.get("message")
        if isinstance(msg, dict) and msg.get("model") and is_billable_model(str(msg["model"])):
            row.model = str(msg["model"])

    def close_idle_agents(self, before: float) -> None:
        """A subagent's end is the last line of its file, once that file has gone quiet."""
        for agent_id, row in list(self._open_agents.items()):
            if row.ended_at and row.ended_at < before:
                row.completed = 1
                self.buffer.add_agent(row)
                del self._open_agents[agent_id]

    def flush_open_agents(self) -> None:
        """Running subagents are written with no end, so they read as still going."""
        for row in self._open_agents.values():
            self.buffer.add_agent(
                AgentRow(
                    agent_id=row.agent_id,
                    session_id=row.session_id,
                    tool=row.tool,
                    task=row.task,
                    model=row.model,
                    is_sidechain=1,
                    started_at=row.started_at,
                )
            )

    def _request(self, sid: str, obj: dict, msg: dict, ts: float, agent_id: str, cwd: str) -> None:
        if obj.get("isApiErrorMessage"):
            self._api_error(sid, obj, ts, agent_id, cwd)
            return
        usage = msg.get("usage")
        model = str(msg.get("model") or "")
        # A <synthetic> line is a local placeholder: no model was called.
        if not isinstance(usage, dict) or not is_billable_model(model):
            return
        cc = usage.get("cache_creation") if isinstance(usage.get("cache_creation"), dict) else {}
        vals = (
            to_int(usage.get("input_tokens")),
            to_int(usage.get("output_tokens")),
            to_int(usage.get("cache_read_input_tokens")),
            to_int(usage.get("cache_creation_input_tokens")),
            to_int(cc.get("ephemeral_1h_input_tokens")),
        )
        msg_id, req_id = str(msg.get("id") or ""), str(obj.get("requestId") or "")
        call = (msg_id, req_id) if (msg_id or req_id) else ("uuid", str(obj.get("uuid") or ""))
        prior = self._calls.get(call)
        if prior is None:
            ref = str(obj.get("requestRef") or "")
            start = self._api_starts.pop(ref, 0.0) or self._last_user_ts.get(f"{sid}/{agent_id}", 0.0)
            first = (sid, agent_id, ts, start, cwd)
        else:
            first = prior[0]
            # The same numbers again: a replay in another session, or no newer line.
            if prior[1] == vals and (first[0] != sid or ts <= prior[2]):
                return
            # A fork replays earlier messages, some with zero usage. It must not lower the real row.
            if first[0] != sid and sum(vals[:4]) <= sum(prior[1][:4]):
                return
        self._calls[call] = (first, vals, ts)
        first_sid, first_agent, first_ts, start, first_cwd = first
        reply_ms = (ts - start) * 1000 if start and ts > start else 0.0
        self.buffer.add_request(
            RequestRow(
                dedup_key=_dedup_key("claude-call", *call),
                ts=first_ts or ts,
                session_id=first_sid,
                agent_id=first_agent,
                tool="claude-code",
                project_path=first_cwd,
                model=normalize_model_id(model) or model,
                input_tokens=vals[0],
                output_tokens=vals[1],
                cache_read_tokens=vals[2],
                cache_creation_tokens=vals[3],
                cost_usd=list_price(model, vals[0], vals[1], vals[2], vals[3], vals[4], ts),
                duration_ms=reply_ms if reply_ms <= MAX_REPLY_MS else 0.0,
                finish_reason=str(msg.get("stop_reason") or ""),
            )
        )

    def _api_error(self, sid: str, obj: dict, ts: float, agent_id: str, cwd: str) -> None:
        self.buffer.add_request(
            RequestRow(
                dedup_key=_dedup_key("claude-api-error", str(obj.get("uuid") or ""), sid),
                ts=ts,
                session_id=sid,
                agent_id=agent_id,
                tool="claude-code",
                project_path=cwd,
                is_error=1,
                error_type=str(obj.get("error") or "api_error")[:80],
                http_status=to_int(obj.get("apiErrorStatus")),
            )
        )

    def _compaction(self, sid: str, obj: dict, ts: float, agent_id: str) -> None:
        meta = obj.get("compactMetadata") if isinstance(obj.get("compactMetadata"), dict) else {}
        # A resumed session replays the line with the same id, so the key leaves the session out.
        self.buffer.add_context_event(
            ContextEventRow(
                dedup_key=_dedup_key("claude-compact", str(obj.get("uuid") or f"{sid}{ts}")),
                ts=ts,
                session_id=sid,
                agent_id=agent_id or (str(obj.get("agentId") or "") if obj.get("isSidechain") else ""),
                tool="claude-code",
                kind="compaction",
                trigger=str(meta.get("trigger") or ""),
                before_tokens=to_count(meta.get("preTokens")),
                after_tokens=to_count(meta.get("postTokens")),
                duration_ms=to_count(meta.get("durationMs")),
            )
        )

    def _system_line(self, sid: str, obj: dict, ts: float, agent_id: str) -> None:
        if obj.get("subtype") == "compact_boundary":
            self._compaction(sid, obj, ts, agent_id)
            return
        if obj.get("subtype") != "api_error":
            return
        error = obj.get("error") if isinstance(obj.get("error"), dict) else {}
        inner = error.get("error") if isinstance(error.get("error"), dict) else {}
        self.buffer.add_request(
            RequestRow(
                dedup_key=_dedup_key("claude-api-error", str(obj.get("uuid") or ""), sid),
                ts=ts,
                session_id=sid,
                agent_id=agent_id or (str(obj.get("agentId") or "") if obj.get("isSidechain") else ""),
                tool="claude-code",
                project_path=str(obj.get("cwd") or ""),
                is_error=1,
                error_type=str(inner.get("type") or error.get("type") or "api_error")[:80],
                http_status=to_int(error.get("status")),
            )
        )

    def _prompt(self, sid: str, obj: dict, msg: dict, ts: float, agent_id: str, cwd: str) -> None:
        if obj.get("isMeta"):
            self._note_skill_body(sid, msg, ts, agent_id, cwd)
            return
        if "toolUseResult" in obj or obj.get("isCompactSummary"):
            return
        if obj.get("isSidechain") and not agent_id:
            return
        origin = obj.get("origin") if isinstance(obj.get("origin"), dict) else {}
        if origin.get("kind") not in (None, "human", "") and not agent_id:
            return
        text = _LEADING_REMINDERS.sub("", _text_of(msg.get("content"))).strip()
        if not text and _has_image(msg.get("content")):
            text = "[Image]"
        if not text or text.startswith(_NON_PROMPT_PREFIXES):
            return
        prompt_file = ""
        command = _COMMAND_NAME.search(text)
        if command:
            name = command.group(1).strip()
            if name.lstrip("/") in _LOCAL_COMMANDS:
                return
            args = _COMMAND_ARGS.search(text)
            text = f"{name} {args.group(1).strip()}".strip() if args else name
            prompt_file, is_skill = resolve_command_file(name, cwd)
            if is_skill or ":" in name:
                self._skill(f"{sid}/{obj.get('uuid')}", sid, name.lstrip("/"), "user", ts, agent_id, cwd)
            else:
                # A skill with no file here, such as a built-in one, shows itself in the next line.
                self._last_command[sid] = (f"{sid}/{obj.get('uuid')}", name.lstrip("/"))
        elif text.startswith("<command-message>"):
            return  # the expanded body of a slash command; its name is on its own line
        uuid = str(obj.get("uuid") or "")
        self.buffer.add_prompt(
            SessionPromptRow(
                dedup_key=_dedup_key("claude-prompt", uuid or f"{sid}{ts}"),
                ts=ts,
                session_id=sid,
                agent_id=agent_id,
                tool="claude-code",
                project_path=cwd,
                text=_redact(text[:PROMPT_MAX_CHARS]) if self.keep_text else "",
                prompt_file=prompt_file,
            )
        )

    def _note_skill_body(self, sid: str, msg: dict, ts: float, agent_id: str, cwd: str) -> None:
        command = self._last_command.pop(sid, None)
        if command is not None and _text_of(msg.get("content")).lstrip().startswith("Base directory for this skill:"):
            self._skill(command[0], sid, command[1], "user", ts, agent_id, cwd)

    def _skill(self, key: str, sid: str, name: str, trigger: str, ts: float, agent_id: str, cwd: str) -> None:
        self.buffer.add_skill(
            SkillUseRow(
                dedup_key=_dedup_key("claude-skill", key),
                ts=ts,
                session_id=sid,
                agent_id=agent_id,
                tool="claude-code",
                project_path=cwd,
                name=name,
                trigger=trigger,
            )
        )

    def _tool_uses(self, sid: str, msg: dict, ts: float, agent_id: str, cwd: str) -> None:
        content = msg.get("content")
        if not isinstance(content, list):
            return
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            tool_id = str(block.get("id") or "")
            if not tool_id or tool_id in self._tools_seen:
                continue
            self._tools_seen.add(tool_id)
            name = str(block.get("name") or "")
            args = block.get("input") if isinstance(block.get("input"), dict) else {}
            row = ToolInvocationRow(
                dedup_key=_dedup_key("claude-tool", tool_id),
                ts=ts,
                session_id=sid,
                agent_id=agent_id,
                tool="claude-code",
                tool_name=name,
                project_path=cwd,
                input=stored_input(args, self.keep_text),
                source_event_id=tool_id,
                target=target_of(args, self.keep_text),
                input_bytes=byte_size(block.get("input")),
            )
            self._pending[tool_id] = (row, cwd, args)
            message_id = str(msg.get("id") or "")
            self._tool_message[tool_id] = message_id
            self._message_last_block[message_id] = max(self._message_last_block.get(message_id, 0.0), ts)
            self.buffer.add_tool(row)
            if name == "Skill" and isinstance(args.get("skill"), str):
                self._skill(tool_id, sid, args["skill"], "agent-invoked", ts, agent_id, cwd)

    def _tool_results(self, sid: str, obj: dict, msg: dict, ts: float) -> None:
        content = msg.get("content")
        if not isinstance(content, list):
            return
        decision = obj.get("permissionDecision") if isinstance(obj.get("permissionDecision"), dict) else {}
        confirm = _claude_confirm(decision, obj.get("toolDenialKind"))
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_result":
                continue
            pending = self._pending.pop(str(block.get("tool_use_id") or ""), None)
            if pending is None:
                continue
            row, cwd, args = pending
            failed = bool(block.get("is_error"))
            text = _text_of(block.get("content")) if not isinstance(block.get("content"), str) else block["content"]
            row.output_bytes = byte_size(text)
            # A message's calls run when its last block is written, not when each block is.
            started = max(row.ts, self._message_last_block.get(self._tool_message.pop(row.source_event_id, ""), 0.0))
            row.duration_ms = max(0.0, (ts - started) * 1000)
            if confirm in _PERSON_DECIDED or row.tool_name in _PERSON_TOOLS:
                # This time holds a person's wait, and the file does not say how much of it.
                row.duration_ms = 0.0
            row.is_error = 1 if failed else 0
            row.confirm = confirm
            if failed:
                row.result_summary = _redact(text[:RESULT_MAX_CHARS]) if self.keep_text else ""
                code = _EXIT_CODE.match(text)
                row.exit_code = int(code.group(1)) if code else None
            self.buffer.add_tool(row)
            if not failed and row.tool_name in _CLAUDE_WRITE_TOOLS:
                self._file_edit(row, cwd, args, obj.get("toolUseResult"))

    def _file_edit(self, row: ToolInvocationRow, cwd: str, args: dict, result: Any) -> None:
        path = str(args.get("file_path") or args.get("notebook_path") or "")
        if not path:
            return
        counts = patch_line_counts(result.get("structuredPatch")) if isinstance(result, dict) else None
        if counts is None:
            counts = _claude_input_line_counts(row.tool_name, args)
        detail: dict[str, Any] = {"tool_use_id": row.source_event_id}
        if counts is not None:
            detail["lines_added"], detail["lines_removed"] = counts
        self.buffer.add_file_write(
            FileWriteRow(
                dedup_key=_dedup_key("claude-edit", row.source_event_id, path),
                ts=row.ts,
                path=absolute_path(path, cwd),
                session_id=row.session_id,
                tool=row.tool,
                tool_name=row.tool_name,
                operation=_CLAUDE_WRITE_TOOLS[row.tool_name],
                project_path=cwd,
                source_event_id=row.source_event_id,
                detail=detail,
            )
        )


def _claude_input_line_counts(tool_name: str, args: dict) -> tuple[int, int] | None:
    if tool_name == "Write" and isinstance(args.get("content"), str):
        return len(_lines(args["content"])), 0
    if tool_name == "Edit" and isinstance(args.get("new_string"), str):
        return edit_line_counts(str(args.get("old_string") or ""), args["new_string"])
    if tool_name == "MultiEdit" and isinstance(args.get("edits"), list):
        pairs = [
            edit_line_counts(str(e.get("old_string") or ""), str(e.get("new_string") or ""))
            for e in args["edits"]
            if isinstance(e, dict)
        ]
        return sum(p[0] for p in pairs), sum(p[1] for p in pairs)
    return None


def read_claude_agent_role(path: Path) -> str:
    """The role a subagent was started with, from the small ``agent-<id>.meta.json`` beside its file."""
    try:
        meta = path.with_name(path.stem + ".meta.json")
        if meta.stat().st_size > 64_000:
            return ""
        data = json.loads(meta.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return ""
    return str(data.get("agentType") or "")[:120] if isinstance(data, dict) else ""


# ── Copilot CLI and desktop ────────────────────────────────────────────


def copilot_call_key(session_id: str, tokens: tuple[int, int, int, int], occurrence: int) -> str:
    """One key for a call, whether it was read from ``events.jsonl`` or the store.

    The store has no call id, but its rows carry the same four raw token counts
    as the event, so the n-th call with the same counts is the same call.
    """
    return _dedup_key("copilot-call", session_id, *map(str, tokens), str(occurrence))


def confirm_from_permission(result: Any, decision_source: Any) -> str:
    kind = str(result.get("kind") or "") if isinstance(result, dict) else ""
    if not kind:
        return ""
    if kind.startswith("denied"):
        # Only an interactive denial is a person's answer. A rule, or no way to ask, is not.
        return "denied" if "interactively" in kind else "blocked"
    return "auto" if decision_source == "host_policy" else "approved"


# ``confirm`` values. approved and denied: a person answered now. auto: a rule, or an earlier
# "always", let the call through. blocked: a rule or hook stopped it and nobody was asked.
_PERSON_DECIDED = frozenset({"approved", "denied"})
_PERSON_TOOLS = frozenset({"AskUserQuestion", "ask_user"})


def _claude_confirm(decision: dict, denial_kind: Any) -> str:
    source = str(decision.get("source") or "")
    if decision.get("decision") == "accept":
        return "approved" if source == "user_temporary" else "auto"
    if decision.get("decision") == "reject" or denial_kind:
        return "denied" if source.startswith("user") else "blocked"
    return ""


class CopilotFacts:
    """Reads one session's ``events.jsonl``. Rows carry ``copilot-cli`` until the buffer attributes them."""

    def __init__(self, session_id: str, buffer: FactBuffer) -> None:
        self.sid = session_id
        self.buffer = buffer
        self.keep_text = _keep_text(buffer.store)
        self.cwd = ""
        self.model = ""
        self._occurrence: Counter[tuple[int, int, int, int]] = Counter()
        self._record_ids: set[str] = set()
        self._compactions: list[tuple[dict, float, str]] = []
        self._running: dict[str, ToolInvocationRow] = {}
        # The whole text of an apply_patch call until it completes. The stored input is cut short.
        self._patches: dict[str, str] = {}
        self._confirms: dict[str, tuple[str, float]] = {}
        self._permissions: dict[str, tuple[float, str, str, str, str]] = {}

    def reset(self) -> None:
        """The file was rewritten and is read again from the start, so counting starts over."""
        self.__init__(self.sid, self.buffer)  # type: ignore[misc]

    def feed(self, obj: dict) -> None:
        kind = obj.get("type")
        data = obj.get("data") if isinstance(obj.get("data"), dict) else {}
        ts = coerce_ts(obj.get("timestamp"))
        agent_id = str(obj.get("agentId") or "")
        event_id = str(obj.get("id") or "")
        if kind in ("session.start", "session.resume"):
            ctx = data.get("context") if isinstance(data.get("context"), dict) else {}
            self.cwd = str(ctx.get("cwd") or self.cwd)
        elif kind == "session.model_change" and data.get("newModel"):
            self.model = str(data["newModel"])
        elif kind == "assistant.message" and data.get("model"):
            self.model = str(data["model"])
        elif kind == "session.usage_record":
            usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
            for key in ("requestId", "apiCallId"):
                if usage.get(key):
                    self._record_ids.add(str(usage[key]))
            self._call(usage, ts, agent_id)
        elif kind == "session.compaction_complete":
            used = data.get("compactionTokensUsed")
            if isinstance(used, dict):
                self._compactions.append((used, ts, str(data.get("requestId") or "")))
            self._compaction(data, ts, agent_id, event_id)
        elif kind == "session.shutdown":
            self._split(data, ts, agent_id, event_id)
        elif kind == "session.error":
            self._api_error(data, ts, agent_id, event_id)
        elif kind == "user.message":
            self._prompt(data, ts, agent_id, event_id)
        elif kind == "skill.invoked":
            self._skill(data, ts, agent_id, event_id)
        elif kind == "subagent.started":
            self._agent_started(obj, data, ts)
        elif kind in ("subagent.completed", "subagent.failed"):
            self._agent_ended(obj, data, ts)
        elif kind == "tool.execution_start":
            self._tool_start(data, ts, agent_id)
        elif kind == "tool.execution_complete":
            self._tool_complete(data, ts, agent_id)
        elif kind == "permission.requested":
            self._permission_requested(data, ts, agent_id)
        elif kind == "permission.completed":
            self._permission_completed(data, ts)

    def finish_poll(self, now: float, pending_window_s: float) -> None:
        """Write what only the end of a read can settle: compactions and prompts still open."""
        for used, ts, request_id in self._compactions:
            if request_id not in self._record_ids:
                self._call(used, ts, "")
        self._compactions.clear()
        for request_id, (ts, name, target, tool_call_id, agent_id) in self._permissions.items():
            if now - ts <= pending_window_s:
                self._write_confirm(request_id, ts, name, target, tool_call_id, agent_id, "pending", 0.0)

    def _call(self, usage: dict, ts: float, agent_id: str) -> None:
        raw = to_int(usage.get("inputTokens"))
        read, write = to_int(usage.get("cacheReadTokens")), to_int(usage.get("cacheWriteTokens"))
        out = to_int(usage.get("outputTokens"))
        tokens = (raw, out, read, write)
        n = self._occurrence[tokens]
        self._occurrence[tokens] += 1
        model = str(usage.get("model") or self.model)
        billable = max(0, raw - read - write)
        self.buffer.add_request(
            RequestRow(
                dedup_key=copilot_call_key(self.sid, tokens, n),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                project_path=self.cwd,
                model=model,
                input_tokens=billable,
                output_tokens=out,
                cache_read_tokens=read,
                cache_creation_tokens=write,
                cost_usd=list_price(model, billable, out, read, write, 0, ts),
                duration_ms=to_float(usage.get("duration")),
                ttft_ms=to_float(usage.get("timeToFirstTokenMs") or usage.get("outputTtftMs")),
                finish_reason=str(usage.get("finishReason") or ""),
                tool_tokens=to_count(usage.get("toolTokenCount")),
                max_prompt_tokens=to_count(usage.get("maxPromptTokens")),
                request_bytes=to_count(usage.get("requestBodyBytes")),
                available_tools=to_count(usage.get("availableToolCount")),
            )
        )

    def _compaction(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        if data.get("success") is False:
            return
        self.buffer.add_context_event(
            ContextEventRow(
                dedup_key=_dedup_key("copilot-compact", self.sid, event_id or str(ts)),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                kind="compaction",
                trigger=str(data.get("trigger") or ""),
                before_tokens=to_count(data.get("preCompactionTokens")),
                after_tokens=to_count(data.get("postCompactionTokens")),
            )
        )

    def _split(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        """The session's own split of its context when it shut down."""
        if not to_count(data.get("currentTokens")):
            return
        self.buffer.add_context_event(
            ContextEventRow(
                dedup_key=_dedup_key("copilot-split", self.sid, event_id or str(ts)),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                kind="split",
                current_tokens=to_count(data.get("currentTokens")),
                system_tokens=to_count(data.get("systemTokens")),
                conversation_tokens=to_count(data.get("conversationTokens")),
                tool_tokens=to_count(data.get("toolDefinitionsTokens")),
            )
        )

    def _api_error(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        self.buffer.add_request(
            RequestRow(
                dedup_key=_dedup_key("copilot-error", self.sid, event_id or str(ts)),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                project_path=self.cwd,
                model=normalize_model_id(self.model) or self.model,
                is_error=1,
                error_type=str(data.get("errorType") or "error")[:80],
                http_status=to_int(data.get("statusCode")),
            )
        )

    def _prompt(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        source = str(data.get("source") or "")
        # A message another agent or the autopilot sent is not a person's prompt.
        if source and not agent_id:
            return
        text = str(data.get("content") or "")
        self.buffer.add_prompt(
            SessionPromptRow(
                dedup_key=_dedup_key("copilot-prompt", self.sid, event_id or str(ts)),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                project_path=self.cwd,
                text=_redact(text[:PROMPT_MAX_CHARS]) if self.keep_text else "",
            )
        )

    def _skill(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        name = str(data.get("name") or "")
        if not name:
            return
        self.buffer.add_skill(
            SkillUseRow(
                dedup_key=_dedup_key("copilot-skill", self.sid, event_id or f"{name}{ts}"),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                project_path=self.cwd,
                name=name,
                trigger=str(data.get("trigger") or ""),
            )
        )

    def _agent_started(self, obj: dict, data: dict, ts: float) -> None:
        agent_id = str(obj.get("agentId") or data.get("agentId") or "")
        if agent_id:
            self.buffer.add_agent(
                AgentRow(
                    agent_id=agent_id,
                    session_id=self.sid,
                    tool="copilot-cli",
                    task=str(data.get("agentName") or data.get("agentDisplayName") or ""),
                    model=str(data.get("model") or ""),
                    is_sidechain=1,
                    started_at=ts,
                )
            )

    def _agent_ended(self, obj: dict, data: dict, ts: float) -> None:
        agent_id = str(obj.get("agentId") or data.get("agentId") or "")
        if agent_id:
            self.buffer.add_agent(
                AgentRow(
                    agent_id=agent_id,
                    session_id=self.sid,
                    tool="copilot-cli",
                    task=str(data.get("agentName") or ""),
                    model=str(data.get("model") or ""),
                    is_sidechain=1,
                    ended_at=ts,
                    completed=1,
                )
            )

    def _tool_key(self, tool_call_id: str) -> str:
        return _dedup_key("copilot-tool", self.sid, tool_call_id)

    def _tool_start(self, data: dict, ts: float, agent_id: str) -> None:
        call_id = str(data.get("toolCallId") or "")
        if not call_id:
            return
        name = str(data.get("toolName") or "")
        # One spelling for a server's tools across all tools, so a reader can tell them apart.
        if data.get("mcpServerName"):
            name = f"mcp__{data['mcpServerName']}__{data.get('mcpToolName') or name}"
        args = data.get("arguments") if isinstance(data.get("arguments"), dict) else {}
        # apply_patch passes the patch as the whole argument, a string and not an object.
        raw_args = data.get("arguments")
        if name == "apply_patch" and isinstance(raw_args, str) and raw_args.lstrip().startswith("*** Begin Patch"):
            args = {"input": raw_args}
            self._patches[call_id] = raw_args
        row = ToolInvocationRow(
            dedup_key=self._tool_key(call_id),
            ts=ts,
            session_id=self.sid,
            agent_id=agent_id,
            tool="copilot-cli",
            tool_name=name,
            project_path=self.cwd,
            input=stored_input(args, self.keep_text),
            source_event_id=call_id,
            target=target_of(args, self.keep_text),
            input_bytes=byte_size(raw_args),
        )
        self._running[call_id] = row
        self.buffer.add_tool(row)

    def _tool_complete(self, data: dict, ts: float, agent_id: str) -> None:
        call_id = str(data.get("toolCallId") or "")
        if not call_id:
            return
        row = self._running.pop(call_id, None)
        patch = self._patches.pop(call_id, "")
        if row is None:
            row = ToolInvocationRow(
                dedup_key=self._tool_key(call_id),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                project_path=self.cwd,
                source_event_id=call_id,
            )
        else:
            row.duration_ms = max(0.0, (ts - row.ts) * 1000)
        shell = data.get("shellExecution") if isinstance(data.get("shellExecution"), dict) else {}
        # A shell command that ran and exited with an error can still report success.
        failed = data.get("success") is False or (isinstance(shell.get("exitCode"), int) and shell["exitCode"] != 0)
        row.is_error = 1 if failed else 0
        result = data.get("result")
        row.output_bytes = byte_size(result.get("content") if isinstance(result, dict) else result)
        error = data.get("error") if isinstance(data.get("error"), dict) else {}
        if failed and self.keep_text:
            row.result_summary = _redact(str(error.get("message") or error.get("code") or "")[:RESULT_MAX_CHARS])
        if isinstance(shell.get("exitCode"), int):
            row.exit_code = shell["exitCode"]
        # The runtime records a permission event whenever it asks, so no event means nobody was asked.
        row.confirm, row.confirm_wait_ms = self._confirms.pop(call_id, ("auto", 0.0))
        if row.confirm_wait_ms:
            row.duration_ms = max(0.0, row.duration_ms - row.confirm_wait_ms)
        if row.tool_name in _PERSON_TOOLS:
            row.duration_ms = 0.0
        self.buffer.add_tool(row)
        self._file_edits(row, data, patch)

    def _file_edits(self, row: ToolInvocationRow, data: dict, patch: str = "") -> None:
        edits = data.get("fileEdits")
        if row.is_error or not isinstance(edits, list):
            return
        paths = [e for e in edits if isinstance(e, dict) and e.get("path")]
        telemetry = data.get("toolTelemetry") if isinstance(data.get("toolTelemetry"), dict) else {}
        metrics = telemetry.get("metrics") if isinstance(telemetry.get("metrics"), dict) else {}
        path_counts = _patch_counts(json.dumps({"input": patch}) if patch else row.input, self.cwd) if len(paths) > 1 else {}
        for edit in paths:
            detail: dict[str, Any] = {}
            # The tool reports one total per call, so a patch of many files is counted from its text.
            counted = path_counts.get(absolute_path(str(edit["path"]), self.cwd))
            if counted:
                detail = {"lines_added": counted[0], "lines_removed": counted[1]}
            if len(paths) == 1 and "linesAdded" in metrics:
                detail = {"lines_added": to_int(metrics.get("linesAdded")), "lines_removed": to_int(metrics.get("linesRemoved"))}
            path = str(edit["path"])
            self.buffer.add_file_write(
                FileWriteRow(
                    dedup_key=_dedup_key("copilot-edit", self.sid, row.source_event_id, path),
                    ts=row.ts,
                    path=absolute_path(path, self.cwd),
                    session_id=self.sid,
                    tool=row.tool,
                    tool_name=row.tool_name,
                    operation=str(edit.get("kind") or "edit"),
                    project_path=self.cwd,
                    source_event_id=row.source_event_id,
                    detail=detail,
                )
            )

    def _permission_requested(self, data: dict, ts: float, agent_id: str) -> None:
        request_id = str(data.get("requestId") or "")
        ask = data.get("permissionRequest") if isinstance(data.get("permissionRequest"), dict) else {}
        if request_id:
            target = str(ask.get("extensionName") or ask.get("fullCommandText") or ask.get("fileName") or "")
            self._permissions[request_id] = (
                ts,
                f"permission:{ask.get('kind') or 'unknown'}",
                _short(target) if self.keep_text else "",
                str(ask.get("toolCallId") or ""),
                agent_id,
            )

    def _permission_completed(self, data: dict, ts: float) -> None:
        request_id = str(data.get("requestId") or "")
        asked = self._permissions.pop(request_id, None)
        if asked is None:
            return
        asked_ts, name, target, tool_call_id, agent_id = asked
        wait_ms = max(0.0, (ts - asked_ts) * 1000)
        confirm = confirm_from_permission(data.get("result"), data.get("decisionSource"))
        self._write_confirm(request_id, asked_ts, name, target, tool_call_id, agent_id, confirm, wait_ms)

    def _write_confirm(
        self, request_id: str, ts: float, name: str, target: str, tool_call_id: str, agent_id: str, confirm: str, wait_ms: float
    ) -> None:
        if tool_call_id:
            self._confirms[tool_call_id] = (confirm, wait_ms)
            row = self._running.get(tool_call_id)
            if row is not None:
                row.confirm, row.confirm_wait_ms = confirm, wait_ms
                self.buffer.add_tool(row)
            return
        # A request with no tool call, such as an extension asking for access. It is a
        # row of its own, named ``permission:<kind>``, so the decision is not lost.
        self.buffer.add_tool(
            ToolInvocationRow(
                dedup_key=_dedup_key("copilot-permission", self.sid, request_id),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                tool_name=name,
                project_path=self.cwd,
                source_event_id=request_id,
                confirm=confirm,
                confirm_wait_ms=wait_ms,
                target=target,
            )
        )


# ── VS Code ────────────────────────────────────────────────────────────

_VSCODE_EXIT_CODE = re.compile(r"(?i)exit(?:ed with)?\s*code[:\s]+(-?\d+)")
_SUBAGENT_LABEL = "runSubagent"


def _vscode_file_edits(name: str, args: Any) -> list[tuple[str, int | None, int | None]]:
    """(path, added, removed) for an edit tool's arguments."""
    if not isinstance(args, dict):
        return []
    if name == "replace_string_in_file" and args.get("filePath"):
        added, removed = edit_line_counts(str(args.get("oldString") or ""), str(args.get("newString") or ""))
        return [(str(args["filePath"]), added, removed)]
    if name == "create_file" and args.get("filePath"):
        return [(str(args["filePath"]), len(_lines(str(args.get("content") or ""))), 0)]
    if name == "multi_replace_string_in_file" and isinstance(args.get("replacements"), list):
        totals: dict[str, tuple[int, int]] = {}
        for rep in args["replacements"]:
            if isinstance(rep, dict) and rep.get("filePath"):
                added, removed = edit_line_counts(str(rep.get("oldString") or ""), str(rep.get("newString") or ""))
                prior = totals.get(str(rep["filePath"]), (0, 0))
                totals[str(rep["filePath"])] = (prior[0] + added, prior[1] + removed)
        return [(path, a, r) for path, (a, r) in totals.items()]
    if name == "apply_patch" and isinstance(args.get("input"), str):
        return [(path, a, r) for path, a, r in apply_patch_files(args["input"])]
    return []


# The tools VS Code reads a file with, and the link it shows when the file is a skill.
_VSCODE_READ_TOOLS = frozenset({"read_file", "copilot_readFile"})
_VSCODE_SKILL_LINK = re.compile(r"skill \[([^\]]+)\]\(([^)?]*SKILL\.md)", re.IGNORECASE)


class VSCodeDebugFacts:
    """Reads one file of ``debug-logs/<session>/``.

    A session's directory holds its main log and child logs. Calls in a
    ``runSubagent`` child belong to that subagent. Other children, which write
    titles and classify prompts, are calls of the main agent, as in the session totals.
    """

    def __init__(self, session_id: str, is_main: bool, buffer: FactBuffer, project_path: str, *, log_prompts: bool) -> None:
        self.sid = session_id
        self.is_main = is_main
        self.buffer = buffer
        self.project_path = project_path
        self.log_prompts = log_prompts
        self.keep_text = _keep_text(buffer.store)
        self.agent_id = ""
        self.role = ""

    def feed(self, obj: dict) -> None:
        kind = obj.get("type")
        ts = coerce_ts(obj.get("ts"))
        attrs = obj.get("attrs") if isinstance(obj.get("attrs"), dict) else {}
        span = str(obj.get("spanId") or "")
        if kind == "session_start":
            self._session_start(obj, attrs, ts)
        elif kind == "llm_request":
            self._call(obj, attrs, ts, span)
        elif kind == "tool_call":
            self._tool(obj, attrs, ts, span)
        elif kind == "user_message":
            self._prompt(attrs, ts, span)
        elif kind == "child_session_ref":
            self._child(attrs, ts)
        elif kind == "subagent" and self.agent_id and attrs.get("agentName"):
            self.role = str(attrs["agentName"])
            self._write_agent(ts)

    def _session_start(self, obj: dict, attrs: dict, ts: float) -> None:
        label = str(attrs.get("label") or "")
        if self.is_main or not label.startswith(_SUBAGENT_LABEL):
            return
        self.agent_id = str(obj.get("sid") or "")
        self.role = self.role or label[len(_SUBAGENT_LABEL) :].lstrip("-")
        self._write_agent(ts)

    def _write_agent(self, ts: float) -> None:
        if self.agent_id:
            self.buffer.add_agent(
                AgentRow(
                    agent_id=self.agent_id,
                    session_id=self.sid,
                    tool="copilot-vscode",
                    task=self.role,
                    is_sidechain=1,
                    started_at=ts,
                )
            )

    def _child(self, attrs: dict, ts: float) -> None:
        label = str(attrs.get("label") or "")
        child = str(attrs.get("childSessionId") or "")
        if child and label.startswith(_SUBAGENT_LABEL):
            self.buffer.add_agent(
                AgentRow(
                    agent_id=child,
                    session_id=self.sid,
                    tool="copilot-vscode",
                    task=label[len(_SUBAGENT_LABEL) :].lstrip("-"),
                    is_sidechain=1,
                    started_at=ts,
                )
            )

    def _call(self, obj: dict, attrs: dict, ts: float, span: str) -> None:
        failed = obj.get("status") == "error"
        raw = to_int(attrs.get("inputTokens"))
        out = to_int(attrs.get("outputTokens"))
        if not raw and not out and not failed:
            return
        cached = to_int(attrs.get("cachedTokens"))
        billable = max(0, raw - cached)
        model = str(attrs.get("model") or "")
        self.buffer.add_request(
            RequestRow(
                dedup_key=_dedup_key("vscode-call", self.sid, span or str(ts)),
                ts=ts,
                session_id=self.sid,
                agent_id=self.agent_id,
                tool="copilot-vscode",
                project_path=self.project_path,
                model=model,
                input_tokens=billable,
                output_tokens=out,
                cache_read_tokens=cached,
                cost_usd=list_price(model, billable, out, cached, 0, 0, ts),
                duration_ms=to_float(obj.get("dur")),
                ttft_ms=to_float(attrs.get("ttft")),
                is_error=1 if failed else 0,
                error_type=(" ".join(str(attrs.get("error") or "error").split())[:80]) if failed else "",
            )
        )

    def _tool(self, obj: dict, attrs: dict, ts: float, span: str) -> None:
        name = str(obj.get("name") or "")
        try:
            args = json.loads(attrs.get("args") or "{}")
        except (TypeError, ValueError):
            args = {}
        failed = obj.get("status") == "error"
        code = _VSCODE_EXIT_CODE.search(str(attrs.get("result") or "")) if name == "run_in_terminal" else None
        row = ToolInvocationRow(
            dedup_key=_dedup_key("vscode-tool", self.sid, span or f"{name}{ts}"),
            ts=ts,
            session_id=self.sid,
            agent_id=self.agent_id,
            tool="copilot-vscode",
            tool_name=name,
            project_path=self.project_path,
            is_error=1 if failed else 0,
            duration_ms=to_float(obj.get("dur")),
            input=stored_input(args, self.keep_text),
            result_summary=_redact(str(attrs.get("error") or "")[:RESULT_MAX_CHARS]) if failed and self.keep_text else "",
            source_event_id=span,
            target=target_of(args, self.keep_text),
            exit_code=int(code.group(1)) if code else None,
            input_bytes=byte_size(attrs.get("args")),
            output_bytes=byte_size(attrs.get("result")),
        )
        self.buffer.add_tool(row)
        if failed:
            return
        # VS Code loads a skill by reading its SKILL.md with the file-read tool.
        skill = skill_of_path(args.get("filePath")) if name in _VSCODE_READ_TOOLS else ""
        if skill:
            self.buffer.add_skill(
                SkillUseRow(
                    dedup_key=_dedup_key("vscode-skill", self.sid, span or f"{name}{ts}"),
                    ts=ts,
                    session_id=self.sid,
                    agent_id=self.agent_id,
                    tool="copilot-vscode",
                    project_path=self.project_path,
                    name=skill,
                    trigger="agent-invoked",
                )
            )
        for path, added, removed in _vscode_file_edits(name, args):
            self.buffer.add_file_write(
                FileWriteRow(
                    dedup_key=_dedup_key("vscode-edit", self.sid, span, path),
                    ts=ts,
                    path=absolute_path(decode_file_uri(path), self.project_path),
                    session_id=self.sid,
                    tool="copilot-vscode",
                    tool_name=name,
                    operation="write" if name == "create_file" else "edit",
                    project_path=self.project_path,
                    source_event_id=span,
                    detail={"lines_added": added, "lines_removed": removed},
                )
            )

    def _prompt(self, attrs: dict, ts: float, span: str) -> None:
        # The main log's prompts come from the chat file, which also names prompt files.
        if not self.agent_id and not (self.is_main and self.log_prompts):
            return
        text = str(attrs.get("content") or "")
        self.buffer.add_prompt(
            SessionPromptRow(
                dedup_key=_dedup_key("vscode-log-prompt", self.sid, span or str(ts)),
                ts=ts,
                session_id=self.sid,
                agent_id=self.agent_id,
                tool="copilot-vscode",
                project_path=self.project_path,
                text=_redact(text[:PROMPT_MAX_CHARS]) if self.keep_text else "",
            )
        )


# VS Code's ToolConfirmKind: 0 denied, 1 no confirmation needed, 2 by a setting,
# 3 by a per-tool service, 4 by the person, 5 skipped.
_VSCODE_CONFIRM = {0: "denied", 1: "auto", 2: "auto", 3: "auto", 4: "approved", 5: "denied"}


class VSCodeChatFacts:
    """Reads one ``chatSessions/<session>.jsonl``: a snapshot, then patches to it.

    Prompts and prompt files always come from here. Requests and tool calls come
    from here only when the session has no debug log, which reports them per call.
    """

    def __init__(self, session_id: str, buffer: FactBuffer, project_path: str, *, has_debug_log: bool) -> None:
        self.sid = session_id
        self.buffer = buffer
        self.project_path = project_path
        self.has_debug_log = has_debug_log
        self.keep_text = _keep_text(buffer.store)
        self._requests: list[dict] = []
        self._elapsed: dict[int, float] = {}

    def feed(self, obj: dict) -> None:
        path = obj.get("k")
        value = obj.get("v")
        if obj.get("kind") == 0 and isinstance(value, dict):
            self._requests = []
            for req in value.get("requests") or []:
                self._add_request(req)
            return
        if not isinstance(path, list) or not path or path[0] != "requests":
            return
        if len(path) == 1 and isinstance(value, list):
            # kind 1 replaces the list; kind 2 splices it at index ``i``, or appends.
            if obj.get("kind") == 1:
                self._requests = []
            elif isinstance(obj.get("i"), int):
                del self._requests[obj["i"] :]
            for req in value:
                self._add_request(req)
        elif len(path) == 3 and isinstance(path[1], int) and 0 <= path[1] < len(self._requests):
            req = self._requests[path[1]]
            if path[2] == "result":
                self._turn_result(req, value, path[1])
            elif path[2] == "elapsedMs":
                self._elapsed[path[1]] = to_float(value)
            elif path[2] == "response" and isinstance(value, list):
                self._response_parts(req, value)

    def _add_request(self, req: Any) -> None:
        if not isinstance(req, dict):
            return
        index = len(self._requests)
        self._requests.append({"id": str(req.get("requestId") or index), "ts": coerce_ts(req.get("timestamp")), "model": req.get("modelId")})
        slot = self._requests[index]
        if not req.get("isSystemInitiated"):
            self._prompt(req, slot)
        self._response_parts(slot, req.get("response"))
        if req.get("result") is not None:
            self._elapsed[index] = to_float(req.get("elapsedMs"))
            self._turn_result(slot, req["result"], index)

    def _prompt(self, req: dict, slot: dict) -> None:
        message = req.get("message")
        text = message.get("text") if isinstance(message, dict) else message
        text = text if isinstance(text, str) else ""
        prompt_file = _vscode_prompt_file(req.get("variableData"))
        if not text and not prompt_file:
            return
        self.buffer.add_prompt(
            SessionPromptRow(
                dedup_key=_dedup_key("vscode-prompt", self.sid, slot["id"]),
                ts=slot["ts"],
                session_id=self.sid,
                tool="copilot-vscode",
                project_path=self.project_path,
                text=_redact(text[:PROMPT_MAX_CHARS]) if self.keep_text else "",
                prompt_file=prompt_file,
            )
        )

    def _turn_result(self, slot: dict, result: Any, index: int) -> None:
        if self.has_debug_log or not isinstance(result, dict):
            return
        meta = result.get("metadata")
        if not isinstance(meta, dict) or (meta.get("promptTokens") is None and meta.get("outputTokens") is None):
            return
        model = str(meta.get("resolvedModel") or slot.get("model") or "").removeprefix("copilot/")
        tokens_in, tokens_out = to_int(meta.get("promptTokens")), to_int(meta.get("outputTokens"))
        timings = result.get("timings") if isinstance(result.get("timings"), dict) else {}
        self.buffer.add_request(
            RequestRow(
                dedup_key=_dedup_key("vscode-chat-turn", self.sid, slot["id"]),
                ts=slot["ts"],
                session_id=self.sid,
                tool="copilot-vscode",
                project_path=self.project_path,
                model=model or "unknown",
                input_tokens=tokens_in,
                output_tokens=tokens_out,
                cost_usd=list_price(model, tokens_in, tokens_out, 0, 0, 0, slot["ts"]),
                duration_ms=to_float(timings.get("totalElapsed")) or self._elapsed.get(index, 0.0),
                ttft_ms=to_float(timings.get("firstProgress")),
            )
        )

    def _response_parts(self, slot: dict, parts: Any) -> None:
        if self.has_debug_log or not isinstance(parts, list):
            return
        for part in parts:
            if isinstance(part, dict) and part.get("kind") == "toolInvocationSerialized" and part.get("toolCallId"):
                self._tool_part(slot, part)

    def _tool_part(self, slot: dict, part: dict) -> None:
        confirmed = part.get("isConfirmed")
        kind = confirmed.get("type") if isinstance(confirmed, dict) else None
        message = part.get("invocationMessage")
        shown = message.get("value") if isinstance(message, dict) else message
        call_id = str(part["toolCallId"])
        self.buffer.add_tool(
            ToolInvocationRow(
                dedup_key=_dedup_key("vscode-chat-tool", self.sid, call_id),
                ts=slot["ts"],
                session_id=self.sid,
                tool="copilot-vscode",
                tool_name=str(part.get("toolId") or ""),
                project_path=self.project_path,
                source_event_id=call_id,
                confirm=_VSCODE_CONFIRM.get(kind, "") if isinstance(kind, int) else "",
                is_error=1 if kind == 0 else 0,
                target=_short(shown) if self.keep_text and isinstance(shown, str) else "",
            )
        )
        # "Reading skill [name](file:///.../name/SKILL.md?vscodeLinkType=skill)"
        link = _VSCODE_SKILL_LINK.search(shown) if isinstance(shown, str) and kind != 0 else None
        if link:
            self.buffer.add_skill(
                SkillUseRow(
                    dedup_key=_dedup_key("vscode-chat-skill", self.sid, call_id),
                    ts=slot["ts"],
                    session_id=self.sid,
                    tool="copilot-vscode",
                    project_path=self.project_path,
                    name=skill_of_path(link.group(2)) or link.group(1),
                    trigger="agent-invoked",
                )
            )


def _vscode_prompt_file(variable_data: Any) -> str:
    """The prompt file a person chose. Instruction files added automatically do not count."""
    variables = variable_data.get("variables") if isinstance(variable_data, dict) else None
    chosen = ""
    for var in variables if isinstance(variables, list) else []:
        if not isinstance(var, dict) or var.get("kind") != "promptFile" or var.get("automaticallyAdded"):
            continue
        value = var.get("value")
        path = value.get("path") if isinstance(value, dict) else value
        if isinstance(path, str) and path:
            path = decode_file_uri(path)
            if path.endswith(".prompt.md"):
                return path
            chosen = chosen or path
    return chosen


__all__ = [
    "ClaudeFacts",
    "CopilotFacts",
    "FactBuffer",
    "VSCodeChatFacts",
    "VSCodeDebugFacts",
    "copilot_call_key",
    "copilot_model",
    "read_claude_agent_role",
]
