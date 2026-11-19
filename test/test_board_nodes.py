import json
import re
import threading
import urllib.error
import urllib.request
from types import SimpleNamespace
from typing import Any
from urllib.parse import urlencode

import pytest
from click.testing import CliRunner

from aictl.cli import main
from aictl.dashboard.node_views import NodeViewError, node_view
from aictl.kusto import KustoSettings


def project(**extra):
    return SimpleNamespace(
        _kusto=KustoSettings("https://cluster.example", node_id="host-a"), current_history=True, **extra
    )


def query(view, scope="local", **p):
    return {k: [v] for k, v in {"view": view, "scope": scope, **p}.items()}


def test_node_report_bounds_kusto_scan_concurrency_and_exposes_partial_memory_failures(monkeypatch):
    from azure.kusto.data.exceptions import KustoMultiApiError

    from aictl.kusto.connection import KustoClientFactory

    requests = []

    def execute(_db, _kql, props):
        requests.append(props)
        raise KustoMultiApiError([{"OneApiErrors": [{"error": {
            "code": "LowMemoryCondition", "message": "partial query failure", "@message": "E_LOW_MEMORY_CONDITION",
        }}]}])

    monkeypatch.setattr(KustoClientFactory, "client", lambda settings: SimpleNamespace(execute=execute))
    for view in ("nodes", "health"):
        with pytest.raises(NodeViewError, match="E_LOW_MEMORY_CONDITION") as err:
            node_view(project(), query(view, "fleet"))
        props = requests[-1]
        assert err.value.status == 503 and props.client_request_id in str(err.value)
        assert props.get_option("query_fanout_threads_percent", None) == 1
        assert props.get_option("max_memory_consumption_per_query_per_node", None) == 128 * 1024**2
        assert props.get_option("deferpartialqueryfailures", None) is False
    assert len({p.client_request_id for p in requests}) == 2


def test_fleet_discovery_and_health_do_not_substitute_the_serving_node():
    queries = []

    def read(_settings, kql):
        queries.append(kql)
        return [
            {"node_id": "host-b", "captured_at": 200, "cpu_percent": 0.0},
            {"node_id": "", "captured_at": None, "cpu_percent": None},
        ]

    nodes = node_view(project(), query("nodes"), read=read)
    assert [r["node_id"] for r in nodes["rows"]] == ["host-b", "legacy"]
    assert 'where node_id == "host-a"' not in queries[-1]
    health = node_view(
        project(),
        query("health", "fleet"),
        now=600,
        read=read,
        local_health=lambda: pytest.fail("Remote health requested local runtime"),
    )
    assert "local_runtime" not in health and "leftanti" in queries[-1]
    assert [(r["node_id"], r["status"], r["cpu_percent"]) for r in health["rows"]] == [
        ("host-b", "stale", 0),
        ("legacy", "unknown", None),
    ]
    assert health["shared_kusto"]["database"] == "aictl"
    settings = node_view(project(), query("settings", "node", node_id="host-b"), read=lambda *_: [])
    assert settings["rows"][0]["status"] == "unknown" and settings["rows"][0]["capture"] is None


def test_session_and_totals_use_node_qualified_keys_and_bound_session_identifiers():
    node_rows = {"host-a": "model-a", "host-b": "model-b"}
    sid = 'id " shared & +'

    def read(_settings, text):
        assert "by node_id, session_id" in text
        if "let grouped =" in text:
            assert "row_type='total'" in text
            return [
                {"row_type": "total", "sessions": 2, "requests": 9},
                *(
                    {"row_type": "session", "node_id": name, "session_id": sid, "model": model}
                    for name, model in node_rows.items()
                ),
            ]
        assert f"where session_id == {json.dumps(sid)}" in text
        name = next(key for key in node_rows if f'where node_id == "{key}"' in text)
        return [{"node_id": name, "session_id": sid, "model": node_rows[name]}]

    overview = node_view(project(), query("overview", "fleet"), read=read)
    assert overview["totals"]["sessions"] == 2 and len(overview["sessions"]) == 2
    for r in overview["sessions"]:
        q = query("session", "node", node_id=r["node_id"], session_id=r["session_id"])
        assert node_view(project(), q, read=read)["rows"][0]["model"] == node_rows[r["node_id"]]
    with pytest.raises(NodeViewError, match="both a named node"):
        node_view(project(), query("session", "fleet", session_id=sid), read=read)
    with pytest.raises(NodeViewError, match="earlier than until"):
        node_view(project(), query("overview", since="10", until="1"), read=read)


