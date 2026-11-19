"""Offline health projections and real local HTTP routing."""

import json
import sys
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
        "volume": {"stats": {"events_count": 4, "file_size_bytes": 8192}, "checked_at": 1000.0, "status": "cached"},
        "quality": [],
        "hooks": {},
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


def test_recent_latency_excludes_old_completions(monkeypatch):
    from aictl import health

    clock = [0.0]
    monkeypatch.setattr(health, "time", SimpleNamespace(monotonic=lambda: clock[0], time=lambda: clock[0]))
    stats = OperationStats()
    start = stats.begin()
    clock[0] = 2.0
    stats.finish(start, error="old error")
    clock[0] = 70.0
    assert stats.snapshot()["recent_avg_ms"] is None
    start = stats.begin()
    clock[0] = 70.25
    stats.finish(start)
    current = stats.snapshot()
    assert current["recent_avg_ms"] == 250 and current["avg_ms"] == 1125
    assert current["recent_failures"] == 0 and current["failed"] == 1


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
    assert health["store"]["table_inventory"]["status"] == "unsupported"
    assert health["resources"]["cluster"] is None
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
    # Inline client's concurrency limit is not a measurement of current cluster slots.
    assert store["ingestion_capacity"]["status"] == "pending" and store["ingestion_capacity"]["total"] is None
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
    recovered = board_api.compute_health(db, store)["store"]
    assert recovered["health"]["state"] == "ok" and recovered["health"]["last_error"] is None
    assert recovered["reads"]["failed"] == 1


def test_ingester_start_does_not_invent_a_success(monkeypatch):
    from aictl.dashboard import ingester_runner

    handle = {"name": "transcript-usage", "enabled": True, "source_exists": True,
              "last_poll_ts": 100.0, "poll_in_flight": True, "last_poll_inserted": 0}
    monkeypatch.setattr(ingester_runner, "collect_status", lambda _: [handle])
    first, = board_api._ingester_rows(None, [])
    assert (first["status"], first["last_ok"], first["rows"]) == ("running", None, None)
    handle.update(poll_in_flight=False, last_success_at=120.0)
    completed, = board_api._ingester_rows(None, [])
    assert (completed["status"], completed["last_ok"], completed["rows"]) == ("ok", 120.0, 0)
    handle.update(poll_in_flight=True, last_poll_ts=140.0)
    later, = board_api._ingester_rows(None, [])
    assert (later["status"], later["last_ok"], later["last_poll"]) == ("running", 120.0, 140.0)
    handle.update(poll_in_flight=False, last_success_started_at=140.0, last_success_at=149.0)
    warning = {"component": "transcript-usage", "status": "query_failed", "severity": "warning", "ts": 148.0}
    failed, = board_api._ingester_rows(None, [warning])
    assert (failed["status"], failed["last_ok"]) == ("query_failed", None)
    handle.update(last_success_started_at=160.0, last_success_at=163.0)
    recovered, = board_api._ingester_rows(None, [warning])
    assert (recovered["status"], recovered["last_ok"]) == ("ok", 163.0)


