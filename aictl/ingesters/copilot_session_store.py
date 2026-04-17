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

_DEFAULT_DB_PATH = Path("~/.copilot/session-store.db").expanduser()


def default_db_path() -> Path:
    """Return the standard Copilot CLI session-store location."""
    return _DEFAULT_DB_PATH


def _open_readonly(db_path: Path) -> sqlite3.Connection | None:
    """Open *db_path* read-only, returning ``None`` when missing/unreadable."""
    if not db_path.exists():
        return None
    try:
        return sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=1.0)
    except sqlite3.Error as exc:
        log.warning("copilot ingester: failed to open %s read-only: %s", db_path, exc)
        return None


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
        our_store: "HistoryDB",
        last_cursor: dict[str, int] | None = None,
    ) -> None:
        self.db_path = Path(db_path).expanduser() if db_path else default_db_path()
        self.store = our_store
        self.last_cursor: dict[str, int] = dict(last_cursor or {})
        self.last_poll_ts: float = 0.0
        self.last_poll_inserted: int = 0

    # ── public API ─────────────────────────────────────────────

    def poll(self) -> int:
        """Fetch and ingest messages newer than the per-table watermark.

        Returns the number of rows inserted. Returns ``0`` and logs a
        debug message if the source DB is missing, locked, or otherwise
        unreadable; never raises.
        """
        self.last_poll_ts = time.time()
        src = _open_readonly(self.db_path)
        if src is None:
            self.last_poll_inserted = 0
            return 0
        inserted = 0
        try:
            try:
                tables = self._discover_tables(src)
            except sqlite3.OperationalError as exc:
                log.debug("copilot ingester: schema discovery failed (%s)", exc)
                return 0
            for table, cols in tables:
                try:
                    inserted += self._ingest_table(src, table, cols)
                except sqlite3.OperationalError as exc:
                    # locked, vacuum in progress, etc. — keep going.
                    log.debug("copilot ingester: read from %s failed (%s)", table, exc)
                    continue
        finally:
            src.close()
        self.last_poll_inserted = inserted
        return inserted

    # ── source read helpers ───────────────────────────────────

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
        last_rowid = int(self.last_cursor.get(table, 0))
        select_cols = [f"rowid AS _row_id", f'"{cols["role"]}" AS _role', f'"{cols["content"]}" AS _content']
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
            f" WHERE rowid > ? ORDER BY rowid ASC"
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
            ts = _coerce_ts(raw_ts)
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
        return inserted

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
        conn = self.store._conn()
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
            conn = self.store._conn()
            cur = conn.execute(
                "SELECT session_id FROM sessions"
                " WHERE tool = 'copilot-cli' AND session_id = ? LIMIT 1",
                (source_session_key,),
            )
            row = cur.fetchone()
            if row:
                return str(row[0])
            provisional = f"copilot:{source_session_key}"

        conn = self.store._conn()
        conn.execute(
            "INSERT OR IGNORE INTO sessions"
            "(session_id, tool, project_path, started_at, source)"
            " VALUES(?, 'copilot-cli', '', ?, 'copilot-session-store')",
            (provisional, ts or time.time()),
        )
        conn.commit()
        return provisional


def _coerce_ts(raw: Any) -> float:
    """Best-effort conversion of a source timestamp to epoch seconds."""
    if raw is None or raw == "":
        return 0.0
    if isinstance(raw, (int, float)):
        v = float(raw)
        # Heuristic: values above ~1e12 are milliseconds since epoch.
        return v / 1000.0 if v > 1e12 else v
    if isinstance(raw, str):
        # Numeric string?
        try:
            v = float(raw)
            return v / 1000.0 if v > 1e12 else v
        except ValueError:
            pass
        # ISO-8601 string?
        try:
            from datetime import datetime

            return datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
        except ValueError:
            return 0.0
    return 0.0


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