def test_health_sample_uses_only_current_process_counters_and_shared_resource_scope():
    def read(_settings, kql):
        assert 'column_ifexists("node_health_counters","")' in kql
        assert kql.index("arg_max(_v, *)") < kql.index("where not(_deleted)") < kql.index("arg_max(captured_at,")
        return [
            {"node_id": n, "captured_at": 600, "daemon_pid": 7,
             "counter_sample": json.dumps({"at": at, "pid": pid, "store": {"reads": {"total": 123}}})}
            for n, at, pid in (("current", 598, 7), ("old-process", 598, 6), ("stale", 100, 7))
        ]
    report = node_view(project(), query("health", "fleet"), now=600, read=read,
                       shared_health=lambda: {"capacity": {"available": 0, "total": 12},
                                              "table_inventory": {"tables": [{"name": "events", "rows": 200}]},
                                              "cluster_resources": {"native": {"nodes": 3}}, "quality": ["private"]})
    assert [r["client_sample"] is not None for r in report["rows"]] == [True, False, False]
    assert report["shared_kusto"]["capacity_available"] == 0
    assert report["shared_kusto"]["table_inventory"]["tables"][0]["rows"] == 200
    assert "private" not in json.dumps(report)


def test_historical_detail_prefilters_immutable_session_keys_before_current_winner():
    from aictl.dashboard.board_history import Read, Scope

    predicate = 'session_id in ("session-a")'
    text = Read.sessions("vscode_chat_messages", predicate).kql(Scope("node", "host-a"))
    assert text.index(predicate) < text.index("summarize arg_max")
    assert text.count(predicate) == 2
    assert "where ['node_id'] == \"host-a\"" in text
    mutable = Read.sessions("requests", predicate).kql(Scope("node", "host-a"))
    assert mutable.count(predicate) == 2 and mutable.rindex(predicate) > mutable.index("arg_max")
    compact = Read.sessions("requests", predicate, ("session_id",)).kql(Scope("fleet"))
    assert compact.index("['rowid'] in (") < compact.index("arg_max") < compact.rindex(predicate)
    assert "arg_max(['_v'], ['_deleted'], ['session_id'])" in compact
    text = Read.sessions("session_step_text", predicate).kql(Scope("node", "host-a"))
    assert text.index("['step_key'] in (") < text.index("arg_max") < text.rindex(predicate)


def test_history_retries_memory_limited_batch_without_using_partial_rows(monkeypatch):
    from azure.kusto.data.exceptions import KustoMultiApiError

    from aictl.dashboard.board_history import ScopeError, _batch
    from aictl.kusto.connection import KustoClientFactory

    calls = []

    def execute(_db, kql, props):
        assert props.get_option("query_fanout_threads_percent", None) == 1
        assert props.get_option("request_readonly_hardline", None) is True
        calls.append(kql)
        if ";\n" in kql or kql == "large":
            raise KustoMultiApiError([{"OneApiErrors": [{"error": {
                "code": "LowMemoryCondition", "message": "partial query failure", "@message": "E_LOW_MEMORY_CONDITION",
            }}]}])
        table = [[1]] if kql == "one" else [[2]]

        class Result(list):
            rows_count = 1
            columns = [SimpleNamespace(column_type="long")]

        return SimpleNamespace(errors_count=0, primary_results=[Result(table)])

    monkeypatch.setattr(KustoClientFactory, "client", lambda settings: SimpleNamespace(execute_query=execute))
    assert _batch(project()._kusto, ["one", "two"]) == [[(1,)], [(2,)]]
    assert calls == ["one;\ntwo", "one", "two"]
    with pytest.raises(ScopeError, match=r"memory budget \(aictl\.BoardHistory;") as err:
        _batch(project()._kusto, ["large"])
    assert err.value.status == 503


