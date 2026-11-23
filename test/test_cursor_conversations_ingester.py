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
from aictl.collection_status import CollectionStatus
from aictl.ingesters.message_facts import MessageFacts
from aictl.records import SessionRow
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from core_store_fakes import message_facts, quality, written
from aictl.stores.testing import MemoryWriter


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
def store(tmp_path: Path) -> MessageFacts:
    return message_facts(tmp_path)


# ── tests ─────────────────────────────────────────────────────────


def test_poll_missing_db_returns_zero(tmp_path: Path, store: MessageFacts) -> None:
    missing = tmp_path / "nope.db"
    ingester = CursorConversationsIngester(missing, store)
    assert ingester.poll() == 0
    rows = quality(store, "ingester:cursor-conversations")
    assert rows[0]["status"] == "source_missing"


def test_poll_ingests_rows_and_creates_provisional_session(
    tmp_path: Path, store: MessageFacts
) -> None:
    src = tmp_path / "conversations.db"
    _build_source_db(src)
    ts = time.time()
    _insert_message(src, "conv-1", "user", "hello", ts)
    _insert_message(src, "conv-1", "assistant", "world", ts + 1)

    ingester = CursorConversationsIngester(src, store)
    assert ingester.poll() == 2

    rows = written(store.writer, "cursor_session_messages")
    assert [(r["role"], r["content"]) for r in rows] == [("user", "hello"), ("assistant", "world")]
    # The conversation's own id, never an invented cursor:<id>.
    assert rows[0]["session_id"] == "conv-1"
    [session] = written(store.writer, "sessions")
    assert (session["tool"], session["project_path"]) == ("cursor", "/proj/demo")


def test_second_poll_ingests_zero(tmp_path: Path, store: MessageFacts) -> None:
    src = tmp_path / "conversations.db"
    _build_source_db(src)
    ts = time.time()
    _insert_message(src, "conv-1", "user", "hello", ts)

    ingester = CursorConversationsIngester(src, store)
    assert ingester.poll() == 1
    assert ingester.poll() == 0

    assert len(written(store.writer, "cursor_session_messages")) == 1


def test_a_message_stays_with_its_own_conversation_when_another_chat_is_open(tmp_path: Path) -> None:
    src = tmp_path / "conversations.db"
    _build_source_db(src)
    ts = time.time()
    _insert_message(src, "conv-2", "user", "hi", ts)

    # Another chat of the same workspace is open at the time: the message is not its.
    writer = MemoryWriter()
    session_state = StateFile(tmp_path / "sessions.json")
    sessions = SessionFacts(writer, state=session_state)
    sessions.session(
        SessionRow(
            session_id="existing-cursor-session",
            tool="cursor",
            project_path="/proj/demo",
            started_at=ts - 10,
            ended_at=None,
        )
    )
    sessions.save()

    session_cache = SessionFacts(writer, state=session_state)
    message_state = StateFile(tmp_path / "cursor_messages.json")
    message_facts = MessageFacts(session_cache, CollectionStatus(writer), message_state)
    ingester = CursorConversationsIngester(src, message_facts)
    assert ingester.poll() == 1
    assert CursorConversationsIngester(src, message_facts).poll() == 0
    [message] = [row for _, table, rows in writer.operations if table == "cursor_session_messages" for row in rows]
    assert message["session_id"] == "conv-2"
    sessions_written = {row["session_id"] for _, table, rows in writer.operations if table == "sessions" for row in rows}
    assert sessions_written == {"existing-cursor-session", "conv-2"}


def test_poll_tolerates_locked_source(tmp_path: Path, store: MessageFacts) -> None:
    src = tmp_path / "conversations.db"
    _build_source_db(src)
    ts = time.time()
    _insert_message(src, "conv-3", "user", "x", ts)

    # Readers are immutable and take no lock, so a lock cannot block them. A
    # committed drop exercises the same missing-table path.
    blocker = sqlite3.connect(str(src))
    blocker.execute("DROP TABLE messages")
    blocker.commit()
    try:
        ingester = CursorConversationsIngester(src, store)
        assert ingester.poll() == 0
        rows = quality(store, "ingester:cursor-conversations")
        assert rows[0]["status"] in {"schema_unknown", "query_failed"}
    finally:
        blocker.rollback()
        blocker.close()
