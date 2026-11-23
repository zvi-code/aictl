"""The session finder: filters and order applied in sessions.search, one query per page, the
status of each row from aictl.session_lifecycle, the import state from session_sources, and
no row dropped. The query logic runs against synthetic view rows; the KQL text itself is
checked against its declared parameters and the reader's parameter list."""

from __future__ import annotations

import json
import re
from types import SimpleNamespace

import pytest
from test_contract import validate_detail

from aictl import session_lifecycle
from aictl.dashboard import board_routes, session_record
from aictl.dashboard.session_record import (
    NO_RECORDS_REASON,
    NOT_IMPORTED_REASON,
    SessionQuery,
    finder_query,
    live_pids,
    search_sessions,
)
from aictl.stores.kusto import reader as kusto_reader

NOW = 1_800_000_000.0
SID = "aaaaaaaa-1111-4111-8111-111111111111"


class FakeHistory:
    """A history scope whose views answer with fixed rows, and that counts its queries."""

    qualified = False
    node = "n1"

    def __init__(self, rows, artifacts=()):
        self.rows = rows
        self.artifacts = list(artifacts)
        self.reads: list[tuple[str, dict]] = []

    def read(self, view, **params):
        self.reads.append((view, params))
        if view == "sessions.search":
            return self.rows
        if view == "files.artifacts":
            return self.artifacts
        raise AssertionError(f"unexpected view {view}")

    def require_reader(self):
        return self

    def keys(self, values):
        return sorted(f"2:n1{v}" for v in values)

    def split(self, value):
        return self.node, value


def member(sid=SID, **extra):
    return {
        "session_id": sid, "tool": "claude-code", "project": "/work/proj", "model": "claude-opus", "started_at": NOW - 600,
        "ended_at": None, "end_reason": "", "title": "", "title_ts": None, "name": "", "name_source": "", "rank": None,
        "match_text": None, "has_facts": True, "commits": 0, "stored_cost": 0.25, "list_tokens": {}, "last_ts": NOW - 60,
        **extra,
    }


def stored(logical=SID, members=None, **data):
    values = {
        "imported": True, "status": "running", "seen": NOW - 60, "last_active": NOW - 60, "started": NOW - 600,
        "ended_at": None, "end_reason": "", "live": False, "facts": 1, "tokens": 1200, "cost": 0.25, "tool_calls": 7,
        "errors": 1, "prompts": 2, "duration": 540.0, "import_state": "complete", "files": 1, "waiting": 0, "reading": 0,
        "outside": 0, "complete": 1, "size_bytes": 4096, "bytes_read": 4096, "src_mtime": NOW - 60,
        "source_file": f"/home/u/.claude/projects/p/{logical}.jsonl", "src_tool": "claude-code", "src_session": logical,
        "rank": None, "name": None, "name_source": None, "project": None,
        "members": members if members is not None else [member(logical)],
    }
    values.update(data)
    return {"row_type": "item", "total": None, "node_id": "n1", "session_id": logical, "data": values}


def unread(sid="bbbbbbbb-2222-4222-8222-222222222222", **data):
    values = {
        "imported": False, "status": "not_imported", "import_state": "waiting", "last_active": NOW - 86400,
        "files": 1, "waiting": 1, "reading": 0, "outside": 0, "complete": 0, "size_bytes": 3 * 1024 * 1024,
        "bytes_read": 0, "src_mtime": NOW - 86400, "source_file": f"/home/u/.codex/sessions/rollout-{sid}.jsonl",
        "src_tool": "codex-cli", "src_session": sid, "rank": None, "name": None, "name_source": None, "project": None,
        "members": [],
    }
    values.update(data)
    return {"row_type": "item", "total": None, "node_id": "n1", "session_id": sid, "data": values}


def counts(total, **facets):
    values = {name: 0 for name in session_record.FACETS} | {f"without_{w}": 0 for w in session_record.WITHOUT}
    values.update(unfiltered=total, sessions=total, **facets)
    return [
        {"row_type": "count", "total": total, "node_id": "n1", "session_id": None, "data": None},
        {"row_type": "facets", "total": total, "node_id": "n1", "session_id": None, "data": values},
    ]


