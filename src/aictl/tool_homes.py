# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Where each AI tool really keeps its state, found on this machine.

A tool's home can move: ``COPILOT_HOME``, ``CLAUDE_CONFIG_DIR`` and ``CODEX_HOME``
relocate it, and a session started with its own environment uses its own home.
The default folder is therefore only one candidate. This module adds the folders
named in aictl's own environment, in the environment of each running tool process,
and the folders of session files that a running tool holds open.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from . import platforms

log = logging.getLogger(__name__)

# The tool's home variable, and how its session folder sits below that home.
HOME_VARIABLES = {"copilot": "COPILOT_HOME", "claude": "CLAUDE_CONFIG_DIR", "codex": "CODEX_HOME"}
SESSION_FOLDERS = {"copilot": "session-state", "claude": "projects", "codex": "sessions"}
# Process names, lower case and without ``.exe``, that run each tool.
PROCESS_NAMES = {"copilot": ("copilot", "copilot-runtime"), "claude": ("claude",), "codex": ("codex",)}
# A file a tool keeps open in its home folder itself.
HOME_FILES = {"copilot": ("session-store.db",), "claude": (), "codex": ()}
REFRESH_S = 300.0
# Reading the open files of many processes is slow on Windows, so the scan is capped.
MAX_PROCESSES = 64


@dataclass(frozen=True)
class ToolHome:
    tool: str
    path: Path
    found_by: str  # "default", "aictl environment", "process environment", "open session file"


def default_home(tool: str) -> Path:
    if tool == "copilot":
        return platforms.copilot_global_dir()
    if tool == "claude":
        return platforms.claude_global_dir()
    return platforms.codex_global_dir()


def session_dir(home: Path, tool: str) -> Path:
    return home / SESSION_FOLDERS[tool]


def _tool_of(name: str, cmdline: list[str]) -> str | None:
    base = name.lower().removesuffix(".exe")
    for tool, names in PROCESS_NAMES.items():
        if base in names:
            return tool
    # Copilot CLI and Codex can run as node with the tool's script as an argument.
    if base in ("node", "bun"):
        text = " ".join(cmdline[:3]).lower()
        for tool in ("copilot", "codex", "claude"):
            if f"/{tool}" in text.replace("\\", "/") or f"@github/{tool}" in text:
                return tool
    return None


def _home_of_open_file(path: str, tool: str) -> Path | None:
    """The tool home of a session file, such as ``<home>/session-state/<id>/events.jsonl``."""
    parts = Path(path).parts
    if parts and parts[-1] in HOME_FILES[tool]:
        return Path(*parts[:-1])
    folder = SESSION_FOLDERS[tool]
    if folder not in parts:
        return None
    index = len(parts) - 1 - parts[::-1].index(folder)
    return Path(*parts[:index]) if index > 0 else None


def scan_processes(read_open_files: bool = True) -> list[ToolHome]:
    """Homes named by running tool processes. Processes that deny access are skipped."""
    try:
        import psutil
    except ImportError:
        return []
    found: list[ToolHome] = []
    seen = 0
    own_user = None
    try:
        own_user = psutil.Process().username()
    except (psutil.Error, OSError):
        pass
    for proc in psutil.process_iter(["name", "cmdline", "username"]):
        info = proc.info
        tool = _tool_of(info.get("name") or "", info.get("cmdline") or [])
        if tool is None or (own_user and info.get("username") and info["username"] != own_user):
            continue
        seen += 1
        if seen > MAX_PROCESSES:
            break
        try:
            value = proc.environ().get(HOME_VARIABLES[tool])
        except (psutil.Error, OSError):
            value = None
        if value:
            found.append(ToolHome(tool, Path(value).expanduser(), "process environment"))
        if not read_open_files:
            continue
        try:
            files = proc.open_files()
        except (psutil.Error, OSError):
            files = []
        for handle in files:
            home = _home_of_open_file(handle.path, tool)
            if home is not None:
                found.append(ToolHome(tool, home, "open session file"))
    return found


class _Finder:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._at = 0.0
        self._homes: list[ToolHome] = []

    def homes(self, refresh_s: float = REFRESH_S) -> list[ToolHome]:
        with self._lock:
            if time.monotonic() - self._at >= refresh_s:
                self._homes = _all_homes()
                self._at = time.monotonic()
            return list(self._homes)


def _all_homes() -> list[ToolHome]:
    homes: list[ToolHome] = []
    for tool, variable in HOME_VARIABLES.items():
        homes.append(ToolHome(tool, default_home(tool), "default"))
        value = os.environ.get(variable)
        if value:
            homes.append(ToolHome(tool, Path(value).expanduser(), "aictl environment"))
    try:
        homes += scan_processes()
    except Exception:  # noqa: BLE001 - a failed scan must not stop the readers
        log.debug("tool homes: process scan failed", exc_info=True)
    known = _load_known()
    homes += [h for h in known if h.path.is_dir()]
    out: list[ToolHome] = []
    keys: set[tuple[str, str]] = set()
    for home in homes:
        key = (home.tool, os.path.normcase(str(home.path)))
        if key not in keys:
            keys.add(key)
            out.append(home)
    _save_known(out, known)
    return out


def known_homes_file() -> Path:
    return platforms.config_dir() / "tool-homes.json"


def _load_known() -> list[ToolHome]:
    """Homes found earlier: a session in a moved home stays readable after its tool exits."""
    try:
        rows = json.loads(known_homes_file().read_text(encoding="utf-8"))
        return [ToolHome(r["tool"], Path(r["path"]), r["found_by"]) for r in rows if r.get("tool") in HOME_VARIABLES]
    except (OSError, ValueError, KeyError, TypeError):
        return []


def _save_known(found: list[ToolHome], known: list[ToolHome]) -> None:
    extra = [h for h in found if h.found_by != "default" and h.path != default_home(h.tool)]
    if {(h.tool, str(h.path)) for h in extra} == {(h.tool, str(h.path)) for h in known}:
        return
    try:
        path = known_homes_file()
        path.parent.mkdir(parents=True, exist_ok=True)
        rows = [{"tool": h.tool, "path": str(h.path), "found_by": h.found_by} for h in extra]
        path.write_text(json.dumps(rows, indent=1), encoding="utf-8")
    except OSError:
        log.debug("tool homes: cannot save %s", known_homes_file(), exc_info=True)


_finder = _Finder()


def homes(tool: str | None = None) -> list[ToolHome]:
    """Every home found for the tool, the default first. Refreshed every few minutes."""
    found = _finder.homes()
    return [h for h in found if tool is None or h.tool == tool]


def session_dirs(tool: str) -> list[Path]:
    """The session folders of every home of the tool that exist."""
    out = []
    for home in homes(tool):
        folder = session_dir(home.path, tool)
        if folder.is_dir() and folder not in out:
            out.append(folder)
    return out
