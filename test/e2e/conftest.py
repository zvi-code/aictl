"""E2E test fixtures — start real aictl server, provide HTTP clients."""

from __future__ import annotations

import json
import os
import signal
import socket
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

import pytest

PAYLOADS_DIR = Path(__file__).parent / "payloads"
REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# Use the Python from this venv to run aictl
_PYTHON = sys.executable


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _wait_for_http(url: str, *, timeout: float = 15) -> None:
    """Block until *url* responds with HTTP 200 (or timeout)."""
    deadline = time.monotonic() + timeout
    last_err: Exception | None = None
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=2) as resp:
                if resp.status == 200:
                    return
        except (URLError, OSError, TimeoutError) as exc:
            last_err = exc
        time.sleep(0.3)
    raise TimeoutError(f"{url} not ready after {timeout}s: {last_err}")


# ── Server fixture ────────────────────────────────────────────────


@dataclass
class ServerHandle:
    """Running aictl daemon serve process with convenience helpers."""

    port: int
    db_path: Path
    proc: subprocess.Popen
    base_url: str = field(init=False)

    def __post_init__(self) -> None:
        self.base_url = f"http://127.0.0.1:{self.port}"

    # ── HTTP helpers ──────────────────────────────────────────────

    def get(self, path: str, **params: str) -> Any:
        """GET *path* and return parsed JSON."""
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{self.base_url}{path}" + (f"?{qs}" if qs else "")
        with urlopen(url, timeout=10) as resp:
            return json.loads(resp.read())

    def post(self, path: str, body: dict | list) -> Any:
        """POST JSON to *path* and return parsed JSON response."""
        data = json.dumps(body).encode()
        req = Request(
            f"{self.base_url}{path}",
            data=data,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())

    def post_hook(self, payload: dict) -> dict:
        """Shortcut: POST to /api/hooks."""
        return self.post("/api/hooks", payload)

    def post_otel_metrics(self, payload: dict) -> dict:
        return self.post("/v1/metrics", payload)

    def post_otel_logs(self, payload: dict) -> dict:
        return self.post("/v1/logs", payload)

    def post_otel_traces(self, payload: dict) -> dict:
        return self.post("/v1/traces", payload)

    def get_sessions(self, **kw) -> list[dict]:
        return self.get("/api/sessions", **kw)

    def get_events(self, *, timeout: float = 15, min_count: int = 0, **kw) -> list[dict]:
        """Query /api/events, optionally polling until *min_count* results appear.

        The server buffers events with a 10s flush interval, so queries
        may initially return empty.  When *min_count* > 0 this polls
        until enough events are available (or *timeout* expires).
        """
        deadline = time.monotonic() + timeout
        while True:
            result = self.get("/api/events", **kw)
            if len(result) >= min_count or time.monotonic() >= deadline:
                return result
            time.sleep(1.0)

    def get_otel_status(self) -> dict:
        return self.get("/api/otel-status")

    def poll(
        self,
        path: str,
        *,
        check: "callable",
        timeout: float = 15,
        **params: str,
    ) -> Any:
        """Poll *path* until *check(response)* returns True (or timeout)."""
        deadline = time.monotonic() + timeout
        result = None
        while time.monotonic() < deadline:
            result = self.get(path, **params)
            if check(result):
                return result
            time.sleep(1.0)
        return result


@pytest.fixture(scope="session")
def aictl_server(tmp_path_factory) -> ServerHandle:
    """Start ``aictl daemon serve`` on a random port, yield handle, cleanup."""
    port = _find_free_port()
    db_dir = tmp_path_factory.mktemp("e2e")
    db_path = db_dir / "e2e_test.db"

    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    # Build a one-liner that invokes the CLI programmatically (no __main__.py needed).
    cli_invoke = (
        "import sys; sys.argv = ['aictl'] + sys.argv[1:]; "
        "from aictl.cli import main; main()"
    )
    proc = subprocess.Popen(
        [
            _PYTHON, "-c", cli_invoke,
            "daemon", "serve",
            "--port", str(port),
            "--no-open",
            "--no-monitor",
            "--db", str(db_path),
            "--root", str(REPO_ROOT),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
    )

    try:
        _wait_for_http(f"http://127.0.0.1:{port}/api/otel-status", timeout=20)
    except TimeoutError:
        proc.kill()
        stdout, stderr = proc.communicate(timeout=5)
        raise RuntimeError(
            f"aictl serve failed to start on :{port}\n"
            f"stdout: {stdout.decode()[:500]}\nstderr: {stderr.decode()[:500]}"
        )

    handle = ServerHandle(port=port, db_path=db_path, proc=proc)
    yield handle

    proc.send_signal(signal.SIGTERM)
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=3)


# ── Payload loaders ───────────────────────────────────────────────

def _load_payload(name: str) -> dict:
    return json.loads((PAYLOADS_DIR / name).read_text())


@pytest.fixture()
def claude_hook_sequence() -> list[dict]:
    """Return ordered list of hook payloads simulating a full Claude session."""
    data = _load_payload("claude_hooks.json")
    base_ts = time.time()
    session_id = data["session_id"]
    tool = data["tool"]
    cwd = data["cwd"]
    result = []
    offset = 0.0
    for ev in data["events"]:
        offset += ev.pop("_delay_ms", 0) / 1000
        result.append({
            **ev,
            "session_id": session_id,
            "tool": tool,
            "cwd": cwd,
            "ts": base_ts + offset,
        })
    return result


@pytest.fixture()
def gemini_hook_sequence() -> list[dict]:
    """Return ordered list of hook payloads simulating a Gemini session."""
    data = _load_payload("gemini_hooks.json")
    base_ts = time.time()
    session_id = data["session_id"]
    tool = data["tool"]
    cwd = data["cwd"]
    result = []
    offset = 0.0
    for ev in data["events"]:
        offset += ev.pop("_delay_ms", 0) / 1000
        result.append({
            **ev,
            "session_id": session_id,
            "tool": tool,
            "cwd": cwd,
            "ts": base_ts + offset,
        })
    return result


@pytest.fixture()
def claude_otel_metrics() -> dict:
    return _load_payload("claude_otel_metrics.json")


@pytest.fixture()
def claude_otel_logs() -> dict:
    return _load_payload("claude_otel_logs.json")


@pytest.fixture()
def copilot_otel_metrics() -> dict:
    return _load_payload("copilot_otel_metrics.json")
