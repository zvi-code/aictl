"""The Kusto report: the section registry, the page built from synthetic results, the queries, and the command.

The page tests build the page from small results made here; no real data is committed.
Rendering runs the page's script in jsdom (the dashboard UI's dev dependency) and is
skipped where node or jsdom is missing. The emulator test is skipped when nothing
answers on http://localhost:8080.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl.kusto import KustoSettings
from aictl.kusto import report as R
from aictl.kusto.report import (
    SECTIONS,
    ReportFilter,
    SectionResult,
    build_page,
    filter_prelude,
    parameterized,
    read_query,
    read_template,
)

REPO = Path(__file__).resolve().parents[1]
JSDOM = REPO / "src" / "aictl" / "dashboard" / "ui" / "node_modules" / "jsdom"
HOURS = 48
T0 = 1_700_000_000.0


def hour(i: int) -> str:
    return datetime.fromtimestamp(1_700_006_400 + i * 3600, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def synthetic() -> dict[str, list[list[dict]]]:
    dna = "BRRBEBbbbBRAMMOW"
    sessions = [
        {"session_id": "aaaaaaaa", "calls": 16, "errors": 3, "longest_error_streak": 3, "deepest_fix_loop": 0,
         "t_start": T0, "t_end": T0 + 900, "tool": "tool-a", "dna": dna},
        {"session_id": "bbbbbbbb", "calls": 12, "errors": 0, "longest_error_streak": 0, "deepest_fix_loop": 0,
         "t_start": T0, "t_end": T0 + 600, "tool": "tool-b", "dna": "OROROROROROR"},
    ]
    edge = lambda actor, file, op, n, t: {"session": "aaaaaaaa", "actor": actor, "file": file, "op": op, "n": n, "t_first": T0 + t, "t_last": T0 + t}  # noqa: E731
    relay = [
        [{"session": "aaaaaaaa", "chains": 1, "agents": 1}],
        [{"kind_of": "handoff", "tool": "tool-a", "pairs": 3, "files": 2}, {"kind_of": "collision", "tool": "tool-a", "pairs": 1, "files": 1}],
        [{"work_item": 1, "actors": 4, "files": 2}, {"work_item": 2, "actors": 2, "files": 1}],
        [{"a1": "main:aaaaaa", "a2": "agent:bbbbbb", "a3": "agent:cccccc", "f1": "one.md", "f2": "two.md",
          "w1_t": T0, "r1_t": T0 + 120, "w2_t": T0 + 180, "r2_t": T0 + 400}],
        [{"file": "one.md", "writers": 1, "readers": 1, "pairs": 1}, {"file": "two.md", "writers": 1, "readers": 1, "pairs": 1}],
        [edge("main:aaaaaa", "one.md", "write", 1, 0), edge("agent:bbbbbb", "one.md", "read", 1, 120),
         edge("agent:bbbbbb", "two.md", "write", 1, 180), edge("agent:cccccc", "two.md", "read", 1, 400)],
    ]
    cost = [
        [{"tool": "tool-a", "t": hour(i), "cost": 50.0 if i == 30 else 1.0, "baseline": 1.0, "score": 9.0 if i == 30 else 0.1,
          "flag": 1 if i == 30 else 0, "reqs": 10, "out_tokens": 1000} for i in range(HOURS)],
        [{"tool": "tool-a", "t": hour(30), "cost": 50.0, "session_id": "aaaaaaaa", "model": "model-x", "session_cost": 40.0,
          "session_reqs": 77, "share": 0.8}],
        [{"tool": "tool-a", "period_hours": 24.0, "score": 0.7}],
    ]
    slow = [
        [{"SegmentId": 0, "CountA": 1, "CountB": 8, "PercentA": 1.0, "PercentB": 80.0, "PercentDiffAB": 79.0, "tool": "", "model": "",
          "out_size": "out>4k", "cache": "", "fresh": "", "agent": "", "finish_reason": ""},
         {"SegmentId": 1, "CountA": 40, "CountB": 0, "PercentA": 40.0, "PercentB": 0.0, "PercentDiffAB": 40.0, "tool": "", "model": "",
          "out_size": "out<200", "cache": "", "fresh": "", "agent": "", "finish_reason": ""}],
        [{"total": 110, "p95_ms": 30000.0, "slow": 10, "rest": 100, "min_ms": 100.0, "median_ms": 2000.0}],
    ]
    points = [{"session_id": "aaaaaaaa", "pos": p, "ts": T0 + p * 60.0, "ctx": 100_000 + p * 5000 if p <= 20 else 60_000 + (p - 20) * 5000,
               "seg": 0 if p <= 20 else 1} for p in range(1, 31)]
    context = [
        points,
        [{"session_id": "aaaaaaaa", "seg": 0, "n": 20, "start_ctx": 105000, "peak_ctx": 200000, "t_start": T0 + 60, "t_end": T0 + 1200,
          "slope": 5000.0, "rsquare": 0.99, "tokens_per_min": 5000.0},
         {"session_id": "aaaaaaaa", "seg": 1, "n": 10, "start_ctx": 65000, "peak_ctx": 110000, "t_start": T0 + 1260, "t_end": T0 + 1800,
          "slope": 5000.0, "rsquare": 0.98, "tokens_per_min": 5000.0}],
        [{"session_id": "aaaaaaaa", "pos": 21, "ts": T0 + 1260, "before": 200000, "after": 65000, "reclaimed": 135000}],
        [{"session_id": "aaaaaaaa", "seg": 1, "n": 10, "last_ctx": 110000, "slope": 5000.0, "requests_left": 18.0, "rate_per_min": 1.0,
          "minutes_left": 18.0, "ceiling": 200000}],
    ]
    return {"dna": [sessions, [{"session_id": "aaaaaaaa", "pos": 9, "streak": 3}],
                    [{"motif": "BRR", "tool": "tool-a", "sessions": 1}, {"motif": "ORO", "tool": "tool-b", "sessions": 1}]],
            "relay": relay, "cost": cost, "slow": slow, "context": context, **synthetic_convergence()}


def synthetic_convergence() -> dict[str, list[list[dict]]]:
    """Rows for the sections on returns, stuck stretches, models, skills and MCP servers, in each query's table order."""
    spend = [5, 5, 5, 5, 5, 5, 10, 20, 20, 20]
    files = [8, 4, 2, 2, 2, 1, 1, 0, 0, 0]
    edits = [0, 0, 0, 0, 0, 0, 2, 6, 6, 6]
    returns = [
        [{"tool": "tool-a", "part": i + 1, "spend_pct": float(spend[i]), "new_files_pct": 5.0 * files[i], "new_files": files[i],
          "calls": 50, "edits": edits[i], "fail_pct": 1.0, "repeat_pct": 2.0 + 3 * i, "usd": float(spend[i])} for i in range(10)],
        [{"tool": "tool-a", "sessions": 4, "requests_p50": 200, "requests_max": 300, "usd": 100.0}],
        [{"applies": True, "samples": 4, "min_requests": 100, "note": ""}],
    ]
    stuck = [
        [{"tool": "tool-a", "model": "model-x", "requests": 1000, "stuck_requests": 50, "usd": 100.0, "stuck_usd": 10.0, "wall_h": 10.0,
          "stuck_wall_h": 1.0, "share_requests": 5.0, "share_usd": 10.0, "share_wall": 10.0},
         {"tool": "tool-a", "model": "model-y", "requests": 500, "stuck_requests": 0, "usd": 100.0, "stuck_usd": 0.0, "wall_h": 5.0,
          "stuck_wall_h": 0.0, "share_requests": 0.0, "share_usd": 0.0, "share_wall": 0.0}],
        [{"tool": "tool-a", "why": "same calls repeated", "stretches": 5, "requests": 50, "usd": 10.0, "len_p50": 8, "len_max": 20}],
        [{"tool": "tool-a", "tool_name": "Edit", "calls": 40, "failed": 0}],
        [{"tool": "tool-a", "model": "model-x", "session": "aaaaaaaa", "agent": "main agent", "requests": 100, "stuck_requests": 20,
          "stuck_usd": 4.0, "runs": json.dumps([{"a": 10, "n": 20, "why": "same calls repeated"}])}],
        [{"applies": True, "samples": 5, "min_run": 4, "window": 20, "note": ""}],
    ]

    def model(name, usd, per_request, calls_per_edit, per_file, edits=100):
        some = edits > 0
        return {"tool": "tool-a", "model": name, "requests": 1000, "usd": usd, "calls": 2000, "edits": edits, "files": edits // 2,
                "usd_per_request": per_request, "calls_per_request": 2.0, "out_tok_per_request": 1000.0,
                "calls_per_edit": calls_per_edit if some else None, "usd_per_file": per_file if some else None,
                "rework_pct": 30.0 if some else None, "fail_pct": 1.0, "repeat_pct": 5.0, "ctx_p50": 100000}

    models = [
        [model("model-x", 200.0, 0.2, 20.0, 4.0), model("model-y", 50.0, 0.05, 30.0, 1.0), model("model-z", 5.0, 0.005, None, None, edits=0)],
        [{"applies": True, "samples": 2, "min_requests": 50, "window": 20, "note": ""}],
    ]

    def skill(name, before, after, calls_before=100):
        return {"tool": "tool-a", "skill": name, "loads": 5, "contexts": 3, "calls_before": calls_before, "calls_after": 100,
                "fail_pct_before": 1.0 if calls_before else None, "repeat_pct_before": before, "fail_pct_after": 1.0, "repeat_pct_after": after}

    skills = [
        [skill("skill-a", 10.0, 30.0), skill("skill-b", 20.0, 10.0), skill("skill-c", 12.0, 25.0), skill("skill-d", None, 8.0, calls_before=0)],
        [{"tool": "tool-a", "has_skill": True, "contexts": 5, "requests_p50": 40, "usd_p50": 3.0, "fail_pct": 1.0, "repeat_pct": 15.0},
         {"tool": "tool-a", "has_skill": False, "contexts": 20, "requests_p50": 10, "usd_p50": 0.5, "fail_pct": 1.0, "repeat_pct": 10.0}],
        [{"applies": True, "samples": 20, "span": 10, "note": ""}],
    ]
    mcp = [
        [{"tool": "tool-a", "mcp_server": "srv-a", "calls": 1000, "tools_used": 10, "contexts": 20, "fail_pct": 0.5, "tok_per_call": 400.0,
          "share_calls_pct": 80.0, "share_tok_pct": 60.0, "p50_ms": 30.0, "p90_ms": 900.0},
         {"tool": "tool-a", "mcp_server": "srv-b", "calls": 200, "tools_used": 3, "contexts": 5, "fail_pct": 10.0, "tok_per_call": 50.0,
          "share_calls_pct": 16.0, "share_tok_pct": 2.0, "p50_ms": 40.0, "p90_ms": 20000.0}],
        [{"tool": "tool-a", "mcp_server": "srv-a", "mcp_tool": "query", "calls": 500, "fail_pct": 0.0, "tok_per_call": 800.0,
          "tok_sum": 400000.0, "p90_ms": 5000.0}],
        [{"applies": True, "samples": 1200, "note": ""}],
    ]
    return {"returns": returns, "stuck": stuck, "models": models, "skills": skills, "mcp": mcp}


