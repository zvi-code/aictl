# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Platform-specific path resolution for AI tool config directories.

Centralises all OS-conditional logic so the rest of the codebase stays clean.
Supports macOS, Windows, and Linux for every tool.
"""

from __future__ import annotations

import logging
import ntpath
import os
import platform
import signal
import struct
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

_SYSTEM = platform.system()  # "Darwin" | "Windows" | "Linux"
IS_WINDOWS = _SYSTEM == "Windows"
IS_MACOS = _SYSTEM == "Darwin"

CURRENT_PLATFORM: str = "macos" if IS_MACOS else ("windows" if IS_WINDOWS else "linux")


# ── Cross-platform utilities ────────────────────────────────────


def process_basename(comm: str) -> str:
    """Extract short process name from command path, cross-platform."""
    return ntpath.basename(comm) if IS_WINDOWS else Path(comm).name


def is_path_under(child: str, parent: str) -> bool:
    """Check if child path is under parent, cross-platform (case-insensitive on Windows)."""
    if IS_WINDOWS:
        c, p = path_key(child), path_key(parent)
        return c == p or c.startswith(p.rstrip("\\") + "\\")
    try:
        Path(child).relative_to(Path(parent))
        return True
    except ValueError:
        return False


def path_key(path: str) -> str:
    """Form of *path* for equality and prefix comparison on the current platform.

    Windows paths compare case-insensitively and with either separator.
    """
    return ntpath.normcase(ntpath.normpath(path)) if IS_WINDOWS else os.path.normpath(path)


def path_contains_component(path: str, component: str) -> bool:
    """Check if a path contains a directory component (e.g. '.claude')."""
    lowered = path.lower().replace("\\", "/")
    comp = component.lower()
    return f"/{comp}/" in f"/{lowered}/" or lowered.endswith(f"/{comp}")


def tool_hint_for_path(path: str) -> str | None:
    """Infer which AI tool owns a file path based on directory components.

    Used by filesystem and telemetry collectors to attribute file events
    to tool sessions without process information.
    """
    lowered = path.lower().replace("\\", "/")
    if "/application support/codex/" in lowered or "/chatgpt.app/" in lowered:
        return "codex-desktop"
    if "/github-copilot-sdk/" in lowered or "/com.github.githubapp/" in lowered:
        return "copilot-desktop"
    if "/appdata/local/github copilot/" in lowered or "/appdata/local/programs/github copilot/" in lowered:
        return "copilot-desktop"
    if "/library/application support/claude/" in lowered or "/library/application support/claude-3p/" in lowered:
        return "claude-desktop"
    if "/appdata/roaming/claude/" in lowered:
        return "claude-desktop"
    if "/.vscode/" in lowered or "/.vscode-insiders/" in lowered:
        return "copilot-vscode"
    if "/code/user/" in lowered or "/code - insiders/user/" in lowered:
        return "copilot-vscode"
    if "/.copilot/" in lowered or "github/copilot" in lowered:
        return "copilot-cli"
    if "/.claude/" in lowered or lowered.endswith("claude.md"):
        return "claude-code"
    if "/.codex/" in lowered:
        return "codex-cli"
    if "/.cursor/" in lowered:
        return "cursor"
    if "/.windsurf/" in lowered or "/codeium/" in lowered:
        return "windsurf"
    if "/.gemini/" in lowered or lowered.endswith("gemini.md"):
        return "gemini-cli"
    return None


# ── Process control ─────────────────────────────────────────────

# Set on a detached ``aictl serve``: the file where the process records its own pid.
DAEMON_PID_ENV = "AICTL_DAEMON_PID_FILE"


def pid_alive(pid: int) -> bool:
    """Whether *pid* is a running process.

    ``os.kill(pid, 0)`` is not a probe on Windows: 0 is ``CTRL_C_EVENT``, which
    is delivered to a console process group instead of testing for existence.
    """
    if pid <= 0:
        return False
    if IS_WINDOWS:
        try:
            import psutil
        except ImportError:
            return False
        return psutil.pid_exists(pid)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def terminate_pid(pid: int) -> bool:
    """Stop *pid*; False when it was already gone.

    On Windows this ends the process tree with ``taskkill``: there is no SIGTERM
    delivery, and ``os.kill`` raises a plain ``OSError`` for a missing pid.
    """
    if IS_WINDOWS:
        result = subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, check=False)
        return result.returncode == 0
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        return False
    return True


def is_aictl_process(pid: int) -> bool:
    """Whether *pid* looks like aictl, so a reused pid in a stale pid file is never killed.

    Without psutil the answer is True on POSIX (the previous behaviour).
    """
    try:
        import psutil
    except ImportError:
        return not IS_WINDOWS
    try:
        return "aictl" in " ".join(psutil.Process(pid).cmdline()).lower()
    except (psutil.Error, OSError):
        return False


def listening_pids(port: int) -> list[int]:
    """Pids bound to TCP *port*; empty when free or when the owner cannot be determined."""
    if IS_WINDOWS:
        try:
            import psutil
        except ImportError:
            return []
        try:
            conns = psutil.net_connections(kind="tcp")
        except (psutil.Error, OSError, RuntimeError):
            return []
        return sorted({c.pid for c in conns if c.pid and c.status == "LISTEN" and c.laddr and c.laddr.port == port})
    try:
        result = subprocess.run(["lsof", "-ti", f"tcp:{port}", "-sTCP:LISTEN"], capture_output=True, text=True, timeout=5)
    except (FileNotFoundError, subprocess.SubprocessError, OSError):
        return []  # lsof unavailable, let the bind fail naturally
    if result.returncode != 0:
        return []
    return [int(line) for line in result.stdout.split() if line.isdigit()]


def spawn_detached_windows(argv: list[str], log_file: Path, pid_file: Path) -> subprocess.Popen:
    """Start *argv* in the background on Windows, with output in *log_file*.

    ``CREATE_NO_WINDOW`` rather than ``DETACHED_PROCESS``: a venv ``python.exe``
    is a launcher that starts the real interpreter, and a console-less launcher
    would open a new console window for it. For the same reason the returned pid
    is the launcher's, so the child records its own pid in *pid_file*.
    """
    create_new_process_group = 0x00000200
    create_no_window = 0x08000000
    env = {**os.environ, DAEMON_PID_ENV: str(pid_file), "PYTHONUTF8": "1"}
    with open(log_file, "ab") as log:
        return subprocess.Popen(
            argv,
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=subprocess.STDOUT,
            env=env,
            close_fds=True,
            creationflags=create_new_process_group | create_no_window,
        )


def harden_stdio() -> None:
    """Stop non-ASCII output from raising on Windows when stdout is piped to a legacy code page."""
    if not IS_WINDOWS:
        return
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            try:
                reconfigure(errors="backslashreplace")
            except (OSError, ValueError):
                continue


# ── Cross-platform app directory helper ─────────────────────────


def _app_dir(
    win: str,
    mac: str | None = None,  # ~/Library/Application Support/{mac}  (macOS)
    dot: str | None = None,  # ~/{dot}  (macOS when mac absent, Linux when xdg absent)
    xdg: str | None = None,  # XDG_CONFIG_HOME/{xdg}  (Linux; macOS fallback when no mac/dot)
    *,
    win_env: str = "APPDATA",
) -> Path:
    """Resolve a cross-platform config directory with minimal repetition."""
    if IS_WINDOWS:
        # ``or`` (not a get-default) so a present-but-empty env var still
        # falls back to home instead of yielding a CWD-relative path.
        base = os.environ.get(win_env) or str(Path.home())
        return Path(base) / win
    _xdg_base = Path(os.environ.get("XDG_CONFIG_HOME") or str(Path.home() / ".config"))
    if IS_MACOS:
        if mac:
            return Path.home() / "Library" / "Application Support" / mac
        if dot:
            return Path.home() / dot
        return _xdg_base / (xdg or win)  # gh and other POSIX tools use XDG on macOS too
    # Linux: prefer explicit XDG subdir, then dotfile, then XDG/{win}
    if xdg:
        return _xdg_base / xdg
    if dot:
        return Path.home() / dot
    return _xdg_base / win


def _env_dir(var: str) -> Path | None:
    """Directory named by an environment override (CLAUDE_CONFIG_DIR, CODEX_HOME, COPILOT_HOME), if set."""
    raw = os.environ.get(var, "").strip()
    return Path(raw).expanduser() if raw else None


# ── Claude Code ──────────────────────────────────────────────────


def claude_global_dir() -> Path:
    """~/.claude  (macOS/Linux)  |  %USERPROFILE%/.claude  (Windows)

    Claude Code is the same cross-platform binary on every OS and resolves its
    home via ``os.homedir()``/``UserHomeDir``, so the directory is ``.claude``
    under the user profile on Windows (NOT ``%APPDATA%``).  ``CLAUDE_CONFIG_DIR``
    overrides the location.
    """
    return _env_dir("CLAUDE_CONFIG_DIR") or _app_dir(".claude", dot=".claude", win_env="USERPROFILE")


def claude_account_config() -> Path:
    """~/.claude.json on every platform (sibling of the ``.claude`` dir)."""
    return Path.home() / ".claude.json"


def claude_desktop_dir() -> Path:
    """Claude *Desktop* config dir (the Electron app — genuinely %APPDATA%).

    ``~/Library/Application Support/Claude`` (macOS) |
    ``%APPDATA%\\Claude`` (Windows) | ``~/.config/Claude`` (Linux).
    Distinct from :func:`claude_global_dir` (the CLI's ``~/.claude``).
    """
    return _app_dir("Claude", mac="Claude")


def claude_desktop_config() -> Path:
    """Path to Claude Desktop's ``claude_desktop_config.json``."""
    return claude_desktop_dir() / "claude_desktop_config.json"


def claude_projects_dir() -> Path:
    """Directory where Claude Code stores per-project memory."""
    return claude_global_dir() / "projects"


def claude_project_memory_dir(project_hash: str) -> Path:
    """Per-project memory directory: ``~/.claude/projects/<hash>/memory``."""
    return claude_projects_dir() / project_hash / "memory"


# ── GitHub Copilot ───────────────────────────────────────────────


def copilot_session_dir() -> Path:
    """Directory where Copilot agent sessions are stored (``~/.copilot/session-state``).

    The Copilot CLI bundles Node.js and uses ``os.homedir()`` on every platform,
    so this lives under ``%USERPROFILE%/.copilot`` on Windows (NOT ``%APPDATA%``).
    ``COPILOT_HOME`` relocates the whole ``.copilot`` directory.
    """
    home = _env_dir("COPILOT_HOME")
    if home:
        return home / "session-state"
    return _app_dir(".copilot/session-state", dot=".copilot/session-state", win_env="USERPROFILE")


def copilot_global_dir() -> Path:
    """User-level Copilot CLI / VS Code Copilot hooks+skills dir (``~/.copilot``).

    Same ``os.homedir()`` resolution as the CLI, so on Windows this is
    ``%USERPROFILE%/.copilot`` (NOT ``%APPDATA%/GitHub Copilot``).  ``COPILOT_HOME``
    overrides the location.
    """
    return _env_dir("COPILOT_HOME") or _app_dir(".copilot", dot=".copilot", win_env="USERPROFILE")


# ── VS Code ──────────────────────────────────────────────────────


def vscode_user_dir() -> Path:
    """VS Code user settings directory."""
    return _app_dir("Code/User", mac="Code/User", xdg="Code/User")


def vscode_insiders_user_dir() -> Path:
    """VS Code Insiders user settings directory (``%APPDATA%\\Code - Insiders\\User`` on Windows)."""
    return _app_dir("Code - Insiders/User", mac="Code - Insiders/User", xdg="Code - Insiders/User")


def vscode_insiders_extensions_dir() -> Path:
    """VS Code Insiders extensions directory (same on all platforms)."""
    return Path.home() / ".vscode-insiders" / "extensions"


def vscode_extensions_dir() -> Path:
    """VS Code extensions directory (same on all platforms)."""
    return Path.home() / ".vscode" / "extensions"


def vscode_global_storage(extension_id: str) -> Path:
    """VS Code globalStorage path for a specific extension."""
    return vscode_user_dir() / "globalStorage" / extension_id


def copilot_global_storage() -> Path:
    """Copilot Chat globalStorage directory."""
    return vscode_global_storage("github.copilot-chat")


# ── GitHub Copilot desktop app (Windows install) ────────────────


def copilot_desktop_install_dirs() -> list[Path]:
    """Candidate install directories of the Copilot desktop app on Windows.

    Unverified: the published installers are a per-user NSIS ``.exe`` and a
    per-machine WiX ``.msi`` (winget ``GitHub.CopilotApp``), but no vendor
    document states the directories, so these are the conventional locations.
    """
    dirs: list[Path] = []
    local = os.environ.get("LOCALAPPDATA")
    if local:
        dirs += [Path(local) / "Programs" / "GitHub Copilot", Path(local) / "GitHub Copilot"]
    program_files = os.environ.get("ProgramFiles")
    if program_files:
        dirs.append(Path(program_files) / "GitHub Copilot")
    return dirs


def _parse_fixed_file_info(fixed: bytes) -> str:
    """Version string from the bytes of a Windows ``VS_FIXEDFILEINFO`` structure."""
    if len(fixed) < 16:
        return ""
    signature, _struct_version, ms, ls = struct.unpack("<4L", fixed[:16])
    if signature != 0xFEEF04BD:
        return ""
    parts = [ms >> 16, ms & 0xFFFF, ls >> 16, ls & 0xFFFF]
    return ".".join(str(n) for n in (parts if parts[3] else parts[:3]))


def windows_file_version(exe: Path) -> str:
    """File version from a Windows executable's metadata; "" when absent. Never runs the file."""
    if not IS_WINDOWS:
        return ""
    try:
        import ctypes

        api = ctypes.WinDLL("version.dll")
        size = api.GetFileVersionInfoSizeW(str(exe), None)
        if not size:
            return ""
        buf = ctypes.create_string_buffer(size)
        if not api.GetFileVersionInfoW(str(exe), 0, size, buf):
            return ""
        ptr, length = ctypes.c_void_p(), ctypes.c_uint()
        if not api.VerQueryValueW(buf, "\\", ctypes.byref(ptr), ctypes.byref(length)):
            return ""
        return _parse_fixed_file_info(ctypes.string_at(ptr.value, length.value))
    except (OSError, AttributeError, ValueError):
        return ""


def copilot_desktop_windows_version() -> str:
    """Copilot desktop app version from executable metadata in its install directory.

    Reads file metadata only. The executable name is unverified on Windows, so
    the known names are tried first, then any top-level ``.exe`` except uninstallers.
    """
    for install_dir in copilot_desktop_install_dirs():
        if not install_dir.is_dir():
            continue
        known = [install_dir / "GitHub Copilot.exe", install_dir / "github.exe"]
        try:
            others = sorted(p for p in install_dir.glob("*.exe") if not p.name.lower().startswith("unins"))
        except OSError:
            others = []
        for exe in [*known, *others]:
            version = windows_file_version(exe) if exe.is_file() else ""
            if version:
                return version
    return ""


# ── Cursor ───────────────────────────────────────────────────────


def cursor_user_dir() -> Path:
    """Cursor *editor* user settings directory (Electron app data).

    This is the VS Code-style ``Cursor/User`` dir under ``%APPDATA%`` /
    ``~/Library/Application Support`` — NOT the same as :func:`cursor_home_dir`.
    """
    return _app_dir("Cursor/User", mac="Cursor/User", xdg="Cursor/User")


def cursor_home_dir() -> Path:
    """Cursor home dir (``~/.cursor``) — holds conversations.db, CLI state.

    Distinct from :func:`cursor_user_dir` (the editor's Electron app data).
    Same ``~/.cursor`` on every platform (``%USERPROFILE%\\.cursor`` on Windows).
    """
    return _app_dir(".cursor", dot=".cursor", win_env="USERPROFILE")


# ── Windsurf / Codeium ───────────────────────────────────────────


def windsurf_global_dir() -> Path:
    """Windsurf / Codeium global config directory (``~/.codeium/windsurf``).

    Codeium stores under the home ``.codeium`` dir on every platform, so on
    Windows this is ``%USERPROFILE%/.codeium/windsurf`` (NOT ``%APPDATA%``).
    """
    return _app_dir(
        ".codeium/windsurf", dot=".codeium/windsurf", xdg="Codeium/windsurf", win_env="USERPROFILE"
    )


# ── GitHub CLI (gh) ─────────────────────────────────────────────


def gh_config_dir() -> Path:
    """GitHub CLI config directory (contains Copilot CLI auth + settings)."""
    return _app_dir("GitHub CLI", xdg="gh")


# ── Codex CLI ─────────────────────────────────────────────────────


def codex_global_dir() -> Path:
    """Codex global state directory: ``$CODEX_HOME`` or ``~/.codex`` (CLI and desktop app share it)."""
    return _env_dir("CODEX_HOME") or Path.home() / ".codex"


# ── Microsoft 365 / Teams Toolkit ───────────────────────────────


def teams_global_dir() -> Path:
    """Teams Toolkit global config directory."""
    return _app_dir("TeamsFx", mac="TeamsFx", xdg="TeamsFx")


def m365agents_global_dir() -> Path:
    """M365 Agents Toolkit global config directory."""
    return _app_dir("M365AgentsToolkit", mac="M365AgentsToolkit", xdg="M365AgentsToolkit")


# ── Gemini CLI ──────────────────────────────────────────────────


def gemini_global_dir() -> Path:
    """~/.gemini  (macOS/Linux)  |  %USERPROFILE%/.gemini  (Windows)"""
    return _app_dir(".gemini", dot=".gemini", win_env="USERPROFILE")


# ── Azure Developer CLI (azd) / Azure AI / PromptFlow ───────────


def azd_config_dir() -> Path:
    """Azure Developer CLI config directory."""
    return _app_dir(".azd", dot=".azd", win_env="USERPROFILE")


def promptflow_global_dir() -> Path:
    """PromptFlow global config directory."""
    return _app_dir(".promptflow", dot=".promptflow", win_env="USERPROFILE")


# ── AictlConfig ─────────────────────────────────────────────────────

_TOML_AVAILABLE = False
try:
    import tomllib  # Python 3.11+

    _TOML_AVAILABLE = True
except ModuleNotFoundError:
    try:
        import tomli as tomllib  # type: ignore[no-redef]

        _TOML_AVAILABLE = True
    except ModuleNotFoundError:
        pass


def config_dir() -> Path:
    """Platform-appropriate config directory for aictl."""
    if IS_WINDOWS:
        # ``or``: a present-but-empty APPDATA must not yield a CWD-relative path.
        return Path(os.environ.get("APPDATA") or Path.home()) / "aictl"
    xdg = os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))
    return Path(xdg) / "aictl"


