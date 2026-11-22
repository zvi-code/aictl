"""Read-only board projections. Local runtime and reported fleet data have distinct scopes."""

from __future__ import annotations

import json
import math
import os
import threading
import time
from urllib.parse import urlsplit

from ..stores import NODE_ENV, has_history, local_node_id, normalize_node_id, reader_feature
from ..stores.base import Reader, StoreError
from .projections.history import capture_mode, configured_reader, node_overview, node_scope, node_session, session_row

MAX_NODES = 256
MAX_SESSIONS = 100
MAX_RUNTIME_AGENTS = 128
STALE_AFTER = 300
SERIES_BUCKETS = 240
SERIES_MIN_STEP = 30
SERIES_MAX_ROWS = 20_000
SERIES_FIELDS = (
    "samples", "restarts", "host_cpu", "host_cpu_max", "host_mem_mb", "host_mem_total_mb", "tools_cpu",
    "tools_mem_mb", "daemon_cpu", "daemon_cpu_max", "daemon_rss_mb", "daemon_threads", "sessions", "processes",
    "in_rate", "out_rate", "reads_per_s", "writes_per_s", "commands_per_s", "read_ms", "read_ms_max", "write_ms",
    "write_ms_max", "reads_in_flight", "writes_in_flight", "query_cpu", "bytes_per_s", "streaming_rows_per_s",
    "queued_rows_per_s", "inline_rows_per_s", "otel_metrics_per_s", "otel_events_per_s", "queue_depth",
    "queue_bytes", "read_failures", "write_failures", "command_failures", "ingest_failures", "rows_dropped",
    "otel_errors", "otel_dropped", "sink_dropped",
)
FLOW_TABLE_FIELDS = ("rows_per_s", "bytes_per_s", "requests_per_s", "failures", "rows_dropped", "queue_depth", "nodes")
FLOW_NODE_FIELDS = ("rows", "bytes", "requests", "failures", "rows_dropped", "peak_rows_per_s", "queue_depth", "last_at")
BACKEND_SERIES_FIELDS = ("commands", "failed", "cpu_s", "memory_peak")
BACKEND_VIEW_FIELDS = ("commands", "failed", "cpu_s", "mean_ms", "max_ms", "memory_peak")
BACKEND_WORK = ("aictl_queries", "other_queries", "ingestion", "maintenance")
BACKEND_TTL_S = 30.0
_backend_cache: dict[tuple, tuple[float, dict | str]] = {}
_backend_lock = threading.Lock()


class NodeViewError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def _status(ts, now, *, stale=False):
    if stale:
        return "stale"
    if not isinstance(ts, (float, int)) or not math.isfinite(ts) or ts <= 0 or ts > now + 60:
        return "unknown"
    return "stale" if now - ts > STALE_AFTER else "reported"


def _time(params, key, default):
    try:
        v = float(params.get(key, default))
        if math.isfinite(v) and v >= 0:
            return v
    except (TypeError, ValueError):
        pass
    raise NodeViewError(f"{key} must be a non-negative Unix timestamp")


def _fields(row, names):
    return {k: row.get(k) for k in names}


def _rounded(row, names):
    """Rates and byte counts need no more than millisecond precision; full doubles triple the payload."""
    return {k: round(v, 3) if isinstance(v, float) else v for k, v in _fields(row, names).items()}


def series_window(since, until):
    """Align bucket edges to multiples of the step so repeated reads share buckets and cache keys."""
    span = until - since
    step = max(SERIES_MIN_STEP, math.ceil(span / SERIES_BUCKETS / SERIES_MIN_STEP) * SERIES_MIN_STEP)
    return float(math.floor(since / step) * step), float(math.ceil(until / step) * step), float(step)


