"""The stored data layout: node tables, version per node, functions, the reset gate and the restart-state epoch."""

from __future__ import annotations

import json
import os
import re
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
from aictl.stores.kusto import maintenance
from aictl.stores.kusto import nodes as N
from aictl.stores.kusto.client import KustoClientFactory
from aictl.stores.kusto.schema import check_layout, ensure_schema, owned_tables
from aictl.stores.kusto.tables import TABLES

SETTINGS = KustoSettings("https://layout.example.invalid", database="db", node_id="node-a")
V = L.LAYOUT_VERSION  # this build's layout, before a test bumps it
SMALL = {name: TABLES[name] for name in ("requests", "tool_invocations", "sessions")}


@pytest.fixture(autouse=True)
def fresh_epoch_checks(monkeypatch):
    monkeypatch.setattr(state_file, "_checked", {})


def key(node="node-a"):
    return N.node_key(node)


def phys(name, node="node-a"):
    return N.physical(name, key(node))


def with_data(**rows):
    """A database on the shared tables of layout 1 or older: rows of node-a, no layout row."""
    fake = FakeKusto()
    for name in SMALL:
        fake.with_table(name, rows=rows.get(name, 5))
    return fake


def ensure(fake, node="node-a", tables=SMALL, **kwargs):
    return ensure_schema(
        fake,
        "db",
        tables=tables,
        modes=dict.fromkeys(tables, "queued"),
        node_id=node,
        cluster=SETTINGS.cluster,
        **kwargs,
    )


def layout_writes(fake):
    return [c for c in fake.commands if c.startswith(".set-or-append ['schema_version']")]


def layouts(fake, node=None):
    return [
        r
        for r in fake.layout_rows
        if r["kind"] == "layout" and not r.get("step") and (node is None or r["node_id"] == node)
    ]


def bump(monkeypatch, latest, compatible, *changes):
    monkeypatch.setattr(L, "LAYOUT_VERSION", latest)
    monkeypatch.setattr(L, "COMPATIBLE_SINCE", compatible)
    monkeypatch.setattr(L, "CHANGES", (*L.CHANGES, *changes))


def legs(fake, name):
    return re.findall(r"\['(\w+)'\]", fake.functions[name]["body"].split("[])", 1)[1])


def started(*node_ids, rows=3):
    """A database with node tables: each node started once and wrote *rows* rows to requests."""
    fake = FakeKusto()
    for node in node_ids:
        ensure(fake, node)
        fake.add_rows(phys("requests", node), node, rows)
    return fake


# ── node keys and names ────────────────────────────────────────────


def test_node_keys_are_stable_safe_short_and_distinct():
    ids = ["zvis-mac-studio.local", "ZVIS-MAC-STUDIO.LOCAL", "zvis_mac_studio_local", "a" * 255, "x:y-z", "w10-pc"]
    keys = [N.node_key(i) for i in ids]
    assert keys == [N.node_key(i) for i in ids]
    assert len(set(keys)) == len(keys)
    for k in keys:
        assert re.fullmatch(r"[a-z0-9_]+", k) and "__" not in k and len(k) <= 41
    assert N.node_key("") == N.UNATTRIBUTED
    longest = max(TABLES, key=len)
    assert len(N.physical(longest, N.node_key("a" * 255))) < 1024
    assert all("__" not in name for name in TABLES)


def test_a_node_table_maps_back_by_docstring_or_name():
    name = phys("requests")
    doc = N.table_docstring("node-a", key(), "requests")
    assert N.parse(name, doc, TABLES).node_id == "node-a"
    assert N.parse(name, None, TABLES).logical == "requests"
    assert N.parse("legacy__requests", None, TABLES) is None and N.parse("requests", None, TABLES) is None


# ── the check, branch by branch ────────────────────────────────────


