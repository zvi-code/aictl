# Tests for aictl hooks install/uninstall command.
import json
from unittest.mock import patch

import pytest
from click.testing import CliRunner

from aictl._hook_owner import _AICTL_OWNER_MARKER
from aictl.commands.integrations import (
    HOOK_EVENTS,
    _build_hook_config,
    _is_aictl_hook,
    hooks,
)


@pytest.fixture
def tmp_settings(tmp_path, monkeypatch):
    """Patch _settings_path to write to a temp dir."""
    settings_file = tmp_path / ".claude" / "settings.json"

    def _fake_path(scope):
        return settings_file

    monkeypatch.setattr("aictl.commands.integrations._settings_path", _fake_path)
    monkeypatch.setenv("AICTL_PORT", "8484")
    return settings_file


class TestBuildHookConfig:
    def test_generates_all_events(self):
        config = _build_hook_config(8484, None)
        assert len(config) == len(HOOK_EVENTS)
        for event in HOOK_EVENTS:
            assert event in config

    def test_nested_format(self):
        """Each event must use the Claude-documented nested hook format."""
        config = _build_hook_config(8484, ["SessionStart"])
        entry = config["SessionStart"][0]
        assert "matcher" in entry
        assert "hooks" in entry
        assert isinstance(entry["hooks"], list)
        assert entry["hooks"][0]["type"] == "command"
        assert "command" in entry["hooks"][0]

    def test_custom_port(self):
        config = _build_hook_config(9999, None)
        cmd = config["SessionStart"][0]["hooks"][0]["command"]
        assert "--port 9999" in cmd

    def test_custom_event_subset(self):
        config = _build_hook_config(8484, ["SessionStart", "SessionEnd"])
        assert len(config) == 2
        assert "SessionStart" in config
        assert "SessionEnd" in config

    def test_invokes_hook_handler_module(self):
        config = _build_hook_config(8484, ["PostToolUse"])
        cmd = config["PostToolUse"][0]["hooks"][0]["command"]
        assert "hook_handler.py" in cmd

    def test_sets_event_name(self):
        config = _build_hook_config(8484, ["PreToolUse"])
        cmd = config["PreToolUse"][0]["hooks"][0]["command"]
        assert "--event PreToolUse" in cmd

    def test_no_inline_python(self):
        """Command must invoke the module, not an inline -c one-liner."""
        config = _build_hook_config(8484, ["SessionStart"])
        cmd = config["SessionStart"][0]["hooks"][0]["command"]
        assert " -c " not in cmd
        assert " -I -S " in cmd and "hook_handler.py" in cmd


class TestWindowsCallOperator:
    """On Windows, Claude Code runs command hooks through PowerShell, which
    treats a leading quoted string as a literal and chokes on the following
    ``-m`` (``Unexpected token '-m'`` / ParserError). The command must be
    prefixed with PowerShell's call operator ``&`` to invoke the quoted
    interpreter path. POSIX shells must NOT get the ``&`` prefix.
    """

    def _rule(self, *, is_windows: bool, exe: str, **kw) -> dict:
        with (
            patch("aictl.commands.integrations.IS_WINDOWS", is_windows),
            patch("aictl.commands.integrations.sys.executable", exe),
        ):
            config = _build_hook_config(8484, ["SessionStart"], **kw)
        return config["SessionStart"][0]["hooks"][0]

    def _cmd(self, *, is_windows: bool, exe: str, **kw) -> str:
        return self._rule(is_windows=is_windows, exe=exe, **kw)["command"]

    def test_windows_prefixes_call_operator_and_pins_powershell(self):
        """The `&` only works in PowerShell, so the rule must also say
        shell=powershell — Claude's default hook shell is bash (Git Bash)
        even on Windows, where a leading `&` is a syntax error."""
        rule = self._rule(
            is_windows=True,
            exe=r"C:\Users\First Last\AppData\Local\Programs\Python\Python312\python.exe",
        )
        cmd = rule["command"]
        assert cmd.startswith('& "C:\\Users\\First Last')
        assert '" -I -S "' in cmd and "--event SessionStart" in cmd
        assert rule["shell"] == "powershell"

    def test_gemini_windows_has_no_call_operator(self):
        """Gemini runs hooks through Node's shell (cmd.exe): plain quoted path."""
        rule = self._rule(
            is_windows=True,
            exe=r"C:\Python312\python.exe",
            event_map={"SessionStart": "SessionStart"},
            matcher="*",
            source_tool="gemini",
        )
        assert rule["command"].startswith('"C:\\Python312\\python.exe" -I -S ')
        assert "shell" not in rule

    def test_vscode_windows_has_no_call_operator(self):
        from aictl.commands.integrations import _build_vscode_hook_config

        with (
            patch("aictl.commands.integrations.IS_WINDOWS", True),
            patch("aictl.commands.integrations.sys.executable", r"C:\Python312\python.exe"),
        ):
            cfg = _build_vscode_hook_config(8484, ["SessionStart"], scope="user")
        assert cfg["SessionStart"][0]["command"].startswith('"C:\\Python312\\python.exe" -I -S ')

    def test_posix_has_no_call_operator(self):
        rule = self._rule(is_windows=False, exe="/usr/bin/python3")
        assert not rule["command"].startswith("&")
        assert rule["command"].startswith('"/usr/bin/python3" -I -S ')
        assert "shell" not in rule

    def test_windows_doctor_extracts_interpreter_past_operator(self):
        """The doctor's interpreter extraction must skip the ``&`` token."""
        from aictl.commands.integrations import _doctor_check_one

        cmd = self._cmd(
            is_windows=True,
            exe=r"C:\Python312\python.exe",
        )
        rule = {
            "_aictl_owner": _AICTL_OWNER_MARKER,
            "matcher": "",
            "hooks": [{"type": "command", "command": cmd}],
        }
        with patch("aictl.commands.integrations.IS_WINDOWS", True):
            result = _doctor_check_one("SessionStart", rule)
        # Interpreter must be the python path, never the bare call operator.
        assert result["interpreter"] == r"C:\Python312\python.exe"