def results(tables=None, empty=(), failed=None) -> list[SectionResult]:
    tables = tables or synthetic()
    out = []
    for s in SECTIONS:
        r = SectionResult(s.name, read_query(s), seconds=0.5, tables=tables[s.name])
        if s.name in empty:
            r.tables = [[] for _ in tables[s.name]]
        if failed and s.name in failed:
            r.tables, r.error = [], failed[s.name]
        out.append(r)
    return out


def page(**kw) -> str:
    return build_page(results(**kw), cluster="https://myhost.example.kusto.windows.net", database="mydb", days=None,
                      generated=datetime(2026, 1, 2, 3, 4, tzinfo=timezone.utc))


def render(tmp_path: Path, html: str) -> dict:
    if not shutil.which("node") or not JSDOM.exists():
        pytest.skip("node or jsdom is not installed")
    f = tmp_path / "report.html"
    f.write_text(html, encoding="utf-8")
    run = subprocess.run(["node", str(REPO / "test" / "kusto_report_render.cjs"), str(f), str(JSDOM)],
                         capture_output=True, text=True, encoding="utf-8", timeout=120)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)


# ---- registry and template ----

def test_every_section_has_a_query_markup_and_draw_function():
    tpl = read_template()
    assert len({s.name for s in SECTIONS}) == len(SECTIONS)
    for s in SECTIONS:
        assert read_query(s).strip(), s.name
        assert f'<template data-section="{s.name}"' in tpl, s.name
        assert re.search(rf"RENDER\.{s.name}\s*=\s*function", tpl), s.name
    for name in re.findall(r'<template data-section="(\w+)"', tpl):
        assert name in {s.name for s in SECTIONS}, f"template part {name} has no registry line"


