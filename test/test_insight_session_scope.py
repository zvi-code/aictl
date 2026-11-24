"""The page's coding tool and model filters on the Insights views that do not take them in their own text.

A view read for chosen coding tools or models runs on the rows of the chosen sessions only
(stores/kusto/session_scope.py). The proof is an equality on invented rows: a node that holds sessions of two
tools and three models, narrowed by a filter, answers exactly as a node that holds only the chosen sessions. The
views run through the replay harness (recorded against the scratch database).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from aictl.dashboard import insights, insights_work
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.panel_kql import filled_query
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.kusto.project_scope import PARAMETER, restricted_query
from aictl.stores.kusto.reader import _query
from aictl.stores.kusto.session_scope import MODELS_PARAMETER, SESSION_SCOPED, TOOLS_PARAMETER
from aictl.stores.kusto.tables import TABLES

QUERIES = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries"
NEWER = "2026-02-01"
# The cards read through the session scope: every card but the three whose own views take the two filters.
SCOPED = sorted(card for card in insights.CARDS if card not in insights_work.PARAMS)
# Session: its coding tool, the model of its requests, its project. "c2" spells the model as Copilot stores it.
SESSIONS = {
    "a1": ("claude-code", "claude-opus-5-5", "/p/alpha"),
    "a2": ("claude-code", "claude-sonnet-5-5", "/p/beta"),
    "c1": ("copilot-cli", "gpt-6-astra", "/p/alpha"),
    "c2": ("copilot-cli", "claude-opus-5.5", "/p/beta"),
}
OPUS = "claude-opus-5-5"
# Node: the sessions it holds. `mixed` is narrowed by a filter; each other node holds what one filter chooses.
NODES = {"mixed": ("a1", "a2", "c1", "c2"), "tool": ("a1", "a2"), "model": ("a1", "c2"), "both": ("a1",), "none": ()}
CASES = {
    "tool": {"tools": ("claude-code",)},
    "model": {"model": OPUS},
    "both": {"tools": ("claude-code",), "model": OPUS},
    "none": {"tools": ()},
}


def _session(store, node, name):
    """One session with a row in every table the Insights views read by session."""
    tool, model, path = SESSIONS[name]
    sid = f"{node}-{name}"
    at = {"session_id": sid, "tool": tool, "project": path, "project_path": path, "node_id": f"node-{node}"}

    def put(table, **values):
        # Each table takes the columns of the session it has (not every table keeps the project path).
        columns = {column for column, _kind in TABLES[table].columns}
        store.insert(table, **values, **{key: value for key, value in at.items() if key in columns})

    n = list(SESSIONS).index(name) + 1
    put("sessions", started_at=10.0, ended_at=5000.0, last_activity_at=5000.0)
    put("session_prompts", dedup_key=f"{sid}-p1", agent_id="", ts=20.0, text=f"Fix the parser bug number {n} in the importer")
    put("session_prompts", dedup_key=f"{sid}-p2", agent_id="", ts=2000.0, text="Now run the tests and commit the change")
    put("session_turns", prompt_id=f"{sid}-t1", ts=20.0, ended_at=900.0, origin="human")
    put("session_turns", prompt_id=f"{sid}-t2", ts=2000.0, ended_at=2600.0, origin="human")
    put("session_steps", step_key=f"{sid}-s1", ts=20.0, source="transcript", kind="turn")
    # Main agent requests: a short gap, then a pause of more than five minutes before the third.
    for i, ts in enumerate((30.0, 60.0, 1000.0, 2010.0, 2400.0)):
        put("requests", dedup_key=f"{sid}-q{i}", agent_id="", model=model, ts=ts, input_tokens=1000 * n, output_tokens=200,
                     cache_read_tokens=5000 * (i + 1), cache_creation_tokens=300, cost_usd=0.5 * n + i, duration_ms=4000.0 + i)
    # A subagent of the session, and a request that was deleted after it was stored.
    put("requests", dedup_key=f"{sid}-qs", agent_id="sub", model=model, ts=70.0, input_tokens=400, output_tokens=50,
                 cache_read_tokens=100, cache_creation_tokens=10, cost_usd=0.25, duration_ms=900.0)
    put("requests", dedup_key=f"{sid}-qd", agent_id="", model=model, ts=80.0, input_tokens=9000, cost_usd=40.0)
    put("requests", dedup_key=f"{sid}-qd", agent_id="", ts=80.0, _deleted=True, _v=NEWER)

    def call(key, ts, tool_name, **values):
        put("tool_invocations", dedup_key=f"{sid}-{key}", ts=ts, agent_id="", tool_name=tool_name, is_error=values.pop("failed", 0),
                     duration_ms=values.pop("duration", 500.0), output_bytes=values.pop("output", 2000), **values)

    call("c1", 35.0, "Read", target="/p/alpha/a.py", target_kind="file")
    call("c2", 40.0, "Read", target="/p/alpha/a.py", target_kind="file", output=2500)
    call("c3", 45.0, "Bash", target="pytest -q", target_kind="command", command_name="pytest", failed=1, is_test_run=1)
    call("c4", 50.0, "Bash", target="pytest -q", target_kind="command", command_name="pytest", is_test_run=1, duration=1000.0 * n)
    call("c5", 65.0, "Edit", target="/p/alpha/a.py", target_kind="file", is_edit=1)
    call("c6", 1010.0, "mcp__docs__find", mcp_server="docs", mcp_tool="find", output=40_000)
    call("c7", 2020.0, "Bash", target="git commit -m fix", target_kind="command", command_name="git")
    # A call that was deleted after it was stored.
    call("cd", 90.0, "Bash", target="rm -rf build", target_kind="command", command_name="rm", output=900_000)
    put("tool_invocations", dedup_key=f"{sid}-cd", ts=90.0, agent_id="", tool_name="Bash", _deleted=True, _v=NEWER)
    for i in range(3):
        put("skill_uses", dedup_key=f"{sid}-u{i}", ts=100.0 + i, agent_id="", name="review", trigger="agent-invoked")
        put("context_events", dedup_key=f"{sid}-e{i}", ts=300.0 + i, agent_id="", kind="compaction")
    put("session_context_items", agent_id="", kind="instructions", name="AGENTS.md", ts=15.0, path=f"{path}/AGENTS.md",
                 chars=4000, tokens=1000 * n, estimated=1, removed=0)
    put("session_outcomes", ts=50.0, todos_total=3, todos_completed=1, hook_runs=4, hook_failures=2)


@pytest.fixture
def seeded(kusto_store):
    for node, names in NODES.items():
        for name in names:
            _session(kusto_store, node, name)
    return kusto_store


def _answer(store, card, node, **filters):
    """A card's answer on one node, without what names the node, the time of the read and the query text."""
    status, body = insights.insight(card, Filters(since=0.0, until=100_000.0, **filters), 200_000.0,
                                    history=HistoryScope(store.history_store.reader, f"node-{node}", True))
    assert status == 200
    kept = {key: value for key, value in body.items() if key not in ("query", "computed_at", "node_scope")}
    # A session is named by its node and id; the same session on another node has that node in both.
    return json.loads(json.dumps(kept).replace(f"node-{node}", "node").replace(f"{node}-", ""))


