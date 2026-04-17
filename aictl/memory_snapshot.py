# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Snapshot Claude Code memory files at session start and end.

The Explorer's Memory panel uses this to show *what the agent learned
this session* — a diff between the two snapshots.

Memory files live at:
  * ``~/.claude/projects/<hash>/memory/*.md`` — per-project learnings
  * ``~/.claude/CLAUDE.md``                    — user-global memory

Snapshots are stored in the ``memory_snapshots`` table (see migration
``m024_memory_snapshots``).
"""

from __future__ import annotations

import difflib
import hashlib
import logging
import sqlite3
import time
from pathlib import Path
from typing import Any

from .platforms import claude_global_dir, claude_project_memory_dir

log = logging.getLogger(__name__)

_MAX_FILE_BYTES = 1024 * 1024  # 1 MiB — skip anything larger
_MAX_DIFF_LINES = 200
_USER_MEMORY_REL = "__user__/CLAUDE.md"  # virtual path for the global file


def _iter_memory_files(project_hash: str | None) -> list[tuple[str, Path]]:
    """Return ``[(relpath, absolute_path)]`` of memory files to snapshot.

    Relative paths are stable keys used to join the two snapshot phases.
    Files over :data:`_MAX_FILE_BYTES` are omitted.
    """
    out: list[tuple[str, Path]] = []

    # Per-project memory/*.md
    if project_hash:
        mem_dir = claude_project_memory_dir(project_hash)
        if mem_dir.is_dir():
            try:
                for md in sorted(mem_dir.rglob("*.md")):
                    try:
                        if md.is_file() and md.stat().st_size <= _MAX_FILE_BYTES:
                            rel = str(md.relative_to(mem_dir)).replace("\\", "/")
                            out.append((rel, md))
                    except OSError:
                        continue
            except OSError:
                pass

    # User-global CLAUDE.md
    user_md = claude_global_dir() / "CLAUDE.md"
    try:
        if user_md.is_file() and user_md.stat().st_size <= _MAX_FILE_BYTES:
            out.append((_USER_MEMORY_REL, user_md))
    except OSError:
        pass

    return out


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()


def snapshot_claude_memory(
    session_id: str, project_hash: str | None
) -> dict[str, str]:
    """Return ``{relpath: sha256}`` for every memory file on disk right now.

    Pure function — no DB writes. ``session_id`` is accepted for API
    symmetry but only used by callers that persist the snapshot.
    """
    _ = session_id  # reserved for future per-session scoping
    result: dict[str, str] = {}
    for rel, abs_path in _iter_memory_files(project_hash):
        result[rel] = _sha256(_read_text(abs_path))
    return result


def record_snapshot(
    conn: sqlite3.Connection,
    session_id: str,
    project_hash: str | None,
    phase: str,
    ts: float | None = None,
) -> int:
    """Read all memory files and write rows to ``memory_snapshots``.

    Returns the number of files snapshotted. Best-effort: swallows any
    per-file IO error but raises on DB failure so the caller can log.
    """
    if phase not in ("start", "end"):
        raise ValueError(f"phase must be 'start' or 'end', got {phase!r}")
    now = ts if ts is not None else time.time()
    rows = []
    for rel, abs_path in _iter_memory_files(project_hash):
        content = _read_text(abs_path)
        rows.append((session_id, phase, rel, _sha256(content), content, now))
    conn.executemany(
        "INSERT OR REPLACE INTO memory_snapshots "
        "(session_id, phase, path, sha, content, ts) VALUES (?,?,?,?,?,?)",
        rows,
    )
    conn.commit()
    return len(rows)


def load_snapshot(
    conn: sqlite3.Connection, session_id: str, phase: str
) -> tuple[dict[str, str], dict[str, str]]:
    """Return ``(shas, contents)`` dicts for one phase of a session."""
    try:
        cur = conn.execute(
            "SELECT path, sha, content FROM memory_snapshots "
            "WHERE session_id=? AND phase=?",
            (session_id, phase),
        )
    except sqlite3.OperationalError:
        return {}, {}
    shas: dict[str, str] = {}
    contents: dict[str, str] = {}
    for path, sha, content in cur.fetchall():
        shas[path] = sha
        contents[path] = content
    return shas, contents


def _unified_diff(path: str, before: str, after: str) -> tuple[str, int, int]:
    """Return (capped unified diff, added_lines, removed_lines)."""
    a = before.splitlines(keepends=True)
    b = after.splitlines(keepends=True)
    # Use generator and consume up to a cap so huge files don't explode.
    gen = difflib.unified_diff(a, b, fromfile=f"a/{path}", tofile=f"b/{path}", n=3)
    lines: list[str] = []
    added = removed = 0
    truncated = False
    for i, line in enumerate(gen):
        if i >= _MAX_DIFF_LINES:
            truncated = True
            break
        lines.append(line)
        if line.startswith("+") and not line.startswith("+++"):
            added += 1
        elif line.startswith("-") and not line.startswith("---"):
            removed += 1
    if truncated:
        lines.append(f"... [diff truncated at {_MAX_DIFF_LINES} lines] ...\n")
    return "".join(lines), added, removed


def diff_snapshots(
    start: dict[str, str],
    end: dict[str, str],
    start_contents: dict[str, str],
    end_contents: dict[str, str],
) -> list[dict[str, Any]]:
    """Compare two snapshots; return per-file change records.

    Each entry: ``{path, change, added_lines, removed_lines, unified_diff}``.
    """
    entries: list[dict[str, Any]] = []
    paths = sorted(set(start) | set(end))
    for path in paths:
        in_start = path in start
        in_end = path in end
        if in_start and in_end:
            if start[path] == end[path]:
                continue
            change = "modified"
        elif in_end:
            change = "added"
        else:
            change = "removed"
        before = start_contents.get(path, "")
        after = end_contents.get(path, "")
        diff_text, added, removed = _unified_diff(path, before, after)
        entries.append(
            {
                "path": path,
                "change": change,
                "added_lines": added,
                "removed_lines": removed,
                "unified_diff": diff_text,
            }
        )
    return entries


def build_session_memory_diff(
    conn: sqlite3.Connection, session_id: str
) -> dict[str, Any]:
    """Return the API-shaped diff payload for one session.

    Both the 'start' and 'end' phases must be present to compute a
    meaningful diff. If either is missing we return an empty result —
    the UI uses this to render an empty state rather than treating the
    absence as "everything was deleted" (or added).
    """
    start_shas, start_contents = load_snapshot(conn, session_id, "start")
    end_shas, end_contents = load_snapshot(conn, session_id, "end")
    if not start_shas or not end_shas:
        return {"files": [], "summary": {"added": 0, "modified": 0, "removed": 0}}
    files = diff_snapshots(start_shas, end_shas, start_contents, end_contents)
    summary = {
        "added": sum(1 for f in files if f["change"] == "added"),
        "modified": sum(1 for f in files if f["change"] == "modified"),
        "removed": sum(1 for f in files if f["change"] == "removed"),
    }
    return {"files": files, "summary": summary}


__all__ = [
    "snapshot_claude_memory",
    "diff_snapshots",
    "record_snapshot",
    "load_snapshot",
    "build_session_memory_diff",
]
