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
from core_store_fakes import message_facts, quality, written


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


def test_optional_source_is_not_polled_until_it_appears(tmp_path):
    from types import SimpleNamespace

    from aictl.dashboard.ingester_runner import _poll_loop

    path = tmp_path / "conversations.db"
    handle = IngesterHandle("cursor-conversations", False, path, False)
    polls = []
    ingester = SimpleNamespace(poll=lambda: polls.append(path.exists()) or 0)
    # First iteration: missing. Next: present. Third: removed after use.
    steps = iter([path.touch, path.unlink, None])

    def wait(timeout):
        action = next(steps)
        if action:
            action()
        return action is None

    _poll_loop(ingester, SimpleNamespace(wait=wait), 0.0, handle.name, watch_source=handle)
    assert polls == [True] and handle.enabled and not handle.source_exists


def test_a_backlog_is_read_poll_after_poll_and_a_failed_poll_waits_the_interval():
    from types import SimpleNamespace

    from aictl.dashboard import ingester_runner
    from aictl.dashboard.ingester_runner import _poll_loop

    # Polls: backlog left, backlog left, failure with backlog left, backlog read.
    pending = iter([True, True, False])
    outcomes = iter([5, 5, RuntimeError("store refused"), 5])

    def poll():
        outcome = next(outcomes)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    ingester = SimpleNamespace(poll=poll, backlog_pending=lambda: next(pending))
    waits = []

    def wait(timeout):
        waits.append(timeout)
        return len(waits) == 4

    _poll_loop(ingester, SimpleNamespace(wait=wait), 60.0, "transcript-usage")
    pause = ingester_runner.BACKLOG_PAUSE_S
    assert pause <= 1.0
    assert waits == [pause, pause, 60.0, 60.0]


def test_the_transcript_reader_asks_for_the_next_poll_only_while_files_wait_and_the_store_takes_rows(tmp_path):
    from types import SimpleNamespace

    from aictl.ingesters.transcript_usage import TranscriptUsageIngester

    reader = TranscriptUsageIngester.__new__(TranscriptUsageIngester)
    reader._waiting, reader._budget_scale = {}, 1.0
    reader.facts = SimpleNamespace(write_error=None)
    assert not reader.backlog_pending()
    reader._waiting = {tmp_path / "a.jsonl": ("claude-code", 10, 0.0, False)}
    assert reader.backlog_pending()
    reader._budget_scale = 0.5
    assert not reader.backlog_pending()
    reader._budget_scale = 1.0
    reader.facts.write_error = RuntimeError("refused")
    assert not reader.backlog_pending()


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


def _quality_status(facts, component: str) -> str | None:
    rows = quality(facts, component)
    return rows[0]["status"] if rows else None


def test_vscode_ingester_retries_broken_file_and_records_quality(tmp_path):
    db = message_facts(tmp_path)
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
    assert written(db.writer, "vscode_chat_messages")

    # A data-quality event marks the poll as having parse failures.
    assert _quality_status(db, "ingester:vscode-chat-logs") == "parse_failed"

    # Repairing the file lets the retry succeed — proof it was never stuck.
    _write_valid_session(broken, "vs-recovered-2")
    ingester._ingest_file = orig
    ingester.poll()
    assert str(broken) in ingester.last_cursor
    assert _quality_status(db, "ingester:vscode-chat-logs") == "ok"



def test_a_failed_health_write_does_not_stop_the_ingester(caplog):
    from aictl.ingesters._common import record_quality
    from aictl.stores.base import StoreError

    class RefusedStore:
        def record_data_quality(self, *_a, **_k):
            raise StoreError("write refused")

    record_quality(RefusedStore(), "copilot-session-store", "x.db", "not_applicable")
    assert "Cannot record health of copilot-session-store: write refused" in caplog.text
