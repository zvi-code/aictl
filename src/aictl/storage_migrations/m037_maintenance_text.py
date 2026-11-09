# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v37: ``maintenance_state.text``, and real dates in ``ui_dashboard``.

``maintenance_state.value`` is a number. The VS Code chat ingester kept its
cursor, as JSON text, in that column; the cursor now has its own ``text``
column. ``ui_dashboard.created_at`` and ``updated_at`` held the literal text
``%s`` in databases made with the old column default (a doubled ``%%``); they
get the time of the repair. Idempotent.
"""

from __future__ import annotations

import sqlite3
import time


def apply(conn: sqlite3.Connection) -> None:
    try:
        conn.execute("ALTER TABLE maintenance_state ADD COLUMN text TEXT NOT NULL DEFAULT ''")
    except sqlite3.OperationalError as exc:
        msg = str(exc).lower()
        # Already applied, or the baseline schema (which has the column) is still to run.
        if "duplicate column" not in msg and "no such table" not in msg:
            raise
    now = time.time()
    for column in ("created_at", "updated_at"):
        try:
            conn.execute(f"UPDATE ui_dashboard SET {column} = ? WHERE typeof({column}) = 'text'", (now,))
        except sqlite3.OperationalError as exc:
            if "no such table" not in str(exc).lower():
                raise
