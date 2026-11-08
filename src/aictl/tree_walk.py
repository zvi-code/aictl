# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""One listing of the folders under a root, shared by every discovery walk.

Discovery looks for tool files (``AGENTS.md``, ``.github/copilot-instructions.md``,
``.vscode/mcp.json``, ``.context.toml`` ...) under the folder aictl started in. That
folder can hold many projects. The listing:

- takes the projects of active sessions first, then the rest;
- inside a git repository, visits only the folders git does not ignore, so build output,
  dependencies and temp folders are skipped by the repository's own ``.gitignore``;
- still visits the tool folders that are often ignored on purpose (``.vscode``,
  ``.claude`` ...) and lists the files of ignored hidden folders one level deep;
- outside git, walks with one skip list (:data:`PRUNE_DIRS`);
- gives each repository its own folder budget, so one large repository cannot use up
  the scan of the others.

The walk of active projects repeats on every discovery while it stays fast. The walk of
the other projects repeats at most every :data:`REST_MIN_INTERVAL_S`.
"""

from __future__ import annotations

import logging
import os
import subprocess
import threading
import time
from collections.abc import Iterable
from pathlib import Path

from .fsutil import MAX_SCAN_DIRS, warn_once
from .platforms import IS_WINDOWS

log = logging.getLogger(__name__)

# Folders no discovery enters: dependencies, build output, caches. One list for every walk.
PRUNE_DIRS = frozenset(
    {
        ".git",
        ".hg",
        ".svn",
        ".venv",
        "venv",
        ".env",
        "node_modules",
        "bower_components",
        ".npm",
        ".yarn",
        ".pnpm-store",
        "__pycache__",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".tox",
        ".eggs",
        "htmlcov",
        "coverage",
        "dist",
        "build",
        "out",
        "bin",
        "obj",
        "TestResults",
        ".cargo",
        "target",
        ".gradle",
        ".next",
        ".nuxt",
        ".turbo",
        ".parcel-cache",
        ".angular",
        ".terraform",
        ".idea",
        ".vs",
        "Pods",
        "DerivedData",
    }
)

# Tool folders that a repository often ignores on purpose and that discovery must still read.
TOOL_DIRS = frozenset(
    {
        ".github",
        ".vscode",
        ".copilot",
        ".claude",
        ".cursor",
        ".windsurf",
        ".codex",
        ".gemini",
        ".junie",
        ".opencode",
        ".continue",
        ".ai-deployed",
    }
)

REPO_MAX_DIRS = 20_000  # folders of one repository
# Outside a repository the walk looks for repositories and config near the top only: below this
# depth such a tree is data (tool state, test output), not a project. Active projects are walked
# whatever their depth.
OUTSIDE_GIT_DEPTH = 4
GIT_TIMEOUT_S = 30.0
REST_MIN_INTERVAL_S = 300.0  # the projects nobody works in now are walked again at most this often
ACTIVE_SLOW_S = 1.0  # an active walk slower than this is reused for 20 times its duration
_NO_WINDOW = 0x08000000 if IS_WINDOWS else 0  # no console window flashes on Windows

Entry = tuple[Path, list[str], list[str]]  # folder, its child folders (pruned), its files

_lock = threading.Lock()
_active: tuple[str, ...] = ()
_cache: dict[tuple, tuple[float, float, object, object]] = {}  # key -> (computed_at, took_s, stamp, value)


def note_active_projects(paths: Iterable[str]) -> None:
    """Folders where sessions run now. The next listing takes their repositories first."""
    global _active
    clean = tuple(sorted({os.path.normpath(p) for p in paths if p and os.path.isabs(p)}))
    with _lock:
        _active = clean


def active_projects() -> tuple[str, ...]:
    with _lock:
        return _active


def _scan(folder: Path) -> tuple[list[str], list[str]]:
    dirs: list[str] = []
    files: list[str] = []
    try:
        with os.scandir(folder) as it:
            for e in it:
                try:
                    if e.is_dir(follow_symlinks=False):
                        dirs.append(e.name)
                    elif e.is_file():
                        files.append(e.name)
                except OSError:
                    continue
    except OSError as exc:
        log.debug("tree_walk scandir %s: %s", folder, exc)
    dirs.sort()
    files.sort()
    return dirs, files


def git_root(folder: str | Path) -> Path | None:
    """The repository that holds *folder*: a worktree or submodule maps to its main repository."""
    p = Path(folder)
    while not p.exists() and p.parent != p:
        p = p.parent
    for d in (p, *p.parents):
        g = d / ".git"
        if g.is_dir():
            return d
        if g.is_file():
            try:
                text = g.read_text(encoding="utf-8", errors="replace").strip()
                gitdir = Path(text.split(":", 1)[1].strip())
                if not gitdir.is_absolute():
                    gitdir = (d / gitdir).resolve()
                common = gitdir / "commondir"
                if common.is_file():
                    gitdir = (gitdir / common.read_text(encoding="utf-8").strip()).resolve()
                return gitdir.parent if gitdir.name == ".git" else d
            except (OSError, IndexError):
                return d
    return None


def _git_kept(repo: Path) -> tuple[set[str], list[str]] | None:
    """Folders (relative, "" for the root) that hold files git does not ignore, and nested repositories."""
    try:
        done = subprocess.run(
            ["git", "-C", str(repo), "ls-files", "-co", "--exclude-standard", "-z"],
            capture_output=True,
            timeout=GIT_TIMEOUT_S,
            check=False,
            creationflags=_NO_WINDOW,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        log.debug("git ls-files %s: %s", repo, exc)
        return None
    if done.returncode != 0:
        log.debug("git ls-files %s exited %s", repo, done.returncode)
        return None
    kept: set[str] = {""}
    nested: list[str] = []
    for raw in done.stdout.split(b"\0"):
        if not raw:
            continue
        rel = raw.decode("utf-8", "replace")
        if rel.endswith("/"):  # an untracked folder git shows whole: another repository inside this one
            nested.append(rel.rstrip("/"))
            rel = rel.rstrip("/") + "/x"
        parent = os.path.dirname(rel)
        while parent and parent not in kept:
            kept.add(parent)
            parent = os.path.dirname(parent)
    return kept, nested


class _Walk:
    def __init__(self, total: int) -> None:
        self.left = total
        self.entries: list[Entry] = []
        self.seen_repos: set[str] = set()
        self.capped: list[Path] = []

    def emit(self, folder: Path, dirs: list[str], files: list[str]) -> bool:
        if self.left <= 0:
            return False
        self.left -= 1
        self.entries.append((folder, [d for d in dirs if d not in PRUNE_DIRS], files))
        return True

    def plain(self, start: Path, *, repos: bool, skip: frozenset[str] = frozenset(), budget: int | None = None) -> None:
        """Walk with the skip list. With *repos*, a repository found on the way is walked through git."""
        stack = [(start, 0)]
        used = 0
        while stack and self.left > 0:
            folder, depth = stack.pop()
            if folder != start and (folder / ".git").exists():
                # Another repository, or a worktree copy such as .claude/worktrees/x: walked through
                # git when the walk looks for repositories, and never as part of a tool folder.
                if repos:
                    self.repo(folder)
                continue
            dirs, files = _scan(folder)
            if not self.emit(folder, dirs, files):
                break
            used += 1
            if budget is not None and used >= budget:
                self.capped.append(start)
                break
            for d in reversed(dirs):
                if d in PRUNE_DIRS or str(folder / d) in skip:
                    continue
                if repos and d.startswith(".") and d not in TOOL_DIRS:
                    # An unknown hidden folder outside git: its own files, one level.
                    _sub_dirs, sub_files = _scan(folder / d)
                    self.emit(folder / d, [], sub_files)
                elif not repos or depth + 1 <= OUTSIDE_GIT_DEPTH or (folder / d / ".git").exists():
                    stack.append((folder / d, depth + 1))

    def repo(self, root: Path) -> None:
        key = os.path.normcase(str(root))
        if key in self.seen_repos:
            return
        self.seen_repos.add(key)
        listed = _git_kept(root)
        if listed is None:  # no git, or git refused the folder: the skip list decides
            self.plain(root, repos=False, budget=REPO_MAX_DIRS)
            return
        kept, nested = listed
        used = 0
        stack = [""]
        while stack and self.left > 0:
            rel = stack.pop()
            folder = root / rel if rel else root
            dirs, files = _scan(folder)
            if not self.emit(folder, dirs, files):
                return
            used += 1
            if used >= REPO_MAX_DIRS:
                self.capped.append(root)
                return
            for d in reversed(dirs):
                if d in PRUNE_DIRS:
                    continue
                child = f"{rel}/{d}" if rel else d
                if child in nested or (child not in kept and (folder / d / ".git").exists()):
                    # Another repository inside this one, or a submodule, which git lists as one entry.
                    self.repo(folder / d)
                elif child in kept:
                    stack.append(child)
                elif d in TOOL_DIRS:
                    self.plain(folder / d, repos=False, budget=REPO_MAX_DIRS)
                elif d.startswith("."):
                    # An ignored hidden folder: its own files, one level, for the hidden-config list.
                    _sub_dirs, sub_files = _scan(folder / d)
                    self.emit(folder / d, [], sub_files)


def _under(path: str, root: str) -> bool:
    a, b = os.path.normcase(path), os.path.normcase(root)
    return a == b or a.startswith(b.rstrip("\\/") + os.sep)


def _active_repos(root: Path) -> list[Path]:
    """Repositories of active sessions inside *root*, or *root*'s own repository when a session works in it."""
    out: list[Path] = []
    seen: set[str] = set()
    for folder in active_projects():
        if not (_under(folder, str(root)) or _under(str(root), folder)):
            continue
        repo = git_root(folder)
        if repo is None:
            continue
        if _under(str(root), str(repo)):
            repo = root  # the start folder lies inside this repository: only its part is read
        elif not _under(str(repo), str(root)):
            continue
        key = os.path.normcase(str(repo))
        if key not in seen:
            seen.add(key)
            out.append(repo)
    return out


