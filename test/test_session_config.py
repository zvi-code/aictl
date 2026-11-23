"""The configuration a session ran under: Copilot CLI config.* events, launch flags, and the sessions.config view.

Every fixture is invented text in tmp_path; nothing here reads a real tool folder.
"""

from __future__ import annotations

import json

import pytest
from kusto_replay import NOW
from test_board_facts import COPILOT_SID, copilot_events, ev, write_lines
from test_process_family_binding import (
    BIRTH,
    NAME,
    NATIVE,
    copilot_session,
    correlator,
    sample,
    store,
)
from test_process_family_binding import COPILOT_SID as BOUND_SID
from test_session_investigation import Facts, ingester, one, table

from aictl.dashboard.projections.history import HistoryScope
from aictl.monitoring.launch_flags import launch_flags
from aictl.monitoring.live_sources import _flag_evidence
from aictl.monitoring.session import ProcessInfo
from aictl.secret_mask import PLACEHOLDER


@pytest.fixture(autouse=True)
def _own_tool_homes(tmp_path, monkeypatch):
    """Tool files these tests write stay in the test's folder, not in the home every test shares."""
    monkeypatch.setenv("COPILOT_HOME", str(tmp_path / "copilot"))
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(tmp_path / "claude-home"))


FLAGS_A = ["FLAG_ALPHA", "FLAG_BETA"]
CONTEXT = "alpha:1;beta_gamma:2;"


def config_lines() -> list[dict]:
    return [
        ev("session.start", 900, {"sessionId": COPILOT_SID, "selectedModel": "model-a", "contextTier": "long_context",
                                  "copilotVersion": "1.0.1", "producer": "copilot-agent", "version": 1,
                                  "context": {"cwd": "/work/cli", "gitRoot": "/work/cli", "branch": "main"}}),
        ev("session.model_change", 899, {"newModel": "model-a", "reasoningEffort": "high", "contextTier": None,
                                         "source": "startup"}),
        ev("model.captured_assignment_context", 898, {"kind": "captured_assignment_context",
                                                      "assignmentContext": CONTEXT}),
        ev("user.message", 800, {"content": "first ask", "interactionId": "i1"}),
        ev("model.model_call_success", 795, {"requestSettings": {"enabledFeatureFlags": FLAGS_A}}),
        ev("model.model_call_success", 794, {"requestSettings": {"enabledFeatureFlags": list(reversed(FLAGS_A))}}),
        ev("session.info", 790, {"infoType": "notification", "message": "a notice"}),
        ev("session.info", 789, {"infoType": "managed_model_override", "message": "A managed setting replaced the model"}),
        ev("session.model_change", 788, {"previousModel": "model-a", "newModel": "model-b",
                                         "previousReasoningEffort": "high", "reasoningEffort": "xhigh",
                                         "source": "managed_settings"}),
        ev("user.message", 700, {"content": "second ask", "interactionId": "i2"}),
        ev("session.mode_changed", 699, {"previousMode": "interactive", "newMode": "autopilot"}),
        ev("session.permissions_changed", 698, {"previousMode": "manual", "mode": "allow-all"}),
        ev("session.permissions_changed", 697, {"previousAllowAllPermissionMode": "off", "allowAllPermissionMode": "on",
                                                "previousAllowAllPermissions": False, "allowAllPermissions": True}),
        ev("model.model_call_success", 696, {"requestSettings": {"enabledFeatureFlags": [*FLAGS_A, "FLAG_GAMMA"]}}),
        ev("subagent.configured", 695, {"model": "model-c", "reasoningEffort": "high", "multiTurn": False},
           agentId="sub-1"),
        ev("session.model_change", 694, {"newModel": "model-c", "source": "agent"}, agentId="sub-1"),
        ev("session.context_changed", 690, {"cwd": "/work/other", "branch": "topic"}),
        ev("session.resume", 600, {"selectedModel": "model-b", "reasoningEffort": "xhigh", "contextTier": None,
                                   "context": {"cwd": "/work/other"}}),
    ]


