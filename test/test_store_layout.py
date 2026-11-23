"""The stored data layout: version, compatibility check, migrations, reset and the restart-state epoch."""

from __future__ import annotations

import os
from pathlib import Path
from types import SimpleNamespace

import click
import pytest
from click.testing import CliRunner
from kusto_layout_double import FakeKusto

from aictl import state_file
from aictl.kusto import KustoSettings
from aictl.state_file import EPOCH_FILE, RestartStateError, StateFile, sync_data_epoch
from aictl.stores.kusto import layout as L
from aictl.stores.kusto import maintenance, migrations
from aictl.stores.kusto.client import KustoClientFactory
from aictl.stores.kusto.schema import ensure_schema, owned_tables
from aictl.stores.kusto.tables import TABLES

SETTINGS = KustoSettings("https://layout.example.invalid", database="db", node_id="node-a")
V = L.LAYOUT_VERSION  # this build's layout, before a test bumps it
SMALL = {name: TABLES[name] for name in ("requests", "tool_invocations", "sessions")}


@pytest.fixture(autouse=True)
def fresh_epoch_checks(monkeypatch):
    monkeypatch.setattr(state_file, "_checked", {})


def with_data(**rows):
    fake = FakeKusto()
    for name in SMALL:
        fake.with_table(name, rows=rows.get(name, 5))
    return fake


def ensure(fake, **kwargs):
    return ensure_schema(fake, "db", tables=SMALL, modes=dict.fromkeys(SMALL, "queued"), node_id="node-a",
                         cluster=SETTINGS.cluster, **kwargs)


def layout_writes(fake):
    return [c for c in fake.commands if c.startswith(".set-or-append ['schema_version']")]


def bump(monkeypatch, latest, compatible, *changes):
    monkeypatch.setattr(L, "LAYOUT_VERSION", latest)
    monkeypatch.setattr(L, "COMPATIBLE_SINCE", compatible)
    monkeypatch.setattr(L, "CHANGES", (*L.CHANGES, *changes))


# ── the check, branch by branch ────────────────────────────────────


def test_new_database_is_created_and_records_a_new_epoch():
    fake = FakeKusto()
    status = ensure(fake)
    assert {"requests", "tool_invocations", "sessions", "schema_version"} <= fake.tables.keys()
    [row] = fake.layout_rows
    assert row["kind"] == "layout" and row["detail"] == "new" and row["node_id"] == "node-a"
    assert row["version"] == L.LAYOUT_VERSION and row["compatible_since"] == L.COMPATIBLE_SINCE
    assert status.data_epoch == row["data_epoch"] and len(status.data_epoch) == 32
    assert status.layout["verdict"] == L.NEW and status.layout["stored_version"] is None
    assert not status.epoch_kept_data


def test_empty_aictl_tables_without_a_version_row_count_as_new():
    status = ensure(with_data(requests=0, tool_invocations=0, sessions=0))
    assert status.layout["verdict"] == L.NEW


def test_tables_whose_details_lag_are_read_before_they_count_as_empty():
    fake = with_data(requests=0, tool_invocations=0, sessions=0)
    fake.counts = lambda query: 1 if query.startswith("union isfuzzy=true ['requests']") else 0
    with pytest.raises(L.LayoutMigrationRequired):
        ensure(fake)
    assert fake.changes == []


def test_compatible_same_version_writes_nothing_and_keeps_the_epoch():
    fake = with_data().with_table("schema_version", 1).layout_row(L.LAYOUT_VERSION, L.COMPATIBLE_SINCE, "epoch-1")
    status = ensure(fake)
    assert not layout_writes(fake)
    assert status.data_epoch == "epoch-1" and status.layout["verdict"] == L.CURRENT


