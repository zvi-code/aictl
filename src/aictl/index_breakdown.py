"""Everything a node's daemon finds and indexes, and where what is on disk differs from what is stored.

One breakdown per node, in six parts:

``homes``
    Each tool's home folders: every candidate, how it was named (default location, environment
    variable, a running process, the known-homes file) and whether it exists.
``locations``
    Every folder and database the session readers take sessions from, with the files, bytes and
    sessions on disk and how far the reader got with each file.
``databases``
    Copilot's ``session-store.db`` of each home: sessions in the database against sessions with an
    ``events.jsonl``.
``compare``
    Per tool: the sessions on disk, the sessions the store holds of the node, and the session ids of
    each side's gap, sorted by why.
``projects``
    Every project folder the daemon knows: roots, repositories discovery found, working folders of
    stored sessions and folders memory files belong to.
``context``
    The folders scanned for instruction, skill, agent, prompt and memory files, with their files.

The breakdown of this node is computed on request from the disk and the running reader's state; the
saved read positions stand in for that state when no daemon runs. Another node's breakdown comes
from the store: the snapshot its daemon publishes (``maintenance_state``, key ``index_breakdown``)
and the files its reader indexed (``session_sources``) against its stored sessions.

Paths of another node can be Windows paths: every comparison of paths here works on strings, with
drive letters and backslashes folded, never on this machine's path rules.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
from collections import Counter
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .platforms import IS_WINDOWS

log = logging.getLogger(__name__)

SNAPSHOT_KEY = "index_breakdown"
# How often a daemon publishes its breakdown, and how long after its start the first one waits.
PUBLISH_INTERVAL_S = 900.0
PUBLISH_DELAY_S = 180.0
# The session ids listed per tool and reason: all of them up to this many on the screen.
MAX_IDS = 2000
# A published snapshot keeps fewer, so one row stays well under the store's inline row limit (1 MB).
PUBLISHED_IDS = 200
PUBLISHED_MAX_BYTES = 700_000
MAX_LISTED_FILES = 500

# Why a session on disk has no stored row, in the order a session's files decide it.
MISSING_REASONS = {
    "unreadable": "a file of it cannot be read",
    "not_read": "not read yet: waiting in the reader's backlog, or read up to a point",
    "outside_window": "older than history_days: the reader does not read it",
    "folder_only": "session folder without a transcript file (no events.jsonl)",
    "database_no_row": "listed in the Copilot database, no stored row",
    "read_no_row": "read to its end, no stored row: the reader stores no row for a file with no turn and no usage",
}
# Why a stored session is not on disk.
STORED_ONLY_REASONS = {
    "database": "taken from the Copilot database (session-store.db): no session file of it was found",
    "live": "seen live by hooks or process monitoring: its id names no session file",
    "gone": "no session file found now: removed since, or kept where no reader looks",
}
# Stored ids that name the same session as a file under another form: the VS Code chat reader stores a
# chat file's session as ``vscode-chat:<id>`` beside the transcript reader's ``<id>``.
STORED_ALIASES = {"copilot-vscode": "vscode-chat:"}
LIVE_SOURCES = frozenset({"correlator", "process"})
FILE_STATES = ("complete", "reading", "changed", "waiting", "reread", "outside_window", "unreadable")
# The tools the session readers count on disk; any other stored tool is not compared.
DISK_TOOLS = ("claude-code", "codex-cli", "copilot-cli", "copilot-desktop", "copilot-vscode")
CONTEXT_CATEGORIES = {
    "instructions": "instructions", "rules": "instructions", "skills": "skills", "agent": "agents",
    "memory": "memory", "commands": "commands", "prompt": "prompts",
}
_UUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
_WINDOWS = re.compile(r"^(?:[A-Za-z]:[\\/]|\\\\)")


# ── paths ─────────────────────────────────────────────────────────────


def fold(path: str) -> str:
    """The comparison form of a path of any system: a Windows path (drive letter or UNC) is lower case
    with forward slashes; every path loses its trailing separator."""
    text = str(path or "")
    if _WINDOWS.match(text) or (IS_WINDOWS and text):
        text = text.replace("\\", "/").lower()
    return text.rstrip("/") or text[:1]


def is_under(child: str, parent: str) -> bool:
    """True when *child* is *parent* or lies below it, on either system's path rules."""
    c, p = fold(child), fold(parent)
    return bool(p) and (c == p or c.startswith(p.rstrip("/") + "/"))


def segments(path: str) -> list[str]:
    return [s for s in re.split(r"[\\/]+", str(path or "")) if s]


def location_of(tool: str, path: str) -> str:
    """The session folder of a session file, from where each tool keeps its files; '' when unknown."""
    parts = segments(path)
    lower = [p.lower() for p in parts]
    marker = {"claude-code": "projects", "codex-cli": "sessions", "copilot-cli": "session-state",
              "copilot-desktop": "session-state"}.get(tool)
    if tool == "copilot-vscode":
        for name in ("workspacestorage", "emptywindowchatsessions"):
            if name in lower:
                marker = name
                break
    if not marker or marker not in lower:
        return ""
    index = len(lower) - 1 - lower[::-1].index(marker)
    text = str(path)
    # Rebuild the prefix up to and including the marker with the path's own separators.
    cut = 0
    found = -1
    for i, part in enumerate(re.finditer(r"[^\\/]+", text)):
        found = i
        if i == index:
            cut = part.end()
            break
    return text[:cut] if found == index else ""


def thread_id(tool: str, session_id: str) -> str:
    """The id a session file's session is stored under, where the file name alone tells it: a Codex rollout
    named ``rollout-<time>-<uuid>`` is stored under the thread id its first line names, which is the uuid
    for a root thread."""
    if tool == "codex-cli":
        found = _UUID.findall(session_id)
        return found[-1].lower() if found else session_id
    return session_id


# ── Codex thread ids ───────────────────────────────────────────────────

_codex_ids: dict[str, tuple[tuple[int, int], str]] = {}
_codex_lock = threading.Lock()


def codex_thread(path: Path, stat: os.stat_result) -> str:
    """The session a rollout's rows are stored under: the ``session_meta`` line's ``session_id`` (the root
    thread; a sub-agent's rollout names its root) or ``id``. Kept per file until the file changes."""
    key = str(path)
    sig = (stat.st_mtime_ns, stat.st_size)
    with _codex_lock:
        hit = _codex_ids.get(key)
    if hit and hit[0] == sig:
        return hit[1]
    sid = ""
    stream = None
    try:
        if path.name.endswith(".zst"):
            from .ingesters import zstd_stream

            if zstd_stream.available():
                stream = zstd_stream.open_stream(path)
                line = next(iter(stream), b"")
            else:
                line = b""
        else:
            stream = open(path, "rb")  # noqa: SIM115 - closed below
            line = stream.readline(1 << 20)
        obj = json.loads(line) if line.strip() else {}
        payload = obj.get("payload") if isinstance(obj, dict) and isinstance(obj.get("payload"), dict) else {}
        if isinstance(obj, dict) and obj.get("type") == "session_meta":
            sid = str(payload.get("session_id") or payload.get("id") or "")
    except (OSError, ValueError, StopIteration):
        sid = ""
    finally:
        if stream is not None:
            stream.close()
    if not sid:
        sid = thread_id("codex-cli", path.name.removesuffix(".zst").removesuffix(".jsonl"))
    with _codex_lock:
        if len(_codex_ids) > 50_000:
            _codex_ids.clear()
        _codex_ids[key] = (sig, sid)
    return sid


