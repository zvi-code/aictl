import json
import threading
import time
import urllib.error
import urllib.request
from types import SimpleNamespace
from urllib.parse import urlencode

import pytest
from click.testing import CliRunner

from aictl.cli import main
from aictl.dashboard.node_views import NodeViewError, node_view


def project(**extra):
    return SimpleNamespace(current_history=True, **extra)


@pytest.fixture
def node_reader(kusto_store, monkeypatch):
    reader = kusto_store.history_store.reader
    settings = SimpleNamespace(cluster="https://cluster.example", database="aictl", node_id="host-a",
                               node_id_source="hostname", ingestion="auto")
    monkeypatch.setattr(reader, "connection_info", lambda: settings)
    return reader


def query(view, scope="local", **p):
    return {k: [v] for k, v in {"view": view, "scope": scope, **p}.items()}


def test_cold_node_report_does_not_retry_low_memory_or_return_empty_success():
    from aictl.stores.kusto.reader import KustoReader

    requests = []

    def execute(_db, _kql, props):
        requests.append(props)
        exc = RuntimeError("partial query failure: E_LOW_MEMORY_CONDITION")
        exc.http_response = SimpleNamespace(status_code=503)
        raise exc

    reader = KustoReader(SimpleNamespace(execute_query=execute), "aictl_perf_test")
    for _ in range(2):
        with pytest.raises(NodeViewError, match="E_LOW_MEMORY_CONDITION") as err:
            node_view(project(), query("health", "fleet"), reader=reader)
    props, = requests
    assert err.value.status == 503 and props.client_request_id in str(err.value)
    assert props.get_option("query_fanout_threads_percent", None) == 1
    assert props.client_request_id.startswith("aictl.nodes.reports;")
    assert props.get_option("max_memory_consumption_per_query_per_node", None) is None
    assert props.get_option("deferpartialqueryfailures", None) is False


def test_warm_node_failure_returns_marked_sample_with_original_time(monkeypatch):
    from aictl.stores.kusto import reader as kusto_reader

    calls = []

    def execute(_db, _kql, props):
        calls.append(props.client_request_id)
        if len(calls) > 1:
            raise RuntimeError("E_LOW_MEMORY_CONDITION")
        columns = [SimpleNamespace(column_name=k, column_type="real") for k in ("node_id", "captured_at")]

        class Table(list):
            pass

        table = Table([("host-a", 600)])
        table.columns = columns
        return SimpleNamespace(primary_results=[table])

    elapsed = 100.0
    monkeypatch.setattr(kusto_reader.time, "monotonic", lambda: elapsed)
    reader = kusto_reader.KustoReader(SimpleNamespace(execute_query=execute), "db")

    def load():
        return node_view(project(), query("health", "fleet"), now=610, reader=reader)["rows"][0]

    assert load()["status"] == "reported"
    elapsed += 6
    assert load()["status"] == "stale"
    assert load()["captured_at"] == 600
    assert len(set(calls)) == len(calls) == 2
    elapsed += 300
    with pytest.raises(NodeViewError, match="E_LOW_MEMORY_CONDITION"):
        load()


def test_fleet_discovery_and_health_do_not_substitute_the_serving_node(kusto_store, node_reader):
    kusto_store.insert("system_snapshots", node_id="host-b", ts=200, host_cpu_percent=0)
    kusto_store.insert("sessions", node_id="", session_id="earlier")
    reader = node_reader
    nodes = node_view(project(), query("nodes"), reader=reader)
    assert {r["node_id"] for r in nodes["rows"]} == {"host-b", "legacy"}
    health = node_view(
        project(),
        query("health", "fleet"),
        now=600,
        reader=reader,
        local_health=lambda: pytest.fail("Remote health requested local runtime"),
    )
    assert "local_runtime" not in health
    assert [(r["node_id"], r["status"], r["cpu_percent"]) for r in health["rows"]] == [
        ("legacy", "unknown", None),
        ("host-b", "stale", 0),
    ]
    assert health["shared_kusto"]["database"] == "aictl"
    settings = node_view(project(), query("settings", "node", node_id="host-b"), reader=reader)
    assert settings["rows"][0]["status"] == "unknown" and not settings["rows"][0]["capture"]


def test_session_and_totals_use_node_qualified_keys_and_bound_session_identifiers(kusto_store):
    node_rows = {"host-a": "model-a", "host-b": "model-b"}
    sid = 'id " shared & +'
    for (node, model), count in zip(node_rows.items(), (4, 5), strict=True):
        kusto_store.insert("sessions", node_id=node, session_id=sid, tool="copilot-cli", model=model, started_at=100,
                           request_count=count)
    reader = kusto_store.history_store.reader
    overview = node_view(project(), query("overview", "fleet", since="0", until="200"), reader=reader, now=200)
    assert overview["totals"]["sessions"] == 2 and len(overview["sessions"]) == 2
    assert overview["totals"]["requests"] == 9
    for r in overview["sessions"]:
        q = query("session", "node", node_id=r["node_id"], session_id=r["session_id"])
        assert node_view(project(), q, reader=reader, now=200)["rows"][0]["model"] == node_rows[r["node_id"]]
    with pytest.raises(NodeViewError, match="both a named node"):
        node_view(project(), query("session", "fleet", session_id=sid), reader=reader)
    with pytest.raises(NodeViewError, match="earlier than until"):
        node_view(project(), query("overview", since="10", until="1"), reader=reader)


