# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Shared record types and helpers for collected observations."""

from __future__ import annotations

import fnmatch
import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .data.provenance import SOURCE_RANK
from .data.provenance import row_provenance as row_provenance
from .data.provenance import usage_provenance as usage_provenance


class SystemSnapshotRow:
    """One global system snapshot row (was MetricsRow).

    Accepts both new field names (cpu_percent, memory_used_mb) and
    old field names (cpu, mem_mb) for backward compatibility.
    """

    __slots__ = (
        "ts",
        "cpu_percent",
        "cpu_per_core",
        "memory_used_mb",
        "memory_total_mb",
        "active_sessions",
        "active_processes",
        "ai_token_rate",
        "files",
        "tokens",
        "mcp",
        "mem_tokens",
        "memory_entries",
        "live_sessions",
        "live_tokens",
        "live_in_rate",
        "live_out_rate",
    )

    def __init__(
        self,
        ts: float,
        cpu_percent: float = 0.0,
        cpu_per_core: list[float] | None = None,
        memory_used_mb: float = 0.0,
        memory_total_mb: float = 0.0,
        active_sessions: int = 0,
        active_processes: int = 0,
        ai_token_rate: float = 0.0,
        files: int = 0,
        tokens: int = 0,
        mcp: int = 0,
        mem_tokens: int = 0,
        memory_entries: int = 0,
        live_sessions: int = 0,
        live_tokens: int = 0,
        live_in_rate: float = 0.0,
        live_out_rate: float = 0.0,
        # Backward compat aliases:
        cpu: float | None = None,
        mem_mb: float | None = None,
    ) -> None:
        self.ts = ts
        self.cpu_percent = cpu if cpu is not None else cpu_percent
        self.cpu_per_core = cpu_per_core or []
        self.memory_used_mb = mem_mb if mem_mb is not None else memory_used_mb
        self.memory_total_mb = memory_total_mb
        self.active_sessions = active_sessions
        self.active_processes = active_processes
        self.ai_token_rate = ai_token_rate
        self.files = files
        self.tokens = tokens
        self.mcp = mcp
        self.mem_tokens = mem_tokens
        self.memory_entries = memory_entries
        self.live_sessions = live_sessions
        self.live_tokens = live_tokens
        self.live_in_rate = live_in_rate
        self.live_out_rate = live_out_rate


# Backward compat alias
MetricsRow = SystemSnapshotRow


@dataclass(slots=True)
class ProcessSnapshotRow:
    """One per-process snapshot row (was ToolMetricsRow)."""

    ts: float
    pid: int = 0
    tool: str = ""
    cpu_percent: float = 0.0
    memory_rss_mb: float = 0.0
    memory_vms_mb: float = 0.0
    open_files: int = 0
    threads: int = 0


@dataclass(slots=True)
class ToolMetricsRow:
    """Backward compat: old per-tool snapshot row.

    Translates to ProcessSnapshotRow internally.
    """

    ts: float
    tool: str
    cpu: float = 0.0
    mem_mb: float = 0.0
    tokens: int = 0
    traffic: float = 0.0
    model: str = ""


@dataclass(slots=True)
class EventRow:
    """One event log entry."""

    ts: float
    tool: str
    kind: str
    detail: dict[str, Any] = field(default_factory=dict)
    session_id: str = ""
    pid: int = 0


@dataclass(slots=True)
class HookCallRow:
    """One hook call, as the hook wrapper reported it (table ``hook_calls``).

    ``payload`` is the tool's own payload. ``command`` and ``output`` belong to a
    wrapped hook (``wrapped`` = 1) and, like ``payload``, are text: they are kept
    only with capture ``full``.
    """

    call_id: str
    ts: float
    received_at: float
    format_version: int = 0
    tool: str = ""
    event: str = ""
    hook_event_name: str = ""
    source: str = ""
    session_id: str = ""
    agent_id: str = ""
    project_path: str = ""
    pid: int = 0
    hook_pid: int = 0
    hook_ppid: int = 0
    tool_name: str = ""
    tool_use_id: str = ""
    permission_mode: str = ""
    payload_bytes: int = 0
    truncated: int = 0
    payload: dict[str, Any] = field(default_factory=dict)
    wrapped: int = 0
    command_hash: str = ""
    command: str = ""
    exit_code: int | None = None
    duration_ms: float = 0.0
    overhead_ms: float = 0.0
    stdout_bytes: int = 0
    stderr_bytes: int = 0
    decision: str = ""
    output: str = ""


