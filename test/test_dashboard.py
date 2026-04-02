"""Tests for dashboard collector, SSE contract, and live-monitor integration."""

from __future__ import annotations

import json

from aictl.dashboard.models import DashboardSnapshot, DashboardTool
from aictl.orchestrator import collect
from aictl.dashboard.web_server import build_sse_summary, _DashboardHandler
from aictl.orchestrator import SnapshotStore
from aictl.storage import EventRow
from aictl.tools import ResourceFile, ToolResources


def test_dashboard_snapshot_aggregates_live_metrics():
    snapshot = DashboardSnapshot(
        timestamp=1.0,
        root="/tmp/project",
        tools=[
            DashboardTool(
                tool="copilot-cli",
                label="Copilot CLI",
                files=[ResourceFile(path="/tmp/project/.copilot/session.json", kind="session", size=4096, tokens=900)],
                live={
                    "tool": "copilot-cli",
                    "label": "Copilot CLI",
                    "session_count": 2,
                    "pid_count": 3,
                    "inbound_bytes": 2048,
                    "outbound_bytes": 8192,
                    "inbound_rate_bps": 256.5,
                    "outbound_rate_bps": 1024.25,
                    "files_touched": 4,
                    "file_events": 7,
                    "token_estimate": {"input_tokens": 1500, "output_tokens": 400, "confidence": 0.6, "source": "telemetry"},
                    "mcp": {"detected": True, "confidence": 0.7, "loops": 2},
                    "confidence": 0.65,
                    "workspaces": ["/tmp/project"],
                },
            ),
            DashboardTool(
                tool="aictl",
                label="aictl",
                files=[ResourceFile(path="/tmp/project/.aictx/state.txt", kind="context", size=1024, tokens=500)],
            ),
        ],
    )

    assert snapshot.total_files == 1
    assert snapshot.total_tokens == 900
    assert snapshot.total_live_tools == 1
    assert snapshot.total_live_sessions == 2
    assert snapshot.total_live_estimated_tokens == 1900
    assert snapshot.total_live_inbound_rate_bps == 256.5
    assert snapshot.total_live_outbound_rate_bps == 1024.25
    assert snapshot.total_live_files_touched == 4


def test_collect_merges_csv_discovery_with_live_monitor(monkeypatch, tmp_path):
    discovered = [
        ToolResources(
            tool="copilot-cli",
            label="Copilot CLI",
            files=[ResourceFile(path=str(tmp_path / ".copilot" / "state.json"), kind="session", size=128, tokens=32)],
        )
    ]

    monkeypatch.setattr("aictl.orchestrator.discover_all", lambda *args, **kwargs: discovered)
    monkeypatch.setattr("aictl.orchestrator.collect_agent_memory", lambda root: [])
    monkeypatch.setattr("aictl.orchestrator.collect_mcp_status", lambda discovered: [])
    monkeypatch.setattr("aictl.orchestrator.collect_tool_telemetry", lambda root: [])
    monkeypatch.setattr("aictl.orchestrator.collect_tool_configs", lambda root: [])

    live_monitor_data = {
        "platform": "macos",
        "diagnostics": {"process:psutil": {"status": "active", "mode": "polling", "detail": "ok"}},
        "workspace_paths": [str(tmp_path)],
        "state_paths": [str(tmp_path / ".copilot")],
        "tools": [
            {
                "tool": "copilot-cli",
                "label": "Copilot CLI",
                "session_count": 1,
                "pid_count": 1,
                "inbound_bytes": 100,
                "outbound_bytes": 400,
                "inbound_rate_bps": 20.0,
                "outbound_rate_bps": 80.0,
                "files_touched": 2,
                "file_events": 2,
                "cpu_percent": 12.0,
                "peak_cpu_percent": 25.0,
                "token_estimate": {"input_tokens": 1000, "output_tokens": 250, "confidence": 0.6, "source": "telemetry"},
                "mcp": {"detected": False, "confidence": 0.2, "loops": 0},
                "confidence": 0.5,
                "sources": ["telemetry"],
                "workspaces": [str(tmp_path)],
            },
            {
                "tool": "codex-cli",
                "label": "Codex CLI",
                "session_count": 1,
                "pid_count": 1,
                "inbound_bytes": 50,
                "outbound_bytes": 200,
                "inbound_rate_bps": 10.0,
                "outbound_rate_bps": 40.0,
                "files_touched": 1,
                "file_events": 1,
                "cpu_percent": 6.0,
                "peak_cpu_percent": 10.0,
                "token_estimate": {"input_tokens": 200, "output_tokens": 80, "confidence": 0.4, "source": "network-inference"},
                "mcp": {"detected": False, "confidence": 0.1, "loops": 0},
                "confidence": 0.3,
                "sources": ["network-inference"],
                "workspaces": [str(tmp_path)],
            },
        ],
    }

    snapshot = collect(tmp_path, include_processes=True, _live_monitor_override=live_monitor_data)

    assert snapshot.live_monitor["platform"] == "macos"
    tools = {tool.tool: tool for tool in snapshot.tools}
    assert tools["copilot-cli"].files
    assert tools["copilot-cli"].live["session_count"] == 1
    assert tools["codex-cli"].label == "Codex CLI"
    assert tools["codex-cli"].live["outbound_rate_bps"] == 40.0
    assert snapshot.total_live_tools == 2
    assert snapshot.total_live_estimated_tokens == 1530


