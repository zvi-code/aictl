"""Project stores: moves, schema, upkeep, cached reads, locks and paths."""

from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl import project_stores, storage
from aictl.commands.admin import db as db_cli
from aictl.dashboard.board_api import Filters, compute_board
from aictl.ingesters.cursor_conversations import CursorConversationsIngester
from aictl.project_stores import SHARED, ProjectStores, store_key
from aictl.storage import AgentRow, HistoryDB, RequestRow, SessionRow

NOW = time.time()
DAY = 86400.0
SONNET = "claude-sonnet-4-5"


def _repo(path: Path) -> Path:
    (path / ".git").mkdir(parents=True)
    return path


def _rows(file: Path, table: str, where: str = "1", params: tuple = ()) -> int:
    conn = sqlite3.connect(file)
    try:
        return conn.execute(f"SELECT COUNT(*) FROM {table} WHERE {where}", params).fetchone()[0]
    finally:
        conn.close()


def _file(stores: ProjectStores, folder: Path) -> Path:
    file = stores._file_of(store_key(str(folder)))
    assert file is not None
    return file


def _count(stores: ProjectStores, table: str, where: str = "1", **scope) -> int:
    with stores.read_scope(**scope):
        return stores._conn().execute(f"SELECT COUNT(*) FROM {table} WHERE {where}").fetchone()[0]


@pytest.fixture
def stores(tmp_path):
    s = ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0)
    yield s
    s.close()


# ─── 1. A move is one transaction, and retried ────────────────────


def test_a_move_that_cannot_lock_the_shared_store_changes_nothing_and_is_retried(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "BUSY_TIMEOUT_S", 0.2)
    repo = _repo(tmp_path / "alpha")
    with ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0) as s:
        s.batch_link_sessions([("s1", "claude-code", 42, NOW - 60, "process")])
        s.append_request(RequestRow(ts=NOW - 50, session_id="s1", model=SONNET, input_tokens=3, source="otel"))
        s.flush()
        shared = s.projects_dir / f"{SHARED}.db"
        blocker = sqlite3.connect(shared)
        blocker.execute("BEGIN IMMEDIATE")
        try:
            s.upsert_session(
                SessionRow(session_id="s1", tool="claude-code", project_path=str(repo), started_at=NOW - 60)
            )
            target = _file(s, repo)
            # Nothing was copied without being removed: one row of the call, in one store.
            assert _rows(shared, "requests") + _rows(target, "requests") == 1
        finally:
            blocker.rollback()
            blocker.close()
        s.flush()
        assert _rows(shared, "requests") == 0
        assert _rows(shared, "sessions") == 0
        assert _rows(target, "requests") == 1
        assert _rows(target, "session_processes") == 1


# ─── 2. Every store is on the current schema before a read ────────


def test_a_store_on_an_older_schema_is_migrated_before_reads(tmp_path):
    path = tmp_path / "config" / "history.db"
    repo = _repo(tmp_path / "old-schema")
    with ProjectStores(db_path=path, flush_interval=0) as first:
        first.upsert_session(
            SessionRow(session_id="o1", tool="claude-code", project_path=str(repo), started_at=NOW - 600)
        )
        first.append_request(
            RequestRow(ts=NOW - 500, session_id="o1", project_path=str(repo), model=SONNET, source="otel")
        )
        first.flush()
        file = _file(first, repo)
    conn = sqlite3.connect(file)
    conn.execute("ALTER TABLE requests DROP COLUMN ttft_ms")
    conn.execute("DELETE FROM schema_version")
    conn.execute("INSERT INTO schema_version(version) VALUES(29)")
    conn.commit()
    conn.close()
    with ProjectStores(db_path=path, flush_interval=0) as second:
        board = compute_board(second, Filters(since=NOW - 3600, until=NOW), now=NOW)
        assert {r["id"] for r in board["agents"]} == {"o1"}


# ─── 3. Upkeep covers every store, under one budget ───────────────


