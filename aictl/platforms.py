# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Platform-specific path resolution for AI tool config directories.

Centralises all OS-conditional logic so the rest of the codebase stays clean.
Supports macOS, Windows, and Linux for every tool.
"""

from __future__ import annotations

import os
import platform
from pathlib import Path

_SYSTEM = platform.system()  # "Darwin" | "Windows" | "Linux"
IS_WINDOWS = _SYSTEM == "Windows"
IS_MACOS = _SYSTEM == "Darwin"


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


# ── Claude Code ──────────────────────────────────────────────────

def claude_global_dir() -> Path:
    """~/.claude  (macOS/Linux)  |  %APPDATA%/Claude  (Windows)"""
    if _SYSTEM == "Windows":
        return Path(os.environ.get("APPDATA", Path.home())) / "Claude"
    return Path.home() / ".claude"


def claude_account_config() -> Path:
    """~/.claude.json  (macOS/Linux)  |  %APPDATA%/Claude/.claude.json  (Windows)"""
    if _SYSTEM == "Windows":
        return claude_global_dir() / ".claude.json"
    return Path.home() / ".claude.json"


def claude_projects_dir() -> Path:
    """Directory where Claude Code stores per-project memory."""
    return claude_global_dir() / "projects"


# ── GitHub Copilot ───────────────────────────────────────────────

def copilot_session_dir() -> Path:
    """Directory where Copilot agent sessions are stored."""
    if _SYSTEM == "Windows":
        return Path(os.environ.get("APPDATA", Path.home())) / "GitHub Copilot" / "session-state"
    return Path.home() / ".copilot" / "session-state"


# ── VS Code ──────────────────────────────────────────────────────

def vscode_user_dir() -> Path:
    """VS Code user settings directory."""
    if _SYSTEM == "Windows":
        return Path(os.environ.get("APPDATA", Path.home())) / "Code" / "User"
    if _SYSTEM == "Darwin":
        return Path.home() / "Library" / "Application Support" / "Code" / "User"
    # Linux (XDG)
    xdg = os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))
    return Path(xdg) / "Code" / "User"


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
    if _SYSTEM == "Windows":
        return Path(os.environ.get("APPDATA", Path.home())) / "Cursor" / "User"
    if _SYSTEM == "Darwin":
        return Path.home() / "Library" / "Application Support" / "Cursor" / "User"
    xdg = os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))
    return Path(xdg) / "Cursor" / "User"


# ── Windsurf / Codeium ───────────────────────────────────────────

def windsurf_global_dir() -> Path:
    """Windsurf / Codeium global config directory."""
    if _SYSTEM == "Windows":
        return Path(os.environ.get("APPDATA", Path.home())) / "Codeium" / "windsurf"
    if _SYSTEM == "Darwin":
        return Path.home() / ".codeium" / "windsurf"
    # Linux
    xdg = os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))
    return Path(xdg) / "Codeium" / "windsurf"


# ── GitHub CLI (gh) ─────────────────────────────────────────────

def gh_config_dir() -> Path:
    """GitHub CLI config directory (contains Copilot CLI auth + settings)."""
    if _SYSTEM == "Windows":
        return Path(os.environ.get("APPDATA", Path.home())) / "GitHub CLI"
    xdg = os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))
    return Path(xdg) / "gh"


# ── Codex CLI ─────────────────────────────────────────────────────

def codex_global_dir() -> Path:
    """Codex CLI global config directory."""
    return Path.home() / ".codex"


# ── Microsoft 365 / Teams Toolkit ───────────────────────────────

def teams_global_dir() -> Path:
    """Teams Toolkit global config directory."""
    if _SYSTEM == "Windows":
        return Path(os.environ.get("APPDATA", Path.home())) / "TeamsFx"
    if _SYSTEM == "Darwin":
        return Path.home() / "Library" / "Application Support" / "TeamsFx"
    xdg = os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))
    return Path(xdg) / "TeamsFx"


def m365agents_global_dir() -> Path:
    """M365 Agents Toolkit global config directory."""
    if _SYSTEM == "Windows":
        return Path(os.environ.get("APPDATA", Path.home())) / "M365AgentsToolkit"
    if _SYSTEM == "Darwin":
        return Path.home() / "Library" / "Application Support" / "M365AgentsToolkit"
    xdg = os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))
    return Path(xdg) / "M365AgentsToolkit"


# ── Azure Developer CLI (azd) ────────────────────────────────────

def azd_config_dir() -> Path:
    """Azure Developer CLI config directory."""
    if _SYSTEM == "Windows":
        return Path(os.environ.get("USERPROFILE", Path.home())) / ".azd"
    return Path.home() / ".azd"


# ── Azure AI / PromptFlow ────────────────────────────────────────

def promptflow_global_dir() -> Path:
    """PromptFlow global config directory."""
    if _SYSTEM == "Windows":
        return Path(os.environ.get("USERPROFILE", Path.home())) / ".promptflow"
    return Path.home() / ".promptflow"
