"""IS_WINDOWS branches exercised by monkeypatching on any OS (simulated, not run on Windows)."""

from __future__ import annotations

import io
import os
import struct
import subprocess
import sys
import types
from pathlib import Path

import pytest

from aictl import platforms as P
from aictl import utils as U
from aictl.commands import admin, daemon


@pytest.fixture
def windows(monkeypatch):
    monkeypatch.setattr(P, "IS_WINDOWS", True)
    monkeypatch.setattr(P, "IS_MACOS", False)


# ── paths ──────────────────────────────────────────────────────────


def test_path_comparison_ignores_case_and_separator(windows):
    assert P.is_path_under(r"C:\Users\Dev\.COPILOT\mcp.json", r"c:/users/dev/.copilot")
    assert P.is_path_under(r"C:\Users\Dev", r"C:\users\dev\\")
    assert not P.is_path_under(r"C:\Users\Dev2\x", r"C:\Users\Dev")
    assert P.path_key(r"C:\A\b") == P.path_key("c:/a/B")


def test_process_basename_splits_backslashes(windows):
    assert P.process_basename(r"C:\Program Files\nodejs\node.exe") == "node.exe"


@pytest.mark.parametrize(
    "path,tool",
    [
        (r"C:\Users\D\AppData\Roaming\Code\User\globalStorage\github.copilot-chat\x", "copilot-vscode"),
        (r"C:\Users\D\AppData\Roaming\Code - Insiders\User\settings.json", "copilot-vscode"),
        (r"C:\Users\D\.vscode-insiders\extensions\github.copilot\p.json", "copilot-vscode"),
        (r"C:\Users\D\AppData\Local\Programs\GitHub Copilot\github.exe", "copilot-desktop"),
        (r"C:\Users\D\AppData\Roaming\com.github.githubapp\state.json", "copilot-desktop"),
        (r"C:\Users\D\AppData\Local\github-copilot-sdk\cli\rt\copilot-runtime.exe", "copilot-desktop"),
        (r"C:\Users\D\.copilot\session-state\s\events.jsonl", "copilot-cli"),
        (r"C:\Users\D\Documents\readme.md", None),
    ],
)
def test_tool_hint_for_windows_paths(path, tool):
    assert P.tool_hint_for_path(path) == tool


def test_tool_dirs_resolve_under_documented_roots(windows, monkeypatch, tmp_path):
    monkeypatch.setenv("APPDATA", str(tmp_path / "Roaming"))
    monkeypatch.setenv("USERPROFILE", str(tmp_path / "me"))
    monkeypatch.delenv("COPILOT_HOME", raising=False)
    assert P.vscode_user_dir() == tmp_path / "Roaming" / "Code" / "User"
    assert P.vscode_insiders_user_dir() == tmp_path / "Roaming" / "Code - Insiders" / "User"
    assert P.copilot_global_dir() == tmp_path / "me" / ".copilot"
    assert P.copilot_session_dir() == tmp_path / "me" / ".copilot" / "session-state"
    monkeypatch.setenv("COPILOT_HOME", str(tmp_path / "elsewhere"))
    assert P.copilot_global_dir() == tmp_path / "elsewhere"


def test_empty_appdata_does_not_give_a_relative_config_dir(windows, monkeypatch):
    monkeypatch.setenv("APPDATA", "")
    assert P.config_dir().is_absolute()


# ── Copilot desktop version, from file metadata only ───────────────


def test_fixed_file_info_parsing():
    blob = struct.pack("<4L", 0xFEEF04BD, 0x10000, (1 << 16) | 2, (3 << 16) | 0)
    assert P._parse_fixed_file_info(blob) == "1.2.3"
    assert P._parse_fixed_file_info(struct.pack("<4L", 0xFEEF04BD, 0, (1 << 16) | 2, (3 << 16) | 4)) == "1.2.3.4"
    assert P._parse_fixed_file_info(b"\0" * 16) == ""
    assert P._parse_fixed_file_info(b"") == ""


def test_desktop_version_reads_metadata_and_never_launches(windows, monkeypatch, tmp_path):
    app = tmp_path / "Programs" / "GitHub Copilot"
    app.mkdir(parents=True)
    (app / "unins000.exe").write_bytes(b"")
    (app / "GitHub Copilot.exe").write_bytes(b"")
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.delenv("ProgramFiles", raising=False)
    seen = []

    def fake_version(exe):
        seen.append(exe.name)
        return "1.0.11"

    def no_launch(*a, **k):
        raise AssertionError("must not start a process")

    monkeypatch.setattr(P, "windows_file_version", fake_version)
    monkeypatch.setattr(subprocess, "run", no_launch)
    monkeypatch.setattr(subprocess, "Popen", no_launch)
    assert P.copilot_desktop_windows_version() == "1.0.11"
    assert seen == ["GitHub Copilot.exe"]


