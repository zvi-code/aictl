"""Offline health projections and real local HTTP routing."""

import json
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from types import SimpleNamespace

import pytest

from aictl.dashboard import board_api
from aictl.health import ObservedKustoClient, OperationStats
from aictl.kusto import KustoSettings
from aictl.kusto.connection import KustoClientFactory
from aictl.kusto.ingest import InlineIngester


@pytest.fixture
def cached_health(monkeypatch):
    data = {
        "stats": {"events_count": 4, "file_size_bytes": 8192},
        "quality": [],
        "hooks": {},
        "checked_at": 1000.0,
    }
    monkeypatch.setattr(board_api, "_cached_health_data", lambda *_: data)
    return data


def test_operation_counts_errors_inflight_and_successful_volume():
    stats = OperationStats(volume=True)
    first = stats.begin()
    assert stats.snapshot()["in_flight"] == 1
    stats.finish(first, rows=3, bytes_=15)
    with pytest.raises(ValueError):
        stats.call(lambda: (_ for _ in ()).throw(ValueError("failed")), rows=5, bytes_=20)
    value = stats.snapshot()
    assert (value["total"], value["failed"], value["in_flight"]) == (2, 1, 0)
    assert (value["rows"], value["bytes"]) == (3, 15)
    assert value["last_success_at"] and value["last_error"] == "failed"
    assert value["rate_per_s"] > 0 and value["avg_ms"] is not None
    for _ in range(1000):
        stats.call(lambda: None)
    assert len(stats._buckets) <= 61


def test_health_reports_sqlite_http_not_sql_and_unknown_volume(cached_health):
    reads = OperationStats()
    reads.call(lambda: None)
    db = SimpleNamespace(_path=Path("history.db"), _budget_bytes=50000)
    health = board_api.compute_health(db, SimpleNamespace(snapshot=None), http_reads=reads)
    assert health["pipeline"]["self"]["db_rows"] == 4
    assert health["store"]["volume"]["bytes"] == 8192
    assert health["store"]["kind"] == "sqlite"
    assert health["store"]["reads"]["total"] == 1
    assert health["store"]["writes"] is None
    assert health["store"]["ingestion_capacity"] is None
    assert "not SQL" in health["store"]["measurement_scope"]
    assert health["store"]["health"]["state"] == "ok"
    cached_health.clear()
    missing = board_api.compute_health(None, SimpleNamespace(snapshot=None))
    assert missing["store"]["health"]["state"] == "unknown"
    assert missing["pipeline"]["self"]["db_rows"] is None
    assert missing["store"]["volume"]["bytes"] is None


def test_kusto_health_uses_existing_clients_without_discovery(cached_health, monkeypatch):
    settings = KustoSettings("https://cluster.kusto.windows.net", database="history", ingestion="inline")
    client = ObservedKustoClient(
        SimpleNamespace(
            execute=lambda *_: None,
            execute_mgmt=lambda *_: None,
        )
    )
    client.execute("history", "x | count")
    ingester = InlineIngester(client, "history", slots=2)
    ingester.ingest_lines("events", ['{"x":1}', '{"x":2}'])
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (client, ingester))
    monkeypatch.setattr(KustoClientFactory, "client", lambda *_: pytest.fail("must not create clients"))
    health = board_api.compute_health(
        SimpleNamespace(_kusto=settings, _path=settings.uri), SimpleNamespace(snapshot=None)
    )
    store = health["store"]
    assert store["cluster_url"] == "https://cluster.kusto.windows.net"
    assert store["reads"]["total"] == 1
    assert store["writes"]["rows"] == 2 and store["writes"]["bytes"] == 15
    assert store["ingestion_capacity"] == {"total": 2, "in_use": None, "available": None}
    assert store["volume"]["bytes"] is None
    assert "not cluster-wide" in store["health"]["scope"]


def test_health_objects_do_not_wait_for_client_initialization():
    settings = KustoSettings("https://cluster.kusto.windows.net")
    with KustoClientFactory._lock:
        assert KustoClientFactory.health_objects(settings) == (None, None)


