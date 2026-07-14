# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for ``SnapshotPersistence._persist_agent_teams`` — the Claude Code
JSONL backfill path.

Regression focus: ingested request/session rows must carry the SOURCE
timestamps embedded in the JSONL, not the ingest (snapshot) time.  Stamping
ingest time dated every backfilled request to daemon start, which (a) broke
time-range queries over ``requests.ts`` and (b) made hours-old sessions
collide with the correlator's live PID rows in session dedup (same tool,
started within seconds of daemon start).
"""

from __future__ import annotations

import pytest

from aictl.orchestrator import SnapshotPersistence
from aictl.storage import HistoryDB


@pytest.fixture()
def db():
    d = HistoryDB(db_path=":memory:", flush_interval=0)
    yield d
    d.close()


SESSION_UUID = "fb1fced0-59a8-4c9e-b6cf-1e6b1f4d9a01"

# The session ran hours before the daemon (re)started and ingested it.
SOURCE_T0 = 1_743_000_000.0
SNAPSHOT_TS = SOURCE_T0 + 6 * 3600  # ingest time: 6h later


def _team(agents):
    return {
        "session_id": SESSION_UUID,
        "agent_count": len(agents),
        "total_input_tokens": sum(a.get("input_tokens", 0) for a in agents),
        "total_output_tokens": sum(a.get("output_tokens", 0) for a in agents),
        "agents": agents,
    }


def _agent(agent_id="agent-1", started_at="2025-03-26T14:40:00+00:00", turns=()):
    return {
        "agent_id": agent_id,
        "session_id": SESSION_UUID,
        "model": "claude-opus-4-8",
        "task": "do the thing",
        "started_at": started_at,
        "ended_at": "",
        "is_sidechain": False,
        "completed": True,
        "input_tokens": 100,
        "output_tokens": 50,
        "cache_read_tokens": 0,
        "cache_creation_tokens": 0,
        "turns": list(turns),
    }


def _turn(source_ts, in_tok=10, out_tok=5):
    return {
        "source_ts": source_ts,
        "model": "claude-opus-4-8",
        "input_tokens": in_tok,
        "output_tokens": out_tok,
        "cache_read_tokens": 0,
        "cache_creation_tokens": 0,
    }


class TestRequestTimestamps:
    def test_request_ts_is_source_ts_not_ingest_time(self, db):
        """Every backfilled request must be dated by its JSONL timestamp.

        The old code stamped ``ts=snapshot_ts``, so MIN(ts) across a
        session's requests equalled daemon start time even for sessions
        that ran hours earlier.
        """
        turns = [_turn(SOURCE_T0 + 10), _turn(SOURCE_T0 + 120), _turn(SOURCE_T0 + 700)]
        p = SnapshotPersistence(db)
        p._persist_agent_teams([_team([_agent(turns=turns)])], SNAPSHOT_TS)
        db.flush()

        rows = db.query_requests(session_id=SESSION_UUID)
        assert len(rows) == 3
        got_ts = sorted(r["ts"] for r in rows)
        assert got_ts == [SOURCE_T0 + 10, SOURCE_T0 + 120, SOURCE_T0 + 700]
        assert all(r["ts"] < SNAPSHOT_TS for r in rows), "no request may be dated at ingest time"

    def test_request_ts_falls_back_to_ingest_time_without_source_ts(self, db):
        """A turn whose JSONL line had no parseable timestamp keeps the
        (only remaining) ingest time rather than ts=0."""
        p = SnapshotPersistence(db)
        p._persist_agent_teams([_team([_agent(turns=[_turn(0.0)])])], SNAPSHOT_TS)
        db.flush()

        rows = db.query_requests(session_id=SESSION_UUID)
        assert len(rows) == 1
        assert rows[0]["ts"] == SNAPSHOT_TS


class TestSessionStartedAt:
    def test_session_started_at_uses_agent_source_times(self, db):
        """The upserted session row starts when the earliest agent did —
        not when the daemon ingested the JSONL."""
        agents = [
            _agent("agent-1", started_at="2025-03-26T14:40:00+00:00"),
            _agent("agent-2", started_at="2025-03-26T15:00:00+00:00"),
        ]
        p = SnapshotPersistence(db)
        p._persist_agent_teams([_team(agents)], SNAPSHOT_TS)
        db.flush()

        sess = db.get_session(SESSION_UUID)
        assert sess is not None
        # 2025-03-26T14:40:00+00:00 == 1742999. + ... — compare via the
        # same parser the production path uses.
        from aictl.monitoring.tool_telemetry import _parse_iso_ts

        expected = _parse_iso_ts("2025-03-26T14:40:00+00:00")
        assert sess["started_at"] == expected
        assert sess["started_at"] < SNAPSHOT_TS

    def test_session_started_at_falls_back_to_turn_source_ts(self, db):
        """Agents without a parseable started_at (missing first-line
        timestamp) fall back to the earliest turn timestamp instead of
        the ingest time."""
        agent = _agent(started_at="", turns=[_turn(SOURCE_T0 + 30), _turn(SOURCE_T0 + 300)])
        p = SnapshotPersistence(db)
        p._persist_agent_teams([_team([agent])], SNAPSHOT_TS)
        db.flush()

        sess = db.get_session(SESSION_UUID)
        assert sess is not None
        assert sess["started_at"] == SOURCE_T0 + 30

    def test_session_started_at_ingest_time_only_as_last_resort(self, db):
        """No source timestamps anywhere → snapshot_ts is the only choice."""
        agent = _agent(started_at="", turns=[])
        p = SnapshotPersistence(db)
        p._persist_agent_teams([_team([agent])], SNAPSHOT_TS)
        db.flush()

        sess = db.get_session(SESSION_UUID)
        assert sess is not None
        assert sess["started_at"] == SNAPSHOT_TS