def search(rows, query=None, live=None, artifacts=(), activity=None):
    history = FakeHistory(rows, artifacts)
    kwargs = {"activity": activity} if activity is not None else {}
    return search_sessions(None, history=history, query=query or SessionQuery(), live=live or {}, now=NOW,
                           **kwargs), history


# ─── One status for one session, in every panel ──────────────────


def test_the_finder_and_the_board_give_one_status_for_the_same_evidence():
    """A process alive for a session whose last line is weeks old is idle in both, by its last activity."""
    from test_session_lifecycle import _board, _cell

    old = NOW - 26 * 86400
    out, _ = search([*counts(1), stored(seen=old, last_active=old)], live={SID: {42}})
    board = _board(NOW, cells=[_cell(SID, old)], live_by_sid={SID: {"pids": {42}, "matched_by": "evidence"}})
    board._assign_status()
    row = out["rows"][0]
    assert row["status"] == board.status[SID] == "idle"
    assert row["status_evidence"] == board.lifecycle[SID].evidence
    assert row["status_evidence"].startswith("process 42 running; last activity ")
    assert row["status_basis"] == "live process"


def test_the_session_file_report_decides_the_activity_of_a_live_process():
    out, _ = search([*counts(1), stored(seen=NOW - 30, last_active=NOW - 30)], live={SID: {42}}, activity={SID: "idle"})
    row = out["rows"][0]
    assert (row["status"], row["status_evidence"]) == ("idle", "process 42 running; session file reports idle")
    snapshot = SimpleNamespace(sessions=[
        {"native_session_id": SID, "session_id": "m1", "pids": [42], "native_state": "idle"},
        {"session_id": "m2", "pids": [7], "native_state": "unknown"},
    ])
    assert session_record.live_activity(snapshot) == {SID: "idle", "m1": "idle"}


# ─── Status ───────────────────────────────────────────────────────


def test_each_row_has_the_status_and_evidence_of_the_lifecycle_rules():
    a, b, c, d = (f"{n}aaaaaaa-1111-4111-8111-111111111111" for n in "abcd")
    out, _ = search([
        *counts(4),
        stored(a, seen=NOW - 4000, last_active=NOW - 4000),
        stored(b, members=[member(b, ended_at=NOW - 100, end_reason="hook")], seen=NOW - 100, ended_at=NOW - 100,
               end_reason="hook", status="ended"),
        stored(c, seen=NOW - 5000, last_active=NOW - 5000, status="inferred"),
        stored(d, seen=NOW - 60),
    ], live={a: {42}})
    got = {r["id"]: (r["status"], r["status_evidence"], r["end_reason"]) for r in out["rows"]}
    # Alive for 67 min with no line: idle by its last activity, as the board says (one rule).
    assert got[a][0] == "idle" and got[a][1].startswith("process 42 running; last activity ") and got[a][2] == ""
    assert got[b] == ("ended", "tool reported end", "hook")
    assert got[c] == ("inferred", "no activity for 15 min (inferred)", "idle")
    assert got[d][0] == "running" and got[d][1].startswith("no process seen; last activity")
    assert next(r for r in out["rows"] if r["id"] == a)["pids"] == [42]


def test_an_end_overtaken_by_later_activity_does_not_end_the_session():
    out, _ = search([*counts(1), stored(seen=NOW - 30, ended_at=NOW - 600, end_reason="hook")])
    assert out["rows"][0]["status"] == "running"


def test_the_query_gets_the_lifecycle_constants_so_its_filter_matches_the_rows():
    _, history = search(counts(0), SessionQuery(status="running"), live={SID: {7}})
    view, params = history.reads[0]
    assert view == "sessions.search"
    assert params["observed_ends"] == sorted(session_lifecycle.END_OBSERVED)
    assert params["idle_window"] == session_lifecycle.IDLE_END_S
    assert params["end_grace"] == session_lifecycle.END_GRACE_S
    assert params["now_ts"] == NOW and params["live_sessions"] == [SID] and params["requested_status"] == "running"


def test_only_processes_bound_by_evidence_count_as_live():
    snapshot = SimpleNamespace(sessions=[
        {"native_session_id": f"claude-code:1:{SID}", "session_id": "x", "pids": [5, 6]},
        {"native_session_id": "", "session_id": "gone", "pids": [9], "ended": True},
        {"session_id": "nopid", "pids": []},
    ])
    found = live_pids(snapshot)
    assert found[SID] == {5, 6} and found[f"claude-code:1:{SID}"] == {5, 6} and found["x"] == {5, 6}
    assert "gone" not in found and "nopid" not in found
    assert live_pids(None) == {}


