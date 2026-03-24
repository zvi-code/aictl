"""Tests for the status/discovery functionality."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from click.testing import CliRunner

from aictl.discovery import (
    discover_claude,
    discover_copilot,
    discover_cursor,
    discover_windsurf,
    discover_aictl,
    discover_all,
    _process_display_name,
    _parse_ps_output,
    ResourceFile,
    ProcessInfo,
    ToolResources,
)
from aictl.commands.status import status


# ---------------------------------------------------------------------------
# File discovery
# ---------------------------------------------------------------------------

class TestDiscoverClaude:
    def test_finds_claude_md(self, tmp_path):
        (tmp_path / "CLAUDE.md").write_text("Hello")
        res = discover_claude(tmp_path)
        assert res.tool == "claude"
        kinds = [f.kind for f in res.files]
        assert "instructions" in kinds

    def test_finds_local_md(self, tmp_path):
        (tmp_path / "CLAUDE.local.md").write_text("Profile stuff")
        res = discover_claude(tmp_path)
        assert any(f.kind == "instructions" for f in res.files)

    def test_finds_rules(self, tmp_path):
        rules = tmp_path / ".claude" / "rules"
        rules.mkdir(parents=True)
        (rules / "testing.md").write_text("---\npaths:\n  - src/\n---\nTest rules")
        res = discover_claude(tmp_path)
        assert any(f.kind == "rules" for f in res.files)

    def test_finds_commands(self, tmp_path):
        cmds = tmp_path / ".claude" / "commands"
        cmds.mkdir(parents=True)
        (cmds / "deploy.md").write_text("Deploy command")
        res = discover_claude(tmp_path)
        assert any(f.kind == "command" for f in res.files)

    def test_finds_skills(self, tmp_path):
        skill = tmp_path / ".claude" / "skills" / "my-skill"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("Skill content")
        res = discover_claude(tmp_path)
        assert any(f.kind == "skill" for f in res.files)

    def test_finds_settings(self, tmp_path):
        settings = tmp_path / ".claude"
        settings.mkdir(parents=True)
        (settings / "settings.json").write_text("{}")
        res = discover_claude(tmp_path)
        assert any(f.kind == "settings" for f in res.files)

    def test_finds_mcp(self, tmp_path):
        (tmp_path / ".mcp.json").write_text('{"mcpServers": {"fs": {"command": "npx"}}}')
        res = discover_claude(tmp_path)
        assert any(f.kind == "mcp" for f in res.files)
        assert len(res.mcp_servers) == 1
        assert res.mcp_servers[0]["name"] == "fs"

    def test_empty_dir(self, tmp_path):
        res = discover_claude(tmp_path)
        # May still have global settings — just check no crash
        assert res.tool == "claude"


class TestDiscoverCopilot:
    def test_finds_instructions(self, tmp_path):
        gh = tmp_path / ".github"
        gh.mkdir()
        (gh / "copilot-instructions.md").write_text("Instructions")
        res = discover_copilot(tmp_path)
        assert any(f.kind == "instructions" for f in res.files)

    def test_finds_agents_md(self, tmp_path):
        (tmp_path / "AGENTS.md").write_text("Agent stuff")
        res = discover_copilot(tmp_path)
        assert any(f.kind == "instructions" for f in res.files)

    def test_finds_agents(self, tmp_path):
        agents = tmp_path / ".github" / "agents"
        agents.mkdir(parents=True)
        (agents / "reviewer.agent.md").write_text("Review agent")
        res = discover_copilot(tmp_path)
        assert any(f.kind == "agent" for f in res.files)

    def test_finds_prompts(self, tmp_path):
        prompts = tmp_path / ".github" / "prompts"
        prompts.mkdir(parents=True)
        (prompts / "fix.prompt.md").write_text("Fix prompt")
        res = discover_copilot(tmp_path)
        assert any(f.kind == "prompt" for f in res.files)


class TestDiscoverCursor:
    def test_finds_rules(self, tmp_path):
        rules = tmp_path / ".cursor" / "rules"
        rules.mkdir(parents=True)
        (rules / "base.mdc").write_text("---\ndescription: base\n---\nRules")
        res = discover_cursor(tmp_path)
        assert any(f.kind == "rules" for f in res.files)

    def test_finds_legacy_cursorrules(self, tmp_path):
        (tmp_path / ".cursorrules").write_text("Legacy rules")
        res = discover_cursor(tmp_path)
        assert any(f.kind == "instructions (legacy)" for f in res.files)


class TestDiscoverWindsurf:
    def test_finds_windsurfrules(self, tmp_path):
        (tmp_path / ".windsurfrules").write_text("Windsurf rules")
        res = discover_windsurf(tmp_path)
        assert any(f.kind == "instructions" for f in res.files)

    def test_finds_rules_dir(self, tmp_path):
        rules = tmp_path / ".windsurf" / "rules"
        rules.mkdir(parents=True)
        (rules / "main.md").write_text("Rules")
        res = discover_windsurf(tmp_path)
        assert any(f.kind == "rules" for f in res.files)


class TestDiscoverAictl:
    def test_finds_aictx(self, tmp_path):
        (tmp_path / ".context.aictx").write_text("[base]\nHello world")
        res = discover_aictl(tmp_path)
        assert any(f.kind == "context" for f in res.files)

    def test_finds_manifest(self, tmp_path):
        d = tmp_path / ".ai-deployed"
        d.mkdir()
        (d / "manifest.json").write_text('{"files": []}')
        res = discover_aictl(tmp_path)
        assert any(f.kind == "manifest" for f in res.files)


# ---------------------------------------------------------------------------
# Process helpers
# ---------------------------------------------------------------------------

class TestProcessHelpers:
    def test_display_name_app_bundle(self):
        assert _process_display_name(
            "/Applications/Cursor.app/Contents/MacOS/Cursor Helper"
        ) == "Cursor"

    def test_display_name_plain_binary(self):
        assert _process_display_name("/usr/local/bin/claude --flag") == "claude"

    def test_display_name_nested_app(self):
        name = _process_display_name(
            "/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper"
        )
        assert name == "Visual Studio Code"


# ---------------------------------------------------------------------------
# CLI integration
# ---------------------------------------------------------------------------

class TestStatusCLI:
    def test_basic_run(self, tmp_path):
        (tmp_path / "CLAUDE.md").write_text("# Instructions")
        runner = CliRunner()
        result = runner.invoke(status, ["-r", str(tmp_path)])
        assert result.exit_code == 0
        assert "Claude Code" in result.output

    def test_json_output(self, tmp_path):
        (tmp_path / "CLAUDE.md").write_text("# Instructions")
        runner = CliRunner()
        result = runner.invoke(status, ["-r", str(tmp_path), "--json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert isinstance(data, list)
        claude = [d for d in data if d["tool"] == "claude"][0]
        assert any(f["kind"] == "instructions" for f in claude["files"])

    def test_tool_filter(self, tmp_path):
        (tmp_path / "CLAUDE.md").write_text("Hello")
        runner = CliRunner()
        result = runner.invoke(status, ["-r", str(tmp_path), "--tool", "cursor"])
        assert result.exit_code == 0
        assert "Claude Code" not in result.output

    def test_unknown_tool(self):
        runner = CliRunner()
        result = runner.invoke(status, ["--tool", "nonexistent"])
        assert result.exit_code != 0

    def test_empty_project(self, tmp_path):
        runner = CliRunner()
        result = runner.invoke(status, ["-r", str(tmp_path)])
        assert result.exit_code == 0
        # May or may not have global files — just ensure no crash

    def test_processes_flag(self, tmp_path):
        """--processes flag doesn't crash even with no processes."""
        runner = CliRunner()
        result = runner.invoke(status, ["-r", str(tmp_path), "--processes"])
        assert result.exit_code == 0