def test_page_loads_nothing_from_another_host_but_google_fonts():
    html = page()
    urls = re.findall(r'(?:src|href)\s*=\s*["\'](https?:)?//([^/"\']+)', html)
    assert {host for _, host in urls} <= {"fonts.googleapis.com", "fonts.gstatic.com"}
    assert "<script src" not in html
    for tag in re.findall(r"<(?:script|link)\b[^>]*>", html):
        assert "http://" not in tag
    html.encode("utf-8")


def test_header_facts_come_from_the_run_not_the_template():
    html = page()
    assert '"cluster":"myhost.example.kusto.windows.net"' in html and '"database":"mydb"' in html
    assert '"generated":"2026-01-02T03:04:00Z"' in html
    tpl = read_template()
    assert not re.search(r"\d{1,3},\d{3} rows|aictlzvif|205,434|2026-11", tpl)


def test_cells_cannot_close_the_script_and_uuids_are_cut():
    t = synthetic()
    t["dna"][0][0]["tool"] = "</script><b>x"
    html = build_page(results(t), cluster="c", database="d", days=7)
    assert "</script><b>" not in html
    assert R._jsonable("c47d53d7-509d-4863-9a86-cbae5919c5de") == "c47d53d7"
    assert '"days":7' in html
    assert parameterized("T | count", 7).startswith("let report_days = 7;")
    assert parameterized("T | count", None).startswith("let report_days = 0;")


# ---- queries ----