# ─── Import state and sessions not imported yet ──────────────────


def test_a_session_file_not_read_yet_is_a_row_that_says_why_it_cannot_open():
    out, history = search([*counts(1, not_imported=1), unread()])
    row = out["rows"][0]
    assert (row["status"], row["openable"], row["closed_reason"]) == ("not_imported", False, NOT_IMPORTED_REASON)
    assert row["title"].startswith("Codex") and "rollout-" in row["title"]
    assert row["import_state"] == "waiting" and row["import"]["size_bytes"] == 3 * 1024 * 1024
    assert row["status_evidence"] == "session file found (3.0 MB), not read yet"
    assert row["tokens"] is None and row["artifacts"] is None and row["last_activity_at"] == NOW - 86400
    # Nothing on the page can be opened, so the artifacts are not read.
    assert [view for view, _ in history.reads] == ["sessions.search"]


def test_a_file_not_read_yet_shows_the_name_the_title_pass_stored():
    out, _ = search([*counts(1), unread(name="Fix the parser", name_source="user", project="/work/p")])
    row = out["rows"][0]
    assert (row["title"], row["title_source"], row["project"]) == ("Fix the parser", "user", "/work/p")


def test_a_search_hit_in_the_session_file_path_is_reported():
    out, _ = search([*counts(1), unread(rank=7)], SessionQuery(q="rollout"))
    assert out["rows"][0]["match"] == "source" and "rollout" in out["rows"][0]["match_text"]


@pytest.mark.parametrize(("data", "state", "words"), [
    ({}, "complete", "complete: 1 file, 4.0 KB"),
    ({"import_state": "reading", "reading": 1, "complete": 0, "bytes_read": 1024}, "reading",
     "still importing: 1.0 KB of 4.0 KB read"),
    ({"import_state": "partial", "files": 3, "outside": 2}, "partial", "partly outside the import window: 2 of 3 files not imported"),
    ({"files": None}, "none", "no session file indexed; recorded live only"),
])
def test_every_stored_row_says_whether_its_history_is_complete(data, state, words):
    out, _ = search([*counts(1), stored(**data)])
    row = out["rows"][0]
    assert (row["import_state"], row["import_evidence"]) == (state, words)
    assert (row["import"] is None) == (state == "none")


# ─── No silent drops, one query per page ──────────────────────────


def test_a_row_the_detail_cannot_open_is_listed_with_its_reason_and_counted():
    out, _ = search([*counts(2), stored(), stored("placeholder:1:2", members=[member("placeholder:1:2", has_facts=False)], facts=0)])
    assert out["total"] == 2 and len(out["rows"]) == 2
    closed = out["rows"][1]
    assert (closed["openable"], closed["closed_reason"]) == (False, NO_RECORDS_REASON)
    assert out["rows"][0]["openable"] is True and out["rows"][0]["closed_reason"] is None


def test_a_page_costs_the_search_and_one_artifact_count():
    rows = [*counts(2), stored(), unread()]
    artifacts = [{"row_type": "folder", "node_id": "n1", "session_id": SID, "values": [4, 100, 4]}]
    out, history = search(rows, artifacts=artifacts)
    assert [view for view, _ in history.reads] == ["sessions.search", "files.artifacts"]
    assert out["rows"][0]["artifacts"] == 4 and out["rows"][1]["artifacts"] is None


def test_numbers_facets_and_order_come_from_the_query():
    rows = [
        *counts(3, running=1, ended=1, inferred=0, importing=1, not_imported=1, without_status=3, without_model=5),
        stored(members=[member(commits=2), member(f"claude-code:9:{SID}", commits=1, rank=2, match_text="find the widget",
                                                  stored_cost=None)]),
        unread(),
    ]
    out, _ = search(rows, SessionQuery(q="widget", sort="tokens", ascending=True))
    assert [r["status"] for r in out["rows"]] == ["running", "not_imported"]
    first = out["rows"][0]
    assert (first["tokens"], first["cost_usd"], first["tool_calls"], first["errors"], first["prompts"], first["commits"]) == (
        1200, 0.25, 7, 1, 2, 3)
    assert (first["match"], first["match_text"]) == ("prompt", "find the widget")
    assert out["facets"] == {"sessions": 3, "running": 1, "ended": 1, "inferred": 0, "importing": 1, "not_imported": 1}
    assert out["without"]["status"] == 3 and out["without"]["model"] == 5
    assert out["query"]["sort"] == "tokens" and out["query"]["order"] == "asc"


