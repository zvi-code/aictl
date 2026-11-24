"""The model report card: the insights.model_report view on invented rows, and the shape that states its figures.

The view reduces each key to its winning version, drops tombstones after the reduction and applies the period
after it. A tool call belongs to the latest request before it in the same session and agent. A figure a tool does
not record stays None, never 0. The view runs through the replay harness (recorded against the scratch database).
"""

from __future__ import annotations

import pytest

from aictl.dashboard import insights
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope

PERIOD = Filters(since=0.0, until=100_000.0)
NEWER = "2026-02-01"


def _card(store, period=PERIOD):
    status, body = insights.insight("models", period, 200_000.0, history=HistoryScope(store.history_store.reader, None))
    assert status == 200
    assert body["view"] == "insights.model_report"
    return body


def _request(store, key, ts, model, *, session="s1", agent="", tool="claude-code", cost=1.0, **values):
    tokens = {"input_tokens": 5, "cache_read_tokens": 100, "cache_creation_tokens": 10, "output_tokens": 7}
    store.insert("requests", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, model=model, cost_usd=cost,
                 **{**tokens, **values})


def _call(store, key, ts, name="Bash", *, session="s1", agent="", tool="claude-code", failed=0, **values):
    store.insert("tool_invocations", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, tool_name=name,
                 is_error=failed, **values)


def _seed(s):
    # Claude Code, session s1. A dated name folds into its model; the newer version of r2 wins.
    _request(s, "r1", 100.0, "claude-opus-5-5-20260101", effort="high", thinking_ms=2000.0)
    _request(s, "r2", 200.0, "claude-opus-5-5", effort="medium", cost=9.0, thinking_ms=4000.0)
    _request(s, "r2", 200.0, "claude-opus-5-5", effort="medium", cost=2.0, thinking_ms=4000.0, _v=NEWER)
    _request(s, "r3", 400.0, "claude-opus-5-5", effort="Medium", thinking_ms=100_000_000.0)  # over 24 hours
    _request(s, "rx", 300.0, "claude-opus-5-5", cost=50.0)
    s.insert("requests", dedup_key="rx", ts=300.0, session_id="s1", tool="claude-code", _deleted=True, _v=NEWER)
    _request(s, "late", 200_000.0, "claude-opus-5-5", cost=100.0)  # after the period
    _call(s, "c1", 100.0, exit_code=1)              # same ts as r1, which asked for it: r1, failed by its exit code
    _call(s, "c2", 150.0, "Read")                   # r1
    _call(s, "c3", 250.0, failed=1)                 # r2, failed
    _call(s, "c4", 260.0, "permission:Bash", failed=1)  # a permission record, not a call
    _call(s, "c5", 270.0, "Edit", confirm="denied")     # refused: counted apart
    _call(s, "c6", 280.0, failed=1)
    s.insert("tool_invocations", dedup_key="c6", ts=280.0, session_id="s1", tool="claude-code", tool_name="Bash",
             _deleted=True, _v=NEWER)
    _call(s, "c7", 410.0, exit_code=0)              # r3
    # A subagent of s1: its call belongs to its own request, not to the main agent's.
    _request(s, "a1", 120.0, "claude-haiku-5-5", agent="sub", cost=0.1)
    _call(s, "ca", 130.0, "Grep", agent="sub", failed=1)
    # Session s2: requests in a subagent lane, but its calls carry no agent: they are not attributed.
    _request(s, "b1", 500.0, "claude-opus-5-5", session="s2")
    _request(s, "b2", 510.0, "claude-haiku-5-5", session="s2", agent="x", cost=0.2)
    _call(s, "cb", 520.0, session="s2", failed=1)
    # Copilot CLI: an events-file session k1, a session k2 with no calls, and a session-store session k3.
    for i in range(25):
        _request(s, f"k1-{i}", 1000.0 + i * 100, "gpt-6-astra", session="k1", tool="copilot-cli", cost=0.4, effort="high",
                 thinking_tokens=100)
        _request(s, f"k2-{i}", 1000.0 + i * 100, "copilot/Gemini-4-Argon", session="k2", tool="copilot-cli", cost=0.1,
                 effort="medium", thinking_tokens=50 if i < 20 else None)
    _request(s, "k2-x", 4000.0, "unknown", session="k2", tool="copilot-cli")
    _call(s, "k1-a", 1005.0, "bash", session="k1", tool="copilot-cli")                    # no exit code: unknown
    _call(s, "k1-b", 1015.0, "bash", session="k1", tool="copilot-cli", exit_code=2)       # failed
    _call(s, "k1-c", 1025.0, "powershell", session="k1", tool="copilot-cli", failed=1)    # failed
    _call(s, "k1-d", 1035.0, "view", session="k1", tool="copilot-cli")                    # no code, not a shell
    _request(s, "k3-1", 2000.0, "gpt-6-astra", session="k3", tool="copilot-cli", cost=0.4)
    _request(s, "k3-2", 2001.0, "copilot/Claude-Opus-4.8", session="k3", tool="copilot-cli", cost=0.3)
    _call(s, "k3-a", 2005.0, "bash", session="k3", tool="copilot-cli", failed=1, source="copilot-session-store")
    # Copilot in VS Code: a picker suffix is the effort of a Claude name; a request without the cache split is unpriced.
    _request(s, "v1", 3000.0, "copilot/claude-opus-4.8-high", session="v1", tool="copilot-vscode", cost=None,
             input_tokens=1000, cache_read_tokens=50, cache_creation_tokens=0)
    _request(s, "v2", 3010.0, "claude-opus-4.8-high", session="v1", tool="copilot-vscode", cost=0.5)
    _request(s, "v3", 3020.0, "gpt-5.5", session="v1", tool="copilot-vscode", cost=None)
    _call(s, "v-a", 3015.0, "run_in_terminal", session="v1", tool="copilot-vscode")  # no exit code in its result
    # Codex CLI records no model and no session id.
    _request(s, "x1", 5000.0, "", session="", tool="codex-cli", cost=0.0)


