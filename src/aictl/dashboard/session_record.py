# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The session record: artifacts, commits with pull requests, and a search over all sessions.

An artifact of a session is a file in the tool's own folder for that session
(indexed in ``session_artifacts``), or a file the session wrote outside its
project folder (a row of ``file_write_events``). The store keeps their path,
size and time only. A file is stat-ed when a request shows it, and read only
when a person opens it through ``/api/file``.
"""

from __future__ import annotations

import contextlib
import json
import logging
import os
import shutil
import sqlite3
import subprocess
import threading
import time
from collections import deque
from collections.abc import Callable, Iterable, Iterator
from dataclasses import replace
from typing import Any

from ..platforms import IS_WINDOWS
from ..storage import _session_uuid
from .board_api import (
    MAX_DETAIL_ROWS,
    SPARK_POINTS,
    TITLE_CHARS,
    Filters,
    _basename,
    _Board,
    _label,
    _one_line,
    _short,
    _store_facts,
    read_scope,
)

log = logging.getLogger(__name__)

# The first bytes read to decide whether a file is text.
SNIFF_BYTES = 4096
_TEXT_EXTS = frozenset(
    "md markdown txt text log json jsonl ndjson yaml yml toml ini cfg conf csv tsv xml html htm css js mjs cjs ts tsx"
    " jsx py rb go rs java kt c h cc cpp hpp cs sh bash zsh ps1 bat cmd sql diff patch rst tex env lock gitignore"
    " svg vue swift php pl r scala dart lua mdx properties gradle make mk dockerfile".split()
)
_BINARY_EXTS = frozenset(
    "png jpg jpeg gif bmp ico webp tif tiff heic pdf zip gz tgz bz2 xz 7z rar tar jar war whl so dylib dll exe bin"
    " o a class pyc db sqlite sqlite3 wasm mp3 mp4 mov avi mkv wav flac ogg woff woff2 ttf otf eot psd dmg iso".split()
)
SEARCH_DEFAULT_LIMIT = 200
SEARCH_MAX_LIMIT = 500
# Rows each store gives beyond the page, for the ids that fold into one session.
PAGE_SLACK = 50
EXCERPT_CHARS = 120
# Commits whose pull requests are looked up, per request.
MAX_PR_LOOKUPS = 50
# A session whose commit attribution found nothing is not asked again for this long.
ATTRIBUTION_RETRY_S = 600.0
_attributed: dict[str, float] = {}


@contextlib.contextmanager
def every_store(db: Any) -> Iterator[list[Any]]:
    """A read connection on each store: the project stores and the machine store."""
    fn = getattr(db, "every_store", None)
    if fn is None:
        yield [db._conn()]
        return
    with fn() as conns:
        yield conns


# Python's sqlite3 lets go of the GIL for each row it steps to. In a busy daemon each step
# can wait for the GIL, so a read of a few thousand rows can take seconds. The reads of the
# search therefore come back as one row: SQLite packs the rows in a JSON array.
_columns_of: dict[str, int] = {}
_COLUMNS_MAX = 512
_packing: list[bool] = []


def _packs_exactly(conn: Any) -> bool:
    """Whether this SQLite writes a REAL in JSON with all its digits (older ones keep 15)."""
    if not _packing:
        value = 0.1 + 0.2
        try:
            text = conn.execute("SELECT json_array(?)", (value,)).fetchone()[0]
            _packing.append(json.loads(text)[0] == value)
        except (sqlite3.Error, ValueError, TypeError):
            _packing.append(False)
    return _packing[0]


class _Packed:
    """The rows of a packed read, as a cursor gives them."""

    def __init__(self, rows: list[tuple]) -> None:
        self._rows = rows

    def fetchall(self) -> list[tuple]:
        return self._rows

    def fetchone(self) -> tuple | None:
        return self._rows[0] if self._rows else None

    def __iter__(self) -> Iterator[tuple]:
        return iter(self._rows)


def _read(conn: Any, sql: str, params: Any = ()) -> Any:
    """Run a read; its rows come back in one step when this SQLite packs them exactly."""
    if not _packs_exactly(conn):
        return conn.execute(sql, params)
    n = _columns_of.get(sql)
    if n is None:
        n = len(conn.execute(f"SELECT * FROM ({sql}) LIMIT 0", params).description or ())
        if len(_columns_of) >= _COLUMNS_MAX:
            _columns_of.clear()
        _columns_of[sql] = n
    names = ", ".join(f"c{i}" for i in range(n))
    packed = conn.execute(f"WITH t({names}) AS ({sql}) SELECT json_group_array(json_array({names})) FROM t", params).fetchone()[0]
    return _Packed([tuple(row) for row in json.loads(packed or "[]")])


class _PackedReads:
    """A connection whose reads come back packed (see _read)."""

    def __init__(self, conn: Any) -> None:
        self._conn = conn

    def execute(self, sql: str, params: Any = ()) -> Any:
        if sql.lstrip()[:6].upper() == "SELECT":
            return _read(self._conn, sql, params)
        return self._conn.execute(sql, params)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._conn, name)


def _rows(conn: Any, sql: str, params: Any = ()) -> list[tuple]:
    """Rows of one store; a store without the table (an old file) has none."""
    try:
        return list(_read(conn, sql, params).fetchall())
    except sqlite3.Error as exc:
        log.debug("session record: query failed on a store: %s", exc)
        return []


# ─── Files ────────────────────────────────────────────────────────


def _ext(path: str) -> str:
    name = _basename(path)
    return name.rsplit(".", 1)[-1].lower() if "." in name.strip(".") else ""


def is_text_file(path: str) -> bool:
    """A regular file that looks like text: by its extension, else by its first bytes."""
    try:
        if not os.path.isfile(path):
            return False
    except (OSError, ValueError):
        return False
    ext = _ext(path)
    if ext in _BINARY_EXTS:
        return False
    if ext in _TEXT_EXTS:
        return True
    try:
        with open(path, "rb") as fh:
            head = fh.read(SNIFF_BYTES)
    except OSError:
        return False
    if b"\x00" in head:
        return False
    try:
        head.decode("utf-8")
    except UnicodeDecodeError as exc:
        # A character cut at the end of the sniff is still text.
        return exc.start >= len(head) - 3
    return True


def _norm(path: str) -> str:
    return os.path.normcase(os.path.normpath(path))


def _under(path: str, folder: str) -> bool:
    if not folder:
        return False
    p, f = _norm(path), _norm(folder)
    return p == f or p.startswith(f.rstrip(os.sep) + os.sep)


def _stat(path: str) -> tuple[bool, int | None, float | None]:
    try:
        st = os.stat(path)
    except (OSError, ValueError):
        return False, None, None
    return True, st.st_size, st.st_mtime


_INDEX_SQL = "SELECT session_id, path, folder, size_bytes, mtime FROM session_artifacts WHERE session_id IN (SELECT value FROM json_each(?))"
_FOLDERS_SQL = "SELECT session_id, files_total, bytes_total FROM session_folders WHERE session_id IN (SELECT value FROM json_each(?))"
_WRITES_SQL = (
    "SELECT session_id, path, COUNT(*), MIN(ts), MAX(ts), MAX(size_bytes) FROM file_write_events"
    " WHERE session_id IN (SELECT value FROM json_each(?)) GROUP BY session_id, path"
)


def _merge_artifacts(
    index_rows: list[tuple], folder_rows: list[tuple], write_rows: list[tuple], project: str
) -> tuple[dict[str, dict], dict[str, int], int, int]:
    """(artifacts by path, indexed size by path, count of all, bytes of the folder index).

    The one rule for what an artifact is: a file of the session folder, or a file the
    session wrote outside its project. The agent detail and the search both count with it.
    Rows are those of the session's ids, with the session id first.
    """
    entries: dict[str, dict] = {}
    stored: dict[str, int] = {}
    for _sid, path, part, size, mtime in index_rows:
        entries[path] = {"kind": "session-folder", "folder": part or "", "writes": 0, "first_ts": None, "last_ts": None, "_mtime": mtime}
        stored[path] = int(size or 0)
    files_total = sum(int(r[1] or 0) for r in folder_rows)
    bytes_total = sum(int(r[2] or 0) for r in folder_rows)
    indexed = len(entries)
    for _sid, path, writes, first, last, size in write_rows:
        entry = entries.get(path)
        if entry is None:
            # A file inside the project is a change, on the Changes tab. A relative path is in the project.
            if not path or not os.path.isabs(path) or _under(path, project):
                continue
            entry = entries[path] = {"kind": "written", "folder": "", "writes": 0, "first_ts": None, "last_ts": None, "_mtime": None}
            stored[path] = int(size or 0)
        entry["writes"] += int(writes or 0)
        entry["first_ts"] = first if entry["first_ts"] is None else min(entry["first_ts"], first)
        entry["last_ts"] = last if entry["last_ts"] is None else max(entry["last_ts"], last)
    total = max(files_total, indexed) + (len(entries) - indexed)
    return entries, stored, total, bytes_total


def _artifact_entries(conn: Any, sids: list[str], project: str) -> tuple[dict[str, dict], dict[str, int], int, int]:
    marks = (json.dumps(sorted(set(sids))),)
    return _merge_artifacts(_rows(conn, _INDEX_SQL, marks), _rows(conn, _FOLDERS_SQL, marks), _rows(conn, _WRITES_SQL, marks), project)


def artifact_counts(conn: Any, sessions: dict[str, tuple[list[str], str]]) -> dict[str, int]:
    """The artifact count of each session, (its ids, its project) by session.

    The same rule as the agent detail, with one row per session and per written path: a
    page of sessions can hold hundreds of thousands of indexed files.
    """
    marks = (json.dumps(sorted({s for ids, _p in sessions.values() for s in ids})),)
    in_sids = "session_id IN (SELECT value FROM json_each(?))"
    folders: dict[str, tuple[int, int]] = {}
    for sid, files_total, indexed in _rows(
        conn,
        f"SELECT f.session_id, f.files_total, (SELECT COUNT(*) FROM session_artifacts a WHERE a.session_id = f.session_id)"
        f" FROM session_folders f WHERE f.{in_sids}",
        marks,
    ):
        folders[sid] = (int(files_total or 0), int(indexed or 0))
    writes: dict[str, list[tuple[str, int]]] = {}
    for sid, path, indexed in _rows(
        conn,
        "SELECT w.session_id, w.path, EXISTS (SELECT 1 FROM session_artifacts a WHERE a.session_id = w.session_id AND a.path = w.path)"
        f" FROM file_write_events w WHERE w.{in_sids} GROUP BY w.session_id, w.path",
        marks,
    ):
        writes.setdefault(sid, []).append((path, int(indexed)))
    out = {}
    for sid, (ids, project) in sessions.items():
        files_total = sum(folders.get(i, (0, 0))[0] for i in ids)
        indexed = sum(folders.get(i, (0, 0))[1] for i in ids)
        written = {
            path
            for i in ids
            for path, in_index in writes.get(i, ())
            if not in_index and path and os.path.isabs(path) and not _under(path, project)
        }
        out[sid] = max(files_total, indexed) + len(written)
    return out


def artifact_count(conn: Any, sids: list[str], project: str) -> int:
    """The count of all artifacts of a session, without a stat of any file."""
    return _artifact_entries(conn, sids, project)[2]


def session_artifacts(conn: Any, sids: list[str], project: str) -> tuple[list[dict], int, int]:
    """(artifacts newest first and capped, count of all, bytes of the existing ones)."""
    entries, stored, total, bytes_total = _artifact_entries(conn, sids, project)
    ordered = sorted(entries.items(), key=lambda kv: -max(kv[1]["_mtime"] or 0.0, kv[1]["last_ts"] or 0.0))
    listed = ordered[:MAX_DETAIL_ROWS]
    out = []
    size_sum = 0
    for path, entry in listed:
        exists, size, mtime = _stat(path)
        if exists and size is not None:
            size_sum += size
        out.append(
            {
                "path": path,
                "name": _basename(path),
                "ext": _ext(path),
                "kind": entry["kind"],
                "folder": entry["folder"],
                "size_bytes": size,
                "mtime": mtime,
                "exists": exists,
                "writes": entry["writes"],
                "first_ts": entry["first_ts"],
                "last_ts": entry["last_ts"],
                "viewable": exists and is_text_file(path),
            }
        )
    # Files not listed count with their indexed size; files past the index cap with the folder's total.
    size_sum += sum(stored[path] for path, _entry in ordered[MAX_DETAIL_ROWS:])
    size_sum += max(0, bytes_total - sum(size for path, size in stored.items() if entries[path]["kind"] == "session-folder"))
    return out, total, size_sum


# ─── Commits and pull requests ────────────────────────────────────


def _no_window() -> int:
    return 0x08000000 if IS_WINDOWS else 0  # CREATE_NO_WINDOW: no console window flashes


class PullRequestFinder:
    """Pull requests that hold a commit, looked up with ``gh`` on a thread of its own.

    A request never waits for ``gh``: it gets what is known, and a lookup it starts
    answers the next request. Answers are kept in memory for a while.
    """

    TTL_S = 900.0
    FAILED_TTL_S = 300.0
    TIMEOUT_S = 15.0

    def __init__(
        self,
        run: Callable[..., Any] = subprocess.run,
        which: Callable[[str], str | None] = shutil.which,
        background: bool = True,
    ) -> None:
        self._run = run
        self._which = which
        self._background = background
        self._lock = threading.Lock()
        self._prs: dict[str, tuple[float, list[dict]]] = {}
        self._repos: dict[str, tuple[float, str]] = {}  # project -> (at, note); "" is a GitHub repository
        self._queue: deque[tuple[str, str]] = deque()
        self._queued: set[tuple[str, str]] = set()
        self._thread: threading.Thread | None = None

    def lookup(self, project: str, shas: list[str]) -> tuple[dict[str, list[dict]], str]:
        """(pull requests by sha, why some are missing: "" when every one was looked up)."""
        if not shas:
            return {}, ""
        gh = self._which("gh")
        if not gh:
            return {}, "gh not installed"
        if not project or not os.path.isdir(project):
            return {}, "project folder not found"
        now = time.monotonic()
        found: dict[str, list[dict]] = {}
        missing: list[str] = []
        with self._lock:
            repo = self._repos.get(project)
            if repo is not None and now - repo[0] < (self.TTL_S if not repo[1] else self.FAILED_TTL_S):
                if repo[1]:
                    return {}, repo[1]
            else:
                repo = None
            for sha in shas[:MAX_PR_LOOKUPS]:
                hit = self._prs.get(sha)
                if hit is not None and now - hit[0] < self.TTL_S:
                    found[sha] = hit[1]
                else:
                    missing.append(sha)
            for sha in missing:
                if (project, sha) not in self._queued:
                    self._queued.add((project, sha))
                    self._queue.append((project, sha))
        if not missing:
            return found, ""
        self._start(gh)
        return found, "looking up pull requests"

    def _start(self, gh: str) -> None:
        if not self._background:
            self._work(gh)
            return
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                return
            self._thread = threading.Thread(target=self._work, args=(gh,), daemon=True, name="pr-lookup")
            self._thread.start()

    def _call(self, argv: list[str], cwd: str) -> Any:
        try:
            return self._run(
                argv, cwd=cwd, capture_output=True, text=True, timeout=self.TIMEOUT_S, check=False, creationflags=_no_window()
            )
        except (OSError, subprocess.SubprocessError) as exc:
            log.debug("pull request lookup: %s failed: %s", argv[0], exc)
            return None

    def _repo_note(self, project: str) -> str:
        """"" for a repository with a GitHub remote, else why there are no pull requests."""
        git = self._which("git")
        if not git:
            return "git not installed"
        res = self._call([git, "remote", "-v"], project)
        if res is None or res.returncode != 0:
            return "not a git repository"
        return "" if "github.com" in (res.stdout or "").lower() else "not a GitHub repo"

    def _work(self, gh: str) -> None:
        while True:
            with self._lock:
                if not self._queue:
                    return
                project, sha = self._queue.popleft()
                repo = self._repos.get(project)
            if repo is None or time.monotonic() - repo[0] >= self.TTL_S:
                note = self._repo_note(project)
                with self._lock:
                    self._repos[project] = (time.monotonic(), note)
                repo = (time.monotonic(), note)
            prs: list[dict] | None = None
            if not repo[1]:
                res = self._call([gh, "pr", "list", "--search", sha, "--state", "all", "--json", "number,url,title,state"], project)
                if res is not None and res.returncode == 0:
                    try:
                        raw = json.loads(res.stdout or "[]")
                        prs = [
                            {"number": p.get("number"), "url": p.get("url") or "", "title": p.get("title") or "", "state": p.get("state") or ""}
                            for p in raw
                            if isinstance(p, dict)
                        ]
                    except ValueError:
                        prs = None
                if prs is None:
                    first = ((res.stderr or "").strip().splitlines() or ["no answer"])[0] if res is not None else "no answer"
                    with self._lock:
                        self._repos[project] = (time.monotonic(), f"gh failed: {first[:120]}")
            with self._lock:
                self._queued.discard((project, sha))
                if prs is not None:
                    self._prs[sha] = (time.monotonic(), prs)


PR_FINDER = PullRequestFinder()


def session_commits(db: Any, session: dict, sid: str) -> tuple[list[dict], str]:
    """(commits of the session newest first, with their pull requests; prs_note)."""
    stored_sid = session.get("session_id") or sid
    commits = list(db.get_session_commits(stored_sid))
    project = str(session.get("project_path") or "")
    ended = session.get("ended_at")
    started = float(session.get("started_at") or 0.0)
    if not commits and ended and started > 0 and project:
        last = _attributed.get(stored_sid)
        if last is None or time.monotonic() - last >= ATTRIBUTION_RETRY_S:
            from ..analysis.git_attribution import attribute_session

            # Computed on the first request, as the session commits route does, then kept.
            commits = attribute_session(db, stored_sid, project, started, float(ended))
            if not commits:
                _attributed[stored_sid] = time.monotonic()
    commits.sort(key=lambda c: -float(c.get("ts") or 0.0))
    commits = commits[:MAX_DETAIL_ROWS]
    shas = [str(c.get("sha") or "") for c in commits if c.get("sha")]
    prs, note = PR_FINDER.lookup(project, shas)
    out = []
    for c in commits:
        sha = str(c.get("sha") or "")
        out.append(
            {
                "sha": sha,
                "short_sha": sha[:7],
                "subject": c.get("subject") or "",
                "author_name": c.get("author_name") or "",
                "ts": float(c.get("ts") or 0.0),
                "prs": prs.get(sha, []),
            }
        )
    return out, note


def _artifact_sids(sid: str, session: dict) -> list[str]:
    """The ids whose artifacts are a session's: its own, its stored id and its tool UUID."""
    return sorted(s for s in {sid, str(session.get("session_id") or ""), _session_uuid(sid) or ""} if s)


