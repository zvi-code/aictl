"""A reader whose record lists or handlers change must raise its READER_VERSIONS entry.

fixtures/reader_versions.json records, per reader kind, the version and a hash of what the
reader takes: the record types it reads and ignores, and the names of its handler methods.
When the hash no longer matches, this test fails until the version is raised and the file is
recorded again, so a change to what a reader stores is a conscious choice that also reads the
old session files again. Record the file with:

    PYTHONPATH=src python test/test_reader_version_guard.py --record
"""

from __future__ import annotations

import hashlib
import inspect
import json
import sys
from pathlib import Path

from aictl.ingesters import call_facts, copilot_store_content, session_outcomes, transcript_steps, transcript_usage
from aictl.ingesters.transcript_usage import READER_VERSIONS

RECORD = Path(__file__).parent / "fixtures" / "reader_versions.json"


def _handlers(*classes: type) -> list[str]:
    return sorted(f"{cls.__name__}.{name}" for cls in classes
                  for name, _ in inspect.getmembers(cls, inspect.isfunction) if name in vars(cls))


def material() -> dict[str, object]:
    """What each reader kind takes, in a form that changes when its record lists or handlers change."""
    return {
        "claude-transcript": {
            "read": sorted(kind.decode() for kind in transcript_usage._CLAUDE_RECORD_TYPES),
            "ignored": sorted(call_facts.CLAUDE_IGNORED_LINES),
            "attachments_read": sorted(call_facts.CLAUDE_READ_ATTACHMENTS),
            "attachments_ignored": sorted(call_facts.CLAUDE_IGNORED_ATTACHMENTS),
            "handlers": _handlers(call_facts.ClaudeFacts, transcript_usage.ClaudeAccumulator),
        },
        "copilot-events": {
            "read": sorted(call_facts.COPILOT_READ_EVENTS | transcript_steps._SOURCES),
            "ignored": sorted(call_facts.COPILOT_IGNORED_EVENTS),
            "config": sorted(call_facts.COPILOT_CONFIG_KINDS.items()),
            "config_fields": sorted((k, list(v)) for k, v in call_facts._CONFIG_FIELDS.items()),
            "handlers": _handlers(call_facts.CopilotFacts, transcript_usage.CopilotAccumulator),
        },
        "copilot-store": {
            "columns": list(transcript_usage.CopilotStoreReader._CALL_COLUMNS),
            "handlers": _handlers(transcript_usage.CopilotStoreReader),
        },
        "copilot-store-content": {
            "tables": list(copilot_store_content.TABLES),
            "handlers": _handlers(copilot_store_content.CopilotStoreContent),
        },
        "codex-rollout": {"handlers": _handlers(transcript_usage.CodexAccumulator)},
        "vscode-debug-log": {"handlers": _handlers(call_facts.VSCodeDebugFacts, transcript_usage.VSCodeDebugLogAccumulator)},
        "vscode-chat-session": {
            "handlers": _handlers(call_facts.VSCodeChatFacts, transcript_usage.VSCodeChatSessionAccumulator)},
        "session-metadata": {"handlers": _handlers(session_outcomes.MetadataReaders)},
    }


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()[:16]


def current() -> dict[str, dict]:
    return {kind: {"version": READER_VERSIONS[kind], "hash": digest(value)} for kind, value in sorted(material().items())}


def test_every_reader_kind_is_recorded():
    assert set(material()) == set(READER_VERSIONS)
    assert set(json.loads(RECORD.read_text())) == set(READER_VERSIONS)


def test_a_reader_that_changed_has_a_new_version():
    recorded = json.loads(RECORD.read_text())
    now = current()
    for kind, entry in now.items():
        was = recorded[kind]
        if entry["hash"] != was["hash"]:
            assert entry["version"] > was["version"], (
                f"The {kind} reader changed what it reads (its record lists or handlers). Raise "
                f"READER_VERSIONS[{kind!r}] in transcript_usage.py, so the files it read before are read "
                "again, then record the file: PYTHONPATH=src python test/test_reader_version_guard.py --record")
        assert entry["version"] >= was["version"], f"READER_VERSIONS[{kind!r}] went down"
    assert now == recorded, "Record the new versions and hashes: PYTHONPATH=src python test/test_reader_version_guard.py --record"


def test_the_guard_sees_a_new_record_type(monkeypatch):
    before = current()["copilot-events"]["hash"]
    monkeypatch.setattr(call_facts, "COPILOT_READ_EVENTS", call_facts.COPILOT_READ_EVENTS | {"session.invented"})
    assert current()["copilot-events"]["hash"] != before


if __name__ == "__main__" and "--record" in sys.argv:
    RECORD.write_text(json.dumps(current(), indent=2, sort_keys=True) + "\n")
    print(f"Recorded {RECORD}")
