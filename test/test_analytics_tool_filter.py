"""The dashboard tool filter on Analytics and Budget, server side.

Covers the id mapping (tool_scope), every analytics query with and without a
tool selection against a real temporary database, the worker's cache key, the
selection each response states, the empty selection, the unattributed-row count,
and the two HTTP endpoints.
"""

from __future__ import annotations

import json
import threading
import time
import urllib.request
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from aictl.dashboard.analytics import (
    _AnalyticsCache,
    _compute_files,
    _compute_response_time,
    _compute_tools,
    analytics_key,
)
from aictl.dashboard.models import DashboardSnapshot, DashboardTool
from aictl.orchestrator import AllowedPaths, SnapshotStore
from aictl.storage import EventRow, HistoryDB, RequestRow, SessionRow, ToolInvocationRow
from aictl.tool_scope import (
    UNATTRIBUTED_IDS,
    is_selected,
    is_unattributed,
    parse_tools_param,
    selection_block,
    stored_ids_for,
)
from aictl.tools import ResourceFile, ToolResources, budget_tools, compute_token_budget

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
    d = HistoryDB(db_path=":memory:", flush_interval=0)
    yield d
    d.close()


def _request(db, i, tool, session, ms, model="m-a"):
    db.append_request(
        RequestRow(
            ts=BASE + i,
            source_ts=BASE + i,
            tool=tool,
            session_id=session,
            model=model,
            input_tokens=100,
            output_tokens=10,
            duration_ms=ms,
        )
    )


def _seed_sessions(db):
    for sid, tool in (("s-claude", "claude-code"), ("s-codex", "codex-cli"), ("s-vsc", "copilot-vscode")):
        db.upsert_session(SessionRow(session_id=sid, tool=tool, started_at=BASE))


def _seed_requests(db):
    _seed_sessions(db)
    for i, ms in enumerate((100, 200, 300)):
        _request(db, i, "claude-code", "s-claude", ms)
    for i, ms in enumerate((10_000, 20_000)):
        _request(db, 10 + i, "codex-cli", "s-codex", ms, model="m-b")
    _request(db, 20, "copilot-cli", "s-cli", 70, model="m-c")
    _request(db, 21, "copilot", "s-vsc", 50, model="m-c")
    # No tool on the row, but its session names one: recovered as claude-code.
    _request(db, 22, "", "s-claude", 400)
    # No tool and no session to ask: nothing can recover it.
    _request(db, 30, "unknown", "s-nobody", 999)
    _request(db, 31, "", "", 998)


def _tool_pair(db, i, tool, session, name, seconds):
    uid = f"u{i}"
    db.append_event(
        EventRow(
            ts=BASE + i,
            tool=tool,
            kind="hook:PreToolUse",
            session_id=session,
            detail={"tool_name": name, "tool_use_id": uid},
        )
    )
    db.append_event(
        EventRow(
            ts=BASE + i + seconds,
            tool=tool,
            kind="hook:PostToolUse",
            session_id=session,
            detail={"tool_name": name, "tool_use_id": uid},
        )
    )


def _seed_tool_events(db):
    _seed_sessions(db)
    _tool_pair(db, 1, "claude-code", "s-claude", "Read", 0.1)
    _tool_pair(db, 3, "claude-code", "s-claude", "Read", 0.3)
    _tool_pair(db, 5, "codex-cli", "s-codex", "Read", 5.0)
    _tool_pair(db, 20, "codex-cli", "s-codex", "Shell", 2.0)
    _tool_pair(db, 40, "", "s-claude", "Read", 0.2)  # recovered through its session
    _tool_pair(db, 60, "unknown", "s-nobody", "Read", 0.5)  # unattributable


# ── Requests ──────────────────────────────────────────────────────


