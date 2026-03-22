# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Thread-safe snapshot storage, metric emission, and file-path whitelist.

Extracted from ``dashboard.web_server`` so that storage logic is reusable
without pulling in the HTTP layer.
"""

from __future__ import annotations

import collections
import json
import os
import threading
import time
from typing import TYPE_CHECKING

from .dashboard.models import DashboardSnapshot

if TYPE_CHECKING:
    from .sink import SampleSink
    from .storage import HistoryDB


# ─── Metric emission ────────────────────────────────────────────

HISTORY_TUPLE_LEN = 11  # bump when adding fields to the history tuple


# emit_snapshot_to_sink DELETED.
#
# All metrics are now emitted at the point of collection:
#   cpu.core.*            → PsutilProcessCollector
#   proc.{pid}.cpu/mem    → PsutilProcessCollector
#   file.tokens/size      → DiscoveryCollector
#   discovery.*           → DiscoveryCollector
#   mcp.status            → DiscoveryCollector
#   memory.tokens         → collect() enrichment block
#   fs.change/size        → WatchdogFileCollector
#   telemetry.*           → StructuredTelemetryCollector
#   net.{pid}.*           → Network collectors
#   tool.*                → SessionCorrelator.tool_reports()
#   collector.*.status    → BaseCollector.report_status()


# ─── Thread-safe snapshot store ──────────────────────────────────

class SnapshotStore:
    """Thread-safe snapshot storage with version-based change notification.

    Optionally backed by a HistoryDB for persistence across restarts.
    Uses SampleSink for universal metric emission.
    """

    def __init__(self, db: "HistoryDB | None" = None, sink: "SampleSink | None" = None) -> None:
        self._snap: DashboardSnapshot | None = None
        self._version: int = 0
        self._lock = threading.Lock()
        self._condition = threading.Condition(self._lock)
        # Ring buffer for global time-series sparklines.
        # At ~5.86s/tick, 360 entries ≈ 35 min.
        self._history: collections.deque[tuple] = collections.deque(maxlen=360)
        # Per-tool history: {tool_name: deque[(ts, cpu, mem_mb, tokens, traffic_bps)]}
        self._tool_history: dict[str, collections.deque] = {}
        # SQLite persistence (optional)
        self._db = db
        # Universal metric sink
        self._sink = sink
        if db:
            self._load_from_db()

    def _load_from_db(self) -> None:
        """Populate ring buffers from SQLite so charts start with history."""
        if not self._db:
            return
        try:
            import time as _time
            since = _time.time() - 3600  # load last 1 hour
            data = self._db.query_metrics(since=since)
            if data["ts"]:
                me_list = data.get("memory_entries") or [0] * len(data["ts"])
                for i in range(len(data["ts"])):
                    row = (
                        data["ts"][i], data["files"][i], data["tokens"][i],
                        data["cpu"][i], data["mem_mb"][i], data["mcp"][i],
                        data["mem_tokens"][i], me_list[i],
                        data["live_sessions"][i],
                        data["live_tokens"][i], data["live_in_rate"][i],
                        data["live_out_rate"][i],
                    )
                    self._history.append(row)
            # Per-tool history
            tool_data = self._db.query_tool_metrics(since=since)
            for tool_name, td in tool_data.items():
                dq = collections.deque(maxlen=120)
                for i in range(len(td["ts"])):
                    dq.append((td["ts"][i], td["cpu"][i], td["mem_mb"][i],
                               td["tokens"][i], td["traffic"][i]))
                self._tool_history[tool_name] = dq
        except Exception:
            pass  # don't crash server if DB read fails

    def update(self, snap: DashboardSnapshot) -> None:
        with self._condition:
            self._snap = snap
            self._version += 1
            row = (
                snap.timestamp, snap.total_files, snap.total_tokens,
                snap.total_cpu, snap.total_mem_mb,
                snap.total_mcp_servers, snap.total_memory_tokens,
                snap.total_memory_entries,
                snap.total_live_sessions, snap.total_live_estimated_tokens,
                snap.total_live_inbound_rate_bps, snap.total_live_outbound_rate_bps,
            )
            # Clear history if schema changed (prevents zip unpack crash)
            if self._history and len(self._history[0]) != len(row):
                self._history.clear()
            self._history.append(row)

            # Per-tool history
            ts = snap.timestamp
            tool_rows = []
            for t in snap.tools:
                if t.tool == "aictl":
                    continue
                cpu = sum(float(p.cpu_pct) for p in t.processes
                          if hasattr(p, 'cpu_pct') and str(p.cpu_pct).replace('.', '', 1).isdigit())
                mem = sum(float(p.mem_mb) for p in t.processes
                          if hasattr(p, 'mem_mb') and str(p.mem_mb).replace('.', '', 1).isdigit())
                tok = sum(f.tokens for f in t.files)
                traffic = 0.0
                if t.live:
                    traffic = float(t.live.get("outbound_rate_bps", 0)) + float(t.live.get("inbound_rate_bps", 0))
                if t.tool not in self._tool_history:
                    self._tool_history[t.tool] = collections.deque(maxlen=120)  # ~12 min
                self._tool_history[t.tool].append((ts, cpu, mem, tok, traffic))
                tool_rows.append((t.tool, cpu, mem, tok, traffic))

            self._condition.notify_all()

        # Persist to SQLite (non-blocking — HistoryDB buffers internally)
        if self._db:
            try:
                from .storage import MetricsRow, ToolMetricsRow, EventRow
                self._db.append_metrics(MetricsRow(
                    ts=snap.timestamp, files=snap.total_files,
                    tokens=snap.total_tokens, cpu=snap.total_cpu,
                    mem_mb=snap.total_mem_mb, mcp=snap.total_mcp_servers,
                    mem_tokens=snap.total_memory_tokens,
                    memory_entries=snap.total_memory_entries,
                    live_sessions=snap.total_live_sessions,
                    live_tokens=snap.total_live_estimated_tokens,
                    live_in_rate=snap.total_live_inbound_rate_bps,
                    live_out_rate=snap.total_live_outbound_rate_bps,
                ))
                self._db.append_tool_metrics([
                    ToolMetricsRow(ts=snap.timestamp, tool=name,
                                   cpu=cpu, mem_mb=mem, tokens=tok, traffic=tr)
                    for name, cpu, mem, tok, tr in tool_rows
                ])
                # Persist events from live monitor
                if snap.events:
                    self._db.append_events([
                        EventRow(ts=e.get("ts", snap.timestamp),
                                 tool=e.get("tool", ""),
                                 kind=e.get("kind", ""),
                                 detail=e.get("detail", {}))
                        for e in snap.events if e.get("tool") and e.get("kind")
                    ])
                # Persist telemetry snapshots (from stats-cache, events.jsonl, etc.)
                if snap.tool_telemetry:
                    from .storage import TelemetryRow
                    self._db.append_telemetry_batch([
                        TelemetryRow(
                            ts=snap.timestamp, tool=t.get("tool", ""),
                            source=t.get("source", ""),
                            confidence=t.get("confidence", 0),
                            input_tokens=t.get("input_tokens", 0),
                            output_tokens=t.get("output_tokens", 0),
                            cache_read_tokens=t.get("cache_read_tokens", 0),
                            cache_creation_tokens=t.get("cache_creation_tokens", 0),
                            total_sessions=t.get("total_sessions", 0),
                            total_messages=t.get("total_messages", 0),
                            cost_usd=t.get("cost_usd", 0),
                            model=t.get("model", ""),
                            by_model=t.get("by_model", {}),
                        )
                        for t in snap.tool_telemetry if t.get("tool")
                    ])
                # All metric emission now happens at collection time
                # (collectors + DiscoveryCollector + collect() enrichment).
                # No snapshot-level emission needed.

                # Refresh dynamic source provenance for the datapoint catalog.
                try:
                    from .datapoint_provenance import update_provenance
                    update_provenance(self._db, snap)
                except Exception:
                    pass  # provenance is best-effort
            except Exception:
                pass  # don't crash server if DB write fails

    def wait_for_update(self, known_version: int,
                        timeout: float = 30.0) -> tuple[DashboardSnapshot | None, int]:
        """Block until a new version is available or timeout."""
        with self._condition:
            self._condition.wait_for(
                lambda: self._version > known_version, timeout=timeout)
            return self._snap, self._version

    @property
    def snapshot(self) -> DashboardSnapshot | None:
        with self._lock:
            return self._snap

    @property
    def version(self) -> int:
        with self._lock:
            return self._version

    def history_json(self) -> str:
        """Return time-series history as column-major JSON (uPlot native format)."""
        with self._lock:
            rows = list(self._history)
        if not rows:
            return json.dumps({"ts": [], "files": [], "tokens": [],
                               "cpu": [], "mem_mb": [], "mcp": [],
                               "mem_tokens": [], "memory_entries": [],
                               "live_sessions": [],
                               "live_tokens": [], "live_in_rate": [], "live_out_rate": []})
        # Transpose rows → columns
        ts, files, tokens, cpu, mem_mb, mcp, mem_tokens, memory_entries, live_sessions, live_tokens, live_in_rate, live_out_rate = zip(*rows)
        # Per-tool history
        tool_hist: dict[str, dict] = {}
        for tool_name, dq in self._tool_history.items():
            if not dq:
                continue
            t_rows = list(dq)
            t_ts, t_cpu, t_mem, t_tok, t_traffic = zip(*t_rows)
            tool_hist[tool_name] = {
                "ts": list(t_ts),
                "cpu": [round(v, 1) for v in t_cpu],
                "mem_mb": [round(v, 1) for v in t_mem],
                "tokens": list(t_tok),
                "traffic": [round(v, 2) for v in t_traffic],
            }

        return json.dumps({
            "ts": list(ts), "files": list(files), "tokens": list(tokens),
            "cpu": [round(v, 1) for v in cpu],
            "mem_mb": [round(v, 1) for v in mem_mb],
            "mcp": list(mcp), "mem_tokens": list(mem_tokens),
            "memory_entries": list(memory_entries),
            "live_sessions": list(live_sessions),
            "live_tokens": list(live_tokens),
            "live_in_rate": [round(v, 2) for v in live_in_rate],
            "live_out_rate": [round(v, 2) for v in live_out_rate],
            "by_tool": tool_hist,
        })


# ─── File path whitelist ─────────────────────────────────────────

class AllowedPaths:
    """Maintains the set of file paths that may be served via /api/file."""

    def __init__(self) -> None:
        self._paths: set[str] = set()
        self._lock = threading.Lock()

    def update(self, snap: DashboardSnapshot) -> None:
        paths: set[str] = set()
        for tr in snap.tools:
            for f in tr.files:
                try:
                    paths.add(os.path.realpath(f.path))
                except (OSError, ValueError):
                    pass
        for mem in snap.agent_memory:
            if mem.file:
                try:
                    paths.add(os.path.realpath(mem.file))
                except (OSError, ValueError):
                    pass
        with self._lock:
            self._paths = paths

    def is_allowed(self, path: str) -> bool:
        try:
            real = os.path.realpath(path)
        except (OSError, ValueError):
            return False
        with self._lock:
            return real in self._paths