def test_stats_cache_preserves_measurement_time_and_last_good_counts_on_failure(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(board_api, "time", SimpleNamespace(time=lambda: clock[0], monotonic=lambda: clock[0]))
    monkeypatch.setattr(board_api, "_db_stats_memo", {})

    def scan():
        clock[0] += 3
        return {"requests_count": 0}

    db = SimpleNamespace(_path="counts", stats=scan)
    first = board_api._db_stats_sample(db)
    assert (first["started_at"], first["checked_at"], first["stats"]["requests_count"]) == (1000.0, 1003.0, 0)
    clock[0] += 20
    assert board_api._db_stats_sample(db) == first
    clock[0] += 60
    db.stats = lambda: (_ for _ in ()).throw(RuntimeError("temporarily unavailable"))
    stale = board_api._db_stats_sample(db)
    assert stale["status"] == "stale" and stale["last_error"]
    assert (stale["checked_at"], stale["attempted_at"], stale["stats"]) == (1003.0, 1083.0, first["stats"])
    db._path = "unmeasured"
    missing = board_api._db_stats_sample(db)
    assert missing["status"] == "error" and missing.get("checked_at") is None


def test_cluster_capacity_preserves_zero_and_does_not_retimestamp_on_probe_failure(monkeypatch):
    from test_kusto_connection import FakeClient, response

    db = SimpleNamespace(_kusto=KustoSettings("https://cluster.kusto.windows.net"))
    client = FakeClient(on_mgmt=lambda _: response(
        [("Resource", "string"), ("Total", "long"), ("Consumed", "long"), ("Remaining", "long")],
        [["Ingestions", 12, 12, 0]],
    ))
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (client, None))
    sample = board_api._health_kusto_capacity(db)
    assert (sample["total"], sample["in_use"], sample["available"]) == (12, 12, 0)
    assert board_api._health_kusto_capacity(db, sample) == sample and len(client.commands) == 1
    client.on_mgmt = lambda _: (_ for _ in ()).throw(RuntimeError("denied"))
    stale = board_api._health_kusto_capacity(db, {**sample, "attempted_at": 0})
    assert stale["status"] == "stale" and stale["checked_at"] == sample["checked_at"] and stale["last_error"]


_TABLE_DETAILS_COLUMNS = [
    ("TableName", "string"), ("TotalRowCount", "long"), ("TotalExtents", "long"),
    ("TotalExtentSize", "real"), ("TotalOriginalSize", "real"), ("HotExtentSize", "real"),
]


def test_native_inventory_distinguishes_empty_zero_unknown_stale_and_recovery(monkeypatch):
    from test_kusto_connection import FakeClient, response

    clock = [1000.0]
    monkeypatch.setattr(board_api, "time", SimpleNamespace(time=lambda: clock[0]))
    db = SimpleNamespace(_kusto=KustoSettings("https://cluster.kusto.windows.net"))
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (None, None))
    sample = board_api._health_table_inventory(db)
    assert sample["status"] == "pending" and sample["attempted_at"] is None

    client = FakeClient(on_mgmt=lambda _: SimpleNamespace(primary_results=[]))
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (client, None))
    error = board_api._health_table_inventory(db, sample)
    assert error["status"] == "error" and error["checked_at"] is None and error["last_error"]
    assert error["attempted_at"] == clock[0] and error["tables"] == []
    assert board_api._health_table_inventory(db, error) == error and len(client.commands) == 1
    clock[0] += error["refresh_interval_s"]
    client.on_mgmt = lambda _: response(_TABLE_DETAILS_COLUMNS, [["OTELLogs", 0, 0, 0.0, None, 0.0]])
    sample = board_api._health_table_inventory(db, error)
    assert sample["tables"] == [{
        "name": "OTELLogs", "rows": 0, "extent_count": 0, "extent_bytes": 0, "original_bytes": None,
        "hot_bytes": 0, "compressed_bytes": None,
    }]
    assert sample["status"] == "cached" and sample["last_error"] is None and sample["truncated"] is False
    clock[0] += sample["refresh_interval_s"]
    client.on_mgmt = lambda _: (_ for _ in ()).throw(RuntimeError("permission denied"))
    stale = board_api._health_table_inventory(db, sample)
    assert stale["status"] == "stale" and stale["tables"] == sample["tables"] and stale["last_error"]
    assert stale["checked_at"] == sample["checked_at"] < stale["attempted_at"] == clock[0]
    assert board_api._health_table_inventory(db, stale) == stale and len(client.commands) == 3
    clock[0] += stale["refresh_interval_s"]
    client.on_mgmt = lambda _: response(_TABLE_DETAILS_COLUMNS, [])
    empty = board_api._health_table_inventory(db, stale)
    assert (empty["status"], empty["tables"], empty["last_error"], empty["checked_at"]) == ("cached", [], None, clock[0])