class TestRequestsQuery:
    def test_without_tools_returns_every_row(self, db):
        _seed_requests(db)
        assert len(db.query_requests_analytics(since=SINCE, until=UNTIL)) == 10

    def test_selected_tool_only(self, db):
        _seed_requests(db)
        rows = db.query_requests_analytics(since=SINCE, until=UNTIL, tools=["codex-cli"])
        assert sorted(r["duration_ms"] for r in rows) == [10_000, 20_000]

    def test_row_with_no_tool_takes_its_session_tool(self, db):
        _seed_requests(db)
        rows = db.query_requests_analytics(since=SINCE, until=UNTIL, tools=["claude-code"])
        assert sorted(r["duration_ms"] for r in rows) == [100, 200, 300, 400]

    def test_two_tools_and_exact_ids(self, db):
        _seed_requests(db)
        rows = db.query_requests_analytics(since=SINCE, until=UNTIL, tools=["copilot-cli", "codex-cli"])
        assert sorted(r["duration_ms"] for r in rows) == [70, 10_000, 20_000]

    def test_copilot_vscode_includes_stored_copilot_but_not_copilot_cli(self, db):
        _seed_requests(db)
        rows = db.query_requests_analytics(since=SINCE, until=UNTIL, tools=["copilot-vscode"])
        assert [r["duration_ms"] for r in rows] == [50]
        only_copilot = db.query_requests_analytics(since=SINCE, until=UNTIL, tools=["copilot"])
        assert [r["duration_ms"] for r in only_copilot] == [50]

    def test_empty_selection_returns_nothing(self, db):
        _seed_requests(db)
        assert db.query_requests_analytics(since=SINCE, until=UNTIL, tools=[]) == []

    def test_unattributed_rows_are_in_no_selection(self, db):
        _seed_requests(db)
        every_tool = ["claude-code", "codex-cli", "copilot-cli", "copilot-vscode", "unknown", "any", ""]
        rows = db.query_requests_analytics(since=SINCE, until=UNTIL, tools=every_tool)
        assert {998, 999}.isdisjoint(r["duration_ms"] for r in rows)
        assert len(rows) == 8

    def test_filter_runs_before_the_limit(self, db):
        _seed_requests(db)
        rows = db.query_requests_analytics(since=SINCE, until=UNTIL, limit=2, tools=["claude-code"])
        assert sorted(r["duration_ms"] for r in rows) == [300, 400]

    def test_unattributed_count_follows_the_session_lookup(self, db):
        _seed_requests(db)
        assert db.count_requests_unattributed(since=SINCE, until=UNTIL) == 2
        assert db.count_requests_unattributed(since=BASE + 25, until=UNTIL) == 2
        assert db.count_requests_unattributed(since=SINCE, until=BASE + 25) == 0

    def test_hostile_id_is_a_value_not_sql(self, db):
        _seed_requests(db)
        evil = "x') OR 1=1 --"
        assert db.query_requests_analytics(since=SINCE, until=UNTIL, tools=[evil]) == []


class TestResponseTimeSection:
    def test_percentiles_and_groups_come_from_the_selected_rows(self, db):
        _seed_requests(db)
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
        _seed_requests(db)
        assert _compute_response_time(db, SINCE, UNTIL, tools=("codex-cli",))["unattributed_hidden"] == 2
        assert _compute_response_time(db, SINCE, UNTIL, tools=())["unattributed_hidden"] == 2
        assert _compute_response_time(db, SINCE, UNTIL)["unattributed_hidden"] == 0

    def test_empty_selection_has_no_rows(self, db):
        _seed_requests(db)
        out = _compute_response_time(db, SINCE, UNTIL, tools=())
        assert out["requests"] == [] and out["by_model"] == []


# ── Tool usage ────────────────────────────────────────────────────