def test_retention_reaches_a_closed_store(tmp_path):
    path = tmp_path / "config" / "history.db"
    machine = HistoryDB(db_path=path, flush_interval=0)
    # Automatic retention was armed by the daemon's first run, over a retention period ago.
    machine._conn().execute(
        "INSERT INTO maintenance_state(key, value) VALUES('retention_armed_at', ?)", (NOW - 31 * DAY,)
    )
    machine._conn().commit()
    machine.close()
    repo = _repo(tmp_path / "old")
    with ProjectStores(db_path=path, flush_interval=0, retention_days=30) as s:
        s.upsert_session(
            SessionRow(session_id="r1", tool="claude-code", project_path=str(repo), started_at=NOW - 40 * DAY)
        )
        s.append_request(
            RequestRow(ts=NOW - 40 * DAY, session_id="r1", project_path=str(repo), model=SONNET, source="otel")
        )
        s.flush()
        s.close_idle(idle_s=0)
        assert s.open_stores() == {}
        s.auto_maintain()
        assert _rows(_file(s, repo), "requests") == 0


def test_one_size_budget_is_shared_by_every_store(tmp_path, monkeypatch):
    budgets: list[int] = []
    real = HistoryDB.enforce_budget

    def spy(self):
        budgets.append(self._budget_bytes)
        return real(self)

    monkeypatch.setattr(HistoryDB, "enforce_budget", spy)
    a, b = _repo(tmp_path / "a"), _repo(tmp_path / "b")
    with ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0, max_total_mb=1) as s:
        for sid, repo in (("ba", a), ("bb", b)):
            s.upsert_session(SessionRow(session_id=sid, tool="claude-code", project_path=str(repo), started_at=NOW))
        s.auto_maintain()
        assert len(budgets) == 3
        assert sum(budgets) <= 1024 * 1024
        assert s.machine._budget_bytes == 1024 * 1024


# ─── 4. and 5. A cached read connection never hides rows ──────────


def test_rows_written_later_to_an_empty_machine_table_are_read(tmp_path):
    path = tmp_path / "config" / "history.db"
    legacy = HistoryDB(db_path=path, flush_interval=0)
    legacy.upsert_session(SessionRow(session_id="legacy", tool="claude-code", started_at=NOW - 100))
    legacy.close()
    repo = _repo(tmp_path / "new")
    with ProjectStores(db_path=path, flush_interval=0) as s:
        s.upsert_session(SessionRow(session_id="n1", tool="claude-code", project_path=str(repo), started_at=NOW))
        s.append_request(RequestRow(ts=NOW, session_id="n1", project_path=str(repo), model=SONNET, source="otel"))
        assert _count(s, "requests") == 1
        # The legacy session writes to the machine store, whose requests table was empty.
        s.append_request(RequestRow(ts=NOW, session_id="legacy", model=SONNET, input_tokens=9, source="otel"))
        assert _count(s, "requests") == 2


def test_a_read_before_a_store_has_a_file_does_not_hide_its_later_rows(tmp_path, stores):
    repo = _repo(tmp_path / "later")
    assert _count(stores, "requests", project=str(repo)) == 0
    stores.upsert_session(SessionRow(session_id="l1", tool="claude-code", project_path=str(repo), started_at=NOW))
    stores.append_request(RequestRow(ts=NOW, session_id="l1", project_path=str(repo), model=SONNET, source="otel"))
    assert _count(stores, "requests", project=str(repo)) == 1


# ─── 6. Every write makes its store visible; startup knows every session ──


def test_a_store_with_only_process_links_is_read(stores):
    stores.batch_link_sessions([("p1", "claude-code", 77, NOW - 30, "process")])
    assert _count(stores, "session_processes", "session_id = 'p1'", since=NOW - 3600, until=NOW) == 1


def test_a_session_named_only_by_a_subagent_is_placed_on_startup(tmp_path):
    path = tmp_path / "config" / "history.db"
    with ProjectStores(db_path=path, flush_interval=0) as first:
        first.upsert_agent(AgentRow(agent_id="a1", session_id="ghost", started_at=NOW))
    with ProjectStores(db_path=path, flush_interval=0) as second:
        assert second.store_of_session("ghost") == SHARED


# ─── 7. A lookup made before a move is not kept ───────────────────


