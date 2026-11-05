# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v29: add ``session_usage``, per-session usage computed from raw transcripts.

One row per logical session, rewritten whole by
:class:`aictl.ingesters.transcript_usage.TranscriptUsageIngester`. It is kept
apart from ``sessions`` because hooks and OTel also write that table's counters:
reads overlay this row on top, so a transcript count always wins and is never
added to another source's count. ``models_json`` and ``daily_json`` keep the
per-model and per-local-day splits a session total cannot recover.

Idempotent.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS session_usage (
            session_id            TEXT PRIMARY KEY,
            tool                  TEXT NOT NULL DEFAULT '',
            source                TEXT NOT NULL DEFAULT 'transcript',
            quality               TEXT NOT NULL DEFAULT 'exact',
            quality_reason        TEXT NOT NULL DEFAULT '',
            model                 TEXT NOT NULL DEFAULT '',
            models_json           TEXT NOT NULL DEFAULT '{}',
            daily_json            TEXT NOT NULL DEFAULT '{}',
            input_tokens          INTEGER NOT NULL DEFAULT 0,
            output_tokens         INTEGER NOT NULL DEFAULT 0,
            cache_read_tokens     INTEGER NOT NULL DEFAULT 0,
            cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
            request_count         INTEGER NOT NULL DEFAULT 0,
            tool_call_count       INTEGER NOT NULL DEFAULT 0,
            turn_count            INTEGER NOT NULL DEFAULT 0,
            cost_usd              REAL,
            cost_quality          TEXT NOT NULL DEFAULT 'unknown',
            cost_reason           TEXT NOT NULL DEFAULT '',
            unpriced_models       TEXT NOT NULL DEFAULT '[]',
            billing_unit          TEXT NOT NULL DEFAULT '',
            billing_amount        REAL,
            premium_requests      REAL,
            estimated_list_usd    REAL,
            started_at            REAL NOT NULL DEFAULT 0,
            last_activity_at      REAL NOT NULL DEFAULT 0,
            project_path          TEXT NOT NULL DEFAULT '',
            updated_at            REAL NOT NULL DEFAULT 0
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_session_usage_last ON session_usage(last_activity_at)")
