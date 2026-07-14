# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v24: add ``memory_snapshots`` table.

Persists a hash + raw content of every Claude Code memory file at the
start and end of a session, so the dashboard can render a diff of
"what the agent learned this session" in the Explorer's Memory panel.

Idempotent: uses ``CREATE TABLE IF NOT EXISTS``.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    # Individual execute() calls (not executescript, which would
    # implicitly COMMIT the runner's per-migration transaction).
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS memory_snapshots (
            session_id TEXT NOT NULL,
            phase      TEXT NOT NULL CHECK(phase IN ('start','end')),
            path       TEXT NOT NULL,
            sha        TEXT NOT NULL,
            content    TEXT NOT NULL DEFAULT '',
            ts         REAL NOT NULL DEFAULT 0,
            PRIMARY KEY (session_id, phase, path)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_memory_snapshots_session"
        " ON memory_snapshots(session_id, phase)"
    )
