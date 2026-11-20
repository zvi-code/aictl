"""The dashboard tool filter on Analytics and Budget, server side.

Covers the id mapping (tool_scope), every analytics query with and without a
tool selection through named reader views, the worker's cache key, the
selection each response states, the empty selection, the unattributed-row count,
and the Budget HTTP endpoint.
"""

from __future__ import annotations

import time

import pytest

from aictl.dashboard.analytics import (
    _AnalyticsCache,
    _compute_files,
    _compute_response_time,
    _compute_tools,
    analytics_key,
)
from aictl.stores import Store
from aictl.stores.testing import FixtureReader
from aictl.tool_scope import (
    UNATTRIBUTED_IDS,
    is_selected,
    is_unattributed,
    parse_tools_param,
    selection_block,
    stored_ids_for,
)
from aictl.tools import ToolResources, budget_tools, compute_token_budget

BASE = 1_700_000_000.0
SINCE, UNTIL = BASE - 10, BASE + 10_000


# ── The id mapping ────────────────────────────────────────────────


class TestToolScopeMapping:
    def test_param_absent_is_all_tools_and_empty_is_none(self):
        assert parse_tools_param("since=1") is None
        assert parse_tools_param("tools=") == ()
        assert parse_tools_param("since=1&tools=&until=2") == ()

    def test_param_lists_distinct_sorted_ids(self):
        assert parse_tools_param("tools=codex-cli,claude-code") == ("claude-code", "codex-cli")
        assert parse_tools_param("tools=a,,a, b ,") == ("a", "b")
        assert parse_tools_param("tools=b&tools=a") == ("a", "b")

    def test_ids_are_compared_exactly_never_by_prefix(self):
        assert stored_ids_for(["claude-code"]) == ["claude-code"]
        assert stored_ids_for(["codex-cli"]) == ["codex-cli"]
        assert "codex" not in stored_ids_for(["codex-cli"])
        assert stored_ids_for(["copilot-cli"]) == ["copilot-cli"]
        assert not is_selected("copilot-cli", ["copilot-vscode"])
        assert not is_selected("copilot-vscode", ["copilot-cli"])
        assert not is_selected("copilot-vscode-insiders", ["copilot-vscode"])

    def test_copilot_and_copilot_vscode_are_different_ids(self):
        # Selecting `copilot` alone does not select `copilot-vscode` rows.
        assert stored_ids_for(["copilot"]) == ["copilot"]
        assert not is_selected("copilot-vscode", ["copilot"])
        # The stored spelling `copilot` holds the settings the VS Code extension reads,
        # so selecting Copilot in VS Code includes it (same rule as toolScope.js).
        assert stored_ids_for(["copilot-vscode"]) == ["copilot", "copilot-vscode"]
        assert is_selected("copilot", ["copilot-vscode"])
        assert not is_selected("copilot", ["copilot-cli"])

    def test_unattributed_ids_are_never_selected(self):
        for stored in UNATTRIBUTED_IDS:
            assert is_unattributed(stored)
            assert not is_selected(stored, ["claude-code"])
            assert not is_selected(stored, [stored])
        assert stored_ids_for(["unknown", "any", ""]) == []
        assert is_selected(None, None) is True  # no filter: everything

    def test_empty_selection_selects_nothing(self):
        assert not is_selected("claude-code", [])
        assert stored_ids_for([]) == []

    def test_selection_block_states_the_selection(self):
        assert selection_block(None) == {"all_tools": True, "tools": None}
        assert selection_block(()) == {"all_tools": False, "tools": []}
        assert selection_block(("a",)) == {"all_tools": False, "tools": ["a"]}


# ── Seed data ─────────────────────────────────────────────────────