@dataclass(slots=True)
class ToolStatsRow:
    """Per-tool stats snapshot (from OTel / stats-cache / events.jsonl)."""

    ts: float
    tool: str
    source: str = ""
    confidence: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0
    total_sessions: int = 0
    total_messages: int = 0
    cost_usd: float = 0.0
    model: str = ""
    by_model: dict[str, Any] = field(default_factory=dict)
    by_project: dict[str, Any] = field(default_factory=dict)


# Backward compat alias
TelemetryRow = ToolStatsRow


@dataclass(slots=True)
class Metric:
    """One universal metric sample (Prometheus-style)."""

    ts: float
    metric: str  # dotted name: 'cpu.core.3', 'proc.71416.cpu'
    value: float
    tags: dict[str, Any] = field(default_factory=dict)


# Backward compat alias
Sample = Metric


@dataclass(slots=True)
class FileEntry:
    """A tracked file in the KV store."""

    path: str
    tool: str
    category: str = ""
    scope: str = ""
    content: str = ""
    blob_hash: str = ""
    content_hash: str = ""
    size_bytes: int = 0
    tokens: int = 0
    lines: int = 0
    mtime: float = 0.0
    first_seen: float = 0.0
    last_read: float = 0.0
    last_changed: float = 0.0
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class SessionRow:
    """A session record."""

    session_id: str
    tool: str = ""
    pid: int = 0
    project_path: str = ""
    model: str = ""
    git_branch: str = ""
    git_commit: str = ""
    started_at: float = 0.0
    ended_at: float | None = None
    source: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0
    cost_usd: float = 0.0
    request_count: int = 0
    tool_call_count: int = 0
    files_modified: int = 0
    # The session's name, one line of at most 120 characters, and who gave it:
    # "user" (named or renamed by the user), "tool" (made by the tool), "prompt" (from prompt text).
    title: str = ""
    title_source: str = ""


@dataclass(slots=True)
class RequestRow:
    """One LLM request record.

    ``ts`` is the time the request happened. Writers must set it from the
    source data's own timestamp whenever the source embeds one (OTel
    timeUnixNano, JSONL turn timestamps) and may only fall back to the
    ingest/reporting time when the source carries none — every query path
    reads ``ts``, so an ingest-time stamp dates backfilled requests to
    daemon start.
    ``source_ts`` is the timestamp embedded in the *source data itself* (e.g.
    OTel timeUnixNano converted to epoch seconds).  It is used for dedup:
      - If source_ts > 0: dedup key = hash(session_id + source_ts_ms + model + source)
      - If source_ts == 0 (no embedded ts): dedup key = hash(session_id + model
        + input_tokens + output_tokens + source) — i.e. value-based only.
    """

    ts: float
    session_id: str = ""
    agent_id: str = ""
    tool: str = ""
    project_path: str = ""
    pid: int = 0
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0
    cost_usd: float = 0.0
    duration_ms: float = 0.0
    finish_reason: str = ""
    is_error: int = 0
    error_type: str = ""
    http_status: int = 0
    source: str = ""
    prompt_id: str = ""
    source_ts: float = 0.0  # embedded timestamp from source data (0 = absent)
    ttft_ms: float = 0.0
    dedup_key: str = ""  # set by a writer whose source names the call; otherwise computed at flush
    # None means the source did not report the value.
    tool_tokens: int | None = None
    max_prompt_tokens: int | None = None
    request_bytes: int | None = None
    available_tools: int | None = None


@dataclass(slots=True)
class ToolInvocationRow:
    """One tool invocation record.

    ``source_ts`` follows the same convention as RequestRow: the timestamp
    embedded in the source event payload (e.g. OTel timeUnixNano or hook
    event timestamp).  0 means no embedded timestamp was present.

    ``source_event_id`` is the source's own identifier for the invocation
    (e.g. the ``tool_use_id`` carried by Claude Code hooks).  When present
    it anchors the dedup key, so identical repeated invocations (the same
    ``Bash("git status")`` run twice) persist as separate rows while a
    retried delivery of the same event stays deduplicated.
    """

    ts: float
    session_id: str = ""
    request_id: int = 0
    tool: str = ""
    tool_name: str = ""
    project_path: str = ""
    pid: int = 0
    is_error: int = 0
    duration_ms: float = 0.0
    input: dict[str, Any] = field(default_factory=dict)
    result_summary: str = ""
    source: str = ""
    source_ts: float = 0.0  # embedded timestamp from source data (0 = absent)
    source_event_id: str = ""  # source-side invocation id, e.g. hook tool_use_id
    agent_id: str = ""  # subagent id, '' for the main agent
    confirm: str = ""  # '', 'auto', 'approved', 'denied' or 'pending'
    confirm_wait_ms: float = 0.0
    target: str = ""  # short display text: command, file path or query
    exit_code: int | None = None
    dedup_key: str = ""
    input_bytes: int | None = None  # size of the arguments the agent sent, as UTF-8 text
    output_bytes: int | None = None  # size of the result the agent got back, as UTF-8 text


