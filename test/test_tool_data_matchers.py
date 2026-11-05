"""Process-matcher guards using command lines observed on a real macOS machine (2026-11-05).

Two matchers consume processes-*.csv and they must agree:
  * monitoring.collectors.process.classify_process (case-insensitive, split on "|")
  * tools._discover_processes_csv (case-sensitive, whole regex on comm and args)
"""

from __future__ import annotations

import re
import sys

import pytest

from aictl.monitoring.collectors import process as proc_mod
from aictl.monitoring.session import ProcessInfo
from aictl.tools import get_registry

pytestmark = pytest.mark.skipif(sys.platform == "win32", reason="unix process table")

APPS = "/Applications"
HOME = "/Users/dev"
CD_CLAUDE = f"{HOME}/Library/Application Support/Claude/claude-code/2.1.317/91184d3d9ba3/claude.app/Contents/MacOS/claude"
CHATGPT = f"{APPS}/ChatGPT.app/Contents"
COPILOT_RT = f"{HOME}/Library/Caches/github-copilot-sdk/cli/copilot-sdk-runtime-1.0.102-0.unstable.rabc/copilot-runtime"

# (label, exe, extra argv after exe, expected tool or None)
CASES = [
    # --- Claude Desktop vs the Claude Code it bundles
    ("claude desktop main", f"{APPS}/Claude.app/Contents/MacOS/Claude", [], "claude-desktop"),
    ("claude desktop renderer", f"{APPS}/Claude.app/Contents/Frameworks/Claude Helper (Renderer).app/Contents/MacOS/Claude Helper (Renderer)",
     ["--type=renderer"], "claude-desktop"),
    ("claude desktop gpu", f"{APPS}/Claude.app/Contents/Frameworks/Claude Helper.app/Contents/MacOS/Claude Helper",
     ["--type=gpu-process"], "claude-desktop"),
    ("desktop-bundled claude", CD_CLAUDE, ["--output-format", "stream-json", "--verbose"], "claude-code"),
    ("desktop disclaimer wrapper", f"{APPS}/Claude.app/Contents/Helpers/disclaimer", ["--pgroup", "--", CD_CLAUDE], "claude-code"),
    ("vscode extension claude", f"{HOME}/.vscode/extensions/anthropic.claude-code-2.1.175-darwin-arm64/resources/native-binary/claude",
     ["--output-format", "stream-json"], "claude-code"),
    ("cli claude versioned binary", f"{HOME}/.local/share/claude/versions/2.1.299", ["claude"], "claude-code"),
    # --- Codex: the desktop app is ChatGPT.app and bundles its own codex
    ("codex desktop main", f"{CHATGPT}/MacOS/ChatGPT", [], "codex-desktop"),
    ("codex desktop renderer",
     f"{CHATGPT}/Frameworks/Codex Framework.framework/Versions/156.0.8078.48/Helpers/Codex (Renderer).app/Contents/MacOS/Codex (Renderer)",
     ["--type=renderer"], "codex-desktop"),
    ("codex desktop service",
     f"{CHATGPT}/Frameworks/Codex Framework.framework/Versions/156.0.8078.48/Helpers/Codex (Service).app/Contents/MacOS/Codex (Service)",
     ["--type=gpu-process"], "codex-desktop"),
    ("codex app-server", f"{CHATGPT}/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
     ["-c", "features.code_mode_host=true", "app-server"], "codex-desktop"),
    ("codex exec-server", f"{CHATGPT}/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
     ["-c", 'forced_login_method="chatgpt"', "exec-server"], "codex-desktop"),
    ("codex code-mode-host", f"{CHATGPT}/Resources/codex-cli/bin/codex-code-mode-host", [], "codex-desktop"),
    ("codex computer use", f"{HOME}/.codex/computer-use/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService", [], "codex-desktop"),
    ("codex chrome native host",
     f"{HOME}/.codex/plugins/cache/openai-bundled/chrome/latest/extension-host/macos/arm64/ChatGPT for Chrome",
     ["chrome-extension://abc/"], "codex-desktop"),
    ("codex sparkle updater", f"{CHATGPT}/Frameworks/Sparkle.framework/Versions/B/Autoupdate", ["com.openai.codex", HOME], "codex-desktop"),
    ("codex cli via npm node wrapper", "/opt/homebrew/Cellar/node/25.0/bin/node", ["/opt/homebrew/bin/codex", "exec"], "codex-cli"),
    ("codex cli native binary",
     "/opt/homebrew/lib/node_modules/@openai/codex/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/codex/codex",
     ["exec"], "codex-cli"),
    # --- Copilot: desktop app, VS Code runtime, CLI
    ("copilot desktop main", f"{APPS}/GitHub Copilot.app/Contents/MacOS/github", ["--restart-handoff-token=x"], "copilot-desktop"),
    ("copilot desktop runtime", COPILOT_RT, ["--server", "--stdio", "--no-auto-update"], "copilot-desktop"),
    ("copilot desktop computer-use mcp", f"{APPS}/GitHub Copilot.app/Contents/Resources/plugins/computer-use/computer-use-mcp", [], "copilot-desktop"),
    ("copilot desktop plugin mcp", "/opt/homebrew/bin/node", [f"{HOME}/.copilot/installed-plugins/awesome-copilot/mobile-canvas/scripts/mcp.mjs"],
     "copilot-desktop"),
    ("vscode copilot runtime",
     f"{APPS}/Visual Studio Code.app/Contents/Resources/app/node_modules.asar.unpacked/@github/copilot-sdk-darwin-arm64/prebuilds/darwin-arm64/copilot-runtime",
     ["--headless", "--stdio"], "copilot-vscode"),
    ("copilot cli via npm node loader", "/opt/homebrew/bin/node", ["/opt/homebrew/bin/copilot"], "copilot-cli"),
    # --- Gemini CLI runs as a node bundle, process name is "node"
    ("gemini cli", "/opt/homebrew/bin/node", ["/opt/homebrew/bin/gemini"], "gemini-cli"),
    ("gemini cli bundle", "/opt/homebrew/bin/node", ["/opt/homebrew/lib/node_modules/@google/gemini-cli/bundle/gemini.js"], "gemini-cli"),
    # --- Cursor CLI
    ("cursor-agent", "/opt/homebrew/bin/node", [f"{HOME}/.local/share/cursor-agent/versions/2026.06.15-18-00-12-6f5a2cf/index.js"], "cursor"),
    # --- False positives: the tool name only appears in a path or argument
    ("editor opening claude file", "/usr/bin/vim", [f"{HOME}/notes/claude-notes.md"], None),
    ("macOS CursorUIViewService", "/System/Library/PrivateFrameworks/TextInputUIMacHelper.framework/Versions/A/XPCServices/CursorUIViewService.xpc/Contents/MacOS/CursorUIViewService", [], None),
    ("grep for codex", "/usr/bin/grep", ["-r", "codex", "README.md"], None),
    ("git in a gemini named dir", "/usr/bin/git", ["-C", f"{HOME}/Projects/gemini-notes", "status"], None),
    ("ssh to host called copilot", "/usr/bin/ssh", ["copilot-box"], None),
    ("unrelated electron app", f"{APPS}/Grok Bot.app/Contents/Frameworks/Grok Bot Helper (Renderer).app/Contents/MacOS/Grok Bot Helper (Renderer)",
     ["--type=renderer"], None),
]


