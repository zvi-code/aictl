"""Insights bars split by repository, the context cards: Context weight, Orientation, Fixed context, Repeated file reads.

Each card's view splits its bars by the screen's ranking of repositories (rows repo_split; repo '' is every other
repository summed) and the shape puts the segments on each bar: the segments of a bar sum to the bar, in repo_order
order with every other repository last. The views run through the replay harness (recorded against the scratch
database), on invented rows.
"""

from __future__ import annotations

import pytest
from kusto_replay import LOCAL_NODE

from aictl.dashboard import insights
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope

PERIOD = Filters(since=0.0, until=100_000.0)
OTHER = "node-two"
ROOT = "/work/r"
REPOS = [f"{ROOT}{i}" for i in range(10)]
WORKTREE = f"{REPOS[0]}/.claude/worktrees/w1"
CARDS = ("context", "orientation", "fixed", "rereads")


def _card(store, card, node=None, qualified=False):
    status, body = insights.insight(card, PERIOD, 200_000.0, history=HistoryScope(store.history_store.reader, node, qualified))
    assert status == 200
    return body


def _node(node):
    return {"node_id": node} if node else {}


def _session(store, sid, path, node=None):
    store.insert("sessions", session_id=sid, tool="claude-code", project_path=path, project=path, started_at=10.0,
                 ended_at=5000.0, last_activity_at=5000.0, **_node(node))


def _request(store, key, sid, path, cost, *, ts=100.0, context=10, output=5, node=None):
    store.insert("requests", dedup_key=key, session_id=sid, agent_id="", tool="claude-code", model="claude-opus-5-5",
                 project_path=path, project=path, ts=ts, input_tokens=context, cache_read_tokens=0, cache_creation_tokens=0,
                 output_tokens=output, cost_usd=cost, duration_ms=1000.0, **_node(node))


def _call(store, key, sid, path, name, target, *, ts=50.0, output=100, node=None):
    store.insert("tool_invocations", dedup_key=key, session_id=sid, agent_id="", tool="claude-code", tool_name=name,
                 project_path=path, project=path, ts=ts, target_kind="file", target=target, output_bytes=output, is_error=0,
                 **_node(node))


def _item(store, sid, kind, name, tokens, *, path="", node=None):
    store.insert("session_context_items", session_id=sid, agent_id="", kind=kind, name=name, ts=50.0, path=path,
                 chars=tokens * 4, tokens=tokens, estimated=1, removed=0, tool="claude-code", **_node(node))


def _seed(store):
    # Ten repositories, one session each, costing 10, 9, ... 1 (small requests of 10 tokens): r0 to r7 are ranked, r8
    # and r9 are "other". A worktree session belongs to its repository r0.
    for i, path in enumerate(REPOS):
        _session(store, f"s{i}", path)
        _request(store, f"q{i}", f"s{i}", path, float(10 - i))
    _session(store, "w1", WORKTREE)
    _request(store, "qw", "w1", WORKTREE, 5.0)
    # Two heavy requests (not small steps): r0 in 200k-500k, r8 in 100k-200k. r0 costs 17, r8 2.5 (still under r7's 3).
    _request(store, "h0", "s0", REPOS[0], 2.0, ts=150.0, context=300_000, output=1000)
    _request(store, "h8", "s8", REPOS[8], 0.5, ts=150.0, context=120_000, output=1000)
    # Edits: s0 and s1 edit; every other session never edits.
    _call(store, "e0", "s0", REPOS[0], "Edit", "a.py", ts=200.0)
    _call(store, "e1", "s1", REPOS[1], "Write", "b.py", ts=200.0)
    # File reads (by hash of their path, per session and agent): s0 reads a.py 3 times, w1 once, s1 two files once,
    # s2 e.py 5 times, s9 d.py twice.
    for i in range(3):
        _call(store, f"ra{i}", "s0", REPOS[0], "Read", "a.py")
    _call(store, "rw", "w1", WORKTREE, "Read", "a.py")
    _call(store, "rb", "s1", REPOS[1], "Read", "b.py")
    _call(store, "rc", "s1", REPOS[1], "Read", "c.py")
    for i in range(5):
        _call(store, f"re{i}", "s2", REPOS[2], "Read", "e.py")
    for i in range(2):
        _call(store, f"rd{i}", "s9", REPOS[9], "Read", "d.py")
    # Fixed context: CLAUDE.md in s0, s1 and w1; AGENTS.md in s8; skills alpha and beta in s0, alpha in s9; s0 uses alpha.
    _item(store, "s0", "memory_file", "/x/CLAUDE.md", 100, path="/x/CLAUDE.md")
    _item(store, "s1", "memory_file", "/x/CLAUDE.md", 50, path="/x/CLAUDE.md")
    _item(store, "w1", "memory_file", "/x/CLAUDE.md", 30, path="/x/CLAUDE.md")
    _item(store, "s8", "memory_file", "/x/AGENTS.md", 40, path="/x/AGENTS.md")
    _item(store, "s0", "skills", "alpha", 10)
    _item(store, "s0", "skills", "beta", 20)
    _item(store, "s9", "skills", "alpha", 10)
    store.insert("skill_uses", dedup_key="u1", ts=60.0, session_id="s0", agent_id="", tool="claude-code", name="alpha",
                 trigger="agent-invoked")
    # Another node: r9 costs the most there, so in the fleet it is ranked first. Its session edits, reads and lists.
    _session(store, "o9", REPOS[9], node=OTHER)
    _request(store, "qo", "o9", REPOS[9], 100.0, node=OTHER)
    _call(store, "eo", "o9", REPOS[9], "Edit", "z.py", ts=200.0, node=OTHER)
    _call(store, "ro", "o9", REPOS[9], "Read", "z.py", node=OTHER)
    _item(store, "o9", "memory_file", "/x/CLAUDE.md", 60, path="/x/CLAUDE.md", node=OTHER)