def test_model_report_attributes_calls_and_keeps_unreported_figures_null(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store)
    tools = {tool["tool"]: tool for tool in body["tools"]}
    assert [tool["tool"] for tool in body["tools"]] == ["copilot-cli", "claude-code", "copilot-vscode", "codex-cli"]
    claude = {model["model"]: model for model in tools["claude-code"]["models"]}
    assert list(claude) == ["claude-opus-5-5", "claude-haiku-5-5"]
    opus = claude["claude-opus-5-5"]
    assert (opus["requests"], opus["priced"], opus["cost_usd"], opus["sessions"], opus["recorded_sessions"]) == (4, 4, 5.0, 2, 1)
    assert (opus["calls"], opus["failures"], opus["refused"], opus["exit_unknown"], opus["call_sessions"]) == (4, 2, 1, 0, 1)
    assert opus["failure_share"] is None                      # under 100 calls in 3 sessions
    assert (opus["cache_reported"], opus["cache_write_reported"]) == (4, 4)
    assert (opus["thinking_reported"], opus["p50_thinking_ms"]) == (2, None)  # over 24 hours left out; under 20 reported
    assert [(item["tool_name"], item["failures"], item["share"]) for item in opus["failing"]] == [("Bash", 2, 1.0)]
    assert {item["effort"]: item["requests"] for item in opus["efforts"]} == {"medium": 2, "high": 1}
    haiku = claude["claude-haiku-5-5"]
    assert (haiku["requests"], haiku["calls"], haiku["failures"]) == (2, 1, 1)
    assert [item["tool_name"] for item in haiku["failing"]] == ["Grep"]
    cc = tools["claude-code"]
    assert (cc["requests"], cc["no_model"], cc["effort_reported"], cc["recorded_calls"]) == (6, 0, 3, 6)
    assert (cc["calls"], cc["failures"], cc["refused"], cc["unsplit_calls"], cc["unsplit_sessions"]) == (5, 3, 1, 1, 1)

    cli = {model["model"]: model for model in tools["copilot-cli"]["models"]}
    astra, argon, store_only = cli["gpt-6-astra"], cli["gemini-4-argon"], cli["claude-opus-4-8"]
    assert (astra["requests"], astra["sessions"], astra["recorded_sessions"], astra["cost_per_request"]) == (26, 2, 1, pytest.approx(0.4))
    assert (astra["calls"], astra["failures"], astra["exit_unknown"]) == (4, 2, 1)
    assert [item["tool_name"] for item in astra["failing"]] == ["bash", "powershell"]
    assert astra["reasoning_per_request"] == pytest.approx(100.0) and astra["p50_thinking_ms"] is None
    assert (argon["reasoning_reported"], argon["reasoning_per_request"]) == (20, pytest.approx(50.0))
    assert argon["calls"] is None and argon["failures"] is None   # no session of it recorded a call
    assert store_only["calls"] is None and store_only["recorded_sessions"] == 0
    copilot = tools["copilot-cli"]
    assert (copilot["requests"], copilot["no_model"], copilot["store_calls"], copilot["store_sessions"]) == (53, 1, 1, 1)
    assert (copilot["calls"], copilot["exit_unknown"]) == (4, 1)

    vscode = {model["model"]: model for model in tools["copilot-vscode"]["models"]}
    picked = vscode["claude-opus-4-8"]
    assert (picked["requests"], picked["priced"], picked["cache_reported"]) == (2, 1, 1)
    # VS Code splits the cached prompt of a priced request but never reports cache writes (the row stores 10 here).
    assert (picked["cache_write_reported"], picked["cache_write_per_request"]) == (0, None)
    assert (tools["copilot-vscode"]["cache_reported"], tools["copilot-vscode"]["cache_write_reported"]) == (1, 0)
    assert [item["effort"] for item in picked["efforts"]] == ["high"]
    assert (picked["calls"], picked["exit_unknown"]) == (1, 1)
    assert vscode["gpt-5.5"]["cost_usd"] is None and vscode["gpt-5.5"]["helper"] is True
    assert tools["codex-cli"]["models"] == [] and tools["codex-cli"]["no_model"] == 1 and tools["codex-cli"]["calls"] is None

    lead = body["summary"]["lead"]
    assert (lead["kind"], lead["tool"], lead["high"]["model"], lead["low"]["model"]) == ("ratio", "copilot-cli", "gpt-6-astra", "gemini-4-argon")
    assert lead["ratio"] == pytest.approx(4.0)
    reported = body["summary"]["not_reported"]
    assert reported["thinking"] == ["copilot-cli", "copilot-vscode", "codex-cli"]
    assert reported["reasoning"] == ["claude-code", "copilot-vscode", "codex-cli"]
    assert reported["model"] == ["codex-cli"] and reported["calls"] == ["codex-cli"]
    assert reported["cache_write"] == ["copilot-vscode"]
    assert [(row["session_id"], row["model"], row["models"], row["requests"], row["calls"], row["failures"], row["refused"])
            for row in body["sessions"]] == [("s1", "claude-opus-5-5", 2, 4, 5, 3, 1), ("k1", "gpt-6-astra", 1, 25, 4, 2, 0)]
    assert body["sessions"][0]["cost_usd"] == pytest.approx(4.1)


