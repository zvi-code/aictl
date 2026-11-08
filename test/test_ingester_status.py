"""Tests for ingester status and VS Code ingester retry/quality.

Covers two paths:

* ``ingester_runner.collect_status`` reports each registered handle (the
  board's machine view reads it).
* The VS Code chat-logs ingester records data-quality events and no longer
  advances the per-file cursor past a file it failed to parse, so a broken
  file is retried on the next poll instead of being skipped forever.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

from aictl.dashboard.ingester_runner import IngesterHandle, collect_status
from aictl.ingesters.vscode_chat_logs import VSCodeChatLogsIngester
from aictl.storage import HistoryDB


class _FakeIngester:
    """Minimal stand-in exposing the attrs IngesterHandle.status() reads."""

    def __init__(self, last_poll_ts: float, last_poll_inserted: int) -> None:
        self.last_poll_ts = last_poll_ts
        self.last_poll_inserted = last_poll_inserted


# ── collect_status ────────────────────────────────────────────────


def _fake_handles():
    # Deterministic fake handles — the real ones depend on whatever
    # tool stores happen to exist on the test machine's disk.
    now = time.time()
    return {
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


def test_collect_status_reports_registered_handles():
    by_name = {i["name"]: i for i in collect_status(_fake_handles())}
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


def test_a_locked_database_does_not_stop_the_ingester(caplog):
    """A health row failed with "database is locked", and that aborted each poll."""
    import sqlite3

    from aictl.ingesters._common import record_quality

    class LockedStore:
        def record_data_quality(self, *_a, **_k):
            raise sqlite3.OperationalError("database is locked")

        def active_writes(self):
            return ["compact (12 s)"]

    record_quality(LockedStore(), "copilot-session-store", "x.db", "not_applicable")
    assert "compact (12 s)" in caplog.text


def test_a_busy_store_skips_the_poll_round_with_one_line_and_no_traceback(caplog):
    import logging
    import sqlite3
    import threading

    from aictl.dashboard.ingester_runner import _poll_loop

    stop = threading.Event()

    class _Locked:
        store = None
        polls = 0

        def poll(self) -> int:
            self.polls += 1
            if self.polls >= 3:
                stop.set()
            raise sqlite3.OperationalError("database is locked")

    ingester = _Locked()
    with caplog.at_level(logging.DEBUG, logger="aictl.dashboard.ingester_runner"):
        _poll_loop(ingester, stop, 0.0, "transcript-usage")
    assert ingester.polls == 3
    lines = [r for r in caplog.records if "store busy" in r.getMessage()]
    assert [r.levelno for r in lines] == [logging.WARNING, logging.DEBUG, logging.DEBUG]
    assert not any(r.exc_info for r in caplog.records)


def test_a_store_busy_for_long_marks_the_ingester_failed_and_warns_again(caplog, monkeypatch):
    import logging
    import sqlite3
    import threading

    from aictl.dashboard import ingester_runner

    clock = iter([0.0, 10.0, 400.0, 410.0])
    monkeypatch.setattr(ingester_runner.time, "monotonic", lambda: next(clock))
    stop = threading.Event()
    failures: list[str] = []

    class _Store:
        def record_data_quality(self, component, status, **_k):
            failures.append(status)

    class _Locked:
        store = _Store()
        polls = 0

        def poll(self) -> int:
            self.polls += 1
            if self.polls >= 4:
                stop.set()
            raise sqlite3.OperationalError("database is locked")

    with caplog.at_level(logging.DEBUG, logger="aictl.dashboard.ingester_runner"):
        ingester_runner._poll_loop(_Locked(), stop, 0.0, "transcript-usage")
    lines = [r for r in caplog.records if "store busy" in r.getMessage()]
    # First skip warns, short ones are quiet, a lock past LOCKED_REPORT_S warns and fails the ingester.
    assert [r.levelno for r in lines] == [logging.WARNING, logging.DEBUG, logging.WARNING, logging.DEBUG]
    assert failures == ["failed"]
