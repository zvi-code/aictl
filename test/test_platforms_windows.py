# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Windows config-dir resolution regression tests.

The home-dotfile CLI tools (Claude Code, Copilot CLI, Windsurf/Codeium, Gemini,
Codex) bundle a runtime that resolves ``$HOME`` via ``os.homedir()`` /
``UserHomeDir`` on every platform, so on Windows their config lives under
``%USERPROFILE%\\.<tool>`` — NOT under ``%APPDATA%``. Only genuinely
Windows-native editors (VS Code, Cursor) use ``%APPDATA%``.

These tests exercise the path-resolution functions with the Windows branch
forced on, so the regression is caught on macOS/Linux CI too.
"""

from __future__ import annotations

from pathlib import PureWindowsPath

import pytest

from aictl import platforms


@pytest.fixture()
def windows_env(monkeypatch):
    """Force the IS_WINDOWS branch and provide deterministic env dirs."""
    monkeypatch.setattr(platforms, "IS_WINDOWS", True)
    monkeypatch.setattr(platforms, "IS_MACOS", False)
    monkeypatch.setenv("USERPROFILE", r"C:\Users\dev")
    monkeypatch.setenv("APPDATA", r"C:\Users\dev\AppData\Roaming")


def _tail(path) -> str:
    """Return the path as a POSIX-style suffix for stable assertions."""
    return PureWindowsPath(str(path)).as_posix()


def test_claude_global_dir_uses_userprofile(windows_env):
    assert _tail(platforms.claude_global_dir()) == "C:/Users/dev/.claude"


def test_claude_account_config_uses_home(windows_env):
    # ~/.claude.json sits beside the .claude dir, under the user profile.
    assert _tail(platforms.claude_account_config()).endswith(".claude.json")
    assert "AppData/Roaming" not in _tail(platforms.claude_account_config())


def test_copilot_global_dir_uses_userprofile(windows_env):
    assert _tail(platforms.copilot_global_dir()) == "C:/Users/dev/.copilot"


def test_copilot_session_dir_uses_userprofile(windows_env):
    assert _tail(platforms.copilot_session_dir()) == "C:/Users/dev/.copilot/session-state"


def test_windsurf_global_dir_uses_userprofile(windows_env):
    assert _tail(platforms.windsurf_global_dir()) == "C:/Users/dev/.codeium/windsurf"


def test_gemini_global_dir_uses_userprofile(windows_env):
    assert _tail(platforms.gemini_global_dir()) == "C:/Users/dev/.gemini"


def test_vscode_user_dir_uses_appdata(windows_env):
    # VS Code is genuinely an %APPDATA% tool — must NOT move to the profile root.
    assert _tail(platforms.vscode_user_dir()) == "C:/Users/dev/AppData/Roaming/Code/User"


def test_cursor_user_dir_uses_appdata(windows_env):
    assert _tail(platforms.cursor_user_dir()) == "C:/Users/dev/AppData/Roaming/Cursor/User"


def test_cursor_home_dir_uses_userprofile(windows_env):
    # ~/.cursor (conversations.db, CLI state) is a home-dotfile dir, NOT %APPDATA%.
    assert _tail(platforms.cursor_home_dir()) == "C:/Users/dev/.cursor"
    assert "AppData/Roaming" not in _tail(platforms.cursor_home_dir())


def test_centralization_no_adhoc_os_detection():
    """OS detection must live in platforms.py — modules import the central flags.

    Guards against re-derivation drift (``os.name == 'nt'`` /
    ``sys.platform == 'win32'``) creeping back into modules that should
    consume :data:`platforms.IS_WINDOWS` / :data:`platforms.IS_MACOS`.
    """
    import pathlib

    root = pathlib.Path(platforms.__file__).resolve().parent
    offenders: list[str] = []
    allow = {"platforms.py"}  # platforms.py is the one place OS detection is defined
    patterns = ('os.name == "nt"', "sys.platform == \"win32\"", "sys.platform.startswith(\"win\")")
    for py in root.rglob("*.py"):
        if py.name in allow:
            continue
        text = py.read_text(encoding="utf-8")
        for pat in patterns:
            if pat in text:
                offenders.append(f"{py.relative_to(root)}: {pat}")
    assert not offenders, "ad-hoc OS detection found (use platforms.IS_WINDOWS/IS_MACOS):\n" + "\n".join(offenders)