def test_health_and_machine_share_background_adx_probes_and_logical_scan(monkeypatch):
    from test_kusto_connection import response

    from aictl.kusto import health_metrics

    clock = [1000.0]
    monkeypatch.setattr(board_api, "time", SimpleNamespace(time=lambda: clock[0], monotonic=lambda: clock[0]))
    monkeypatch.setattr(board_api, "_health_cache", {})
    monkeypatch.setattr(board_api, "_db_stats_memo", {})
    entered, release = threading.Event(), threading.Event()
    caller = threading.current_thread()
    calls = []

    def record(name):
        calls.append((name, threading.current_thread()))

    def stats():
        record("logical")
        entered.set()
        assert release.wait(3)
        return {"sessions_count": 7}

    settings = KustoSettings("https://cluster.kusto.windows.net", database="selected_db")
    db = SimpleNamespace(_kusto=settings, _path=settings.uri, stats=stats)
    machine_db = SimpleNamespace(**vars(db))  # Different view, same database.
    store = SimpleNamespace(snapshot=None)
    inv = ".show tables details"
    cap = ".show capacity ingestions"
    inventory_calls = []

    def execute(database, command, props):
        record(command)
        if command.startswith(inv):
            inventory_calls.append((database, command, props.get_option("servertimeout", None)))
            return response(_TABLE_DETAILS_COLUMNS, [
                ["sessions", 3, 1, 21.0, 38.0, 12.0],
                *[[f"t{i:04}", 0, 0, 0, 0, 0] for i in range(board_api.TABLE_INVENTORY_LIMIT)],
            ])
        if command == cap:
            return response([("Resource", "string"), ("Total", "long")], [["Ingestions", 12]])
        return response([("Policy", "string")], [])

    client = SimpleNamespace(execute_mgmt=execute)
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (client, None))
    cluster = {"status": "cached", "samples": {"cpu_percent": {"value": 21.0, "at": clock[0]}}}
    previous = []

    def read_metrics(db, sample):
        record("metrics hook")
        previous.append(sample)
        return cluster

    monkeypatch.setattr(health_metrics, "read_cluster_metrics", read_metrics)
    monkeypatch.setattr(board_api, "_hooks_by_tool", lambda *_: record("hooks") or {})
    monkeypatch.setattr(board_api, "_quality_rows", lambda *_: record("quality") or [])

    def wait_refresh():
        deadline = time.monotonic() + 2
        while board_api._health_cache[board_api._health_store_key(db)]["refreshing"]:
            assert time.monotonic() < deadline
            time.sleep(0.005)

    try:
        first = board_api.compute_health(db, store)
        assert first["store"]["table_inventory"]["status"] == "pending" and entered.wait(2)
        machine = board_api.compute_machine(machine_db, store)
        assert machine["pipeline"]["self"]["db_rows"] is None
        again = board_api.compute_health(db, store)
        assert again["resources"]["cluster"] == cluster and again["store"]["volume"]["rows"] is None
        inv_sample = again["store"]["table_inventory"]
        assert inv_sample["tables"][0] == {
            "name": "sessions", "rows": 3, "extent_count": 1, "extent_bytes": 21,
            "hot_bytes": 12, "original_bytes": 38, "compressed_bytes": None,
        }
        assert inv_sample["truncated"] and len(inv_sample["tables"]) == inv_sample["limit"]
        assert "sealed extents" in inv_sample["scope"]
    finally:
        release.set()
        wait_refresh()
    volume = board_api.compute_health(db, store)["store"]["volume"]
    assert volume["tables"] == {"sessions": 7} and volume["rows"] == 7 and volume["bytes"] is None
    assert volume["refresh_interval_s"] >= 300 and inv_sample["refresh_interval_s"] >= 300
    clock[0] += 65
    board_api.compute_machine(machine_db, store)
    wait_refresh()
    assert [name for name, _ in calls].count("logical") == 1
    assert [name for name, _ in calls].count(cap) == 2  # independent 60-second slot probe
    assert previous == [None, cluster] and all(thread is not caller for _, thread in calls)
    (database, command, timeout), = inventory_calls
    assert database == settings.database and timeout.total_seconds() == 5
    assert command == (
        ".show tables details | project TableName, TotalRowCount, TotalExtents, TotalExtentSize, "
        f"TotalOriginalSize, HotExtentSize | top {inv_sample['limit'] + 1} by TableName asc"
    )


