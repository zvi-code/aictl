"""One history store per git repository, one for folders outside git, and the machine store.

A heavy import in one repository writes to its own file, under its own write lock,
so it never makes another project's writes or the board wait.

Layout, next to the machine store (``--db`` / ``[storage] db_path``)::

    history.db                          machine store: snapshots, catalog, UI tables,
                                        files, and the index of project stores
    projects/<repo-name>-<8 hex>.db     one store per git repository
    projects/_shared.db                 sessions launched outside git

Writes are routed row by row: a session's rows stay in the store that holds the
session, a row that names a folder goes to the store of that folder's repository,
and the rest goes to ``_shared``. Tables that do not belong to a session stay in
the machine store.

Reads go through :meth:`ProjectStores._conn`, a connection on the machine store
that ATTACHes the project stores a read needs and shows each per-project table as
a TEMP VIEW over all of them, so the board's SQL runs unchanged. Which stores a
read attaches is set with :meth:`ProjectStores.read_scope`.
"""

from __future__ import annotations

import contextlib
import hashlib
import inspect
import logging
import os
import re
import sqlite3
import threading
import time
import types
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from .context_audit import _path_key
from .ingesters._common import decode_file_uri
from .storage import (
    BUSY_TIMEOUT_S,
    CAPTURE_FULL,
    FLUSH_INTERVAL,
    AgentRow,
    CallFacts,
    EventRow,
    FileWriteRow,
    HistoryDB,
    RequestRow,
    SessionRow,
    ToolInvocationRow,
)

log = logging.getLogger(__name__)

# Tables whose rows belong to one session, and so to one project.
PROJECT_TABLES = (
    "sessions",
    "requests",
    "tool_invocations",
    "session_prompts",
    "session_usage",
    "skill_uses",
    "file_write_events",
    "context_events",
    "agents",
    "session_commits",
    "session_processes",
    "events",
)
SHARED = "_shared"
MACHINE = ""  # the machine store, in the session map: sessions already in it before the split
PROJECTS_DIR = "projects"
IDLE_CLOSE_S = 30 * 60.0
REAP_EVERY_S = 30.0
# SQLite attaches at most 10 databases (Python's build cannot raise it). Nine stores
# are attached; the tenth slot copies the rows of any further store, one at a time.
ATTACH_ROOM = 9
_COPY_PREFIX = "copied_"
# Tables copied for the scope's time range only; the others are copied whole.
_TIMED_TABLES = frozenset(
    {"requests", "tool_invocations", "session_prompts", "skill_uses", "file_write_events", "context_events", "events"}
)
# A session or subagent id the router does not know, looked up in a store.
_FIND_SESSION_SQL = (
    "SELECT 1 FROM sessions WHERE session_id = ?",
    "SELECT 1 FROM agents WHERE agent_id = ?",
    "SELECT 1 FROM session_usage WHERE session_id = ?",
    "SELECT 1 FROM requests WHERE session_id = ? LIMIT 1",
    "SELECT 1 FROM tool_invocations WHERE session_id = ? LIMIT 1",
    "SELECT 1 FROM session_prompts WHERE session_id = ? LIMIT 1",
)
READ_CONNS_PER_THREAD = 3
_ROOT_CACHE_MAX = 8192
_VERSION_COLUMNS = (
    ("requests", "MAX(id)"),
    ("tool_invocations", "MAX(id)"),
    ("session_prompts", "MAX(id)"),
    ("file_write_events", "MAX(id)"),
    ("session_usage", "MAX(last_activity_at)"),
)
# HistoryDB methods that only read. On ProjectStores they run against the read
# connection, which sees every attached store. Every other HistoryDB name that
# ProjectStores does not define goes to the machine store.
_READ_PREFIXES = (
    "query_",
    "count_",
    "find_session",
    "get_session",
    "session_tool_",
    "_query_",
    "_enrich_",
    "_overlay_",
    "content_retained",
)
# Reads whose first argument is a session id: they look in that session's store.
_SESSION_READS = frozenset(
    {
        "get_session",
        "get_session_commits",
        "count_session_commits",
        "get_session_processes",
        "query_agents",
        "query_session_flow",
        "session_tool_invocation_totals",
        "query_session_cost_by_model",
    }
)


# ─── Which store a folder belongs to ──────────────────────────────


def _main_repository(folder: Path, marker: Path) -> str:
    """The main repository of a worktree or submodule whose ``.git`` is a file."""
    try:
        text = marker.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return str(folder)
    found = re.match(r"\s*gitdir:\s*(.+?)\s*$", text, re.MULTILINE)
    if not found:
        return str(folder)
    gitdir = Path(found.group(1))
    if not gitdir.is_absolute():
        gitdir = folder / gitdir
    gitdir = Path(os.path.normpath(gitdir))
    common = gitdir / "commondir"
    try:
        if common.is_file():
            gitdir = Path(os.path.normpath(gitdir / common.read_text(encoding="utf-8").strip()))
    except OSError:
        pass
    # <repository>/.git/worktrees/<name> and <repository>/.git/modules/<name>: the folder that holds .git.
    for part in (gitdir, *gitdir.parents):
        if part.name == ".git":
            return str(part.parent)
    return str(folder)


