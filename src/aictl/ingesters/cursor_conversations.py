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

Shared infrastructure (read-only open, data-quality recording) lives in
:mod:`aictl.ingesters._common`, used by all the per-tool ingesters.
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any

from ..platforms import cursor_home_dir
from ._common import SQLITE_UNAVAILABLE, open_readonly, record_quality
from .message_facts import MessageFacts

if TYPE_CHECKING:
    import sqlite3


log = logging.getLogger(__name__)

POLL_INTERVAL_S: float = 30.0
"""Default polling interval for the Cursor ingester."""


class CursorConversationsIngester:
    """Periodic ingester for Cursor's ``conversations.db``.

    Parameters
    ----------
    db_path:
        Path to Cursor's ``conversations.db``.
    our_store:
        Message facts and session attribution.
    last_cursor:
        Highest ``messages.id`` already ingested. ``0`` means ingest from
        the beginning.
    """

    def __init__(
        self,
        db_path: Path | str,
        our_store: MessageFacts,
        last_cursor: int | None = None,
    ) -> None:
        self.db_path = Path(db_path).expanduser()
        self.store = our_store
        saved = self.store.load(self.db_path).get("cursor", 0)
        self.last_cursor = (saved if type(saved) is int and saved >= 0 else 0) if last_cursor is None else last_cursor
        self.last_poll_ts: float = 0.0
        self.last_poll_inserted: int = 0

    def _quality(self, status: str, *, severity: str = "", message: str = "", detail: dict | None = None) -> None:
        record_quality(self.store, "cursor-conversations", self.db_path, status, severity=severity, message=message, detail=detail)

    # ── public API ─────────────────────────────────────────────

    def poll(self) -> int:
        """Fetch and ingest any messages newer than ``last_cursor``.

        Returns the number of rows inserted. Returns 0 if the source DB
        is missing, locked, or has no new rows.
        """
        self.last_poll_ts = time.time()
        try:
            import sqlite3
        except ImportError:
            return MessageFacts.status(self, SQLITE_UNAVAILABLE)
        self.unavailable = ""
        src = open_readonly(self.db_path, "cursor ingester")
        if src is None:
            self._quality(
                "source_missing" if not self.db_path.exists() else "failed",
                severity="warning",
                message="Cursor conversations DB is missing or unreadable",
            )
            self.last_poll_inserted = 0
            return 0
        try:
            try:
                rows = self._fetch_new_messages(src)
            except sqlite3.OperationalError as exc:
                # "database is locked", "no such table", etc. — stay soft.
                log.debug("cursor ingester: read failed (%s); skipping", exc)
                self._quality(
                    "schema_unknown" if "no such table" in str(exc).lower() else "query_failed",
                    severity="warning",
                    message="Cursor conversations read failed",
                    detail={"error": str(exc)},
                )
                self.last_poll_inserted = 0
                return 0
            if not rows:
                self._quality("ok", severity="info", message="Cursor conversations poll completed", detail={"inserted": 0})
                self.last_poll_inserted = 0
                return 0
            conversations = self._fetch_conversations(src, {r["conversation_id"] for r in rows})
        finally:
            src.close()

        inserted = 0
        high = self.last_cursor
        for row in rows:
            conv = conversations.get(str(row["conversation_id"]), {})
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
            high = max(high, int(row["id"]))
        if high != self.last_cursor:
            self.store.save(self.db_path, {"cursor": high})
        self.last_cursor = high
        self.last_poll_inserted = inserted
        self._quality("ok", severity="info", message="Cursor conversations poll completed", detail={"inserted": inserted})
        return inserted

    # ── source read helpers ───────────────────────────────────

    def _fetch_new_messages(self, src: sqlite3.Connection) -> list[dict[str, Any]]:
        content = "content" if self.store._keeps_text() else "''"
        cur = src.execute(
            f"SELECT id, conversation_id, role, {content},"
            " COALESCE(created_at, 0) AS ts"
            " FROM messages"
            " WHERE id > ?"
            " ORDER BY id ASC LIMIT 500",
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
        import sqlite3

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
        self.store.append(
            "cursor_session_messages",
            dict(session_id=session_id, source_row_id=source_row_id, role=role, content=content, ts=ts),
            project=self.store.sessions.project_for(session_id),
        )
        return True

    def _correlate(self, conversation_id: str, project_path: str, ts: float) -> str:
        """The session of a message: the Cursor conversation it belongs to, by its id.

        Never another session of the same workspace that was open at the time: two chats can
        be open in one workspace at once.
        """
        return self.store.conversation(conversation_id, "cursor", ts, "cursor-ingester", project_path)


__all__ = ["CursorConversationsIngester", "POLL_INTERVAL_S"]


DEFAULT_DB_PATH = cursor_home_dir() / "conversations.db"


def cursor_ingester_enabled() -> bool:
    return os.environ.get("AICTL_CURSOR_INGESTER", "").strip().lower() not in {"0", "false", "no", "off"}