def test_queries_hold_no_ids_dates_or_cluster_names():
    for s in SECTIONS:
        text = read_query(s)
        assert not re.search(r"\b[0-9a-fA-F]{8,}\b", text), s.name
        assert not re.search(r"\d{4}-\d{2}-\d{2}", text), s.name
        assert not re.search(r"kusto\.(windows|fabric)|\.net\b|westeurope|aictlzvif", text, re.I), s.name
        assert "datetime(2" not in text and "database(" not in text, s.name


def test_no_query_reads_a_store_table_itself():
    """Every row a section reads comes through the two filtered sources, so no section can ignore a filter."""
    queries = Path(R.__file__).parent / "queries"
    for f in sorted(queries.glob("*.kql")):
        code = "\n".join(line.split("//", 1)[0] for line in f.read_text(encoding="utf-8").splitlines())
        assert not re.search(r"\b(requests|tool_invocations|skill_uses|hook_calls)\s*\|", code), f.name
        assert "arg_max(_v" not in code and "_deleted" not in code, f.name
    for s in (*SECTIONS, R.VALUES):
        assert re.search(r"\breport_(requests|tool_calls)\b", read_query(s)), s.name


# ---- the filter ----

def test_without_a_filter_the_sources_are_the_current_rows_of_the_window():
    kql = filter_prelude(7)
    assert kql.startswith("let report_days = 7;\n")
    assert "let report_requests = report_request_rows;" in kql and "let report_tool_calls = report_tool_rows;" in kql
    assert "in~" not in kql and "session_id in" not in kql
    assert kql.count("summarize arg_max(_v, *) by id | where _deleted == false and ts >= report_since;") == 2
    assert filter_prelude(None).startswith("let report_days = 0;\n")


def test_time_range_tool_and_project_choose_rows_of_both_sources():
    start, end = datetime(2026, 1, 2, tzinfo=timezone.utc), datetime(2026, 1, 3, 12, tzinfo=timezone.utc)
    kql = filter_prelude(None, ReportFilter(start=start, end=end, tools=("tool-a", "tool-b"), projects=("proj",)))
    assert f"let report_since = {start.timestamp()!r};" in kql
    rows = [line for line in kql.splitlines() if line.startswith(("let report_request_rows", "let report_tool_rows"))]
    assert len(rows) == 2
    for line in rows:
        assert f"ts >= report_since and ts < {end.timestamp()!r}" in line
        assert 'tool in~ ("tool-a", "tool-b")' in line
        assert '"/")[-1]) in~ ("proj") or project_path in~ ("proj")' in line and r'replace_string(project_path, "\\", "/")' in line


def test_mcp_skill_and_agent_keep_whole_sessions():
    kql = filter_prelude(None, ReportFilter(mcps=("srv-a",), skills=("skill-a",), agents=("type-a",)))
    assert 'startswith "mcp:" and tostring(split(report_norm, ":")[1]) in~ ("srv-a") | distinct session_id;' in kql
    assert 'tolower(tool_name) == "skill" and target in~ ("skill-a") | distinct session_id;' in kql
    assert 'coalesce(tostring(report_input.subagent_type), tostring(report_input.agent_type)) in~ ("type-a") | distinct session_id;' in kql
    chosen = (" | where session_id in (report_mcp_sessions) | where session_id in (report_skill_sessions)"
              " | where session_id in (report_agent_sessions);")
    assert "let report_requests = report_request_rows" + chosen in kql
    assert "let report_tool_calls = report_tool_rows" + chosen in kql


def test_model_keeps_its_requests_and_the_tool_calls_after_them():
    kql = filter_prelude(None, ReportFilter(models=("model-a",)))
    assert 'let report_requests = report_request_rows | where model in~ ("model-a");' in kql
    # the time line is built from all requests, so a call after another model's request is not given to model-a
    assert "union (report_request_rows | project report_stream" in kql
    assert 'where report_model in~ ("model-a") | project report_call;' in kql
    assert "let report_tool_calls = report_tool_rows | join kind = inner report_model_calls on $left.id == $right.report_call" in kql


def test_filter_values_cannot_leave_their_string():
    hostile = 'x") | take 1 // \\'
    kql = filter_prelude(None, ReportFilter(tools=(hostile,)))
    assert "tool in~ (" + json.dumps(hostile) + ")" in kql
    with pytest.raises(ValueError):
        filter_prelude(None, ReportFilter(models=("a\nb",)))


def test_page_header_states_the_filter(tmp_path):
    only = ReportFilter(start=datetime(2026, 1, 2, tzinfo=timezone.utc), tools=("tool-a",), mcps=("srv-a", "srv-b"))
    html = build_page(results(), cluster="c", database="d", days=None, only=only)
    assert '"filter":[["from","2026-01-02 00:00 UTC"],["tool","tool-a"],["sessions that used the MCP server","srv-a, srv-b"]]' in html
    assert '"filter":[]' in page()
    text = render(tmp_path, html)["window"]
    assert "Window: rows from 2026-01-02 00:00 UTC." in text and "no query filters by time" not in text
    assert "Filter: tool tool-a; sessions that used the MCP server srv-a, srv-b." in text


