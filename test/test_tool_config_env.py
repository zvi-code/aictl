"""Environment variables in the settings: every env-sourced value names its variable.

The report this guards: Copilot CLI's model came from COPILOT_MODEL, and the
Settings screen showed only "env" as where it was set, with a chip that opened
a file panel. A value from a variable has the source ``env:<NAME>`` (the form
effective_config and context_audit use), and each tool lists every variable it
reads, with secrets masked.
"""

from __future__ import annotations

import json

import pytest
from test_tool_config_agents import _collect, _rows, _write, env  # noqa: F401 - env is a fixture

from aictl.context_audit import _persistent_env
from aictl.monitoring import tool_config as tc
from aictl.monitoring.tool_config import OTelConfig, ToolConfig, normalize_sections
from aictl.orchestrator import slim_tool_configs

REAL_CATALOG = tc.SETTINGS_CATALOG_PATH
SECRET = "ghp_abcdefghijklmnop1234"


@pytest.fixture()
def real_catalog(env, monkeypatch):  # noqa: F811
    monkeypatch.setattr(tc, "SETTINGS_CATALOG_PATH", REAL_CATALOG)
    return env


def test_env_source_is_env_scope():
    assert tc.setting_scope("env:COPILOT_MODEL") == "env"
    assert tc.env_source("COPILOT_MODEL") == "env:COPILOT_MODEL"


def test_claude_anthropic_model_names_its_variable(env, monkeypatch):  # noqa: F811
    monkeypatch.setenv("ANTHROPIC_MODEL", "opus-env")
    user = _write(env["claude_global_dir"] / "settings.json", json.dumps({"model": "sonnet"}))
    model = _rows(_collect(env["proj"])["claude-code"])["model"]
    assert model["value"] == "opus-env" and model["scope"] == "env" and model["source"] == "env:ANTHROPIC_MODEL"
    assert [(c["scope"], c["source"]) for c in model["chain"]] == [("user", str(user)), ("env", "env:ANTHROPIC_MODEL")]
    assert model["chain"][model["wins"]]["source"] == "env:ANTHROPIC_MODEL"


def test_claude_telemetry_rows_name_their_variables(env, monkeypatch):  # noqa: F811
    monkeypatch.setenv("CLAUDE_CODE_ENABLE_TELEMETRY", "1")
    monkeypatch.setenv("OTEL_METRICS_EXPORTER", "otlp")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    _write(env["claude_global_dir"] / "settings.json", '{"model": "opus"}')
    rows = _rows(_collect(env["proj"])["claude-code"], "telemetry")
    assert rows["otel.enabled"]["source"] == "env:CLAUDE_CODE_ENABLE_TELEMETRY"
    assert rows["otel.exporter"]["source"] == "env:OTEL_METRICS_EXPORTER"
    assert rows["otel.endpoint"]["source"] == "env:OTEL_EXPORTER_OTLP_ENDPOINT"
    assert all(r["scope"] == "env" for r in rows.values() if r["key"] != "otel.file_path" or r["set"])


def test_vscode_endpoint_from_the_environment_names_it(env, monkeypatch):  # noqa: F811
    monkeypatch.setenv("COPILOT_OTEL_ENABLED", "true")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
    otel = tc._detect_otel_from_vscode_settings({})
    assert otel.env_names == {"enabled": "COPILOT_OTEL_ENABLED", "endpoint": "OTEL_EXPORTER_OTLP_ENDPOINT"}
    cfg = ToolConfig(tool="x", otel=otel)
    rows = {r["key"]: r for s in normalize_sections(cfg) for r in s["rows"]}
    assert rows["otel.endpoint"]["source"] == "env:OTEL_EXPORTER_OTLP_ENDPOINT"
    assert rows["otel.enabled"]["source"] == "env:COPILOT_OTEL_ENABLED"


