# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Ingest messages from Cursor's local ``conversations.db``.

Cursor stores conversation state in ``~/.cursor/conversations.db``
(SQLite). Exact schema is undocumented and has shifted across Cursor
versions, but the shape we rely on is stable across the versions we've
observed:

* a ``messages`` table with at least ``(id, conversation_id, role,
  content, created_at)`` — ``id`` is an autoincrementing row id we use
  as the watermark.
* a ``conversations`` table with at least ``(id, workspace_path,
  created_at)`` — ``workspace_path`` is the project directory we use
  for correlation.

The ingester opens the source DB **read-only** (SQLite URI with
``mode=ro``) so it never blocks Cursor from writing.

Correlation strategy
--------------------
Cursor's session identifiers don't share a namespace with ours, so we
correlate by ``(project_path, time window)``:

1. Look up an existing session with ``tool = 'cursor'``, matching
   ``project_path``, and a time range that contains the message
   timestamp.
2. If no match, create a provisional session row with
   ``session_id = 'cursor:<conversation_id>'`` and ``tool = 'cursor'``.

Parallel-work note
------------------
Slice 3.2 introduces a sibling ``CopilotConversationsIngester``. This
module is written to stand alone — no shared base class — so the two
slices can land in any order. A future refactor can extract common
bits (read-only open, watermark plumbing, correlation helper) once both
are on main.
"""

from __future__ import annotations

import logging
import os
import sqlite3
import threading
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from ..storage import HistoryDB

log = logging.getLogger(__name__)

POLL_INTERVAL_S: float = 30.0
"""Default polling interval for the Cursor ingester."""


def _open_readonly(db_path: Path) -> sqlite3.Connection | None:
    """Open *db_path* read-only, returning ``None`` if the file is missing."""
    if not db_path.exists():
        return None
    uri = f"file:{db_path}?mode=ro"
    try:
        return sqlite3.connect(uri, uri=True, timeout=1.0)
    except sqlite3.Error as exc:  # pragma: no cover - defensive
        log.warning("cursor ingester: failed to open %s read-only: %s", db_path, exc)
        return None


class CursorConversationsIngester:
    """Periodic ingester for Cursor's ``conversations.db``.

    Parameters
    ----------
    db_path:
        Path to Cursor's ``conversations.db``.
    our_store:
        The shared :class:`~aictl.storage.HistoryDB` instance we write into.
    last_cursor:
        Highest ``messages.id`` already ingested. ``0`` means ingest from
        the beginning.
    """

    def __init__(
        self,
        db_path: Path | str,
        our_store: "HistoryDB",
        last_cursor: int = 0,
    ) -> None:
        self.db_path = Path(db_path).expanduser()
        self.store = our_store
        self.last_cursor = int(last_cursor)

    # ── public API ─────────────────────────────────────────────

    def poll(self) -> int:
        """Fetch and ingest any messages newer than ``last_cursor``.

        Returns the number of rows inserted. Returns 0 if the source DB
        is missing, locked, or has no new rows.
        """
        src = _open_readonly(self.db_path)
        if src is None:
            return 0
        try:
            try:
                rows = self._fetch_new_messages(src)
            except sqlite3.OperationalError as exc:
                # "database is locked", "no such table", etc. — stay soft.
                log.debug("cursor ingester: read failed (%s); skipping", exc)
                return 0
            if not rows:
                return 0
            conversations = self._fetch_conversations(src, {r["conversation_id"] for r in rows})
        finally:
            src.close()

        inserted = 0
        for row in rows:
            conv = conversations.get(row["conversation_id"], {})
            project_path = str(conv.get("workspace_path") or "")
            session_id = self._correlate(
                conversation_id=str(row["conversation_id"]),
                project_path=project_path,
                ts=float(row["ts"]),
            )
            if self._insert_message(
                session_id=session_id,
                source_row_id=int(row["id"]),
                role=str(row["role"] or ""),
                content=str(row["content"] or ""),
                ts=float(row["ts"]),
            ):
                inserted += 1
            if int(row["id"]) > self.last_cursor:
                self.last_cursor = int(row["id"])
        return inserted

    # ── source read helpers ───────────────────────────────────

    def _fetch_new_messages(self, src: sqlite3.Connection) -> list[dict[str, Any]]:
        cur = src.execute(
            "SELECT id, conversation_id, role, content,"
            " COALESCE(created_at, 0) AS ts"
            " FROM messages"
            " WHERE id > ?"
            " ORDER BY id ASC",
            (self.last_cursor,),
        )
        return [
            {
                "id": r[0],
                "conversation_id": r[1],
                "role": r[2],
                "content": r[3],
                "ts": r[4],
            }
            for r in cur.fetchall()
        ]

    def _fetch_conversations(
        self,
        src: sqlite3.Connection,
        ids: set[str],
    ) -> dict[str, dict[str, Any]]:
        if not ids:
            return {}
        # Older Cursor builds don't have a ``conversations`` table at all.
        try:
            placeholders = ",".join("?" for _ in ids)
            cur = src.execute(
                f"SELECT id, workspace_path, COALESCE(created_at, 0)"
                f" FROM conversations WHERE id IN ({placeholders})",
                tuple(ids),
            )
        except sqlite3.OperationalError:
            return {}
        return {
            str(row[0]): {"workspace_path": row[1], "created_at": row[2]}
            for row in cur.fetchall()
        }

    # ── our storage writes ────────────────────────────────────

    def _insert_message(
        self,
        session_id: str,
        source_row_id: int,
        role: str,
        content: str,
        ts: float,
    ) -> bool:
        conn = self.store._conn()
        cur = conn.execute(
            "INSERT OR IGNORE INTO cursor_session_messages"
            "(session_id, source_row_id, role, content, ts) VALUES(?,?,?,?,?)",
            (session_id, source_row_id, role, content, ts),
        )
        conn.commit()
        return cur.rowcount > 0

    def _correlate(self, conversation_id: str, project_path: str, ts: float) -> str:
        """Find a session to attach this message to, or provision one.

        Match rule: same ``tool='cursor'``, same ``project_path``, and
        ``started_at <= ts`` and (``ended_at`` is NULL or ``ts <= ended_at``).
        The window is left open-ended on the future side because live
        sessions have ``ended_at = NULL``.
        """
        conn = self.store._conn()
        if project_path:
            cur = conn.execute(
                "SELECT session_id FROM sessions"
                " WHERE tool = 'cursor' AND project_path = ?"
                "   AND started_at <= ?"
                "   AND (ended_at IS NULL OR ended_at >= ?)"
                " ORDER BY started_at DESC LIMIT 1",
                (project_path, ts, ts),
            )
            row = cur.fetchone()
            if row:
                return str(row[0])

        # Provisional session keyed by conversation id.
        provisional_id = f"cursor:{conversation_id}"
        conn.execute(
            "INSERT OR IGNORE INTO sessions"
            "(session_id, tool, project_path, started_at, source)"
            " VALUES(?, 'cursor', ?, ?, 'cursor-ingester')",
            (provisional_id, project_path, ts),
        )
        conn.commit()
        return provisional_id


__all__ = ["CursorConversationsIngester", "POLL_INTERVAL_S", "start_background_poller"]


DEFAULT_DB_PATH = Path("~/.cursor/conversations.db").expanduser()


def start_background_poller(
    our_store: "HistoryDB",
    db_path: Path | str = DEFAULT_DB_PATH,
    interval: float = POLL_INTERVAL_S,
) -> threading.Thread | None:
    """Start a daemon thread that calls :meth:`CursorConversationsIngester.poll`.

    Gated on:

    * ``AICTL_CURSOR_INGESTER`` env var — set to ``0`` / ``false`` to disable.
    * The presence of *db_path* at startup. If it's missing, we still
      start the thread so the file can appear later (Cursor might not
      be running yet), but polls are effectively no-ops until it shows up.

    Returns the running thread, or ``None`` if disabled.
    """
    flag = os.environ.get("AICTL_CURSOR_INGESTER", "").strip().lower()
    if flag in {"0", "false", "no", "off"}:
        return None

    ingester = CursorConversationsIngester(db_path, our_store)

    def _loop() -> None:
        while True:
            try:
                ingester.poll()
            except Exception as exc:  # pragma: no cover - defensive
                log.debug("cursor ingester poll error: %s", exc)
            time.sleep(interval)

    thread = threading.Thread(target=_loop, daemon=True, name="aictl-cursor-ingester")
    thread.start()
    return thread