# ---- rendering ----

def test_all_sections_render_from_synthetic_results(tmp_path):
    out = render(tmp_path, page())
    assert out["problems"] == []
    assert set(out["sections"]) == {s.name for s in SECTIONS}
    for name, sec in out["sections"].items():
        assert sec["notice"] is None, (name, sec["noticeText"])
        assert sec["findings"] and sec["drawn"] > 0, name
    assert "myhost.example.kusto.windows.net" in out["lede"] and "mydb" in out["lede"]
    assert "all data" in out["window"]


def test_empty_result_and_failed_query_give_notices_and_the_rest_renders(tmp_path):
    html = page(empty=("relay",), failed={"cost": "Request is invalid: operator not supported (SYN0002)"})
    out = render(tmp_path, html)
    assert out["problems"] == []
    assert out["sections"]["relay"]["notice"] == "empty" and "No data" in out["sections"]["relay"]["noticeText"]
    assert out["sections"]["cost"]["notice"] == "error" and "operator not supported" in out["sections"]["cost"]["noticeText"]
    for name in ("dna", "slow", "context"):
        assert out["sections"][name]["notice"] is None and out["sections"][name]["drawn"] > 0


def test_a_section_that_cannot_draw_its_rows_shows_the_error(tmp_path):
    t = synthetic()
    t["slow"][1] = [{"unexpected": 1}]  # not the columns the query returns
    out = render(tmp_path, page(tables=t))
    assert out["sections"]["slow"]["notice"] in ("error", "empty")
    assert out["sections"]["dna"]["notice"] is None


def test_headlines_stay_true_when_nothing_is_found(tmp_path):
    t = synthetic()
    t["dna"][0] = t["dna"][0][:1]
    t["dna"][1], t["dna"][2] = [], []
    t["relay"] = [[], [], [], [], [], []]
    t["relay"][2] = [{"work_item": 1, "actors": 1, "files": 1}]
    t["cost"][1], t["cost"][2] = [], []
    for row in t["cost"][0]:
        row["flag"] = 0
    t["context"][2], t["context"][3] = [], [dict(t["context"][3][0], ceiling=None, requests_left=None, minutes_left=None)]
    t["slow"][0] = []
    out = render(tmp_path, page(tables=t))["sections"]
    assert out["relay"]["notice"] is None
    assert out["relay"]["headline"].startswith("No agent read a file")
    assert any("No relay chain" in f for f in out["relay"]["findings"])
    assert out["cost"]["headline"].startswith("No hour stands out")
    assert any("No run of 3 or more" in f for f in out["dna"]["findings"])
    assert any("No compaction" in f for f in out["context"]["findings"])
    assert any("no runway" in f for f in out["context"]["findings"])
    assert "No combination" in out["slow"]["headline"]


def test_convergence_headlines_carry_the_numbers_of_the_rows(tmp_path):
    out = render(tmp_path, page())["sections"]
    assert out["returns"]["headline"] == ("Long tool-a sessions: the last three tenths take 60% of the spend "
                                          "and reach 0% of the new files")
    assert any("18 of 20 edits" in f for f in out["returns"]["findings"])
    assert out["stuck"]["headline"] == "Going round in circles took 5.0% of the spend; model-x on tool-a lost 10.0% of its own"
    assert any("model-y" in f and "no stuck stretch" in f for f in out["stuck"]["findings"])
    assert out["models"]["headline"] == "One edited file costs $4.00 with model-x and $1.00 with model-y: 4.0 times apart"
    assert any("4.0 times more per request" in f and "20.0 tool calls per edit against 30.0" in f for f in out["models"]["findings"])
    assert out["skills"]["headline"] == "After a skill loads, the agent repeats itself more in 2 of 3 skills, and less in 1"
    assert any("skill-d" in f and "no before" in f for f in out["skills"]["findings"])
    assert out["mcp"]["headline"] == "One MCP server, srv-a, returns 60% of all tool-result text in tool-a"
    assert any("srv-b" in f and "20.0 s" in f for f in out["mcp"]["findings"])
    assert any("10.0% of the calls to srv-b" in f and "20 of 200" in f for f in out["mcp"]["findings"])


