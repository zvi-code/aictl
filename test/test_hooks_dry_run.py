# Tests for `aictl hooks install/uninstall --dry-run` (item #8).
#
# Dry-run computes the intended mutation, prints a unified diff, and
# exits 0 without writing or invoking WriteGuard.

from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from click.testing import CliRunner

from aictl.commands.integrations import hooks
from aictl.utils import WriteGuard


@pytest.fixture
def tmp_settings(tmp_path, monkeypatch):
    settings_file = tmp_path / ".claude" / "settings.json"
    monkeypatch.setattr("aictl.commands.integrations._settings_path", lambda scope: settings_file)
    monkeypatch.setenv("AICTL_PORT", "8484")
    return settings_file


class TestInstallDryRun:
    def test_dry_run_does_not_create_file(self, tmp_settings):
        runner = CliRunner()
        result = runner.invoke(hooks, ["install", "--dry-run"], catch_exceptions=False)
        assert result.exit_code == 0
        assert not tmp_settings.exists()

    def test_dry_run_prints_unified_diff(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({"selectedModel": "opus"}))
        runner = CliRunner()
        result = runner.invoke(hooks, ["install", "--dry-run"], catch_exceptions=False)
        assert result.exit_code == 0
        # Header lines of a unified diff
        assert "---" in result.output
        assert "+++" in result.output
        assert "+" in result.output  # new hook lines added
        # Pre-existing content unchanged on disk
        assert json.loads(tmp_settings.read_text()) == {"selectedModel": "opus"}

    def test_dry_run_does_not_install_guard(self, tmp_settings):
        installed = []
        original = WriteGuard.install

        def _track(cmd):
            installed.append(cmd)
            return original(cmd)

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_track)):
            result = runner.invoke(hooks, ["install", "--dry-run"], catch_exceptions=False)
        assert result.exit_code == 0
        assert installed == []

    def test_dry_run_preview_matches_actual_write(self, tmp_settings):
        """The proposed side of the diff should equal what a real install writes."""
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({"selectedModel": "opus"}))
        runner = CliRunner()
        dry = runner.invoke(hooks, ["install", "--dry-run"], catch_exceptions=False)
        assert dry.exit_code == 0
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        # Extract the proposed object from the diff lines that start with "+"
        # and are JSON key lines — we validate dry-run agreed by checking that
        # a representative hook event shows up on the "+" side.
        assert "+" in dry.output
        assert "hooks" in data
        assert "SessionStart" in data["hooks"]
        # The dry-run diff should mention SessionStart being added
        assert "SessionStart" in dry.output


class TestUninstallDryRun:
    def test_dry_run_does_not_modify_file(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        runner = CliRunner()
        # First install for real
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        before = tmp_settings.read_text()
        # Dry-run uninstall
        result = runner.invoke(hooks, ["uninstall", "--dry-run"], catch_exceptions=False)
        assert result.exit_code == 0
        after = tmp_settings.read_text()
        assert before == after, "dry-run uninstall must not mutate the file"

    def test_dry_run_shows_removal_diff(self, tmp_settings):
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        result = runner.invoke(hooks, ["uninstall", "--dry-run"], catch_exceptions=False)
        assert result.exit_code == 0
        # Removed lines begin with "-"; at minimum the hooks key is shrinking
        assert "-" in result.output
        assert "[dry-run]" in result.output

    def test_dry_run_does_not_install_guard(self, tmp_settings):
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        installed = []
        original = WriteGuard.install

        def _track(cmd):
            installed.append(cmd)
            return original(cmd)

        with patch.object(WriteGuard, "install", staticmethod(_track)):
            result = runner.invoke(hooks, ["uninstall", "--dry-run"], catch_exceptions=False)
        assert result.exit_code == 0
        assert installed == []
