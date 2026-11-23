"""Phase S acceptance probe. Run the daemon with both SQLite modules blocked."""

import gzip
import http.client
import json
import logging
import os
import socket
import subprocess
import sys
import threading
import time
import traceback
from functools import partial
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import urlsplit

RECORDINGS = Path(__file__).parent / "recordings"
_TRIM_TIME = 1780000000
_INGESTERS = {
    "copilot-session-store",
    "cursor-conversations",
    "vscode-chat-logs",
    "transcript-usage",
    "session-artifacts",
}


def test_daemon_and_cli_without_sqlite(tmp_path):
    env = {k: v for k, v in os.environ.items() if not k.startswith("AICTL_")}
    env["PYTHONPATH"] = str(Path(__file__).resolve().parents[1] / "src")
    result = subprocess.run(
        [sys.executable, "-u", str(Path(__file__).resolve()), str(tmp_path)],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=230,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def _dashboard_requests(root):
    from aictl.dashboard.web_server import GET_ROUTES, POST_ROUTES, PUT_ROUTES, _route_key

    removed = {
        "/api/board", "/api/budget", "/api/history", "/api/self-status", "/api/board/health",
        "/api/snapshot", "/api/stream",
    }
    recorded = {}
    for tape in (RECORDINGS / "quiet" / "isolated-rest.jsonl.gz", RECORDINGS / "supplemental-main-rest.jsonl.gz"):
        with gzip.open(tape, "rt", encoding="utf-8") as file:
            for record in map(json.loads, file):
                recorded[_route_key(urlsplit(record["path"]).path)] = record["path"]
    asset = next((root / "src" / "aictl" / "dashboard" / "dist" / "assets").glob("*.js"), None)
    reads = {
        "/": "/",
        "/assets/{name}": "/assets/" + (asset.name if asset else "no-sqlite-probe.js"),
        "/api/live/capabilities": "/api/live/capabilities",
        "/api/live/stream": "/api/live/stream?history=1",
        "/api/history/board": "/api/history/board?since=1795130000&until=1795135200&view=charts",
        "/api/copilot-sessions": "/api/copilot-sessions",
        "/api/copilot-sessions/{id}": "/api/copilot-sessions/capture-missing-session",
        "/api/board/nodes": "/api/board/nodes?view=health&scope=fleet",
        "/api/board/machine": "/api/board/machine?scope=fleet",
        "/api/board/agent/kql": "/api/board/agent/kql",
        "/api/board/terminal/events": "/api/board/terminal/events",
        "/api/board/terminal/file": "/api/board/terminal/file",
        "/api/board/terminal/metrics": "/api/board/terminal/metrics",
        "/api/board/terminal/resources": "/api/board/terminal/resources",
        "/api/board/terminal/sessions": "/api/board/terminal/sessions",
        "/api/datapoints": "/api/datapoints",
        "/api/query-timings": "/api/query-timings",
        "/api/board/mcp": "/api/board/mcp?since=1795130000&until=1795135200",
        "/api/board/mcp/server": "/api/board/mcp/server?id=mcp:github&since=1795130000&until=1795135200",
        "/api/board/convergence": "/api/board/convergence?since=1795130000&until=1795135200",
        **{route: f"{route}?since=1795130000&until=1795135200" for route in (
            "/api/board/insights/pause", "/api/board/insights/carry", "/api/board/insights/subagents",
            "/api/board/insights/failures", "/api/board/insights/rereads", "/api/board/insights/time",
            "/api/board/insights/context", "/api/board/insights/orientation", "/api/board/insights/fixed",
            "/api/board/insights/problems",
            "/api/board/insights/autonomy",
            "/api/board/insights/verified",
        )},
        "/api/board/session/convergence": "/api/board/session/convergence?session_id=no-sqlite-probe",
        "/api/board/memory/diff": "/api/board/memory/diff?first=no-sqlite-probe",
        "/api/board/memory/versions": "/api/board/memory/versions?path=/no-sqlite-probe/CLAUDE.md",
        "/api/board/agent/recalls": "/api/board/agent/recalls?id=no-sqlite-probe",
        "/api/board/agent/checkpoint/files": "/api/board/agent/checkpoint/files?id=no-sqlite-probe&message_id=u-1",
        **{route: recorded[route] for route in (
            "/api/api-calls", "/api/board/agent", "/api/board/agent/flow", "/api/board/agent/transcript",
            "/api/board/context", "/api/board/error", "/api/board/excerpt", "/api/board/file",
            "/api/board/prompt", "/api/board/session/records", "/api/board/sessions", "/api/board/skill",
            "/api/board/tool", "/api/context-audit", "/api/copilot-sessions/{id}/artifact",
            "/api/copilot-sessions/{id}/artifacts", "/api/effective-models", "/api/events",
            "/api/events/count", "/api/file", "/api/hooks-status", "/api/otel-status", "/api/samples",
            "/api/session-commits", "/api/session-evidence", "/api/session-mcp-usage",
            "/api/session-processes", "/api/session-stats", "/api/settings/file", "/api/settings/files",
            "/api/settings/tools", "/api/tool-config/{tool}",
        )},
    }
    posts = {"/api/hooks", "/api/session-kill", "/api/board/action", "/v1/metrics", "/v1/logs", "/v1/traces"}
    puts = {"/api/tool-config/{tool}": "/api/tool-config/copilot-cli", "/api/settings/file": "/api/settings/file"}
    assert reads.keys() == GET_ROUTES.keys()
    assert posts == POST_ROUTES.keys()
    assert puts.keys() == PUT_ROUTES.keys()
    for path in reads.values():
        yield "GET", path
    yield "GET", "/api/history/board?since=1795130000&until=1795135200&scope=fleet"
    for view in ("identity", "overview", "nodes", "runtime", "settings"):
        yield "GET", f"/api/board/nodes?view={view}&scope={'local' if view == 'identity' else 'fleet'}"
    yield from (("POST", path) for path in sorted(posts))
    yield from (("PUT", path) for path in puts.values())
    for path in sorted(removed):
        yield "ABSENT", path


def _request(port, method, path):
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=15)
    try:
        if method == "ABSENT":
            connection.request("GET", path)
            assert connection.getresponse().status == 404, path
            return
        headers = {"Content-Type": "application/json"} if method != "GET" else {}
        connection.request(method, path, body="{}" if headers else None, headers=headers)
        response = connection.getresponse()
        assert response.status < 500, f"HTTP {response.status}: {response.read(300)!r}"
        route = urlsplit(path).path
        if route == "/api/live/stream":
            assert response.status == 200 and "text/event-stream" in response.getheader("Content-Type", "")
            lines = []
            while line := response.readline(65_536).strip():
                lines.append(line)
                if line.startswith(b"data:"):
                    break
            assert any(line.startswith(b"data:") for line in lines), "No initial SSE frame"
            assert b"event: bootstrap" in lines, "No live bootstrap event"
        elif method == "GET" and route in ("/", "/api/live/capabilities", "/api/history/board"):
            assert response.status == 200, f"HTTP {response.status}"
    finally:
        connection.close()


