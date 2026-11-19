# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Changes of files in git repositories, as git sees them.

The file watcher gives each OS file event in a repository to :class:`RepoChangeTracker`.
An OS event alone says little: an editor saves a file without a change, a build writes
thousands of ignored files, and a checkout rewrites the work tree. The tracker:

- drops events for paths that git ignores (the list comes from
  ``git ls-files -o -i --directory --exclude-standard``) and for git's own folder, except
  ``HEAD``, ``index``, ``packed-refs``, ``refs/`` and ``logs/``;
- keeps the other paths until the repository is quiet for :data:`QUIET_S` (at most
  :data:`MAX_WAIT_S` after the first event), then asks ``git status`` about these paths only;
- reports a file only when its git status or its content changed since the last report. It
  keeps a signature (status, size, mtime and a content hash) of each file that differs from
  the last commit, and can save these signatures between runs;
- reads the new lines of the ``HEAD`` reflog. A commit, checkout, reset, merge or rebase is
  one :class:`HeadMove`. The files that such a command changed are not reported one by one.

An AI tool's file that git ignores (for example ``.claude/settings.local.json``) is still
reported when its content changes: the caller marks such paths with a tool name, and the
tracker confirms with ``git check-ignore`` that git ignores them. Its status is ``"!!"``.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import subprocess
import sys
import threading
import time
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path

from .. import tree_walk
from ..fsutil import warn_once
from ..platforms import IS_WINDOWS, path_key

log = logging.getLogger(__name__)

QUIET_S = 0.3  # a repository is read when no event came for this long
MAX_WAIT_S = 3.0  # ... or this long after its first unread event
LOCKED_MAX_WAIT_S = 30.0  # while a git command holds index.lock, wait up to this long for it to finish
TICK_S = 0.2
SAVE_EVERY_S = 60.0
MAX_PATHSPEC_PATHS = 200  # more paths than this: one git status for the whole repository
MAX_PATHSPEC_CHARS = 16_000  # a Windows command line holds at most 32767 characters
MAX_PENDING_PATHS = 100_000
MAX_REPORTS_PER_FLUSH = 2000
MAX_HEAD_MOVES_PER_FLUSH = 100
MAX_RECONCILE_PATHS = 2000  # at start, saved signatures are compared only for this many paths
DIGEST_MAX_BYTES = 16 * 1024 * 1024
BINARY_SNIFF_BYTES = 8192
IGNORED_REFRESH_PENDING = 64  # this many unread paths with no git status: read the ignored list again
IGNORED_REFRESH_MIN_S = 30.0
MAX_SAVED_PATHS = 20_000
MAX_LINKED_WORKTREES = 32
MAX_IGNORE_CHECKS = 500  # tool files per read that git check-ignore is asked about
MAX_TOOL_SIGNATURES = 10_000
STATE_VERSION = 1
GIT_META_FILES = frozenset({"HEAD", "index", "packed-refs"})
GIT_META_DIRS = ("refs/", "logs/")
SKIPPED_DIR_NAMES = frozenset({".git", "node_modules", "__pycache__"})
UNTRACKED = "??"
IGNORED = "!!"
_NO_HASH = frozenset({"", "0" * 40, "0" * 64})

# (display path relative to the top, status XY or "??", size, mtime_ns, content hash, line count)
Signature = tuple[str, str, int, int, str | None, int | None]
# (display path, wall time of the last OS event, tool name, an OS event said "created")
_Event = tuple[str, float | None, str | None, bool]


@dataclass(frozen=True, slots=True)
class FileChange:
    """One file whose git status or content changed."""

    repo: str  # work tree top
    path: str  # full path
    change: str  # created | modified | deleted | renamed | reverted | conflict
    status: str  # porcelain XY, "??" untracked, "!!" an ignored tool file, "" when the file is clean again
    tracked: bool
    size_bytes: int
    growth_bytes: int
    lines_added: int | None
    lines_removed: int | None
    ts: float  # wall time of the last OS event for the file
    tool_hint: str | None = None
    renamed_from: str | None = None


@dataclass(frozen=True, slots=True)
class HeadMove:
    """One new line of the HEAD reflog: a commit, checkout, reset, merge, rebase step ..."""

    repo: str
    action: str  # the reflog message before ":", for example "commit" or "checkout"
    message: str
    old: str
    new: str
    ts: float


