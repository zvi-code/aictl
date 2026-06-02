# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for _parse_claude_code_config permission extraction.

Regression: the parser used to store ``settings["permissions"] = "configured"``
(a literal string), which made the dashboard's permissions grid classify every
capability as "n/a". The real allow/deny/ask arrays must be surfaced so the grid
can classify per-capability access.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.monitoring.tool_config import _parse_claude_code_config


@pytest.fixture()
def patch_claude_dirs(tmp_path, monkeypatch):
    home = tmp_path / "home"
    claude_global = home / ".claude"
    claude_global.mkdir(parents=True)
    monkeypatch.setattr("aictl.monitoring.tool_config.claude_global_dir", lambda: claude_global)
    monkeypatch.setattr("aictl.monitoring.tool_config.Path.home", classmethod(lambda cls: home))
    monkeypatch.setattr("aictl.monitoring.tool_config.IS_MACOS", False)
    return claude_global


def test_global_permissions_surface_real_arrays(patch_claude_dirs, tmp_path):
    (patch_claude_dirs / "settings.json").write_text(
        json.dumps(
            {
                "permissions": {
                    "allow": ["Read(*)", "Edit(src/**)"],
                    "deny": ["Bash(rm -rf *)"],
                    "ask": ["WebFetch(*)"],
                }
            }
        )
    )
    cfg = _parse_claude_code_config(tmp_path / "proj")
    assert cfg is not None
    perms = cfg.settings["permissions"]
    assert perms == {
        "allow": ["Read(*)", "Edit(src/**)"],
        "deny": ["Bash(rm -rf *)"],
        "ask": ["WebFetch(*)"],
    }


def test_project_permissions_merge_into_global(patch_claude_dirs, tmp_path):
    (patch_claude_dirs / "settings.json").write_text(
        json.dumps({"permissions": {"allow": ["Read(*)"], "deny": [], "ask": []}})
    )
    proj = tmp_path / "proj"
    proj_claude = proj / ".claude"
    proj_claude.mkdir(parents=True)
    (proj_claude / "settings.json").write_text(
        json.dumps({"permissions": {"allow": ["Edit(src/**)"], "deny": ["Bash(*)"]}})
    )

    cfg = _parse_claude_code_config(proj)
    assert cfg is not None
    perms = cfg.settings["permissions"]
    assert perms["allow"] == ["Read(*)", "Edit(src/**)"]
    assert perms["deny"] == ["Bash(*)"]
    assert cfg.settings["project_permissions"] == "configured"


def test_no_permissions_block_omits_key(patch_claude_dirs, tmp_path):
    (patch_claude_dirs / "settings.json").write_text(json.dumps({"effortLevel": "high"}))
    cfg = _parse_claude_code_config(tmp_path / "proj")
    assert cfg is not None
    assert "permissions" not in cfg.settings
