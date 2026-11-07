"""The panel dashboard API: exact values on a seeded store, filters, nulls and budgets."""

from __future__ import annotations

import gzip
import json
import random
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from types import SimpleNamespace

import pytest

from aictl.dashboard import board_api
from aictl.dashboard.board_api import (
    Filters,
    agent_detail,
    compute_board,
    coverage_rows,
    error_detail,
    file_detail,
    find_loops,
    is_test_command,
    mask_secrets,
    parse_filters,
    prompt_detail,
    run_action,
    tool_detail,
)
from aictl.data.model_pricing import cost_usd, request_cost_usd
from aictl.storage import HistoryDB

NOW = time.time()
DAY = 86400.0
SONNET = "claude-sonnet-4-5"
HAIKU = "claude-haiku-4-5"
GPT = "gpt-5"


def _insert(conn, table: str, **values) -> None:
    columns = ", ".join(values)
    marks = ", ".join("?" for _ in values)
    conn.execute(f"INSERT INTO {table} ({columns}) VALUES ({marks})", tuple(values.values()))


def _request(conn, ts, sid, tool, project, model, i=0, o=0, cr=0, cw=0, duration=0.0, aid="", **extra):
    _insert(
        conn,
        "requests",
        ts=ts,
        session_id=sid,
        agent_id=aid,
        tool=tool,
        project_path=project,
        model=model,
        input_tokens=i,
        output_tokens=o,
        cache_read_tokens=cr,
        cache_creation_tokens=cw,
        duration_ms=duration,
        source=extra.pop("source", "test"),
        **extra,
    )


def _call(conn, ts, sid, tool, project, name, target="", is_error=0, duration=0.0, aid="", **extra):
    _insert(
        conn,
        "tool_invocations",
        ts=ts,
        session_id=sid,
        agent_id=aid,
        tool=tool,
        project_path=project,
        tool_name=name,
        target=target,
        is_error=is_error,
        duration_ms=duration,
        **extra,
    )


def _prompt(conn, ts, sid, tool, project, text="", prompt_file="", aid=""):
    _insert(
        conn,
        "session_prompts",
        ts=ts,
        session_id=sid,
        agent_id=aid,
        tool=tool,
        project_path=project,
        text=text,
        prompt_file=prompt_file,
    )


def _session(conn, sid, tool, project, started, ended=None):
    _insert(conn, "sessions", session_id=sid, tool=tool, project_path=project, started_at=started, ended_at=ended)


def seed(db: HistoryDB, now: float) -> None:
    """Five sessions, with hand-countable numbers.

    done:     claude-code in /p/alpha, ended, a subagent, 3 + 1 model calls.
    vsc:      copilot-vscode in /p/beta, ended, 2 model calls, no tool or prompt rows.
    usage:    codex-cli in /p/gamma, only a session_usage row.
    looper:   claude-code in /p/alpha, active, its last 3 calls are the same failure.
    waiter:   claude-code in /p/beta, active, one pending confirmation.
    """
    conn = db._conn()
    t = now - 2 * DAY
    _session(conn, "done", "claude-code", "/p/alpha", t, t + 300)
    _request(conn, t + 10, "done", "claude-code", "/p/alpha", SONNET, i=100, o=50, cr=800, cw=50, duration=1000)
    _request(conn, t + 20, "done", "claude-code", "/p/alpha", SONNET, i=100, o=50, cr=800, cw=50, duration=2000)
    _request(conn, t + 30, "done", "claude-code", "/p/alpha", SONNET, i=100, o=50, cr=800, cw=50, duration=3000, ttft_ms=250)
    _request(conn, t + 40, "done", "claude-code", "/p/alpha", HAIKU, i=10, o=5, duration=500, aid="sub-1")
    _insert(
        conn,
        "agents",
        agent_id="sub-1",
        session_id="done",
        tool="claude-code",
        task="Explore",
        model=HAIKU,
        is_sidechain=1,
        started_at=t + 35,
        ended_at=t + 45,
        completed=1,
    )
    _prompt(conn, t + 5, "done", "claude-code", "/p/alpha", text="Fix the parser token=abcd1234secret", prompt_file="fix.prompt.md")
    _prompt(conn, t + 25, "done", "claude-code", "/p/alpha", text="Now add a test")
    _call(conn, t + 12, "done", "claude-code", "/p/alpha", "Bash", "pytest test/", duration=4000, confirm="approved", confirm_wait_ms=2000, exit_code=0)
    _call(conn, t + 22, "done", "claude-code", "/p/alpha", "Edit", "src/a.py", duration=100, confirm="auto")
    _call(conn, t + 32, "done", "claude-code", "/p/alpha", "Bash", "pytest test/", is_error=1, duration=6000, confirm="denied", exit_code=1)
    _call(conn, t + 42, "done", "claude-code", "/p/alpha", "Read", "src/a.py", duration=10, aid="sub-1")
    _call(conn, t + 43, "done", "claude-code", "/p/alpha", "mcp__db__query", "select", is_error=1, duration=20, aid="sub-1", result_summary="Timeout after 30s")
    _insert(conn, "skill_uses", ts=t + 7, session_id="done", tool="claude-code", project_path="/p/alpha", name="review")
    _insert(
        conn,
        "file_write_events",
        ts=t + 23,
        session_id="done",
        tool="claude-code",
        tool_name="Edit",
        operation="edit",
        path="/p/alpha/src/a.py",
        project_path="/p/alpha",
        source_event_id="edit-1",
        detail=json.dumps({"lines_added": 2, "lines_removed": 1}),
    )
    conn.execute(
        "UPDATE tool_invocations SET source_event_id = 'edit-1', input = ? WHERE session_id = 'done' AND tool_name = 'Edit'",
        (json.dumps({"old_string": "api_key=oldsecretvalue\nb", "new_string": "api_key=newsecretvalue\nb2\nc"}),),
    )

    t2 = now - 1 * DAY
    _session(conn, "vsc", "copilot-vscode", "/p/beta", t2, t2 + 100)
    _request(conn, t2 + 1, "vsc", "copilot-vscode", "/p/beta", GPT, i=1000, o=100, duration=800)
    _request(conn, t2 + 2, "vsc", "copilot-vscode", "/p/beta", GPT, i=1000, o=100, is_error=1, error_type="rate_limit", http_status=429)

    _insert(
        conn,
        "session_usage",
        session_id="usage",
        tool="codex-cli",
        model=GPT,
        models_json=json.dumps(
            {GPT: {"requests": 4, "input_tokens": 300, "output_tokens": 30, "cache_read_tokens": 60, "cache_creation_tokens": 0}}
        ),
        input_tokens=300,
        output_tokens=30,
        cache_read_tokens=60,
        cache_creation_tokens=0,
        request_count=4,
        tool_call_count=6,
        turn_count=2,
        started_at=t2 + 50,
        last_activity_at=t2 + 500,
        project_path="/p/gamma",
    )

    t3 = now - 120
    _session(conn, "looper", "claude-code", "/p/alpha", t3)
    _request(conn, t3 + 1, "looper", "claude-code", "/p/alpha", SONNET, i=200, o=20, duration=1500)
    _prompt(conn, t3, "looper", "claude-code", "/p/alpha", text="Make it pass")
    for k in range(3):
        _call(conn, t3 + 10 + k, "looper", "claude-code", "/p/alpha", "Bash", "ls /missing", is_error=1, duration=5, result_summary="No such file 12")
    t4 = now - 60
    _session(conn, "waiter", "claude-code", "/p/beta", t4)
    _request(conn, t4 + 1, "waiter", "claude-code", "/p/beta", SONNET, i=10, o=10, duration=700)
    _call(conn, t4 + 2, "waiter", "claude-code", "/p/beta", "Write", "/etc/hosts", confirm="pending")
    _insert(conn, "process_snapshots", ts=now - 100, pid=11, tool="claude-code", cpu_percent=10.0, memory_rss_mb=100.0)
    _insert(conn, "process_snapshots", ts=now - 100, pid=12, tool="claude-code", cpu_percent=5.0, memory_rss_mb=50.0)
    _insert(conn, "process_snapshots", ts=now - 100, pid=21, tool="copilot-vscode", cpu_percent=1.0, memory_rss_mb=9.0)
    conn.commit()


@pytest.fixture(autouse=True)
def _no_state_from_other_tests():
    """The module keeps short-lived answers. No test may see one from another test."""
    for memo in (board_api._facts_memo, board_api._sources_memo, board_api._disk_prompts_memo, board_api._BASE_TIMES, board_api._SENT, board_api._COMPUTED_AT):
        memo.clear()
    board_api._MEMO._entries.clear()
    board_api._BASE_MEMO._entries.clear()
    board_api._self_memo[:] = [0.0, None]


@pytest.fixture(autouse=True)
def _no_real_process_times(monkeypatch):
    """The process ids in these tests may be real processes of this machine."""
    monkeypatch.setattr(board_api, "_process_start", lambda pid: 0.0)


@pytest.fixture()
def db(tmp_path):
    # Routes that read the clock must see this seed as recent, however long the run has taken.
    global NOW
    NOW = time.time()
    store = HistoryDB(db_path=str(tmp_path / "board.db"), flush_interval=0)
    seed(store, NOW)
    yield store
    store.close()


def _filters(**kw) -> Filters:
    return Filters(**{"since": NOW - 7 * DAY, "until": NOW, **kw})


def _board(db, snapshot=None, **kw) -> dict:
    return compute_board(db, _filters(**kw), snapshot, NOW)


def _agent(payload, agent_id):
    return next(a for a in payload["agents"] if a["id"] == agent_id)


# ─── Exact values ─────────────────────────────────────────────────


class TestTotals:
    def test_kpis(self, db):
        k = _board(db)["kpis"]
        # 3*1000 + 15 + 2*1100 + 390 + 220 + 20 tokens.
        assert k["tokens"] == 3000 + 15 + 2200 + 390 + 220 + 20
        # Calls: 5 done + 3 looper + 1 waiter + 6 fallback.
        assert k["tool_calls"] == 15
        assert k["failures"] == 2 + 3
        # Model calls 4 + 2 + 4 + 1 + 1, prompts 3, fallback turns 2, tool calls 15.
        assert k["messages"] == 12 + 3 + 2 + 15
        assert k["running"] == 2
        assert k["subagents_running"] == 0
        assert k["loops"] == 1
        assert k["p50_ms"] == 1000
        assert k["p95_ms"] == 3000
        # Cache read 2400 + 60, of input 310 + 2000 + 300 + 200 + 10, cache read, and cache write 150.
        assert k["cached_share"] == round(2460 / (2820 + 2460 + 150), 4)

    def test_cost_is_list_price(self, db):
        k = _board(db)["kpis"]
        expected = (
            cost_usd(SONNET, 300 + 200 + 10, 150 + 20 + 10, 2400, 150)
            + cost_usd(HAIKU, 10, 5)
            + cost_usd(GPT, 2000 + 300, 200 + 30, 60, 0)
        )
        assert k["cost_usd"] == pytest.approx(expected, abs=1e-5)

    def test_saved_usd(self, db):
        payload = _board(db)
        sonnet = 2400 * (3.0 - 0.3) / 1e6
        gpt_rate = board_api.resolve_pricing(GPT)[1]
        gpt_saved = 60 * (gpt_rate.input_per_m - gpt_rate.cache_read_per_m) / 1e6
        assert payload["saved_usd"] == pytest.approx(sonnet + gpt_saved, abs=1e-5)

    def test_numbers_agree(self, db):
        payload = _board(db)
        k = payload["kpis"]
        roots = [a for a in payload["agents"] if a["parent_id"] is None]

        def row_tokens(a):
            return sum(a[f] or 0 for f in ("input", "output", "cache_read", "cache_write"))

        assert sum(m["tokens"] for m in payload["by_model"]) == k["tokens"]
        assert sum(p["tokens"] for p in payload["projects"]) == k["tokens"]
        assert sum(row_tokens(a) for a in roots) == k["tokens"]
        assert sum(m["cost_usd"] or 0 for m in payload["by_model"]) == pytest.approx(k["cost_usd"], abs=1e-4)
        assert sum(p["cost_usd"] or 0 for p in payload["projects"]) == pytest.approx(k["cost_usd"], abs=1e-4)
        assert sum(a["cost_usd"] or 0 for a in roots) == pytest.approx(k["cost_usd"], abs=1e-4)
        series = payload["series"]["tokens"]
        assert sum(sum(series[f]) for f in series) == k["tokens"]
        assert sum(k["spark"]["tokens"]) == k["tokens"]
        assert sum(sum(v) for v in payload["series"]["messages"].values()) == k["messages"]
        assert sum(k["spark"]["messages"]) == k["messages"]

    def test_numbers_agree_under_each_filter(self, db):
        for kw in ({"tools": ("claude-code",)}, {"project": "/p/beta"}, {"model": SONNET}, {"status": "ended"}, {"q": "parser"}):
            payload = _board(db, **kw)
            roots = [a for a in payload["agents"] if a["parent_id"] is None]
            tokens = sum(sum(a[f] or 0 for f in ("input", "output", "cache_read", "cache_write")) for a in roots)
            assert tokens == payload["kpis"]["tokens"], kw
            assert sum(m["tokens"] for m in payload["by_model"]) == payload["kpis"]["tokens"], kw
            assert sum(p["tokens"] for p in payload["projects"]) == payload["kpis"]["tokens"], kw

    def test_previous_window(self, db):
        k = compute_board(db, _filters(since=NOW - 1.5 * DAY), None, NOW)["kpis"]
        # The window before holds the session two days ago only.
        assert k["prev"]["tokens"] == 3015
        assert k["prev"]["tool_calls"] == 5
        assert k["prev"]["messages"] == 4 + 2 + 5
        assert k["prev"]["cost_usd"] == pytest.approx(cost_usd(SONNET, 300, 150, 2400, 150) + cost_usd(HAIKU, 10, 5), abs=1e-5)

    def test_previous_window_empty_is_null(self, db):
        k = _board(db)["kpis"]
        assert k["prev"] == {"messages": None, "tokens": None, "cost_usd": None, "tool_calls": None}

    def test_range(self, db):
        rng = compute_board(db, _filters(buckets=7), None, NOW)["range"]
        assert rng["bucket_s"] == pytest.approx(DAY)
        assert rng["bucket_starts"][1] == pytest.approx(NOW - 6 * DAY)
        assert len(rng["bucket_starts"]) == 7


class TestAgents:
    def test_root_includes_subagent(self, db):
        payload = _board(db)
        done = _agent(payload, "done")
        assert (done["input"], done["output"], done["cache_read"], done["cache_write"]) == (310, 155, 2400, 150)
        assert done["msgs"] == {"user": 2, "assistant": 4, "tool": 5}
        assert done["tool_calls"] == 5
        assert done["failures"] == 2
        assert done["models"] == [HAIKU, SONNET]
        assert done["cached_share"] == round(2400 / (310 + 2400 + 150), 4)
        assert done["confirms_asked"] == 2
        assert done["confirms_denied"] == 1
        assert done["parent_id"] is None

    def test_subagent_row(self, db):
        sub = _agent(_board(db), "sub-1")
        assert sub["parent_id"] == "done"
        assert sub["role"] == "Explore"
        assert (sub["input"], sub["output"]) == (10, 5)
        assert sub["tool_calls"] == 2
        assert sub["failures"] == 1
        assert sub["cpu_percent"] is None and sub["mem_mb"] is None
        assert sub["status"] == "failed"

    def test_title_from_first_prompt_with_secret_masked(self, db):
        title = _agent(_board(db), "done")["title"]
        assert title.startswith("Fix the parser")
        assert "abcd1234secret" not in title

    def test_title_falls_back_to_tool_and_project(self, db):
        assert _agent(_board(db), "vsc")["title"] == "Copilot VS Code · beta"

    def test_active_first(self, db):
        ids = [a["id"] for a in _board(db)["agents"]]
        assert ids[:2] == ["waiter", "looper"]

    def test_row_cap_keeps_every_root_first(self, db):
        conn = db._conn()
        for k in range(250):
            _request(conn, NOW - 3 * DAY + k, f"many-{k}", "claude-code", "/p/many", SONNET, i=1)
        conn.commit()
        payload = _board(db)
        assert len(payload["agents"]) == 200
        assert payload["scope"]["listed_agents"] == 200
        assert payload["scope"]["shown_agents"] == 255 + 1
        assert all(a["parent_id"] is None for a in payload["agents"])

    def test_by_role(self, db):
        roles = {r["kind"]: r for r in _board(db)["by_role"]}
        assert roles["Explore"]["runs"] == 1
        assert roles["Explore"]["tokens"] == 15
        assert roles["Explore"]["fail_rate"] == 0.5
        assert roles["Main agents"]["runs"] == 5

    def test_by_model(self, db):
        rows = {m["model"]: m for m in _board(db)["by_model"]}
        assert rows[SONNET]["msgs"] == 5
        assert rows[SONNET]["tokens"] == 3000 + 220 + 20
        assert rows[SONNET]["agents"] == 3
        assert rows[SONNET]["p95_ms"] == 3000
        assert rows[HAIKU]["agent_ids"] == ["sub-1"]

    def test_tool_order_follows_activity(self, db):
        payload = _board(db)
        # By tokens: claude-code, copilot-vscode, codex-cli.
        assert [t["id"] for t in payload["options"]["tools"]] == ["claude-code", "copilot-vscode", "codex-cli"]
        assert list(payload["series"]["cost"]["by_tool"]) == ["claude-code", "copilot-vscode", "codex-cli"]
        conn = db._conn()
        _request(conn, NOW - 3600, "codex-big", "codex-cli", "/p/gamma", GPT, i=999999)
        conn.commit()
        assert [t["id"] for t in _board(db)["options"]["tools"]][0] == "codex-cli"


