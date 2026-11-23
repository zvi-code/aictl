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
import math
import os
import shutil
import subprocess
import threading
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from .. import session_lifecycle
from ..ingesters.session_titles import best_title
from ..platforms import IS_WINDOWS
from ..records import _session_uuid
from ..stores.base import StoreError
from .projection_utils import (
    MAX_DETAIL_ROWS,
    STORED_TITLE_CHARS,
    TITLE_CHARS,
    _basename,
    _label,
    _one_line,
    _short,
    _usd,
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
        from .projection_utils import _session_uuid as scoped_uuid

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

_MATCH_ORDER = ("title", "project", "prompt", "artifact", "file", "commit", "id", "source")
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


# ─── The session finder ───────────────────────────────────────────
# One query (sessions.search) selects, filters, sorts and pages the sessions and counts the
# facets; a second one (files.artifacts) counts the artifacts of the page. Nothing is read
# per row, and no row is dropped: a row the agent detail cannot open says why.

FINDER_STATUSES = ("running", "ended", "inferred", "importing", "not_imported")
FINDER_SORTS = ("last_activity", "started", "duration", "tokens", "cost", "tool_calls")
NAME_SOURCES = ("user", "tool", "prompt", "none")
FACETS = ("sessions", "running", "ended", "inferred", "importing", "not_imported")
WITHOUT = ("status", "model", "name_source", "errors", "min_tokens", "min_cost")
NOT_IMPORTED_REASON = "Not imported yet: the history import has not read this session's file, so there is nothing to open."
NO_RECORDS_REASON = "No records stored for this session yet, so the agent detail has nothing to open."


@dataclass(frozen=True)
class SessionQuery:
    """What the finder asks for. ``tools`` None means all tools and [] none."""

    q: str = ""
    tools: list[str] | None = None
    since: float | None = None
    until: float | None = None
    project: str = ""
    model: str = ""
    status: str = ""
    name_source: str = ""
    errors: bool = False
    min_tokens: int = 0
    min_cost: float = 0.0
    sort: str = "last_activity"
    ascending: bool = False
    limit: int = SEARCH_DEFAULT_LIMIT
    offset: int = 0

    def view_params(self) -> dict[str, Any]:
        """The parameters of sessions.search; defaults are left out."""
        out: dict[str, Any] = {
            "search_text": self.q, "requested_tools": list(self.tools or []), "page_size": self.limit,
            "page_offset": min(self.offset, 20_000), "sort_key": self.sort, "ascending": self.ascending,
            "requested_project": self.project, "requested_model": self.model, "requested_status": self.status,
            "requested_name_source": self.name_source, "errors_only": self.errors,
        }
        if self.since is not None:
            out["since"] = self.since
        if self.until is not None:
            out["until"] = self.until
        if self.min_tokens > 0:
            out["min_tokens"] = self.min_tokens
        if self.min_cost > 0:
            out["min_cost"] = self.min_cost
        return out

    def applied(self) -> dict[str, Any]:
        """The filters and order the answer is for, so the page can say what excludes what."""
        return {
            "q": self.q, "tools": self.tools, "since": self.since, "until": self.until, "project": self.project,
            "model": self.model, "status": self.status, "name_source": self.name_source, "errors": self.errors,
            "min_tokens": self.min_tokens, "min_cost": self.min_cost, "sort": self.sort,
            "order": "asc" if self.ascending else "desc", "limit": self.limit, "offset": self.offset,
        }


def finder_query(qs: dict[str, list[str]], *, max_limit: int = SEARCH_MAX_LIMIT, max_offset: int = 250_000) -> SessionQuery:
    """Read the finder's query string. Raises ValueError with the reason for a bad value."""
    from ..tool_scope import normalize_selection, stored_ids_for

    def one(name: str) -> str:
        values = qs.get(name) or [""]
        if len(values) != 1 or len(values[0]) > 4096:
            raise ValueError(f"Invalid {name}")
        return values[0].strip()

    def number(name: str) -> float | None:
        raw = one(name)
        if not raw:
            return None
        try:
            value = float(raw)
        except ValueError:
            value = math.nan
        if not math.isfinite(value) or value < 0:
            raise ValueError(f"{name} must be a number of 0 or more")
        return value

    def whole(name: str, default: int, most: int) -> int:
        value = number(name)
        if value is None:
            return default
        if not value.is_integer() or value > most:
            raise ValueError(f"{name} must be a whole number from 0 to {most}")
        return int(value)

    def choice(name: str, allowed: tuple[str, ...], default: str = "") -> str:
        value = one(name)
        if value and value not in allowed:
            raise ValueError(f"{name} must be one of: {', '.join(allowed)}")
        return value or default

    since, until = number("since"), number("until")
    if since is not None and until is not None and since >= until:
        raise ValueError("since must be earlier than until")
    tools = normalize_selection(part for raw in qs["tool"] for part in raw.split(",")) if "tool" in qs else None
    errors = one("errors")
    if errors not in ("", "0", "1", "true", "false"):
        raise ValueError("errors must be 1 or 0")
    limit = whole("limit", SEARCH_DEFAULT_LIMIT, max_limit) or SEARCH_DEFAULT_LIMIT
    return SessionQuery(
        q=one("q"), tools=stored_ids_for(tools) if tools is not None else None, since=since, until=until,
        project=one("project"), model=one("model"), status=choice("status", FINDER_STATUSES),
        name_source=choice("name", NAME_SOURCES), errors=errors in ("1", "true"),
        min_tokens=whole("min_tokens", 0, 2**53), min_cost=number("min_cost") or 0.0,
        sort=choice("sort", FINDER_SORTS, "last_activity"), ascending=choice("order", ("asc", "desc"), "desc") == "asc",
        limit=limit, offset=whole("offset", 0, max_offset),
    )


def live_pids(snapshot: Any) -> dict[str, set[int]]:
    """The processes alive now, by every id their session is known under.

    Only processes whose session is known from evidence (the tool's own session file or
    the monitor's binding) count; the board's guess by project does not apply here.
    """
    out: dict[str, set[int]] = {}
    for live in getattr(snapshot, "sessions", None) or ():
        if not isinstance(live, dict) or live.get("ended"):
            continue
        pids = {int(p) for p in live.get("pids") or () if p}
        if not pids:
            continue
        for key in (live.get("native_session_id"), live.get("session_id")):
            if not key:
                continue
            for name in {str(key), _session_uuid(str(key)) or ""} - {""}:
                out.setdefault(name, set()).update(pids)
    return out


def model_prices(now: float) -> dict[str, list[float]]:
    """USD per 1M input, output, cache read and cache write tokens of each priced model, as at *now*.

    The query orders and filters by cost with these rates. A row shows its cost priced
    here, by the board's rule, so the shown cost also follows dated price changes.
    """
    from ..data.model_pricing import MODEL_PRICING

    out = {}
    for key, pricing in MODEL_PRICING.items():
        r = pricing.at(now, 0)
        out[key] = [
            r.input_per_m, r.output_per_m,
            r.input_per_m if r.cache_read_per_m is None else r.cache_read_per_m,
            r.input_per_m if r.cache_write_5m_per_m is None else r.cache_write_5m_per_m,
        ]
    return out


def _cost_of_members(members: list[dict], now: float) -> float | None:
    """The stored cost of the calls that carry one, and the list price of the rest, as the board counts it."""
    from .board_projection import _list_cost

    parts = []
    for m in members:
        if m.get("stored_cost") is not None:
            parts.append(float(m["stored_cost"]))
        for model, tokens in (m.get("list_tokens") or {}).items():
            listed = _list_cost(model, *(float(t or 0) for t in tokens), float(m.get("last_ts") or now))[0]
            if listed is not None:
                parts.append(listed)
    return _usd(sum(parts)) if parts else None


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
    query: SessionQuery | None = None,
    live: dict[str, set[int]] | None = None,
    now: float | None = None,
) -> dict:
    """Return one page of matching sessions: running ones first, then by last activity."""
    if query is None:
        query = SessionQuery(
            q=(q or "").strip(), tools=tools, since=since, until=until,
            limit=max(1, min(int(limit or SEARCH_DEFAULT_LIMIT), SEARCH_MAX_LIMIT)), offset=max(0, int(offset or 0)),
        )
    history = history or HistoryScope.local(db)
    return _reader_search(db, history, query, now=now, live=live)


