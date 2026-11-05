# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A hook file switched off by renaming is reported, respected, and removed only if provably aictl's."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl import hook_removal
from aictl.commands import integrations as ig
from aictl.commands.disable import disable

MARKED = {"Stop": [{"type": "command", "command": "x -m aictl.hook_handler", "_aictl_owner": "aictl.managed"}]}


@pytest.fixture
def home(tmp_path, monkeypatch):
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(home / ".config"))
    monkeypatch.setattr(ig, "claude_global_dir", lambda: home / ".claude")
    monkeypatch.setattr(ig, "gemini_global_dir", lambda: home / ".gemini")
    monkeypatch.setattr(ig, "copilot_global_dir", lambda: home / ".copilot")
    monkeypatch.setattr(ig, "codex_global_dir", lambda: home / ".codex")
    vscode_dir = hook_removal.vscode_settings_paths(home)[0].parent
    monkeypatch.setattr(ig, "vscode_user_dir", lambda: vscode_dir)
    monkeypatch.setattr("aictl.commands.disable.vscode_user_dir", lambda: vscode_dir)
    monkeypatch.setattr(hook_removal, "_launchctl", lambda *a: None)
    monkeypatch.setattr(ig, "_run_env_persist", lambda *a: None)
    monkeypatch.chdir(tmp_path)
    return home


def _seed(home: Path, name: str, hooks: dict | None = None, **top) -> Path:
    path = home / ".copilot" / "hooks" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"hooks": MARKED if hooks is None else hooks, **top}))
    return path


def test_status_reports_disabled_by_rename_with_the_path(home):
    path = _seed(home, "aictl.json.disabled")
    result = CliRunner().invoke(ig.hooks, ["status", "--json"], catch_exceptions=False)
    assert result.exit_code == 0, result.output
    copilot = next(t for t in json.loads(result.output)["tools"] if t["tool"] == "copilot")
    assert copilot["state"] == "disabled-by-rename"
    assert copilot["disabled_files"] == [str(path)]
    assert "--replace-disabled" in copilot["fix"]


def test_status_and_doctor_text_name_the_file(home):
    path = _seed(home, "aictl.json.disabled")
    for command in ("status", "doctor"):
        result = CliRunner().invoke(ig.hooks, [command], catch_exceptions=False)
        assert f"disabled by rename: {path}" in result.output


def test_doctor_json_lists_it(home):
    path = _seed(home, "aictl.json.disabled")
    result = CliRunner().invoke(ig.hooks, ["doctor", "--json"], catch_exceptions=False)
    assert json.loads(result.output)["disabled_by_rename"] == [str(path)]


def test_enable_stops_and_changes_nothing(home):
    path = _seed(home, "aictl.json.disabled")
    before = path.read_bytes()
    result = CliRunner().invoke(ig.enable, ["--scope", "user"])
    assert result.exit_code != 0
    assert str(path) in result.output
    assert "--replace-disabled" in result.output
    assert path.read_bytes() == before
    assert not (home / ".copilot" / "hooks" / "aictl.json").exists()
    assert not (home / ".claude" / "settings.json").exists()


def test_enable_dry_run_also_reports_it(home):
    _seed(home, "aictl.json.disabled")
    assert CliRunner().invoke(ig.enable, ["--dry-run"]).exit_code != 0


def test_replace_disabled_registers_and_keeps_the_renamed_file(home):
    path = _seed(home, "aictl.json.disabled")
    result = CliRunner().invoke(ig.enable, ["--scope", "user", "--replace-disabled"], catch_exceptions=False)
    assert result.exit_code == 0, result.output
    assert (home / ".copilot" / "hooks" / "aictl.json").exists()
    assert path.exists()


@pytest.mark.parametrize("name", ["aictl.json.disabled", "aictl.json.bak", "aictl.json.bak.1", "old-aictl.disabled"])
def test_removal_deletes_marked_renamed_files(home, name):
    path = _seed(home, name)
    assert CliRunner().invoke(disable, [], catch_exceptions=False).exit_code == 0
    assert not path.exists()


@pytest.mark.parametrize(
    "hooks",
    [
        {"Stop": [{"type": "command", "command": "user-script.sh"}]},
        {"Stop": [*MARKED["Stop"], {"type": "command", "command": "user-script.sh"}]},
        # An aictl-shaped command with no marker is not proof.
        {"Stop": [{"type": "command", "command": "py -m aictl.hook_handler"}]},
        {"Stop": "malformed"},
        {},
    ],
)
def test_removal_keeps_what_is_not_provably_aictls(home, hooks):
    path = _seed(home, "aictl.json.disabled", hooks)
    before = path.read_bytes()
    assert CliRunner().invoke(disable, [], catch_exceptions=False).exit_code == 0
    assert path.read_bytes() == before


def test_removal_keeps_a_file_with_other_top_level_content(home):
    path = _seed(home, "aictl.json.disabled", note="mine")
    CliRunner().invoke(disable, [], catch_exceptions=False)
    assert path.exists()


def test_removal_keeps_unparsable_and_unrelated_files(home):
    junk = home / ".copilot" / "hooks" / "other.bak"
    junk.parent.mkdir(parents=True)
    junk.write_text("not json")
    other = home / ".copilot" / "hooks" / "team.json"
    other.write_text(json.dumps({"hooks": MARKED}))
    CliRunner().invoke(disable, [], catch_exceptions=False)
    assert junk.exists() and other.exists()


def test_dry_run_lists_without_deleting(home):
    path = _seed(home, "aictl.json.disabled")
    result = CliRunner().invoke(disable, ["--dry-run"], catch_exceptions=False)
    assert str(path) in result.output
    assert path.exists()