def _walk_active(root: Path) -> tuple[list[Entry], set[str]]:
    w = _Walk(MAX_SCAN_DIRS)
    for repo in _active_repos(root):
        w.repo(repo)
    return w.entries, w.seen_repos


def _walk_rest(root: Path, done_repos: set[str]) -> list[Entry]:
    w = _Walk(MAX_SCAN_DIRS)
    w.seen_repos |= done_repos
    if git_root(root) is not None:
        w.repo(root)  # git lists paths relative to the folder it runs in, so a subfolder works too
    else:
        w.plain(root, repos=True)
    if w.left <= 0:
        warn_once(log, "%s has more than %d folders, so aictl scans only part of it. To scan one project, start aictl in that project or use --root.", root, MAX_SCAN_DIRS)
    for repo in w.capped:
        warn_once(log, "%s has more than %d folders git does not ignore, so aictl scans only part of it.", repo, REPO_MAX_DIRS)
    return w.entries


def _cached(key: tuple, stamp: object, min_interval: float, build):
    """Reuse a walk while *stamp* is unchanged and the walk is younger than its pause.

    A slow walk pauses 20 times its own duration, so walking stays near 5% of one core.
    """
    now = time.monotonic()
    with _lock:
        hit = _cache.get(key)
    if hit is not None:
        computed, took, old_stamp, value = hit
        # A fast walk repeats every time, so a normal project always shows current files.
        wait = max(min_interval, took * 20) if took >= ACTIVE_SLOW_S else 0.0
        if old_stamp == stamp and now - computed < wait:
            return value
    started = time.monotonic()
    value = build()
    with _lock:
        _cache[key] = (started, time.monotonic() - started, stamp, value)
    return value


def listing(root: Path) -> list[Entry]:
    """Every folder discovery reads under *root*: active projects first, then the rest, each folder once."""
    root = Path(os.path.normpath(str(root)))
    active = active_projects()
    act, _done = _cached(("active", str(root)), active, 0.0, lambda: _walk_active(root))
    rest = _cached(("rest", str(root)), None, REST_MIN_INTERVAL_S, lambda: _walk_rest(root, set()))
    if not act:
        return list(rest)
    seen = {str(e[0]) for e in act}
    return list(act) + [e for e in rest if str(e[0]) not in seen]


def clear_cache() -> None:
    with _lock:
        _cache.clear()
