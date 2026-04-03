# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""SQLite persistence for time-series metrics and event log.

Default location: ``~/.config/aictl/history.db`` (configurable via
``[storage] db_path`` in config.toml or ``--db`` CLI flag).

Design goals:
  * Zero external deps (stdlib sqlite3 only)
  * Write-behind batching — memory list flushed every N seconds
  * Auto-compaction — full res 24h → 1-min avg 7d → 5-min avg 30d → delete
  * Thread-safe — one writer thread, concurrent readers OK (WAL mode)
"""

from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .platforms import config_dir

log = logging.getLogger(__name__)

# ─── Defaults ──────────────────────────────────────────────────────

DEFAULT_DB_PATH = config_dir() / "history.db"
FLUSH_INTERVAL = 10.0  # seconds between batch writes
SCHEMA_VERSION = 21  # bump when adding migrations
LARGE_FILE_THRESHOLD = 100_000  # bytes; files larger than this use blob storage

# Retention thresholds (seconds)
_1H = 3_600
_24H = 86_400
_7D = 7 * _24H
_30D = 30 * _24H

# Old tables to drop when migrating from v12 to v20
_OLD_TABLES_TO_DROP = (
    "metrics", "tool_metrics", "tool_telemetry",
    "samples", "file_store", "path_specs", "process_specs",
)

# ─── Schema ────────────────────────────────────────────────────────

_SCHEMA_SQL = """\
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
);

-- ═══ Registry ═══

CREATE TABLE IF NOT EXISTS tools (
    tool TEXT PRIMARY KEY, vendor TEXT DEFAULT '', host TEXT DEFAULT '',
    display_name TEXT DEFAULT '', first_seen_at REAL DEFAULT 0, last_seen_at REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS projects (
    path TEXT PRIMARY KEY, name TEXT DEFAULT '', git_remote TEXT DEFAULT '',
    git_branch TEXT DEFAULT '', first_seen_at REAL DEFAULT 0, last_seen_at REAL DEFAULT 0
);

-- ═══ Process lifecycle ═══

CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, pid INTEGER NOT NULL, tool TEXT DEFAULT '',
    project_path TEXT DEFAULT '', cwd TEXT DEFAULT '', cmdline TEXT DEFAULT '',
    ppid INTEGER DEFAULT 0, started_at REAL DEFAULT 0, ended_at REAL,
    exit_code INTEGER, source TEXT DEFAULT '', meta TEXT DEFAULT '{}',
    UNIQUE(pid, started_at)
);
CREATE TABLE IF NOT EXISTS process_snapshots (
    ts REAL NOT NULL, pid INTEGER NOT NULL, tool TEXT DEFAULT '',
    cpu_percent REAL DEFAULT 0, memory_rss_mb REAL DEFAULT 0,
    memory_vms_mb REAL DEFAULT 0, open_files INTEGER DEFAULT 0,
    threads INTEGER DEFAULT 0,
    PRIMARY KEY (ts, pid)
);
CREATE TABLE IF NOT EXISTS system_snapshots (
    ts REAL PRIMARY KEY, cpu_percent REAL DEFAULT 0, cpu_per_core TEXT DEFAULT '[]',
    memory_used_mb REAL DEFAULT 0, memory_total_mb REAL DEFAULT 0,
    active_sessions INTEGER DEFAULT 0, active_processes INTEGER DEFAULT 0,
    ai_token_rate REAL DEFAULT 0,
    -- sparkline compat fields:
    files INTEGER DEFAULT 0, tokens INTEGER DEFAULT 0, mcp INTEGER DEFAULT 0,
    mem_tokens INTEGER DEFAULT 0, memory_entries INTEGER DEFAULT 0,
    live_sessions INTEGER DEFAULT 0, live_tokens INTEGER DEFAULT 0,
    live_in_rate REAL DEFAULT 0, live_out_rate REAL DEFAULT 0
);

-- ═══ Session lifecycle ═══

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY, tool TEXT DEFAULT '', pid INTEGER DEFAULT 0,
    project_path TEXT DEFAULT '', model TEXT DEFAULT '',
    git_branch TEXT DEFAULT '', git_commit TEXT DEFAULT '',
    started_at REAL DEFAULT 0, ended_at REAL, source TEXT DEFAULT '',
    input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0, cache_creation_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0, request_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0, files_modified INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS session_processes (
    session_id TEXT NOT NULL, pid INTEGER NOT NULL, tool TEXT DEFAULT '',
    joined_at REAL DEFAULT 0, role TEXT DEFAULT 'subprocess',
    PRIMARY KEY (session_id, pid)
);
CREATE TABLE IF NOT EXISTS agents (
    agent_id TEXT PRIMARY KEY, session_id TEXT DEFAULT '', tool TEXT DEFAULT '',
    task TEXT DEFAULT '', model TEXT DEFAULT '', is_sidechain INTEGER DEFAULT 0,
    started_at REAL DEFAULT 0, ended_at REAL, completed INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0, cache_creation_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0
);

-- ═══ LLM requests (core fact tables) ═══

CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '',
    ts REAL NOT NULL, session_id TEXT DEFAULT '', agent_id TEXT DEFAULT '',
    tool TEXT DEFAULT '', project_path TEXT DEFAULT '', pid INTEGER DEFAULT 0,
    model TEXT DEFAULT '', input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0, cache_read_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0,
    duration_ms REAL DEFAULT 0, finish_reason TEXT DEFAULT '',
    is_error INTEGER DEFAULT 0, error_type TEXT DEFAULT '',
    http_status INTEGER DEFAULT 0, source TEXT DEFAULT '', prompt_id TEXT DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_dedup ON requests(dedup_key) WHERE dedup_key != '';

CREATE TABLE IF NOT EXISTS tool_invocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '',
    ts REAL NOT NULL, session_id TEXT DEFAULT '', request_id INTEGER DEFAULT 0,
    tool TEXT DEFAULT '', tool_name TEXT DEFAULT '', project_path TEXT DEFAULT '',
    pid INTEGER DEFAULT 0, is_error INTEGER DEFAULT 0, duration_ms REAL DEFAULT 0,
    input TEXT DEFAULT '{}', result_summary TEXT DEFAULT '', source TEXT DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_inv_dedup ON tool_invocations(dedup_key) WHERE dedup_key != '';

-- ═══ File tracking ═══

CREATE TABLE IF NOT EXISTS file_blobs (
    hash TEXT PRIMARY KEY, content TEXT NOT NULL,
    size_bytes INTEGER DEFAULT 0, created_at REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY, tool TEXT DEFAULT '', category TEXT DEFAULT '',
    scope TEXT DEFAULT '', content TEXT DEFAULT '', blob_hash TEXT DEFAULT '',
    content_hash TEXT DEFAULT '', size_bytes INTEGER DEFAULT 0,
    tokens INTEGER DEFAULT 0, lines INTEGER DEFAULT 0, mtime REAL DEFAULT 0,
    first_seen REAL DEFAULT 0, last_read REAL DEFAULT 0,
    last_changed REAL DEFAULT 0, meta TEXT DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS file_history (
    path TEXT NOT NULL, ts REAL NOT NULL, content TEXT DEFAULT '',
    blob_hash TEXT DEFAULT '', content_hash TEXT DEFAULT '',
    size_bytes INTEGER DEFAULT 0, tokens INTEGER DEFAULT 0, lines INTEGER DEFAULT 0,
    PRIMARY KEY (path, ts)
);

-- ═══ Configuration & environment ═══

CREATE TABLE IF NOT EXISTS tool_config (
    ts REAL NOT NULL, tool TEXT NOT NULL, project_path TEXT DEFAULT '',
    key TEXT NOT NULL, value TEXT DEFAULT '', source TEXT DEFAULT '',
    PRIMARY KEY (ts, tool, project_path, key)
);
CREATE TABLE IF NOT EXISTS environment_vars (
    ts REAL NOT NULL, project_path TEXT NOT NULL, tool TEXT DEFAULT '',
    key TEXT NOT NULL, value TEXT DEFAULT '', is_secret INTEGER DEFAULT 0,
    source TEXT DEFAULT '',
    PRIMARY KEY (ts, project_path, tool, key)
);

-- ═══ Tool stats (from external sources) ═══

CREATE TABLE IF NOT EXISTS tool_stats (
    ts REAL NOT NULL, tool TEXT NOT NULL, source TEXT DEFAULT '',
    confidence REAL DEFAULT 0, input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0, cache_read_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0, total_sessions INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0,
    model TEXT DEFAULT '', by_model TEXT DEFAULT '{}', by_project TEXT DEFAULT '{}',
    PRIMARY KEY (ts, tool)
);

-- ═══ Catch-alls ═══

CREATE TABLE IF NOT EXISTS events (
    ts REAL NOT NULL, tool TEXT NOT NULL, kind TEXT NOT NULL,
    session_id TEXT DEFAULT '', pid INTEGER DEFAULT 0,
    project_path TEXT DEFAULT '', detail TEXT DEFAULT '{}',
    seq INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ts, tool, kind, seq)
);
CREATE TABLE IF NOT EXISTS metrics (
    ts REAL NOT NULL, metric TEXT NOT NULL, value REAL NOT NULL,
    tool TEXT DEFAULT '', project_path TEXT DEFAULT '',
    session_id TEXT DEFAULT '', tags TEXT DEFAULT '{}',
    seq INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ts, metric, seq)
);

-- ═══ Spec registry (renamed) ═══

CREATE TABLE IF NOT EXISTS path_defs (
    path_template   TEXT NOT NULL,
    ai_tool         TEXT NOT NULL,
    vendor          TEXT DEFAULT '',
    host            TEXT DEFAULT '',
    platform        TEXT DEFAULT 'all',
    hidden          INTEGER DEFAULT 0,
    scope           TEXT DEFAULT '',
    category        TEXT DEFAULT '',
    sent_to_llm     TEXT DEFAULT '',
    approx_tokens   TEXT DEFAULT '0',
    read_write      TEXT DEFAULT '',
    survives_compaction TEXT DEFAULT '',
    cacheable       TEXT DEFAULT '',
    loaded_when     TEXT DEFAULT '',
    path_args       TEXT DEFAULT '',
    description     TEXT DEFAULT '',
    resolution      TEXT DEFAULT 'literal',
    root_strategy   TEXT DEFAULT '',
    PRIMARY KEY (path_template, ai_tool)
);
CREATE TABLE IF NOT EXISTS process_defs (
    process_name    TEXT NOT NULL,
    ai_tool         TEXT NOT NULL,
    vendor          TEXT DEFAULT '',
    host            TEXT DEFAULT '',
    process_type    TEXT DEFAULT '',
    runtime         TEXT DEFAULT '',
    parent_process  TEXT DEFAULT '',
    starts_at       TEXT DEFAULT '',
    stops_at        TEXT DEFAULT '',
    is_daemon       INTEGER DEFAULT 0,
    auto_start      INTEGER DEFAULT 0,
    listens_port    TEXT DEFAULT '',
    outbound_targets TEXT DEFAULT '',
    memory_idle_mb  TEXT DEFAULT '',
    memory_active_mb TEXT DEFAULT '',
    known_leak      INTEGER DEFAULT 0,
    leak_pattern    TEXT DEFAULT '',
    zombie_risk     TEXT DEFAULT 'none',
    cleanup_command  TEXT DEFAULT '',
    ps_grep_pattern TEXT DEFAULT '',
    platform        TEXT DEFAULT 'all',
    description     TEXT DEFAULT '',
    PRIMARY KEY (process_name, ai_tool)
);

-- ═══ Indexes ═══

