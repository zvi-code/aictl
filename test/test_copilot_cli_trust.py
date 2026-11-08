# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Copilot CLI skips `.github/hooks` in a folder it does not trust, and still reports the
hooks as run. aictl must say so loudly instead of reporting the project hooks as working."""

from __future__ import annotations

import json

import pytest

from aictl.commands import integrations


@pytest.fixture
def copilot_home(tmp_path, monkeypatch):
    home = tmp_path / "copilot"
    home.mkdir()
    monkeypatch.setenv("COPILOT_HOME", str(home))
    return home


def _trust(home, *folders):
    # Copilot writes config.json as JSON with comments.
    (home / "config.json").write_text(
        "// written by Copilot\n" + json.dumps({"trustedFolders": [str(f) for f in folders]})
    )


def test_a_folder_under_a_trusted_folder_is_trusted(copilot_home, tmp_path):
    _trust(copilot_home, tmp_path)
    assert integrations.copilot_cli_trusts(tmp_path / "proj" / "sub") is True
    assert integrations.copilot_cli_trusts(tmp_path) is True


def test_a_folder_outside_every_trusted_folder_is_not(copilot_home, tmp_path):
    _trust(copilot_home, tmp_path / "work")
    assert integrations.copilot_cli_trusts(tmp_path / "workspace") is False
    (copilot_home / "config.json").write_text("{}")
    assert integrations.copilot_cli_trusts(tmp_path) is False


def test_no_config_means_copilot_cli_is_not_set_up(copilot_home, tmp_path):
    assert integrations.copilot_cli_trusts(tmp_path) is None


def test_project_hooks_in_an_untrusted_folder_need_the_person(copilot_home, tmp_path, monkeypatch):
    proj = tmp_path / "proj"
    proj.mkdir()
    monkeypatch.chdir(proj)
    monkeypatch.setattr(integrations, "_would_be_committed", lambda _p: False)
    _trust(copilot_home, tmp_path / "elsewhere")
    actions: list[str] = []
    integrations._install_vscode_hooks("project", 8484, actions)
    assert (proj / ".github" / "hooks" / "aictl.json").is_file()
    needs = [a for a in actions if a.startswith(integrations.NEEDS_YOU)]
    assert len(needs) == 1 and "trustedFolders" in needs[0] and str(proj) in needs[0]
    # The config is the person's: aictl does not add the folder itself.
    assert json.loads((copilot_home / "config.json").read_text().split("\n", 1)[1])["trustedFolders"] == [
        str(tmp_path / "elsewhere")
    ]
    status = next(t for t in integrations._collect_hook_status("project")["tools"] if t["tool"] == "copilot")
    assert status["warnings"] and "does not trust" in status["warnings"][0]

    _trust(copilot_home, tmp_path)
    actions = []
    integrations._install_vscode_hooks("project", 8484, actions)
    assert not [a for a in actions if a.startswith(integrations.NEEDS_YOU)]
    status = next(t for t in integrations._collect_hook_status("project")["tools"] if t["tool"] == "copilot")
    assert status["warnings"] == []
