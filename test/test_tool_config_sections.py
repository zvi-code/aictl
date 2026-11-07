# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for normalize_sections: one section/row shape for every tool's config."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.data.schema import load_tool_configs
from aictl.monitoring import tool_config as tc
from aictl.monitoring.tool_config import (
    SECTION_ORDER,
    OTelConfig,
    ToolConfig,
    normalize_key,
    normalize_sections,
    setting_label,
    value_kind,
)

ROW_KEYS = {"key", "label", "value", "kind", "source", "danger", "note", "scope", "line", "chain", "wins"}


def _rows(sections: list[dict], section_id: str | None = None) -> list[dict]:
    return [r for s in sections if section_id in (None, s["id"]) for r in s["rows"]]


def _section(sections: list[dict], section_id: str) -> dict:
    return next(s for s in sections if s["id"] == section_id)


@pytest.fixture()
def isolated_home(tmp_path, monkeypatch):
    """Point every platform path the parsers read at empty temp folders."""
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("USERPROFILE", str(home))
    for env in (
        "ANTHROPIC_MODEL",
        "CLAUDE_CODE_ENABLE_TELEMETRY",
        "COPILOT_OTEL_ENABLED",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
    ):
        monkeypatch.delenv(env, raising=False)
    dirs = {}
    for name in (
        "claude_global_dir",
        "codex_global_dir",
        "copilot_global_dir",
        "cursor_user_dir",
        "vscode_user_dir",
        "windsurf_global_dir",
        "gemini_global_dir",
    ):
        d = tmp_path / name
        d.mkdir()
        dirs[name] = d
        monkeypatch.setattr(f"aictl.monitoring.tool_config.{name}", lambda d=d: d, raising=False)
        monkeypatch.setattr(f"aictl.platforms.{name}", lambda d=d: d)
    desktop_cfg = tmp_path / "claude_desktop_config.json"
    monkeypatch.setattr("aictl.monitoring.tool_config.claude_desktop_config", lambda: desktop_cfg)
    dirs["claude_desktop_config"] = desktop_cfg
    monkeypatch.setattr("aictl.monitoring.tool_config._macos_login_items", lambda: set())
    monkeypatch.setattr("aictl.monitoring.tool_config.shutil.which", lambda _name: None)
    return dirs


# ─── Section order and group mapping ────────────────────────────


def test_sections_follow_fixed_order_and_skip_empty():
    cfg = ToolConfig(
        tool="x",
        model="m-1",
        settings={"zzz": 1, "installMethod": "npm"},
        mcp_servers=["a"],
        extensions=["ext"],
        otel=OTelConfig(enabled=True, exporter="otlp-http", source="vscode-settings"),
        feature_groups={"Hooks": {"enabled": True}, "Safety": {"globalAutoApprove": False}},
    )
    ids = [s["id"] for s in normalize_sections(cfg)]
    assert ids == ["model", "telemetry", "autonomy", "hooks", "mcp", "extensions", "startup", "other"]
    order = [sid for sid, _t in SECTION_ORDER]
    assert ids == [sid for sid in order if sid in ids]
    titles = {s["id"]: s["title"] for s in normalize_sections(cfg)}
    assert titles["autonomy"] == "Autonomy and safety"
    assert titles["mcp"] == "MCP servers"


def test_empty_config_has_no_sections():
    assert normalize_sections(ToolConfig(tool="x")) == []


@pytest.mark.parametrize(
    ("group", "section_id"),
    [
        ("Agent", "autonomy"),
        ("Agent Mode", "autonomy"),
        ("Code (Agent)", "autonomy"),
        ("Cowork (Autonomous)", "autonomy"),
        ("Safety", "autonomy"),
        ("Claude (Anthropic)", "autonomy"),
        ("Hooks", "hooks"),
        ("Context Files", "context"),
        ("File Locations", "context"),
        ("MCP", "mcp"),
        ("Debug Logging", "other"),
        ("Chat", "other"),
        ("General", "other"),
        ("UI", "other"),
        ("Something New", "other"),
    ],
)
def test_group_maps_to_section(group, section_id):
    cfg = ToolConfig(tool="x", feature_groups={group: {"someKey": "v"}})
    sections = normalize_sections(cfg)
    assert [s["id"] for s in sections] == [section_id]


