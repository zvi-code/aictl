# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for _parse_windsurf_config Cascade feature detection."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.monitoring.tool_config import _parse_windsurf_config


@pytest.fixture()
def patch_windsurf_dirs(tmp_path, monkeypatch):
    """Point windsurf_global_dir() at a temp directory so tests don't read
    the developer's actual ~/.codeium/windsurf state."""
    global_dir = tmp_path / "codeium_windsurf"
    global_dir.mkdir(parents=True)
    monkeypatch.setattr("aictl.monitoring.tool_config.windsurf_global_dir", lambda: global_dir)
    return global_dir


def test_no_files_returns_none(patch_windsurf_dirs, tmp_path):
    """When neither global nor project config exists, parser returns None."""
    cfg = _parse_windsurf_config(tmp_path / "proj")
    assert cfg is None


def test_legacy_windsurfrules_detected(patch_windsurf_dirs, tmp_path):
    proj = tmp_path / "proj"
    proj.mkdir()
    (proj / ".windsurfrules").write_text("# rules\nbe concise")

    cfg = _parse_windsurf_config(proj)
    assert cfg is not None
    assert cfg.features.get("cascade_legacy_rules") is True


def test_modern_rules_directory_counted(patch_windsurf_dirs, tmp_path):
    proj = tmp_path / "proj"
    rules = proj / ".windsurf" / "rules"
    rules.mkdir(parents=True)
    (rules / "always.md").write_text("---\ntrigger: always\n---\nbe nice")
    (rules / "frontend.md").write_text("---\npaths: ['src/**']\n---\nuse react")

    cfg = _parse_windsurf_config(proj)
    assert cfg is not None
    assert cfg.features.get("cascade_rules_modern") is True
    assert cfg.settings.get("cascade_rules_count") == 2


def test_cascade_memories_detected(patch_windsurf_dirs, tmp_path):
    proj = tmp_path / "proj"
    mem = proj / "cascade-memories"
    mem.mkdir(parents=True)
    (mem / "note-1.md").write_text("...")
    (mem / "note-2.md").write_text("...")
    (mem / "note-3.md").write_text("...")

    cfg = _parse_windsurf_config(proj)
    assert cfg is not None
    assert cfg.features.get("cascade_memories") is True
    assert cfg.settings.get("cascade_memories_count") == 3


def test_global_rules_still_detected(patch_windsurf_dirs, tmp_path):
    """Pre-existing behavior: global_rules.md → settings["global_rules"]."""
    (patch_windsurf_dirs / "memories").mkdir()
    (patch_windsurf_dirs / "memories" / "global_rules.md").write_text("global notes")

    cfg = _parse_windsurf_config(tmp_path / "proj")
    assert cfg is not None
    assert cfg.settings.get("global_rules") == "configured"


def test_mcp_servers_from_project_and_global(patch_windsurf_dirs, tmp_path):
    proj = tmp_path / "proj"
    (proj / ".windsurf").mkdir(parents=True)
    (proj / ".windsurf" / "mcp.json").write_text(
        json.dumps({"mcpServers": {"github": {"url": "https://example.com"}}})
    )
    (patch_windsurf_dirs / "mcp_config.json").write_text(
        json.dumps({"mcpServers": {"local-fs": {"command": "node"}}})
    )

    cfg = _parse_windsurf_config(proj)
    assert cfg is not None
    assert set(cfg.mcp_servers) == {"github", "local-fs"}


def test_codeiumignore_project_only_detected(patch_windsurf_dirs, tmp_path):
    proj = tmp_path / "proj"
    proj.mkdir()
    (proj / ".codeiumignore").write_text("dist/\nnode_modules/\n")
    (proj / ".windsurfrules").write_text("# anything to trigger detection")

    cfg = _parse_windsurf_config(proj)
    assert cfg is not None
    assert cfg.features.get("codeiumignore") is True


def test_full_project_detected(patch_windsurf_dirs, tmp_path):
    """End-to-end: every cascade signal in one project."""
    proj = tmp_path / "proj"
    (proj / ".windsurf" / "rules").mkdir(parents=True)
    (proj / ".windsurf" / "rules" / "main.md").write_text("---\ntrigger: always\n---\nrule")
    (proj / ".windsurfrules").write_text("legacy")
    (proj / "cascade-memories").mkdir()
    (proj / "cascade-memories" / "x.md").write_text("x")
    (proj / ".codeiumignore").write_text("dist/")
    (proj / ".windsurf" / "mcp.json").write_text(
        json.dumps({"mcpServers": {"local": {"command": "node"}}})
    )

    cfg = _parse_windsurf_config(proj)
    assert cfg is not None
    assert cfg.features.get("cascade_legacy_rules") is True
    assert cfg.features.get("cascade_rules_modern") is True
    assert cfg.features.get("cascade_memories") is True
    assert cfg.features.get("codeiumignore") is True
    assert cfg.settings.get("cascade_rules_count") == 1
    assert cfg.settings.get("cascade_memories_count") == 1
    assert "local" in cfg.mcp_servers
