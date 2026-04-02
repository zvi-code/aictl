# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""AI tool configuration and startup detection driven by tool-configs.yaml.

Reads tool-specific settings files to extract operational config.
The YAML schema defines tool name and config file locations; per-tool
parser functions handle the tool-specific extraction logic.

Parsers are registered in _CONFIG_PARSER_REGISTRY by tool name.
collect_tool_configs() iterates over YAML entries and dispatches to
registered parsers — no hardcoded tool names in the collection loop.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
from collections.abc import Callable
import dataclasses
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
from ..data.schema import load_tool_configs
from ..fsutil import safe_iterdir

log = logging.getLogger(__name__)


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
    feature_groups: dict[str, dict] = field(default_factory=dict)  # Grouped features by mode/category

    def to_dict(self) -> dict:
        d = dataclasses.asdict(self)
        d["otel"] = self.otel.to_dict()  # use filtered version (omits falsy values)
        if not self.feature_groups:
            del d["feature_groups"]
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


def _pick(get_fn: Callable, pairs: list[tuple[str, str]]) -> dict:
    """Build a dict from (source_key, dest_label) pairs, skipping None values."""
    return {dst: v for src, dst in pairs if (v := get_fn(src)) is not None}


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
    return {f.stem for f in safe_iterdir(agents_dir) if f.suffix == ".plist"}


def _mcp_server_names(data: dict | None) -> list[str]:
    """Extract MCP server names from a config dict with an 'mcpServers' key."""
    return list((data or {}).get("mcpServers", {}).keys())


def _finish(cfg: "ToolConfig", has_data: bool) -> "ToolConfig | None":
    """Generate hints, then return cfg if has_data, else None."""
    cfg.hints = _generate_hints(cfg)
    return cfg if has_data else None


def _find_extensions(ext_dir: Path, *keywords: str, limit: int | None = None) -> list[str]:
    """List extension directory names that match any of the given keywords."""
    exts = [d.name for d in safe_iterdir(ext_dir) if d.is_dir() and any(k in d.name.lower() for k in keywords)]
    return exts[:limit] if limit else exts


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
        elif cfg.otel.exporter == "console":
            hints.append("OTel exporter is 'console' — telemetry logs to stdout only, not collected")
        elif cfg.otel.exporter == "built-in":
            pass  # Claude built-in stats — no hint needed
        elif cfg.otel.enabled:
            hints.append("OTel enabled")

    # Agent debug logging hints
    if cfg.features.get("agentDebugLog"):
        hints.append("Agent debug logging active — /troubleshoot available; fileLogging writes events to disk")
    if cfg.features.get("agentDebugLog_fileLogging") and not cfg.features.get("agentDebugLog"):
        hints.append("agentDebugLog.fileLogging enabled but agentDebugLog.enabled is false — no output will be written")

    # CLI mode hints
    if cfg.features.get("cli_autoCommit"):
        hints.append("CLI autoCommit enabled — agent will commit changes to git automatically after tool runs")
    if cfg.features.get("cli_worktreeIsolation") is False and cfg.features.get("cli_autoCommit"):
        hints.append("CLI worktree isolation disabled with autoCommit on — agent edits land directly in working tree")

    return hints


# ─── Tool-specific parsers ──────────────────────────────────────

def _parse_claude_code_config(root: Path, tool: str = "claude-code") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

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
    cfg.mcp_servers = _mcp_server_names(_read_json(root / ".mcp.json"))

    # VS Code extension check
    cfg.extensions = _find_extensions(Path.home() / ".vscode" / "extensions", "claude")

    # OTel / telemetry
    cfg.otel = _detect_otel_from_claude()

    # Startup: check if claude is in login items
    if IS_MACOS:
        login_items = _macos_login_items()
        cfg.launch_at_startup = "Claude" in login_items

    return _finish(cfg, bool(cfg.settings or cfg.mcp_servers or cfg.extensions))


