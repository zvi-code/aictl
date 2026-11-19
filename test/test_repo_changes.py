"""Git change tracking: what the file watcher reports for files in git repositories."""

from __future__ import annotations

import os
import shutil
import subprocess
import time
from pathlib import Path

import pytest

from aictl.monitoring.config import MonitorConfig
from aictl.monitoring.correlator import SessionCorrelator
from aictl.monitoring.repo_changes import FileChange, HeadMove, RepoChangeTracker
from aictl.monitoring.session import ProcessInfo

needs_git = pytest.mark.skipif(shutil.which("git") is None, reason="git is not installed")


def _git(repo: Path, *args: str) -> None:
    subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", *args],
        cwd=repo,
        check=True,
        capture_output=True,
    )


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    top = tmp_path / "repo"
    top.mkdir()
    _git(top, "init", "-q")
    _git(top, "config", "core.autocrlf", "false")
    (top / "a.txt").write_bytes(b"one\n")
    (top / "d").mkdir()
    (top / "d" / "x.txt").write_bytes(b"x\n")
    (top / "d" / "y.txt").write_bytes(b"y\n")
    (top / ".gitignore").write_bytes(b"build/\n.claude/settings.local.json\n")
    _git(top, "add", "-A")
    _git(top, "commit", "-q", "-m", "first")
    return top


def _ready(repo: Path, state_path: Path | None = None) -> RepoChangeTracker:
    tracker = RepoChangeTracker(state_path)
    assert [r.top for r in tracker.add_repo(repo)] == [repo]
    assert tracker.drain(force=True) == []  # the first read is a baseline: nothing to report
    return tracker


def _changes(items) -> list[tuple[str, str, str]]:
    return sorted((Path(c.path).name, c.change, c.status) for c in items if isinstance(c, FileChange))


@needs_git
def test_a_tracked_file_is_reported_once_per_change_and_when_reverted(repo):
    tracker = _ready(repo)
    path = repo / "a.txt"

    path.write_bytes(b"one\ntwo\n")
    assert tracker.note(str(path)) == "queued"
    (change,) = tracker.drain(force=True)
    assert (change.change, change.status, change.tracked) == ("modified", ".M", True)
    assert (change.lines_added, change.lines_removed, change.growth_bytes) == (1, 0, 4)

    path.write_bytes(b"one\ntwo\n")  # saved again without a change
    tracker.note(str(path))
    assert tracker.drain(force=True) == []

    path.write_bytes(b"one\n")
    tracker.note(str(path))
    assert _changes(tracker.drain(force=True)) == [("a.txt", "reverted", "")]


@needs_git
def test_an_untracked_file_is_reported_when_created_and_deleted(repo):
    tracker = _ready(repo)
    path = repo / "new.py"

    path.write_bytes(b"a\nb\n")
    tracker.note(str(path), created=True)
    (change,) = tracker.drain(force=True)
    assert (change.change, change.status, change.tracked, change.lines_added) == ("created", "??", False, 2)

    path.unlink()
    tracker.note(str(path))
    (change,) = tracker.drain(force=True)
    assert (change.change, change.lines_removed) == ("deleted", 2)


@needs_git
def test_a_commit_is_one_head_move_and_not_a_report_per_file(repo):
    tracker = _ready(repo)
    path = repo / "a.txt"
    path.write_bytes(b"one\ntwo\n")
    tracker.note(str(path))
    assert len(tracker.drain(force=True)) == 1

    _git(repo, "commit", "-q", "-am", "second")
    for p in (repo / ".git" / "index", repo / ".git" / "logs" / "HEAD", path):
        assert tracker.note(str(p)) == "queued"
    assert tracker.note(str(repo / ".git" / "objects" / "ab" / "cd")) == "dropped"

    items = tracker.drain(force=True)
    assert [(type(i), i.action, i.message) for i in items] == [(HeadMove, "commit", "second")]
    assert tracker.repos()[0].dirty == {}


