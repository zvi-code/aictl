# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A config writer never replaces a valid config with an invalid one.

Regression for a real incident: ``[otel]`` plus ``[otel.exporter.otlp-http]``
subtables got inline ``exporter = {...}`` keys added, which is invalid TOML
("Cannot declare ('otel', 'exporter', 'otlp-http') twice"), so Codex could not
start. CORRUPTED below is that state, line for line.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl import hook_removal
from aictl.commands import integrations as ig
from aictl.commands.disable import disable

tomllib = pytest.importorskip("tomllib")

SUBTABLES = """[otel.exporter.otlp-http]
endpoint = "http://localhost:8484/v1/logs"
protocol = "json"

[otel.metrics_exporter.otlp-http]
endpoint = "http://localhost:8484/v1/metrics"
protocol = "json"
"""
PRE_INCIDENT = f'model = "o4"\n\n[otel]\nenvironment = "prod"\n{SUBTABLES}'
CORRUPTED = f"""model = "o4"

[otel]
# managed by aictl — OTLP/JSON export to the aictl dashboard
environment = "dev"
log_user_prompt = true
exporter = {{ otlp-http = {{ endpoint = "http://localhost:8484/v1/logs", protocol = "json" }} }}
metrics_exporter = {{ otlp-http = {{ endpoint = "http://localhost:8484/v1/metrics", protocol = "json" }} }}
{SUBTABLES}
[tui]
x = 1
"""


@pytest.fixture
def machine(tmp_path, monkeypatch):
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(home / ".config"))
    monkeypatch.setattr(ig, "codex_global_dir", lambda: home / ".codex")
    monkeypatch.setattr(ig, "claude_global_dir", lambda: home / ".claude")
    monkeypatch.setattr(ig, "gemini_global_dir", lambda: home / ".gemini")
    monkeypatch.setattr(ig, "copilot_global_dir", lambda: home / ".copilot")
    monkeypatch.setattr(hook_removal, "_launchctl", lambda *a: None)
    monkeypatch.chdir(tmp_path)
    (home / ".codex").mkdir()
    return home


def _toml(home: Path) -> Path:
    return home / ".codex" / "config.toml"


def test_the_incident_state_really_is_invalid():
    with pytest.raises(tomllib.TOMLDecodeError):
        tomllib.loads(CORRUPTED)


@pytest.mark.parametrize("content", [None, PRE_INCIDENT, CORRUPTED, 'model = "o4"\n'])
def test_otel_enable_leaves_codex_config_untouched_and_says_why(machine, monkeypatch, content):
    monkeypatch.setattr(ig, "_run_env_persist", lambda *a: None)
    monkeypatch.setattr(ig, "_shell_profiles", lambda: [])
    path = _toml(machine)
    if content is not None:
        path.write_text(content)
    actions: list[str] = []
    ig._enable_otel(8484, actions, tools=["codex"])
    if content is None:
        assert not path.exists()
    else:
        assert path.read_text() == content
    message = next(a for a in actions if "Codex" in a)
    assert "left untouched" in message
    assert "FAILED" not in message


def test_no_code_path_writes_the_codex_config():
    source = Path(ig.__file__).read_text(encoding="utf-8")
    assert "_upsert_codex_otel" not in source


@pytest.mark.parametrize(
    ("name", "content"),
    [
        ("config.toml", "a = 1\na = 2\n"),
        ("config.toml", "[otel\n"),
        ("settings.json", '{"a": }'),
        ("settings.jsonc", '{"a": 1'),
    ],
)
def test_write_atomic_refuses_invalid_content(tmp_path, name, content):
    path = tmp_path / name
    path.write_text("")
    with pytest.raises(hook_removal.InvalidConfigError):
        hook_removal.write_atomic(path, content)
    assert path.read_text() == ""
    assert not list(tmp_path.glob("*.aictl-tmp"))


def test_write_atomic_keeps_a_valid_file_when_refusing(tmp_path):
    path = tmp_path / "config.toml"
    path.write_text("a = 1\n")
    with pytest.raises(hook_removal.InvalidConfigError):
        hook_removal.write_atomic(path, "[broken")
    assert path.read_text() == "a = 1\n"


@pytest.mark.parametrize("name", ["settings.json", "x.jsonc", "config.toml", ".zshrc", "plain.md"])
def test_write_atomic_allows_empty_and_other_formats(tmp_path, name):
    hook_removal.write_atomic(tmp_path / name, "")
    assert (tmp_path / name).read_text() == ""


def test_jsonc_and_non_object_json_are_valid(tmp_path):
    hook_removal.write_atomic(tmp_path / "a.json", '{\n  // c\n  "a": 1,\n}\n')
    hook_removal.write_atomic(tmp_path / "b.json", "[1, 2]\n")


def test_cli_writer_refuses_invalid_content_cleanly(machine):
    path = machine / ".claude" / "settings.json"
    with pytest.raises(Exception, match="invalid"):
        ig._write_text_atomic(path, '{"a": ')
    assert not path.exists()


def test_emit_writer_refuses_invalid_content(tmp_path):
    from aictl.utils import emit_file

    path = tmp_path / "x.json"
    path.write_text('{"ok": 1}\n')
    with pytest.raises(hook_removal.InvalidConfigError):
        emit_file(path, '{"broken": ', False, [])
    assert json.loads(path.read_text()) == {"ok": 1}


