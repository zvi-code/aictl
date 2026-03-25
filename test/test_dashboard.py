"""Tests for dashboard collector and live-monitor integration."""

from __future__ import annotations

import json

from aictl.dashboard.collector import DashboardSnapshot, DashboardTool, collect
from aictl.dashboard.web_server import _SnapshotStore
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

    monkeypatch.setattr("aictl.dashboard.collector.discover_all", lambda *args, **kwargs: discovered)
    monkeypatch.setattr("aictl.dashboard.collector.collect_agent_memory", lambda root: [])
    monkeypatch.setattr("aictl.dashboard.collector.collect_mcp_status", lambda discovered: [])
    monkeypatch.setattr(
        "aictl.dashboard.collector._collect_live_monitor",
        lambda root, seconds: {
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
        },
    )

    snapshot = collect(tmp_path, include_processes=True, include_live_monitor=True, live_sample_seconds=1.0)

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
    store = _SnapshotStore()

    store.update(snapshot)
    history = json.loads(store.history_json())

    assert history["live_sessions"] == [1]
    assert history["live_tokens"] == [125]
    assert history["live_in_rate"] == [55.5]
    assert history["live_out_rate"] == [88.8]
