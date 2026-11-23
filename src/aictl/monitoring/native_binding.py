# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Bind a running agent process to the tool's own session id, from evidence the tool writes.

* Claude Code writes ``<claude home>/sessions/<pid>.json`` per running process: ``pid``,
  ``sessionId``, ``cwd``, ``startedAt`` (epoch ms), ``procStart`` (the process start time),
  ``status`` (``busy``, ``idle`` ...) and ``statusUpdatedAt``. A pid can be reused after a
  process exits and an old file can be left behind, so a file binds only when it proves it
  was written for this process: its ``procStart`` matches the process start time, or, when
  ``procStart`` cannot be read, its ``startedAt`` is not earlier than the process start.
  The file is read by pid, one small read per home; no folder is listed.
* GitHub Copilot keeps ``<copilot home>/session-state/<session id>/inuse.<pid>.lock`` while a
  process holds the session. Finding it needs a listing of the session folders, so that
  is done only while the process is unbound, at most every ``COPILOT_RETRY_S``; a found
  lock is then checked by its own path. A lock older than the process does not bind, and
  a process that holds several sessions binds to none.
* ``--session-id <id>`` or ``--resume <id>`` on the command line binds only when the value is a
  session that exists: a Copilot session folder, a Claude Code transcript, a Codex rollout.
  ``--resume`` also takes a session NAME (``copilot --resume=my-work``); a name never becomes
  a session id. The lock file, checked first, then names the real session.

The binder answers for one process. The correlator applies it to every process of a tool's
process family (a wrapper and the native process it starts), so evidence on the child binds
the parent's session too.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import time
from collections.abc import Callable, Iterable
from datetime import datetime, timezone
from pathlib import Path

from .session import ProcessInfo

log = logging.getLogger(__name__)

COPILOT_RETRY_S = 30.0
# A command-line value that is not (yet) a known session is checked again after this long:
# ``claude --session-id <new id>`` writes its transcript only after it starts.
NAMED_RETRY_S = 30.0
_ID_FLAGS = ("--session-id", "--resume", "resume")
_UUID = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

# procStart has whole seconds; the process start time has a fraction, and the two clocks
# are read at different moments.
START_TOLERANCE_S = 2.0
MAX_FILE_BYTES = 64 * 1024
_CTIME_FORMATS = ("%a %b %d %H:%M:%S %Y", "%a %b  %d %H:%M:%S %Y")


def parse_proc_start(value: object) -> float | None:
    """Epoch seconds of a ``procStart`` value, or None when it cannot be read.

    macOS and Linux write the ``ps -o lstart`` form in UTC (``Sun Nov 22 13:46:14 2026``).
    Other forms are accepted as written: an ISO 8601 time, or epoch seconds or milliseconds.
    """
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        return number / 1000.0 if number > 1e11 else number
    text = str(value).strip()
    if not text:
        return None
    try:
        number = float(text)
    except ValueError:
        pass
    else:
        return number / 1000.0 if number > 1e11 else number
    for fmt in _CTIME_FORMATS:
        try:
            return datetime.strptime(" ".join(text.split()), fmt).replace(tzinfo=timezone.utc).timestamp()
        except ValueError:
            continue
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


