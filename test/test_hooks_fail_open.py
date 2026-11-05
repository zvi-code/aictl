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
import time
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
            start = time.monotonic()
            proc = _run_shell(_command(port=port))
            elapsed = time.monotonic() - start
        assert (proc.returncode, proc.stdout) == (0, b"")
        assert elapsed < 1.5


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
        assert names <= {"__future__", "json", "os", "sys", "subprocess", "_socket", "socket"}

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
        script.write_text((SRC / "hook_handler.py").read_text().replace("    data = _read_payload()\n", "    1 / 0\n"))
        proc = subprocess.run(
            [sys.executable, "-I", "-S", str(script)], input=b"{}", capture_output=True, timeout=10, check=False
        )
        assert (proc.returncode, proc.stdout, proc.stderr) == (0, b"", b"")

    def test_wall_time_budget(self):
        """Tolerant budget (the handler takes ~20 ms): catches the package import coming back."""
        best = min(self._timed_run() for _ in range(5))
        assert best < 0.150, f"hook handler took {best * 1000:.0f} ms"

    @staticmethod
    def _timed_run() -> float:
        start = time.perf_counter()
        subprocess.run(
            [sys.executable, "-I", "-S", str(SRC / "hook_handler.py"), "--event", "Stop", "--port", str(_free_port())],
            input=b"{}",
            capture_output=True,
            timeout=10,
            check=False,
        )
        return time.perf_counter() - start


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
