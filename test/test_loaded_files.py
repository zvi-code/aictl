"""The instruction files each session loaded: attachments, events, backfill, and API."""

from __future__ import annotations

from pathlib import Path

import pytest

# One clock: iso() counts back from test_board_facts.NOW, so the expected times must too.
from test_board_facts import NOW, claude_path, copilot_events, ev, iso, make_ingester, write_lines

from aictl.dashboard import session_details
from aictl.dashboard.session_details import _agent_record, _session_context_files
from aictl.ingesters import loaded_files, loaded_files_backfill
from aictl.ingesters.loaded_files import claude_attachment, custom_agent_file, in_system_prompt, system_prompt_files
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.records import CallFacts, LoadedFileRow
from aictl.session_facts import SessionFacts
from aictl.stores.testing import MemoryWriter

SESSION = "11111111-1111-4111-8111-111111111111"
COPILOT_SID = "22222222-2222-4222-8222-222222222222"


@pytest.fixture
def db():
    return SessionFacts(MemoryWriter(), content_days=36500)


def loaded(db, sid: str) -> list[tuple]:
    return sorted({tuple(r[k] for k in ("path", "how", "detail", "agent_id"))
                   for r in db.writer.written("session_loaded_files") if r["session_id"] == sid})


def _ingest(db, root):
    ingester = make_ingester(None, root, fact_target=db, backfill_days=36500)
    ingester.poll()
    ingester.facts.flush()
    return ingester


def attachment(ago: float, att: dict, **extra) -> dict:
    return {"type": "attachment", "timestamp": iso(ago), "sessionId": SESSION, "cwd": "/work/proj", "attachment": att, **extra}


INSTRUCTIONS = {
    "type": "instructions",
    "files": [
        {"path": "/home/u/.claude/CLAUDE.md", "type": "User", "content": "# rules"},
        {"path": "/work/proj/AGENTS.md", "type": "Project", "content": "# project"},
    ],
}


def _lines(prefix: str, n: int) -> list[str]:
    return [f"{prefix} rule number {i}: always do the thing the way it is written here" for i in range(n)]


# ── Claude Code ───────────────────────────────────────────────────────


class TestClaudeAttachments:
    def test_parse_keeps_file_paths_and_drops_non_path_skills(self):
        assert claude_attachment(INSTRUCTIONS) == [
            ("/home/u/.claude/CLAUDE.md", "instructions", "User"),
            ("/work/proj/AGENTS.md", "instructions", "Project"),
        ]
        assert claude_attachment({"type": "nested_memory", "path": "/work/proj/sub/CLAUDE.md", "displayPath": "sub/CLAUDE.md"}) == [
            ("/work/proj/sub/CLAUDE.md", "nested_memory", "")
        ]
        skills = {"type": "invoked_skills", "skills": [{"name": "ste100", "path": "userSettings:ste100"}, {"name": "simplify", "path": "bundled:simplify"}, {"name": "x", "path": "/home/u/.claude/skills/x/SKILL.md"}]}
        assert claude_attachment(skills) == [("/home/u/.claude/skills/x/SKILL.md", "skill", "")]
        assert claude_attachment({"type": "total_tokens_reminder"}) == []
        assert claude_attachment(None) == []

    def test_repeats_after_compactions_are_one_row_with_the_first_time(self, db, tmp_path):
        write_lines(
            claude_path(tmp_path),
            [attachment(500, INSTRUCTIONS), attachment(300, INSTRUCTIONS), attachment(100, INSTRUCTIONS)],
        )
        ingester = _ingest(db, tmp_path)
        assert loaded(db, SESSION) == [
            ("/home/u/.claude/CLAUDE.md", "instructions", "User", ""),
            ("/work/proj/AGENTS.md", "instructions", "Project", ""),
        ]
        original = db.writer.written("session_loaded_files")
        assert [r["ts"] for r in original] == pytest.approx([NOW - 500] * 2, abs=1)
        # A later poll can send another observation of the same files.
        write_lines(claude_path(tmp_path), [attachment(50, INSTRUCTIONS)])
        ingester.poll()
        ingester.facts.flush()
        rows = db.writer.written("session_loaded_files")
        for row in original:
            matching = [r for r in rows if (r["path"], r["how"]) == (row["path"], row["how"])]
            assert min(r["ts"] for r in matching) == row["ts"]
            assert {r["session_id"] for r in matching} == {SESSION}

    def test_a_sidechain_line_carries_its_agent(self, db, tmp_path):
        nested = {"type": "nested_memory", "path": "/work/proj/sub/CLAUDE.md"}
        write_lines(claude_path(tmp_path), [attachment(100, nested, isSidechain=True, agentId="agent-1")])
        _ingest(db, tmp_path)
        assert loaded(db, SESSION) == [("/work/proj/sub/CLAUDE.md", "nested_memory", "", "agent-1")]


