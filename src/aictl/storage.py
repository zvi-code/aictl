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

import fnmatch
import functools
import hashlib
import json
import logging
import math
import re
import sqlite3
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .data.provenance import SOURCE_RANK, row_provenance, usage_provenance
from .ingesters._common import project_key
from .platforms import config_dir
from .storage_migrations import CURRENT_VERSION as SCHEMA_VERSION
from .storage_migrations import apply_pending as _apply_pending_migrations
from .tool_scope import UNATTRIBUTED_IDS, stored_ids_for

log = logging.getLogger(__name__)

# ─── Defaults ──────────────────────────────────────────────────────

_SOURCE_FILE_EXTS = (
    ".py", ".js", ".ts", ".jsx", ".tsx", ".css", ".html", ".go", ".rs", ".java", ".rb", ".sh",
    ".md", ".toml", ".yaml", ".yml", ".json",
)
DEFAULT_DB_PATH = config_dir() / "history.db"
FLUSH_INTERVAL = 10.0  # seconds between batch writes
# SCHEMA_VERSION is re-exported from aictl.storage_migrations so the
# migrations package remains the single source of truth.
LARGE_FILE_THRESHOLD = 100_000  # bytes; files larger than this use blob storage

# ── File sync content policy ──────────────────────────────────────
# Files larger than this are tracked metadata-only (no content/blob).
# mtime IS stored for them, so they are intentionally not re-read on
# every sync pass.
FILE_SYNC_MAX_CONTENT_BYTES = 512 * 1024
# Per-pass content-read budget (first-run flood control). Files beyond
# the budget are skipped entirely — NOT upserted — so their stored mtime
# cannot mask them; they retry on the next pass.
FILE_SYNC_MAX_READS = 250
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


# Largest WAL file SQLite keeps on disk after a checkpoint resets it.
WAL_SIZE_LIMIT_BYTES = 64 * 1024 * 1024
# Rows removed per transaction by compact(); keeps WAL growth and writer lock
# holds small on a DB of any size.
COMPACT_CHUNK_ROWS = 5000
# Long enough for SQLite's busy wait, which sleeps up to 100 ms, to see the gap. With a
# shorter pause, a long cleanup can keep the other writers out until they time out.
COMPACT_CHUNK_PAUSE_S = 0.15
# A cleanup loop rests this many times as long as its last chunk took, so on a big
# database it uses about a fifth of one core and leaves room for other writers.
COMPACT_REST_RATIO = 4.0
# How long a write waits for the lock, and the time after which a write is logged.
BUSY_TIMEOUT_S = 15.0
SLOW_WRITE_S = 3.0
# A health row that does not change is written again after this time, not on each poll.
QUALITY_REWRITE_S = 60.0
# Pages returned to the OS per automatic maintenance pass (64 MB).
INCREMENTAL_VACUUM_PAGES = 16384

# Retention thresholds (seconds)
_1H = 3_600
_24H = 86_400
_7D = 7 * _24H
_30D = 30 * _24H

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
CREATE TABLE IF NOT EXISTS session_commits (
    session_id TEXT NOT NULL, sha TEXT NOT NULL,
    author_name TEXT DEFAULT '', author_email TEXT DEFAULT '',
    ts REAL NOT NULL, subject TEXT DEFAULT '',
    PRIMARY KEY (session_id, sha)
);
CREATE INDEX IF NOT EXISTS idx_session_commits_sid ON session_commits(session_id);
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
    http_status INTEGER DEFAULT 0, source TEXT DEFAULT '', prompt_id TEXT DEFAULT '',
    ttft_ms REAL DEFAULT 0, tool_tokens INTEGER, max_prompt_tokens INTEGER,
    request_bytes INTEGER, available_tools INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_dedup ON requests(dedup_key) WHERE dedup_key != '';

-- Compactions and context splits that a tool records. A NULL is a value it did not report.
CREATE TABLE IF NOT EXISTS context_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '', ts REAL, session_id TEXT,
    agent_id TEXT DEFAULT '', tool TEXT, kind TEXT, trigger TEXT DEFAULT '',
    before_tokens INTEGER, after_tokens INTEGER, duration_ms REAL,
    current_tokens INTEGER, system_tokens INTEGER, conversation_tokens INTEGER, tool_tokens INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_context_events_dedup ON context_events(dedup_key) WHERE dedup_key != '';
CREATE INDEX IF NOT EXISTS idx_context_events_session ON context_events(session_id, ts);

CREATE TABLE IF NOT EXISTS tool_invocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '',
    ts REAL NOT NULL, session_id TEXT DEFAULT '', request_id INTEGER DEFAULT 0,
    tool TEXT DEFAULT '', tool_name TEXT DEFAULT '', project_path TEXT DEFAULT '',
    pid INTEGER DEFAULT 0, is_error INTEGER DEFAULT 0, duration_ms REAL DEFAULT 0,
    input TEXT DEFAULT '{}', result_summary TEXT DEFAULT '', source TEXT DEFAULT '',
    source_event_id TEXT DEFAULT '', agent_id TEXT DEFAULT '', confirm TEXT DEFAULT '',
    confirm_wait_ms REAL DEFAULT 0, target TEXT DEFAULT '', exit_code INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_inv_dedup ON tool_invocations(dedup_key) WHERE dedup_key != '';

-- ═══ Prompts and skills, one row per use ═══

CREATE TABLE IF NOT EXISTS session_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '', ts REAL, session_id TEXT,
    agent_id TEXT DEFAULT '', tool TEXT, project_path TEXT, text TEXT DEFAULT '', prompt_file TEXT DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_prompts_dedup ON session_prompts(dedup_key) WHERE dedup_key != '';
CREATE INDEX IF NOT EXISTS idx_session_prompts_ts ON session_prompts(ts);
CREATE INDEX IF NOT EXISTS idx_session_prompts_session ON session_prompts(session_id, ts);
CREATE TABLE IF NOT EXISTS skill_uses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '', ts REAL, session_id TEXT,
    agent_id TEXT DEFAULT '', tool TEXT, project_path TEXT, name TEXT, trigger TEXT DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_uses_dedup ON skill_uses(dedup_key) WHERE dedup_key != '';
CREATE INDEX IF NOT EXISTS idx_skill_uses_ts ON skill_uses(ts);
CREATE INDEX IF NOT EXISTS idx_skill_uses_session ON skill_uses(session_id, ts);

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
CREATE TABLE IF NOT EXISTS file_write_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '',
    ts REAL NOT NULL, session_id TEXT DEFAULT '', tool TEXT DEFAULT '',
    tool_name TEXT DEFAULT '', operation TEXT DEFAULT '', path TEXT NOT NULL,
    project_path TEXT DEFAULT '', pid INTEGER DEFAULT 0,
    source_event_kind TEXT DEFAULT '', source_event_id TEXT DEFAULT '',
    content_hash TEXT DEFAULT '', size_bytes INTEGER DEFAULT 0,
    detail TEXT DEFAULT '{}'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_write_dedup
    ON file_write_events(dedup_key) WHERE dedup_key != '';

