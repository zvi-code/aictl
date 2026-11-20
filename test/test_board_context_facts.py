# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Context size facts: field shapes copied from real session files, values changed."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pytest
from kusto_replay import NOW

import aictl.context_audit as ca
from aictl.dashboard.session_details import agent_detail
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.session_facts import SessionFacts
from aictl.stores.testing import MemoryWriter

SID = "11111111-2222-3333-4444-555555555555"


def iso(ago: float) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(NOW - ago))


def ingest(db, root: Path) -> MemoryWriter:
    writer = MemoryWriter()
    ingester = TranscriptUsageIngester(
        None,
        claude_projects=root / "claude" / "projects",
        codex_sessions=root / "codex",
        copilot_state=root / "copilot" / "session-state",
        vscode_workspaces=root / "vscode",
        backfill_days=36500,  # Read the fixed tape timestamps, not the current month's logs.
        fact_target=SessionFacts(writer, content_days=36500),
    )
    ingester.poll()
    ingester.facts.flush()
    if db is not None:
        for operation, table, batch in writer.operations:
            assert operation in {"append", "upsert"}
            for row in batch:
                stable = {**row, "updated_at": NOW} if "updated_at" in row else row
                db.insert(table, **stable)
    return writer


def write_lines(path: Path, lines: list[dict]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(x) + "\n" for x in lines))
    os.utime(path, (NOW, NOW))
    return path


def claude_call(msg_id: str, ago: float, size: int, **extra) -> dict:
    return {
        "type": "assistant",
        "uuid": f"u-{msg_id}",
        "sessionId": SID,
        "requestId": f"r-{msg_id}",
        "timestamp": iso(ago),
        "cwd": "/p/alpha",
        "message": {
            "id": msg_id,
            "model": "claude-sonnet-4-5",
            "role": "assistant",
            "content": [{"type": "text", "text": "ok"}],
            "usage": {"input_tokens": size, "output_tokens": 5, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0},
        },
        **extra,
    }


def boundary(uuid: str, ago: float, **meta) -> dict:
    return {
        "type": "system",
        "subtype": "compact_boundary",
        "uuid": uuid,
        "sessionId": SID,
        "timestamp": iso(ago),
        "isSidechain": False,
        "compactMetadata": {"trigger": "auto", "preTokens": 570051, "postTokens": 29283, "durationMs": 68210, **meta},
    }


def copilot_usage(ago: float, *, event: str, **usage) -> dict:
    fields = {"model": "gpt-6-astra", "inputTokens": 23646, "outputTokens": 17, "cacheReadTokens": 0, "cacheWriteTokens": 23643, "duration": 2478}
    return {"type": "session.usage_record", "id": event, "timestamp": iso(ago), "data": {"usage": {**fields, **usage}}}


# ─── Claude Code compaction ───────────────────────────────────────


def test_claude_compaction_is_stored_with_the_values_of_the_line(kusto_store, tmp_path):
    db = kusto_store
    write_lines(
        tmp_path / "claude" / "projects" / "-p-alpha" / f"{SID}.jsonl",
        [claude_call("m1", 300, 570000), boundary("b-1", 200), claude_call("m2", 100, 30000)],
    )
    ingest(db, tmp_path)
    keys = ("kind", "trigger", "before_tokens", "after_tokens", "duration_ms", "tool")
    assert [{key: row[key] for key in keys} for row in db.facts.rows["context_events"]] == [
        {"kind": "compaction", "trigger": "auto", "before_tokens": 570051, "after_tokens": 29283, "duration_ms": 68210, "tool": "claude-code"}
    ]
    context = agent_detail(db, SID, None, NOW)[1]["context"]
    assert context["compactions"][0]["freed"] == 570051 - 29283
    assert context["compactions"][0]["trigger"] == "auto"


def test_claude_replayed_compaction_stays_on_the_session_that_made_it(tmp_path):
    base = tmp_path / "claude" / "projects" / "-p-alpha"
    write_lines(base / f"{SID}.jsonl", [claude_call("m1", 300, 100), boundary("b-1", 200)])
    resumed = write_lines(base / "resumed.jsonl", [boundary("b-1", 200), claude_call("m2", 100, 100)])
    # The files are read oldest first, as for a replayed model call.
    newer = time.time() + 60
    os.utime(resumed, (newer, newer))
    writer = ingest(None, tmp_path)
    assert {r["session_id"] for r in writer.written("context_events")} == {SID}


