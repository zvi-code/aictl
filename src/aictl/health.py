"""Bounded, process-local operation measurements; snapshots never perform I/O."""

from __future__ import annotations

import re
import threading
import time
from collections import deque
from functools import lru_cache
from typing import Any


class OperationStats:
    """Request totals and a rolling one-minute rate, with successful payload volume."""

    def __init__(self, *, volume: bool = False) -> None:
        self._lock = threading.Lock()
        self._started = time.monotonic()
        self._volume = volume
        self._buckets: deque[list[float]] = deque(maxlen=61)
        self._total = self._completed = self._failed = self._in_flight = 0
        self._rows = self._bytes = 0
        self._duration_ms = 0.0
        self._last_error: str | None = None
        self._last_error_at: float | None = None
        self._last_success_at: float | None = None
        self._last_rows: int | None = None
        self._last_bytes: int | None = None
        self._groups: dict[str, OperationStats] = {}
        self._modes: dict[str, OperationStats] = {}

    def _bucket(self) -> list[float]:
        second = int(time.monotonic())
        if not self._buckets or self._buckets[-1][0] != second:
            self._buckets.append([second, 0, 0, 0])
        return self._buckets[-1]

    def begin(self) -> float:
        with self._lock:
            self._total += 1
            self._in_flight += 1
            self._bucket()[1] += 1
        return time.monotonic()

    def finish(self, started: float, *, error: str | None = None, rows: int = 0, bytes_: int = 0) -> None:
        with self._lock:
            self._in_flight -= 1
            self._completed += 1
            self._duration_ms += max(0.0, time.monotonic() - started) * 1000
            if error is not None:
                self._failed += 1
                self._last_error = error[:1000]
                self._last_error_at = time.time()
            else:
                self._last_success_at = time.time()
                self._rows += rows
                self._bytes += bytes_
                self._last_rows, self._last_bytes = rows, bytes_
                bucket = self._bucket()
                bucket[2] += rows
                bucket[3] += bytes_

    def call(self, fn: Any, *, rows: int = 0, bytes_: int = 0) -> Any:
        started = self.begin()
        try:
            result = fn()
        except Exception as exc:
            self.finish(started, error=str(exc))
            raise
        self.finish(started, rows=rows, bytes_=bytes_)
        return result

    def mode_counter(self, mode: str) -> OperationStats:
        if mode not in ("queued", "streaming", "inline"):
            raise ValueError(f"Unknown ingestion mode: {mode}")
        with self._lock:
            counter = self._modes.get(mode)
            if counter is None:
                counter = self._modes[mode] = OperationStats(volume=True)
                counter._started = self._started
            return counter

    def call_table(self, table: str, fn: Any, *, rows: int = 0, bytes_: int = 0, mode: str | None = None) -> Any:
        group_id = traffic_group(table)
        with self._lock:
            group = self._groups.get(group_id)
            if group is None:
                group = self._groups[group_id] = OperationStats(volume=True)
                group._started = self._started
        mode_counter = self.mode_counter(mode) if mode is not None else None

        def invoke() -> Any:
            if mode_counter is None:
                return fn()
            return mode_counter.call_table(table, fn, rows=rows, bytes_=bytes_)

        return self.call(lambda: group.call(invoke, rows=rows, bytes_=bytes_), rows=rows, bytes_=bytes_)

    def traffic_snapshot(self) -> dict[str, dict]:
        with self._lock:
            groups = dict(self._groups)
        return {key: value.snapshot() for key, value in groups.items()}

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            now = time.monotonic()
            window = min(60.0, max(0.001, now - self._started))
            recent = [b for b in self._buckets if b[0] > now - 60]
            return {
                "total": self._total,
                "rate_per_s": sum(b[1] for b in recent) / window,
                "in_flight": self._in_flight,
                "failed": self._failed,
                "avg_ms": self._duration_ms / self._completed if self._completed else None,
                "rows": self._rows if self._volume else None,
                "rows_per_s": sum(b[2] for b in recent) / window if self._volume else None,
                "bytes": self._bytes if self._volume else None,
                "bytes_per_s": sum(b[3] for b in recent) / window if self._volume else None,
                "last_error": self._last_error,
                "last_error_at": self._last_error_at,
                "last_success_at": self._last_success_at,
                "rate_window_s": window,
                "successful_requests": self._completed - self._failed,
                "avg_rows": self._rows / (self._completed - self._failed)
                if self._completed > self._failed and self._volume
                else None,
                "avg_bytes": self._bytes / (self._completed - self._failed)
                if self._completed > self._failed and self._volume
                else None,
                "last_rows": self._last_rows if self._volume else None,
                "last_bytes": self._last_bytes if self._volume else None,
            }


TRAFFIC_LABELS = {
    "otel": "Raw OTel exports",
    "hooks": "Hook calls",
    "live-session": "Live sessions and transcripts",
    "monitoring": "CPU and process monitoring",
    "files-config": "Files and configuration",
    "other": "Other tables",
}