def test_snapshot_store_history_tracks_live_rates():
    snapshot = DashboardSnapshot(
        timestamp=10.0,
        root="/tmp/project",
        tools=[
            DashboardTool(
                tool="copilot-vscode",
                label="Copilot (VS Code)",
                live={
                    "tool": "copilot-vscode",
                    "label": "Copilot (VS Code)",
                    "session_count": 1,
                    "pid_count": 1,
                    "inbound_bytes": 500,
                    "outbound_bytes": 1000,
                    "inbound_rate_bps": 55.5,
                    "outbound_rate_bps": 88.8,
                    "files_touched": 1,
                    "file_events": 2,
                    "token_estimate": {"input_tokens": 100, "output_tokens": 25, "confidence": 0.4, "source": "network-inference"},
                    "mcp": {"detected": False, "confidence": 0.0, "loops": 0},
                    "confidence": 0.3,
                    "workspaces": ["/tmp/project"],
                },
            )
        ],
    )
    store = SnapshotStore()

    store.update(snapshot)
    history = json.loads(store.history_json())

    assert history["live_sessions"] == [1]
    assert history["live_tokens"] == [125]
    assert history["live_in_rate"] == [55.5]
    assert history["live_out_rate"] == [88.8]


# ─── SSE ↔ Snapshot contract tests ──────────────────────────────

def _make_rich_snapshot():
    """Build a snapshot with data in every field to exercise the SSE contract."""
    return DashboardSnapshot(
        timestamp=1.0,
        root="/tmp/project",
        tools=[
            DashboardTool(
                tool="claude-code",
                label="Claude Code",
                vendor="anthropic",
                host="cli",
                files=[ResourceFile(path="/tmp/.claude/CLAUDE.md", kind="instructions", size=2048, tokens=500)],
                processes=[{"pid": 100, "name": "claude", "cpu_pct": "12.3", "mem_mb": "450"}],
                mcp_servers=[{"name": "mcp-fs", "status": "running"}],
                live={
                    "tool": "claude-code", "label": "Claude Code",
                    "session_count": 1, "pid_count": 2,
                    "inbound_bytes": 1024, "outbound_bytes": 4096,
                    "inbound_rate_bps": 100.0, "outbound_rate_bps": 400.0,
                    "files_touched": 3, "file_events": 5,
                    "cpu_percent": 12.0, "peak_cpu_percent": 25.0,
                    "token_estimate": {"input_tokens": 5000, "output_tokens": 1000, "confidence": 0.8, "source": "telemetry"},
                    "mcp": {"detected": False, "confidence": 0.0, "loops": 0},
                    "confidence": 0.8, "workspaces": ["/tmp/project"],
                },
                token_breakdown={"telemetry": {"input_tokens": 5000, "output_tokens": 1000}},
            ),
        ],
        agent_memory=[{"file": "/tmp/.claude/memory.md", "tokens": 200}],
        mcp_detail=[{"name": "mcp-fs", "tool": "claude-code", "status": "running", "cpu_pct": "1.2", "mem_mb": "30"}],
        live_monitor={"diagnostics": {"process:psutil": {"status": "active", "mode": "polling", "detail": "ok"}}},
        tool_telemetry=[{"tool": "claude-code", "input_tokens": 5000, "output_tokens": 1000, "source": "stats-cache"}],
        tool_configs=[{"tool": "claude-code", "model": "claude-sonnet-4.6"}],
        events=[{"ts": 1.0, "kind": "session_start", "tool": "claude-code", "detail": {}}],
    )


