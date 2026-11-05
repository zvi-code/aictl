"""Both process matchers against the Windows table, with Windows-shaped command lines (simulated)."""

from __future__ import annotations

import re

import pytest

from aictl import tools as T
from aictl.monitoring.collectors import process as proc_mod
from aictl.monitoring.session import ProcessInfo

LOCAL = r"C:\Users\Dev\AppData\Local"
ROAMING = r"C:\Users\Dev\AppData\Roaming"
VSCODE = rf"{LOCAL}\Programs\Microsoft VS Code"
NODE = r"C:\Program Files\nodejs\node.exe"
SDK = r"node_modules.asar.unpacked\@github\copilot-sdk-win32-x64\prebuilds\win32-x64\copilot-runtime.exe"

CASES = [
    # Copilot CLI: winget, npm through node, shims, gh wrapper
    ("winget cli", rf"{LOCAL}\Microsoft\WinGet\Packages\GitHub.Copilot_Microsoft.Winget.Source_8wekyb3d8bbwe\copilot.exe", [], "copilot-cli"),
    ("winget link", rf"{LOCAL}\Microsoft\WinGet\Links\copilot.exe", [], "copilot-cli"),
    ("uppercase exe", rf"{LOCAL}\Tools\COPILOT.EXE", [], "copilot-cli"),
    ("npm via node", NODE, [rf"{ROAMING}\npm\node_modules\@github\copilot\npm-loader.js"], "copilot-cli"),
    ("npm platform binary", rf"{ROAMING}\npm\node_modules\@github\copilot-win32-x64\copilot.exe", [], "copilot-cli"),
    ("cmd shim", r"C:\Windows\System32\cmd.exe", ["/c", rf"{ROAMING}\npm\copilot.cmd"], "copilot-cli"),
    ("powershell shim", r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe", ["-File", rf"{ROAMING}\npm\copilot.ps1"], "copilot-cli"),
    ("gh wrapper", r"C:\Program Files\GitHub CLI\gh.exe", ["copilot", "suggest"], "copilot-cli"),
    # Copilot desktop app and its runtime
    ("desktop per-user", rf"{LOCAL}\Programs\GitHub Copilot\GitHub Copilot.exe", [], "copilot-desktop"),
    ("desktop per-machine", r"C:\Program Files\GitHub Copilot\github.exe", [], "copilot-desktop"),
    ("desktop runtime", rf"{LOCAL}\github-copilot-sdk\cli\copilot-sdk-runtime-1.0.102\copilot-runtime.exe", ["--server", "--stdio"], "copilot-desktop"),
    ("desktop plugin mcp", NODE, [r"C:\Users\Dev\.copilot\installed-plugins\canvas\scripts\mcp.mjs"], "copilot-desktop"),
    # VS Code
    ("vscode main", rf"{VSCODE}\Code.exe", [], "copilot-vscode"),
    ("vscode insiders", rf"{LOCAL}\Programs\Microsoft VS Code Insiders\Code - Insiders.exe", [], "copilot-vscode"),
    ("vscode copilot runtime", rf"{VSCODE}\resources\app\{SDK}", ["--headless", "--stdio"], "copilot-vscode"),
    ("copilot language server", NODE, [r"C:\Users\Dev\.vscode\extensions\github.copilot-1.0\dist\copilot-language-server.js"], "copilot-vscode"),
    # Microsoft 365 Copilot stays its own tool
    ("m365 app", r"C:\Program Files\WindowsApps\Microsoft.MicrosoftOfficeHub_19.2\M365Copilot.exe", [], "copilot365"),
    ("renamed Microsoft Copilot app", r"C:\Program Files\WindowsApps\Microsoft.Copilot_1.0_x64__8wekyb3d8bbwe\Copilot.exe", [], "copilot365"),
    # False positives
    ("file explorer", r"C:\Windows\explorer.exe", [], None),
    ("task manager", r"C:\Windows\System32\Taskmgr.exe", [], None),
    ("task host", r"C:\Windows\System32\taskhostw.exe", [], None),
    ("plain cmd", r"C:\Windows\System32\cmd.exe", ["/c", "dir"], None),
    ("plain powershell", r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe", ["-NoProfile", "-Command", "Get-Date"], None),
    ("plain pwsh", r"C:\Program Files\PowerShell\7\pwsh.exe", ["-NoProfile", "-Command", "Get-Date"], None),
    ("notes in a Copilot folder", r"C:\Windows\notepad.exe", [r"C:\Users\Dev\Documents\GitHub Copilot\notes.txt"], None),
    ("file named copilot", r"C:\Windows\notepad.exe", [r"C:\Users\Dev\copilot-notes.txt"], None),
    ("gh earlier in another word", r"C:\Tools\highlight.exe", [r"C:\src\copilot.md"], None),
    ("dev server", NODE, [r"C:\src\app\node_modules\vite\bin\vite.js"], None),
]


@pytest.fixture
def windows_registry(monkeypatch):
    monkeypatch.setattr(T, "CURRENT_PLATFORM", "windows")
    monkeypatch.setattr(T, "IS_WINDOWS", True)
    registry = T.Registry()
    monkeypatch.setattr(T, "get_registry", lambda: registry)
    monkeypatch.setattr(proc_mod, "_CSV_PATTERNS", None)
    return registry


def _base(exe: str) -> str:
    return exe.rsplit("\\", 1)[-1]


@pytest.mark.parametrize("label,exe,argv,expected", CASES, ids=[c[0] for c in CASES])
def test_classify_process(windows_registry, label, exe, argv, expected):
    info = ProcessInfo(pid=1, ppid=0, name=_base(exe), exe=exe, cmdline=(exe, *argv))
    assert proc_mod.classify_process(info).tool == expected


@pytest.mark.parametrize("label,exe,argv,expected", CASES, ids=[c[0] for c in CASES])
def test_discovery_matcher_agrees(windows_registry, label, exe, argv, expected):
    """Mirror of tools._discover_processes_csv: first row wins, case-insensitive on Windows."""
    comm, args = _base(exe), " ".join([exe, *argv])
    found = None
    for spec in windows_registry.process_specs():
        pattern = spec.ps_grep_pattern
        if pattern and (re.search(pattern, comm, re.I) or re.search(pattern, args, re.I)):
            found = spec.ai_tool
            break
    assert found == expected


def test_windows_rows_exist_for_every_copilot_surface(windows_registry):
    tools = {spec.ai_tool for spec in windows_registry.process_specs()}
    assert {"copilot-cli", "copilot-desktop", "copilot-vscode", "copilot365"} <= tools