def test_new_database_creates_this_nodes_tables_the_record_and_the_functions():
    fake = FakeKusto()
    status = ensure(fake)
    assert {phys(n) for n in SMALL} | {"schema_version"} <= fake.tables.keys()
    assert not {"requests", "tool_invocations", "sessions"} & fake.tables.keys()
    [create] = [c for c in fake.commands if c.startswith(".create-merge tables ")]
    assert all(phys(n) in create for n in SMALL) and f'folder = "aictl/nodes/{key()}"' in create
    assert json.loads(fake.tables[phys("requests")]["docstring"]) == {
        "aictl": "node table",
        "node_id": "node-a",
        "node_key": key(),
        "table": "requests",
    }
    [db] = [r for r in fake.layout_rows if r["kind"] == "database"]
    assert db["compatible_since"] == L.NODE_TABLES_SINCE and db["node_id"] == ""
    [row] = layouts(fake)
    assert row["detail"] == "new" and row["node_id"] == "node-a" and row["version"] == L.LAYOUT_VERSION
    assert status.data_epoch == row["data_epoch"] and len(status.data_epoch) == 32
    assert status.layout["verdict"] == L.NEW and status.layout["stored_version"] is None
    assert status.tables["requests"] == phys("requests")
    assert legs(fake, "requests") == [phys("requests")]
    assert fake.functions["requests"]["folder"] == "aictl" and "aictl_nodes" in fake.functions
    assert not status.epoch_kept_data


def test_a_function_without_any_node_table_still_has_the_logical_schema():
    fake = FakeKusto()
    ensure(fake)
    from aictl.stores.kusto import schema

    state = check_layout(fake, "db", "node-a")
    state.nodes.clear()
    [cmd] = [c for c in schema.function_commands(state, {"requests"}) if "['requests']()" in c]
    body = cmd[cmd.index("{") :]
    assert body.startswith("{ union (datatable(['id']:long") and "['requests__" not in body
    assert all(f"['{c}']:{t}" in body for c, t in TABLES["requests"].columns)


def test_a_second_start_changes_nothing():
    fake = FakeKusto()
    ensure(fake)
    before = len(fake.changes)
    status = ensure(fake)
    assert len(fake.changes) == before
    assert status.layout["verdict"] == L.CURRENT


def test_empty_aictl_tables_without_a_version_row_count_as_new_and_move_aside():
    fake = with_data(requests=0, tool_invocations=0, sessions=0)
    status = ensure(fake)
    assert status.layout["verdict"] == L.NEW
    assert {"legacy__requests", "legacy__sessions"} <= fake.tables.keys() and "requests" not in fake.tables


def test_tables_whose_details_lag_are_read_before_they_count_as_empty():
    fake = with_data(requests=0, tool_invocations=0, sessions=0)
    fake.counts = lambda query: 1 if query.startswith("union isfuzzy=true (table(") else 0
    with pytest.raises(L.LayoutResetRequired):
        ensure(fake)
    assert fake.changes == []


def test_a_second_node_joins_and_both_are_read():
    fake = started("node-a")
    status = ensure(fake, "node-b")
    assert legs(fake, "requests") == sorted([phys("requests"), phys("requests", "node-b")])
    assert {n["node_id"] for n in status.layout["nodes"]} == {"node-a", "node-b"}
    assert status.layout["excluded"] == 0
    assert layouts(fake, "node-a")[0]["data_epoch"] != layouts(fake, "node-b")[0]["data_epoch"]


def test_a_node_on_an_incompatible_layout_is_left_out_and_reported():
    fake = started("node-a", "node-c")
    fake.layout_row(L.LAYOUT_VERSION + 5, L.LAYOUT_VERSION + 5, "c-epoch", node_id="node-c")
    status = ensure(fake)  # node-a: still current; node-c is not this node's problem
    assert status.layout["verdict"] == L.CURRENT
    assert legs(fake, "requests") == [phys("requests")]
    [c] = [n for n in status.layout["nodes"] if n["node_id"] == "node-c"]
    assert not c["included"] and "newer layout" in c["reason"] and status.layout["excluded"] == 1
    old = started("node-a", "node-d")
    old.layout_row(1, 1, "d-epoch", node_id="node-d")
    old.layout_rows = [r for r in old.layout_rows if not (r["node_id"] == "node-d" and r["version"] == V)]
    assert ensure(old).layout["nodes"][-1]["reason"].startswith("older layout 1")


