"""The session record: the index of session folders, artifacts, commits with pull requests,
the search over all sessions, viewing an artifact, and the one-time tool size backfill."""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from types import SimpleNamespace

import pytest
from kusto_replay import NOW

from aictl.dashboard import board_projection, session_record
from aictl.dashboard.board_routes import handle_get
from aictl.dashboard.session_details import agent_detail
from aictl.dashboard.session_record import PullRequestFinder, is_recorded_artifact, is_text_file, search_sessions
from aictl.ingesters import session_artifacts
from aictl.ingesters.session_artifacts import SessionArtifactIndexer, scan_folder
from aictl.session_evidence import SessionEvidence
from aictl.session_facts import SessionFacts
from aictl.stores.base import StoreError
from aictl.stores.testing import MemoryWriter

SID = "aaaaaaaa-1111-4111-8111-111111111111"
SID2 = "bbbbbbbb-2222-4222-8222-222222222222"


@pytest.fixture
def db(kusto_store):
    return kusto_store


@pytest.fixture(autouse=True)
def _fresh_memos(monkeypatch):
    session_record._attributed.clear()
    # No test may run the real gh: an answer from a fake finder only.
    monkeypatch.setattr(session_record, "PR_FINDER", PullRequestFinder(which=lambda name: None, background=False))
    for memo in (board_projection._facts_memo, board_projection._sources_memo, board_projection._disk_prompts_memo):
        memo.clear()
    monkeypatch.setattr(board_projection, "_process_start", lambda pid: 0.0)
    monkeypatch.setattr(session_record, "time", SimpleNamespace(time=lambda: NOW, monotonic=time.monotonic))


def _write(path: Path, text: str = "x", mtime: float | None = None) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    if mtime is not None:
        os.utime(path, (mtime, mtime))
    return path


def _copilot_folder(root: Path, sid: str = SID) -> Path:
    folder = root / "session-state" / sid
    _write(folder / "events.jsonl", "{}\n")
    _write(folder / "workspace.yaml", "id: x\n")
    _write(folder / "session.db", "db")
    _write(folder / "inuse.123.lock", "")
    _write(folder / "files" / "report.md", "# Report\n")
    _write(folder / "research" / "notes.txt", "notes")
    _write(folder / "checkpoints" / "001.md", "checkpoint")
    _write(folder / "plan.md", "plan")
    return folder


def _indexer(store, copilot: Path | None = None, claude: Path | None = None, codex: Path | None = None) -> SessionArtifactIndexer:
    roots = {"copilot": [copilot] if copilot else [], "claude": [claude] if claude else [], "codex": [codex] if codex else []}
    return SessionArtifactIndexer(store, roots=roots)


def _session(store, sid, tool, project, started, ended=None, **extra):
    store.insert("sessions", session_id=sid, tool=tool, project_path=project, started_at=started, ended_at=ended, **extra)


def _artifact_rows(db, sid=SID) -> dict[str, tuple]:
    return {
        Path(row["path"]).name: (row["folder"], row["size_bytes"])
        for row in db.writer.written("session_artifacts") if row["session_id"] == sid
    }




# ─── Index of session folders ─────────────────────────────────────


