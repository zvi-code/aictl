# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v31: what the tools record about context size.

Adds tool definition tokens, prompt limit, request size and tool count on
``requests``, and the table ``context_events`` for compactions and context splits.
NULL means that the source did not report a value. Idempotent, like every
migration here.
"""

from __future__ import annotations

import sqlite3

_COLUMNS = ("tool_tokens", "max_prompt_tokens", "request_bytes", "available_tools")

TABLES_SQL = (
    """
    CREATE TABLE IF NOT EXISTS context_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '', ts REAL, session_id TEXT,
        agent_id TEXT DEFAULT '', tool TEXT, kind TEXT, trigger TEXT DEFAULT '',
        before_tokens INTEGER, after_tokens INTEGER, duration_ms REAL,
        current_tokens INTEGER, system_tokens INTEGER, conversation_tokens INTEGER, tool_tokens INTEGER
    )
    """,
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_context_events_dedup ON context_events(dedup_key) WHERE dedup_key != ''",
    "CREATE INDEX IF NOT EXISTS idx_context_events_session ON context_events(session_id, ts)",
)


def apply(conn: sqlite3.Connection) -> None:
    for column in _COLUMNS:
        try:
            conn.execute(f"ALTER TABLE requests ADD COLUMN {column} INTEGER")
        except sqlite3.OperationalError as exc:
            msg = str(exc).lower()
            # Already applied, or the baseline schema (which has the column) is still to run.
            if "duplicate column" not in msg and "no such table" not in msg:
                raise
    for sql in TABLES_SQL:
        conn.execute(sql)
