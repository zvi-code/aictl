"""Restart checkpoints and optional external SQLite sources."""

import subprocess
import sys
import time
from types import SimpleNamespace

import pytest

from aictl import state_file
from aictl.dashboard import ingester_runner
from aictl.ingesters.message_facts import save_checkpoint
from aictl.ingesters.session_artifacts import SessionArtifactIndexer, signature
from aictl.session_evidence import SessionEvidence
from aictl.state_file import StateFile
from aictl.stores.testing import MemoryWriter


def test_corrupt_state_starts_empty_and_warns_once(tmp_path, caplog):
    path = tmp_path / "restart.json"
    path.write_bytes(b'{"cursor":')
    assert StateFile(path).read() == {}
    assert StateFile(path).read() == {}
    assert caplog.text.count("Invalid restart state") == 1
    StateFile(path).replace({"cursor": 42})
    assert StateFile(path).read() == {"cursor": 42}


def test_failed_or_oversized_write_preserves_checkpoint(tmp_path, monkeypatch):
    path = tmp_path / "restart.json"
    state = StateFile(path)
    state.replace({"cursor": 4})
    monkeypatch.setattr(state_file, "MAX_STATE_BYTES", 20)
    with pytest.raises(OSError, match="restart state limit"):
        state.replace({"cursor": "x" * 50})

    def reject(_temp, _path):
        raise OSError("replace failed")

    monkeypatch.setattr(state_file.os, "replace", reject)
    with pytest.raises(OSError, match="replace failed"):
        state.replace({"cursor": 5})
    assert state.read() == {"cursor": 4}
    assert list(tmp_path.iterdir()) == [path]


def test_doctor_uses_the_copilot_source_checkpoint(tmp_path, monkeypatch):
    from aictl import kusto

    source = tmp_path / "session-store.db"
    source.touch()
    monkeypatch.setattr(ingester_runner, "default_db_path", lambda: source)
    monkeypatch.setattr(ingester_runner, "restart_directory", lambda *_: tmp_path)
    monkeypatch.setattr(kusto, "kusto_settings", lambda: SimpleNamespace(cluster="a", database="b", node_id="c"))
    state = StateFile(tmp_path / "copilot_messages.json")
    when = time.time() - 3
    save_checkpoint(state, source, {"cursor": {"messages": 1}, "last_poll_ts": when})
    [status] = ingester_runner.ingester_status_for_doctor(tmp_path / "unused-history.db")
    assert status["last_poll_ts"] == when
    assert status["last_poll_age_s"] >= 3


def test_artifact_index_uses_local_folder_signatures(tmp_path, monkeypatch):
    folder = tmp_path / "session"
    folder.mkdir()
    now = signature(folder)
    assert now
    writer = MemoryWriter()
    sessions = SimpleNamespace(writer=writer, project_for=lambda _: "")
    state = StateFile(tmp_path / "session_artifacts.json")
    evidence = SessionEvidence(sessions, state)
    evidence.replace_session_artifacts("sid", "copilot-cli", str(folder), now, [], 0, 0)
    evidence.save()

    restarted = SessionEvidence(sessions, state)
    index = SessionArtifactIndexer(restarted, {"copilot": [tmp_path]})
    monkeypatch.setattr("aictl.ingesters.session_artifacts.session_folders", lambda *_: iter([("sid", folder)]))

    def unexpected_scan(*_, **__):
        pytest.fail("A recent unchanged folder must not be rescanned at restart")

    monkeypatch.setattr("aictl.ingesters.session_artifacts.scan_folder", unexpected_scan)
    assert index.poll() == 0


def test_external_collectors_report_unavailable_without_sqlite(tmp_path):
    script = """
import importlib
from pathlib import Path
import sys
from types import SimpleNamespace

sys.modules["sqlite3"] = None
sys.modules["_sqlite3"] = None
for module in (
    "ingesters._common", "ingesters.call_facts", "ingesters.copilot_session_store",
    "ingesters.transcript_usage", "ingesters.cursor_conversations", "context_audit",
    "effective_config", "monitoring.tool_telemetry", "observe.collect", "observe.sessions",
):
    importlib.import_module("aictl." + module)

from aictl.collection_status import CollectionStatus
from aictl.dashboard.ingester_runner import IngesterHandle, collect_status, _poll_loop
from aictl.effective_config import _picker_rows
from aictl.ingesters.copilot_session_store import CopilotSessionStoreIngester
from aictl.ingesters.cursor_conversations import CursorConversationsIngester
from aictl.ingesters.message_facts import MessageFacts
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.observe.collect import _query
from aictl.stores.testing import MemoryWriter

root = Path(sys.argv[1])
source = root / "external.db"
source.touch()
reason = "unavailable: Python sqlite3 module missing"
writer = MemoryWriter()
quality = CollectionStatus(writer)
facts = MessageFacts(SimpleNamespace(writer=writer), quality)
ingesters = {
    "copilot-session-store": CopilotSessionStoreIngester(source, facts),
    "cursor-conversations": CursorConversationsIngester(source, facts),
    "transcript-usage": TranscriptUsageIngester(
        None, claude_projects=root / "claude", codex_sessions=root / "codex",
        copilot_state=root / "copilot", vscode_workspaces=root / "vscode", quality=quality,
    ),
}
for name, ingester in ingesters.items():
    handle = IngesterHandle(name, True, source, True, ingester)
    handle.stop_event.set()
    _poll_loop(ingester, handle.stop_event, 0, name)
    [capability] = collect_status({name: handle})
    assert capability.get("unavailable") == reason, capability
    assert capability["last_poll_inserted"] == 0
    assert any(
        row["component"] == "ingester:" + name
        and row["status"] == "unavailable" and row["message"] == reason
        for _, table, rows in writer.operations if table == "data_quality_status" for row in rows
    ), writer.operations

assert _picker_rows(source, "user") == ([], reason)
assert _query(source, "select 1") == []
"""
    proc = subprocess.run([sys.executable, "-c", script, str(tmp_path)], capture_output=True, text=True, timeout=30)
    assert proc.returncode == 0, proc.stdout + proc.stderr
