import json
from types import SimpleNamespace
import pytest

from aictl.dashboard.board_filters import Filters
from aictl.dashboard.board_projection import _resource_series
from aictl.dashboard.hooks_status import _activity, _hook_event_counts, _post_tool_use_usage, _subagent_usage
from aictl.dashboard.node_views import node_view
from aictl.dashboard.projections.health import logical_stats, store_health
from aictl.dashboard.projections.history import HistoryScope
from aictl.dashboard.projections.metrics import (
    catalog_entries,
    sample_metrics,
    sample_page,
    sample_series,
    system_history,
    tool_history,
)
from aictl.dashboard.scoped_history import _reported_machine
from aictl.stores import Store
from aictl.stores.base import ReadResult, StoreError
from aictl.stores.kusto.maintenance import _logical_sample_count


def test_runtime_averages_per_node_before_summing(kusto_store):
    seed = kusto_store.insert
    for node, ts, pid, cpu in (("x", 11, 1, 5), ("x", 11, 2, 15), ("x", 12, 1, 40), ("y", 11, 1, 70)):
        seed("process_snapshots", node_id=node, ts=ts, pid=pid, tool="copilot-cli", cpu_percent=cpu)
    seed("system_snapshots", node_id="x", ts=12, daemon_pid=9, host_cpu_percent=10, active_processes=2)
    seed("system_snapshots", node_id="y", ts=13, active_processes=4)
    seed("session_processes", node_id="y", session_id="s", pid=9, joined_at=11, tool="copilot-cli", role="root")
    history = HistoryScope(kusto_store.history_store.reader, None)
    board = SimpleNamespace(history=history, f=Filters(since=10, until=20, buckets=2), tool_order=[])
    cpu, mem = _resource_series(board)
    # Bucket 1 has no row: each node's last sample holds until the end of the range.
    assert cpu["copilot-cli"] == [100, 110]
    assert mem["copilot-cli"] == [None, None]
    report = _reported_machine(history, None, 20)
    assert [(r["node_id"], r["active_processes"]) for r in report["hosts"]] == [("x", 2), ("y", None)]
    assert report["recorded_total"] == 1
    assert report["recorded_processes"][0]["node_id"] == "y"
    nodes = node_view(None, {"view": ["health"], "scope": ["fleet"]}, reader=history.reader, now=20)
    assert [r["status"] for r in nodes["rows"]] == ["reported", "reported"]


def test_resource_samples_hold_until_the_next_and_unmeasured_cpu_is_not_drawn(kusto_store):
    seed = kusto_store.insert
    # An unchanged sample is rewritten every 300 s: a value that held for the hour has a row each 5 minutes.
    for ts in range(10000, 13600, 300):
        seed("process_snapshots", node_id="x", ts=ts, pid=1, tool="copilot-cli", cpu_percent=12.5, memory_rss_mb=800)
    seed("process_snapshots", node_id="x", ts=10000, pid=2, tool="cursor", cpu_percent=0, memory_rss_mb=0)
    # The daemon stopped after one sample: it holds for 360 s, not for the rest of the hour.
    seed("process_snapshots", node_id="y", ts=10000, pid=3, tool="codex-cli", cpu_percent=4, memory_rss_mb=100)
    # A daemon from before the CPU fix stored 0 for every process: memory is drawn, CPU is not.
    for ts in (10000, 10300):
        seed("process_snapshots", node_id="old", ts=ts, pid=4, tool="claude-desktop", cpu_percent=0, memory_rss_mb=500)
    history = HistoryScope(kusto_store.history_store.reader, None)
    board = SimpleNamespace(history=history, f=Filters(since=10000, until=13600, buckets=60), tool_order=[])
    cpu, mem = _resource_series(board)
    assert cpu["copilot-cli"] == [12.5] * 60 and mem["copilot-cli"] == [800] * 60
    assert cpu["cursor"] == [0] * 6 + [None] * 54
    assert cpu["codex-cli"] == [4] * 6 + [None] * 54
    assert cpu["claude-desktop"] == [None] * 60
    assert mem["claude-desktop"] == [500] * 11 + [None] * 49