def test_sse_summary_covers_all_snapshot_top_level_keys():
    """Every top-level key in DashboardSnapshot.to_dict() must appear in the SSE summary.

    This prevents the class of bug where a new field is added to the snapshot
    but forgotten in the SSE summary, causing stale data in the frontend.
    """
    snap = _make_rich_snapshot()
    full = snap.to_dict()
    sse = build_sse_summary(snap)

    missing = set(full.keys()) - set(sse.keys()) - {"_sse_summary"}
    assert not missing, (
        f"Snapshot keys missing from SSE summary (will go stale in frontend): {missing}\n"
        f"Add them to build_sse_summary() in web_server.py"
    )


def test_sse_summary_preserves_live_monitor():
    """live_monitor (diagnostics) must be in SSE — this was the original bug."""
    snap = _make_rich_snapshot()
    sse = build_sse_summary(snap)
    assert "live_monitor" in sse
    assert sse["live_monitor"].get("diagnostics")


def test_sse_summary_preserves_tool_telemetry():
    """tool_telemetry must be in SSE so Budget/Events tabs stay fresh."""
    snap = _make_rich_snapshot()
    sse = build_sse_summary(snap)
    assert "tool_telemetry" in sse
    assert len(sse["tool_telemetry"]) == 1
    assert sse["tool_telemetry"][0]["tool"] == "claude-code"


def test_sse_summary_preserves_tool_configs():
    """tool_configs must be in SSE so ToolCard ConfigSection stays fresh."""
    snap = _make_rich_snapshot()
    sse = build_sse_summary(snap)
    assert "tool_configs" in sse
    assert len(sse["tool_configs"]) == 1


def test_sse_summary_includes_vendor_host_per_tool():
    """Per-tool vendor/host must be in SSE so grouping works after merge."""
    snap = _make_rich_snapshot()
    sse = build_sse_summary(snap)
    tool = sse["tools"][0]
    assert tool["vendor"] == "anthropic"
    assert tool["host"] == "cli"


def test_sse_summary_is_json_serializable():
    """SSE summary must be JSON-serializable (sent over the wire)."""
    snap = _make_rich_snapshot()
    sse = build_sse_summary(snap)
    data = json.dumps(sse)
    roundtrip = json.loads(data)
    assert roundtrip["timestamp"] == 1.0
    assert roundtrip["_sse_summary"] is True


# ─── collect() sink emit path tests ─────────────────────────────
#
# Root cause of the tool_configs_list bug: the entire `if _sink:` block in
# collect() (orchestrator.py lines 228–291) was never exercised by any test.
# Every existing test passes _sink=None (the default), so the variable rename
# from `tool_configs_list` → `tool_configs` introduced a NameError that no
# test could detect.
#
# Additional similar gaps (currently untested with a real sink):
#   - Discovery emit path  (lines 228–253): if _sink and _discovered_override is None
#   - Memory emit path     (lines 268–271): for m in agent_memory
#   - MCP detail emit path (lines 272–276): for s in mcp_detail
#   - Telemetry emit path  (lines 277–286): for r in telemetry_reports
#
# Each test below exercises one of these code paths with a mock sink so that
# any future variable rename or deletion fails loudly here rather than at
# runtime.