class TestToolEventQueries:
    def test_without_tools_counts_every_pair(self, db):
        _seed_tool_events(db)
        agg = {r["tool_name"]: r for r in db.query_tool_analytics_from_events(since=SINCE, until=UNTIL)}
        assert agg["Read"]["count"] == 5
        assert agg["Shell"]["count"] == 1

    def test_selected_tool_only_and_session_recovery(self, db):
        _seed_tool_events(db)
        agg = {
            r["tool_name"]: r
            for r in db.query_tool_analytics_from_events(since=SINCE, until=UNTIL, tools=["claude-code"])
        }
        assert set(agg) == {"Read"}
        assert agg["Read"]["count"] == 3  # two own rows, one recovered through its session
        codex = {
            r["tool_name"]: r
            for r in db.query_tool_analytics_from_events(since=SINCE, until=UNTIL, tools=["codex-cli"])
        }
        assert codex["Read"]["count"] == 1 and codex["Shell"]["count"] == 1

    def test_empty_selection(self, db):
        _seed_tool_events(db)
        assert db.query_tool_analytics_from_events(since=SINCE, until=UNTIL, tools=[]) == []
        assert db.query_tool_breakdown_from_events(since=SINCE, until=UNTIL, tools=[]) == {}
        assert db.query_tool_durations_from_events("Read", since=SINCE, until=UNTIL, tools=[]) == []

    def test_breakdown_is_limited_to_the_selection(self, db):
        _seed_tool_events(db)
        everything = db.query_tool_breakdown_from_events(since=SINCE, until=UNTIL)
        assert {s["cli_tool"] for s in everything["Read"]} == {"claude-code", "codex-cli", "", "unknown"}
        only = db.query_tool_breakdown_from_events(since=SINCE, until=UNTIL, tools=["codex-cli"])
        assert {s["cli_tool"] for segs in only.values() for s in segs} == {"codex-cli"}

    def test_durations_are_the_selected_tools_only(self, db):
        _seed_tool_events(db)
        assert sorted(db.query_tool_durations_from_events("Read", since=SINCE, until=UNTIL)) == [
            100.0,
            200.0,
            300.0,
            500.0,
            5000.0,
        ]
        assert db.query_tool_durations_from_events("Read", since=SINCE, until=UNTIL, tools=["codex-cli"]) == [5000.0]

    def test_unattributed_pairs_are_counted(self, db):
        _seed_tool_events(db)
        assert db.count_tool_events_unattributed(since=SINCE, until=UNTIL) == 1


def _invocation(db, i, tool, session, name, ms):
    db.append_tool_invocation(
        ToolInvocationRow(
            ts=BASE + i, source_ts=BASE + i, tool=tool, session_id=session, tool_name=name, duration_ms=ms
        )
    )


class TestToolInvocationQueries:
    @pytest.fixture()
    def seeded(self, db):
        _seed_sessions(db)
        _invocation(db, 1, "claude-code", "s-claude", "Read", 10)
        _invocation(db, 2, "claude-code", "s-claude", "Read", 30)
        _invocation(db, 3, "codex-cli", "s-codex", "Read", 9000)
        _invocation(db, 4, "", "s-codex", "Read", 700)  # recovered as codex-cli
        _invocation(db, 5, "unknown", "", "Read", 1)
        return db

    def test_aggregate_without_and_with_tools(self, seeded):
        assert seeded.query_tool_invocations_agg(since=SINCE, until=UNTIL)[0]["count"] == 5
        (codex,) = seeded.query_tool_invocations_agg(since=SINCE, until=UNTIL, tools=["codex-cli"])
        assert codex["count"] == 2 and codex["total_ms"] == 9700
        assert seeded.query_tool_invocations_agg(since=SINCE, until=UNTIL, tools=[]) == []

    def test_durations_without_and_with_tools(self, seeded):
        assert len(seeded.query_tool_invocations_durations("Read", since=SINCE, until=UNTIL)) == 5
        assert sorted(
            seeded.query_tool_invocations_durations("Read", since=SINCE, until=UNTIL, tools=["claude-code"])
        ) == [10, 30]
        assert seeded.query_tool_invocations_durations("Read", since=SINCE, until=UNTIL, tools=[]) == []

    def test_unattributed_count(self, seeded):
        assert seeded.count_tool_invocations_unattributed(since=SINCE, until=UNTIL) == 1