class TestIndex:
    @pytest.fixture
    def db(self):
        return SessionEvidence(SessionFacts(MemoryWriter()))

    def test_copilot_folder_files_are_indexed_without_the_tools_own_records(self, db, tmp_path):
        _copilot_folder(tmp_path / "copilot")
        assert _indexer(db, copilot=tmp_path / "copilot" / "session-state").poll() == 1
        assert _artifact_rows(db) == {
            "report.md": ("files", 9),
            "notes.txt": ("research", 5),
            "001.md": ("checkpoints", 10),
            "plan.md": ("", 4),
        }
        row, = db.writer.written("session_folders")
        assert (Path(row["folder"]).name, row["files_total"], row["bytes_total"]) == (SID, 4, 28)

    def test_an_unchanged_folder_is_skipped_and_a_new_file_is_found(self, db, tmp_path):
        folder = _copilot_folder(tmp_path / "copilot")
        indexer = _indexer(db, copilot=tmp_path / "copilot" / "session-state")
        assert indexer.poll() == 1
        assert indexer.poll() == 0
        new = _write(folder / "files" / "second.md", "more")
        later = time.time() + 5
        os.utime(new.parent, (later, later))
        assert indexer.poll() == 1
        assert "second.md" in _artifact_rows(db)

    def test_a_restart_does_not_scan_unchanged_folders_again(self, tmp_path):
        from aictl.session_evidence import SessionEvidence
        from aictl.session_facts import SessionFacts
        from aictl.state_file import StateFile
        from aictl.stores.testing import MemoryWriter

        _copilot_folder(tmp_path / "copilot")
        state = StateFile(tmp_path / "session_artifacts.json")
        sessions = SessionFacts(MemoryWriter())
        root = tmp_path / "copilot" / "session-state"
        assert _indexer(SessionEvidence(sessions, state), copilot=root).poll() == 1
        assert _indexer(SessionEvidence(sessions, state), copilot=root).poll() == 0

    def test_a_huge_folder_keeps_the_newest_files_and_the_real_count(self, db, tmp_path, monkeypatch):
        monkeypatch.setattr(session_artifacts, "MAX_FILES_PER_SESSION", 3)
        folder = tmp_path / "copilot" / "session-state" / SID
        for k in range(5):
            _write(folder / "files" / f"f{k}.txt", "ab", mtime=NOW - 100 + k)
        _indexer(db, copilot=tmp_path / "copilot" / "session-state").poll()
        assert sorted(_artifact_rows(db)) == ["f2.txt", "f3.txt", "f4.txt"]
        row, = db.writer.written("session_folders")
        assert (row["files_total"], row["bytes_total"]) == (5, 10)

    def test_files_are_only_stat_ed_never_read(self, tmp_path):
        folder = tmp_path / SID
        secret = _write(folder / "files" / "locked.md", "12345")
        secret.chmod(0)
        try:
            files, total, size = scan_folder("copilot", folder)
        finally:
            secret.chmod(0o600)
        assert (total, size, files[0][2]) == (1, 5, 5)

    def test_claude_session_folders_are_indexed_and_other_folders_are_not(self, db, tmp_path):
        projects = tmp_path / "claude" / "projects"
        _write(projects / "-work-proj" / SID / "subagents" / "agent-1.jsonl", "{}\n")
        _write(projects / "-work-proj" / SID / "tool-results" / "r.txt", "out")
        _write(projects / "-work-proj" / f"{SID}.jsonl", "{}\n")
        _write(projects / "-work-proj" / "memory" / "MEMORY.md", "m")
        _indexer(db, claude=projects).poll()
        assert _artifact_rows(db) == {"agent-1.jsonl": ("subagents", 3), "r.txt": ("tool-results", 3)}
        row, = db.writer.written("session_folders")
        assert row["tool"] == "claude-code"

    def test_codex_dated_folders_are_not_session_folders(self, db, tmp_path):
        sessions = tmp_path / "codex" / "sessions"
        _write(sessions / "2026" / "03" / "06" / f"rollout-{SID}.jsonl", "{}\n")
        assert _indexer(db, codex=sessions).poll() == 0
        assert db.writer.written("session_artifacts") == []

    def test_a_failed_write_leaves_the_folder_pending_for_the_next_poll(self, db, tmp_path, monkeypatch):
        _copilot_folder(tmp_path / "copilot")
        indexer = _indexer(db, copilot=tmp_path / "copilot" / "session-state")
        real = db.replace_session_artifacts
        calls = []

        def locked(*args, **kwargs):
            calls.append(1)
            if len(calls) == 1:
                raise StoreError("writer unavailable")
            return real(*args, **kwargs)

        monkeypatch.setattr(db, "replace_session_artifacts", locked)
        with pytest.raises(StoreError, match="writer unavailable"):
            indexer.poll()
        assert indexer.poll() == 1
        assert len(_artifact_rows(db)) == 4

# ─── Artifacts and commits of the agent detail ────────────────────