def backend_usage(reader, since, until, step):
    """Cluster-recorded work for the configured database. Viewers of one window share one read."""
    metadata = reader_feature(reader, "health_metadata")
    if metadata is None:
        raise NodeViewError("The Kusto management client is not ready", 503)
    key = (metadata.database, since, until, step)
    with _backend_lock:
        saved = _backend_cache.get(key)
        if saved is not None and time.monotonic() - saved[0] < BACKEND_TTL_S:
            if isinstance(saved[1], str):
                raise NodeViewError(saved[1], 503)
            return saved[1]
    try:
        series, views = metadata.backend_usage(since, until, step)
        result = {
            "database": metadata.database, "checked_at": time.time(),
            "series": [{"t": r["t"], "work": r["work"], **_fields(r, BACKEND_SERIES_FIELDS)}
                       for r in series if r.get("work") in BACKEND_WORK],
            "views": [{"view": r.get("view") or "unnamed", **_fields(r, BACKEND_VIEW_FIELDS)} for r in views],
            "measurement_scope": (
                "Commands and queries that the cluster recorded for this database from all clients visible to the "
                "signed-in principal. CPU is the total CPU time each command used on the cluster."
            ),
        }
    except Exception as exc:  # noqa: BLE001 - permissions and command-log retention vary by cluster
        result = f"Kusto command history is unavailable ({type(exc).__name__})"
    with _backend_lock:
        if len(_backend_cache) >= 16:
            _backend_cache.pop(next(iter(_backend_cache)))
        _backend_cache[key] = (time.monotonic(), result)
    if isinstance(result, str):
        raise NodeViewError(result, 503)
    return result


def _client_sample(row, now):
    """Do not pair a restarted daemon's host report with counters from its previous process."""
    try:
        sample = json.loads(row.get("counter_sample") or "null")
    except (ValueError, TypeError):
        return None
    if (not isinstance(sample, dict) or not isinstance(sample.get("at"), (float, int))
            or sample.get("pid") != row.get("daemon_pid") or not isinstance(sample.get("store"), dict)
            or _status(sample["at"], now) != "reported"):
        return None
    return sample


def _session_identifier(value):
    return isinstance(value, str) and 0 < len(value) <= 384 and not any(ord(c) < 32 for c in value)


_AGENT_FIELDS = (
    "session_id", "native_session_id", "tool", "status", "running", "native_activity",
    "cpu_percent", "mem_mb", "started_at",
)


def _agent_rows(rows):
    by_session = {}
    for row in rows:
        if not isinstance(row, dict) or not _session_identifier(row.get("session_id")):
            continue
        native = row.get("native_session_id")
        key = native if _session_identifier(native) else row["session_id"]
        record = _fields(row, _AGENT_FIELDS)
        if key != native:
            record["native_session_id"] = None
        if key not in by_session or record["running"] is True:
            by_session[key] = record
    return sorted(by_session.values(), key=lambda row: (row["running"] is not True, row["session_id"]))


def agent_inventory(hub, now):
    """Bounded, process-backed session records; never export paths or transcript text."""
    if hub is None:
        return None
    ready = next((r for r in hub.values("source.status") if r.get("producer") == "runtime-collector"), None)
    if not ready or not ready.get("ready") or _status(ready.get("observed_at"), now) != "reported":
        return None
    rows = _agent_rows(hub.values("runtime.agent"))
    return {"captured_at": ready["observed_at"], "rows": rows[:MAX_RUNTIME_AGENTS], "total": len(rows)}


def _agent_sample(row, now):
    sample = _client_sample(row, now)
    runtime = sample.get("runtime") if sample else None
    agents = runtime.get("agents") if isinstance(runtime, dict) else None
    if (
        not isinstance(agents, dict)
        or _status(agents.get("captured_at"), now) != "reported"
        or not isinstance(agents.get("rows"), list)
        or not isinstance(agents.get("total"), int)
        or agents["total"] < len(agents["rows"])
    ):
        return None
    return {"captured_at": agents["captured_at"], "total": agents["total"],
            "rows": _agent_rows(agents["rows"][:MAX_RUNTIME_AGENTS])}