def traffic_group(table: str) -> str:
    """Exclusive table grouping; sessions reuse the canonical project-table registry."""
    from .project_stores import PROJECT_TABLES

    if table.upper().startswith("OTEL"):
        return "otel"
    if table == "hook_calls":
        return "hooks"
    if table in PROJECT_TABLES or table in {
        "copilot_session_messages",
        "cursor_session_messages",
        "vscode_chat_messages",
    }:
        return "live-session"
    if table in {"metrics", "system_snapshots", "process_snapshots", "tool_stats"}:
        return "monitoring"
    if table.startswith(("file", "ui_")) or table in {
        "memory_snapshots",
        "tool_config",
        "environment_vars",
        "path_defs",
        "process_defs",
        "datapoint_catalog",
        "tools",
        "projects",
    }:
        return "files-config"
    return "other"


@lru_cache(maxsize=1)
def traffic_tables() -> tuple[str, ...]:
    from .storage import _SCHEMA_SQL

    names = re.findall(r"CREATE TABLE IF NOT EXISTS\s+(\w+)", _SCHEMA_SQL)
    return tuple(sorted(set(names) | {"OTELLogs", "OTELMetrics", "OTELTraces", "OTELPayloads"}))


def traffic_groups(
    operations: Any, settings: Any = None, pending: dict | None = None, *, mode: str | None = None
) -> list[dict]:
    observed = operations.traffic_snapshot() if operations is not None else {}
    rows = []
    for group_id, label in TRAFFIC_LABELS.items():
        tables = [t for t in traffic_tables() if traffic_group(t) == group_id]
        if mode is not None and settings is not None:
            tables = [t for t in tables if settings.ingestion_mode(t) == mode]
        stats = observed.get(group_id)
        # A counter is installed for all groups together; a never-used group is a measured zero.
        if stats is None and operations is not None:
            stats = {
                "rows": 0,
                "rows_per_s": 0.0,
                "bytes": 0,
                "bytes_per_s": 0.0,
                "total": 0,
                "rate_per_s": 0.0,
                "failed": 0,
            }
        stats = stats or {}
        rows.append(
            {
                "id": group_id,
                "label": label,
                "tables": tables,
                "ingestion_modes": [mode]
                if mode is not None
                else sorted({settings.ingestion_mode(t) for t in tables})
                if settings
                else [],
                **{
                    name: stats.get(name)
                    for name in ("rows", "rows_per_s", "bytes", "bytes_per_s", "rate_per_s", "failed")
                },
                "requests": stats.get("total"),
                "pending": (pending or {}).get(group_id),
                "measurement_scope": (
                    "Kusto SDK ingestion request attempts and acknowledged payload rows/bytes; exclusive table groups; "
                    "queued acknowledgement is not queryability; pending is locally queued rows plus history visibility receipts"
                    if operations is not None
                    else "per-table write traffic is not measured by this backend"
                ),
            }
        )
    return rows


def ingestion_traffic(
    operations: Any,
    settings: Any,
    *,
    pending_history_rows: int | None = None,
    pending_history_groups: dict | None = None,
) -> dict | None:
    """Keep actual SDK transport modes separate from cached queryable-store volume."""
    if operations is None or settings is None:
        return None
    result = {}
    for mode in ("queued", "streaming", "inline"):
        counter = operations.mode_counter(mode)
        snapshot = counter.snapshot()
        result[mode] = {
            **snapshot,
            "requests": snapshot["total"],
            "groups": traffic_groups(
                counter, settings, pending_history_groups if mode == "queued" else None, mode=mode
            ),
            "pending_history_rows": pending_history_rows if mode == "queued" else None,
            "pending_raw_otel_rows": None,
            "pending_scope": (
                "history version receipts not yet confirmed visible; excludes raw OTel sources, other processes, and DM service queues"
                if mode == "queued"
                else "no queued-DM history receipts for this transport mode"
            ),
            "queryable_rows": None,
            "measurement_scope": (
                "queued SDK submissions acknowledged by DM; not confirmed queryable; not a stored-row count"
                if mode == "queued"
                else f"{mode} SDK ingestion request attempts and successful payload volume; not a stored-row count"
            ),
        }
    return result


class ObservedKustoClient:
    """Keep the shared SDK client, counting its query and management attempts."""

    def __init__(self, client: Any) -> None:
        self.client = client
        self.reads = OperationStats()
        self.commands = OperationStats()

    def execute(self, *args: Any, **kwargs: Any) -> Any:
        return self.reads.call(lambda: self.client.execute(*args, **kwargs))

    def execute_mgmt(self, *args: Any, **kwargs: Any) -> Any:
        return self.commands.call(lambda: self.client.execute_mgmt(*args, **kwargs))

    def __getattr__(self, name: str) -> Any:
        return getattr(self.client, name)
