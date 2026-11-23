"""MCP servers and convergence on the board: views, grouping, signals and the query a panel ran."""

from __future__ import annotations

import re
from types import SimpleNamespace

import pytest

from aictl.dashboard import convergence, mcp_view
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.panel_kql import filled_query, kusto_base_url
from aictl.dashboard.projection_utils import known_mcp_servers, mcp_server_of
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.base import ReadResult
from aictl.stores.kusto.reader import _VIEWS, KustoReader, _query

NEW_VIEWS = ("tools.mcp", "tools.mcp_detail", "sessions.convergence", "sessions.convergence_turns")


class Reader:
    """Answers each view from canned rows and records what was asked."""

    def __init__(self, rows: dict[str, list[dict]]):
        self.rows = rows
        self.calls: list[tuple[str, dict]] = []

    def read(self, view, params):
        self.calls.append((view, dict(params)))
        return ReadResult([dict(row) for row in self.rows.get(view, [])])


def test_server_name_is_derived_in_one_function_and_resolves_ambiguous_names():
    assert mcp_server_of("mcp__github__get_issue") == "github"
    assert mcp_server_of("mcp:kusto:query") == "kusto"
    assert mcp_server_of("kusto/query") == "kusto"
    assert mcp_server_of("Bash") is None
    # mcp_a_b cannot be split from the name alone.
    assert mcp_server_of("mcp_github_get_issue") == ""
    known = known_mcp_servers(["mcp__github__list", "mcp__azure-devops__x", "Bash", "mcp_github_get_issue"])
    assert known == {"github", "azure-devops"}
    assert mcp_server_of("mcp_github_get_issue", known) == "github"
    assert mcp_server_of("mcp_azure_devops_get_item", known) == "azure-devops"
    # The longest known name wins when one is a prefix of another.
    assert mcp_server_of("mcp_github_enterprise_get", {"github", "github_enterprise"}) == "github_enterprise"
    assert mcp_server_of("mcp_other_tool", known) == ""


def _tool(name, calls, *, failures=0, sessions=1, session_set=(), hist=None, total_ms=0.0, output_bytes=0, output_count=0):
    return {"row_type": "tool", "tool_name": name, "calls": calls, "failures": failures, "sessions": sessions,
            "session_set": list(session_set), "timed": sum((hist or {}).values()), "total_ms": total_ms,
            "output_bytes": output_bytes, "output_count": output_count, "first_ts": 10.0, "last_ts": 20.0,
            "hist": hist or {}}


def test_tools_group_by_server_with_an_unknown_group_and_merged_figures():
    rows = [
        _tool("mcp__github__get_issue", 6, failures=1, sessions=2, session_set=(1, 2), hist={"40": 3, "60": 3},
              total_ms=3000.0, output_bytes=4000, output_count=6),
        _tool("mcp_github_search", 4, sessions=2, session_set=(2, 3), hist={"20": 4}, total_ms=40.0),
        _tool("mcp_mystery_call", 2, failures=2, session_set=(9,), hist={"0": 2}, total_ms=2.0),
        _tool("Bash", 10, sessions=4, hist={"60": 10}, total_ms=6958.0),
        {"row_type": "totals", "calls": 22, "failures": 3, "sessions": 5, "builtin_sessions": 4, "total_ms": 10000.0,
         "tool_names": 4},
    ]
    body = mcp_view.group_rows(rows)
    groups = {g["id"]: g for g in body["groups"]}
    assert [g["id"] for g in body["groups"]] == ["mcp:github", "unknown", "builtin"]
    github = groups["mcp:github"]
    assert (github["calls"], github["failures"], github["sessions"], github["tool_count"]) == (10, 1, 3, 2)
    assert github["fail_rate"] == 0.1 and github["time_share"] == pytest.approx(0.304)
    # 10 timed calls: 4 near 10 ms, 3 near 100 ms, 3 near 1 s.
    assert (github["p50_ms"], github["p95_ms"]) == (100.0, 1000.0)
    assert (github["output_bytes"], github["est_tokens"]) == (4000, 1000)
    assert [t["name"] for t in github["tools"]] == ["mcp__github__get_issue", "mcp_github_search"]
    assert groups["unknown"]["label"] == "Unknown MCP server" and groups["unknown"]["fail_rate"] == 1.0
    assert groups["builtin"]["sessions"] == 4 and groups["builtin"]["output_bytes"] is None
    assert body["totals"]["tool_names"] == body["totals"]["tool_names_shown"] == 4
    assert "bytes divided by 4" in body["definitions"]["est_tokens"]


