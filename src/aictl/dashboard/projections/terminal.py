"""Local terminal details and their presentation model."""

from __future__ import annotations

import time
from dataclasses import asdict
from pathlib import Path
from typing import TYPE_CHECKING

from ...stores.base import StoreConfigurationError
from ...tools import TOOL_LABELS, ProcessInfo
from ..models import DashboardSnapshot
from .history import event_params, event_rows, local_scope
from .metrics import sample_metrics, sample_series

if TYPE_CHECKING:
    from ...client import EventRow, LiveState, Row, SessionDetail, TerminalResources


def terminal_detail(view, params, snapshot, reader, is_allowed, now):
    def one(name, default=""):
        return (params.get(name) or [default])[0]

    if view == "events":
        limit = max(1, min(int(one("limit", "100")), 2000))
        filters = event_params(since=now - 3600, until=now)
        try:
            rows = event_rows(reader.read("events.page", {**local_scope(), **filters, "limit": limit}))
        except StoreConfigurationError:
            rows = []
        return 200, rows[::-1]
    if view == "metrics":
        if metric := one("metric"):
            try:
                return 200, sample_series(reader, requested_metric=metric, since=float(one("since", now - 3600)))
            except StoreConfigurationError:
                return 200, {"ts": [], "value": []}
        try:
            return 200, sample_metrics(reader, metric_prefix="")
        except StoreConfigurationError:
            return 200, []
    if view == "file":
        path = one("path")
        if not path:
            return 400, {"error": "Missing path"}
        if not is_allowed or not is_allowed(path):
            return 403, {"error": "File is not in the discovered resource set"}
        try:
            return 200, preview_file(path)
        except FileNotFoundError:
            return 404, {"error": "File not found"}
        except OSError:
            return 400, {"error": "Cannot read file"}
    if snapshot is None:
        return 503, {"error": "No terminal resources yet"}
    if view == "sessions":
        return 200, snapshot.sessions
    metadata = {k: v for k, v in snapshot.live_monitor.items() if k not in {"sessions", "events"}}
    payload = {
        "timestamp": snapshot.timestamp,
        "root": snapshot.root,
        "tools": [asdict(tool) for tool in snapshot.tools],
        "agent_memory": [asdict(entry) for entry in snapshot.agent_memory],
        "mcp_detail": [asdict(server) for server in snapshot.mcp_detail],
        "tool_configs": snapshot.tool_configs,
        "tool_telemetry": snapshot.tool_telemetry,
        "live_monitor": metadata if one("export") == "1" else {"diagnostics": metadata.get("diagnostics", {})},
        "cpu_cores": snapshot.cpu_cores,
        "cpu_per_core": snapshot.cpu_per_core,
    }
    if one("export") == "1":
        from ..models import _slim_agent_teams

        payload["agent_teams"] = _slim_agent_teams(snapshot.agent_teams)
    return 200, payload


def preview_file(path: str) -> dict:
    with Path(path).open("rb") as file:
        size = file.seek(0, 2)
        truncated = size > 200_000
        file.seek(size - 50_000 if truncated else 0)
        if truncated:
            file.readline(50_000)
        text = file.read(200_000).decode("utf-8", errors="replace")
    return {"text": text.replace("\r\n", "\n").replace("\r", "\n"), "truncated": truncated}


def terminal_sessions(state: LiveState, details: list[SessionDetail]) -> list[Row]:
    by_id = {row["session_id"]: dict(row) for row in details}
    sessions: dict[str, Row] = {}
    for agent in state.values("runtime.agent"):
        if not agent.get("running"):
            continue
        sid = agent.get("monitor_session_id") or agent["session_id"]
        previous = sessions.get(sid)
        row = by_id.get(sid, {})
        pids = sorted(set(previous["pids"] if previous else ()) | set(agent["pids"]))
        started = agent.get("started_at")
        cpu = agent.get("cpu_percent")
        sessions[sid] = {
            **row,
            "session_id": sid,
            "tool": row.get("tool") or agent["tool"],
            "pids": pids,
            "duration_s": row.get(
                "duration_s", round(max(0, time.time() - started), 1) if started is not None else None
            ),
            "cpu_percent": cpu if previous is None else row.get("cpu_percent"),
        }
    return list(sessions.values())


def terminal_snapshot(
    state: LiveState, resources: TerminalResources, sessions: list[Row], events: list[EventRow]
) -> DashboardSnapshot:
    tools = {row["tool"]: {**row, "processes": []} for row in resources["tools"]}
    processes = {
        (row["tool"], proc["pid"]): proc for row in resources["tools"] for proc in row["processes"]
    }
    for proc in state.values("runtime.process"):
        tool, pid = proc.get("tool"), proc["pid"]
        if not tool or not proc.get("present"):
            continue
        saved = processes.get((tool, pid), {})
        cpu, rss = proc.get("cpu_percent"), proc.get("memory_rss_bytes")
        row = asdict(ProcessInfo(pid, proc["name"], "", tool=tool)) | saved | {
            "name": proc["name"],
            "cpu_pct": f"{cpu:g}" if cpu is not None else "",
            "mem_mb": f"{rss / 1048576:.1f}" if rss is not None else "",
        }
        tools.setdefault(tool, {"tool": tool, "label": TOOL_LABELS.get(tool, tool), "processes": []})[
            "processes"
        ].append(row)
    live_monitor = resources["live_monitor"]
    if "platform" in live_monitor:
        live_monitor = {**live_monitor, "sessions": sessions, "events": events}
    snap = DashboardSnapshot.from_dict(
        {**resources, "tools": list(tools.values()), "sessions": sessions, "events": events,
         "live_monitor": live_monitor}
    )
    for tool in snap.tools:
        tool.meta = tools[tool.tool].get("meta", False)
        fields = ProcessInfo.__dataclass_fields__
        tool.processes = [ProcessInfo(**{key: val for key, val in proc.items() if key in fields})
                          for proc in tool.processes]
    snap.cpu_cores = resources["cpu_cores"]
    snap.cpu_per_core = resources["cpu_per_core"]
    return snap
