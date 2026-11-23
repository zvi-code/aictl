"""Changes and Projects count the lines of a project from one source, by where each file is.

Found on real data: Projects showed aictl +1,668 while Changes showed +34,908 for the same range,
because each changed file was filed under the folder its session ran in (an agent worktree, so a
"project" no Projects row lists) and scratch files under /private/tmp went to that worktree too.
"""

from __future__ import annotations

from types import SimpleNamespace

from aictl.dashboard.board_projection import _changes_section, file_projects

REPO = "/work/aictl"
WORKTREE = f"{REPO}/.claude/worktrees/agent-a1"


def _board(rows, session_project):
    board = SimpleNamespace(
        narrowed=False, only_session=None, scope=set(session_project), session_project=session_project,
        history=SimpleNamespace(qualified=False, keys=lambda ids: sorted(ids)),
    )
    board._history_window = lambda view, **_params: rows
    return board


def _row(path, written_from, added, removed, sid="s1"):
    return {"path": path, "project_path": written_from, "added": added, "removed": removed, "edits": 1,
            "sessions": 1, "last_ts": 1.0, "session_id": sid}


def test_a_file_belongs_to_the_innermost_known_project_that_holds_it():
    owner = file_projects([f"{WORKTREE}/src/a.py", "/private/tmp/scratch/x.py", "/work/other/b.py", f"{REPO}x/c.py"],
                          [REPO, WORKTREE, "/work/other"])
    assert owner == {f"{WORKTREE}/src/a.py": REPO, "/private/tmp/scratch/x.py": "", "/work/other/b.py": "/work/other",
                     f"{REPO}x/c.py": ""}


def test_project_lines_and_the_changes_total_reconcile_and_scratch_files_are_outside_any_project():
    rows = [
        _row(f"{REPO}/README.md", REPO, 10, 1),
        _row(f"{WORKTREE}/src/a.py", WORKTREE, 100, 5),
        _row("/private/tmp/scratch/notes.py", WORKTREE, 7, 0),
    ]
    changes, by_project = _changes_section(_board(rows, {"s1": REPO}))
    projects = {f["path"]: f["project"] for f in changes["files"]}
    assert projects == {f"{REPO}/README.md": REPO, f"{WORKTREE}/src/a.py": REPO, "/private/tmp/scratch/notes.py": ""}
    assert by_project == {REPO: (110, 6)}
    totals = changes["totals"]
    assert totals["outside_projects"] == {"files": 1, "lines_added": 7, "lines_removed": 0}
    assert sum(a for a, _r in by_project.values()) + totals["outside_projects"]["lines_added"] == totals["lines_added"]