class _MockSink:
    """Minimal sink double recording all emit() and emit_if_changed() calls."""
    def __init__(self):
        self.emitted: list[tuple] = []
        self.changed: list[tuple] = []

    def emit(self, metric, value, tags, ts=None):
        self.emitted.append((metric, value, dict(tags)))

    def emit_if_changed(self, metric, value, tags, ts=None):
        self.changed.append((metric, value, dict(tags)))


def _base_monkeypatches(monkeypatch):
    """Patch all external calls in collect() to return empty/no-op."""
    monkeypatch.setattr("aictl.orchestrator.discover_all", lambda *a, **kw: [])
    monkeypatch.setattr("aictl.orchestrator.collect_agent_memory", lambda root: [])
    monkeypatch.setattr("aictl.orchestrator.collect_mcp_status", lambda d: [])
    monkeypatch.setattr("aictl.orchestrator.collect_tool_telemetry", lambda root: [])
    monkeypatch.setattr("aictl.orchestrator.scan_agent_teams", lambda root: [])
    monkeypatch.setattr("aictl.orchestrator.collect_tool_configs", lambda root: [])


def test_collect_emits_tool_config_model_through_sink(monkeypatch, tmp_path):
    """collect() must emit aictl.config.model for each ToolConfig with tool+model via _sink.

    THIS TEST IS EXPECTED TO FAIL with:
        NameError: name 'tool_configs_list' is not defined
    because the refactor renamed the variable but the loop on line 288 still
    references the old name.  Fix: change `tool_configs_list` → `tool_configs`
    on that line.
    """
    from aictl.monitoring.tool_config import ToolConfig

    _base_monkeypatches(monkeypatch)
    monkeypatch.setattr(
        "aictl.orchestrator.collect_tool_configs",
        lambda root: [ToolConfig(tool="claude-code", model="claude-sonnet-4.6")],
    )

    sink = _MockSink()
    collect(tmp_path, _sink=sink)

    config_model = [
        (metric, tags) for metric, _val, tags in sink.changed
        if "config.model" in metric
    ]
    assert len(config_model) == 1, "Expected exactly one aictl.config.model emit"
    assert config_model[0][1]["aictl.tool"] == "claude-code"
    assert config_model[0][1]["gen_ai.request.model"] == "claude-sonnet-4.6"


def test_collect_emits_memory_tokens_through_sink(monkeypatch, tmp_path):
    """collect() must emit aictl.memory.tokens for each MemoryEntry with a file path."""
    from aictl.tools import MemoryEntry

    _base_monkeypatches(monkeypatch)
    monkeypatch.setattr(
        "aictl.orchestrator.collect_agent_memory",
        lambda root: [MemoryEntry(source="claude-memory", profile="_always",
                                  file="/tmp/.claude/memory.md", tokens=300)],
    )

    sink = _MockSink()
    collect(tmp_path, _sink=sink)

    memory_metrics = [
        (metric, tags) for metric, _val, tags in sink.changed
        if "memory.tokens" in metric
    ]
    assert len(memory_metrics) == 1
    assert memory_metrics[0][1]["aictl.source"] == "claude-memory"


def test_collect_emits_mcp_detail_status_through_sink(monkeypatch, tmp_path):
    """collect() must emit aictl.mcp.detail.status for each named McpServerInfo."""
    from aictl.tools import McpServerInfo

    _base_monkeypatches(monkeypatch)
    monkeypatch.setattr(
        "aictl.orchestrator.collect_mcp_status",
        lambda d: [McpServerInfo(name="mcp-fs", tool="claude-code", status="running")],
    )

    sink = _MockSink()
    collect(tmp_path, _sink=sink)

    mcp_metrics = [
        (metric, val, tags) for metric, val, tags in sink.changed
        if "mcp.detail.status" in metric
    ]
    assert len(mcp_metrics) == 1
    assert mcp_metrics[0][1] == 1.0  # status="running" → 1.0
    assert mcp_metrics[0][2]["aictl.mcp.server"] == "mcp-fs"
    assert mcp_metrics[0][2]["aictl.tool"] == "claude-code"


