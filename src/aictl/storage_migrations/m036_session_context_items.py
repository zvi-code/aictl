# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v36: what fills each session's context, by category and item.

``session_context_items`` has one row per (session, agent, kind, name): the latest
record of an item that the tool put in the model's context (a memory file, a skill
of the listing, an MCP server's instructions, a custom agent, a listed tool name, a
section of a system prompt), with its size in characters and in tokens. ``tokens``
is measured when the tool reports it, else an estimate at 4 bytes per token with ``estimated`` = 1.
``removed`` = 1 when the tool said the item left the context. A row of kind
``reset`` marks a time from which the earlier items of a kind (``name``), or of all
kinds (``name`` = ``*``), no longer count: a compaction, a new system prompt.
Only sizes and names are kept, never content. Idempotent.
"""

from __future__ import annotations

import sqlite3

DDL = (
    "CREATE TABLE IF NOT EXISTS session_context_items ("
    " session_id TEXT NOT NULL, agent_id TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL, name TEXT NOT NULL,"
    " ts REAL DEFAULT 0, path TEXT DEFAULT '', chars INTEGER DEFAULT 0, tokens INTEGER DEFAULT 0,"
    " estimated INTEGER DEFAULT 1, removed INTEGER DEFAULT 0, tool TEXT DEFAULT '',"
    " PRIMARY KEY (session_id, agent_id, kind, name))",
)


def apply(conn: sqlite3.Connection) -> None:
    for statement in DDL:
        conn.execute(statement)
