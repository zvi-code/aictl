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

``~/.codex/sessions/**/rollout-*.jsonl``
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

import json
import logging
import os
import re
import sqlite3
import time
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from .. import platforms
from ..data.model_pricing import is_billable_model, request_cost_usd
from ..data.provenance import COPILOT_COST_REASON
from ..storage import AgentRow, RequestRow, SessionRow, is_lock_error
from ._common import coerce_ts, decode_file_uri, open_readonly, project_root, record_quality, writer_conn
from .call_facts import (
    ClaudeFacts,
    CopilotFacts,
    FactBuffer,
    VSCodeChatFacts,
    VSCodeDebugFacts,
    copilot_call_key,
    copilot_model,
    list_price,
    read_claude_agent_role,
)
from .vscode_chat_logs import default_log_dir as vscode_chat_default_log_dir
from .vscode_chat_logs import snapshot_events

log = logging.getLogger(__name__)

POLL_INTERVAL_S = 60.0
# A Claude transcript line's first "type" is the record's own for every record read
# here (a message's inner type comes after it). These records are a third of an active
# transcript's bytes and no reader uses them, so they are not parsed.
_TYPE_RE = re.compile(rb'"type":"([a-z_-]+)"')
_HEAD_BYTES = 600
_UNREAD_TYPES = frozenset({b"api-request-blob", b"api-request-shape", b"queued_command", b"prompt_snapshot"})
# On a restart, files idle this long before the previous run's last poll are not read again.
RESTART_GRACE_S = 3600.0
# Windows can report the size a file had when another process opened it, and a
# Copilot CLI session keeps its events file open while it lives. A file this recent
# that looks unchanged is measured through its own handle.
HELD_FILE_RECHECK_S = 2 * 86400
BACKFILL_DAYS = 30
# A session idle this long gets ended_at = its last activity; a transcript has
# no explicit end event, and an open row would show as live forever.
IDLE_END_S = 900.0
# A permission prompt older than this is shown as abandoned, not as waiting.
PENDING_CONFIRM_MAX_AGE_S = 6 * 3600.0


def local_day(ts: float) -> str:
    """The machine's local calendar day for *ts*, which is what "today" means on a dashboard."""
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")


@dataclass
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


@dataclass
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
    project_path: str = ""
    git_branch: str = ""
    premium_requests: float = 0.0
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
    ) -> None:
        """Add one request's disjoint classes; negative values correct a prior add.

        *cache_write* includes *cache_write_1h*, which only selects the rate.
        *cost_delta* replaces pricing these tokens, for a correction whose
        tokens alone do not show the request's prompt-length tier.
        """
        m = self.models.setdefault(model or "unknown", ModelUsage())
        m.requests += requests
        m.input_tokens += input_tokens
        m.output_tokens += output_tokens
        m.cache_read_tokens += cache_read
        m.cache_creation_tokens += cache_write
        tokens = input_tokens + output_tokens + cache_read + cache_write
        cost = cost_delta
        if cost is None:
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

    Shared across all files of a poll so a replayed message counts once.
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

    def feed(self, sid: str, obj: dict) -> None:
        kind = obj.get("type")
        if kind not in ("assistant", "user"):
            return
        s = self.session(sid)
        ts = coerce_ts(obj.get("timestamp"))
        s.touch(ts)
        if not s.project_path and obj.get("cwd"):
            s.project_path = project_root(str(obj["cwd"]))
        if obj.get("gitBranch"):
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
    """``…/<session>/subagents/agent-x.jsonl`` belongs to ``<session>``."""
    parts = path.parts
    if "subagents" in parts:
        return parts[parts.index("subagents") - 1]
    return path.stem


