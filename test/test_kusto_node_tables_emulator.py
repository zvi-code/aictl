"""The node_tables migration end to end on the Kusto emulator, and views that read through the functions.

Skipped without an emulator on localhost:8080 (docs/kusto-cluster.md starts one). Each test
creates its own volatile database and drops it afterwards.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
import uuid

import pytest

from aictl.kusto import KustoSettings
from aictl.stores.kusto import layout as L
from aictl.stores.kusto import maintenance
from aictl.stores.kusto import nodes as N
from aictl.stores.kusto.client import KustoClientFactory, Result, quote
from aictl.stores.kusto.reader import KustoReader
from aictl.stores.kusto.schema import check_layout, logical_columns, record_command
from aictl.stores.kusto.tables import TABLES


def _emulator_up() -> bool:
    try:
        urllib.request.urlopen("http://localhost:8080/", timeout=2)
    except urllib.error.HTTPError:
        return True
    except Exception:  # noqa: BLE001 - anything else means no emulator
        return False
    return True


pytestmark = pytest.mark.skipif(not _emulator_up(), reason="Kusto emulator not running on localhost:8080")
NOW = 1_795_000_000.0


@pytest.fixture
def database():
    name = f"aictl_nodes_{uuid.uuid4().hex[:8]}"
    client = KustoClientFactory.client(KustoSettings("http://localhost:8080", "NetDefaultDB", auth="none",
                                                     node_id="setup"))
    client.execute_mgmt("NetDefaultDB", f".create database {name} volatile")
    try:
        yield name
    finally:
        client.execute_mgmt("NetDefaultDB", f".drop database {name} ifexists")


def settings(database, node="node-a"):
    return KustoSettings("http://localhost:8080", database, auth="none", node_id=node)


def mgmt(client, database, text):
    return Result.from_response(client.execute_mgmt(database, text)).dicts()


def query(client, database, text):
    return Result.from_response(client.execute_query(database, text)).dicts()


def ingest(client, database, table, rows):
    columns = dict(logical_columns(table))
    lines = "\n".join(json.dumps({c: row.get(c) for c in columns}) for row in rows)
    client.execute_mgmt(database, f'.ingest inline into table {quote(table)} with (format="multijson") <|\n{lines}')


def shared_layout(client, database, version):
    """The shared tables an aictl of *version* (0, 1 or 2) left: every table, rows of two nodes and of none."""
    specs = [name for name in TABLES if name != "schema_version" and "_observations" not in name]
    client.execute_mgmt(database, ".create-merge tables " + ", ".join(
        f"{quote(n)}(" + ", ".join(f"{quote(c)}:{t}" for c, t in logical_columns(n)) + ")" for n in specs))
    client.execute_mgmt(database, ".create-merge table ['schema_version'] (" + ", ".join(
        f"{quote(c)}:{t}" for c, t in TABLES["schema_version"].columns) + ")")
    requests, tools, sessions, processes = [], [], [], []
    for node, count in (("node-a", 3), ("node-b", 2), ("", 1)):
        for i in range(count):
            key = f"{node or 'none'}-{i}"
            requests.append({"project": "", "node_id": node, "_v": "2026-10-01T00:00:00Z", "dedup_key": key,
                             "id": i, "session_id": f"s-{node}", "ts": NOW - i, "model": "m1", "input_tokens": 10,
                             "output_tokens": 5, "source": "transcript", "_deleted": False})
            tools.append({"project": "", "node_id": node, "_v": "2026-10-01T00:00:00Z", "dedup_key": key,
                          "session_id": f"s-{node}", "ts": NOW - i, "tool_name": "Read", "_deleted": False})
            processes.append({"project": "", "node_id": node, "_v": "2026-10-01T00:00:00Z", "ts": NOW - i,
                              "pid": 100 + i, "name": "claude"})
        sessions.append({"project": "", "node_id": node, "_v": "2026-10-01T00:00:00Z", "session_id": f"s-{node}",
                         "tool": "claude-code", "_deleted": False})
    for table, rows in (("requests", requests), ("tool_invocations", tools), ("sessions", sessions),
                        ("process_snapshots", processes)):
        ingest(client, database, table, rows)
    if version:
        client.execute_mgmt(database, record_command(version=version, compatible_since=version, epoch="shared-epoch",
                                                     node_id="node-a", kind="layout", detail="new"))
    return {"requests": 6, "tool_invocations": 6, "sessions": 3, "process_snapshots": 6}


VIEWS = {"health.totals": {"limit": 100}, "nodes.inventory": {"limit": 100}, "history.tools": {"limit": 100}}


def views(client, database):
    reader = KustoReader(client, database)
    out = {}
    for view, params in VIEWS.items():
        rows = reader.read(view, params).rows
        out[view] = sorted(json.dumps(row, sort_keys=True, default=str) for row in rows)
    return out


@pytest.mark.parametrize("version", [0, 1, 2])
def test_the_migration_moves_each_node_to_its_own_tables_and_views_answer_the_same(database, version):
    client = KustoClientFactory.client(settings(database))
    counts = shared_layout(client, database, version)
    before = views(client, database)
    assert all(before.values()), before
    source_ingested = query(client, database, "table('requests') | summarize t=max(ingestion_time())")[0]["t"]
    assert check_layout(client, database, "node-a").verdict == L.MIGRATE

    dry = []
    maintenance.migrate_store(settings(database), dry_run=True, echo=dry.append)
    assert "requests / node-a: 3 rows" in "\n".join(dry) and "requests" in {r["TableName"] for r in
                                                                          mgmt(client, database, ".show tables")}
    maintenance.migrate_store(settings(database), dry_run=False, echo=lambda _: None)

    state = check_layout(client, database, "node-a")
    assert state.mode == "nodes" and state.verdict == L.CURRENT
    for table, total in counts.items():
        legacy = query(client, database, f"table('{N.legacy_name(table)}') | count")[0]["Count"]
        assert legacy == total  # kept, not dropped
        for node, rows in (("node-a", 3), ("node-b", 2), ("", 1)):
            name = N.physical(table, N.node_key(node))
            expected = 1 if table == "sessions" else rows
            assert query(client, database, f"{quote(name)} | count")[0]["Count"] == expected, name
        # The function of the logical table reads every node.
        assert query(client, database, f"{table} | count")[0]["Count"] == total
    assert views(client, database) == before
    # The copy's extents carry the source rows' ingestion time as their creation time (retention counts from it).
    extents = mgmt(client, database, f".show table {quote(N.physical('requests', N.node_key('node-a')))} extents"
                                     " | project MaxCreatedOn")
    assert extents and all(abs(e["MaxCreatedOn"] - source_ingested) < 1 for e in extents)
    steps ={r["step"] for r in query(client, database, "schema_version | where kind == 'migration'")}
    expected = {"node_tables"} | ({"agents_by_session"} if version < 2 else set()) | (
        {"requests_single_copy"} if version < 1 else set())
    assert expected <= steps and (version < 2) == ("agents_by_session" in steps)
    table = next(t for t in mgmt(client, database, ".show tables | project TableName, Folder, DocString")
                 if t["TableName"] == N.physical("requests", N.node_key("node-b")))
    assert table["Folder"] == f"aictl/nodes/{N.node_key('node-b')}"
    assert json.loads(table["DocString"])["node_id"] == "node-b"

    # A second run, and a start of node-b, change no row.
    maintenance.migrate_store(settings(database), dry_run=False, echo=lambda _: None)
    from aictl.stores.kusto.schema import ensure_schema

    ensure_schema(client, database, node_id="node-b", modes=dict.fromkeys(TABLES, "inline"))
    assert query(client, database, "requests | count")[0]["Count"] == counts["requests"]
    assert views(client, database) == before


def test_resetting_one_node_keeps_the_others(database):
    client = KustoClientFactory.client(settings(database))
    shared_layout(client, database, 2)
    maintenance.migrate_store(settings(database), dry_run=False, echo=lambda _: None)
    maintenance.reset_store(settings(database), node="node-b")
    assert query(client, database, "requests | summarize n=count() by node_id | order by node_id asc") == [
        {"node_id": "", "n": 1}, {"node_id": "node-a", "n": 3}]
    assert query(client, database, f"table('{N.legacy_name('requests')}') | count")[0]["Count"] == 6
