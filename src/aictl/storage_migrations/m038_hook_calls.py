# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v38: ``hook_calls``, one row per hook call the aictl hook wrapper reports.

The wrapper's envelope (``aictl_hook``, format version 1) gives each call an id
(``call_id``, unique, so a retried POST is stored once), the time of the call
(``ts``) and the size of the payload. ``received_at`` is when the daemon got it.
A wrapped user hook (``aictl hooks wrap``) adds its exit code, duration and output
sizes. ``payload``, ``command`` and ``output`` are text: kept only with capture
``full``. Per-project table, routed by session. Idempotent.
"""

from __future__ import annotations

import sqlite3

DDL = (
    "CREATE TABLE IF NOT EXISTS hook_calls ("
    " id INTEGER PRIMARY KEY AUTOINCREMENT, call_id TEXT DEFAULT '',"
    " ts REAL NOT NULL, received_at REAL NOT NULL, format_version INTEGER DEFAULT 0,"
    " tool TEXT DEFAULT '', event TEXT DEFAULT '', hook_event_name TEXT DEFAULT '', source TEXT DEFAULT '',"
    " session_id TEXT DEFAULT '', agent_id TEXT DEFAULT '', project_path TEXT DEFAULT '',"
    " pid INTEGER DEFAULT 0, hook_pid INTEGER DEFAULT 0, hook_ppid INTEGER DEFAULT 0,"
    " tool_name TEXT DEFAULT '', tool_use_id TEXT DEFAULT '', permission_mode TEXT DEFAULT '',"
    " payload_bytes INTEGER DEFAULT 0, truncated INTEGER DEFAULT 0, payload TEXT DEFAULT '{}',"
    " wrapped INTEGER DEFAULT 0, command_hash TEXT DEFAULT '', command TEXT DEFAULT '',"
    " exit_code INTEGER, duration_ms REAL DEFAULT 0, overhead_ms REAL DEFAULT 0,"
    " stdout_bytes INTEGER DEFAULT 0, stderr_bytes INTEGER DEFAULT 0, decision TEXT DEFAULT '',"
    " output TEXT DEFAULT '')",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_hook_calls_call ON hook_calls(call_id) WHERE call_id != ''",
    "CREATE INDEX IF NOT EXISTS idx_hook_calls_session ON hook_calls(session_id, ts)",
    "CREATE INDEX IF NOT EXISTS idx_hook_calls_ts ON hook_calls(ts)",
)


def apply(conn: sqlite3.Connection) -> None:
    for statement in DDL:
        conn.execute(statement)