def _segments(bar, *measures):
    return [(segment["repo"], *(segment[measure] for measure in measures)) for segment in bar["repos"]]


def _check(bar, measures, order):
    """The segments of each reported measure sum to the bar, and they come in the screen's order, every other last."""
    ranked = [item["repo"] for item in order] + [""]
    found = [segment["repo"] for segment in bar["repos"]]
    assert found == [repo for repo in ranked if repo in found], found
    for measure in measures:
        if bar[measure] is None:
            assert all(segment[measure] is None for segment in bar["repos"])
            continue
        assert sum(segment[measure] for segment in bar["repos"]) == pytest.approx(bar[measure]), measure
        if bar[measure]:
            assert sum(segment["share"][measure] for segment in bar["repos"]) == pytest.approx(1.0), measure


def _local(store, card):
    body = _card(store, card, node=LOCAL_NODE, qualified=True)
    assert [item["repo"] for item in body["repo_order"]] == REPOS[:8]
    return body


def test_every_context_card_splits_its_bars_and_carries_the_rank_block():
    assert {"context", "orientation", "fixed", "rereads"} <= insights.REPO_SPLIT_CARDS
    from aictl.stores.kusto.reader import _VIEWS
    for card in CARDS:
        assert _VIEWS[insights.CARDS[card]][1].split()[-2:] == ["split_key", "repo"]


def test_context_weight_splits_each_bucket_the_tool_and_its_small_steps(kusto_store):
    _seed(kusto_store)
    body = _local(kusto_store, "context")
    order = body["repo_order"]
    (tool,) = body["tools"]
    cells = {cell["bucket"]: cell for cell in tool["buckets"]}
    under = cells["under_50k"]
    assert (under["requests"], under["cost_usd"]) == (11, pytest.approx(60.0))
    assert _segments(under, "requests", "cost_usd") == [
        (REPOS[0], 2, 15.0), *((REPOS[i], 1, float(10 - i)) for i in range(1, 8)), ("", 2, 3.0)]
    assert _segments(cells["200_500k"], "requests", "cost_usd") == [(REPOS[0], 1, 2.0)]
    # A repository outside the 8 (r8) is "other", the whole of the 100k-200k cell.
    assert _segments(cells["100_200k"], "requests", "cost_usd") == [("", 1, 0.5)]
    assert cells["over_500k"]["repos"] == []
    # r0's requests: 2 of its 3 are under 50k.
    assert under["repos"][0]["of_repo"]["requests"] == pytest.approx(2 / 3)
    for cell in tool["buckets"]:
        _check(cell, insights.CONTEXT_MEASURES, order)
    assert tool["reported"] == 13
    assert _segments(tool, "reported", "cost_usd")[0] == (REPOS[0], 3, 17.0)
    _check(tool, ("reported", "cost_usd"), order)
    # Small steps: the 11 small requests; the heavy ones are not.
    assert tool["small_requests"] == 11
    small = {"small_requests": tool["small_requests"], "small_cost_usd": tool["small_cost_usd"], "repos": tool["small_repos"]}
    assert _segments(small, "small_requests")[0] == (REPOS[0], 2) and _segments(small, "small_requests")[-1] == ("", 2)
    _check(small, ("small_requests", "small_cost_usd"), order)


