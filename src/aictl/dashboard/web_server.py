# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Dashboard HTTP server startup and route dispatch."""

from __future__ import annotations

import json
import queue
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from ..orchestrator import AllowedPaths, SnapshotStore
from ..platforms import IS_WINDOWS
from ..sink import OtelMetricGate
from .board_routes import BoardRoutes
from .http_assets import AssetRoutes
from .http_request import RequestMethods, _local_request
from .http_response import ResponseMethods
from .ingest_http import IngestRoutes
from .live import stream as live_stream
from .metrics_routes import MetricsRoutes
from .otel_receiver import OtelReceiver
from .runtime_health import live_health_and_machine, node_runtime_sample
from .session_routes import SessionRoutes
from .settings_routes import SettingsRoutes

# These read whole conversations or any project, so they answer this machine only.
_LOCAL_ONLY_ROUTES = ("/api/copilot-sessions", "/api/session-evidence", "/api/context-audit", "/api/effective-models", "/api/board/", "/api/history/board", "/api/live", "/api/settings/file", "/api/settings/tools")

_SCOPED_BOARD_ROUTES = frozenset({
    "/api/board/agent", "/api/board/agent/flow", "/api/board/agent/transcript",
    "/api/board/context", "/api/board/error", "/api/board/file", "/api/board/machine",
    "/api/board/prompt", "/api/board/session/records", "/api/board/sessions",
    "/api/board/skill", "/api/board/tool", "/api/session-evidence",
    "/api/board/mcp", "/api/board/mcp/server", "/api/board/convergence", "/api/board/session/convergence",
})

GET_ROUTES = {
    "/": "_serve_html",
    "/assets/{name}": "_serve_static",
    "/api/file": "_serve_file",
    "/api/live/capabilities": "capabilities",
    "/api/live/stream": "stream",
    "/api/history/board": "history_board",
    "/api/copilot-sessions": "_serve_copilot_sessions",
    "/api/copilot-sessions/{id}": "_serve_copilot_sessions",
    "/api/copilot-sessions/{id}/artifacts": "_serve_copilot_sessions",
    "/api/copilot-sessions/{id}/artifact": "_serve_copilot_sessions",
    "/api/effective-models": "_serve_effective_models",
    "/api/session-evidence": "_serve_session_evidence",
    "/api/board/nodes": "_serve_board_nodes",
    "/api/board/context": "_serve_board_context",
    "/api/board/agent/kql": "_serve_board_agent_kql",
    "/api/board/agent/flow": "_serve_board_agent_flow",
    "/api/board/agent/transcript": "_serve_board_agent_transcript",
    **dict.fromkeys((
        "/api/board/agent", "/api/board/error", "/api/board/excerpt", "/api/board/file",
        "/api/board/machine", "/api/board/prompt", "/api/board/session/records", "/api/board/sessions",
        "/api/board/skill", "/api/board/tool", "/api/board/terminal/events", "/api/board/terminal/file",
        "/api/board/terminal/metrics", "/api/board/terminal/resources", "/api/board/terminal/sessions",
        "/api/board/mcp", "/api/board/mcp/server", "/api/board/convergence", "/api/board/session/convergence",
    ), "_serve_board"),
    "/api/samples": "_serve_samples",
    "/api/context-audit": "_serve_context_audit",
    "/api/settings/files": "_serve_settings_files",
    "/api/settings/file": "_serve_settings_file_get",
    "/api/settings/tools": "_serve_settings_tools",
    "/api/session-processes": "_serve_session_processes",
    "/api/session-commits": "_serve_session_commits",
    "/api/session-stats": "_serve_session_stats",
    "/api/session-mcp-usage": "_serve_session_mcp_usage",
    "/api/otel-status": "_serve_otel_status",
    "/api/query-timings": "_serve_query_timings",
    "/api/hooks-status": "_serve_hooks_status",
    "/api/tool-config/{tool}": "_serve_tool_config_get",
    "/api/api-calls": "_serve_api_calls",
    "/api/events/count": "_serve_events_count",
    "/api/events": "_serve_events",
    "/api/datapoints": "_serve_datapoint_catalog",
}