def test_compatible_older_layout_widens_tables_then_records_the_new_version(monkeypatch):
    bump(monkeypatch, L.LAYOUT_VERSION + 1, L.COMPATIBLE_SINCE, L.Change(L.LAYOUT_VERSION + 1, "a column", False))
    fake = with_data().layout_row(L.LAYOUT_VERSION - 1, L.COMPATIBLE_SINCE, "epoch-1")
    del fake.tables["sessions"]["columns"]["tool"]
    status = ensure(fake)
    widen = next(i for i, c in enumerate(fake.commands) if c.startswith(".create-merge table ['sessions']"))
    record = fake.commands.index(layout_writes(fake)[0])
    assert widen < record
    assert (fake.layout_rows[-1]["version"], fake.layout_rows[-1]["detail"]) == (L.LAYOUT_VERSION, "upgrade")
    assert fake.layout_rows[-1]["data_epoch"] == status.data_epoch == "epoch-1"


def test_an_older_node_never_lowers_the_stored_version():
    fake = with_data().layout_row(L.LAYOUT_VERSION + 2, L.COMPATIBLE_SINCE, "epoch-1")
    status = ensure(fake)
    assert not layout_writes(fake)
    assert status.layout["verdict"] == L.CURRENT and status.layout["stored_version"] == L.LAYOUT_VERSION + 2


def test_unversioned_data_with_a_migration_stops_before_any_change():
    fake = with_data()
    with pytest.raises(L.LayoutMigrationRequired) as error:
        ensure(fake)
    assert fake.changes == []
    text = str(error.value)
    assert "layout 0 (no version recorded)" in text and f"layout {L.LAYOUT_VERSION}" in text
    assert "requests_single_copy" in text and "aictl db migrate --dry-run" in text
    assert f"--kusto-cluster {SETTINGS.cluster} --kusto-database db" in text
    assert "aictl db reset" not in text


def test_incompatible_old_layout_without_a_migration_asks_for_a_reset(monkeypatch):
    bump(monkeypatch, L.LAYOUT_VERSION + 1, L.LAYOUT_VERSION + 1,
         L.Change(L.LAYOUT_VERSION + 1, "sessions keyed by process", True))
    fake = with_data().layout_row(V, V)
    with pytest.raises(L.LayoutResetRequired) as error:
        ensure(fake)
    assert fake.changes == []
    text = str(error.value)
    assert f"No migration exists for: layout {L.LAYOUT_VERSION}" in text
    assert "sessions keyed by process" in text and "aictl db reset" in text
    assert "session files still on its disk" in text and "cannot be rebuilt" in text


def test_data_written_by_newer_incompatible_code_asks_for_an_upgrade_never_a_reset():
    fake = with_data().layout_row(L.LAYOUT_VERSION + 3, L.LAYOUT_VERSION + 3)
    with pytest.raises(L.LayoutNewerError) as error:
        ensure(fake)
    assert fake.changes == []
    assert "Upgrade aictl on this node" in str(error.value) and "aictl db reset" not in str(error.value)


def test_read_only_open_warns_instead_of_failing(monkeypatch):
    from aictl.stores import open_store

    fake = with_data()
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    store = open_store("kusto", settings=SETTINGS, read_only=True)
    assert store.layout["verdict"] == L.MIGRATE and "aictl db migrate" in store.layout["warning"]
    assert store.health()["layout"]["version"] == L.LAYOUT_VERSION
    assert fake.changes == []


def test_read_only_open_survives_a_failed_layout_read(monkeypatch):
    from aictl.stores import open_store

    fake = FakeKusto()
    fake.fail = lambda text: (_ for _ in ()).throw(RuntimeError("offline"))
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    store = open_store("kusto", settings=SETTINGS, read_only=True)
    assert "not checked" in store.layout["warning"]


