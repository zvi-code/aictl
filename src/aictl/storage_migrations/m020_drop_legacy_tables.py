# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v20: drop legacy tables from the v12 → v20 schema refactor.

The pre-v20 schema used table names (``metrics``, ``tool_metrics``,
``tool_telemetry``, ``samples``, ``file_store``, ``path_specs``,
``process_specs``) that were renamed or replaced in v20. On upgrade we
simply drop them; the v20 baseline ``CREATE TABLE IF NOT EXISTS`` block
then materialises the replacements.

Idempotent: every drop uses ``IF EXISTS``.
"""

from __future__ import annotations

import logging
import sqlite3

log = logging.getLogger(__name__)

_LEGACY_TABLES = (
    "metrics",
    "tool_metrics",
    "tool_telemetry",
    "samples",
    "file_store",
    "path_specs",
    "process_specs",
)


def apply(conn: sqlite3.Connection) -> None:
    # No error swallowing: ``IF EXISTS`` already makes each drop
    # idempotent, so any OperationalError here (e.g. 'database is
    # locked') is a real failure that must abort the migration instead
    # of being masked while the schema version gets recorded anyway.
    # The runner (apply_pending) owns the transaction — do not commit.
    for table in _LEGACY_TABLES:
        conn.execute(f"DROP TABLE IF EXISTS {table}")
    log.info("Dropped legacy pre-v20 tables: %s", ", ".join(_LEGACY_TABLES))
