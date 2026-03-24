"""Tests for hooks, LSP servers, and plugin packaging."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aictl.parser import parse_aictx, Hook, LspServer
from aictl.scanner import scan
from aictl.resolver import resolve
from aictl.emitters import claude as claude_emit
from aictl.importers import claude as claude_imp
from aictl.synthesizer import synthesize


FIXTURE_ROOT = Path(__file__).parent / "fixtures" / "project"


# ---------------------------------------------------------------------------
# Parser tests
# ---------------------------------------------------------------------------

class TestParserHooks:
    def test_parse_hook_single_rule(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[hook:_always:PreToolUse]\n'
                '[{"matcher": "Bash", "hooks": [{"type": "command", "command": "echo hi"}]}]\n'
            )
            parsed = parse_aictx(root / ".context.aictx")
            assert len(parsed.hooks) == 1
            h = parsed.hooks[0]
            assert h.event == "PreToolUse"
            assert h.profile == "_always"
            assert len(h.rules) == 1
            assert h.rules[0]["matcher"] == "Bash"

    def test_parse_hook_dict_auto_wraps_to_list(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[hook:debug:Stop]\n'
                '{"hooks": [{"type": "agent", "prompt": "Run tests"}]}\n'
            )
            parsed = parse_aictx(root / ".context.aictx")
            assert len(parsed.hooks) == 1
            h = parsed.hooks[0]
            assert h.event == "Stop"
            assert h.profile == "debug"
            assert len(h.rules) == 1

    def test_parse_hook_multiple_rules(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[hook:_always:PreToolUse]\n'
                '[\n'
                '  {"matcher": "Bash", "hooks": [{"type": "command", "command": "lint.sh"}]},\n'
                '  {"matcher": "Write", "hooks": [{"type": "command", "command": "log.sh"}]}\n'
                ']\n'
            )
            parsed = parse_aictx(root / ".context.aictx")
            assert len(parsed.hooks) == 1
            assert len(parsed.hooks[0].rules) == 2

    def test_parse_hook_skips_malformed_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[hook:_always:PreToolUse]\n'
                'not valid json\n'
            )
            parsed = parse_aictx(root / ".context.aictx")
            assert len(parsed.hooks) == 0

    def test_hooks_for_filters_by_profile(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[hook:_always:PreToolUse]\n'
                '[{"matcher": "Bash", "hooks": [{"type": "command", "command": "a.sh"}]}]\n\n'
                '[hook:debug:Stop]\n'
                '[{"hooks": [{"type": "agent", "prompt": "test"}]}]\n\n'
                '[hook:review:Stop]\n'
                '[{"hooks": [{"type": "agent", "prompt": "lint"}]}]\n'
            )
            parsed = parse_aictx(root / ".context.aictx")
            # With debug profile: PreToolUse + debug Stop
            hooks = parsed.hooks_for("debug")
            assert "PreToolUse" in hooks
            assert "Stop" in hooks
            assert len(hooks["Stop"]) == 1
            assert hooks["Stop"][0]["hooks"][0]["prompt"] == "test"

            # With review profile: PreToolUse + review Stop
            hooks = parsed.hooks_for("review")
            assert "PreToolUse" in hooks
            assert "Stop" in hooks
            assert hooks["Stop"][0]["hooks"][0]["prompt"] == "lint"

            # With no profile: only _always
            hooks = parsed.hooks_for(None)
            assert "PreToolUse" in hooks
            assert "Stop" not in hooks


class TestParserLsp:
    def test_parse_lsp_server(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[lsp:_always:gopls]\n'
                '{"command": "gopls", "args": ["serve"]}\n'
            )
            parsed = parse_aictx(root / ".context.aictx")
            assert len(parsed.lsp_servers) == 1
            s = parsed.lsp_servers[0]
            assert s.name == "gopls"
            assert s.config["command"] == "gopls"

    def test_lsp_for_filters_by_profile(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[lsp:_always:gopls]\n'
                '{"command": "gopls", "args": ["serve"]}\n\n'
                '[lsp:debug:delve]\n'
                '{"command": "dlv", "args": ["dap"]}\n'
            )
            parsed = parse_aictx(root / ".context.aictx")
            servers = parsed.lsp_for("debug")
            assert "gopls" in servers
            assert "delve" in servers

            servers = parsed.lsp_for(None)
            assert "gopls" in servers
            assert "delve" not in servers


# ---------------------------------------------------------------------------
# Resolver tests
# ---------------------------------------------------------------------------

class TestResolverHooks:
    def test_resolve_hooks_from_root(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[base]\nTest project\n\n'
                '[hook:_always:PreToolUse]\n'
                '[{"matcher": "Bash", "hooks": [{"type": "command", "command": "a.sh"}]}]\n\n'
                '[hook:debug:Stop]\n'
                '[{"hooks": [{"type": "agent", "prompt": "test"}]}]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, "debug")
            assert "PreToolUse" in resolved.hooks
            assert "Stop" in resolved.hooks

    def test_resolve_hooks_excludes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[base]\nTest project\n\n'
                '[hook:_always:PreToolUse]\n'
                '[{"matcher": "Bash", "hooks": [{"type": "command", "command": "a.sh"}]}]\n\n'
                '[hook:_always:Stop]\n'
                '[{"hooks": [{"type": "agent", "prompt": "test"}]}]\n\n'
                '[exclude]\nhook:_always:Stop\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            assert "PreToolUse" in resolved.hooks
            assert "Stop" not in resolved.hooks

    def test_resolve_lsp_from_root(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[base]\nTest project\n\n'
                '[lsp:_always:gopls]\n'
                '{"command": "gopls", "args": ["serve"]}\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            assert "gopls" in resolved.lsp_servers


# ---------------------------------------------------------------------------
# Claude emitter tests
# ---------------------------------------------------------------------------

class TestClaudeEmitterHooks:
    def test_emit_hooks_to_settings(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[base]\nTest project\n\n'
                '[hook:_always:PreToolUse]\n'
                '[{"matcher": "Bash", "hooks": [{"type": "command", "command": "block-rm.sh"}]}]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = claude_emit.emit(root, resolved)

            # Should have created settings.local.json
            settings_path = root / ".claude" / "settings.local.json"
            assert settings_path.is_file()
            data = json.loads(settings_path.read_text("utf-8"))
            assert "hooks" in data
            assert "PreToolUse" in data["hooks"]
            assert data["hooks"]["PreToolUse"][0]["matcher"] == "Bash"

    def test_emit_hooks_preserves_existing_settings(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            # Pre-existing settings
            settings_dir = root / ".claude"
            settings_dir.mkdir(parents=True)
            (settings_dir / "settings.local.json").write_text(
                json.dumps({"permissions": {"allow": ["Bash(npm run *)"]}}))

            (root / ".context.aictx").write_text(
                '[base]\nTest project\n\n'
                '[hook:_always:Stop]\n'
                '[{"hooks": [{"type": "command", "command": "notify.sh"}]}]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            claude_emit.emit(root, resolved)

            data = json.loads((settings_dir / "settings.local.json").read_text("utf-8"))
            # Hooks should be there
            assert "hooks" in data
            # Existing permissions should be preserved
            assert "permissions" in data
            assert data["permissions"]["allow"] == ["Bash(npm run *)"]

    def test_emit_lsp_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[base]\nTest project\n\n'
                '[lsp:_always:gopls]\n'
                '{"command": "gopls", "args": ["serve"]}\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = claude_emit.emit(root, resolved)

            lsp_path = root / ".lsp.json"
            assert lsp_path.is_file()
            data = json.loads(lsp_path.read_text("utf-8"))
            assert "gopls" in data
            assert data["gopls"]["command"] == "gopls"


# ---------------------------------------------------------------------------
# Claude importer tests
# ---------------------------------------------------------------------------

class TestClaudeImporterHooks:
    def test_import_hooks_from_settings(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            settings_dir = root / ".claude"
            settings_dir.mkdir()
            (settings_dir / "settings.local.json").write_text(json.dumps({
                "hooks": {
                    "PreToolUse": [
                        {"matcher": "Bash", "hooks": [{"type": "command", "command": "check.sh"}]}
                    ],
                    "Stop": [
                        {"hooks": [{"type": "agent", "prompt": "Run tests"}]}
                    ],
                }
            }))

            result = claude_imp.import_from(root)
            assert result is not None
            assert len(result.hooks) == 2
            events = {h.event for h in result.hooks}
            assert events == {"PreToolUse", "Stop"}

    def test_import_lsp_from_lsp_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".lsp.json").write_text(json.dumps({
                "gopls": {"command": "gopls", "args": ["serve"]},
                "rust-analyzer": {"command": "rust-analyzer"},
            }))

            result = claude_imp.import_from(root)
            assert result is not None
            assert len(result.lsp_servers) == 2
            names = {s.name for s in result.lsp_servers}
            assert names == {"gopls", "rust-analyzer"}


# ---------------------------------------------------------------------------
# Roundtrip tests
# ---------------------------------------------------------------------------

class TestHookRoundtrip:
    def test_hooks_roundtrip(self):
        """aictx with hooks → deploy → import → synthesize → compare."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            original_aictx = (
                '[base]\nTest project\n\n'
                '[hook:_always:PreToolUse]\n'
                '[{"matcher": "Bash", "hooks": [{"type": "command", "command": "check.sh"}]}]\n\n'
                '[hook:_always:Stop]\n'
                '[{"hooks": [{"type": "agent", "prompt": "Run tests", "timeout": 120}]}]\n\n'
                '[lsp:_always:gopls]\n'
                '{"command": "gopls", "args": ["serve"]}\n'
            )
            (root / ".context.aictx").write_text(original_aictx)

            # Deploy
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            claude_emit.emit(root, resolved)

            # Verify deployed files exist
            assert (root / ".claude" / "settings.local.json").is_file()
            assert (root / ".lsp.json").is_file()

            # Import
            result = claude_imp.import_from(root)
            assert result is not None
            assert len(result.hooks) == 2
            assert len(result.lsp_servers) == 1

            # Synthesize
            results = synthesize(root, [result])
            assert len(results) >= 1

            # Verify .aictx has hooks and LSP
            aictx = (root / ".context.aictx").read_text("utf-8")
            assert "[hook:_always:PreToolUse]" in aictx
            assert "[hook:_always:Stop]" in aictx
            assert "[lsp:_always:gopls]" in aictx
            assert "check.sh" in aictx


