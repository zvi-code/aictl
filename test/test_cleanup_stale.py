# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for cleanup_stale safety + atomic manifest save on deploy failure."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch, MagicMock

import click
import pytest
from click.testing import CliRunner

from aictl.resolver import cleanup_stale, _clean_parents, save_manifest
from aictl.utils import WriteGuard
from aictl.commands.ctx_pipeline import _run_deploy


# ---------------------------------------------------------------------------
# Issue 1: cleanup_stale refuses paths outside root
# ---------------------------------------------------------------------------

def test_cleanup_stale_refuses_outside_root(tmp_path):
    """A manifest pointing outside root must not delete that file."""
    root = tmp_path / "project"
    root.mkdir()
    outside = tmp_path / "other" / "victim.txt"
    outside.parent.mkdir()
    outside.write_text("must not be deleted")

    old = {"files": [str(outside)]}
    removed = cleanup_stale(root, old, new_paths=set())

    assert outside.exists(), "file outside root was deleted"
    assert str(outside) not in removed


def test_cleanup_stale_refuses_traversal(tmp_path):
    """Traversal-style relative path in manifest is rejected."""
    root = tmp_path / "project"
    root.mkdir()
    outside = tmp_path / "victim.txt"
    outside.write_text("must not be deleted")

    # crafted manifest entry using traversal through root
    crafted = root / ".." / "victim.txt"
    old = {"files": [str(crafted)]}
    removed = cleanup_stale(root, old, new_paths=set())

    assert outside.exists()
    assert removed == []


def test_cleanup_stale_deletes_inside_root(tmp_path):
    """Sanity: files inside root are still deleted."""
    root = tmp_path
    target = root / "sub" / "file.md"
    target.parent.mkdir()
    target.write_text("stale")

    old = {"files": [str(target)]}
    removed = cleanup_stale(root, old, new_paths=set())

    assert not target.exists()
    assert str(target) in removed


# ---------------------------------------------------------------------------
# Issue 1: cleanup_stale routes through WriteGuard
# ---------------------------------------------------------------------------

def test_cleanup_stale_routes_through_write_guard(tmp_path):
    """When a WriteGuard is installed, cleanup_stale calls guard.confirm(p, 'delete')."""
    root = tmp_path
    target = root / "stale.md"
    target.write_text("x")

    runner = CliRunner()
    captured = {}

    @click.command()
    def _cmd():
        guard = WriteGuard.install("test")
        # Spy on confirm — default implementation auto-approves non-TTY.
        original = guard.confirm

        def _spy(path, action="modify"):
            captured["path"] = Path(path)
            captured["action"] = action
            return original(path, action)

        guard.confirm = _spy  # type: ignore[assignment]
        removed = cleanup_stale(root, {"files": [str(target)]}, set())
        assert removed == [str(target)]

    result = runner.invoke(_cmd)
    assert result.exit_code == 0, result.output
    assert captured.get("path") == target
    assert captured.get("action") == "delete"
    assert not target.exists()


# ---------------------------------------------------------------------------
# Issue 2: _clean_parents sibling-directory safety
# ---------------------------------------------------------------------------

def test_clean_parents_skips_sibling(tmp_path):
    """`/tmp/foo` must not have `/tmp/foo-bar/x` walk into it via prefix match."""
    foo = tmp_path / "foo"
    foo_bar = tmp_path / "foo-bar"
    foo.mkdir()
    foo_bar.mkdir()

    # A now-deleted file lived under foo-bar/nested
    nested = foo_bar / "nested"
    nested.mkdir()
    ghost = nested / "gone.txt"
    # file itself is gone; _clean_parents walks up from its parent

    _clean_parents(ghost, stop=foo)

    # foo-bar/nested should not have been removed (it's outside stop=foo)
    assert foo_bar.exists()
    assert nested.exists()


def test_clean_parents_removes_empty_dirs_inside_root(tmp_path):
    """Sanity: inside root, empty parents are pruned."""
    root = tmp_path
    deep = root / "a" / "b" / "c"
    deep.mkdir(parents=True)
    ghost = deep / "gone.txt"

    _clean_parents(ghost, stop=root)

    assert not (root / "a").exists(), "empty parents should be pruned up to root"
    assert root.exists()


# ---------------------------------------------------------------------------
# Issue 3: partial emitter failure must NOT save manifest
# ---------------------------------------------------------------------------

def test_run_deploy_partial_failure_does_not_save_manifest(tmp_path):
    """If an emitter raises, save_manifest must not be called."""
    (tmp_path / ".context.toml").write_text('[instructions]\nbase = "Hi."\n')

    failing = MagicMock()
    failing.emit.side_effect = RuntimeError("boom")

    with patch("aictl.commands.ctx_pipeline.registry.get", return_value=failing), \
         patch("aictl.commands.ctx_pipeline.save_manifest") as save_mock, \
         patch("aictl.commands.ctx_pipeline.cleanup_stale") as cleanup_mock:
        with pytest.raises(RuntimeError, match="boom"):
            _run_deploy(tmp_path, None, ["claude"], dry_run=False)

    save_mock.assert_not_called()
    cleanup_mock.assert_not_called()
