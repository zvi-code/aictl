import json
import threading
import urllib.error
import urllib.request
from types import SimpleNamespace

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
        req = urllib.request.Request(f"http://127.0.0.1:{port}/api/settings/file", method="PUT",
                                     data=b'{"node_id":"host-b","path":"not-local"}')
        with pytest.raises(urllib.error.HTTPError) as err:
            urllib.request.urlopen(req, timeout=5)
        assert err.value.code == 403
    finally:
        server.shutdown()
        server.server_close()
        thread.join(2)
        db.close()
