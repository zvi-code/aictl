"""aictl ps / top: synthetic stores for each surface, read-only behaviour, encoding fallback."""

from __future__ import annotations

import io
import json
import os
import sqlite3
import time

import pytest
from click.testing import CliRunner

from aictl.cli import main
from aictl.observe import collect as collect_mod
from aictl.observe.collect import Collector
from aictl.observe.procs import ProcRow, ProcTable, role_of
from aictl.observe.render import ASCII, charset_for, render, safe_text

SECRET = "SECRET-PROMPT-TEXT"


def _iso(ts: float) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(ts))


def _ev(kind: str, ts: float, **data) -> str:
    extra = data.pop("_top", {})
    return json.dumps({"type": kind, "timestamp": _iso(ts), "id": f"e{ts}", "data": data, **extra}) + "\n"


def _write_cli_session(home, sid="aaaa1111-cli", client="github/cli", usage=True, age=5.0):
    d = home / ".copilot" / "session-state" / sid
    d.mkdir(parents=True)
    (d / "workspace.yaml").write_text(f"id: {sid}\nclient_name: {client}\nname: {SECRET}\n", encoding="utf-8")
    now = time.time() - age
    lines = [
        _ev("session.start", now - 100, sessionId=sid, selectedModel="m1", context={"cwd": str(home), "branch": "main"}),
        _ev("user.message", now - 90, content=SECRET),
        _ev("assistant.turn_start", now - 89, turnId="t1"),
        _ev("tool.execution_start", now - 80, toolCallId="outer", toolName="task", arguments={}),
        _ev("subagent.started", now - 79, toolCallId="outer", agentDisplayName="Outer", _top={"agentId": "a1"}),
        _ev("tool.execution_start", now - 70, toolCallId="inner", toolName="task", parentToolCallId="outer", arguments={}),
        _ev("subagent.started", now - 69, toolCallId="inner", agentDisplayName="Inner", _top={"agentId": "a2"}),
        _ev(
            "tool.execution_start",
            now - 60,
            toolCallId="r1",
            toolName="view",
            parentToolCallId="inner",
            arguments={"path": "/src/a.py"},
        ),
        _ev("tool.execution_complete", now - 58, toolCallId="r1", success=False),
        _ev("tool.execution_start", now - 50, toolCallId="w1", toolName="edit", arguments={"path": "/src/b.py"}),
        _ev("tool.execution_complete", now - 49, toolCallId="w1", success=True),
    ]
    if usage:
        lines.append(_ev("session.usage_record", now - 40, usage={"inputTokens": 100, "outputTokens": 7}))
    lines.append(_ev("tool.execution_start", now, toolCallId="live", toolName="bash", arguments={}))
    (d / "events.jsonl").write_text("".join(lines), encoding="utf-8")
    return d


def _session(doc, tool):
    node = next(t for t in doc["tools"] if t["tool"] == tool)
    return node["sessions"][0]


@pytest.fixture
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))
    monkeypatch.setattr(collect_mod, "snapshot", lambda: ProcTable([]))
    monkeypatch.setattr(collect_mod, "copilot_session_dir", lambda: tmp_path / ".copilot" / "session-state")
    monkeypatch.setattr(collect_mod, "copilot_global_dir", lambda: tmp_path / ".copilot")
    monkeypatch.setattr(collect_mod, "vscode_user_dir", lambda: tmp_path / "Code" / "User")
    monkeypatch.setattr(collect_mod, "config_path", lambda: tmp_path / ".config" / "aictl" / "config.toml")
    return tmp_path


def test_cli_session_nests_subagents_and_counts(home):
    _write_cli_session(home)
    s = _session(Collector().collect(), "copilot-cli")
    assert s["state"] == "running"
    outer = s["agents"][0]
    assert outer["name"] == "Outer" and outer["agents"][0]["name"] == "Inner"
    inner = outer["agents"][0]
    assert inner["tool_calls"] == 1 and inner["failures"] == 1
    assert s["tools"]["failures"] == 1 and [r["name"] for r in s["tools"]["running"]] == ["task", "task", "bash"]
    assert s["activity"]["tokens"]["input"] == 100 and s["activity"]["requests"] == 1
    assert [f["path"] for f in s["files"]["read"]] == ["/src/a.py"]
    assert [f["path"] for f in s["files"]["written"]] == ["/src/b.py"]
    assert s["files"]["inferred"] is True


