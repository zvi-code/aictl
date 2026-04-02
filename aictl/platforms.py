# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Platform-specific path resolution for AI tool config directories.

Centralises all OS-conditional logic so the rest of the codebase stays clean.
Supports macOS, Windows, and Linux for every tool.
"""

from __future__ import annotations

import os
import platform
from dataclasses import dataclass, field
from pathlib import Path

_SYSTEM = platform.system()  # "Darwin" | "Windows" | "Linux"
IS_WINDOWS = _SYSTEM == "Windows"
IS_MACOS = _SYSTEM == "Darwin"

CURRENT_PLATFORM: str = "macos" if IS_MACOS else ("windows" if IS_WINDOWS else "linux")


# ── Cross-platform utilities ────────────────────────────────────

def process_basename(comm: str) -> str:
    """Extract short process name from command path, cross-platform."""
    return Path(comm).name


def is_path_under(child: str, parent: str) -> bool:
    """Check if child path is under parent, cross-platform."""
    try:
        Path(child).relative_to(Path(parent))
        return True
    except ValueError:
        return False


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
    if "/.vscode/" in lowered:
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
    return None


# ── Cross-platform app directory helper ─────────────────────────

def _app_dir(
    win: str,
    mac: str | None = None,   # ~/Library/Application Support/{mac}  (macOS)
    dot: str | None = None,   # ~/{dot}  (macOS when mac absent, Linux when xdg absent)
    xdg: str | None = None,   # XDG_CONFIG_HOME/{xdg}  (Linux; macOS fallback when no mac/dot)
    *,
    win_env: str = "APPDATA",
) -> Path:
    """Resolve a cross-platform config directory with minimal repetition."""
    if IS_WINDOWS:
        return Path(os.environ.get(win_env, str(Path.home()))) / win
    _xdg_base = Path(os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config")))
    if IS_MACOS:
        if mac:
            return Path.home() / "Library" / "Application Support" / mac
        if dot:
            return Path.home() / dot
        return _xdg_base / (xdg or win)   # gh and other POSIX tools use XDG on macOS too
    # Linux: prefer explicit XDG subdir, then dotfile, then XDG/{win}
    if xdg:
        return _xdg_base / xdg
    if dot:
        return Path.home() / dot
    return _xdg_base / win


# ── Claude Code ──────────────────────────────────────────────────

def claude_global_dir() -> Path:
    """~/.claude  (macOS/Linux)  |  %APPDATA%/Claude  (Windows)"""
    return _app_dir("Claude", dot=".claude")


def claude_account_config() -> Path:
    """~/.claude.json  (macOS/Linux)  |  %APPDATA%/Claude/.claude.json  (Windows)"""
    if IS_WINDOWS:
        return claude_global_dir() / ".claude.json"
    return Path.home() / ".claude.json"


def claude_projects_dir() -> Path:
    """Directory where Claude Code stores per-project memory."""
    return claude_global_dir() / "projects"


# ── GitHub Copilot ───────────────────────────────────────────────

def copilot_session_dir() -> Path:
    """Directory where Copilot agent sessions are stored."""
    return _app_dir("GitHub Copilot/session-state", dot=".copilot/session-state")


# ── VS Code ──────────────────────────────────────────────────────

def vscode_user_dir() -> Path:
    """VS Code user settings directory."""
    return _app_dir("Code/User", mac="Code/User", xdg="Code/User")


def vscode_extensions_dir() -> Path:
    """VS Code extensions directory (same on all platforms)."""
    return Path.home() / ".vscode" / "extensions"


def vscode_global_storage(extension_id: str) -> Path:
    """VS Code globalStorage path for a specific extension."""
    return vscode_user_dir() / "globalStorage" / extension_id


def copilot_global_storage() -> Path:
    """Copilot Chat globalStorage directory."""
    return vscode_global_storage("github.copilot-chat")


# ── Cursor ───────────────────────────────────────────────────────

def cursor_user_dir() -> Path:
    """Cursor app user settings directory."""
    return _app_dir("Cursor/User", mac="Cursor/User", xdg="Cursor/User")


# ── Windsurf / Codeium ───────────────────────────────────────────

def windsurf_global_dir() -> Path:
    """Windsurf / Codeium global config directory."""
    return _app_dir("Codeium/windsurf", dot=".codeium/windsurf", xdg="Codeium/windsurf")


# ── GitHub CLI (gh) ─────────────────────────────────────────────

def gh_config_dir() -> Path:
    """GitHub CLI config directory (contains Copilot CLI auth + settings)."""
    return _app_dir("GitHub CLI", xdg="gh")


# ── Codex CLI ─────────────────────────────────────────────────────

def codex_global_dir() -> Path:
    """Codex CLI global config directory."""
    return Path.home() / ".codex"


# ── Microsoft 365 / Teams Toolkit ───────────────────────────────

def teams_global_dir() -> Path:
    """Teams Toolkit global config directory."""
    return _app_dir("TeamsFx", mac="TeamsFx", xdg="TeamsFx")


def m365agents_global_dir() -> Path:
    """M365 Agents Toolkit global config directory."""
    return _app_dir("M365AgentsToolkit", mac="M365AgentsToolkit", xdg="M365AgentsToolkit")


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
        return Path(os.environ.get("APPDATA", Path.home())) / "aictl"
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
sample_interval = 1.0
refresh_interval = 1.0
process_interval = 1.0
network_interval = 1.0
telemetry_interval = 5.0
filesystem_enabled = true
telemetry_enabled = true

[monitor.ignored_dirs]
# Directories to skip when scanning workspace
names = [".git", ".hg", ".svn", "node_modules", "__pycache__", ".venv", "venv", "build", "dist", ".next"]

[daemon]
pid_file = ""  # Empty = auto (~/.config/aictl/aictl.pid)
log_file = ""  # Empty = auto (~/.config/aictl/aictl.log)

[storage]
db_path = ""  # Empty = auto (~/.config/aictl/history.db)
flush_interval = 10.0  # Seconds between batch writes to SQLite
retention_days = 30  # Delete data older than this

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
    sample_interval: float = 1.0
    refresh_interval: float = 1.0
    process_interval: float = 1.0
    network_interval: float = 1.0
    telemetry_interval: float = 5.0
    filesystem_enabled: bool = True
    telemetry_enabled: bool = True
    ignored_dirs: list[str] = field(default_factory=lambda: [
        ".git", ".hg", ".svn", "node_modules", "__pycache__",
        ".venv", "venv", "build", "dist", ".next",
    ])

    # daemon
    pid_file: str = ""
    log_file: str = ""

    # storage
    db_path: str = ""
    flush_interval: float = 10.0
    retention_days: int = 30

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
    ],
    "logging": [
        ("enabled", "logging_enabled", bool),
        ("log_dir", "logging_dir", str),
        ("max_file_bytes", "logging_max_file_bytes", int),
        ("backup_count", "logging_backup_count", int),
    ],
}


def load_config() -> AictlConfig:
    """Load config from TOML file, falling back to defaults."""
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
    ]
    return "\n".join(lines)