# ── Copilot CLI ───────────────────────────────────────────────────────


def _repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    (repo / ".github" / "agents").mkdir(parents=True)
    (repo / ".github" / "instructions").mkdir(parents=True)
    (repo / ".github" / "copilot-instructions.md").write_text("---\napplyTo: '**'\n---\n# Title\n" + "\n".join(_lines("repo", 12)) + "\n")
    (repo / ".github" / "agents" / "Intake.agent.md").write_text("---\nname: intake\n---\n" + "\n".join(_lines("intake", 10)) + "\n")
    (repo / ".github" / "instructions" / "kql.instructions.md").write_text("---\napplyTo: '**/*.kql'\n---\n" + "\n".join(_lines("kql", 9)) + "\n")
    return repo


class TestCopilotRules:
    def test_custom_agent_resolves_with_any_case(self, tmp_path):
        repo = _repo(tmp_path)
        assert custom_agent_file(str(repo), "intake") == str(repo / ".github" / "agents" / "Intake.agent.md")
        assert custom_agent_file(str(repo), "missing") == ""
        assert custom_agent_file("", "intake") == ""

    def test_half_of_the_lines_rule(self, tmp_path):
        repo = _repo(tmp_path)
        instructions = repo / ".github" / "copilot-instructions.md"
        agent = repo / ".github" / "agents" / "Intake.agent.md"
        kql = repo / ".github" / "instructions" / "kql.instructions.md"
        # All of the instructions, 5 of 10 lines of the agent (exactly half), none of kql; front matter is not a sample line.
        content = "You are Copilot.\n" + "\n".join(_lines("repo", 12)) + "\n" + "\n".join(_lines("intake", 5)) + "\napplyTo: '**/*.kql'"
        assert in_system_prompt(content, str(instructions)) == (12, 12)
        assert in_system_prompt(content, str(agent)) == (5, 10)
        assert in_system_prompt(content, str(kql)) is None
        # 4 of 10 is below half.
        assert in_system_prompt("\n".join(_lines("intake", 4)), str(agent)) is None
        assert sorted(system_prompt_files(content, str(repo))) == [
            (str(agent), "5 of 10 lines"),
            (str(instructions), "12 of 12 lines"),
        ]

    def test_fewer_than_three_matched_lines_is_not_loaded(self, tmp_path):
        small = tmp_path / "AGENTS.md"
        small.write_text("\n".join(_lines("tiny", 2)) + "\n")
        assert in_system_prompt("\n".join(_lines("tiny", 2)), str(small)) is None

    def test_events_record_skill_custom_agent_and_system_prompt_not_the_prompt(self, db, tmp_path):
        repo = _repo(tmp_path)
        skill = repo / ".github" / "skills" / "method" / "SKILL.md"
        prompt = "\n".join(_lines("repo", 12)) + "\n" + "\n".join(_lines("intake", 8))
        write_lines(
            copilot_events(tmp_path, COPILOT_SID),
            [
                ev("session.start", 500, {"context": {"cwd": str(repo), "gitRoot": str(repo)}}),
                ev("subagent.selected", 490, {"agentName": "intake"}),
                ev("system.message", 480, {"role": "system", "content": prompt}),
                ev("skill.invoked", 400, {"name": "method", "path": str(skill), "source": "project"}),
                ev("skill.invoked", 390, {"name": "builtin", "path": "builtin:x"}),
            ],
        )
        _ingest(db, tmp_path)
        agent = str(repo / ".github" / "agents" / "Intake.agent.md")
        assert loaded(db, COPILOT_SID) == [
            (str(repo / ".github" / "agents" / "Intake.agent.md"), "custom_agent", "", ""),
            (agent, "system_prompt", "8 of 10 lines", ""),
            (str(repo / ".github" / "copilot-instructions.md"), "system_prompt", "12 of 12 lines", ""),
            (str(skill), "skill", "", ""),
        ]
        # The skill use itself is still recorded.
        assert sorted(r["name"] for r in db.writer.written("skill_uses")) == ["builtin", "method"]
        # No column keeps the text of the system prompt.
        assert all("rule number" not in r["detail"] for r in db.writer.written("session_loaded_files"))


