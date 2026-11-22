"""Every session file on disk is found, indexed and read, whatever its age. All files here are synthetic."""

import json
import os
import time
from types import SimpleNamespace

import pytest

import aictl.observe.sessions as index
from aictl import platforms
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.ingesters.vscode_chat_logs import VSCodeChatLogsIngester
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from aictl.stores.kusto.tables import TABLES
from aictl.stores.testing import MemoryWriter

DAY = 86400.0


def old_session(root, name, age_days):
    path = root / "session-state" / name / "events.jsonl"
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({"type": "session.start", "data": {"context": {"cwd": str(root)}}}) + "\n")
    stamp = time.time() - age_days * DAY
    os.utime(path, (stamp, stamp))
    return path


def reader(root, rows, **options):
    return TranscriptUsageIngester(
        SessionFacts(MemoryWriter()), copilot_state=root / "session-state", codex_sessions=root / "codex",
        claude_projects=root / "claude", vscode_workspaces=root / "vscode",
        checkpoint=StateFile(root / "state.json"), source_index=rows.extend, **options,
    )


def latest(rows):
    return {row["session_id"]: row for row in rows}


def test_a_session_older_than_any_window_is_read_and_indexed(tmp_path):
    path = old_session(tmp_path, "ancient", 400)
    rows = []
    reader(tmp_path, rows, backfill_days=0).poll()
    row = latest(rows)["ancient"]
    assert (row["status"], row["bytes_read"], row["size_bytes"]) == ("complete", path.stat().st_size, path.stat().st_size)
    assert (row["tool"], row["source_file"]) == ("copilot-cli", str(path))
    assert set(row) <= {name for name, _ in TABLES["session_sources"].columns}


def test_a_window_leaves_older_files_indexed_but_unread(tmp_path):
    old_session(tmp_path, "ancient", 400)
    rows = []
    ingester = reader(tmp_path, rows, backfill_days=30)
    ingester.poll()
    assert latest(rows)["ancient"]["status"] == "outside_window"
    assert ingester.source_counts == {"outside_window": 1}


def test_the_backlog_is_indexed_first_and_read_on_later_polls(tmp_path):
    old_session(tmp_path, "ancient", 400)
    old_session(tmp_path, "today", 0)
    rows = []
    ingester = reader(tmp_path, rows, backfill_days=0, defer_old=True)
    ingester.poll()
    assert {sid: row["status"] for sid, row in latest(rows).items()} == {"ancient": "waiting", "today": "complete"}
    ingester.poll()
    assert latest(rows)["ancient"]["status"] == "complete"
    assert ingester.source_counts == {"complete": 2}


def test_an_unchanged_file_is_written_to_the_index_once_and_stays_complete_after_restart(tmp_path):
    old_session(tmp_path, "ancient", 400)
    rows = []
    ingester = reader(tmp_path, rows, backfill_days=0)
    ingester.poll()
    ingester.poll()
    assert len(rows) == 1
    again = []
    restarted = reader(tmp_path, again, backfill_days=0, defer_old=True)
    restarted.poll()
    assert [row["status"] for row in again] == ["complete"]
    assert not restarted._offsets


@pytest.fixture
def vscode_homes(tmp_path, monkeypatch):
    appdata = tmp_path / "AppData" / "Roaming"
    monkeypatch.setenv("APPDATA", str(appdata))
    monkeypatch.setattr(platforms, "IS_WINDOWS", True)
    monkeypatch.setattr(platforms, "IS_MACOS", False)
    monkeypatch.setattr(index, "expand_location",
                        lambda raw, env=None, windows=None: raw.replace("%APPDATA%", str(appdata)).replace("\\", "/"))
    stable = appdata / "Code" / "User" / "workspaceStorage"
    insiders = appdata / "Code - Insiders" / "User" / "workspaceStorage" / "hash2" / "chatSessions"
    no_folder = appdata / "Code" / "User" / "profiles" / "-abc" / "globalStorage" / "emptyWindowChatSessions"
    for folder in (stable / "hash1" / "chatSessions", insiders, no_folder):
        folder.mkdir(parents=True)
    (insiders / "insiders-chat.jsonl").write_text("{}\n")
    (no_folder / "no-folder-chat.jsonl").write_text("{}\n")
    return stable, insiders, no_folder


