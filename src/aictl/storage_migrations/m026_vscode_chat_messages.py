# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v26: add ``vscode_chat_messages`` table.

Stores conversation messages ingested from VS Code's Copilot Chat
session files under ``workspaceStorage/<id>/chatSessions/*.jsonl`` by
:class:`aictl.ingesters.vscode_chat_logs.VSCodeChatLogsIngester`.

Idempotent.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS vscode_chat_messages (
            session_id     TEXT NOT NULL,
            source_file    TEXT NOT NULL,
            source_row_id  INTEGER NOT NULL,
            role           TEXT DEFAULT '',
            content        TEXT DEFAULT '',
            model          TEXT DEFAULT '',
            ts             REAL NOT NULL DEFAULT 0,
            ingested_at    REAL NOT NULL DEFAULT 0,
            PRIMARY KEY (session_id, source_file, source_row_id)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_vscode_chat_messages_session"
        " ON vscode_chat_messages(session_id, ts)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_vscode_chat_messages_file"
        " ON vscode_chat_messages(source_file)"
    )