def _repository_root(path: str) -> str:
    folder = Path(path)
    if not folder.is_absolute():
        return ""
    home = Path.home()
    # A deleted worktree or folder: its nearest folder that still exists.
    probe = folder
    try:
        while not probe.exists():
            if probe.parent == probe:
                return ""
            probe = probe.parent
        if not probe.is_dir():
            probe = probe.parent
    except OSError:
        return ""
    for candidate in (probe, *probe.parents):
        # A home folder, or a folder above it, is never a project.
        if candidate == home or candidate in home.parents:
            return ""
        marker = candidate / ".git"
        try:
            if marker.is_dir():
                return str(candidate)
            if marker.is_file():
                return _main_repository(candidate, marker)
        except OSError:
            return ""
    return ""


_root_cache: dict[str, str] = {}
_root_lock = threading.Lock()


def repository_root(path: str | None) -> str:
    """The main git repository that holds *path*, or "" when it is outside git. Cached per folder."""
    text = decode_file_uri((path or "").strip())
    if not text:
        return ""
    with _root_lock:
        hit = _root_cache.get(text)
    if hit is not None:
        return hit
    root = _repository_root(text)
    with _root_lock:
        if len(_root_cache) >= _ROOT_CACHE_MAX:
            _root_cache.clear()
        _root_cache[text] = root
    return root


def store_key(path: str | None) -> str:
    """The key of the store for rows of *path*: its repository's path key, or ``_shared``."""
    root = repository_root(path)
    return _path_key(root) if root else SHARED


def store_file_name(key: str, root: str = "") -> str:
    """``<repo-name>-<8 hex>.db`` for a repository, ``_shared.db`` for the shared store."""
    if key == SHARED:
        return f"{SHARED}.db"
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", Path((root or key).rstrip("/\\")).name or "repo")[:48]
    digest = hashlib.sha1(key.encode("utf-8")).hexdigest()[:8]
    return f"{name}-{digest}.db"


# ─── One project store ────────────────────────────────────────────


class _ProjectDB(HistoryDB):
    """A HistoryDB for one project: the same file format, without the machine's seed data."""

    @staticmethod
    def _sync_datapoint_catalog(conn: sqlite3.Connection) -> None:
        return None

    @staticmethod
    def _sync_csv_to_db(conn: sqlite3.Connection) -> None:  # type: ignore[override]
        return None

    @staticmethod
    def _seed_ui_layout(conn: sqlite3.Connection) -> None:
        return None

    def _buffer_events(self, events: list[EventRow]) -> None:
        """Events already throttled, stripped, logged and announced by the machine store."""
        with self._lock:
            self._events_buf.extend(events)
        if self._flush_interval <= 0:
            self.flush()


class _ReadConn:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn
        self.aliases: list[tuple[str, str]] = []  # (alias, key)
        self.copied: list[str] = []  # keys of stores whose rows were copied into TEMP tables


def _row_ts(row: Any) -> float:
    return float(getattr(row, "ts", 0.0) or getattr(row, "started_at", 0.0) or 0.0)