class TestIsAictlHook:
    def test_detects_module_format(self):
        """Current module-based format is detected."""
        hook = {
            "matcher": "",
            "hooks": [{"type": "command", "command": "python -m aictl.hook_handler --event SessionStart --port 8484"}],
        }
        assert _is_aictl_hook(hook)

    def test_detects_old_inline_format(self):
        """Previous inline -c format with /api/hooks is detected for migration."""
        hook = {
            "matcher": "",
            "hooks": [{"type": "command", "command": "python -c '...http://localhost:8484/api/hooks...'"}],
        }
        assert _is_aictl_hook(hook)

    def test_detects_old_flat_format_for_migration(self):
        """Legacy flat format (pre-fix) is detected so reinstall can clean it up."""
        hook = {"type": "command", "command": "curl -s http://localhost:8484/api/hooks ..."}
        assert _is_aictl_hook(hook)

    def test_rejects_user_nested_hook(self):
        hook = {"matcher": "", "hooks": [{"type": "command", "command": "my-custom-linter.sh"}]}
        assert not _is_aictl_hook(hook)

    def test_rejects_user_flat_hook(self):
        hook = {"type": "command", "command": "my-custom-linter.sh"}
        assert not _is_aictl_hook(hook)

    def test_rejects_non_dict(self):
        assert not _is_aictl_hook("string")
        assert not _is_aictl_hook(42)

    def test_detects_generated_hook(self):
        # Use an actual generated hook to test detection
        config = _build_hook_config(8484, ["SessionStart"])
        hook = config["SessionStart"][0]
        assert _is_aictl_hook(hook)

    def test_generated_hook_carries_owner_marker(self):
        config = _build_hook_config(8484, ["SessionStart"])
        hook = config["SessionStart"][0]
        assert hook.get("_aictl_owner") == _AICTL_OWNER_MARKER

    def test_detects_marker_even_with_nonmatching_command(self):
        # Marker claims ownership regardless of command shape.
        hook = {
            "_aictl_owner": _AICTL_OWNER_MARKER,
            "matcher": "",
            "hooks": [{"type": "command", "command": "something-totally-unrelated.sh"}],
        }
        assert _is_aictl_hook(hook)

    def test_foreign_marker_is_not_ours_even_with_aictl_substring(self):
        # A non-aictl marker is authoritative: do NOT claim this entry,
        # even if the command contains an aictl-looking substring.
        hook = {
            "_aictl_owner": "someone-else",
            "matcher": "",
            "hooks": [{"type": "command", "command": "curl http://x/api/hooks"}],
        }
        assert not _is_aictl_hook(hook)

    def test_legacy_entry_without_marker_still_detected(self):
        # Upgrade path: pre-marker installs must still be cleanable.
        hook = {
            "matcher": "",
            "hooks": [{"type": "command", "command": "python -m aictl.hook_handler --event SessionStart --port 8484"}],
        }
        assert "_aictl_owner" not in hook
        assert _is_aictl_hook(hook)

    def test_user_hook_with_api_hooks_substring_matches_legacy(self):
        # Documented false-positive: a user curl-to-/api/hooks without a marker
        # is still claimed by the legacy fallback. This is expected behavior
        # during the migration window — the marker is the cure going forward.
        hook = {"type": "command", "command": "curl http://myservice/api/hooks"}
        assert _is_aictl_hook(hook)


class TestInstallClean:
    """Install into a clean settings file (no pre-existing config)."""

    def test_creates_settings_file(self, tmp_settings):
        runner = CliRunner()
        result = runner.invoke(hooks, ["install"], catch_exceptions=False)
        assert result.exit_code == 0
        assert tmp_settings.exists()

    def test_installs_all_events(self, tmp_settings):
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert len(data["hooks"]) == len(HOOK_EVENTS)

    def test_creates_parent_dirs(self, tmp_settings):
        # Parent dir doesn't exist yet
        assert not tmp_settings.parent.exists()
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        assert tmp_settings.exists()