def _reader_search(db, history, query: SessionQuery, *, now=None, live=None):
    from collections import Counter

    from .history_scope import identity, label

    now = time.time() if now is None else now
    live = {} if history.qualified else (live or {})
    moving = set() if history.qualified else _moving(db)
    results = history.read(
        "sessions.search", limit=20_000 if history.qualified else query.limit + 2,
        restrict_tools=query.tools is not None, moving_sessions=sorted(moving), live_sessions=sorted(live),
        now_ts=float(now), idle_window=session_lifecycle.IDLE_END_S, end_grace=session_lifecycle.END_GRACE_S,
        observed_ends=sorted(session_lifecycle.END_OBSERVED), model_prices=model_prices(now), **query.view_params(),
    )
    totals: Counter[str] = Counter()
    facets: Counter[str] = Counter()
    items = []
    for r in results:
        if r["row_type"] == "count":
            totals[label(r["node_id"])] += int(r["total"] or 0)
        elif r["row_type"] == "facets":
            facets.update({k: int(v or 0) for k, v in (r["data"] or {}).items()})
        elif r["row_type"] == "item":
            items.append(r)

    def qualify(node: str, raw: str) -> str:
        return identity(node, raw) if history.qualified else raw

    out = []
    for r in items:
        data, node = r["data"], r["node_id"]
        if data.get("imported"):
            row = _imported_row(data, node, qualify(node, r["session_id"]), qualify, query.q, live, moving, now)
        else:
            row = _unread_row(data, qualify(node, data.get("src_session") or r["session_id"]), query.q)
        out.append((node, row))
    _add_artifacts([row for _node, row in out], history)
    rows = []
    for node, row in out:
        row.pop("_ids", None)
        if history.qualified:
            row.update(node_id=label(node), session_id=history.split(row["id"])[1])
        rows.append(row)
    result = {
        "rows": rows,
        "total": sum(totals.values()),
        "facets": {name: facets.get(name, 0) for name in FACETS},
        "without": {name: facets.get(f"without_{name}", 0) for name in WITHOUT},
        "unfiltered": facets.get("unfiltered", 0),
        "query": query.applied(),
    }
    if history.qualified:
        result["by_node"] = [{"node_id": node, "sessions": n} for node, n in sorted(totals.items())]
    return result


