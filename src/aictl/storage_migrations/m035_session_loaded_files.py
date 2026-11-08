# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v35: the instruction files each session actually loaded.

``session_loaded_files`` has one row per (session, path, how): the file a
session's own record shows it loaded, how it was loaded (``instructions``,
``nested_memory``, ``skill``, ``custom_agent``, ``system_prompt``), a short
detail, and the time it was first seen. Only paths are kept, never content.
Idempotent.
"""

from __future__ import annotations

import sqlite3

DDL = (
    "CREATE TABLE IF NOT EXISTS session_loaded_files ("
    " session_id TEXT NOT NULL, path TEXT NOT NULL, how TEXT NOT NULL DEFAULT '',"
    " detail TEXT DEFAULT '', ts REAL DEFAULT 0, tool TEXT DEFAULT '', agent_id TEXT DEFAULT '',"
    " PRIMARY KEY (session_id, path, how))",
)


def apply(conn: sqlite3.Connection) -> None:
    for statement in DDL:
        conn.execute(statement)