def test_compatible_older_node_layout_widens_its_tables_then_records_the_new_version(monkeypatch):
    fake = started("node-a")
    bump(monkeypatch, V + 1, L.COMPATIBLE_SINCE, L.Change(V + 1, "a column", False))
    del fake.tables[phys("sessions")]["columns"]["tool"]
    status = ensure(fake)
    widen = next(
        i
        for i, c in enumerate(fake.commands)
        if c.startswith(".create-merge tables ") and phys("sessions") in c and i > 10
    )
    record = fake.commands.index(layout_writes(fake)[-1])
    assert widen < record
    assert (layouts(fake)[-1]["version"], layouts(fake)[-1]["detail"]) == (V + 1, "upgrade")
    assert layouts(fake)[-1]["data_epoch"] == status.data_epoch == layouts(fake)[0]["data_epoch"]


def test_an_older_node_never_lowers_the_stored_version():
    fake = started("node-a")
    fake.layout_row(V + 2, L.COMPATIBLE_SINCE, layouts(fake)[0]["data_epoch"])
    count = len(layout_writes(fake))
    status = ensure(fake)
    assert len(layout_writes(fake)) == count
    assert status.layout["verdict"] == L.CURRENT and status.layout["stored_version"] == V + 2


def test_unversioned_shared_data_stops_before_any_change_and_names_the_reset():
    fake = with_data()
    with pytest.raises(L.LayoutResetRequired) as error:
        ensure(fake)
    assert fake.changes == []
    text = str(error.value)
    assert "layout 0 (no version recorded)" in text and f"layout {L.LAYOUT_VERSION}" in text
    assert f"aictl db reset --kusto-cluster {SETTINGS.cluster} --kusto-database db" in text
    assert "reads its session files again" in text and "migrate" not in text


def test_layout_1_shared_tables_need_a_reset():
    fake = with_data().layout_row(1, 1, "e1")
    with pytest.raises(L.LayoutResetRequired, match="aictl db reset"):
        ensure(fake)
    assert fake.changes == []


def test_a_node_of_the_previous_layout_is_reset_never_converted(monkeypatch):
    monkeypatch.setattr(L, "LAYOUT_VERSION", V - 1)
    monkeypatch.setattr(L, "COMPATIBLE_SINCE", V - 1)
    monkeypatch.setattr(L, "CHANGES", L.CHANGES[:-1])
    fake = started("node-a")
    monkeypatch.undo()
    before = len(fake.changes)
    with pytest.raises(L.LayoutResetRequired) as error:
        ensure(fake)
    assert len(fake.changes) == before
    text = str(error.value)
    assert "aictl db reset --node node-a" in text and "reads its session files again" in text
    assert "UTC datetime" in text


def test_incompatible_node_layout_without_a_migration_asks_for_a_reset_of_that_node(monkeypatch):
    fake = started("node-a", "node-b")
    bump(monkeypatch, V + 1, V + 1, L.Change(V + 1, "sessions keyed by process", True))
    before = len(fake.changes)
    with pytest.raises(L.LayoutResetRequired) as error:
        ensure(fake)
    assert len(fake.changes) == before
    text = str(error.value)
    assert "Stored rows are not converted" in text and "node node-a" in text
    assert "sessions keyed by process" in text and "aictl db reset --node node-a" in text


def test_data_written_by_newer_incompatible_code_asks_for_an_upgrade_never_a_reset():
    fake = started("node-a")
    fake.layout_row(V + 3, V + 3, layouts(fake)[0]["data_epoch"])
    before = len(fake.changes)
    with pytest.raises(L.LayoutNewerError) as error:
        ensure(fake)
    assert len(fake.changes) == before
    assert "Upgrade aictl on this node" in str(error.value) and "aictl db reset" not in str(error.value)