class TestFallback:
    def test_session_with_usage_only_enters_totals_as_estimated(self, db):
        payload = _board(db)
        row = _agent(payload, "usage")
        assert row["estimated"] is True
        assert (row["input"], row["output"], row["cache_read"]) == (300, 30, 60)
        assert row["msgs"] == {"user": 2, "assistant": 4, "tool": 6}
        assert row["tool_calls"] == 6
        assert row["failures"] is None
        assert row["cost_usd"] == pytest.approx(cost_usd(GPT, 300, 30, 60, 0), abs=1e-6)

    def test_fallback_lands_in_the_bucket_of_last_activity(self, db):
        since = NOW - 7 * DAY
        payload = compute_board(db, _filters(since=since, buckets=7), None, NOW)
        index = int((NOW - DAY + 50 + 450 - since) / DAY)
        # The fallback row, the session on that day, and the two sessions of the last minutes.
        assert payload["series"]["tokens"]["input"][index] == 300 + 2000 + 200 + 10

    def test_session_with_requests_uses_no_fallback(self, db):
        conn = db._conn()
        _insert(conn, "session_usage", session_id="vsc", tool="copilot-vscode", input_tokens=5_000_000, last_activity_at=NOW - 1000)
        conn.commit()
        assert _agent(_board(db), "vsc")["input"] == 2000

    def test_fallback_outside_window_absent(self, db):
        payload = compute_board(db, _filters(since=NOW - 3600), None, NOW)
        assert all(a["id"] != "usage" for a in payload["agents"])

    def test_bad_models_json_uses_the_total(self, db):
        conn = db._conn()
        conn.execute("UPDATE session_usage SET models_json = 'not json' WHERE session_id = 'usage'")
        conn.commit()
        models = {m["model"] for m in _board(db)["by_model"]}
        assert GPT in models


class TestPricing:
    def test_request_over_a_length_tier_is_priced_per_request(self, db):
        conn = db._conn()
        model = "claude-haiku-5-5"
        ts = NOW - 3 * DAY
        _request(conn, ts, "tier", "claude-code", "/p/alpha", model, i=150_000, o=10)
        _request(conn, ts + 1, "tier", "claude-code", "/p/alpha", model, i=10, o=10)
        conn.commit()
        expected = request_cost_usd(model, 150_000, 10, ts=ts) + request_cost_usd(model, 10, 10, ts=ts + 1)
        assert _agent(_board(db), "tier")["cost_usd"] == pytest.approx(expected, abs=1e-6)

    def test_unknown_model_cost_is_null_and_tokens_stay(self, db):
        conn = db._conn()
        _request(conn, NOW - 3 * DAY, "mystery", "claude-code", "/p/alpha", "no-such-model", i=7)
        conn.commit()
        payload = _board(db)
        row = _agent(payload, "mystery")
        assert row["input"] == 7 and row["cost_usd"] is None
        assert next(m for m in payload["by_model"] if m["model"] == "no-such-model")["cost_usd"] is None


# ─── Filters ──────────────────────────────────────────────────────


class TestFilters:
    def _ids(self, payload):
        return {a["id"] for a in payload["agents"] if a["parent_id"] is None}

    def test_tool(self, db):
        payload = _board(db, tools=("copilot-vscode", "codex-cli"))
        assert self._ids(payload) == {"vsc", "usage"}
        assert payload["kpis"]["tokens"] == 2200 + 390
        assert payload["tools"] == []
        assert payload["kpis"]["tool_calls"] == 6

    def test_project(self, db):
        payload = _board(db, project="/p/beta")
        assert self._ids(payload) == {"vsc", "waiter"}
        assert payload["kpis"]["tokens"] == 2200 + 20
        assert [p["project"] for p in payload["projects"]] == ["/p/beta"]

    def test_model_filters_rows_inside_a_session(self, db):
        payload = _board(db, model=HAIKU)
        assert self._ids(payload) == {"done"}
        assert payload["kpis"]["tokens"] == 15
        assert [m["model"] for m in payload["by_model"]] == [HAIKU]
        assert payload["kpis"]["p95_ms"] == 500

    @pytest.mark.parametrize(
        ("status", "ids"),
        [
            ("active", {"looper", "waiter"}),
            ("looping", {"looper"}),
            ("waiting", {"waiter"}),
            ("running", set()),
            ("ended", {"usage"}),
            ("failed", {"done", "vsc"}),
        ],
    )
    def test_status(self, db, status, ids):
        assert self._ids(_board(db, status=status)) == ids

    def test_q_searches_prompts_and_targets(self, db):
        assert self._ids(_board(db, q="parser")) == {"done"}
        assert self._ids(_board(db, q="/etc/hosts")) == {"waiter"}

    def test_q_treats_percent_as_text(self, db):
        assert self._ids(_board(db, q="100%")) == set()

    def test_time(self, db):
        payload = compute_board(db, _filters(since=NOW - 3600), None, NOW)
        assert self._ids(payload) == {"looper", "waiter"}

    def test_options_ignore_the_filters(self, db):
        payload = _board(db, tools=("codex-cli",), project="/p/gamma")
        assert {t["id"] for t in payload["options"]["tools"]} == {"claude-code", "copilot-vscode", "codex-cli"}
        assert {p["id"] for p in payload["options"]["projects"]} == {"/p/alpha", "/p/beta", "/p/gamma"}
        assert payload["scope"] == {"shown_agents": 1, "shown_sessions": 1, "all_agents": 6, "listed_agents": 1}

    def test_cpu_and_memory_follow_only_tool_and_time(self, db):
        unfiltered = _board(db)["series"]
        narrowed = _board(db, project="/p/gamma", model=GPT, status="ended", q="x")["series"]
        assert narrowed["cpu"] == unfiltered["cpu"]
        assert narrowed["mem"] == unfiltered["mem"]
        one_tool = _board(db, tools=("claude-code",))["series"]
        assert list(one_tool["cpu"]) == ["claude-code"]
        assert max(v for v in one_tool["cpu"]["claude-code"] if v is not None) == 15.0
        assert max(v for v in one_tool["mem"]["claude-code"] if v is not None) == 150.0

    def test_filter_reaches_every_section(self, db):
        payload = _board(db, project="/p/beta")
        assert payload["tools"][0]["name"] == "Write"
        assert payload["changes"]["files"] == []
        assert payload["skills"] == []
        assert payload["tests"] == []
        assert payload["loops"] == []
        assert payload["prompts"] == []
        assert all("rate_limit" in e["key"] for e in payload["errors"])

    def test_empty_tool_selection_shows_nothing(self, db):
        payload = _board(db, tools=())
        assert payload["agents"] == []
        assert payload["kpis"]["tokens"] == 0
        assert payload["kpis"]["cost_usd"] is None

    def test_parse(self):
        f = parse_filters("since=10&until=20&tool=a,b&project=x&model=m&status=active&q=hi&buckets=5", 100.0)
        assert (f.since, f.until, f.tools, f.project, f.model, f.status, f.q, f.buckets) == (10.0, 20.0, ("a", "b"), "x", "m", "active", "hi", 5)
        assert parse_filters("", 100.0).until == 100.0
        assert parse_filters("buckets=9999", 100.0).buckets == board_api.MAX_BUCKETS

    @pytest.mark.parametrize("query", ["since=abc", "status=nope", "since=20&until=10", "buckets=0", "since=nan"])
    def test_parse_rejects(self, query):
        with pytest.raises(board_api.BoardRequestError):
            parse_filters(query, 100.0)


# ─── Null versus 0 ────────────────────────────────────────────────


class TestNulls:
    def test_tool_without_tool_rows_is_null(self, db):
        row = _agent(_board(db), "vsc")
        assert row["tool_calls"] is None
        assert row["failures"] is None
        assert row["msgs"]["tool"] is None
        assert row["msgs"]["user"] is None
        assert row["confirms_asked"] is None

    def test_tool_with_tool_rows_is_zero(self, db):
        conn = db._conn()
        _request(conn, NOW - 3 * DAY, "quiet", "claude-code", "/p/alpha", SONNET, i=1)
        conn.commit()
        board_api._facts_memo.clear()
        row = _agent(_board(db), "quiet")
        assert row["tool_calls"] == 0
        assert row["failures"] == 0
        assert row["msgs"]["user"] == 0
        assert row["confirms_asked"] == 0

    def test_unreported_cache_write_is_null(self, db):
        assert _agent(_board(db), "vsc")["cache_write"] is None

    def test_zero_cache_write_of_a_reporting_tool_stays_zero(self, db):
        assert _agent(_board(db), "waiter")["cache_write"] == 0

    def test_series_nulls(self, db):
        series = compute_board(db, _filters(buckets=7), None, NOW)["series"]
        assert series["cached_share"][0] is None
        assert series["latency"]["p50"][0] is None
        assert series["latency"]["p95"][0] is None
        assert series["tokens"]["input"][0] == 0
        assert series["failures"]["tool"][0] == 0

    def test_empty_store(self, tmp_path):
        store = HistoryDB(db_path=str(tmp_path / "empty.db"), flush_interval=0)
        payload = compute_board(store, _filters(), None, NOW)
        k = payload["kpis"]
        assert k["tokens"] == 0
        assert k["cost_usd"] is None
        assert k["tool_calls"] is None
        assert k["failures"] is None
        assert k["fail_rate"] is None
        assert k["p50_ms"] is None
        assert k["cached_share"] is None
        assert payload["saved_usd"] is None
        assert payload["confirms"]["asked"] is None
        assert all(r["count"] == 0 and r["p95_ms"] is None for r in payload["latency"])
        store.close()

    def test_missing_durations_are_excluded(self, db):
        conn = db._conn()
        _request(conn, NOW - 3 * DAY, "nodur", "claude-code", "/p/alpha", SONNET, i=1, duration=0.0)
        conn.commit()
        assert _board(db)["latency"][0]["count"] == 7

    def test_lines_unknown_are_null(self, db):
        conn = db._conn()
        _insert(conn, "file_write_events", ts=NOW - 3 * DAY, session_id="done", tool="claude-code", path="/p/alpha/b.py", project_path="/p/alpha")
        conn.commit()
        files = {f["path"]: f for f in _board(db)["changes"]["files"]}
        assert files["/p/alpha/b.py"]["lines_added"] is None
        assert files["/p/alpha/b.py"]["edits"] == 1
        assert files["/p/alpha/src/a.py"]["lines_added"] == 2


# ─── Sections ─────────────────────────────────────────────────────


class TestRowMeaning:
    """What the writers put in the fact tables, as stated in the contract."""

    def test_a_subagent_task_prompt_is_not_a_person_prompt(self, db):
        conn = db._conn()
        _prompt(conn, NOW - 2 * DAY + 36, "done", "claude-code", "/p/alpha", text="Look around", prompt_file="task.md", aid="sub-1")
        conn.commit()
        payload = _board(db)
        assert payload["kpis"]["messages"] == 12 + 3 + 2 + 15
        done = _agent(payload, "done")
        assert done["msgs"]["user"] == 2
        assert _agent(payload, "sub-1")["msgs"]["user"] == 1, "its own task prompt, on its own row only"
        assert _agent(payload, "sub-1")["title"].startswith("Look around")
        assert all(p["text"] != "Look around" for p in payload["prompts"])
        assert next(p for p in payload["projects"] if p["project"] == "/p/alpha")["prompts"] == 3
        assert all(r["file"] != "task.md" for r in payload["project_prompts"])
        assert sum(payload["series"]["messages"]["user"]) == 3 + 2
        assert [t["text"] for t in agent_detail(db, "done", None, NOW)[1]["turns"]] == ["Now add a test", "Fix the parser token=<redacted>"]

    def test_a_permission_row_is_a_confirmation_and_not_a_tool_call(self, db):
        conn = db._conn()
        ts = NOW - 2 * DAY + 50
        for _ in range(3):
            _call(conn, ts, "done", "claude-code", "/p/alpha", "permission:url", "x", is_error=1, confirm="denied", confirm_wait_ms=9000)
        conn.commit()
        payload = _board(db)
        assert payload["kpis"]["tool_calls"] == 15
        assert payload["kpis"]["failures"] == 5
        assert sum(payload["kpis"]["spark"]["tool_calls"]) == 15
        assert sum(payload["series"]["failures"]["tool"]) == 5
        assert sum(payload["series"]["messages"]["tool"]) == 15
        done = _agent(payload, "done")
        assert (done["tool_calls"], done["failures"]) == (5, 2)
        assert sum(done["activity"]) == 4 + 5
        assert all(t["name"] != "permission:url" for t in payload["tools"])
        assert all("permission" not in e["key"] for e in payload["errors"])
        assert all("permission" not in loop["pattern"] for loop in payload["loops"] if loop["agent_id"] == "done")
        assert next(r for r in payload["latency"] if r["what"] == "Tool call")["count"] == 8
        # It still counts as a confirmation.
        assert done["confirms_asked"] == 2 + 3
        assert done["confirms_denied"] == 1 + 3
        confirms = payload["confirms"]
        assert confirms["denied"] == 1 + 3
        assert {r["name"]: r["denied"] for r in confirms["by_tool"]}["permission:url"] == 3
        detail = agent_detail(db, "done", None, NOW)[1]
        assert len(detail["tool_calls"]) == 5
        assert detail["turns"][0]["tools"] == 3

    def test_a_tool_with_only_permission_rows_has_no_tool_call_data(self, db):
        conn = db._conn()
        _request(conn, NOW - 3 * DAY, "perm", "copilot-desktop", "/p/x", SONNET, i=1)
        _call(conn, NOW - 3 * DAY, "perm", "copilot-desktop", "/p/x", "permission:read", "x", confirm="approved")
        conn.commit()
        board_api._facts_memo.clear()
        payload = _board(db)
        assert payload["coverage"]["rows"][19]["key"] == "tool_calls"
        assert payload["coverage"]["rows"][19]["cells"]["copilot-desktop"]["state"] == "No data"
        assert next(r for r in payload["coverage"]["rows"] if r["key"] == "confirms")["cells"]["copilot-desktop"]["state"] == "Exact"


class TestUnreportedFields:
    def test_ttft_of_a_tool_that_has_none_is_null(self, tmp_path):
        store = HistoryDB(db_path=str(tmp_path / "t.db"), flush_interval=0)
        conn = store._conn()
        _request(conn, NOW - DAY, "cc", "claude-code", "/p", SONNET, i=1, duration=100)
        conn.commit()
        row = next(r for r in compute_board(store, _filters(), None, NOW)["latency"] if r["what"] == "Time to first token")
        assert row == {"what": "Time to first token", "count": None, "p50_ms": None, "p95_ms": None, "p99_ms": None, "max_ms": None}
        store.close()

    def test_ttft_of_a_tool_that_reports_it_counts_zero(self, tmp_path):
        store = HistoryDB(db_path=str(tmp_path / "t.db"), flush_interval=0)
        conn = store._conn()
        _request(conn, NOW - DAY, "cx", "codex-cli", "/p", GPT, i=1, duration=100)
        conn.commit()
        row = next(r for r in compute_board(store, _filters(), None, NOW)["latency"] if r["what"] == "Time to first token")
        assert row["count"] == 0
        assert row["p50_ms"] is None
        store.close()

    def test_confirm_wait_of_a_tool_that_has_none_is_null(self, tmp_path):
        store = HistoryDB(db_path=str(tmp_path / "t.db"), flush_interval=0)
        conn = store._conn()
        _call(conn, NOW - DAY, "cc", "claude-code", "/p", "Bash", "ls", confirm="approved")
        conn.commit()
        confirms = compute_board(store, _filters(), None, NOW)["confirms"]
        assert confirms["approved"] == 1
        assert confirms["p95_wait_s"] is None
        assert confirms["by_tool"][0]["median_wait_s"] is None
        store.close()

    def test_cache_write_of_vscode_is_null_everywhere(self, db):
        payload = _board(db, tools=("copilot-vscode",))
        assert _agent(payload, "vsc")["cache_write"] is None
        assert payload["by_model"][0]["cache_write"] is None
        assert set(payload["series"]["tokens"]["cache_write"]) == {None}

    def test_a_model_shared_with_a_reporting_tool_stays_a_number(self, db):
        rows = {m["model"]: m for m in _board(db)["by_model"]}
        assert rows[GPT]["cache_write"] == 0
        assert rows[SONNET]["cache_write"] == 150

    def test_app_totals_only_session(self, db):
        """A desktop session known only by its totals: no model split and no counts."""
        conn = db._conn()
        _request(conn, NOW - 3 * DAY, "other", "copilot-desktop", "/p/d", SONNET, i=1)
        _call(conn, NOW - 3 * DAY, "other", "copilot-desktop", "/p/d", "Bash", "ls")
        _prompt(conn, NOW - 3 * DAY, "other", "copilot-desktop", "/p/d", text="hi")
        _insert(conn, "session_usage", session_id="app", tool="copilot-desktop", input_tokens=500, output_tokens=50, last_activity_at=NOW - 3 * DAY, project_path="/p/d")
        conn.commit()
        board_api._facts_memo.clear()
        payload = _board(db)
        row = _agent(payload, "app")
        assert row["estimated"] is True
        assert (row["input"], row["output"]) == (500, 50)
        assert row["msgs"] == {"user": None, "assistant": None, "tool": None}
        assert row["tool_calls"] is None
        assert row["failures"] is None
        assert row["cost_usd"] is None
        assert "unknown" in row["models"]
        assert payload["kpis"]["tokens"] == sum(m["tokens"] for m in payload["by_model"])


