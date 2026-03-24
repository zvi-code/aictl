"""Memory: stash/restore Claude Code auto-memory per (root, profile).

Memory is keyed to BOTH root directory and profile. Working from
my-project/ with debug has different memory than my-project/services/ingestion/
with debug.

Claude Code stores: ~/.claude/projects/<encoded-path>/memory/
aictl only renames directories. Never reads/writes memory content.
"""

from __future__ import annotations

import hashlib
import os
import platform
import re
from pathlib import Path, PurePosixPath


def _memory_key(root: Path, profile: str | None) -> str:
    """Stable key for a (root, profile) pair."""
    root_hash = hashlib.sha256(str(root.resolve()).encode()).hexdigest()[:12]
    return f"{root.name}-{root_hash}" + (f"--{profile}" if profile else "--none")


def _encode_project_path(resolved: str) -> str:
    """Encode a resolved path the way Claude Code does: separators → dashes.

    Examples:
      /Users/zvi/Projects/aictl     → -Users-zvi-Projects-aictl
      C:\\Users\\zvi\\Projects\\aictl  → C--Users-zvi-Projects-aictl  (Windows)

    The encoding replaces all path separators (``/``, ``\\``) with dashes.
    On Windows, drive letters produce ``C:`` which we also normalise.
    """
    # Normalise both forward and back slashes to dashes
    encoded = re.sub(r"[/\\]+", "-", resolved)
    # On Windows the colon after drive letter (C:) isn't a separator but
    # Claude Code's encoding turns C:\\ into C-- (colon consumed by \\).
    # Handle the case where we get C:- by replacing :- with --
    encoded = re.sub(r"^([A-Za-z]):-", r"\1--", encoded)
    return encoded


def _find_project_dir(root: Path) -> Path | None:
    """Find the Claude Code project directory for a given repo root.

    Claude Code stores per-project data at:
        ~/.claude/projects/<encoded-path>/

    The encoding is the fully-resolved absolute path with path separators
    replaced by dashes.  However different OS, Claude Code versions, and
    edge cases (symlinks, Windows UNC paths, trailing slashes) mean we
    can't rely on a single encoding.  Instead we try multiple strategies
    in order of specificity:

      1. Exact match on the canonical encoding
      2. Case-insensitive match (macOS HFS+/APFS are case-insensitive)
      3. Match on all path segments as dash-separated substrings
      4. Match with trailing project name on a dash boundary
      5. Look inside each candidate for a ``memory/`` dir (structural match)

    The first strategy that finds a unique directory wins.  If multiple
    candidates match we prefer the longest name (most specific path).
    """
    from .platforms import claude_projects_dir
    projects = claude_projects_dir()
    if not projects.is_dir():
        return None

    resolved = str(root.resolve())
    project_name = root.resolve().name

    # ── Strategy 1: Exact encoding match ─────────────────────────
    expected = _encode_project_path(resolved)
    exact = projects / expected
    if exact.is_dir():
        return exact

    # Also try without the leading dash (some versions may strip it)
    if expected.startswith("-"):
        alt = projects / expected.lstrip("-")
        if alt.is_dir():
            return alt

    # ── Enumerate all candidate directories once ─────────────────
    try:
        candidates = sorted(
            (e for e in projects.iterdir() if e.is_dir()),
            key=lambda e: len(e.name),
            reverse=True,  # prefer longest (most specific) first
        )
    except OSError:
        return None

    if not candidates:
        return None

    # ── Strategy 2: Case-insensitive exact match ─────────────────
    expected_lower = expected.lower()
    for entry in candidates:
        if entry.name.lower() == expected_lower:
            return entry
        # Also try without leading dash
        if expected_lower.startswith("-") and entry.name.lower() == expected_lower[1:]:
            return entry

    # ── Strategy 3: All path segments present as substrings ──────
    # Break the resolved path into meaningful segments and check if
    # they all appear in the directory name (order-preserving).
    segments = [s for s in re.split(r"[/\\]+", resolved) if s]
    if segments:
        for entry in candidates:
            name_lower = entry.name.lower()
            # Check all segments appear in order
            pos = 0
            matched_all = True
            for seg in segments:
                idx = name_lower.find(seg.lower(), pos)
                if idx == -1:
                    matched_all = False
                    break
                pos = idx + len(seg)
            if matched_all:
                return entry

    # ── Strategy 4: Ends with project name on a dash boundary ────
    # Catches cases where the encoding is different but the project
    # folder name is unambiguously at the end.
    matches = []
    for entry in candidates:
        ename = entry.name
        if ename == project_name or ename.endswith(f"-{project_name}"):
            matches.append(entry)
        # Case-insensitive variant
        elif ename.lower() == project_name.lower() or \
                ename.lower().endswith(f"-{project_name.lower()}"):
            matches.append(entry)

    if len(matches) == 1:
        return matches[0]

    if len(matches) > 1:
        # Multiple matches on name alone — try to disambiguate by
        # checking which one has a memory/ directory (active project).
        with_memory = [m for m in matches if (m / "memory").is_dir()]
        if len(with_memory) == 1:
            return with_memory[0]
        # Still ambiguous — return longest (most path segments encoded).
        return matches[0]  # already sorted longest-first

    # ── Strategy 5: Structural match — any dir with memory/ ──────
    # Last resort: if the project name is common (e.g. "app") and
    # none of the above matched, look for directories that at least
    # contain the project name and have a memory/ subdirectory.
    for entry in candidates:
        if project_name.lower() in entry.name.lower() and (entry / "memory").is_dir():
            return entry

    return None


