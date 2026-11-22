"""Bounded, process-local operation measurements; snapshots never perform I/O."""

from __future__ import annotations

import threading
import time
import uuid
from collections import deque
from collections.abc import Callable
from functools import lru_cache
from typing import Any


def host_memory() -> dict:
    """Whole-host physical memory; tool process RSS is not a fallback for this measurement."""
    try:
        import psutil

        m = psutil.virtual_memory()
        return {"memory_total_bytes": m.total, "memory_available_bytes": m.available, "memory_used_bytes": m.total - m.available}
    except (ImportError, OSError, AttributeError, NotImplementedError):
        return {"memory_total_bytes": None, "memory_available_bytes": None, "memory_used_bytes": None}


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
            self._buckets.append([second, 0, 0, 0, 0, 0, 0])
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
            elapsed = max(0.0, time.monotonic() - started) * 1000
            self._duration_ms += elapsed
            bucket = self._bucket()
            bucket[4] += 1
            bucket[5] += elapsed
            if error is not None:
                bucket[6] += 1
                self._failed += 1
                self._last_error = error[:1000]
                self._last_error_at = time.time()
            else:
                self._last_success_at = time.time()
                self._rows += rows
                self._bytes += bytes_
                self._last_rows, self._last_bytes = rows, bytes_
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
            completed = sum(b[4] for b in recent)
            return {
                "total": self._total,
                "rate_per_s": sum(b[1] for b in recent) / window,
                "in_flight": self._in_flight,
                "failed": self._failed,
                "avg_ms": self._duration_ms / self._completed if self._completed else None,
                "recent_completed": int(completed),
                "recent_avg_ms": sum(b[5] for b in recent) / completed if completed else None,
                "recent_failures": int(sum(b[6] for b in recent)),
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

SESSION_TABLES = frozenset({
    "sessions", "requests", "tool_invocations", "session_prompts", "session_steps", "session_step_text",
    "turn_request_links", "session_usage", "skill_uses", "file_write_events", "context_events", "agents",
    "session_commits", "session_processes", "session_folders", "session_artifacts", "session_loaded_files",
    "session_context_items", "events", "hook_calls",
})


def traffic_group(table: str) -> str:
    """Return one traffic group for the table."""
    if table.upper().startswith("OTEL"):
        return "otel"
    if table == "hook_calls":
        return "hooks"
    if table in SESSION_TABLES or table in {
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
    from .stores.kusto.tables import TABLES

    return tuple(sorted(TABLES))


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


def node_transport_counters(transport: dict, writer: dict | None = None) -> dict:
    """Keep only counters (not request or error text) in stored health reports."""
    operations = getattr(transport.get("ingester"), "operations", None)
    fields = ("total", "successful_requests", "in_flight", "failed", "recent_completed", "recent_avg_ms", "avg_ms",
              "rate_per_s", "rows", "rows_per_s", "bytes", "bytes_per_s", "last_success_at", "last_error_at")

    def numeric(stats: dict) -> dict:
        return {key: stats[key] for key in fields if isinstance(stats.get(key), (int, float))}

    result = {}
    if transport.get("query_cpu") is not None:
        result["query_cpu"] = transport["query_cpu"]
    for key, op in (("reads", transport.get("reads")), ("commands", transport.get("commands")),
                    ("writes", operations)):
        if op is not None:
            result[key] = numeric(op.snapshot())
    if operations is not None:
        modes = {}
        for mode in ("streaming", "inline", "queued"):
            counter = operations.mode_counter(mode)
            groups = counter.traffic_snapshot()
            modes[mode] = numeric(counter.snapshot()) | {
                "groups": [{"id": key, **numeric(value)} for key, value in groups.items()]
            }
        result["ingestion_traffic"] = modes
    if writer is not None and isinstance(writer.get("status"), str):
        names = ("queue_depth", "queue_bytes", "in_flight", "rows_sent", "rows_dropped", "lost_at_exit",
                 "ingest_requests", "ingest_failures", "bytes_sent", "last_sent_at", "last_error_at")
        result["writer"] = {
            "status": writer["status"],
            "tables": {
                name: {key: counters[key] for key in names if isinstance(counters.get(key), (int, float))}
                | ({"mode": counters["mode"]} if isinstance(counters.get("mode"), str) else {})
                for name, counters in writer.get("tables", {}).items()
            },
        }
    return result


class ObservedKustoClient:
    """Count SDK attempts and log complete failed requests and responses."""

    def __init__(self, client: Any, *, cluster: str | None = None) -> None:
        from .stores.kusto.query_cpu import QueryCpuStats

        self.client = client
        self.cluster = cluster or getattr(client, "_kusto_cluster", "unknown")
        self.reads = OperationStats()
        self.commands = OperationStats()
        self.query_cpu = QueryCpuStats()
        self._responses = threading.local()
        session = getattr(client, "_session", None)
        if session is not None:
            # The SDK discards the raw HTTP body when parsing a partial-query
            # failure (HTTP 200). Retain it only for the current thread's call.
            session.hooks.setdefault("response", []).append(self._capture_response)

    def _capture_response(self, response: Any, **_kwargs: Any) -> None:
        if getattr(self._responses, "active", False):
            self._responses.value = response

    @staticmethod
    def _prepare_request_id(args: tuple[Any, ...], kwargs: dict[str, Any]) -> str | None:
        properties = args[0] if args else kwargs.get("properties")
        current = getattr(properties, "client_request_id", None)
        if properties is None or (current is not None and not str(current).startswith("KPC.aictl;")):
            return current
        request_id = f"KPC.aictl;{uuid.uuid4()}"
        properties.client_request_id = request_id
        return request_id

    def _call(
        self,
        call: Callable[[], Any],
        database: str,
        *,
        kql: str | None = None,
        request: str | None = None,
        client_request_id: str | None = None,
    ) -> Any:
        from .stores.kusto.diagnostics import log_failure

        self._responses.active = True
        self._responses.value = None
        started = time.monotonic()
        try:
            return call()
        except Exception as exc:  # noqa: BLE001 - diagnostics must preserve every SDK failure
            log_failure(
                exc,
                cluster=self.cluster,
                database=database,
                operation="request",
                kql=kql,
                request=request,
                response=self._responses.value,
                client_request_id=client_request_id,
                elapsed_s=time.monotonic() - started,
            )
            raise
        finally:
            self._responses.active = False
            self._responses.value = None

    def execute(self, database: str, query: str, *args: Any, **kwargs: Any) -> Any:
        return self._read(self.client.execute, database, query, args, kwargs)

    def execute_query(self, database: str, query: str, *args: Any, **kwargs: Any) -> Any:
        return self._read(self.client.execute_query, database, query, args, kwargs)

    def _read(self, execute, database: str, query: str, args: tuple, kwargs: dict) -> Any:
        client_request_id = self._prepare_request_id(args, kwargs)

        def call():
            return self._call(lambda: execute(database, query, *args, **kwargs), database,
                              kql=query, client_request_id=client_request_id)

        return self.reads.call(call if query.lstrip().startswith(".") else lambda: self.query_cpu.call(call))

    def execute_mgmt(self, database: str, command: str, *args: Any, **kwargs: Any) -> Any:
        client_request_id = self._prepare_request_id(args, kwargs)
        return self.commands.call(
            lambda: self._call(
                lambda: self.client.execute_mgmt(database, command, *args, **kwargs),
                database,
                kql=command,
                client_request_id=client_request_id,
            )
        )

    def execute_streaming_ingest(self, database: str, table: str, *args: Any, **kwargs: Any) -> Any:
        return self._call(
            lambda: self.client.execute_streaming_ingest(database, table, *args, **kwargs),
            database,
            request=f"Streaming ingestion into table {table}",
        )

    def __getattr__(self, name: str) -> Any:
        return getattr(self.client, name)