@dataclass(slots=True)
class SessionPromptRow:
    """One prompt given to an agent. ``agent_id`` '' is a person's prompt to the main agent."""

    dedup_key: str
    ts: float
    session_id: str
    tool: str = ""
    project_path: str = ""
    agent_id: str = ""
    text: str = ""
    prompt_file: str = ""


@dataclass(slots=True)
class SkillUseRow:
    """One use of a skill."""

    dedup_key: str
    ts: float
    session_id: str
    name: str
    tool: str = ""
    project_path: str = ""
    agent_id: str = ""
    trigger: str = ""


@dataclass(slots=True)
class LoadedFileRow:
    """A file a session loaded, as its own record shows: how, and when first seen."""

    session_id: str
    path: str
    how: str  # instructions | nested_memory | skill | custom_agent | system_prompt
    ts: float = 0.0
    detail: str = ""
    tool: str = ""
    agent_id: str = ""
    project_path: str = ""


@dataclass(slots=True)
class ContextItemRow:
    """One item a tool put in a session's context, as last recorded (see m036)."""

    session_id: str
    kind: str  # memory_file | skills | mcp_instructions | custom_agents | tools_listed | instruction_file | system_prompt_other | reset
    name: str
    ts: float = 0.0
    agent_id: str = ""
    path: str = ""
    chars: int = 0
    tokens: int = 0
    estimated: int = 1
    removed: int = 0
    tool: str = ""
    project_path: str = ""


@dataclass(slots=True)
class FileWriteRow:
    """One write-like file event attributed to an agent/session."""

    ts: float
    path: str
    session_id: str = ""
    tool: str = ""
    tool_name: str = ""
    operation: str = ""
    project_path: str = ""
    pid: int = 0
    source_event_kind: str = ""
    source_event_id: str = ""
    content_hash: str = ""
    size_bytes: int = 0
    detail: dict[str, Any] = field(default_factory=dict)
    dedup_key: str = ""


@dataclass(slots=True)
class DataQualityRow:
    """Current health of one data source, collector, ingester, or sink."""

    component: str
    status: str
    source: str = ""
    kind: str = ""
    severity: str = ""
    message: str = ""
    updated_at: float = 0.0
    last_ok_at: float = 0.0
    count: int = 1
    detail: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ProcessRow:
    """One process record."""

    pid: int
    tool: str = ""
    project_path: str = ""
    cwd: str = ""
    cmdline: str = ""
    ppid: int = 0
    started_at: float = 0.0
    ended_at: float | None = None
    exit_code: int | None = None
    source: str = ""
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class AgentRow:
    """One agent record."""

    agent_id: str
    session_id: str = ""
    tool: str = ""
    task: str = ""
    model: str = ""
    is_sidechain: int = 0
    started_at: float = 0.0
    ended_at: float | None = None
    completed: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0
    cost_usd: float = 0.0


@dataclass(slots=True)
class ContextEventRow:
    """A compaction, or a split of the context by kind, as a tool's session file records it.

    None means that the tool did not report the value.
    """

    dedup_key: str
    ts: float
    session_id: str
    kind: str  # compaction | split
    agent_id: str = ""
    tool: str = ""
    trigger: str = ""
    before_tokens: int | None = None
    after_tokens: int | None = None
    duration_ms: float | None = None
    current_tokens: int | None = None
    system_tokens: int | None = None
    conversation_tokens: int | None = None
    tool_tokens: int | None = None


