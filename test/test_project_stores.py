"""One history store per git repository: writes routed by project, reads over the stores they need."""

from __future__ import annotations

import json
import logging
import sqlite3
import threading
import time
from pathlib import Path

import pytest

from aictl.dashboard.board_api import Filters, agent_detail, compute_board
from aictl.project_stores import SHARED, ProjectStores, repository_root, store_key
from aictl.storage import (
    CallFacts,
    EventRow,
    HistoryDB,
    RequestRow,
    SessionPromptRow,
    SessionRow,
    SkillUseRow,
    ToolInvocationRow,
)

NOW = time.time()
SONNET = "claude-sonnet-4-5"
HAIKU = "claude-haiku-4-5"


def _repo(path: Path) -> Path:
    (path / ".git").mkdir(parents=True)
    return path


def _rows(file: Path, table: str, where: str = "1", params: tuple = ()) -> int:
    conn = sqlite3.connect(file)
    try:
        return conn.execute(f"SELECT COUNT(*) FROM {table} WHERE {where}", params).fetchone()[0]
    finally:
        conn.close()


def _store_file(stores: ProjectStores, folder: Path | str) -> Path:
    file = stores._file_of(store_key(str(folder)))
    assert file is not None
    return file


@pytest.fixture
def stores(tmp_path):
    s = ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0)
    yield s
    s.close()


# ─── Which store a folder belongs to ──────────────────────────────


def test_a_worktree_and_a_deleted_worktree_belong_to_the_main_repository(tmp_path, stores):
    main = _repo(tmp_path / "main")
    # A linked worktree: its .git file points into the main repository's .git/worktrees.
    admin = main / ".git" / "worktrees" / "feature"
    admin.mkdir(parents=True)
    (admin / "commondir").write_text("../..\n")
    tree = main / ".claude" / "worktrees" / "feature"
    tree.mkdir(parents=True)
    (tree / ".git").write_text(f"gitdir: {admin}\n")
    # A worktree outside the repository, with a relative gitdir.
    outside = tmp_path / "elsewhere" / "fix"
    outside.mkdir(parents=True)
    other_admin = main / ".git" / "worktrees" / "fix"
    other_admin.mkdir(parents=True)
    (other_admin / "commondir").write_text("../..\n")
    (outside / ".git").write_text("gitdir: ../../main/.git/worktrees/fix\n")
    gone = main / ".claude" / "worktrees" / "deleted-long-ago" / "src"

    assert repository_root(str(tree / "src")) == str(main)
    assert repository_root(str(outside)) == str(main)
    assert repository_root(str(gone)) == str(main)

    for i, folder in enumerate((tree, outside, gone)):
        stores.upsert_session(
            SessionRow(session_id=f"w{i}", tool="claude-code", project_path=str(folder), started_at=NOW)
        )
        stores.append_request(
            RequestRow(ts=NOW, session_id=f"w{i}", project_path=str(folder), model=SONNET, source="otel")
        )
    stores.flush()
    main_file = _store_file(stores, main)
    assert _rows(main_file, "sessions") == 3
    assert _rows(main_file, "requests") == 3
    assert sorted(p.name for p in stores.projects_dir.glob("*.db")) == [main_file.name]


def test_a_submodule_belongs_to_its_superproject(tmp_path):
    main = _repo(tmp_path / "super")
    (main / ".git" / "modules" / "lib").mkdir(parents=True)
    sub = main / "lib"
    sub.mkdir()
    (sub / ".git").write_text("gitdir: ../.git/modules/lib\n")
    assert repository_root(str(sub)) == str(main)


def test_a_folder_outside_git_goes_to_the_shared_store(tmp_path, stores):
    plain = tmp_path / "notes"
    plain.mkdir()
    stores.upsert_session(SessionRow(session_id="n1", tool="codex-cli", project_path=str(plain), started_at=NOW))
    stores.append_request(RequestRow(ts=NOW, session_id="n1", project_path=str(plain), model=SONNET, source="otel"))
    stores.flush()
    shared = stores.projects_dir / f"{SHARED}.db"
    assert _rows(shared, "sessions") == 1
    assert _rows(shared, "requests") == 1
    assert _rows(stores.machine._path, "requests") == 0


