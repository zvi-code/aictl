# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""An index of the files in each tool's own session folder.

A tool keeps the files of a session in a folder of its own: Copilot CLI in
``session-state/<id>/`` (files/, research/, checkpoints/, rewind-file-snapshots/),
Claude Code in ``projects/<project>/<id>/`` (subagents/, tool-results/). The
indexer records the path, size and mtime of each file. It never opens a file:
these folders can hold gigabytes.

A scan is incremental. The signature of a folder is the newest mtime of the
folder and of its direct subfolders; a folder whose signature did not change is
skipped. The first poll indexes every folder found. Each folder is one short
write, so the index of thousands of sessions never holds a store for long.
"""

from __future__ import annotations

import logging
import os
import re
import sqlite3
import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from ..storage import FLUSH_YIELD_S, is_lock_error

log = logging.getLogger(__name__)

POLL_INTERVAL_S = 120.0
# A first run indexes the folders changed in the last RECENT_FIRST_S at once; the older
# ones follow, DEFERRED_FOLDERS_PER_POLL a poll. Here 3,700 session folders cost 24 s
# of system time walked in one burst.
RECENT_FIRST_S = 2 * 86400.0
DEFERRED_FOLDERS_PER_POLL = 150
# Files kept per session, newest first. files_total keeps the real count.
MAX_FILES_PER_SESSION = 2000
# A folder walk stops after this many entries: its count is then a lower bound.
MAX_WALK_ENTRIES = 200_000
# The tool's name in tool_homes, and its tool id in the store.
TOOLS = {"copilot": "copilot-cli", "claude": "claude-code", "codex": "codex-cli"}
_SESSION_ID = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
# Files at the top of a Copilot CLI session folder that are the tool's own records.
_COPILOT_RECORDS = frozenset({"events.jsonl", "workspace.yaml", "vscode.metadata.json"})


def _is_record(tool: str, name: str) -> bool:
    """A top-level file that is the tool's own record of the session, not an artifact."""
    if name.endswith(".lock"):
        return True
    if tool == "copilot":
        return name in _COPILOT_RECORDS or name.startswith("session.db")
    return False


def session_folders(tool: str, root: Path) -> Iterator[tuple[str, Path]]:
    """(session id, folder) of each session folder under a tool's session root."""
    try:
        if tool == "claude":
            # projects/<project>/<session id>/
            for project in os.scandir(root):
                if not project.is_dir(follow_symlinks=False):
                    continue
                try:
                    for entry in os.scandir(project.path):
                        if entry.is_dir(follow_symlinks=False) and _SESSION_ID.match(entry.name):
                            yield entry.name, Path(entry.path)
                except OSError:
                    continue
            return
        # Copilot CLI: session-state/<session id>/. Codex keeps one file per session in
        # dated folders, which are not session folders; a folder named by an id is one.
        for entry in os.scandir(root):
            if entry.is_dir(follow_symlinks=False) and _SESSION_ID.match(entry.name):
                yield entry.name, Path(entry.path)
    except OSError as exc:
        log.debug("session artifacts: cannot list %s: %s", root, exc)


def signature(folder: Path) -> float:
    """The newest mtime of *folder* and of its direct subfolders. 0 when it is gone."""
    try:
        newest = folder.stat().st_mtime
        for entry in os.scandir(folder):
            if entry.is_dir(follow_symlinks=False):
                newest = max(newest, entry.stat(follow_symlinks=False).st_mtime)
    except OSError:
        return 0.0
    return newest


def scan_folder(tool: str, folder: Path) -> tuple[list[tuple[str, str, int, float]], int, int]:
    """(kept files, count of all files, bytes of all files) of one session folder.

    A kept file is (path, first folder part, size, mtime); the newest
    MAX_FILES_PER_SESSION are kept. Only stat is called, never open.
    """
    files: list[tuple[str, str, int, float]] = []
    total = 0
    size_total = 0
    seen = 0
    stack: list[tuple[str, str]] = [(str(folder), "")]
    while stack and seen < MAX_WALK_ENTRIES:
        path, part = stack.pop()
        try:
            entries = list(os.scandir(path))
        except OSError:
            continue
        for entry in entries:
            seen += 1
            try:
                if entry.is_dir(follow_symlinks=False):
                    stack.append((entry.path, part or entry.name))
                    continue
                if not entry.is_file(follow_symlinks=False):
                    continue
                if not part and _is_record(tool, entry.name):
                    continue
                st = entry.stat(follow_symlinks=False)
            except OSError:
                continue
            total += 1
            size_total += st.st_size
            files.append((entry.path, part, st.st_size, st.st_mtime))
    if len(files) > MAX_FILES_PER_SESSION:
        files.sort(key=lambda f: -f[3])
        files = files[:MAX_FILES_PER_SESSION]
    return files, total, size_total


class SessionArtifactIndexer:
    """Polls the session folders of every tool home and keeps the index current."""

    def __init__(self, store: Any, roots: dict[str, list[Path]] | None = None) -> None:
        self.store = store
        # Fixed roots per tool name, for tests; None follows tool_homes.session_dirs.
        self._roots = roots
        self._seen: dict[str, float] | None = None
        # Old folders a first run has not indexed yet.
        self._deferred: set[str] = set()
        self._cold = False
        self.last_poll_ts = 0.0
        self.last_poll_inserted = 0

    def roots(self, tool: str) -> list[Path]:
        if self._roots is not None:
            return list(self._roots.get(tool, []))
        from .. import tool_homes

        return tool_homes.session_dirs(tool)

    def _knows(self, sid: str) -> bool:
        knows = getattr(self.store, "knows_session", None)
        return bool(knows(sid)) if callable(knows) else True

    def poll(self) -> int:
        """Index the folders that changed since the last scan. Returns the folders written."""
        if self._seen is None:
            # The signatures of earlier runs: a restart does not scan every folder again.
            self._seen = dict(self.store.artifact_scans())
            self._cold = not self._seen
        written = 0
        old_before = time.time() - RECENT_FIRST_S if self._cold else 0.0
        budget = 0 if self._cold else DEFERRED_FOLDERS_PER_POLL
        for tool, tool_id in TOOLS.items():
            for root in self.roots(tool):
                for sid, folder in session_folders(tool, root):
                    sig = signature(folder)
                    if not sig or self._seen.get(sid) == sig:
                        continue
                    if sid in self._deferred:
                        if budget <= 0:
                            continue
                        budget -= 1
                        self._deferred.discard(sid)
                    elif sig < old_before:
                        self._deferred.add(sid)
                        continue
                    if not self._knows(sid):
                        # The index waits for the session's own rows. Written first, it would
                        # place the session in the shared store, and its rows would move later.
                        continue
                    files, total, size = scan_folder(tool, folder)
                    try:
                        self.store.replace_session_artifacts(sid, tool_id, str(folder), sig, files, total, size)
                    except sqlite3.OperationalError as exc:
                        if not is_lock_error(exc):
                            raise
                        # Not recorded: the next poll scans this folder again.
                        log.debug("session artifacts: store busy, %s waits for the next poll: %s", sid, exc)
                        continue
                    self._seen[sid] = sig
                    written += 1
                    # A writer in SQLite's busy wait takes the lock now.
                    time.sleep(FLUSH_YIELD_S)
        self._cold = False
        self.last_poll_ts = time.time()
        self.last_poll_inserted = written
        return written