def test_session_counts_say_at_least_when_a_set_was_cut():
    body = mcp_view.group_rows([_tool("mcp__a__x", 9, sessions=7000, session_set=range(5000)), {"row_type": "totals"}])
    assert body["groups"][0]["sessions"] == 5000 and body["groups"][0]["sessions_at_least"]


def _history(rows):
    reader = Reader(rows)
    return reader, HistoryScope(reader, None)


def test_mcp_panel_reads_one_view_and_passes_a_tool_selection_directly():
    reader, history = _history({"tools.mcp": [_tool("mcp__a__x", 1), {"row_type": "totals", "calls": 1}]})
    status, body = mcp_view.mcp_board(Filters(since=100.0, until=200.0, tools=("claude-code",)), 300.0, history=history)
    assert status == 200 and [g["id"] for g in body["groups"]] == ["mcp:a"]
    assert [view for view, _ in reader.calls] == ["tools.mcp"]
    params = reader.calls[0][1]
    assert params["since"] == 100.0 and params["until"] == 200.0 and params["restrict_tools"] is True
    assert "claude-code" in params["requested_tools"] and "restrict_sessions" not in params
    assert "let since = real(100.0);" in body["query"]["kql"] and "let restrict_tools = true;" in body["query"]["kql"]


def test_mcp_server_drawer_reads_the_group_tools_series_errors_and_sessions(monkeypatch):
    monkeypatch.setattr(mcp_view, "_titles", lambda history, sids, now: {sid: f"title {sid}" for sid in sids})
    reader, history = _history({
        "tools.mcp": [_tool("mcp__a__x", 3, failures=2, sessions=1), _tool("mcp__a__y", 1), _tool("Read", 5),
                      {"row_type": "totals", "calls": 9}],
        "tools.mcp_detail": [
            {"row_type": "bucket", "g": 0, "calls": 3, "failures": 2, "total_ms": 30.0},
            {"row_type": "bucket", "g": 3, "calls": 1, "failures": 0, "total_ms": None},
            {"row_type": "session", "session_id": "s1", "node_id": "n", "calls": 4, "failures": 2, "total_ms": 30.0,
             "output_bytes": 10, "first_ts": 1.0, "last_ts": 2.0, "tool_list": ["mcp__a__y", "mcp__a__x"]},
            {"row_type": "failure", "tool_name": "mcp__a__x", "ts": 5.0, "result_summary": "timeout after 30 s",
             "session_id": "s1"},
            {"row_type": "failure", "tool_name": "mcp__a__x", "ts": 6.0, "result_summary": "timeout after 31 s",
             "session_id": "s1"},
        ],
    })
    status, body = mcp_view.mcp_server_detail("mcp:a", Filters(since=0.0, until=400.0, buckets=4), 500.0, history=history)
    assert status == 200 and body["label"] == "a"
    detail_params = reader.calls[1][1]
    assert reader.calls[1][0] == "tools.mcp_detail" and detail_params["requested_tool_names"] == ["mcp__a__x", "mcp__a__y"]
    assert detail_params["grid"] == 4 and [c["calls"] for c in body["series"]] == [3, 0, 0, 1]
    # Numbers are removed from error text, so both timeouts group under one key.
    assert len(body["errors"]) == 1 and body["errors"][0]["count"] == 2 and body["errors"][0]["key"].startswith("tool:mcp__a__x:")
    assert body["sessions"][0]["title"] == "title s1" and body["sessions"][0]["tools"] == ["mcp__a__x", "mcp__a__y"]


def test_every_new_view_is_registered_and_declares_what_the_reader_binds():
    for view in NEW_VIEWS:
        params, _fields = _VIEWS[view]
        text = _query(view)
        declared = set(re.findall(r"(\w+)\s*:\s*(?:bool|real|long|string|dynamic)", text.split(");", 1)[0]))
        assert set(params.split()) | {"row_limit"} == declared, view
        # Keys are selected inside the window before rows are deduplicated.
        assert "distinct ['project'], node_id, fact_key" in text and "summarize arg_max(_v, *)" in text


def test_filled_query_writes_every_parameter_and_rejects_unsafe_text():
    kql = filled_query("sessions.convergence_turns", {"since": 1.0, "until": 2.5, "requested_session": 'a"b', "limit": 10})
    assert not kql.startswith("declare") and 'let requested_session = "a\\"b";' in kql
    assert "let all_nodes = true;" in kql and "let row_limit = long(11);" in kql
    with pytest.raises(ValueError):
        filled_query("sessions.convergence_turns", {"since": 1.0, "until": 2.0, "requested_session": "a\nb"})
    with pytest.raises(ValueError, match="no value"):
        filled_query("sessions.convergence_turns", {"since": 1.0, "until": 2.0})
    assert kusto_base_url(SimpleNamespace(cluster="https://c.kusto.windows.net", database="my db")) == \
        "https://c.kusto.windows.net/my%20db"
    assert kusto_base_url(SimpleNamespace(cluster="http://local", database="db")) is None


