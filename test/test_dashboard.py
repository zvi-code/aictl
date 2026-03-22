"""Tests for dashboard collector, SSE contract, and live-monitor integration."""

from __future__ import annotations

import json

from aictl.dashboard.collector import DashboardSnapshot, DashboardTool, collect
from aictl.dashboard.web_server import build_sse_summary
from aictl.store import SnapshotStore
from aictl.discovery import ResourceFile, ToolResources


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
