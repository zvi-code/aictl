"""A store write costs a fixed number of statements, whatever the number of rows.

On a Kusto store every statement is a request to the cluster. A refresh that ran a
statement per file, per agent or per request took minutes before the daemon
answered; these tests keep each batch writer at a count that does not grow.
"""

from __future__ import annotations

import pytest

from aictl.orchestrator import SnapshotPersistence
from aictl.storage import AgentRow, HistoryDB, RequestRow, SessionRow, ToolInvocationRow


class Counting:
    """A connection that counts the statements sent through it."""

    def __init__(self, conn):
        self._conn, self.statements = conn, 0

    def execute(self, sql, *args):
        self.statements += 1
        return self._conn.execute(sql, *args)

    def executemany(self, sql, rows):
        self.statements += 1
        return self._conn.executemany(sql, rows)

    def __getattr__(self, name):
        return getattr(self._conn, name)


@pytest.fixture
def db(tmp_path):
    d = HistoryDB(db_path=tmp_path / "h.db", flush_interval=3600)
    yield d
    d.close()


def statements(db: HistoryDB, write) -> int:
    """How many statements *write* sends to the store."""
    real = db._conn
    counting = Counting(real())
    db._conn = lambda: counting
    try:
        write()
    finally:
        db._conn = real
    return counting.statements


def files(n: int, tag: str, size: int = 20) -> list[dict]:
    return [
        {"path": f"/repo/{tag}/f{i}.md", "tool": "claude-code", "category": "rules", "mtime": 100.0 + i, "content": f"{tag}{i}" * size}
        for i in range(n)
    ]


def test_a_file_sync_costs_the_same_for_five_files_and_for_fifty(db):
    few = statements(db, lambda: db.sync_files_from_discovery(files(5, "a")))
    many = statements(db, lambda: db.sync_files_from_discovery(files(5, "a") + files(50, "b")))
    assert many == few
    assert db._conn().execute("SELECT COUNT(*) FROM files").fetchone()[0] == 55
    assert db._conn().execute("SELECT COUNT(*) FROM file_history").fetchone()[0] == 55
    # Files no longer listed are removed with one more statement, however many they are.
    assert statements(db, lambda: db.sync_files_from_discovery(files(5, "a"))) == 2
    assert db._conn().execute("SELECT COUNT(*) FROM files").fetchone()[0] == 5


def test_an_unchanged_file_sync_is_one_read(db):
    listed = files(40, "a")
    db.sync_files_from_discovery(listed)
    assert statements(db, lambda: db.sync_files_from_discovery(listed)) == 1


def test_a_file_sync_of_large_and_metadata_only_files_does_not_grow(db):
    def listed(n: int, tag: str) -> list[dict]:
        big = files(n, tag + "big", size=30_000)  # past the blob threshold
        bare = [{"path": f"/repo/{tag}/bare{i}", "tool": "x", "mtime": 5.0 + i} for i in range(n)]
        return big + bare

    few = statements(db, lambda: db.sync_files_from_discovery(listed(2, "a")))
    many = statements(db, lambda: db.sync_files_from_discovery(listed(12, "a")))
    assert many == few
    assert db._conn().execute("SELECT COUNT(*) FROM file_blobs").fetchone()[0] == 12
    # A second listing with new mtimes and no content updates the metadata of every row.
    again = [dict(f, mtime=f["mtime"] + 50, content=None) for f in listed(12, "a")]
    assert statements(db, lambda: db.sync_files_from_discovery(again)) == 2


def test_a_path_listed_twice_keeps_the_second_entry(db):
    first = {"path": "/repo/a.md", "tool": "t", "mtime": 10.0, "content": "one"}
    second = {"path": "/repo/a.md", "tool": "t", "mtime": 20.0, "content": "two"}
    stats = db.sync_files_from_discovery([first, second])
    assert stats["added"] == 1 and stats["updated"] == 1
    entry = db.get_file("/repo/a.md")
    assert (entry.content, entry.mtime) == ("two", 20.0)
    assert db._conn().execute("SELECT COUNT(*) FROM file_history WHERE path = '/repo/a.md'").fetchone()[0] == 2


def buffer_calls(db: HistoryDB, n: int, tag: str) -> None:
    for i in range(n):
        db.append_request(RequestRow(ts=10.0 + i, source_ts=10.0 + i, session_id=f"{tag}{i}", model="m", source="test"))
        db.append_tool_invocation(ToolInvocationRow(ts=10.0 + i, session_id=f"{tag}{i}", tool_name="Read", source="test"))


