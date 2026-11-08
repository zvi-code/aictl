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
from collections.abc import Callable, Iterator
from typing import Any

from ..platforms import IS_WINDOWS
from ..storage import _session_uuid
from .board_api import MAX_DETAIL_ROWS, TITLE_CHARS, _basename, _label, _one_line, _short

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


def _rows(conn: Any, sql: str, params: Any = ()) -> list[tuple]:
    """Rows of one store; a store without the table (an old file) has none."""
    try:
        return list(conn.execute(sql, params).fetchall())
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


def session_artifacts(conn: Any, sids: list[str], project: str) -> tuple[list[dict], int, int]:
    """(artifacts newest first and capped, count of all, bytes of the existing ones)."""
    marks = json.dumps(sorted(set(sids)))
    in_sids = "session_id IN (SELECT value FROM json_each(?))"
    entries: dict[str, dict] = {}
    stored: dict[str, int] = {}
    for path, part, size, mtime in _rows(conn, f"SELECT path, folder, size_bytes, mtime FROM session_artifacts WHERE {in_sids}", (marks,)):
        entries[path] = {"kind": "session-folder", "folder": part or "", "writes": 0, "first_ts": None, "last_ts": None, "_mtime": mtime}
        stored[path] = int(size or 0)
    folder_rows = _rows(conn, f"SELECT COALESCE(SUM(files_total), 0), COALESCE(SUM(bytes_total), 0) FROM session_folders WHERE {in_sids}", (marks,))
    files_total, bytes_total = (int(folder_rows[0][0]), int(folder_rows[0][1])) if folder_rows else (0, 0)
    indexed = len(entries)
    for path, writes, first, last, size in _rows(
        conn, f"SELECT path, COUNT(*), MIN(ts), MAX(ts), MAX(size_bytes) FROM file_write_events WHERE {in_sids} GROUP BY path", (marks,)
    ):
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


def record_section(db: Any, conn: Any, session: dict, sid: str, project: str) -> dict:
    """The artifacts and commits fields of the agent detail."""
    sids = [s for s in {sid, str(session.get("session_id") or ""), _session_uuid(sid) or ""} if s]
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
    ("project", "SELECT session_id, project_path FROM sessions WHERE project_path LIKE ? ESCAPE '\\'"),
    ("prompt", "SELECT session_id, text, MIN(ts) FROM session_prompts WHERE text LIKE ? ESCAPE '\\' GROUP BY session_id"),
    ("artifact", "SELECT session_id, path, MAX(mtime) FROM session_artifacts WHERE path LIKE ? ESCAPE '\\' GROUP BY session_id"),
    ("file", "SELECT session_id, path, MAX(ts) FROM file_write_events WHERE path LIKE ? ESCAPE '\\' GROUP BY session_id"),
    ("commit", "SELECT session_id, subject, MAX(ts) FROM session_commits WHERE subject LIKE ? ESCAPE '\\' GROUP BY session_id"),
)


def _filters_sql(tools: list[str] | None, since: float | None, until: float | None) -> tuple[str, list[Any]]:
    where, params = ["session_id != ''"], []
    if tools:
        where.append("tool IN (SELECT value FROM json_each(?))")
        params.append(json.dumps(tools))
    if since is not None:
        where.append("started_at >= ?")
        params.append(since)
    if until is not None:
        where.append("started_at <= ?")
        params.append(until)
    return " AND ".join(where), params


def search_sessions(
    db: Any,
    q: str = "",
    tools: list[str] | None = None,
    since: float | None = None,
    until: float | None = None,
    limit: int = SEARCH_DEFAULT_LIMIT,
    offset: int = 0,
) -> dict:
    """Sessions of all stores and all time that match *q*, newest first, one page of them."""
    q = (q or "").strip()
    limit = max(1, min(int(limit or SEARCH_DEFAULT_LIMIT), SEARCH_MAX_LIMIT))
    offset = max(0, int(offset or 0))
    where, params = _filters_sql(tools, since, until)
    hits: dict[str, tuple[int, str]] = {}
    with every_store(db) as conns:
        if q:
            pattern = _like(q)
            for conn in conns:
                for kind, sql in _HIT_SQL:
                    for row in _rows(conn, sql, (pattern,)):
                        sid, text = row[0], row[1]
                        rank = _RANK[kind]
                        if sid and (sid not in hits or rank < hits[sid][0]):
                            hits[sid] = (rank, str(text or ""))
            if not hits:
                return {"rows": [], "total": 0}
            marks = json.dumps(sorted(hits))
            listing = f"SELECT session_id, started_at FROM sessions WHERE {where} AND session_id IN (SELECT value FROM json_each(?))"
            found = [r for conn in conns for r in _rows(conn, listing, (*params, marks))]
        else:
            found = [r for conn in conns for r in _rows(conn, f"SELECT session_id, started_at FROM sessions WHERE {where}", params)]
        # One row per logical session: ids that share a tool UUID are one session.
        groups: dict[str, list[str]] = {}
        started: dict[str, float] = {}
        for sid, at in found:
            key = _session_uuid(sid) or sid
            members = groups.setdefault(key, [])
            if sid not in members:
                members.append(sid)
            started[key] = max(started.get(key, 0.0), float(at or 0.0))
        ordered = sorted(groups, key=lambda k: (-started[k], k))
        page_keys = ordered[offset : offset + limit]
        page = {key: _representative(key, groups[key]) for key in page_keys}
        members = [sid for key in page_keys for sid in groups[key]]
        rows = _page_rows(conns, page, members, groups)
    out = []
    for key in page_keys:
        row = rows.get(page[key])
        if row is None:
            continue
        if q:
            match, text = _match_of(row["title"], [hits[s] for s in groups[key] if s in hits], q)
            row["match"], row["match_text"] = match, text
        else:
            row["match"], row["match_text"] = "", ""
        out.append(row)
    return {"rows": out, "total": len(ordered)}


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