def test_orientation_splits_each_tool_bar_of_sessions_with_and_without_an_edit(kusto_store):
    _seed(kusto_store)
    body = _local(kusto_store, "orientation")
    (tool,) = body["tools"]
    assert (tool["sessions"], tool["edited"], tool["never"]) == (11, 2, 9)
    by_repo = {segment["repo"]: segment for segment in tool["repos"]}
    assert (by_repo[REPOS[0]]["sessions"], by_repo[REPOS[0]]["edited"], by_repo[REPOS[0]]["never"]) == (2, 1, 1)
    assert by_repo[REPOS[0]]["never_cost_usd"] == pytest.approx(5.0)
    assert (by_repo[""]["sessions"], by_repo[""]["never"], by_repo[""]["never_cost_usd"]) == (2, 2, pytest.approx(3.5))
    _check(tool, insights.ORIENTATION_MEASURES, body["repo_order"])


def test_rereads_splits_each_tool_bar_of_reads_files_and_bytes(kusto_store):
    _seed(kusto_store)
    body = _local(kusto_store, "rereads")
    (tool,) = body["tools"]
    assert (tool["reads"], tool["repeat_reads"], tool["files"], tool["files_5plus"]) == (13, 7, 6, 1)
    assert tool["repeat_bytes"] == pytest.approx(700.0)
    assert _segments(tool, "reads", "repeat_reads", "files", "files_5plus", "repeat_bytes") == [
        (REPOS[0], 4, 2, 2, 0, pytest.approx(200.0)), (REPOS[1], 2, 0, 2, 0, 0.0),
        (REPOS[2], 5, 4, 1, 1, pytest.approx(400.0)), ("", 2, 1, 1, 0, pytest.approx(100.0))]
    _check(tool, insights.REREAD_MEASURES, body["repo_order"])


def test_fixed_context_splits_each_tool_average_and_each_kind_on_it(kusto_store):
    _seed(kusto_store)
    body = _local(kusto_store, "fixed")
    order = body["repo_order"]
    (tool,) = body["tools"]
    # The tool's average: 260 tokens over 5 sessions; a repository's part is its tokens over the same 5 sessions.
    assert (tool["sessions"], tool["avg_tokens"]) == (5, pytest.approx(52.0))
    assert _segments(tool, "sessions", "avg_tokens") == [
        (REPOS[0], 2, pytest.approx(32.0)), (REPOS[1], 1, pytest.approx(10.0)), ("", 2, pytest.approx(10.0))]
    _check(tool, ("sessions", "avg_tokens"), order)
    kinds = {cell["kind"]: cell for cell in tool["kinds"]}
    assert _segments(kinds["memory_file"], "sessions", "avg_tokens") == [
        (REPOS[0], 2, pytest.approx(26.0)), (REPOS[1], 1, pytest.approx(10.0)), ("", 1, pytest.approx(8.0))]
    assert _segments(kinds["skills"], "sessions", "avg_tokens") == [(REPOS[0], 1, pytest.approx(6.0)), ("", 1, pytest.approx(2.0))]
    assert kinds["mcp_instructions"]["repos"] == []
    for cell in tool["kinds"]:
        _check(cell, ("sessions", "avg_tokens"), order)
    # The skill listing, the skills and the files are not split (the split costs more cluster time than the view).
    assert body["skills"] and body["top_skills"] and body["files"]
    assert not any("repos" in row for row in [*body["skills"], *body["top_skills"], *body["files"]])


@pytest.mark.parametrize("card", CARDS)
def test_fleet_scope_counts_the_other_node_in_its_ranked_repository(kusto_store, card):
    _seed(kusto_store)
    body = _card(kusto_store, card)
    order = body["repo_order"]
    assert [item["repo"] for item in order] == [REPOS[9], *REPOS[:7]]
    (tool,) = body["tools"]
    # r9 holds s9 and the other node's o9; r7 is now "other" with r8.
    first = tool["repos"][0]
    assert first["repo"] == REPOS[9]
    expected = {"context": ("reported", 2), "orientation": ("sessions", 2), "rereads": ("reads", 3), "fixed": ("sessions", 2)}[card]
    assert first[expected[0]] == expected[1]
    measures = {"context": ("reported", "cost_usd"), "orientation": insights.ORIENTATION_MEASURES,
                "rereads": insights.REREAD_MEASURES, "fixed": ("sessions", "avg_tokens")}[card]
    _check(tool, measures, order)
