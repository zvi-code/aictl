"""The server does not load the Kusto SDK when no history store is selected."""

import subprocess
import sys


def test_server_without_a_store_exposes_live_runtime_without_kusto_dependencies():
    script = r"""
import importlib.abc
import sys
from pathlib import Path

class NoKusto(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        forbidden = ("azure", "aictl.stores.kusto.live_reader", "aictl.stores.kusto.schema")
        if fullname.startswith(("_sqlite", "sqlite")) or any(
            fullname == prefix or fullname.startswith(prefix + ".") for prefix in forbidden
        ):
            raise ModuleNotFoundError("Kusto SDK or plugin module blocked: " + fullname)
        return None

sys.meta_path.insert(0, NoKusto())
from aictl.dashboard.web_server import ThreadingHTTPServer, _DashboardHandler, _DashboardHTTPServer
from aictl.orchestrator import AllowedPaths, SnapshotStore

# No listening socket or collector is started.
ThreadingHTTPServer.__init__ = lambda self, *args, **kwargs: None
store = SnapshotStore()
server = _DashboardHTTPServer(
    ("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), Path.cwd(), start_ingesters_now=False
)
assert server.live_dashboard is not None
request = object.__new__(_DashboardHandler)
request.path = "/api/live/capabilities"
request.headers = {"Host": "localhost:8484"}
request.client_address = ("127.0.0.1", 1)
request.server = server
result = []
request._json_response = lambda value, **kwargs: result.append(value)
request._do_GET()
assert result[0]["enabled"] is True and result[0]["stream"] is not None
assert "azure" not in sys.modules
print("disabled")
"""
    result = subprocess.run([sys.executable, "-B", "-c", script], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "disabled"
