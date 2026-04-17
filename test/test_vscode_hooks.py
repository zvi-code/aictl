# Tests for VS Code Copilot hook install/uninstall/doctor paths.
#
# Covers the deferred item wired up after commit a72b5eb (hook-wrapper
# identity work): aictl now installs a Copilot-native flat hook file to
# the VS Code ``chat.hookFilesLocations`` default directories, stamps each
# entry with the source id, and cleans it up on uninstall.

from __future__ import annotations

import json

import pytest
from click.testing import CliRunner

from aictl._hook_owner import _AICTL_OWNER_MARKER
from aictl.commands.integrations import (
    VSCODE_HOOK_EVENTS,
    _build_vscode_hook_config,
    _install_vscode_hooks,
    _is_aictl_hook,
    _uninstall_vscode_hooks,
    _vscode_hook_settings_path,
    hooks,
)


@pytest.fixture
def fake_home(tmp_path, monkeypatch):
    """Isolate all hook paths (Claude, Gemini, VS Code) under tmp_path."""
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("AICTL_PORT", "8484")
    monkeypatch.setattr("aictl.commands.integrations.claude_global_dir", lambda: tmp_path / "claude")
    monkeypatch.setattr("aictl.commands.integrations.gemini_global_dir", lambda: tmp_path / "gemini")
    monkeypatch.setattr("aictl.commands.integrations.copilot_global_dir", lambda: tmp_path / "copilot")
    return tmp_path


class TestBuildVscodeHookConfig:
    def test_generates_all_vscode_events(self):
        cfg = _build_vscode_hook_config(8484, None, scope="user")
        assert set(cfg) == set(VSCODE_HOOK_EVENTS)

    def test_flat_copilot_format(self):
        """Each entry is flat {type, command, _aictl_owner} — not nested."""
        cfg = _build_vscode_hook_config(8484, ["SessionStart"], scope="user")
        entry = cfg["SessionStart"][0]
        assert entry["type"] == "command"
        assert "command" in entry
        # Explicitly NOT the Claude-nested shape:
        assert "matcher" not in entry
        assert "hooks" not in entry

    def test_carries_owner_marker(self):
        cfg = _build_vscode_hook_config(8484, ["SessionStart"], scope="user")
        assert cfg["SessionStart"][0]["_aictl_owner"] == _AICTL_OWNER_MARKER
        assert _is_aictl_hook(cfg["SessionStart"][0])

    def test_user_scope_source_id(self):
        cfg = _build_vscode_hook_config(8484, ["SessionStart"], scope="user")
        cmd = cfg["SessionStart"][0]["command"]
        assert " --source root.vscode-user" in cmd
        assert "--event SessionStart" in cmd
        assert "--port 8484" in cmd

    def test_project_scope_source_id(self, monkeypatch, tmp_path):
        proj = tmp_path / "Demo Project"
        proj.mkdir()
        monkeypatch.chdir(proj)
        cfg = _build_vscode_hook_config(8484, ["SessionStart"], scope="project")
        cmd = cfg["SessionStart"][0]["command"]
        assert " --source demo-project.vscode-project" in cmd


class TestVscodeHookSettingsPath:
    def test_user_scope_under_copilot_global(self, fake_home):
        path = _vscode_hook_settings_path("user")
        assert path == fake_home / "copilot" / "hooks" / "aictl.json"

    def test_project_scope_under_github_hooks(self, monkeypatch, tmp_path):
        proj = tmp_path / "proj"
        proj.mkdir()
        monkeypatch.chdir(proj)
        path = _vscode_hook_settings_path("project")
        assert path == proj / ".github" / "hooks" / "aictl.json"