@pytest.mark.parametrize(
    ("key", "section_id"),
    [
        ("effortLevel", "model"),
        ("model_reasoning_effort", "model"),
        ("telemetry", "telemetry"),
        ("permissions", "autonomy"),
        ("trustedFolders", "autonomy"),
        ("hooks", "hooks"),
        ("disabled_mcp_servers", "mcp"),
        ("global_instructions", "context"),
        ("installMethod", "startup"),
        ("hasCompletedOnboarding", "startup"),
        ("version", "startup"),
        ("theme", "other"),
    ],
)
def test_flat_key_maps_to_section(key, section_id):
    sections = normalize_sections(ToolConfig(tool="x", settings={key: "v"}))
    assert [s["id"] for s in sections] == [section_id]


def test_row_shape():
    cfg = ToolConfig(tool="x", settings={"a": True, "b": 3, "c": [1], "d": {"k": 1}, "e": None, "f": "/tmp/x"})
    rows = _rows(normalize_sections(cfg))
    assert all(set(r) == ROW_KEYS for r in rows)
    kinds = {r["key"]: r["kind"] for r in rows}
    assert kinds == {"a": "flag", "b": "number", "c": "list", "d": "map", "e": "text", "f": "path"}
    values = {r["key"]: r["value"] for r in rows}
    assert values["c"] == [1] and values["d"] == {"k": 1} and values["e"] is None


@pytest.mark.parametrize(
    ("value", "kind"),
    [
        ("http://localhost:4318", "path"),
        ("~/notes.md", "path"),
        ("./rel/file", "path"),
        ("C:\\Users\\me\\x.json", "path"),
        ("auto", "text"),
        (1.5, "number"),
        (False, "flag"),
    ],
)
def test_value_kind(value, kind):
    assert value_kind(value) == kind


# ─── De-duplication ──────────────────────────────────────────────


def test_gemini_vim_mode_appears_once(isolated_home):
    gemini_dir = isolated_home["gemini_global_dir"]
    settings_path = gemini_dir / "settings.json"
    settings_path.write_text(json.dumps({"general": {"vimMode": True}, "model": {"name": "gemini-2.5-pro"}}))
    cfg = tc._parse_generic_config(Path("."), "gemini-cli", load_tool_configs()["gemini-cli"])
    assert cfg is not None
    # The parser keeps both forms; the sections show one.
    assert cfg.settings["vim_mode"] is True
    assert cfg.feature_groups["General"]["vimMode"] is True
    assert str(settings_path) in cfg.config_files
    sections = normalize_sections(cfg)
    vim = [r for r in _rows(sections) if normalize_key(r["key"]) == "vimmode"]
    assert len(vim) == 1
    assert vim[0]["key"] == "vimMode"
    assert vim[0]["label"] == "Vim mode"
    assert vim[0]["source"] == str(settings_path)
    first_model = _section(sections, "model")["rows"][0]
    assert first_model["key"] == "model" and first_model["value"] == "gemini-2.5-pro"
    assert first_model["source"] == str(settings_path)


def test_copilot_otel_settings_dropped_in_favour_of_otel_rows(isolated_home):
    vscode_dir = isolated_home["vscode_user_dir"]
    (vscode_dir / "settings.json").write_text(
        json.dumps(
            {
                "github.copilot.chat.otel.enabled": True,
                "github.copilot.chat.otel.exporterType": "otlp-http",
                "github.copilot.chat.otel.otlpEndpoint": "http://localhost:4318",
                "github.copilot.chat.otel.captureContent": True,
                "github.copilot.chat.claudeAgent.allowDangerouslySkipPermissions": True,
                "github.copilot.chat.agentDebugLog.enabled": True,
            }
        )
    )
    cfg = tc._parse_copilot_config(Path("/nonexistent-root"))
    assert cfg is not None
    assert "chat.otel.otlpEndpoint" in cfg.settings  # existing field unchanged
    sections = normalize_sections(cfg)
    rows = _rows(sections)
    assert not [r for r in rows if "chat.otel" in r["key"]]
    telemetry = _section(sections, "telemetry")["rows"]
    assert all(r["key"].startswith("otel.") for r in telemetry)
    by_label = {r["label"]: r for r in telemetry}
    assert by_label["Endpoint"]["value"] == "http://localhost:4318"
    assert by_label["Endpoint"]["kind"] == "path"
    assert by_label["Endpoint"]["source"] == str(vscode_dir / "settings.json")
    capture = by_label["Capture content"]
    assert capture["danger"] is True
    assert capture["note"] == "Full prompt and response text is sent to the telemetry collector."
    # The raw setting and the "Claude (Anthropic)" group row show one value: one row.
    skip = [r for r in rows if "skippermissions" in normalize_key(r["key"])]
    assert len(skip) == 1 and skip[0]["danger"] is True
    debug = [r for r in rows if "debuglog" in normalize_key(r["key"])]
    assert debug == []  # shown as the "Debug Logging" group's "enabled" row
    assert any(r["label"] == "Debug logging enabled" for r in _rows(sections, "other"))


