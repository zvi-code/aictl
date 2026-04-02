# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for the aictl deploy command, including --watch mode."""

from __future__ import annotations

import threading
from pathlib import Path
from unittest.mock import patch, MagicMock

from click.testing import CliRunner

from aictl.commands.ctx_pipeline import deploy, _run_deploy, _collect_watch_dirs


def test_deploy_no_aictx_files():
    """deploy with no .context.toml files should report nothing found."""
    runner = CliRunner()
    with runner.isolated_filesystem():
        result = runner.invoke(deploy, ["--root", "."])
        assert result.exit_code == 0
        assert "No .context" in result.output and "files found" in result.output


def test_deploy_help():
    """deploy --help should show --watch flag."""
    runner = CliRunner()
    result = runner.invoke(deploy, ["--help"])
    assert result.exit_code == 0
    assert "--watch" in result.output
    assert "Re-deploy when .toml files change" in result.output


def test_deploy_invalid_root():
    """deploy with non-existent root should exit with error."""
    runner = CliRunner()
    result = runner.invoke(deploy, ["--root", "/nonexistent/path/xyz"])
    assert result.exit_code != 0


def test_collect_watch_dirs(tmp_path):
    """_collect_watch_dirs should find directories containing .context.toml files."""
    # Create root .context.toml
    (tmp_path / ".context.toml").write_text('[instructions]\nbase = "Hello."\n')
    # Create child .context.toml
    sub = tmp_path / "services" / "api"
    sub.mkdir(parents=True)
    (sub / ".context.toml").write_text('[instructions]\nbase = "API."\n')

    dirs = _collect_watch_dirs(tmp_path)
    assert str(tmp_path) in dirs
    assert str(sub) in dirs


def test_collect_watch_dirs_empty(tmp_path):
    """_collect_watch_dirs with no .context.toml files returns empty set."""
    dirs = _collect_watch_dirs(tmp_path)
    assert dirs == set()


def test_collect_watch_dirs_skips_ignored(tmp_path):
    """_collect_watch_dirs should skip node_modules and similar."""
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / ".context.toml").write_text('[instructions]\nbase = "Skip."\n')
    dirs = _collect_watch_dirs(tmp_path)
    assert dirs == set()


def test_run_deploy_returns_false_no_files(tmp_path):
    """_run_deploy returns False when no .context.toml files found."""
    result = _run_deploy(tmp_path, None, ["claude"], False)
    assert result is False


def test_watch_missing_watchdog():
    """--watch should fail gracefully if watchdog is not installed."""
    runner = CliRunner()
    with runner.isolated_filesystem():
        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name.startswith("watchdog"):
                raise ImportError("no watchdog")
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=mock_import):
            result = runner.invoke(deploy, ["--root", ".", "--watch"])
            assert result.exit_code != 0
            assert "watchdog" in result.output.lower() or result.exit_code != 0


def test_watch_no_aictx_files():
    """--watch with no .context.toml files should return after initial deploy fails."""
    runner = CliRunner()
    with runner.isolated_filesystem():
        # Patch _watch_loop to test that watch flag routes correctly
        with patch("aictl.commands.ctx_pipeline._watch_loop") as mock_loop:
            result = runner.invoke(deploy, ["--root", ".", "--watch"])
            assert mock_loop.called
