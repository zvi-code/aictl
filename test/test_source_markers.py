"""Every kind of line a tool writes is read or deliberately left out, with the reason.

The fixtures under fixtures/transcripts hold one invented line per Claude Code transcript type,
Claude Code attachment type and Copilot CLI ``events.jsonl`` event type seen in real session files.
When a tool adds a marker (a new way to save memory or a new checkpoint), add a line of it to the
fixture: this test then fails until a reader handles the type or ``call_facts`` lists it as ignored
with a reason. Nothing is dropped without saying so.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest
from test_session_investigation import Facts, ingester

from aictl.ingesters import call_facts, record_types, transcript_steps
from aictl.ingesters.transcript_usage import _CLAUDE_RECORD_TYPES

FIXTURES = Path(__file__).parent / "fixtures" / "transcripts"
CLAUDE_READ = {kind.decode() for kind in _CLAUDE_RECORD_TYPES}
COPILOT_READ = call_facts.COPILOT_READ_EVENTS | transcript_steps._SOURCES


def lines(name: str) -> list[dict]:
    return [json.loads(line) for line in (FIXTURES / name).read_text().splitlines() if line.strip()]


def unaccounted(kinds: set[str], read: set[str] | frozenset[str], ignored: dict[str, str]) -> set[str]:
    return {kind for kind in kinds if kind not in read and kind not in ignored}


def test_every_claude_line_type_is_read_or_ignored_with_a_reason():
    kinds = {line["type"] for line in lines("claude-markers.jsonl")}
    assert unaccounted(kinds, CLAUDE_READ, call_facts.CLAUDE_IGNORED_LINES) == set()


def test_every_claude_attachment_type_is_read_or_ignored_with_a_reason():
    kinds = {line["attachment"]["type"] for line in lines("claude-markers.jsonl") if line["type"] == "attachment"}
    assert unaccounted(kinds, call_facts.CLAUDE_READ_ATTACHMENTS, call_facts.CLAUDE_IGNORED_ATTACHMENTS) == set()


def test_every_copilot_event_type_is_read_or_ignored_with_a_reason():
    kinds = {line["type"] for line in lines("copilot-events.jsonl")}
    assert unaccounted(kinds, COPILOT_READ, call_facts.COPILOT_IGNORED_EVENTS) == set()


def test_a_new_marker_is_reported():
    # The guard itself: a type the readers have never seen is named, not passed over.
    assert unaccounted({"assistant", "memory-saved"}, CLAUDE_READ, call_facts.CLAUDE_IGNORED_LINES) == {"memory-saved"}


@pytest.mark.parametrize("read, ignored", [
    (CLAUDE_READ, call_facts.CLAUDE_IGNORED_LINES),
    (call_facts.CLAUDE_READ_ATTACHMENTS, call_facts.CLAUDE_IGNORED_ATTACHMENTS),
    (COPILOT_READ, call_facts.COPILOT_IGNORED_EVENTS),
], ids=["claude-lines", "claude-attachments", "copilot-events"])
def test_a_type_is_either_read_or_ignored_and_every_ignore_says_why(read, ignored):
    assert set(read) & set(ignored) == set()
    assert all(isinstance(reason, str) and len(reason) > 10 for reason in ignored.values())


def test_every_copilot_config_event_becomes_its_config_row(tmp_path):
    # Each event that states a setting has a fixture line with data, and reading it stores its config.* row.
    with_data = {line["type"] for line in lines("copilot-events.jsonl") if line["data"]}
    assert set(call_facts.COPILOT_CONFIG_KINDS) <= COPILOT_READ
    assert set(call_facts.COPILOT_CONFIG_KINDS) - with_data == set()
    copilot = tmp_path / "copilot" / "session-state" / "bbbbbbbb-0000-4000-8000-000000000002" / "events.jsonl"
    copilot.parent.mkdir(parents=True)
    shutil.copy(FIXTURES / "copilot-events.jsonl", copilot)
    facts = Facts()
    ingester(facts, tmp_path, backfill_days=0).poll()
    stored = {row["kind"] for _, name, rows in facts.writer.operations if name == "context_events" for row in rows}
    assert set(call_facts.COPILOT_CONFIG_KINDS.values()) - stored == set()


def unlisted_in(directory: Path) -> dict[str, dict[str, int]]:
    """Per tool, the line and event types in a folder of fixture lines (claude-*.jsonl, copilot-*.jsonl,
    codex-*.jsonl) that no reader reads or lists as ignored. The same count as ``aictl db reread --dry-run
    --types`` makes over a machine's own folders."""
    found = {}
    for tool, prefix in (("claude-code", "claude-"), ("copilot-cli", "copilot-"), ("codex-cli", "codex-")):
        if counts := record_types.unlisted(tool, sorted(directory.glob(f"{prefix}*.jsonl"))):
            found[tool] = dict(counts)
    return found


def test_no_fixture_line_has_a_type_no_reader_lists():
    assert unlisted_in(FIXTURES) == {}


def test_the_folder_check_names_a_new_type(tmp_path):
    (tmp_path / "claude-new.jsonl").write_text(
        json.dumps({"type": "assistant"}) + "\n" + json.dumps({"type": "memory-saved"}) + "\n"
        + json.dumps({"type": "attachment", "attachment": {"type": "memory_recall"}}) + "\n")
    (tmp_path / "copilot-new.jsonl").write_text(json.dumps({"type": "session.memory_saved", "data": {}}) + "\n")
    (tmp_path / "codex-new.jsonl").write_text("\n".join(json.dumps(line) for line in (
        {"type": "session_meta", "payload": {"id": "s"}}, {"type": "event_msg", "payload": {"type": "token_count"}},
        {"type": "event_msg", "payload": {"type": "agent_reasoning"}})) + "\n")
    assert unlisted_in(tmp_path) == {"claude-code": {"memory-saved": 1, "attachment:memory_recall": 1},
                                     "copilot-cli": {"session.memory_saved": 1},
                                     "codex-cli": {"event_msg:agent_reasoning": 1}}


def test_the_readers_take_every_fixture_line(tmp_path):
    claude = tmp_path / "claude" / "projects" / "-work-proj" / "aaaaaaaa-0000-4000-8000-000000000001.jsonl"
    copilot = tmp_path / "copilot" / "session-state" / "bbbbbbbb-0000-4000-8000-000000000002" / "events.jsonl"
    for source, target in ((FIXTURES / "claude-markers.jsonl", claude), (FIXTURES / "copilot-events.jsonl", copilot)):
        target.parent.mkdir(parents=True)
        shutil.copy(source, target)
    facts = Facts()
    ingester(facts, tmp_path, backfill_days=0).poll()
    assert any(name == "context_events" for _, name, _ in facts.writer.operations)