def record_section(db: Any, conn: Any, session: dict, sid: str, project: str) -> dict:
    """The artifacts and commits fields of the agent detail."""
    sids = _artifact_sids(sid, session)
    artifacts, total, size = session_artifacts(conn, sids, project)
    commits, note = session_commits(db, session, sid)
    return {"artifacts": artifacts, "artifacts_total": total, "artifacts_bytes": size, "commits": commits, "prs_note": note}


def empty_record() -> dict:
    return {"artifacts": [], "artifacts_total": 0, "artifacts_bytes": 0, "commits": [], "prs_note": ""}


# ─── Viewing ──────────────────────────────────────────────────────

_RECORDED_MAX = 4096
_recorded: dict[str, float] = {}
RECORDED_TTL_S = 60.0


def is_recorded_artifact(db: Any, path: str) -> bool:
    """Whether *path* is an indexed artifact or a file some session wrote."""
    if db is None or not path or not os.path.isabs(path):
        return False
    try:
        candidates = list(dict.fromkeys([path, os.path.normpath(path), os.path.realpath(path)]))
    except (OSError, ValueError):
        return False
    now = time.monotonic()
    hit = _recorded.get(path)
    if hit is not None and now - hit < RECORDED_TTL_S:
        return True
    marks = ",".join("?" for _ in candidates)
    sql = (
        f"SELECT 1 FROM session_artifacts WHERE path IN ({marks})"
        f" UNION ALL SELECT 1 FROM file_write_events WHERE path IN ({marks}) LIMIT 1"
    )
    with every_store(db) as conns:
        found = any(_rows(conn, sql, (*candidates, *candidates)) for conn in conns)
    if found:
        if len(_recorded) >= _RECORDED_MAX:
            _recorded.clear()
        _recorded[path] = now
    return found