def test_collect_emits_telemetry_tokens_through_sink(monkeypatch, tmp_path):
    """collect() must emit gen_ai.client.token.usage.verified for each telemetry report."""
    from aictl.monitoring.tool_telemetry import ToolTelemetryReport

    _base_monkeypatches(monkeypatch)
    report = ToolTelemetryReport(
        tool="copilot-cli", source="events-jsonl", confidence=0.9,
        input_tokens=1000, output_tokens=250,
    )
    monkeypatch.setattr("aictl.orchestrator.collect_tool_telemetry", lambda root: [report])

    sink = _MockSink()
    collect(tmp_path, _sink=sink)

    token_metrics = [
        (metric, val, tags) for metric, val, tags in sink.emitted
        if "token.usage.verified" in metric
    ]
    assert len(token_metrics) == 2  # one input, one output
    types = {tags["gen_ai.token.type"]: val for _m, val, tags in token_metrics}
    assert types["input"] == 1000.0
    assert types["output"] == 250.0


def test_collect_emits_discovery_metrics_through_sink(monkeypatch, tmp_path):
    """collect() must emit aictl.discovery.* for each discovered tool when _sink provided."""
    _base_monkeypatches(monkeypatch)
    monkeypatch.setattr(
        "aictl.orchestrator.discover_all",
        lambda *a, **kw: [
            ToolResources(
                tool="copilot-cli",
                label="Copilot CLI",
                files=[ResourceFile(path="/tmp/.copilot/state.json", kind="session",
                                    size=512, tokens=64)],
            )
        ],
    )

    sink = _MockSink()
    collect(tmp_path, _sink=sink)

    discovery_files = [
        (metric, val, tags) for metric, val, tags in sink.changed
        if "discovery.files" in metric
    ]
    assert len(discovery_files) == 1
    assert discovery_files[0][1] == 1.0  # one file
    assert discovery_files[0][2]["tool"] == "copilot-cli"


# ── _attribute_api_to_turns filter ────────────────────────────────

class TestAttributeApiToTurns:
    """Regression: _attribute_api_to_turns must skip non-api OTel events."""

    @staticmethod
    def _make_turn(ts):
        return {
            "ts": ts, "type": "user_message",
            "tokens": {"input": 0, "output": 0,
                       "cache_read": 0, "cache_creation": 0},
            "model": "", "api_calls": 0, "duration_ms": 0, "end_ts": ts,
        }

    def test_only_api_request_events_attributed(self):
        turn = self._make_turn(1.0)
        events = [
            EventRow(ts=2.0, tool="claude-code", kind="otel:api_request",
                     detail={"input_tokens": 100, "output_tokens": 50,
                             "model": "opus"}),
            EventRow(ts=3.0, tool="claude-code", kind="otel:tool_decision",
                     detail={"tool_name": "Bash"}),
            EventRow(ts=4.0, tool="claude-code", kind="otel:tool_result",
                     detail={"tool_name": "Bash", "success": True}),
            EventRow(ts=5.0, tool="claude-code", kind="otel:user_prompt",
                     detail={"prompt": "hello"}),
        ]
        _DashboardHandler._attribute_api_to_turns([turn], events)
        assert turn["tokens"]["input"] == 100
        assert turn["tokens"]["output"] == 50
        assert turn["api_calls"] == 1  # only api_request counted
        assert turn["model"] == "opus"

    def test_chat_span_events_attributed(self):
        """OTel chat spans (Copilot) should also be attributed."""
        turn = self._make_turn(1.0)
        events = [
            EventRow(ts=2.0, tool="copilot-vscode",
                     kind="otel:chat claude-opus-4.6",
                     detail={"input_tokens": 200, "output_tokens": 80}),
        ]
        _DashboardHandler._attribute_api_to_turns([turn], events)
        assert turn["tokens"]["input"] == 200
        assert turn["api_calls"] == 1