def _imported_row(data, node, key, qualify, q, live, moving, now) -> dict:
    members = data.get("members") or []
    sids = [qualify(node, m["session_id"]) for m in members]
    base = dict(zip(sids, members))
    rep = _representative(key, sids) if sids else key
    first = {s: (m.get("title_ts") or 0, m["title"]) for s, m in base.items() if m.get("title")}
    named = _project_search_page({rep: rep}, {rep: sids}, base, first) if sids else {}
    row = named.get(rep) or {
        "id": rep, "tool": "", "title": _short(rep), "title_source": "", "project": "", "started_at": data.get("started"),
    }
    raw_ids = [m["session_id"] for m in members]
    pids: set[int] = set()
    for i in raw_ids:
        pids |= live.get(i, set()) | live.get(_session_uuid(i) or "", set())
    ended_at = data.get("ended_at")
    lifecycle = session_lifecycle.assess(
        now=now, pids=pids, last_activity=float(data.get("seen") or 0.0), ended_at=ended_at,
        end_reason=str(data.get("end_reason") or ""), idle_window=session_lifecycle.IDLE_END_S,
    )
    openable = int(data.get("facts") or 0) > 0 or any(i in moving for i in raw_ids)
    row.update(
        model=next((m["model"] for m in members if m.get("model")), ""),
        ended_at=ended_at,
        last_activity_at=data.get("last_active") or None,
        duration=data.get("duration"),
        status="running" if lifecycle.live else "inferred" if lifecycle.inferred else "ended",
        status_evidence=lifecycle.evidence,
        end_reason=lifecycle.end_reason,
        pids=sorted(pids),
        tokens=int(data.get("tokens") or 0),
        cost_usd=_cost_of_members(members, now),
        tool_calls=int(data.get("tool_calls") or 0),
        prompts=int(data.get("prompts") or 0),
        errors=int(data.get("errors") or 0),
        artifacts=0,
        commits=sum(int(m.get("commits") or 0) for m in members),
        openable=openable,
        closed_reason=None if openable else NO_RECORDS_REASON,
        _ids=sids,
    )
    row.update(_import_of(data))
    hits = [(int(m["rank"]), m["match_text"]) for m in members if m.get("rank") is not None]
    row["match"], row["match_text"] = _match_of(row["title"], hits, q, raw_ids) if q else ("", "")
    return row


