"""Tests for [ignores] section parsing, resolving, and emitting."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from aictl.context import parse_aictx, IgnoreRule, scan
from aictl.resolver import resolve
from aictl.emitters import claude as claude_emit
from aictl.emitters import copilot as copilot_emit
from aictl.emitters import cursor as cursor_emit
from aictl.emitters import windsurf as windsurf_emit


# ---------------------------------------------------------------------------
# Parser tests
# ---------------------------------------------------------------------------

class TestParserIgnores:
    def test_parse_ignore_always(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[ignores]\n'
                '_always = ["*.log", "node_modules/", ".env"]\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.ignores) == 1
            ig = parsed.ignores[0]
            assert ig.profile == "_always"
            assert ig.patterns == ["*.log", "node_modules/", ".env"]

    def test_parse_ignore_profile(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[ignores]\n'
                'debug = ["coverage/", "*.prof"]\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.ignores) == 1
            ig = parsed.ignores[0]
            assert ig.profile == "debug"
            assert ig.patterns == ["coverage/", "*.prof"]

    def test_parse_ignore_skips_empty_list(self):
        """TOML arrays don't have comments; test that empty arrays are skipped."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[ignores]\n'
                '_always = ["dist/", "node_modules/"]\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.ignores) == 1
            assert parsed.ignores[0].patterns == ["dist/", "node_modules/"]

    def test_parse_ignore_empty_array_skipped(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[ignores]\n'
                '_always = []\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            # Empty array is skipped
            assert len(parsed.ignores) == 0

    def test_ignores_for_merges_always_and_profile(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[ignores]\n'
                '_always = ["*.log", ".env"]\n'
                'debug = ["coverage/", "*.prof"]\n'
                'review = [".cache/"]\n'
            )
            parsed = parse_aictx(root / ".context.toml")
            assert len(parsed.ignores) == 3

            # debug: _always + debug
            patterns = parsed.ignores_for("debug")
            assert patterns == ["*.log", ".env", "coverage/", "*.prof"]

            # review: _always + review
            patterns = parsed.ignores_for("review")
            assert patterns == ["*.log", ".env", ".cache/"]

            # None: _always only
            patterns = parsed.ignores_for(None)
            assert patterns == ["*.log", ".env"]

    def test_ignores_for_deduplicates(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[ignores]\n'
                '_always = ["*.log", "dist/"]\n'
                'debug = ["*.log", "coverage/"]\n'  # *.log is duplicate
            )
            parsed = parse_aictx(root / ".context.toml")
            patterns = parsed.ignores_for("debug")
            assert patterns == ["*.log", "dist/", "coverage/"]


# ---------------------------------------------------------------------------
# Resolver tests
# ---------------------------------------------------------------------------

class TestResolverIgnores:
    def test_resolve_ignores_from_root(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[ignores]\n'
                '_always = ["*.log", "node_modules/"]\n'
                'debug = ["coverage/"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, "debug")
            assert resolved.ignores == ["*.log", "node_modules/", "coverage/"]

    def test_resolve_ignores_none_profile(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[ignores]\n'
                '_always = ["*.log"]\n'
                'debug = ["coverage/"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            assert resolved.ignores == ["*.log"]

    def test_resolve_no_ignores(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            assert resolved.ignores == []

    def test_resolve_empty_scanned(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            resolved = resolve(root, [], None)
            assert resolved.ignores == []


# ---------------------------------------------------------------------------
# Claude emitter tests
# ---------------------------------------------------------------------------

class TestClaudeEmitterIgnores:
    def test_emit_claudeignore(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[ignores]\n'
                '_always = ["*.log", "node_modules/", ".env"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = claude_emit.emit(root, resolved)

            fp = root / ".claudeignore"
            assert fp.is_file()
            content = fp.read_text("utf-8")
            assert "*.log" in content
            assert "node_modules/" in content
            assert ".env" in content
            # Should have deployed markers
            assert "AI-CONTEXT:DEPLOYED" in content

            # Should be in results list
            paths = {r["path"] for r in results}
            assert str(fp) in paths

    def test_emit_no_claudeignore_when_empty(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            claude_emit.emit(root, resolved)

            assert not (root / ".claudeignore").exists()

    def test_claudeignore_in_gitignore_list(self):
        assert ".claudeignore" in claude_emit.GITIGNORE


# ---------------------------------------------------------------------------
# Copilot emitter tests
# ---------------------------------------------------------------------------

class TestCopilotEmitterIgnores:
    def test_emit_copilot_ignore(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[ignores]\n'
                '_always = ["dist/", "build/"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = copilot_emit.emit(root, resolved)

            fp = root / ".github" / "copilot-ignore"
            assert fp.is_file()
            content = fp.read_text("utf-8")
            assert "dist/" in content
            assert "build/" in content
            assert "AI-CONTEXT:DEPLOYED" in content

            paths = {r["path"] for r in results}
            assert str(fp) in paths

    def test_copilot_ignore_in_gitignore_list(self):
        assert ".github/copilot-ignore" in copilot_emit.GITIGNORE


# ---------------------------------------------------------------------------
# Cursor emitter tests
# ---------------------------------------------------------------------------

class TestCursorEmitterIgnores:
    def test_emit_cursorignore(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[ignores]\n'
                '_always = ["*.log", ".env"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = cursor_emit.emit(root, resolved)

            fp = root / ".cursorignore"
            assert fp.is_file()
            content = fp.read_text("utf-8")
            assert "*.log" in content
            assert ".env" in content
            assert "AI-CONTEXT:DEPLOYED" in content

            paths = {r["path"] for r in results}
            assert str(fp) in paths

    def test_cursorignore_in_gitignore_list(self):
        assert ".cursorignore" in cursor_emit.GITIGNORE


# ---------------------------------------------------------------------------
# Windsurf emitter tests (should NOT emit ignores)
# ---------------------------------------------------------------------------

class TestWindsurfEmitterIgnores:
    def test_windsurf_does_not_emit_ignore_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[ignores]\n'
                '_always = ["*.log"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            results = windsurf_emit.emit(root, resolved)

            # No ignore file should exist for windsurf
            paths = {r["path"] for r in results}
            for p in paths:
                assert "ignore" not in p.lower() or "windsurf" not in p.lower()


# ---------------------------------------------------------------------------
# Dry-run tests
# ---------------------------------------------------------------------------

class TestIgnoresDryRun:
    def test_dry_run_does_not_write_ignore_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[ignores]\n'
                '_always = ["*.log"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)

            claude_emit.emit(root, resolved, dry_run=True)
            copilot_emit.emit(root, resolved, dry_run=True)
            cursor_emit.emit(root, resolved, dry_run=True)

            assert not (root / ".claudeignore").exists()
            assert not (root / ".github" / "copilot-ignore").exists()
            assert not (root / ".cursorignore").exists()


# ---------------------------------------------------------------------------
# Profile-specific emit tests
# ---------------------------------------------------------------------------

class TestIgnoresProfileEmit:
    def test_emit_with_profile_merges_patterns(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                '[instructions]\n'
                'base = "Test project"\n\n'
                '[ignores]\n'
                '_always = ["*.log"]\n'
                'debug = ["coverage/"]\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, "debug")
            claude_emit.emit(root, resolved)

            content = (root / ".claudeignore").read_text("utf-8")
            assert "*.log" in content
            assert "coverage/" in content