def _seed_detail(db, tmp_path) -> tuple[Path, Path]:
    project = tmp_path / "proj"
    project.mkdir()
    folder = _copilot_folder(tmp_path / "copilot")
    (folder / "files" / "image.png").write_bytes(b"\x89PNG\x00\x00")
    outside = _write(tmp_path / "elsewhere" / "summary.md", "# Summary\n")
    fields = {"session_id": SID, "tool": "copilot-cli", "project_path": str(project)}
    _session(db, SID, "copilot-cli", str(project), NOW - 3600, NOW - 60)
    db.insert("requests", **fields, ts=NOW - 3000, model="gpt-5", input_tokens=10)
    for k, path in enumerate((str(outside), str(outside), str(project / "src" / "a.py"))):
        db.insert("file_write_events", **fields, ts=NOW - 2000 + k, path=path, dedup_key=f"w{k}")
    files, count, size = scan_folder("copilot", folder)
    db.insert("session_folders", session_id=SID, tool="copilot-cli", folder=str(folder), files_total=count, bytes_total=size)
    for path, group, file_size, _mtime in files:
        db.insert("session_artifacts", session_id=SID, path=path, folder=group, size_bytes=file_size, mtime=NOW)
    return project, outside


class TestAgentDetailArtifacts:
    @pytest.fixture
    def db(self, kusto_store):
        return kusto_store

    def test_the_detail_lists_the_files_that_can_affect_the_session(self, db, tmp_path, monkeypatch):
        project, _outside = _seed_detail(db, tmp_path)
        db.insert("files", path=str(project / "AGENTS.md"), tool="copilot-cli", category="instructions", scope="project")
        monkeypatch.setattr(
            "aictl.tree_walk.files_for_folder", lambda _: pytest.fail("The historical inventory was not used")
        )
        cf = agent_detail(db, SID, None, NOW)[1]["context_files"]
        assert cf == {
            "git_root": str(project), "read": True, "total": 1, "source": "kusto.queryable",
            "files": [{"path": str(project / "AGENTS.md"), "name": "AGENTS.md"}], "loaded": [],
        }

    def test_artifacts_are_the_session_folder_and_writes_outside_the_project(self, db, tmp_path):
        project, outside = _seed_detail(db, tmp_path)
        status, detail = agent_detail(db, SID, None, NOW)
        assert status == 200
        by_name = {a["name"]: a for a in detail["artifacts"]}
        assert set(by_name) == {"report.md", "notes.txt", "001.md", "plan.md", "image.png", "summary.md"}
        written = by_name["summary.md"]
        assert (written["kind"], written["folder"], written["writes"], written["path"]) == ("written", "", 2, str(outside))
        assert written["first_ts"] == pytest.approx(NOW - 2000) and written["last_ts"] == pytest.approx(NOW - 1999)
        report = by_name["report.md"]
        assert (report["kind"], report["folder"], report["ext"], report["writes"]) == ("session-folder", "files", "md", 0)
        assert (report["exists"], report["size_bytes"], report["viewable"]) == (None, 9, False)
        assert report["source"] == "kusto.queryable"
        assert by_name["image.png"]["viewable"] is False
        assert detail["artifacts_total"] == 6
        assert detail["artifacts_bytes"] == sum(a["size_bytes"] or 0 for a in detail["artifacts"])

    def test_historical_size_and_mtime_do_not_change_with_local_files(self, db, tmp_path):
        _project, outside = _seed_detail(db, tmp_path)
        outside.unlink()
        report = tmp_path / "copilot" / "session-state" / SID / "files" / "report.md"
        report.write_text("# A longer report now\n", encoding="utf-8", newline="\n")
        by_name = {a["name"]: a for a in agent_detail(db, SID, None, NOW)[1]["artifacts"]}
        assert by_name["summary.md"]["exists"] is None
        assert by_name["summary.md"]["viewable"] is False
        assert by_name["report.md"]["size_bytes"] == 9
        assert by_name["report.md"]["mtime"] == NOW

    def test_a_subagent_has_no_artifacts_of_its_own(self, db, tmp_path):
        _seed_detail(db, tmp_path)
        db.insert("agents", agent_id="sub-1", session_id=SID, tool="copilot-cli", started_at=NOW - 1000)
        db.insert("requests", ts=NOW - 900, session_id=SID, agent_id="sub-1", tool="copilot-cli", model="gpt-5")
        detail = agent_detail(db, "sub-1", None, NOW)[1]
        assert (detail["artifacts"], detail["artifacts_total"], detail["commits"], detail["prs_note"]) == ([], 0, [], "")

    def test_commits_carry_their_pull_requests(self, db, tmp_path, monkeypatch):
        project, _ = _seed_detail(db, tmp_path)
        db.insert("session_commits", session_id=SID, sha="a" * 40, subject="Fix it", author_name="Zvi", ts=NOW - 500)
        db.insert("session_commits", session_id=SID, sha="b" * 40, subject="Older", author_name="Zvi", ts=NOW - 900)
        finder = PullRequestFinder(run=_fake_gh({"a" * 40: [{"number": 12, "url": "https://github.com/o/r/pull/12", "title": "Fix", "state": "MERGED"}]}), which=lambda n: f"/bin/{n}", background=False)
        monkeypatch.setattr(session_record, "PR_FINDER", finder)
        first = agent_detail(db, SID, None, NOW)[1]
        assert [c["short_sha"] for c in first["commits"]] == ["aaaaaaa", "bbbbbbb"]
        assert first["prs_note"] == "looking up pull requests"
        second = agent_detail(db, SID, None, NOW)[1]
        assert second["prs_note"] == ""
        assert second["commits"][0]["prs"] == [{"number": 12, "url": "https://github.com/o/r/pull/12", "title": "Fix", "state": "MERGED"}]
        assert second["commits"][0]["subject"] == "Fix it" and second["commits"][1]["prs"] == []

    def test_without_gh_the_commits_have_no_pull_requests_and_a_note(self, db, tmp_path):
        _seed_detail(db, tmp_path)
        db.insert("session_commits", session_id=SID, sha="c" * 40, subject="x", ts=NOW - 500)
        detail = agent_detail(db, SID, None, NOW)[1]
        assert detail["commits"][0]["prs"] == [] and detail["prs_note"] == "gh not installed"