def test_history_catalog_samples_and_logical_totals(kusto_store):
    seed = kusto_store.insert
    reader = kusto_store.history_store.reader
    seed("system_snapshots", ts=100, cpu_percent=5, memory_used_mb=16)
    seed("process_snapshots", ts=100, pid=1, tool="copilot-cli", cpu_percent=7, memory_rss_mb=10)
    seed("process_snapshots", ts=100, pid=2, tool="copilot-cli", cpu_percent=4, memory_rss_mb=10)
    seed("files", path="a", size_bytes=5, tokens=1, _v="2026-01-01")
    seed("files", path="a", _deleted=True, _v="2026-01-02")
    seed("datapoint_catalog", key="test", tab="old", _v="2026-01-01")
    seed("datapoint_catalog", key="test", tab="new", _v="2026-01-02", dynamic_source=1, source_dynamic='{"a":1}')
    seed("metrics", ts=100, seq=1, metric="x", value=7, tags=json.dumps({"tool": "y"}))
    seed("metrics", ts=100, seq=2, metric="x", value=9, tags=json.dumps({"tool": "z"}))
    assert system_history(reader, since=99)["mem_mb"] == [16]
    assert tool_history(reader, since=99)["copilot-cli"]["cpu"] == [11]
    assert catalog_entries(reader, tab="old") == []
    assert catalog_entries(reader, tab="new")[0]["source_dynamic"] == {"a": 1}
    assert [r["value"] for r in sample_page(reader, since=99, tags={"tool": "y"})] == [7]
    assert sample_series(reader, since=99, requested_metric="x") == {"ts": [100, 100], "value": [7, 9]}
    assert sample_metrics(reader, metric_prefix="x") == [{"metric": "x", "count": 2, "latest_ts": 100, "last_value": 9}]
    stats = logical_stats(reader)
    assert (stats["metrics_count"], stats["file_store_count"]) == (1, 0)
    assert "samples_count" not in stats  # Exact sample counts are opt-in through db stats, not Health.
    seed("metrics", ts=100, seq=2, metric="x", value=12, _v="2026-01-03")
    seed("metrics", ts=300, seq=2, metric="x", value=13)
    assert _logical_sample_count(reader) == 3
    assert stats["file_size_bytes"] is None


def test_hooks_ignore_verification_and_merge_sources_without_counting_twice(kusto_store):
    seed = kusto_store.insert
    seed("events", ts=100, tool="copilot-cli", kind="hook:PostToolUse", detail='{"name":"Read"}')
    seed("events", ts=101, tool="copilot-cli", kind="hook:PostToolUse", detail='{"name":"Read","_aictl_verify":true}')
    seed("events", ts=102, tool="copilot-cli", kind="hook:SubagentStop", detail='{"agent_id":"a"}')
    seed("events", source_key="corrected", ts=103, kind="hook:PostToolUse", detail='{"name":"Old"}')
    seed("events", source_key="corrected", ts=103, kind="unrelated", _v="2026-01-02")
    seed("sessions", session_id="s", tool="copilot-cli")
    seed("tool_invocations", ts=100, session_id="s", tool_name="Read")
    seed("agents", agent_id="a", is_sidechain=1, tool="copilot-cli", started_at=100, ended_at=102)
    reader = kusto_store.history_store.reader
    rows = _activity(reader, 99)
    assert _hook_event_counts(rows)["total"] == 2
    assert _post_tool_use_usage(rows)[1]["total_calls_24h"] == 1
    assert _subagent_usage(rows)["stops_24h"] == 1
    assert _hook_event_counts(_activity(reader, 99, counts_only=True))["last_fire_ts"] == 102


