# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Exact per-session usage from the transcripts the tools themselves write.

Hooks carry no token counts and OTel is opt-in, so without this module a Claude
Code session has no real numbers at all. Three stores are read, read-only:

``~/.claude/projects/<slug>/<session>.jsonl`` and ``…/<session>/subagents/*.jsonl``
    One line per streamed content block, each repeating its message's usage.
    A request is counted once, by ``message.id`` + ``requestId``, using the
    last line seen (streaming grows ``output_tokens``). The key is global, not
    per file, because a resumed or forked session replays earlier messages.

``~/.codex/sessions/**/rollout-*.jsonl`` (finished sessions: ``rollout-*.jsonl.zst``)
    ``token_count`` events carry a cumulative ``info.total_token_usage``. Deltas
    go to the model of the latest ``turn_context``. OpenAI's ``input_tokens``
    INCLUDES cached tokens, so it is split here. A sub-agent thread has its own
    rollout whose ``session_id`` names the root thread and is counted there.

``~/.copilot/session-state/<id>/events.jsonl``
    ``session.usage_record`` is per request and is also present in sessions that
    never shut down. ``inputTokens`` INCLUDES cache reads and writes. Files with
    no records fall back to ``session.shutdown`` metrics, and are marked
    ``partial`` if they have neither (only assistant messages).

The same pass also fills the per-call fact tables through :mod:`.call_facts`.

