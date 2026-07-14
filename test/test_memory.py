# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for memory swap self-heal and concurrency lock."""

from __future__ import annotations

import json
import threading
import time

import pytest

from aictl import memory as mem_mod
from aictl.memory import SWAP_MARKER, _swap_lock, swap_memory


@pytest.fixture
def fake_project(tmp_path, monkeypatch):
    """Create a fake Claude Code project dir and patch finder to return it."""
    root = tmp_path / "myproj"
    root.mkdir()
    proj = tmp_path / "claude-projects" / "myproj-encoded"
    proj.mkdir(parents=True)
    (proj / "memory").mkdir()

    monkeypatch.setattr(mem_mod, "_find_project_dir", lambda r: proj)
    return root, proj


def test_swap_happy_path(fake_project):
    root, proj = fake_project
    (proj / "memory" / "CLAUDE.md").write_text("hello")

    result = swap_memory(root, old_profile="a", new_profile="b")

    assert result is not None
    assert result.stashed == "a"
    assert result.recovered is False
    assert (proj / "memory--a").is_dir()
    assert (proj / "memory--a" / "CLAUDE.md").read_text() == "hello"
    assert not (proj / SWAP_MARKER).exists()


def test_swap_auto_recovers_stale_marker(fake_project):
    root, proj = fake_project
    # Simulate a crash from a previous swap: marker present + partial state
    # (restore dir exists but memory/ does not — mimics a crash mid-restore)
    import shutil

    shutil.rmtree(proj / "memory")
    (proj / "memory--old").mkdir()
    (proj / "memory--old" / "CLAUDE.md").write_text("stale")

    plan = {"old_profile": None, "new_profile": "old", "timestamp": time.time()}
    (proj / SWAP_MARKER).write_text(json.dumps(plan))

    # Now call swap_memory — it should recover first
    result = swap_memory(root, old_profile=None, new_profile="fresh")

    assert result is not None
    assert result.recovered is True
    # Recovery should have restored memory/ from memory--old
    # then the fresh swap runs (creating fresh memory if needed)
    assert not (proj / SWAP_MARKER).exists()


def test_swap_raises_when_lock_held(fake_project):
    root, proj = fake_project

    # Acquire the lock in a background thread and hold it
    acquired = threading.Event()
    release = threading.Event()

    def hold_lock():
        with _swap_lock(proj):
            acquired.set()
            release.wait(timeout=10)

    t = threading.Thread(target=hold_lock)
    t.start()
    try:
        assert acquired.wait(timeout=5)
        with pytest.raises(RuntimeError, match="another aictl swap is in progress"):
            swap_memory(root, old_profile=None, new_profile="x")
    finally:
        release.set()
        t.join(timeout=5)


def test_swap_lock_released_after_success(fake_project):
    root, proj = fake_project
    # First swap
    swap_memory(root, old_profile=None, new_profile="a")
    # Second swap should succeed (lock was released)
    result = swap_memory(root, old_profile=None, new_profile="b")
    assert result is not None


def test_failed_swap_leaves_marker_then_recover_swap_restores(fake_project, monkeypatch):
    """A crash mid-swap must LEAVE the WAL marker so recover_swap can
    finish the job. The marker used to be deleted in a finally: block
    even when the swap failed midway — making recovery impossible."""
    root, proj = fake_project
    (proj / "memory" / "MEMORY.md").write_text("a-content")
    (proj / "memory--b").mkdir()
    (proj / "memory--b" / "MEMORY.md").write_text("b-content")

    real_move = mem_mod.shutil.move
    calls = {"n": 0}

    def failing_move(src, dst):
        calls["n"] += 1
        if calls["n"] == 2:  # stash succeeds, restore rename crashes
            raise OSError("simulated disk error")
        return real_move(src, dst)

    monkeypatch.setattr(mem_mod.shutil, "move", failing_move)
    with pytest.raises(OSError, match="simulated disk error"):
        swap_memory(root, old_profile="a", new_profile="b")

    # Marker survives the crash — that's what makes recovery possible.
    assert (proj / SWAP_MARKER).exists()
    # Partial state: memory/ stashed away, restore never completed.
    assert (proj / "memory--a" / "MEMORY.md").read_text() == "a-content"
    assert not (proj / "memory").is_dir()

    # Filesystem heals; recovery completes the restore and clears the marker.
    monkeypatch.setattr(mem_mod.shutil, "move", real_move)
    assert mem_mod.recover_swap(root) is True
    assert (proj / "memory" / "MEMORY.md").read_text() == "b-content"
    assert not (proj / SWAP_MARKER).exists()


def test_successful_swap_removes_marker(fake_project):
    root, proj = fake_project
    (proj / "memory" / "MEMORY.md").write_text("x")
    result = swap_memory(root, old_profile="a", new_profile="b")
    assert result is not None
    assert not (proj / SWAP_MARKER).exists()


class TestFindProjectDir:
    """_find_project_dir fuzzy matching must never select a SIBLING
    project: segments-in-order substring matching used to pick
    <encoded>-ui for <encoded> and swap another project's memory."""

    @pytest.fixture
    def projects_dir(self, tmp_path, monkeypatch):
        projects = tmp_path / "claude-projects"
        projects.mkdir()
        monkeypatch.setattr("aictl.memory.claude_projects_dir", lambda: projects, raising=False)
        monkeypatch.setattr("aictl.platforms.claude_projects_dir", lambda: projects)
        return projects

    def test_rejects_sibling_with_extra_trailing_segments(self, tmp_path, projects_dir):
        root = tmp_path / "myproj"
        root.mkdir()
        encoded = mem_mod._encode_project_path(str(root.resolve()))

        sibling = projects_dir / f"{encoded}-ui"
        sibling.mkdir()
        (sibling / "memory").mkdir()

        assert mem_mod._find_project_dir(root) is None

    def test_exact_match_wins_over_sibling(self, tmp_path, projects_dir):
        root = tmp_path / "myproj"
        root.mkdir()
        encoded = mem_mod._encode_project_path(str(root.resolve()))

        sibling = projects_dir / f"{encoded}-ui"
        sibling.mkdir()
        (sibling / "memory").mkdir()
        exact = projects_dir / encoded
        exact.mkdir()

        assert mem_mod._find_project_dir(root) == exact

    def test_segment_match_allows_doubled_separators(self, tmp_path, projects_dir):
        """Strategy 3 still matches encodings with repeated dashes
        (Windows drive encodings), as long as segments align exactly."""
        root = tmp_path / "myproj"
        root.mkdir()
        import re as _re

        segments = [s for s in _re.split(r"[/\\]+", str(root.resolve())) if s]
        doubled = projects_dir / ("-" + "--".join(segments))
        doubled.mkdir()

        assert mem_mod._find_project_dir(root) == doubled

    def test_structural_match_requires_dash_boundary_suffix(self, tmp_path, projects_dir):
        """Strategy 5 (name + memory/ structural match) must also reject
        names that merely CONTAIN the project name."""
        root = tmp_path / "aictl"
        root.mkdir()

        containing = projects_dir / "-Users-other-Projects-aictl-ui"
        containing.mkdir()
        (containing / "memory").mkdir()
        assert mem_mod._find_project_dir(root) is None

        ends_with = projects_dir / "-Users-other-Projects-aictl"
        ends_with.mkdir()
        (ends_with / "memory").mkdir()
        assert mem_mod._find_project_dir(root) == ends_with
