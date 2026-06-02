from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from aictl._hook_owner import _AICTL_OWNER_MARKER
from aictl.dashboard.hooks_status import collect_hooks_status
from aictl.storage import EventRow, HistoryDB


def _hook_cmd(event: str, source: str) -> str:
    return f'"{sys.executable}" -m aictl.hook_handler --event {event} --port 8484 --source {source}'


def _write_nested_hook(path: Path, event: str, source: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "hooks": {
                    event: [
                        {
                            "_aictl_owner": _AICTL_OWNER_MARKER,
                            "matcher": "",
                            "hooks": [{"type": "command", "command": _hook_cmd(event, source)}],
                        }
                    ]
                }
            }
        ),
        encoding="utf-8",
    )


def _write_flat_hook(path: Path, event: str, source: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "hooks": {
                    event: [
                        {
                            "type": "command",
                            "command": _hook_cmd(event, source),
                            "_aictl_owner": _AICTL_OWNER_MARKER,
                        }
                    ]
                }
            }
        ),
        encoding="utf-8",
    )


def test_collect_hooks_status_reports_configured_fired_skills_and_subagents(tmp_path):
    now = time.time()
    db = HistoryDB(db_path=str(tmp_path / "hooks.db"), flush_interval=0)
    root = tmp_path / "project"
    paths = {
        "claude_user": tmp_path / "home" / ".claude" / "settings.json",
        "claude_project": root / ".claude" / "settings.local.json",
        "gemini_user": tmp_path / "home" / ".gemini" / "settings.json",
        "gemini_project": root / ".gemini" / "settings.json",
        "vscode_user": tmp_path / "home" / ".copilot" / "hooks" / "aictl.json",
        "vscode_project": root / ".github" / "hooks" / "aictl.json",
        "vscode_settings": tmp_path / "Code" / "User" / "settings.json",
    }
    _write_nested_hook(paths["claude_project"], "UserPromptSubmit", "aictl.claude-project")
    _write_nested_hook(paths["gemini_project"], "PreToolUse", "aictl.gemini-project")
    _write_flat_hook(paths["vscode_user"], "UserPromptSubmit", "root.vscode-user")
    paths["vscode_settings"].parent.mkdir(parents=True, exist_ok=True)
    paths["vscode_settings"].write_text(
        json.dumps({"chat.useHooks": True, "chat.hookFilesLocations": {"~/.copilot/hooks": False}}),
        encoding="utf-8",
    )

    db.append_event(EventRow(ts=now - 60, tool="claude-code", kind="hook:UserPromptSubmit", session_id="s1"))
    db.append_event(
        EventRow(
            ts=now - 50,
            tool="claude-code",
            kind="hook:UserPromptSubmit",
            session_id="aictl-verify",
            detail={"_aictl_verify": True},
        )
    )
    db.append_event(
        EventRow(
            ts=now - 30,
            tool="claude-code",
            kind="hook:PostToolUse",
            session_id="s1",
            detail={"tool_name": "Skill", "tool_input": {"skill": "review-pr"}},
        )
    )
    db.append_event(
        EventRow(
            ts=now - 28,
            tool="claude-code",
            kind="hook:PostToolUse",
            session_id="s1",
            detail={"tool_name": "Read"},
        )
    )
    db.append_event(
        EventRow(
            ts=now - 26,
            tool="claude-code",
            kind="hook:PostToolUse",
            session_id="s1",
            detail={"tool_name": "Read"},
        )
    )
    db.append_event(
        EventRow(
            ts=now - 24,
            tool="claude-code",
            kind="hook:PostToolUse",
            session_id="s1",
            detail={"tool_name": "Bash"},
        )
    )
    db.append_event(
        EventRow(
            ts=now - 20,
            tool="copilot-vscode",
            kind="hook:SubagentStart",
            session_id="s2",
            detail={"agent_id": "agent-1"},
        )
    )
    db.append_event(EventRow(ts=now - 90_000, tool="claude-code", kind="hook:Stop", session_id="old"))

    status = collect_hooks_status(db, root, now=now, paths=paths)

    assert status["total_fired_24h"] == 6
    assert status["counts_by_kind"]["UserPromptSubmit"] == 1
    assert status["tools"]["claude-code"]["configured"] is True
    assert status["tools"]["claude-code"]["fired_24h"] == 5
    assert status["tools"]["gemini-cli"]["configured"] is True
    assert status["tools"]["copilot-vscode"]["status"] == "disabled"
    assert status["warnings"][0]["message"] == "chat.hookFilesLocations['~/.copilot/hooks'] is false"
    assert status["skill_usage"]["total_calls_24h"] == 1
    assert status["skill_usage"]["by_skill"] == [{"skill": "review-pr", "count": 1}]
    assert status["subagents"]["starts_24h"] == 1

    # General tool calls exclude Skill and aggregate per tool + per name.
    tool_calls = status["tool_calls"]
    assert tool_calls["total_calls_24h"] == 3  # 2x Read + 1x Bash (Skill excluded)
    assert tool_calls["by_tool"]["claude-code"] == 3
    assert tool_calls["by_tool_name"]["claude-code"] == {"Read": 2, "Bash": 1}
    assert tool_calls["by_name"][0] == {"name": "Read", "count": 2}

    db.close()


def test_collect_hooks_status_reports_claude_disable_all_hooks(tmp_path):
    now = time.time()
    db = HistoryDB(db_path=str(tmp_path / "hooks.db"), flush_interval=0)
    root = tmp_path / "project"
    paths = {
        "claude_user": tmp_path / "home" / ".claude" / "settings.json",
        "claude_project": root / ".claude" / "settings.local.json",
        "gemini_user": tmp_path / "home" / ".gemini" / "settings.json",
        "gemini_project": root / ".gemini" / "settings.json",
        "vscode_user": tmp_path / "home" / ".copilot" / "hooks" / "aictl.json",
        "vscode_project": root / ".github" / "hooks" / "aictl.json",
        "vscode_settings": tmp_path / "Code" / "User" / "settings.json",
    }
    _write_nested_hook(paths["claude_project"], "UserPromptSubmit", "aictl.claude-project")
    data = json.loads(paths["claude_project"].read_text(encoding="utf-8"))
    data["disableAllHooks"] = True
    paths["claude_project"].write_text(json.dumps(data), encoding="utf-8")

    status = collect_hooks_status(db, root, now=now, paths=paths)

    assert status["tools"]["claude-code"]["status"] == "disabled"
    assert status["warnings"] == [
        {
            "tool": "claude-code",
            "scope": "project",
            "path": str(paths["claude_project"]),
            "message": "disableAllHooks is true",
        }
    ]

    db.close()
