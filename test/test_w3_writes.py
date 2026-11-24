"""Verify W3 handoff and flush without a Kusto query or command."""

import gzip
import json
import sqlite3
import sys
import time

import pytest

from aictl.collection_status import CollectionStatus, DatapointCatalog
from aictl.ingesters.copilot_session_store import CopilotSessionStoreIngester
from aictl.ingesters.cursor_conversations import CursorConversationsIngester
from aictl.ingesters.message_facts import MessageFacts
from aictl.ingesters.vscode_chat_logs import VSCodeChatLogsIngester
from aictl.kusto import KustoSettings
from aictl.records import CallFacts, EventRow, HookCallRow, SessionRow, SessionStepRow
from aictl.session_evidence import SessionEvidence
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile, TextWatermark
from aictl.stores.kusto import maintenance
from aictl.stores.kusto.recorded import RecordedKustoClient
from aictl.stores.kusto.writer import KustoWriter, epoch_datetime


@pytest.fixture
def history(tmp_path):
    class NoReads(RecordedKustoClient):
        def _execute(self, *args):
            pytest.fail(f"Unexpected Kusto request: {args}")

    recording = tmp_path / "empty.jsonl.gz"
    with gzip.open(recording, "wt"):
        pass
    client = NoReads(recording)
    watermark = TextWatermark(StateFile(tmp_path / "trim.json"))
    writer = KustoWriter(client, node_id="test", trim_before=watermark)
    return writer, client, watermark


def test_catalog_emits_only_changes_and_quality_counters_survive_restart(history, tmp_path):
    writer, client, _ = history
    state = StateFile(tmp_path / "catalog.json")
    catalog = DatapointCatalog(writer, state)
    count = catalog.sync({})
    assert count > 0
    key = next(iter(catalog.rows))
    assert catalog.sync({}) == DatapointCatalog(writer, state).sync() == 0
    assert catalog.sync({key: {"source": "changed"}}) == 1
    assert DatapointCatalog(writer, state).sync() == 0

    state = StateFile(tmp_path / "quality.json")
    quality = CollectionStatus(writer, state)
    now = time.time()
    quality.record_data_quality("file-sync", "ok", ts=now)
    quality.record_data_quality("file-sync", "ok")  # Same status within the refresh interval.
    quality.save()
    CollectionStatus(writer, state).record_data_quality("file-sync", "failed", ts=now + 1)
    writer.flush()
    tables = dict(client.ingestions)
    assert len(tables["datapoint_catalog"]) == count + 1
    assert [(r["count"], r["last_ok_at"]) for r in tables["data_quality_status"]] == [(1, epoch_datetime(now)), (2, epoch_datetime(now))]


def test_external_message_cursors_and_local_attribution(history, tmp_path, monkeypatch):
    writer, client, _ = history
    facts = SessionFacts(writer, keeps_text=lambda: False)
    quality = CollectionStatus(writer)
    now = time.time()
    facts.session(SessionRow("copilot", "copilot-cli", started_at=now))
    facts.session(SessionRow("cursor", "cursor", project_path="demo", started_at=now))
    for kind, ingester, ddl, data, table, sid in [
        ("copilot", CopilotSessionStoreIngester,
         "CREATE TABLE messages(session_id, role, content, created_at)",
         ("copilot", "user", "private", now), "copilot_session_messages", "copilot"),
        ("cursor", CursorConversationsIngester,
         "CREATE TABLE messages(id INTEGER PRIMARY KEY, conversation_id, role, content, created_at);"
         "CREATE TABLE conversations(id, workspace_path, created_at);"
         "INSERT INTO conversations VALUES('conv', 'demo', 0)",
         (1, "conv", "user", "private", now), "cursor_session_messages", "conv"),
    ]:
        path = tmp_path / f"{kind}.db"
        with sqlite3.connect(path) as source:
            source.executescript(ddl)
            source.execute("INSERT INTO messages VALUES(" + ",".join("?" * len(data)) + ")", data)
        source.close()
        state = StateFile(tmp_path / f"{kind}.json")
        assert ingester(path, MessageFacts(facts, quality, state)).poll() == 1
        assert ingester(path, MessageFacts(facts, quality, state)).poll() == 0
        writer.flush()
        [row] = dict(client.ingestions)[table]
        assert (row["session_id"], row["content"]) == (sid, "")
    with monkeypatch.context() as patch:
        patch.setitem(sys.modules, "sqlite3", None)
        cursor = CursorConversationsIngester(path, MessageFacts(facts, quality))
        assert cursor.poll() == 0
        assert cursor.unavailable == "unavailable: Python sqlite3 module missing"


