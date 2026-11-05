"""Guards for bounded, disposable storage: retention, WAL, capture modes, budget."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl.commands.admin import db as db_cli
from aictl.storage import (
    CAPTURE_METADATA,
    CAPTURE_OFF,
    COMPACT_CHUNK_ROWS,
    MEMORY_BUDGET_BYTES,
    WAL_SIZE_LIMIT_BYTES,
    EventRow,
    HistoryDB,
    RequestRow,
    strip_event_text,
)

DAY = 86400.0


def _db(path: Path, **kw) -> HistoryDB:
    kw.setdefault("flush_interval", 0)
    return HistoryDB(db_path=path, **kw)


def _old_event(db: HistoryDB, age_days: float, n: int = 1, detail: dict | None = None) -> None:
    conn = db._conn()
    ts = time.time() - age_days * DAY
    conn.executemany(
        "INSERT INTO events(ts, tool, kind, seq, detail) VALUES(?,?,?,?,?)",
        [(ts + i * 0.001, "claude-code", "k", i, json.dumps(detail or {})) for i in range(n)],
    )
    conn.commit()


def _count(db: HistoryDB, table: str) -> int:
    return db._conn().execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


# ── WAL and retention ──────────────────────────────────────────────


def test_connection_bounds_the_wal(tmp_path):
    db = _db(tmp_path / "h.db")
    conn = db._conn()
    assert conn.execute("PRAGMA journal_size_limit").fetchone()[0] == WAL_SIZE_LIMIT_BYTES
    assert conn.execute("PRAGMA wal_autocheckpoint").fetchone()[0] == 1000
    db.close()


def test_new_db_uses_incremental_vacuum(tmp_path):
    db = _db(tmp_path / "h.db")
    assert db._conn().execute("PRAGMA auto_vacuum").fetchone()[0] == 2
    db.close()


def test_compact_honors_configured_retention(tmp_path):
    """retention_days was ignored: compact() had 30 days hardcoded."""
    db = _db(tmp_path / "h.db", retention_days=5)
    _old_event(db, 10)
    _old_event(db, 2)
    db.compact()
    assert _count(db, "events") == 1
    db.close()


def test_compact_deletes_in_chunks_more_rows_than_one_chunk(tmp_path):
    db = _db(tmp_path / "h.db")
    _old_event(db, 40, n=COMPACT_CHUNK_ROWS + 10)
    assert db.compact()["events_deleted_30d"] == COMPACT_CHUNK_ROWS + 10
    db.close()


def test_repeated_compact_does_not_rewrite_downsampled_rows(tmp_path):
    """Rewriting already downsampled ranges every pass caused the WAL churn."""
    db = _db(tmp_path / "h.db")
    conn = db._conn()
    ts = int(time.time() - 3 * DAY)
    conn.executemany("INSERT INTO system_snapshots(ts, cpu_percent) VALUES(?,?)", [(ts + i, 1.0) for i in range(0, 600)])
    conn.commit()
    db.compact()
    before = conn.total_changes
    first_rows = _count(db, "system_snapshots")
    db.compact()
    assert _count(db, "system_snapshots") == first_rows
    assert conn.total_changes - before == 0
    db.close()


def test_auto_maintain_keeps_old_history_during_grace_period(tmp_path):
    """After months of downtime the daemon must not erase history on start."""
    db = _db(tmp_path / "h.db", retention_days=30)
    _old_event(db, 120)
    db.auto_maintain()
    assert _count(db, "events") == 1
    # The explicit command still removes it.
    db.compact()
    assert _count(db, "events") == 0
    db.close()


def test_auto_maintain_deletes_after_grace_period(tmp_path):
    db = _db(tmp_path / "h.db", retention_days=30)
    _old_event(db, 120)
    db._set_state("retention_armed_at", time.time() - 31 * DAY)
    db.auto_maintain()
    assert _count(db, "events") == 0
    db.close()


def test_heartbeat_events_are_rate_limited_and_others_are_not(tmp_path):
    db = _db(tmp_path / "h.db")
    now = time.time()
    db.append_events([EventRow(ts=now + i, tool="w", kind="otel:health", detail={}) for i in range(30)])
    db.append_events([EventRow(ts=now + i, tool="w", kind="file_modified", detail={}) for i in range(30)])
    db.flush()
    conn = db._conn()
    assert conn.execute("SELECT COUNT(*) FROM events WHERE kind='otel:health'").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM events WHERE kind='file_modified'").fetchone()[0] == 30
    db.close()


# ── Capture modes ──────────────────────────────────────────────────


def test_strip_event_text_keeps_numbers_and_names():
    out = strip_event_text({"prompt": "secret", "input_tokens": 7, "tool_name": "Bash", "nested": {"text": "x"}})
    assert out == {"prompt_chars": 6, "input_tokens": 7, "tool_name": "Bash", "nested": {"text_chars": 1}}


def _write_text_everywhere(db: HistoryDB) -> None:
    conn = db._conn()
    conn.execute(
        "INSERT INTO cursor_session_messages(session_id, source_row_id, role, content, ts) VALUES('s',1,'user','HELLO',?)",
        (time.time(),),
    )
    conn.execute(
        "INSERT INTO tool_invocations(ts, session_id, tool_name, input, result_summary) VALUES(?,'s','Bash','{\"c\":1}','R')",
        (time.time(),),
    )
    conn.commit()
    db.append_event(EventRow(ts=time.time(), tool="t", kind="otel:user_prompt", detail={"prompt": "HELLO", "n": 1}))
    db.flush()


@pytest.mark.parametrize("mode", [CAPTURE_METADATA, CAPTURE_OFF])
def test_no_text_is_stored_without_full_capture(tmp_path, mode):
    db = _db(tmp_path / "h.db", capture=mode)
    _write_text_everywhere(db)
    conn = db._conn()
    assert conn.execute("SELECT content FROM cursor_session_messages").fetchone()[0] == ""
    assert conn.execute("SELECT input, result_summary, tool_name FROM tool_invocations").fetchone() == ("{}", "", "Bash")
    detail = json.loads(conn.execute("SELECT detail FROM events").fetchone()[0])
    assert "prompt" not in detail
    assert detail["n"] == 1
    assert db.content_retained({"started_at": time.time()}) is False
    db.close()


def test_full_capture_keeps_text_and_reports_it(tmp_path):
    db = _db(tmp_path / "h.db")
    _write_text_everywhere(db)
    assert db._conn().execute("SELECT content FROM cursor_session_messages").fetchone()[0] == "HELLO"
    assert db.content_retained({"started_at": time.time()}) is True
    db.close()


def test_metadata_mode_keeps_token_and_cost_totals(tmp_path):
    db = _db(tmp_path / "h.db", capture=CAPTURE_METADATA)
    db.append_request(RequestRow(ts=time.time(), session_id="s", tool="t", input_tokens=11, output_tokens=7, cost_usd=0.5))
    db.flush()
    row = db._conn().execute("SELECT input_tokens, output_tokens, cost_usd FROM requests").fetchone()
    assert row == (11, 7, 0.5)
    db.close()


def test_off_mode_writes_no_file_and_works_across_threads(tmp_path):
    path = tmp_path / "sub" / "h.db"
    db = _db(path, capture=CAPTURE_OFF)
    errors: list[Exception] = []

    def work() -> None:
        try:
            for i in range(50):
                db.append_event(EventRow(ts=time.time() + i, tool="t", kind="k", detail={}))
                db.flush()
                _count(db, "events")
        except Exception as exc:  # noqa: BLE001 - reported through the assert below
            errors.append(exc)

    threads = [threading.Thread(target=work) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []
    assert _count(db, "events") > 0
    db.close()
    assert not path.parent.exists() or list(path.parent.iterdir()) == []


def test_storage_status_has_the_ui_contract_fields(tmp_path):
    db = _db(tmp_path / "h.db")
    status = db.storage_status()
    assert {"capture_mode", "storage_bytes", "storage_budget_bytes", "storage_degraded"} <= status.keys()
    assert status["capture_mode"] == "full"
    assert status["storage_budget_bytes"] == 1024 * 1024 * 1024
    assert status["storage_degraded"] is False
    db.close()


def test_off_mode_status_reports_memory_budget(tmp_path):
    db = _db(tmp_path / "h.db", capture=CAPTURE_OFF)
    status = db.storage_status()
    assert status["capture_mode"] == "off"
    assert status["storage_budget_bytes"] == MEMORY_BUDGET_BYTES
    assert status["storage_degraded"] is False
    assert status["storage_bytes"] > 0
    db.close()


def test_trim_text_blanks_text_keeps_metadata_rows(tmp_path):
    db = _db(tmp_path / "h.db")
    _write_text_everywhere(db)
    db.append_request(RequestRow(ts=time.time(), session_id="s", tool="t", input_tokens=11))
    db.flush()
    assert db.trim_text(before=time.time() + 1) >= 3
    conn = db._conn()
    assert conn.execute("SELECT content, role FROM cursor_session_messages").fetchone() == ("", "user")
    assert "prompt" not in json.loads(conn.execute("SELECT detail FROM events").fetchone()[0])
    assert conn.execute("SELECT input_tokens FROM requests").fetchone()[0] == 11
    assert db.content_retained({"started_at": time.time() - DAY}) is False
    db.close()


def test_full_mode_age_limit_trims_only_old_text(tmp_path):
    db = _db(tmp_path / "h.db", content_retention_days=7)
    db._set_state("retention_armed_at", time.time() - 90 * DAY)
    conn = db._conn()
    for rid, age in ((1, 10), (2, 1)):
        conn.execute(
            "INSERT INTO cursor_session_messages(session_id, source_row_id, role, content, ts) VALUES('s',?,'u','T',?)",
            (rid, time.time() - age * DAY),
        )
    conn.commit()
    db.auto_maintain()
    rows = dict(conn.execute("SELECT source_row_id, content FROM cursor_session_messages").fetchall())
    assert rows == {1: "", 2: "T"}
    db.close()


# ── Disk budget ────────────────────────────────────────────────────


def test_budget_evicts_text_before_rows_and_keeps_totals(tmp_path):
    db = _db(tmp_path / "h.db")
    db._truncate_wal()
    budget = db._budget_used() + 2 * 1024 * 1024
    db._budget_bytes = budget
    conn = db._conn()
    big = "x" * 4000
    now = time.time()
    conn.executemany(
        "INSERT INTO cursor_session_messages(session_id, source_row_id, role, content, ts) VALUES('s',?,'u',?,?)",
        [(i, big, now - 1000 + i) for i in range(1500)],
    )
    conn.execute("INSERT INTO sessions(session_id, input_tokens) VALUES('s', 99)")
    conn.execute("INSERT INTO requests(ts, session_id, input_tokens) VALUES(?, 's', 99)", (now,))
    _old_event(db, 1, n=50)
    conn.commit()
    assert db.enforce_budget() > 0
    assert db._budget_used() <= budget
    # Conversation text went first; events and every total stayed.
    assert conn.execute("SELECT COUNT(*) FROM cursor_session_messages WHERE content != ''").fetchone()[0] == 0
    assert _count(db, "events") == 50
    assert conn.execute("SELECT input_tokens FROM sessions").fetchone()[0] == 99
    assert conn.execute("SELECT input_tokens FROM requests").fetchone()[0] == 99
    db.close()


def test_budget_never_evicts_unlisted_tables(tmp_path):
    """Context inventories live in their own tables and must survive eviction."""
    db = _db(tmp_path / "h.db")
    db._truncate_wal()
    db._budget_bytes = db._budget_used() + 512 * 1024
    conn = db._conn()
    conn.execute("CREATE TABLE context_sources(path TEXT, hash TEXT)")
    conn.execute("INSERT INTO context_sources VALUES('a','b')")
    _old_event(db, 1, n=20000, detail={"pad": "y" * 100})
    conn.commit()
    db.enforce_budget()
    assert _count(db, "context_sources") == 1
    assert _count(db, "events") < 20000
    db.close()


def test_memory_store_hits_ceiling_then_recovers(tmp_path):
    db = _db(tmp_path / "h.db", capture=CAPTURE_OFF)
    conn = db._conn()
    conn.execute(f"PRAGMA max_page_count={8 * 1024 * 1024 // 4096}")
    db._budget_bytes = 4 * 1024 * 1024
    with pytest.raises(sqlite3.Error, match="full"):
        for i in range(5000):
            conn.execute(
                "INSERT INTO events(ts, tool, kind, seq, detail) VALUES(?,?,?,?,?)",
                (time.time(), "t", "k", i, "z" * 4000),
            )
    conn.rollback()
    conn.execute(
        "INSERT INTO events(ts, tool, kind, seq, detail) SELECT ts+1,tool,kind,seq,detail FROM events LIMIT 0"
    )
    db.enforce_budget()
    assert db._budget_used() <= db._budget_bytes
    db.close()


# ── Degraded fallback ──────────────────────────────────────────────


def test_corrupt_db_falls_back_to_memory_and_reports(tmp_path):
    path = tmp_path / "h.db"
    path.write_bytes(b"this is not a sqlite file" * 400)
    db = _db(path, memory_fallback=True)
    assert db.in_memory
    status = db.storage_status()
    assert status["storage_degraded"] is True
    assert "h.db" in status["storage_degraded_reason"]
    db.append_event(EventRow(ts=time.time(), tool="t", kind="k", detail={}))
    db.flush()
    assert _count(db, "events") == 1
    # The damaged file stays in place, not overwritten.
    assert path.read_bytes().startswith(b"this is not")
    db.close()


def test_cli_style_open_of_corrupt_db_raises(tmp_path):
    """Without memory_fallback a broken DB is an error, not an empty store."""
    path = tmp_path / "h.db"
    path.write_bytes(b"this is not a sqlite file" * 400)
    with pytest.raises(sqlite3.DatabaseError):
        _db(path)


def test_unwritable_location_falls_back_to_memory(tmp_path):
    blocker = tmp_path / "file"
    blocker.write_text("x")
    db = _db(blocker / "nested" / "h.db", memory_fallback=True)
    assert db.in_memory
    assert db.storage_status()["storage_degraded"] is True
    db.close()


def test_disk_full_during_flush_falls_back_and_keeps_collecting(tmp_path):
    db = _db(tmp_path / "h.db", memory_fallback=True)
    db._note_flush_error(sqlite3.OperationalError("database or disk is full"))
    assert db.in_memory
    assert db.storage_status()["storage_degraded"] is True
    db.append_event(EventRow(ts=time.time(), tool="t", kind="k", detail={}))
    db.flush()
    assert _count(db, "events") == 1
    db.close()


def test_locked_db_falls_back_only_after_repeated_failures(tmp_path):
    db = _db(tmp_path / "h.db", memory_fallback=True)
    db._note_flush_error(sqlite3.OperationalError("database is locked"))
    assert not db.in_memory
    for _ in range(6):
        db._note_flush_error(sqlite3.OperationalError("database is locked"))
    assert db.in_memory
    db.close()


def test_held_files_and_failed_checkpoints_are_not_fatal(tmp_path, monkeypatch):
    """A file held open elsewhere fails unlink and checkpoint; both retry later."""
    logs = tmp_path / "logs"
    logs.mkdir()
    (logs / "samples.log.1").write_text("x")
    db = _db(tmp_path / "h.db", log_paths=(logs,), max_total_mb=0)

    def denied(*_a, **_k):
        raise PermissionError("in use by another process")

    monkeypatch.setattr(Path, "unlink", denied)
    db._drop_rotated_logs()
    assert (logs / "samples.log.1").exists()

    class Busy:
        def execute(self, sql, *_a):
            raise sqlite3.OperationalError("database is locked")

    monkeypatch.setattr(db, "_conn", lambda: Busy())
    db._truncate_wal()
    monkeypatch.undo()
    db.close()


# ── Commands ───────────────────────────────────────────────────────


def test_compact_dry_run_changes_nothing_and_estimates(tmp_path):
    path = tmp_path / "h.db"
    db = _db(path)
    _old_event(db, 40, n=500, detail={"pad": "y" * 200})
    db.close()
    result = CliRunner().invoke(db_cli, ["--db", str(path), "compact", "--dry-run"])
    assert result.exit_code == 0, result.output
    assert "Expected size after compact" in result.output
    assert "events: 500 of 500" in result.output
    check = _db(path)
    assert _count(check, "events") == 500
    check.close()


def test_compact_command_removes_old_history_and_converts_db(tmp_path):
    path = tmp_path / "h.db"
    db = _db(path)
    _old_event(db, 40, n=500)
    db.close()
    result = CliRunner().invoke(db_cli, ["--db", str(path), "compact"])
    assert result.exit_code == 0, result.output
    check = _db(path)
    assert _count(check, "events") == 0
    assert check._conn().execute("PRAGMA auto_vacuum").fetchone()[0] == 2
    check.close()


def test_trim_text_command(tmp_path):
    path = tmp_path / "h.db"
    db = _db(path)
    _write_text_everywhere(db)
    db.close()
    runner = CliRunner()
    dry = runner.invoke(db_cli, ["--db", str(path), "trim-text", "--dry-run"])
    assert dry.exit_code == 0, dry.output
    assert "cursor_session_messages.content" in dry.output
    check = _db(path)
    assert check._conn().execute("SELECT content FROM cursor_session_messages").fetchone()[0] == "HELLO"
    check.close()
    assert runner.invoke(db_cli, ["--db", str(path), "trim-text"]).exit_code == 0
    check = _db(path)
    assert check._conn().execute("SELECT content FROM cursor_session_messages").fetchone()[0] == ""
    check.close()
