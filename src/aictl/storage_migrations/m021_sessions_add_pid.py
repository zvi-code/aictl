# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v21: add ``pid`` column to ``sessions``.

Some telemetry emitters need to correlate a session with the OS process
that produced it. Pre-v21 rows fall back to ``pid = 0``.

Idempotent: swallows the duplicate-column ``OperationalError`` that
SQLite raises when the column is already present, and the missing-table
error on pre-v20 databases where the baseline schema (which already
includes the column) has not been created yet. Any other
``OperationalError`` (e.g. 'database is locked') re-raises so the
runner never records this version for a migration that did not apply.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    try:
        conn.execute("ALTER TABLE sessions ADD COLUMN pid INTEGER DEFAULT 0")
    except sqlite3.OperationalError as exc:
        msg = str(exc).lower()
        # 'duplicate column': already applied. 'no such table': baseline
        # schema (which includes the column) has not been created yet.
        if "duplicate column" not in msg and "no such table" not in msg:
            raise