def test_writing_open_reports_the_layout_in_health(monkeypatch):
    from aictl.stores import kusto as plugin
    from aictl.stores import open_store

    fake = FakeKusto()
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    monkeypatch.setattr(KustoClientFactory, "native_ingester", lambda _: SimpleNamespace())
    monkeypatch.setattr(plugin, "_auto_migrate", lambda: False)
    local = KustoSettings("http://localhost:8080", database="db", node_id="node-a", auth="none")
    store = open_store("kusto", settings=local)
    try:
        layout = store.health()["layout"]
        assert layout["version"] == L.LAYOUT_VERSION and layout["compatible_since"] == L.COMPATIBLE_SINCE
        assert layout["data_epoch"] == fake.layout_rows[0]["data_epoch"] and layout["stored_version"] is None
    finally:
        store.writer.close()


# ── migrations ─────────────────────────────────────────────────────


def counting(per_statement):
    """Answer a statement's count query by the first words of its description."""
    def count(query):
        for marker, rows in per_statement.items():
            if marker in query:
                return rows
        return 0
    return count


def test_migration_runs_after_widening_and_records_each_step_then_the_layout():
    fake = with_data()
    fake.counts = counting({"claude-code-jsonl": 7, "| where (coalesce(duration_ms": 2, "fact_key=o_key": 3})
    status = ensure(fake, migrate=migrations.runner(fake, "db"))
    appends = [c for c in fake.commands if c.startswith(".set-or-append ['requests']")]
    assert len(appends) == 3
    assert all("<| " in c and "['requests'] | take 0 | union (" in c for c in appends)
    first_append = fake.commands.index(appends[0])
    assert all(i < first_append for i, c in enumerate(fake.commands) if c.startswith(".create-merge"))
    step, agents_step, layout_row = fake.layout_rows
    assert (step["kind"], step["step"], step["detail"]) == ("migration", "requests_single_copy", "done: 12 rows")
    # The fake counts by text: the scan's session rows (source claude-code-jsonl) match too.
    assert (agents_step["step"], agents_step["detail"]) == ("agents_by_session", "done: 7 rows")
    assert (layout_row["kind"], layout_row["detail"]) == ("layout", "migrate")
    assert step["data_epoch"] == layout_row["data_epoch"] == status.data_epoch
    assert status.epoch_kept_data and status.layout["verdict"] == L.MIGRATE


def test_migration_skips_statements_with_nothing_to_change():
    fake = with_data()
    ensure(fake, migrate=migrations.runner(fake, "db"))
    assert not [c for c in fake.commands if c.startswith(".set-or-append ['requests']")]
    assert [row["detail"] for row in fake.layout_rows[:2]] == ["done: 0 rows", "done: 0 rows"]


def test_an_interrupted_migration_is_recorded_and_resumes_in_the_same_epoch():
    fake = with_data()
    fake.counts = counting({"claude-code-jsonl": 1, "fact_key=o_key": 1})

    def refuse_last(text):
        if text.startswith(".set-or-append ['requests']") and "fact_key=o_key" in text:
            raise RuntimeError("connection reset")

    fake.fail = refuse_last
    with pytest.raises(Exception, match="connection reset"):
        ensure(fake, migrate=migrations.runner(fake, "db"))
    [failed] = fake.layout_rows
    assert failed["detail"].startswith("failed: ") and failed["kind"] == "migration"
    fake.fail = lambda text: None
    with pytest.raises(L.LayoutMigrationRequired):
        ensure(fake)  # still not migrated: no writer may start
    status = ensure(fake, migrate=migrations.runner(fake, "db"))
    assert fake.layout_rows[-1]["detail"] == "migrate"
    assert status.data_epoch == failed["data_epoch"]


def test_a_step_recorded_done_is_not_run_again():
    stored = L.StoredLayout(0, 0, "e", migrations_done=frozenset({"requests_single_copy"}))
    assert [m.name for _, m in migrations.pending(stored)] == ["agents_by_session"]
    assert [m.name for _, m in migrations.pending(L.UNVERSIONED)] == ["requests_single_copy", "agents_by_session"]
    assert migrations.pending(L.StoredLayout(1, 1, "e")) == [(L.CHANGES[1], migrations.MIGRATIONS["agents_by_session"])]