def test_convergence_headlines_stay_true_when_nothing_is_found(tmp_path):
    t = synthetic()
    for row in t["returns"][0]:
        row["spend_pct"], row["new_files_pct"] = 10.0, 10.0
    for row in t["stuck"][0]:
        row.update(stuck_requests=0, stuck_usd=0.0, share_requests=0.0, share_usd=0.0, share_wall=0.0)
    t["stuck"][1], t["stuck"][2], t["stuck"][3] = [], [], []
    t["stuck"][4] = [dict(t["stuck"][4][0], applies=False, samples=0)]
    t["models"][0] = t["models"][0][:1]
    for row in t["skills"][0]:
        row.update(calls_before=0, repeat_pct_before=None, fail_pct_before=None)
    for row in t["mcp"][0]:
        row["share_tok_pct"] = 10.0
    out = render(tmp_path, page(tables=t))["sections"]
    for name in ("returns", "stuck", "models", "skills", "mcp"):
        assert out[name]["notice"] is None, (name, out[name]["noticeText"])
    assert out["returns"]["headline"].startswith("Long sessions keep reaching new files to the end")
    assert out["stuck"]["headline"].startswith("No context went round in circles")
    assert out["models"]["headline"].startswith("Too few models with 20 edits or more")
    assert out["skills"]["headline"].startswith("Skills load before any work starts")
    assert out["mcp"]["headline"].startswith("No MCP server dominates")


def test_too_few_long_sessions_is_said_in_the_headline(tmp_path):
    t = synthetic()
    t["returns"][2] = [dict(t["returns"][2][0], applies=False, samples=1)]
    out = render(tmp_path, page(tables=t))["sections"]
    assert out["returns"]["headline"] == "Too few long sessions to judge their returns: 1 with 100 requests or more"


def test_a_shared_prelude_goes_in_front_of_the_query():
    shared = [s for s in SECTIONS if s.prelude]
    assert {s.name for s in shared} >= {"returns", "stuck", "models", "skills", "mcp"}
    for s in shared:
        queries = Path(R.__file__).parent / "queries"
        prelude = (queries / s.prelude).read_text(encoding="utf-8").strip()
        own = (queries / s.query).read_text(encoding="utf-8").strip()
        text = read_query(s)
        assert text.index(prelude) < text.index(own)


# ---- the command ----

def test_command_runs_only_the_named_sections_in_the_given_order(monkeypatch, tmp_path):
    from aictl.cli import main

    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: KustoSettings("http://localhost:1", "d", streaming=False))
    seen = {}

    def fake(settings, days=None, sections=None, on_result=None, only=None):
        seen["names"] = [s.name for s in sections]
        rs = {r.name: r for r in results()}
        return [rs[n] for n in seen["names"]]

    monkeypatch.setattr(R, "run_report", fake)
    out = tmp_path / "r.html"
    res = CliRunner().invoke(main, ["db", "report", "--out", str(out), "--sections", "mcp, stuck"])
    assert res.exit_code == 0, res.output
    assert seen["names"] == ["mcp", "stuck"] and out.exists()
    res = CliRunner().invoke(main, ["db", "report", "--out", str(tmp_path / "no.html"), "--sections", "mcp,nope"])
    assert res.exit_code != 0 and "Unknown section: nope" in res.output
    assert not (tmp_path / "no.html").exists()



def test_command_takes_the_cluster_and_database_as_options(monkeypatch, tmp_path):
    """The same options as daemon serve: the report runs with no environment variable and no config entry."""
    from aictl.cli import main

    for var in ("AICTL_KUSTO_CLUSTER", "AICTL_KUSTO_DATABASE", "AICTL_KUSTO_AUTH"):
        monkeypatch.delenv(var, raising=False)
    seen = []

    def fake(settings, days=None, sections=None, on_result=None, only=None):
        seen.append((settings.cluster, settings.database, settings.auth_mode))
        return results()

    monkeypatch.setattr(R, "run_report", fake)
    out = tmp_path / "new folder" / "r.html"
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: None)
    args = ["db", "report", "--out", str(out), "--kusto-cluster", "https://ingest-mine.westus.kusto.windows.net"]
    res = CliRunner().invoke(main, [*args, "--kusto-database", "other"])
    assert res.exit_code == 0, res.output
    assert out.exists() and "kusto://mine.westus.kusto.windows.net/other" in res.output
    res = CliRunner().invoke(main, args)
    assert res.exit_code == 0, res.output
    # A configured store gives the database and the sign-in; the options replace what they name.
    configured = KustoSettings("http://localhost:8080", "configured", streaming=False)
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: configured)
    assert CliRunner().invoke(main, args).exit_code == 0
    assert CliRunner().invoke(main, ["db", "report", "--out", str(out), "--kusto-database", "other"]).exit_code == 0
    assert seen == [
        ("https://mine.westus.kusto.windows.net", "other", "azcli"),
        ("https://mine.westus.kusto.windows.net", "aictl", "azcli"),
        ("https://mine.westus.kusto.windows.net", "configured", "azcli"),
        ("http://localhost:8080", "other", "none"),
    ]


