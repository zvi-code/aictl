# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v22: add ``session_commits`` table for git commit attribution.

Each row links a session to a commit observed in the session's project
directory between ``started_at`` and ``ended_at``. Populated by
:mod:`aictl.analysis.git_attribution` on ``SessionEnd`` (best-effort,
threaded) and lazily on first API request when missing.

Idempotent via ``CREATE TABLE IF NOT EXISTS``.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS session_commits (
            session_id   TEXT NOT NULL,
            sha          TEXT NOT NULL,
            author_name  TEXT DEFAULT '',
            author_email TEXT DEFAULT '',
            ts           REAL NOT NULL,
            subject      TEXT DEFAULT '',
            PRIMARY KEY (session_id, sha)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_session_commits_sid "
        "ON session_commits(session_id)"
    )
