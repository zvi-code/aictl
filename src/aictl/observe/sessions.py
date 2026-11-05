# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Index of Copilot sessions on disk: where they are, what ids they have, what files they hold.

Everything here is read-only over tool data and needs no database or daemon.
Listing stats and reads small metadata files; event logs are parsed only for a
single session on request. Content that transcripts and stores hold is untrusted.

Sources:

* ``<copilot home>/session-state/<id>/``: CLI, desktop app and VS Code-hosted sessions.
* ``<copilot home>/session-store.db``: past sessions, including ones with no folder left.
* ``<copilot home>/data.db``: the desktop app's ``sessions`` table. Named columns only;
  other tables in that file hold credentials, and the file is never served.
* VS Code user folders, located through the ``paths-*.csv`` rows plus ``platforms.py``:
  ``workspaceStorage/<hash>/`` and ``globalStorage/`` of the default and named profiles.
"""

from __future__ import annotations

import base64
import binascii
import csv
import fnmatch
import hashlib
import json
import ntpath
import os
import re
import sqlite3
import stat as stat_module
import time
from collections.abc import Iterable
from pathlib import Path, PurePath, PureWindowsPath
from typing import Any
from urllib.parse import unquote, urlsplit

from .. import platforms
from ..ingesters._common import coerce_ts, open_readonly
from .collect import FRESH_S, Collector, _query, _workspace_yaml, capture_mode
from .copilot_events import EventsFile, clean
from .procs import snapshot

SURFACES = ("copilot-cli", "copilot-desktop", "copilot-vscode", "unknown")
DEFAULT_CAT_BYTES = 256 * 1024
API_MAX_BYTES = 1024 * 1024
MAX_ARTIFACTS = 20000
_UUID = r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
_UUID_RE = re.compile(_UUID)
_TOOL_PID_TS = re.compile(r"^([A-Za-z][\w.-]*):(\d+):(\d+(?:\.\d+)?)$")
_ENV_VAR = re.compile(r"%([^%\\/]+)%")
_USER_DIR_ROW = re.compile(r"^(.*[\\/]User)[\\/](?:workspaceStorage|globalStorage[\\/]github\.copilot-chat)[\\/]?$")
_CHECKPOINT_FILE = re.compile(r"^(\d+)-")
_CLI_RESOURCE = re.compile(rf"^(agent-host-copilotcli|copilotcli):/+({_UUID})$")
_LOCAL_CHAT_RESOURCE = re.compile(r"^vscode-chat-session://local/([A-Za-z0-9_=-]+)$")
_SHA1_NAME = re.compile(r"^[0-9a-f]{40}$")
_CHAT_FIELD = re.compile(r'"(sessionId|creationDate|customTitle)":\s*("(?:[^"\\]|\\.)*"|\d+)')
_CHAT_TITLE_PATCH = re.compile(r'^\{"kind":\s*1,\s*"k":\s*\["customTitle"\]')
CHAT_HEAD_TAIL_BYTES = 64 * 1024
MIN_PREFIX = 4
LOCK_TS_TOLERANCE_S = 86400.0

# Never read, list as readable, or serve, whatever folder they turn up in.
_DENIED_NAMES = (
    "data.db",
    "data.db-*",
    "data.db.*",
    "*credential*",
    "*.pem",
    "*.key",
    "*token*.json",
    "auth.json",
    ".env",
    ".env.*",
    # VS Code's state store keeps secret:// entries.
    "*.vscdb",
    "*.vscdb-*",
    "*.vscdb.*",
)


# ── locations ────────────────────────────────────────────────────────


def expand_location(raw: str, env: dict[str, str] | None = None, windows: bool | None = None) -> str | None:
    """Expand a ``paths-*.csv`` row such as ``%APPDATA%\\Code\\User``; ``None`` if a variable is unset.

    Windows variable names are case-insensitive. The value keeps its own drive and
    case, since ``APPDATA`` and ``USERPROFILE`` may be on different drives.
    """
    env = os.environ if env is None else env
    windows = platforms.IS_WINDOWS if windows is None else windows
    folded = {k.upper(): v for k, v in env.items()}
    missing = False

    def sub(match: re.Match[str]) -> str:
        nonlocal missing
        value = folded.get(match.group(1).upper(), "")
        if not value:
            missing = True
        return value

    out = _ENV_VAR.sub(sub, raw)
    if missing:
        return None
    if out.startswith("~"):
        home = folded.get("USERPROFILE" if windows else "HOME") or str(Path.home())
        out = home + out[1:]
    return out.replace("/", "\\") if windows else out.replace("\\", "/")


def _csv_user_dirs(env: dict[str, str] | None = None, windows: bool | None = None) -> list[str]:
    """VS Code ``User`` folders named by the platform's path catalog."""
    windows = platforms.IS_WINDOWS if windows is None else windows
    name = "paths-windows.csv" if windows else "paths-unix.csv"
    out: list[str] = []
    try:
        with (Path(__file__).resolve().parent.parent / "data" / name).open(encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                if row.get("ai_tool") != "copilot-vscode":
                    continue
                match = _USER_DIR_ROW.match(row.get("path") or "")
                if match:
                    expanded = expand_location(match.group(1), env, windows)
                    if expanded and expanded not in out:
                        out.append(expanded)
    except OSError:
        pass
    return out


def _fold(path: str) -> str:
    """Comparison form of a path: Windows paths compare case-insensitively, either separator."""
    if platforms.IS_WINDOWS or re.match(r"^[A-Za-z]:[\\/]", path) or path.startswith("\\\\"):
        return ntpath.normcase(ntpath.normpath(path))
    return os.path.normpath(path)


def vscode_user_dirs() -> list[Path]:
    """Every VS Code ``User`` folder to search, without duplicates."""
    seen: set[str] = set()
    out: list[Path] = []
    for raw in [*_csv_user_dirs(), str(platforms.vscode_user_dir()), str(platforms.vscode_insiders_user_dir())]:
        key = _fold(raw)
        if key not in seen:
            seen.add(key)
            out.append(Path(raw))
    return out


def _global_storages(user_dir: Path) -> list[Path]:
    """``globalStorage`` of the default profile and of each named profile."""
    out = [user_dir / "globalStorage"]
    try:
        out += sorted(p / "globalStorage" for p in (user_dir / "profiles").iterdir() if (p / "globalStorage").is_dir())
    except OSError:
        pass
    return out


def search_locations() -> list[str]:
    """Every location the index reads, expanded, for "not found" messages."""
    home = platforms.copilot_global_dir()
    out = [str(platforms.copilot_session_dir()), str(home / "session-store.db"), str(home / "data.db")]
    for user in vscode_user_dirs():
        out.append(str(user / "workspaceStorage"))
        for gs in _global_storages(user):
            out.append(str(gs / "github.copilot-chat"))
            out.append(str(gs / "emptyWindowChatSessions"))
    return out


def workspace_folder(ws_dir: Path) -> str | None:
    """Project folder of a ``workspaceStorage/<hash>`` directory, from its ``workspace.json``."""
    try:
        with (ws_dir / "workspace.json").open(encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    raw = data.get("folder") or data.get("workspace")
    return uri_to_path(raw) if isinstance(raw, str) else None


def uri_to_path(uri: str) -> str:
    """``file:///c%3A/Users/x`` becomes ``c:\\Users\\x``; other schemes keep their authority."""
    parts = urlsplit(uri)
    path = unquote(parts.path)
    if parts.scheme == "file":
        if parts.netloc:
            return clean("\\\\" + parts.netloc + path.replace("/", "\\"), 240)
        if len(path) > 2 and path[0] == "/" and path[2] == ":":
            return clean(path[1:].replace("/", "\\"), 240)
        return clean(path, 240)
    if parts.scheme:
        return clean(f"{parts.scheme}://{unquote(parts.netloc)}{path}", 240)
    return clean(uri, 240)


# ── index ────────────────────────────────────────────────────────────


def _new_record(sid: str, surface: str, how: str) -> dict[str, Any]:
    return {
        "id": sid,
        "surface": surface,
        "surface_source": how,
        "aliases": [],
        "folder": None,
        "roots": [],
        "project": None,
        "git_root": None,
        "repository": None,
        "branch": None,
        "title": None,
        "started_at": None,
        "last_activity_at": None,
        "state": "unknown",
        "models": [],
        "pids": [],
        "sub_agents": [],
        "artifact_count": None,
        "artifact_bytes": None,
        "sources": [],
        "partial": False,
    }


def _embedded_alias(name: str) -> str | None:
    """``optimistic-chat-<uuid>`` and ``pending-session:draft:<uuid>`` name the id they will become."""
    match = _UUID_RE.search(name)
    return match.group(0) if match and match.group(0) != name else None


def _add_alias(rec: dict[str, Any], alias: Any) -> None:
    if isinstance(alias, str) and alias and alias != rec["id"] and alias not in rec["aliases"]:
        rec["aliases"].append(alias)


def _state_text(db: Path, key: str) -> str | None:
    """One named key of a ``state.vscdb``. Only named keys are read: the table also holds ``secret://`` rows."""
    conn = open_readonly(db, "copilot session index")
    if conn is None:
        return None
    try:
        row = conn.execute("select value from ItemTable where key = ?", (key,)).fetchone()
    except sqlite3.Error:
        return None
    finally:
        conn.close()
    if not row or row[0] is None:
        return None
    return row[0].decode("utf-8", "replace") if isinstance(row[0], bytes) else str(row[0])


def _state_json(db: Path, key: str) -> Any:
    text = _state_text(db, key)
    if text is None:
        return None
    try:
        return json.loads(text)
    except ValueError:
        return None


def _chat_index(db: Path) -> dict[str, dict[str, Any]]:
    """Entries of VS Code's ``chat.ChatSessionStore.index`` in one ``state.vscdb``."""
    data = _state_json(db, "chat.ChatSessionStore.index")
    entries = data.get("entries") if isinstance(data, dict) else None
    return {k: v for k, v in entries.items() if isinstance(v, dict)} if isinstance(entries, dict) else {}


def _local_chat_id(resource: str) -> str | None:
    """``vscode-chat-session://local/<base64 of id>`` names a chat session file."""
    match = _LOCAL_CHAT_RESOURCE.match(resource)
    if not match:
        return None
    encoded = match.group(1)
    try:
        decoded = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)).decode("ascii")
    except (binascii.Error, ValueError):
        return None
    return decoded if _UUID_RE.fullmatch(decoded) else None


