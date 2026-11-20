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

import json
import logging
import os
import shutil
import subprocess
import threading
import time
from collections import deque
from collections.abc import Callable
from dataclasses import replace
from typing import Any

from ..platforms import IS_WINDOWS
from ..records import _session_uuid
from ..stores.base import StoreError
from .board_api import (
    MAX_DETAIL_ROWS,
    SPARK_POINTS,
    TITLE_CHARS,
    Filters,
    _activity_facts,
    _basename,
    _Board,
    _fallback_rows,
    _label,
    _one_line,
    _short,
)
from .projections.history import HistoryScope

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
    " o a class pyc db sqlite " "sqlite" "3 wasm mp3 mp4 mov avi mkv wav flac ogg woff woff2 ttf otf eot psd dmg iso".split()
)
SEARCH_DEFAULT_LIMIT = 200
SEARCH_MAX_LIMIT = 500
# Rows each store gives beyond the page, for the ids that fold into one session.
EXCERPT_CHARS = 120
# Commits whose pull requests are looked up, per request.
MAX_PR_LOOKUPS = 50
# A session whose commit attribution found nothing is not asked again for this long.
ATTRIBUTION_RETRY_S = 600.0
_attributed: dict[str, float] = {}


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


def _artifact_entries(sids: list[str], project: str, *, history: HistoryScope) -> tuple[dict[str, dict], dict[str, int], int, int]:
    rows = history.read("files.artifacts", session_keys=history.keys(sids))
    return _merge_artifacts(
        [(r["session_id"], *r["values"]) for r in rows if r["row_type"] == "index"],
        [(r["session_id"], *r["values"][:2]) for r in rows if r["row_type"] == "folder"],
        [(r["session_id"], *r["values"][:-1]) for r in rows if r["row_type"] == "write"], project,
    )


def artifact_counts(sessions: dict[str, tuple[list[str], str]], *, history: HistoryScope) -> dict[str, int]:
    """The artifact count of each session, (its ids, its project) by session.

    The same rule as the agent detail, with one row per session and per written path: a
    page of sessions can hold hundreds of thousands of indexed files.
    """
    folders: dict[str, tuple[int, int]] = {}
    writes: dict[str, list[tuple[str, int]]] = {}
    rows = history.read("files.artifacts", counts_only=True,
                        session_keys=history.keys(s for ids, _p in sessions.values() for s in ids))
    for r in rows:
        sid = r["session_id"]
        if r["row_type"] == "folder":
            total, _bytes, indexed = r["values"]
            folders[sid] = (total, indexed)
        elif r["row_type"] == "write":
            writes.setdefault(sid, []).append((r["values"][0], r["values"][-1]))
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


def session_artifacts(sids: list[str], project: str, *, history: HistoryScope) -> tuple[list[dict], int, int]:
    """(artifacts newest first and capped, count of all, bytes of the existing ones)."""
    entries, stored, total, bytes_total = _artifact_entries(sids, project, history=history)
    ordered = sorted(entries.items(), key=lambda kv: (-max(kv[1]["_mtime"] or 0.0, kv[1]["last_ts"] or 0.0), kv[0]))
    listed = ordered[:MAX_DETAIL_ROWS]
    out = []
    size_sum = 0
    for path, entry in listed:
        size, mtime = stored.get(path), entry["_mtime"]
        if size is not None:
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
                "exists": None,
                "writes": entry["writes"],
                "first_ts": entry["first_ts"],
                "last_ts": entry["last_ts"],
                "viewable": False,
                "source": "kusto.queryable",
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


