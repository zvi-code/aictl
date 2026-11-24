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
is an estimate of value, not the amount billed, which is in AI credits. It is
None (not known) for a VS Code request whose source does not report the cached
part of the prompt: see data.provenance.CACHE_NOT_REPORTED.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from collections import Counter
from collections.abc import Callable
from dataclasses import replace
from pathlib import Path
from typing import TYPE_CHECKING, Any

from ..context_audit import _redact
from ..data.model_pricing import is_billable_model, normalize_model_id, request_cost_usd
from ..memory_changes import (
    ABSENT,
    BLOB_MAX_BYTES,
    COPILOT_CONTEXT_EVENT_TOOLS,
    COPILOT_CONTEXT_TOOLS,
    COPILOT_MEMORY_TOOLS,
    COPILOT_RECALL_AND_MEMORY_TOOLS,
    OUTSIDE_SESSION,
    TOOL_INPUT,
    TOOL_RESULT,
    UNKNOWN_NO_FILE,
    UNKNOWN_NOT_SENT,
    Image,
    claude_write_key,
    copilot_memory_path,
    image_of,
    memory_mechanism,
    read_if_fresh,
    set_images,
    text_hash,
    vscode_memory_path,
)
from ..records import THINKING_TEXT_MAX
from ..stores.base import StoreError
from ..tool_targets import AGENT, FILE, describe_call, redact_secrets, split_mcp
from ..utils import estimate_tokens_from_size
from . import context_items, loaded_files
from ._common import claude_line_finishes, coerce_ts, decode_file_uri, project_root
from .session_outcomes import TRANSCRIPT as TRANSCRIPT_PART
from .session_outcomes import _add_unique, digest_text, file_key
from .transcript_steps import CopilotSteps, redact_step_text
from .transcript_steps import _api_id as step_api_id, _label as step_label

if TYPE_CHECKING:
    from .. import records as fact_rows
else:
    from .. import records as fact_rows

log = logging.getLogger(__name__)

# Long enough to hold most shell commands, so a test runner late in one is still found.
TARGET_MAX_CHARS = 4000
PROMPT_MAX_CHARS = 8000
INPUT_VALUE_MAX_CHARS = 500
INPUT_LIST_MAX = 50  # items kept of a list or object argument
EDIT_VALUE_MAX_CHARS = 4000
RESULT_MAX_CHARS = 500
ERROR_SUMMARY_MAX = 300
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
        return len(value) if value.isascii() else len(value.encode("utf-8", "replace"))
    try:
        dumped = json.dumps(value, ensure_ascii=False)
        return len(dumped) if dumped.isascii() else len(dumped.encode("utf-8", "replace"))
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


def _masked_value(value: Any, limit: int, depth: int = 0) -> Any:
    """A list or object argument as reported, its strings masked and cut to *limit*; None for anything else."""
    if isinstance(value, str):
        return _redact(value[:limit])
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    if depth >= 4:
        return None
    if isinstance(value, list):
        return [_masked_value(v, limit, depth + 1) for v in value[:INPUT_LIST_MAX]]
    if isinstance(value, dict):
        return {str(k): _masked_value(v, limit, depth + 1) for k, v in list(value.items())[:INPUT_LIST_MAX]}
    return None


def stored_input(args: Any, keep_text: bool) -> dict:
    """Arguments kept for display: the whole object, strings masked and bounded, lists and objects
    included. Edit text is kept longer, because a diff is built from it."""
    if not keep_text or not isinstance(args, dict):
        return {}
    out: dict[str, Any] = {}
    for key, value in list(args.items())[:16]:
        if isinstance(value, str):
            out[key] = _redact(value[: EDIT_VALUE_MAX_CHARS if key in _EDIT_KEYS else INPUT_VALUE_MAX_CHARS])
        elif isinstance(value, (int, float, bool)):
            out[key] = value
        elif isinstance(value, (list, dict)):
            out[key] = _masked_value(value, INPUT_VALUE_MAX_CHARS)
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


def _patch_counts(stored_input: str | dict, cwd: str) -> dict[str, tuple[int, int]]:
    """Lines per file in live apply_patch arguments or their stored JSON form."""
    try:
        data = json.loads(stored_input or "{}") if isinstance(stored_input, str) else stored_input
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

    def __init__(self, store: Any, cutoff: float = 0.0, *, tool_calls=None) -> None:
        self.store = store
        self.tool_calls = tool_calls
        self.cutoff = cutoff
        self.requests: dict[str, fact_rows.RequestRow] = {}
        self.tools: dict[str, fact_rows.ToolInvocationRow] = {}
        self.prompts: dict[str, fact_rows.SessionPromptRow] = {}
        self.skills: dict[str, fact_rows.SkillUseRow] = {}
        # By (session, agent id): an agent id is unique only within its session.
        self.agents: dict[tuple[str, str], fact_rows.AgentRow] = {}
        self.file_writes: dict[str, fact_rows.FileWriteRow] = {}
        self.context_events: dict[str, fact_rows.ContextEventRow] = {}
        self.steps: dict[str, fact_rows.SessionStepRow] = {}
        self.cost_links: dict[str, fact_rows.TurnRequestLink] = {}
        self.loaded_files: dict[tuple[str, str, str], fact_rows.LoadedFileRow] = {}
        self.context_items: dict[tuple[str, str, str, str], fact_rows.ContextItemRow] = {}
        self.turns: dict[tuple, fact_rows.SessionTurnRow] = {}
        self.session_files: dict[tuple, fact_rows.SessionFileRow] = {}
        self.digests: dict[tuple, fact_rows.SessionDigestRow] = {}
        self.thinking: dict[tuple, fact_rows.SessionThinkingRow] = {}
        self.blobs: dict[str, tuple[str, str, float]] = {}
        self.file_versions: dict[tuple, fact_rows.FileVersionRow] = {}
        self.outcomes: dict[str, dict] = {}
        self.commits: dict[tuple[str, str], dict] = {}
        # Rows that sum up many lines (a turn, a file's use) change in place. They are marked
        # here when a line not stored before changes them, and copied when the buffer is written.
        self._marked: dict[tuple, Any] = {}
        self._file_uses: dict[tuple, fact_rows.SessionFileRow] = {}
        # What a session achieved (``session_outcomes.OutcomeBook``); set by the ingester.
        self.book: Any = None
        self.surface: Callable[[str], str] | None = None
        self.written = 0
        self.write_error: StoreError | None = None
        # True while a reader goes again over lines whose rows an earlier run stored: the
        # reader rebuilds its state from them and the rows are not stored a second time.
        self.replaying = False

    def _in_window(self, ts: float) -> bool:
        return not self.replaying and (not self.cutoff or not ts or ts >= self.cutoff)

    def add_request(self, row: fact_rows.RequestRow) -> None:
        if self._in_window(row.ts):
            self.requests[row.dedup_key] = row
            self._maybe_flush()

    def add_tool(self, row: fact_rows.ToolInvocationRow) -> None:
        if self._in_window(row.ts):
            if self.tool_calls is not None:
                tool = self.surface(row.session_id) if self.surface is not None and row.tool == "copilot-cli" else row.tool
                try:
                    self.written += self.tool_calls.record([replace(row, source=row.source or "transcript", tool=tool)])
                except StoreError as exc:
                    self.write_error = exc
                return
            self.tools[row.dedup_key] = row
            self._maybe_flush()

    def add_prompt(self, row: fact_rows.SessionPromptRow) -> None:
        if self._in_window(row.ts):
            self.prompts[row.dedup_key] = row
            self._maybe_flush()

    def add_skill(self, row: fact_rows.SkillUseRow) -> None:
        if self._in_window(row.ts):
            self.skills[row.dedup_key] = row
            self._maybe_flush()

    def add_agent(self, row: fact_rows.AgentRow) -> None:
        if self._in_window(row.started_at or row.ended_at or 0.0):
            key = (row.session_id, row.agent_id)
            prior = self.agents.get(key)
            if prior is not None:
                row.task = row.task or prior.task
                row.model = row.model or prior.model
                for name in ("description", "parent_agent_id", "parent_tool_use_id", "resolved_model", "status",
                             "cwd", "git_branch", "worktree_path"):
                    setattr(row, name, getattr(row, name) or getattr(prior, name))
                row.spawn_depth = row.spawn_depth if row.spawn_depth is not None else prior.spawn_depth
                row.started_at = min(t for t in (row.started_at, prior.started_at) if t) if (
                    row.started_at or prior.started_at) else 0.0
                # Finished or not is what the latest observation says: a resumed agent runs again.
                if not fact_rows.newer_observation(row.observed_at, prior.observed_at):
                    row.completed, row.ended_at, row.observed_at = prior.completed, prior.ended_at, prior.observed_at
            self.agents[key] = row
            self._maybe_flush()

    def add_file_write(self, row: fact_rows.FileWriteRow) -> None:
        if self._in_window(row.ts):
            self.file_writes[row.dedup_key] = row
            self._maybe_flush()

    def add_memory_write(self, row: fact_rows.FileWriteRow, before: Image | None, after: Image | None) -> None:
        """A write with its before- and after-images, whose contents are kept in file_blobs."""
        if self._in_window(row.ts):
            for blob in set_images(row, before, after):
                self.blobs[blob[0]] = blob
            self.add_file_write(row)

    def add_blob(self, digest: str, text: str, ts: float) -> None:
        if self._in_window(ts):
            self.blobs[digest] = (digest, text, ts)
            self._maybe_flush()

    def add_file_version(self, row: fact_rows.FileVersionRow, content: bytes | None = None) -> None:
        """A file version a checkpoint recorded; *content* is kept in file_blobs (memory and instruction files only)."""
        if not self._in_window(row.ts):
            return
        if content is not None and row.mechanism and not fact_rows._is_sensitive_path(row.path):
            image = image_of(content, row.origin)
            if image.hash and image.text is not None:
                row.blob_hash, row.size_bytes = image.hash, image.size
                row.content_hash = text_hash(image.text)[:16]
                row.lines = image.text.count("\n") + int(bool(image.text) and not image.text.endswith("\n"))
                self.blobs[image.hash] = (image.hash, image.text, row.ts)
        self.file_versions[(row.path, row.ts, row.session_id, row.source_event_id)] = row
        self._maybe_flush()

    def add_context_event(self, row: fact_rows.ContextEventRow) -> None:
        if self._in_window(row.ts):
            # Files are read oldest first, so the first line of a replayed event is the original.
            self.context_events.setdefault(row.dedup_key, row)
            self._maybe_flush()

    def add_step(self, row: fact_rows.SessionStepRow) -> None:
        if not self._in_window(row.ts) or row.step_key in self.steps:
            return
        if row.text:
            keeps_text = getattr(self.store, "_keeps_text", None)
            if not callable(keeps_text) or keeps_text() is not True:
                row.text, row.text_status = "", "withheld"
            else:
                text = redact_step_text(row.text)
                limit = fact_rows.TEXT_VALUE_MAX  # a longer text keeps a preview; see SessionFacts
                row.text = text[:limit]
                row.text_status = "truncated" if len(text) > limit or row.text_status == "truncated" else "captured"
        elif not row.text_status:
            row.text_status = "not_reported"
        self.steps[row.step_key] = row
        self._maybe_flush()

    def add_cost_link(self, row: fact_rows.TurnRequestLink) -> None:
        if self._in_window(row.ts):
            self.cost_links[row.request_key] = row
            self._maybe_flush()

    def add_loaded_file(self, row: fact_rows.LoadedFileRow) -> None:
        # A session loads its files once. Keep the earliest observation, even
        # when it falls before the backfill window.
        if self.replaying:
            return
        key = (row.session_id, row.path, row.how)
        prior = self.loaded_files.get(key)
        if prior is None or (row.ts and (not prior.ts or row.ts < prior.ts)):
            self.loaded_files[key] = row
            self._maybe_flush()

    def add_context_item(self, row: fact_rows.ContextItemRow) -> None:
        # Keep the latest observation, including the later line for equal times.
        if self.replaying:
            return
        key = (row.session_id, row.agent_id, row.kind, row.name)
        prior = self.context_items.get(key)
        if prior is None or row.ts >= prior.ts:
            self.context_items[key] = row
            self._maybe_flush()

    def mark(self, kind: str, key: tuple, row: Any) -> None:
        """A summed-up row of *kind* ("turns" or "session_files") changed: write it at the next flush."""
        if not self.replaying:
            self._marked[(kind, *key)] = row
            self._maybe_flush()

    def touch_file(self, sid: str, agent_id: str, path: str, how: str, tool_name: str, ts: float,
                   tool: str, project: str) -> None:
        """One more use of *path* in a session. Counted per agent's record, so a record read again from its start
        rebuilds its own counts."""
        if not sid or not path:
            return
        key = (sid, agent_id, path, how, tool_name)
        row = self._file_uses.get(key)
        if row is None:
            row = self._file_uses[key] = fact_rows.SessionFileRow(
                session_id=sid, path=path, how=how, tool_name=tool_name, agent_id=agent_id, ts=ts, first_ts=ts,
                tool=tool, project_path=project)
        row.count += 1
        if ts:
            row.first_ts = min(t for t in (row.first_ts, ts) if t)
            row.ts = max(row.ts, ts)
        self.mark("session_files", key, row)

    def forget_files(self, sid: str, agent_id: str) -> None:
        """A record is read again from its start: its counts start over."""
        for key in [k for k in self._file_uses if k[0] == sid and k[1] == agent_id]:
            del self._file_uses[key]

    def add_file_row(self, row: fact_rows.SessionFileRow) -> None:
        """A use already summed up by the source (Copilot's ``session_files``)."""
        if self._in_window(row.ts):
            self.session_files[(row.session_id, row.agent_id, row.path, row.how, row.tool_name)] = row
            self._maybe_flush()

    def add_digest(self, row: fact_rows.SessionDigestRow) -> None:
        # A digest is text: only while the store keeps text.
        if row.text and self._in_window(row.ts) and _keep_text(self.store):
            self.digests[(row.session_id, row.agent_id, row.kind, row.seq)] = row
            self._maybe_flush()

    def add_thinking(self, row: fact_rows.SessionThinkingRow) -> None:
        # Thinking text is text: only while the store keeps text. Its counts are on the request.
        if row.text and self._in_window(row.ts) and _keep_text(self.store):
            self.thinking[(row.session_id, row.thinking_key)] = row
            self._maybe_flush()

    def add_outcome(self, row: dict) -> None:
        self.outcomes[row["session_id"]] = row
        self._maybe_flush()

    def add_commit(self, row: dict) -> None:
        if self._in_window(row["ts"]):
            self.commits[(row["session_id"], row["sha"])] = row
            self._maybe_flush()

    def _take_marked(self) -> None:
        for (kind, *key), row in self._marked.items():
            # Not _in_window: a flush can start while a line read again is being handled.
            if not self.cutoff or not row.ts or row.ts >= self.cutoff:
                getattr(self, kind)[tuple(key)] = replace(row)
        self._marked = {}

    def __len__(self) -> int:
        return (
            len(self.file_versions) + len(self.blobs) + len(self.thinking) + len(self.turns) + len(self.session_files) + len(self.digests)
            + len(self.outcomes) + len(self.commits)
            + len(self._marked)
            + len(self.steps)
            + len(self.cost_links)
            + len(self.context_items)
            + len(self.loaded_files)
            + len(self.context_events)
            + len(self.requests)
            + len(self.tools)
            + len(self.prompts)
            + len(self.skills)
            + len(self.agents)
            + len(self.file_writes)
        )

    def _maybe_flush(self) -> None:
        if self.write_error is None and len(self) >= BUFFER_FLUSH_ROWS:
            self.flush(retry=False)

    def flush(self, *, retry: bool = True) -> None:
        if not len(self) or (self.write_error is not None and not retry):
            return
        self._take_marked()
        writer = getattr(self.store, "write_call_facts", None)
        if writer is None:  # a store without fact tables
            self._clear()
            return
        rows = [*self.requests.values(), *self.tools.values(), *self.prompts.values(), *self.skills.values()]
        rows += [*self.agents.values(), *self.file_writes.values(), *self.context_events.values(), *self.loaded_files.values()]
        rows += [*self.context_items.values(), *self.steps.values(), *self.cost_links.values()]
        rows += [*self.turns.values(), *self.session_files.values(), *self.digests.values(), *self.thinking.values()]
        if self.surface is not None:
            for row in rows:
                if row.tool == "copilot-cli":
                    row.tool = self.surface(row.session_id)
            for outcome in self.outcomes.values():
                if outcome["tool"] == "copilot-cli":
                    outcome["tool"] = self.surface(outcome["session_id"])
        facts = fact_rows.CallFacts(
            requests=list(self.requests.values()),
            tools=list(self.tools.values()),
            prompts=list(self.prompts.values()),
            skills=list(self.skills.values()),
            agents=list(self.agents.values()),
            file_writes=list(self.file_writes.values()),
            context_events=list(self.context_events.values()),
            loaded_files=list(self.loaded_files.values()),
            context_items=list(self.context_items.values()),
            steps=list(self.steps.values()),
            cost_links=list(self.cost_links.values()),
            turns=list(self.turns.values()),
            session_files=list(self.session_files.values()),
            digests=list(self.digests.values()),
            outcomes=list(self.outcomes.values()),
            thinking=list(self.thinking.values()),
            blobs=list(self.blobs.values()),
            file_versions=list(self.file_versions.values()),
            commits=list(self.commits.values()),
        )
        try:
            self.written += writer(facts)
        except StoreError as exc:
            self.write_error = exc
            log.warning("Fact handoff failed; retrying next poll", exc_info=True)
            return
        self._clear()

    def _clear(self) -> None:
        self.write_error = None
        self.requests, self.tools, self.prompts = {}, {}, {}
        self.skills, self.agents, self.file_writes = {}, {}, {}
        self.context_events = {}
        self.steps = {}
        self.cost_links = {}
        self.loaded_files = {}
        self.context_items = {}
        self.turns, self.session_files, self.digests, self.outcomes = {}, {}, {}, {}
        self.thinking = {}
        self.blobs = {}
        self.file_versions = {}
        self.commits = {}