@pytest.fixture
def history(monkeypatch):
    from aictl.dashboard import board_api, board_history
    from aictl.kusto.schema import row_defaults, store_schema

    sid = "eaf2c622-9bed-4cf3-88af-f9ebac09b7de"
    records: dict[str, list[tuple[str, Any, int, bool, dict]]] = {}
    calls = []

    def add(table, node, key, version=1, deleted=False, **fields):
        data = {**row_defaults(store_schema()[table]), "node_id": node, **fields}
        records.setdefault(table, []).append((node, key, version, deleted, data))

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

    def batch(_settings, queries):
        calls.append(queries)
        result: list[list[tuple]] = []
        for kql in queries:
            match = re.match(r"\['(\w+)'\]", kql)
            assert match
            table = match[1]
            head, tail = kql.split(" | where ['_deleted'] == false", 1)
            partition = re.search(r"\['node_id'\] == (\"[^\"]*\")", head)
            chosen = json.loads(partition[1]) if partition else None
            if chosen is None:
                assert head.endswith(", ['node_id']"), kql
            if "ts between" in head:
                assert table == "process_snapshots" or ("where ['rowid'] in (" in head and " | project ['rowid'])" in head)
            winners: dict[tuple[str, Any], tuple[int, bool, dict]] = {}
            for node, key, version, deleted, row in records.get(table, []):
                if chosen is None or chosen == node:
                    old = winners.get((node, key))
                    if not old or old[0] < version:
                        winners[(node, key)] = (version, deleted, row)
            rows = [r for _, deleted, r in winners.values() if not deleted]
            if bounds := re.search(r"ts between \(([\d.]+) \.\. ([\d.]+)\)", tail):
                rows = [r for r in rows if float(bounds[1]) <= r["ts"] <= float(bounds[2])]
            if bounds := re.search(r"ts >= ([\d.]+) and ts < ([\d.]+)", tail):
                rows = [r for r in rows if float(bounds[1]) <= r["ts"] < float(bounds[2])]
            if value := re.search(r"agent_id == (\"[^\"]*\")", tail):
                rows = [r for r in rows if r.get("agent_id") == json.loads(value[1])]
            elif value := re.search(r"agent_id == (\"[^\"]*\")", head):
                if table == "agents":
                    rows = [r for r in rows if r.get("agent_id") == json.loads(value[1])]
            if " | distinct node_id, session_id" in tail:
                result.append(sorted({(r["node_id"], r["session_id"]) for r in rows}))
            elif " | project session_id" in tail or " | distinct session_id" in tail:
                result.append(sorted({(r["session_id"],) for r in rows}))
            else:
                columns = re.findall(r"\['(\w+)'\]", tail.split(" | project ")[-1])
                result.append([tuple(r[c] for c in columns) for r in rows])
        return result

    def no_local(*_args, **_kwargs):
        pytest.fail("Scoped history tried to access serving-node data")

    monkeypatch.setattr(board_history, "_batch", batch)
    monkeypatch.setattr(board_history, "_settings", lambda db: db._kusto)
    monkeypatch.setattr(board_history, "_cached", {})
    monkeypatch.setattr(board_history, "_boards", {})
    monkeypatch.setattr(board_history, "_aux_cache", {"machine": {}, "context": {}})
    for fn in ("_prompt_files_on_disk", "_skill_file", "_self_usage", "project_root"):
        monkeypatch.setattr(board_api, fn, no_local)
    monkeypatch.setattr("aictl.dashboard.session_record._stat", no_local)
    monkeypatch.setattr("aictl.dashboard.session_record.PR_FINDER.lookup", no_local)
    db = project(_conn=no_local)

    def call(endpoint="", now=4000, **params):
        path = endpoint if endpoint.startswith("/api/") else "/api/board" + endpoint
        status, body = board_api.handle_get(path, urlencode({"scope": "fleet"} | params), db, None, now=now)
        return status, json.loads(body)

    yield SimpleNamespace(call=call, sid=sid, calls=calls, add=add)
    for _, projection in board_history._cached.values():
        projection.conn.close()


def test_fleet_board_aggregates_winners_once_and_reuses_history(history):
    status, board = history.call(since=1000, until=2000, buckets=2)
    assert status == 200 and len(history.calls) == 3
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
    by_node = {r["node_id"]: r for r in board["by_node"]}
    assert {node: r["tokens"] for node, r in by_node.items()} == {"host-a": 100, "host-b": 400, "legacy": 20}
    for metric, kpi in (("calls", "tool_calls"), ("messages", "messages"), ("tokens", "tokens"), ("tool_errors", "failures")):
        assert sum(r[metric] for r in by_node.values()) == board["kpis"][kpi]
    assert board["processes"] == [] and board["self"] is None and board["settings_at"] is None
    assert history.call(since=1000, until=2000, buckets=2)[1] == board
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
    assert len(history.calls) == 3
    _, brushed = history.call(since=1580, until=1660, buckets=2)
    assert brushed["kpis"]["tokens"] == 400 and len(history.calls) == 3
    _, legacy = history.call(scope="node", node_id="legacy", since=1000, until=2000)
    assert {r["node_id"] for r in legacy["agents"]} == {"legacy"}
    status, empty = history.call(scope="node", node_id="not-reported", since=1000, until=2000)
    assert status == 200 and not empty["agents"] and empty["kpis"]["tokens"] == 0


