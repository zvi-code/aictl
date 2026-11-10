"""Fresh-process proof that the SQLite server needs none of the Kusto extra."""

import subprocess
import sys


def test_sqlite_server_import_and_disabled_capabilities_without_kusto_dependencies():
    script = r"""
import importlib.abc
import sys
from pathlib import Path
from types import SimpleNamespace

class NoKusto(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        forbidden = ("azure", "sqlglot", "aictl.kusto.live_reader", "aictl.kusto.schema")
        if any(fullname == prefix or fullname.startswith(prefix + ".") for prefix in forbidden):
            raise ModuleNotFoundError("Kusto extra blocked: " + fullname)
        return None

sys.meta_path.insert(0, NoKusto())
from aictl.dashboard.web_server import ThreadingHTTPServer, _DashboardHandler, _DashboardHTTPServer
from aictl.orchestrator import AllowedPaths, SnapshotStore
from aictl.storage import HistoryDB

# No listening socket or collector is started.
ThreadingHTTPServer.__init__ = lambda self, *args, **kwargs: None
db = HistoryDB(db_path=":memory:", flush_interval=0)
try:
    store = SnapshotStore(db=db)
    server = _DashboardHTTPServer(
        ("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), Path.cwd(), start_ingesters_now=False
    )
    assert server.live_dashboard is None
    request = object.__new__(_DashboardHandler)
    request.path = "/api/live/capabilities"
    request.headers = {"Host": "localhost:8484"}
    request.client_address = ("127.0.0.1", 1)
    request.server = server
    result = []
    request._json_response = lambda value, **kwargs: result.append(value)
    request._do_GET()
    assert result[0]["enabled"] is False and result[0]["stream"] is None
    assert "sqlglot" not in sys.modules and "azure" not in sys.modules
    print("disabled")
finally:
    db.close()
"""
    result = subprocess.run([sys.executable, "-B", "-c", script], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "disabled"
