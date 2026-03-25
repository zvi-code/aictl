"""Tests for live monitoring."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock

from click.testing import CliRunner

from aictl.cli import main
from aictl.monitoring.config import MonitorConfig
from aictl.monitoring.correlator import MonitorSnapshot, SessionCorrelator
from aictl.monitoring.events import EventKind, ProcessInfo, UnifiedEvent
from aictl.monitoring.process_classifier import classify_process
from aictl.monitoring.runtime import CollectorPlan
from aictl.monitoring.collectors.network.linux import parse_ss_snapshot
from aictl.monitoring.collectors.network.macos import parse_nettop_line


def test_process_classifier_distinguishes_codex_from_vscode():
    codex = ProcessInfo(
        pid=1,
        ppid=0,
        name="codex",
        exe="/usr/local/bin/codex",
        cmdline=("codex",),
        username=None,
        cwd=None,
    )
    code_helper = ProcessInfo(
        pid=2,
        ppid=0,
        name="Code Helper (Plugin)",
        exe=None,
        cmdline=("Code Helper (Plugin)",),
        username=None,
        cwd=None,
    )
    claude_desktop = ProcessInfo(
        pid=3,
        ppid=0,
        name="Claude",
        exe="/Applications/Claude.app/Contents/MacOS/Claude",
        cmdline=("/Applications/Claude.app/Contents/MacOS/Claude",),
        username=None,
        cwd=None,
    )

    assert classify_process(codex).tool == "codex-cli"
    assert classify_process(code_helper).tool == "copilot-vscode"
    assert classify_process(claude_desktop).tool == "claude-desktop"


def test_parse_nettop_line_emits_deltas():
    previous = {71420: (1000, 2000)}
    line = "20:19:31.649777,Code Helper.71420,,,1500,2800,0,0,0,,,,,,,,,,,,"

    event = parse_nettop_line(line, previous)

    assert event is not None
    assert event.kind == EventKind.NETWORK_SAMPLE
    assert event.pid == 71420
    assert event.metrics["bytes_in"] == 500
    assert event.metrics["bytes_out"] == 800


def test_parse_ss_snapshot(monkeypatch):
    sample = "\n".join(
        [
            'ESTAB 0 0 127.0.0.1:12345 104.18.32.47:443 users:(("codex",pid=42,fd=29))',
            "\t cubic wscale:7,7 rto:201 rtt:0.677/0.207 ato:40 mss:1448 pmtu:1500 rcvmss:536 advmss:1448 cwnd:10 bytes_sent:2048 bytes_acked:2048 bytes_received:1024",
        ]
    )
    monkeypatch.setattr(
        "aictl.monitoring.collectors.network.linux.subprocess.run",
        lambda *args, **kwargs: Mock(returncode=0, stdout=sample),
    )

    snapshot = parse_ss_snapshot()

    assert snapshot[(42, "127.0.0.1:12345", "104.18.32.47:443")] == (1024, 2048, "codex")


def test_correlator_builds_report(tmp_path):
    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config, workspace_sizes={str(tmp_path): 5 * 1024 * 1024})

    process = ProcessInfo(
        pid=101,
        ppid=1,
        name="copilot",
        exe="/usr/local/bin/copilot",
        cmdline=("copilot", "chat"),
        username="user",
        cwd=str(tmp_path),
    )
    correlator.ingest(
        UnifiedEvent(
            kind=EventKind.PROCESS_START,
            source="process:psutil",
            pid=101,
            process=process,
            metrics={"cpu_percent": 32.0},
        )
    )
    correlator.ingest(
        UnifiedEvent(
            kind=EventKind.NETWORK_SAMPLE,
            source="network:test",
            pid=101,
            metrics={"bytes_in": 6000, "bytes_out": 24000},
        )
    )
    correlator.ingest(
        UnifiedEvent(
            kind=EventKind.FILE_ACTIVITY,
            source="filesystem:test",
            tool_hint="copilot-cli",
            workspace=str(tmp_path),
            metrics={"growth_bytes": 4096},
            payload={"path": str(tmp_path / ".copilot" / "session-state" / "one.json")},
        )
    )
    correlator.ingest(
        UnifiedEvent(
            kind=EventKind.TELEMETRY,
            source="telemetry:test",
            tool_hint="copilot-cli",
            metrics={"input_tokens": 1200, "output_tokens": 400},
        )
    )

    reports = correlator.tool_reports()

    assert len(reports) == 1
    report = reports[0]
    assert report.tool == "copilot-cli"
    assert report.pid_count == 1
    assert report.workspace_size_mb == 5.0
    assert report.token_estimate.source == "telemetry"
    assert report.token_estimate.input_tokens == 1200
    assert report.files_touched == 1


def test_monitor_doctor_cli_json(monkeypatch, tmp_path):
    class DummyRuntime:
        def __init__(self, config):
            self.config = config

        async def snapshot_after(self, seconds):
            return MonitorSnapshot(
                generated_at=0.0,
                platform="macos",
                diagnostics={
                    "process:psutil": {
                        "status": "active",
                        "mode": "polling",
                        "detail": "ok",
                    }
                },
                tools=[],
                workspace_paths=[str(tmp_path)],
                state_paths=[],
            )

        def collector_plan(self):
            return CollectorPlan(names=["process:psutil", "network:macos-bpf"])

    monkeypatch.setattr("aictl.commands.monitor.MonitorRuntime", DummyRuntime)

    result = CliRunner().invoke(main, ["monitor", "doctor", "-r", str(tmp_path), "--json"])

    assert result.exit_code == 0
    assert '"platform": "macos"' in result.output
    assert '"process:psutil"' in result.output