# The line git commit prints for the commit it made: "[<branch> <sha>] <subject>", "(root-commit)"
# after the branch for a first commit. Its branch may say "detached HEAD".
_COMMIT_LINE = re.compile(r"^\[(?P<branch>[^\]\n]+?)(?: \(root-commit\))? (?P<sha>[0-9a-f]{7,40})\] (?P<subject>.*)$", re.M)
_GIT_COMMIT = re.compile(r"(?:^|[\s;&|(])git(?:\s+-C\s+\S+|\s+-c\s+\S+)*\s+commit\b")


def commits_of(command: Any, output: Any, *, session_id: str, cwd: str, ts: float, keep_text: bool,
               call_id: str = "", agent_id: str = "", prompt_id: str = "") -> list[dict]:
    """The commits a successful shell call that ran ``git commit`` reports making: each
    ``[branch sha] subject`` line of its output, a session_commits row under the repository that
    holds *cwd* (a worktree's repository). Nothing is read from git and nothing is inferred from
    time: a commit made with ``-q`` or whose output was not kept is not found. The subject is text,
    kept only while text is kept; the author is not in the output and stays empty."""
    if not isinstance(command, str) or not isinstance(output, str) or not _GIT_COMMIT.search(command):
        return []
    project = project_root(cwd)
    rows = []
    for m in _COMMIT_LINE.finditer(output):
        rows.append({"session_id": session_id, "sha": m["sha"], "author_name": "", "author_email": "", "ts": ts,
                     "subject": _redact(m["subject"][:300]) if keep_text else "", "project_path": project,
                     # The shell call that printed the commit: a key, not a time window.
                     "basis": "output", "source_event_id": call_id[:120], "agent_id": agent_id,
                     "prompt_id": prompt_id})
    return rows


def _context_item_row(sid: str, agent_id: str, ts: float, item: Any, tool: str, project: str) -> fact_rows.ContextItemRow:
    return fact_rows.ContextItemRow(
        session_id=sid, kind=item.kind, name=item.name, ts=ts, agent_id=agent_id, path=item.path,
        chars=0 if item.removed else item.chars, tokens=0 if item.removed else estimate_tokens_from_size(item.chars),
        estimated=1, removed=1 if item.removed else 0, tool=tool, project_path=project,
    )


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
_CLAUDE_READ_TOOLS = frozenset({"Read", "NotebookRead"})
# Lines that describe the session as a whole, not one call.
CLAUDE_SESSION_LINES = frozenset({"pr-link", "permission-mode", "mode", "cost-state"})
# Claude Code's file checkpoints: the files backed up at a message, to rewind them to (``/rewind``).
CLAUDE_CHECKPOINT_LINES = frozenset({"file-history-snapshot", "file-history-delta"})

# ── What the readers deliberately leave out ──────────────────────────
# Every line type and attachment type a tool writes is either read or on one of these lists with
# the reason. test/test_source_markers.py fails on a type that is neither, so a new marker (a new
# kind of memory save or checkpoint) cannot be dropped unnoticed: read it, or add it here and say why.
CLAUDE_IGNORED_LINES = {
    "api-request-blob": "the request body; its size is all the usage needs and it is skipped unread",
    "api-request-shape": "the request's shape; skipped unread like the body",
    "queue-operation": "a prompt queued while a turn runs; the prompt itself arrives as a user line",
    "atis-latch": "a latch of the client's own state; no session fact",
    "bridge-session": "the remote-control bridge's session id; no session fact",
    "frame-link": "a link to a UI frame; no session fact",
    "relocated": "the transcript moved; the file at the new place is read as its own",
    "artifact-autoreact-ledger": "artifact page state of the client; no session fact",
    "artifact-comment-monitor": "artifact comment watch state; no session fact",
    "tools-used": "the names of tools used so far; each call is read from its tool_use block",
    "worktree-state": "the worktree a session works in; an agent's worktree comes from its meta.json",
    "agent-setting": "an agent setting of the client; not read yet",
    "session-owner": "the client that owns the session; no session fact",
}
CLAUDE_READ_ATTACHMENTS = frozenset({
    "instructions", "nested_memory",  # memory and instruction files loaded: loaded_files, context_items, recall
    "skill_listing", "mcp_instructions_delta", "agent_listing_delta", "deferred_tools_delta",  # context_items
    "invoked_skills",  # loaded_files
    "edited_text_file",  # a memory or instruction file changed outside the session: file_write_events
})
CLAUDE_IGNORED_ATTACHMENTS = {
    "total_tokens_reminder": "a reminder of the token total; usage is read from the calls",
    "deferred_tools_record": "the full list of deferred tools; its deltas are read",
    "batching_reminder_sent": "a reminder sent to the model; no fact",
    "queued_command": "a queued prompt; it arrives as a user line",
    "environment": "the environment block of the system prompt; no memory or checkpoint",
    "prompt_snapshot": "a copy of a prompt; the prompt is read from its user line",
    "task_reminder": "a reminder of open tasks; task changes are read from TaskCreate and TaskUpdate",
    "task_status": "the task list's state; its changes are read from TaskCreate and TaskUpdate calls",
    "silent_turn_reminder": "a reminder sent to the model; no fact",
    "date": "the date given to the model",
    "date_change": "the date changed during the session",
    "remote_session_change": "a remote-control state change; no session fact",
    "model": "the model in use; read from the calls",
    "session_context": "a context block of the client; not memory",
    "credential_org": "the account's organisation; never stored",
    "auto_mode": "auto mode state; modes are read from mode lines",
    "plan_mode": "plan mode notice; modes are read from mode lines",
    "plan_mode_exit": "plan mode ended; modes are read from mode lines",
    "file": "a file the user attached to a prompt; not a memory file",
    "pdf_reference": "a PDF the user attached; not a memory file",
    "directory": "a folder the user attached; not a memory file",
    "inlined_image_paths": "image paths in a prompt; not a memory file",
    "compact_file_reference": "a file named again after a compaction; the compaction is its own event",
    "hook_additional_context": "text a hook added; hook runs are read from stop_hook_summary",
    "hook_success": "a hook result; hook runs are read from stop_hook_summary",
    "hook_system_message": "a hook's message; hook runs are read from stop_hook_summary",
    "goal_status": "a goal's state in the client; not read yet",
    "thinking_drop": "thinking left out of the context; thinking is read from the calls",
    "read_truncation_notice": "a Read result was cut; the call is read from its tool_use block",
    "ultra_effort_enter": "an effort mode began; effort is read from the calls",
    "ultra_effort_exit": "an effort mode ended; effort is read from the calls",
    "command_permissions": "permissions of a slash command; not read",
    "critical_system_reminder": "a reminder sent to the model; no fact",
    "dynamic_skill": "a skill made during the session; skill uses are read from the calls",
    "structured_output": "a structured result of the client; not read",
}
# The Copilot CLI events.jsonl events CopilotFacts reads (with transcript_steps._SOURCES and the usage reader).
COPILOT_READ_EVENTS = frozenset({
    "session.start", "session.resume", "system.message", "subagent.selected", "session.model_change",
    "assistant.message", "session.usage_record", "session.compaction_complete", "session.shutdown",
    "session.error", "user.message", "session.mode_changed", "hook.end", "session.task_complete", "skill.invoked",
    "subagent.started", "subagent.completed", "subagent.failed", "tool.execution_start", "tool.execution_complete",
    "permission.requested", "permission.completed", "session.truncation", "session.snapshot_rewind",
    "instruction.update", "session.tool_baseline",
    # Configuration the session ran under (context_events kinds config.*, see CopilotFacts._config).
    "session.permissions_changed", "session.context_changed", "subagent.configured",
    "model.captured_assignment_context",
    # Only infoType managed_model_override: the other notices (notification, remote, model,
    # authentication) are messages of the client and state no setting.
    "session.info",
    # Only requestSettings.enabledFeatureFlags: the calls themselves are read from session.usage_record.
    "model.model_call_success",
})
# The context_events kind each Copilot CLI event that states a setting becomes. Every row keeps
# the event's fields as reported, without a default for a field the tool did not write.
COPILOT_CONFIG_KINDS = {
    "session.start": "config.session_start",
    "session.resume": "config.session_resume",
    "session.model_change": "config.model_change",
    "session.mode_changed": "config.mode_change",
    "session.permissions_changed": "config.permissions_change",
    "session.info": "config.managed_override",
    "model.model_call_success": "config.feature_flags",
    "model.captured_assignment_context": "config.assignment_context",
    "subagent.configured": "config.subagent_configured",
    "session.context_changed": "config.context_changed",
}
# The fields of each event kept as reported (strings, numbers and booleans only).
_CONFIG_FIELDS = {
    "session.start": ("selectedModel", "reasoningEffort", "contextTier", "copilotVersion", "producer", "version",
                      "startTime", "alreadyInUse", "remoteSteerable"),
    "session.resume": ("selectedModel", "reasoningEffort", "contextTier", "resumeTime", "sessionWasActive",
                       "alreadyInUse", "remoteSteerable", "eventCount"),
    "session.model_change": ("previousModel", "newModel", "previousReasoningEffort", "reasoningEffort",
                             "contextTier", "source", "reason"),
    "session.mode_changed": ("previousMode", "newMode"),
    "session.permissions_changed": ("previousMode", "mode", "previousAllowAllPermissionMode",
                                    "allowAllPermissionMode", "previousAllowAllPermissions", "allowAllPermissions"),
    "session.info": ("infoType", "message"),
    "subagent.configured": ("model", "reasoningEffort", "contextTier", "multiTurn"),
    "session.context_changed": ("cwd", "gitRoot", "branch", "headCommit", "baseCommit", "repository",
                                "repositoryHost", "hostType"),
}
_CONTEXT_FIELDS = _CONFIG_FIELDS["session.context_changed"]
# The fields of session.shutdown kept on its session_shutdown event, as reported.
_SHUTDOWN_FIELDS = ("shutdownType", "currentModel", "sessionStartTime", "totalApiDurationMs", "totalPremiumRequests")
CONFIG_VALUE_MAX = 300
COPILOT_IGNORED_EVENTS = {
    "abort": "the user stopped a turn; the turn's calls show where it ended",
    "assistant.fusion_phase_completed": "a phase of a fused reply; the reply is read from assistant.message",
    "external_tool.requested": "a tool the client runs; the call is read from tool.execution_*",
    "external_tool.completed": "a tool the client ran; the call is read from tool.execution_*",
    "hook.start": "a hook began; its end (hook.end) is read",
    "instruction.update_delivery": "an instruction update reached the model; the update is read from instruction.update",
    "model.log": "the model client's log line",
    "model.message": "a message as sent to the model; the conversation is read from user and assistant events",
    "model.messages_snapshot": "a copy of the messages sent to the model; its text is in the user and assistant events",
    "model.model_call_started": "a model call began; calls are read from session.usage_record",
    "model.response": "a model response; read from assistant.message",
    "model.telemetry": "client telemetry",
    "model.turn_started": "a model turn began; turns are read from user.message",
    "model.turn_ended": "a model turn ended",
    "session.autopilot_objective_changed": "an autopilot objective; not read yet",
    "session.binary_asset": "a binary asset of the session; not text",
    "session.fusion_commit_started": "a fused reply's commit; not read",
    "session.fusion_completed": "a fused reply ended; not read",
    "session.fusion_resolved": "a fused reply resolved; not read",
    "session.mode_notice_delivered": "a mode notice reached the model; modes are read from mode_changed",
    "session.remote_steerable_changed": "remote steering state; no session fact",
    "session.schedule_created": "a scheduled run; not read yet",
    "session.usage_checkpoint": "the session's billing totals so far (observe/copilot_events reads it for the live "
                                "view); not a context checkpoint",
    "session.warning": "a warning of the client",
    "session.workspace_file_changed": "a file of the session's own workspace folder; the folder is listed in "
                                      "session_artifacts",
    "skill.context_delivered_ref": "a skill's text reached the model; the use is read from skill.invoked",
    "skill.invoked_ref": "a reference to a skill use; the use is read from skill.invoked",
    "subagent.deselected": "a custom agent was deselected; selection is read from subagent.selected",
    "system.notification": "a notice of the client",
}
AGENT_LABEL_MAX = 200
_COPILOT_SHELLS = frozenset({"bash", "powershell"})


def _config_value(value: Any) -> Any:
    """A reported setting as stored: a string (at most CONFIG_VALUE_MAX characters), number or boolean; None otherwise."""
    if isinstance(value, str):
        return value[:CONFIG_VALUE_MAX]
    return value if isinstance(value, (bool, int, float)) else None


def agent_label(text: Any) -> str:
    """The short task label a calling agent gave a subagent: one line, at most 200 characters."""
    return " ".join(text.split())[:AGENT_LABEL_MAX] if isinstance(text, str) else ""