# ── session files on disk ──────────────────────────────────────────────


@dataclass
class DiskSession:
    files: int = 0
    bytes: int = 0
    newest: float = 0.0
    oldest: float = 0.0
    states: Counter = field(default_factory=Counter)
    kinds: set[str] = field(default_factory=set)  # "file", "database", "folder", "app"
    locations: set[str] = field(default_factory=set)
    in_window: bool = True

    def add_file(self, size: int, mtime: float, state: str, location: str) -> None:
        self.files += 1
        self.bytes += size
        self.newest = max(self.newest, mtime)
        self.oldest = mtime if not self.oldest else min(self.oldest, mtime)
        self.states[state] += 1
        self.kinds.add("file")
        if location:
            self.locations.add(location)

    def missing_reason(self) -> str:
        if self.states.get("unreadable"):
            return "unreadable"
        if any(self.states.get(s) for s in ("waiting", "reread", "reading", "changed")):
            return "not_read"
        if self.files and self.states.get("outside_window") == self.files:
            return "outside_window"
        if self.files and self.states.get("complete") == self.files:
            return "read_no_row"
        if "database" in self.kinds or "app" in self.kinds:
            return "database_no_row" if self.in_window else "outside_window"
        if "folder" in self.kinds:
            return "folder_only"
        return "read_no_row"


def _copy(mapping: Any) -> dict:
    """A copy of a dict another thread may change: retried while it changes during the copy."""
    for _ in range(5):
        try:
            return dict(mapping)
        except RuntimeError:
            continue
    return {}


@dataclass
class ReaderState:
    """What the reader knows of each file: saved positions (path -> (mtime_ns, size, version)), the positions
    of this process, the files of its backlog, the compressed files it could not read, and the sessions
    whose events file it saw."""

    checkpoints: dict
    offsets: dict
    waiting: dict
    bad: dict
    event_sessions: set
    live: bool
    positions_found: bool
    saved_at: float = 0.0


def reader_state(ing: Any, live: bool) -> ReaderState:
    checkpoints = _copy(ing._checkpoints)
    checkpoints.update(_copy(ing._read_complete))
    saved_at, found = 0.0, bool(checkpoints)
    if ing._checkpoint is not None:
        try:
            entry = ing._checkpoint.read().get(ing._checkpoint_key) or {}
            saved_at = float(entry.get("saved_at") or entry.get("ts") or 0.0)
            found = found or bool(entry)
        except (OSError, ValueError, TypeError, AttributeError):
            pass
    return ReaderState(checkpoints, _copy(ing._offsets) if live else {}, _copy(ing._waiting) if live else {},
                       _copy(ing._bad_zst), set(_copy(dict.fromkeys(ing._event_sessions))), live, found, saved_at)


def file_state(path: Path, st: os.stat_result, state: ReaderState, version: int, cutoff: float) -> tuple[str, int, str]:
    """(state, bytes read, reason) of one session file, by the reader's own rules (see ``_changed``)."""
    bad = state.bad.get(path)
    if bad is not None and bad[0] == (st.st_mtime_ns, st.st_size):
        return "unreadable", 0, str(bad[1])
    waiting = state.waiting.get(path)
    if waiting is not None:
        return ("reread" if waiting[3] else "waiting"), 0, ""
    saved = state.checkpoints.get(path)
    if saved is not None and tuple(saved[:2]) == (st.st_mtime_ns, st.st_size):
        return ("complete", st.st_size, "") if saved[2] >= version else ("reread", 0, "")
    offset = state.offsets.get(path, 0)
    if offset:
        return ("complete", st.st_size, "") if offset >= st.st_size else ("reading", offset, "")
    if st.st_mtime < cutoff:
        return "outside_window", 0, ""
    if saved is not None:
        return "changed", min(int(saved[1]), st.st_size), ""
    return "waiting", 0, ""


def _roots(ing: Any) -> dict[str, list[tuple[str, Path]]]:
    """Per reader tool, (kind of folder, folder) of every folder the reader takes session files from."""
    workspaces, empty = ing._vscode_dirs()
    return {
        "claude-code": [("projects folder", p) for p in ing._roots("claude", ing.claude_projects)],
        "codex-cli": [("sessions folder", p) for p in ing._roots("codex", ing.codex_sessions)],
        "copilot-cli": [("session-state folder", p) for p in ing._roots("copilot", ing.copilot_state)],
        "copilot-vscode": [("workspaceStorage", p) for p in workspaces] + [("chats without a folder", p) for p in empty],
    }


def _exists(path: Path) -> bool:
    try:
        return path.exists()
    except OSError:
        return False


def scan_sessions(ing: Any, state: ReaderState, cutoff: float) -> tuple[list[dict], dict[str, dict[str, DiskSession]], list[dict]]:
    """The session locations of the reader, the sessions on disk per stored tool, and Copilot's databases."""
    from .ingesters.session_files import ZSTD
    from .ingesters.transcript_usage import READER_VERSIONS, reader_kind

    files, unclaimed, _ = ing.list_files()
    roots = _roots(ing)
    surface = ing._store.surface
    disk: dict[str, dict[str, DiskSession]] = {}
    rows: dict[tuple[str, str], dict] = {}
    for tool, folders in roots.items():
        for kind, folder in folders:
            rows.setdefault((tool, fold(str(folder))), {
                "tool": tool, "kind": kind, "path": str(folder), "exists": _exists(folder), "files": 0, "bytes": 0,
                "sessions": 0, "newest": None, "oldest": None, "states": dict.fromkeys(FILE_STATES, 0),
                "bytes_read": 0, "bytes_skipped": 0, "unreadable": [], "unclaimed": 0, "reader": "", "reader_version": 0,
                "older_version_files": 0, "folders_without_transcript": 0, "_sessions": set(),
            })

    def row_of(tool: str, path: Path) -> dict | None:
        best = None
        for (t, key), row in rows.items():
            if t == tool and is_under(str(path), row["path"]) and (best is None or len(key) > len(fold(best["path"]))):
                best = row
        return best

    for tool, paths in files.items():
        for path in paths:
            try:
                st = path.stat()
            except OSError as exc:
                row = row_of(tool, path)
                if row is not None:
                    row["states"]["unreadable"] += 1
                    row["unreadable"].append({"path": str(path), "reason": exc.strerror or str(exc)})
                continue
            kind = reader_kind(tool, path)
            version = READER_VERSIONS[kind]
            status, done, why = file_state(path, st, state, version, cutoff)
            sid = ing._source_session(tool, path)
            if tool == "codex-cli":
                sid = codex_thread(path, st)
            stored_tool = surface(sid) if tool == "copilot-cli" else tool
            row = row_of(tool, path)
            location = row["path"] if row is not None else str(path.parent)
            disk.setdefault(stored_tool, {}).setdefault(sid, DiskSession()).add_file(st.st_size, st.st_mtime, status, location)
            if row is None:
                continue
            row["files"] += 1
            row["bytes"] += st.st_size
            row["bytes_read"] += done
            # Files the reader does not read (outside history_days, or unreadable): not part of what is left to read.
            row["bytes_skipped"] += st.st_size if status in ("outside_window", "unreadable") else 0
            row["states"][status] += 1
            row["_sessions"].add(sid)
            row["reader"], row["reader_version"] = kind if not row["reader"] or row["reader"] == kind else "mixed", version
            saved = state.checkpoints.get(path)
            row["older_version_files"] += int(saved is not None and saved[2] < version)
            row["newest"] = max(row["newest"] or 0.0, st.st_mtime)
            row["oldest"] = st.st_mtime if row["oldest"] is None else min(row["oldest"], st.st_mtime)
            if status == "unreadable":
                row["unreadable"].append({"path": str(path), "reason": why})
            if path.name.endswith(ZSTD) and status == "unreadable" and not why:
                row["unreadable"][-1]["reason"] = "compressed file"
    for tool, paths in unclaimed.items():
        for path in paths:
            row = row_of(tool, path)
            if row is not None:
                row["unclaimed"] += 1
    # A Copilot session folder with no events.jsonl: its session is on disk, but no transcript of it.
    for (tool, _), row in rows.items():
        if tool != "copilot-cli" or not row["exists"]:
            continue
        try:
            folders = [p for p in Path(row["path"]).iterdir() if p.is_dir()]
        except OSError:
            folders = []
        for folder in folders:
            if (folder / "events.jsonl").exists():
                continue
            row["folders_without_transcript"] += 1
            session = disk.setdefault(surface(folder.name), {}).setdefault(folder.name, DiskSession())
            session.kinds.add("folder")
            session.locations.add(row["path"])
    databases = _copilot_databases(ing, state, cutoff, disk, rows)
    out = []
    for row in rows.values():
        row["sessions"] = len(row.pop("_sessions"))
        row["unreadable"] = row["unreadable"][:MAX_LISTED_FILES]
        out.append(row)
    return out, disk, databases