def test_no_env_value_anywhere_lacks_its_variable(real_catalog, monkeypatch):
    """Prevention: every row and chain entry at the env layer, for every tool, names its variable."""
    for name, value in (
        ("COPILOT_MODEL", "gpt-6-sol"),
        ("ANTHROPIC_MODEL", "opus-env"),
        ("CLAUDE_CODE_SUBAGENT_MODEL", "haiku"),
        ("CLAUDE_CODE_ENABLE_TELEMETRY", "1"),
        ("OTEL_LOGS_EXPORTER", "otlp"),
        ("COPILOT_OTEL_ENABLED", "true"),
        ("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
    ):
        monkeypatch.setenv(name, value)
    _write(real_catalog["copilot_global_dir"] / "settings.json", '{"model": "gpt-6-astra"}')
    _write(real_catalog["claude_global_dir"] / "agents" / "helper.md", "---\nname: helper\n---\n")
    configs = _collect(real_catalog["proj"])
    seen = 0
    for cfg in configs.values():
        d = cfg.to_dict()
        for section in d["sections"]:
            for row in section["rows"]:
                for entry in [row, *(row.get("chain") or [])]:
                    if entry.get("scope") == "env" and entry.get("source") is not None:
                        seen += 1
                        assert str(entry["source"]).startswith("env:"), (cfg.tool, row["key"], entry)
                assert row["source"] != "env", (cfg.tool, row["key"])
                # Environment variables are listed in env_vars, not as rows of the sections.
                assert not row["key"].startswith("env."), (cfg.tool, row["key"])
        for scope in d["scopes"]:
            if scope["id"] == "env":
                assert scope["path"] == "" and isinstance(scope["vars"], list)
    assert seen >= 4
    copilot = {e["name"]: e for e in configs["copilot-cli"].env_vars}
    assert copilot["COPILOT_MODEL"]["set"] and copilot["COPILOT_MODEL"]["drives"] == [
        {"key": "model", "label": "Model"}
    ]
    claude = {e["name"]: e for e in configs["claude-code"].env_vars}
    assert {"key": "agent/helper", "label": "helper"} in claude["CLAUDE_CODE_SUBAGENT_MODEL"]["drives"]


def test_env_catalog_per_tool(real_catalog):
    expect = {
        "copilot-cli": {
            "COPILOT_MODEL",
            "COPILOT_HOME",
            "COPILOT_GITHUB_TOKEN",
            "GH_TOKEN",
            "GITHUB_TOKEN",
            "COPILOT_OTEL_ENABLED",
            "OTEL_EXPORTER_OTLP_ENDPOINT",
        },
        "copilot-desktop": {"COPILOT_MODEL", "GH_TOKEN"},
        "claude-code": {
            "ANTHROPIC_MODEL",
            "ANTHROPIC_API_KEY",
            "CLAUDE_CONFIG_DIR",
            "CLAUDE_CODE_ENABLE_TELEMETRY",
            "DISABLE_TELEMETRY",
            "OTEL_METRICS_EXPORTER",
        },
        "codex-cli": {"CODEX_HOME", "CODEX_API_KEY", "OPENAI_API_KEY"},
        "copilot": {
            "COPILOT_OTEL_ENABLED",
            "COPILOT_OTEL_ENDPOINT",
            "OTEL_EXPORTER_OTLP_ENDPOINT",
            "OTEL_EXPORTER_OTLP_HEADERS",
        },
        "vscode": {"COPILOT_OTEL_ENABLED", "OTEL_EXPORTER_OTLP_ENDPOINT"},
        "cursor": {"CURSOR_API_KEY"},
    }
    for tool, names in expect.items():
        assert names <= set(tc.env_catalog(tool)), tool


@pytest.mark.parametrize(
    ("name", "value", "masked"),
    [
        ("GH_TOKEN", "abc", True),
        ("ANTHROPIC_API_KEY", "sk-ant-x", True),
        ("COPILOT_PROVIDER_API_KEY_COMMAND", "op read x", True),
        ("CLIENT_SECRET", "x", True),
        ("DB_PASSWORD", "x", True),
        ("ANTHROPIC_AUTH_TOKEN", "x", True),
        ("GOOGLE_APPLICATION_CREDENTIALS", "/x.json", True),
        ("OTEL_EXPORTER_OTLP_HEADERS", "Authorization=Bearer x", True),
        ("COPILOT_PROVIDER_BASE_URL", SECRET, True),  # a token-shaped value under a plain name
        ("COPILOT_MODEL", "gpt-6-sol", False),
    ],
)
def test_env_display_masks_secrets(name, value, masked):
    text, hidden = tc.env_display(name, value)
    assert hidden is masked
    assert (text == tc.ENV_MASK) is masked
    if not masked:
        assert text == value


def test_env_var_rows_order_origin_and_masking(monkeypatch):
    monkeypatch.setattr(
        tc,
        "env_catalog",
        lambda tool: {
            "COPILOT_MODEL": {"label": "Copilot model", "description": "Set the AI model."},
            "COPILOT_HOME": {},
            "GH_TOKEN": {},
        },
    )
    cfg = ToolConfig(
        tool="copilot-cli",
        sections=[
            {"id": "model", "rows": [{"key": "model", "label": "Model", "source": "env:COPILOT_MODEL", "chain": []}]}
        ],
    )
    cfg.env_blocks = {"/p/settings.json": {"GH_TOKEN": SECRET}}
    environ = {"COPILOT_MODEL": "gpt-6-sol", "COPILOT_EXTRA_FLAG": "1", "PATH": "/bin"}
    persisted = {
        "registry:HKEY_CURRENT_USER\\Environment": {"COPILOT_MODEL": "gpt-6-astra", "COPILOT_FROM_PROFILE": "x"}
    }
    rows = tc.env_var_rows(cfg, persisted, environ)
    by = {r["name"]: r for r in rows}
    assert [r["name"] for r in rows if r["set"]] == [
        "COPILOT_MODEL",
        "GH_TOKEN",
        "COPILOT_EXTRA_FLAG",
        "COPILOT_FROM_PROFILE",
    ]
    assert [r["name"] for r in rows if not r["set"]] == ["COPILOT_HOME"]
    assert "PATH" not in by
    model = by["COPILOT_MODEL"]
    assert model["value"] == "gpt-6-sol" and model["in_process"] and model["source"] == "env:COPILOT_MODEL"
    assert model["persisted"] == [
        {"origin": "registry:HKEY_CURRENT_USER\\Environment", "kind": "persisted", "value": "gpt-6-astra"}
    ]
    assert model["drives"] == [{"key": "model", "label": "Model"}] and model["documented"]
    assert by["COPILOT_EXTRA_FLAG"]["documented"] is False
    token = by["GH_TOKEN"]
    assert token["set"] and not token["in_process"] and token["masked"] and token["persisted"][0]["kind"] == "settings"
    assert SECRET not in json.dumps(rows)


def test_claude_settings_env_block_is_listed_masked(env, monkeypatch):  # noqa: F811
    _write(
        env["claude_global_dir"] / "settings.json",
        json.dumps({"env": {"ANTHROPIC_API_KEY": SECRET, "DISABLE_TELEMETRY": "1"}}),
    )
    cfg = _collect(env["proj"])["claude-code"]
    by = {e["name"]: e for e in cfg.env_vars}
    assert by["DISABLE_TELEMETRY"]["set"] and by["DISABLE_TELEMETRY"]["persisted"][0]["kind"] == "settings"
    assert by["ANTHROPIC_API_KEY"]["masked"] and SECRET not in json.dumps(cfg.to_dict())
    assert "env_blocks" not in cfg.to_dict()


def test_persistent_env_reads_shell_profiles(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    (tmp_path / ".zshrc").write_text('export COPILOT_MODEL="gpt-6-sol"\n# export NOT_THIS=1\nFOO=bar\n')
    (tmp_path / ".config" / "fish").mkdir(parents=True)
    (tmp_path / ".config" / "fish" / "config.fish").write_text("set -gx ANTHROPIC_MODEL opus\n")
    found = _persistent_env([])
    assert found[str(tmp_path / ".zshrc")] == {"COPILOT_MODEL": "gpt-6-sol"}
    assert found[str(tmp_path / ".config" / "fish" / "config.fish")] == {"ANTHROPIC_MODEL": "opus"}


def test_env_scope_names_set_variables(monkeypatch):
    monkeypatch.setattr(tc, "env_catalog", lambda tool: {"COPILOT_MODEL": {}, "COPILOT_HOME": {}})
    monkeypatch.setenv("COPILOT_MODEL", "gpt-6-sol")
    monkeypatch.delenv("COPILOT_HOME", raising=False)
    scope = tc._env_scope("copilot-cli", "COPILOT_MODEL overrides the model key of every file.")
    assert scope["path"] == "" and "COPILOT_MODEL" in scope["vars"] and "COPILOT_HOME" not in scope["vars"]
    assert scope["note"].startswith(f"{len(scope['vars'])} set: COPILOT_MODEL")
    cfg = ToolConfig(
        tool="copilot-cli",
        scopes=[scope],
        env_vars=[{"name": "COPILOT_MODEL", "set": True}, {"name": "COPILOT_HOME", "set": True}],
    )
    tc.env_scope_fill(cfg)
    assert scope["vars"] == ["COPILOT_MODEL", "COPILOT_HOME"]
    assert scope["note"] == "2 set: COPILOT_MODEL, COPILOT_HOME. COPILOT_MODEL overrides the model key of every file."


def test_snapshot_carries_only_set_variables():
    cfg = {"tool": "x", "sections": [], "env_vars": [{"name": "A", "set": True}, {"name": "B", "set": False}]}
    assert slim_tool_configs([cfg])[0]["env_vars"] == [{"name": "A", "set": True}]


def test_otel_record_without_names_stays_env_scope():
    cfg = ToolConfig(tool="x", otel=OTelConfig(enabled=True, source="env-var"))
    rows = [r for s in normalize_sections(cfg) for r in s["rows"]]
    assert rows and all(r["scope"] == "env" for r in rows)