def _fake_gh(prs_by_sha: dict, remote: str = "origin\thttps://github.com/o/r.git (fetch)\n", calls: list | None = None):
    def run(argv, **kwargs):
        if calls is not None:
            calls.append((argv, kwargs))
        if argv[1:3] == ["remote", "-v"]:
            return SimpleNamespace(returncode=0, stdout=remote, stderr="")
        sha = argv[argv.index("--search") + 1]
        return SimpleNamespace(returncode=0, stdout=json.dumps(prs_by_sha.get(sha, [])), stderr="")

    return run


class TestPullRequestFinder:
    def test_a_repository_that_is_not_on_github_has_no_pull_requests(self, tmp_path):
        finder = PullRequestFinder(run=_fake_gh({}, remote="origin\tgit@gitlab.com:o/r.git (fetch)\n"), which=lambda n: n, background=False)
        assert finder.lookup(str(tmp_path), ["a" * 40]) == ({}, "looking up pull requests")
        assert finder.lookup(str(tmp_path), ["a" * 40]) == ({}, "not a GitHub repo")

    def test_a_failed_gh_call_is_reported_and_not_retried_at_once(self, tmp_path):
        calls: list = []

        def run(argv, **kwargs):
            calls.append(argv)
            if argv[1:3] == ["remote", "-v"]:
                return SimpleNamespace(returncode=0, stdout="https://github.com/o/r", stderr="")
            return SimpleNamespace(returncode=1, stdout="", stderr="gh auth login required\n")

        finder = PullRequestFinder(run=run, which=lambda n: n, background=False)
        finder.lookup(str(tmp_path), ["a" * 40])
        assert finder.lookup(str(tmp_path), ["a" * 40]) == ({}, "gh failed: gh auth login required")
        assert len(calls) == 2

    def test_the_lookup_runs_on_its_own_thread_and_never_opens_a_console(self, tmp_path):
        calls: list = []
        started = threading.Event()

        caller = threading.current_thread()

        def run(argv, **kwargs):
            # On the caller's thread the wait below would never end: fail instead.
            assert threading.current_thread() is not caller, "gh ran on the caller's thread"
            assert started.wait(30), "started was never set"
            return _fake_gh({}, calls=calls)(argv, **kwargs)

        finder = PullRequestFinder(run=run, which=lambda n: n)
        assert finder.lookup(str(tmp_path), ["a" * 40]) == ({}, "looking up pull requests")
        started.set()
        assert finder._thread is not None
        finder._thread.join(timeout=30)
        assert not finder._thread.is_alive(), "finder._thread did not finish: a hang fails the test instead of stalling the run"
        assert finder.lookup(str(tmp_path), ["a" * 40]) == ({"a" * 40: []}, "")
        assert all("creationflags" in kwargs and kwargs["timeout"] for _argv, kwargs in calls)