def _copilot_databases(ing: Any, state: ReaderState, cutoff: float, disk: dict[str, dict[str, DiskSession]],
                       rows: dict) -> list[dict]:
    """Each Copilot home's session-store.db: its sessions, and how many have an events.jsonl."""
    from .ingesters._common import coerce_ts, open_readonly

    surface = ing._store.surface
    default_db = Path(ing._store.store_path)
    events = {sid for tool in ("copilot-cli", "copilot-desktop") for sid, s in disk.get(tool, {}).items() if "file" in s.kinds}
    out = []
    for root in ing._roots("copilot", ing.copilot_state):
        db = root.parent / "session-store.db"
        entry = {"tool": "copilot-cli", "path": str(db), "exists": _exists(db), "sessions": 0, "with_events_file": 0,
                 "events_file_seen_before": 0, "without_events_file": 0, "outside_window": 0, "usage_rows_read": False,
                 "app_sessions": None, "error": ""}
        entry["usage_rows_read"] = fold(str(db)) == fold(str(default_db))
        if entry["usage_rows_read"]:
            entry["app_sessions"] = len(_copy(ing._store.app_types))
        out.append(entry)
        if not entry["exists"]:
            continue
        try:
            import sqlite3
        except ImportError:
            entry["error"] = "Python has no sqlite3 module"
            continue
        conn = open_readonly(db, "index-breakdown")
        if conn is None:
            entry["error"] = "cannot open the database read-only"
            continue
        try:
            columns = {r[1] for r in conn.execute("PRAGMA table_info(sessions)")}
            if "id" not in columns:
                entry["error"] = "the database has no sessions table with an id column"
                continue
            times = ", ".join(c if c in columns else "NULL" for c in ("created_at", "updated_at"))
            for sid, created, updated in conn.execute(f"SELECT id, {times} FROM sessions"):  # noqa: S608
                sid = str(sid or "")
                if not sid:
                    continue
                entry["sessions"] += 1
                newest = max(coerce_ts(created), coerce_ts(updated))
                if sid in events:
                    entry["with_events_file"] += 1
                    continue
                if sid in state.event_sessions:
                    entry["events_file_seen_before"] += 1
                else:
                    entry["without_events_file"] += 1
                if newest < cutoff:
                    entry["outside_window"] += 1
                session = disk.setdefault(surface(sid), {}).setdefault(sid, DiskSession())
                session.kinds.add("database")
                session.locations.add(str(db))
                session.in_window = session.in_window and newest >= cutoff
                session.newest = max(session.newest, newest)
        except sqlite3.Error as exc:
            entry["error"] = f"read failed: {exc}"
        finally:
            conn.close()
    return out


# ── on disk against stored ─────────────────────────────────────────────


def compare(disk: dict[str, dict[str, DiskSession]] | None, stored: list[dict] | None, *, disk_note: str = "",
            stored_note: str = "", not_compared: dict[str, str] | None = None, max_ids: int = MAX_IDS) -> list[dict]:
    """Per tool: sessions on disk, sessions stored, and each side's gap by reason with its session ids.

    *disk* None or *stored* None means that side is not known: every tool says why it is not compared.
    *not_compared* names tools whose comparison is not possible, with the reason."""
    from .records import COPILOT_STORE_SOURCE

    not_compared = dict(not_compared or {})
    by_tool: dict[str, dict[str, dict]] = {}
    for row in stored or ():
        tool, sid = str(row.get("tool") or ""), str(row["session_id"])
        prefix = STORED_ALIASES.get(tool)
        held = by_tool.setdefault(tool, {})
        if prefix and sid.startswith(prefix):
            sid = sid[len(prefix):]
            if sid in held:
                continue
        held[sid] = row
    tools = sorted(set(by_tool) | set(disk or {}), key=lambda t: (t not in DISK_TOOLS, t))
    out = []
    for tool in tools:
        on_disk = (disk or {}).get(tool, {})
        held = by_tool.get(tool, {})
        row: dict[str, Any] = {
            "tool": tool, "on_disk": len(on_disk) if disk is not None else None,
            "stored": len(held) if stored is not None else None, "matched": None, "comparable": True, "reason": "",
            "missing": {}, "missing_ids": {}, "stored_only": {}, "stored_only_ids": {},
            "files": sum(s.files for s in on_disk.values()), "bytes": sum(s.bytes for s in on_disk.values()),
        }
        reason = (not_compared.get(tool) or (disk_note if disk is None else "") or (stored_note if stored is None else "")
                  or ("" if tool in DISK_TOOLS else "aictl counts no session files of this tool on disk; stored sessions only"))
        if reason:
            row.update(comparable=False, reason=reason)
            out.append(row)
            continue
        matched = on_disk.keys() & held.keys()
        row["matched"] = len(matched)
        missing: dict[str, list[str]] = {}
        for sid in sorted(on_disk.keys() - matched, key=lambda s: -on_disk[s].newest):
            missing.setdefault(on_disk[sid].missing_reason(), []).append(sid)
        row["missing"] = {k: len(v) for k, v in missing.items()}
        row["missing_ids"] = {k: v[:max_ids] for k, v in missing.items()}
        only: dict[str, list[str]] = {}
        for sid in sorted(held.keys() - matched, key=lambda s: -(held[s].get("last_activity_at") or 0)):
            source = str(held[sid].get("source") or "")
            reason = "database" if source == COPILOT_STORE_SOURCE else "live" if source in LIVE_SOURCES else "gone"
            only.setdefault(reason, []).append(sid)
        row["stored_only"] = {k: len(v) for k, v in only.items()}
        row["stored_only_ids"] = {k: v[:max_ids] for k, v in only.items()}
        out.append(row)
    return out