def _supplement_replay(client, settings):
    """Supply offline responses for the native store paths added after the recording."""
    from datetime import datetime, timezone

    from aictl.kusto import report
    from aictl.kusto.observations import CURRENT_STORE, LAYOUT_QUERY
    from aictl.stores.kusto.client import kql_literal, quote
    from aictl.stores.kusto.maintenance import TRIM_TIMESTAMPS
    from aictl.stores.kusto.reader import _VIEWS, _query
    from aictl.stores.kusto.recorded import RecordedKustoClient, _Table
    from aictl.stores.kusto.schema import LEGACY_COLUMNS
    from aictl.stores.kusto.tables import TABLES

    client._responses.update(RecordedKustoClient(RECORDINGS / "r1-kusto.jsonl.gz")._responses)

    def response(kind, text, columns=(), rows=(), *, replace=False):
        key = (kind, text)
        if replace:
            client._responses[key].clear()
        if not client._responses[key]:
            client._responses[key].append({
                "outcome": "ok",
                "response": [{"columns": [{"name": name, "type": typ} for name, typ in columns], "rows": rows}],
            })

    # A database with node tables (stores/kusto/nodes.py): this node's tables, the shared registry and
    # marker, and a stored function per logical table.
    from aictl.stores.kusto import layout
    from aictl.stores.kusto import nodes as N
    from aictl.stores.kusto.schema import _FUNCTIONS_QUERY, _POLICY_QUERY
    from aictl.stores.kusto.schema import LAYOUT_QUERY as STORED_LAYOUT_QUERY

    logical = [name for name in TABLES if not name.endswith("_observations") and name not in N.SHARED_TABLES]
    mine = {name: N.physical(name, N.node_key(settings.node_id)) for name in logical}
    names = [*mine.values(), "schema_version", CURRENT_STORE]
    response("command", LAYOUT_QUERY, [("DatabaseName", "string"), ("TableName", "string")],
             [[settings.database, name] for name in [*names, *logical]], replace=True)
    columns_of = {**{mine[n]: n for n in logical}, "schema_version": "schema_version"}
    response(
        "command", ".show database schema | project TableName, ColumnName, ColumnType",
        [(name, "string") for name in ("TableName", "ColumnName", "ColumnType")],
        [[name, column, kind] for name, source in columns_of.items()
         for column, kind in (*TABLES[source].columns, *LEGACY_COLUMNS.get(source, ()))],
    )
    response(
        "command", _POLICY_QUERY,
        [("TableName", "string"), ("TotalRowCount", "long"), ("RetentionPolicy", "dynamic"),
         ("StreamingIngestionPolicy", "dynamic"), ("DocString", "string")],
        [[name, 0, {"SoftDeletePeriod": TABLES[source].retention_timespan}, {"IsEnabled": True},
          N.table_docstring(settings.node_id, N.node_key(settings.node_id), source)]
         for name, source in columns_of.items()],
    )
    response("command", _FUNCTIONS_QUERY, [("Name", "string"), ("Body", "string")], [])
    # The stored layout: this build's, so the store opens without a migration or a reset.
    response("query", STORED_LAYOUT_QUERY,
             [(c, "string") for c in ("kind", "node_id", "version", "compatible_since", "data_epoch",
                                      "aictl_version", "written_at", "step", "detail")],
             [["database", "", layout.LAYOUT_VERSION, layout.NODE_TABLES_SINCE, "recorded-epoch", "0.test",
               "2026-11-23T00:00:00Z", "node_tables", "node tables"],
              ["layout", settings.node_id, layout.LAYOUT_VERSION, layout.COMPATIBLE_SINCE, "recorded-epoch",
               "0.test", "2026-11-23T00:00:00Z", "", "new"]])
    response("command", f".drop tables ({', '.join(quote(name) for name in sorted(mine.values()))}) ifexists")
    response("command", ".show tables details | project TableName, TotalExtents, TotalRowCount, TotalExtentSize",
             [("TableName", "string"), ("TotalExtents", "long"), ("TotalRowCount", "long"),
              ("TotalExtentSize", "long")], [[mine["sessions"], 0, 0, 0]])
    response(
        "command",
        ".show tables details | project TableName, TotalRowCount, TotalExtents, TotalExtentSize, "
        "TotalOriginalSize, HotExtentSize, RetentionPolicy | top 513 by TableName asc",
        [("TableName", "string"), ("RetentionPolicy", "dynamic")],
        [[mine["sessions"], {"SoftDeletePeriod": "30.00:00:00"}]],
    )
    for name in [*logical, *mine.values()]:
        response("command", f".clear table {quote(name)} data")
    node = kql_literal(settings.node_id, "string")
    instant = kql_literal(datetime.fromtimestamp(_TRIM_TIME, timezone.utc), "datetime")
    for name, (column, kind) in TRIM_TIMESTAMPS.items():
        cutoff = instant if kind == "datetime" else kql_literal(_TRIM_TIME, "real")
        age = f"{column} < {cutoff}"
        if column != "_v":
            age += f" or (isnull({column}) and _v < {instant})"
        table = quote(mine.get(name, name))
        response("command", f".delete table {table} records with (whatif=true) <| {table}"
                            f" | where node_id == {node} | where {age}")
    # Writes whose text carries a fresh epoch or time (the registry, the functions a start
    # regenerates, a reset's new tables) are answered, not replayed.
    execute_mgmt = client.execute_mgmt
    written = (".set-or-append ['schema_version']", ".create-or-alter function", ".drop function",
               ".alter table ", ".alter tables ", ".create-merge tables ")

    def mgmt(database, text, properties=None):
        if text.startswith(written) and not client._responses.get(("command", text)):
            return SimpleNamespace(primary_results=[])
        return execute_mgmt(database, text, properties)

    client.execute_mgmt = mgmt
    # Ungrouped summaries return one row even when their source is empty.
    for view, columns, rows in (
        ("events.count", [("count", "long")], [[0]]),
        ("sessions.first_activity", [("first_ts", "real")], [[None]]),
        ("sequence.stamp", [("versions", "long"), ("newest", "datetime"), ("in_window", "long")], [[0, None, 0]]),
        ("runtime.processes", [("row_type", "string"), ("total", "long")], [["total", 0]]),
        ("tools.detail", [("row_type", "string"), ("total", "long")], [["count", 0]]),
        ("skills.detail",
         [("row_type", "string"), ("uses", "long"), ("agents", "long"), ("total", "long"),
          ("first_ts", "real"), ("last_ts", "real"), ("projects", "dynamic")],
         [["all", None, None, 0, None, None, []], ["counts", 0, 0, None, None, None, None]]),
    ):
        response("query", _query(view), columns, rows)
    for view in _VIEWS:
        response("query", _query(view))
    for section in report.SECTIONS:
        response("query", report.parameterized(report.read_query(section), None, None))

    execute_query = client.execute_query
    mode_queries = {_query(view) for view in ("skills.detail", "tools.detail")}

    def query(database, text, properties=None):
        if text in mode_queries and properties is not None:
            if properties.get_parameter("query_mode", "detail") not in {"detail", '"detail"'}:
                # Kusto answers an empty result with an empty table, which a paged view requires.
                return SimpleNamespace(primary_results=[_Table((), [])])
        return execute_query(database, text, properties)

    client.execute_query = query