def iter_claude_files(projects_dir: Path) -> Iterable[Path]:
    return projects_dir.glob("**/*.jsonl")


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
    _CALL_COLUMNS = ("agent_id", "duration_ms", "time_to_first_token_ms", "output_ttft_ms", "finish_reason")

    def __init__(self, copilot_home: Path, facts: FactBuffer | None = None) -> None:
        self.facts = facts
        self._occurrence: dict[tuple[str, tuple[int, int, int, int]], int] = {}
        self._cwd: dict[str, str] = {}
        self._agents_seen: set[str] = set()
        self.store_path = copilot_home / "session-store.db"
        self.data_path = copilot_home / "data.db"
        self.sessions: dict[str, SessionUsage] = {}
        self.app_types: dict[str, str] = {}
        self.app_totals: dict[str, tuple] = {}
        self._last_id = 0
        self._data_sig: tuple[float, int] | None = None

    def surface(self, session_id: str) -> str:
        kind = self.app_types.get(session_id)
        return "copilot-desktop" if kind and kind != "cli_session" else "copilot-cli"

    def read(self) -> set[str]:
        """Add new rows and return the ids of sessions that changed."""
        touched: set[str] = set()
        self._read_app_sessions(touched)
        conn = open_readonly(self.store_path, "transcript-usage")
        if conn is None:
            return touched
        try:
            present = {r[1] for r in conn.execute("PRAGMA table_info(assistant_usage_events)")}
            extra = ", ".join(c if c in present else f"NULL AS {c}" for c in self._CALL_COLUMNS)
            rows = conn.execute(
                "SELECT id, session_id, model, input_tokens, output_tokens, cache_read_tokens,"
                f" cache_write_tokens, total_nano_aiu, created_at, {extra}"
                " FROM assistant_usage_events WHERE id > ? ORDER BY id",
                (self._last_id,),
            )
            for row_id, sid, model, inp, out, read, write, nano, created, *call in rows:
                self._last_id = row_id
                s = self.sessions.setdefault(sid, SessionUsage(session_id=sid, tool="copilot-cli"))
                ts = coerce_ts(created)
                s.touch(ts)
                read_i, write_i = _i(read), _i(write)
                self._add_call_fact(conn, sid, model, (_i(inp), _i(out), read_i, write_i), ts, call)
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
            if touched:
                self._read_session_details(conn, touched)
        except sqlite3.Error as exc:
            log.debug("transcript-usage: store read failed, retrying next poll: %s", exc)
        finally:
            conn.close()
        return touched

    def _add_call_fact(self, conn: sqlite3.Connection, sid: str, model: Any, tokens: tuple, ts: float, call: list) -> None:
        """One row per call. The key matches the events file's, so a call in both stays one row."""
        if self.facts is None:
            return
        if not self._cwd:
            self._cwd = {str(i): str(c or "") for i, c in conn.execute("SELECT id, cwd FROM sessions")}
        occurrence = self._occurrence.get((sid, tokens), 0)
        self._occurrence[(sid, tokens)] = occurrence + 1
        agent_id, duration, ttft, output_ttft, finish = call
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
            )
        )
        if agent_id and agent_id not in self._agents_seen:
            self._agents_seen.add(agent_id)
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
    try:
        return any(path.parent.glob("inuse.*.lock"))
    except OSError:
        return False