def test_a_subagent_found_before_its_session_moved_is_found_after(tmp_path, stores):
    repo = _repo(tmp_path / "moved")
    stores.batch_link_sessions([("s7", "claude-code", 7, NOW - 60, "process")])
    stores.upsert_agent(AgentRow(agent_id="sub7", session_id="s7", started_at=NOW - 50))
    assert stores._find_store("sub7") == SHARED
    stores.upsert_session(SessionRow(session_id="s7", tool="claude-code", project_path=str(repo), started_at=NOW - 60))
    assert stores._find_store("sub7") == store_key(str(repo))


# ─── 8. Admin commands cover every store ──────────────────────────


def test_db_reset_removes_the_project_stores(tmp_path):
    path = tmp_path / "config" / "history.db"
    repo = _repo(tmp_path / "reset-me")
    with ProjectStores(db_path=path, flush_interval=0) as s:
        s.upsert_session(SessionRow(session_id="gone", tool="claude-code", project_path=str(repo), started_at=NOW))
    result = CliRunner().invoke(db_cli, ["--db", str(path), "reset", "--yes"])
    assert result.exit_code == 0, result.output
    with ProjectStores(db_path=path, flush_interval=0) as after:
        assert after.get_session("gone") is None


def test_stats_and_compact_cover_every_store(tmp_path):
    path = tmp_path / "config" / "history.db"
    repo = _repo(tmp_path / "counted")
    with ProjectStores(db_path=path, flush_interval=0, retention_days=30) as s:
        s.upsert_session(SessionRow(session_id="c1", tool="claude-code", project_path=str(repo), started_at=NOW))
        s.append_request(RequestRow(ts=NOW, session_id="c1", project_path=str(repo), model=SONNET, source="otel"))
        s.append_request(
            RequestRow(
                ts=NOW - 40 * DAY, session_id="c1", project_path=str(repo), model=SONNET, input_tokens=1, source="otel"
            )
        )
        s.flush()
        assert s.stats()["requests_count"] == 2
        s.compact()
        assert s.stats()["requests_count"] == 1
    result = CliRunner().invoke(db_cli, ["--db", str(path), "stats"])
    assert result.exit_code == 0, result.output
    assert any(line.split() == ["requests", "1"] for line in result.output.splitlines())


# ─── 9. Slow paths do not hold the global locks ───────────────────


def test_a_slow_folder_lookup_does_not_hold_other_writers(tmp_path, stores, monkeypatch):
    quick = _repo(tmp_path / "quick")
    stores.upsert_session(SessionRow(session_id="q", tool="claude-code", project_path=str(quick), started_at=NOW))
    real = project_stores._repository_root

    def slow(path: str) -> str:
        if "slow" in path:
            time.sleep(1.0)
        return real(path)

    monkeypatch.setattr(project_stores, "_repository_root", slow)
    t = threading.Thread(
        target=stores.append_request,
        args=(RequestRow(ts=NOW, session_id="x", project_path=str(tmp_path / "slow"), model=SONNET, source="otel"),),
    )
    t.start()
    time.sleep(0.1)
    started = time.monotonic()
    stores.append_request(
        RequestRow(ts=NOW, session_id="q", project_path=str(quick), model=SONNET, input_tokens=2, source="otel")
    )
    took = time.monotonic() - started
    t.join()
    assert took < 0.25


def test_a_slow_store_open_does_not_hold_other_writers(tmp_path, stores, monkeypatch):
    quick, slowrepo = _repo(tmp_path / "quick"), _repo(tmp_path / "slowopen")
    stores.upsert_session(SessionRow(session_id="q", tool="claude-code", project_path=str(quick), started_at=NOW))
    real = ProjectStores._open

    def slow(self, key):
        if "slowopen" in key:
            time.sleep(1.0)
        return real(self, key)

    monkeypatch.setattr(ProjectStores, "_open", slow)
    t = threading.Thread(
        target=stores.upsert_session,
        args=(SessionRow(session_id="so", tool="claude-code", project_path=str(slowrepo), started_at=NOW),),
    )
    t.start()
    time.sleep(0.1)
    started = time.monotonic()
    stores.append_request(
        RequestRow(ts=NOW, session_id="q", project_path=str(quick), model=SONNET, input_tokens=4, source="otel")
    )
    took = time.monotonic() - started
    t.join()
    assert took < 0.25
    assert stores.store_of_session("so") == store_key(str(slowrepo))


# ─── 10. Paths with URI characters ────────────────────────────────