def test_dry_run_prints_commands_and_counts_and_changes_nothing(monkeypatch):
    fake = with_data()
    fake.counts = counting({"claude-code-jsonl": 4})
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    lines = []
    verdict, results = maintenance.migrate_store(SETTINGS, dry_run=True, echo=lines.append)
    assert verdict == L.MIGRATE and fake.changes == []
    step, agents_step = results
    assert step.status == "planned" and [s.rows for s in step.statements] == [4, 0, 0]
    assert agents_step.status == "planned" and [s.rows for s in agents_step.statements] == [0, 0, 4]
    text = "\n".join(lines)
    assert "4 rows" in text and ".set-or-append ['requests'] <|" in text


def test_every_migration_statement_appends_by_column_name():
    tables = {"requests_single_copy": ["requests"] * 3,
              "agents_by_session": ["agents_text", "agents", "sessions"]}
    for migration in migrations.MIGRATIONS.values():
        for statement, table in zip(migration.plan(), tables[migration.name], strict=True):
            assert statement.command.startswith(f".set-or-append ['{table}'] <| ")
            assert f"['{table}'] | take 0 | union (" in statement.command
            assert statement.count_query.endswith("| count")


# ── reset ──────────────────────────────────────────────────────────


def test_reset_drops_only_owned_tables_and_starts_a_new_epoch(monkeypatch, tmp_path):
    fake = with_data().layout_row(L.LAYOUT_VERSION, L.COMPATIBLE_SINCE, "old-epoch")
    fake.with_table("someone_elses", 3, {"x": "long"})
    fake.with_table("aictl_information_schema", 2, {"table_name": "string"})
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    monkeypatch.setattr(maintenance, "restart_directory", lambda *_: tmp_path)
    (tmp_path / "copilot_messages.json").write_text("{}")
    StateFile(tmp_path / EPOCH_FILE).replace({"data_epoch": "old-epoch"})
    plan = maintenance.reset_plan(SETTINGS)
    assert "someone_elses" not in dict(plan) and dict(plan)["requests"] == 5
    status = maintenance.reset_store(SETTINGS, [name for name, _ in plan])
    [drop] = [c for c in fake.commands if c.startswith(".drop tables")]
    assert "someone_elses" not in drop and "['aictl_information_schema']" in drop and drop.endswith(" ifexists")
    assert "someone_elses" in fake.tables
    [row] = fake.layout_rows
    assert row["detail"] == "reset" and row["data_epoch"] == status.data_epoch != "old-epoch"
    assert not (tmp_path / "copilot_messages.json").exists()
    assert StateFile(tmp_path / EPOCH_FILE).read()["data_epoch"] == status.data_epoch


def test_reset_refuses_a_table_aictl_does_not_own(monkeypatch):
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: FakeKusto())
    with pytest.raises(Exception, match="does not own: someone_elses"):
        maintenance.reset_store(SETTINGS, ["requests", "someone_elses"])


def test_reset_names_the_role_when_the_drop_is_denied(monkeypatch):
    from aictl.stores.base import StorePermissionError

    fake = with_data()
    fake.fail = lambda text: (_ for _ in ()).throw(RuntimeError("Forbidden")) if text.startswith(".drop") else None
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    with pytest.raises(StorePermissionError, match="Drop aictl tables requires Database Admin"):
        maintenance.reset_store(SETTINGS, ["requests"])


def test_owned_tables_cover_every_definition_and_the_marker():
    from aictl.kusto.observations import COMPANIONS, CURRENT_STORE
    from aictl.stores.kusto.otel import TABLES as OTEL

    assert set(TABLES) | {t.name for t in OTEL} | {CURRENT_STORE} | COMPANIONS <= owned_tables()


# ── asking the user at start ───────────────────────────────────────


