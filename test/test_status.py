"""Tests for the status/discovery functionality."""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from click.testing import CliRunner

from aictl.tools import (
    discover_all,
    compute_token_budget,
    _process_display_name,
    _parse_ps_output,
    ResourceFile,
    ProcessInfo,
    ToolResources,
)
from aictl.commands.status import status


def _discover_tool(root: Path, tool: str) -> ToolResources:
    """Helper: run discover_all for a single tool, return its ToolResources.

    When tool is a group name (e.g. "copilot"), merges all sub-tools.
    """
    from aictl.tools import expand_tool_filter
    results = discover_all(root, tools=[tool])
    if not results:
        return ToolResources(tool=tool, label=tool)
    # If there's an exact match, prefer it
    for r in results:
        if r.tool == tool:
            return r
    # Otherwise merge all results from the group
    merged = ToolResources(tool=tool, label=results[0].label)
    for r in results:
        merged.files.extend(r.files)
        merged.mcp_servers.extend(r.mcp_servers)
        merged.processes.extend(r.processes)
        merged.memory = merged.memory or r.memory
    return merged


# ---------------------------------------------------------------------------
# File discovery
# ---------------------------------------------------------------------------

class TestDiscoverClaude:
    def test_finds_claude_md(self, tmp_path):
        (tmp_path / "CLAUDE.md").write_text("Hello")
        res = _discover_tool(tmp_path, "claude-code")
        assert res.tool == "claude-code"
        kinds = [f.kind for f in res.files]
        assert "instructions" in kinds

    def test_finds_local_md(self, tmp_path):
        (tmp_path / "CLAUDE.local.md").write_text("Profile stuff")
        res = _discover_tool(tmp_path, "claude-code")
        assert any(f.kind == "instructions" for f in res.files)

    def test_finds_rules(self, tmp_path):
        rules = tmp_path / ".claude" / "rules"
        rules.mkdir(parents=True)
        (rules / "testing.md").write_text("---\npaths:\n  - src/\n---\nTest rules")
        res = _discover_tool(tmp_path, "claude-code")
        assert any(f.kind == "rules" for f in res.files)

    def test_finds_commands(self, tmp_path):
        cmds = tmp_path / ".claude" / "commands"
        cmds.mkdir(parents=True)
        (cmds / "deploy.md").write_text("Deploy command")
        res = _discover_tool(tmp_path, "claude-code")
        assert any(f.kind == "commands" for f in res.files)

    def test_finds_skills(self, tmp_path):
        skill = tmp_path / ".claude" / "skills" / "my-skill"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("Skill content")
        res = _discover_tool(tmp_path, "claude-code")
        assert any(f.kind == "skills" for f in res.files)

    def test_finds_settings(self, tmp_path):
        settings = tmp_path / ".claude"
        settings.mkdir(parents=True)
        (settings / "settings.json").write_text("{}")
        res = _discover_tool(tmp_path, "claude-code")
        assert any(f.kind == "config" for f in res.files)

    def test_finds_mcp(self, tmp_path):
        (tmp_path / ".mcp.json").write_text('{"mcpServers": {"fs": {"command": "npx"}}}')
        res = _discover_tool(tmp_path, "claude-code")
        assert any(f.kind == "config" for f in res.files)
        assert len(res.mcp_servers) == 1
        assert res.mcp_servers[0]["name"] == "fs"

    def test_empty_dir(self, tmp_path):
        res = _discover_tool(tmp_path, "claude-code")
        assert res.tool == "claude-code"


class TestDiscoverCopilot:
    def test_finds_instructions(self, tmp_path):
        gh = tmp_path / ".github"
        gh.mkdir()
        (gh / "copilot-instructions.md").write_text("Instructions")
        res = _discover_tool(tmp_path, "copilot")
        assert any(f.kind == "instructions" for f in res.files)

    def test_finds_agents_md(self, tmp_path):
        (tmp_path / "AGENTS.md").write_text("Agent stuff")
        res = _discover_tool(tmp_path, "copilot")
        assert any(f.kind == "instructions" for f in res.files)

    def test_finds_agents(self, tmp_path):
        agents = tmp_path / ".github" / "agents"
        agents.mkdir(parents=True)
        (agents / "reviewer.agent.md").write_text("Review agent")
        res = _discover_tool(tmp_path, "copilot")
        assert any(f.kind == "agent" for f in res.files)

    def test_finds_prompts(self, tmp_path):
        prompts = tmp_path / ".github" / "prompts"
        prompts.mkdir(parents=True)
        (prompts / "fix.prompt.md").write_text("Fix prompt")
        res = _discover_tool(tmp_path, "copilot")
        assert any("fix.prompt.md" in f.path for f in res.files)