def _parse_claude_desktop_config(root: Path | None = None, tool: str = "claude-desktop") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

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
    cfg.mcp_servers = _mcp_server_names(data)

    # Preferences — grouped by mode
    prefs = data.get("preferences", {})

    # Chat mode
    chat = {}
    if "sidebarMode" in prefs:
        chat["sidebarMode"] = prefs["sidebarMode"]
    if chat:
        cfg.feature_groups["Chat"] = chat

    # Code mode (agent)
    code = {}
    trusted = prefs.get("localAgentModeTrustedFolders", [])
    if trusted:
        code["trustedFolders"] = len(trusted)
    if "launchPreviewPersistSession" in prefs:
        code["livePreview"] = prefs["launchPreviewPersistSession"]
    if code:
        cfg.feature_groups["Code (Agent)"] = code

    # Cowork mode (autonomous)
    cowork = {}
    for key in ("coworkWebSearchEnabled", "coworkScheduledTasksEnabled",
                "allowAllBrowserActions"):
        if key in prefs:
            label = key.replace("cowork", "").replace("Enabled", "").replace("allow", "")
            label = label[0].lower() + label[1:] if label else key
            cowork[label] = prefs[key]
    if cowork:
        cfg.feature_groups["Cowork (Autonomous)"] = cowork

    # Flat features for backward compat
    for key in ("keepAwakeEnabled", "coworkScheduledTasksEnabled",
                "allowAllBrowserActions", "sidebarMode",
                "coworkWebSearchEnabled", "launchPreviewPersistSession"):
        if key in prefs:
            cfg.features[key] = prefs[key]

    if trusted:
        cfg.settings["trustedFolders"] = len(trusted)

    # Startup
    if IS_MACOS:
        login_items = _macos_login_items()
        cfg.launch_at_startup = "Claude" in login_items

    return _finish(cfg, bool(cfg.mcp_servers or cfg.features or cfg.settings or cfg.feature_groups))


def _parse_vscode_config(root: Path, tool: str = "vscode") -> ToolConfig | None:
    """Collect VS Code platform-level AI settings (chat.* namespace).

    These affect ALL AI tools running inside VS Code, not just Copilot.
    """
    cfg = ToolConfig(tool=tool)

    user_dir = vscode_user_dir()
    if not user_dir.exists():
        return None  # VS Code not installed

    user_settings  = _read_json(user_dir / "settings.json") or {}
    ws_settings    = _read_json(root / ".vscode" / "settings.json") or {}
    # Workspace overrides user
    vscode_settings: dict = {**user_settings, **ws_settings}

    # Known VS Code defaults for all important chat.* settings.
    # Shown when the user hasn't explicitly set the key — gives full visibility
    # even on a default install.
    _DEFAULTS: dict = {
        "chat.agent.enabled":                         True,
        "chat.agent.maxRequests":                     50,
        "chat.autopilot.enabled":                     True,
        "chat.autoReply":                             False,
        "chat.useHooks":                              True,
        "chat.useClaudeHooks":                        False,
        "chat.useCustomAgentHooks":                   False,
        "chat.useClaudeMdFile":                       True,
        "chat.useAgentsMdFile":                       True,
        "chat.useNestedAgentsMdFiles":                False,
        "chat.includeApplyingInstructions":           True,
        "chat.tools.global.autoApprove":              False,
        "chat.tools.terminal.sandbox.enabled":        False,
        "chat.tools.terminal.enableAutoApprove":      True,
        "chat.tools.terminal.autoApproveWorkspaceNpmScripts": True,
        "chat.mcp.access":                            "all",
        "chat.mcp.autostart":                         "newAndOutdated",
    }

    def get(key: str):
        """Return explicit setting if present, else known default, else None."""
        if key in vscode_settings:
            return vscode_settings[key]
        return _DEFAULTS.get(key)

    for group_name, pairs in (
        ("Agent", [
            ("chat.agent.enabled",       "enabled"),
            ("chat.autopilot.enabled",   "autopilot"),
            ("chat.autoReply",           "autoReply"),
            ("chat.agent.maxRequests",   "maxRequests"),
        ]),
        ("Hooks", [
            ("chat.useHooks",                "enabled"),
            ("chat.useClaudeHooks",          "claudeHooks"),
            ("chat.useCustomAgentHooks",     "customAgentHooks"),
            ("chat.hookFilesLocations",      "locations"),
        ]),
        ("Safety", [
            ("chat.tools.global.autoApprove",                       "globalAutoApprove"),
            ("chat.tools.terminal.sandbox.enabled",                  "terminalSandbox"),
            ("chat.tools.terminal.enableAutoApprove",               "terminalAutoApprove"),
            ("chat.tools.terminal.autoApproveWorkspaceNpmScripts",  "autoApproveNpmScripts"),
        ]),
        ("Context Files", [
            ("chat.useClaudeMdFile",              "claudeMd"),
            ("chat.useAgentsMdFile",              "agentsMd"),
            ("chat.useNestedAgentsMdFiles",       "nestedAgentsMd"),
            ("chat.includeApplyingInstructions",  "applyingInstructions"),
        ]),
        ("File Locations", [
            ("chat.instructionsFilesLocations",  "instructions"),
            ("chat.agentFilesLocations",         "agents"),
            ("chat.agentSkillsLocations",        "skills"),
            ("chat.promptFilesLocations",        "prompts"),
        ]),
        ("MCP", [
            ("chat.mcp.access",             "access"),
            ("chat.mcp.autostart",          "autostart"),
            ("chat.mcp.discovery.enabled",  "discovery"),
        ]),
    ):
        if group := _pick(get, pairs):
            cfg.feature_groups[group_name] = group

    # ── OTel ────────────────────────────────────────────────────
    cfg.otel = _detect_otel_from_vscode_settings(vscode_settings)

    return cfg  # always show if VS Code is installed