@needs_git
def test_ignored_files_are_dropped_unless_they_are_tool_files(repo):
    (repo / "build").mkdir()
    (repo / "build" / "old.o").write_bytes(b"0")
    tracker = _ready(repo)

    assert tracker.note(str(repo / "build" / "new.o")) == "dropped"
    assert tracker.note(str(repo / "node_modules" / "x" / "index.js")) == "dropped"

    settings = repo / ".claude" / "settings.local.json"
    settings.parent.mkdir()
    settings.write_bytes(b"{}\n")
    assert tracker.note(str(settings), "claude-code", created=True) == "queued"
    (change,) = tracker.drain(force=True)
    assert (change.change, change.status, change.tool_hint, change.lines_added) == ("created", "!!", "claude-code", 1)

    settings.write_bytes(b'{"a": 1}\n')
    tracker.note(str(settings), "claude-code")
    assert _changes(tracker.drain(force=True)) == [("settings.local.json", "modified", "!!")]

    tracker.note(str(settings), "claude-code")  # no change
    assert tracker.drain(force=True) == []


@needs_git
def test_a_moved_folder_reports_the_files_under_it(repo):
    tracker = _ready(repo)

    os.rename(repo / "d", repo / "e")
    tracker.note(str(repo / "d"), is_dir=True)
    tracker.note(str(repo / "e"), is_dir=True)

    assert _changes(tracker.drain(force=True)) == [
        ("x.txt", "created", "??"),
        ("x.txt", "deleted", ".D"),
        ("y.txt", "created", "??"),
        ("y.txt", "deleted", ".D"),
    ]


@needs_git
def test_a_staged_rename_is_one_report(repo):
    tracker = _ready(repo)

    _git(repo, "mv", "a.txt", "b.txt")
    tracker.note(str(repo / "a.txt"))
    tracker.note(str(repo / "b.txt"))

    (change,) = tracker.drain(force=True)
    assert (Path(change.path).name, change.change, Path(change.renamed_from).name) == ("b.txt", "renamed", "a.txt")


@needs_git
def test_changes_made_while_stopped_are_found_at_the_next_start(repo, tmp_path):
    state = tmp_path / "repo_changes.json"
    tracker = _ready(repo, state)
    (repo / "a.txt").write_bytes(b"one\ntwo\n")
    (repo / "keep.txt").write_bytes(b"k\n")
    tracker.note(str(repo / "a.txt"))
    tracker.note(str(repo / "keep.txt"))
    assert len(tracker.drain(force=True)) == 2
    tracker.save()

    (repo / "a.txt").write_bytes(b"one\ntwo\nthree\n")

    restarted = RepoChangeTracker(state)
    restarted.add_repo(repo)
    assert _changes(restarted.drain(force=True)) == [("a.txt", "modified", ".M")]


@needs_git
def test_a_tool_home_inside_a_repository_is_left_to_the_caller(repo):
    tracker = _ready(repo)
    home = repo / "home" / ".claude"

    assert tracker.note(str(home / "projects" / "s.jsonl"), "claude-code", boundary=str(home)) == "outside"
    assert tracker.note(str(repo.parent / "elsewhere.txt")) == "outside"


def _claude(pid: int, cwd: Path) -> ProcessInfo:
    return ProcessInfo(
        pid=pid, ppid=1, name="node", exe="/usr/local/bin/node", cmdline=("node", "/usr/local/bin/claude", "--print"), cwd=str(cwd)
    )


def test_a_repository_change_is_given_to_the_one_session_in_that_repository(tmp_path):
    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    (repo / "src").mkdir()
    correlator = SessionCorrelator(MonitorConfig.for_root(tmp_path))

    def change() -> dict:
        correlator.on_repo_change(
            FileChange(
                repo=str(repo),
                path=str(repo / "src" / "a.py"),
                change="modified",
                status=".M",
                tracked=True,
                size_bytes=10,
                growth_bytes=2,
                lines_added=1,
                lines_removed=0,
                ts=time.time(),
            )
        )
        return correlator.pending_events[-1]

    correlator.on_process(_claude(555, repo / "src"), cpu_percent=1.0, memory_rss=0, child_count=0, is_new=True)
    event = change()
    assert (event["kind"], event["tool"]) == ("file_modified", "claude-code")
    assert event["detail"]["session_id"] in correlator.sessions
    assert event["detail"]["project_path"] == str(repo)

    # Two sessions in one repository: the change cannot tell which one made it.
    correlator.on_process(_claude(556, repo), cpu_percent=1.0, memory_rss=0, child_count=0, is_new=True)
    assert len(correlator.sessions) == 2
    event = change()
    assert (event["tool"], event["detail"]["session_id"]) == ("unknown", "")