def test_group_rows_win_over_flat_settings():
    cfg = ToolConfig(
        tool="claude-desktop",
        feature_groups={"Code (Agent)": {"trustedFolders": 2}},
        settings={"trustedFolders": 2},
    )
    rows = [r for r in _rows(normalize_sections(cfg)) if r["key"] == "trustedFolders"]
    assert len(rows) == 1
    assert rows[0]["label"] == "Trusted folders"


def test_same_key_in_two_groups_is_kept():
    cfg = ToolConfig(tool="vscode", feature_groups={"Agent": {"enabled": True}, "Hooks": {"enabled": False}})
    sections = normalize_sections(cfg)
    assert _section(sections, "autonomy")["rows"][0]["label"] == "Agent enabled"
    assert _section(sections, "hooks")["rows"][0]["label"] == "Hooks enabled"


def test_normalize_key_strips_tool_prefixes():
    assert normalize_key("vim_mode") == normalize_key("vimMode") == "vimmode"
    assert normalize_key("chat.agent.maxRequests") == "maxrequests"
    assert normalize_key("agent_maxRequests") == "maxrequests"
    assert normalize_key("github.copilot.chat.otel.otlpEndpoint") == "otelotlpendpoint"
    assert normalize_key("debug_requestLoggerMaxEntries") == "requestloggermaxentries"


def test_flat_model_key_dropped_when_model_row_exists():
    cfg = ToolConfig(tool="x", model="m-1", settings={"model": "m-1", "Model": "m-1"})
    rows = _rows(normalize_sections(cfg))
    assert [r["key"] for r in rows] == ["model"]


# ─── Labels ──────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("key", "label"),
    [
        ("otlpEndpoint", "OTLP endpoint"),
        ("chat.otel.otlpEndpoint", "OTLP endpoint"),
        ("maxRequests", "Max requests per turn"),
        ("globalAutoApprove", "Approve every tool call"),
        ("skipPermissions", "Skip permission checks"),
        ("allowDangerouslySkipPermissions", "Skip permission checks"),
        ("autoReply", "Answer agent questions automatically"),
        ("terminalSandbox", "Terminal sandbox"),
        ("hasCompletedOnboarding", "Onboarding completed"),
        ("installMethod", "Install method"),
        ("effortLevel", "Reasoning effort"),
        ("effort", "Reasoning effort"),
        ("model_reasoning_effort", "Reasoning effort"),
        ("disabled_mcp_servers", "Disabled MCP servers"),
        ("global_instructions", "Global instructions file"),
        ("trustedFolders", "Trusted folders"),
        ("useResponsesApi", "Responses API"),
    ],
)
def test_label_table(key, label):
    assert setting_label(key) == label


@pytest.mark.parametrize(
    ("key", "label"),
    [
        ("vim_mode", "Vim mode"),
        ("lineNumbers", "Line numbers"),
        ("mcpServerUrl", "MCP server URL"),
        ("otelApiKey", "OTel API key"),
        ("npmScriptsEnabled", "npm scripts enabled"),
        ("typescriptLanguage", "TypeScript language"),
        ("vscodeTheme", "VS Code theme"),
        ("showUI", "Show UI"),
        ("chat.edits.temporalContext.enabled", "Edits temporal context enabled"),
        ("isReady?", "Is ready"),
    ],
)
def test_generic_labels(key, label):
    assert setting_label(key) == label
    assert not setting_label(key).endswith("?")


