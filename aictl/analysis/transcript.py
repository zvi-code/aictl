# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Structured session transcript — the canonical view of a coding session.

A ``SessionTranscript`` is an ordered sequence of ``Turn`` objects, each
containing the user prompt, the AI's actions (tool uses, API calls, file
edits), and token/cost accounting.  The transcript is built incrementally
by :class:`~aictl.analysis.analyzer.SessionAnalyzer` as events arrive.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class ActionKind(str, Enum):
    """Kinds of actions an AI tool can take within a turn."""
    TOOL_USE = "tool_use"
    API_CALL = "api_call"
    API_RESPONSE = "api_response"
    FILE_EDIT = "file_edit"
    COMPACTION = "compaction"
    SUBAGENT = "subagent"
    ERROR = "error"


@dataclass(slots=True)
class Action:
    """A single discrete action within a turn."""

    ts: float
    kind: ActionKind
    name: str = ""                  # tool name, model, agent ID
    input_summary: str = ""         # first 200 chars of input/args
    output_summary: str = ""        # first 200 chars of result
    duration_ms: float = 0.0
    tokens_in: int = 0
    tokens_out: int = 0
    cache_read: int = 0
    cache_creation: int = 0
    success: bool | None = None     # None = unknown
    detail: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = {
            "ts": self.ts,
            "kind": self.kind.value,
            "name": self.name,
            "duration_ms": self.duration_ms,
        }
        if self.input_summary:
            d["input_summary"] = self.input_summary
        if self.output_summary:
            d["output_summary"] = self.output_summary
        if self.tokens_in or self.tokens_out:
            d["tokens"] = {
                "input": self.tokens_in,
                "output": self.tokens_out,
                "cache_read": self.cache_read,
                "cache_creation": self.cache_creation,
            }
        if self.success is not None:
            d["success"] = self.success
        if self.detail:
            d["detail"] = self.detail
        return d


@dataclass(slots=True)
class Turn:
    """One conversation turn: user prompt → AI actions → next prompt."""

    ts: float
    end_ts: float = 0.0
    prompt: str = ""                # full user prompt
    prompt_preview: str = ""        # first 200 chars
    actions: list[Action] = field(default_factory=list)
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0
    cost_usd: float = 0.0
    api_calls: int = 0
    duration_ms: float = 0.0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens

    @property
    def tool_uses(self) -> list[Action]:
        return [a for a in self.actions if a.kind == ActionKind.TOOL_USE]

    def add_action(self, action: Action) -> None:
        self.actions.append(action)
        if action.ts > self.end_ts:
            self.end_ts = action.ts
        # Accumulate API tokens at turn level
        if action.kind == ActionKind.API_CALL:
            self.input_tokens += action.tokens_in
            self.output_tokens += action.tokens_out
            self.cache_read_tokens += action.cache_read
            self.cache_creation_tokens += action.cache_creation
            self.api_calls += 1
            self.duration_ms += action.duration_ms
            if action.name and not self.model:
                self.model = action.name

    def to_dict(self) -> dict:
        wall_ms = round((self.end_ts - self.ts) * 1000) if self.end_ts > self.ts else self.duration_ms
        return {
            "ts": self.ts,
            "end_ts": self.end_ts,
            "prompt": self.prompt,
            "prompt_preview": self.prompt_preview,
            "model": self.model,
            "tokens": {
                "input": self.input_tokens,
                "output": self.output_tokens,
                "cache_read": self.cache_read_tokens,
                "cache_creation": self.cache_creation_tokens,
                "total": self.total_tokens,
            },
            "cost_usd": self.cost_usd,
            "api_calls": self.api_calls,
            "duration_ms": self.duration_ms,
            "wall_ms": wall_ms,
            "actions": [a.to_dict() for a in self.actions],
            "tool_use_count": len(self.tool_uses),
        }


