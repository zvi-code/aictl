# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Cross-platform filesystem utilities.

Centralised helpers for safe directory traversal, glob matching, and
path handling.  All public functions:

* normalise separators to ``/`` (via :func:`norm_path`)
* tolerate vanishing files/dirs (TOCTOU races during scan)
* handle whitespace and special characters in names
* skip permission-denied subtrees instead of crashing

Import from here rather than calling ``os.walk``, ``Path.iterdir``,
or ``Path.glob`` directly in scanning / discovery code.
"""

from __future__ import annotations

import glob as _glob_mod
import logging
import os
from pathlib import Path
from collections.abc import Generator, Iterable

from .utils import norm_path  # re-export so callers get everything from one place

__all__ = [
    "norm_path",
    "safe_iterdir",
    "safe_glob",
    "safe_rglob",
    "safe_walk",
    "safe_stat",
    "path_basename",
]

_log = logging.getLogger(__name__)


# ── Safe directory listing ────────────────────────────────────────

def safe_iterdir(path: Path, *, sort: bool = True) -> list[Path]:
    """List directory contents, returning [] on any OS error.

    Handles permission-denied, deleted-during-scan, and encoding issues
    gracefully.  Results are sorted by name by default.
    """
    try:
        items = list(path.iterdir())
        return sorted(items) if sort else items
    except OSError as exc:
        _log.debug("safe_iterdir %s: %s", path, exc)
        return []


# ── Safe glob / rglob ────────────────────────────────────────────

def safe_glob(
    base: Path,
    pattern: str,
    *,
    sort: bool = True,
) -> list[Path]:
    """Glob *pattern* under *base*, escaping special chars in *base*.

    Uses :func:`glob.escape` on the base path so that directory names
    containing ``[``, ``]``, ``*``, ``?`` are treated literally.
    Returns ``[]`` on any OS error.
    """
    try:
        escaped = _glob_mod.escape(str(base))
        full = os.path.join(escaped, pattern)
        results = [Path(p) for p in _glob_mod.glob(full)]
        return sorted(results) if sort else results
    except OSError as exc:
        _log.debug("safe_glob %s/%s: %s", base, pattern, exc)
        return []


def safe_rglob(
    base: Path,
    pattern: str,
    *,
    sort: bool = True,
    max_results: int = 10_000,
) -> list[Path]:
    """Recursive glob with error handling and result-count cap.

    Falls back to an empty list on permission / encoding errors.
    Caps results at *max_results* to avoid runaway scans.
    """
    try:
        results: list[Path] = []
        for p in base.rglob(pattern):
            results.append(p)
            if len(results) >= max_results:
                _log.warning("safe_rglob %s/%s: hit %d cap", base, pattern, max_results)
                break
        return sorted(results) if sort else results
    except OSError as exc:
        _log.debug("safe_rglob %s/%s: %s", base, pattern, exc)
        return []


# ── Safe os.walk wrapper ─────────────────────────────────────────

def safe_walk(
    root: Path,
    *,
    prune_dirs: Iterable[str] = (),
    max_depth: int = 20,
) -> Generator[tuple[Path, list[str], list[str]], None, None]:
    """Walk a directory tree with error handling and depth limit.

    * Skips directories listed in *prune_dirs* (modified in-place).
    * Stops descending past *max_depth* levels.
    * Catches per-directory OS errors instead of aborting the walk.
    * Yields ``(dirpath: Path, dirnames: list[str], filenames: list[str])``.
    """
    prune = set(prune_dirs)
    root_depth = len(root.parts)

    for dirpath_str, dirnames, filenames in os.walk(str(root), onerror=_walk_error):
        dp = Path(dirpath_str)
        depth = len(dp.parts) - root_depth
        if depth >= max_depth:
            dirnames.clear()
            continue
        dirnames[:] = [d for d in dirnames if d not in prune]
        yield dp, dirnames, filenames


def _walk_error(err: OSError) -> None:
    """Callback for os.walk onerror — log and continue."""
    _log.debug("safe_walk error: %s", err)


# ── Safe stat ─────────────────────────────────────────────────────

def safe_stat(path: Path) -> os.stat_result | None:
    """Return stat result or None if the file vanished / is inaccessible."""
    try:
        return path.stat()
    except OSError:
        return None


# ── Basename helper ───────────────────────────────────────────────

def path_basename(path: str) -> str:
    """Extract the filename from a path string, handling both separators."""
    return norm_path(path).rsplit("/", 1)[-1] if path else ""
