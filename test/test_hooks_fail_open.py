# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A registered hook can never break or slow the host, and only safe rules get written.

These run the real handler and the real registered command line in subprocesses:
the failures they guard (interpreter gone, daemon down) do not exist in-process.
"""

from __future__ import annotations

import ast
import http.server
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl import hook_handler, hook_removal
from aictl.commands import integrations as ig
from aictl.emitters._helpers import canonical_hook_rules

SRC = Path(hook_handler.__file__).resolve().parent


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _run_shell(command: str, stdin: bytes = b"{}") -> subprocess.CompletedProcess:
    return subprocess.run(["/bin/sh", "-c", command], input=stdin, capture_output=True, timeout=10, check=False)


def _command(event: str = "PostToolUse", port: int | None = None) -> str:
    cfg = ig._build_hook_config(port or _free_port(), [event])
    return cfg[event][0]["hooks"][0]["command"]


@pytest.mark.skipif(os.name != "posix", reason="POSIX shell guard")
class TestRegisteredCommandFailsOpen:
    @pytest.mark.parametrize("payload", [b"{}", b"", b"not json", b"[1,2,3]", b'"str"', b"\xff\xfe\x00", b"{" * 5000])
    def test_daemon_down_any_payload_is_silent_and_zero(self, payload):
        proc = _run_shell(_command(), payload)
        assert (proc.returncode, proc.stdout, proc.stderr) == (0, b"", b"")

    def test_interpreter_gone(self):
        cmd = _command().replace(sys.executable, "/nonexistent/venv/bin/python")
        assert "/nonexistent/" in cmd
        proc = _run_shell(cmd)
        assert (proc.returncode, proc.stdout, proc.stderr) == (0, b"", b"")

    def test_script_gone(self):
        cmd = _command().replace(str(SRC / "hook_handler.py"), "/nonexistent/hook_handler.py")
        assert "/nonexistent/" in cmd
        proc = _run_shell(cmd)
        assert (proc.returncode, proc.stdout, proc.stderr) == (0, b"", b"")

    def test_every_registered_command_has_the_guard(self):
        rules = [
            *[r for rs in ig._build_hook_config(8484, None).values() for r in rs[0]["hooks"]],
            *[rs[0] for rs in ig._build_vscode_hook_config(8484, None, scope="user").values()],
        ]
        assert rules
        for rule in rules:
            assert rule["command"].endswith("2>/dev/null || true")
            assert " -I -S " in rule["command"]

    def test_hung_server_cannot_hold_the_hook(self):
        with socket.socket() as srv:
            srv.bind(("127.0.0.1", 0))
            srv.listen(8)  # accepts into the backlog, never answers
            port = srv.getsockname()[1]
            proc = _run_shell(_command(port=port))
        assert (proc.returncode, proc.stdout) == (0, b"")


class TestHandlerIndependence:
    def test_only_stdlib_imports(self):
        """Importing aictl here would put the package import back on the hot path."""
        tree = ast.parse((SRC / "hook_handler.py").read_text())
        names = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                names |= {a.name.split(".")[0] for a in node.names}
            elif isinstance(node, ast.ImportFrom):
                assert node.level == 0, "relative import in the hook handler"
                names.add((node.module or "").split(".")[0])
        # base64, signal and subprocess are imported inside wrap mode only; the Stop test below
        # checks that the observer path never loads them.
        assert names <= {
            "__future__",
            "json",
            "os",
            "sys",
            "time",
            "subprocess",
            "base64",
            "signal",
            "_socket",
            "socket",
        }

    def test_removal_module_imports_no_aictl(self):
        tree = ast.parse((SRC / "hook_removal.py").read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                assert node.level == 0
                assert not (node.module or "").startswith("aictl")
            elif isinstance(node, ast.Import):
                assert not any(a.name.startswith("aictl") for a in node.names)

    def test_runs_alone_in_an_empty_directory(self, tmp_path):
        script = tmp_path / "hook_handler.py"
        shutil.copy(SRC / "hook_handler.py", script)
        proc = subprocess.run(
            [sys.executable, "-I", "-S", str(script), "--event", "Stop", "--port", str(_free_port())],
            input=b"{}",
            capture_output=True,
            timeout=10,
            check=False,
        )
        assert (proc.returncode, proc.stdout, proc.stderr) == (0, b"", b"")

    def test_stdout_stays_silent_when_main_raises(self, tmp_path):
        script = tmp_path / "hook_handler.py"
        source = (SRC / "hook_handler.py").read_text()
        line = "    data = _parse_payload(raw, truncated)\n"
        assert line in source, "the line this test breaks is gone: point it at the payload parse"
        script.write_text(source.replace(line, "    1 / 0\n"))
        proc = subprocess.run(
            [sys.executable, "-I", "-S", str(script)], input=b"{}", capture_output=True, timeout=10, check=False
        )
        assert (proc.returncode, proc.stdout, proc.stderr) == (0, b"", b"")

    def test_a_stop_event_imports_nothing_beyond_the_socket(self):
        """What made the handler slow was imports (the aictl package, urllib, ssl):
        the import log of one run names every module it loaded."""
        proc = subprocess.run(
            [
                sys.executable,
                "-I",
                "-S",
                "-X",
                "importtime",
                str(SRC / "hook_handler.py"),
                "--event",
                "Stop",
                "--port",
                str(_free_port()),
            ],
            input=b"{}",
            capture_output=True,
            timeout=10,
            check=False,
        )
        assert (proc.returncode, proc.stdout) == (0, b"")
        loaded = {
            line.rsplit("|", 1)[-1].strip()
            for line in proc.stderr.decode().splitlines()
            if line.startswith("import time:")
        }
        assert "json" in loaded  # the log was read
        heavy = {
            m
            for m in loaded
            if m.split(".")[0]
            in {"aictl", "urllib", "http", "ssl", "email", "subprocess", "argparse", "uuid", "base64", "signal"}
        }
        assert not heavy, sorted(heavy)


def test_every_socket_wait_of_the_post_is_bounded(monkeypatch):
    """A hung server cannot hold the hook: connect, send and the first-byte read
    each run under a finite timeout set before them."""
    import _socket

    calls: list[tuple[str, object]] = []

    class _Sock:
        def __init__(self, *_a):
            self.timeout = None

        def settimeout(self, value):
            self.timeout = value
            calls.append(("settimeout", value))

        def _wait(self, name):
            calls.append((name, self.timeout))

        def connect(self, _addr):
            self._wait("connect")

        def sendall(self, _data):
            self._wait("sendall")

        def recv(self, _n):
            self._wait("recv")
            raise TimeoutError("timed out")

        def close(self):
            calls.append(("close", None))

    monkeypatch.setattr(_socket, "socket", _Sock)
    with pytest.raises(TimeoutError):
        hook_handler._post(1, b"{}")
    waits = {name: timeout for name, timeout in calls if name in ("connect", "sendall", "recv")}
    assert waits == {
        "connect": hook_handler._CONNECT_TIMEOUT,
        "sendall": hook_handler._CONNECT_TIMEOUT,
        "recv": hook_handler._RESPONSE_TIMEOUT,
    }
    assert all(0 < t <= 0.5 for t in waits.values())
    assert calls[-1] == ("close", None)


class _Receiver(http.server.BaseHTTPRequestHandler):
    bodies: list[dict] = []

    def do_POST(self):  # noqa: N802
        body = self.rfile.read(int(self.headers["Content-Length"]))
        type(self).bodies.append({"path": self.path, "json": json.loads(body)})
        self.send_response(200)
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"{}")

    def log_message(self, *args):
        pass


def test_payload_reaches_a_real_http_server():
    _Receiver.bodies = []
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _Receiver)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        cmd = _command(event="SessionStart", port=server.server_address[1])
        payload = json.dumps({"session_id": "s1", "cwd": "/w", "note": "é✓"}).encode()
        proc = subprocess.run(["/bin/sh", "-c", cmd], input=payload, capture_output=True, timeout=10, check=False)
    finally:
        server.shutdown()
    assert (proc.returncode, proc.stdout) == (0, b"")
    assert len(_Receiver.bodies) == 1
    got = _Receiver.bodies[0]
    assert got["path"] == "/api/hooks"
    assert got["json"]["event"] == "SessionStart"
    assert got["json"]["session_id"] == "s1"
    assert got["json"]["note"] == "é✓"
    assert got["json"]["pid"] > 0  # SessionStart joins the process
    assert got["json"]["aictl_hook"]["source"] == "root.claude-user"


def test_copilot_camel_case_session_id_reaches_the_receiver(monkeypatch):
    import io

    sent: list[bytes] = []
    monkeypatch.setattr(hook_handler, "_post", lambda port, body: sent.append(body))
    monkeypatch.setattr(sys, "argv", ["hook_handler", "--event", "SubagentStart"])
    monkeypatch.setattr(sys, "stdin", io.StringIO('{"sessionId": "s9"}'))
    hook_handler.main()
    assert json.loads(sent[0])["session_id"] == "s9"


def test_copilot_rule_key_and_receiver_label_differ_only_where_documented():
    cfg = ig._build_vscode_hook_config(8484, None, scope="user")
    assert "--event SubagentStart" in cfg["subagentStart"][0]["command"]
    assert "--event PreToolUse" in cfg["PreToolUse"][0]["command"]


def test_only_session_start_pays_for_the_process_walk(monkeypatch):
    monkeypatch.setattr(hook_handler, "tool_pid", lambda ppid: (_ for _ in ()).throw(AssertionError("ps walk")))
    sent: list[bytes] = []
    monkeypatch.setattr(hook_handler, "_post", lambda port, body: sent.append(body))
    monkeypatch.setattr(sys, "argv", ["hook_handler", "--event", "PreToolUse"])
    import io

    monkeypatch.setattr(sys, "stdin", io.StringIO("{}"))
    hook_handler.main()
    assert "pid" not in json.loads(sent[0])


class TestEventCatalogue:
    def test_nothing_host_changing_is_registered(self):
        assert not ig.NEVER_REGISTER_EVENTS & set(ig.HOOK_EVENTS)
        assert not ig.NEVER_REGISTER_EVENTS & set(ig.VSCODE_HOOK_EVENTS)
        assert not ig.NEVER_REGISTER_EVENTS & set(ig.GEMINI_HOOK_MAP.values())

    @pytest.mark.parametrize("event", sorted({"WorktreeCreate", "Elicitation", "ElicitationResult", "PreModelSwitch"}))
    def test_builder_refuses_host_changing_events(self, event):
        with pytest.raises(ValueError, match="host behaviour"):
            ig._build_hook_config(8484, [event])

    @pytest.mark.parametrize(
        ("events", "kwargs"),
        [
            (["Bogus"], {}),
            (["BeforeTool"], {}),
            (["SessionStart"], {"event_map": {"SessionStart": "Bogus"}, "source_tool": "gemini"}),
        ],
    )
    def test_builder_refuses_unknown_events(self, events, kwargs):
        with pytest.raises(ValueError, match="not a"):
            ig._build_hook_config(8484, events, **kwargs)

    def test_vscode_builder_refuses_unknown_events(self):
        with pytest.raises(ValueError, match="not a Copilot"):
            ig._build_vscode_hook_config(8484, ["Bogus"], scope="user")

    def test_install_command_refuses_host_changing_event(self, tmp_path, monkeypatch):
        monkeypatch.setattr(ig, "claude_global_dir", lambda: tmp_path)
        result = CliRunner().invoke(ig.hooks, ["install", "--events", "WorktreeCreate"])
        assert result.exit_code != 0
        assert not (tmp_path / "settings.json").exists()

    def test_catalogue_matches_verified_docs(self):
        """Pins the lists checked against vendor docs on 2026-11-05. Re-verify when changing them."""
        assert set(ig.GEMINI_HOOK_MAP.values()) <= set(ig.GEMINI_HOOK_EVENTS)
        assert set(ig.HOOK_EVENTS) <= ig.CLAUDE_KNOWN_EVENTS
        assert {"subagentStart", "errorOccurred"} <= set(ig.VSCODE_HOOK_EVENTS)  # no documented PascalCase alias

    def test_fail_open_options_on_every_rule(self):
        for event, rules in ig._build_hook_config(8484, None).items():
            inner = rules[0]["hooks"][0]
            assert inner["timeout"] == 5
            assert inner.get("async", False) is (event != "SessionEnd")
        gemini = ig._build_hook_config(
            8484,
            list(ig.GEMINI_HOOK_MAP),
            event_map=ig.GEMINI_HOOK_MAP,
            matcher="*",
            source_tool="gemini",
        )
        assert all(r[0]["hooks"][0]["timeout"] == 2000 for r in gemini.values())  # milliseconds
        assert "async" not in gemini["BeforeTool"][0]["hooks"][0]
        copilot = ig._build_vscode_hook_config(8484, None, scope="user")
        assert all(r[0]["timeoutSec"] == 5 for r in copilot.values())

    def test_copilot_file_has_required_version(self, tmp_path, monkeypatch):
        monkeypatch.setattr(ig, "copilot_global_dir", lambda: tmp_path)
        ig._install_vscode_hooks("user", 8484, [])
        assert json.loads((tmp_path / "hooks" / "aictl.json").read_text())["version"] == 1


class TestDeployEventFilter:
    def test_unknown_event_is_never_deployed(self, capsys):
        rules = canonical_hook_rules({"NotAnEvent": [{"x": 1}], "preToolUse": [{"y": 1}]}, "claude")
        assert rules == {"PreToolUse": [{"y": 1}]}
        assert "NotAnEvent" in capsys.readouterr().err

    def test_events_do_not_cross_tools(self, capsys):
        assert canonical_hook_rules({"BeforeTool": [{}]}, "claude") == {}
        assert canonical_hook_rules({"PreToolUse": [{}]}, "gemini") == {}
        assert canonical_hook_rules({"BeforeTool": [{}]}, "gemini") == {"BeforeTool": [{}]}
        assert "BeforeTool" in capsys.readouterr().err


class TestRegistrationIsExplicit:
    def test_only_cli_commands_reach_the_registration_functions(self):
        """No daemon, dashboard or deploy code path may install observer hooks."""
        allowed = {"commands/integrations.py"}
        pattern = re.compile(r"\b(_install_hooks|_register_hook_file|_install_vscode_hooks|_build_hook_config)\b")
        offenders = [
            str(p.relative_to(SRC))
            for p in SRC.rglob("*.py")
            if str(p.relative_to(SRC)) not in allowed and pattern.search(p.read_text(encoding="utf-8"))
        ]
        assert offenders == []

    def test_registration_runs_only_from_named_click_commands(self):
        """Inside integrations.py the installers are reached only by `enable` and `hooks install`."""
        tree = ast.parse((SRC / "commands" / "integrations.py").read_text(encoding="utf-8"))
        callers = {
            node.name
            for node in ast.walk(tree)
            if isinstance(node, ast.FunctionDef)
            and any(
                isinstance(c, ast.Call) and getattr(c.func, "id", "") in ("_install_hooks", "_register_hook_file")
                for c in ast.walk(node)
            )
        }
        assert callers == {"enable", "install", "_install_hooks", "register", "_install_vscode_hooks"}

    @pytest.fixture
    def git_project(self, tmp_path, monkeypatch):
        if not shutil.which("git"):
            pytest.skip("git not available")
        home = tmp_path / "home"
        home.mkdir()
        monkeypatch.setenv("HOME", str(home))
        proj = tmp_path / "proj"
        proj.mkdir()
        subprocess.run(["git", "init", "-q", str(proj)], check=True)
        monkeypatch.chdir(proj)
        return proj

    def test_project_scope_skips_files_the_repo_would_commit(self, git_project):
        actions: list[str] = []
        ig._install_hooks("project", 8484, actions)
        ig._enable_vscode("project", 8484, actions)
        assert (git_project / ".claude" / "settings.local.json").exists()
        assert not (git_project / ".gemini" / "settings.json").exists()
        assert not (git_project / ".github" / "hooks" / "aictl.json").exists()
        assert not (git_project / ".vscode" / "settings.json").exists()
        assert sum("skipped" in a for a in actions) == 3

    def test_project_scope_writes_gitignored_files(self, git_project):
        (git_project / ".gitignore").write_text(".gemini/\n.github/hooks/\n")
        ig._install_hooks("project", 8484, [])
        assert (git_project / ".gemini" / "settings.json").exists()
        assert (git_project / ".github" / "hooks" / "aictl.json").exists()

    def test_project_enable_leaves_machine_wide_state_alone(self, git_project, monkeypatch):
        monkeypatch.setattr(ig, "_enable_otel", lambda *a, **k: pytest.fail("project enable touched OTel"))
        result = CliRunner().invoke(ig.enable, ["--scope", "project"], catch_exceptions=False)
        assert result.exit_code == 0, result.output


def test_redirected_home_never_counts_as_real(tmp_path):
    assert hook_removal.is_real_home(tmp_path) is False


# ── Wrap mode: a user's hook through the handler, unchanged ────────────────────

_WRAP_HANDLER = str(SRC / "hook_handler.py")


def _wrapped(original: str, port: int, *, handler: str = _WRAP_HANDLER, event: str = "PreToolUse") -> str:
    return hook_removal.wrap_command(
        original, python=sys.executable, handler=handler, event=event, port=port, source="root.claude-user"
    )


class _Reports(http.server.BaseHTTPRequestHandler):
    """Receives the wrapper's reports; ``arrived`` is set on each."""

    bodies: list[dict] = []
    arrived = threading.Event()

    def do_POST(self):  # noqa: N802
        body = self.rfile.read(int(self.headers["Content-Length"]))
        type(self).bodies.append(json.loads(body))
        self.send_response(200)
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"{}")
        type(self).arrived.set()

    def log_message(self, *args):
        pass


