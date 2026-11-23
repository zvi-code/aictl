import gzip
import time
from dataclasses import replace
from pathlib import Path

import pytest

from aictl.dashboard.models import DashboardSnapshot, DashboardTool
from aictl.file_inventory import FileInventory, inventory_row
from aictl.ingesters.call_facts import FactBuffer
from aictl.orchestrator import FILE_SYNC_INTERVAL, SnapshotPersistence
from aictl.records import ToolInvocationRow, _is_sensitive_path
from aictl.sink import SampleSink
from aictl.state_file import StateFile
from aictl.stores import Store
from aictl.stores.kusto.recorded import RecordedKustoClient
from aictl.stores.kusto.writer import KustoWriter
from aictl.stores.testing import MemoryWriter
from aictl.tool_calls import ToolCalls, call_key, write_size_fills
from aictl.tools import ResourceFile


def test_tool_calls_ingest_without_queries(tmp_path, monkeypatch):
    with gzip.open(tmp_path / "empty.jsonl.gz", "wb"):
        pass
    client = RecordedKustoClient(tmp_path / "empty.jsonl.gz")

    def forbidden(*args, **kwargs):
        pytest.fail("A tool call write attempted to query Kusto")

    for method in ("execute", "execute_query", "execute_mgmt"):
        monkeypatch.setattr(client, method, forbidden)
    writer = KustoWriter(client, node_id="host")
    calls = ToolCalls(writer, keeps_text=lambda: True)
    hook = ToolInvocationRow(ts=10, tool="claude-code", session_id="s", tool_name="Bash",
                             source="hook", source_event_id="call", input={"command": "ls"})
    assert calls.hook(hook, start=True) == {"command": "ls"}
    calls.hook(replace(hook, ts=11, input={}, result_summary="failure", is_error=1), start=False)
    otel = replace(hook, source_event_id="span", source="otel")
    calls.record([otel, otel, replace(otel, ts=15, source_event_id="later")])
    transcript = replace(hook, ts=12, source="", project_path="repo", input={}, confirm="pending",
                         dedup_key=call_key("claude-tool", "call"), input_bytes=17)
    buffer = FactBuffer(None, tool_calls=calls)
    buffer.add_tool(transcript)
    buffer.flush()
    calls.expire(13)
    write_size_fills(writer, [replace(transcript, output_bytes=7)])
    writer.flush()

    sent = {table: rows for table, rows in client.ingestions}
    facts = sent["tool_invocations"]
    current = {(r["project"], r["dedup_key"]): r for r in facts}
    live = [r for r in current.values() if not r["_deleted"]]
    assert {row["source_event_id"] for row in live} == {"call", "later"}
    row = current["repo", transcript.dedup_key]
    assert (row["source"], row["duration_ms"], row["is_error"], row["confirm"]) == ("transcript", 1000, 1, "")
    assert [r for r in sent["tool_invocations_text"] if r["project"] == "repo"][-1]["result_summary"] == "failure"
    assert sent["tool_invocation_sizes"][0]["output_bytes"] == 7
    assert sent["tool_invocation_coverage"][0]["covered_through"] == 12


def test_file_inventory_changes_removals_and_restart(tmp_path):
    writer = MemoryWriter()
    state = StateFile(tmp_path / "manifest.json")

    def persistence():
        return SnapshotPersistence(None, writer,
                                   FileInventory(writer, state, keeps_text=lambda: True, sensitive=_is_sensitive_path))

    def snapshot(*paths):
        return DashboardSnapshot(timestamp=time.time(), root=str(tmp_path), tools=[
            DashboardTool(tool="claude-code", label="Claude Code", files=[
                ResourceFile(path=str(p), kind="config", size=p.stat().st_size, tokens=1, mtime=p.stat().st_mtime)
                for p in paths
            ]),
        ])

    first, secret = tmp_path / "notes.md", tmp_path / ".env"
    first.write_text("first", encoding="utf-8")
    secret.write_text("never stored", encoding="utf-8")
    p = persistence()
    p._sync_files(snapshot(first, secret), now=1000)
    blobs = next(rows for _, table, rows in writer.operations if table == "file_blobs")
    assert [row["content"] for row in blobs] == ["first"]
    count = len(writer.operations)
    first.write_text("second", encoding="utf-8")
    p._sync_files(snapshot(first, secret), now=1001)
    assert len(writer.operations) == count  # Throttled even though the file changed.
    p = persistence()
    p._sync_files(snapshot(), now=1000 + FILE_SYNC_INTERVAL)
    assert len(writer.operations) == count  # Incomplete scan is not a removal.
    p._sync_files(snapshot(first), now=1000 + 2 * FILE_SYNC_INTERVAL)
    assert next(item for item in reversed(writer.operations) if item[1] == "files") == (
        "delete", "files", [{"project": "", "path": secret.as_posix()}]
    )
    p = persistence()
    count = len(writer.operations)
    p._sync_files(snapshot(first), now=1000 + 3 * FILE_SYNC_INTERVAL)
    assert all(table == "data_quality_status" for _, table, _ in writer.operations[count:])
    assert state.read()[first.as_posix()]["first_seen"] == 1000


def test_sample_refresh_and_batch_flood_limit(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr("aictl.sink.time.time", lambda: clock[0])
    writer = MemoryWriter()
    sink = SampleSink(history_store=Store(writer=writer))
    for ts in (1000.0, 1299.0, 1300.0):
        clock[0] = ts
        sink.emit_if_changed("process.cpu", 1.0, {"pid": 42}, ts, gauge=True)
    assert [rows[0]["ts"] for _, _, rows in writer.operations] == [1000.0, 1300.0]
    sink._flood_max = 1
    clock[0] = 1400.0
    sink.emit_batch([("system.one", 2.0, {}), ("system.two", 3.0, {})])
    assert [row["metric"] for row in writer.operations[-1][2]] == ["system.one"]
    assert sink.stats()["total_dropped"] == 1


def test_inventory_read_budget_and_metadata_only_files(tmp_path):
    writer = MemoryWriter()
    state = StateFile(tmp_path / "manifest.json")
    inventory = FileInventory(writer, state, keeps_text=lambda: True, sensitive=_is_sensitive_path,
                              max_reads=1, max_bytes=8)
    rows = []
    for name, content in (("one.md", "one"), ("two.md", "two"), ("large.md", "0123456789"), (".env", "secret")):
        path = tmp_path / name
        path.write_text(content, encoding="utf-8")
        rows.append(inventory_row(ResourceFile(str(path), "config", len(content), 1), "claude-code"))
    assert inventory.sync(rows) == dict(added=3, deferred=1, unchanged=0, updated=0, removed=0)
    assert inventory.sync(rows) == dict(added=1, deferred=0, unchanged=3, updated=0, removed=0)
    written = [row for _, table, batch in writer.operations if table == "file_blobs" for row in batch]
    assert [row["content"] for row in written] == ["one", "two"]
    # Every file has a version row; the two that were read carry their hash, the others only their size.
    versions = [row for _, table, batch in writer.operations if table == "file_history" for row in batch]
    assert sorted((Path(row["path"]).name, bool(row["blob_hash"])) for row in versions) == [
        (".env", False), ("large.md", False), ("one.md", True), ("two.md", True)]
