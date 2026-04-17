# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Attribute git commits to AI tool session time windows.

For each session with a known ``project_path`` and bounded time
window, we shell out to ``git log`` (no shell=True) and persist every
commit authored in that window to the ``session_commits`` table. This
gives the Explorer a "Session 42 → commits abc123, def456 shipped to
main" badge.

All subprocess calls use explicit ``argv`` lists with a 3 s timeout;
never pass user-controlled data through a shell. Missing ``git``,
non-repos, and corrupted repos all degrade to an empty list rather
than raising.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

_TIMEOUT_S = 3.0
_GIT_LOG_SEP = "\x1f"  # ASCII unit separator — safe inside git's %x1f format


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _have_git() -> bool:
    return shutil.which("git") is not None


def _run_git(args: list[str], cwd: Path) -> subprocess.CompletedProcess[str] | None:
    """Run ``git`` with the given argv list. Returns None on failure.

    Never invokes a shell; ``args`` are passed as a list.
    """
    try:
        return subprocess.run(  # noqa: S603 — argv list, no shell
            ["git", *args],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=_TIMEOUT_S,
            check=False,
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        log.debug("git %s failed in %s: %s", args[0] if args else "?", cwd, exc)
        return None


def commits_in_window(
    project_dir: Path | str,
    since_ts: float,
    until_ts: float | None,
) -> list[dict[str, Any]]:
    """Return commits authored in ``[since_ts, until_ts]`` under ``project_dir``.

    Returns ``[]`` for:
      * non-existent directory
      * not a git repo
      * ``git`` not on ``$PATH``
      * any git error / timeout
      * no commits in the window

    Each entry: ``{sha, author_name, author_email, ts, subject}``.
    """
    if not _have_git():
        return []
    p = Path(project_dir)
    if not p.is_dir():
        return []

    until = until_ts if until_ts is not None else time.time()
    if until <= since_ts:
        return []

    # Confirm it is a git repo (cheap, avoids noisy error output below).
    probe = _run_git(["rev-parse", "--is-inside-work-tree"], p)
    if probe is None or probe.returncode != 0 or probe.stdout.strip() != "true":
        return []

    fmt = _GIT_LOG_SEP.join(["%H", "%an", "%ae", "%at", "%s"])
    args = [
        "log",
        f"--since={_iso(since_ts)}",
        f"--until={_iso(until)}",
        f"--pretty=format:{fmt}",
        "--all",
    ]
    result = _run_git(args, p)
    if result is None or result.returncode != 0:
        return []

    out: list[dict[str, Any]] = []
    for line in result.stdout.splitlines():
        if not line:
            continue
        parts = line.split(_GIT_LOG_SEP)
        if len(parts) != 5:
            continue
        sha, name, email, ts_str, subject = parts
        try:
            ts_val = float(ts_str)
        except ValueError:
            continue
        out.append(
            {
                "sha": sha,
                "author_name": name,
                "author_email": email,
                "ts": ts_val,
                "subject": subject,
            }
        )
    return out


def is_reachable(project_dir: Path | str, sha: str, branch: str) -> bool:
    """Return True if ``sha`` is an ancestor of ``branch`` (reachable).

    Any git error returns False so the UI degrades to "not on branch".
    """
    if not sha or not branch or not _have_git():
        return False
    p = Path(project_dir)
    if not p.is_dir():
        return False
    res = _run_git(["merge-base", "--is-ancestor", sha, branch], p)
    return bool(res and res.returncode == 0)


def attribute_session(
    db: Any,
    session_id: str,
    project_dir: str | Path,
    started_at: float,
    ended_at: float | None,
) -> list[dict[str, Any]]:
    """Compute commits for a session and persist them. Idempotent.

    Returns the list of commit dicts (may be empty). Storage is
    best-effort; if the DB call raises, we swallow and still return
    the computed list so API callers can show data even if the write
    races another writer.
    """
    if not session_id or not project_dir:
        return []
    commits = commits_in_window(project_dir, started_at, ended_at)
    if not commits:
        return commits
    try:
        db.upsert_session_commits(session_id, commits)
    except Exception as exc:  # noqa: BLE001 — best-effort persistence
        log.warning("persisting session_commits for %s failed: %s", session_id, exc)
    return commits
