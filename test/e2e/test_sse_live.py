"""E2E: SSE streaming — connect, post hooks, assert real-time events.

Validates that Server-Sent Events stream delivers live data when
hook events and OTel payloads are posted.
"""

from __future__ import annotations

import json
import threading
import time
from urllib.request import Request, urlopen

import pytest

pytestmark = pytest.mark.e2e


class SSEReader:
    """Minimal SSE client that collects events in a background thread."""

    def __init__(self, url: str, *, timeout: float = 15):
        self.url = url
        self.timeout = timeout
        self.events: list[dict] = []
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._started = threading.Event()

    def start(self) -> "SSEReader":
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()
        # Wait for initial connection
        if not self._started.wait(timeout=10):
            raise TimeoutError("SSE connection not established within 10s")
        return self

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    def wait_for_events(self, min_count: int = 1, timeout: float = 10) -> list[dict]:
        """Wait until at least *min_count* SSE events have been received."""
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if len(self.events) >= min_count:
                return self.events[:min_count]
            time.sleep(0.3)
        return self.events

    def _read_loop(self) -> None:
        try:
            req = Request(self.url)
            with urlopen(req, timeout=self.timeout) as resp:
                self._started.set()
                buf = b""
                while not self._stop.is_set():
                    try:
                        chunk = resp.read(4096)
                    except TimeoutError:
                        continue
                    if not chunk:
                        break
                    buf += chunk
                    # Parse SSE frames
                    while b"\n\n" in buf:
                        frame, buf = buf.split(b"\n\n", 1)
                        for line in frame.split(b"\n"):
                            line_str = line.decode("utf-8", errors="replace")
                            if line_str.startswith("data: "):
                                try:
                                    data = json.loads(line_str[6:])
                                    self.events.append(data)
                                except json.JSONDecodeError:
                                    pass
        except (OSError, TimeoutError):
            pass
        finally:
            self._started.set()  # Unblock in case of early failure


class TestSSEConnection:
    """Basic SSE connectivity."""

    def test_sse_connects(self, aictl_server):
        """SSE endpoint accepts connection and sends initial snapshot."""
        reader = SSEReader(f"{aictl_server.base_url}/api/stream")
        try:
            reader.start()
            events = reader.wait_for_events(min_count=1, timeout=10)
            assert len(events) >= 1, "No initial SSE snapshot received"
            # Initial event should have dashboard summary fields
            first = events[0]
            assert "timestamp" in first or "root" in first or "total_files" in first
        finally:
            reader.stop()

    def test_sse_receives_update_after_hook(self, aictl_server):
        """After posting a hook, SSE stream delivers an updated snapshot."""
        reader = SSEReader(f"{aictl_server.base_url}/api/stream", timeout=40)
        try:
            reader.start()
            # Wait for initial snapshot
            reader.wait_for_events(min_count=1, timeout=10)
            initial_count = len(reader.events)

            # Post a hook event
            aictl_server.post_hook({
                "event": "SessionStart",
                "session_id": f"sse-test-{int(time.time() * 1000)}",
                "tool": "claude-code",
                "ts": time.time(),
            })

            # Wait for an update (SSE refresh interval ~5s, wait up to 15s)
            events = reader.wait_for_events(
                min_count=initial_count + 1, timeout=15,
            )
            assert len(events) > initial_count, (
                f"No SSE update after hook (got {len(events)} total, initial was {initial_count})"
            )
        finally:
            reader.stop()


class TestSSEDataIntegrity:
    """Verify SSE payload structure and content."""

    def test_sse_has_expected_fields(self, aictl_server):
        reader = SSEReader(f"{aictl_server.base_url}/api/stream")
        try:
            reader.start()
            events = reader.wait_for_events(min_count=1, timeout=10)
            assert len(events) >= 1
            data = events[0]

            # SSE summary should have standard fields
            expected_fields = {"timestamp", "root"}
            present = set(data.keys())
            missing = expected_fields - present
            assert not missing, f"SSE payload missing fields: {missing}"
        finally:
            reader.stop()