class TestSections:
    def test_latency(self, db):
        rows = {r["what"]: r for r in _board(db)["latency"]}
        assert rows["Model reply"]["count"] == 7
        assert rows["Model reply"]["max_ms"] == 3000
        assert rows["Time to first token"]["count"] == 1
        assert rows["Time to first token"]["p50_ms"] == 250
        assert rows["Tool call"]["count"] == 8
        assert rows["Tool call"]["max_ms"] == 6000
        assert rows["Whole turn"]["count"] >= 2
        assert rows["Agent run"]["count"] >= 1

    def test_tools(self, db):
        rows = {t["name"]: t for t in _board(db)["tools"]}
        bash = rows["Bash"]
        assert (bash["calls"], bash["failed"]) == (5, 4)
        assert bash["server"] is False
        assert bash["fail_rate"] == 0.8
        assert bash["p50_ms"] == 5
        assert bash["max_ms"] == 6000
        assert sum(bash["trend"]) == 5 and len(bash["trend"]) == 12
        assert rows["mcp__db__query"]["server"] is True
        assert rows["Write"]["p50_ms"] is None
        assert rows["Write"]["max_ms"] is None

    def test_confirms(self, db):
        c = _board(db)["confirms"]
        assert (c["asked"], c["auto"], c["approved"], c["denied"]) == (3, 1, 1, 1)
        assert c["p95_wait_s"] == 2.0
        assert c["pending"][0]["name"] == "Write"
        assert c["pending"][0]["agent_id"] == "waiter"
        by_tool = {r["name"]: r for r in c["by_tool"]}
        assert by_tool["Bash"]["approved"] == 1
        assert by_tool["Bash"]["denied"] == 1
        assert by_tool["Bash"]["median_wait_s"] == 2.0
        assert by_tool["Edit"]["median_wait_s"] is None

    def test_pending_on_agent_and_attention(self, db):
        payload = _board(db)
        waiter = _agent(payload, "waiter")
        assert waiter["status"] == "waiting"
        assert waiter["pending"]["name"] == "Write"
        assert waiter["pending"]["target"] == "/etc/hosts"
        kinds = {a["kind"]: a for a in payload["attention"]}
        assert kinds["waiting"]["agent_id"] == "waiter"
        assert kinds["loop"]["agent_id"] == "looper"
        assert "ls /missing" in kinds["loop"]["detail"]

    def test_stale_pending_on_an_ended_session_is_not_waiting(self, db):
        conn = db._conn()
        _call(conn, NOW - 3 * DAY, "done", "claude-code", "/p/alpha", "Write", "x", confirm="pending")
        conn.commit()
        row = _agent(_board(db), "done")
        assert row["status"] != "waiting"
        assert row["pending"] is None

    def test_errors(self, db):
        rows = {e["key"]: e for e in _board(db)["errors"]}
        key = "tool:Bash:No such file #"
        assert rows[key]["count"] == 3
        assert rows[key]["kind"] == "Tool"
        assert rows[key]["agents"] == 1
        assert rows["api:rate_limit:429"]["kind"] == "API"
        assert rows["api:rate_limit:429"]["count"] == 1

    def test_failure_series_separates_tool_and_api(self, db):
        failures = _board(db)["series"]["failures"]
        assert sum(failures["tool"]) == 5
        assert sum(failures["api"]) == 1

    def test_prompts_newest_first_with_tokens(self, db):
        prompts = _board(db)["prompts"]
        assert [p["agent_id"] for p in prompts][0] == "looper"
        assert prompts[0]["tokens"] == 220
        done = [p for p in prompts if p["agent_id"] == "done"]
        assert done[-1]["tokens"] == 2 * 1000
        assert "abcd1234secret" not in done[-1]["text"]

    def test_metadata_capture_keeps_text_empty(self, db):
        conn = db._conn()
        conn.execute("UPDATE session_prompts SET text = ''")
        conn.commit()
        payload = _board(db)
        assert all(p["text"] == "" for p in payload["prompts"])
        assert _agent(payload, "done")["title"] == "Claude Code · alpha"

    def test_skills(self, db):
        skills = _board(db)["skills"]
        assert skills == [{"name": "review", "uses": 1, "tokens": 2000, "agents": 1, "scope": None, "path": None, "description": None, "file_tokens": None}]

    def test_project_prompts_combine_disk_and_use(self, db, tmp_path):
        project = tmp_path / "proj"
        folder = project / ".github" / "prompts"
        folder.mkdir(parents=True)
        (folder / "used.prompt.md").write_text("x", encoding="utf-8")
        (folder / "unused.prompt.md").write_text("x", encoding="utf-8")
        conn = db._conn()
        ts = NOW - 3 * DAY
        _prompt(conn, ts, "disk", "claude-code", str(project), text="x", prompt_file="used.prompt.md")
        _request(conn, ts, "disk", "claude-code", str(project), SONNET, i=1)
        conn.commit()
        rows = {r["file"]: r for r in _board(db)["project_prompts"] if r["project"] == str(project)}
        assert rows[".github/prompts/used.prompt.md"]["uses"] == 1
        assert rows[".github/prompts/unused.prompt.md"]["uses"] == 0
        assert rows[".github/prompts/unused.prompt.md"]["last_ts"] is None

    def test_changes_and_project_rows(self, db):
        payload = _board(db)
        assert payload["changes"]["totals"] == {"files": 1, "lines_added": 2, "lines_removed": 1, "edits": 1}
        alpha = next(p for p in payload["projects"] if p["project"] == "/p/alpha")
        assert (alpha["lines_added"], alpha["lines_removed"]) == (2, 1)
        assert (alpha["test_runs"], alpha["test_passed"]) == (2, 1)
        assert alpha["loops"] == 1
        assert alpha["agents"] == 3
        assert alpha["prompts"] == 3
        beta = next(p for p in payload["projects"] if p["project"] == "/p/beta")
        assert beta["api_errors"] == 1

    def test_memory_files(self, db):
        conn = db._conn()
        _insert(conn, "files", path="/p/alpha/CLAUDE.md", tool="claude-code", category="memory", scope="project", tokens=120, last_changed=NOW - 50)
        _insert(conn, "files", path="/p/alpha/other.md", tool="claude-code", category="instructions")
        _insert(
            conn,
            "file_write_events",
            ts=NOW - 50,
            session_id="done",
            tool="claude-code",
            path="/p/alpha/CLAUDE.md",
            detail=json.dumps({"lines_added": 1, "lines_removed": 0}),
        )
        conn.commit()
        rows = _board(db)["memory_files"]
        assert [r["path"] for r in rows] == ["/p/alpha/CLAUDE.md", "/p/alpha/other.md"]
        assert rows[0]["tokens"] == 120
        assert rows[0]["read_by"] == "claude-code"
        assert rows[0]["changed_by"] == "claude-code"
        assert rows[0]["lines_added"] == 1

    def test_sources(self, db):
        rows = {s["tool"]: s for s in _board(db)["sources"]}
        assert rows["claude-code"]["data_from"] == "test"
        assert rows["codex-cli"]["last_data_ts"] == pytest.approx(NOW - DAY + 500)

    def test_self(self, db):
        section = _board(db)["self"]
        assert section["memory_rss_bytes"] > 0
        assert section["history_bytes"] > 0
        assert section["history_limit_bytes"] > 0
        assert section["retention_days"] == 30

    def test_capture_mode(self, db):
        assert _board(db)["capture_mode"] == db.capture


class TestSelfMemo:
    def test_a_failure_is_not_remembered(self, db, monkeypatch):
        def broken():
            raise OSError("no process table")

        monkeypatch.setattr(board_api, "self_usage", broken)
        assert _board(db)["self"]["memory_rss_bytes"] is None
        monkeypatch.undo()
        assert _board(db)["self"]["memory_rss_bytes"] > 0


class TestLive:
    def _snapshot(self):
        proc = SimpleNamespace(pid=501, name="claude", cpu_pct="12.5", mem_mb="80.5")
        other = SimpleNamespace(pid=999, name="node", cpu_pct="1.0", mem_mb="5.0")
        tool = SimpleNamespace(tool="claude-code", meta=False, processes=[proc, other])
        return SimpleNamespace(
            sessions=[
                {
                    "session_id": "done",
                    "tool": "claude-code",
                    "project": "/p/alpha",
                    "pids": [501],
                    "cpu_percent": 12.5,
                    "started_at": NOW - 3 * DAY,
                    "last_seen_at": NOW,
                },
                {
                    "session_id": "codex-cli:7:1",
                    "tool": "codex-cli",
                    "project": "/p/live",
                    "pids": [],
                    "cpu_percent": 0.0,
                    "started_at": NOW - 5,
                    "last_seen_at": NOW,
                },
            ],
            tools=[tool],
        )

    def test_a_quiet_session_with_a_process_is_idle_with_process_numbers(self, db):
        row = _agent(_board(db, snapshot=self._snapshot()), "done")
        assert row["status"] == "idle"
        assert row["cpu_percent"] == 12.5
        assert row["mem_mb"] == 80.5
        assert row["pids"] == [501]
        assert row["ended_at"] is None

    def test_ended_agent_has_no_process_numbers(self, db):
        row = _agent(_board(db), "done")
        assert row["cpu_percent"] is None
        assert row["mem_mb"] is None
        assert row["pids"] == []
        assert row["ended_at"] is not None

    def test_processes_name_their_agent(self, db):
        rows = {p["pid"]: p for p in _board(db, snapshot=self._snapshot())["processes"]}
        assert rows[501]["agent_id"] == "done"
        assert rows[501]["cpu_percent"] == 12.5
        assert rows[999]["agent_id"] is None
        assert rows[999]["title"] is None

    def test_processes_follow_the_tool_filter(self, db):
        assert _board(db, snapshot=self._snapshot(), tools=("codex-cli",))["processes"] == []

    def test_one_process_marks_only_the_newest_session_of_its_project(self, db):
        conn = db._conn()
        for sid, ts in (("old-a", NOW - 2000), ("old-b", NOW - 1900)):
            _session(conn, sid, "aider", "/p/x", NOW - 3000)
            _request(conn, ts, sid, "aider", "/p/x", SONNET, i=1)
        conn.commit()
        snapshot = SimpleNamespace(sessions=[_live("aider:1:1", "aider", "/p/x", [1], 3000.0)], tools=[])
        payload = _board(db, snapshot=snapshot)
        assert _agent(payload, "old-b")["status"] == "idle"
        assert _agent(payload, "old-a")["status"] == "ended"


def _live(sid, tool, project, pids, age=100.0, cpu=1.0):
    return {
        "session_id": sid,
        "tool": tool,
        "project": project,
        "pids": pids,
        "root_pid": pids[0] if pids else None,
        "cpu_percent": cpu,
        "started_at": NOW - age,
        "last_seen_at": NOW,
    }


def _proc(pid, tool="", kind="cli", mem="10.0", name="p"):
    return SimpleNamespace(pid=pid, name=name, cpu_pct="1.0", mem_mb=mem, tool=tool, process_type=kind)


