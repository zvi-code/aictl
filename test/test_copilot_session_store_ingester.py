"""Tests for :class:`aictl.ingesters.copilot_session_store.CopilotSessionStoreIngester`.

Covers:
* happy path — two sessions × four messages land in our table;
* second poll with no new rows inserts 0;
* missing source DB returns 0 and does not raise;
* a source DB locked by a concurrent writer still returns gracefully.
"""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

import pytest

from aictl.ingesters.copilot_session_store import CopilotSessionStoreIngester
from aictl.records import SessionRow
from core_store_fakes import message_facts, quality, written


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
    return message_facts(tmp_path)


def test_ingests_all_messages_on_first_poll(tmp_path, our_db):
    src = tmp_path / "session-store.db"
    _build_source_db(src)

    ingester = CopilotSessionStoreIngester(src, our_db)
    inserted = ingester.poll()

    assert inserted == 8
    rows = written(our_db.writer, "copilot_session_messages")
    assert len(rows) == 8
    # Each message is stored under the session id the store's row carries, before any session row
    # exists: no invented copilot:<id> session, no row of our own for a session we have not read.
    assert {r["session_id"] for r in rows} == {"sess-A", "sess-B"}
    assert not written(our_db.writer, "sessions")
    # Cursor advanced.
    assert ingester.last_cursor.get("messages") == 8


def test_correlates_to_existing_session(tmp_path, our_db):
    src = tmp_path / "session-store.db"
    _build_source_db(src)

    # Pre-seed a real session row that matches one of the source ids.
    our_db.sessions.session(
        SessionRow(
            session_id="sess-A",
            tool="copilot-cli",
            project_path="/work",
            started_at=time.time() - 200,
        )
    )

    ingester = CopilotSessionStoreIngester(src, our_db)
    ingester.poll()

    rows = written(our_db.writer, "copilot_session_messages")
    ids = {r["session_id"] for r in rows}
    # Both sessions keep their real ids, whether or not their row exists yet.
    assert ids == {"sess-A", "sess-B"}


def test_second_poll_with_no_new_rows_inserts_zero(tmp_path, our_db):
    src = tmp_path / "session-store.db"
    _build_source_db(src)

    ingester = CopilotSessionStoreIngester(src, our_db)
    assert ingester.poll() == 8
    assert ingester.poll() == 0


def test_missing_source_db_returns_zero(tmp_path, our_db):
    ingester = CopilotSessionStoreIngester(tmp_path / "does-not-exist.db", our_db)
    assert ingester.poll() == 0
    rows = quality(our_db, "ingester:copilot-session-store")
    assert rows[0]["status"] == "source_missing"


def test_unknown_schema_records_data_quality(tmp_path, our_db):
    src = tmp_path / "session-store.db"
    conn = sqlite3.connect(str(src))
    conn.execute("CREATE TABLE unrelated(id INTEGER PRIMARY KEY, payload TEXT)")
    conn.commit()
    conn.close()

    ingester = CopilotSessionStoreIngester(src, our_db)
    assert ingester.poll() == 0
    rows = quality(our_db, "ingester:copilot-session-store")
    assert rows[0]["status"] == "schema_unknown"


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
    rows = quality(our_db, "ingester:copilot-session-store")
    assert rows[0]["status"] == "ok"
