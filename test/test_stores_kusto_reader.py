import gzip
import json
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace

import pytest

from aictl.kusto import KustoSettings
from aictl.stores import open_store
from aictl.stores.base import StoreConfigurationError, StoreError, StorePermissionError, UnknownViewError
from aictl.stores.kusto.client import KustoClientFactory, Result
from aictl.stores.kusto.reader import KustoReader
from aictl.stores.kusto.recorded import UnrecordedQueryError
from aictl.stores.kusto.schema import SchemaStatus, ensure_schema
from aictl.stores.kusto.tables import SESSION_HISTORY_TABLES, TABLES

RECORDINGS = Path(__file__).parent / "recordings"
SETTINGS = KustoSettings("https://recording.invalid", "test_db", auth="none")


def test_registry_lazy_and_kusto_imports_without_old_dependencies():
    subprocess.run(
        [
            sys.executable,
            "-c",
            """
import sys
sys.modules.update(sqlite3=None, _sqlite3=None)
from aictl.stores import open_store
assert open_store().health() == {"status": "no store configured"}
assert "aictl.stores.kusto" not in sys.modules
from aictl.kusto import KustoSettings
store = open_store("kusto", settings=KustoSettings("https://recording.invalid"), capture=False)
assert store.reader is None and store.writer.health()["status"] == "capture is off"
assert "aictl.stores.kusto.writer" in sys.modules
assert "aictl.kusto.connection" not in sys.modules
""",
        ],
        check=True,
        timeout=30,
    )
    with pytest.raises(StoreConfigurationError, match="Unknown store plugin"):
        open_store("missing")


def test_native_tables_use_scoped_keys_and_text_tables_retain_less_history():
    assert not any(name.startswith("ui_") for name in TABLES)
    for name, spec in TABLES.items():
        columns = dict(spec.columns)
        assert len(columns) == len(spec.columns)
        assert set(spec.key) <= columns.keys() and "rowid" not in spec.key
        assert columns["project"] == "string" and spec.key[:2] == ("project", "node_id")
        assert columns[spec.version] == "datetime"
        assert spec.ingestion in {"queued", "streaming"}
        if spec.tombstone:
            assert columns[spec.tombstone] == "bool"
        if moved := TABLES.get(f"{name}_text"):
            assert moved.retention_days == 14
            assert spec.retention_days == (365 if name.removesuffix("_observations") in SESSION_HISTORY_TABLES else 30)
            assert moved.key[:len(spec.key)] == spec.key


def test_session_history_is_kept_for_a_year_and_text_is_not():
    assert SESSION_HISTORY_TABLES <= TABLES.keys()
    for name in ("sessions", "session_usage", "requests", "session_sources", "sessions_observations"):
        assert TABLES[name].retention_days == 365
    for name, spec in TABLES.items():
        if name.endswith("_text") or name in ("session_prompts", "vscode_chat_messages", "copilot_session_messages"):
            assert spec.retention_days == 14
    assert TABLES["system_snapshots"].retention_days == TABLES["metrics"].retention_days == 30


def response(columns=(), rows=()):
    class Table(list):
        pass

    table = Table(rows)
    table.columns = [SimpleNamespace(column_name=name, column_type="string") for name in columns]
    return SimpleNamespace(primary_results=[table])


def test_reader_binds_parameters_and_limits_returned_rows():
    supplied = """a" | count //"""

    def execute(database, text, props):
        assert database == "db"
        assert supplied not in text and text.startswith("declare query_parameters(")
        assert props.get_parameter("requested_node", None) == supplied
        assert props.get_parameter("row_limit", None) == "2"
        assert props.client_request_id.startswith("aictl.health.nodes;")
        assert props.get_option("request_readonly_hardline", None) is True
        return response(("node_id",), (("a",), ("b",), ("c",)))

    reader = KustoReader(SimpleNamespace(execute_query=execute), "db")
    result = reader.read("health.nodes", {"requested_node": supplied, "limit": 1})
    assert result.rows == [{"node_id": "a"}] and result.truncated
    assert reader.health()["queries"] == 1 and reader.health()["last_latency_ms"] >= 0
    assert not reader.capabilities()["change_feed"]
    with pytest.raises(UnknownViewError):
        reader.read("../secrets", {})
    with pytest.raises(ValueError, match="unexpected"):
        reader.read("health.nodes", {"row_limit": 123})