PUT_ROUTES = {
    "/api/tool-config/{tool}": "_serve_tool_config_put",
    "/api/settings/file": "_serve_settings_file_put",
}

POST_ROUTES = {
    "/api/hooks": "_receive_hook",
    "/api/session-kill": "_serve_session_kill",
    "/api/board/action": "_serve_board_action",
    "/v1/metrics": "_receive_otel_metrics",
    "/v1/logs": "_receive_otel_logs",
    "/v1/traces": "_receive_otel_traces",
}


def _route_key(path: str) -> str:
    if path.startswith("/assets/"):
        return "/assets/{name}"
    if path.startswith("/api/tool-config/"):
        return "/api/tool-config/{tool}"
    if path.startswith("/api/copilot-sessions/"):
        parts = path.removeprefix("/api/copilot-sessions/").strip("/").split("/")
        if parts[0]:
            return "/api/copilot-sessions/{id}" + ("/" + "/".join(parts[1:]) if len(parts) > 1 else "")
        return "/api/copilot-sessions"
    return path


# While the daemon collects its first snapshot, its port is already open: these routes are
# served at once, every other request waits for the snapshot up to READY_WAIT_S.
_TAKEN_WHILE_STARTING = frozenset({"/api/hooks", "/v1/metrics", "/v1/logs", "/v1/traces"})


_SERVED_WHILE_STARTING = frozenset({
    "/", "/index.html", "/favicon.ico", "/api/live/capabilities", "/api/live/stream",
    "/api/board/agent/flow", "/api/session-evidence",
})


# Under the handler's 30 s socket timeout, so the client gets the answer.
READY_WAIT_S = 20.0


# Requests run on four threads that live as long as the server: a thread's first read
# of the history attaches and copies the project stores, 150 ms here, and a thread per
# request paid that on every request. A request that finds no idle worker when the
# pool is full gets a thread of its own, so streaming clients never hold the others up.
HTTP_WORKERS = 4


