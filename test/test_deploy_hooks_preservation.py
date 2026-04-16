# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""ctx deploy must preserve user-defined hooks in Claude settings.local.json."""

from __future__ import annotations

import json
from pathlib import Path

from click.testing import CliRunner

from aictl._hook_owner import _AICTL_OWNER_MARKER, _is_aictl_hook
from aictl.commands.ctx_pipeline import deploy

_USER_HOOK = {
    "matcher": "Bash",
    "hooks": [{"type": "command", "command": "user-lint.sh"}],
}

_AICTX_WITH_HOOK = (
    "[hooks._always]\n"
    'PreToolUse = \'[{"matcher": "", "hooks": [{"type": "command", '
    '"command": "python -m aictl.hook_handler --event PreToolUse --port 8484"}]}]\'\n'
)

_AICTX_NO_HOOK = (
    # Keep *some* settings output so the file stays in the emit set
    # (avoids manifest-cleanup deleting settings.local.json outright —
    # that is an orthogonal file-lifecycle concern outside this fix).
    '[permissions]\n_always = ["Read"]\n'
)


def _write_user_settings(root: Path, extra_aictl_hook: dict | None = None) -> Path:
    claude = root / ".claude"
    claude.mkdir(parents=True, exist_ok=True)
    settings = claude / "settings.local.json"
    hooks_dict = {"PreToolUse": [dict(_USER_HOOK)]}
    if extra_aictl_hook is not None:
        hooks_dict["PreToolUse"].append(extra_aictl_hook)
    settings.write_text(
        json.dumps(
            {
                "permissions": {"allow": ["Read"]},
                "hooks": hooks_dict,
            },
            indent=2,
        )
    )
    return settings


def _deploy_claude_only(project_root: Path) -> None:
    runner = CliRunner()
    result = runner.invoke(
        deploy,
        ["--root", str(project_root), "-e", "claude"],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output


def _user_hooks(rules: list[dict]) -> list[dict]:
    return [r for r in rules if not _is_aictl_hook(r)]


def _aictl_hooks(rules: list[dict]) -> list[dict]:
    return [r for r in rules if _is_aictl_hook(r)]


def test_deploy_preserves_user_hooks_and_tags_aictl_entry(tmp_path):
    (tmp_path / ".context.toml").write_text(_AICTX_WITH_HOOK)
    settings = _write_user_settings(tmp_path)

    _deploy_claude_only(tmp_path)

    data = json.loads(settings.read_text())
    pre = data["hooks"]["PreToolUse"]

    # User hook preserved, aictl entry added with the owner marker.
    users = _user_hooks(pre)
    ours = _aictl_hooks(pre)
    assert len(users) == 1
    assert users[0]["hooks"][0]["command"] == "user-lint.sh"
    assert len(ours) == 1
    assert ours[0]["_aictl_owner"] == _AICTL_OWNER_MARKER

    # Unrelated settings preserved.
    assert data["permissions"] == {"allow": ["Read"]}


def test_deploy_is_idempotent_for_hooks(tmp_path):
    (tmp_path / ".context.toml").write_text(_AICTX_WITH_HOOK)
    settings = _write_user_settings(tmp_path)

    _deploy_claude_only(tmp_path)
    _deploy_claude_only(tmp_path)

    pre = json.loads(settings.read_text())["hooks"]["PreToolUse"]
    assert len(_user_hooks(pre)) == 1
    assert len(_aictl_hooks(pre)) == 1  # no duplication


def test_deploy_removes_stale_aictl_hook_when_dropped_from_context(tmp_path):
    (tmp_path / ".context.toml").write_text(_AICTX_WITH_HOOK)
    settings = _write_user_settings(tmp_path)

    _deploy_claude_only(tmp_path)
    pre = json.loads(settings.read_text())["hooks"]["PreToolUse"]
    assert len(_aictl_hooks(pre)) == 1

    # Drop the hook from .context.toml and redeploy.
    (tmp_path / ".context.toml").write_text(_AICTX_NO_HOOK)
    _deploy_claude_only(tmp_path)

    data = json.loads(settings.read_text())
    pre = data.get("hooks", {}).get("PreToolUse", [])
    # User hook still intact; no aictl entries remain.
    assert len(_user_hooks(pre)) == 1
    assert _aictl_hooks(pre) == []


def test_deploy_strips_legacy_aictl_hook_without_marker(tmp_path):
    # Simulate a pre-marker install left behind from a prior aictl version.
    legacy = {
        "matcher": "",
        "hooks": [{"type": "command", "command": "python -m aictl.hook_handler --event PreToolUse --port 8484"}],
    }
    (tmp_path / ".context.toml").write_text(_AICTX_WITH_HOOK)
    settings = _write_user_settings(tmp_path, extra_aictl_hook=legacy)

    _deploy_claude_only(tmp_path)

    pre = json.loads(settings.read_text())["hooks"]["PreToolUse"]
    assert len(_user_hooks(pre)) == 1
    # Legacy replaced by the single new marker-tagged rule.
    ours = _aictl_hooks(pre)
    assert len(ours) == 1
    assert ours[0]["_aictl_owner"] == _AICTL_OWNER_MARKER