# ── Removal ──


def test_disable_cleans_the_corrupted_combination(machine):
    """Ownership rule, see strip_codex_otel_text: the marker makes the block and local exporters ours."""
    _toml(machine).write_text(CORRUPTED)
    result = CliRunner().invoke(disable, [], catch_exceptions=False)
    assert result.exit_code == 0, result.output
    text = _toml(machine).read_text()
    parsed = tomllib.loads(text)
    assert "otel" not in parsed
    assert parsed["model"] == "o4"
    assert parsed["tui"] == {"x": 1}


@pytest.mark.parametrize(
    ("before", "kept"),
    [
        ('# managed by aictl\nenvironment = "prod"\nextra = 1\n', {"environment": "prod", "extra": 1}),
        ('# managed by aictl\nenvironment = "dev"\nlog_user_prompt = true\n', None),
        (
            '# managed by aictl\nexporter = { otlp-http = { endpoint = "http://collector:4317" } }\n',
            {"exporter": {"otlp-http": {"endpoint": "http://collector:4317"}}},
        ),
    ],
)
def test_removal_takes_only_what_aictl_owns(before, kept):
    new = hook_removal.strip_codex_otel_text(f'model = "o4"\n\n[otel]\n{before}')
    parsed = tomllib.loads(new)
    assert parsed["model"] == "o4"
    assert parsed.get("otel") == kept


def test_removal_keeps_a_remote_subtable():
    content = '[otel]\n# managed by aictl\nenvironment = "dev"\n\n[otel.exporter.otlp-http]\nendpoint = "http://collector:4317"\n'
    parsed = tomllib.loads(hook_removal.strip_codex_otel_text(content))
    assert parsed["otel"]["exporter"]["otlp-http"]["endpoint"] == "http://collector:4317"


def test_removal_without_marker_touches_nothing():
    """A local exporter with no marker may be a separate collector."""
    content = f'[otel]\nenvironment = "dev"\n{SUBTABLES}'
    assert hook_removal.strip_codex_otel_text(content) == content


def test_block_from_older_enable_is_removed_byte_for_byte():
    original = 'model = "o4"\n\n[tui]\nx = 1\n'
    written = original + "\n" + ig._codex_otel_block("http://localhost:8484")
    tomllib.loads(written)
    assert hook_removal.strip_codex_otel_text(written) == original


# ── Repair ──


def test_repair_makes_the_incident_state_valid_and_keeps_the_export(machine):
    _toml(machine).write_text(CORRUPTED)
    result = CliRunner().invoke(ig.hooks, ["repair"], catch_exceptions=False)
    assert result.exit_code == 0, result.output
    parsed = tomllib.loads(_toml(machine).read_text())
    assert parsed["otel"]["exporter"]["otlp-http"]["endpoint"] == "http://localhost:8484/v1/logs"
    assert parsed["otel"]["environment"] == "dev"
    assert parsed["tui"] == {"x": 1}


def test_repair_dry_run_changes_nothing(machine):
    _toml(machine).write_text(CORRUPTED)
    result = CliRunner().invoke(ig.hooks, ["repair", "--dry-run"], catch_exceptions=False)
    assert result.exit_code == 0
    assert _toml(machine).read_text() == CORRUPTED


def test_repair_will_not_touch_breakage_it_did_not_cause(machine):
    original = "a = 1\na = 2\n"
    _toml(machine).write_text(original)
    result = CliRunner().invoke(ig.hooks, ["repair"], catch_exceptions=False)
    assert result.exit_code != 0
    assert _toml(machine).read_text() == original


# ── Doctor ──


def test_doctor_fails_on_the_incident_state_with_the_exact_fix(machine):
    _toml(machine).write_text(CORRUPTED)
    result = CliRunner().invoke(ig.hooks, ["doctor"], catch_exceptions=False)
    assert result.exit_code == 1
    assert "[FAIL] invalid config" in result.output
    assert "fix: aictl hooks repair" in result.output


def test_status_reports_invalid_config(machine):
    _toml(machine).write_text(CORRUPTED)
    result = CliRunner().invoke(ig.hooks, ["status", "--json"], catch_exceptions=False)
    assert result.exit_code == 1
    bad = json.loads(result.output)["invalid_configs"]
    assert [b["fix"] for b in bad] == ["aictl hooks repair"]


def test_doctor_gives_a_by_hand_fix_for_other_invalid_files(machine):
    settings = machine / ".gemini" / "settings.json"
    settings.parent.mkdir()
    settings.write_text("{broken")
    result = CliRunner().invoke(ig.hooks, ["doctor", "--json"], catch_exceptions=False)
    assert result.exit_code == 1
    bad = json.loads(result.output)["invalid_configs"]
    assert bad[0]["path"] == str(settings)
    assert str(settings) in bad[0]["fix"]
    assert settings.read_text() == "{broken"


def test_doctor_passes_when_every_config_parses(machine):
    _toml(machine).write_text(PRE_INCIDENT)
    result = CliRunner().invoke(ig.hooks, ["doctor"], catch_exceptions=False)
    assert result.exit_code == 0, result.output