class _DashboardHandler(SessionRoutes, SettingsRoutes, MetricsRoutes, RequestMethods, ResponseMethods, AssetRoutes, IngestRoutes, BoardRoutes, BaseHTTPRequestHandler):
    server: _DashboardHTTPServer  # type hint for IDE

    timeout = 30  # per-connection socket timeout (read by StreamRequestHandler.setup)

    def handle_one_request(self) -> None:
        """Wrap parent to suppress BrokenPipeError from client disconnects."""
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            self.close_connection = True

    def _wait_ready(self) -> bool:
        """Hold a data request until the first snapshot is ready; answer a short 503 when it takes longer.

        The wait stays under the socket timeout. The board polls again and its stream reconnects,
        so a 503 only delays it; the page says that aictl is starting.
        """
        ready = getattr(self.server, "ready", None)  # a server without the flag is ready
        if ready is None or ready.wait(READY_WAIT_S):
            return True
        self.send_response(503)
        self.send_header("Retry-After", "2")
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": "aictl is starting: the first snapshot is not ready yet.", "starting": True}).encode())
        return False

    def do_GET(self) -> None:
        self._observe_http(self._do_GET, self.server.health_reads)

    def _observe_http(self, handler, counter) -> None:
        started = counter.begin()
        self._health_response_status = 200
        error = None
        try:
            handler()
            if self._health_response_status >= 400:
                error = f"HTTP {self._health_response_status}"
        except Exception as exc:
            error = str(exc)
            raise
        finally:
            counter.finish(started, error=error)

    def send_response(self, code, message=None) -> None:
        self._health_response_status = code
        super().send_response(code, message)

    def _do_GET(self) -> None:
        url = urlparse(self.path)
        path = url.path
        node_query = parse_qs(url.query, keep_blank_values=True) if path == "/api/board/nodes" else {}
        local_health = node_query.get("view") == ["health"] and node_query.get("scope", ["local"]) == ["local"]
        # The page and its files need no snapshot: they load at once and the page says it is starting.
        if not (local_health or path in _SERVED_WHILE_STARTING or path.startswith("/assets/")) and not self._wait_ready():
            return
        if path.startswith(_LOCAL_ONLY_ROUTES) and not _local_request(self.client_address[0], self.headers.get("Host")):
            self._json_response({"error": "This route answers requests from this machine only."}, status=403)
            return
        endpoint = GET_ROUTES.get(_route_key(path))
        if endpoint == "history_board":
            from .history_board import serve

            serve(self, url.query)
            return
        if path.startswith("/api/") and path != "/api/board/nodes":
            from .history_scope import ScopeError, identity_parts, parse_scope

            params = parse_qs(url.query, keep_blank_values=True)
            scoped = "node_id" in params or any(v in {"node", "fleet"} for v in params.get("scope", ()))
            if scoped:
                try:
                    scope = parse_scope(params)
                except ScopeError as exc:
                    self._json_response({"error": str(exc), "reason": exc.reason}, status=exc.status)
                    return
                if scope.kind != "local":
                    if path in _SCOPED_BOARD_ROUTES:
                        self._serve_board(path)
                    else:
                        self._json_response({"error": "Available only on This node", "reason": "local_only"}, status=422)
                    return
            if any(identity_parts(value) for key in ("id", "session_id") for value in params.get(key, ())):
                self._json_response({"error": "A node-qualified record requires a historical scope"}, status=400)
                return
        if endpoint == "capabilities":
            live_stream.serve_capabilities(self)
        elif endpoint == "stream":
            live_stream.serve_stream(self)
        elif endpoint == "_serve_board_nodes":
            self._serve_board_nodes(node_query)
        elif endpoint in ("_serve_board", "_serve_copilot_sessions", "_serve_static"):
            getattr(self, endpoint)(path)
        elif endpoint:
            getattr(self, endpoint)()
        elif path.startswith("/api/board/"):
            self._json_response({"error": "No such route"}, status=404)
        else:
            self.send_error(404)

    def do_PUT(self) -> None:
        if self._reject_cross_origin():
            return
        path = urlparse(self.path).path
        if self._reject_scoped_action():
            return
        endpoint = PUT_ROUTES.get(_route_key(path))
        if endpoint == "_serve_settings_file_put" and not _local_request(
            self.client_address[0], self.headers.get("Host")
        ):
            self._json_response({"error": "This route answers requests from this machine only."}, status=403)
        elif endpoint:
            getattr(self, endpoint)()
        else:
            self.send_error(404)

    def do_POST(self) -> None:
        self._observe_http(self._do_POST, self.server.health_writes)

    def _do_POST(self) -> None:
        if self._reject_cross_origin():
            return
        path = urlparse(self.path).path
        if path in ("/api/board/action", "/api/session-kill", "/api/board/nodes") and self._reject_scoped_action():
            return
        # Hooks and telemetry need only the stores and are taken at once; the rest waits.
        if path not in _TAKEN_WHILE_STARTING and not self._wait_ready():
            return
        endpoint = POST_ROUTES.get(path)
        if endpoint:
            getattr(self, endpoint)()
        else:
            self.send_error(404)

    @property
    def _db(self):
        """Runtime owner of the configured history store."""
        return self.server.store

    def log_message(self, fmt, *args) -> None:
        # The stream and the telemetry posts arrive every few seconds; a log line each is noise.
        msg = fmt % args if args else fmt
        if '"GET /api/live/stream' in str(msg) or '"POST /v1/' in str(msg) or '"POST /api/hooks' in str(msg):
            return
        print(f"  {msg}", file=sys.stderr)


