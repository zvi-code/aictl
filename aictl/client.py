# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""HTTP client for connecting to a running ``aictl serve`` instance.

Used by the TUI dashboard and CLI commands to consume data from the
shared backend instead of running their own collection loops.

Usage::

    client = ServerClient.try_connect()
    if client:
        snap = client.get_snapshot()     # one-shot
        for event in client.stream():    # SSE real-time
            ...
    else:
        # Standalone mode — fall back to local collect()
"""

from __future__ import annotations

import json
import logging
import urllib.request
import urllib.error
from typing import Any, Iterator

log = logging.getLogger(__name__)

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8484


class ServerClient:
    """HTTP client for a running aictl server."""

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    @classmethod
    def try_connect(
        cls,
        host: str = DEFAULT_HOST,
        port: int = DEFAULT_PORT,
        timeout: float = 1.5,
    ) -> "ServerClient | None":
        """Probe for a running server. Returns client or None."""
        url = f"http://{host}:{port}"
        try:
            req = urllib.request.Request(
                f"{url}/api/snapshot",
                method="GET",
                headers={"Accept": "application/json"},
            )
            resp = urllib.request.urlopen(req, timeout=timeout)
            if resp.status == 200:
                log.debug("Connected to aictl server at %s", url)
                return cls(url)
        except (urllib.error.URLError, OSError, TimeoutError):
            pass
        return None

    # ── One-shot queries ──────────────────────────────────────────

    def _get_json(self, path: str, params: dict[str, str] | None = None) -> Any:
        """GET a JSON endpoint."""
        url = self.base_url + path
        if params:
            qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
            if qs:
                url += "?" + qs
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        resp = urllib.request.urlopen(req, timeout=10.0)
        return json.loads(resp.read().decode("utf-8"))

    def get_snapshot(self) -> dict:
        """GET /api/snapshot → full dashboard snapshot dict."""
        return self._get_json("/api/snapshot")

    def get_history(self, range: str | None = None) -> dict:
        """GET /api/history → time-series history (column-major)."""
        params = {"range": range} if range else None
        return self._get_json("/api/history", params)

    def get_events(
        self,
        since: float | None = None,
        tool: str | None = None,
        kind: str | None = None,
        limit: int = 200,
    ) -> list[dict]:
        """GET /api/events → event list."""
        params: dict[str, str] = {"limit": str(limit)}
        if since is not None:
            params["since"] = str(since)
        if tool:
            params["tool"] = tool
        if kind:
            params["kind"] = kind
        return self._get_json("/api/events", params)

    def get_samples(
        self,
        metric: str | None = None,
        prefix: str | None = None,
        since: float | None = None,
        list_metrics: bool = False,
        series: str | None = None,
    ) -> Any:
        """GET /api/samples → samples or metric list."""
        params: dict[str, str] = {}
        if list_metrics:
            params["list"] = "1"
            if prefix:
                params["prefix"] = prefix
        elif series:
            params["series"] = series
            if since is not None:
                params["since"] = str(since)
        else:
            if metric:
                params["metric"] = metric
            if prefix:
                params["prefix"] = prefix
            if since is not None:
                params["since"] = str(since)
        return self._get_json("/api/samples", params)

    def get_budget(self) -> dict:
        """GET /api/budget → token budget analysis."""
        return self._get_json("/api/budget")

    # ── SSE stream ────────────────────────────────────────────────

    def stream(self, timeout: float = 35.0) -> Iterator[dict]:
        """Yield parsed snapshot dicts from the SSE stream.

        Blocks until a new event arrives or timeout. Reconnects
        automatically on connection errors.
        """
        url = self.base_url + "/api/stream"
        req = urllib.request.Request(
            url, headers={"Accept": "text/event-stream"})
        try:
            resp = urllib.request.urlopen(req, timeout=timeout)
        except (urllib.error.URLError, OSError, TimeoutError):
            return

        buffer = ""
        while True:
            try:
                chunk = resp.read(4096)
                if not chunk:
                    break
                buffer += chunk.decode("utf-8", errors="replace")
                # Parse SSE: lines starting with "data: " form a message
                while "\n\n" in buffer:
                    message, buffer = buffer.split("\n\n", 1)
                    data_lines = []
                    for line in message.splitlines():
                        if line.startswith("data: "):
                            data_lines.append(line[6:])
                        elif line.startswith("data:"):
                            data_lines.append(line[5:])
                    if data_lines:
                        try:
                            yield json.loads("".join(data_lines))
                        except json.JSONDecodeError:
                            continue
            except (OSError, TimeoutError):
                break

    # ── Utility ───────────────────────────────────────────────────

    def is_alive(self) -> bool:
        """Quick health check."""
        try:
            self._get_json("/api/snapshot")
            return True
        except Exception:
            return False

    def __repr__(self) -> str:
        return f"ServerClient({self.base_url!r})"