def test_latest_client_failure_is_degraded_and_recovery_is_ok(cached_health, monkeypatch):
    settings = KustoSettings("https://cluster.kusto.windows.net", ingestion="inline")
    client = ObservedKustoClient(SimpleNamespace())
    started = client.reads.begin()
    client.reads.finish(started, error="permission denied")
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (client, None))
    db = SimpleNamespace(_kusto=settings, _path=settings.uri)
    store = SimpleNamespace(snapshot=None)
    health = board_api.compute_health(db, store)["store"]["health"]
    assert health["state"] == "degraded" and health["last_error"] == "permission denied"
    client.reads.call(lambda: None)
    assert board_api.compute_health(db, store)["store"]["health"]["state"] == "ok"


def test_health_does_not_wait_for_uncached_database_queries(monkeypatch):
    entered, release, finished = threading.Event(), threading.Event(), threading.Event()

    def stats():
        entered.set()
        release.wait(5)
        finished.set()
        return {"events_count": 2}

    db = SimpleNamespace(_path="slow-health-store", stats=stats)
    monkeypatch.setattr(board_api, "_quality_rows", lambda *_: [])
    monkeypatch.setattr(board_api, "_hooks_by_tool", lambda *_: {})
    board_api._health_cache.clear()
    started = time.perf_counter()
    try:
        body = board_api.compute_health(db, SimpleNamespace(snapshot=None))
        assert time.perf_counter() - started < 1
        assert body["pipeline"]["self"]["db_rows"] is None
        assert entered.wait(1)
    finally:
        release.set()
        assert finished.wait(2)
    deadline = time.monotonic() + 2
    key = (id(db), "slow-health-store")
    while board_api._health_cache[key]["refreshing"] and time.monotonic() < deadline:
        time.sleep(0.01)
    assert board_api.compute_health(db, SimpleNamespace(snapshot=None))["pipeline"]["self"]["db_rows"] == 2


def test_health_route_is_local_and_works_before_first_snapshot(tmp_path, cached_health):
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore

    server = _DashboardHTTPServer(
        ("127.0.0.1", 0),
        _DashboardHandler,
        SnapshotStore(),
        AllowedPaths(),
        tmp_path,
        start_ingesters_now=False,
    )
    server.ready.clear()
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_address[1]}/api/board/health"
    try:
        with urllib.request.urlopen(url, timeout=3) as response:
            data = json.loads(response.read())
        assert set(data) == {"generated_at", "pipeline", "monitor", "store"}
        assert data["store"]["reads"]["in_flight"] == 1
        request = urllib.request.Request(url, headers={"Host": "attacker.example"})
        with pytest.raises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(request, timeout=3)
        assert error.value.code == 403
    finally:
        server.shutdown()
        server.server_close()
        thread.join(2)


def test_traffic_groups_partition_shared_raw_and_history_ingestion(cached_health, monkeypatch):
    settings = KustoSettings("https://cluster.kusto.windows.net", ingestion="inline")
    client = ObservedKustoClient(SimpleNamespace(execute_mgmt=lambda *_: None))
    ingester = InlineIngester(client, "history", slots=2)
    for table in ("OTELLogs", "hook_calls", "sessions", "system_snapshots", "tool_config", "maintenance_state"):
        ingester.ingest_lines(table, ['{"x":1}', '{"x":2}'])
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (client, ingester))
    db = SimpleNamespace(_kusto=settings, _path=settings.uri)
    store = board_api.compute_health(db, SimpleNamespace(snapshot=None))["store"]
    groups = store["traffic_groups"]
    assert [g["id"] for g in groups] == ["otel", "hooks", "live-session", "monitoring", "files-config", "other"]
    assert sum(g["requests"] for g in groups) == store["writes"]["total"] == 6
    assert sum(g["rows"] for g in groups) == store["writes"]["rows"] == 12
    assert all(g["rows"] == 2 and g["bytes"] == 15 for g in groups)
    members = [table for group in groups for table in group["tables"]]
    assert len(members) == len(set(members))
    details = store["ingestion_details"]
    assert details["batches"]["avg_rows"] == details["batches"]["last_rows"] == 2
    assert details["batches"]["avg_bytes"] == details["batches"]["last_bytes"] == 15
    assert details["policies"]["status"] == "pending"
    assert store["ingestion_traffic"]["inline"]["rows"] == 12
    assert store["ingestion_traffic"]["queued"]["rows"] == 0


