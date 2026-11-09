"""Shared test fixtures — aictl server handle used by both e2e/ and e2e_tools/."""

from __future__ import annotations

import atexit
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

# ── Real-machine isolation ────────────────────────────────────────
# The suite runs real install/uninstall/enable code, and that code resolves its
# targets through Path.home(). Without this, a plain `pytest` rewrites the
# developer's ~/.gemini/settings.json and ~/.config/aictl/env.sh, and CLI
# subprocesses append to their real mutation ledger. So: HOME is replaced before
# anything imports aictl (subprocesses inherit it), and an audit hook rejects any
# write that still reaches a real tool config location.
# `make test-tools` opts out, because real CLIs need the real login state.

REAL_HOME_ALLOWED = os.environ.get("AICTL_TEST_REAL_HOME") == "1"

_PROTECTED_RELATIVE = (
    ".agents",
    ".bash_profile",
    ".bashrc",
    ".claude",
    ".claude.json",
    ".codeium",
    ".codex",
    ".config/Code",
    ".config/Cursor",
    ".config/aictl",
    ".copilot",
    ".cursor",
    ".gemini",
    ".profile",
    ".windsurf",
    ".zprofile",
    ".zshenv",
    ".zshrc",
    "AppData/Roaming/Claude",
    "AppData/Roaming/Code",
    "AppData/Roaming/Code - Insiders",
    "AppData/Roaming/Cursor",
    "AppData/Roaming/Windsurf",
    "AppData/Roaming/aictl",
    "Documents/PowerShell",
    "Documents/WindowsPowerShell",
    "Library/Application Support/Claude",
    "Library/Application Support/Code",
    "Library/Application Support/Cursor",
    "Library/Application Support/Windsurf",
)


def _real_home() -> Path:
    try:
        import pwd
    except ImportError:  # Windows
        return Path.home()
    return Path(pwd.getpwuid(os.getuid()).pw_dir)


REAL_HOME = _real_home()
_PROTECTED = tuple(os.path.normcase(str(REAL_HOME / relative)) for relative in _PROTECTED_RELATIVE)
_WRITE_FLAGS = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND
_real_home_violations: list[str] = []


def _is_protected(path: object) -> bool:
    if isinstance(path, bytes):
        path = os.fsdecode(path)
    if not isinstance(path, (str, os.PathLike)):
        return False  # a file descriptor, or an unnamed database
    resolved = os.path.normcase(os.path.abspath(os.fspath(path)))
    return any(resolved == root or resolved.startswith(root + os.sep) for root in _PROTECTED)


def _guard_real_home(event: str, args: tuple) -> None:
    if event == "open":
        path, mode, flags = args
        writing = (isinstance(mode, str) and any(c in mode for c in "wax+")) or (
            isinstance(flags, int) and bool(flags & _WRITE_FLAGS)
        )
        targets = (path,) if writing else ()
    elif event == "os.rename":
        targets = args[:2]
    elif event in ("os.remove", "os.mkdir", "os.rmdir", "os.truncate", "sqlite3.connect"):
        targets = args[:1]
    else:
        return
    for target in targets:
        if _is_protected(target):
            message = f"test tried to touch real config ({event}): {os.fsdecode(target)}"
            # Recorded as well as raised: production code that swallows the
            # exception must not turn this back into a silent pass.
            _real_home_violations.append(message)
            raise PermissionError(message)


if not REAL_HOME_ALLOWED:
    _test_home = tempfile.mkdtemp(prefix="aictl-test-home-")
    atexit.register(shutil.rmtree, _test_home, ignore_errors=True)
    os.environ["HOME"] = _test_home
    os.environ["USERPROFILE"] = _test_home
    os.environ["XDG_CONFIG_HOME"] = os.path.join(_test_home, ".config")
    # On Windows, aictl and VS Code resolve their config through these, not HOME.
    os.environ["APPDATA"] = os.path.join(_test_home, "AppData", "Roaming")
    os.environ["LOCALAPPDATA"] = os.path.join(_test_home, "AppData", "Local")
    os.environ.pop("HOMEDRIVE", None)
    os.environ.pop("HOMEPATH", None)
    # These would point tool paths straight back at the real directories.
    for _variable in ("CLAUDE_CONFIG_DIR", "CODEX_HOME", "COPILOT_HOME"):
        os.environ.pop(_variable, None)
    # Temp-repo commits in tests have no global git identity under this HOME.
    for _role in ("AUTHOR", "COMMITTER"):
        os.environ.setdefault(f"GIT_{_role}_NAME", "aictl tests")
        os.environ.setdefault(f"GIT_{_role}_EMAIL", "tests@aictl.invalid")
    sys.addaudithook(_guard_real_home)


def pytest_sessionfinish(session) -> None:
    if _real_home_violations:
        session.exitstatus = 1


def pytest_terminal_summary(terminalreporter) -> None:
    if _real_home_violations:
        terminalreporter.section("writes to real config were blocked", red=True)
        for line in sorted(set(_real_home_violations)):
            terminalreporter.line(line)


@pytest.fixture()
def real_home_violations() -> list[str]:
    """The guard's record, for tests that trigger it on purpose and clear it."""
    return _real_home_violations


@pytest.fixture(autouse=True)
def _discovery_not_lazy():
    """A test that starts the collection service turns on lazy discovery; the next test must not inherit it."""
    yield
    from aictl import tree_walk

    if tree_walk.is_lazy():
        tree_walk.set_lazy(False)
    worker = tree_walk._worker
    if worker is not None:
        worker.join(timeout=30)  # a pass still running would read the next test's folders
        assert not worker.is_alive(), "worker did not finish: a hang fails the test instead of stalling the run"


