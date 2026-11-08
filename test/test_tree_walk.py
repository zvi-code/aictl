"""Discovery of tool files, one git repository at a time.

Started in a folder of many repositories, discovery listed every folder and file name under it
(13,578 folders and 107,553 names on a Mac with 82 repositories) to keep about 943 matches, and
stopped at 50,000 folders with a warning that blamed the start folder. Discovery now asks git for
the known names only, starts from the repositories of active sessions, reads a repository again
only when its stat signature changes or once an hour, and in the daemon reads the other
repositories in the background.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
import time
from pathlib import Path

import pytest

from aictl import context, tools, tree_walk

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git is not installed")


@pytest.fixture(autouse=True)
def _fresh():
    tree_walk.clear_cache()
    tree_walk.note_active_projects([])
    yield
    tree_walk.set_lazy(False)
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


class _Calls(list):
    """The folders that discovery's processes ran in, and the keyword arguments of each start."""

    kwargs: list[dict]


@pytest.fixture()
def git_calls(monkeypatch):
    calls = _Calls()
    calls.kwargs = []
    real = subprocess.Popen

    class Counting(real):  # type: ignore[misc,valid-type]
        def __init__(self, args, *a, **k):
            if isinstance(args, list) and args and args[0] == tree_walk.GIT and "ls-files" in args:
                calls.append(args[args.index("-C") + 1])
                calls.kwargs.append(k)
            super().__init__(args, *a, **k)

    monkeypatch.setattr(tree_walk.subprocess, "Popen", Counting)
    return calls


def _hidden(root: Path) -> set[Path]:
    return {p for p, _kind in tools._project_env_paths(root)}


# ── What is found ───────────────────────────────────────────────────


def test_gitignored_output_is_skipped_and_tool_folders_are_still_read(tmp_path):
    repo = _repo(tmp_path / "app", "gen/\n.vscode/\n.claude/settings.local.json\nCLAUDE.local.md\n.deps/\n")
    _touch(repo / "src" / "main.py")
    for i in range(30):
        _touch(repo / "gen" / f"g{i}" / "AGENTS.md")
    _touch(repo / ".vscode" / "mcp.json")
    _touch(repo / ".github" / "copilot-instructions.md")
    _touch(repo / ".github" / "instructions" / "py.instructions.md")
    _touch(repo / ".claude" / "settings.local.json")
    _touch(repo / "CLAUDE.local.md")
    _touch(repo / ".deps" / "cfg.json")
    _touch(repo / ".deps" / "deep" / "x" / "y.json")
    assert tools.find_in_tree(repo, "AGENTS.md") == []  # an ignored build folder is not read
    assert tools.find_in_tree(repo, "CLAUDE.local.md") == [repo / "CLAUDE.local.md"]
    assert tools.find_in_tree(repo, "mcp.json") == [repo / ".vscode" / "mcp.json"]
    _files, dirs = tools.batch_find_in_tree(repo, set(), {".github", ".claude", ".vscode"})
    assert dirs == {".github": [repo / ".github"], ".claude": [repo / ".claude"], ".vscode": [repo / ".vscode"]}
    hidden = _hidden(repo)
    assert repo / ".deps" / "cfg.json" in hidden  # an ignored unknown hidden folder: its own files, one level
    assert not any("deep" in str(p) for p in hidden)


def test_an_ignored_tool_file_is_found_where_no_other_file_is_kept(tmp_path):
    """The old walk read the files of a folder only when git kept a file there."""
    repo = _repo(tmp_path / "app", "*.local.md\n")
    _touch(repo / "team" / "CLAUDE.local.md")
    assert tools.find_in_tree(repo, "CLAUDE.local.md") == [repo / "team" / "CLAUDE.local.md"]