@pytest.fixture
def start_check(monkeypatch):
    from aictl.commands import admin, daemon

    calls = []
    monkeypatch.setattr(daemon, "kusto_settings", lambda: SETTINGS)
    monkeypatch.setattr(maintenance, "migrate_store", lambda *a, **k: calls.append("migrate"))
    monkeypatch.setattr(maintenance, "reset_plan", lambda _: [("requests", 5)])
    monkeypatch.setattr(maintenance, "reset_store", lambda *_: calls.append("reset") or
                        SimpleNamespace(data_epoch="new"))
    cfg = SimpleNamespace(capture="full", auto_migrate=False)

    def run(fake, *, interactive, answer=None):
        monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
        asked = []

        def confirm(text, **_):
            asked.append(text)
            return answer

        daemon._check_store_layout(cfg, interactive=interactive, echo=lambda *a, **k: None, confirm=confirm)
        return asked

    run.calls, run.cfg, run.admin = calls, cfg, admin
    return run


def test_start_offers_the_migration_and_runs_it_on_yes(start_check):
    asked = start_check(with_data(), interactive=True, answer=True)
    assert "Migrate the stored data in db" in asked[0] and start_check.calls == ["migrate"]


def test_start_stops_on_no_without_changing_anything(start_check):
    with pytest.raises(click.ClickException, match="aictl db migrate --dry-run"):
        start_check(with_data(), interactive=True, answer=False)
    assert start_check.calls == []


def test_start_without_a_terminal_stops_with_the_message(start_check):
    with pytest.raises(click.ClickException, match="To run it:  +aictl db migrate"):
        start_check(with_data(), interactive=False)
    assert start_check.calls == []


def test_start_runs_the_migration_alone_only_when_auto_migrate_allows_it(start_check):
    start_check.cfg.auto_migrate = True
    assert start_check(with_data(), interactive=False) == []
    assert start_check.calls == []  # opening the store migrates; nothing is asked


def test_start_offers_a_reset_only_without_a_migration(start_check, monkeypatch):
    bump(monkeypatch, L.LAYOUT_VERSION + 1, L.LAYOUT_VERSION + 1, L.Change(L.LAYOUT_VERSION + 1, "x", True))
    fake = with_data().layout_row(V, V)
    asked = start_check(fake, interactive=True, answer=True)
    assert asked == ["Delete the stored data in db on https://layout.example.invalid and start again?"]
    assert start_check.calls == ["reset"]
    start_check.calls.clear()
    with pytest.raises(click.ClickException, match="Not reset"):
        start_check(fake, interactive=True, answer=False)
    assert start_check.calls == []


def test_start_never_offers_to_delete_data_of_a_newer_aictl(start_check):
    fake = with_data().layout_row(L.LAYOUT_VERSION + 1, L.LAYOUT_VERSION + 1)
    with pytest.raises(click.ClickException, match="Upgrade aictl"):
        start_check(fake, interactive=True, answer=True)
    assert start_check.calls == []


def test_start_continues_on_a_compatible_layout(start_check):
    assert start_check(FakeKusto(), interactive=True, answer=True) == []


# ── commands ───────────────────────────────────────────────────────


def test_db_layout_prints_both_versions_the_verdict_and_the_changelog(monkeypatch):
    from aictl.commands.admin import db

    fake = with_data().layout_row(L.LAYOUT_VERSION, L.COMPATIBLE_SINCE, "epoch-9")
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: SETTINGS)
    result = CliRunner().invoke(db, ["layout"])
    assert result.exit_code == 0, result.output
    for text in ("epoch-9", f"layout {L.LAYOUT_VERSION}", "Verdict:             current", "Changelog:",
                 "requests_single_copy"):
        assert text in result.output