def test_desktop_version_empty_when_not_installed(windows, monkeypatch, tmp_path):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.delenv("ProgramFiles", raising=False)
    assert P.copilot_desktop_windows_version() == ""


# ── process control ────────────────────────────────────────────────


def test_pid_alive_never_uses_kill_zero_on_windows(windows, monkeypatch):
    monkeypatch.setattr(os, "kill", lambda *a: pytest.fail("os.kill(pid, 0) sends CTRL_C_EVENT on Windows"))
    monkeypatch.setitem(sys.modules, "psutil", types.SimpleNamespace(pid_exists=lambda pid: pid == 42))
    assert P.pid_alive(42)
    assert not P.pid_alive(43)
    assert not P.pid_alive(0)


def test_terminate_uses_taskkill_on_windows(windows, monkeypatch):
    calls = []

    def fake_run(argv, **kw):
        calls.append(argv)
        return types.SimpleNamespace(returncode=128)

    monkeypatch.setattr(P.subprocess, "run", fake_run)
    monkeypatch.setattr(os, "kill", lambda *a: pytest.fail("no POSIX signal on Windows"))
    assert P.terminate_pid(7) is False
    assert calls == [["taskkill", "/PID", "7", "/T", "/F"]]


def test_listening_pids_uses_psutil_not_lsof(windows, monkeypatch):
    conn = lambda pid, port, status: types.SimpleNamespace(pid=pid, status=status, laddr=types.SimpleNamespace(port=port))  # noqa: E731
    conns = [conn(9, 8484, "LISTEN"), conn(10, 8484, "ESTABLISHED"), conn(11, 9000, "LISTEN"), conn(None, 8484, "LISTEN")]
    monkeypatch.setitem(sys.modules, "psutil", types.SimpleNamespace(net_connections=lambda kind: conns))
    monkeypatch.setattr(P.subprocess, "run", lambda *a, **k: pytest.fail("no lsof on Windows"))
    assert P.listening_pids(8484) == [9]


def test_spawn_detached_uses_no_fork_and_passes_pid_file(windows, monkeypatch, tmp_path):
    seen = {}

    def fake_popen(argv, **kw):
        seen.update(kw, argv=argv)
        return types.SimpleNamespace(pid=1)

    monkeypatch.setattr(P.subprocess, "Popen", fake_popen)
    P.spawn_detached_windows(["python"], tmp_path / "a.log", tmp_path / "a.pid")
    assert seen["creationflags"] == 0x08000200
    assert seen["env"][P.DAEMON_PID_ENV] == str(tmp_path / "a.pid")
    assert seen["stdout"] is not None and seen["stderr"] == subprocess.STDOUT


def test_start_daemon_on_windows_respawns_without_fork(monkeypatch, tmp_path):
    monkeypatch.setattr(daemon, "IS_WINDOWS", True)
    monkeypatch.setattr(os, "fork", lambda: pytest.fail("no fork on Windows"), raising=False)
    pid_file = tmp_path / "d" / "aictl.pid"
    argv_seen = []

    def fake_spawn(argv, log_file, pid_path):
        argv_seen.extend(argv)
        pid_path.write_text("321", encoding="utf-8")
        return types.SimpleNamespace(poll=lambda: None)

    monkeypatch.setattr(daemon, "spawn_detached_windows", fake_spawn)
    cfg = types.SimpleNamespace(effective_log_file=lambda: tmp_path / "d" / "aictl.log")
    daemon._start_daemon(".", "127.0.0.1", 8484, 5.0, True, pid_file, cfg, db_path=None, headless=True)
    assert argv_seen[1:4] == ["-m", "aictl.cli", "serve"]
    assert "--headless" in argv_seen and "--no-open" in argv_seen and "--monitor" in argv_seen
    # The respawned argv has to parse: --daemon absent, every option known to the command.
    assert "--daemon" not in argv_seen
    parser = daemon.serve.make_context("serve", argv_seen[4:])
    assert parser.params["port"] == 8484