def test_view_timings_rank_what_reached_the_cluster_and_skip_cached_answers():
    def execute(_db, _query, props):
        if props.client_request_id.startswith("aictl.health.totals;"):
            return response(("table", "rows"), (("events", 2), ("sessions", 1)))
        raise RuntimeError("cluster refused")

    reader = KustoReader(SimpleNamespace(execute_query=execute), "db")
    assert reader.view_timings() == []
    reader.read("health.totals", {})
    reader.read("health.totals", {})  # answered from the cache
    with pytest.raises(StoreError):
        reader.read("health.nodes", {"limit": 5})
    timings = {row["view"]: row for row in reader.view_timings()}
    totals = timings["health.totals"]
    assert (totals["queries"], totals["failures"], totals["rows"]) == (1, 0, 2)
    assert totals["total_ms"] >= totals["max_ms"] >= 0 and totals["avg_ms"] == totals["total_ms"]
    assert timings["health.nodes"]["failures"] == timings["health.nodes"]["queries"] >= 1
    ranked = [row["total_ms"] for row in reader.view_timings()]
    assert ranked == sorted(ranked, reverse=True)


def test_health_totals_coalesces_concurrent_reads_and_caches_by_scope():
    entered, release = threading.Event(), threading.Event()
    calls = []

    def execute(_db, query, props):
        assert "arg_max(_v, *)" not in query and "(metrics |" not in query
        calls.append(props.get_parameter("requested_node", None))
        entered.set()
        assert release.wait(5)
        return response(("table", "rows"), (("events", 2),))

    reader = KustoReader(SimpleNamespace(execute_query=execute), "db")
    params = {"all_nodes": False, "requested_node": "node-a"}
    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(reader.read, "health.totals", params)
        assert entered.wait(5)
        second = pool.submit(reader.read, "health.totals", params)
        release.set()
        first.result(timeout=5).rows.clear()
        assert second.result(timeout=5).rows == [{"table": "events", "rows": 2}]
    assert reader.read("health.totals", params).rows == [{"table": "events", "rows": 2}]
    reader.read("health.totals", params | {"requested_node": "node-b"})
    assert calls == ["node-a", "node-b"]


@pytest.mark.parametrize(("payloads", "expected"), [
    ((json.dumps({"resource_usage": {"cpu": {"total cpu": "01:02:03.1234567"}}}),), 3723.1234567),
    (({"resource_usage": {"cpu": {"total cpu": "00:00:00"}}},), 0.0),
    ((), None),
    (("{malformed json", {"resource_usage": []}, {"resource_usage": {"cpu": {"total cpu": "01:60:00"}}}), None),
])
def test_reader_counts_cpu_reported_in_v2_query_responses(payloads, expected):
    from azure.kusto.data.response import KustoResponseDataSetV2

    sdk_result = KustoResponseDataSetV2([
        {"FrameType": "DataTable", "TableId": 0, "TableName": "PrimaryResult", "TableKind": "PrimaryResult",
         "Columns": [{"ColumnName": "node_id", "ColumnType": "string"}], "Rows": [["test-node"]]},
        {"FrameType": "DataTable", "TableId": 1, "TableName": "QueryCompletionInformation",
         "TableKind": "QueryCompletionInformation",
         "Columns": [{"ColumnName": name, "ColumnType": kind}
                     for name, kind in (("EventTypeName", "string"), ("Payload", "dynamic"), ("Level", "int"))],
         "Rows": [["QueryInfo", "finished", 4]] +
                 [["QueryResourceConsumption", payload, 4] for payload in payloads]},
    ])
    reader = KustoReader(SimpleNamespace(execute_query=lambda *_: sdk_result), "db")
    assert reader.read("health.nodes", {}).rows == [{"node_id": "test-node"}]
    stats = reader.health()["query_cpu"]
    assert stats == {"started_at": stats["started_at"], "queries": 1, "failed": 0,
                     "reported": int(expected is not None), "total_cpu_s": expected}