@pytest.fixture()
def db():
    """View results for exact, empty and unrestricted tool selections."""
    durations = {"claude-code": (100, 200, 300, 400), "codex-cli": (10_000, 20_000),
                 "copilot-vscode": (50,), "copilot-cli": (70,)}

    def requests(params):
        chosen = params["requested_tools"] if params["restrict_tools"] else durations
        groups = [
            {"claude-code": dict(model="m-a", count=4, avg_ms=250, p50_ms=300, p95_ms=400,
                                 input_tokens=400, output_tokens=40),
             "codex-cli": dict(model="m-b", count=2, avg_ms=15000, p50_ms=20000, p95_ms=20000),
             "copilot-vscode": dict(model="m-c", count=1), "copilot-cli": dict(model="m-c", count=1)}[tool]
            for tool in chosen if tool in durations
        ]
        if not params["restrict_tools"]:
            groups[0] = {**groups[0], "count": 6, "p95_ms": 998}
        rows = [dict(row_type="request", duration_ms=ms, ts=BASE + i, session_id=tool)
                for tool in chosen for i, ms in enumerate(durations.get(tool, ()))]
        return [dict(row_type="hidden", hidden=2 if params["restrict_tools"] else 0),
                *(g | {"row_type": "model"} for g in groups), *rows]

    def tools(params):
        selected = params["restrict_tools"]
        chosen = params["requested_tools"]
        hidden = dict(row_type="hidden", hidden=int(selected))
        if params.get("since", 0) > UNTIL or (selected and "codex-cli" not in chosen):
            return [hidden]
        if selected:
            return [hidden, dict(row_type="tool", tool_name="Read", count=1, avg_ms=5000, p95_ms=5000, error_count=0),
                    dict(row_type="tool", tool_name="Shell", count=1, avg_ms=2000, p95_ms=2000, error_count=0),
                    dict(row_type="cli", tool_name="Read", cli_tool="codex-cli", count=1)]
        return [hidden, dict(row_type="tool", tool_name="Read", count=5, avg_ms=1220, p95_ms=5000, error_count=0)]

    def memory(params):
        paths = {"claude-code": "/m/claude.md", "codex-cli": "/m/codex.md", "copilot": "/m/vscode.md", "": "/m/orphan.md"}
        selected = params["restrict_tools"]
        chosen = params["requested_tools"] if selected else paths
        visible = [paths[t] for t in chosen if t in paths]
        return [dict(row_type="inventory", count=len(visible)), dict(row_type="hidden", hidden=int(selected)),
                *(dict(row_type="revision", path=path, ts=BASE, size_bytes=10, tokens=2) for path in visible)]

    return Store(reader=FixtureReader({"analytics.requests": requests, "analytics.tools": tools,
                                      "analytics.memory": memory, "events.page": []}))


class TestResponseTimeSection:
    def test_percentiles_and_groups_come_from_the_selected_rows(self, db):
        everything = _compute_response_time(db, SINCE, UNTIL)
        assert everything["unattributed_hidden"] == 0
        claude = _compute_response_time(db, SINCE, UNTIL, tools=("claude-code",))
        assert len(claude["requests"]) == 4
        (group,) = claude["by_model"]
        assert group["model"] == "m-a"
        assert group["count"] == 4
        assert group["avg_ms"] == 250.0
        assert group["p50_ms"] == 300
        assert group["p95_ms"] == 400
        assert group["total_tokens"] == 4 * 110
        # Not scaled from the machine-wide figure: that one has other tools in it.
        overall = {g["model"]: g for g in everything["by_model"]}
        assert overall["m-a"]["p95_ms"] != group["p95_ms"] or overall["m-a"]["count"] != group["count"]

    def test_hidden_unattributed_rows_are_counted_under_a_selection_only(self, db):
        assert _compute_response_time(db, SINCE, UNTIL, tools=("codex-cli",))["unattributed_hidden"] == 2
        assert _compute_response_time(db, SINCE, UNTIL, tools=())["unattributed_hidden"] == 2
        assert _compute_response_time(db, SINCE, UNTIL)["unattributed_hidden"] == 0

    def test_empty_selection_has_no_rows(self, db):
        out = _compute_response_time(db, SINCE, UNTIL, tools=())
        assert out["requests"] == [] and out["by_model"] == []


# ── Tool usage ────────────────────────────────────────────────────