class TestLiveProcessSessions:
    """The monitor reports processes under made-up ids. They are not agents by themselves."""

    def _real_only(self, db):
        """One real session, recent enough to overlap the processes and old enough not to be active."""
        conn = db._conn()
        conn.execute("DELETE FROM requests")
        conn.execute("DELETE FROM tool_invocations")
        conn.execute("DELETE FROM session_prompts")
        conn.execute("DELETE FROM session_usage")
        conn.execute("DELETE FROM file_write_events")
        conn.execute("DELETE FROM skill_uses")
        conn.execute("DELETE FROM agents")
        conn.execute("DELETE FROM sessions")
        _session(conn, "real", "claude-code", "/p/one", NOW - 7200)
        _request(conn, NOW - 3600, "real", "claude-code", "/p/one", SONNET, i=100, o=10)
        conn.commit()

    def test_several_process_rows_merge_into_the_one_real_session(self, db):
        self._real_only(db)
        pids = [[101], [102, 103], [104]]
        snapshot = SimpleNamespace(
            sessions=[_live(f"claude-code:{p[0]}:1793900235", "claude-code", "/p/one", p, 7000.0, 2.0) for p in pids],
            tools=[SimpleNamespace(tool="claude-code", meta=False, processes=[_proc(p) for p in (101, 102, 103, 104)])],
        )
        payload = _board(db, snapshot=snapshot)
        assert [a["id"] for a in payload["agents"]] == ["real"]
        row = payload["agents"][0]
        assert row["status"] == "idle"
        assert row["input"] == 100
        assert row["pids"] == [101, 102, 103, 104]
        assert row["cpu_percent"] == 4.0
        assert row["mem_mb"] == 40.0
        assert payload["kpis"]["running"] == 0
        assert payload["kpis"]["idle"] == 1
        assert payload["scope"] == {"shown_agents": 1, "shown_sessions": 1, "all_agents": 1, "listed_agents": 1}
        assert {p["agent_id"] for p in payload["processes"]} == {"real"}

    def test_a_known_pid_link_merges_whatever_the_project_says(self, db):
        self._real_only(db)
        conn = db._conn()
        _insert(conn, "session_processes", session_id="real", pid=555, tool="claude-code")
        conn.commit()
        snapshot = SimpleNamespace(sessions=[_live("claude-code:555:1", "claude-code", "/other", [555], 7000.0)], tools=[])
        payload = _board(db, snapshot=snapshot)
        assert [a["id"] for a in payload["agents"]] == ["real"]
        assert payload["agents"][0]["pids"] == [555]

    def test_a_process_first_seen_just_now_merges_into_a_session_active_minutes_ago(self, db):
        # The monitor dates a process from when it first saw it, so after a restart
        # every process looks newer than the last request of an idle session.
        conn = db._conn()
        _request(conn, NOW - 300, "idle", "claude-code", "/p/two", "m", i=10, o=5)
        conn.commit()
        snapshot = SimpleNamespace(sessions=[_live("claude-code:8:1", "claude-code", "/p/two", [8], 30.0, 3.0)], tools=[])
        row = _agent(_board(db, snapshot=snapshot), "idle")
        assert row["status"] == "running"
        assert row["cpu_percent"] == 3.0
        assert row["pids"] == [8]

    def test_cpu_comes_from_the_current_process_samples(self, db):
        conn = db._conn()
        _request(conn, NOW - 300, "busy", "claude-code", "/p/two", "m", i=10, o=5)
        conn.commit()
        procs = [{"pid": 8, "name": "n", "cpu_pct": 1.5, "mem_mb": 10.0}, {"pid": 9, "name": "n", "cpu_pct": 2.0, "mem_mb": 20.0}]
        snapshot = SimpleNamespace(
            sessions=[_live("claude-code:8:1", "claude-code", "/p/two", [8, 9], 30.0, 0.0)],
            tools=[SimpleNamespace(tool="claude-code", meta=False, processes=procs)],
        )
        row = _agent(_board(db, snapshot=snapshot), "busy")
        assert (row["cpu_percent"], row["mem_mb"]) == (3.5, 30.0)

    def test_an_agent_worktree_counts_as_its_project(self, db):
        conn = db._conn()
        _request(conn, NOW - 300, "wt", "claude-code", "/p/repo/.claude/worktrees/agent-1", "m", i=10, o=5)
        conn.commit()
        payload = _board(db)
        assert _agent(payload, "wt")["project"] == "/p/repo"
        assert "/p/repo" in [p["project"] for p in payload["projects"]]

    def test_a_process_that_started_after_the_session_stopped_does_not_merge(self, db):
        self._real_only(db)
        snapshot = SimpleNamespace(sessions=[_live("claude-code:7:1", "claude-code", "/p/one", [7], 100.0)], tools=[])
        payload = _board(db, snapshot=snapshot)
        assert _agent(payload, "real")["status"] == "ended"
        assert payload["kpis"]["running"] == 0
        assert [a["id"] for a in payload["agents"]] == ["real", "live:claude-code:/p/one"]

    def test_desktop_app_helpers_are_only_processes(self, db):
        self._real_only(db)
        helpers = [100 + k for k in range(5)]
        snapshot = SimpleNamespace(
            sessions=[_live(f"claude-desktop:{p}:1", "claude-desktop", "", [p]) for p in helpers]
            + [_live("copilot-desktop:900:1", "copilot-desktop", "/p/one", [900])],
            tools=[
                SimpleNamespace(tool="claude-desktop", meta=False, processes=[_proc(p, kind="helper") for p in helpers]),
                SimpleNamespace(tool="copilot-desktop", meta=False, processes=[_proc(900, kind="daemon")]),
            ],
        )
        payload = _board(db, snapshot=snapshot)
        assert [a["id"] for a in payload["agents"]] == ["real"]
        assert payload["kpis"]["running"] == 0
        assert len(payload["processes"]) == 6
        assert all(p["agent_id"] is None for p in payload["processes"])

    def test_a_project_with_8_processes_and_no_session_gets_one_row(self, db):
        self._real_only(db)
        pids = list(range(200, 208))
        snapshot = SimpleNamespace(
            sessions=[_live(f"codex-cli:{p}:1", "codex-cli", "/p/eight", [p], cpu=1.5) for p in pids],
            tools=[SimpleNamespace(tool="codex-cli", meta=False, processes=[_proc(p) for p in pids])],
        )
        payload = _board(db, snapshot=snapshot)
        assert [a["id"] for a in payload["agents"]] == ["real", "live:codex-cli:/p/eight"]
        row = payload["agents"][1]
        assert row["title"] == "Codex CLI, no session data yet"
        assert "codex-cli" in [t["id"] for t in payload["options"]["tools"]]
        assert row["status"] == "running"
        assert row["placeholder"] is True
        assert row["pids"] == pids
        assert row["cpu_percent"] == 12.0
        assert row["mem_mb"] == 80.0
        assert row["input"] is None
        assert row["msgs"]["user"] is None
        assert payload["kpis"]["running"] == 0
        assert payload["scope"]["shown_agents"] == 1
        assert payload["kpis"]["tokens"] == 110
        assert {p["agent_id"] for p in payload["processes"]} == {"live:codex-cli:/p/eight"}

    def test_mixed_machine(self, db):
        """Seed sessions, one merged process, helpers, and a project with only processes."""
        snapshot = SimpleNamespace(
            sessions=[
                _live("claude-code:1:1", "claude-code", "/p/alpha", [1], 3 * DAY),
                _live("claude-code:2:1", "claude-code", "/p/alpha", [2], 3 * DAY),
                _live("claude-desktop:3:1", "claude-desktop", "", [3]),
                _live("codex-cli:4:1", "codex-cli", "/p/only", [4]),
                _live("codex-cli:5:1", "codex-cli", "/p/only", [5]),
            ],
            tools=[],
        )
        payload = _board(db, snapshot=snapshot)
        # looper is the newest claude-code session in /p/alpha, and it was already active.
        assert payload["kpis"]["running"] == 2
        # Two processes and two sessions: each session owns one process.
        assert _agent(payload, "looper")["pids"] == [1]
        assert _agent(payload, "done")["pids"] == [2]
        assert _agent(payload, "done")["status"] == "idle"
        rows = [a["id"] for a in payload["agents"]]
        assert rows[-1] == "live:codex-cli:/p/only"
        assert len(rows) == 6 + 1

    def test_process_rows_follow_the_filters(self, db):
        snapshot = SimpleNamespace(sessions=[_live("codex-cli:4:1", "codex-cli", "/p/only", [4])], tools=[])
        row = "live:codex-cli:/p/only"

        def ids(**kw):
            return [a["id"] for a in _board(db, snapshot=snapshot, **kw)["agents"]]

        assert row in ids(tools=("codex-cli",))
        assert row not in ids(tools=("claude-code",))
        assert row in ids(project="/p/only")
        assert row not in ids(project="/p/beta")
        assert row not in ids(model=SONNET)
        assert row in ids(status="running")
        assert row not in ids(status="ended")
        assert row in ids(q="only")

    def test_detail_of_an_old_session_does_not_take_the_process(self, db):
        self._real_only(db)
        conn = db._conn()
        _session(conn, "older", "claude-code", "/p/one", NOW - 7500)
        _request(conn, NOW - 7000, "older", "claude-code", "/p/one", SONNET, i=1)
        conn.commit()
        snapshot = SimpleNamespace(sessions=[_live("claude-code:9:1", "claude-code", "/p/one", [9], 7400.0)], tools=[])
        assert agent_detail(db, "older", snapshot, NOW)[1]["agent"]["status"] == "ended"
        assert agent_detail(db, "real", snapshot, NOW)[1]["agent"]["status"] == "idle"


class TestRangeKey:
    def test_a_client_clock_that_moves_keeps_one_answer(self, db, monkeypatch):
        store = SimpleNamespace(version=1, snapshot=None)
        when = int(NOW / board_api.MEMO_TTL_S) * board_api.MEMO_TTL_S
        runs = []
        real = board_api.compute_board
        monkeypatch.setattr(board_api, "compute_board", lambda *a, **k: runs.append(1) or real(*a, **k))
        first = board_api.board_bytes(db, store, f"since={when - DAY}&until={when}", when)
        again = board_api.board_bytes(db, store, f"since={when - DAY + 5}&until={when + 5}", when + 5)
        assert again == first
        assert len(runs) == 1

    def test_old_rows_stay_in_their_buckets_while_the_clock_moves(self, db):
        """The range moves in steps, so an answer with no new data does not change."""
        store = SimpleNamespace(version=1, snapshot=None)
        step = 30 * DAY / 48 / 4
        when = int(NOW / step) * step + 1.0  # just after a step line
        conn = db._conn()
        for k in range(2000):
            _request(conn, when - 20 * DAY + k * 60, "bulk", "claude-code", "/p/alpha", SONNET, i=1)
        conn.commit()
        first = board_api.board_bytes(db, store, f"since={when - 30 * DAY}&until={when}", when)
        later = when + 3 * board_api.MEMO_TTL_S
        again = board_api.board_bytes(db, store, f"since={later - 30 * DAY}&until={later}", later)
        assert again == first
        rng = json.loads(first)["range"]
        assert rng["until"] - rng["since"] == pytest.approx(30 * DAY)
        assert 0 <= rng["until"] - when <= step

    def test_a_range_in_the_past_keeps_its_own_key(self, db, monkeypatch):
        store = SimpleNamespace(version=1, snapshot=None)
        when = NOW
        one = json.loads(board_api.board_bytes(db, store, f"since={when - 3 * DAY}&until={when - DAY}", when))
        two = json.loads(board_api.board_bytes(db, store, f"since={when - 4 * DAY}&until={when - 2 * DAY}", when))
        assert one["range"]["until"] == pytest.approx(when - DAY)
        assert two["range"]["until"] == pytest.approx(when - 2 * DAY)


class TestRefreshBehind:
    def _when(self):
        return int(NOW / board_api.MEMO_TTL_S) * board_api.MEMO_TTL_S

    def _wait(self):
        if board_api._refresh_thread is not None:
            board_api._refresh_thread.join(10)

    def test_a_poll_answers_from_memory_and_the_next_one_has_the_new_data(self, db):
        store = SimpleNamespace(version=1, snapshot=None)
        first = board_api.board_bytes(db, store, "", time.time(), background=True)
        conn = db._conn()
        _request(conn, time.time() - 5, "fresh", "claude-code", "/p/alpha", SONNET, i=5)
        conn.commit()
        # Computed moments ago: the old answer stays and no refresh starts.
        assert board_api.board_bytes(db, store, "", time.time(), background=True) == first
        key = next(iter(board_api._COMPUTED_AT))
        board_api._COMPUTED_AT[key] -= board_api.REFRESH_MIN_S
        assert board_api.board_bytes(db, store, "", time.time(), background=True) == first
        self._wait()
        assert b'"fresh"' in board_api.board_bytes(db, store, "", time.time(), background=True)

    def test_an_answer_too_old_is_not_served(self, db):
        store = SimpleNamespace(version=1, snapshot=None)
        first = board_api.board_bytes(db, store, "", time.time(), background=True)
        conn = db._conn()
        _request(conn, time.time() - 5, "fresh", "claude-code", "/p/alpha", SONNET, i=5)
        conn.commit()
        key = next(iter(board_api._COMPUTED_AT))
        board_api._COMPUTED_AT[key] -= board_api.MAX_STALE_S
        assert board_api.board_bytes(db, store, "", time.time(), background=True) != first

    def test_a_new_filter_is_answered_for_that_filter(self, db):
        store = SimpleNamespace(version=1, snapshot=None)
        board_api.board_bytes(db, store, "", time.time(), background=True)
        payload = json.loads(board_api.board_bytes(db, store, "tool=codex-cli", time.time(), background=True))
        assert [a["id"] for a in payload["agents"]] == ["usage"]

    def test_a_failed_refresh_leaves_the_answer(self, db, monkeypatch):
        store = SimpleNamespace(version=1, snapshot=None)
        first = board_api.board_bytes(db, store, "", time.time(), background=True)
        monkeypatch.setattr(board_api, "compute_board", lambda *a, **k: 1 / 0)
        conn = db._conn()
        _request(conn, time.time() - 5, "fresh", "claude-code", "/p/alpha", SONNET, i=5)
        conn.commit()
        key = next(iter(board_api._COMPUTED_AT))
        board_api._COMPUTED_AT[key] -= board_api.REFRESH_MIN_S
        assert board_api.board_bytes(db, store, "", time.time(), background=True) == first
        self._wait()


class TestUnchangedAnswers:
    """A polling client pays a 304 unless the data changed."""

    def _when(self):
        return int(NOW / board_api.MEMO_TTL_S) * board_api.MEMO_TTL_S

    def test_a_recompute_with_the_same_data_returns_the_same_bytes(self, db):
        store = SimpleNamespace(version=1, snapshot=None)
        when = self._when()
        first = board_api.board_bytes(db, store, f"since={when - DAY}&until={when + 900}", when)
        again = board_api.board_bytes(db, store, f"since={when - DAY}&until={when + 900}", when + board_api.MEMO_TTL_S)
        assert again == first

    def test_clock_following_range_and_live_load_do_not_change_the_bytes(self, db):
        def snapshot(cpu):
            proc = SimpleNamespace(pid=4, name="c", cpu_pct=str(cpu), mem_mb=str(cpu), process_type="cli")
            return SimpleNamespace(
                sessions=[{**_live("claude-code:4:1", "claude-code", "/p/beta", [4], 1000.0), "cpu_percent": cpu}],
                tools=[SimpleNamespace(tool="claude-code", meta=False, processes=[proc])],
            )

        store = SimpleNamespace(version=1, snapshot=snapshot(1.0))
        when = self._when()
        first = board_api.board_bytes(db, store, f"since={when - DAY}", when)
        store.snapshot = snapshot(50.0)
        store.version = 2
        assert board_api.board_bytes(db, store, f"since={when - DAY}", when + board_api.MEMO_TTL_S) == first

    def test_new_data_changes_the_bytes(self, db):
        store = SimpleNamespace(version=1, snapshot=None)
        when = self._when()
        first = board_api.board_bytes(db, store, f"since={when - DAY}", when)
        conn = db._conn()
        _request(conn, when - 5, "fresh", "claude-code", "/p/alpha", SONNET, i=5)
        conn.commit()
        assert board_api.board_bytes(db, store, f"since={when - DAY}", when + 1) != first

    def test_the_bytes_are_sent_anew_after_a_while(self, db):
        store = SimpleNamespace(version=1, snapshot=None)
        when = self._when()
        query = f"since={when - DAY}&until={when + 900}"
        first = json.loads(board_api.board_bytes(db, store, query, when))
        later = json.loads(board_api.board_bytes(db, store, query, when + board_api.RESEND_AFTER_S + 1))
        assert later["generated_at"] > first["generated_at"]

    def test_http_answers_304_after_a_recompute(self, db, monkeypatch, server):
        _status, _body, headers = _http(f"{server}/api/board", headers={"Accept-Encoding": "gzip"})
        board_api._MEMO._entries.clear()  # as when the store version moves on
        board_api._COMPUTED_AT.clear()  # and the answer has to be computed again
        status, _body, _ = _http(f"{server}/api/board", headers={"Accept-Encoding": "gzip", "If-None-Match": headers["ETag"]})
        assert status == 304


class TestStatusRules:
    def test_recent_activity_without_live_session_is_active(self, db):
        assert _agent(_board(db), "looper")["status"] == "looping"

    def test_recent_activity_wins_over_a_stored_end_time(self, db):
        """A Stop hook can close a session that is still working."""
        conn = db._conn()
        conn.execute("UPDATE sessions SET ended_at = ? WHERE session_id = 'waiter'", (NOW - 10,))
        conn.commit()
        assert _agent(_board(db), "waiter")["status"] == "waiting"

    def test_activity_older_than_15_minutes_is_ended(self, db):
        conn = db._conn()
        _request(conn, NOW - 16 * 60, "old", "claude-code", "/p/alpha", SONNET, i=1)
        conn.commit()
        assert _agent(_board(db), "old")["status"] == "ended"
        conn.execute("UPDATE requests SET ts = ? WHERE session_id = 'old'", (NOW - 14 * 60,))
        conn.commit()
        assert _agent(_board(db), "old")["status"] == "running"

    def test_failed_needs_the_last_call_to_fail(self, db):
        conn = db._conn()
        ts = NOW - DAY
        _call(conn, ts, "ok", "claude-code", "/p/alpha", "Bash", "a", is_error=1)
        _call(conn, ts + 1, "ok", "claude-code", "/p/alpha", "Bash", "b")
        _call(conn, ts, "bad", "claude-code", "/p/alpha", "Bash", "a")
        _call(conn, ts + 1, "bad", "claude-code", "/p/alpha", "Bash", "b", is_error=1)
        conn.commit()
        payload = _board(db)
        assert _agent(payload, "ok")["status"] == "ended"
        assert _agent(payload, "bad")["status"] == "failed"

    def test_finished_subagent_of_an_active_session_is_ended(self, db):
        conn = db._conn()
        _insert(conn, "agents", agent_id="s2", session_id="looper", tool="claude-code", task="Plan", is_sidechain=1, started_at=NOW - 100, ended_at=NOW - 90, completed=1)
        _insert(conn, "agents", agent_id="s3", session_id="looper", tool="claude-code", task="Plan", is_sidechain=1, started_at=NOW - 80)
        _request(conn, NOW - 70, "looper", "claude-code", "/p/alpha", SONNET, i=1, aid="s3")
        conn.commit()
        payload = _board(db)
        assert _agent(payload, "s2")["status"] == "ended"
        assert _agent(payload, "s3")["status"] == "running"
        assert payload["kpis"]["subagents_running"] == 1


# ─── Loop and test rules ──────────────────────────────────────────


def _calls(*spec) -> list:
    return [board_api._Call(float(i), name, target, err, code) for i, (name, target, err, code) in enumerate(spec)]


BASH_FAIL = ("Bash", "ls /x", 1, 1)
EDIT = ("Edit", "a.py", 0, None)
TEST_FAIL = ("Bash", "pytest", 1, 1)
TEST_FAIL_CODE = ("Bash", "pytest", 0, 2)
TEST_PASS = ("Bash", "pytest", 0, 0)
READ = ("Read", "a.py", 0, None)