def test_a_flush_of_requests_and_tool_calls_costs_the_same_for_five_and_for_five_hundred(db):
    buffer_calls(db, 5, "a")
    few = statements(db, db.flush)
    buffer_calls(db, 500, "b")
    many = statements(db, db.flush)
    assert many == few
    assert db._conn().execute("SELECT COUNT(*) FROM requests").fetchone()[0] == 505
    assert db._conn().execute("SELECT COUNT(*) FROM tool_invocations").fetchone()[0] == 505


def test_sessions_agents_links_and_provenance_are_one_statement_each(db):
    sessions = [SessionRow(session_id=f"s{i}", tool="claude-code", started_at=5.0 + i) for i in range(30)]
    agents = [AgentRow(agent_id=f"a{i}", session_id=f"s{i}", tool="claude-code", started_at=5.0) for i in range(30)]
    links = [(f"s{i}", 1000 + i, "claude-code", "lead") for i in range(30)]
    assert statements(db, lambda: db.upsert_sessions(sessions)) == 1
    assert statements(db, lambda: db.upsert_agents(agents)) == 1
    assert statements(db, lambda: db.link_session_processes(links)) == 1
    keys = [r[0] for r in db._conn().execute("SELECT key FROM datapoint_catalog LIMIT 20")]
    assert len(keys) == 20
    assert statements(db, lambda: db.update_datapoint_sources({k: {"from": "test"} for k in keys})) == 1
    changed = db._conn().execute("SELECT COUNT(*) FROM datapoint_catalog WHERE source_dynamic LIKE '%test%'").fetchone()[0]
    assert changed == 20
    for table in ("sessions", "agents", "session_processes"):
        assert db._conn().execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] == 30


def teams(n: int, tag: str) -> list[dict]:
    return [
        {
            "session_id": f"{tag}-team{t}",
            "total_input_tokens": 10,
            "total_output_tokens": 5,
            "agents": [
                {
                    "agent_id": f"{tag}-t{t}-a{a}",
                    "task": "role",
                    "model": "m",
                    "cwd": "/repo",
                    "started_at": "2026-11-01T10:00:00Z",
                    "input_tokens": 3,
                    "turns": [{"source_ts": 1000.0 + a, "model": "m", "input_tokens": 1, "output_tokens": 1}],
                }
                for a in range(4)
            ],
        }
        for t in range(n)
    ]


def test_persisting_agent_teams_costs_the_same_for_one_team_and_for_twenty(db):
    persistence = SnapshotPersistence(db)
    few = statements(db, lambda: persistence._persist_agent_teams(teams(1, "a"), 2000.0))
    many = statements(db, lambda: persistence._persist_agent_teams(teams(20, "b"), 2000.0))
    assert many == few
    assert db._conn().execute("SELECT COUNT(*) FROM agents").fetchone()[0] == 84
    assert db._conn().execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 21


def test_persisting_session_starts_costs_the_same_for_two_and_for_forty(db):
    def starts(n: int, tag: str) -> list[dict]:
        return [
            {"kind": "session_start", "tool": "claude-code", "ts": 50.0 + i, "detail": {"session_id": f"{tag}{i}", "pid": 100 + i}}
            for i in range(n)
        ]

    persistence = SnapshotPersistence(db)
    few = statements(db, lambda: persistence._persist_session_events(starts(2, "a"), 1.0))
    many = statements(db, lambda: persistence._persist_session_events(starts(40, "b"), 1.0))
    assert many == few
    assert db._conn().execute("SELECT COUNT(*) FROM session_processes").fetchone()[0] == 42


def test_a_session_that_starts_and_ends_in_one_batch_is_stored_ended(db):
    events = [
        {"kind": "session_start", "tool": "claude-code", "ts": 50.0, "detail": {"session_id": "s1", "pid": 7}},
        {"kind": "session_end", "tool": "claude-code", "ts": 90.0, "detail": {"session_id": "s1"}},
        {"kind": "session_start", "tool": "claude-code", "ts": 95.0, "detail": {"session_id": "s2", "pid": 8}},
    ]
    SnapshotPersistence(db)._persist_session_events(events, 1.0)
    rows = dict(db._conn().execute("SELECT session_id, ended_at FROM sessions"))
    assert rows == {"s1": 90.0, "s2": None}
