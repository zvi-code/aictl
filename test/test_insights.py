"""The Insights screen: each card's view on invented rows, and the card routes.

Every view reduces a key to its winning version, drops a tombstoned key and applies the period after
the reduction. "Previous" and "next" never cross a session or an agent. Figures a source does not
report stay None. The views run through the replay harness (recorded against the scratch database).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from aictl.context_lists import list_id
from aictl.dashboard import board_routes, insights
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.base import ReadResult, StoreError
from aictl.stores.kusto.reader import _CACHE_TTL_S, _VIEWS
from aictl.stores.kusto.tables import TABLES

QUERIES = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries"
PERIOD = Filters(since=0.0, until=100_000.0)
NEWER = "2026-02-01"


def _card(store, card):
    status, body = insights.insight(card, PERIOD, 200_000.0, history=HistoryScope(store.history_store.reader, None))
    assert status == 200
    assert body["range"] == {"since": 0.0, "until": 100_000.0}
    assert isinstance(body["computed_at"], float)
    assert body["query"]["view"] == insights.CARDS[card] and "let since = real(0.0);" in body["query"]["kql"]
    return body


def _request(store, key, ts, *, session="s1", agent="", tool="claude-code", cost=1.0, duration_ms=0.0, cache_write=10,
             **values):
    store.insert("requests", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, input_tokens=5,
                 cache_read_tokens=100, cache_creation_tokens=cache_write, cost_usd=cost, duration_ms=duration_ms, **values)


def test_every_insight_view_is_registered_cached_and_bounded():
    for view in insights.CARDS.values():
        assert _VIEWS[view][0].split() == ["all_nodes", "requested_node", "since", "until"]
        assert 0 < _CACHE_TTL_S[view] <= 300


def test_pause_tax_buckets_pauses_within_one_session_and_agent(kusto_store):
    s = kusto_store
    # Main agent of s1, durations 0 unless given: pauses of 59, 60, 300 and 3600 seconds.
    _request(s, "r1", 1000.0, cost=0.5)
    _request(s, "r2", 1059.0, cost=0.5)                       # 59 s: under 1 min
    _request(s, "r3", 1119.0, cost=2.0)                       # 60 s: 1-5 min
    _request(s, "r4", 1419.0, cost=1.0)                       # 300 s: 5-60 min (older version)
    _request(s, "r4", 1419.0, cost=5.0, _v=NEWER)             # the winning version
    _request(s, "r5", 5019.0, cost=7.0, duration_ms=100_000)  # 3600 s: over 60 min; then runs 100 s
    _request(s, "r6", 5149.0, cost=0.5)                       # 30 s after r5 ended: under 1 min
    # A deleted request inside the 300 s pause: if it counted, that pause would split in two.
    _request(s, "rx", 1200.0, cost=100.0)
    s.insert("requests", dedup_key="rx", ts=1200.0, session_id="s1", tool="claude-code", _deleted=True, _v=NEWER)
    # A subagent and a second session start without a pause, whatever the main agent did before.
    _request(s, "a1", 1100.0, agent="sub", cost=9.0)
    _request(s, "a2", 1130.0, agent="sub", cost=0.5)          # 30 s: under 1 min
    _request(s, "b1", 1060.0, session="s2", cost=9.0)
    # A tool whose source reports no cache writes.
    _request(s, "v1", 1000.0, session="s3", tool="copilot-vscode", cache_write=0, cost=1.0)
    _request(s, "v2", 2000.0, session="s3", tool="copilot-vscode", cache_write=0, cost=3.0)
    body = _card(s, "pause")
    tools = {tool["tool"]: tool for tool in body["tools"]}
    claude = {cell["bucket"]: cell for cell in tools["claude-code"]["buckets"]}
    assert {bucket: claude[bucket]["requests"] for bucket in insights.BUCKETS} == \
        {"under_1m": 3, "1_5m": 1, "5_60m": 1, "over_60m": 1}
    assert claude["under_1m"]["avg_cost_usd"] == pytest.approx(0.5)
    assert claude["5_60m"]["cost_usd"] == pytest.approx(5.0)
    assert claude["under_1m"]["cache_hit_share"] == pytest.approx(100 / 115)
    assert tools["claude-code"]["cache_reported"] is True
    vscode = tools["copilot-vscode"]
    assert vscode["cache_reported"] is False
    assert all(cell["cache_hit_share"] is None for cell in vscode["buckets"])
    assert body["summary"] == {
        "sessions": 2, "tools": ["claude-code"], "requests": 2, "cost_usd": pytest.approx(12.0), "baseline_usd": pytest.approx(1.0),
        "extra_usd": pytest.approx(11.0), "not_reported": ["copilot-vscode"], "unpriced_requests": 0,
    }
    assert [row["session_id"] for row in body["sessions"]] == ["s1", "s3"]
    assert body["sessions"][0]["cost_usd"] == pytest.approx(12.0)


def test_pause_tax_counts_only_requests_in_the_period(kusto_store):
    _request(kusto_store, "r1", 1000.0)
    _request(kusto_store, "r2", 2000.0)  # 1000 s after r1, but r1 is outside the period
    status, body = insights.insight("pause", Filters(since=1500.0, until=3000.0), 3000.0,
                                    history=HistoryScope(kusto_store.history_store.reader, None))
    assert status == 200
    assert sum(cell["requests"] for tool in body["tools"] for cell in tool["buckets"]) == 0
    assert body["summary"]["cost_usd"] is None


def _call(store, key, ts, name="Bash", *, session="s1", agent="", tool="claude-code", target="", failed=0, output=None,
          **values):
    store.insert("tool_invocations", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, tool_name=name,
                 target=target, is_error=failed, output_bytes=output, **values)


def test_context_carry_multiplies_result_bytes_by_later_requests_of_the_same_agent(kusto_store):
    s = kusto_store
    for key, ts in (("q1", 10.0), ("q2", 20.0), ("q3", 30.0), ("q4", 40.0)):
        _request(s, key, ts)
    _request(s, "q5", 50.0)
    s.insert("requests", dedup_key="q5", ts=50.0, session_id="s1", tool="claude-code", _deleted=True, _v=NEWER)
    _request(s, "sub1", 12.0, agent="sub")
    _request(s, "sub2", 25.0, agent="sub")
    _call(s, "c1", 10.0, "Bash", output=100)  # same time as q1, which made it: q2, q3 and q4 come later
    _call(s, "c2", 31.0, "Read", output=50)   # q4 comes later
    _call(s, "c3", 32.0, "Read", output=10)
    _call(s, "c3", 32.0, "Read", output=20, _v=NEWER)
    _call(s, "c4", 33.0, "Grep")              # size not reported
    body = _card(s, "carry")
    names = {row["tool_name"]: row for row in body["tool_names"]}
    assert names["Bash"]["carried_bytes"] == 300 and names["Bash"]["avg_later_requests"] == 3
    assert names["Read"]["output_bytes"] == 70 and names["Read"]["carried_bytes"] == 70
    assert [row["tool_name"] for row in body["tool_names"]] == ["Bash", "Read"]
    assert body["tools"] == [{"tool": "claude-code", "calls": 4, "reported": 3, "output_bytes": 170, "carried_bytes": 370}]
    assert body["summary"]["carried_bytes"] == 370 and body["summary"]["top"]["tool_name"] == "Bash"
    assert body["sessions"][0]["session_id"] == "s1" and body["sessions"][0]["carried_bytes"] == 370


def test_subagent_spend_splits_by_agent_id(kusto_store):
    s = kusto_store
    _request(s, "m1", 10.0, cost=1.0)
    _request(s, "m2", 11.0, agent="s1", cost=1.0)  # agent_id equal to the session id is the main agent
    _request(s, "x1", 12.0, agent="a", cost=2.0)
    _request(s, "x2", 13.0, agent="a", cost=2.0)
    _request(s, "x3", 14.0, agent="b", cost=2.0)
    _request(s, "x3", 14.0, agent="b", cost=4.0, _v=NEWER)
    _request(s, "x4", 15.0, agent="c", cost=50.0)
    s.insert("requests", dedup_key="x4", ts=15.0, session_id="s1", agent_id="c", tool="claude-code", _deleted=True, _v=NEWER)
    _request(s, "u1", 10.0, session="s2", tool="codex-cli", cost=None)
    body = _card(s, "subagents")
    tools = {tool["tool"]: tool for tool in body["tools"]}
    claude = tools["claude-code"]
    assert claude["main"] == {"requests": 2, "priced": 2, "cost_usd": 2.0}
    assert claude["subagents"] == {"requests": 3, "priced": 3, "cost_usd": 8.0, "agents": 2}
    assert claude["subagent_share"] == pytest.approx(0.8)
    assert tools["codex-cli"]["main"]["cost_usd"] is None and tools["codex-cli"]["subagent_share"] is None
    assert body["summary"]["subagents"] == 2 and body["summary"]["subagent_share"] == pytest.approx(0.8)
    # The card names a tool as the board does; the labels come with the answer.
    assert body["tool_labels"] == {"claude-code": "Claude Code", "codex-cli": "Codex CLI"}
    assert body["sessions"] == [{"session_id": "s1", "node_id": "test-node", "tool": "claude-code", "requests": 3,
                                 "cost_usd": 8.0, "main_cost": 2.0, "agents": 2}]


def test_after_failure_classifies_the_next_call_of_the_same_agent(kusto_store):
    s = kusto_store
    calls = [
        ("f1", "Bash", "x", 1),  # next: the same call fails again
        ("f2", "Bash", "x", 1),  # next: the same call succeeds
        ("f3", "Bash", "x", 0),
        ("f4", "Bash", "y", 1),  # next: Bash with another target fails
        ("f5", "Bash", "z", 1),  # next: Bash with another target succeeds
        ("f6", "Bash", "w", 1),  # an older version: the newer one succeeded
        ("f7", "Read", "p", 1),  # next: another tool
        ("f8", "Edit", "p", 1),  # next: the same call fails again
        ("f9", "Edit", "p", 1),  # the agent's last call
    ]
    for i, (key, name, target, failed) in enumerate(calls):
        _call(s, key, 100.0 + i, name, target=target, failed=failed)
    _call(s, "f6", 105.0, "Bash", target="w", failed=0, _v=NEWER)
    # A deleted failure between f3 and f4; and a subagent call after f9, which is not f9's next call.
    _call(s, "fx", 102.5, "Bash", target="y", failed=1)
    s.insert("tool_invocations", dedup_key="fx", ts=102.5, session_id="s1", tool="claude-code", tool_name="Bash",
             _deleted=True, _v=NEWER)
    _call(s, "g1", 200.0, "Bash", agent="sub", target="x", failed=0)
    body = _card(s, "failures")
    (claude,) = body["tools"]
    assert claude["failures"] == 7 and claude["last_failures"] == 1
    assert claude["outcomes"] == {"identical_failed": 2, "identical_succeeded": 1, "changed_failed": 1,
                                  "changed_succeeded": 1, "other_tool": 1}
    assert (claude["streaks"], claude["streak_calls"], claude["longest"]) == (1, 3, 3)
    assert body["sessions"] == [{"session_id": "s1", "node_id": "test-node", "tool": "claude-code", "longest": 3,
                                 "streaks": 1, "streak_calls": 3}]


def test_repeated_reads_compare_files_within_one_session_and_agent(kusto_store):
    s = kusto_store
    for i in range(3):
        _call(s, f"p{i}", 10.0 + i, "Read", target="p", output=100)
    _call(s, "q0", 20.0, "Read", target="q", output=40)
    for i in range(5):
        _call(s, f"f{i}", 30.0 + i, "view", target="five", tool="copilot-cli", session="c1", output=None)
    _call(s, "a0", 40.0, "Read", agent="sub", target="p", output=100)   # another agent: a first read
    _call(s, "b0", 41.0, "Read", session="s2", target="p", output=100)  # another session: a first read
    _call(s, "n0", 42.0, "Read", target="", output=100)                 # no path: not compared
    _call(s, "x0", 43.0, "Bash", target="p", output=100)                # not a read
    _call(s, "d0", 44.0, "Read", target="p", output=100)
    s.insert("tool_invocations", dedup_key="d0", ts=44.0, session_id="s1", tool="claude-code", tool_name="Read",
             _deleted=True, _v=NEWER)
    body = _card(s, "rereads")
    tools = {tool["tool"]: tool for tool in body["tools"]}
    claude, copilot = tools["claude-code"], tools["copilot-cli"]
    assert (claude["reads"], claude["repeat_reads"], claude["files"], claude["unmatched"]) == (6, 2, 4, 1)
    assert claude["repeat_bytes"] == pytest.approx(200.0) and claude["repeat_share"] == pytest.approx(2 / 6)
    assert (copilot["repeat_reads"], copilot["files_5plus"], copilot["most_reads"]) == (4, 1, 5)
    assert copilot["repeat_bytes"] is None
    assert body["summary"]["repeat_reads"] == 6 and body["summary"]["repeat_bytes"] == pytest.approx(200.0)
    assert [row["session_id"] for row in body["sessions"]] == ["c1", "s1"]


DAY_MS = 86_400_000.0


def _timed_call(store, key, ts, name="Bash", *, kind="command", program="", duration=None, **values):
    store.insert("tool_invocations", dedup_key=key, ts=ts, session_id=values.pop("session", "s1"), agent_id="",
                 tool=values.pop("tool", "claude-code"), tool_name=name, target_kind=kind, command_name=program,
                 duration_ms=duration, is_error=values.pop("failed", 0), **values)


def test_time_split_sums_request_and_call_durations_and_groups_programs(kusto_store):
    s = kusto_store
    _request(s, "r1", 10.0, duration_ms=1000.0, thinking_ms=400.0)
    _request(s, "r2", 11.0, duration_ms=9999.0)
    _request(s, "r2", 11.0, duration_ms=2000.0, _v=NEWER)          # the winning version
    _request(s, "r3", 12.0, duration_ms=50_000.0)
    s.insert("requests", dedup_key="r3", ts=12.0, session_id="s1", tool="claude-code", _deleted=True, _v=NEWER)
    _request(s, "r4", 13.0, duration_ms=None)                      # no duration: counted apart
    _request(s, "r5", 14.0, duration_ms=2 * DAY_MS)                # over 24 hours: a recording error
    _request(s, "v1", 15.0, session="s2", tool="copilot-cli", duration_ms=500.0)  # thinking not reported
    calls = [
        ("c1", "cargo", 99_999.0, 0), ("c2", "cargo", 30_000.0, 1), ("c3", "for", 1000.0, 0), ("c4", "export", 2000.0, 0),
        ("c5", "NODE", 3000.0, 0), ("c6", "sleep", 5000.0, 0), ("c7", "until", 7000.0, 0), ("c16", "cargo", 2 * DAY_MS, 0),
    ]
    for i, (key, program, duration, failed) in enumerate(calls):
        _timed_call(s, key, 20.0 + i, program=program, duration=duration, failed=failed)
    _timed_call(s, "c1", 20.0, program="cargo", duration=10_000.0, _v=NEWER)  # the winning version
    _timed_call(s, "c8", 30.0, kind="", duration=4000.0)                     # a command with no program recorded
    _timed_call(s, "c9", 31.0, "Agent", kind="agent", duration=1e6)           # starts a subagent: left out
    _timed_call(s, "c10", 32.0, "Read", kind="file", duration=5.0)
    _timed_call(s, "c11", 33.0, "permission:Bash", kind="", duration=100.0)  # a permission row: left out
    _timed_call(s, "c12", 34.0, program="cargo", duration=1e6)
    s.insert("tool_invocations", dedup_key="c12", ts=34.0, session_id="s1", tool="claude-code", tool_name="Bash",
             _deleted=True, _v=NEWER)
    _timed_call(s, "c14", 35.0, "mcp__srv__bash", kind="", duration=50.0)    # a server tool, not a command
    _timed_call(s, "c15", 200_000.0, program="cargo", duration=1e6)          # outside the period
    body = _card(s, "time")
    tools = {tool["tool"]: tool for tool in body["tools"]}
    claude = tools["claude-code"]
    assert (claude["requests"], claude["untimed_requests"], claude["overlong_requests"]) == (4, 1, 1)
    assert (claude["model_ms"], claude["thinking_ms"]) == (3000.0, 400.0)
    assert (claude["calls"], claude["untimed_calls"], claude["overlong_calls"]) == (11, 0, 1)
    assert claude["tool_ms"] == pytest.approx(62_055.0)
    assert claude["overlong_ms"] == pytest.approx(4 * DAY_MS)
    assert tools["copilot-cli"]["thinking_ms"] is None and tools["copilot-cli"]["tool_ms"] is None
    groups = {(row["group"], row["program"]): row for row in body["programs"]}
    assert set(groups) == {("program", "cargo"), ("shell", None), ("waiting", None), ("unrecorded", None)}
    cargo = groups[("program", "cargo")]
    assert (cargo["calls"], cargo["overlong"], cargo["duration_ms"]) == (3, 1, 40_000.0)
    assert cargo["failure_share"] == pytest.approx(1 / 3)
    assert (groups[("shell", None)]["calls"], groups[("shell", None)]["duration_ms"]) == (3, 6000.0)
    assert (groups[("waiting", None)]["calls"], groups[("waiting", None)]["duration_ms"]) == (2, 12_000.0)
    assert groups[("unrecorded", None)]["p95_ms"] == pytest.approx(4000.0)
    summary = body["summary"]
    assert summary["thinking_reported"] == ["claude-code"] and summary["top_program"]["program"] == "cargo"
    assert (summary["untimed_requests"], summary["overlong"]) == (1, 2)
    assert body["sessions"][0]["session_id"] == "s1" and body["sessions"][0]["tool_ms"] == pytest.approx(62_055.0)


def _sized(store, key, ts, context, *, output=1000, cost=1.0, session="s1", tool="claude-code", **values):
    store.insert("requests", dedup_key=key, ts=ts, session_id=session, agent_id="", tool=tool, input_tokens=context,
                 cache_read_tokens=0, cache_creation_tokens=0, output_tokens=output, cost_usd=cost, **values)


def test_context_weight_buckets_requests_by_the_tokens_the_model_read(kusto_store):
    s = kusto_store
    # Bucket edges: each bound belongs to the bucket above it.
    _sized(s, "e1", 10.0, 49_999, cost=1.0)
    _sized(s, "e2", 11.0, 50_000, cost=1.0)
    _sized(s, "e3", 12.0, 199_999, cost=2.0)
    _sized(s, "e4", 13.0, 200_000, cost=6.0)
    s.insert("requests", dedup_key="e5", ts=14.0, session_id="s2", agent_id="", tool="claude-code", input_tokens=100_000,
             cache_read_tokens=350_000, cache_creation_tokens=50_000, output_tokens=1000, cost_usd=10.0)  # 500k: the top bucket
    _sized(s, "e6", 15.0, 10_000, cost=1.0)
    _sized(s, "e6", 15.0, 600_000, cost=20.0, _v=NEWER)            # the winning version
    _sized(s, "e7", 16.0, 900_000, cost=99.0)
    s.insert("requests", dedup_key="e7", ts=16.0, session_id="s1", tool="claude-code", _deleted=True, _v=NEWER)
    # Small steps: under 150 output tokens and no thinking time recorded.
    _sized(s, "m1", 17.0, 20_000, output=149, cost=0.5)
    _sized(s, "m2", 18.0, 20_000, output=150, cost=0.5)
    _sized(s, "m3", 19.0, 20_000, output=10, cost=0.5, thinking_ms=800.0)
    # A source that records no token counts (zeros) is not reported, and none of its requests is a small step.
    _sized(s, "z1", 20.0, 0, output=0, cost=0.0, session="c1", tool="codex-cli")
    _sized(s, "o1", 200_000.0, 300_000, cost=50.0)                 # outside the period
    body = _card(s, "context")
    tools = {tool["tool"]: tool for tool in body["tools"]}
    claude = tools["claude-code"]
    cells = {cell["bucket"]: cell for cell in claude["buckets"]}
    assert {bucket: cells[bucket]["requests"] for bucket in insights.CONTEXT_BUCKETS} == \
        {"under_50k": 4, "50_100k": 1, "100_200k": 1, "200_500k": 1, "over_500k": 2}
    assert cells["over_500k"]["cost_usd"] == pytest.approx(30.0)
    assert (claude["requests"], claude["reported"], claude["heavy_requests"]) == (9, 9, 3)
    assert claude["cost_usd"] == pytest.approx(41.5) and claude["heavy_cost_usd"] == pytest.approx(36.0)
    assert cells["200_500k"]["request_share"] == pytest.approx(1 / 9)
    assert cells["over_500k"]["cost_share"] == pytest.approx(30.0 / 41.5)
    assert claude["p50_context"] == pytest.approx(50_000, rel=0.01)
    assert (claude["small_requests"], claude["small_cost_usd"]) == (1, pytest.approx(0.5))
    codex = tools["codex-cli"]
    assert (codex["reported"], codex["p50_context"], codex["small_requests"], codex["cost_usd"]) == (0, None, None, None)
    assert all(cell["request_share"] is None for cell in codex["buckets"])
    summary = body["summary"]
    assert (summary["heavy_requests"], summary["reported"], summary["not_reported"]) == (3, 9, ["codex-cli"])
    assert summary["heavy_cost_share"] == pytest.approx(36.0 / 41.5)
    assert [(row["session_id"], row["cost_usd"]) for row in body["sessions"]] == [("s1", 26.0), ("s2", 10.0)]


def test_a_stored_zero_cost_with_tokens_is_unpriced_and_the_cards_say_how_many_requests_they_leave_out(kusto_store):
    s = kusto_store
    # The ingest stored 0 for a model with no list price; a request with no tokens costs 0 and is priced.
    _request(s, "m1", 10.0, cost=1.0)
    _request(s, "m2", 11.0, cost=0.0)
    _request(s, "x1", 12.0, agent="a", cost=2.0)
    _request(s, "x2", 13.0, agent="a", cost=0.0)
    s.insert("requests", dedup_key="z1", ts=14.0, session_id="s1", agent_id="a", tool="claude-code", cost_usd=0.0)
    body = _card(s, "subagents")
    (claude,) = body["tools"]
    assert claude["main"] == {"requests": 2, "priced": 1, "cost_usd": 1.0}
    assert claude["subagents"] == {"requests": 3, "priced": 2, "cost_usd": 2.0, "agents": 1}
    assert body["summary"]["unpriced_requests"] == 2
    context = _card(s, "context")
    assert context["summary"]["unpriced_requests"] == 2 and context["summary"]["cost_usd"] == pytest.approx(3.0)


def _main(store, key, ts, *, session, cost=1.0, agent="", tool="claude-code", project="/p/alpha", **values):
    store.insert("requests", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, project_path=project,
                 cost_usd=cost, **values)


def _edit(store, key, ts, name="Edit", *, session, agent="", tool="claude-code", **values):
    store.insert("tool_invocations", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, tool_name=name,
                 **values)


def test_orientation_counts_main_agent_requests_up_to_the_first_edit(kusto_store):
    s = kusto_store
    # s1: three main requests up to the edit (the third at the same time as the edit call), one after it.
    for key, ts, cost in (("a1", 10.0, 1.0), ("a2", 20.0, 2.0), ("a3", 30.0, 4.0), ("a4", 40.0, 8.0)):
        _main(s, key, ts, session="s1", cost=cost)
    _main(s, "a5", 15.0, session="s1", agent="sub", cost=100.0)           # a subagent request: not the main agent's
    _edit(s, "ae", 30.0, session="s1")
    # s2: the first edit is a subagent's; a server tool and a permission row are not edit calls.
    for key, ts in (("b1", 10.0), ("b2", 20.0), ("b3", 30.0)):
        _main(s, key, ts, session="s2", agent="s2")                       # agent id equal to the session id: main
    _edit(s, "bm", 12.0, "mcp__srv__edit_file", session="s2")
    _edit(s, "bp", 11.0, "permission:Edit", session="s2")
    _edit(s, "be", 25.0, "Write", session="s2", agent="sub")
    # s3: the winning version of the edit call decides when it was.
    _main(s, "c1", 10.0, session="s3")
    _edit(s, "ce", 5.0, "apply_patch", session="s3")
    _edit(s, "ce", 11.0, "apply_patch", session="s3", _v=NEWER)
    # s4: its only edit was deleted, so it never edits.
    _main(s, "d1", 10.0, session="s4", cost=3.0)
    _main(s, "d2", 20.0, session="s4", cost=5.0)
    _edit(s, "de", 15.0, session="s4")
    s.insert("tool_invocations", dedup_key="de", ts=15.0, session_id="s4", tool="claude-code", tool_name="Edit",
             _deleted=True, _v=NEWER)
    # s5: another project with one session; s6 starts after the period.
    _main(s, "e1", 10.0, session="s5", tool="copilot-cli", project="/p/beta", cost=0.5)
    _edit(s, "ee", 12.0, "replace_string_in_file", session="s5", tool="copilot-cli")
    _main(s, "f1", 200_000.0, session="s6")
    _edit(s, "fe", 200_001.0, session="s6")
    body = _card(s, "orientation")
    assert body["projects"] == [{"project_path": "/p/alpha", "sessions": 3, "tools": ["claude-code"], "p50_requests": 2.0,
                                 "p50_cost_usd": 2.0}]
    tools = {tool["tool"]: tool for tool in body["tools"]}
    claude = tools["claude-code"]
    assert (claude["sessions"], claude["edited"], claude["never"], claude["never_requests"]) == (4, 3, 1, 2)
    assert claude["never_cost_usd"] == pytest.approx(8.0)
    assert (tools["copilot-cli"]["edited"], tools["copilot-cli"]["never_cost_usd"]) == (1, 0.0)
    assert [(row["session_id"], row["requests"], row["before_cost"]) for row in body["sessions"]] == [
        ("s1", 3, 7.0), ("s2", 2, 2.0), ("s3", 1, 1.0), ("s5", 1, 0.5)]
    assert body["summary"] == {"sessions": 5, "edited": 4, "projects": 1, "never": 1, "never_cost_usd": 8.0, "no_project": 0,
                               "unpriced_requests": 0}


def test_orientation_names_edit_calls_by_the_board_rule():
    from aictl.dashboard.board_projection import _EDIT_TOOL_RE, is_edit_tool
    from aictl.dashboard.projection_utils import _MCP_TOOL_RE

    edit, server = _kql_regexes("insights.orientation")
    assert (edit, server) == (_EDIT_TOOL_RE.pattern, _MCP_TOOL_RE.pattern)
    for name in ("Edit", "Write", "apply_patch", "replace_string_in_file", "create_file", "insert_edit_into_file",
                 "mcp__srv__edit_file", "github/create_file", "Read", "Bash",
                 "create", "recreate_index"):  # Copilot CLI creates a file with a tool named just "create"
        assert is_edit_tool(name) == (bool(re.search(edit, name)) and not re.search(server, name)), name


def _kql_regexes(view: str) -> list[str]:
    text = (QUERIES / f"{view}.kql").read_text()
    return re.findall(r"matches regex @'([^']*)'", text)


def _kql_list(view: str, name: str) -> set[str]:
    text = (QUERIES / f"{view}.kql").read_text()
    body = re.search(rf"let {name} = dynamic\(\[(.*?)\]\);", text, re.S)
    assert body, name
    return set(re.findall(r"'([^']*)'", body.group(1)))


def test_time_split_names_command_tools_and_shell_words_by_the_python_rules():
    from aictl.dashboard import shell_program
    from aictl.dashboard.board_projection import _COMMAND_TOOL_RE
    from aictl.dashboard.projection_utils import _MCP_TOOL_RE

    found = _kql_regexes("insights.time_split")
    assert _COMMAND_TOOL_RE.pattern in found and _MCP_TOOL_RE.pattern in found
    # Every word the UI's program rule reads as setup, a prefix, a block end or not a program is a shell word
    # or a waiting word here, so the card never lists such a word as a program.
    words = _kql_list("insights.time_split", "ShellWords") | _kql_list("insights.time_split", "WaitingWords")
    rule = (shell_program._PREFIXES | shell_program._ENDS | shell_program._FOLDER
            | {"for", "foreach", "case", "select", "function"}) - {"!", "{", "}"}
    assert rule <= words, sorted(rule - words)


def _item(store, session, kind, name, ts, tokens=0, *, agent="", tool="claude-code", path="", removed=0, **values):
    store.insert("session_context_items", session_id=session, agent_id=agent, kind=kind, name=name, ts=ts, path=path,
                 chars=tokens * 4, tokens=tokens, estimated=1, removed=removed, tool=tool, **values)


def _listing(store, session, kind, items, ts, *, agent="", tool="claude-code", **values):
    """A list row as context_lists.group writes it: the items once in context_lists, one pointer per announcement."""
    lid = list_id(kind, [{"name": name, "tokens": tokens} for name, tokens in items])
    for name, tokens in items:
        store.insert("context_lists", list_id=lid, kind=kind, name=name, path="", chars=tokens * 4, tokens=tokens,
                     estimated=1, removed=0, tool=tool)
    _item(store, session, kind, f"list:{lid}", ts, sum(tokens for _, tokens in items), agent=agent, tool=tool, **values)


def _use(store, key, ts, name, *, session="s1", tool="claude-code", trigger="agent-invoked", **values):
    store.insert("skill_uses", dedup_key=key, ts=ts, session_id=session, agent_id="", tool=tool, name=name, trigger=trigger,
                 **values)


def test_fixed_context_counts_each_item_once_as_of_its_last_reset(kusto_store):
    s = kusto_store
    # s1: a skill listing, sent again after a compaction (the same list: one key, its newest record counts).
    _item(s, "s1", "reset", "skills", 10.0)
    _listing(s, "s1", "skills", [("alpha", 100), ("beta", 200)], 10.0)
    _listing(s, "s1", "skills", [("zeta", 5000)], 10.0)                    # not sent again after the compaction
    _item(s, "s1", "mcp_instructions", "srv", 20.0, 300)                   # not sent again either
    _item(s, "s1", "reset", "*", 50.0)                                     # the compaction
    _listing(s, "s1", "skills", [("alpha", 100), ("beta", 200)], 50.0, _v=NEWER)
    _item(s, "s1", "memory_file", "/home/u/proj/CLAUDE.md", 50.0, 500, path="/home/u/proj/CLAUDE.md")
    _item(s, "s1", "memory_file", "/home/u/proj/CLAUDE.md", 50.0, 1000, path="/home/u/proj/CLAUDE.md", _v=NEWER)
    _item(s, "s1", "tools_listed", "Read", 55.0, 10)
    _item(s, "s1", "tools_listed", "Grep", 60.0, removed=1)                # removed: not in the context
    _listing(s, "s1", "skills", [("gamma", 999)], 55.0, agent="sub")       # a subagent's: not the session's fixed context
    _item(s, "s1", "report", "", 60.0, 90_000)                             # the /context report: a measurement, not an item
    # s2: a full listing replaces an earlier one; both lists hold alpha and were written in one version.
    _listing(s, "s2", "skills", [("alpha", 100)], 20.0)
    _item(s, "s2", "reset", "skills", 30.0)
    _listing(s, "s2", "skills", [("alpha", 100), ("delta", 400)], 30.0)
    _item(s, "s2", "memory_file", "/work/AGENTS.md", 30.0, 50, path="/work/AGENTS.md")
    # c1: a Copilot CLI system prompt replaced an earlier one; its unnamed instruction block is no file.
    _item(s, "c1", "instruction_file", "/r/.github/copilot-instructions.md", 5.0, 300, tool="copilot-cli",
          path="/r/.github/copilot-instructions.md")
    _item(s, "c1", "reset", "*", 10.0, tool="copilot-cli")
    _item(s, "c1", "system_prompt_other", "tools", 10.0, 2000, tool="copilot-cli")
    _item(s, "c1", "instruction_file", "custom instruction 1", 10.0, 700, tool="copilot-cli")
    _item(s, "s9", "memory_file", "/x/CLAUDE.md", 200_000.0, 70, path="/x/CLAUDE.md")  # after the period
    # Uses: alpha by a subagent in the period; delta after it; Copilot CLI uses a skill but reports no listing.
    _use(s, "u1", 40.0, "alpha")
    _use(s, "u2", 300_000.0, "delta", session="s2")
    _use(s, "u3", 15.0, "alpha", session="c1", tool="copilot-cli", trigger="context-load")
    _use(s, "u4", 16.0, "beta", trigger="")
    _use(s, "u4", 300_000.0, "beta", _v=NEWER)                             # the winning version is after the period
    body = _card(s, "fixed")
    tools = {tool["tool"]: tool for tool in body["tools"]}
    claude = {cell["kind"]: cell for cell in tools["claude-code"]["kinds"]}
    assert tools["claude-code"]["sessions"] == 2
    assert tools["claude-code"]["avg_tokens"] == pytest.approx((1310 + 550) / 2)
    assert (claude["skills"]["sessions"], claude["skills"]["avg_tokens"]) == (2, pytest.approx(400.0))
    assert claude["memory_file"]["avg_tokens"] == pytest.approx(525.0) and claude["memory_file"]["estimated"] is True
    assert (claude["tools_listed"]["sessions"], claude["tools_listed"]["session_share"]) == (1, pytest.approx(0.5))
    assert claude["mcp_instructions"] == {"kind": "mcp_instructions", "reported": False, "sessions": None,
                                          "session_share": None, "p50_tokens": None, "avg_tokens": None,
                                          "p50_items": None, "estimated": False}
    copilot = {cell["kind"]: cell for cell in tools["copilot-cli"]["kinds"]}
    assert copilot["instruction_file"]["avg_tokens"] == pytest.approx(700.0) and copilot["skills"]["reported"] is False
    assert body["tools"][0]["tool"] == "copilot-cli" and body["tools"][0]["p50_tokens"] == pytest.approx(2700.0)
    skills = {row["tool"]: row for row in body["skills"]}
    assert skills["claude-code"] == {"tool": "claude-code", "listed": 3, "used": 1, "listing_tokens": 800.0,
                                     "unused_tokens": 600.0, "uses": 1, "skills_used": 1, "triggers": ["agent-invoked"]}
    assert skills["copilot-cli"] == {"tool": "copilot-cli", "listed": None, "used": None, "listing_tokens": None,
                                     "unused_tokens": None, "uses": 1, "skills_used": 1, "triggers": ["context-load"]}
    assert [(row["name"], row["sessions"], row["tokens"], row["uses"]) for row in body["top_skills"]] == [
        ("delta", 1, 400.0, 0), ("alpha", 2, 200.0, 1), ("beta", 1, 200.0, 0)]
    assert [(row["file"], row["tool"], row["sessions"], row["max_tokens"]) for row in body["files"]] == [
        ("CLAUDE.md", "claude-code", 1, 1000.0), ("custom instruction (no file)", "copilot-cli", 1, 700.0),
        ("AGENTS.md", "claude-code", 1, 50.0)]
    assert body["summary"] == {
        "sessions": 3, "heaviest": {"tool": "copilot-cli", "p50_tokens": 2700.0}, "listed": 3, "never_used": 2,
        "never_used_share": pytest.approx(2 / 3), "listing_tokens": 800.0, "unused_tokens": 600.0,
        "listing_not_reported": ["copilot-cli"],
    }
    assert [(row["session_id"], row["tokens"]) for row in body["sessions"]] == [("c1", 2700), ("s1", 1310), ("s2", 550)]
    # Neither source table carries a tombstone; the view would drop one through column_ifexists('_deleted') if it did.
    assert TABLES["session_context_items"].tombstone is None and TABLES["skill_uses"].tombstone is None


def _compaction(store, key, ts, session, *, tool="claude-code", **values):
    store.insert("context_events", dedup_key=key, ts=ts, session_id=session, agent_id="", tool=tool, kind="compaction", **values)


def test_problem_sessions_flag_each_signal_per_session_and_tool(kusto_store):
    s = kusto_store
    for session, tool, cost, project in (("a1", "claude-code", 2.0, "/p/alpha"), ("a2", "claude-code", 1.0, "/p/alpha"),
                                         ("c1", "copilot-cli", 0.5, "/p/beta"), ("c2", "copilot-cli", None, "/p/beta"),
                                         ("c3", "copilot-cli", 1.0, "/p/beta"), ("v1", "copilot-vscode", 3.0, ""),
                                         ("x1", "codex-cli", 0.0, "")):
        _request(s, f"r-{session}", 10.0, session=session, tool=tool, cost=cost, project_path=project)
    # a1: 3 compactions, 3 failed calls of one agent in a row, a turn that ended on an API error.
    for i in range(3):
        _compaction(s, f"k1-{i}", 20.0 + i, "a1")
        _call(s, f"f1-{i}", 30.0 + i, "Bash", session="a1", failed=1)
    s.insert("session_turns", session_id="a1", prompt_id="p1", ts=40.0, tool="claude-code", ended_with_api_error=1)
    # a2: the third compaction's winning version is after the period; the third failure in a row was deleted;
    # a failure of another agent does not continue the run; its turn ended normally.
    _compaction(s, "k2-0", 20.0, "a2")
    _compaction(s, "k2-1", 21.0, "a2")
    _compaction(s, "k2-2", 22.0, "a2")
    _compaction(s, "k2-2", 200_000.0, "a2", _v=NEWER)
    _call(s, "f2-0", 30.0, "Bash", session="a2", failed=1)
    _call(s, "f2-1", 31.0, "Bash", session="a2", failed=1)
    _call(s, "f2-s", 31.5, "Bash", session="a2", agent="sub", failed=1)
    _call(s, "f2-2", 32.0, "Bash", session="a2", failed=1)
    s.insert("tool_invocations", dedup_key="f2-2", ts=32.0, session_id="a2", agent_id="", tool="claude-code", tool_name="Bash",
             _deleted=True, _v=NEWER)
    s.insert("session_turns", session_id="a2", prompt_id="p1", ts=40.0, tool="claude-code", ended_with_api_error=0)
    # c1: a failed subagent start, open todos and a failed hook. c2: a failed collect of a subagent; todos all done.
    # c3: the session marking its own task complete and a todo item are not delegation.
    _call(s, "d1", 30.0, "task", session="c1", tool="copilot-cli", failed=1, target_kind="agent")
    _call(s, "d2", 30.0, "read_agent", session="c2", tool="copilot-cli", failed=1)
    _call(s, "d3", 30.0, "task_complete", session="c3", tool="copilot-cli", failed=1)
    _call(s, "d4", 31.0, "TaskCreate", session="c3", tool="copilot-cli", failed=1)
    s.insert("session_outcomes", session_id="c1", ts=50.0, tool="copilot-cli", todos_total=3, todos_completed=1, hook_runs=4,
             hook_failures=2)
    s.insert("session_outcomes", session_id="c2", ts=50.0, tool="copilot-cli", todos_total=2, todos_completed=2, hook_runs=1,
             hook_failures=0)
    # v1: Copilot VS Code records tool calls only; x1: Codex CLI records no signal source at all.
    _call(s, "v-0", 30.0, "Read", session="v1", tool="copilot-vscode", failed=0)
    body = _card(s, "problems")
    tools = {tool["tool"]: tool for tool in body["tools"]}
    claude = {cell["signal"]: cell for cell in tools["claude-code"]["signals"]}
    assert (tools["claude-code"]["sessions"], tools["claude-code"]["flagged"], tools["claude-code"]["multi"]) == (2, 1, 1)
    assert claude["compaction"] == {"signal": "compaction", "reported": True, "sessions": 1, "share": 0.5, "cost_usd": 2.0}
    assert claude["failure_streak"]["sessions"] == 1 and claude["api_error"]["sessions"] == 1
    assert claude["failed_delegation"] == {"signal": "failed_delegation", "reported": True, "sessions": 0, "share": 0.0,
                                           "cost_usd": 0.0}
    assert claude["open_todos"] == {"signal": "open_todos", "reported": False, "sessions": None, "share": None, "cost_usd": None}
    copilot = {cell["signal"]: cell for cell in tools["copilot-cli"]["signals"]}
    assert (copilot["failed_delegation"]["sessions"], copilot["failed_delegation"]["share"]) == (2, pytest.approx(2 / 3))
    assert copilot["failed_delegation"]["cost_usd"] == 0.5     # c2 is not priced
    assert (copilot["open_todos"]["sessions"], copilot["hook_failure"]["sessions"]) == (1, 1)
    assert copilot["compaction"]["reported"] is False and copilot["api_error"]["reported"] is False
    vscode = {cell["signal"]: cell["reported"] for cell in tools["copilot-vscode"]["signals"]}
    assert vscode == {"compaction": False, "failure_streak": True, "failed_delegation": True, "api_error": False,
                      "open_todos": False, "hook_failure": False}
    assert tools["codex-cli"]["reports"] is False and tools["codex-cli"]["flagged"] is None
    assert [(row["signals"], row["sessions"]) for row in body["pairs"]] == [
        (["api_error", "compaction"], 1), (["api_error", "failure_streak"], 1), (["compaction", "failure_streak"], 1),
        (["failed_delegation", "hook_failure"], 1), (["failed_delegation", "open_todos"], 1), (["hook_failure", "open_todos"], 1)]
    assert [(row["project"], row["sessions"], row["all_sessions"]) for row in body["projects"]] == [("beta", 2, 3), ("alpha", 1, 2)]
    assert body["summary"] == {"cost_usd": 7.5, "sessions": 6, "flagged": 3, "flagged_share": 0.5, "multi": 2,
                               "flagged_cost_usd": 2.5, "not_reporting": ["codex-cli"]}
    # The costliest session of the period, flagged or not.
    assert (body["top_session"]["session_id"], body["top_session"]["cost_usd"], body["top_session"]["project"]) == ("v1", 3.0, None)
    signals = {row["signal"]: row for row in body["signals"]}
    assert signals["api_error"] == {"signal": "api_error", "tools": ["claude-code"], "sessions": 1, "share": 0.5}
    assert [(row["session_id"], row["signals"], row["names"], row["cost_usd"]) for row in body["sessions"]] == [
        ("a1", 3, ["compaction", "failure_streak", "api_error"], 2.0),
        ("c1", 3, ["failed_delegation", "open_todos", "hook_failure"], 0.5), ("c2", 1, ["failed_delegation"], None)]


def test_problem_sessions_and_after_failure_share_one_failure_run_rule():
    from aictl.tool_targets import _AGENT_TOOLS

    for view in ("insights.after_failure", "insights.problem_sessions"):
        text = (QUERIES / f"{view}.kql").read_text()
        assert insights.FAILURE_RUNS_KQL in text, view
        assert "invoke failure_runs()" in text and "invoke failure_streaks()" in text, view
    # A call that starts a subagent is named as tool_targets names one.
    assert _kql_list("insights.problem_sessions", "AgentTools") == set(_AGENT_TOOLS)


def test_the_findings_cards_name_the_project_that_carries_the_stake_and_the_summary_ranks_them(kusto_store):
    s = kusto_store
    # alpha: one long session with a long pause, a heavy context and a subagent; beta: two small sessions that never edit.
    # Every request has 900 output tokens, so none is a small step.
    _request(s, "a1", 1000.0, session="big", cost=1.0, project_path="/p/alpha", output_tokens=900)
    _request(s, "a1b", 1010.0, session="big", cost=1.0, project_path="/p/alpha", output_tokens=900)  # 10 s: the no-pause price
    _sized(s, "a2", 1500.0, 300_000, session="big", cost=40.0, project_path="/p/alpha")  # 490 s pause, 300k context
    _request(s, "a3", 1510.0, session="big", agent="sub", cost=20.0, project_path="/p/alpha", output_tokens=900)
    _edit(s, "e1", 1600.0, session="big")
    _request(s, "b1", 1000.0, session="small1", cost=2.0, project_path="C:\\work\\beta", output_tokens=900)
    _request(s, "b2", 1000.0, session="small2", cost=3.0, project_path="C:\\work\\beta", output_tokens=900)
    history = HistoryScope(kusto_store.history_store.reader, None)
    pause = _card(s, "pause")
    assert pause["projects"] == [{"project": "alpha", "tool": "claude-code", "requests": 1, "sessions": 1, "cost_usd": 40.0,
                                  "extra_usd": pytest.approx(39.0)}] and pause["summary"]["sessions"] == 1
    sub = _card(s, "subagents")
    assert sub["projects"] == [{"project": "alpha", "requests": 1, "agents": 1, "sessions": 1, "cost_usd": 20.0}]
    assert sub["summary"]["sessions"] == 1
    context = _card(s, "context")
    assert context["projects"] == [{"project": "alpha", "requests": 1, "sessions": 1, "cost_usd": 40.0}]
    assert context["summary"]["heavy_sessions"] == 1
    orientation = _card(s, "orientation")
    assert orientation["never_projects"] == [{"project": "beta", "sessions": 2, "cost_usd": 5.0}]
    problems = _card(s, "problems")
    assert problems["summary"]["cost_usd"] == pytest.approx(67.0)
    assert problems["top_session"] == {"session_id": "big", "node_id": "test-node", "tool": "claude-code", "project": "alpha",
                                       "signals": 0, "cost_usd": 62.0}
    status, body = insights.insight("summary", PERIOD, 200_000.0, history=history)
    assert status == 200 and body["missing"] == [] and body["total_usd"] == pytest.approx(67.0)
    found = {item["kind"]: item for item in body["findings"]}
    # Ranked by dollars; a card with no evidence (no problem signal, no failure, no read, no commit) adds no line.
    assert [item["kind"] for item in body["findings"]] == ["top_session", "heavy_context", "pause_tax", "subagents",
                                                           "never_edited"]
    assert found["top_session"]["session"] == {"session_id": "big", "node_id": "test-node", "tool": "claude-code"}
    assert found["top_session"]["share"] == pytest.approx(62.0 / 67.0) and found["top_session"]["opens"] == "session"
    assert found["never_edited"]["project"] == {"name": "beta", "sessions": 2, "stake": 5.0}
    assert found["never_edited"]["sessions"] == 2 and found["never_edited"]["opens"] == "card"
    assert found["pause_tax"]["stake"] == pytest.approx(39.0) and found["pause_tax"]["project"]["name"] == "alpha"


def _answers(**cards):
    empty = {"problems": {"summary": {"cost_usd": 100.0, "flagged_cost_usd": None, "flagged": 0, "multi": 0}, "projects": [],
                          "top_session": None}}
    return {**empty, **cards}


def test_the_summary_ranks_priced_findings_by_dollars_then_counts_by_share_and_leaves_out_what_has_no_evidence():
    answers = _answers(
        context={"summary": {"heavy_cost_usd": 10.0, "heavy_sessions": 3, "heavy_requests": 4, "heavy_share": 0.1,
                             "small_cost_usd": 0.0, "small_requests": 0}, "projects": []},
        subagents={"summary": {"subagent_cost_usd": 30.0, "sessions": 2, "subagents": 5, "subagent_requests": 9},
                   "projects": [{"project": "a", "sessions": 1, "cost_usd": 20.0}, {"project": None, "sessions": 1, "cost_usd": 25.0}]},
        rereads={"summary": {"repeat_reads": 50, "reads": 100, "repeat_share": 0.5, "repeat_bytes": None, "files_5plus": 1}},
        failures={"summary": {"streaks": 2, "streak_calls": 9, "failures": 10, "longest": 5}},
        verified={"summary": {"untested_sessions": 0, "edit_sessions": 4}},
    )
    found = insights.findings(answers)
    assert [item["kind"] for item in found["findings"]] == ["subagents", "heavy_context", "failure_runs", "rereads"]
    first = found["findings"][0]
    assert first["share"] == pytest.approx(0.3)
    # The project that carries the most of the stake, among projects with a name.
    assert first["project"] == {"name": "a", "sessions": 1, "stake": 20.0}
    # Without the period's total no share is stated, and a card that was not read adds nothing.
    assert insights.findings({"context": answers["context"]})["findings"][0]["share"] is None


class _Reader:
    def __init__(self, failing=()):
        self.failing = set(failing)
        self.calls = []

    def read(self, view, params):
        self.calls.append((view, dict(params)))
        if view in self.failing:
            raise StoreError(f"Kusto view {view} failed")
        return ReadResult([{"row_type": "meta", "first_ts": 5.0, "last_ts": 15.0, "computed_at": 25.0}])


def test_each_card_route_answers_on_its_own_and_one_failure_stays_in_its_card(monkeypatch):
    reader = _Reader(failing={"insights.context_carry"})
    monkeypatch.setattr(HistoryScope, "local", classmethod(lambda cls, store: HistoryScope(reader, None)))
    answers = {card: board_routes.handle_get(route, "since=10&until=20", None, None, now=30.0)
               for route, card in insights.ROUTES.items()}
    assert answers["carry"][0] == 503 and "insights.context_carry" in json.loads(answers["carry"][1])["error"]
    for card in ("pause", "subagents", "failures", "rereads"):
        status, raw = answers[card]
        body = json.loads(raw)
        assert status == 200, card
        assert body["card"] == card and body["range"] == {"since": 10.0, "until": 20.0}
        assert body["data_range"] == {"first_ts": 5.0, "last_ts": 15.0} and body["computed_at"] == 25.0
        assert body["sessions"] == [] and body["query"]["kql"].startswith("// aictl view insights.")
    assert {view for view, _ in reader.calls} == set(insights.CARDS.values())
    assert all(params["since"] == 10.0 and params["until"] == 20.0 for _, params in reader.calls)
    assert board_routes.handle_get("/api/board/insights/pause", "since=20&until=10", None, None, now=30.0)[0] == 400


def test_the_summary_reads_the_cards_views_once_each_and_names_a_card_it_could_not_read():
    reader = _Reader(failing={"insights.rereads"})
    status, body = insights.insight("summary", Filters(since=10.0, until=20.0), 30.0, history=HistoryScope(reader, None))
    assert status == 200 and body["findings"] == [] and body["missing"] == ["rereads"]
    assert sorted(view for view, _ in reader.calls) == sorted(insights.CARDS[card] for card in insights.SUMMARY_CARDS)
    assert all(params["since"] == 10.0 and params["until"] == 20.0 for _, params in reader.calls)


def test_an_empty_store_reports_nothing_as_not_reported():
    history = HistoryScope(_Reader(), None)
    for card in insights.CARDS:
        status, body = insights.insight(card, PERIOD, 1.0, history=history)
        assert status == 200
        figures = body["summary"]
        assert all(figures.get(key) is None for key in ("cost_usd", "carried_bytes", "subagent_share", "repeat_share",
                                                        "repeat_bytes", "longest") if key in figures), card