def _page_rows(conns: list[Any], page: dict[str, str], members: list[str], groups: dict[str, list[str]]) -> dict[str, dict]:
    """The shown fields of the sessions of one page, read from every store."""
    marks = json.dumps(sorted(set(members)))
    in_sids = "session_id IN (SELECT value FROM json_each(?))"
    base: dict[str, dict] = {}
    usage: dict[str, tuple] = {}
    first_prompt: dict[str, tuple[float, str]] = {}
    prompts: dict[str, int] = {}
    folder_files: dict[str, int] = {}
    folders: dict[str, str] = {}
    writes: dict[str, set[str]] = {}
    commits: dict[str, int] = {}
    for conn in conns:
        for sid, tool, project, st, en, tokens, cost, calls in _rows(
            conn,
            "SELECT session_id, tool, project_path, started_at, ended_at,"
            " COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0) + COALESCE(cache_read_tokens, 0) + COALESCE(cache_creation_tokens, 0),"
            f" cost_usd, tool_call_count FROM sessions WHERE {in_sids}",
            (marks,),
        ):
            prior = base.get(sid)
            if prior is None or (tokens or 0) > prior["tokens"]:
                base[sid] = {"tool": tool or "", "project": project or "", "started_at": st, "ended_at": en, "tokens": tokens or 0, "cost_usd": cost, "tool_calls": calls or 0}
        for sid, tokens, cost, calls in _rows(
            conn,
            "SELECT session_id, COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0) + COALESCE(cache_read_tokens, 0)"
            f" + COALESCE(cache_creation_tokens, 0), cost_usd, tool_call_count FROM session_usage WHERE {in_sids}",
            (marks,),
        ):
            usage[sid] = (tokens or 0, cost, calls or 0)
        for sid, text, ts in _rows(
            conn,
            f"SELECT session_id, text, MIN(ts) FROM session_prompts WHERE {in_sids} AND agent_id = '' AND text != '' GROUP BY session_id",
            (marks,),
        ):
            if sid not in first_prompt or (ts or 0.0) < first_prompt[sid][0]:
                first_prompt[sid] = (ts or 0.0, text)
        for sid, n in _rows(conn, f"SELECT session_id, COUNT(*) FROM session_prompts WHERE {in_sids} AND agent_id = '' GROUP BY session_id", (marks,)):
            prompts[sid] = prompts.get(sid, 0) + int(n)
        for sid, n, folder in _rows(conn, f"SELECT session_id, files_total, folder FROM session_folders WHERE {in_sids}", (marks,)):
            folder_files[sid] = max(folder_files.get(sid, 0), int(n or 0))
            folders[sid] = folder or ""
        for sid, path in _rows(conn, f"SELECT DISTINCT session_id, path FROM file_write_events WHERE {in_sids}", (marks,)):
            writes.setdefault(sid, set()).add(path)
        for sid, n in _rows(conn, f"SELECT session_id, COUNT(*) FROM session_commits WHERE {in_sids} GROUP BY session_id", (marks,)):
            commits[sid] = commits.get(sid, 0) + int(n)
    out: dict[str, dict] = {}
    by_rep = {rep: key for key, rep in page.items()}
    for rep, key in by_rep.items():
        sids = groups[key]
        known = [base[s] for s in sids if s in base]
        if not known:
            continue
        head = base.get(rep) or known[0]
        project = head["project"] or next((k["project"] for k in known if k["project"]), "")
        tokens, cost, calls = head["tokens"], head["cost_usd"], head["tool_calls"]
        exact = [usage[s] for s in sids if s in usage]
        if exact:
            tokens, cost, calls = max(tokens, exact[0][0]), exact[0][1] if exact[0][1] is not None else cost, max(calls, exact[0][2])
        texts = sorted(first_prompt[s] for s in sids if s in first_prompt)
        if texts:
            title = _one_line(texts[0][1], TITLE_CHARS)
        else:
            title = " · ".join(p for p in (_label(head["tool"]), _basename(project)) if p) or _short(rep)
        own = [folders[s] for s in sids if folders.get(s)]
        written = {
            p
            for s in sids
            for p in writes.get(s, ())
            if p and os.path.isabs(p) and not _under(p, project) and not any(_under(p, f) for f in own)
        }
        ended = [k["ended_at"] for k in known if k["ended_at"]]
        out[rep] = {
            "id": rep,
            "tool": head["tool"],
            "title": title,
            "project": project,
            "started_at": min((k["started_at"] for k in known if k["started_at"]), default=None),
            "ended_at": max(ended) if ended and len(ended) == len(known) else None,
            "tokens": int(tokens),
            "cost_usd": round(float(cost), 6) if cost else None,
            "tool_calls": int(calls),
            "prompts": sum(prompts.get(s, 0) for s in sids),
            "artifacts": max((folder_files.get(s, 0) for s in sids), default=0) + len(written),
            "commits": sum(commits.get(s, 0) for s in sids),
        }
    return out