def read_config(tmp_path):
    facts = Facts()
    ingester(facts, tmp_path).poll()
    return facts, [r for r in table(facts, "context_events", session_id=COPILOT_SID) if r["kind"].startswith("config.")]


def detail(row: dict) -> dict:
    return json.loads(row["detail"]) if row["detail"] else {}


class TestCopilotConfigEvents:
    def test_every_setting_and_change_is_a_row_with_its_turn_and_fields_as_reported(self, tmp_path):
        write_lines(copilot_events(tmp_path), config_lines())
        _, rows = read_config(tmp_path)
        rows.sort(key=lambda r: r["ts"])
        assert [r["kind"] for r in rows] == [
            "config.session_start", "config.model_change", "config.assignment_context", "config.feature_flags",
            "config.managed_override", "config.model_change", "config.mode_change", "config.permissions_change",
            "config.permissions_change", "config.feature_flags", "config.subagent_configured", "config.model_change",
            "config.context_changed", "config.session_resume",
        ]
        start = rows[0]
        assert (start["turn_index"], start["prompt_id"], start["agent_id"]) == (None, "", "")
        # reasoningEffort was not reported at start: it is absent, not filled in.
        assert detail(start) == {"selectedModel": "model-a", "contextTier": "long_context", "copilotVersion": "1.0.1",
                                 "producer": "copilot-agent", "version": 1,
                                 "context": {"cwd": "/work/cli", "gitRoot": "/work/cli", "branch": "main"}}
        assert detail(rows[1]) == {"newModel": "model-a", "reasoningEffort": "high", "source": "startup"}
        assert rows[1]["trigger"] == "startup"
        override, managed = rows[4], rows[5]
        assert (override["turn_index"], override["prompt_id"]) == (1, "i1")
        assert detail(override) == {"infoType": "managed_model_override", "message": "A managed setting replaced the model"}
        assert detail(managed) == {"previousModel": "model-a", "newModel": "model-b", "previousReasoningEffort": "high",
                                   "reasoningEffort": "xhigh", "source": "managed_settings"}
        assert (rows[6]["turn_index"], rows[6]["prompt_id"]) == (2, "i2")
        assert detail(rows[6]) == {"previousMode": "interactive", "newMode": "autopilot"}
        assert detail(rows[7]) == {"previousMode": "manual", "mode": "allow-all"}
        assert detail(rows[8])["allowAllPermissions"] is True
        sub_config, sub_model = rows[10], rows[11]
        assert (sub_config["agent_id"], sub_model["agent_id"]) == ("sub-1", "sub-1")
        assert detail(sub_config) == {"model": "model-c", "reasoningEffort": "high", "multiTurn": False}
        assert detail(rows[12]) == {"cwd": "/work/other", "branch": "topic"}
        assert detail(rows[13])["selectedModel"] == "model-b"

    def test_feature_flags_are_a_row_only_when_the_set_changes(self, tmp_path):
        write_lines(copilot_events(tmp_path), config_lines())
        _, rows = read_config(tmp_path)
        flags = sorted((r for r in rows if r["kind"] == "config.feature_flags"), key=lambda r: r["ts"])
        first, second = (detail(r) for r in flags)
        assert first["flags"] == FLAGS_A and first["count"] == 2 and "previous_hash" not in first
        assert second["flags"] == ["FLAG_ALPHA", "FLAG_BETA", "FLAG_GAMMA"]
        assert second["previous_hash"] == first["hash"] != second["hash"]

    def test_an_assignment_context_keeps_its_hash_and_size_never_its_text(self, tmp_path):
        write_lines(copilot_events(tmp_path), config_lines())
        _, rows = read_config(tmp_path)
        row = one([r for r in rows if r["kind"] == "config.assignment_context"])
        assert detail(row)["bytes"] == len(CONTEXT) and len(detail(row)["hash"]) == 16
        assert "alpha:1" not in json.dumps(row)

    def test_reading_the_file_again_stores_the_same_keys(self, tmp_path):
        write_lines(copilot_events(tmp_path), config_lines())
        _, first = read_config(tmp_path)
        facts, second = read_config(tmp_path)
        assert sorted(r["dedup_key"] for r in first) == sorted(r["dedup_key"] for r in second)
        ingester(facts, tmp_path).poll()
        assert len([r for r in table(facts, "context_events") if r["kind"].startswith("config.")]) == len(first)


