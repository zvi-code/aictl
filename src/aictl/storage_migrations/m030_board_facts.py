# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v30: per-call facts for the panel dashboard.

Adds time to first token on ``requests``; agent, confirmation, target and exit
code on ``tool_invocations``; and the tables ``session_prompts`` and
``skill_uses``. Idempotent, like every migration here.
"""

from __future__ import annotations

import sqlite3

_COLUMNS = (
    ("requests", "ttft_ms REAL DEFAULT 0"),
    ("tool_invocations", "agent_id TEXT DEFAULT ''"),
    ("tool_invocations", "confirm TEXT DEFAULT ''"),
    ("tool_invocations", "confirm_wait_ms REAL DEFAULT 0"),
    ("tool_invocations", "target TEXT DEFAULT ''"),
    ("tool_invocations", "exit_code INTEGER"),
)

TABLES_SQL = (
    """
    CREATE TABLE IF NOT EXISTS session_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '', ts REAL, session_id TEXT,
        agent_id TEXT DEFAULT '', tool TEXT, project_path TEXT, text TEXT DEFAULT '', prompt_file TEXT DEFAULT ''
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS skill_uses (
        id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '', ts REAL, session_id TEXT,
        agent_id TEXT DEFAULT '', tool TEXT, project_path TEXT, name TEXT, trigger TEXT DEFAULT ''
    )
    """,
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_session_prompts_dedup ON session_prompts(dedup_key) WHERE dedup_key != ''",
    "CREATE INDEX IF NOT EXISTS idx_session_prompts_ts ON session_prompts(ts)",
    "CREATE INDEX IF NOT EXISTS idx_session_prompts_session ON session_prompts(session_id, ts)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_uses_dedup ON skill_uses(dedup_key) WHERE dedup_key != ''",
    "CREATE INDEX IF NOT EXISTS idx_skill_uses_ts ON skill_uses(ts)",
    "CREATE INDEX IF NOT EXISTS idx_skill_uses_session ON skill_uses(session_id, ts)",
)


def apply(conn: sqlite3.Connection) -> None:
    for table, column in _COLUMNS:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column}")
        except sqlite3.OperationalError as exc:
            msg = str(exc).lower()
            # Already applied, or the baseline schema (which has the column) is still to run.
            if "duplicate column" not in msg and "no such table" not in msg:
                raise
    for sql in TABLES_SQL:
        conn.execute(sql)