-- processes
CREATE INDEX IF NOT EXISTS idx_processes_tool ON processes(tool, started_at);
CREATE INDEX IF NOT EXISTS idx_processes_pid ON processes(pid, started_at);
-- process_snapshots
CREATE INDEX IF NOT EXISTS idx_proc_snapshots_pid ON process_snapshots(pid, ts);
CREATE INDEX IF NOT EXISTS idx_proc_snapshots_tool ON process_snapshots(tool, ts);
-- sessions
CREATE INDEX IF NOT EXISTS idx_sessions_tool ON sessions(tool, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_path, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(ended_at, tool);
-- session_processes
CREATE INDEX IF NOT EXISTS idx_session_procs_session ON session_processes(session_id);
-- agents
CREATE INDEX IF NOT EXISTS idx_agents_session ON agents(session_id);
-- requests
CREATE INDEX IF NOT EXISTS idx_requests_session ON requests(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_requests_tool ON requests(tool, ts);
CREATE INDEX IF NOT EXISTS idx_requests_ts ON requests(ts);
CREATE INDEX IF NOT EXISTS idx_requests_prompt ON requests(prompt_id, ts);
-- tool_invocations
CREATE INDEX IF NOT EXISTS idx_tool_inv_session ON tool_invocations(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_tool_inv_name ON tool_invocations(tool_name, ts);
CREATE INDEX IF NOT EXISTS idx_tool_inv_ts ON tool_invocations(ts);
-- files
CREATE INDEX IF NOT EXISTS idx_files_tool ON files(tool);
CREATE INDEX IF NOT EXISTS idx_file_history_path ON file_history(path, ts);
-- tool_config
CREATE INDEX IF NOT EXISTS idx_tool_config_tool ON tool_config(tool, ts);
-- environment_vars
CREATE INDEX IF NOT EXISTS idx_env_vars_project ON environment_vars(project_path, ts);
-- tool_stats
CREATE INDEX IF NOT EXISTS idx_tool_stats_tool ON tool_stats(tool, ts);
-- events
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_tool ON events(tool, ts);
CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind, ts);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, ts);
-- metrics
CREATE INDEX IF NOT EXISTS idx_metrics_metric ON metrics(metric, ts);
CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics(ts);
CREATE INDEX IF NOT EXISTS idx_metrics_session ON metrics(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_metrics_tool ON metrics(tool, ts);
-- spec tables
CREATE INDEX IF NOT EXISTS idx_path_defs_tool ON path_defs(ai_tool);
CREATE INDEX IF NOT EXISTS idx_process_defs_tool ON process_defs(ai_tool);

-- ═══ UI Schema: data-driven dashboard layout (unchanged) ═══

CREATE TABLE IF NOT EXISTS ui_dashboard (
    id          INTEGER PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    created_at  REAL NOT NULL DEFAULT (strftime('%%s','now')),
    updated_at  REAL NOT NULL DEFAULT (strftime('%%s','now'))
);

CREATE TABLE IF NOT EXISTS ui_section (
    id            INTEGER PRIMARY KEY,
    dashboard_id  INTEGER NOT NULL REFERENCES ui_dashboard(id),
    tab_id        INTEGER REFERENCES ui_tab(id),
    key           TEXT NOT NULL,
    title         TEXT,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    visible       INTEGER NOT NULL DEFAULT 1,
    collapsed     INTEGER NOT NULL DEFAULT 0,
    columns       INTEGER,
    UNIQUE(dashboard_id, key)
);

CREATE TABLE IF NOT EXISTS ui_widget (
    id           INTEGER PRIMARY KEY,
    section_id   INTEGER NOT NULL REFERENCES ui_section(id),
    key          TEXT NOT NULL,
    kind         TEXT NOT NULL,
    title        TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    col_span     INTEGER NOT NULL DEFAULT 1,
    row_span     INTEGER NOT NULL DEFAULT 1,
    visible      INTEGER NOT NULL DEFAULT 1,
    config       TEXT DEFAULT '{}',
    UNIQUE(section_id, key)
);

CREATE TABLE IF NOT EXISTS ui_tab (
    id            INTEGER PRIMARY KEY,
    dashboard_id  INTEGER NOT NULL REFERENCES ui_dashboard(id),
    key           TEXT NOT NULL,
    title         TEXT NOT NULL,
    shortcut      TEXT,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    visible       INTEGER NOT NULL DEFAULT 1,
    icon          TEXT,
    UNIQUE(dashboard_id, key)
);

CREATE TABLE IF NOT EXISTS ui_group_by_option (
    id           INTEGER PRIMARY KEY,
    tab_id       INTEGER NOT NULL REFERENCES ui_tab(id),
    key          TEXT NOT NULL,
    label        TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    is_default   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(tab_id, key)
);

CREATE TABLE IF NOT EXISTS ui_datasource (
    id          INTEGER PRIMARY KEY,
    key         TEXT NOT NULL UNIQUE,
    kind        TEXT NOT NULL,
    endpoint    TEXT,
    poll_ms     INTEGER,
    config      TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ui_widget_datasource (
    widget_id     INTEGER NOT NULL REFERENCES ui_widget(id),
    datasource_id INTEGER NOT NULL REFERENCES ui_datasource(id),
    role          TEXT NOT NULL DEFAULT 'primary',
    PRIMARY KEY (widget_id, datasource_id, role)
);

CREATE TABLE IF NOT EXISTS ui_preference (
    id           INTEGER PRIMARY KEY,
    dashboard_id INTEGER NOT NULL REFERENCES ui_dashboard(id),
    user_id      TEXT,
    pref_key     TEXT NOT NULL,
    pref_value   TEXT NOT NULL,
    UNIQUE(dashboard_id, user_id, pref_key)
);

CREATE TABLE IF NOT EXISTS ui_theme (
    id     INTEGER PRIMARY KEY,
    key    TEXT NOT NULL UNIQUE,
    tokens TEXT NOT NULL DEFAULT '{}'
);

-- Datapoint catalog: explains every metric shown in the dashboard.
CREATE TABLE IF NOT EXISTS datapoint_catalog (
    key             TEXT PRIMARY KEY,
    label           TEXT NOT NULL DEFAULT '',
    tab             TEXT NOT NULL DEFAULT '',
    section         TEXT NOT NULL DEFAULT '',
    explanation     TEXT NOT NULL DEFAULT '',
    source_static   TEXT NOT NULL DEFAULT '',
    source_type     TEXT NOT NULL DEFAULT 'raw',
    unit            TEXT NOT NULL DEFAULT '',
    update_freq     TEXT NOT NULL DEFAULT '',
    otel_metric     TEXT NOT NULL DEFAULT '',
    dynamic_source  INTEGER NOT NULL DEFAULT 0,
    source_dynamic  TEXT NOT NULL DEFAULT '{}',
    query           TEXT NOT NULL DEFAULT '',
    calc            TEXT NOT NULL DEFAULT '',
    updated_at      REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_datapoint_catalog_tab ON datapoint_catalog(tab);
"""


# ─── Data types ────────────────────────────────────────────────────

class SystemSnapshotRow:
    """One global system snapshot row (was MetricsRow).

    Accepts both new field names (cpu_percent, memory_used_mb) and
    old field names (cpu, mem_mb) for backward compatibility.
    """
    __slots__ = (
        "ts", "cpu_percent", "cpu_per_core", "memory_used_mb",
        "memory_total_mb", "active_sessions", "active_processes",
        "ai_token_rate", "files", "tokens", "mcp", "mem_tokens",
        "memory_entries", "live_sessions", "live_tokens",
        "live_in_rate", "live_out_rate",
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
    metric: str     # dotted name: 'cpu.core.3', 'proc.71416.cpu'
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


@dataclass(slots=True)
class RequestRow:
    """One LLM request record.

    ``ts`` is the wall-clock time we stored this row (reporting time).
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
    source_ts: float = 0.0   # embedded timestamp from source data (0 = absent)


@dataclass(slots=True)
class ToolInvocationRow:
    """One tool invocation record.

    ``source_ts`` follows the same convention as RequestRow: the timestamp
    embedded in the source event payload (e.g. OTel timeUnixNano or hook
    event timestamp).  0 means no embedded timestamp was present.
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
    source_ts: float = 0.0   # embedded timestamp from source data (0 = absent)


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


# ─── Tool stats SQL helpers ───────────────────────────────────────

def _tool_stats_row(r: tuple) -> ToolStatsRow:
    return ToolStatsRow(
        ts=r[0], tool=r[1], source=r[2], confidence=r[3],
        input_tokens=r[4], output_tokens=r[5],
        cache_read_tokens=r[6], cache_creation_tokens=r[7],
        total_sessions=r[8], total_messages=r[9],
        cost_usd=r[10], model=r[11],
        by_model=_json(r[12]),
        by_project=_json(r[13]) if len(r) > 13 else {},
    )


def _tool_stats_tuple(r: ToolStatsRow) -> tuple:
    return (r.ts, r.tool, r.source, round(r.confidence, 2),
            r.input_tokens, r.output_tokens,
            r.cache_read_tokens, r.cache_creation_tokens,
            r.total_sessions, r.total_messages,
            round(r.cost_usd, 4), r.model,
            json.dumps(r.by_model), json.dumps(r.by_project))


# Backward compat aliases for old function names
_telemetry_row = _tool_stats_row
_telemetry_tuple = _tool_stats_tuple

_TOOL_STATS_SELECT = (
    "SELECT ts, tool, source, confidence, input_tokens, output_tokens,"
    " cache_read_tokens, cache_creation_tokens,"
    " total_sessions, total_messages, cost_usd, model, by_model, by_project"
    " FROM tool_stats"
)

_TOOL_STATS_INSERT = (
    "INSERT OR REPLACE INTO tool_stats"
    "(ts, tool, source, confidence, input_tokens, output_tokens,"
    " cache_read_tokens, cache_creation_tokens,"
    " total_sessions, total_messages, cost_usd, model, by_model, by_project)"
    " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
)

# Backward compat aliases
_TELEMETRY_SELECT = _TOOL_STATS_SELECT
_TELEMETRY_INSERT = _TOOL_STATS_INSERT

# System snapshot keys (for column-major output)
SYSTEM_SNAPSHOT_KEYS = [
    "ts", "cpu_percent", "cpu_per_core",
    "memory_used_mb", "memory_total_mb",
    "active_sessions", "active_processes", "ai_token_rate",
    "files", "tokens", "mcp", "mem_tokens", "memory_entries",
    "live_sessions", "live_tokens", "live_in_rate", "live_out_rate",
]

# Backward compat: old code references METRICS_KEYS for sparkline fields
METRICS_KEYS = [
    "ts", "files", "tokens", "cpu", "mem_mb", "mcp",
    "mem_tokens", "memory_entries", "live_sessions",
    "live_tokens", "live_in_rate", "live_out_rate",
]
_METRICS_KEYS = METRICS_KEYS  # backward-compat alias


# ─── Helpers ──────────────────────────────────────────────────────

def _content_hash(content: str) -> str:
    """SHA-256 hex digest of content string."""
    return hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()[:16]


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


def _merge_session_stats(primary: dict, secondary: dict) -> None:
    """Add secondary's file/activity stats into primary in-place."""
    primary["files_modified"] += secondary["files_modified"]
    primary["unique_files"] += secondary["unique_files"]
    primary["bytes_written"] += secondary["bytes_written"]
    primary["source_files"] += secondary["source_files"]
    primary["conversations"] = max(primary["conversations"], secondary["conversations"])
    primary["subagents"] = max(primary["subagents"], secondary["subagents"])
    bucket_map: dict[int, int] = {b: c for b, c in primary["activity"]}
    for b, c in secondary["activity"]:
        bucket_map[b] = bucket_map.get(b, 0) + c
    primary["activity"] = sorted(bucket_map.items())


def _estimate_tokens(content: str) -> int:
    """Rough token estimate: ~4 chars per token."""
    return max(1, len(content) // 4) if content else 0


def _parse_session_id(sid: str) -> tuple[int, float]:
    """Parse 'tool:pid:epoch' -> (pid, epoch).  Returns (0, 0.0) on failure."""
    if not sid or ":" not in sid:
        return 0, 0.0
    parts = sid.split(":")
    if len(parts) < 3:
        return 0, 0.0
    try:
        return int(parts[1]), float(parts[2])
    except (ValueError, IndexError):
        return 0, 0.0


def _event_row_tuple(e: EventRow) -> tuple:
    """Convert an EventRow to a tuple for INSERT into events table."""
    d = e.detail if isinstance(e.detail, dict) else {}
    # Prefer first-class fields; fall back to detail dict for backward compat
    sid = e.session_id or d.get("session_id", "")
    pid = e.pid or _parse_session_id(sid)[0]
    return (
        e.ts, e.tool, e.kind,
        sid,
        pid,
        d.get("project_path", d.get("path", "")),
        json.dumps(e.detail),
    )


def _json(s: str | None) -> dict:
    """Decode a JSON string, returning {} for None/empty/invalid."""
    if not s:
        return {}
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return {}


def _safe_num(v) -> float:
    """Coerce to float, defaulting to 0."""
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _assign_seq(rows: list[tuple], key_indices: tuple[int, ...]) -> list[tuple]:
    """Append a seq number to each row to disambiguate PK collisions.

    Rows with the same key (selected fields) get incrementing seq values.
    First occurrence gets seq=0, second gets seq=1, etc.
    """
    seen: dict[tuple, int] = {}
    result = []
    for row in rows:
        key = tuple(row[i] for i in key_indices)
        seq = seen.get(key, 0)
        seen[key] = seq + 1
        result.append(row + (seq,))
    return result


def _where(conditions: list[tuple[str, Any]]) -> tuple[str, list]:
    """Build a SQL WHERE clause from (expr, value) pairs, skipping None values."""
    clauses, params = [], []
    for expr, val in conditions:
        if val is not None:
            clauses.append(expr)
            params.append(val)
    return (" WHERE " + " AND ".join(clauses)) if clauses else "", params


def _placeholders(ids: list) -> str:
    """Return a SQL placeholder string for IN clauses: '?,?,?'."""
    return ",".join("?" * len(ids))


def _last_id(conn: sqlite3.Connection) -> int:
    """Return the last auto-inserted row ID."""
    return conn.execute("SELECT last_insert_rowid()").fetchone()[0]


def _rows_to_dicts(cur: sqlite3.Cursor) -> list[dict]:
    """Convert all rows in a cursor to dicts keyed by column name."""
    cols = [desc[0] for desc in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def _file_entry_from_row(row: tuple) -> FileEntry:
    """Construct a FileEntry from a SELECT row."""
    return FileEntry(
        path=row[0], tool=row[1], category=row[2], scope=row[3],
        content=row[4] or "", blob_hash=row[5] or "",
        content_hash=row[6] or "",
        size_bytes=row[7], tokens=row[8], lines=row[9],
        mtime=row[10], first_seen=row[11], last_read=row[12],
        last_changed=row[13],
        meta=_json(row[14]),
    )


def _metric_row_tuple(s: Metric) -> tuple:
    """Convert a Metric to a tuple for INSERT."""
    tags = s.tags if isinstance(s.tags, dict) else {}
    return (
        s.ts, s.metric, s.value, json.dumps(s.tags),
        tags.get("tool", ""),
        tags.get("project_path", ""),
        tags.get("session_id", ""),
    )


# Backward compat alias
_sample_row_tuple = _metric_row_tuple


# ─── HistoryDB ─────────────────────────────────────────────────────

class HistoryDB:
    """Thread-safe SQLite store for metrics, per-tool metrics, and events.

    Parameters
    ----------
    db_path : Path | str | None
        Path to the SQLite database file.  ``None`` -> in-memory only
        (useful for testing).  ``":memory:"`` also works.
        Default is ``~/.config/aictl/history.db``.
    flush_interval : float
        Seconds between automatic batch flushes.  Set to 0 to flush
        on every ``append_*`` call (useful in tests).
    """

    def __init__(
        self,
        db_path: Path | str | None = None,
        flush_interval: float = FLUSH_INTERVAL,
        datapoint_logger: Any | None = None,
    ) -> None:
        if db_path is None:
            db_path = DEFAULT_DB_PATH
        self._path = Path(db_path) if db_path != ":memory:" else db_path
        self._flush_interval = flush_interval
        self._datapoint_logger = datapoint_logger

        # Pending rows (written by any thread, flushed by _flush_thread)
        self._lock = threading.Lock()
        self._system_snapshot_buf: list[SystemSnapshotRow] = []
        self._process_snapshot_buf: list[ProcessSnapshotRow] = []
        self._events_buf: list[EventRow] = []
        self._metrics_buf: list[Metric] = []
        self._requests_buf: list[RequestRow] = []
        self._tool_invocations_buf: list[ToolInvocationRow] = []

        # Process snapshot dedup cache: (pid, tool) -> (cpu_percent, memory_rss_mb)
        self._proc_snapshot_cache: dict[tuple[int, str], tuple[float, float]] = {}

        # Connection pool: one connection per thread
        self._local = threading.local()
        self._closed = False

        # Event listeners — callables receiving EventRow on append
        self._event_listeners: list = []

        # Ensure parent dir exists
        if isinstance(self._path, Path):
            self._path.parent.mkdir(parents=True, exist_ok=True)

        # Create schema
        self._init_schema()

        # Background flush thread
        self._flush_stop = threading.Event()
        self._flush_thread: threading.Thread | None = None
        if flush_interval > 0:
            self._flush_thread = threading.Thread(
                target=self._flush_loop, daemon=True, name="aictl-db-flush"
            )
            self._flush_thread.start()

    # ── Connection management ──────────────────────────────────────

    def _conn(self) -> sqlite3.Connection:
        """Return a per-thread connection with WAL mode."""
        conn = getattr(self._local, "conn", None)
        if conn is None:
            path = str(self._path) if isinstance(self._path, Path) else self._path
            conn = sqlite3.connect(path, timeout=5.0)
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA cache_size=-8000")  # 8 MB
            self._local.conn = conn
        return conn

    def _init_schema(self) -> None:
        conn = self._conn()
        # Check if schema_version table exists to detect pre-v20 DB
        cur = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
        )
        has_schema_table = cur.fetchone() is not None

        current = 0
        if has_schema_table:
            cur = conn.execute("SELECT MAX(version) FROM schema_version")
            row = cur.fetchone()
            current = row[0] if row and row[0] else 0

        # Drop old tables when migrating from v12 to v20
        if current > 0 and current < 20:
            self._drop_old_tables(conn)

        conn.executescript(_SCHEMA_SQL)

        # Fresh install: seed data tables
        if current == 0:
            self._sync_csv_to_db(conn)
            self._seed_ui_layout(conn)

        # Run migrations for existing DBs
        if current < SCHEMA_VERSION:
            self._migrate(conn, current)
            conn.execute(
                "INSERT OR REPLACE INTO schema_version(version) VALUES(?)",
                (SCHEMA_VERSION,),
            )
            conn.commit()

        # Always re-sync catalog from YAML (cheap INSERT OR REPLACE)
        try:
            self._sync_datapoint_catalog(conn)
        except Exception as exc:
            log.warning("Datapoint catalog sync failed: %s", exc)

    def _drop_old_tables(self, conn: sqlite3.Connection) -> None:
        """Drop old tables that are being replaced in v20 schema."""
        for table in _OLD_TABLES_TO_DROP:
            try:
                conn.execute(f"DROP TABLE IF EXISTS {table}")
            except sqlite3.OperationalError:
                pass
        conn.commit()
        log.info("Dropped old tables for v20 migration: %s",
                 ", ".join(_OLD_TABLES_TO_DROP))

    def _migrate(self, conn: sqlite3.Connection, from_version: int) -> None:
        """Run incremental migrations from *from_version* to SCHEMA_VERSION.

        Each migration is idempotent (uses ALTER TABLE IF NOT EXISTS pattern).
        New columns are always added with DEFAULT values so old data stays valid.
        """
        # v12 -> v20: major schema refactor. Old tables dropped in _drop_old_tables.
        # No column migrations needed -- fresh tables.

        if from_version < 21:
            # v20 -> v21: add pid column to sessions table
            try:
                conn.execute(
                    "ALTER TABLE sessions ADD COLUMN pid INTEGER DEFAULT 0"
                )
            except sqlite3.OperationalError:
                pass  # column already exists

    @staticmethod
    def _sync_datapoint_catalog(conn: sqlite3.Connection) -> None:
        """Seed/refresh ``datapoint_catalog`` from datapoint-catalog.yaml + queries."""
        import yaml
        cat_path = Path(__file__).parent / "data" / "datapoint-catalog.yaml"
        if not cat_path.exists():
            log.warning("datapoint-catalog.yaml not found, skipping catalog seed")
            return
        with open(cat_path, encoding="utf-8") as f:
            catalog = yaml.safe_load(f) or {}
        # Load queries from separate file (SQL doesn't belong in YAML)
        queries: dict = {}
        q_path = Path(__file__).parent / "data" / "datapoint-queries.yaml"
        if q_path.exists():
            with open(q_path, encoding="utf-8") as f:
                queries = yaml.safe_load(f) or {}
        now = time.time()
        for key, entry in catalog.items():
            q_info = queries.get(key, {})
            conn.execute(
                """INSERT OR REPLACE INTO datapoint_catalog
                   (key, label, tab, section, explanation, source_static,
                    source_type, unit, update_freq, otel_metric,
                    dynamic_source, query, calc, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    key,
                    entry.get("explanation", "").strip().split("\n")[0][:120],
                    entry.get("tab", ""),
                    entry.get("section", ""),
                    entry.get("explanation", "").strip(),
                    entry.get("source", "").strip(),
                    entry.get("source_type", "raw"),
                    entry.get("unit", ""),
                    entry.get("update_freq", ""),
                    entry.get("otel_metric", ""),
                    1 if entry.get("dynamic_source") else 0,
                    q_info.get("query", "").strip(),
                    q_info.get("calc", "").strip(),
                    now,
                ),
            )
        conn.commit()
        log.info("Loaded %d datapoint catalog entries", len(catalog))

    @staticmethod
    def _seed_ui_layout(conn: sqlite3.Connection) -> None:
        """Seed ``ui_*`` tables with the default dashboard layout.

        Uses ``INSERT OR IGNORE`` with explicit IDs so the migration is
        fully idempotent -- re-running against a populated DB is a no-op.
        All data is derived from the current hardcoded Preact/JS layout.
        """
        # ── Dashboard ──────────────────────────────────────────────
        conn.execute(
            "INSERT OR IGNORE INTO ui_dashboard(id, slug, title)"
            " VALUES(1, 'main', 'aictl live dashboard')"
        )

        # ── Tabs (7) ──────────────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_tab"
            "(id, dashboard_id, key, title, shortcut, sort_order, icon)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                (1, 1, "overview", "Overview",       "1", 0, "\U0001f4ca"),  # 📊
                (2, 1, "procs",    "Processes",       "2", 1, "\u2699\ufe0f"),  # ⚙️
                (3, 1, "mcp",      "MCP Servers",     "3", 2, "\U0001f517"),  # 🔗
                (4, 1, "memory",   "AI Context",      "4", 3, "\U0001f4dd"),  # 📝
                (5, 1, "live",     "Live Monitor",    "5", 4, "\U0001f4e1"),  # 📡
                (6, 1, "events",   "Events & Stats",  "6", 5, "\U0001f4c8"),  # 📈
                (7, 1, "budget",   "Token Budget",    "7", 6, "\U0001f4b0"),  # 💰
            ],
        )

        # ── Sections ──────────────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_section"
            "(id, dashboard_id, tab_id, key, title, sort_order, columns)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                # Global header sections
                (1, 1, None, "sparklines",     "Sparklines",      0, 4),
                (2, 1, None, "inventory",      "Inventory",       1, 4),
                (3, 1, None, "live_metrics",   "Live Monitor",    2, 4),
                (4, 1, None, "event_timeline", "Event Timeline",  3, 1),
                (5, 1, None, "resource_bars",  "Resource Bars",   4, 1),
                # Tab-scoped sections
                (6,  1, 6,  "tool_charts",       "Per-Tool Charts",        0, 4),
                (7,  1, 1,  "overview_tools",    "Tool Cards",             0, 1),
                (8,  1, 1,  "overview_memory",   "AI Context & Memory",    1, 1),
                (9,  1, 2,  "procs_cores",       "CPU Cores",              0, 1),
                (10, 1, 2,  "procs_tree",        "Process Tree",           1, 1),
                (11, 1, 3,  "mcp_servers",       "MCP Servers",            0, 1),
                (12, 1, 4,  "memory_groups",     "Memory Files",           0, 1),
                (13, 1, 5,  "live_diagnostics",  "Diagnostics & Sessions", 0, 1),
                (14, 1, 7,  "budget_verified",   "Verified Token Usage",   0, 1),
                (15, 1, 7,  "budget_context",    "Context Window",         1, 1),
                (16, 1, 7,  "budget_breakdown",  "Token Breakdown",        2, 1),
            ],
        )

        # ── Widgets (20) ──────────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_widget"
            "(id, section_id, key, kind, title, sort_order, config)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                # Sparklines section (id=1) — time-series charts
                (1,  1, "files",     "sparkline", "Files",    0,
                 '{"field":"files","metric":"discovery.files","format":"raw","color":"var(--accent)"}'),
                (2,  1, "tokens",    "sparkline", "Tokens",   1,
                 '{"field":"tokens","metric":"discovery.tokens","format":"kilo","color":"var(--green)"}'),
                (3,  1, "cpu",       "sparkline", "CPU",      2,
                 '{"field":"cpu","metric":"tool.cpu","format":"percent","color":"var(--orange)","smooth":true,'
                 '"yMaxExpr":"100*cores","refLines":[{"valueExpr":"100","label":"1 core"},{"valueExpr":"100*cores","label":"{cores} cores"}]}'),
                (4,  1, "proc_ram",  "sparkline", "Proc RAM", 3,
                 '{"field":"mem_mb","metric":"aictl.tool.memory","format":"size","color":"var(--yellow)","smooth":true,"multiply":1048576}'),
                # Inventory section (id=2) — static/slow metrics
                (5,  2, "processes",   "stat", "Processes",   0,
                 '{"field":"total_processes","metric":"discovery.processes","format":"raw"}'),
                (6,  2, "disk_size",   "stat", "Disk Size",   1,
                 '{"field":"total_size","metric":"discovery.size","format":"size"}'),
                (7,  2, "mcp_servers", "stat", "MCP Servers", 2,
                 '{"field":"total_mcp_servers","metric":"discovery.mcp_servers","format":"raw"}'),
                (8,  2, "ai_context",  "stat", "AI Context",  3,
                 '{"field":"total_memory_tokens","metric":"memory.tokens","format":"kilo","suffix":"t"}'),
                # Live Monitor section (id=3) — real-time metrics
                (9,  3, "sessions",   "stat", "Sessions",    0,
                 '{"field":"total_live_sessions","metric":"tool.sessions","format":"raw","accent":true}'),
                (10, 3, "est_tokens", "stat", "Est. Tokens", 1,
                 '{"field":"total_live_estimated_tokens","metric":"tool.tokens.input","format":"kilo"}'),
                (11, 3, "outbound",   "stat", "\u2191 Outbound", 2,
                 '{"field":"total_live_outbound_rate_bps","metric":"tool.net.out_bps","format":"rate"}'),
                (12, 3, "inbound",    "stat", "\u2193 Inbound",  3,
                 '{"field":"total_live_inbound_rate_bps","metric":"tool.net.in_bps","format":"rate"}'),
                # Resource Bars section (id=5) — proportional bars
                (13, 5, "csv_footprint", "bar_segment", "CSV Footprint", 0,
                 '{"metric":"files","segment_by":"tool","showLegend":true}'),
                (14, 5, "live_traffic",  "bar_segment", "Live Traffic",  1,
                 '{"metric":"traffic_rate","segment_by":"tool","showLegend":true,"minHeight":36}'),
                # Per-Tool Charts section (id=6) — Events & Stats tab
                (15, 6, "tool_cpu",     "sparkline", "CPU %",        0,
                 '{"field":"cpu","metric":"tool.cpu","format":"percent","color":"tool","smooth":true}'),
                (16, 6, "tool_mem",     "sparkline", "Memory (MB)",  1,
                 '{"field":"mem_mb","metric":"tool.mem_mb","format":"size","color":"var(--green)","smooth":true}'),
                (17, 6, "tool_tokens",  "sparkline", "Tokens",       2,
                 '{"field":"tokens","metric":"tool.tokens.input","format":"kilo","color":"var(--accent)"}'),
                (18, 6, "tool_traffic", "sparkline", "Traffic (B/s)", 3,
                 '{"field":"traffic","metric":"tool.net.out_bps","format":"rate","color":"var(--orange)","smooth":true}'),
                # Event Timeline section (id=4) — dot strip
                (19, 4, "events_dot_timeline", "timeline", "Events", 0,
                 '{"maxDots":200,"colorBy":"tool"}'),
                # Range selector (virtual widget)
                (20, 1, "range_selector", "range", "Range", 99,
                 '{"options":["live","1h","6h","24h","7d"]}'),
                # ── Tab-scoped widgets ─────────────────────────────
                # Overview tab (section 7=overview_tools, 8=overview_memory)
                (21, 7,  "tool_card_grid", "tool_card_grid", "Tools", 0,
                 '{"showSparklines":true,"sparklineMetrics":["cpu","mem_mb","tokens","traffic"],'
                 '"showBadges":true,"showLivePills":true,"expandable":true}'),
                (22, 8,  "memory_inline", "memory_list", "AI Context & Memory", 0,
                 '{"groupBy":"source","showPreview":true,"tailLines":15}'),
                # Processes tab (section 9=procs_cores, 10=procs_tree)
                (23, 9,  "core_bars", "core_bars", "Per-Core CPU", 0,
                 '{"metric":"system.cpu.utilization"}'),
                (24, 10, "process_tree", "process_tree", "Processes", 0,
                 '{"groupBy":"tool","showCpuBars":true,"showMemBars":true,"treeDepth":2}'),
                # MCP Servers tab (section 11)
                (25, 11, "mcp_table", "mcp_table", "MCP Servers", 0,
                 '{"showTransport":true,"showStatus":true}'),
                # AI Context tab (section 12)
                (26, 12, "memory_full", "memory_list", "Memory Files", 0,
                 '{"groupBy":"source","showPreview":true,"tailLines":15}'),
                # Live Monitor tab (section 13)
                (27, 13, "live_monitor", "live_monitor_table", "Live Monitor", 0,
                 '{"showDiagnostics":true,"showPerTool":true}'),
                # Token Budget tab (section 14=verified, 15=context, 16=breakdown)
                (28, 14, "budget_verified", "token_budget", "Verified Usage", 0,
                 '{"section":"verified","showByModel":true}'),
                (29, 15, "budget_context", "token_budget", "Context Window", 0,
                 '{"section":"context","showBar":true}'),
                (30, 16, "budget_breakdown", "token_budget", "Breakdown", 0,
                 '{"section":"breakdown","showByKind":true}'),
                # Events & Stats tab — tool_charts section already has widgets 15-18
                (31, 6,  "event_feed", "events_feed", "Event Feed", 4,
                 '{"maxEvents":100}'),
            ],
        )

        # ── Datasources (6) ───────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_datasource"
            "(id, key, kind, endpoint, poll_ms, config)"
            " VALUES(?,?,?,?,?,?)",
            [
                (1, "snapshot", "rest", "/api/snapshot", None, "{}"),
                (2, "stream",   "sse",  "/api/stream",  None, "{}"),
                (3, "history",  "rest", "/api/history",  None, "{}"),
                (4, "budget",   "rest", "/api/budget",   None, "{}"),
                (5, "samples",  "rest", "/api/samples",  None, "{}"),
                (6, "events",   "rest", "/api/events",   None, "{}"),
            ],
        )

        # ── Widget <-> Datasource links ────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_widget_datasource"
            "(widget_id, datasource_id, role) VALUES(?,?,?)",
            [
                # Sparklines: history (chart) + snapshot (current value)
                (1, 3, "primary"), (1, 1, "secondary"),   # files
                (2, 3, "primary"), (2, 1, "secondary"),   # tokens
                (3, 3, "primary"), (3, 1, "secondary"),   # cpu
                (4, 3, "primary"), (4, 1, "secondary"),   # proc_ram
                # Stats: snapshot only
                (5, 1, "primary"),   # processes
                (6, 1, "primary"),   # disk_size
                (7, 1, "primary"),   # mcp_servers
                (8, 1, "primary"),   # ai_context
                (9, 1, "primary"),   # sessions
                (10, 1, "primary"),  # est_tokens
                (11, 1, "primary"),  # outbound
                (12, 1, "primary"),  # inbound
                # Resource bars: snapshot
                (13, 1, "primary"),  # csv_footprint
                (14, 1, "primary"),  # live_traffic
                # Per-tool charts: history
                (15, 3, "primary"),  # tool_cpu
                (16, 3, "primary"),  # tool_mem
                (17, 3, "primary"),  # tool_tokens
                (18, 3, "primary"),  # tool_traffic
                # Event timeline: events
                (19, 6, "primary"),
                # Tool card grid: snapshot
                (21, 1, "primary"),
                # Memory: snapshot
                (22, 1, "primary"),
                (26, 1, "primary"),
                # Core bars: snapshot
                (23, 1, "primary"),
                # Process tree: snapshot
                (24, 1, "primary"),
                # MCP table: snapshot
                (25, 1, "primary"),
                # Live monitor: snapshot
                (27, 1, "primary"),
                # Token budget: budget endpoint
                (28, 4, "primary"),
                (29, 4, "primary"),
                (30, 4, "primary"),
                # Event feed: events + history
                (31, 6, "primary"), (31, 3, "secondary"),
            ],
        )

        # ── Group-by options (overview tab) ────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_group_by_option"
            "(id, tab_id, key, label, sort_order, is_default)"
            " VALUES(?,?,?,?,?,?)",
            [
                (1, 1, "product", "Product", 0, 1),
                (2, 1, "vendor",  "Vendor",  1, 0),
                (3, 1, "host",    "Host",    2, 0),
            ],
        )

        # ── Theme tokens ──────────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_theme(id, key, tokens) VALUES(?,?,?)",
            [
                (1, "dark", '{"bg":"#0f172a","bg2":"#1e293b","bg3":"#162032",'
                 '"fg":"#e2e8f0","fg2":"#94a3b8","accent":"#38bdf8","border":"#334155",'
                 '"green":"#34d399","red":"#f87171","orange":"#fb923c","yellow":"#fbbf24"}'),
                (2, "light", '{"bg":"#f8fafc","bg2":"#ffffff","bg3":"#f1f5f9",'
                 '"fg":"#1e293b","fg2":"#64748b","accent":"#0284c7","border":"#e2e8f0",'
                 '"green":"#059669","red":"#dc2626","orange":"#ea580c","yellow":"#d97706"}'),
            ],
        )

        # ── Default preferences ────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_preference"
            "(id, dashboard_id, user_id, pref_key, pref_value)"
            " VALUES(?,?,?,?,?)",
            [
                (1, 1, None, "theme",      "auto"),
                (2, 1, None, "range",      "live"),
                (3, 1, None, "active_tab", "overview"),
            ],
        )

        conn.commit()

    @staticmethod
    def _ensure_columns(
        conn: sqlite3.Connection,
        table: str,
        columns: list[tuple[str, str]],
    ) -> None:
        """Add columns to *table* if they don't already exist."""
        existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        for col_name, col_def in columns:
            if col_name not in existing:
                try:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}")
                except sqlite3.OperationalError:
                    pass

    # ── File blob support ─────────────────────────────────────────

    @staticmethod
    def _store_blob(conn: sqlite3.Connection, content: str) -> str:
        """Store content in file_blobs if not already present. Returns hash."""
        blob_hash = hashlib.sha256(
            content.encode("utf-8", errors="replace")
        ).hexdigest()[:32]
        conn.execute(
            "INSERT OR IGNORE INTO file_blobs(hash, content, size_bytes, created_at)"
            " VALUES(?,?,?,?)",
            (blob_hash, content,
             len(content.encode("utf-8", errors="replace")),
             time.time()),
        )
        return blob_hash

    @staticmethod
    def _resolve_content(conn: sqlite3.Connection, content: str, blob_hash: str) -> str:
        """Resolve content: if content is empty and blob_hash is set, fetch from blobs."""
        if content:
            return content
        if blob_hash:
            row = conn.execute(
                "SELECT content FROM file_blobs WHERE hash = ?", (blob_hash,)
            ).fetchone()
            return row[0] if row else ""
        return ""

    # ── Append (buffered) ──────────────────────────────────────────

    def append_metrics(self, row: SystemSnapshotRow | MetricsRow) -> None:
        """Buffer a system snapshot row for batch insert.

        Backward compat: accepts old MetricsRow (which is now an alias for
        SystemSnapshotRow).
        """
        with self._lock:
            self._system_snapshot_buf.append(row)
        if self._flush_interval <= 0:
            self.flush()

    def append_tool_metrics(self, rows: list[ToolMetricsRow | ProcessSnapshotRow]) -> None:
        """Buffer per-tool/process metrics rows.

        Backward compat: accepts old ToolMetricsRow, converts to
        ProcessSnapshotRow internally.
        """
        converted = []
        for r in rows:
            if isinstance(r, ToolMetricsRow):
                # Use a synthetic pid derived from tool name hash to avoid
                # PK collisions when multiple tools share pid=0
                synth_pid = abs(hash(r.tool)) % 2_000_000_000
                converted.append(ProcessSnapshotRow(
                    ts=r.ts, pid=synth_pid, tool=r.tool,
                    cpu_percent=r.cpu, memory_rss_mb=r.mem_mb,
                ))
            else:
                converted.append(r)
        with self._lock:
            self._process_snapshot_buf.extend(converted)
        if self._flush_interval <= 0:
            self.flush()

    def add_event_listener(self, callback) -> None:
        """Register a callback that receives each EventRow on append."""
        self._event_listeners.append(callback)

    def append_event(self, event: EventRow) -> None:
        """Buffer an event for batch insert."""
        self._log_event(event)
        self._notify_listeners(event)
        with self._lock:
            self._events_buf.append(event)
        if self._flush_interval <= 0:
            self.flush()

    def append_events(self, events: list[EventRow]) -> None:
        """Buffer multiple events."""
        for e in events:
            self._log_event(e)
            self._notify_listeners(e)
        with self._lock:
            self._events_buf.extend(events)
        if self._flush_interval <= 0:
            self.flush()

    def _notify_listeners(self, event: EventRow) -> None:
        """Call all registered event listeners."""
        for cb in self._event_listeners:
            try:
                cb(event)
            except Exception:
                pass  # listeners must not break the write path

    def _log_event(self, event: EventRow) -> None:
        """Write event to datapoint log file if configured."""
        dl = self._datapoint_logger
        if not dl:
            return
        try:
            d = event.detail if isinstance(event.detail, dict) else {}
            dl.log_event(
                ts=event.ts,
                tool=event.tool,
                kind=event.kind,
                detail=d,
                session_id=event.session_id or d.get("session_id", ""),
                pid=event.pid or _parse_session_id(d.get("session_id", ""))[0],
                model=(d.get("model") or d.get("gen_ai.request.model") or ""),
                path=d.get("path", ""),
                input_tokens=int(_safe_num(d.get("input_tokens",
                    d.get("gen_ai.usage.input_tokens", 0)))),
                output_tokens=int(_safe_num(d.get("output_tokens",
                    d.get("gen_ai.usage.output_tokens", 0)))),
                duration_ms=_safe_num(d.get("duration_ms", 0)),
                tool_name=d.get("tool_name", ""),
                prompt_id=d.get("prompt.id", ""),
            )
        except Exception as exc:
            log.debug("Event log error: %s", exc)

    def append_samples(self, samples: list[Metric | Sample]) -> None:
        """Buffer universal metric samples for batch insert.

        Backward compat: ``Sample`` is now an alias for ``Metric``.
        Writes to the ``metrics`` table (was ``samples``).
        """
        if not samples:
            return
        with self._lock:
            self._metrics_buf.extend(samples)
        if self._flush_interval <= 0:
            self.flush()

    def append_request(self, row: RequestRow) -> None:
        """Buffer an LLM request for batch insert."""
        with self._lock:
            self._requests_buf.append(row)
        if self._flush_interval <= 0:
            self.flush()

    def append_tool_invocation(self, row: ToolInvocationRow) -> None:
        """Buffer a tool invocation for batch insert."""
        with self._lock:
            self._tool_invocations_buf.append(row)
        if self._flush_interval <= 0:
            self.flush()

    # ── Flush ──────────────────────────────────────────────────────

    def flush(self) -> int:
        """Write all buffered rows to SQLite.  Returns rows written."""
        with self._lock:
            ss_buf = self._system_snapshot_buf
            self._system_snapshot_buf = []
            ps_buf = self._process_snapshot_buf
            self._process_snapshot_buf = []
            e_buf = self._events_buf
            self._events_buf = []
            m_buf = self._metrics_buf
            self._metrics_buf = []
            req_buf = self._requests_buf
            self._requests_buf = []
            ti_buf = self._tool_invocations_buf
            self._tool_invocations_buf = []

        if not ss_buf and not ps_buf and not e_buf and not m_buf and not req_buf and not ti_buf:
            return 0

        total = 0
        conn = self._conn()
        try:
            if ss_buf:
                conn.executemany(
                    "INSERT OR REPLACE INTO system_snapshots"
                    "(ts, cpu_percent, cpu_per_core,"
                    " memory_used_mb, memory_total_mb,"
                    " active_sessions, active_processes, ai_token_rate,"
                    " files, tokens, mcp, mem_tokens,"
                    " memory_entries, live_sessions, live_tokens,"
                    " live_in_rate, live_out_rate)"
                    " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    [
                        (r.ts, round(r.cpu_percent, 2),
                         json.dumps(r.cpu_per_core) if r.cpu_per_core else "[]",
                         round(r.memory_used_mb, 1), round(r.memory_total_mb, 1),
                         r.active_sessions, r.active_processes,
                         round(r.ai_token_rate, 2),
                         r.files, r.tokens, r.mcp, r.mem_tokens,
                         r.memory_entries, r.live_sessions, r.live_tokens,
                         round(r.live_in_rate, 2), round(r.live_out_rate, 2))
                        for r in ss_buf
                    ],
                )
                total += len(ss_buf)

            if ps_buf:
                # Apply dedup: only write if cpu or mem changed significantly
                filtered = []
                for r in ps_buf:
                    cache_key = (r.pid, r.tool)
                    cached = self._proc_snapshot_cache.get(cache_key)
                    if cached is None or abs(r.cpu_percent - cached[0]) > 1.0 or abs(r.memory_rss_mb - cached[1]) > 1.0:
                        self._proc_snapshot_cache[cache_key] = (r.cpu_percent, r.memory_rss_mb)
                        filtered.append(r)
                if filtered:
                    conn.executemany(
                        "INSERT OR REPLACE INTO process_snapshots"
                        "(ts, pid, tool, cpu_percent, memory_rss_mb,"
                        " memory_vms_mb, open_files, threads)"
                        " VALUES(?,?,?,?,?,?,?,?)",
                        [
                            (r.ts, r.pid, r.tool,
                             round(r.cpu_percent, 2), round(r.memory_rss_mb, 1),
                             round(r.memory_vms_mb, 1), r.open_files, r.threads)
                            for r in filtered
                        ],
                    )
                    total += len(filtered)

            if e_buf:
                rows = _assign_seq(
                    [_event_row_tuple(e) for e in e_buf],
                    key_indices=(0, 1, 2),  # ts, tool, kind
                )
                conn.executemany(
                    "INSERT OR IGNORE INTO events"
                    "(ts, tool, kind, session_id, pid,"
                    " project_path, detail, seq)"
                    " VALUES(?,?,?,?,?,?,?,?)",
                    rows,
                )
                total += len(e_buf)

            if m_buf:
                rows = _assign_seq(
                    [_metric_row_tuple(s) for s in m_buf],
                    key_indices=(0, 1),  # ts, metric
                )
                conn.executemany(
                    "INSERT OR IGNORE INTO metrics"
                    "(ts, metric, value, tags, tool,"
                    " project_path, session_id, seq)"
                    " VALUES(?,?,?,?,?,?,?,?)",
                    rows,
                )
                total += len(m_buf)

            if req_buf:
                for r in req_buf:
                    # Use embedded source timestamp when present (Case A).
                    # Fall back to value-based dedup when absent (Case B) —
                    # never use our reporting time (r.ts) as a dedup factor.
                    if r.source_ts > 0:
                        dk = _dedup_key(
                            r.session_id, str(int(r.source_ts * 1000)),
                            r.model, r.source,
                        )
                    else:
                        dk = _dedup_key(
                            r.session_id, r.model,
                            str(r.input_tokens), str(r.output_tokens), r.source,
                        )
                    conn.execute(
                        "INSERT OR IGNORE INTO requests"
                        "(dedup_key, ts, session_id, agent_id, tool,"
                        " project_path, pid, model, input_tokens,"
                        " output_tokens, cache_read_tokens,"
                        " cache_creation_tokens, cost_usd, duration_ms,"
                        " finish_reason, is_error, error_type,"
                        " http_status, source, prompt_id)"
                        " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (dk, r.ts, r.session_id, r.agent_id, r.tool,
                         r.project_path, r.pid, r.model, r.input_tokens,
                         r.output_tokens, r.cache_read_tokens,
                         r.cache_creation_tokens, round(r.cost_usd, 6),
                         round(r.duration_ms, 1), r.finish_reason,
                         r.is_error, r.error_type, r.http_status,
                         r.source, r.prompt_id),
                    )
                total += len(req_buf)

            if ti_buf:
                for r in ti_buf:
                    # Same Case A/B logic as requests.
                    # Hook events (no embedded ts): dedup only on full value equality.
                    # OTel events (embedded ts present): dedup on ts + identity fields.
                    if r.source_ts > 0:
                        dk = _dedup_key(
                            r.session_id, str(int(r.source_ts * 1000)),
                            r.tool_name,
                        )
                    else:
                        input_sig = json.dumps(r.input, sort_keys=True) if isinstance(r.input, dict) else str(r.input)
                        dk = _dedup_key(
                            r.session_id, r.tool_name, input_sig,
                            str(r.is_error), r.source,
                        )
                    conn.execute(
                        "INSERT OR IGNORE INTO tool_invocations"
                        "(dedup_key, ts, session_id, request_id, tool,"
                        " tool_name, project_path, pid, is_error,"
                        " duration_ms, input, result_summary, source)"
                        " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (dk, r.ts, r.session_id, r.request_id, r.tool,
                         r.tool_name, r.project_path, r.pid, r.is_error,
                         round(r.duration_ms, 1),
                         json.dumps(r.input) if isinstance(r.input, dict) else r.input,
                         r.result_summary, r.source),
                    )
                total += len(ti_buf)

            conn.commit()
        except sqlite3.Error as exc:
            log.warning("DB flush error: %s", exc)
            total = 0

        return total

    def _flush_loop(self) -> None:
        """Background loop: flush buffers periodically."""
        while not self._flush_stop.wait(self._flush_interval):
            try:
                self.flush()
            except Exception as exc:
                log.warning("DB flush loop error: %s", exc)

    # ── Query: system snapshots (was global metrics) ──────────────

    def query_metrics(
        self,
        since: float | None = None,
        until: float | None = None,
        limit: int = 0,
    ) -> dict[str, list]:
        """Return system snapshots as column-major dict (uPlot-ready).

        Backward compat: returns keys matching old METRICS_KEYS format
        (ts, files, tokens, cpu, mem_mb, ...) for sparkline compatibility.
        """
        conn = self._conn()
        where, params = _where([("ts >= ?", since), ("ts <= ?", until)])
        lim = f" LIMIT {limit}" if limit > 0 else ""
        sql = (f"SELECT ts, files, tokens, cpu_percent, memory_used_mb, mcp, mem_tokens,"
               f" memory_entries, live_sessions, live_tokens,"
               f" live_in_rate, live_out_rate"
               f" FROM system_snapshots{where} ORDER BY ts{lim}")
        rows = conn.execute(sql, params).fetchall()
        if not rows:
            return {k: [] for k in _METRICS_KEYS}
        cols = list(zip(*rows))
        return {k: list(c) for k, c in zip(_METRICS_KEYS, cols)}

    def query_tool_metrics(
        self,
        tool: str | None = None,
        since: float | None = None,
        until: float | None = None,
    ) -> dict[str, dict[str, list]]:
        """Return per-tool metrics as {tool: {ts, cpu, mem_mb, tokens, traffic}}.

        Backward compat wrapper over process_snapshots.
        """
        conn = self._conn()
        where, params = _where([
            ("tool = ?", tool or None),
            ("ts >= ?", since), ("ts <= ?", until),
        ])
        sql = (f"SELECT ts, tool, cpu_percent, memory_rss_mb"
               f" FROM process_snapshots{where} ORDER BY ts")
        rows = conn.execute(sql, params).fetchall()
        result: dict[str, dict[str, list]] = {}
        for ts, tl, cpu, mem in rows:
            d = result.setdefault(tl, {"ts": [], "cpu": [], "mem_mb": [],
                                       "tokens": [], "traffic": []})
            d["ts"].append(ts)
            d["cpu"].append(cpu)
            d["mem_mb"].append(mem)
            d["tokens"].append(0)
            d["traffic"].append(0)
        return result

    # ── Query: events ──────────────────────────────────────────────

    def query_events(
        self,
        since: float | None = None,
        until: float | None = None,
        tool: str | None = None,
        kind: str | None = None,
        session_id: str | None = None,
        pid: int | None = None,
        limit: int = 500,
    ) -> list[EventRow]:
        """Return events matching the filter criteria."""
        conn = self._conn()
        where, params = _where([
            ("ts >= ?", since), ("ts <= ?", until),
            ("tool = ?", tool or None), ("kind = ?", kind or None),
            ("pid = ?", pid or None),
        ])
        if session_id:
            sep = " AND " if where else " WHERE "
            where += sep + "(session_id = ? OR json_extract(detail, '$.session_id') = ?)"
            params.extend([session_id, session_id])
        sql = (f"SELECT ts, tool, kind, detail, session_id, pid FROM events{where}"
               f" ORDER BY ts DESC LIMIT ?")
        params.append(limit)
        rows = conn.execute(sql, params).fetchall()
        return [
            EventRow(ts=r[0], tool=r[1], kind=r[2],
                     detail=_json(r[3]), session_id=r[4] or "",
                     pid=r[5] or 0)
            for r in rows
        ]

    def query_session_profiles(
        self,
        since: float,
        until: float | None = None,
    ) -> list[dict]:
        """Return enriched session profiles for the given time window.

        Backward compat wrapper: first tries the sessions table, then
        falls back to event-based reconstruction.
        """
        conn = self._conn()
        # Try sessions table first
        where_parts = ["started_at >= ?"]
        params: list[Any] = [since]
        if until is not None:
            where_parts.append("started_at <= ?")
            params.append(until)
        where_sql = " WHERE " + " AND ".join(where_parts)

        session_rows = _rows_to_dicts(conn.execute(
            f"SELECT * FROM sessions{where_sql} ORDER BY started_at",
            params,
        ))

        if session_rows:
            # Convert sessions table rows to profile format
            profiles: dict[str, dict] = {}
            result = []
            for s in session_rows:
                p = {
                    "session_id": s["session_id"],
                    "tool": s["tool"],
                    "pid": s.get("pid", 0) or 0,
                    "started_at": s["started_at"],
                    "ended_at": s["ended_at"],
                    "duration_s": round(s["ended_at"] - s["started_at"], 1) if s["ended_at"] else None,
                    "active": s["ended_at"] is None,
                    "conversations": 0,
                    "subagents": 0,
                    "files_modified": s["files_modified"],
                    "unique_files": 0,
                    "bytes_written": 0,
                    "source_files": 0,
                    "activity": [],
                }
                profiles[s["session_id"]] = p
                result.append(p)

            # Enrich with file_modified event counts (sessions table may
            # not have these populated — the events table is authoritative).
            file_where = " AND ts <= ?" if until is not None else ""
            file_params: list[Any] = [since]
            if until is not None:
                file_params.append(until)
            file_rows = conn.execute(
                "SELECT session_id, COUNT(*) as cnt"
                " FROM events"
                " WHERE kind = 'file_modified' AND ts >= ?"
                + file_where
                + " AND session_id != ''"
                " GROUP BY session_id",
                file_params,
            ).fetchall()
            for sid, cnt in file_rows:
                if sid in profiles and profiles[sid]["files_modified"] < cnt:
                    profiles[sid]["files_modified"] = cnt

            # Apply the same merge logic used by the event-based path:
            # merge sessions with the same (tool, pid).
            return self._merge_session_profiles(result)

        # Fall back to event-based reconstruction
        return self._query_session_profiles_from_events(since, until)

    def _query_session_profiles_from_events(
        self,
        since: float,
        until: float | None = None,
    ) -> list[dict]:
        """Reconstruct session profiles from events (backward compat)."""
        conn = self._conn()
        params: list[Any] = [since]
        until_clause = ""
        if until is not None:
            until_clause = " AND ts <= ?"
            params.append(until)

        starts = conn.execute(
            "SELECT ts, tool, session_id, pid, detail FROM events"
            " WHERE kind = 'session_start' AND ts >= ?"
            + until_clause + " ORDER BY ts",
            params,
        ).fetchall()

        if not starts:
            return []

        sessions: dict[str, dict] = {}
        for ts, tool, sid_col, ev_pid, detail_json in starts:
            detail = _json(detail_json)
            sid = sid_col or detail.get("session_id", "")
            if not sid:
                continue
            sessions[sid] = {
                "session_id": sid,
                "tool": tool,
                "pid": ev_pid or int(detail.get("pid", 0) or 0),
                "started_at": ts,
                "ended_at": None,
                "duration_s": None,
                "active": True,
                "conversations": 0,
                "subagents": 0,
                "files_modified": 0,
                "unique_files": 0,
                "bytes_written": 0,
                "source_files": 0,
                "activity": [],
            }

        if not sessions:
            return []

        # Find matching session_end events
        for sid in sessions:
            end_rows = conn.execute(
                "SELECT ts, detail FROM events"
                " WHERE kind = 'session_end'"
                "   AND session_id = ?"
                " LIMIT 1",
                (sid,),
            ).fetchall()
            if end_rows:
                end_ts, end_detail_json = end_rows[0]
                end_detail = _json(end_detail_json)
                sessions[sid]["ended_at"] = end_ts
                sessions[sid]["duration_s"] = end_detail.get(
                    "duration_s",
                    round(end_ts - sessions[sid]["started_at"], 1),
                )
                sessions[sid]["active"] = False
                sessions[sid]["project"] = end_detail.get("project", "")

        # Aggregate file_modified events per session
        file_params: list[Any] = [since]
        file_until = ""
        if until is not None:
            file_until = " AND ts <= ?"
            file_params.append(until)

        file_rows = conn.execute(
            "SELECT session_id as sid,"
            "       json_extract(detail, '$.path') as path,"
            "       COUNT(*) as cnt,"
            "       SUM(json_extract(detail, '$.growth_bytes')) as growth"
            " FROM events"
            " WHERE kind = 'file_modified' AND ts >= ?"
            + file_until
            + "   AND session_id != ''"
            " GROUP BY sid, path",
            file_params,
        ).fetchall()

        for sid, path, cnt, growth in file_rows:
            if sid not in sessions:
                continue
            s = sessions[sid]
            s["files_modified"] += cnt
            s["unique_files"] += 1
            s["bytes_written"] += (growth or 0)
            if path:
                npath = path.replace("\\", "/")
                if "/subagents/" in npath:
                    s["subagents"] += 1
                elif npath.endswith(".jsonl") and "/projects/" in npath and "/subagents/" not in npath:
                    s["conversations"] += 1
                elif any(npath.endswith(ext) for ext in (
                    ".py", ".js", ".ts", ".jsx", ".tsx", ".css",
                    ".html", ".go", ".rs", ".java", ".rb", ".sh",
                    ".md", ".toml", ".yaml", ".yml", ".json",
                )):
                    if "/.claude/" not in npath and "/__pycache__/" not in npath:
                        s["source_files"] += 1

        # Activity buckets
        bucket_rows = conn.execute(
            "SELECT session_id as sid,"
            "       CAST(ts / 300 AS INT) * 300 as bucket,"
            "       COUNT(*) as cnt"
            " FROM events"
            " WHERE kind = 'file_modified' AND ts >= ?"
            + file_until
            + "   AND session_id != ''"
            " GROUP BY sid, bucket"
            " ORDER BY sid, bucket",
            file_params,
        ).fetchall()

        for sid, bucket, cnt in bucket_rows:
            if sid in sessions:
                sessions[sid]["activity"].append([bucket, cnt])

        return self._merge_session_profiles(list(sessions.values()))

    @staticmethod
    def _merge_session_profiles(profiles: list[dict]) -> list[dict]:
        """Merge duplicate session profiles by (tool, pid).

        Pass A: merge sessions from the same tool within 60s of each other.
        Pass B: merge all sessions sharing the same (tool, pid) pair.
        """
        profiles.sort(key=lambda s: s["started_at"])

        # Pass A: merge close-in-time sessions
        merged: list[dict] = []
        used: set[str] = set()
        for i, primary in enumerate(profiles):
            if primary["session_id"] in used:
                continue
            for secondary in profiles[i + 1:]:
                if secondary["session_id"] in used:
                    continue
                if secondary["tool"] != primary["tool"]:
                    continue
                if abs(secondary["started_at"] - primary["started_at"]) > 60:
                    break
                p_pid = _session_pid(primary)
                s_pid = _session_pid(secondary)
                if p_pid is not None and s_pid is not None and p_pid != s_pid:
                    continue
                if secondary["ended_at"] and not primary["ended_at"]:
                    primary, secondary = secondary, primary
                _merge_session_stats(primary, secondary)
                used.add(secondary["session_id"])
            merged.append(primary)
            used.add(primary["session_id"])

        # Pass B: merge by (tool, pid)
        pid_groups: dict[tuple, list[dict]] = {}
        for s in merged:
            pid = _session_pid(s)
            if pid is not None:
                key = (s["tool"], pid)
                pid_groups.setdefault(key, []).append(s)

        deduped: list[dict] = []
        consumed: set[str] = set()
        for s in merged:
            if s["session_id"] in consumed:
                continue
            pid = _session_pid(s)
            if pid is not None:
                group = pid_groups.get((s["tool"], pid), [])
                if len(group) > 1:
                    group.sort(key=lambda x: x["started_at"])
                    canonical = group[0]
                    if canonical["session_id"] in consumed:
                        continue
                    for other in group[1:]:
                        if other["session_id"] in consumed:
                            continue
                        if other["ended_at"]:
                            if canonical["ended_at"] is None or other["ended_at"] > canonical["ended_at"]:
                                canonical["ended_at"] = other["ended_at"]
                        else:
                            canonical["ended_at"] = None
                        _merge_session_stats(canonical, other)
                        consumed.add(other["session_id"])
                    if canonical["ended_at"]:
                        canonical["duration_s"] = round(
                            canonical["ended_at"] - canonical["started_at"], 1)
                    else:
                        canonical["duration_s"] = None
                    deduped.append(canonical)
                    consumed.add(canonical["session_id"])
                    continue
            deduped.append(s)
            consumed.add(s["session_id"])

        return deduped

    # ── Sessions (new) ─────────────────────────────────────────────

    def upsert_session(self, row: SessionRow) -> None:
        """Insert a session (INSERT OR IGNORE on session_id PK)."""
        conn = self._conn()
        conn.execute(
            "INSERT OR IGNORE INTO sessions"
            "(session_id, tool, pid, project_path, model, git_branch, git_commit,"
            " started_at, ended_at, source, input_tokens, output_tokens,"
            " cache_read_tokens, cache_creation_tokens, cost_usd,"
            " request_count, tool_call_count, files_modified)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (row.session_id, row.tool, row.pid, row.project_path, row.model,
             row.git_branch, row.git_commit, row.started_at, row.ended_at,
             row.source, row.input_tokens, row.output_tokens,
             row.cache_read_tokens, row.cache_creation_tokens,
             round(row.cost_usd, 6), row.request_count,
             row.tool_call_count, row.files_modified),
        )
        conn.commit()

    def link_session_process(
        self, session_id: str, pid: int,
        tool: str = "", role: str = "lead",
    ) -> None:
        """Record that a PID belongs to a session (INSERT OR IGNORE)."""
        if not session_id or not pid:
            return
        conn = self._conn()
        conn.execute(
            "INSERT OR IGNORE INTO session_processes"
            "(session_id, pid, tool, joined_at, role)"
            " VALUES(?,?,?,?,?)",
            (session_id, pid, tool, time.time(), role),
        )
        conn.commit()

    def find_session_ids_by_pid(self, pid: int) -> list[str]:
        """Return all session_ids linked to the given PID."""
        if not pid:
            return []
        conn = self._conn()
        rows = conn.execute(
            "SELECT session_id FROM session_processes WHERE pid = ?",
            (pid,),
        ).fetchall()
        return [r[0] for r in rows]

    def batch_link_sessions(
        self, entries: list[tuple[str, str, int, float, str]],
    ) -> None:
        """Batch upsert sessions and link PIDs in a single transaction.

        Each entry is (session_id, tool, pid, started_at, source).
        Replaces per-row upsert_session + link_session_process calls that
        each did a synchronous commit — this does one commit for the batch.
        """
        if not entries:
            return
        conn = self._conn()
        now = time.time()
        for session_id, tool, pid, started_at, source in entries:
            conn.execute(
                "INSERT OR IGNORE INTO sessions"
                "(session_id, tool, pid, project_path, model, git_branch,"
                " git_commit, started_at, ended_at, source, input_tokens,"
                " output_tokens, cache_read_tokens, cache_creation_tokens,"
                " cost_usd, request_count, tool_call_count, files_modified)"
                " VALUES(?,?,?,'','','','',?,NULL,?,0,0,0,0,0,0,0,0)",
                (session_id, tool, pid, started_at, source),
            )
            if session_id and pid:
                conn.execute(
                    "INSERT OR IGNORE INTO session_processes"
                    "(session_id, pid, tool, joined_at, role)"
                    " VALUES(?,?,?,?,?)",
                    (session_id, pid, tool, now, "lead"),
                )
        conn.commit()

    def update_session_end(self, session_id: str, ended_at: float, **kwargs) -> None:
        """Update session end time and optional fields."""
        conn = self._conn()
        sets = ["ended_at = ?"]
        params: list[Any] = [ended_at]
        for k in ("input_tokens", "output_tokens", "cache_read_tokens",
                   "cache_creation_tokens", "cost_usd", "request_count",
                   "tool_call_count", "files_modified"):
            if k in kwargs:
                sets.append(f"{k} = ?")
                params.append(kwargs[k])
        params.append(session_id)
        conn.execute(
            f"UPDATE sessions SET {', '.join(sets)} WHERE session_id = ?",
            params,
        )
        conn.commit()

    def update_tool_invocation_duration(
        self, dedup_key: str, duration_ms: float,
        is_error: int = 0, result_summary: str = "",
    ) -> bool:
        """Update an existing tool invocation with duration and result.

        Returns True if a row was updated, False if not found.
        Used by PostToolUse hooks to complete the record started by PreToolUse.
        """
        conn = self._conn()
        sets = ["duration_ms = ?"]
        params: list[Any] = [round(duration_ms, 1)]
        if is_error:
            sets.append("is_error = ?")
            params.append(is_error)
        if result_summary:
            sets.append("result_summary = ?")
            params.append(result_summary[:500])
        params.append(dedup_key)
        cur = conn.execute(
            f"UPDATE tool_invocations SET {', '.join(sets)} WHERE dedup_key = ?",
            params,
        )
        conn.commit()
        return cur.rowcount > 0

    def query_sessions(
        self,
        since: float | None = None,
        until: float | None = None,
        tool: str | None = None,
        active: bool | None = None,
        limit: int = 500,
    ) -> list[dict]:
        """Query sessions with optional filters."""
        conn = self._conn()
        conditions = [
            ("started_at >= ?", since),
            ("started_at <= ?", until),
            ("tool = ?", tool or None),
        ]
        if active is True:
            conditions.append(("ended_at IS NULL", ""))
        elif active is False:
            conditions.append(("ended_at IS NOT NULL", ""))

        # Special handling: active uses IS NULL, not = ?
        where_parts, params = [], []
        for expr, val in conditions:
            if val is not None and val != "":
                where_parts.append(expr)
                params.append(val)
            elif "IS NULL" in expr or "IS NOT NULL" in expr:
                where_parts.append(expr)
        where = (" WHERE " + " AND ".join(where_parts)) if where_parts else ""
        params.append(limit)
        return _rows_to_dicts(conn.execute(
            f"SELECT * FROM sessions{where} ORDER BY started_at DESC LIMIT ?",
            params,
        ))

    def query_session_flow(self, session_id: str) -> dict:
        """Return requests and tool_invocations for a session."""
        conn = self._conn()
        requests = _rows_to_dicts(conn.execute(
            "SELECT * FROM requests WHERE session_id = ? ORDER BY ts",
            (session_id,),
        ))
        invocations = _rows_to_dicts(conn.execute(
            "SELECT * FROM tool_invocations WHERE session_id = ? ORDER BY ts",
            (session_id,),
        ))
        return {"requests": requests, "tool_invocations": invocations}

    # ── Requests (new) ─────────────────────────────────────────────

    def query_requests(
        self,
        session_id: str | None = None,
        since: float | None = None,
        until: float | None = None,
        tool: str | None = None,
        limit: int = 500,
    ) -> list[dict]:
        """Query LLM requests with optional filters."""
        conn = self._conn()
        where, params = _where([
            ("session_id = ?", session_id or None),
            ("ts >= ?", since), ("ts <= ?", until),
            ("tool = ?", tool or None),
        ])
        params.append(limit)
        return _rows_to_dicts(conn.execute(
            f"SELECT * FROM requests{where} ORDER BY ts DESC LIMIT ?",
            params,
        ))

    # ── Tool invocations (new) ─────────────────────────────────────

    def query_tool_invocations(
        self,
        session_id: str | None = None,
        since: float | None = None,
        until: float | None = None,
        limit: int = 500,
    ) -> list[dict]:
        """Query tool invocations with optional filters."""
        conn = self._conn()
        where, params = _where([
            ("session_id = ?", session_id or None),
            ("ts >= ?", since), ("ts <= ?", until),
        ])
        params.append(limit)
        return _rows_to_dicts(conn.execute(
            f"SELECT * FROM tool_invocations{where} ORDER BY ts DESC LIMIT ?",
            params,
        ))

    def query_requests_analytics(
        self,
        since: float | None = None,
        until: float | None = None,
        limit: int = 2000,
    ) -> list[dict]:
        """Return lightweight request rows for analytics (no large text fields)."""
        conn = self._conn()
        where, params = _where([("ts >= ?", since), ("ts <= ?", until)])
        params.append(limit)
        return _rows_to_dicts(conn.execute(
            "SELECT ts, session_id, agent_id, model, input_tokens, output_tokens,"
            " cache_read_tokens, cost_usd, duration_ms, finish_reason, is_error"
            f" FROM requests{where} ORDER BY ts DESC LIMIT ?",
            params,
        ))

    def query_tool_invocations_agg(
        self,
        since: float | None = None,
        until: float | None = None,
    ) -> list[dict]:
        """Aggregate tool invocations by tool_name in SQL.

        Returns [{tool_name, count, total_ms, error_count}] — no per-row transfer.
        """
        conn = self._conn()
        where, params = _where([("ts >= ?", since), ("ts <= ?", until)])
        return _rows_to_dicts(conn.execute(
            "SELECT tool_name, COUNT(*) as count,"
            " SUM(duration_ms) as total_ms,"
            " SUM(CASE WHEN is_error THEN 1 ELSE 0 END) as error_count"
            f" FROM tool_invocations{where}"
            " GROUP BY tool_name ORDER BY count DESC",
            params,
        ))

    def query_tool_analytics_from_events(
        self,
        since: float | None = None,
        until: float | None = None,
    ) -> list[dict]:
        """Compute tool usage analytics by matching Pre/PostToolUse events.

        Joins events by tool_use_id to compute real durations.  This is more
        accurate than tool_invocations (which had a dedup bug) and captures
        all invocations, not just the ones that survived dedup.

        Returns [{tool_name, count, avg_ms, total_ms, error_count, durations}].
        """
        conn = self._conn()
        # Build WHERE clause for the pre-event timestamp range
        clauses = []
        params: list = []
        if since is not None:
            clauses.append("pre.ts >= ?")
            params.append(since)
        if until is not None:
            clauses.append("pre.ts <= ?")
            params.append(until)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""

        rows = _rows_to_dicts(conn.execute(
            "SELECT"
            " json_extract(pre.detail, '$.tool_name') as tool_name,"
            " COUNT(*) as count,"
            " ROUND(SUM((post.ts - pre.ts) * 1000), 1) as total_ms,"
            " ROUND(AVG((post.ts - pre.ts) * 1000), 1) as avg_ms,"
            " SUM(CASE WHEN json_extract(post.detail, '$.is_error') THEN 1 ELSE 0 END) as error_count"
            " FROM events pre"
            " JOIN events post"
            "  ON json_extract(pre.detail, '$.tool_use_id') = json_extract(post.detail, '$.tool_use_id')"
            "  AND pre.kind = 'hook:PreToolUse'"
            "  AND post.kind = 'hook:PostToolUse'"
            f"{where}"
            " GROUP BY tool_name ORDER BY count DESC",
            params,
        ))
        return rows

    def query_tool_breakdown_from_events(
        self,
        since: float | None = None,
        until: float | None = None,
    ) -> dict[str, list[dict]]:
        """Per tool_name, return count breakdown by CLI tool (claude-code, codex, …).

        Returns {tool_name: [{cli_tool, count}, …], …}.
        """
        conn = self._conn()
        clauses: list[str] = []
        params: list = []
        if since is not None:
            clauses.append("pre.ts >= ?")
            params.append(since)
        if until is not None:
            clauses.append("pre.ts <= ?")
            params.append(until)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        rows = conn.execute(
            "SELECT"
            " json_extract(pre.detail, '$.tool_name') as tool_name,"
            " pre.tool as cli_tool,"
            " COUNT(*) as count"
            " FROM events pre"
            " JOIN events post"
            "  ON json_extract(pre.detail, '$.tool_use_id') = json_extract(post.detail, '$.tool_use_id')"
            "  AND pre.kind = 'hook:PreToolUse'"
            "  AND post.kind = 'hook:PostToolUse'"
            f"{where}"
            " GROUP BY tool_name, cli_tool ORDER BY tool_name, count DESC",
            params,
        ).fetchall()
        result: dict[str, list[dict]] = {}
        for r in rows:
            tn = r[0] or "(unknown)"
            result.setdefault(tn, []).append({"cli_tool": r[1], "count": r[2]})
        return result

    def query_tool_durations_from_events(
        self,
        tool_name: str,
        since: float | None = None,
        until: float | None = None,
        limit: int = 500,
    ) -> list[float]:
        """Return raw duration_ms values for a tool from Pre/Post event matching."""
        conn = self._conn()
        clauses = ["json_extract(pre.detail, '$.tool_name') = ?"]
        params: list = [tool_name]
        if since is not None:
            clauses.append("pre.ts >= ?")
            params.append(since)
        if until is not None:
            clauses.append("pre.ts <= ?")
            params.append(until)
        where = " WHERE " + " AND ".join(clauses)
        params.append(limit)
        return [
            r[0] for r in conn.execute(
                "SELECT ROUND((post.ts - pre.ts) * 1000, 1) as duration_ms"
                " FROM events pre"
                " JOIN events post"
                "  ON json_extract(pre.detail, '$.tool_use_id') = json_extract(post.detail, '$.tool_use_id')"
                "  AND pre.kind = 'hook:PreToolUse'"
                "  AND post.kind = 'hook:PostToolUse'"
                f"{where}"
                " ORDER BY pre.ts DESC LIMIT ?",
                params,
            ).fetchall()
        ]

    def query_tool_invocations_durations(
        self,
        tool_name: str,
        since: float | None = None,
        until: float | None = None,
        limit: int = 500,
    ) -> list[float]:
        """Return raw duration_ms values for a single tool (for percentile calc)."""
        conn = self._conn()
        where, params = _where([
            ("tool_name = ?", tool_name),
            ("ts >= ?", since), ("ts <= ?", until),
        ])
        params.append(limit)
        return [row[0] for row in conn.execute(
            f"SELECT duration_ms FROM tool_invocations{where} ORDER BY ts DESC LIMIT ?",
            params,
        )]

    # ── Processes (new) ────────────────────────────────────────────

    def upsert_process(self, row: ProcessRow) -> None:
        """Insert a process (INSERT OR IGNORE on UNIQUE(pid, started_at))."""
        conn = self._conn()
        conn.execute(
            "INSERT OR IGNORE INTO processes"
            "(pid, tool, project_path, cwd, cmdline, ppid,"
            " started_at, ended_at, exit_code, source, meta)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (row.pid, row.tool, row.project_path, row.cwd, row.cmdline,
             row.ppid, row.started_at, row.ended_at, row.exit_code,
             row.source, json.dumps(row.meta)),
        )
        conn.commit()

    def update_process_exit(
        self, pid: int, started_at: float,
        ended_at: float, exit_code: int | None = None,
    ) -> None:
        """Update process exit info."""
        conn = self._conn()
        conn.execute(
            "UPDATE processes SET ended_at = ?, exit_code = ?"
            " WHERE pid = ? AND started_at = ?",
            (ended_at, exit_code, pid, started_at),
        )
        conn.commit()

    def query_processes(
        self,
        tool: str | None = None,
        active: bool | None = None,
        since: float | None = None,
    ) -> list[dict]:
        """Query processes with optional filters."""
        conn = self._conn()
        conditions = [
            ("tool = ?", tool or None),
            ("started_at >= ?", since),
        ]
        where_parts, params = [], []
        for expr, val in conditions:
            if val is not None:
                where_parts.append(expr)
                params.append(val)
        if active is True:
            where_parts.append("ended_at IS NULL")
        elif active is False:
            where_parts.append("ended_at IS NOT NULL")
        where = (" WHERE " + " AND ".join(where_parts)) if where_parts else ""
        return _rows_to_dicts(conn.execute(
            f"SELECT * FROM processes{where} ORDER BY started_at DESC",
            params,
        ))

    # ── Agents (new) ───────────────────────────────────────────────

    def upsert_agent(self, row: AgentRow) -> None:
        """Insert or replace an agent."""
        conn = self._conn()
        conn.execute(
            "INSERT OR REPLACE INTO agents"
            "(agent_id, session_id, tool, task, model, is_sidechain,"
            " started_at, ended_at, completed, input_tokens, output_tokens,"
            " cache_read_tokens, cache_creation_tokens, cost_usd)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (row.agent_id, row.session_id, row.tool, row.task, row.model,
             row.is_sidechain, row.started_at, row.ended_at, row.completed,
             row.input_tokens, row.output_tokens, row.cache_read_tokens,
             row.cache_creation_tokens, round(row.cost_usd, 6)),
        )
        conn.commit()

    def query_agents(self, session_id: str) -> list[dict]:
        """Query agents for a session."""
        conn = self._conn()
        return _rows_to_dicts(conn.execute(
            "SELECT * FROM agents WHERE session_id = ? ORDER BY started_at",
            (session_id,),
        ))

    # ── Config/env (new) ──────────────────────────────────────────

    def upsert_tool_config(
        self, ts: float, tool: str, project_path: str,
        key: str, value: str, source: str = "",
    ) -> bool:
        """Upsert tool config. Returns True if value changed."""
        conn = self._conn()
        # Check last value
        cur = conn.execute(
            "SELECT value FROM tool_config"
            " WHERE tool = ? AND project_path = ? AND key = ?"
            " ORDER BY ts DESC LIMIT 1",
            (tool, project_path, key),
        )
        row = cur.fetchone()
        if row and row[0] == value:
            return False  # unchanged
        conn.execute(
            "INSERT OR REPLACE INTO tool_config"
            "(ts, tool, project_path, key, value, source)"
            " VALUES(?,?,?,?,?,?)",
            (ts, tool, project_path, key, value, source),
        )
        conn.commit()
        return True

    def upsert_env_var(
        self, ts: float, project_path: str, tool: str,
        key: str, value: str, is_secret: bool = False,
        source: str = "",
    ) -> bool:
        """Upsert environment variable. Returns True if value changed."""
        conn = self._conn()
        cur = conn.execute(
            "SELECT value FROM environment_vars"
            " WHERE project_path = ? AND tool = ? AND key = ?"
            " ORDER BY ts DESC LIMIT 1",
            (project_path, tool, key),
        )
        row = cur.fetchone()
        if row and row[0] == value:
            return False
        conn.execute(
            "INSERT OR REPLACE INTO environment_vars"
            "(ts, project_path, tool, key, value, is_secret, source)"
            " VALUES(?,?,?,?,?,?,?)",
            (ts, project_path, tool, key, value, int(is_secret), source),
        )
        conn.commit()
        return True

    # ── Tool stats (was telemetry) ─────────────────────────────────

    def append_telemetry(self, row: ToolStatsRow | TelemetryRow) -> None:
        """Write a tool stats row (was append_telemetry)."""
        conn = self._conn()
        try:
            conn.execute(_TOOL_STATS_INSERT, _tool_stats_tuple(row))
            conn.commit()
        except sqlite3.Error as exc:
            log.warning("Tool stats write error: %s", exc)

    def append_telemetry_batch(self, rows: list[ToolStatsRow | TelemetryRow]) -> None:
        """Batch insert tool stats rows."""
        if not rows:
            return
        conn = self._conn()
        try:
            conn.executemany(_TOOL_STATS_INSERT, [_tool_stats_tuple(r) for r in rows])
            conn.commit()
        except sqlite3.Error as exc:
            log.warning("Tool stats batch write error: %s", exc)

    def query_telemetry(
        self,
        tool: str | None = None,
        since: float | None = None,
        until: float | None = None,
    ) -> list[ToolStatsRow]:
        """Return tool stats rows, optionally filtered."""
        conn = self._conn()
        where, params = _where([("tool = ?", tool or None), ("ts >= ?", since), ("ts <= ?", until)])
        cur = conn.execute(f"{_TOOL_STATS_SELECT}{where} ORDER BY ts DESC", params)
        return [_tool_stats_row(r) for r in cur.fetchall()]

    def latest_telemetry(self) -> dict[str, ToolStatsRow]:
        """Return the most recent tool stats row per tool."""
        conn = self._conn()
        cur = conn.execute(
            f"{_TOOL_STATS_SELECT}"
            " WHERE ts = (SELECT MAX(t2.ts) FROM tool_stats t2 WHERE t2.tool = tool_stats.tool)"
            " ORDER BY tool",
        )
        return {r[1]: _tool_stats_row(r) for r in cur.fetchall()}

    # ── KV file store ────────────────────────────────────────────

    def upsert_file(
        self,
        path: str,
        tool: str,
        category: str = "",
        scope: str = "",
        content: str | None = None,
        mtime: float | None = None,
        meta: dict[str, Any] | None = None,
    ) -> bool:
        """Insert or lazily update a tracked file.

        Returns True if content actually changed (new or different hash).
        """
        conn = self._conn()
        now = time.time()

        cur = conn.execute(
            "SELECT content_hash, first_seen FROM files WHERE path = ?",
            (path,),
        )
        row = cur.fetchone()
        existing_hash = row[0] if row else None
        first_seen = row[1] if row else now

        changed = False
        if content is not None:
            new_hash = _content_hash(content)
            new_tokens = _estimate_tokens(content)
            new_lines = content.count("\n") + (1 if content and not content.endswith("\n") else 0)
            new_size = len(content.encode("utf-8", errors="replace"))
            changed = existing_hash != new_hash

            last_changed = now if changed else 0
            if not changed and row:
                cur2 = conn.execute(
                    "SELECT last_changed FROM files WHERE path = ?", (path,))
                r2 = cur2.fetchone()
                last_changed = r2[0] if r2 else now

            # Store blob for large files
            blob_hash = ""
            if new_size > LARGE_FILE_THRESHOLD:
                blob_hash = self._store_blob(conn, content)

            conn.execute(
                "INSERT OR REPLACE INTO files"
                "(path, tool, category, scope, content, blob_hash, content_hash,"
                " size_bytes, tokens, lines, mtime, first_seen, last_read,"
                " last_changed, meta)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (path, tool, category, scope, content, blob_hash, new_hash,
                 new_size, new_tokens, new_lines,
                 mtime or 0, first_seen, now,
                 last_changed if changed else (row[0] if row else now) and last_changed,
                 json.dumps(meta or {})),
            )

            # Save history snapshot on change
            if changed:
                hist_content = content
                hist_blob_hash = ""
                if new_size > LARGE_FILE_THRESHOLD:
                    hist_blob_hash = blob_hash
                    hist_content = ""  # content stored in blob
                conn.execute(
                    "INSERT OR REPLACE INTO file_history"
                    "(path, ts, content, blob_hash, content_hash,"
                    " size_bytes, tokens, lines)"
                    " VALUES(?,?,?,?,?,?,?,?)",
                    (path, now, hist_content, hist_blob_hash, new_hash,
                     new_size, new_tokens, new_lines),
                )
        else:
            meta_json = json.dumps(meta or {})
            if row:
                conn.execute(
                    "UPDATE files SET tool=?, category=?, scope=?,"
                    " mtime=?, meta=? WHERE path=?",
                    (tool, category, scope, mtime or 0, meta_json, path),
                )
            else:
                conn.execute(
                    "INSERT INTO files"
                    "(path, tool, category, scope, mtime, first_seen, meta)"
                    " VALUES(?,?,?,?,?,?,?)",
                    (path, tool, category, scope, mtime or 0, now, meta_json),
                )

        conn.commit()
        return changed

    def get_file(self, path: str) -> FileEntry | None:
        """Get a tracked file by path, or None if not tracked."""
        conn = self._conn()
        cur = conn.execute(
            "SELECT path, tool, category, scope, content, blob_hash,"
            " content_hash, size_bytes, tokens, lines, mtime, first_seen,"
            " last_read, last_changed, meta"
            " FROM files WHERE path = ?",
            (path,),
        )
        row = cur.fetchone()
        return _file_entry_from_row(row) if row else None

    def list_files(
        self,
        tool: str | None = None,
        category: str | None = None,
        changed_since: float | None = None,
    ) -> list[FileEntry]:
        """List tracked files, optionally filtered.

        Does NOT return content (for efficiency) -- use get_file() for that.
        """
        conn = self._conn()
        where, params = _where([
            ("tool = ?", tool or None), ("category = ?", category or None),
            ("last_changed >= ?", changed_since),
        ])
        cur = conn.execute(
            "SELECT path, tool, category, scope, '', '',"
            " content_hash, size_bytes, tokens, lines, mtime, first_seen,"
            " last_read, last_changed, meta"
            f" FROM files{where} ORDER BY tool, category, path",
            params,
        )
        return [_file_entry_from_row(r) for r in cur.fetchall()]

    def file_history(
        self,
        path: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Return content change history for a file (most recent first)."""
        conn = self._conn()
        return _rows_to_dicts(conn.execute(
            "SELECT ts, content_hash, size_bytes, tokens, lines"
            " FROM file_history WHERE path = ? ORDER BY ts DESC LIMIT ?",
            (path, limit),
        ))

    def file_history_bulk(
        self,
        paths: list[str],
        since: float | None = None,
        until: float | None = None,
        limit_per_path: int = 100,
    ) -> dict[str, list[dict[str, Any]]]:
        """Return file_history for multiple paths, keyed by path.

        Single SQL query with ``path IN (...)`` to avoid N+1.
        """
        if not paths:
            return {}
        conn = self._conn()
        ph = _placeholders(paths)
        params: list[Any] = list(paths)
        where = f" WHERE path IN ({ph})"
        if since is not None:
            where += " AND ts >= ?"
            params.append(since)
        if until is not None:
            where += " AND ts <= ?"
            params.append(until)
        rows = _rows_to_dicts(conn.execute(
            f"SELECT path, ts, content_hash, size_bytes, tokens, lines"
            f" FROM file_history{where} ORDER BY path, ts",
            params,
        ))
        result: dict[str, list[dict[str, Any]]] = {p: [] for p in paths}
        for r in rows:
            p = r.pop("path")
            if p in result and len(result[p]) < limit_per_path:
                result[p].append(r)
        return result

    def file_content_at(self, path: str, ts: float) -> str | None:
        """Return file content at a specific historical timestamp."""
        conn = self._conn()
        cur = conn.execute(
            "SELECT content, blob_hash FROM file_history"
            " WHERE path = ? AND ts <= ? ORDER BY ts DESC LIMIT 1",
            (path, ts),
        )
        row = cur.fetchone()
        if not row:
            return None
        return self._resolve_content(conn, row[0] or "", row[1] or "")

    def remove_file(self, path: str) -> bool:
        """Remove a file from the store. Returns True if it existed."""
        conn = self._conn()
        cur = conn.execute("DELETE FROM files WHERE path = ?", (path,))
        conn.commit()
        return cur.rowcount > 0

    def sync_files_from_discovery(
        self,
        discovered: list[dict[str, Any]],
        read_content: bool = False,
    ) -> dict[str, int]:
        """Bulk sync from discovery results.

        Lazy: only reads file content when mtime differs from stored mtime.
        Returns {"added": N, "updated": N, "unchanged": N, "removed": N}.
        """
        conn = self._conn()
        now = time.time()
        stats = {"added": 0, "updated": 0, "unchanged": 0, "removed": 0}
        seen_paths: set[str] = set()

        for item in discovered:
            path = item["path"]
            seen_paths.add(path)
            tool = item.get("tool", "")
            category = item.get("category", "")
            scope = item.get("scope", "")
            mtime = item.get("mtime", 0)

            cur = conn.execute(
                "SELECT mtime, content_hash FROM files WHERE path = ?",
                (path,),
            )
            existing = cur.fetchone()

            if existing and abs(existing[0] - mtime) < 0.01:
                stats["unchanged"] += 1
                continue

            content = item.get("content")
            if content is None and read_content:
                try:
                    content = Path(path).read_text(encoding="utf-8", errors="replace")
                except OSError:
                    content = None

            if content is not None:
                changed = self.upsert_file(
                    path=path, tool=tool, category=category,
                    scope=scope, content=content, mtime=mtime,
                )
                if existing:
                    stats["updated" if changed else "unchanged"] += 1
                else:
                    stats["added"] += 1
            else:
                self.upsert_file(
                    path=path, tool=tool, category=category,
                    scope=scope, mtime=mtime,
                )
                if existing:
                    stats["unchanged"] += 1
                else:
                    stats["added"] += 1

        # Remove files no longer in discovery
        cur = conn.execute("SELECT path FROM files")
        for (stored_path,) in cur.fetchall():
            if stored_path not in seen_paths:
                self.remove_file(stored_path)
                stats["removed"] += 1

        return stats

    # ── Universal metrics (was samples) ───────────────────────────

    def query_samples(
        self,
        metric: str | None = None,
        metric_prefix: str | None = None,
        since: float | None = None,
        until: float | None = None,
        tag_filter: dict[str, str] | None = None,
        limit: int = 5000,
    ) -> list[Metric]:
        """Query metrics with optional filters.

        Backward compat: method name preserved, queries ``metrics`` table.
        """
        conn = self._conn()
        where, params = _where([
            ("metric = ?", metric or None),
            ("metric LIKE ?", (metric_prefix + "%") if metric_prefix else None),
            ("ts >= ?", since), ("ts <= ?", until),
        ])
        if tag_filter:
            prefix = " AND " if where else " WHERE "
            where += prefix + " AND ".join(
                f"json_extract(tags, '$.{k}') = ?" for k in tag_filter
            )
            params.extend(tag_filter.values())
        params.append(limit)
        cur = conn.execute(
            f"SELECT ts, metric, value, tags FROM metrics{where} ORDER BY ts DESC LIMIT ?",
            params,
        )
        return [
            Metric(ts=r[0], metric=r[1], value=r[2],
                   tags=_json(r[3]))
            for r in cur.fetchall()
        ]

    def query_samples_series(
        self,
        metric: str,
        since: float | None = None,
        until: float | None = None,
    ) -> dict[str, list]:
        """Return a single metric as column-major {ts: [...], value: [...]}.

        Optimized for time-series charting.
        """
        conn = self._conn()
        where, params = _where([("metric = ?", metric), ("ts >= ?", since), ("ts <= ?", until)])
        cur = conn.execute(
            f"SELECT ts, value FROM metrics{where} ORDER BY ts",
            params,
        )
        rows = cur.fetchall()
        if not rows:
            return {"ts": [], "value": []}
        ts_list, val_list = zip(*rows)
        return {"ts": list(ts_list), "value": list(val_list)}

    def list_metrics(self, prefix: str = "") -> list[dict[str, Any]]:
        """List distinct metric names with latest value and count."""
        conn = self._conn()
        where, params = _where([("metric LIKE ?", (prefix + "%") if prefix else None)])
        agg = _rows_to_dicts(conn.execute(
            f"SELECT metric, COUNT(*) as count, MAX(ts) as latest_ts"
            f" FROM metrics{where} GROUP BY metric ORDER BY metric",
            params,
        ))
        if not agg:
            return []
        for r in agg:
            row = conn.execute(
                "SELECT value FROM metrics WHERE metric = ? AND ts = ? LIMIT 1",
                (r["metric"], r["latest_ts"]),
            ).fetchone()
            r["last_value"] = row[0] if row else None
        return agg

    # ── UI layout queries ──────────────────────────────────────────

    def get_layout(self, slug: str = "main") -> dict[str, Any]:
        """Return the full layout tree for a dashboard as a nested dict."""
        conn = self._conn()

        row = conn.execute(
            "SELECT id, slug, title FROM ui_dashboard WHERE slug = ?",
            (slug,),
        ).fetchone()
        if not row:
            return {}
        dash_id, dash_slug, dash_title = row

        # ── Tabs + group-by options ──
        tabs: list[dict] = []
        tab_id_to_key: dict[int, str] = {}
        for t in _rows_to_dicts(conn.execute(
            "SELECT id, key, title, shortcut, sort_order, visible, icon"
            " FROM ui_tab WHERE dashboard_id = ? ORDER BY sort_order", (dash_id,),
        )):
            tab_id_to_key[t["id"]] = t["key"]
            gbo = conn.execute(
                "SELECT key, label, sort_order, is_default"
                " FROM ui_group_by_option WHERE tab_id = ? ORDER BY sort_order",
                (t["id"],),
            ).fetchall()
            tabs.append({
                "key": t["key"], "title": t["title"], "shortcut": t["shortcut"],
                "sort_order": t["sort_order"], "visible": bool(t["visible"]), "icon": t["icon"],
                "group_by_options": [
                    {"key": g[0], "label": g[1], "is_default": bool(g[3])}
                    for g in gbo
                ],
            })

        # ── Datasources ──
        ds_by_id: dict[int, str] = {}
        datasources: dict[str, dict] = {}
        for d in _rows_to_dicts(conn.execute(
            "SELECT id, key, kind, endpoint, poll_ms, config FROM ui_datasource"
        )):
            ds_by_id[d["id"]] = d["key"]
            datasources[d["key"]] = {
                "kind": d["kind"], "endpoint": d["endpoint"],
                "poll_ms": d["poll_ms"], "config": json.loads(d["config"] or "{}"),
            }

        # ── Sections + widgets ──
        sections: list[dict] = []
        for s in _rows_to_dicts(conn.execute(
            "SELECT id, key, title, sort_order, visible, collapsed, columns, tab_id"
            " FROM ui_section WHERE dashboard_id = ? ORDER BY sort_order", (dash_id,),
        )):
            widgets: list[dict] = []
            for w in _rows_to_dicts(conn.execute(
                "SELECT id, key, kind, title, sort_order, col_span, row_span,"
                " visible, config"
                " FROM ui_widget WHERE section_id = ? ORDER BY sort_order", (s["id"],),
            )):
                wd_rows = conn.execute(
                    "SELECT datasource_id, role"
                    " FROM ui_widget_datasource WHERE widget_id = ?",
                    (w["id"],),
                ).fetchall()
                widgets.append({
                    "key": w["key"], "kind": w["kind"], "title": w["title"],
                    "sort_order": w["sort_order"], "col_span": w["col_span"],
                    "row_span": w["row_span"], "visible": bool(w["visible"]),
                    "config": json.loads(w["config"] or "{}"),
                    "datasources": [
                        {"key": ds_by_id.get(wd[0], ""), "role": wd[1]}
                        for wd in wd_rows
                    ],
                })
            sections.append({
                "key": s["key"], "title": s["title"], "sort_order": s["sort_order"],
                "visible": bool(s["visible"]), "collapsed": bool(s["collapsed"]),
                "columns": s["columns"],
                "tab_key": tab_id_to_key.get(s["tab_id"]) if s["tab_id"] else None,
                "widgets": widgets,
            })

        # ── Preferences ──
        prefs = {
            r[0]: r[1]
            for r in conn.execute(
                "SELECT pref_key, pref_value FROM ui_preference"
                " WHERE dashboard_id = ? AND user_id IS NULL",
                (dash_id,),
            ).fetchall()
        }

        return {
            "slug": dash_slug,
            "title": dash_title,
            "tabs": tabs,
            "sections": sections,
            "datasources": datasources,
            "preferences": prefs,
        }

    def set_preference(
        self,
        dashboard_slug: str,
        pref_key: str,
        pref_value: str,
        user_id: str | None = None,
    ) -> None:
        """Upsert a single UI preference."""
        conn = self._conn()
        dash_id = self._get_dashboard_id(conn, dashboard_slug)
        if not dash_id:
            return
        if user_id is None:
            conn.execute(
                "DELETE FROM ui_preference"
                " WHERE dashboard_id = ? AND user_id IS NULL AND pref_key = ?",
                (dash_id, pref_key),
            )
            conn.execute(
                "INSERT INTO ui_preference(dashboard_id, user_id, pref_key, pref_value)"
                " VALUES(?, NULL, ?, ?)",
                (dash_id, pref_key, pref_value),
            )
        else:
            conn.execute(
                "INSERT INTO ui_preference(dashboard_id, user_id, pref_key, pref_value)"
                " VALUES(?, ?, ?, ?)"
                " ON CONFLICT(dashboard_id, user_id, pref_key)"
                " DO UPDATE SET pref_value = excluded.pref_value",
                (dash_id, user_id, pref_key, pref_value),
            )
        conn.commit()

    def get_preferences(
        self,
        dashboard_slug: str,
        user_id: str | None = None,
    ) -> dict[str, str]:
        """Get all preferences for a dashboard."""
        conn = self._conn()
        dash_id = self._get_dashboard_id(conn, dashboard_slug)
        if not dash_id:
            return {}
        prefs = dict(conn.execute(
            "SELECT pref_key, pref_value FROM ui_preference"
            " WHERE dashboard_id = ? AND user_id IS NULL",
            (dash_id,),
        ).fetchall())
        if user_id is not None:
            prefs.update(conn.execute(
                "SELECT pref_key, pref_value FROM ui_preference"
                " WHERE dashboard_id = ? AND user_id = ?",
                (dash_id, user_id),
            ).fetchall())
        return prefs

    # ── Layout import / export ─────────────────────────────────────

    def reorder_sections(self, section_keys: list[str]) -> None:
        """Update sort_order for sections based on the provided key order."""
        conn = self._conn()
        for i, key in enumerate(section_keys):
            conn.execute(
                "UPDATE ui_section SET sort_order = ? WHERE key = ?",
                (i, key),
            )
        conn.commit()

    def reorder_widgets(self, section_key: str, widget_keys: list[str]) -> None:
        """Update sort_order for widgets within a section."""
        conn = self._conn()
        section_id = conn.execute(
            "SELECT id FROM ui_section WHERE key = ?", (section_key,)
        ).fetchone()
        if not section_id:
            return
        for i, key in enumerate(widget_keys):
            conn.execute(
                "UPDATE ui_widget SET sort_order = ? WHERE section_id = ? AND key = ?",
                (i, section_id[0], key),
            )
        conn.commit()

    def _get_dashboard_id(self, conn: sqlite3.Connection, slug: str) -> int | None:
        row = conn.execute("SELECT id FROM ui_dashboard WHERE slug = ?", (slug,)).fetchone()
        return row[0] if row else None

    def _update_ui_row(self, table: str, key: str, allowed: set[str], **kwargs) -> None:
        conn = self._conn()
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(f"UPDATE {table} SET {set_clause} WHERE key = ?", (*updates.values(), key))
        conn.commit()

    def update_section(self, key: str, **kwargs) -> None:
        """Update section fields (visible, collapsed, title, columns)."""
        self._update_ui_row("ui_section", key, {"visible", "collapsed", "title", "columns"}, **kwargs)

    def update_widget(self, key: str, **kwargs) -> None:
        """Update widget fields (visible, title, sort_order, config, col_span, row_span)."""
        self._update_ui_row("ui_widget", key, {"visible", "title", "sort_order", "config", "col_span", "row_span"}, **kwargs)

    def export_layout(self, slug: str = "main") -> str:
        """Export a dashboard layout as a JSON string."""
        return json.dumps(self.get_layout(slug), indent=2)

    def import_layout(self, data: dict[str, Any]) -> None:
        """Import a full dashboard layout from a nested dict.

        Replaces all ``ui_*`` rows belonging to the given dashboard slug.
        """
        conn = self._conn()
        slug = data.get("slug", "main")
        title = data.get("title", slug)

        conn.execute(
            "INSERT INTO ui_dashboard(slug, title)"
            " VALUES(?, ?)"
            " ON CONFLICT(slug) DO UPDATE SET"
            " title = excluded.title,"
            " updated_at = strftime('%s','now')",
            (slug, title),
        )
        dash_id = conn.execute(
            "SELECT id FROM ui_dashboard WHERE slug = ?", (slug,)
        ).fetchone()[0]

        # Clear old child rows
        old_section_ids = [r[0] for r in conn.execute(
            "SELECT id FROM ui_section WHERE dashboard_id = ?", (dash_id,)
        ).fetchall()]
        if old_section_ids:
            ph = _placeholders(old_section_ids)
            old_widget_ids = [r[0] for r in conn.execute(
                f"SELECT id FROM ui_widget WHERE section_id IN ({ph})",
                old_section_ids,
            ).fetchall()]
            if old_widget_ids:
                conn.execute(
                    f"DELETE FROM ui_widget_datasource WHERE widget_id IN ({_placeholders(old_widget_ids)})",
                    old_widget_ids,
                )
            conn.execute(f"DELETE FROM ui_widget WHERE section_id IN ({ph})", old_section_ids)
        conn.execute("DELETE FROM ui_section WHERE dashboard_id = ?", (dash_id,))

        old_tab_ids = [r[0] for r in conn.execute(
            "SELECT id FROM ui_tab WHERE dashboard_id = ?", (dash_id,)
        ).fetchall()]
        if old_tab_ids:
            conn.execute(
                f"DELETE FROM ui_group_by_option WHERE tab_id IN ({_placeholders(old_tab_ids)})",
                old_tab_ids,
            )
        conn.execute("DELETE FROM ui_tab WHERE dashboard_id = ?", (dash_id,))
        conn.execute(
            "DELETE FROM ui_preference WHERE dashboard_id = ?", (dash_id,)
        )
        conn.execute("DELETE FROM ui_datasource")

        # Insert tabs
        tab_key_to_id: dict[str, int] = {}
        for t in data.get("tabs", []):
            conn.execute(
                "INSERT INTO ui_tab"
                "(dashboard_id, key, title, shortcut, sort_order, visible, icon)"
                " VALUES(?,?,?,?,?,?,?)",
                (dash_id, t["key"], t.get("title", t["key"]),
                 t.get("shortcut"), t.get("sort_order", 0),
                 int(t.get("visible", True)), t.get("icon")),
            )
            tab_key_to_id[t["key"]] = _last_id(conn)
            for g in t.get("group_by_options", []):
                conn.execute(
                    "INSERT INTO ui_group_by_option"
                    "(tab_id, key, label, sort_order, is_default)"
                    " VALUES(?,?,?,?,?)",
                    (tab_key_to_id[t["key"]], g["key"], g.get("label", g["key"]),
                     g.get("sort_order", 0), int(g.get("is_default", False))),
                )

        # Insert datasources
        ds_key_to_id: dict[str, int] = {}
        for dkey, ds in data.get("datasources", {}).items():
            conn.execute(
                "INSERT INTO ui_datasource(key, kind, endpoint, poll_ms, config)"
                " VALUES(?,?,?,?,?)",
                (dkey, ds.get("kind", "rest"), ds.get("endpoint"),
                 ds.get("poll_ms"), json.dumps(ds.get("config", {}))),
            )
            ds_key_to_id[dkey] = _last_id(conn)

        # Insert sections + widgets
        for s in data.get("sections", []):
            tab_id = tab_key_to_id.get(s.get("tab_key")) if s.get("tab_key") else None
            conn.execute(
                "INSERT INTO ui_section"
                "(dashboard_id, tab_id, key, title, sort_order, visible,"
                " collapsed, columns)"
                " VALUES(?,?,?,?,?,?,?,?)",
                (dash_id, tab_id, s["key"], s.get("title", s["key"]),
                 s.get("sort_order", 0), int(s.get("visible", True)),
                 int(s.get("collapsed", False)), s.get("columns")),
            )
            sec_id = _last_id(conn)
            for w in s.get("widgets", []):
                conn.execute(
                    "INSERT INTO ui_widget"
                    "(section_id, key, kind, title, sort_order, col_span,"
                    " row_span, visible, config)"
                    " VALUES(?,?,?,?,?,?,?,?,?)",
                    (sec_id, w["key"], w.get("kind", "stat"),
                     w.get("title", w["key"]), w.get("sort_order", 0),
                     w.get("col_span", 1), w.get("row_span", 1),
                     int(w.get("visible", True)),
                     json.dumps(w.get("config", {}))),
                )
                wid = _last_id(conn)
                for wd in w.get("datasources", []):
                    ds_id = ds_key_to_id.get(wd.get("key"))
                    if ds_id:
                        conn.execute(
                            "INSERT INTO ui_widget_datasource"
                            "(widget_id, datasource_id, role) VALUES(?,?,?)",
                            (wid, ds_id, wd.get("role", "primary")),
                        )

        # Insert preferences
        for pkey, pval in data.get("preferences", {}).items():
            conn.execute(
                "INSERT INTO ui_preference"
                "(dashboard_id, user_id, pref_key, pref_value)"
                " VALUES(?, NULL, ?, ?)",
                (dash_id, pkey, str(pval)),
            )

        conn.commit()

    # ── CSV spec sync ──────────────────────────────────────────────

    def _sync_csv_to_db(self, conn: sqlite3.Connection) -> None:
        """Load CSV specs from registry into path_defs and process_defs tables."""
        try:
            from .tools import get_registry
            registry = get_registry()
            self._sync_path_specs(conn, registry.path_specs())
            self._sync_process_specs(conn, registry.process_specs())
        except Exception as exc:
            log.warning("Failed to sync CSV specs to DB: %s", exc)

    @staticmethod
    def _sync_path_specs(conn: sqlite3.Connection, specs: list) -> None:
        """Upsert path specs into the path_defs table."""
        conn.execute("DELETE FROM path_defs")
        conn.executemany(
            "INSERT INTO path_defs"
            "(path_template, ai_tool, vendor, host, platform, hidden, scope,"
            " category, sent_to_llm, approx_tokens, read_write,"
            " survives_compaction, cacheable, loaded_when, path_args,"
            " description, resolution, root_strategy)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                (s.path_template, s.ai_tool, s.vendor, s.host,
                 s.platform, int(s.hidden), s.scope, s.category,
                 s.sent_to_llm, s.approx_tokens, s.read_write,
                 s.survives_compaction, s.cacheable, s.loaded_when,
                 s.path_args, s.description, s.resolution, s.root_strategy)
                for s in specs
            ],
        )
        conn.commit()

    @staticmethod
    def _sync_process_specs(conn: sqlite3.Connection, specs: list) -> None:
        """Upsert process specs into the process_defs table."""
        conn.execute("DELETE FROM process_defs")
        conn.executemany(
            "INSERT INTO process_defs"
            "(process_name, ai_tool, vendor, host, process_type, runtime,"
            " parent_process, starts_at, stops_at, is_daemon, auto_start,"
            " listens_port, outbound_targets, memory_idle_mb, memory_active_mb,"
            " known_leak, leak_pattern, zombie_risk, cleanup_command,"
            " ps_grep_pattern, platform, description)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                (s.process_name, s.ai_tool, s.vendor, s.host,
                 s.process_type, s.runtime, s.parent_process,
                 s.starts_at, s.stops_at, int(s.is_daemon), int(s.auto_start),
                 s.listens_port, s.outbound_targets, s.memory_idle_mb,
                 s.memory_active_mb, int(s.known_leak), s.leak_pattern,
                 s.zombie_risk, s.cleanup_command, s.ps_grep_pattern,
                 s.platform, s.description)
                for s in specs
            ],
        )
        conn.commit()

    def sync_specs(self) -> dict[str, int]:
        """Re-sync CSV specs from registry to SQLite.

        Returns {"path_specs": N, "process_specs": N}.
        """
        conn = self._conn()
        self._sync_csv_to_db(conn)
        path_count = conn.execute("SELECT COUNT(*) FROM path_defs").fetchone()[0]
        proc_count = conn.execute("SELECT COUNT(*) FROM process_defs").fetchone()[0]
        return {"path_specs": path_count, "process_specs": proc_count}

    def query_path_specs(
        self,
        tool: str | None = None,
        vendor: str | None = None,
        host: str | None = None,
        category: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query path specs with optional filters."""
        conn = self._conn()
        where, params = _where([
            ("ai_tool = ?", tool or None), ("vendor = ?", vendor or None),
            ("host LIKE ?", (f"%{host}%") if host else None),
            ("category = ?", category or None),
        ])
        return _rows_to_dicts(conn.execute(
            f"SELECT * FROM path_defs{where} ORDER BY ai_tool, category, path_template",
            params,
        ))

    def query_process_specs(
        self,
        tool: str | None = None,
        vendor: str | None = None,
        host: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query process specs with optional filters."""
        conn = self._conn()
        where, params = _where([
            ("ai_tool = ?", tool or None), ("vendor = ?", vendor or None),
            ("host LIKE ?", (f"%{host}%") if host else None),
        ])
        return _rows_to_dicts(conn.execute(
            f"SELECT * FROM process_defs{where} ORDER BY ai_tool, process_name",
            params,
        ))

    # ── Datapoint Catalog ────────────────────────────────────────

    def query_datapoint_catalog(
        self,
        tab: str | None = None,
        key: str | None = None,
        source_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query the datapoint catalog with optional filters."""
        conn = self._conn()
        where, params = _where([
            ("tab = ?", tab or None), ("key = ?", key or None),
            ("source_type = ?", source_type or None),
        ])
        rows = _rows_to_dicts(conn.execute(
            f"SELECT * FROM datapoint_catalog{where} ORDER BY tab, section, key",
            params,
        ))
        for d in rows:
            d["dynamic_source"] = bool(d.get("dynamic_source"))
            d["source_dynamic"] = _json(d.get("source_dynamic"))
        return rows

    def update_datapoint_source(
        self, key: str, source_dynamic: dict[str, Any]
    ) -> None:
        """Update the dynamic source provenance for a catalog entry."""
        conn = self._conn()
        conn.execute(
            "UPDATE datapoint_catalog SET source_dynamic=?, updated_at=? WHERE key=?",
            (json.dumps(source_dynamic, default=str), time.time(), key),
        )
        conn.commit()

    def sync_datapoint_catalog(self) -> int:
        """Re-sync catalog from YAML. Returns count of entries loaded."""
        conn = self._conn()
        self._sync_datapoint_catalog(conn)
        cur = conn.execute("SELECT COUNT(*) FROM datapoint_catalog")
        return cur.fetchone()[0]

    # ── Stats ──────────────────────────────────────────────────────

    def stats(self) -> dict[str, Any]:
        """Return DB size, row counts, and time range."""
        conn = self._conn()
        result: dict[str, Any] = {}
        # File size
        if isinstance(self._path, Path) and self._path.exists():
            result["file_size_bytes"] = self._path.stat().st_size
        else:
            result["file_size_bytes"] = 0

        # Row counts -- map old names for backward compat
        table_map = {
            "system_snapshots": "metrics",      # old: metrics_count
            "process_snapshots": "tool_metrics", # old: tool_metrics_count
            "events": "events",
            "files": "file_store",               # old: file_store_count
            "file_history": "file_history",
            "path_defs": "path_specs",           # old: path_specs_count
            "process_defs": "process_specs",     # old: process_specs_count
            "metrics": "samples",                # old: samples_count
        }
        for real_table, compat_name in table_map.items():
            cur = conn.execute(f"SELECT COUNT(*) FROM {real_table}")
            result[f"{compat_name}_count"] = cur.fetchone()[0]

        # Additional new table counts
        for table in ("sessions", "requests", "tool_invocations",
                       "processes", "agents", "tool_stats"):
            cur = conn.execute(f"SELECT COUNT(*) FROM {table}")
            result[f"{table}_count"] = cur.fetchone()[0]

        # Time range (from system_snapshots)
        cur = conn.execute("SELECT MIN(ts), MAX(ts) FROM system_snapshots")
        row = cur.fetchone()
        result["earliest_ts"] = row[0]
        result["latest_ts"] = row[1]

        # File store totals
        cur = conn.execute(
            "SELECT COUNT(*), SUM(size_bytes), SUM(tokens) FROM files")
        row = cur.fetchone()
        result["files_tracked"] = row[0] or 0
        result["files_total_bytes"] = row[1] or 0
        result["files_total_tokens"] = row[2] or 0
        return result

    # ── Compaction ─────────────────────────────────────────────────

    def compact(self) -> dict[str, int]:
        """Downsample old data and delete expired rows.

        Returns dict of {action: rows_affected}.
        """
        now = time.time()
        conn = self._conn()
        result: dict[str, int] = {}

        # 1. Delete system_snapshots older than 30 days
        cutoff_30d = now - _30D
        cur = conn.execute("DELETE FROM system_snapshots WHERE ts < ?", (cutoff_30d,))
        result["metrics_deleted_30d"] = cur.rowcount
        cur = conn.execute("DELETE FROM process_snapshots WHERE ts < ?", (cutoff_30d,))
        result["tool_metrics_deleted_30d"] = cur.rowcount

        # 2. Downsample system_snapshots 7d-30d to 5-minute buckets
        cutoff_7d = now - _7D
        result["metrics_compacted_7d"] = self._downsample(
            conn, "system_snapshots", cutoff_30d, cutoff_7d, bucket_secs=300,
        )
        result["tool_metrics_compacted_7d"] = self._downsample_process_snapshots(
            conn, cutoff_30d, cutoff_7d, bucket_secs=300,
        )

        # 3. Downsample 24h-7d to 1-minute buckets
        cutoff_24h = now - _24H
        result["metrics_compacted_24h"] = self._downsample(
            conn, "system_snapshots", cutoff_7d, cutoff_24h, bucket_secs=60,
        )
        result["tool_metrics_compacted_24h"] = self._downsample_process_snapshots(
            conn, cutoff_7d, cutoff_24h, bucket_secs=60,
        )

        # 4. Delete events older than 30 days
        cur = conn.execute("DELETE FROM events WHERE ts < ?", (cutoff_30d,))
        result["events_deleted_30d"] = cur.rowcount

        # 5. Delete metrics (was samples) older than 7 days
        cur = conn.execute("DELETE FROM metrics WHERE ts < ?", (cutoff_7d,))
        result["samples_deleted_7d"] = cur.rowcount

        # 6. Downsample metrics 24h-7d
        self._downsample_metrics(conn, cutoff_7d, cutoff_24h, bucket_secs=300)

        # 7. Downsample metrics 1h-24h
        cutoff_1h = now - _1H
        self._downsample_metrics(conn, cutoff_24h, cutoff_1h, bucket_secs=60)

        # 8. Delete tool_stats older than 30 days
        cur = conn.execute("DELETE FROM tool_stats WHERE ts < ?", (cutoff_30d,))
        result["telemetry_deleted_30d"] = cur.rowcount

        # 9. Delete file_history older than 30 days
        cur = conn.execute("DELETE FROM file_history WHERE ts < ?", (cutoff_30d,))
        result["file_history_deleted_30d"] = cur.rowcount

        # 10. Delete old requests/tool_invocations older than 30 days
        cur = conn.execute("DELETE FROM requests WHERE ts < ?", (cutoff_30d,))
        result["requests_deleted_30d"] = cur.rowcount
        cur = conn.execute("DELETE FROM tool_invocations WHERE ts < ?", (cutoff_30d,))
        result["tool_invocations_deleted_30d"] = cur.rowcount

        conn.commit()
        return result

    def _downsample_metrics(
        self,
        conn: sqlite3.Connection,
        since: float,
        until: float,
        bucket_secs: int,
    ) -> None:
        """Keep only one metric row per metric per time bucket in the given range."""
        conn.execute("""
            DELETE FROM metrics WHERE rowid NOT IN (
                SELECT MAX(rowid) FROM metrics
                WHERE ts >= ? AND ts < ?
                GROUP BY metric, CAST(ts / ? AS INTEGER)
            ) AND ts >= ? AND ts < ?
        """, (since, until, bucket_secs, since, until))

    # Backward compat alias
    _downsample_samples = _downsample_metrics

    def _downsample(
        self,
        conn: sqlite3.Connection,
        table: str,
        since: float,
        until: float,
        bucket_secs: int,
    ) -> int:
        """Replace rows in [since, until) with bucket averages."""
        cur = conn.execute(
            f"SELECT COUNT(*) FROM {table} WHERE ts >= ? AND ts < ?",
            (since, until),
        )
        count = cur.fetchone()[0]
        if count == 0:
            return 0

        bucket_expr = f"CAST(ts / {bucket_secs} AS INTEGER) * {bucket_secs}"
        sql = f"""
            SELECT {bucket_expr} as bucket_ts,
                   AVG(cpu_percent), '[]',
                   AVG(memory_used_mb), AVG(memory_total_mb),
                   CAST(AVG(active_sessions) AS INTEGER),
                   CAST(AVG(active_processes) AS INTEGER),
                   AVG(ai_token_rate),
                   CAST(AVG(files) AS INTEGER), CAST(AVG(tokens) AS INTEGER),
                   CAST(AVG(mcp) AS INTEGER), CAST(AVG(mem_tokens) AS INTEGER),
                   CAST(AVG(memory_entries) AS INTEGER),
                   CAST(AVG(live_sessions) AS INTEGER),
                   CAST(AVG(live_tokens) AS INTEGER),
                   AVG(live_in_rate), AVG(live_out_rate)
            FROM {table}
            WHERE ts >= ? AND ts < ?
            GROUP BY {bucket_expr}
        """
        buckets = conn.execute(sql, (since, until)).fetchall()
        if not buckets:
            return 0

        conn.execute(
            f"DELETE FROM {table} WHERE ts >= ? AND ts < ?",
            (since, until),
        )
        conn.executemany(
            f"INSERT OR REPLACE INTO {table}"
            f"(ts, cpu_percent, cpu_per_core,"
            f" memory_used_mb, memory_total_mb,"
            f" active_sessions, active_processes, ai_token_rate,"
            f" files, tokens, mcp, mem_tokens,"
            f" memory_entries, live_sessions, live_tokens,"
            f" live_in_rate, live_out_rate)"
            f" VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            buckets,
        )
        return count - len(buckets)

    def _downsample_process_snapshots(
        self,
        conn: sqlite3.Connection,
        since: float,
        until: float,
        bucket_secs: int,
    ) -> int:
        """Downsample process_snapshots in [since, until) by pid+bucket."""
        cur = conn.execute(
            "SELECT COUNT(*) FROM process_snapshots WHERE ts >= ? AND ts < ?",
            (since, until),
        )
        count = cur.fetchone()[0]
        if count == 0:
            return 0

        bucket_expr = f"CAST(ts / {bucket_secs} AS INTEGER) * {bucket_secs}"
        sql = f"""
            SELECT {bucket_expr} as bucket_ts, pid, tool,
                   AVG(cpu_percent), AVG(memory_rss_mb),
                   AVG(memory_vms_mb),
                   CAST(AVG(open_files) AS INTEGER),
                   CAST(AVG(threads) AS INTEGER)
            FROM process_snapshots
            WHERE ts >= ? AND ts < ?
            GROUP BY {bucket_expr}, pid
        """
        buckets = conn.execute(sql, (since, until)).fetchall()
        if not buckets:
            return 0

        conn.execute(
            "DELETE FROM process_snapshots WHERE ts >= ? AND ts < ?",
            (since, until),
        )
        conn.executemany(
            "INSERT OR REPLACE INTO process_snapshots"
            "(ts, pid, tool, cpu_percent, memory_rss_mb,"
            " memory_vms_mb, open_files, threads)"
            " VALUES(?,?,?,?,?,?,?,?)",
            buckets,
        )
        return count - len(buckets)

    # Backward compat alias
    _downsample_tool = _downsample_process_snapshots

    # ── Lifecycle ──────────────────────────────────────────────────

    def close(self) -> None:
        """Flush remaining buffers and close."""
        self._closed = True
        if self._flush_thread and self._flush_thread.is_alive():
            self._flush_stop.set()
            self._flush_thread.join(timeout=5.0)
        self.flush()
        conn = getattr(self._local, "conn", None)
        if conn:
            conn.close()
            self._local.conn = None

    def __enter__(self) -> HistoryDB:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