def test_sequence_and_tool_pages_prune_keys_without_resurrecting_old_versions(kusto_store):
    seed = kusto_store.insert
    reader = kusto_store.history_store.reader
    for table, key in (("events", "source_key"), ("tool_invocations", "dedup_key")):
        dims = {"kind": "hook:PostToolUse"} if table == "events" else {"tool_name": "Bash", "is_error": 1}
        seed(table, **dims, **{key: "moved"}, ts=100, session_id="s")
        seed(table, **dims, **{key: "moved"}, ts=300, session_id="s", _v="2026-01-02")
        seed(table, **dims, **{key: "visible"}, ts=120, session_id="s")
    seed("tool_invocations", dedup_key="deleted", ts=130, session_id="s", is_error=1)
    seed("tool_invocations", dedup_key="deleted", _deleted=True, _v="2026-01-02")
    seed("events_text", source_key="visible", detail='{"session_id":"retained","message":"kept"}')
    seed("tool_invocations_text", dedup_key="visible", target="pytest", result_summary="kept")
    window = {"since": 99, "until": 200, "limit": 1}
    events = reader.read("sequence.event_log", window | {
        "requested_session": "retained", "requested_kinds": ["hook:PostToolUse"],
    })
    assert not events.truncated and [json.loads(row["detail"])["message"] for row in events.rows] == ["kept"]
    tools = reader.read("tools.activity_rows", window | {"kind_filter": "failures"})
    assert not tools.truncated and [row["result_summary"] for row in tools.rows] == ["kept"]


def test_confirmation_counts_take_each_call_once_by_its_winning_version(kusto_store):
    seed = kusto_store.insert
    reader = kusto_store.history_store.reader
    for key, confirm, wait in (("a", "approved", 300.0), ("b", "approved", 100.0), ("c", "approved", 0.0),
                               ("d", "denied", 50.0), ("e", "auto", 70.0), ("f", "pending", 20.0)):
        seed("tool_invocations", dedup_key=key, ts=100, session_id="s", tool_name="Bash", confirm=confirm,
             confirm_wait_ms=wait)
    # A newer version decides: pending became denied; a call that moved out of the window and a deleted call drop out.
    seed("tool_invocations", dedup_key="f", ts=100, session_id="s", tool_name="Bash", confirm="denied",
         confirm_wait_ms=900.0, _v="2026-01-02")
    seed("tool_invocations", dedup_key="moved", ts=100, session_id="s", tool_name="Bash", confirm="approved")
    seed("tool_invocations", dedup_key="moved", ts=300, session_id="s", tool_name="Bash", confirm="approved",
         _v="2026-01-02")
    seed("tool_invocations", dedup_key="gone", ts=100, session_id="s", tool_name="Bash", confirm="approved")
    seed("tool_invocations", dedup_key="gone", _deleted=True, _v="2026-01-02")
    seed("tool_invocations", dedup_key="none", ts=100, session_id="s", tool_name="Bash")
    rows = reader.read("tools.confirm_counts", {"since": 99.0, "until": 200.0}).rows
    assert {row["confirm"]: (row["calls"], sorted(row["waits"]), row["wait_count"]) for row in rows} == {
        "approved": (3, [100, 300], 2), "denied": (2, [50, 900], 2), "auto": (1, [], 0),
    }


def test_activity_rows_return_only_the_text_each_kind_uses(kusto_store):
    """Found on real data: 300,000 rows with all their text were read for a 30-day board."""
    seed = kusto_store.insert
    reader = kusto_store.history_store.reader
    seed("tool_invocations", dedup_key="ok", ts=100, session_id="s", tool_name="Bash", is_error=0, exit_code=0)
    seed("tool_invocations", dedup_key="bad", ts=101, session_id="s", tool_name="Bash", is_error=1)
    for key in ("ok", "bad"):
        seed("tool_invocations_text", dedup_key=key, target=f"pytest {key}", input=f"in {key}", result_summary="out")
    window = {"since": 99.0, "until": 200.0}
    loops = {row["target"]: row["input_signature"] for row in reader.read("tools.activity_rows", window | {"kind_filter": "loops"}).rows}
    # The loop finder compares the target and input of failing calls only.
    assert loops.keys() == {"", "pytest bad"} and loops[""] == "" and loops["pytest bad"]
    tests = reader.read("tools.activity_rows", window | {"kind_filter": "tests"}).rows
    assert [(row["target"], row["result_summary"], row["input_signature"]) for row in tests] == [
        ("pytest ok", "", ""), ("pytest bad", "", "")]
    failures = reader.read("tools.activity_rows", window | {"kind_filter": "failures"}).rows
    assert [(row["target"], row["result_summary"]) for row in failures] == [("pytest bad", "out")]


