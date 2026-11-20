"""HTTP response serialization, compression, and cache validation."""

from __future__ import annotations

import gzip
import hashlib
import json
import re
import threading

# Bodies at or below this size are sent as they are: gzip saves nothing there.
_GZIP_MIN_BYTES = 1024


_COMPRESSIBLE_TYPES = ("text/", "application/json", "application/javascript", "image/svg+xml")


def _accepts_gzip(header: str | None) -> bool:
    """True when an Accept-Encoding value allows gzip (a ``gzip;q=0`` refuses it)."""
    for part in (header or "").split(","):
        name, _, params = part.strip().partition(";")
        if name.strip().lower() in ("gzip", "x-gzip"):
            q = re.search(r"q\s*=\s*([0-9.]+)", params)
            try:
                return float(q.group(1)) > 0 if q else True
            except ValueError:
                return False
    return False


def _gzip_bytes(body: bytes, level: int = 6) -> bytes:
    # mtime=0 keeps the output identical for identical input.
    return gzip.compress(body, compresslevel=level, mtime=0)


class _GzipMemo:
    """The compressed form of the last body seen for each key.

    The snapshot and the static files are served many times unchanged; this
    keeps them from being compressed again on every request.
    """

    def __init__(self, max_keys: int = 64) -> None:
        self._lock = threading.Lock()
        self._items: dict[str, tuple[object, bytes]] = {}
        self._max_keys = max_keys

    def get(self, key: str, token: object, body: bytes) -> bytes:
        with self._lock:
            hit = self._items.get(key)
            if hit and hit[0] == token:
                return hit[1]
        packed = _gzip_bytes(body)
        with self._lock:
            if len(self._items) >= self._max_keys and key not in self._items:
                self._items.pop(next(iter(self._items)))
            self._items[key] = (token, packed)
        return packed


_GZIP_MEMO = _GzipMemo()


class ResponseMethods:
    def _check_etag(self, etag: str) -> bool:
        """Send 304 if client ETag matches. Returns True when 304 was sent."""
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.send_header("Vary", "Accept-Encoding")
            self.end_headers()
            return True
        return False

    def _send_cors_header(self) -> None:
        """Emit Access-Control-Allow-Origin for loopback origins only.

        Same-origin requests carry no Origin header and need no ACAO header;
        non-loopback origins get nothing (the browser blocks the read).
        """
        origin = self._cors_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def _json_response(self, data, indent=None, status: int = 200) -> None:
        """Send a JSON response."""
        self._json_response_raw(json.dumps(data, indent=indent).encode("utf-8"), status=status)

    def _json_response_raw(self, body: bytes, status: int = 200) -> None:
        """Send pre-encoded JSON bytes as a response, gzipped when the client allows it."""
        self._send_body(body, "application/json", status=status)

    def _wants_gzip(self) -> bool:
        return _accepts_gzip(self.headers.get("Accept-Encoding"))

    def _send_body(
        self,
        body: bytes,
        content_type: str,
        *,
        status: int = 200,
        cache_control: str | None = None,
        etag: str | None = None,
        memo_key: str | None = None,
        memo_token: object = None,
        cors: bool = True,
    ) -> None:
        """Write a whole body with Content-Length, gzipped for clients that accept it.

        With *memo_key* the compressed form is reused until *memo_token* changes.
        """
        gz = len(body) > _GZIP_MIN_BYTES and self._wants_gzip()
        if (
            etag is None
            and cache_control != "no-store"
            and status == 200
            and content_type == "application/json"
            and len(body) > _GZIP_MIN_BYTES
            and getattr(self, "command", "") == "GET"
        ):
            # A polled endpoint whose answer did not change costs a 304, not the body.
            etag = '"' + hashlib.blake2b(body, digest_size=12).hexdigest() + ("-gz" if gz else "") + '"'
            if self._check_etag(etag):
                return
        packed = None
        if gz:
            packed = _GZIP_MEMO.get(memo_key, memo_token, body) if memo_key else _gzip_bytes(body, 5)
        payload = packed if packed is not None else body
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        if packed is not None:
            self.send_header("Content-Encoding", "gzip")
        origin = self._cors_origin() if cors else None
        self.send_header("Vary", "Origin, Accept-Encoding" if origin else "Accept-Encoding")
        self.send_header("Content-Length", str(len(payload)))
        if etag:
            self.send_header("ETag", etag)
        if cache_control:
            self.send_header("Cache-Control", cache_control)
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.end_headers()
        self.wfile.write(payload)
