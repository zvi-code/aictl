# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The receiver of a reporting node: hooks and OpenTelemetry in, nothing out.

A reporting node has no dashboard, but the tools on it push hook events and
telemetry to a port. This server takes those posts and stores them. It serves
no page, no API read and no live stream.
"""

from __future__ import annotations

import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from ..platforms import IS_WINDOWS
from ..sink import OtelMetricGate
from .http_request import RequestMethods
from .http_response import ResponseMethods
from .ingest_http import IngestRoutes
from .otel_receiver import OtelReceiver

RECEIVE_ROUTES = {
    "/api/hooks": "_receive_hook",
    "/v1/metrics": "_receive_otel_metrics",
    "/v1/logs": "_receive_otel_logs",
    "/v1/traces": "_receive_otel_traces",
}


class _ReceiveHandler(RequestMethods, ResponseMethods, IngestRoutes, BaseHTTPRequestHandler):
    server: ReceiveServer
    timeout = 30  # per-connection socket timeout

    def handle_one_request(self) -> None:
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            self.close_connection = True

    def do_POST(self) -> None:
        if self._reject_cross_origin():
            return
        endpoint = RECEIVE_ROUTES.get(urlparse(self.path).path)
        if endpoint:
            getattr(self, endpoint)()
        else:
            self.send_error(404)

    def do_GET(self) -> None:
        self.send_error(404, "This is a reporting node: it has no dashboard")

    do_PUT = do_GET

    def log_message(self, fmt, *args) -> None:
        # Posts arrive every few seconds; only refused requests are worth a line.
        msg = fmt % args if args else fmt
        if '"POST /v1/' in str(msg) or '"POST /api/hooks' in str(msg):
            return
        print(f"  {msg}", file=sys.stderr)


class ReceiveServer(ThreadingHTTPServer):
    daemon_threads = True
    # On Windows SO_REUSEADDR lets a second server share a port in use, with no bind error.
    allow_reuse_address = not IS_WINDOWS
    # The default listen backlog of 5 makes Windows reset bursts of hook and OTel connections.
    request_queue_size = 128

    def __init__(self, addr, store) -> None:
        super().__init__(addr, _ReceiveHandler)
        from ..monitoring.correlator import EntityStateTracker

        self.store = store
        self.entity_tracker = EntityStateTracker()
        self.otel_receiver = OtelReceiver()
        self.raw_otel_metrics = OtelMetricGate()