def _human_turn(obj: dict, msg: dict) -> bool:
    """A person's prompt, as ``ClaudeAccumulator`` counts turns."""
    if obj.get("isSidechain") or obj.get("isMeta") or "toolUseResult" in obj:
        return False
    origin = obj.get("origin")
    if isinstance(origin, dict) and origin.get("kind") not in (None, "", "human"):
        return False
    content = msg.get("content")
    return isinstance(content, str) or (isinstance(content, list) and any(
        isinstance(b, dict) and b.get("type") == "text" for b in content))


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

    Every line comes with the session that wrote it: the reader drops a resumed or forked
    session's copies of earlier lines (``transcript_usage.claude_line_session``). Call keys
    still span files, because a streaming reply is written as several lines.
    """

    def __init__(self, buffer: FactBuffer) -> None:
        self.buffer = buffer
        self.keep_text = _keep_text(buffer.store)
        # Ids are kept as hashes: a month of transcripts has a million of them.
        self._calls: dict[int, tuple] = {}
        self._api_starts: dict[str, float] = {}
        self._last_user_ts: dict[str, float] = {}
        self._tools_seen: set[int] = set()
        self._tool_message: dict[str, int] = {}
        self._last_command: dict[str, tuple[str, str]] = {}
        self._message_last_block: dict[int, float] = {}
        self._pending: dict[str, tuple[fact_rows.ToolInvocationRow, str, dict]] = {}
        # By (session, agent id): an agent id is unique only within its session.
        self._open_agents: dict[tuple[str, str], fact_rows.AgentRow] = {}
        # Turns: the prompt id each agent's record is in now, and the turns by (session, prompt id).
        self._prompt_of: dict[str, str] = {}
        self._turns: dict[tuple[str, str], fact_rows.SessionTurnRow] = {}
        self._turn_files: dict[tuple[str, str], set[int]] = {}
        self._last_turn: dict[str, int] = {}
        self._compact_seq: dict[str, int] = {}
        # Versions of the todo list and task changes per agent's record, and each record's last
        # compaction row, which the summary line after it links to.
        self._todo_seq: dict[str, int] = {}
        self._task_seq: dict[str, int] = {}
        self._last_compaction: dict[str, fact_rows.ContextEventRow] = {}
        # The files of each rewind point so far, by session/message id; and where the backups are.
        self._rewind_files: dict[str, set[str]] = {}
        self._rewind_rows: dict[str, fact_rows.ContextEventRow] = {}
        self.history_dir: Path | None = None
        # Thinking per call, kept small (a month holds hundreds of thousands of calls): visible chars,
        # bit masks of the visible and the redacted block indexes, longest duration.
        self._thinking: dict[int, tuple[int, int, int, float]] = {}

    def begin_file(self, sid: str, agent_id: str) -> None:
        """A record is read from its start: what is summed up from it alone starts over."""
        self.buffer.forget_files(sid, agent_id)
        if self.buffer.book is not None:
            self.buffer.book.reset(sid, TRANSCRIPT_PART + agent_id)
        for counter in (self._compact_seq, self._todo_seq, self._task_seq, self._last_compaction):
            counter.pop(f"{sid}/{agent_id}", None)

    def _outcome(self, sid: str, agent_id: str, ts: float, cwd: str = "") -> dict | None:
        book = self.buffer.book
        return None if book is None else book.part(sid, TRANSCRIPT_PART + agent_id, ts, tool="claude-code", project=cwd)

    def _turn(self, sid: str, agent_id: str) -> fact_rows.SessionTurnRow | None:
        pid = self._prompt_of.get(f"{sid}/{agent_id}")
        return self._turns.get((sid, pid)) if pid else None

    def _touch_turn(self, turn: fact_rows.SessionTurnRow, ts: float) -> None:
        if ts:
            turn.ts = min(t for t in (turn.ts, ts) if t)
            turn.ended_at = max(turn.ended_at, ts)
        self.buffer.mark("turns", (turn.session_id, turn.prompt_id), turn)

    def _enter_turn(self, sid: str, agent_id: str, obj: dict, msg: dict, ts: float, cwd: str) -> None:
        """A user line: the turn it belongs to, by its ``promptId``. A subagent's lines carry its caller's."""
        pid = str(obj.get("promptId") or "")
        if not pid and not agent_id and _human_turn(obj, msg):
            pid = f"line:{obj.get('uuid') or ts}"  # a record from before prompt ids
        if not pid:
            return
        pid = sys.intern(pid)  # held by every call of the turn
        self._prompt_of[f"{sid}/{agent_id}"] = pid
        turn = self._turns.get((sid, pid))
        if turn is None:
            turn = self._turns[(sid, pid)] = fact_rows.SessionTurnRow(session_id=sid, prompt_id=pid, ts=ts, project_path=cwd)
        if not agent_id:
            if turn.turn_index is None:
                position = obj.get("turnPosition") if isinstance(obj.get("turnPosition"), dict) else {}
                index = position.get("turnIndex")
                turn.turn_index = index if type(index) is int else self._last_turn.get(sid, 0) + 1
                self._last_turn[sid] = max(self._last_turn.get(sid, 0), turn.turn_index)
            origin = obj.get("origin") if isinstance(obj.get("origin"), dict) else {}
            turn.origin = turn.origin or str(obj.get("turnOrigin") or origin.get("kind") or "")[:40]
            if obj.get("permissionMode"):
                turn.permission_mode = turn.permission_mode or str(obj["permissionMode"])[:40]
            turn.project_path = turn.project_path or cwd
        self._touch_turn(turn, ts)

    def _session_line(self, sid: str, obj: dict, ts: float) -> None:
        """The lines that say what the session did: PR links, modes, the tool's own cost totals."""
        part = self._outcome(sid, "", ts)
        if part is None:
            return
        kind = obj.get("type")
        if kind == "pr-link" and isinstance(obj.get("prUrl"), str):
            _add_unique(part.setdefault("pr_refs", []), obj["prUrl"][:300])
        elif kind == "permission-mode" and obj.get("permissionMode"):
            _add_unique(part.setdefault("permission_modes", []), str(obj["permissionMode"])[:40])
        elif kind == "mode" and obj.get("mode"):
            _add_unique(part.setdefault("modes", []), str(obj["mode"])[:40])
            part["last_mode"] = str(obj["mode"])[:40]
        elif kind == "cost-state":
            for name, key in (("reported_cost_usd", "totalCostUSD"), ("reported_api_ms", "totalAPIDuration"),
                              ("reported_tool_ms", "totalToolDuration")):
                if isinstance(obj.get(key), (int, float)) and not isinstance(obj.get(key), bool):
                    part[name] = float(obj[key])
            for name, key in (("lines_added", "totalLinesAdded"), ("lines_removed", "totalLinesRemoved")):
                if type(obj.get(key)) is int:
                    part[name] = obj[key]

    def feed(self, sid: str, obj: dict, *, agent_id: str = "", role: str = "", meta: dict | None = None) -> None:
        kind = obj.get("type")
        ts = coerce_ts(obj.get("timestamp"))
        if kind in CLAUDE_SESSION_LINES:
            if not agent_id:
                self._session_line(sid, obj, ts)
            return
        if kind == "api-request":
            if obj.get("id"):
                self._api_starts[str(obj["id"])] = ts
            return
        if kind in CLAUDE_CHECKPOINT_LINES:
            if not agent_id:
                self._rewind_point(sid, obj)
            return
        if kind == "system":
            self._system_line(sid, obj, ts, agent_id)
            return
        if kind == "attachment":
            self._attachment(sid, obj, ts, agent_id or (str(obj.get("agentId") or "") if obj.get("isSidechain") else ""))
            return
        if kind not in ("assistant", "user"):
            return
        agent_id = agent_id or (str(obj.get("agentId") or "") if obj.get("isSidechain") else "")
        # Every line repeats the folder; one string serves them all.
        cwd = sys.intern(str(obj.get("cwd") or ""))
        if agent_id:
            self._touch_agent(agent_id, sid, role, ts, obj, meta)
        msg = obj.get("message") if isinstance(obj.get("message"), dict) else {}
        if kind == "user":
            self._last_user_ts[f"{sid}/{agent_id}"] = ts
            self._enter_turn(sid, agent_id, obj, msg, ts, cwd)
            if obj.get("permissionMode") and not agent_id and (part := self._outcome(sid, "", ts, cwd)) is not None:
                _add_unique(part.setdefault("permission_modes", []), str(obj["permissionMode"])[:40])
            self._prompt(sid, obj, msg, ts, agent_id, cwd)
            self._tool_results(sid, obj, msg, ts)
            return
        if (turn := self._turn(sid, agent_id)) is not None:
            self._touch_turn(turn, ts)
        self._tool_uses(sid, obj, msg, ts, agent_id, cwd)
        self._request(sid, obj, msg, ts, agent_id, cwd)

    def _rewind_point(self, sid: str, obj: dict) -> None:
        """A ``file-history-snapshot`` (the files tracked at a message, each with its backup) or a
        ``file-history-delta`` (one more file backed up for a message's snapshot).

        A backup is the file as it was before the message's edits; ``backupFileName`` null means the
        file did not exist. A key is the absolute path or one relative to ``realParentDir``'s end."""
        if obj.get("type") == "file-history-delta":
            message_id = str(obj.get("snapshotMessageId") or obj.get("messageId") or "")
            files = {str(obj.get("trackingPath") or ""): obj.get("backup")}
            ts = coerce_ts(obj.get("timestamp"))
            update = True
        else:
            snapshot = obj.get("snapshot") if isinstance(obj.get("snapshot"), dict) else {}
            message_id = str(snapshot.get("messageId") or obj.get("messageId") or "")
            files = snapshot.get("trackedFileBackups") if isinstance(snapshot.get("trackedFileBackups"), dict) else {}
            ts = coerce_ts(snapshot.get("timestamp"))
            update = bool(obj.get("isSnapshotUpdate"))
        if not message_id:
            return
        key = f"{sid}/{message_id}"
        tracked = self._rewind_files.setdefault(key, set())
        if not update:
            tracked.clear()
        for name, info in files.items():
            if not name or not isinstance(info, dict):
                continue
            parent = str(info.get("realParentDir") or "")
            path = name if os.path.isabs(name) else os.path.join(parent, os.path.basename(name)) if parent else name
            tracked.add(path)
            backup = info.get("backupFileName")
            mechanism = memory_mechanism(path)
            content = None
            if backup and mechanism and self.history_dir is not None:
                try:
                    with open(self.history_dir / sid / str(backup), "rb") as fh:
                        content = fh.read(BLOB_MAX_BYTES + 1)
                except OSError:
                    content = None  # Claude Code deletes old backups: the event stays, the content is gone
            version = info.get("version")
            self.buffer.add_file_version(fact_rows.FileVersionRow(
                path=path, ts=ts, session_id=sid, origin="claude_file_history", source_event_id=message_id,
                mechanism=mechanism, version=version if type(version) is int else None,
                state="backup" if backup else "absent"), content)
        # One row per rewind point: a later line of the same message updates it (the buffer keeps the
        # first object of a key, so the same object is changed and handed over again).
        point = self._rewind_rows.get(key)
        if point is None:
            point = self._rewind_rows[key] = fact_rows.ContextEventRow(
                dedup_key=fact_rows._dedup_key("claude-rewind", sid, message_id), ts=ts, session_id=sid,
                kind="rewind_point", tool="claude-code", trigger="snapshot", message_id=message_id)
        point.files_count = len(tracked)
        self.buffer.add_context_event(point)

    def _attachment(self, sid: str, obj: dict, ts: float, agent_id: str) -> None:
        """The instruction files, subfolder CLAUDE.md files and skills the session loaded."""
        for path, how, detail in loaded_files.claude_attachment(obj.get("attachment")):
            self.buffer.add_loaded_file(
                fact_rows.LoadedFileRow(
                    session_id=sid, path=path, how=how, ts=ts, detail=detail, tool="claude-code",
                    agent_id=agent_id, project_path=str(obj.get("cwd") or ""),
                )
            )

        for item in context_items.claude_attachment(obj.get("attachment")):
            self.buffer.add_context_item(_context_item_row(sid, agent_id, ts, item, "claude-code", str(obj.get("cwd") or "")))
        attachment = obj.get("attachment") if isinstance(obj.get("attachment"), dict) else {}
        if attachment.get("type") == "edited_text_file":
            self._outside_edit(sid, obj, attachment, ts, agent_id)
        elif attachment.get("type") in ("instructions", "nested_memory"):
            self._memory_loaded(sid, obj, attachment, ts, agent_id)

    def _memory_loaded(self, sid: str, obj: dict, attachment: dict, ts: float, agent_id: str) -> None:
        """Memory and instruction files the tool put into the context, with the text it loaded.

        Each file is a ``memory_recall`` event whose ``content_hash`` is the file_blobs hash of that
        text: it matches a stored version of the file only when the tool loaded the file whole."""
        files = attachment.get("files") if isinstance(attachment.get("files"), list) else [attachment]
        cwd = str(obj.get("cwd") or "")
        turn = self._turn(sid, agent_id)
        for item in files:
            if not isinstance(item, dict) or not isinstance(item.get("path"), str):
                continue
            path = absolute_path(item["path"], cwd)
            content = item.get("content")
            image = image_of(content, TOOL_INPUT) if isinstance(content, str) else Image("")
            if image.hash and image.text is not None and not fact_rows._is_sensitive_path(path):
                self.buffer.add_blob(image.hash, image.text, ts)
            self.buffer.add_context_event(fact_rows.ContextEventRow(
                dedup_key=fact_rows._dedup_key("claude-recall", sid, str(obj.get("uuid") or ts), path),
                ts=ts, session_id=sid, agent_id=agent_id, tool="claude-code", kind="memory_recall",
                trigger=str(item.get("type") or attachment.get("type") or "")[:40], path=path,
                content_hash=image.hash, prompt_id=turn.prompt_id if turn else "",
                turn_index=turn.turn_index if turn else None,
                detail={"bytes": image.size} if image.size is not None else {}))

    def _outside_edit(self, sid: str, obj: dict, attachment: dict, ts: float, agent_id: str) -> None:
        """Claude Code's word that a file it had read changed outside the session (by a person, another
        session or a program; it does not say which). Kept for memory and instruction files only."""
        cwd = str(obj.get("cwd") or "")
        path = absolute_path(str(attachment.get("filename") or ""), cwd)
        if not path or not memory_mechanism(path):
            return
        turn = self._turn(sid, agent_id)
        self.buffer.add_memory_write(fact_rows.FileWriteRow(
            dedup_key=fact_rows._dedup_key("claude-outside-edit", sid, str(obj.get("uuid") or ts), path),
            ts=ts, path=path, session_id=sid, tool="claude-code", tool_name="edited_text_file",
            operation="outside_edit", project_path=cwd, source_event_id=str(obj.get("uuid") or ""),
            agent_id=agent_id, prompt_id=turn.prompt_id if turn else "", turn_index=turn.turn_index if turn else None,
            actor=OUTSIDE_SESSION), None, read_if_fresh(path, 0.0, ts))

    def _touch_agent(self, agent_id: str, sid: str, role: str, ts: float, obj: dict, meta: dict | None = None) -> None:
        """A line of a subagent. Its parent, depth, spawning tool call and worktree come from the
        ``meta.json`` the tool wrote beside the file; its folder and branch from its own lines.
        The meta file is read again with each new batch of lines, so one written after the
        agent's first lines still gives its fields."""
        row = self._open_agents.get((sid, agent_id))
        if row is None:
            row = fact_rows.AgentRow(
                agent_id=agent_id, session_id=sid, tool="claude-code", task=role, is_sidechain=1, started_at=ts)
            self._open_agents[(sid, agent_id)] = row
        if meta:
            fill_agent_meta(row, meta)
        # Finished only after a final reply; any later line means it works again.
        finishes = claude_line_finishes(obj)
        if finishes is not None and ts >= row.observed_at:
            row.observed_at = ts or row.observed_at
            row.completed = 1 if finishes else 0
            row.ended_at = ts if finishes else None
        if obj.get("cwd") and not row.cwd:
            row.cwd = str(obj["cwd"])[:1000]
        if obj.get("gitBranch"):
            row.git_branch = str(obj["gitBranch"])[:200]
        msg = obj.get("message")
        if isinstance(msg, dict) and msg.get("model") and is_billable_model(str(msg["model"])):
            row.model = str(msg["model"])

    def agent_is_open(self, sid: str, agent_id: str) -> bool:
        return (sid, agent_id) in self._open_agents

    def agent_meta(self, sid: str, agent_id: str, meta: dict) -> None:
        """A subagent's ``meta.json``, read after its lines: the agent's row, written at the next
        flush, gets the fields it lacks. An agent no longer in memory gets them at the next start
        (``agent_meta_backfill``)."""
        if (row := self._open_agents.get((sid, agent_id))) is not None:
            fill_agent_meta(row, meta)

    def close_idle_agents(self, before: float) -> None:
        """Let go of subagents whose file has gone quiet. Quiet is not finished: a row says
        completed only after the agent's final reply (or its caller's result says so)."""
        for key, row in list(self._open_agents.items()):
            if row.observed_at and row.observed_at < before:
                self.buffer.add_agent(row)
                del self._open_agents[key]

    def drop_abandoned_calls(self, before: float) -> None:
        """A tool call with no result after a long time was cancelled: its arguments, kept
        for the result, are let go. The call itself is already in the buffer."""
        for tool_id, (row, _cwd, _args) in list(self._pending.items()):
            if row.ts and row.ts < before:
                del self._pending[tool_id]
                self._tool_message.pop(tool_id, None)

    def flush_open_agents(self) -> None:
        """Subagents still in memory are written as their latest line left them."""
        for row in self._open_agents.values():
            self.buffer.add_agent(replace(row))

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
        call_key = hash(call)
        prior = self._calls.get(call_key)
        blocks = self._thinking_blocks(obj, msg, call_key)
        thought = self._thought(call_key)
        if prior is None:
            ref = str(obj.get("requestRef") or "")
            start = self._api_starts.pop(ref, 0.0) or self._last_user_ts.get(f"{sid}/{agent_id}", 0.0)
            turn = self._turn(sid, agent_id)
            first = (sid, agent_id, ts, start, cwd, turn.prompt_id if turn else "", turn.turn_index if turn else None)
            if turn is not None:
                turn.request_count += 1
        else:
            first = prior[0]
            # The same numbers again: a replay in another session, or no newer line.
            if prior[1] == vals and (first[0] != sid or (ts <= prior[2] and thought == prior[3])):
                return
            # A fork replays earlier messages, some with zero usage. It must not lower the real row.
            if first[0] != sid and sum(vals[:4]) <= sum(prior[1][:4]):
                return
        self._calls[call_key] = (first, vals, ts, thought)
        first_sid, first_agent, first_ts, start, first_cwd, prompt_id, turn_index = first
        turn = self._turns.get((first_sid, prompt_id)) if prompt_id else None
        if turn is not None:
            old = prior[1] if prior is not None else (0, 0, 0, 0, 0)
            turn.input_tokens += vals[0] - old[0]
            turn.output_tokens += vals[1] - old[1]
            turn.cache_read_tokens += vals[2] - old[2]
            turn.cache_creation_tokens += vals[3] - old[3]
            was = prior[3] if prior is not None else (0, 0, 0, 0.0)
            turn.thinking_chars += thought[0] - was[0]
            turn.thinking_blocks += thought[1] - was[1]
            turn.thinking_redacted += thought[2] - was[2]
            turn.thinking_ms += thought[3] - was[3]
            turn.ended_with_api_error = 0
            self._touch_turn(turn, ts)
        request_key = fact_rows._dedup_key("claude-call", *call)
        if first_sid == sid:
            for index, text in blocks:
                self.buffer.add_thinking(fact_rows.SessionThinkingRow(
                    session_id=sid, thinking_key=fact_rows._dedup_key("claude-thinking", *call, str(index)), ts=ts,
                    agent_id=first_agent, request_key=request_key, message_id=msg_id, turn_index=turn_index,
                    block_index=index, model=normalize_model_id(model) or model, chars=len(text),
                    text=digest_text(text, THINKING_TEXT_MAX), tool="claude-code", project_path=first_cwd))
        requested = str(obj.get("requestedModel") or "")
        reply_ms = (ts - start) * 1000 if start and ts > start else 0.0
        self.buffer.add_request(
            fact_rows.RequestRow(
                dedup_key=request_key,
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
                prompt_id=prompt_id,
                turn_index=turn_index,
                request_id=req_id[:200],
                response_id=msg_id[:200],
                effort=str(obj.get("effort") or "")[:20],
                thinking_ms=thought[3] or None,
                attribution_mcp_server=str(obj.get("attributionMcpServer") or "")[:200],
                attribution_skill=str(obj.get("attributionSkill") or "")[:200],
                requested_model=requested if requested and requested != model else "",
                thinking_chars=thought[0],
                thinking_blocks=thought[1],
                thinking_redacted=thought[2],
            )
        )

    def _thinking_blocks(self, obj: dict, msg: dict, call_key: int) -> list[tuple[int, str]]:
        """Note the thinking blocks of a line; return the visible ones as (block index, text).

        Claude Code writes one line per content block, so a block's index is the line's
        ``apiBlockIndex``, or its place in the line's content.
        """
        chars, shown, redacted, ms = self._thinking.get(call_key, (0, 0, 0, 0.0))
        visible: list[tuple[int, str]] = []
        content = msg.get("content") if isinstance(msg.get("content"), list) else []
        changed = False
        for position, block in enumerate(content):
            kind = block.get("type") if isinstance(block, dict) else None
            if kind not in ("thinking", "redacted_thinking"):
                continue
            index = obj["apiBlockIndex"] if type(obj.get("apiBlockIndex")) is int and len(content) == 1 else position
            text = block.get("thinking") if kind == "thinking" else None
            if index < 0 or index > 4096:
                continue
            bit = 1 << index
            if isinstance(text, str) and text:
                # A block is written whole on its line; a line seen again adds nothing.
                if not shown & bit:
                    chars, shown, changed = chars + len(text), shown | bit, True
                visible.append((index, text))
            elif kind == "redacted_thinking" or block.get("data") or block.get("signature"):
                # Redacted, or thinking whose text the file leaves out: counted, never stored.
                if not redacted & bit:
                    redacted, changed = redacted | bit, True
        duration = obj.get("thinkingDurationMs")
        if type(duration) in (int, float) and duration > ms:
            ms, changed = float(duration), True
        if changed:
            self._thinking[call_key] = (chars, shown, redacted, ms)
        return visible

    def _thought(self, call_key: int) -> tuple[int, int, int, float]:
        """(visible chars, visible blocks, redacted blocks, duration ms) of a call so far."""
        chars, shown, redacted, ms = self._thinking.get(call_key, (0, 0, 0, 0.0))
        return chars, shown.bit_count(), redacted.bit_count(), ms

    def _turn_error(self, sid: str, agent_id: str, ts: float) -> tuple[str, int | None]:
        """An API error in the current turn. Returns the turn's (prompt id, index) for the error row."""
        turn = self._turn(sid, agent_id)
        if turn is None:
            return "", None
        turn.error_count += 1
        turn.api_error_count += 1
        turn.ended_with_api_error = 1
        self._touch_turn(turn, ts)
        return turn.prompt_id, turn.turn_index

    def _api_error(self, sid: str, obj: dict, ts: float, agent_id: str, cwd: str) -> None:
        prompt_id, turn_index = self._turn_error(sid, agent_id, ts)
        self.buffer.add_request(
            fact_rows.RequestRow(
                dedup_key=fact_rows._dedup_key("claude-api-error", str(obj.get("uuid") or ""), sid),
                ts=ts,
                session_id=sid,
                agent_id=agent_id,
                tool="claude-code",
                project_path=cwd,
                is_error=1,
                error_type=str(obj.get("error") or "api_error")[:80],
                http_status=to_int(obj.get("apiErrorStatus")),
                prompt_id=prompt_id,
                turn_index=turn_index,
            )
        )

    def _compaction(self, sid: str, obj: dict, ts: float, agent_id: str) -> None:
        meta = obj.get("compactMetadata") if isinstance(obj.get("compactMetadata"), dict) else {}
        agent_id = agent_id or (str(obj.get("agentId") or "") if obj.get("isSidechain") else "")
        if (turn := self._turn(sid, agent_id)) is not None:
            turn.compactions += 1
            self._touch_turn(turn, ts)
        if (part := self._outcome(sid, agent_id, ts)) is not None:
            part["compactions"] = part.get("compactions", 0) + 1
        # Claude Code sends its context attachments again after a compaction: the earlier ones stop counting.
        reset = context_items.Item(context_items.RESET, context_items.ALL)
        self.buffer.add_context_item(_context_item_row(sid, agent_id, ts, reset, "claude-code", str(obj.get("cwd") or "")))
        preserved = meta.get("preservedMessages") if isinstance(meta.get("preservedMessages"), dict) else {}
        kept = preserved.get("uuids")
        everything = preserved.get("allUuids")
        # A copy of another session's line is skipped by the reader; a fork that rewrote the line's
        # session id owns it too, so the key names the session (D11).
        row = fact_rows.ContextEventRow(
            dedup_key=fact_rows._dedup_key("claude-compact", sid, str(obj.get("uuid") or ts)),
            cumulative_dropped_tokens=to_count(meta.get("cumulativeDroppedTokens")),
            preserved_messages=len(kept) if isinstance(kept, list) else None,
            detail={"all_uuids": len(everything)} if isinstance(everything, list) else {},
            ts=ts,
            session_id=sid,
            agent_id=agent_id,
            tool="claude-code",
            kind="compaction",
            trigger=str(meta.get("trigger") or ""),
            before_tokens=to_count(meta.get("preTokens")),
            after_tokens=to_count(meta.get("postTokens")),
            duration_ms=to_count(meta.get("durationMs")),
        )
        self._last_compaction[f"{sid}/{agent_id}"] = row
        self.buffer.add_context_event(row)

    def _context_report(self, sid: str, obj: dict, ts: float, agent_id: str) -> None:
        """The output of ``/context``: Claude Code's own count of what fills the context."""
        content = obj.get("content")
        if not isinstance(content, str) or context_items.REPORT_HEADING not in content:
            return
        agent_id = agent_id or (str(obj.get("agentId") or "") if obj.get("isSidechain") else "")
        for item in context_items.claude_context_report(content):
            self.buffer.add_context_item(
                fact_rows.ContextItemRow(
                    session_id=sid, kind=item.kind, name=item.name, ts=ts, agent_id=agent_id, path=item.path,
                    chars=item.chars, tokens=item.tokens, estimated=0, tool="claude-code", project_path=str(obj.get("cwd") or ""),
                )
            )

    def _system_line(self, sid: str, obj: dict, ts: float, agent_id: str) -> None:
        if obj.get("subtype") == "compact_boundary":
            self._compaction(sid, obj, ts, agent_id)
            return
        if obj.get("subtype") == "local_command":
            self._context_report(sid, obj, ts, agent_id)
            return
        if obj.get("subtype") == "stop_hook_summary":
            if (part := self._outcome(sid, agent_id, ts)) is not None:
                part["hook_runs"] = part.get("hook_runs", 0) + to_int(obj.get("hookCount"))
                errors = obj.get("hookErrors")
                part["hook_failures"] = part.get("hook_failures", 0) + (len(errors) if isinstance(errors, list) else 0)
            return
        if obj.get("subtype") != "api_error":
            return
        error = obj.get("error") if isinstance(obj.get("error"), dict) else {}
        inner = error.get("error") if isinstance(error.get("error"), dict) else {}
        error_agent = agent_id or (str(obj.get("agentId") or "") if obj.get("isSidechain") else "")
        prompt_id, turn_index = self._turn_error(sid, error_agent, ts)
        self.buffer.add_request(
            fact_rows.RequestRow(
                dedup_key=fact_rows._dedup_key("claude-api-error", str(obj.get("uuid") or ""), sid),
                ts=ts,
                session_id=sid,
                agent_id=agent_id or (str(obj.get("agentId") or "") if obj.get("isSidechain") else ""),
                tool="claude-code",
                project_path=str(obj.get("cwd") or ""),
                is_error=1,
                error_type=str(inner.get("type") or error.get("type") or "api_error")[:80],
                http_status=to_int(error.get("status")),
                prompt_id=prompt_id,
                turn_index=turn_index,
            )
        )

    def _prompt(self, sid: str, obj: dict, msg: dict, ts: float, agent_id: str, cwd: str) -> None:
        if obj.get("isMeta"):
            self._note_skill_body(sid, msg, ts, agent_id, cwd)
            return
        if obj.get("isCompactSummary"):
            self._compact_summary(sid, msg, ts, agent_id, cwd)
            return
        if "toolUseResult" in obj:
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
            fact_rows.SessionPromptRow(
                dedup_key=fact_rows._dedup_key("claude-prompt", uuid or f"{sid}{ts}"),
                ts=ts,
                session_id=sid,
                agent_id=agent_id,
                tool="claude-code",
                project_path=cwd,
                text=_redact(text[:PROMPT_MAX_CHARS]) if self.keep_text else "",
                prompt_file=prompt_file,
                prompt_id=str(obj.get("promptId") or "")[:200],
            )
        )

    def _compact_summary(self, sid: str, msg: dict, ts: float, agent_id: str, cwd: str) -> None:
        """The summary a compaction left in place of the conversation: a digest of the session (or subagent) so far.

        It follows its ``compact_boundary`` line in the same record, and the two link to each other."""
        key = f"{sid}/{agent_id}"
        seq = self._compact_seq[key] = self._compact_seq.get(key, 0) + 1
        event = self._last_compaction.pop(key, None)
        if event is not None:
            event.summary_kind, event.summary_seq = "compact_summary", seq
            self.buffer.add_context_event(event)
        self.buffer.add_digest(fact_rows.SessionDigestRow(
            session_id=sid, kind="compact_summary", seq=seq, ts=ts, text=digest_text(_text_of(msg.get("content"))),
            tool="claude-code", project_path=cwd, agent_id=agent_id, event_key=event.dedup_key if event else ""))

    def _todos(self, sid: str, args: dict, ts: float, agent_id: str, cwd: str) -> None:
        """``TodoWrite`` sends the whole list each time: each list is a version. The main agent's last list
        is the session's list in its outcome."""
        todos = args.get("todos")
        if not isinstance(todos, list):
            return
        items = [t for t in todos if isinstance(t, dict)]
        if not agent_id and (part := self._outcome(sid, "", ts, cwd)) is not None:
            part["todos_total"] = len(items)
            part["todos_completed"] = sum(1 for t in items if t.get("status") == "completed")
        listing = "\n".join(f"- [{t.get('status') or ''}] {t.get('content') or t.get('subject') or ''}" for t in items)
        key = f"{sid}/{agent_id}"
        seq = self._todo_seq[key] = self._todo_seq.get(key, 0) + 1
        self.buffer.add_digest(fact_rows.SessionDigestRow(
            session_id=sid, kind="todo_list", seq=seq, ts=ts, text=digest_text(listing), tool="claude-code",
            project_path=cwd, agent_id=agent_id))

    def _task_change(self, sid: str, name: str, args: dict, ts: float, agent_id: str, cwd: str) -> None:
        """One ``TaskCreate`` or ``TaskUpdate`` call: a change to the task list, as the call states it.
        The tool never sends the whole list, so no list is rebuilt from the changes."""
        verb = "create" if name == "TaskCreate" else "update"
        fields = [f"{k}: {args[k]}" for k in ("taskId", "subject", "status", "owner", "activeForm", "description")
                  if isinstance(args.get(k), (str, int)) and not isinstance(args.get(k), bool) and args.get(k) != ""]
        key = f"{sid}/{agent_id}"
        seq = self._task_seq[key] = self._task_seq.get(key, 0) + 1
        title = str(args.get("subject") or (f"#{args['taskId']}" if args.get("taskId") else ""))[:200]
        self.buffer.add_digest(fact_rows.SessionDigestRow(
            session_id=sid, kind="task_change", seq=seq, ts=ts, title=title,
            text=digest_text("\n".join([verb, *fields])), tool="claude-code", project_path=cwd, agent_id=agent_id))

    def _note_skill_body(self, sid: str, msg: dict, ts: float, agent_id: str, cwd: str) -> None:
        command = self._last_command.pop(sid, None)
        if command is not None and _text_of(msg.get("content")).lstrip().startswith("Base directory for this skill:"):
            self._skill(command[0], sid, command[1], "user", ts, agent_id, cwd)

    def _skill(self, key: str, sid: str, name: str, trigger: str, ts: float, agent_id: str, cwd: str, *,
               tool_call_id: str = "") -> None:
        turn = self._turn(sid, agent_id)
        self.buffer.add_skill(
            fact_rows.SkillUseRow(
                dedup_key=fact_rows._dedup_key("claude-skill", key),
                ts=ts,
                session_id=sid,
                agent_id=agent_id,
                tool="claude-code",
                project_path=cwd,
                name=name,
                trigger=trigger,
                tool_call_id=tool_call_id[:120],
                prompt_id=turn.prompt_id if turn else "",
            )
        )

    def _tool_uses(self, sid: str, obj: dict, msg: dict, ts: float, agent_id: str, cwd: str) -> None:
        content = msg.get("content")
        if not isinstance(content, list):
            return
        turn = self._turn(sid, agent_id)
        msg_id, req_id = str(msg.get("id") or ""), str(obj.get("requestId") or "")
        request_key = fact_rows._dedup_key("claude-call", msg_id, req_id) if (msg_id or req_id) else ""
        hint = str(obj.get("attributionMcpServer") or "")
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            tool_id = str(block.get("id") or "")
            if not tool_id or hash(tool_id) in self._tools_seen:
                continue
            self._tools_seen.add(hash(tool_id))
            name = str(block.get("name") or "")
            args = block.get("input") if isinstance(block.get("input"), dict) else {}
            found = target_fields(name, args, keep_text=self.keep_text, server_hint=hint)
            server, server_tool = split_mcp(name, hint=hint)
            if turn is not None:
                turn.tool_call_count += 1
                self._touch_turn(turn, ts)
            row = fact_rows.ToolInvocationRow(
                dedup_key=fact_rows._dedup_key("claude-tool", tool_id),
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
                mcp_server=server,
                mcp_tool=server_tool,
                **found,
                turn_index=turn.turn_index if turn else None,
                prompt_id=turn.prompt_id if turn else "",
                request_key=request_key,
            )
            self._pending[tool_id] = (row, cwd, args)
            message_id = hash(str(msg.get("id") or ""))
            self._tool_message[tool_id] = message_id
            self._message_last_block[message_id] = max(self._message_last_block.get(message_id, 0.0), ts)
            self.buffer.add_tool(row)
            if name == "Skill" and isinstance(args.get("skill"), str):
                self._skill(tool_id, sid, args["skill"], "agent-invoked", ts, agent_id, cwd, tool_call_id=tool_id)
            elif name == "TodoWrite":
                self._todos(sid, args, ts, agent_id, cwd)
            elif name in ("TaskCreate", "TaskUpdate"):
                self._task_change(sid, name, args, ts, agent_id, cwd)

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
            started = max(row.ts, self._message_last_block.get(self._tool_message.pop(row.source_event_id, 0), 0.0))
            row.duration_ms = max(0.0, (ts - started) * 1000)
            if confirm in _PERSON_DECIDED or row.tool_name in _PERSON_TOOLS:
                # This time holds a person's wait, and the file does not say how much of it.
                row.duration_ms = 0.0
            row.is_error = 1 if failed else 0
            row.confirm = confirm
            result = obj.get("toolUseResult")
            if isinstance(result, dict) and isinstance(result.get("interrupted"), bool):
                row.interrupted = result["interrupted"]
            if failed:
                row.result_summary = _redact(text[:RESULT_MAX_CHARS]) if self.keep_text else ""
                row.error_summary = error_excerpt(text, self.keep_text)
                code = _EXIT_CODE.match(text)
                row.exit_code = int(code.group(1)) if code else None
                if (turn := self._turns.get((row.session_id, row.prompt_id))) is not None:
                    turn.error_count += 1
                    self._touch_turn(turn, ts)
            self.buffer.add_tool(row)
            if failed:
                continue
            if row.tool_name == "Bash":
                result = obj.get("toolUseResult")
                stdout = result.get("stdout") if isinstance(result, dict) else text
                for commit in commits_of(args.get("command"), stdout, session_id=row.session_id, cwd=cwd, ts=ts,
                                         keep_text=self.keep_text, call_id=row.source_event_id,
                                         agent_id=row.agent_id, prompt_id=row.prompt_id):
                    self.buffer.add_commit(commit)
            if row.tool_name in _CLAUDE_WRITE_TOOLS:
                self._file_edit(row, cwd, args, obj.get("toolUseResult"), ts)
            elif row.tool_name in _CLAUDE_READ_TOOLS and row.target_kind == FILE and row.target_id:
                self.buffer.touch_file(row.session_id, row.agent_id, absolute_path(row.target_id, cwd), "read",
                                       row.tool_name, row.ts, row.tool, cwd)
            elif row.target_kind == AGENT:
                self._agent_result(row, args, obj.get("toolUseResult"), ts)

    def _agent_result(self, row: fact_rows.ToolInvocationRow, args: dict, result: Any, ts: float) -> None:
        """The Agent tool's result names the subagent it started: its id, model and state.

        A result with status ``completed`` is the caller's word that the subagent finished;
        ``async_launched`` says only that it started, so it reports no completion."""
        if not isinstance(result, dict) or not result.get("agentId"):
            return
        status = str(result.get("status") or "")[:40]
        done = status == "completed"
        self.buffer.add_agent(fact_rows.AgentRow(
            agent_id=str(result["agentId"]), session_id=row.session_id, tool="claude-code",
            task=str(result.get("agentType") or args.get("subagent_type") or "")[:120], is_sidechain=1,
            description=agent_label(args.get("description") or result.get("description")),
            parent_agent_id=row.agent_id, parent_tool_use_id=row.source_event_id,
            resolved_model=str(result.get("resolvedModel") or "")[:120], status=status,
            completed=1 if done else 0, ended_at=ts if done and ts else None, observed_at=ts if done else 0.0))

    def _file_edit(self, row: fact_rows.ToolInvocationRow, cwd: str, args: dict, result: Any, done: float = 0.0) -> None:
        """A file the call wrote. *done* is the time of its result line: the write happened between it and the call."""
        path = str(args.get("file_path") or args.get("notebook_path") or "")
        if not path:
            return
        counts = patch_line_counts(result.get("structuredPatch")) if isinstance(result, dict) else None
        if counts is None:
            counts = _claude_input_line_counts(row.tool_name, args)
        detail: dict[str, Any] = {"tool_use_id": row.source_event_id}
        if counts is not None:
            detail["lines_added"], detail["lines_removed"] = counts
        full = absolute_path(path, cwd)
        created = row.tool_name == "Write" and isinstance(result, dict) and result.get("type") == "create"
        self.buffer.touch_file(row.session_id, row.agent_id, full, "created" if created else "edited",
                               row.tool_name, row.ts, row.tool, cwd)
        if (turn := self._turns.get((row.session_id, row.prompt_id))) is not None:
            files = self._turn_files.setdefault((row.session_id, row.prompt_id), set())
            files.add(hash(full))
            turn.files_changed = len(files)
            self._touch_turn(turn, row.ts)
        if (part := self._outcome(row.session_id, row.agent_id, row.ts)) is not None:
            _add_unique(part.setdefault("file_keys", []), file_key(full))
        if isinstance(result, dict) and result.get("memdirStamped") is True:
            detail["memdir_stamped"] = True  # the tool's own mark of a write into its memory folder
        write = fact_rows.FileWriteRow(
            dedup_key=claude_write_key(row.source_event_id, path),
            ts=row.ts,
            path=full,
            session_id=row.session_id,
            tool=row.tool,
            tool_name=row.tool_name,
            operation=_CLAUDE_WRITE_TOOLS[row.tool_name],
            project_path=cwd,
            source_event_id=row.source_event_id,
            detail=detail,
            agent_id=row.agent_id,
            prompt_id=row.prompt_id,
            turn_index=row.turn_index,
        )
        if not memory_mechanism(full):
            self.buffer.add_file_write(write)
            return
        # A memory or instruction file: its content before and after, from the call itself where it has it.
        result = result if isinstance(result, dict) else {}
        original = result.get("originalFile")
        if created or (row.tool_name == "Write" and "originalFile" in result and original is None):
            before = Image(ABSENT, size=0)
        else:
            before = image_of(original, TOOL_RESULT) if isinstance(original, str) else None
        if row.tool_name == "Write" and isinstance(args.get("content"), str):
            after = image_of(args["content"], TOOL_INPUT)
        else:
            after = read_if_fresh(full, row.ts, done or row.ts)
        self.buffer.add_memory_write(write, before, after)


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