# ─── Search over all sessions ─────────────────────────────────────


def _seed_search(db, tmp_path) -> None:
    _session(db, "s-old", "claude-code", "/p/alpha", NOW - 9000, NOW - 8000, input_tokens=100, output_tokens=10,
             cost_usd=0.5, tool_call_count=3)
    _session(db, "s-mid", "copilot-cli", "/p/beta", NOW - 5000, NOW - 4000)
    _session(db, "s-new", "copilot-cli", "/p/gamma", NOW - 1000)
    # The board counts the facts, not the totals on the sessions row.
    old = {"session_id": "s-old", "tool": "claude-code", "project_path": "/p/alpha"}
    new = {"session_id": "s-new", "tool": "copilot-cli", "project_path": "/p/gamma"}
    db.insert("requests", **old, ts=NOW - 8950, model="claude-sonnet-4-5", input_tokens=100, output_tokens=10, cost_usd=0.5)
    for k in range(3):
        db.insert("tool_invocations", **old, ts=NOW - 8940 + k, tool_name="Bash")
    db.insert("session_prompts", **old, ts=NOW - 8900, text="Refactor the parser")
    db.insert("session_prompts", **old, ts=NOW - 8800, text="now add the widget")
    db.insert("session_prompts", ts=NOW - 4900, session_id="s-mid", tool="copilot-cli", text="Write a plan")
    db.insert("file_write_events", **new, ts=NOW - 900, path="/tmp/out/widget-report.md")
    db.insert("tool_invocations", **new, ts=NOW - 900, tool_name="edit")
    db.insert("session_commits", session_id="s-mid", sha="abc", ts=NOW - 4500, subject="Add the widget API")
    db.insert("session_folders", session_id="s-mid", tool="copilot-cli", folder="/state/s-mid", files_total=7, bytes_total=30)
    db.insert("session_artifacts", session_id="s-mid", path="/state/s-mid/files/widget.md", folder="files", size_bytes=3,
              mtime=NOW - 4400)


def _numbers(row: dict) -> tuple:
    return (row["tokens"], row["cost_usd"], row["tool_calls"], row["prompts"], row["artifacts"])


def _detail_numbers(db, sid: str, *, history=None) -> tuple:
    """The same numbers as the agent side panel shows them for the session."""
    detail = agent_detail(db, sid, None, NOW, history=history)[1]
    agent = detail["agent"]
    tokens = sum(int(agent[k] or 0) for k in ("input", "output", "cache_read", "cache_write"))
    # The search row has whole numbers: a count the agent detail leaves empty is 0 there.
    return (tokens, agent["cost_usd"], agent["tool_calls"] or 0, agent["msgs"]["user"] or 0, detail["artifacts_total"])