def _chat_file_fields(path: Path, size: int) -> dict[str, Any]:
    """Title and creation time from a bounded head and tail of a chat file, of any size.

    The session header comes first in a ``.jsonl`` file and may be followed by a very
    large ``requests`` value, so only the part before ``requests`` is searched. Keys
    inside prompt text have their quotes escaped and do not match. A later
    ``customTitle`` patch line wins. A header naming another session is ignored.
    """
    try:
        with path.open("rb") as fh:
            head = fh.read(CHAT_HEAD_TAIL_BYTES)
            tail = b""
            if size > CHAT_HEAD_TAIL_BYTES:
                fh.seek(max(CHAT_HEAD_TAIL_BYTES, size - CHAT_HEAD_TAIL_BYTES))
                tail = fh.read(CHAT_HEAD_TAIL_BYTES)
    except OSError:
        return {}
    head_text = head.decode("utf-8", "replace")
    tail_text = tail.decode("utf-8", "replace")
    header = head_text.split('"requests":', 1)[0]
    if path.suffix == ".json":  # The older whole-file form writes these keys after ``requests``.
        header += "\n" + tail_text.rsplit('"requests":', 1)[-1]
    fields: dict[str, Any] = {}
    for key, value in _CHAT_FIELD.findall(header):
        if key not in fields:
            try:
                fields[key] = json.loads(value)
            except ValueError:
                continue
    if fields.get("sessionId", path.stem) != path.stem:
        return {}
    lines = head_text.split("\n")[:-1] if size > CHAT_HEAD_TAIL_BYTES else head_text.split("\n")
    lines += tail_text.split("\n")[1:]
    for line in lines:
        if _CHAT_TITLE_PATCH.match(line):
            try:
                value = json.loads(line).get("v")
            except ValueError:
                continue
            if isinstance(value, str):
                fields["customTitle"] = value
    return fields


