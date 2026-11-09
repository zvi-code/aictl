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


def test_a_flood_into_one_repository_does_not_block_another(tmp_path, stores, monkeypatch):
    """While one store's write transaction is open, writes and board reads of
    another project go through.

    The flood is held inside its transaction (rows inserted, write lock held, not
    committed) until the other project has written and read.
    """
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
            for i in range(200)
        ]
    )
    busy_db = stores._stores[store_key(str(busy))]
    real_drop = busy_db._drop_superseded_rows
    inside, release = threading.Event(), threading.Event()
    errors: list[BaseException] = []

    def hold(conn, facts):  # the last step before the flood's commit
        real_drop(conn, facts)
        assert conn.in_transaction
        inside.set()
        release.wait(30)  # bounded: a test that fails before release does not leave it hanging

    def write():
        try:
            stores.write_call_facts(flood)
        except BaseException as exc:  # noqa: BLE001 - reported below
            errors.append(exc)
        finally:
            inside.set()

    monkeypatch.setattr(busy_db, "_drop_superseded_rows", hold)
    writer = threading.Thread(target=write)
    writer.start()
    try:
        assert inside.wait(30), "inside was never set"
        assert not errors, errors
        assert busy_db.running_writes(), "the flood is not in its transaction"
        # No lock the other project needs is held by the flood (and so nothing below can hang).
        for lock in (stores._stores_lock, stores._route_lock, stores._index_lock, stores.machine._lock):
            assert lock.acquire(blocking=False), lock
            lock.release()
        for i in range(5):
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
            compute_board(stores, Filters(since=NOW - 3600, until=NOW), now=NOW)
        assert _rows(_store_file(stores, quiet), "requests") == 5
        assert busy_db.running_writes(), "the flood committed before the other project wrote"
    finally:
        release.set()
        writer.join(timeout=30)
        assert not writer.is_alive(), "writer did not finish: a hang fails the test instead of stalling the run"
    assert not errors, errors
    assert _rows(_store_file(stores, busy), "requests") == 200


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


def test_the_read_connection_takes_no_write_lock_while_a_store_writes(tmp_path, stores, monkeypatch):
    import aictl.storage as storage

    a = _repo(tmp_path / "a")
    stores.upsert_session(SessionRow(session_id="s5", tool="claude-code", project_path=str(a), started_at=NOW))
    writer = stores._stores[store_key(str(a))]._conn()
    # No busy wait: a read connection that needed the write lock would fail at once.
    monkeypatch.setattr(storage, "BUSY_TIMEOUT_S", 0.0)
    writer.execute("BEGIN IMMEDIATE")
    try:
        assert stores.get_session("s5") is not None
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


def _seed_legacy(path: Path, a: Path, b: Path) -> None:
    """A history written by one store before the split: two repositories, a session with
    no folder, and a request forty days old."""
    single = HistoryDB(db_path=path, flush_interval=0)
    _seed(single, a, b)
    single.upsert_session(SessionRow(session_id="nofolder", tool="claude-code", started_at=NOW - 600))
    single.append_request(RequestRow(ts=NOW - 500, session_id="nofolder", model=SONNET, source="otel"))
    old = NOW - 40 * 86400
    single.append_request(RequestRow(ts=old, session_id="sb", project_path=str(b), model=HAIKU, source="otel"))
    single.flush()
    single.close()


def test_an_old_single_store_splits_into_project_stores_with_the_same_board(tmp_path):
    path = tmp_path / "config" / "history.db"
    a, b = _repo(tmp_path / "a"), _repo(tmp_path / "b")
    _seed_legacy(path, a, b)
    recent = Filters(since=NOW - 6 * 3600, until=NOW)
    old = Filters(since=NOW - 41 * 86400, until=NOW - 39 * 86400)
    with ProjectStores(db_path=path, flush_interval=0) as stores:
        # A new session already wrote to b's store: its time range starts now.
        stores.upsert_session(SessionRow(session_id="new", tool="claude-code", project_path=str(b), started_at=NOW))
        stores.append_request(RequestRow(ts=NOW - 100, session_id="new", project_path=str(b), model=SONNET, source="otel"))
        stores.flush()
        before = [compute_board(stores, f, now=NOW) for f in (recent, old)]
        assert stores.split_machine_sessions() == 0
        stores.flush()
        # Every session left the machine store, and each project store holds its own.
        for table in ("sessions", "requests", "tool_invocations", "session_prompts", "skill_uses"):
            assert _rows(path, table, "session_id != ''") == 0, table
        assert _rows(_store_file(stores, a), "requests") == 4
        assert _rows(_store_file(stores, b), "requests") == 7
        assert _rows(stores.projects_dir / f"{SHARED}.db", "requests") == 1
        after = [compute_board(stores, f, now=NOW) for f in (recent, old)]
    assert len(before[1]["agents"]) == 1
    for b_, a_ in zip(before, after):
        assert _comparable(a_) == _comparable(b_)