def test_command_passes_the_filter_to_every_query(monkeypatch, tmp_path):
    from aictl.cli import main

    seen = []

    def fake(settings, days=None, sections=None, on_result=None, only=None):
        seen.append((days, only))
        return results()

    monkeypatch.setattr(R, "run_report", fake)
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: KustoSettings("http://localhost:8080", "d", streaming=False))
    out, data = tmp_path / "r.html", tmp_path / "data" / "r.json"
    args = ["db", "report", "--out", str(out)]
    res = CliRunner().invoke(main, [*args, "--from", "2026-01-02", "--to", "2026-01-03", "--tool", "tool-a,tool-b", "--tool", "tool-c",
                                    "--project", "proj", "--model", "model-a", "--mcp", "srv-a", "--skill", "skill-a",
                                    "--agent", "type-a", "--json", str(data)])
    assert res.exit_code == 0, res.output
    assert seen == [(None, ReportFilter(
        start=datetime(2026, 1, 2, tzinfo=timezone.utc), end=datetime(2026, 1, 4, tzinfo=timezone.utc),  # --to includes its day
        projects=("proj",), tools=("tool-a", "tool-b", "tool-c"), models=("model-a",), mcps=("srv-a",), skills=("skill-a",), agents=("type-a",)))]
    assert "only sessions that used the MCP server: srv-a" in res.output and "only tool: tool-a, tool-b, tool-c" in res.output
    assert '["sessions that used the skill","skill-a"]' in out.read_text(encoding="utf-8")
    saved = json.loads(data.read_text(encoding="utf-8"))
    assert saved["filter"][0] == ["from", "2026-01-02 00:00 UTC"] and [s["name"] for s in saved["sections"]] == [s.name for s in SECTIONS]
    res = CliRunner().invoke(main, [*args, "--to", "2026-01-03T06:30"])
    assert seen[-1][1].end == datetime(2026, 1, 3, 6, 30, tzinfo=timezone.utc)
    for bad in (["--days", "3", "--from", "2026-01-02"], ["--from", "2026-01-03", "--to", "2026-01-01"], ["--from", "yesterday"],
                ["--model", "a\nb"]):
        res = CliRunner().invoke(main, [*args, *bad])
        assert res.exit_code != 0 and "Error:" in res.output, bad
    assert len(seen) == 2


def test_command_says_when_no_row_passed_the_filter(monkeypatch, tmp_path):
    from aictl.cli import main

    monkeypatch.setattr(R, "run_report", lambda *a, **k: results(empty={s.name for s in SECTIONS}))
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: KustoSettings("http://localhost:8080", "d", streaming=False))
    res = CliRunner().invoke(main, ["db", "report", "--out", str(tmp_path / "r.html"), "--mcp", "nothing"])
    assert res.exit_code == 0 and "No row passed the filter" in res.output
    res = CliRunner().invoke(main, ["db", "report", "--out", str(tmp_path / "r.html")])
    assert "No row passed the filter" not in res.output


def test_command_lists_the_values_a_filter_can_name(monkeypatch, tmp_path):
    from aictl.cli import main

    seen = []

    def fake(settings, days=None, only=None):
        seen.append((days, only))
        return SectionResult("values", "", tables=[
            [{"source": "requests", "rows": 1200, "sessions": 30, "first_row": "2026-01-02T03:04:00Z", "last_row": "2026-01-09T03:04:00Z"},
             {"source": "tool calls", "rows": 0, "sessions": 0, "first_row": None, "last_row": None}],
            [{"field": "mcp", "value": "srv-a", "sessions": 12}, {"field": "tool", "value": "tool-a", "sessions": 30}],
        ])

    monkeypatch.setattr(R, "run_values", fake)
    monkeypatch.setattr(R, "run_report", lambda *a, **k: pytest.fail("--values runs no section"))
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: KustoSettings("http://localhost:8080", "d", streaming=False))
    out = tmp_path / "r.html"
    res = CliRunner().invoke(main, ["db", "report", "--out", str(out), "--values", "--days", "7", "--tool", "tool-a"])
    assert res.exit_code == 0, res.output
    assert seen == [(7, ReportFilter(tools=("tool-a",)))] and not out.exists()
    assert "requests: 1,200 rows in 30 sessions, 2026-01-02T03:04:00Z to 2026-01-09T03:04:00Z" in res.output
    assert "tool calls: no rows" in res.output
    assert "--mcp  (sessions)\n      12  srv-a" in res.output and "--tool  (sessions)\n      30  tool-a" in res.output


def test_command_without_a_cluster_exits_with_a_message(monkeypatch, tmp_path):
    from aictl.cli import main

    for var in ("AICTL_KUSTO_CLUSTER", "AICTL_KUSTO_DATABASE"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: None)
    out = tmp_path / "r.html"
    res = CliRunner().invoke(main, ["db", "report", "--out", str(out)])
    assert res.exit_code != 0 and "No Kusto cluster is configured" in res.output
    assert "--kusto-cluster" in res.output and "setx" in res.output
    assert not out.exists()
    # A database alone names no cluster.
    res = CliRunner().invoke(main, ["db", "report", "--out", str(out), "--kusto-database", "aictl"])
    assert res.exit_code != 0 and "No Kusto cluster is configured" in res.output


