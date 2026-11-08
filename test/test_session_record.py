"""The session record: the index of session folders, artifacts, commits with pull requests,
the search over all sessions, viewing an artifact, and the one-time tool size backfill."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from types import SimpleNamespace

import pytest
from test_board_facts import c_assistant, c_tool_result, c_tool_use, claude_path, write_lines

from aictl.dashboard import board_api, session_record
from aictl.dashboard.board_api import agent_detail, handle_get
from aictl.dashboard.session_record import PullRequestFinder, is_recorded_artifact, is_text_file, search_sessions
from aictl.ingesters import session_artifacts, tool_size_backfill
from aictl.ingesters.session_artifacts import SessionArtifactIndexer, scan_folder
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.project_stores import ProjectStores, store_key
from aictl.storage import HistoryDB, _dedup_key

NOW = time.time()
SID = "aaaaaaaa-1111-4111-8111-111111111111"
SID2 = "bbbbbbbb-2222-4222-8222-222222222222"


@pytest.fixture
def db(tmp_path):
    store = HistoryDB(db_path=str(tmp_path / "history.db"), flush_interval=0)
    yield store
    store.close()


@pytest.fixture(autouse=True)
def _fresh_memos(monkeypatch):
    session_record._recorded.clear()
    session_record._attributed.clear()
    # No test may run the real gh: an answer from a fake finder only.
    monkeypatch.setattr(session_record, "PR_FINDER", PullRequestFinder(which=lambda name: None, background=False))
    for memo in (board_api._facts_memo, board_api._sources_memo, board_api._disk_prompts_memo):
        memo.clear()
    monkeypatch.setattr(board_api, "_process_start", lambda pid: 0.0)


def _write(path: Path, text: str = "x", mtime: float | None = None) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
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


def _session(conn, sid, tool, project, started, ended=None, **extra):
    cols = {"session_id": sid, "tool": tool, "project_path": project, "started_at": started, "ended_at": ended, **extra}
    conn.execute(f"INSERT INTO sessions ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})", tuple(cols.values()))


def _artifact_rows(db, sid=SID) -> dict[str, tuple]:
    return {
        Path(p).name: (folder, size)
        for p, folder, size in db._conn().execute("SELECT path, folder, size_bytes FROM session_artifacts WHERE session_id = ?", (sid,))
    }


# ─── Index of session folders ─────────────────────────────────────


class TestIndex:
    def test_copilot_folder_files_are_indexed_without_the_tools_own_records(self, db, tmp_path):
        _copilot_folder(tmp_path / "copilot")
        assert _indexer(db, copilot=tmp_path / "copilot" / "session-state").poll() == 1
        assert _artifact_rows(db) == {
            "report.md": ("files", 9),
            "notes.txt": ("research", 5),
            "001.md": ("checkpoints", 10),
            "plan.md": ("", 4),
        }
        folder, total, size = db._conn().execute("SELECT folder, files_total, bytes_total FROM session_folders").fetchone()
        assert (Path(folder).name, total, size) == (SID, 4, 28)

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

    def test_a_restart_does_not_scan_unchanged_folders_again(self, db, tmp_path):
        _copilot_folder(tmp_path / "copilot")
        assert _indexer(db, copilot=tmp_path / "copilot" / "session-state").poll() == 1
        assert _indexer(db, copilot=tmp_path / "copilot" / "session-state").poll() == 0

    def test_a_huge_folder_keeps_the_newest_files_and_the_real_count(self, db, tmp_path, monkeypatch):
        monkeypatch.setattr(session_artifacts, "MAX_FILES_PER_SESSION", 3)
        folder = tmp_path / "copilot" / "session-state" / SID
        for k in range(5):
            _write(folder / "files" / f"f{k}.txt", "ab", mtime=NOW - 100 + k)
        _indexer(db, copilot=tmp_path / "copilot" / "session-state").poll()
        assert sorted(_artifact_rows(db)) == ["f2.txt", "f3.txt", "f4.txt"]
        assert db._conn().execute("SELECT files_total, bytes_total FROM session_folders").fetchone() == (5, 10)

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
        assert db._conn().execute("SELECT tool FROM session_folders").fetchone()[0] == "claude-code"

    def test_codex_dated_folders_are_not_session_folders(self, db, tmp_path):
        sessions = tmp_path / "codex" / "sessions"
        _write(sessions / "2026" / "03" / "06" / f"rollout-{SID}.jsonl", "{}\n")
        assert _indexer(db, codex=sessions).poll() == 0
        assert db._conn().execute("SELECT COUNT(*) FROM session_artifacts").fetchone()[0] == 0

    def test_a_busy_store_skips_the_folder_until_the_next_poll(self, db, tmp_path, monkeypatch):
        _copilot_folder(tmp_path / "copilot")
        indexer = _indexer(db, copilot=tmp_path / "copilot" / "session-state")
        real = db.replace_session_artifacts
        calls = []

        def locked(*args, **kwargs):
            calls.append(1)
            if len(calls) == 1:
                raise sqlite3.OperationalError("database is locked")
            return real(*args, **kwargs)

        monkeypatch.setattr(db, "replace_session_artifacts", locked)
        assert indexer.poll() == 0
        assert indexer.poll() == 1
        assert len(_artifact_rows(db)) == 4

    def test_the_index_is_written_to_the_store_of_the_sessions_project(self, tmp_path):
        repo = tmp_path / "repo"
        (repo / ".git").mkdir(parents=True)
        stores = ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0)
        try:
            from aictl.storage import SessionRow

            stores.upsert_session(SessionRow(session_id=SID, tool="copilot-cli", project_path=str(repo), started_at=NOW - 100))
            _copilot_folder(tmp_path / "copilot")
            _indexer(stores, copilot=tmp_path / "copilot" / "session-state").poll()
            file = stores._file_of(store_key(str(repo)))
            conn = sqlite3.connect(file)
            try:
                assert conn.execute("SELECT COUNT(*) FROM session_artifacts WHERE session_id = ?", (SID,)).fetchone()[0] == 4
            finally:
                conn.close()
            assert stores.machine._conn().execute("SELECT COUNT(*) FROM session_artifacts").fetchone()[0] == 0
            # The signatures of every store are read back on a restart.
            assert SID in stores.artifact_scans()
        finally:
            stores.close()


# ─── Artifacts and commits of the agent detail ────────────────────


def _seed_detail(db, tmp_path) -> tuple[Path, Path]:
    project = tmp_path / "proj"
    project.mkdir()
    folder = _copilot_folder(tmp_path / "copilot")
    _write(folder / "files" / "image.png", "\x89PNG\x00\x00")
    outside = _write(tmp_path / "elsewhere" / "summary.md", "# Summary\n")
    conn = db._conn()
    _session(conn, SID, "copilot-cli", str(project), NOW - 3600, NOW - 60)
    conn.execute(
        "INSERT INTO requests (ts, session_id, tool, project_path, model, input_tokens) VALUES (?,?,?,?,?,?)",
        (NOW - 3000, SID, "copilot-cli", str(project), "gpt-5", 10),
    )
    for k, path in enumerate((str(outside), str(outside), str(project / "src" / "a.py"))):
        conn.execute(
            "INSERT INTO file_write_events (ts, session_id, tool, path, project_path, dedup_key) VALUES (?,?,?,?,?,?)",
            (NOW - 2000 + k, SID, "copilot-cli", path, str(project), f"w{k}"),
        )
    conn.commit()
    _indexer(db, copilot=tmp_path / "copilot" / "session-state").poll()
    return project, outside


class TestAgentDetailArtifacts:
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
        assert (report["exists"], report["size_bytes"], report["viewable"]) == (True, 9, True)
        assert by_name["image.png"]["viewable"] is False
        assert detail["artifacts_total"] == 6
        assert detail["artifacts_bytes"] == sum(a["size_bytes"] for a in detail["artifacts"])

    def test_exists_size_and_mtime_come_from_the_disk_at_request_time(self, db, tmp_path):
        _project, outside = _seed_detail(db, tmp_path)
        outside.unlink()
        report = tmp_path / "copilot" / "session-state" / SID / "files" / "report.md"
        report.write_text("# A longer report now\n")
        by_name = {a["name"]: a for a in agent_detail(db, SID, None, NOW)[1]["artifacts"]}
        assert (by_name["summary.md"]["exists"], by_name["summary.md"]["size_bytes"], by_name["summary.md"]["mtime"]) == (False, None, None)
        assert by_name["summary.md"]["viewable"] is False
        assert by_name["report.md"]["size_bytes"] == len("# A longer report now\n")
        assert by_name["report.md"]["mtime"] == pytest.approx(report.stat().st_mtime)

    def test_a_subagent_has_no_artifacts_of_its_own(self, db, tmp_path):
        _seed_detail(db, tmp_path)
        conn = db._conn()
        conn.execute("INSERT INTO agents (agent_id, session_id, tool, started_at) VALUES ('sub-1', ?, 'copilot-cli', ?)", (SID, NOW - 1000))
        conn.execute(
            "INSERT INTO requests (ts, session_id, agent_id, tool, model) VALUES (?,?,?,?,?)", (NOW - 900, SID, "sub-1", "copilot-cli", "gpt-5")
        )
        conn.commit()
        detail = agent_detail(db, "sub-1", None, NOW)[1]
        assert (detail["artifacts"], detail["artifacts_total"], detail["commits"], detail["prs_note"]) == ([], 0, [], "")

    def test_commits_carry_their_pull_requests(self, db, tmp_path, monkeypatch):
        project, _ = _seed_detail(db, tmp_path)
        db.upsert_session_commits(SID, [{"sha": "a" * 40, "subject": "Fix it", "author_name": "Zvi", "ts": NOW - 500}])
        db.upsert_session_commits(SID, [{"sha": "b" * 40, "subject": "Older", "author_name": "Zvi", "ts": NOW - 900}])
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
        db.upsert_session_commits(SID, [{"sha": "c" * 40, "subject": "x", "ts": NOW - 500}])
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

        def run(argv, **kwargs):
            started.wait(5)
            return _fake_gh({}, calls=calls)(argv, **kwargs)

        finder = PullRequestFinder(run=run, which=lambda n: n)
        t0 = time.monotonic()
        assert finder.lookup(str(tmp_path), ["a" * 40]) == ({}, "looking up pull requests")
        assert time.monotonic() - t0 < 1.0
        started.set()
        assert finder._thread is not None
        finder._thread.join(5)
        assert finder.lookup(str(tmp_path), ["a" * 40]) == ({"a" * 40: []}, "")
        assert all("creationflags" in kwargs and kwargs["timeout"] for _argv, kwargs in calls)


# ─── Search over all sessions ─────────────────────────────────────


def _seed_search(db, tmp_path) -> None:
    conn = db._conn()
    _session(conn, "s-old", "claude-code", "/p/alpha", NOW - 9000, NOW - 8000, input_tokens=100, output_tokens=10, cost_usd=0.5, tool_call_count=3)
    _session(conn, "s-mid", "copilot-cli", "/p/beta", NOW - 5000, NOW - 4000)
    _session(conn, "s-new", "copilot-cli", "/p/gamma", NOW - 1000)
    # The board counts the facts, not the totals on the sessions row.
    conn.execute(
        "INSERT INTO requests (ts, session_id, tool, project_path, model, input_tokens, output_tokens, cost_usd) VALUES (?,?,?,?,?,?,?,?)",
        (NOW - 8950, "s-old", "claude-code", "/p/alpha", "claude-sonnet-4-5", 100, 10, 0.5),
    )
    for k in range(3):
        conn.execute(
            "INSERT INTO tool_invocations (ts, session_id, tool, project_path, tool_name) VALUES (?,?,?,?,?)",
            (NOW - 8940 + k, "s-old", "claude-code", "/p/alpha", "Bash"),
        )
    conn.execute("INSERT INTO session_prompts (ts, session_id, agent_id, tool, text) VALUES (?, 's-old', '', 'claude-code', 'Refactor the parser')", (NOW - 8900,))
    conn.execute("INSERT INTO session_prompts (ts, session_id, agent_id, tool, text) VALUES (?, 's-old', '', 'claude-code', 'now add the widget')", (NOW - 8800,))
    conn.execute("INSERT INTO session_prompts (ts, session_id, agent_id, tool, text) VALUES (?, 's-mid', '', 'copilot-cli', 'Write a plan')", (NOW - 4900,))
    conn.execute(
        "INSERT INTO file_write_events (ts, session_id, tool, path, project_path) VALUES (?, 's-new', 'copilot-cli', '/tmp/out/widget-report.md', '/p/gamma')",
        (NOW - 900,),
    )
    conn.execute("INSERT INTO session_commits (session_id, sha, ts, subject) VALUES ('s-mid', 'abc', ?, 'Add the widget API')", (NOW - 4500,))
    conn.commit()
    db.replace_session_artifacts("s-mid", "copilot-cli", "/state/s-mid", 1.0, [("/state/s-mid/files/widget.md", "files", 3, NOW - 4400)], 7, 30)


def _numbers(row: dict) -> tuple:
    return (row["tokens"], row["cost_usd"], row["tool_calls"], row["prompts"], row["artifacts"])


def _detail_numbers(db, sid: str) -> tuple:
    """The same numbers as the agent side panel shows them for the session."""
    detail = agent_detail(db, sid, None, time.time())[1]
    agent = detail["agent"]
    tokens = sum(int(agent[k] or 0) for k in ("input", "output", "cache_read", "cache_write"))
    return (tokens, agent["cost_usd"], agent["tool_calls"], agent["msgs"]["user"], detail["artifacts_total"])


class TestSearch:
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
        conn = db._conn()
        _session(conn, SID, "claude-code", "/p/a", NOW - 100, input_tokens=5)
        _session(conn, f"claude-code:123:{SID}", "claude-code", "/p/a", NOW - 100)
        conn.commit()
        out = search_sessions(db)
        assert (out["total"], [r["id"] for r in out["rows"]]) == (1, [SID])

    def test_the_route_answers_with_the_contract_shape(self, db, tmp_path):
        _seed_search(db, tmp_path)
        status, body = handle_get("/api/board/sessions", "q=widget&tool=copilot-cli&limit=200&offset=0", db, None, NOW)
        payload = json.loads(body)
        assert status == 200 and payload["total"] == 2
        assert set(payload["rows"][0]) == {
            "id", "tool", "title", "project", "started_at", "ended_at", "tokens", "cost_usd",
            "tool_calls", "prompts", "artifacts", "commits", "match", "match_text",
        }

    def test_the_search_reads_every_project_store(self, tmp_path):
        from aictl.storage import SessionPromptRow, SessionRow

        stores = ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0)
        try:
            for k in range(12):
                repo = tmp_path / f"repo{k}"
                (repo / ".git").mkdir(parents=True)
                sid = f"s{k}"
                stores.upsert_session(SessionRow(session_id=sid, tool="claude-code", project_path=str(repo), started_at=NOW - 1000 + k))
                stores.write_call_facts(
                    __import__("aictl.storage", fromlist=["CallFacts"]).CallFacts(
                        prompts=[SessionPromptRow(dedup_key=f"p{k}", ts=NOW - 900 + k, session_id=sid, tool="claude-code", project_path=str(repo), text=f"task number {k}")]
                    )
                )
            assert search_sessions(stores)["total"] == 12
            assert [r["id"] for r in search_sessions(stores, "number 11")["rows"]] == ["s11"]
            assert search_sessions(stores, "task number")["total"] == 12
        finally:
            stores.close()


# ─── Viewing an artifact through /api/file ────────────────────────


@pytest.fixture
def server(db, tmp_path):
    from aictl.dashboard.models import DashboardSnapshot
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore

    snap = DashboardSnapshot(timestamp=time.time(), root=str(tmp_path), tools=[], sessions=[])
    store = SnapshotStore(db=db)
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


# ─── One-time tool size backfill ──────────────────────────────────


def _ingester_factory(root: Path):
    def make(target):
        return TranscriptUsageIngester(
            target,
            claude_projects=root / "claude" / "projects",
            codex_sessions=root / "codex",
            copilot_state=root / "copilot" / "session-state",
            vscode_workspaces=root / "vscode" / "workspaceStorage",
            backfill_days=tool_size_backfill.ALL_DAYS,
        )

    return make


class TestToolSizeBackfill:
    def _seed(self, db, tmp_path) -> dict:
        args = {"command": "ls -la"}
        write_lines(
            claude_path(tmp_path),
            [
                c_assistant("m1", "r1", 100, blocks=[c_tool_use("t1", "Bash", args), c_tool_use("t2", "Bash", {"command": "pwd"})]),
                c_tool_result("t1", 90, content="hello"),
                c_tool_result("t2", 80, content="there"),
            ],
        )
        conn = db._conn()
        # A call stored before v33: no sizes. The second call is not stored (gone by retention).
        conn.execute(
            "INSERT INTO tool_invocations (dedup_key, ts, session_id, tool, tool_name) VALUES (?, ?, 's', 'claude-code', 'Bash')",
            (_dedup_key("claude-tool", "t1"), NOW - 100),
        )
        conn.commit()
        return args

    def test_sizes_of_stored_calls_are_filled_once_and_no_row_is_added(self, db, tmp_path):
        args = self._seed(db, tmp_path)
        assert tool_size_backfill.run(db, _ingester_factory(tmp_path)) is True
        rows = db._conn().execute("SELECT input_bytes, output_bytes, session_id FROM tool_invocations").fetchall()
        assert rows == [(len(json.dumps(args).encode()), 5, "s")]
        assert db.state_value(tool_size_backfill.STATE_KEY) is not None
        assert db._conn().execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0

        def never(target):
            raise AssertionError("the backfill ran twice")

        assert tool_size_backfill.run(db, never) is True

    def test_a_size_already_set_stays(self, db, tmp_path):
        self._seed(db, tmp_path)
        db._conn().execute("UPDATE tool_invocations SET input_bytes = 7")
        db._conn().commit()
        tool_size_backfill.run(db, _ingester_factory(tmp_path))
        assert db._conn().execute("SELECT input_bytes, output_bytes FROM tool_invocations").fetchone() == (7, 5)

    def test_a_write_that_keeps_failing_leaves_the_backfill_to_run_again(self, db, tmp_path, monkeypatch):
        self._seed(db, tmp_path)
        monkeypatch.setattr(tool_size_backfill, "LOCK_RETRY_S", 0.0)

        def locked(rows):
            raise sqlite3.OperationalError("database is locked")

        monkeypatch.setattr(db, "fill_tool_sizes", locked)
        assert tool_size_backfill.run(db, _ingester_factory(tmp_path)) is False
        assert db.state_value(tool_size_backfill.STATE_KEY) is None

    def test_project_stores_fill_the_store_that_holds_the_call(self, tmp_path):
        from aictl.storage import CallFacts, SessionRow, ToolInvocationRow

        repo = tmp_path / "repo"
        (repo / ".git").mkdir(parents=True)
        stores = ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0)
        try:
            stores.upsert_session(SessionRow(session_id="s", tool="claude-code", project_path=str(repo), started_at=NOW - 200))
            stores.write_call_facts(CallFacts(tools=[ToolInvocationRow(dedup_key="k1", ts=NOW - 100, session_id="s", tool="claude-code", tool_name="Bash", project_path=str(repo))]))
            assert stores.fill_tool_sizes([("s", "k1", 11, 22), ("s", "k-missing", 1, 1)]) == 1
            conn = sqlite3.connect(stores._file_of(store_key(str(repo))))
            try:
                assert conn.execute("SELECT input_bytes, output_bytes FROM tool_invocations").fetchall() == [(11, 22)]
            finally:
                conn.close()
        finally:
            stores.close()


# ─── Schema v34 ───────────────────────────────────────────────────


def test_a_v33_store_gets_the_index_tables_and_a_rerun_changes_nothing(tmp_path):
    from aictl.storage_migrations import m034_session_artifacts

    path = tmp_path / "old.db"
    HistoryDB(db_path=str(path), flush_interval=0).close()
    conn = sqlite3.connect(path)
    conn.execute("DROP TABLE session_artifacts")
    conn.execute("DROP TABLE session_folders")
    conn.execute("DROP INDEX idx_sessions_started")
    conn.execute("DELETE FROM schema_version WHERE version > 33")
    conn.commit()
    conn.close()
    store = HistoryDB(db_path=str(path), flush_interval=0)
    try:
        conn = store._conn()
        names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master")}
        assert {"session_artifacts", "session_folders", "idx_session_artifacts_path", "idx_sessions_started"} <= names
        assert conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0] == 34
        m034_session_artifacts.apply(conn)
    finally:
        store.close()


def test_the_index_tables_are_per_project_tables():
    from aictl.project_stores import PROJECT_TABLES

    assert {"session_folders", "session_artifacts"} <= set(PROJECT_TABLES)



# ─── The search row agrees with the agent detail ─────────────────


def test_a_search_row_has_the_numbers_of_the_agent_detail(db, tmp_path):
    _project, _outside = _seed_detail(db, tmp_path)
    conn = db._conn()
    for k in range(4):
        conn.execute(
            "INSERT INTO tool_invocations (ts, session_id, tool, tool_name) VALUES (?,?,?,?)", (NOW - 2500 + k, SID, "copilot-cli", "bash")
        )
    conn.execute("INSERT INTO session_prompts (ts, session_id, agent_id, tool, text) VALUES (?, ?, '', 'copilot-cli', 'Write the report')", (NOW - 3100, SID))
    # The sessions row says something else: the facts win, as on the board.
    conn.execute("UPDATE sessions SET tool_call_count = 99, cost_usd = 9.0, input_tokens = 5 WHERE session_id = ?", (SID,))
    conn.commit()
    row = next(r for r in search_sessions(db, "report")["rows"] if r["id"] == SID)
    assert _numbers(row) == _detail_numbers(db, SID)
    assert (row["tool_calls"], row["prompts"], row["artifacts"]) == (4, 1, 6)


def test_a_session_whose_rows_are_in_two_stores_is_counted_whole(tmp_path, monkeypatch):
    """A session placed in the shared store, then named a project, moves; until the move is
    done its rows are in both stores. The search row must count both, as the agent detail does."""
    from aictl.storage import CallFacts, FileWriteRow, RequestRow, SessionPromptRow, SessionRow, ToolInvocationRow

    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    stores = ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0)
    try:
        # First rows with no folder: the session is placed in _shared.
        stores.write_call_facts(
            CallFacts(
                prompts=[SessionPromptRow(dedup_key="p1", ts=NOW - 900, session_id=SID, tool="claude-code", project_path="", text="paste the stderr")],
                tools=[ToolInvocationRow(dedup_key=f"t{k}", ts=NOW - 890 + k, session_id=SID, tool="claude-code", tool_name="Bash") for k in range(3)],
            )
        )
        # The move to the repository's store does not finish (a busy store): it stays pending.
        monkeypatch.setattr(stores, "_move_rows", lambda *a, **k: (_ for _ in ()).throw(sqlite3.OperationalError("database is locked")))
        stores.upsert_session(SessionRow(session_id=SID, tool="claude-code", project_path=str(repo), started_at=NOW - 1000))
        assert SID in stores._pending_moves
        stores.write_call_facts(
            CallFacts(
                requests=[RequestRow(dedup_key="r1", ts=NOW - 800, session_id=SID, tool="claude-code", project_path=str(repo), model="claude-sonnet-4-5", input_tokens=40, output_tokens=2)],
                tools=[ToolInvocationRow(dedup_key=f"u{k}", ts=NOW - 700 + k, session_id=SID, tool="claude-code", tool_name="Read", project_path=str(repo)) for k in range(2)],
                file_writes=[FileWriteRow(dedup_key="w1", ts=NOW - 600, session_id=SID, tool="claude-code", path=str(tmp_path / "out" / "notes.md"), project_path=str(repo))],
            )
        )
        row = next(r for r in search_sessions(stores, "paste the stderr")["rows"] if r["id"] == SID)
        assert (row["tool_calls"], row["prompts"], row["tokens"], row["artifacts"]) == (5, 1, 42, 1)
        assert _numbers(row) == _detail_numbers(stores, SID)
    finally:
        stores.close()


def test_the_index_does_not_place_a_session_the_stores_do_not_know(tmp_path):
    """Written first, the index would put the session in _shared and force a move later."""
    from aictl.storage import SessionRow

    stores = ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0)
    try:
        _copilot_folder(tmp_path / "copilot")
        indexer = _indexer(stores, copilot=tmp_path / "copilot" / "session-state")
        assert indexer.poll() == 0
        assert stores.store_of_session(SID) is None
        stores.upsert_session(SessionRow(session_id=SID, tool="copilot-cli", project_path="", started_at=NOW - 100))
        assert indexer.poll() == 1
    finally:
        stores.close()