def test_a_split_stopped_part_way_finishes_in_the_next_process(tmp_path):
    path = tmp_path / "config" / "history.db"
    a, b = _repo(tmp_path / "a"), _repo(tmp_path / "b")
    _seed_legacy(path, a, b)
    with ProjectStores(db_path=path, flush_interval=0) as stores:
        assert stores.split_machine_sessions(budget_s=0.0) > 0
    with ProjectStores(db_path=path, flush_interval=0) as stores:
        assert stores.split_machine_sessions() == 0
        stores.flush()
        assert _rows(path, "requests", "session_id != ''") == 0
        assert _rows(_store_file(stores, a), "requests") + _rows(_store_file(stores, b), "requests") == 10


def test_the_split_says_when_it_starts_and_when_it_is_done(tmp_path):
    path = tmp_path / "config" / "history.db"
    a, b = _repo(tmp_path / "a"), _repo(tmp_path / "b")
    _seed_legacy(path, a, b)
    said: list[str] = []
    with ProjectStores(db_path=path, flush_interval=0, say=said.append) as stores:
        stores.split_machine_sessions(budget_s=0.0)
        assert said and "4 older sessions move" in said[0]
        stores.split_machine_sessions()
        assert "history split done: 4 sessions" in said[-1]
        count = len(said)
        stores.split_machine_sessions()
        assert len(said) == count  # nothing left: nothing more to say


# ─── Locks ────────────────────────────────────────────────────────


def test_a_large_session_moves_without_keeping_the_machine_store_locked(tmp_path, monkeypatch):
    """The split moved a session in one transaction that held the machine store's write
    lock for the whole session, and no running write named it.

    Now it moves a chunk per transaction: at every pause between two chunks another
    connection takes the machine store's write lock with no busy wait, and the move
    is named as a running write.
    """
    import types

    import aictl.project_stores as project_stores

    monkeypatch.setattr(project_stores, "FLUSH_CHUNK_ROWS", 10)
    path = tmp_path / "config" / "history.db"
    a = _repo(tmp_path / "a")
    single = HistoryDB(db_path=path, flush_interval=0)
    conn = single._conn()
    conn.execute(
        "INSERT INTO sessions(session_id, tool, project_path, started_at) VALUES('big', 'claude-code', ?, ?)",
        (str(a), NOW - 3600),
    )
    conn.executemany(
        "INSERT INTO requests(ts, session_id, project_path, model, input_tokens, source, dedup_key) VALUES(?,?,?,?,?,?,?)",
        [(NOW - 3000 + i * 0.01, "big", str(a), SONNET, 1, "otel", f"k{i}") for i in range(35)],
    )
    conn.commit()
    single.close()
    with ProjectStores(db_path=path, flush_interval=0) as stores:
        probe = sqlite3.connect(path, timeout=0, isolation_level=None)
        left: list[int] = []
        named: list[str] = []

        def pause(_seconds):  # between two chunks of the move
            probe.execute("BEGIN IMMEDIATE")
            probe.execute("ROLLBACK")
            left.append(_rows(path, "requests", "session_id = 'big'"))
            named.extend(stores.active_writes())

        fake = types.SimpleNamespace(**{n: getattr(time, n) for n in dir(time) if not n.startswith("_")})
        fake.sleep = pause
        monkeypatch.setattr(project_stores, "time", fake)
        try:
            stores.split_machine_sessions()
        finally:
            probe.close()
        assert {25, 15, 5} <= set(left), left  # the lock was free after each chunk, with rows still to move
        assert any("move of session big" in w for w in named), named
        assert _rows(path, "requests", "session_id = 'big'") == 0
        assert _rows(_store_file(stores, a), "requests") == 35


def test_a_busy_store_skips_clearing_stale_prompts_and_says_so_once(tmp_path, monkeypatch, caplog):
    import aictl.storage as storage

    monkeypatch.setattr(storage, "BUSY_TIMEOUT_S", 0.1)
    with ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0) as stores:
        holder = sqlite3.connect(stores.machine._path, timeout=0.1)
        try:
            holder.execute("BEGIN IMMEDIATE")
            with caplog.at_level(logging.WARNING, logger="aictl.project_stores"):
                assert stores.clear_stale_pending_confirms(NOW) == 0
                assert stores.clear_stale_pending_confirms(NOW) == 0
        finally:
            holder.rollback()
            holder.close()
        skipped = [r for r in caplog.records if "clear_stale_pending_confirms skipped" in r.getMessage()]
        assert len(skipped) == 1
        assert stores.clear_stale_pending_confirms(NOW) == 0
        # A call without a lock ends the incident: the next one warns again.
        holder = sqlite3.connect(stores.machine._path, timeout=0.1)
        try:
            holder.execute("BEGIN IMMEDIATE")
            with caplog.at_level(logging.WARNING, logger="aictl.project_stores"):
                stores.clear_stale_pending_confirms(NOW)
        finally:
            holder.rollback()
            holder.close()
        skipped = [r for r in caplog.records if "clear_stale_pending_confirms skipped" in r.getMessage()]
        assert len(skipped) == 2