class TestSearch:
    @pytest.fixture
    def db(self, kusto_store):
        return kusto_store

    def test_no_text_lists_every_session_newest_first(self, db, tmp_path):
        _seed_search(db, tmp_path)
        out = search_sessions(db)
        assert out["total"] == 3
        assert [r["id"] for r in out["rows"]] == ["s-new", "s-mid", "s-old"]
        old = out["rows"][2]
        assert (old["title"], old["tokens"], old["cost_usd"], old["tool_calls"], old["prompts"]) == ("Refactor the parser", 110, 0.5, 3, 2)
        assert _numbers(old) == _detail_numbers(db, "s-old")
        assert (old["match"], old["match_text"], old["ended_at"]) == ("", "", NOW - 8000)
        assert out["rows"][0]["ended_at"] is None
        mid = out["rows"][1]
        assert (mid["artifacts"], mid["commits"]) == (7, 1)
        assert out["rows"][0]["artifacts"] == 1  # the file it wrote outside its project

    def test_every_kind_of_hit_is_found_and_the_first_kind_is_reported(self, db, tmp_path):
        _seed_search(db, tmp_path)
        out = search_sessions(db, "WIDGET")
        got = {r["id"]: (r["match"], r["match_text"]) for r in out["rows"]}
        assert got == {
            "s-new": ("file", "/tmp/out/widget-report.md"),
            "s-mid": ("artifact", "/state/s-mid/files/widget.md"),
            "s-old": ("prompt", "now add the widget"),
        }
        assert out["total"] == 3
        assert {r["id"]: r["match"] for r in search_sessions(db, "parser")["rows"]} == {"s-old": "title"}
        assert {r["id"]: r["match"] for r in search_sessions(db, "/p/beta")["rows"]} == {"s-mid": "project"}
        assert {r["id"]: r["match"] for r in search_sessions(db, "widget api")["rows"]} == {"s-mid": "commit"}

    def test_a_percent_sign_is_text_not_a_wildcard(self, db, tmp_path):
        _seed_search(db, tmp_path)
        assert search_sessions(db, "%")["total"] == 0

    def test_tool_range_and_page_filters(self, db, tmp_path):
        _seed_search(db, tmp_path)
        assert [r["id"] for r in search_sessions(db, tools=["copilot-cli"])["rows"]] == ["s-new", "s-mid"]
        assert [r["id"] for r in search_sessions(db, since=NOW - 6000, until=NOW - 2000)["rows"]] == ["s-mid"]
        page = search_sessions(db, limit=1, offset=1)
        assert (page["total"], [r["id"] for r in page["rows"]]) == (3, ["s-mid"])

    def test_a_session_under_two_ids_is_one_row(self, db, tmp_path):
        _session(db, SID, "claude-code", "/p/a", NOW - 100, input_tokens=5)
        _session(db, f"claude-code:123:{SID}", "claude-code", "/p/a", NOW - 100)
        for sid in (SID, f"claude-code:123:{SID}"):
            db.insert("session_prompts", ts=NOW - 90, session_id=sid, tool="claude-code", text="go")
        out = search_sessions(db)
        assert (out["total"], [r["id"] for r in out["rows"]]) == (1, [SID])

    def test_a_process_the_monitor_saw_is_not_a_session_row(self, db, tmp_path):
        """A sessions row with no records (a monitor placeholder) cannot be opened, so it is not listed."""
        _seed_search(db, tmp_path)
        _session(db, "claude-code:54259:1794162948", "claude-code", "", NOW - 10)
        _session(db, "codex-desktop:995:1794162948", "codex-desktop", "", NOW - 5)
        assert agent_detail(db, "claude-code:54259:1794162948", None, NOW)[0] == 404
        out = search_sessions(db)
        assert [r["id"] for r in out["rows"]] == ["s-new", "s-mid", "s-old"]
        assert out["total"] == 3
        assert search_sessions(db, "claude")["total"] == 0

    def test_a_session_file_not_imported_yet_is_listed_and_an_imported_one_shows_its_state(self, db, tmp_path):
        _seed_search(db, tmp_path)
        db.insert("session_sources", source_file="/h/.codex/sessions/rollout-x-" + SID2 + ".jsonl", session_id=SID2,
                  tool="codex-cli", size_bytes=5000, mtime=NOW - 3000, bytes_read=0, status="waiting", indexed_at=NOW)
        db.insert("session_sources", source_file="/h/.claude/projects/p/s-old.jsonl", session_id="s-old",
                  tool="claude-code", size_bytes=4096, mtime=NOW - 8000, bytes_read=1024, status="reading", indexed_at=NOW)
        out = search_sessions(db)
        assert out["total"] == 4 and out["facets"]["not_imported"] == 1 and out["facets"]["importing"] == 1
        rows = {r["id"]: r for r in out["rows"]}
        assert (rows[SID2]["status"], rows[SID2]["openable"]) == ("not_imported", False)
        assert rows["s-old"]["import_state"] == "reading" and rows["s-old"]["import"]["bytes_read"] == 1024
        assert rows["s-mid"]["import_state"] == "none"
        only = search_sessions(db, query=session_record.finder_query({"status": ["not_imported"]}))
        assert [r["id"] for r in only["rows"]] == [SID2]

    def test_filters_and_sorts_are_applied_before_paging(self, db, tmp_path):
        _seed_search(db, tmp_path)
        query = session_record.finder_query
        by_tokens = search_sessions(db, query=query({"sort": ["tokens"], "order": ["desc"], "limit": ["1"]}))
        assert (by_tokens["total"], [r["id"] for r in by_tokens["rows"]]) == (3, ["s-old"])
        assert [r["id"] for r in search_sessions(db, query=query({"min_tokens": ["50"]}))["rows"]] == ["s-old"]
        assert [r["id"] for r in search_sessions(db, query=query({"project": ["beta"]}))["rows"]] == ["s-mid"]
        assert [r["id"] for r in search_sessions(db, query=query({"name": ["prompt"]}))["rows"]] == ["s-mid", "s-old"]
        assert [r["id"] for r in search_sessions(db, query=query({"model": ["claude-sonnet-4-5"]}))["rows"]] == ["s-old"]
        none = search_sessions(db, query=query({"status": ["running"]}))
        assert none["total"] == 0 and none["without"]["status"] == 3

    def test_every_search_row_opens_in_the_agent_detail_or_says_why_not(self, db, tmp_path):
        _seed_search(db, tmp_path)
        _session(db, "placeholder:1:2", "claude-desktop", "", NOW - 1)
        for q in ("", "widget", "p"):
            for row in search_sessions(db, q)["rows"]:
                if row["openable"]:
                    assert agent_detail(db, row["id"], None, NOW)[0] == 200, row["id"]
                else:
                    assert row["closed_reason"], row["id"]

    def test_the_route_answers_with_the_contract_shape(self, db, tmp_path):
        _seed_search(db, tmp_path)
        status, body = handle_get("/api/board/sessions", "q=widget&tool=copilot-cli&limit=200&offset=0", db, db, NOW)
        payload = json.loads(body)
        assert status == 200 and payload["total"] == 2
        assert set(payload["rows"][0]) == {
            "id", "tool", "title", "title_source", "project", "model", "started_at", "ended_at", "last_activity_at",
            "duration", "status", "status_evidence", "end_reason", "pids", "import_state", "import_evidence", "import",
            "openable", "closed_reason", "tokens", "cost_usd", "tool_calls", "prompts", "errors", "artifacts", "commits",
            "match", "match_text",
        }