def test_read_only_open_warns_instead_of_failing(monkeypatch):
    from aictl.stores import open_store

    fake = with_data()
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    store = open_store("kusto", settings=SETTINGS, read_only=True)
    assert store.layout["verdict"] == L.RESET and "aictl db reset" in store.layout["warning"]
    assert store.health()["layout"]["version"] == L.LAYOUT_VERSION
    assert fake.changes == []


def test_read_only_open_survives_a_failed_layout_read(monkeypatch):
    from aictl.stores import open_store

    fake = FakeKusto()
    fake.fail = lambda text: (_ for _ in ()).throw(RuntimeError("offline"))
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    store = open_store("kusto", settings=SETTINGS, read_only=True)
    assert "not checked" in store.layout["warning"]


def test_writing_open_reports_the_layout_and_the_nodes_in_health(monkeypatch):
    from aictl.stores import open_store

    fake = started("node-b")
    seen = {}
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    monkeypatch.setattr(
        KustoClientFactory,
        "native_ingester",
        lambda _, tables=None: seen.setdefault("tables", tables) and SimpleNamespace(),
    )
    local = KustoSettings("http://localhost:8080", database="db", node_id="node-a", auth="none")
    store = open_store("kusto", settings=local)
    try:
        layout = store.health()["layout"]
        assert layout["version"] == L.LAYOUT_VERSION and layout["compatible_since"] == L.COMPATIBLE_SINCE
        assert layout["data_epoch"] == layouts(fake, "node-a")[0]["data_epoch"] and layout["stored_version"] is None
        assert [n["node_id"] for n in layout["nodes"]] == sorted(["node-a", "node-b"], key=N.node_key)
        assert seen["tables"]["requests"] == phys("requests") and seen["tables"]["schema_version"] == "schema_version"
    finally:
        store.writer.close()


# ── writing and retention go to this node's tables ─────────────────


def test_the_ingester_maps_logical_tables_to_this_nodes_tables():
    from aictl.stores.kusto.ingest import TableIngester

    sent = []
    inner = SimpleNamespace(
        ingest_lines=lambda table, lines: sent.append(("lines", table)),
        ingest=lambda table, rows: sent.append(("rows", table)),
    )
    settings = KustoSettings("https://x.invalid", database="db", node_id="node-a", ingestion="queued")
    ingester = TableIngester(settings, {"queued": inner}, tables={"requests": phys("requests")})
    ingester.ingest_lines("requests", ["{}"])
    ingester.ingest("sessions", [{}])
    assert sent == [("lines", phys("requests")), ("rows", "sessions")]


def test_retention_is_set_on_this_nodes_tables_in_one_command_per_period():
    fake = FakeKusto()
    ensure(fake)
    [cmd] = [c for c in fake.commands if c.startswith(".alter tables (") and phys("requests") in c]
    assert "policy retention" in cmd and "365.00:00:00" in cmd and "['requests']" not in cmd
    assert fake.tables[phys("requests")]["retention"] == "365.00:00:00"


def test_retention_status_lists_each_nodes_tables(monkeypatch):
    from aictl.stores.kusto import retention
    from aictl.stores.kusto.client import Result

    fake = started("node-a", "node-b")

    def mgmt(text):
        return Result.from_response(fake.execute_mgmt("db", text))

    rows = [r for r in retention.status({}, mgmt) if r.logical == "requests"]
    assert {r.node_key for r in rows} == {key("node-a"), key("node-b")}
    change, _ = retention.plan("history", 24 * 400, mgmt, node_key=key("node-a"))
    assert phys("requests") in change and phys("requests", "node-b") not in change
    change, _ = retention.plan("history", 24 * 400, mgmt, all_nodes=True)
    assert phys("requests", "node-b") in change