def _local_health_row(runtime, node, now):
    host = (runtime.get("resources") or {}).get("host") or {}
    proc = (runtime.get("pipeline") or {}).get("self") or {}
    return {
        "node_id": node, "captured_at": host.get("checked_at"), "status": _status(host.get("activity_at"), now),
        "cpu_percent": host.get("cpu_percent"),
        "memory_total_mb": host["memory_total_bytes"] / (1024**2) if host.get("memory_total_bytes") is not None else None,
        "memory_used_mb": host["memory_used_bytes"] / (1024**2) if host.get("memory_used_bytes") is not None else None,
        "daemon_pid": proc.get("pid"),
        **_fields(host, ("active_sessions", "active_processes", "inbound_bps", "outbound_bps", "activity_at")),
    }


def _session_view(reader, view, scope, p, sid, since, until, now):
    local = normalize_node_id(local_node_id())
    node = local if scope == "local" else None
    if scope == "node":
        try:
            node = "" if p["node_id"].strip().lower() == "legacy" else normalize_node_id(p["node_id"])
        except ValueError as exc:
            raise NodeViewError(str(exc)) from exc
    params = node_scope(node)
    out = {
        "view": view, "scope": scope, "local_node": {
            "node_id": local, "source": NODE_ENV if NODE_ENV in os.environ else "hostname",
        },
        "fleet_available": True, "generated_at": now, "read_only": True,
    }
    try:
        if view == "nodes":
            result = reader.read("nodes.inventory", {**(params if scope == "node" else {}), "limit": MAX_NODES})
            return {
                **out, "rows": [r | {"node_id": r["node_id"] or "legacy"} for r in result.rows],
                "truncated": result.truncated,
            }
        if view == "session":
            row = session_row(reader, sid, params)
            if row is None:
                raise NodeViewError("Session not found on the selected node", 404)
            return {**out, "rows": [node_session(row)]}
        result = reader.read("nodes.sessions", {
            **params, "since": since, "until": until,
            "node_limit": MAX_NODES + 1, "session_limit": MAX_SESSIONS + 1,
            "limit": MAX_NODES + MAX_SESSIONS + 3,
        })
        return {
            **out, **node_overview(result, max_nodes=MAX_NODES, max_sessions=MAX_SESSIONS),
            "since": since, "until": until,
        }
    except StoreError as exc:
        raise NodeViewError(str(exc), 503) from exc


