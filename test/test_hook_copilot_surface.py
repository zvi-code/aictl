"""Copilot CLI, the desktop app and VS Code share one hook file, so a hook's
location cannot say which surface sent it. Every event used to land under
copilot-vscode."""

from __future__ import annotations

from contextlib import nullcontext

import psutil
import pytest

from aictl.dashboard import web_server
from aictl.dashboard.web_server import _copilot_surface, _copilot_surface_of_process, _tool_from_hook_source


class FakeProcess:
    def __init__(self, pid: int, name: str, cmdline: list[str], exe: str, parent: FakeProcess | None = None) -> None:
        self.pid = pid
        self._name, self._cmdline, self._exe, self._parent = name, cmdline, exe, parent

    def oneshot(self):
        return nullcontext()

    def ppid(self) -> int:
        return self._parent.pid if self._parent else 0

    def name(self) -> str:
        return self._name

    def cmdline(self) -> list[str]:
        return self._cmdline

    def exe(self) -> str:
        return self._exe

    def parent(self) -> FakeProcess | None:
        return self._parent


def _tree(monkeypatch: pytest.MonkeyPatch, *chain: FakeProcess) -> int:
    processes = {p.pid: p for p in chain}
    monkeypatch.setattr(psutil, "Process", lambda pid: processes[pid])
    return chain[0].pid


@pytest.mark.parametrize(
    "path",
    [
        "/Users/dev/Library/Application Support/Code/User/workspaceStorage/abc/GitHub.copilot-chat/t.jsonl",
        "C:\\Users\\dev\\AppData\\Roaming\\Code\\User\\workspaceStorage\\abc\\GitHub.copilot-chat\\t.jsonl",
    ],
)
def test_vscode_transcript_path_identifies_vscode(path: str) -> None:
    assert _copilot_surface({"transcript_path": path}) == "copilot-vscode"


def test_a_shell_is_walked_past_to_the_copilot_cli(monkeypatch: pytest.MonkeyPatch) -> None:
    cli = FakeProcess(20, "copilot", ["copilot"], "/opt/homebrew/bin/copilot")
    shell = FakeProcess(10, "zsh", ["zsh", "-c", "hook"], "/bin/zsh", parent=cli)
    assert _copilot_surface_of_process(_tree(monkeypatch, shell, cli)) == "copilot-cli"


def test_an_unrelated_process_tree_is_unknown(monkeypatch: pytest.MonkeyPatch) -> None:
    other = FakeProcess(10, "bash", ["bash"], "/bin/bash")
    assert _copilot_surface_of_process(_tree(monkeypatch, other)) == ""


def test_a_vanished_process_is_unknown_and_does_not_raise() -> None:
    assert _copilot_surface_of_process(2**22 + 12345) == ""


def test_shared_hook_source_uses_the_detected_surface(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(web_server, "_copilot_surface_of_process", lambda pid: "copilot-desktop")
    data = {"source": "root.vscode-user", "pid": 123}
    assert _tool_from_hook_source(data) == "copilot-desktop"


def test_shared_hook_source_without_evidence_stays_vscode() -> None:
    assert _tool_from_hook_source({"source": "root.vscode-user"}) == "copilot-vscode"
