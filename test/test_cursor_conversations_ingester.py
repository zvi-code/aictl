# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for :mod:`aictl.ingesters.cursor_conversations`.

These tests fabricate a source ``conversations.db`` with the minimal
schema our ingester relies on, then verify:

* a single poll ingests all rows and correlates or provisions sessions;
* a missing source file is tolerated (poll returns ``0``);
* a locked / busy source is tolerated (poll returns ``0``);
* a second poll with no new rows ingests ``0`` without duplicating;
* when no existing session matches the project path, a provisional
  session is created with tool ``cursor`` and a synthetic ``session_id``.
"""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

import pytest

from aictl.ingesters.cursor_conversations import CursorConversationsIngester
from aictl.storage import HistoryDB, SessionRow


def _build_source_db(path: Path) -> None:
    """Create a fake Cursor ``conversations.db`` shaped like the real one."""
    conn = sqlite3.connect(str(path))
    conn.executescript(
        """
        CREATE TABLE conversations (
            id TEXT PRIMARY KEY,
            workspace_path TEXT,
            created_at REAL
        );
        CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT,
            role TEXT,
            content TEXT,
            created_at REAL
        );
        """
    )
    conn.commit()
    conn.close()


def _insert_message(
    path: Path,
    conversation_id: str,
    role: str,
    content: str,
    ts: float,
) -> None:
    conn = sqlite3.connect(str(path))
    conn.execute(
        "INSERT OR IGNORE INTO conversations(id, workspace_path, created_at)"
        " VALUES(?, ?, ?)",
        (conversation_id, "/proj/demo", ts),
    )
    conn.execute(
        "INSERT INTO messages(conversation_id, role, content, created_at)"
        " VALUES(?, ?, ?, ?)",
        (conversation_id, role, content, ts),
    )
    conn.commit()
    conn.close()


@pytest.fixture()
def store(tmp_path: Path) -> HistoryDB:
    db = HistoryDB(db_path=tmp_path / "history.db", flush_interval=0)
    try:
        yield db
    finally:
        db.close()


# ── tests ─────────────────────────────────────────────────────────


def test_poll_missing_db_returns_zero(tmp_path: Path, store: HistoryDB) -> None:
    missing = tmp_path / "nope.db"
    ingester = CursorConversationsIngester(missing, store)
    assert ingester.poll() == 0
    rows = store.query_data_quality(component="ingester:cursor-conversations")
    assert rows[0]["status"] == "source_missing"


def test_poll_ingests_rows_and_creates_provisional_session(
    tmp_path: Path, store: HistoryDB
) -> None:
    src = tmp_path / "conversations.db"
    _build_source_db(src)
    ts = time.time()
    _insert_message(src, "conv-1", "user", "hello", ts)
    _insert_message(src, "conv-1", "assistant", "world", ts + 1)

    ingester = CursorConversationsIngester(src, store)
    assert ingester.poll() == 2

    conn = store._conn()
    rows = conn.execute(
        "SELECT session_id, role, content FROM cursor_session_messages ORDER BY ts"
    ).fetchall()
    assert [(r[1], r[2]) for r in rows] == [("user", "hello"), ("assistant", "world")]
    # Provisional session was created.
    assert rows[0][0] == "cursor:conv-1"
    session = conn.execute(
        "SELECT tool, project_path FROM sessions WHERE session_id=?",
        (rows[0][0],),
    ).fetchone()
    assert session == ("cursor", "/proj/demo")


def test_second_poll_ingests_zero(tmp_path: Path, store: HistoryDB) -> None:
    src = tmp_path / "conversations.db"
    _build_source_db(src)
    ts = time.time()
    _insert_message(src, "conv-1", "user", "hello", ts)

    ingester = CursorConversationsIngester(src, store)
    assert ingester.poll() == 1
    assert ingester.poll() == 0

    conn = store._conn()
    count = conn.execute("SELECT COUNT(*) FROM cursor_session_messages").fetchone()[0]
    assert count == 1


def test_correlation_matches_existing_session(
    tmp_path: Path, store: HistoryDB
) -> None:
    src = tmp_path / "conversations.db"
    _build_source_db(src)
    ts = time.time()
    _insert_message(src, "conv-2", "user", "hi", ts)

    # Pre-seed a live Cursor session with the same project path; window
    # is open on the future side (ended_at IS NULL).
    store.upsert_session(
        SessionRow(
            session_id="existing-cursor-session",
            tool="cursor",
            project_path="/proj/demo",
            started_at=ts - 10,
            ended_at=None,
        )
    )

    ingester = CursorConversationsIngester(src, store)
    assert ingester.poll() == 1

    conn = store._conn()
    row = conn.execute(
        "SELECT session_id FROM cursor_session_messages"
    ).fetchone()
    assert row[0] == "existing-cursor-session"
    # No provisional session should have been created.
    provisional = conn.execute(
        "SELECT COUNT(*) FROM sessions WHERE session_id LIKE 'cursor:%'"
    ).fetchone()[0]
    assert provisional == 0


def test_poll_tolerates_locked_source(tmp_path: Path, store: HistoryDB) -> None:
    src = tmp_path / "conversations.db"
    _build_source_db(src)
    ts = time.time()
    _insert_message(src, "conv-3", "user", "x", ts)

    # Hold an exclusive write transaction in another connection to force
    # a lock. Since we open read-only this typically still reads, so we
    # also simulate the "no such table" path by dropping the table under
    # a transaction — exercising the sqlite3.OperationalError branch.
    blocker = sqlite3.connect(str(src))
    blocker.execute("BEGIN EXCLUSIVE")
    blocker.execute("DROP TABLE messages")
    try:
        ingester = CursorConversationsIngester(src, store)
        assert ingester.poll() == 0
        rows = store.query_data_quality(component="ingester:cursor-conversations")
        assert rows[0]["status"] in {"schema_unknown", "query_failed"}
    finally:
        blocker.rollback()
        blocker.close()