class _DashboardHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    # On Windows SO_REUSEADDR lets a second server share a port in use, with no bind error.
    allow_reuse_address = not IS_WINDOWS
    # The default listen backlog of 5 makes Windows reset bursts of browser, hook and OTel connections.
    request_queue_size = 128

    def __init__(self, addr, handler, store, allowed, root, *, start_ingesters_now: bool = True):
        super().__init__(addr, handler)
        from ..health import OperationStats

        self.health_reads = OperationStats()
        self.health_writes = OperationStats()
        self._requests: queue.SimpleQueue = queue.SimpleQueue()
        self._workers_lock = threading.Lock()
        self._idle_workers = 0
        self._worker_count = 0
        self._closing = False
        self.store: SnapshotStore = store
        self.allowed: AllowedPaths = allowed
        # Set once the first snapshot is ready; start_server clears it while it collects.
        self.ready: threading.Event = threading.Event()
        self.ready.set()
        self.root: Path = root
        # Entity state tracker for hook events (Phase 3.3)
        from ..monitoring.correlator import EntityStateTracker

        self.entity_tracker: EntityStateTracker = EntityStateTracker()
        # OTel OTLP receiver for Claude Code telemetry
        self.otel_receiver: OtelReceiver = OtelReceiver()
        self.raw_otel_metrics = OtelMetricGate()
        # Session analyzer — independent live transcript builder
        from ..analysis.analyzer import SessionAnalyzer

        self.session_analyzer: SessionAnalyzer = SessionAnalyzer()
        self.store.session_facts.event_listener = self.session_analyzer.ingest_event
        # Periodic local-store ingesters (Slice 3.2 Copilot, 3.3 Cursor).
        from .ingester_runner import start_ingesters

        # start_server starts them after the first snapshot, so their backfills do not slow it.
        self.ingesters = start_ingesters(store) if start_ingesters_now else {}
        self._owns_live_hub = False
        from .live.hub import LiveHub
        from .live.projection import LiveDashboard

        hub = getattr(store, "live_hub", None)
        if hub is None:
            hub = store.live_hub = LiveHub()
            self._owns_live_hub = True
        self.live_dashboard = LiveDashboard(hub, store, store, health_provider=self._live_health)
        self.attach_live_ingesters()
        if persistence := getattr(store, "_persistence", None):
            persistence.runtime_sample = self._node_runtime_sample

    def _node_runtime_sample(self) -> dict:
        return node_runtime_sample(self.store, self.otel_receiver, self.ingesters)

    def attach_live_ingesters(self) -> None:
        sources = getattr(self.store, "live_sources", None)
        handle = self.ingesters.get("transcript-usage")
        ingester = getattr(handle, "ingester", None)
        if sources is not None and ingester is not None:
            sources.attach_ingester(ingester)

    def _live_health(self) -> tuple[dict, dict]:
        return live_health_and_machine(
            self.store,
            otel=self.otel_receiver,
            ingesters=self.ingesters,
            stream_clients=live_stream.client_count(),
            port=self.server_address[1],
            http_reads=self.health_reads,
            http_writes=self.health_writes,
        )

    def process_request(self, request, client_address) -> None:
        """Hand the request to an idle worker, a new worker while the pool has room, else a thread."""
        with self._workers_lock:
            if self._idle_workers:
                self._idle_workers -= 1
                self._requests.put((request, client_address))
                return
            start_worker = self._worker_count < HTTP_WORKERS and not self._closing
            if start_worker:
                self._worker_count += 1
                number = self._worker_count
        if start_worker:
            threading.Thread(
                target=self._work, args=((request, client_address),), daemon=True, name=f"aictl-http-worker-{number}"
            ).start()
            return
        super().process_request(request, client_address)

    def _work(self, item: tuple | None) -> None:
        while item is not None:
            self.process_request_thread(*item)
            with self._workers_lock:
                if self._closing:
                    return
                self._idle_workers += 1
            item = self._requests.get()

    def server_close(self) -> None:
        # TCPServer can call this before dashboard initialization if binding fails.
        if not hasattr(self, "live_dashboard"):
            super().server_close()
            return
        persistence = getattr(self.store, "_persistence", None)
        if getattr(persistence, "runtime_sample", None) == self._node_runtime_sample:
            persistence.runtime_sample = None
        self.live_dashboard.close()
        if self._owns_live_hub:
            self.store.live_hub.close()
        with self._workers_lock:
            self._closing = True
            idle = self._idle_workers
            self._idle_workers = 0
        for _ in range(idle):
            self._requests.put(None)
        super().server_close()