# ─── Danger ──────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("key", "value"),
    [
        ("globalAutoApprove", True),
        ("skipPermissions", True),
        ("allowDangerouslySkipPermissions", True),
        ("autoReply", True),
        ("terminalAutoApprove", True),
        ("autoApproveNpmScripts", True),
        ("allBrowserActions", True),
        ("terminalSandbox", False),
    ],
)
def test_danger_rows_have_notes(key, value):
    cfg = ToolConfig(tool="x", feature_groups={"Safety": {key: value}})
    row = _rows(normalize_sections(cfg))[0]
    assert row["danger"] is True
    assert row["note"].endswith(".") and ". " not in row["note"]  # one sentence
    safe = ToolConfig(tool="x", feature_groups={"Safety": {key: not value}})
    safe_row = _rows(normalize_sections(safe))[0]
    assert safe_row["danger"] is False
    assert safe_row["note"] == ""


def test_capture_content_off_is_not_danger():
    cfg = ToolConfig(tool="x", otel=OTelConfig(enabled=True, exporter="file", source="codex-toml"))
    rows = _section(normalize_sections(cfg), "telemetry")["rows"]
    assert not any(r["danger"] for r in rows)
    assert [r["label"] for r in rows] == ["Export enabled", "Exporter", "Detected from"]


def test_telemetry_off_row_when_otel_empty():
    cfg = ToolConfig(tool="copilot-cli", settings={"telemetry": "not configured", "version": "1.0"})
    telemetry = _section(normalize_sections(cfg), "telemetry")["rows"]
    assert len(telemetry) == 1
    assert telemetry[0]["kind"] == "flag" and telemetry[0]["value"] is False


# ─── Model, MCP, extensions, startup ─────────────────────────────


def test_model_row_first_then_configurable_models():
    cfg = ToolConfig(
        tool="copilot",
        model="gpt-5",
        config_files=["/u/settings.json"],
        settings={"effortLevel": "high"},
        configurable_models=[
            {
                "label": "Plan agent",
                "key": "chat.planAgent.defaultModel",
                "value": "GPT-5 (copilot)",
                "source": "user",
                "default_hint": "default model",
                "description": "Default model used by the Plan agent.",
            }
        ],
    )
    rows = _section(normalize_sections(cfg), "model")["rows"]
    assert rows[0] == {
        "key": "model",
        "label": "Model",
        "value": "gpt-5",
        "kind": "text",
        "source": "/u/settings.json",
        "danger": False,
        "note": "",
        "scope": "user",
        "line": 0,  # the file does not exist
        "chain": [{"scope": "user", "value": "gpt-5", "source": "/u/settings.json", "line": 0}],
        "wins": 0,
    }
    plan = rows[1]
    assert plan["label"] == "Plan agent" and plan["source"] == "user"
    assert plan["scope"] == "user"  # a row that already knows its scope keeps it
    assert plan["note"] == "Default model used by the Plan agent."
    assert rows[2]["label"] == "Reasoning effort"


def test_mcp_extensions_startup_rows():
    cfg = ToolConfig(tool="x", mcp_servers=["a", "b"], extensions=["e"], auto_update=False, launch_at_startup=True)
    sections = normalize_sections(cfg)
    assert _section(sections, "mcp")["rows"][0]["value"] == ["a", "b"]
    assert _section(sections, "mcp")["rows"][0]["kind"] == "list"
    assert _section(sections, "extensions")["rows"][0]["value"] == ["e"]
    startup = {r["key"]: r["value"] for r in _section(sections, "startup")["rows"]}
    assert startup == {"auto_update": False, "launch_at_startup": True}


def test_credentials_never_become_rows():
    cfg = ToolConfig(tool="x", settings={"apiKey": "sk-1", "auth_token": "t", "budgetTokens": 10})
    keys = [r["key"] for r in _rows(normalize_sections(cfg))]
    assert keys == ["budgetTokens"]


# ─── Sources and serialization ──────────────────────────────────


def test_claude_code_sources(isolated_home, tmp_path):
    user = isolated_home["claude_global_dir"] / "settings.json"
    user.write_text(json.dumps({"model": "opus", "effortLevel": "high", "hooks": {"Stop": [{"command": "secret"}]}}))
    account = Path.home() / ".claude.json"
    account.write_text(json.dumps({"installMethod": "native", "autoUpdates": True}))
    cfg = tc._parse_claude_code_config(tmp_path / "proj")
    assert cfg is not None
    assert cfg.config_files == [str(user), str(account)]
    rows = {r["key"]: r for r in _rows(normalize_sections(cfg))}
    assert rows["model"]["source"] == str(user)
    assert rows["effortLevel"]["source"] == str(user)
    assert rows["installMethod"]["source"] == str(account)
    assert rows["auto_update"]["source"] == str(account)
    assert rows["hooks"]["value"] == "configured"  # hook commands are not copied


