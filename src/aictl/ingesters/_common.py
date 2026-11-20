"""Shared infrastructure for the per-tool ingesters.

The cursor/copilot/vscode ingesters each grew private copies of the same
three helpers (read-only SQLite open, data-quality recording, timestamp
coercion). This module is their one home; the per-ingester identity
(log prefix, ``ingester:<id>`` component, source path) rides in as
arguments.
"""

from __future__ import annotations

import functools
import logging
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any
from urllib.parse import unquote, urlsplit

if TYPE_CHECKING:
    import sqlite3

log = logging.getLogger(__name__)
SQLITE_UNAVAILABLE = "unavailable: Python sqlite3 module missing"


def open_readonly(db_path: Path, log_prefix: str) -> sqlite3.Connection | None:
    """Open another tool's SQLite file without writing anything beside it.

    ``mode=ro`` alone still updates the WAL index in ``-shm``, so the connection
    is ``immutable``. It therefore sees the main file only: rows still in the
    WAL appear after that tool's next checkpoint. A read that races a checkpoint
    raises ``sqlite3.Error``, which pollers treat as "try again next poll".
    Returns ``None`` when the file is missing or unreadable.
    """
    if not db_path.exists():
        return None
    import sqlite3

    try:
        return sqlite3.connect(f"{db_path.resolve().as_uri()}?mode=ro&immutable=1", uri=True, timeout=1.0)
    except sqlite3.Error as exc:
        log.warning("%s: failed to open %s read-only: %s", log_prefix, db_path, exc)
        return None


def record_quality(
    store: Any,
    ingester_id: str,
    source: Any,
    status: str,
    *,
    severity: str = "",
    message: str = "",
    detail: dict | None = None,
) -> None:
    """Record a data-quality event under ``ingester:<ingester_id>`` when the
    store supports it (in-memory test stores may not)."""
    if hasattr(store, "record_data_quality"):
        try:
            store.record_data_quality(
                f"ingester:{ingester_id}",
                status,
                kind="ingester",
                severity=severity,
                message=message,
                source=str(source),
                detail=detail,
            )
        except Exception as exc:  # noqa: BLE001 - health reporting must not stop ingestion
            log.warning("Cannot record health of %s: %s", ingester_id, exc)


def decode_file_uri(value: str) -> str:
    """``file:///c%3A/Users/me/proj`` -> ``c:/Users/me/proj``; other text is unchanged."""
    if not value.lower().startswith("file:"):
        return value
    path = unquote(urlsplit(value).path)
    # /c:/x -> c:/x; a POSIX path keeps its leading slash.
    return path[1:] if len(path) > 2 and path[0] == "/" and path[2] == ":" else path


_WINDOWS_DRIVE = re.compile(r"^[a-zA-Z]:[\\/]")


def project_key(path: str | None) -> str:
    """Comparison key under which spellings of one project compare equal.

    Windows paths are case-insensitive and may use either separator, or arrive
    as ``file:`` URIs, so they fold; POSIX paths stay case-sensitive.
    """
    if not path:
        return ""
    p = decode_file_uri(path.strip())
    if _WINDOWS_DRIVE.match(p) or p.startswith("\\\\"):
        p = p.replace("\\", "/").lower()
    return p.rstrip("/") or p


_AGENT_WORKTREE = re.compile(r"[/\\\\](?:\.claude[/\\\\]worktrees|\.worktrees)[/\\\\][^/\\\\]+[/\\\\]?$")


_MAX_PROJECT_DEPTH = 16


@functools.lru_cache(maxsize=4096)
def _git_root(path: str) -> str:
    """The repository that holds a folder, or an empty string. A home folder is never a project root."""
    folder = Path(path)
    if not folder.is_absolute():
        return ""
    home = Path.home()
    for candidate in [folder, *list(folder.parents)[:_MAX_PROJECT_DEPTH]]:
        if candidate == home or candidate in home.parents:
            return ""
        marker = candidate / ".git"
        try:
            if marker.is_dir():
                return str(candidate)
            if marker.is_file():
                # A linked worktree points at <repository>/.git/worktrees/<name>.
                text = marker.read_text(encoding="utf-8", errors="replace")
                main = re.match(r"gitdir:\s*(.+?)[/\\]\.git[/\\]worktrees[/\\]", text)
                return main.group(1) if main else str(candidate)
        except OSError:
            return ""
    return ""


def project_root(path: str | None) -> str:
    """The project of a working folder: the repository that holds it, or the folder itself.

    An agent's worktree belongs to the project that holds it, also after it is deleted.
    """
    folder = _AGENT_WORKTREE.sub("", path or "")
    return (_git_root(folder) or folder) if folder else ""


_ISO_Z_NATIVE = sys.version_info >= (3, 11)


def coerce_ts(raw: Any) -> float:
    """Best-effort conversion of a source timestamp to epoch seconds.

    Accepts epoch numbers (values above ~1e12 are treated as milliseconds),
    numeric strings, and ISO-8601 strings; anything else -> 0.0.
    """
    if raw is None or raw == "":
        return 0.0
    if isinstance(raw, (int, float)):
        v = float(raw)
        return v / 1000.0 if v > 1e12 else v
    if isinstance(raw, str):
        # Fast-path ISO-8601 strings ("YYYY-MM-DD...") to avoid raising ValueError in float(raw).
        if len(raw) >= 10 and raw[4] == "-":
            try:
                iso = raw if (_ISO_Z_NATIVE or not raw.endswith("Z")) else raw[:-1] + "+00:00"
                return datetime.fromisoformat(iso).timestamp()
            except ValueError:
                try:
                    return datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
                except ValueError:
                    pass
        try:
            v = float(raw)
            return v / 1000.0 if v > 1e12 else v
        except ValueError:
            pass
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
        except ValueError:
            return 0.0
    return 0.0
