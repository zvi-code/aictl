"""Tests for hooks, LSP servers, and plugin packaging."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aictl.context import parse_aictx, Hook, LspServer, scan
from aictl.resolver import resolve
from aictl.emitters import claude as claude_emit
from aictl.emitters import copilot as copilot_emit
from aictl.importers import claude as claude_imp
from aictl.importers import copilot as copilot_imp
from aictl.synthesizer import synthesize


FIXTURE_ROOT = Path(__file__).parent / "fixtures" / "project"


# ---------------------------------------------------------------------------
# Parser tests
# ---------------------------------------------------------------------------

class TestParserHooks:
    def test_parse_hook_single_rule(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[hooks._always]\n'
                'PreToolUse = \'[{"matcher": "Bash", "hooks": [{"type": "command", "command": "echo hi"}]}]\'\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.hooks) == 1
            h = parsed.hooks[0]
            assert h.event == "PreToolUse"
            assert h.profile == "_always"
            assert len(h.rules) == 1
            assert h.rules[0]["matcher"] == "Bash"

    def test_parse_hook_dict_auto_wraps_to_list(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[hooks.debug]\n'
                'Stop = \'{"hooks": [{"type": "agent", "prompt": "Run tests"}]}\'\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.hooks) == 1
            h = parsed.hooks[0]
            assert h.event == "Stop"
            assert h.profile == "debug"
            assert len(h.rules) == 1

    def test_parse_hook_multiple_rules(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[hooks._always]\n'
                'PreToolUse = \'[{"matcher": "Bash", "hooks": [{"type": "command", "command": "lint.sh"}]}, {"matcher": "Write", "hooks": [{"type": "command", "command": "log.sh"}]}]\'\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.hooks) == 1
            assert len(parsed.hooks[0].rules) == 2

    def test_parse_hook_skips_malformed_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[hooks._always]\n'
                'PreToolUse = "not valid json"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.hooks) == 0

    def test_hooks_for_filters_by_profile(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[hooks._always]\n'
                'PreToolUse = \'[{"matcher": "Bash", "hooks": [{"type": "command", "command": "a.sh"}]}]\'\n\n'
                '[hooks.debug]\n'
                'Stop = \'[{"hooks": [{"type": "agent", "prompt": "test"}]}]\'\n\n'
                '[hooks.review]\n'
                'Stop = \'[{"hooks": [{"type": "agent", "prompt": "lint"}]}]\'\n'
            )
            parsed = parse_aictx(root / ".context.toml")
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
            (root / ".context.toml").write_text(
                '[lsp._always.gopls]\n'
                'command = "gopls"\n'
                'args = ["serve"]\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.lsp_servers) == 1
            s = parsed.lsp_servers[0]
            assert s.name == "gopls"
            assert s.config["command"] == "gopls"

    def test_lsp_for_filters_by_profile(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[lsp._always.gopls]\n'
                'command = "gopls"\n'
                'args = ["serve"]\n\n'
                '[lsp.debug.delve]\n'
                'command = "dlv"\n'
                'args = ["dap"]\n'
            )
            parsed = parse_aictx(root / ".context.toml")
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
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[hooks._always]\n'
                'PreToolUse = \'[{"matcher": "Bash", "hooks": [{"type": "command", "command": "a.sh"}]}]\'\n\n'
                '[hooks.debug]\n'
                'Stop = \'[{"hooks": [{"type": "agent", "prompt": "test"}]}]\'\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, "debug")
            assert "PreToolUse" in resolved.hooks
            assert "Stop" in resolved.hooks

    def test_resolve_hooks_excludes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                'exclude = ["hook:_always:Stop"]\n\n'
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[hooks._always]\n'
                'PreToolUse = \'[{"matcher": "Bash", "hooks": [{"type": "command", "command": "a.sh"}]}]\'\n'
                'Stop = \'[{"hooks": [{"type": "agent", "prompt": "test"}]}]\'\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            assert "PreToolUse" in resolved.hooks
            assert "Stop" not in resolved.hooks

    def test_resolve_lsp_from_root(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[lsp._always.gopls]\n'
                'command = "gopls"\n'
                'args = ["serve"]\n'
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
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[hooks._always]\n'
                'PreToolUse = \'[{"matcher": "Bash", "hooks": [{"type": "command", "command": "block-rm.sh"}]}]\'\n'
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

            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[hooks._always]\n'
                'Stop = \'[{"hooks": [{"type": "command", "command": "notify.sh"}]}]\'\n'
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
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[lsp._always.gopls]\n'
                'command = "gopls"\n'
                'args = ["serve"]\n'
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
# Copilot emitter hook tests
# ---------------------------------------------------------------------------

class TestCopilotEmitterHooks:
    def test_emit_hooks_to_github_hooks(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[hooks._always]\n'
                'preToolUse = \'[{"type": "command", "command": "check-safety.sh"}]\'\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = copilot_emit.emit(root, resolved)

            hooks_path = root / ".github" / "hooks" / "hooks.json"
            assert hooks_path.is_file()
            data = json.loads(hooks_path.read_text("utf-8"))
            assert "hooks" in data
            assert "preToolUse" in data["hooks"]
            assert data["hooks"]["preToolUse"][0]["type"] == "command"

    def test_emit_hooks_preserves_existing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            hooks_dir = root / ".github" / "hooks"
            hooks_dir.mkdir(parents=True)
            (hooks_dir / "hooks.json").write_text(json.dumps({
                "hooks": {"postToolUse": [{"type": "command", "command": "existing.sh"}]},
                "custom_key": "preserved",
            }))

            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[hooks._always]\n'
                'preToolUse = \'[{"type": "command", "command": "new.sh"}]\'\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            copilot_emit.emit(root, resolved)

            data = json.loads((hooks_dir / "hooks.json").read_text("utf-8"))
            # New hook should be there
            assert "preToolUse" in data["hooks"]
            # Existing hook should be preserved (merged)
            assert "postToolUse" in data["hooks"]
            # Non-hook keys should be preserved
            assert data["custom_key"] == "preserved"

    def test_no_hooks_no_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            copilot_emit.emit(root, resolved)

            assert not (root / ".github" / "hooks" / "hooks.json").exists()


class TestCopilotImporterHooks:
    def test_import_hooks_from_github_hooks(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            hooks_dir = root / ".github" / "hooks"
            hooks_dir.mkdir(parents=True)
            (hooks_dir / "hooks.json").write_text(json.dumps({
                "hooks": {
                    "preToolUse": [{"type": "command", "command": "safety.sh"}],
                    "postToolUse": [{"type": "command", "command": "lint.sh"}],
                }
            }))

            result = copilot_imp.import_from(root)
            assert result is not None
            assert len(result.hooks) == 2
            events = {h.event for h in result.hooks}
            assert events == {"preToolUse", "postToolUse"}


class TestCopilotHookRoundtrip:
    def test_hooks_roundtrip(self):
        """context.toml with hooks → deploy (copilot) → import → verify."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[hooks._always]\n'
                'preToolUse = \'[{"type": "command", "command": "check.sh"}]\'\n'
                'postToolUse = \'[{"type": "command", "command": "lint.sh"}]\'\n'
            )

            # Deploy to Copilot format
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            copilot_emit.emit(root, resolved)

            # Verify deployed file
            assert (root / ".github" / "hooks" / "hooks.json").is_file()

            # Import back
            result = copilot_imp.import_from(root)
            assert result is not None
            assert len(result.hooks) == 2
            events = {h.event for h in result.hooks}
            assert events == {"preToolUse", "postToolUse"}


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
        """context.toml with hooks → deploy → import → synthesize → compare."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            original_aictx = (
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[hooks._always]\n'
                'PreToolUse = \'[{"matcher": "Bash", "hooks": [{"type": "command", "command": "check.sh"}]}]\'\n'
                'Stop = \'[{"hooks": [{"type": "agent", "prompt": "Run tests", "timeout": 120}]}]\'\n\n'
                '[lsp._always.gopls]\n'
                'command = "gopls"\n'
                'args = ["serve"]\n'
            )
            (root / ".context.toml").write_text(original_aictx)

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

            # Verify .context.toml has hooks and LSP
            aictx = (root / ".context.toml").read_text("utf-8")
            assert "[hooks._always]" in aictx
            assert "PreToolUse" in aictx
            assert "Stop" in aictx
            assert "[lsp._always.gopls]" in aictx
            assert "check.sh" in aictx


# ---------------------------------------------------------------------------
# Fixture tests
# ---------------------------------------------------------------------------

class TestFixtureHooksAndLsp:
    def test_fixture_has_hooks_and_lsp(self):
        """The updated fixture .context.toml should parse hooks and LSP."""
        parsed = parse_aictx(FIXTURE_ROOT / ".context.toml")
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
            # Copy .context.toml files
            import shutil
            for aictx_path in FIXTURE_ROOT.rglob(".context.toml"):
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
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[commands._always.status]\n'
                'content = "Show status"\n\n'
                '[skills._always.deploy]\n'
                'content = """\n# Deploy\nDeploy the app\n"""\n\n'
                '[agents._always.planner]\n'
                'content = "Planning agent"\n\n'
                '[hooks._always]\n'
                'Stop = \'[{"hooks": [{"type": "command", "command": "test.sh"}]}]\'\n\n'
                '[mcp._always.github]\n'
                'type = "http"\n'
                'url = "https://example.com"\n\n'
                '[lsp._always.gopls]\n'
                'command = "gopls"\n'
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
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[commands._always.status]\n'
                'content = "Always available"\n\n'
                '[commands.debug.profile]\n'
                'content = "Debug only"\n\n'
                '[hooks.debug]\n'
                'Stop = \'[{"hooks": [{"type": "command", "command": "test.sh"}]}]\'\n'
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
