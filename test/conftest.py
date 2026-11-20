"""Shared test fixtures — aictl server handle used by both e2e/ and e2e_tools/."""

from __future__ import annotations

import atexit
import json
import os
import shutil
import sys
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def kusto_tape(request):
    from kusto_replay import Tape

    tape = Tape(Path(request.module.__file__).stem)
    yield tape
    tape.save()


@pytest.fixture
def kusto_store(kusto_tape, monkeypatch, request):
    from kusto_replay import LOCAL_NODE, FixturePath, SeededStore

    from aictl.dashboard import node_views
    from aictl.dashboard.projections import history

    monkeypatch.setattr(history, "local_node_id", lambda: LOCAL_NODE)
    monkeypatch.setattr(node_views, "local_node_id", lambda: LOCAL_NODE)
    path = FixturePath(request.getfixturevalue("tmp_path")) if "tmp_path" in request.fixturenames else None
    return SeededStore(kusto_tape, fixture_path=path)


@pytest.fixture
def dashboard_store(kusto_store):
    from kusto_replay import FixtureWriter

    from aictl.orchestrator import SnapshotStore
    from aictl.stores import Store

    writer = FixtureWriter(kusto_store.facts)
    store = SnapshotStore(history_store=Store(reader=kusto_store.history_store.reader, writer=writer),
                          keeps_text=lambda: True)
    return store


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
_SESSION_SCRATCH = None
if scratch := os.environ.get("AICTL_TEST_SESSION_SCRATCH"):
    candidate = Path(scratch).resolve(strict=True)
    sessions = (REAL_HOME / ".copilot" / "session-state").resolve()
    relative = candidate.relative_to(sessions)
    if (len(relative.parts) != 3 or relative.parts[1] != "files"
            or relative.parts[2] not in {"r2-scratch", "r3-scratch", "p3be-scratch", "sd-scratch"}):
        raise ValueError("Use the session's designated scratch directory under files")
    _SESSION_SCRATCH = os.path.normcase(str(candidate))
_WRITE_FLAGS = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND
_real_home_violations: list[str] = []


def _is_protected(path: object) -> bool:
    if isinstance(path, bytes):
        path = os.fsdecode(path)
    if not isinstance(path, (str, os.PathLike)):
        return False  # a file descriptor, or an unnamed database
    resolved = os.path.normcase(os.path.abspath(os.fspath(path)))
    if _SESSION_SCRATCH and resolved.startswith(_SESSION_SCRATCH + os.sep):
        destination = os.path.normcase(str(Path(resolved).resolve()))
        if destination.startswith(_SESSION_SCRATCH + os.sep):
            return False
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
    # The test home hides config.toml but not a Kusto target inherited from the shell.
    if os.environ.get("AICTL_PARITY_DB") != "aictl_perf_test":
        for _variable in tuple(os.environ):
            if _variable.startswith("AICTL_KUSTO_"):
                os.environ.pop(_variable)
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


@dataclass
class ServerHandle:
    """Test HTTP server and its captured facts."""

    port: int
    facts: Any
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

    def get_sessions(self, since: str = "0") -> list[dict]:
        """Return the captured current session rows."""
        rows = [dict(row) for row in self.facts.rows["sessions"] if row["started_at"] >= float(since)]
        for r in rows:
            r["active"] = not r.get("ended_at")
            r["lifecycle_status"] = "ended" if r.get("ended_at") else "active"
        return rows

    def get_file_writes(self, session_id: str) -> list[dict]:
        """File writes the server stored for *session_id*."""
        return [dict(row) for row in self.facts.rows["file_write_events"] if row["session_id"] == session_id]

    def get_events(self, *, timeout: float = 15, min_count: int = 0, **kw) -> list[dict]:
        """Query /api/events, polling until *min_count* results appear."""
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
    """Run the collection service and HTTP server with in-memory history."""
    from kusto_replay import Facts, FixtureWriter

    from aictl import kusto, stores
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import CollectionService
    from aictl.stores.testing import FixtureReader

    facts = Facts()

    def events(params):
        text = {row["source_key"]: row["detail"] for row in facts.rows["events_text"]}
        rows = [
            {"pid": 0, "session_id": "", **row, "detail": text.get(row["source_key"], row["detail"])}
            for row in facts.rows["events"]
            if (params.get("since") is None or row["ts"] >= params["since"])
            and (params.get("until") is None or row["ts"] <= params["until"])
            and (not params.get("requested_session") or row.get("session_id") == params["requested_session"])
            and (not params.get("requested_tool") or row["tool"] == params["requested_tool"])
            and (not params.get("requested_kinds") or row["kind"] in params["requested_kinds"])
        ]
        return sorted(rows, key=lambda row: row["ts"], reverse=True)

    reader = FixtureReader({
        "events.page": lambda p: events(p)[:p["limit"]],
        "events.count": lambda p: [{"count": len(events(p))}],
        "samples.metrics": lambda p: [{"metric": metric} for metric in sorted({
            row["metric"] for row in facts.rows["metrics"] if row["metric"].startswith(p.get("metric_prefix", ""))
        })],
    })
    history = stores.Store(reader=reader, writer=FixtureWriter(facts))
    root = tmp_path_factory.mktemp("e2e")
    service = CollectionService(root, include_live_monitor=False)
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(kusto, "kusto_settings", lambda: kusto.KustoSettings("https://e2e.invalid", auth="none"))
        patch.setattr(stores, "open_store", lambda *_args, **_kwargs: history)
        patch.setattr("aictl.orchestrator.restart_directory", lambda *_args: root / "state")
        service.open_stores(quiet=True)
    server = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, service.store, service.allowed, root,
                                  start_ingesters_now=False)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        service.run(quiet=True)
        yield ServerHandle(port=server.server_port, facts=facts)
    finally:
        server.shutdown()
        worker.join(timeout=5)
        server.server_close()
        service.stop()