def _info(exe: str, argv: list[str]) -> ProcessInfo:
    name = exe.rsplit("/", 1)[-1]
    return ProcessInfo(pid=1, ppid=0, name=name, exe=exe, cmdline=tuple([exe, *argv]))


def _tools_py_match(exe: str, argv: list[str]) -> str | None:
    """Mirror of tools._discover_processes_csv matching (first row wins, case-sensitive)."""
    args = " ".join([exe, *argv])
    for spec in get_registry().process_specs():
        if spec.ps_grep_pattern and (re.search(spec.ps_grep_pattern, exe) or re.search(spec.ps_grep_pattern, args)):
            return spec.ai_tool
    return None


@pytest.fixture(autouse=True)
def _fresh_patterns(monkeypatch):
    monkeypatch.setattr(proc_mod, "_CSV_PATTERNS", None)


@pytest.mark.parametrize("label,exe,argv,expected", CASES, ids=[c[0] for c in CASES])
def test_classify_process_uses_current_command_lines(label, exe, argv, expected):
    assert proc_mod.classify_process(_info(exe, argv)).tool == expected


@pytest.mark.parametrize("label,exe,argv,expected", CASES, ids=[c[0] for c in CASES])
def test_both_matchers_agree(label, exe, argv, expected):
    assert _tools_py_match(exe, argv) == expected