def disk_from_store(rows: Iterable[dict]) -> tuple[dict[str, dict[str, DiskSession]], list[dict]]:
    """Sessions on disk as a node's reader indexed them (index.disk_sessions), and their locations."""
    disk: dict[str, dict[str, DiskSession]] = {}
    locations: dict[tuple[str, str], dict] = {}
    for r in rows:
        tool, sid = str(r["tool"] or ""), str(r["session_id"] or "")
        location = location_of(tool, str(r.get("sample_file") or ""))
        s = disk.setdefault(tool, {}).setdefault(sid, DiskSession())
        files = int(r.get("files") or 0)
        counts = {k: int(r.get(k) or 0) for k in ("complete", "reading", "waiting", "outside_window")}
        s.files += files
        s.bytes += int(r.get("size_bytes") or 0)
        s.newest = max(s.newest, float(r.get("newest") or 0.0))
        s.oldest = float(r.get("oldest") or 0.0) if not s.oldest else min(s.oldest, float(r.get("oldest") or 0.0))
        s.states.update(counts)
        s.kinds.add("file")
        if location:
            s.locations.add(location)
        loc = locations.setdefault((tool, fold(location)), {
            "tool": tool, "kind": "as indexed", "path": location or "(folder not recognized)", "exists": None,
            "files": 0, "bytes": 0, "sessions": 0, "newest": None, "oldest": None,
            "states": dict.fromkeys(FILE_STATES, 0), "bytes_read": 0, "unreadable": [], "unclaimed": None,
            "reader": "", "reader_version": None, "older_version_files": None, "folders_without_transcript": None,
            "indexed_at": None,
        })
        loc["files"] += files
        loc["bytes"] += int(r.get("size_bytes") or 0)
        loc["bytes_read"] += int(r.get("bytes_read") or 0)
        loc["sessions"] += 1
        for k, n in counts.items():
            loc["states"][k] += n
        for key, pick in (("newest", max), ("oldest", min)):
            value = r.get(key)
            if value is not None:
                loc[key] = value if loc[key] is None else pick(loc[key], value)
        if r.get("indexed_at") is not None:
            loc["indexed_at"] = max(loc["indexed_at"] or 0.0, float(r["indexed_at"]))
    return disk, sorted(locations.values(), key=lambda x: (x["tool"], fold(x["path"])))


# ── projects ───────────────────────────────────────────────────────────


def _worktree_of(top: Path) -> str:
    """The main work tree of a git worktree (its ``.git`` file names ``<main>/.git/worktrees/<name>``)."""
    from .tree_walk import git_dir

    marker = top / ".git"
    if not marker.is_file():
        return ""
    real = git_dir(top)
    if real is None:
        return ""
    parts = segments(str(real))
    lower = [p.lower() for p in parts]
    if "worktrees" in lower and lower.index("worktrees") > 0 and lower[lower.index("worktrees") - 1] == ".git":
        return str(real.parents[len(parts) - lower.index("worktrees")])
    return ""


def projects(*, roots: Iterable[str], repositories: Iterable[str], stored: Iterable[dict] | None,
             context_files: Iterable[dict], ignored_dirs: Iterable[str], local: bool = True,
             project_filter: Iterable[str] = ()) -> list[dict]:
    """Every project folder known to the node, with what is known of it."""
    roots = [str(r) for r in roots]
    wanted = {fold(p) for p in project_filter if p}
    ignored = {d.lower() for d in ignored_dirs}
    rows: dict[str, dict] = {}

    def add(path: str, source: str) -> dict | None:
        if not path:
            return None
        key = fold(path)
        if wanted and key not in wanted:
            return None
        row = rows.setdefault(key, {
            "path": path, "found_by": [], "exists": None, "git_root": "", "worktree_of": "", "sessions": {},
            "last_activity": None, "instructions": 0, "memory": 0, "skills": 0, "agents": 0,
            "ignored": any(s.lower() in ignored for s in segments(path)),
            "outside_roots": bool(roots) and not any(is_under(path, r) for r in roots),
        })
        if source not in row["found_by"]:
            row["found_by"].append(source)
        return row

    for r in roots:
        add(r, "root")
    for r in repositories:
        add(str(r), "discovered repository")
    for s in stored or ():
        row = add(str(s.get("project_path") or ""), "working folder of a stored session")
        if row is None:
            continue
        tool = str(s.get("tool") or "")
        row["sessions"][tool] = row["sessions"].get(tool, 0) + 1
        ts = s.get("last_activity_at")
        if ts:
            row["last_activity"] = max(row["last_activity"] or 0.0, float(ts))
    files = list(context_files)
    for f in files:
        if f.get("project"):
            add(str(f["project"]), "memory files")
    for row in rows.values():
        for f in files:
            group = CONTEXT_CATEGORIES.get(str(f.get("category") or ""))
            owner = str(f.get("project") or "")
            if group in ("instructions", "memory", "skills", "agents") and (
                    fold(owner) == fold(row["path"]) if owner else is_under(str(f["path"]), row["path"])):
                row[group] += 1
        if local:
            folder = Path(row["path"])
            row["exists"] = folder.is_dir()
            if row["exists"]:
                from .tree_walk import git_root

                top = git_root(folder)
                row["git_root"] = str(top) if top is not None else ""
                row["worktree_of"] = _worktree_of(top) if top is not None else ""
    return sorted(rows.values(), key=lambda r: (-(r["last_activity"] or 0), fold(r["path"])))


# ── skill, agent, instruction and memory folders ──────────────────────


def _context_folder(path: str, category: str) -> str:
    parts = re.split(r"([\\/])", str(path))
    names = parts[::2]
    # <folder>/skills/<name>/SKILL.md: the skills folder holds the skill folders.
    lower = [n.lower() for n in names]
    if category == "skills" and len(names) >= 3 and lower[-3] in ("skills",):
        return "".join(parts[: 2 * (len(names) - 2) - 1])
    return "".join(parts[: 2 * (len(names) - 1) - 1]) if len(names) > 1 else str(path)


def context_locations(files: Iterable[dict], candidates: Iterable[dict] = ()) -> list[dict]:
    """The folders that hold instruction, skill, agent, prompt, command and memory files, each with its
    files, and the user-level folders the path catalog names that hold none."""
    groups: dict[tuple, dict] = {}
    for f in files:
        category = CONTEXT_CATEGORIES.get(str(f.get("category") or ""))
        if category is None:
            continue
        folder = _context_folder(str(f["path"]), str(f.get("category")))
        scope = "plugin" if "plugins" in [s.lower() for s in segments(folder)] else str(f.get("scope") or "")
        key = (str(f.get("tool") or ""), category, fold(folder))
        g = groups.setdefault(key, {"tool": key[0], "category": category, "scope": scope, "path": folder, "exists": True,
                                    "files": 0, "bytes": 0, "newest": None, "pattern": "", "listed": []})
        g["files"] += 1
        g["bytes"] += int(f.get("size") or 0)
        mtime = f.get("mtime") or None
        if mtime:
            g["newest"] = max(g["newest"] or 0.0, float(mtime))
        if len(g["listed"]) < MAX_LISTED_FILES:
            g["listed"].append(str(f["path"]))
    for c in candidates:
        key = (c["tool"], c["category"], fold(c["path"]))
        g = groups.get(key)
        if g is None:
            groups[key] = {**c, "files": 0, "bytes": 0, "newest": None, "listed": []}
        elif not g["pattern"]:
            g["pattern"] = c.get("pattern", "")
    for g in groups.values():
        g["listed"].sort()
    return sorted(groups.values(), key=lambda g: (g["category"], g["tool"], -g["files"], fold(g["path"])))