def test_vscode_rewrite_keeps_keys_and_tombstones_removed_rows(history, tmp_path):
    writer, client, _ = history
    facts = SessionFacts(writer, keeps_text=lambda: True)
    target = MessageFacts(facts, CollectionStatus(writer), StateFile(tmp_path / "vscode.json"))
    path = tmp_path / "workspace" / "chatSessions" / "session.jsonl"
    path.parent.mkdir(parents=True)

    def write(*messages):
        snapshot = {"kind": 0, "v": {
            "sessionId": "vscode", "creationDate": time.time() * 1000,
            "requests": [{"message": {"text": message}} for message in messages],
        }}
        path.write_text(json.dumps(snapshot, separators=(",", ":")) + "\n", encoding="utf-8")

    write("first", "removed")
    assert VSCodeChatLogsIngester(tmp_path, target).poll() == 2
    write("new")
    assert VSCodeChatLogsIngester(tmp_path, target).poll() == 1
    assert VSCodeChatLogsIngester(tmp_path, target).poll() == 0
    writer.flush()
    rows = dict(client.ingestions)["vscode_chat_messages"]
    assert [(r["source_row_id"], r["content"], r["_deleted"]) for r in rows] == [
        (0, "first", False), (2, "removed", False), (0, "new", False), (2, None, True)
    ]
    assert rows[0]["rowid"] == rows[2]["rowid"]


def test_artifact_diff_git_and_memory(history, tmp_path, monkeypatch):
    writer, client, watermark = history
    facts = SessionFacts(writer, keeps_text=lambda: True, trim_before=watermark)
    state = StateFile(tmp_path / "artifacts.json")
    now = time.time()
    evidence = SessionEvidence(facts, state)
    files = [("one", "", 4, now), ("two", "", 6, now)]
    assert evidence.replace_session_artifacts("sid", "claude-code", "folder", now, files, 2, 10)
    evidence.save()
    evidence = SessionEvidence(facts, state)
    assert not evidence.replace_session_artifacts("sid", "claude-code", "folder", now, files, 2, 10)
    assert evidence.replace_session_artifacts("sid", "claude-code", "folder", now, files[:1], 1, 4)

    monkeypatch.setattr("aictl.analysis.git_attribution.commits_in_window",
                        lambda *_: [dict(sha="commit", ts=now)])
    evidence.commits("sid", "demo", now - 60, now)
    memory = tmp_path / "MEMORY.md"
    memory.write_text("private", encoding="utf-8")
    monkeypatch.setattr("aictl.memory_snapshot._iter_memory_files", lambda _: [("MEMORY.md", memory)])
    assert evidence.memory("sid", None, "start", now, "demo") == 1
    writer.flush()
    tables = dict(client.ingestions)
    assert [(r["path"], r["_deleted"]) for r in tables["session_artifacts"]] == [
        ("one", False), ("two", False), ("two", True)
    ]
    assert tables["session_commits"][0]["sha"] == "commit"
    # One snapshot, one row: the content is a column of it.
    assert tables["memory_snapshots"][0]["content"] == "private"


def test_admin_watermark_blocks_queued_text_and_replay(history, tmp_path):
    writer, client, watermark = history
    facts = SessionFacts(writer, keeps_text=lambda: True, trim_before=watermark)
    now = time.time()

    def send(key, ts):
        facts.events([EventRow(ts, "tool", "hook:stop", {"prompt": "private"})], source="hook", source_key=key)
        facts.hook(HookCallRow(key, ts, ts, command="private"))
        facts.write(CallFacts(steps=[SessionStepRow(key, ts, "sid", "message", text="private")]))

    send("queued", now - 2)
    TextWatermark(StateFile(tmp_path / "trim.json")).advance(now)
    send("replayed", now - 1)
    send("new", now + 1)
    writer.flush()
    tables = dict(client.ingestions)
    # The rows stay; only the one written after the watermark keeps its text.
    for table, key, text in [("events", "source_key", "full_detail"), ("hook_calls", "call_id", "command"),
                             ("session_steps", "step_key", "text")]:
        assert [row[key] for row in tables[table] if row.get(text) is not None] == ["new"], table
    assert len(tables["events"]) == len(tables["hook_calls"]) == len(tables["session_steps"]) == 3


def test_admin_trim_is_node_scoped_and_dry_run_keeps_watermark(tmp_path, monkeypatch):
    calls = []

    class Client:
        def execute_mgmt(self, database, text):
            if not text.startswith(".show"):  # the layout check reads; only the trim is recorded
                calls.append((database, text))

    settings = KustoSettings("https://example.invalid", database="test", node_id="this-node")
    monkeypatch.setattr(maintenance.KustoClientFactory, "client", lambda _: Client())
    monkeypatch.setattr(maintenance, "restart_directory", lambda *_: tmp_path)
    state = StateFile(tmp_path / "text_trim.json")
    cutoff = time.time()
    tables = maintenance.trim_text(settings, cutoff, dry_run=True)
    assert state.read() == {}
    assert tables and all(database == "test" and 'node_id == "this-node"' in cmd and "whatif=true" in cmd
                          for database, cmd in calls)
    calls.clear()
    assert maintenance.trim_text(settings, cutoff, dry_run=False) == tables
    assert state.read() == {"before": cutoff}
    assert all(".delete table" in cmd and "whatif" not in cmd for _, cmd in calls)


def test_http_action_facts_hand_off_without_reading_history(history):
    writer, client, _ = history
    facts = SessionFacts(writer)
    now = time.time()
    facts.session(SessionRow("sid", "cursor", started_at=now))
    facts.events([EventRow(now, "aictl", "action", {"session_id": "sid"})], source="action")
    writer.flush()
    tables = dict(client.ingestions)
    assert tables["sessions"][0]["session_id"] == "sid"
    assert tables["events"][0]["kind"] == "action"
