"""Tests for git commit attribution (slice 3.5).

Covers:
  * ``commits_in_window`` windowing on a real tmp repo.
  * Non-git / corrupted / missing dir degrade to ``[]``.
  * ``session_commits`` migration applies and the storage helpers work.
  * ``/api/session-commits`` endpoint returns the expected shape with
    ``current_branch_match`` computed against the session's branch.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import threading
import time
import urllib.request
from pathlib import Path

import pytest

from aictl.analysis.git_attribution import (
    attribute_session,
    commits_in_window,
    is_reachable,
)
from aictl.storage import HistoryDB, SessionRow


def _git(cwd: Path, *args: str, env: dict | None = None) -> None:
    base_env = {
        "GIT_AUTHOR_NAME": "Test Author",
        "GIT_AUTHOR_EMAIL": "test@example.com",
        "GIT_COMMITTER_NAME": "Test Author",
        "GIT_COMMITTER_EMAIL": "test@example.com",
        "HOME": str(cwd),
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "PATH": os.environ.get("PATH", ""),
    }
    if env:
        base_env.update(env)
    subprocess.run(
        ["git", *args],
        cwd=str(cwd),
        check=True,
        capture_output=True,
        env=base_env,
    )


def _commit_at(repo: Path, msg: str, ts: float) -> str:
    """Create a commit whose author/committer dates are exactly ``ts``."""
    (repo / "f.txt").write_text(msg)
    iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(ts)) + "+0000"
    _git(repo, "add", "f.txt")
    _git(
        repo,
        "commit",
        "-m",
        msg,
        env={"GIT_AUTHOR_DATE": iso, "GIT_COMMITTER_DATE": iso},
    )
    out = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=str(repo),
        capture_output=True,
        text=True,
        check=True,
    )
    return out.stdout.strip()


@pytest.fixture()
def tmp_repo(tmp_path: Path) -> Path:
    if shutil.which("git") is None:
        pytest.skip("git not on PATH")
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "commit.gpgsign", "false")
    return repo


def test_commits_in_window_filters_by_time(tmp_repo: Path) -> None:
    now = time.time()
    t0 = now - 900  # 15 min ago
    t1 = now - 600  # 10 min ago
    t2 = now - 300  # 5 min ago

    sha0 = _commit_at(tmp_repo, "old", t0)
    sha1 = _commit_at(tmp_repo, "mid", t1)
    sha2 = _commit_at(tmp_repo, "new", t2)

    # Window covering only mid + new:
    commits = commits_in_window(tmp_repo, since_ts=t1 - 1, until_ts=t2 + 1)
    shas = {c["sha"] for c in commits}
    assert sha1 in shas
    assert sha2 in shas
    assert sha0 not in shas
    assert all(c["author_email"] == "test@example.com" for c in commits)
    assert all("sha" in c and "subject" in c and "ts" in c for c in commits)

    # Unbounded until → everything since t0 included.
    commits_all = commits_in_window(tmp_repo, since_ts=t0 - 1, until_ts=None)
    assert {c["sha"] for c in commits_all} == {sha0, sha1, sha2}

    # Empty window → [].
    assert commits_in_window(tmp_repo, since_ts=now + 10, until_ts=now + 20) == []


def test_commits_in_window_non_git_dir(tmp_path: Path) -> None:
    plain = tmp_path / "plain"
    plain.mkdir()
    assert commits_in_window(plain, since_ts=0.0, until_ts=time.time()) == []


def test_commits_in_window_missing_dir(tmp_path: Path) -> None:
    assert commits_in_window(tmp_path / "does-not-exist", 0.0, time.time()) == []


def test_commits_in_window_corrupted_repo(tmp_path: Path) -> None:
    """A .git that looks like a repo but is corrupted should return []."""
    broken = tmp_path / "broken"
    (broken / ".git").mkdir(parents=True)
    # Intentionally empty .git — not a valid repo.
    assert commits_in_window(broken, 0.0, time.time()) == []


def test_is_reachable_false_for_missing(tmp_repo: Path) -> None:
    assert is_reachable(tmp_repo, "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef", "main") is False
    assert is_reachable(tmp_repo, "", "main") is False
    assert is_reachable(tmp_repo, "deadbeef", "") is False


def test_session_commits_migration_and_storage(tmp_path: Path) -> None:
    db = HistoryDB(db_path=str(tmp_path / "mig.db"), flush_interval=0)
    # Table exists and helpers work.
    db.upsert_session_commits(
        "sess-x",
        [
            {
                "sha": "abc123",
                "author_name": "A",
                "author_email": "a@e",
                "ts": 100.0,
                "subject": "first",
            },
            {
                "sha": "def456",
                "author_name": "B",
                "author_email": "b@e",
                "ts": 200.0,
                "subject": "second",
            },
        ],
    )
    assert db.count_session_commits("sess-x") == 2
    rows = db.get_session_commits("sess-x")
    assert [r["sha"] for r in rows] == ["abc123", "def456"]

    # Idempotent on duplicate sha.
    db.upsert_session_commits(
        "sess-x",
        [{"sha": "abc123", "author_name": "A", "author_email": "a@e", "ts": 100.0, "subject": "first"}],
    )
    assert db.count_session_commits("sess-x") == 2
    db.close()


def test_attribute_session_persists(tmp_repo: Path, tmp_path: Path) -> None:
    now = time.time()
    _commit_at(tmp_repo, "one", now - 120)
    _commit_at(tmp_repo, "two", now - 60)
    db = HistoryDB(db_path=str(tmp_path / "attr.db"), flush_interval=0)
    commits = attribute_session(db, "sess-1", tmp_repo, now - 180, now)
    assert len(commits) == 2
    assert db.count_session_commits("sess-1") == 2
    db.close()


# ── API endpoint ──────────────────────────────────────────────────


@pytest.fixture()
def api_server(tmp_repo: Path, tmp_path: Path):
    from pathlib import Path as _P

    from aictl.dashboard.models import DashboardSnapshot
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore

    now = time.time()
    _commit_at(tmp_repo, "alpha", now - 300)
    _commit_at(tmp_repo, "beta", now - 200)

    db = HistoryDB(db_path=str(tmp_path / "api.db"), flush_interval=0)
    db.upsert_session(
        SessionRow(
            session_id="sess-api",
            tool="claude-code",
            project_path=str(tmp_repo),
            git_branch="main",
            started_at=now - 360,
            source="test",
        )
    )
    db.update_session_end("sess-api", ended_at=now - 60)

    store = SnapshotStore(db=db)
    store.update(DashboardSnapshot(timestamp=now, root=str(tmp_repo), tools=[], sessions=[]))
    srv = _DashboardHTTPServer(
        ("127.0.0.1", 0),
        _DashboardHandler,
        store,
        AllowedPaths(),
        _P(str(tmp_repo)),
    )
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}", db
    srv.shutdown()
    db.close()


def test_session_commits_endpoint(api_server) -> None:
    base, db = api_server
    with urllib.request.urlopen(base + "/api/session-commits?session_id=sess-api", timeout=5) as r:
        data = json.loads(r.read())
    assert data["session_id"] == "sess-api"
    assert data["branch"] == "main"
    assert len(data["commits"]) == 2
    c = data["commits"][0]
    assert set(c) >= {"sha", "short_sha", "author_name", "author_email", "ts", "subject", "current_branch_match"}
    assert len(c["short_sha"]) == 7
    # Both commits are reachable from main (they were committed on main).
    assert all(x["current_branch_match"] for x in data["commits"])
    # Lazy attribution persisted to DB.
    assert db.count_session_commits("sess-api") == 2


def test_session_commits_endpoint_missing_sid(api_server) -> None:
    base, _db = api_server
    req = urllib.request.Request(base + "/api/session-commits")
    with pytest.raises(urllib.error.HTTPError) as exc:
        urllib.request.urlopen(req, timeout=5)
    assert exc.value.code == 400