# ── Schema v35, project stores, backfill ─────────────────────────────


def test_loaded_file_observations_keep_their_time_and_agent(db):
    row = LoadedFileRow(session_id="s", path="/a/AGENTS.md", how="instructions", ts=200.0, detail="Project", tool="claude-code", agent_id="late")
    db.write_call_facts(CallFacts(loaded_files=[row]))
    first = LoadedFileRow(session_id="s", path="/a/AGENTS.md", how="instructions", ts=100.0, detail="Project", tool="claude-code")
    db.write_call_facts(CallFacts(loaded_files=[first]))
    db.write_call_facts(CallFacts(loaded_files=[LoadedFileRow(session_id="s", path="/a/AGENTS.md", how="instructions", ts=300.0)]))
    assert [r["ts"] for r in db.writer.written("session_loaded_files")] == [row.ts, first.ts, 300.0]


def _factory(root: Path):
    def make(target):
        return TranscriptUsageIngester(
            target,
            claude_projects=root / "claude" / "projects",
            codex_sessions=root / "codex",
            copilot_state=root / "copilot" / "session-state",
            vscode_workspaces=root / "vscode" / "workspaceStorage",
            backfill_days=loaded_files_backfill.ALL_DAYS,
        )

    return make


class TestBackfill:
    def test_old_sessions_get_their_rows_once_and_nothing_else(self, tmp_path):
        from aictl.session_facts import SessionFacts
        from aictl.state_file import StateFile
        from aictl.stores.testing import MemoryWriter

        # Older than the live reader's 30-day window.
        old = {"type": "attachment", "timestamp": iso(90 * 86400), "sessionId": SESSION, "attachment": INSTRUCTIONS}
        path = claude_path(tmp_path)
        write_lines(path, [old])
        stamp = NOW - 90 * 86400
        import os

        os.utime(path, (stamp, stamp))
        writer = MemoryWriter()
        target = SessionFacts(writer)
        state = StateFile(tmp_path / "loaded.json")
        assert loaded_files_backfill.run(target, state, _factory(tmp_path)) is True
        [(op, table, rows)] = writer.operations
        assert (op, table) == ("append", "session_loaded_files")
        assert {r["path"] for r in rows} == {"/home/u/.claude/CLAUDE.md", "/work/proj/AGENTS.md"}
        assert state.read().get(loaded_files_backfill.STATE_KEY)

        def never(target):
            raise AssertionError("the backfill ran twice")

        assert loaded_files_backfill.run(target, state, never) is True

    def test_a_write_that_keeps_failing_runs_again(self, tmp_path):
        from aictl.session_facts import SessionFacts
        from aictl.state_file import StateFile
        from aictl.stores.base import StoreError
        from aictl.stores.testing import MemoryWriter

        write_lines(claude_path(tmp_path), [attachment(100, INSTRUCTIONS)])
        writer = MemoryWriter()
        target = SessionFacts(writer)
        state = StateFile(tmp_path / "loaded.json")

        def disconnected(table, rows):
            raise StoreError("offline")

        writer.append = disconnected
        assert loaded_files_backfill.run(target, state, _factory(tmp_path)) is False
        assert not state.read()


