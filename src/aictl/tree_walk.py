# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Discovery of tool files in projects, one git repository at a time.

Discovery looks for tool files (``AGENTS.md``, ``.github/copilot-instructions.md``,
``.vscode/mcp.json``, ``.context.toml`` ...) under the folder aictl started in. That folder
can hold many repositories. Discovery:

- starts from the repositories of active sessions: the git root of each session's working
  folder is read first;
- in a repository, asks git only for the known names and folders (pathspecs built from the
  names the consumers ask for) and keeps only the matches. A second git call, run at the same
  time, lists the ignored files that match, so a tool file that ``.gitignore`` lists is found.
  An ignored folder comes back as one entry and git does not read into it: discovery reads an
  ignored tool folder (``.vscode``, ``.claude`` ...) directly, the files of another ignored
  hidden folder one level deep, and skips the rest (dependencies, build output);
- keeps one result per repository with a stat-only signature (the mtimes of ``.git/index``,
  ``.git/HEAD``, the top folder, its tool folders and every folder that held a match). While the
  signature is unchanged, the result is used again and no git process starts. Each repository
  is read again in full at most once every :data:`FULL_REFRESH_S`, at a time spread by its path;
- outside git, walks to :data:`OUTSIDE_GIT_DEPTH` with one skip list (:data:`PRUNE_DIRS`),
  looking only for repositories and the known names;
- in the daemon (:func:`set_lazy`), reads only the active repositories while a consumer waits.
  A background thread reads the other repositories at low priority, one at a time. A consumer
  that asks first gets what is known so far, and :func:`state` says the result is partial;
- when git is missing or cannot list a repository, walks that repository directly, with the
  skip list and a folder limit.

