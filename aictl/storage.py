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
SCHEMA_VERSION = 1

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

CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics(ts);
CREATE INDEX IF NOT EXISTS idx_tool_metrics_ts ON tool_metrics(ts);
CREATE INDEX IF NOT EXISTS idx_tool_metrics_tool ON tool_metrics(tool, ts);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_tool ON events(tool, ts);
CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind, ts);
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
        # Check / set schema version
        cur = conn.execute("SELECT MAX(version) FROM schema_version")
        row = cur.fetchone()
        current = row[0] if row and row[0] else 0
        if current < SCHEMA_VERSION:
            conn.execute(
                "INSERT OR REPLACE INTO schema_version(version) VALUES(?)",
                (SCHEMA_VERSION,),
            )
            conn.commit()

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

        if not m_buf and not t_buf and not e_buf:
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
        for table in ("metrics", "tool_metrics", "events"):
            cur = conn.execute(f"SELECT COUNT(*) FROM {table}")
            result[f"{table}_count"] = cur.fetchone()[0]
        # Time range
        cur = conn.execute("SELECT MIN(ts), MAX(ts) FROM metrics")
        row = cur.fetchone()
        result["earliest_ts"] = row[0]
        result["latest_ts"] = row[1]
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
