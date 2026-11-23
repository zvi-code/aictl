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
    # Docker Desktop is not OpenClaw: its own "docker-sandbox" plugin and Chromium "--enable-sandbox" helpers
    ("docker desktop sandbox plugin", f"{APPS}/Docker.app/Contents/Resources/cli-plugins/docker-sandbox", ["daemon", "start"], None),
    ("docker desktop network helper",
     f"{APPS}/Docker.app/Contents/MacOS/Docker Desktop.app/Contents/Frameworks/Docker Desktop Helper.app/Contents/MacOS/Docker Desktop Helper",
     ["--type=utility", "--service-sandbox-type=network", "--enable-sandbox"], None),
    ("docker desktop renderer",
     f"{APPS}/Docker.app/Contents/MacOS/Docker Desktop.app/Contents/Frameworks/Docker Desktop Helper (Renderer).app/Contents/MacOS/Docker Desktop Helper (Renderer)",
     ["--type=renderer", "--enable-sandbox"], None),
    ("docker run with a sandbox flag", "/usr/local/bin/docker", ["run", "--rm", "--security-opt", "sandbox=on", "alpine"], None),
    ("openclaw docker sandbox", "/usr/local/bin/docker", ["run", "--name", "openclaw-sandbox-main", "openclaw/sandbox"], "openclaw"),
    # Generic helper names started by hand, outside any tool's process tree, are not a tool
    ("vite by hand", "/opt/homebrew/bin/node", [f"{HOME}/app/node_modules/.bin/vite", "--port", "5173"], None),
    ("npx by hand", "/opt/homebrew/bin/node", ["/opt/homebrew/bin/npx", "create-next-app"], None),
    ("login shell", "/bin/bash", ["-l"], None),
    ("webpack by hand", "/opt/homebrew/bin/node", [f"{HOME}/app/node_modules/.bin/webpack", "--watch"], None),
    ("esbuild by hand", f"{HOME}/app/node_modules/@esbuild/darwin-arm64/bin/esbuild", ["--service=0.25.0"], None),
    ("next dev by hand", "/opt/homebrew/bin/node", [f"{HOME}/app/node_modules/.bin/next", "dev"], None),
    ("playwright test by hand", "/opt/homebrew/bin/node", [f"{HOME}/app/node_modules/.bin/playwright", "test"], None),
    ("mcp-remote by hand", "/opt/homebrew/bin/node", ["/opt/homebrew/bin/mcp-remote", "https://example.test/mcp"], None),
    ("python mcp server by hand", "/usr/bin/python3", ["-m", "mcp-server-fetch"], None),
    # A node MCP server with no tool above it is reported as an orphan, not as a tool
    ("orphan node mcp server", "/opt/homebrew/bin/node", [f"{HOME}/.npm/_npx/abc/node_modules/.bin/mcp-server-filesystem"], "any"),
]

MCP_SERVER = ("/opt/homebrew/bin/node", [f"{HOME}/.npm/_npx/abc/node_modules/.bin/mcp-server-filesystem", HOME])
VITE = ("/opt/homebrew/bin/node", [f"{HOME}/app/node_modules/.bin/vite"])
# (label, exe, argv, tool of the nearest known ancestor, expected tool)
TREE_CASES = [
    ("mcp server under cursor", *MCP_SERVER, "cursor", "cursor"),
    ("mcp server under claude code", *MCP_SERVER, "claude-code", "claude-code"),
    ("mcp server under claude desktop", *MCP_SERVER, "claude-desktop", "claude-desktop"),
    ("mcp server under copilot cli", *MCP_SERVER, "copilot-cli", "copilot-cli"),
    ("mcp server under gemini", *MCP_SERVER, "gemini-cli", "gemini-cli"),
    ("vite under claude code", *VITE, "claude-code", "claude-code"),
    ("login shell under claude code", "/bin/bash", ["-l"], "claude-code", "claude-code"),
    # A tool has no rule for this helper, so it is not labelled with another tool's rule
    ("vite under cursor", *VITE, "cursor", None),
    ("vite under codex", *VITE, "codex-cli", None),
    # A process that names its tool keeps that tool under any owner
    ("claude under vs code", f"{HOME}/.vscode/extensions/anthropic.claude-code-2.1.175-darwin-arm64/resources/native-binary/claude",
     [], "copilot-vscode", "claude-code"),
]


