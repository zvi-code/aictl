"""``aictl db reread``: queue session files to read again, for a running daemon or the next start.

Each test has its own tool homes (HOME, CLAUDE_CONFIG_DIR, COPILOT_HOME, CODEX_HOME) in a temporary
folder, and the discovery of other homes is switched off, so nothing reads this machine's folders.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

import pytest
from click.testing import CliRunner
from test_board_facts import NOW, c_assistant, c_user, copilot_events, ev, usage_record, write_lines
from test_session_investigation import Facts, ingester

from aictl import tool_homes
from aictl.commands import admin
from aictl.ingesters.transcript_usage import (
    READER_VERSIONS,
    REREAD_REQUEST_GLOB,
    TranscriptUsageIngester,
    request_reread,
)
from aictl.kusto import KustoSettings
from aictl.state_file import StateFile

DAY = 86400.0
CLAUDE_SID = "aaaaaaaa-1111-4111-8111-000000000001"
CLI_SID = "bbbbbbbb-1111-4111-8111-000000000002"
APP_SID = "cccccccc-1111-4111-8111-000000000003"


@pytest.fixture
def homes(tmp_path, monkeypatch):
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(tmp_path / "claude"))
    monkeypatch.setenv("COPILOT_HOME", str(tmp_path / "copilot"))
    monkeypatch.setenv("CODEX_HOME", str(tmp_path / "codex"))
    monkeypatch.setattr(tool_homes, "session_dirs", lambda tool: [])
    claude = tmp_path / "claude" / "projects" / "-work" / f"{CLAUDE_SID}.jsonl"
    write_lines(claude, [{**c_user("an invented prompt", 3 * DAY), "sessionId": CLAUDE_SID},
                         {**c_assistant("m1", "r1", 3 * DAY - 1), "sessionId": CLAUDE_SID}])
    os.utime(claude, (NOW - 3 * DAY, NOW - 3 * DAY))
    for sid, days in ((CLI_SID, 1), (APP_SID, 10)):
        events = tmp_path / "copilot" / "session-state" / sid / "events.jsonl"
        write_lines(events, [ev("user.message", days * DAY, {"content": "invented"}), usage_record(days * DAY - 1)])
        os.utime(events, (NOW - days * DAY, NOW - days * DAY))
    data = sqlite3.connect(tmp_path / "copilot" / "data.db")
    data.execute("CREATE TABLE sessions (id TEXT PRIMARY KEY, session_type TEXT, total_input_tokens INT, "
                 "total_cached_tokens INT, total_output_tokens INT, total_nano_aiu INT, model TEXT, created_at TEXT, "
                 "updated_at TEXT)")
    data.execute("INSERT INTO sessions VALUES(?, 'project', 0, 0, 0, 0, '', '', '')", (APP_SID,))
    data.commit()
    data.close()
    restart = tmp_path / "restart"
    restart.mkdir()
    monkeypatch.setattr(admin, "kusto_settings", lambda: KustoSettings("https://example.invalid", node_id="n1"))
    monkeypatch.setattr("aictl.state_file.restart_directory", lambda *_: restart)
    return tmp_path


def selection(**kw) -> dict[str, set[str]]:
    found = TranscriptUsageIngester(None, backfill_days=0).reread_selection(**kw)
    return {tool: {path.name if tool == "claude-code" else path.parent.name for path, _ in files}
            for tool, files in found.items()}


def test_the_selection_by_tool_date_and_session(homes):
    assert selection() == {}
    assert selection(every=True) == {"claude-code": {f"{CLAUDE_SID}.jsonl"}, "copilot-cli": {CLI_SID},
                                     "copilot-desktop": {APP_SID}}
    assert selection(tools=["copilot-desktop"]) == {"copilot-desktop": {APP_SID}}
    assert selection(since=NOW - 5 * DAY) == {"claude-code": {f"{CLAUDE_SID}.jsonl"}, "copilot-cli": {CLI_SID}}
    assert selection(sessions=[CLAUDE_SID, APP_SID], tools=["claude-code"]) == {"claude-code": {f"{CLAUDE_SID}.jsonl"}}
    # The reader reads no file older than history_days, so none is queued.
    found = TranscriptUsageIngester(None, backfill_days=5).reread_selection(every=True)
    assert set(found) == {"claude-code", "copilot-cli"}


def test_the_command_reports_per_tool_and_a_dry_run_queues_nothing(homes):
    result = CliRunner().invoke(admin.db, ["reread", "--all", "--dry-run"])
    assert result.exit_code == 0, result.output
    assert "copilot-cli" in result.output and "copilot-desktop" in result.output and "claude-code" in result.output
    assert "Dry run: 3 file(s)" in result.output
    assert not list((homes / "restart").iterdir())


def test_the_command_queues_a_request_the_reader_takes(homes):
    result = CliRunner().invoke(admin.db, ["reread", "--tool", "copilot-cli", "--tool", "copilot-desktop"])
    assert result.exit_code == 0, result.output
    [request] = (homes / "restart").glob(REREAD_REQUEST_GLOB)
    data = json.loads(request.read_text())
    assert {Path(p).parent.name for p in data["paths"]} == {CLI_SID, APP_SID}
    assert data["copilot_store"] is True


def test_the_command_needs_a_choice_of_files(homes):
    assert CliRunner().invoke(admin.db, ["reread"]).exit_code != 0
    assert CliRunner().invoke(admin.db, ["reread", "--types"]).exit_code != 0  # only with --dry-run


def test_reimport_sessions_queues_the_claude_session_files(homes):
    result = CliRunner().invoke(admin.db, ["reimport-sessions", CLAUDE_SID])
    assert result.exit_code == 0, result.output
    [request] = (homes / "restart").glob(REREAD_REQUEST_GLOB)
    assert [Path(p).name for p in json.loads(request.read_text())["paths"]] == [f"{CLAUDE_SID}.jsonl"]


def test_the_types_count_names_what_no_reader_lists(homes):
    claude = homes / "claude" / "projects" / "-work" / f"{CLAUDE_SID}.jsonl"
    write_lines(claude, [{"type": "invented-marker", "sessionId": CLAUDE_SID},
                         {"type": "attachment", "attachment": {"type": "invented_attachment"}}])
    events = homes / "copilot" / "session-state" / CLI_SID / "events.jsonl"
    write_lines(events, [{"type": "session.invented_event", "data": {}}])
    result = CliRunner().invoke(admin.db, ["reread", "--dry-run", "--types"])
    assert result.exit_code == 0, result.output
    assert "invented-marker" in result.output and "attachment:invented_attachment" in result.output
    assert "session.invented_event" in result.output
    assert "user.message" not in result.output


# ── The reader takes the request ──────────────────────────────────────


def _session(root) -> Path:
    path = copilot_events(root)
    write_lines(path, [ev("session.start", 900, {"context": {"cwd": "/work/cli"}}),
                       ev("user.message", 800, {"content": "an invented prompt"}), usage_record(790)])
    return path


def test_a_running_reader_reads_a_requested_file_again_without_counting_it_twice(tmp_path):
    path = _session(tmp_path)
    state = StateFile(tmp_path / "state" / "transcript_usage.json")
    facts = Facts()
    ing = ingester(facts, tmp_path, checkpoint=state)
    ing.poll()
    usage = [r for r in facts.writer.written("session_usage")][-1]
    prompts = len(facts.writer.written("session_prompts"))
    assert prompts == 1 and path in ing._offsets
    request_reread(state.path.parent, [path])
    ing.poll()
    # The prompt is written again, under its key; the session's totals are what they were.
    assert len(facts.writer.written("session_prompts")) == 2
    assert len({r["dedup_key"] for r in facts.writer.written("session_prompts")}) == 1
    assert facts.writer.written("session_usage")[-1]["input_tokens"] == usage["input_tokens"]
    assert not list(state.path.parent.glob(REREAD_REQUEST_GLOB))
    saved = next(iter(state.read().values()))["files"]
    assert saved[str(path)][2] == READER_VERSIONS["copilot-events"]
    ing.poll()
    assert len(facts.writer.written("session_prompts")) == 2


def test_a_request_left_while_no_daemon_ran_is_taken_at_the_next_start(tmp_path):
    path = _session(tmp_path)
    state = StateFile(tmp_path / "state" / "transcript_usage.json")
    ingester(Facts(), tmp_path, checkpoint=state).poll()
    request_reread(state.path.parent, [path])
    started = Facts()
    ingester(started, tmp_path, checkpoint=state).poll()
    assert len(started.writer.written("session_prompts")) == 1


class _Unsaved(StateFile):
    def __init__(self, path, fail: bool) -> None:
        super().__init__(path)
        self.fail = fail

    def replace(self, data):
        if self.fail:
            raise OSError("disk full")
        super().replace(data)


def test_a_request_stays_until_its_marks_are_saved(tmp_path):
    path = _session(tmp_path)
    state_path = tmp_path / "state" / "transcript_usage.json"
    ingester(Facts(), tmp_path, checkpoint=StateFile(state_path)).poll()
    request = request_reread(state_path.parent, [path])
    failing = ingester(Facts(), tmp_path, checkpoint=_Unsaved(state_path, fail=True))
    failing._take_reread_requests()
    assert request.exists()
    later = Facts()
    ingester(later, tmp_path, checkpoint=_Unsaved(state_path, fail=False)).poll()
    assert not request.exists()
    assert len(later.writer.written("session_prompts")) == 1
