"""Store handoffs are batched.

These tests keep the number of calls per batch independent of the number of rows.
"""

from __future__ import annotations

from collections import Counter

from aictl.file_inventory import FileInventory
from aictl.orchestrator import SnapshotPersistence
from aictl.records import AgentRow, RequestRow, SessionRow
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from aictl.stores.testing import MemoryWriter


def inventory_batch(tmp_path, count, tag, *, size=20):
    rows = []
    for i in range(count):
        path = tmp_path / f"{tag}{i}.md"
        path.write_text(str(i) * size, encoding="utf-8")
        rows.append(dict(path=str(path), tool="claude-code", category="rules", scope="project",
                         mtime=100.0 + i, size_bytes=path.stat().st_size, tokens=i, meta="{}"))
    return rows


def test_file_inventory_batches_changes_and_does_not_republish_an_unchanged_scan(tmp_path):
    writer = MemoryWriter()
    inventory = FileInventory(writer, StateFile(tmp_path / "inventory.json"), keeps_text=lambda: True, sensitive=lambda _: False)
    few = inventory_batch(tmp_path, 5, "a")
    many = inventory_batch(tmp_path, 50, "b")
    assert inventory.sync(few)["added"] == 5
    expected = writer_calls(writer)
    assert expected == {"files": 1, "file_history": 1, "file_blobs": 1}
    writer.operations.clear()
    assert inventory.sync(few + many)["added"] == 50
    assert writer_calls(writer) == expected
    writer.operations.clear()
    assert inventory.sync(few + many)["unchanged"] == 55
    assert not writer.operations
    assert inventory.sync(few)["removed"] == 50
    assert writer_calls(writer) == {"files": 1}
    assert writer.operations[0][0] == "delete"


def test_file_inventory_keeps_last_listing_and_withholds_large_content(tmp_path):
    writer = MemoryWriter()
    inventory = FileInventory(writer, StateFile(tmp_path / "inventory.json"), keeps_text=lambda: True,
                              sensitive=lambda _: False, max_bytes=100)
    row, = inventory_batch(tmp_path, 1, "large", size=200)
    result = inventory.sync([row, row | {"mtime": 123.0}])
    assert result["added"] == 1
    [(history_operation, history_table, [version]), (operation, table, [stored])] = writer.operations
    assert (operation, table, stored["mtime"], stored["blob_hash"]) == ("upsert", "files", 123.0, "")
    # The withheld content still leaves a version row: its size, without a hash.
    assert (history_operation, history_table, version["size_bytes"], version["blob_hash"]) == ("append", "file_history", 200, "")


def test_session_and_request_facts_are_batched():
    writer = MemoryWriter()
    facts = SessionFacts(writer)
    sessions = [SessionRow(session_id=f"s{i}", tool="claude-code", started_at=5.0 + i) for i in range(30)]
    agents = [AgentRow(agent_id=f"a{i}", session_id=f"s{i}", tool="claude-code", started_at=5.0) for i in range(30)]
    facts.sessions((session, 0, False) for session in sessions)
    facts.agents(agents)
    facts.links((f"s{i}", 1000 + i, "claude-code", 5.0, "lead", "") for i in range(30))
    facts.requests(RequestRow(ts=10.0 + i, session_id=f"s{i}", dedup_key=f"r{i}", model="m") for i in range(500))
    assert writer_calls(writer) == {"sessions": 1, "agents": 1, "session_processes": 1, "requests": 1}
    assert written_rows(writer) == {"sessions": 30, "agents": 30, "session_processes": 30, "requests": 500}


def writer_calls(writer):
    return Counter(table for _, table, _ in writer.operations)


def written_rows(writer):
    counts = Counter()
    for _, table, batch in writer.operations:
        counts[table] += len(batch)
    return counts


def test_persisting_session_starts_costs_the_same_for_two_and_for_forty():
    def starts(n: int, tag: str) -> list[dict]:
        return [
            {"kind": "session_start", "tool": "claude-code", "ts": 50.0 + i, "detail": {"session_id": f"{tag}{i}", "pid": 100 + i}}
            for i in range(n)
        ]

    writer = MemoryWriter()
    persistence = SnapshotPersistence(None, writer)
    persistence._persist_session_events(starts(2, "a"), 1.0)
    few = writer_calls(writer)
    assert written_rows(writer) == {"sessions": 2, "session_processes": 2}
    writer.operations.clear()
    persistence._persist_session_events(starts(40, "b"), 1.0)
    assert written_rows(writer) == {"sessions": 40, "session_processes": 40}
    assert writer_calls(writer) == few


def test_a_session_that_starts_and_ends_in_one_batch_is_stored_ended():
    events = [
        {"kind": "session_start", "tool": "claude-code", "ts": 50.0, "detail": {"session_id": "s1", "pid": 7}},
        {"kind": "session_end", "tool": "claude-code", "ts": 90.0, "detail": {"session_id": "s1"}},
        {"kind": "session_start", "tool": "claude-code", "ts": 95.0, "detail": {"session_id": "s2", "pid": 8}},
    ]
    writer = MemoryWriter()
    SnapshotPersistence(None, writer)._persist_session_events(events, 1.0)
    rows = {r["session_id"]: (r["started_at"], r["ended_at"])
            for _, table, batch in writer.operations if table == "sessions" for r in batch}
    assert rows == {"s1": (50.0, 90.0), "s2": (95.0, None)}
