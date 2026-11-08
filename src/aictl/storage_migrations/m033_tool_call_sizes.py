# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v33: the size of each tool call's input and output.

``input_bytes`` is the size of the arguments an agent sent to a tool and
``output_bytes`` the size of the result it got back, both as UTF-8 text.
Older rows keep NULL: their size was not recorded. Idempotent.
"""

from __future__ import annotations

import sqlite3


def apply(conn: sqlite3.Connection) -> None:
    for column in ("input_bytes", "output_bytes"):
        try:
            conn.execute(f"ALTER TABLE tool_invocations ADD COLUMN {column} INTEGER")
        except sqlite3.OperationalError as exc:
            msg = str(exc).lower()
            # Already applied, or the baseline schema (which has the columns) is still to run.
            if "duplicate column" not in msg and "no such table" not in msg:
                raise
