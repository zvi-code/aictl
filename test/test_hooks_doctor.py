# Tests for `aictl hooks doctor` and `aictl hooks verify` (#17, #18).

import json
import sys
import urllib.error

import pytest
from click.testing import CliRunner

from aictl._hook_owner import _AICTL_OWNER_MARKER
from aictl.commands.integrations import hooks

# ─────────────────────────────────────────────────────────────────────────────
# Fixtures


@pytest.fixture
def tmp_settings(tmp_path, monkeypatch):
    settings_file = tmp_path / ".claude" / "settings.json"
    settings_file.parent.mkdir(parents=True, exist_ok=True)

    def _fake_path(scope):
        return settings_file

    monkeypatch.setattr("aictl.commands.integrations._settings_path", _fake_path)
    return settings_file


def _write_settings(path, events_to_rules):
    data = {"hooks": events_to_rules}
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _current_rule(port=8484, interp=None):
    interp = interp or sys.executable
    return {
        "_aictl_owner": _AICTL_OWNER_MARKER,
        "matcher": "",
        "hooks": [{
            "type": "command",
            "command": f'"{interp}" -m aictl.hook_handler --event SessionStart --port {port}',
        }],
    }


def _legacy_rule(port=8484, interp=None):
    # No _aictl_owner marker → legacy substring detection.
    interp = interp or sys.executable
    return {
        "matcher": "",
        "hooks": [{
            "type": "command",
            "command": f'"{interp}" -m aictl.hook_handler --event SessionStart --port {port}',
        }],
    }


# ─────────────────────────────────────────────────────────────────────────────
# doctor


class TestHooksDoctor:
    def test_all_ok(self, tmp_settings):
        _write_settings(tmp_settings, {"SessionStart": [_current_rule()]})
        result = CliRunner().invoke(hooks, ["doctor"])
        assert result.exit_code == 0, result.output
        assert "[OK]" in result.output
        assert "SessionStart" in result.output

    def test_missing_interpreter(self, tmp_settings):
        bad_interp = "/nonexistent/interpreter-xyz"
        rule = {
            "_aictl_owner": _AICTL_OWNER_MARKER,
            "matcher": "",
            "hooks": [{
                "type": "command",
                "command": f'"{bad_interp}" -m aictl.hook_handler --event Stop --port 8484',
            }],
        }
        _write_settings(tmp_settings, {"Stop": [rule]})
        result = CliRunner().invoke(hooks, ["doctor"])
        assert result.exit_code == 1, result.output
        assert "[FAIL]" in result.output
        assert "interpreter not found" in result.output

    def test_legacy_owner_marker_is_warn(self, tmp_settings):
        _write_settings(tmp_settings, {"SessionStart": [_legacy_rule()]})
        result = CliRunner().invoke(hooks, ["doctor"])
        # Static checks pass → WARN, not FAIL, because exit is only on FAIL.
        assert result.exit_code == 0, result.output
        assert "[WARN]" in result.output
        assert "legacy aictl version" in result.output

    def test_json_output(self, tmp_settings):
        _write_settings(tmp_settings, {"SessionStart": [_current_rule(port=9999)]})
        result = CliRunner().invoke(hooks, ["doctor", "--json"])
        assert result.exit_code == 0, result.output
        payload = json.loads(result.output)
        assert "results" in payload
        assert len(payload["results"]) == 1
        entry = payload["results"][0]
        assert entry["status"] == "OK"
        assert entry["event"] == "SessionStart"
        assert entry["port"] == 9999

    def test_no_hooks_installed(self, tmp_settings):
        # File absent — no crash, exit 0.
        result = CliRunner().invoke(hooks, ["doctor"])
        assert result.exit_code == 0, result.output
        assert "No aictl hooks" in result.output