def test_model_report_keeps_an_old_tombstone_with_no_session_when_the_period_filters_sessions(kusto_store):
    s = kusto_store
    _request(s, "old", 10.0, "claude-opus-5-5", session="t0")       # before the period: the session filter is used
    _request(s, "t1", 2000.0, "claude-opus-5-5", session="t1")
    _request(s, "t2", 2100.0, "claude-opus-5-5", session="t1", cost=50.0)
    s.insert("requests", dedup_key="t2", ts=0.0, session_id="", tool="claude-code", _deleted=True, _v=NEWER)
    body = _card(s, Filters(since=1000.0, until=100_000.0))
    (opus,) = body["tools"][0]["models"]
    assert (opus["requests"], opus["cost_usd"]) == (1, 1.0)


# ── The shape, on invented view rows ──────────────────────────────

def _model(tool, model, **values):
    return {"row_type": "model", "tool": tool, "model": model, **values}


def test_a_failure_share_needs_100_calls_in_3_sessions_and_is_a_floor_with_unknown_outcomes():
    rows = [
        _model("copilot-cli", "a", requests=50, sessions=5, calls=100, failures=10, exit_unknown=5, call_sessions=3),
        _model("copilot-cli", "b", requests=50, sessions=5, calls=99, failures=10, exit_unknown=0, call_sessions=3),
        _model("copilot-cli", "c", requests=50, sessions=5, calls=500, failures=10, exit_unknown=0, call_sessions=2),
        _model("copilot-cli", "d", requests=50, sessions=5, calls=100, failures=10, exit_unknown=4, call_sessions=3),
    ]
    (tool,) = insights.model_report(rows)["tools"]
    shown = {model["model"]: (model["failure_share"], model["at_least"]) for model in tool["models"]}
    assert shown == {"a": (0.1, True), "b": (None, False), "c": (None, False), "d": (0.1, False)}