def session_commits(db: Any, session: dict, sid: str, *, history: HistoryScope | None = None) -> tuple[list[dict], str]:
    """(commits of the session newest first, with their pull requests; prs_note)."""
    stored_sid = session.get("session_id") or sid
    history = history or HistoryScope.local(db)
    commits = history.read("sessions.commits", sid=stored_sid)
    project = str(session.get("project_path") or "")
    ended = session.get("ended_at")
    started = float(session.get("started_at") or 0.0)
    queryable_only = history.qualified
    if not queryable_only and not commits and ended and started > 0 and project:
        last = _attributed.get(stored_sid)
        if last is None or time.monotonic() - last >= ATTRIBUTION_RETRY_S:
            from ..analysis.git_attribution import commits_in_window

            commits = commits_in_window(project, started, float(ended))
            evidence = getattr(db, "session_evidence", None)
            if evidence is not None and commits:
                try:
                    evidence.publish_commits(stored_sid, project, commits)
                except (StoreError, OSError):
                    log.warning("Could not save Git attribution for %s", stored_sid, exc_info=True)
            _attributed[stored_sid] = time.monotonic()
    commits.sort(key=lambda c: -float(c.get("ts") or 0.0))
    commits = commits[:MAX_DETAIL_ROWS]
    shas = [str(c.get("sha") or "") for c in commits if c.get("sha")]
    if queryable_only:
        prs, note = {}, "Pull request links are not stored in queryable history"
    else:
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
    if sid.startswith("["):
        from .board_api import _session_uuid as scoped_uuid

        uuid = scoped_uuid(sid)
    else:
        uuid = _session_uuid(sid)
    return sorted(s for s in {sid, str(session.get("session_id") or ""), uuid or ""} if s)


def record_section(db: Any, session: dict, sid: str, project: str, *, history: HistoryScope) -> dict:
    """The artifacts and commits fields of the agent detail."""
    sids = _artifact_sids(sid, session)
    artifacts, total, size = session_artifacts(sids, project, history=history)
    commits, note = session_commits(db, session, sid, history=history)
    return {"artifacts": artifacts, "artifacts_total": total, "artifacts_bytes": size, "commits": commits, "prs_note": note}


def empty_record() -> dict:
    return {"artifacts": [], "artifacts_total": 0, "artifacts_bytes": 0, "commits": [], "prs_note": ""}


# ─── Viewing ──────────────────────────────────────────────────────


def is_recorded_artifact(db: Any, path: str, *, history: HistoryScope | None = None) -> bool:
    """Whether *path* is an indexed artifact or a file some session wrote."""
    if not path or not os.path.isabs(path):
        return False
    try:
        candidates = list(dict.fromkeys([path, os.path.normpath(path), os.path.realpath(path)]))
    except (OSError, ValueError):
        return False
    scope = history or HistoryScope.local(db)
    return bool(scope.read("files.recorded", requested_paths=candidates, limit=1, page=True))


# ─── Search over all sessions ─────────────────────────────────────

_MATCH_ORDER = ("title", "project", "prompt", "artifact", "file", "commit")
_RANK = {kind: i for i, kind in enumerate(_MATCH_ORDER)}


def _excerpt(text: str, q: str) -> str:
    """A short line of *text* around the first hit of *q*."""
    clean = " ".join(str(text or "").split())
    at = clean.lower().find(q.lower())
    if at < 0 or len(clean) <= EXCERPT_CHARS:
        return _one_line(clean, EXCERPT_CHARS)
    start = max(0, at - (EXCERPT_CHARS - len(q)) // 2)
    piece = clean[start : start + EXCERPT_CHARS]
    return _one_line(("…" if start else "") + piece + ("…" if start + EXCERPT_CHARS < len(clean) else ""), EXCERPT_CHARS + 2)


# A session the agent detail can open: it has records of its own. The board's agents are
# the sessions with model calls, tool calls or prompts, or usage read from a transcript. A
# sessions row alone, such as a process the monitor saw, is not a session record.


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
    *,
    history: HistoryScope | None = None,
) -> dict:
    """Return one page of matching sessions, newest first."""
    q = (q or "").strip()
    limit = max(1, min(int(limit or SEARCH_DEFAULT_LIMIT), SEARCH_MAX_LIMIT))
    offset = max(0, int(offset or 0))
    history = history or HistoryScope.local(db)
    return _reader_search(db, history, q, tools, since, until, limit, offset)


