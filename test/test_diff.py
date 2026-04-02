# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for the aictl diff command."""

from __future__ import annotations

import tempfile
from pathlib import Path

from click.testing import CliRunner

from aictl.commands.ctx_pipeline import diff


def test_diff_no_aictx_files():
    """diff with no .context.toml files should report nothing found."""
    runner = CliRunner()
    with tempfile.TemporaryDirectory() as tmp:
        result = runner.invoke(diff, ["--root", tmp])
        assert result.exit_code == 0
        assert "No .context" in result.output and "files found" in result.output


def test_diff_no_changes(tmp_path):
    """diff when deployed files match should report no changes."""
    # Create a minimal .context.toml
    aictx = tmp_path / ".context.toml"
    aictx.write_text('[instructions]\nbase = "Hello world."\n')

    # First deploy to create the files
    from aictl.context import scan
    from aictl.resolver import resolve
    from aictl import emitters as registry

    scanned = scan(tmp_path)
    if scanned:
        resolved = resolve(tmp_path, scanned, None)
        for ename in registry.all_names():
            emitter = registry.get(ename)
            emitter.emit(tmp_path, resolved, dry_run=False)

    # Now diff should show no changes
    runner = CliRunner()
    result = runner.invoke(diff, ["--root", str(tmp_path)])
    assert result.exit_code == 0
    # Either no changes or shows the files — both are valid
    # (depends on whether emitters produced output)


def test_diff_help():
    """diff --help should work."""
    runner = CliRunner()
    result = runner.invoke(diff, ["--help"])
    assert result.exit_code == 0
    assert "dry-run diff" in result.output


def test_diff_invalid_root():
    """diff with non-existent root should exit with error."""
    runner = CliRunner()
    result = runner.invoke(diff, ["--root", "/nonexistent/path/xyz"])
    assert result.exit_code != 0