@dataclass(eq=False)
class RepoState:
    top: Path
    git_dir: Path
    watch: tuple[Path, ...]
    key: str
    ignorecase: bool = IS_WINDOWS or sys.platform == "darwin"
    untracked: str = "all"
    ready: bool = False
    failed: bool = False
    dirty: dict[str, Signature] = field(default_factory=dict)
    reflog_size: int = 0
    ignored_dirs: frozenset[str] = frozenset()
    ignored_files: frozenset[str] = frozenset()
    ignored_at: float = float("-inf")
    pending: dict[str, _Event] = field(default_factory=dict)
    tool_sigs: dict[str, tuple[int, str | None, int | None]] = field(default_factory=dict)  # ignored tool files
    overflow: bool = False
    meta: bool = False
    refresh_ignored: bool = False
    first_at: float | None = None
    last_at: float | None = None

    def relkey(self, rel: str) -> str:
        return rel.lower() if self.ignorecase else rel

    def is_ignored(self, rk: str) -> bool:
        if rk in self.ignored_files:
            return True
        i = rk.find("/")
        while i >= 0:
            if rk[: i + 1] in self.ignored_dirs:
                return True
            i = rk.find("/", i + 1)
        return False


# ── git ──────────────────────────────────────────────────────────────


def _git(top: Path, args: list[str], data: bytes | None = None, ok: tuple[int, ...] = (0,)) -> bytes | None:
    env = {k: v for k, v in os.environ.items() if k not in tree_walk._GIT_ENV_DROP}
    env["GIT_CEILING_DIRECTORIES"] = str(top.parent)
    env["GIT_OPTIONAL_LOCKS"] = "0"  # never write the index: that would be one more event to read
    io: dict = {"input": data} if data is not None else {"stdin": subprocess.DEVNULL}
    try:
        proc = subprocess.run(
            [tree_walk.GIT, "-C", str(top), *args],
            capture_output=True,
            env=env,
            timeout=tree_walk.GIT_TIMEOUT_S,
            creationflags=tree_walk._NO_WINDOW | tree_walk._BELOW_NORMAL,
            **io,
        )
    except FileNotFoundError:
        warn_once(log, "git is not installed, so aictl cannot read the changes in repositories")
        return None
    except (OSError, subprocess.TimeoutExpired) as exc:
        log.debug("git %s %s: %s", top, args[:2], exc)
        return None
    return proc.stdout if proc.returncode in ok else None


# key -> (display path, XY, entry type "1" | "2" | "u" | "?", HEAD blob, path before a rename)
_Entry = tuple[str, str, str, str, str | None]


def _parse_status(out: bytes, repo: RepoState) -> tuple[dict[str, _Entry], dict[str, str], list[Path]]:
    """Entries of ``git status --porcelain=v2 -z``, the sources of renames, and repositories inside this one."""
    entries: dict[str, _Entry] = {}
    moved_from: dict[str, str] = {}
    nested: list[Path] = []
    fields = out.split(b"\0")
    i = 0
    while i < len(fields):
        raw = fields[i]
        i += 1
        if not raw:
            continue
        line = raw.decode("utf-8", "replace")
        kind = line[0]
        orig = None
        if kind == "1":
            parts = line.split(" ", 8)
            if len(parts) < 9:
                continue
            xy, head, rel = parts[1], parts[6], parts[8]
        elif kind == "2":
            parts = line.split(" ", 9)
            if len(parts) < 10 or i >= len(fields):
                continue
            xy, head, rel = parts[1], parts[6], parts[9]
            orig = fields[i].decode("utf-8", "replace")
            i += 1
        elif kind == "u":
            parts = line.split(" ", 10)
            if len(parts) < 11:
                continue
            xy, head, rel = parts[1], "", parts[10]
        elif kind == "?":
            xy, head, rel = UNTRACKED, "", line[2:]
            if rel.endswith("/"):
                # With --untracked-files=all, git shows a folder only for a repository inside this one.
                folder = repo.top / Path(*rel.rstrip("/").split("/"))
                if (folder / ".git").exists():
                    nested.append(folder)
                continue
        else:
            continue
        k = repo.relkey(rel)
        entries[k] = (rel, xy, kind, head, orig)
        if orig:
            moved_from[repo.relkey(orig)] = k
    return entries, moved_from, nested


def _parse_numstat(out: bytes, repo: RepoState) -> dict[str, tuple[int | None, int | None]]:
    result: dict[str, tuple[int | None, int | None]] = {}
    fields = out.split(b"\0")
    i = 0
    while i < len(fields):
        raw = fields[i]
        i += 1
        if not raw:
            continue
        cols = raw.decode("utf-8", "replace").split("\t", 2)
        if len(cols) < 3:
            continue
        rel = cols[2]
        if not rel:  # a rename: the source and the target follow
            if i + 1 >= len(fields):
                break
            rel = fields[i + 1].decode("utf-8", "replace")
            i += 2
        added = None if cols[0] == "-" else int(cols[0])
        removed = None if cols[1] == "-" else int(cols[1])
        result[repo.relkey(rel)] = (added, removed)
    return result


