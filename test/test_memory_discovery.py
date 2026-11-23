"""Memory files are found for every project and every tool, by one discovery, from fixture trees."""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from aictl import platforms, tool_homes, tools
from aictl.file_inventory import FileInventory
from aictl.memory import _encode_project_path, claude_memory_files, claude_project_path
from aictl.orchestrator import SnapshotPersistence
from aictl.records import _is_sensitive_path
from aictl.state_file import StateFile
from aictl.stores.testing import MemoryWriter
from aictl.utils import norm_path


@pytest.fixture()
def home(tmp_path, monkeypatch):
    """A Claude Code home with its own folder, so no other home of this machine is read."""
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    monkeypatch.delenv("CLAUDE_CONFIG_DIR", raising=False)
    monkeypatch.delenv("CODEX_HOME", raising=False)
    monkeypatch.setattr(tool_homes, "homes", lambda tool=None: [
        tool_homes.ToolHome("claude", platforms.claude_global_dir(), "default")])
    tools._registry = None
    yield tmp_path
    tools._registry = None


def _project(home: Path, name: str, *, memory=("MEMORY.md", "topic.md"), cwd: str | None = None) -> Path:
    """A real project folder, and the Claude Code folder that keeps its memory."""
    work = home / "work" / name
    work.mkdir(parents=True)
    folder = platforms.claude_projects_dir() / _encode_project_path(str(work.resolve()))
    for file in memory:
        target = folder / "memory" / file
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(f"{name} {file}\n")
    if cwd is not None:
        (folder / "11111111-2222-3333-4444-555555555555.jsonl").write_text(
            json.dumps({"type": "user", "cwd": cwd}) + "\n")
    return work


def _write(path: Path, text: str = "memory\n") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return path


class TestEveryProjectIsFound:
    def test_every_projects_memory_folder_is_listed_with_its_project_folder(self, home):
        _project(home, "alpha")
        _project(home, "beta", memory=("MEMORY.md",))
        (platforms.claude_projects_dir() / "-no-memory-here").mkdir(parents=True)
        found = claude_memory_files()
        assert sorted((folder.name.rsplit("-", 1)[-1], file.name) for folder, file in found) == [
            ("alpha", "MEMORY.md"), ("alpha", "topic.md"), ("beta", "MEMORY.md")]

    def test_the_project_path_comes_from_the_working_folder_of_a_session(self, home):
        work = _project(home, "alpha", cwd=str(home / "elsewhere" / "alpha-checkout"))
        folder = platforms.claude_projects_dir() / _encode_project_path(str(work.resolve()))
        assert claude_project_path(folder) == str(home / "elsewhere" / "alpha-checkout")

    def test_the_project_path_is_read_back_from_the_folder_name_when_no_session_remains(self, home):
        work = _project(home, "my-app-v2")
        folder = platforms.claude_projects_dir() / _encode_project_path(str(work.resolve()))
        assert claude_project_path(folder) == str(work.resolve())

    def test_the_project_path_is_empty_when_nothing_tells_it(self, home):
        folder = platforms.claude_projects_dir() / "-gone-for-good"
        folder.mkdir(parents=True)
        assert claude_project_path(folder) == ""


class TestInventoryAndPanelUseOneDiscovery:
    def test_the_inventory_covers_every_project_with_the_real_project_path(self, home):
        alpha = _project(home, "alpha")
        beta = _project(home, "beta", memory=("MEMORY.md",))
        files = tools.memory_inventory_files()
        assert {(f.path, f.project) for f in files} == {
            (str(platforms.claude_projects_dir() / _encode_project_path(str(p.resolve())) / "memory" / name), str(p.resolve()))
            for p, name in ((alpha, "MEMORY.md"), (alpha, "topic.md"), (beta, "MEMORY.md"))}
        assert {(f.tool, f.kind, f.scope) for f in files} == {("claude-code", "memory", "project")}

    def test_the_agent_memory_panel_lists_the_same_claude_files_as_the_inventory(self, home):
        _project(home, "alpha")
        _project(home, "beta")
        root = _project(home, "gamma")
        panel = {e.file for e in tools.collect_agent_memory(root) if e.source == "claude-auto-memory"}
        inventory = {f.path for f in tools.memory_inventory_files()}
        assert panel == inventory and len(inventory) == 6

    def test_every_pass_of_the_sync_writes_one_row_per_file_and_reads_unchanged_files_once(self, home):
        _project(home, "alpha")
        _project(home, "beta")
        writer = MemoryWriter()
        inventory = FileInventory(writer, StateFile(home / "manifest.json"), keeps_text=lambda: True,
                                  sensitive=_is_sensitive_path)
        from aictl.dashboard.models import DashboardSnapshot

        persistence = SnapshotPersistence(None, writer, inventory)
        snap = DashboardSnapshot(timestamp=1.0, root=str(home), tools=[])
        persistence._sync_files(snap, now=1000)
        rows = writer.written("files")
        assert sorted((r["project"], os.path.basename(r["path"])) for r in rows) == [
            (str((home / "work" / "alpha").resolve()), "MEMORY.md"), (str((home / "work" / "alpha").resolve()), "topic.md"),
            (str((home / "work" / "beta").resolve()), "MEMORY.md"), (str((home / "work" / "beta").resolve()), "topic.md")]
        assert len(writer.written("file_history")) == 4
        persistence._sync_files(snap, now=1000 + 120)
        assert len(writer.written("files")) == 4 and len(writer.written("file_blobs")) == 4


