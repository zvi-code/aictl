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
from aictl.records import SessionRow
from aictl.state_file import StateFile
from core_store_fakes import message_facts, written


def _write_snapshot(
    path: Path, *, session_id: str, requests: list[dict], patches: tuple[dict, ...] | list[dict] = ()
) -> None:
    """Write a VS Code chatSessions ``.jsonl`` file: a snapshot line, then patch lines."""
    path.parent.mkdir(parents=True, exist_ok=True)
    snap = {
        "kind": 0,
        "v": {
            "version": 3,
            "creationDate": int(time.time() * 1000),
            "sessionId": session_id,
            "requests": requests,
        },
    }
    with path.open("w", encoding="utf-8") as fh:
        # Compact separators, as VS Code writes them: the ingester reads the line head.
        for rec in [snap, *patches]:
            fh.write(json.dumps(rec, separators=(",", ":")) + "\n")


def _build_log_tree(root: Path) -> Path:
    """Create a fake ``workspaceStorage`` tree with one chat session file.

    As VS Code writes it: the snapshot has no requests; each request is
    pushed by a patch, its response streams in over append patches, and a
    result patch finishes it.
    """
    ws = root / "workspaceStorage" / "abcd1234" / "chatSessions"
    f = ws / "session-aaa.jsonl"
    patches = [
        {"kind": 1, "k": ["inputState", "inputText"], "v": "Hello"},
        {
            "kind": 2,
            "k": ["requests"],
            "v": [
                {
                    "requestId": "r-0",
                    "timestamp": int((time.time() - 10) * 1000),
                    "modelId": "gpt-4o-mini",
                    "message": {"text": "Hello assistant"},
                    "response": [],
                }
            ],
        },
        {"kind": 2, "k": ["requests", 0, "response"], "v": [{"value": "Hi "}]},
        {"kind": 1, "k": ["requests", 0, "completionTokens"], "v": 3},
        {
            "kind": 2,
            "k": ["requests", 0, "response"],
            "v": [{"value": "there"}, {"kind": "thinking", "value": "pondering"}],
        },
        {"kind": 1, "k": ["requests", 0, "result"], "v": {"metadata": {"promptTokens": 10, "outputTokens": 3}}},
        {
            "kind": 2,
            "k": ["requests"],
            "v": [
                {
                    "requestId": "r-1",
                    "timestamp": int((time.time() - 5) * 1000),
                    "modelId": "gpt-4o-mini",
                    "message": {"text": "What is 2+2?"},
                    "response": [],
                }
            ],
        },
        {"kind": 2, "k": ["requests", 1, "response"], "v": [{"value": "4"}]},
        {"kind": 1, "k": ["requests", 1, "modelState"], "v": {"value": 1, "completedAt": int(time.time() * 1000)}},
    ]
    _write_snapshot(f, session_id="vs-sess-1", requests=[], patches=patches)
    return root / "workspaceStorage"


@pytest.fixture()
def our_db(tmp_path):
    return message_facts(tmp_path)


def test_ingests_user_and_assistant_messages(tmp_path, our_db):
    log_dir = _build_log_tree(tmp_path)
    ingester = VSCodeChatLogsIngester(log_dir, our_db)

    inserted = ingester.poll()
    # 2 requests × 2 roles (user + assistant) = 4 rows.
    assert inserted == 4

    rows = sorted(written(our_db.writer, "vscode_chat_messages"), key=lambda row: row["source_row_id"])
    roles = [r["role"] for r in rows]
    assert roles == ["user", "assistant", "user", "assistant"]
    assert rows[0]["content"] == "Hello assistant"
    # The full text of a response that arrived over two append patches;
    # a thinking block gets a "[thinking]" prefix.
    assert rows[1]["content"] == "Hi there[thinking] pondering"
    assert rows[3]["content"] == "4"
    assert rows[0]["model"] == "gpt-4o-mini"
    # Stored under VS Code's own chat session id although no session row is known yet; no
    # invented vscode-chat:<id> session is made.
    assert {r["session_id"] for r in rows} == {"vs-sess-1"}
    assert not written(our_db.writer, "sessions")


def test_second_poll_unchanged_file_is_noop(tmp_path, our_db):
    log_dir = _build_log_tree(tmp_path)
    ingester = VSCodeChatLogsIngester(log_dir, our_db)
    assert ingester.poll() == 4
    assert ingester.poll() == 0


def test_poll_keeps_message_keys_distinct_across_files(tmp_path, our_db):
    log_dir = _build_log_tree(tmp_path)
    first = log_dir / "abcd1234" / "chatSessions" / "session-aaa.jsonl"
    second = log_dir / "efgh5678" / "chatSessions" / "session-bbb.jsonl"
    second.parent.mkdir(parents=True)
    second.write_bytes(first.read_bytes())
    ingester = VSCodeChatLogsIngester(log_dir, our_db)

    assert ingester.poll() == 8
    rows = written(our_db.writer, "vscode_chat_messages", operation="upsert")
    assert len({(r["source_file"], r["source_row_id"]) for r in rows}) == 8


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
    our_db.sessions.session(
        SessionRow(
            session_id="vs-sess-1",
            tool="copilot-vscode",
            project_path="/work",
            started_at=time.time() - 100,
        )
    )
    ingester = VSCodeChatLogsIngester(log_dir, our_db)
    assert ingester.poll() == 4

    sids = {r["session_id"] for r in written(our_db.writer, "vscode_chat_messages")}
    assert sids == {"vs-sess-1"}
    # No provisional row was created.
    assert {r["session_id"] for r in written(our_db.writer, "sessions")} == {"vs-sess-1"}


def test_empty_requests_are_ignored(tmp_path, our_db):
    ws = tmp_path / "workspaceStorage" / "empty" / "chatSessions"
    _write_snapshot(ws / "empty.jsonl", session_id="empty-sid", requests=[])
    ingester = VSCodeChatLogsIngester(tmp_path / "workspaceStorage", our_db)
    assert ingester.poll() == 0


def test_cursor_is_saved_in_local_json(tmp_path, our_db):
    log_dir = _build_log_tree(tmp_path)
    state = StateFile(tmp_path / "vscode_messages.json")
    ingester = VSCodeChatLogsIngester(log_dir, our_db, checkpoint=state)
    assert ingester.poll() > 0
    assert state.read()["data"]["cursor"]
    # A new ingester reads the cursor back and reads no file twice.
    again = VSCodeChatLogsIngester(log_dir, our_db, checkpoint=state)
    assert again._files
    assert {k: v.resume_point() for k, v in again._files.items()} == {
        k: v.resume_point() for k, v in ingester._files.items()
    }
    assert again.poll() == 0


def test_cursor_for_another_source_is_not_loaded(tmp_path, our_db):
    log_dir = _build_log_tree(tmp_path)
    state = StateFile(tmp_path / "vscode_messages.json")
    ingester = VSCodeChatLogsIngester(log_dir, our_db, checkpoint=state)
    assert ingester.poll() > 0
    again = VSCodeChatLogsIngester(tmp_path / "other", our_db, checkpoint=state)
    assert not again._files
