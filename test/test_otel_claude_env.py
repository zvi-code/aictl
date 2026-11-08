# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Claude Code's OTel settings go into its own settings file, which it reads however it is
started; `aictl disable` takes back only what aictl set."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl import hook_removal
from aictl.commands import integrations


@pytest.fixture
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(tmp_path / ".claude"))
    monkeypatch.setattr(integrations, "claude_global_dir", lambda: tmp_path / ".claude")
    monkeypatch.setattr(integrations, "vscode_user_dir", lambda: tmp_path / "vscode" / "User")
    monkeypatch.setattr(integrations, "_shell_profiles", lambda: [tmp_path / ".zshrc"])
    monkeypatch.setattr(integrations, "IS_WINDOWS", False)
    monkeypatch.setattr(integrations, "IS_MACOS", False)
    monkeypatch.setattr(hook_removal, "_IS_WINDOWS", False)
    monkeypatch.setattr(hook_removal, "_IS_MACOS", False)
    (tmp_path / ".claude").mkdir()
    settings = tmp_path / ".claude" / "settings.json"
    settings.write_text(json.dumps({"env": {"MY_VAR": "mine"}, "hooks": {"Stop": [{"hooks": [{"type": "command", "command": "user"}]}]}}))
    return tmp_path


def _settings(home: Path) -> dict:
    return json.loads((home / ".claude" / "settings.json").read_text())


def test_enable_puts_claude_otel_in_its_settings_env_and_keeps_the_rest(home):
    actions: list[str] = []
    integrations._enable_otel(8484, actions, tools=["claude"])
    env = _settings(home)["env"]
    assert env["MY_VAR"] == "mine"
    assert env["CLAUDE_CODE_ENABLE_TELEMETRY"] == "1"
    # Claude Code has no default protocol and does not default to aictl's port.
    assert (env["OTEL_EXPORTER_OTLP_PROTOCOL"], env["OTEL_EXPORTER_OTLP_ENDPOINT"]) == ("http/json", "http://localhost:8484")
    assert _settings(home)["hooks"]["Stop"][0]["hooks"][0]["command"] == "user"
    assert any("Claude Code OTel" in a and "FAILED" not in a for a in actions)


def test_a_second_enable_changes_nothing(home):
    integrations._enable_otel(8484, [], tools=["claude"])
    before = (home / ".claude" / "settings.json").read_text()
    actions: list[str] = []
    integrations._enable_otel(8484, actions, tools=["claude"])
    assert (home / ".claude" / "settings.json").read_text() == before
    assert any("unchanged" in a for a in actions if "Claude Code OTel" in a)


def test_disable_removes_only_aictls_entries_even_after_the_person_added_one(home):
    integrations._enable_otel(8484, [], tools=["claude"])
    data = _settings(home)
    data["env"]["ADDED_LATER"] = "x"
    (home / ".claude" / "settings.json").write_text(json.dumps(data))
    hook_removal.remove_everything(home)
    env = _settings(home)["env"]
    assert env == {"MY_VAR": "mine", "ADDED_LATER": "x"}


def test_a_value_the_person_set_is_left_and_reported(home):
    data = _settings(home)
    data["env"]["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://collector:4318"
    (home / ".claude" / "settings.json").write_text(json.dumps(data))
    actions: list[str] = []
    integrations._enable_otel(8484, actions, tools=["claude"])
    env = _settings(home)["env"]
    assert env["OTEL_EXPORTER_OTLP_ENDPOINT"] == "http://collector:4318"
    assert env["CLAUDE_CODE_ENABLE_TELEMETRY"] == "1"  # the trivial ones are still set
    needs = [a for a in actions if a.startswith("NEEDS YOU")]
    assert len(needs) == 1 and '"OTEL_EXPORTER_OTLP_ENDPOINT" inside "env"' in needs[0] and "http://collector:4318" in needs[0]
    hook_removal.remove_everything(home)
    assert _settings(home)["env"] == {"MY_VAR": "mine", "OTEL_EXPORTER_OTLP_ENDPOINT": "http://collector:4318"}


def test_entries_change_one_by_one_keeping_the_persons_layout(home):
    path = home / ".claude" / "settings.json"
    path.write_text('{\n  "env": {\n    "MY_VAR":    "mine"\n  }\n}\n')
    integrations._enable_otel(8484, [], tools=["claude"])
    assert '"MY_VAR":    "mine"' in path.read_text()  # the person's spacing survives
    hook_removal.remove_everything(home)
    assert path.read_text() == '{\n  "env": {\n    "MY_VAR":    "mine"\n  }\n}\n'


def test_restore_of_a_merged_block_leaves_entries_changed_since():
    restored = hook_removal._restore_merged(
        {"A": "1", "OURS": "x", "CHANGED": "theirs", "NEW": "n"},
        {"A": "1", "OURS": "x", "CHANGED": "ours"},
        {"A": "1"},
    )
    assert restored == {"A": "1", "CHANGED": "theirs", "NEW": "n"}


def test_otel_enable_says_loudly_what_it_left_and_exits_2(home, monkeypatch):
    from click.testing import CliRunner

    data = _settings(home)
    data["env"]["OTEL_EXPORTER_OTLP_PROTOCOL"] = "grpc"
    (home / ".claude" / "settings.json").write_text(json.dumps(data))
    result = CliRunner().invoke(integrations.otel, ["enable", "--tool", "claude"])
    assert result.exit_code == integrations.EXIT_NEEDS_YOU, result.output
    assert "NOT CHANGED: 1 setting(s) need you" in result.output
    assert '1. In ' in result.output and '"OTEL_EXPORTER_OTLP_PROTOCOL" inside "env" to "http/json". It is "grpc" now.' in result.output


def test_windows_variable_rule():
    assert integrations._env_is_trivial("OTEL_EXPORTER_OTLP_ENDPOINT", None, "http://localhost:8484")
    assert integrations._env_is_trivial("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:9999", "http://localhost:8484")
    assert integrations._env_is_trivial("AICTL_PORT", "9000", "8484")
    assert not integrations._env_is_trivial("OTEL_EXPORTER_OTLP_ENDPOINT", "http://collector:4318", "http://localhost:8484")
    assert not integrations._env_is_trivial("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc", "http/json")


def test_windows_setx_skips_a_variable_the_person_set(home, monkeypatch):
    monkeypatch.setattr(integrations, "IS_WINDOWS", True)
    values = {"OTEL_EXPORTER_OTLP_PROTOCOL": "grpc", "COPILOT_OTEL_ENABLED": "true"}
    monkeypatch.setattr(integrations, "_windows_user_env", values.get)
    ran: list[list[str]] = []
    monkeypatch.setattr(integrations, "_run_env_persist", ran.append)
    actions: list[str] = []
    integrations._enable_otel(8484, actions, tools=["copilot"])
    keys = [argv[1] for argv in ran]
    assert "OTEL_EXPORTER_OTLP_PROTOCOL" not in keys  # the person's own value stays
    assert "COPILOT_OTEL_ENABLED" not in keys  # already right: nothing to write
    assert "OTEL_EXPORTER_OTLP_ENDPOINT" in keys
    assert any(a.startswith(integrations.NEEDS_YOU) and 'setx OTEL_EXPORTER_OTLP_PROTOCOL "http/json"' in a for a in actions)
