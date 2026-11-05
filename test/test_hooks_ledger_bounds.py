# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The mutation ledger stays bounded, and removal does not depend on what it still holds."""

from __future__ import annotations

import ast
import json
import sys
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl import hook_removal, mutation_ledger
from aictl.commands import integrations as ig
from aictl.commands.disable import disable


@pytest.fixture
def ledger(tmp_path, monkeypatch):
    path = tmp_path / "mutation-log.jsonl"
    monkeypatch.setattr(mutation_ledger, "_ledger_path", lambda: path)
    monkeypatch.setattr(mutation_ledger, "_MAX_LEDGER_BYTES", 2000)
    return path


def _sizes(path: Path) -> int:
    return sum(p.stat().st_size for p in path.parent.glob(path.name + "*"))


def test_rewriting_identical_bytes_is_not_a_mutation(ledger):
    mutation_ledger.record("deploy", Path("/x"), "modify", b"same", b"same")
    assert not ledger.exists()
    mutation_ledger.record("deploy", Path("/x"), "modify", b"old", b"new")
    assert len(mutation_ledger.all_entries()) == 1


def test_total_size_stays_bounded_over_many_writes(ledger):
    for i in range(2000):
        mutation_ledger.record("deploy", Path(f"/p/{i}"), "modify", b"a", b"b")
        assert _sizes(ledger) <= 2 * 2000 + 400
    assert ledger.with_name(ledger.name + ".1").exists()
    assert sorted(p.name for p in ledger.parent.iterdir()) == [ledger.name, ledger.name + ".1"]


def test_a_ledger_already_far_over_the_cap_is_trimmed_on_next_write(ledger):
    """The 8.1 MB ledger found in the field: renaming it would only move the problem."""
    line = json.dumps({"ts": "2026-01-01", "path": "/old", "op": "modify"}) + "\n"
    ledger.write_text(line * 100_000)
    assert ledger.stat().st_size > 1_000_000
    mutation_ledger.record("deploy", Path("/new"), "modify", b"a", b"b")
    assert _sizes(ledger) <= 2 * 2000 + 400
    # Whole lines only, and the newest entry is readable.
    entries = mutation_ledger.all_entries()
    assert entries[-1]["path"] == "/new"
    assert all(e["path"] in ("/old", "/new") for e in entries)


def test_readers_see_rotated_then_active_in_order(ledger):
    for i in range(40):
        mutation_ledger.record("c", Path(f"/p/{i}"), "modify", b"a", b"b")
    ledger.with_name(ledger.name + ".1").write_text(json.dumps({"path": "/rotated"}) + "\n")
    entries = mutation_ledger.all_entries()
    assert entries[0]["path"] == "/rotated"
    assert entries[-1]["path"] == "/p/39"


def test_record_never_raises_when_rotation_fails(ledger, monkeypatch):
    ledger.write_text("x" * 5000)

    def boom(_path):
        raise OSError("disk full")

    monkeypatch.setattr(mutation_ledger, "_rotate", boom)
    mutation_ledger.record("c", Path("/p"), "modify", b"a", b"b")  # must not raise


@pytest.fixture
def machine(tmp_path, monkeypatch):
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(home / ".config"))
    monkeypatch.setenv("SHELL", "/bin/zsh")
    monkeypatch.setattr(ig, "claude_global_dir", lambda: home / ".claude")
    monkeypatch.setattr(ig, "gemini_global_dir", lambda: home / ".gemini")
    monkeypatch.setattr(ig, "copilot_global_dir", lambda: home / ".copilot")
    monkeypatch.setattr(ig, "codex_global_dir", lambda: home / ".codex")
    vscode_dir = hook_removal.vscode_settings_paths(home)[0].parent
    monkeypatch.setattr(ig, "vscode_user_dir", lambda: vscode_dir)
    monkeypatch.setattr("aictl.commands.disable.vscode_user_dir", lambda: vscode_dir)
    monkeypatch.setattr(hook_removal, "_launchctl", lambda *a: None)
    monkeypatch.setattr(ig, "_run_env_persist", lambda *a: None)
    proj = tmp_path / "proj"
    proj.mkdir()
    monkeypatch.chdir(proj)
    (home / ".zshrc").write_text("# mine\n")
    return home


def _assert_clean(home: Path) -> None:
    for rel in (".claude/settings.json", ".gemini/settings.json"):
        assert "hooks" not in json.loads((home / rel).read_text())
    assert not (home / ".copilot" / "hooks" / "aictl.json").exists()
    assert not (home / ".config" / "aictl" / "env.sh").exists()
    assert (home / ".zshrc").read_text() == "# mine\n"
    assert (
        "[otel]" not in (home / ".codex" / "config.toml").read_text()
        if (home / ".codex" / "config.toml").exists()
        else True
    )
    vs = hook_removal.vscode_settings_paths(home)[0]
    assert not vs.exists() or "otlpEndpoint" not in vs.read_text()


@pytest.mark.parametrize("ledger_state", ["deleted", "rotated_away", "unrelated_entries", "corrupt"])
def test_disable_finds_everything_whatever_the_ledger_holds(machine, ledger_state, monkeypatch):
    monkeypatch.setattr(mutation_ledger, "_MAX_LEDGER_BYTES", 2000)
    runner = CliRunner()
    assert runner.invoke(ig.enable, ["--scope", "user"], catch_exceptions=False).exit_code == 0

    path = mutation_ledger._ledger_path()
    assert path.exists(), "enable records its writes"
    if ledger_state == "deleted":
        path.unlink()
    elif ledger_state == "rotated_away":
        for _ in range(100):  # enough to push the enable entries out of both files
            mutation_ledger.record("noise", Path("/elsewhere"), "modify", b"a", b"b")
        assert not any("settings.json" in e["path"] for e in mutation_ledger.all_entries())
    elif ledger_state == "unrelated_entries":
        path.write_text(json.dumps({"ts": "1", "path": "/elsewhere", "op": "modify"}) + "\n")
    else:
        path.write_bytes(b"\xff\xfenot json\n")

    result = runner.invoke(disable, [], catch_exceptions=False)
    assert result.exit_code == 0, result.output
    _assert_clean(machine)


def test_disable_does_not_read_the_ledger_to_plan():
    """Planning from the ledger is what rotation would silently break."""
    source = Path(sys.modules["aictl.commands.disable"].__file__).read_text(encoding="utf-8")
    tree = ast.parse(source)
    fn = next(n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == "disable")
    used = {n.attr for n in ast.walk(fn) if isinstance(n, ast.Attribute)}
    assert not used & {"all_entries", "since", "tail", "entries_for_path"}