def test_command_writes_the_page_and_reports_failures(monkeypatch, tmp_path):
    from aictl.cli import main

    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: KustoSettings("http://localhost:1", "d", streaming=False))
    seen = {}

    def fake(settings, days=None, sections=None, on_result=None, only=None):
        seen["days"] = days
        rs = results(failed={"slow": "boom"})
        for r in rs:
            on_result(r)
        return rs

    monkeypatch.setattr(R, "run_report", fake)
    out = tmp_path / "sub" / "r.html"
    res = CliRunner().invoke(main, ["db", "report", "--out", str(out), "--days", "3"])
    assert res.exit_code == 0, res.output
    assert out.read_text(encoding="utf-8").startswith("<!doctype html>")
    assert seen["days"] == 3
    assert "slow" in res.output and "FAILED" in res.output and str(out.resolve()) in res.output


# ---- emulator ----

EMULATOR = KustoSettings("http://localhost:8080", "aictl", streaming=False)


def _emulator_up() -> bool:
    try:
        urllib.request.urlopen("http://localhost:8080/", timeout=2)
    except urllib.error.HTTPError:
        return True
    except Exception:  # noqa: BLE001 - anything else means no emulator
        return False
    return True


emulator = pytest.mark.skipif(not _emulator_up(), reason="Kusto emulator not running on localhost:8080")


@emulator
def test_emulator_runs_the_command_end_to_end(monkeypatch, tmp_path):
    """Seed synthetic rows, run ``aictl db report`` and check which sections the emulator answers.

    Result on the emulator image used here: every section runs except the ones that need an operator
    the emulator lacks, which show their error text (asserted below as the set of failed sections).
    """
    from aictl.cli import main
    from aictl.kusto.connection import connect
    from aictl.kusto.schema import current, row_defaults, store_schema
    from aictl.kusto.statements import Insert, Mutation

    tables = store_schema()
    tag = "rpt" + uuid.uuid4().hex[:8]

    class Stub:
        def __init__(self):
            self.m = {}

        def translate(self, sql, params=()):
            return self.m[sql]

        def translate_script(self, sql):
            from aictl.kusto.statements import Noop

            return [Noop("script")]

    tr = Stub()
    conn = connect(EMULATOR, translator=tr)
    try:
        req = []
        tool = []
        for i in range(6):
            req.append(row_defaults(tables["requests"]) | {
                "dedup_key": f"{tag}-r{i}", "ts": T0 + i * 600, "session_id": f"{tag}-s1", "tool": "claude-code", "model": "m1",
                "input_tokens": 10, "output_tokens": 100 * (i + 1), "cache_read_tokens": 1000 * (i + 1), "cost_usd": 0.5 * (i + 1),
                "duration_ms": 1000.0 * (i + 1), "finish_reason": "stop"})
            tool.append(row_defaults(tables["tool_invocations"]) | {
                "dedup_key": f"{tag}-t{i}", "ts": T0 + i * 60, "session_id": f"{tag}-s1", "tool": "claude-code",
                "tool_name": "Read" if i % 2 else "Bash", "target": f"/home/user/dir/file{i % 3}.md", "agent_id": "" if i < 3 else f"{tag}-ag{i}"})
        tr.m["req"] = Insert("requests", req)
        tr.m["tool"] = Insert("tool_invocations", tool)
        conn.execute("req")
        conn.execute("tool")
        conn.commit()

        monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: EMULATOR)
        out = tmp_path / "emulator.html"
        res = CliRunner().invoke(main, ["db", "report", "--out", str(out)])
        assert res.exit_code == 0, res.output
        html = out.read_text(encoding="utf-8")
        assert "localhost:8080" in html and '"database":"aictl"' in html
        data = json.loads(re.search(r"const REPORT=(\{.*?\});\n", html, re.S).group(1))
        status = {s["name"]: ("failed" if s["error"] else "ok") for s in data["sections"]}
        print(status, {s["name"]: (s["error"] or "")[:120] for s in data["sections"] if s["error"]})
        assert set(status) == {s.name for s in SECTIONS}
        assert status["dna"] == "ok" and status["cost"] == "ok" and status["slow"] == "ok" and status["context"] == "ok"
        for s in data["sections"]:
            if s["error"]:
                assert s["error"].strip()
        assert '"' + tag not in html  # session ids are cut to 8 characters
    finally:
        for name in ("requests", "tool_invocations"):
            t = tables[name]
            tr.m["del"] = Mutation(
                name, f"{current(t)} | where session_id startswith '{tag}' | extend ['_v'] = now(), ['_deleted'] = true", "delete")
            conn.execute("del")
        conn.commit()
