# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Windows behaviour of hook registration, removal and doctor, simulated on any OS.

These flip aictl's platform flags and fake ``reg`` and locked files. No real
Windows shell runs here, so the command strings are checked for shape.
"""

from __future__ import annotations

import json
import os
import shlex
from pathlib import Path
from unittest.mock import patch

import pytest
from click.testing import CliRunner

from aictl import hook_removal
from aictl.commands import integrations as ig
from aictl.commands.disable import disable

PIPX_PY = r"C:\Users\First Last\pipx\venvs\aictl\Scripts\python.exe"


@pytest.fixture
def win(tmp_path, monkeypatch):
    """User profile and APPDATA under tmp_path, with Windows flags on and the registry faked."""
    profile = tmp_path / "First Last"
    appdata = profile / "AppData" / "Roaming"
    appdata.mkdir(parents=True)
    monkeypatch.setenv("HOME", str(profile))
    monkeypatch.setenv("USERPROFILE", str(profile))
    monkeypatch.setenv("APPDATA", str(appdata))
    monkeypatch.delenv("XDG_CONFIG_HOME", raising=False)
    monkeypatch.delenv("COPILOT_HOME", raising=False)
    monkeypatch.delenv("CLAUDE_CONFIG_DIR", raising=False)
    monkeypatch.setenv("HOMEDRIVE", "")
    monkeypatch.setenv("HOMEPATH", str(profile))
    monkeypatch.setattr(hook_removal, "_IS_WINDOWS", True)
    monkeypatch.setattr(hook_removal, "_IS_MACOS", False)
    monkeypatch.setattr(ig, "IS_WINDOWS", True)
    monkeypatch.setattr(ig, "IS_MACOS", False)
    monkeypatch.setattr(ig, "claude_global_dir", lambda: profile / ".claude")
    monkeypatch.setattr(ig, "gemini_global_dir", lambda: profile / ".gemini")
    monkeypatch.setattr(ig, "copilot_global_dir", lambda: profile / ".copilot")
    monkeypatch.setattr(ig, "codex_global_dir", lambda: profile / ".codex")
    vscode_dir = appdata / "Code" / "User"
    monkeypatch.setattr(ig, "vscode_user_dir", lambda: vscode_dir)
    monkeypatch.setattr("aictl.commands.disable.vscode_user_dir", lambda: vscode_dir)
    monkeypatch.chdir(tmp_path)
    return profile


class FakeRegistry:
    def __init__(self, values: dict[str, str]):
        self.values = dict(values)

    def __call__(self, *args):
        verb, _hive, _flag, key = args[:4]
        if key not in self.values:
            return None
        if verb == "query":
            return f"    {key}    REG_SZ    {self.values[key]}\n"
        del self.values[key]
        return "ok"


def test_settings_path_is_under_appdata(win):
    settings = hook_removal.vscode_settings_paths(win)[0]
    assert settings == Path(os.environ["APPDATA"]) / "Code" / "User" / "settings.json"


def test_config_dir_is_under_appdata(win):
    assert hook_removal.aictl_config_dir(win) == Path(os.environ["APPDATA"]) / "aictl"


class TestHookCommands:
    def test_copilot_rule_has_a_command_for_each_shell(self, win):
        with patch.object(ig.sys, "executable", PIPX_PY):
            rule = ig._build_vscode_hook_config(8484, ["Stop"], scope="user")["Stop"][0]
        assert rule["command"].startswith(f'"{PIPX_PY}" -I -S "')
        assert rule["command"].endswith("2>nul & exit /b 0")
        assert rule["powershell"].startswith(f'& "{PIPX_PY}" -I -S "')
        assert rule["powershell"].endswith("2>$null; exit 0")
        assert rule["bash"].endswith("2>/dev/null || true")

    def test_posix_rule_has_no_powershell_field(self, monkeypatch):
        monkeypatch.setattr(ig, "IS_WINDOWS", False)
        rule = ig._build_vscode_hook_config(8484, ["Stop"], scope="user")["Stop"][0]
        assert "powershell" not in rule
        assert "bash" not in rule

    def test_paths_with_spaces_stay_one_token(self, win):
        with (
            patch.object(ig.sys, "executable", PIPX_PY),
            patch.object(ig, "__file__", r"C:\Program Files\app\aictl\commands\integrations.py"),
        ):
            cmd = ig._handler_command("Stop", 8484, "root.copilot-user", shell="cmd")
        tokens = shlex.split(cmd, posix=False)
        assert tokens[0] == f'"{PIPX_PY}"'
        assert any(t.startswith('"') and t.endswith('hook_handler.py"') for t in tokens)
        assert ig._extract_port_from_cmd(cmd) == 8484

    def test_rule_is_recognised_as_ours_by_command_alone(self):
        rule = {"type": "command", "command": rf'"{PIPX_PY}" -I -S "C:\x y\aictl\hook_handler.py" --event Stop'}
        assert hook_removal.is_aictl_rule(rule)
        assert hook_removal.is_aictl_rule({"type": "command", "powershell": r'& "C:\x\aictl\hook_handler.py"'})

    def test_doctor_reads_the_interpreter_and_flags_it_gone(self, win):
        with patch.object(ig.sys, "executable", PIPX_PY):
            rule = ig._build_vscode_hook_config(8484, ["Stop"], scope="user")["Stop"][0]
        result = ig._doctor_check_one("Stop", rule, {}, known_events=frozenset({"Stop"}), expected_port=8484)
        assert result["interpreter"] == PIPX_PY
        assert result["state"] == "missing-interpreter"
        assert result["fix"].startswith("aictl hooks install")

    def test_doctor_does_not_call_the_guarded_form_old(self, win):
        interp = ig.sys.executable
        script = Path(hook_removal.__file__).with_name("hook_handler.py")
        rule = {
            "_aictl_owner": "aictl.managed",
            "type": "command",
            "command": f'"{interp}" -I -S "{script}" --event Stop --port 8484 2>nul & exit /b 0',
        }
        result = ig._doctor_check_one("Stop", rule, {}, known_events=frozenset({"Stop"}), expected_port=8484)
        assert result["state"] == "registered", result["reasons"]


class TestRoundTrip:
    def _seed_settings(self, win) -> tuple[Path, bytes]:
        vs = hook_removal.vscode_settings_paths(win)[0]
        vs.parent.mkdir(parents=True)
        original = '\ufeff{\r\n  // editor\r\n  "editor.fontSize": 13,\r\n  "chat.useHooks": false\r\n}\r\n'.encode()
        vs.write_bytes(original)
        return vs, original

    def test_enable_disable_restores_crlf_bom_jsonc_settings(self, win, monkeypatch):
        monkeypatch.setattr(hook_removal, "_reg", FakeRegistry({}))
        persisted: list[list[str]] = []
        monkeypatch.setattr(ig, "_run_env_persist", persisted.append)
        vs, original = self._seed_settings(win)
        runner = CliRunner()
        assert runner.invoke(ig.enable, ["--scope", "user"], catch_exceptions=False).exit_code == 0
        written = vs.read_bytes()
        assert written.startswith("\ufeff{".encode())
        assert b"// editor" in written
        assert b"\r\n" in written
        assert hook_removal.jsonc_loads(written.decode())["chat.useHooks"] is True
        assert any(a[0] == "setx" for a in persisted)
        hook_file = win / ".copilot" / "hooks" / "aictl.json"
        assert json.loads(hook_file.read_text())["version"] == 1

        result = runner.invoke(disable, [], catch_exceptions=False)
        assert result.exit_code == 0, result.output
        assert vs.read_bytes() == original
        assert not hook_file.exists()

    def test_copilot_inline_hooks_in_config_json_are_removed(self, win, monkeypatch):
        monkeypatch.setattr(hook_removal, "_reg", FakeRegistry({}))
        config = win / ".copilot" / "config.json"
        config.parent.mkdir(parents=True)
        config.write_text(
            '// managed file\n{\n  "firstLaunchAt": "x",\n  "hooks": {"Stop": [{"type": "command", '
            '"command": "py -m aictl.hook_handler --event Stop"}]}\n}\n'
        )
        result = CliRunner().invoke(disable, [], catch_exceptions=False)
        assert result.exit_code == 0, result.output
        assert config.read_text() == '// managed file\n{\n  "firstLaunchAt": "x"\n}\n'


class TestUserEnvironment:
    def test_disable_deletes_setx_variables(self, win, monkeypatch):
        registry = FakeRegistry(
            {"AICTL_PORT": "8484", "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:8484", "MY_OWN": "keep"}
        )
        monkeypatch.setattr(hook_removal, "_reg", registry)
        result = CliRunner().invoke(disable, [], catch_exceptions=False)
        assert result.exit_code == 0, result.output
        assert registry.values == {"MY_OWN": "keep"}

    def test_a_real_collector_endpoint_stays(self, win, monkeypatch):
        registry = FakeRegistry({"OTEL_EXPORTER_OTLP_ENDPOINT": "https://collector.example:4318"})
        monkeypatch.setattr(hook_removal, "_reg", registry)
        assert CliRunner().invoke(disable, [], catch_exceptions=False).exit_code == 0
        assert "OTEL_EXPORTER_OTLP_ENDPOINT" in registry.values

    def test_dry_run_only_lists(self, win, monkeypatch):
        registry = FakeRegistry({"AICTL_PORT": "8484"})
        monkeypatch.setattr(hook_removal, "_reg", registry)
        result = CliRunner().invoke(disable, ["--dry-run"], catch_exceptions=False)
        assert "AICTL_PORT" in result.output
        assert registry.values == {"AICTL_PORT": "8484"}

    def test_redirected_profile_never_touches_the_registry(self, win, monkeypatch):
        monkeypatch.setenv("HOMEPATH", r"\Users\someone-else")
        monkeypatch.setattr(hook_removal, "_reg", lambda *a: pytest.fail("registry touched"))
        assert CliRunner().invoke(disable, [], catch_exceptions=False).exit_code == 0


class TestLockedFile:
    def test_replace_retries_then_succeeds(self, tmp_path, monkeypatch):
        path = tmp_path / "settings.json"
        path.write_text("{}\n")
        real = os.replace
        calls = {"n": 0}

        def flaky(src, dst):
            calls["n"] += 1
            if calls["n"] < 3:
                raise PermissionError(13, "sharing violation")
            real(src, dst)

        monkeypatch.setattr(hook_removal.os, "replace", flaky)
        monkeypatch.setattr(hook_removal, "_REPLACE_BACKOFF_SEC", 0)
        hook_removal.write_atomic(path, '{"a": 1}\n')
        assert json.loads(path.read_text()) == {"a": 1}
        assert calls["n"] == 3

    def _always_locked(self, monkeypatch):
        def locked(src, dst):
            raise PermissionError(13, "sharing violation")

        monkeypatch.setattr(hook_removal.os, "replace", locked)
        monkeypatch.setattr(hook_removal, "_REPLACE_BACKOFF_SEC", 0)

    def test_still_locked_fails_cleanly_with_no_data_loss(self, tmp_path, monkeypatch):
        path = tmp_path / "settings.json"
        path.write_text('{"keep": 1}\n')
        self._always_locked(monkeypatch)
        with pytest.raises(hook_removal.ConfigBusyError, match="locked"):
            hook_removal.write_atomic(path, '{"a": 1}\n')
        assert json.loads(path.read_text()) == {"keep": 1}
        assert sorted(p.name for p in tmp_path.iterdir()) == ["settings.json"]

    def test_install_reports_a_locked_file_and_registers_the_rest(self, win, monkeypatch):
        real_write = hook_removal.write_atomic

        def locked_gemini(path, content):
            if ".gemini" in str(path):
                raise hook_removal.ConfigBusyError(f"{path} is locked by another process; left unchanged")
            real_write(path, content)

        monkeypatch.setattr(hook_removal, "write_atomic", locked_gemini)
        actions: list[str] = []
        ig._install_hooks("user", 8484, actions)
        assert any("Gemini" in a and "FAILED" in a and "locked" in a for a in actions)
        assert (win / ".copilot" / "hooks" / "aictl.json").exists()

    def test_disable_reports_a_locked_file_and_continues(self, win, monkeypatch):
        monkeypatch.setattr(hook_removal, "_reg", FakeRegistry({}))
        settings = win / ".claude" / "settings.json"
        settings.parent.mkdir(parents=True)
        rule = {"type": "command", "command": "py -m aictl.hook_handler --event Stop"}
        original = json.dumps({"hooks": {"Stop": [rule]}})
        settings.write_text(original)
        env_dir = win / ".config" / "aictl"
        env_dir.mkdir(parents=True)
        (env_dir / "env.sh").write_text("export AICTL_PORT=1\n")
        self._always_locked(monkeypatch)
        result = CliRunner().invoke(disable, [], catch_exceptions=False)
        assert result.exit_code == 1
        assert settings.read_text() == original
        assert not (env_dir / "env.sh").exists()  # later steps still ran