def catalog_candidates() -> list[dict]:
    """The user-level folders the path catalog names for context files on this system, whether they exist."""
    from . import tools

    out: dict[tuple, dict] = {}
    for spec in tools.get_registry().path_specs():
        category = CONTEXT_CATEGORIES.get(spec.category)
        if category is None or spec.resolution != "literal":
            continue
        expanded = tools._expand_home(spec.path_template)
        if not Path(expanded).is_absolute():
            continue
        names = segments(expanded)
        cut = next((i for i, n in enumerate(names) if "*" in n or "{" in n), len(names))
        # A pattern names its folder; a fixed name names the file's folder.
        keep = cut if cut < len(names) else len(names) - 1
        if spec.category == "skills" and cut < len(names) and cut >= 1:
            keep = cut
        folder = _prefix_path(expanded, keep)
        out.setdefault((spec.ai_tool, category, fold(folder)), {
            "tool": spec.ai_tool, "category": category, "scope": spec.scope or "global", "path": folder,
            "exists": _exists(Path(folder)), "pattern": spec.path_template,
        })
    return list(out.values())


def _prefix_path(path: str, count: int) -> str:
    """The first *count* names of *path*, with its root and its own separators."""
    matches = list(re.finditer(r"[^\\/]+", path))
    if count <= 0 or not matches:
        return path[: matches[0].start()] if matches else path
    return path[: matches[min(count, len(matches)) - 1].end()]


# ── the breakdown of one node ──────────────────────────────────────────


@dataclass
class NodeInputs:
    node_id: str
    ingester: Any
    live: bool
    roots: list[str]
    settings: dict
    context_files: list[dict]
    repositories: list[str]
    stored: list[dict] | None = None
    stored_error: str = ""
    project_filter: tuple[str, ...] = ()
    homes: list[dict] | None = None


def homes(ing: Any | None = None) -> list[dict]:
    """Every home folder candidate of each tool, how each was named, and whether it exists."""
    from . import platforms, tool_homes
    from .observe.sessions import _global_storages, vscode_user_dirs

    rows: dict[tuple[str, str], dict] = {}

    def add(tool: str, path: Path, found_by: str, sessions: str = "", reader: str = "") -> None:
        key = (tool, fold(str(path)))
        row = rows.setdefault(key, {"tool": tool, "path": str(path), "found_by": [], "exists": _exists(path),
                                    "session_folder": sessions, "session_folder_exists": None, "read_by": reader})
        if found_by not in row["found_by"]:
            row["found_by"].append(found_by)
        if sessions and row["session_folder_exists"] is None:
            row["session_folder_exists"] = _exists(Path(sessions))

    read: set[str] = set()
    if ing is not None:
        for folders in _roots(ing).values():
            read.update(fold(str(p)) for _, p in folders)
    names = {"copilot": "copilot-cli", "claude": "claude-code", "codex": "codex-cli"}
    for home in tool_homes.candidates():
        folder = tool_homes.session_dir(home.path, home.tool)
        add(names[home.tool], home.path, home.found_by, str(folder),
            "session reader" if fold(str(folder)) in read else "")
    copilot = platforms.copilot_global_dir()
    add("copilot-desktop", copilot / "data.db", "default location (the app's session list)")
    for d in platforms.copilot_desktop_install_dirs():
        add("copilot-desktop", d, "install folder (Windows)")
    for user in vscode_user_dirs():
        add("copilot-vscode", user, "VS Code user folder (default or path catalog)", str(user / "workspaceStorage"),
            "session reader" if fold(str(user / "workspaceStorage")) in read else "")
        for storage in _global_storages(user):
            add("copilot-vscode", storage / "emptyWindowChatSessions", "VS Code profile global storage")
    add("cursor", platforms.cursor_home_dir() / "conversations.db", "default location", reader="Cursor reader")
    add("cursor", platforms.cursor_user_dir(), "default location (editor data)")
    add("claude-desktop", platforms.claude_desktop_dir(), "default location")
    add("windsurf", platforms.windsurf_global_dir(), "default location")
    add("gemini-cli", platforms.gemini_global_dir(), "default location")
    for row in rows.values():
        if row["read_by"] == "" and row["session_folder"] and fold(row["session_folder"]) in read:
            row["read_by"] = "session reader"
    return sorted(rows.values(), key=lambda r: (r["tool"], not r["exists"], fold(r["path"])))


def build_node(inputs: NodeInputs, now: float | None = None) -> dict:
    """The breakdown of one node from its disk and reader (see the module text)."""
    started = time.time()
    now = started if now is None else now
    ing = inputs.ingester
    history_days = inputs.settings.get("history_days") or 0
    cutoff = now - history_days * 86400 if history_days else 0.0
    state = reader_state(ing, inputs.live)
    locations, disk, databases = scan_sessions(ing, state, cutoff)
    stored = inputs.stored
    if stored is not None and inputs.project_filter:
        wanted = {fold(p) for p in inputs.project_filter}
        stored = [s for s in stored if fold(str(s.get("project_path") or "")) in wanted]
    disk_note = ("not compared with a project filter: a session file on disk names its project only once it is read"
                 if inputs.project_filter else "")
    rows = compare(None if inputs.project_filter else disk, stored, disk_note=disk_note,
                   stored_note=f"stored sessions not read: {inputs.stored_error}" if inputs.stored_error else
                   "stored sessions not read")
    return {
        "node_id": inputs.node_id,
        "origin": "live",
        "computed_at": now,
        "duration_ms": round((time.time() - started) * 1000, 1),
        "reader_state": "running daemon" if state.live else
        ("saved read positions" if state.positions_found else "no saved read positions found"),
        "positions_saved_at": state.saved_at or None,
        "settings": inputs.settings,
        "homes": inputs.homes if inputs.homes is not None else homes(ing),
        "locations": sorted(locations, key=lambda r: (r["tool"], not r["exists"], fold(r["path"]))),
        "databases": databases,
        "compare": rows,
        "projects": projects(roots=inputs.roots, repositories=inputs.repositories, stored=stored,
                             context_files=inputs.context_files, ignored_dirs=inputs.settings.get("ignored_dirs") or (),
                             project_filter=inputs.project_filter),
        "context": context_locations(inputs.context_files, catalog_candidates()),
        "store_index": None,
    }


def store_breakdown(node_id: str, snapshot: dict | None, disk_rows: list[dict] | None, stored: list[dict] | None,
                    *, computed_at: float | None, error: str = "", project_filter: Iterable[str] = (),
                    now: float | None = None) -> dict:
    """Another node's breakdown from the store: its published snapshot, and its indexed files against its
    stored sessions."""
    now = time.time() if now is None else now
    project_filter = tuple(project_filter)
    if stored is not None and project_filter:
        wanted = {fold(p) for p in project_filter}
        stored = [s for s in stored if fold(str(s.get("project_path") or "")) in wanted]
    # A node whose reader indexed no file at all runs an aictl that keeps no file index, or has no session file.
    disk, locations = disk_from_store(disk_rows) if disk_rows else (None, [])
    note = ("not compared with a project filter: a session file on disk names its project only once it is read"
            if project_filter else "" if disk_rows is None else
            "the store holds no indexed session file of this node: its aictl keeps no file index, or it has no session file")
    index = {
        "as_of": max((loc["indexed_at"] or 0.0 for loc in locations), default=None),
        "since_daemon_start": (snapshot or {}).get("settings", {}).get("daemon_started_at"),
        "locations": locations,
        "compare": compare(None if project_filter else disk, stored, disk_note=note or
                           (f"indexed files not read: {error}" if error else "the node indexed no session file"),
                           stored_note=f"stored sessions not read: {error}" if error else "stored sessions not read",
                           not_compared={"codex-cli": "not compared from the store: the file index names rollout files "
                                         "and the store names threads; the node's own snapshot compares them"}),
    } if disk_rows is not None or stored is not None else None
    if snapshot is not None:
        body = dict(snapshot)
        body.update(node_id=node_id, origin="published", published_at=computed_at, store_index=index)
        if project_filter:
            body["projects"] = [p for p in body.get("projects") or [] if fold(p["path"]) in {fold(x) for x in project_filter}]
        return body
    return {
        "node_id": node_id, "origin": "store", "computed_at": now, "published_at": None,
        "reader_state": "", "settings": None, "homes": None, "locations": None, "databases": None, "compare": None,
        "projects": projects(roots=(), repositories=(), stored=stored, context_files=(), ignored_dirs=(), local=False,
                             project_filter=project_filter) if stored is not None else None,
        "context": None, "store_index": index,
        "note": "This node publishes no breakdown: its daemon runs an aictl without it, or has not published yet. "
                "What its reader indexed and what the store holds are compared below.",
    }