def test_a_collectors_otel_table_is_a_leg_of_its_function():
    otel = {"OTELLogs": TABLES["OTELLogs"]}
    fake = FakeKusto()
    fake.with_table("OTELLogs", 3, node_id="")  # an OpenTelemetry Collector writes this table
    ensure_schema(fake, "db", tables={**SMALL, **otel}, node_id="node-a")
    body = fake.functions["OTELLogs"]["body"]
    assert phys("OTELLogs") in body and '(table("OTELLogs"))' in body
    assert "OTELLogs" in fake.tables and fake.count("OTELLogs") == 3  # not moved, not renamed


# ── reset ──────────────────────────────────────────────────────────


def test_reset_of_one_node_leaves_the_other_nodes_rows(monkeypatch, tmp_path):
    fake = started("node-a", "node-b")
    fake.with_table("someone_elses", 3, {"x": "long"})
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    monkeypatch.setattr(maintenance, "restart_directory", lambda *_: tmp_path)
    (tmp_path / "copilot_messages.json").write_text("{}")
    old = layouts(fake, "node-a")[0]["data_epoch"]
    StateFile(tmp_path / EPOCH_FILE).replace({"data_epoch": old})
    plan = maintenance.reset_plan(SETTINGS)
    assert dict(plan) == {phys(n): (3 if n == "requests" else 0) for n in SMALL}
    status = maintenance.reset_store(SETTINGS, [name for name, _ in plan])
    drop = next(i for i, c in enumerate(fake.commands) if c.startswith(".drop tables"))
    unlink = max(
        i
        for i, c in enumerate(fake.commands)
        if c.startswith(".create-or-alter function") and "['requests']()" in c and i < drop
    )
    assert unlink < drop and phys("requests") not in fake.commands[unlink]
    assert "someone_elses" in fake.tables and fake.count(phys("requests", "node-b")) == 3
    assert fake.count(phys("requests")) == 0
    assert layouts(fake, "node-a")[-1]["detail"] == "reset" and status.data_epoch != old
    assert layouts(fake, "node-b")[-1]["detail"] == "new"
    assert sorted(legs(fake, "requests")) == sorted([phys("requests"), phys("requests", "node-b")])
    assert not (tmp_path / "copilot_messages.json").exists()
    assert StateFile(tmp_path / EPOCH_FILE).read()["data_epoch"] == status.data_epoch


def test_reset_of_another_node_records_its_new_epoch(monkeypatch):
    fake = started("node-a", "node-b")
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    before = layouts(fake, "node-b")[0]["data_epoch"]
    maintenance.reset_store(SETTINGS, node="node-b")
    assert phys("requests", "node-b") not in fake.tables and fake.count(phys("requests")) == 3
    assert layouts(fake, "node-b")[-1]["detail"] == "reset" and layouts(fake, "node-b")[-1]["data_epoch"] != before
    assert legs(fake, "requests") == [phys("requests")]


def test_reset_of_all_nodes_drops_every_owned_table(monkeypatch, tmp_path):
    fake = started("node-a", "node-b")
    fake.with_table("someone_elses", 3, {"x": "long"})
    fake.with_table("aictl_information_schema", 2, {"table_name": "string"})
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    monkeypatch.setattr(maintenance, "restart_directory", lambda *_: tmp_path)
    plan = dict(maintenance.reset_plan(SETTINGS, all_nodes=True))
    assert phys("requests", "node-b") in plan and "schema_version" in plan and "someone_elses" not in plan
    status = maintenance.reset_store(SETTINGS, list(plan), all_nodes=True)
    assert phys("requests", "node-b") not in fake.tables and "someone_elses" in fake.tables
    [row] = layouts(fake)
    assert row["detail"] == "reset" and row["data_epoch"] == status.data_epoch


def test_reset_refuses_a_table_aictl_does_not_own_or_of_another_node(monkeypatch):
    fake = started("node-a", "node-b")
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    with pytest.raises(Exception, match="does not own: someone_elses"):
        maintenance.reset_store(SETTINGS, [phys("requests"), "someone_elses"])
    with pytest.raises(Exception, match="of another node"):
        maintenance.reset_store(SETTINGS, [phys("requests", "node-b")])