@pytest.mark.parametrize("card", SCOPED)
def test_a_narrowed_card_answers_as_a_store_that_holds_only_the_chosen_sessions(seeded, card):
    whole = _answer(seeded, card, "mixed")
    for case, filters in CASES.items():
        assert _answer(seeded, card, "mixed", **filters) == _answer(seeded, card, case), case
    # The rows are not trivial: one tool's sessions differ from every session's.
    assert _answer(seeded, card, "mixed", tools=("claude-code",)) != whole


def test_the_three_work_cards_keep_their_own_filters(seeded):
    """Their views take the two filters in their own text; the reader is not asked to narrow them a second time."""
    for card in insights_work.PARAMS:
        status, body = insights.insight(card, Filters(since=0.0, until=100_000.0, tools=("claude-code",), model=OPUS), 200_000.0,
                                        history=HistoryScope(seeded.history_store.reader, "node-mixed", True))
        assert status == 200 and "aictl_scope_ids" not in body["query"]["kql"]
        assert "let requested_models = dynamic([" in body["query"]["kql"]


def test_the_shown_query_is_the_narrowed_one():
    params = {"since": 0.0, "until": 10.0, "limit": 10, TOOLS_PARAMETER: ["claude-code"], MODELS_PARAMETER: [OPUS]}
    text = filled_query("insights.skills", params)
    assert 'let scope_tools = dynamic(["claude-code"]);' in text and f'let scope_models = dynamic(["{OPUS}"]);' in text
    assert "let skill_uses_current = skill_uses_current | where session_id in (aictl_scope_ids);" in text
    # No filter: the view's own text, no scope.
    assert "aictl_scope" not in filled_query("insights.skills", {"since": 0.0, "until": 10.0, "limit": 10, TOOLS_PARAMETER: None})