def _unread_row(data, sid, q) -> dict:
    """A session file found on disk whose history is not stored yet."""
    tool, path = str(data.get("src_tool") or ""), str(data.get("source_file") or "")
    name, source = str(data.get("name") or ""), str(data.get("name_source") or "")
    row = {
        "id": sid, "tool": tool,
        "title": _one_line(name, STORED_TITLE_CHARS) if name else f"{_label(tool) or 'Session'} · {_basename(path) or _short(sid)}",
        "title_source": source if name else "",
        "project": str(data.get("project") or ""), "model": "",
        "started_at": None, "ended_at": None, "last_activity_at": data.get("src_mtime"), "duration": None,
        "status": "not_imported",
        "status_evidence": f"session file found ({_size_words(data.get('size_bytes'))}), not read yet",
        "end_reason": "", "pids": [],
        "tokens": None, "cost_usd": None, "tool_calls": None, "prompts": None, "errors": None,
        "artifacts": None, "commits": None,
        "openable": False, "closed_reason": NOT_IMPORTED_REASON,
    }
    row.update(_import_of({**data, "import_state": "waiting"}))
    rank = data.get("rank")
    row["match"], row["match_text"] = "", ""
    if q and rank is not None:
        kind = _MATCH_ORDER[int(rank)]
        text = {"title": name, "id": str(data.get("src_session") or sid), "source": path}.get(kind, "")
        row["match"], row["match_text"] = kind, text if kind == "id" else _excerpt(text, q)
    return row


def _size_words(size: Any) -> str:
    if isinstance(size, bool) or not isinstance(size, (int, float)):
        return "size unknown"
    value = float(size)
    if value < 1024:
        return f"{int(value)} bytes"
    for unit in ("KB", "MB", "GB"):
        value /= 1024
        if value < 1024 or unit == "GB":
            break
    return f"{value:.1f} {unit}"


def _import_of(data: dict) -> dict:
    """Whether the stored history of a session is complete, in words and in numbers."""
    files = data.get("files")
    if files is None:
        return {"import_state": "none", "import_evidence": "no session file indexed; recorded live only", "import": None}
    state = str(data.get("import_state") or "complete")
    files = int(files)
    numbers = {
        "files": files, "complete": int(data.get("complete") or 0), "reading": int(data.get("reading") or 0),
        "waiting": int(data.get("waiting") or 0), "outside_window": int(data.get("outside") or 0),
        "size_bytes": data.get("size_bytes"), "bytes_read": data.get("bytes_read"),
        "modified_at": data.get("src_mtime"), "source_file": data.get("source_file") or "",
    }
    of = f"{files} file" + ("s" if files != 1 else "")
    if state == "waiting":
        words = f"found on disk, not read yet: {of}, {_size_words(numbers['size_bytes'])}"
    elif state == "reading":
        words = f"still importing: {_size_words(numbers['bytes_read'])} of {_size_words(numbers['size_bytes'])} read"
    elif state == "partial":
        words = f"partly outside the import window: {numbers['outside_window']} of {of} not imported"
    else:
        words = f"complete: {of}, {_size_words(numbers['size_bytes'])}"
    return {"import_state": state, "import_evidence": words, "import": numbers}


def _add_artifacts(rows: list[dict], history: HistoryScope) -> None:
    """The artifact count of each stored row of the page, by the agent detail's rule, in one query."""
    wanted = {row["id"]: (row["_ids"], row["project"]) for row in rows if row.get("_ids")}
    if not wanted:
        return
    counts = artifact_counts(wanted, history=history)
    for row in rows:
        if row.get("_ids"):
            row["artifacts"] = counts.get(row["id"], 0)


def _representative(key: str, sids: list[str]) -> str:
    """The id a session is shown under: the tool's own id when the store has it."""
    return key if key in sids else sids[0]


def _match_of(title: str, found: list[tuple[int, str]], q: str, ids: list[str] = ()) -> tuple[str, str]:
    if q.lower() in title.lower():
        return "title", _excerpt(title, q)
    for sid in ids:
        if q.lower() in sid.lower():
            return "id", sid
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
        # The name the tool or the user gave the session, then the first prompt, then the tool and folder.
        name, name_source = best_title((k["name"], k["name_source"]) for k in known if k.get("name"))
        title_source = ""
        if name:
            title, title_source = _one_line(name, STORED_TITLE_CHARS), name_source
        elif texts:
            title, title_source = _one_line(texts[0][1], TITLE_CHARS), "prompt"
        else:
            title = " · ".join(p for p in (_label(head["tool"]), _basename(project)) if p) or _short(rep)
        ended = [k["ended_at"] for k in known if k["ended_at"]]
        out[rep] = {
            "id": rep,
            "tool": head["tool"],
            "title": title,
            "title_source": title_source,
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