def config_path() -> Path:
    return config_dir() / "config.toml"


_DEFAULT_TOML = """\
# aictl configuration
# CLI flags override these values.

[serve]
port = 8484
host = "127.0.0.1"
interval = 5.0
open_browser = true
monitor = true

[monitor]
# Seconds at full pace. With no dashboard client and no tool activity, polling
# slows down by a factor of 6. Uncomment to override the built-in values.
# sample_interval = 5.0
# refresh_interval = 5.0
# process_interval = 5.0
# network_interval = 5.0
# telemetry_interval = 30.0
filesystem_enabled = true
telemetry_enabled = true

[monitor.ignored_dirs]
# Directories to skip when scanning workspace
names = [".git", ".hg", ".svn", "node_modules", "__pycache__", ".venv", "venv", "build", "dist", ".next"]

[daemon]
pid_file = ""  # Empty = auto (aictl.pid next to this file)
log_file = ""  # Empty = auto (aictl.log next to this file)

[storage]
db_path = ""  # Empty = auto (history.db next to this file)
flush_interval = 10.0  # Seconds between batch writes to SQLite
retention_days = 30  # Delete data older than this
capture = "full"  # full: text kept but bounded | metadata: no text | off: memory only, no files
max_total_mb = 1024  # Budget for DB + WAL + logs; oldest data is evicted first
content_retention_days = 14  # capture = "full": blank conversation text older than this
# A Kusto (Azure Data Explorer) cluster instead of SQLite: every table lives in one
# database there and the daemon serves from it alone. Empty = SQLite.
kusto_cluster = ""  # e.g. https://mycluster.westus.kusto.windows.net, or http://localhost:8080 for the emulator
kusto_database = "aictl"
kusto_auth = "auto"  # auto (Azure CLI login; none for a local emulator) | azcli | device | managed-identity | none

[logging]
enabled = false         # Set true to log every datapoint to file
log_dir = "logs"        # Directory for log files (relative to cwd, or absolute)
max_file_bytes = 1048576  # Rotate after 1MB (1048576 bytes)
backup_count = 10       # Keep this many rotated files
"""