def test_the_answer_matches_the_contract():
    out, _ = search([*counts(3), stored(), unread(), stored("c-1", members=[member("c-1", has_facts=False)], facts=0,
                                                           files=None)])
    validate_detail("/api/board/sessions", out)


def test_view_parameters_leave_out_defaults_and_page_with_room_for_the_count_rows():
    _, history = search(counts(0), SessionQuery(limit=50, offset=100))
    params = history.reads[0][1]
    assert params["limit"] == 52 and params["page_size"] == 50 and params["page_offset"] == 100
    assert params["restrict_tools"] is False and "min_tokens" not in params and "since" not in params
    _, history = search(counts(0), SessionQuery(tools=[], min_tokens=10, min_cost=0.5, since=1.0, until=2.0, errors=True))
    params = history.reads[0][1]
    assert params["restrict_tools"] is True and params["requested_tools"] == []
    assert (params["min_tokens"], params["min_cost"], params["since"], params["until"], params["errors_only"]) == (
        10, 0.5, 1.0, 2.0, True)


def test_calls_without_a_stored_cost_are_shown_at_list_price_and_the_query_gets_the_rates():
    from aictl.data.model_pricing import resolve_pricing

    rates = resolve_pricing("claude-sonnet-4-5")[1].at(NOW - 60, 0)
    priced = member(stored_cost=0.5, list_tokens={"claude-sonnet-4-5-20250929": [1_000_000, 0, 0, 0], "no-such-model": [9, 9, 9, 9]})
    out, history = search([*counts(1), stored(members=[priced])])
    assert out["rows"][0]["cost_usd"] == round(0.5 + rates.input_per_m, 6)
    unknown = search([*counts(1), stored(members=[member(stored_cost=None, list_tokens={"no-such-model": [9, 9, 9, 9]})])])[0]
    assert unknown["rows"][0]["cost_usd"] is None
    sent = history.reads[0][1]["model_prices"]
    assert sent["claude-sonnet-4-5"][:2] == [rates.input_per_m, rates.output_per_m] and all(len(v) == 4 for v in sent.values())


# ─── The request ──────────────────────────────────────────────────


def qs(**values):
    return {k: [v] for k, v in values.items()}


def test_the_request_maps_onto_the_query():
    found = finder_query(qs(q=" widget ", tool="claude-code", project="aictl", model="gpt-5", status="inferred",
                            name="user", errors="1", min_tokens="1000", min_cost="0.5", sort="cost", order="asc",
                            since="10", until="20", limit="50", offset="100"))
    assert found == SessionQuery(q="widget", tools=found.tools, since=10.0, until=20.0, project="aictl", model="gpt-5",
                                 status="inferred", name_source="user", errors=True, min_tokens=1000, min_cost=0.5,
                                 sort="cost", ascending=True, limit=50, offset=100)
    assert "claude-code" in found.tools
    assert finder_query({}) == SessionQuery()
    assert finder_query(qs(tool="")).tools == []


@pytest.mark.parametrize("bad", [
    {"status": "done"}, {"sort": "name"}, {"order": "up"}, {"name": "robot"}, {"errors": "yes"},
    {"min_tokens": "1.5"}, {"min_cost": "-1"}, {"since": "20", "until": "10"}, {"limit": "501"}, {"offset": "x"},
])
def test_a_bad_value_is_refused_with_its_reason(bad):
    with pytest.raises(ValueError):
        finder_query(qs(**bad))