def test_missing_data_is_na_with_reason_not_zero(home):
    _write_cli_session(home, usage=False)
    s = _session(Collector().collect(), "copilot-cli")
    assert s["activity"]["tokens"] is None and "usage" in s["na"]["tokens"]
    assert s["activity"]["premium_requests"] is None and s["na"]["premium_requests"]
    assert "n/a (no usage records" in render(Collector().collect(), io.StringIO())


def test_desktop_surface_reads_named_columns_from_data_db(home):
    _write_cli_session(home, sid="bbbb2222-desk", client="github/autopilot", usage=False)
    conn = sqlite3.connect(home / ".copilot" / "data.db")
    conn.execute("create table sessions (id text, title text, is_running int, total_input_tokens int, context_current_tokens int)")
    conn.execute("create table settings (github_access_token text)")
    conn.execute("insert into sessions values ('bbbb2222-desk', 'T', 1, 55, 9)")
    conn.commit()
    conn.close()
    s = _session(Collector().collect(), "copilot-desktop")
    assert s["activity"]["tokens"]["input"] == 55
    assert s["memory"]["context"]["current_tokens"] == 9


def test_vscode_chat_replays_patches_and_says_flat(home):
    ws = home / "Code" / "User" / "workspaceStorage" / "abc"
    (ws / "chatSessions").mkdir(parents=True)
    now_ms = time.time() * 1000
    snap = {"kind": 0, "v": {"sessionId": "cccc3333", "creationDate": now_ms - 5000, "requests": []}}
    req = {
        "timestamp": now_ms - 1000,
        "modelId": "m2",
        "message": {"text": SECRET},
        "result": {"metadata": {"promptTokens": 11, "outputTokens": 3}},
        "response": [{"kind": "toolInvocationSerialized", "toolId": "read_file"}],
    }
    path = ws / "chatSessions" / "cccc3333.jsonl"
    path.write_text(
        json.dumps(snap) + "\n" + json.dumps({"kind": 2, "k": ["requests"], "v": [req]}) + "\n", encoding="utf-8"
    )
    doc = Collector().collect(include_ended=True)
    s = _session(doc, "copilot-vscode")
    assert s["activity"]["turns"] == 1 and s["activity"]["tokens"] == {"input": 11, "output": 3}
    assert s["tools"]["calls"] == 1 and s["tools"]["failures"] is None and "failures" in s["na"]
    assert any("flat" in n for n in s["notes"])


@pytest.mark.parametrize("mode", ["metadata", "off"])
def test_capture_mode_suppresses_prompt_text(home, mode):
    _write_cli_session(home)
    cfg = home / ".config" / "aictl" / "config.toml"
    cfg.parent.mkdir(parents=True)
    cfg.write_text(f'[storage]\ncapture = "{mode}"\n', encoding="utf-8")
    doc = Collector().collect(target="aaaa")
    assert SECRET not in json.dumps(doc) and SECRET not in render(doc, io.StringIO(), full=True)
    assert _session(doc, "copilot-cli")["prompts"]["recent"][0]["length"] == len(SECRET)


def test_full_capture_shows_bounded_single_line_preview(home):
    _write_cli_session(home)
    s = _session(Collector().collect(), "copilot-cli")
    assert s["prompts"]["recent"][0]["text"] == SECRET
    assert s["title"] == SECRET


def test_stale_lock_with_reused_pid_is_not_attributed(home, monkeypatch):
    d = _write_cli_session(home, age=1000.0)
    (d / "inuse.4242.lock").write_text("", encoding="utf-8")
    row = ProcRow(pid=4242, ppid=None, name="Notion Helper", create_time=time.time())
    monkeypatch.setattr(collect_mod, "snapshot", lambda: ProcTable([row]))
    assert Collector().collect()["tools"] == []
    genuine = ProcRow(pid=4242, ppid=None, name="copilot", tool="copilot-cli", create_time=1.0, rss=2048)
    monkeypatch.setattr(collect_mod, "snapshot", lambda: ProcTable([genuine]))
    s = _session(Collector().collect(), "copilot-cli")
    assert s["pids"] == [4242] and s["rss_bytes"] == 2048 and s["processes"][0]["share"] == 1.0


