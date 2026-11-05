"""Copilot CLI / desktop config reporting reads only real files and says 'not configured' otherwise."""

from __future__ import annotations

import json

from aictl.monitoring import tool_config as tc


def test_copilot_home_config_reads_real_files(monkeypatch, tmp_path):
    home = tmp_path / "copilot-home"
    home.mkdir()
    (home / "settings.json").write_text(
        json.dumps({"model": "gpt-5.1", "effortLevel": "high", "enabledPlugins": {"a@m": True}, "disabledMcpServers": ["x"]})
    )
    (home / "mcp-config.json").write_text(json.dumps({"mcpServers": {"fs": {}, "web": {}}}))
    monkeypatch.setenv("COPILOT_HOME", str(home))
    cfg = tc._parse_copilot_home_config(tmp_path, tool="copilot-cli")
    assert cfg is not None and cfg.tool == "copilot-cli"
    assert cfg.model == "gpt-5.1"
    assert cfg.mcp_servers == ["fs", "web"]
    assert cfg.extensions == ["a@m"]
    assert cfg.settings["global_instructions"] == "not configured"
    assert cfg.settings["telemetry"] == "not configured"


def test_copilot_home_config_absent_returns_none(monkeypatch, tmp_path):
    monkeypatch.setenv("COPILOT_HOME", str(tmp_path / "missing"))
    monkeypatch.setattr(tc, "_copilot_cli_version", lambda: "")
    assert tc._parse_copilot_home_config(tmp_path, tool="copilot-cli") is None


def test_desktop_detected_by_its_database(monkeypatch, tmp_path):
    home = tmp_path / "h"
    home.mkdir()
    (home / "data.db").write_bytes(b"")
    monkeypatch.setenv("COPILOT_HOME", str(home))
    monkeypatch.setattr(tc, "_copilot_desktop_version", lambda: "")
    cfg = tc._parse_copilot_home_config(tmp_path, tool="copilot-desktop")
    assert cfg is not None and cfg.settings["version"] == "not detected"


def test_parsers_registered_with_yaml_entries():
    from aictl.data.schema import load_tool_configs

    names = set(load_tool_configs())
    for t in ("copilot-cli", "copilot-desktop"):
        assert t in names and t in tc._CONFIG_PARSER_REGISTRY


def test_desktop_version_uses_file_metadata_on_windows(monkeypatch):
    from aictl.monitoring import tool_config

    monkeypatch.setattr(tool_config, "IS_WINDOWS", True)
    monkeypatch.setattr(tool_config, "copilot_desktop_windows_version", lambda: "1.2.3")
    assert tool_config._copilot_desktop_version() == "1.2.3"
