# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Ingest messages from Copilot CLI's local ``session-store.db``.

Copilot CLI stores past-session state in ``~/.copilot/session-store.db``
(SQLite). The exact schema is undocumented and has drifted across CLI
versions, so this module discovers its layout at runtime rather than
hard-coding column names.

Discovery strategy
------------------
On each :meth:`poll`, open the source DB **read-only** (via SQLite URI
``mode=ro``) and enumerate user tables. For each table, look for a
plausible ``(session_id, role, content, timestamp)`` column quartet —
matching a small fixed set of synonyms. Any matching table is treated
as a message source; ``rowid`` is used as the ingest watermark.

This keeps the ingester resilient to Copilot CLI shipping new schemas:
as long as column names stay in the synonym list we keep working. When
they don't, we log once and return 0.

Correlation strategy
--------------------
Our ``sessions`` table already carries rows with ``tool='copilot-cli'``
(from the OTel and process-lifecycle paths). For each inbound message
we look up an existing session by the source DB's session id; if none
exists we provision a stub row keyed by ``copilot:<session_id>``.

Errors are all soft: missing DB, locked DB (``sqlite3.OperationalError``),
schema surprises, unreadable rows — all result in ``poll()`` returning
``0`` rather than raising, so the daemon polling loop never crashes.
"""

from __future__ import annotations

import logging
import sqlite3
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any

from ._common import coerce_ts, open_readonly, provision_session, record_quality, session_tool, writer_conn

if TYPE_CHECKING:
    from ..storage import HistoryDB

log = logging.getLogger(__name__)

POLL_INTERVAL_S: float = 30.0
"""Default polling interval for the Copilot ingester."""

# Column-name synonyms used during schema discovery. Order matters —
# earlier entries win when multiple candidates are present.
_SESSION_COLS = ("session_id", "sessionId", "conversation_id", "conversationId", "thread_id")
_ROLE_COLS = ("role", "sender", "author", "speaker", "type")
_CONTENT_COLS = ("content", "text", "message", "body", "data")
_TS_COLS = ("created_at", "createdAt", "timestamp", "ts", "time", "updated_at")

# Rows read per table per poll, so a large store is taken in small steps.
POLL_BATCH_ROWS = 2000

_DEFAULT_DB_PATH = Path("~/.copilot/session-store.db").expanduser()


def default_db_path() -> Path:
    """Return the standard Copilot CLI session-store location."""
    return _DEFAULT_DB_PATH


def _pick(columns: list[str], synonyms: tuple[str, ...]) -> str | None:
    """Return the first synonym present in *columns* (case-insensitive)."""
    lc = {c.lower(): c for c in columns}
    for cand in synonyms:
        if cand.lower() in lc:
            return lc[cand.lower()]
    return None


class CopilotSessionStoreIngester:
    """Periodic ingester for Copilot CLI's ``session-store.db``.

    Parameters
    ----------
    db_path:
        Path to Copilot CLI's ``session-store.db``. ``None`` uses the
        default ``~/.copilot/session-store.db``.
    our_store:
        The shared :class:`~aictl.storage.HistoryDB` we write into.
    last_cursor:
        Per-table watermark of highest ``rowid`` already ingested,
        keyed by source table name. ``None`` or empty means ingest from
        the beginning.
    """

    def __init__(
        self,
        db_path: Path | str | None,
        our_store: HistoryDB,
        last_cursor: dict[str, int] | None = None,
    ) -> None:
        self.db_path = Path(db_path).expanduser() if db_path else default_db_path()
        self.store = our_store
        self._provisioned: set[str] = set()
        self.last_cursor: dict[str, int] = dict(last_cursor or {})
        self.last_poll_ts: float = 0.0
        self.last_poll_inserted: int = 0

    def _quality(self, status: str, *, severity: str = "", message: str = "", detail: dict | None = None) -> None:
        record_quality(self.store, "copilot-session-store", self.db_path, status, severity=severity, message=message, detail=detail)

    # ── public API ─────────────────────────────────────────────

    def poll(self) -> int:
        """Fetch and ingest messages newer than the per-table watermark.

        Returns the number of rows inserted. Returns ``0`` and logs a
        debug message if the source DB is missing, locked, or otherwise
        unreadable; never raises.
        """
        self.last_poll_ts = time.time()
        src = open_readonly(self.db_path, "copilot ingester")
        if src is None:
            self._quality(
                "source_missing" if not self.db_path.exists() else "failed",
                severity="warning",
                message="Copilot session-store DB is missing or unreadable",
            )
            self.last_poll_inserted = 0
            return 0
        inserted = 0
        try:
            try:
                tables = self._discover_tables(src)
            except sqlite3.OperationalError as exc:
                log.debug("copilot ingester: schema discovery failed (%s)", exc)
                self._quality(
                    "query_failed",
                    severity="warning",
                    message="Copilot session-store schema discovery failed",
                    detail={"error": str(exc)},
                )
                return 0
            if not tables and self._is_usage_schema(src):
                # This schema keeps turns without role-tagged messages, and its
                # token usage is read by the transcript-usage ingester.
                self._quality(
                    "not_applicable",
                    severity="info",
                    message="Copilot session-store has no role-tagged messages; usage comes from transcript-usage",
                )
                self.last_poll_inserted = 0
                return 0
            if not tables:
                self._quality(
                    "schema_unknown",
                    severity="warning",
                    message="Copilot session-store schema has no recognizable message tables",
                )
                self.last_poll_inserted = 0
                return 0
            for table, cols in tables:
                try:
                    inserted += self._ingest_table(src, table, cols)
                except sqlite3.OperationalError as exc:
                    # locked, vacuum in progress, etc. — keep going.
                    log.debug("copilot ingester: read from %s failed (%s)", table, exc)
                    self._quality(
                        "query_failed",
                        severity="warning",
                        message=f"Copilot session-store read failed for {table}",
                        detail={"table": table, "error": str(exc)},
                    )
                    continue
        finally:
            src.close()
        self.last_poll_inserted = inserted
        self._quality("ok", severity="info", message="Copilot session-store poll completed", detail={"inserted": inserted})
        return inserted

    # ── source read helpers ───────────────────────────────────

    @staticmethod
    def _is_usage_schema(src: sqlite3.Connection) -> bool:
        names = {r[0] for r in src.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        return {"turns", "assistant_usage_events"} <= names

    def _discover_tables(self, src: sqlite3.Connection) -> list[tuple[str, dict[str, str]]]:
        """Return [(table_name, {role:..., session:..., content:..., ts:...}), ...]."""
        cur = src.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        out: list[tuple[str, dict[str, str]]] = []
        for (name,) in cur.fetchall():
            try:
                cols = [r[1] for r in src.execute(f"PRAGMA table_info({name!s})").fetchall()]
            except sqlite3.OperationalError:
                continue
            role = _pick(cols, _ROLE_COLS)
            content = _pick(cols, _CONTENT_COLS)
            session = _pick(cols, _SESSION_COLS)
            if not (role and content):
                continue
            out.append(
                (
                    name,
                    {
                        "role": role,
                        "content": content,
                        "session": session or "",
                        "ts": _pick(cols, _TS_COLS) or "",
                    },
                )
            )
        return out

    def _ingest_table(
        self,
        src: sqlite3.Connection,
        table: str,
        cols: dict[str, str],
    ) -> int:
        """Pull new rows from *table* and insert them into our store."""
        last_rowid = int(self.last_cursor.get(table, self._stored_cursor(table)))
        # Do not even read text this store would not keep.
        keeps_text = getattr(self.store, "_keeps_text", lambda: True)() is True
        content_col = f'"{cols["content"]}"' if keeps_text else "''"
        select_cols = ["rowid AS _row_id", f'"{cols["role"]}" AS _role', f"{content_col} AS _content"]
        if cols["session"]:
            select_cols.append(f'"{cols["session"]}" AS _session')
        else:
            select_cols.append("'' AS _session")
        if cols["ts"]:
            select_cols.append(f'"{cols["ts"]}" AS _ts')
        else:
            select_cols.append("0 AS _ts")
        sql = (
            f"SELECT {', '.join(select_cols)} FROM \"{table}\""
            f" WHERE rowid > ? ORDER BY rowid ASC LIMIT {POLL_BATCH_ROWS}"
        )
        rows = src.execute(sql, (last_rowid,)).fetchall()
        if not rows:
            return 0

        inserted = 0
        now = time.time()
        max_rowid = last_rowid
        for row_id, role, content, session_key, raw_ts in rows:
            row_id = int(row_id)
            if row_id > max_rowid:
                max_rowid = row_id
            ts = coerce_ts(raw_ts)
            session_id = self._correlate(str(session_key or ""), ts)
            if self._insert_message(
                session_id=session_id,
                source_row_id=row_id,
                source_table=table,
                role=str(role or ""),
                content=_stringify(content),
                ts=ts,
                ingested_at=now,
            ):
                inserted += 1
        self.last_cursor[table] = max_rowid
        self._save_cursor(table, max_rowid)
        return inserted

    def _stored_cursor(self, table: str) -> int:
        """Watermark from the previous run, so a restart does not read the store again."""
        row = writer_conn(self.store).execute(
            "SELECT value FROM maintenance_state WHERE key = ?", (f"copilot_store_cursor:{table}",)
        ).fetchone()
        return int(row[0]) if row else 0

    def _save_cursor(self, table: str, rowid: int) -> None:
        conn = writer_conn(self.store)
        conn.execute(
            "INSERT OR REPLACE INTO maintenance_state(key, value) VALUES(?,?)",
            (f"copilot_store_cursor:{table}", rowid),
        )
        conn.commit()

    # ── our storage writes ────────────────────────────────────

    def _insert_message(
        self,
        *,
        session_id: str,
        source_row_id: int,
        source_table: str,
        role: str,
        content: str,
        ts: float,
        ingested_at: float,
    ) -> bool:
        conn = writer_conn(self.store)
        cur = conn.execute(
            "INSERT OR IGNORE INTO copilot_session_messages"
            "(session_id, source_row_id, source_table, role, content, ts, ingested_at)"
            " VALUES(?,?,?,?,?,?,?)",
            (session_id, source_row_id, source_table, role, content, ts, ingested_at),
        )
        conn.commit()
        return cur.rowcount > 0

    def _correlate(self, source_session_key: str, ts: float) -> str:
        """Map a source session id to one of our session_ids.

        Strategy:
        1. Exact match on ``sessions.session_id`` with ``tool='copilot-cli'``
           — typical when OTel has already created the row.
        2. Fall back to a provisional ``copilot:<source_session_key>``
           session row; insert with ``INSERT OR IGNORE`` so repeated
           polls are idempotent.
        3. If the source row has no session key at all, attach to a
           synthetic ``copilot:unknown`` session so the content is not
           lost.
        """
        if not source_session_key:
            provisional = "copilot:unknown"
        else:
            if session_tool(self.store, source_session_key) == "copilot-cli":
                return source_session_key
            provisional = f"copilot:{source_session_key}"

        # Through the store's writer: a store split by project places the row.
        from ..storage import SessionRow

        provision_session(
            self.store,
            self._provisioned,
            SessionRow(session_id=provisional, tool="copilot-cli", started_at=ts or time.time(), source="copilot-session-store")
        )
        return provisional


def _stringify(value: Any) -> str:
    """Normalise a content value to text, keeping JSON blobs as JSON."""
    if value is None:
        return ""
    if isinstance(value, (bytes, bytearray)):
        try:
            return value.decode("utf-8", errors="replace")
        except Exception:
            return ""
    if isinstance(value, str):
        return value
    try:
        import json

        return json.dumps(value, ensure_ascii=False, default=str)
    except Exception:
        return str(value)


__all__ = [
    "CopilotSessionStoreIngester",
    "POLL_INTERVAL_S",
    "default_db_path",
]
