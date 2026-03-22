# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Live observability commands."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import click

from ..monitoring.config import MonitorConfig
from ..monitoring.runtime import MonitorRuntime


@click.group()
def monitor():
    """Passive live observability for AI tool usage."""


@monitor.command("live")
@click.option("-r", "--root", "root_dir", default=".", help="Workspace root")
@click.option("--interval", type=float, default=1.0, help="Refresh interval in seconds")
@click.option("--duration", type=float, default=None, help="Optional total runtime in seconds")
@click.option("--once", is_flag=True, help="Capture briefly and print a single snapshot")
@click.option("--json", "as_json", is_flag=True, help="Emit JSON snapshots instead of text")
@click.option("--no-files", is_flag=True, help="Disable filesystem activity monitoring")
@click.option("--no-telemetry", is_flag=True, help="Disable structured telemetry scanning")
@click.option("--debug-network", is_flag=True, help="Log nettop samples and PID resolution for debugging")
def live(root_dir, interval, duration, once, as_json, no_files, no_telemetry, debug_network):
    """Run the live monitor."""

    if debug_network:
        import logging
        logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s")

    config = MonitorConfig.for_root(
        Path(root_dir).resolve(),
        sample_interval=interval,
        refresh_interval=interval,
        process_interval=interval,
        network_interval=interval,
        telemetry_interval=max(interval * 5, 5.0),
        filesystem_enabled=not no_files,
        telemetry_enabled=not no_telemetry,
        json_output=as_json,
        once=once,
        duration_seconds=duration,
        debug_network=debug_network,
    )
    runtime = MonitorRuntime(config)
    try:
        raise SystemExit(asyncio.run(runtime.run_live()))
    except KeyboardInterrupt:
        raise SystemExit(130)


@monitor.command("doctor")
@click.option("-r", "--root", "root_dir", default=".", help="Workspace root")
@click.option("--json", "as_json", is_flag=True, help="Emit JSON instead of human output")
@click.option("--sample-seconds", type=float, default=2.0, help="How long to warm up collectors")
def doctor(root_dir, as_json, sample_seconds):
    """Show platform adapters, paths, and a short sample snapshot."""

    config = MonitorConfig.for_root(
        Path(root_dir).resolve(),
        sample_interval=1.0,
        refresh_interval=1.0,
        process_interval=1.0,
        network_interval=1.0,
        telemetry_interval=5.0,
        json_output=as_json,
        once=True,
    )
    runtime = MonitorRuntime(config)
    snapshot = asyncio.run(runtime.snapshot_after(max(sample_seconds, 1.0)))
    payload = {
        "platform": snapshot.platform,
        "workspace_paths": snapshot.workspace_paths,
        "state_paths": snapshot.state_paths,
        "collectors": runtime.collector_plan().names,
        "diagnostics": snapshot.diagnostics,
        "tools": snapshot.tools,
    }

    if as_json:
        click.echo(json.dumps(payload, indent=2))
        return

    click.echo(f"Platform: {payload['platform']}")
    click.echo(f"Workspace: {', '.join(payload['workspace_paths'])}")
    click.echo("Collectors:")
    for collector_name in payload["collectors"]:
        click.echo(f"  {collector_name}")
    click.echo("State paths:")
    for state_path in payload["state_paths"]:
        click.echo(f"  {state_path}")
    click.echo("")
    click.echo("Diagnostics:")
    if not payload["diagnostics"]:
        click.echo("  (no collector status yet)")
    else:
        for name, diagnostic in payload["diagnostics"].items():
            click.echo(
                f"  {name}: {diagnostic.get('status', 'unknown')} [{diagnostic.get('mode', 'unknown')}]"
                f" - {diagnostic.get('detail', '')}"
            )
    if payload["tools"]:
        click.echo("")
        click.echo("Detected tools:")
        for tool in payload["tools"]:
            click.echo(f"  {tool['label']}: {tool['pid_count']} pid(s), confidence {tool['confidence']:.2f}")
