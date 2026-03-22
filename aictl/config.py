# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Persistent configuration for aictl.

Reads from ~/.config/aictl/config.toml (Linux/macOS) or
%APPDATA%/aictl/config.toml (Windows). CLI flags override config values.

Config file is auto-created with defaults on first `aictl config show`.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from .platforms import IS_WINDOWS

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

    # AICTL_PORT env var overrides config file default
    env_port = os.environ.get("AICTL_PORT")
    if env_port:
        try:
            cfg.serve_port = int(env_port)
        except ValueError:
            pass

    # [serve] — config file overrides env var
    serve = data.get("serve", {})
    if "port" in serve:
        cfg.serve_port = int(serve["port"])
    if "host" in serve:
        cfg.serve_host = str(serve["host"])
    if "interval" in serve:
        cfg.serve_interval = float(serve["interval"])
    if "open_browser" in serve:
        cfg.serve_open_browser = bool(serve["open_browser"])
    if "monitor" in serve:
        cfg.serve_monitor = bool(serve["monitor"])

    # [monitor]
    mon = data.get("monitor", {})
    for key in ("sample_interval", "refresh_interval", "process_interval",
                "network_interval", "telemetry_interval"):
        if key in mon:
            setattr(cfg, key, float(mon[key]))
    if "filesystem_enabled" in mon:
        cfg.filesystem_enabled = bool(mon["filesystem_enabled"])
    if "telemetry_enabled" in mon:
        cfg.telemetry_enabled = bool(mon["telemetry_enabled"])

    ignored = mon.get("ignored_dirs", {})
    if "names" in ignored:
        cfg.ignored_dirs = list(ignored["names"])

    # [daemon]
    daemon = data.get("daemon", {})
    if "pid_file" in daemon:
        cfg.pid_file = str(daemon["pid_file"])
    if "log_file" in daemon:
        cfg.log_file = str(daemon["log_file"])

    # [storage]
    storage = data.get("storage", {})
    if "db_path" in storage:
        cfg.db_path = str(storage["db_path"])
    if "flush_interval" in storage:
        cfg.flush_interval = float(storage["flush_interval"])
    if "retention_days" in storage:
        cfg.retention_days = int(storage["retention_days"])

    # [logging]
    log_cfg = data.get("logging", {})
    if "enabled" in log_cfg:
        cfg.logging_enabled = bool(log_cfg["enabled"])
    if "log_dir" in log_cfg:
        cfg.logging_dir = str(log_cfg["log_dir"])
    if "max_file_bytes" in log_cfg:
        cfg.logging_max_file_bytes = int(log_cfg["max_file_bytes"])
    if "backup_count" in log_cfg:
        cfg.logging_backup_count = int(log_cfg["backup_count"])

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