class TestToolsSection:
    def test_event_path_percentiles_come_from_the_selection(self, db):
        _seed_tool_events(db)
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

    def test_invocation_fallback_path(self, db):
        _seed_sessions(db)
        _invocation(db, 1, "claude-code", "s-claude", "Edit", 20)
        _invocation(db, 2, "codex-cli", "s-codex", "Edit", 900)
        _invocation(db, 3, "unknown", "", "Edit", 1)
        out = _compute_tools(db, SINCE, UNTIL, tools=("claude-code",))
        (edit,) = out["invocations"]
        assert edit["count"] == 1 and edit["p95_ms"] == 20
        assert out["unattributed_hidden"] == 1

    def test_all_time_total_follows_the_selection(self, db):
        _seed_tool_events(db)
        out = _compute_tools(db, UNTIL + 1000, UNTIL + 2000, tools=("codex-cli",))
        assert out["invocations"] == [] and out["total_all_time"] == 2

    def test_empty_selection(self, db):
        _seed_tool_events(db)
        out = _compute_tools(db, SINCE, UNTIL, tools=())
        assert out["invocations"] == []
        assert out["unattributed_hidden"] == 1


# ── Files ─────────────────────────────────────────────────────────


class TestFilesSection:
    def _seed(self, db):
        for path, tool in (
            ("/m/claude.md", "claude-code"),
            ("/m/codex.md", "codex-cli"),
            ("/m/vscode.md", "copilot"),
            ("/m/orphan.md", ""),
        ):
            db.upsert_file(path, tool=tool, category="memory", content=f"# {path}", mtime=time.time())

    def test_structured_path_by_owner(self, db):
        self._seed(db)
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

    def test_event_fallback_by_tool_and_session(self, db):
        _seed_sessions(db)
        for i, (tool, sid) in enumerate(
            [
                ("claude-code", "s-claude"),
                ("claude-code", "s-claude"),
                ("codex-cli", "s-codex"),
                ("", "s-claude"),
                ("unknown", ""),
            ]
        ):
            db.append_event(
                EventRow(
                    ts=BASE + i,
                    tool=tool,
                    kind="file_modified",
                    session_id=sid,
                    detail={"path": f"/p/{tool or 'blank'}-{i}.jsonl", "growth_bytes": 100},
                )
            )
        assert len(_compute_files(db, SINCE, UNTIL)["memory_events"]) == 5
        claude = _compute_files(db, SINCE, UNTIL, tools=("claude-code",))
        assert len(claude["memory_events"]) == 3  # two own, one recovered through its session
        assert claude["unattributed_hidden"] == 1
        assert _compute_files(db, SINCE, UNTIL, tools=())["memory_events"] == []


# ── The worker's cache ────────────────────────────────────────────


@pytest.fixture()
def cache(db):
    _seed_requests(db)
    _seed_tool_events(db)
    c = _AnalyticsCache()
    store = MagicMock()
    store._db = db
    c._store = store
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


# ── HTTP ──────────────────────────────────────────────────────────


@pytest.fixture()
def server(tmp_path):
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

    file_db = HistoryDB(db_path=str(tmp_path / "t.db"), flush_interval=0)
    _seed_requests(file_db)
    _seed_tool_events(file_db)

    def resource(path, tokens, tool):
        return ResourceFile(
            path=path,
            kind="instructions",
            tokens=tokens,
            tool=tool,
            scope="global",
            sent_to_llm="yes",
            loaded_when="every-call",
        )

    snap = DashboardSnapshot(
        timestamp=time.time(),
        root="/work",
        tools=[
            DashboardTool("claude-code", "Claude Code", files=[resource("/h/c.md", 100, "claude-code")]),
            DashboardTool("codex-cli", "Codex CLI", files=[resource("/h/x.md", 7000, "codex-cli")]),
            DashboardTool("copilot", "Copilot", files=[resource("/h/v.md", 30, "copilot")]),
            DashboardTool("copilot-cli", "Copilot CLI", files=[resource("/h/l.md", 5, "copilot-cli")]),
            DashboardTool("aictl", "aictl", files=[resource("/h/a.md", 900, "aictl")]),
        ],
    )
    store = SnapshotStore(db=file_db)
    store.update(snap)
    srv = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), Path("/work"))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.analytics_cache.stop()
    srv.shutdown()
    file_db.close()