@pytest.fixture
def reports():
    _Reports.bodies = []
    _Reports.arrived = threading.Event()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _Reports)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield server.server_address[1], _Reports
    server.shutdown()


def _outcome(command: str, stdin: bytes, **kw) -> tuple[int, bytes, bytes]:
    proc = subprocess.run(["/bin/sh", "-c", command], input=stdin, capture_output=True, timeout=20, check=False, **kw)
    return proc.returncode, proc.stdout, proc.stderr


@pytest.mark.skipif(os.name != "posix", reason="wrap mode is POSIX only")
class TestWrapPassThrough:
    @pytest.mark.parametrize("code", [0, 2, 7])
    @pytest.mark.parametrize("stdin", [b'{"session_id": "s1", "tool_name": "Bash"}', b"not json", b"line\n", b""])
    @pytest.mark.parametrize("daemon", [False, True])
    def test_output_exit_code_and_stdin_are_the_commands_own(self, code, stdin, daemon, reports):
        port = reports[0] if daemon else _free_port()
        original = f"cat; printf 'to stderr' >&2; exit {code}"
        direct = _outcome(original, stdin)
        assert direct == (code, stdin, b"to stderr")  # the command echoes stdin byte for byte
        assert _outcome(_wrapped(original, port), stdin) == direct

    def test_environment_and_folder_reach_the_command(self, tmp_path):
        original = 'printf "%s|%s" "$AICTL_WRAP_TEST" "$(pwd)"'
        env = {**os.environ, "AICTL_WRAP_TEST": "v a l"}
        direct = _outcome(original, b"", env=env, cwd=tmp_path)
        assert direct[0] == 0 and direct[1].startswith(b"v a l|") and direct[1].endswith(tmp_path.name.encode())
        assert _outcome(_wrapped(original, _free_port()), b"", env=env, cwd=tmp_path) == direct

    def test_a_missing_handler_runs_the_original(self):
        original = "cat; echo done >&2; exit 7 # a trailing comment"
        command = _wrapped(original, _free_port(), handler="/nonexistent/aictl/hook_handler.py")
        assert _outcome(command, b"in") == (7, b"in", b"done\n")
        gone_python = command.replace(sys.executable, "/nonexistent/bin/python")
        assert _outcome(gone_python, b"in") == (7, b"in", b"done\n")

    def test_a_command_killed_by_a_signal_gives_128_plus_n(self):
        assert _outcome(_wrapped("kill -TERM $$", _free_port()), b"")[0] == 128 + 15

    def test_an_unreadable_command_gives_127_and_a_missing_shell_falls_back(self):
        base = [sys.executable, "-I", "-S", _WRAP_HANDLER, "--sh", "/nonexistent/sh", "--wrap-b64"]
        assert subprocess.run([*base, "!!"], input=b"", capture_output=True, timeout=20).returncode == 127
        b64 = hook_removal.base64.b64encode(b"exit 5").decode()
        assert subprocess.run([*base, b64], input=b"", capture_output=True, timeout=20).returncode == 5

    def test_the_report_carries_the_envelope_and_the_result(self, reports):
        port, receiver = reports
        payload = json.dumps({"session_id": "s1", "hook_event_name": "PreToolUse", "tool_name": "Bash"}).encode()
        original = """printf '{"decision": "block"}'; printf 'e' >&2; exit 2"""
        assert _outcome(_wrapped(original, port), payload) == (2, b'{"decision": "block"}', b"e")
        assert receiver.arrived.wait(15), "no report reached the receiver"
        body = receiver.bodies[0]
        meta = body["aictl_hook"]
        assert meta["v"] == 1 and len(meta["call_id"]) == 32 and meta["payload_bytes"] == len(payload)
        assert meta["source"] == "root.claude-user" and body["event"] == "PreToolUse"
        assert body["session_id"] == "s1" and body["tool_name"] == "Bash"
        wrapped = meta["wrapped"]
        assert wrapped["command"] == original
        assert (wrapped["exit_code"], wrapped["stdout_bytes"], wrapped["stderr_bytes"]) == (2, 21, 1)
        assert wrapped["stdout"] == '{"decision": "block"}'
        assert wrapped["duration_ms"] > 0 and wrapped["overhead_ms"] >= 0

    def test_binary_stdout_is_counted_not_reported(self, reports):
        port, receiver = reports
        assert _outcome(_wrapped("printf '\\377\\376'", port), b"{}") == (0, b"\xff\xfe", b"")
        assert receiver.arrived.wait(15)
        wrapped = receiver.bodies[0]["aictl_hook"]["wrapped"]
        assert wrapped["stdout_bytes"] == 2 and "stdout" not in wrapped

    def test_a_wrapper_failure_before_the_command_still_runs_the_command(self):
        """Monitoring, never control: a hook that blocks must block when the wrapper breaks."""
        b64 = hook_removal.base64.b64encode(b"cat >/dev/null; printf out; exit 2").decode()
        script = (
            "import os, sys\n"
            f"sys.path.insert(0, {str(SRC)!r})\n"
            "import hook_handler as h\n"
            "def boom(_name):\n    raise RuntimeError('wrapper bug')\n"
            "h._resolve_shell = boom\n"
            f"sys.argv = ['h', '--event', 'PreToolUse', '--port', '1', '--wrap-b64', {b64!r}]\n"
            "os._exit(h.main())\n"
        )
        proc = subprocess.run([sys.executable, "-c", script], input=b"{}", capture_output=True, timeout=20)
        assert (proc.returncode, proc.stdout) == (2, b"out")

    @pytest.mark.parametrize("original", ["# switched off", "exit 3 # why", "true\n# last line is a comment"])
    def test_a_comment_only_command_keeps_its_exit_code_either_way(self, original):
        direct = _outcome(original, b"")
        assert _outcome(_wrapped(original, _free_port()), b"") == direct
        assert _outcome(_wrapped(original, _free_port(), handler="/nonexistent/hook_handler.py"), b"") == direct

    def test_a_call_too_large_for_the_server_is_reported_cut(self, reports):
        port, receiver = reports
        payload = json.dumps({"session_id": "s1", "tool_name": "Write", "tool_input": {"content": "x" * 1_200_000}})
        assert _outcome(_wrapped("cat >/dev/null; exit 0", port), payload.encode())[0] == 0
        assert receiver.arrived.wait(15), "no report reached the receiver"
        body = receiver.bodies[0]
        assert len(json.dumps(body)) < 1_000_000 and "tool_input" not in body
        assert body["session_id"] == "s1" and body["tool_name"] == "Write"
        assert body["aictl_hook"]["truncated"] is True and body["aictl_hook"]["payload_bytes"] == len(payload)
        assert body["aictl_hook"]["wrapped"]["exit_code"] == 0

    def test_observer_mode_never_imports_the_wrap_modules(self):
        source = (SRC / "hook_handler.py").read_text()
        top = ast.parse(source)
        top_level = {a.name for n in top.body if isinstance(n, ast.Import) for a in n.names}
        assert not top_level & {"subprocess", "base64", "signal", "uuid", "argparse"}


