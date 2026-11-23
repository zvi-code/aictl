"""Which files of a Claude Code or Copilot CLI session folder are read, ignored with a reason, or reported.

Invented lines in a temporary folder only; nothing here reads a real session folder.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from core_store_fakes import UsageFacts

from aictl.ingesters import session_files
from aictl.ingesters.transcript_usage import TranscriptUsageIngester

SID = "aaaaaaaa-0000-4000-8000-00000000000a"
NOW = time.time()


def iso(ago: float) -> str:
    return datetime.fromtimestamp(NOW - ago, timezone.utc).isoformat().replace("+00:00", "Z")


def write(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows))


def reply(sid: str, mid: str, ago: float, agent: str = "") -> dict:
    return {"type": "assistant", "sessionId": sid, "uuid": f"u-{mid}", "timestamp": iso(ago), "requestId": f"r-{mid}",
            "isSidechain": bool(agent), **({"agentId": agent} if agent else {}),
            "message": {"id": mid, "model": "claude-sonnet-4-5", "role": "assistant",
                        "content": [{"type": "text", "text": "done"}],
                        "usage": {"input_tokens": 10, "output_tokens": 5}}}


class Quality:
    def __init__(self):
        self.events = []

    def record_data_quality(self, component, status, **kw):
        self.events.append((component, status, kw))


def reader(tmp_path: Path, **kw) -> TranscriptUsageIngester:
    return TranscriptUsageIngester(UsageFacts(), claude_projects=tmp_path / "claude", codex_sessions=tmp_path / "codex",
                                   copilot_state=tmp_path / "copilot", vscode_workspaces=tmp_path / "vscode", **kw)


def claude_tree(tmp_path: Path) -> Path:
    """A session with a plain subagent and a workflow run: two agents and the run's journal."""
    session = tmp_path / "claude" / "-work-p"
    write(session / f"{SID}.jsonl", [reply(SID, "m1", 600)])
    write(session / SID / "subagents" / "agent-plain.jsonl", [reply(SID, "m2", 500, "plain")])
    run = session / SID / "subagents" / "workflows" / "wf_0001-abc"
    write(run / "agent-wf1.jsonl", [reply(SID, "m3", 400, "wf1")])
    (run / "agent-wf1.meta.json").write_text(json.dumps({"agentType": "worker", "toolUseId": "toolu_wf1",
                                                         "description": "invented workflow step"}))
    write(run / "journal.jsonl", [{"type": "started", "agentId": "wf1"}, {"type": "result", "agentId": "wf1"},
                                  {"type": "launched", "agentId": "wf2"}, {"type": "failed", "agentId": "wf2"}])
    return session


def test_a_workflow_journal_is_ignored_with_its_reason():
    assert session_files.classify("claude-code", "journal.jsonl") == "ignored"
    assert "journal" in session_files.RULES["claude-code"].ignored["journal.jsonl"]
    # The rule names that one file only: a transcript keeps being read.
    assert session_files.classify("claude-code", "agent-journal.jsonl") == "read"


def test_the_journal_is_not_read_as_an_agent_and_workflow_agents_belong_to_their_session(tmp_path):
    claude_tree(tmp_path)
    ing = reader(tmp_path)
    ing.poll()
    read = {p.name for p, (tool, _, _) in ing._found.items() if tool == "claude-code"}
    assert read == {f"{SID}.jsonl", "agent-plain.jsonl", "agent-wf1.jsonl"}
    agents = {(row["session_id"], row["agent_id"]) for row in ing.store.writer.written("agents")}
    assert agents == {(SID, "plain"), (SID, "wf1")}
    sessions = {TranscriptUsageIngester._source_session("claude-code", p) for p in ing._found}
    assert sessions == {SID}


def test_the_agent_meta_pass_reads_the_meta_files_of_workflow_agents(tmp_path):
    session = claude_tree(tmp_path)
    (session / SID / "subagents" / "agent-plain.meta.json").write_text(json.dumps({"toolUseId": "toolu_plain"}))
    found = reader(tmp_path).scan_agent_meta()
    assert set(found) == {(SID, "plain"), (SID, "wf1")}
    assert found[(SID, "wf1")]["toolUseId"] == "toolu_wf1"


def test_the_reader_reports_a_claude_and_a_copilot_file_form_it_does_not_know(tmp_path):
    claude_tree(tmp_path)
    (tmp_path / "claude" / "-work-p" / f"{SID}.jsonl.zst").write_bytes(b"x")
    events = tmp_path / "copilot" / "bbbbbbbb-0000-4000-8000-00000000000b"
    write(events / "events.jsonl", [{"type": "session.start", "timestamp": iso(300), "data": {}}])
    (events / "events.jsonl.1").write_bytes(b"{}\n")
    quality = Quality()
    reader(tmp_path, quality=quality).poll()
    _, status, kw = quality.events[-1]
    assert status == "degraded"
    assert kw["detail"]["unclaimed_files"] == {"claude-code": 1, "copilot-cli": 1}
    assert "Claude Code projects folder" in kw["message"] and "Copilot session-state folder" in kw["message"]


def test_every_file_form_of_a_real_shaped_tree_has_a_rule(tmp_path):
    # The guard: every session-like name in these trees (shaped as the tools write them) is read
    # or ignored with a reason. A new form added here without a rule fails this test.
    claude_tree(tmp_path)
    run = tmp_path / "claude" / "-work-p" / SID / "subagents" / "workflows" / "wf_0001-abc"
    (run / "agent-wf1.prefix.json").write_text("{}")
    (tmp_path / "claude" / "-work-p" / f"{SID}.jsonl.bak").write_text("{}\n")
    events = tmp_path / "copilot" / "bbbbbbbb-0000-4000-8000-00000000000b"
    write(events / "events.jsonl", [{"type": "session.start", "timestamp": iso(300), "data": {}}])
    for name in ("workspace.yaml", "session.db", "inuse.123.lock", "vscode.metadata.json"):
        (events / name).write_text("")
    for tool, root in (("claude-code", tmp_path / "claude"), ("copilot-cli", tmp_path / "copilot")):
        _, unclaimed = session_files.scan(tool, root)
        assert unclaimed == [], tool