def test_health_sample_uses_only_current_process_counters_and_shared_resource_scope(node_reader, monkeypatch):
    from test_contract import validate_detail

    from aictl.health import node_transport_counters

    writer = node_transport_counters({}, {"status": "active", "warning": "private",
        "tables": {"events": {"queue_depth": 0, "rows_sent": 9, "ingest_failures": 1, "last_error": "private"}}})
    rows = []
    for node, at, pid in (("current", 598, 7), ("old-process", 598, 6), ("stale", 100, 7)):
        rows.append({"node_id": node, "captured_at": 600, "daemon_pid": 7, "inbound_bps": 240, "outbound_bps": 0,
                     "counter_sample": json.dumps({"at": at, "pid": pid, "store": writer})})

    def read(view, _params):
        assert view == "nodes.reports"
        return SimpleNamespace(rows=rows, truncated=False)

    monkeypatch.setattr(node_reader, "read", read)
    report = node_view(project(), query("health", "fleet"), now=600, reader=node_reader,
                       shared_health=lambda: {"capacity": {"available": 0, "total": 12},
                                              "table_inventory": {"tables": [{"name": "events", "rows": 200}]},
                                              "cluster_resources": {"native": {"nodes": 3}}, "quality": ["private"]})
    assert [r["client_sample"] is not None for r in report["rows"]] == [True, False, False]
    assert report["rows"][0]["client_sample"]["store"]["writer"]["tables"]["events"] == {
        "queue_depth": 0, "rows_sent": 9, "ingest_failures": 1,
    }
    assert (report["rows"][0]["inbound_bps"], report["rows"][0]["outbound_bps"]) == (240, 0)
    assert report["shared_kusto"]["capacity_available"] == 0
    assert report["shared_kusto"]["table_inventory"]["tables"][0]["rows"] == 200
    assert "private" not in json.dumps(report)
    validate_detail("/api/board/nodes", {**report, "shared_kusto": report["shared_kusto"] | {"table_inventory": None}})


def test_runtime_reports_keep_monitored_counts_independent_of_agent_inventory(kusto_store, node_reader):
    seed = kusto_store.insert
    seed("system_snapshots", node_id="host-a", ts=991, live_sessions=4, active_processes=8, daemon_pid=6)
    seed("system_snapshots", node_id="host-b", ts=992, live_sessions=9, active_processes=13, daemon_pid=7,
         node_health_counters=json.dumps({"at": 992, "pid": 7, "store": {},
             "runtime": {"agents": {"captured_at": 990, "total": 1, "rows": [
                 {"session_id": "same-session", "running": True, "project_path": "/private/path", "prompt": "private"}
             ]}}}))
    seed("system_snapshots", node_id="host-c", ts=993, live_sessions=0, active_processes=0, daemon_pid=30,
         node_health_counters=json.dumps({"at": 993, "pid": 29, "store": {},
             "runtime": {"agents": {"captured_at": 991, "total": 0, "rows": []}}}))
    seed("system_snapshots", node_id="old-host", ts=600, live_sessions=42)
    reader = node_reader

    def local_health():
        return {"resources": {"host": {"checked_at": 997, "activity_at": 996, "active_sessions": 5,
                                       "active_processes": 11, "memory_total_bytes": 100 * 1024**2}},
                "pipeline": {"self": {"pid": 6}}}

    fleet = node_view(project(), query("runtime", "fleet"), now=1000.0, reader=reader, local_health=local_health)
    a, b, c = fleet["rows"]
    assert (a["active_sessions"], a["active_processes"]) == (5, 11)
    assert (b["active_sessions"], b["active_processes"]) == (9, 13)
    assert b["agents"]["rows"][0]["session_id"] == "same-session"
    assert "private" not in json.dumps(fleet)
    assert c["active_sessions"] == 0 and c["agents"] is None
    own = node_view(project(), query("health"), now=1000.0, reader=reader, local_health=local_health)
    assert own["rows"] == [{k: v for k, v in a.items() if k != "agents"}]


