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
from aictl.kusto.report import SECTIONS, SectionResult, build_page, parameterized, read_query, read_template

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
            "relay": relay, "cost": cost, "slow": slow, "context": context}


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


def test_every_query_reads_the_window_parameter():
    for s in SECTIONS:
        assert "report_days" in read_query(s), s.name


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


# ---- the command ----

def test_command_without_a_cluster_exits_with_a_message(monkeypatch, tmp_path):
    from aictl.cli import main

    for var in ("AICTL_KUSTO_CLUSTER", "AICTL_KUSTO_DATABASE"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: None)
    out = tmp_path / "r.html"
    res = CliRunner().invoke(main, ["db", "report", "--out", str(out)])
    assert res.exit_code != 0 and "No Kusto cluster is configured" in res.output
    assert not out.exists()


def test_command_writes_the_page_and_reports_failures(monkeypatch, tmp_path):
    from aictl.cli import main

    monkeypatch.setattr("aictl.commands.admin.kusto_settings", lambda: KustoSettings("http://localhost:1", "d", streaming=False))
    seen = {}

    def fake(settings, days=None, sections=None, on_result=None):
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
