"""Shared infrastructure for the per-tool ingesters.

The cursor/copilot/vscode ingesters each grew private copies of the same
three helpers (read-only SQLite open, data-quality recording, timestamp
coercion). This module is their one home; the per-ingester identity
(log prefix, ``ingester:<id>`` component, source path) rides in as
arguments.
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)


def open_readonly(db_path: Path, log_prefix: str) -> sqlite3.Connection | None:
    """Open *db_path* read-only, returning ``None`` when missing/unreadable."""
    if not db_path.exists():
        return None
    try:
        return sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=1.0)
    except sqlite3.Error as exc:
        log.warning("%s: failed to open %s read-only: %s", log_prefix, db_path, exc)
        return None


def record_quality(
    store: Any,
    ingester_id: str,
    source: Any,
    status: str,
    *,
    severity: str = "",
    message: str = "",
    detail: dict | None = None,
) -> None:
    """Record a data-quality event under ``ingester:<ingester_id>`` when the
    store supports it (in-memory test stores may not)."""
    if hasattr(store, "record_data_quality"):
        store.record_data_quality(
            f"ingester:{ingester_id}",
            status,
            kind="ingester",
            severity=severity,
            message=message,
            source=str(source),
            detail=detail,
        )


def coerce_ts(raw: Any) -> float:
    """Best-effort conversion of a source timestamp to epoch seconds.

    Accepts epoch numbers (values above ~1e12 are treated as milliseconds),
    numeric strings, and ISO-8601 strings; anything else -> 0.0.
    """
    if raw is None or raw == "":
        return 0.0
    if isinstance(raw, (int, float)):
        v = float(raw)
        return v / 1000.0 if v > 1e12 else v
    if isinstance(raw, str):
        try:
            v = float(raw)
            return v / 1000.0 if v > 1e12 else v
        except ValueError:
            pass
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
        except ValueError:
            return 0.0
    return 0.0