def test_calls_a_tool_did_not_record_stay_null_and_an_unpriced_model_has_no_cost():
    rows = [
        _model("codex-cli", "m", requests=40, sessions=4, priced=0, cost_usd=None, cache_reported=0, unsplit_prompt_tokens=4000,
               thinking_reported=0, reasoning_reported=0, calls=None, failures=None, refused=None, exit_unknown=None),
        {"row_type": "tool", "tool": "codex-cli", "requests": 40, "priced": 0, "cache_reported": 0, "thinking_reported": 0,
         "reasoning_reported": 0, "effort_reported": 0, "no_model": 0, "calls": None},
    ]
    body = insights.model_report(rows)
    (model,) = body["tools"][0]["models"]
    assert model["calls"] is None and model["failures"] is None and model["failure_share"] is None
    assert model["cost_usd"] is None and model["cost_per_request"] is None
    assert model["input_per_request"] is None and model["unsplit_prompt_per_request"] == 100.0
    assert model["p50_thinking_ms"] is None and model["reasoning_per_request"] is None
    assert model["helper"] is False                             # calls not recorded is not 0 calls
    assert body["tools"][0]["calls"] is None
    assert body["summary"]["lead"] == {"kind": "requests", "tool": "codex-cli", "requests": 40}
    assert body["summary"]["not_reported"]["cost"] == ["codex-cli"] and body["summary"]["not_reported"]["calls"] == ["codex-cli"]


def test_per_request_figures_need_20_requests_and_the_lead_needs_20_priced():
    rows = [
        _model("claude-code", "few", requests=19, sessions=2, priced=19, cost_usd=19.0, cache_reported=19, input_tokens=190,
               thinking_reported=19, p50_thinking_ms=500.0, calls=0, failures=0, refused=0, exit_unknown=0),
        _model("claude-code", "one", requests=30, sessions=3, priced=20, cost_usd=10.0, cache_reported=30, input_tokens=300,
               cache_read_tokens=3000, cache_creation_tokens=30, output_tokens=60, thinking_reported=20, p50_thinking_ms=800.0,
               calls=5, failures=1, refused=0, exit_unknown=0, call_sessions=1),
    ]
    body = insights.model_report(rows)
    models = {model["model"]: model for model in body["tools"][0]["models"]}
    few, one = models["few"], models["one"]
    assert few["cost_per_request"] is None and few["input_per_request"] is None and few["p50_thinking_ms"] is None
    assert few["cost_usd"] == 19.0
    assert (one["cost_per_request"], one["input_per_request"], one["cache_read_per_request"], one["output_per_request"]) == (0.5, 10, 100, 2)
    assert one["p50_thinking_ms"] == 800.0
    lead = body["summary"]["lead"]
    assert (lead["kind"], lead["high"]["model"], lead["ratio"]) == ("cost", "one", None)