def compact(node: dict, max_ids: int = PUBLISHED_IDS, max_bytes: int = PUBLISHED_MAX_BYTES) -> str:
    """The breakdown as published: file lists and session ids cut so the row stays under *max_bytes*."""
    body = json.loads(json.dumps(node, default=str))
    body.pop("store_index", None)
    for limit in (max_ids, 50, 0):
        for row in body.get("compare") or ():
            for key in ("missing_ids", "stored_only_ids"):
                row[key] = {k: v[:limit] for k, v in (row.get(key) or {}).items()}
        for g in body.get("context") or ():
            g["listed"] = g["listed"][:limit]
        for loc in body.get("locations") or ():
            loc["unreadable"] = loc["unreadable"][:limit]
        text = json.dumps(body, separators=(",", ":"))
        if len(text.encode("utf-8")) <= max_bytes:
            return text
    body["projects"] = (body.get("projects") or [])[:300]
    body["truncated"] = True
    return json.dumps(body, separators=(",", ":"))[:max_bytes]


def publish(writer: Any, node: dict) -> int:
    """Write the node's breakdown as its snapshot row; returns its size in bytes."""
    text = compact(node)
    writer.upsert("maintenance_state", [{"project": "", "key": SNAPSHOT_KEY, "value": float(node["computed_at"]),
                                         "text": text}])
    return len(text)


# ── reading the store ──────────────────────────────────────────────────


def read_stored(reader: Any, node: str) -> list[dict]:
    from .dashboard.projections.history import HistoryScope

    rows = HistoryScope(reader, node).read("index.stored_sessions")
    seen: dict[str, dict] = {}
    for r in rows:
        prior = seen.get(r["session_id"])
        if prior is None or (r.get("last_activity_at") or 0) > (prior.get("last_activity_at") or 0):
            seen[r["session_id"]] = r
    return list(seen.values())


def read_snapshots(reader: Any, node: str | None) -> dict[str, tuple[float, dict]]:
    from .dashboard.projections.history import HistoryScope

    out: dict[str, tuple[float, dict]] = {}
    for r in HistoryScope(reader, node).read("index.snapshot", limit=1000):
        try:
            body = json.loads(r["text"] or "{}")
        except ValueError:
            continue
        if isinstance(body, dict):
            out[r["node_id"]] = (float(r["computed_at"] or 0.0), body)
    return out


def read_node_from_store(reader: Any, node: str, snapshot: tuple[float, dict] | None,
                         project_filter: Iterable[str] = (), now: float | None = None) -> dict:
    from .dashboard.projections.history import HistoryScope

    body = snapshot[1] if snapshot else None
    since = float(((body or {}).get("settings") or {}).get("daemon_started_at") or 0.0)
    error = ""
    try:
        disk_rows = HistoryScope(reader, node).read("index.disk_sessions", seen_since=since)
        stored = read_stored(reader, node)
    except Exception as exc:  # noqa: BLE001 - one node's failed read is shown on that node
        log.warning("index breakdown: store read of node %s failed: %s", node, exc)
        disk_rows, stored, error = None, None, str(exc)
    return store_breakdown(node, body, disk_rows, stored, computed_at=snapshot[0] if snapshot else None, error=error,
                           project_filter=project_filter, now=now)


# ── this node, live ────────────────────────────────────────────────────


def settings_of(*, roots: Iterable[str], history_days: int, ignored_dirs: Iterable[str], node_id: str,
                store: Any, daemon: dict | None, polls: list[dict], budget_bytes: int | None) -> dict:
    from .ingesters.transcript_usage import DEFERRED_BYTES_PER_POLL

    cluster = getattr(store, "cluster", "") or ""
    return {
        "node_id": node_id,
        "roots": [str(r) for r in roots],
        "ignored_dirs": list(ignored_dirs),
        "history_days": history_days,
        "read_limit_bytes_per_poll": DEFERRED_BYTES_PER_POLL,
        "read_limit_now_bytes": budget_bytes,
        "store_host": re.sub(r"^https?://", "", cluster).split("/")[0] if cluster else "",
        "store_database": getattr(store, "database", "") or "",
        "daemon_pid": (daemon or {}).get("pid"),
        "daemon_started_at": (daemon or {}).get("started_at"),
        "polls": polls,
    }


def files_of_snapshot(snapshot: Any) -> list[dict]:
    """The context files of the daemon's last discovery, and every project's memory files."""
    from .tools import memory_inventory_files

    out: dict[str, dict] = {}
    for tool in getattr(snapshot, "tools", None) or ():
        for f in getattr(tool, "files", None) or ():
            out.setdefault(f.path, _file_row(f, tool.tool))
    for f in memory_inventory_files():
        out[f.path] = _file_row(f, f.tool)
    return list(out.values())


def _file_row(f: Any, tool: str) -> dict:
    return {"path": f.path, "tool": getattr(f, "tool", "") or tool, "category": getattr(f, "kind", ""),
            "scope": getattr(f, "scope", ""), "size": int(getattr(f, "size", 0) or 0),
            "mtime": float(getattr(f, "mtime", 0) or 0), "project": getattr(f, "project", "") or ""}


def _started_at() -> float:
    """When this process started. Its reader indexes every file it finds at its first poll, after this time: an
    indexed row older than it is a file this process did not find (index.disk_sessions, seen_since)."""
    try:
        import psutil

        return float(psutil.Process().create_time())
    except Exception:  # noqa: BLE001 - psutil missing or denied: the time aictl's code was first loaded
        from .dashboard.runtime_health import _process_started_at

        return _process_started_at()