def test_sqlite_group_traffic_is_unreported_not_zero(cached_health):
    store = board_api.compute_health(SimpleNamespace(_path=Path("history.db")), SimpleNamespace(snapshot=None))["store"]
    assert all(g["rows"] is None and g["requests"] is None for g in store["traffic_groups"])
    assert store["ingestion_details"] is None
    assert store["ingestion_traffic"] is None


def test_database_policy_probe_is_cached_and_http_only_uses_its_result(cached_health, monkeypatch):
    settings = KustoSettings("https://cluster.kusto.windows.net", database="history", ingestion="inline")
    calls = []

    class PolicyTable:
        columns = [SimpleNamespace(column_name="Policy", column_type="string")]

        def __iter__(self):
            return iter([[json.dumps({"IsEnabled": True})]])

    def execute(database, command, props):
        calls.append(command)
        return SimpleNamespace(primary_results=[PolicyTable()])

    client = ObservedKustoClient(SimpleNamespace(execute_mgmt=execute))
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (client, None))
    db = SimpleNamespace(_kusto=settings, _path=settings.uri)
    policies = board_api._health_kusto_policies(db)
    assert policies["streaming"] == {"IsEnabled": True}
    assert policies["checked_at"] and policies["last_error"] is None
    assert board_api._health_kusto_policies(db, policies) == policies
    assert len(calls) == 2
    cached_health["policies"] = policies
    details = board_api.compute_health(db, SimpleNamespace(snapshot=None))["store"]["ingestion_details"]
    assert details["policies"]["age_s"] is not None
    assert len(calls) == 2


def test_actual_ingesters_keep_mixed_group_modes_and_failures_separate(cached_health, monkeypatch):
    from azure.kusto.ingest.base_ingest_client import IngestionStatus

    from aictl.kusto.ingest import make_ingester

    settings = KustoSettings(
        "https://cluster.kusto.windows.net",
        ingestion="queued",
        table_ingestion={"requests": "streaming", "hook_calls": "inline"},
    )
    client = ObservedKustoClient(SimpleNamespace(execute_mgmt=lambda *_: None))
    streaming_client = SimpleNamespace(ingest_from_stream=lambda *_: None)
    queued_client = SimpleNamespace(ingest_from_stream=lambda *_: SimpleNamespace(status=IngestionStatus.QUEUED))
    ingester = make_ingester(settings, client, streaming_client, queued_client=queued_client)
    for table, count in (("OTELLogs", 1), ("events", 2), ("requests", 3), ("hook_calls", 4)):
        ingester.ingest_lines(table, ['{"x":1}'] * count)
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (client, ingester))
    db = SimpleNamespace(_kusto=settings, _path=settings.uri)
    store = board_api.compute_health(db, SimpleNamespace(snapshot=None))["store"]
    modes = store["ingestion_traffic"]
    assert (modes["queued"]["requests"], modes["streaming"]["requests"], modes["inline"]["requests"]) == (2, 1, 1)
    assert (modes["queued"]["rows"], modes["streaming"]["rows"], modes["inline"]["rows"]) == (3, 3, 4)
    queued_groups = {row["id"]: row for row in modes["queued"]["groups"]}
    streaming_groups = {row["id"]: row for row in modes["streaming"]["groups"]}
    assert queued_groups["live-session"]["rows"] == 2
    assert streaming_groups["live-session"]["rows"] == 3
    assert modes["queued"]["queryable_rows"] is None
    assert modes["queued"]["pending_history_rows"] == 0
    assert modes["queued"]["pending_raw_otel_rows"] is None
    assert modes["inline"]["avg_rows"] == modes["inline"]["last_rows"] == 4
    assert sum(mode["rows"] for mode in modes.values()) == store["writes"]["rows"]
    queued_client.ingest_from_stream = lambda *_: (_ for _ in ()).throw(ValueError("DM unavailable"))
    with pytest.raises(ValueError):
        ingester.ingest_lines("events", ['{"x":1}'])
    after = board_api.compute_health(db, SimpleNamespace(snapshot=None))["store"]["ingestion_traffic"]
    assert after["queued"]["failed"] == 1 and after["queued"]["rows"] == 3
    assert after["streaming"]["failed"] == after["inline"]["failed"] == 0