def test_windows_style_paths_compare_without_case(stores):
    assert store_key("C:\\Users\\Me\\Repo") == store_key("c:/users/me/repo")


# ─── Routing of rows ──────────────────────────────────────────────


def test_a_row_with_no_folder_lands_in_its_sessions_store(tmp_path, stores):
    repo = _repo(tmp_path / "alpha")
    stores.upsert_session(SessionRow(session_id="s1", tool="claude-code", project_path=str(repo), started_at=NOW))
    stores.append_request(RequestRow(ts=NOW, session_id="s1", model=SONNET, source="otel"))
    stores.append_tool_invocation(ToolInvocationRow(ts=NOW, session_id="s1", tool_name="Bash", source="otel"))
    stores.append_event(EventRow(ts=NOW, tool="claude-code", kind="hook:Stop", session_id="s1"))
    stores.link_session_process("s1", 4242, "claude-code")
    stores.flush()
    file = _store_file(stores, repo)
    assert _rows(file, "requests", "session_id = 's1'") == 1
    assert _rows(file, "tool_invocations", "session_id = 's1'") == 1
    assert _rows(file, "events", "session_id = 's1'") == 1
    assert _rows(file, "session_processes", "session_id = 's1'") == 1
    assert not (stores.projects_dir / f"{SHARED}.db").exists()


def test_a_session_seen_before_its_folder_moves_to_its_project(tmp_path, stores):
    repo = _repo(tmp_path / "beta")
    # The process scan sees the session first, with no folder.
    stores.batch_link_sessions([("s2", "claude-code", 77, NOW - 60, "process")])
    stores.append_event(EventRow(ts=NOW - 50, tool="claude-code", kind="hook:PreToolUse", session_id="s2"))
    stores.flush()
    shared = stores.projects_dir / f"{SHARED}.db"
    assert _rows(shared, "sessions", "session_id = 's2'") == 1
    stores.upsert_session(SessionRow(session_id="s2", tool="claude-code", project_path=str(repo), started_at=NOW - 60))
    stores.flush()
    file = _store_file(stores, repo)
    assert _rows(shared, "sessions", "session_id = 's2'") == 0
    assert _rows(shared, "events", "session_id = 's2'") == 0
    assert _rows(file, "sessions", "session_id = 's2' AND project_path = ?", (str(repo),)) == 1
    assert _rows(file, "events", "session_id = 's2'") == 1
    assert _rows(file, "session_processes", "session_id = 's2'") == 1
    with stores.read_scope(session="s2"):
        assert stores._conn().execute("SELECT COUNT(*) FROM sessions WHERE session_id = 's2'").fetchone()[0] == 1


def test_machine_rows_stay_in_the_machine_store(tmp_path, stores):
    stores.append_event(EventRow(ts=NOW, tool="aictl", kind="health"))
    stores.record_data_quality("x", "ok", kind="storage")
    stores.flush()
    assert _rows(stores.machine._path, "events", "kind = 'health'") == 1
    assert list(stores.projects_dir.glob("*.db")) == []


def test_a_session_already_in_the_machine_store_keeps_writing_there(tmp_path):
    path = tmp_path / "config" / "history.db"
    repo = _repo(tmp_path / "old")
    legacy = HistoryDB(db_path=path, flush_interval=0)
    legacy.upsert_session(SessionRow(session_id="old", tool="claude-code", project_path=str(repo), started_at=NOW - 99))
    legacy.close()
    with ProjectStores(db_path=path, flush_interval=0) as stores:
        stores.append_request(RequestRow(ts=NOW, session_id="old", project_path=str(repo), model=SONNET, source="otel"))
        stores.flush()
        # One row per session id across the stores: no copy of the session in the project store.
        assert _rows(path, "requests") == 1
        assert list(stores.projects_dir.glob("*.db")) == []
        assert stores.get_session("old")["project_path"] == str(repo)


