"""AI tool configuration and startup detection.

Reads tool-specific settings files to extract operational config:
- Is the tool set to launch at startup / login?
- What model is configured?
- Are MCP servers configured?
- What permissions/features are enabled?
- Is auto-update enabled?

Results feed into the dashboard as tool_configs on DashboardSnapshot.
"""

from __future__ import annotations

import json
import os
import platform
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from ..platforms import (
    IS_MACOS,
    IS_WINDOWS,
    claude_global_dir,
    codex_global_dir,
    cursor_user_dir,
    vscode_user_dir,
    windsurf_global_dir,
)


@dataclass
class ToolConfig:
    """Parsed configuration state for one AI tool."""

    tool: str
    settings: dict = field(default_factory=dict)  # Key settings as flat dict
    launch_at_startup: bool | None = None  # True/False/None(unknown)
    auto_update: bool | None = None
    model: str = ""
    mcp_servers: list[str] = field(default_factory=list)  # Server names
    features: dict = field(default_factory=dict)  # Feature flags
    extensions: list[str] = field(default_factory=list)  # Installed extensions

    def to_dict(self) -> dict:
        return {
            "tool": self.tool,
            "settings": self.settings,
            "launch_at_startup": self.launch_at_startup,
            "auto_update": self.auto_update,
            "model": self.model,
            "mcp_servers": self.mcp_servers,
            "features": self.features,
            "extensions": self.extensions,
        }


def _read_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(errors="replace"))
    except (json.JSONDecodeError, OSError):
        return None