_COPILOT_FEATURES: list[tuple[str, str]] = [
    ("github.copilot.chat.agent.enabled",                                  "agent_mode"),
    ("github.copilot.chat.agent.autoFix",                                  "agent_autoFix"),
    ("github.copilot.chat.agent.currentEditorContext.enabled",             "agent_editorContext"),
    ("github.copilot.chat.agent.largeToolResultsToDisk.enabled",           "agent_largeResultsToDisk"),
    ("github.copilot.chat.agentDebugLog.enabled",                          "agentDebugLog"),
    ("github.copilot.chat.agentDebugLog.fileLogging.enabled",              "agentDebugLog_fileLogging"),
    ("github.copilot.chat.tools.memory.enabled",                           "local_memory"),
    ("github.copilot.chat.copilotMemory.enabled",                          "github_memory"),
    ("github.copilot.chat.tools.viewImage.enabled",                        "tool_viewImage"),
    ("github.copilot.chat.claudeAgent.enabled",                            "claude_agent"),
    ("github.copilot.chat.cli.mcp.enabled",                                "cli_mcp"),
    ("github.copilot.chat.cli.isolationOption.enabled",                    "cli_worktreeIsolation"),
    ("github.copilot.chat.cli.autoCommit.enabled",                         "cli_autoCommit"),
    ("github.copilot.chat.cli.branchSupport.enabled",                      "cli_branchSupport"),
    ("chat.useHooks",                                                       "hooks_enabled"),
    ("chat.useClaudeHooks",                                                 "hooks_claude"),
    ("chat.useCustomAgentHooks",                                            "hooks_custom_agent"),
    ("chat.autopilot.enabled",                                              "autopilot"),
    ("chat.tools.global.autoApprove",                                      "global_autoApprove"),
    ("chat.autoReply",                                                      "autoReply"),
    ("chat.tools.terminal.autoApprove",                                    "autoApprove"),
    ("chat.tools.terminal.sandbox.enabled",                                "terminal_sandbox"),
    ("chat.plugins.enabled",                                               "plugins"),
    ("chat.useCustomizationsInParentRepositories",                         "parent_repo_discovery"),
    ("chat.useClaudeMdFile",                                               "ctx_claudeMd"),
    ("chat.useAgentsMdFile",                                               "ctx_agentsMd"),
    ("chat.useNestedAgentsMdFiles",                                        "ctx_nestedAgentsMd"),
    ("github.copilot.chat.anthropic.tools.websearch.enabled",             "anthropic_websearch"),
    ("github.copilot.chat.claudeAgent.allowDangerouslySkipPermissions",   "claudeAgent_skipPermissions"),
    ("chat.mcp.discovery.enabled",                                         "mcp_discovery"),
]

