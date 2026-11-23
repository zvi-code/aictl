# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A settings row names a file only when its key is in that file; derived facts have their own origin."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.monitoring import tool_config as tc


@pytest.fixture()
def homes(tmp_path, monkeypatch):
    """Per-test homes for Copilot and Claude Code, with no managed files and no tool on PATH."""
    home = tmp_path / "home"
    home.mkdir()
    copilot = tmp_path / "copilot-home"
    copilot.mkdir()
    claude = tmp_path / "claude-home"
    claude.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("COPILOT_HOME", str(copilot))
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(claude))
    for name in (
        "COPILOT_MODEL",
        "ANTHROPIC_MODEL",
        "COPILOT_OTEL_ENABLED",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "COPILOT_OTEL_EXPORTER_TYPE",
        "COPILOT_OTEL_FILE_EXPORTER_PATH",
        "CLAUDE_CODE_ENABLE_TELEMETRY",
        "CLAUDE_CODE_SUBAGENT_MODEL",
    ):
        monkeypatch.delenv(name, raising=False)
    fixed = tmp_path / "fixed"
    for name in ("COPILOT_MANAGED_FILES", "CLAUDE_MANAGED_FILES", "CLAUDE_MANAGED_DIRS", "VSCODE_POLICY_FILES"):
        monkeypatch.setattr(tc, name, [fixed / name.lower()])
    monkeypatch.setattr(tc.shutil, "which", lambda _name: None)
    monkeypatch.setattr(tc, "_macos_login_items", lambda: set())
    monkeypatch.setattr(tc, "_copilot_desktop_version", lambda: "")
    return {"home": home, "copilot": copilot, "claude": claude, "project": tmp_path / "project"}


def _sections(cfg: tc.ToolConfig, root: Path) -> list[dict]:
    cfg.project_root = str(root)
    return tc.normalize_sections(cfg, {})


def _rows(sections: list[dict]) -> list[dict]:
    return [r for s in sections for r in s["rows"]]


def assert_rows_name_files_holding_their_keys(sections: list[dict]) -> None:
    """Guard for the class: every set row whose origin is a JSON/TOML file has its key in that file."""
    for row in _rows(sections):
        if not row["set"] or row.get("kind") == "agent":
            continue
        for entry in row["chain"] or [{"source": row["source"], "line": row["line"]}]:
            source = str(entry["source"] or "")
            if not source.lower().endswith((".json", ".jsonc", ".toml")):
                continue
            assert Path(source).is_file(), (row["key"], source)
            assert entry["line"] > 0, f"{row['key']!r} is attributed to {source} but is not in it"


def _copilot_fixture(homes) -> Path:
    (homes["copilot"] / "settings.json").write_text(
        json.dumps({"model": "invented-model", "logLevel": "debug", "sandbox": {"allowBypass": False}}, indent=2)
    )
    (homes["copilot"] / "copilot-instructions.md").write_text("Be brief.\n")
    root = homes["project"]
    root.mkdir()
    return root


@pytest.mark.parametrize("tool", ["copilot-cli", "copilot-desktop"])
def test_copilot_rows_name_only_files_that_hold_their_keys(homes, tool):
    root = _copilot_fixture(homes)
    cfg = tc._parse_copilot_home_config(root, tool=tool)
    assert cfg is not None
    sections = _sections(cfg, root)
    assert_rows_name_files_holding_their_keys(sections)


def test_installed_version_is_reported_by_the_tool_not_a_settings_row(homes, monkeypatch):
    root = _copilot_fixture(homes)
    monkeypatch.setattr(tc, "_copilot_cli_version", lambda: "9.9.9")
    cfg = tc._parse_copilot_home_config(root, tool="copilot-cli")
    rows = {r["key"]: r for r in _rows(_sections(cfg, root))}
    version = rows["version"]
    assert version["value"] == "9.9.9"
    assert version["source"] == "detected" and version["scope"] == "detected"
    assert version["line"] == 0 and version["label"] == "Installed version"
    assert "settings" not in version["chain"][0]["source"]


def test_no_invented_telemetry_row_and_otel_variable_is_shown(homes, monkeypatch):
    root = _copilot_fixture(homes)
    cfg = tc._parse_copilot_home_config(root, tool="copilot-cli")
    rows = {r["key"]: r for r in _rows(_sections(cfg, root))}
    assert "telemetry" not in rows  # nothing in any file says "telemetry not configured"

    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
    cfg = tc._parse_copilot_home_config(root, tool="copilot-cli")
    rows = {r["key"]: r for r in _rows(_sections(cfg, root))}
    assert rows["otel.enabled"]["value"] is True
    assert rows["otel.enabled"]["source"] == "env:OTEL_EXPORTER_OTLP_ENDPOINT"
    assert rows["otel.endpoint"]["scope"] == "env"