class TestLoopRule:
    def test_three_repeats_is_a_loop(self):
        loops = find_loops(_calls(BASH_FAIL, BASH_FAIL, BASH_FAIL))
        assert len(loops) == 1
        assert loops[0]["repeats"] == 3
        assert loops[0]["at_end"] is True
        assert loops[0]["since_ts"] == 0.0

    def test_two_repeats_is_not(self):
        assert find_loops(_calls(BASH_FAIL, BASH_FAIL)) == []

    def test_another_call_breaks_the_run(self):
        assert find_loops(_calls(BASH_FAIL, BASH_FAIL, READ, BASH_FAIL)) == []

    def test_a_different_target_breaks_the_run(self):
        assert find_loops(_calls(BASH_FAIL, BASH_FAIL, ("Bash", "ls /y", 1, 1))) == []

    def test_a_success_breaks_the_run(self):
        assert find_loops(_calls(BASH_FAIL, ("Bash", "ls /x", 0, 0), BASH_FAIL, BASH_FAIL)) == []

    def test_loop_followed_by_other_work_is_not_at_end(self):
        loops = find_loops(_calls(BASH_FAIL, BASH_FAIL, BASH_FAIL, READ))
        assert loops[0]["at_end"] is False

    def test_edit_then_failing_test_three_times(self):
        loops = find_loops(_calls(EDIT, TEST_FAIL, EDIT, TEST_FAIL, EDIT, TEST_FAIL))
        assert len(loops) == 1
        assert loops[0]["repeats"] == 3
        assert "edit, then pytest fails" in loops[0]["pattern"]
        assert loops[0]["at_end"] is True

    def test_several_edits_count_as_one_edit_step(self):
        loops = find_loops(_calls(EDIT, EDIT, TEST_FAIL, EDIT, TEST_FAIL, EDIT, EDIT, EDIT, TEST_FAIL))
        assert loops[0]["repeats"] == 3

    def test_a_nonzero_exit_code_fails_a_test_run(self):
        assert find_loops(_calls(EDIT, TEST_FAIL_CODE, EDIT, TEST_FAIL_CODE, EDIT, TEST_FAIL_CODE))[0]["repeats"] == 3

    def test_a_passing_test_ends_the_cycle(self):
        assert find_loops(_calls(EDIT, TEST_FAIL, EDIT, TEST_PASS, EDIT, TEST_FAIL)) == []

    def test_two_cycles_is_not_a_loop(self):
        assert find_loops(_calls(EDIT, TEST_FAIL, EDIT, TEST_FAIL)) == []

    def test_loops_are_found_per_agent(self, db):
        """Calls of two agents interleave in one session, and each agent's run counts."""
        conn = db._conn()
        ts = NOW - 3 * DAY
        for k in range(3):
            _call(conn, ts + k * 2, "mix", "claude-code", "/p/alpha", "Bash", "a", is_error=1, aid="m-1")
            _call(conn, ts + k * 2 + 1, "mix", "claude-code", "/p/alpha", "Read", "b")
        conn.commit()
        loops = [loop for loop in _board(db)["loops"] if loop["agent_id"] == "m-1"]
        assert len(loops) == 1

    def test_board_loop_row(self, db):
        loop = next(row for row in _board(db)["loops"] if row["agent_id"] == "looper")
        assert loop["repeats"] == 3
        assert loop["status"] == "looping"
        assert loop["pattern"] == "Bash ls /missing fails"
        assert loop["tokens"] is None  # no model call inside the loop

    def test_loop_tokens_cover_the_calls_inside_it(self, db):
        conn = db._conn()
        t3 = NOW - 120
        _request(conn, t3 + 11, "looper", "claude-code", "/p/alpha", SONNET, i=40, o=2)
        conn.commit()
        loop = next(row for row in _board(db)["loops"] if row["agent_id"] == "looper")
        assert loop["tokens"] == 42
        assert loop["cost_usd"] == pytest.approx(cost_usd(SONNET, 40, 2), abs=1e-6)

    def test_ended_session_with_loop_at_end_does_not_loop(self, db):
        conn = db._conn()
        ts = NOW - DAY
        for k in range(3):
            _call(conn, ts + k, "gone", "claude-code", "/p/alpha", "Bash", "a", is_error=1)
        conn.commit()
        payload = _board(db)
        assert _agent(payload, "gone")["status"] == "failed"
        assert all(a["agent_id"] != "gone" for a in payload["attention"])


class TestTestClassification:
    @pytest.mark.parametrize(
        "command",
        [
            "pytest",
            "python -m pytest test/ -q",
            "python3 -m pytest",
            ".venv/bin/pytest -x",
            "cd sub && pytest",
            "npx vitest run",
            "npx jest",
            "npm test",
            "pnpm test -- --watch=false",
            "yarn test",
            "go test ./...",
            "cargo test",
            "make test",
            "dotnet test",
            "mvn test",
            "gradle test",
            "./gradlew test",
            "tox -e py312",
            "ctest --output-on-failure",
            "FOO=1 pytest",
            "uv run pytest",
            "pytest | tail -5",
            "$PY -m pytest test/ -q",
            "for t in a b; do cargo test $t; done",
            'V=$(mktemp -d) && python -m pytest -q',
            "if true; then npm test; fi",
            "python3 -m unittest discover -s test",
            "timeout 300 cargo test -p core",
            "gtimeout -k 5 1.5m pytest -q",
            "cd x && pytest -q \\",
            "cd /x && " + "A=1 " * 200 + "pytest",
        ],
    )
    def test_runner(self, command):
        assert is_test_command(command)

    @pytest.mark.parametrize(
        "command",
        [
            "",
            "grep pytest log.txt",
            "cat pytest.ini",
            "echo npm test",
            "ls test/",
            "git commit -m 'make test'x",
            "testing",
            "go build",
            "npm install",
            # Waiting for a test run, or writing a test file, is not a test run.
            'until ! pgrep -f "python -m pytest -q" >/dev/null; do sleep 5; done; tail -15 run.log',
            "cat >> tools/tests/test_a.py <<'EOF'",
            "timeout 30 sleep 5",
            "grep unittest setup.py",
        ],
    )
    def test_not_runner(self, command):
        assert not is_test_command(command)

    def test_only_command_tools_count(self, db):
        conn = db._conn()
        _call(conn, NOW - DAY, "t", "claude-code", "/p/alpha", "Read", "pytest")
        conn.commit()
        assert [t["command"] for t in _board(db)["tests"]] == ["pytest test/"]

    def test_test_rows_and_state(self, db):
        conn = db._conn()
        ts = NOW - DAY
        _call(conn, ts, "t", "claude-code", "/p/alpha", "Bash", "go test", duration=100, exit_code=0)
        _call(conn, ts + 1, "t", "claude-code", "/p/alpha", "Bash", "go test", duration=300)  # exit_code null passes
        _call(conn, ts, "t", "claude-code", "/p/alpha", "Bash", "cargo test", exit_code=101)  # exit code alone fails
        conn.commit()
        rows = {t["command"]: t for t in _board(db)["tests"]}
        assert rows["pytest test/"]["state"] == "Flaky"
        assert rows["pytest test/"]["runs"] == 2
        assert rows["pytest test/"]["failed"] == 1
        assert rows["pytest test/"]["median_ms"] == 4000
        assert rows["go test"]["state"] == "Passing"
        assert rows["go test"]["median_ms"] == 100
        assert rows["cargo test"]["state"] == "Failing"
        assert rows["cargo test"]["median_ms"] is None

    def test_test_series(self, db):
        tests = _board(db)["series"]["tests"]
        assert sum(tests["passed"]) == 1
        assert sum(tests["failed"]) == 1


# ─── Secrets ──────────────────────────────────────────────────────


class TestMasking:
    @pytest.mark.parametrize(
        "secret",
        [
            "token=abcd1234secret",
            "api_key: abcd1234secret",
            "password=abcd1234secret",
            "sk-abcdefgh12345678",
            "ghp_abcdefgh12345678",
            "AKIAABCDEFGHIJKLMNOP",
            "Authorization: Bearer abcd1234secret",
            "https://user:abcd1234secret@example.com/x",
            "eyJhbGciOiJI.eyJzdWIiOiIx.abcd1234sig",
        ],
    )
    def test_mask(self, secret):
        masked = mask_secrets(f"before {secret} after")
        assert "before" in masked and "after" in masked
        assert "abcd1234" not in masked
        assert "abcdefgh1234" not in masked
        assert "ABCDEFGHIJ" not in masked
        assert "<redacted>" in masked

    def test_plain_text_is_unchanged(self):
        assert mask_secrets("edit src/token_count.py") == "edit src/token_count.py"
        assert mask_secrets(None) == ""

    def test_target_on_every_route_is_masked(self, db):
        conn = db._conn()
        ts = NOW - 300
        _call(conn, ts, "leak", "claude-code", "/p/alpha", "Bash", "curl -H 'token=abcd1234secret' x", confirm="pending", is_error=1, result_summary="bad token=abcd1234secret")
        _request(conn, ts, "leak", "claude-code", "/p/alpha", SONNET, i=1)
        conn.commit()
        board_text = json.dumps(_board(db))
        assert "abcd1234secret" not in board_text
        _status, detail = agent_detail(db, "leak", None, NOW)
        assert "abcd1234secret" not in json.dumps(detail)
        _status, tool = tool_detail(db, "Bash", NOW)
        assert "abcd1234secret" not in json.dumps(tool)
        key = next(e["key"] for e in _board(db)["errors"] if "leak" not in e["key"] and "bad" in e["key"])
        _status, err = error_detail(db, key, NOW)
        assert err["items"]
        assert "abcd1234secret" not in json.dumps(err)

    def test_diff_is_masked(self, db):
        _status, detail = file_detail(db, "/p/alpha/src/a.py", NOW)
        text = json.dumps(detail)
        assert "oldsecretvalue" not in text
        assert "newsecretvalue" not in text

    def test_prompt_route_is_masked(self, db):
        _status, detail = prompt_detail(db, NOW - 2 * DAY + 5, "done", NOW)
        assert "abcd1234secret" not in detail["text"]
        assert detail["text"].startswith("Fix the parser")


class TestCoverage:
    def _row(self, payload, key):
        return next(r for r in payload["coverage"]["rows"] if r["key"] == key)

    def test_downgrades_to_no_data_when_no_row_exists(self, db):
        row = self._row(_board(db), "tool_calls")
        assert row["cells"]["claude-code"]["state"] == "Exact"
        assert row["cells"]["copilot-cli"]["state"] == "No data"

    def test_static_states_stay(self, db):
        payload = _board(db)
        assert self._row(payload, "cache_write")["cells"]["copilot-vscode"]["state"] == "Not reported"
        assert self._row(payload, "input")["cells"]["copilot365"]["state"] == "Not reported"
        assert self._row(payload, "cost")["cells"]["claude-code"]["state"] == "Estimate"
        assert self._row(payload, "cache_read")["cells"]["copilot-vscode"]["state"] == "No data"

    def test_needs_hooks_turns_exact_with_rows(self):
        rows = coverage_rows({"claude-code": {"prompt_text", "prompts"}}, ["claude-code"])
        cell = next(r for r in rows if r["key"] == "prompt_text")["cells"]["claude-code"]
        assert cell["state"] == "Exact"
        none = coverage_rows({}, ["claude-code"])
        assert next(r for r in none if r["key"] == "prompt_text")["cells"]["claude-code"]["state"] == "Needs hooks"

    def test_file_changes_without_lines(self):
        rows = coverage_rows({"claude-code": {"file_writes"}}, ["claude-code"])
        assert next(r for r in rows if r["key"] == "file_changes")["cells"]["claude-code"]["state"] == "No line counts"

    def test_every_cell_has_a_known_state_and_reason(self, db):
        allowed = {
            "Exact",
            "Partial",
            "Estimate",
            "Needs hooks",
            "Not reported",
            "Not checked",
            "Totals only",
            "No line counts",
            "No data",
        }
        for row in _board(db)["coverage"]["rows"]:
            for cell in row["cells"].values():
                assert cell["state"] in allowed
                assert cell["why"]

    def test_a_tool_outside_the_table_is_not_checked(self):
        rows = coverage_rows({"aider": {"requests"}}, ["aider"])
        assert rows[0]["cells"]["aider"]["state"] == "Not checked"

    def test_covers_all_survey_rows(self):
        assert len(board_api._COVERAGE_TABLE) == 27
        assert all(len(row[3]) == len(board_api._COVERAGE_TOOLS) for row in board_api._COVERAGE_TABLE)


# ─── Detail routes ────────────────────────────────────────────────


class TestDetails:
    def test_agent(self, db):
        status, d = agent_detail(db, "done", None, NOW)
        assert status == 200
        assert d["agent"]["id"] == "done"
        assert d["agent"]["input"] == 310
        assert [s["id"] for s in d["subagents"]] == ["sub-1"]
        assert {m["model"]: m["msgs"] for m in d["by_model"]} == {SONNET: 3, HAIKU: 1}
        assert d["process"] == {"cpu_percent": None, "mem_mb": None, "pids": [], "started_at": NOW - 2 * DAY}
        assert len(d["turns"]) == 2
        newest = d["turns"][0]
        assert newest["text"] == "Now add a test"
        assert newest["model"] == SONNET
        assert (newest["input"], newest["output"], newest["cache_read"]) == (110, 55, 800)
        assert newest["reply_ms"] == 3500
        assert newest["tools"] == 3
        assert len(d["tool_calls"]) == 5
        assert d["files"] == [{"path": "/p/alpha/src/a.py", "lines_added": 2, "lines_removed": 1, "edits": 1}]
        assert [t["passed"] for t in d["tests"]] == [False, True]
        assert d["loop"] is None
        assert {e["key"] for e in d["errors"]} == {"tool:Bash:", "tool:mcp__db__query:Timeout after #s"}

    def test_subagent(self, db):
        status, d = agent_detail(db, "sub-1", None, NOW)
        assert status == 200
        assert d["agent"]["parent_id"] == "done"
        assert d["agent"]["input"] == 10
        assert d["subagents"] == []
        assert len(d["tool_calls"]) == 2
        assert list(m["model"] for m in d["by_model"]) == [HAIKU]

    def test_agent_loop(self, db):
        _status, d = agent_detail(db, "looper", None, NOW)
        assert d["loop"]["repeats"] == 3
        assert d["loop"]["at_end"] is True

    def test_agent_fallback(self, db):
        status, d = agent_detail(db, "usage", None, NOW)
        assert status == 200
        assert d["by_model"][0]["estimated"] is True
        assert d["by_model"][0]["input"] == 300

    def test_agent_unknown(self, db):
        assert agent_detail(db, "nobody", None, NOW)[0] == 404

    def test_tool(self, db):
        status, d = tool_detail(db, "Edit", NOW)
        assert status == 200
        assert d["calls"][0]["target"] == "src/a.py"
        assert d["calls"][0]["confirm"] == "auto"
        assert d["calls"][0]["failed"] is False
        assert d["calls"][0]["title"].startswith("Fix the parser")

    def test_tool_row_limit(self, db):
        conn = db._conn()
        for k in range(205):
            _call(conn, NOW - 500 + k, "many", "claude-code", "/p/alpha", "Many")
        conn.commit()
        assert len(tool_detail(db, "Many", NOW)[1]["calls"]) == 200

    def test_error_tool_and_api(self, db):
        _status, d = error_detail(db, "tool:Bash:No such file #", NOW)
        assert len(d["items"]) == 3
        assert d["items"][0]["agent_id"] == "looper"
        assert d["items"][0]["detail"] == "No such file 12"
        _status, d = error_detail(db, "api:rate_limit:429", NOW)
        assert len(d["items"]) == 1
        assert d["items"][0]["agent_id"] == "vsc"
        assert error_detail(db, "junk", NOW)[0] == 400

    def test_file_diff_from_edit_input(self, db):
        status, d = file_detail(db, "/p/alpha/src/a.py", NOW)
        assert status == 200
        assert d["edits"][0]["lines_added"] == 2
        assert d["edits"][0]["agent_id"] == "done"
        kinds = [line["kind"] for line in d["diff"]]
        assert "add" in kinds and "del" in kinds and "same" in kinds
        assert {"kind": "add", "n": 3, "text": "c"} in d["diff"]

    def test_file_diff_from_history(self, db):
        conn = db._conn()
        _insert(conn, "file_history", path="/h.py", ts=1.0, content="a\nb\n")
        _insert(conn, "file_history", path="/h.py", ts=2.0, content="a\nc\n")
        conn.commit()
        diff = file_detail(db, "/h.py", NOW)[1]["diff"]
        assert {"kind": "del", "n": 2, "text": "b"} in diff
        assert {"kind": "add", "n": 2, "text": "c"} in diff

    def test_file_without_stored_text_has_null_diff(self, db):
        conn = db._conn()
        _insert(conn, "file_write_events", ts=NOW, session_id="done", path="/nothing.py", tool="claude-code")
        conn.commit()
        assert file_detail(db, "/nothing.py", NOW)[1]["diff"] is None

    def test_prompt(self, db):
        status, d = prompt_detail(db, NOW - 2 * DAY + 25, "done", NOW)
        assert status == 200
        assert d["text"] == "Now add a test"
        assert d["project"] == "/p/alpha"
        assert (d["input"], d["output"], d["cache_read"]) == (110, 55, 800)
        assert d["reply_ms"] == 3500
        assert d["tool_calls"] == 3
        assert prompt_detail(db, 1.0, "done", NOW)[0] == 404