_COPILOT_SETTINGS: list[tuple[str, str]] = [
    ("chat.agent.maxRequests",                                  "agent_maxRequests"),
    ("github.copilot.chat.agentHistorySummarizationMode",       "agent_historySummarizationMode"),
    ("github.copilot.chat.debug.requestLogger.maxEntries",      "debug_requestLoggerMaxEntries"),
    ("chat.hookFilesLocations",                                 "hookFilesLocations"),
    ("github.copilot.chat.anthropic.thinking.budgetTokens",     "anthropic_thinkingBudget"),
    ("github.copilot.chat.anthropic.thinking.effort",           "anthropic_thinkingEffort"),
    ("github.copilot.chat.agent.temperature",                   "agent_temperature"),
    ("chat.mcp.access",                                         "mcp_access"),
    ("chat.planAgent.defaultModel",                             "planModel"),
    ("github.copilot.chat.implementAgent.model",                "implementModel"),
    ("chat.instructionsFilesLocations",                         "instructionsFilesLocations"),
    ("chat.agentFilesLocations",                                "agentFilesLocations"),
    ("chat.agentSkillsLocations",                               "agentSkillsLocations"),
    ("chat.promptFilesLocations",                               "promptFilesLocations"),
]


def _parse_copilot_config(root: Path, tool: str = "copilot") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

    # ── Global VS Code settings ─────────────────────────────────
    vscode_settings = _read_json(vscode_user_dir() / "settings.json") or {}

    if copilot_enable := vscode_settings.get("github.copilot.enable", {}):
        cfg.features["enable"] = copilot_enable
    for k, v in vscode_settings.items():
        if k.startswith("github.copilot.") and k != "github.copilot.enable":
            cfg.settings[k.replace("github.copilot.", "")] = v

    for src, dst in _COPILOT_FEATURES:
        if (v := vscode_settings.get(src)) is not None:
            cfg.features[dst] = v
    for src, dst in _COPILOT_SETTINGS:
        if (v := vscode_settings.get(src)) is not None:
            cfg.settings[dst] = v

    # OTel detection (global settings)
    cfg.otel = _detect_otel_from_vscode_settings(vscode_settings)

    # ── Workspace VS Code settings ──────────────────────────────
    ws_settings = _read_json(root / ".vscode" / "settings.json")
    if ws_settings:
        for k, v in ws_settings.items():
            if k.startswith("github.copilot."):
                cfg.settings["ws:" + k.replace("github.copilot.", "")] = v
        ws_otel = _detect_otel_from_vscode_settings(ws_settings)
        if ws_otel.enabled and not cfg.otel.enabled:
            cfg.otel = ws_otel
            cfg.otel.source = "vscode-workspace"

    # ── Extensions ──────────────────────────────────────────────
    cfg.extensions = _find_extensions(Path.home() / ".vscode" / "extensions", "copilot")

    # ── MCP config (check all locations) ────────────────────────
    seen_servers: set[str] = set()
    for mcp_path in (
        vscode_user_dir() / "mcp.json",
        root / ".copilot" / "mcp-config.json",
        root / ".copilot-mcp.json",
        root / ".vscode" / "mcp.json",
    ):
        mcp = _read_json(mcp_path)
        if not mcp:
            continue
        for name in mcp.get("mcpServers", mcp.get("servers", {})):
            if name not in seen_servers:
                cfg.mcp_servers.append(name)
                seen_servers.add(name)

    # ── Feature groups for structured display ───────────────────
    f, s = cfg.features.get, cfg.settings.get
    for group_name, pairs, store in (
        ("Session Targets", [("claude_agent", "claudeTarget"), ("autopilot", "autopilot")], f),
        ("Agent Mode", [
            ("agent_mode", "enabled"), ("agent_autoFix", "autoFix"),
            ("agent_editorContext", "editorContext"), ("agent_largeResultsToDisk", "largeResultsToDisk"),
            ("plugins", "plugins"),
        ], f),
        ("Agent Mode", [
            ("agent_maxRequests", "maxRequests"), ("agent_historySummarizationMode", "historySummarizationMode"),
        ], s),
        ("Debug Logging", [
            ("agentDebugLog", "enabled"), ("agentDebugLog_fileLogging", "fileLogging"),
        ], f),
        ("Debug Logging", [("debug_requestLoggerMaxEntries", "requestLoggerMaxEntries")], s),
        ("Memory & Tools", [
            ("local_memory", "local"), ("github_memory", "github"), ("tool_viewImage", "viewImage"),
        ], f),
        ("CLI Mode", [
            ("cli_mcp", "mcp"), ("cli_worktreeIsolation", "worktreeIsolation"),
            ("cli_autoCommit", "autoCommit"), ("cli_branchSupport", "branchSupport"),
        ], f),
        ("Hooks", [
            ("hooks_enabled", "enabled"), ("hooks_claude", "claudeHooks"),
            ("hooks_custom_agent", "customAgentHooks"),
        ], f),
        ("Hooks", [("hookFilesLocations", "locations")], s),
        ("Safety", [
            ("autoApprove", "autoApprove"), ("terminal_sandbox", "terminalSandbox"),
            ("global_autoApprove", "globalAutoApprove"), ("autoReply", "autoReply"),
        ], f),
        ("Context Files", [
            ("ctx_claudeMd", "claudeMd"), ("ctx_agentsMd", "agentsMd"),
            ("ctx_nestedAgentsMd", "nestedAgentsMd"),
        ], f),
        ("Claude (Anthropic)", [
            ("anthropic_websearch", "webSearch"), ("claudeAgent_skipPermissions", "skipPermissions"),
        ], f),
        ("Claude (Anthropic)", [
            ("anthropic_thinkingBudget", "thinkingBudget"), ("anthropic_thinkingEffort", "thinkingEffort"),
            ("agent_temperature", "temperature"),
        ], s),
    ):
        if chunk := _pick(store, pairs):
            cfg.feature_groups[group_name] = cfg.feature_groups.get(group_name, {}) | chunk

    return _finish(cfg, bool(cfg.settings or cfg.extensions or cfg.features or cfg.otel.enabled or cfg.feature_groups))


