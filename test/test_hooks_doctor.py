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
        "hooks": [
            {
                "type": "command",
                "command": f'"{interp}" -m aictl.hook_handler --event SessionStart --port {port}',
            }
        ],
    }


def _legacy_rule(port=8484, interp=None):
    # No _aictl_owner marker → legacy substring detection.
    interp = interp or sys.executable
    return {
        "matcher": "",
        "hooks": [
            {
                "type": "command",
                "command": f'"{interp}" -m aictl.hook_handler --event SessionStart --port {port}',
            }
        ],
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
            "hooks": [
                {
                    "type": "command",
                    "command": f'"{bad_interp}" -m aictl.hook_handler --event Stop --port 8484',
                }
            ],
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


# ─────────────────────────────────────────────────────────────────────────────
# verify


class _FakeResp:
    def __init__(self, code=200):
        self._code = code

    def getcode(self):
        return self._code

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class TestHooksVerify:
    def test_live_ok(self, tmp_settings, monkeypatch):
        _write_settings(tmp_settings, {"SessionStart": [_current_rule(port=8484)]})
        monkeypatch.setattr(
            "urllib.request.urlopen",
            lambda req, timeout=5: _FakeResp(200),
        )
        result = CliRunner().invoke(hooks, ["verify"])
        assert result.exit_code == 0, result.output
        assert "[OK]" in result.output

    def test_connection_refused(self, tmp_settings, monkeypatch):
        _write_settings(tmp_settings, {"SessionStart": [_current_rule(port=8484)]})

        def _boom(req, timeout=5):
            raise urllib.error.URLError("Connection refused")

        monkeypatch.setattr("urllib.request.urlopen", _boom)
        result = CliRunner().invoke(hooks, ["verify"])
        assert result.exit_code == 1, result.output
        assert "[FAIL]" in result.output
        assert "server not running" in result.output

    def test_timeout(self, tmp_settings, monkeypatch):
        _write_settings(tmp_settings, {"SessionStart": [_current_rule(port=8484)]})

        def _boom(req, timeout=5):
            raise urllib.error.URLError("timed out")

        monkeypatch.setattr("urllib.request.urlopen", _boom)
        result = CliRunner().invoke(hooks, ["verify"])
        assert result.exit_code == 1, result.output
        assert "timeout" in result.output

    def test_non_2xx_warn(self, tmp_settings, monkeypatch):
        _write_settings(tmp_settings, {"SessionStart": [_current_rule(port=8484)]})

        def _http_err(req, timeout=5):
            raise urllib.error.HTTPError(req.full_url, 500, "boom", {}, None)

        monkeypatch.setattr("urllib.request.urlopen", _http_err)
        result = CliRunner().invoke(hooks, ["verify"])
        assert result.exit_code == 0, result.output
        assert "[WARN]" in result.output
        assert "HTTP 500" in result.output

    def test_json_output(self, tmp_settings, monkeypatch):
        _write_settings(tmp_settings, {"SessionStart": [_current_rule(port=8484)]})
        monkeypatch.setattr(
            "urllib.request.urlopen",
            lambda req, timeout=5: _FakeResp(200),
        )
        result = CliRunner().invoke(hooks, ["verify", "--json"])
        assert result.exit_code == 0, result.output
        payload = json.loads(result.output)
        assert payload["results"][0]["status"] == "OK"
        assert payload["results"][0]["verify"]["http"] == 200

    def test_port_override(self, tmp_settings, monkeypatch):
        _write_settings(tmp_settings, {"SessionStart": [_current_rule(port=8484)]})
        captured = {}

        def _capture(req, timeout=5):
            captured["url"] = req.full_url
            return _FakeResp(200)

        monkeypatch.setattr("urllib.request.urlopen", _capture)
        result = CliRunner().invoke(hooks, ["verify", "--port", "9000"])
        assert result.exit_code == 0, result.output
        assert ":9000/" in captured["url"]
