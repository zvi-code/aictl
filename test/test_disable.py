# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for `aictl disable` and `aictl audit`."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl.commands.disable import audit, disable


@pytest.fixture
def patched_env(tmp_path, monkeypatch):
    """Redirect HOME / XDG and relevant helpers into tmp_path."""
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))
    # Redirect integrations helpers that look up user/project settings paths.
    monkeypatch.setattr(
        "aictl.commands.integrations.claude_global_dir",
        lambda: tmp_path / "claude",
    )
    # Shell profile — a single fake .zshrc file.
    profile = tmp_path / ".zshrc"
    profile.write_text(
        "# user content\n"
        "export FOO=bar\n"
        "# >>> aictl env >>>\n"
        '[ -f "$HOME/.config/aictl/env.sh" ] && . "$HOME/.config/aictl/env.sh"\n'
        "# <<< aictl env <<<\n"
        "# trailing user content\n"
    )
    monkeypatch.setattr(
        "aictl.commands.integrations._shell_profiles", lambda: [profile]
    )
    monkeypatch.setattr(
        "aictl.commands.disable._shell_profiles", lambda: [profile]
    )
    # Pre-populate an env.sh so disable has something to delete.
    env_sh = tmp_path / ".config" / "aictl" / "env.sh"
    env_sh.parent.mkdir(parents=True)
    env_sh.write_text('export AICTL_PORT="8484"\n')
    return {"home": tmp_path, "profile": profile, "env_sh": env_sh}


def _seed_settings(settings_path: Path, *, corrupt: bool = False):
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    if corrupt:
        settings_path.write_text("{not-valid-json")
        return
    settings_path.write_text(json.dumps({
        "hooks": {
            "PreToolUse": [
                {
                    "_aictl_owner": "aictl.managed",
                    "matcher": "",
                    "hooks": [{"type": "command", "command": "x"}],
                },
                # A user hook — must be preserved.
                {"matcher": "", "hooks": [{"type": "command", "command": "user-script"}]},
            ],
        },
    }))


class TestDisableDryRun:
    def test_dry_run_prints_plan_without_mutation(self, patched_env):
        runner = CliRunner()
        result = runner.invoke(disable, ["--dry-run"], catch_exceptions=False)
        assert result.exit_code == 0, result.output
        assert "Dry run" in result.output
        assert "hooks uninstall" in result.output
        # env.sh still there
        assert patched_env["env_sh"].exists()
        # profile untouched
        assert "aictl env" in patched_env["profile"].read_text()


class TestDisable:
    def test_disable_removes_env_sh_and_source_block(self, patched_env):
        runner = CliRunner()
        result = runner.invoke(disable, [], catch_exceptions=False)
        assert result.exit_code == 0, result.output
        assert not patched_env["env_sh"].exists()
        profile_content = patched_env["profile"].read_text()
        assert "aictl env" not in profile_content
        # user content preserved
        assert "export FOO=bar" in profile_content
        assert "# trailing user content" in profile_content

    def test_disable_removes_aictl_hooks_preserves_user_hooks(self, patched_env):
        settings = patched_env["home"] / "claude" / "settings.json"
        _seed_settings(settings)
        runner = CliRunner()
        result = runner.invoke(disable, [], catch_exceptions=False)
        assert result.exit_code == 0, result.output
        data = json.loads(settings.read_text())
        # user hook survives; aictl hook gone
        remaining = data.get("hooks", {}).get("PreToolUse", [])
        cmds = [h["hooks"][0]["command"] for h in remaining]
        assert "user-script" in cmds
        assert "x" not in cmds

    def test_disable_force_tolerates_corrupt_settings(self, patched_env):
        settings = patched_env["home"] / "claude" / "settings.json"
        _seed_settings(settings, corrupt=True)
        runner = CliRunner()
        result = runner.invoke(disable, ["--force"], catch_exceptions=False)
        assert result.exit_code == 0, result.output
        # No CorruptJSONError surfaced.
        assert "CorruptJSONError" not in result.output


class TestAudit:
    def test_audit_tail_empty(self, patched_env):
        runner = CliRunner()
        result = runner.invoke(audit, ["tail"], catch_exceptions=False)
        assert result.exit_code == 0
        assert "(ledger is empty)" in result.output

    def test_audit_path_filter(self, patched_env, tmp_path):
        from aictl import mutation_ledger
        f = tmp_path / "x"
        mutation_ledger.record("c", f, "create", None, b"a")
        mutation_ledger.record("c", tmp_path / "other", "create", None, b"b")
        runner = CliRunner()
        result = runner.invoke(audit, ["path", str(f)], catch_exceptions=False)
        assert result.exit_code == 0
        assert str(f) in result.output
        assert "other" not in result.output
