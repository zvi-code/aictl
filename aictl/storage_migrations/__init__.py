# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Per-version SQLite schema migrations for :mod:`aictl.storage`.

Historical note
---------------
Prior to this split, ``aictl.storage`` carried every migration inline
inside a single ``_migrate`` method. The schema evolved by bumping an
integer ``SCHEMA_VERSION`` from 1 up to 21, but most of the early
"versions" (v1 – v19) never had explicit ALTER statements — new tables
were picked up implicitly via ``CREATE TABLE IF NOT EXISTS`` in the
baseline schema, so there is **no recoverable per-step DDL** for them.

That leaves two genuinely separable migrations that do real work:

* ``m020_drop_legacy_tables`` — drops pre-v20 table names that were
  renamed/removed in the v12 → v20 refactor.
* ``m021_sessions_add_pid``   — adds the ``sessions.pid`` column.

Both are expressed as idempotent ``apply(conn)`` callables so they can
be re-run safely. ``CURRENT_VERSION`` below is the single source of
truth for the target schema; ``aictl.storage`` re-exports it as
``SCHEMA_VERSION``.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Callable

from . import (
    m020_drop_legacy_tables,
    m021_sessions_add_pid,
    m022_session_commits,
    m023_cursor_session_messages,
    m024_memory_snapshots,
    m025_copilot_session_messages,
    m026_vscode_chat_messages,
)

MigrationFn = Callable[[sqlite3.Connection], None]

# Ordered ascending by target version. Each entry applies when the DB's
# recorded user_version is strictly less than the target.
MIGRATIONS: list[tuple[int, MigrationFn]] = [
    (20, m020_drop_legacy_tables.apply),
    (21, m021_sessions_add_pid.apply),
    (22, m022_session_commits.apply),
    (23, m023_cursor_session_messages.apply),
    (24, m024_memory_snapshots.apply),
    (25, m025_copilot_session_messages.apply),
    (26, m026_vscode_chat_messages.apply),
]

CURRENT_VERSION: int = MIGRATIONS[-1][0]


def apply_pending(conn: sqlite3.Connection, from_version: int) -> int:
    """Apply every migration whose target version is greater than *from_version*.

    Returns the number of migrations actually applied. Caller is
    responsible for recording the new schema version in whatever
    bookkeeping table it uses (``schema_version`` row or PRAGMA).
    """
    applied = 0
    for target, fn in MIGRATIONS:
        if target > from_version:
            fn(conn)
            applied += 1
    return applied


__all__ = ["MIGRATIONS", "CURRENT_VERSION", "apply_pending", "MigrationFn"]
