"""One listing of the folders under a root, shared by every discovery walk.

Started in a folder of many projects, discovery walked every folder three times with two skip
lists and stopped at 50,000 folders in disk order, so projects late in the order were never read.
The listing reads active projects first, skips what each repository's .gitignore ignores, still
reads the tool folders people ignore on purpose, and gives each repository its own budget.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

import pytest

from aictl import context, tools, tree_walk

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git is not installed")


@pytest.fixture(autouse=True)
def _fresh():
    tree_walk.clear_cache()
    tree_walk.note_active_projects([])
    yield
    tree_walk.clear_cache()
    tree_walk.note_active_projects([])


def _repo(path: Path, ignore: str = "") -> Path:
    path.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "init", "-q", str(path)], check=True)
    if ignore:
        (path / ".gitignore").write_text(ignore)
    (path / "README.md").write_text("x")
    return path


def _touch(path: Path, text: str = "x") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return path


def _folders(root: Path) -> set[str]:
    return {str(f.relative_to(root)) for f, _d, _f in tree_walk.listing(root)}


def test_gitignored_output_is_skipped_and_tool_folders_are_still_read(tmp_path):
    repo = _repo(tmp_path / "app", "gen/\n.vscode/\n.claude/settings.local.json\nCLAUDE.local.md\n.deps/\n")
    _touch(repo / "src" / "main.py")
    for i in range(30):
        _touch(repo / "gen" / f"g{i}" / "out.txt")
    _touch(repo / ".vscode" / "mcp.json")
    _touch(repo / ".github" / "copilot-instructions.md")
    _touch(repo / ".github" / "instructions" / "py.instructions.md")
    _touch(repo / ".claude" / "settings.local.json")
    _touch(repo / "CLAUDE.local.md")
    _touch(repo / ".deps" / "cfg.json")
    _touch(repo / ".deps" / "deep" / "x" / "y.json")
    got = _folders(repo)
    assert {".", "src", ".vscode", ".github", ".github/instructions", ".claude", ".deps"} <= got
    assert not any(f.startswith("gen") for f in got)
    assert ".deps/deep" not in got  # an ignored unknown hidden folder: its own files, one level
    assert tools.find_in_tree(repo, "CLAUDE.local.md") == [repo / "CLAUDE.local.md"]
    assert tools.find_in_tree(repo, "mcp.json") == [repo / ".vscode" / "mcp.json"]


def test_a_folder_of_projects_reads_each_repository_through_its_own_gitignore(tmp_path):
    a = _repo(tmp_path / "a", "bin/\n")
    b = _repo(tmp_path / "b", "obj/\n")
    _touch(a / "bin" / "x.json")
    _touch(b / "obj" / "y.json")
    _touch(b / "AGENTS.md")
    got = _folders(tmp_path)
    assert {"a", "b"} <= got and "a/bin" not in got and "b/obj" not in got
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == [b / "AGENTS.md"]


def test_outside_git_the_walk_stays_near_the_top(tmp_path):
    deep = tmp_path / "data"
    for i in range(8):
        deep = deep / f"d{i}"
    _touch(deep / "AGENTS.md")
    _touch(tmp_path / "data" / "d0" / "AGENTS.md")
    found = tools.find_in_tree(tmp_path, "AGENTS.md")
    assert found == [tmp_path / "data" / "d0" / "AGENTS.md"]


def test_active_projects_come_first_and_are_read_at_any_depth(tmp_path):
    _repo(tmp_path / "a")
    deep = _repo(tmp_path / "x" / "y" / "z" / "w" / "v" / "deep")
    _touch(deep / "AGENTS.md")
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == []  # too deep outside git
    tree_walk.note_active_projects([str(deep / "src")])
    entries = tree_walk.listing(tmp_path)
    assert entries[0][0] == deep
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == [deep / "AGENTS.md"]


def test_a_worktree_copy_inside_a_tool_folder_is_not_read(tmp_path):
    repo = _repo(tmp_path / "app", ".claude/\n")
    wt = repo / ".claude" / "worktrees" / "w1"
    _touch(wt / ".git", "gitdir: /nowhere\n")
    for i in range(20):
        _touch(wt / f"pkg{i}" / "AGENTS.md")
    _touch(repo / ".claude" / "settings.json")
    got = _folders(repo)
    assert ".claude" in got and ".claude/worktrees" in got
    assert not any(f.startswith(".claude/worktrees/w1") for f in got)


def test_one_large_repository_does_not_use_up_the_others(tmp_path, monkeypatch, caplog):
    monkeypatch.setattr(tree_walk, "REPO_MAX_DIRS", 5)
    big = _repo(tmp_path / "a-big")
    for i in range(20):
        _touch(big / f"m{i}" / "f.py")
    small = _repo(tmp_path / "z-small")
    _touch(small / "AGENTS.md")
    with caplog.at_level(logging.WARNING):
        assert tools.find_in_tree(tmp_path, "AGENTS.md") == [small / "AGENTS.md"]
    assert any("a-big" in r.getMessage() and "does not ignore" in r.getMessage() for r in caplog.records)


def test_without_git_the_skip_list_decides(tmp_path, monkeypatch):
    repo = _repo(tmp_path / "app")
    _touch(repo / "bin" / "AGENTS.md")
    _touch(repo / "src" / "AGENTS.md")
    monkeypatch.setattr(tree_walk, "_git_kept", lambda _repo: None)
    assert tools.find_in_tree(repo, "AGENTS.md") == [repo / "src" / "AGENTS.md"]


def test_a_fast_walk_shows_new_files_and_a_slow_one_waits(tmp_path, monkeypatch):
    repo = _repo(tmp_path / "app")
    assert tools.find_in_tree(repo, "AGENTS.md") == []
    _touch(repo / "AGENTS.md")
    assert tools.find_in_tree(repo, "AGENTS.md") == [repo / "AGENTS.md"]
    clock = [100.0]
    monkeypatch.setattr(tree_walk.time, "monotonic", lambda: clock[0])
    calls = []

    def slow():
        calls.append(1)
        clock[0] += 5.0
        return len(calls)

    key = ("test", "slow")
    assert tree_walk._cached(key, None, 0.0, slow) == 1
    clock[0] = 100.0 + 5.0 * 20 - 1
    assert tree_walk._cached(key, None, 0.0, slow) == 1
    clock[0] = 100.0 + 5.0 * 20 + 1
    assert tree_walk._cached(key, None, 0.0, slow) == 2


def test_the_whole_walk_stops_at_its_cap_and_says_so_once(tmp_path, monkeypatch, caplog):
    monkeypatch.setattr(tree_walk, "MAX_SCAN_DIRS", 5)
    for i in range(10):
        (tmp_path / f"d{i}").mkdir()
    with caplog.at_level(logging.WARNING):
        for _ in range(2):
            tree_walk.clear_cache()
            assert len(tree_walk.listing(tmp_path)) == 5
    assert sum("--root" in r.getMessage() for r in caplog.records) == 1


def test_context_files_skip_deploy_folders_and_ignored_output(tmp_path):
    repo = _repo(tmp_path / "app", "gen/\n")
    _touch(repo / ".context.toml")
    _touch(repo / "svc" / ".context.toml")
    _touch(repo / "gen" / ".context.toml")
    _touch(repo / ".github" / ".context.toml")
    found = sorted(context._walk(repo))
    assert found == [repo / ".context.toml", repo / "svc" / ".context.toml"]


def test_a_submodule_is_read_as_a_repository_of_its_own(tmp_path):
    outer = _repo(tmp_path / "outer")
    inner = _repo(outer / "inner", "gen/\n")
    _touch(inner / ".vscode" / "mcp.json")
    _touch(inner / "gen" / "x" / "AGENTS.md")
    subprocess.run(["git", "-C", str(outer), "add", "README.md"], check=True)
    subprocess.run(["git", "-C", str(outer), "-c", "protocol.file.allow=always", "update-index", "--add", "--cacheinfo",
                    "160000,0000000000000000000000000000000000000001,inner"], check=True)
    assert tools.find_in_tree(outer, "mcp.json") == [inner / ".vscode" / "mcp.json"]
    assert tools.find_in_tree(outer, "AGENTS.md") == []
