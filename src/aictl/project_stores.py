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
    FLUSH_CHUNK_ROWS,
    FLUSH_INTERVAL,
    FLUSH_YIELD_S,
    AgentRow,
    CallFacts,
    EventRow,
    FileWriteRow,
    HistoryDB,
    RequestRow,
    SessionRow,
    ToolInvocationRow,
    connect_file,
    is_lock_error,
)
from .storage_migrations import CURRENT_VERSION as SCHEMA_VERSION

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
    "session_folders",
    "session_artifacts",
    "session_loaded_files",
    "events",
)
SHARED = "_shared"
MACHINE = ""  # the machine store, in the session map: sessions already in it before the split
# The project stores sit in "<db stem>-projects" next to the machine store: a name no
# user folder of the projects themselves takes by chance.
PROJECTS_SUFFIX = "-projects"
IDLE_CLOSE_S = 30 * 60.0
REAP_EVERY_S = 30.0
# SQLite attaches at most 10 databases (Python's build cannot raise it). Nine stores
# are attached; the tenth slot copies the rows of any further store, one at a time.
ATTACH_ROOM = 9
_COPY_PREFIX = "copied_"
# A session or agent id found in no store is not looked up again for this long.
MISS_TTL_S = 30.0
_MISSED_MAX = 10_000
# Upkeep that opens every store, closed ones too, runs at most this often.
FULL_PASS_S = 600.0
# Sessions written to the machine store before the split move to their project stores
# in the background, for at most this long per upkeep pass.
SPLIT_PASS_S = 5.0
# The daemon prints the split's progress at most this often.
SPLIT_REPORT_S = 60.0
# Tables that name a session, besides sessions, read at startup to place sessions.
_SESSION_TABLES = ("session_processes", "agents")
_SESSION_TABLES_SHARED = ("session_processes", "agents", "requests", "tool_invocations", "session_prompts", "events")
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


def projects_dir_for(db_path: Path | str) -> Path:
    """The folder of the project stores of the machine store at *db_path*."""
    path = Path(db_path)
    return path.with_name(path.stem + PROJECTS_SUFFIX)


def is_project_store(file: Path) -> bool:
    """A database file that a ProjectStores made: it has a store_info table."""
    return _store_info(file) is not None


def project_store_files(db_path: Path | str) -> list[Path]:
    """The project stores of the machine store at *db_path*, each with its -wal and -shm."""
    folder = projects_dir_for(db_path)
    if not folder.is_dir():
        return []
    files: list[Path] = []
    for file in sorted(folder.glob("*.db")):
        if is_project_store(file):
            files += [
                f for f in (file, file.with_name(file.name + "-wal"), file.with_name(file.name + "-shm")) if f.exists()
            ]
    return files


def remove_project_stores(db_path: Path | str) -> int:
    """Delete the project stores of the machine store at *db_path*, and nothing else.

    Only files with a store_info table and their -wal and -shm go; the folder goes
    when it is empty then. Returns the number of files removed.
    """
    files = project_store_files(db_path)
    for file in files:
        file.unlink(missing_ok=True)
    folder = projects_dir_for(db_path)
    try:
        folder.rmdir()
    except OSError:
        pass  # absent, or it holds files that are not project stores
    return len(files)


def _store_info(file: Path) -> tuple[str, str] | None:
    try:
        conn = _read_only(file)
    except sqlite3.Error:
        return None
    try:
        row = conn.execute("SELECT key, root FROM store_info LIMIT 1").fetchone()
    except sqlite3.Error:
        row = None
    finally:
        conn.close()
    return (str(row[0]), str(row[1])) if row else None


def _read_only(file: Path) -> sqlite3.Connection:
    """A read-only connection; the path is quoted, so %, ? and # in it stay part of it."""
    return sqlite3.connect(file.absolute().as_uri() + "?mode=ro", uri=True, timeout=BUSY_TIMEOUT_S)


def _schema_version(file: Path) -> int:
    try:
        conn = _read_only(file)
    except sqlite3.Error:
        return 0
    try:
        row = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()
        return int(row[0] or 0) if row else 0
    except sqlite3.Error:
        return 0
    finally:
        conn.close()