class TranscriptUsageIngester:
    """Tails the three transcript stores and writes one row per session.

    State is in memory: after a restart the whole window is re-read, which is
    safe because rows are absolute totals rather than increments. Nothing under
    the tools' own directories is ever written.
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
    ) -> None:
        self.store = our_store
        self.claude_projects = claude_projects or platforms.claude_projects_dir()
        self.codex_sessions = codex_sessions or platforms.codex_global_dir() / "sessions"
        self.copilot_state = copilot_state or platforms.copilot_session_dir()
        # With its default folders, the reader also follows the homes found on this machine.
        self._discover = not (claude_projects or codex_sessions or copilot_state)
        self.vscode_workspaces = vscode_workspaces or vscode_chat_default_log_dir()
        self.facts = FactBuffer(our_store, time.time() - backfill_days * 86400)
        self._store = CopilotStoreReader(self.copilot_state.parent, self.facts)
        self.facts.surface = self._store.surface
        self._claude_facts = ClaudeFacts(self.facts)
        self._vscode_debug_facts: dict[Path, VSCodeDebugFacts] = {}
        self._vscode_chat_facts: dict[Path, VSCodeChatFacts] = {}
        self._desktop_marked: set[str] = set()
        self._debug_logs = VSCodeDebugLogAccumulator()
        self._chat_logs = VSCodeChatSessionAccumulator()
        self._copilot_finished: dict[str, SessionUsage] = {}
        self.backfill_days = backfill_days
        self.last_poll_ts = 0.0
        self.last_poll_inserted = 0
        self._claude = ClaudeAccumulator()
        self._codex_sessions: dict[str, SessionUsage] = {}
        self._codex: dict[Path, CodexAccumulator] = {}
        self._copilot: dict[Path, CopilotAccumulator] = {}
        self._offsets: dict[Path, int] = {}
        self._written: dict[str, tuple] = {}
        # A file idle since before the last run of the previous daemon was read then, and
        # its rows are in the store: the first poll of this run skips it. A file written
        # since is read whole, so a session that spans the restart keeps its full totals.
        self._idle_before = 0.0
        self._first_poll = True
        self._last_run_ts = self._load_last_run()

    _LAST_RUN_KEY = "transcript_usage:last_run_ts"

    def _load_last_run(self) -> float:
        try:
            row = (
                writer_conn(self.store)
                .execute("SELECT value FROM maintenance_state WHERE key = ?", (self._LAST_RUN_KEY,))
                .fetchone()
            )
            return float(row[0]) if row and row[0] else 0.0
        except Exception:  # noqa: BLE001 - a store without the table reads everything, as before
            return 0.0

    def _save_last_run(self, ts: float) -> None:
        try:
            conn = writer_conn(self.store)
            conn.execute("INSERT OR REPLACE INTO maintenance_state(key, value) VALUES(?,?)", (self._LAST_RUN_KEY, str(ts)))
            conn.commit()
        except Exception as exc:  # noqa: BLE001 - the next poll saves again
            log.debug("transcript-usage: last run not saved (%s)", exc)

    def _changed(self, paths: Iterable[Path], cutoff: float) -> list[Path]:
        found: list[tuple[float, Path]] = []
        now = time.time()
        for p in paths:
            try:
                st = p.stat()
            except OSError:
                continue
            if p not in self._offsets and (st.st_mtime < cutoff or st.st_mtime < self._idle_before):
                continue
            size = _current_size(p, st.st_size, st.st_mtime, self._offsets.get(p, 0), now)
            if size < self._offsets.get(p, 0):
                # Truncated or rewritten: its lines were already counted, so
                # re-reading from 0 is the only way to see new ones, and the
                # global request key keeps Claude's replay from double counting.
                self._offsets[p] = 0
            if size > self._offsets.get(p, 0):
                found.append((st.st_mtime, p))
        # Oldest first, so a replayed message stays on the session that made it.
        return [p for _, p in sorted(found, key=lambda x: x[0])]

    def poll(self) -> int:
        """Read what is new and persist changed sessions. Returns rows written."""
        now = time.time()
        cutoff = now - self.backfill_days * 86400
        touched: dict[str, SessionUsage] = {}
        errors = 0
        self.facts.cutoff = cutoff
        self._idle_before = (self._last_run_ts - RESTART_GRACE_S) if self._first_poll and self._last_run_ts else 0.0
        app_ids: set[str] = set()
        self._store.refresh_app_sessions(app_ids)
        self._mark_desktop_sessions()

        def read(path: Path) -> Iterator[dict]:
            """Yield parsed lines after the file's offset, one at a time: holding
            a whole transcript in memory cost 570 MB on the first poll. A
            half-written last line stays unread until it ends with a newline."""
            nonlocal errors
            offset = self._offsets.get(path, 0)
            try:
                with open(path, "rb") as fh:
                    fh.seek(offset)
                    for line in fh:
                        if not line.endswith(b"\n"):
                            break
                        offset += len(line)
                        self._offsets[path] = offset
                        head = _TYPE_RE.search(line, 0, _HEAD_BYTES)
                        if head is not None and head.group(1) in _UNREAD_TYPES:
                            continue
                        try:
                            obj = json.loads(line)
                        except ValueError:
                            continue
                        if isinstance(obj, dict):
                            yield obj
            except OSError as exc:
                errors += 1
                log.debug("transcript-usage: cannot read %s: %s", path.name, exc)

        claude_files = [p for root in self._roots("claude", self.claude_projects) for p in iter_claude_files(root)]
        for path in self._changed(claude_files, cutoff):
            sid = _claude_session_id(path)
            agent_id, role = self._claude_agent(path)
            for obj in read(path):
                self._claude.feed(sid, obj)
                self._claude_facts.feed(sid, obj, agent_id=agent_id, role=role)
            if sid in self._claude.sessions:
                touched[sid] = self._claude.sessions[sid]

        codex_files = [p for root in self._roots("codex", self.codex_sessions) for p in root.glob("**/*.jsonl")]
        for path in self._changed(codex_files, cutoff):
            acc = self._codex.setdefault(path, CodexAccumulator(self._codex_sessions, path.stem))
            for obj in read(path):
                acc.feed(obj)
            sid = acc.sid or acc.fallback_id
            if sid in self._codex_sessions:
                touched[sid] = self._codex_sessions[sid]

        copilot_ids: set[str] = set()
        copilot_files = [p for root in self._roots("copilot", self.copilot_state) for p in root.glob("*/events.jsonl")]
        for path in self._changed(copilot_files, cutoff):
            sid = path.parent.name
            cop = self._copilot.setdefault(path, CopilotAccumulator(sid, facts=CopilotFacts(sid, self.facts)))
            if self._offsets.get(path, 0) == 0 and cop.facts is not None:
                cop.facts.reset()
            for obj in read(path):
                cop.feed(obj)
            if cop.facts is not None:
                cop.facts.finish_poll(now, PENDING_CONFIRM_MAX_AGE_S)
            # Shutdown metrics are added by finish(), which must therefore run
            # once per accumulator: a shutdown-only file starts over each time.
            if not cop.has_records and cop.shutdowns:
                self._copilot.pop(path, None)
                self._offsets.pop(path, None)
            self._copilot_finished[sid] = cop.finish()
            copilot_ids.add(sid)

        copilot_ids |= self._store.read() | app_ids
        for sid in copilot_ids:
            touched[sid] = self._pick_copilot_source(sid)

        debug_ids: set[str] = set()
        for path in self._changed(self.vscode_workspaces.glob("*/GitHub.copilot-chat/debug-logs/*/*.jsonl"), cutoff):
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
        def chat_lines(path: Path) -> Iterator[dict]:
            """A chat file's snapshot one request at a time, then its patch lines."""
            nonlocal errors
            if self._offsets.get(path, 0) == 0:
                try:
                    end, events = snapshot_events(path)
                    yield from events
                except OSError as exc:
                    errors += 1
                    log.debug("transcript-usage: cannot read %s: %s", path.name, exc)
                    return
                except ValueError:
                    log.debug("transcript-usage: corrupt snapshot in %s", path.name)
                if end:
                    self._offsets[path] = end
            yield from read(path)

        for path in self._changed(self.vscode_workspaces.glob("*/chatSessions/*.jsonl"), cutoff):
            sid = path.stem
            chat_facts = self._chat_facts_for(path, sid)
            # The debug log has per-request numbers for such a session, so the
            # chat file only adds its prompts.
            has_debug_usage = sid in self._debug_logs.sessions
            for obj in chat_lines(path):
                chat_facts.feed(obj)
                if not has_debug_usage:
                    self._chat_logs.feed(sid, obj)
            if has_debug_usage:
                continue
            usage = self._chat_logs.sessions.get(sid)
            if usage is not None:
                usage.project_path = usage.project_path or _workspace_folder(path.parents[1])
                usage.touch(path.stat().st_mtime)
                touched[sid] = usage

        self._claude_facts.close_idle_agents(now - IDLE_END_S)
        self._claude_facts.drop_abandoned_calls(now - IDLE_END_S)
        self._claude_facts.flush_open_agents()
        self.facts.flush()
        clear_stale = getattr(self.store, "clear_stale_pending_confirms", None)
        if clear_stale is not None:
            clear_stale(now - PENDING_CONFIRM_MAX_AGE_S)
        written = self._persist(touched.values(), now)
        self.last_poll_ts = now
        self.last_poll_inserted = written
        self._first_poll = False
        self._idle_before = 0.0
        self._save_last_run(now)
        record_quality(
            self.store,
            "transcript-usage",
            self.claude_projects.parent,
            "degraded" if errors else "ok",
            severity="warning" if errors else "info",
            message=f"{errors} transcript file(s) unreadable" if errors else f"{written} session(s) updated",
        )
        return written

    def _roots(self, tool: str, default: Path) -> list[Path]:
        """The default session folder, then those of other homes found for the tool."""
        if not self._discover:
            return [default]
        from .. import tool_homes

        return [default, *(d for d in tool_homes.session_dirs(tool) if d != default)]

    def _claude_agent(self, path: Path) -> tuple[str, str]:
        """(agent id, role) of a file under ``subagents/``, or empty for a main session."""
        if "subagents" not in path.parts:
            return "", ""
        return path.stem.removeprefix("agent-"), read_claude_agent_role(path)

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
        setter = getattr(self.store, "set_sessions_tool", None)
        new = [s for s in self._store.app_types if s not in self._desktop_marked and self._store.surface(s) == "copilot-desktop"]
        if setter is not None and new:
            try:
                setter(new, "copilot-desktop")
            except sqlite3.OperationalError as exc:
                if not is_lock_error(exc):
                    raise
                # Not marked: the next poll tries again.
                log.debug("Copilot desktop sessions not marked yet, store busy: %s", exc)
                return
            self._desktop_marked.update(new)

    def _pick_copilot_source(self, sid: str) -> SessionUsage:
        """One source per session, never a sum. The store lags until its next
        checkpoint, so a live session's events may be ahead: the larger total wins.
        Tool calls are only in the events file."""
        stored = self._store.sessions.get(sid)
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

    def _persist(self, sessions: Iterable[SessionUsage], now: float) -> int:
        written = 0
        for s in sessions:
            if not s.models and not s.turns:
                continue  # nothing but metadata, e.g. a summary-only file
            row = s.to_row()
            fingerprint = (row["tool"], row["billing_amount"], row["input_tokens"], row["output_tokens"], row["cache_read_tokens"], row["cache_creation_tokens"], row["turn_count"], row["tool_call_count"], row["last_activity_at"])
            if self._written.get(s.session_id) == fingerprint:
                continue
            self._written[s.session_id] = fingerprint
            self.store.upsert_session_usage(row)
            idle = now - s.last_activity_at > IDLE_END_S
            self.store.upsert_session(
                SessionRow(
                    session_id=s.session_id,
                    tool=s.tool,
                    project_path=s.project_path,
                    model=s.model,
                    git_branch=s.git_branch,
                    started_at=s.started_at,
                    ended_at=s.last_activity_at if idle and s.last_activity_at else None,
                    source="transcript",
                    input_tokens=s.input_tokens,
                    output_tokens=s.output_tokens,
                    cache_read_tokens=s.cache_read_tokens,
                    cache_creation_tokens=s.cache_creation_tokens,
                    cost_usd=s.cost_usd or 0.0,
                    request_count=s.request_count,
                    tool_call_count=s.tool_calls,
                )
            )
            written += 1
        return written

    def source_exists(self) -> bool:
        return any(
            p.is_dir() for p in (self.claude_projects, self.codex_sessions, self.copilot_state, self.vscode_workspaces)
        )