def test_the_lead_is_the_busiest_tool_with_a_priced_model_and_leaves_out_a_tagged_helper():
    rows = [
        _model("copilot-vscode", "big", requests=900, sessions=9, priced=0, cost_usd=None, calls=10, failures=0, call_sessions=1),
        _model("copilot-cli", "dear", requests=100, sessions=10, priced=100, cost_usd=44.0, calls=10, failures=1, call_sessions=2),
        _model("copilot-cli", "cheap", requests=100, sessions=10, priced=100, cost_usd=10.0, calls=10, failures=1, call_sessions=2),
        _model("copilot-cli", "helper", requests=40, sessions=20, priced=40, cost_usd=0.4, calls=0, failures=0, call_sessions=0),
        {"row_type": "failing", "tool": "copilot-cli", "model": "dear", "tool_name": "bash", "failures": 1},
        {"row_type": "effort", "tool": "copilot-cli", "model": "dear", "effort": "high", "requests": 60, "priced": 60, "cost_usd": 30.0},
        {"row_type": "effort", "tool": "copilot-cli", "model": "dear", "effort": "low", "requests": 40, "priced": 40, "cost_usd": 14.0},
        {"row_type": "meta", "first_ts": 1.0, "last_ts": 2.0, "computed_at": 3.0},
    ]
    body = insights.model_report(rows)
    lead = body["summary"]["lead"]
    assert (lead["kind"], lead["tool"], lead["high"]["model"], lead["low"]["model"]) == ("ratio", "copilot-cli", "dear", "cheap")
    assert lead["ratio"] == pytest.approx(4.4)
    models = {model["model"]: model for tool in body["tools"] for model in tool["models"]}
    assert models["helper"]["helper"] is True and models["dear"]["helper"] is False
    assert [(item["effort"], item["cost_per_request"]) for item in models["dear"]["efforts"]] == [("high", 0.5), ("low", 0.35)]
    assert models["dear"]["failing"] == [{"tool_name": "bash", "failures": 1, "share": 1.0}]
    assert models["big"]["cost_usd"] is None


def test_an_empty_report_has_no_lead():
    body = insights.model_report([])
    assert body == {"tools": [], "summary": {"lead": None, "not_reported": {
        "cost": [], "token_split": [], "cache_write": [], "thinking": [], "reasoning": [], "effort": [], "model": [], "calls": []}}, "sessions": []}


def test_a_cache_write_the_tool_does_not_report_is_none_not_0():
    # Copilot in VS Code reports the cache split on a priced request, but never its cache writes.
    rows = [
        _model("copilot-vscode", "claude-opus-4-8", requests=40, sessions=4, priced=30, cost_usd=6.0, cache_reported=30,
               cache_write_reported=0, input_tokens=3000, cache_read_tokens=30_000, cache_creation_tokens=0,
               calls=None),
        {"row_type": "tool", "tool": "copilot-vscode", "requests": 40, "priced": 30, "cache_reported": 30,
         "cache_write_reported": 0, "calls": None},
    ]
    body = insights.model_report(rows)
    (model,) = body["tools"][0]["models"]
    assert model["cache_write_per_request"] is None
    assert (model["input_per_request"], model["cache_read_per_request"]) == (100, 1000)
    assert body["summary"]["not_reported"]["cache_write"] == ["copilot-vscode"]
