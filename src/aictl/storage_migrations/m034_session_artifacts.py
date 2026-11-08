# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v34: an index of the files in each tool's own session folder.

``session_folders`` has one row per session folder that aictl scanned: the
folder, the mtime signature of the last scan, and the count and size of all
its files. ``session_artifacts`` has one row per indexed file: path, size and
mtime only. aictl never copies or reads the content of these files. A session
keeps at most a fixed number of file rows; ``files_total`` keeps the real count.

An index on ``sessions.started_at`` lets the session search list the newest
sessions first without a sort of the whole table. Idempotent.
"""

from __future__ import annotations

import sqlite3

DDL = (
    "CREATE TABLE IF NOT EXISTS session_folders ("
    " session_id TEXT PRIMARY KEY, tool TEXT DEFAULT '', folder TEXT NOT NULL DEFAULT '',"
    " signature REAL DEFAULT 0, files_total INTEGER DEFAULT 0, bytes_total INTEGER DEFAULT 0,"
    " scanned_at REAL DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS session_artifacts ("
    " session_id TEXT NOT NULL, path TEXT NOT NULL, folder TEXT DEFAULT '',"
    " size_bytes INTEGER DEFAULT 0, mtime REAL DEFAULT 0,"
    " PRIMARY KEY (session_id, path))",
    "CREATE INDEX IF NOT EXISTS idx_session_artifacts_path ON session_artifacts(path)",
)


def apply(conn: sqlite3.Connection) -> None:
    for statement in DDL:
        conn.execute(statement)
    try:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at)")
    except sqlite3.OperationalError as exc:
        # The baseline schema, which has the index, is still to run on a new database.
        if "no such table" not in str(exc).lower():
            raise