@dataclass(slots=True)
class SessionStepRow:
    """Source event, not an additional billable call. Only explicit relationships are populated."""

    step_key: str
    ts: float
    session_id: str
    kind: str
    tool: str = ""
    project_path: str = ""
    agent_id: str = ""
    parent_agent_id: str = ""
    turn_id: str = ""
    round_id: str = ""
    message_id: str = ""
    request_id: str = ""
    tool_call_id: str = ""
    trace_id: str = ""
    span_id: str = ""
    parent_span_id: str = ""
    source: str = ""
    source_order: int | None = None
    role: str = ""
    name: str = ""
    phase: str = ""
    text: str = ""
    text_status: str = ""
    context_tokens: int | None = None
    context_limit: int | None = None
    before_tokens: int | None = None
    after_tokens: int | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    estimated: int | None = None
    exit_code: int | None = None
    system_tokens: int | None = None
    conversation_tokens: int | None = None
    tool_tokens: int | None = None


_STEP_FIELDS = tuple(k for k in SessionStepRow.__dataclass_fields__ if k != "text")
STEP_TEXT_LIMIT = 32768


@dataclass(slots=True)
class TurnRequestLink:
    """Source attribution of an existing request. Never a second cost observation."""

    request_key: str
    ts: float
    session_id: str
    agent_id: str = ""
    turn_id: str = ""
    root_session_id: str = ""
    root_turn_id: str = ""
    basis: str = ""
    tool: str = "copilot-cli"
    project_path: str = ""


@dataclass(slots=True)
class CallFacts:
    """Rows read from a tool's own session files, written in one transaction."""

    requests: list[RequestRow] = field(default_factory=list)
    tools: list[ToolInvocationRow] = field(default_factory=list)
    prompts: list[SessionPromptRow] = field(default_factory=list)
    skills: list[SkillUseRow] = field(default_factory=list)
    agents: list[AgentRow] = field(default_factory=list)
    file_writes: list[FileWriteRow] = field(default_factory=list)
    context_events: list[ContextEventRow] = field(default_factory=list)
    loaded_files: list[LoadedFileRow] = field(default_factory=list)
    context_items: list[ContextItemRow] = field(default_factory=list)
    steps: list[SessionStepRow] = field(default_factory=list)
    cost_links: list[TurnRequestLink] = field(default_factory=list)

    def __len__(self) -> int:
        return (
            len(self.steps) + len(self.cost_links) + len(self.context_items)
            + len(self.loaded_files)
            + len(self.context_events)
            + len(self.requests)
            + len(self.tools)
            + len(self.prompts)
            + len(self.skills)
            + len(self.agents)
            + len(self.file_writes)
        )


LARGE_FILE_THRESHOLD = 100_000  # bytes; files larger than this use blob storage
# Files larger than this are tracked metadata-only (no content/blob).
# mtime IS stored for them, so they are intentionally not re-read on
# every sync pass.
FILE_SYNC_MAX_CONTENT_BYTES = 512 * 1024
# Basename patterns (case-insensitive fnmatch) whose content is never
# stored — metadata only. The DB is local, but content rows outlive the
# file (30d file_history retention) and /api/files serves them; secrets
# don't belong in history.
SENSITIVE_FILE_PATTERNS = (
    ".env*",  # .env, .env.local, .env.production, ...
    "*credentials*",  # credentials.json, aws_credentials, ...
    "*secret*",  # secrets.yaml, client_secret.json, ...
    "*.pem",  # certificates / private keys
    "*.key",  # private keys
    "id_rsa*",  # SSH private keys
    "id_ed25519*",  # SSH private keys
    "*token*",  # token stores (accepts false positives like token_usage.json)
)


def _is_sensitive_path(path: str) -> bool:
    """True if the file's basename matches a sensitive pattern."""
    basename = Path(path).name.lower()
    return any(fnmatch.fnmatch(basename, pat) for pat in SENSITIVE_FILE_PATTERNS)


# Backward compat: old code references METRICS_KEYS for sparkline fields
METRICS_KEYS = [
    "ts",
    "files",
    "tokens",
    "cpu",
    "mem_mb",
    "mcp",
    "mem_tokens",
    "memory_entries",
    "live_sessions",
    "live_tokens",
    "live_in_rate",
    "live_out_rate",
]


def _dedup_key(*parts: str) -> str:
    """Compute a 16-char hex dedup key from string parts."""
    combined = "".join(parts)
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()[:16]


def _session_pid(session_or_id) -> str | None:
    """Return the PID string from a session dict (prefers structured ``pid`` field)
    or from a composite 'tool:pid:ts' session_id string."""
    if isinstance(session_or_id, dict):
        pid = session_or_id.get("pid", 0)
        if pid:
            return str(pid)
        session_or_id = session_or_id.get("session_id", "")
    parts = session_or_id.split(":")
    if len(parts) == 3 and parts[1].isdigit() and parts[2].isdigit():
        return parts[1]
    return None