class TestToolsSection:
    def test_event_path_percentiles_come_from_the_selection(self, db):
        codex = _compute_tools(db, SINCE, UNTIL, tools=("codex-cli",))
        by_name = {i["tool_name"]: i for i in codex["invocations"]}
        assert by_name["Read"]["count"] == 1
        assert by_name["Read"]["avg_ms"] == 5000.0
        assert by_name["Read"]["p95_ms"] == 5000.0
        assert codex["cli_tools"] == ["codex-cli"]
        assert codex["unattributed_hidden"] == 1
        everything = _compute_tools(db, SINCE, UNTIL)
        assert {i["tool_name"]: i for i in everything["invocations"]}["Read"]["count"] == 5
        assert everything["unattributed_hidden"] == 0

    def test_all_time_total_follows_the_selection(self, db):
        out = _compute_tools(db, UNTIL + 1000, UNTIL + 2000, tools=("codex-cli",))
        assert out["invocations"] == [] and out["total_all_time"] == 2

    def test_empty_selection(self, db):
        out = _compute_tools(db, SINCE, UNTIL, tools=())
        assert out["invocations"] == []
        assert out["unattributed_hidden"] == 1


# ── Files ─────────────────────────────────────────────────────────


class TestFilesSection:
    def test_structured_path_by_owner(self, db):
        since, until = 0.0, time.time() + 100
        assert set(_compute_files(db, since, until)["memory_timeline"]) == {
            "/m/claude.md",
            "/m/codex.md",
            "/m/vscode.md",
            "/m/orphan.md",
        }
        claude = _compute_files(db, since, until, tools=("claude-code",))
        assert set(claude["memory_timeline"]) == {"/m/claude.md"}
        assert claude["unattributed_hidden"] == 1
        # The stored `copilot` spelling belongs to Copilot in VS Code, not to Copilot CLI.
        assert set(_compute_files(db, since, until, tools=("copilot-vscode",))["memory_timeline"]) == {"/m/vscode.md"}
        assert _compute_files(db, since, until, tools=("copilot-cli",))["memory_timeline"] == {}
        assert _compute_files(db, since, until, tools=())["memory_timeline"] == {}

    def test_event_fallback_by_tool_and_session(self, kusto_store):
        kusto_store.insert("sessions", session_id="s", tool="claude-code", started_at=BASE)
        for i, (tool, sid) in enumerate((
            ("claude-code", "s"), ("", "s"), ("codex-cli", "c"), ("claude-code", "s"), ("unknown", "missing"),
        )):
            kusto_store.insert("events", ts=BASE + i, session_id=sid, kind="file_modified", tool=tool,
                               detail=f'{{"path":"/p/{i}.jsonl","growth_bytes":100}}')
        assert len(_compute_files(kusto_store, SINCE, UNTIL)["memory_events"]) == 5
        claude = _compute_files(kusto_store, SINCE, UNTIL, tools=("claude-code",))
        assert len(claude["memory_events"]) == 3
        assert claude["unattributed_hidden"] == 1


# ── The worker's cache ────────────────────────────────────────────


@pytest.fixture()
def cache(db):
    c = _AnalyticsCache()
    c._store = db
    return c