def test_reset_names_the_role_when_the_drop_is_denied(monkeypatch):
    from aictl.stores.base import StorePermissionError

    fake = started("node-a")
    fake.fail = lambda text: (
        (_ for _ in ()).throw(RuntimeError("Forbidden")) if text.startswith(".drop tables") else None
    )
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    with pytest.raises(StorePermissionError, match="Drop aictl tables requires Database Admin"):
        maintenance.reset_store(SETTINGS, [phys("requests")])


# ── current views (current.py) ──────────────────────────────────────


def test_a_new_node_gets_an_empty_current_view_per_table_and_the_functions_read_them():
    from aictl.stores.kusto import current as C

    every = {**SMALL, **{name: TABLES[name] for name in C.CURRENT_TABLES}}
    fake = FakeKusto()
    for node in ("node-a", "node-b"):
        ensure(fake, node, tables=every)
    for name in C.CURRENT_TABLES:
        for node in ("node-a", "node-b"):
            view = fake.views[C.physical(name, key(node))]
            assert view["source"] == phys(name, node) and not view["backfill"]
            assert "summarize arg_max(_v, *) by event_hour, ['project'], node_id, dedup_key" in view["query"]
            partition = view["policies"]["partitioning"]["PartitionKeys"][0]
            assert (partition["ColumnName"], partition["Kind"]) == ("event_hour", "UniformRange")
            assert view["policies"]["retention"]["SoftDeletePeriod"] == TABLES[name].retention_timespan
        assert legs(fake, C.logical(name)) == sorted(C.physical(name, key(n)) for n in ("node-a", "node-b"))
        assert "['event_hour']:datetime" in fake.functions[C.logical(name)]["body"]


def test_a_table_that_lost_its_view_gets_it_back_built_from_its_rows():
    from aictl.stores.kusto import current as C

    fake = started("node-a")
    fake.views.pop(C.physical("requests", key("node-a")))
    ensure(fake)
    view = fake.views[C.physical("requests", key("node-a"))]
    assert view["backfill"]
    create = next(c for c in fake.commands if c.startswith(".create async ifnotexists materialized-view"))
    # The start waits for the build: the view cannot be read before it is done.
    assert fake.commands[fake.commands.index(create) + 1] == ".show operations op-1"


def test_a_disabled_view_is_enabled_again():
    from aictl.stores.kusto import current as C

    fake = started("node-a")
    fake.views[C.physical("requests", key("node-a"))]["enabled"] = False
    ensure(fake)
    assert f".enable materialized-view ['{C.physical('requests', key('node-a'))}']" in fake.commands


def test_reset_drops_the_current_views_of_the_node_before_its_tables(monkeypatch):
    from aictl.stores.kusto import current as C

    fake = started("node-a", "node-b")
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    maintenance.reset_store(SETTINGS)  # the fake refuses to drop a table a view reads
    assert C.physical("requests", key("node-b")) in fake.views
    assert legs(fake, C.logical("requests")) == sorted(C.physical("requests", key(n)) for n in ("node-a", "node-b"))
    assert fake.views[C.physical("requests", key("node-a"))]["source"] == phys("requests")


def test_owned_tables_cover_every_definition_and_the_marker():
    from aictl.kusto.observations import COMPANIONS, CURRENT_STORE
    from aictl.stores.kusto.otel import TABLES as OTEL
    from aictl.stores.kusto.schema import is_owned

    assert set(TABLES) | {t.name for t in OTEL} | {CURRENT_STORE} | COMPANIONS <= owned_tables()
    assert is_owned(phys("requests")) and is_owned("legacy__requests") and not is_owned("someone_elses")


# ── asking the user at start ───────────────────────────────────────