def test_every_vscode_edition_and_no_folder_chats_are_indexed(tmp_path, vscode_homes):
    rows = []
    ingester = TranscriptUsageIngester(
        SessionFacts(MemoryWriter()), copilot_state=tmp_path / "session-state", codex_sessions=tmp_path / "codex",
        claude_projects=tmp_path / "claude", source_index=rows.extend,
    )
    ingester.poll()
    found = latest(rows)
    assert {"insiders-chat", "no-folder-chat"} <= set(found)
    assert found["no-folder-chat"]["tool"] == "copilot-vscode"


def test_the_message_reader_scans_the_same_folders(tmp_path, vscode_homes):
    stable, insiders, no_folder = vscode_homes
    messages = VSCodeChatLogsIngester(None, None, last_cursor={}, checkpoint=StateFile(tmp_path / "messages.json"), discover=True)
    workspaces, chats = messages.scan_dirs()
    assert workspaces[0] == stable
    assert insiders.parents[1] in workspaces
    assert no_folder in chats


def test_a_poll_killed_midway_keeps_the_files_it_finished(tmp_path, monkeypatch):
    from aictl.ingesters import transcript_usage

    monkeypatch.setattr(transcript_usage, "PROGRESS_SAVE_S", 0.0)
    for age, name in ((403, "one"), (402, "two"), (401, "three")):
        old_session(tmp_path, name, age)
    ingester = reader(tmp_path, [], backfill_days=0)
    saved = []
    save = ingester._save_progress

    def killed_after_two(*args):
        save(*args)
        saved.append(1)
        if len(saved) == 2:
            raise KeyboardInterrupt

    ingester._save_progress = killed_after_two
    with pytest.raises(KeyboardInterrupt):
        ingester.poll()

    rows = []
    restarted = reader(tmp_path, rows, backfill_days=0)
    restarted.poll()
    assert len(restarted._offsets) == 1  # only the file the first run had not finished is read
    assert restarted.source_counts == {"complete": 3}


# ── A row that can never be stored does not hold the others back ──


def test_a_row_the_table_cannot_take_is_left_out_and_the_rest_are_stored(caplog):
    from aictl.records import CallFacts, ContextItemRow
    from aictl.stores.base import InvalidRowError

    class StrictWriter(MemoryWriter):
        def append(self, table, rows):
            rows = list(rows)
            if any(not row.get("name") for row in rows if table == "session_context_items"):
                raise InvalidRowError("session_context_items: a deterministic key requires name")
            super().append(table, rows)

    writer = StrictWriter()
    items = [ContextItemRow("s1", "skills", "first"), ContextItemRow("s1", "skills", ""), ContextItemRow("s1", "skills", "last")]
    written = SessionFacts(writer).write(CallFacts(context_items=items))
    assert [row["name"] for row in writer.written("session_context_items")] == ["first", "last"]
    assert written == 2 and "left out" in caplog.text


def test_the_total_of_a_context_report_has_no_name_and_is_stored():
    """It was refused for its empty name, and that one row stopped the import of every later file."""
    from aictl.stores.kusto.writer import KustoWriter

    writer = KustoWriter(SimpleNamespace(ingest_lines=lambda *_: None), node_id="node-1")
    row = dict(project="", session_id="s1", agent_id="", kind="reported", name="", ts=1.0, path="", chars=0,
               tokens=131000, estimated=0, removed=0, tool="claude-code")
    writer.append("session_context_items", [row])
    assert writer._queues["session_context_items"].rows
