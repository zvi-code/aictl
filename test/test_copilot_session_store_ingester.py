"""Tests for :class:`aictl.ingesters.copilot_session_store.CopilotSessionStoreIngester`.

Covers:
* happy path — two sessions × four messages land in our table;
* second poll with no new rows inserts 0;
* missing source DB returns 0 and does not raise;
* a source DB locked by a concurrent writer still returns gracefully.
"""

from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path

import pytest

from aictl.ingesters.copilot_session_store import CopilotSessionStoreIngester
from aictl.storage import HistoryDB, SessionRow


def _build_source_db(path: Path) -> None:
    """Build a fake Copilot session-store.db with 2 sessions × 4 messages."""
    conn = sqlite3.connect(str(path))
    conn.executescript(
        """
        CREATE TABLE sessions (
            id TEXT PRIMARY KEY,
            created_at REAL
        );
        CREATE TABLE messages (
            session_id TEXT,
            role TEXT,
            content TEXT,
            created_at REAL
        );
        """
    )
    now = time.time()
    for sid in ("sess-A", "sess-B"):
        conn.execute("INSERT INTO sessions VALUES(?, ?)", (sid, now - 100))
    for sid in ("sess-A", "sess-B"):
        for i, role in enumerate(("user", "assistant", "user", "assistant")):
            conn.execute(
                "INSERT INTO messages(session_id, role, content, created_at)"
                " VALUES(?,?,?,?)",
                (sid, role, f"{sid}-msg-{i}-{role}", now - 90 + i),
            )
    conn.commit()
    conn.close()


@pytest.fixture()
def our_db(tmp_path):
    db = HistoryDB(db_path=str(tmp_path / "aictl.db"), flush_interval=0)
    yield db
    db.close()


def test_ingests_all_messages_on_first_poll(tmp_path, our_db):
    src = tmp_path / "session-store.db"
    _build_source_db(src)

    ingester = CopilotSessionStoreIngester(src, our_db)
    inserted = ingester.poll()

    assert inserted == 8
    conn = our_db._conn()
    rows = conn.execute(
        "SELECT session_id, role, content FROM copilot_session_messages"
        " ORDER BY source_row_id"
    ).fetchall()
    assert len(rows) == 8
    # Provisional sessions were created for both source ids.
    sess_rows = conn.execute(
        "SELECT session_id FROM sessions WHERE tool='copilot-cli' ORDER BY session_id"
    ).fetchall()
    session_ids = {r[0] for r in sess_rows}
    assert "copilot:sess-A" in session_ids
    assert "copilot:sess-B" in session_ids
    # Cursor advanced.
    assert ingester.last_cursor.get("messages") == 8


def test_correlates_to_existing_session(tmp_path, our_db):
    src = tmp_path / "session-store.db"
    _build_source_db(src)

    # Pre-seed a real session row that matches one of the source ids.
    our_db.upsert_session(
        SessionRow(
            session_id="sess-A",
            tool="copilot-cli",
            project_path="/work",
            started_at=time.time() - 200,
        )
    )

    ingester = CopilotSessionStoreIngester(src, our_db)
    ingester.poll()

    conn = our_db._conn()
    rows = conn.execute(
        "SELECT DISTINCT session_id FROM copilot_session_messages ORDER BY session_id"
    ).fetchall()
    ids = {r[0] for r in rows}
    # sess-A should have been correlated to the existing row verbatim.
    assert "sess-A" in ids
    # sess-B had no match, so a provisional row was made.
    assert "copilot:sess-B" in ids


def test_second_poll_with_no_new_rows_inserts_zero(tmp_path, our_db):
    src = tmp_path / "session-store.db"
    _build_source_db(src)

    ingester = CopilotSessionStoreIngester(src, our_db)
    assert ingester.poll() == 8
    assert ingester.poll() == 0


def test_missing_source_db_returns_zero(tmp_path, our_db):
    ingester = CopilotSessionStoreIngester(tmp_path / "does-not-exist.db", our_db)
    assert ingester.poll() == 0


def test_locked_source_db_is_handled_gracefully(tmp_path, our_db):
    src = tmp_path / "session-store.db"
    _build_source_db(src)

    # Hold an exclusive transaction on the source DB to simulate Copilot
    # writing while we poll. Read-only URI connections typically still
    # succeed on SELECT, so this mainly exercises the "no crash" path.
    blocker = sqlite3.connect(str(src), isolation_level=None)
    blocker.execute("BEGIN EXCLUSIVE")

    try:
        ingester = CopilotSessionStoreIngester(src, our_db)
        # Must not raise even if the read returns 0 rows due to the lock.
        result = ingester.poll()
        assert result >= 0
    finally:
        blocker.execute("ROLLBACK")
        blocker.close()


def test_discover_handles_schema_without_ts(tmp_path, our_db):
    """Ingester works even when the source table has no timestamp column."""
    src = tmp_path / "session-store.db"
    conn = sqlite3.connect(str(src))
    conn.executescript(
        """
        CREATE TABLE messages (
            session_id TEXT,
            role TEXT,
            content TEXT
        );
        """
    )
    conn.execute(
        "INSERT INTO messages VALUES('S', 'user', 'hi')",
    )
    conn.commit()
    conn.close()

    ingester = CopilotSessionStoreIngester(src, our_db)
    assert ingester.poll() == 1
