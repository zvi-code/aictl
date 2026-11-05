# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""``aictl hooks status`` / ``doctor`` report the real per-tool state, with the fixing command."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl import hook_removal
from aictl.commands import integrations as ig


@pytest.fixture
def home(tmp_path, monkeypatch):
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(home / ".config"))
    monkeypatch.delenv("AICTL_PORT", raising=False)
    monkeypatch.setattr(ig, "claude_global_dir", lambda: home / ".claude")
    monkeypatch.setattr(ig, "gemini_global_dir", lambda: home / ".gemini")
    monkeypatch.setattr(ig, "copilot_global_dir", lambda: home / ".copilot")
    monkeypatch.setattr(hook_removal, "_launchctl", lambda *a: None)
    monkeypatch.chdir(tmp_path)
    return home


def _status() -> tuple[int, dict]:
    result = CliRunner().invoke(ig.hooks, ["status", "--json"], catch_exceptions=False)
    return result.exit_code, json.loads(result.output)


def _tool(report: dict, name: str) -> dict:
    return next(t for t in report["tools"] if t["tool"] == name)


def _write_claude(home: Path, event: str, command: str) -> None:
    path = home / ".claude" / "settings.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    rule = {"_aictl_owner": "aictl.managed", "matcher": "", "hooks": [{"type": "command", "command": command}]}
    path.write_text(json.dumps({"hooks": {event: [rule]}}))


def test_nothing_registered_is_clean(home):
    code, report = _status()
    assert code == 0
    assert {t["state"] for t in report["tools"]} == {"not-registered"}
    assert report["leftovers"] == []


def test_registered_reports_all_tools(home):
    ig._install_hooks("user", 8484, [])
    code, report = _status()
    assert code == 0
    assert {t["tool"]: t["state"] for t in report["tools"]} == {
        "claude-code": "registered",
        "gemini-cli": "registered",
        "copilot": "registered",
    }
    assert _tool(report, "claude-code")["rules"] == len(ig.HOOK_EVENTS)
    assert _tool(report, "claude-code")["ports"] == [8484]


def test_missing_interpreter(home):
    _write_claude(home, "Stop", '"/gone/python" -I -S "/x/aictl/hook_handler.py" --event Stop --port 8484 || true')
    code, report = _status()
    claude = _tool(report, "claude-code")
    assert code == 1
    assert claude["state"] == "missing-interpreter"
    assert claude["fix"].startswith("aictl hooks install --scope user")
    assert "remove-hooks.py" in claude["fix"]


def test_stale_script_path(home, tmp_path):
    interp = __import__("sys").executable
    _write_claude(home, "Stop", f'"{interp}" -I -S "{tmp_path}/moved/hook_handler.py" --event Stop --port 8484 || true')
    code, report = _status()
    assert code == 1
    assert _tool(report, "claude-code")["state"] == "stale-path"


def test_invalid_event(home):
    script = Path(hook_removal.__file__).with_name("hook_handler.py")
    interp = __import__("sys").executable
    _write_claude(home, "NotAnEvent", f'"{interp}" -I -S "{script}" --event X --port 8484 || true')
    code, report = _status()
    assert code == 1
    assert _tool(report, "claude-code")["state"] == "invalid-event"


def test_host_changing_event_is_flagged(home):
    script = Path(hook_removal.__file__).with_name("hook_handler.py")
    interp = __import__("sys").executable
    _write_claude(home, "WorktreeCreate", f'"{interp}" -I -S "{script}" --event W --port 8484 || true')
    code, report = _status()
    assert code == 1
    assert _tool(report, "claude-code")["state"] == "invalid-event"


def test_port_mismatch_gives_the_exact_command(home, monkeypatch):
    ig._install_hooks("user", 9000, [])
    code, report = _status()
    claude = _tool(report, "claude-code")
    assert code == 1
    assert claude["state"] == "port-mismatch"
    assert claude["fix"] == "aictl hooks install --scope user --port 8484"


def test_old_command_form_is_not_called_healthy(home):
    interp = __import__("sys").executable
    _write_claude(home, "Stop", f'"{interp}" -m aictl.hook_handler --event Stop --port 8484')
    code, report = _status()
    assert code == 1
    assert _tool(report, "claude-code")["state"] == "old-form"


def test_corrupt_file_is_reported_not_read_as_empty(home):
    path = home / ".claude" / "settings.json"
    path.parent.mkdir(parents=True)
    path.write_text("{broken")
    code, report = _status()
    assert code == 1
    claude = _tool(report, "claude-code")
    assert claude["state"] == "corrupt"
    assert str(path) in claude["fix"]


def test_partial_install(home):
    ig._register_hook_file(ig._settings_path("user"), ig._build_hook_config(8484, ["Stop"]))
    code, report = _status()
    assert code == 1
    assert _tool(report, "claude-code")["state"] == "partial"


def test_leftovers_are_listed_with_no_hooks_registered(home):
    """Hooks removed by hand, the rest of the integration still there."""
    (home / ".zshrc").write_text("# >>> aictl env >>>\n[ -f x ] && . x\n# <<< aictl env <<<\n")
    env = home / ".config" / "aictl" / "env.sh"
    env.parent.mkdir(parents=True)
    env.write_text("export AICTL_PORT=8484\n")
    code, report = _status()
    assert code == 0
    joined = "\n".join(report["leftovers"])
    assert ".zshrc" in joined and "env.sh" in joined
    assert env.exists(), "status must not change anything"


def test_status_text_shows_fix(home):
    ig._install_hooks("user", 9000, [])
    result = CliRunner().invoke(ig.hooks, ["status"], catch_exceptions=False)
    assert result.exit_code == 1
    assert "port-mismatch" in result.output
    assert "fix: aictl hooks install --scope user --port 8484" in result.output


def test_doctor_covers_gemini_and_prints_fix(home):
    ig._install_hooks("user", 9000, [])
    result = CliRunner().invoke(ig.hooks, ["doctor", "--json"], catch_exceptions=False)
    tools = {r["tool"] for r in json.loads(result.output)["results"]}
    assert tools == {"claude-code", "gemini-cli", "copilot"}


def test_dashboard_status_flags_missing_interpreter(home):
    from aictl.dashboard.hooks_status import _summarize_hook

    check = _summarize_hook(
        "Stop",
        {
            "_aictl_owner": "aictl.managed",
            "command": '"/gone/python" -I -S "/gone/hook_handler.py" --event Stop --port 1',
        },
    )
    assert check["status"] == "FAIL"
    assert any("interpreter not found" in r for r in check["reasons"])