class TestCopilotStorage:
    def _storage(self, home) -> Path:
        return platforms.copilot_global_storage()

    def test_agent_definitions_are_not_memory(self, home):
        storage = self._storage(home)
        _write(storage / "plan-agent.md", "plan\n")
        _write(storage / "explore-agent.md", "explore\n")
        _write(storage / "memory-tool" / "memories" / "notes.md", "a fact\n")
        entries = [e for e in tools.collect_agent_memory(home) if e.source.startswith("copilot")]
        by_source = {source: sorted(Path(e.file).name for e in entries if e.source == source)
                     for source in {e.source for e in entries}}
        assert by_source == {"copilot-memory": ["notes.md"],
                             "copilot-agent-definition": ["explore-agent.md", "plan-agent.md"]}

    def test_no_agent_definition_carries_a_memory_label(self):
        from aictl.dashboard.context_projection import _MEMORY_LABELS

        assert "memory" not in _MEMORY_LABELS["copilot-agent-definition"].lower()
        assert _MEMORY_LABELS["copilot-memory"] == "Copilot memory"
        assert "copilot-agent-memory" not in _MEMORY_LABELS


class TestFolderEntriesOfThePathTables:
    def _files(self, tool: str, kind: str = "memory") -> set[str]:
        root = Path.home() / "root"
        root.mkdir(exist_ok=True)
        found = tools.discover_all(root, tools=[tool])
        return {f.path for res in found for f in res.files if f.kind == kind}

    def test_codex_memories_are_inventoried_with_their_summaries(self, home):
        base = platforms.codex_global_dir() / "memories"
        wanted = {_write(base / name) for name in ("MEMORY.md", "memory_summary.md", "raw_memories.md")}
        wanted.add(_write(base / "rollout_summaries" / "one.md"))
        assert self._files("codex-cli") == {norm_path(str(p)) for p in wanted}

    def test_vscode_copilot_memory_tool_folders_are_inventoried(self, home):
        user = platforms.vscode_user_dir()
        wanted = {
            _write(user / "globalStorage" / "github.copilot-chat" / "memory-tool" / "memories" / "global.md"),
            _write(user / "workspaceStorage" / "abc123" / "GitHub.copilot-chat" / "memory-tool" / "memories" / "w.md"),
            _write(user / "workspaceStorage" / "def456" / "GitHub.copilot-chat" / "memory-tool" / "memories" / "sub" / "x.md"),
        }
        _write(user / "workspaceStorage" / "abc123" / "GitHub.copilot-chat" / "other" / "not-memory.md")
        assert self._files("copilot-vscode") == {norm_path(str(p)) for p in wanted}

    def test_claude_desktop_agent_memory_folders_are_inventoried(self, home):
        base = platforms.claude_desktop_dir() / "local-agent-mode-sessions" / "org-1" / "acct-1"
        wanted = {_write(base / "agent" / "memory" / "MEMORY.md"), _write(base / "agent" / "memory" / "fact.md"),
                  _write(base / "memory" / "memory" / "note.md")}
        _write(base / "rpm" / "plugin" / "skills" / "memory-management" / "SKILL.md")
        assert self._files("claude-desktop") == {norm_path(str(p)) for p in wanted}