def test_a_config_folder_with_uri_characters_finds_its_stores_again(tmp_path):
    path = tmp_path / "we#ird%25 dir?x" / "history.db"
    repo = _repo(tmp_path / "plain")
    with ProjectStores(db_path=path, flush_interval=0) as first:
        first.upsert_session(SessionRow(session_id="u1", tool="claude-code", project_path=str(repo), started_at=NOW))
    with ProjectStores(db_path=path, flush_interval=0) as second:
        assert second.store_of_session("u1") == store_key(str(repo))


# ─── 11. Ingesters write their own tables without the read connection ──


def test_an_ingester_writes_without_attaching_project_stores_and_provisions_once(tmp_path, stores, monkeypatch):
    repo = _repo(tmp_path / "cursor-project")
    ingester = CursorConversationsIngester(tmp_path / "missing.db", stores)
    upserts: list[str] = []
    real = ProjectStores.upsert_session

    def spy(self, row):
        upserts.append(row.session_id)
        return real(self, row)

    monkeypatch.setattr(ProjectStores, "upsert_session", spy)
    first = ingester._correlate("conv-1", str(repo), NOW - 10)
    again = ingester._correlate("conv-1", str(repo), NOW - 5)
    assert first == again
    assert upserts.count("cursor:conv-1") == 1
    stores._local.__dict__.pop("conns", None)
    assert ingester._insert_message(first, 1, "user", "hello", NOW - 4)
    assert getattr(stores._local, "conns", None) is None


# ─── Recheck: the stores' folder, one store open at a time, half moves, misses ──


def test_reset_deletes_only_project_stores(tmp_path):
    path = tmp_path / "data" / "history.db"
    repo = _repo(tmp_path / "keep-repo")
    user_projects = tmp_path / "data" / "projects" / "myapp"
    user_projects.mkdir(parents=True)
    (user_projects / "main.c").write_text("int main(void) { return 0; }\n")
    with ProjectStores(db_path=path, flush_interval=0) as s:
        assert s.projects_dir == tmp_path / "data" / "history-projects"
        s.upsert_session(SessionRow(session_id="r1", tool="claude-code", project_path=str(repo), started_at=NOW))
        store = _file(s, repo)
    stray = store.parent / "notes.db"
    stray.write_bytes(b"not a store")
    result = CliRunner().invoke(db_cli, ["--db", str(path), "reset", "--yes"])
    assert result.exit_code == 0, result.output
    assert (user_projects / "main.c").exists()
    assert stray.exists()
    assert not store.exists()


def test_a_full_upkeep_pass_holds_few_stores_open(tmp_path, monkeypatch):
    live: list[int] = [0]
    peak: list[int] = [0]
    real_init, real_close = project_stores._ProjectDB.__init__, project_stores._ProjectDB.close

    def init(self, *args, **kwargs):
        real_init(self, *args, **kwargs)
        live[0] += 1
        peak[0] = max(peak[0], live[0])

    def close(self):
        if not getattr(self, "_counted_closed", False):
            self._counted_closed = True
            live[0] -= 1
        real_close(self)

    monkeypatch.setattr(project_stores._ProjectDB, "__init__", init)
    monkeypatch.setattr(project_stores._ProjectDB, "close", close)
    with ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0) as s:
        for i in range(60):
            repo = _repo(tmp_path / f"r{i:02d}")
            s.upsert_session(SessionRow(session_id=f"u{i}", tool="claude-code", project_path=str(repo), started_at=NOW))
        s.close_idle(idle_s=0)
        live[0], peak[0] = 0, 0
        s.auto_maintain()
        s.clear_stale_pending_confirms(NOW)
        s.stats()
        assert peak[0] <= 2