def _ms(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
        return None
    return float(value) / 1000.0


def native_state(status: object) -> str:
    """The board's state for a ``status`` value Claude Code reports."""
    text = str(status or "").lower()
    if text in ("busy", "working", "running"):
        return "running"
    if text == "idle":
        return "idle"
    if "wait" in text or "permission" in text or "input" in text:
        return "waiting"
    return "unknown"


def binding_for(process: ProcessInfo, homes: Iterable[Path]) -> dict | None:
    """The session that this exact process holds, from the first home that has its file."""
    if process.pid <= 0 or process.created_at is None:
        return None  # without a start time a reused pid cannot be told apart
    for home in homes:
        path = Path(home) / "sessions" / f"{process.pid}.json"
        try:
            with path.open("rb") as handle:
                raw = handle.read(MAX_FILE_BYTES + 1)
        except OSError:
            continue
        if len(raw) > MAX_FILE_BYTES:
            continue
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            continue
        if not isinstance(data, dict):
            continue
        binding = _verified(data, process)
        if binding is not None:
            binding["home"] = str(home)
            return binding
    return None


def _verified(data: dict, process: ProcessInfo) -> dict | None:
    sid = data.get("sessionId")
    if not isinstance(sid, str) or not sid or data.get("pid") != process.pid:
        return None
    born = float(process.created_at or 0.0)
    proc_start = parse_proc_start(data.get("procStart"))
    started = _ms(data.get("startedAt"))
    if proc_start is not None:
        if abs(born - proc_start) > START_TOLERANCE_S:
            return None  # written by an earlier process that had this pid
    elif started is None or started < born - START_TOLERANCE_S:
        return None
    status_at = _ms(data.get("statusUpdatedAt")) or _ms(data.get("updatedAt"))
    return {
        "session_id": sid,
        "started_at": started,
        "cwd": data.get("cwd") if isinstance(data.get("cwd"), str) else "",
        "status": str(data.get("status") or ""),
        "state": native_state(data.get("status")),
        "status_at": status_at,
        "source": "session file",
    }


def command_line_session(process: ProcessInfo) -> str | None:
    """The session id that ``--session-id``/``--resume`` names on the process's command line."""
    args = process.cmdline
    for index, arg in enumerate(args):
        key, sep, value = arg.partition("=")
        if key not in _ID_FLAGS:
            continue
        if not sep:
            value = args[index + 1] if index + 1 < len(args) else ""
        if value and not value.startswith("-"):
            return value
    return None


def copilot_lock_session(process: ProcessInfo, homes: Iterable[Path]) -> tuple[str, Path] | None:
    """The one session whose ``inuse.<pid>.lock`` this process holds, and the lock's path."""
    if process.created_at is None:
        return None
    found: list[tuple[str, Path]] = []
    for home in homes:
        root = Path(home) / "session-state"
        try:
            locks = list(root.glob(f"*/inuse.{process.pid}.lock"))
        except OSError:
            continue
        for lock in locks:
            if _lock_is_current(lock, process):
                found.append((lock.parent.name, lock))
    return found[0] if len(found) == 1 else None


def _lock_is_current(lock: Path, process: ProcessInfo) -> bool:
    try:
        return process.created_at is not None and process.created_at <= lock.stat().st_mtime + START_TOLERANCE_S
    except OSError:
        return False


def _homes(tool: str) -> list[Path]:
    from .. import tool_homes

    return [home.path for home in tool_homes.homes(tool)]


def claude_homes() -> list[Path]:
    """Every Claude Code home that discovery found: the default, CLAUDE_CONFIG_DIR, running processes."""
    return _homes("claude")


def copilot_homes() -> list[Path]:
    return _homes("copilot")


def codex_homes() -> list[Path]:
    return _homes("codex")


def _safe_name(value: str) -> bool:
    return bool(value) and not any(part in value for part in ("/", "\\", "..", "*", "?", "[")) and len(value) <= 200


def known_session_id(value: str, tool: str, homes: Iterable[Path]) -> bool:
    """Whether *value* names an existing session of *tool*, not a session name or a typo."""
    if not _safe_name(value):
        return False
    for home in homes:
        home = Path(home)
        try:
            if tool == "copilot-cli":
                if (home / "session-state" / value).is_dir():
                    return True
            elif tool == "claude-code":
                if _UUID.match(value) and any((home / "projects").glob(f"*/{value}.jsonl")):
                    return True
            elif tool == "codex-cli":
                if _UUID.match(value) and any((home / "sessions").glob(f"*/*/*/rollout-*{value}.jsonl")):
                    return True
        except OSError:
            continue
    return False


class NativeBinder:
    """The correlator's binder: ``(process, tool) -> binding`` or None.

    The order is the strength of the evidence: Claude Code's session file, then Copilot's
    lock file, then a command-line value that names an existing session.
    """

    def __init__(
        self,
        claude: Callable[[], Iterable[Path]] = claude_homes,
        copilot: Callable[[], Iterable[Path]] = copilot_homes,
        clock: Callable[[], float] = time.monotonic,
        codex: Callable[[], Iterable[Path]] = codex_homes,
    ) -> None:
        self._homes = {"claude-code": claude, "copilot-cli": copilot, "codex-cli": codex}
        self._clock = clock
        self._lock = threading.Lock()
        # (pid, start) -> the lock file found for it, or the time the last search found none.
        self._copilot_locks: dict[tuple[int, float | None], tuple[str, Path] | float] = {}
        # (tool, value) -> True once it named an existing session, else the time it did not.
        self._named: dict[tuple[str, str], bool | float] = {}

    def __call__(self, process: ProcessInfo, tool: str) -> dict | None:
        try:
            return self._bind(process, tool)
        except Exception:  # noqa: BLE001 - a failed lookup leaves the process unbound
            log.debug("Native session lookup failed for pid %s", process.pid, exc_info=True)
            return None

    def _bind(self, process: ProcessInfo, tool: str) -> dict | None:
        if tool == "claude-code":
            binding = binding_for(process, self._homes[tool]())
            if binding is not None:
                return binding
        if tool == "copilot-cli":
            # The VS Code and desktop apps hold many sessions over their life; only the CLI
            # process is one agent session.
            found = self._copilot_lock(process)
            if found is not None:
                return _plain(found[0], "lock file", process)
        named = command_line_session(process) if tool in self._homes else None
        if named and self._known(named, tool):
            return _plain(named, "command line", process)
        return None

    def _known(self, value: str, tool: str) -> bool:
        key = (tool, value)
        now = self._clock()
        with self._lock:
            known = self._named.get(key)
        if known is True:
            return True
        if isinstance(known, float) and now - known < NAMED_RETRY_S:
            return False
        found = known_session_id(value, tool, self._homes[tool]())
        with self._lock:
            if len(self._named) > 4096:
                self._named.clear()
            self._named[key] = True if found else now
        return found

    def _copilot_lock(self, process: ProcessInfo) -> tuple[str, Path] | None:
        key = (process.pid, process.created_at)
        now = self._clock()
        with self._lock:
            known = self._copilot_locks.get(key)
        if isinstance(known, tuple):
            if _lock_is_current(known[1], process):
                return known  # the same lock, checked by its own path
            known = None
        if isinstance(known, float) and now - known < COPILOT_RETRY_S:
            return None
        found = copilot_lock_session(process, self._homes["copilot-cli"]())
        with self._lock:
            if len(self._copilot_locks) > 4096:
                self._copilot_locks.clear()
            self._copilot_locks[key] = found if found is not None else now
        return found


def _plain(session_id: str, source: str, process: ProcessInfo) -> dict:
    return {"session_id": session_id, "started_at": None, "cwd": process.cwd or "", "status": "", "state": None,
            "status_at": None, "source": source}


def binder() -> NativeBinder:
    return NativeBinder()