def node_view(db, query, *, reader: Reader | None = None, now=None, local_health=None,
              shared_health=None, local_inventory=None):
    reader = reader if reader is not None else configured_reader(db)
    now = time.time() if now is None else now
    valid = {"view", "scope", "node_id", "session_id", "since", "until"}
    if set(query) - valid or any(len(values) != 1 for values in query.values()):
        raise NodeViewError("Unknown or repeated node view parameter")
    p = {k: v[0] for k, v in query.items()}
    view, scope = p.get("view", "nodes"), p.get("scope", "local")
    if view not in ("identity", "nodes", "health", "runtime", "settings", "overview", "session", "series", "flows",
                    "backend") or scope not in (
        "local",
        "node",
        "fleet",
    ):
        raise NodeViewError("Unknown node view or scope")
    if (scope == "node") != ("node_id" in p):
        raise NodeViewError("Only a named scope takes a node_id, and it requires one")
    if (view == "session") != ("session_id" in p) or (view == "session" and scope != "node"):
        raise NodeViewError("Session detail requires both a named node and a session_id")
    sid = p.get("session_id", "")
    if view == "session" and (not sid or len(sid) > 384 or any(ord(c) < 32 for c in sid)):
        raise NodeViewError("Invalid session_id")
    if view not in ("overview", "series", "flows", "backend") and ({"since", "until"} & p.keys()):
        raise NodeViewError("Time bounds apply to overview, series, flows and backend only")
    until = _time(p, "until", now + 1)
    since = _time(p, "since", max(0, until - (7 * 86400 if view == "overview" else 3600)))
    if since >= until:
        raise NodeViewError("since must be earlier than until")

    fleet_available = has_history(reader)
    if view in ("session", "overview") or (view == "nodes" and fleet_available):
        return _session_view(reader, view, scope, p, sid, since, until, now)

    settings = reader_feature(reader, "connection_info")
    local = settings.node_id if settings else normalize_node_id(local_node_id())
    source = settings.node_id_source if settings else NODE_ENV if NODE_ENV in os.environ else "hostname"
    node = local if scope == "local" else None
    if scope == "node":
        try:
            node = "" if p["node_id"].strip().lower() == "legacy" else normalize_node_id(p["node_id"])
        except ValueError as exc:
            raise NodeViewError(str(exc)) from exc
    out = {
        "view": view,
        "scope": scope,
        "local_node": {"node_id": local, "source": source},
        "fleet_available": fleet_available,
        "generated_at": now,
        "rows": [],
        "read_only": True,
    }
    if view == "identity":
        return out
    if view in ("flows", "backend"):
        del out["rows"]
    if view == "series":
        if not fleet_available:
            raise NodeViewError("Health history requires a Kusto store", 409)
        start, end, step = series_window(since, until)
        try:
            result = reader.read("health.series", node_scope(node) | {
                "since": start, "until": end, "step": step, "limit": SERIES_MAX_ROWS,
            })
        except StoreError as exc:
            raise NodeViewError(str(exc), 503) from exc
        rows = [
            {"node_id": r.get("node_id") or "legacy", "t": r["t"], **_fields(r, SERIES_FIELDS)}
            for r in result.rows
        ]
        return {**out, "rows": rows, "since": start, "until": end, "step": step, "truncated": result.truncated}
    if view == "flows":
        if not fleet_available:
            raise NodeViewError("Health history requires a Kusto store", 409)
        start, end, step = series_window(since, until)
        try:
            result = reader.read("health.flows", node_scope(node) | {
                "since": start, "until": end, "step": step, "limit": SERIES_MAX_ROWS,
            })
        except StoreError as exc:
            raise NodeViewError(str(exc), 503) from exc
        tables, nodes = [], []
        for r in result.rows:
            if r.get("row_type") == "table":
                tables.append({"table": r["table"], "t": r["t"], **_rounded(r, FLOW_TABLE_FIELDS)})
            elif r.get("row_type") == "node":
                nodes.append({"node_id": r.get("node_id") or "legacy", "table": r["table"],
                              "mode": r.get("mode") or None, **_rounded(r, FLOW_NODE_FIELDS)})
        return {**out, "tables": tables, "nodes": nodes, "since": start, "until": end, "step": step,
                "truncated": result.truncated}
    if view == "backend":
        if not fleet_available:
            raise NodeViewError("Health history requires a Kusto store", 409)
        start, end, step = series_window(since, until)
        return {**out, **backend_usage(reader, start, end, step), "since": start, "until": end, "step": step}
    if view == "nodes" and not fleet_available and (scope != "node" or node == local):
        return {**out, "rows": [{"node_id": local, "captured_at": None}]}
    if scope != "local" and not fleet_available and not (scope == "node" and node == local):
        raise NodeViewError("Fleet history requires a shared Kusto store", 409)
    if view == "runtime" and (scope == "local" or node == local) and local_health is not None:
        row = _local_health_row(local_health(), local, now)
        row["agents"] = local_inventory() if local_inventory is not None else None
        return {**out, "rows": [row]}
    if view == "health":
        out["shared_kusto"] = (
            {"scope": "shared", "cluster": urlsplit(settings.cluster).hostname, "database": settings.database}
            if settings
            else None
        )
        if settings and shared_health is not None:
            cached = shared_health()
            capacity = cached.get("capacity") or {}
            out["shared_kusto"].update(
                capacity_total=capacity.get("total"),
                capacity_available=capacity.get("available"),
                capacity_checked_at=capacity.get("checked_at"),
                capacity_status=capacity.get("status", "unknown"),
                table_inventory=cached.get("table_inventory"),
                cluster_resources=cached.get("cluster_resources"),
                policies=cached.get("policies"),
            )
        if scope == "local" and local_health is not None:
            runtime = local_health()
            return {
                **out,
                "local_runtime": runtime,
                "rows": [_local_health_row(runtime, local, now)],
            }
    if view == "settings" and scope == "local":
        return {
            **out,
            "rows": [
                {
                    "node_id": local,
                    "node_source": source,
                    "captured_at": now,
                    "status": "reported",
                    "capture": capture_mode(db),
                    "ingestion": settings.ingestion if settings else None,
                    "retention_days": getattr(db, "_retention_days", None),
                    "content_retention_days": getattr(db, "_content_retention_days", None),
                }
            ],
        }

    reports = []
    truncated = False
    stale = False
    if fleet_available:
        params = node_scope(node) | {
            "report_mode": view, "include_unreported": scope == "fleet" and view in ("health", "settings"),
            "limit": MAX_NODES,
        }
        if view == "runtime":
            params["since"] = now - STALE_AFTER
        try:
            answer = reader.read("nodes.reports", params)
        except StoreError as exc:
            raise NodeViewError(str(exc), 503) from exc
        reports, truncated = answer.rows, answer.truncated
        stale = getattr(answer, "stale", False)
    if view == "runtime":
        rows = []
        for r in reports[:MAX_NODES]:
            rows.append(_fields(r, ("node_id", "active_sessions", "active_processes", "cpu_percent",
                                    "memory_used_mb", "memory_total_mb", "daemon_pid")) |
                        {"captured_at": r["ts"], "activity_at": r["ts"], "status": _status(r["ts"], now, stale=stale),
                         "agents": None if stale else _agent_sample(r, now)})
        if scope == "fleet" and local_health is not None:
            row = _local_health_row(local_health(), local, now)
            stored = next((r for r in rows if r["node_id"] == local), None)
            if row["status"] == "reported" and (stored is None or row["activity_at"] >= stored["activity_at"]):
                row["agents"] = local_inventory() if local_inventory is not None else None
                rows = [r for r in rows if r["node_id"] != local] + [row]
        return {**out, "rows": sorted(rows, key=lambda r: r["node_id"]), "truncated": truncated}
    if view == "nodes":
        raise NodeViewError("No store configured", 503)
    if view in ("health", "settings"):
        settings_view = view == "settings"
        health_cols = (
            "cpu_percent",
            "memory_used_mb",
            "memory_total_mb",
            "active_sessions",
            "active_processes",
            "inbound_bps",
            "outbound_bps",
            "daemon_pid",
        )
        settings_cols = ("node_source", "capture", "ingestion", "retention_days", "content_retention_days")
        cols = settings_cols if settings_view else health_cols
        rows = reports
        if not settings_view:
            rows = [row if row.get("daemon_pid") is not None else row | {"active_processes": None} for row in rows]
        if node is not None and not rows:
            rows = [{"node_id": node, "captured_at": None}]
        return {
            **out,
            "rows": [
                _fields(r, cols)
                | {
                    "node_id": r["node_id"] or "legacy",
                    "captured_at": r["captured_at"],
                    "status": _status(r["captured_at"], now, stale=stale),
                }
                | ({} if settings_view else {"client_sample": None if stale else _client_sample(r, now),
                                              "activity_at": r.get("captured_at")})
                for r in rows[:MAX_NODES]
            ],
            "truncated": truncated,
        }

    raise NodeViewError("Node view is unavailable", 503)