def test_claude_compaction_without_figures_stays_unknown_not_zero(kusto_store, tmp_path):
    db = kusto_store
    line = boundary("b-1", 200)
    line["compactMetadata"] = {"trigger": "manual"}
    write_lines(tmp_path / "claude" / "projects" / "-p-alpha" / f"{SID}.jsonl", [claude_call("m1", 300, 100), line])
    ingest(db, tmp_path)
    entry = agent_detail(db, SID, None, NOW)[1]["context"]["compactions"][0]
    assert entry == {"ts": entry["ts"], "tool": "claude-code", "trigger": "manual", "before": None, "after": None, "freed": None, "duration_ms": None}


def test_claude_session_reports_no_copilot_figures(kusto_store, tmp_path):
    db = kusto_store
    write_lines(tmp_path / "claude" / "projects" / "-p-alpha" / f"{SID}.jsonl", [claude_call("m1", 300, 100)])
    ingest(db, tmp_path)
    context = agent_detail(db, SID, None, NOW)[1]["context"]
    for key in ("tool_tokens", "prompt_limit", "limit_share", "request_bytes_last", "request_bytes_peak", "available_tools", "split"):
        assert context[key] is None, key
    assert context["compactions"] == []


# ─── Copilot ──────────────────────────────────────────────────────


def copilot_path(root: Path) -> Path:
    return root / "copilot" / "session-state" / SID / "events.jsonl"


def test_copilot_call_fields_and_shutdown_split(kusto_store, tmp_path):
    db = kusto_store
    shutdown = {"currentTokens": 163801, "systemTokens": 16479, "conversationTokens": 138254, "toolDefinitionsTokens": 9065, "shutdownType": "routine"}
    write_lines(
        copilot_path(tmp_path),
        [
            {"type": "session.start", "id": "e0", "timestamp": iso(500), "data": {"context": {"cwd": "/p/beta"}}},
            copilot_usage(400, event="e1", requestBodyBytes=500000, maxPromptTokens=922000, toolTokenCount=6181, availableToolCount=35),
            copilot_usage(300, event="e2", inputTokens=23650, requestBodyBytes=121075, maxPromptTokens=922000, toolTokenCount=6200, availableToolCount=36),
            {"type": "session.shutdown", "id": "e3", "timestamp": iso(200), "data": shutdown},
        ],
    )
    ingest(db, tmp_path)
    context = agent_detail(db, SID, None, NOW)[1]["context"]
    assert context["last"] == 23650  # inputTokens holds cache, and the size gives it back
    assert context["tool_tokens"] == 6200
    assert context["prompt_limit"] == 922000
    assert context["limit_share"] == pytest.approx(23650 / 922000)
    assert (context["request_bytes_last"], context["request_bytes_peak"]) == (121075, 500000)
    assert context["available_tools"] == 36
    split = context["split"]
    assert (split["current"], split["system"], split["conversation"], split["tools"]) == (163801, 16479, 138254, 9065)


def test_copilot_fields_that_are_absent_stay_unknown(kusto_store, tmp_path):
    db = kusto_store
    write_lines(copilot_path(tmp_path), [copilot_usage(300, event="e1")])
    ingest(db, tmp_path)
    context = agent_detail(db, SID, None, NOW)[1]["context"]
    for key in ("tool_tokens", "prompt_limit", "limit_share", "request_bytes_last", "available_tools", "split"):
        assert context[key] is None, key


def test_copilot_compaction_is_stored_and_a_failed_one_is_not(kusto_store, tmp_path):
    db = kusto_store
    complete = {"success": True, "trigger": "auto", "preCompactionTokens": 44371, "postCompactionTokens": 4363, "summaryContent": "secret text"}
    write_lines(
        copilot_path(tmp_path),
        [
            copilot_usage(400, event="e1", toolTokenCount=10),
            {"type": "session.compaction_complete", "id": "e2", "timestamp": iso(300), "data": complete},
            {"type": "session.compaction_complete", "id": "e3", "timestamp": iso(200), "data": {"success": False}},
        ],
    )
    ingest(db, tmp_path)
    context = agent_detail(db, SID, None, NOW)[1]["context"]
    assert [(c["before"], c["after"], c["trigger"], c["duration_ms"]) for c in context["compactions"]] == [(44371, 4363, "auto", None)]
    assert "secret text" not in json.dumps(db.facts.rows["context_events"])


def test_reread_of_copilot_lines_keeps_the_same_context_and_call_keys(tmp_path):
    path = write_lines(
        copilot_path(tmp_path),
        [copilot_usage(400, event="e1", toolTokenCount=10), {"type": "session.shutdown", "id": "e2", "timestamp": iso(300), "data": {"currentTokens": 9}}],
    )
    first, second = ingest(None, tmp_path), ingest(None, tmp_path)
    for table in ("context_events", "requests"):
        assert [r["dedup_key"] for r in first.written(table)] == [r["dedup_key"] for r in second.written(table)]
    assert [r["tool_tokens"] for r in second.written("requests")] == [10]
    assert path.is_file()