def test_wide_board_retains_only_current_facts_and_reuses_projection(history, monkeypatch):
    from aictl.dashboard import board_history

    monkeypatch.setattr(board_history, "TIMED_READ_S", 400)
    _, board = history.call(since=1000, until=2000, buckets=2)
    assert board["kpis"]["tokens"] == 520
    assert board["kpis"]["tool_calls"] == 6
    assert any("ts < " in stmt for group in history.calls for stmt in group)
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


def test_file_fallback_diff_never_uses_a_later_version():
    from aictl.dashboard.board_api import file_detail
    from aictl.dashboard.board_history import HistoryProjection, Read, Scope

    scope = Scope("node", "host-a")
    db = HistoryProjection(scope)
    try:
        db.load(Read("file_write_events", cols=("path", "ts", "session_id", "detail", "source_event_id")),
                [("host-a", "/x", 100, "session", "{}", ""), ("host-a", "/x", 300, "session", "{}", "")], scope)
        db.load(Read("file_history", cols=("path", "ts", "content", "blob_hash")),
                [("host-a", "/x", 90, "before", ""), ("host-a", "/x", 110, "selected", ""),
                 ("host-a", "/x", 300, "later", "")], scope)
        _, data = file_detail(db, "/x", since=100, until=200)
        assert [edit["ts"] for edit in data["edits"]] == [100]
        assert data["diff_as_of"] == 110
        assert {line["text"] for line in data["diff"]} == {"before", "selected"}
        assert file_detail(db, "/x", since=120, until=200)[1]["diff"] is None
    finally:
        db.conn.close()


def test_scoped_drilldowns_and_search_pagination(history):
    from aictl.dashboard.board_history import identity

    first = history.call("/sessions", q="shared prompt", limit=2)
    second = history.call("/sessions", q="shared prompt", limit=2, offset=2)
    assert first[0] == second[0] == 200
    rows = first[1]["rows"] + second[1]["rows"]
    assert first[1]["total"] == second[1]["total"] == len(rows) == 3
    assert [r["node_id"] for r in rows] == ["legacy", "host-b", "host-a"]
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
    from aictl.dashboard.board_history import identity

    monkeypatch.setattr("aictl.dashboard.board_api._file_sessions", lambda: pytest.fail("No local discovery"))
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


def test_history_errors_do_not_become_empty_or_local(monkeypatch):
    from aictl.dashboard import board_api, board_history
    from aictl.kusto.observations import UnresolvedObservationsError

    db = SimpleNamespace(_conn=lambda: pytest.fail("Must not fall back"))
    assert board_api.handle_get("/api/board", "scope=fleet", db, None)[0] == 422
    for query_string in (
        "scope=other",
        "scope=node",
        "scope=fleet&node_id=host-a",
        "scope=node&node_id=%24",
        "scope=local&scope=fleet",
        "node_id=host-a",
    ):
        assert board_api.handle_get("/api/board", query_string, db, None)[0] == 400

    def unresolved(_db):
        raise UnresolvedObservationsError(("requests",))

    monkeypatch.setattr(board_history, "_settings", unresolved)
    with pytest.raises(UnresolvedObservationsError):
        board_api.handle_get("/api/board", "scope=fleet", project(), None)

    def failure(_db):
        raise TimeoutError

    monkeypatch.setattr(board_history, "_settings", failure)
    status, body = board_api.handle_get("/api/board", "scope=fleet", project(), None)
    assert status == 503 and json.loads(body)["reason"] == "query_failed"


def test_board_cli_reads_real_loopback_route_and_rejects_remote_settings_edits(tmp_path, monkeypatch):
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore
    from aictl.storage import HistoryDB, SessionRow

    monkeypatch.setenv("AICTL_NODE_ID", "My-Node")
    db = HistoryDB(tmp_path / "store.db", flush_interval=0)
    sid = 'same id &+ "'
    db.upsert_session(SessionRow(session_id=sid, tool="cli", model="model-a", started_at=100))
    server = _DashboardHTTPServer(
        ("127.0.0.1", 0), _DashboardHandler, SnapshotStore(db=db), AllowedPaths(), tmp_path, start_ingesters_now=False
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
        assert result.exit_code != 0 and "shared Kusto" in result.output
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
        db.close()
