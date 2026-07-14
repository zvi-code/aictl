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


def _expected_counts(fired_above: int) -> dict[int, int]:
    """Expected count-map: migrations with target > ``fired_above`` fired once,
    everything else zero. Keeps these tests robust as new migrations land."""
    return {target: (1 if target > fired_above else 0) for target, _ in storage_migrations.MIGRATIONS}


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

    # Only migrations with target > 20 should have fired.
    assert count_calls == _expected_counts(20)


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

    assert count_calls == _expected_counts(19)


def _build_v27_fixture(path) -> None:
    """Create a DB at schema_version=27 with the pre-v28 ``tool_invocations``
    shape (no ``source_event_id`` column) and one existing row."""
    conn = sqlite3.connect(str(path))
    conn.execute("CREATE TABLE schema_version (version INTEGER PRIMARY KEY)")
    conn.execute("INSERT INTO schema_version(version) VALUES(27)")
    conn.execute(
        "CREATE TABLE tool_invocations ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT DEFAULT '', "
        "ts REAL NOT NULL, session_id TEXT DEFAULT '', request_id INTEGER DEFAULT 0, "
        "tool TEXT DEFAULT '', tool_name TEXT DEFAULT '', project_path TEXT DEFAULT '', "
        "pid INTEGER DEFAULT 0, is_error INTEGER DEFAULT 0, duration_ms REAL DEFAULT 0, "
        "input TEXT DEFAULT '{}', result_summary TEXT DEFAULT '', source TEXT DEFAULT '')"
    )
    conn.execute("CREATE UNIQUE INDEX idx_tool_inv_dedup ON tool_invocations(dedup_key) WHERE dedup_key != ''")
    conn.execute(
        "INSERT INTO tool_invocations(dedup_key, ts, session_id, tool_name, source)"
        " VALUES('legacy-key', 1.0, 's1', 'Bash', 'hook')"
    )
    conn.commit()
    conn.close()


def test_walk_from_v27_adds_source_event_id_column(tmp_path, count_calls):
    db_path = tmp_path / "v27.db"
    _build_v27_fixture(db_path)

    db = HistoryDB(db_path=db_path, flush_interval=0)
    try:
        conn = db._conn()
        assert _recorded_version(conn) == CURRENT_VERSION
        assert _column_exists(conn, "tool_invocations", "source_event_id")
        # Pre-v28 rows fall back to the empty-string default.
        row = conn.execute("SELECT session_id, tool_name, source_event_id FROM tool_invocations").fetchone()
        assert row == ("s1", "Bash", "")
    finally:
        db.close()

    assert count_calls == _expected_counts(27)


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
    assert count_calls == _expected_counts(CURRENT_VERSION)


def test_reopen_current_db_is_noop(tmp_path, count_calls):
    db_path = tmp_path / "reopen.db"

    # First open creates a fresh, already-current DB.
    db = HistoryDB(db_path=db_path, flush_interval=0)
    db.close()
    assert count_calls == _expected_counts(CURRENT_VERSION)

    # Second open: nothing to do, no migrations fire.
    db2 = HistoryDB(db_path=db_path, flush_interval=0)
    try:
        conn = db2._conn()
        assert _recorded_version(conn) == CURRENT_VERSION
    finally:
        db2.close()
    assert count_calls == _expected_counts(CURRENT_VERSION)


# ── Failure semantics ────────────────────────────────────────────────
#
# A blanket `except OperationalError: pass` in migrations used to mask
# locked-DB failures: the version was recorded while the DDL never
# applied, so upserts against the missing column failed forever.


@pytest.fixture
def fast_busy_timeout(monkeypatch):
    """Shrink sqlite's busy timeout so locked-DB tests don't stall 5s."""
    real_connect = sqlite3.connect

    def connect_fast(*args, **kwargs):
        kwargs["timeout"] = 0.2
        return real_connect(*args, **kwargs)

    monkeypatch.setattr(storage_mod.sqlite3, "connect", connect_fast)
    return real_connect