def test_db_reset_lists_what_it_deletes_and_needs_a_yes(monkeypatch):
    from aictl.commands.admin import db

    monkeypatch.setattr(KustoClientFactory, "client", lambda _: with_data())
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: SETTINGS)
    called = []
    monkeypatch.setattr(maintenance, "reset_store", lambda *a: called.append(a) or SimpleNamespace(data_epoch="n"))
    result = CliRunner().invoke(db, ["reset"], input="n\n")
    assert result.exit_code != 0 and not called
    assert "requests" in result.output and "5 rows" in result.output and "aictl db migrate" in result.output
    result = CliRunner().invoke(db, ["reset", "--yes"])
    assert result.exit_code == 0 and called and "new data epoch n" in result.output


# ── restart state follows the data epoch ───────────────────────────


def state_dir(tmp_path, recorded=None):
    directory = tmp_path / "state"
    directory.mkdir()
    (directory / "transcript_usage.json").write_text('{"cursor": 5}')
    (directory / "session_lifecycle.json").write_text("{}")
    if recorded:
        StateFile(directory / EPOCH_FILE).replace({"data_epoch": recorded})
    return directory


def test_a_different_epoch_discards_restart_state(tmp_path, caplog):
    directory = state_dir(tmp_path, recorded="old")
    assert sync_data_epoch(directory, "new", kept_data=True) == directory
    assert [p.name for p in directory.iterdir()] == [EPOCH_FILE]
    assert StateFile(directory / EPOCH_FILE).read() == {"data_epoch": "new"}
    assert "belongs to data epoch old" in caplog.text and "new node" in caplog.text


def test_the_same_epoch_keeps_restart_state(tmp_path):
    directory = state_dir(tmp_path, recorded="same")
    sync_data_epoch(directory, "same", kept_data=False)
    assert (directory / "transcript_usage.json").read_text() == '{"cursor": 5}'


@pytest.mark.parametrize("kept_data", [True, False])
def test_state_without_a_recorded_epoch_is_kept_only_if_the_epoch_kept_the_data(tmp_path, kept_data):
    directory = state_dir(tmp_path)
    sync_data_epoch(directory, "e", kept_data=kept_data)
    assert (directory / "transcript_usage.json").exists() == kept_data
    assert StateFile(directory / EPOCH_FILE).read() == {"data_epoch": "e"}


def test_the_check_runs_once_per_process(tmp_path):
    directory = state_dir(tmp_path, recorded="e")
    sync_data_epoch(directory, "e", kept_data=False)
    (directory / EPOCH_FILE).unlink()
    sync_data_epoch(directory, "e", kept_data=False)
    assert (directory / "transcript_usage.json").exists()  # not checked again: nothing removed


def test_a_file_that_cannot_be_removed_is_named_and_stops_the_start(tmp_path, monkeypatch):
    directory = state_dir(tmp_path, recorded="old")
    unlink = Path.unlink

    def locked(path, *args, **kwargs):
        if path.name == "transcript_usage.json":
            raise PermissionError(13, "The process cannot access the file")
        return unlink(path, *args, **kwargs)

    monkeypatch.setattr(Path, "unlink", locked)
    with pytest.raises(RestartStateError, match="transcript_usage.json") as error:
        sync_data_epoch(directory, "new", kept_data=False)
    assert "session_lifecycle.json" not in str(error.value)
    assert not (directory / "session_lifecycle.json").exists()
    assert StateFile(directory / EPOCH_FILE).read() == {"data_epoch": "old"}  # checked again at the next start


def test_no_epoch_leaves_the_directory_alone(tmp_path):
    directory = state_dir(tmp_path, recorded="old")
    sync_data_epoch(directory, None, kept_data=False)
    sync_data_epoch(directory, "", kept_data=False)
    assert (directory / "transcript_usage.json").exists()