def _parse_cursor_config(root: Path, tool: str = "cursor") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

    settings = _read_json(cursor_user_dir() / "settings.json")
    if settings:
        for k, v in settings.items():
            if any(x in k.lower() for x in ("cursor", "ai", "copilot", "model", "agent")):
                cfg.settings[k] = v

    # MCP config
    cfg.mcp_servers = _mcp_server_names(_read_json(root / ".cursor" / "mcp.json"))

    # Extensions
    cfg.extensions = _find_extensions(Path.home() / ".cursor" / "extensions", "copilot", "claude", "ai", limit=10)

    return _finish(cfg, bool(cfg.settings or cfg.mcp_servers))


def _parse_codex_config(root: Path | None = None, tool: str = "codex-cli") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

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

    return _finish(cfg, bool(cfg.model or cfg.features))


def _parse_windsurf_config(root: Path, tool: str = "windsurf") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

    # Global MCP
    cfg.mcp_servers = _mcp_server_names(_read_json(windsurf_global_dir() / "mcp_config.json"))

    # Project MCP
    cfg.mcp_servers.extend(_mcp_server_names(_read_json(root / ".windsurf" / "mcp.json")))

    # Global rules
    rules = windsurf_global_dir() / "memories" / "global_rules.md"
    if rules.is_file():
        cfg.settings["global_rules"] = "configured"

    return _finish(cfg, bool(cfg.mcp_servers or cfg.settings))


