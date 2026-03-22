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

from .config import config_dir

log = logging.getLogger(__name__)

# ─── Defaults ──────────────────────────────────────────────────────

DEFAULT_DB_PATH = config_dir() / "history.db"
FLUSH_INTERVAL = 10.0  # seconds between batch writes
SCHEMA_VERSION = 12  # bump when adding migrations

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

CREATE TABLE IF NOT EXISTS metrics (
    ts          REAL PRIMARY KEY,
    files       INTEGER,
    tokens      INTEGER,
    cpu         REAL,
    mem_mb      REAL,
    mcp         INTEGER,
    mem_tokens  INTEGER,
    memory_entries INTEGER DEFAULT 0,
    live_sessions  INTEGER DEFAULT 0,
    live_tokens    INTEGER DEFAULT 0,
    live_in_rate   REAL DEFAULT 0,
    live_out_rate  REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tool_metrics (
    ts       REAL NOT NULL,
    tool     TEXT NOT NULL,
    cpu      REAL DEFAULT 0,
    mem_mb   REAL DEFAULT 0,
    tokens   INTEGER DEFAULT 0,
    traffic  REAL DEFAULT 0,
    model    TEXT DEFAULT '',
    PRIMARY KEY (ts, tool)
);

CREATE TABLE IF NOT EXISTS events (
    ts       REAL NOT NULL,
    tool     TEXT NOT NULL,
    kind     TEXT NOT NULL,
    detail   TEXT DEFAULT '{}',
    seq      INTEGER NOT NULL DEFAULT 0,  -- disambiguates events at same ts+tool+kind
    session_id   TEXT DEFAULT '',
    pid          INTEGER DEFAULT 0,
    session_ts   REAL DEFAULT 0,
    model        TEXT DEFAULT '',
    path         TEXT DEFAULT '',
    input_tokens  INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    duration_ms  REAL DEFAULT 0,
    tool_name    TEXT DEFAULT '',
    prompt_id    TEXT DEFAULT '',
    PRIMARY KEY (ts, tool, kind, seq)
);

-- KV file store: tracked file contents with lazy updates
CREATE TABLE IF NOT EXISTS file_store (
    path        TEXT PRIMARY KEY,     -- absolute file path
    tool        TEXT NOT NULL,        -- owning ai_tool
    category    TEXT DEFAULT '',      -- instructions, config, rules, memory, etc.
    scope       TEXT DEFAULT '',      -- global, project, user
    content     TEXT DEFAULT '',      -- file text content
    content_hash TEXT DEFAULT '',     -- sha256 hex of content (for cheap diff)
    size_bytes  INTEGER DEFAULT 0,
    tokens      INTEGER DEFAULT 0,    -- estimated token count (~4 chars/tok)
    lines       INTEGER DEFAULT 0,
    mtime       REAL DEFAULT 0,       -- file mtime at last read
    first_seen  REAL DEFAULT 0,       -- when we first discovered it
    last_read   REAL DEFAULT 0,       -- when we last read the content
    last_changed REAL DEFAULT 0,      -- when content last changed (hash diff)
    meta        TEXT DEFAULT '{}'     -- JSON blob for tool-specific metadata
);

-- File content history (snapshot of content at change points)
CREATE TABLE IF NOT EXISTS file_history (
    path        TEXT NOT NULL,
    ts          REAL NOT NULL,        -- timestamp of the change
    content     TEXT DEFAULT '',
    content_hash TEXT DEFAULT '',
    size_bytes  INTEGER DEFAULT 0,
    tokens      INTEGER DEFAULT 0,
    lines       INTEGER DEFAULT 0,
    PRIMARY KEY (path, ts)
);

-- Per-tool telemetry (OTel / stats-cache / events.jsonl)
-- Schema is additive: new metrics become new columns via migration.
CREATE TABLE IF NOT EXISTS tool_telemetry (
    ts                  REAL NOT NULL,
    tool                TEXT NOT NULL,
    source              TEXT DEFAULT '',     -- 'stats-cache', 'events-jsonl', 'otel', 'network-inference'
    confidence          REAL DEFAULT 0,
    input_tokens        INTEGER DEFAULT 0,
    output_tokens       INTEGER DEFAULT 0,
    cache_read_tokens   INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    total_sessions      INTEGER DEFAULT 0,
    total_messages       INTEGER DEFAULT 0,
    cost_usd            REAL DEFAULT 0,
    model               TEXT DEFAULT '',     -- primary model in use
    by_model_json       TEXT DEFAULT '{}',   -- JSON: {model: {input, output, ...}}
    PRIMARY KEY (ts, tool)
);

-- CSV path specifications (mirroring paths-unix.csv / paths-windows.csv)
CREATE TABLE IF NOT EXISTS path_specs (
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

-- CSV process specifications (mirroring processes-unix.csv / processes-windows.csv)
CREATE TABLE IF NOT EXISTS process_specs (
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

CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics(ts);
CREATE INDEX IF NOT EXISTS idx_tool_metrics_ts ON tool_metrics(ts);
CREATE INDEX IF NOT EXISTS idx_tool_metrics_tool ON tool_metrics(tool, ts);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_tool ON events(tool, ts);
CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind, ts);
CREATE INDEX IF NOT EXISTS idx_file_store_tool ON file_store(tool);
CREATE INDEX IF NOT EXISTS idx_file_history_path ON file_history(path, ts);
CREATE INDEX IF NOT EXISTS idx_tool_telemetry_ts ON tool_telemetry(ts);
CREATE INDEX IF NOT EXISTS idx_tool_telemetry_tool ON tool_telemetry(tool, ts);
-- Universal samples table (Prometheus-style metric store).
-- Every data point we collect gets written here with a timestamp.
-- Typed tables (metrics, tool_metrics, etc.) remain for structured
-- high-frequency queries; this table catches EVERYTHING else.
-- Processing/aggregation happens async via staged reads.
CREATE TABLE IF NOT EXISTS samples (
    ts      REAL NOT NULL,
    metric  TEXT NOT NULL,       -- dotted name: 'cpu.core.3', 'proc.71416.cpu', 'mcp.server1.status'
    value   REAL NOT NULL,       -- numeric value (for strings: 1=true/running, 0=false/stopped)
    tags    TEXT DEFAULT '{}',   -- JSON: {"tool":"claude-code","pid":71416,"path":"/..."}
    seq     INTEGER NOT NULL DEFAULT 0,  -- disambiguates samples at same ts+metric
    session_id  TEXT DEFAULT '',
    tool        TEXT DEFAULT '',
    PRIMARY KEY (ts, metric, seq)
);

CREATE INDEX IF NOT EXISTS idx_path_specs_tool ON path_specs(ai_tool);
CREATE INDEX IF NOT EXISTS idx_path_specs_vendor ON path_specs(vendor);
CREATE INDEX IF NOT EXISTS idx_process_specs_tool ON process_specs(ai_tool);
CREATE INDEX IF NOT EXISTS idx_process_specs_vendor ON process_specs(vendor);
CREATE INDEX IF NOT EXISTS idx_samples_metric ON samples(metric, ts);
CREATE INDEX IF NOT EXISTS idx_samples_ts ON samples(ts);
CREATE INDEX IF NOT EXISTS idx_samples_session ON samples(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_samples_tool ON samples(tool, ts);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_events_prompt ON events(prompt_id, ts);

-- ========================================
-- UI Schema: data-driven dashboard layout
-- ========================================

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
-- Static explanation + dynamic source provenance, persisted to avoid
-- recomputing on every page load.
CREATE TABLE IF NOT EXISTS datapoint_catalog (
    key             TEXT PRIMARY KEY,       -- e.g. "overview.tokens", "procs.tool.telemetry.cost_usd"
    label           TEXT NOT NULL DEFAULT '',
    tab             TEXT NOT NULL DEFAULT '',
    section         TEXT NOT NULL DEFAULT '',
    explanation     TEXT NOT NULL DEFAULT '',
    source_static   TEXT NOT NULL DEFAULT '',  -- how the value is collected (human-readable)
    source_type     TEXT NOT NULL DEFAULT 'raw',  -- raw | deduced | aggregated
    unit            TEXT NOT NULL DEFAULT '',     -- tokens, bytes, percent, count, rate_bps, usd, etc.
    update_freq     TEXT NOT NULL DEFAULT '',     -- realtime | on-collect | on-discovery | static
    otel_metric     TEXT NOT NULL DEFAULT '',     -- corresponding OTel metric name
    dynamic_source  INTEGER NOT NULL DEFAULT 0,  -- 1 if source_dynamic is updated at runtime
    source_dynamic  TEXT NOT NULL DEFAULT '{}',   -- JSON: runtime provenance (contributing sessions, etc.)
    query           TEXT NOT NULL DEFAULT '',     -- SQL query to retrieve the raw data
    calc            TEXT NOT NULL DEFAULT '',     -- calculation/post-processing over query results
    updated_at      REAL NOT NULL DEFAULT 0       -- epoch when source_dynamic was last refreshed
);

CREATE INDEX IF NOT EXISTS idx_datapoint_catalog_tab ON datapoint_catalog(tab);
"""


# ─── Data types ────────────────────────────────────────────────────

@dataclass(slots=True)
class MetricsRow:
    """One global snapshot row."""
    ts: float
    files: int = 0
    tokens: int = 0
    cpu: float = 0.0
    mem_mb: float = 0.0
    mcp: int = 0
    mem_tokens: int = 0
    memory_entries: int = 0
    live_sessions: int = 0
    live_tokens: int = 0
    live_in_rate: float = 0.0
    live_out_rate: float = 0.0


@dataclass(slots=True)
class ToolMetricsRow:
    """One per-tool snapshot row."""
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


@dataclass(slots=True)
class TelemetryRow:
    """Per-tool telemetry snapshot (from OTel / stats-cache / events.jsonl)."""
    ts: float
    tool: str
    source: str = ""           # 'stats-cache', 'events-jsonl', 'otel', 'network-inference'
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


@dataclass(slots=True)
class Sample:
    """One universal metric sample (Prometheus-style)."""
    ts: float
    metric: str     # dotted name: 'cpu.core.3', 'proc.71416.cpu'
    value: float
    tags: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class FileEntry:
    """A tracked file in the KV store."""
    path: str
    tool: str
    category: str = ""
    scope: str = ""
    content: str = ""
    content_hash: str = ""
    size_bytes: int = 0
    tokens: int = 0
    lines: int = 0
    mtime: float = 0.0
    first_seen: float = 0.0
    last_read: float = 0.0
    last_changed: float = 0.0
    meta: dict[str, Any] = field(default_factory=dict)


def _content_hash(content: str) -> str:
    """SHA-256 hex digest of content string."""
    return hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()[:16]


def _estimate_tokens(content: str) -> int:
    """Rough token estimate: ~4 chars per token."""
    return max(1, len(content) // 4) if content else 0


def _parse_session_id(sid: str) -> tuple[int, float]:
    """Parse 'tool:pid:epoch' → (pid, epoch).  Returns (0, 0.0) on failure."""
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
    """Convert an EventRow to a tuple with structured columns for INSERT."""
    d = e.detail if isinstance(e.detail, dict) else {}
    sid = d.get("session_id", "")
    pid, sess_ts = _parse_session_id(sid)
    model = (d.get("model") or d.get("gen_ai.request.model")
             or d.get("gen_ai.response.model") or "")
    return (
        e.ts, e.tool, e.kind, json.dumps(e.detail),
        sid,
        pid,
        sess_ts,
        model,
        d.get("path", ""),
        int(_safe_num(d.get("input_tokens",
            d.get("gen_ai.usage.input_tokens", 0)))),
        int(_safe_num(d.get("output_tokens",
            d.get("gen_ai.usage.output_tokens", 0)))),
        _safe_num(d.get("duration_ms", d.get("duration", 0))),
        d.get("tool_name", ""),
        d.get("prompt.id", ""),
    )


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


def _sample_row_tuple(s: Sample) -> tuple:
    """Convert a Sample to a tuple with structured columns for INSERT."""
    tags = s.tags if isinstance(s.tags, dict) else {}
    return (
        s.ts, s.metric, s.value, json.dumps(s.tags),
        tags.get("session_id", ""),
        tags.get("tool", ""),
    )


# ─── HistoryDB ─────────────────────────────────────────────────────

class HistoryDB:
    """Thread-safe SQLite store for metrics, per-tool metrics, and events.

    Parameters
    ----------
    db_path : Path | str | None
        Path to the SQLite database file.  ``None`` → in-memory only
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
        self._metrics_buf: list[MetricsRow] = []
        self._tool_buf: list[ToolMetricsRow] = []
        self._events_buf: list[EventRow] = []
        self._samples_buf: list[Sample] = []

        # Connection pool: one connection per thread
        self._local = threading.local()
        self._closed = False

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
        conn.executescript(_SCHEMA_SQL)
        # Check current version
        cur = conn.execute("SELECT MAX(version) FROM schema_version")
        row = cur.fetchone()
        current = row[0] if row and row[0] else 0
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
        except Exception:
            pass

    def _migrate(self, conn: sqlite3.Connection, from_version: int) -> None:
        """Run incremental migrations from *from_version* to SCHEMA_VERSION.

        Each migration is idempotent (uses ALTER TABLE IF NOT EXISTS pattern).
        New columns are always added with DEFAULT values so old data stays valid.

        v12 is the initial public release — no pre-v12 migrations needed.
        Future migrations (v12 → v13, etc.) go here.
        """
        # -- future migrations go here --
        # if from_version < 13:
        #     ...
        #     log.info("Migrated DB schema v12 → v13 (...)")
        pass

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
        fully idempotent — re-running against a populated DB is a no-op.
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
        # Global sections (tab_id=NULL) render above the tab strip.
        # Tab-scoped sections render only inside that tab.
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
        # Every widget config is a complete rendering spec:
        #   field    → snapshot field to read
        #   metric   → metrics.yaml key (provides unit/description)
        #   format   → value formatter (kilo, size, rate, percent, raw)
        #   color    → CSS color for chart/accent
        #   smooth   → 3-point SMA smoothing
        #   yMaxExpr → expression for y-axis max
        #   refLines → reference line definitions
        #   suffix   → text appended to formatted value
        #   accent   → use accent color for value
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

        # ── Widget ↔ Datasource links ────────────────────────────
        # Maps each widget to its data source(s).
        # datasource IDs: 1=snapshot, 2=stream, 3=history, 4=budget, 5=samples, 6=events
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
        """Add columns to *table* if they don't already exist.

        *columns* is a list of (name, type_with_default) tuples.
        Uses PRAGMA table_info to check existing columns — idempotent.
        """
        existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        for col_name, col_def in columns:
            if col_name not in existing:
                try:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}")
                except sqlite3.OperationalError:
                    pass  # column already exists (race or duplicate)

    # ── Append (buffered) ──────────────────────────────────────────

    def append_metrics(self, row: MetricsRow) -> None:
        """Buffer a global metrics row for batch insert."""
        with self._lock:
            self._metrics_buf.append(row)
        if self._flush_interval <= 0:
            self.flush()

    def append_tool_metrics(self, rows: list[ToolMetricsRow]) -> None:
        """Buffer per-tool metrics rows."""
        with self._lock:
            self._tool_buf.extend(rows)
        if self._flush_interval <= 0:
            self.flush()

    def append_event(self, event: EventRow) -> None:
        """Buffer an event for batch insert."""
        self._log_event(event)
        with self._lock:
            self._events_buf.append(event)
        if self._flush_interval <= 0:
            self.flush()

    def append_events(self, events: list[EventRow]) -> None:
        """Buffer multiple events."""
        for e in events:
            self._log_event(e)
        with self._lock:
            self._events_buf.extend(events)
        if self._flush_interval <= 0:
            self.flush()

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
                session_id=d.get("session_id", ""),
                pid=_parse_session_id(d.get("session_id", ""))[0],
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
        except Exception:
            pass  # never block event buffering on log I/O

    def append_samples(self, samples: list[Sample]) -> None:
        """Buffer universal metric samples for batch insert."""
        if not samples:
            return
        with self._lock:
            self._samples_buf.extend(samples)
        if self._flush_interval <= 0:
            self.flush()

    # ── Flush ──────────────────────────────────────────────────────

    def flush(self) -> int:
        """Write all buffered rows to SQLite.  Returns rows written."""
        with self._lock:
            m_buf = self._metrics_buf
            self._metrics_buf = []
            t_buf = self._tool_buf
            self._tool_buf = []
            e_buf = self._events_buf
            self._events_buf = []
            s_buf = self._samples_buf
            self._samples_buf = []

        if not m_buf and not t_buf and not e_buf and not s_buf:
            return 0

        total = 0
        conn = self._conn()
        try:
            if m_buf:
                conn.executemany(
                    "INSERT OR REPLACE INTO metrics"
                    "(ts, files, tokens, cpu, mem_mb, mcp, mem_tokens,"
                    " memory_entries, live_sessions, live_tokens,"
                    " live_in_rate, live_out_rate)"
                    " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                    [
                        (r.ts, r.files, r.tokens, round(r.cpu, 2),
                         round(r.mem_mb, 1), r.mcp, r.mem_tokens,
                         r.memory_entries, r.live_sessions, r.live_tokens,
                         round(r.live_in_rate, 2), round(r.live_out_rate, 2))
                        for r in m_buf
                    ],
                )
                total += len(m_buf)

            if t_buf:
                conn.executemany(
                    "INSERT OR REPLACE INTO tool_metrics"
                    "(ts, tool, cpu, mem_mb, tokens, traffic, model)"
                    " VALUES(?,?,?,?,?,?,?)",
                    [
                        (r.ts, r.tool, round(r.cpu, 2), round(r.mem_mb, 1),
                         r.tokens, round(r.traffic, 2), r.model)
                        for r in t_buf
                    ],
                )
                total += len(t_buf)

            if e_buf:
                # Assign seq numbers to disambiguate events at same (ts,tool,kind)
                rows = [_event_row_tuple(e) for e in e_buf]
                rows = _assign_seq(rows, key_indices=(0, 1, 2))  # ts, tool, kind
                try:
                    conn.executemany(
                        "INSERT OR IGNORE INTO events"
                        "(ts, tool, kind, detail,"
                        " session_id, pid, session_ts, model, path,"
                        " input_tokens, output_tokens, duration_ms,"
                        " tool_name, prompt_id, seq)"
                        " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        rows,
                    )
                except sqlite3.OperationalError:
                    # Pre-v12 schema: no seq column
                    conn.executemany(
                        "INSERT OR REPLACE INTO events"
                        "(ts, tool, kind, detail) VALUES(?,?,?,?)",
                        [(e.ts, e.tool, e.kind, json.dumps(e.detail))
                         for e in e_buf],
                    )
                total += len(e_buf)

            if s_buf:
                rows = [_sample_row_tuple(s) for s in s_buf]
                rows = _assign_seq(rows, key_indices=(0, 1))  # ts, metric
                try:
                    conn.executemany(
                        "INSERT OR IGNORE INTO samples"
                        "(ts, metric, value, tags, session_id, tool, seq)"
                        " VALUES(?,?,?,?,?,?,?)",
                        rows,
                    )
                except sqlite3.OperationalError:
                    conn.executemany(
                        "INSERT OR IGNORE INTO samples"
                        "(ts, metric, value, tags) VALUES(?,?,?,?)",
                        [(s.ts, s.metric, s.value, json.dumps(s.tags))
                         for s in s_buf],
                    )
                total += len(s_buf)

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

    # ── Query: global metrics ──────────────────────────────────────

    def query_metrics(
        self,
        since: float | None = None,
        until: float | None = None,
        limit: int = 0,
    ) -> dict[str, list]:
        """Return global metrics as column-major dict (uPlot-ready).

        Keys: ts, files, tokens, cpu, mem_mb, mcp, mem_tokens,
              live_sessions, live_tokens, live_in_rate, live_out_rate
        """
        conn = self._conn()
        clauses: list[str] = []
        params: list[Any] = []
        if since is not None:
            clauses.append("ts >= ?")
            params.append(since)
        if until is not None:
            clauses.append("ts <= ?")
            params.append(until)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        order = " ORDER BY ts"
        lim = f" LIMIT {limit}" if limit > 0 else ""
        sql = f"SELECT ts, files, tokens, cpu, mem_mb, mcp, mem_tokens," \
              f" memory_entries, live_sessions, live_tokens," \
              f" live_in_rate, live_out_rate" \
              f" FROM metrics{where}{order}{lim}"
        rows = conn.execute(sql, params).fetchall()
        if not rows:
            return {k: [] for k in (
                "ts", "files", "tokens", "cpu", "mem_mb", "mcp",
                "mem_tokens", "memory_entries", "live_sessions",
                "live_tokens", "live_in_rate", "live_out_rate")}
        cols = list(zip(*rows))
        keys = ["ts", "files", "tokens", "cpu", "mem_mb", "mcp",
                "mem_tokens", "memory_entries", "live_sessions",
                "live_tokens", "live_in_rate", "live_out_rate"]
        return {k: list(c) for k, c in zip(keys, cols)}

    def query_tool_metrics(
        self,
        tool: str | None = None,
        since: float | None = None,
        until: float | None = None,
    ) -> dict[str, dict[str, list]]:
        """Return per-tool metrics as {tool: {ts, cpu, mem_mb, tokens, traffic}}.

        If *tool* is given, returns only that tool.
        """
        conn = self._conn()
        clauses: list[str] = []
        params: list[Any] = []
        if tool:
            clauses.append("tool = ?")
            params.append(tool)
        if since is not None:
            clauses.append("ts >= ?")
            params.append(since)
        if until is not None:
            clauses.append("ts <= ?")
            params.append(until)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        sql = f"SELECT ts, tool, cpu, mem_mb, tokens, traffic" \
              f" FROM tool_metrics{where} ORDER BY ts"
        rows = conn.execute(sql, params).fetchall()
        result: dict[str, dict[str, list]] = {}
        for ts, tl, cpu, mem, tok, traffic in rows:
            if tl not in result:
                result[tl] = {"ts": [], "cpu": [], "mem_mb": [],
                              "tokens": [], "traffic": []}
            d = result[tl]
            d["ts"].append(ts)
            d["cpu"].append(cpu)
            d["mem_mb"].append(mem)
            d["tokens"].append(tok)
            d["traffic"].append(traffic)
        return result

    # ── Query: events ──────────────────────────────────────────────

    def query_events(
        self,
        since: float | None = None,
        until: float | None = None,
        tool: str | None = None,
        kind: str | None = None,
        session_id: str | None = None,
        limit: int = 500,
    ) -> list[EventRow]:
        """Return events matching the filter criteria."""
        conn = self._conn()
        clauses: list[str] = []
        params: list[Any] = []
        if since is not None:
            clauses.append("ts >= ?")
            params.append(since)
        if until is not None:
            clauses.append("ts <= ?")
            params.append(until)
        if tool:
            clauses.append("tool = ?")
            params.append(tool)
        if kind:
            clauses.append("kind = ?")
            params.append(kind)
        if session_id:
            # v11+: use indexed session_id column; fall back to JSON extract
            clauses.append("(session_id = ? OR json_extract(detail, '$.session_id') = ?)")
            params.extend([session_id, session_id])
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        sql = f"SELECT ts, tool, kind, detail FROM events{where}" \
              f" ORDER BY ts DESC LIMIT ?"
        params.append(limit)
        rows = conn.execute(sql, params).fetchall()
        return [
            EventRow(ts=r[0], tool=r[1], kind=r[2],
                     detail=json.loads(r[3]) if r[3] else {})
            for r in rows
        ]

    def query_session_profiles(
        self,
        since: float,
        until: float | None = None,
    ) -> list[dict]:
        """Return enriched session profiles for the given time window.

        Each profile includes: session_id, tool, start/end times, duration,
        conversation count, subagent count, file stats, and activity buckets.
        Built from session_start/end + file_modified events.
        """
        conn = self._conn()
        # Step 1: Find all sessions that overlap the window
        # A session overlaps if it started before until AND ended after since
        params: list[Any] = [since]
        until_clause = ""
        if until is not None:
            until_clause = " AND ts <= ?"
            params.append(until)

        # Get session_start events in range
        starts = conn.execute(
            "SELECT ts, tool, session_id, detail FROM events"
            " WHERE kind = 'session_start' AND ts >= ?"
            + until_clause + " ORDER BY ts",
            params,
        ).fetchall()

        if not starts:
            return []

        # Collect session IDs and their start info
        sessions: dict[str, dict] = {}
        for ts, tool, sid_col, detail_json in starts:
            detail = json.loads(detail_json) if detail_json else {}
            sid = sid_col or detail.get("session_id", "")
            if not sid:
                continue
            sessions[sid] = {
                "session_id": sid,
                "tool": tool,
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
                "activity": [],  # 5-min buckets of event counts
            }

        if not sessions:
            return []

        # Step 2: Find matching session_end events
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
                end_detail = json.loads(end_detail_json) if end_detail_json else {}
                sessions[sid]["ended_at"] = end_ts
                sessions[sid]["duration_s"] = end_detail.get(
                    "duration_s",
                    round(end_ts - sessions[sid]["started_at"], 1),
                )
                sessions[sid]["active"] = False
                sessions[sid]["project"] = end_detail.get("project", "")

        # Step 3: Aggregate file_modified events per session
        # Use a single query for all sessions in the time window
        file_params: list[Any] = [since]
        file_until = ""
        if until is not None:
            file_until = " AND ts <= ?"
            file_params.append(until)

        file_rows = conn.execute(
            "SELECT session_id as sid,"
            "       path,"
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
                    s["subagents"] += 1  # unique subagent files
                elif npath.endswith(".jsonl") and "/projects/" in npath and "/subagents/" not in npath:
                    s["conversations"] += 1
                elif any(npath.endswith(ext) for ext in (
                    ".py", ".js", ".ts", ".jsx", ".tsx", ".css",
                    ".html", ".go", ".rs", ".java", ".rb", ".sh",
                    ".md", ".toml", ".yaml", ".yml", ".json",
                )):
                    if "/.claude/" not in npath and "/__pycache__/" not in npath:
                        s["source_files"] += 1

        # Step 4: Activity buckets (5-min resolution) per session
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

        # Step 5: Merge duplicate sessions — same tool + start time within 60s.
        # This happens when the correlator and Claude Code hooks each emit
        # session_start with different session_ids for the same real session.
        # Strategy: keep the session with session_end (has duration) as primary;
        # merge file/activity stats from the secondary into it.
        result: list[dict] = list(sessions.values())
        result.sort(key=lambda s: s["started_at"])
        merged: list[dict] = []
        used: set[str] = set()
        for i, primary in enumerate(result):
            if primary["session_id"] in used:
                continue
            for secondary in result[i + 1:]:
                if secondary["session_id"] in used:
                    continue
                if secondary["tool"] != primary["tool"]:
                    continue
                if abs(secondary["started_at"] - primary["started_at"]) > 60:
                    break  # sorted by time, no need to keep looking
                # Same tool within 60s — merge secondary into primary.
                # If secondary has session_end and primary doesn't, swap roles.
                if secondary["ended_at"] and not primary["ended_at"]:
                    primary, secondary = secondary, primary
                primary["files_modified"] += secondary["files_modified"]
                primary["unique_files"] += secondary["unique_files"]
                primary["bytes_written"] += secondary["bytes_written"]
                primary["source_files"] += secondary["source_files"]
                primary["conversations"] = max(
                    primary["conversations"], secondary["conversations"])
                primary["subagents"] = max(
                    primary["subagents"], secondary["subagents"])
                # Merge activity buckets
                bucket_map: dict[int, int] = {b: c for b, c in primary["activity"]}
                for b, c in secondary["activity"]:
                    bucket_map[b] = bucket_map.get(b, 0) + c
                primary["activity"] = sorted(bucket_map.items())
                used.add(secondary["session_id"])
            merged.append(primary)
            used.add(primary["session_id"])

        return merged

    # ── Telemetry (per-tool OTel / stats-cache) ─────────────────

    def append_telemetry(self, row: TelemetryRow) -> None:
        """Buffer a per-tool telemetry row."""
        conn = self._conn()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO tool_telemetry"
                "(ts, tool, source, confidence, input_tokens, output_tokens,"
                " cache_read_tokens, cache_creation_tokens,"
                " total_sessions, total_messages, cost_usd, model, by_model_json)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (row.ts, row.tool, row.source, round(row.confidence, 2),
                 row.input_tokens, row.output_tokens,
                 row.cache_read_tokens, row.cache_creation_tokens,
                 row.total_sessions, row.total_messages,
                 round(row.cost_usd, 4), row.model,
                 json.dumps(row.by_model)),
            )
            conn.commit()
        except sqlite3.Error as exc:
            log.warning("Telemetry write error: %s", exc)

    def append_telemetry_batch(self, rows: list[TelemetryRow]) -> None:
        """Batch insert telemetry rows."""
        if not rows:
            return
        conn = self._conn()
        try:
            conn.executemany(
                "INSERT OR REPLACE INTO tool_telemetry"
                "(ts, tool, source, confidence, input_tokens, output_tokens,"
                " cache_read_tokens, cache_creation_tokens,"
                " total_sessions, total_messages, cost_usd, model, by_model_json)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                [
                    (r.ts, r.tool, r.source, round(r.confidence, 2),
                     r.input_tokens, r.output_tokens,
                     r.cache_read_tokens, r.cache_creation_tokens,
                     r.total_sessions, r.total_messages,
                     round(r.cost_usd, 4), r.model,
                     json.dumps(r.by_model))
                    for r in rows
                ],
            )
            conn.commit()
        except sqlite3.Error as exc:
            log.warning("Telemetry batch write error: %s", exc)

    def query_telemetry(
        self,
        tool: str | None = None,
        since: float | None = None,
        until: float | None = None,
    ) -> list[TelemetryRow]:
        """Return telemetry rows, optionally filtered by tool and time range."""
        conn = self._conn()
        clauses: list[str] = []
        params: list[Any] = []
        if tool:
            clauses.append("tool = ?")
            params.append(tool)
        if since is not None:
            clauses.append("ts >= ?")
            params.append(since)
        if until is not None:
            clauses.append("ts <= ?")
            params.append(until)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        cur = conn.execute(
            "SELECT ts, tool, source, confidence, input_tokens, output_tokens,"
            " cache_read_tokens, cache_creation_tokens,"
            " total_sessions, total_messages, cost_usd, model, by_model_json"
            f" FROM tool_telemetry{where} ORDER BY ts DESC",
            params,
        )
        return [
            TelemetryRow(
                ts=r[0], tool=r[1], source=r[2], confidence=r[3],
                input_tokens=r[4], output_tokens=r[5],
                cache_read_tokens=r[6], cache_creation_tokens=r[7],
                total_sessions=r[8], total_messages=r[9],
                cost_usd=r[10], model=r[11],
                by_model=json.loads(r[12]) if r[12] else {},
            )
            for r in cur.fetchall()
        ]

    def latest_telemetry(self) -> dict[str, TelemetryRow]:
        """Return the most recent telemetry row per tool."""
        conn = self._conn()
        cur = conn.execute(
            "SELECT ts, tool, source, confidence, input_tokens, output_tokens,"
            " cache_read_tokens, cache_creation_tokens,"
            " total_sessions, total_messages, cost_usd, model, by_model_json"
            " FROM tool_telemetry"
            " WHERE ts = (SELECT MAX(t2.ts) FROM tool_telemetry t2 WHERE t2.tool = tool_telemetry.tool)"
            " ORDER BY tool",
        )
        result: dict[str, TelemetryRow] = {}
        for r in cur.fetchall():
            result[r[1]] = TelemetryRow(
                ts=r[0], tool=r[1], source=r[2], confidence=r[3],
                input_tokens=r[4], output_tokens=r[5],
                cache_read_tokens=r[6], cache_creation_tokens=r[7],
                total_sessions=r[8], total_messages=r[9],
                cost_usd=r[10], model=r[11],
                by_model=json.loads(r[12]) if r[12] else {},
            )
        return result

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
        Content is only re-read when *content* is explicitly provided.
        If content is None, only metadata (tool, category, scope, mtime,
        meta) is updated — content stays as-is.
        """
        conn = self._conn()
        now = time.time()

        # Check existing entry
        cur = conn.execute(
            "SELECT content_hash, first_seen FROM file_store WHERE path = ?",
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
                # Keep existing last_changed
                cur2 = conn.execute(
                    "SELECT last_changed FROM file_store WHERE path = ?", (path,))
                r2 = cur2.fetchone()
                last_changed = r2[0] if r2 else now

            conn.execute(
                "INSERT OR REPLACE INTO file_store"
                "(path, tool, category, scope, content, content_hash,"
                " size_bytes, tokens, lines, mtime, first_seen, last_read,"
                " last_changed, meta)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (path, tool, category, scope, content, new_hash,
                 new_size, new_tokens, new_lines,
                 mtime or 0, first_seen, now,
                 last_changed if changed else (row[0] if row else now) and last_changed,
                 json.dumps(meta or {})),
            )

            # Save history snapshot on change
            if changed:
                conn.execute(
                    "INSERT OR REPLACE INTO file_history"
                    "(path, ts, content, content_hash, size_bytes, tokens, lines)"
                    " VALUES(?,?,?,?,?,?,?)",
                    (path, now, content, new_hash, new_size, new_tokens, new_lines),
                )
        else:
            # Metadata-only update (no content re-read)
            meta_json = json.dumps(meta or {})
            if row:
                conn.execute(
                    "UPDATE file_store SET tool=?, category=?, scope=?,"
                    " mtime=?, meta=? WHERE path=?",
                    (tool, category, scope, mtime or 0, meta_json, path),
                )
            else:
                conn.execute(
                    "INSERT INTO file_store"
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
            "SELECT path, tool, category, scope, content, content_hash,"
            " size_bytes, tokens, lines, mtime, first_seen, last_read,"
            " last_changed, meta"
            " FROM file_store WHERE path = ?",
            (path,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return FileEntry(
            path=row[0], tool=row[1], category=row[2], scope=row[3],
            content=row[4] or "", content_hash=row[5] or "",
            size_bytes=row[6], tokens=row[7], lines=row[8],
            mtime=row[9], first_seen=row[10], last_read=row[11],
            last_changed=row[12],
            meta=json.loads(row[13]) if row[13] else {},
        )

    def list_files(
        self,
        tool: str | None = None,
        category: str | None = None,
        changed_since: float | None = None,
    ) -> list[FileEntry]:
        """List tracked files, optionally filtered.

        Does NOT return content (for efficiency) — use get_file() for that.
        """
        conn = self._conn()
        clauses: list[str] = []
        params: list[Any] = []
        if tool:
            clauses.append("tool = ?")
            params.append(tool)
        if category:
            clauses.append("category = ?")
            params.append(category)
        if changed_since is not None:
            clauses.append("last_changed >= ?")
            params.append(changed_since)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        cur = conn.execute(
            "SELECT path, tool, category, scope, '', content_hash,"
            " size_bytes, tokens, lines, mtime, first_seen, last_read,"
            " last_changed, meta"
            f" FROM file_store{where} ORDER BY tool, category, path",
            params,
        )
        return [
            FileEntry(
                path=r[0], tool=r[1], category=r[2], scope=r[3],
                content="",  # intentionally empty for list
                content_hash=r[5] or "",
                size_bytes=r[6], tokens=r[7], lines=r[8],
                mtime=r[9], first_seen=r[10], last_read=r[11],
                last_changed=r[12],
                meta=json.loads(r[13]) if r[13] else {},
            )
            for r in cur.fetchall()
        ]

    def file_history(
        self,
        path: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Return content change history for a file (most recent first)."""
        conn = self._conn()
        cur = conn.execute(
            "SELECT ts, content_hash, size_bytes, tokens, lines"
            " FROM file_history WHERE path = ? ORDER BY ts DESC LIMIT ?",
            (path, limit),
        )
        return [
            {"ts": r[0], "content_hash": r[1], "size_bytes": r[2],
             "tokens": r[3], "lines": r[4]}
            for r in cur.fetchall()
        ]

    def file_content_at(self, path: str, ts: float) -> str | None:
        """Return file content at a specific historical timestamp."""
        conn = self._conn()
        cur = conn.execute(
            "SELECT content FROM file_history"
            " WHERE path = ? AND ts <= ? ORDER BY ts DESC LIMIT 1",
            (path, ts),
        )
        row = cur.fetchone()
        return row[0] if row else None

    def remove_file(self, path: str) -> bool:
        """Remove a file from the store. Returns True if it existed."""
        conn = self._conn()
        cur = conn.execute("DELETE FROM file_store WHERE path = ?", (path,))
        conn.commit()
        return cur.rowcount > 0

    def sync_files_from_discovery(
        self,
        discovered: list[dict[str, Any]],
        read_content: bool = False,
    ) -> dict[str, int]:
        """Bulk sync from discovery results.

        *discovered* is a list of dicts with keys: path, tool, category,
        scope, mtime (and optionally content if read_content is True).

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

            # Check if we need to re-read content
            cur = conn.execute(
                "SELECT mtime, content_hash FROM file_store WHERE path = ?",
                (path,),
            )
            existing = cur.fetchone()

            if existing and abs(existing[0] - mtime) < 0.01:
                # mtime unchanged — skip content read (lazy)
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
                # Metadata-only update
                self.upsert_file(
                    path=path, tool=tool, category=category,
                    scope=scope, mtime=mtime,
                )
                if existing:
                    stats["unchanged"] += 1
                else:
                    stats["added"] += 1

        # Remove files no longer in discovery
        cur = conn.execute("SELECT path FROM file_store")
        for (stored_path,) in cur.fetchall():
            if stored_path not in seen_paths:
                self.remove_file(stored_path)
                stats["removed"] += 1

        return stats

    # ── Universal samples ──────────────────────────────────────────

    def query_samples(
        self,
        metric: str | None = None,
        metric_prefix: str | None = None,
        since: float | None = None,
        until: float | None = None,
        tag_filter: dict[str, str] | None = None,
        limit: int = 5000,
    ) -> list[Sample]:
        """Query samples with optional filters.

        *metric*: exact match on metric name.
        *metric_prefix*: prefix match (e.g. 'cpu.core' matches 'cpu.core.0', 'cpu.core.1').
        *tag_filter*: JSON tag key-value pairs that must match.
        """
        conn = self._conn()
        clauses: list[str] = []
        params: list[Any] = []
        if metric:
            clauses.append("metric = ?")
            params.append(metric)
        if metric_prefix:
            clauses.append("metric LIKE ?")
            params.append(metric_prefix + "%")
        if since is not None:
            clauses.append("ts >= ?")
            params.append(since)
        if until is not None:
            clauses.append("ts <= ?")
            params.append(until)
        if tag_filter:
            for k, v in tag_filter.items():
                clauses.append(f"json_extract(tags, '$.{k}') = ?")
                params.append(v)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        params.append(limit)
        cur = conn.execute(
            f"SELECT ts, metric, value, tags FROM samples{where}"
            f" ORDER BY ts DESC LIMIT ?",
            params,
        )
        return [
            Sample(ts=r[0], metric=r[1], value=r[2],
                   tags=json.loads(r[3]) if r[3] else {})
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
        clauses = ["metric = ?"]
        params: list[Any] = [metric]
        if since is not None:
            clauses.append("ts >= ?")
            params.append(since)
        if until is not None:
            clauses.append("ts <= ?")
            params.append(until)
        where = " WHERE " + " AND ".join(clauses)
        cur = conn.execute(
            f"SELECT ts, value FROM samples{where} ORDER BY ts",
            params,
        )
        rows = cur.fetchall()
        if not rows:
            return {"ts": [], "value": []}
        ts_list, val_list = zip(*rows)
        return {"ts": list(ts_list), "value": list(val_list)}

    def list_metrics(self, prefix: str = "") -> list[dict[str, Any]]:
        """List distinct metric names with latest value and count.

        Useful for metric discovery/browsing.  Uses a two-step approach
        to avoid the expensive correlated subquery that caused O(N*M)
        performance on large sample tables.
        """
        conn = self._conn()
        # Step 1: fast aggregate (uses idx_samples_metric)
        if prefix:
            agg = conn.execute(
                "SELECT metric, COUNT(*) as cnt, MAX(ts) as latest"
                " FROM samples WHERE metric LIKE ?"
                " GROUP BY metric ORDER BY metric",
                (prefix + "%",),
            ).fetchall()
        else:
            agg = conn.execute(
                "SELECT metric, COUNT(*) as cnt, MAX(ts) as latest"
                " FROM samples GROUP BY metric ORDER BY metric",
            ).fetchall()
        if not agg:
            return []
        # Step 2: batch-fetch latest values using (metric, ts) index
        results = []
        for name, cnt, latest_ts in agg:
            row = conn.execute(
                "SELECT value FROM samples WHERE metric = ? AND ts = ? LIMIT 1",
                (name, latest_ts),
            ).fetchone()
            results.append({
                "metric": name,
                "count": cnt,
                "latest_ts": latest_ts,
                "last_value": row[0] if row else None,
            })
        return results

    # ── UI layout queries ──────────────────────────────────────────

    def get_layout(self, slug: str = "main") -> dict[str, Any]:
        """Return the full layout tree for a dashboard as a nested dict.

        Returns ``{}`` if the dashboard *slug* does not exist.
        """
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
        for t in conn.execute(
            "SELECT id, key, title, shortcut, sort_order, visible, icon"
            " FROM ui_tab WHERE dashboard_id = ? ORDER BY sort_order",
            (dash_id,),
        ).fetchall():
            tid, tkey, ttitle, tshortcut, tsort, tvis, ticon = t
            tab_id_to_key[tid] = tkey
            gbo = conn.execute(
                "SELECT key, label, sort_order, is_default"
                " FROM ui_group_by_option WHERE tab_id = ? ORDER BY sort_order",
                (tid,),
            ).fetchall()
            tabs.append({
                "key": tkey, "title": ttitle, "shortcut": tshortcut,
                "sort_order": tsort, "visible": bool(tvis), "icon": ticon,
                "group_by_options": [
                    {"key": g[0], "label": g[1], "is_default": bool(g[3])}
                    for g in gbo
                ],
            })

        # ── Datasources ──
        ds_by_id: dict[int, str] = {}
        datasources: dict[str, dict] = {}
        for d in conn.execute(
            "SELECT id, key, kind, endpoint, poll_ms, config FROM ui_datasource"
        ).fetchall():
            did, dkey, dkind, dendpoint, dpoll, dconfig = d
            ds_by_id[did] = dkey
            datasources[dkey] = {
                "kind": dkind, "endpoint": dendpoint,
                "poll_ms": dpoll, "config": json.loads(dconfig or "{}"),
            }

        # ── Sections + widgets ──
        sections: list[dict] = []
        for s in conn.execute(
            "SELECT id, key, title, sort_order, visible, collapsed, columns, tab_id"
            " FROM ui_section WHERE dashboard_id = ? ORDER BY sort_order",
            (dash_id,),
        ).fetchall():
            sid, skey, stitle, ssort, svis, scoll, scols, stab_id = s
            widgets: list[dict] = []
            for w in conn.execute(
                "SELECT id, key, kind, title, sort_order, col_span, row_span,"
                " visible, config"
                " FROM ui_widget WHERE section_id = ? ORDER BY sort_order",
                (sid,),
            ).fetchall():
                wid, wkey, wkind, wtitle, wsort, wcol, wrow, wvis, wconfig = w
                wd_rows = conn.execute(
                    "SELECT datasource_id, role"
                    " FROM ui_widget_datasource WHERE widget_id = ?",
                    (wid,),
                ).fetchall()
                widgets.append({
                    "key": wkey, "kind": wkind, "title": wtitle,
                    "sort_order": wsort, "col_span": wcol, "row_span": wrow,
                    "visible": bool(wvis),
                    "config": json.loads(wconfig or "{}"),
                    "datasources": [
                        {"key": ds_by_id.get(wd[0], ""), "role": wd[1]}
                        for wd in wd_rows
                    ],
                })
            sections.append({
                "key": skey, "title": stitle, "sort_order": ssort,
                "visible": bool(svis), "collapsed": bool(scoll),
                "columns": scols,
                "tab_key": tab_id_to_key.get(stab_id) if stab_id else None,
                "widgets": widgets,
            })

        # ── Preferences (system defaults: user_id IS NULL) ──
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
        """Upsert a single UI preference.

        For *user_id=None* (system default) uses DELETE + INSERT because
        SQLite does not enforce UNIQUE when a column is NULL.
        """
        conn = self._conn()
        row = conn.execute(
            "SELECT id FROM ui_dashboard WHERE slug = ?",
            (dashboard_slug,),
        ).fetchone()
        if not row:
            return
        dash_id = row[0]
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
        """Get all preferences for a dashboard.

        Returns system defaults (user_id IS NULL), then overlays
        user-specific prefs when *user_id* is given.
        """
        conn = self._conn()
        row = conn.execute(
            "SELECT id FROM ui_dashboard WHERE slug = ?",
            (dashboard_slug,),
        ).fetchone()
        if not row:
            return {}
        dash_id = row[0]
        prefs: dict[str, str] = {}
        for r in conn.execute(
            "SELECT pref_key, pref_value FROM ui_preference"
            " WHERE dashboard_id = ? AND user_id IS NULL",
            (dash_id,),
        ).fetchall():
            prefs[r[0]] = r[1]
        if user_id is not None:
            for r in conn.execute(
                "SELECT pref_key, pref_value FROM ui_preference"
                " WHERE dashboard_id = ? AND user_id = ?",
                (dash_id, user_id),
            ).fetchall():
                prefs[r[0]] = r[1]
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

    def update_section(self, key: str, **kwargs) -> None:
        """Update section fields (visible, collapsed, title, columns)."""
        conn = self._conn()
        allowed = {"visible", "collapsed", "title", "columns"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(
            f"UPDATE ui_section SET {set_clause} WHERE key = ?",
            (*updates.values(), key),
        )
        conn.commit()

    def update_widget(self, key: str, **kwargs) -> None:
        """Update widget fields (visible, title, sort_order, config, col_span, row_span)."""
        conn = self._conn()
        allowed = {"visible", "title", "sort_order", "config", "col_span", "row_span"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(
            f"UPDATE ui_widget SET {set_clause} WHERE key = ?",
            (*updates.values(), key),
        )
        conn.commit()

    def export_layout(self, slug: str = "main") -> str:
        """Export a dashboard layout as a JSON string.

        Convenience wrapper around :meth:`get_layout`.
        """
        return json.dumps(self.get_layout(slug), indent=2)

    def import_layout(self, data: dict[str, Any]) -> None:
        """Import a full dashboard layout from a nested dict.

        Replaces all ``ui_*`` rows belonging to the given dashboard slug.
        The *data* dict should match the structure returned by
        :meth:`get_layout` (slug, title, tabs, sections, datasources,
        preferences).

        The import is performed inside a single transaction — either
        everything succeeds or nothing changes.
        """
        conn = self._conn()
        slug = data.get("slug", "main")
        title = data.get("title", slug)

        # ── Upsert dashboard ──
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

        # ── Clear old child rows for this dashboard ──
        # Delete in FK order: widgets → sections, group_by → tabs,
        # widget_datasource is cascaded via widget delete.
        old_section_ids = [r[0] for r in conn.execute(
            "SELECT id FROM ui_section WHERE dashboard_id = ?", (dash_id,)
        ).fetchall()]
        if old_section_ids:
            placeholders = ",".join("?" * len(old_section_ids))
            old_widget_ids = [r[0] for r in conn.execute(
                f"SELECT id FROM ui_widget WHERE section_id IN ({placeholders})",
                old_section_ids,
            ).fetchall()]
            if old_widget_ids:
                wp = ",".join("?" * len(old_widget_ids))
                conn.execute(
                    f"DELETE FROM ui_widget_datasource WHERE widget_id IN ({wp})",
                    old_widget_ids,
                )
            conn.execute(
                f"DELETE FROM ui_widget WHERE section_id IN ({placeholders})",
                old_section_ids,
            )
        conn.execute("DELETE FROM ui_section WHERE dashboard_id = ?", (dash_id,))

        old_tab_ids = [r[0] for r in conn.execute(
            "SELECT id FROM ui_tab WHERE dashboard_id = ?", (dash_id,)
        ).fetchall()]
        if old_tab_ids:
            tp = ",".join("?" * len(old_tab_ids))
            conn.execute(
                f"DELETE FROM ui_group_by_option WHERE tab_id IN ({tp})",
                old_tab_ids,
            )
        conn.execute("DELETE FROM ui_tab WHERE dashboard_id = ?", (dash_id,))
        conn.execute(
            "DELETE FROM ui_preference WHERE dashboard_id = ?", (dash_id,)
        )
        # Datasources are global (not per-dashboard), clear & re-insert
        conn.execute("DELETE FROM ui_datasource")

        # ── Insert tabs ──
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
            tab_key_to_id[t["key"]] = conn.execute(
                "SELECT last_insert_rowid()"
            ).fetchone()[0]
            for g in t.get("group_by_options", []):
                conn.execute(
                    "INSERT INTO ui_group_by_option"
                    "(tab_id, key, label, sort_order, is_default)"
                    " VALUES(?,?,?,?,?)",
                    (tab_key_to_id[t["key"]], g["key"], g.get("label", g["key"]),
                     g.get("sort_order", 0), int(g.get("is_default", False))),
                )

        # ── Insert datasources ──
        ds_key_to_id: dict[str, int] = {}
        for dkey, ds in data.get("datasources", {}).items():
            conn.execute(
                "INSERT INTO ui_datasource(key, kind, endpoint, poll_ms, config)"
                " VALUES(?,?,?,?,?)",
                (dkey, ds.get("kind", "rest"), ds.get("endpoint"),
                 ds.get("poll_ms"), json.dumps(ds.get("config", {}))),
            )
            ds_key_to_id[dkey] = conn.execute(
                "SELECT last_insert_rowid()"
            ).fetchone()[0]

        # ── Insert sections + widgets ──
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
            sec_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
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
                wid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                for wd in w.get("datasources", []):
                    ds_id = ds_key_to_id.get(wd.get("key"))
                    if ds_id:
                        conn.execute(
                            "INSERT INTO ui_widget_datasource"
                            "(widget_id, datasource_id, role) VALUES(?,?,?)",
                            (wid, ds_id, wd.get("role", "primary")),
                        )

        # ── Insert preferences ──
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
        """Load CSV specs from registry into path_specs and process_specs tables."""
        try:
            from .registry import get_registry
            registry = get_registry()
            self._sync_path_specs(conn, registry.path_specs())
            self._sync_process_specs(conn, registry.process_specs())
        except Exception as exc:
            log.warning("Failed to sync CSV specs to DB: %s", exc)

    @staticmethod
    def _sync_path_specs(conn: sqlite3.Connection, specs: list) -> None:
        """Upsert path specs into the path_specs table."""
        conn.execute("DELETE FROM path_specs")
        conn.executemany(
            "INSERT INTO path_specs"
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
        """Upsert process specs into the process_specs table."""
        conn.execute("DELETE FROM process_specs")
        conn.executemany(
            "INSERT INTO process_specs"
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

        Call this after CSV files have been updated to refresh the DB.
        Returns {"path_specs": N, "process_specs": N}.
        """
        conn = self._conn()
        self._sync_csv_to_db(conn)
        path_count = conn.execute("SELECT COUNT(*) FROM path_specs").fetchone()[0]
        proc_count = conn.execute("SELECT COUNT(*) FROM process_specs").fetchone()[0]
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
        clauses: list[str] = []
        params: list[Any] = []
        if tool:
            clauses.append("ai_tool = ?")
            params.append(tool)
        if vendor:
            clauses.append("vendor = ?")
            params.append(vendor)
        if host:
            clauses.append("host LIKE ?")
            params.append(f"%{host}%")
        if category:
            clauses.append("category = ?")
            params.append(category)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        cur = conn.execute(
            f"SELECT * FROM path_specs{where} ORDER BY ai_tool, category, path_template",
            params,
        )
        cols = [desc[0] for desc in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def query_process_specs(
        self,
        tool: str | None = None,
        vendor: str | None = None,
        host: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query process specs with optional filters."""
        conn = self._conn()
        clauses: list[str] = []
        params: list[Any] = []
        if tool:
            clauses.append("ai_tool = ?")
            params.append(tool)
        if vendor:
            clauses.append("vendor = ?")
            params.append(vendor)
        if host:
            clauses.append("host LIKE ?")
            params.append(f"%{host}%")
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        cur = conn.execute(
            f"SELECT * FROM process_specs{where} ORDER BY ai_tool, process_name",
            params,
        )
        cols = [desc[0] for desc in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    # ── Datapoint Catalog ────────────────────────────────────────

    def query_datapoint_catalog(
        self,
        tab: str | None = None,
        key: str | None = None,
        source_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query the datapoint catalog with optional filters."""
        conn = self._conn()
        clauses: list[str] = []
        params: list[Any] = []
        if tab:
            clauses.append("tab = ?")
            params.append(tab)
        if key:
            clauses.append("key = ?")
            params.append(key)
        if source_type:
            clauses.append("source_type = ?")
            params.append(source_type)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        cur = conn.execute(
            f"SELECT * FROM datapoint_catalog{where} ORDER BY tab, section, key",
            params,
        )
        cols = [desc[0] for desc in cur.description]
        rows = []
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            d["dynamic_source"] = bool(d.get("dynamic_source"))
            try:
                d["source_dynamic"] = json.loads(d.get("source_dynamic", "{}"))
            except (json.JSONDecodeError, TypeError):
                d["source_dynamic"] = {}
            rows.append(d)
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
        # Row counts
        for table in ("metrics", "tool_metrics", "events",
                       "file_store", "file_history",
                       "path_specs", "process_specs", "samples"):
            cur = conn.execute(f"SELECT COUNT(*) FROM {table}")
            result[f"{table}_count"] = cur.fetchone()[0]
        # Time range
        cur = conn.execute("SELECT MIN(ts), MAX(ts) FROM metrics")
        row = cur.fetchone()
        result["earliest_ts"] = row[0]
        result["latest_ts"] = row[1]
        # File store totals
        cur = conn.execute(
            "SELECT COUNT(*), SUM(size_bytes), SUM(tokens) FROM file_store")
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

        # 1. Delete metrics older than 30 days
        cutoff_30d = now - _30D
        cur = conn.execute("DELETE FROM metrics WHERE ts < ?", (cutoff_30d,))
        result["metrics_deleted_30d"] = cur.rowcount
        cur = conn.execute("DELETE FROM tool_metrics WHERE ts < ?", (cutoff_30d,))
        result["tool_metrics_deleted_30d"] = cur.rowcount

        # 2. Downsample metrics 7d–30d to 5-minute buckets
        #    Window: [cutoff_30d, cutoff_7d)  (oldest → 7 days ago)
        cutoff_7d = now - _7D
        result["metrics_compacted_7d"] = self._downsample(
            conn, "metrics", cutoff_30d, cutoff_7d, bucket_secs=300,
        )
        result["tool_metrics_compacted_7d"] = self._downsample_tool(
            conn, cutoff_30d, cutoff_7d, bucket_secs=300,
        )

        # 3. Downsample metrics 24h–7d to 1-minute buckets
        #    Window: [cutoff_7d, cutoff_24h)  (7 days ago → 24h ago)
        cutoff_24h = now - _24H
        result["metrics_compacted_24h"] = self._downsample(
            conn, "metrics", cutoff_7d, cutoff_24h, bucket_secs=60,
        )
        result["tool_metrics_compacted_24h"] = self._downsample_tool(
            conn, cutoff_7d, cutoff_24h, bucket_secs=60,
        )

        # 4. Delete events older than 30 days
        cur = conn.execute("DELETE FROM events WHERE ts < ?", (cutoff_30d,))
        result["events_deleted_30d"] = cur.rowcount

        # 5. Delete samples older than 7 days (samples are high-volume)
        cur = conn.execute("DELETE FROM samples WHERE ts < ?", (cutoff_7d,))
        result["samples_deleted_7d"] = cur.rowcount

        # 6. Downsample samples 24h–7d: keep 1 per metric per 5-minute bucket
        self._downsample_samples(conn, cutoff_7d, cutoff_24h, bucket_secs=300)

        # 7. Downsample samples 1h–24h: keep 1 per metric per 1-minute bucket
        cutoff_1h = now - _1H
        self._downsample_samples(conn, cutoff_24h, cutoff_1h, bucket_secs=60)

        # 8. Delete telemetry older than 30 days
        cur = conn.execute("DELETE FROM tool_telemetry WHERE ts < ?", (cutoff_30d,))
        result["telemetry_deleted_30d"] = cur.rowcount

        # 9. Delete file history older than 30 days
        cur = conn.execute("DELETE FROM file_history WHERE ts < ?", (cutoff_30d,))
        result["file_history_deleted_30d"] = cur.rowcount

        conn.commit()
        return result

    def _downsample_samples(
        self,
        conn: sqlite3.Connection,
        since: float,
        until: float,
        bucket_secs: int,
    ) -> None:
        """Keep only one sample per metric per time bucket in the given range."""
        # For each metric+bucket, keep the row with MAX(rowid) and delete the rest.
        conn.execute("""
            DELETE FROM samples WHERE rowid NOT IN (
                SELECT MAX(rowid) FROM samples
                WHERE ts >= ? AND ts < ?
                GROUP BY metric, CAST(ts / ? AS INTEGER)
            ) AND ts >= ? AND ts < ?
        """, (since, until, bucket_secs, since, until))

    def _downsample(
        self,
        conn: sqlite3.Connection,
        table: str,
        since: float,
        until: float,
        bucket_secs: int,
    ) -> int:
        """Replace rows in [since, until) with bucket averages."""
        # Check if there's anything to compact
        cur = conn.execute(
            f"SELECT COUNT(*) FROM {table} WHERE ts >= ? AND ts < ?",
            (since, until),
        )
        count = cur.fetchone()[0]
        if count == 0:
            return 0

        # Get bucket averages
        bucket_expr = f"CAST(ts / {bucket_secs} AS INTEGER) * {bucket_secs}"
        sql = f"""
            SELECT {bucket_expr} as bucket_ts,
                   CAST(AVG(files) AS INTEGER), CAST(AVG(tokens) AS INTEGER),
                   AVG(cpu), AVG(mem_mb),
                   CAST(AVG(mcp) AS INTEGER), CAST(AVG(mem_tokens) AS INTEGER),
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

        # Delete originals
        conn.execute(
            f"DELETE FROM {table} WHERE ts >= ? AND ts < ?",
            (since, until),
        )
        # Insert averages
        conn.executemany(
            f"INSERT OR REPLACE INTO {table}"
            f"(ts, files, tokens, cpu, mem_mb, mcp, mem_tokens,"
            f" live_sessions, live_tokens, live_in_rate, live_out_rate)"
            f" VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            buckets,
        )
        return count - len(buckets)  # rows saved

    def _downsample_tool(
        self,
        conn: sqlite3.Connection,
        since: float,
        until: float,
        bucket_secs: int,
    ) -> int:
        """Downsample tool_metrics in [since, until) by tool+bucket."""
        cur = conn.execute(
            "SELECT COUNT(*) FROM tool_metrics WHERE ts >= ? AND ts < ?",
            (since, until),
        )
        count = cur.fetchone()[0]
        if count == 0:
            return 0

        bucket_expr = f"CAST(ts / {bucket_secs} AS INTEGER) * {bucket_secs}"
        sql = f"""
            SELECT {bucket_expr} as bucket_ts, tool,
                   AVG(cpu), AVG(mem_mb),
                   CAST(AVG(tokens) AS INTEGER), AVG(traffic),
                   ''
            FROM tool_metrics
            WHERE ts >= ? AND ts < ?
            GROUP BY {bucket_expr}, tool
        """
        buckets = conn.execute(sql, (since, until)).fetchall()
        if not buckets:
            return 0

        conn.execute(
            "DELETE FROM tool_metrics WHERE ts >= ? AND ts < ?",
            (since, until),
        )
        conn.executemany(
            "INSERT OR REPLACE INTO tool_metrics"
            "(ts, tool, cpu, mem_mb, tokens, traffic, model)"
            " VALUES(?,?,?,?,?,?,?)",
            buckets,
        )
        return count - len(buckets)

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
