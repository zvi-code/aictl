# Tests for aictl hooks install/uninstall command.
import json
import os
import pytest
from pathlib import Path
from unittest.mock import patch
from click.testing import CliRunner

from aictl.commands.hooks import (
    hooks, install, uninstall,
    HOOK_EVENTS, _build_hook_config, _is_aictl_hook, _settings_path,
)


@pytest.fixture
def tmp_settings(tmp_path, monkeypatch):
    """Patch _settings_path to write to a temp dir."""
    settings_file = tmp_path / ".claude" / "settings.json"

    def _fake_path(scope):
        return settings_file

    monkeypatch.setattr("aictl.commands.hooks._settings_path", _fake_path)
    monkeypatch.setenv("AICTL_PORT", "8484")
    return settings_file


class TestBuildHookConfig:
    def test_generates_all_events(self):
        config = _build_hook_config(8484, None)
        assert len(config) == len(HOOK_EVENTS)
        for event in HOOK_EVENTS:
            assert event in config

    def test_custom_port(self):
        config = _build_hook_config(9999, None)
        cmd = config["SessionStart"][0]["command"]
        assert "localhost:9999" in cmd

    def test_custom_event_subset(self):
        config = _build_hook_config(8484, ["SessionStart", "SessionEnd"])
        assert len(config) == 2
        assert "SessionStart" in config
        assert "SessionEnd" in config

    def test_reads_stdin(self):
        config = _build_hook_config(8484, ["PostToolUse"])
        cmd = config["PostToolUse"][0]["command"]
        assert "sys.stdin" in cmd

    def test_posts_to_api_hooks(self):
        config = _build_hook_config(8484, ["PostToolUse"])
        cmd = config["PostToolUse"][0]["command"]
        assert "/api/hooks" in cmd

    def test_sets_event_name(self):
        config = _build_hook_config(8484, ["PreToolUse"])
        cmd = config["PreToolUse"][0]["command"]
        assert "'PreToolUse'" in cmd

    def test_merges_env_vars(self):
        config = _build_hook_config(8484, ["SessionStart"])
        cmd = config["SessionStart"][0]["command"]
        assert "SESSION_ID" in cmd
        assert "CWD" in cmd


class TestIsAictlHook:
    def test_detects_aictl_hook(self):
        hook = {"type": "command", "command": "curl -s http://localhost:8484/api/hooks ..."}
        assert _is_aictl_hook(hook)

    def test_rejects_user_hook(self):
        hook = {"type": "command", "command": "my-custom-linter.sh"}
        assert not _is_aictl_hook(hook)

    def test_rejects_non_dict(self):
        assert not _is_aictl_hook("string")
        assert not _is_aictl_hook(42)

    def test_detects_new_python_hook(self):
        # Use an actual generated hook to test detection
        config = _build_hook_config(8484, ["SessionStart"])
        hook = config["SessionStart"][0]
        assert _is_aictl_hook(hook)


class TestInstallClean:
    """Install into a clean settings file (no pre-existing config)."""

    def test_creates_settings_file(self, tmp_settings):
        runner = CliRunner()
        result = runner.invoke(hooks, ["install"], catch_exceptions=False)
        assert result.exit_code == 0
        assert tmp_settings.exists()

    def test_installs_all_events(self, tmp_settings):
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert len(data["hooks"]) == len(HOOK_EVENTS)

    def test_creates_parent_dirs(self, tmp_settings):
        # Parent dir doesn't exist yet
        assert not tmp_settings.parent.exists()
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        assert tmp_settings.exists()


class TestInstallPreservesExistingSettings:
    """Install must not clobber non-hook settings."""

    def test_preserves_non_hook_keys(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({
            "permissions": {"allow": ["Read", "Write"]},
            "env": {"MY_VAR": "value"},
        }))
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert data["permissions"] == {"allow": ["Read", "Write"]}
        assert data["env"] == {"MY_VAR": "value"}
        assert "hooks" in data

    def test_preserves_model_setting(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({"selectedModel": "opus"}))
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert data["selectedModel"] == "opus"


class TestInstallUpgrade:
    """Re-installing replaces old aictl hooks without duplicating."""

    def test_replaces_old_aictl_hooks(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        # Pre-populate with old-style aictl hooks (curl-based)
        old_hooks = {
            "SessionStart": [{"type": "command", "command": "curl -s http://localhost:8484/api/hooks -d '{}'"}],
            "SessionEnd": [{"type": "command", "command": "curl -s http://localhost:8484/api/hooks -d '{}'"}],
        }
        tmp_settings.write_text(json.dumps({"hooks": old_hooks}))

        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())

        # Should have all events, not just the 2 that existed before
        assert len(data["hooks"]) == len(HOOK_EVENTS)
        # Each event should have exactly 1 handler (no duplicates)
        for event in HOOK_EVENTS:
            assert len(data["hooks"][event]) == 1

    def test_no_duplicates_on_reinstall(self, tmp_settings):
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        for event in HOOK_EVENTS:
            assert len(data["hooks"][event]) == 1, f"Duplicate handlers for {event}"