def test_to_dict_always_emits_sections():
    d = ToolConfig(tool="x").to_dict()
    assert d["sections"] == []
    assert "setting_sources" not in d and "covered_keys" not in d
    cfg = ToolConfig(tool="x", model="m")
    cfg.sections = normalize_sections(cfg)
    assert cfg.to_dict()["sections"][0]["rows"][0]["value"] == "m"


def test_collect_tool_configs_fills_sections_for_every_tool(isolated_home, tmp_path):
    (isolated_home["vscode_user_dir"] / "settings.json").write_text(json.dumps({"chat.agent.maxRequests": 10}))
    (isolated_home["codex_global_dir"] / "config.toml").write_text('model = "gpt-5"\n')
    (isolated_home["gemini_global_dir"] / "settings.json").write_text(json.dumps({"general": {"vimMode": True}}))
    proj = tmp_path / "proj"
    proj.mkdir()
    configs = tc.collect_tool_configs(proj)
    tools = {c.tool for c in configs}
    assert {"vscode", "codex-cli", "gemini-cli", "copilot365"} <= tools
    for c in configs:
        d = c.to_dict()
        assert isinstance(d["sections"], list), c.tool
        assert c.sections == normalize_sections(c), c.tool
        for s in d["sections"]:
            assert s["rows"], c.tool
            assert all(set(r) == ROW_KEYS for r in s["rows"]), c.tool
    codex = next(c for c in configs if c.tool == "codex-cli")
    assert codex.config_files == [str(isolated_home["codex_global_dir"] / "config.toml")]
    assert codex.sections[0]["rows"][0]["value"] == "gpt-5"


# ─── Scope, line and override chain ─────────────────────────────


@pytest.mark.parametrize(
    ("source", "scope"),
    [
        ("", "default"),
        ("user", "user"),
        ("workspace", "workspace"),
        ("/home/me/.claude/settings.json", "user"),
        ("/work/proj/.claude/settings.json", "project"),
        ("/work/proj/.vscode/settings.json", "workspace"),
        ("/work/proj/.vscodex/settings.json", "project"),
        ("/Library/Application Support/ClaudeCode/managed-settings.json", "managed"),
    ],
)
def test_setting_scope(source, scope):
    assert tc.setting_scope(source, "/work/proj") == scope


def test_row_scopes_from_sources():
    cfg = ToolConfig(
        tool="x",
        project_root="/work/proj",
        settings={"a": 1, "b": 2, "c": 3, "d": 4},
        setting_sources={
            "a": str(Path.home() / ".x" / "settings.json"),
            "b": "/work/proj/.x/settings.json",
            "c": "/work/proj/.vscode/settings.json",
            "d": "",
        },
    )
    scopes = {r["key"]: r["scope"] for r in _rows(normalize_sections(cfg))}
    assert scopes == {"a": "user", "b": "project", "c": "workspace", "d": "default"}


def test_env_var_telemetry_rows_are_env_scope():
    cfg = ToolConfig(tool="x", otel=OTelConfig(enabled=True, exporter="otlp-grpc", source="env-var"))
    rows = _section(normalize_sections(cfg), "telemetry")["rows"]
    assert rows and all(r["scope"] == "env" for r in rows)


def test_line_of_json_key(tmp_path):
    f = tmp_path / "settings.json"
    f.write_text('{\n  "model": "opus",\n  "effortLevel": "high"\n}\n')
    cfg = ToolConfig(tool="x", settings={"effortLevel": "high", "unknownKey": 1}, config_files=[str(f)])
    rows = {r["key"]: r for r in _rows(normalize_sections(cfg))}
    assert rows["effortLevel"]["line"] == 3
    assert rows["effortLevel"]["chain"] == [{"scope": "user", "value": "high", "source": str(f), "line": 3}]
    assert rows["unknownKey"]["line"] == 0