def test_schema_widens_tables_then_falls_back_when_streaming_policy_denied():
    sent = []

    def execute(database, text):
        assert database == "db"
        sent.append(text)
        if text.startswith(".show"):
            return response(("TableName", "ColumnName", "ColumnType"), [("files", "path", "System.String")])
        if "streamingingestion enable" in text:
            raise RuntimeError("Not authorized")
        return response()

    status = ensure_schema(SimpleNamespace(execute_mgmt=execute), "db", tables={"files": TABLES["files"]})
    assert not status.streaming_available and "Database Admin" in status.warning
    assert "['project']:string" in next(s for s in sent if s.startswith(".create-merge"))
    assert sent[-1].endswith("policy retention softdelete = 30d")
    assert not any(s.startswith(".clear") for s in sent)


def test_schema_names_required_role_when_retention_is_denied():
    def execute(_, text):
        if "policy retention" in text:
            raise RuntimeError("Forbidden")
        return response()

    with pytest.raises(StorePermissionError, match="Set retention for session_step_text requires Table Admin"):
        ensure_schema(
            SimpleNamespace(execute_mgmt=execute), "db", tables={"session_step_text": TABLES["session_step_text"]}
        )


def test_open_store_applies_streaming_fallback_to_writer(monkeypatch):
    from aictl.stores.kusto import schema

    def provision(_, database, *, modes):
        assert database == SETTINGS.database
        assert modes["files"] == modes["metrics"] == "streaming"
        assert modes["file_history"] == "queued"
        return SchemaStatus(False, "Database Admin permission missing")

    monkeypatch.setattr(schema, "ensure_schema", provision)
    with KustoClientFactory.replay(RECORDINGS / "quiet" / "kusto.jsonl.gz") as client:
        store = open_store("kusto", settings=SETTINGS)
        store.writer.append("files", [{"project": "", "path": "one"}])
        store.writer.flush()
        health = store.health()["writer"]
        assert health["tables"]["files"]["mode"] == "queued"
        assert "Database Admin" in health["warning"]
        assert client.ingestions[0][0] == "files"


def test_factory_replays_real_recording_and_rejects_unknown_queries():
    file = RECORDINGS / "quiet" / "kusto.jsonl.gz"
    with KustoClientFactory.replay(file) as recording:
        assert KustoClientFactory.client(SETTINGS) is KustoClientFactory.ingester(SETTINGS) is recording
        assert KustoClientFactory.native_ingester(SETTINGS) is recording
        capacity = recording.execute_mgmt("db", ".show capacity ingestions").primary_results[0]
        assert isinstance(next(iter(capacity))["Total"], int)
        with pytest.raises(UnrecordedQueryError, match="Unrecorded Kusto query in db: print 18652"):
            recording.execute_query("db", "print 18652")
        reader = KustoReader(recording, "db")
        with pytest.raises(StoreError, match="Unrecorded Kusto query"):
            reader.read("health.nodes", {})
        assert reader.health()["query_failures"] == 1


def test_recording_replays_occurrences_in_order(tmp_path):
    path = tmp_path / "test.jsonl.gz"
    with gzip.open(path, "wt", encoding="utf-8") as file:
        for value in (1, 2):
            record = {
                "kind": "query",
                "kql": "T",
                "outcome": "ok",
                "response": [{"columns": [{"name": "x", "type": "long"}], "rows": [[value]]}],
            }
            file.write(json.dumps(record) + "\n")
    with KustoClientFactory.replay(path) as client:
        assert [Result.from_response(client.execute("db", "T")).rows for _ in range(3)] == [[(1,)], [(2,)], [(2,)]]