class _SteppingClock:
    """A wall clock that moves one second forward on every read."""

    def __init__(self, start: float) -> None:
        self._next = start

    def __call__(self) -> float:
        now, self._next = self._next, self._next + 1.0
        return now


@pytest.fixture()
def history_clock(monkeypatch) -> _SteppingClock:
    """The history store's ``time.time()``, one second apart on every call.

    A file version is keyed by the time it was stored: two writes in one clock tick
    would be one version. Tests used to sleep between writes for that.
    """
    import types

    from aictl import storage

    clock = _SteppingClock(time.time())
    fake = types.SimpleNamespace(**{n: getattr(time, n) for n in dir(time) if not n.startswith("_")})
    fake.time = clock
    monkeypatch.setattr(storage, "time", fake)
    return clock


@pytest.fixture(autouse=True, scope="session")
def _fast_server_shutdown():
    """``serve_forever`` checks for shutdown every 0.5 s; a test server's teardown waited that long."""
    import socketserver

    original = socketserver.BaseServer.serve_forever

    def serve_forever(self, poll_interval=0.05):
        return original(self, poll_interval)

    socketserver.BaseServer.serve_forever = serve_forever
    yield
    socketserver.BaseServer.serve_forever = original


@pytest.fixture(autouse=True)
def _aictl_assume_yes(monkeypatch):
    """Tests run in non-TTY context; explicitly approve writes so WriteGuard
    doesn't abort. Individual tests can override via monkeypatch.delenv."""
    monkeypatch.setenv("AICTL_ASSUME_YES", "1")


@pytest.fixture(autouse=True)
def _isolated_mutation_ledger(monkeypatch, tmp_path):
    """Keep every ledger write the suite triggers out of the developer's real
    ~/.config/aictl/mutation-log.jsonl. Every settings/hook/env write now
    records an entry, so without this the test run would append hundreds of
    tmp-path entries to the user's audit trail."""
    from aictl import mutation_ledger

    monkeypatch.setattr(mutation_ledger, "_ledger_path", lambda: tmp_path / "mutation-log.jsonl")


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
        time.sleep(0.05)
    raise TimeoutError(f"{url} not ready after {timeout}s: {last_err}")


@dataclass
class ServerHandle:
    """Running aictl daemon serve process with convenience helpers."""

    port: int
    db_path: Path
    proc: subprocess.Popen
    base_url: str = field(init=False)

    def __post_init__(self) -> None:
        self.base_url = f"http://127.0.0.1:{self.port}"

    def get(self, path: str, **params: str) -> Any:
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{self.base_url}{path}" + (f"?{qs}" if qs else "")
        with urlopen(url, timeout=10) as resp:
            return json.loads(resp.read())

    def post(self, path: str, body: dict | list) -> Any:
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
        return self.post("/api/hooks", payload)

    def post_otel_metrics(self, payload: dict) -> dict:
        return self.post("/v1/metrics", payload)

    def post_otel_logs(self, payload: dict) -> dict:
        return self.post("/v1/logs", payload)

    def post_otel_traces(self, payload: dict) -> dict:
        return self.post("/v1/traces", payload)

    def _read_db(self, read: Any) -> Any:
        """Run *read(db)* against the server's stores: its machine file and every project store.

        A session with a project cwd is kept in that project's store, so reading the
        machine file alone misses it.
        """
        from aictl.project_stores import ProjectStores

        db = ProjectStores(db_path=str(self.db_path), flush_interval=0)
        try:
            return read(db)
        finally:
            db.close()

    def get_sessions(self, since: str = "0") -> list[dict]:
        """Session rows the server stored, read from its database.

        No REST route lists session rows; the board reads the same table.
        A row without ``ended_at`` is active.
        """
        rows = self._read_db(lambda db: db.query_sessions(since=float(since)))
        for r in rows:
            r["active"] = not r.get("ended_at")
            r["lifecycle_status"] = "ended" if r.get("ended_at") else "active"
        return rows

    def get_file_writes(self, session_id: str) -> list[dict]:
        """File writes the server stored for *session_id*."""
        return self._read_db(lambda db: db.query_file_writes(session_id=session_id))

    def get_events(self, *, timeout: float = 15, min_count: int = 0, **kw) -> list[dict]:
        """Query /api/events, polling until *min_count* results appear.

        The server flushes its buffers within a second of a hook while a client
        watches, so a query may return empty at first.
        """
        deadline = time.monotonic() + timeout
        while True:
            result = self.get("/api/events", **kw)
            if len(result) >= min_count or time.monotonic() >= deadline:
                return result
            time.sleep(0.05)

    def get_otel_status(self) -> dict:
        return self.get("/api/otel-status")

    def poll(
        self,
        path: str,
        *,
        check: callable,
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
            time.sleep(0.05)
        return result


@pytest.fixture(scope="session")
def aictl_server(tmp_path_factory) -> ServerHandle:
    """Start ``aictl daemon serve`` on a random port, yield handle, cleanup."""
    port = _find_free_port()
    db_dir = tmp_path_factory.mktemp("e2e")
    db_path = db_dir / "e2e_test.db"

    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    cli_invoke = "import sys; sys.argv = ['aictl'] + sys.argv[1:]; from aictl.cli import main; main()"
    proc = subprocess.Popen(
        [
            _PYTHON,
            "-c",
            cli_invoke,
            "daemon",
            "serve",
            "--port",
            str(port),
            "--no-open",
            "--no-monitor",
            "--db",
            str(db_path),
            "--root",
            str(REPO_ROOT),
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
            f"aictl serve failed to start on :{port}\nstdout: {stdout.decode()[:500]}\nstderr: {stderr.decode()[:500]}"
        )

    handle = ServerHandle(port=port, db_path=db_path, proc=proc)
    yield handle

    proc.send_signal(signal.SIGTERM)
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=3)