# ─── Viewing an artifact through /api/file ────────────────────────


@pytest.fixture
def server(kusto_store, tmp_path):
    from aictl.dashboard.models import DashboardSnapshot
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore

    snap = DashboardSnapshot(timestamp=time.time(), root=str(tmp_path), tools=[], sessions=[])
    store = SnapshotStore(db=kusto_store, history_store=kusto_store.history_store)
    store.update(snap)
    allowed = AllowedPaths()
    allowed.update(snap)
    srv = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, allowed, tmp_path)
    thread = threading.Thread(target=srv.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


def _get_file(base: str, path: Path) -> tuple[int, str]:
    url = f"{base}/api/file?" + urllib.parse.urlencode({"path": str(path)})
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        return exc.code, ""


class TestViewing:
    @pytest.fixture
    def db(self, kusto_store):
        return kusto_store

    def test_an_indexed_artifact_and_a_written_file_are_served(self, db, tmp_path, server):
        _project, outside = _seed_detail(db, tmp_path)
        report = tmp_path / "copilot" / "session-state" / SID / "files" / "report.md"
        assert _get_file(server, report) == (200, "# Report\n")
        assert _get_file(server, outside) == (200, "# Summary\n")

    def test_an_unrelated_path_is_still_refused(self, db, tmp_path, server):
        _seed_detail(db, tmp_path)
        unrelated = _write(tmp_path / "copilot" / "session-state" / SID / "files" / "not-indexed-yet.md", "secret")
        assert _get_file(server, unrelated)[0] == 403
        assert _get_file(server, _write(tmp_path / "private.txt", "secret"))[0] == 403
        assert not is_recorded_artifact(db, "relative/path.md")

    def test_a_binary_artifact_is_not_served_as_text(self, db, tmp_path, server):
        _seed_detail(db, tmp_path)
        image = tmp_path / "copilot" / "session-state" / SID / "files" / "image.png"
        assert _get_file(server, image)[0] == 415

    def test_text_is_known_by_extension_or_by_its_first_bytes(self, tmp_path):
        assert is_text_file(str(_write(tmp_path / "a.md", "x")))
        assert is_text_file(str(_write(tmp_path / "NOEXT", "plain words")))
        binary = tmp_path / "blob"
        binary.write_bytes(b"\x00\x01\x02")
        assert not is_text_file(str(binary))
        assert not is_text_file(str(tmp_path / "missing.md"))


# ─── Schema v34 ───────────────────────────────────────────────────


# ─── The search row agrees with the agent detail ─────────────────


def test_a_search_row_has_the_numbers_of_the_agent_detail(kusto_store, tmp_path):
    db = kusto_store
    _project, _outside = _seed_detail(db, tmp_path)
    for k in range(4):
        db.insert("tool_invocations", ts=NOW - 2500 + k, session_id=SID, tool="copilot-cli", tool_name="bash")
    db.insert("session_prompts", ts=NOW - 3100, session_id=SID, tool="copilot-cli", text="Write the report")
    # The sessions row says something else: the facts win, as on the board.
    db.replace("sessions", where={"session_id": SID}, tool_call_count=99, cost_usd=9.0, input_tokens=5)
    row = next(r for r in search_sessions(db, "report")["rows"] if r["id"] == SID)
    assert _numbers(row) == _detail_numbers(db, SID)
    assert (row["tool_calls"], row["prompts"], row["artifacts"]) == (4, 1, 6)


def test_a_session_with_transcript_usage_only_shows_the_transcript_totals(kusto_store):
    """A session with usage from its transcript and no model call rows: the finder row shows the
    whole transcript's usage. The finder sorts and filters by tokens in its one query, so it
    does not apply the agent detail's window of daily usage from the first stored activity."""
    db = kusto_store
    day = 86400.0
    start = NOW - 3 * day
    _session(db, "u-1", "codex-cli", "/p/u", start)
    models = {"gpt-5": {"requests": 4, "input_tokens": 300, "output_tokens": 30, "cache_read_tokens": 60, "cache_creation_tokens": 0}}
    early = {"input_tokens": 200, "output_tokens": 20, "cache_read_tokens": 0, "cache_creation_tokens": 0}
    late = {"input_tokens": 100, "output_tokens": 10, "cache_read_tokens": 60, "cache_creation_tokens": 0}
    daily = {
        time.strftime("%Y-%m-%d", time.localtime(start)): {**early, "models": {"gpt-5": {**early, "requests": 2}}},
        time.strftime("%Y-%m-%d", time.localtime(NOW - 100)): {**late, "models": {"gpt-5": {**late, "requests": 2}}},
    }
    db.insert("session_usage", session_id="u-1", tool="codex-cli", model="gpt-5", models_json=json.dumps(models),
              daily_json=json.dumps(daily), input_tokens=300, output_tokens=30, cache_read_tokens=60, request_count=4,
              tool_call_count=1, turn_count=1, started_at=start, last_activity_at=NOW - 100, project_path="/p/u")
    # The first tool call comes long after the transcript's first day.
    db.insert("tool_invocations", ts=NOW - 150, session_id="u-1", tool="codex-cli", tool_name="shell")
    row = next(r for r in search_sessions(db)["rows"] if r["id"] == "u-1")
    assert (row["tokens"], row["tool_calls"], row["status"], row["import_state"]) == (390, 1, "running", "none")