def test_trim_checks_the_epoch_before_it_writes_its_watermark(tmp_path, monkeypatch):
    directory = state_dir(tmp_path, recorded="old")
    fake = with_data().layout_row(V, V, "new")
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    monkeypatch.setattr(maintenance, "restart_directory", lambda *_: directory)
    maintenance.trim_text(SETTINGS, 1000.0, dry_run=False)
    assert not (directory / "transcript_usage.json").exists()
    assert StateFile(directory / "text_trim.json").read() == {"before": 1000.0}


def test_daemon_start_discards_state_of_another_epoch_before_readers_start(tmp_path, monkeypatch):
    from aictl import kusto, stores
    from aictl.orchestrator import CollectionService

    directory = state_dir(tmp_path, recorded="old")
    store = stores.Store(layout={**L.summary(L.CURRENT, None, "new"), "epoch_kept_data": True})
    monkeypatch.setattr(kusto, "kusto_settings", lambda: KustoSettings("https://e2e.invalid", auth="none"))
    monkeypatch.setattr(stores, "open_store", lambda *_a, **_k: store)
    monkeypatch.setattr("aictl.orchestrator.restart_directory", lambda *_: directory)
    service = CollectionService(tmp_path, include_live_monitor=False)
    try:
        service.open_stores(quiet=True)
        assert not (directory / "transcript_usage.json").exists()
        assert StateFile(directory / EPOCH_FILE).read() == {"data_epoch": "new"}
    finally:
        service.stop()


def test_every_restart_directory_call_site_goes_through_the_epoch_check():
    """A new caller of restart_directory must check the data epoch (or be read-only and say so)."""
    root = Path(__file__).resolve().parent.parent / "src" / "aictl"
    allowed = {
        "state_file.py": "defines it",
        "orchestrator.py": "sync_data_epoch after open_store",
        "commands/admin.py": "sync_data_epoch after open_store",
        "stores/kusto/maintenance.py": "restart_state / sync_data_epoch",
        "dashboard/ingester_runner.py": "doctor: shows a checkpoint's time, connects to nothing, changes nothing",
    }
    users = {str(p.relative_to(root)).replace(os.sep, "/") for p in root.rglob("*.py")
             if "restart_directory(" in p.read_text(encoding="utf-8")}
    assert users <= allowed.keys(), f"new restart_directory callers: {users - allowed.keys()}"
    for name in users - {"state_file.py", "dashboard/ingester_runner.py"}:
        assert "sync_data_epoch" in (root / name).read_text(encoding="utf-8") or \
            "restart_state(" in (root / name).read_text(encoding="utf-8"), name


# ── guards on the layout definition ────────────────────────────────


def test_table_definitions_match_the_recorded_layout_fingerprint():
    assert L.fingerprint() == L.FINGERPRINT, (
        "The table definitions in stores/kusto/tables.py or otel.py changed, but stores/kusto/layout.py "
        "was not updated. 1) Bump LAYOUT_VERSION. 2) Decide on compatibility: an additive change (new table "
        "or column that old rows simply lack) adds a CHANGES line with breaks=False; a change that makes old "
        "rows wrong or double-counted also sets COMPATIBLE_SINCE = LAYOUT_VERSION, breaks=True, and should "
        "come with a migration in migrations.py. 3) Set FINGERPRINT to: " + L.fingerprint()
    )


def test_changelog_follows_the_rules():
    assert L.rule_violations() == []
    for change in L.CHANGES:
        assert change.migration is None or change.migration in migrations.MIGRATIONS


def test_after_ga_a_breaking_change_must_declare_a_migration():
    changes = (L.Change(1, "a", True, "m"), L.Change(2, "b", False), L.Change(3, "c", True))
    assert L.rule_violations(changes, ga=None, latest=3, compatible_since=3) == []
    [problem] = L.rule_violations(changes, ga=2, latest=3, compatible_since=3)
    assert "layout 3 breaks compatibility after the GA layout 2 and declares no migration" in problem
    assert L.rule_violations(changes, ga=3, latest=3, compatible_since=3) == []