def _probe(root, state):
    # Keep both the daemon and its tool inputs separate from the user's state.
    inputs = state / "profile"
    inputs.mkdir()
    store_dir = state / "store"
    store_dir.mkdir()
    os.environ.update(
        {
            name: str(inputs)
            for name in (
                "HOME",
                "USERPROFILE",
                "APPDATA",
                "LOCALAPPDATA",
                "XDG_CONFIG_HOME",
                "XDG_DATA_HOME",
                "XDG_STATE_HOME",
                "COPILOT_HOME",
                "CODEX_HOME",
                "CLAUDE_CONFIG_DIR",
            )
        }
    )
    os.environ.update(
        AICTL_KUSTO_CLUSTER="https://recording.invalid",
        AICTL_KUSTO_DATABASE="aictl_perf_test",
        AICTL_CAPTURE="metadata",
        AICTL_KUSTO_AUTH="none",
    )
    (inputs / "session-state").mkdir()

    creation_attempts = set()

    def audit(event, args):
        if event == "socket.connect" and args[0].family in (socket.AF_INET, socket.AF_INET6):
            assert args[1][0] in ("127.0.0.1", "::1"), "The probe must use the recorded Kusto client"
        if event == "open" and isinstance(args[0], (bytes, str)) and args[2] & os.O_CREAT:
            path = Path(os.fsdecode(args[0])).absolute()
            if path.is_relative_to(store_dir) and _sqlite_name(path):
                creation_attempts.add(str(path))

    sys.addaudithook(audit)
    from aictl import platforms
    from aictl.kusto import KustoSettings
    from aictl.stores.kusto.client import KustoClientFactory
    from aictl.stores.kusto.writer import KustoWriter

    platforms.config_dir = lambda: store_dir

    def writer_failure(client):
        settings = KustoSettings.from_env()
        assert settings is not None
        assert KustoClientFactory.client(settings) is client
        writer = KustoWriter(KustoClientFactory.native_ingester(settings), node_id=settings.node_id)
        client.ingest_error = RuntimeError("forced B6 ingestion failure")
        try:
            writer.upsert("files", [{"project": "", "path": "b6"}])
            writer.flush()
            health = writer.health()["tables"]["files"]
            assert health["queue_depth"] == 1 and health["last_error"] == "forced B6 ingestion failure"
        finally:
            writer.close()
            client.ingest_error = None

    errors = []

    def step(name, work, *args):
        print(f"B6: {name}", flush=True)
        try:
            return work(*args)
        except Exception as exc:
            errors.append(name)
            print(f"B6 failure [{name}]: {type(exc).__name__}: {exc}", flush=True)
            traceback.print_exc()
            return None

    def cli(args):
        from click.testing import CliRunner

        from aictl.cli import main

        with patch("aictl.commands.admin.time", SimpleNamespace(time=lambda: _TRIM_TIME)):
            result = CliRunner().invoke(main, ["db", *args], input="y\n")
        if result.exception and not isinstance(result.exception, SystemExit):
            raise result.exception
        assert result.exit_code == 0, result.output

    with KustoClientFactory.replay(RECORDINGS / "quiet" / "kusto.jsonl.gz") as client:
        _supplement_replay(client, KustoSettings.from_env())
        writer_failure(client)
        step("daemon, collector cycles, dashboard and live stream", _exercise_daemon, root, inputs, store_dir, step)
        for args in (
            ["trim-text", "--dry-run"],
            ["stats"],
            ["schema"],
            ["reset", "--yes"],
            ["report", "--out", str(store_dir / "report.html")],
        ):
            step(f"db {args[0]}", cli, args)

    sqlite_files = set(creation_attempts)
    for path in store_dir.rglob("*"):
        if path.is_file():
            with path.open("rb") as file:
                if _sqlite_name(path) or file.read(16) == b"SQLite format 3\x00":
                    sqlite_files.add(str(path))
    if sqlite_files:
        errors.append("SQLite files in state directory")
        print(f"B6 failure [SQLite files in state directory]: {sorted(sqlite_files)}", flush=True)
    if errors:
        print("B6 failed steps: " + "; ".join(errors), flush=True)
        return 1
    return 0