# ─── Search over all sessions ─────────────────────────────────────

_MATCH_ORDER = ("title", "project", "prompt", "artifact", "file", "commit")
_RANK = {kind: i for i, kind in enumerate(_MATCH_ORDER)}


def _like(q: str) -> str:
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def _excerpt(text: str, q: str) -> str:
    """A short line of *text* around the first hit of *q*."""
    clean = " ".join(str(text or "").split())
    at = clean.lower().find(q.lower())
    if at < 0 or len(clean) <= EXCERPT_CHARS:
        return _one_line(clean, EXCERPT_CHARS)
    start = max(0, at - (EXCERPT_CHARS - len(q)) // 2)
    piece = clean[start : start + EXCERPT_CHARS]
    return _one_line(("…" if start else "") + piece + ("…" if start + EXCERPT_CHARS < len(clean) else ""), EXCERPT_CHARS + 2)


_HIT_SQL = (
    ("project", "SELECT session_id, project_path AS text, 0 FROM sessions WHERE project_path LIKE ? ESCAPE '\\'"),
    ("prompt", "SELECT session_id, text, MIN(ts) FROM session_prompts WHERE text LIKE ? ESCAPE '\\' GROUP BY session_id"),
    ("artifact", "SELECT session_id, path AS text, MAX(mtime) FROM session_artifacts WHERE path LIKE ? ESCAPE '\\' GROUP BY session_id"),
    ("file", "SELECT session_id, path AS text, MAX(ts) FROM file_write_events WHERE path LIKE ? ESCAPE '\\' GROUP BY session_id"),
    ("commit", "SELECT session_id, subject AS text, MAX(ts) FROM session_commits WHERE subject LIKE ? ESCAPE '\\' GROUP BY session_id"),
)


def _filters_sql(tools: list[str] | None, since: float | None, until: float | None) -> tuple[str, list[Any]]:
    where, params = ["s.session_id != ''"], []
    if tools:
        where.append("s.tool IN (SELECT value FROM json_each(?))")
        params.append(json.dumps(tools))
    if since is not None:
        where.append("s.started_at >= ?")
        params.append(since)
    if until is not None:
        where.append("s.started_at <= ?")
        params.append(until)
    return " AND ".join(where), params


# A session the agent detail can open: it has records of its own. The board's agents are
# the sessions with model calls, tool calls or prompts, or usage read from a transcript. A
# sessions row alone, such as a process the monitor saw, is not a session record.
_HAS_RECORDS_SQL = (
    "(EXISTS (SELECT 1 FROM requests r WHERE r.session_id = s.session_id)"
    " OR EXISTS (SELECT 1 FROM tool_invocations t WHERE t.session_id = s.session_id)"
    " OR EXISTS (SELECT 1 FROM session_prompts p WHERE p.session_id = s.session_id)"
    " OR EXISTS (SELECT 1 FROM session_usage u WHERE u.session_id = s.session_id))"
)


def _hits_sql() -> str:
    """Every kind of hit as (session id, rank, text) in one statement. Ranks start after "title"."""
    return " UNION ALL ".join(f"SELECT session_id, {rank}, text FROM ({sql})" for rank, (_kind, sql) in enumerate(_HIT_SQL, start=1))


def _moving(db: Any) -> set[str]:
    moving = getattr(db, "moving_sessions", None)
    return set(moving()) if callable(moving) else set()


def search_sessions(
    db: Any,
    q: str = "",
    tools: list[str] | None = None,
    since: float | None = None,
    until: float | None = None,
    limit: int = SEARCH_DEFAULT_LIMIT,
    offset: int = 0,
) -> dict:
    """Sessions of all stores and all time that match *q*, newest first, one page of them.

    Only sessions with records of their own are listed, so the agent detail opens each row.
    Each store answers with one query that does the search, the sort, the count and the
    page inside SQLite. In a busy daemon each sqlite call, and each row it returns, can
    wait for the GIL, so few calls and few rows keep the search fast.
    """
    q = (q or "").strip()
    limit = max(1, min(int(limit or SEARCH_DEFAULT_LIMIT), SEARCH_MAX_LIMIT))
    offset = max(0, int(offset or 0))
    where, params = _filters_sql(tools, since, until)
    moving = _moving(db)
    # Each store gives its newest sessions, a few more than the page: ids that share a UUID are one row.
    room = offset + limit + PAGE_SLACK
    if q:
        hits = _hits_sql()
        sql = (
            f"WITH h(sid, rank, text) AS ({hits})"
            f" SELECT s.session_id, s.started_at, MIN(h.rank), h.text, COUNT(*) OVER () FROM sessions s JOIN h ON h.sid = s.session_id"
            f" WHERE {where} AND ({_HAS_RECORDS_SQL} OR s.session_id IN (SELECT value FROM json_each(?)))"
            " GROUP BY s.session_id ORDER BY s.started_at DESC LIMIT ?"
        )
        args: list[Any] = [*(_like(q),) * len(_HIT_SQL), *params, json.dumps(sorted(moving)), room]
    else:
        # "+started_at" sorts in SQLite's sorter: the checks run in one call, not once per row returned.
        sql = (
            f"SELECT s.session_id, s.started_at, 0, '', COUNT(*) OVER () FROM sessions s"
            f" WHERE {where} AND ({_HAS_RECORDS_SQL} OR s.session_id IN (SELECT value FROM json_each(?)))"
            " ORDER BY +s.started_at DESC LIMIT ?"
        )
        args = [*params, json.dumps(sorted(moving)), room]
    hits_of: dict[str, tuple[int, str]] = {}
    with every_store(db) as conns:
        found: list[tuple[str, float, int]] = []
        total = 0
        for i, conn in enumerate(conns):
            rows_here = _rows(conn, sql, args)
            if rows_here:
                total += int(rows_here[0][4])
            for sid, at, rank, text, _n in rows_here:
                found.append((sid, float(at or 0.0), i))
                if q and (sid not in hits_of or rank < hits_of[sid][0]):
                    hits_of[sid] = (int(rank), str(text or ""))
        if q and moving:
            total += _add_moving_hits(conns, hits, args, moving, where, params, found, hits_of)
        # One row per logical session: ids that share a tool UUID are one session.
        groups: dict[str, list[str]] = {}
        started: dict[str, float] = {}
        store_of: dict[str, int] = {}
        for sid, at, i in found:
            key = _session_uuid(sid) or sid
            members = groups.setdefault(key, [])
            if sid not in members:
                members.append(sid)
            store_of.setdefault(sid, i)
            started[key] = max(started.get(key, 0.0), at)
        total -= len(found) - len(groups)
        ordered = sorted(groups, key=lambda k: (-started[k], k))
        page_keys = ordered[offset : offset + limit]
        page = {key: _representative(key, groups[key]) for key in page_keys}
        rows = _page_rows(conns, store_of, page, groups)
        _add_numbers(db, conns, store_of, moving, rows)
    out = []
    for key in page_keys:
        row = rows.get(page[key])
        if row is None or row.pop("_closed", False):
            total -= 1
            continue
        if q:
            match, text = _match_of(row["title"], [hits_of[s] for s in groups[key] if s in hits_of], q)
            row["match"], row["match_text"] = match, text
        else:
            row["match"], row["match_text"] = "", ""
        out.append(row)
    return {"rows": out, "total": max(total, len(out))}


def _add_moving_hits(
    conns: list[Any],
    hits: str,
    args: list[Any],
    moving: set[str],
    where: str,
    params: list[Any],
    found: list[tuple[str, float, int]],
    hits_of: dict[str, tuple[int, str]],
) -> int:
    """Hits of sessions that move between stores: the hit can be in the store without the sessions row.

    Returns how many sessions it added to *found*.
    """
    marks = json.dumps(sorted(moving))
    pattern_args = args[: len(_HIT_SQL)]
    for conn in conns:
        for sid, rank, text in _rows(
            conn, f"WITH h(sid, rank, text) AS ({hits}) SELECT sid, MIN(rank), text FROM h WHERE sid IN (SELECT value FROM json_each(?)) GROUP BY sid", (*pattern_args, marks)
        ):
            if sid not in hits_of or rank < hits_of[sid][0]:
                hits_of[sid] = (int(rank), str(text or ""))
    listed = {sid for sid, _at, _i in found}
    before = len(listed)
    wanted = json.dumps(sorted(sid for sid in hits_of if sid in moving and sid not in listed))
    for i, conn in enumerate(conns):
        for sid, at in _rows(conn, f"SELECT s.session_id, s.started_at FROM sessions s WHERE {where} AND s.session_id IN (SELECT value FROM json_each(?))", (*params, wanted)):
            if sid not in listed:
                listed.add(sid)
                found.append((sid, float(at or 0.0), i))
    return len(listed) - before


def _representative(key: str, sids: list[str]) -> str:
    """The id a session is shown under: the tool's own id when the store has it."""
    return key if key in sids else sids[0]


def _match_of(title: str, found: list[tuple[int, str]], q: str) -> tuple[str, str]:
    if q.lower() in title.lower():
        return "title", _excerpt(title, q)
    if not found:
        return "", ""
    rank, text = min(found)
    return _MATCH_ORDER[rank], _excerpt(text, q)


def _by_store(store_of: dict[str, int], sids: Iterable[str]) -> dict[int, list[str]]:
    out: dict[int, list[str]] = {}
    for sid in sids:
        out.setdefault(store_of.get(sid, 0), []).append(sid)
    return out


def _page_rows(conns: list[Any], store_of: dict[str, int], page: dict[str, str], groups: dict[str, list[str]]) -> dict[str, dict]:
    """The listing fields of the sessions of one page: tool, title, project, start and end."""
    in_sids = "session_id IN (SELECT value FROM json_each(?))"
    base: dict[str, dict] = {}
    first_prompt: dict[str, tuple[float, str]] = {}
    members = [sid for key in page for sid in groups[key]]
    for i, sids in _by_store(store_of, members).items():
        conn, marks = conns[i], (json.dumps(sorted(sids)),)
        for sid, tool, project, st, en in _rows(conn, f"SELECT session_id, tool, project_path, started_at, ended_at FROM sessions WHERE {in_sids}", marks):
            base[sid] = {"tool": tool or "", "project": project or "", "started_at": st, "ended_at": en}
        for sid, text, ts in _rows(
            conn, f"SELECT session_id, text, MIN(ts) FROM session_prompts WHERE {in_sids} AND agent_id = '' AND text != '' GROUP BY session_id", marks
        ):
            if sid not in first_prompt or (ts or 0.0) < first_prompt[sid][0]:
                first_prompt[sid] = (ts or 0.0, text)
    out: dict[str, dict] = {}
    for key, rep in page.items():
        sids = groups[key]
        known = [base[s] for s in sids if s in base]
        if not known:
            continue
        head = base.get(rep) or known[0]
        project = head["project"] or next((k["project"] for k in known if k["project"]), "")
        texts = sorted(first_prompt[s] for s in sids if s in first_prompt)
        if texts:
            title = _one_line(texts[0][1], TITLE_CHARS)
        else:
            title = " · ".join(p for p in (_label(head["tool"]), _basename(project)) if p) or _short(rep)
        ended = [k["ended_at"] for k in known if k["ended_at"]]
        out[rep] = {
            "id": rep,
            "tool": head["tool"],
            "title": title,
            "project": project,
            "started_at": min((k["started_at"] for k in known if k["started_at"]), default=None),
            "ended_at": max(ended) if ended and len(ended) == len(known) else None,
            "tokens": 0,
            "cost_usd": None,
            "tool_calls": 0,
            "prompts": 0,
            "artifacts": 0,
            "commits": 0,
        }
    return out


class _PageBoard(_Board):
    """The agent detail's board for several sessions of one store at once.

    It reads the window of all the given sessions with one query per kind of row, and
    gives each the numbers its agent detail shows. Only the counts are loaded.
    """

    def __init__(self, conn: Any, now: float, sids: list[str], facts: dict[str, set[str]]) -> None:
        # One session id keeps the single-session reading of the board (index use, subagents).
        super().__init__(conn, Filters(since=0.0, until=now + 60.0, buckets=1), now, None, only_session=sids[0], facts=facts)
        self._page = sorted(set(sids))

    def _window(self) -> tuple[str, list]:
        return "ts >= ? AND ts <= ? AND session_id IN (SELECT value FROM json_each(?))", [self.f.since, self.f.until, json.dumps(self._page)]

    def _load_fallback_cells(self) -> None:
        # Usage read from a transcript, for the sessions of the page with no model call rows.
        found = self.conn.execute(
            "SELECT su.session_id FROM session_usage su WHERE su.session_id IN (SELECT value FROM json_each(?))"
            " AND NOT EXISTS (SELECT 1 FROM requests r WHERE r.session_id = su.session_id)",
            (json.dumps(self._page),),
        ).fetchall()
        if not found:
            return
        # The agent detail reads a session from its first prompt, model call or tool call on:
        # its transcript usage counts from that time, as there.
        marks = (json.dumps(sorted(sid for (sid,) in found)),) * 3
        firsts = dict(
            self.conn.execute(
                "SELECT sid, MIN(t) FROM (SELECT session_id sid, MIN(ts) t FROM requests WHERE session_id IN (SELECT value FROM json_each(?)) GROUP BY sid"
                " UNION ALL SELECT session_id, MIN(ts) FROM tool_invocations WHERE session_id IN (SELECT value FROM json_each(?)) GROUP BY session_id"
                " UNION ALL SELECT session_id, MIN(ts) FROM session_prompts WHERE session_id IN (SELECT value FROM json_each(?)) GROUP BY session_id)"
                " GROUP BY sid",
                marks,
            ).fetchall()
        )
        window = self.f
        try:
            for (sid,) in found:
                first = firsts.get(sid)
                self.only_session = sid
                self.f = replace(window, since=first) if first and first < window.until else window
                super()._load_fallback_cells()
        finally:
            self.only_session = self._page[0]
            self.f = window

    def _load_confirms(self) -> None:
        # The confirmation rows show the pending questions, not the counts.
        self.confirm_rows = []

    def numbers(self, sid: str) -> dict | None:
        """Tokens, cost, tool calls and prompts of a main agent, as its agent detail shows them."""
        if sid not in self.scope:
            return None
        row = self._agent_row(sid, sid, "", [0] * SPARK_POINTS)
        parts = [row.get(k) for k in ("input", "output", "cache_read", "cache_write")]
        return {
            "tokens": sum(int(v or 0) for v in parts),
            "cost_usd": row["cost_usd"],
            "tool_calls": row["tool_calls"],
            "prompts": (row.get("msgs") or {}).get("user"),
        }


def _numbers_in(db: Any, conn: Any, sids: list[str], now: float) -> dict[str, dict | None]:
    facts = _store_facts(conn, str(getattr(db, "_path", "memory")))
    board = _PageBoard(_PackedReads(conn), now, sids, facts).load(counts_only=True)
    return {sid: board.numbers(sid) for sid in sids}


def _add_numbers(db: Any, conns: list[Any], store_of: dict[str, int], moving: set[str], rows: dict[str, dict]) -> None:
    """Tokens, cost, tool calls, prompts, artifacts and commits, as the agent detail shows them.

    The sessions of one store are counted together on that store's connection. A session
    that moves between stores has rows in both: it is read in its own read scope, one
    connection that sees every store it is in.
    """
    now = time.time()
    numbers: dict[str, dict | None] = {}
    artifacts: dict[str, int] = {}
    commits: dict[str, int] = {}

    def wanted(sids: list[str]) -> dict[str, tuple[list[str], str]]:
        return {sid: (_artifact_sids(sid, {}), rows[sid]["project"]) for sid in sids}

    def count(conn: Any, sids: list[str]) -> None:
        numbers.update(_numbers_in(db, conn, sids, now))
        artifacts.update(artifact_counts(conn, wanted(sids)))
        for sid, n in _rows(conn, "SELECT session_id, COUNT(*) FROM session_commits WHERE session_id IN (SELECT value FROM json_each(?)) GROUP BY session_id", (json.dumps(sids),)):
            commits[sid] = int(n)

    still = [sid for sid in rows if sid not in moving]
    for i, sids in _by_store(store_of, still).items():
        count(conns[i], sids)
    for sid in (s for s in rows if s in moving):
        with read_scope(db, session=sid):
            count(db._conn(), [sid])
    for sid, row in rows.items():
        found = numbers.get(sid)
        if found is None:
            # Records the board does not count (in another store, or outside its window): no agent to open.
            row["_closed"] = True
            continue
        row["tokens"] = int(found["tokens"] or 0)
        row["cost_usd"] = found["cost_usd"]
        row["tool_calls"] = int(found["tool_calls"] or 0)
        row["prompts"] = int(found["prompts"] or 0)
        row["artifacts"] = artifacts.get(sid, 0)
        row["commits"] = commits.get(sid, 0)