@pytest.fixture
def start_check(monkeypatch):
    from aictl.commands import admin, daemon

    calls = []
    monkeypatch.setattr(daemon, "kusto_settings", lambda: SETTINGS)
    monkeypatch.setattr(maintenance, "reset_plan", lambda *a, **k: [(phys("requests"), 5)])
    monkeypatch.setattr(
        maintenance, "reset_store", lambda *a, **k: calls.append("reset") or SimpleNamespace(data_epoch="new")
    )
    cfg = SimpleNamespace(capture="full")

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


def test_start_without_a_terminal_stops_with_the_message(start_check):
    with pytest.raises(click.ClickException, match="To delete it:  +aictl db reset"):
        start_check(with_data(), interactive=False)
    assert start_check.calls == []


def test_start_offers_a_reset_of_this_node_on_an_incompatible_layout(start_check, monkeypatch):
    fake = started("node-a")
    bump(monkeypatch, V + 1, V + 1, L.Change(V + 1, "x", True))
    asked = start_check(fake, interactive=True, answer=True)
    assert asked == ["Delete the stored data of node node-a in db on https://layout.example.invalid and start again?"]
    assert start_check.calls == ["reset"]
    start_check.calls.clear()
    with pytest.raises(click.ClickException, match="Not reset.*--node node-a"):
        start_check(fake, interactive=True, answer=False)
    assert start_check.calls == []


def test_start_never_offers_to_delete_data_of_a_newer_aictl(start_check):
    fake = started("node-a")
    fake.layout_row(V + 1, V + 1, layouts(fake)[0]["data_epoch"])
    with pytest.raises(click.ClickException, match="Upgrade aictl"):
        start_check(fake, interactive=True, answer=True)
    assert start_check.calls == []


def test_start_continues_on_a_compatible_layout(start_check):
    assert start_check(FakeKusto(), interactive=True, answer=True) == []


# ── commands ───────────────────────────────────────────────────────


def test_db_layout_prints_this_node_every_node_and_the_changelog(monkeypatch):
    from aictl.commands.admin import db

    fake = started("node-a", "node-b")
    fake.layout_row(V + 5, V + 5, "b2", node_id="node-b")
    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: SETTINGS)
    result = CliRunner().invoke(db, ["layout", "--nodes"])
    assert result.exit_code == 0, result.output
    epoch = layouts(fake, "node-a")[0]["data_epoch"]
    for text in (
        epoch,
        f"layout {L.LAYOUT_VERSION}",
        "Verdict:             current",
        "Changelog:",
        "breaks compatibility: reset",
        "Nodes: 2, 1 not included",
        "node-a (this node)",
        "no: newer layout",
        key("node-b"),
        "one set per node",
    ):
        assert text in result.output, text
    assert re.search(r"requests\s+3 rows", result.output)


def _layout_output(monkeypatch, fake, *args):
    from aictl.commands.admin import db

    monkeypatch.setattr(KustoClientFactory, "client", lambda _: fake)
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: SETTINGS)
    result = CliRunner().invoke(db, ["layout", *args])
    assert result.exit_code == 0, result.output
    return result.output


def _node_line(output):
    return next(line for line in output.splitlines() if "(this node)" in line)


def test_db_layout_nodes_counts_rows_the_table_details_leave_out(monkeypatch):
    """Rows in the row store are in no TotalRowCount and the creation time is year 1 (seen on a real cluster)."""
    fake = started("node-a", rows=7)
    fake.unsealed = set(fake.tables)
    output = _layout_output(monkeypatch, fake, "--nodes")
    line = _node_line(output)
    assert re.search(r"\s7\s", line), line
    assert "2026-11-01 23:00:00 UTC" in line
    assert "-62135596800" not in output and "0001-01-01" not in output
    assert re.search(r"requests\s+7 rows\s+0 sealed extents\s+none sealed yet", output)
    assert "0.0 MB" not in line  # rows that are not sealed are not a size of 0


