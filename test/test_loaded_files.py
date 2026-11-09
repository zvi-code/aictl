"""The instruction files each session loaded: Claude attachments, Copilot events, v35, the backfill, the API."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

# One clock: iso() counts back from test_board_facts.NOW, so the expected times must too.
from test_board_facts import NOW, claude_path, copilot_events, ev, iso, make_ingester, write_lines

from aictl.dashboard import board_api
from aictl.dashboard.board_api import _agent_record, _session_context_files
from aictl.ingesters import loaded_files, loaded_files_backfill
from aictl.ingesters.loaded_files import claude_attachment, custom_agent_file, in_system_prompt, system_prompt_files
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.project_stores import ProjectStores, store_key
from aictl.storage import CallFacts, HistoryDB, LoadedFileRow

SESSION = "11111111-1111-4111-8111-111111111111"
COPILOT_SID = "22222222-2222-4222-8222-222222222222"


@pytest.fixture
def db(tmp_path):
    store = HistoryDB(tmp_path / "history.db", flush_interval=0)
    yield store
    store.close()


def loaded(db, sid: str) -> list[tuple]:
    return db._conn().execute(
        "SELECT path, how, detail, agent_id FROM session_loaded_files WHERE session_id = ? ORDER BY path, how", (sid,)
    ).fetchall()


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
        make_ingester(db, tmp_path).poll()
        assert loaded(db, SESSION) == [
            ("/home/u/.claude/CLAUDE.md", "instructions", "User", ""),
            ("/work/proj/AGENTS.md", "instructions", "Project", ""),
        ]
        ts = db._conn().execute("SELECT MIN(ts), MAX(ts) FROM session_loaded_files").fetchone()
        assert ts[0] == pytest.approx(NOW - 500, abs=1) and ts[1] == pytest.approx(NOW - 500, abs=1)
        # A later poll that reads the repeat again keeps the first time.
        write_lines(claude_path(tmp_path), [attachment(50, INSTRUCTIONS)])
        make_ingester(db, tmp_path).poll()
        assert db._conn().execute("SELECT MAX(ts) FROM session_loaded_files").fetchone()[0] == pytest.approx(NOW - 500, abs=1)

    def test_a_sidechain_line_carries_its_agent(self, db, tmp_path):
        nested = {"type": "nested_memory", "path": "/work/proj/sub/CLAUDE.md"}
        write_lines(claude_path(tmp_path), [attachment(100, nested, isSidechain=True, agentId="agent-1")])
        make_ingester(db, tmp_path).poll()
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
        make_ingester(db, tmp_path).poll()
        agent = str(repo / ".github" / "agents" / "Intake.agent.md")
        assert loaded(db, COPILOT_SID) == [
            (str(repo / ".github" / "agents" / "Intake.agent.md"), "custom_agent", "", ""),
            (agent, "system_prompt", "8 of 10 lines", ""),
            (str(repo / ".github" / "copilot-instructions.md"), "system_prompt", "12 of 12 lines", ""),
            (str(skill), "skill", "", ""),
        ]
        # The skill use itself is still recorded.
        assert db._conn().execute("SELECT name FROM skill_uses ORDER BY name").fetchall() == [("builtin",), ("method",)]
        # No column keeps the text of the system prompt.
        assert not db._conn().execute("SELECT 1 FROM session_loaded_files WHERE detail LIKE '%rule number%'").fetchall()


# ── Schema v35, project stores, backfill ─────────────────────────────


def test_a_v34_store_gets_the_table_and_a_rerun_changes_nothing(tmp_path):
    from aictl.storage_migrations import CURRENT_VERSION, m035_session_loaded_files

    path = tmp_path / "old.db"
    HistoryDB(db_path=str(path), flush_interval=0).close()
    conn = sqlite3.connect(path)
    conn.execute("DROP TABLE session_loaded_files")
    conn.execute("DELETE FROM schema_version WHERE version > 34")
    conn.commit()
    conn.close()
    store = HistoryDB(db_path=str(path), flush_interval=0)
    try:
        conn = store._conn()
        assert conn.execute("SELECT 1 FROM sqlite_master WHERE name = 'session_loaded_files'").fetchone()
        assert conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0] == CURRENT_VERSION >= 35
        m035_session_loaded_files.apply(conn)
        cols = [r[1] for r in conn.execute("PRAGMA table_info(session_loaded_files)")]
        assert cols == ["session_id", "path", "how", "detail", "ts", "tool", "agent_id"]
    finally:
        store.close()


def test_the_upsert_keeps_the_first_time_and_agent(db):
    row = LoadedFileRow(session_id="s", path="/a/AGENTS.md", how="instructions", ts=200.0, detail="Project", tool="claude-code", agent_id="late")
    db.write_call_facts(CallFacts(loaded_files=[row]))
    first = LoadedFileRow(session_id="s", path="/a/AGENTS.md", how="instructions", ts=100.0, detail="Project", tool="claude-code")
    db.write_call_facts(CallFacts(loaded_files=[first]))
    db.write_call_facts(CallFacts(loaded_files=[LoadedFileRow(session_id="s", path="/a/AGENTS.md", how="instructions", ts=300.0)]))
    assert db._conn().execute("SELECT ts, agent_id, detail, tool FROM session_loaded_files").fetchall() == [(100.0, "", "Project", "claude-code")]


def test_project_stores_write_the_rows_to_the_session_store(tmp_path):
    from aictl.storage import SessionRow

    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    stores = ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0)
    try:
        stores.upsert_session(SessionRow(session_id="s", tool="claude-code", project_path=str(repo), started_at=NOW - 200))
        stores.write_call_facts(
            CallFacts(loaded_files=[LoadedFileRow(session_id="s", path=str(repo / "AGENTS.md"), how="instructions", ts=NOW - 100, project_path=str(repo))])
        )
        conn = sqlite3.connect(stores._file_of(store_key(str(repo))))
        try:
            assert conn.execute("SELECT session_id, how FROM session_loaded_files").fetchall() == [("s", "instructions")]
        finally:
            conn.close()
        assert stores._conn().execute("SELECT path FROM session_loaded_files").fetchall() == [(str(repo / "AGENTS.md"),)]
    finally:
        stores.close()


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
    def test_old_sessions_get_their_rows_once_and_nothing_else(self, db, tmp_path):
        # Older than the live reader's 30-day window.
        old = {"type": "attachment", "timestamp": iso(90 * 86400), "sessionId": SESSION, "attachment": INSTRUCTIONS}
        path = claude_path(tmp_path)
        write_lines(path, [old])
        stamp = NOW - 90 * 86400
        import os

        os.utime(path, (stamp, stamp))
        assert loaded_files_backfill.run(db, _factory(tmp_path)) is True
        assert [r[0] for r in loaded(db, SESSION)] == ["/home/u/.claude/CLAUDE.md", "/work/proj/AGENTS.md"]
        assert db._conn().execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0
        assert db.state_value(loaded_files_backfill.STATE_KEY) is not None

        def never(target):
            raise AssertionError("the backfill ran twice")

        assert loaded_files_backfill.run(db, never) is True

    def test_a_write_that_keeps_failing_runs_again(self, db, tmp_path, monkeypatch):
        write_lines(claude_path(tmp_path), [attachment(100, INSTRUCTIONS)])
        monkeypatch.setattr(loaded_files_backfill, "LOCK_RETRY_S", 0.0)

        def locked(facts):
            raise sqlite3.OperationalError("database is locked")

        monkeypatch.setattr(db, "write_call_facts", locked)
        assert loaded_files_backfill.run(db, _factory(tmp_path)) is False
        assert db.state_value(loaded_files_backfill.STATE_KEY) is None


# ── API ───────────────────────────────────────────────────────────────


class TestApi:
    def _seed(self, db, project: str) -> None:
        rows = [
            LoadedFileRow(session_id="s", path=f"{project}/AGENTS.md", how="instructions", ts=20.0, detail="Project"),
            LoadedFileRow(session_id="s", path="/home/u/.claude/CLAUDE.md", how="instructions", ts=10.0, detail="User"),
            LoadedFileRow(session_id="s", path=f"{project}/sub/CLAUDE.md", how="nested_memory", ts=30.0, agent_id="sub-1"),
        ]
        db.write_call_facts(CallFacts(loaded_files=rows))

    def test_loaded_is_sorted_by_time_and_marks_files(self, db, monkeypatch):
        from aictl import tree_walk

        project = "/work/proj"
        self._seed(db, project)
        monkeypatch.setattr(
            tree_walk, "files_for_folder",
            lambda folder: {"git_root": project, "read": True, "files": [f"{project}/AGENTS.md", f"{project}/.github/copilot-instructions.md"]},
        )
        cf = _agent_record(db, db._conn(), {"project_path": project}, "s", {"id": "s"}, True)["context_files"]
        assert [(e["path"], e["how"], e["detail"], e["ts"]) for e in cf["loaded"]] == [
            ("/home/u/.claude/CLAUDE.md", "instructions", "User", 10.0),
            (f"{project}/AGENTS.md", "instructions", "Project", 20.0),
            (f"{project}/sub/CLAUDE.md", "nested_memory", "", 30.0),
        ]
        assert cf["loaded"][0]["name"] == "CLAUDE.md"
        assert cf["files"] == [
            {"path": f"{project}/AGENTS.md", "name": "AGENTS.md", "loaded": True},
            {"path": f"{project}/.github/copilot-instructions.md", "name": "copilot-instructions.md"},
        ]

    def test_a_subagent_gets_its_own_rows_else_the_main_agents(self, db, monkeypatch):
        from aictl import tree_walk

        self._seed(db, "/work/proj")
        monkeypatch.setattr(tree_walk, "files_for_folder", lambda folder: {"git_root": None, "read": False, "files": []})
        own = _agent_record(db, db._conn(), {"project_path": "/work/proj"}, "s", {"id": "sub-1"}, False)
        assert [e["path"] for e in own["context_files"]["loaded"]] == ["/work/proj/sub/CLAUDE.md"]
        assert own["artifacts"] == []
        other = _agent_record(db, db._conn(), {"project_path": "/work/proj"}, "s", {"id": "sub-2"}, False)
        assert [e["path"] for e in other["context_files"]["loaded"]] == ["/home/u/.claude/CLAUDE.md", "/work/proj/AGENTS.md"]

    def test_no_rows_and_no_folder(self, db):
        assert _session_context_files("") == {"git_root": None, "read": False, "files": [], "total": 0, "loaded": []}


def test_how_values_are_the_api_values():
    assert {loaded_files.INSTRUCTIONS, loaded_files.NESTED_MEMORY, loaded_files.SKILL, loaded_files.CUSTOM_AGENT, loaded_files.SYSTEM_PROMPT} == {
        "instructions", "nested_memory", "skill", "custom_agent", "system_prompt"
    }
    assert board_api._loaded_files.__doc__