@dataclass
class AictlConfig:
    """Merged config from file + CLI overrides."""

    # serve
    serve_port: int = 8484
    serve_host: str = "127.0.0.1"
    serve_interval: float = 5.0
    serve_open_browser: bool = True
    serve_monitor: bool = True

    # monitor
    sample_interval: float = 5.0
    refresh_interval: float = 5.0
    process_interval: float = 5.0
    network_interval: float = 5.0
    telemetry_interval: float = 30.0
    filesystem_enabled: bool = True
    telemetry_enabled: bool = True
    ignored_dirs: list[str] = field(
        default_factory=lambda: [
            ".git",
            ".hg",
            ".svn",
            "node_modules",
            "__pycache__",
            ".venv",
            "venv",
            "build",
            "dist",
            ".next",
        ]
    )

    # daemon
    pid_file: str = ""
    log_file: str = ""

    # storage
    db_path: str = ""
    flush_interval: float = 10.0
    retention_days: int = 30
    capture: str = "full"
    max_total_mb: int = 1024
    content_retention_days: int = 14
    kusto_cluster: str = ""
    kusto_database: str = "aictl"
    kusto_auth: str = "auto"

    # logging
    logging_enabled: bool = False
    logging_dir: str = "logs"
    logging_max_file_bytes: int = 1_048_576  # 1MB
    logging_backup_count: int = 10

    def effective_db_path(self) -> Path:
        if self.db_path:
            return Path(self.db_path)
        return config_dir() / "history.db"

    def effective_pid_file(self) -> Path:
        if self.pid_file:
            return Path(self.pid_file)
        return config_dir() / "aictl.pid"

    def effective_log_file(self) -> Path:
        if self.log_file:
            return Path(self.log_file)
        return config_dir() / "aictl.log"