def test_every_table_with_a_session_is_narrowed_and_keeps_the_tombstone_rule():
    """A filter before the reduction of versions must keep a tombstone with its row (docs/storage-schema.md)."""
    for table, marker in SESSION_SCOPED.items():
        spec = TABLES.get(table) or TABLES[table.removesuffix("_current")]
        carried = "session_id" in spec.key or "session_id" in spec.tombstone_scope
        # A tombstone that does not carry the session is kept by its marker column; one that does needs none.
        assert marker == (None if carried or spec.tombstone is None else spec.tombstone), table
    assert {"sessions", "requests", "requests_current", "tool_invocations_current", "skill_uses_current", "session_prompts_current",
            "session_context_items", "context_events", "session_turns", "session_steps", "session_commits"} <= set(SESSION_SCOPED)


def test_every_scoped_view_takes_the_scope_and_reads_the_chosen_sessions_before_it_shadows_them():
    for card in SCOPED:
        view = insights.CARDS[card]
        text = restricted_query(_query(view), projects=True, tools=True, models=True)
        head = text.split(";", 1)[0]
        assert head.endswith(f"{PARAMETER}:dynamic, {TOOLS_PARAMETER}:dynamic, {MODELS_PARAMETER}:dynamic)"), view
        # The chosen sessions come from the stored rows of the chosen projects, not from the narrowed tables.
        assert text.index("let aictl_scope_ids") < text.index("let sessions = sessions"), view
        assert "let aictl_scope_tool_sessions = sessions | where ['project'] in (restrict_projects)" in text
        assert "let aictl_scope_requests = requests_current | where ['project'] in (restrict_projects)" in text
        assert re.search(r"let requests_current = requests_current \| where \['project'\] in \(restrict_projects\)"
                         r" \| where session_id in \(aictl_scope_ids\);", text), view
    # The repository order of a narrowed card is read for the same sessions.
    assert "aictl_scope_ids" in restricted_query(_query("insights.repo_rank"), projects=False, tools=True)
    # A view with no period cannot be narrowed to a model: the model's sessions are those of the period.
    with pytest.raises(ValueError, match="period"):
        restricted_query(_query("insights.session_names"), projects=False, models=True)


def test_project_only_restriction_is_unchanged_by_the_session_scope():
    """The text of a view restricted to projects alone names no session scope (its recordings stay valid)."""
    for path in QUERIES.glob("*.kql"):
        try:
            text = restricted_query(path.read_text(encoding="utf-8").strip())
        except ValueError:
            continue
        assert "aictl_scope" not in text and "scope_tools" not in text, path.name
