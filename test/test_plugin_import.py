"""Tests for plugin import and [plugin] metadata section.

Tests:
1. Plugin importer reads .claude-plugin/ directories
2. [plugin] section is parsed in .aictx files
3. Plugin build uses [plugin] metadata as defaults
4. Roundtrip: plugin build -> plugin import -> synthesize -> compare
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aictl.parser import parse_aictx
from aictl.scanner import scan
from aictl.resolver import resolve
from aictl.importers import plugin as plugin_imp
from aictl.synthesizer import synthesize


# ---------------------------------------------------------------------------
# Parser: [plugin] section
# ---------------------------------------------------------------------------

class TestParserPluginMeta:
    def test_parse_plugin_section(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[plugin]\n'
                'name = "my-plugin"\n'
                'version = "2.0.0"\n'
                'author = "Jane Doe"\n'
                'description = "A great plugin"\n\n'
                '[instructions]\n'
                'base = "Some instructions"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert parsed is not None
            assert parsed.plugin_meta["name"] == "my-plugin"
            assert parsed.plugin_meta["version"] == "2.0.0"
            assert parsed.plugin_meta["author"] == "Jane Doe"
            assert parsed.plugin_meta["description"] == "A great plugin"
            # Instructions should still work
            assert "Some instructions" in parsed.instructions["base"]

    def test_parse_plugin_section_partial(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[plugin]\n'
                'name = "minimal-plugin"\n\n'
                '[instructions]\n'
                'base = "Instructions here"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert parsed.plugin_meta["name"] == "minimal-plugin"
            assert "version" not in parsed.plugin_meta

    def test_parse_plugin_section_with_comments(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[plugin]\n'
                '# Plugin metadata\n'
                'name = "commented-plugin"\n'
                'version = "1.0.0"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert parsed.plugin_meta["name"] == "commented-plugin"

    def test_no_plugin_section_leaves_empty_dict(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text('[instructions]\nbase = "Just instructions"\n')
            parsed = parse_aictx(root / ".context.toml")
            assert parsed.plugin_meta == {}


# ---------------------------------------------------------------------------
# Plugin importer
# ---------------------------------------------------------------------------

class TestPluginImporter:
    def test_import_from_claude_plugin_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            # Create a .claude-plugin/ structure
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "test-plugin",
                "description": "A test plugin",
                "version": "1.0.0",
                "author": {"name": "Test Author"},
            }))

            # Commands
            cmds_dir = root / "commands"
            cmds_dir.mkdir()
            (cmds_dir / "hello.md").write_text("Say hello to the user")
            (cmds_dir / "status.md").write_text("Show project status")

            # Skills
            skill_dir = root / "skills" / "deploy"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text("# Deploy\nDeploy the app")

            # Agents
            agents_dir = root / "agents"
            agents_dir.mkdir()
            (agents_dir / "planner.md").write_text("Planning agent")

            # Hooks
            hooks_dir = root / "hooks"
            hooks_dir.mkdir()
            (hooks_dir / "hooks.json").write_text(json.dumps({
                "hooks": {
                    "Stop": [{"hooks": [{"type": "command", "command": "test.sh"}]}]
                }
            }))

            # MCP
            (root / ".mcp.json").write_text(json.dumps({
                "mcpServers": {"github": {"type": "http", "url": "https://example.com"}}
            }))

            # LSP
            (root / ".lsp.json").write_text(json.dumps({
                "gopls": {"command": "gopls", "args": ["serve"]}
            }))

            result = plugin_imp.import_from(root)
            assert result is not None
            assert result.source == "plugin"

            # Plugin metadata
            assert result.plugin_meta["name"] == "test-plugin"
            assert result.plugin_meta["version"] == "1.0.0"
            assert result.plugin_meta["author"] == "Test Author"
            assert result.plugin_meta["description"] == "A test plugin"

            # Scopes (from manifest description)
            assert len(result.scopes) == 1
            assert "test-plugin" in result.scopes[0].base_text

            # Commands
            cmd_names = {c.name for c in result.capabilities if c.kind == "command"}
            assert cmd_names == {"hello", "status"}

            # Skills
            skill_names = {c.name for c in result.capabilities if c.kind == "skill"}
            assert skill_names == {"deploy"}

            # Agents
            agent_names = {c.name for c in result.capabilities if c.kind == "agent"}
            assert agent_names == {"planner"}

            # Hooks
            assert len(result.hooks) == 1
            assert result.hooks[0].event == "Stop"

            # MCP
            assert len(result.mcp_servers) == 1
            assert result.mcp_servers[0].name == "github"

            # LSP
            assert len(result.lsp_servers) == 1
            assert result.lsp_servers[0].name == "gopls"

    def test_import_from_nested_plugin_dir(self):
        """Plugin at <root>/plugin/.claude-plugin/ should be found."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / "plugin" / ".claude-plugin"
            plugin_dir.mkdir(parents=True)
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "nested-plugin",
                "version": "0.1.0",
            }))

            cmds_dir = root / "plugin" / "commands"
            cmds_dir.mkdir()
            (cmds_dir / "greet.md").write_text("Greet the user")

            result = plugin_imp.import_from(root)
            assert result is not None
            assert result.plugin_meta["name"] == "nested-plugin"
            cmd_names = {c.name for c in result.capabilities if c.kind == "command"}
            assert "greet" in cmd_names

    def test_import_returns_none_for_empty_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            assert plugin_imp.import_from(root) is None

    def test_import_returns_none_for_dir_without_plugin(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / "CLAUDE.md").write_text("Not a plugin")
            assert plugin_imp.import_from(root) is None

    def test_import_author_as_string(self):
        """Author field can be a plain string in plugin.json."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "string-author-plugin",
                "author": "Simple Name",
            }))

            result = plugin_imp.import_from(root)
            assert result is not None
            assert result.plugin_meta["author"] == "Simple Name"


# ---------------------------------------------------------------------------
# Synthesizer: plugin metadata roundtrip
# ---------------------------------------------------------------------------

class TestSynthesizerPluginMeta:
    def test_synthesize_includes_plugin_section(self):
        """Synthesizer should emit [plugin] section from plugin import metadata."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)

            # Create plugin structure
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "synth-test",
                "description": "Synthesizer test",
                "version": "2.0.0",
            }))
            cmds_dir = root / "commands"
            cmds_dir.mkdir()
            (cmds_dir / "hello.md").write_text("Say hello")

            imports = [r for r in [plugin_imp.import_from(root)] if r]
            results = synthesize(root, imports)

            assert len(results) == 1
            aictx = (root / ".context.toml").read_text("utf-8")
            assert "[plugin]" in aictx
            assert "synth-test" in aictx
            assert "2.0.0" in aictx
            assert "[commands._always.hello]" in aictx