def _read_toml(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        import tomllib
    except ModuleNotFoundError:
        try:
            import tomli as tomllib  # type: ignore[no-redef]
        except ModuleNotFoundError:
            return None
    try:
        with open(path, "rb") as f:
            return tomllib.load(f)
    except Exception:
        return None


# ─── macOS login item / launch agent detection ──────────────────

def _macos_login_items() -> set[str]:
    """Get macOS login items (app names)."""
    if not IS_MACOS:
        return set()
    try:
        result = subprocess.run(
            ["osascript", "-e",
             'tell application "System Events" to get the name of every login item'],
            capture_output=True, text=True, timeout=3,
        )
        return set(result.stdout.strip().split(", ")) if result.returncode == 0 else set()
    except Exception:
        return set()


def _macos_launch_agents() -> set[str]:
    """Get names of user launch agents."""
    if not IS_MACOS:
        return set()
    agents_dir = Path.home() / "Library" / "LaunchAgents"
    if not agents_dir.is_dir():
        return set()
    return {f.stem for f in agents_dir.iterdir() if f.suffix == ".plist"}


# ─── Tool-specific parsers ──────────────────────────────────────

def _parse_claude_code_config(root: Path) -> ToolConfig | None:
    cfg = ToolConfig(tool="claude-code")

    # Global settings
    settings = _read_json(claude_global_dir() / "settings.json")
    if settings:
        cfg.settings["effortLevel"] = settings.get("effortLevel", "default")
        for k in ("permissions", "env", "hooks"):
            if k in settings:
                cfg.settings[k] = "configured"

    # Account config (.claude.json)
    account = _read_json(Path.home() / ".claude.json")
    if account:
        cfg.auto_update = bool(account.get("autoUpdates", True))
        cfg.settings["installMethod"] = account.get("installMethod", "unknown")
        cfg.settings["hasCompletedOnboarding"] = account.get("hasCompletedOnboarding", False)

    # Project settings
    proj_settings = _read_json(root / ".claude" / "settings.json")
    if proj_settings:
        cfg.settings["project_settings"] = "configured"
        if "permissions" in proj_settings:
            cfg.settings["project_permissions"] = "configured"

    # MCP servers from .mcp.json
    mcp = _read_json(root / ".mcp.json")
    if mcp and "mcpServers" in mcp:
        cfg.mcp_servers = list(mcp["mcpServers"].keys())

    # VS Code extension check
    vscode_ext = Path.home() / ".vscode" / "extensions"
    if vscode_ext.is_dir():
        cfg.extensions = [
            d.name for d in vscode_ext.iterdir()
            if d.is_dir() and "claude" in d.name.lower()
        ]

    # Startup: check if claude is in login items
    if IS_MACOS:
        login_items = _macos_login_items()
        cfg.launch_at_startup = "Claude" in login_items

    return cfg if (cfg.settings or cfg.mcp_servers or cfg.extensions) else None


def _parse_claude_desktop_config() -> ToolConfig | None:
    cfg = ToolConfig(tool="claude-desktop")

    if IS_MACOS:
        config_path = Path.home() / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json"
    elif IS_WINDOWS:
        config_path = Path(os.environ.get("APPDATA", "")) / "Claude" / "claude_desktop_config.json"
    else:
        config_path = Path.home() / ".config" / "Claude" / "claude_desktop_config.json"

    data = _read_json(config_path)
    if not data:
        return None

    # MCP servers
    mcp = data.get("mcpServers", {})
    cfg.mcp_servers = list(mcp.keys())

    # Preferences
    prefs = data.get("preferences", {})
    for key in ("keepAwakeEnabled", "coworkScheduledTasksEnabled",
                "allowAllBrowserActions", "sidebarMode",
                "coworkWebSearchEnabled", "launchPreviewPersistSession"):
        if key in prefs:
            cfg.features[key] = prefs[key]

    trusted = prefs.get("localAgentModeTrustedFolders", [])
    if trusted:
        cfg.settings["trustedFolders"] = len(trusted)

    # Startup
    if IS_MACOS:
        login_items = _macos_login_items()
        cfg.launch_at_startup = "Claude" in login_items

    return cfg if (cfg.mcp_servers or cfg.features or cfg.settings) else None


def _parse_copilot_config(root: Path) -> ToolConfig | None:
    cfg = ToolConfig(tool="copilot")

    # VS Code settings
    vscode_settings = _read_json(vscode_user_dir() / "settings.json")
    if vscode_settings:
        copilot_enable = vscode_settings.get("github.copilot.enable", {})
        if copilot_enable:
            cfg.features["enable"] = copilot_enable
        for k, v in vscode_settings.items():
            if k.startswith("github.copilot.") and k != "github.copilot.enable":
                short = k.replace("github.copilot.", "")
                cfg.settings[short] = v

    # Copilot extensions
    vscode_ext = Path.home() / ".vscode" / "extensions"
    if vscode_ext.is_dir():
        cfg.extensions = [
            d.name for d in vscode_ext.iterdir()
            if d.is_dir() and "copilot" in d.name.lower()
        ]

    # MCP config
    mcp = _read_json(root / ".copilot" / "mcp-config.json") or _read_json(root / ".copilot-mcp.json")
    if mcp and "mcpServers" in mcp:
        cfg.mcp_servers = list(mcp["mcpServers"].keys())

    return cfg if (cfg.settings or cfg.extensions or cfg.features) else None


def _parse_cursor_config(root: Path) -> ToolConfig | None:
    cfg = ToolConfig(tool="cursor")

    settings = _read_json(cursor_user_dir() / "settings.json")
    if settings:
        for k, v in settings.items():
            if any(x in k.lower() for x in ("cursor", "ai", "copilot", "model", "agent")):
                cfg.settings[k] = v

    # MCP config
    mcp = _read_json(root / ".cursor" / "mcp.json")
    if mcp and "mcpServers" in mcp:
        cfg.mcp_servers = list(mcp["mcpServers"].keys())

    # Extensions
    cursor_ext = Path.home() / ".cursor" / "extensions"
    if cursor_ext.is_dir():
        cfg.extensions = [
            d.name for d in cursor_ext.iterdir()
            if d.is_dir() and any(x in d.name.lower() for x in ("copilot", "claude", "ai"))
        ][:10]

    return cfg if (cfg.settings or cfg.mcp_servers) else None


def _parse_codex_config() -> ToolConfig | None:
    cfg = ToolConfig(tool="codex-cli")

    data = _read_toml(codex_global_dir() / "config.toml")
    if not data:
        return None

    cfg.model = data.get("model", "")
    cfg.settings["model_reasoning_effort"] = data.get("model_reasoning_effort", "")

    features = data.get("features", {})
    for k, v in features.items():
        cfg.features[k] = v

    otel = data.get("otel", {})
    if otel:
        cfg.settings["otel_exporter"] = otel.get("exporter", "none")

    return cfg if (cfg.model or cfg.features) else None


def _parse_windsurf_config(root: Path) -> ToolConfig | None:
    cfg = ToolConfig(tool="windsurf")

    # Global MCP
    mcp = _read_json(windsurf_global_dir() / "mcp_config.json")
    if mcp and "mcpServers" in mcp:
        cfg.mcp_servers = list(mcp["mcpServers"].keys())

    # Project MCP
    proj_mcp = _read_json(root / ".windsurf" / "mcp.json")
    if proj_mcp and "mcpServers" in proj_mcp:
        cfg.mcp_servers.extend(proj_mcp["mcpServers"].keys())

    # Global rules
    rules = windsurf_global_dir() / "memories" / "global_rules.md"
    if rules.is_file():
        cfg.settings["global_rules"] = "configured"

    return cfg if (cfg.mcp_servers or cfg.settings) else None


# ─── Public API ─────────────────────────────────────────────────

def collect_tool_configs(root: Path) -> list[ToolConfig]:
    """Collect configuration state from all supported AI tools. Never raises."""
    configs = []
    for parser in (
        lambda: _parse_claude_code_config(root),
        _parse_claude_desktop_config,
        lambda: _parse_copilot_config(root),
        lambda: _parse_cursor_config(root),
        _parse_codex_config,
        lambda: _parse_windsurf_config(root),
    ):
        try:
            result = parser()
            if result:
                configs.append(result)
        except Exception:
            pass
    return configs