# ---------------------------------------------------------------------------
# Fixture tests
# ---------------------------------------------------------------------------

class TestFixtureHooksAndLsp:
    def test_fixture_has_hooks_and_lsp(self):
        """The updated fixture .aictx should parse hooks and LSP."""
        parsed = parse_aictx(FIXTURE_ROOT / ".context.aictx")
        assert parsed is not None

        # Hooks
        assert len(parsed.hooks) == 2
        events = {h.event for h in parsed.hooks}
        assert "PreToolUse" in events
        assert "Stop" in events

        # LSP
        assert len(parsed.lsp_servers) == 1
        assert parsed.lsp_servers[0].name == "rust-analyzer"

    def test_fixture_deploy_includes_hooks_and_lsp(self):
        """Deploy from fixture should produce hooks and LSP files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            # Copy .aictx files
            import shutil
            for aictx_path in FIXTURE_ROOT.rglob(".context.aictx"):
                rel = aictx_path.relative_to(FIXTURE_ROOT)
                dest = root / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(aictx_path, dest)
            for d in ["src/runner", "src/dataset", "src/dataset/generators", "src/metrics"]:
                (root / d).mkdir(parents=True, exist_ok=True)

            scanned = scan(root)
            resolved = resolve(root, scanned, "debug")

            # Should have both _always and debug hooks
            assert "PreToolUse" in resolved.hooks
            assert "Stop" in resolved.hooks

            # Emit
            results = claude_emit.emit(root, resolved)
            paths = {r["path"] for r in results}

            settings_path = root / ".claude" / "settings.local.json"
            assert str(settings_path) in paths
            assert (root / ".lsp.json").is_file()

            # Verify settings content
            data = json.loads(settings_path.read_text("utf-8"))
            assert "PreToolUse" in data["hooks"]
            assert "Stop" in data["hooks"]


# ---------------------------------------------------------------------------
# Plugin build tests
# ---------------------------------------------------------------------------

class TestPluginBuild:
    def test_plugin_build_basic(self):
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[base]\nTest project\n\n'
                '[command:_always:status]\nShow status\n\n'
                '[skill:_always:deploy]\n# Deploy\nDeploy the app\n\n'
                '[agent:_always:planner]\nPlanning agent\n\n'
                '[hook:_always:Stop]\n'
                '[{"hooks": [{"type": "command", "command": "test.sh"}]}]\n\n'
                '[mcp:_always:github]\n'
                '{"type": "http", "url": "https://example.com"}\n\n'
                '[lsp:_always:gopls]\n'
                '{"command": "gopls"}\n'
            )

            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build",
                "--root", str(root),
                "--name", "test-plugin",
                "--description", "A test plugin",
            ])
            assert result.exit_code == 0, result.output

            plugin_dir = root / "plugin"

            # Manifest
            manifest = json.loads((plugin_dir / ".claude-plugin" / "plugin.json").read_text("utf-8"))
            assert manifest["name"] == "test-plugin"
            assert manifest["description"] == "A test plugin"

            # Commands
            assert (plugin_dir / "commands" / "status.md").is_file()

            # Skills
            assert (plugin_dir / "skills" / "deploy" / "SKILL.md").is_file()

            # Agents
            assert (plugin_dir / "agents" / "planner.md").is_file()

            # Hooks
            hooks_data = json.loads((plugin_dir / "hooks" / "hooks.json").read_text("utf-8"))
            assert "hooks" in hooks_data
            assert "Stop" in hooks_data["hooks"]

            # MCP
            mcp_data = json.loads((plugin_dir / ".mcp.json").read_text("utf-8"))
            assert "github" in mcp_data["mcpServers"]

            # LSP
            lsp_data = json.loads((plugin_dir / ".lsp.json").read_text("utf-8"))
            assert "gopls" in lsp_data

            # Settings (default agent)
            settings = json.loads((plugin_dir / "settings.json").read_text("utf-8"))
            assert settings["agent"] == "planner"

    def test_plugin_build_dry_run(self):
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[base]\nTest project\n\n'
                '[command:_always:hello]\nSay hello\n'
            )

            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build",
                "--root", str(root),
                "--name", "my-plugin",
                "--dry-run",
            ])
            assert result.exit_code == 0
            assert "(dry)" in result.output
            # No files should be written
            assert not (root / "plugin").exists()

    def test_plugin_build_with_profile(self):
        from click.testing import CliRunner
        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.aictx").write_text(
                '[base]\nTest project\n\n'
                '[command:_always:status]\nAlways available\n\n'
                '[command:debug:profile]\nDebug only\n\n'
                '[hook:debug:Stop]\n'
                '[{"hooks": [{"type": "command", "command": "test.sh"}]}]\n'
            )

            runner = CliRunner()
            result = runner.invoke(main, [
                "plugin", "build",
                "--root", str(root),
                "--name", "debug-plugin",
                "--profile", "debug",
            ])
            assert result.exit_code == 0

            plugin_dir = root / "plugin"
            # Both commands should be present (_always + debug profile)
            assert (plugin_dir / "commands" / "status.md").is_file()
            assert (plugin_dir / "commands" / "profile.md").is_file()

            # Debug hook should be present
            hooks_data = json.loads((plugin_dir / "hooks" / "hooks.json").read_text("utf-8"))
            assert "Stop" in hooks_data["hooks"]