def _add_up(total: dict[str, Any], part: dict[str, Any], keep: tuple[str, ...] = ()) -> None:
    """Sum the numbers of *part* into *total*, nested dicts too; *keep* names stay as first seen."""
    for name, value in part.items():
        if name in keep and name in total:
            continue
        if isinstance(value, dict):
            _add_up(total.setdefault(name, {}), value)
        elif isinstance(value, (int, float)) and not isinstance(value, bool) and name not in keep:
            total[name] = (total.get(name) or 0) + value
        else:
            total.setdefault(name, value)


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


_NOW_ROW = types.SimpleNamespace(ts=0.0)  # a write with no time of its own: counted, no time range


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
        say: Any | None = None,
    ) -> None:
        # Progress a person watches for, such as the split of an old history (the daemon prints it).
        self._say = say or log.info
        self._split_total: int | None = None
        self._split_reported = 0.0
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
        self.projects_dir: Path | None = projects_dir_for(path) if isinstance(path, Path) and self._split else None
        self._idle_close_s = idle_close_s
        self._stores: dict[str, _ProjectDB] = {}
        self._visiting: dict[str, HistoryDB] = {}  # closed stores opened for one visit of _each_store
        self._lock_noted: set[str] = set()
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
        self._missed: dict[str, float] = {}
        self._opening: dict[str, threading.Event] = {}
        self._pending_moves: dict[str, tuple[str, str]] = {}
        self._main_rows: set[str] = set()
        self._last_full_pass = 0.0
        self._closed = False
        if self._split:
            assert self.projects_dir is not None
            self.projects_dir.mkdir(parents=True, exist_ok=True)
            self._load_index()
            self._migrate_stores()
            self._load_sessions()
            self._retry_moves()
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
            info = _store_info(file)
            if info is None:
                continue
            key, root = info
            mtime = file.stat().st_mtime
            self._index[key] = {"root": root, "file": file.name, "first_ts": 0.0, "last_ts": mtime, "rows": 0}
            self._dirty.add(key)

    def _migrate_stores(self) -> None:
        """Bring every store to the current schema: reads attach store files without opening them."""
        for key in list(self._index):
            file = self._file_of(key)
            if file is None or not file.exists() or _schema_version(file) >= SCHEMA_VERSION:
                continue
            try:
                self._project_db(file, flush_thread=False).close()
            except (sqlite3.Error, OSError) as exc:
                log.warning("Cannot migrate project store %s: %s", file.name, exc)

    def _load_sessions(self) -> None:
        """Which store holds each known session: the machine store's, then each project file's.

        A session can have rows but no sessions row (a process link, a subagent, a call):
        those tables name it too.
        """
        for table in ("sessions", "session_processes", "agents"):
            for (sid,) in self.machine._conn().execute(
                f"SELECT DISTINCT session_id FROM {table} WHERE session_id != ''"
            ):
                self._sessions.setdefault(sid, MACHINE)
        holders: dict[str, set[str]] = {}
        with_folder: set[str] = set()
        for key, entry in list(self._index.items()):
            file = self._file_of(key)
            if file is None or not file.exists():
                continue
            tables = _SESSION_TABLES_SHARED if key == SHARED else _SESSION_TABLES
            try:
                conn = _read_only(file)
                try:
                    named = conn.execute("SELECT session_id, project_path FROM sessions").fetchall()
                    for table in tables:
                        named += [
                            (sid, "")
                            for (sid,) in conn.execute(
                                f"SELECT DISTINCT session_id FROM {table} WHERE session_id != ''"
                            )
                        ]
                finally:
                    conn.close()
            except sqlite3.Error as exc:
                log.warning("Cannot read the sessions of %s: %s", entry["file"], exc)
                continue
            for sid, project in named:
                holders.setdefault(sid, set()).add(key)
                if project:
                    with_folder.add(sid)
        for sid, keys in holders.items():
            if sid in self._sessions:
                continue  # in the machine store
            projects = sorted(k for k in keys if k != SHARED)
            if not projects:
                self._sessions[sid] = SHARED
                if sid not in with_folder:
                    self._provisional.add(sid)
                continue
            self._sessions[sid] = projects[0]
            if SHARED in keys:
                # A move that stopped half-way (a crash between the two files): finish it.
                self._pending_moves[sid] = (SHARED, projects[0])

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
        db = self._project_db(self.projects_dir / entry["file"])
        conn = db._conn()
        conn.execute("CREATE TABLE IF NOT EXISTS store_info(key TEXT PRIMARY KEY, root TEXT NOT NULL)")
        conn.execute("INSERT OR IGNORE INTO store_info(key, root) VALUES(?,?)", (key, entry["root"]))
        # Automatic retention was armed when the machine store was: a new store does not
        # restart the grace period of its imported rows.
        armed = (
            self.machine._conn()
            .execute("SELECT value FROM maintenance_state WHERE key = 'retention_armed_at'")
            .fetchone()
        )
        if armed is not None:
            conn.execute(
                "INSERT OR IGNORE INTO maintenance_state(key, value) VALUES('retention_armed_at', ?)", (armed[0],)
            )
        conn.commit()
        return db

    def _project_db(self, file: Path, *, flush_thread: bool = True) -> _ProjectDB:
        """Open one project store. A store that cannot be opened runs in memory, and says so."""
        options = self._store_options if flush_thread else {**self._store_options, "flush_interval": 0}
        db = _ProjectDB(db_path=file, **options)
        if db._shared_conn is not None:
            log.warning("Project store %s runs in memory, its rows are not kept: %s", file.name, db.degraded_reason)
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
        """The store for *key*, kept open while the caller uses it.

        A store is opened outside the global lock: a slow disk delays only the writers
        of that store.
        """
        if key == MACHINE or not self._split:
            yield self.machine
            return
        while True:
            with self._stores_lock:
                db = self._stores.get(key)
                if db is not None:
                    self._in_use[key] = self._in_use.get(key, 0) + 1
                    self._last_used[key] = time.monotonic()
                    break
                opening = self._opening.get(key)
                mine = opening is None
                if mine:
                    opening = self._opening[key] = threading.Event()
            assert opening is not None
            if not mine:
                opening.wait()
                continue
            try:
                db = self._open(key)
            except BaseException:
                with self._stores_lock:
                    self._opening.pop(key, None)
                opening.set()
                raise
            with self._stores_lock:
                self._stores[key] = db
                self._opening.pop(key, None)
                self._in_use[key] = self._in_use.get(key, 0) + 1
                self._last_used[key] = time.monotonic()
            opening.set()
            break
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
                self._retry_moves()
                self.split_machine_sessions(SPLIT_PASS_S)
                self._save_index()
                self.close_idle()
            except Exception as exc:  # noqa: BLE001 - the loop keeps going
                log.warning("Project store upkeep failed: %s", exc)

    # ── Routing ────────────────────────────────────────────────

    def _route(self, session_id: str, project_path: str) -> str:
        """The store key for a row of *session_id* in folder *project_path*."""
        if not self._split:
            return MACHINE
        with self._route_lock:
            known = self._sessions.get(session_id) if session_id else None
            if known is not None and session_id not in self._provisional:
                return known
            self._missed.pop(session_id, None)
            if not project_path:
                if session_id and known is None:
                    # No folder yet: _shared until a row names one, then it moves.
                    self._sessions[session_id] = SHARED
                    self._provisional.add(session_id)
                return SHARED
        # Outside the lock: a slow disk must not hold the routing of every other row.
        root = repository_root(project_path)
        key = _path_key(root) if root else SHARED
        move = False
        with self._route_lock:
            if root:
                self._note_root(key, root)
            if session_id:
                known = self._sessions.get(session_id)
                if known is not None and session_id not in self._provisional:
                    return known  # another row placed it meanwhile
                move = known == SHARED and key != SHARED
                self._sessions[session_id] = key
                self._provisional.discard(session_id)
                if move:
                    self._pending_moves[session_id] = (SHARED, key)
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

    def moving_sessions(self) -> set[str]:
        """Sessions whose move to another store is not done: their rows are in two stores."""
        with self._route_lock:
            return set(self._pending_moves)

    def knows_session(self, session_id: str) -> bool:
        """Whether a store holds *session_id* already, so a write for it does not place it."""
        if not self._split:
            return True
        with self._route_lock:
            return session_id in self._sessions

    def _move_session(self, session_id: str, src: str, dst: str) -> bool:
        """Move a session's rows from *src* to *dst*: it was placed before a row named its folder.

        Rows move in chunks. Each chunk's copy and delete are one short transaction that
        holds both stores' write locks, and other writers of either store get in between:
        a session of many rows must not keep the machine store locked longer than they
        wait. When a chunk fails (a busy store), the rows of each chunk are in one store
        only and the move stays pending: reads look in both, flush and upkeep retry it.
        """
        with self._using(src) as source, self._using(dst) as target:
            source.flush()
            conn = target._conn()
            if conn.in_transaction:
                conn.commit()
            conn.execute("ATTACH DATABASE ? AS mv", (str(source._path),))
            name = f"move of session {session_id}"
            try:
                with source.named_write(name), target.named_write(name):
                    for table in PROJECT_TABLES:
                        self._move_rows(conn, table, session_id, dst)
            except sqlite3.Error as exc:
                if conn.in_transaction:
                    conn.rollback()
                log.warning("Moving session %s to its project failed, will retry: %s", session_id, exc)
                return False
            finally:
                conn.execute("DETACH DATABASE mv")
        with self._route_lock:
            self._pending_moves.pop(session_id, None)
            # Lookups that found an id in the old store are stale now.
            for ident in [i for i, k in self._found.items() if k == src]:
                del self._found[ident]
        self._touch(dst, [_NOW_ROW])
        return True

    def _move_rows(self, conn: sqlite3.Connection, table: str, session_id: str, dst: str) -> None:
        """Move one table's rows of a session from ``mv`` to ``main``, a chunk per transaction."""
        cols = ", ".join(_copy_columns(conn, table))
        while True:
            last = conn.execute(
                f"SELECT MAX(rowid) FROM (SELECT rowid FROM mv.{table} WHERE session_id = ?"
                f" ORDER BY rowid LIMIT {FLUSH_CHUNK_ROWS})",
                (session_id,),
            ).fetchone()[0]
            if last is None:
                return
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                f"INSERT OR IGNORE INTO main.{table}({cols}) SELECT {cols} FROM mv.{table}"
                " WHERE session_id = ? AND rowid <= ?",
                (session_id, last),
            )
            moved: list[Any] = []
            if table in _TIMED_TABLES:
                lo, hi = conn.execute(
                    f"SELECT MIN(ts), MAX(ts) FROM mv.{table} WHERE session_id = ? AND rowid <= ?", (session_id, last)
                ).fetchone()
                moved = [types.SimpleNamespace(ts=t) for t in (lo, hi) if t]
            conn.execute(f"DELETE FROM mv.{table} WHERE session_id = ? AND rowid <= ?", (session_id, last))
            conn.commit()
            # The moved rows' time range: a board range that holds only old rows still reads dst.
            self._touch(dst, moved or [_NOW_ROW])
            # A writer in SQLite's busy wait takes the lock now.
            time.sleep(FLUSH_YIELD_S)

    def _retry_moves(self) -> int:
        """Moves that failed before. Returns how many are still pending."""
        with self._route_lock:
            pending = list(self._pending_moves.items())
        for session_id, (src, dst) in pending:
            self._move_session(session_id, src, dst)
        with self._route_lock:
            return len(self._pending_moves)

    def split_machine_sessions(self, budget_s: float | None = None) -> int:
        """Move sessions of the machine store, written before the split, to their stores.

        A session goes to the store of its folder (its sessions row, else a request),
        or to _shared. Each move is one transaction, so a stop part-way loses nothing:
        what is left in the machine store moves on the next pass. Runs for at most
        *budget_s* seconds (None: until done). Returns how many sessions are left.
        """
        if not self._split:
            return 0
        with self._route_lock:
            legacy = [sid for sid, key in self._sessions.items() if key == MACHINE]
        if not legacy:
            return 0
        if self._split_total is None:
            self._split_total = len(legacy)
            self._split_reported = time.monotonic()
            self._say(f"  history split: {len(legacy)} older sessions move to their project stores in the background")
        started = time.monotonic()
        conn = self.machine._conn()
        for done, sid in enumerate(legacy):
            if budget_s is not None and time.monotonic() - started > budget_s:
                left = len(legacy) - done
                if time.monotonic() - self._split_reported >= SPLIT_REPORT_S:
                    self._split_reported = time.monotonic()
                    self._say(f"  history split: {self._split_total - left} of {self._split_total} sessions moved")
                return left
            row = conn.execute(
                "SELECT project_path FROM sessions WHERE session_id = ? AND project_path != ''", (sid,)
            ).fetchone() or conn.execute(
                "SELECT project_path FROM requests WHERE session_id = ? AND project_path != '' LIMIT 1", (sid,)
            ).fetchone()
            root = repository_root(row[0]) if row else None
            key = _path_key(root) if root else SHARED
            with self._route_lock:
                if self._sessions.get(sid) != MACHINE:
                    continue
                if root:
                    self._note_root(key, root)
                self._sessions[sid] = key
                self._pending_moves[sid] = (MACHINE, key)
            self._move_session(sid, MACHINE, key)
        self._say(f"  history split done: {self._split_total} sessions moved to {len(self._index)} project stores in {self.projects_dir}")
        return 0

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
        self._touch(key, [types.SimpleNamespace(ts=time.time())])

    def batch_link_sessions(self, entries: list[tuple[str, str, int, float, str]]) -> None:
        groups: dict[str, list[tuple[str, str, int, float, str]]] = {}
        for entry in entries:
            groups.setdefault(self._route(entry[0], ""), []).append(entry)
        for key, part in groups.items():
            with self._using(key) as db:
                db.batch_link_sessions(part)
            self._touch(key, [types.SimpleNamespace(ts=float(e[3] or 0.0)) for e in part])

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
        key = self._route(session_id, "")
        with self._using(key) as db:
            db.upsert_session_commits(session_id, commits)
        self._touch(key, [types.SimpleNamespace(ts=float(c.get("ts") or 0.0)) for c in commits])

    def replace_session_artifacts(
        self,
        session_id: str,
        tool: str,
        folder: str,
        signature: float,
        files: list[tuple[str, str, int, float]],
        files_total: int,
        bytes_total: int,
    ) -> None:
        if not session_id:
            return
        key = self._route(session_id, "")
        with self._using(key) as db:
            db.replace_session_artifacts(session_id, tool, folder, signature, files, files_total, bytes_total)
        self._touch(key, [_NOW_ROW])

    def fill_tool_sizes(self, rows: list[tuple[str, str, int | None, int | None]]) -> int:
        """Each row goes to the store of its session; a session that is moving, to both."""
        groups: dict[str, list[tuple[str, str, int | None, int | None]]] = {}
        for row in rows:
            sid = row[0]
            keys = [self._find_store(sid)] if sid else [MACHINE]
            with self._route_lock:
                pending = self._pending_moves.get(sid)
            if pending is not None:
                keys = list(dict.fromkeys(pending))
            for key in keys:
                groups.setdefault(key, []).append(row)
        changed = 0
        for key, part in groups.items():
            with self._using(key) as db:
                changed += db.fill_tool_sizes(part)
        return changed

    @contextlib.contextmanager
    def every_store(self) -> Iterator[list[sqlite3.Connection]]:
        """A read connection on the machine store and on each project store file.

        Unlike the read connection, nothing is attached or copied: a search over all
        time runs its query on each store and merges the rows.
        """
        conns = [self.machine._conn()]
        opened: list[sqlite3.Connection] = []
        if self._split:
            with self._index_lock:
                keys = list(self._index)
            for key in keys:
                file = self._file_of(key)
                if file is None or not file.exists():
                    continue
                try:
                    opened.append(_read_only(file))
                except sqlite3.Error as exc:
                    log.debug("Cannot read %s: %s", file.name, exc)
        try:
            yield conns + opened
        finally:
            for conn in opened:
                conn.close()

    artifact_scans = HistoryDB.artifact_scans

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
        attrs = ("requests", "tools", "prompts", "skills", "file_writes", "agents", "context_events", "loaded_files")
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
                key,
                [*part.requests, *part.tools, *part.prompts, *part.skills, *part.file_writes, *part.context_events, *part.loaded_files],
            )
        return written

    def set_sessions_tool(self, session_ids: list[str], tool: str) -> None:
        groups: dict[str, list[str]] = {}
        for sid in session_ids:
            groups.setdefault(self._session_store(sid), []).append(sid)
        for key, part in groups.items():
            with self._using(key) as db:
                db.set_sessions_tool(part, tool)
            self._touch(key, [_NOW_ROW])

    def update_tool_invocation_duration(
        self, dedup_key: str, duration_ms: float, is_error: int = 0, result_summary: str = ""
    ) -> bool:
        """The row can be in any store: the open ones first, most recently used first."""
        with self._stores_lock:
            keys = sorted(self._stores, key=lambda k: -self._last_used.get(k, 0.0))
        for key in [*keys, MACHINE]:
            with self._using(key) as db:
                if db.update_tool_invocation_duration(dedup_key, duration_ms, is_error, result_summary):
                    self._touch(key, [_NOW_ROW])
                    return True
        return False

    def clear_stale_pending_confirms(self, before: float) -> int:
        """Open stores on every call; every store, closed ones too, every FULL_PASS_S.

        Housekeeping: a busy store is left for the next call.
        """
        full = time.monotonic() - self._last_full_pass >= FULL_PASS_S
        if full:
            self._last_full_pass = time.monotonic()
        total = 0
        locked = False
        for db in self._each_store(open_only=not full):
            try:
                total += db.clear_stale_pending_confirms(before)
            except sqlite3.OperationalError as exc:
                if not is_lock_error(exc):
                    raise
                locked = True
                self.note_lock("clear_stale_pending_confirms", exc)
        if not locked:
            # The incident is over: the next one warns again.
            self._lock_noted.discard("clear_stale_pending_confirms")
        return total

    def note_lock(self, what: str, exc: BaseException) -> None:
        """Log a skipped write once per kind, with the writes that run now; later ones at debug."""
        writes = ", ".join(self.active_writes()) or "none"
        if what in self._lock_noted:
            log.debug("%s skipped: %s. Writes running in this process: %s", what, exc, writes)
            return
        self._lock_noted.add(what)
        log.warning("%s skipped, retried later: %s. Writes running in this process: %s", what, exc, writes)

    # ── Every store ────────────────────────────────────────────

    def flush(self) -> int:
        total = self.machine.flush()
        for key in list(self.open_stores()):
            with self._using(key) as db:
                total += db.flush()
        self._retry_moves()
        self._save_index()
        return total

    def _each_store(self, open_only: bool = False, machine: bool = True) -> Iterator[HistoryDB]:
        """The machine store, then every project store with a file (or only the open ones).

        One at a time: an open store is used as it is; a closed one is opened for the
        visit alone, with no flush thread, and closed again. Many repositories never
        hold many files open.
        """
        if machine:
            yield self.machine
        if not self._split:
            return
        if open_only:
            keys = list(self.open_stores())
        else:
            with self._index_lock:
                keys = list(self._index)
        for key in keys:
            with self._stores_lock:
                is_open = key in self._stores
            if is_open:
                with self._using(key) as db:
                    yield db
                continue
            if open_only:
                continue
            file = self._file_of(key)
            if file is None or not file.exists():
                continue
            visit = self._project_db(file, flush_thread=False)
            with self._stores_lock:
                self._visiting[key] = visit
            try:
                yield visit
            finally:
                with self._stores_lock:
                    self._visiting.pop(key, None)
                visit.close()

    def running_writes(self) -> list[dict[str, Any]]:
        rows = list(self.machine.running_writes())
        with self._stores_lock:
            dbs = {**self._visiting, **self._stores}
        for key, db in dbs.items():
            name = Path(str(db._path)).stem if key != SHARED else SHARED
            rows += [{**w, "name": f"{w['name']} [{name}]"} for w in db.running_writes()]
        return sorted(rows, key=lambda r: -r["age_s"])

    def active_writes(self) -> list[str]:
        return [f"{w['name']} ({w['age_s']:.0f} s)" for w in self.running_writes()]

    def auto_maintain(self) -> dict[str, int]:
        """Retention, text trimming and the size budget over every store.

        ``max_total_mb`` is one budget for all stores: over it, each store gets a share
        in proportion to the space it uses.
        """
        budget = self.machine._budget_bytes
        result: dict[str, int] = {}
        # First the space each store uses, then each store's share: one store open at a time.
        used = [db._budget_used() for db in self._each_store()]
        total_used = sum(used)
        try:
            for db, own in zip(self._each_store(), used, strict=False):
                share = budget if total_used <= budget else int(budget * own / total_used)
                db._budget_bytes = max(share, 1)
                _add_up(result, db.auto_maintain())
        finally:
            self.machine._budget_bytes = budget
        return result

    def compact(self, *, retention_days: int | None = None, floor: float = 0.0) -> dict[str, int]:
        result: dict[str, int] = {}
        for db in self._each_store():
            _add_up(result, db.compact(retention_days=retention_days, floor=floor))
        return result

    def compact_estimate(self, *, retention_days: int | None = None) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for db in self._each_store():
            _add_up(result, db.compact_estimate(retention_days=retention_days), keep=("retention_days",))
        return result

    def trim_text(self, *, before: float | None = None, since: float = 0.0) -> int:
        return sum(db.trim_text(before=before, since=since) for db in self._each_store())

    def trim_text_estimate(self) -> dict[str, int]:
        result: dict[str, int] = {}
        for db in self._each_store():
            _add_up(result, db.trim_text_estimate())
        return result

    def vacuum(self) -> None:
        for db in self._each_store():
            db.vacuum()

    def vacuum_room_needed(self) -> int:
        """Stores are vacuumed one after another: the largest need is the room needed."""
        return max(db.vacuum_room_needed() for db in self._each_store())

    def stats(self) -> dict[str, Any]:
        """Row counts and file sizes of every store; time range and files of the machine store."""
        result = dict(self.machine.stats())
        count = 0
        for db in self._each_store(machine=False):
            count += 1
            for name, value in db.stats().items():
                if name.endswith("_count") or name == "file_size_bytes":
                    result[name] = (result.get(name) or 0) + (value or 0)
        result["project_stores"] = count
        return result

    def storage_bytes(self) -> int:
        total = self.machine.storage_bytes()
        if self.projects_dir is not None:
            with self._index_lock:
                names = [entry["file"] for entry in self._index.values()]
            for name in names:
                for file in (self.projects_dir / name, self.projects_dir / (name + "-wal")):
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
            with self._route_lock:
                pending = self._pending_moves.get(session)
            if pending is not None:
                # Its rows are in both stores until the move is done.
                keys = tuple(k for k in dict.fromkeys((pending[1], pending[0])) if k)
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
            return (attached, (), None, None, (), self._main_tables())
        with self._index_lock:
            generations = tuple(self._generation.get(k, 0) for k in copied)
        return (attached, copied, since, until, generations, self._main_tables())

    def sessions_where(self, where: str, params: tuple = (), order: str = "", limit: int = 0) -> list[tuple]:
        """``SELECT session_id FROM sessions WHERE ...`` over the machine store and every project
        store, without attaching any: a session can be stored under another folder's store.
        """
        sql = f"SELECT session_id, started_at FROM sessions WHERE {where}"
        rows = list(self.machine._conn().execute(sql, params).fetchall())
        if self._split:
            with self._index_lock:
                keys = list(self._index)
            for key in keys:
                file = self._file_of(key)
                if file is None or not file.exists():
                    continue
                try:
                    conn = _read_only(file)
                    try:
                        rows += conn.execute(sql, params).fetchall()
                    finally:
                        conn.close()
                except sqlite3.Error as exc:
                    log.debug("Cannot read %s: %s", file.name, exc)
        if order == "newest":
            rows.sort(key=lambda r: -(r[1] or 0.0))
        return rows[:limit] if limit else rows

    def _main_tables(self) -> tuple[str, ...]:
        """Per-project tables with rows in the machine store (written before the split).

        Part of the read plan: a connection built while a table was empty must not hide
        rows written to it later. A table found with rows stays in the list.
        """
        conn = self.machine._conn()
        for table in PROJECT_TABLES:
            if table not in self._main_rows and conn.execute(f"SELECT 1 FROM main.{table} LIMIT 1").fetchone():
                self._main_rows.add(table)
        return tuple(t for t in PROJECT_TABLES if t in self._main_rows)

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
        with self._route_lock:
            missed = self._missed.get(ident)
        if missed is not None and time.monotonic() - missed < MISS_TTL_S:
            return MACHINE
        with self._index_lock:
            keys = list(self._index)
        for key in keys:
            file = self._file_of(key)
            if file is None or not file.exists():
                continue
            try:
                conn = _read_only(file)
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
        with self._route_lock:
            if len(self._missed) >= _MISSED_MAX:
                self._missed.clear()
            self._missed[ident] = time.monotonic()
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
            conn = connect_file(str(self.machine._path))
            conn.execute("PRAGMA synchronous=OFF")
            conn.execute("PRAGMA cache_size=-8000")
            conn.execute("PRAGMA temp_store=MEMORY")
            self.machine._install_capture_guards(conn)
            state = _ReadConn(conn)
            self._attach(state, plan)
            if len(state.aliases) + len(state.copied) < len(plan[0]) + len(plan[1]):
                # A store of the plan has no file yet: its rows come later, so this
                # connection is used once and not kept.
                return state
        conns[plan] = state
        while len(conns) > READ_CONNS_PER_THREAD:
            # Not closed here: a caller may still hold it. It closes when released.
            conns.pop(next(iter(conns)))
        return state

    def _attach(self, state: _ReadConn, plan: tuple) -> None:
        attached, copied, since, until, _generations, main_tables = plan
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
            if table in main_tables:
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