# Declarative map: TOML section → list of (toml_key, cfg_attr, coerce_fn)
_CONFIG_MAP: dict[str, list[tuple[str, str, type]]] = {
    "serve": [
        ("port", "serve_port", int),
        ("host", "serve_host", str),
        ("interval", "serve_interval", float),
        ("open_browser", "serve_open_browser", bool),
        ("monitor", "serve_monitor", bool),
    ],
    "monitor": [
        ("sample_interval", "sample_interval", float),
        ("refresh_interval", "refresh_interval", float),
        ("process_interval", "process_interval", float),
        ("network_interval", "network_interval", float),
        ("telemetry_interval", "telemetry_interval", float),
        ("filesystem_enabled", "filesystem_enabled", bool),
        ("telemetry_enabled", "telemetry_enabled", bool),
    ],
    "daemon": [
        ("pid_file", "pid_file", str),
        ("log_file", "log_file", str),
    ],
    "storage": [
        ("db_path", "db_path", str),
        ("flush_interval", "flush_interval", float),
        ("retention_days", "retention_days", int),
        ("capture", "capture", str),
        ("max_total_mb", "max_total_mb", int),
        ("content_retention_days", "content_retention_days", int),
        ("kusto_cluster", "kusto_cluster", str),
        ("kusto_database", "kusto_database", str),
        ("kusto_auth", "kusto_auth", str),
    ],
    "logging": [
        ("enabled", "logging_enabled", bool),
        ("log_dir", "logging_dir", str),
        ("max_file_bytes", "logging_max_file_bytes", int),
        ("backup_count", "logging_backup_count", int),
    ],
}


