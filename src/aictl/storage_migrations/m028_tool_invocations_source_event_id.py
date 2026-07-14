# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v28: add ``source_event_id`` column to ``tool_invocations``.

Hook events carry a per-invocation ``tool_use_id`` but the table had no
column to store it, so the dedup key fell back to a value-based hash
(session + tool_name + input + is_error + source) that collapsed
legitimate identical repeats — running ``Bash("git status")`` twice
persisted one row.  With the id stored, the dedup key anchors on it and
PostToolUse duration updates target their own row.

Pre-v28 rows fall back to ``source_event_id = ''``.

Idempotent: swallows the duplicate-column ``OperationalError`` that
SQLite raises when the column is already present, and the missing-table
error on fresh databases where the baseline schema (which already
includes the column) has not been created yet. Any other
``OperationalError`` (e.g. 'database is locked') re-raises so the
runner never records this version for a migration that did not apply.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    try:
        conn.execute("ALTER TABLE tool_invocations ADD COLUMN source_event_id TEXT DEFAULT ''")
    except sqlite3.OperationalError as exc:
        msg = str(exc).lower()
        # 'duplicate column': already applied. 'no such table': baseline
        # schema (which includes the column) has not been created yet.
        if "duplicate column" not in msg and "no such table" not in msg:
            raise