# ─── Store ────────────────────────────────────────────────────────


# ─── Transcript facts in the context audit ────────────────────────


def test_instructions_attachment_counts_as_loaded(tmp_path):
    path = write_lines(
        tmp_path / "s.jsonl",
        [
            {"type": "attachment", "attachment": {"type": "instructions", "reason": "session_start", "files": [{"path": "/a/CLAUDE.md", "type": "User", "content": "x"}, {"path": "/b/AGENTS.md", "type": "Project", "content": "y"}]}},
            {"type": "attachment", "attachment": {"type": "instructions", "changed": True, "files": "not a list"}},
            {"type": "attachment", "attachment": {"type": "instructions", "files": [{"type": "User"}, "text"]}},
        ],
    )
    ca._TRANSCRIPT_CACHE.clear()
    assert ca._parse_transcript(path)["loaded"] == ["/a/CLAUDE.md", "/b/AGENTS.md"]


def test_loaded_sessions_counts_session_files_per_claude_source():
    source = ca.Source(tool="claude-code", scope="project", path="/a/CLAUDE.md", kind="instructions", loading="always")
    other_tool = ca.Source(tool="cursor", scope="project", path="/a/CLAUDE.md", kind="instructions", loading="always")
    never = ca.Source(tool="claude-code", scope="project", path="/a/OTHER.md", kind="instructions", loading="always")
    ca._mark_loaded_sessions([source, other_tool, never], [{"loaded": ["/a/CLAUDE.md", "/a/CLAUDE.md"]}, {"loaded": []}, {"loaded": ["/a/CLAUDE.md"]}])
    assert (source.loaded_sessions, other_tool.loaded_sessions, never.loaded_sessions) == (2, None, 0)


def test_no_session_file_leaves_loaded_sessions_unknown():
    source = ca.Source(tool="claude-code", scope="project", path="/a/CLAUDE.md", kind="instructions", loading="always")
    ca._mark_loaded_sessions([source], [])
    assert source.loaded_sessions is None


def _usage_line(size: int, padding: int = 0) -> dict:
    return {"type": "assistant", "padding": "x" * padding, "message": {"usage": {"input_tokens": size, "cache_read_input_tokens": 1, "cache_creation_input_tokens": 2}}}


def test_first_request_of_a_large_file_comes_from_its_start(tmp_path, monkeypatch):
    monkeypatch.setattr(ca, "TRANSCRIPT_MAX_BYTES", 5000)
    start = {"type": "attachment", "attachment": {"type": "instructions", "files": [{"path": "/a/CLAUDE.md"}]}}
    write = {"type": "assistant", "sessionId": "s", "timestamp": iso(1), "message": {"content": [{"type": "tool_use", "name": "Write", "input": {"file_path": "/a/new.md"}}]}}
    path = write_lines(tmp_path / "big.jsonl", [start, _usage_line(100), *[_usage_line(900000, 200)] * 60, write])
    assert path.stat().st_size > 5000
    ca._TRANSCRIPT_CACHE.clear()
    facts = ca._parse_transcript(path)
    assert facts["first_tokens"] == 103
    assert facts["loaded"] == ["/a/CLAUDE.md"]
    assert [w["path"] for w in facts["writes"]] == ["/a/new.md"]


def test_start_of_a_large_file_is_not_read_twice(tmp_path, monkeypatch):
    # The first request is past the point where the tail starts: each line counts once.
    monkeypatch.setattr(ca, "TRANSCRIPT_MAX_BYTES", 600)
    write = {"type": "assistant", "sessionId": "s", "timestamp": iso(1), "message": {"content": [{"type": "tool_use", "name": "Write", "input": {"file_path": "/a/w.md"}}]}}
    side = {"type": "assistant", "isSidechain": True, "message": {"usage": {"input_tokens": 7}}}
    path = write_lines(tmp_path / "big.jsonl", [write, *[side] * 30, _usage_line(50), write])
    ca._TRANSCRIPT_CACHE.clear()
    facts = ca._parse_transcript(path)
    assert facts["first_tokens"] == 53
    assert [w["path"] for w in facts["writes"]] == ["/a/w.md", "/a/w.md"]


def test_small_file_read_is_unchanged(tmp_path):
    path = write_lines(tmp_path / "small.jsonl", [_usage_line(10), _usage_line(99)])
    ca._TRANSCRIPT_CACHE.clear()
    assert ca._parse_transcript(path)["first_tokens"] == 13