class TestDiscoverCursor:
    def test_finds_rules(self, tmp_path):
        rules = tmp_path / ".cursor" / "rules"
        rules.mkdir(parents=True)
        (rules / "base.mdc").write_text("---\ndescription: base\n---\nRules")
        res = _discover_tool(tmp_path, "cursor")
        assert any(f.kind == "rules" for f in res.files)

    def test_finds_legacy_cursorrules(self, tmp_path):
        (tmp_path / ".cursorrules").write_text("Legacy rules")
        res = _discover_tool(tmp_path, "cursor")
        assert any(f.kind == "instructions" for f in res.files)


class TestDiscoverWindsurf:
    def test_finds_windsurfrules(self, tmp_path):
        (tmp_path / ".windsurfrules").write_text("Windsurf rules")
        res = _discover_tool(tmp_path, "windsurf")
        assert any(f.kind == "instructions" for f in res.files)

    def test_finds_rules_dir(self, tmp_path):
        rules = tmp_path / ".windsurf" / "rules"
        rules.mkdir(parents=True)
        (rules / "main.md").write_text("Rules")
        res = _discover_tool(tmp_path, "windsurf")
        assert any(f.kind == "rules" for f in res.files)


class TestDiscoverAictl:
    def test_finds_aictx(self, tmp_path):
        (tmp_path / ".context.toml").write_text('[instructions]\nbase = "Hello world"\n')
        results = discover_all(tmp_path, tools=["aictl"])
        aictl = [r for r in results if r.tool == "aictl"]
        assert aictl
        assert any(".context.toml" in f.path for f in aictl[0].files)

    def test_finds_manifest(self, tmp_path):
        d = tmp_path / ".ai-deployed"
        d.mkdir()
        (d / "manifest.json").write_text('{"files": []}')
        results = discover_all(tmp_path, tools=["aictl"])
        aictl = [r for r in results if r.tool == "aictl"]
        assert aictl
        assert any("manifest.json" in f.path for f in aictl[0].files)


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

    @pytest.mark.skipif(sys.platform != "darwin", reason="macOS .app path parsing")
    def test_display_name_nested_app(self):
        name = _process_display_name(
            "/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper"
        )
        assert name == "Visual Studio Code"


# ---------------------------------------------------------------------------
# Token budget
# ---------------------------------------------------------------------------

class TestTokenBudget:
    def test_basic_budget(self):
        tr = ToolResources(tool="test", label="Test")
        tr.files = [
            ResourceFile("a.md", "instructions", tokens=100,
                         sent_to_llm="yes", loaded_when="every-call",
                         cacheable="yes", survives_compaction="yes"),
            ResourceFile("b.md", "rules", tokens=50,
                         sent_to_llm="conditional", loaded_when="on-file-match",
                         cacheable="yes", survives_compaction="yes"),
            ResourceFile("c.json", "config", tokens=30,
                         sent_to_llm="no", loaded_when="session-start"),
        ]
        budget = compute_token_budget([tr])
        assert budget["always_loaded_tokens"] == 100
        assert budget["conditional_tokens"] == 50
        assert budget["never_sent_count"] == 1
        assert budget["total_potential_tokens"] == 150


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
        result = runner.invoke(status, ["-r", str(tmp_path), "--json", "--no-server"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert isinstance(data, list)
        claude = [d for d in data if d["tool"] == "claude-code"][0]
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

    def test_processes_flag(self, tmp_path):
        """--processes flag doesn't crash even with no processes."""
        runner = CliRunner()
        result = runner.invoke(status, ["-r", str(tmp_path), "--processes"])
        assert result.exit_code == 0

    def test_budget_flag(self, tmp_path):
        (tmp_path / "CLAUDE.md").write_text("# Instructions")
        runner = CliRunner()
        result = runner.invoke(status, ["-r", str(tmp_path), "--budget"])
        assert result.exit_code == 0
        assert "Token Budget" in result.output


# ---------------------------------------------------------------------------
# CSV-driven discovery for tools that were previously separate functions
# ---------------------------------------------------------------------------

class TestDiscoverCopilot365:
    def test_finds_teamsapp_yml(self, tmp_path):
        (tmp_path / "teamsapp.yml").write_text("version: 1.0\n")
        res = _discover_tool(tmp_path, "copilot365")
        assert any("config" in f.kind for f in res.files)

    def test_empty_dir(self, tmp_path):
        res = _discover_tool(tmp_path, "copilot365")
        assert res.tool == "copilot365"


class TestDiscoverAzureAI:
    def test_finds_azure_yaml_under_project_env(self, tmp_path):
        # azure.yaml was reassigned from azure-ai to project-env (azure-ai is not
        # an interactive AI tool; its config files are tracked as project context)
        (tmp_path / "azure.yaml").write_text("name: myapp\nservices:\n  api:\n    project: ./api\n")
        res = _discover_tool(tmp_path, "project-env")
        assert any("azure" in f.path.lower() or "config" in f.kind for f in res.files)

    def test_empty_dir(self, tmp_path):
        res = _discover_tool(tmp_path, "project-env")
        assert res.tool == "project-env"