def test_global_instructions_row_is_the_file_itself(homes):
    root = _copilot_fixture(homes)
    cfg = tc._parse_copilot_home_config(root, tool="copilot-cli")
    rows = {r["key"]: r for r in _rows(_sections(cfg, root))}
    assert rows["global_instructions"]["value"] == str(homes["copilot"] / "copilot-instructions.md")
    (homes["copilot"] / "copilot-instructions.md").unlink()
    cfg = tc._parse_copilot_home_config(root, tool="copilot-cli")
    rows = {r["key"]: r for r in _rows(_sections(cfg, root))}
    assert "global_instructions" not in rows or rows["global_instructions"]["set"] is False


def test_a_fallback_attribution_whose_key_is_missing_says_origin_unknown(tmp_path):
    settings = tmp_path / "settings.json"
    settings.write_text(json.dumps({"present": 1}))
    cfg = tc.ToolConfig(tool="invented-tool", settings={"present": 1, "made_up": "x"}, config_files=[str(settings)])
    cfg.setting_sources["present"] = str(settings)
    rows = {r["key"]: r for r in _rows(_sections(cfg, tmp_path / "elsewhere"))}
    assert rows["present"]["source"] == str(settings) and rows["present"]["line"] == 1
    assert rows["made_up"]["source"] == "" and rows["made_up"]["scope"] == "unknown"


# ─── Documented means "the catalog has an entry" ───────────────────


def _shipped_catalog(monkeypatch):
    shipped = Path(tc.__file__).resolve().parent.parent / "data" / "settings-catalog.yaml"
    monkeypatch.setattr(tc, "SETTINGS_CATALOG_PATH", shipped)


def test_invented_key_is_present_not_in_catalog(homes, monkeypatch):
    _shipped_catalog(monkeypatch)
    (homes["copilot"] / "settings.json").write_text(
        json.dumps({"logLevel": "debug", "zzInventedKeyNobodyDocuments": True}, indent=2)
    )
    root = homes["project"]
    root.mkdir()
    cfg = tc._parse_copilot_home_config(root, tool="copilot-cli")
    rows = {r["key"]: r for r in _rows(_sections(cfg, root))}
    assert rows["zzInventedKeyNobodyDocuments"]["set"] is True
    assert rows["zzInventedKeyNobodyDocuments"]["documented"] is False
    assert rows["logLevel"]["documented"] is True
    assert rows["version"]["documented"] is False  # a detected fact has no catalog entry either


def test_vscode_copilot_group_row_documented_only_when_catalogued(homes, monkeypatch, tmp_path):
    catalog = tmp_path / "catalog.yaml"
    catalog.write_text(
        "tools:\n  copilot:\n    keys:\n"
        "      - {key: github.copilot.chat.agent.enabled, label: Agent mode, section: autonomy, type: boolean, default: true}\n"
    )
    monkeypatch.setattr(tc, "SETTINGS_CATALOG_PATH", catalog)
    user = tmp_path / "vscode-user"
    user.mkdir()
    (user / "settings.json").write_text(
        json.dumps({"github.copilot.chat.agent.enabled": True, "github.copilot.chat.agent.autoFix": True}, indent=2)
    )
    monkeypatch.setattr(tc, "vscode_user_dir", lambda: user)
    root = homes["project"]
    root.mkdir()
    cfg = tc._parse_copilot_config(root, tool="copilot")
    rows = {r["key"]: r for r in _rows(_sections(cfg, root))}
    assert rows["autoFix"]["set"] is True and rows["autoFix"]["documented"] is False  # not in the catalog
    assert rows["enabled"]["documented"] is True


def test_made_up_copilot_rows_are_not_documented(homes, monkeypatch):
    _shipped_catalog(monkeypatch)
    _copilot_fixture(homes)
    (homes["copilot"] / "permissions-config.json").write_text(json.dumps({"locations": {"/x": {"tools": ["a"]}}}))
    cfg = tc._parse_copilot_home_config(homes["project"], tool="copilot-cli")
    rows = {r["key"]: r for r in _rows(_sections(cfg, homes["project"]))}
    assert rows["savedToolApprovals"]["documented"] is False
    assert rows["global_instructions"]["documented"] is False
