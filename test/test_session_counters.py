"""Session totals survive hook events that carry no counters.

Claude Code's Stop and SessionEnd hooks have no token fields, and the receiver
defaults missing ones to 0. Writing those zeros must not wipe totals recorded by
earlier events.
"""

from __future__ import annotations

import time

import pytest

from aictl.records import SessionRow
from aictl.session_facts import SessionFacts
from aictl.stores.testing import MemoryWriter

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
    facts = SessionFacts(MemoryWriter())
    facts.session(SessionRow(session_id="s1", tool="claude-code", started_at=time.time(), **COUNTERS))
    return facts


def _row(db: SessionFacts) -> dict:
    return db.writer.written("sessions")[-1]


def _update(db: SessionFacts, totals: dict, ended: float | None = None) -> None:
    db.session(SessionRow(session_id="s1", tool="claude-code", started_at=0, ended_at=ended, **totals),
               activity=ended or time.time(), terminal=ended is not None)


def _assert_totals(row: dict, expected: dict) -> None:
    assert {k: row[k] for k in expected} == expected


@pytest.mark.parametrize("update", ["stats", "end"])
def test_zero_counters_do_not_wipe_totals(db: SessionFacts, update: str) -> None:
    _update(db, ZEROS, time.time() if update == "end" else None)
    _assert_totals(_row(db), COUNTERS)


@pytest.mark.parametrize("update", ["stats", "end"])
def test_a_lower_total_does_not_shrink_the_counter(db: SessionFacts, update: str) -> None:
    lower = {k: v / 2 for k, v in COUNTERS.items()}
    _update(db, lower, time.time() if update == "end" else None)
    _assert_totals(_row(db), COUNTERS)


@pytest.mark.parametrize("update", ["stats", "end"])
def test_a_higher_total_is_recorded(db: SessionFacts, update: str) -> None:
    higher = {k: v * 2 for k, v in COUNTERS.items()}
    _update(db, higher, time.time() if update == "end" else None)
    _assert_totals(_row(db), higher)


def test_session_end_still_stamps_ended_at(db: SessionFacts) -> None:
    ended = time.time() + 5
    _update(db, ZEROS, ended)
    assert _row(db)["ended_at"] == pytest.approx(ended)
