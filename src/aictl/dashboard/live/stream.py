"""HTTP handlers for live capabilities and the scoped entity stream."""

import threading
from contextlib import contextmanager
from urllib.parse import parse_qs, urlparse

from ...monitoring.pace import PACE
from .hub import LiveCapacityError
from .protocol import capabilities, sse_bytes

MAX_SSE_CLIENTS = 10
_client_count = 0
_client_lock = threading.Lock()


def client_count() -> int:
    with _client_lock:
        return _client_count


@contextmanager
def client_slot():
    """Reserve one live SSE connection."""
    global _client_count
    with _client_lock:
        accepted = _client_count < MAX_SSE_CLIENTS
        if accepted:
            _client_count += 1
    if not accepted:
        yield False
        return
    PACE.client_connected()
    try:
        yield True
    finally:
        PACE.client_disconnected()
        with _client_lock:
            _client_count -= 1


def serve_capabilities(request) -> None:
    request._json_response(capabilities())


def serve_stream(request) -> None:
    """Send one scoped baseline followed by entity changes."""
    from ..board_filters import BoardRequestError

    with client_slot() as accepted:
        if not accepted:
            request.send_error(503, "Too many SSE clients")
            return
        subscription = None
        try:
            query = urlparse(request.path).query
            params = parse_qs(query)
            cursor = request.headers.get("Last-Event-ID") or (params.get("cursor") or [None])[0]
            history = (params.get("history") or ["1"])[0] != "0"
            try:
                subscription = request.server.live_dashboard.subscribe(query, history=history, cursor=cursor)
            except LiveCapacityError as exc:
                request._json_response({"error": str(exc)}, status=429)
                return
            except (BoardRequestError, ValueError) as exc:
                request._json_response({"error": str(exc)}, status=400)
                return
            request.send_response(200)
            request.send_header("Content-Type", "text/event-stream; charset=utf-8")
            request.send_header("Cache-Control", "no-cache, no-transform")
            request.send_header("Connection", "keep-alive")
            request.send_header("X-Accel-Buffering", "no")
            request._send_cors_header()
            request.end_headers()
            while not request.server._closing:
                try:
                    message = subscription.next(timeout=15.0)
                    if message is None:
                        request.wfile.write(b": keepalive\n\n")
                    else:
                        event, payload = message
                        request.wfile.write(sse_bytes(event, payload))
                    request.wfile.flush()
                except (StopIteration, BrokenPipeError, ConnectionResetError, OSError):
                    break
        finally:
            if subscription is not None:
                subscription.close()