def live_breakdown(server: Any, *, project_filter: Iterable[str] = (), now: float | None = None,
                   read_store: bool = True) -> dict:
    """This node's breakdown, from the running daemon: its reader, its last discovery and its store."""
    from . import tree_walk
    from .dashboard.projections.history import configured_reader
    from .ingesters.transcript_usage import DEFERRED_BYTES_PER_POLL, TranscriptUsageIngester
    from .platforms import load_config
    from .stores import configured_destination, has_history, local_node_id, normalize_node_id

    cfg = load_config()
    node = normalize_node_id(local_node_id())
    handles = getattr(server, "ingesters", None) or {}
    handle = handles.get("transcript-usage")
    ing = getattr(handle, "ingester", None)
    live = ing is not None
    if ing is None:
        # The daemon starts its readers after its first snapshot: until then, their saved positions tell the state.
        from .state_file import StateFile

        restart = getattr(server.store, "restart_dir", None)
        checkpoint = StateFile(Path(restart) / "transcript_usage.json") if restart else None
        ing = TranscriptUsageIngester(None, backfill_days=cfg.history_days, checkpoint=checkpoint, defer_old=True)
        ing._store.refresh_app_sessions(set())
    roots = [str(server.root)]
    polls = [{"reader": h.name, "enabled": h.enabled, "last_poll_at": h.status().get("last_poll_ts") or None,
              "last_completed_at": h.status().get("last_success_at"), "last_error": h.status().get("last_error")}
             for h in handles.values()]
    stored, error = None, ""
    reader = configured_reader(server.store)
    if read_store and has_history(reader):
        try:
            stored = read_stored(reader, node)
        except Exception as exc:  # noqa: BLE001 - the disk part stands without the store
            error = str(exc)
    elif read_store:
        error = "no store configured"
    repos = sorted({str(p) for r in roots for p in tree_walk.repositories(r)})
    budget = int(DEFERRED_BYTES_PER_POLL * ing._budget_scale) if live else None
    inputs = NodeInputs(
        node_id=node, ingester=ing, live=live, roots=roots,
        settings=settings_of(roots=roots, history_days=cfg.history_days, ignored_dirs=cfg.ignored_dirs, node_id=node,
                             store=configured_destination(), daemon={"pid": os.getpid(), "started_at": _started_at()},
                             polls=polls, budget_bytes=budget),
        context_files=files_of_snapshot(server.store.snapshot), repositories=repos, stored=stored,
        stored_error=error, project_filter=tuple(project_filter))
    return build_node(inputs, now)


def offline_breakdown(roots: Iterable[str], *, read_store: bool = True, project_filter: Iterable[str] = (),
                      now: float | None = None) -> dict:
    """This node's breakdown without a running daemon: the reader's saved positions stand in for its state, and
    discovery runs here, under *roots*."""
    from . import tree_walk
    from .ingesters.transcript_usage import TranscriptUsageIngester
    from .platforms import load_config
    from .state_file import StateFile, restart_directory
    from .stores import configured_destination, local_node_id, normalize_node_id
    from .tools import discover_all

    cfg = load_config()
    destination = configured_destination()
    node = normalize_node_id(local_node_id())
    checkpoint = None
    if destination is not None:
        directory = restart_directory(destination.cluster, destination.database, destination.node_id)
        checkpoint = StateFile(directory / "transcript_usage.json")
    ing = TranscriptUsageIngester(None, backfill_days=cfg.history_days, checkpoint=checkpoint, defer_old=True)
    ing._store.refresh_app_sessions(set())
    roots = [str(Path(r).resolve()) for r in roots]
    files: dict[str, dict] = {}
    repos: set[str] = set()
    for root in roots:
        for tool in discover_all(Path(root)):
            for f in tool.files:
                files.setdefault(f.path, _file_row(f, tool.tool))
        tree_walk.listing(Path(root))
        repos.update(str(p) for p in tree_walk.repositories(root))
    from .tools import memory_inventory_files

    for f in memory_inventory_files():
        files[f.path] = _file_row(f, f.tool)
    stored, error = None, ""
    if read_store and destination is not None:
        try:
            from .stores.kusto.client import KustoClientFactory
            from .stores.kusto.reader import KustoReader

            reader = KustoReader(KustoClientFactory.client(destination), destination.database, settings=destination)
            stored = read_stored(reader, node)
        except Exception as exc:  # noqa: BLE001 - the disk part stands without the store
            error = str(exc)
    elif read_store:
        error = "no store configured"
    inputs = NodeInputs(
        node_id=node, ingester=ing, live=False, roots=roots,
        settings=settings_of(roots=roots, history_days=cfg.history_days, ignored_dirs=cfg.ignored_dirs, node_id=node,
                             store=destination, daemon=None, polls=[], budget_bytes=None),
        context_files=list(files.values()), repositories=sorted(repos), stored=stored, stored_error=error,
        project_filter=tuple(p for p in project_filter if p))
    return build_node(inputs, now)


def breakdown(server: Any, scope: Any, *, project_filter: Iterable[str] = (), now: float | None = None) -> dict:
    """The route's body: this node live, or the named node or the fleet from the store."""
    from .dashboard.history_scope import label
    from .dashboard.projections.history import configured_reader, node_scope
    from .stores import has_history

    now = time.time() if now is None else now
    project_filter = tuple(p for p in project_filter if p)
    if scope.kind == "local":
        return _labelled({"generated_at": now, "scope": {"kind": "local", "node_id": None},
                          "project_filter": list(project_filter),
                          "nodes": [live_breakdown(server, project_filter=project_filter, now=now)]})
    reader = configured_reader(server.store)
    if not has_history(reader):
        from .dashboard.history_scope import ScopeError

        raise ScopeError("Node history requires a shared Kusto store", 422, "unsupported_scope")
    snapshots = read_snapshots(reader, scope.node)
    if scope.node is not None:
        nodes = [scope.node]
    else:
        listed = reader.read("nodes.inventory", {**node_scope(None), "limit": 1000}).rows
        nodes = sorted({r["node_id"] for r in listed} | set(snapshots))
    body = [read_node_from_store(reader, n, snapshots.get(n), project_filter, now) for n in nodes]
    for item in body:
        item["node_id"] = label(item["node_id"])
    return _labelled({"generated_at": now,
                      "scope": {"kind": scope.kind, "node_id": label(scope.node) if scope.node is not None else None},
                      "project_filter": list(project_filter), "nodes": body})


def _labelled(body: dict) -> dict:
    """The body with the display name of every tool it names."""
    from .dashboard.projection_utils import _label

    tools: set[str] = set()
    for node in body["nodes"]:
        for part in ("homes", "locations", "databases", "compare", "context"):
            tools.update(str(row.get("tool") or "") for row in node.get(part) or ())
        index = node.get("store_index") or {}
        for part in ("locations", "compare"):
            tools.update(str(row.get("tool") or "") for row in index.get(part) or ())
        for project in node.get("projects") or ():
            tools.update(project.get("sessions") or {})
    body["tool_labels"] = {tool: _label(tool) for tool in sorted(tools - {""})}
    return body


# ── text ───────────────────────────────────────────────────────────────


def _when(ts: Any) -> str:
    if not ts:
        return "-"
    return time.strftime("%Y-%m-%d %H:%M", time.localtime(float(ts)))


def _size(n: Any) -> str:
    value = float(n or 0)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:.0f} {unit}" if unit == "B" else f"{value:.1f} {unit}"
        value /= 1024
    return f"{value} B"


def _num(n: Any) -> str:
    return "-" if n is None else f"{n:,}"