def test_locked_db_raises_and_does_not_record_version(tmp_path, fast_busy_timeout):
    """A write lock held by another connection must abort the migration
    walk — NOT record the version with the DDL silently skipped."""
    real_connect = fast_busy_timeout
    db_path = tmp_path / "locked.db"
    _build_v20_fixture(db_path)

    holder = real_connect(str(db_path))
    holder.execute("PRAGMA journal_mode=WAL")
    holder.execute("BEGIN IMMEDIATE")
    holder.execute("INSERT INTO sessions(session_id, tool, started_at) VALUES('hold', 't', 2.0)")
    try:
        with pytest.raises(sqlite3.OperationalError, match="locked|busy"):
            HistoryDB(db_path=db_path, flush_interval=0)
    finally:
        holder.rollback()
        holder.close()

    check = real_connect(str(db_path))
    try:
        assert _recorded_version(check) == 20, "version must not advance past a failed migration"
        assert not _column_exists(check, "sessions", "pid")
    finally:
        check.close()

    # Once the lock clears, reopening completes the walk.
    db = HistoryDB(db_path=db_path, flush_interval=0)
    try:
        conn = db._conn()
        assert _recorded_version(conn) == CURRENT_VERSION
        assert _column_exists(conn, "sessions", "pid")
    finally:
        db.close()


def test_duplicate_column_still_swallowed(tmp_path):
    """The idempotency case keeps working: a column added out-of-band
    (partial prior application) must not abort the walk."""
    db_path = tmp_path / "dup.db"
    _build_v20_fixture(db_path)
    conn = sqlite3.connect(str(db_path))
    conn.execute("ALTER TABLE sessions ADD COLUMN pid INTEGER DEFAULT 0")
    conn.commit()
    conn.close()

    db = HistoryDB(db_path=db_path, flush_interval=0)
    try:
        conn = db._conn()
        assert _recorded_version(conn) == CURRENT_VERSION
        assert _column_exists(conn, "sessions", "pid")
    finally:
        db.close()


def test_version_recorded_per_migration_closes_rerun_window(tmp_path, monkeypatch):
    """Each migration records its target version inside its own
    transaction. A crash mid-walk therefore never re-runs the already-
    applied steps (m020's DROP TABLEs would hit the live tables)."""
    original = storage_migrations.MIGRATIONS
    boom_target = 24

    def _boom(conn):
        raise sqlite3.OperationalError("simulated crash")

    patched = [(t, _boom if t == boom_target else fn) for t, fn in original]
    monkeypatch.setattr(storage_migrations, "MIGRATIONS", patched)
    monkeypatch.setattr(storage_mod, "_apply_pending_migrations", storage_migrations.apply_pending)

    db_path = tmp_path / "crash.db"
    _build_v20_fixture(db_path)
    with pytest.raises(sqlite3.OperationalError, match="simulated crash"):
        HistoryDB(db_path=db_path, flush_interval=0)

    conn = sqlite3.connect(str(db_path))
    try:
        # Every migration before the crash point is recorded.
        assert _recorded_version(conn) == boom_target - 1
        assert _column_exists(conn, "sessions", "pid")  # m021 applied + recorded
    finally:
        conn.close()

    # Second open resumes from the crash point: earlier steps do not
    # re-run.
    counts = {t: 0 for t, _ in original}

    def _count(target, fn):
        def wrapped(conn):
            counts[target] += 1
            return fn(conn)

        return wrapped

    monkeypatch.setattr(storage_migrations, "MIGRATIONS", [(t, _count(t, fn)) for t, fn in original])
    db = HistoryDB(db_path=db_path, flush_interval=0)
    try:
        assert _recorded_version(db._conn()) == CURRENT_VERSION
    finally:
        db.close()
    assert counts == _expected_counts(boom_target - 1)


def test_migration_reraises_non_benign_operational_error():
    """m021/m028 swallow only idempotency errors; anything else re-raises."""
    from aictl.storage_migrations import m021_sessions_add_pid, m028_tool_invocations_source_event_id

    class FailingConn:
        def execute(self, sql):
            raise sqlite3.OperationalError("database is locked")

    with pytest.raises(sqlite3.OperationalError):
        m021_sessions_add_pid.apply(FailingConn())
    with pytest.raises(sqlite3.OperationalError):
        m028_tool_invocations_source_event_id.apply(FailingConn())

    class DuplicateColumnConn:
        def execute(self, sql):
            raise sqlite3.OperationalError("duplicate column name: pid")

    m021_sessions_add_pid.apply(DuplicateColumnConn())  # must not raise
