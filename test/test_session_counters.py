"""Session totals survive hook events that carry no counters.

Claude Code's Stop and SessionEnd hooks have no token fields, and the receiver
defaults missing ones to 0. Writing those zeros wiped totals recorded by earlier
events. test_storage only covered a non-zero value on a fresh row, and the e2e
tests that would have caught it were not part of `make test`.
"""

from __future__ import annotations

import time

import pytest

from aictl.storage import HistoryDB, SessionRow

COUNTERS = {
    "input_tokens": 7777,
    "output_tokens": 1234,
    "cache_read_tokens": 500,
    "cache_creation_tokens": 250,
    "cost_usd": 0.025,
}
ZEROS = dict.fromkeys(COUNTERS, 0)


@pytest.fixture()
def db():
    database = HistoryDB(db_path=":memory:", flush_interval=0)
    database.upsert_session(SessionRow(session_id="s1", tool="claude-code", started_at=time.time(), **COUNTERS))
    yield database
    database.close()


def _row(db: HistoryDB) -> dict:
    return next(row for row in db.query_sessions() if row["session_id"] == "s1")


def _assert_totals(row: dict, expected: dict) -> None:
    assert {k: row[k] for k in expected} == expected


@pytest.mark.parametrize("update", ["stats", "end"])
def test_zero_counters_do_not_wipe_totals(db: HistoryDB, update: str) -> None:
    if update == "stats":
        db.update_session_stats("s1", **ZEROS)
    else:
        db.update_session_end("s1", ended_at=time.time(), **ZEROS)
    _assert_totals(_row(db), COUNTERS)


@pytest.mark.parametrize("update", ["stats", "end"])
def test_a_lower_total_does_not_shrink_the_counter(db: HistoryDB, update: str) -> None:
    lower = {k: v / 2 for k, v in COUNTERS.items()}
    if update == "stats":
        db.update_session_stats("s1", **lower)
    else:
        db.update_session_end("s1", ended_at=time.time(), **lower)
    _assert_totals(_row(db), COUNTERS)


@pytest.mark.parametrize("update", ["stats", "end"])
def test_a_higher_total_is_recorded(db: HistoryDB, update: str) -> None:
    higher = {k: v * 2 for k, v in COUNTERS.items()}
    if update == "stats":
        db.update_session_stats("s1", **higher)
    else:
        db.update_session_end("s1", ended_at=time.time(), **higher)
    _assert_totals(_row(db), higher)


def test_session_end_still_stamps_ended_at(db: HistoryDB) -> None:
    ended = time.time() + 5
    db.update_session_end("s1", ended_at=ended, **ZEROS)
    assert _row(db)["ended_at"] == pytest.approx(ended)