class TestInstallPreservesExistingSettings:
    """Install must not clobber non-hook settings."""

    def test_preserves_non_hook_keys(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(
            json.dumps(
                {
                    "permissions": {"allow": ["Read", "Write"]},
                    "env": {"MY_VAR": "value"},
                }
            )
        )
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert data["permissions"] == {"allow": ["Read", "Write"]}
        assert data["env"] == {"MY_VAR": "value"}
        assert "hooks" in data

    def test_preserves_model_setting(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({"selectedModel": "opus"}))
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert data["selectedModel"] == "opus"


class TestInstallUpgrade:
    """Re-installing replaces old aictl hooks without duplicating."""

    def test_replaces_old_aictl_hooks(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        # Pre-populate with old-style aictl hooks (curl-based)
        old_hooks = {
            "SessionStart": [{"type": "command", "command": "curl -s http://localhost:8484/api/hooks -d '{}'"}],
            "SessionEnd": [{"type": "command", "command": "curl -s http://localhost:8484/api/hooks -d '{}'"}],
        }
        tmp_settings.write_text(json.dumps({"hooks": old_hooks}))

        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())

        # Should have all events, not just the 2 that existed before
        assert len(data["hooks"]) == len(HOOK_EVENTS)
        # Each event should have exactly 1 handler (no duplicates)
        for event in HOOK_EVENTS:
            assert len(data["hooks"][event]) == 1

    def test_no_duplicates_on_reinstall(self, tmp_settings):
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        for event in HOOK_EVENTS:
            assert len(data["hooks"][event]) == 1, f"Duplicate handlers for {event}"


class TestInstallConflictDetection:
    """Reject if non-aictl hooks already exist, unless --force."""

    def test_rejects_when_user_hooks_exist(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(
            json.dumps(
                {
                    "hooks": {
                        "PreToolUse": [{"type": "command", "command": "my-linter.sh"}],
                    }
                }
            )
        )
        runner = CliRunner()
        result = runner.invoke(hooks, ["install"])
        assert result.exit_code != 0
        assert "non-aictl hooks" in result.output or "non-aictl hooks" in (result.stderr or "")

    def test_shows_conflicting_events(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(
            json.dumps(
                {
                    "hooks": {
                        "PreToolUse": [{"type": "command", "command": "my-linter.sh"}],
                        "PostToolUse": [{"type": "command", "command": "my-logger.sh"}],
                    }
                }
            )
        )
        runner = CliRunner()
        result = runner.invoke(hooks, ["install"])
        assert result.exit_code != 0
        # Stderr should mention both conflicting events
        output = (result.output or "") + (result.stderr or "")
        assert "PreToolUse" in output
        assert "PostToolUse" in output

    def test_force_installs_alongside_user_hooks(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(
            json.dumps(
                {
                    "hooks": {
                        "PreToolUse": [{"type": "command", "command": "my-linter.sh"}],
                    }
                }
            )
        )
        runner = CliRunner()
        result = runner.invoke(hooks, ["install", "--force"], catch_exceptions=False)
        assert result.exit_code == 0
        data = json.loads(tmp_settings.read_text())
        # Should have both: user hook (flat) + aictl hook (nested)
        assert len(data["hooks"]["PreToolUse"]) == 2
        # Flatten commands from both flat and nested entries
        all_cmds = []
        for h in data["hooks"]["PreToolUse"]:
            if "hooks" in h:
                all_cmds.extend(sub["command"] for sub in h["hooks"])
            else:
                all_cmds.append(h.get("command", ""))
        assert any("my-linter.sh" in c for c in all_cmds)
        assert any("hook_handler.py" in c for c in all_cmds)

    def test_no_conflict_when_only_aictl_hooks_exist(self, tmp_settings):
        """Re-installing when only old aictl hooks exist should succeed without --force."""
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(
            json.dumps(
                {
                    "hooks": {
                        "SessionStart": [{"type": "command", "command": "curl http://localhost:8484/api/hooks"}],
                    }
                }
            )
        )
        runner = CliRunner()
        result = runner.invoke(hooks, ["install"], catch_exceptions=False)
        assert result.exit_code == 0

    def test_conflict_only_on_targeted_events(self, tmp_settings):
        """User hooks on events NOT being installed should not trigger conflict."""
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(
            json.dumps(
                {
                    "hooks": {
                        "Stop": [{"type": "command", "command": "my-script.sh"}],
                    }
                }
            )
        )
        runner = CliRunner()
        # Install only SessionStart — no conflict with Stop
        result = runner.invoke(hooks, ["install", "--events", "SessionStart"], catch_exceptions=False)
        assert result.exit_code == 0


class TestUninstall:
    def test_removes_aictl_hooks(self, tmp_settings):
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        runner.invoke(hooks, ["uninstall"], catch_exceptions=False)
        # Every rule was aictl's, so nothing is left: the file and its empty folder go.
        assert not tmp_settings.exists()

    def test_preserves_user_hooks(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(
            json.dumps(
                {
                    "hooks": {
                        "PreToolUse": [
                            {"type": "command", "command": "my-linter.sh"},
                            {"type": "command", "command": "curl http://localhost:8484/api/hooks"},
                        ],
                    }
                }
            )
        )
        runner = CliRunner()
        runner.invoke(hooks, ["uninstall"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert len(data["hooks"]["PreToolUse"]) == 1
        assert data["hooks"]["PreToolUse"][0]["command"] == "my-linter.sh"

    def test_preserves_non_hook_settings(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(
            json.dumps(
                {
                    "permissions": {"allow": ["Read"]},
                    "hooks": {
                        "SessionStart": [{"type": "command", "command": "curl http://localhost:8484/api/hooks"}],
                    },
                }
            )
        )
        runner = CliRunner()
        runner.invoke(hooks, ["uninstall"], catch_exceptions=False)
        data = json.loads(tmp_settings.read_text())
        assert data["permissions"] == {"allow": ["Read"]}

    def test_no_settings_file(self, tmp_settings):
        runner = CliRunner()
        result = runner.invoke(hooks, ["uninstall"], catch_exceptions=False)
        assert result.exit_code == 0
        assert "No settings file" in result.output


class TestInvalidEvents:
    def test_rejects_unknown_event(self, tmp_settings):
        runner = CliRunner()
        result = runner.invoke(hooks, ["install", "--events", "FakeEvent"])
        assert result.exit_code != 0
        assert "Unknown events" in (result.output or "") + (result.stderr or "")


class TestHookEventsCompleteness:
    """Ensure HOOK_EVENTS stays in sync with KNOWN_HOOK_EVENTS."""

    def test_hook_events_match_validator(self):
        from aictl.commands.integrations import HOOK_EVENTS as KNOWN_HOOK_EVENTS

        hooks_set = set(HOOK_EVENTS)
        validator_set = set(KNOWN_HOOK_EVENTS)
        assert hooks_set == validator_set, (
            f"HOOK_EVENTS and KNOWN_HOOK_EVENTS are out of sync.\n"
            f"  In hooks only: {hooks_set - validator_set}\n"
            f"  In validator only: {validator_set - hooks_set}"
        )


class TestCorruptSettingsGuard:
    """A corrupted settings.json must not be silently clobbered (item #4)."""

    def test_install_refuses_corrupt_json_without_force(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        garbage = "{ not json, definitely not"
        tmp_settings.write_text(garbage, encoding="utf-8")
        runner = CliRunner()
        result = runner.invoke(hooks, ["install"])
        assert result.exit_code != 0, "install must fail on corrupt settings.json"
        assert tmp_settings.read_text(encoding="utf-8") == garbage, (
            "corrupt file must remain byte-identical when install refuses"
        )

    def test_install_force_overwrites_corrupt_json(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text("{ not json", encoding="utf-8")
        runner = CliRunner()
        result = runner.invoke(hooks, ["install", "--force"], catch_exceptions=False)
        assert result.exit_code == 0
        # With --force, the corrupt file is overwritten with fresh settings
        data = json.loads(tmp_settings.read_text(encoding="utf-8"))
        assert "hooks" in data

    def test_uninstall_refuses_corrupt_json_without_force(self, tmp_settings):
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        garbage = "definitely: not json"
        tmp_settings.write_text(garbage, encoding="utf-8")
        runner = CliRunner()
        result = runner.invoke(hooks, ["uninstall"])
        assert result.exit_code != 0
        assert tmp_settings.read_text(encoding="utf-8") == garbage


def _capture_posts(monkeypatch) -> list[dict]:
    """Replace the handler's socket write so tests can inspect what it POSTs."""
    from aictl import hook_handler

    posts: list[dict] = []

    def fake_post(port, body):  # noqa: ARG001
        posts.append(json.loads(body.decode()))

    monkeypatch.setattr(hook_handler, "_post", fake_post)
    return posts


class TestHookHandler:
    """Tests for the aictl.hook_handler module.

    The handler must write NOTHING to stdout: Claude Code parses hook stdout
    (decision JSON for PreToolUse & co., the worktree path for
    WorktreeCreate), so an echoed payload produced "hook error" notices in
    the transcript. Every test therefore asserts on the POSTed body and on an
    empty stdout.
    """

    def test_enriches_event_and_env(self, monkeypatch):
        import io

        from aictl.hook_handler import main

        monkeypatch.setattr("sys.argv", ["hook_handler", "--event", "PreToolUse", "--port", "9999"])
        monkeypatch.setattr("sys.stdin", io.StringIO('{"tool": "Bash"}'))
        monkeypatch.setenv("SESSION_ID", "test-session")
        monkeypatch.setenv("CWD", "/tmp")
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)
        posts = _capture_posts(monkeypatch)
        main()
        assert captured.getvalue() == "", "hook_handler must not write to stdout"
        result = posts[-1]
        assert result["event"] == "PreToolUse"
        assert result["tool"] == "Bash"
        assert result["session_id"] == "test-session"
        assert result["cwd"] == "/tmp"

    def test_empty_stdin(self, monkeypatch):
        """When stdin is a tty (no pipe), handler uses empty dict."""
        import io

        from aictl.hook_handler import main

        monkeypatch.setattr("sys.argv", ["hook_handler", "--event", "SessionStart", "--port", "8484"])

        class FakeTTY(io.StringIO):
            def isatty(self):
                return True

        monkeypatch.setattr("sys.stdin", FakeTTY())
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)
        posts = _capture_posts(monkeypatch)
        main()
        assert captured.getvalue() == ""
        result = posts[-1]
        assert result["event"] == "SessionStart"

    def test_does_not_overwrite_existing_session_id(self, monkeypatch):
        """If payload already has session_id, don't overwrite with env var."""
        import io

        from aictl.hook_handler import main

        monkeypatch.setattr("sys.argv", ["hook_handler", "--event", "Stop", "--port", "8484"])
        monkeypatch.setattr("sys.stdin", io.StringIO('{"session_id": "from-payload"}'))
        monkeypatch.setenv("SESSION_ID", "from-env")
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)
        posts = _capture_posts(monkeypatch)
        main()
        assert captured.getvalue() == ""
        result = posts[-1]
        assert result["session_id"] == "from-payload"

    def test_empty_piped_stdin_does_not_crash(self, monkeypatch):
        """A pipe with zero bytes (json.load would raise) must exit cleanly.

        The handler runs inside the AI tool's hook pipeline — a crash
        here breaks the tool, not just aictl.
        """
        import io

        from aictl.hook_handler import main

        monkeypatch.setattr("sys.argv", ["hook_handler", "--event", "SessionStart", "--port", "8484"])
        monkeypatch.setattr("sys.stdin", io.StringIO(""))  # empty pipe, isatty() False
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)
        posts = _capture_posts(monkeypatch)
        main()  # must not raise
        assert captured.getvalue() == ""
        result = posts[-1]
        assert result["event"] == "SessionStart"

    def test_malformed_json_stdin_does_not_crash(self, monkeypatch):
        import io

        from aictl.hook_handler import main

        monkeypatch.setattr("sys.argv", ["hook_handler", "--event", "Stop", "--port", "8484"])
        monkeypatch.setattr("sys.stdin", io.StringIO("{not json"))
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)
        posts = _capture_posts(monkeypatch)
        main()
        assert captured.getvalue() == ""
        result = posts[-1]
        assert result["event"] == "Stop"

    def test_bad_port_falls_back_to_default(self, monkeypatch):
        """--port garbage must not raise ValueError inside the wrapper."""
        import io

        from aictl.hook_handler import main

        seen_ports: list[int] = []
        monkeypatch.setattr("aictl.hook_handler._post", lambda port, body: seen_ports.append(port))
        monkeypatch.setattr("sys.argv", ["hook_handler", "--event", "SessionStart", "--port", "not-a-number"])
        monkeypatch.setattr("sys.stdin", io.StringIO("{}"))
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)
        main()  # must not raise
        assert seen_ports == [8484]

    def test_non_dict_json_stdin_does_not_crash(self, monkeypatch):
        """A JSON array on stdin must not crash the enrichment step."""
        import io

        from aictl.hook_handler import main

        monkeypatch.setattr("sys.argv", ["hook_handler", "--event", "Stop", "--port", "8484"])
        monkeypatch.setattr("sys.stdin", io.StringIO("[1, 2, 3]"))
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)
        posts = _capture_posts(monkeypatch)
        main()
        assert captured.getvalue() == ""
        result = posts[-1]
        assert result["event"] == "Stop"


class TestPythonCmd:
    """Hook command uses sys.executable, not the hardcoded 'python3' string."""

    def test_does_not_use_bare_python3(self):
        """Hook command must not start with a bare 'python3' invocation.

        The interpreter is sys.executable (a full path, possibly containing
        'python3' as part of the path, e.g. /usr/bin/python3.11). We check
        that the command starts with a quoted full path, not the literal
        word 'python3', since 'python3' is not available on Windows.
        """
        import sys

        config = _build_hook_config(8484, ["SessionStart"])
        cmd = config["SessionStart"][0]["hooks"][0]["command"]
        # On Windows the command is prefixed with PowerShell's call operator
        # (``& "..."``); strip it before checking the interpreter token.
        invocation = cmd[2:] if cmd.startswith("& ") else cmd
        # Command must start with the quoted sys.executable, not bare 'python3'
        assert invocation.startswith(f'"{sys.executable}"'), (
            f"Hook command should start with quoted sys.executable, got: {cmd[:80]}"
        )

    def test_uses_current_interpreter_path(self):
        """Hook command must embed the current Python interpreter path."""
        import sys

        config = _build_hook_config(8484, ["SessionStart"])
        cmd = config["SessionStart"][0]["hooks"][0]["command"]
        # sys.executable may be quoted with double quotes
        assert sys.executable in cmd

    def test_executable_path_is_quoted(self):
        """Executable path must be quoted to handle spaces (e.g. Program Files)."""
        config = _build_hook_config(8484, ["SessionStart"])
        cmd = config["SessionStart"][0]["hooks"][0]["command"]
        import sys

        assert f'"{sys.executable}"' in cmd

    def test_hook_command_works_on_simulated_windows_path(self):
        """Hook config is valid when sys.executable has a Windows-style path."""
        fake_exe = r"C:\Program Files\Python311\python.exe"
        with patch("sys.executable", fake_exe):
            # Re-import _python_cmd with patched sys.executable
            from aictl.commands.integrations import _python_cmd

            quoted = _python_cmd()
        assert fake_exe in quoted
        # On Windows the call operator ``& `` precedes the quoted path.
        invocation = quoted[2:] if quoted.startswith("& ") else quoted
        assert invocation.startswith('"')
        assert invocation.endswith('"')


class TestSanitizeProjectName:
    """_sanitize_project_name coerces arbitrary dir names into safe source-id tokens."""

    def test_normal_name(self):
        from aictl.commands.integrations import _sanitize_project_name

        assert _sanitize_project_name("aictl") == "aictl"
        assert _sanitize_project_name("my_project-1") == "my_project-1"

    def test_uppercase_is_lowercased(self):
        from aictl.commands.integrations import _sanitize_project_name

        assert _sanitize_project_name("MyProject") == "myproject"

    def test_spaces_and_special_chars(self):
        from aictl.commands.integrations import _sanitize_project_name

        assert _sanitize_project_name("my project") == "my-project"
        assert _sanitize_project_name("a/b\\c:d") == "a-b-c-d"

    def test_collapses_repeated_dashes(self):
        from aictl.commands.integrations import _sanitize_project_name

        assert _sanitize_project_name("foo   bar") == "foo-bar"
        assert _sanitize_project_name("foo!!!bar") == "foo-bar"

    def test_unicode(self):
        from aictl.commands.integrations import _sanitize_project_name

        # Non-ASCII chars are not in [a-z0-9_-] so they become dashes.
        result = _sanitize_project_name("café")
        assert result
        assert all(c.islower() or c.isdigit() or c in "_-" for c in result)

    def test_empty(self):
        from aictl.commands.integrations import _sanitize_project_name

        assert _sanitize_project_name("") == "unknown"

    def test_leading_trailing_dashes_and_dots(self):
        from aictl.commands.integrations import _sanitize_project_name

        assert _sanitize_project_name("...foo...") == "foo"
        assert _sanitize_project_name("--foo--") == "foo"
        assert _sanitize_project_name(".-.") == "unknown"


class TestSourceId:
    def test_user_scope_root(self):
        from aictl.commands.integrations import _source_id

        assert _source_id("user", "claude") == "root.claude-user"
        assert _source_id("user", "gemini") == "root.gemini-user"
        assert _source_id("user", "vscode") == "root.vscode-user"

    def test_project_scope_uses_cwd_basename(self, monkeypatch, tmp_path):
        from aictl.commands.integrations import _source_id

        proj = tmp_path / "My Cool Project"
        proj.mkdir()
        monkeypatch.chdir(proj)
        assert _source_id("project", "claude") == "my-cool-project.claude-project"
        assert _source_id("project", "gemini") == "my-cool-project.gemini-project"

    def test_command_carries_source_for_user_scope(self):
        cfg = _build_hook_config(8484, ["SessionStart"], source_tool="claude", scope="user")
        cmd = cfg["SessionStart"][0]["hooks"][0]["command"]
        assert " --source root.claude-user" in cmd

    def test_command_carries_source_for_project_scope(self, monkeypatch, tmp_path):
        proj = tmp_path / "demo_app"
        proj.mkdir()
        monkeypatch.chdir(proj)
        cfg = _build_hook_config(8484, ["SessionStart"], source_tool="claude", scope="project")
        cmd = cfg["SessionStart"][0]["hooks"][0]["command"]
        assert " --source demo_app.claude-project" in cmd

    def test_gemini_source_for_user_scope(self):
        cfg = _build_hook_config(
            8484,
            ["SessionStart"],
            event_map={"SessionStart": "SessionStart"},
            matcher="*",
            source_tool="gemini",
            scope="user",
        )
        cmd = cfg["SessionStart"][0]["hooks"][0]["command"]
        assert " --source root.gemini-user" in cmd


class TestHookHandlerAictlHookEnrichment:
    """hook_handler stamps the payload with aictl_hook metadata."""

    def test_stamps_pid_ppid_tid_source(self, monkeypatch):
        import io

        from aictl import hook_handler as hh

        monkeypatch.setattr(
            "sys.argv",
            ["hook_handler", "--event", "SessionStart", "--port", "8484", "--source", "root.claude-user"],
        )
        monkeypatch.setattr("sys.stdin", io.StringIO('{"session_id": "s1"}'))
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)

        posted = {}

        monkeypatch.setattr(hh, "_post", lambda port, body: posted.__setitem__("data", body))
        hh.main()

        body = json.loads(posted["data"].decode())
        assert body["aictl_hook"]["source"] == "root.claude-user"
        assert isinstance(body["aictl_hook"]["pid"], int)
        assert isinstance(body["aictl_hook"]["ppid"], int)
        assert body["aictl_hook"]["py"]

        assert captured.getvalue() == ""
        assert isinstance(body["pid"], int) and body["pid"] > 0  # tool pid resolved from the parent chain

    def test_missing_source_defaults_to_unknown(self, monkeypatch):
        import io

        from aictl import hook_handler as hh

        monkeypatch.setattr("sys.argv", ["hook_handler", "--event", "SessionStart", "--port", "8484"])
        monkeypatch.setattr("sys.stdin", io.StringIO("{}"))
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)
        posts = _capture_posts(monkeypatch)
        hh.main()
        assert captured.getvalue() == ""
        assert posts[-1]["aictl_hook"]["source"] == "unknown"

    def test_network_error_is_swallowed(self, monkeypatch):
        import io

        from aictl import hook_handler as hh

        monkeypatch.setattr(
            "sys.argv",
            ["hook_handler", "--event", "SessionStart", "--port", "1", "--source", "root.claude-user"],
        )
        monkeypatch.setattr("sys.stdin", io.StringIO('{"session_id": "s1"}'))
        captured = io.StringIO()
        monkeypatch.setattr("sys.stdout", captured)
        # No urlopen mock — real network call to port 1 will be refused; must not raise.
        hh.main()
        assert captured.getvalue() == ""


class TestGeminiHooksUninstall:
    """`hooks uninstall` must clean up the Gemini CLI hooks that
    `_install_hooks` writes (previously only Claude + VS Code were
    cleaned, so `aictl disable` left the Gemini wrappers installed
    forever)."""

    @pytest.fixture
    def hook_dirs(self, tmp_path, monkeypatch):
        """Redirect every settings location into tmp_path (both scopes)."""
        monkeypatch.setattr(
            "aictl.commands.integrations.claude_global_dir", lambda: tmp_path / "home" / ".claude"
        )
        monkeypatch.setattr(
            "aictl.commands.integrations.gemini_global_dir", lambda: tmp_path / "home" / ".gemini"
        )
        monkeypatch.setattr(
            "aictl.commands.integrations.copilot_global_dir", lambda: tmp_path / "home" / ".copilot"
        )
        proj = tmp_path / "proj"
        proj.mkdir()
        monkeypatch.chdir(proj)
        return tmp_path / "home", proj

    @staticmethod
    def _gemini_path(scope, home, proj):
        return (proj if scope == "project" else home) / ".gemini" / "settings.json"

    @pytest.mark.parametrize("scope", ["user", "project"])
    def test_install_uninstall_round_trip_restores_settings(self, scope, hook_dirs):
        from aictl.commands.integrations import _install_hooks

        home, proj = hook_dirs
        gemini_path = self._gemini_path(scope, home, proj)
        gemini_path.parent.mkdir(parents=True, exist_ok=True)
        before = {
            "theme": "dark",
            "mcpServers": {"fs": {"command": "mcp-fs"}},
            "hooks": {
                "PreToolUse": [
                    {"matcher": "*", "hooks": [{"type": "command", "command": "echo user-hook"}]}
                ]
            },
        }
        gemini_path.write_text(json.dumps(before, indent=2) + "\n", encoding="utf-8")

        actions: list[str] = []
        _install_hooks(scope, 8484, actions)
        installed = json.loads(gemini_path.read_text())
        assert installed != before, "install must add aictl hooks"

        runner = CliRunner()
        result = runner.invoke(hooks, ["uninstall", "--scope", scope])
        assert result.exit_code == 0, result.output
        assert json.loads(gemini_path.read_text()) == before

    @pytest.mark.parametrize("scope", ["user", "project"])
    def test_uninstall_removes_hooks_key_when_only_aictl_hooks(self, scope, hook_dirs):
        from aictl.commands.integrations import _install_hooks

        home, proj = hook_dirs
        gemini_path = self._gemini_path(scope, home, proj)

        actions: list[str] = []
        gemini_path.parent.mkdir(parents=True, exist_ok=True)  # the tool is installed
        _install_hooks(scope, 8484, actions)  # creates the file from scratch
        assert json.loads(gemini_path.read_text()).get("hooks")

        runner = CliRunner()
        result = runner.invoke(hooks, ["uninstall", "--scope", scope])
        assert result.exit_code == 0, result.output
        assert not gemini_path.exists(), "a file left holding nothing is removed"
        assert not gemini_path.parent.exists()

    def test_uninstall_missing_gemini_settings_is_noop(self, hook_dirs):
        from aictl.commands.integrations import _uninstall_gemini_hooks

        actions: list[str] = []
        _uninstall_gemini_hooks("user", actions)  # file does not exist
        assert actions == []


class TestHookEventCatalog:
    """Guards on WHICH events aictl registers and how they map per tool."""

    def test_worktree_create_is_not_observed(self):
        # Configuring any WorktreeCreate hook replaces Claude's default git
        # worktree creation and Claude reads the hook's stdout as the new
        # path; an echo hook would break `claude --worktree`.
        assert "WorktreeCreate" not in HOOK_EVENTS
        assert "WorktreeRemove" in HOOK_EVENTS  # plain side-effect event, safe

    def test_gemini_map_values_are_unique(self):
        from aictl.commands.integrations import GEMINI_HOOK_MAP

        values = list(GEMINI_HOOK_MAP.values())
        assert len(values) == len(set(values)), f"duplicate Gemini targets: {values}"

    def test_gemini_after_tool_records_success_event(self):
        """AfterTool must carry --event PostToolUse (it used to be shadowed by
        PostToolUseFailure, so every Gemini tool call was stored as a failure)."""
        from aictl.commands.integrations import GEMINI_HOOK_MAP

        events = [e for e in HOOK_EVENTS if e in GEMINI_HOOK_MAP]
        cfg = _build_hook_config(8484, events, event_map=GEMINI_HOOK_MAP, matcher="*", source_tool="gemini")
        assert len(cfg) == len(events)
        assert " --event PostToolUse " in cfg["AfterTool"][0]["hooks"][0]["command"]
        assert " --event Stop " in cfg["AfterAgent"][0]["hooks"][0]["command"]

    def test_build_hook_config_rejects_event_map_collision(self):
        with pytest.raises(ValueError, match="collision"):
            _build_hook_config(
                8484,
                ["PostToolUse", "PostToolUseFailure"],
                event_map={"PostToolUse": "AfterTool", "PostToolUseFailure": "AfterTool"},
                source_tool="gemini",
            )


class TestUninstallRemovesStaleEvents:
    """uninstall must purge aictl rules under events no longer in HOOK_EVENTS
    (a previously-installed WorktreeCreate rule would otherwise survive and
    keep breaking `claude --worktree`)."""

    def test_stale_worktree_create_rule_is_removed(self, tmp_settings):
        stale_rule = {
            "_aictl_owner": _AICTL_OWNER_MARKER,
            "matcher": "",
            "hooks": [{"type": "command", "command": "python -m aictl.hook_handler --event WorktreeCreate --port 8484"}],
        }
        user_rule = {"matcher": "", "hooks": [{"type": "command", "command": "./my-worktree.sh"}]}
        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({"hooks": {"WorktreeCreate": [stale_rule, user_rule]}}))

        result = CliRunner().invoke(hooks, ["uninstall", "--scope", "user"])
        assert result.exit_code == 0, result.output
        data = json.loads(tmp_settings.read_text())
        assert data["hooks"]["WorktreeCreate"] == [user_rule]