def test_a_new_process_finds_the_stores_of_known_sessions(tmp_path):
    path = tmp_path / "config" / "history.db"
    repo = _repo(tmp_path / "gamma")
    with ProjectStores(db_path=path, flush_interval=0) as first:
        first.upsert_session(SessionRow(session_id="s3", tool="claude-code", project_path=str(repo), started_at=NOW))
    with ProjectStores(db_path=path, flush_interval=0) as second:
        second.append_request(RequestRow(ts=NOW, session_id="s3", model=SONNET, source="otel"))
        second.flush()
        assert _rows(_store_file(second, repo), "requests", "session_id = 's3'") == 1
        with second.read_scope(since=NOW - 10, until=NOW + 10):
            assert second.attached_stores() == [store_key(str(repo))]


def test_an_idle_store_closes_and_opens_again_on_the_next_write(tmp_path, stores):
    repo = _repo(tmp_path / "delta")
    stores.upsert_session(SessionRow(session_id="s4", tool="claude-code", project_path=str(repo), started_at=NOW))
    assert list(stores.open_stores()) == [store_key(str(repo))]
    assert stores.close_idle(idle_s=0) == [store_key(str(repo))]
    assert stores.open_stores() == {}
    stores.append_request(RequestRow(ts=NOW, session_id="s4", model=SONNET, source="otel"))
    stores.flush()
    assert _rows(_store_file(stores, repo), "requests") == 1


def test_call_facts_split_by_store_in_one_batch(tmp_path, stores):
    a, b = _repo(tmp_path / "a"), _repo(tmp_path / "b")
    facts = CallFacts(
        requests=[
            RequestRow(ts=NOW, session_id="fa", project_path=str(a), model=SONNET, source="transcript", dedup_key="ra"),
            RequestRow(ts=NOW, session_id="fb", project_path=str(b), model=SONNET, source="transcript", dedup_key="rb"),
        ],
        skills=[SkillUseRow(dedup_key="ka", ts=NOW, session_id="fa", name="review")],
    )
    assert stores.write_call_facts(facts) == 3
    assert _rows(_store_file(stores, a), "requests") == 1
    assert _rows(_store_file(stores, a), "skill_uses") == 1
    assert _rows(_store_file(stores, b), "requests") == 1


# ─── A flood in one project does not hold another ─────────────────


def test_a_flood_into_one_repository_does_not_block_another(tmp_path, stores):
    busy, quiet = _repo(tmp_path / "busy"), _repo(tmp_path / "quiet")
    stores.upsert_session(
        SessionRow(session_id="q0", tool="claude-code", project_path=str(quiet), started_at=NOW - 600)
    )
    stores.upsert_session(SessionRow(session_id="b0", tool="claude-code", project_path=str(busy), started_at=NOW - 600))
    flood = CallFacts(
        requests=[
            RequestRow(
                ts=NOW - 500 + i * 0.001,
                session_id="b0",
                project_path=str(busy),
                model=SONNET,
                input_tokens=1,
                source="transcript",
                dedup_key=f"f{i}",
            )
            for i in range(40_000)
        ]
    )
    busy_db = stores._stores[store_key(str(busy))]
    writer = threading.Thread(target=stores.write_call_facts, args=(flood,))
    writer.start()
    deadline = time.monotonic() + 10
    while not busy_db.running_writes() and writer.is_alive() and time.monotonic() < deadline:
        time.sleep(0.001)
    timings: list[tuple[str, float, bool]] = []
    for i in range(5):
        started = time.monotonic()
        stores.append_request(
            RequestRow(
                ts=NOW - 10 + i,
                session_id="q0",
                project_path=str(quiet),
                model=HAIKU,
                input_tokens=i + 1,
                source="otel",
            )
        )
        stores.upsert_session(
            SessionRow(session_id=f"q{i + 1}", tool="claude-code", project_path=str(quiet), started_at=NOW - 5)
        )
        timings.append(("write", time.monotonic() - started, bool(busy_db.running_writes())))
        started = time.monotonic()
        compute_board(stores, Filters(since=NOW - 3600, until=NOW), now=NOW)
        timings.append(("board", time.monotonic() - started, bool(busy_db.running_writes())))
    writer.join(timeout=60)
    assert any(during for _what, _took, during in timings), "the flood ended before the other project wrote"
    slow = [(what, round(took, 3)) for what, took, _during in timings if took >= 0.25]
    assert not slow, slow
    assert _rows(_store_file(stores, busy), "requests") == 40_000
    assert _rows(_store_file(stores, quiet), "requests") == 5