def test_a_folder_of_projects_reads_each_repository_through_its_own_gitignore(tmp_path):
    a = _repo(tmp_path / "a", "gen/\n")
    b = _repo(tmp_path / "b", "obj/\n")
    _touch(a / "gen" / "AGENTS.md")
    _touch(b / "AGENTS.md")
    _touch(b / "node_modules" / "pkg" / "AGENTS.md")
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
    entries = tree_walk.listing(tmp_path, files={"AGENTS.md"})
    assert entries[0][0] == deep
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == [deep / "AGENTS.md"]


def test_a_worktree_copy_inside_a_tool_folder_is_not_read(tmp_path):
    repo = _repo(tmp_path / "app", ".claude/worktrees/\n")
    wt = repo / ".claude" / "worktrees" / "w1"
    _touch(wt / ".git", "gitdir: /nowhere\n")
    for i in range(20):
        _touch(wt / f"pkg{i}" / "AGENTS.md")
    _touch(repo / ".claude" / "settings.json")
    assert tools.find_in_tree(repo, "AGENTS.md") == []
    assert tools.find_in_tree(repo, "settings.json") == [repo / ".claude" / "settings.json"]


def test_context_files_skip_deploy_folders_and_ignored_output(tmp_path):
    repo = _repo(tmp_path / "app", "gen/\n")
    _touch(repo / ".context.toml")
    _touch(repo / "svc" / ".context.toml")
    _touch(repo / "gen" / ".context.toml")
    _touch(repo / ".github" / ".context.toml")
    found = sorted(context._walk(repo))
    assert found == [repo / ".context.toml", repo / "svc" / ".context.toml"]


def test_a_submodule_is_read_as_a_repository_of_its_own(tmp_path):
    # A real submodule is named in .gitmodules; git lists it as one entry, so discovery reads it apart.
    outer = _repo(tmp_path / "outer")
    inner = _repo(outer / "inner", "gen/\n")
    _touch(inner / ".vscode" / "mcp.json")
    _touch(inner / "gen" / "x" / "AGENTS.md")
    _touch(outer / ".gitmodules", '[submodule "inner"]\n\tpath = inner\n\turl = ./inner\n')
    subprocess.run(["git", "-C", str(outer), "add", "README.md", ".gitmodules"], check=True)
    subprocess.run(["git", "-C", str(outer), "update-index", "--add", "--cacheinfo",
                    "160000,0000000000000000000000000000000000000001,inner"], check=True)
    assert tools.find_in_tree(outer, "mcp.json") == [inner / ".vscode" / "mcp.json"]
    assert tools.find_in_tree(outer, "AGENTS.md") == []


def test_an_untracked_repository_inside_a_repository_is_read_apart(tmp_path):
    outer = _repo(tmp_path / "outer")
    inner = _repo(outer / "vendor" / "lib", "gen/\n")
    _touch(inner / "AGENTS.md")
    _touch(inner / "gen" / "AGENTS.md")
    assert tools.find_in_tree(outer, "AGENTS.md") == [inner / "AGENTS.md"]