CAPTURE_MODES = ("full", "metadata", "off")


def cap_log_file(path: Path, max_bytes: int) -> None:
    """Keep the daemon's log under ``max_bytes``: one old copy, then start over.

    The daemon holds this file open in append mode as stdout, so truncating in
    place is safe and renaming would not stop the writes.
    """
    try:
        if path.stat().st_size <= max_bytes:
            return
        old = path.with_name(path.name + ".1")
        with open(path, "rb") as src, open(old, "wb") as dst:
            src.seek(-max_bytes // 2, os.SEEK_END)
            dst.write(src.read())
        os.truncate(path, 0)
    except OSError:
        pass  # a log problem must never affect collection

# What older ``aictl config init`` wrote into [monitor]. These were template
# defaults, not choices, and they pin the daemon to 1 s polling.
_LEGACY_MONITOR_DEFAULTS = {
    "sample_interval": 1.0,
    "refresh_interval": 1.0,
    "process_interval": 1.0,
    "network_interval": 1.0,
    "telemetry_interval": 5.0,
}


def _drop_legacy_monitor_defaults(data: dict) -> None:
    """Treat a [monitor] block equal to the old template as unset.

    All five values must match, so a deliberate setting of any of them keeps the
    whole block in force. To really poll at those rates, change one value slightly.
    """
    sec = data.get("monitor", {})
    if all(sec.get(k) == v for k, v in _LEGACY_MONITOR_DEFAULTS.items()):
        for key in _LEGACY_MONITOR_DEFAULTS:
            del sec[key]
        logging.getLogger(__name__).info(
            "Ignoring old default [monitor] intervals in config.toml; using the built-in values"
        )


def load_config() -> AictlConfig:
    """Load config from TOML file and environment, falling back to defaults."""
    cfg = _load_config_file()
    # ``aictl daemon serve --capture`` passes its choice down this way.
    cfg.capture = os.environ.get("AICTL_CAPTURE") or cfg.capture
    if cfg.capture not in CAPTURE_MODES:
        logging.getLogger(__name__).warning("Unknown capture mode %r; using 'full'", cfg.capture)
        cfg.capture = "full"
    return cfg


def _load_config_file() -> AictlConfig:
    cfg = AictlConfig()
    path = config_path()
    if not path.is_file() or not _TOML_AVAILABLE:
        return cfg
    try:
        with open(path, "rb") as f:
            data = tomllib.load(f)
    except Exception:
        return cfg

    # AICTL_PORT env var sets the default; config file overrides it
    env_port = os.environ.get("AICTL_PORT")
    if env_port:
        try:
            cfg.serve_port = int(env_port)
        except ValueError:
            pass

    _drop_legacy_monitor_defaults(data)

    for section, fields in _CONFIG_MAP.items():
        sec = data.get(section, {})
        for key, attr, coerce in fields:
            if key in sec:
                setattr(cfg, attr, coerce(sec[key]))

    names = data.get("monitor", {}).get("ignored_dirs", {}).get("names")
    if names:
        cfg.ignored_dirs = list(names)

    return cfg


def write_default_config() -> Path:
    """Write default config.toml if it doesn't exist. Returns path."""
    path = config_path()
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(_DEFAULT_TOML, encoding="utf-8")
    return path


def show_config() -> str:
    """Return current effective config as formatted string."""
    cfg = load_config()
    path = config_path()
    lines = [
        f"Config file: {path} ({'exists' if path.is_file() else 'not created'})",
        "",
        "[serve]",
        f"  port            = {cfg.serve_port}",
        f"  host            = {cfg.serve_host}",
        f"  interval        = {cfg.serve_interval}",
        f"  open_browser    = {cfg.serve_open_browser}",
        f"  monitor         = {cfg.serve_monitor}",
        "",
        "[monitor]",
        f"  sample_interval = {cfg.sample_interval}",
        f"  filesystem      = {cfg.filesystem_enabled}",
        f"  telemetry       = {cfg.telemetry_enabled}",
        f"  ignored_dirs    = {cfg.ignored_dirs}",
        "",
        "[daemon]",
        f"  pid_file        = {cfg.effective_pid_file()}",
        f"  log_file        = {cfg.effective_log_file()}",
        "",
        "[storage]",
        f"  db_path         = {cfg.effective_db_path()}",
        f"  flush_interval  = {cfg.flush_interval}",
        f"  retention_days  = {cfg.retention_days}",
        f"  capture         = {cfg.capture}",
        f"  max_total_mb    = {cfg.max_total_mb}",
        f"  content_retention_days = {cfg.content_retention_days}",
        f"  kusto_cluster   = {cfg.kusto_cluster or '(none: SQLite)'}",
        f"  kusto_database  = {cfg.kusto_database}",
    ]
    return "\n".join(lines)