class TestInstallConflictDetection:
    """Reject if non-aictl hooks already exist, unless --force."""

    def test_rejects_when_user_hooks_exist(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({
            "hooks": {
                "PreToolUse": [{"type": "command", "command": "my-linter.sh"}],
            }
        }))
        runner = CliRunner()
        result = runner.invoke(hooks, ["install"])
        assert result.exit_code != 0
        assert "non-aictl hooks" in result.output or "non-aictl hooks" in (result.stderr or "")

    def test_shows_conflicting_events(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({
            "hooks": {
                "PreToolUse": [{"type": "command", "command": "my-linter.sh"}],
                "PostToolUse": [{"type": "command", "command": "my-logger.sh"}],
            }
        }))
        runner = CliRunner()
        result = runner.invoke(hooks, ["install"])
        assert result.exit_code != 0
        # Stderr should mention both conflicting events
        output = (result.output or "") + (result.stderr or "")
        assert "PreToolUse" in output
        assert "PostToolUse" in output

    def test_force_installs_alongside_user_hooks(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({
            "hooks": {
                "PreToolUse": [{"type": "command", "command": "my-linter.sh"}],
            }
        }))
        runner = CliRunner()
        result = runner.invoke(hooks, ["install", "--force"], catch_exceptions=False)
        assert result.exit_code == 0
        data = json.loads(tmp_settings.read_text())
        # Should have both: user hook + aictl hook
        assert len(data["hooks"]["PreToolUse"]) == 2
        commands = [h["command"] for h in data["hooks"]["PreToolUse"]]
        assert any("my-linter.sh" in c for c in commands)
        assert any("/api/hooks" in c for c in commands)

    def test_no_conflict_when_only_aictl_hooks_exist(self, tmp_settings):
        """Re-installing when only old aictl hooks exist should succeed without --force."""
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({
            "hooks": {
                "SessionStart": [{"type": "command", "command": "curl http://localhost:8484/api/hooks"}],
            }
        }))
        runner = CliRunner()
        result = runner.invoke(hooks, ["install"], catch_exceptions=False)
        assert result.exit_code == 0

    def test_conflict_only_on_targeted_events(self, tmp_settings):
        """User hooks on events NOT being installed should not trigger conflict."""
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({
            "hooks": {
                "Stop": [{"type": "command", "command": "my-script.sh"}],
            }
        }))
        runner = CliRunner()
        # Install only SessionStart — no conflict with Stop
        result = runner.invoke(hooks, ["install", "--events", "SessionStart"], catch_exceptions=False)
        assert result.exit_code == 0


class TestUninstall:
    def test_removes_aictl_hooks(self, tmp_settings):
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        runner.invoke(hooks, ["uninstall"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        # hooks key should be gone (all were aictl)
        assert "hooks" not in data or not data.get("hooks")

    def test_preserves_user_hooks(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({
            "hooks": {
                "PreToolUse": [
                    {"type": "command", "command": "my-linter.sh"},
                    {"type": "command", "command": "curl http://localhost:8484/api/hooks"},
                ],
            }
        }))
        runner = CliRunner()
        runner.invoke(hooks, ["uninstall"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert len(data["hooks"]["PreToolUse"]) == 1
        assert data["hooks"]["PreToolUse"][0]["command"] == "my-linter.sh"

    def test_preserves_non_hook_settings(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({
            "permissions": {"allow": ["Read"]},
            "hooks": {
                "SessionStart": [{"type": "command", "command": "curl http://localhost:8484/api/hooks"}],
            },
        }))
        runner = CliRunner()
        runner.invoke(hooks, ["uninstall"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert data["permissions"] == {"allow": ["Read"]}

    def test_no_settings_file(self, tmp_settings):
        runner = CliRunner()
        result = runner.invoke(hooks, ["uninstall"], catch_exceptions=False)
        assert result.exit_code == 0
        assert "No settings file" in result.output


class TestInvalidEvents:
    def test_rejects_unknown_event(self, tmp_settings):
        runner = CliRunner()
        result = runner.invoke(hooks, ["install", "--events", "FakeEvent"])
        assert result.exit_code != 0
        assert "Unknown events" in (result.output or "") + (result.stderr or "")


class TestHookEventsCompleteness:
    """Ensure HOOK_EVENTS stays in sync with KNOWN_HOOK_EVENTS."""

    def test_hook_events_match_validator(self):
        from aictl.commands.validate_cmd import KNOWN_HOOK_EVENTS
        hooks_set = set(HOOK_EVENTS)
        validator_set = set(KNOWN_HOOK_EVENTS)
        assert hooks_set == validator_set, (
            f"HOOK_EVENTS and KNOWN_HOOK_EVENTS are out of sync.\n"
            f"  In hooks only: {hooks_set - validator_set}\n"
            f"  In validator only: {validator_set - hooks_set}"
        )