# ── Launch flags ──────────────────────────────────────────────────


COPILOT_ARGV = (
    NATIVE, "--model", "model-x", "--reasoning-effort=high", "--mode", "plan", "--autopilot", "--agent", "reviewer",
    "--add-dir", "/work/a", "--allow-all-tools", "--allow-tool", "shell(git)", "write", "--deny-tool", "shell(rm)",
    "--allow-url", "https://user:pw@example.test/x?token=abc", "--yolo", "--sandbox",
    "--enable-mcp-server", "srv-a", "--disable-mcp-server=srv-b", "--disable-builtin-mcps",
    "--additional-mcp-config", '{"mcpServers": {"s": {"env": {"TOKEN": "ghp_abcdefgh12345678"}}}}',
    "--available-tools", "view", "--excluded-tools", "bash", "--experimental", "--enable-memory",
    "--no-custom-instructions", "--plugin-dir", "/work/plugins", "--context", "long_context", "--auto-tier", "fast",
    "--dynamic-retrieval", "code=on", "--secret-env-vars", "MY_TOKEN", "--trust-folder",
    "-p", "PRIVATE PROMPT TEXT", "--resume", NAME,
)


def entries(flags: list[dict]) -> list[tuple[str, str]]:
    return [(f["flag"], f["value"]) for f in flags]


class TestLaunchFlags:
    def test_copilot_flags_that_change_configuration_are_read_and_masked(self):
        flags = launch_flags("copilot-cli", COPILOT_ARGV)
        got = entries(flags)
        assert got[:12] == [
            ("--model", "model-x"), ("--reasoning-effort", "high"), ("--mode", "plan"), ("--autopilot", ""),
            ("--agent", "reviewer"), ("--add-dir", "/work/a"), ("--allow-all-tools", ""), ("--allow-tool", "shell(git)"),
            ("--allow-tool", "write"), ("--deny-tool", "shell(rm)"),
            ("--allow-url", f"https://{PLACEHOLDER}@example.test/x?token={PLACEHOLDER}"), ("--yolo", ""),
        ]
        assert ("--disable-mcp-server", "srv-b") in got and ("--dynamic-retrieval", "code=on") in got
        mcp = next(f for f in flags if f["flag"] == "--additional-mcp-config")
        assert mcp["value"] == PLACEHOLDER and mcp["inline_json"] is True and mcp["bytes"] > 0
        assert ("--secret-env-vars", PLACEHOLDER) in got
        assert ("--trust-folder", "") in got
        text = json.dumps(flags)
        assert "PRIVATE" not in text and "ghp_" not in text and "MY_TOKEN" not in text and ":pw@" not in text
        assert {"-p", "--resume"}.isdisjoint(f["flag"] for f in flags)

    def test_claude_prompt_flags_are_presence_only(self):
        argv = ("claude", "--permission-mode", "plan", "--settings", '{"env": {"API_KEY": "sk-abcdefghijk"}}',
                "--mcp-config", "/work/mcp.json", "--dangerously-skip-permissions", "--add-dir", "/a", "/b",
                "--agents", '{"r": {"prompt": "PRIVATE AGENT PROMPT"}}', "--append-system-prompt", "PRIVATE SYSTEM",
                "--model", "model-y", "--effort", "max")
        flags = launch_flags("claude-code", argv)
        assert entries(flags) == [
            ("--permission-mode", "plan"), ("--settings", PLACEHOLDER), ("--mcp-config", "/work/mcp.json"),
            ("--dangerously-skip-permissions", ""), ("--add-dir", "/a"), ("--add-dir", "/b"), ("--agents", PLACEHOLDER),
            ("--append-system-prompt", ""), ("--model", "model-y"), ("--effort", "max"),
        ]
        assert next(f for f in flags if f["flag"] == "--append-system-prompt")["value_withheld"] is True
        assert "PRIVATE" not in json.dumps(flags) and "sk-" not in json.dumps(flags)

    def test_an_unknown_tool_has_no_flags(self):
        assert launch_flags("cursor", ("cursor", "--model", "x")) == []

    def test_live_evidence_keeps_the_effective_keys_and_lists_the_other_flags(self, tmp_path):
        process = ProcessInfo(pid=7, ppid=1, name="copilot", exe=NATIVE, cmdline=COPILOT_ARGV, cwd=str(tmp_path),
                              created_at=BIRTH)
        evidence = _flag_evidence(process, 5.0)
        assert evidence["model"]["value"] == "model-x" and evidence["reasoning_effort"]["value"] == "high"
        assert evidence["--allow-tool"]["value"] == "shell(git), write"
        assert evidence["--additional-mcp-config"]["value"] == PLACEHOLDER
        assert "PRIVATE" not in json.dumps(evidence)