# ─── Actions ──────────────────────────────────────────────────────


class TestActions:
    @pytest.mark.parametrize("confirm", [None, False, "true", 1])
    def test_needs_confirm_true(self, db, monkeypatch, confirm):
        ran = []
        monkeypatch.setattr(board_api, "_run_cli", lambda *a: ran.append(a))
        status, payload = run_action(db, "/", {"action": "hooks-repair", "confirm": confirm})
        assert status == 400
        assert "confirm" in payload["error"]
        assert ran == []

    def test_unknown_action(self, db):
        assert run_action(db, "/", {"action": "rm-rf", "confirm": True})[0] == 400
        assert run_action(db, "/", ["x"])[0] == 400

    @pytest.mark.parametrize(
        ("action", "argv"),
        [
            ("hooks-repair", ("hooks", "repair")),
            ("otel-enable", ("otel", "enable", "--port", "8610")),
        ],
    )
    def test_cli_actions_call_the_cli_command(self, db, monkeypatch, action, argv):
        ran = []
        monkeypatch.setattr(board_api, "_run_cli", lambda *a: ran.append(a) or {"ok": True, "exit_code": 0, "output": ""})
        status, payload = run_action(db, "/", {"action": action, "confirm": True}, 8610)
        assert status == 200
        assert payload["ok"] is True
        assert ran == [argv]

    def test_cli_failure_is_an_error_status(self, db, monkeypatch):
        monkeypatch.setattr(board_api, "_run_cli", lambda *a: {"ok": False, "exit_code": 1, "output": "bad"})
        assert run_action(db, "/", {"action": "hooks-repair", "confirm": True})[0] == 500

    def test_cli_runs_this_interpreter_without_a_shell(self, monkeypatch):
        seen = {}

        def fake_run(argv, **kw):
            seen["argv"] = argv
            seen["kw"] = kw
            return SimpleNamespace(returncode=0, stdout="token=abcd1234secret", stderr="")

        monkeypatch.setattr(board_api.subprocess, "run", fake_run)
        result = board_api._run_cli("hooks", "repair")
        assert seen["argv"][0] == board_api.sys.executable
        assert seen["argv"][-2:] == ["hooks", "repair"]
        assert "shell" not in seen["kw"]
        assert "abcd1234secret" not in result["output"]

    def test_baseline_update_calls_the_audit_with_update(self, db, monkeypatch, tmp_path):
        seen = {}

        def fake_audit(project, tool=None, *, update_baseline=False, **kw):
            seen.update(project=project, tool=tool, update=update_baseline)
            return {"baseline_updated": update_baseline}

        monkeypatch.setattr("aictl.context_audit.run_audit", fake_audit)
        status, payload = run_action(db, tmp_path, {"action": "baseline-update", "confirm": True, "args": {"project": str(tmp_path)}})
        assert status == 200
        assert seen == {"project": str(tmp_path), "tool": None, "update": True}
        assert payload["baseline_updated"] is True

    def test_baseline_update_ignores_a_path_that_is_not_a_folder(self, db, monkeypatch, tmp_path):
        seen = {}
        monkeypatch.setattr(
            "aictl.context_audit.run_audit",
            lambda project, tool=None, *, update_baseline=False, **kw: seen.update(project=project) or {},
        )
        run_action(db, tmp_path, {"action": "baseline-update", "confirm": True, "args": {"project": "\\\\host\\share"}})
        assert seen["project"] == tmp_path

    def test_db_compact_runs_the_store_compaction(self, db, monkeypatch):
        calls = []
        monkeypatch.setattr(db, "compact", lambda: calls.append(1) or {"events_deleted": 2})
        status, payload = run_action(db, "/", {"action": "db-compact", "confirm": True})
        assert status == 200
        assert payload["removed"] == {"events_deleted": 2}
        assert calls == [1]

    def test_action_is_audited(self, db, monkeypatch):
        monkeypatch.setattr(db, "compact", lambda: {})
        run_action(db, "/", {"action": "db-compact", "confirm": True})
        kinds = [r[0] for r in db._conn().execute("SELECT kind FROM events")]
        assert "action:db_compact" in kinds


# ─── HTTP layer ───────────────────────────────────────────────────