def test_the_route_answers_400_for_a_bad_value_and_passes_the_filters(monkeypatch):
    history = FakeHistory([*counts(1), stored()])
    monkeypatch.setattr(board_routes.HistoryScope, "local", classmethod(lambda cls, store: history))
    store = SimpleNamespace(snapshot=SimpleNamespace(sessions=[{"native_session_id": SID, "pids": [3]}]))
    status, body = board_routes.handle_get("/api/board/sessions", "status=done", store, store, NOW)
    assert status == 400 and "status" in json.loads(body)["error"]
    status, body = board_routes.handle_get("/api/board/sessions", "sort=duration&order=asc&status=running&limit=50",
                                           store, store, NOW)
    payload = json.loads(body)
    assert status == 200 and payload["rows"][0]["status_evidence"].startswith("process 3 running")
    params = history.reads[-2][1]
    assert (params["sort_key"], params["ascending"], params["requested_status"], params["page_size"]) == (
        "duration", True, "running", 50)
    assert params["live_sessions"] == [SID]


# ─── The view text ────────────────────────────────────────────────


def _declared(text: str) -> set[str]:
    head = text[text.index("(") + 1 : text.index(");")]
    return {part.split(":")[0].strip() for part in head.split(",")}


def test_the_view_declares_every_parameter_the_reader_sends():
    text = kusto_reader._query("sessions.search")
    listed = set(kusto_reader._VIEWS["sessions.search"][0].split())
    assert listed | {"row_limit"} == _declared(text)


def test_the_reader_binds_every_finder_parameter_with_its_type():
    seen = {}

    def execute(_database, text, props):
        seen.update({name: props.get_parameter(name, None) for name in _declared(text)})
        table = type("Table", (list,), {})()
        table.columns = [SimpleNamespace(column_name=n, column_type="string")
                         for n in ("row_type", "total", "node_id", "session_id", "data")]
        return SimpleNamespace(primary_results=[table])

    reader = kusto_reader.KustoReader(SimpleNamespace(execute_query=execute), "db")
    history = SimpleNamespace(qualified=False, read=lambda view, **p: reader.read(view, {"all_nodes": True, **p}).rows)
    query = SessionQuery(q="x", tools=["claude-code"], since=1.0, until=2.0, project="p", model="m", status="ended",
                         name_source="tool", errors=True, min_tokens=5, min_cost=0.5, sort="started", ascending=True)
    session_record._reader_search(None, history, query, now=NOW, live={SID: {1}})
    assert seen["observed_ends"] == json.dumps(sorted(session_lifecycle.END_OBSERVED)).join(("dynamic(", ")"))
    assert seen["errors_only"] == "true" and seen["ascending"] == "true" and seen["min_cost"] == "0.5"
    assert seen["now_ts"] == str(NOW) and seen["sort_key"] == "started" and seen["min_tokens"] == "5"
    assert seen["live_sessions"] == f'dynamic(["{SID}"])'
    assert seen["model_prices"].startswith("dynamic({") and '"claude-sonnet-4-5": [' in seen["model_prices"]


def test_the_view_sorts_before_it_pages_and_states_the_rules_in_order():
    text = kusto_reader._query("sessions.search")
    assert text.index("order by lead_rank asc, sort_signed asc nulls last") < text.index("serialize page_n=row_number()")
    rule = re.search(r"status=case\((.*?)'inferred'\)", text, re.S).group(1)
    assert [m for m in re.findall(r"'(\w+)'", rule)] == ["running", "ended", "running"]
    assert "end_reason in (observed_ends) and seen <= ended_at + end_grace" in rule
    assert "now_ts - seen < idle_window" in rule
    # Keys first: the facts tables are joined to the selected keys before they are deduplicated.
    for table in ("requests", "tool_invocations", "session_usage", "session_prompts"):
        block = text[text.index(f"({table}\n") if f"({table}\n" in text else text.index(f"materialize({table}"):]
        assert block.index("join kind=leftsemi fact_keys") < block.index("summarize arg_max(_v, *)")


def test_the_view_uses_no_bare_kql_keyword_as_a_name():
    """The engine refuses `title`, `last`, `first`, `kind` and `cycles` as bare names (found on the
    emulator: the previous sessions.search used `title` and could not run on a cluster)."""
    text = kusto_reader._query("sessions.search")
    code = re.sub(r"@?'(?:[^'\\]|\\.)*'|@?\"(?:[^\"\\]|\\.)*\"|//[^\n]*", " ", text).replace("nulls last", " ").replace("kind=", " ")
    assert not re.findall(r"(?<![\w\[])(?:title|last|first|kind|cycles)(?![\w\]])", code)