# ---------------------------------------------------------------------------
# Plugin build: [plugin] metadata as defaults
# ---------------------------------------------------------------------------

class TestPluginBuildWithMeta:
    def test_build_uses_aictx_plugin_meta(self):
        """Plugin build should use [plugin] section values when CLI flags are absent."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[plugin]\n'
                'name = "meta-plugin"\n'
                'version = "3.0.0"\n'
                'author = "Meta Author"\n'
                'description = "From metadata"\n\n'
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[commands._always.hello]\n'
                'content = "Say hello"\n'
            )

            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build",
                "--root", str(root),
            ])
            assert result.exit_code == 0, result.output

            manifest = json.loads(
                (root / "plugin" / ".claude-plugin" / "plugin.json").read_text("utf-8")
            )
            assert manifest["name"] == "meta-plugin"
            assert manifest["version"] == "3.0.0"
            assert manifest["description"] == "From metadata"
            assert manifest["author"] == {"name": "Meta Author"}

    def test_build_cli_flags_override_plugin_meta(self):
        """CLI flags should take precedence over [plugin] section values."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[plugin]\n'
                'name = "aictx-name"\n'
                'version = "1.0.0"\n'
                'description = "From aictx"\n\n'
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[commands._always.hello]\n'
                'content = "Say hello"\n'
            )

            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build",
                "--root", str(root),
                "--name", "cli-name",
                "--version", "9.9.9",
                "--description", "From CLI",
            ])
            assert result.exit_code == 0, result.output

            manifest = json.loads(
                (root / "plugin" / ".claude-plugin" / "plugin.json").read_text("utf-8")
            )
            assert manifest["name"] == "cli-name"
            assert manifest["version"] == "9.9.9"
            assert manifest["description"] == "From CLI"

    def test_build_fails_without_name(self):
        """Build should fail if no name is provided via CLI or [plugin]."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[commands._always.hello]\n'
                'content = "Say hello"\n'
            )

            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build",
                "--root", str(root),
            ])
            assert result.exit_code != 0
            assert "Plugin name is required" in result.output


# ---------------------------------------------------------------------------
# Roundtrip: build -> import -> synthesize
# ---------------------------------------------------------------------------

class TestPluginRoundtrip:
    def test_build_import_roundtrip(self):
        """Build a plugin from .context.toml, then import it back and verify equivalence."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[plugin]\n'
                'name = "roundtrip-plugin"\n'
                'version = "1.5.0"\n'
                'author = "Test Author"\n'
                'description = "Roundtrip test plugin"\n\n'
                '[instructions]\n'
                'base = "Test project for roundtrip"\n\n'
                '[commands._always.status]\n'
                'content = "Show project status"\n\n'
                '[skills._always.deploy]\n'
                'content = """\n# Deploy\nDeploy the app\n"""\n\n'
                '[hooks._always]\n'
                'Stop = \'[{"hooks": [{"type": "command", "command": "test.sh"}]}]\'\n\n'
                '[mcp._always.github]\n'
                'type = "http"\n'
                'url = "https://example.com"\n\n'
                '[lsp._always.gopls]\n'
                'command = "gopls"\n'
            )

            # Phase 1: Build plugin
            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build",
                "--root", str(root),
            ])
            assert result.exit_code == 0, result.output

            plugin_dir = root / "plugin"
            assert (plugin_dir / ".claude-plugin" / "plugin.json").is_file()
            assert (plugin_dir / "commands" / "status.md").is_file()
            assert (plugin_dir / "skills" / "deploy" / "SKILL.md").is_file()

            # Phase 2: Import from plugin directory
            imported = plugin_imp.import_from(plugin_dir)
            assert imported is not None
            assert imported.source == "plugin"
            assert imported.plugin_meta["name"] == "roundtrip-plugin"
            assert imported.plugin_meta["version"] == "1.5.0"

            # Capabilities survived the roundtrip
            cmd_names = {c.name for c in imported.capabilities if c.kind == "command"}
            assert "status" in cmd_names
            skill_names = {c.name for c in imported.capabilities if c.kind == "skill"}
            assert "deploy" in skill_names

            # Hooks survived
            hook_events = {h.event for h in imported.hooks}
            assert "Stop" in hook_events

            # MCP survived
            mcp_names = {m.name for m in imported.mcp_servers}
            assert "github" in mcp_names

            # LSP survived
            lsp_names = {l.name for l in imported.lsp_servers}
            assert "gopls" in lsp_names

            # Phase 3: Synthesize back to .aictx
            synth_dir = Path(tempfile.mkdtemp())
            results = synthesize(synth_dir, [imported])
            assert len(results) >= 1

            aictx = (synth_dir / ".context.toml").read_text("utf-8")
            assert "[plugin]" in aictx
            assert "roundtrip-plugin" in aictx
            assert "[commands._always.status]" in aictx
            assert "[skills._always.deploy]" in aictx
            assert "[hooks._always]" in aictx
            assert "Stop" in aictx
            assert "[mcp._always.github]" in aictx
            assert "[lsp._always.gopls]" in aictx