def test_health_resources_keep_process_host_and_component_sample_times_distinct(cached_health, monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(board_api, "time", SimpleNamespace(time=lambda: clock[0], monotonic=lambda: clock[0]))
    monkeypatch.setattr(board_api, "_self_memo", [0.0, None])
    samplers = []
    monkeypatch.setattr(board_api, "self_usage", lambda: samplers.append("self") or {
        "cpu_percent": 75.0, "memory_rss_bytes": 1500, "daemon_cpu_percent": 2.5, "daemon_memory_rss_bytes": 600,
    })
    monkeypatch.setattr(board_api, "_own_process", lambda: samplers.append("threads") or {"threads": 9, "uptime_s": 12})
    vm = SimpleNamespace(total=5000, available=2000)
    monkeypatch.setitem(sys.modules, "psutil", SimpleNamespace(virtual_memory=lambda: samplers.append("host") or vm))
    snapshot = SimpleNamespace(timestamp=990.0, cpu_per_core=[0.0, 40.0], tools=[], total_cpu=110.0, total_mem_mb=50,
                               total_live_inbound_rate_bps=800, total_live_outbound_rate_bps=0)
    store = SimpleNamespace(snapshot=snapshot)
    data = board_api.compute_health(None, store)
    daemon, host = data["resources"]["daemon"], data["resources"]["host"]
    assert (daemon["cpu_percent"], daemon["rss_bytes"], daemon["threads"], daemon["checked_at"]) == (2.5, 600, 9, 1000)
    assert data["pipeline"]["self"]["cpu"] == 75.0 and data["pipeline"]["self"]["rss"] == 1500
    assert (host["cpu_percent"], host["memory_total_bytes"], host["memory_used_bytes"], host["memory_available_bytes"]) == (
        20.0, 5000, 3000, 2000,
    )
    assert (host["cpu_checked_at"], host["memory_checked_at"], host["checked_at"]) == (990.0, 1000.0, 1000.0)
    assert (host["inbound_bps"], host["outbound_bps"], host["activity_at"]) == (800, 0, 990.0)
    clock[0] += 5
    snapshot.timestamp, snapshot.cpu_per_core = clock[0], [0.0, 0.0]
    host = board_api.compute_health(None, store)["resources"]["host"]
    assert (host["cpu_percent"], host["cpu_checked_at"], host["memory_checked_at"]) == (0.0, 1005.0, 1000.0)
    assert samplers == ["self", "threads", "host"]
    clock[0] += board_api.SELF_TTL_S
    store.snapshot = None
    monkeypatch.setattr(board_api, "self_usage", lambda: {"daemon_cpu_percent": 0.0, "daemon_memory_rss_bytes": 600})
    assert board_api.compute_health(None, store)["resources"]["daemon"]["cpu_percent"] == 0.0
    clock[0] += board_api.SELF_TTL_S
    # The existing process sampler returns this pair when it couldn't read the daemon.
    monkeypatch.setattr(board_api, "self_usage", lambda: {"daemon_cpu_percent": 0.0, "daemon_memory_rss_bytes": 0})
    monkeypatch.setattr(board_api, "_own_process", lambda: {"threads": None, "uptime_s": None})
    monkeypatch.setitem(sys.modules, "psutil", None)
    resources = board_api.compute_health(None, store)["resources"]
    for level in ("host", "daemon"):
        assert all(v is None for k, v in resources[level].items() if k != "scope")


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
        assert set(data) == {"generated_at", "pipeline", "resources", "monitor", "store"}
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
    streaming_client = SimpleNamespace(execute_streaming_ingest=lambda *_: None)
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
