# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for ``SnapshotPersistence._persist_agent_teams`` — the Claude Code
JSONL backfill path.

Regression focus: ingested session rows must carry the SOURCE
timestamps embedded in the JSONL, not the ingest (snapshot) time.  Stamping
ingest time dated every backfilled row to daemon start, which (a) broke
time-range queries over ``requests.ts`` and (b) made hours-old sessions
collide with the correlator's live PID rows in session dedup (same tool,
started within seconds of daemon start).
"""

from __future__ import annotations

from datetime import datetime

import pytest

from aictl.orchestrator import SnapshotPersistence
from aictl.stores.testing import MemoryWriter


@pytest.fixture()
def writer():
    return MemoryWriter()


def _session_rows(writer, table):
    rows = [row for _, name, batch in writer.operations if name == table for row in batch]
    assert {row["session_id"] for row in rows} == {SESSION_UUID}
    return rows


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


class TestRequests:
    def test_the_team_scan_stores_no_requests(self, writer):
        """The transcript reader stores each model call once, by message id.

        The team scan used to store one request per transcript line under other
        keys, so every reader counted a subagent's calls twice and each start
        wrote them again.
        """
        turns = [_turn(SOURCE_T0 + 10), _turn(SOURCE_T0 + 120), _turn(SOURCE_T0 + 700)]
        p = SnapshotPersistence(None, writer)
        p._persist_agent_teams([_team([_agent(turns=turns)])], SNAPSHOT_TS)

        assert {name for _, name, _ in writer.operations} == {"sessions", "agents"}


class TestSessionStartedAt:
    def test_session_started_at_uses_agent_source_times(self, writer):
        """The upserted session row starts when the earliest agent did —
        not when the daemon ingested the JSONL."""
        agents = [
            _agent("agent-1", started_at="2025-03-26T14:40:00+00:00"),
            _agent("agent-2", started_at="2025-03-26T15:00:00+00:00"),
        ]
        p = SnapshotPersistence(None, writer)
        p._persist_agent_teams([_team(agents)], SNAPSHOT_TS)

        [sess] = _session_rows(writer, "sessions")
        expected = datetime.fromisoformat("2025-03-26T14:40:00+00:00").timestamp()
        assert sess["started_at"] == expected
        assert sess["started_at"] < SNAPSHOT_TS

    def test_session_started_at_falls_back_to_turn_source_ts(self, writer):
        """Agents without a parseable started_at (missing first-line
        timestamp) fall back to the earliest turn timestamp instead of
        the ingest time."""
        agent = _agent(started_at="", turns=[_turn(SOURCE_T0 + 30), _turn(SOURCE_T0 + 300)])
        p = SnapshotPersistence(None, writer)
        p._persist_agent_teams([_team([agent])], SNAPSHOT_TS)

        [sess] = _session_rows(writer, "sessions")
        assert sess["started_at"] == SOURCE_T0 + 30

    def test_session_started_at_ingest_time_only_as_last_resort(self, writer):
        """No source timestamps anywhere → snapshot_ts is the only choice."""
        agent = _agent(started_at="", turns=[])
        p = SnapshotPersistence(None, writer)
        p._persist_agent_teams([_team([agent])], SNAPSHOT_TS)

        [sess] = _session_rows(writer, "sessions")
        assert sess["started_at"] == SNAPSHOT_TS


class TestProjectFolder:
    """Each session file records the folder its agent ran in; the session keeps it."""

    def test_the_session_takes_the_main_agent_folder(self, writer):
        main = {**_agent(turns=[_turn(SOURCE_T0 + 10)]), "cwd": "/work/repo"}
        side = {**_agent(agent_id="agent-2", turns=[_turn(SOURCE_T0 + 20)]), "cwd": "/work/repo/sub", "is_sidechain": True}
        p = SnapshotPersistence(None, writer)
        p._persist_agent_teams([_team([side, main])], SNAPSHOT_TS)

        [session] = _session_rows(writer, "sessions")
        assert session["project_path"] == session["project"] == "/work/repo"
