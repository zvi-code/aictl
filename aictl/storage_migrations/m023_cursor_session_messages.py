# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v23: add ``cursor_session_messages`` table.

Stores Cursor ``conversations.db`` messages ingested by
:class:`aictl.ingesters.cursor_conversations.CursorConversationsIngester`
and correlated with our :class:`~aictl.storage.SessionRow` entries.

Idempotent: uses ``CREATE TABLE IF NOT EXISTS``.

Note: Slice 3.2 (Copilot conversations) is landing in parallel and will
introduce its own migration. If both land as v22 the later merge will
need to bump one to v23 and re-record ``CURRENT_VERSION``.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS cursor_session_messages (
            session_id TEXT NOT NULL,
            source_row_id INTEGER NOT NULL PRIMARY KEY,
            role TEXT DEFAULT '',
            content TEXT DEFAULT '',
            ts REAL DEFAULT 0
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_cursor_session_messages_session"
        " ON cursor_session_messages(session_id, ts)"
    )
    conn.commit()