def _sqlite_name(path):
    name = path.name.lower()
    return name.endswith((".sqlite", ".sqlite3", ".db", "-wal", "-shm", "-journal"))


def _exercise_daemon(root, inputs, store_dir, step):
    from aictl import orchestrator
    from aictl.dashboard import ingester_runner, web_server
    from aictl.monitoring import config as monitor_config
    from aictl.monitoring import runtime

    orchestrator._kill_stale_server = lambda _port: None
    monitor_config.default_state_paths = lambda _root: (inputs,)
    copilot = inputs / "session-store.db"
    cursor = inputs / "conversations.db"
    copilot.touch()
    cursor.touch()
    vscode = inputs / "vscode-logs"
    vscode.mkdir()
    ingester_runner.TranscriptUsageIngester = partial(
        ingester_runner.TranscriptUsageIngester,
        claude_projects=inputs / "projects",
        codex_sessions=inputs / "sessions",
        copilot_state=inputs / "session-state",
        vscode_workspaces=vscode,
    )
    ingester_runner.default_db_path = lambda: copilot
    ingester_runner.CURSOR_DEFAULT_DB_PATH = cursor
    ingester_runner.vscode_chat_default_log_dir = lambda: vscode

    monitors, cycles, handles, servers, daemon_errors = set(), set(), {}, [], []
    build = runtime.build_collectors
    start = ingester_runner.start_ingesters

    def build_collectors(config):
        collectors = build(config)
        for collector in collectors:
            label = collector.name
            monitors.add(label)
            original_sleep = collector.sleep_paced
            original_status = collector.report_status

            async def paced(interval, name=label, sleep=original_sleep):
                cycles.add(name)
                await sleep(interval)

            async def reported(*, status, mode, detail, name=label, report=original_status):
                await report(status=status, mode=mode, detail=detail)
                if status == "unavailable" or name in {"network:macos-bpf", "filesystem:watchdog"}:
                    cycles.add(name)

            collector.sleep_paced = paced
            collector.report_status = reported
        return collectors

    def start_ingesters(store):
        result = start(store)
        handles.update(result)
        return result

    runtime.build_collectors = build_collectors
    ingester_runner.start_ingesters = start_ingesters

    class ObservedServer(web_server._DashboardHTTPServer):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            servers.append(self)

    web_server._DashboardHTTPServer = ObservedServer

    def daemon():
        try:
            orchestrator.start_server(inputs / "workspace", port=0, open_browser=False)
        except Exception as exc:
            daemon_errors.append(exc)
            traceback.print_exc()

    def wait_for(check, reason, *, timeout=30):
        deadline = time.monotonic() + timeout
        while not check() and not daemon_errors and time.monotonic() < deadline:
            time.sleep(0.05)
        if daemon_errors:
            raise daemon_errors[0]
        assert check(), reason()

    (inputs / "workspace").mkdir()
    worker = threading.Thread(target=daemon, name="B6-daemon", daemon=True)
    worker.start()
    try:
        wait_for(lambda: servers and servers[0].ready.is_set(), lambda: "Daemon did not start", timeout=100)
        for method, path in _dashboard_requests(root):
            step(f"{method} {path}", _request, servers[0].server_port, method, path)

        def collector_cycles():
            def ingester_finished(name):
                handle = handles.get(name)
                if handle is None:
                    return False
                status = handle.status()
                return status.get("last_success_at") or (
                    "unavailable: Python sqlite3 module missing" in json.dumps(status, default=str)
                )

            wait_for(lambda: monitors and cycles >= monitors, lambda: f"Monitor cycles missing: {monitors - cycles}")
            wait_for(
                lambda: all(map(ingester_finished, _INGESTERS)),
                lambda: f"Ingester cycles missing: {sorted(n for n in _INGESTERS if not ingester_finished(n))}",
            )

        step("collector cycles", collector_cycles)
    finally:
        # Reset runs next. No ingester or daemon shutdown flush should still be
        # writing restart files (deleting an open file also fails on Windows).
        for handle in handles.values():
            handle.stop_event.set()
        if servers:
            servers[0].shutdown()
        worker.join(timeout=30)
        assert not worker.is_alive(), "The B6 daemon did not finish shutting down"
        for handle in handles.values():
            if handle.thread is not None:
                handle.thread.join(timeout=5)
                assert not handle.thread.is_alive(), f"Ingester {handle.name} did not stop"


if __name__ == "__main__":
    sys.modules["sqlite3"] = None
    sys.modules["_sqlite3"] = None
    logging.basicConfig(level=logging.INFO)
    raise SystemExit(_probe(Path(__file__).resolve().parents[1], Path(sys.argv[1])))