CREATE TABLE IF NOT EXISTS maintenance_state (
    key TEXT PRIMARY KEY, value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS data_quality_status (
    component TEXT NOT NULL, source TEXT NOT NULL DEFAULT '',
    kind TEXT DEFAULT '', status TEXT NOT NULL, severity TEXT DEFAULT '',
    message TEXT DEFAULT '', updated_at REAL NOT NULL, last_ok_at REAL DEFAULT 0,
    count INTEGER DEFAULT 1, detail TEXT DEFAULT '{}',
    PRIMARY KEY (component, source)
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
CREATE INDEX IF NOT EXISTS idx_file_write_session ON file_write_events(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_file_write_path ON file_write_events(path, ts);
CREATE INDEX IF NOT EXISTS idx_file_write_tool ON file_write_events(tool, ts);
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
-- data quality
CREATE INDEX IF NOT EXISTS idx_data_quality_status ON data_quality_status(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_data_quality_kind ON data_quality_status(kind, updated_at);
-- spec tables
CREATE INDEX IF NOT EXISTS idx_path_defs_tool ON path_defs(ai_tool);
CREATE INDEX IF NOT EXISTS idx_process_defs_tool ON process_defs(ai_tool);

-- ═══ Memory snapshots (Claude Code session start/end capture) ═══

CREATE TABLE IF NOT EXISTS memory_snapshots (
    session_id TEXT NOT NULL,
    phase      TEXT NOT NULL CHECK(phase IN ('start','end')),
    path       TEXT NOT NULL,
    sha        TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    ts         REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, phase, path)
);
CREATE INDEX IF NOT EXISTS idx_memory_snapshots_session
    ON memory_snapshots(session_id, phase);

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

-- Cursor conversations ingester (Slice 3.3).
CREATE TABLE IF NOT EXISTS cursor_session_messages (
    session_id    TEXT NOT NULL,
    source_row_id INTEGER NOT NULL PRIMARY KEY,
    role          TEXT DEFAULT '',
    content       TEXT DEFAULT '',
    ts            REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cursor_session_messages_session
    ON cursor_session_messages(session_id, ts);

-- Copilot CLI session-store ingester (Slice 3.2).
CREATE TABLE IF NOT EXISTS copilot_session_messages (
    session_id     TEXT NOT NULL,
    source_row_id  INTEGER NOT NULL,
    source_table   TEXT NOT NULL DEFAULT '',
    role           TEXT DEFAULT '',
    content        TEXT DEFAULT '',
    ts             REAL NOT NULL DEFAULT 0,
    ingested_at    REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (source_table, source_row_id)
);
CREATE INDEX IF NOT EXISTS idx_copilot_session_messages_session
    ON copilot_session_messages(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_copilot_session_messages_ts
    ON copilot_session_messages(ts);

-- VS Code Copilot Chat log ingester (Slice 3.4a).
CREATE TABLE IF NOT EXISTS session_usage (
    session_id TEXT PRIMARY KEY, tool TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'transcript', quality TEXT NOT NULL DEFAULT 'exact',
    quality_reason TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '',
    models_json TEXT NOT NULL DEFAULT '{}', daily_json TEXT NOT NULL DEFAULT '{}',
    input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0, cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
    request_count INTEGER NOT NULL DEFAULT 0, tool_call_count INTEGER NOT NULL DEFAULT 0,
    turn_count INTEGER NOT NULL DEFAULT 0, cost_usd REAL,
    cost_quality TEXT NOT NULL DEFAULT 'unknown', cost_reason TEXT NOT NULL DEFAULT '',
    unpriced_models TEXT NOT NULL DEFAULT '[]', billing_unit TEXT NOT NULL DEFAULT '',
    billing_amount REAL, premium_requests REAL, estimated_list_usd REAL,
    started_at REAL NOT NULL DEFAULT 0,
    last_activity_at REAL NOT NULL DEFAULT 0, project_path TEXT NOT NULL DEFAULT '',
    updated_at REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_session_usage_last ON session_usage(last_activity_at);

CREATE TABLE IF NOT EXISTS vscode_chat_messages (
    session_id     TEXT NOT NULL,
    source_file    TEXT NOT NULL,
    source_row_id  INTEGER NOT NULL,
    role           TEXT DEFAULT '',
    content        TEXT DEFAULT '',
    model          TEXT DEFAULT '',
    ts             REAL NOT NULL DEFAULT 0,
    ingested_at    REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, source_file, source_row_id)
);
CREATE INDEX IF NOT EXISTS idx_vscode_chat_messages_session
    ON vscode_chat_messages(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_vscode_chat_messages_file
    ON vscode_chat_messages(source_file);
"""


# ─── Data types ────────────────────────────────────────────────────


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
class CallFacts:
    """Rows read from a tool's own session files, written in one transaction."""

    requests: list[RequestRow] = field(default_factory=list)
    tools: list[ToolInvocationRow] = field(default_factory=list)
    prompts: list[SessionPromptRow] = field(default_factory=list)
    skills: list[SkillUseRow] = field(default_factory=list)
    agents: list[AgentRow] = field(default_factory=list)
    file_writes: list[FileWriteRow] = field(default_factory=list)
    context_events: list[ContextEventRow] = field(default_factory=list)

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


# ─── Tool stats SQL helpers ───────────────────────────────────────


def _tool_stats_row(r: tuple) -> ToolStatsRow:
    return ToolStatsRow(
        ts=r[0],
        tool=r[1],
        source=r[2],
        confidence=r[3],
        input_tokens=r[4],
        output_tokens=r[5],
        cache_read_tokens=r[6],
        cache_creation_tokens=r[7],
        total_sessions=r[8],
        total_messages=r[9],
        cost_usd=r[10],
        model=r[11],
        by_model=_json(r[12]),
        by_project=_json(r[13]) if len(r) > 13 else {},
    )


def _tool_stats_tuple(r: ToolStatsRow) -> tuple:
    return (
        r.ts,
        r.tool,
        r.source,
        round(r.confidence, 2),
        r.input_tokens,
        r.output_tokens,
        r.cache_read_tokens,
        r.cache_creation_tokens,
        r.total_sessions,
        r.total_messages,
        round(r.cost_usd, 4),
        r.model,
        json.dumps(r.by_model),
        json.dumps(r.by_project),
    )


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

# System snapshot keys (for column-major output)
SYSTEM_SNAPSHOT_KEYS = [
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
]

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
_METRICS_KEYS = METRICS_KEYS  # backward-compat alias


# ─── Helpers ──────────────────────────────────────────────────────


def _content_hash(content: str) -> str:
    """SHA-256 hex digest of content string."""
    return hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()[:16]


def _dedup_key(*parts: str) -> str:
    """Compute a 16-char hex dedup key from string parts."""
    combined = "".join(parts)
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()[:16]


# ``source`` of rows read from a tool's own session files. These are the complete
# record of a session, so they replace other writers' rows for the same calls.
TRANSCRIPT_SOURCE = "transcript"
_SUPERSEDED_SOURCES = {
    "requests": ("otel", "claude-code-jsonl"),
    "tool_invocations": ("otel", "hook"),
}
# Re-sent in full on every change of a team, so it must not return after removal.
_SUPERSEDED_REQUEST_SOURCES_ALWAYS = frozenset({"claude-code-jsonl"})


def _sessions_read_from_transcripts(conn: sqlite3.Connection, rows: list[RequestRow]) -> set[str]:
    candidates = {r.session_id for r in rows if r.source in _SUPERSEDED_REQUEST_SOURCES_ALWAYS and r.session_id}
    return {
        sid
        for sid in candidates
        if conn.execute(
            "SELECT 1 FROM requests WHERE session_id = ? AND source = ? LIMIT 1", (sid, TRANSCRIPT_SOURCE)
        ).fetchone()
    }


_REQUEST_UPSERT = (
    "INSERT INTO requests(dedup_key, ts, session_id, agent_id, tool, project_path, model, input_tokens,"
    " output_tokens, cache_read_tokens, cache_creation_tokens, cost_usd, duration_ms, finish_reason,"
    " is_error, error_type, http_status, source, ttft_ms, tool_tokens, max_prompt_tokens, request_bytes,"
    " available_tools)"
    " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    " ON CONFLICT(dedup_key) WHERE dedup_key != '' DO UPDATE SET"
    " input_tokens=excluded.input_tokens, output_tokens=excluded.output_tokens,"
    " cache_read_tokens=excluded.cache_read_tokens, cache_creation_tokens=excluded.cache_creation_tokens,"
    " cost_usd=excluded.cost_usd, tool=excluded.tool,"
    " tool_tokens=COALESCE(excluded.tool_tokens, requests.tool_tokens),"
    " max_prompt_tokens=COALESCE(excluded.max_prompt_tokens, requests.max_prompt_tokens),"
    " request_bytes=COALESCE(excluded.request_bytes, requests.request_bytes),"
    " available_tools=COALESCE(excluded.available_tools, requests.available_tools),"
    " model=CASE WHEN excluded.model NOT IN ('', 'unknown') THEN excluded.model ELSE requests.model END,"
    " agent_id=CASE WHEN excluded.agent_id != '' THEN excluded.agent_id ELSE requests.agent_id END,"
    " project_path=CASE WHEN excluded.project_path != '' THEN excluded.project_path ELSE requests.project_path END,"
    " duration_ms=CASE WHEN excluded.duration_ms > 0 THEN excluded.duration_ms ELSE requests.duration_ms END,"
    " ttft_ms=CASE WHEN excluded.ttft_ms > 0 THEN excluded.ttft_ms ELSE requests.ttft_ms END,"
    " finish_reason=CASE WHEN excluded.finish_reason != '' THEN excluded.finish_reason ELSE requests.finish_reason END"
)


def _request_params(r: RequestRow) -> tuple:
    return (
        r.dedup_key,
        r.ts,
        r.session_id,
        r.agent_id,
        r.tool,
        r.project_path,
        r.model,
        r.input_tokens,
        r.output_tokens,
        r.cache_read_tokens,
        r.cache_creation_tokens,
        round(r.cost_usd, 6),
        round(r.duration_ms, 1),
        r.finish_reason,
        r.is_error,
        r.error_type,
        r.http_status,
        TRANSCRIPT_SOURCE,
        round(r.ttft_ms, 1),
        r.tool_tokens,
        r.max_prompt_tokens,
        r.request_bytes,
        r.available_tools,
    )


_TOOL_UPSERT = (
    "INSERT INTO tool_invocations(dedup_key, ts, session_id, tool, tool_name, project_path, is_error, duration_ms,"
    " input, result_summary, source, source_event_id, agent_id, confirm, confirm_wait_ms, target, exit_code)"
    " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    " ON CONFLICT(dedup_key) WHERE dedup_key != '' DO UPDATE SET tool=excluded.tool,"
    " is_error=MAX(tool_invocations.is_error, excluded.is_error),"
    " duration_ms=CASE WHEN excluded.duration_ms > 0 THEN excluded.duration_ms ELSE tool_invocations.duration_ms END,"
    " input=CASE WHEN excluded.input != '{}' THEN excluded.input ELSE tool_invocations.input END,"
    " result_summary=CASE WHEN excluded.result_summary != '' THEN excluded.result_summary"
    " ELSE tool_invocations.result_summary END,"
    " agent_id=CASE WHEN excluded.agent_id != '' THEN excluded.agent_id ELSE tool_invocations.agent_id END,"
    " project_path=CASE WHEN excluded.project_path != '' THEN excluded.project_path ELSE tool_invocations.project_path END,"
    " confirm=CASE WHEN excluded.confirm != '' THEN excluded.confirm ELSE tool_invocations.confirm END,"
    " confirm_wait_ms=CASE WHEN excluded.confirm_wait_ms > 0 THEN excluded.confirm_wait_ms"
    " ELSE tool_invocations.confirm_wait_ms END,"
    " target=CASE WHEN excluded.target != '' THEN excluded.target ELSE tool_invocations.target END,"
    " exit_code=COALESCE(excluded.exit_code, tool_invocations.exit_code)"
)


def _tool_params(r: ToolInvocationRow) -> tuple:
    return (
        r.dedup_key,
        r.ts,
        r.session_id,
        r.tool,
        r.tool_name,
        r.project_path,
        r.is_error,
        round(r.duration_ms, 1),
        json.dumps(r.input) if isinstance(r.input, dict) else r.input,
        r.result_summary,
        TRANSCRIPT_SOURCE,
        r.source_event_id,
        r.agent_id,
        r.confirm,
        round(r.confirm_wait_ms, 1),
        r.target,
        r.exit_code,
    )


_SUBAGENT_UPSERT = (
    "INSERT INTO agents(agent_id, session_id, tool, task, model, is_sidechain, started_at, ended_at, completed)"
    " VALUES(?,?,?,?,?,1,?,?,?)"
    " ON CONFLICT(agent_id) DO UPDATE SET session_id=excluded.session_id, tool=excluded.tool, is_sidechain=1,"
    " task=CASE WHEN excluded.task != '' THEN excluded.task ELSE agents.task END,"
    " model=CASE WHEN excluded.model != '' THEN excluded.model ELSE agents.model END,"
    " started_at=CASE WHEN agents.started_at > 0 AND (excluded.started_at <= 0 OR agents.started_at < excluded.started_at)"
    " THEN agents.started_at ELSE excluded.started_at END,"
    " ended_at=COALESCE(excluded.ended_at, agents.ended_at),"
    " completed=MAX(agents.completed, excluded.completed)"
)


def _subagent_params(r: AgentRow) -> tuple:
    return (r.agent_id, r.session_id, r.tool, r.task, r.model, r.started_at, r.ended_at, r.completed)


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


# ``aictl hooks verify`` pings use this id. New pings no longer create a row,
# but rows from before that fix are still on disk and must not count as sessions.
_VERIFY_SESSION_ID = "aictl-verify"
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


def _profile_all_ids(p: dict) -> list[str]:
    """Every session id a profile is known by: primary first, then alternates."""
    ids = [p.get("session_id", "")]
    ids += list(p.get("alt_session_ids") or [])
    return [i for i in ids if i]


def _merge_profile_identity(keep: dict, absorbed: dict) -> None:
    """Union the session ids of two merged profiles onto *keep* (in-place).

    A merged profile must stay reachable by EVERY id it was ever known
    by — flow turns / transcript / requests are stored under the tool's
    own session UUID while process-level data is stored under the
    correlator ``tool:pid:ts`` id.  Dropping the absorbed id (the old
    behaviour) made the dashboard query flow data with an id that has
    none, rendering rich sessions as empty.

    The primary ``session_id`` prefers a UUID-bearing id (same priority
    as ``analysis.session_id.resolve_session_id``: UUID > correlator);
    all other ids land in ``alt_session_ids``.
    """
    ids: list[str] = []
    for sid in _profile_all_ids(keep) + _profile_all_ids(absorbed):
        if sid not in ids:
            ids.append(sid)
    if len(ids) <= 1:
        return
    # A correlator id encodes the PID — keep it on the structured field
    # before the id may be swapped away.
    if not keep.get("pid"):
        pid_str = _session_pid(keep)
        if pid_str:
            keep["pid"] = int(pid_str)
    canonical = ids[0]
    if _session_uuid(canonical) is None:
        canonical = next((sid for sid in ids if _session_uuid(sid) is not None), canonical)
    keep["session_id"] = canonical
    keep["alt_session_ids"] = [s for s in ids if s != canonical]


def _absorb_session_profile(canonical: dict, other: dict) -> None:
    """Fold *other* into *canonical* as one logical session (in-place).

    Union of the two activity intervals; a still-open row wins over an
    ended one (same convention as the (tool, pid) merge pass).
    """
    canonical["started_at"] = min(canonical["started_at"], other["started_at"])
    if canonical["ended_at"] is not None and other["ended_at"] is not None:
        canonical["ended_at"] = max(canonical["ended_at"], other["ended_at"])
    else:
        canonical["ended_at"] = None
    if canonical["ended_at"]:
        canonical["duration_s"] = round(canonical["ended_at"] - canonical["started_at"], 1)
    else:
        canonical["duration_s"] = None
    canonical["active"] = canonical["ended_at"] is None
    _merge_session_stats(canonical, other)
    _merge_profile_identity(canonical, other)


def _profiles_look_duplicate(a: dict, b: dict) -> bool:
    """True when two same-tool profiles look like duplicate observations
    of one logical session recorded under different PIDs/ids.

    The duplicate signature: both activity intervals overlap for >= 80%
    of the shorter one AND the durations are within 20% of each other.
    Genuinely concurrent sessions in different workspaces never merge —
    a workspace conflict (both known, different) vetoes the match.
    """
    ws_a = project_key(a.get("project_path"))
    ws_b = project_key(b.get("project_path"))
    if ws_a and ws_b and ws_a != ws_b:
        return False
    end_a, end_b = a.get("ended_at"), b.get("ended_at")
    if not end_a or not end_b:
        return False
    dur_a = end_a - a["started_at"]
    dur_b = end_b - b["started_at"]
    shorter = min(dur_a, dur_b)
    longer = max(dur_a, dur_b)
    if shorter <= 0 or longer <= 0:
        return False
    if shorter / longer < 0.8:
        return False
    overlap = min(end_a, end_b) - max(a["started_at"], b["started_at"])
    return overlap / shorter >= 0.8


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
        e.ts,
        e.tool,
        e.kind,
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


# Tag keys are interpolated into json_extract() paths (SQLite cannot
# parameterize JSON paths), so they must be strictly validated to prevent
# SQL injection via attacker-controlled query params.
_TAG_KEY_RE = re.compile(r"^[A-Za-z0-9_.-]+$")


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


def _effective_tool_sql(alias: str, session_alias: str) -> str:
    """SQL for the tool of a row: its own, or its session's when it stored none."""
    return (
        f"(CASE WHEN {alias}.tool IN ({_placeholders(list(UNATTRIBUTED_IDS))})"
        f" THEN COALESCE({session_alias}.tool, '') ELSE {alias}.tool END)"
    )


def _session_join(alias: str, session_alias: str) -> str:
    return (
        f" LEFT JOIN sessions {session_alias} ON {session_alias}.session_id = {alias}.session_id"
        f" AND {alias}.session_id != ''"
    )


def _tool_scope(alias: str, session_alias: str, tools: tuple[str, ...] | list[str] | None) -> tuple[str, str, list]:
    """Restrict rows of `alias` (events, requests, tool_invocations) to the selected tools.

    Returns ``(join_sql, condition_sql, params)``; all three are empty when `tools`
    is None (all tools) and the condition is ``1 = 0`` for an empty selection. A row
    that stored no tool takes the tool of its session, the only other place that
    holds one. Values travel as ``?`` placeholders only. The condition has no
    leading AND, and its params follow the caller's own WHERE params.
    """
    if tools is None:
        return "", "", []
    join = _session_join(alias, session_alias)
    stored = stored_ids_for(tools)
    if not stored:
        return join, "1 = 0", []
    cond = f"{_effective_tool_sql(alias, session_alias)} IN ({_placeholders(stored)})"
    return join, cond, [*UNATTRIBUTED_IDS, *stored]


def _unattributed_scope(alias: str, session_alias: str) -> tuple[str, str, list]:
    """Join, condition and params that match rows with no tool, even after the session lookup."""
    cond = f"{_effective_tool_sql(alias, session_alias)} IN ({_placeholders(list(UNATTRIBUTED_IDS))})"
    return _session_join(alias, session_alias), cond, [*UNATTRIBUTED_IDS, *UNATTRIBUTED_IDS]


def _and(where: str, cond: str) -> str:
    """Add a condition to a WHERE string built by _where (which may be empty)."""
    if not cond:
        return where
    return f"{where} AND {cond}" if where else f" WHERE {cond}"


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
        path=row[0],
        tool=row[1],
        category=row[2],
        scope=row[3],
        content=row[4] or "",
        blob_hash=row[5] or "",
        content_hash=row[6] or "",
        size_bytes=row[7],
        tokens=row[8],
        lines=row[9],
        mtime=row[10],
        first_seen=row[11],
        last_read=row[12],
        last_changed=row[13],
        meta=_json(row[14]),
    )


def _metric_row_tuple(s: Metric) -> tuple:
    """Convert a Metric to a tuple for INSERT."""
    tags = s.tags if isinstance(s.tags, dict) else {}
    return (
        s.ts,
        s.metric,
        s.value,
        json.dumps(s.tags),
        tags.get("tool", ""),
        tags.get("project_path", ""),
        tags.get("session_id", ""),
    )


# ─── HistoryDB ─────────────────────────────────────────────────────


# Session totals that only ever grow; see update_session_stats / update_session_end.
_SESSION_COUNTER_FIELDS = frozenset(
    {
        "input_tokens",
        "output_tokens",
        "cache_read_tokens",
        "cache_creation_tokens",
        "cost_usd",
        "request_count",
        "tool_call_count",
        "files_modified",
    }
)

CAPTURE_FULL = "full"
CAPTURE_METADATA = "metadata"
CAPTURE_OFF = "off"

# Hard ceiling and budget for the in-memory store (capture=off, or fallback).
MEMORY_BUDGET_BYTES = 64 * 1024 * 1024
# Budget eviction stops at this share of the budget, so it does not run again
# for every few new rows.
BUDGET_TARGET_RATIO = 0.9
# Consecutive flushes that may hit a locked DB before giving up on the file.
LOCKED_FLUSHES_BEFORE_FALLBACK = 6

# Conversation text and tool payloads: (table, time column, {column: blank value}).
# Everything else in these rows (tokens, cost, timings, names, sizes) stays.
_TEXT_COLUMNS: tuple[tuple[str, str, dict[str, str]], ...] = (
    ("vscode_chat_messages", "ts", {"content": ""}),
    ("cursor_session_messages", "ts", {"content": ""}),
    ("copilot_session_messages", "ts", {"content": ""}),
    ("session_prompts", "ts", {"text": ""}),
    ("tool_invocations", "ts", {"input": "{}", "result_summary": "", "target": ""}),
    ("file_history", "ts", {"content": ""}),
    ("agents", "started_at", {"task": ""}),
    ("files", "last_read", {"content": ""}),
    ("file_blobs", "created_at", {"content": ""}),
)
# Columns a trim blanks but a write guard must not, because each writer already
# stores only what the mode allows: a subagent role, or a command reduced to its
# program name. The board needs these to group subagents and find test runs.
_WRITER_GUARDED_COLUMNS = frozenset({("agents", "task"), ("tool_invocations", "target")})
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
# Removed oldest-first, after text, when the disk budget is still exceeded.
# Sessions, requests, agents and files stay: they hold the totals, and context
# inventories live in their own tables that eviction never lists.
_EVICTION_ORDER = (
    # Blanking text inside a small row frees no page, so these rows go first.
    "vscode_chat_messages",
    "cursor_session_messages",
    "copilot_session_messages",
    "metrics",
    "events",
    "process_snapshots",
    "system_snapshots",
    "tool_stats",
    "file_history",
    # Usage records go last: they are what the dashboard reports.
    "context_events",
    "session_prompts",
    "skill_uses",
    "file_write_events",
    "tool_invocations",
    "requests",
)
# A row of these tables stays this long, even over the limit. Other data can use the
# space, and removing the recent record of what happened would not make room for it.
_EVICT_ONLY_OLDER = frozenset({"context_events", "session_prompts", "skill_uses", "file_write_events", "tool_invocations", "requests"})
EVICT_KEEP_DAYS = 7


class _BufferedCursor:
    """Result of one statement, already read, so no statement stays open."""

    def __init__(self, cur: sqlite3.Cursor) -> None:
        self.description = cur.description
        self.rowcount = cur.rowcount
        self.lastrowid = cur.lastrowid
        self._rows = cur.fetchall() if cur.description else []
        self._next = 0

    def fetchone(self) -> Any:
        if self._next >= len(self._rows):
            return None
        self._next += 1
        return self._rows[self._next - 1]

    def fetchall(self) -> list:
        rows = self._rows[self._next :]
        self._next = len(self._rows)
        return rows

    def __iter__(self) -> Any:
        return iter(self.fetchall())


class _SharedConnection:
    """One in-memory connection used by all threads, one call at a time.

    A memory DB exists per connection, so threads must share it. Transactions of
    different threads can interleave; this store is disposable, so that is fine.
    """

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn
        self._lock = threading.RLock()

    def execute(self, sql: str, params: Any = ()) -> _BufferedCursor:
        with self._lock:
            return _BufferedCursor(self._conn.execute(sql, params))

    def executemany(self, sql: str, rows: Any) -> _BufferedCursor:
        with self._lock:
            return _BufferedCursor(self._conn.executemany(sql, rows))

    def executescript(self, sql: str) -> None:
        with self._lock:
            self._conn.executescript(sql)

    def commit(self) -> None:
        with self._lock:
            self._conn.commit()

    def rollback(self) -> None:
        with self._lock:
            self._conn.rollback()

    def __getattr__(self, name: str) -> Any:
        return getattr(self._conn, name)

    def __enter__(self) -> _SharedConnection:
        return self

    def __exit__(self, exc_type: Any, *_args: Any) -> None:
        if exc_type is None:
            self.commit()
        else:
            self.rollback()


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


# Liveness heartbeats carry no usage data; one per minute is enough to show that
# the emitter is alive. They can otherwise make up half of all stored events.
_HEARTBEAT_EVENT_MIN_GAP_S = {"otel:health": 60.0, "otel:proc_stats": 60.0}

_RETENTION_TABLES = (
    "system_snapshots",
    "process_snapshots",
    "events",
    "metrics",
    "tool_stats",
    "file_history",
    "requests",
    "tool_invocations",
    "session_prompts",
    "skill_uses",
    "context_events",
)


def _table_bytes(conn: sqlite3.Connection, table: str, sizes: dict[str, int]) -> int:
    """Bytes of ``table`` and its indexes from a dbstat result (0 when absent)."""
    names = [table, *(r[1] for r in conn.execute(f"PRAGMA index_list({table})"))]
    return sum(sizes.get(n, 0) for n in names)


def _named_write(name: str) -> Callable:
    """Record a write while it runs, and log it when it holds the database for long."""

    def wrap(method: Callable) -> Callable:
        @functools.wraps(method)
        def run(self: HistoryDB, *args: Any, **kwargs: Any) -> Any:
            stack = self._writers.setdefault(threading.get_ident(), [])
            started = time.monotonic()
            stack.append((name, started))
            try:
                return method(self, *args, **kwargs)
            finally:
                stack.pop()
                took = time.monotonic() - started
                if took >= SLOW_WRITE_S:
                    log.warning("Database write %s took %.1f s", name, took)

        return run

    return wrap


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

    # Max rows kept per buffer when a failed flush re-buffers its batch.
    # Beyond this, the oldest rows are dropped (and recorded as a
    # data-quality event) so a persistently failing DB can't grow memory
    # without bound.
    _REBUFFER_CAP: int = 10_000

    def __init__(
        self,
        db_path: Path | str | None = None,
        flush_interval: float = FLUSH_INTERVAL,
        datapoint_logger: Any | None = None,
        retention_days: int = 30,
        capture: str = CAPTURE_FULL,
        max_total_mb: int = 1024,
        content_retention_days: int = 14,
        log_paths: tuple[Path, ...] = (),
        memory_fallback: bool = False,
    ) -> None:
        if db_path is None:
            db_path = DEFAULT_DB_PATH
        self._retention_days = retention_days
        self.capture = capture
        self._budget_bytes = max_total_mb * 1024 * 1024
        self._content_retention_days = content_retention_days
        self._log_paths = log_paths
        # The daemon survives on memory. A CLI command must see the error instead:
        # compacting an empty memory store would report success on a broken DB.
        self._memory_fallback = memory_fallback
        # In-memory mode shares one connection across threads. None: file DB.
        self._shared_conn: sqlite3.Connection | None = None
        self._schema_ready = False
        self.degraded_reason = ""
        self._locked_flushes = 0
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
        self._writers: dict[int, list[tuple[str, float]]] = {}
        self._rewriting_file = False  # a lock during VACUUM is expected and ends
        self._quality_seen: dict[tuple[str, str], tuple[str, str, float]] = {}
        self._closed = False

        # Last stored ts per (tool, kind) for rate-limited heartbeat events
        self._heartbeat_last: dict[tuple[str, str], float] = {}
        self._flush_failed_with: sqlite3.Error | None = None

        # Event listeners — callables receiving EventRow on append
        self._event_listeners: list = []

        # Create schema. Storage is a disposable cache: when the file cannot be
        # used the daemon keeps running on memory and reports it in health.
        if capture == CAPTURE_OFF:
            self._open_memory_store()
        else:
            try:
                if isinstance(self._path, Path):
                    self._path.parent.mkdir(parents=True, exist_ok=True)
                self._init_schema()
                self._mark_text_gap_if_not_full()
            except (sqlite3.Error, OSError) as exc:
                if not memory_fallback:
                    raise
                self._fall_back_to_memory(f"cannot open {self._path}: {exc}")

        # Background flush thread
        self._flush_stop = threading.Event()
        self._flush_thread: threading.Thread | None = None
        if flush_interval > 0:
            self._flush_thread = threading.Thread(target=self._flush_loop, daemon=True, name="aictl-db-flush")
            self._flush_thread.start()

    # ── Connection management ──────────────────────────────────────

    def _conn(self) -> sqlite3.Connection:
        """Return a per-thread connection with WAL mode (or the shared memory one)."""
        if self._shared_conn is not None:
            return self._shared_conn
        conn = getattr(self._local, "conn", None)
        if conn is None:
            path = str(self._path) if isinstance(self._path, Path) else self._path
            conn = sqlite3.connect(path, timeout=BUSY_TIMEOUT_S)
            # New databases return pages to the OS through incremental vacuum.
            # Must precede journal_mode, which writes the header; no effect on
            # an existing DB until ``aictl db compact`` runs VACUUM.
            conn.execute("PRAGMA auto_vacuum=INCREMENTAL")
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA cache_size=-8000")  # 8 MB
            # Bound the WAL: checkpoint every ~4 MB and truncate the file back
            # to the limit on reset, so one big transaction cannot leave a
            # WAL of hundreds of MB behind for good.
            conn.execute("PRAGMA wal_autocheckpoint=1000")
            conn.execute(f"PRAGMA journal_size_limit={WAL_SIZE_LIMIT_BYTES}")
            self._local.conn = conn
            if self._schema_ready:
                self._install_capture_guards(conn)
        return conn

    def _open_memory_store(self) -> None:
        """One bounded in-memory DB. No file, WAL or journal touches the disk."""
        conn = _SharedConnection(sqlite3.connect(":memory:", check_same_thread=False, timeout=5.0))
        page_size = conn.execute("PRAGMA page_size").fetchone()[0]
        conn.execute(f"PRAGMA max_page_count={MEMORY_BUDGET_BYTES // page_size}")
        self._shared_conn = conn
        self._schema_ready = False
        self._budget_bytes = min(self._budget_bytes, MEMORY_BUDGET_BYTES)
        self._init_schema()

    def _fall_back_to_memory(self, reason: str) -> None:
        log.warning("Storage degraded, continuing in memory: %s", reason)
        self.degraded_reason = reason
        self._open_memory_store()

    def _note_flush_error(self, exc: sqlite3.Error) -> None:
        """Move to memory when the file is full, corrupt or stays locked."""
        if not self._memory_fallback or self._rewriting_file:
            return
        if self._shared_conn is not None:
            # Memory store at its ceiling: make room; the batch retries or drops.
            try:
                self.enforce_budget()
            except sqlite3.Error as evict_exc:
                log.debug("Memory eviction failed: %s", evict_exc)
            return
        text = str(exc).lower()
        if "locked" in text or "busy" in text:
            self._locked_flushes += 1
            if self._locked_flushes >= LOCKED_FLUSHES_BEFORE_FALLBACK:
                self._fall_back_to_memory(f"database stayed locked: {exc}")
        elif any(k in text for k in ("disk", "full", "malformed", "not a database", "i/o", "readonly")):
            self._fall_back_to_memory(f"write failed: {exc}")

    def _keeps_text(self) -> bool:
        return self.capture == CAPTURE_FULL and self._shared_conn is None

    def _install_capture_guards(self, conn: sqlite3.Connection) -> None:
        """Blank text columns on this connection's writes unless text is kept.

        TEMP triggers cover every writer that goes through ``_conn()``, including
        ingesters and code added later, and need no schema change.
        """
        if self._keeps_text():
            return
        for table, _ts, columns in _TEXT_COLUMNS:
            for column, blank in columns.items():
                if (table, column) in _WRITER_GUARDED_COLUMNS:
                    continue
                when = f"new.{column} != '{blank}'"
                action = f"UPDATE main.{table} SET {column}='{blank}' WHERE rowid=new.rowid"
                for op, spec in (("insert", "INSERT"), ("update", f"UPDATE OF {column}")):
                    conn.execute(
                        f"CREATE TEMP TRIGGER IF NOT EXISTS strip_{table}_{column}_{op} AFTER {spec}"
                        f" ON main.{table} WHEN {when} BEGIN {action}; END"
                    )

    def _set_state(self, key: str, value: float) -> None:
        conn = self._conn()
        conn.execute("INSERT OR REPLACE INTO maintenance_state(key, value) VALUES(?,?)", (key, value))
        conn.commit()

    def _mark_text_gap_if_not_full(self) -> None:
        if self.capture != CAPTURE_FULL:
            self._set_state("content_trimmed_before", time.time())

    def content_retained(self, session: dict) -> bool:
        """Whether conversation text for this session row may still be stored."""
        if not self._keeps_text():
            return False
        row = self._conn().execute("SELECT value FROM maintenance_state WHERE key='content_trimmed_before'").fetchone()
        if row is None:
            return True
        last = session.get("ended_at") or session.get("started_at") or session.get("last_seen") or 0
        # A live session has no end yet, so it counts as recent.
        return session.get("active", False) or last >= row[0]

    def _init_schema(self) -> None:
        conn = self._conn()
        # Check if schema_version table exists to detect pre-v20 DB
        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
        has_schema_table = cur.fetchone() is not None

        current = 0
        if has_schema_table:
            cur = conn.execute("SELECT MAX(version) FROM schema_version")
            row = cur.fetchone()
            current = row[0] if row and row[0] else 0

        # Apply pre-baseline migrations (e.g. dropping legacy tables that
        # would collide with the new baseline DDL). For an existing DB
        # we run every migration whose target version is above ``current``
        # BEFORE executing the baseline, so that drops happen first and
        # ALTERs happen against freshly-created tables.
        if current > 0 and current < SCHEMA_VERSION:
            _apply_pending_migrations(conn, current)

        conn.executescript(_SCHEMA_SQL)

        # Fresh install: seed data tables
        if current == 0:
            self._sync_csv_to_db(conn)
            self._seed_ui_layout(conn)

        # Record the schema version. Migrated DBs already had each step
        # recorded inside its migration transaction (see apply_pending);
        # this covers fresh installs and is a no-op re-record otherwise.
        if current < SCHEMA_VERSION:
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
        self._schema_ready = True
        self._install_capture_guards(conn)

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
        conn.execute("INSERT OR IGNORE INTO ui_dashboard(id, slug, title) VALUES(1, 'main', 'aictl live dashboard')")

        # ── Tabs (7) ──────────────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_tab"
            "(id, dashboard_id, key, title, shortcut, sort_order, icon)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                (1, 1, "overview", "Overview", "1", 0, "\U0001f4ca"),  # 📊
                (2, 1, "procs", "Processes", "2", 1, "\u2699\ufe0f"),  # ⚙️
                (3, 1, "mcp", "MCP Servers", "3", 2, "\U0001f517"),  # 🔗
                (4, 1, "memory", "AI Context", "4", 3, "\U0001f4dd"),  # 📝
                (5, 1, "live", "Live Monitor", "5", 4, "\U0001f4e1"),  # 📡
                (6, 1, "events", "Events & Stats", "6", 5, "\U0001f4c8"),  # 📈
                (7, 1, "budget", "Token Budget", "7", 6, "\U0001f4b0"),  # 💰
            ],
        )

        # ── Sections ──────────────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_section"
            "(id, dashboard_id, tab_id, key, title, sort_order, columns)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                # Global header sections
                (1, 1, None, "sparklines", "Sparklines", 0, 4),
                (2, 1, None, "inventory", "Inventory", 1, 4),
                (3, 1, None, "live_metrics", "Live Monitor", 2, 4),
                (4, 1, None, "event_timeline", "Event Timeline", 3, 1),
                (5, 1, None, "resource_bars", "Resource Bars", 4, 1),
                # Tab-scoped sections
                (6, 1, 6, "tool_charts", "Per-Tool Charts", 0, 4),
                (7, 1, 1, "overview_tools", "Tool Cards", 0, 1),
                (8, 1, 1, "overview_memory", "AI Context & Memory", 1, 1),
                (9, 1, 2, "procs_cores", "CPU Cores", 0, 1),
                (10, 1, 2, "procs_tree", "Process Tree", 1, 1),
                (11, 1, 3, "mcp_servers", "MCP Servers", 0, 1),
                (12, 1, 4, "memory_groups", "Memory Files", 0, 1),
                (13, 1, 5, "live_diagnostics", "Diagnostics & Sessions", 0, 1),
                (14, 1, 7, "budget_verified", "Verified Token Usage", 0, 1),
                (15, 1, 7, "budget_context", "Context Window", 1, 1),
                (16, 1, 7, "budget_breakdown", "Token Breakdown", 2, 1),
            ],
        )

        # ── Widgets (20) ──────────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_widget"
            "(id, section_id, key, kind, title, sort_order, config)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                # Sparklines section (id=1) — time-series charts
                (
                    1,
                    1,
                    "files",
                    "sparkline",
                    "Files",
                    0,
                    '{"field":"files","metric":"discovery.files","format":"raw","color":"var(--accent)"}',
                ),
                (
                    2,
                    1,
                    "tokens",
                    "sparkline",
                    "Tokens",
                    1,
                    '{"field":"tokens","metric":"discovery.tokens","format":"kilo","color":"var(--green)"}',
                ),
                (
                    3,
                    1,
                    "cpu",
                    "sparkline",
                    "CPU",
                    2,
                    '{"field":"cpu","metric":"tool.cpu","format":"percent","color":"var(--orange)","smooth":true,'
                    '"yMaxExpr":"100*cores","refLines":[{"valueExpr":"100","label":"1 core"},{"valueExpr":"100*cores","label":"{cores} cores"}]}',
                ),
                (
                    4,
                    1,
                    "proc_ram",
                    "sparkline",
                    "Proc RAM",
                    3,
                    '{"field":"mem_mb","metric":"aictl.tool.memory","format":"size","color":"var(--yellow)","smooth":true,"multiply":1048576}',
                ),
                # Inventory section (id=2) — static/slow metrics
                (
                    5,
                    2,
                    "processes",
                    "stat",
                    "Processes",
                    0,
                    '{"field":"total_processes","metric":"discovery.processes","format":"raw"}',
                ),
                (
                    6,
                    2,
                    "disk_size",
                    "stat",
                    "Disk Size",
                    1,
                    '{"field":"total_size","metric":"discovery.size","format":"size"}',
                ),
                (
                    7,
                    2,
                    "mcp_servers",
                    "stat",
                    "MCP Servers",
                    2,
                    '{"field":"total_mcp_servers","metric":"discovery.mcp_servers","format":"raw"}',
                ),
                (
                    8,
                    2,
                    "ai_context",
                    "stat",
                    "AI Context",
                    3,
                    '{"field":"total_memory_tokens","metric":"memory.tokens","format":"kilo","suffix":"t"}',
                ),
                # Live Monitor section (id=3) — real-time metrics
                (
                    9,
                    3,
                    "sessions",
                    "stat",
                    "Sessions",
                    0,
                    '{"field":"total_live_sessions","metric":"tool.sessions","format":"raw","accent":true}',
                ),
                (
                    10,
                    3,
                    "est_tokens",
                    "stat",
                    "Est. Tokens",
                    1,
                    '{"field":"total_live_estimated_tokens","metric":"tool.tokens.input","format":"kilo"}',
                ),
                (
                    11,
                    3,
                    "outbound",
                    "stat",
                    "\u2191 Outbound",
                    2,
                    '{"field":"total_live_outbound_rate_bps","metric":"tool.net.out_bps","format":"rate"}',
                ),
                (
                    12,
                    3,
                    "inbound",
                    "stat",
                    "\u2193 Inbound",
                    3,
                    '{"field":"total_live_inbound_rate_bps","metric":"tool.net.in_bps","format":"rate"}',
                ),
                # Resource Bars section (id=5) — proportional bars
                (
                    13,
                    5,
                    "csv_footprint",
                    "bar_segment",
                    "CSV Footprint",
                    0,
                    '{"metric":"files","segment_by":"tool","showLegend":true}',
                ),
                (
                    14,
                    5,
                    "live_traffic",
                    "bar_segment",
                    "Live Traffic",
                    1,
                    '{"metric":"traffic_rate","segment_by":"tool","showLegend":true,"minHeight":36}',
                ),
                # Per-Tool Charts section (id=6) — Events & Stats tab
                (
                    15,
                    6,
                    "tool_cpu",
                    "sparkline",
                    "CPU %",
                    0,
                    '{"field":"cpu","metric":"tool.cpu","format":"percent","color":"tool","smooth":true}',
                ),
                (
                    16,
                    6,
                    "tool_mem",
                    "sparkline",
                    "Memory (MB)",
                    1,
                    '{"field":"mem_mb","metric":"tool.mem_mb","format":"size","color":"var(--green)","smooth":true}',
                ),
                (
                    17,
                    6,
                    "tool_tokens",
                    "sparkline",
                    "Tokens",
                    2,
                    '{"field":"tokens","metric":"tool.tokens.input","format":"kilo","color":"var(--accent)"}',
                ),
                (
                    18,
                    6,
                    "tool_traffic",
                    "sparkline",
                    "Traffic (B/s)",
                    3,
                    '{"field":"traffic","metric":"tool.net.out_bps","format":"rate","color":"var(--orange)","smooth":true}',
                ),
                # Event Timeline section (id=4) — dot strip
                (19, 4, "events_dot_timeline", "timeline", "Events", 0, '{"maxDots":200,"colorBy":"tool"}'),
                # Range selector (virtual widget)
                (20, 1, "range_selector", "range", "Range", 99, '{"options":["live","1h","6h","24h","7d"]}'),
                # ── Tab-scoped widgets ─────────────────────────────
                # Overview tab (section 7=overview_tools, 8=overview_memory)
                (
                    21,
                    7,
                    "tool_card_grid",
                    "tool_card_grid",
                    "Tools",
                    0,
                    '{"showSparklines":true,"sparklineMetrics":["cpu","mem_mb","tokens","traffic"],'
                    '"showBadges":true,"showLivePills":true,"expandable":true}',
                ),
                (
                    22,
                    8,
                    "memory_inline",
                    "memory_list",
                    "AI Context & Memory",
                    0,
                    '{"groupBy":"source","showPreview":true,"tailLines":15}',
                ),
                # Processes tab (section 9=procs_cores, 10=procs_tree)
                (23, 9, "core_bars", "core_bars", "Per-Core CPU", 0, '{"metric":"system.cpu.utilization"}'),
                (
                    24,
                    10,
                    "process_tree",
                    "process_tree",
                    "Processes",
                    0,
                    '{"groupBy":"tool","showCpuBars":true,"showMemBars":true,"treeDepth":2}',
                ),
                # MCP Servers tab (section 11)
                (25, 11, "mcp_table", "mcp_table", "MCP Servers", 0, '{"showTransport":true,"showStatus":true}'),
                # AI Context tab (section 12)
                (
                    26,
                    12,
                    "memory_full",
                    "memory_list",
                    "Memory Files",
                    0,
                    '{"groupBy":"source","showPreview":true,"tailLines":15}',
                ),
                # Live Monitor tab (section 13)
                (
                    27,
                    13,
                    "live_monitor",
                    "live_monitor_table",
                    "Live Monitor",
                    0,
                    '{"showDiagnostics":true,"showPerTool":true}',
                ),
                # Token Budget tab (section 14=verified, 15=context, 16=breakdown)
                (
                    28,
                    14,
                    "budget_verified",
                    "token_budget",
                    "Verified Usage",
                    0,
                    '{"section":"verified","showByModel":true}',
                ),
                (29, 15, "budget_context", "token_budget", "Context Window", 0, '{"section":"context","showBar":true}'),
                (
                    30,
                    16,
                    "budget_breakdown",
                    "token_budget",
                    "Breakdown",
                    0,
                    '{"section":"breakdown","showByKind":true}',
                ),
                # Events & Stats tab — tool_charts section already has widgets 15-18
                (31, 6, "event_feed", "events_feed", "Event Feed", 4, '{"maxEvents":100}'),
            ],
        )

        # ── Datasources (6) ───────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_datasource(id, key, kind, endpoint, poll_ms, config) VALUES(?,?,?,?,?,?)",
            [
                (1, "snapshot", "rest", "/api/snapshot", None, "{}"),
                (2, "stream", "sse", "/api/stream", None, "{}"),
                (3, "history", "rest", "/api/history", None, "{}"),
                (4, "budget", "rest", "/api/budget", None, "{}"),
                (5, "samples", "rest", "/api/samples", None, "{}"),
                (6, "events", "rest", "/api/events", None, "{}"),
            ],
        )

        # ── Widget <-> Datasource links ────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_widget_datasource(widget_id, datasource_id, role) VALUES(?,?,?)",
            [
                # Sparklines: history (chart) + snapshot (current value)
                (1, 3, "primary"),
                (1, 1, "secondary"),  # files
                (2, 3, "primary"),
                (2, 1, "secondary"),  # tokens
                (3, 3, "primary"),
                (3, 1, "secondary"),  # cpu
                (4, 3, "primary"),
                (4, 1, "secondary"),  # proc_ram
                # Stats: snapshot only
                (5, 1, "primary"),  # processes
                (6, 1, "primary"),  # disk_size
                (7, 1, "primary"),  # mcp_servers
                (8, 1, "primary"),  # ai_context
                (9, 1, "primary"),  # sessions
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
                (31, 6, "primary"),
                (31, 3, "secondary"),
            ],
        )

        # ── Group-by options (overview tab) ────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_group_by_option"
            "(id, tab_id, key, label, sort_order, is_default)"
            " VALUES(?,?,?,?,?,?)",
            [
                (1, 1, "product", "Product", 0, 1),
                (2, 1, "vendor", "Vendor", 1, 0),
                (3, 1, "host", "Host", 2, 0),
            ],
        )

        # ── Theme tokens ──────────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_theme(id, key, tokens) VALUES(?,?,?)",
            [
                (
                    1,
                    "dark",
                    '{"bg":"#0f172a","bg2":"#1e293b","bg3":"#162032",'
                    '"fg":"#e2e8f0","fg2":"#94a3b8","accent":"#38bdf8","border":"#334155",'
                    '"green":"#34d399","red":"#f87171","orange":"#fb923c","yellow":"#fbbf24"}',
                ),
                (
                    2,
                    "light",
                    '{"bg":"#f8fafc","bg2":"#ffffff","bg3":"#f1f5f9",'
                    '"fg":"#1e293b","fg2":"#64748b","accent":"#0284c7","border":"#e2e8f0",'
                    '"green":"#059669","red":"#dc2626","orange":"#ea580c","yellow":"#d97706"}',
                ),
            ],
        )

        # ── Default preferences ────────────────────────────────────
        conn.executemany(
            "INSERT OR IGNORE INTO ui_preference(id, dashboard_id, user_id, pref_key, pref_value) VALUES(?,?,?,?,?)",
            [
                (1, 1, None, "theme", "auto"),
                (2, 1, None, "range", "live"),
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
                except sqlite3.OperationalError as exc:
                    # Only swallow the idempotency race (column added by a
                    # concurrent connection). Real failures — e.g. a locked
                    # DB — must propagate, not be silently masked.
                    msg = str(exc).lower()
                    if "duplicate column" not in msg and "already exists" not in msg:
                        raise

    # ── File blob support ─────────────────────────────────────────

    @staticmethod
    def _store_blob(conn: sqlite3.Connection, content: str) -> str:
        """Store content in file_blobs if not already present. Returns hash."""
        blob_hash = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()[:32]
        conn.execute(
            "INSERT OR IGNORE INTO file_blobs(hash, content, size_bytes, created_at) VALUES(?,?,?,?)",
            (blob_hash, content, len(content.encode("utf-8", errors="replace")), time.time()),
        )
        return blob_hash

    @staticmethod
    def _resolve_content(conn: sqlite3.Connection, content: str, blob_hash: str) -> str:
        """Resolve content: if content is empty and blob_hash is set, fetch from blobs."""
        if content:
            return content
        if blob_hash:
            row = conn.execute("SELECT content FROM file_blobs WHERE hash = ?", (blob_hash,)).fetchone()
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
                converted.append(
                    ProcessSnapshotRow(
                        ts=r.ts,
                        pid=synth_pid,
                        tool=r.tool,
                        cpu_percent=r.cpu,
                        memory_rss_mb=r.mem_mb,
                    )
                )
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
        if self._throttled(event):
            return
        self._guard_event(event)
        self._log_event(event)
        self._notify_listeners(event)
        with self._lock:
            self._events_buf.append(event)
        if self._flush_interval <= 0:
            self.flush()

    def _guard_event(self, event: EventRow) -> EventRow:
        """Remove text from an event unless this mode keeps it."""
        if not self._keeps_text():
            event.detail = strip_event_text(event.detail)
        return event

    def _throttled(self, event: EventRow) -> bool:
        """True for a heartbeat event that arrived within its minimum gap."""
        gap = _HEARTBEAT_EVENT_MIN_GAP_S.get(event.kind)
        if gap is None:
            return False
        key = (event.tool, event.kind)
        if event.ts - self._heartbeat_last.get(key, 0.0) < gap:
            return True
        self._heartbeat_last[key] = event.ts
        return False

    def append_events(self, events: list[EventRow]) -> None:
        """Buffer multiple events."""
        events = [self._guard_event(e) for e in events if not self._throttled(e)]
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
                input_tokens=int(_safe_num(d.get("input_tokens", d.get("gen_ai.usage.input_tokens", 0)))),
                output_tokens=int(_safe_num(d.get("output_tokens", d.get("gen_ai.usage.output_tokens", 0)))),
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

    def active_writes(self) -> list[str]:
        """Named writes that run now in this process, each with its age. Empty when none does."""
        now = time.monotonic()
        return [f"{name} ({now - started:.0f} s)" for stack in list(self._writers.values()) for name, started in list(stack)]

    @_named_write("flush")
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
                        (
                            r.ts,
                            round(r.cpu_percent, 2),
                            json.dumps(r.cpu_per_core) if r.cpu_per_core else "[]",
                            round(r.memory_used_mb, 1),
                            round(r.memory_total_mb, 1),
                            r.active_sessions,
                            r.active_processes,
                            round(r.ai_token_rate, 2),
                            r.files,
                            r.tokens,
                            r.mcp,
                            r.mem_tokens,
                            r.memory_entries,
                            r.live_sessions,
                            r.live_tokens,
                            round(r.live_in_rate, 2),
                            round(r.live_out_rate, 2),
                        )
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
                            (
                                r.ts,
                                r.pid,
                                r.tool,
                                round(r.cpu_percent, 2),
                                round(r.memory_rss_mb, 1),
                                round(r.memory_vms_mb, 1),
                                r.open_files,
                                r.threads,
                            )
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
                covered = _sessions_read_from_transcripts(conn, req_buf)
                for r in req_buf:
                    # The transcript row for the same call is already stored.
                    if r.source in _SUPERSEDED_REQUEST_SOURCES_ALWAYS and r.session_id in covered:
                        continue
                    # Use embedded source timestamp when present (Case A).
                    # Fall back to value-based dedup when absent (Case B) —
                    # never use our reporting time (r.ts) as a dedup factor.
                    if r.dedup_key:
                        dk = r.dedup_key
                    elif r.source_ts > 0:
                        dk = _dedup_key(
                            r.session_id,
                            str(int(r.source_ts * 1000)),
                            r.model,
                            r.source,
                        )
                    else:
                        dk = _dedup_key(
                            r.session_id,
                            r.model,
                            str(r.input_tokens),
                            str(r.output_tokens),
                            r.source,
                        )
                    conn.execute(
                        "INSERT OR IGNORE INTO requests"
                        "(dedup_key, ts, session_id, agent_id, tool,"
                        " project_path, pid, model, input_tokens,"
                        " output_tokens, cache_read_tokens,"
                        " cache_creation_tokens, cost_usd, duration_ms,"
                        " finish_reason, is_error, error_type,"
                        " http_status, source, prompt_id, ttft_ms)"
                        " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (
                            dk,
                            r.ts,
                            r.session_id,
                            r.agent_id,
                            r.tool,
                            r.project_path,
                            r.pid,
                            r.model,
                            r.input_tokens,
                            r.output_tokens,
                            r.cache_read_tokens,
                            r.cache_creation_tokens,
                            round(r.cost_usd, 6),
                            round(r.duration_ms, 1),
                            r.finish_reason,
                            r.is_error,
                            r.error_type,
                            r.http_status,
                            r.source,
                            r.prompt_id,
                            round(r.ttft_ms, 1),
                        ),
                    )
                total += len(req_buf)

            if ti_buf:
                for r in ti_buf:
                    # Dedup precedence:
                    # 1. source_event_id (e.g. hook tool_use_id): unique per
                    #    invocation, so legitimate identical repeats persist
                    #    as separate rows and retried deliveries dedup.
                    # 2. Embedded source timestamp (OTel events, Case A).
                    # 3. Value-based fallback (Case B) — collapses identical
                    #    repeats, but only when the source gave us nothing
                    #    better to tell them apart.
                    if r.dedup_key:
                        dk = r.dedup_key
                    elif r.source_event_id:
                        dk = _dedup_key(
                            r.session_id,
                            r.tool_name,
                            r.source_event_id,
                            r.source,
                        )
                    elif r.source_ts > 0:
                        dk = _dedup_key(
                            r.session_id,
                            str(int(r.source_ts * 1000)),
                            r.tool_name,
                        )
                    else:
                        input_sig = json.dumps(r.input, sort_keys=True) if isinstance(r.input, dict) else str(r.input)
                        dk = _dedup_key(
                            r.session_id,
                            r.tool_name,
                            input_sig,
                            str(r.is_error),
                            r.source,
                        )
                    conn.execute(
                        "INSERT OR IGNORE INTO tool_invocations"
                        "(dedup_key, ts, session_id, request_id, tool,"
                        " tool_name, project_path, pid, is_error,"
                        " duration_ms, input, result_summary, source,"
                        " source_event_id, agent_id, confirm, confirm_wait_ms,"
                        " target, exit_code)"
                        " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (
                            dk,
                            r.ts,
                            r.session_id,
                            r.request_id,
                            r.tool,
                            r.tool_name,
                            r.project_path,
                            r.pid,
                            r.is_error,
                            round(r.duration_ms, 1),
                            json.dumps(r.input) if isinstance(r.input, dict) else r.input,
                            r.result_summary,
                            r.source,
                            r.source_event_id,
                            r.agent_id,
                            r.confirm,
                            round(r.confirm_wait_ms, 1),
                            r.target,
                            r.exit_code,
                        ),
                    )
                total += len(ti_buf)

            conn.commit()
        except sqlite3.Error as exc:
            log.warning("DB flush error: %s — rolling back and re-buffering batch", exc)
            self._flush_failed_with = exc
            # Roll back so a half-applied batch is never committed by the
            # NEXT flush (executemany may have partially run).
            try:
                conn.rollback()
            except sqlite3.Error as rb_exc:
                log.debug("DB flush rollback error: %s", rb_exc)
            # Re-prepend the popped buffers so a transient failure (e.g.
            # 'database is locked') retries the whole batch on the next
            # flush instead of silently dropping it. All inserts use
            # INSERT OR REPLACE/IGNORE so the retry is idempotent.
            dropped = 0
            with self._lock:
                self._system_snapshot_buf[:0] = ss_buf
                self._process_snapshot_buf[:0] = ps_buf
                self._events_buf[:0] = e_buf
                self._metrics_buf[:0] = m_buf
                self._requests_buf[:0] = req_buf
                self._tool_invocations_buf[:0] = ti_buf
                # Bounded retry: drop-oldest beyond the cap per buffer.
                for buf in (
                    self._system_snapshot_buf,
                    self._process_snapshot_buf,
                    self._events_buf,
                    self._metrics_buf,
                    self._requests_buf,
                    self._tool_invocations_buf,
                ):
                    excess = len(buf) - self._REBUFFER_CAP
                    if excess > 0:
                        dropped += excess
                        del buf[:excess]
            if dropped:
                log.warning("DB flush retry buffer overflow: dropped %d oldest rows", dropped)
                try:
                    self.record_data_quality(
                        "storage-flush",
                        "degraded",
                        kind="storage",
                        severity="warning",
                        message="flush retry buffer overflow — dropped oldest rows",
                        detail={"dropped": dropped, "error": str(exc)},
                    )
                except Exception as dq_exc:  # noqa: BLE001 — same DB may still be failing
                    log.debug("Data-quality write error for storage-flush: %s", dq_exc)
            total = 0

        return total

    def _flush_loop(self) -> None:
        """Background loop: flush buffers periodically."""
        while not self._flush_stop.wait(self._flush_interval):
            self._flush_failed_with = None
            try:
                self.flush()
                if self._flush_failed_with is not None:
                    self._note_flush_error(self._flush_failed_with)
                else:
                    self._locked_flushes = 0
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
        sql = (
            f"SELECT ts, files, tokens, cpu_percent, memory_used_mb, mcp, mem_tokens,"
            f" memory_entries, live_sessions, live_tokens,"
            f" live_in_rate, live_out_rate"
            f" FROM system_snapshots{where} ORDER BY ts{lim}"
        )
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
        where, params = _where(
            [
                ("tool = ?", tool or None),
                ("ts >= ?", since),
                ("ts <= ?", until),
            ]
        )
        sql = f"SELECT ts, tool, cpu_percent, memory_rss_mb FROM process_snapshots{where} ORDER BY ts"
        rows = conn.execute(sql, params).fetchall()
        result: dict[str, dict[str, list]] = {}
        for ts, tl, cpu, mem in rows:
            d = result.setdefault(tl, {"ts": [], "cpu": [], "mem_mb": [], "tokens": [], "traffic": []})
            d["ts"].append(ts)
            d["cpu"].append(cpu)
            d["mem_mb"].append(mem)
            # Not stored per tool over time; the API leaves these series out
            # instead of presenting zeros (see api_handlers.tool_history_for_api).
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
        where, params = _where(
            [
                ("ts >= ?", since),
                ("ts <= ?", until),
                ("tool = ?", tool or None),
                ("kind = ?", kind or None),
                ("pid = ?", pid or None),
            ]
        )
        if session_id:
            sep = " AND " if where else " WHERE "
            where += sep + "(session_id = ? OR json_extract(detail, '$.session_id') = ?)"
            params.extend([session_id, session_id])
        sql = f"SELECT ts, tool, kind, detail, session_id, pid FROM events{where} ORDER BY ts DESC LIMIT ?"
        params.append(limit)
        rows = conn.execute(sql, params).fetchall()
        return [
            EventRow(ts=r[0], tool=r[1], kind=r[2], detail=_json(r[3]), session_id=r[4] or "", pid=r[5] or 0)
            for r in rows
        ]

    def count_events(
        self,
        since: float | None = None,
        until: float | None = None,
        tool: str | None = None,
        kind: str | None = None,
        session_id: str | None = None,
    ) -> int:
        """Number of events matching the same filters as :meth:`query_events` (no limit)."""
        where, params = _where(
            [
                ("ts >= ?", since),
                ("ts <= ?", until),
                ("tool = ?", tool or None),
                ("kind = ?", kind or None),
            ]
        )
        if session_id:
            sep = " AND " if where else " WHERE "
            where += sep + "(session_id = ? OR json_extract(detail, '$.session_id') = ?)"
            params.extend([session_id, session_id])
        return int(self._conn().execute(f"SELECT COUNT(*) FROM events{where}", params).fetchone()[0])

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

        session_rows = _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM sessions{where_sql} ORDER BY started_at",
                params,
            )
        )
        session_rows = [s for s in session_rows if s["session_id"] != _VERIFY_SESSION_ID]
        self._overlay_session_usage(session_rows)

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
                    "git_branch": s.get("git_branch", "") or "",
                    "git_commit": s.get("git_commit", "") or "",
                    "project_path": s.get("project_path", "") or "",
                    "project": s.get("project_path", "") or "",
                    "source": s.get("source", "") or "",
                    "input_tokens": s.get("input_tokens", 0) or 0,
                    "output_tokens": s.get("output_tokens", 0) or 0,
                    "cache_read_tokens": s.get("cache_read_tokens", 0) or 0,
                    "cache_creation_tokens": s.get("cache_creation_tokens", 0) or 0,
                    "model": s.get("model", "") or "",
                    "request_count": s.get("request_count", 0) or 0,
                    "tool_call_count": s.get("tool_call_count", 0) or 0,
                    **{k: s[k] for k in _USAGE_PROFILE_KEYS[4:]},
                    "cost_usd": s.get("cost_usd"),
                }
                profiles[s["session_id"]] = p
                result.append(p)

            # The sessions table rarely holds file/subagent counts; the stored
            # event, file-write and agent rows are authoritative.
            self._enrich_profiles_from_store(profiles, since, until)

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
            " WHERE kind = 'session_start' AND ts >= ?" + until_clause + " ORDER BY ts",
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
                "git_branch": "",
                "git_commit": "",
                "project_path": detail.get("project", "")
                or detail.get("project_path", "")
                or detail.get("cwd", "")
                or "",
            }

        if not sessions:
            return []

        # Find matching session_end events
        for sid in sessions:
            end_rows = conn.execute(
                "SELECT ts, detail FROM events WHERE kind = 'session_end'   AND session_id = ? LIMIT 1",
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
            " WHERE kind = 'file_modified' AND ts >= ?" + file_until + "   AND session_id != ''"
            " GROUP BY sid, path",
            file_params,
        ).fetchall()

        self._apply_file_event_rows(sessions, file_rows)

        # Activity buckets
        bucket_rows = conn.execute(
            "SELECT session_id as sid,"
            "       CAST(ts / 300 AS INT) * 300 as bucket,"
            "       COUNT(*) as cnt"
            " FROM events"
            " WHERE kind = 'file_modified' AND ts >= ?" + file_until + "   AND session_id != ''"
            " GROUP BY sid, bucket"
            " ORDER BY sid, bucket",
            file_params,
        ).fetchall()

        for sid, bucket, cnt in bucket_rows:
            if sid in sessions:
                sessions[sid]["activity"].append([bucket, cnt])

        return self._merge_session_profiles(list(sessions.values()))

    @staticmethod
    def _apply_file_event_rows(sessions: dict[str, dict], file_rows: list) -> None:
        """Fold ``(sid, path, count, growth_bytes)`` file_modified groups into profiles.

        Sets ``files_modified``, ``unique_files``, ``bytes_written`` and
        classifies each path as a subagent transcript, a conversation
        transcript or a source file.
        """
        for sid, path, cnt, growth in file_rows:
            if sid not in sessions:
                continue
            s = sessions[sid]
            s["files_modified"] += cnt
            s["unique_files"] += 1
            s["bytes_written"] += growth or 0
            if path:
                npath = path.replace("\\", "/")
                if "/subagents/" in npath:
                    s["subagents"] += 1
                elif npath.endswith(".jsonl") and "/projects/" in npath and "/subagents/" not in npath:
                    s["conversations"] += 1
                elif npath.endswith(_SOURCE_FILE_EXTS):
                    if "/.claude/" not in npath and "/__pycache__/" not in npath:
                        s["source_files"] += 1

    def _enrich_profiles_from_store(self, profiles: dict[str, dict], since: float, until: float | None) -> None:
        """Fill file and subagent counts of table-backed profiles from stored rows.

        The ``sessions`` row carries a ``files_modified`` counter that ingesters
        rarely fill; the counts come from ``file_modified`` events (grouped by
        path), ``file_write_events`` and ``agents``, whichever holds the most.
        """
        conn = self._conn()
        ts_where = " AND ts <= ?" if until is not None else ""
        ts_params: list[Any] = [since] + ([until] if until is not None else [])
        ev_rows = conn.execute(
            "SELECT session_id, json_extract(detail, '$.path'), COUNT(*),"
            " SUM(json_extract(detail, '$.growth_bytes'))"
            " FROM events WHERE kind = 'file_modified' AND ts >= ?" + ts_where + " AND session_id != ''"
            " GROUP BY session_id, json_extract(detail, '$.path')",
            ts_params,
        ).fetchall()
        fresh = {
            sid: {"files_modified": 0, "unique_files": 0, "bytes_written": 0, "subagents": 0,
                  "conversations": 0, "source_files": 0}
            for sid in profiles
        }
        self._apply_file_event_rows(fresh, ev_rows)
        fw_rows = conn.execute(
            "SELECT session_id, COUNT(*), COUNT(DISTINCT path) FROM file_write_events"
            " WHERE ts >= ?" + ts_where + " AND session_id != '' GROUP BY session_id",
            ts_params,
        ).fetchall()
        for sid, cnt, uniq in fw_rows:
            if sid in fresh:
                fresh[sid]["files_modified"] = max(fresh[sid]["files_modified"], cnt)
                fresh[sid]["unique_files"] = max(fresh[sid]["unique_files"], uniq)
        ag_rows = conn.execute(
            "SELECT session_id, COUNT(DISTINCT agent_id) FROM agents WHERE session_id != '' GROUP BY session_id"
        ).fetchall()
        for sid, cnt in ag_rows:
            if sid in fresh:
                fresh[sid]["subagents"] = max(fresh[sid]["subagents"], cnt)
        for sid, f in fresh.items():
            prof = profiles[sid]
            for key, val in f.items():
                prof[key] = max(prof.get(key) or 0, val)

    @staticmethod
    def _merge_session_profiles(profiles: list[dict]) -> list[dict]:
        """Merge duplicate session profiles.

        Pass 0: merge rows whose session ids share a stable UUID — the
                same logical session recorded by different sources
                (hooks/JSONL/OTel) under different id formats.
        Pass A: merge sessions from the same tool within 60s of each other
                (same PID) or 10s (different PIDs — same process tree).
                Different-PID rows further apart still merge when they
                carry the duplicate signature: near-identical overlapping
                activity intervals without a workspace conflict.
        Pass B: merge all sessions sharing the same (tool, pid) pair
                when temporally adjacent.
        """
        profiles.sort(key=lambda s: s["started_at"])

        # Pass 0: merge rows sharing a stable session UUID regardless of
        # timing — UUIDs are globally unique, so a shared UUID can only
        # mean two records of the same logical session.
        by_uuid: dict[str, dict] = {}
        uuid_merged: list[dict] = []
        for p in profiles:
            sid_uuid = _session_uuid(p)
            if sid_uuid is None:
                uuid_merged.append(p)
                continue
            canonical = by_uuid.get(sid_uuid)
            if canonical is None:
                by_uuid[sid_uuid] = p
                uuid_merged.append(p)
                continue
            _absorb_session_profile(canonical, p)
        profiles = uuid_merged

        # Pass A: merge close-in-time sessions
        merged: list[dict] = []
        used: set[str] = set()
        for i, primary in enumerate(profiles):
            if primary["session_id"] in used:
                continue
            for secondary in profiles[i + 1 :]:
                if secondary["session_id"] in used:
                    continue
                if secondary["tool"] != primary["tool"]:
                    continue
                gap = abs(secondary["started_at"] - primary["started_at"])
                if gap > 60:
                    break
                # Two different tool UUIDs are two sessions, even when they
                # start together in one cwd (parallel agents do). Merging them
                # would keep only the larger token count and lose the other.
                p_uuid, s_uuid = _session_uuid(primary), _session_uuid(secondary)
                if p_uuid and s_uuid and p_uuid != s_uuid:
                    continue
                p_pid = _session_pid(primary)
                s_pid = _session_pid(secondary)
                # Different PIDs: merge if start times are very close
                # (same process tree spawned by the same session), or if
                # the rows look like duplicate observations of the same
                # logical session (near-identical overlapping intervals,
                # no workspace conflict).
                if p_pid is not None and s_pid is not None and p_pid != s_pid:
                    if gap > 10 and not _profiles_look_duplicate(primary, secondary):
                        continue
                if secondary["ended_at"] and not primary["ended_at"]:
                    primary, secondary = secondary, primary
                _merge_session_stats(primary, secondary)
                used.add(secondary["session_id"])
                _merge_profile_identity(primary, secondary)
            merged.append(primary)
            used.add(primary["session_id"])

        # Pass B: merge by (tool, pid) when the gap between sessions is
        # small.  Same PID + same tool + small gap = same logical session
        # (the process scanner had intermittent detection, or multiple
        # sources created entries for the same session).  A large gap
        # means the OS reused the PID for a genuinely different session.
        _GAP_ENDED = 600  # max gap after a known end time (10 min)
        _GAP_ACTIVE = 7200  # max gap when end time is unknown (2 hours)

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
                    # If s IS canonical, chain-merge adjacent members.
                    if s["session_id"] == canonical["session_id"]:
                        for other in group[1:]:
                            if other["session_id"] in consumed:
                                continue
                            # Gap = time between canonical's last known
                            # activity and other's start.  Small gap →
                            # same session; large gap → PID reuse.
                            if canonical["ended_at"]:
                                gap = other["started_at"] - canonical["ended_at"]
                                max_gap = _GAP_ENDED
                            else:
                                ref = canonical.get("last_seen_at") or canonical["started_at"]
                                gap = other["started_at"] - ref
                                max_gap = _GAP_ACTIVE
                            if gap > max_gap:
                                continue
                            if other["ended_at"]:
                                if canonical["ended_at"] is None or other["ended_at"] > canonical["ended_at"]:
                                    canonical["ended_at"] = other["ended_at"]
                            else:
                                canonical["ended_at"] = None
                            _merge_session_stats(canonical, other)
                            consumed.add(other["session_id"])
                            _merge_profile_identity(canonical, other)
                        if canonical["ended_at"]:
                            canonical["duration_s"] = round(canonical["ended_at"] - canonical["started_at"], 1)
                        else:
                            canonical["duration_s"] = None
                        deduped.append(canonical)
                        consumed.add(canonical["session_id"])
                        continue
                    # s is a later group member — if canonical already
                    # consumed it (merged), skip; otherwise emit standalone.
                    if s["session_id"] in consumed:
                        continue
            deduped.append(s)
            consumed.add(s["session_id"])

        return deduped

    # ── Sessions (new) ─────────────────────────────────────────────

    def upsert_session(self, row: SessionRow) -> None:
        """Insert or enrich a session row.

        Session data arrives in layers. An ingester may create a provisional
        row before hooks or OTel provide model, pid, token, or end-time
        details. Keep the earliest known start, latest known end, and refresh
        fields only when the new row carries real values.
        """
        conn = self._conn()
        conn.execute(
            "INSERT INTO sessions"
            "(session_id, tool, pid, project_path, model, git_branch, git_commit,"
            " started_at, ended_at, source, input_tokens, output_tokens,"
            " cache_read_tokens, cache_creation_tokens, cost_usd,"
            " request_count, tool_call_count, files_modified)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            " ON CONFLICT(session_id) DO UPDATE SET"
            " tool = CASE WHEN excluded.tool != '' THEN excluded.tool ELSE sessions.tool END,"
            " pid = CASE WHEN excluded.pid != 0 THEN excluded.pid ELSE sessions.pid END,"
            " project_path = CASE WHEN excluded.project_path != '' THEN excluded.project_path ELSE sessions.project_path END,"
            " model = CASE WHEN excluded.model != '' THEN excluded.model ELSE sessions.model END,"
            " git_branch = CASE WHEN excluded.git_branch != '' THEN excluded.git_branch ELSE sessions.git_branch END,"
            " git_commit = CASE WHEN excluded.git_commit != '' THEN excluded.git_commit ELSE sessions.git_commit END,"
            " started_at = CASE"
            " WHEN sessions.started_at = 0 THEN excluded.started_at"
            " WHEN excluded.started_at = 0 THEN sessions.started_at"
            " ELSE MIN(sessions.started_at, excluded.started_at)"
            " END,"
            " ended_at = CASE"
            " WHEN excluded.ended_at IS NULL THEN sessions.ended_at"
            " WHEN sessions.ended_at IS NULL THEN excluded.ended_at"
            " ELSE MAX(sessions.ended_at, excluded.ended_at)"
            " END,"
            " source = CASE WHEN excluded.source != '' THEN excluded.source ELSE sessions.source END,"
            " input_tokens = CASE WHEN excluded.input_tokens != 0 THEN excluded.input_tokens ELSE sessions.input_tokens END,"
            " output_tokens = CASE WHEN excluded.output_tokens != 0 THEN excluded.output_tokens ELSE sessions.output_tokens END,"
            " cache_read_tokens = CASE WHEN excluded.cache_read_tokens != 0 THEN excluded.cache_read_tokens ELSE sessions.cache_read_tokens END,"
            " cache_creation_tokens = CASE WHEN excluded.cache_creation_tokens != 0 THEN excluded.cache_creation_tokens ELSE sessions.cache_creation_tokens END,"
            " cost_usd = CASE WHEN excluded.cost_usd != 0 THEN excluded.cost_usd ELSE sessions.cost_usd END,"
            " request_count = CASE WHEN excluded.request_count != 0 THEN excluded.request_count ELSE sessions.request_count END,"
            " tool_call_count = CASE WHEN excluded.tool_call_count != 0 THEN excluded.tool_call_count ELSE sessions.tool_call_count END,"
            " files_modified = CASE WHEN excluded.files_modified != 0 THEN excluded.files_modified ELSE sessions.files_modified END",
            (
                row.session_id,
                row.tool,
                row.pid,
                row.project_path,
                row.model,
                row.git_branch,
                row.git_commit,
                row.started_at,
                row.ended_at,
                row.source,
                row.input_tokens,
                row.output_tokens,
                row.cache_read_tokens,
                row.cache_creation_tokens,
                round(row.cost_usd, 6),
                row.request_count,
                row.tool_call_count,
                row.files_modified,
            ),
        )
        conn.commit()

    def link_session_process(
        self,
        session_id: str,
        pid: int,
        tool: str = "",
        role: str = "lead",
    ) -> None:
        """Record that a PID belongs to a session (INSERT OR IGNORE)."""
        if not session_id or not pid:
            return
        conn = self._conn()
        conn.execute(
            "INSERT OR IGNORE INTO session_processes(session_id, pid, tool, joined_at, role) VALUES(?,?,?,?,?)",
            (session_id, pid, tool, time.time(), role),
        )
        conn.commit()

    def find_session_ids_by_pid(
        self,
        pid: int,
        *,
        since: float = 0,
        until: float = 0,
    ) -> list[str]:
        """Return session_ids linked to the given PID.

        When *since*/*until* are provided, only sessions whose time range
        overlaps the window are returned.  This prevents PID reuse from
        bleeding across unrelated sessions.
        """
        if not pid:
            return []
        conn = self._conn()
        if since or until:
            # Join with sessions table to filter by time overlap
            sql = (
                "SELECT sp.session_id FROM session_processes sp"
                " JOIN sessions s ON sp.session_id = s.session_id"
                " WHERE sp.pid = ?"
            )
            params: list = [pid]
            if since:
                # Session must not have ended before our window
                sql += " AND (s.ended_at IS NULL OR s.ended_at >= ?)"
                params.append(since)
            if until:
                # Session must have started before our window ends
                sql += " AND s.started_at <= ?"
                params.append(until)
            rows = conn.execute(sql, params).fetchall()
        else:
            rows = conn.execute(
                "SELECT session_id FROM session_processes WHERE pid = ?",
                (pid,),
            ).fetchall()
        return [r[0] for r in rows]

    def batch_link_sessions(
        self,
        entries: list[tuple[str, str, int, float, str]],
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
                    "INSERT OR IGNORE INTO session_processes(session_id, pid, tool, joined_at, role) VALUES(?,?,?,?,?)",
                    (session_id, pid, tool, now, "lead"),
                )
        conn.commit()

    def update_session_stats(self, session_id: str, **kwargs) -> None:
        """Update session stat fields without marking the session ended.

        Used for per-turn events (the Claude Code ``Stop`` hook fires after
        every response): records token/cost counters and clears a stale
        ``ended_at`` — activity on a session proves it is not over. Only
        ``SessionEnd`` (via :meth:`update_session_end`) is terminal.
        """
        if not session_id:
            return
        conn = self._conn()
        sets = ["ended_at = NULL"]
        params: list[Any] = []
        for k in (
            "tool",
            "project_path",
            "model",
            "source",
            "input_tokens",
            "output_tokens",
            "cache_read_tokens",
            "cache_creation_tokens",
            "cost_usd",
        ):
            if k in kwargs:
                if k in {"tool", "project_path", "model", "source"} and not kwargs[k]:
                    continue
                if k in _SESSION_COUNTER_FIELDS:
                    # Hooks omit counters and the receiver defaults them to 0:
                    # absent is not zero, and a running total never decreases.
                    if not kwargs[k]:
                        continue
                    sets.append(f"{k} = MAX(COALESCE({k}, 0), ?)")
                else:
                    sets.append(f"{k} = ?")
                params.append(kwargs[k])
        params.append(session_id)
        cur = conn.execute(
            f"UPDATE sessions SET {', '.join(sets)} WHERE session_id = ?",
            params,
        )
        if cur.rowcount == 0:
            self.upsert_session(
                SessionRow(
                    session_id=session_id,
                    tool=str(kwargs.get("tool", "") or ""),
                    project_path=str(kwargs.get("project_path", "") or ""),
                    model=str(kwargs.get("model", "") or ""),
                    started_at=float(kwargs.get("ts", 0.0) or 0.0),
                    source=str(kwargs.get("source", "") or ""),
                    input_tokens=int(kwargs.get("input_tokens", 0) or 0),
                    output_tokens=int(kwargs.get("output_tokens", 0) or 0),
                    cache_read_tokens=int(kwargs.get("cache_read_tokens", 0) or 0),
                    cache_creation_tokens=int(kwargs.get("cache_creation_tokens", 0) or 0),
                    cost_usd=float(kwargs.get("cost_usd", 0.0) or 0.0),
                )
            )
            return
        conn.commit()

    def update_session_end(self, session_id: str, ended_at: float, **kwargs) -> None:
        """Update session end time and optional fields."""
        if not session_id:
            return
        conn = self._conn()
        sets = ["ended_at = ?"]
        params: list[Any] = [ended_at]
        for k in (
            "tool",
            "project_path",
            "model",
            "source",
            "input_tokens",
            "output_tokens",
            "cache_read_tokens",
            "cache_creation_tokens",
            "cost_usd",
            "request_count",
            "tool_call_count",
            "files_modified",
        ):
            if k in kwargs:
                if k in {"tool", "project_path", "model", "source"} and not kwargs[k]:
                    continue
                if k in _SESSION_COUNTER_FIELDS:
                    # Hooks omit counters and the receiver defaults them to 0:
                    # absent is not zero, and a running total never decreases.
                    if not kwargs[k]:
                        continue
                    sets.append(f"{k} = MAX(COALESCE({k}, 0), ?)")
                else:
                    sets.append(f"{k} = ?")
                params.append(kwargs[k])
        params.append(session_id)
        cur = conn.execute(
            f"UPDATE sessions SET {', '.join(sets)} WHERE session_id = ?",
            params,
        )
        if cur.rowcount == 0:
            self.upsert_session(
                SessionRow(
                    session_id=session_id,
                    tool=str(kwargs.get("tool", "") or ""),
                    project_path=str(kwargs.get("project_path", "") or ""),
                    model=str(kwargs.get("model", "") or ""),
                    started_at=ended_at,
                    ended_at=ended_at,
                    source=str(kwargs.get("source", "") or ""),
                    input_tokens=int(kwargs.get("input_tokens", 0) or 0),
                    output_tokens=int(kwargs.get("output_tokens", 0) or 0),
                    cache_read_tokens=int(kwargs.get("cache_read_tokens", 0) or 0),
                    cache_creation_tokens=int(kwargs.get("cache_creation_tokens", 0) or 0),
                    cost_usd=float(kwargs.get("cost_usd", 0.0) or 0.0),
                    request_count=int(kwargs.get("request_count", 0) or 0),
                    tool_call_count=int(kwargs.get("tool_call_count", 0) or 0),
                    files_modified=int(kwargs.get("files_modified", 0) or 0),
                )
            )
            return
        conn.commit()

    # ── Session commits (git attribution) ──────────────────────────

    def upsert_session_commits(self, session_id: str, commits: list[dict]) -> None:
        """Persist attributed commits for a session. Idempotent per (sid, sha)."""
        if not session_id or not commits:
            return
        conn = self._conn()
        rows = [
            (
                session_id,
                str(c.get("sha", "")),
                str(c.get("author_name", "")),
                str(c.get("author_email", "")),
                float(c.get("ts", 0.0) or 0.0),
                str(c.get("subject", ""))[:500],
            )
            for c in commits
            if c.get("sha")
        ]
        if not rows:
            return
        conn.executemany(
            "INSERT OR IGNORE INTO session_commits"
            "(session_id, sha, author_name, author_email, ts, subject) VALUES(?,?,?,?,?,?)",
            rows,
        )
        conn.commit()

    def get_session_commits(self, session_id: str) -> list[dict]:
        """Return persisted commits for a session, oldest first."""
        if not session_id:
            return []
        conn = self._conn()
        return _rows_to_dicts(
            conn.execute(
                "SELECT sha, author_name, author_email, ts, subject "
                "FROM session_commits WHERE session_id = ? ORDER BY ts ASC",
                (session_id,),
            )
        )

    def count_session_commits(self, session_id: str) -> int:
        """Return the number of attributed commits for a session."""
        if not session_id:
            return 0
        conn = self._conn()
        row = conn.execute(
            "SELECT COUNT(*) FROM session_commits WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        return int(row[0]) if row else 0

    def get_session(self, session_id: str) -> dict | None:
        """Return a single session row as a dict, or None."""
        if not session_id:
            return None
        conn = self._conn()
        rows = _rows_to_dicts(
            conn.execute(
                "SELECT * FROM sessions WHERE session_id = ? LIMIT 1",
                (session_id,),
            )
        )
        rows = [r for r in rows if r["session_id"] != _VERIFY_SESSION_ID]
        self._overlay_session_usage(rows)
        return rows[0] if rows else None

    def update_tool_invocation_duration(
        self,
        dedup_key: str,
        duration_ms: float,
        is_error: int = 0,
        result_summary: str = "",
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
        rows = _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM sessions{where} ORDER BY started_at DESC LIMIT ?",
                params,
            )
        )
        rows = [r for r in rows if r["session_id"] != _VERIFY_SESSION_ID]
        self._overlay_session_usage(rows)
        return rows

    # ── Transcript usage (authoritative when present) ──────────────

    def upsert_session_usage(self, row: dict) -> None:
        """Replace one session's transcript-derived usage. Totals are absolute."""
        conn = self._conn()
        conn.execute(
            "INSERT OR REPLACE INTO session_usage(session_id, tool, source, quality, quality_reason,"
            " model, models_json, daily_json, input_tokens, output_tokens, cache_read_tokens,"
            " cache_creation_tokens, request_count, tool_call_count, turn_count, cost_usd,"
            " cost_quality, cost_reason, unpriced_models, billing_unit, billing_amount,"
            " premium_requests, estimated_list_usd, started_at, last_activity_at,"
            " project_path, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                row["session_id"],
                row.get("tool", ""),
                row.get("source", "transcript"),
                row.get("quality", "exact"),
                row.get("quality_reason", ""),
                row.get("model", ""),
                json.dumps(row.get("models") or {}),
                json.dumps(row.get("daily") or {}),
                int(row.get("input_tokens", 0)),
                int(row.get("output_tokens", 0)),
                int(row.get("cache_read_tokens", 0)),
                int(row.get("cache_creation_tokens", 0)),
                int(row.get("request_count", 0)),
                int(row.get("tool_call_count", 0)),
                int(row.get("turn_count", 0)),
                row.get("cost_usd"),
                row.get("cost_quality", "unknown"),
                row.get("cost_reason", ""),
                json.dumps(row.get("unpriced_models") or []),
                row.get("billing_unit", ""),
                row.get("billing_amount"),
                row.get("premium_requests"),
                row.get("estimated_list_usd"),
                float(row.get("started_at", 0) or 0),
                float(row.get("last_activity_at", 0) or 0),
                row.get("project_path", ""),
                time.time(),
            ),
        )
        conn.commit()

    def query_session_usage(
        self,
        *,
        session_ids: list[str] | None = None,
        active_since: float | None = None,
        active_until: float | None = None,
    ) -> list[dict]:
        """Transcript usage rows, by ids or by overlap with an activity window."""
        conn = self._conn()
        rows: list[dict] = []
        if session_ids is not None:
            ids = [i for i in session_ids if i]
            for start in range(0, len(ids), 500):
                chunk = ids[start : start + 500]
                marks = ",".join("?" * len(chunk))
                rows += _rows_to_dicts(conn.execute(f"SELECT * FROM session_usage WHERE session_id IN ({marks})", chunk))
        else:
            where, params = _where(
                [("last_activity_at >= ?", active_since), ("started_at <= ?", active_until)]
            )
            rows = _rows_to_dicts(conn.execute(f"SELECT * FROM session_usage{where}", params))
        for r in rows:
            r["models"] = _json(r.pop("models_json", None))
            r["daily"] = _json(r.pop("daily_json", None))
            try:
                r["unpriced_models"] = json.loads(r.get("unpriced_models") or "[]")
            except ValueError:
                r["unpriced_models"] = []
        return rows

    def _overlay_session_usage(self, rows: list[dict]) -> None:
        """Put transcript numbers and provenance on ``sessions`` rows, in place.

        Lookup is by the UUID inside the id too, so a correlator composite id
        such as ``tool:pid:<uuid>`` resolves to the same transcript.
        """
        if not rows:
            return
        keys = {r.get("session_id", ""): (_session_uuid(r) or r.get("session_id", "")) for r in rows}
        usage = {u["session_id"].lower(): u for u in self.query_session_usage(session_ids=sorted(set(keys.values())))}
        for row in rows:
            u = usage.get(keys.get(row.get("session_id", ""), "").lower())
            if u is None:
                row.update(row_provenance(row))
                continue
            for key in ("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens", "request_count", "tool_call_count"):
                row[key] = u[key]
            row["turn_count"] = u["turn_count"]
            row["model"] = u["model"] or row.get("model", "")
            row.update(usage_provenance(u))
            row["models"] = u["models"]

    def query_session_flow(self, session_id: str) -> dict:
        """Return requests and tool_invocations for a session."""
        conn = self._conn()
        requests = _rows_to_dicts(
            conn.execute(
                "SELECT * FROM requests WHERE session_id = ? ORDER BY ts",
                (session_id,),
            )
        )
        invocations = _rows_to_dicts(
            conn.execute(
                "SELECT * FROM tool_invocations WHERE session_id = ? ORDER BY ts",
                (session_id,),
            )
        )
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
        where, params = _where(
            [
                ("session_id = ?", session_id or None),
                ("ts >= ?", since),
                ("ts <= ?", until),
                ("tool = ?", tool or None),
            ]
        )
        params.append(limit)
        return _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM requests{where} ORDER BY ts DESC LIMIT ?",
                params,
            )
        )

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
        where, params = _where(
            [
                ("session_id = ?", session_id or None),
                ("ts >= ?", since),
                ("ts <= ?", until),
            ]
        )
        params.append(limit)
        return _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM tool_invocations{where} ORDER BY ts DESC LIMIT ?",
                params,
            )
        )

    def session_tool_invocation_totals(self, session_id: str) -> dict:
        """True per-session totals of stored tool calls (not limited to a page).

        Returns ``{total, errors, by_tool: {tool_name: count}}``.
        """
        conn = self._conn()
        rows = conn.execute(
            "SELECT COALESCE(NULLIF(tool_name, ''), NULLIF(tool, ''), 'unknown') AS n,"
            " COUNT(*), SUM(CASE WHEN is_error THEN 1 ELSE 0 END)"
            " FROM tool_invocations WHERE session_id = ? GROUP BY n",
            (session_id,),
        ).fetchall()
        return {
            "total": sum(int(r[1] or 0) for r in rows),
            "errors": sum(int(r[2] or 0) for r in rows),
            "by_tool": {r[0]: int(r[1] or 0) for r in rows},
        }

    def query_session_cost_by_model(self, session_id: str) -> list[dict]:
        """Aggregate a session's LLM requests grouped by model.

        Returns one row per model: ``{model, requests, input_tokens,
        output_tokens, cache_read_tokens, cache_creation_tokens, cost_usd}``,
        ordered by descending cost. Empty when the session has no persisted
        requests. Surfaces the per-model cost breakdown that the session-level
        ``cost_usd`` aggregate collapses.
        """
        if not session_id:
            return []
        usage = self.query_session_usage(session_ids=[_session_uuid(session_id) or session_id])
        if usage and usage[0]["models"]:
            # Transcripts see every request; ``requests`` may hold only part.
            models = [{"model": m, **v} for m, v in usage[0]["models"].items()]
            return sorted(models, key=lambda m: (-(m.get("cost_usd") or 0), -m.get("requests", 0)))
        conn = self._conn()
        rows = conn.execute(
            "SELECT COALESCE(NULLIF(model, ''), 'unknown') AS model,"
            " COUNT(*) AS requests,"
            " COALESCE(SUM(input_tokens), 0) AS input_tokens,"
            " COALESCE(SUM(output_tokens), 0) AS output_tokens,"
            " COALESCE(SUM(cache_read_tokens), 0) AS cache_read_tokens,"
            " COALESCE(SUM(cache_creation_tokens), 0) AS cache_creation_tokens,"
            " COALESCE(SUM(cost_usd), 0.0) AS cost_usd"
            " FROM requests WHERE session_id = ?"
            " GROUP BY COALESCE(NULLIF(model, ''), 'unknown')"
            " ORDER BY cost_usd DESC, requests DESC",
            (session_id,),
        )
        return _rows_to_dicts(rows)

    def get_session_processes(self, session_id: str) -> list[dict]:
        """Return the process genealogy linked to a session.

        Each row is ``{pid, tool, role, joined_at}`` ordered by join time.
        Backs ``/api/session-processes`` — the persisted process tree that
        the live snapshot's subprocess counts do not preserve once a
        session ends.
        """
        if not session_id:
            return []
        conn = self._conn()
        rows = conn.execute(
            "SELECT pid, tool, role, joined_at FROM session_processes"
            " WHERE session_id = ? ORDER BY joined_at ASC, pid ASC",
            (session_id,),
        )
        return _rows_to_dicts(rows)

    # ── File write index ──────────────────────────────────────────

    def record_file_write(self, row: FileWriteRow) -> bool:
        """Persist a write-like file event. Returns True if inserted."""
        if not row.path:
            return False
        conn = self._conn()
        if row.source_event_id and row.source_event_kind != TRANSCRIPT_SOURCE:
            known = conn.execute(
                "SELECT 1 FROM file_write_events WHERE session_id = ? AND source_event_id = ?"
                " AND source_event_kind = ? LIMIT 1",
                (row.session_id, row.source_event_id, TRANSCRIPT_SOURCE),
            ).fetchone()
            if known:
                return False  # the session file already gave this edit, with line counts
        dedup = row.dedup_key or _dedup_key(
            row.session_id,
            row.source_event_id or str(row.ts),
            row.operation,
            row.path,
            row.source_event_kind,
        )
        cur = conn.execute(
            "INSERT OR IGNORE INTO file_write_events"
            "(dedup_key, ts, session_id, tool, tool_name, operation, path,"
            " project_path, pid, source_event_kind, source_event_id,"
            " content_hash, size_bytes, detail)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                dedup,
                row.ts,
                row.session_id,
                row.tool,
                row.tool_name,
                row.operation,
                row.path,
                row.project_path,
                row.pid,
                row.source_event_kind,
                row.source_event_id,
                row.content_hash,
                row.size_bytes,
                json.dumps(row.detail),
            ),
        )
        conn.commit()
        return cur.rowcount > 0

    def query_file_writes(
        self,
        session_id: str | None = None,
        path: str | None = None,
        since: float | None = None,
        until: float | None = None,
        tool: str | None = None,
        limit: int = 500,
    ) -> list[dict]:
        """Query file-write events, newest first."""
        conn = self._conn()
        where, params = _where(
            [
                ("session_id = ?", session_id or None),
                ("path = ?", path or None),
                ("ts >= ?", since),
                ("ts <= ?", until),
                ("tool = ?", tool or None),
            ]
        )
        params.append(limit)
        rows = _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM file_write_events{where} ORDER BY ts DESC LIMIT ?",
                params,
            )
        )
        for row in rows:
            row["detail"] = _json(row.get("detail"))
        return rows

    # ── Data quality status ───────────────────────────────────────

    def record_data_quality(
        self,
        component: str,
        status: str,
        *,
        source: str = "",
        kind: str = "",
        severity: str = "",
        message: str = "",
        detail: dict[str, Any] | None = None,
        ts: float | None = None,
    ) -> None:
        """Upsert the current health of a data-producing component."""
        if not component or not status:
            return
        seen_key = (component, source)
        if ts is None:
            seen = self._quality_seen.get(seen_key)
            ts = time.time()
            if seen and seen[:2] == (status, message) and ts - seen[2] < QUALITY_REWRITE_S:
                return
        self._quality_seen[seen_key] = (status, message, ts)
        conn = self._conn()
        prev = conn.execute(
            "SELECT count, last_ok_at FROM data_quality_status WHERE component = ? AND source = ?",
            (component, source),
        ).fetchone()
        count = (int(prev[0]) + 1) if prev else 1
        last_ok_at = ts if status == "ok" else (float(prev[1] or 0) if prev else 0.0)
        conn.execute(
            "INSERT OR REPLACE INTO data_quality_status"
            "(component, source, kind, status, severity, message, updated_at, last_ok_at, count, detail)"
            " VALUES(?,?,?,?,?,?,?,?,?,?)",
            (
                component,
                source,
                kind,
                status,
                severity,
                message,
                ts,
                last_ok_at,
                count,
                json.dumps(detail or {}),
            ),
        )
        conn.commit()

    def query_data_quality(
        self,
        *,
        status: str | None = None,
        kind: str | None = None,
        component: str | None = None,
        limit: int = 500,
    ) -> list[dict]:
        """Return current data-quality statuses, newest first."""
        conn = self._conn()
        where, params = _where(
            [
                ("status = ?", status or None),
                ("kind = ?", kind or None),
                ("component = ?", component or None),
            ]
        )
        params.append(limit)
        rows = _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM data_quality_status{where} ORDER BY updated_at DESC LIMIT ?",
                params,
            )
        )
        for row in rows:
            row["detail"] = _json(row.get("detail"))
        return rows

    def query_requests_analytics(
        self,
        since: float | None = None,
        until: float | None = None,
        limit: int = 2000,
        tools: tuple[str, ...] | list[str] | None = None,
    ) -> list[dict]:
        """Return lightweight request rows for analytics (no large text fields).

        `tools` is the dashboard tool selection: None is every tool, an empty
        list is none. The filter runs before the LIMIT, so the rows returned are
        the selected tools' own newest rows.
        """
        conn = self._conn()
        join, cond, tparams = _tool_scope("r", "rs", tools)
        where, params = _where([("r.ts >= ?", since), ("r.ts <= ?", until)])
        where = _and(where, cond)
        params = [*params, *tparams, limit]
        return _rows_to_dicts(
            conn.execute(
                "SELECT r.ts, r.session_id, r.agent_id, r.model, r.input_tokens, r.output_tokens,"
                " r.cache_read_tokens, r.cost_usd, r.duration_ms, r.finish_reason, r.is_error"
                f" FROM requests r{join}{where} ORDER BY r.ts DESC LIMIT ?",
                params,
            )
        )

    def query_response_time_by_model(
        self,
        since: float | None = None,
        until: float | None = None,
        tools: tuple[str, ...] | list[str] | None = None,
    ) -> list[dict]:
        """Reply-time figures per model over every request in the window, in SQL.

        Returns ``[{model, count, avg_ms, p50_ms, p95_ms, total_tokens}]``. The
        percentile is the value at rank ``n // 2`` and ``min(int(n * 0.95), n - 1)``
        of the sorted durations, so it uses no row limit.
        """
        join, cond, tparams = _tool_scope("r", "rs", tools)
        where, params = _where([("r.ts >= ?", since), ("r.ts <= ?", until)])
        where = _and(where, cond)
        rows = self._conn().execute(
            "WITH ranked AS (SELECT COALESCE(NULLIF(r.model, ''), '(unknown)') AS m,"
            " COALESCE(r.duration_ms, 0) AS d,"
            " COALESCE(r.input_tokens, 0) + COALESCE(r.output_tokens, 0) AS t,"
            " ROW_NUMBER() OVER (PARTITION BY COALESCE(NULLIF(r.model, ''), '(unknown)')"
            " ORDER BY COALESCE(r.duration_ms, 0)) AS rn,"
            " COUNT(*) OVER (PARTITION BY COALESCE(NULLIF(r.model, ''), '(unknown)')) AS n"
            f" FROM requests r{join}{where})"
            " SELECT m, MAX(n), AVG(d), SUM(t),"
            " MAX(CASE WHEN rn = n / 2 + 1 THEN d END),"
            " MAX(CASE WHEN rn = MIN(CAST(n * 0.95 AS INTEGER), n - 1) + 1 THEN d END)"
            " FROM ranked GROUP BY m ORDER BY m",
            [*params, *tparams],
        ).fetchall()
        return [
            {"model": m, "count": n, "avg_ms": round(avg, 1), "p50_ms": round(p50, 1), "p95_ms": round(p95, 1), "total_tokens": tokens}
            for m, n, avg, tokens, p50, p95 in rows
        ]

    def count_requests_unattributed(self, since: float | None = None, until: float | None = None) -> int:
        """Requests in the window whose tool is unknown, even through their session."""
        join, cond, tparams = _unattributed_scope("r", "rs")
        where, params = _where([("r.ts >= ?", since), ("r.ts <= ?", until)])
        row = self._conn().execute(
            f"SELECT COUNT(*) FROM requests r{join}{_and(where, cond)}", [*params, *tparams]
        ).fetchone()
        return int(row[0] or 0)

    def query_tool_invocations_agg(
        self,
        since: float | None = None,
        until: float | None = None,
        tools: tuple[str, ...] | list[str] | None = None,
    ) -> list[dict]:
        """Aggregate tool invocations by tool_name in SQL.

        Returns [{tool_name, count, total_ms, error_count}] — no per-row transfer.
        """
        conn = self._conn()
        join, cond, tparams = _tool_scope("ti", "tis", tools)
        where, params = _where([("ti.ts >= ?", since), ("ti.ts <= ?", until)])
        return _rows_to_dicts(
            conn.execute(
                "SELECT ti.tool_name, COUNT(*) as count,"
                " SUM(ti.duration_ms) as total_ms,"
                " SUM(CASE WHEN ti.is_error THEN 1 ELSE 0 END) as error_count"
                f" FROM tool_invocations ti{join}{_and(where, cond)}"
                " GROUP BY ti.tool_name ORDER BY count DESC",
                [*params, *tparams],
            )
        )

    def count_tool_invocations_unattributed(self, since: float | None = None, until: float | None = None) -> int:
        """Tool invocations in the window whose tool is unknown, even through their session."""
        join, cond, tparams = _unattributed_scope("ti", "tis")
        where, params = _where([("ti.ts >= ?", since), ("ti.ts <= ?", until)])
        row = self._conn().execute(
            f"SELECT COUNT(*) FROM tool_invocations ti{join}{_and(where, cond)}", [*params, *tparams]
        ).fetchone()
        return int(row[0] or 0)

    def query_tool_analytics_from_events(
        self,
        since: float | None = None,
        until: float | None = None,
        tools: tuple[str, ...] | list[str] | None = None,
    ) -> list[dict]:
        """Compute tool usage analytics by matching Pre/PostToolUse events.

        Joins events by tool_use_id to compute real durations.  This is more
        accurate than tool_invocations (which had a dedup bug) and captures
        all invocations, not just the ones that survived dedup.

        Returns [{tool_name, count, avg_ms, total_ms, error_count, durations}].
        """
        conn = self._conn()
        join, cond, tparams = _tool_scope("pre", "pres", tools)
        # Build WHERE clause for the pre-event timestamp range
        where, params = _where([("pre.ts >= ?", since), ("pre.ts <= ?", until)])
        where = _and(where, cond)

        rows = _rows_to_dicts(
            conn.execute(
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
                f"{join}{where}"
                " GROUP BY tool_name ORDER BY count DESC",
                [*params, *tparams],
            )
        )
        return rows

    def count_tool_events_unattributed(self, since: float | None = None, until: float | None = None) -> int:
        """Matched Pre/PostToolUse pairs in the window whose tool is unknown, even through their session."""
        join, cond, tparams = _unattributed_scope("pre", "pres")
        where, params = _where([("pre.ts >= ?", since), ("pre.ts <= ?", until)])
        row = self._conn().execute(
            "SELECT COUNT(*) FROM events pre"
            " JOIN events post"
            "  ON json_extract(pre.detail, '$.tool_use_id') = json_extract(post.detail, '$.tool_use_id')"
            "  AND pre.kind = 'hook:PreToolUse'"
            "  AND post.kind = 'hook:PostToolUse'"
            f"{join}{_and(where, cond)}",
            [*params, *tparams],
        ).fetchone()
        return int(row[0] or 0)

    def query_tool_breakdown_from_events(
        self,
        since: float | None = None,
        until: float | None = None,
        tools: tuple[str, ...] | list[str] | None = None,
    ) -> dict[str, list[dict]]:
        """Per tool_name, return count breakdown by CLI tool (claude-code, codex, …).

        Returns {tool_name: [{cli_tool, count}, …], …}.
        """
        conn = self._conn()
        join, cond, tparams = _tool_scope("pre", "pres", tools)
        where, params = _where([("pre.ts >= ?", since), ("pre.ts <= ?", until)])
        where = _and(where, cond)
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
            f"{join}{where}"
            " GROUP BY tool_name, cli_tool ORDER BY tool_name, count DESC",
            [*params, *tparams],
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
        tools: tuple[str, ...] | list[str] | None = None,
    ) -> list[float]:
        """Return raw duration_ms values for a tool from Pre/Post event matching."""
        conn = self._conn()
        join, cond, tparams = _tool_scope("pre", "pres", tools)
        where, params = _where(
            [
                ("json_extract(pre.detail, '$.tool_name') = ?", tool_name),
                ("pre.ts >= ?", since),
                ("pre.ts <= ?", until),
            ]
        )
        where = _and(where, cond)
        return [
            r[0]
            for r in conn.execute(
                "SELECT ROUND((post.ts - pre.ts) * 1000, 1) as duration_ms"
                " FROM events pre"
                " JOIN events post"
                "  ON json_extract(pre.detail, '$.tool_use_id') = json_extract(post.detail, '$.tool_use_id')"
                "  AND pre.kind = 'hook:PreToolUse'"
                "  AND post.kind = 'hook:PostToolUse'"
                f"{join}{where}"
                " ORDER BY pre.ts DESC LIMIT ?",
                [*params, *tparams, limit],
            ).fetchall()
        ]

    def query_tool_invocations_durations(
        self,
        tool_name: str,
        since: float | None = None,
        until: float | None = None,
        limit: int = 500,
        tools: tuple[str, ...] | list[str] | None = None,
    ) -> list[float]:
        """Return raw duration_ms values for a single tool (for percentile calc)."""
        conn = self._conn()
        join, cond, tparams = _tool_scope("ti", "tis", tools)
        where, params = _where(
            [
                ("ti.tool_name = ?", tool_name),
                ("ti.ts >= ?", since),
                ("ti.ts <= ?", until),
            ]
        )
        where = _and(where, cond)
        return [
            row[0]
            for row in conn.execute(
                f"SELECT ti.duration_ms FROM tool_invocations ti{join}{where} ORDER BY ti.ts DESC LIMIT ?",
                [*params, *tparams, limit],
            )
        ]

    def query_file_modified_events(
        self,
        since: float | None = None,
        until: float | None = None,
        tools: tuple[str, ...] | list[str] | None = None,
        limit: int = 5000,
    ) -> list[tuple]:
        """``file_modified`` events as (ts, path, growth_bytes), oldest first."""
        join, cond, tparams = _tool_scope("e", "es", tools)
        where, params = _where([("e.kind = ?", "file_modified"), ("e.ts >= ?", since), ("e.ts <= ?", until)])
        return self._conn().execute(
            "SELECT e.ts, json_extract(e.detail, '$.path'),"
            " CAST(json_extract(e.detail, '$.growth_bytes') AS INTEGER)"
            f" FROM events e{join}{_and(where, cond)} ORDER BY e.ts LIMIT ?",
            [*params, *tparams, limit],
        ).fetchall()

    def count_file_modified_unattributed(self, since: float | None = None, until: float | None = None) -> int:
        """``file_modified`` events in the window whose tool is unknown, even through their session."""
        join, cond, tparams = _unattributed_scope("e", "es")
        where, params = _where([("e.kind = ?", "file_modified"), ("e.ts >= ?", since), ("e.ts <= ?", until)])
        row = self._conn().execute(
            f"SELECT COUNT(*) FROM events e{join}{_and(where, cond)}", [*params, *tparams]
        ).fetchone()
        return int(row[0] or 0)

    # ── Processes (new) ────────────────────────────────────────────

    def upsert_process(self, row: ProcessRow) -> None:
        """Insert a process (INSERT OR IGNORE on UNIQUE(pid, started_at))."""
        conn = self._conn()
        conn.execute(
            "INSERT OR IGNORE INTO processes"
            "(pid, tool, project_path, cwd, cmdline, ppid,"
            " started_at, ended_at, exit_code, source, meta)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (
                row.pid,
                row.tool,
                row.project_path,
                row.cwd,
                row.cmdline,
                row.ppid,
                row.started_at,
                row.ended_at,
                row.exit_code,
                row.source,
                json.dumps(row.meta),
            ),
        )
        conn.commit()

    def update_process_exit(
        self,
        pid: int,
        started_at: float,
        ended_at: float,
        exit_code: int | None = None,
    ) -> None:
        """Update process exit info."""
        conn = self._conn()
        conn.execute(
            "UPDATE processes SET ended_at = ?, exit_code = ? WHERE pid = ? AND started_at = ?",
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
        return _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM processes{where} ORDER BY started_at DESC",
                params,
            )
        )

    # ── Agents (new) ───────────────────────────────────────────────

    def upsert_agent(self, row: AgentRow) -> None:
        """Insert or update an agent. A role already stored in ``task`` stays."""
        conn = self._conn()
        conn.execute(
            "INSERT INTO agents"
            "(agent_id, session_id, tool, task, model, is_sidechain,"
            " started_at, ended_at, completed, input_tokens, output_tokens,"
            " cache_read_tokens, cache_creation_tokens, cost_usd)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            " ON CONFLICT(agent_id) DO UPDATE SET session_id=excluded.session_id, tool=excluded.tool,"
            " task=CASE WHEN agents.task != '' THEN agents.task ELSE excluded.task END,"
            " model=excluded.model, is_sidechain=excluded.is_sidechain, started_at=excluded.started_at,"
            " ended_at=excluded.ended_at, completed=excluded.completed, input_tokens=excluded.input_tokens,"
            " output_tokens=excluded.output_tokens, cache_read_tokens=excluded.cache_read_tokens,"
            " cache_creation_tokens=excluded.cache_creation_tokens, cost_usd=excluded.cost_usd",
            (
                row.agent_id,
                row.session_id,
                row.tool,
                # This writer's task can be a prompt, so it follows the capture mode.
                row.task if self._keeps_text() else "",
                row.model,
                row.is_sidechain,
                row.started_at,
                row.ended_at,
                row.completed,
                row.input_tokens,
                row.output_tokens,
                row.cache_read_tokens,
                row.cache_creation_tokens,
                round(row.cost_usd, 6),
            ),
        )
        conn.commit()

    # ── Per-call facts read from session files ────────────────────

    @_named_write("write_call_facts")
    def write_call_facts(self, facts: CallFacts) -> int:
        """Write rows read from tools' session files, in one transaction.

        A second write of the same call merges into its row, so a re-read adds
        nothing and a later line can complete an earlier one. For each session
        written, rows of the same calls from hooks, OTel and the agent-team scan
        are folded in or removed, so ``requests`` holds one row per model call
        and ``tool_invocations`` one row per tool call.
        """
        if not len(facts):
            return 0
        conn = self._conn()
        try:
            self._promote_hook_tool_rows(conn, facts.tools)
            conn.executemany(_REQUEST_UPSERT, [_request_params(r) for r in facts.requests])
            conn.executemany(_TOOL_UPSERT, [_tool_params(r) for r in facts.tools])
            conn.executemany(
                "INSERT OR IGNORE INTO session_prompts"
                "(dedup_key, ts, session_id, agent_id, tool, project_path, text, prompt_file)"
                " VALUES(?,?,?,?,?,?,?,?)",
                [
                    (r.dedup_key, r.ts, r.session_id, r.agent_id, r.tool, r.project_path, r.text, r.prompt_file)
                    for r in facts.prompts
                ],
            )
            conn.executemany(
                "INSERT OR IGNORE INTO skill_uses"
                "(dedup_key, ts, session_id, agent_id, tool, project_path, name, trigger)"
                " VALUES(?,?,?,?,?,?,?,?)",
                [(r.dedup_key, r.ts, r.session_id, r.agent_id, r.tool, r.project_path, r.name, r.trigger) for r in facts.skills],
            )
            conn.executemany(
                "INSERT OR IGNORE INTO context_events"
                "(dedup_key, ts, session_id, agent_id, tool, kind, trigger, before_tokens, after_tokens, duration_ms,"
                " current_tokens, system_tokens, conversation_tokens, tool_tokens)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                [
                    (
                        r.dedup_key, r.ts, r.session_id, r.agent_id, r.tool, r.kind, r.trigger, r.before_tokens, r.after_tokens,
                        r.duration_ms, r.current_tokens, r.system_tokens, r.conversation_tokens, r.tool_tokens,
                    )
                    for r in facts.context_events
                ],
            )
            conn.executemany(_SUBAGENT_UPSERT, [_subagent_params(r) for r in facts.agents])
            self._write_transcript_file_edits(conn, facts.file_writes)
            self._drop_superseded_rows(conn, facts)
            conn.commit()
        except sqlite3.Error:
            conn.rollback()
            raise
        return len(facts)

    @staticmethod
    def _promote_hook_tool_rows(conn: sqlite3.Connection, tools: list[ToolInvocationRow]) -> None:
        """Give a hook's row for a call the transcript key, so the upsert merges into it.

        The hook row keeps what only it has, such as the full input and result text.
        """
        by_session: dict[str, dict[str, str]] = {}
        for r in tools:
            if r.source_event_id:
                by_session.setdefault(r.session_id, {})[r.source_event_id] = r.dedup_key
        for session_id, keys in by_session.items():
            hook_ids = conn.execute(
                "SELECT source_event_id FROM tool_invocations WHERE session_id = ? AND source = 'hook' AND source_event_id != ''",
                (session_id,),
            ).fetchall()
            for (event_id,) in hook_ids:
                if event_id in keys:
                    conn.execute(
                        "UPDATE OR IGNORE tool_invocations SET dedup_key = ?, source = ?"
                        " WHERE session_id = ? AND source = 'hook' AND source_event_id = ?",
                        (keys[event_id], TRANSCRIPT_SOURCE, session_id, event_id),
                    )

    @staticmethod
    def _write_transcript_file_edits(conn: sqlite3.Connection, rows: list[FileWriteRow]) -> None:
        for r in rows:
            if r.source_event_id:
                conn.execute(
                    "DELETE FROM file_write_events WHERE session_id = ? AND source_event_id = ? AND source_event_kind != ?",
                    (r.session_id, r.source_event_id, TRANSCRIPT_SOURCE),
                )
            conn.execute(
                "INSERT INTO file_write_events"
                "(dedup_key, ts, session_id, tool, tool_name, operation, path, project_path, pid,"
                " source_event_kind, source_event_id, content_hash, size_bytes, detail)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
                " ON CONFLICT(dedup_key) WHERE dedup_key != '' DO UPDATE SET detail=excluded.detail, tool=excluded.tool",
                (
                    r.dedup_key,
                    r.ts,
                    r.session_id,
                    r.tool,
                    r.tool_name,
                    r.operation,
                    r.path,
                    r.project_path,
                    r.pid,
                    TRANSCRIPT_SOURCE,
                    r.source_event_id,
                    r.content_hash,
                    r.size_bytes,
                    json.dumps(r.detail),
                ),
            )

    @staticmethod
    def _drop_superseded_rows(conn: sqlite3.Connection, facts: CallFacts) -> None:
        """Remove other writers' rows for calls the session file now covers.

        Only up to the newest call read: a live hook or OTel row for a later call
        stays until the file catches up.
        """
        newest: dict[tuple[str, str], float] = {}
        for table, rows in (("requests", facts.requests), ("tool_invocations", facts.tools)):
            for r in rows:
                key = (table, r.session_id)
                newest[key] = max(newest.get(key, 0.0), r.ts)
        for (table, session_id), ts in newest.items():
            sources = _SUPERSEDED_SOURCES[table]
            marks = ",".join("?" for _ in sources)
            conn.execute(
                f"DELETE FROM {table} WHERE session_id = ? AND ts <= ? AND source IN ({marks})",
                (session_id, ts, *sources),
            )

    def set_sessions_tool(self, session_ids: list[str], tool: str) -> None:
        """Re-attribute sessions' fact rows, when their surface becomes known after they were written."""
        conn = self._conn()
        for table in ("requests", "tool_invocations", "session_prompts", "skill_uses", "agents", "file_write_events", "context_events"):
            conn.executemany(
                f"UPDATE {table} SET tool = ? WHERE session_id = ? AND tool != ?",
                [(tool, session_id, tool) for session_id in session_ids],
            )
        conn.commit()

    def clear_stale_pending_confirms(self, before: float) -> int:
        """A prompt left open this long belongs to a session that is gone, not one still waiting."""
        conn = self._conn()
        cur = conn.execute("UPDATE tool_invocations SET confirm = '' WHERE confirm = 'pending' AND ts < ?", (before,))
        conn.commit()
        return cur.rowcount

    def query_agents(self, session_id: str) -> list[dict]:
        """Query agents for a session."""
        conn = self._conn()
        return _rows_to_dicts(
            conn.execute(
                "SELECT * FROM agents WHERE session_id = ? ORDER BY started_at",
                (session_id,),
            )
        )

    # ── Config/env (new) ──────────────────────────────────────────

    def upsert_tool_config(
        self,
        ts: float,
        tool: str,
        project_path: str,
        key: str,
        value: str,
        source: str = "",
    ) -> bool:
        """Upsert tool config. Returns True if value changed."""
        conn = self._conn()
        # Check last value
        cur = conn.execute(
            "SELECT value FROM tool_config WHERE tool = ? AND project_path = ? AND key = ? ORDER BY ts DESC LIMIT 1",
            (tool, project_path, key),
        )
        row = cur.fetchone()
        if row and row[0] == value:
            return False  # unchanged
        conn.execute(
            "INSERT OR REPLACE INTO tool_config(ts, tool, project_path, key, value, source) VALUES(?,?,?,?,?,?)",
            (ts, tool, project_path, key, value, source),
        )
        conn.commit()
        return True

    def upsert_env_var(
        self,
        ts: float,
        project_path: str,
        tool: str,
        key: str,
        value: str,
        is_secret: bool = False,
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
        commit: bool = True,
    ) -> bool:
        """Insert or lazily update a tracked file.

        Returns True if content actually changed (new or different hash).
        ``commit=False`` defers the commit to the caller (used by
        ``sync_files_from_discovery`` for single-transaction sync passes).
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
                cur2 = conn.execute("SELECT last_changed FROM files WHERE path = ?", (path,))
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
                (
                    path,
                    tool,
                    category,
                    scope,
                    content,
                    blob_hash,
                    new_hash,
                    new_size,
                    new_tokens,
                    new_lines,
                    mtime or 0,
                    first_seen,
                    now,
                    last_changed if changed else (row[0] if row else now) and last_changed,
                    json.dumps(meta or {}),
                ),
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
                    (path, now, hist_content, hist_blob_hash, new_hash, new_size, new_tokens, new_lines),
                )
        else:
            meta_json = json.dumps(meta or {})
            if row:
                conn.execute(
                    "UPDATE files SET tool=?, category=?, scope=?, mtime=?, meta=? WHERE path=?",
                    (tool, category, scope, mtime or 0, meta_json, path),
                )
            else:
                conn.execute(
                    "INSERT INTO files(path, tool, category, scope, mtime, first_seen, meta) VALUES(?,?,?,?,?,?,?)",
                    (path, tool, category, scope, mtime or 0, now, meta_json),
                )

        if commit:
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
        where, params = _where(
            [
                ("tool = ?", tool or None),
                ("category = ?", category or None),
                ("last_changed >= ?", changed_since),
            ]
        )
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
        return _rows_to_dicts(
            conn.execute(
                "SELECT ts, content_hash, size_bytes, tokens, lines"
                " FROM file_history WHERE path = ? ORDER BY ts DESC LIMIT ?",
                (path, limit),
            )
        )

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
        rows = _rows_to_dicts(
            conn.execute(
                f"SELECT path, ts, content_hash, size_bytes, tokens, lines FROM file_history{where} ORDER BY path, ts",
                params,
            )
        )
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
            "SELECT content, blob_hash FROM file_history WHERE path = ? AND ts <= ? ORDER BY ts DESC LIMIT 1",
            (path, ts),
        )
        row = cur.fetchone()
        if not row:
            return None
        return self._resolve_content(conn, row[0] or "", row[1] or "")

    def remove_file(self, path: str, commit: bool = True) -> bool:
        """Remove a file from the store. Returns True if it existed."""
        conn = self._conn()
        cur = conn.execute("DELETE FROM files WHERE path = ?", (path,))
        if commit:
            conn.commit()
        return cur.rowcount > 0

    def sync_files_from_discovery(
        self,
        discovered: list[dict[str, Any]],
        read_content: bool = False,
        max_content_bytes: int = FILE_SYNC_MAX_CONTENT_BYTES,
        max_reads: int = FILE_SYNC_MAX_READS,
    ) -> dict[str, int]:
        """Bulk sync from discovery results.

        Lazy: only reads file content when mtime differs from stored mtime.
        Content policy:
          * oversize files (> ``max_content_bytes``) and sensitive basenames
            (``SENSITIVE_FILE_PATTERNS``) are upserted metadata-only — their
            mtime IS stored, so they are not re-read every pass;
          * at most ``max_reads`` content reads per pass — files beyond the
            budget are skipped entirely (not upserted, so their stored mtime
            cannot mask them) and counted as ``deferred``; they retry next
            pass.

        The whole pass runs in a single transaction (one commit).
        Returns {"added", "updated", "unchanged", "removed", "deferred"}.
        """
        conn = self._conn()
        stats = {"added": 0, "updated": 0, "unchanged": 0, "removed": 0, "deferred": 0}
        seen_paths: set[str] = set()
        reads_done = 0

        try:
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
                if _is_sensitive_path(path):
                    # Never store content for sensitive basenames.
                    content = None
                elif content is None and read_content:
                    size = item.get("size") or 0
                    if not size:
                        try:
                            size = Path(path).stat().st_size
                        except OSError:
                            size = 0
                    if size > max_content_bytes:
                        # Oversize: metadata-only upsert, no read.
                        content = None
                    elif reads_done >= max_reads:
                        # Budget exhausted: skip entirely (no upsert) so the
                        # stored mtime cannot mask this file; retries next pass.
                        stats["deferred"] += 1
                        continue
                    else:
                        reads_done += 1
                        try:
                            content = Path(path).read_text(encoding="utf-8", errors="replace")
                        except OSError:
                            content = None
                elif content is not None and len(content.encode("utf-8", errors="replace")) > max_content_bytes:
                    # Oversize inline content: metadata only.
                    content = None

                if content is not None:
                    changed = self.upsert_file(
                        path=path,
                        tool=tool,
                        category=category,
                        scope=scope,
                        content=content,
                        mtime=mtime,
                        commit=False,
                    )
                    if existing:
                        stats["updated" if changed else "unchanged"] += 1
                    else:
                        stats["added"] += 1
                else:
                    self.upsert_file(
                        path=path,
                        tool=tool,
                        category=category,
                        scope=scope,
                        mtime=mtime,
                        commit=False,
                    )
                    if existing:
                        stats["unchanged"] += 1
                    else:
                        stats["added"] += 1

            # Remove files no longer in discovery
            cur = conn.execute("SELECT path FROM files")
            for (stored_path,) in cur.fetchall():
                if stored_path not in seen_paths:
                    self.remove_file(stored_path, commit=False)
                    stats["removed"] += 1

            conn.commit()
        except Exception:
            conn.rollback()
            raise

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
        where, params = _where(
            [
                ("metric = ?", metric or None),
                ("metric LIKE ?", (metric_prefix + "%") if metric_prefix else None),
                ("ts >= ?", since),
                ("ts <= ?", until),
            ]
        )
        if tag_filter:
            for k in tag_filter:
                if not _TAG_KEY_RE.match(k):
                    raise ValueError(f"Invalid tag key: {k!r}")
            prefix = " AND " if where else " WHERE "
            where += prefix + " AND ".join(f"json_extract(tags, '$.{k}') = ?" for k in tag_filter)
            params.extend(tag_filter.values())
        params.append(limit)
        cur = conn.execute(
            f"SELECT ts, metric, value, tags FROM metrics{where} ORDER BY ts DESC LIMIT ?",
            params,
        )
        return [Metric(ts=r[0], metric=r[1], value=r[2], tags=_json(r[3])) for r in cur.fetchall()]

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
        agg = _rows_to_dicts(
            conn.execute(
                f"SELECT metric, COUNT(*) as count, MAX(ts) as latest_ts"
                f" FROM metrics{where} GROUP BY metric ORDER BY metric",
                params,
            )
        )
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
        for t in _rows_to_dicts(
            conn.execute(
                "SELECT id, key, title, shortcut, sort_order, visible, icon"
                " FROM ui_tab WHERE dashboard_id = ? ORDER BY sort_order",
                (dash_id,),
            )
        ):
            tab_id_to_key[t["id"]] = t["key"]
            gbo = conn.execute(
                "SELECT key, label, sort_order, is_default"
                " FROM ui_group_by_option WHERE tab_id = ? ORDER BY sort_order",
                (t["id"],),
            ).fetchall()
            tabs.append(
                {
                    "key": t["key"],
                    "title": t["title"],
                    "shortcut": t["shortcut"],
                    "sort_order": t["sort_order"],
                    "visible": bool(t["visible"]),
                    "icon": t["icon"],
                    "group_by_options": [{"key": g[0], "label": g[1], "is_default": bool(g[3])} for g in gbo],
                }
            )

        # ── Datasources ──
        ds_by_id: dict[int, str] = {}
        datasources: dict[str, dict] = {}
        for d in _rows_to_dicts(conn.execute("SELECT id, key, kind, endpoint, poll_ms, config FROM ui_datasource")):
            ds_by_id[d["id"]] = d["key"]
            datasources[d["key"]] = {
                "kind": d["kind"],
                "endpoint": d["endpoint"],
                "poll_ms": d["poll_ms"],
                "config": json.loads(d["config"] or "{}"),
            }

        # ── Sections + widgets ──
        sections: list[dict] = []
        for s in _rows_to_dicts(
            conn.execute(
                "SELECT id, key, title, sort_order, visible, collapsed, columns, tab_id"
                " FROM ui_section WHERE dashboard_id = ? ORDER BY sort_order",
                (dash_id,),
            )
        ):
            widgets: list[dict] = []
            for w in _rows_to_dicts(
                conn.execute(
                    "SELECT id, key, kind, title, sort_order, col_span, row_span,"
                    " visible, config"
                    " FROM ui_widget WHERE section_id = ? ORDER BY sort_order",
                    (s["id"],),
                )
            ):
                wd_rows = conn.execute(
                    "SELECT datasource_id, role FROM ui_widget_datasource WHERE widget_id = ?",
                    (w["id"],),
                ).fetchall()
                widgets.append(
                    {
                        "key": w["key"],
                        "kind": w["kind"],
                        "title": w["title"],
                        "sort_order": w["sort_order"],
                        "col_span": w["col_span"],
                        "row_span": w["row_span"],
                        "visible": bool(w["visible"]),
                        "config": json.loads(w["config"] or "{}"),
                        "datasources": [{"key": ds_by_id.get(wd[0], ""), "role": wd[1]} for wd in wd_rows],
                    }
                )
            sections.append(
                {
                    "key": s["key"],
                    "title": s["title"],
                    "sort_order": s["sort_order"],
                    "visible": bool(s["visible"]),
                    "collapsed": bool(s["collapsed"]),
                    "columns": s["columns"],
                    "tab_key": tab_id_to_key.get(s["tab_id"]) if s["tab_id"] else None,
                    "widgets": widgets,
                }
            )

        # ── Preferences ──
        prefs = {
            r[0]: r[1]
            for r in conn.execute(
                "SELECT pref_key, pref_value FROM ui_preference WHERE dashboard_id = ? AND user_id IS NULL",
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
                "DELETE FROM ui_preference WHERE dashboard_id = ? AND user_id IS NULL AND pref_key = ?",
                (dash_id, pref_key),
            )
            conn.execute(
                "INSERT INTO ui_preference(dashboard_id, user_id, pref_key, pref_value) VALUES(?, NULL, ?, ?)",
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
        prefs = dict(
            conn.execute(
                "SELECT pref_key, pref_value FROM ui_preference WHERE dashboard_id = ? AND user_id IS NULL",
                (dash_id,),
            ).fetchall()
        )
        if user_id is not None:
            prefs.update(
                conn.execute(
                    "SELECT pref_key, pref_value FROM ui_preference WHERE dashboard_id = ? AND user_id = ?",
                    (dash_id, user_id),
                ).fetchall()
            )
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
        section_id = conn.execute("SELECT id FROM ui_section WHERE key = ?", (section_key,)).fetchone()
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
        self._update_ui_row(
            "ui_widget", key, {"visible", "title", "sort_order", "config", "col_span", "row_span"}, **kwargs
        )

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
        dash_id = conn.execute("SELECT id FROM ui_dashboard WHERE slug = ?", (slug,)).fetchone()[0]

        # Clear old child rows
        old_section_ids = [
            r[0] for r in conn.execute("SELECT id FROM ui_section WHERE dashboard_id = ?", (dash_id,)).fetchall()
        ]
        if old_section_ids:
            ph = _placeholders(old_section_ids)
            old_widget_ids = [
                r[0]
                for r in conn.execute(
                    f"SELECT id FROM ui_widget WHERE section_id IN ({ph})",
                    old_section_ids,
                ).fetchall()
            ]
            if old_widget_ids:
                conn.execute(
                    f"DELETE FROM ui_widget_datasource WHERE widget_id IN ({_placeholders(old_widget_ids)})",
                    old_widget_ids,
                )
            conn.execute(f"DELETE FROM ui_widget WHERE section_id IN ({ph})", old_section_ids)
        conn.execute("DELETE FROM ui_section WHERE dashboard_id = ?", (dash_id,))

        old_tab_ids = [
            r[0] for r in conn.execute("SELECT id FROM ui_tab WHERE dashboard_id = ?", (dash_id,)).fetchall()
        ]
        if old_tab_ids:
            conn.execute(
                f"DELETE FROM ui_group_by_option WHERE tab_id IN ({_placeholders(old_tab_ids)})",
                old_tab_ids,
            )
        conn.execute("DELETE FROM ui_tab WHERE dashboard_id = ?", (dash_id,))
        conn.execute("DELETE FROM ui_preference WHERE dashboard_id = ?", (dash_id,))
        conn.execute("DELETE FROM ui_datasource")

        # Insert tabs
        tab_key_to_id: dict[str, int] = {}
        for t in data.get("tabs", []):
            conn.execute(
                "INSERT INTO ui_tab"
                "(dashboard_id, key, title, shortcut, sort_order, visible, icon)"
                " VALUES(?,?,?,?,?,?,?)",
                (
                    dash_id,
                    t["key"],
                    t.get("title", t["key"]),
                    t.get("shortcut"),
                    t.get("sort_order", 0),
                    int(t.get("visible", True)),
                    t.get("icon"),
                ),
            )
            tab_key_to_id[t["key"]] = _last_id(conn)
            for g in t.get("group_by_options", []):
                conn.execute(
                    "INSERT INTO ui_group_by_option(tab_id, key, label, sort_order, is_default) VALUES(?,?,?,?,?)",
                    (
                        tab_key_to_id[t["key"]],
                        g["key"],
                        g.get("label", g["key"]),
                        g.get("sort_order", 0),
                        int(g.get("is_default", False)),
                    ),
                )

        # Insert datasources
        ds_key_to_id: dict[str, int] = {}
        for dkey, ds in data.get("datasources", {}).items():
            conn.execute(
                "INSERT INTO ui_datasource(key, kind, endpoint, poll_ms, config) VALUES(?,?,?,?,?)",
                (dkey, ds.get("kind", "rest"), ds.get("endpoint"), ds.get("poll_ms"), json.dumps(ds.get("config", {}))),
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
                (
                    dash_id,
                    tab_id,
                    s["key"],
                    s.get("title", s["key"]),
                    s.get("sort_order", 0),
                    int(s.get("visible", True)),
                    int(s.get("collapsed", False)),
                    s.get("columns"),
                ),
            )
            sec_id = _last_id(conn)
            for w in s.get("widgets", []):
                conn.execute(
                    "INSERT INTO ui_widget"
                    "(section_id, key, kind, title, sort_order, col_span,"
                    " row_span, visible, config)"
                    " VALUES(?,?,?,?,?,?,?,?,?)",
                    (
                        sec_id,
                        w["key"],
                        w.get("kind", "stat"),
                        w.get("title", w["key"]),
                        w.get("sort_order", 0),
                        w.get("col_span", 1),
                        w.get("row_span", 1),
                        int(w.get("visible", True)),
                        json.dumps(w.get("config", {})),
                    ),
                )
                wid = _last_id(conn)
                for wd in w.get("datasources", []):
                    ds_id = ds_key_to_id.get(wd.get("key"))
                    if ds_id:
                        conn.execute(
                            "INSERT INTO ui_widget_datasource(widget_id, datasource_id, role) VALUES(?,?,?)",
                            (wid, ds_id, wd.get("role", "primary")),
                        )

        # Insert preferences
        for pkey, pval in data.get("preferences", {}).items():
            conn.execute(
                "INSERT INTO ui_preference(dashboard_id, user_id, pref_key, pref_value) VALUES(?, NULL, ?, ?)",
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
                (
                    s.path_template,
                    s.ai_tool,
                    s.vendor,
                    s.host,
                    s.platform,
                    int(s.hidden),
                    s.scope,
                    s.category,
                    s.sent_to_llm,
                    s.approx_tokens,
                    s.read_write,
                    s.survives_compaction,
                    s.cacheable,
                    s.loaded_when,
                    s.path_args,
                    s.description,
                    s.resolution,
                    s.root_strategy,
                )
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
                (
                    s.process_name,
                    s.ai_tool,
                    s.vendor,
                    s.host,
                    s.process_type,
                    s.runtime,
                    s.parent_process,
                    s.starts_at,
                    s.stops_at,
                    int(s.is_daemon),
                    int(s.auto_start),
                    s.listens_port,
                    s.outbound_targets,
                    s.memory_idle_mb,
                    s.memory_active_mb,
                    int(s.known_leak),
                    s.leak_pattern,
                    s.zombie_risk,
                    s.cleanup_command,
                    s.ps_grep_pattern,
                    s.platform,
                    s.description,
                )
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
        where, params = _where(
            [
                ("ai_tool = ?", tool or None),
                ("vendor = ?", vendor or None),
                ("host LIKE ?", (f"%{host}%") if host else None),
                ("category = ?", category or None),
            ]
        )
        return _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM path_defs{where} ORDER BY ai_tool, category, path_template",
                params,
            )
        )

    def query_process_specs(
        self,
        tool: str | None = None,
        vendor: str | None = None,
        host: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query process specs with optional filters."""
        conn = self._conn()
        where, params = _where(
            [
                ("ai_tool = ?", tool or None),
                ("vendor = ?", vendor or None),
                ("host LIKE ?", (f"%{host}%") if host else None),
            ]
        )
        return _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM process_defs{where} ORDER BY ai_tool, process_name",
                params,
            )
        )

    # ── Datapoint Catalog ────────────────────────────────────────

    def query_datapoint_catalog(
        self,
        tab: str | None = None,
        key: str | None = None,
        source_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query the datapoint catalog with optional filters."""
        conn = self._conn()
        where, params = _where(
            [
                ("tab = ?", tab or None),
                ("key = ?", key or None),
                ("source_type = ?", source_type or None),
            ]
        )
        rows = _rows_to_dicts(
            conn.execute(
                f"SELECT * FROM datapoint_catalog{where} ORDER BY tab, section, key",
                params,
            )
        )
        for d in rows:
            d["dynamic_source"] = bool(d.get("dynamic_source"))
            d["source_dynamic"] = _json(d.get("source_dynamic"))
        return rows

    def update_datapoint_source(self, key: str, source_dynamic: dict[str, Any]) -> None:
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
            "system_snapshots": "metrics",  # old: metrics_count
            "process_snapshots": "tool_metrics",  # old: tool_metrics_count
            "events": "events",
            "files": "file_store",  # old: file_store_count
            "file_history": "file_history",
            "file_write_events": "file_write_events",
            "data_quality_status": "data_quality_status",
            "path_defs": "path_specs",  # old: path_specs_count
            "process_defs": "process_specs",  # old: process_specs_count
            "metrics": "samples",  # old: samples_count
        }
        for real_table, compat_name in table_map.items():
            cur = conn.execute(f"SELECT COUNT(*) FROM {real_table}")
            result[f"{compat_name}_count"] = cur.fetchone()[0]

        # Additional new table counts
        for table in ("sessions", "requests", "tool_invocations", "processes", "agents", "tool_stats"):
            cur = conn.execute(f"SELECT COUNT(*) FROM {table}")
            result[f"{table}_count"] = cur.fetchone()[0]

        # Time range (from system_snapshots)
        cur = conn.execute("SELECT MIN(ts), MAX(ts) FROM system_snapshots")
        row = cur.fetchone()
        result["earliest_ts"] = row[0]
        result["latest_ts"] = row[1]

        # File store totals
        cur = conn.execute("SELECT COUNT(*), SUM(size_bytes), SUM(tokens) FROM files")
        row = cur.fetchone()
        result["files_tracked"] = row[0] or 0
        result["files_total_bytes"] = row[1] or 0
        result["files_total_tokens"] = row[2] or 0
        return result

    # ── Compaction ─────────────────────────────────────────────────

    @_named_write("compact")
    def compact(self, *, retention_days: int | None = None, floor: float = 0.0) -> dict[str, int]:
        """Downsample old data and delete expired rows, in small transactions.

        ``retention_days`` overrides the configured retention. Rows with
        ``ts < floor`` are left alone (see :meth:`auto_maintain`). The work is
        split into chunks that commit separately, so writers keep running and
        the WAL stays small. Repeated calls rewrite only buckets that still
        hold more than one row.

        Returns dict of {action: rows_affected}.
        """
        now = time.time()
        conn = self._conn()
        result: dict[str, int] = {}
        days = self._retention_days if retention_days is None else retention_days
        cutoff_retention = now - days * _24H

        # 1. Delete snapshots older than retention
        result["metrics_deleted_30d"] = self._delete_range(conn, "system_snapshots", floor, cutoff_retention)
        result["tool_metrics_deleted_30d"] = self._delete_range(conn, "process_snapshots", floor, cutoff_retention)

        # 2. Downsample system_snapshots 7d-retention to 5-minute buckets
        cutoff_7d = now - _7D
        since = max(cutoff_retention, floor)
        result["metrics_compacted_7d"] = self._downsample(conn, "system_snapshots", since, cutoff_7d, bucket_secs=300)
        result["tool_metrics_compacted_7d"] = self._downsample_process_snapshots(
            conn, since, cutoff_7d, bucket_secs=300
        )

        # 3. Downsample 24h-7d to 1-minute buckets
        cutoff_24h = now - _24H
        since_7d = max(cutoff_7d, floor)
        result["metrics_compacted_24h"] = self._downsample(
            conn, "system_snapshots", since_7d, cutoff_24h, bucket_secs=60
        )
        result["tool_metrics_compacted_24h"] = self._downsample_process_snapshots(
            conn, since_7d, cutoff_24h, bucket_secs=60
        )

        # 4. Delete events older than retention
        result["events_deleted_30d"] = self._delete_range(conn, "events", floor, cutoff_retention)

        # 5. Delete metrics (was samples) older than 7 days
        result["samples_deleted_7d"] = self._delete_range(conn, "metrics", floor, cutoff_7d)

        # 6. Downsample metrics 24h-7d
        self._downsample_metrics(conn, since_7d, cutoff_24h, bucket_secs=300)

        # 7. Downsample metrics 1h-24h
        cutoff_1h = now - _1H
        self._downsample_metrics(conn, max(cutoff_24h, floor), cutoff_1h, bucket_secs=60)

        # 8-10. Delete remaining time-series tables older than retention
        result["telemetry_deleted_30d"] = self._delete_range(conn, "tool_stats", floor, cutoff_retention)
        result["file_history_deleted_30d"] = self._delete_range(conn, "file_history", floor, cutoff_retention)
        result["requests_deleted_30d"] = self._delete_range(conn, "requests", floor, cutoff_retention)
        result["tool_invocations_deleted_30d"] = self._delete_range(conn, "tool_invocations", floor, cutoff_retention)
        result["session_prompts_deleted_30d"] = self._delete_range(conn, "session_prompts", floor, cutoff_retention)
        result["skill_uses_deleted_30d"] = self._delete_range(conn, "skill_uses", floor, cutoff_retention)
        result["context_events_deleted_30d"] = self._delete_range(conn, "context_events", floor, cutoff_retention)

        # 11. Garbage-collect orphaned file blobs (referenced by neither
        # files nor file_history — orphans accumulate as files change and
        # their 30d-old history rows are deleted in steps 8-10).
        cur = conn.execute(
            "DELETE FROM file_blobs WHERE hash NOT IN ("
            " SELECT blob_hash FROM files WHERE blob_hash != ''"
            " UNION SELECT blob_hash FROM file_history WHERE blob_hash != '')"
        )
        result["file_blobs_deleted"] = cur.rowcount

        conn.commit()
        return result

    @staticmethod
    def _rest_after(started: float) -> None:
        """Pause a cleanup loop after one chunk that began at *started*."""
        time.sleep(max(COMPACT_CHUNK_PAUSE_S, (time.monotonic() - started) * COMPACT_REST_RATIO))

    def _delete_range(self, conn: sqlite3.Connection, table: str, since: float, until: float) -> int:
        """Delete ``since <= ts < until`` in chunks that commit separately."""
        total = 0
        while True:
            started = time.monotonic()
            cur = conn.execute(
                f"DELETE FROM {table} WHERE rowid IN"
                f" (SELECT rowid FROM {table} WHERE ts >= ? AND ts < ? LIMIT {COMPACT_CHUNK_ROWS})",
                (since, until),
            )
            conn.commit()
            total += cur.rowcount
            if cur.rowcount < COMPACT_CHUNK_ROWS:
                return total
            self._rest_after(started)

    def _retention_floor(self, now: float) -> float:
        """Oldest ``ts`` automatic maintenance may touch.

        The first daemon run on a DB records when automatic retention was
        armed. Until one full retention period has passed, older rows stay:
        after months of downtime all history looks expired, and the daemon
        must not erase it on start. ``aictl db compact`` removes it on request.
        """
        conn = self._conn()
        row = conn.execute("SELECT value FROM maintenance_state WHERE key='retention_armed_at'").fetchone()
        if row is None:
            conn.execute("INSERT OR IGNORE INTO maintenance_state(key, value) VALUES('retention_armed_at', ?)", (now,))
            conn.commit()
            armed_at = now
        else:
            armed_at = row[0]
        return armed_at if now < armed_at + self._retention_days * _24H else 0.0

    @_named_write("auto_maintain")
    def auto_maintain(self) -> dict[str, int]:
        """Scheduled maintenance: retention, downsampling, WAL and page reclaim."""
        conn = self._conn()
        now = time.time()
        floor = self._retention_floor(now)
        result = self.compact(floor=floor)
        cutoff = now - self._content_retention_days * _24H
        result["text_trimmed"] = self.trim_text(before=cutoff, since=floor)
        # The size budget outranks the grace period: host stability first.
        result["budget_evicted"] = self.enforce_budget()
        # Hand free pages back when the DB was created with auto_vacuum.
        if conn.execute("PRAGMA auto_vacuum").fetchone()[0] == 2:
            conn.execute(f"PRAGMA incremental_vacuum({INCREMENTAL_VACUUM_PAGES})").fetchall()
            conn.commit()
        # PASSIVE never blocks writers; journal_size_limit trims the file.
        try:
            conn.execute("PRAGMA wal_checkpoint(PASSIVE)").fetchall()
        except sqlite3.Error as exc:
            log.debug("Checkpoint deferred: %s", exc)
        return result

    @_named_write("trim_text")
    def trim_text(self, *, before: float | None = None, since: float = 0.0) -> int:
        """Blank conversation text older than ``before`` (default: all), in chunks.

        Metadata in the same rows stays. Returns the number of rows changed.
        """
        before = time.time() if before is None else before
        total = sum(self._trim_table_text(t, c, cols, since, before) for t, c, cols in _TEXT_COLUMNS)
        total += self._trim_event_text(since, before)
        if total:
            self._set_state("content_trimmed_before", before)
        return total

    def _trim_table_text(self, table: str, ts_col: str, columns: dict[str, str], since: float, before: float) -> int:
        conn = self._conn()
        total = 0
        sets = ", ".join(f"{c}='{b}'" for c, b in columns.items())
        has_text = " OR ".join(f"{c}!='{b}'" for c, b in columns.items())
        while True:
            started = time.monotonic()
            cur = conn.execute(
                f"UPDATE {table} SET {sets} WHERE rowid IN (SELECT rowid FROM {table}"
                f" WHERE {ts_col} >= ? AND {ts_col} < ? AND ({has_text}) LIMIT {COMPACT_CHUNK_ROWS})",
                (since, before),
            )
            conn.commit()
            total += cur.rowcount
            if cur.rowcount < COMPACT_CHUNK_ROWS:
                return total
            self._rest_after(started)

    def _trim_event_text(self, since: float, before: float) -> int:
        conn = self._conn()
        total = 0
        last_rowid = 0
        while True:
            rows = conn.execute(
                "SELECT rowid, detail FROM events WHERE rowid > ? AND ts >= ? AND ts < ?"
                " ORDER BY rowid LIMIT ?",
                (last_rowid, since, before, COMPACT_CHUNK_ROWS),
            ).fetchall()
            if not rows:
                return total
            last_rowid = rows[-1][0]
            updates = []
            for rowid, detail in rows:
                try:
                    parsed = json.loads(detail)
                except (TypeError, ValueError):
                    continue
                stripped = strip_event_text(parsed)
                if stripped != parsed:
                    updates.append((json.dumps(stripped), rowid))
            if updates:
                conn.executemany("UPDATE events SET detail=? WHERE rowid=?", updates)
                conn.commit()
                total += len(updates)
            time.sleep(COMPACT_CHUNK_PAUSE_S)

    def trim_text_estimate(self) -> dict[str, int]:
        """Rows and characters of text ``trim_text`` would remove, per table."""
        conn = self._conn()
        out: dict[str, int] = {}
        for table, _ts, columns in _TEXT_COLUMNS:
            for column, blank in columns.items():
                out[f"{table}.{column}"] = conn.execute(
                    f"SELECT COALESCE(SUM(length({column})), 0) FROM {table} WHERE {column} != ?", (blank,)
                ).fetchone()[0]
        return out

    def storage_bytes(self) -> int:
        """Bytes this store takes now: DB, WAL and logs, or memory pages."""
        if self._shared_conn is not None:
            return self._page_bytes()
        return sum(self._file_size(p) for p in self._storage_files())

    def _storage_files(self) -> list[Path]:
        files: list[Path] = []
        if isinstance(self._path, Path):
            files += [self._path, self._path.with_name(self._path.name + "-wal")]
        for p in self._log_paths:
            try:
                files += sorted(p.iterdir()) if p.is_dir() else [p]
            except OSError as exc:
                log.debug("Cannot list %s: %s", p, exc)
        return files

    @staticmethod
    def _file_size(path: Path) -> int:
        try:
            return path.stat().st_size
        except OSError:
            return 0

    def _page_bytes(self, live_only: bool = False) -> int:
        conn = self._conn()
        pages = conn.execute("PRAGMA page_count").fetchone()[0]
        if live_only:
            pages -= conn.execute("PRAGMA freelist_count").fetchone()[0]
        return pages * conn.execute("PRAGMA page_size").fetchone()[0]

    def _evictable_bytes(self) -> int:
        """Live data and logs. Eviction lowers this; the WAL it cannot lower."""
        logs = 0
        if self._shared_conn is None:
            logs = sum(self._file_size(p) for p in self._storage_files() if p.name[-4:] != "-wal" and p != self._path)
        return self._page_bytes(live_only=True) + logs

    def _budget_used(self) -> int:
        """Bytes counted against the budget: live data, WAL and logs.

        Free pages do not count: eviction frees pages, and only VACUUM shrinks
        an old file. Counting them would evict all history without gaining disk.
        """
        if self._shared_conn is not None or not isinstance(self._path, Path):
            return self._evictable_bytes()
        return self._evictable_bytes() + self._file_size(self._path.with_name(self._path.name + "-wal"))

    def _truncate_wal(self) -> None:
        """Best effort: another process may hold the file; the next pass retries."""
        if self._shared_conn is not None:
            return
        try:
            self._conn().execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchall()
        except sqlite3.Error as exc:
            log.debug("WAL truncate deferred: %s", exc)

    def storage_status(self) -> dict[str, Any]:
        """Fields for /api/self-status."""
        return {
            "capture_mode": self.capture,
            "storage_bytes": self.storage_bytes(),
            "storage_live_bytes": self._budget_used(),
            "storage_budget_bytes": self._budget_bytes,
            "storage_degraded": bool(self.degraded_reason),
            "storage_degraded_reason": self.degraded_reason,
        }

    @_named_write("enforce_budget")
    def enforce_budget(self) -> int:
        """Evict oldest data until under budget: text first, then time series.

        Returns the number of rows changed.
        """
        target = int(self._budget_bytes * BUDGET_TARGET_RATIO)
        if self._budget_used() <= self._budget_bytes:
            return 0
        # A large WAL alone must not cost history: try to empty it first.
        self._truncate_wal()
        if self._budget_used() <= self._budget_bytes:
            return 0
        self._drop_rotated_logs()
        total = 0
        for table, ts_col, columns in _TEXT_COLUMNS:
            if self._evictable_bytes() <= target:
                break
            total += self._evict_text(table, ts_col, columns, target)
        for table in _EVICTION_ORDER:
            if self._evictable_bytes() <= target:
                break
            total += self._evict_oldest(table, target)
        self._truncate_wal()
        return total

    def _drop_rotated_logs(self) -> None:
        for directory in self._log_paths:
            if not directory.is_dir():
                continue
            for path in directory.iterdir():
                # samples.log.3: a rotated file, not the one being written.
                if path.suffix[1:].isdigit():
                    try:
                        path.unlink(missing_ok=True)
                    except OSError as exc:  # held open elsewhere; retried next pass
                        log.debug("Cannot remove %s: %s", path, exc)

    def _evict_text(self, table: str, ts_col: str, columns: dict[str, str], target: int) -> int:
        conn = self._conn()
        total = 0
        sets = ", ".join(f"{c}='{b}'" for c, b in columns.items())
        has_text = " OR ".join(f"{c}!='{b}'" for c, b in columns.items())
        while self._evictable_bytes() > target:
            started = time.monotonic()
            cur = conn.execute(
                f"UPDATE {table} SET {sets} WHERE rowid IN (SELECT rowid FROM {table}"
                f" WHERE {has_text} ORDER BY {ts_col} LIMIT {COMPACT_CHUNK_ROWS})"
            )
            conn.commit()
            total += cur.rowcount
            if cur.rowcount == 0:
                break
            self._rest_after(started)
        if total:
            self._set_state("content_trimmed_before", time.time())
        return total

    def _evict_oldest(self, table: str, target: int) -> int:
        conn = self._conn()
        total = 0
        while self._evictable_bytes() > target:
            started = time.monotonic()
            before = time.time() - EVICT_KEEP_DAYS * _24H if table in _EVICT_ONLY_OLDER else math.inf
            cur = conn.execute(
                f"DELETE FROM {table} WHERE rowid IN"
                f" (SELECT rowid FROM {table} WHERE ts < ? ORDER BY ts LIMIT {COMPACT_CHUNK_ROWS})",
                (before,),
            )
            conn.commit()
            total += cur.rowcount
            if cur.rowcount == 0:
                break
            self._rest_after(started)
        return total

    @property
    def in_memory(self) -> bool:
        return self._shared_conn is not None

    def compact_estimate(self, *, retention_days: int | None = None) -> dict[str, Any]:
        """Read-only forecast for ``aictl db compact --dry-run``."""
        conn = self._conn()
        days = self._retention_days if retention_days is None else retention_days
        now = time.time()
        page_size = conn.execute("PRAGMA page_size").fetchone()[0]
        page_count = conn.execute("PRAGMA page_count").fetchone()[0]
        free_pages = conn.execute("PRAGMA freelist_count").fetchone()[0]
        expired: dict[str, int] = {}
        total: dict[str, int] = {}
        windows = {t: now - days * _24H for t in _RETENTION_TABLES}
        windows["metrics"] = now - _7D
        for table, cutoff in windows.items():
            total[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            expired[table] = conn.execute(f"SELECT COUNT(*) FROM {table} WHERE ts < ?", (cutoff,)).fetchone()[0]
        size_by_table: dict[str, int] = {}
        try:
            for name, size in conn.execute("SELECT name, SUM(pgsize) FROM dbstat GROUP BY name"):
                size_by_table[name] = size
        except sqlite3.Error:
            pass  # dbstat is optional at SQLite build time
        reclaim = 0
        for table, n in expired.items():
            if total[table]:
                reclaim += int(_table_bytes(conn, table, size_by_table) * n / total[table])
        file_bytes = page_count * page_size
        return {
            "file_bytes": file_bytes,
            "free_bytes": free_pages * page_size,
            "expired_rows": expired,
            "total_rows": total,
            "expired_bytes_estimate": reclaim,
            "estimated_after_bytes": max(file_bytes - free_pages * page_size - reclaim, 0),
            "retention_days": days,
        }

    @_named_write("vacuum")
    def vacuum(self) -> None:
        """Rewrite the DB file, switch it to incremental vacuum, truncate the WAL.

        Other writers wait while this runs, so their lock errors do not count as a failed disk.
        """
        conn = self._conn()
        conn.commit()
        self._rewriting_file = True
        try:
            conn.execute("PRAGMA auto_vacuum=INCREMENTAL")
            conn.execute("VACUUM")
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchall()
        finally:
            self._rewriting_file = False

    def vacuum_room_needed(self) -> int:
        """Free disk that a rewrite needs: a temporary copy of the live data, plus a margin."""
        return int(self._page_bytes(live_only=True) * 1.2)

    def _downsample_metrics(
        self,
        conn: sqlite3.Connection,
        since: float,
        until: float,
        bucket_secs: int,
    ) -> None:
        """Keep only one metric row per metric per time bucket in the given range."""
        # One transaction per stretch of data, so no single commit touches a
        # whole day of rows and writers get a turn in between.
        step = max(bucket_secs * 12, _1H)
        start = since
        while start < until:
            end = min(start + step, until)
            conn.execute(
                """
                DELETE FROM metrics WHERE ts >= ? AND ts < ? AND rowid NOT IN (
                    SELECT MAX(rowid) FROM metrics
                    WHERE ts >= ? AND ts < ?
                    GROUP BY metric, CAST(ts / ? AS INTEGER)
                )
            """,
                (start, end, start, end, bucket_secs),
            )
            conn.commit()
            start = end

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
            HAVING COUNT(*) > 1
        """
        # Buckets with one row are already downsampled. Rewriting them on every
        # pass, as this used to, is what grew the WAL by hundreds of MB.
        buckets = conn.execute(sql, (since, until)).fetchall()
        if not buckets:
            return 0

        removed = 0
        for i in range(0, len(buckets), COMPACT_CHUNK_ROWS):
            chunk = buckets[i : i + COMPACT_CHUNK_ROWS]
            for b in chunk:
                removed += conn.execute(
                    f"DELETE FROM {table} WHERE ts >= ? AND ts < ?", (b[0], b[0] + bucket_secs)
                ).rowcount
            conn.executemany(
                f"INSERT OR REPLACE INTO {table}"
                f"(ts, cpu_percent, cpu_per_core,"
                f" memory_used_mb, memory_total_mb,"
                f" active_sessions, active_processes, ai_token_rate,"
                f" files, tokens, mcp, mem_tokens,"
                f" memory_entries, live_sessions, live_tokens,"
                f" live_in_rate, live_out_rate)"
                f" VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                chunk,
            )
            conn.commit()
        return removed - len(buckets)

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
            HAVING COUNT(*) > 1
        """
        buckets = conn.execute(sql, (since, until)).fetchall()
        if not buckets:
            return 0

        removed = 0
        for i in range(0, len(buckets), COMPACT_CHUNK_ROWS):
            chunk = buckets[i : i + COMPACT_CHUNK_ROWS]
            for b in chunk:
                removed += conn.execute(
                    "DELETE FROM process_snapshots WHERE ts >= ? AND ts < ? AND pid = ?",
                    (b[0], b[0] + bucket_secs, b[1]),
                ).rowcount
            conn.executemany(
                "INSERT OR REPLACE INTO process_snapshots"
                "(ts, pid, tool, cpu_percent, memory_rss_mb,"
                " memory_vms_mb, open_files, threads)"
                " VALUES(?,?,?,?,?,?,?,?)",
                chunk,
            )
            conn.commit()
        return removed - len(buckets)

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
        if self._shared_conn is not None:
            self._shared_conn.close()
            return
        conn = getattr(self._local, "conn", None)
        if conn:
            conn.close()
            self._local.conn = None

    def __enter__(self) -> HistoryDB:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