_UUID_RE = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")


def _session_uuid(session_or_id) -> str | None:
    """Return the stable UUID component of a session id, if any.

    Hook/JSONL/OTel sources identify a session by the tool's own UUID
    while the correlator synthesizes ``tool:pid:started`` ids.  Rows
    whose ids share a UUID are the same logical session regardless of
    the surrounding id format.
    """
    if isinstance(session_or_id, dict):
        session_or_id = session_or_id.get("session_id", "") or ""
    m = _UUID_RE.search(session_or_id or "")
    return m.group(0).lower() if m else None


_TOKEN_PROFILE_KEYS = ("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens")
_USAGE_PROFILE_KEYS = (
    *_TOKEN_PROFILE_KEYS,
    "cost_usd",
    "tokens_source",
    "tokens_quality",
    "tokens_reason",
    "cost_source",
    "cost_quality",
    "cost_reason",
    "unpriced_models",
    "billing_unit",
    "billing_amount",
    "premium_requests",
    "estimated_list_usd",
)


def _merge_session_stats(primary: dict, secondary: dict) -> None:
    """Add secondary's file/activity stats into primary in-place.

    Token counts are combined with ``max`` — duplicate rows for one
    logical session are the *same* tokens counted from different
    vantage points (hooks, JSONL, OTel), so summing would double-count.
    """
    primary["files_modified"] += secondary["files_modified"]
    primary["unique_files"] += secondary["unique_files"]
    primary["bytes_written"] += secondary["bytes_written"]
    primary["source_files"] += secondary["source_files"]
    primary["conversations"] = max(primary["conversations"], secondary["conversations"])
    primary["subagents"] = max(primary["subagents"], secondary["subagents"])
    p_rank = SOURCE_RANK.get(primary.get("tokens_source", ""), 0)
    s_rank = SOURCE_RANK.get(secondary.get("tokens_source", ""), 0)
    if s_rank > p_rank:
        # A better source describes the same tokens: take its numbers whole,
        # because a max per field could mix two sources into a figure neither saw.
        for key in _USAGE_PROFILE_KEYS:
            if key in secondary:
                primary[key] = secondary[key]
    elif s_rank == p_rank:
        for token_key in _TOKEN_PROFILE_KEYS:
            if token_key in primary or token_key in secondary:
                primary[token_key] = max(primary.get(token_key, 0) or 0, secondary.get(token_key, 0) or 0)
    if not primary.get("project_path") and secondary.get("project_path"):
        primary["project_path"] = secondary["project_path"]
    bucket_map: dict[int, int] = {b: c for b, c in primary["activity"]}
    for b, c in secondary["activity"]:
        bucket_map[b] = bucket_map.get(b, 0) + c
    primary["activity"] = sorted(bucket_map.items())


CAPTURE_FULL = "full"
CAPTURE_METADATA = "metadata"
CAPTURE_OFF = "off"

# event.detail keys that carry text or payloads. Numeric keys such as
# input_tokens are different keys and stay, so token totals are not affected.
_EVENT_TEXT_KEYS = frozenset(
    {
        "prompt",
        "user_prompt",
        "system_prompt",
        "prompt.text",
        "gen_ai.prompt",
        "gen_ai.completion",
        "gen_ai.input.messages",
        "gen_ai.output.messages",
        "response",
        "completion",
        "content",
        "text",
        "message",
        "messages",
        "body",
        "input",
        "output",
        "tool_input",
        "tool_output",
        "tool_parameters",
        "tool_response",
        "tool_result",
        "arguments",
        "result",
        "result_summary",
        "command",
        "full_command",
        "new_string",
        "old_string",
    }
)
_EVENT_TEXT_MAX_CHARS = 256


def strip_event_text(detail: Any) -> Any:
    """Remove text and payloads from an event detail; keep numbers, names, sizes."""
    if not isinstance(detail, dict):
        return detail
    out: dict[str, Any] = {}
    for key, value in detail.items():
        if key in _EVENT_TEXT_KEYS:
            if isinstance(value, str):
                out[f"{key}_chars"] = len(value)
            continue
        if isinstance(value, dict):
            out[key] = strip_event_text(value)
        elif isinstance(value, str) and len(value) > _EVENT_TEXT_MAX_CHARS:
            out[f"{key}_chars"] = len(value)
        else:
            out[key] = value
    return out
