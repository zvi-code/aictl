# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v27: add file-write index and data-quality status tables.

The file-write index is the queryable substrate for "what did this
agent/session write, when, and from which tool event?". Data-quality
status rows make collector/ingester/sink degradation visible as data
instead of only logs.

Idempotent.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS file_write_events (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            dedup_key         TEXT DEFAULT '',
            ts                REAL NOT NULL,
            session_id        TEXT DEFAULT '',
            tool              TEXT DEFAULT '',
            tool_name         TEXT DEFAULT '',
            operation         TEXT DEFAULT '',
            path              TEXT NOT NULL,
            project_path      TEXT DEFAULT '',
            pid               INTEGER DEFAULT 0,
            source_event_kind TEXT DEFAULT '',
            source_event_id   TEXT DEFAULT '',
            content_hash      TEXT DEFAULT '',
            size_bytes        INTEGER DEFAULT 0,
            detail            TEXT DEFAULT '{}'
        )
        """
    )
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_file_write_dedup"
        " ON file_write_events(dedup_key) WHERE dedup_key != ''"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_file_write_session"
        " ON file_write_events(session_id, ts)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_file_write_path"
        " ON file_write_events(path, ts)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_file_write_tool"
        " ON file_write_events(tool, ts)"
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS data_quality_status (
            component   TEXT NOT NULL,
            source      TEXT NOT NULL DEFAULT '',
            kind        TEXT DEFAULT '',
            status      TEXT NOT NULL,
            severity    TEXT DEFAULT '',
            message     TEXT DEFAULT '',
            updated_at  REAL NOT NULL,
            last_ok_at  REAL DEFAULT 0,
            count       INTEGER DEFAULT 1,
            detail      TEXT DEFAULT '{}',
            PRIMARY KEY (component, source)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_data_quality_status"
        " ON data_quality_status(status, updated_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_data_quality_kind"
        " ON data_quality_status(kind, updated_at)"
    )
    conn.commit()