def _reader_search(db, history, q, tools, since, until, limit, offset, *, now=None):
    from collections import Counter

    from .history_scope import identity, label

    results = history.read(
        "sessions.search", limit=20_000 if history.qualified else limit + 1,
        page_offset=min(offset, 20_000), page_size=limit, search_text=q, requested_tools=tools or [],
        restrict_tools=(tools is not None if history.qualified else bool(tools)),
        moving_sessions=[] if history.qualified else sorted(_moving(db)),
        **{k: v for k, v in (("since", since), ("until", until)) if v is not None},
    )
    totals = Counter({label(r["node_id"]): r["total"] for r in results if r["row_type"] == "count"})
    total = sum(totals.values())
    base = {}
    titles = {}
    groups = {}
    hits = {}
    for r in results:
        if r["row_type"] != "item":
            continue
        key = r["session_id"]
        for data in r["data"]:
            raw = data["session_id"]
            sid = identity(r["node_id"], raw) if history.qualified else raw
            groups.setdefault(key, []).append(sid)
            base[sid] = data
            if data["title"]:
                titles[sid] = data["title_ts"] or 0, data["title"]
            if q:
                hits[sid] = int(data["rank"]), data["match_text"]
    page_keys = list(groups)
    page = {k: _representative(k, groups[k]) for k in page_keys}
    rows = _project_search_page(page, groups, base, titles)
    if rows:
        _add_numbers(rows, history, now=now)
    out = []
    for key, sid in page.items():
        row = rows[sid]
        closed = row.pop("_closed", False)
        if closed and not history.qualified:
            total -= 1
            continue
        if history.qualified:
            node, raw = history.split(sid)
            row.update(node_id=label(node), session_id=raw)
        row["match"], row["match_text"] = _match_of(row["title"], [hits[s] for s in groups[key]], q) if q else ("", "")
        out.append(row)
    result = {"rows": out, "total": max(total, len(out))}
    if history.qualified:
        result["by_node"] = [{"node_id": node, "sessions": n} for node, n in sorted(totals.items())]
    return result


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


def _project_search_page(page, groups, base, first_prompt):
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

    def __init__(self, conn: Any, now: float, sids: list[str], facts: dict[str, set[str]], history: HistoryScope) -> None:
        super().__init__(conn, Filters(since=0.0, until=now + 60.0, buckets=1), now, None, facts=facts, history=history)
        self._page = sorted(set(sids))
        self._keys = history.keys(self._page)

    def _history_window(self, view: str, *, grid: bool = False, **params) -> list[dict]:
        return super()._history_window(view, grid=grid, session_keys=self._keys, **params)

    def _load_fallback_cells(self) -> None:
        found = _fallback_rows(self.history, self.f.since, self.f.until, session_keys=self._keys)
        if not found:
            return
        keys = self.history.keys(row["session_id"] for row in found)
        firsts = {row["session_id"]: row["first_ts"] for row in self.history.read("sessions.first_activities", session_keys=keys)}
        window = self.f
        try:
            for row in found:
                sid = row["session_id"]
                first = firsts.get(sid)
                self.f = replace(window, since=first) if first and first < window.until else window
                self._add_fallback_cells((row,))
        finally:
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


def _numbers_in(sids: list[str], now: float, history: HistoryScope) -> dict[str, dict | None]:
    facts = _activity_facts(history)
    board = _PageBoard(None, now, sids, facts, history).load(counts_only=True)
    return {sid: board.numbers(sid) for sid in sids}


def _add_numbers(rows: dict[str, dict], history: HistoryScope, *, now: float | None = None) -> None:
    """Add the usage, artifact and commit counts shown in agent detail."""
    now = time.time() if now is None else now
    numbers = _numbers_in(list(rows), now, history)
    wanted = {sid: (_artifact_sids(sid, {}), row["project"]) for sid, row in rows.items()}
    artifacts = artifact_counts(wanted, history=history)
    commits = {r["session_id"]: r["count"] for r in history.read("sessions.commit_counts", session_keys=history.keys(rows))}
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
