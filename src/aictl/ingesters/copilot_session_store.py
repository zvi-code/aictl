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
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any

from ..state_file import StateFile
from ._common import SQLITE_UNAVAILABLE, coerce_ts, open_readonly, record_quality
from .message_facts import MessageFacts, load_checkpoint, save_checkpoint

if TYPE_CHECKING:
    import sqlite3


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
        Message facts and session attribution.
    last_cursor:
        Per-table watermark of highest ``rowid`` already ingested,
        keyed by source table name. ``None`` or empty means ingest from
        the beginning.
    """

    def __init__(
        self,
        db_path: Path | str | None,
        our_store: MessageFacts,
        last_cursor: dict[str, int] | None = None,
        *,
        checkpoint: StateFile | None = None,
    ) -> None:
        self.db_path = Path(db_path).expanduser() if db_path else default_db_path()
        self.store = our_store
        self._checkpoint = checkpoint if checkpoint is not None else our_store.state
        saved = load_checkpoint(self._checkpoint, self.db_path).get("cursor")
        self.last_cursor = dict(last_cursor) if last_cursor is not None else {
            key: value for key, value in (saved.items() if isinstance(saved, dict) else ())
            if type(value) is int and value >= 0
        }
        self.last_poll_ts: float = 0.0
        self.last_poll_inserted: int = 0
        # Source file signature of the last complete poll; an equal one means nothing new.
        self._source_sig: tuple[tuple[float, int], tuple[float, int]] | None = None
        self._schema: list[tuple[str, dict[str, str]]] | None = None
        self._backlog = False

    def _signature(self) -> tuple[tuple[float, int], tuple[float, int]] | None:
        """(mtime, size) of the source file and its ``-wal`` sibling; None when unreadable."""
        parts: list[tuple[float, int]] = []
        for path in (self.db_path, self.db_path.with_name(self.db_path.name + "-wal")):
            try:
                st = path.stat()
                parts.append((st.st_mtime, st.st_size))
            except OSError:
                if path is self.db_path:
                    return None
                parts.append((0.0, 0))
        return parts[0], parts[1]

    def _quality(self, status: str, *, severity: str = "", message: str = "", detail: dict | None = None) -> None:
        record_quality(
            self.store, "copilot-session-store", self.db_path, status, severity=severity, message=message, detail=detail
        )

    # ── public API ─────────────────────────────────────────────

    def poll(self) -> int:
        """Fetch and ingest messages newer than the per-table watermark.

        Returns the number of rows inserted. Returns ``0`` and logs a
        debug message if the source DB is missing, locked, or otherwise
        unreadable; never raises.
        """
        self.last_poll_ts = time.time()
        try:
            import sqlite3
        except ImportError:
            return MessageFacts.status(self, SQLITE_UNAVAILABLE)
        self.unavailable = ""
        sig = self._signature()
        if sig is not None and sig == self._source_sig:
            self.last_poll_inserted = 0
            return 0
        self._backlog = False
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
        complete = True
        try:
            try:
                tables = self._schema if self._schema is not None else self._discover_tables(src)
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
                self._source_sig = sig
                return 0
            if not tables:
                self._quality(
                    "schema_unknown",
                    severity="warning",
                    message="Copilot session-store schema has no recognizable message tables",
                )
                self.last_poll_inserted = 0
                return 0
            self._schema = tables
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
                    complete = False
                    continue
        finally:
            src.close()
        self.last_poll_inserted = inserted
        if complete and not self._backlog:
            self._source_sig = sig
        self._quality(
            "ok", severity="info", message="Copilot session-store poll completed", detail={"inserted": inserted}
        )
        return inserted

    # ── source read helpers ───────────────────────────────────

    @staticmethod
    def _is_usage_schema(src: sqlite3.Connection) -> bool:
        names = {r[0] for r in src.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        return {"turns", "assistant_usage_events"} <= names

    def _discover_tables(self, src: sqlite3.Connection) -> list[tuple[str, dict[str, str]]]:
        """Return [(table_name, {role:..., session:..., content:..., ts:...}), ...]."""
        import sqlite3

        cur = src.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
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
        last_rowid = self.last_cursor.get(table)
        if last_rowid is None:
            last_rowid = 0
        last_rowid = int(last_rowid)
        # Do not even read text this store would not keep.
        keeps_text = self.store._keeps_text()
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
            f'SELECT {", ".join(select_cols)} FROM "{table}" WHERE rowid > ? ORDER BY rowid ASC LIMIT {POLL_BATCH_ROWS}'
        )
        rows = src.execute(sql, (last_rowid,)).fetchall()
        if not rows:
            return 0
        if len(rows) >= POLL_BATCH_ROWS:
            self._backlog = True

        inserted = 0
        now = time.time()
        max_rowid = last_rowid
        for row_id, role, content, session_key, raw_ts in rows:
            row_id = int(row_id)
            max_rowid = max(max_rowid, row_id)
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
        save_checkpoint(self._checkpoint, self.db_path, {
            "cursor": self.last_cursor | {table: max_rowid}, "last_poll_ts": self.last_poll_ts,
        })
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
        self.store.append(
            "copilot_session_messages",
            dict(session_id=session_id, source_row_id=source_row_id, source_table=source_table,
                 role=role, content=content, ts=ts, ingested_at=ingested_at),
            project=self.store.sessions.project_for(session_id),
        )
        return True

    def _correlate(self, source_session_key: str, ts: float) -> str:
        """Map a source session id to one of our session_ids.

        Strategy:
        1. Exact match on ``sessions.session_id`` with ``tool='copilot-cli'``
           — typical when OTel has already created the row.
        2. Fall back to a provisional ``copilot:<source_session_key>``
           session row. The same source key gives the same provisional ID.
        3. If the source row has no session key at all, attach to a
           synthetic ``copilot:unknown`` session so the content is not
           lost.
        """
        if source_session_key and self.store.exact(source_session_key, "copilot-cli"):
            return source_session_key
        return self.store.placeholder(f"copilot:{source_session_key or 'unknown'}",
                                      "copilot-cli", ts, "copilot-session-store")


def _stringify(value: Any) -> str:
    """Normalise a content value to text, keeping JSON blobs as JSON."""
    if value is None:
        return ""
    if isinstance(value, (bytes, bytearray)):
        try:
            return value.decode("utf-8", errors="replace")
        except UnicodeError:
            return ""
    if isinstance(value, str):
        return value
    try:
        import json

        return json.dumps(value, ensure_ascii=False, default=str)
    except (TypeError, ValueError, RecursionError):
        return str(value)


__all__ = [
    "CopilotSessionStoreIngester",
    "POLL_INTERVAL_S",
    "default_db_path",
]