def test_full_session_event_page_resolves_winners_before_selecting_text(kusto_store):
    seed = kusto_store.insert
    reader = kusto_store.history_store.reader
    for key in ("direct", "inline", "retained", "reassigned", "overridden", "moved"):
        sid = "wanted" if key in ("direct", "moved") else "other"
        detail = '{"session_id":"wanted"}' if key in ("inline", "overridden") else "{}"
        seed("events", source_key=key, ts=100, kind=key, project="p", session_id=sid, detail=detail)
    seed("events", source_key="moved", ts=100, project="p", session_id="other", _v="2026-01-03")
    for key in ("retained", "reassigned"):
        seed("events_text", source_key=key, project="p", detail='{"session_id":"wanted"}')
    for key in ("reassigned", "overridden"):
        seed("events_text", source_key=key, project="p", detail='{"session_id":"other"}', _v="2026-01-03")
    # Identical keys in other projects and nodes cannot supply this event's text.
    seed("events_text", source_key="direct", project="foreign", detail='{"note":"wrong project"}')
    seed("events_text", source_key="direct", project="p", node_id="elsewhere", detail='{"note":"wrong node"}')
    page = reader.read("sequence.event_log", {"since": 0.0, "until": 1e10, "requested_session": "wanted", "limit": 4})
    assert not page.truncated
    assert {row["kind"]: json.loads(row["detail"]) for row in page.rows} == {
        "direct": {}, "inline": {"session_id": "wanted"}, "retained": {"session_id": "wanted"},
    }


@pytest.mark.parametrize(("view", "params", "count"), [
    ("files.inventory", {}, 6),
    ("tools.activity_rows", {"kind_filter": "loops", "since": 99, "until": 101}, 6),
    ("sequence.flow", {"requested_session": "s", "since": 99, "until": 101}, None),
])
def test_complete_history_continues_across_equal_keys_and_nulls(kusto_store, view, params, count):
    seed = kusto_store.insert
    for project in ("p", "q"):
        for i, stamp in enumerate((100.125, 100.125, None)):
            seed("files", project=project, path=f"/file{i}", last_changed=stamp, meta=project)
            seed("tool_invocations", project=project, id=1, ts=100.00000023841858, tool_name=f"{project}{i}",
                 session_id="s", dedup_key=f"k{i}")
    seed("files", node_id="another-node", path="/other-node")
    history = HistoryScope(kusto_store.history_store.reader, kusto_store.facts.node)
    expected = history.read(view, **params, limit=10)
    assert all("_page_cursor" not in row for row in expected)
    if count is None:  # the flow adds rows of the session to the six tool calls
        assert sum(row["row_type"] == "use" for row in expected) == 6
    else:
        assert len(expected) == count
    assert history.read(view, **params, limit=2) == expected
    assert history.read(view, **params, limit=2, page=True) == expected[:2]


def test_continuation_failure_never_returns_a_partial_projection():
    class Reader:
        def read(self, _view, _params):
            return ReadResult([{"path": "/first"}], truncated=True, next_page="same")
    with pytest.raises(StoreError, match="files.inventory.*continuation"):
        HistoryScope(Reader(), None).read("files.inventory", limit=1)


def test_health_exposes_per_table_writer_counters_and_missing_store():
    assert store_health(SimpleNamespace(history_store=Store()))["status"] == "no store configured"
    counters = {"queue_depth": 7, "rows_sent": 9, "rows_dropped": 3, "last_error": "Ingestion failed"}
    writer = SimpleNamespace(health=lambda: {"status": "active", "tables": {"events": counters}})
    assert store_health(SimpleNamespace(history_store=Store(writer=writer)))["writer"]["tables"]["events"] == counters
