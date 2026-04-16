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