# ── hooks wrap / unwrap on a settings file ─────────────────────────────────────

_TRICKY = [
    "echo 'single' \"double\" $HOME # a comment",
    "printf '%s' \"héllo ✓\"; exit 0",
    "~/bin/guard.sh --flag='a b'",
]


def _user_settings(path: Path) -> str:
    data = {
        "model": "opus",
        "hooks": {
            "PreToolUse": [
                {"matcher": "Bash", "hooks": [{"type": "command", "command": _TRICKY[0], "timeout": 30}]},
                {"matcher": "", "hooks": [{"type": "http", "url": "http://example.invalid/hook"}]},
            ],
            "Stop": [
                {
                    "hooks": [
                        {"type": "command", "command": _TRICKY[1]},
                        {"type": "command", "command": _TRICKY[2], "async": True},
                    ]
                }
            ],
        },
    }
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return text


def _commands(path: Path) -> list[str]:
    hooks = json.loads(path.read_text(encoding="utf-8"))["hooks"]
    return [e["command"] for _e, _r, e in hook_removal._command_entries(hooks)]


@pytest.mark.skipif(os.name != "posix", reason="wrap is POSIX only")
class TestWrapCommand:
    @pytest.fixture
    def settings(self, tmp_path, monkeypatch):
        path = tmp_path / "claude" / "settings.json"
        monkeypatch.setattr(ig, "claude_global_dir", lambda: tmp_path / "claude")
        monkeypatch.setenv("HOME", str(tmp_path))
        monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))
        monkeypatch.setattr(ig, "_shell_profiles", lambda: [])
        return path

    def _run(self, *args):
        result = CliRunner().invoke(ig.hooks, list(args), catch_exceptions=False)
        assert result.exit_code == 0, result.output
        return result.output

    def test_wrap_then_unwrap_restores_the_file(self, settings):
        before = _user_settings(settings)
        out = self._run("wrap", "--port", "9")
        assert "Wrapped 3 user hook command(s)" in out and "type 'http'" in out
        commands = _commands(settings)
        assert [hook_removal.wrapped_original(c) for c in commands] == _TRICKY
        data = json.loads(settings.read_text())
        entry = data["hooks"]["PreToolUse"][0]
        assert entry["matcher"] == "Bash" and entry["hooks"][0]["timeout"] == 30  # nothing else changes
        assert data["hooks"]["Stop"][0]["hooks"][1]["async"] is True
        assert data["hooks"]["PreToolUse"][1] == {
            "matcher": "",
            "hooks": [{"type": "http", "url": "http://example.invalid/hook"}],
        }
        assert "--event PreToolUse --port 9 --source root.claude-user" in commands[0]
        self._run("unwrap")
        assert settings.read_text(encoding="utf-8") == before

    def test_wrapping_twice_wraps_once_and_a_new_port_rewrites(self, settings):
        _user_settings(settings)
        self._run("wrap", "--port", "9")
        once = settings.read_text()
        assert "already wrapped: 3" in self._run("wrap", "--port", "9")
        assert settings.read_text() == once
        self._run("wrap", "--port", "10")
        commands = _commands(settings)
        assert all("--port 10 " in c for c in commands)
        assert [hook_removal.wrapped_original(c) for c in commands] == _TRICKY

    def test_a_wrapped_hook_still_runs_its_original(self, settings, tmp_path):
        _user_settings(settings)
        self._run("wrap", "--port", str(_free_port()))
        for original, command in zip(_TRICKY[:2], _commands(settings)[:2], strict=True):
            env = {**os.environ, "HOME": str(tmp_path)}
            assert _outcome(command, b"{}", env=env) == _outcome(original, b"{}", env=env)

    def test_windows_changes_nothing(self, settings, monkeypatch):
        before = _user_settings(settings)
        monkeypatch.setattr(ig, "IS_WINDOWS", True)
        assert "not supported on Windows" in self._run("wrap")
        assert settings.read_text() == before

    def test_a_command_the_shell_cannot_parse_wrapped_is_left_alone(self, settings):
        _user_settings(settings)
        data = json.loads(settings.read_text(encoding="utf-8"))
        broken = "echo 'never closed"
        data["hooks"]["Stop"][0]["hooks"][0]["command"] = broken
        settings.write_text(json.dumps(data, indent=2), encoding="utf-8")
        out = self._run("wrap", "--port", "9")
        assert "Wrapped 2 user hook command(s)" in out and "cannot parse" in out
        assert broken in _commands(settings)

    def test_a_hand_edited_wrapped_hook_is_still_the_users(self, settings):
        """An edit that breaks the wrapped shape must not make uninstall delete the user's hook."""
        _user_settings(settings)
        self._run("wrap", "--port", "9")
        edited = settings.read_text(encoding="utf-8").replace('\\nfi"', '\\nfi # mine"', 1)
        assert edited != settings.read_text(encoding="utf-8")
        settings.write_text(edited, encoding="utf-8")
        count = len(_commands(settings))
        self._run("uninstall", "--scope", "user")
        commands = _commands(settings)
        assert len(commands) == count
        assert sum(c.endswith("fi # mine") and hook_removal.WRAP_FLAG in c for c in commands) == 1

    def test_dry_run_changes_nothing(self, settings):
        before = _user_settings(settings)
        assert "[dry-run] would wrap 3" in self._run("wrap", "--dry-run")
        assert settings.read_text() == before

    def test_a_wrapped_user_hook_is_never_aictls(self, settings):
        """The wrapped command holds aictl/hook_handler.py, the legacy marker of an aictl rule."""
        _user_settings(settings)
        self._run("wrap", "--port", "9")
        hooks = json.loads(settings.read_text())["hooks"]
        assert not any(hook_removal.is_aictl_rule(r) for rules in hooks.values() for r in rules)
        assert hook_removal.strip_rules(hooks) == (hooks, 0)
        assert "wrapped user hooks: 3" in CliRunner().invoke(ig.hooks, ["status"]).output

    def test_install_and_reinstall_keep_wrapped_user_hooks(self, settings):
        _user_settings(settings)
        self._run("wrap", "--port", "9")
        wrapped = _commands(settings)
        for _ in range(2):  # install, then reinstall over it
            self._run("install", "--force", "--port", "9")
            commands = _commands(settings)
            assert [c for c in commands if hook_removal.wrapped_original(c)] == wrapped
            assert sum("--wrap-b64" not in c and "hook_handler.py" in c for c in commands) == len(ig.HOOK_EVENTS)

    def test_uninstall_restores_wrapped_user_hooks(self, settings):
        _user_settings(settings)
        self._run("install", "--force", "--port", "9")
        self._run("wrap", "--port", "9")
        self._run("uninstall")
        assert _commands(settings) == _TRICKY

    def test_disable_restores_wrapped_user_hooks(self, settings):
        from aictl.commands.disable import disable

        _user_settings(settings)
        self._run("install", "--force", "--port", "9")
        self._run("wrap", "--port", "9")
        result = CliRunner().invoke(disable, [], catch_exceptions=False)
        assert result.exit_code == 0, result.output
        assert _commands(settings) == _TRICKY

    def test_the_removal_script_alone_restores_them(self, settings):
        before = _user_settings(settings)
        self._run("wrap", "--port", "9")
        sink = hook_removal._Sink(dry_run=False)
        assert hook_removal.remove_from_hook_file(settings, sink) == 0
        assert settings.read_text(encoding="utf-8") == before
