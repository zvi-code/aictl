"""HTTP request parsing, origin checks, and scope guards."""

from __future__ import annotations

import ipaddress
from pathlib import PureWindowsPath
from urllib.parse import parse_qs, urlparse

_LOOPBACK_HOSTS = ("127.0.0.1", "localhost", "::1")


def _local_request(client_host: str, host_header: str | None) -> bool:
    """True for a request from this machine that is addressed to a loopback name.

    The client check holds when the dashboard is bound to another interface. The
    Host check stops a web page that rebinds its own name to 127.0.0.1.
    """
    try:
        client = ipaddress.ip_address(client_host)
    except ValueError:
        return False
    client = getattr(client, "ipv4_mapped", None) or client
    return client.is_loopback and _loopback_origin(f"http://{host_header or ''}") is not None


def _names_another_machine(path: str) -> bool:
    """True for a UNC path. Testing one for existence opens a network connection."""
    return PureWindowsPath(path).drive.startswith("\\\\")


def _loopback_origin(origin: str | None) -> str | None:
    """Return *origin* if it is an http(s) loopback origin, else None.

    The dashboard binds to loopback only, so cross-origin access is granted
    solely to loopback origins (any port) — e.g. a Vite dev server on
    http://localhost:5173 — never to arbitrary websites.
    """
    if not origin:
        return None
    try:
        parsed = urlparse(origin)
        host = (parsed.hostname or "").lower()
    except ValueError:  # e.g. malformed IPv6 brackets
        return None
    if parsed.scheme not in ("http", "https"):
        return None
    if host in _LOOPBACK_HOSTS:
        return origin
    return None


class RequestMethods:
    @property
    def _qs(self) -> dict[str, list[str]]:
        """Parsed query-string parameters for the current request."""
        return parse_qs(urlparse(self.path).query)

    def _reject_scoped_action(self, data=None) -> bool:
        params = parse_qs(urlparse(self.path).query, keep_blank_values=True)
        body_scope = isinstance(data, dict) and ("node_id" in data or data.get("scope") in ("node", "fleet"))
        if body_scope or "node_id" in params or any(v in ("node", "fleet") for v in params.get("scope", ())):
            self._json_response({"error": "Fleet and named-node views are read-only"}, status=403)
            return True
        return False

    def _cors_origin(self) -> str | None:
        """The request's Origin header, if (and only if) it is loopback."""
        return _loopback_origin(self.headers.get("Origin"))

    def _content_length(self) -> int | None:
        """Parse the Content-Length header; send 400 and return None if malformed."""
        try:
            content_length = int(self.headers.get("Content-Length", 0) or 0)
        except ValueError:
            content_length = -1
        if content_length < 0:
            self.send_error(400, "Invalid Content-Length")
            return None
        return content_length

    def _reject_cross_origin(self) -> bool:
        """CSRF guard for state-changing requests (POST/PUT).

        Rejects any request whose Origin header is present and neither
        loopback nor same-origin (Origin host:port matching the request's
        Host header — covers dashboards deliberately served on a
        non-loopback interface). Non-browser clients (aictl's own hook
        handler, OTLP exporters) send no Origin header and pass through.
        Returns True when rejected.
        """
        origin = self.headers.get("Origin")
        if not origin:
            return False
        if _loopback_origin(origin):
            return False
        try:
            origin_netloc = urlparse(origin).netloc.lower()
        except ValueError:
            origin_netloc = ""
        if origin_netloc and origin_netloc == (self.headers.get("Host") or "").lower():
            return False
        self.send_error(403, "Cross-origin request rejected")
        return True

    def _qs_get(self, key: str, default=None):
        """Return the first value for *key* in the query-string, or *default*."""
        v = self._qs.get(key)
        return v[0] if v else default

    def _qs_float(self, key: str, default: float) -> float:
        """Parse a float from query string, returning default if absent."""
        v = self._qs_get(key)
        return float(v) if v else default

    def _qs_float_opt(self, key: str) -> float | None:
        """Parse an optional float from query string, returning None if absent."""
        v = self._qs_get(key)
        return float(v) if v else None
