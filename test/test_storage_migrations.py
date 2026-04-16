# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Fixture-walk tests for the migrations registered in
:mod:`aictl.storage_migrations`.

Starting point: **v20**. Earlier "versions" (v1 – v19) were implicit
schema bumps that never carried their own DDL (see the module docstring
on ``aictl.storage_migrations``), so there is no meaningful pre-v20
fixture to walk from. We therefore cover:

1. A synthetic v20 DB → opened via :class:`HistoryDB` → upgraded to
   ``CURRENT_VERSION`` with ``sessions.pid`` added.
2. A synthetic pre-v20 DB containing one of the legacy tables that
   ``m020_drop_legacy_tables`` is responsible for dropping, to prove the
   drop path still fires.
3. A fresh DB (no file) → created directly at ``CURRENT_VERSION`` via
   the baseline ``_SCHEMA_SQL`` path, zero migrations applied.
4. Re-opening an already-current DB → zero migrations applied.
"""

from __future__ import annotations

import sqlite3

import pytest

from aictl import storage as storage_mod
from aictl import storage_migrations
from aictl.storage import HistoryDB
from aictl.storage_migrations import CURRENT_VERSION


@pytest.fixture
def count_calls(monkeypatch):
    """Wrap every registered migration to count how often it runs."""
    counts: dict[int, int] = {target: 0 for target, _ in storage_migrations.MIGRATIONS}
    wrapped = []
    for target, fn in storage_migrations.MIGRATIONS:

        def make(target_=target, fn_=fn):
            def _wrapped(conn):
                counts[target_] += 1
                return fn_(conn)

            return _wrapped

        wrapped.append((target, make()))
    monkeypatch.setattr(storage_migrations, "MIGRATIONS", wrapped)
    # storage.py captures ``apply_pending`` at import time; rebind it too.
    from aictl.storage_migrations import apply_pending

    monkeypatch.setattr(storage_mod, "_apply_pending_migrations", apply_pending)
    return counts


def _build_v20_fixture(path) -> None:
    """Create a DB at schema_version=20 with the pre-v21 ``sessions``
    shape (no ``pid`` column). Column set otherwise matches the v20
    baseline so all v21 indexes can be created against it."""
    conn = sqlite3.connect(str(path))
    conn.execute("CREATE TABLE schema_version (version INTEGER PRIMARY KEY)")
    conn.execute("INSERT INTO schema_version(version) VALUES(20)")
    conn.execute(
        "CREATE TABLE sessions ("
        "session_id TEXT PRIMARY KEY, tool TEXT DEFAULT '', "
        "project_path TEXT DEFAULT '', model TEXT DEFAULT '', "
        "git_branch TEXT DEFAULT '', git_commit TEXT DEFAULT '', "
        "started_at REAL DEFAULT 0, ended_at REAL, source TEXT DEFAULT '', "
        "input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0, "
        "cache_read_tokens INTEGER DEFAULT 0, cache_creation_tokens INTEGER DEFAULT 0, "
        "cost_usd REAL DEFAULT 0, request_count INTEGER DEFAULT 0, "
        "tool_call_count INTEGER DEFAULT 0, files_modified INTEGER DEFAULT 0)"
    )
    conn.execute("INSERT INTO sessions(session_id, tool, started_at) VALUES('s1', 'test', 1.0)")
    conn.commit()
    conn.close()


def _build_pre_v20_fixture(path) -> None:
    """Create a DB at schema_version=12 with a legacy table that v20
    migration is responsible for dropping."""
    conn = sqlite3.connect(str(path))
    conn.execute("CREATE TABLE schema_version (version INTEGER PRIMARY KEY)")
    conn.execute("INSERT INTO schema_version(version) VALUES(12)")
    conn.execute("CREATE TABLE samples (ts REAL, metric TEXT, value REAL)")
    conn.execute("CREATE TABLE tool_metrics (ts REAL, tool TEXT)")
    conn.execute("INSERT INTO samples VALUES(1.0, 'm', 1.0)")
    conn.commit()
    conn.close()


def _table_exists(conn, name: str) -> bool:
    cur = conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,))
    return cur.fetchone() is not None


def _column_exists(conn, table: str, column: str) -> bool:
    cur = conn.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cur.fetchall())


def _recorded_version(conn) -> int:
    cur = conn.execute("SELECT MAX(version) FROM schema_version")
    row = cur.fetchone()
    return int(row[0] or 0)


def test_walk_from_v20_adds_pid_column(tmp_path, count_calls):
    db_path = tmp_path / "v20.db"
    _build_v20_fixture(db_path)

    db = HistoryDB(db_path=db_path, flush_interval=0)
    try:
        conn = db._conn()
        assert _recorded_version(conn) == CURRENT_VERSION
        assert _column_exists(conn, "sessions", "pid")
        # Data preserved through the migration.
        row = conn.execute("SELECT session_id, pid FROM sessions").fetchone()
        assert row == ("s1", 0)
        # Baseline tables that only exist in v21 schema must be present.
        for table in ("requests", "tool_invocations", "events", "datapoint_catalog"):
            assert _table_exists(conn, table), table
    finally:
        db.close()

    # Only the m021 migration should have fired (target > 20).
    assert count_calls == {20: 0, 21: 1}


def test_walk_from_pre_v20_drops_legacy_tables(tmp_path, count_calls):
    db_path = tmp_path / "v12.db"
    _build_pre_v20_fixture(db_path)

    db = HistoryDB(db_path=db_path, flush_interval=0)
    try:
        conn = db._conn()
        assert _recorded_version(conn) == CURRENT_VERSION
        # Legacy tables dropped by m020.
        assert not _table_exists(conn, "samples")
        assert not _table_exists(conn, "tool_metrics")
        # v21 baseline present.
        assert _table_exists(conn, "sessions")
        assert _column_exists(conn, "sessions", "pid")
    finally:
        db.close()

    assert count_calls == {20: 1, 21: 1}


def test_fresh_db_skips_all_migrations(tmp_path, count_calls):
    db_path = tmp_path / "fresh.db"
    assert not db_path.exists()

    db = HistoryDB(db_path=db_path, flush_interval=0)
    try:
        conn = db._conn()
        assert _recorded_version(conn) == CURRENT_VERSION
        assert _column_exists(conn, "sessions", "pid")
    finally:
        db.close()

    # Fresh DB path bypasses the migration loop entirely.
    assert count_calls == {20: 0, 21: 0}


def test_reopen_current_db_is_noop(tmp_path, count_calls):
    db_path = tmp_path / "reopen.db"

    # First open creates a fresh, already-current DB.
    db = HistoryDB(db_path=db_path, flush_interval=0)
    db.close()
    assert count_calls == {20: 0, 21: 0}

    # Second open: nothing to do, no migrations fire.
    db2 = HistoryDB(db_path=db_path, flush_interval=0)
    try:
        conn = db2._conn()
        assert _recorded_version(conn) == CURRENT_VERSION
    finally:
        db2.close()
    assert count_calls == {20: 0, 21: 0}