:func:`session_links` maps the git root of each active session to the sessions and to the
matched files each session can be affected by.
"""

from __future__ import annotations

import itertools
import logging
import os
import subprocess
import threading
import time
import zlib
from collections.abc import Iterable, Mapping
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
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

# File types listed one level inside any hidden folder (the hidden-folder scan of tools.py).
HIDDEN_FILE_EXTS = (".json", ".yaml", ".yml", ".md")
BASE_FILES = frozenset({".context.toml"})  # names every discovery looks for

# Outside a repository the walk looks for repositories and tool files near the top only: below
# this depth such a tree is data (tool state, test output), not a project.
OUTSIDE_GIT_DEPTH = 4
OUTSIDE_MAX_DIRS = MAX_SCAN_DIRS  # folders outside git read under one start folder
FALLBACK_MAX_DIRS = 20_000  # folders read directly in one repository git cannot list, or one ignored tool folder
GIT = "git"
GIT_TIMEOUT_S = 30.0
FULL_REFRESH_S = 3600.0  # a repository is read again in full at most this often
MAX_FULL_REFRESH_PER_PASS = 2  # full refreshes one consumer request may do; the others wait
PARALLEL_UNITS = 8  # repositories read at the same time while a consumer waits
BACKGROUND_PAUSE_S = 0.1  # pause of the background thread after each repository
BACKGROUND_IDLE_S = 60.0  # the background thread looks for changed repositories this often
_NO_WINDOW = 0x08000000 if IS_WINDOWS else 0  # no console window flashes on Windows
_BELOW_NORMAL = 0x00004000 if IS_WINDOWS else 0  # BELOW_NORMAL_PRIORITY_CLASS
_GIT_ENV_DROP = ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_PREFIX")

_serials = itertools.count(1)  # each result gets a new number, so a listing can tell that none changed
Entry = tuple[Path, list[str], list[str]]  # folder, its child folders that lead to matches, its matched files
Names = tuple[frozenset[str], frozenset[str]]  # file names, folder names


@dataclass
class _Unit:
    """The matches of one repository, or of the start folder when it lies inside a repository."""

    folder: Path
    top: Path  # the git root (work tree top) that holds *folder*
    names: Names
    files: tuple[str, ...]  # matched files, relative to *folder*, with "/"
    nested: tuple[str, ...]  # repositories inside this one, relative to *folder*
    stamp_paths: tuple[str, ...]
    stamp: tuple
    full_due: float
    capped: bool = False
    dirs: tuple[str, ...] = ()
    serial: int = field(default_factory=lambda: next(_serials))  # folders read directly with a name in the folder names, also when empty


@dataclass
class _Outside:
    """The folders outside git under a start folder: the repositories found and the matched files."""

    root: Path
    names: Names
    files: tuple[Path, ...]
    repos: tuple[Path, ...]
    stamp_paths: tuple[str, ...]
    stamp: tuple
    full_due: float
    capped: bool = False
    dirs: tuple[Path, ...] = ()
    serial: int = field(default_factory=lambda: next(_serials))


@dataclass
class _RootState:
    partial: bool = True
    repositories: int = 0
    pending: int = 0


_lock = threading.RLock()
_files: set[str] = set(BASE_FILES)
_dirs: set[str] = set()
_sessions: dict[str, tuple[str, ...]] = {}  # session id -> its working folders
_units: dict[str, _Unit] = {}
_outside: dict[str, _Outside] = {}
_states: dict[str, _RootState] = {}
_built: dict[str, tuple[tuple, list[Entry]]] = {}  # start folder -> (serials of its results, entries)
_asked: dict[str, Path] = {}  # start folders the background thread serves
_lazy = False
_worker: threading.Thread | None = None
_wake = threading.Event()
_git_missing = False
_now = time.monotonic


# ── Sessions ─────────────────────────────────────────────────────────


def note_active_sessions(sessions: Mapping[str, Iterable[str]]) -> None:
    """The active sessions and agents, each with its working folders. Their repositories are read first."""
    clean: dict[str, tuple[str, ...]] = {}
    for sid, folders in sessions.items():
        kept = tuple(sorted({os.path.normpath(f) for f in folders if f and os.path.isabs(f)}))
        if kept:
            clean[str(sid)] = kept
    with _lock:
        _sessions.clear()
        _sessions.update(clean)


def note_active_projects(paths: Iterable[str]) -> None:
    """Folders where sessions run now, without session ids: each folder counts as one session."""
    note_active_sessions({os.path.normpath(p): [p] for p in paths if p and os.path.isabs(p)})


def active_projects() -> tuple[str, ...]:
    with _lock:
        return tuple(sorted({f for folders in _sessions.values() for f in folders}))


# ── Paths and git ────────────────────────────────────────────────────


def _key(path: str | Path) -> str:
    return os.path.normcase(os.path.normpath(str(path)))


def _under(path: str, root: str) -> bool:
    a, b = _key(path), _key(root)
    return a == b or a.startswith(b.rstrip("\\/") + os.sep)


def git_root(folder: str | Path) -> Path | None:
    """The top of the work tree that holds *folder*: the nearest folder with a ``.git`` folder or file.

    A worktree or a submodule is a work tree of its own, with a ``.git`` file.
    """
    p = Path(os.path.normpath(str(folder)))
    while not p.exists() and p.parent != p:
        p = p.parent
    for d in (p, *p.parents):
        if (d / ".git").exists():
            return d
    return None


def git_dir(top: Path) -> Path | None:
    """The real git folder of a work tree. For a worktree or a submodule, ``.git`` is a file that names it."""
    g = top / ".git"
    if g.is_dir():
        return g
    try:
        text = g.read_text(encoding="utf-8", errors="replace").strip()
    except OSError:
        return None
    if not text.startswith("gitdir:"):
        return None
    d = Path(text.split(":", 1)[1].strip())
    return d if d.is_absolute() else Path(os.path.normpath(str(top / d)))


def _glob_escape(name: str) -> str:
    return "".join("\\" + c if c in "*?[]\\" else c for c in name)


def _pathspecs(names: Names) -> list[str]:
    files, dirs = names
    specs = [f":(glob)**/{_glob_escape(n)}" for n in sorted(files)]
    specs += [f":(glob)**/{_glob_escape(d)}/**" for d in sorted(dirs)]
    specs += [f":(glob)**/.*/*{ext}" for ext in HIDDEN_FILE_EXTS]
    specs.append(":(glob)**/*/")  # a repository inside this one: git shows it as one folder entry
    return specs


def _wanted(rel: str, names: Names) -> bool:
    """True when the relative path *rel* is a file the pathspecs ask for, outside the skip list."""
    parts = rel.split("/")
    folders = parts[:-1]
    if any(p in PRUNE_DIRS for p in folders):
        return False
    files, dirs = names
    if parts[-1] in files or any(p in dirs for p in folders):
        return True
    return bool(folders) and folders[-1].startswith(".") and parts[-1].endswith(HIDDEN_FILE_EXTS)


def _start_git(folder: Path, top: Path, args: list[str], background: bool) -> subprocess.Popen | None:
    global _git_missing
    env = {k: v for k, v in os.environ.items() if k not in _GIT_ENV_DROP}
    env["GIT_CEILING_DIRECTORIES"] = str(top.parent)  # never the repository of a parent folder
    try:
        proc = subprocess.Popen(
            [GIT, "-C", str(folder), *args],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            env=env,
            creationflags=_NO_WINDOW | (_BELOW_NORMAL if background else 0),
        )
    except FileNotFoundError:
        _git_missing = True
        log.info("git is not installed, so aictl reads repositories directly")
        return None
    except OSError as exc:
        log.debug("git %s: %s", folder, exc)
        return None
    if background and not IS_WINDOWS:
        try:
            os.setpriority(os.PRIO_PROCESS, proc.pid, 10)
        except (OSError, AttributeError):
            pass
    return proc


def _finish_git(proc: subprocess.Popen | None) -> bytes | None:
    if proc is None:
        return None
    try:
        out, _err = proc.communicate(timeout=GIT_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        return None
    return out if proc.returncode == 0 else None


def _split(out: bytes) -> list[str]:
    return [raw.decode("utf-8", "replace") for raw in out.split(b"\0") if raw]


def _scandir(folder: Path) -> tuple[list[str], list[str]]:
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


def _join(rel: str, name: str) -> str:
    return f"{rel}/{name}" if rel else name


@dataclass
class _Walked:
    files: list[str] = field(default_factory=list)
    dirs: list[str] = field(default_factory=list)  # folders with a name in the folder names, also when empty
    nested: list[str] = field(default_factory=list)
    capped: bool = False


def _walk_files(folder: Path, start: str, names: Names, budget: int) -> _Walked:
    """Matched files and folders and repositories under *folder*/*start*, read directly. Stops after *budget* folders."""
    w = _Walked()
    stack = [start]
    used = 0
    while stack:
        rel = stack.pop()
        path = folder / rel if rel else folder
        if rel != start and (path / ".git").exists():
            w.nested.append(rel)
            continue
        used += 1
        if used > budget:
            w.capped = True
            return w
        if rel and path.name in names[1]:
            w.dirs.append(rel)
        dirs, names_here = _scandir(path)
        w.files.extend(r for r in (_join(rel, f) for f in names_here) if _wanted(r, names))
        stack.extend(_join(rel, d) for d in reversed(dirs) if d not in PRUNE_DIRS)
    return w


def _named_dirs(rel: str, names: Names) -> list[str]:
    """The folders on the path *rel* (itself included) whose name is in the folder names."""
    parts = rel.split("/")
    return ["/".join(parts[: i + 1]) for i, part in enumerate(parts) if part in names[1]]


def _may_nest(rel: str) -> bool:
    """A repository inside a hidden or tool folder is a copy (a worktree of an agent), not a project."""
    return not any(p.startswith(".") or p in PRUNE_DIRS for p in rel.split("/"))


def _submodules(folder: Path) -> list[str]:
    try:
        text = (folder / ".gitmodules").read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    out = []
    for line in text.splitlines():
        key, _, value = line.strip().partition("=")
        if key.strip() == "path" and value.strip():
            out.append(value.strip().replace("\\", "/"))
    return out


def _stamp(paths: Iterable[str]) -> tuple:
    out = []
    for p in paths:
        try:
            st = os.stat(p)
            out.append((st.st_mtime_ns, st.st_size))
        except OSError:
            out.append(None)
    return tuple(out)


def _first_due(key: str, now: float) -> float:
    """The first full refresh comes one to two hours after the first read, spread by the path."""
    return now + FULL_REFRESH_S * (1.0 + (zlib.crc32(key.encode()) % 1000) / 1000.0)


# ── One repository ───────────────────────────────────────────────────


def _scan_unit(folder: Path, names: Names, background: bool, old: _Unit | None) -> _Unit:
    top = git_root(folder) or folder
    files: set[str] = set()
    dirs: set[str] = set()
    nested: set[str] = set()
    extra_stamps: list[str] = []
    capped = False
    listed = ignored = None
    if not _git_missing:
        specs = _pathspecs(names)
        a = _start_git(folder, top, ["ls-files", "-z", "-c", "-o", "--exclude-standard", "--", *specs], background)
        b = None
        if a is not None:
            b = _start_git(folder, top, ["ls-files", "-z", "-o", "-i", "--exclude-standard", "--directory", "--", *specs], background)
        listed, ignored = _finish_git(a), _finish_git(b)
    if listed is None or ignored is None:
        # No git, or git cannot list this folder: read it directly with the skip list.
        w = _walk_files(folder, "", names, FALLBACK_MAX_DIRS)
        files.update(w.files)
        dirs.update(w.dirs)
        nested.update(r for r in w.nested if _may_nest(r))
        capped = w.capped
        if capped:
            warn_once(log, "git could not list %s, so aictl read its folders directly and stopped after %d folders. The folders after that point were not read.", folder, FALLBACK_MAX_DIRS)
    else:
        for rel in _split(listed):
            if rel.endswith("/"):
                dirs.update(_named_dirs(rel.rstrip("/"), names))
                if _may_nest(rel.rstrip("/")):
                    nested.add(rel.rstrip("/"))
            elif _wanted(rel, names):
                files.add(rel)
        for rel in _split(ignored):
            if not rel.endswith("/"):
                if _wanted(rel, names):
                    files.add(rel)  # a tool file that .gitignore lists on purpose
                continue
            d = rel.rstrip("/")
            parts = d.split("/")
            if any(p in PRUNE_DIRS for p in parts):
                continue
            dirs.update(_named_dirs(d, names))  # a tool folder that holds only ignored folders is still found
            if (folder / d / ".git").exists():
                if _may_nest(d):
                    nested.add(d)
            elif any(p in TOOL_DIRS or p in names[1] for p in parts):
                w = _walk_files(folder, d, names, FALLBACK_MAX_DIRS)
                files.update(w.files)
                dirs.update(w.dirs)
                extra_stamps.append(str(folder / d))
                if w.capped:
                    warn_once(log, "%s has more than %d folders, so aictl read only part of it.", folder / d, FALLBACK_MAX_DIRS)
            elif parts[-1].startswith("."):
                _sub, sub_files = _scandir(folder / d)  # an ignored hidden folder: its own files, one level
                files.update(r for r in (_join(d, f) for f in sub_files) if _wanted(r, names))
                extra_stamps.append(str(folder / d))
        if _key(folder) == _key(top):
            nested.update(s for s in _submodules(folder) if _may_nest(s) and (folder / s / ".git").exists())
    gitdir = git_dir(top)
    paths = [str(folder), str(folder / ".gitignore"), str(folder / ".gitmodules")]
    if gitdir is not None:
        paths += [str(gitdir / "index"), str(gitdir / "HEAD"), str(gitdir / "info" / "exclude")]
    paths += [str(folder / d) for d in sorted(TOOL_DIRS | names[1])]
    paths += extra_stamps
    seen = set(paths)
    for rel in sorted(files):
        parent = str((folder / rel).parent)
        if parent not in seen:
            seen.add(parent)
            paths.append(parent)
    now = _now()
    key = _key(folder)
    due = _first_due(key, now) if old is None else now + FULL_REFRESH_S
    return _Unit(folder, top, names, tuple(sorted(files)), tuple(sorted(nested)), tuple(paths), _stamp(paths), due, capped, tuple(sorted(dirs)))


def _walk_outside(root: Path, names: Names, old: _Outside | None) -> _Outside:
    """Folders under *root* outside git: the repositories in them and the matched files, near the top only."""
    files: list[Path] = []
    found_dirs: list[Path] = []
    repos: list[Path] = []
    visited: list[str] = []
    capped = False
    stack = [(root, 0)]
    while stack:
        folder, depth = stack.pop()
        if folder != root and (folder / ".git").exists():
            repos.append(folder)
            continue
        if len(visited) >= OUTSIDE_MAX_DIRS:
            capped = True
            break
        visited.append(str(folder))
        dirs, names_here = _scandir(folder)
        rel = "" if folder == root else folder.relative_to(root).as_posix()
        files.extend(folder / f for f in names_here if _wanted(_join(rel, f), names))
        for d in reversed(dirs):
            if d in PRUNE_DIRS:
                continue
            child = folder / d
            if d in names[1]:
                found_dirs.append(child)
            if d.startswith(".") and d not in TOOL_DIRS:
                # An unknown hidden folder outside git: its own files, one level.
                visited.append(str(child))
                _sub, sub_files = _scandir(child)
                files.extend(child / f for f in sub_files if _wanted(_join(_join(rel, d), f), names))
            elif depth + 1 <= OUTSIDE_GIT_DEPTH or (child / ".git").exists():
                stack.append((child, depth + 1))
    now = _now()
    due = _first_due(_key(root), now) if old is None else now + FULL_REFRESH_S
    return _Outside(root, names, tuple(files), tuple(repos), tuple(visited), _stamp(visited), due, capped, tuple(found_dirs))


def _status(rec: _Unit | _Outside | None, names: Names, now: float) -> str:
    if rec is None:
        return "missing"
    if not (names[0] <= rec.names[0] and names[1] <= rec.names[1]) or _stamp(rec.stamp_paths) != rec.stamp:
        return "changed"
    return "due" if now >= rec.full_due else "ok"


class _Pass:
    """One round of discovery: which results it may read again, and what it left for later."""

    def __init__(self, names: Names, *, scan: bool, background: bool = False, refreshes: int = MAX_FULL_REFRESH_PER_PASS) -> None:
        self.names = names
        self.scan = scan
        self.background = background
        self.refreshes = refreshes
        self.missing = 0  # results not known yet
        self.stale = 0  # results known but changed or due, left for later
        self.scanned = 0
        self._count = threading.Lock()  # units of one wave are read in parallel

    def _may_scan(self, status: str) -> bool:
        if status == "ok":
            return False
        with self._count:
            if not self.scan or (status == "due" and self.refreshes <= 0):
                if status == "missing":
                    self.missing += 1
                else:
                    self.stale += 1
                return False
            if status == "due":
                self.refreshes -= 1
        return True

    def _scanned(self) -> None:
        with self._count:
            self.scanned += 1
        if self.background:
            time.sleep(BACKGROUND_PAUSE_S)

    def check(self, folder: Path) -> tuple[_Unit | None, bool]:
        """The known result of *folder*, and whether this pass reads it again. Stat calls only."""
        with _lock:
            rec = _units.get(_key(folder))
        return rec, self._may_scan(_status(rec, self.names, _now()))

    def read(self, folder: Path, old: _Unit | None) -> _Unit:
        rec = _scan_unit(folder, self.names, self.background, old)
        with _lock:
            _units[_key(folder)] = rec
        self._scanned()
        return rec

    def unit(self, folder: Path) -> _Unit | None:
        rec, scan = self.check(folder)
        return self.read(folder, rec) if scan else rec

    def outside(self, root: Path) -> _Outside | None:
        key = _key(root)
        with _lock:
            rec = _outside.get(key)
        status = _status(rec, self.names, _now())
        # The walk outside git starts no process, so its hourly refresh does not use up the budget.
        if not self._may_scan("changed" if status == "due" else status):
            return rec
        rec = _walk_outside(root, self.names, rec)
        with _lock:
            _outside[key] = rec
        self._scanned()
        return rec


# ── Start folder ─────────────────────────────────────────────────────


def _names(files: Iterable[str], dirs: Iterable[str]) -> Names:
    with _lock:
        _files.update(files)
        _dirs.update(dirs)
        return frozenset(_files), frozenset(_dirs)


def _own_unit(root: Path) -> Path | None:
    """The unit for a start folder inside a repository: the repository itself, or only the start folder's part."""
    top = git_root(root)
    if top is None:
        return None
    return top if _key(top) == _key(root) else root


def _active_units(root: Path) -> list[Path]:
    """Repositories of active sessions under *root*, or *root*'s own part when a session works in it."""
    out: list[Path] = []
    seen: set[str] = set()
    for folder in active_projects():
        if not (_under(folder, str(root)) or _under(str(root), folder)):
            continue
        top = git_root(folder)
        if top is None:
            continue
        if _under(str(root), str(top)):
            unit = _own_unit(root)
        elif _under(str(top), str(root)):
            unit = top
        else:
            continue
        if unit is not None and _key(unit) not in seen:
            seen.add(_key(unit))
            out.append(unit)
    return out


def _gather(root: Path, first: list[Path], p: _Pass, done: set[str]) -> tuple[list[_Unit], _Outside | None, bool]:
    """Units under *root*: *first*, then the repositories found under root, then the ones inside them."""
    own = _own_unit(root)
    outside = None
    known = True
    queue = list(first)
    if own is not None:
        queue.append(own)
    else:
        outside = p.outside(root)
        if outside is None:
            known = False
        else:
            queue.extend(outside.repos)
    units: list[_Unit] = []
    while queue:
        wave = []
        for folder in queue:
            if _key(folder) not in done:
                done.add(_key(folder))
                wave.append(folder)
        checked = [p.check(f) for f in wave]
        todo = [i for i, (_rec, scan) in enumerate(checked) if scan]
        found = [rec for rec, _scan in checked]
        if p.background or len(todo) < 2:
            for i in todo:  # the background thread reads one repository at a time
                found[i] = p.read(wave[i], checked[i][0])
        else:
            with ThreadPoolExecutor(max_workers=PARALLEL_UNITS, thread_name_prefix="aictl-discovery") as pool:
                for i, rec in zip(todo, pool.map(p.read, [wave[i] for i in todo], [checked[i][0] for i in todo])):
                    found[i] = rec
        queue = []
        for u in found:
            if u is not None:
                units.append(u)
                queue.extend(u.folder / Path(*n.split("/")) for n in u.nested)
    return units, outside, known


Source = tuple[Path, list[Path], list[Path]]  # top, matched files, matched folders


def _source(u: _Unit) -> Source:
    def full(rel: str) -> Path:
        return u.folder / Path(*rel.split("/"))

    return u.folder, [full(r) for r in u.files], [full(r) for r in u.dirs]


def _entries(sources: list[Source], root: Path) -> list[Entry]:
    """Folders that lead to the matched files and folders, from each source's top down, each folder once."""
    folders: dict[Path, tuple[set[str], set[str]]] = {}
    stop = _key(root)
    for base, paths, found_dirs in sources:
        local: dict[Path, tuple[set[str], set[str]]] = {}
        ends = [(p, True) for p in paths] + [(d, False) for d in found_dirs]
        for path, is_file in ends:
            if not _under(str(path), str(root)) or _key(path) == stop:
                continue
            local.setdefault(path.parent, (set(), set()))[1 if is_file else 0].add(path.name)
            child = path.parent
            while _key(child) not in (_key(base), stop) and child.parent != child:
                local.setdefault(child.parent, (set(), set()))[0].add(child.name)
                child = child.parent
        for folder in sorted(local, key=lambda f: (len(f.parts), str(f))):
            d, f = local[folder]
            have = folders.setdefault(folder, (set(), set()))
            have[0].update(d)
            have[1].update(f)
    return [(folder, sorted(d), sorted(f)) for folder, (d, f) in folders.items()]


def listing(root: Path, files: Iterable[str] = (), dirs: Iterable[str] = ()) -> list[Entry]:
    """The folders under *root* that hold files named in *files* or lie in folders named in *dirs*.

    The files one level inside hidden folders and ``.context.toml`` files are always included.
    Each entry is a folder, its child folders that lead to matches, and its matched files. The
    repositories of active sessions come first. In lazy mode only they are read while the caller
    waits; :func:`state` says when the rest is not known yet.
    """
    root = Path(os.path.normpath(str(root)))
    names = _names(files, dirs)
    done: set[str] = set()
    active = _Pass(names, scan=True)
    first = [u for u in (active.unit(f) for f in _active_units(root)) if u is not None]
    for u in first:
        done.add(_key(u.folder))
    own = _own_unit(root)
    rest = _Pass(names, scan=not _lazy or own is not None)  # one project aictl started in is read at once
    units, outside, known = _gather(root, [f for u in first for f in (u.folder / Path(*n.split("/")) for n in u.nested)], rest, done)
    if outside is not None and outside.capped:
        warn_once(
            log,
            "Under %s, aictl read the projects of active sessions in full and found %d repositories, but it stopped "
            "looking for more after %d folders outside git. The folders after that point were not read. "
            "To read one project only, start aictl in it or use --root.",
            root,
            len(outside.repos),
            OUTSIDE_MAX_DIRS,
        )
    serials = (tuple(u.serial for u in first), outside.serial if outside else 0, tuple(u.serial for u in units))
    st = _RootState(partial=not known or rest.missing > 0, repositories=len(first) + len(units), pending=rest.missing + rest.stale)
    with _lock:
        _states[_key(root)] = st
        if _lazy:
            _asked[_key(root)] = root
    if _lazy and (not known or rest.missing or rest.stale):
        _wake.set()
    with _lock:
        hit = _built.get(_key(root))
    if hit is not None and hit[0] == serials:
        return list(hit[1])
    sources = [_source(u) for u in first]
    if outside is not None:
        sources.append((root, list(outside.files), list(outside.dirs)))
    sources += [_source(u) for u in units]
    entries = _entries(sources, root)
    with _lock:
        _built[_key(root)] = (serials, entries)
    return list(entries)


def state(root: Path) -> dict:
    """What the last listing of *root* covered: ``partial`` is true while repositories are not read yet."""
    with _lock:
        st = _states.get(_key(root)) or _RootState()
    return {"partial": st.partial, "repositories": st.repositories, "pending": st.pending}


# ── Background ───────────────────────────────────────────────────────


def _background_pass(root: Path) -> None:
    names = _names((), ())
    p = _Pass(names, scan=True, background=True, refreshes=MAX_FULL_REFRESH_PER_PASS * 2)
    units, _outside_rec, known = _gather(root, [], p, set())
    with _lock:
        st = _states.setdefault(_key(root), _RootState())
        st.partial = not known or p.missing > 0
        st.repositories = max(st.repositories, len(units))
        st.pending = p.missing + p.stale


def _run_background() -> None:
    while True:
        _wake.wait(BACKGROUND_IDLE_S)
        _wake.clear()
        with _lock:
            if not _lazy:
                return
            roots = list(_asked.values())
        for root in roots:
            try:
                _background_pass(root)
            except Exception:  # noqa: BLE001 - one bad folder must not stop discovery of the others
                log.exception("background discovery of %s failed", root)


def set_lazy(on: bool) -> None:
    """In lazy mode (the daemon), a listing reads only active repositories; a thread reads the rest."""
    global _lazy, _worker
    with _lock:
        _lazy = on
        if on and (_worker is None or not _worker.is_alive()):
            _worker = threading.Thread(target=_run_background, name="aictl-discovery", daemon=True)
            _worker.start()
    if not on:
        _wake.set()


def is_lazy() -> bool:
    return _lazy


# ── Sessions and files ───────────────────────────────────────────────


def _scope(folder: Path, rel: str) -> Path:
    """The folder a matched file applies to: its own folder, or the folder that holds its tool folder."""
    parts = rel.split("/")
    for i, p in enumerate(parts[:-1]):
        if p.startswith("."):
            return folder.joinpath(*parts[:i])
    return folder.joinpath(*parts[:-1])


@dataclass
class _Link:
    git_root: str
    sessions: dict[str, list[str]] = field(default_factory=dict)
    files: list[dict] = field(default_factory=list)


def session_links() -> dict[str, dict]:
    """For each git root of an active session: its sessions and the matched files each one can be affected by.

    A file affects a session when the session's git root holds it and the session's working folder
    is the file's folder or lies below it (instruction files nest). The result is
    ``{git_root: {"git_root", "sessions": [ids], "files": [{"path", "sessions": [ids]}]}}``.
    """
    with _lock:
        sessions = dict(_sessions)
        units = list(_units.values())
    links: dict[str, _Link] = {}
    for sid, folders in sessions.items():
        for f in folders:
            top = git_root(f)
            if top is not None:
                links.setdefault(_key(top), _Link(str(top))).sessions.setdefault(sid, []).append(f)
    for u in units:
        link = links.get(_key(u.top))
        if link is None:
            continue
        for rel in u.files:
            scope = str(_scope(u.folder, rel))
            affected = sorted(sid for sid, folders in link.sessions.items() if any(_under(f, scope) for f in folders))
            if affected:
                link.files.append({"path": str(u.folder / Path(*rel.split("/"))), "sessions": affected})
    return {
        link.git_root: {"git_root": link.git_root, "sessions": sorted(link.sessions), "files": sorted(link.files, key=lambda x: x["path"])}
        for link in links.values()
    }


def files_for_folder(folder: str | Path) -> dict:
    """The matched files that can affect a session working in *folder*, from repositories already read.

    The same rule as :func:`session_links`, for any folder, so a past session gets its files too:
    a file of *folder*'s git root whose folder is *folder* or holds it. Reads no repository itself:
    in lazy mode an unread repository is handed to the background thread, so a later call has it.
    ``{"git_root": str | None, "files": [paths], "read": bool}``; ``read`` is False while the
    repository has not been read yet.
    """
    top = git_root(folder) if folder else None
    if top is None:
        return {"git_root": None, "files": [], "read": False}
    with _lock:
        units = [u for u in _units.values() if _key(u.top) == _key(top)]
        # No active session may work in this repository, so no listing would ever read it.
        asked = not units and _lazy and _key(top) not in _asked
        if asked:
            _asked[_key(top)] = top
    if asked:
        _wake.set()
    out = [
        str(u.folder / Path(*rel.split("/")))
        for u in units
        for rel in u.files
        if _under(str(folder), str(_scope(u.folder, rel)))
    ]
    return {"git_root": str(top), "files": sorted(out), "read": bool(units)}


def clear_cache() -> None:
    global _git_missing
    with _lock:
        _units.clear()
        _outside.clear()
        _states.clear()
        _built.clear()
        _asked.clear()
        _files.clear()
        _files.update(BASE_FILES)
        _dirs.clear()
        _git_missing = False