Every token class on a :class:`SessionUsage` is disjoint: total = input + output
+ cache_read + cache_write. Cost is priced per request, because prompt-length
tiers and dated rates apply per request. A model with no known rate makes the
session cost ``partial`` or ``unknown`` and is named in ``unpriced_models``.
"""

from __future__ import annotations

import functools
import hashlib
import json
import logging
import os
import re
import socket
import threading
import time
import uuid
from collections.abc import Callable, Iterable, Iterator
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import IO, TYPE_CHECKING, Any

from .. import platforms
from ..data.model_pricing import is_billable_model, request_cost_usd
from ..data.provenance import COPILOT_COST_REASON
from ..records import COPILOT_STORE_SOURCE
from ..state_file import StateFile
from . import session_files, zstd_stream
from ._common import SQLITE_UNAVAILABLE, coerce_ts, decode_file_uri, open_readonly, project_root, record_quality
from .call_facts import (
    CLAUDE_CHECKPOINT_LINES,
    CLAUDE_SESSION_LINES,
    ClaudeFacts,
    CopilotFacts,
    FactBuffer,
    VSCodeChatFacts,
    VSCodeDebugFacts,
    copilot_call_key,
    copilot_model,
    list_price,
    read_claude_agent_meta,
)
from .copilot_store_content import CopilotStoreContent, StoreSession
from .session_outcomes import MetadataReaders, OutcomeBook
from .session_titles import (
    CLAUDE_TITLE_TYPES,
    USER,
    CodexTitles,
    CopilotTitles,
    Title,
    chat_title,
    claude_title,
    outranks,
)
from .transcript_tail import records
from .vscode_chat_logs import default_log_dir as vscode_chat_default_log_dir
from .vscode_chat_logs import snapshot_events

if TYPE_CHECKING:
    import sqlite3

log = logging.getLogger(__name__)

POLL_INTERVAL_S = 60.0
# Re-read recently active files on restart to rebuild their in-memory session state.
RESTART_GRACE_S = 3600.0
# A first run on a machine reads the files written in the last RECENT_FIRST_S at once;
# the older ones, up to DEFERRED_BYTES_PER_POLL of them a poll, follow in the background.
# Here 30 days of transcripts are 3.2 GB and cost 40 CPU-seconds read in one burst.
RECENT_FIRST_S = 2 * 86400.0
DEFERRED_BYTES_PER_POLL = 128 * 1024 * 1024
# A poll whose rows the store refused reads half as much at the next poll, down to this part of
# DEFERRED_BYTES_PER_POLL; each poll whose rows were all handed over doubles it again.
MIN_BUDGET_SCALE = 1 / 128
# Windows can report the size a file had when another process opened it, and a
# Copilot CLI session keeps its events file open while it lives. A file this recent
# that looks unchanged is measured through its own handle.
HELD_FILE_RECHECK_S = 2 * 86400
# A poll that reads a backlog can take minutes. What it has finished is saved this often,
# so a restart reads only the rest and does not store the same rows again.
PROGRESS_SAVE_S = 15.0
BACKFILL_DAYS = 30
# The age limit that means none: every session file still on disk is read.
ALL_DAYS = 36500
# A session idle this long gets ended_at = its last activity; a transcript has
# no explicit end event, and an open row would show as live forever.
IDLE_END_S = 900.0
# A permission prompt older than this is shown as abandoned, not as waiting.
PENDING_CONFIRM_MAX_AGE_S = 6 * 3600.0


# The version of each reader of session files, per kind of file. The saved read position of a file
# records the version that last read it to its end. A file last read by a lower version is read
# again from its start, all its rows stored again under the same keys, after the new and changed
# files of its tool (see TranscriptUsageIngester._plan). Raise a kind's version when its reader, or
# the store's handling of its rows, writes a row or a value it did not write before:
# test/fixtures/reader_versions.json records a hash of each reader's record lists and handlers, and
# test/test_reader_version_guard.py fails until the version changes with them.
# Version 1: the first recorded version. A position saved before versions existed counts as 0,
# so every file is read again once: an older aictl stored no prompt and no digest text older than
# 14 days, and no session file was read again after its reader learnt more.
_CODEX_FILE_ID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

READER_VERSIONS: dict[str, int] = {
    "claude-transcript": 2,  # projects/**/<session>.jsonl and subagents: ClaudeAccumulator, ClaudeFacts
    "codex-rollout": 1,  # sessions/**/rollout-*.jsonl[.zst]: CodexAccumulator
    "copilot-events": 3,  # session-state/<id>/events.jsonl: CopilotAccumulator, CopilotFacts
    "copilot-store": 1,  # session-store.db assistant_usage_events: CopilotStoreReader
    # session-store.db sessions, turns, forge_trajectory_events of sessions with no events.jsonl: CopilotStoreContent
    "copilot-store-content": 1,
    # Version 2 of both VS Code kinds: a request whose source does not report the cached part of the
    # prompt is stored with no cost (cost_usd null), not priced as all uncached input.
    "vscode-debug-log": 2,  # GitHub.copilot-chat/debug-logs/<id>/*.jsonl: VSCodeDebugLogAccumulator, VSCodeDebugFacts
    "vscode-chat-session": 3,  # chatSessions/<id>.jsonl: VSCodeChatSessionAccumulator, VSCodeChatFacts
    # Claude workflows/wf_*.json, Copilot session.db todos and session-store.db checkpoints:
    # session_outcomes.MetadataReaders. Small files, read again at once, not paced.
    "session-metadata": 1,
    # Version 2 of claude-transcript and copilot-events: a model call keeps its provider ids (request_id,
    # response_id, Copilot api_call_id), and calls, tool calls, steps, links and prompts name their turn
    # (prompt_id); Copilot turns are session_turns rows keyed by interactionId. Version 3 of
    # vscode-chat-session: each chat request is a session_turns row keyed by its requestId (prompt_id).
    # Version 3 of copilot-events: the skills a system prompt lists inside its <tools> section are stored
    # as skills (one item each), not as part of the other system prompt.
}
# The order in which the tools' backlogs share the bytes of a poll: Copilot CLI and the Copilot app
# (one session folder), VS Code, Claude Code, then Codex.
BACKLOG_PRIORITY = ("copilot-cli", "copilot-vscode", "claude-code", "codex-cli")


def reader_kind(tool: str, path: Path) -> str:
    """The kind of session file *path* of *tool* is, as READER_VERSIONS names it."""
    if tool == "copilot-vscode":
        return "vscode-debug-log" if "debug-logs" in path.parts else "vscode-chat-session"
    return {"claude-code": "claude-transcript", "codex-cli": "codex-rollout", "copilot-cli": "copilot-events"}[tool]


# Record types consumed by ClaudeAccumulator + ClaudeFacts; all other Claude JSONL lines are skipped before json.loads.
_CLAUDE_RECORD_TYPES = frozenset({b"assistant", b"user", b"api-request", b"system", b"attachment"}) | CLAUDE_TITLE_TYPES | {
    kind.encode() for kind in CLAUDE_SESSION_LINES | CLAUDE_CHECKPOINT_LINES}


@functools.lru_cache(maxsize=4096)
def _local_day_minute(minute_bucket: int) -> str:
    return datetime.fromtimestamp(minute_bucket * 60).strftime("%Y-%m-%d")


def local_day(ts: float) -> str:
    """The machine's local calendar day for *ts*, which is what "today" means on a dashboard."""
    return _local_day_minute(int(ts // 60))


@dataclass(slots=True)
class ModelUsage:
    requests: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0
    cost_usd: float = 0.0
    priced: bool = True
    nano_aiu: int = 0

    def to_dict(self) -> dict:
        return {
            "billing_amount": self.nano_aiu / 1e9 if self.nano_aiu else None,
            "requests": self.requests,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_read_tokens": self.cache_read_tokens,
            "cache_creation_tokens": self.cache_creation_tokens,
            "cost_usd": round(self.cost_usd, 6) if self.priced else None,
        }


@dataclass(slots=True)
class SessionUsage:
    """Usage of one logical session, across all of its files."""

    session_id: str
    tool: str
    source: str = "transcript"
    quality: str = "exact"
    quality_reason: str = ""
    models: dict[str, ModelUsage] = field(default_factory=dict)
    daily: dict[str, dict] = field(default_factory=dict)
    tool_calls: int = 0
    turns: int = 0
    started_at: float = 0.0
    last_activity_at: float = 0.0
    # When the transcript itself records the session's end (Copilot session.shutdown); 0 = it does not.
    recorded_end_at: float = 0.0
    project_path: str = ""
    git_branch: str = ""
    # The session whose lines this session's file copies at its start: a resumed or forked
    # Claude Code session replays the earlier session's lines, each still carrying that id.
    resumed_from: str = ""
    premium_requests: float = 0.0
    title: str = ""
    title_source: str = ""
    _nano_aiu: int = 0
    _cost: float = 0.0
    _priced_tokens: int = 0
    _unpriced_tokens: int = 0

    @property
    def bills_in_credits(self) -> bool:
        """GitHub Copilot bills AI credits, so a vendor list price is not its cost."""
        return self.tool.startswith("copilot")

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens + self.cache_read_tokens + self.cache_creation_tokens

    def set_title(self, text: str, source: str) -> None:
        """Take a name by the rule: a higher source wins, the same source's latest text wins."""
        if outranks(self.title, self.title_source, text, source):
            self.title, self.title_source = text, source

    def touch(self, ts: float) -> None:
        if ts <= 0:
            return
        if not self.started_at or ts < self.started_at:
            self.started_at = ts
        if ts > self.last_activity_at:
            self.last_activity_at = ts

    def add(
        self,
        model: str,
        ts: float,
        input_tokens: int = 0,
        output_tokens: int = 0,
        cache_read: int = 0,
        cache_write: int = 0,
        cache_write_1h: int = 0,
        *,
        requests: int = 1,
        speed: str = "",
        inference_geo: str = "",
        cost_delta: float | None = None,
        nano_aiu: int = 0,
        premium_requests: float = 0.0,
        priceable: bool = True,
    ) -> None:
        """Add one request's disjoint classes; negative values correct a prior add.

        *cache_write* includes *cache_write_1h*, which only selects the rate.
        *cost_delta* replaces pricing these tokens, for a correction whose
        tokens alone do not show the request's prompt-length tier.
        *priceable* False: the source does not report what a list price needs
        (the cached part of the prompt), so the request has tokens and no cost.
        """
        m = self.models.setdefault(model or "unknown", ModelUsage())
        m.requests += requests
        m.input_tokens += input_tokens
        m.output_tokens += output_tokens
        m.cache_read_tokens += cache_read
        m.cache_creation_tokens += cache_write
        tokens = input_tokens + output_tokens + cache_read + cache_write
        cost = cost_delta
        if cost is None and priceable:
            cost = _signed_cost(
                model, input_tokens, output_tokens, cache_read, cache_write - cache_write_1h, cache_write_1h, ts, speed, inference_geo
            )
        day = self.daily.setdefault(
            local_day(ts) if ts > 0 else "unknown",
            {"input_tokens": 0, "output_tokens": 0, "cache_read_tokens": 0, "cache_creation_tokens": 0, "cost_usd": 0.0},
        )
        day["input_tokens"] += input_tokens
        day["output_tokens"] += output_tokens
        day["cache_read_tokens"] += cache_read
        day["cache_creation_tokens"] += cache_write
        dm = day.setdefault("models", {}).setdefault(
            model or "unknown",
            {"requests": 0, "input_tokens": 0, "output_tokens": 0, "cache_read_tokens": 0, "cache_creation_tokens": 0, "cost_usd": 0.0},
        )
        dm["requests"] += requests
        dm["input_tokens"] += input_tokens
        dm["output_tokens"] += output_tokens
        dm["cache_read_tokens"] += cache_read
        dm["cache_creation_tokens"] += cache_write
        m.nano_aiu += nano_aiu
        self._nano_aiu += nano_aiu
        self.premium_requests += premium_requests
        if nano_aiu:
            day["billing_amount"] = day.get("billing_amount", 0.0) + nano_aiu / 1e9
            dm["billing_amount"] = dm.get("billing_amount", 0.0) + nano_aiu / 1e9
        if cost is None:
            m.priced = False
            self._unpriced_tokens += tokens
        else:
            m.cost_usd += cost
            self._cost += cost
            self._priced_tokens += tokens
            key = "estimated_list_usd" if self.bills_in_credits else "cost_usd"
            day[key] = day.get(key, 0.0) + cost
            dm[key] = dm.get(key, 0.0) + cost

    def _sum(self, attr: str) -> int:
        return sum(getattr(m, attr) for m in self.models.values())

    @property
    def input_tokens(self) -> int:
        return self._sum("input_tokens")

    @property
    def output_tokens(self) -> int:
        return self._sum("output_tokens")

    @property
    def cache_read_tokens(self) -> int:
        return self._sum("cache_read_tokens")

    @property
    def cache_creation_tokens(self) -> int:
        return self._sum("cache_creation_tokens")

    @property
    def request_count(self) -> int:
        return self._sum("requests")

    @property
    def model(self) -> str:
        """The model that served the most requests (placeholders never win)."""
        real = {k: v for k, v in self.models.items() if is_billable_model(k)}
        return max(real, key=lambda k: real[k].requests) if real else ""

    @property
    def unpriced_models(self) -> list[str]:
        if self.bills_in_credits:
            return []  # list prices do not apply, so none are missing
        return sorted(
            k
            for k, m in self.models.items()
            if not m.priced and (m.input_tokens or m.output_tokens or m.cache_read_tokens or m.cache_creation_tokens)
        )

    @property
    def cost_usd(self) -> float | None:
        """List-price cost, or ``None`` when no tokens could be priced."""
        if self.bills_in_credits or (self._unpriced_tokens and not self._priced_tokens):
            return None
        return round(self._cost, 6)

    @property
    def cost_quality(self) -> str:
        if self.bills_in_credits:
            return "unknown"
        if self._unpriced_tokens:
            return "partial" if self._priced_tokens else "unknown"
        return "estimated"  # list price x exact tokens, never an invoice

    @property
    def cost_reason(self) -> str:
        if self.bills_in_credits:
            return COPILOT_COST_REASON
        if self.unpriced_models:
            return "no list price for: " + ", ".join(self.unpriced_models)
        return "list price x transcript tokens; plan or partner billing may differ"

    def to_row(self) -> dict:
        return {
            "session_id": self.session_id,
            "tool": self.tool,
            "source": self.source,
            "quality": self.quality,
            "quality_reason": self.quality_reason,
            "model": self.model,
            "models": {k: v.to_dict() for k, v in self.models.items() if is_billable_model(k) or v.requests},
            "daily": {k: _rounded_day(v) for k, v in self.daily.items()},
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_read_tokens": self.cache_read_tokens,
            "cache_creation_tokens": self.cache_creation_tokens,
            "request_count": self.request_count,
            "tool_call_count": self.tool_calls,
            "turn_count": self.turns,
            "cost_usd": self.cost_usd,
            "cost_quality": self.cost_quality,
            "cost_reason": self.cost_reason,
            "unpriced_models": self.unpriced_models,
            "billing_unit": "ai_credits" if self.bills_in_credits else "",
            "billing_amount": (self._nano_aiu / 1e9 if self._nano_aiu else None),
            "premium_requests": self.premium_requests if self.bills_in_credits else None,
            "estimated_list_usd": round(self._cost, 6) if self.bills_in_credits else None,
            "started_at": self.started_at,
            "last_activity_at": self.last_activity_at,
            "project_path": self.project_path,
        }


def _rounded_day(day: dict) -> dict:
    models = {m: {**v, "cost_usd": round(v["cost_usd"], 6)} for m, v in day.get("models", {}).items()}
    return {**day, "cost_usd": round(day["cost_usd"], 6), "models": models}


def _signed_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read: int,
    cache_5m: int,
    cache_1h: int,
    ts: float,
    speed: str,
    geo: str,
) -> float | None:
    if not is_billable_model(model):
        # <synthetic> messages are local placeholders: nothing was billed.
        return 0.0
    return request_cost_usd(
        model, input_tokens, output_tokens, cache_read, cache_5m, cache_1h, ts=ts or None, speed=speed, inference_geo=geo
    )


def _i(v: Any) -> int:
    try:
        return int(v or 0)
    except (TypeError, ValueError):
        return 0


# ── Claude Code ────────────────────────────────────────────────────────


class ClaudeAccumulator:
    """Folds Claude Code JSONL lines into :class:`SessionUsage` objects.

    Each line is counted under the session that wrote it (see :func:`claude_line_session`);
    the reader drops the copied lines of a resumed or forked session before they come here.
    The request keys still span files: a streaming reply is written as several lines.
    """

    def __init__(self, tool: str = "claude-code") -> None:
        self.tool = tool
        self.sessions: dict[str, SessionUsage] = {}
        # Keyed by the hash of the ids, not the ids: a month of transcripts has a
        # million of them, and the strings were most of the daemon's resident memory.
        self._requests: dict[int, tuple[str, tuple]] = {}
        self._tool_ids: set[int] = set()

    def session(self, sid: str) -> SessionUsage:
        return self.sessions.setdefault(sid, SessionUsage(session_id=sid, tool=self.tool))

    def feed(self, sid: str, obj: dict, *, main: bool = True) -> None:
        """Add one line of *sid*. *main* is False for a subagent's file: a subagent may run in
        another folder or worktree, on another branch, and that is the agent's, not the session's."""
        kind = obj.get("type")
        if kind not in ("assistant", "user"):
            named = claude_title(obj) if main else None
            if named:
                self.session(sid).set_title(*named)
            return
        s = self.session(sid)
        ts = coerce_ts(obj.get("timestamp"))
        s.touch(ts)
        if main and not s.project_path and obj.get("cwd"):
            s.project_path = project_root(str(obj["cwd"]))
        if main and obj.get("gitBranch"):
            s.git_branch = str(obj["gitBranch"])
        msg = obj.get("message") if isinstance(obj.get("message"), dict) else {}
        if kind == "user":
            if self._is_human_turn(obj, msg):
                s.turns += 1
            return
        content = msg.get("content")
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "tool_use":
                    tool_id = hash(str(block.get("id") or ""))
                    if block.get("id") and tool_id not in self._tool_ids:
                        self._tool_ids.add(tool_id)
                        s.tool_calls += 1
        usage = msg.get("usage")
        if isinstance(usage, dict):
            self._add_usage(sid, s, msg, obj, usage, ts)

    @staticmethod
    def _is_human_turn(obj: dict, msg: dict) -> bool:
        if obj.get("isSidechain") or obj.get("isMeta") or "toolUseResult" in obj:
            return False
        # A background task reporting back arrives as a user line, but no person sent it.
        origin = obj.get("origin")
        if isinstance(origin, dict) and origin.get("kind") not in (None, "", "human"):
            return False
        content = msg.get("content")
        if isinstance(content, str):
            return True
        return isinstance(content, list) and any(isinstance(b, dict) and b.get("type") == "text" for b in content)

    def _add_usage(self, sid: str, s: SessionUsage, msg: dict, obj: dict, usage: dict, ts: float) -> None:
        cc = usage.get("cache_creation") if isinstance(usage.get("cache_creation"), dict) else {}
        vals = (
            _i(usage.get("input_tokens")),
            _i(usage.get("output_tokens")),
            _i(usage.get("cache_read_input_tokens")),
            _i(usage.get("cache_creation_input_tokens")),
            _i(cc.get("ephemeral_1h_input_tokens")),
        )
        model = str(msg.get("model") or "")
        speed = str(usage.get("speed") or "")
        geo = str(usage.get("inference_geo") or "")
        msg_id = str(msg.get("id") or "")
        req_id = str(obj.get("requestId") or "")
        # A line with no ids cannot repeat a known request: count it as new.
        key = hash((msg_id, req_id) if (msg_id or req_id) else ("uuid", str(obj.get("uuid") or id(obj))))
        prev = self._requests.get(key)
        if prev is None:
            self._requests[key] = (sid, vals)
            s.add(model, ts, *vals, speed=speed, inference_geo=geo)
            return
        first_sid, old = prev
        if old == vals:
            return
        # Streaming grew the counters: move the request to its final values,
        # keeping it on the session that first reported it.
        self._requests[key] = (first_sid, vals)
        delta = tuple(v - o for v, o in zip(vals, old, strict=True))

        def full_cost(v: tuple) -> float | None:
            return _signed_cost(model, v[0], v[1], v[2], v[3] - v[4], v[4], ts, speed, geo)

        new_cost, old_cost = full_cost(vals), full_cost(old)
        self.session(first_sid).add(
            model,
            ts,
            *delta,
            requests=0,
            speed=speed,
            inference_geo=geo,
            cost_delta=None if new_cost is None or old_cost is None else new_cost - old_cost,
        )


def _claude_session_id(path: Path) -> str:
    """The session whose file this is: ``…/<session>/subagents/agent-x.jsonl`` belongs to ``<session>``."""
    parts = path.parts
    if "subagents" in parts:
        return parts[parts.index("subagents") - 1]
    return path.stem


def claude_line_session(obj: dict, file_sid: str) -> str:
    """The session a Claude Code line belongs to: the ``sessionId`` the line carries, else its file's.

    A resumed or forked session starts a new file (and copies the ``subagents/`` folder) that
    replays the earlier session's lines with the earlier session's id. Such a line is a copy:
    the earlier session's own file holds the original.
    """
    sid = obj.get("sessionId")
    return sid if isinstance(sid, str) and sid else file_sid


def _meta_signature(transcript: Path) -> tuple[int, int] | None:
    """(mtime, size) of the ``meta.json`` beside a subagent's transcript, or None when there is none."""
    try:
        st = transcript.with_name(transcript.stem + ".meta.json").stat()
    except OSError:
        return None
    return st.st_mtime_ns, st.st_size


def iter_claude_files(projects_dir: Path) -> Iterable[Path]:
    """The transcripts under a Claude Code ``projects`` folder, by the rules of :mod:`.session_files`."""
    return session_files.scan("claude-code", projects_dir)[0]


def claude_resume_origin(path: Path, scan_lines: int = 5000) -> str:
    """The session a Claude Code main file replays at its start (resume or fork), or ''.

    The copied lines keep the earlier session's ``sessionId``; the file is named for the new one.
    """
    try:
        with open(path, "rb") as fh:
            for _, line in zip(range(scan_lines), fh):
                if b'"sessionId"' not in line:
                    continue
                try:
                    sid = json.loads(line).get("sessionId")
                except (ValueError, AttributeError):
                    continue
                if isinstance(sid, str) and sid and sid != path.stem:
                    return sid
                if sid == path.stem:
                    return ""
    except OSError:
        return ""
    return ""


def claude_call_mark(obj: dict) -> str:
    """The model call a Claude Code line reports, as its message and request id; '' for a line without one."""
    msg = obj.get("message")
    msg_id = str(msg.get("id") or "") if isinstance(msg, dict) else ""
    req_id = str(obj.get("requestId") or "")
    return f"{msg_id}:{req_id}" if msg_id or req_id else ""


def _born(path: Path) -> tuple[float, str]:
    """The order in which Claude Code files were created: birth time, then name (a system without birth times uses the name)."""
    try:
        return (float(getattr(path.stat(), "st_birthtime", 0.0)), path.stem)
    except OSError:
        return (0.0, path.stem)


class ClaudeCopies:
    """Which session made each model call that Claude Code main files hold, by folder.

    A fork (and some resumes) writes the earlier session's lines into the new file with the new
    session's id: the copy differs from the original only in ``sessionId``, and need not be at the start
    of the file. A call held under their own id by several main files of one folder is the session's
    whose file was created first, whichever file is read first: the call's row is keyed by message and
    request id, without the session, so it never moves to another session after it is stored. Each file
    is read once and then from where the last read stopped (the files only grow); only call ids are kept.
    """

    def __init__(self) -> None:
        self._read: dict[Path, int] = {}  # path -> bytes read
        self._first: dict[Path, dict[str, tuple[tuple[float, str], str]]] = {}  # folder -> {call: (born, session)}

    def refresh(self, folder: Path) -> None:
        """Read what the main files of *folder* added since the last look."""
        first = self._first.setdefault(folder, {})
        for path in folder.glob("*.jsonl"):
            try:
                size = path.stat().st_size
            except OSError:
                continue
            done = self._read.get(path, 0)
            if size < done:
                done = 0
            if size == done:
                continue
            born = _born(path)
            try:
                with open(path, "rb") as fh:
                    fh.seek(done)
                    for line in fh:
                        if not line.endswith(b"\n"):
                            break  # a line still being written: read it next time
                        done += len(line)
                        if b'"requestId"' not in line:
                            continue
                        try:
                            obj = json.loads(line)
                        except ValueError:
                            continue
                        if isinstance(obj, dict) and obj.get("sessionId") == path.stem and (call := claude_call_mark(obj)):
                            held = first.get(call)
                            if held is None or born < held[0]:
                                first[call] = (born, path.stem)
            except OSError:
                continue
            self._read[path] = done

    def owner(self, path: Path, call: str) -> str:
        """The session that made *call*, which the main file *path* holds under its own id."""
        held = self._first.get(path.parent, {}).get(call) if call else None
        return held[1] if held else path.stem


def resumed_claude_sessions(projects_dirs: Iterable[Path]) -> dict[str, str]:
    """{session: the session it replays} for every resumed or forked Claude Code session found."""
    found = {}
    for root in projects_dirs:
        for path in root.glob("*/*.jsonl"):
            if origin := claude_resume_origin(path):
                found[path.stem] = origin
    return found


# Requests of ``aictl db reread``, beside the reader's saved positions (transcript_usage.json).
REREAD_REQUEST_GLOB = "transcript_usage.reread-*.json"


def request_reread(directory: Path, paths: Iterable[Path], *, copilot_store: bool = False) -> Path:
    """Ask the transcript reader whose saved positions are in *directory* to read *paths* again.

    The reader owns its positions file, so this writes a request file of its own beside it, whole
    or not at all; the reader applies it at its next poll, or at its next start when no daemon
    runs (``TranscriptUsageIngester._take_reread_requests``). *copilot_store* asks for the rows
    of the Copilot store too. Returns the request file.
    """
    request = directory / REREAD_REQUEST_GLOB.replace("*", uuid.uuid4().hex)
    StateFile(request).replace({"paths": sorted(str(p) for p in paths), "copilot_store": copilot_store,
                                "requested_at": time.time()})
    return request


def _parents_first(paths: list[Path]) -> list[Path]:
    """The files in their order, but a subagent's file after its session's main file when both are read.

    A subagent's lines carry its caller's prompt id; the main file says which turn that is.
    """
    mains = {_claude_session_id(p): i for i, p in enumerate(paths) if "subagents" not in p.parts}
    order = {p: (max(i, mains.get(_claude_session_id(p), -1)), "subagents" in p.parts, i) for i, p in enumerate(paths)}
    return sorted(paths, key=order.__getitem__)


# ── Codex ──────────────────────────────────────────────────────────────


class CodexAccumulator:
    """Folds one rollout file. Totals are cumulative, so state is per file."""

    def __init__(self, sessions: dict[str, SessionUsage], fallback_id: str, tool: str = "codex-cli") -> None:
        self.sessions = sessions
        self.fallback_id = fallback_id
        self.tool = tool
        self.sid = ""
        self.model = ""
        self.prev: dict[str, int] = {}
        self.subagent = False
        self.tasks = 0
        self.user_messages = 0

    def _session(self) -> SessionUsage:
        sid = self.sid or self.fallback_id
        return self.sessions.setdefault(sid, SessionUsage(session_id=sid, tool=self.tool))

    def feed(self, obj: dict) -> None:
        kind = obj.get("type")
        payload = obj.get("payload") if isinstance(obj.get("payload"), dict) else {}
        ts = coerce_ts(obj.get("timestamp"))
        if kind == "session_meta":
            # session_id names the root thread; a sub-agent's id is its own.
            self.sid = str(payload.get("session_id") or payload.get("id") or "")
            self.subagent = _is_subagent_source(payload.get("source"))
            s = self._session()
            s.touch(coerce_ts(payload.get("timestamp")) or ts)
            if not s.project_path and payload.get("cwd") and not self.subagent:
                s.project_path = str(payload["cwd"])
            if payload.get("model"):
                self.model = str(payload["model"])
            return
        s = self._session()
        s.touch(ts)
        if kind == "turn_context":
            if payload.get("model"):
                self.model = str(payload["model"])
            return
        if kind == "response_item":
            if payload.get("type") in ("function_call", "custom_tool_call"):
                s.tool_calls += 1
            return
        if kind != "event_msg":
            return
        if payload.get("type") in ("task_started", "user_message"):
            self._count_turn(s, payload["type"])
        elif payload.get("type") == "token_count":
            info = payload.get("info") if isinstance(payload.get("info"), dict) else {}
            total = info.get("total_token_usage") or payload.get("total_token_usage")
            if isinstance(total, dict):
                self._add_total(s, total, ts)

    def _count_turn(self, s: SessionUsage, kind: str) -> None:
        """A root thread's task is a user turn. Rollouts that record both events
        count tasks; older ones with only ``user_message`` count those. A
        sub-agent's work belongs to the turn that spawned it."""
        if self.subagent:
            return
        before = self.tasks or self.user_messages
        if kind == "task_started":
            self.tasks += 1
        else:
            self.user_messages += 1
        s.turns += (self.tasks or self.user_messages) - before

    def _add_total(self, s: SessionUsage, total: dict, ts: float) -> None:
        cur = {
            "input": _i(total.get("input_tokens")),
            "cached": _i(total.get("cached_input_tokens")),
            "write": _i(total.get("cache_write_input_tokens")),
            "output": _i(total.get("output_tokens")),
        }
        if cur == self.prev:
            return  # token_count repeats on rate-limit updates
        delta = {k: cur[k] - self.prev.get(k, 0) for k in cur}
        if any(v < 0 for v in delta.values()):
            # A counter went backwards: a new baseline, not negative usage.
            delta = cur
        self.prev = cur
        s.add(
            self.model,
            ts,
            max(0, delta["input"] - delta["cached"] - delta["write"]),
            delta["output"],
            delta["cached"],
            delta["write"],
        )


def _is_subagent_source(source: Any) -> bool:
    return isinstance(source, dict) and "subagent" in source


# ── Copilot CLI ────────────────────────────────────────────────────────


class CopilotAccumulator:
    """Folds one ``events.jsonl``; a session is exactly one file."""

    def __init__(self, session_id: str, tool: str = "copilot-cli", facts: CopilotFacts | None = None) -> None:
        self.s = SessionUsage(session_id=session_id, tool=tool)
        self.facts = facts
        self.has_records = False
        self.shutdowns: list[dict] = []
        self.assistant_messages = 0
        self.model = ""
        self._record_ids: set[str] = set()
        self._compactions: list[tuple[dict, float]] = []

    def feed(self, obj: dict) -> None:
        if self.facts is not None:
            self.facts.feed(obj)
        kind = obj.get("type")
        data = obj.get("data") if isinstance(obj.get("data"), dict) else {}
        ts = coerce_ts(obj.get("timestamp"))
        s = self.s
        s.touch(ts)
        if kind == "session.start":
            ctx = data.get("context") if isinstance(data.get("context"), dict) else {}
            if ctx.get("cwd"):
                s.project_path = str(ctx["cwd"])
        elif kind == "session.usage_record":
            usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
            self.has_records = True
            for key in ("requestId", "apiCallId"):
                if usage.get(key):
                    self._record_ids.add(str(usage[key]))
            self._add(usage.get("model") or self.model, usage, ts, requests=1)
        elif kind == "session.compaction_complete":
            # A compaction is a real model call that usage_record does not
            # report: 16 of 16 in real sessions had no matching record.
            used = data.get("compactionTokensUsed")
            if isinstance(used, dict) and str(data.get("requestId") or "") not in self._record_ids:
                self._compactions.append((used, ts))
        elif kind == "session.shutdown":
            self.shutdowns.append({"ts": ts, "metrics": data.get("modelMetrics") or {}})
            # The session's own count. Summing per-call multipliers overstates it,
            # because a call the agent starts within a turn is not a new request.
            # Each shutdown restates the running total, so a resumed session repeats it.
            s.premium_requests = max(s.premium_requests, float(data.get("totalPremiumRequests") or 0))
        elif kind == "user.message":
            s.turns += 1
        elif kind == "assistant.message":
            self.assistant_messages += 1
            if data.get("model"):
                self.model = str(data["model"])
        elif kind == "session.model_change" and data.get("newModel"):
            self.model = str(data["newModel"])
        elif kind == "tool.execution_complete":
            s.tool_calls += 1

    def _add(self, model: Any, usage: dict, ts: float, requests: int) -> None:
        raw_input = _i(usage.get("inputTokens"))
        read = _i(usage.get("cacheReadTokens"))
        write = _i(usage.get("cacheWriteTokens"))
        self.s.add(
            str(model or ""),
            ts,
            max(0, raw_input - read - write),
            _i(usage.get("outputTokens")),
            read,
            write,
            requests=requests,
            nano_aiu=_i((usage.get("copilotUsage") or {}).get("totalNanoAiu")) if isinstance(usage.get("copilotUsage"), dict) else 0,
        )

    def finish(self) -> SessionUsage:
        s = self.s
        s.recorded_end_at = max((sd["ts"] for sd in self.shutdowns), default=0.0)
        if self.has_records:
            for used, ts in self._compactions:
                self._add(used.get("model") or self.model, used, ts, requests=1)
            self._compactions.clear()
            if not self.shutdowns:
                s.quality_reason = "session has no shutdown event yet; counted per request"
            return s
        for sd in self.shutdowns:
            for model, md in sd["metrics"].items():
                if isinstance(md, dict):
                    reqs = md.get("requests") if isinstance(md.get("requests"), dict) else {}
                    self._add(model, md.get("usage") or {}, sd["ts"], requests=_i(reqs.get("count")))
        if s.request_count:
            s.quality_reason = "session totals from shutdown metrics; cost priced at session level"
        elif self.assistant_messages:
            s.quality = "partial"
            s.quality_reason = "no usage records or shutdown metrics in this transcript version"
        return s


class CopilotStoreReader:
    """Per-request usage from ``~/.copilot/session-store.db``, plus the app's ``data.db``.

    The CLI and the desktop app share this store, and ``assistant_usage_events``
    holds every request, including old sessions whose ``events.jsonl`` is gone or
    has no per-request records, and compaction calls. Rows carry the billing
    fields too. ``data.db`` lists the app's sessions, which is how a session is
    attributed: a row there other than ``cli_session`` is an app session, and
    anything else in this store is a CLI session.
    """

    # Columns read for the per-call rows. Older stores may lack some.
    _CALL_COLUMNS = ("agent_id", "duration_ms", "time_to_first_token_ms", "output_ttft_ms", "finish_reason",
                     "reasoning_effort", "reasoning_tokens")

    def __init__(self, copilot_home: Path, facts: FactBuffer | None = None) -> None:
        self.facts = facts
        self._occurrence: dict[tuple[str, tuple[int, int, int, int]], int] = {}
        self._cwd: dict[str, str] = {}
        self._agents_seen: set[tuple[str, str]] = set()  # (session, agent id)
        self.store_path = copilot_home / "session-store.db"
        self.data_path = copilot_home / "data.db"
        self.sessions: dict[str, SessionUsage] = {}
        self.app_types: dict[str, str] = {}
        self.app_totals: dict[str, tuple] = {}
        self._last_id = 0
        # The last row whose request an earlier run stored: its id, and its session and time
        # to tell that the store still holds that row. Every row is read again after a
        # restart, to rebuild the session totals, but a row up to this one is not stored twice.
        self.stored: tuple[int, str] = (0, "")
        self._last_mark = ""
        self._data_sig: tuple[float, int] | None = None
        self.unavailable = ""

    def position(self) -> tuple[int, str]:
        """(id, session and time) of the last row read, to save once the rows are stored."""
        return self._last_id, self._last_mark

    def surface(self, session_id: str) -> str:
        kind = self.app_types.get(session_id)
        return "copilot-desktop" if kind and kind != "cli_session" else "copilot-cli"

    def read(self) -> set[str]:
        """Add new rows and return the ids of sessions that changed."""
        touched: set[str] = set()
        self._read_app_sessions(touched)
        try:
            import sqlite3
        except ImportError:
            self.unavailable = SQLITE_UNAVAILABLE
            return touched
        self.unavailable = ""
        conn = open_readonly(self.store_path, "transcript-usage")
        if conn is None:
            return touched
        try:
            # A store that does not hold the saved row is another store: nothing of it is stored yet.
            saved = conn.execute("SELECT session_id, created_at FROM assistant_usage_events WHERE id = ?",
                                 (self.stored[0],)).fetchone()
            stored_through = self.stored[0] if saved and f"{saved[0]}|{saved[1]}" == self.stored[1] else 0
            present = {r[1] for r in conn.execute("PRAGMA table_info(assistant_usage_events)")}
            extra = ", ".join(c if c in present else f"NULL AS {c}" for c in self._CALL_COLUMNS)
            rows = conn.execute(
                "SELECT id, session_id, model, input_tokens, output_tokens, cache_read_tokens,"
                f" cache_write_tokens, total_nano_aiu, created_at, {extra}"
                " FROM assistant_usage_events WHERE id > ? ORDER BY id",
                (self._last_id,),
            )
            for row_id, sid, model, inp, out, read, write, nano, created, *call in rows:
                self._last_id, self._last_mark = row_id, f"{sid}|{created}"
                s = self.sessions.setdefault(sid, SessionUsage(session_id=sid, tool="copilot-cli"))
                ts = coerce_ts(created)
                s.touch(ts)
                read_i, write_i = _i(read), _i(write)
                self._add_call_fact(conn, sid, model, (_i(inp), _i(out), read_i, write_i), ts, call,
                                    store=row_id > stored_through)
                s.add(
                    _copilot_model(model),
                    ts,
                    max(0, _i(inp) - read_i - write_i),  # input includes cache classes
                    _i(out),
                    read_i,
                    write_i,
                    nano_aiu=_i(nano),
                )
                touched.add(sid)
                if self.facts is not None and self.facts.write_error is not None:
                    break
            if touched:
                self._read_session_details(conn, touched)
        except sqlite3.Error as exc:
            log.debug("transcript-usage: store read failed, retrying next poll: %s", exc)
        finally:
            conn.close()
        return touched

    def _add_call_fact(self, conn: sqlite3.Connection, sid: str, model: Any, tokens: tuple, ts: float, call: list,
                       *, store: bool = True) -> None:
        from ..records import AgentRow, RequestRow

        """One row per call. The key matches the events file's, so a call in both stays one row."""
        if self.facts is None:
            return
        if not self._cwd:
            self._cwd = {str(i): str(c or "") for i, c in conn.execute("SELECT id, cwd FROM sessions")}
        occurrence = self._occurrence.get((sid, tokens), 0)
        self._occurrence[(sid, tokens)] = occurrence + 1
        agent_id, duration, ttft, output_ttft, finish, effort, reasoning = call
        if not store:
            # Stored by an earlier run. The occurrence count above keeps later keys the same.
            if agent_id:
                self._agents_seen.add((sid, str(agent_id)))
            return
        raw, out, read, write = tokens
        billable = max(0, raw - read - write)
        name = copilot_model(model)
        self.facts.add_request(
            RequestRow(
                dedup_key=copilot_call_key(sid, tokens, occurrence),
                ts=ts,
                session_id=sid,
                agent_id=str(agent_id or ""),
                tool="copilot-cli",
                project_path=self._cwd.get(sid, ""),
                model=name,
                input_tokens=billable,
                output_tokens=out,
                cache_read_tokens=read,
                cache_creation_tokens=write,
                cost_usd=list_price(name, billable, out, read, write, 0, ts),
                duration_ms=float(duration or 0),
                ttft_ms=float(ttft or output_ttft or 0),
                finish_reason=str(finish or ""),
                # The store numbers turns its own way; the events file gives turn_index.
                effort=str(effort or "")[:20],
                thinking_tokens=int(reasoning) if isinstance(reasoning, int) else None,
            )
        )
        if agent_id and (sid, str(agent_id)) not in self._agents_seen:
            self._agents_seen.add((sid, str(agent_id)))
            self.facts.add_agent(
                AgentRow(
                    agent_id=str(agent_id),
                    session_id=sid,
                    tool="copilot-cli",
                    # Where the model belongs, this store sometimes has the subagent's name.
                    task=str(model or "") if name == "unknown" else "",
                    model="" if name == "unknown" else name,
                    is_sidechain=1,
                    started_at=ts,
                )
            )

    def _read_session_details(self, conn: sqlite3.Connection, touched: set[str]) -> None:
        turns = dict(conn.execute("SELECT session_id, COUNT(*) FROM turns GROUP BY session_id"))
        for sid, cwd, branch in conn.execute("SELECT id, cwd, branch FROM sessions"):
            s = self.sessions.get(sid)
            if s is None or sid not in touched:
                continue
            s.project_path = s.project_path or str(cwd or "")
            s.git_branch = s.git_branch or str(branch or "")
            s.turns = max(s.turns, _i(turns.get(sid)))

    def refresh_app_sessions(self, touched: set[str]) -> None:
        """Learn which sessions are the app's, before their rows are attributed."""
        self._read_app_sessions(touched)

    def _read_app_sessions(self, touched: set[str]) -> None:
        try:
            st = self.data_path.stat()
        except OSError:
            return
        sig = (st.st_mtime, st.st_size)
        if sig == self._data_sig:
            return
        try:
            import sqlite3
        except ImportError:
            self.unavailable = SQLITE_UNAVAILABLE
            return
        conn = open_readonly(self.data_path, "transcript-usage")
        if conn is None:
            return
        try:
            for sid, kind, *totals in conn.execute(
                "SELECT id, session_type, total_input_tokens, total_cached_tokens, total_output_tokens,"
                " total_nano_aiu, model, created_at, updated_at FROM sessions"
            ):
                if self.app_types.get(sid) != kind or self.app_totals.get(sid) != tuple(totals):
                    self.app_types[sid] = str(kind or "")
                    self.app_totals[sid] = tuple(totals)
                    if sid in self.sessions or totals[0] or totals[2]:
                        touched.add(sid)
            self._data_sig = sig
        except sqlite3.Error as exc:
            log.debug("transcript-usage: app store read failed, retrying next poll: %s", exc)
        finally:
            conn.close()


def _app_session_usage(session_id: str, totals: tuple) -> SessionUsage:
    """A session from the app's own counters, when its per-request rows are gone."""
    inp, cached, out, nano, model, created, updated = totals
    s = SessionUsage(
        session_id=session_id,
        tool="copilot-desktop",
        quality="partial",
        quality_reason="session totals from the app; no per-request rows or cache-write split",
    )
    ts = coerce_ts(created)
    s.touch(ts)
    s.touch(coerce_ts(updated))
    s.add(_copilot_model(model), ts, max(0, _i(inp) - _i(cached)), _i(out), _i(cached), 0, requests=0, nano_aiu=_i(nano))
    return s


def _adopt_billing(target: SessionUsage, source: SessionUsage) -> None:
    """Give *target* the credits *source* recorded. Sets values, so it can repeat."""
    if target._nano_aiu >= source._nano_aiu:
        return
    target._nano_aiu = source._nano_aiu
    for day, values in source.daily.items():
        slot = target.daily.setdefault(
            day,
            {"input_tokens": 0, "output_tokens": 0, "cache_read_tokens": 0, "cache_creation_tokens": 0, "cost_usd": 0.0},
        )
        if values.get("billing_amount"):
            slot["billing_amount"] = values["billing_amount"]


_copilot_model = copilot_model


class VSCodeDebugLogAccumulator:
    """Requests from VS Code's Copilot Chat ``debug-logs/<session>/*.jsonl``.

    A session's main log and its child logs (sub-agents, titles, categorization)
    are one directory, so they roll up to one session. ``inputTokens`` includes
    ``cachedTokens``. Cache writes are not reported, and only some requests carry
    a credit figure, so these sessions are ``partial``.
    """

    def __init__(self) -> None:
        self.sessions: dict[str, SessionUsage] = {}

    def feed(self, sid: str, is_main: bool, obj: dict) -> None:
        s = self.sessions.setdefault(
            sid,
            SessionUsage(
                session_id=sid,
                tool="copilot-vscode",
                quality="partial",
                quality_reason="debug log has no cache-write counts; credits only on some requests",
            ),
        )
        # Only some requests report cachedTokens. Without it the cached part of the prompt is
        # not known, and pricing all of it as uncached input overstates the cost several times.
        kind = obj.get("type")
        ts = coerce_ts(obj.get("ts"))
        s.touch(ts)
        attrs = obj.get("attrs") if isinstance(obj.get("attrs"), dict) else {}
        if kind == "llm_request":
            if not attrs.get("inputTokens") and not attrs.get("outputTokens"):
                return
            cached = _i(attrs.get("cachedTokens"))
            s.add(
                str(attrs.get("model") or ""),
                ts,
                max(0, _i(attrs.get("inputTokens")) - cached),
                _i(attrs.get("outputTokens")),
                cached,
                0,
                nano_aiu=_i(attrs.get("copilotUsageNanoAiu")),
                priceable="cachedTokens" in attrs,
            )
        elif kind == "tool_call":
            s.tool_calls += 1
        elif kind == "user_message" and is_main:
            s.turns += 1


class VSCodeChatSessionAccumulator:
    """Per-turn counts from ``chatSessions/<session>.jsonl``, for sessions with no debug log."""

    def __init__(self) -> None:
        self.sessions: dict[str, SessionUsage] = {}
        self._seen: set[tuple[str, int]] = set()
        self._count: dict[str, int] = {}

    def feed(self, sid: str, obj: dict) -> None:
        s = self.sessions.setdefault(
            sid,
            SessionUsage(
                session_id=sid,
                tool="copilot-vscode",
                quality="partial",
                quality_reason="chat log counts per turn, with no cache split or billing figure",
            ),
        )
        s.touch(coerce_ts((obj.get("v") or {}).get("creationDate")) if isinstance(obj.get("v"), dict) else 0.0)
        path = obj.get("k")
        value = obj.get("v")
        if obj.get("kind") == 0 and isinstance(value, dict):
            self._count[sid] = 0
            self._requests(s, sid, value.get("requests") or [])
        elif isinstance(path, list) and len(path) == 1 and path[0] == "requests" and isinstance(value, list):
            # A push, or a splice at ``i``: the request count is the index of the first one added.
            if isinstance(obj.get("i"), int):
                self._count[sid] = obj["i"]
            self._requests(s, sid, value)
        elif isinstance(path, list) and len(path) == 3 and path[0] == "requests" and path[2] == "result":
            if (sid, -path[1] - 1) not in self._seen:
                self._seen.add((sid, -path[1] - 1))
                s.turns += 1
            self._add(s, sid, _i(path[1]), value, s.last_activity_at)

    def _requests(self, s: SessionUsage, sid: str, requests: list) -> None:
        for req in requests:
            i = self._count.get(sid, 0)
            self._count[sid] = i + 1
            if isinstance(req, dict):
                s.turns += 1 if (sid, -i - 1) not in self._seen else 0
                self._seen.add((sid, -i - 1))
                self._add(s, sid, i, req.get("result"), coerce_ts(req.get("timestamp")))

    def _add(self, s: SessionUsage, sid: str, index: int, result: Any, ts: float) -> None:
        meta = result.get("metadata") if isinstance(result, dict) else None
        if not isinstance(meta, dict) or (sid, index) in self._seen:
            return
        if meta.get("promptTokens") is None and meta.get("outputTokens") is None:
            return
        self._seen.add((sid, index))
        s.touch(ts)
        s.add("unknown", ts or s.last_activity_at, _i(meta.get("promptTokens")), _i(meta.get("outputTokens")))


def _workspace_folder(workspace_storage_dir: Path) -> str:
    """The folder a VS Code ``workspaceStorage/<hash>`` belongs to, as a path."""
    try:
        data = json.loads((workspace_storage_dir / "workspace.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return ""
    folder = data.get("folder") if isinstance(data, dict) else ""
    return decode_file_uri(str(folder or ""))


# ── Whole-tree scan, and the periodic ingester ─────────────────────────


def _tail_digest(fh: IO[bytes], size: int) -> str:
    """A digest of the 256 bytes that end at *size*; empty when the file is shorter than *size*."""
    start = max(0, size - 256)
    fh.seek(start)
    data = fh.read(size - start)
    return hashlib.sha256(data).hexdigest()[:16] if len(data) == size - start and data else ""


def _discard(stream: IO[bytes], count: int) -> bool:
    """Read and drop *count* bytes; False when the stream ends first."""
    while count > 0:
        chunk = stream.read(min(count, 1 << 20))
        if not chunk:
            return False
        count -= len(chunk)
    return True


def _open_size(path: Path) -> int | None:
    try:
        with open(path, "rb") as fh:
            return fh.seek(0, os.SEEK_END)
    except OSError:
        return None


def _current_size(path: Path, size: int, mtime: float, offset: int, now: float) -> int:
    """The file's size, measured through a handle when Windows may report a stale one."""
    if not platforms.IS_WINDOWS or size > offset or now - mtime > HELD_FILE_RECHECK_S and not _held(path):
        return size
    measured = _open_size(path)
    return size if measured is None else measured


def _held(path: Path) -> bool:
    """A Copilot CLI session marks the folder of a file it keeps open."""
    if path.name != "events.jsonl":
        return False
    import psutil

    try:
        for marker in path.parent.glob("inuse.*.lock"):
            try:
                pid = int(marker.name.split(".")[1])
                # Crashes leave markers behind, and their PIDs can be reused.
                if pid > 0 and psutil.Process(pid).create_time() <= marker.stat().st_mtime:
                    return True
            except (OSError, ValueError, psutil.Error):
                continue
    except OSError:
        return False
    return False


class TranscriptUsageIngester:
    """Tails the three transcript stores and writes one row per session.

    A restart skips only files whose complete contents were stored successfully.
    A changed file is re-read to rebuild its in-memory totals. Nothing under the
    tools' own directories is ever written.
    """

    def __init__(
        self,
        our_store: Any,
        *,
        claude_projects: Path | None = None,
        codex_sessions: Path | None = None,
        copilot_state: Path | None = None,
        vscode_workspaces: Path | None = None,
        backfill_days: float = BACKFILL_DAYS,
        defer_old: bool = False,
        tool_calls=None,
        fact_target=None,
        checkpoint: StateFile | None = None,
        quality=None,
        source_index: Callable[[list[dict]], None] | None = None,
    ) -> None:
        # What this reader was made with, to start over from its saved positions (see _restart).
        self._init_args = (our_store, dict(
            claude_projects=claude_projects, codex_sessions=codex_sessions, copilot_state=copilot_state,
            vscode_workspaces=vscode_workspaces, backfill_days=backfill_days, defer_old=defer_old,
            tool_calls=tool_calls, fact_target=fact_target, checkpoint=checkpoint, quality=quality,
            source_index=source_index))
        if backfill_days <= 0:
            backfill_days = ALL_DAYS
        self.store = our_store
        self.quality = our_store if quality is None else quality
        self._fact_target = our_store if fact_target is None else fact_target
        self._checkpoint = checkpoint
        # The daemon's ingester defers the old files of a first run; a backfill or a
        # command reads every file in one pass.
        self.defer_old = defer_old
        self.claude_projects = claude_projects or platforms.claude_projects_dir()
        self.codex_sessions = codex_sessions or platforms.codex_global_dir() / "sessions"
        self.copilot_state = copilot_state or platforms.copilot_session_dir()
        # With its default folders, the reader also follows the homes found on this machine.
        self._discover = not (claude_projects or codex_sessions or copilot_state)
        self.vscode_workspaces = vscode_workspaces or vscode_chat_default_log_dir()
        # With its default folder, the reader also follows the other VS Code editions
        # and profiles, and the chats of windows that had no folder open.
        self._discover_vscode = vscode_workspaces is None
        self.facts = FactBuffer(self._fact_target, time.time() - backfill_days * 86400, tool_calls=tool_calls)
        # What each session achieved, from its transcripts and its metadata files.
        self._book = self.facts.book = OutcomeBook()
        self._metadata = MetadataReaders(self.facts, self._book)
        self._store = CopilotStoreReader(self.copilot_state.parent, self.facts)
        self.facts.surface = self._store.surface
        self._claude_facts = ClaudeFacts(self.facts)
        self._claude_copies = ClaudeCopies()
        self._rewind_seen: dict[Path, int] = {}
        self._vscode_debug_facts: dict[Path, VSCodeDebugFacts] = {}
        self._vscode_chat_facts: dict[Path, VSCodeChatFacts] = {}
        self._desktop_marked: set[str] = set()
        self._debug_logs = VSCodeDebugLogAccumulator()
        self._chat_logs = VSCodeChatSessionAccumulator()
        self._copilot_finished: dict[str, SessionUsage] = {}
        self.backfill_days = backfill_days
        # The index of session files: every file found, with its size and how far it was read.
        self._source_index = source_index
        self._found: dict[Path, tuple[str, int, int]] = {}
        self._outside_window: set[Path] = set()
        self._indexed: dict[Path, tuple] = {}
        self.source_counts: dict[str, int] = {}
        self.last_poll_ts = 0.0
        self.last_poll_inserted = 0
        self._claude = ClaudeAccumulator()
        self._codex_sessions: dict[str, SessionUsage] = {}
        self._codex: dict[Path, CodexAccumulator] = {}
        self._copilot: dict[Path, CopilotAccumulator] = {}
        self._offsets: dict[Path, int] = {}
        # Compressed rollouts that held bad data: path -> ((mtime_ns, size), why). Not read again until the file changes.
        self._bad_zst: dict[Path, tuple[tuple[int, int], str]] = {}
        # Subagent transcripts read while their meta file gave no spawning call: (session, agent, meta signature).
        self._meta_pending: dict[Path, tuple[str, str, tuple[int, int] | None]] = {}
        self._written: dict[str, tuple] = {}
        self._pending_sessions: dict[str, SessionUsage] = {}
        # Names kept outside the transcripts (Copilot and Codex metadata files), and the
        # readers that find them: one per tool home, each reading again only what changed.
        self._external_titles: dict[str, Title] = {}
        self._title_retry: set[str] = set()
        self._title_readers: dict[tuple[str, Path], CopilotTitles | CodexTitles] = {}
        self._first_plan = True
        self._budget_scale = 1.0
        # The clock of PROGRESS_SAVE_S; a test gives its own.
        self._clock: Callable[[], float] = time.monotonic
        self._progress_saved = 0.0
        # The last status recorded at the end of a poll: (status, severity, message, detail).
        self._status: tuple[str, str, str, dict] = ("ok", "info", "", {})
        identity = [
            socket.gethostname(),
            platforms.path_key(str(Path.home())),
            *(
                platforms.path_key(str(p.absolute()))
                for p in (
                    self.claude_projects,
                    self.codex_sessions,
                    self.copilot_state,
                    self.vscode_workspaces,
                )
            ),
        ]
        digest = hashlib.sha256(json.dumps(identity).encode("utf-8")).hexdigest()[:24]
        self._checkpoint_key = f"transcript_usage:files1:{digest}"
        self._resume_before = 0.0
        self._saved_store: tuple[int, str] = (0, "")
        # The Copilot store reader version saved with the position; 0 asks for its rows again.
        self._store_version = READER_VERSIONS["copilot-store"]
        # session-store.db content of the sessions with no events file, per Copilot home (see _read_store_content):
        # the readers, their saved positions and reader version, and the sessions they list.
        self._content: dict[Path, CopilotStoreContent] = {}
        self._content_saved: dict[str, dict] = {}
        self._content_version = READER_VERSIONS["copilot-store-content"]
        self._db_only: dict[str, StoreSession] = {}
        self._listed: dict[str, SessionUsage] = {}
        # Every Copilot session whose events.jsonl this reader saw, also after Copilot removed its folder:
        # the events file stays its only source of prompts, replies and tool calls.
        self._event_sessions: set[str] = set()
        self._saved_content: tuple = ()
        self._checkpoint_unsaved = False
        # Per file read to its end: a digest of its last bytes, to know the file again after a restart.
        self._tails: dict[Path, str] = {}
        # Per file read to its end: (mtime_ns, size, version of the reader that read it).
        self._checkpoints: dict[Path, tuple[int, int, int]] = self._load_checkpoints()
        self._read_complete: dict[Path, tuple[int, int, int]] = {}
        # This poll's plan (see _plan): each file's stat and kind, and the backlog that waits:
        # path -> (tool, size, mtime, read again for a newer reader).
        self._stats: dict[Path, tuple[int, float, int]] = {}
        self._kinds: dict[Path, str] = {}
        self._waiting: dict[Path, tuple[str, int, float, bool]] = {}
        # Claude Code main files read again in this poll because a subagent file of theirs is read.
        self._forced: set[Path] = set()
        self._transcript_paths: dict[Path, str] = {}
        self._path_observers: tuple[Callable[[Path, str], None], ...] = ()
        self._path_lock = threading.RLock()

    def observe_transcript_paths(self, observer: Callable[[Path, str], None]) -> Callable[[], None]:
        """Share discovered paths with native adapters without another history walk."""
        with self._path_lock:
            self._path_observers += (observer,)
            for path, tool in self._transcript_paths.items():
                observer(path, tool)

        def detach() -> None:
            with self._path_lock:
                self._path_observers = tuple(item for item in self._path_observers if item is not observer)

        return detach

    def _note_transcript_paths(self, paths: Iterable[Path], tool: str) -> None:
        with self._path_lock:
            for path in paths:
                if path in self._transcript_paths:
                    continue
                self._transcript_paths[path] = tool
                for observer in self._path_observers:
                    observer(path, tool)

    def _load_checkpoints(self) -> dict[Path, tuple[int, int, int]]:
        if self._checkpoint is None:
            return {}
        try:
            entry = self._checkpoint.read().get(self._checkpoint_key, {})
            saved = entry.get("files", {})
            # A position saved before reader versions has no third value: version 0.
            checkpoints = {Path(path): (int(sig[0]), int(sig[1]), int(sig[2]) if len(sig) > 2 else 0)
                           for path, sig in saved.items()}
            self._resume_before = float(entry["ts"]) - RESTART_GRACE_S if entry else 0.0
            self._tails = {Path(path): str(tail) for path, tail in entry.get("tails", {}).items()}
            row_id, mark = entry.get("copilot_store", (0, ""))
            self._saved_store = (int(row_id), str(mark))
            # Rows the store reader stored are skipped after a restart, unless a newer reader reads them.
            current = int(entry.get("copilot_store_version", 0)) >= READER_VERSIONS["copilot-store"]
            self._store.stored = self._saved_store if current else (0, "")
            if not current:
                self._saved_store = (-1, "")  # saved again, with the version, once the rows are stored
            # The store's content positions count only when this reader version took them; the sessions with
            # an events file are kept whatever the version, and include every events file read before.
            if int(entry.get("copilot_store_content_version", 0)) >= READER_VERSIONS["copilot-store-content"]:
                saved_content = entry.get("copilot_store_content")
                self._content_saved = dict(saved_content) if isinstance(saved_content, dict) else {}
            self._event_sessions = {str(sid) for sid in entry.get("copilot_event_sessions") or ()}
            self._event_sessions.update(Path(path).parent.name for path in saved if Path(path).name == "events.jsonl")
            self._book.load(entry.get("outcomes"))
            # The metadata files (Claude workflows, Copilot todos and store checkpoints) are read again
            # when their reader is newer than the one that read them.
            if int(entry.get("metadata_version", 0)) >= READER_VERSIONS["session-metadata"]:
                self._metadata.load(entry.get("metadata"))
            elif entry.get("metadata"):
                self._metadata.dirty = True
            return checkpoints
        except (OSError, ValueError, TypeError, AttributeError, KeyError) as exc:
            log.warning("transcript-usage: checkpoints unavailable; source files will be read again: %s", exc)
            return {}

    def _content_position(self) -> tuple[dict[str, dict], int]:
        """The saved positions of the store content readers, with those of homes not read in this process."""
        positions = dict(self._content_saved)
        positions.update({str(db): reader.position() for db, reader in self._content.items()})
        return positions, len(self._event_sessions)

    def _save_checkpoints(self, ts: float, *, force: bool = False) -> None:
        position = self._store.position()
        content = (self._content_position(), self._content_version)
        if self._checkpoint is None or not (force or self._read_complete or position != self._saved_store
                                            or content != self._saved_content
                                            or self._book.dirty or self._metadata.dirty):
            return
        self._checkpoint_unsaved = True
        cutoff_ns = int((ts - self.backfill_days * 86400) * 1e9)
        self._checkpoints = {p: sig for p, sig in self._checkpoints.items() if sig[0] >= cutoff_ns}
        self._checkpoints.update(self._read_complete)
        try:
            self._checkpoint.replace({self._checkpoint_key: {
                # ts is the start of the poll whose positions these are; saved_at is when they were saved.
                "ts": ts, "saved_at": time.time(), "files": {str(p): list(sig) for p, sig in self._checkpoints.items()},
                "copilot_store": list(position),
                # Every row up to the position was read by this version, and stored (see CopilotStoreReader).
                "copilot_store_version": self._store_version,
                # Rows up to these ids were read by this version, and stored (see CopilotStoreContent).
                "copilot_store_content": content[0][0],
                "copilot_store_content_version": self._content_version,
                "copilot_event_sessions": sorted(self._event_sessions),
                "tails": {str(p): tail for p, tail in self._tails.items() if p in self._checkpoints},
                "outcomes": self._book.dump(ts - self.backfill_days * 86400),
                "metadata": self._metadata.dump(),
                "metadata_version": READER_VERSIONS["session-metadata"],
            }})
            self._read_complete.clear()
            self._saved_store = position
            self._saved_content = content
            self._book.dirty = self._metadata.dirty = False
            self._checkpoint_unsaved = False
        except OSError as exc:
            log.warning("transcript-usage: checkpoints not saved; the next poll will retry: %s", exc)

    def list_files(self) -> tuple[dict[str, list[Path]], dict[str, list[Path]], dict[Path, Path]]:
        """The session files of every tool, the session-like files no rule covers, and the
        projects folder of each Claude Code file. Lists folders only; reads no file."""
        unclaimed: dict[str, list[Path]] = {}
        claude_roots: dict[Path, Path] = {}
        for root in self._roots("claude", self.claude_projects):
            found, other = session_files.scan("claude-code", root)
            claude_roots.update(dict.fromkeys(found, root))
            unclaimed.setdefault("claude-code", []).extend(other)
        codex_files, unclaimed["codex-cli"] = self._codex_rollouts()
        copilot_files: list[Path] = []
        for root in self._roots("copilot", self.copilot_state):
            found, other = session_files.scan("copilot-cli", root)
            copilot_files += found
            unclaimed.setdefault("copilot-cli", []).extend(other)
        workspace_roots, empty_window_dirs = self._vscode_dirs()
        debug_files = [p for root in workspace_roots for p in root.glob("*/GitHub.copilot-chat/debug-logs/*/*.jsonl")]
        files = {"claude-code": list(claude_roots), "codex-cli": codex_files, "copilot-cli": copilot_files,
                 "copilot-vscode": debug_files + self._chat_files(workspace_roots, empty_window_dirs)}
        return files, {tool: paths for tool, paths in unclaimed.items() if paths}, claude_roots

    def reread_selection(self, *, tools: Iterable[str] = (), since: float = 0.0, sessions: Iterable[str] = (),
                         every: bool = False) -> dict[str, list[tuple[Path, int]]]:
        """The session files ``aictl db reread`` asks to read again, per tool, with their sizes.

        *tools* are the names the store uses (``copilot-desktop`` is a Copilot session of the app);
        a file matches when it is of a named tool, changed at or after *since*, and of a named
        session, for each of these that is given. *every* selects every file. Only files within
        the reader's ``history_days`` are listed: the reader does not read older ones.
        """
        tools, sessions = set(tools), set(sessions)
        if not (tools or since or sessions or every):
            return {}
        self._store.refresh_app_sessions(set())
        cutoff = time.time() - self.backfill_days * 86400
        found: dict[str, list[tuple[Path, int]]] = {}
        for kind, paths in self.list_files()[0].items():
            for path in paths:
                sid = self._source_session(kind, path)
                tool = self._store.surface(sid) if kind == "copilot-cli" else kind
                try:
                    st = path.stat()
                except OSError:
                    continue
                if (st.st_mtime < cutoff or (tools and tool not in tools) or st.st_mtime < since
                        or (sessions and sid not in sessions)):
                    continue
                found.setdefault(tool, []).append((path, st.st_size))
        return found

    def _take_reread_requests(self) -> bool:
        """Apply the requests ``aictl db reread`` left beside the saved positions.

        Each named file is saved as read by reader version 0, so it is read again from its start
        and its rows stored again, after the new and changed files. The positions are saved before
        a request file is removed: a crash between the two applies the request again, to the same
        effect. Returns True when this process holds read state of a named file (or of the Copilot
        store), which it then drops by starting over from the saved positions, as a restart does.
        Requests wait while rows are waiting for the store.
        """
        if self._checkpoint is None or len(self.facts) or self.facts.write_error is not None or self._pending_sessions:
            return False
        requests = sorted(self._checkpoint.path.parent.glob(REREAD_REQUEST_GLOB))
        if not requests:
            return False
        named: set[Path] = set()
        store = False
        for request in requests:
            data = StateFile(request).read()
            named.update(Path(p) for p in data.get("paths") or () if isinstance(p, str))
            store = store or bool(data.get("copilot_store"))
        for path in named:
            self._read_complete.pop(path, None)
        for path in named & self._checkpoints.keys():
            self._checkpoints[path] = (*self._checkpoints[path][:2], 0)
        if store:
            self._store_version = self._content_version = 0
        self._save_checkpoints(time.time(), force=True)
        if self._checkpoint_unsaved:
            return False
        for request in requests:
            request.unlink(missing_ok=True)
        log.info("transcript-usage: %d file(s) marked to read again%s", len(named),
                 " and the Copilot store" if store else "")
        return bool(named & self._offsets.keys()) or store

    def _restart(self) -> None:
        """Start over from the saved positions, as a new process does, keeping who listens for paths."""
        observers, paths = self._path_observers, self._transcript_paths
        poll_status = getattr(self, "_aictl_poll_status", None)
        our_store, kwargs = self._init_args
        self.__init__(our_store, **kwargs)  # type: ignore[misc]
        self._path_observers, self._transcript_paths = observers, paths
        if poll_status is not None:
            self._aictl_poll_status = poll_status

    def _version_current(self, path: Path) -> bool:
        """True when the reader that last read *path* to its end is this reader's version."""
        saved = self._checkpoints.get(path)
        kind = self._kinds.get(path)
        return saved is not None and (kind is None or saved[2] >= READER_VERSIONS[kind])

    def _plan(self, files: dict[str, list[Path]], cutoff: float, now: float) -> None:
        """Stat every session file and choose the files of the backlog this poll reads.

        A file this process has not read is in its tool's backlog when it was never read, or was
        last read by a lower reader version, whether it is recent or old. A file this reader
        version read to its end is not: the lines added to it since are read at once, as is every
        file this process is reading. A poll reads up to DEFERRED_BYTES_PER_POLL of backlog
        (less while the store refuses rows, see _check_fact_write), shared out between the tools
        with a backlog in the order of BACKLOG_PRIORITY: each takes an equal part of what is left,
        so no tool waits for another's backlog. Within a tool the files changed in the last
        RECENT_FIRST_S come first, newest first, then the never-read older files, then the older
        files to read again, newest first; the first poll of a process reads recent files only.
        A tool takes files until its part is used, so a poll reads at most its part and one file
        more per tool, and a file larger than the budget is read alone.

        A Claude Code session's files are taken in order, its main file first (see
        _claude_sessions): a subagent's lines name their turn by the prompt id the main file
        numbers, which this process remembers once it has read the main file. A session can so
        be read over several polls; after a restart in between, its main file is read again
        with its next subagent files, not stored again. Without *defer_old* every file is read
        at once.
        """
        self._stats.clear()
        self._waiting.clear()
        self._forced.clear()
        backlog: dict[str, list[tuple[tuple, Path, int, float, bool, bool]]] = {}
        for tool, paths in files.items():
            for p in paths:
                try:
                    st = p.stat()
                except OSError:
                    continue
                self._kinds[p] = reader_kind(tool, p)
                saved = self._checkpoints.get(p)
                offset = self._offsets.get(p, saved[1] if saved else 0)
                size = _current_size(p, st.st_size, st.st_mtime, offset, now)
                self._stats[p] = (st.st_mtime_ns, st.st_mtime, size)
                if p in self._offsets or not self.defer_old or st.st_mtime < cutoff:
                    continue
                if saved is not None and self._version_current(p):
                    continue  # unchanged, or what was added since is read now
                if platforms.IS_WINDOWS and _held(p):
                    continue
                recent = st.st_mtime >= now - RECENT_FIRST_S
                again = saved is not None
                rank = (0, 0, -st.st_mtime) if recent else (1, int(again), -st.st_mtime)
                backlog.setdefault(tool, []).append((rank, p, size, st.st_mtime, again, recent))
        first, self._first_plan = self._first_plan, False
        remaining = DEFERRED_BYTES_PER_POLL * self._budget_scale
        tools = [t for t in (*BACKLOG_PRIORITY, *sorted(backlog.keys() - set(BACKLOG_PRIORITY))) if backlog.get(t)]
        for i, tool in enumerate(tools):
            # (path, size, mtime, read again, recent, read again only to rebuild this process's state)
            items = [(p, size, mtime, again, recent, False)
                     for _, p, size, mtime, again, recent in sorted(backlog[tool], key=lambda x: x[0])]
            if tool == "claude-code":
                items = self._claude_sessions(items, files[tool], cutoff)
            share = remaining / (len(tools) - i)
            used = 0
            for p, size, mtime, again, recent, replay in items:
                if used >= share or (first and not recent):
                    if not replay:
                        self._waiting[p] = (tool, size, mtime, again)
                    continue
                used += size
                if replay:
                    self._forced.add(p)
            remaining -= used

    def _claude_sessions(self, items: list[tuple], paths: list[Path], cutoff: float) -> list[tuple]:
        """The Claude Code files of the backlog, *items*, in sessions, each session's main file first.
        A main file this process has not read and that needs no reading of its own comes too, to
        be read again from its start (its stored rows are not stored again): the subagents' lines
        name their turn by the prompt id it numbers. A session is recent when one of its files of
        the backlog is. The sessions come in the order of their first file in *items*."""
        sessions: dict[str, list[tuple]] = {}
        for item in items:
            sessions.setdefault(_claude_session_id(item[0]), []).append(item)
        listed = {item[0] for item in items}
        mains: dict[str, Path] = {}
        for p in paths:
            stat = self._stats.get(p)
            if ("subagents" not in p.parts and p not in listed and p not in self._offsets and p in self._checkpoints
                    and stat is not None and stat[1] >= cutoff and p.stem in sessions):
                mains[p.stem] = p
        ordered = []
        for sid, group in sessions.items():
            recent = any(item[4] for item in group)
            main = mains.get(sid)
            replay = [(main, self._stats[main][2], self._stats[main][1], False, recent, True)] if main else []
            ordered += sorted(replay + [(*item[:4], recent, False) for item in group],
                              key=lambda item: "subagents" in item[0].parts)
        return ordered

    def backlog_pending(self) -> bool:
        """Whether the next poll should follow at once: backlog files wait and the store takes rows.

        A poll reads DEFERRED_BYTES_PER_POLL of backlog. With POLL_INTERVAL_S between two polls a
        re-read of 14.5 GB after a reset ran at 66 MB a minute, half of the time waiting for the
        next poll (measured 2026-11-24). While the store refuses rows (_check_fact_write halves
        what a poll reads) the reader keeps its interval.
        """
        return bool(self._waiting) and self._budget_scale >= 1.0 and self.facts.write_error is None

    def backlog_status(self) -> dict[str, dict]:
        """Per tool, what waits in the backlog: files and bytes, those of them to read again for a
        newer reader, and the day of the oldest waiting file."""
        status: dict[str, dict] = {}
        for tool, size, mtime, again in self._waiting.values():
            entry = status.setdefault(tool, {"files_waiting": 0, "bytes_waiting": 0, "reread_files_waiting": 0,
                                             "reread_bytes_waiting": 0, "oldest_waiting": mtime})
            entry["files_waiting"] += 1
            entry["bytes_waiting"] += size
            entry["reread_files_waiting"] += int(again)
            entry["reread_bytes_waiting"] += size if again else 0
            entry["oldest_waiting"] = min(entry["oldest_waiting"], mtime)
        for entry in status.values():
            entry["oldest_waiting"] = local_day(entry["oldest_waiting"])
        return status

    def _changed(self, paths: Iterable[Path], cutoff: float, tool: str = "") -> list[Path]:
        """The files of *paths* to read in this poll, by the plan of :meth:`_plan`."""
        found: list[tuple[float, Path]] = []
        for p in paths:
            stat = self._stats.get(p)
            if stat is None:
                continue
            mtime_ns, mtime, size = stat
            saved = self._checkpoints.get(p)
            if tool:
                self._found[p] = (tool, mtime_ns, size)
            if p not in self._offsets:
                if (saved is not None and saved[:2] == (mtime_ns, size) and mtime < self._resume_before
                        and self._version_current(p) and p not in self._forced):
                    continue
                held = platforms.IS_WINDOWS and mtime < time.time() - RECENT_FIRST_S and _held(p)
                if mtime < cutoff and not held:
                    self._outside_window.add(p)
                    continue
                if p in self._waiting:
                    continue
            if size < self._offsets.get(p, 0):
                # Truncated or rewritten: its lines were already counted, so
                # re-reading from 0 is the only way to see new ones, and the
                # global request key keeps Claude's replay from double counting.
                self._offsets[p] = 0
            if size > self._offsets.get(p, 0):
                found.append((mtime, p))
        # Oldest first: a streaming reply's lines are read in the order they were written.
        return [p for _, p in sorted(found, key=lambda x: x[0])]

    def poll(self) -> int:
        """Read what is new and persist changed sessions. Returns rows written."""
        if self.facts.write_error is not None:
            self.facts.flush()
            self._check_fact_write()
        if self._take_reread_requests():
            self._restart()
        now = time.time()
        cutoff = now - self.backfill_days * 86400
        touched = self._pending_sessions
        published: set[str] = set()
        errors = 0
        self.facts.cutoff = cutoff
        self._found.clear()
        self._outside_window.clear()
        # Publish only path identities before any replay or storage work. Native
        # output follows active append-only tails, never this history backlog.
        files, unclaimed, claude_roots = self.list_files()
        claude_files, codex_files, copilot_files = files["claude-code"], files["codex-cli"], files["copilot-cli"]
        debug_files = [p for p in files["copilot-vscode"] if "debug-logs" in p.parts]
        chat_files = [p for p in files["copilot-vscode"] if "debug-logs" not in p.parts]
        self._plan(files, cutoff, now)
        if self._waiting:
            # The queue is shown while this poll reads, not only when it ends: a poll can take long.
            status, severity, message, extra = self._status
            waiting = f"{len(self._waiting)} session file(s) waiting to be read"
            self._record_status(status, severity, f"{message}; {waiting}" if status != "ok" else waiting, extra)
        self._note_transcript_paths(claude_files, "claude-code")
        # A compressed rollout is a finished session: nothing tails it, so only plain ones are announced.
        self._note_transcript_paths([p for p in codex_files if p.suffix != session_files.ZSTD], "codex-cli")
        self._note_transcript_paths(copilot_files, "copilot-cli")
        # Every events file found, read yet or not: its session's content is the file's, never the store's.
        self._event_sessions.update(p.parent.name for p in copilot_files if p.name == "events.jsonl")
        app_ids: set[str] = set()
        self._store.refresh_app_sessions(app_ids)
        self._mark_desktop_sessions()
        renamed = self._read_external_titles()

        def read(path: Path, allowed_types: frozenset[bytes] | None = None) -> Iterator[dict]:
            """Yield parsed lines after the file's offset, one at a time: holding
            a whole transcript in memory cost 570 MB on the first poll. A
            half-written last line stays unread until it ends with a newline."""
            nonlocal errors
            offset = self._offsets.get(path, 0)
            # A file read again from its start after a restart: the lines up to the saved
            # size rebuild the totals, and their rows, stored by the earlier run, are not sent again.
            stored_through = self._stored_through(path) if path not in self._offsets else 0
            self._note_reread(path)
            try:
                with open(path, "rb") as fh:
                    fh.seek(offset)
                    for record in records(fh, allowed_types=allowed_types):
                        offset = record.offset
                        self._offsets[path] = offset
                        self.facts.replaying = offset <= stored_through
                        if record.data is not None:
                            yield record.data
                        # Finish the source record before pausing: one record can emit
                        # several facts, and its offset already belongs to this batch.
                        if self.facts.write_error is not None:
                            break
                    st = os.fstat(fh.fileno())
                    if offset == st.st_size:
                        self._read_complete[path] = (st.st_mtime_ns, offset, self._reader_version(path))
                        self._tails[path] = _tail_digest(fh, offset)
            except OSError as exc:
                errors += 1
                log.debug("transcript-usage: cannot read %s: %s", path.name, exc)
            finally:
                self.facts.replaying = False

        self._read_late_agent_meta()
        for path in _parents_first(self._changed(claude_files, cutoff, "claude-code")):
            sid = _claude_session_id(path)
            agent_id, meta = self._claude_agent(path)
            if agent_id and not meta.get("toolUseId"):
                self._meta_pending[path] = (sid, agent_id, _meta_signature(path))
            elif agent_id:
                self._meta_pending.pop(path, None)
            main = not agent_id
            role = str(meta.get("agentType") or "")[:120]
            whole = not self._offsets.get(path)
            if whole:
                self._claude_facts.begin_file(sid, agent_id)
            # Claude Code keeps its file checkpoint backups beside projects/, in file-history/<session>/.
            self._claude_facts.history_dir = claude_roots[path].parent / "file-history"
            own = copied = False
            if main and sid == path.stem:
                self._claude_copies.refresh(path.parent)
            for obj in read(path, _CLAUDE_RECORD_TYPES):
                owner = claude_line_session(obj, sid)
                if owner == sid and main and sid == path.stem:
                    owner = self._claude_copies.owner(path, claude_call_mark(obj))
                if owner != sid:
                    # A copy of another session's line (resume or fork): its facts come from that
                    # session's own file. The copy only says where this session came from.
                    copied = True
                    if main:
                        self._claude.session(sid).resumed_from = owner
                    continue
                own = True
                self._claude.feed(sid, obj, main=main)
                self._claude_facts.feed(sid, obj, agent_id=agent_id, role=role, meta=meta)
            if whole and copied and not own and agent_id:
                # A subagent file copied into a resumed session: the agent is the earlier session's.
                # An older aictl stored it under this session too; that row goes.
                forget = getattr(self._fact_target, "forget_agents", None)
                if forget is not None:
                    forget([(sid, agent_id)])
            if sid in self._claude.sessions:
                touched[sid] = self._claude.sessions[sid]
            self._check_fact_write()
            self._save_progress(touched, now, published)

        no_library: dict[Path, str] = {}
        for path in self._changed(codex_files, cutoff, "codex-cli"):
            logical = session_files.logical_path(path)
            acc = self._codex.setdefault(logical, CodexAccumulator(self._codex_sessions, logical.stem))
            if path.suffix == session_files.ZSTD:
                for obj in self._read_compressed(path, logical, no_library):
                    acc.feed(obj)
            else:
                for obj in read(path):
                    acc.feed(obj)
            sid = acc.sid or acc.fallback_id
            if sid in self._codex_sessions:
                touched[sid] = self._codex_sessions[sid]
            self._save_progress(touched, now, published)
        listed = set(codex_files)
        self._bad_zst = {p: bad for p, bad in self._bad_zst.items() if p in listed}
        unreadable = {**{p: why for p, (_, why) in self._bad_zst.items()}, **no_library}

        copilot_ids: set[str] = set()
        # Copilot files are independent sessions, not Claude's cross-file replays.
        copilot_files = list(reversed(self._changed(copilot_files, cutoff, "copilot-cli")))
        if platforms.IS_WINDOWS:
            copilot_files.sort(key=_held, reverse=True)
        for path in copilot_files:
            sid = path.parent.name
            cop = self._copilot.setdefault(path, CopilotAccumulator(sid, facts=CopilotFacts(sid, self.facts)))
            if self._offsets.get(path, 0) == 0 and cop.facts is not None:
                cop.facts.reset()
            for obj in read(path):
                cop.feed(obj)
            if cop.facts is not None:
                cop.facts.finish_poll(now, PENDING_CONFIRM_MAX_AGE_S)
                self._read_rewind_index(path.parent / "rewind-file-snapshots" / "index.json", cop.facts)
            # Shutdown metrics are added by finish(), which must therefore run
            # once per accumulator: a shutdown-only file starts over each time.
            if not cop.has_records and cop.shutdowns:
                self._copilot.pop(path, None)
                self._offsets.pop(path, None)
            self._copilot_finished[sid] = cop.finish()
            copilot_ids.add(sid)
            touched[sid] = self._pick_copilot_source(sid)
            self.facts.flush(retry=False)
            self._check_fact_write()
            self._persist((touched[sid],), now, published)
            self._save_progress(touched, now, published)

        copilot_ids |= self._store.read() | app_ids
        copilot_ids |= self._read_store_content(cutoff)
        for sid in copilot_ids:
            touched[sid] = self._pick_copilot_source(sid)
        self._check_fact_write()

        debug_ids: set[str] = set()
        for path in self._changed(debug_files, cutoff, "copilot-vscode"):
            sid = path.parent.name
            debug_ids.add(sid)
            debug_facts = self._debug_facts_for(path, sid)
            for obj in read(path):
                self._debug_logs.feed(sid, path.name == "main.jsonl", obj)
                debug_facts.feed(obj)
            usage = self._debug_logs.sessions.get(sid)
            if usage is not None:
                usage.project_path = usage.project_path or _workspace_folder(path.parents[3])
                touched[sid] = usage
            self._check_fact_write()
            self._save_progress(touched, now, published)

        def chat_lines(path: Path) -> Iterator[dict]:
            """A chat file's snapshot one request at a time, then its patch lines."""
            nonlocal errors
            if self._offsets.get(path, 0) == 0:
                stored_through = self._stored_through(path)
                self._note_reread(path)
                try:
                    end, events = snapshot_events(path)
                    # The snapshot line, like any line, is not stored again when an earlier run stored it.
                    self.facts.replaying = 0 < end <= stored_through
                    try:
                        yield from events
                    finally:
                        self.facts.replaying = False
                except OSError as exc:
                    errors += 1
                    log.debug("transcript-usage: cannot read %s: %s", path.name, exc)
                    return
                except ValueError:
                    log.debug("transcript-usage: corrupt snapshot in %s", path.name)
                if end:
                    self._offsets[path] = end
            yield from read(path)

        for path in self._changed(chat_files, cutoff, "copilot-vscode"):
            sid = path.stem
            chat_facts = self._chat_facts_for(path, sid)
            # The debug log has per-request numbers for such a session, so the
            # chat file only adds its prompts. A debug log with no request and no
            # turn leaves the session to its chat file, or it would have no row.
            debug = self._debug_logs.sessions.get(sid)
            has_debug_usage = debug is not None and bool(debug.models or debug.turns)
            named = ""
            for obj in chat_lines(path):
                chat_facts.feed(obj)
                named = chat_title(obj) or named
                if not has_debug_usage:
                    self._chat_logs.feed(sid, obj)
            if has_debug_usage:
                debug_usage = self._debug_logs.sessions.get(sid)
                if named and debug_usage is not None:
                    debug_usage.set_title(named, USER)
                    touched[sid] = debug_usage
                self._check_fact_write()
                continue
            usage = self._chat_logs.sessions.get(sid)
            if usage is not None:
                if named:
                    usage.set_title(named, USER)
                usage.project_path = usage.project_path or _workspace_folder(path.parents[1])
                usage.touch(path.stat().st_mtime)
                touched[sid] = usage
            self._check_fact_write()
            self._save_progress(touched, now, published)

        self._read_metadata()
        self._claude_facts.close_idle_agents(now - IDLE_END_S)
        self._claude_facts.drop_abandoned_calls(now - IDLE_END_S)
        self._claude_facts.flush_open_agents()
        self._add_outcomes()
        self.facts.flush(retry=False)
        self._check_fact_write()
        if self.facts.tool_calls is not None:
            self.facts.tool_calls.expire(now - PENDING_CONFIRM_MAX_AGE_S)
        self._persist(touched.values(), now, published)
        self._send_titles(renamed | self._title_retry, published)
        written = len(published)
        self.last_poll_ts = now
        self.last_poll_inserted = written
        pending = len(self.facts)
        if not pending:
            touched.clear()
            self._save_checkpoints(now)
            # Every row of this poll was handed over: the next poll may read more again.
            self._budget_scale = min(1.0, self._budget_scale * 2)
        self._index_sources(now)
        self.unavailable = self._store.unavailable
        self._status = (
            "unavailable" if self.unavailable else "degraded" if errors or pending or unreadable or unclaimed else "ok",
            "warning" if self.unavailable or errors or pending or unreadable or unclaimed else "info",
            "; ".join(filter(None, (
                self._unread_rollouts_message(unreadable, unclaimed),
                self.unavailable
                or (f"{pending} fact row(s) waiting for storage"
                if pending
                else f"{errors} transcript file(s) unreadable"
                if errors
                else f"{written} session(s) updated"),
            ))),
            {
                **({"unreadable": {"codex-cli": len(unreadable), "reason": "; ".join(sorted(set(unreadable.values())))}}
                   if unreadable else {}),
                **({"unclaimed_files": {tool: len(paths) for tool, paths in unclaimed.items()}} if unclaimed else {}),
            },
        )
        self._record_status(*self._status)
        return written

    def _record_status(self, status: str, severity: str, message: str, extra: dict) -> None:
        record_quality(
            self.quality,
            "transcript-usage",
            self.claude_projects.parent,
            status,
            severity=severity,
            message=message,
            detail={
                **extra,
                # Files of the backlog not read yet: never read, or to read again for a newer reader.
                "older_files_waiting": len(self._waiting),
                "backlog": self.backlog_status(),
                # The bytes of backlog a poll reads now: less while the store refuses rows.
                "backlog_budget_bytes": int(DEFERRED_BYTES_PER_POLL * self._budget_scale),
                "pending_fact_rows": len(self.facts),
                "session_files": dict(self.source_counts),
                "history_days": 0 if self.backfill_days >= ALL_DAYS else self.backfill_days,
            },
        )

    @staticmethod
    def _chat_files(workspace_roots: list[Path], empty_window_dirs: list[Path]) -> list[Path]:
        files = [p for root in workspace_roots for p in root.glob("*/chatSessions/*.jsonl")]
        return files + [p for folder in empty_window_dirs for p in folder.glob("*.jsonl")]

    def _title_reader(self, kind: str, root: Path) -> CopilotTitles | CodexTitles:
        key = (kind, root)
        reader = self._title_readers.get(key)
        if reader is None:
            reader = self._title_readers[key] = (
                CopilotTitles(root, root.parent / "session-store.db") if kind == "copilot" else CodexTitles(root.parent))
        return reader

    def _read_external_titles(self) -> set[str]:
        """Names that Copilot and Codex keep outside their transcripts, new or changed since the last poll."""
        changed: set[str] = set()
        for kind, default in (("copilot", self.copilot_state), ("codex", self.codex_sessions)):
            for root in self._roots(kind, default):
                try:
                    found = self._title_reader(kind, root).read()
                except Exception:  # noqa: BLE001 - a names file must not stop the usage reader
                    log.debug("transcript-usage: %s names unreadable under %s", kind, root, exc_info=True)
                    continue
                self._external_titles.update(found)
                changed.update(found)
        return changed

    def _send_titles(self, sids: set[str], published: set[str]) -> None:
        """Hand over the names of sessions whose row was not written in this poll.

        A session written in this poll carries its name already. A session with no stored
        row is tried again at the next poll.
        """
        send = getattr(self._fact_target, "titles", None)
        sids = sids - published
        if send is None or not sids:
            self._title_retry = set()
            return
        self._title_retry = send({sid: self._external_titles[sid] for sid in sids})

    def _codex_rollouts(self) -> tuple[list[Path], list[Path]]:
        """The Codex rollouts to read, and the session-like files no rule covers.

        A finished session is stored compressed under the plain name plus ``.zst``. When both
        forms exist the plain one is read: they hold the same lines, and the compressed one needs
        no library.
        """
        found: list[Path] = []
        unclaimed: list[Path] = []
        for root in self._roots("codex", self.codex_sessions):
            read, other = session_files.codex_rollouts(root)
            found += read
            unclaimed += other
        plain = {p for p in found if p.suffix != session_files.ZSTD}
        return [p for p in found if p.suffix != session_files.ZSTD or session_files.logical_path(p) not in plain], unclaimed

    @staticmethod
    def _unread_rollouts_message(unreadable: dict[Path, str], unclaimed: dict[str, list[Path]]) -> str:
        notes = []
        if unreadable:
            reasons = "; ".join(sorted(set(unreadable.values())))
            notes.append(f"{len(unreadable)} Codex rollout(s) cannot be read: {reasons}")
        names = {"claude-code": "Claude Code projects", "codex-cli": "Codex sessions", "copilot-cli": "Copilot session-state"}
        for tool, paths in sorted(unclaimed.items()):
            notes.append(f"{len(paths)} file(s) in the {names.get(tool, tool)} folder look like session files "
                         "but are not a form the reader knows")
        return "; ".join(notes)

    def _read_compressed(self, path: Path, logical: Path, no_library: dict[Path, str]) -> Iterator[dict]:
        """Yield the lines of a zstd rollout that no earlier read has delivered.

        What was delivered is counted in decompressed bytes under the rollout's plain name, so a
        session first read as ``x.jsonl`` carries on in ``x.jsonl.zst`` without a line twice or lost,
        and a compressed file that gains a frame yields only the new frame's lines. The file's own
        size is the position ``_changed`` compares. A file that holds bad data, or ends inside a
        frame, is not read again until it changes, and what came before the break stays counted.
        """
        try:
            st = path.stat()
        except OSError:
            return
        sig = (st.st_mtime_ns, st.st_size)
        bad = self._bad_zst.get(path)
        if bad is not None and bad[0] == sig:
            return
        if not zstd_stream.available():
            no_library[path] = zstd_stream.NO_LIBRARY
            return
        consumed = self._offsets.get(logical, 0)
        stream = None
        try:
            stream = zstd_stream.open_stream(path)
            if consumed and not _discard(stream, consumed):
                # Shorter than what was read before: rewritten, so read again from its start.
                stream.close()
                consumed = 0
                stream = zstd_stream.open_stream(path)
            for line in stream:
                if not line.endswith(b"\n"):
                    break  # a line still being written
                consumed += len(line)
                self._offsets[logical] = consumed
                try:
                    obj = json.loads(line)
                except ValueError:
                    continue
                if isinstance(obj, dict):
                    yield obj
        except OSError as exc:
            self._bad_zst[path] = (sig, str(exc))
            log.debug("transcript-usage: cannot read %s: %s", path.name, exc)
            return
        finally:
            if stream is not None:
                stream.close()
        self._bad_zst.pop(path, None)
        self._offsets[path] = st.st_size
        self._read_complete[path] = (*sig, self._reader_version(path))

    def _note_reread(self, path: Path) -> None:
        """A file read again for a newer reader: its session's outcome row is written again too,
        though the parts it is made of may come out as they were."""
        if path in self._offsets or path not in self._checkpoints or self._version_current(path):
            return
        tool = self._found.get(path, ("",))[0]
        if tool:
            self._book._written.pop(self._source_session(tool, path), None)

    def _reader_version(self, path: Path) -> int:
        kind = self._kinds.get(path)
        return READER_VERSIONS[kind] if kind else 0

    def _stored_through(self, path: Path) -> int:
        """The size up to which an earlier run stored this file's rows, or 0 when that is not sure.

        The saved size counts only if the file still ends, at that size, with the bytes it
        ended with then: a file that was written again is stored from its first line. So is a
        file that a lower reader version read: what it stored is not all this reader stores.
        """
        saved, tail = self._checkpoints.get(path), self._tails.get(path)
        if saved is None or not tail or not self._version_current(path):
            return 0
        try:
            with open(path, "rb") as fh:
                return saved[1] if _tail_digest(fh, saved[1]) == tail else 0
        except OSError:
            return 0

    def _save_progress(self, touched: dict[str, SessionUsage], now: float, published: set[str]) -> None:
        """Store what this poll has finished and save its read positions, at most every PROGRESS_SAVE_S.

        A position is saved only after the rows and the sessions of its file are handed to
        the store, as at the end of a poll.
        """
        if (self._checkpoint is None or not self._read_complete
                or self._clock() - self._progress_saved < PROGRESS_SAVE_S):
            return
        self._claude_facts.close_idle_agents(now - IDLE_END_S)
        self._claude_facts.drop_abandoned_calls(now - IDLE_END_S)
        self._claude_facts.flush_open_agents()
        self._add_outcomes()
        self.facts.flush(retry=False)
        if len(self.facts) or self.facts.write_error is not None:
            return
        self._persist(touched.values(), now, published)
        self._save_checkpoints(now)
        self._progress_saved = self._clock()

    def _read_metadata(self) -> None:
        """The session files that are not transcripts, each read again only when it changed."""
        readers = self._metadata
        for root in self._roots("claude", self.claude_projects):
            readers.claude_workflows(root)
        try:
            import sqlite3  # noqa: F401 - the Copilot metadata files are SQLite
        except ImportError:
            return
        for root in self._roots("copilot", self.copilot_state):
            readers.copilot_todos(root)
            readers.copilot_store(root.parent / "session-store.db")

    def _add_outcomes(self) -> None:
        for row in self._book.changed_rows():
            self.facts.add_outcome(row)

    def _check_fact_write(self) -> None:
        """End the poll when the store refused rows (a throttled or failed batch, which the buffer
        keeps). The next poll hands the kept rows over first and reads half as much backlog."""
        if self.facts.write_error is not None:
            self._budget_scale = max(MIN_BUDGET_SCALE, self._budget_scale / 2)
            raise self.facts.write_error

    def _read_rewind_index(self, index: Path, facts: CopilotFacts) -> None:
        """A Copilot session's rewind snapshots, read again only when the index file changed.

        The snapshots are written with the session's events, so the index is looked at when its
        events file changed. After a restart each index is read once more; its rows keep their keys."""
        try:
            signature = index.stat().st_mtime_ns
        except OSError:
            return
        if self._rewind_seen.get(index) == signature:
            return
        facts.read_rewind_index(index)
        self._rewind_seen[index] = signature

    def _roots(self, tool: str, default: Path) -> list[Path]:
        """The default session folder, then those of other homes found for the tool."""
        if not self._discover:
            return [default]
        from .. import tool_homes

        return [default, *(d for d in tool_homes.session_dirs(tool) if d != default)]

    def _index_sources(self, now: float) -> None:
        """Record every session file found and how far it was read.

        A file is ``complete`` when all of it is stored, ``reading`` when part of it
        is, ``waiting`` when it is in the backlog, and ``outside_window`` when
        ``history_days`` excludes it. Only rows that changed are written.
        """
        counts: dict[str, int] = {}
        rows: list[dict] = []
        for path, (tool, mtime_ns, size) in self._found.items():
            offset = self._offsets.get(path, 0)
            if (self._checkpoints.get(path) or ())[:2] == (mtime_ns, size):
                status, done = "complete", size
            elif path in self._outside_window:
                status, done = "outside_window", 0
            elif offset:
                status, done = "reading", min(offset, size)
            else:
                status, done = "waiting", 0
            counts[status] = counts.get(status, 0) + 1
            state = (mtime_ns, size, status, done)
            if self._source_index is None or self._indexed.get(path) == state:
                continue
            self._indexed[path] = state
            sid = self._source_session(tool, path)
            rows.append(dict(
                project="", source_file=str(path), session_id=sid,
                tool=self._store.surface(sid) if tool == "copilot-cli" else tool,
                size_bytes=size, mtime=mtime_ns / 1e9, bytes_read=done, status=status, indexed_at=now,
            ))
        self.source_counts = counts
        for path in self._indexed.keys() - self._found.keys():
            del self._indexed[path]
        if rows:
            self._source_index(rows)

    @staticmethod
    def _source_session(tool: str, path: Path) -> str:
        """The session a file belongs to, from where the tool puts it."""
        if path.name == "events.jsonl" or "debug-logs" in path.parts:
            return path.parent.name
        if tool == "claude-code":
            # A workflow's agents are one folder deeper: <session>/subagents/workflows/<run>/agent-x.jsonl.
            return _claude_session_id(path)
        stem = session_files.logical_path(path).stem
        if tool == "codex-cli" and (found := _CODEX_FILE_ID.search(stem)):
            # rollout-<time>-<uuid>: the session is the uuid, as the rollout's own session_meta names it
            # (a sub-agent's rollout counts under its root thread, which the file name does not give).
            return found.group(0)
        return stem

    def _vscode_dirs(self) -> tuple[list[Path], list[Path]]:
        """``workspaceStorage`` folders, then the folders of chats that had no folder open."""
        if not self._discover_vscode:
            return [self.vscode_workspaces], []
        from ..observe.sessions import chat_session_dirs

        workspaces, empty_windows = chat_session_dirs()
        return [self.vscode_workspaces, *(d for d in workspaces if d != self.vscode_workspaces)], empty_windows

    def _claude_agent(self, path: Path) -> tuple[str, dict]:
        """(agent id, ``meta.json`` fields) of a file under ``subagents/``, or empty for a main session."""
        if "subagents" not in path.parts:
            return "", {}
        return path.stem.removeprefix("agent-"), read_claude_agent_meta(path)

    def _read_late_agent_meta(self) -> None:
        """The meta files of subagents read without a spawning call: one that appears or changes
        afterwards gives the agent its fields, though its transcript has no new line."""
        for path, (sid, agent_id, sig) in list(self._meta_pending.items()):
            if not self._claude_facts.agent_is_open(sid, agent_id):
                # Let go with the agent; a meta file written later reaches its stored row at the next start.
                del self._meta_pending[path]
                continue
            now_sig = _meta_signature(path)
            if now_sig == sig:
                continue
            meta = read_claude_agent_meta(path)
            self._claude_facts.agent_meta(sid, agent_id, meta)
            if meta.get("toolUseId"):
                del self._meta_pending[path]
            else:
                self._meta_pending[path] = (sid, agent_id, now_sig)

    def scan_agent_meta(self, since: float = 0.0) -> dict[tuple[str, str], dict]:
        """(session, agent id) -> the ``meta.json`` of every Claude Code subagent, whatever the age of
        its transcript; only meta files changed at or after *since*. Reads no transcript."""
        found: dict[tuple[str, str], dict] = {}
        for root in self._roots("claude", self.claude_projects):
            # A workflow's agents keep theirs below the session's subagents/workflows/<run>/.
            for meta_path in root.glob("**/subagents/**/agent-*.meta.json"):
                if since:
                    try:
                        if meta_path.stat().st_mtime < since:
                            continue
                    except OSError:
                        continue
                transcript = meta_path.with_name(meta_path.name.removesuffix(".meta.json") + ".jsonl")
                if meta := read_claude_agent_meta(transcript):
                    found[(_claude_session_id(transcript), transcript.stem.removeprefix("agent-"))] = meta
        return found

    def _debug_facts_for(self, path: Path, sid: str) -> VSCodeDebugFacts:
        facts = self._vscode_debug_facts.get(path)
        if facts is None:
            workspace = path.parents[3]
            has_chat_file = (workspace / "chatSessions" / f"{sid}.jsonl").exists()
            facts = VSCodeDebugFacts(
                sid, path.name == "main.jsonl", self.facts, _workspace_folder(workspace), log_prompts=not has_chat_file
            )
            self._vscode_debug_facts[path] = facts
        return facts

    def _chat_facts_for(self, path: Path, sid: str) -> VSCodeChatFacts:
        facts = self._vscode_chat_facts.get(path)
        if facts is None:
            workspace = path.parents[1]
            has_debug_log = (workspace / "GitHub.copilot-chat" / "debug-logs" / sid).is_dir()
            facts = VSCodeChatFacts(sid, self.facts, _workspace_folder(workspace), has_debug_log=has_debug_log)
            self._vscode_chat_facts[path] = facts
        return facts

    def _mark_desktop_sessions(self) -> None:
        """A session's rows may predate the app's listing of it, so correct them once."""
        attribute = getattr(self._fact_target, "attribution", None)
        new = [s for s in self._store.app_types if s not in self._desktop_marked and self._store.surface(s) == "copilot-desktop"]
        if attribute is not None and new:
            attribute(new, "copilot-desktop")
            if self.facts.tool_calls is not None:
                self.facts.tool_calls.attribute(new, "copilot-desktop")
            self._desktop_marked.update(new)

    def _read_store_content(self, cutoff: float) -> set[str]:
        """The sessions, prompts, replies and shell calls ``session-store.db`` holds of the sessions that have
        no events file, in every Copilot home. Returns the sessions whose row changed."""
        changed: set[str] = set()
        listed: dict[str, StoreSession] = {}
        for root in self._roots("copilot", self.copilot_state):
            db = root.parent / "session-store.db"
            reader = self._content.get(db)
            if reader is None:
                reader = self._content[db] = CopilotStoreContent(self.facts, db)
                reader.load(self._content_saved.get(str(db)))
            changed |= reader.read(self._event_sessions, cutoff)
            listed.update(reader.sessions)
        self._db_only = {sid: info for sid, info in listed.items() if sid not in self._event_sessions}
        # Rows of a session the sessions table does not list are stored; the session has no row of its own.
        return {sid for sid in changed if sid in self._db_only or sid in self._store.sessions}

    def _store_usage(self, sid: str) -> SessionUsage | None:
        """The store's usage of *sid*; for a session with no events file, with what the store lists of it."""
        stored = self._store.sessions.get(sid)
        info = self._db_only.get(sid)
        if info is None:
            return stored
        s = stored if stored is not None else self._listed.setdefault(sid, SessionUsage(session_id=sid, tool="copilot-cli"))
        s.touch(info.created)
        s.touch(info.updated)
        s.project_path = s.project_path or info.cwd
        s.git_branch = s.git_branch or info.branch
        s.turns = max(s.turns, info.turns)
        s.tool_calls = max(s.tool_calls, info.commands)
        return s

    def _pick_copilot_source(self, sid: str) -> SessionUsage:
        """One source per session, never a sum. The store lags until its next
        checkpoint, so a live session's events may be ahead: the larger total wins.
        Tool calls are only in the events file, or for a session without one, in the store."""
        stored = self._store_usage(sid)
        events = self._copilot_finished.get(sid)
        if stored is None:
            chosen = events
        elif events is None or stored.total_tokens >= events.total_tokens:
            chosen = stored
            if events is not None:
                stored.tool_calls = events.tool_calls
                stored.turns = max(stored.turns, events.turns)
                stored.project_path = stored.project_path or events.project_path
        else:
            chosen = events
            _adopt_billing(events, stored)
        totals = self._store.app_totals.get(sid)
        if totals and (totals[0] or totals[2]):
            app = _app_session_usage(sid, totals)
            if chosen is None or app.total_tokens > chosen.total_tokens:
                if chosen is not None:
                    app.tool_calls, app.turns = chosen.tool_calls, chosen.turns
                    app.project_path = chosen.project_path
                chosen = app
        assert chosen is not None
        chosen.tool = self._store.surface(sid)
        return chosen

    def _persist(self, sessions: Iterable[SessionUsage], now: float, published: set[str] | None = None) -> int:
        written = 0
        for s in sessions:
            # A session the Copilot store lists and no events file holds has a row of its own.
            listed = s.session_id in self._db_only
            if not s.models and not s.turns and not listed:
                continue  # nothing but metadata, e.g. a summary-only file
            row = s.to_row()
            title, title_source = s.title, s.title_source
            external = self._external_titles.get(s.session_id)
            if external and outranks(title, title_source, *external):
                title, title_source = external
            fingerprint = (row, s.git_branch, title, title_source, s.resumed_from)
            if self._written.get(s.session_id) == fingerprint:
                continue
            if self._fact_target is None:
                continue
            from ..records import SessionRow

            if s.models or not listed:
                # A listed session with no usage rows in the store has no token figures: not a zero.
                self._fact_target.upsert_session_usage(row)
            idle = now - s.last_activity_at > IDLE_END_S
            # The transcript's own end record is the tool reporting the end; else the end is inferred.
            recorded = bool(s.recorded_end_at) and s.recorded_end_at >= s.last_activity_at
            ended = s.recorded_end_at if recorded else s.last_activity_at if idle and s.last_activity_at else None
            self._fact_target.upsert_session(
                SessionRow(
                    session_id=s.session_id,
                    tool=s.tool,
                    project_path=s.project_path,
                    model=s.model,
                    git_branch=s.git_branch,
                    started_at=s.started_at,
                    ended_at=ended,
                    last_activity_at=s.last_activity_at,
                    end_reason=("transcript" if recorded else "idle") if ended is not None else "",
                    source=COPILOT_STORE_SOURCE if listed else "transcript",
                    input_tokens=s.input_tokens,
                    output_tokens=s.output_tokens,
                    cache_read_tokens=s.cache_read_tokens,
                    cache_creation_tokens=s.cache_creation_tokens,
                    cost_usd=s.cost_usd or 0.0,
                    request_count=s.request_count,
                    tool_call_count=s.tool_calls,
                    title=title,
                    title_source=title_source,
                    resumed_from=s.resumed_from,
                )
            )
            self._written[s.session_id] = fingerprint
            if published is not None:
                published.add(s.session_id)
            written += 1
        return written

    def source_exists(self) -> bool:
        return any(
            p.is_dir()
            for p in (self.claude_projects, self.codex_sessions, self.copilot_state, *(d for ds in self._vscode_dirs() for d in ds))
        )