class ProjectStores:
    """The machine store plus lazily opened per-project stores, behind HistoryDB's API.

    Write methods route each row to its store. Read methods of HistoryDB run on a
    connection that attaches the stores in the current :meth:`read_scope`. Other
    names go to the machine store.
    """

    def __init__(
        self,
        db_path: Path | str | None = None,
        flush_interval: float = FLUSH_INTERVAL,
        datapoint_logger: Any | None = None,
        retention_days: int = 30,
        capture: str = CAPTURE_FULL,
        max_total_mb: int = 1024,
        content_retention_days: int = 14,
        log_paths: tuple[Path, ...] = (),
        memory_fallback: bool = False,
        idle_close_s: float = IDLE_CLOSE_S,
    ) -> None:
        self.machine = HistoryDB(
            db_path=db_path,
            flush_interval=flush_interval,
            datapoint_logger=datapoint_logger,
            retention_days=retention_days,
            capture=capture,
            max_total_mb=max_total_mb,
            content_retention_days=content_retention_days,
            log_paths=log_paths,
            memory_fallback=memory_fallback,
        )
        self._store_options: dict[str, Any] = {
            "flush_interval": flush_interval,
            "retention_days": retention_days,
            "capture": capture,
            "max_total_mb": max_total_mb,
            "content_retention_days": content_retention_days,
            "memory_fallback": memory_fallback,
        }
        path = self.machine._path
        # Without a file (memory, capture off, or a store that fell back to memory)
        # there is nothing to attach: the machine store holds every project.
        self._split = isinstance(path, Path) and self.machine._shared_conn is None
        self.projects_dir: Path | None = path.parent / PROJECTS_DIR if isinstance(path, Path) and self._split else None
        self._idle_close_s = idle_close_s
        self._stores: dict[str, _ProjectDB] = {}
        self._in_use: dict[str, int] = {}
        self._last_used: dict[str, float] = {}
        self._stores_lock = threading.RLock()
        self._route_lock = threading.RLock()
        self._sessions: dict[str, str] = {}
        self._provisional: set[str] = set()
        self._index: dict[str, dict[str, Any]] = {}
        self._dirty: set[str] = set()
        self._index_lock = threading.Lock()
        self._local = threading.local()
        self._generation: dict[str, int] = {}
        self._found: dict[str, str] = {}
        self._closed = False
        if self._split:
            assert self.projects_dir is not None
            self.projects_dir.mkdir(parents=True, exist_ok=True)
            self._load_index()
            self._load_sessions()
        self._reap_stop = threading.Event()
        self._reaper: threading.Thread | None = None
        if self._split and flush_interval > 0:
            self._reaper = threading.Thread(target=self._reap_loop, daemon=True, name="aictl-project-stores")
            self._reaper.start()

    # ── Index of stores and their activity ─────────────────────

    def _load_index(self) -> None:
        conn = self.machine._conn()
        conn.execute(
            "CREATE TABLE IF NOT EXISTS project_stores(key TEXT PRIMARY KEY, root TEXT NOT NULL DEFAULT '',"
            " file TEXT NOT NULL, first_ts REAL, last_ts REAL, rows INTEGER NOT NULL DEFAULT 0, updated_at REAL)"
        )
        conn.commit()
        for key, root, file, first, last, rows in conn.execute(
            "SELECT key, root, file, first_ts, last_ts, rows FROM project_stores"
        ):
            self._index[key] = {"root": root, "file": file, "first_ts": first, "last_ts": last, "rows": rows or 0}
        # A store the index does not name (written before a crash): known by its own record.
        assert self.projects_dir is not None
        named = {entry["file"] for entry in self._index.values()}
        for file in sorted(self.projects_dir.glob("*.db")):
            if file.name in named:
                continue
            info = self._store_info(file)
            if info is None:
                continue
            key, root = info
            mtime = file.stat().st_mtime
            self._index[key] = {"root": root, "file": file.name, "first_ts": 0.0, "last_ts": mtime, "rows": 0}
            self._dirty.add(key)

    @staticmethod
    def _store_info(file: Path) -> tuple[str, str] | None:
        try:
            conn = sqlite3.connect(f"file:{file}?mode=ro", uri=True, timeout=BUSY_TIMEOUT_S)
        except sqlite3.Error:
            return None
        try:
            row = conn.execute("SELECT key, root FROM store_info LIMIT 1").fetchone()
        except sqlite3.Error:
            row = None
        finally:
            conn.close()
        return (str(row[0]), str(row[1])) if row else None

    def _load_sessions(self) -> None:
        """Which store holds each known session: the machine store's, then each project file's."""
        for (sid,) in self.machine._conn().execute("SELECT session_id FROM sessions"):
            self._sessions[sid] = MACHINE
        for key, entry in list(self._index.items()):
            file = self._file_of(key)
            if file is None or not file.exists():
                continue
            try:
                conn = sqlite3.connect(f"file:{file}?mode=ro", uri=True, timeout=BUSY_TIMEOUT_S)
                try:
                    rows = conn.execute("SELECT session_id, project_path FROM sessions").fetchall()
                finally:
                    conn.close()
            except sqlite3.Error as exc:
                log.warning("Cannot read the sessions of %s: %s", entry["file"], exc)
                continue
            for sid, project in rows:
                self._sessions.setdefault(sid, key)
                if key == SHARED and not project:
                    self._provisional.add(sid)

    def _file_of(self, key: str) -> Path | None:
        if self.projects_dir is None:
            return None
        entry = self._index.get(key)
        return self.projects_dir / (entry["file"] if entry else store_file_name(key))

    def _touch(self, key: str, rows: list[Any]) -> None:
        """Note rows written to a store: their time range and count."""
        if key == MACHINE or not rows or not self._split:
            return
        stamps = [ts for ts in (_row_ts(r) for r in rows) if ts > 0]
        with self._index_lock:
            entry = self._index.setdefault(
                key, {"root": "", "file": store_file_name(key), "first_ts": None, "last_ts": None, "rows": 0}
            )
            entry["rows"] = int(entry.get("rows") or 0) + len(rows)
            self._generation[key] = self._generation.get(key, 0) + 1
            if stamps:
                lo, hi = min(stamps), max(stamps)
                entry["first_ts"] = lo if entry.get("first_ts") is None else min(entry["first_ts"], lo)
                entry["last_ts"] = hi if entry.get("last_ts") is None else max(entry["last_ts"], hi)
            self._dirty.add(key)

    def _save_index(self) -> None:
        if not self._split:
            return
        with self._index_lock:
            dirty = [(k, dict(self._index[k])) for k in self._dirty if k in self._index]
            self._dirty.clear()
        if not dirty:
            return
        now = time.time()
        try:
            conn = self.machine._conn()
            conn.executemany(
                "INSERT OR REPLACE INTO project_stores(key, root, file, first_ts, last_ts, rows, updated_at) VALUES(?,?,?,?,?,?,?)",
                [(k, e["root"], e["file"], e["first_ts"], e["last_ts"], e["rows"], now) for k, e in dirty],
            )
            conn.commit()
        except sqlite3.Error as exc:
            log.debug("Project store index not saved: %s", exc)
            with self._index_lock:
                self._dirty.update(k for k, _e in dirty)

    # ── Opening and closing stores ─────────────────────────────

    def _open(self, key: str) -> _ProjectDB:
        assert self.projects_dir is not None
        with self._index_lock:
            entry = self._index.get(key)
            if entry is None:
                root = "" if key == SHARED else key
                entry = self._index[key] = {
                    "root": root,
                    "file": store_file_name(key, root),
                    "first_ts": None,
                    "last_ts": None,
                    "rows": 0,
                }
                self._dirty.add(key)
        db = _ProjectDB(db_path=self.projects_dir / entry["file"], **self._store_options)
        conn = db._conn()
        conn.execute("CREATE TABLE IF NOT EXISTS store_info(key TEXT PRIMARY KEY, root TEXT NOT NULL)")
        conn.execute("INSERT OR IGNORE INTO store_info(key, root) VALUES(?,?)", (key, entry["root"]))
        conn.commit()
        return db

    def _note_root(self, key: str, root: str) -> None:
        """The repository folder as written, for the file name and the index (the key may fold case)."""
        with self._index_lock:
            entry = self._index.get(key)
            if entry is None:
                self._index[key] = {
                    "root": root,
                    "file": store_file_name(key, root),
                    "first_ts": None,
                    "last_ts": None,
                    "rows": 0,
                }
                self._dirty.add(key)
            elif not entry["root"] and root:
                entry["root"] = root
                self._dirty.add(key)

    @contextlib.contextmanager
    def _using(self, key: str) -> Iterator[HistoryDB]:
        """The store for *key*, kept open while the caller uses it."""
        if key == MACHINE or not self._split:
            yield self.machine
            return
        with self._stores_lock:
            db = self._stores.get(key)
            if db is None:
                db = self._stores[key] = self._open(key)
            self._in_use[key] = self._in_use.get(key, 0) + 1
            self._last_used[key] = time.monotonic()
        try:
            yield db
        finally:
            with self._stores_lock:
                self._in_use[key] -= 1
                self._last_used[key] = time.monotonic()

    def open_stores(self) -> dict[str, HistoryDB]:
        """The project stores open now, by key."""
        with self._stores_lock:
            return dict(self._stores)

    def close_idle(self, idle_s: float | None = None) -> list[str]:
        """Close stores unused for *idle_s* seconds. Returns their keys."""
        limit = self._idle_close_s if idle_s is None else idle_s
        now = time.monotonic()
        closing: list[tuple[str, HistoryDB]] = []
        with self._stores_lock:
            for key, db in list(self._stores.items()):
                if self._in_use.get(key, 0) == 0 and now - self._last_used.get(key, now) >= limit:
                    closing.append((key, self._stores.pop(key)))
        for key, db in closing:
            try:
                db.close()
            except Exception as exc:  # noqa: BLE001 - one store's close must not stop the others
                log.warning("Closing project store %s failed: %s", key, exc)
        return [key for key, _db in closing]

    def _reap_loop(self) -> None:
        while not self._reap_stop.wait(REAP_EVERY_S):
            try:
                self._save_index()
                self.close_idle()
            except Exception as exc:  # noqa: BLE001 - the loop keeps going
                log.warning("Project store upkeep failed: %s", exc)

    # ── Routing ────────────────────────────────────────────────

    def _route(self, session_id: str, project_path: str) -> str:
        """The store key for a row of *session_id* in folder *project_path*."""
        if not self._split:
            return MACHINE
        move = False
        with self._route_lock:
            known = self._sessions.get(session_id) if session_id else None
            if known is not None and session_id not in self._provisional:
                return known
            if not project_path:
                if session_id and known is None:
                    # No folder yet: _shared until a row names one, then it moves.
                    self._sessions[session_id] = SHARED
                    self._provisional.add(session_id)
                return SHARED
            root = repository_root(project_path)
            key = _path_key(root) if root else SHARED
            if root:
                self._note_root(key, root)
            if session_id:
                move = known == SHARED and key != SHARED
                self._sessions[session_id] = key
                self._provisional.discard(session_id)
        if move:
            # Outside the lock: a busy _shared store must not hold the routing of other rows.
            # New rows of the session already go to its project; the copy never replaces them.
            self._move_session(session_id, SHARED, key)
        return key

    def _session_store(self, session_id: str) -> str:
        """The store that holds *session_id*, without placing an unknown one."""
        return self._sessions.get(session_id, MACHINE) if self._split else MACHINE

    def store_of_session(self, session_id: str) -> str | None:
        """The key of the store that holds *session_id*, or None when unknown."""
        with self._route_lock:
            return self._sessions.get(session_id)

    def _move_session(self, session_id: str, src: str, dst: str) -> None:
        """Move a session's rows from *src* to *dst*: it was placed before a row named its folder."""
        with self._using(src) as source, self._using(dst) as target:
            source.flush()
            conn = target._conn()
            if conn.in_transaction:
                conn.commit()
            conn.execute("ATTACH DATABASE ? AS mv", (str(source._path),))
            try:
                for table in PROJECT_TABLES:
                    cols = ", ".join(_copy_columns(conn, table))
                    conn.execute(
                        f"INSERT OR IGNORE INTO main.{table}({cols}) SELECT {cols} FROM mv.{table} WHERE session_id = ?",
                        (session_id,),
                    )
                conn.commit()
                for table in PROJECT_TABLES:
                    conn.execute(f"DELETE FROM mv.{table} WHERE session_id = ?", (session_id,))
                conn.commit()
            except sqlite3.Error as exc:
                conn.rollback()
                log.warning("Moving session %s to its project failed: %s", session_id, exc)
            finally:
                conn.execute("DETACH DATABASE mv")

    # ── Buffered writes ────────────────────────────────────────

    def _event_route(self, e: EventRow) -> str:
        d = e.detail if isinstance(e.detail, dict) else {}
        sid = e.session_id or str(d.get("session_id") or "")
        if not sid:
            return MACHINE
        return self._route(sid, str(d.get("project_path") or ""))

    def append_event(self, event: EventRow) -> None:
        self.append_events([event])

    def append_events(self, events: list[EventRow]) -> None:
        m = self.machine
        kept = [m._guard_event(e) for e in events if not m._throttled(e)]
        for e in kept:
            m._log_event(e)
            m._notify_listeners(e)
        groups: dict[str, list[EventRow]] = {}
        for e in kept:
            groups.setdefault(self._event_route(e), []).append(e)
        for key, rows in groups.items():
            with self._using(key) as db:
                if isinstance(db, _ProjectDB):
                    db._buffer_events(rows)
                else:
                    with db._lock:
                        db._events_buf.extend(rows)
                    if db._flush_interval <= 0:
                        db.flush()
            self._touch(key, rows)

    def append_request(self, row: RequestRow) -> None:
        key = self._route(row.session_id, row.project_path)
        with self._using(key) as db:
            db.append_request(row)
        self._touch(key, [row])

    def append_tool_invocation(self, row: ToolInvocationRow) -> None:
        key = self._route(row.session_id, row.project_path)
        with self._using(key) as db:
            db.append_tool_invocation(row)
        self._touch(key, [row])

    # ── Direct writes ──────────────────────────────────────────

    def upsert_session(self, row: SessionRow) -> None:
        key = self._route(row.session_id, row.project_path)
        with self._using(key) as db:
            db.upsert_session(row)
        self._touch(key, [row])

    def link_session_process(self, session_id: str, pid: int, tool: str = "", role: str = "lead") -> None:
        if not session_id or not pid:
            return
        key = self._route(session_id, "")
        with self._using(key) as db:
            db.link_session_process(session_id, pid, tool, role)

    def batch_link_sessions(self, entries: list[tuple[str, str, int, float, str]]) -> None:
        groups: dict[str, list[tuple[str, str, int, float, str]]] = {}
        for entry in entries:
            groups.setdefault(self._route(entry[0], ""), []).append(entry)
        for key, part in groups.items():
            with self._using(key) as db:
                db.batch_link_sessions(part)

    def update_session_stats(self, session_id: str, **kwargs: Any) -> None:
        if not session_id:
            return
        key = self._route(session_id, str(kwargs.get("project_path") or ""))
        with self._using(key) as db:
            db.update_session_stats(session_id, **kwargs)
        self._touch(key, [types.SimpleNamespace(ts=float(kwargs.get("ts") or time.time()))])

    def update_session_end(self, session_id: str, ended_at: float, **kwargs: Any) -> None:
        if not session_id:
            return
        key = self._route(session_id, str(kwargs.get("project_path") or ""))
        with self._using(key) as db:
            db.update_session_end(session_id, ended_at, **kwargs)
        self._touch(key, [types.SimpleNamespace(ts=ended_at)])

    def upsert_session_commits(self, session_id: str, commits: list[dict]) -> None:
        if not session_id or not commits:
            return
        with self._using(self._route(session_id, "")) as db:
            db.upsert_session_commits(session_id, commits)

    def upsert_session_usage(self, row: dict) -> None:
        key = self._route(str(row.get("session_id") or ""), str(row.get("project_path") or ""))
        with self._using(key) as db:
            db.upsert_session_usage(row)
        ts = float(row.get("last_activity_at") or row.get("started_at") or 0.0)
        self._touch(key, [types.SimpleNamespace(ts=ts)])

    def record_file_write(self, row: FileWriteRow) -> bool:
        if not row.path:
            return False
        key = self._route(row.session_id, row.project_path)
        with self._using(key) as db:
            stored = db.record_file_write(row)
        self._touch(key, [row])
        return stored

    def upsert_agent(self, row: AgentRow) -> None:
        key = self._route(row.session_id, "")
        with self._using(key) as db:
            db.upsert_agent(row)
        self._touch(key, [row])

    def write_call_facts(self, facts: CallFacts) -> int:
        """Split a batch of facts by store; each part is one transaction in its own store."""
        if not len(facts):
            return 0
        parts: dict[str, CallFacts] = {}
        # Rows that name a folder go first, so that their session is placed before the rest.
        attrs = ("requests", "tools", "prompts", "skills", "file_writes", "agents", "context_events")
        for attr in attrs:
            for r in getattr(facts, attr):
                if getattr(r, "project_path", ""):
                    self._route(r.session_id, r.project_path)
        for attr in attrs:
            for r in getattr(facts, attr):
                key = self._route(r.session_id, getattr(r, "project_path", ""))
                getattr(parts.setdefault(key, CallFacts()), attr).append(r)
        written = 0
        for key, part in parts.items():
            with self._using(key) as db:
                written += db.write_call_facts(part)
            self._touch(
                key, [*part.requests, *part.tools, *part.prompts, *part.skills, *part.file_writes, *part.context_events]
            )
        return written

    def set_sessions_tool(self, session_ids: list[str], tool: str) -> None:
        groups: dict[str, list[str]] = {}
        for sid in session_ids:
            groups.setdefault(self._session_store(sid), []).append(sid)
        for key, part in groups.items():
            with self._using(key) as db:
                db.set_sessions_tool(part, tool)

    def update_tool_invocation_duration(
        self, dedup_key: str, duration_ms: float, is_error: int = 0, result_summary: str = ""
    ) -> bool:
        """The row can be in any store: the open ones first, most recently used first."""
        with self._stores_lock:
            keys = sorted(self._stores, key=lambda k: -self._last_used.get(k, 0.0))
        for key in [*keys, MACHINE]:
            with self._using(key) as db:
                if db.update_tool_invocation_duration(dedup_key, duration_ms, is_error, result_summary):
                    return True
        return False

    def clear_stale_pending_confirms(self, before: float) -> int:
        total = self.machine.clear_stale_pending_confirms(before)
        for key in list(self.open_stores()):
            with self._using(key) as db:
                total += db.clear_stale_pending_confirms(before)
        return total

    # ── Every store ────────────────────────────────────────────

    def flush(self) -> int:
        total = self.machine.flush()
        for key in list(self.open_stores()):
            with self._using(key) as db:
                total += db.flush()
        self._save_index()
        return total

    def running_writes(self) -> list[dict[str, Any]]:
        rows = list(self.machine.running_writes())
        for key, db in self.open_stores().items():
            name = Path(str(db._path)).stem if key != SHARED else SHARED
            rows += [{**w, "name": f"{w['name']} [{name}]"} for w in db.running_writes()]
        return sorted(rows, key=lambda r: -r["age_s"])

    def active_writes(self) -> list[str]:
        return [f"{w['name']} ({w['age_s']:.0f} s)" for w in self.running_writes()]

    def auto_maintain(self) -> dict[str, int]:
        result = dict(self.machine.auto_maintain())
        for key in list(self.open_stores()):
            with self._using(key) as db:
                for name, n in db.auto_maintain().items():
                    result[name] = result.get(name, 0) + n
        return result

    def storage_bytes(self) -> int:
        total = self.machine.storage_bytes()
        if self.projects_dir is not None:
            for file in self.projects_dir.glob("*.db*"):
                if not file.name.endswith("-shm"):
                    total += HistoryDB._file_size(file)
        return total

    def storage_status(self) -> dict[str, Any]:
        status = self.machine.storage_status()
        status["storage_bytes"] = self.storage_bytes()
        return status

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._reap_stop.set()
        if self._reaper is not None:
            self._reaper.join(timeout=5)
        with self._stores_lock:
            stores = list(self._stores.items())
            self._stores.clear()
        for key, db in stores:
            try:
                db.close()
            except Exception as exc:  # noqa: BLE001 - close the rest
                log.warning("Closing project store %s failed: %s", key, exc)
        self._save_index()
        self.machine.close()

    def __enter__(self) -> ProjectStores:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    # ── Reads ──────────────────────────────────────────────────

    @contextlib.contextmanager
    def read_scope(
        self,
        since: float | None = None,
        until: float | None = None,
        project: str | None = None,
        session: str | None = None,
    ) -> Iterator[None]:
        """Reads on this thread inside the block attach only the stores they need.

        *project*: that folder's store. *session*: the store that holds it. Otherwise
        the stores with rows inside [*since*, *until*], at most ATTACH_ROOM of them.
        """
        stack = self._scopes()
        stack.append((since, until, project, session))
        try:
            yield
        finally:
            stack.pop()

    def _scopes(self) -> list[tuple]:
        stack = getattr(self._local, "scopes", None)
        if stack is None:
            stack = self._local.scopes = []
        return stack

    def _wanted(self) -> tuple:
        """The read plan of the current scope: (attached keys, copied keys, since, until, generations).

        Stores are ordered newest activity first. SQLite attaches at most 10 databases:
        the first ATTACH_ROOM are attached, the rest are copied (their rows of the
        scope's range) into TEMP tables of the same connection. Every store is read.
        """
        stack = self._scopes()
        since, until, project, session = stack[-1] if stack else (None, None, None, None)
        keys: tuple[str, ...]
        if session:
            key = self._find_store(session)
            keys = (key,) if key else ()
        elif project:
            keys = (store_key(project),)
        else:
            with self._index_lock:
                entries = [(k, dict(e)) for k, e in self._index.items()]
            active = []
            for key, e in entries:
                first, last = e.get("first_ts"), e.get("last_ts")
                if first is None or last is None:
                    if not e.get("rows"):
                        continue
                else:
                    if since is not None and last < since:
                        continue
                    if until is not None and first > until:
                        continue
                active.append((-(last or 0.0), key))
            active.sort()
            keys = tuple(k for _n, k in active)
        attached, copied = keys[:ATTACH_ROOM], keys[ATTACH_ROOM:]
        if not copied:
            return (attached, (), None, None, ())
        with self._index_lock:
            generations = tuple(self._generation.get(k, 0) for k in copied)
        return (attached, copied, since, until, generations)

    def _find_store(self, ident: str) -> str:
        """The store of a session or subagent id: from the router, else looked up in every store.

        "" for the machine store, or when no store has it.
        """
        with self._route_lock:
            key = self._sessions.get(ident)
            if key is None:
                key = self._found.get(ident)
        if key is not None:
            return key
        with self._index_lock:
            keys = list(self._index)
        for key in keys:
            file = self._file_of(key)
            if file is None or not file.exists():
                continue
            try:
                conn = sqlite3.connect(f"file:{file}?mode=ro", uri=True, timeout=BUSY_TIMEOUT_S)
                try:
                    hit = any(conn.execute(sql, (ident,)).fetchone() is not None for sql in _FIND_SESSION_SQL)
                finally:
                    conn.close()
            except sqlite3.Error as exc:
                log.debug("Cannot look in %s: %s", file.name, exc)
                continue
            if hit:
                with self._route_lock:
                    self._found[ident] = key
                return key
        return MACHINE

    def _conn(self) -> sqlite3.Connection:
        """This thread's read connection for the current scope.

        It is a connection on the machine store: tables that are not per project are
        the machine's own. Per-project tables are TEMP VIEWs over the machine's rows
        (written before the split), every attached store, and the copied rows of the
        stores beyond SQLite's attach limit. This connection never sets a pragma that
        takes a lock.
        """
        if not self._split:
            return self.machine._conn()
        return self._read_state().conn

    def _read_state(self) -> _ReadConn:
        """A connection per read plan, so a nested scope never changes a connection in use."""
        conns = getattr(self._local, "conns", None)
        if conns is None:
            conns = self._local.conns = {}
        plan = self._wanted()
        state = conns.pop(plan, None)
        if state is None:
            conn = sqlite3.connect(str(self.machine._path), timeout=BUSY_TIMEOUT_S)
            conn.execute("PRAGMA synchronous=OFF")
            conn.execute("PRAGMA cache_size=-8000")
            conn.execute("PRAGMA temp_store=MEMORY")
            self.machine._install_capture_guards(conn)
            state = _ReadConn(conn)
            self._attach(state, plan)
        conns[plan] = state
        while len(conns) > READ_CONNS_PER_THREAD:
            # Not closed here: a caller may still hold it. It closes when released.
            conns.pop(next(iter(conns)))
        return state

    def _attach(self, state: _ReadConn, plan: tuple) -> None:
        attached, copied, since, until, _generations = plan
        conn = state.conn
        for i, key in enumerate(attached):
            file = self._file_of(key)
            if file is None or not file.exists():
                continue
            alias = f"p{i}"
            try:
                conn.execute("ATTACH DATABASE ? AS " + alias, (str(file),))
            except sqlite3.Error as exc:
                log.warning("Cannot read project store %s: %s", file.name, exc)
                continue
            state.aliases.append((alias, key))
        if copied:
            self._copy_stores(state, copied, since, until)
        if not state.aliases and not state.copied:
            return
        for table in PROJECT_TABLES:
            cols = _columns(conn, "main", table)
            # The machine store's own rows (written before the split) only when it has
            # some: a view of one store alone is flattened, and keeps its indexes in joins.
            arms: list[tuple[str, list[str]]] = []
            if conn.execute(f"SELECT 1 FROM main.{table} LIMIT 1").fetchone() is not None:
                arms.append((f"main.{table}", cols))
            for alias, _key in state.aliases:
                have = _columns(conn, alias, table)
                if have:
                    arms.append((f"{alias}.{table}", have))
            if state.copied:
                arms.append((f"temp.{_COPY_PREFIX}{table}", cols))
            if not arms:
                arms = [(f"main.{table}", cols)]
            common = [c for c in cols if all(c in have for _a, have in arms)]
            select = ", ".join(common)
            body = " UNION ALL ".join(f"SELECT {select} FROM {source}" for source, _c in arms)
            conn.execute(f"CREATE TEMP VIEW {table} AS {body}")

    def _copy_stores(self, state: _ReadConn, keys: tuple[str, ...], since: float | None, until: float | None) -> None:
        """Copy the scope's rows of the stores beyond the attach limit into TEMP tables.

        Timed tables are copied for [since, until], the others whole. The spare attach
        slot takes one store at a time.
        """
        conn = state.conn
        cols = {table: _columns(conn, "main", table) for table in PROJECT_TABLES}
        for table, names in cols.items():
            conn.execute(
                f"CREATE TEMP TABLE {_COPY_PREFIX}{table} AS SELECT {', '.join(names)} FROM main.{table} WHERE 0"
            )
        for key in keys:
            file = self._file_of(key)
            if file is None or not file.exists():
                continue
            try:
                conn.execute("ATTACH DATABASE ? AS cp", (str(file),))
            except sqlite3.Error as exc:
                log.warning("Cannot read project store %s: %s", file.name, exc)
                continue
            try:
                for table, names in cols.items():
                    have = set(_columns(conn, "cp", table))
                    common = ", ".join(c for c in names if c in have)
                    if not common:
                        continue
                    where: list[str] = []
                    params: list[float] = []
                    if table in _TIMED_TABLES:
                        if since is not None:
                            where.append("ts >= ?")
                            params.append(since)
                        if until is not None:
                            where.append("ts <= ?")
                            params.append(until)
                    sql = f"INSERT INTO temp.{_COPY_PREFIX}{table}({common}) SELECT {common} FROM cp.{table}"
                    if where:
                        sql += " WHERE " + " AND ".join(where)
                    conn.execute(sql, params)
                conn.commit()
                state.copied.append(key)
            finally:
                conn.execute("DETACH DATABASE cp")
        for table in PROJECT_TABLES:
            conn.execute(f"CREATE INDEX temp.{_COPY_PREFIX}{table}_sid ON {_COPY_PREFIX}{table}(session_id)")
        conn.commit()

    def attached_stores(self) -> list[str]:
        """Keys of the project stores this thread's read connection reads, attached or copied."""
        if not self._split:
            return []
        state = self._read_state()
        return [key for _alias, key in state.aliases] + list(state.copied)

    def version_marks(self) -> tuple:
        """Changes when rows arrive in any store the current scope reads."""
        if not self._split:
            conn = self.machine._conn()
            return ((), tuple(conn.execute(f"SELECT {c} FROM {t}").fetchone()[0] for t, c in _VERSION_COLUMNS))
        plan = self._wanted()
        state = self._read_state()
        marks = []
        for schema in ["main", *(alias for alias, _key in state.aliases)]:
            for table, column in _VERSION_COLUMNS:
                marks.append(state.conn.execute(f"SELECT {column} FROM {schema}.{table}").fetchone()[0])
        # Copied stores: the writes this process made to them, counted.
        return (plan[0] + plan[1], tuple(marks), plan[4])

    def __getattr__(self, name: str) -> Any:
        machine = self.__dict__.get("machine")
        if machine is None:
            raise AttributeError(name)
        if self.__dict__.get("_split") and name.startswith(_READ_PREFIXES):
            func = inspect.getattr_static(HistoryDB, name, None)
            if inspect.isfunction(func):
                bound = types.MethodType(func, self)
                if name in _SESSION_READS:
                    return self._in_session_scope(bound)
                return bound
        return getattr(machine, name)

    def _in_session_scope(self, method: Any) -> Any:
        def run(session_id: str, *args: Any, **kwargs: Any) -> Any:
            with self.read_scope(session=session_id):
                return method(session_id, *args, **kwargs)

        return run


def _columns(conn: sqlite3.Connection, schema: str, table: str) -> list[str]:
    return [r[1] for r in conn.execute(f"PRAGMA {schema}.table_info({table})")]


def _copy_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    """Columns to copy a row to another store: all but an INTEGER PRIMARY KEY of its own."""
    info = conn.execute(f"PRAGMA main.table_info({table})").fetchall()
    keys = [r for r in info if r[5]]
    own_id = keys[0][1] if len(keys) == 1 and str(keys[0][2]).upper() == "INTEGER" else None
    return [r[1] for r in info if r[1] != own_id]
