"""AI tool configuration and startup detection.

Reads tool-specific settings files to extract operational config:
- Is the tool set to launch at startup / login?
- What model is configured?
- Are MCP servers configured?
- What permissions/features are enabled?
- Is auto-update enabled?
- Is OpenTelemetry / observability enabled?
- Errors / quota / rate-limit state from recent sessions

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
class OTelConfig:
    """Standardized OpenTelemetry configuration state."""

    enabled: bool = False
    exporter: str = ""          # "otlp-http", "otlp-grpc", "console", "file", ""
    endpoint: str = ""          # e.g. "http://localhost:4318"
    file_path: str = ""         # For "file" exporter — the JSON-lines path
    capture_content: bool = False
    source: str = ""            # "vscode-settings", "codex-toml", "env-var", etc.

    def to_dict(self) -> dict:
        return {k: v for k, v in {
            "enabled": self.enabled, "exporter": self.exporter,
            "endpoint": self.endpoint, "file_path": self.file_path,
            "capture_content": self.capture_content, "source": self.source,
        }.items() if v}


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
    otel: OTelConfig = field(default_factory=OTelConfig)
    hints: list[str] = field(default_factory=list)  # Actionable suggestions

    def to_dict(self) -> dict:
        d = {
            "tool": self.tool,
            "settings": self.settings,
            "launch_at_startup": self.launch_at_startup,
            "auto_update": self.auto_update,
            "model": self.model,
            "mcp_servers": self.mcp_servers,
            "features": self.features,
            "extensions": self.extensions,
            "otel": self.otel.to_dict(),
            "hints": self.hints,
        }
        return d


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


# ─── Generic OTel detection ─────────────────────────────────────

def _detect_otel_from_vscode_settings(settings: dict) -> OTelConfig:
    """Extract OTel config from VS Code settings dict (github.copilot.chat.otel.* keys)."""
    otel = OTelConfig(source="vscode-settings")
    otel.enabled = bool(settings.get("github.copilot.chat.otel.enabled", False))
    otel.exporter = str(settings.get("github.copilot.chat.otel.exporterType", ""))
    otel.endpoint = str(settings.get("github.copilot.chat.otel.otlpEndpoint", ""))
    otel.file_path = str(settings.get("github.copilot.chat.otel.outfile", ""))
    otel.capture_content = bool(settings.get("github.copilot.chat.otel.captureContent", False))
    # Also check env-var overrides
    if not otel.enabled and os.environ.get("COPILOT_OTEL_ENABLED", "").lower() in ("true", "1"):
        otel.enabled = True
        otel.source = "env-var"
    if not otel.endpoint:
        otel.endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    return otel


def _detect_otel_from_codex_toml(data: dict) -> OTelConfig:
    """Extract OTel config from Codex config.toml."""
    otel_section = data.get("otel", {})
    if not otel_section:
        return OTelConfig(source="codex-toml")
    return OTelConfig(
        enabled=bool(otel_section.get("enabled", False)),
        exporter=str(otel_section.get("exporter", "")),
        endpoint=str(otel_section.get("endpoint", "")),
        file_path=str(otel_section.get("outfile", "")),
        source="codex-toml",
    )


def _detect_otel_from_claude() -> OTelConfig:
    """Detect Claude Code telemetry availability."""
    otel = OTelConfig(source="claude-stats")
    # Claude Code exposes stats-cache.json as built-in telemetry
    stats = claude_global_dir() / "stats-cache.json"
    if stats.is_file():
        otel.enabled = True
        otel.exporter = "built-in"
        otel.file_path = str(stats)
    # Check for ANTHROPIC_LOG_DIR env var
    log_dir = os.environ.get("ANTHROPIC_LOG_DIR", "")
    if log_dir:
        otel.enabled = True
        otel.source = "env-var"
        otel.file_path = log_dir
    return otel


def _generate_hints(cfg: ToolConfig) -> list[str]:
    """Generate actionable suggestions based on tool configuration state."""
    hints: list[str] = []

    # OTel hints
    if not cfg.otel.enabled:
        if cfg.tool == "copilot":
            hints.append(
                'OTel disabled — enable for verified token counts: '
                'set "github.copilot.chat.otel.enabled": true in VS Code settings'
            )
        elif cfg.tool == "codex-cli":
            hints.append(
                'OTel not configured — set [otel] exporter in ~/.codex/config.toml '
                'for telemetry export'
            )
    else:
        if cfg.otel.exporter == "file" and cfg.otel.file_path:
            hints.append(f"OTel active — writing to {cfg.otel.file_path}")
        elif cfg.otel.exporter in ("otlp-http", "otlp-grpc") and cfg.otel.endpoint:
            hints.append(f"OTel active — exporting to {cfg.otel.endpoint}")
        elif cfg.otel.exporter == "built-in":
            pass  # Claude built-in stats — no hint needed
        elif cfg.otel.enabled:
            hints.append("OTel enabled")

    return hints


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

    # OTel / telemetry
    cfg.otel = _detect_otel_from_claude()

    # Startup: check if claude is in login items
    if IS_MACOS:
        login_items = _macos_login_items()
        cfg.launch_at_startup = "Claude" in login_items

    cfg.hints = _generate_hints(cfg)
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

    cfg.hints = _generate_hints(cfg)
    return cfg if (cfg.mcp_servers or cfg.features or cfg.settings) else None


def _parse_copilot_config(root: Path) -> ToolConfig | None:
    cfg = ToolConfig(tool="copilot")

    # ── Global VS Code settings ─────────────────────────────────
    vscode_settings = _read_json(vscode_user_dir() / "settings.json") or {}

    copilot_enable = vscode_settings.get("github.copilot.enable", {})
    if copilot_enable:
        cfg.features["enable"] = copilot_enable
    for k, v in vscode_settings.items():
        if k.startswith("github.copilot.") and k != "github.copilot.enable":
            short = k.replace("github.copilot.", "")
            cfg.settings[short] = v

    # Agent mode
    agent_enabled = vscode_settings.get("github.copilot.chat.agent.enabled")
    if agent_enabled is not None:
        cfg.features["agent_mode"] = agent_enabled
    max_requests = vscode_settings.get("chat.agent.maxRequests")
    if max_requests is not None:
        cfg.settings["agent_maxRequests"] = max_requests

    # Memory
    local_mem = vscode_settings.get("github.copilot.chat.tools.memory.enabled")
    if local_mem is not None:
        cfg.features["local_memory"] = local_mem
    github_mem = vscode_settings.get("github.copilot.chat.copilotMemory.enabled")
    if github_mem is not None:
        cfg.features["github_memory"] = github_mem

    # Claude agent in VS Code
    claude_agent = vscode_settings.get("github.copilot.chat.claudeAgent.enabled")
    if claude_agent is not None:
        cfg.features["claude_agent"] = claude_agent

    # OTel detection (global settings)
    cfg.otel = _detect_otel_from_vscode_settings(vscode_settings)

    # ── Workspace VS Code settings ──────────────────────────────
    ws_settings = _read_json(root / ".vscode" / "settings.json")
    if ws_settings:
        for k, v in ws_settings.items():
            if k.startswith("github.copilot."):
                short = "ws:" + k.replace("github.copilot.", "")
                cfg.settings[short] = v
        # Workspace OTel overrides global
        ws_otel = _detect_otel_from_vscode_settings(ws_settings)
        if ws_otel.enabled and not cfg.otel.enabled:
            cfg.otel = ws_otel
            cfg.otel.source = "vscode-workspace"

    # ── Extensions ──────────────────────────────────────────────
    vscode_ext = Path.home() / ".vscode" / "extensions"
    if vscode_ext.is_dir():
        cfg.extensions = [
            d.name for d in vscode_ext.iterdir()
            if d.is_dir() and "copilot" in d.name.lower()
        ]

    # ── MCP config (check all locations) ────────────────────────
    mcp_sources = [
        root / ".copilot" / "mcp-config.json",
        root / ".copilot-mcp.json",
        root / ".vscode" / "mcp.json",
    ]
    seen_servers: set[str] = set()
    for mcp_path in mcp_sources:
        mcp = _read_json(mcp_path)
        if not mcp:
            continue
        servers = mcp.get("mcpServers", mcp.get("servers", {}))
        for name in servers:
            if name not in seen_servers:
                cfg.mcp_servers.append(name)
                seen_servers.add(name)

    cfg.hints = _generate_hints(cfg)
    return cfg if (cfg.settings or cfg.extensions or cfg.features or cfg.otel.enabled) else None


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

    cfg.hints = _generate_hints(cfg)
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

    # OTel detection
    cfg.otel = _detect_otel_from_codex_toml(data)

    cfg.hints = _generate_hints(cfg)
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

    cfg.hints = _generate_hints(cfg)
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