# ── API ───────────────────────────────────────────────────────────────


class TestApi:
    def _seed(self, db, project: str) -> None:
        db.insert("session_loaded_files", session_id="s", path=f"{project}/AGENTS.md", how="instructions",
                  ts=20.0, detail="Project")
        db.insert("session_loaded_files", session_id="s", path="/home/u/.claude/CLAUDE.md", how="instructions",
                  ts=10.0, detail="User")
        db.insert("session_loaded_files", session_id="s", path=f"{project}/sub/CLAUDE.md", how="nested_memory",
                  ts=30.0, agent_id="sub-1")

    def _record(self, db, project, agent, root):
        from aictl.dashboard.projections.history import HistoryScope, typed_rows

        history = HistoryScope.local(db)
        facts = typed_rows(history.read("sequence.context", sid="s"))
        return _agent_record(db, None, {"project_path": project}, "s", {"id": agent}, root,
                             history, context_facts=facts)

    def test_loaded_is_sorted_by_time_and_marks_files(self, kusto_store, monkeypatch):
        db = kusto_store
        project = "/work/proj"
        self._seed(db, project)
        instructions = f"{project}/.github/copilot-instructions.md"
        db.insert("files", path=instructions, tool="copilot-cli", scope="project")
        monkeypatch.setattr(
            "aictl.tree_walk.files_for_folder", lambda _: pytest.fail("The historical inventory was not used")
        )
        cf = self._record(db, project, "s", True)["context_files"]
        assert [(e["path"], e["how"], e["detail"], e["ts"]) for e in cf["loaded"]] == [
            ("/home/u/.claude/CLAUDE.md", "instructions", "User", 10.0),
            (f"{project}/AGENTS.md", "instructions", "Project", 20.0),
            (f"{project}/sub/CLAUDE.md", "nested_memory", "", 30.0),
        ]
        assert cf["loaded"][0]["name"] == "CLAUDE.md"
        assert cf["source"] == "kusto.queryable"
        assert {file["path"] for file in cf["files"] if file.get("loaded")} == {row["path"] for row in cf["loaded"]}
        assert {"path": instructions, "name": "copilot-instructions.md"} in cf["files"]

    def test_a_subagent_gets_its_own_rows_else_the_main_agents(self, kusto_store, monkeypatch):
        from aictl import tree_walk

        db = kusto_store
        self._seed(db, "/work/proj")
        monkeypatch.setattr(tree_walk, "files_for_folder", lambda folder: {"git_root": None, "read": False, "files": []})
        own = self._record(db, "/work/proj", "sub-1", False)
        assert [e["path"] for e in own["context_files"]["loaded"]] == ["/work/proj/sub/CLAUDE.md"]
        assert own["artifacts"] == []
        other = self._record(db, "/work/proj", "sub-2", False)
        assert [e["path"] for e in other["context_files"]["loaded"]] == ["/home/u/.claude/CLAUDE.md", "/work/proj/AGENTS.md"]

    def test_no_rows_and_no_folder(self):
        assert _session_context_files("") == {"git_root": None, "read": False, "files": [], "total": 0, "loaded": []}


def test_how_values_are_the_api_values():
    assert {loaded_files.INSTRUCTIONS, loaded_files.NESTED_MEMORY, loaded_files.SKILL, loaded_files.CUSTOM_AGENT, loaded_files.SYSTEM_PROMPT} == {
        "instructions", "nested_memory", "skill", "custom_agent", "system_prompt"
    }
    assert session_details._loaded_files.__doc__