def test_new_views_run_through_the_kusto_reader_with_bound_parameters():
    seen = {}

    class Table(list):
        columns = [SimpleNamespace(column_name="row_type", column_type="string")]

    def execute(_db, text, props):
        seen[props.client_request_id.split(";")[0]] = (text, props.get_parameter("requested_tool_names", None))
        return SimpleNamespace(primary_results=[Table([("totals",)])])

    reader = KustoReader(SimpleNamespace(execute_query=execute), "db")
    reader.read("tools.mcp_detail", {"since": 1.0, "until": 2.0, "grid": 4, "requested_tool_names": ["mcp__a__x"], "limit": 5})
    assert seen["aictl.tools.mcp_detail"] == (_query("tools.mcp_detail"), 'dynamic(["mcp__a__x"])')
    for view in NEW_VIEWS:
        reader.read(view, {"since": 1.0, "until": 2.0, "limit": 5, **({"requested_session": "s"} if "turns" in view else {}),
                           **({"grid": 2, "requested_tool_names": []} if "detail" in view else {})})


def _row(**values):
    base = {"session_id": "s", "requests": 10, "tokens": 1000, "accepted": 1, "commits": 0}
    return base | values


@pytest.mark.parametrize(("values", "signal", "evidence"), [
    ({"top_rep": 13, "top_rep_calls": 14, "top_rep_first": 22, "top_rep_last": 31, "top_rep_label": "Bash npm test"},
     "repeated_calls", "14 identical Bash npm test calls in requests 22-31"),
    ({"retries": 4, "failed_retries": 3}, "retries", "4 retries after a failure, 3 failed again"),
    ({"top_file_edits": 12, "top_file": "src/a.py"}, "file_churn", "src/a.py edited 12 times"),
    ({"requests": 50, "tail_dry": 18, "longest_dry": 18}, "tail_dry", "no file change in the last 18 requests"),
    ({"requests": 50, "longest_dry": 25, "dry_start": 5, "dry_end": 29, "tail_dry": 2}, "dry_stretch",
     "no file change in requests 5-29 (25 requests)"),
    ({"requests": 40, "tokens": 100, "tokens_late": 60, "files_new": 10, "files_new_late": 1}, "falling_yield",
     "second half: 60% of tokens, 10% of new files (1 of 10)"),
    ({"requests": 40, "out_early": 900, "out_late": 300}, "falling_output", "output per request fell from 900 to 300 tokens"),
    ({"compactions": 3}, "compactions", "context compacted 3 times"),
    ({"tokens": 12_000_000, "accepted": 2}, "tokens_per_change", "6.0M tokens per accepted change (2 changes)"),
    ({"accepted": 0, "edits": 4}, "tokens_per_change", "4 edit attempts, none accepted"),
])
def test_each_signal_states_the_values_that_triggered_it(values, signal, evidence):
    found = {s["id"]: s for s in convergence.signals(_row(**values))}
    assert found[signal]["evidence"] == evidence
    assert convergence.SIGNAL_BY_ID[signal].definition in convergence.DEFINITIONS.values()


def test_quiet_sessions_and_research_sessions_raise_no_signal():
    assert convergence.signals(_row(top_rep=4, retries=2, top_file_edits=7, compactions=1)) == []
    # A session that never changed a file is not "dry": it may be a question, not a task.
    assert convergence.signals(_row(accepted=0, requests=80, longest_dry=80, tail_dry=80)) == []
    assert convergence.verdict([]).startswith("No sign")


def test_ranking_orders_by_score_then_tokens_and_drops_unflagged():
    rows = [_row(session_id="calm"), _row(session_id="a", compactions=2, tokens=5),
            _row(session_id="b", compactions=2, tokens=9), _row(session_id="c", retries=5, top_file_edits=9)]
    ranked = convergence.rank(rows)
    assert [r["session_id"] for r in ranked] == ["c", "b", "a"] and ranked[0]["score"] == 4
    assert ranked[0]["verdict"].startswith("Possibly not converging (heuristic): ")


