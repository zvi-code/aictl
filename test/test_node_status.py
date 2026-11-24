# ruff: noqa: F811 - pytest fixtures imported from other test modules
"""Each node's status: history read lines on the console, the record it publishes, and the fleet's Health rows."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from kusto_replay import NOW
from test_board_nodes import node_reader  # noqa: F401 - a reader with connection settings
from test_index_breakdown import _breakdown, tree  # noqa: F401 - the Index screen's fixture

from aictl import node_status as ns
from aictl.dashboard.node_views import node_view
from aictl.stores.testing import MemoryWriter

GB = 1024**3


def _progress(complete, reading, waiting, bytes_read, *, files=None, total=10 * GB, skipped=0):
    files = complete + reading + waiting if files is None else files
    tools = [
        {
            "tool": "claude-code",
            "files": files - 1,
            "complete": max(0, complete - 1),
            "reading": reading,
            "waiting": waiting,
            "outside_window": 0,
            "unreadable": 0,
            "bytes": total - GB,
            "bytes_read": bytes_read,
            "bytes_skipped": skipped,
            "bytes_to_read": max(0, total - GB - bytes_read - skipped),
        },
        {
            "tool": "codex-cli",
            "files": 1,
            "complete": min(1, complete),
            "reading": 0,
            "waiting": 0,
            "outside_window": 0,
            "unreadable": 0,
            "bytes": GB,
            "bytes_read": 0,
            "bytes_skipped": GB,
            "bytes_to_read": 0,
        },
    ]
    total_counts = {k: sum(t[k] for t in tools) for k in ns._COUNTS}
    return {**total_counts, "by_tool": tools, "computed_at": 0.0, "scan_ms": 250.0}


# ── console lines ──────────────────────────────────────────────────────


def test_the_history_read_says_what_it_reads_then_progress_at_most_once_a_minute_then_done():
    h = ns.HistoryRead()
    (start,) = h.update(_progress(10, 1, 89, 1 * GB), 0.0)
    assert start == ("history read: 90 of 100 files to read, 8.0 GB (claude-code 90 files 8.0 GB)")
    (first,) = h.update(_progress(20, 1, 79, 2 * GB), 30.0)
    assert first == (
        "history read: 20 of 100 files complete, 2.0 GB of 9.0 GB read (22%), "
        "2.0 GB/min, about 3 h 30 min left".replace("3 h 30 min", ns.duration(7 * GB / (GB / 30)))
    )
    assert h.update(_progress(25, 1, 74, 3 * GB), 60.0) == []  # 30 s after the last line
    assert h.update(_progress(30, 1, 69, 4 * GB), 90.0)[0].startswith("history read: 30 of 100 files complete")
    assert h.update(_progress(30, 1, 69, 4 * GB), 160.0) == []  # nothing changed: no line
    summary = h.summary()
    assert (summary["state"], summary["complete"], summary["bytes_to_read"], summary["percent"]) == (
        "reading",
        30,
        5 * GB,
        44.4,
    )
    assert summary["rate_bps"] == pytest.approx(3 * GB / 160) and summary["eta_s"] == round(5 * GB / (3 * GB / 160))
    (done,) = h.update(_progress(100, 0, 0, 9 * GB), 400.0)
    assert done == "history read: done, 100 files complete, 9.0 GB read in 6 min"
    assert h.update(_progress(100, 0, 0, 9 * GB), 500.0) == [] and h.summary()["state"] == "done"


def test_a_node_with_nothing_to_read_prints_no_line():
    h = ns.HistoryRead()
    assert h.update(_progress(5, 0, 0, 9 * GB), 0.0) == []
    assert h.summary()["state"] == "done" and h.summary()["started_at"] is None


def test_durations_read_as_people_say_them():
    assert [ns.duration(s) for s in (None, 5, 61, 3600, 9600, 3 * 86400 + 7200)] == [
        "-",
        "5 s",
        "1 min",
        "1 h",
        "2 h 40 min",
        "3 d 2 h",
    ]


def _reporter(progress, clock, lines, writer=None, *, store=None):
    handle = SimpleNamespace(
        name="transcript-usage",
        ingester=object(),
        status=lambda: {
            "name": "transcript-usage",
            "enabled": True,
            "source_exists": True,
            "last_poll_ts": 1.0,
            "last_success_at": 1.0,
            "rows_ingested_total": 7,
        },
    )
    return ns.NodeStatus(
        store or SimpleNamespace(history_store=SimpleNamespace(layout={"version": 7, "data_epoch": "e1"})),
        ingesters=lambda: {"transcript-usage": handle},
        writer=writer,
        clock=lambda: clock[0],
        say=lines.append,
        tasks=ns.Tasks(say=lines.append, clock=lambda: clock[0]),
        history_days=30,
        node_id="node-a",
        started_at=0.0,
    )


def test_a_daemon_start_with_unread_files_prints_the_start_and_first_progress_line_within_a_minute(monkeypatch):
    scans = iter([_progress(0, 1, 99, 0), _progress(3, 1, 96, GB // 2), _progress(6, 1, 93, GB)])
    monkeypatch.setattr(ns, "scan_progress", lambda ing, **kw: {**next(scans), "computed_at": kw["now"]})
    clock, lines = [0.0], []
    reporter = _reporter(None, clock, lines)
    for t in range(0, 61, int(ns.TICK_S)):
        clock[0] = float(t)
        reporter.tick()
    assert [line.split(":")[0] + ":" + line.split(":")[1][:5] for line in lines] == [
        "history read: 100 ",
        "history read: 3 of",
    ]
    assert reporter.next_scan == 60.0 + ns.SCAN_INTERVAL_S


def test_a_slow_scan_runs_less_often(monkeypatch):
    monkeypatch.setattr(ns, "scan_progress", lambda ing, **kw: {**_progress(0, 1, 9, 0), "scan_ms": 4000.0})
    reporter = _reporter(None, [0.0], [])
    reporter.scan(100.0)
    assert reporter.next_scan == 100.0 + 4 * ns.SLOW_SCAN_FACTOR


# ── the record and its publishing ──────────────────────────────────────


def test_the_record_names_the_node_its_readers_writer_and_tasks(monkeypatch):
    monkeypatch.setattr(ns, "scan_progress", lambda ing, **kw: _progress(10, 1, 89, GB))
    writer = MemoryWriter()
    writer.health = lambda: {
        "status": "active",
        "tables": {
            "events": {
                "queue_depth": 40,
                "queue_bytes": 900,
                "in_flight": 2,
                "ingest_failures": 1,
                "rows_dropped": 0,
                "last_error": "password=hunter2abc refused",
                "last_error_at": 50.0,
            },
            "sessions": {"queue_depth": 2, "queue_bytes": 100, "in_flight": 0, "ingest_failures": 0, "rows_dropped": 0},
        },
    }
    clock, lines = [100.0], []
    reporter = _reporter(None, clock, lines, writer)
    reporter.tasks.begin("schema", "store schema")
    reporter.tasks.end("schema", "layout 7, data epoch e1")
    reporter.scan(100.0)
    record = reporter.record()
    assert set(record) == {
        "record_version",
        "node_id",
        "version",
        "layout",
        "daemon_started_at",
        "reported_at",
        "history",
        "readers",
        "writer",
        "tasks",
        "state",
    }
    assert (record["node_id"], record["layout"], record["state"]) == (
        "node-a",
        {"version": 7, "data_epoch": "e1"},
        "reading history",
    )
    (reader,) = record["readers"]
    assert (reader["label"], reader["state"], reader["rows_total"]) == ("Transcript reader", "reading history", 7)
    assert reader["progress"]["complete"] == 10 and reader["progress"]["files"] == 100
    w = record["writer"]
    assert (w["rows_queued"], w["in_flight"], w["failures"], w["tables_failing"]) == (42, 2, 1, ["events"])
    assert "hunter2" not in w["last_error"]
    (task,) = record["tasks"]
    assert (task["name"], task["state"], task["result"]) == ("schema", "done", "layout 7, data epoch e1")
    assert lines[:2] == ["store schema: started", "store schema: done in 0 s, layout 7, data epoch e1"]


def test_publishing_writes_one_row_per_minute_at_most_and_only_on_a_change_or_a_heartbeat(monkeypatch):
    progress = [_progress(10, 1, 89, GB)]
    reading = [False]

    def scan(ing, **kw):
        if reading[0]:  # every scan reads more
            progress[0] = _progress(10, 1, 89, progress[0]["bytes_read"] + GB // 100)
        return progress[0]

    monkeypatch.setattr(ns, "scan_progress", scan)
    writer = MemoryWriter()
    clock = [0.0]
    reporter = _reporter(None, clock, [], writer)

    def run(until):
        while clock[0] < until:
            reporter.tick()
            clock[0] += ns.TICK_S

    run(30)
    assert len(writer.operations) == 1
    reading[0] = True
    run(185)
    reading[0] = False
    times = [json.loads(rows[0]["text"])["reported_at"] for _, _, rows in writer.operations]
    assert times == [0.0, 60.0, 120.0, 180.0]
    assert all(b - a >= ns.PUBLISH_MIN_S for a, b in zip(times, times[1:], strict=False))
    run(185 + 2 * ns.HEARTBEAT_S)  # nothing changes: a heartbeat every HEARTBEAT_S
    times = [json.loads(rows[0]["text"])["reported_at"] for _, _, rows in writer.operations]
    assert times[4:] == [180.0 + ns.HEARTBEAT_S, 180.0 + 2 * ns.HEARTBEAT_S]
    (op, table, rows) = writer.operations[0]
    assert (op, table, rows[0]["key"], rows[0]["project"]) == ("upsert", "maintenance_state", ns.SNAPSHOT_KEY, "")


def test_a_queued_reread_is_a_task_until_the_reader_takes_it(tmp_path):
    lines = []
    reporter = _reporter(None, [5.0], lines, store=SimpleNamespace(restart_dir=tmp_path, history_store=None))
    request = tmp_path / "transcript_usage.reread-abc.json"
    request.write_text("{}")
    reporter.check_reread()
    reporter.check_reread()
    assert reporter.tasks.get("reread").state == "queued"
    request.unlink()
    reporter.check_reread()
    assert reporter.tasks.get("reread").state == "done"
    assert lines == [
        "aictl db reread: queued (1 request(s) waiting for the reader)",
        "aictl db reread: done in 0 s, the named files are read again as part of the history read",
    ]


# ── the same figures as the Index screen ───────────────────────────────


def test_the_progress_figures_equal_the_index_screens_for_the_same_node(tree):
    index = _breakdown(tree)
    progress = ns.scan_progress(tree.ing, live=False, history_days=30, now=tree.now)
    for tool in {loc["tool"] for loc in index["locations"]}:
        rows = [loc for loc in index["locations"] if loc["tool"] == tool]
        mine = next(t for t in progress["by_tool"] if t["tool"] == tool)
        assert mine["files"] == sum(r["files"] for r in rows)
        assert mine["bytes"] == sum(r["bytes"] for r in rows)
        assert mine["bytes_read"] == sum(r["bytes_read"] for r in rows)
        assert mine["complete"] == sum(r["states"]["complete"] for r in rows)
        assert mine["reading"] == sum(r["states"]["reading"] for r in rows)
        assert mine["outside_window"] == sum(r["states"]["outside_window"] for r in rows)
        assert mine["waiting"] == sum(r["states"][s] for r in rows for s in ("waiting", "reread", "changed"))
    codex = next(t for t in progress["by_tool"] if t["tool"] == "codex-cli")
    assert codex["outside_window"] == 1 and codex["bytes_skipped"] > 0 and codex["bytes_to_read"] == 0
    claude = next(t for t in progress["by_tool"] if t["tool"] == "claude-code")
    assert claude["waiting"] == 2 and claude["bytes_to_read"] == claude["bytes"] - claude["bytes_read"]


# ── the fleet's Health rows ────────────────────────────────────────────


def _record(node, at, state="reading history"):
    return {
        "record_version": 1,
        "node_id": node,
        "version": "1.0",
        "reported_at": at,
        "state": state,
        "history": {"state": "reading", "files": 10, "complete": 4, "reading": 1, "waiting": 5},
        "readers": [],
        "writer": None,
        "tasks": [],
    }


def test_fleet_health_carries_every_nodes_status_and_an_older_node_reports_none(kusto_store, node_reader):
    from test_contract import validate_detail

    for node, at in (("host-a", NOW - 30), ("host-b", NOW - 3 * ns.STALE_AFTER_S)):
        kusto_store.insert("system_snapshots", node_id=node, ts=NOW - 10, host_cpu_percent=1)
        kusto_store.insert(
            "maintenance_state",
            node_id=node,
            key=ns.SNAPSHOT_KEY,
            value=at - 60,
            text=json.dumps(_record(node, at - 60)),
            _v="2026-01-01",
        )
        kusto_store.insert(
            "maintenance_state",
            node_id=node,
            key=ns.SNAPSHOT_KEY,
            value=at,
            text=json.dumps(_record(node, at)),
            _v="2026-01-02",
        )
    kusto_store.insert("system_snapshots", node_id="old-node", ts=NOW - 10, host_cpu_percent=1)
    kusto_store.insert("maintenance_state", node_id="old-node", key="index_breakdown", value=NOW, text="{}")
    query = {"view": ["health"], "scope": ["fleet"]}
    out = node_view(SimpleNamespace(), query, now=NOW, reader=node_reader)
    validate_detail("/api/board/nodes", out)
    assert out["node_status_error"] is None
    rows = {r["node_id"]: r for r in out["node_status"]}
    assert set(rows) == {"host-a", "host-b", "old-node"}
    assert (rows["host-a"]["status"], rows["host-a"]["reported_at"]) == ("reported", NOW - 30)
    assert rows["host-a"]["record"]["history"]["complete"] == 4
    assert rows["host-b"]["status"] == "stale"
    assert (rows["old-node"]["status"], rows["old-node"]["record"]) == ("none", None)
    board = node_view(SimpleNamespace(), {"view": ["status"], "scope": ["fleet"]}, now=NOW, reader=node_reader)
    validate_detail("/api/board/nodes", board)
    assert [r["node_id"] for r in board["rows"]] == ["host-a", "host-b"]


def test_the_serving_node_shows_its_live_record_and_a_failed_status_read_keeps_the_health_rows(
    node_reader, monkeypatch
):
    def read(view, _params):
        if view == "nodes.status":
            from aictl.stores.base import StoreError

            raise StoreError("busy")
        return SimpleNamespace(rows=[{"node_id": "host-b", "captured_at": NOW}], truncated=False)

    monkeypatch.setattr(node_reader, "read", read)
    out = node_view(
        SimpleNamespace(),
        {"view": ["health"], "scope": ["fleet"]},
        now=NOW,
        reader=node_reader,
        local_status=lambda: _record("host-a", NOW - 5),
    )
    assert out["node_status_error"] == "busy" and [r["node_id"] for r in out["rows"]] == ["host-b"]
    assert [(r["node_id"], r["status"], r["origin"]) for r in out["node_status"]] == [
        ("host-a", "reported", "live"),
        ("host-b", "none", "none"),
    ]
