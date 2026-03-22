"""Tests for _parse_copilot_config — new observability and CLI mode settings."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.monitoring.tool_config import _parse_copilot_config


def _write_settings(tmp_path: Path, settings: dict) -> Path:
    vscode_dir = tmp_path / "vscode_user"
    vscode_dir.mkdir(parents=True)
    (vscode_dir / "settings.json").write_text(json.dumps(settings))
    return vscode_dir


@pytest.fixture()
def patch_vscode_user_dir(tmp_path, monkeypatch):
    """Redirect vscode_user_dir() to a temp directory."""
    vscode_dir = tmp_path / "vscode_user"
    vscode_dir.mkdir(parents=True)
    monkeypatch.setattr("aictl.monitoring.tool_config.vscode_user_dir", lambda: vscode_dir)
    return vscode_dir


def test_agent_debug_log_detected(patch_vscode_user_dir):
    (patch_vscode_user_dir / "settings.json").write_text(json.dumps({
        "github.copilot.chat.agentDebugLog.enabled": True,
        "github.copilot.chat.agentDebugLog.fileLogging.enabled": True,
        "github.copilot.chat.debug.requestLogger.maxEntries": 500,
    }))
    cfg = _parse_copilot_config(Path("."))
    assert cfg is not None
    debug = cfg.feature_groups.get("Debug Logging", {})
    assert debug["enabled"] is True
    assert debug["fileLogging"] is True
    assert debug["requestLoggerMaxEntries"] == 500


def test_agent_debug_log_hint(patch_vscode_user_dir):
    (patch_vscode_user_dir / "settings.json").write_text(json.dumps({
        "github.copilot.chat.agentDebugLog.enabled": True,
    }))
    cfg = _parse_copilot_config(Path("."))
    assert any("troubleshoot" in h for h in cfg.hints)


def test_agent_behavior_settings_detected(patch_vscode_user_dir):
    (patch_vscode_user_dir / "settings.json").write_text(json.dumps({
        "github.copilot.chat.agent.autoFix": False,
        "github.copilot.chat.agent.currentEditorContext.enabled": True,
        "github.copilot.chat.agent.largeToolResultsToDisk.enabled": True,
        "github.copilot.chat.agentHistorySummarizationMode": "auto",
    }))
    cfg = _parse_copilot_config(Path("."))
    assert cfg is not None
    agent = cfg.feature_groups.get("Agent Mode", {})
    assert agent["autoFix"] is False
    assert agent["editorContext"] is True
    assert agent["largeResultsToDisk"] is True
    assert agent["historySummarizationMode"] == "auto"


def test_cli_mode_settings_detected(patch_vscode_user_dir):
    (patch_vscode_user_dir / "settings.json").write_text(json.dumps({
        "github.copilot.chat.cli.mcp.enabled": True,
        "github.copilot.chat.cli.isolationOption.enabled": False,
        "github.copilot.chat.cli.autoCommit.enabled": True,
        "github.copilot.chat.cli.branchSupport.enabled": True,
    }))
    cfg = _parse_copilot_config(Path("."))
    assert cfg is not None
    cli = cfg.feature_groups.get("CLI Mode", {})
    assert cli["mcp"] is True
    assert cli["worktreeIsolation"] is False
    assert cli["autoCommit"] is True
    assert cli["branchSupport"] is True


def test_cli_autocommit_hint(patch_vscode_user_dir):
    (patch_vscode_user_dir / "settings.json").write_text(json.dumps({
        "github.copilot.chat.cli.autoCommit.enabled": True,
    }))
    cfg = _parse_copilot_config(Path("."))
    assert any("autoCommit" in h or "commit" in h.lower() for h in cfg.hints)


def test_cli_autocommit_no_isolation_hint(patch_vscode_user_dir):
    (patch_vscode_user_dir / "settings.json").write_text(json.dumps({
        "github.copilot.chat.cli.autoCommit.enabled": True,
        "github.copilot.chat.cli.isolationOption.enabled": False,
    }))
    cfg = _parse_copilot_config(Path("."))
    # Should warn about lack of isolation when autocommit is on
    assert any("isolation" in h.lower() for h in cfg.hints)


def test_tools_view_image_detected(patch_vscode_user_dir):
    (patch_vscode_user_dir / "settings.json").write_text(json.dumps({
        "github.copilot.chat.tools.viewImage.enabled": True,
    }))
    cfg = _parse_copilot_config(Path("."))
    assert cfg is not None
    mem_tools = cfg.feature_groups.get("Memory & Tools", {})
    assert mem_tools["viewImage"] is True


def test_otel_console_exporter_hint(patch_vscode_user_dir):
    (patch_vscode_user_dir / "settings.json").write_text(json.dumps({
        "github.copilot.chat.otel.enabled": True,
        "github.copilot.chat.otel.exporterType": "console",
    }))
    cfg = _parse_copilot_config(Path("."))
    assert any("console" in h for h in cfg.hints)


def test_absent_settings_produce_no_groups(patch_vscode_user_dir):
    """Unset settings must not appear in feature_groups (no false positives)."""
    (patch_vscode_user_dir / "settings.json").write_text(json.dumps({}))
    cfg = _parse_copilot_config(Path("."))
    # cfg may be None (nothing detected) — that's fine
    if cfg is not None:
        assert "Debug Logging" not in cfg.feature_groups
        assert "CLI Mode" not in cfg.feature_groups