def native_with_flags(cwd) -> ProcessInfo:
    return ProcessInfo(pid=66865, ppid=66852, name="copilot", exe=NATIVE,
                       cmdline=(NATIVE, f"--resume={NAME}", "--model", "model-x", "--yolo", "-p", "PRIVATE"),
                       cwd=str(cwd), created_at=BIRTH + 0.2)


def test_the_launch_flags_of_the_bound_process_are_stored_once_for_its_session(tmp_path):
    home = tmp_path / "copilot-home"
    copilot_session(home, native_with_flags(tmp_path))
    runtime = correlator(tmp_path, copilot=[home])
    persistence, facts, writer = store()
    events = []
    for ts in (BIRTH + 10, BIRTH + 12, BIRTH + 400):
        sample(runtime, [native_with_flags(tmp_path)], ts)
        drained = runtime.drain_events()
        events += drained
        persistence._persist_session_events(drained, ts)
    rows = [r for r in writer.written("context_events") if r["kind"] == "config.launch_flags"]
    assert len({r["dedup_key"] for r in rows}) == 1
    row = rows[0]
    assert (row["session_id"], row["tool"], row["ts"]) == (BOUND_SID, "copilot-cli", BIRTH + 0.2)
    stored = json.loads(row["detail"])
    assert stored["pid"] == 66865 and stored["count"] == 2
    assert [(f["flag"], f["value"]) for f in stored["flags"]] == [("--model", "model-x"), ("--yolo", "")]
    assert "PRIVATE" not in row["detail"]
    alive = [e for e in events if e["kind"] == "session_alive"]
    assert alive and all("launch" not in e["detail"] for e in alive)


# ── The sessions.config view and the drawer ───────────────────────


SID = "11111111-1111-4111-8111-111111111111"
OTHER = "99999999-9999-4999-8999-999999999999"


def history(store) -> HistoryScope:
    return HistoryScope(store.history_store.reader, None)