# ─── Reads over the stores ────────────────────────────────────────


def _seed(db, a: Path, b: Path) -> None:
    """The same rows, written through the write API, into any store."""
    for sid, repo, model, n in (("sa", a, SONNET, 4), ("sb", b, HAIKU, 3), ("sc", b, SONNET, 2)):
        db.upsert_session(
            SessionRow(
                session_id=sid, tool="claude-code", project_path=str(repo), started_at=NOW - 7200, ended_at=NOW - 60
            )
        )
        for k in range(n):
            ts = NOW - 3600 + k * 300 + (1 if sid == "sb" else 0)
            db.append_request(
                RequestRow(
                    ts=ts,
                    session_id=sid,
                    project_path=str(repo),
                    model=model,
                    input_tokens=100 * (k + 1),
                    output_tokens=20,
                    cache_read_tokens=500,
                    duration_ms=800,
                    source="otel",
                    source_ts=ts,
                )
            )
            db.append_tool_invocation(
                ToolInvocationRow(
                    ts=ts + 5,
                    session_id=sid,
                    tool="claude-code",
                    tool_name="Bash",
                    target="pytest -q",
                    is_error=int(k == 1),
                    exit_code=int(k == 1),
                    source="otel",
                    source_ts=ts + 5,
                )
            )
        db.write_call_facts(
            CallFacts(
                prompts=[
                    SessionPromptRow(
                        dedup_key=f"p-{sid}",
                        ts=NOW - 3500 + len(sid) * ord(sid[1]),
                        session_id=sid,
                        tool="claude-code",
                        project_path=str(repo),
                        text=f"do {sid}",
                    )
                ],
                skills=[
                    SkillUseRow(
                        dedup_key=f"k-{sid}",
                        ts=NOW - 3400 + ord(sid[1]),
                        session_id=sid,
                        tool="claude-code",
                        project_path=str(repo),
                        name="review",
                    )
                ],
            )
        )
    db.flush()


def _comparable(payload: dict) -> str:
    payload = {k: v for k, v in payload.items() if k not in ("generated_at", "self")}
    return json.dumps(payload, sort_keys=True, default=str)


def test_all_projects_over_two_stores_equals_one_store_with_the_same_rows(tmp_path, stores):
    a, b = _repo(tmp_path / "a"), _repo(tmp_path / "b")
    single = HistoryDB(db_path=tmp_path / "single.db", flush_interval=0)
    try:
        _seed(single, a, b)
        _seed(stores, a, b)
        assert sorted(stores.open_stores()) == sorted([store_key(str(a)), store_key(str(b))])
        f = Filters(since=NOW - 6 * 3600, until=NOW)
        split = compute_board(stores, f, now=NOW)
        one = compute_board(single, f, now=NOW)
        assert len(split["agents"]) == 3
        assert {r["id"] for r in split["agents"]} == {r["id"] for r in one["agents"]}
        assert split["kpis"] == one["kpis"]
        assert split["series"] == one["series"]
        assert _comparable(split) == _comparable(one)
        # With a project filter the answer is the same too, filter menus included: the
        # Project menu still lists every project of the range.
        fb = Filters(since=NOW - 6 * 3600, until=NOW, project=str(b))
        split_b, one_b = compute_board(stores, fb, now=NOW), compute_board(single, fb, now=NOW)
        assert {p["id"] for p in split_b["options"]["projects"]} == {str(a), str(b)}
        assert _comparable(split_b) == _comparable(one_b)
    finally:
        single.close()


