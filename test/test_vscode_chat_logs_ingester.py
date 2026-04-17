"""Tests for :class:`aictl.ingesters.vscode_chat_logs.VSCodeChatLogsIngester`.

Covers:
* happy path — a fake workspaceStorage tree with a chat session file
  ingests both user + assistant messages;
* second poll on an unchanged file inserts 0 (mtime/size watermark);
* missing log dir returns 0 and does not raise;
* corrupt JSON returns 0;
* correlation to an existing ``copilot-vscode`` session row.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest

from aictl.ingesters.vscode_chat_logs import VSCodeChatLogsIngester
from aictl.storage import HistoryDB, SessionRow


def _write_snapshot(path: Path, *, session_id: str, requests: list[dict]) -> None:
    """Write a VS Code chatSessions ``.jsonl`` snapshot file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    snap = {
        "kind": 0,
        "v": {
            "sessionId": session_id,
            "creationDate": int(time.time() * 1000),
            "requests": requests,
        },
    }
    with path.open("w", encoding="utf-8") as fh:
        fh.write(json.dumps(snap) + "\n")


def _build_log_tree(root: Path) -> Path:
    """Create a fake ``workspaceStorage`` tree with one chat session file."""
    ws = root / "workspaceStorage" / "abcd1234" / "chatSessions"
    f = ws / "session-aaa.jsonl"
    requests = [
        {
            "requestId": "r-0",
            "timestamp": int((time.time() - 10) * 1000),
            "modelId": "gpt-4o-mini",
            "message": {"text": "Hello assistant"},
            "response": [{"value": "Hi there"}, {"kind": "thinking", "value": "pondering"}],
        },
        {
            "requestId": "r-1",
            "timestamp": int((time.time() - 5) * 1000),
            "modelId": "gpt-4o-mini",
            "message": {"text": "What is 2+2?"},
            "response": [{"value": "4"}],
        },
    ]
    _write_snapshot(f, session_id="vs-sess-1", requests=requests)
    return root / "workspaceStorage"


@pytest.fixture()
def our_db(tmp_path):
    db = HistoryDB(db_path=str(tmp_path / "aictl.db"), flush_interval=0)
    yield db
    db.close()


def test_ingests_user_and_assistant_messages(tmp_path, our_db):
    log_dir = _build_log_tree(tmp_path)
    ingester = VSCodeChatLogsIngester(log_dir, our_db)

    inserted = ingester.poll()
    # 2 requests × 2 roles (user + assistant) = 4 rows.
    assert inserted == 4

    conn = our_db._conn()
    rows = conn.execute(
        "SELECT session_id, role, content, model FROM vscode_chat_messages"
        " ORDER BY source_row_id"
    ).fetchall()
    roles = [r[1] for r in rows]
    assert roles == ["user", "assistant", "user", "assistant"]
    assert rows[0][2] == "Hello assistant"
    # Thinking block gets a "[thinking]" prefix.
    assert "[thinking]" in rows[1][2]
    assert rows[0][3] == "gpt-4o-mini"
    # Provisional session row was created.
    sess = conn.execute(
        "SELECT session_id, tool FROM sessions WHERE session_id = ?",
        ("vscode-chat:vs-sess-1",),
    ).fetchone()
    assert sess is not None
    assert sess[1] == "copilot-vscode"


def test_second_poll_unchanged_file_is_noop(tmp_path, our_db):
    log_dir = _build_log_tree(tmp_path)
    ingester = VSCodeChatLogsIngester(log_dir, our_db)
    assert ingester.poll() == 4
    assert ingester.poll() == 0


def test_missing_log_dir_returns_zero(tmp_path, our_db):
    ingester = VSCodeChatLogsIngester(tmp_path / "does-not-exist", our_db)
    assert ingester.poll() == 0


def test_corrupt_jsonl_is_tolerated(tmp_path, our_db):
    ws = tmp_path / "workspaceStorage" / "bad" / "chatSessions"
    ws.mkdir(parents=True)
    (ws / "corrupt.jsonl").write_text("{not valid json\n", encoding="utf-8")
    ingester = VSCodeChatLogsIngester(tmp_path / "workspaceStorage", our_db)
    assert ingester.poll() == 0


def test_correlates_to_existing_session(tmp_path, our_db):
    log_dir = _build_log_tree(tmp_path)
    # Pre-seed a real session row whose session_id matches the VS Code
    # chat sessionId — the ingester should attach to it rather than
    # creating a vscode-chat:* provisional row.
    our_db.upsert_session(
        SessionRow(
            session_id="vs-sess-1",
            tool="copilot-vscode",
            project_path="/work",
            started_at=time.time() - 100,
        )
    )
    ingester = VSCodeChatLogsIngester(log_dir, our_db)
    assert ingester.poll() == 4

    conn = our_db._conn()
    sids = {
        r[0]
        for r in conn.execute(
            "SELECT DISTINCT session_id FROM vscode_chat_messages"
        ).fetchall()
    }
    assert sids == {"vs-sess-1"}
    # No provisional row was created.
    row = conn.execute(
        "SELECT session_id FROM sessions WHERE session_id = ?",
        ("vscode-chat:vs-sess-1",),
    ).fetchone()
    assert row is None


def test_empty_requests_are_ignored(tmp_path, our_db):
    ws = tmp_path / "workspaceStorage" / "empty" / "chatSessions"
    _write_snapshot(ws / "empty.jsonl", session_id="empty-sid", requests=[])
    ingester = VSCodeChatLogsIngester(tmp_path / "workspaceStorage", our_db)
    assert ingester.poll() == 0