def _info(exe: str, argv: list[str], owner: str | None = None) -> ProcessInfo:
    name = exe.rsplit("/", 1)[-1]
    return ProcessInfo(pid=1, ppid=0, name=name, exe=exe, cmdline=tuple([exe, *argv]), owner_tool=owner)


def _tools_py_match(exe: str, argv: list[str], owner: str | None = None) -> str | None:
    """Mirror of tools._discover_processes_csv matching (first row wins, case-sensitive):
    rules that name the tool first, then the owner tool's rules for generic helper names."""
    args = " ".join([exe, *argv])
    specs = [s for s in get_registry().process_specs() if s.ps_grep_pattern]
    own = None
    for spec in specs:
        if spec.match_scope != "tree" and (re.search(spec.ps_grep_pattern, exe) or re.search(spec.ps_grep_pattern, args)):
            own = spec.ai_tool
            break
    if own not in (None, "any"):
        return own
    for spec in specs:
        if spec.match_scope == "tree" and spec.ai_tool == owner and (
            re.search(spec.ps_grep_pattern, exe) or re.search(spec.ps_grep_pattern, args)
        ):
            return spec.ai_tool
    return own


@pytest.fixture(autouse=True)
def _fresh_patterns(monkeypatch):
    monkeypatch.setattr(proc_mod, "_CSV_PATTERNS", None)


@pytest.mark.parametrize("label,exe,argv,expected", CASES, ids=[c[0] for c in CASES])
def test_classify_process_uses_current_command_lines(label, exe, argv, expected):
    assert proc_mod.classify_process(_info(exe, argv)).tool == expected


@pytest.mark.parametrize("label,exe,argv,expected", CASES, ids=[c[0] for c in CASES])
def test_both_matchers_agree(label, exe, argv, expected):
    assert _tools_py_match(exe, argv) == expected


@pytest.mark.parametrize("label,exe,argv,owner,expected", TREE_CASES, ids=[c[0] for c in TREE_CASES])
def test_generic_helper_takes_the_tool_of_its_process_tree(label, exe, argv, owner, expected):
    match = proc_mod.classify_process(_info(exe, argv, owner))
    assert match.tool == expected
    assert _tools_py_match(exe, argv, owner) == expected
    if exe in (MCP_SERVER[0], "/bin/bash"):
        # Found through its tool's tree: it never starts a tracked tree of its own.
        assert not match.root_candidate


def test_owner_tools_is_the_nearest_known_ancestor():
    from aictl.tools import owner_tools

    # 1 launchd, 10 Cursor, 11 terminal shell, 12 claude, 13 shell, 14 vite; 20 vite by hand
    parents = {1: 0, 10: 1, 11: 10, 12: 11, 13: 12, 14: 13, 20: 1, 30: 31, 31: 30}
    own = {10: "cursor", 12: "claude-code"}
    assert owner_tools(parents, own) == {11: "cursor", 12: "cursor", 13: "claude-code", 14: "claude-code"}


def test_discovery_reports_a_helper_only_under_its_tool(monkeypatch):
    """tools._discover_processes_csv: the same vite is Claude Code's under claude and nothing by hand."""
    import aictl.tools as tools_mod

    rows = [
        ("100", "0.0", "0", "claude", f"{HOME}/.local/share/claude/versions/2.1.299 claude"),
        ("101", "0.0", "0", "node", f"node {HOME}/app/node_modules/.bin/vite"),
        ("200", "0.0", "0", "node", f"node {HOME}/other/node_modules/.bin/vite"),
        ("300", "0.0", "0", "Cursor", f"{APPS}/Cursor.app/Contents/MacOS/Cursor"),
        ("301", "0.0", "0", "node", f"node {HOME}/.npm/_npx/abc/node_modules/.bin/mcp-server-filesystem"),
    ]
    monkeypatch.setattr(tools_mod, "_parse_ps_output", lambda: rows)
    monkeypatch.setattr(tools_mod, "_process_parents", lambda: {100: 1, 101: 100, 200: 1, 300: 1, 301: 300})
    monkeypatch.setattr(tools_mod, "_proc_stats", lambda pid, cpu, rss: (cpu, rss))
    results: dict = {}
    tools_mod._discover_processes_csv(get_registry(), results, None)
    found = {p.pid: tool for tool, res in results.items() for p in res.processes}
    assert found == {100: "claude-code", 101: "claude-code", 300: "cursor", 301: "cursor"}