def test_a_half_done_move_is_finished_on_start(tmp_path):
    path = tmp_path / "config" / "history.db"
    repo = _repo(tmp_path / "half")
    with ProjectStores(db_path=path, flush_interval=0) as s:
        s.batch_link_sessions([("h1", "claude-code", 5, NOW - 60, "process")])
        s.append_request(RequestRow(ts=NOW - 50, session_id="h1", model=SONNET, input_tokens=3, source="otel"))
        s.flush()
        s.upsert_session(SessionRow(session_id="h1", tool="claude-code", project_path=str(repo), started_at=NOW - 60))
        target, shared = _file(s, repo), s.projects_dir / f"{SHARED}.db"
    # A crash after the copy reached the project store, before the delete reached _shared.
    conn = sqlite3.connect(shared)
    conn.execute("ATTACH DATABASE ? AS t", (str(target),))
    for table in ("sessions", "requests", "session_processes"):
        conn.execute(f"INSERT INTO main.{table} SELECT * FROM t.{table} WHERE session_id = 'h1'")
    conn.commit()
    conn.close()
    with ProjectStores(db_path=path, flush_interval=0) as again:
        assert again.store_of_session("h1") == store_key(str(repo))
        assert _rows(shared, "requests") == 0
        assert _rows(shared, "sessions") == 0
        assert _rows(target, "requests") == 1
        assert _count(again, "requests", "session_id = 'h1'", session="h1") == 1


def test_a_pending_move_reads_both_stores(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "BUSY_TIMEOUT_S", 0.2)
    repo = _repo(tmp_path / "pending")
    with ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0) as s:
        s.batch_link_sessions([("pm", "claude-code", 6, NOW - 60, "process")])
        s.append_request(RequestRow(ts=NOW - 50, session_id="pm", model=SONNET, input_tokens=3, source="otel"))
        s.flush()
        blocker = sqlite3.connect(s.projects_dir / f"{SHARED}.db")
        blocker.execute("BEGIN IMMEDIATE")
        try:
            s.upsert_session(
                SessionRow(session_id="pm", tool="claude-code", project_path=str(repo), started_at=NOW - 60)
            )
            assert _count(s, "requests", "session_id = 'pm'", session="pm") == 1
        finally:
            blocker.rollback()
            blocker.close()


def test_an_unknown_session_is_not_looked_up_again_until_written(tmp_path, stores, monkeypatch):
    for i in range(3):
        repo = _repo(tmp_path / f"m{i}")
        stores.upsert_session(
            SessionRow(session_id=f"k{i}", tool="claude-code", project_path=str(repo), started_at=NOW)
        )
    opened: list[Path] = []
    real = project_stores._read_only

    def spy(file):
        opened.append(file)
        return real(file)

    monkeypatch.setattr(project_stores, "_read_only", spy)
    assert stores.get_session("nope") is None
    first = len(opened)
    assert stores.get_session("nope") is None
    assert len(opened) == first
    repo = _repo(tmp_path / "late")
    stores.upsert_session(SessionRow(session_id="nope", tool="claude-code", project_path=str(repo), started_at=NOW))
    assert stores.get_session("nope")["session_id"] == "nope"


def test_cursor_finds_its_session_stored_under_another_repository(tmp_path, stores):
    first, later = _repo(tmp_path / "first"), _repo(tmp_path / "later")
    stores.upsert_session(SessionRow(session_id="cx", tool="cursor", project_path=str(first), started_at=NOW - 100))
    # The session is placed in its first folder's store; its folder changes afterwards.
    stores.upsert_session(SessionRow(session_id="cx", tool="cursor", project_path=str(later), started_at=NOW - 100))
    ingester = CursorConversationsIngester(tmp_path / "missing.db", stores)
    assert ingester._correlate("conv-x", str(later), NOW - 10) == "cx"


def test_a_project_store_that_falls_back_to_memory_is_reported(tmp_path, caplog):
    path = tmp_path / "config" / "history.db"
    repo = _repo(tmp_path / "broken")
    with ProjectStores(db_path=path, flush_interval=0) as s:
        s.upsert_session(SessionRow(session_id="b1", tool="claude-code", project_path=str(repo), started_at=NOW))
        file = _file(s, repo)
    file.write_bytes(b"this is not a database" * 100)
    with caplog.at_level("WARNING", logger="aictl.project_stores"):
        with ProjectStores(db_path=path, flush_interval=0, memory_fallback=True) as again:
            again.append_request(
                RequestRow(ts=NOW, session_id="b1", project_path=str(repo), model=SONNET, source="otel")
            )
    assert any(
        r.name == "aictl.project_stores" and file.name in r.getMessage() and "in memory" in r.getMessage()
        for r in caplog.records
    )
