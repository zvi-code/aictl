import json
from types import SimpleNamespace

from aictl.dashboard.board_api import Filters, _resource_series
from aictl.dashboard.scoped_history import _reported_machine
from aictl.dashboard.hooks_status import _activity, _hook_event_counts, _post_tool_use_usage, _subagent_usage
from aictl.dashboard.node_views import node_view
from aictl.dashboard.projections.health import logical_stats, store_health
from aictl.dashboard.projections.history import HistoryScope
from aictl.dashboard.projections.metrics import catalog_entries, sample_metrics, sample_page, sample_series, system_history, tool_history
from aictl.stores import Store


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
    assert cpu["copilot-cli"] == [100, None]
    assert mem["copilot-cli"] == [None, None]
    report = _reported_machine(history, None, 20)
    assert [(r["node_id"], r["active_processes"]) for r in report["hosts"]] == [("x", 2), ("y", None)]
    assert report["recorded_total"] == 1
    assert report["recorded_processes"][0]["node_id"] == "y"
    nodes = node_view(None, {"view": ["health"], "scope": ["fleet"]}, reader=history.reader, now=20)
    assert [r["status"] for r in nodes["rows"]] == ["reported", "reported"]


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
    assert (stats["metrics_count"], stats["samples_count"], stats["file_store_count"]) == (1, 2, 0)
    assert stats["file_size_bytes"] is None


def test_hooks_ignore_verification_and_merge_sources_without_counting_twice(kusto_store):
    seed = kusto_store.insert
    seed("events", ts=100, tool="copilot-cli", kind="hook:PostToolUse", detail='{"name":"Read"}')
    seed("events", ts=101, tool="copilot-cli", kind="hook:PostToolUse", detail='{"name":"Read","_aictl_verify":true}')
    seed("events", ts=102, tool="copilot-cli", kind="hook:SubagentStop", detail='{"agent_id":"a"}')
    seed("sessions", session_id="s", tool="copilot-cli")
    seed("tool_invocations", ts=100, session_id="s", tool_name="Read")
    seed("agents", agent_id="a", is_sidechain=1, tool="copilot-cli", started_at=100, ended_at=102)
    reader = kusto_store.history_store.reader
    rows = _activity(reader, 99)
    assert _hook_event_counts(rows)["total"] == 2
    assert _post_tool_use_usage(rows)[1]["total_calls_24h"] == 1
    assert _subagent_usage(rows)["stops_24h"] == 1
    assert _hook_event_counts(_activity(reader, 99, counts_only=True))["last_fire_ts"] == 102


def test_health_exposes_per_table_writer_counters_and_missing_store():
    assert store_health(SimpleNamespace(history_store=Store()))["status"] == "no store configured"
    counters = {"queue_depth": 7, "rows_sent": 9, "rows_dropped": 3, "last_error": "Ingestion failed"}
    writer = SimpleNamespace(health=lambda: {"status": "active", "tables": {"events": counters}})
    assert store_health(SimpleNamespace(history_store=Store(writer=writer)))["writer"]["tables"]["events"] == counters