def test_line_of_dotted_vscode_key(tmp_path):
    f = tmp_path / "settings.json"
    f.write_text('{\n  "editor.enabled": true,\n  "chat.tools.global.autoApprove": true\n}\n')
    assert tc.find_key_line(f.read_text(), "chat.tools.global.autoApprove") == 3
    assert tc.find_key_line(f.read_text(), "chat.agent.enabled") == 0
    cfg = ToolConfig(tool="x", settings={"chat.tools.global.autoApprove": True}, config_files=[str(f)])
    assert _rows(normalize_sections(cfg))[0]["line"] == 3


def test_line_of_toml_key(tmp_path):
    f = tmp_path / "config.toml"
    f.write_text('model = "gpt-5"\n\n[features]\nweb_search = true\n')
    cfg = ToolConfig(tool="x", model="gpt-5", features={"web_search": True}, config_files=[str(f)])
    rows = {r["key"]: r for r in _rows(normalize_sections(cfg))}
    assert rows["model"]["line"] == 1
    assert rows["web_search"]["line"] == 4


def test_line_never_reads_a_file_outside_config_files(tmp_path):
    f = tmp_path / "other.json"
    f.write_text('{"a": 1}')
    cfg = ToolConfig(tool="x", settings={"a": 1}, setting_sources={"a": str(f)})
    assert _rows(normalize_sections(cfg))[0]["line"] == 0


def test_file_texts_are_read_once_and_not_kept(tmp_path, monkeypatch):
    f = tmp_path / "settings.json"
    f.write_text('{"a": 1, "b": 2, "note": "TEXT-MARKER"}')
    reads = []
    real = Path.read_text

    def counting(self, *args, **kwargs):
        reads.append(str(self))
        return real(self, *args, **kwargs)

    monkeypatch.setattr(Path, "read_text", counting)
    cfg = ToolConfig(tool="x", settings={"a": 1, "b": 2}, config_files=[str(f)])
    texts: dict = {}
    normalize_sections(cfg, texts)
    normalize_sections(cfg, texts)
    assert reads == [str(f)]
    cfg.sections = normalize_sections(cfg, texts)
    assert "TEXT-MARKER" not in json.dumps(cfg.to_dict())


def test_claude_code_project_overrides_user_chain(isolated_home, tmp_path):
    user = isolated_home["claude_global_dir"] / "settings.json"
    user.write_text('{\n  "model": "sonnet",\n  "hooks": {"Stop": [{"command": "secret-cmd"}]}\n}\n')
    proj = tmp_path / "proj"
    (proj / ".claude").mkdir(parents=True)
    proj_file = proj / ".claude" / "settings.json"
    proj_file.write_text('{\n  "hooks": {},\n  "model": "opus"\n}\n')
    configs = {c.tool: c for c in tc.collect_tool_configs(proj)}
    rows = {r["key"]: r for r in _rows(configs["claude-code"].sections)}
    model = rows["model"]
    assert model["value"] == "opus"
    assert model["scope"] == "project"
    assert model["chain"] == [
        {"scope": "user", "value": "sonnet", "source": str(user), "line": 2},
        {"scope": "project", "value": "opus", "source": str(proj_file), "line": 3},
    ]
    assert model["wins"] == 1
    assert model["line"] == 3
    dumped = json.dumps(configs["claude-code"].to_dict())
    assert "secret-cmd" not in dumped  # hook commands never reach the result
    assert "setting_values" not in dumped and "project_root" not in dumped


def test_vscode_workspace_overrides_user_chain(isolated_home, tmp_path):
    user = isolated_home["vscode_user_dir"] / "settings.json"
    user.write_text('{\n  "chat.tools.global.autoApprove": false\n}\n')
    proj = tmp_path / "proj"
    (proj / ".vscode").mkdir(parents=True)
    ws = proj / ".vscode" / "settings.json"
    ws.write_text('{\n  "x": 1,\n  "chat.tools.global.autoApprove": true\n}\n')
    configs = {c.tool: c for c in tc.collect_tool_configs(proj)}
    row = next(r for r in _rows(configs["vscode"].sections) if r["key"] == "globalAutoApprove")
    assert row["source"] == str(ws) and row["scope"] == "workspace"
    assert [(e["scope"], e["value"], e["line"]) for e in row["chain"]] == [("user", False, 2), ("workspace", True, 3)]
    assert row["wins"] == 1 and row["line"] == 3
    default_row = next(r for r in _rows(configs["vscode"].sections) if r["key"] == "maxRequests")
    assert default_row["scope"] == "default" and default_row["chain"][0]["scope"] == "default"