def _json(url):
    with urllib.request.urlopen(url, timeout=5) as resp:
        return json.loads(resp.read())


def _analytics(base, query):
    url = f"{base}/api/analytics?since={SINCE}&until={UNTIL}{query}"
    deadline = time.time() + 10
    while time.time() < deadline:
        body = _json(url)
        if not body["pending"]:
            return body
        time.sleep(0.05)
    raise AssertionError("analytics stayed pending")


class TestAnalyticsEndpoint:
    def test_no_parameter_is_all_tools(self, server):
        body = _analytics(server, "")
        assert body["selection"] == {"all_tools": True, "tools": None}
        assert len(body["response_time"]["requests"]) == 10

    def test_tools_parameter_filters_and_is_stated(self, server):
        body = _analytics(server, "&tools=codex-cli")
        assert body["selection"] == {"all_tools": False, "tools": ["codex-cli"]}
        assert [r["duration_ms"] for r in body["response_time"]["requests"]] == [10_000, 20_000]

    def test_empty_tools_parameter_is_none(self, server):
        body = _analytics(server, "&tools=")
        assert body["selection"] == {"all_tools": False, "tools": []}
        assert body["response_time"]["requests"] == []

    def test_first_answer_for_a_new_selection_is_pending_with_no_figures(self, server):
        first = _json(f"{server}/api/analytics?since={SINCE}&until={UNTIL}&tools=claude-code,codex-cli")
        if first["pending"]:
            assert "response_time" not in first
            assert first["selection"]["tools"] == ["claude-code", "codex-cli"]

    def test_switching_selection_back_and_forth_never_mixes(self, server):
        a = _analytics(server, "&tools=claude-code")
        b = _analytics(server, "&tools=codex-cli")
        again = _analytics(server, "&tools=claude-code")
        assert len(a["response_time"]["requests"]) == len(again["response_time"]["requests"]) == 4
        assert len(b["response_time"]["requests"]) == 2


class TestBudgetEndpoint:
    def test_all_tools_by_default(self, server):
        body = _json(f"{server}/api/budget")
        assert body["selection"] == {"all_tools": True, "tools": None}
        assert body["always_loaded_tokens"] == 100 + 7000 + 30 + 5 + 900

    def test_selected_tools_only(self, server):
        body = _json(f"{server}/api/budget?tools=claude-code")
        assert body["selection"] == {"all_tools": False, "tools": ["claude-code"]}
        assert body["always_loaded_tokens"] == 100

    def test_copilot_vscode_includes_the_copilot_card_but_not_copilot_cli(self, server):
        assert _json(f"{server}/api/budget?tools=copilot-vscode")["always_loaded_tokens"] == 30
        assert _json(f"{server}/api/budget?tools=copilot-cli")["always_loaded_tokens"] == 5

    def test_empty_selection_is_zero(self, server):
        body = _json(f"{server}/api/budget?tools=")
        assert body["selection"] == {"all_tools": False, "tools": []}
        assert body["always_loaded_tokens"] == 0 and body["total_potential_tokens"] == 0

    def test_the_cache_is_per_selection(self, server):
        one = _json(f"{server}/api/budget?tools=claude-code")["always_loaded_tokens"]
        two = _json(f"{server}/api/budget?tools=codex-cli")["always_loaded_tokens"]
        again = _json(f"{server}/api/budget?tools=claude-code")["always_loaded_tokens"]
        assert (one, two, again) == (100, 7000, 100)


class TestBudgetTools:
    def test_selection_helpers(self):
        tools = [ToolResources("claude-code", "C"), ToolResources("aictl", "a"), ToolResources("project-env", "p")]
        assert budget_tools(tools, None) is tools
        assert budget_tools(tools, ()) == []
        assert [t.tool for t in budget_tools(tools, ("claude-code",))] == ["claude-code", "project-env"]
        assert compute_token_budget(budget_tools(tools, ()))["total_potential_tokens"] == 0