def _parse_reflog_line(raw: bytes, repo: str, now: float) -> HeadMove | None:
    line = raw.decode("utf-8", "replace")
    head, _, msg = line.partition("\t")
    parts = head.split(" ")
    if len(parts) < 4:
        return None
    try:
        ts = float(parts[-2])
    except ValueError:
        ts = now
    action, sep, rest = msg.partition(":")
    if not sep:
        action, rest = msg, ""
    return HeadMove(repo=repo, action=action.strip(), message=rest.strip()[:500], old=parts[0], new=parts[1], ts=ts)


# ── files ────────────────────────────────────────────────────────────


def _stat(path: Path) -> tuple[int, int] | None:
    try:
        st = os.stat(path)
    except OSError:
        return None
    return st.st_size, st.st_mtime_ns


def _content(path: Path) -> tuple[str | None, int | None]:
    """A hash of the file's content and its line count (None for a binary file)."""
    h = hashlib.blake2b(digest_size=16)
    lines = 0
    binary = False
    first = True
    last = b""
    try:
        with open(path, "rb") as f:
            while chunk := f.read(1 << 20):
                if first:
                    binary = b"\0" in chunk[:BINARY_SNIFF_BYTES]
                    first = False
                h.update(chunk)
                lines += chunk.count(b"\n")
                last = chunk[-1:]
    except OSError:
        return None, None
    if last and last != b"\n":
        lines += 1
    return h.hexdigest(), None if binary else lines


def _same(old: Signature, xy: str, size: int, mtime: int, digest: str | None) -> bool:
    if old[1] != xy or old[2] != size:
        return False
    if digest and old[4]:
        return digest == old[4]
    return old[3] == mtime


def _change(kind: str, xy: str, old: Signature | None, missing: bool) -> str:
    if kind == "u":
        return "conflict"
    if missing or "D" in xy:
        return "deleted"
    if kind == "2" and (old is None or old[1] != xy):
        return "renamed"
    if old is None and (xy == UNTRACKED or xy[:1] == "A"):
        return "created"
    return "modified"


def _under(path: Path, folder: Path) -> bool:
    a, b = path_key(str(path)), path_key(str(folder))
    return a == b or a.startswith(b.rstrip("\\/") + os.sep)


def _linked_worktrees(git_dir: Path) -> list[Path]:
    """The other work trees of the repository that owns *git_dir*: its main work tree and its linked worktrees."""
    common = git_dir.parent.parent if git_dir.parent.name == "worktrees" else git_dir
    tops: list[Path] = []
    if common.name == ".git" and (common.parent / ".git").is_dir():
        tops.append(common.parent)
    try:
        linked = sorted((common / "worktrees").iterdir())
    except OSError:
        linked = []
    for entry in linked[:MAX_LINKED_WORKTREES]:
        try:
            gitfile = Path((entry / "gitdir").read_text(encoding="utf-8", errors="replace").strip())
        except OSError:
            continue
        if not gitfile.is_absolute():
            gitfile = Path(os.path.normpath(str(entry / gitfile)))
        if gitfile.exists():
            tops.append(gitfile.parent)
    return tops


# ── tracker ──────────────────────────────────────────────────────────