def format_text(node: dict, *, ids: bool = False) -> str:
    """The breakdown of one node as text, every section with its concrete values."""
    lines: list[str] = []
    out = lines.append
    s = node.get("settings") or {}
    out(f"Node {node['node_id']} · {node.get('origin')} · computed {_when(node.get('computed_at'))}"
        + (f" · reader state from {node['reader_state']}" if node.get("reader_state") else ""))
    if s:
        out("")
        out("Settings")
        out(f"  roots            {', '.join(s.get('roots') or []) or '-'}")
        out(f"  ignored_dirs     {', '.join(s.get('ignored_dirs') or [])}")
        days = s.get("history_days")
        out(f"  history_days     {days} ({'every session file on disk' if not days else f'files changed in the last {days} days'})")
        out(f"  read limit       {_size(s.get('read_limit_bytes_per_poll'))} of backlog per poll"
            + (f" (now {_size(s['read_limit_now_bytes'])})" if s.get("read_limit_now_bytes") is not None else ""))
        out(f"  store            {s.get('store_host') or 'none'} / {s.get('store_database') or '-'}")
        out("  daemon           " + (f"pid {s['daemon_pid']}, started {_when(s.get('daemon_started_at'))}"
                                      if s.get("daemon_pid") else "not this process (saved read positions are used)"))
        for p in s.get("polls") or ():
            out(f"  last poll        {p['reader']}: completed {_when(p.get('last_completed_at'))}"
                + (f", error: {p['last_error']}" if p.get("last_error") else ""))
    if node.get("homes"):
        out("")
        out("Tool homes")
        for h in node["homes"]:
            out(f"  {h['tool']:16s} {'found  ' if h['exists'] else 'missing'} {h['path']}")
            out(f"  {'':16s}         named by: {', '.join(h['found_by'])}"
                + (f"; read by the {h['read_by']}" if h.get("read_by") else ""))
    if node.get("locations"):
        out("")
        out("Session locations")
        for loc in node["locations"]:
            states = ", ".join(f"{k} {v:,}" for k, v in loc["states"].items() if v)
            out(f"  {loc['tool']:16s} {loc['kind']}: {loc['path']}" + ("" if loc.get("exists") is not False else " (missing)"))
            out(f"  {'':16s} {_num(loc['files'])} files, {_size(loc['bytes'])}, {_num(loc['sessions'])} sessions, "
                f"newest {_when(loc.get('newest'))}, oldest {_when(loc.get('oldest'))}")
            if states:
                out(f"  {'':16s} {states}")
            extra = [f"{loc[k]:,} {label}" for k, label in (
                ("unclaimed", "files of an unknown form"), ("folders_without_transcript", "session folders without events.jsonl"),
                ("older_version_files", "files read by an older reader")) if loc.get(k)]
            if extra:
                out(f"  {'':16s} {', '.join(extra)}")
            for bad in loc.get("unreadable") or ():
                out(f"  {'':16s} unreadable: {bad['path']}: {bad['reason']}")
    for db in node.get("databases") or ():
        out("")
        out(f"Copilot database {db['path']}" + ("" if db["exists"] else " (missing)"))
        if db["exists"]:
            out(f"  {db['sessions']:,} sessions: {db['with_events_file']:,} with an events.jsonl, "
                f"{db['events_file_seen_before']:,} whose events.jsonl was read before, {db['without_events_file']:,} "
                f"without; {db['outside_window']:,} of these older than history_days"
                + ("" if db["usage_rows_read"] else "; usage rows are not read from this home's database"))
        if db.get("error"):
            out(f"  error: {db['error']}")
    for title, rows in (("On disk against stored", node.get("compare")),
                        ("On disk as indexed in the store, against stored", (node.get("store_index") or {}).get("compare"))):
        if not rows:
            continue
        out("")
        out(title)
        out(f"  {'tool':16s} {'on disk':>8s} {'stored':>8s} {'both':>8s} {'not stored':>10s} {'only stored':>11s}")
        for c in rows:
            if not c["comparable"]:
                out(f"  {c['tool']:16s} {_num(c['on_disk']):>8s} {_num(c['stored']):>8s}  not compared: {c['reason']}")
                continue
            out(f"  {c['tool']:16s} {_num(c['on_disk']):>8s} {_num(c['stored']):>8s} {_num(c['matched']):>8s} "
                f"{sum(c['missing'].values()):>10,} {sum(c['stored_only'].values()):>11,}")
            for key, n in c["missing"].items():
                out(f"  {'':16s}   not stored, {MISSING_REASONS[key]}: {n:,}")
                if ids:
                    out(f"  {'':16s}     {' '.join(c['missing_ids'][key])}")
            for key, n in c["stored_only"].items():
                out(f"  {'':16s}   only stored, {STORED_ONLY_REASONS[key]}: {n:,}")
                if ids:
                    out(f"  {'':16s}     {' '.join(c['stored_only_ids'][key])}")
    if node.get("projects"):
        out("")
        out(f"Projects ({len(node['projects']):,})")
        for p in node["projects"]:
            flags = [f for f, on in (("missing", p.get("exists") is False), ("ignored", p.get("ignored")),
                                      ("outside the roots", p.get("outside_roots"))) if on]
            sessions = ", ".join(f"{t} {n:,}" for t, n in sorted(p["sessions"].items()))
            out(f"  {p['path']}" + (f" ({', '.join(flags)})" if flags else ""))
            detail = [f"found as {', '.join(p['found_by'])}"]
            if p.get("git_root"):
                detail.append(f"git {p['git_root']}" + (f", worktree of {p['worktree_of']}" if p.get("worktree_of") else ""))
            if sessions:
                detail.append(f"sessions {sessions}, last {_when(p.get('last_activity'))}")
            files = [f"{p[k]:,} {k}" for k in ("instructions", "memory", "skills", "agents") if p.get(k)]
            if files:
                detail.append(", ".join(files))
            out(f"    {'; '.join(detail)}")
    if node.get("context"):
        out("")
        out("Instruction, skill, agent and memory folders")
        for g in node["context"]:
            out(f"  {g['category']:12s} {g['tool']:16s} {g['scope']:8s} {g['files']:>5,} files "
                f"{'' if g['exists'] else '(missing) '}{g['path']}")
    if node.get("note"):
        out("")
        out(node["note"])
    return "\n".join(lines)


# ── the daemon's publisher ─────────────────────────────────────────────


def _content_key(node: dict) -> int:
    """What a published breakdown says, without the times of its computation."""
    body = {k: v for k, v in node.items() if k not in ("computed_at", "duration_ms", "positions_saved_at", "settings")}
    return hash(json.dumps(body, sort_keys=True, default=str))


class Publisher:
    """Publishes this node's breakdown every PUBLISH_INTERVAL_S, so other nodes' screens can show it."""

    def __init__(self, server: Any, writer: Any, *, interval: float = PUBLISH_INTERVAL_S, delay: float = PUBLISH_DELAY_S,
                 clock: Callable[[], float] = time.time) -> None:
        self.server = server
        self.writer = writer
        self.interval = interval
        self.delay = delay
        self.clock = clock
        self.stop = threading.Event()
        self.last: dict = {}
        self.thread = threading.Thread(target=self._run, name="aictl-index-publisher", daemon=True)

    def start(self) -> Publisher:
        self.thread.start()
        return self

    def publish_once(self) -> int:
        from .node_status import TASKS

        TASKS.begin("index_snapshot", "Index snapshot publish", quiet=True)
        try:
            node = live_breakdown(self.server, now=self.clock())
            size = publish(self.writer, node)
        except Exception as exc:
            TASKS.end("index_snapshot", error=f"{type(exc).__name__}: {exc}")
            raise
        # A line only when what the snapshot says changed; every publish is in the node's status record.
        key = _content_key(node)
        TASKS.end("index_snapshot", f"{size:,} bytes", quiet=key == self.last.get("key"))
        self.last = {"published_at": node["computed_at"], "bytes": size, "key": key}
        return size

    def _run(self) -> None:
        if self.stop.wait(self.delay):
            return
        while True:
            try:
                self.publish_once()
            except Exception:  # noqa: BLE001 - publishing must never stop the daemon
                log.exception("index breakdown: publishing failed; trying again at the next interval")
            if self.stop.wait(self.interval):
                return