def test_health_series_buckets_process_counters_without_crossing_a_restart(kusto_store, node_reader):
    from test_contract import validate_detail

    def counters(pid, reads, dropped, cpu_s):
        tables = {"events": {"queue_depth": 3, "rows_dropped": dropped}, "sessions": {"queue_depth": 2, "rows_dropped": 0}}
        return json.dumps({"pid": pid, "store": {"reads": {"total": reads, "failed": 0, "recent_avg_ms": 100.0},
                                                  "query_cpu": {"total_cpu_s": cpu_s}, "writer": {"tables": tables}},
                           "runtime": {"daemon": {"cpu_percent": 5.0, "rss_bytes": 100 * 1024**2}}})

    for ts, pid, reads, dropped, cpu_s in ((3600, 7, 100, 1, 10.0), (3630, 7, 160, 4, 13.0), (3660, 8, 5, 0, 0.5)):
        kusto_store.insert("system_snapshots", node_id="host-a", ts=ts, host_cpu_percent=20.0,
                           node_health_counters=counters(pid, reads, dropped, cpu_s))
    kusto_store.insert("system_snapshots", node_id="host-b", ts=3650, host_cpu_percent=50.0)
    kusto_store.insert("system_snapshots", node_id="host-b", ts=3500, host_cpu_percent=90.0)
    out = node_view(project(), query("series", "fleet", since="3590", until="3700"), now=3700, reader=node_reader)
    validate_detail("/api/board/nodes", out)
    assert (out["since"], out["until"], out["step"]) == (3570, 3720, 30)
    rows = {(r["node_id"], r["t"]): r for r in out["rows"]}
    assert sorted(rows) == [("host-a", 3600), ("host-a", 3630), ("host-a", 3660), ("host-b", 3630)]
    first, second, restarted = rows["host-a", 3600], rows["host-a", 3630], rows["host-a", 3660]
    assert first["reads_per_s"] is None and first["queue_depth"] == 5 and first["daemon_rss_mb"] == 100
    assert (second["reads_per_s"], second["rows_dropped"], second["restarts"]) == (2, 3, 0)
    assert second["query_cpu"] == pytest.approx(0.1)
    assert (restarted["reads_per_s"], restarted["rows_dropped"], restarted["restarts"]) == (None, 0, 1)
    assert rows["host-b", 3630]["host_cpu"] == 50 and rows["host-b", 3630]["daemon_cpu"] is None
    local = node_view(project(), query("series", since="3590", until="3700"), now=3700, reader=node_reader)
    assert {r["node_id"] for r in local["rows"]} == {"host-a"}
    with pytest.raises(NodeViewError, match="overview, series, flows and backend"):
        node_view(project(), query("health", since="1"), reader=node_reader)