def test_a_project_filter_reads_every_active_store_and_filters_after(tmp_path, stores, monkeypatch):
    a, b = _repo(tmp_path / "a"), _repo(tmp_path / "b")
    _seed(stores, a, b)
    attached: list[tuple[str, ...]] = []
    real = ProjectStores._attach

    def spy(self, state, wanted):
        attached.append(wanted[0] + wanted[1])
        return real(self, state, wanted)

    monkeypatch.setattr(ProjectStores, "_attach", spy)
    board = compute_board(stores, Filters(since=NOW - 6 * 3600, until=NOW, project=str(a)), now=NOW)
    both = sorted([store_key(str(a)), store_key(str(b))])
    assert attached and all(sorted(w) == both for w in attached)
    assert {r["id"] for r in board["agents"]} == {"sa"}
    assert {p["id"] for p in board["options"]["projects"]} == {str(a), str(b)}


def test_all_projects_attach_only_stores_active_in_the_range(tmp_path, stores):
    a, b = _repo(tmp_path / "a"), _repo(tmp_path / "b")
    stores.upsert_session(
        SessionRow(session_id="old", tool="claude-code", project_path=str(a), started_at=NOW - 40 * 86400)
    )
    stores.append_request(
        RequestRow(ts=NOW - 40 * 86400, session_id="old", project_path=str(a), model=SONNET, source="otel")
    )
    stores.upsert_session(SessionRow(session_id="new", tool="claude-code", project_path=str(b), started_at=NOW - 60))
    stores.append_request(RequestRow(ts=NOW - 60, session_id="new", project_path=str(b), model=SONNET, source="otel"))
    stores.flush()
    with stores.read_scope(since=NOW - 86400, until=NOW):
        assert stores.attached_stores() == [store_key(str(b))]
    with stores.read_scope(since=NOW - 50 * 86400, until=NOW):
        assert sorted(stores.attached_stores()) == sorted([store_key(str(a)), store_key(str(b))])


MANY = 25


def _seed_many(db, repos: list[Path]) -> None:
    """One session per repository, all active in the last hours, through the write API."""
    for i, repo in enumerate(repos):
        sid = f"m{i:02d}"
        db.upsert_session(
            SessionRow(session_id=sid, tool="claude-code", project_path=str(repo), started_at=NOW - 7000 + i * 10)
        )
        for k in range(2):
            ts = NOW - 6000 + i * 60 + k * 7
            db.append_request(
                RequestRow(
                    ts=ts,
                    session_id=sid,
                    project_path=str(repo),
                    model=SONNET if i % 2 else HAIKU,
                    input_tokens=100 + i,
                    output_tokens=10 + k,
                    duration_ms=500,
                    source="otel",
                    source_ts=ts,
                )
            )
        db.append_tool_invocation(
            ToolInvocationRow(
                ts=NOW - 5900 + i * 60,
                session_id=sid,
                tool="claude-code",
                tool_name="Bash",
                source="otel",
                source_ts=NOW - 5900 + i * 60,
            )
        )
        db.write_call_facts(
            CallFacts(
                prompts=[
                    SessionPromptRow(
                        dedup_key=f"p-{sid}",
                        ts=NOW - 6001 + i * 60,
                        session_id=sid,
                        tool="claude-code",
                        project_path=str(repo),
                        text=f"task {i}",
                    )
                ]
            )
        )
    db.flush()


def test_the_board_reads_every_active_store_beyond_the_attach_limit(tmp_path, stores, caplog):
    repos = [_repo(tmp_path / f"r{i:02d}") for i in range(MANY)]
    single = HistoryDB(db_path=tmp_path / "single.db", flush_interval=0)
    try:
        _seed_many(single, repos)
        _seed_many(stores, repos)
        f = Filters(since=NOW - 3 * 3600, until=NOW)
        with caplog.at_level(logging.WARNING, logger="aictl.project_stores"):
            split = compute_board(stores, f, now=NOW)
        one = compute_board(single, f, now=NOW)
        with stores.read_scope(since=f.since - 3 * 3600, until=f.until):
            assert len(stores.attached_stores()) == MANY
        assert {r["id"] for r in split["agents"]} == {f"m{i:02d}" for i in range(MANY)}
        assert {p["id"] for p in split["options"]["projects"]} == {str(r) for r in repos}
        assert split["kpis"] == one["kpis"]
        assert split["series"] == one["series"]
        assert _comparable(split) == _comparable(one)
        assert "project stores" not in caplog.text
    finally:
        single.close()