class TestInstallVscodeHooks:
    def test_user_install_writes_flat_hook_file(self, fake_home):
        actions: list[str] = []
        _install_vscode_hooks("user", 8484, actions)
        path = fake_home / "copilot" / "hooks" / "aictl.json"
        assert path.exists()
        data = json.loads(path.read_text())
        assert set(data["hooks"]) == set(VSCODE_HOOK_EVENTS)
        for event, rules in data["hooks"].items():
            assert len(rules) == 1
            rule = rules[0]
            assert rule["type"] == "command"
            assert rule["_aictl_owner"] == _AICTL_OWNER_MARKER
            assert " --source root.vscode-user" in rule["command"]
            assert f"--event {event}" in rule["command"]
        assert any("VS Code Copilot hooks" in a for a in actions)

    def test_project_install_uses_project_source(self, monkeypatch, tmp_path):
        proj = tmp_path / "neat_app"
        proj.mkdir()
        monkeypatch.chdir(proj)
        actions: list[str] = []
        _install_vscode_hooks("project", 8484, actions)
        path = proj / ".github" / "hooks" / "aictl.json"
        assert path.exists()
        data = json.loads(path.read_text())
        cmd = data["hooks"]["SessionStart"][0]["command"]
        assert " --source neat_app.vscode-project" in cmd

    def test_reinstall_is_idempotent(self, fake_home):
        actions: list[str] = []
        _install_vscode_hooks("user", 8484, actions)
        _install_vscode_hooks("user", 8484, actions)
        path = fake_home / "copilot" / "hooks" / "aictl.json"
        data = json.loads(path.read_text())
        # Still exactly one rule per event (no duplicate accumulation).
        for rules in data["hooks"].values():
            assert len(rules) == 1


class TestUninstallVscodeHooks:
    def test_removes_aictl_owned_file(self, fake_home):
        actions: list[str] = []
        _install_vscode_hooks("user", 8484, actions)
        path = fake_home / "copilot" / "hooks" / "aictl.json"
        assert path.exists()
        _uninstall_vscode_hooks("user", actions)
        assert not path.exists()

    def test_preserves_user_owned_file(self, fake_home):
        """A file at aictl.json that lacks our marker must not be deleted."""
        path = fake_home / "copilot" / "hooks" / "aictl.json"
        path.parent.mkdir(parents=True)
        user_payload = {
            "hooks": {
                "SessionStart": [
                    {"type": "command", "command": "echo hi"},  # no marker
                ]
            }
        }
        path.write_text(json.dumps(user_payload))
        actions: list[str] = []
        _uninstall_vscode_hooks("user", actions)
        assert path.exists()
        assert json.loads(path.read_text()) == user_payload

    def test_missing_file_is_noop(self, fake_home):
        actions: list[str] = []
        _uninstall_vscode_hooks("user", actions)
        # Should not raise, should not create the file.
        assert not (fake_home / "copilot" / "hooks" / "aictl.json").exists()


class TestInstallHooksTopLevelIncludesVscode:
    def test_install_hooks_writes_claude_gemini_and_vscode(self, fake_home):
        from aictl.commands.integrations import _install_hooks

        actions: list[str] = []
        _install_hooks("user", 8484, actions)
        vscode_path = fake_home / "copilot" / "hooks" / "aictl.json"
        claude_path = fake_home / "claude" / "settings.json"
        gemini_path = fake_home / "gemini" / "settings.json"
        assert vscode_path.exists()
        assert claude_path.exists()
        assert gemini_path.exists()
        vscode_data = json.loads(vscode_path.read_text())
        cmd = vscode_data["hooks"]["SessionStart"][0]["command"]
        assert " --source root.vscode-user" in cmd


class TestHooksDoctorAcceptsFreshInstall:
    def test_doctor_passes_after_user_install(self, fake_home, monkeypatch):
        from aictl.commands.integrations import _install_hooks, _settings_path

        # Ensure _settings_path points under the fake home (it already does
        # via claude_global_dir monkeypatch). The doctor command also needs
        # the project-scope branch to not be exercised, so force user scope.
        monkeypatch.setattr(
            "aictl.commands.integrations._settings_path",
            lambda scope: _settings_path(scope),
        )
        actions: list[str] = []
        _install_hooks("user", 8484, actions)
        runner = CliRunner()
        result = runner.invoke(hooks, ["doctor", "--scope", "user"])
        # Doctor exits 0 on no FAILs. Every rule here is freshly generated
        # with the current interpreter, so it must be OK.
        assert result.exit_code == 0, result.output
        # Both Claude (SessionStart et al.) and VS Code hooks must appear.
        assert "SessionStart" in result.output


class TestHooksUninstallRemovesVscode:
    def test_uninstall_deletes_vscode_hook_file(self, fake_home):
        from aictl.commands.integrations import _install_hooks

        actions: list[str] = []
        _install_hooks("user", 8484, actions)
        vscode_path = fake_home / "copilot" / "hooks" / "aictl.json"
        assert vscode_path.exists()
        runner = CliRunner()
        result = runner.invoke(hooks, ["uninstall", "--scope", "user"])
        assert result.exit_code == 0, result.output
        assert not vscode_path.exists()