def test_db_layout_nodes_says_unknown_for_a_last_ingestion_the_cluster_does_not_report(monkeypatch):
    fake = started("node-a", rows=0)
    output = _layout_output(monkeypatch, fake, "--nodes")
    assert "unknown" in _node_line(output) and "-62135596800" not in output and "0001-01-01" not in output


def test_db_layout_without_nodes_prints_no_row_count_and_no_raw_time(monkeypatch):
    fake = started("node-a", rows=7)
    fake.unsealed = set(fake.tables)
    output = _layout_output(monkeypatch, fake)
    header = next(line for line in output.splitlines() if line.lstrip().startswith("Node "))
    assert "Rows" not in header and "0.0 MB" not in output and "-62135596800" not in output
    assert "aictl db layout --nodes" in output


def test_db_reset_lists_this_nodes_tables_and_needs_a_yes(monkeypatch):
    from aictl.commands.admin import db

    monkeypatch.setattr(KustoClientFactory, "client", lambda _: started("node-a", "node-b"))
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: SETTINGS)
    called = []
    monkeypatch.setattr(
        maintenance, "reset_store", lambda *a, **k: called.append((a, k)) or SimpleNamespace(data_epoch="n")
    )
    result = CliRunner().invoke(db, ["reset"], input="n\n")
    assert result.exit_code != 0 and not called
    assert phys("requests") in result.output and phys("requests", "node-b") not in result.output
    assert "3 rows" in result.output and "the other nodes keep theirs" in result.output
    result = CliRunner().invoke(db, ["reset", "--yes"])
    assert result.exit_code == 0 and called and "new data epoch n" in result.output
    result = CliRunner().invoke(db, ["reset", "--all-nodes"], input="n\n")
    assert "for ALL nodes" in result.output and phys("requests", "node-b") in result.output


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
    fake = started("node-a").layout_row(V, V, "new")
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
        "index_breakdown.py": "aictl db index: reads the reader's saved positions to show read states, changes nothing",
    }
    users = {
        str(p.relative_to(root)).replace(os.sep, "/")
        for p in root.rglob("*.py")
        if "restart_directory(" in p.read_text(encoding="utf-8")
    }
    assert users <= allowed.keys(), f"new restart_directory callers: {users - allowed.keys()}"
    for name in users - {"state_file.py", "dashboard/ingester_runner.py", "index_breakdown.py"}:
        assert "sync_data_epoch" in (root / name).read_text(encoding="utf-8") or "restart_state(" in (
            root / name
        ).read_text(encoding="utf-8"), name


# ── guards on the layout definition ────────────────────────────────


def test_table_definitions_match_the_recorded_layout_fingerprint():
    assert L.fingerprint() == L.FINGERPRINT, (
        "The table definitions in stores/kusto/tables.py or otel.py changed, but stores/kusto/layout.py "
        "was not updated. 1) Bump LAYOUT_VERSION. 2) Decide on compatibility: an additive change (new table "
        "or column that old rows simply lack) adds a CHANGES line with breaks=False; a change that makes old "
        "rows wrong or double-counted also sets COMPATIBLE_SINCE = LAYOUT_VERSION and breaks=True (such a "
        "node is reset, never converted). 3) Set FINGERPRINT to: " + L.fingerprint()
    )


def test_changelog_follows_the_rules():
    assert L.rule_violations() == []


def test_the_layout_summary_in_the_store_health_has_no_row_count_and_no_table_details_time():
    """Table details leave out rows in the row store, so a summary shows no row count or ingestion time of a node;
    its size is the sealed size, named so."""
    fake = started("node-a", rows=7)
    fake.unsealed = set(fake.tables)
    summary = check_layout(fake, "db", "node-a").summary()
    [node] = summary["nodes"]
    assert "rows" not in node and "last_ingestion" not in node and "size_bytes" not in node
    assert node["sealed_bytes"] == 0 and node["extents"] == 0


def test_no_node_traffic_report_with_table_details_numbers_remains():
    assert not hasattr(maintenance, "node_traffic")