def test_process_label_never_exposes_argument_values():
    row = ProcRow(pid=1, ppid=None, name="node", cmdline=("node", '{"mcpToken":"abc"}', "--mcp-key=xyz"))
    assert role_of(row) == ("process", "node")
    row = ProcRow(pid=1, ppid=None, name="node", cmdline=("node", "/opt/mcp-server-git/index.js"))
    assert role_of(row) == ("mcp", "index.js")


def test_copilot365_says_no_local_session_data(home, monkeypatch):
    row = ProcRow(pid=7, ppid=None, name="M365Copilot", tool="copilot365", create_time=1.0, rss=10)
    monkeypatch.setattr(collect_mod, "snapshot", lambda: ProcTable([row]))
    node = next(t for t in Collector().collect()["tools"] if t["tool"] == "copilot365")
    assert "isn't available locally" in node["notes"][0] and node["unattributed_processes"][0]["pid"] == 7


def test_nothing_written_under_home_including_wal_db(home):
    _write_cli_session(home)
    conn = sqlite3.connect(home / ".copilot" / "data.db")
    conn.execute("pragma journal_mode=wal")
    conn.execute("create table sessions (id text, is_running int)")
    conn.commit()
    conn.close()

    def tree():
        return {
            os.path.join(r, f): os.stat(os.path.join(r, f)).st_mtime_ns for r, _, fs in os.walk(home) for f in fs
        }

    before = tree()
    result = CliRunner().invoke(main, ["ps", "--all"])
    assert result.exit_code == 0, result.output
    assert tree() == before


def test_json_schema_is_stable(home):
    _write_cli_session(home)
    result = CliRunner().invoke(main, ["ps", "--json"])
    doc = json.loads(result.output)
    assert set(doc) == {"schema_version", "generated_at", "capture", "psutil_available", "elapsed_ms", "notes", "tools"}
    assert doc["schema_version"] == 1
    s = doc["tools"][0]["sessions"][0]
    assert {"id", "state", "age_s", "idle_s", "agents", "processes", "memory", "tools", "prompts", "files", "activity", "na"} <= set(s)


def test_cp1252_stdout_falls_back_to_ascii(home):
    _write_cli_session(home)
    stream = io.TextIOWrapper(io.BytesIO(), encoding="cp1252")
    assert charset_for(stream) == ASCII
    text = render(Collector().collect(), stream)
    stream.write(safe_text(text + "☃", stream))
    stream.flush()
    assert "`- " in text and "├" not in text


def test_drill_down_unknown_target_errors(home):
    assert CliRunner().invoke(main, ["ps", "nope"]).exit_code != 0


def test_missing_psutil_degrades_with_message(home, monkeypatch):
    monkeypatch.setattr(collect_mod, "snapshot", lambda: None)
    _write_cli_session(home)
    doc = Collector().collect()
    assert doc["psutil_available"] is False and "psutil" in doc["notes"][0]
    assert "psutil" in _session(doc, "copilot-cli")["na"]["process"]


def test_incremental_refresh_reads_only_new_bytes(home):
    d = _write_cli_session(home)
    collector = Collector()
    assert _session(collector.collect(), "copilot-cli")["prompts"]["count"] == 1
    with (d / "events.jsonl").open("a", encoding="utf-8") as fh:
        fh.write(_ev("user.message", time.time(), content="next"))
    ef = collector.files[d / "events.jsonl"]
    offset = ef.offset
    assert _session(collector.collect(), "copilot-cli")["prompts"]["count"] == 2
    assert ef.offset > offset and len(collector.files) == 1


def test_top_one_refresh_when_not_a_tty(home):
    _write_cli_session(home)
    result = CliRunner().invoke(main, ["top", "--iterations", "1"])
    assert result.exit_code == 0 and "aictl top" in result.output and "aaaa1111" in result.output


def test_ps_and_top_name_the_pinned_model(home, monkeypatch):
    _write_cli_session(home)
    (home / ".copilot").mkdir(exist_ok=True)
    (home / ".copilot" / "settings.json").write_text('{\n  "model": "model-pinned"\n}\n', encoding="utf-8")
    monkeypatch.setenv("COPILOT_HOME", str(home / ".copilot"))
    for args in (["ps"], ["top", "--iterations", "1"]):
        result = CliRunner().invoke(main, args)
        assert result.exit_code == 0
        assert "model pinned model-pinned" in result.output and "settings.json:2" in result.output