def test_health_flows_rate_each_table_per_node_without_crossing_a_restart(kusto_store, node_reader):
    from test_contract import validate_detail

    def counters(pid, events, sessions):
        return json.dumps({"pid": pid, "store": {"writer": {"tables": {
            "events": {"mode": "streaming", "rows_sent": events, "bytes_sent": events * 100,
                       "ingest_requests": events // 10, "ingest_failures": 0, "rows_dropped": 0, "queue_depth": 2},
            "sessions": {"mode": "queued", "rows_sent": sessions, "bytes_sent": sessions * 50, "ingest_requests": 1,
                         "ingest_failures": 1 if sessions else 0, "rows_dropped": 0, "queue_depth": 0},
        }}}})

    for node, ts, pid, events, sessions in (("host-a", 3600, 7, 100, 0), ("host-a", 3630, 7, 400, 30),
                                            ("host-a", 3660, 8, 10, 0), ("host-b", 3600, 3, 0, 0),
                                            ("host-b", 3630, 3, 60, 0)):
        kusto_store.insert("system_snapshots", node_id=node, ts=ts, host_cpu_percent=10.0,
                           node_health_counters=counters(pid, events, sessions))
    out = node_view(project(), query("flows", "fleet", since="3590", until="3700"), now=3700, reader=node_reader)
    validate_detail("/api/board/nodes", out)
    assert "rows" not in out and (out["since"], out["until"], out["step"]) == (3570, 3720, 30)
    tables = {(r["table"], r["t"]): r for r in out["tables"]}
    assert (tables["events", 3630]["rows_per_s"], tables["events", 3630]["nodes"]) == (12, 2)
    assert tables["events", 3630]["bytes_per_s"] == 1200 and tables["events", 3630]["queue_depth"] == 4
    assert tables["sessions", 3630]["rows_per_s"] == 1 and tables["sessions", 3630]["failures"] == 1
    assert not tables["events", 3660]["rows_per_s"], "a restarted daemon's counters start again"
    nodes = {(r["node_id"], r["table"]): r for r in out["nodes"]}
    assert sorted(nodes) == [("host-a", "events"), ("host-a", "sessions"), ("host-b", "events")]
    a = nodes["host-a", "events"]
    assert (a["mode"], a["rows"], a["requests"], a["peak_rows_per_s"], a["last_at"]) == ("streaming", 300, 30, 10, 3660)
    assert nodes["host-a", "sessions"]["mode"] == "queued" and nodes["host-b", "events"]["rows"] == 60
    local = node_view(project(), query("flows", since="3590", until="3700"), now=3700, reader=node_reader)
    assert {r["node_id"] for r in local["nodes"]} == {"host-a"}


def test_backend_usage_is_shared_by_viewers_and_reports_unavailable_history(node_reader, monkeypatch):
    from test_contract import validate_detail

    from aictl.dashboard import node_views

    calls = []

    class Metadata:
        database = "aictl"

        def backend_usage(self, since, until, step):
            calls.append((since, until, step))
            if len(calls) > 1:
                raise PermissionError("no admin")
            return ([{"t": since, "work": "aictl_queries", "commands": 4, "failed": 1, "cpu_s": 2.5, "memory_peak": 9},
                     {"t": since, "work": "unknown", "commands": 1}],
                    [{"view": "", "commands": 4, "failed": 1, "cpu_s": 2.5, "mean_ms": 10, "max_ms": 20}])

    monkeypatch.setattr(node_views, "_backend_cache", {})
    monkeypatch.setattr(node_reader, "health_metadata", lambda: Metadata(), raising=False)
    params = query("backend", "fleet", since="3590", until="3700")
    out = node_view(project(), params, now=3700, reader=node_reader)
    validate_detail("/api/board/nodes", out)
    assert [r["work"] for r in out["series"]] == ["aictl_queries"] and out["views"][0]["view"] == "unnamed"
    assert node_view(project(), params, now=3700, reader=node_reader)["series"] == out["series"]
    assert calls == [(3570, 3720, 30)]
    with pytest.raises(NodeViewError, match="unavailable") as failed:
        node_view(project(), query("backend", "fleet", since="3000", until="3700"), now=3700, reader=node_reader)
    assert failed.value.status == 503


def test_local_runtime_inventory_does_not_export_paths_and_deduplicates_sessions():
    from aictl.dashboard.node_views import agent_inventory

    records = {
        "source.status": [{"producer": "runtime-collector", "ready": True, "observed_at": 980.0}],
        "runtime.agent": [
            {"session_id": "x", "native_session_id": "x", "running": True, "project": "private", "title": "private"},
            {"session_id": "process-id", "native_session_id": "x", "running": False},
        ],
    }
    hub = SimpleNamespace(values=records.__getitem__)
    inventory = agent_inventory(hub, 1000)
    assert inventory["total"] == 1 and inventory["rows"][0]["running"] is True
    assert "private" not in json.dumps(inventory)
    assert agent_inventory(hub, 1300) is None






@pytest.fixture
def history(monkeypatch, kusto_store):
    from aictl.dashboard import board_projection, board_routes, runtime_health, session_record

    sid = "eaf2c622-9bed-4cf3-88af-f9ebac09b7de"
    calls = []

    def add(table, node, key, version=1, deleted=False, **fields):
        from aictl.stores.kusto.tables import TABLES

        schema = TABLES[table]
        canonical = {k: v for k, v in fields.items() if k in dict(schema.columns)}
        canonical.update(node_id=node, _v=f"2026-01-{version:02d}")
        if schema.tombstone:
            canonical[schema.tombstone] = deleted
        if "dedup_key" in dict(schema.columns):
            canonical.setdefault("dedup_key", str(key))
        kusto_store.insert(table, **canonical)

    for node, ts, tool, model, input_, cache, duration, count in [
        ("host-a", 1100, "copilot-cli", "model-a", 10, 90, 10, 1),
        ("host-b", 1600, "copilot-cli", "model-b", 90, 10, 100, 4),
        ("", 1700, "claude-code", "model-b", 20, 0, 300, 1),
    ]:
        add("sessions", node, sid, session_id=sid, tool=tool, project_path="/shared", started_at=ts, ended_at=ts + 50)
        add("agents", node, "child", agent_id="child", session_id=sid, tool=tool, started_at=ts, completed=1)
        add(
            "session_prompts", node, 1, id=1, session_id=sid, ts=ts, text=f"shared prompt {node or 'legacy'}", tool=tool
        )
        add("requests", node, 1, id=1, session_id=sid, ts=ts, tool=tool, model=model, input_tokens=1_000_000)
        for i in range(count):
            add(
                "requests",
                node,
                i + 1,
                version=2,
                id=i + 1,
                session_id=sid,
                agent_id="child",
                ts=ts + i,
                tool=tool,
                model=model,
                input_tokens=input_,
                cache_read_tokens=cache,
                cost_usd=1,
                duration_ms=duration,
            )
            add(
                "tool_invocations",
                node,
                i + 1,
                id=i + 1,
                session_id=sid,
                tool=tool,
                tool_name="Read",
                ts=ts + i,
                duration_ms=duration,
                is_error=int(node == "host-a"),
                exit_code=0,
            )
        add("requests", node, 800, id=800, session_id=sid, ts=ts, tool=tool, model=model, input_tokens=999)
        add("requests", node, 800, version=2, deleted=True, id=800, ts=0)
        add(
            "file_write_events",
            node,
            1,
            id=1,
            path="/shared/a.txt",
            ts=ts,
            session_id=sid,
            tool=tool,
            detail='{"lines_added":2}',
        )
        add("process_snapshots", node, (ts, 42), ts=ts, pid=42, tool=tool, cpu_percent=10, memory_rss_mb=25)
    add(
        "requests",
        "host-b",
        900,
        id=900,
        session_id=sid,
        ts=1100,
        tool="copilot-cli",
        model="model-a",
        input_tokens=100_000,
    )
    add("requests", "host-b", 900, version=2, id=900, session_id=sid, ts=20_000, tool="copilot-cli", model="model-a")
    add(
        "session_usage",
        "host-a",
        sid,
        session_id=sid,
        tool="copilot-cli",
        input_tokens=90_000,
        started_at=1100,
        last_activity_at=1100,
        request_count=3,
    )
    add(
        "session_steps",
        "host-b",
        "step",
        step_key="step",
        session_id=sid,
        agent_id="child",
        kind="round",
        ts=1600,
        text_status="captured",
    )
    add("session_step_text", "host-b", "step", step_key="step", session_id=sid, ts=1600, text="node-b evidence")


    def no_local(*_args, **_kwargs):
        pytest.fail("Scoped history tried to access serving-node data")

    monkeypatch.setattr(session_record, "time", SimpleNamespace(time=lambda: 4000, monotonic=time.monotonic))
    monkeypatch.setattr(board_projection, "_prompt_files_on_disk", no_local)
    monkeypatch.setattr(board_projection, "_skill_file", no_local)
    monkeypatch.setattr(runtime_health, "_self_usage", no_local)
    monkeypatch.setattr(board_projection, "project_root", no_local)
    monkeypatch.setattr("aictl.dashboard.session_record._stat", no_local)
    monkeypatch.setattr("aictl.dashboard.session_record.PR_FINDER.lookup", no_local)
    db = project(_conn=no_local)

    def call(endpoint="", now=4000, **params):
        query = urlencode({"scope": "fleet"} | params)
        if not endpoint:
            from aictl.dashboard.history_board import read_board

            return 200, json.loads(read_board(kusto_store, query, now=now))
        path = endpoint if endpoint.startswith("/api/") else "/api/board" + endpoint
        status, body = board_routes.handle_get(path, query, db, kusto_store, now=now)
        return status, json.loads(body)

    yield SimpleNamespace(call=call, sid=sid, calls=calls, add=add)


def test_fleet_board_aggregates_winners_once_and_reuses_history(history):
    from test_contract import validate_detail

    status, board = history.call(since=1000, until=2000, buckets=2)
    assert status == 200 and not history.calls
    validate_detail("/api/history/board", board)
    assert board["node_scope"] == {"kind": "fleet", "node_id": None}
    assert board["kpis"]["tokens"] == 520
    assert board["kpis"]["cached_share"] == pytest.approx(130 / 520, abs=1e-4)
    assert board["kpis"]["fail_rate"] == pytest.approx(1 / 6, abs=1e-4)
    assert board["kpis"]["p50_ms"] == 100 and board["kpis"]["p95_ms"] == 300
    assert board["series"]["tokens"]["input"] == [10, 380]
    assert board["series"]["latency"]["p50"] == [10, 100]
    assert board["series"]["cpu"] == {"copilot-cli": [10, 10], "claude-code": [None, 10]}
    assert {r["id"] for r in board["options"]["tools"]} == {"copilot-cli", "claude-code"}
    assert {r["model"] for r in board["by_model"]} == {"model-a", "model-b"}
    assert board["scope"]["all_agents"] == 6
    assert len({r["id"] for r in board["agents"]}) == 6
    assert {r["node_id"] for r in board["agents"]} == {"host-a", "host-b", "legacy"}
    assert len({r["id"] for r in board["prompts"]}) == 3
    assert len({r["id"] for r in board["changes"]["files"]}) == 3
    assert not ({"processes", "self", "settings_at"} & board.keys())
    assert board["generated_at"] == 4000
    assert history.call(since=1000, until=2000, buckets=2, now=4001)[1] == board
    assert history.call(since=1000, until=2000, buckets=2, view="charts")[1] == {
        key: board[key] for key in ("node_scope", "range", "series")
    }
    _, filtered = history.call(
        since=1000,
        until=2000,
        buckets=2,
        tool="copilot-cli",
        model="model-b",
        status="ended",
        project="/shared",
        q="host-b",
    )
    assert filtered["kpis"]["tokens"] == 400
    assert {r["node_id"] for r in filtered["agents"]} == {"host-b"}
    assert not history.calls
    _, brushed = history.call(since=1580, until=1660, buckets=2)
    assert brushed["kpis"]["tokens"] == 400 and not history.calls
    _, legacy = history.call(scope="node", node_id="legacy", since=1000, until=2000)
    assert {r["node_id"] for r in legacy["agents"]} == {"legacy"}
    status, empty = history.call(scope="node", node_id="not-reported", since=1000, until=2000)
    assert status == 200 and not empty["agents"] and empty["kpis"]["tokens"] == 0


def test_wide_board_retains_only_current_facts_and_reuses_projection(history, monkeypatch):

    _, board = history.call(since=1000, until=2000, buckets=2)
    assert board["kpis"]["tokens"] == 520
    assert board["kpis"]["tool_calls"] == 6
    assert not history.calls
    calls = len(history.calls)
    _, tool = history.call("/tool", since=1000, until=2000, buckets=2, name="Read", model="model-b", tool="copilot-cli")
    assert tool["total"] == 4 and len(history.calls) == calls


def test_tool_drawer_uses_the_same_session_scope_as_the_summary(history):
    args = {"since": 1000, "until": 2000, "tool": "copilot-cli", "q": "host-a"}
    _, board = history.call(**args)
    _, tool = history.call("/tool", name="Read", **args)
    assert tool["total"] == next(r["calls"] for r in board["tools"] if r["name"] == "Read") == 1
    _, none = history.call("/tool", name="Read", **(args | {"tool": "-"}))
    assert none["total"] == 0


def test_file_fallback_diff_never_uses_a_later_version(kusto_store):
    from aictl.dashboard.artifact_details import file_detail
    from aictl.dashboard.projections.history import HistoryScope

    history = HistoryScope(kusto_store.history_store.reader, "host-a", qualified=True)
    for ts in (100, 300):
        kusto_store.insert("file_write_events", node_id="host-a", path="/x", ts=ts, session_id="session")
    for node, ts, content in (("host-a", 90, "before"), ("host-a", 110, "selected"), ("host-a", 300, "later"),
                              ("host-b", 190, "other node")):
        kusto_store.insert("file_history", node_id=node, path="/x", ts=ts)
        kusto_store.insert("file_history_text", node_id=node, path="/x", ts=ts, content=content)
    _, data = file_detail(kusto_store, "/x", now=400.0, since=100, until=200, history=history)
    assert [edit["ts"] for edit in data["edits"]] == [100]
    assert data["diff_as_of"] == 110
    assert {line["text"] for line in data["diff"]} == {"before", "selected"}
    assert file_detail(kusto_store, "/x", now=400.0, since=120, until=200, history=history)[1]["diff"] is None


def test_flow_pid_links_use_current_sessions_in_the_same_project_and_node(kusto_store):
    for session, project_name, node in (
        ("active", "p", "host-a"), ("stale", "p", "host-a"),
        ("wrong-project", "other", "host-a"), ("wrong-node", "p", "host-b"),
    ):
        kusto_store.insert("sessions", session_id=session, project=project_name, node_id=node, started_at=100,
                           _v="2025-01-01T00:00:00Z")
        kusto_store.insert("session_processes", session_id=session, project="p", node_id="host-a", pid=42)
    kusto_store.insert("sessions", session_id="stale", project="p", node_id="host-a", started_at=300,
                       _v="2025-01-02T00:00:00Z")
    result = kusto_store.history_store.reader.read("sequence.pid_sessions", {
        "all_nodes": False, "requested_node": "host-a", "requested_pid": 42, "since": 100, "until": 200,
        "limit": 10,
    })
    assert [row["session_id"] for row in result.rows] == ["active"]


def test_scoped_drilldowns_and_search_pagination(history):
    from aictl.dashboard.history_scope import identity

    first = history.call("/sessions", q="shared prompt", limit=2)
    second = history.call("/sessions", q="shared prompt", limit=2, offset=2)
    assert first[0] == second[0] == 200, (first, second)
    rows = first[1]["rows"] + second[1]["rows"]
    assert first[1]["total"] == second[1]["total"] == len(rows) == 3
    # The finder sorts by last activity: host-b's newest request version is at ts 20000.
    assert [r["node_id"] for r in rows] == ["host-b", "legacy", "host-a"]
    assert first[1]["by_node"] == second[1]["by_node"] == [
        {"node_id": n, "sessions": 1} for n in ("host-a", "host-b", "legacy")
    ]
    assert len({r["id"] for r in rows}) == 3
    assert history.call("/sessions", tool="-")[1]["total"] == 0
    aid, sid = identity("host-b", "child"), identity("host-b", history.sid)
    assert history.call("/agent", id=aid)[1]["agent"]["parent_id"] == sid
    assert history.call("/agent", id=aid, scope="node", node_id="host-a")[0] == 400
    assert history.call("/agent", id="child")[0] == 400
    assert history.call("/agent", id=sid, scope="local")[0] == 400
    assert history.call("/agent/flow", id=aid)[1]["session_id"] == sid
    assert "shared prompt host-b" in json.dumps(history.call("/agent/transcript", id=aid)[1])
    assert history.call("/prompt", session_id=sid, ts=1600)[0] == 200
    _, evidence = history.call("/api/session-evidence", session_id=sid, step_key="step", agent_id=aid)
    assert evidence["rows"][0]["text"] == "node-b evidence"
    assert history.call("/excerpt", path="/shared/a.txt")[0] == 422


def test_context_machine_and_session_records_keep_colliding_paths_and_pids_separate(history, monkeypatch):
    from aictl.dashboard.history_scope import identity

    monkeypatch.setattr("aictl.dashboard.context_projection._file_sessions", lambda: pytest.fail("No local discovery"))
    for n, value in (("host-a", 7), ("host-b", 19)):
        history.add("files", n, "f", path="/s/memory.md", tool="copilot-cli", scope="global", category="memory",
                    tokens=value, size_bytes=100, content="private-body", meta='{"sent_to_llm":"yes","loaded_when":"every-call"}')
        history.add("tool_stats", n, "t", tool="copilot-cli", ts=100, input_tokens=value)
        history.add("system_snapshots", n, 100, ts=100, host_cpu_percent=value, daemon_pid=51)
        history.add("session_processes", n, 20, pid=20, session_id=history.sid, tool="copilot-cli", role=n)
    _, ctx = history.call("/context", now=800_000)
    parts = {r["node_id"]: r for r in ctx["nodes"]}
    assert {n: parts[n]["map"]["total"] for n in ("host-a", "host-b")} == {"host-a": 7, "host-b": 19}
    assert parts["host-a"]["telemetry"][0]["input"] == 7 and parts["host-b"]["telemetry"][0]["input"] == 19
    assert "private-body" not in json.dumps(ctx)
    assert [r["node_id"] for r in history.call("/context", scope="node", node_id="host-b", now=800_000)[1]["nodes"]] == ["host-b"]
    _, machine = history.call("/machine")
    assert {r["node_id"]: r["host_cpu_percent"] for r in machine["hosts"]} == {"host-a": 7, "host-b": 19}
    assert [(p["pid"], p["role"]) for p in machine["recorded_processes"]] == [(20, "host-a"), (20, "host-b")]
    for n in ("host-a", "host-b"):
        sid = identity(n, history.sid)
        assert [p["role"] for p in history.call("/session/records", session_id=sid, part="processes")[1]["processes"]] == [n]
        assert history.call("/session/records", scope="node", node_id="legacy", session_id=sid, part="events")[0] == 400
    assert history.call("/file", path="/s/memory.md")[0] == 400


def test_history_errors_do_not_become_empty_or_local(monkeypatch, kusto_store):
    from test_live_routes import handler

    from aictl.dashboard.history_board import serve
    from aictl.stores.base import StoreError

    def request(query, store=None):
        req = handler("/api/history/board?" + query)
        req.server.store = store
        serve(req, query)
        return req.status, json.loads(req.wfile.getvalue())

    assert request("scope=fleet")[0] == 422
    assert request("view=charts")[0] == 503
    for query_string in (
        "scope=other",
        "scope=node",
        "scope=fleet&node_id=host-a",
        "scope=node&node_id=%24",
        "scope=local&scope=fleet",
        "node_id=host-a",
    ):
        assert request(query_string)[0] == 400

    def failure(*_args):
        raise StoreError("timeout")

    monkeypatch.setattr(kusto_store.history_store.reader, "read", failure)
    status, body = request("scope=fleet", kusto_store)
    assert status == 503 and body["reason"] == "query_failed"


def _serve_board(store, query):
    from test_live_routes import handler

    from aictl.dashboard.history_board import serve

    req = handler("/api/history/board?" + query)
    req.server.store = store
    serve(req, query)
    return req.status, json.loads(req.wfile.getvalue())


def test_scoped_board_answers_without_a_failed_optional_section(history, kusto_store, monkeypatch):
    from test_contract import validate_detail

    from aictl.dashboard import board_projection
    from aictl.stores.base import StoreError

    def failing(*_args):
        raise StoreError("Kusto view board.changes failed: Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789")

    monkeypatch.setattr(board_projection, "_changes_section", failing)
    status, board = _serve_board(kusto_store, "scope=fleet&since=1000&until=2000&buckets=2")
    assert status == 200
    validate_detail("/api/history/board", board)
    reason = "Kusto view board.changes failed: Authorization: Bearer <redacted>"
    assert board["field_errors"] == {"changes": reason, "projects": reason}
    assert not {"changes", "projects"} & board.keys()
    assert board["kpis"]["tokens"] == 520 and len({r["id"] for r in board["prompts"]}) == 3


def test_scoped_board_still_fails_when_an_early_section_fails(history, kusto_store, monkeypatch):
    from aictl.dashboard import board_projection
    from aictl.stores.base import StoreError

    def failing(*_args):
        raise StoreError("Kusto view board.tools failed: timeout")

    monkeypatch.setattr(board_projection, "_tools_section", failing)
    status, body = _serve_board(kusto_store, "scope=fleet&since=1000&until=2000&buckets=2")
    assert status == 503 and body == {"error": "Kusto view board.tools failed: timeout", "reason": "query_failed"}


def test_incomplete_scoped_board_is_read_again_after_its_short_lifetime(history, kusto_store, monkeypatch):
    from aictl.dashboard import board_projection, history_board
    from aictl.stores.base import StoreError

    clock = [1000.0]
    monkeypatch.setattr(history_board, "time", SimpleNamespace(time=time.time, monotonic=lambda: clock[0]))
    real = board_projection._previous
    failing = [True]

    def previous(*args):
        if failing[0]:
            raise StoreError("Kusto view board.previous failed: timeout")
        return real(*args)

    monkeypatch.setattr(board_projection, "_previous", previous)
    query = "scope=fleet&since=1000&until=2000&buckets=2"
    _, first = _serve_board(kusto_store, query)
    assert first["field_errors"] == {"kpis.prev": "Kusto view board.previous failed: timeout"}
    assert "prev" not in first["kpis"]
    failing[0] = False
    clock[0] += history_board._INCOMPLETE_TTL_S - 1
    assert _serve_board(kusto_store, query)[1] == first
    # Past its short lifetime the incomplete answer is not served, even while a new read runs.
    clock[0] += 2
    _, second = _serve_board(kusto_store, query)
    assert "field_errors" not in second and "prev" in second["kpis"]
    # A complete answer keeps the route's usual lifetime.
    failing[0] = True
    clock[0] += 30
    assert _serve_board(kusto_store, query)[1] == second


def test_a_clock_following_scoped_board_is_not_read_again_for_every_new_window(history, kusto_store, monkeypatch):
    """A slow board asked for with a moving window was read once per window, several at a time."""
    from aictl.dashboard import history_board

    clock = [5000.0]
    reads = []

    def compute(_store, filters, *_args, **_kwargs):
        reads.append(filters.until)
        clock[0] += 50.0  # the read takes 50 s
        return {name: filters.until for name in history_board._PANEL_FIELDS}

    monkeypatch.setattr(history_board, "time", SimpleNamespace(time=time.time, monotonic=lambda: clock[0]))
    monkeypatch.setattr(history_board, "compute_board", compute)
    for name in ("_cache", "_inflight", "_latest"):
        monkeypatch.setattr(history_board, name, {})

    def board(until: float, now: float) -> float:
        query = f"scope=fleet&since={until - 7 * 86400}&until={until}&buckets=14"
        return json.loads(history_board.read_board(kusto_store, query, now))["range_marker"]

    monkeypatch.setattr(history_board, "_PANEL_FIELDS", ("range_marker",))
    now = 2_000_000_000.0
    assert board(now, now) == now and reads == [now]
    # The window moved on by a minute: the board read 50 s ago still answers, and nothing is read.
    clock[0] += 60
    assert board(now + 60, now + 60) == now and reads == [now]
    # Past the rest that follows a 50 s read (4 times its length), the new window is read.
    clock[0] += 50 * history_board._REST_FACTOR
    later = now + 60 + 50 * history_board._REST_FACTOR + 50
    assert board(later, later) == later and reads == [now, later]
    # A window chosen in the past is its own request and is read as asked.
    assert board(now - 86400, later) == now - 86400 and len(reads) == 3


def test_board_cli_reads_real_loopback_route_and_rejects_remote_settings_edits(tmp_path, monkeypatch, kusto_store):
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore

    monkeypatch.setenv("AICTL_NODE_ID", "My-Node")
    monkeypatch.setattr("aictl.dashboard.node_views.local_node_id", lambda: "my-node")
    db = kusto_store
    sid = 'same id &+ "'
    db.insert("sessions", node_id="my-node", session_id=sid, tool="cli", model="model-a", started_at=100)
    server = _DashboardHTTPServer(
        ("127.0.0.1", 0), _DashboardHandler,
        SnapshotStore(history_store=db.history_store, keeps_text=lambda: True), AllowedPaths(),
        tmp_path, start_ingesters_now=False
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    runner = CliRunner()

    def run(*args):
        return runner.invoke(main, ["board", *args, "--port", str(port), "--json"])

    try:
        identity = json.loads(run("identity").stdout)
        assert identity["local_node"] == {"node_id": "my-node", "source": "AICTL_NODE_ID"}
        settings = json.loads(run("settings").stdout)
        assert settings["rows"][0]["capture"] == db.capture
        overview = json.loads(run("overview", "--since", "0", "--until", "200").stdout)
        assert overview["sessions"][0]["session_id"] == sid
        assert json.loads(run("session", sid, "--node", "my-node").stdout)["rows"][0]["model"] == "model-a"
        result = run("settings", "--all-nodes")
        assert result.exit_code == 0
        assert json.loads(result.stdout)["rows"][0]["status"] == "unknown"
        for path, method in [("settings/file", "PUT"), ("board/action", "POST")]:
            req = urllib.request.Request(
                f"http://127.0.0.1:{port}/api/{path}?scope=node&node_id=host-b", method=method, data=b"{}"
            )
            with pytest.raises(urllib.error.HTTPError) as err:
                urllib.request.urlopen(req, timeout=5)
            assert err.value.code == 403
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/settings/file", method="PUT", data=b'{"node_id":"host-b","path":"not-local"}'
        )
        with pytest.raises(urllib.error.HTTPError) as err:
            urllib.request.urlopen(req, timeout=5)
        assert err.value.code == 403
    finally:
        server.shutdown()
        server.server_close()
        thread.join(2)