class TestHookMergeAndUninstallResilience:
    """Cross-tool install/uninstall invariants that used to be hand-rolled
    (and diverging) per tool; now one merge in aictl._hook_owner."""

    @pytest.fixture
    def hook_dirs(self, tmp_path, monkeypatch):
        monkeypatch.setattr("aictl.commands.integrations.claude_global_dir", lambda: tmp_path / "home" / ".claude")
        monkeypatch.setattr("aictl.commands.integrations.gemini_global_dir", lambda: tmp_path / "home" / ".gemini")
        monkeypatch.setattr("aictl.commands.integrations.copilot_global_dir", lambda: tmp_path / "home" / ".copilot")
        monkeypatch.setattr("aictl.commands.integrations.vscode_user_dir", lambda: tmp_path / "home" / "Code" / "User")
        # Both tools are installed: registration skips a tool whose folder is absent.
        (tmp_path / "home" / ".claude").mkdir(parents=True)
        (tmp_path / "home" / ".gemini").mkdir(parents=True)
        proj = tmp_path / "proj"
        proj.mkdir()
        monkeypatch.chdir(proj)
        return tmp_path / "home", proj

    def test_install_twice_is_idempotent(self, hook_dirs):
        from aictl.commands.integrations import _install_hooks

        home, _ = hook_dirs
        _install_hooks("user", 8484, [])
        first = {p: p.read_text() for p in home.rglob("*.json")}
        _install_hooks("user", 8484, [])
        second = {p: p.read_text() for p in home.rglob("*.json")}
        assert first == second
        data = json.loads((home / ".claude" / "settings.json").read_text())
        assert all(len(rules) == 1 for rules in data["hooks"].values())

    def test_uninstall_continues_when_claude_settings_missing(self, hook_dirs):
        """A missing/corrupt Claude settings.json must not leave Gemini and
        Copilot hooks installed forever."""
        from aictl.commands.integrations import _install_hooks

        home, _ = hook_dirs
        _install_hooks("user", 8484, [])
        (home / ".claude" / "settings.json").unlink()
        result = CliRunner().invoke(hooks, ["uninstall", "--scope", "user"])
        assert result.exit_code == 0, result.output
        assert not (home / ".gemini" / "settings.json").exists()
        assert not (home / ".copilot" / "hooks" / "aictl.json").exists()

    def test_uninstall_continues_when_claude_settings_corrupt(self, hook_dirs):
        from aictl.commands.integrations import _install_hooks

        home, _ = hook_dirs
        _install_hooks("user", 8484, [])
        (home / ".claude" / "settings.json").write_text("{not json")
        result = CliRunner().invoke(hooks, ["uninstall", "--scope", "user"])
        assert result.exit_code == 1  # corrupt file is reported...
        assert not (home / ".gemini" / "settings.json").exists()  # ...others cleaned

    def test_malformed_event_value_is_preserved_not_iterated(self, hook_dirs):
        """A hand-edited `"PreToolUse": {...}` (dict, not list) used to be
        iterated key by key and written back as a list of strings."""
        from aictl.commands.integrations import _install_hooks

        home, _ = hook_dirs
        settings = home / ".claude" / "settings.json"
        settings.parent.mkdir(parents=True, exist_ok=True)
        bad = {"matcher": "Bash", "hooks": [{"type": "command", "command": "./mine.sh"}]}
        settings.write_text(json.dumps({"hooks": {"Notification": bad}}))
        _install_hooks("user", 8484, [])
        data = json.loads(settings.read_text())
        # The malformed value is kept as it was, not exploded into
        # strings and not replaced, so uninstall can give it back.
        assert data["hooks"]["Notification"] == bad
        assert "PreToolUse" in data["hooks"]

    def test_copilot_hook_file_keeps_user_entries_on_install_and_uninstall(self, hook_dirs):
        from aictl.commands.integrations import _install_hooks

        home, _ = hook_dirs
        hook_file = home / ".copilot" / "hooks" / "aictl.json"
        hook_file.parent.mkdir(parents=True)
        user_entry = {"type": "command", "command": "./my-hook.sh"}
        hook_file.write_text(json.dumps({"hooks": {"SessionStart": [user_entry]}}))

        _install_hooks("user", 8484, [])
        data = json.loads(hook_file.read_text())
        assert user_entry in data["hooks"]["SessionStart"]
        assert any(_is_aictl_hook(r) for r in data["hooks"]["SessionStart"])

        result = CliRunner().invoke(hooks, ["uninstall", "--scope", "user"])
        assert result.exit_code == 0, result.output
        data = json.loads(hook_file.read_text())
        assert data["hooks"] == {"SessionStart": [user_entry]}

    def test_hook_files_locations_merged_not_replaced(self, hook_dirs):
        from aictl.commands.integrations import _enable_vscode

        home, _ = hook_dirs
        settings = home / "Code" / "User" / "settings.json"
        settings.parent.mkdir(parents=True)
        settings.write_text(json.dumps({"chat.hookFilesLocations": {"tools/hooks": True}}))
        _enable_vscode("user", 8484, [])
        locs = json.loads(settings.read_text())["chat.hookFilesLocations"]
        assert locs["tools/hooks"] is True  # user entry kept
        assert locs["~/.copilot/hooks"] is True  # where the user-scope aictl file lives


class TestCodexOtelBlock:
    """Codex reads ``[otel] exporter = { otlp-http = {...} }`` — not the
    ``enabled``/``endpoint`` keys an earlier aictl wrote (silently ignored)."""

    def test_block_uses_codex_schema(self):
        from aictl.commands.integrations import _codex_otel_block

        block = _codex_otel_block("http://localhost:8484")
        assert "enabled = true" not in block
        assert 'exporter = { otlp-http = { endpoint = "http://localhost:8484/v1/logs", protocol = "json" } }' in block
        assert "metrics_exporter = { otlp-http" in block

    def test_gemini_uses_gemini_telemetry_vars_and_codex_has_none(self):
        from aictl.commands.integrations import _build_env_block

        env = _build_env_block(8484, ["gemini", "codex"])
        assert env["GEMINI_TELEMETRY_ENABLED"] == "true"
        assert env["GEMINI_TELEMETRY_OTLP_ENDPOINT"] == "http://localhost:8484"
        assert env["GEMINI_TELEMETRY_OTLP_PROTOCOL"] == "http"
        assert env["GEMINI_TELEMETRY_USE_COLLECTOR"] == "true"
        assert not any(k.startswith(("GEMINI_OTEL", "CODEX_OTEL")) for k in env)
