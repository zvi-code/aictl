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
import platform
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

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
        if self.feature_groups:
            d["feature_groups"] = self.feature_groups
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
    return {f.stem for f in safe_iterdir(agents_dir) if f.suffix == ".plist"}


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
    mcp = _read_json(root / ".mcp.json")
    if mcp and "mcpServers" in mcp:
        cfg.mcp_servers = list(mcp["mcpServers"].keys())

    # VS Code extension check
    vscode_ext = Path.home() / ".vscode" / "extensions"
    cfg.extensions = [
        d.name for d in safe_iterdir(vscode_ext)
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


def _parse_claude_desktop_config(tool: str = "claude-desktop") -> ToolConfig | None:
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
    mcp = data.get("mcpServers", {})
    cfg.mcp_servers = list(mcp.keys())

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

    cfg.hints = _generate_hints(cfg)
    return cfg if (cfg.mcp_servers or cfg.features or cfg.settings or cfg.feature_groups) else None


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

    # ── Agent ───────────────────────────────────────────────────
    agent: dict = {}
    for key, label in (
        ("chat.agent.enabled",           "enabled"),
        ("chat.autopilot.enabled",       "autopilot"),
        ("chat.autoReply",               "autoReply"),
    ):
        v = get(key)
        if v is not None:
            agent[label] = v
    max_req = get("chat.agent.maxRequests")
    if max_req is not None:
        agent["maxRequests"] = max_req
    if agent:
        cfg.feature_groups["Agent"] = agent

    # ── Hooks ───────────────────────────────────────────────────
    hooks: dict = {}
    for key, label in (
        ("chat.useHooks",               "enabled"),
        ("chat.useClaudeHooks",         "claudeHooks"),
        ("chat.useCustomAgentHooks",    "customAgentHooks"),
    ):
        v = get(key)
        if v is not None:
            hooks[label] = v
    locs = get("chat.hookFilesLocations")
    if locs is not None:
        hooks["locations"] = locs
    if hooks:
        cfg.feature_groups["Hooks"] = hooks

    # ── Safety ──────────────────────────────────────────────────
    safety: dict = {}
    v = get("chat.tools.global.autoApprove")
    if v is not None:
        safety["globalAutoApprove"] = v
    v = get("chat.tools.terminal.sandbox.enabled")
    if v is not None:
        safety["terminalSandbox"] = v
    v = get("chat.tools.terminal.enableAutoApprove")
    if v is not None:
        safety["terminalAutoApprove"] = v
    v = get("chat.tools.terminal.autoApproveWorkspaceNpmScripts")
    if v is not None:
        safety["autoApproveNpmScripts"] = v
    if safety:
        cfg.feature_groups["Safety"] = safety

    # ── Context Files ───────────────────────────────────────────
    ctx: dict = {}
    for key, label in (
        ("chat.useClaudeMdFile",          "claudeMd"),
        ("chat.useAgentsMdFile",          "agentsMd"),
        ("chat.useNestedAgentsMdFiles",   "nestedAgentsMd"),
        ("chat.includeApplyingInstructions", "applyingInstructions"),
    ):
        v = get(key)
        if v is not None:
            ctx[label] = v
    if ctx:
        cfg.feature_groups["Context Files"] = ctx

    # ── File Locations (non-default only) ───────────────────────
    locs_group: dict = {}
    for key, label in (
        ("chat.instructionsFilesLocations", "instructions"),
        ("chat.agentFilesLocations",        "agents"),
        ("chat.agentSkillsLocations",       "skills"),
        ("chat.promptFilesLocations",       "prompts"),
    ):
        v = get(key)
        if v is not None:
            locs_group[label] = v
    if locs_group:
        cfg.feature_groups["File Locations"] = locs_group

    # ── MCP ─────────────────────────────────────────────────────
    mcp: dict = {}
    for key, label in (
        ("chat.mcp.access",            "access"),
        ("chat.mcp.autostart",         "autostart"),
    ):
        v = get(key)
        if v is not None:
            mcp[label] = v
    v = get("chat.mcp.discovery.enabled")
    if v is not None:
        mcp["discovery"] = v
    if mcp:
        cfg.feature_groups["MCP"] = mcp

    # ── OTel ────────────────────────────────────────────────────
    cfg.otel = _detect_otel_from_vscode_settings(vscode_settings)

    return cfg  # always show if VS Code is installed


def _parse_copilot_config(root: Path, tool: str = "copilot") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

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
    agent_autofix = vscode_settings.get("github.copilot.chat.agent.autoFix")
    if agent_autofix is not None:
        cfg.features["agent_autoFix"] = agent_autofix
    editor_ctx = vscode_settings.get("github.copilot.chat.agent.currentEditorContext.enabled")
    if editor_ctx is not None:
        cfg.features["agent_editorContext"] = editor_ctx
    large_results_disk = vscode_settings.get("github.copilot.chat.agent.largeToolResultsToDisk.enabled")
    if large_results_disk is not None:
        cfg.features["agent_largeResultsToDisk"] = large_results_disk
    history_mode = vscode_settings.get("github.copilot.chat.agentHistorySummarizationMode")
    if history_mode is not None:
        cfg.settings["agent_historySummarizationMode"] = history_mode

    # Debug logging (enables /troubleshoot)
    debug_log = vscode_settings.get("github.copilot.chat.agentDebugLog.enabled")
    if debug_log is not None:
        cfg.features["agentDebugLog"] = debug_log
    debug_file = vscode_settings.get("github.copilot.chat.agentDebugLog.fileLogging.enabled")
    if debug_file is not None:
        cfg.features["agentDebugLog_fileLogging"] = debug_file
    req_logger = vscode_settings.get("github.copilot.chat.debug.requestLogger.maxEntries")
    if req_logger is not None:
        cfg.settings["debug_requestLoggerMaxEntries"] = req_logger

    # Memory
    local_mem = vscode_settings.get("github.copilot.chat.tools.memory.enabled")
    if local_mem is not None:
        cfg.features["local_memory"] = local_mem
    github_mem = vscode_settings.get("github.copilot.chat.copilotMemory.enabled")
    if github_mem is not None:
        cfg.features["github_memory"] = github_mem

    # Tool capabilities
    view_image = vscode_settings.get("github.copilot.chat.tools.viewImage.enabled")
    if view_image is not None:
        cfg.features["tool_viewImage"] = view_image

    # Claude agent in VS Code
    claude_agent = vscode_settings.get("github.copilot.chat.claudeAgent.enabled")
    if claude_agent is not None:
        cfg.features["claude_agent"] = claude_agent

    # CLI mode (agent runs autonomously)
    cli_mcp = vscode_settings.get("github.copilot.chat.cli.mcp.enabled")
    if cli_mcp is not None:
        cfg.features["cli_mcp"] = cli_mcp
    cli_isolation = vscode_settings.get("github.copilot.chat.cli.isolationOption.enabled")
    if cli_isolation is not None:
        cfg.features["cli_worktreeIsolation"] = cli_isolation
    cli_autocommit = vscode_settings.get("github.copilot.chat.cli.autoCommit.enabled")
    if cli_autocommit is not None:
        cfg.features["cli_autoCommit"] = cli_autocommit
    cli_branch = vscode_settings.get("github.copilot.chat.cli.branchSupport.enabled")
    if cli_branch is not None:
        cfg.features["cli_branchSupport"] = cli_branch

    # Hooks
    use_hooks = vscode_settings.get("chat.useHooks")
    if use_hooks is not None:
        cfg.features["hooks_enabled"] = use_hooks
    use_claude_hooks = vscode_settings.get("chat.useClaudeHooks")
    if use_claude_hooks is not None:
        cfg.features["hooks_claude"] = use_claude_hooks
    use_agent_hooks = vscode_settings.get("chat.useCustomAgentHooks")
    if use_agent_hooks is not None:
        cfg.features["hooks_custom_agent"] = use_agent_hooks
    hook_locations = vscode_settings.get("chat.hookFilesLocations")
    if hook_locations is not None:
        cfg.settings["hookFilesLocations"] = hook_locations

    # Autopilot / auto-approve (security-relevant)
    autopilot = vscode_settings.get("chat.autopilot.enabled")
    if autopilot is not None:
        cfg.features["autopilot"] = autopilot
    global_auto = vscode_settings.get("chat.tools.global.autoApprove")
    if global_auto is not None:
        cfg.features["global_autoApprove"] = global_auto
    auto_reply = vscode_settings.get("chat.autoReply")
    if auto_reply is not None:
        cfg.features["autoReply"] = auto_reply
    for auto_key in ("chat.tools.terminal.autoApprove",
                      "chat.tools.edits.autoApprove",
                      "chat.tools.urls.autoApprove"):
        val = vscode_settings.get(auto_key)
        if val is not None:
            cfg.features[auto_key.split(".")[-1]] = val

    # Sandbox settings
    sandbox = vscode_settings.get("chat.tools.terminal.sandbox.enabled")
    if sandbox is not None:
        cfg.features["terminal_sandbox"] = sandbox

    # Plugins
    plugins_enabled = vscode_settings.get("chat.plugins.enabled")
    if plugins_enabled is not None:
        cfg.features["plugins"] = plugins_enabled

    # Parent repo discovery (monorepo)
    parent_repo = vscode_settings.get("chat.useCustomizationsInParentRepositories")
    if parent_repo is not None:
        cfg.features["parent_repo_discovery"] = parent_repo

    # Context file loading
    for ctx_key, feat_key in (
        ("chat.useClaudeMdFile",        "ctx_claudeMd"),
        ("chat.useAgentsMdFile",        "ctx_agentsMd"),
        ("chat.useNestedAgentsMdFiles", "ctx_nestedAgentsMd"),
    ):
        val = vscode_settings.get(ctx_key)
        if val is not None:
            cfg.features[feat_key] = val

    # Anthropic / Claude-specific settings (when using Claude model via Copilot)
    anth_thinking_tokens = vscode_settings.get("github.copilot.chat.anthropic.thinking.budgetTokens")
    if anth_thinking_tokens is not None:
        cfg.settings["anthropic_thinkingBudget"] = anth_thinking_tokens
    anth_thinking_effort = vscode_settings.get("github.copilot.chat.anthropic.thinking.effort")
    if anth_thinking_effort is not None:
        cfg.settings["anthropic_thinkingEffort"] = anth_thinking_effort
    anth_websearch = vscode_settings.get("github.copilot.chat.anthropic.tools.websearch.enabled")
    if anth_websearch is not None:
        cfg.features["anthropic_websearch"] = anth_websearch
    anth_skip_perms = vscode_settings.get("github.copilot.chat.claudeAgent.allowDangerouslySkipPermissions")
    if anth_skip_perms is not None:
        cfg.features["claudeAgent_skipPermissions"] = anth_skip_perms
    agent_temperature = vscode_settings.get("github.copilot.chat.agent.temperature")
    if agent_temperature is not None:
        cfg.settings["agent_temperature"] = agent_temperature

    # MCP access control
    mcp_access = vscode_settings.get("chat.mcp.access")
    if mcp_access is not None:
        cfg.settings["mcp_access"] = mcp_access
    mcp_discovery = vscode_settings.get("chat.mcp.discovery.enabled")
    if mcp_discovery is not None:
        cfg.features["mcp_discovery"] = mcp_discovery

    # Custom file locations (non-default paths for instructions/agents/skills)
    for loc_key in ("chat.instructionsFilesLocations",
                     "chat.agentFilesLocations",
                     "chat.agentSkillsLocations",
                     "chat.promptFilesLocations"):
        val = vscode_settings.get(loc_key)
        if val:
            cfg.settings[loc_key.split(".")[-1]] = val

    # Model overrides
    plan_model = vscode_settings.get("chat.planAgent.defaultModel")
    if plan_model:
        cfg.settings["planModel"] = plan_model
    impl_model = vscode_settings.get("github.copilot.chat.implementAgent.model")
    if impl_model:
        cfg.settings["implementModel"] = impl_model

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
    cfg.extensions = [
        d.name for d in safe_iterdir(vscode_ext)
        if d.is_dir() and "copilot" in d.name.lower()
    ]

    # ── MCP config (check all locations) ────────────────────────
    mcp_sources = [
        vscode_user_dir() / "mcp.json",           # user-profile MCP
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

    # Feature groups for structured display
    session = {}
    if cfg.features.get("claude_agent") is not None:
        session["claudeTarget"] = cfg.features["claude_agent"]
    if cfg.features.get("autopilot") is not None:
        session["autopilot"] = cfg.features["autopilot"]
    if session:
        cfg.feature_groups["Session Targets"] = session

    agent = {}
    if cfg.features.get("agent_mode") is not None:
        agent["enabled"] = cfg.features["agent_mode"]
    if cfg.settings.get("agent_maxRequests") is not None:
        agent["maxRequests"] = cfg.settings["agent_maxRequests"]
    for k in ("agent_autoFix", "agent_editorContext", "agent_largeResultsToDisk"):
        if cfg.features.get(k) is not None:
            agent[k.replace("agent_", "")] = cfg.features[k]
    if cfg.settings.get("agent_historySummarizationMode") is not None:
        agent["historySummarizationMode"] = cfg.settings["agent_historySummarizationMode"]
    if cfg.features.get("plugins") is not None:
        agent["plugins"] = cfg.features["plugins"]
    if agent:
        cfg.feature_groups["Agent Mode"] = agent

    debug = {}
    if cfg.features.get("agentDebugLog") is not None:
        debug["enabled"] = cfg.features["agentDebugLog"]
    if cfg.features.get("agentDebugLog_fileLogging") is not None:
        debug["fileLogging"] = cfg.features["agentDebugLog_fileLogging"]
    if cfg.settings.get("debug_requestLoggerMaxEntries") is not None:
        debug["requestLoggerMaxEntries"] = cfg.settings["debug_requestLoggerMaxEntries"]
    if debug:
        cfg.feature_groups["Debug Logging"] = debug

    memory = {}
    if cfg.features.get("local_memory") is not None:
        memory["local"] = cfg.features["local_memory"]
    if cfg.features.get("github_memory") is not None:
        memory["github"] = cfg.features["github_memory"]
    if cfg.features.get("tool_viewImage") is not None:
        memory["viewImage"] = cfg.features["tool_viewImage"]
    if memory:
        cfg.feature_groups["Memory & Tools"] = memory

    cli = {}
    for k in ("cli_mcp", "cli_worktreeIsolation", "cli_autoCommit", "cli_branchSupport"):
        if cfg.features.get(k) is not None:
            cli[k.replace("cli_", "")] = cfg.features[k]
    if cli:
        cfg.feature_groups["CLI Mode"] = cli

    hooks = {}
    for k, label in (
        ("hooks_enabled",      "enabled"),
        ("hooks_claude",       "claudeHooks"),
        ("hooks_custom_agent", "customAgentHooks"),
    ):
        if cfg.features.get(k) is not None:
            hooks[label] = cfg.features[k]
    if cfg.settings.get("hookFilesLocations") is not None:
        hooks["locations"] = cfg.settings["hookFilesLocations"]
    if hooks:
        cfg.feature_groups["Hooks"] = hooks

    safety = {}
    for k in ("autoApprove", "terminal_sandbox"):
        if cfg.features.get(k) is not None:
            safety[k] = cfg.features[k]
    if cfg.features.get("global_autoApprove") is not None:
        safety["globalAutoApprove"] = cfg.features["global_autoApprove"]
    if cfg.features.get("autoReply") is not None:
        safety["autoReply"] = cfg.features["autoReply"]
    if safety:
        cfg.feature_groups["Safety"] = safety

    ctx = {}
    for k, label in (
        ("ctx_claudeMd",      "claudeMd"),
        ("ctx_agentsMd",      "agentsMd"),
        ("ctx_nestedAgentsMd","nestedAgentsMd"),
    ):
        if cfg.features.get(k) is not None:
            ctx[label] = cfg.features[k]
    if ctx:
        cfg.feature_groups["Context Files"] = ctx

    anthropic = {}
    if cfg.settings.get("anthropic_thinkingBudget") is not None:
        anthropic["thinkingBudget"] = cfg.settings["anthropic_thinkingBudget"]
    if cfg.settings.get("anthropic_thinkingEffort") is not None:
        anthropic["thinkingEffort"] = cfg.settings["anthropic_thinkingEffort"]
    if cfg.settings.get("agent_temperature") is not None:
        anthropic["temperature"] = cfg.settings["agent_temperature"]
    if cfg.features.get("anthropic_websearch") is not None:
        anthropic["webSearch"] = cfg.features["anthropic_websearch"]
    if cfg.features.get("claudeAgent_skipPermissions") is not None:
        anthropic["skipPermissions"] = cfg.features["claudeAgent_skipPermissions"]
    if anthropic:
        cfg.feature_groups["Claude (Anthropic)"] = anthropic

    cfg.hints = _generate_hints(cfg)
    return cfg if (cfg.settings or cfg.extensions or cfg.features or cfg.otel.enabled or cfg.feature_groups) else None


def _parse_cursor_config(root: Path, tool: str = "cursor") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

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
    cfg.extensions = [
        d.name for d in safe_iterdir(cursor_ext)
        if d.is_dir() and any(x in d.name.lower() for x in ("copilot", "claude", "ai"))
    ][:10]

    cfg.hints = _generate_hints(cfg)
    return cfg if (cfg.settings or cfg.mcp_servers) else None


def _parse_codex_config(tool: str = "codex-cli") -> ToolConfig | None:
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

    cfg.hints = _generate_hints(cfg)
    return cfg if (cfg.model or cfg.features) else None


def _parse_windsurf_config(root: Path, tool: str = "windsurf") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

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


# ─── Microsoft 365 Copilot (Teams Toolkit / M365 Agents) ────────


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
                    if data.get("provision"):
                        cfg.features["provision"] = True
                    if data.get("deploy"):
                        cfg.features["deploy"] = True
                    if data.get("publish"):
                        cfg.features["publish"] = True
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
                    if low in ("websearch", "web_search"):
                        cfg.features["web_search"] = True
                    elif low in ("codeinterpreter", "code_interpreter"):
                        cfg.features["code_interpreter"] = True
                    elif low in ("graphconnectors", "graph_connectors"):
                        items = [c for c in caps if isinstance(c, dict) and c.get("name", "").lower().replace(" ", "") == "graphconnectors"]
                        ids = []
                        for item in items:
                            for conn in item.get("connections", []):
                                if isinstance(conn, dict) and conn.get("connection_id"):
                                    ids.append(conn["connection_id"])
                        if ids:
                            cfg.settings["graph_connector_ids"] = ids
                        cfg.features["graph_connectors"] = True
                    elif low in ("graphskills", "graph_skills"):
                        cfg.features["graph_skills"] = True
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
                fn_defs = []
                for fn in fns:
                    if not isinstance(fn, dict):
                        continue
                    fn_defs.append({
                        "name": fn.get("name", ""),
                        "description": (fn.get("description", "") or "")[:100],
                    })
                cfg.settings["functions"] = fn_defs
                cfg.settings["function_count"] = len(fn_defs)
            runtimes = plugin_data.get("runtimes", [])
            if isinstance(runtimes, list):
                rt_types = set()
                auth_types = set()
                for rt in runtimes:
                    if not isinstance(rt, dict):
                        continue
                    rt_types.add(rt.get("type", ""))
                    auth = rt.get("auth", {})
                    if isinstance(auth, dict) and auth.get("type"):
                        auth_types.add(auth["type"])
                if rt_types:
                    cfg.settings["runtime_types"] = sorted(rt_types - {""})
                if auth_types:
                    cfg.settings["auth_types"] = sorted(auth_types - {""})

    # ── Environment files ──────────────────────────────────────
    env_dir = root / "env"
    if env_dir.is_dir():
        envs = [f.name.replace(".env.", "") for f in safe_iterdir(env_dir) if f.name.startswith(".env.")]
        if envs:
            cfg.settings["environments"] = sorted(envs)

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
            import inspect
            sig = inspect.signature(parser)
            kwargs: dict = {"tool": tool_name}
            if "root" in sig.parameters:
                kwargs["root"] = root
            result = parser(**kwargs)
            if result:
                configs.append(result)
        except Exception:
            pass
    return configs