@dataclass(slots=True)
class TranscriptSummary:
    """Aggregate stats for a session transcript."""

    total_turns: int = 0
    total_api_calls: int = 0
    total_tool_uses: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cache_tokens: int = 0
    compactions: int = 0
    errors: int = 0
    subagents: int = 0
    duration_s: float = 0.0
    source: str = ""       # "hooks", "otel", "mixed"
    event_count: int = 0

    @property
    def total_tokens(self) -> int:
        return self.total_input_tokens + self.total_output_tokens

    def to_dict(self) -> dict:
        return {
            "total_turns": self.total_turns,
            "total_api_calls": self.total_api_calls,
            "total_tool_uses": self.total_tool_uses,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "total_cache_tokens": self.total_cache_tokens,
            "total_tokens": self.total_tokens,
            "avg_tokens_per_call": (
                round(self.total_tokens / self.total_api_calls)
                if self.total_api_calls else 0
            ),
            "compactions": self.compactions,
            "errors": self.errors,
            "subagents": self.subagents,
            "duration_s": round(self.duration_s, 1),
            "source": self.source,
            "event_count": self.event_count,
        }


@dataclass
class SessionTranscript:
    """Complete transcript of a coding session."""

    session_id: str
    tool: str = ""
    project: str = ""
    workspace: str = ""
    model: str = ""
    started_at: float = 0.0
    ended_at: float | None = None
    is_live: bool = True
    last_updated: float = 0.0
    source_ids: list[str] = field(default_factory=list)
    pids: set[int] = field(default_factory=set)
    turns: list[Turn] = field(default_factory=list)
    # Non-turn events (session_start, session_end, compaction, etc.)
    lifecycle_events: list[dict] = field(default_factory=list)

    @property
    def current_turn(self) -> Turn | None:
        return self.turns[-1] if self.turns else None

    def start_turn(self, ts: float, prompt: str = "") -> Turn:
        """Begin a new conversation turn."""
        turn = Turn(
            ts=ts,
            end_ts=ts,
            prompt=prompt,
            prompt_preview=prompt[:200] if prompt else "",
        )
        self.turns.append(turn)
        self.last_updated = ts
        return turn

    def add_lifecycle_event(self, event: dict) -> None:
        self.lifecycle_events.append(event)

    def build_summary(self) -> TranscriptSummary:
        """Compute aggregate stats from turns."""
        total_tool_uses = sum(len(t.tool_uses) for t in self.turns)
        total_input = sum(t.input_tokens for t in self.turns)
        total_output = sum(t.output_tokens for t in self.turns)
        total_cache = sum(t.cache_read_tokens for t in self.turns)
        total_api = sum(t.api_calls for t in self.turns)
        compactions = sum(
            1 for e in self.lifecycle_events if e.get("type") == "compaction"
        )
        errors = sum(
            1 for t in self.turns
            for a in t.actions if a.kind == ActionKind.ERROR
        )
        subagents = sum(
            1 for t in self.turns
            for a in t.actions if a.kind == ActionKind.SUBAGENT
        )
        first_ts = self.turns[0].ts if self.turns else self.started_at
        last_ts = (
            max(t.end_ts for t in self.turns)
            if self.turns else (self.ended_at or self.started_at)
        )
        # Determine source
        has_prompts = any(t.prompt for t in self.turns)
        sources = set()
        for e in self.lifecycle_events:
            s = e.get("source", "")
            if s:
                sources.add(s)
        source = "hooks" if has_prompts else ("otel" if "otel" in sources else "mixed")

        return TranscriptSummary(
            total_turns=len(self.turns),
            total_api_calls=total_api,
            total_tool_uses=total_tool_uses,
            total_input_tokens=total_input,
            total_output_tokens=total_output,
            total_cache_tokens=total_cache,
            compactions=compactions,
            errors=errors,
            subagents=subagents,
            duration_s=last_ts - first_ts if first_ts else 0,
            source=source,
            event_count=sum(len(t.actions) for t in self.turns)
                        + len(self.lifecycle_events),
        )

    def to_dict(self) -> dict:
        summary = self.build_summary()
        return {
            "session_id": self.session_id,
            "tool": self.tool,
            "project": self.project,
            "workspace": self.workspace,
            "model": self.model,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "is_live": self.is_live,
            "last_updated": self.last_updated,
            "source_ids": list(self.source_ids),
            "pids": sorted(self.pids),
            "turns": [t.to_dict() for t in self.turns],
            "lifecycle_events": self.lifecycle_events,
            "summary": summary.to_dict(),
        }
