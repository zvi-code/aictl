"""Platform-specific path resolution for AI tool config directories.

Centralises all OS-conditional logic so the rest of the codebase stays clean.
Supports macOS, Windows, and Linux for every tool.
"""

from __future__ import annotations

import os
import platform
from pathlib import Path

_SYSTEM = platform.system()  # "Darwin" | "Windows" | "Linux"


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
