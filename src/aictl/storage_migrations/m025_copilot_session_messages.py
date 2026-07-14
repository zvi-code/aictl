# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v25: add ``copilot_session_messages`` table.

Stores conversation messages ingested from Copilot CLI's
``~/.copilot/session-store.db`` by
:class:`aictl.ingesters.copilot_session_store.CopilotSessionStoreIngester`
and correlated with our :class:`~aictl.storage.SessionRow` entries.

Used as a fallback transcript source when OTel is disabled or
incomplete (Slice 3.2 of the Explorer data enrichment plan).

Idempotent: uses ``CREATE TABLE IF NOT EXISTS``.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS copilot_session_messages (
            session_id     TEXT NOT NULL,
            source_row_id  INTEGER NOT NULL,
            source_table   TEXT NOT NULL DEFAULT '',
            role           TEXT DEFAULT '',
            content        TEXT DEFAULT '',
            ts             REAL NOT NULL DEFAULT 0,
            ingested_at    REAL NOT NULL DEFAULT 0,
            PRIMARY KEY (source_table, source_row_id)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_copilot_session_messages_session"
        " ON copilot_session_messages(session_id, ts)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_copilot_session_messages_ts"
        " ON copilot_session_messages(ts)"
    )
