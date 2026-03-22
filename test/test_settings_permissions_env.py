"""Tests for settings, permissions, and env section types."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aictl.parser import parse_aictx, Setting, Permission, EnvVars
from aictl.scanner import scan
from aictl.resolver import resolve
from aictl.emitters import claude as claude_emit


# ---------------------------------------------------------------------------
# Parser tests — settings
# ---------------------------------------------------------------------------

class TestParserSettings:
    def test_parse_setting_string_value(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[settings._always]\n'
                'teammateMode = "tmux"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.settings) == 1
            s = parsed.settings[0]
            assert s.key == "teammateMode"
            assert s.profile == "_always"
            assert s.value == "tmux"

    def test_parse_setting_boolean_value(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[settings._always]\n'
                'verbose = true\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.settings) == 1
            assert parsed.settings[0].value is True

    def test_parse_setting_object_value(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[settings._always]\n'
                'customConfig = {timeout = 30, retries = 3}\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.settings) == 1
            assert parsed.settings[0].value == {"timeout": 30, "retries": 3}

    def test_parse_setting_empty_section(self):
        """A settings section with no keys results in no settings."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.settings) == 0

    def test_parse_setting_profile_specific(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[settings._always]\n'
                'teammateMode = "tmux"\n\n'
                '[settings.debug]\n'
                'theme = "dark"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.settings) == 2

    def test_settings_for_filters_by_profile(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[settings._always]\n'
                'teammateMode = "tmux"\n\n'
                '[settings.debug]\n'
                'theme = "dark"\n\n'
                '[settings.review]\n'
                'theme = "light"\n'
            )
            parsed = parse_aictx(root / ".context.toml")

            # debug profile: _always + debug
            settings = parsed.settings_for("debug")
            assert settings == {"teammateMode": "tmux", "theme": "dark"}

            # review profile: _always + review
            settings = parsed.settings_for("review")
            assert settings == {"teammateMode": "tmux", "theme": "light"}

            # no profile: only _always
            settings = parsed.settings_for(None)
            assert settings == {"teammateMode": "tmux"}


# ---------------------------------------------------------------------------
# Parser tests — permissions
# ---------------------------------------------------------------------------

class TestParserPermissions:
    def test_parse_permission_basic(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[permissions]\n'
                '_always = ["Bash(npm run *)", "Bash(python -m pytest *)", "Read(*)"]\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.permissions) == 1
            p = parsed.permissions[0]
            assert p.profile == "_always"
            assert p.patterns == ["Bash(npm run *)", "Bash(python -m pytest *)", "Read(*)"]

    def test_parse_permission_array(self):
        """TOML arrays don't have blank lines; test basic array parsing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[permissions]\n'
                '_always = ["Bash(npm run *)", "Read(*)"]\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert parsed.permissions[0].patterns == ["Bash(npm run *)", "Read(*)"]

    def test_permissions_for_merges_profiles(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[permissions]\n'
                '_always = ["Read(*)", "Write(*)"]\n'
                'debug = ["Bash(gdb *)"]\n'
                'review = ["Bash(gh pr *)"]\n'
            )
            parsed = parse_aictx(root / ".context.toml")

            # debug profile
            perms = parsed.permissions_for("debug")
            assert perms == ["Read(*)", "Write(*)", "Bash(gdb *)"]

            # review profile
            perms = parsed.permissions_for("review")
            assert perms == ["Read(*)", "Write(*)", "Bash(gh pr *)"]

            # no profile: only _always
            perms = parsed.permissions_for(None)
            assert perms == ["Read(*)", "Write(*)"]


# ---------------------------------------------------------------------------
# Parser tests — env
# ---------------------------------------------------------------------------

class TestParserEnv:
    def test_parse_env_basic(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[env._always]\n'
                'DEBUG = "true"\n'
                'NODE_ENV = "development"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.env_vars) == 1
            e = parsed.env_vars[0]
            assert e.profile == "_always"
            assert e.vars == {"DEBUG": "true", "NODE_ENV": "development"}

    def test_parse_env_multiple_keys(self):
        """TOML handles comments natively; test multiple env keys."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[env._always]\n'
                '# This is a comment\n'
                'FOO = "bar"\n'
                'BAZ = "qux"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert parsed.env_vars[0].vars == {"FOO": "bar", "BAZ": "qux"}

    def test_parse_env_value_with_equals(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[env._always]\n'
                'DATABASE_URL = "postgres://user:pass@host/db?opt=val"\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert parsed.env_vars[0].vars["DATABASE_URL"] == "postgres://user:pass@host/db?opt=val"

    def test_env_for_merges_profiles(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[env._always]\n'
                'NODE_ENV = "production"\n'
                'LOG_LEVEL = "info"\n\n'
                '[env.debug]\n'
                'NODE_ENV = "development"\n'
                'DEBUG = "true"\n'
            )
            parsed = parse_aictx(root / ".context.toml")

            # debug profile: _always merged with debug (debug overrides)
            env = parsed.env_for("debug")
            assert env == {"NODE_ENV": "development", "LOG_LEVEL": "info", "DEBUG": "true"}

            # no profile: only _always
            env = parsed.env_for(None)
            assert env == {"NODE_ENV": "production", "LOG_LEVEL": "info"}


# ---------------------------------------------------------------------------
# Resolver tests
# ---------------------------------------------------------------------------

class TestResolverSettingsPermissionsEnv:
    def test_resolve_settings_from_root(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[settings._always]\n'
                'teammateMode = "tmux"\n\n'
                '[settings.debug]\n'
                'theme = "dark"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, "debug")
            assert resolved.settings == {"teammateMode": "tmux", "theme": "dark"}

    def test_resolve_permissions_from_root(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[permissions]\n'
                '_always = ["Bash(npm run *)", "Read(*)"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            assert resolved.permissions == ["Bash(npm run *)", "Read(*)"]

    def test_resolve_env_from_root(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[env._always]\n'
                'DEBUG = "true"\n'
                'NODE_ENV = "development"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            assert resolved.env == {"DEBUG": "true", "NODE_ENV": "development"}

    def test_resolve_empty_when_no_sections(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            assert resolved.settings == {}
            assert resolved.permissions == []
            assert resolved.env == {}


# ---------------------------------------------------------------------------
# Claude emitter tests
# ---------------------------------------------------------------------------

class TestClaudeEmitterSettings:
    def test_emit_settings_to_settings_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[settings._always]\n'
                'teammateMode = "tmux"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = claude_emit.emit(root, resolved)

            settings_path = root / ".claude" / "settings.local.json"
            assert settings_path.is_file()
            data = json.loads(settings_path.read_text("utf-8"))
            assert data["teammateMode"] == "tmux"

    def test_emit_permissions_to_settings_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[permissions]\n'
                '_always = ["Bash(npm run *)", "Bash(python -m pytest *)", "Read(*)"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = claude_emit.emit(root, resolved)

            settings_path = root / ".claude" / "settings.local.json"
            assert settings_path.is_file()
            data = json.loads(settings_path.read_text("utf-8"))
            assert "permissions" in data
            assert data["permissions"]["allow"] == [
                "Bash(npm run *)", "Bash(python -m pytest *)", "Read(*)"
            ]

    def test_emit_env_to_settings_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[env._always]\n'
                'DEBUG = "true"\n'
                'NODE_ENV = "development"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = claude_emit.emit(root, resolved)

            settings_path = root / ".claude" / "settings.local.json"
            assert settings_path.is_file()
            data = json.loads(settings_path.read_text("utf-8"))
            assert data["env"] == {"DEBUG": "true", "NODE_ENV": "development"}

    def test_emit_all_three_merged_with_hooks(self):
        """All new section types merge with hooks in settings.local.json."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[hooks._always]\n'
                'PreToolUse = \'[{"matcher": "Bash", "hooks": [{"type": "command", "command": "lint.sh"}]}]\'\n\n'
                '[settings._always]\n'
                'teammateMode = "tmux"\n\n'
                '[permissions]\n'
                '_always = ["Bash(npm run *)", "Read(*)"]\n\n'
                '[env._always]\n'
                'DEBUG = "true"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = claude_emit.emit(root, resolved)

            settings_path = root / ".claude" / "settings.local.json"
            data = json.loads(settings_path.read_text("utf-8"))
            # All four should be present
            assert "hooks" in data
            assert "PreToolUse" in data["hooks"]
            assert data["teammateMode"] == "tmux"
            assert data["permissions"]["allow"] == ["Bash(npm run *)", "Read(*)"]
            assert data["env"] == {"DEBUG": "true"}

    def test_emit_preserves_existing_settings(self):
        """New sections should preserve existing non-managed keys."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            settings_dir = root / ".claude"
            settings_dir.mkdir(parents=True)
            (settings_dir / "settings.local.json").write_text(
                json.dumps({"customKey": "preserve-me"})
            )

            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[settings._always]\n'
                'teammateMode = "tmux"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            claude_emit.emit(root, resolved)

            data = json.loads((settings_dir / "settings.local.json").read_text("utf-8"))
            assert data["customKey"] == "preserve-me"
            assert data["teammateMode"] == "tmux"

    def test_emit_dry_run_no_file_written(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[settings._always]\n'
                'teammateMode = "tmux"\n\n'
                '[permissions]\n'
                '_always = ["Read(*)"]\n\n'
                '[env._always]\n'
                'FOO = "bar"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = claude_emit.emit(root, resolved, dry_run=True)

            # Should report settings.local.json path in results
            paths = {r["path"] for r in results}
            assert str(root / ".claude" / "settings.local.json") in paths

            # But no file should be written
            assert not (root / ".claude" / "settings.local.json").exists()

    def test_emit_profile_merging(self):
        """Profile-specific sections merge with _always."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[settings._always]\n'
                'teammateMode = "tmux"\n\n'
                '[settings.debug]\n'
                'theme = "dark"\n\n'
                '[permissions]\n'
                '_always = ["Read(*)"]\n'
                'debug = ["Bash(gdb *)"]\n\n'
                '[env._always]\n'
                'LOG_LEVEL = "info"\n\n'
                '[env.debug]\n'
                'DEBUG = "true"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, "debug")
            results = claude_emit.emit(root, resolved)

            settings_path = root / ".claude" / "settings.local.json"
            data = json.loads(settings_path.read_text("utf-8"))
            assert data["teammateMode"] == "tmux"
            assert data["theme"] == "dark"
            assert data["permissions"]["allow"] == ["Read(*)", "Bash(gdb *)"]
            assert data["env"] == {"LOG_LEVEL": "info", "DEBUG": "true"}
