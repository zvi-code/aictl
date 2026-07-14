"""Tests for the ingester status endpoint and VS Code ingester retry/quality.

Covers two freshly-wired paths:

* ``GET /api/ingesters`` returns ``ingester_runner.collect_status`` for the
  handles registered on the server (previously computed but uncalled).
* The VS Code chat-logs ingester records data-quality events and no longer
  advances the per-file cursor past a file it failed to parse, so a broken
  file is retried on the next poll instead of being skipped forever.
"""

from __future__ import annotations

import json
import threading
import time
import urllib.request
from pathlib import Path

import pytest

from aictl.dashboard.ingester_runner import IngesterHandle, collect_status
from aictl.ingesters.vscode_chat_logs import VSCodeChatLogsIngester
from aictl.storage import HistoryDB


def _get_json(url):
    with urllib.request.urlopen(url, timeout=5) as resp:
        return json.loads(resp.read())


class _FakeIngester:
    """Minimal stand-in exposing the attrs IngesterHandle.status() reads."""

    def __init__(self, last_poll_ts: float, last_poll_inserted: int) -> None:
        self.last_poll_ts = last_poll_ts
        self.last_poll_inserted = last_poll_inserted


# ── /api/ingesters endpoint ───────────────────────────────────────


@pytest.fixture()
def ingester_server(tmp_path):
    from aictl.dashboard.models import DashboardSnapshot
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore

    db = HistoryDB(db_path=str(tmp_path / "ing.db"), flush_interval=0)
    store = SnapshotStore(db=db)
    store.update(DashboardSnapshot(timestamp=time.time(), root="/tmp", tools=[], sessions=[]))
    srv = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), Path("/tmp"))

    # Inject deterministic fake handles — the real ones depend on whatever
    # tool stores happen to exist on the test machine's disk.
    now = time.time()
    srv.ingesters = {
        "copilot-session-store": IngesterHandle(
            name="copilot-session-store",
            enabled=True,
            source_path=Path("/home/u/.copilot/session-store.db"),
            source_exists=True,
            ingester=_FakeIngester(now - 5, 3),
        ),
        "cursor-conversations": IngesterHandle(
            name="cursor-conversations",
            enabled=False,
            source_path=Path("/home/u/.cursor/conversations.db"),
            source_exists=False,
        ),
    }

    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}"
    srv.shutdown()
    db.close()


def test_ingesters_endpoint_returns_registered_statuses(ingester_server):
    data = _get_json(f"{ingester_server}/api/ingesters")
    assert "ingesters" in data
    by_name = {i["name"]: i for i in data["ingesters"]}
    assert set(by_name) == {"copilot-session-store", "cursor-conversations"}

    cop = by_name["copilot-session-store"]
    assert cop["enabled"] is True
    assert cop["source_exists"] is True
    assert cop["last_poll_inserted"] == 3
    assert cop["last_poll_ts"] > 0

    cur = by_name["cursor-conversations"]
    assert cur["enabled"] is False
    assert cur["source_exists"] is False
    # ingester=None → status() getattr defaults kick in.
    assert cur["last_poll_ts"] == 0.0
    assert cur["last_poll_inserted"] == 0


def test_collect_status_empty():
    assert collect_status(None) == []
    assert collect_status({}) == []


# ── VS Code ingester: quality + retry-on-parse-failure ────────────


def _write_valid_session(path: Path, sid: str) -> None:
    snap = {
        "kind": 0,
        "v": {
            "sessionId": sid,
            "creationDate": int(time.time() * 1000),
            "requests": [
                {
                    "message": {"text": "hello from vscode"},
                    "response": [{"value": "hi back"}],
                }
            ],
        },
    }
    path.write_text(json.dumps(snap) + "\n", encoding="utf-8")


def _quality_status(db: HistoryDB, component: str) -> str | None:
    conn = db._conn()
    row = conn.execute(
        "SELECT status FROM data_quality_status WHERE component = ?",
        (component,),
    ).fetchone()
    return row[0] if row else None


def test_vscode_ingester_retries_broken_file_and_records_quality(tmp_path):
    db = HistoryDB(db_path=str(tmp_path / "vs.db"), flush_interval=0)
    log_dir = tmp_path / "workspaceStorage"
    ws = log_dir / "abc123" / "chatSessions"
    ws.mkdir(parents=True)

    valid = ws / "good.jsonl"
    broken = ws / "broken.jsonl"
    _write_valid_session(valid, "vs-good-1")
    broken.write_text("{ this is not valid json\n", encoding="utf-8")  # corrupt first line

    ingester = VSCodeChatLogsIngester(log_dir, db)

    # Spy on _ingest_file to prove the broken file is re-read on every poll
    # while the valid file is processed once then skipped via the cursor.
    orig = ingester._ingest_file
    calls: list[str] = []

    def spy(path):
        calls.append(str(path))
        return orig(path)

    ingester._ingest_file = spy

    ingester.poll()
    ingester.poll()

    # The valid file: ingested once, then its (mtime, size) cursor skips it.
    assert calls.count(str(valid)) == 1
    assert str(valid) in ingester.last_cursor
    # The broken file: cursor NEVER advanced, so it is retried on both polls.
    assert calls.count(str(broken)) == 2
    assert str(broken) not in ingester.last_cursor

    # The valid conversation's rows landed despite the sibling failure.
    n = db._conn().execute("SELECT COUNT(*) FROM vscode_chat_messages").fetchone()[0]
    assert n >= 1

    # A data-quality event marks the poll as having parse failures.
    assert _quality_status(db, "ingester:vscode-chat-logs") == "parse_failed"

    # Repairing the file lets the retry succeed — proof it was never stuck.
    _write_valid_session(broken, "vs-recovered-2")
    ingester._ingest_file = orig
    ingester.poll()
    assert str(broken) in ingester.last_cursor
    assert _quality_status(db, "ingester:vscode-chat-logs") == "ok"

    db.close()