def swap_memory(root: Path, old_profile: str | None, new_profile: str | None) -> dict | None:
    """Swap memory for profile change at given root."""
    proj = _find_project_dir(root)
    if not proj:
        return None

    mem = proj / "memory"
    result = {"stashed": None, "restored": None, "created": False}

    # Stash current
    if old_profile and mem.is_dir():
        stash = proj / f"memory--{old_profile}"
        if stash.exists():
            import time
            stash.rename(proj / f"memory--{old_profile}.bak.{int(time.time())}")
        mem.rename(stash)
        result["stashed"] = old_profile

    # Restore new
    if new_profile:
        restore = proj / f"memory--{new_profile}"
        if restore.is_dir():
            if mem.is_dir():
                import time
                mem.rename(proj / f"memory--_unstashed.{int(time.time())}")
            restore.rename(mem)
            result["restored"] = new_profile
        elif not mem.is_dir():
            mem.mkdir(parents=True)
            result["created"] = True

    return result


def list_stashes(root: Path) -> list[dict]:
    proj = _find_project_dir(root)
    if not proj:
        return []
    out = []
    mem = proj / "memory"
    if mem.is_dir():
        out.append(_summarize(mem, "(active)"))
    for e in sorted(proj.iterdir()):
        if e.name.startswith("memory--") and ".bak." not in e.name and e.is_dir():
            out.append(_summarize(e, e.name.replace("memory--", "")))
    return out


def get_summary(root: Path) -> dict | None:
    proj = _find_project_dir(root)
    if not proj:
        return None
    mem = proj / "memory"
    if not mem.is_dir():
        return None
    files = []
    for f in sorted(mem.iterdir()):
        if f.suffix == ".md":
            c = f.read_text(errors="replace")
            files.append({"file": f.name, "lines": len([l for l in c.splitlines() if l.strip()]),
                          "tokens": -(-len(c) // 4), "content": c})
    return {"dir": str(mem), "files": files, "total_tokens": sum(f["tokens"] for f in files)} if files else None


def _summarize(d: Path, label: str) -> dict:
    mds = [f for f in d.iterdir() if f.suffix == ".md"] if d.is_dir() else []
    lines = sum(len([l for l in f.read_text(errors="replace").splitlines() if l.strip()]) for f in mds)
    return {"profile": label, "dir": str(d), "files": len(mds), "lines": lines}
