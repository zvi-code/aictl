# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v21: add ``pid`` column to ``sessions``.

Some telemetry emitters need to correlate a session with the OS process
that produced it. Pre-v21 rows fall back to ``pid = 0``.

Idempotent: swallows the duplicate-column ``OperationalError`` that
SQLite raises when the column is already present.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    try:
        conn.execute("ALTER TABLE sessions ADD COLUMN pid INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # column already exists
