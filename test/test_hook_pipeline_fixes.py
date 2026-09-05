"""Regression tests for the hook/OTel/tool-config fixes from the whole-project review.

Each test names the user-visible symptom it guards against.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from aictl._hook_owner import _AICTL_OWNER_MARKER, canonicalize_hook_events, merge_aictl_hooks, strip_aictl_hooks
from aictl.data.token_usage import TokenUsage
from aictl.storage import EventRow

# ── _hook_owner merge helpers ─────────────────────────────────────


def _aictl_rule(cmd: str = "python -m aictl.hook_handler --event X --port 8484") -> dict:
    return {"_aictl_owner": _AICTL_OWNER_MARKER, "matcher": "", "hooks": [{"type": "command", "command": cmd}]}


def test_strip_walks_every_event_and_preserves_malformed_values():
    hooks = {
        "PreToolUse": [_aictl_rule(), {"matcher": "", "hooks": [{"type": "command", "command": "mine.sh"}]}],
        "WorktreeCreate": [_aictl_rule()],  # event no longer in HOOK_EVENTS
        "Notification": {"matcher": "x"},  # hand-edited dict, not a list
        "Stop": "oops",
    }
    out, removed = strip_aictl_hooks(hooks)
    assert removed == 2
    assert "WorktreeCreate" not in out
    assert out["PreToolUse"] == [{"matcher": "", "hooks": [{"type": "command", "command": "mine.sh"}]}]
    assert out["Notification"] == {"matcher": "x"} and out["Stop"] == "oops"
    assert strip_aictl_hooks(None) == ({}, 0)


def test_merge_is_idempotent_and_tags_new_rules():
    new = {"Stop": [{"matcher": "", "hooks": [{"type": "command", "command": "python -m aictl.hook_handler"}]}]}
    once = merge_aictl_hooks({"Stop": [{"matcher": "", "hooks": [{"type": "command", "command": "user.sh"}]}]}, new)
    twice = merge_aictl_hooks(once, new)
    assert once == twice
    assert len(once["Stop"]) == 2
    assert once["Stop"][1]["_aictl_owner"] == _AICTL_OWNER_MARKER
    assert once["Stop"][0]["hooks"][0]["command"] == "user.sh"


def test_canonicalize_hook_events_maps_case_variants():
    out = canonicalize_hook_events(
        {"preToolUse": [1], "PRETOOLUSE": [2], "SessionStart": [3], "BrandNewEvent": [4]},
        ["PreToolUse", "SessionStart"],
    )
    assert out == {"PreToolUse": [1, 2], "SessionStart": [3], "BrandNewEvent": [4]}


# ── Shared token aliases ──────────────────────────────────────────


def test_token_usage_knows_every_spelling_in_the_wild():
    cases = {
        "promptTokens": "input",
        "gen_ai.usage.prompt_tokens": "input",
        "completionTokens": "output",
        "gen_ai.usage.completion_tokens": "output",
        "gen_ai.usage.cache_read_input_tokens": "cache_read",
        "gen_ai.usage.cache_creation_input_tokens": "cache_write",
        "cache_creation_tokens": "cache_write",
    }
    for key, field in cases.items():
        assert getattr(TokenUsage.from_dict({key: "42"}), field) == 42, key


# ── hook_handler: tool pid resolution ─────────────────────────────


def test_tool_pid_walks_past_shells(monkeypatch):
    from aictl import hook_handler as hh

    tree = {100: (50, "bash"), 50: (7, "claude"), 7: (1, "launchd")}
    monkeypatch.setattr(hh, "_parent_of", lambda pid: tree.get(pid))
    assert hh.tool_pid(100) == 50  # bash → claude
    assert hh.tool_pid(50) == 50  # already the tool
    monkeypatch.setattr(hh, "_parent_of", lambda pid: None)  # ps unavailable (Windows)
    assert hh.tool_pid(123) == 123


def test_tool_pid_is_bounded(monkeypatch):
    from aictl import hook_handler as hh

    monkeypatch.setattr(hh, "_parent_of", lambda pid: (pid + 1, "sh"))  # endless shells
    assert hh.tool_pid(1) == 4  # start + max_hops, never loops


def test_parent_of_reads_real_process_tree():
    """Sanity: ps parsing works against the live tree (POSIX only)."""
    from aictl import hook_handler as hh

    if os.name != "posix":
        return
    info = hh._parent_of(os.getpid())
    assert info is not None
    assert info[0] == os.getppid()


# ── tool_config: Claude Code OTel detection ───────────────────────


def test_claude_otel_not_enabled_by_stats_cache_alone(tmp_path, monkeypatch):
    """stats-cache.json exists on every install; it used to mean 'OTel enabled'."""
    from aictl.monitoring import tool_config as tc

    home = tmp_path / "home"
    (home / ".claude").mkdir(parents=True)
    (home / ".claude" / "stats-cache.json").write_text("{}")
    monkeypatch.setattr(tc, "claude_global_dir", lambda: home / ".claude")
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: home))
    for var in (
        "CLAUDE_CODE_ENABLE_TELEMETRY",
        "OTEL_METRICS_EXPORTER",
        "OTEL_LOGS_EXPORTER",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
    ):
        monkeypatch.delenv(var, raising=False)
    otel = tc._detect_otel_from_claude()
    assert otel.enabled is False
    assert otel.file_path.endswith("stats-cache.json")


def test_claude_otel_detected_from_aictl_env_file(tmp_path, monkeypatch):
    """The daemon may run without the shell profile sourced; env.sh is the
    record of what `aictl enable` configured."""
    from aictl.monitoring import tool_config as tc

    home = tmp_path / "home"
    (home / ".config" / "aictl").mkdir(parents=True)
    (home / ".config" / "aictl" / "env.sh").write_text(
        "export CLAUDE_CODE_ENABLE_TELEMETRY=1\nexport OTEL_METRICS_EXPORTER=otlp\n"
        "export OTEL_LOGS_EXPORTER=otlp\nexport OTEL_EXPORTER_OTLP_PROTOCOL=http/json\n"
        "export OTEL_EXPORTER_OTLP_ENDPOINT='http://localhost:8484'\n# generated by aictl\n"
    )
    monkeypatch.setattr(tc, "claude_global_dir", lambda: home / ".claude")
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: home))
    for var in (
        "CLAUDE_CODE_ENABLE_TELEMETRY",
        "OTEL_METRICS_EXPORTER",
        "OTEL_LOGS_EXPORTER",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
    ):
        monkeypatch.delenv(var, raising=False)
    otel = tc._detect_otel_from_claude()
    assert otel.enabled is True
    assert otel.exporter == "otlp-http"
    assert otel.endpoint == "http://localhost:8484"
    assert otel.source == "aictl-env-file"


def test_codex_otel_detection_uses_real_schema():
    from aictl.monitoring.tool_config import _detect_otel_from_codex_toml

    legacy = _detect_otel_from_codex_toml({"otel": {"enabled": True, "endpoint": "http://localhost:8484"}})
    assert legacy.enabled is False  # Codex ignores these keys, so must we

    real = _detect_otel_from_codex_toml(
        {"otel": {"exporter": {"otlp-http": {"endpoint": "http://localhost:8484/v1/logs", "protocol": "json"}}}}
    )
    assert real.enabled is True and real.exporter == "otlp-http"
    assert real.endpoint == "http://localhost:8484/v1/logs"
    assert _detect_otel_from_codex_toml({"otel": {"exporter": "none"}}).enabled is False


def test_claude_model_read_from_settings_and_env(tmp_path, monkeypatch):
    from aictl.monitoring import tool_config as tc

    home = tmp_path / "home"
    (home / ".claude").mkdir(parents=True)
    (home / ".claude" / "settings.json").write_text(json.dumps({"model": "claude-opus-5"}))
    monkeypatch.setattr(tc, "claude_global_dir", lambda: home / ".claude")
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: home))
    monkeypatch.delenv("ANTHROPIC_MODEL", raising=False)
    cfg = tc._parse_claude_code_config(tmp_path / "proj")
    assert cfg is not None and cfg.model == "claude-opus-5"
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-sonnet-5")
    assert tc._parse_claude_code_config(tmp_path / "proj").model == "claude-sonnet-5"


# ── session_flow / analyzer / correlator: SubagentStart + tool_response ──


def test_session_flow_subagent_uses_agent_type_label():
    from aictl.dashboard.session_flow import build_turns_from_hooks

    events = [
        EventRow(ts=1.0, tool="claude-code", kind="hook:UserPromptSubmit", detail={"prompt": "go"}),
        EventRow(
            ts=2.0,
            tool="claude-code",
            kind="hook:SubagentStart",
            detail={"agent_id": "8b1c2d3e-0000-4000-8000-000000000000", "agent_type": "Explore"},
        ),
    ]
    turns = build_turns_from_hooks(events, {})
    agent = [t for turn in turns for t in turn.get("tools", []) if t.get("is_agent")]
    assert agent and agent[0]["args_summary"] == "Explore" and agent[0]["agent_type"] == "Explore"


def test_entity_tracker_records_agent_type():
    from aictl.monitoring.correlator import EntityStateTracker

    tracker = EntityStateTracker()
    tracker.process_event(
        {"ts": 1.0, "tool": "claude-code", "kind": "hook:SessionStart", "detail": {"session_id": "s1"}}
    )
    tracker.process_event(
        {
            "ts": 2.0,
            "tool": "claude-code",
            "kind": "hook:SubagentStart",
            "detail": {"session_id": "s1", "agent_id": "a1", "agent_type": "general-purpose"},
        }
    )
    agent = tracker.sessions["s1"].agents["a1"]
    assert agent.agent_type == "general-purpose"
    assert agent.task == "general-purpose"  # label shown in the team tree


def test_analyzer_reads_tool_response_for_hook_post_tool_use():
    from aictl.analysis.analyzer import SessionAnalyzer

    events = [
        EventRow(ts=1.0, tool="claude-code", kind="hook:UserPromptSubmit", detail={"session_id": "s1", "prompt": "ls"}),
        EventRow(
            ts=2.0,
            tool="claude-code",
            kind="hook:PreToolUse",
            detail={"session_id": "s1", "tool_name": "Bash", "tool_input": {"command": "ls"}},
        ),
        EventRow(
            ts=3.0,
            tool="claude-code",
            kind="hook:PostToolUse",
            detail={"session_id": "s1", "tool_name": "Bash", "tool_response": {"stdout": "a.txt\nb.txt"}},
        ),
    ]
    analyzer = SessionAnalyzer()
    for ev in events:
        ev.session_id = "s1"
        analyzer.ingest_event(ev)
    transcript = analyzer.get_transcript("s1")
    actions = [a for t in transcript.turns for a in t.actions if a.name == "Bash"]
    assert actions and "a.txt" in actions[0].output_summary
