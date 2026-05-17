# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for ``aictl ctx validate`` lint logic.

Focus: the cross-section profile-typo heuristic added so that
``[instructions.debug]`` paired with ``[commands.debugg.foo]`` produces a
warning instead of silently treating the two near-identical spellings as
distinct profiles.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from click.testing import CliRunner

from aictl.cli import main
from aictl.commands.ctx_pipeline import (
    _edit_distance_le1,
    _profiles_in_file,
    _validate_file,
)


# ---------------------------------------------------------------------------
# Edit-distance helper
# ---------------------------------------------------------------------------


class TestEditDistanceLe1:
    def test_equal_strings(self):
        assert _edit_distance_le1("debug", "debug")

    def test_single_substitution(self):
        assert _edit_distance_le1("debug", "debog")

    def test_single_insertion(self):
        assert _edit_distance_le1("debug", "debugg")
        assert _edit_distance_le1("review", "reviw")

    def test_single_deletion_at_end(self):
        assert _edit_distance_le1("debugg", "debug")

    def test_two_edits_rejected(self):
        # debug -> deeob: two substitutions (b->e, u->o) = distance 2
        assert not _edit_distance_le1("debug", "deeob")
        assert not _edit_distance_le1("debug", "release")

    def test_length_gap_too_large(self):
        assert not _edit_distance_le1("a", "abc")


# ---------------------------------------------------------------------------
# Profile collection from a parsed file
# ---------------------------------------------------------------------------


class TestProfilesInFile:
    def test_collects_from_instructions_and_capabilities(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            path = root / ".context.toml"
            path.write_text(
                "[instructions]\n"
                'base = "Test"\n'
                'debug = "debug profile"\n\n'
                "[commands.debugg.status]\n"
                'content = "status"\n\n'
                "[commands.review.audit]\n"
                'content = "audit"\n'
            )
            profiles = _profiles_in_file(path)
            assert profiles == {"debug", "debugg", "review"}

    def test_skips_reserved(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            path = root / ".context.toml"
            path.write_text(
                "[instructions]\n"
                'base = "Test"\n\n'
                "[commands._always.hello]\n"
                'content = "hello"\n'
            )
            assert _profiles_in_file(path) == set()


# ---------------------------------------------------------------------------
# _validate_file emits the typo warning
# ---------------------------------------------------------------------------


def _write(root: Path, content: str) -> Path:
    p = root / ".context.toml"
    p.write_text(content)
    return p


class TestValidateProfileTypos:
    def test_typo_pair_warns(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            path = _write(
                root,
                "[instructions]\n"
                'base = "Test"\n'
                'debug = "debug profile"\n\n'
                "[commands.debugg.status]\n"
                'content = "status"\n',
            )
            result = _validate_file(path, "./.context.toml")
            typo_warnings = [i for i in result.issues if "differ by one character" in i.message]
            assert len(typo_warnings) == 1, [i.message for i in result.issues]
            assert "debug" in typo_warnings[0].message
            assert "debugg" in typo_warnings[0].message

    def test_clean_file_no_typo_warning(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            path = _write(
                root,
                "[instructions]\n"
                'base = "Test"\n'
                'debug = "debug profile"\n\n'
                "[commands.debug.status]\n"
                'content = "status"\n',
            )
            result = _validate_file(path, "./.context.toml")
            assert not any("differ by one character" in i.message for i in result.issues)

    def test_unrelated_profiles_no_warning(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            path = _write(
                root,
                "[instructions]\n"
                'base = "Test"\n'
                'debug = "debug"\n'
                'review = "review"\n\n'
                "[commands.debug.status]\n"
                'content = "status"\n\n'
                "[commands.review.audit]\n"
                'content = "audit"\n',
            )
            result = _validate_file(path, "./.context.toml")
            assert not any("differ by one character" in i.message for i in result.issues)

    def test_always_and_base_are_reserved(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            path = _write(
                root,
                "[instructions]\n"
                'base = "Test"\n\n'
                "[commands._always.status]\n"
                'content = "status"\n',
            )
            result = _validate_file(path, "./.context.toml")
            # base and _always are reserved; should not produce a typo warning
            assert not any("differ by one character" in i.message for i in result.issues)


# ---------------------------------------------------------------------------
# CLI integration
# ---------------------------------------------------------------------------


class TestValidateCLI:
    def test_validate_reports_typo_warning(self):
        runner = CliRunner()
        with runner.isolated_filesystem():
            Path(".context.toml").write_text(
                "[instructions]\n"
                'base = "Test"\n'
                'debug = "debug profile"\n\n'
                "[commands.debugg.status]\n"
                'content = "status"\n'
            )
            result = runner.invoke(main, ["ctx", "validate", "--root", "."])
            assert result.exit_code == 0  # warnings, not errors
            assert "differ by one character" in result.output
            assert "warning" in result.output.lower()