@pytest.fixture()
def server(db):
    from aictl.dashboard.models import DashboardSnapshot
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore

    store = SnapshotStore(db=db)
    store.update(DashboardSnapshot(timestamp=NOW, root="/tmp", tools=[]))
    srv = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), Path("/tmp"))
    thread = threading.Thread(target=srv.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


def _http(url, data=None, headers=None):
    request = urllib.request.Request(url, data=data, headers=headers or {}, method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, response.read(), dict(response.headers)
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(), dict(exc.headers)


class TestHttp:
    def test_board_contract_keys(self, server):
        status, body, _ = _http(f"{server}/api/board")
        assert status == 200
        payload = json.loads(body)
        assert set(payload) >= {
            "generated_at",
            "capture_mode",
            "range",
            "options",
            "scope",
            "kpis",
            "attention",
            "agents",
            "by_model",
            "by_role",
            "series",
            "saved_usd",
            "projects",
            "prompts",
            "project_prompts",
            "skills",
            "tools",
            "confirms",
            "errors",
            "latency",
            "loops",
            "changes",
            "tests",
            "memory_files",
            "processes",
            "sources",
            "coverage",
            "self",
        }
        assert set(payload["agents"][0]) >= {
            "id",
            "short",
            "title",
            "parent_id",
            "role",
            "status",
            "tool",
            "project",
            "models",
            "msgs",
            "input",
            "output",
            "cache_read",
            "cache_write",
            "cached_share",
            "cost_usd",
            "tool_calls",
            "failures",
            "confirms_asked",
            "confirms_denied",
            "pending",
            "cpu_percent",
            "mem_mb",
            "pids",
            "started_at",
            "ended_at",
            "activity",
        }

    def test_gzip_and_etag(self, server):
        status, body, headers = _http(f"{server}/api/board", headers={"Accept-Encoding": "gzip"})
        assert status == 200
        assert headers["Content-Encoding"] == "gzip"
        json.loads(gzip.decompress(body))
        repeat, _, _ = _http(f"{server}/api/board", headers={"Accept-Encoding": "gzip", "If-None-Match": headers["ETag"]})
        assert repeat == 304

    def test_query_filters(self, server):
        _status, body, _ = _http(f"{server}/api/board?tool=codex-cli")
        assert [a["id"] for a in json.loads(body)["agents"]] == ["usage"]

    def test_bad_query_is_400(self, server):
        status, body, _ = _http(f"{server}/api/board?status=nope")
        assert status == 400
        assert "status" in json.loads(body)["error"]

    @pytest.mark.parametrize(
        ("path", "code"),
        [
            ("/api/board/agent?id=done", 200),
            ("/api/board/agent", 400),
            ("/api/board/agent?id=nobody", 404),
            ("/api/board/tool?name=Bash", 200),
            ("/api/board/error?key=api:rate_limit:429", 200),
            ("/api/board/file?path=/p/alpha/src/a.py", 200),
            ("/api/board/prompt", 400),
            ("/api/board/nothing", 404),
        ],
    )
    def test_detail_routes(self, server, path, code):
        assert _http(server + path)[0] == code

    def test_routes_answer_only_this_machine(self, server):
        for path in ("/api/board", "/api/board/agent?id=done"):
            assert _http(server + path, headers={"Host": "evil.example"})[0] == 403

    def test_action_without_confirm_is_refused(self, server):
        status, body, _ = _http(f"{server}/api/board/action", data=json.dumps({"action": "db-compact"}).encode())
        assert status == 400
        assert "confirm" in json.loads(body)["error"]

    def test_action_from_a_web_page_is_refused(self, server):
        status, _, _ = _http(
            f"{server}/api/board/action",
            data=json.dumps({"action": "db-compact", "confirm": True}).encode(),
            headers={"Origin": "https://evil.example"},
        )
        assert status == 403

    def test_action_addressed_to_another_name_is_refused(self, server):
        status, _, _ = _http(
            f"{server}/api/board/action",
            data=json.dumps({"action": "db-compact", "confirm": True}).encode(),
            headers={"Host": "evil.example"},
        )
        assert status == 403

    def test_action_bad_json(self, server):
        assert _http(f"{server}/api/board/action", data=b"not json")[0] == 400

    def test_no_store(self, tmp_path):
        status, body = board_api.handle_get("/api/board", "", None, None)
        assert status == 503
        assert "error" in json.loads(body)


class TestMemo:
    def test_same_key_and_version_reuse_the_answer(self, db, monkeypatch):
        board_api._MEMO._entries.clear()
        store = SimpleNamespace(version=1, snapshot=None)
        runs = []
        real = board_api.compute_board
        monkeypatch.setattr(board_api, "compute_board", lambda *a, **k: runs.append(1) or real(*a, **k))
        when = int(NOW / board_api.MEMO_TTL_S) * board_api.MEMO_TTL_S
        first = board_api.board_bytes(db, store, "", when)
        assert board_api.board_bytes(db, store, "", when + 1) == first
        assert len(runs) == 1
        board_api.board_bytes(db, store, "tool=claude-code", when + 1)
        assert len(runs) == 2

    def test_new_rows_refresh_at_once_and_merged_rows_within_the_ttl(self, db):
        board_api._MEMO._entries.clear()
        store = SimpleNamespace(version=1, snapshot=None)
        when = int(NOW / board_api.MEMO_TTL_S) * board_api.MEMO_TTL_S
        board_api.board_bytes(db, store, "", when)
        conn = db._conn()
        _request(conn, when - 5, "fresh", "claude-code", "/p/alpha", SONNET, i=5)
        conn.commit()
        assert b'"fresh"' in board_api.board_bytes(db, store, "", when)
        conn.execute("UPDATE requests SET input_tokens = 6 WHERE session_id = 'fresh'")
        conn.commit()
        payload = json.loads(board_api.board_bytes(db, store, "", when + board_api.MEMO_TTL_S))
        assert _agent(payload, "fresh")["input"] == 6

    def test_a_new_monitor_cycle_alone_does_not_recompute(self, db, monkeypatch):
        board_api._MEMO._entries.clear()
        store = SimpleNamespace(version=1, snapshot=None)
        when = int(NOW / board_api.MEMO_TTL_S) * board_api.MEMO_TTL_S
        first = board_api.board_bytes(db, store, "", when)
        store.version = 2
        monkeypatch.setattr(board_api, "compute_board", lambda *a, **k: pytest.fail("recomputed"))
        assert board_api.board_bytes(db, store, "", when + 1) == first

    def test_a_change_of_filter_reuses_the_read_of_the_window(self, db, monkeypatch):
        board_api._MEMO._entries.clear()
        board_api._BASE_MEMO._entries.clear()
        board_api._BASE_TIMES.clear()
        store = SimpleNamespace(version=1, snapshot=None)
        reads = []
        real = board_api._Board._load_cells
        monkeypatch.setattr(board_api._Board, "_load_cells", lambda self: reads.append(1) or real(self))
        when = int(NOW / board_api.MEMO_TTL_S) * board_api.MEMO_TTL_S
        everything = json.loads(board_api.board_bytes(db, store, "", when))
        one_tool = json.loads(board_api.board_bytes(db, store, "tool=codex-cli", when + 1))
        project = json.loads(board_api.board_bytes(db, store, "project=/p/beta", when + 2))
        assert len(reads) == 1
        assert [a["id"] for a in one_tool["agents"]] == ["usage"]
        assert project["kpis"]["tokens"] == 2200 + 20
        assert everything["kpis"]["tokens"] == 5845
        # Another time range reads again.
        board_api.board_bytes(db, store, f"since={NOW - DAY}", when + 3)
        assert len(reads) == 2
        fresh = compute_board(db, parse_filters("tool=codex-cli", NOW), None, NOW)
        assert one_tool["kpis"]["tokens"] == fresh["kpis"]["tokens"]
        assert one_tool["kpis"]["cost_usd"] == fresh["kpis"]["cost_usd"]

    def test_percentiles_of_a_large_set_use_a_sample_and_keep_thin_groups(self, db, monkeypatch):
        monkeypatch.setattr(board_api, "MAX_LATENCY_VALUES", 4)
        conn = db._conn()
        ts = NOW - 3 * DAY
        for k in range(100):
            _request(conn, ts + k, "wide", "claude-code", "/p/wide", SONNET, i=1, duration=float(k + 1))
        _request(conn, ts, "rare", "claude-code", "/p/rare", "claude-opus-4-5", i=1, duration=7777.0)
        conn.commit()
        payload = _board(db)
        row = next(r for r in payload["latency"] if r["what"] == "Model reply")
        # Count and maximum stay exact.
        assert row["count"] == 7 + 100 + 1
        assert row["max_ms"] == 7777.0
        rare = next(m for m in payload["by_model"] if m["model"] == "claude-opus-4-5")
        assert rare["p95_ms"] == 7777.0
        assert next(p for p in payload["projects"] if p["project"] == "/p/rare")["p95_ms"] == 7777.0

    def test_memo_stays_bounded(self):
        memo = board_api._Memo()
        for k in range(board_api.MEMO_MAX_KEYS * 3):
            memo.put((k,), b"x")
        assert len(memo._entries) == board_api.MEMO_MAX_KEYS


# ─── Budget ───────────────────────────────────────────────────────


def seed_budget_store(
    db: HistoryDB, now: float, rng: random.Random, sessions: int = 1000, requests: int = 100_000, days: int = 30
) -> dict:
    """Many sessions over some days, in tens of projects, with subagents and tool calls."""
    conn = db._conn()
    tools = ["claude-code", "copilot-cli", "copilot-vscode", "codex-cli"]
    models = [SONNET, HAIKU, GPT, "claude-opus-4-5"]
    names = ["Bash", "Read", "Edit", "Grep", "Write", "mcp__db__query", "Glob", "Task"]
    start = now - days * DAY
    per_session = requests // sessions
    request_rows = []
    call_rows = []
    prompt_rows = []
    session_rows = []
    agent_rows = []
    write_rows = []
    skill_rows = []
    for k in range(sessions):
        sid = f"00000000-0000-4000-8000-{k:012d}"
        tool = tools[k % len(tools)]
        project = f"/work/project-{k % 25}"
        begin = start + rng.random() * (days * DAY - 7200)
        session_rows.append((sid, tool, project, models[k % len(models)], begin, begin + 3600))
        subs = [f"{sid}-sub-{j}" for j in range(k % 4)]
        for agent in subs:
            agent_rows.append((agent, sid, tool, "Explore" if len(agent) % 2 else "Plan", 1, begin, begin + 60, 1))
        for r in range(per_session):
            ts = begin + r * 30 + rng.random()
            agent = subs[r % len(subs)] if subs and r % 3 == 0 else ""
            request_rows.append(
                (
                    ts,
                    sid,
                    agent,
                    tool,
                    project,
                    models[(k + r) % 2 if r % 7 else k % len(models)],
                    rng.randint(10, 3000),
                    rng.randint(10, 2000),
                    rng.randint(0, 50000),
                    rng.randint(0, 2000),
                    rng.random() * 8000,
                    rng.random() * 800,
                    1 if rng.random() < 0.005 else 0,
                    "t",
                )
            )
            if r % 2 == 0:
                name = names[r % len(names)]
                target = "pytest test/ -q" if r % 20 == 0 else f"src/mod_{r % 40}.py"
                call_rows.append(
                    (
                        ts + 1,
                        sid,
                        agent,
                        tool,
                        project,
                        "Bash" if r % 20 == 0 else name,
                        target,
                        1 if rng.random() < 0.02 else 0,
                        rng.random() * 2000,
                        "approved" if r % 10 == 0 else "",
                        rng.random() * 3000 if r % 10 == 0 else 0.0,
                        0 if r % 20 == 0 else None,
                        "failed with code 1",
                    )
                )
            if r % 12 == 0:
                prompt_rows.append((ts - 1, sid, "", tool, project, f"Work on task {r} in session {k}"))
            if r % 25 == 0:
                write_rows.append((ts + 2, sid, tool, "Edit", "edit", f"{project}/src/mod_{r % 40}.py", project, '{"lines_added":3,"lines_removed":1}'))
            if r % 50 == 0:
                skill_rows.append((ts + 3, sid, tool, project, f"skill-{r % 5}"))
    conn.executemany(
        "INSERT INTO sessions(session_id, tool, project_path, model, started_at, ended_at) VALUES (?,?,?,?,?,?)", session_rows
    )
    conn.executemany(
        "INSERT INTO agents(agent_id, session_id, tool, task, is_sidechain, started_at, ended_at, completed) VALUES (?,?,?,?,?,?,?,?)",
        agent_rows,
    )
    conn.executemany(
        "INSERT INTO requests(ts, session_id, agent_id, tool, project_path, model, input_tokens, output_tokens, cache_read_tokens,"
        " cache_creation_tokens, duration_ms, ttft_ms, is_error, source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        request_rows,
    )
    conn.executemany(
        "INSERT INTO tool_invocations(ts, session_id, agent_id, tool, project_path, tool_name, target, is_error, duration_ms,"
        " confirm, confirm_wait_ms, exit_code, result_summary) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        call_rows,
    )
    conn.executemany(
        "INSERT INTO session_prompts(ts, session_id, agent_id, tool, project_path, text) VALUES (?,?,?,?,?,?)", prompt_rows
    )
    conn.executemany(
        "INSERT INTO file_write_events(ts, session_id, tool, tool_name, operation, path, project_path, detail) VALUES (?,?,?,?,?,?,?,?)",
        write_rows,
    )
    conn.executemany("INSERT INTO skill_uses(ts, session_id, tool, project_path, name) VALUES (?,?,?,?,?)", skill_rows)
    snapshots = [
        (start + i * 600.0, 1000 + j, tools[j % len(tools)], rng.random() * 50, 100 + rng.random() * 500)
        for i in range(int(days * DAY / 600))
        for j in range(4)
    ]
    conn.executemany("INSERT INTO process_snapshots(ts, pid, tool, cpu_percent, memory_rss_mb) VALUES (?,?,?,?,?)", snapshots)
    conn.commit()
    return {
        "sessions": len(session_rows),
        "requests": len(request_rows),
        "tool_calls": len(call_rows),
        "prompts": len(prompt_rows),
        "subagents": len(agent_rows),
        "process_rows": len(snapshots),
    }


class TestBudget:
    def test_a_full_range_is_not_cut_short(self, db):
        """The longest range the board offers today does not limit what the API answers."""
        rng = compute_board(db, Filters(since=NOW - 30 * DAY, until=NOW), None, NOW)["range"]
        assert rng["since"] == pytest.approx(NOW - 30 * DAY)

    def test_big_store_stays_within_a_generous_budget(self, tmp_path):
        store = HistoryDB(db_path=str(tmp_path / "big.db"), flush_interval=0)
        now = time.time()
        counts = seed_budget_store(store, now, random.Random(7), days=7)
        assert counts["sessions"] == 1000
        assert counts["requests"] >= 100_000
        filters = Filters(since=now - 7 * DAY, until=now)
        compute_board(store, filters, None, now)  # warm the page cache and the store facts
        best = float("inf")
        for _ in range(3):
            started = time.perf_counter()
            payload = compute_board(store, filters, None, now)
            best = min(best, time.perf_counter() - started)
        body = gzip.compress(json.dumps(payload).encode("utf-8"), 5)
        # The product budget is 200 ms and 200 KB. This limit tolerates a slow machine.
        assert best < 1.5
        assert len(body) < 200 * 1024
        assert payload["kpis"]["tokens"] > 0
        assert len(payload["agents"]) == 200
        assert payload["kpis"]["tokens"] == sum(m["tokens"] for m in payload["by_model"])
        store.close()


@pytest.mark.parametrize(
    ("path", "root"),
    [
        ("/p/repo/.claude/worktrees/agent-1", "/p/repo"),
        ("/p/repo/.claude/worktrees/agent-1/", "/p/repo"),
        ("C:\\p\\repo\\.claude\\worktrees\\agent-1", "C:\\p\\repo"),
        ("/p/repo/.worktrees/x", "/p/repo"),
        ("/p/repo", "/p/repo"),
        ("/p/worktrees/x", "/p/worktrees/x"),
        ("", ""),
    ],
)
def test_project_root(path, root):
    from aictl.ingesters._common import project_root

    assert project_root(path) == root


class TestSkillDetail:
    def _project_skill(self, tmp_path, name="checker", text="---\nname: checker\ndescription: Checks a change\n---\napi_key = abc123secretvalue\nBody text\n"):
        folder = tmp_path / "proj" / ".github" / "skills" / name
        folder.mkdir(parents=True)
        (folder / "SKILL.md").write_text(text)
        return tmp_path / "proj"

    def _use(self, db, project, name="checker", ts=1000.0):
        conn = db._conn()
        conn.execute(
            "INSERT INTO skill_uses(ts, session_id, tool, project_path, name, trigger) VALUES (?,?,?,?,?,?)",
            (ts, "s1", "copilot-cli", str(project), name, "agent-invoked"),
        )
        conn.commit()

    def test_shows_scope_usage_and_masked_text(self, db, tmp_path, monkeypatch):
        monkeypatch.setenv("HOME", str(tmp_path / "home"))
        monkeypatch.setenv("USERPROFILE", str(tmp_path / "home"))
        project = self._project_skill(tmp_path)
        self._use(db, project)
        status, payload = board_api.skill_detail(db, "checker", now=2000.0)
        assert status == 200
        assert payload["uses"] == 1 and payload["total_uses"] == 1
        assert payload["calls"][0]["trigger"] == "agent-invoked"
        place = payload["locations"][0]
        assert place["scope"] == "project"
        assert "copilot-vscode" in place["tools"]
        assert place["description"] == "Checks a change"
        assert "Body text" in place["content"]
        assert "abc123secretvalue" not in place["content"]
        assert str(project) in place["reach"]

    def test_the_time_range_limits_uses_but_not_the_total(self, db, tmp_path, monkeypatch):
        monkeypatch.setenv("HOME", str(tmp_path / "home"))
        self._use(db, tmp_path, ts=1000.0)
        status, payload = board_api.skill_detail(db, "checker", now=2000.0, since=1500.0, until=2000.0)
        assert status == 200
        assert (payload["uses"], payload["total_uses"], payload["calls"]) == (0, 1, [])

    def test_a_skill_with_no_file_still_reports_its_uses(self, db, tmp_path, monkeypatch):
        monkeypatch.setenv("HOME", str(tmp_path / "home"))
        self._use(db, tmp_path, name="gone")
        _status, payload = board_api.skill_detail(db, "gone", now=2000.0)
        assert payload["locations"] == [] and payload["uses"] == 1

    @pytest.mark.parametrize("name", ["../../etc/passwd", "..", "a/b", "a\\b", "plugin:../x"])
    def test_a_name_cannot_leave_the_skill_folders(self, name):
        assert board_api.skill_locations(name, ["/tmp"]) == []


class TestFileExcerpt:
    def _found(self, monkeypatch, *paths):
        from aictl.context_audit import _path_key
        from aictl.dashboard.audit_cache import AUDIT_CACHE

        monkeypatch.setattr(AUDIT_CACHE, "source_paths", lambda: {_path_key(p) for p in paths})

    def test_a_file_from_a_scan_shows_masked_lines_around_the_line(self, tmp_path, monkeypatch):
        path = tmp_path / "settings.json"
        path.write_text('{\n"a": 1,\n"b": 2,\n"token": "ghp_abcdefghijklmnopqrstuvwxyz123456",\n"model": "x",\n"c": 3,\n"d": 4,\n"e": 5,\n"f": 6\n}\n')
        self._found(monkeypatch, path)
        status, payload = board_api.file_excerpt(str(path), 5)
        assert status == 200
        assert [row["n"] for row in payload["lines"]] == [2, 3, 4, 5, 6, 7, 8]
        assert 'ghp_abcdefghijklmnopqrstuvwxyz123456' not in json.dumps(payload)

    def test_a_file_no_scan_found_is_refused(self, tmp_path, monkeypatch):
        path = tmp_path / "secret.md"
        path.write_text("x")
        self._found(monkeypatch)
        assert board_api.file_excerpt(str(path), 1)[0] == 403

    @pytest.mark.parametrize("name", ["data.db", "state.vscdb", "key.pem", "noext"])
    def test_a_database_or_other_file_is_refused_even_if_found(self, tmp_path, monkeypatch, name):
        path = tmp_path / name
        path.write_text("x")
        self._found(monkeypatch, path)
        assert board_api.file_excerpt(str(path), 1)[0] == 403


@pytest.mark.parametrize(
    ("front", "expected"),
    [
        ("", "You and the model"),
        ("disable-model-invocation: true\n", "Only you"),
        ("user-invocable: false\n", "Only the model"),
        ("user-invocable: false\ndisable-model-invocation: true\n", "Nobody"),
    ],
)
def test_who_can_start_a_skill(front, expected):
    assert board_api._skill_starter(f"---\nname: x\n{front}---\nBody\n").startswith(expected)


def test_a_slow_board_refreshes_less_often(db, monkeypatch):
    """A 3.5 s range refreshed every 10 s while the page polled: a third of one core."""
    refreshes = []
    monkeypatch.setattr(board_api, "_refresh_behind", lambda *a: refreshes.append(a))
    query = "since=1000&until=2000&buckets=10"
    filters = board_api.parse_filters(query, 5000.0)
    board_api.board_bytes(db, None, query, 5000.0, background=True)
    key = (str(db._path), filters)
    board_api._COMPUTE_TOOK[key] = 2.0
    board_api._COMPUTED_AT[key] = 5000.0
    monkeypatch.setattr(board_api, "_store_version", lambda *_a: ("changed",))
    board_api.board_bytes(db, None, query, 5015.0, background=True)
    assert refreshes == []
    board_api.board_bytes(db, None, query, 5021.0, background=True)
    assert len(refreshes) == 1


class TestLoopInputs:
    def test_failures_with_different_inputs_and_no_target_are_not_a_loop(self):
        calls = [board_api._Call(float(i), "start_session", "", 1, None, f'{{"n": {i}}}') for i in range(8)]
        assert board_api.find_loops(calls) == []

    def test_the_same_failing_input_is_a_loop(self):
        calls = [board_api._Call(float(i), "start_session", "", 1, None, '{"n": 1}') for i in range(4)]
        assert board_api.find_loops(calls)[0]["repeats"] == 4


def test_the_tool_drawer_keeps_to_the_time_range(db):
    conn = db._conn()
    conn.executemany(
        "INSERT INTO tool_invocations(ts, session_id, tool, tool_name, dedup_key) VALUES(?,?,?,?,?)",
        [(100.0 + i, "w", "copilot-cli", "windowed", f"w{i}") for i in range(5)],
    )
    conn.commit()
    _status, inside = board_api.tool_detail(db, "windowed", 1000.0, 100.0, 103.0)
    assert inside["total"] == 3 and len(inside["calls"]) == 3
    assert board_api.tool_detail(db, "windowed", 1000.0, 500.0, 600.0)[1]["total"] == 0


def test_cost_uses_the_stored_per_call_figure(db):
    """Repricing the summed tokens lost the cache tier: Claude read $765 against $821."""
    conn = db._conn()
    conn.execute(
        "INSERT INTO requests(ts, session_id, tool, dedup_key, model, input_tokens, cache_creation_tokens, cost_usd) VALUES(?,?,?,?,?,?,?,?)",
        (1500.0, "priced", "claude-code", "priced1", "claude-opus-5-5", 10, 1000, 7.5),
    )
    conn.commit()
    payload = board_api.compute_board(db, board_api.parse_filters("since=1000&until=2000&buckets=10&tool=claude-code", 2500.0), None, 2500.0)
    assert payload["kpis"]["cost_usd"] == 7.5
    assert board_api.agent_detail(db, "priced", None, 2500.0)[1]["by_model"][0]["cost_usd"] == 7.5


class TestProjectRoot:
    def setup_method(self):
        from aictl.ingesters import _common

        _common._git_root.cache_clear()

    def test_a_subfolder_belongs_to_its_repository(self, tmp_path, monkeypatch):
        from aictl.ingesters._common import project_root

        monkeypatch.setenv("HOME", str(tmp_path / "home"))
        (tmp_path / "repo" / ".git").mkdir(parents=True)
        (tmp_path / "repo" / "src" / "ui").mkdir(parents=True)
        assert project_root(str(tmp_path / "repo" / "src" / "ui")) == str(tmp_path / "repo")

    def test_a_linked_worktree_belongs_to_its_repository(self, tmp_path, monkeypatch):
        from aictl.ingesters._common import project_root

        monkeypatch.setenv("HOME", str(tmp_path / "home"))
        (tmp_path / "wt").mkdir()
        (tmp_path / "wt" / ".git").write_text(f"gitdir: {tmp_path}/repo/.git/worktrees/wt\n")
        assert project_root(str(tmp_path / "wt")) == f"{tmp_path}/repo"

    def test_a_repository_at_home_does_not_swallow_every_project(self, tmp_path, monkeypatch):
        from aictl.ingesters._common import project_root

        home = tmp_path / "home"
        monkeypatch.setenv("HOME", str(home))
        (home / ".git").mkdir(parents=True)
        (home / "work").mkdir()
        assert project_root(str(home / "work")) == str(home / "work")

    def test_a_folder_that_is_gone_stays_as_it_was(self):
        from aictl.ingesters._common import project_root

        assert project_root("/gone/proj/.claude/worktrees/x") == "/gone/proj"


class TestAgentSkillsAndContext:
    def _seed(self, db):
        conn = db._conn()
        for i, size in enumerate((1000, 5000, 9000, 2000)):
            conn.execute(
                "INSERT INTO requests(ts, session_id, tool, dedup_key, model, input_tokens, cache_read_tokens) VALUES(?,?,?,?,?,?,?)",
                (1000.0 + i, "ctx", "copilot-cli", f"c{i}", "m", 10, size - 10),
            )
        conn.execute(
            "INSERT INTO requests(ts, session_id, agent_id, tool, dedup_key, model, input_tokens) VALUES(?,?,?,?,?,?,?)",
            (1001.5, "ctx", "kid", "copilot-cli", "k1", "m", 77777),
        )
        conn.executemany(
            "INSERT INTO skill_uses(dedup_key, ts, session_id, agent_id, tool, project_path, name, trigger) VALUES(?,?,?,?,?,?,?,?)",
            [("s1", 1000.0, "ctx", "", "copilot-cli", "/p", "alpha", "user"), ("s2", 1001.0, "ctx", "kid", "copilot-cli", "/p", "alpha", "agent-invoked"), ("s3", 1002.0, "ctx", "kid", "copilot-cli", "/p", "beta", "agent-invoked")],
        )
        conn.commit()

    def test_a_main_agent_lists_its_and_its_subagents_skills(self, db):
        self._seed(db)
        assert {s["name"]: s["uses"] for s in board_api._agent_skills(db._conn(), "ctx", "ctx", True)} == {"alpha": 2, "beta": 1}

    def test_a_subagent_lists_only_its_own_skills(self, db):
        self._seed(db)
        assert {s["name"]: s["uses"] for s in board_api._agent_skills(db._conn(), "ctx", "kid", False)} == {"alpha": 1, "beta": 1}

    def test_context_is_per_call_and_leaves_out_subagents(self, db):
        self._seed(db)
        ctx = board_api._agent_context(db._conn(), "ctx", "ctx", True)
        assert (ctx["first"], ctx["last"], ctx["peak"], ctx["calls"], ctx["drops"]) == (1000, 2000, 9000, 4, 1)

    def test_skill_agents_count_subagents_not_sessions(self, db):
        self._seed(db)
        conn = db._conn()
        skill = board_api.skill_detail(db, "alpha", 2000.0)[1]
        assert skill["agents"] == 2 and conn is not None

    def test_a_plugin_skill_is_found_by_its_short_name(self, db):
        conn = db._conn()
        conn.execute("INSERT INTO skill_uses(dedup_key, ts, session_id, tool, name) VALUES('p', 1.0, 's', 'claude-code', 'plug:deep')")
        conn.commit()
        assert board_api.skill_detail(db, "deep", 2.0)[1]["uses"] == 1


class TestAgentStatus:
    def _session_with(self, db, reason, age):
        conn = db._conn()
        _session(conn, "s", "claude-code", "/p/idle", NOW - 3000)
        _request(conn, NOW - age, "s", "claude-code", "/p/idle", SONNET, i=1, finish_reason=reason)
        conn.commit()

    def test_a_finished_turn_is_idle_after_a_quiet_time(self, db):
        self._session_with(db, "end_turn", 300)
        assert _agent(_board(db), "s")["status"] == "idle"

    def test_a_finished_turn_just_now_is_still_running(self, db):
        self._session_with(db, "end_turn", 30)
        assert _agent(_board(db), "s")["status"] == "running"

    def test_a_turn_that_called_a_tool_is_running(self, db):
        self._session_with(db, "tool_use", 300)
        assert _agent(_board(db), "s")["status"] == "running"

    def test_an_idle_session_with_no_process_ends_after_the_active_window(self, db):
        self._session_with(db, "end_turn", board_api.ACTIVE_WINDOW_S + 60)
        assert _agent(_board(db), "s")["status"] == "ended"

    def test_idle_is_a_live_row_but_not_a_running_one(self, db):
        self._session_with(db, "end_turn", 300)
        payload = _board(db, project="/p/idle")
        assert payload["kpis"]["running"] == 0
        assert payload["kpis"]["idle"] == 1
        assert _agent(payload, "s")["ended_at"] is None


class TestProcessOwnership:
    def _two_sessions(self, db):
        conn = db._conn()
        for sid, ts in (("older", NOW - 200), ("newer", NOW - 100)):
            _session(conn, sid, "aider", "/p/two", NOW - 3000)
            _request(conn, ts, sid, "aider", "/p/two", SONNET, i=1)
        conn.commit()

    def test_each_session_takes_one_process_of_its_project(self, db):
        self._two_sessions(db)
        snapshot = SimpleNamespace(
            sessions=[_live("aider:1:1", "aider", "/p/two", [1], 2500.0), _live("aider:2:1", "aider", "/p/two", [2], 2000.0)],
            tools=[],
        )
        payload = _board(db, snapshot=snapshot)
        # The process that started last belongs to the session that started last.
        assert _agent(payload, "newer")["pids"] == [2]
        assert _agent(payload, "older")["pids"] == [1]

    def test_more_processes_than_sessions_stay_on_the_newest(self, db):
        self._two_sessions(db)
        snapshot = SimpleNamespace(
            sessions=[_live(f"aider:{p}:1", "aider", "/p/two", [p], 2500.0 - p) for p in (1, 2, 3)],
            tools=[],
        )
        payload = _board(db, snapshot=snapshot)
        got = sorted(_agent(payload, "newer")["pids"] + _agent(payload, "older")["pids"])
        assert got == [1, 2, 3]

    def test_an_mcp_server_process_does_not_make_a_session_live(self, db):
        self._two_sessions(db)
        snapshot = SimpleNamespace(
            sessions=[_live("aider:1:1", "aider", "/p/two", [1], 2500.0), _live("aider:2:1", "aider", "/p/two", [2], 2400.0)],
            tools=[SimpleNamespace(tool="aider", meta=False, processes=[_proc(1, kind="cli"), _proc(2, kind="child")])],
        )
        payload = _board(db, snapshot=snapshot, project="/p/two")
        assert _agent(payload, "newer")["pids"] == [1]
        assert _agent(payload, "older")["pids"] == []
        assert not [a for a in payload["agents"] if a["id"].startswith("live:")]

    def test_a_process_is_as_old_as_the_operating_system_says(self, monkeypatch):
        monkeypatch.setattr(board_api, "_process_start", lambda pid: 500.0)
        assert board_api._earlier_start(900.0, 7) == 500.0
        monkeypatch.setattr(board_api, "_process_start", lambda pid: 0.0)
        assert board_api._earlier_start(900.0, 7) == 900.0

    def test_no_row_for_a_process_in_the_home_folder(self, db):
        snapshot = SimpleNamespace(sessions=[_live("codex-cli:4:1", "codex-cli", str(Path.home()), [4])], tools=[])
        assert not [a for a in _board(db, snapshot=snapshot)["agents"] if a["id"].startswith("live:")]

    def test_no_row_for_a_process_the_tool_does_not_list(self, db):
        snapshot = SimpleNamespace(
            sessions=[_live("codex-cli:4:1", "codex-cli", "/p/shell", [4])],
            tools=[SimpleNamespace(tool="codex-cli", meta=False, processes=[_proc(5)])],
        )
        assert not [a for a in _board(db, snapshot=snapshot)["agents"] if a["id"].startswith("live:")]


class TestStopTargets:
    def test_a_session_gives_its_processes(self, db):
        conn = db._conn()
        _session(conn, "s", "aider", "/p/stop", NOW - 3000)
        _request(conn, NOW - 100, "s", "aider", "/p/stop", SONNET, i=1)
        conn.commit()
        snapshot = SimpleNamespace(sessions=[_live("aider:8:1", "aider", "/p/stop", [8, 9], 2000.0)], tools=[])
        assert board_api.live_pids_of(db, snapshot, "s", NOW) == [8, 9]

    def test_a_placeholder_row_gives_its_processes(self, db):
        snapshot = SimpleNamespace(sessions=[_live("codex-cli:4:1", "codex-cli", "/p/only", [4])], tools=[])
        assert board_api.live_pids_of(db, snapshot, "live:codex-cli:/p/only", NOW) == [4]

    def test_an_ended_session_gives_none(self, db):
        conn = db._conn()
        _session(conn, "gone", "aider", "/p/stop", NOW - 3000)
        _request(conn, NOW - 100, "gone", "aider", "/p/stop", SONNET, i=1)
        conn.commit()
        assert board_api.live_pids_of(db, SimpleNamespace(sessions=[], tools=[]), "gone", NOW) == []


class TestPipedTests:
    def test_a_pass_behind_a_pipe_is_counted_as_unsure(self, db):
        conn = db._conn()
        _session(conn, "t", "aider", "/p/t", NOW - 3000)
        _request(conn, NOW - 100, "t", "aider", "/p/t", SONNET, i=1)
        _call(conn, NOW - 90, "t", "aider", "/p/t", "Bash", "pytest -q | tail -5")
        _call(conn, NOW - 80, "t", "aider", "/p/t", "Bash", "set -o pipefail; pytest -q | tail -5")
        _call(conn, NOW - 70, "t", "aider", "/p/t", "Bash", "pytest -q")
        conn.commit()
        assert _board(db)["tests_piped"] == 1


class TestPrimaryModel:
    def test_the_model_with_the_most_tokens_is_primary(self, db):
        conn = db._conn()
        _session(conn, "m", "aider", "/p/m", NOW - 3000)
        _request(conn, NOW - 200, "m", "aider", "/p/m", "a-small", i=10)
        _request(conn, NOW - 100, "m", "aider", "/p/m", "z-large", i=1000)
        _request(conn, NOW - 90, "m", "aider", "/p/m", "", i=5000)
        conn.commit()
        row = _agent(_board(db), "m")
        assert row["primary_model"] == "z-large"


class TestAgentToolTotals:
    def test_totals_count_every_call_past_the_row_cap(self, db):
        conn = db._conn()
        _session(conn, "tt", "aider", "/p/tt", NOW - 3000)
        _request(conn, NOW - 2900, "tt", "aider", "/p/tt", SONNET, i=1)
        extra = board_api.MAX_DETAIL_ROWS + 5
        for k in range(extra):
            _call(conn, NOW - 2000 + k, "tt", "aider", "/p/tt", "Bash", f"echo {k}", duration=10.0)
        _call(conn, NOW - 100, "tt", "aider", "/p/tt", "Read", "a.py", is_error=1)
        conn.commit()
        detail = agent_detail(db, "tt", None, NOW)[1]
        assert len(detail["tool_calls"]) == board_api.MAX_DETAIL_ROWS
        assert detail["tool_totals"][0] == {"name": "Bash", "calls": extra, "failed": 0, "total_ms": extra * 10.0}
        assert detail["tool_totals"][1]["failed"] == 1


class TestPromptFilesSearch:
    """Prompt files are looked for in the project, its parents up to the repository, the settings and the user folders."""

    @pytest.fixture()
    def home(self, tmp_path, monkeypatch):
        monkeypatch.setenv("HOME", str(tmp_path / "home"))
        monkeypatch.setenv("USERPROFILE", str(tmp_path / "home"))
        (tmp_path / "home").mkdir()
        return tmp_path / "home"

    def _files(self, db, project):
        return {r["file"]: r for r in _board(db)["project_prompts"] if r["project"] in (str(project), "")}

    def _seed_project(self, db, project):
        conn = db._conn()
        _request(conn, NOW - DAY, "pp", "copilot-vscode", str(project), SONNET, i=1)
        _prompt(conn, NOW - DAY, "pp", "copilot-vscode", str(project), text="x")
        conn.commit()

    def test_parent_folders_up_to_the_repository_and_nested_files(self, db, tmp_path, home):
        repo = tmp_path / "repo"
        project = repo / "packages" / "app"
        project.mkdir(parents=True)
        (repo / ".git").mkdir()
        (repo / ".github" / "prompts" / "team").mkdir(parents=True)
        (repo / ".github" / "prompts" / "team" / "deep.prompt.md").write_text("x")
        (repo / ".github" / "prompts" / "top.prompt.md").write_text("x")
        (project / ".claude" / "commands" / "sub").mkdir(parents=True)
        (project / ".claude" / "commands" / "sub" / "run.md").write_text("x")
        files, _searched = board_api._prompt_files_on_disk([str(project)])
        assert {(p, Path(f).name) for p, f in files} >= {(str(project), "deep.prompt.md"), (str(project), "top.prompt.md"), (str(project), "run.md")}

    def test_no_parent_folder_above_the_repository_is_searched(self, db, tmp_path, home):
        (tmp_path / "outer" / ".github" / "prompts").mkdir(parents=True)
        (tmp_path / "outer" / ".github" / "prompts" / "outer.prompt.md").write_text("x")
        project = tmp_path / "outer" / "inner"
        (project / ".git").mkdir(parents=True)
        files, _searched = board_api._prompt_files_on_disk([str(project)])
        assert "outer.prompt.md" not in {Path(f).name for _p, f in files}

    def test_skill_files_are_not_prompt_files(self, db, tmp_path, home):
        project = tmp_path / "proj"
        (project / ".claude" / "commands" / "pack").mkdir(parents=True)
        (project / ".claude" / "commands" / "pack" / "SKILL.md").write_text("x")
        (project / ".claude" / "commands" / "real.md").write_text("x")
        self._seed_project(db, project)
        assert {Path(f).name for f in self._files(db, project)} == {"real.md"}

    def test_user_folders_and_the_setting_are_searched(self, db, tmp_path, home):
        from aictl.platforms import vscode_user_dir

        project = tmp_path / "proj"
        (project / ".vscode").mkdir(parents=True)
        (project / "extra-prompts").mkdir()
        (project / "extra-prompts" / "custom.prompt.md").write_text("x")
        (project / ".vscode" / "settings.json").write_text('{\n // comment\n "chat.promptFilesLocations": {"extra-prompts": true, "off-prompts": false},\n}')
        (home / ".claude" / "commands").mkdir(parents=True)
        (home / ".claude" / "commands" / "mine.md").write_text("x")
        (vscode_user_dir() / "prompts").mkdir(parents=True)
        (vscode_user_dir() / "prompts" / "user.prompt.md").write_text("x")
        self._seed_project(db, project)
        names = {Path(f).name for f in self._files(db, project)}
        assert {"custom.prompt.md", "mine.md", "user.prompt.md"} <= names

    def test_a_used_prompt_file_keeps_its_uses(self, db, tmp_path, home):
        project = tmp_path / "proj"
        (project / ".github" / "prompts").mkdir(parents=True)
        (project / ".github" / "prompts" / "used.prompt.md").write_text("x")
        conn = db._conn()
        _request(conn, NOW - DAY, "pu", "copilot-vscode", str(project), SONNET, i=1)
        _prompt(conn, NOW - DAY, "pu", "copilot-vscode", str(project), text="x", prompt_file="used.prompt.md")
        conn.commit()
        assert self._files(db, project)[".github/prompts/used.prompt.md"]["uses"] == 1

    def test_a_skill_started_from_a_prompt_is_not_listed_as_a_prompt_file(self, db, tmp_path, home):
        project = tmp_path / "proj"
        project.mkdir()
        conn = db._conn()
        _request(conn, NOW - DAY, "sk", "claude-code", str(project), SONNET, i=1)
        skill = str(project / ".claude" / "skills" / "review" / "SKILL.md")
        _prompt(conn, NOW - DAY, "sk", "claude-code", str(project), text="/review", prompt_file=skill)
        conn.commit()
        assert not [r for r in _board(db)["project_prompts"] if r["file"].endswith("SKILL.md")]

    def test_the_payload_names_the_folders_it_searched(self, db, tmp_path, home):
        project = tmp_path / "bare"
        project.mkdir()
        self._seed_project(db, project)
        searched = _board(db)["project_prompts_searched"]
        assert str(project / ".github" / "prompts") in searched
        assert str(project / ".claude" / "commands") in searched
        assert "~/.claude/commands" in searched


class TestSkillFileReads:
    def _seed(self, db, tmp_path):
        folder = tmp_path / "proj" / ".claude" / "skills" / "checker"
        folder.mkdir(parents=True)
        path = folder / "SKILL.md"
        path.write_text("---\nname: checker\n---\nbody\n")
        conn = db._conn()
        for ts in (100.0, 500.0):
            _prompt(conn, ts, "s1", "claude-code", "/p", text="go")
        _insert(conn, "skill_uses", ts=110.0, session_id="s1", tool="claude-code", project_path="/p", name="checker", trigger="agent-invoked")
        # Turn one started the skill and also read its file. Turn two only read the file.
        _call(conn, 120.0, "s1", "claude-code", "/p", "Read", str(path))
        _call(conn, 520.0, "s1", "claude-code", "/p", "Read", str(path))
        _call(conn, 530.0, "s1", "claude-code", "/p", "Read", str(folder / "other.md"))
        _call(conn, 540.0, "s1", "claude-code", "/p", "Bash", f"cat {path}")
        conn.commit()

    def test_a_read_is_counted_apart_from_the_uses(self, db, tmp_path, monkeypatch):
        monkeypatch.setenv("HOME", str(tmp_path / "home"))
        self._seed(db, tmp_path)
        _status, payload = board_api.skill_detail(db, "checker", now=1000.0)
        assert payload["uses"] == 1
        assert payload["file_reads"] == 1
        assert [r["ts"] for r in payload["reads"]] == [520.0]

    def test_the_time_range_limits_reads(self, db, tmp_path, monkeypatch):
        monkeypatch.setenv("HOME", str(tmp_path / "home"))
        self._seed(db, tmp_path)
        _status, payload = board_api.skill_detail(db, "checker", now=1000.0, since=0.0, until=300.0)
        assert payload["file_reads"] == 0 and payload["uses"] == 1

    def test_a_plugin_skill_name_finds_the_file_read(self, db, tmp_path, monkeypatch):
        monkeypatch.setenv("HOME", str(tmp_path / "home"))
        self._seed(db, tmp_path)
        _status, payload = board_api.skill_detail(db, "plug:checker", now=1000.0)
        assert payload["file_reads"] == 2  # no use is stored under this name, so no read is the start of one


class TestCoverageLimits:
    def test_the_cloud_tool_has_no_process_to_measure(self):
        rows = coverage_rows({}, ["copilot365"])
        for key in ("cpu", "ram"):
            assert next(r for r in rows if r["key"] == key)["cells"]["copilot365"]["state"] == "Not reported"

    def test_a_note_says_how_far_back_the_files_are_read(self, db):
        notes = _board(db)["coverage"]["notes"]
        vscode = next(n for n in notes if n["tool"] == "copilot-vscode")
        assert "older than 30 days" in vscode["text"]


class TestSubagentsInTheWindow:
    def _session_with_subagents(self, db):
        conn = db._conn()
        _session(conn, "long", "aider", "/p/long", NOW - 10 * DAY)
        _request(conn, NOW - 100, "long", "aider", "/p/long", SONNET, i=1)
        for aid, start, end in (("old-sub", NOW - 9 * DAY, NOW - 9 * DAY + 60), ("new-sub", NOW - 200, NOW - 100)):
            _insert(conn, "agents", agent_id=aid, session_id="long", tool="aider", task=aid, started_at=start, ended_at=end, completed=1)
        conn.commit()

    def test_a_subagent_that_ended_before_the_window_has_no_row(self, db):
        self._session_with_subagents(db)
        ids = [a["id"] for a in _board(db)["agents"]]
        assert "new-sub" in ids
        assert "old-sub" not in ids

    def test_the_agent_detail_still_lists_every_subagent(self, db):
        self._session_with_subagents(db)
        subs = [s["id"] for s in agent_detail(db, "long", None, NOW)[1]["subagents"]]
        assert sorted(subs) == ["new-sub", "old-sub"]


class TestActiveNowFilter:
    def test_an_idle_session_is_active_now(self, db):
        conn = db._conn()
        _session(conn, "i", "aider", "/p/i", NOW - 3000)
        _request(conn, NOW - 300, "i", "aider", "/p/i", SONNET, i=1, finish_reason="end_turn")
        conn.commit()
        assert "i" in [a["id"] for a in _board(db, status="active")["agents"]]


def test_sources_name_the_folders_found_for_each_tool(monkeypatch):
    from aictl import tool_homes

    monkeypatch.setattr(tool_homes, "homes", lambda tool=None: [tool_homes.ToolHome("copilot", Path("/x/home"), "process environment")])
    rows = board_api._sources([("copilot-cli", "events", 1.0)], ["copilot-cli"], None)
    assert rows[0]["locations"] == [{"path": "/x/home", "found_by": "process environment"}]