class TestCacheKey:
    def test_key_includes_the_selection_and_ignores_its_order(self):
        assert analytics_key(1, 2, ["b", "a", "a"]) == analytics_key(1, 2, ("a", "b"))
        assert analytics_key(1, 2, None) != analytics_key(1, 2, [])
        assert analytics_key(1, 2, ["a"]) != analytics_key(1, 2, ["a", "b"])
        assert analytics_key(1, 2, ["a"]) != analytics_key(1, 3, ["a"])

    def test_a_new_selection_is_pending_never_the_previous_result(self, cache):
        cache.request_range(SINCE, UNTIL, ["claude-code"])
        cache._recompute()
        claude = cache.get(SINCE, UNTIL, ["claude-code"])
        assert claude["pending"] is False
        assert len(claude["response_time"]["requests"]) == 4

        codex = cache.get(SINCE, UNTIL, ["codex-cli"])
        assert codex["pending"] is True
        assert "response_time" not in codex and "tools" not in codex and "files" not in codex
        assert codex["selection"] == {"all_tools": False, "tools": ["codex-cli"]}

        cache._recompute()
        codex = cache.get(SINCE, UNTIL, ["codex-cli"])
        assert codex["pending"] is False
        assert [r["duration_ms"] for r in codex["response_time"]["requests"]] == [10_000, 20_000]
        # The first selection is still answered with its own figures.
        assert len(cache.get(SINCE, UNTIL, ["claude-code"])["response_time"]["requests"]) == 4

    def test_all_tools_is_not_an_answer_for_a_selection(self, cache):
        cache.request_range(SINCE, UNTIL)
        cache._recompute()
        assert cache.get(SINCE, UNTIL)["pending"] is False
        assert cache.get(SINCE, UNTIL, ["claude-code"])["pending"] is True
        assert cache.get(SINCE, UNTIL, [])["pending"] is True

    def test_a_new_range_is_pending_too(self, cache):
        cache.request_range(SINCE, UNTIL, ["claude-code"])
        cache._recompute()
        assert cache.get(SINCE + 1, UNTIL, ["claude-code"])["pending"] is True

    def test_every_response_states_its_selection(self, cache):
        assert cache.get(SINCE, UNTIL)["selection"] == {"all_tools": True, "tools": None}
        cache._recompute()
        assert cache.get(SINCE, UNTIL)["selection"] == {"all_tools": True, "tools": None}
        assert cache.get(SINCE, UNTIL, ["claude-code", "codex-cli"])["selection"] == {
            "all_tools": False,
            "tools": ["claude-code", "codex-cli"],
        }
        cache._recompute()
        done = cache.get(SINCE, UNTIL, ["claude-code", "codex-cli"])
        assert done["selection"] == {"all_tools": False, "tools": ["claude-code", "codex-cli"]}
        assert done["range"] == {"since": SINCE, "until": UNTIL}

    def test_empty_selection_is_computed_and_empty(self, cache):
        assert cache.get(SINCE, UNTIL, [])["pending"] is True
        cache._recompute()
        none = cache.get(SINCE, UNTIL, [])
        assert none["pending"] is False
        assert none["selection"] == {"all_tools": False, "tools": []}
        assert none["response_time"]["requests"] == []
        assert none["tools"]["invocations"] == []
        assert none["files"]["memory_timeline"] == {}

    def test_unattributed_count_reaches_the_response(self, cache):
        cache.request_range(SINCE, UNTIL, ["codex-cli"])
        cache._recompute()
        got = cache.get(SINCE, UNTIL, ["codex-cli"])
        assert got["response_time"]["unattributed_hidden"] == 2
        assert got["tools"]["unattributed_hidden"] == 1

    def test_two_viewers_with_different_selections_both_get_answers(self, cache):
        cache.request_range(SINCE, UNTIL, ["claude-code"])
        cache.request_range(SINCE, UNTIL, ["codex-cli"])
        cache._recompute()
        assert cache.get(SINCE, UNTIL, ["claude-code"])["pending"] is False
        assert cache.get(SINCE, UNTIL, ["codex-cli"])["pending"] is False

    def test_default_window_keys_resolve_at_compute_time(self, cache):
        cache.request_range(None, None, ["claude-code"])
        cache._recompute()
        got = cache.get(None, None, ["claude-code"])
        assert got["pending"] is False
        assert got["range"]["until"] > got["range"]["since"] > 0

    def test_keys_are_bounded(self, cache):
        for i in range(20):
            cache.request_range(SINCE, UNTIL, [f"tool-{i}"])
        assert len(cache._wanted) <= cache._MAX_KEYS


class TestBudgetTools:
    def test_selection_helpers(self):
        tools = [ToolResources("claude-code", "C"), ToolResources("aictl", "a"), ToolResources("project-env", "p")]
        assert budget_tools(tools, None) is tools
        assert budget_tools(tools, ()) == []
        assert [t.tool for t in budget_tools(tools, ("claude-code",))] == ["claude-code", "project-env"]
        assert compute_token_budget(budget_tools(tools, ()))["total_potential_tokens"] == 0