def test_convergence_panel_reads_one_view_plus_titles(monkeypatch):
    monkeypatch.setattr(convergence, "_titles", lambda history, sids, now: {})
    reader, history = _history({"sessions.convergence": [_row(session_id="x", compactions=4)]})
    status, body = convergence.convergence_board(Filters(since=0.0, until=10.0), 20.0, history=history)
    assert status == 200 and body["flagged"] == body["checked"] == 1 and not body["checked_capped"]
    assert [view for view, _ in reader.calls] == ["sessions.convergence"]
    assert body["rows"][0]["signals"][0]["values"] == {"compactions": 4}
    assert body["query"]["view"] == "sessions.convergence"


def test_clusters_split_where_a_call_was_not_repeated_within_the_window():
    assert convergence.clusters([22, 23, 25, 31, 80, 81, 200]) == [(4, 22, 31), (2, 80, 81)]
    assert convergence.clusters([]) == []


def _turn(rn, **values):
    return {"row_type": "turn", "rn": rn, "ts": float(rn), "tokens": 100, "output_tokens": 10, "calls": 1, "errors": 0,
            "repeats": 0, "retries": 0, "edits": 0, "accepted": 0, "commits": 0, "new_files": 0} | values


def test_session_drawer_marks_runs_and_states_its_evidence():
    turns = [_turn(rn, accepted=1, edits=1, new_files=1) if rn in (1, 2) else _turn(rn) for rn in range(1, 31)]
    for rn in range(22, 28):
        turns[rn - 1] |= {"retries": 1, "errors": 1}
    rows = turns + [
        {"row_type": "repeat", "sig": 1, "n": 14, "reps": 13, "failed": 6, "first_rn": 1, "last_rn": 31,
         "tool_name": "Bash", "label": "Bash npm test", "rns": [1, *range(22, 32), 29, 30, 31]},
        {"row_type": "file", "file": "a.py", "n": 2, "failed": 0, "first_rn": 1, "last_rn": 2},
        {"row_type": "compaction", "ts": 10.5}, {"row_type": "compaction", "ts": 20.0},
    ]
    reader, history = _history({"sessions.convergence_turns": rows})
    status, body = convergence.session_convergence("sess", 100.0, history=history)
    assert status == 200 and body["requests"] == 30 and reader.calls[0][1]["requested_session"] == "sess"
    assert body["compactions"] == [11, 20]
    assert body["clusters"][0] == {"label": "Bash npm test", "tool": "Bash", "calls": 13, "first": 22, "last": 31,
                                         "failed": 6}
    assert body["retry_runs"] == [{"first": 22, "last": 27, "retries": 6}]
    assert body["summary"]["tail_dry"] == 28
    ids = [s["id"] for s in body["signals"]]
    assert ids[:2] == ["repeated_calls", "retries"] and "tail_dry" in ids and "compactions" in ids
    assert "13 identical Bash npm test calls in requests 22-31" in body["verdict"]
    assert any(s["evidence"] == "no file change in the last 28 requests" for s in body["signals"])
    assert sum(cell["calls"] for cell in body["strip"]) == 30


def test_strip_folds_long_sessions_into_bins():
    cells = convergence.strip([_turn(rn) for rn in range(1, 1001)], bins=100)
    assert len(cells) == 100 and cells[0]["first"] == 1 and cells[0]["last"] == 10 and cells[-1]["last"] == 1000
    assert all(cell["calls"] == 10 for cell in cells)


def test_board_routes_serve_the_new_panels_with_the_board_filters(monkeypatch):
    import json

    from aictl.dashboard import board_routes

    reader, history = _history({"tools.mcp": [{"row_type": "totals", "calls": 0}], "sessions.convergence": [],
                                "sessions.convergence_turns": []})
    monkeypatch.setattr(HistoryScope, "local", classmethod(lambda cls, store: history))
    status, body = board_routes.handle_get("/api/board/mcp", "since=10&until=20&tool=-", None, None, now=30.0)
    assert status == 200 and json.loads(body)["groups"] == []
    assert reader.calls[-1][1]["restrict_tools"] is True and reader.calls[-1][1]["since"] == 10.0
    assert board_routes.handle_get("/api/board/convergence", "since=10&until=20", None, None, now=30.0)[0] == 200
    assert board_routes.handle_get("/api/board/mcp/server", "since=10&until=20", None, None, now=30.0)[0] == 400
    status, body = board_routes.handle_get("/api/board/session/convergence", "session_id=s", None, None, now=30.0)
    assert status == 200 and json.loads(body)["verdict"].startswith("No sign")
    assert board_routes.handle_get("/api/board/mcp", "since=20&until=10", None, None, now=30.0)[0] == 400
