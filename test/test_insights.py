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

from aictl.dashboard import board_routes, insights
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.base import ReadResult, StoreError
from aictl.stores.kusto.reader import _CACHE_TTL_S, _VIEWS

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
        "tools": ["claude-code"], "requests": 2, "cost_usd": pytest.approx(12.0), "baseline_usd": pytest.approx(1.0),
        "extra_usd": pytest.approx(11.0), "not_reported": ["copilot-vscode"],
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


def test_an_empty_store_reports_nothing_as_not_reported():
    history = HistoryScope(_Reader(), None)
    for card in insights.CARDS:
        status, body = insights.insight(card, PERIOD, 1.0, history=history)
        assert status == 200
        figures = body["summary"]
        assert all(figures.get(key) is None for key in ("cost_usd", "carried_bytes", "subagent_share", "repeat_share",
                                                        "repeat_bytes", "longest") if key in figures), card