def read_claude_agent_meta(path: Path) -> dict:
    """The small ``agent-<id>.meta.json`` beside a subagent's file: agentType, description, toolUseId, spawnDepth."""
    try:
        meta = path.with_name(path.stem + ".meta.json")
        if meta.stat().st_size > 64_000:
            return {}
        data = json.loads(meta.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def agent_meta_fields(meta: dict) -> dict[str, Any]:
    """The agent row fields a Claude Code ``agent-<id>.meta.json`` gives; empty when it does not give them."""
    return {
        "description": agent_label(meta.get("description")),
        "spawn_depth": to_count(meta.get("spawnDepth")),
        "parent_agent_id": str(meta.get("parentAgentId") or "")[:120],
        "parent_tool_use_id": str(meta.get("toolUseId") or "")[:120],
        "worktree_path": str(meta.get("worktreePath") or "")[:1000],
    }


def fill_agent_meta(row: fact_rows.AgentRow, meta: dict) -> None:
    """Give *row* the meta file's fields it does not have. A field it has stays as it is."""
    for name, value in agent_meta_fields(meta).items():
        if value not in (None, "") and getattr(row, name) in (None, ""):
            setattr(row, name, value)
    if not row.task and meta.get("agentType"):
        row.task = str(meta["agentType"])[:120]


def read_claude_agent_role(path: Path) -> str:
    """The role a subagent was started with, from the small ``agent-<id>.meta.json`` beside its file."""
    return str(read_claude_agent_meta(path).get("agentType") or "")[:120]


# ── Copilot CLI and desktop ────────────────────────────────────────────


def copilot_call_key(session_id: str, tokens: tuple[int, int, int, int], occurrence: int) -> str:
    """One key for a call, whether it was read from ``events.jsonl`` or the store.

    The store has no call id, but its rows carry the same four raw token counts
    as the event, so the n-th call with the same counts is the same call.
    """
    return fact_rows._dedup_key("copilot-call", session_id, *map(str, tokens), str(occurrence))


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
        self.steps = CopilotSteps(session_id, buffer.add_step, buffer.add_cost_link)
        self.keep_text = _keep_text(buffer.store)
        self.cwd = ""
        self.git_root = ""
        self.model = ""
        self._occurrence: Counter[tuple[int, int, int, int]] = Counter()
        self._record_ids: set[str] = set()
        self._compactions: list[tuple[dict, float, str, str, fact_rows.TurnRequestLink | None]] = []
        self._running: dict[str, fact_rows.ToolInvocationRow] = {}
        # A completion needs counts per file, never the patch body.
        self._patches: dict[str, dict[str, tuple[int, int]]] = {}
        self._confirms: dict[str, tuple[str, float]] = {}
        self._permissions: dict[str, tuple[float, str, str, str, str]] = {}
        # The person's turns so far (1 = the first), the task calls that start subagents, and
        # the file a call views, read when it completes.
        self.turn = 0
        self._tasks: dict[str, tuple[str, dict[str, str]]] = {}
        self._views: dict[str, str] = {}
        # The command of each shell call still running: its result may report a commit.
        self._commands: dict[str, str] = {}
        self._summaries = 0
        self._compaction_count = 0
        self._todo_seq: dict[str, int] = {}
        # The arguments of memory tool calls still running: their completion says whether they saved.
        self._memory_args: dict[str, dict] = {}
        self.repository = ""
        # The request row of each recent call, by apiCallId: its message comes after its usage record
        # and adds the thinking counts. Values: (row, visible chars, visible blocks, redacted blocks).
        self._calls_by_api: dict[str, list] = {}
        # The interactionId of the person's current turn, and the hash of each agent's last feature flag set.
        self.interaction = ""
        self._flag_sets: dict[str, str] = {}
        # The apiCallId of the model call that asked for each tool call (assistant.message toolRequests),
        # and the turn row of each interactionId.
        self._tool_api: dict[str, str] = {}
        self._api_tools: dict[str, list[str]] = {}
        self._tool_rows: dict[str, fact_rows.ToolInvocationRow] = {}
        self._turn_rows: dict[str, fact_rows.SessionTurnRow] = {}

    def reset(self) -> None:
        """The file was rewritten and is read again from the start, so counting starts over."""
        self.__init__(self.sid, self.buffer)  # type: ignore[misc]
        self.buffer.forget_files(self.sid, "")
        if self.buffer.book is not None:
            self.buffer.book.reset(self.sid, TRANSCRIPT_PART)

    def _turn_index(self) -> int | None:
        return self.turn or None

    def _outcome(self, ts: float) -> dict | None:
        book = self.buffer.book
        return None if book is None else book.part(self.sid, TRANSCRIPT_PART, ts, tool="copilot-cli", project=self.cwd)

    def feed(self, obj: dict) -> None:
        kind = obj.get("type")
        data = obj.get("data") if isinstance(obj.get("data"), dict) else {}
        ts = coerce_ts(obj.get("timestamp"))
        agent_id = str(obj.get("agentId") or "")
        event_id = str(obj.get("id") or "")
        if self.steps is not None:
            self.steps.feed(obj, data, ts, self.cwd)
        if kind == "user.message" and not agent_id:
            self.interaction = str(data.get("interactionId") or "")
        if kind in COPILOT_CONFIG_KINDS:
            self._config(kind, data, ts, agent_id, event_id)
        if kind in ("session.start", "session.resume"):
            ctx = data.get("context") if isinstance(data.get("context"), dict) else {}
            self.cwd = str(ctx.get("cwd") or self.cwd)
            self.git_root = str(ctx.get("gitRoot") or self.git_root)
            self.repository = str(ctx.get("repository") or self.repository)
        elif kind == "system.message":
            self._system_message(data, ts, agent_id)
        elif kind == "subagent.selected":
            self._custom_agent(data, ts, agent_id)
        elif kind == "session.model_change" and data.get("newModel"):
            self.model = str(data["newModel"])
        elif kind == "assistant.message":
            if data.get("model"):
                self.model = str(data["model"])
            self._message(data)
            self._thinking(data, ts, agent_id)
        elif kind == "session.usage_record":
            usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
            for key in ("requestId", "apiCallId"):
                if usage.get(key):
                    self._record_ids.add(str(usage[key]))
            link = self.steps.usage_link(obj, data, usage, ts, self.cwd) if self.steps else None
            self._call(usage, ts, agent_id, link)
        elif kind == "session.compaction_complete":
            used = data.get("compactionTokensUsed")
            if isinstance(used, dict):
                # Background compaction may overlap an unrelated open turn.
                link = self.steps.usage_link(obj, data, used, ts, self.cwd, allow_open=False) if self.steps else None
                self._compactions.append((used, ts, str(data.get("requestId") or ""), agent_id, link))
            self._compaction(data, ts, agent_id, event_id)
        elif kind == "session.shutdown":
            self._split(data, ts, agent_id, event_id)
            self._shutdown(data, ts)
            self._event("session_shutdown", event_id or str(ts), ts, agent_id,
                        trigger=str(data.get("shutdownType") or "")[:80],
                        detail={k: _config_value(data[k]) for k in _SHUTDOWN_FIELDS if _config_value(data.get(k)) is not None})
        elif kind == "session.error":
            self._api_error(data, ts, agent_id, event_id)
        elif kind == "user.message":
            if not agent_id:
                self.turn += 1
                self._open_turn(data, ts)
            self._prompt(data, ts, agent_id, event_id)
        elif kind == "session.mode_changed" and data.get("newMode"):
            if (part := self._outcome(ts)) is not None:
                _add_unique(part.setdefault("modes", []), str(data["newMode"])[:40])
                part["last_mode"] = str(data["newMode"])[:40]
        elif kind == "hook.end":
            if (part := self._outcome(ts)) is not None:
                part["hook_runs"] = part.get("hook_runs", 0) + 1
                part["hook_failures"] = part.get("hook_failures", 0) + (1 if data.get("success") is False else 0)
        elif kind == "session.task_complete":
            self._task_complete(data, ts)
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
        elif kind == "session.truncation":
            self._truncation(data, ts, agent_id, event_id)
        elif kind == "session.snapshot_rewind":
            self._rewound(data, ts, agent_id, event_id)
        elif kind == "instruction.update":
            self._instruction_update(data, ts, agent_id, event_id)
        elif kind == "session.tool_baseline":
            self._tool_baseline(data, ts, agent_id, event_id)

    def _event(self, kind: str, key: str, ts: float, agent_id: str, **fields: Any) -> None:
        fields.setdefault("turn_index", self._turn_index())
        self.buffer.add_context_event(fact_rows.ContextEventRow(
            dedup_key=fact_rows._dedup_key(f"copilot-{kind}", self.sid, key), ts=ts, session_id=self.sid,
            agent_id=agent_id, tool="copilot-cli", kind=kind, **fields))

    def _truncation(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        """Copilot dropped old messages to fit its limit, without a summary. Message tokens only."""
        self._event("truncation", event_id or str(ts), ts, agent_id,
                    trigger=str(data.get("performedBy") or "")[:80],
                    before_tokens=to_count(data.get("preTruncationTokensInMessages")),
                    after_tokens=to_count(data.get("postTruncationTokensInMessages")),
                    dropped_tokens=to_count(data.get("tokensRemovedDuringTruncation")),
                    dropped_messages=to_count(data.get("messagesRemovedDuringTruncation")),
                    detail={k: data[k] for k in ("tokenLimit", "preTruncationMessagesLength",
                                                  "postTruncationMessagesLength", "toolDefinitionsTokenCount")
                            if type(data.get(k)) is int})

    def _rewound(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        """The session was rewound to a snapshot. No event of this kind was on the machine this was
        written on: its fields are kept as ids only (strings and numbers), without any text."""
        ids = {k: v for k, v in data.items() if isinstance(v, (int, float)) and not isinstance(v, bool)
               or isinstance(v, str) and len(v) <= 120 and k.lower().endswith("id")}
        self._event("rewind_point", event_id or str(ts), ts, agent_id, trigger="rewind",
                    message_id=str(data.get("eventId") or data.get("snapshotId") or ""), detail=ids)

    def _instruction_update(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        """An instruction the runtime puts into the context changed (``name``, for example a mode's
        state). Its text is kept in file_blobs under ``content_hash``."""
        content = data.get("content") if isinstance(data.get("content"), str) else None
        image = image_of(content, TOOL_INPUT) if content is not None else Image("")
        if image.hash and image.text is not None:
            self.buffer.add_blob(image.hash, image.text, ts)
        self._event("instruction_update", event_id or str(ts), ts, agent_id, trigger=str(data.get("name") or "")[:80],
                    content_hash=image.hash,
                    detail={**{k: data[k] for k in ("authority", "lifetime", "boundary", "fallback")
                               if isinstance(data.get(k), str)},
                            **({"post_initial": data["postInitial"]} if isinstance(data.get("postInitial"), bool) else {}),
                            **({"bytes": image.size} if image.size is not None else {})})

    def _tool_baseline(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        """The tools the session had loaded: whether its memory and context-management tools were there."""
        tools = data.get("tools") if isinstance(data.get("tools"), list) else []
        names = {str(t.get("name")) for t in tools if isinstance(t, dict) and t.get("name")}
        self._event("tool_baseline", event_id or str(ts), ts, agent_id, trigger=str(data.get("surface") or "")[:80],
                    detail={"tool_count": len(tools), "memory_tools": sorted(names & COPILOT_RECALL_AND_MEMORY_TOOLS),
                            "context_tools": sorted(names & COPILOT_CONTEXT_TOOLS)})

    def _config(self, kind: str, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        """A setting the session ran under, or a change of one, as the event reports it.

        ``detail`` keeps the event's own field names and only the fields it wrote: a value the tool
        did not report is absent. The turn and prompt are the person's turn this event follows in
        the file. Feature flags are a row only when an agent's set differs from its previous call's;
        an assignment context keeps its hash and size, never its text."""
        detail: dict[str, Any] = {name: _config_value(data[name]) for name in _CONFIG_FIELDS.get(kind, ())
                                  if _config_value(data.get(name)) is not None}
        trigger = ""
        if kind in ("session.start", "session.resume"):
            ctx = data.get("context") if isinstance(data.get("context"), dict) else {}
            context = {name: _config_value(ctx[name]) for name in _CONTEXT_FIELDS if _config_value(ctx.get(name)) is not None}
            if context:
                detail["context"] = context
        elif kind == "session.model_change":
            trigger = str(data.get("source") or data.get("reason") or "")[:80]
        elif kind == "session.info":
            if data.get("infoType") != "managed_model_override":
                return
            trigger = "managed_model_override"
            if isinstance(detail.get("message"), str):
                detail["message"] = _redact(detail["message"])
        elif kind == "model.model_call_success":
            settings = data.get("requestSettings") if isinstance(data.get("requestSettings"), dict) else {}
            flags = settings.get("enabledFeatureFlags")
            if not isinstance(flags, list):
                return
            names = sorted({str(name) for name in flags if isinstance(name, str)})
            digest = text_hash("\n".join(names))[:16]
            if self._flag_sets.get(agent_id) == digest:
                return
            previous = self._flag_sets.get(agent_id)
            self._flag_sets[agent_id] = digest
            detail = {"flags": names, "count": len(names), "hash": digest,
                      **({"previous_hash": previous} if previous is not None else {})}
        elif kind == "model.captured_assignment_context":
            context = data.get("assignmentContext")
            if not isinstance(context, str):
                return
            detail = {"hash": text_hash(context)[:16], "bytes": len(context.encode("utf-8", "replace")),
                      **({"kind": str(data["kind"])[:80]} if isinstance(data.get("kind"), str) else {})}
        self._event(COPILOT_CONFIG_KINDS[kind], event_id or str(ts), ts, agent_id, trigger=trigger,
                    prompt_id=self.interaction if self.turn else "", detail=detail)

    def _context_tool(self, row: fact_rows.ToolInvocationRow, data: dict) -> None:
        """A call of a tool that reads memory or manages the context: an event of its own.

        ``session_store_sql`` searches past sessions; its query stays in the call's 24-hour tool
        content, linked by ``tool_call_id``. The tools behind the ``contextManagementTools`` setting
        were not called on the machine this was written on: their argument shapes are unverified."""
        args = self._memory_args.pop(row.source_event_id, None) or {}
        if row.is_error:
            return
        name = row.tool_name
        kind = {"session_store_sql": "memory_recall", "session_history": "memory_recall",
                "session_artifacts": "checkpoint", "new_context": "context_reset",
                "get_context_remaining": "context_query"}[name]
        path = next((str(args[k]) for k in ("path", "file_path", "filePath", "name") if isinstance(args.get(k), str)), "")
        self._event(kind, row.source_event_id, row.ts, row.agent_id, trigger=name, tool_call_id=row.source_event_id,
                    prompt_id=str(data.get("interactionId") or ""), path=path,
                    detail={"bytes": len(args["content"].encode())} if isinstance(args.get("content"), str) else {})

    def read_rewind_index(self, path: Path) -> None:
        """``rewind-file-snapshots/index.json``: one rewind point per snapshot (a user message), with
        its files. Hashes are SHA-256 of the raw bytes, so their first 32 digits are file_blobs hashes;
        a backup's content is kept for memory and instruction files only."""
        try:
            index = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return
        backups = path.parent / "backups"
        for snap in index.get("snapshots") or [] if isinstance(index, dict) else []:
            if not isinstance(snap, dict):
                continue
            ts = coerce_ts(snap.get("timestamp"))
            message_id = str(snap.get("eventId") or snap.get("snapshotId") or "")
            files = snap.get("files") if isinstance(snap.get("files"), dict) else {}
            for info in files.values():
                if not isinstance(info, dict) or not info.get("path"):
                    continue
                file_path = str(info["path"])
                pre = info.get("preimage") if isinstance(info.get("preimage"), dict) else {}
                mechanism = memory_mechanism(file_path)
                content = None
                if mechanism and pre.get("backupFile"):
                    try:
                        with open(backups / os.path.basename(str(pre["backupFile"])), "rb") as fh:
                            content = fh.read(BLOB_MAX_BYTES + 1)
                    except OSError:
                        content = None
                digest = str(pre.get("contentHash") or "")
                self.buffer.add_file_version(fact_rows.FileVersionRow(
                    path=file_path, ts=ts, session_id=self.sid, origin="copilot_rewind", source_event_id=message_id,
                    mechanism=mechanism, state=str(pre.get("kind") or "")[:40],
                    blob_hash=digest[:32] if content is None and len(digest) == 64 else "",
                    size_bytes=pre["size"] if type(pre.get("size")) is int else None,
                    lines_added=to_count(info.get("linesAdded")), lines_removed=to_count(info.get("linesRemoved"))),
                    content)
            self._event("rewind_point", str(snap.get("snapshotId") or message_id), ts, "", trigger="snapshot", turn_index=None,
                        message_id=message_id, files_count=to_count(snap.get("fileCount")),
                        lines_added=to_count(snap.get("linesAdded")), lines_removed=to_count(snap.get("linesRemoved")),
                        detail={"snapshot_id": str(snap.get("snapshotId") or "")})

    def finish_poll(self, now: float, pending_window_s: float) -> None:
        """Write what only the end of a read can settle: compactions and prompts still open."""
        for used, ts, request_id, agent_id, link in self._compactions:
            if request_id not in self._record_ids:
                self._call(used, ts, agent_id, link)
        self._compactions.clear()
        for request_id, (ts, name, target, tool_call_id, agent_id) in self._permissions.items():
            if now - ts <= pending_window_s:
                self._write_confirm(request_id, ts, name, target, tool_call_id, agent_id, "pending", 0.0)

    def _call(self, usage: dict, ts: float, agent_id: str, link: fact_rows.TurnRequestLink | None) -> None:
        raw = to_int(usage.get("inputTokens"))
        read, write = to_int(usage.get("cacheReadTokens")), to_int(usage.get("cacheWriteTokens"))
        out = to_int(usage.get("outputTokens"))
        tokens = (raw, out, read, write)
        n = self._occurrence[tokens]
        self._occurrence[tokens] += 1
        model = str(usage.get("model") or self.model)
        billable = max(0, raw - read - write)
        key = copilot_call_key(self.sid, tokens, n)
        request = (
            fact_rows.RequestRow(
                dedup_key=key,
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
                turn_index=self._turn_index(),
                effort=str(usage.get("reasoningEffort") or "")[:20],
                thinking_tokens=to_count(usage.get("reasoningTokens")),
                # The ids as session_steps stores them (round_id, request_id), so the two join.
                request_id=step_label(usage.get("requestId") or usage.get("providerCallId")),
                api_call_id=step_api_id(usage.get("apiCallId")),
                prompt_id=self.interaction,
            )
        )
        self.buffer.add_request(request)
        self._give_request_key(step_api_id(usage.get("apiCallId")), key)
        if (turn := self._turn_rows.get(self.interaction)) is not None:
            turn.request_count += 1
            turn.input_tokens += billable
            turn.output_tokens += out
            turn.cache_read_tokens += read
            turn.cache_creation_tokens += write
            self._touch_turn(turn, ts)
        if usage.get("apiCallId"):
            self._calls_by_api[step_api_id(usage.get("apiCallId")) or str(usage["apiCallId"])] = [request, 0, 0, 0, key]
            while len(self._calls_by_api) > 256:
                self._calls_by_api.pop(next(iter(self._calls_by_api)))
        if self.steps and link is not None:
            self.steps.link_request(link, key, usage.get("apiCallId"))

    def _message(self, data: dict) -> None:
        """An assistant message names the model call it is the reply of (apiCallId) and the tool calls
        that call asked for: each tool call gets the call's request key, the call its message id."""
        api = step_api_id(data.get("apiCallId"))
        if not api:
            return
        for req in data.get("toolRequests") if isinstance(data.get("toolRequests"), list) else ():
            if isinstance(req, dict) and req.get("toolCallId"):
                self._tool_api[str(req["toolCallId"])] = api
                self._api_tools.setdefault(api, []).append(str(req["toolCallId"]))
                while len(self._tool_api) > 4096:
                    self._tool_api.pop(next(iter(self._tool_api)))
                while len(self._api_tools) > 1024:
                    self._api_tools.pop(next(iter(self._api_tools)))
        call = self._calls_by_api.get(api)
        if call is not None:
            self._give_request_key(api, call[4])
        message = step_label(data.get("messageId"))
        if call is not None and call[0] is not None and message and call[0].response_id != message:
            call[0] = replace(call[0], response_id=message)
            self.buffer.add_request(call[0])

    def _request_key_of(self, tool_call_id: str) -> str:
        call = self._calls_by_api.get(self._tool_api.get(tool_call_id, ""))
        return call[4] if call else ""

    def _give_request_key(self, api: str, key: str) -> None:
        """Tool calls read before their model call's usage record or message get its key now."""
        if not api:
            return
        for call_id in self._api_tools.get(api, ()):
            row = self._tool_rows.get(call_id)
            if row is not None and not row.request_key:
                row.request_key = key
                if call_id not in self._running:
                    self.buffer.add_tool(row)

    def _open_turn(self, data: dict, ts: float) -> None:
        """A person's message opens a turn, keyed by its interactionId (Copilot's own turn id)."""
        if not self.interaction or self.interaction in self._turn_rows:
            return
        origin = str(data.get("source") or "")[:40]
        turn = fact_rows.SessionTurnRow(session_id=self.sid, prompt_id=self.interaction, ts=ts, turn_index=self.turn,
                                        tool="copilot-cli", project_path=self.cwd, origin=origin or "human")
        self._turn_rows[self.interaction] = turn
        self._touch_turn(turn, ts)

    def _touch_turn(self, turn: fact_rows.SessionTurnRow, ts: float) -> None:
        if ts:
            turn.ts = min(t for t in (turn.ts, ts) if t)
            turn.ended_at = max(turn.ended_at, ts)
        self.buffer.mark("turns", (turn.session_id, turn.prompt_id), turn)

    def _thinking(self, data: dict, ts: float, agent_id: str) -> None:
        """A message's reasoning: ``reasoningText`` is visible; ``reasoningOpaque`` and encrypted blocks are counted only."""
        text = data.get("reasoningText") if isinstance(data.get("reasoningText"), str) else ""
        blocks = data.get("reasoningBlocks") if isinstance(data.get("reasoningBlocks"), dict) else {}
        encrypted = [b for b in blocks.get("blocks") or [] if isinstance(b, dict) and b.get("encrypted_content")]
        hidden = len(encrypted) or (1 if data.get("reasoningOpaque") or data.get("encryptedContent") else 0)
        if not text and not hidden:
            return
        api = step_api_id(data.get("apiCallId")) or str(data.get("apiCallId") or "")
        call = self._calls_by_api.get(api) if api else None
        key = call[4] if call else ""
        if call is not None:
            call[1] += len(text)
            call[2] += 1 if text else 0
            call[3] += hidden
            row = call[0]
            if row is not None:
                # The usage record's row, again with the thinking it had.
                call[0] = replace(row, thinking_chars=call[1], thinking_blocks=call[2], thinking_redacted=call[3])
                self.buffer.add_request(call[0])
        if text:
            index = call[2] - 1 if call is not None else 0
            message = str(data.get("messageId") or "")
            self.buffer.add_thinking(fact_rows.SessionThinkingRow(
                session_id=self.sid, thinking_key=fact_rows._dedup_key("copilot-thinking", self.sid, api or message, str(index)),
                ts=ts, agent_id=agent_id, request_key=key, message_id=message, turn_index=self._turn_index(),
                block_index=index, model=str(data.get("model") or self.model), chars=len(text), text=digest_text(text, THINKING_TEXT_MAX),
                tool="copilot-cli", project_path=self.cwd))

    def _shutdown(self, data: dict, ts: float) -> None:
        """The session's own totals at shutdown. A resumed session states them again, so the last one counts."""
        part = self._outcome(ts)
        if part is None:
            return
        changes = data.get("codeChanges") if isinstance(data.get("codeChanges"), dict) else {}
        for name, key in (("lines_added", "linesAdded"), ("lines_removed", "linesRemoved")):
            if type(changes.get(key)) is int:
                part[name] = changes[key]
        if isinstance(changes.get("filesModified"), list):
            part["files_changed"] = len(changes["filesModified"])
        if type(data.get("totalApiDurationMs")) in (int, float):
            part["reported_api_ms"] = float(data["totalApiDurationMs"])
        if type(data.get("totalPremiumRequests")) in (int, float):
            part["premium_requests"] = float(data["totalPremiumRequests"])

    def _task_complete(self, data: dict, ts: float) -> None:
        if (part := self._outcome(ts)) is not None:
            part["task_complete"] = 1
        self._summaries += 1
        self.buffer.add_digest(fact_rows.SessionDigestRow(
            session_id=self.sid, kind="task_summary", seq=self._summaries, ts=ts, text=digest_text(data.get("summary")),
            tool="copilot-cli", project_path=self.cwd))

    def _compaction(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        if data.get("success") is False:
            return
        self._compaction_count += 1
        if (part := self._outcome(ts)) is not None:
            part["compactions"] = part.get("compactions", 0) + 1
        number = data.get("checkpointNumber")
        seq = number if type(number) is int else self._compaction_count
        key = fact_rows._dedup_key("copilot-compact", self.sid, event_id or str(ts))
        summary = digest_text(data.get("summaryContent"))
        self.buffer.add_digest(fact_rows.SessionDigestRow(
            session_id=self.sid, kind="compact_summary", seq=seq, ts=ts, text=summary, tool="copilot-cli",
            project_path=self.cwd, agent_id=agent_id, event_key=key))
        self.buffer.add_context_event(
            fact_rows.ContextEventRow(
                summary_kind="compact_summary" if summary else "",
                summary_seq=seq if summary else None,
                checkpoint_no=number if type(number) is int else None,
                path=str(data.get("checkpointPath") or "")[:1000],
                dropped_messages=to_count(data.get("messagesRemoved")),
                dropped_tokens=to_count(data.get("tokensRemoved")),
                turn_index=self._turn_index(),
                dedup_key=key,
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
            fact_rows.ContextEventRow(
                dedup_key=fact_rows._dedup_key("copilot-split", self.sid, event_id or str(ts)),
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
            fact_rows.RequestRow(
                dedup_key=fact_rows._dedup_key("copilot-error", self.sid, event_id or str(ts)),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                project_path=self.cwd,
                model=normalize_model_id(self.model) or self.model,
                is_error=1,
                error_type=str(data.get("errorType") or "error")[:80],
                http_status=to_int(data.get("statusCode")),
                turn_index=self._turn_index(),
            )
        )

    def _prompt(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        source = str(data.get("source") or "")
        # A message another agent or the autopilot sent is not a person's prompt.
        if source and not agent_id:
            return
        text = str(data.get("content") or "")
        self.buffer.add_prompt(
            fact_rows.SessionPromptRow(
                dedup_key=fact_rows._dedup_key("copilot-prompt", self.sid, event_id or str(ts)),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                project_path=self.cwd,
                text=_redact(text[:PROMPT_MAX_CHARS]) if self.keep_text else "",
                # A subagent's prompt belongs to the person's turn it runs in, like its calls.
                prompt_id=self.interaction if agent_id else str(data.get("interactionId") or "")[:200],
            )
        )

    def _loaded(self, path: str, how: str, ts: float, agent_id: str, detail: str = "") -> None:
        self.buffer.add_loaded_file(
            fact_rows.LoadedFileRow(
                session_id=self.sid, path=path, how=how, ts=ts, detail=detail, tool="copilot-cli",
                agent_id=agent_id, project_path=self.cwd,
            )
        )

    def _root(self) -> str:
        if self.git_root or not self.cwd:
            return self.git_root
        from ..tree_walk import git_root

        top = git_root(self.cwd)
        return str(top) if top else ""

    def _system_message(self, data: dict, ts: float, agent_id: str) -> None:
        """The repository's instruction files whose text the system prompt holds. The text is not kept."""
        content = data.get("content")
        if not isinstance(content, str) or not content:
            return
        extra: list[str] = []
        if self.cwd:
            from ..tree_walk import files_for_folder

            extra = [p for p in files_for_folder(self.cwd)["files"] if p.endswith(".md")]
        for path, detail in loaded_files.system_prompt_files(content, self._root(), extra):
            self._loaded(path, loaded_files.SYSTEM_PROMPT, ts, agent_id, detail)
        for item in context_items.copilot_system_prompt(content, self._root(), extra):
            self.buffer.add_context_item(_context_item_row(self.sid, agent_id, ts, item, "copilot-cli", self.cwd))

    def _custom_agent(self, data: dict, ts: float, agent_id: str) -> None:
        path = loaded_files.custom_agent_file(self._root(), str(data.get("agentName") or ""))
        if path:
            self._loaded(path, loaded_files.CUSTOM_AGENT, ts, agent_id)

    def _skill(self, data: dict, ts: float, agent_id: str, event_id: str) -> None:
        name = str(data.get("name") or "")
        if not name:
            return
        path = str(data.get("path") or "")
        if os.path.isabs(path):
            self._loaded(path, loaded_files.SKILL, ts, agent_id)
        self.buffer.add_skill(
            fact_rows.SkillUseRow(
                dedup_key=fact_rows._dedup_key("copilot-skill", self.sid, event_id or f"{name}{ts}"),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                project_path=self.cwd,
                name=name,
                trigger=str(data.get("trigger") or ""),
                # skill.invoked names no tool call; it runs in the person's current turn.
                prompt_id=self.interaction,
            )
        )

    def _agent_started(self, obj: dict, data: dict, ts: float) -> None:
        """``subagent.started``: the agent row, and a ``subagent_start`` event with what the spawn named.

        ``task`` is the agent's own name (``agentDisplayName``, else the task call's ``name``, else
        ``agentName``); ``description`` the label the task call gave, else ``agentDescription``. The event's detail keeps each as reported: name,
        type (``agentType``), description, model and the task call's mode."""
        agent_id = str(obj.get("agentId") or data.get("agentId") or "")
        if not agent_id:
            return
        call_id = str(data.get("toolCallId") or "")
        caller, spawn = self._tasks.get(call_id, ("", {}))
        name = agent_label(data.get("agentDisplayName") or spawn.get("name") or data.get("agentName"))
        description = agent_label(spawn.get("description") or data.get("agentDescription"))
        model = str(data.get("model") or spawn.get("model") or "")[:120]
        self.buffer.add_agent(
            fact_rows.AgentRow(
                agent_id=agent_id,
                session_id=self.sid,
                tool="copilot-cli",
                task=name,
                model=model,
                is_sidechain=1,
                started_at=ts,
                description=description,
                parent_agent_id=caller,
                parent_tool_use_id=call_id[:120],
                resolved_model=model,
                status="running",
                observed_at=ts,
            )
        )
        detail = {"name": name, "type": agent_label(data.get("agentType") or spawn.get("agent_type")),
                  "description": description, "model": model,
                  "mode": agent_label(spawn.get("mode") or data.get("executionMode"))}
        self._event("subagent_start", str(obj.get("id") or call_id or ts), ts, agent_id, trigger="started",
                    tool_call_id=call_id[:120], detail={k: v for k, v in detail.items() if v})

    def _agent_ended(self, obj: dict, data: dict, ts: float) -> None:
        """``subagent.completed`` / ``subagent.failed``: the agent row's end, and a ``subagent_end``
        event with the totals the tool reported (``durationMs`` in duration_ms; ``totalTokens``,
        ``totalToolCalls``, the model and, with text kept, the error message in detail)."""
        agent_id = str(obj.get("agentId") or data.get("agentId") or "")
        if not agent_id:
            return
        failed = obj.get("type") == "subagent.failed"
        call_id = str(data.get("toolCallId") or "")
        model = str(data.get("model") or "")[:120]
        self.buffer.add_agent(
            fact_rows.AgentRow(
                agent_id=agent_id,
                session_id=self.sid,
                tool="copilot-cli",
                task=agent_label(data.get("agentDisplayName") or data.get("agentName")),
                model=model,
                is_sidechain=1,
                ended_at=ts,
                completed=1,
                observed_at=ts,
                parent_tool_use_id=call_id[:120],
                resolved_model=model,
                status="failed" if failed else "completed",
            )
        )
        detail: dict[str, Any] = {"model": model, "total_tokens": to_count(data.get("totalTokens")),
                                  "tool_calls": to_count(data.get("totalToolCalls"))}
        error = data.get("error")
        if failed and isinstance(error, str) and error and self.keep_text:
            detail["error"] = error_excerpt(error, True)
        self._event("subagent_end", str(obj.get("id") or call_id or ts), ts, agent_id,
                    trigger="failed" if failed else "completed", tool_call_id=call_id[:120],
                    duration_ms=to_float(data["durationMs"]) if to_count(data.get("durationMs")) is not None else None,
                    detail={k: v for k, v in detail.items() if v not in (None, "")})

    def _tool_key(self, tool_call_id: str) -> str:
        return fact_rows._dedup_key("copilot-tool", self.sid, tool_call_id)

    def _tool_start(self, data: dict, ts: float, agent_id: str) -> None:
        call_id = str(data.get("toolCallId") or "")
        if not call_id:
            return
        name = str(data.get("toolName") or "")
        server, server_tool = str(data.get("mcpServerName") or ""), str(data.get("mcpToolName") or "")
        # One spelling for a server's tools across all tools, so a reader can tell them apart.
        if server:
            name = f"mcp__{server}__{server_tool or name}"
        args = data.get("arguments") if isinstance(data.get("arguments"), dict) else {}
        # apply_patch passes the patch as the whole argument, a string and not an object.
        raw_args = data.get("arguments")
        if name == "apply_patch" and isinstance(raw_args, str) and raw_args.lstrip().startswith("*** Begin Patch"):
            args = {"input": raw_args}
        if name == "apply_patch":
            self._patches[call_id] = _patch_counts(args, self.cwd)
        found = target_fields(name, args, keep_text=self.keep_text)
        server, server_tool = split_mcp(name, server=server, tool=server_tool)
        if server:
            found["target_id"] = server_tool
        kind, target = found["target_kind"], found["target_id"]
        if kind == AGENT:
            # What the task call names its subagent: read when the subagent starts.
            self._tasks[call_id] = (agent_id, {k: args[k] for k in ("name", "description", "agent_type", "mode", "model")
                                               if isinstance(args.get(k), str)})
        elif kind == FILE and name == "view" and target:
            self._views[call_id] = absolute_path(target, self.cwd)
        if name in _COPILOT_SHELLS and isinstance(args.get("command"), str):
            self._commands[call_id] = args["command"]
        row = fact_rows.ToolInvocationRow(
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
            mcp_server=server,
            mcp_tool=server_tool,
            **found,
            turn_index=self._turn_index(),
            prompt_id=self.interaction,
            request_key=self._request_key_of(call_id),
        )
        self._running[call_id] = row
        self._tool_rows[call_id] = row
        while len(self._tool_rows) > 4096:
            self._tool_rows.pop(next(iter(self._tool_rows)))
        if (turn := self._turn_rows.get(self.interaction)) is not None:
            turn.tool_call_count += 1
            self._touch_turn(turn, ts)
        self.buffer.add_tool(row)
        if name in COPILOT_MEMORY_TOOLS or name in COPILOT_CONTEXT_EVENT_TOOLS:
            self._memory_args[call_id] = args
        if name == "update_todo" and isinstance(args.get("todos"), str):
            # Copilot sends its whole list as Markdown each time: each list is a version.
            seq = self._todo_seq[agent_id] = self._todo_seq.get(agent_id, 0) + 1
            self.buffer.add_digest(fact_rows.SessionDigestRow(
                session_id=self.sid, kind="todo_list", seq=seq, ts=ts, text=digest_text(args["todos"]),
                tool="copilot-cli", project_path=self.cwd, agent_id=agent_id))

    def _tool_complete(self, data: dict, ts: float, agent_id: str) -> None:
        call_id = str(data.get("toolCallId") or "")
        if not call_id:
            return
        row = self._running.pop(call_id, None)
        patch_counts = self._patches.pop(call_id, {})
        if row is None:
            row = fact_rows.ToolInvocationRow(
                dedup_key=self._tool_key(call_id),
                ts=ts,
                session_id=self.sid,
                agent_id=agent_id,
                tool="copilot-cli",
                project_path=self.cwd,
                source_event_id=call_id,
                prompt_id=self.interaction,
                request_key=self._request_key_of(call_id),
            )
            self._tool_rows[call_id] = row
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
            reason = _copilot_failure_text(error, shell, result)
            row.result_summary = _redact(reason[:RESULT_MAX_CHARS])
            row.error_summary = error_excerpt(reason, True)
        if isinstance(shell.get("exitCode"), int):
            row.exit_code = shell["exitCode"]
        # The runtime records a permission event whenever it asks, so no event means nobody was asked.
        row.confirm, row.confirm_wait_ms = self._confirms.pop(call_id, ("auto", 0.0))
        if row.confirm_wait_ms:
            row.duration_ms = max(0.0, row.duration_ms - row.confirm_wait_ms)
        if row.tool_name in _PERSON_TOOLS:
            row.duration_ms = 0.0
        self.buffer.add_tool(row)
        command = self._commands.pop(call_id, None)
        if command is not None and not failed:
            output = result.get("content") if isinstance(result, dict) else result
            for commit in commits_of(command, output, session_id=self.sid, cwd=self.cwd, ts=ts, keep_text=self.keep_text,
                                     call_id=call_id, agent_id=row.agent_id, prompt_id=row.prompt_id):
                self.buffer.add_commit(commit)
        viewed = self._views.pop(call_id, "")
        if viewed and not failed:
            # Writes are summed up by the tool itself in the store's ``session_files``.
            self.buffer.touch_file(self.sid, "", viewed, "read", row.tool_name, row.ts, row.tool, self.cwd)
        self._file_edits(row, data, patch_counts, ts)
        if row.tool_name in COPILOT_MEMORY_TOOLS:
            self._memory_tool(row, data)
        elif row.tool_name in COPILOT_CONTEXT_EVENT_TOOLS:
            self._context_tool(row, data)

    def _file_edits(self, row: fact_rows.ToolInvocationRow, data: dict, patch_counts: dict[str, tuple[int, int]],
                    done: float = 0.0) -> None:
        edits = data.get("fileEdits")
        if row.is_error or not isinstance(edits, list):
            return
        paths = [e for e in edits if isinstance(e, dict) and e.get("path")]
        telemetry = data.get("toolTelemetry") if isinstance(data.get("toolTelemetry"), dict) else {}
        metrics = telemetry.get("metrics") if isinstance(telemetry.get("metrics"), dict) else {}
        path_counts = patch_counts if len(paths) > 1 else {}
        for edit in paths:
            detail: dict[str, Any] = {}
            # The tool reports one total per call, so a patch of many files is counted from its text.
            counted = path_counts.get(absolute_path(str(edit["path"]), self.cwd))
            if counted:
                detail = {"lines_added": counted[0], "lines_removed": counted[1]}
            if len(paths) == 1 and "linesAdded" in metrics:
                detail = {"lines_added": to_int(metrics.get("linesAdded")), "lines_removed": to_int(metrics.get("linesRemoved"))}
            path = str(edit["path"])
            write = fact_rows.FileWriteRow(
                dedup_key=fact_rows._dedup_key("copilot-edit", self.sid, row.source_event_id, path),
                ts=row.ts,
                path=absolute_path(path, self.cwd),
                session_id=self.sid,
                tool=row.tool,
                tool_name=row.tool_name,
                operation=str(edit.get("kind") or "edit"),
                project_path=self.cwd,
                source_event_id=row.source_event_id,
                detail=detail,
                agent_id=row.agent_id,
                prompt_id=str(data.get("interactionId") or ""),
                turn_index=row.turn_index,
            )
            if memory_mechanism(write.path):
                # The event carries no content: the after-image is the file, when it is still that version.
                self.buffer.add_memory_write(write, None, read_if_fresh(write.path, row.ts, done or row.ts))
            else:
                self.buffer.add_file_write(write)

    def _memory_tool(self, row: fact_rows.ToolInvocationRow, data: dict) -> None:
        """A Copilot ``store_memory`` or ``vote_memory`` call that succeeded: a change to the repository's
        memory, which the tool keeps on GitHub and in no local file. Its path names the memory
        (``copilot-memory://<scope>/<repository>[/<subject>]``); a stored fact is its after-image."""
        args = self._memory_args.pop(row.source_event_id, None)
        if args is None or row.is_error:
            return
        scope = str(args.get("scope") or "")
        if row.tool_name == "store_memory":
            path, operation = copilot_memory_path(scope, self.repository, str(args.get("subject") or "")), "store"
        else:
            path, operation = copilot_memory_path(scope, self.repository), str(args.get("direction") or "vote")[:40]
        stored = row.tool_name == "store_memory" and isinstance(args.get("fact"), str)
        self.buffer.add_memory_write(fact_rows.FileWriteRow(
            dedup_key=fact_rows._dedup_key("copilot-memory", self.sid, row.source_event_id),
            ts=row.ts, path=path, session_id=self.sid, tool=row.tool, tool_name=row.tool_name, operation=operation,
            project_path=self.cwd, source_event_id=row.source_event_id, agent_id=row.agent_id,
            prompt_id=str(data.get("interactionId") or ""), turn_index=row.turn_index),
            Image(UNKNOWN_NO_FILE) if stored else None, image_of(args["fact"], TOOL_INPUT) if stored else None)

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
            fact_rows.ToolInvocationRow(
                dedup_key=fact_rows._dedup_key("copilot-permission", self.sid, request_id),
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
# The commands of VS Code's memory tool that change a memory file (seen: create, str_replace, insert, delete).
_VSCODE_MEMORY_WRITES = frozenset({"create", "str_replace", "insert", "delete", "rename"})
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
        self.turn = 0  # prompts in the main log so far

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
            if self.is_main:
                self.turn += 1
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
                fact_rows.AgentRow(
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
                fact_rows.AgentRow(
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
        # Most requests do not report cachedTokens; their cost is not known (CACHE_NOT_REPORTED).
        known = "cachedTokens" in attrs
        self.buffer.add_request(
            fact_rows.RequestRow(
                dedup_key=fact_rows._dedup_key("vscode-call", self.sid, span or str(ts)),
                ts=ts,
                session_id=self.sid,
                agent_id=self.agent_id,
                tool="copilot-vscode",
                project_path=self.project_path,
                model=model,
                input_tokens=billable,
                output_tokens=out,
                cache_read_tokens=cached,
                cost_usd=list_price(model, billable, out, cached, 0, 0, ts) if known else None,
                duration_ms=to_float(obj.get("dur")),
                ttft_ms=to_float(attrs.get("ttft")),
                is_error=1 if failed else 0,
                error_type=(" ".join(str(attrs.get("error") or "error").split())[:80]) if failed else "",
                turn_index=self.turn if self.is_main and self.turn else None,
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
        found = target_fields(name, args, keep_text=self.keep_text)
        kind, target = found["target_kind"], found["target_id"]
        server, server_tool = split_mcp(name)
        row = fact_rows.ToolInvocationRow(
            dedup_key=fact_rows._dedup_key("vscode-tool", self.sid, span or f"{name}{ts}"),
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
            error_summary=error_excerpt(str(attrs.get("error") or ""), self.keep_text) if failed else "",
            source_event_id=span,
            target=target_of(args, self.keep_text),
            exit_code=int(code.group(1)) if code else None,
            input_bytes=byte_size(attrs.get("args")),
            output_bytes=byte_size(attrs.get("result")),
            mcp_server=server,
            mcp_tool=server_tool,
            **found,
            turn_index=self.turn if self.is_main and self.turn else None,
        )
        self.buffer.add_tool(row)
        if failed:
            return
        if name in _VSCODE_READ_TOOLS and kind == FILE and target:
            self.buffer.touch_file(self.sid, self.agent_id, absolute_path(target, self.project_path), "read", name, ts,
                                   "copilot-vscode", self.project_path)
        # VS Code loads a skill by reading its SKILL.md with the file-read tool.
        skill = skill_of_path(args.get("filePath")) if name in _VSCODE_READ_TOOLS else ""
        if skill:
            self.buffer.add_skill(
                fact_rows.SkillUseRow(
                    dedup_key=fact_rows._dedup_key("vscode-skill", self.sid, span or f"{name}{ts}"),
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
            self.buffer.touch_file(self.sid, self.agent_id, absolute_path(decode_file_uri(path), self.project_path),
                                   "created" if name == "create_file" else "edited", name, ts, "copilot-vscode",
                                   self.project_path)
            self.buffer.add_file_write(
                fact_rows.FileWriteRow(
                    dedup_key=fact_rows._dedup_key("vscode-edit", self.sid, span, path),
                    ts=ts,
                    path=absolute_path(decode_file_uri(path), self.project_path),
                    session_id=self.sid,
                    tool="copilot-vscode",
                    tool_name=name,
                    operation="write" if name == "create_file" else "edit",
                    project_path=self.project_path,
                    source_event_id=span,
                    detail={"lines_added": added, "lines_removed": removed},
                    agent_id=self.agent_id,
                    turn_index=row.turn_index,
                )
            )
        if name == "memory" and isinstance(args, dict):
            self._memory_tool(row, args)

    def _memory_tool(self, row: fact_rows.ToolInvocationRow, args: dict) -> None:
        """A change made with VS Code's ``memory`` tool, in its own ``/memories/`` namespace.

        Its path is the tool's path under ``vscode-memory://``: the call does not say whether the
        file is the user's or the workspace's copy on disk. ``view`` reads and changes nothing."""
        command = str(args.get("command") or "")
        path = str(args.get("path") or "")
        if command not in _VSCODE_MEMORY_WRITES or not path:
            return
        added = removed = None
        if command == "create":
            added, removed = len(_lines(str(args.get("file_text") or ""))), None
        elif command == "str_replace":
            added, removed = edit_line_counts(str(args.get("old_str") or ""), str(args.get("new_str") or ""))
        elif command == "insert":
            added, removed = len(_lines(str(args.get("insert_text") or ""))), 0
        if command == "create" and isinstance(args.get("file_text"), str):
            after = image_of(args["file_text"], TOOL_INPUT)
        elif command == "delete":
            after = Image(ABSENT, size=0)
        else:
            after = Image(UNKNOWN_NOT_SENT)  # a replacement or an insertion sends a part only
        self.buffer.add_memory_write(fact_rows.FileWriteRow(
            dedup_key=fact_rows._dedup_key("vscode-memory", self.sid, row.source_event_id or f"{path}{row.ts}"),
            ts=row.ts, path=vscode_memory_path(path), session_id=self.sid, tool="copilot-vscode", tool_name="memory",
            operation=command[:40], project_path=self.project_path, source_event_id=row.source_event_id,
            agent_id=self.agent_id, turn_index=row.turn_index, lines_added=added, lines_removed=removed), None, after)

    def _prompt(self, attrs: dict, ts: float, span: str) -> None:
        # The main log's prompts come from the chat file, which also names prompt files.
        if not self.agent_id and not (self.is_main and self.log_prompts):
            return
        text = str(attrs.get("content") or "")
        self.buffer.add_prompt(
            fact_rows.SessionPromptRow(
                dedup_key=fact_rows._dedup_key("vscode-log-prompt", self.sid, span or str(ts)),
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
        # Each chat request is a person's turn, keyed by its requestId.
        self._turns: dict[str, fact_rows.SessionTurnRow] = {}

    def feed(self, obj: dict) -> None:
        path = obj.get("k")
        value = obj.get("v")
        if obj.get("kind") == 0 and isinstance(value, dict):
            self._requests = []
            # A snapshot states the whole session again: what is summed up from this file starts over.
            self.buffer.forget_files(self.sid, "")
            if self.buffer.book is not None:
                self.buffer.book.reset(self.sid, TRANSCRIPT_PART)
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
            elif path[2] == "editedFileEvents":
                self._edited_files(req, value)

    def _add_request(self, req: Any) -> None:
        if not isinstance(req, dict):
            return
        index = len(self._requests)
        self._requests.append({"id": str(req.get("requestId") or index), "ts": coerce_ts(req.get("timestamp")),
                               "model": req.get("modelId"), "turn": index + 1})
        slot = self._requests[index]
        self._open_turn(slot, req)
        if not req.get("isSystemInitiated"):
            self._prompt(req, slot)
        self._request_outcome(req, slot)
        self._response_parts(slot, req.get("response"))
        if req.get("result") is not None:
            self._elapsed[index] = to_float(req.get("elapsedMs"))
            self._turn_result(slot, req["result"], index)

    def _open_turn(self, slot: dict, req: dict) -> None:
        turn = self._turns.get(slot["id"])
        if turn is None:
            turn = self._turns[slot["id"]] = fact_rows.SessionTurnRow(
                session_id=self.sid, prompt_id=slot["id"], ts=slot["ts"], turn_index=slot["turn"],
                tool="copilot-vscode", project_path=self.project_path,
                origin="system" if req.get("isSystemInitiated") else "human")
        self._touch_turn(turn, slot["ts"])

    def _touch_turn(self, turn: fact_rows.SessionTurnRow, ts: float) -> None:
        if ts:
            turn.ts = min(t for t in (turn.ts, ts) if t)
            turn.ended_at = max(turn.ended_at, ts)
        self.buffer.mark("turns", (turn.session_id, turn.prompt_id), turn)

    def _outcome(self, ts: float) -> dict | None:
        book = self.buffer.book
        return None if book is None else book.part(self.sid, TRANSCRIPT_PART, ts, tool="copilot-vscode",
                                                   project=self.project_path)

    def _request_outcome(self, req: dict, slot: dict) -> None:
        """The mode a request ran in, and the files it edited."""
        mode = req.get("modeInfo") if isinstance(req.get("modeInfo"), dict) else {}
        if mode and (part := self._outcome(slot["ts"])) is not None:
            name = str(mode.get("modeId") or mode.get("kind") or "")[:40]
            if name:
                _add_unique(part.setdefault("modes", []), name)
                part["last_mode"] = name
            if mode.get("permissionLevel"):
                _add_unique(part.setdefault("permission_modes", []), str(mode["permissionLevel"])[:40])
        self._edited_files(slot, req.get("editedFileEvents"))

    def _edited_files(self, slot: dict, events: Any) -> None:
        # A session with a debug log has the edit calls themselves, with their tool.
        if self.has_debug_log or not isinstance(events, list):
            return
        for event in events:
            uri = event.get("uri") if isinstance(event, dict) else None
            path = (uri.get("fsPath") or decode_file_uri(str(uri.get("external") or ""))) if isinstance(uri, dict) else ""
            if path:
                self.buffer.touch_file(self.sid, "", str(path), "edited", "editedFileEvents", slot["ts"],
                                       "copilot-vscode", self.project_path)

    def _prompt(self, req: dict, slot: dict) -> None:
        message = req.get("message")
        text = message.get("text") if isinstance(message, dict) else message
        text = text if isinstance(text, str) else ""
        prompt_file = _vscode_prompt_file(req.get("variableData"))
        if not text and not prompt_file:
            return
        self.buffer.add_prompt(
            fact_rows.SessionPromptRow(
                dedup_key=fact_rows._dedup_key("vscode-prompt", self.sid, slot["id"]),
                ts=slot["ts"],
                session_id=self.sid,
                tool="copilot-vscode",
                project_path=self.project_path,
                text=_redact(text[:PROMPT_MAX_CHARS]) if self.keep_text else "",
                prompt_file=prompt_file,
                prompt_id=slot["id"],
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
            fact_rows.RequestRow(
                dedup_key=fact_rows._dedup_key("vscode-chat-turn", self.sid, slot["id"]),
                ts=slot["ts"],
                session_id=self.sid,
                tool="copilot-vscode",
                project_path=self.project_path,
                model=model or "unknown",
                input_tokens=tokens_in,
                output_tokens=tokens_out,
                # promptTokens has no cached split: the cost is not known (CACHE_NOT_REPORTED).
                cost_usd=None,
                duration_ms=to_float(timings.get("totalElapsed")) or self._elapsed.get(index, 0.0),
                ttft_ms=to_float(timings.get("firstProgress")),
                turn_index=slot.get("turn"),
                prompt_id=slot["id"],
                thinking_chars=sum(slot.get("thinking", {}).values()),
                thinking_blocks=len(slot.get("thinking", {})),
                thinking_redacted=0,
            )
        )
        if (turn := self._turns.get(slot["id"])) is not None and not slot.get("counted"):
            slot["counted"] = True
            turn.request_count += 1
            turn.input_tokens += tokens_in
            turn.output_tokens += tokens_out
            self._touch_turn(turn, slot["ts"])

    def _response_parts(self, slot: dict, parts: Any) -> None:
        if not isinstance(parts, list):
            return
        for part in parts:
            if isinstance(part, dict) and part.get("kind") == "toolInvocationSerialized" and part.get("toolCallId"):
                self._tool_outcome(slot, part)
                if not self.has_debug_log:
                    self._tool_part(slot, part)
            elif isinstance(part, dict) and part.get("kind") == "thinking":
                self._thinking_part(slot, part)

    def _thinking_part(self, slot: dict, part: dict) -> None:
        """A thinking part of a turn's response. Its text can grow in later patches, under the same id."""
        value = part.get("value")
        text = "".join(v for v in value if isinstance(v, str)) if isinstance(value, list) else value
        if not isinstance(text, str) or not text:
            return
        seen = slot.setdefault("thinking", {})
        key = str(part.get("id") or f"text:{hash(text[:64])}")
        if seen.get(key) == len(text):
            return
        index = list(seen).index(key) if key in seen else len(seen)
        seen[key] = len(text)
        request_key = "" if self.has_debug_log else fact_rows._dedup_key("vscode-chat-turn", self.sid, slot["id"])
        self.buffer.add_thinking(fact_rows.SessionThinkingRow(
            session_id=self.sid, thinking_key=fact_rows._dedup_key("vscode-thinking", self.sid, slot["id"], key),
            ts=slot["ts"], request_key=request_key, turn_index=slot.get("turn"), block_index=index,
            model=str(slot.get("model") or "").removeprefix("copilot/"), chars=len(text), text=digest_text(text, THINKING_TEXT_MAX),
            tool="copilot-vscode", project_path=self.project_path))

    def _tool_outcome(self, slot: dict, part: dict) -> None:
        """What a tool call says about the session: its todo list, and whether the task was marked complete."""
        data = part.get("toolSpecificData") if isinstance(part.get("toolSpecificData"), dict) else {}
        todos = data.get("todoList") if part.get("toolId") == "manage_todo_list" else None
        book_part = self._outcome(slot["ts"])
        if isinstance(todos, list) and book_part is not None:
            items = [t for t in todos if isinstance(t, dict)]
            book_part["todos_total"] = len(items)
            book_part["todos_completed"] = sum(1 for t in items if t.get("status") == "completed")
            listing = "\n".join(f"- [{t.get('status') or ''}] {t.get('title') or ''}" for t in items)
            self.buffer.add_digest(fact_rows.SessionDigestRow(
                session_id=self.sid, kind="todo_list", seq=0, ts=slot["ts"], text=digest_text(listing),
                tool="copilot-vscode", project_path=self.project_path))
        elif part.get("toolId") == "task_complete" and book_part is not None:
            book_part["task_complete"] = 1

    def _tool_part(self, slot: dict, part: dict) -> None:
        confirmed = part.get("isConfirmed")
        kind = confirmed.get("type") if isinstance(confirmed, dict) else None
        message = part.get("invocationMessage")
        shown = message.get("value") if isinstance(message, dict) else message
        call_id = str(part["toolCallId"])
        tool_name = str(part.get("toolId") or "")
        found = target_fields(tool_name, _vscode_part_args(part), keep_text=self.keep_text)
        server, server_tool = split_mcp(tool_name)
        self.buffer.add_tool(
            fact_rows.ToolInvocationRow(
                dedup_key=fact_rows._dedup_key("vscode-chat-tool", self.sid, call_id),
                ts=slot["ts"],
                session_id=self.sid,
                tool="copilot-vscode",
                tool_name=tool_name,
                project_path=self.project_path,
                source_event_id=call_id,
                confirm=_VSCODE_CONFIRM.get(kind, "") if isinstance(kind, int) else "",
                is_error=1 if kind == 0 else 0,
                target=_short(shown) if self.keep_text and isinstance(shown, str) else "",
                mcp_server=server,
                mcp_tool=server_tool,
                **found,
                turn_index=slot.get("turn"),
                prompt_id=slot["id"],
                # The chat request's one model-call row (written when its result reports tokens).
                request_key=fact_rows._dedup_key("vscode-chat-turn", self.sid, slot["id"]),
            )
        )
        tools_seen = slot.setdefault("tools", set())
        if call_id not in tools_seen and (turn := self._turns.get(slot["id"])) is not None:
            tools_seen.add(call_id)
            turn.tool_call_count += 1
            self._touch_turn(turn, slot["ts"])
        # "Reading skill [name](file:///.../name/SKILL.md?vscodeLinkType=skill)"
        link = _VSCODE_SKILL_LINK.search(shown) if isinstance(shown, str) and kind != 0 else None
        if link:
            self.buffer.add_skill(
                fact_rows.SkillUseRow(
                    dedup_key=fact_rows._dedup_key("vscode-chat-skill", self.sid, call_id),
                    ts=slot["ts"],
                    session_id=self.sid,
                    tool="copilot-vscode",
                    project_path=self.project_path,
                    name=skill_of_path(link.group(2)) or link.group(1),
                    trigger="agent-invoked",
                    tool_call_id=call_id[:120],
                    prompt_id=slot["id"],
                )
            )


def target_fields(name: str, args: Any, *, keep_text: bool, server_hint: str = "") -> dict[str, Any]:
    """``tool_targets.describe_call`` as ToolInvocationRow fields (its ``target`` is ``target_id`` here)."""
    found = describe_call(name, args, keep_text=keep_text, server_hint=server_hint)
    found["target_id"] = found.pop("target")
    return found


def _copilot_failure_text(error: dict, shell: dict, result: Any) -> str:
    """Why a Copilot CLI tool call failed: its error, else the shell's exit code and last output line.

    A shell command that exits non-zero reports no error object; its reason is in the output.
    """
    reason = str(error.get("message") or error.get("code") or "")
    code = shell.get("exitCode")
    if reason or not isinstance(code, int) or code == 0:
        return reason
    output = result.get("content") if isinstance(result, dict) else result
    lines = [line.strip() for line in output.splitlines() if line.strip()] if isinstance(output, str) else []
    return f"Exit code {code}: {lines[-1]}" if lines else f"Exit code {code}"


def error_excerpt(text: Any, keep_text: bool) -> str:
    """A failed call's error message as kept a year: redacted, one line, at most 300 characters."""
    return redact_secrets(" ".join(text.split()))[:ERROR_SUMMARY_MAX] if keep_text and isinstance(text, str) else ""


def _vscode_part_args(part: dict) -> dict:
    """The arguments a chat file keeps of a tool call: its ``toolSpecificData``, in argument form."""
    data = part.get("toolSpecificData") if isinstance(part.get("toolSpecificData"), dict) else {}
    line = data.get("commandLine")
    if isinstance(line, dict) and isinstance(line.get("original"), str):
        return {"command": line["original"]}
    if isinstance(data.get("agentName"), str):
        return {"agentName": data["agentName"]}
    return {}


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
