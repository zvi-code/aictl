"""Insights bars split by repository: Pause tax, Spend in subagents, After a failure and Problem sessions.

Each card's view splits its bars by the screen's ranking of repositories (rows repo_split; repo '' is every other
repository summed), and the shape puts the segments on each bar. The segments of a bar sum to the bar, in repo_order
order with "other" last. The views run through the replay harness (recorded against the scratch database), on
invented rows.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from kusto_replay import LOCAL_NODE

from aictl.dashboard import insights
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope

QUERIES = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries"
PERIOD = Filters(since=0.0, until=100_000.0)
OTHER = "node-two"
ROOT = "/work/r"
REPOS = [f"{ROOT}{i}" for i in range(10)]
WORKTREE = f"{REPOS[0]}/.claude/worktrees/w1"
CARDS = ("pause", "subagents", "failures", "problems")


def _card(store, card, node=None, qualified=False):
    status, body = insights.insight(card, PERIOD, 200_000.0, history=HistoryScope(store.history_store.reader, node, qualified))
    assert status == 200
    return body


def _session(store, sid, path, node=None):
    store.insert("sessions", session_id=sid, tool="claude-code", project_path=path, project=path, started_at=10.0,
                 ended_at=5000.0, last_activity_at=5000.0, **({"node_id": node} if node else {}))


def _request(store, key, sid, path, cost, ts=100.0, agent="", node=None):
    store.insert("requests", dedup_key=key, session_id=sid, agent_id=agent, tool="claude-code", model="claude-opus-5-5",
                 project_path=path, project=path, ts=ts, input_tokens=10, cache_read_tokens=100, cache_creation_tokens=10,
                 output_tokens=5, cost_usd=cost, duration_ms=1000.0, **({"node_id": node} if node else {}))


def _call(store, key, sid, path, ts, failed, name="Bash", target="x", node=None, **values):
    store.insert("tool_invocations", dedup_key=key, session_id=sid, agent_id="", tool="claude-code", tool_name=name,
                 project_path=path, project=path, ts=ts, target=target, is_error=failed,
                 **({"node_id": node} if node else {}), **values)


def _seed(store):
    # Ten repositories, one session each, costing 1000, 900, ... 100: r0 to r7 are ranked, r8 and r9 are "other" (the
    # requests below add too little to change the order). The worktree session belongs to r0.
    for i, path in enumerate(REPOS):
        _session(store, f"s{i}", path)
        _request(store, f"q{i}", f"s{i}", path, 100.0 * (10 - i))
    _session(store, "w1", WORKTREE)
    _request(store, "qw", "w1", WORKTREE, 500.0)
    # Pauses: a second request 400 s after the first (5 to 60 minutes) in s0, w1 and s8; 30 s after it in s1.
    for sid, path, gap in (("s0", REPOS[0], 400.0), ("w1", WORKTREE, 400.0), ("s8", REPOS[8], 400.0), ("s1", REPOS[1], 30.0)):
        _request(store, f"p-{sid}", sid, path, 1.0, ts=100.0 + gap)
    # Subagent requests in s0 (r0), s2 (r2) and s9 (other).
    for sid, path, cost in (("s0", REPOS[0], 2.0), ("s2", REPOS[2], 3.0), ("s9", REPOS[9], 4.0)):
        _request(store, f"a-{sid}", sid, path, cost, ts=150.0, agent=f"agent-{sid}")
    # Failures: three failed calls in a row then the same call succeeding (s0, r0), the same in the worktree session,
    # one failed call then another tool (s1, r1), one failed last call (s8, other), three failed subagent starts (s9).
    for sid, path in (("s0", REPOS[0]), ("w1", WORKTREE)):
        for i in range(3):
            _call(store, f"f-{sid}-{i}", sid, path, 200.0 + i, 1)
        _call(store, f"f-{sid}-ok", sid, path, 210.0, 0)
    _call(store, "f-s1", "s1", REPOS[1], 200.0, 1)
    _call(store, "f-s1-next", "s1", REPOS[1], 201.0, 0, name="Read")
    _call(store, "f-s8", "s8", REPOS[8], 200.0, 1)
    for i in range(3):
        _call(store, f"f-s9-{i}", "s9", REPOS[9], 200.0 + i, 1, name="Agent", target_kind="agent")
    # Another node: r9 costs the most there, so in the fleet it is ranked first. A failed call there.
    _session(store, "o9", REPOS[9], node=OTHER)
    _request(store, "qo", "o9", REPOS[9], 10_000.0, node=OTHER)
    _call(store, "f-o9", "o9", REPOS[9], 200.0, 1, node=OTHER)


def _sums(bar, measures):
    """The segments of each measure the bar reports sum to the bar; a measure it does not report is None in each."""
    for measure in measures:
        if bar.get(measure) is None:
            assert all(segment[measure] is None for segment in bar["repos"]), measure
            continue
        assert sum(segment[measure] for segment in bar["repos"]) == pytest.approx(bar[measure]), measure
        if bar[measure]:
            assert sum(segment["share"][measure] for segment in bar["repos"]) == pytest.approx(1.0), measure


def _order_kept(bar, order):
    """Segments come in repo_order order with every other repository ('') last, each named as the order names it."""
    ranked = [item["repo"] for item in order]
    repos = [segment["repo"] for segment in bar["repos"]]
    assert repos == [repo for repo in [*ranked, ""] if repo in repos]
    names = {item["repo"]: item["name"] for item in order}
    assert all(segment["name"] == names.get(segment["repo"]) for segment in bar["repos"])


def _segments(bar, measure):
    return [(segment["repo"], segment[measure]) for segment in bar["repos"]]


def test_the_four_cards_split_their_bars_and_carry_the_shared_blocks():
    assert {"pause", "subagents", "failures", "problems"} <= insights.REPO_SPLIT_CARDS
    for name in ("repository map", "repository rank"):
        block = re.compile(rf"// <{name}>.*?// </{name}>", re.S)
        reference = block.search((QUERIES / "insights.repo_rank.kql").read_text()).group(0)
        for card in CARDS:
            # The test of the shared blocks (test_insight_repo_split) walks every view; these four carry the same text.
            match = block.search((QUERIES / f"{insights.CARDS[card]}.kql").read_text())
            assert match and match.group(0) == reference, (card, name)


def test_every_card_answer_carries_the_order_with_repositories_past_the_eighth_summed(kusto_store):
    _seed(kusto_store)
    for card in CARDS:
        body = _card(kusto_store, card, node=LOCAL_NODE, qualified=True)
        assert [item["repo"] for item in body["repo_order"]] == REPOS[:8]
        assert body["repo_others"]["repos"] == 2


def test_pause_tax_splits_buckets_long_pauses_causes_and_projects_by_repository(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "pause", node=LOCAL_NODE, qualified=True)
    order = body["repo_order"]
    (tool,) = body["tools"]
    cells = {cell["bucket"]: cell for cell in tool["buckets"]}
    # The 400 s pauses of s0 and w1 are r0's, s8's is in "other"; the 30 s pause of s1 is r1's.
    assert _segments(cells["5_60m"], "requests") == [(REPOS[0], 2), ("", 1)]
    assert _segments(cells["under_1m"], "requests") == [(REPOS[1], 1)]
    for cell in tool["buckets"]:
        _sums(cell, insights.PAUSE_MEASURES)
        _order_kept(cell, order)
    # r0's pauses are all long: its share of its own pause total is 1.
    assert cells["5_60m"]["repos"][0]["of_repo"]["requests"] == pytest.approx(1.0)
    # The long pauses: measured cost and the estimate at the under-1-minute average ($1 a request).
    long = tool["long_pause"]
    assert (long["requests"], long["cost_usd"], long["estimate_usd"]) == (3, 3.0, 3.0)
    assert _segments(long, "estimate_usd") == [(REPOS[0], 2.0), ("", 1.0)]
    _sums(long, (*insights.PAUSE_MEASURES, "estimate_usd"))
    for cause in body["causes"]:
        _sums(cause, insights.PAUSE_MEASURES)
        _order_kept(cause, order)
    # s0's pause had a subagent request in it; w1 and s8 made only untimed calls.
    assert {cause["cause"]: _segments(cause, "requests") for cause in body["causes"]} == {
        "other_agent_working": [(REPOS[0], 1)], "tool_short_or_untimed": [(REPOS[0], 1), ("", 1)]}
    projects = {row["project"]: row for row in body["projects"]}
    assert _segments(projects["r0"], "requests") == [(REPOS[0], 1)] and _segments(projects["w1"], "requests") == [(REPOS[0], 1)]
    assert _segments(projects["r8"], "requests") == [("", 1)]
    for row in body["projects"]:
        _sums(row, ("requests", "sessions", "cost_usd", "extra_usd"))
        assert "_key" not in row
    for row in body["cause_tools"]:
        _sums(row, ("requests", "cost_usd"))


def test_subagents_split_each_side_and_each_session_by_repository(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "subagents", node=LOCAL_NODE, qualified=True)
    order = body["repo_order"]
    (tool,) = body["tools"]
    assert _segments(tool["subagents"], "cost_usd") == [(REPOS[0], 2.0), (REPOS[2], 3.0), ("", 4.0)]
    assert _segments(tool["subagents"], "agents") == [(REPOS[0], 1), (REPOS[2], 1), ("", 1)]
    _sums(tool["subagents"], (*insights.SUBAGENT_MEASURES, "agents"))
    _sums(tool["main"], insights.SUBAGENT_MEASURES)
    assert [segment["repo"] for segment in tool["main"]["repos"]] == [*REPOS[:8], ""]
    for side in ("main", "subagents"):
        _order_kept(tool[side], order)
    # r2's own cost: 800 main + 3 subagents.
    assert tool["subagents"]["repos"][1]["of_repo"]["cost_usd"] == pytest.approx(3 / 803)
    # Node scope qualifies a session id with its node.
    sessions = {json.loads(row["session_id"])[1]: row for row in body["sessions"]}
    assert _segments(sessions["s0"], "cost_usd") == [(REPOS[0], 2.0)] and _segments(sessions["s9"], "cost_usd") == [("", 4.0)]
    assert all("repo" not in row for row in body["sessions"])


def test_after_failure_splits_each_tool_by_repository_with_every_outcome(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "failures", node=LOCAL_NODE, qualified=True)
    (tool,) = body["tools"]
    assert tool["failures"] == 11
    assert _segments(tool, "failures") == [(REPOS[0], 6), (REPOS[1], 1), ("", 4)]
    assert _segments(tool, "streaks") == [(REPOS[0], 2), (REPOS[1], 0), ("", 1)]
    assert _segments(tool, "identical_succeeded") == [(REPOS[0], 2), (REPOS[1], 0), ("", 0)]
    assert _segments(tool, "other_tool") == [(REPOS[0], 0), (REPOS[1], 1), ("", 0)]
    assert _segments(tool, "last_failures") == [(REPOS[0], 0), (REPOS[1], 0), ("", 2)]
    _sums({**tool, **tool["outcomes"]}, insights.FAILURE_MEASURES)
    _order_kept(tool, body["repo_order"])


def test_problem_sessions_split_tools_signals_and_pairs_by_repository(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "problems", node=LOCAL_NODE, qualified=True)
    order = body["repo_order"]
    (tool,) = body["tools"]
    # Flagged: s0 and w1 (r0, a failure streak each) and s9 (other: a streak of failed delegations, both signals).
    assert _segments(tool, "flagged") == [(REPOS[0], 2), *[(repo, 0) for repo in REPOS[1:8]], ("", 1)]
    assert _segments(tool, "sessions")[0] == (REPOS[0], 2) and _segments(tool, "sessions")[-1] == ("", 2)
    _sums(tool, insights.PROBLEM_MEASURES)
    _order_kept(tool, order)
    cells = {cell["signal"]: cell for cell in tool["signals"]}
    assert _segments(cells["failure_streak"], "sessions") == [(REPOS[0], 2), ("", 1)]
    assert _segments(cells["failed_delegation"], "sessions") == [("", 1)]
    for cell in tool["signals"]:
        if cell["reported"]:
            _sums(cell, ("sessions", "cost_usd"))
    (pair,) = body["pairs"]
    assert pair["signals"] == ["failed_delegation", "failure_streak"] and _segments(pair, "sessions") == [("", 1)]
    _sums(pair, ("sessions", "cost_usd"))


def test_node_scope_is_kept_in_the_order_and_in_the_segments(kusto_store):
    _seed(kusto_store)
    local = _card(kusto_store, "failures", node=LOCAL_NODE, qualified=True)
    fleet = _card(kusto_store, "failures")
    assert [item["repo"] for item in fleet["repo_order"]] == [REPOS[9], *REPOS[:7]]
    # The other node's failure is in the fleet only, in r9's segment; r9 is ranked first there and r7 is "other".
    (tool,) = fleet["tools"]
    assert tool["failures"] == 12
    assert _segments(tool, "failures")[0] == (REPOS[9], 4)
    assert ("", 1) in _segments(tool, "failures")  # s8 (r8)
    _sums({**tool, **tool["outcomes"]}, insights.FAILURE_MEASURES)
    assert local["tools"][0]["failures"] == 11
    sub = _card(kusto_store, "subagents")
    assert _segments(sub["tools"][0]["subagents"], "cost_usd")[0] == (REPOS[9], 4.0)


def test_a_card_read_without_the_order_folds_every_bar_into_other():
    rows = [{"row_type": "tool", "tool": "t", "calls": 3, "failures": 2, "last_failures": 1},
            {"row_type": "repo_split", "tool": "t", "split_key": "", "repo": "/a", "calls": 3, "failures": 2,
             "last_failures": 1}]
    (tool,) = insights.after_failure(rows)["tools"]
    assert [(segment["repo"], segment["failures"]) for segment in tool["repos"]] == [("", 2)]