def test_a_worktree_has_its_own_files_and_its_real_git_folder(tmp_path, git_calls):
    main = _repo(tmp_path / "main")
    subprocess.run(["git", "-C", str(main), "add", "README.md"], check=True)
    subprocess.run(["git", "-C", str(main), "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "x"], check=True)
    wt = tmp_path / "wt"
    subprocess.run(["git", "-C", str(main), "worktree", "add", "-q", str(wt)], check=True, capture_output=True)
    assert (wt / ".git").is_file()
    assert tree_walk.git_root(wt / "src") == wt
    assert tree_walk.git_dir(wt).resolve() == (main / ".git" / "worktrees" / "wt").resolve()
    _touch(wt / "AGENTS.md")
    git_calls.clear()
    assert tools.find_in_tree(wt, "AGENTS.md") == [wt / "AGENTS.md"]
    assert tools.find_in_tree(wt, "AGENTS.md") == [wt / "AGENTS.md"]
    assert len(git_calls) == 2  # the first listing only: the signature reads the worktree's own index


# ── Limits and messages ─────────────────────────────────────────────


def test_a_repository_has_no_folder_limit_and_no_warning(tmp_path, monkeypatch, caplog):
    monkeypatch.setattr(tree_walk, "MAX_SCAN_DIRS", 5)
    monkeypatch.setattr(tree_walk, "OUTSIDE_MAX_DIRS", 5, raising=False)
    monkeypatch.setattr(tree_walk, "REPO_MAX_DIRS", 5, raising=False)
    big = _repo(tmp_path / "a-big")
    for i in range(30):
        _touch(big / f"m{i}" / "AGENTS.md")
    small = _repo(tmp_path / "z-small")
    _touch(small / "AGENTS.md")
    with caplog.at_level(logging.WARNING):
        found = tools.find_in_tree(tmp_path, "AGENTS.md")
    assert len(found) == 31 and small / "AGENTS.md" in found
    assert [r.getMessage() for r in caplog.records if r.levelno >= logging.WARNING] == []


def test_the_walk_outside_git_says_what_it_covered_once(tmp_path, monkeypatch, caplog):
    monkeypatch.setattr(tree_walk, "OUTSIDE_MAX_DIRS", 5, raising=False)
    monkeypatch.setattr(tree_walk, "MAX_SCAN_DIRS", 5)
    _repo(tmp_path / "a0-repo")
    for i in range(10):
        (tmp_path / f"d{i}").mkdir()
    with caplog.at_level(logging.WARNING):
        for _ in range(2):
            tree_walk.clear_cache()
            tree_walk.listing(tmp_path)
    msgs = [r.getMessage() for r in caplog.records if "--root" in r.getMessage()]
    assert len(msgs) == 1
    assert "active sessions in full" in msgs[0] and "found 1 repositories" in msgs[0] and "outside git" in msgs[0]


def test_without_git_each_repository_is_read_directly_with_the_skip_list(tmp_path, monkeypatch, git_calls):
    repo = _repo(tmp_path / "app", "src/gen/\n")
    _touch(repo / "bin" / "AGENTS.md")
    _touch(repo / "src" / "AGENTS.md")
    monkeypatch.setattr(tree_walk, "GIT", str(tmp_path / "no-such-git"))
    assert tools.find_in_tree(repo, "AGENTS.md") == [repo / "src" / "AGENTS.md"]
    assert tree_walk._git_missing is True
    git_calls.clear()
    tree_walk.clear_cache()
    tree_walk._git_missing = True
    assert tools.find_in_tree(repo, "AGENTS.md") == [repo / "src" / "AGENTS.md"]
    assert git_calls == []  # git is not tried again for every repository


def test_git_runs_without_a_console_window(tmp_path, git_calls):
    repo = _repo(tmp_path / "app")
    tools.find_in_tree(repo, "AGENTS.md")
    assert git_calls and all(k["creationflags"] & tree_walk._NO_WINDOW == tree_walk._NO_WINDOW for k in git_calls.kwargs)


# ── No rescan of an unchanged repository ────────────────────────────


def test_an_unchanged_repository_starts_no_git_process(tmp_path, git_calls):
    a = _repo(tmp_path / "a")
    b = _repo(tmp_path / "b")
    _touch(a / "AGENTS.md")
    _touch(b / ".github" / "copilot-instructions.md")
    tools.batch_find_in_tree(tmp_path, {"AGENTS.md"}, {".github"})
    assert sorted(set(git_calls)) == sorted([str(a), str(b)])
    git_calls.clear()
    for _ in range(3):
        files, dirs = tools.batch_find_in_tree(tmp_path, {"AGENTS.md"}, {".github"})
    assert git_calls == []
    assert files["AGENTS.md"] == [a / "AGENTS.md"] and dirs[".github"] == [b / ".github"]


def test_a_changed_repository_is_read_again_alone(tmp_path, git_calls):
    a = _repo(tmp_path / "a")
    b = _repo(tmp_path / "b")
    _touch(b / "docs" / "AGENTS.md")
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == [b / "docs" / "AGENTS.md"]
    git_calls.clear()
    _touch(a / "AGENTS.md")  # the top folder of a changes
    _touch(b / "docs" / "CLAUDE.md")  # a folder of b that held a match changes
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == [a / "AGENTS.md", b / "docs" / "AGENTS.md"]
    assert git_calls.count(str(a)) == 2 and git_calls.count(str(b)) == 2  # one pass: two calls at the same time
    git_calls.clear()
    _touch(a / ".github" / "copilot-instructions.md")
    tools.find_in_tree(tmp_path, "AGENTS.md")
    assert set(git_calls) == {str(a)}


def test_a_new_name_reads_the_repository_again(tmp_path, git_calls):
    repo = _repo(tmp_path / "app")
    _touch(repo / "x" / "target.txt")
    assert tools.find_in_tree(repo, "AGENTS.md") == []
    assert tools.find_in_tree(repo, "target.txt") == [repo / "x" / "target.txt"]


def test_a_deep_new_file_shows_after_the_hourly_refresh_spread_over_time(tmp_path, monkeypatch, git_calls):
    clock = [1000.0]
    monkeypatch.setattr(tree_walk, "_now", lambda: clock[0])
    repos = [_repo(tmp_path / f"r{i}") for i in range(4)]
    for r in repos:
        _touch(r / "src" / "deep" / "main.py")
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == []
    dues = sorted(u.full_due for u in tree_walk._units.values())
    assert all(1000.0 + tree_walk.FULL_REFRESH_S <= d < 1000.0 + 2 * tree_walk.FULL_REFRESH_S for d in dues)
    assert len(set(dues)) == 4  # spread by path, not all at once
    for r in repos:
        _touch(r / "src" / "deep" / "AGENTS.md")  # the folder held no match, so the signature does not see it
    git_calls.clear()
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == []
    assert git_calls == []
    clock[0] += 2 * tree_walk.FULL_REFRESH_S  # all four are due
    first = tools.find_in_tree(tmp_path, "AGENTS.md")
    assert len(first) == tree_walk.MAX_FULL_REFRESH_PER_PASS  # one request refreshes only a few
    while len(tools.find_in_tree(tmp_path, "AGENTS.md")) < 4:
        pass
    assert len(set(git_calls)) == 4 and len(git_calls) == 8
    after = {u.full_due for u in tree_walk._units.values()}
    assert all(d >= clock[0] + tree_walk.FULL_REFRESH_S for d in after)  # then not again within the hour


# ── Sessions ────────────────────────────────────────────────────────


def test_each_file_is_linked_to_the_sessions_it_can_affect(tmp_path):
    repo = _repo(tmp_path / "app")
    other = _repo(tmp_path / "other")
    _touch(repo / "AGENTS.md")
    _touch(repo / "src" / "AGENTS.md")
    _touch(repo / ".github" / "copilot-instructions.md")
    _touch(repo / "docs" / ".claude" / "rules" / "a.md")
    _touch(other / "AGENTS.md")
    tree_walk.note_active_sessions({"s-src": [str(repo / "src" / "pkg")], "s-docs": [str(repo / "docs")]})
    tools.batch_find_in_tree(tmp_path, {"AGENTS.md"}, {".github", ".claude"})
    links = tree_walk.session_links()
    assert list(links) == [str(repo)]
    link = links[str(repo)]
    assert link["git_root"] == str(repo) and link["sessions"] == ["s-docs", "s-src"]
    by_path = {f["path"]: f["sessions"] for f in link["files"]}
    assert by_path[str(repo / "AGENTS.md")] == ["s-docs", "s-src"]
    assert by_path[str(repo / ".github" / "copilot-instructions.md")] == ["s-docs", "s-src"]
    assert by_path[str(repo / "src" / "AGENTS.md")] == ["s-src"]
    assert by_path[str(repo / "docs" / ".claude" / "rules" / "a.md")] == ["s-docs"]
    assert str(other / "AGENTS.md") not in by_path


def test_a_past_sessions_folder_gets_its_files_by_the_same_rule(tmp_path):
    """No live session is needed: a session's side panel lists the files of its own folder."""
    repo = _repo(tmp_path / "app")
    _touch(repo / "AGENTS.md")
    _touch(repo / "src" / "AGENTS.md")
    _touch(repo / "docs" / "AGENTS.md")
    _touch(repo / ".github" / "copilot-instructions.md")
    assert tree_walk.files_for_folder(repo / "src")["read"] is False  # not read yet: says so, reads nothing
    tools.batch_find_in_tree(tmp_path, {"AGENTS.md"}, {".github"})
    found = tree_walk.files_for_folder(repo / "src" / "pkg")
    assert found["git_root"] == str(repo) and found["read"] is True
    assert found["files"] == sorted(
        [str(repo / ".github" / "copilot-instructions.md"), str(repo / "AGENTS.md"), str(repo / "src" / "AGENTS.md")]
    )
    assert tree_walk.files_for_folder(tmp_path / "not-a-repo") == {"git_root": None, "files": [], "read": False}


# ── Lazy discovery in the daemon ────────────────────────────────────


def test_lazy_start_reads_only_active_repositories(tmp_path, monkeypatch, git_calls):
    monkeypatch.setattr(tree_walk, "_run_background", lambda: None)  # the test runs the background pass itself
    active = _repo(tmp_path / "active")
    idle = _repo(tmp_path / "idle")
    _touch(active / "AGENTS.md")
    _touch(idle / "AGENTS.md")
    tree_walk.note_active_sessions({"s1": [str(active)]})
    tree_walk.set_lazy(True)
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == [active / "AGENTS.md"]
    assert set(git_calls) == {str(active)}
    assert tree_walk.state(tmp_path)["partial"] is True
    tree_walk._background_pass(tmp_path)
    assert str(idle) in git_calls
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == [active / "AGENTS.md", idle / "AGENTS.md"]
    assert tree_walk.state(tmp_path) == {"partial": False, "repositories": 2, "pending": 0}


def test_lazy_mode_reads_a_changed_repository_in_the_background(tmp_path, monkeypatch, git_calls):
    monkeypatch.setattr(tree_walk, "_run_background", lambda: None)
    a = _repo(tmp_path / "a")
    tools.find_in_tree(tmp_path, "AGENTS.md")
    tree_walk.set_lazy(True)
    git_calls.clear()
    _touch(a / "AGENTS.md")
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == []  # the old result, at once
    assert git_calls == [] and tree_walk.state(tmp_path)["pending"] == 1
    tree_walk._background_pass(tmp_path)
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == [a / "AGENTS.md"]


def test_the_background_thread_finishes_the_rest(tmp_path):
    a = _repo(tmp_path / "a")
    _touch(a / "AGENTS.md")
    tree_walk.set_lazy(True)
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == []
    for _ in range(200):
        if not tree_walk.state(tmp_path)["partial"]:
            break
        time.sleep(0.05)
    assert tools.find_in_tree(tmp_path, "AGENTS.md") == [a / "AGENTS.md"]


def test_the_daemon_start_turns_on_lazy_discovery(tmp_path, monkeypatch):
    from aictl import orchestrator

    seen = []

    def stop_here(*_a, **_k):
        seen.append(tree_walk.is_lazy())
        raise RuntimeError("stop")

    monkeypatch.setattr(orchestrator, "collect", stop_here)
    service = orchestrator.CollectionService(tmp_path, include_live_monitor=False, db_path=tmp_path / "h.db")
    with pytest.raises(RuntimeError):
        service.start(quiet=True)
    assert seen == [True]
    service.stop()
    assert tree_walk.is_lazy() is False