class SessionIndex:
    """One scan of the stores. Results stay in memory for this object's lifetime only."""

    def __init__(self, now: float | None = None) -> None:
        self.now = time.time() if now is None else now
        self.capture = capture_mode()
        self.records: dict[str, dict[str, Any]] = {}
        self._alias_map: dict[str, str] = {}
        self._locks: dict[str, list[tuple[int, float]]] = {}
        self._head_cache: dict[str, bool] = {}
        self._hashed_edits: list[str] = []
        self._scan()

    # ── scan ─────────────────────────────────────────────────────────

    def _scan(self) -> None:
        store_home = platforms.copilot_global_dir()
        self._scan_state_dirs(platforms.copilot_session_dir())
        self._apply_store(store_home / "session-store.db")
        self._apply_desktop(store_home / "data.db")
        self._apply_chats_dir(store_home / "chats")
        self._apply_live_pids()
        for user in vscode_user_dirs():
            self._scan_vscode(user)
        self._finish()

    def _scan_state_dirs(self, base: Path) -> None:
        try:
            entries = list(os.scandir(base))
        except OSError:
            return
        for entry in entries:
            # Dot folders here hold the tool's own bookkeeping, not sessions.
            if entry.name.startswith(".") or not entry.is_dir(follow_symlinks=False):
                continue
            try:
                self._state_dir(entry)
            except OSError:
                continue

    def _state_dir(self, entry: os.DirEntry[str]) -> None:
        folder = Path(entry.path)
        locks: list[tuple[int, float]] = []
        names: set[str] = set()
        mtime = 0.0
        with os.scandir(entry.path) as inner:
            for f in inner:
                names.add(f.name)
                if f.name.startswith("inuse.") and f.name.endswith(".lock") and f.name[6:-5].isdigit():
                    locks.append((int(f.name[6:-5]), f.stat().st_mtime))
                elif f.name == "events.jsonl":
                    mtime = f.stat().st_mtime
        meta = _workspace_yaml(folder) if "workspace.yaml" in names else {}
        rec = _new_record(entry.name, *self._surface(folder, meta, names))
        rec["folder"] = str(folder)
        rec["roots"] = [str(folder)]
        rec["sources"].append("session-state")
        if "vscode.metadata.json" in names:
            # VS Code writes this file when it lists a session; origin says who started it.
            rec["sources"].append("vscode.metadata.json")
        rec["project"] = clean(meta.get("cwd") or "", 240) or None
        rec["git_root"] = clean(meta.get("git_root") or "", 240) or None
        rec["branch"] = clean(meta.get("branch") or "", 80) or None
        rec["title"] = clean(meta.get("name") or "", 120) or None
        extra = _extra_yaml(folder) if "workspace.yaml" in names else {}
        rec["repository"] = clean(extra.get("repository") or "", 120) or None
        rec["started_at"] = coerce_ts(extra.get("created_at")) or None
        rec["last_activity_at"] = max(mtime, coerce_ts(extra.get("updated_at")) or 0.0) or None
        _add_alias(rec, extra.get("mc_session_id"))
        alias = _embedded_alias(entry.name)
        if alias:
            _add_alias(rec, alias)
            rec["state"] = "pending"
            rec["partial"] = True
        self._locks[entry.name] = locks
        self.records[entry.name] = rec

    def _surface(self, folder: Path, meta: dict[str, str], names: set[str]) -> tuple[str, str]:
        client = meta.get("client_name", "")
        if client == "github/autopilot":
            return "copilot-desktop", f"workspace.yaml client_name={client}"
        origin = None
        if "vscode.metadata.json" in names:
            try:
                with (folder / "vscode.metadata.json").open(encoding="utf-8") as fh:
                    origin = json.load(fh).get("origin")
            except (OSError, ValueError, AttributeError):
                origin = None
        if origin == "vscode":
            return "copilot-vscode", "vscode.metadata.json origin=vscode"
        if "events.jsonl" in names and self._log_names_vscode(folder / "events.jsonl"):
            return "copilot-vscode", "events.jsonl session.start has vscodeVersion"
        if client:
            return "copilot-cli", f"workspace.yaml client_name={client}"
        return "unknown", "no client_name in workspace.yaml"

    @staticmethod
    def _log_names_vscode(path: Path) -> bool:
        try:
            with path.open("rb") as fh:
                return b'"vscodeVersion"' in fh.read(8192)
        except OSError:
            return False

    def _apply_store(self, db: Path) -> None:
        rows = _query(db, "select id, cwd, repository, branch, summary, created_at, updated_at from sessions")
        for sid, cwd, repo, branch, summary, created, updated in rows:
            rec = self.records.get(sid)
            if rec is None:
                rec = self.records[sid] = _new_record(
                    sid, "unknown", "only in session-store.db, which does not record the client"
                )
                rec["partial"] = True
            rec["sources"].append("session-store.db")
            rec["project"] = rec["project"] or (clean(cwd, 240) if cwd else None)
            rec["repository"] = rec["repository"] or (clean(repo, 120) if repo else None)
            rec["branch"] = rec["branch"] or (clean(branch, 80) if branch else None)
            rec["title"] = rec["title"] or (clean(summary, 120) if summary else None)
            rec["started_at"] = rec["started_at"] or coerce_ts(created) or None
            rec["last_activity_at"] = rec["last_activity_at"] or coerce_ts(updated) or None
        usage = _query(db, "select session_id, model, agent_id from assistant_usage_events group by 1, 2, 3")
        for sid, model, agent in usage:
            rec = self.records.get(sid)
            if rec is None:
                continue
            if model and model not in rec["models"]:
                rec["models"].append(clean(model, 60))
            if agent and agent not in rec["sub_agents"] and len(rec["sub_agents"]) < 100:
                rec["sub_agents"].append(clean(agent, 80))

    def _apply_desktop(self, db: Path) -> None:
        columns = {r[1] for r in _query(db, "pragma table_info(sessions)")}
        wanted = [c for c in ("id", "title", "model", "is_running", "created_at", "updated_at") if c in columns]
        if "id" not in wanted:
            return
        for row in _query(db, f"select {','.join(wanted)} from sessions"):
            d = dict(zip(wanted, row))
            rec = self.records.get(d["id"])
            if rec is None:
                rec = self.records[d["id"]] = _new_record(d["id"], "copilot-desktop", "row in data.db sessions")
                rec["partial"] = True
            elif rec["surface"] == "unknown":
                rec["surface"], rec["surface_source"] = "copilot-desktop", "row in data.db sessions"
            rec["sources"].append("data.db")
            rec["title"] = clean(d["title"], 120) if d.get("title") else rec["title"]
            if d.get("model") and d["model"] not in rec["models"]:
                rec["models"].append(clean(d["model"], 60))
            rec["started_at"] = rec["started_at"] or coerce_ts(d.get("created_at")) or None
            rec["last_activity_at"] = rec["last_activity_at"] or coerce_ts(d.get("updated_at")) or None
            if d.get("is_running"):
                rec["state"] = "running"

    def _apply_chats_dir(self, chats: Path) -> None:
        """``chats/<date>/<two-words>-<first 8 of id>`` gives a session a friendly name."""
        try:
            days = list(os.scandir(chats))
        except OSError:
            return
        by_head: dict[str, list[str]] = {}
        for sid in self.records:
            by_head.setdefault(sid[:8], []).append(sid)
        for day in days:
            if not day.is_dir(follow_symlinks=False):
                continue
            if day.name in self.records:
                self.records[day.name]["roots"].append(day.path)
                continue
            try:
                inner = list(os.scandir(day.path))
            except OSError:
                continue
            for item in inner:
                owners = by_head.get(item.name.rsplit("-", 1)[-1], [])
                if len(owners) == 1:  # a shared prefix would be a guess
                    rec = self.records[owners[0]]
                    _add_alias(rec, item.name)
                    rec["roots"].append(item.path)

    def _apply_live_pids(self) -> None:
        table = snapshot() if any(self._locks.values()) else None
        for sid, locks in self._locks.items():
            rec = self.records[sid]
            live = [pid for pid, mtime in locks if Collector._lock_valid(pid, mtime, table)]
            if live:
                rec["pids"] = sorted(live)
                rec["state"] = "running"
                holder = table.rows[live[0]].tool if table else None
                if holder in ("copilot-vscode", "copilot-desktop"):
                    rec["surface"], rec["surface_source"] = holder, f"live process {live[0]} is {holder}"

    def _scan_vscode(self, user: Path) -> None:
        edition = user.parent.name
        try:
            ws_dirs = list(os.scandir(user / "workspaceStorage"))
        except OSError:
            ws_dirs = []
        for ws in ws_dirs:
            if ws.is_dir(follow_symlinks=False):
                self._scan_workspace(Path(ws.path), edition)
                self._apply_vscode_state(Path(ws.path) / "state.vscdb")
        for gs in _global_storages(user):
            self._scan_chat_files(gs / "emptyWindowChatSessions", gs.parent, None, gs / "state.vscdb", edition)
            self._apply_workspace_sessions(gs / "github.copilot-chat", edition)
            self._apply_agent_session_refs(gs / "state.vscdb")
            self._apply_vscode_state(gs / "state.vscdb")

    def _apply_agent_session_refs(self, state_db: Path) -> None:
        """VS Code names CLI sessions it has shown as ``agent-host-copilotcli:/<id>``: keep that as an alias."""
        if not state_db.exists():
            return
        text = _state_text(state_db, "agentSessions.providerReadMigration") or ""
        for scheme, sid in re.findall(rf"([a-z-]+copilotcli:/+)({_UUID})", text):
            rec = self.records.get(sid)
            if rec is not None:
                _add_alias(rec, f"{scheme}{sid}")

    def _apply_vscode_state(self, db: Path) -> None:
        """Link CLI sessions named by exact resource in a ``state.vscdb``, and add titles and timing.

        ``agent-host-copilotcli:`` sessions ran in VS Code's agent host. A ``copilotcli:``
        chat index entry means VS Code opened the session, so it decides only an unknown
        surface. The ``agentSessions.model.cache`` list holds sessions from any client,
        so a ``copilotcli:`` row there gives an alias and no surface.
        """
        if not db.exists():
            return
        cache = _state_json(db, "agentSessions.model.cache")
        for entry in cache if isinstance(cache, list) else ():
            resource = entry.get("resource") if isinstance(entry, dict) else None
            if not isinstance(resource, str):
                continue
            match = _CLI_RESOURCE.match(resource)
            if match:
                self._apply_cli_resource(match.group(1), match.group(2), resource, entry, "agentSessions.model.cache")
            else:
                rec = self.records.get(_local_chat_id(resource) or "")
                if rec is not None:
                    _add_alias(rec, resource)
                    self._apply_entry_fields(rec, entry, "label")
        for key, entry in _chat_index(db).items():
            match = _CLI_RESOURCE.match(key)
            if match:
                rec = self._apply_cli_resource(match.group(1), match.group(2), key, entry, "chat.ChatSessionStore.index")
                if rec["surface"] == "unknown":
                    rec["surface"], rec["surface_source"] = "copilot-vscode", f"VS Code chat index entry {match.group(1)}:"

    def _apply_cli_resource(self, scheme: str, sid: str, resource: str, entry: dict[str, Any], source: str) -> dict[str, Any]:
        rec = self.records.get(sid)
        if rec is None:
            rec = self.records[sid] = _new_record(sid, "unknown", f"named in {source}, which does not record the client")
            rec["partial"] = True
        _add_alias(rec, resource)
        rec["sources"].append(source)
        self._apply_entry_fields(rec, entry, "label" if source == "agentSessions.model.cache" else "title")
        metadata = entry.get("metadata")
        cwd = metadata.get("workingDirectoryPath") if isinstance(metadata, dict) else None
        if isinstance(cwd, str) and cwd and not rec["project"]:
            rec["project"] = clean(cwd, 240)
        if scheme == "agent-host-copilotcli" and rec["surface"] != "copilot-desktop":
            rec["surface"], rec["surface_source"] = "copilot-vscode", f"{source} provider {scheme}"
        return rec

    @staticmethod
    def _apply_entry_fields(rec: dict[str, Any], entry: dict[str, Any], title_key: str) -> None:
        title = entry.get(title_key)
        if isinstance(title, str) and title and not rec["title"]:
            rec["title"] = clean(title, 120)
        timing = entry.get("timing")
        if isinstance(timing, dict):
            rec["started_at"] = rec["started_at"] or coerce_ts(timing.get("created")) or None
            ended = timing.get("lastRequestEnded") or timing.get("lastRequestStarted")
            rec["last_activity_at"] = rec["last_activity_at"] or coerce_ts(ended) or None

    def _link_hashed_edits(self) -> None:
        """A CLI session's ``chatEditingSessions`` folder is named by the SHA-1 of its resource."""
        if not self._hashed_edits:
            return
        owners: dict[str, tuple[str, str]] = {}
        for sid in self.records:
            for scheme in ("copilotcli", "agent-host-copilotcli"):
                resource = f"{scheme}:/{sid}"
                owners[hashlib.sha1(resource.encode("utf-8"), usedforsecurity=False).hexdigest()] = (sid, resource)
        for path in self._hashed_edits:
            owner = owners.get(PurePath(path).name)
            if owner is None:
                continue
            rec = self.records[owner[0]]
            _add_alias(rec, owner[1])
            rec["roots"].append(path)
            rec["sources"].append("chatEditingSessions")
            if rec["surface"] == "unknown":
                rec["surface"], rec["surface_source"] = "copilot-vscode", "chatEditingSessions folder named by its resource"

    def _scan_workspace(self, ws: Path, edition: str) -> None:
        names = {"chatSessions", "chatEditingSessions", "GitHub.copilot-chat"}
        if not any((ws / n).is_dir() for n in names):
            return
        project = workspace_folder(ws)
        self._scan_chat_files(ws / "chatSessions", ws, project, ws / "state.vscdb", edition)
        ghcp = ws / "GitHub.copilot-chat"
        linked = (
            (ghcp / "transcripts", "transcripts", True),
            (ghcp / "debug-logs", "debug-logs", False),
            (ghcp / "chat-session-resources", "chat-session-resources", False),
            (ws / "chatEditingSessions", "chatEditingSessions", False),
        )
        for folder, label, by_stem in linked:
            try:
                items = list(os.scandir(folder))
            except OSError:
                continue
            for item in items:
                sid = item.name.split(".")[0] if by_stem else item.name
                rec = self.records.get(sid)
                if rec is None:
                    if label == "chatEditingSessions" and _SHA1_NAME.match(sid):
                        self._hashed_edits.append(item.path)
                    if not _UUID_RE.fullmatch(sid):
                        continue
                    rec = self.records[sid] = self._vscode_record(sid, ws, project, edition, label)
                    rec["partial"] = True
                    rec["last_activity_at"] = item.stat().st_mtime
                rec["roots"].append(item.path)
                rec["sources"].append(label)

    def _vscode_record(self, sid: str, ws: Path, project: str | None, edition: str, source: str) -> dict[str, Any]:
        rec = _new_record(sid, "copilot-vscode", f"{source} under {edition}/User")
        rec["folder"] = str(ws)
        rec["project"] = project
        rec["state"] = "ended"
        return rec

    def _scan_chat_files(self, folder: Path, ws: Path, project: str | None, state_db: Path, edition: str) -> None:
        try:
            items = [e for e in os.scandir(folder) if e.name.endswith((".json", ".jsonl"))]
        except OSError:
            return
        index = _chat_index(state_db) if state_db.exists() else {}
        for item in items:
            sid = item.name.rsplit(".", 1)[0]
            st = item.stat()
            rec = self.records.get(sid) or self._vscode_record(sid, ws, project, edition, "chat session file")
            self.records[sid] = rec
            rec["folder"] = rec["folder"] or str(ws)
            rec["roots"].append(item.path)
            rec["sources"].append("chatSessions")
            rec["last_activity_at"] = max(rec["last_activity_at"] or 0.0, st.st_mtime)
            entry = index.get(sid) or {}
            if entry.get("title"):
                rec["title"] = clean(entry["title"], 120)
            timing = entry.get("timing")
            created = timing.get("created") if isinstance(timing, dict) else None
            rec["started_at"] = coerce_ts(created or entry.get("creationDate")) or rec["started_at"]
            if not rec["title"] or not rec["started_at"]:
                fields = _chat_file_fields(Path(item.path), st.st_size)
                if isinstance(fields.get("customTitle"), str) and not rec["title"]:
                    rec["title"] = clean(fields["customTitle"], 120)
                rec["started_at"] = rec["started_at"] or coerce_ts(fields.get("creationDate")) or None

    def _apply_workspace_sessions(self, gs: Path, edition: str) -> None:
        """``copilot.cli.workspaceSessions.<id>.json``: CLI sessions VS Code lists for a workspace."""
        try:
            files = list(gs.glob("copilot.cli.workspaceSessions.*"))
        except OSError:
            return
        for path in files:
            try:
                text = path.read_text(encoding="utf-8", errors="replace")[:1048576]
            except OSError:
                continue
            for sid in dict.fromkeys(_UUID_RE.findall(text)):
                rec = self.records.get(sid)
                if rec is None:
                    rec = self.records[sid] = _new_record(sid, "copilot-vscode", f"listed in {path.name}")
                    rec["partial"] = True
                elif rec["surface"] == "unknown":
                    rec["surface"], rec["surface_source"] = "copilot-vscode", f"listed in {path.name}"
                rec["sources"].append(f"{edition}:{path.name}")

    def _finish(self) -> None:
        self._link_hashed_edits()
        for sid, rec in self.records.items():
            if rec["state"] == "unknown":
                last = rec["last_activity_at"]
                if last is not None:
                    rec["state"] = "recent" if self.now - last < FRESH_S else "ended"
            rec["sources"] = list(dict.fromkeys(rec["sources"]))
            if self.capture != "full":
                rec["title"] = None
            for alias in rec["aliases"]:
                self._alias_map.setdefault(alias.lower(), sid)

    # ── listing ──────────────────────────────────────────────────────

    def list(
        self, tool: str | None = None, project: str | None = None, include_partial: bool = False, limit: int | None = None
    ) -> tuple[list[dict[str, Any]], int]:
        """Newest first, with artifact totals for the returned rows. Also returns the match count."""
        needle = _fold(project).lower() if project else None
        rows = []
        for rec in self.records.values():
            if tool and rec["surface"] != tool:
                continue
            if rec["partial"] and not include_partial:
                continue
            if needle and needle not in _fold(rec["project"] or rec["git_root"] or "").lower():
                continue
            rows.append(rec)
        rows.sort(key=lambda r: (r["state"] != "running", -(r["last_activity_at"] or 0.0)))
        total = len(rows)
        if limit is not None:
            rows = rows[:limit]
        for rec in rows:
            self._totals(rec)
        return rows, total

    def _totals(self, rec: dict[str, Any]) -> None:
        if rec["artifact_count"] is not None:
            return
        count = 0
        size = 0
        for root in rec["roots"]:
            for _path, st, _is_link in _walk(root):
                count += 1
                size += st.st_size
        rec["artifact_count"], rec["artifact_bytes"] = count, size

    def find(self, text: str) -> list[dict[str, Any]]:
        """Sessions whose id, alias, project, repository, branch or title contains *text*."""
        needle = text.lower()
        if not needle:
            return []
        out = []
        for rec in self.records.values():
            fields = [rec["id"], *rec["aliases"], rec["project"], rec["git_root"], rec["repository"], rec["branch"], rec["title"]]
            if any(needle in f.lower() for f in fields if f):
                out.append(rec)
        out.sort(key=lambda r: -(r["last_activity_at"] or 0.0))
        for rec in out:
            self._totals(rec)
        return out

    # ── resolution ───────────────────────────────────────────────────

    def resolve(self, query: str) -> dict[str, Any]:
        """``{"status": "ok"|"ambiguous"|"not_found", "session", "matches", "matched_by", "looked_in"}``."""
        text = (query or "").strip()
        for how, matches in self._candidates(text):
            if len(matches) == 1:
                rec = matches[0]
                self._totals(rec)
                return {"status": "ok", "session": rec, "matches": [rec], "matched_by": how, "looked_in": []}
            if matches:
                return {"status": "ambiguous", "session": None, "matches": matches, "matched_by": how, "looked_in": []}
        return {"status": "not_found", "session": None, "matches": [], "matched_by": None, "looked_in": search_locations()}

    def _candidates(self, text: str) -> Iterable[tuple[str, list[dict[str, Any]]]]:
        if not text:
            return
        if text in self.records:
            yield "id", [self.records[text]]
        lower = text.lower()
        exact = [r for sid, r in self.records.items() if sid.lower() == lower]
        if lower in self._alias_map:
            exact.append(self.records[self._alias_map[lower]])
        yield "id or alias", _unique(exact)
        tagged = _TOOL_PID_TS.match(text)
        if tagged:
            yield "tool:pid:timestamp", self._by_pid(int(tagged.group(2)), float(tagged.group(3)))
        if _looks_like_path(text):
            yield "path", self._by_path(text)
        if text.isdigit():
            yield "pid", self._by_pid(int(text), None)
        if len(text) >= MIN_PREFIX:
            found = [r for sid, r in self.records.items() if sid.lower().startswith(lower)]
            found += [self.records[sid] for alias, sid in self._alias_map.items() if alias.startswith(lower)]
            yield "id prefix", _unique(found)

    def _by_pid(self, pid: int, ts: float | None) -> list[dict[str, Any]]:
        live = [r for r in self.records.values() if pid in r["pids"]]
        if live:
            return live
        held = [(self.records[sid], mtime) for sid, locks in self._locks.items() for p, mtime in locks if p == pid]
        if ts is not None:
            near = [r for r, mtime in held if abs(mtime - ts) < LOCK_TS_TOLERANCE_S]
            if near:
                return _unique(near)
        return _unique([r for r, _ in held])

    def _by_path(self, text: str) -> list[dict[str, Any]]:
        target = _fold(text)
        out = []
        for rec in self.records.values():
            for root in rec["roots"]:
                folded = _fold(root)
                if target == folded or _inside(target, folded):
                    out.append(rec)
                    break
        if out:
            return _unique(out)
        # A workspace folder holds many chats: every session in it matches.
        return [r for r in self.records.values() if r["folder"] and _fold(r["folder"]) == target]

    # ── one session ──────────────────────────────────────────────────

    def details(self, rec: dict[str, Any]) -> dict[str, Any]:
        """The record plus what only a parse of its event log can tell. Text stays out unless capture is full."""
        self._totals(rec)
        out = dict(rec)
        log = Path(rec["folder"]) / "events.jsonl" if rec["folder"] and rec["sources"][:1] == ["session-state"] else None
        if log is None or not log.is_file():
            return out
        parsed = EventsFile(log, self.capture == "full").refresh()
        out["turns"] = parsed.turns
        if parsed.model and parsed.model not in out["models"]:
            out["models"] = [*out["models"], parsed.model]
        out["started_at"] = out["started_at"] or parsed.first_ts or None
        out["project"] = out["project"] or parsed.cwd or None
        out["sub_agents"] = [
            {"id": a.get("id"), "name": a.get("name"), "model": a.get("model") or None} for a in parsed.agents.values()
        ] or out["sub_agents"]
        if parsed.shutdown and out["state"] != "running":
            out["state"] = "ended"
        return out

    def artifacts(self, rec: dict[str, Any], kind: str | None = None) -> list[dict[str, Any]]:
        """Every file in the session's folders and linked stores, classified. Unknown types are listed too."""
        out: list[dict[str, Any]] = []
        snapshots: dict[str, dict[str, Any]] = {}
        for root in rec["roots"]:
            root_path = Path(root)
            if (root_path / "rewind-file-snapshots" / "index.json").is_file():
                snapshots.update(_rewind_index(root_path / "rewind-file-snapshots" / "index.json"))
            for path, st, is_link in _walk(root):
                rel = _relative(path, root)
                item = {
                    "path": path,
                    "name": _display_rel(path, root, rec),
                    "type": classify(rel, root),
                    "size": st.st_size,
                    "modified_at": st.st_mtime,
                    "readable": not _is_denied(path) and not is_link,
                }
                if is_link:
                    item["symlink"] = True
                match = _CHECKPOINT_FILE.match(PurePath(path).name)
                if item["type"] == "checkpoint" and match:
                    item["checkpoint"] = int(match.group(1))
                info = snapshots.get(PurePath(path).name)
                if info and item["type"] == "file_snapshot":
                    item.update(info)
                out.append(item)
                if len(out) >= MAX_ARTIFACTS:
                    break
        out.extend(self._store_artifacts(rec))
        out.sort(key=lambda a: (a["type"], a["name"]))
        return [a for a in out if kind is None or a["type"] == kind]

    def _store_artifacts(self, rec: dict[str, Any]) -> list[dict[str, Any]]:
        """Checkpoint rows live in the store, not in files: listed, not readable through ``cat``."""
        if "session-store.db" not in rec["sources"]:
            return []
        db = platforms.copilot_global_dir() / "session-store.db"
        rows = _query(
            db, "select checkpoint_number, created_at from checkpoints where session_id = ? order by 1", (rec["id"],)
        )
        return [
            {
                "path": None,
                "name": f"session-store.db#checkpoint/{number}",
                "type": "checkpoint",
                "size": None,
                "modified_at": coerce_ts(created) or None,
                "readable": False,
                "checkpoint": number,
            }
            for number, created in rows
        ]