def test_stale_pid_file_of_a_reused_pid_is_not_killed(monkeypatch, tmp_path):
    pid_file = tmp_path / "aictl.pid"
    pid_file.write_text("555", encoding="utf-8")
    monkeypatch.setattr(daemon, "pid_alive", lambda pid: True)
    monkeypatch.setattr(daemon, "is_aictl_process", lambda pid: False)
    monkeypatch.setattr(daemon, "terminate_pid", lambda pid: pytest.fail("killed an unrelated process"))
    daemon._stop_daemon(pid_file)
    assert not pid_file.exists()


# ── console and files ──────────────────────────────────────────────


def test_harden_stdio_survives_a_cp1252_pipe(windows, monkeypatch):
    out = io.TextIOWrapper(io.BytesIO(), encoding="cp1252")
    monkeypatch.setattr(sys, "stdout", out)
    P.harden_stdio()
    print("\u2705 done \u2192 next", file=out)
    out.flush()
    assert b"done" in out.buffer.getvalue()


def test_json_with_bom_is_read_not_called_corrupt(tmp_path):
    path = tmp_path / "settings.json"
    path.write_bytes(b'\xef\xbb\xbf{"a": 1}')
    assert U.read_json_or_fail(path) == {"a": 1}
    assert U.read_json_lenient(path) == {"a": 1}


def test_replace_retries_a_transient_sharing_violation(monkeypatch, tmp_path):
    monkeypatch.setattr(U, "IS_WINDOWS", True)
    monkeypatch.setattr(U.time, "sleep", lambda s: None)
    real, calls = os.replace, []

    def flaky(src, dst):
        calls.append(src)
        if len(calls) < 3:
            raise PermissionError(32, "in use")
        real(src, dst)

    monkeypatch.setattr(U.os, "replace", flaky)
    target = tmp_path / "t.json"
    U.write_safe(target, "{}\n")
    assert target.read_bytes() == b"{}\n" and len(calls) == 3


def test_replace_does_not_hide_a_lasting_failure(monkeypatch, tmp_path):
    monkeypatch.setattr(U, "IS_WINDOWS", True)
    monkeypatch.setattr(U.time, "sleep", lambda s: None)

    def denied(src, dst):
        raise PermissionError(5, "denied")

    monkeypatch.setattr(U.os, "replace", denied)
    with pytest.raises(PermissionError):
        U.write_safe(tmp_path / "t.json", "{}")


# ── reinstall ──────────────────────────────────────────────────────


def _capture_batch(monkeypatch, tmp_path, root: Path) -> bytes:
    monkeypatch.setattr(admin.subprocess if hasattr(admin, "subprocess") else subprocess, "Popen", lambda *a, **k: None)
    monkeypatch.setenv("PIPX_HOME", str(tmp_path / "px"))
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))

    class Exit(Exception):
        pass

    def fake_exit(code):
        raise Exit

    monkeypatch.setattr(os, "_exit", fake_exit)
    with pytest.raises(Exit):
        admin._reinstall_detached_windows(["C:\\px\\pipx.exe", "install", "--force", "-e", f"{root}[all]"], root)
    return next(tmp_path.glob("aictl-reinstall-*.bat")).read_bytes()


def test_reinstall_batch_keeps_non_ascii_paths_and_crlf(monkeypatch, tmp_path):
    body = _capture_batch(monkeypatch, tmp_path, Path("/Users/Zo\u00eb/100%/aictl"))
    text = body.decode("utf-8")
    assert "chcp 65001" in text
    assert "Zo\u00eb" in text and "?" not in text.split("(venv")[0].split("Stopping")[0].replace("-like", "")
    assert "100%%" in text
    assert b"\r\r\n" not in body and b"\r\n" in body
    assert '"install"' in text and f'{tmp_path / "px" / "venvs" / "aictl"}' in text


def test_pipx_venv_falls_back_to_legacy_home(monkeypatch, tmp_path):
    monkeypatch.delenv("PIPX_HOME", raising=False)
    monkeypatch.setattr(sys, "prefix", sys.base_prefix)
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    assert admin._pipx_venv_dir() == tmp_path / "pipx" / "venvs" / "aictl"
    legacy = tmp_path / ".local" / "pipx" / "venvs" / "aictl"
    legacy.mkdir(parents=True)
    assert admin._pipx_venv_dir() == legacy


def test_npm_lookup_reports_missing_npm(monkeypatch):
    """With shell=True a missing npm is only a non-zero exit, so it is looked up first."""
    monkeypatch.setattr("shutil.which", lambda name: None)
    with pytest.raises(FileNotFoundError):
        admin._npm()
    monkeypatch.setattr("shutil.which", lambda name: r"C:\Program Files\nodejs\npm.CMD")
    assert admin._npm().endswith("npm.CMD")