# ─── Microsoft 365 Copilot (Teams Toolkit / M365 Agents) ────────

# Simple capability name → feature flag (normalised to lowercase + underscores)
_CAP_FEATURE_FLAGS: dict[str, str] = {
    "websearch": "web_search", "web_search": "web_search",
    "codeinterpreter": "code_interpreter", "code_interpreter": "code_interpreter",
    "graphskills": "graph_skills", "graph_skills": "graph_skills",
}


def _parse_copilot365_config(root: Path, tool: str = "copilot365") -> ToolConfig | None:
    """Parse M365 Copilot / M365 Agents Toolkit config from project files.

    Handles both the new ``m365agents.yml`` format (ATK v5.12+) and the
    legacy ``teamsapp.yml`` (deprecated, sunset July 2026).  New format
    takes precedence when both exist.

    Also parses ``appPackage/`` manifests including declarative agent
    capabilities and ``ai-plugin.json`` function definitions.
    """
    cfg = ToolConfig(tool=tool)

    # ── Project manifest (YAML) ────────────────────────────────
    # New format first, legacy fallback
    manifest_files = [
        ("m365agents.yml", "m365agents.local.yml"),      # new (ATK v5.12+)
        ("teamsapp.yml", "teamsapp.local.yml"),           # legacy
    ]
    found_manifest = False
    for main_name, local_name in manifest_files:
        for name in (main_name, local_name):
            manifest = root / name
            if not manifest.is_file():
                continue
            try:
                import yaml
                data = yaml.safe_load(manifest.read_text(errors="replace")) or {}
                if name == main_name:
                    cfg.settings["version"] = data.get("version", "")
                    for _feat in ("provision", "deploy", "publish"):
                        if data.get(_feat):
                            cfg.features[_feat] = True
                base = name.replace(".yml", "").replace(".local", "")
                cfg.features[base] = True
                found_manifest = True
            except Exception:
                cfg.features[name.replace(".yml", "")] = True
                found_manifest = True
        if found_manifest:
            break  # use new format if found, don't also parse legacy

    # Detect deprecated format still in use
    if "teamsapp" in cfg.features and (root / "m365agents.yml").is_file():
        cfg.hints.append("teamsapp.yml is deprecated — m365agents.yml also exists, consider removing the legacy file")
    elif "teamsapp" in cfg.features and not (root / "m365agents.yml").is_file():
        cfg.hints.append("teamsapp.yml is deprecated (sunset July 2026) — migrate to m365agents.yml with ATK v5.12+")

    # ── appPackage/ manifests ──────────────────────────────────
    app_pkg = root / "appPackage"
    if app_pkg.is_dir():
        cfg.features["appPackage"] = True

        # Declarative agent manifest
        agent_data = _read_json(app_pkg / "declarativeAgent.json")
        if agent_data:
            cfg.features["declarative_agent"] = True
            instructions = agent_data.get("instructions", "")
            if instructions:
                cfg.settings["instructions_length"] = len(instructions)
            caps = agent_data.get("capabilities", [])
            if isinstance(caps, list):
                cap_names = [c.get("name", "") for c in caps if isinstance(c, dict)]
                if cap_names:
                    cfg.settings["capabilities"] = cap_names
                # Map to feature flags
                for cn in cap_names:
                    low = cn.lower().replace(" ", "_")
                    if feat := _CAP_FEATURE_FLAGS.get(low):
                        cfg.features[feat] = True
                    elif low in ("graphconnectors", "graph_connectors"):
                        ids = [
                            conn["connection_id"]
                            for item in caps
                            if isinstance(item, dict) and item.get("name", "").lower().replace(" ", "") == "graphconnectors"
                            for conn in item.get("connections", [])
                            if isinstance(conn, dict) and conn.get("connection_id")
                        ]
                        if ids:
                            cfg.settings["graph_connector_ids"] = ids
                        cfg.features["graph_connectors"] = True
            actions = agent_data.get("actions", [])
            if actions:
                cfg.settings["actions_count"] = len(actions)
            starters = agent_data.get("conversation_starters", [])
            if starters:
                cfg.settings["starters_count"] = len(starters)

        # App manifest
        app_data = _read_json(app_pkg / "manifest.json")
        if app_data:
            cfg.settings["manifest_version"] = app_data.get("manifestVersion", "")
            cfg.settings["app_name"] = (app_data.get("name", {}) or {}).get("short", "")

        # ai-plugin.json — function definitions
        plugin_data = _read_json(app_pkg / "ai-plugin.json") or _read_json(app_pkg / "apiPlugin.json")
        if plugin_data:
            cfg.features["api_plugin"] = True
            cfg.settings["plugin_name"] = plugin_data.get("name_for_human", "")
            fns = plugin_data.get("functions", [])
            if isinstance(fns, list) and fns:
                fn_defs = [
                    {"name": fn.get("name", ""), "description": (fn.get("description", "") or "")[:100]}
                    for fn in fns if isinstance(fn, dict)
                ]
                cfg.settings["functions"] = fn_defs
                cfg.settings["function_count"] = len(fn_defs)
            runtimes = [rt for rt in plugin_data.get("runtimes", []) if isinstance(rt, dict)]
            if rt_types := sorted({rt.get("type", "") for rt in runtimes} - {""}):
                cfg.settings["runtime_types"] = rt_types
            if auth_types := sorted({rt["auth"]["type"] for rt in runtimes if isinstance(rt.get("auth"), dict) and rt["auth"].get("type")} - {""}):
                cfg.settings["auth_types"] = auth_types

    # ── Environment files ──────────────────────────────────────
    if (env_dir := root / "env").is_dir():
        if envs := sorted(f.name.replace(".env.", "") for f in safe_iterdir(env_dir) if f.name.startswith(".env.")):
            cfg.settings["environments"] = envs

    # ── Legacy .fx/ directory ──────────────────────────────────
    if (root / ".fx").is_dir():
        cfg.features["legacy_fx"] = True

    cfg.hints.extend(_generate_hints(cfg))
    return cfg if (cfg.settings or cfg.features) else None


# ─── Public API ─────────────────────────────────────────────────

# ─── Config parser registry (tool name → parser function) ────────
_CONFIG_PARSER_REGISTRY: dict[str, Callable] = {
    "vscode": _parse_vscode_config,
    "claude-code": _parse_claude_code_config,
    "claude-desktop": _parse_claude_desktop_config,
    "copilot": _parse_copilot_config,
    "copilot365": _parse_copilot365_config,
    "cursor": _parse_cursor_config,
    "codex-cli": _parse_codex_config,
    "windsurf": _parse_windsurf_config,
}


def collect_tool_configs(root: Path) -> list[ToolConfig]:
    """Collect config state from tools defined in tool-configs.yaml.

    Iterates YAML entries, dispatches to registered parsers.
    Tool names come from YAML keys. Safe — never raises.
    """
    tool_configs_yaml = load_tool_configs()
    configs = []
    for tool_name in tool_configs_yaml:
        parser = _CONFIG_PARSER_REGISTRY.get(tool_name)
        if parser is None:
            log.debug("No config parser registered for tool %s", tool_name)
            continue
        try:
            result = parser(root, tool=tool_name)
            if result:
                configs.append(result)
        except Exception:
            pass
    return configs