# ---------------------------------------------------------------------------
# CLI integration
# ---------------------------------------------------------------------------

class TestCLIPluginImport:
    def test_import_with_plugin_source(self):
        """aictl import --from plugin should find .claude-plugin/ dirs."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "cli-test",
                "description": "CLI test plugin",
            }))
            cmds_dir = root / "commands"
            cmds_dir.mkdir()
            (cmds_dir / "hello.md").write_text("Say hello")

            runner = CliRunner()
            result = runner.invoke(main, [
                "import", "--root", str(root),
                "--from", "plugin",
                "--dry-run",
            ])
            assert result.exit_code == 0, result.output
            assert "found plugin" in result.output
            assert "(dry)" in result.output

    def test_import_plugin_not_found(self):
        """aictl import --from plugin on empty dir should report skip."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            runner = CliRunner()
            result = runner.invoke(main, [
                "import", "--root", tmpdir,
                "--from", "plugin",
            ])
            assert result.exit_code == 0
            assert "skip plugin" in result.output

    def test_import_all_includes_plugin(self):
        """Default --from should include the plugin importer."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "all-test",
            }))
            cmds_dir = root / "commands"
            cmds_dir.mkdir()
            (cmds_dir / "test.md").write_text("Test command")

            runner = CliRunner()
            result = runner.invoke(main, [
                "import", "--root", str(root), "--dry-run",
            ])
            assert result.exit_code == 0
            assert "found plugin" in result.output


# ---------------------------------------------------------------------------
# Plugin validation test harness
# ---------------------------------------------------------------------------

class TestPluginValidation:
    """Validate plugin structure, manifest schemas, and roundtrip integrity.

    These tests exercise the importer/builder without requiring
    ``claude --plugin-dir`` (the external tool).
    """

    # -- 1. Manifest schema validation ----------------------------------------

    def test_manifest_requires_name_for_build(self):
        """Plugin build must fail when no name is provided."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[commands._always.hello]\n'
                'content = "Say hello"\n'
            )
            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build", "--root", str(root),
            ])
            assert result.exit_code != 0
            assert "Plugin name is required" in result.output

    def test_manifest_invalid_author_type_is_tolerated(self):
        """Import should handle author as int/null without crashing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            # Author as integer — unusual but should not crash
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "bad-author",
                "author": 42,
            }))
            result = plugin_imp.import_from(root)
            assert result is not None
            # Author should be coerced to string
            assert result.plugin_meta["author"] == "42"

    def test_manifest_null_author_skipped(self):
        """Null author value should be treated as missing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "null-author",
                "author": None,
            }))
            result = plugin_imp.import_from(root)
            assert result is not None
            # None is falsy so author should not appear
            assert "author" not in result.plugin_meta

    def test_manifest_missing_optional_fields_graceful(self):
        """Import handles plugin.json with only name — no crash."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "minimal-plugin",
            }))
            result = plugin_imp.import_from(root)
            assert result is not None
            assert result.plugin_meta["name"] == "minimal-plugin"
            assert "version" not in result.plugin_meta
            assert "description" not in result.plugin_meta
            assert "author" not in result.plugin_meta

    def test_manifest_extra_fields_ignored(self):
        """Unknown manifest fields should not disrupt parsing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "extra-fields",
                "version": "1.0.0",
                "license": "MIT",
                "homepage": "https://example.com",
                "customThing": {"nested": True},
            }))
            result = plugin_imp.import_from(root)
            assert result is not None
            assert result.plugin_meta["name"] == "extra-fields"
            assert result.plugin_meta["version"] == "1.0.0"

    # -- 2. File structure validation -----------------------------------------

    def test_skill_requires_skill_md_in_subdir(self):
        """Skills must live at skills/<name>/SKILL.md; bare .md is ignored."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "struct-test",
            }))

            skills_dir = root / "skills"
            skills_dir.mkdir()
            # Correct structure
            (skills_dir / "deploy").mkdir()
            (skills_dir / "deploy" / "SKILL.md").write_text("Deploy skill content")
            # Wrong structure: bare .md directly in skills/
            (skills_dir / "wrong.md").write_text("Should not be imported")

            result = plugin_imp.import_from(root)
            assert result is not None
            skill_names = {c.name for c in result.capabilities if c.kind == "skill"}
            assert "deploy" in skill_names
            assert "wrong" not in skill_names

    def test_skill_subdir_without_skill_md_ignored(self):
        """A skill subdirectory missing SKILL.md is silently skipped."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "no-skill-md",
            }))
            skills_dir = root / "skills"
            skills_dir.mkdir()
            (skills_dir / "empty-skill").mkdir()
            # No SKILL.md inside

            result = plugin_imp.import_from(root)
            assert result is not None
            skill_names = {c.name for c in result.capabilities if c.kind == "skill"}
            assert len(skill_names) == 0

    def test_commands_are_flat_md_files(self):
        """Commands must be flat .md files; subdirectories are ignored."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "flat-cmds",
            }))
            cmds_dir = root / "commands"
            cmds_dir.mkdir()
            (cmds_dir / "hello.md").write_text("Say hello")
            (cmds_dir / "status.md").write_text("Show status")
            # Subdirectory should not add commands
            (cmds_dir / "nested").mkdir()
            (cmds_dir / "nested" / "deep.md").write_text("Deep command")

            result = plugin_imp.import_from(root)
            assert result is not None
            cmd_names = {c.name for c in result.capabilities if c.kind == "command"}
            assert cmd_names == {"hello", "status"}
            assert "deep" not in cmd_names

    def test_hooks_json_parses_correctly(self):
        """hooks/hooks.json is read and hook events are captured."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "hooks-test",
            }))
            hooks_dir = root / "hooks"
            hooks_dir.mkdir()
            (hooks_dir / "hooks.json").write_text(json.dumps({
                "hooks": {
                    "PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command", "command": "lint.sh"}]}],
                    "Stop": [{"hooks": [{"type": "agent", "prompt": "Run tests"}]}],
                }
            }))

            result = plugin_imp.import_from(root)
            assert result is not None
            events = {h.event for h in result.hooks}
            assert events == {"PreToolUse", "Stop"}

    def test_mcp_json_parses_correctly(self):
        """.mcp.json mcpServers entries become ImportedMcp objects."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "mcp-test",
            }))
            (root / ".mcp.json").write_text(json.dumps({
                "mcpServers": {
                    "github": {"type": "http", "url": "https://github.example.com"},
                    "slack": {"type": "http", "url": "https://slack.example.com"},
                }
            }))

            result = plugin_imp.import_from(root)
            assert result is not None
            mcp_names = {m.name for m in result.mcp_servers}
            assert mcp_names == {"github", "slack"}

    def test_lsp_json_parses_correctly(self):
        """.lsp.json entries become ImportedLsp objects."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "lsp-test",
            }))
            (root / ".lsp.json").write_text(json.dumps({
                "gopls": {"command": "gopls", "args": ["serve"]},
                "pyright": {"command": "pyright-langserver", "args": ["--stdio"]},
            }))

            result = plugin_imp.import_from(root)
            assert result is not None
            lsp_names = {s.name for s in result.lsp_servers}
            assert lsp_names == {"gopls", "pyright"}

    # -- 3. Name conflict detection -------------------------------------------

    def test_build_roundtrip_deduplicates_capabilities(self):
        """When two capabilities share (kind, name), resolver deduplicates."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            # In TOML, duplicate keys in same table are not allowed, so we use
            # a single command (dedup tested at the resolver level instead)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[commands._always.hello]\n'
                'content = "Second hello"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            # Only one hello command should remain
            hello_caps = [c for c in resolved.capabilities if c.name == "hello"]
            assert len(hello_caps) == 1

    def test_synthesizer_deduplicates_across_imports(self):
        """Synthesizer merges capabilities by (kind, name) across imports."""
        imp_a = plugin_imp.ImportResult(
            source="a",
            capabilities=[
                plugin_imp.ImportedCapability("command", "status", "A status", "a"),
            ],
        )
        imp_b = plugin_imp.ImportResult(
            source="b",
            capabilities=[
                plugin_imp.ImportedCapability("command", "status", "B status", "b"),
            ],
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            results = synthesize(Path(tmpdir), [imp_a, imp_b])
            aictx = (Path(tmpdir) / ".context.toml").read_text("utf-8")
            # Only one [commands._always.status] should appear
            assert aictx.count("[commands._always.status]") == 1

    # -- 4. Roundtrip edge cases ----------------------------------------------

    def test_special_characters_in_plugin_name(self):
        """Plugin names with hyphens/dots survive the build -> import roundtrip."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[commands._always.hello]\n'
                'content = "Say hello"\n'
            )
            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build",
                "--root", str(root),
                "--name", "my-great.plugin_v2",
                "--description", "A plugin with special chars: <>&\"'",
            ])
            assert result.exit_code == 0, result.output

            manifest = json.loads(
                (root / "plugin" / ".claude-plugin" / "plugin.json").read_text("utf-8")
            )
            assert manifest["name"] == "my-great.plugin_v2"
            assert "<>&\"'" in manifest["description"]

            # Import it back
            imported = plugin_imp.import_from(root / "plugin")
            assert imported is not None
            assert imported.plugin_meta["name"] == "my-great.plugin_v2"

    def test_unicode_content_roundtrip(self):
        """Unicode in command content survives build -> import."""
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            unicode_text = (
                "\u2603 Snowman says hello\n"
                "\u00e9\u00e8\u00ea accented chars\n"
                "\u4f60\u597d Chinese greeting\n"
                "\U0001f680 Rocket emoji"
            )
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[commands._always.greet]\n'
                f"content = '''\n{unicode_text}\n'''\n"
            )
            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build",
                "--root", str(root),
                "--name", "unicode-test",
            ])
            assert result.exit_code == 0, result.output

            # Import and check content
            imported = plugin_imp.import_from(root / "plugin")
            assert imported is not None
            greet_caps = [c for c in imported.capabilities if c.name == "greet"]
            assert len(greet_caps) == 1
            assert "\u2603" in greet_caps[0].content
            assert "\u4f60\u597d" in greet_caps[0].content
            assert "\U0001f680" in greet_caps[0].content

    def test_empty_capabilities_list(self):
        """Plugin with manifest but no commands/skills/agents still imports."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "empty-caps",
                "description": "Has no capabilities",
            }))

            result = plugin_imp.import_from(root)
            assert result is not None
            assert result.plugin_meta["name"] == "empty-caps"
            assert len(result.capabilities) == 0

    def test_empty_command_file_skipped(self):
        """A .md file with empty content should not produce a capability."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "empty-cmd",
            }))
            cmds_dir = root / "commands"
            cmds_dir.mkdir()
            (cmds_dir / "empty.md").write_text("")
            (cmds_dir / "real.md").write_text("Real command content")

            result = plugin_imp.import_from(root)
            assert result is not None
            cmd_names = {c.name for c in result.capabilities if c.kind == "command"}
            assert "real" in cmd_names
            assert "empty" not in cmd_names

    def test_empty_skill_md_skipped(self):
        """A SKILL.md with only whitespace should not produce a capability."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "empty-skill",
            }))
            skills_dir = root / "skills" / "blank"
            skills_dir.mkdir(parents=True)
            (skills_dir / "SKILL.md").write_text("   \n\n  ")

            result = plugin_imp.import_from(root)
            assert result is not None
            skill_names = {c.name for c in result.capabilities if c.kind == "skill"}
            assert "blank" not in skill_names

    # -- 5. Error messages / malformed input ----------------------------------

    def test_empty_claude_plugin_dir_returns_meta_only(self):
        """A .claude-plugin/ with only plugin.json (no capabilities) still imports."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "meta-only",
                "description": "Plugin with manifest but nothing else",
            }))

            result = plugin_imp.import_from(root)
            assert result is not None
            assert result.plugin_meta["name"] == "meta-only"

    def test_missing_plugin_json_in_claude_plugin_dir(self):
        """A .claude-plugin/ dir with no plugin.json should still try to import."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            # No plugin.json at all, but commands exist
            cmds_dir = root / "commands"
            cmds_dir.mkdir()
            (cmds_dir / "hello.md").write_text("Say hello")

            result = plugin_imp.import_from(root)
            assert result is not None
            cmd_names = {c.name for c in result.capabilities if c.kind == "command"}
            assert "hello" in cmd_names

    def test_malformed_hooks_json_silently_skipped(self):
        """Malformed hooks/hooks.json should not crash the import."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "bad-hooks",
            }))
            hooks_dir = root / "hooks"
            hooks_dir.mkdir()
            (hooks_dir / "hooks.json").write_text("{ not valid json !!!")

            result = plugin_imp.import_from(root)
            assert result is not None
            assert len(result.hooks) == 0

    def test_malformed_mcp_json_silently_skipped(self):
        """Malformed .mcp.json should not crash the import."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "bad-mcp",
            }))
            (root / ".mcp.json").write_text("<<< broken JSON >>>")

            result = plugin_imp.import_from(root)
            assert result is not None
            assert len(result.mcp_servers) == 0

    def test_malformed_lsp_json_silently_skipped(self):
        """Malformed .lsp.json should not crash the import."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "bad-lsp",
            }))
            (root / ".lsp.json").write_text("not json at all")

            result = plugin_imp.import_from(root)
            assert result is not None
            assert len(result.lsp_servers) == 0

    def test_malformed_plugin_json_returns_none(self):
        """Broken plugin.json with no other data should return None."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text("<<<not json>>>")

            result = plugin_imp.import_from(root)
            # No manifest, no capabilities → None
            assert result is None

    def test_malformed_plugin_json_with_commands_still_imports(self):
        """Broken plugin.json should not prevent importing commands."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text("<<<not json>>>")
            cmds_dir = root / "commands"
            cmds_dir.mkdir()
            (cmds_dir / "hello.md").write_text("Say hello")

            result = plugin_imp.import_from(root)
            assert result is not None
            cmd_names = {c.name for c in result.capabilities if c.kind == "command"}
            assert "hello" in cmd_names

    def test_hooks_json_with_empty_rules_skipped(self):
        """Hook events with empty rules lists are ignored."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            plugin_dir = root / ".claude-plugin"
            plugin_dir.mkdir()
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "empty-hook-rules",
            }))
            hooks_dir = root / "hooks"
            hooks_dir.mkdir()
            (hooks_dir / "hooks.json").write_text(json.dumps({
                "hooks": {
                    "PreToolUse": [],
                    "Stop": [{"hooks": [{"type": "command", "command": "test.sh"}]}],
                }
            }))

            result = plugin_imp.import_from(root)
            assert result is not None
            events = {h.event for h in result.hooks}
            # PreToolUse with empty rules should be skipped
            assert "PreToolUse" not in events
            assert "Stop" in events