def test_a_session_in_store_twenty_opens_in_the_drawer(tmp_path, stores):
    repos = [_repo(tmp_path / f"r{i:02d}") for i in range(MANY)]
    single = HistoryDB(db_path=tmp_path / "single.db", flush_interval=0)
    try:
        _seed_many(single, repos)
        _seed_many(stores, repos)
        status, split = agent_detail(stores, "m20", now=NOW)
        assert status == 200
        assert json.dumps(split, sort_keys=True, default=str) == json.dumps(
            agent_detail(single, "m20", now=NOW)[1], sort_keys=True, default=str
        )
    finally:
        single.close()


def test_a_session_unknown_to_the_router_is_found_in_its_store(tmp_path):
    path = tmp_path / "config" / "history.db"
    repos = [_repo(tmp_path / f"r{i:02d}") for i in range(12)]
    with ProjectStores(db_path=path, flush_interval=0) as first:
        _seed_many(first, repos)
        # Rows of a session that has no sessions row anywhere.
        first.append_request(
            RequestRow(
                ts=NOW - 100,
                session_id="orphan",
                project_path=str(repos[3]),
                model=SONNET,
                input_tokens=7,
                source="otel",
            )
        )
        first.flush()
    with ProjectStores(db_path=path, flush_interval=0) as second:
        assert second.store_of_session("orphan") is None
        status, payload = agent_detail(second, "orphan", now=NOW)
        assert status == 200
        with second.read_scope(session="orphan"):
            assert second.attached_stores() == [store_key(str(repos[3]))]
        assert second.get_session("m11")["session_id"] == "m11"


def test_session_reads_find_a_session_in_any_store(tmp_path, stores):
    a = _repo(tmp_path / "a")
    stores.upsert_session(SessionRow(session_id="s9", tool="claude-code", project_path=str(a), started_at=NOW))
    stores.upsert_session_commits("s9", [{"sha": "abc", "subject": "fix", "ts": NOW}])
    assert stores.get_session("s9")["session_id"] == "s9"
    assert stores.count_session_commits("s9") == 1
    assert stores.query_sessions(since=NOW - 10)[0]["session_id"] == "s9"


def test_the_read_connection_takes_no_write_lock_while_a_store_writes(tmp_path, stores):
    a = _repo(tmp_path / "a")
    stores.upsert_session(SessionRow(session_id="s5", tool="claude-code", project_path=str(a), started_at=NOW))
    writer = stores._stores[store_key(str(a))]._conn()
    writer.execute("BEGIN IMMEDIATE")
    try:
        started = time.monotonic()
        assert stores.get_session("s5") is not None
        assert time.monotonic() - started < 0.25
    finally:
        writer.rollback()


def test_a_copied_store_shows_its_new_rows(tmp_path, stores):
    repos = [_repo(tmp_path / f"r{i:02d}") for i in range(12)]
    _seed_many(stores, repos)
    f = Filters(since=NOW - 3 * 3600, until=NOW)
    before = compute_board(stores, f, now=NOW)
    # The least recent store stays beyond the attach limit: its new row is older than the others.
    stores.append_request(
        RequestRow(
            ts=NOW - 6500, session_id="m00", project_path=str(repos[0]), model=HAIKU, input_tokens=5000, source="otel"
        )
    )
    stores.flush()
    with stores.read_scope(since=f.since - 3 * 3600, until=f.until):
        assert stores._read_state().copied[-1] == store_key(str(repos[0]))
    after = compute_board(stores, f, now=NOW)
    assert after["kpis"] != before["kpis"]
