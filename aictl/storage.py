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
SCHEMA_VERSION = 4  # bump when adding migrations

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
    PRIMARY KEY (ts, tool, kind)
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
    PRIMARY KEY (ts, metric)
);

CREATE INDEX IF NOT EXISTS idx_path_specs_tool ON path_specs(ai_tool);
CREATE INDEX IF NOT EXISTS idx_path_specs_vendor ON path_specs(vendor);
CREATE INDEX IF NOT EXISTS idx_process_specs_tool ON process_specs(ai_tool);
CREATE INDEX IF NOT EXISTS idx_process_specs_vendor ON process_specs(vendor);
CREATE INDEX IF NOT EXISTS idx_samples_metric ON samples(metric, ts);
CREATE INDEX IF NOT EXISTS idx_samples_ts ON samples(ts);
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
    ) -> None:
        if db_path is None:
            db_path = DEFAULT_DB_PATH
        self._path = Path(db_path) if db_path != ":memory:" else db_path
        self._flush_interval = flush_interval

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
        # Run migrations
        if current < SCHEMA_VERSION:
            self._migrate(conn, current)
            conn.execute(
                "INSERT OR REPLACE INTO schema_version(version) VALUES(?)",
                (SCHEMA_VERSION,),
            )
            conn.commit()

    def _migrate(self, conn: sqlite3.Connection, from_version: int) -> None:
        """Run incremental migrations from *from_version* to SCHEMA_VERSION.

        Each migration is idempotent (uses ALTER TABLE IF NOT EXISTS pattern).
        New columns are always added with DEFAULT values so old data stays valid.
        """
        if from_version < 2:
            # v1 → v2: add tool_telemetry table (handled by CREATE TABLE IF NOT EXISTS
            # in _SCHEMA_SQL). Also ensure any new columns on existing tables.
            self._ensure_columns(conn, "tool_metrics", [
                ("model", "TEXT DEFAULT ''"),
            ])
            log.info("Migrated DB schema v1 → v2")
        if from_version < 3:
            # v2 → v3: add path_specs and process_specs tables
            # (handled by CREATE TABLE IF NOT EXISTS in _SCHEMA_SQL).
            # Populate from CSV on first migration.
            self._sync_csv_to_db(conn)
            log.info("Migrated DB schema v2 → v3 (CSV specs loaded)")
        if from_version < 4:
            # v3 → v4: add universal samples table
            # (handled by CREATE TABLE IF NOT EXISTS in _SCHEMA_SQL).
            log.info("Migrated DB schema v3 → v4 (samples table)")

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
        with self._lock:
            self._events_buf.append(event)
        if self._flush_interval <= 0:
            self.flush()

    def append_events(self, events: list[EventRow]) -> None:
        """Buffer multiple events."""
        with self._lock:
            self._events_buf.extend(events)
        if self._flush_interval <= 0:
            self.flush()

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
                    " live_sessions, live_tokens, live_in_rate, live_out_rate)"
                    " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                    [
                        (r.ts, r.files, r.tokens, round(r.cpu, 2),
                         round(r.mem_mb, 1), r.mcp, r.mem_tokens,
                         r.live_sessions, r.live_tokens,
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
                conn.executemany(
                    "INSERT OR REPLACE INTO events(ts, tool, kind, detail)"
                    " VALUES(?,?,?,?)",
                    [
                        (e.ts, e.tool, e.kind, json.dumps(e.detail))
                        for e in e_buf
                    ],
                )
                total += len(e_buf)

            if s_buf:
                conn.executemany(
                    "INSERT OR IGNORE INTO samples(ts, metric, value, tags)"
                    " VALUES(?,?,?,?)",
                    [
                        (s.ts, s.metric, s.value, json.dumps(s.tags))
                        for s in s_buf
                    ],
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
              f" live_sessions, live_tokens, live_in_rate, live_out_rate" \
              f" FROM metrics{where}{order}{lim}"
        rows = conn.execute(sql, params).fetchall()
        if not rows:
            return {k: [] for k in (
                "ts", "files", "tokens", "cpu", "mem_mb", "mcp",
                "mem_tokens", "live_sessions", "live_tokens",
                "live_in_rate", "live_out_rate")}
        cols = list(zip(*rows))
        keys = ["ts", "files", "tokens", "cpu", "mem_mb", "mcp",
                "mem_tokens", "live_sessions", "live_tokens",
                "live_in_rate", "live_out_rate"]
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

        Useful for metric discovery/browsing.
        """
        conn = self._conn()
        if prefix:
            cur = conn.execute(
                "SELECT metric, COUNT(*) as cnt, MAX(ts) as latest, "
                "  (SELECT value FROM samples s2 WHERE s2.metric=samples.metric ORDER BY ts DESC LIMIT 1) as last_val"
                " FROM samples WHERE metric LIKE ?"
                " GROUP BY metric ORDER BY metric",
                (prefix + "%",),
            )
        else:
            cur = conn.execute(
                "SELECT metric, COUNT(*) as cnt, MAX(ts) as latest, "
                "  (SELECT value FROM samples s2 WHERE s2.metric=samples.metric ORDER BY ts DESC LIMIT 1) as last_val"
                " FROM samples GROUP BY metric ORDER BY metric",
            )
        return [
            {"metric": r[0], "count": r[1], "latest_ts": r[2], "last_value": r[3]}
            for r in cur.fetchall()
        ]

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

        # 5. Delete samples older than 30 days
        cur = conn.execute("DELETE FROM samples WHERE ts < ?", (cutoff_30d,))
        result["samples_deleted_30d"] = cur.rowcount

        conn.commit()
        return result

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