class RepoChangeTracker:
    """Turn OS file events in git repositories into :class:`FileChange` and :class:`HeadMove` reports.

    :meth:`note` is called from the watcher threads and only queues a path. :meth:`run` (or
    :meth:`drain`) runs git and returns the reports, in one worker thread.
    """

    def __init__(
        self,
        state_path: Path | None = None,
        clock: Callable[[], float] = time.monotonic,
        wall: Callable[[], float] = time.time,
    ) -> None:
        self._lock = threading.RLock()
        self._by_top: dict[str, RepoState] = {}
        self._by_gitdir: dict[str, RepoState] = {}
        self._state_path = state_path
        self._clock = clock
        self._wall = wall
        self._saved: dict[str, dict] = self._load()

    # ── repositories ─────────────────────────────────────────────────

    def repos(self) -> list[RepoState]:
        with self._lock:
            return list(self._by_top.values())

    def watch_paths(self) -> list[Path]:
        with self._lock:
            return [p for repo in self._by_top.values() if not repo.failed for p in repo.watch]

    def add_repo(self, top: str | Path, watch: str | Path | None = None) -> list[RepoState]:
        """Track the work tree at *top*, its other worktrees and its submodules.

        *watch* is the folder to watch when only part of the work tree matters (aictl started
        in a subfolder). Returns the repositories added now.
        """
        added: list[RepoState] = []
        self._add(Path(os.path.normpath(str(top))), Path(os.path.normpath(str(watch))) if watch else None, added, 0)
        return added

    def _add(self, top: Path, watch: Path | None, added: list[RepoState], depth: int) -> None:
        key = path_key(str(top))
        with self._lock:
            have = self._by_top.get(key)
            if have is not None:
                if watch is None and have.watch[0] != top:  # a session works in the whole repository now
                    have.watch = (top, *(p for p in have.watch[1:] if not _under(p, top)))
                return
        gd = tree_walk.git_dir(top)
        if gd is None or not gd.is_dir():
            return
        gd = Path(os.path.normpath(str(gd)))
        base = watch or top
        repo = RepoState(top=top, git_dir=gd, watch=(base,) if _under(gd, base) else (base, gd), key=key)
        with self._lock:
            if key in self._by_top:
                return
            self._by_top[key] = repo
            self._by_gitdir[path_key(str(gd))] = repo
        added.append(repo)
        if depth >= 2:
            return
        for other in _linked_worktrees(gd):
            self._add(other, None, added, depth + 1)
        for rel in tree_walk._submodules(top):
            sub = top / Path(*rel.split("/"))
            if (sub / ".git").exists():
                self._add(sub, None, added, depth + 1)

    # ── events ───────────────────────────────────────────────────────

    def note(
        self,
        path: str,
        tool_hint: str | None = None,
        boundary: str | None = None,
        created: bool = False,
        is_dir: bool = False,
    ) -> str:
        """Queue an OS event for *path*.

        Returns ``"queued"``, ``"dropped"`` (git ignores the path and it is not a tool file, or
        it is in git's folder) or ``"outside"`` (no tracked repository holds it, or git cannot
        read the repository). With *boundary*, a repository that holds the folder *boundary*
        does not count: the caller handles paths under it. *created* tells that the OS event
        was a file creation. With *is_dir*, *path* is a folder that was created, moved or
        deleted as a whole: the files under it are read.
        """
        np = os.path.normpath(path)
        key = path_key(np)
        stop = path_key(boundary) if boundary else None
        with self._lock:
            if not self._by_top:
                return "outside"
            cur = key
            while True:
                repo = self._by_gitdir.get(cur)
                if repo is not None:
                    return "outside" if repo.failed else self._note_meta(repo, np[len(cur) :].lstrip(os.sep).replace(os.sep, "/"))
                repo = self._by_top.get(cur)
                if repo is not None:
                    if repo.failed:
                        return "outside"
                    return self._note_file(repo, np[len(cur) :].lstrip(os.sep).replace(os.sep, "/"), tool_hint, created, is_dir)
                if cur == stop:
                    return "outside"
                parent = os.path.dirname(cur)
                if parent == cur:
                    return "outside"
                cur = parent

    def _note_meta(self, repo: RepoState, rel: str) -> str:
        if rel.endswith(".lock"):
            return "dropped"
        if rel == "info/exclude":
            repo.refresh_ignored = True
        elif rel not in GIT_META_FILES and not rel.startswith(GIT_META_DIRS):
            return "dropped"
        repo.meta = True
        self._touch(repo)
        return "queued"

    def _note_file(self, repo: RepoState, rel: str, tool_hint: str | None, created: bool, is_dir: bool = False) -> str:
        if not rel:
            return "dropped"
        parts = rel.split("/")
        if not SKIPPED_DIR_NAMES.isdisjoint(parts):
            return "dropped"
        rk = repo.relkey(rel)
        if is_dir:
            # A folder key ends with "/". Files that git ignores under it are read from their own events.
            rk += "/"
            if repo.ready and repo.is_ignored(rk):
                return "dropped"
            created = False
        elif repo.ready and not tool_hint and repo.is_ignored(rk):
            return "dropped"
        if parts[-1] == ".gitignore":
            repo.refresh_ignored = True
        prev = repo.pending.get(rk)
        if prev is not None or len(repo.pending) < MAX_PENDING_PATHS:
            repo.pending[rk] = (rel, self._wall(), tool_hint or (prev[2] if prev else None), created or bool(prev and prev[3]))
        else:
            repo.overflow = True
        self._touch(repo)
        return "queued"

    def _touch(self, repo: RepoState) -> None:
        now = self._clock()
        if repo.first_at is None:
            repo.first_at = now
        repo.last_at = now

    # ── reading ──────────────────────────────────────────────────────

    def due(self) -> list[RepoState]:
        """Repositories to read now: quiet ones with events, then at most one not read yet."""
        now = self._clock()
        ready: list[RepoState] = []
        new: list[RepoState] = []
        with self._lock:
            for repo in self._by_top.values():
                if repo.failed:
                    continue
                if not repo.ready:
                    new.append(repo)
                elif repo.first_at is not None and (now - (repo.last_at or now) >= QUIET_S or now - repo.first_at >= MAX_WAIT_S):
                    ready.append(repo)
        return ready + new[:1]

    def drain(self, force: bool = False) -> list[FileChange | HeadMove]:
        """Read the repositories that are due, or with *force* every one with unread events."""
        out: list[FileChange | HeadMove] = []
        repos = [r for r in self.repos() if not r.failed and (not r.ready or r.first_at is not None)] if force else self.due()
        for repo in repos:
            try:
                out.extend(self.flush(repo, force=force))
            except Exception:
                log.exception("Reading the changes in %s failed", repo.top)
        return out

    def run(self, deliver: Callable[[list], None], stop: threading.Event) -> None:
        """Worker loop: read due repositories and pass the reports to *deliver*."""
        last_save = self._clock()
        while not stop.wait(TICK_S):
            items = self.drain()
            if items:
                deliver(items)
            if self._clock() - last_save >= SAVE_EVERY_S:
                self.save()
                last_save = self._clock()
        self.save()

    def flush(self, repo: RepoState, force: bool = False) -> list[FileChange | HeadMove]:
        if not repo.ready:
            return self._baseline(repo)
        if (
            not force
            and repo.first_at is not None
            and self._clock() - repo.first_at < LOCKED_MAX_WAIT_S
            and (repo.git_dir / "index.lock").exists()
        ):
            return []  # a git command is at work; its result is read when it is done
        with self._lock:
            pending, repo.pending = repo.pending, {}
            overflow, repo.overflow = repo.overflow, False
            meta, repo.meta = repo.meta, False
            refresh, repo.refresh_ignored = repo.refresh_ignored, False
            repo.first_at = repo.last_at = None
        if refresh:
            self._refresh_ignored(repo, force=True)
        moves = self._head_moves(repo) if meta else []
        keys = set(pending)
        if meta:
            keys.update(repo.dirty)
        if not keys and not overflow:
            return list(moves)
        full = overflow or len(keys) > MAX_PATHSPEC_PATHS
        specs: list[str] = []
        if not full:
            magic = ":(literal,icase)" if repo.ignorecase else ":(literal)"
            for k in keys:
                rel = pending[k][0] if k in pending else repo.dirty[k][0]
                specs.append(magic + rel)
            full = sum(len(s) + 1 for s in specs) > MAX_PATHSPEC_CHARS
        status = self._status(repo, None if full else specs)
        if status is None:
            return list(moves)
        entries, moved_from, nested = status
        for folder in nested:
            self.add_repo(folder)
        before = set(repo.dirty)
        if full:
            keys.update(entries)
            keys.update(repo.dirty)
        events = pending
        folders = {k for k in pending if k.endswith("/")}
        if folders:
            # A folder that was created, moved or deleted as a whole: its files count as having events.
            events = {k: ev for k, ev in pending.items() if k not in folders}
            keys -= folders
            for k in {*entries, *before}:
                if k in events:
                    continue
                i = k.find("/")
                while i >= 0:
                    ev = pending.get(k[: i + 1])
                    if ev is not None:
                        events[k] = (entries[k][0] if k in entries else repo.dirty[k][0], ev[1], ev[2], False)
                        keys.add(k)
                        break
                    i = k.find("/", i + 1)
        reports = self._compare(repo, keys, entries, moved_from, events, suppress=bool(moves))
        reports += self._ignored_tool_files(repo, events, entries, before)
        if len(pending) >= IGNORED_REFRESH_PENDING and not any(k in entries or k in before for k in pending):
            self._refresh_ignored(repo)  # probably a new ignored folder, such as build output
        return [*moves, *reports]

    def _status(self, repo: RepoState, specs: list[str] | None):
        args = [
            "--no-optional-locks",
            "status",
            "--porcelain=v2",
            "-z",
            f"--untracked-files={repo.untracked}",
            "--ignore-submodules=all",
        ]
        if specs is not None:
            args += ["--", *specs]
        out = _git(repo.top, args)
        if out is None:
            log.debug("git status failed in %s", repo.top)
            return None
        return _parse_status(out, repo)

    def _compare(
        self,
        repo: RepoState,
        keys: Iterable[str],
        entries: dict[str, _Entry],
        moved_from: dict[str, str],
        events: dict[str, _Event],
        suppress: bool,
    ) -> list[FileChange]:
        """Update the signatures of *keys* and report the paths with an event whose status or content changed."""
        drafts: list[dict] = []
        for k in keys:
            new = entries.get(k)
            old = repo.dirty.get(k)
            ev = events.get(k)
            if new is None:
                if old is None:
                    continue
                del repo.dirty[k]
                if ev is None or suppress or k in moved_from:  # the source of a rename is reported with its target
                    continue
                st = _stat(repo.top / old[0])
                size = st[0] if st else 0
                drafts.append(
                    {
                        "k": k,
                        "rel": old[0],
                        "change": "reverted" if st else "deleted",
                        "status": "",
                        "tracked": old[1] != UNTRACKED,
                        "size": size,
                        "growth": size - old[2],
                        "lines": (None, None) if st or old[1] != UNTRACKED or old[5] is None else (0, old[5]),
                        "ts": ev[1],
                        "mtime": st[1] if st else 0,
                        "tool": ev[2],
                    }
                )
                continue
            rel, xy, kind, head, orig = new
            path = repo.top / rel
            st = _stat(path)
            size, mtime = st if st else (0, 0)
            digest = lines = None
            if ev is not None and st is not None and size <= DIGEST_MAX_BYTES:
                digest, lines = _content(path)
            if old is not None and _same(old, xy, size, mtime, digest):
                if digest and not old[4]:
                    repo.dirty[k] = (rel, xy, size, mtime, digest, lines)
                continue
            repo.dirty[k] = (rel, xy, size, mtime, digest, lines)
            if ev is None or suppress:
                continue
            change = _change(kind, xy, old, st is None)
            tracked = xy != UNTRACKED
            if not tracked:
                counted = (lines, 0) if change == "created" and lines is not None else (None, None)
                if change == "deleted" and old is not None and old[5] is not None:
                    counted = (0, old[5])
            else:
                counted = None  # from git diff --numstat
            drafts.append(
                {
                    "k": k,
                    "rel": rel,
                    "change": change,
                    "status": xy,
                    "tracked": tracked,
                    "size": size,
                    "growth": size - old[2] if old is not None else (size if not tracked else None),
                    "head": head,
                    "orig": orig if kind == "2" else None,
                    "lines": counted,
                    "ts": ev[1],
                    "mtime": mtime,
                    "tool": ev[2],
                }
            )
        if len(drafts) > MAX_REPORTS_PER_FLUSH:
            warn_once(
                log,
                "%d files changed at once in %s; aictl reports the first %d of such a burst.",
                len(drafts),
                repo.top,
                MAX_REPORTS_PER_FLUSH,
            )
            drafts = drafts[:MAX_REPORTS_PER_FLUSH]
        self._fill_numbers(repo, drafts)
        now = self._wall()
        reports = []
        for d in drafts:
            added, removed = d["lines"] or (None, None)
            reports.append(
                FileChange(
                    repo=str(repo.top),
                    path=str(repo.top / Path(*d["rel"].split("/"))),
                    change=d["change"],
                    status=d["status"],
                    tracked=d["tracked"],
                    size_bytes=d["size"],
                    growth_bytes=d["growth"] if d["growth"] is not None else d["size"],
                    lines_added=added,
                    lines_removed=removed,
                    ts=d["ts"] or (d["mtime"] / 1e9 if d["mtime"] else now),
                    tool_hint=d["tool"],
                    renamed_from=str(repo.top / Path(*d["orig"].split("/"))) if d.get("orig") else None,
                )
            )
        return reports

    def _fill_numbers(self, repo: RepoState, drafts: list[dict]) -> None:
        """Lines changed against HEAD for tracked files, and the HEAD size of files first seen changed."""
        numstat = [d for d in drafts if d["lines"] is None and d["tracked"] and d["change"] != "reverted"]
        if numstat:
            magic = ":(literal,icase)" if repo.ignorecase else ":(literal)"
            specs = []
            for d in numstat:
                specs.append(magic + d["rel"])
                if d.get("orig"):
                    specs.append(magic + d["orig"])
            if sum(len(s) + 1 for s in specs) <= MAX_PATHSPEC_CHARS:
                out = _git(repo.top, ["--no-optional-locks", "diff", "--numstat", "-z", "HEAD", "--", *specs])
                counts = _parse_numstat(out, repo) if out is not None else {}
                for d in numstat:
                    d["lines"] = counts.get(d["k"])
        sized = [d for d in drafts if d["growth"] is None]
        hashes = sorted({d["head"] for d in sized if d.get("head") not in _NO_HASH})
        sizes: dict[str, int] = {}
        if hashes:
            out = _git(repo.top, ["cat-file", "--batch-check=%(objectname) %(objectsize)"], data="\n".join(hashes).encode() + b"\n")
            for line in (out or b"").decode("utf-8", "replace").splitlines():
                name, _, size = line.partition(" ")
                if size.isdigit():
                    sizes[name] = int(size)
        for d in sized:
            d["growth"] = d["size"] - sizes.get(d.get("head") or "", 0)

    def _ignored_tool_files(
        self,
        repo: RepoState,
        events: dict[str, _Event],
        entries: dict[str, _Entry],
        before: set[str],
    ) -> list[FileChange]:
        """Report the tool files with an event that git ignores, when their content changed."""
        keys = [k for k, ev in events.items() if ev[2] and not k.endswith("/") and k not in entries and k not in before][:MAX_IGNORE_CHECKS]
        if not keys:
            return []
        data = b"".join(events[k][0].encode("utf-8") + b"\0" for k in keys)
        out = _git(repo.top, ["check-ignore", "-z", "--stdin"], data=data, ok=(0, 1))  # 1: no path is ignored
        if not out:
            return []
        ignored = {repo.relkey(raw.decode("utf-8", "replace")) for raw in out.split(b"\0") if raw}
        if len(repo.tool_sigs) > MAX_TOOL_SIGNATURES:
            repo.tool_sigs.clear()
        reports: list[FileChange] = []
        for k in keys:
            if k not in ignored:
                continue
            rel, ts, tool, created = events[k]
            path = repo.top / Path(*rel.split("/"))
            st = _stat(path)
            old = repo.tool_sigs.get(k)
            if st is None:
                if old is None and not created:
                    continue
                repo.tool_sigs.pop(k, None)
                old_size, old_lines = (old[0], old[2]) if old else (0, None)
                change, size, growth, lines = "deleted", 0, -old_size, (0, old_lines) if old_lines is not None else (None, None)
            else:
                size = st[0]
                digest, count = _content(path) if size <= DIGEST_MAX_BYTES else (None, None)
                if old is not None and old[0] == size and digest is not None and old[1] == digest:
                    continue
                repo.tool_sigs[k] = (size, digest, count)
                if old is None and created:
                    change, growth, lines = "created", size, (count, 0) if count is not None else (None, None)
                else:
                    change, growth, lines = "modified", size - old[0] if old else 0, (None, None)
            reports.append(
                FileChange(
                    repo=str(repo.top),
                    path=str(path),
                    change=change,
                    status=IGNORED,
                    tracked=False,
                    size_bytes=size,
                    growth_bytes=growth,
                    lines_added=lines[0],
                    lines_removed=lines[1],
                    ts=ts or self._wall(),
                    tool_hint=tool,
                )
            )
        return reports

    def _baseline(self, repo: RepoState) -> list[FileChange | HeadMove]:
        """First read of a repository: settings, ignored paths, and the files that differ from HEAD.

        Reports nothing, unless saved signatures from an earlier run show changes made while
        aictl was not running.
        """
        cfg = _git(repo.top, ["config", "-z", "--get-regexp", r"^(core\.ignorecase|status\.showuntrackedfiles)$"])
        for item in (cfg or b"").split(b"\0"):
            name, _, value = item.decode("utf-8", "replace").partition("\n")
            if name == "core.ignorecase":
                repo.ignorecase = value.strip().lower() in ("true", "yes", "on", "1")
            elif name == "status.showuntrackedfiles" and value.strip().lower() in ("no", "false", "off", "0"):
                repo.untracked = "no"
        self._refresh_ignored(repo, force=True)
        status = self._status(repo, None)
        if status is None:
            repo.failed = True
            log.info("aictl cannot read the git status of %s; its changes are not reported", repo.top)
            return []
        entries, moved_from, nested = status
        for folder in nested:
            self.add_repo(folder)
        try:
            reflog_now = (repo.git_dir / "logs" / "HEAD").stat().st_size
        except OSError:
            reflog_now = 0
        saved = self._saved.pop(repo.key, None)
        out: list[FileChange | HeadMove] = []
        old_dirty = _saved_dirty(saved, repo) if saved else None
        if old_dirty is not None and len(set(old_dirty) | set(entries)) <= MAX_RECONCILE_PATHS:
            offset = saved.get("reflog")
            repo.reflog_size = offset if isinstance(offset, int) and 0 <= offset <= reflog_now else reflog_now
            moves = self._head_moves(repo)
            repo.dirty = old_dirty
            keys = set(old_dirty) | set(entries)
            events = {k: (entries[k][0] if k in entries else old_dirty[k][0], None, None, False) for k in keys}
            out = [*moves, *self._compare(repo, keys, entries, moved_from, events, suppress=bool(moves))]
        else:
            repo.reflog_size = reflog_now
            hash_all = len(entries) <= MAX_PATHSPEC_PATHS
            dirty: dict[str, Signature] = {}
            for k, (rel, xy, _kind, _head, _orig) in entries.items():
                path = repo.top / rel
                st = _stat(path)
                size, mtime = st if st else (0, 0)
                digest = lines = None
                if hash_all and st is not None and size <= DIGEST_MAX_BYTES:
                    digest, lines = _content(path)
                dirty[k] = (rel, xy, size, mtime, digest, lines)
            repo.dirty = dirty
        with self._lock:
            repo.ready = True
        return out

    def _refresh_ignored(self, repo: RepoState, force: bool = False) -> None:
        now = self._clock()
        if not force and now - repo.ignored_at < IGNORED_REFRESH_MIN_S:
            return
        repo.ignored_at = now
        out = _git(repo.top, ["ls-files", "-z", "-o", "-i", "--directory", "--exclude-standard"])
        if out is None:
            return
        dirs: set[str] = set()
        files: set[str] = set()
        for raw in out.split(b"\0"):
            if raw:
                rk = repo.relkey(raw.decode("utf-8", "replace"))
                (dirs if rk.endswith("/") else files).add(rk)
        with self._lock:
            repo.ignored_dirs = frozenset(dirs)
            repo.ignored_files = frozenset(files)

    def _head_moves(self, repo: RepoState) -> list[HeadMove]:
        path = repo.git_dir / "logs" / "HEAD"
        try:
            size = path.stat().st_size
        except OSError:
            return []
        if size < repo.reflog_size:  # the reflog was rewritten (expired or deleted)
            repo.reflog_size = 0
        if size == repo.reflog_size:
            return []
        try:
            with open(path, "rb") as f:
                f.seek(repo.reflog_size)
                data = f.read(size - repo.reflog_size)
        except OSError:
            return []
        end = data.rfind(b"\n")
        if end < 0:
            return []
        repo.reflog_size += end + 1
        now = self._wall()
        moves = [m for m in (_parse_reflog_line(raw, str(repo.top), now) for raw in data[:end].split(b"\n") if raw) if m]
        return moves[-MAX_HEAD_MOVES_PER_FLUSH:]

    # ── saved state ──────────────────────────────────────────────────

    def _load(self) -> dict[str, dict]:
        if self._state_path is None:
            return {}
        try:
            data = json.loads(Path(self._state_path).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}
        if not isinstance(data, dict) or data.get("version") != STATE_VERSION or not isinstance(data.get("repos"), dict):
            return {}
        return {k: v for k, v in data["repos"].items() if isinstance(v, dict)}

    def save(self) -> None:
        """Save the signatures, so changes made while aictl is not running are found at the next start."""
        if self._state_path is None:
            return
        with self._lock:
            repos = list(self._by_top.values())
            saved = dict(self._saved)
        for repo in repos:
            if repo.ready and not repo.failed:
                items = list(repo.dirty.items())[:MAX_SAVED_PATHS]
                saved[repo.key] = {"top": str(repo.top), "reflog": repo.reflog_size, "dirty": {k: list(v) for k, v in items}}
        path = Path(self._state_path)
        tmp = path.with_name(path.name + ".tmp")
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp.write_text(json.dumps({"version": STATE_VERSION, "repos": saved}), encoding="utf-8")
            os.replace(tmp, path)
        except OSError as exc:
            log.debug("Saving %s failed: %s", path, exc)


def _saved_dirty(saved: dict, repo: RepoState) -> dict[str, Signature] | None:
    raw = saved.get("dirty")
    if not isinstance(raw, dict):
        return None
    out: dict[str, Signature] = {}
    for v in raw.values():
        if not (isinstance(v, list) and len(v) == 6 and isinstance(v[0], str) and isinstance(v[1], str)):
            continue
        try:
            rel = v[0]
            out[repo.relkey(rel)] = (rel, v[1], int(v[2]), int(v[3]), v[4] if isinstance(v[4], str) else None, v[5] if isinstance(v[5], int) else None)
        except (TypeError, ValueError):
            continue
    return out