def _extra_yaml(folder: Path) -> dict[str, str]:
    """Top-level ``workspace.yaml`` keys that the collector's reader does not keep."""
    out: dict[str, str] = {}
    wanted = ("repository", "created_at", "updated_at", "mc_session_id")
    try:
        with (folder / "workspace.yaml").open(encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if line[:1].isalpha() and ": " in line:
                    key, value = line.split(": ", 1)
                    if key in wanted:
                        out[key] = value.strip().strip("'\"")
    except OSError:
        pass
    return out


def _unique(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return list({r["id"]: r for r in rows}.values())


def _looks_like_path(text: str) -> bool:
    return "/" in text or "\\" in text or bool(re.match(r"^[A-Za-z]:", text)) or text.startswith("~")


def _inside(child: str, parent: str) -> bool:
    sep = "\\" if "\\" in parent else "/"
    return child.startswith(parent.rstrip(sep) + sep)


def _walk(root: str) -> Iterable[tuple[str, os.stat_result, bool]]:
    """Files under *root* (or *root* itself, if it is a file), without following links out of it."""
    try:
        st = os.lstat(root)
    except OSError:
        return
    if not stat_module.S_ISDIR(st.st_mode):
        yield root, st, stat_module.S_ISLNK(st.st_mode)
        return
    stack = [root]
    while stack:
        current = stack.pop()
        try:
            with os.scandir(current) as it:
                entries = list(it)
        except OSError:
            continue
        for entry in entries:
            try:
                if entry.is_dir(follow_symlinks=False):
                    stack.append(entry.path)
                else:
                    yield entry.path, entry.stat(follow_symlinks=False), entry.is_symlink()
            except OSError:
                continue


def _relative(path: str, root: str) -> str:
    try:
        rel = os.path.relpath(path, root)
    except ValueError:
        return PurePath(path).name
    return PurePath(path).name if rel == "." else rel.replace("\\", "/")


def _display_rel(path: str, root: str, rec: dict[str, Any]) -> str:
    """Name to pass to ``cat``: relative to the session folder when the file is under it."""
    folder = rec["folder"]
    base = folder if folder and _inside(_fold(path), _fold(folder)) else str(Path(root).parent)
    try:
        return os.path.relpath(path, base).replace("\\", "/")
    except ValueError:
        return _relative(path, root)


def classify(rel: str, root: str = "") -> str:
    """Artifact type from where a file sits. Types are descriptive; anything else is ``unknown``."""
    rel = rel.replace("\\", "/")
    parts = rel.split("/")
    name = parts[-1]
    top = parts[0] if len(parts) > 1 else ""
    parent_name = PurePath(root.replace("\\", "/")).name if root else ""
    grand = PurePath(root.replace("\\", "/")).parent.name if root else ""
    if parent_name == "chatSessions" or grand == "chatSessions" or parent_name.endswith((".json", ".jsonl")) and grand == "chatSessions":
        return "event_log"
    if grand == "transcripts" or grand == "debug-logs":
        return "event_log"
    if grand == "chat-session-resources":
        return "tool_output"
    if grand == "chatEditingSessions":
        return "metadata" if name == "state.json" else "file_snapshot"
    if name == "events.jsonl" or (name.endswith(".jsonl") and top in ("", "events")):
        return "event_log"
    if top == "checkpoints":
        return "checkpoint"
    if top == "rewind-file-snapshots":
        return "file_snapshot" if len(parts) > 2 else "snapshot_index"
    if top == "files":
        return "tool_output"
    if top == "research":
        return "research"
    if top in ("attachments", "images", "media"):
        return "attachment"
    if name in ("workspace.yaml", "vscode.metadata.json"):
        return "metadata"
    if name == "session.db":
        return "database"
    if name.endswith(".lock") or name.endswith(".hold"):
        return "lock"
    if fnmatch.fnmatch(name.lower(), "*plan*.md"):
        return "plan"
    return "unknown"


def _rewind_index(path: Path) -> dict[str, dict[str, Any]]:
    """Backup file name to the snapshot that took it. The user's prompt in that index stays out."""
    try:
        with path.open(encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return {}
    out: dict[str, dict[str, Any]] = {}
    snapshots = data.get("snapshots") if isinstance(data, dict) else None
    for snap in snapshots if isinstance(snapshots, list) else ():
        if not isinstance(snap, dict) or not isinstance(snap.get("files"), dict):
            continue
        for item in snap["files"].values():
            pre = item.get("preimage") if isinstance(item, dict) else None
            backup = pre.get("backupFile") if isinstance(pre, dict) else None
            if isinstance(backup, str):
                out[PurePath(backup.replace("\\", "/")).name] = {
                    "snapshot_id": clean(snap.get("snapshotId") or "", 80),
                    "event_id": clean(snap.get("eventId") or "", 80),
                    "source_path": clean(item.get("path") or "", 240),
                }
    return out


# ── reading one artifact ─────────────────────────────────────────────


class ArtifactRefused(Exception):
    """The request is outside what may be read. ``status`` suits an HTTP response."""

    def __init__(self, message: str, status: int = 403) -> None:
        super().__init__(message)
        self.status = status


def _is_denied(path: str) -> bool:
    name = PureWindowsPath(path).name.lower()
    return any(fnmatch.fnmatchcase(name, pattern) for pattern in _DENIED_NAMES)


def confine(rec: dict[str, Any], requested: str) -> Path:
    """Resolve *requested* to a file inside this session's own folders, or refuse.

    The final resolved location is what is checked, so a link that leaves the
    folder is refused, as are ``..`` segments, whichever separator they use.
    """
    if not requested or "\x00" in requested:
        raise ArtifactRefused("invalid path", 400)
    if ".." in re.split(r"[\\/]", requested):
        raise ArtifactRefused("path may not contain '..'", 403)
    roots = [r for r in rec["roots"] if r]
    if not roots:
        raise ArtifactRefused("this session has no files on disk", 404)
    if _is_denied(requested):
        raise ArtifactRefused("this file is never served", 403)
    resolved_roots = [os.path.realpath(r) for r in roots]
    candidates: list[Path] = []
    as_path = Path(requested)
    windows_form = PureWindowsPath(requested)
    if as_path.is_absolute() or windows_form.drive or windows_form.is_absolute():
        # Settled from the text alone: touching a UNC path would open a network connection.
        folded = _fold(requested)
        if not any(folded == _fold(r) or _inside(folded, _fold(r)) for r in [*roots, *resolved_roots]):
            raise ArtifactRefused("path is outside this session's folder", 403)
        candidates.append(as_path)
    else:
        folder = rec["folder"]
        for base in [folder, *roots, *[str(Path(r).parent) for r in roots]]:
            if base:
                candidates.append(Path(base) / requested)
    for candidate in candidates:
        try:
            exists = os.path.lexists(candidate)
        except OSError:
            exists = False
        if not exists:
            continue
        real = os.path.realpath(candidate)
        if not any(_fold(real) == _fold(r) or _inside(_fold(real), _fold(r)) for r in resolved_roots):
            continue
        if _is_denied(real):
            raise ArtifactRefused("this file is never served", 403)
        if not os.path.isfile(real):
            raise ArtifactRefused("not a regular file", 400)
        return Path(real)
    existing = [c for c in candidates if os.path.lexists(c)]
    if existing:
        raise ArtifactRefused("path is outside this session's folder", 403)
    raise ArtifactRefused("no such file in this session", 404)


def read_artifact(
    rec: dict[str, Any], requested: str, max_bytes: int = DEFAULT_CAT_BYTES, allow_binary: bool = False
) -> dict[str, Any]:
    """Bounded read of one file. Nothing is kept after the call returns."""
    path = confine(rec, requested)
    size = path.stat().st_size
    with path.open("rb") as fh:
        data = fh.read(max_bytes + 1)
    truncated = len(data) > max_bytes or size > max_bytes
    data = data[:max_bytes]
    binary = b"\x00" in data[:8192]
    if binary and not allow_binary:
        return {"path": str(path), "size": size, "binary": True, "truncated": False, "content": None}
    return {
        "path": str(path),
        "size": size,
        "binary": binary,
        "truncated": truncated,
        "content": data if binary else data.decode("utf-8", "replace"),
    }


def annotate_observed(doc: dict[str, Any]) -> None:
    """Add ``folder``, ``artifact_count`` and ``artifact_bytes`` to the sessions in an ``aictl ps`` document."""
    try:
        index = SessionIndex()
    except (OSError, sqlite3.Error):
        return
    for tool in doc.get("tools", []):
        for session in tool.get("sessions", []):
            rec = index.records.get(session.get("id"))
            if rec is None:
                continue
            index._totals(rec)
            session["folder"] = rec["folder"]
            session["artifact_count"] = rec["artifact_count"]
            session["artifact_bytes"] = rec["artifact_bytes"]