def seed_timeline(seed, project: str = "") -> None:
    def event(key, ago, kind, payload, **extra):
        seed("context_events", session_id=SID, ts=NOW - ago, dedup_key=key, kind=kind, tool="copilot-cli",
             detail=json.dumps(payload), project=project, **extra)

    event("l1", 100, "config.launch_flags", {"pid": 7, "flags": [{"flag": "--model", "value": "model-a"},
                                                                  {"flag": "--yolo", "value": ""}], "count": 2},
          trigger="copilot")
    event("s1", 99, "config.session_start", {"selectedModel": "model-a", "contextTier": "long_context"})
    event("m1", 90, "config.model_change", {"previousModel": "model-a", "newModel": "model-b",
                                            "previousReasoningEffort": "high", "reasoningEffort": "xhigh",
                                            "source": "managed_settings"},
          trigger="managed_settings", turn_index=1, prompt_id="i1")
    event("o1", 91, "config.managed_override", {"infoType": "managed_model_override", "message": "replaced"},
          trigger="managed_model_override", turn_index=1, prompt_id="i1")
    event("d1", 80, "config.mode_change", {"previousMode": "interactive", "newMode": "autopilot"}, turn_index=2)
    event("p1", 79, "config.permissions_change", {"previousAllowAllPermissionMode": "off",
                                                  "allowAllPermissionMode": "on"}, turn_index=2)
    event("p2", 78, "config.permissions_change", {"previousMode": "manual", "mode": "allow-all"}, turn_index=2)
    event("f1", 70, "config.feature_flags", {"flags": ["A"], "count": 1, "hash": "h2", "previous_hash": "h1"})
    event("a1", 69, "config.subagent_configured", {"model": "model-c", "reasoningEffort": "high"}, agent_id="sub-1")
    seed("context_events", session_id=SID, ts=NOW - 60, dedup_key="c1", kind="compaction", tool="copilot-cli",
         project=project)
    seed("context_events", session_id=OTHER, ts=NOW - 50, dedup_key="x1", kind="config.session_start",
         tool="copilot-cli", detail=json.dumps({"selectedModel": "other"}))


def test_the_config_view_is_the_sessions_timeline_with_previous_and_new(kusto_store):
    seed_timeline(kusto_store.insert)
    rows = history(kusto_store).read("sessions.config", sid=SID)
    assert [(r["kind"], r["setting"], r["previous_value"], r["new_value"]) for r in rows] == [
        ("config.launch_flags", "launch_flags", "", "--model=model-a --yolo"),
        ("config.session_start", "model", "", "model-a"),
        ("config.managed_override", "model", "", "replaced"),
        ("config.model_change", "model", "model-a", "model-b"),
        ("config.mode_change", "mode", "interactive", "autopilot"),
        ("config.permissions_change", "allow_all", "off", "on"),
        ("config.permissions_change", "permission_mode", "manual", "allow-all"),
        ("config.feature_flags", "feature_flags", "h1", "h2"),
        ("config.subagent_configured", "model", "", "model-c"),
    ]
    change = rows[3]
    assert (change["source"], change["turn_index"], change["prompt_id"]) == ("managed_settings", 1, "i1")
    assert (change["previous_effort"], change["new_effort"]) == ("high", "xhigh")
    assert rows[1]["new_effort"] == "" and rows[8]["agent_id"] == "sub-1"


def test_the_drawer_carries_the_config_timeline(kusto_store):
    from aictl.dashboard import session_details

    seed = kusto_store.insert
    seed("sessions", session_id=SID, tool="claude-code", project_path="/work/proj", started_at=NOW - 100,
         ended_at=NOW - 10)
    seed("requests", session_id=SID, tool="claude-code", project_path="/work/proj", ts=NOW - 95, dedup_key="c0",
         model="m", input_tokens=10, output_tokens=1, source="transcript")
    seed_timeline(seed, "/work/proj")
    status, body = session_details.agent_detail(kusto_store, SID, None, NOW)
    assert status == 200, body
    timeline = body["config_timeline"]
    assert [t["kind"] for t in timeline][:2] == ["config.launch_flags", "config.session_start"]
    assert timeline[0]["detail"]["flags"][0] == {"flag": "--model", "value": "model-a"}
    change = timeline[3]
    assert (change["setting"], change["previous_value"], change["new_value"], change["source"]) == (
        "model", "model-a", "model-b", "managed_settings")
    from test_contract import validate_detail

    validate_detail("/api/board/agent", body)


@pytest.mark.parametrize("kind", ["config.session_start", "config.feature_flags"])
def test_a_value_the_tool_did_not_report_stays_empty(kusto_store, kind):
    kusto_store.insert("context_events", session_id=SID, ts=NOW - 10, dedup_key="e", kind=kind, tool="copilot-cli",
                       detail=json.dumps({}))
    (row,) = history(kusto_store).read("sessions.config", sid=SID)
    assert (row["previous_value"], row["new_value"], row["previous_effort"], row["new_effort"]) == ("", "", "", "")
