"""Read-only board projections. Local runtime and reported fleet data have distinct scopes."""

from __future__ import annotations

import contextlib
import json
import math
import os
import time
import uuid
from datetime import timedelta
from urllib.parse import urlsplit

from ..kusto import NODE_ENV, local_node_id, normalize_node_id

MAX_NODES = 256
MAX_SESSIONS = 100
STALE_AFTER = 300
METRICS = ("sessions", "requests", "input_tokens", "output_tokens", "cost_usd")
SESSION_FIELDS = (
    "session_id, tool, model, project_path, started_at, ended_at, request_count, input_tokens, output_tokens, cost_usd"
)


class NodeViewError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def _read(settings, kql):
    from azure.kusto.data import ClientRequestProperties
    from azure.kusto.data.exceptions import KustoApiError, KustoMultiApiError

    from ..kusto.connection import KustoClientFactory, Result

    props = ClientRequestProperties()
    props.client_request_id = f"aictl.NodeView;{uuid.uuid4()}"
    for key, value in {
        "request_readonly": True,
        "request_readonly_hardline": True,
        "deferpartialqueryfailures": False,
        "servertimeout": timedelta(seconds=15),
        "truncationmaxrecords": MAX_NODES + MAX_SESSIONS + 3,
        "truncationmaxsize": 8 * 1024**2 if "node_health_counters" in kql else 1_000_000,
        "max_memory_consumption_per_query_per_node": 134_217_728,
        # Concurrent scan buffers can exhaust the 128 MiB budget even for max(ts) by node.
        "query_fanout_threads_percent": 1,
    }.items():
        props.set_option(key, value)
    try:
        response = KustoClientFactory.client(settings).execute(settings.database, kql, props)
    except (KustoApiError, KustoMultiApiError) as exc:
        errors = exc.get_api_errors() if isinstance(exc, KustoMultiApiError) else [exc.get_api_error()]
        if errors and all(e.code == "LowMemoryCondition" or "E_LOW_MEMORY_CONDITION" in (e.description or "") for e in errors):
            raise NodeViewError(f"Kusto reported E_LOW_MEMORY_CONDITION (client request ID: {props.client_request_id})", 503) from exc
        raise
    if getattr(response, "errors_count", 0) or not response.primary_results:
        raise NodeViewError(f"Kusto returned an incomplete node view (client request ID: {props.client_request_id})", 503)
    return Result.from_response(response).dicts()


def _status(ts, now):
    if not ts or ts > now + 60:
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


def node_view(db, query, *, now=None, read=_read, local_health=None, shared_health=None):
    now = time.time() if now is None else now
    valid = {"view", "scope", "node_id", "session_id", "since", "until"}
    if set(query) - valid or any(len(values) != 1 for values in query.values()):
        raise NodeViewError("Unknown or repeated node view parameter")
    p = {k: v[0] for k, v in query.items()}
    view, scope = p.get("view", "nodes"), p.get("scope", "local")
    if view not in ("identity", "nodes", "health", "settings", "overview", "session") or scope not in (
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
    if view != "overview" and ({"since", "until"} & p.keys()):
        raise NodeViewError("Time bounds apply to overview only")
    until = _time(p, "until", now + 1)
    since = _time(p, "since", max(0, until - 7 * 86400))
    if since >= until:
        raise NodeViewError("since must be earlier than until")

    settings = getattr(db, "_kusto", None)
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
        "fleet_available": settings is not None,
        "generated_at": now,
        "rows": [],
        "read_only": True,
    }
    if view == "identity":
        return out
    if view == "nodes" and not settings and (scope != "node" or node == local):
        return {**out, "rows": [{"node_id": local, "captured_at": None}]}
    if scope != "local" and not settings and not (scope == "node" and node == local):
        raise NodeViewError("Fleet history requires a shared Kusto store", 409)
    if db is None:
        raise NodeViewError("History store unavailable", 503)
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
            host = (runtime.get("resources") or {}).get("host") or {}
            proc = runtime.get("pipeline", {}).get("self") or {}

            def mib(name):
                return host[name] / (1024**2) if host.get(name) is not None else None

            return {
                **out,
                "local_runtime": runtime,
                "rows": [
                    {
                        "node_id": local,
                        "captured_at": host.get("checked_at"),
                        "status": _status(host.get("checked_at"), now),
                        "cpu_percent": host.get("cpu_percent"),
                        "memory_total_mb": mib("memory_total_bytes"),
                        "memory_used_mb": mib("memory_used_bytes"),
                        "daemon_pid": proc.get("pid"),
                    }
                ],
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
                    "capture": db.capture,
                    "ingestion": settings.ingestion if settings else None,
                    "retention_days": db._retention_days,
                    "content_retention_days": db._content_retention_days,
                }
            ],
        }

    # Filter by the physical identity before reducing versions. Only the display
    # layer calls the empty pre-upgrade identity "legacy".
    scoped = (
        f" | where node_id == {json.dumps(node)}" if node is not None and (view != "nodes" or scope == "node") else ""
    )
    samples = f'system_snapshots | extend node_id=column_ifexists("node_id", ""){scoped}'
    sessions = f'sessions | extend node_id=column_ifexists("node_id", ""){scoped}'
    histories = (
        sessions
        if getattr(db, "current_history", False)
        else sessions.replace("sessions |", "sessions_observations |", 1)
    )
    inventory = (
        "union ("
        + samples
        + " | summarize captured_at=max(ts) by node_id), ("
        + histories
        + " | summarize by node_id | extend captured_at=real(null))"
        + " | summarize captured_at=max(captured_at) by node_id"
    )
    if view == "nodes":
        # Discovery is on demand, not another polling loop. Include history-only
        # nodes even when they have never published a health sample.
        rows = read(
            settings,
            inventory + f" | order by node_id asc | take {MAX_NODES + 1}",
        )
        return {
            **out,
            "rows": [r | {"node_id": r["node_id"] or "legacy"} for r in rows[:MAX_NODES]],
            "truncated": len(rows) > MAX_NODES,
        }
    if view in ("health", "settings"):
        settings_view = view == "settings"
        health_cols = (
            "cpu_percent",
            "memory_used_mb",
            "memory_total_mb",
            "active_sessions",
            "active_processes",
            "daemon_pid",
        )
        settings_cols = ("node_source", "capture", "ingestion", "retention_days", "content_retention_days")
        cols = settings_cols if settings_view else health_cols
        if settings:
            projection = (
                'captured_at=column_ifexists("settings_captured_at",real(null)), node_source=column_ifexists("node_source",""),'
                ' capture=column_ifexists("capture_mode",""), ingestion=column_ifexists("ingestion_mode",""),'
                ' retention_days=column_ifexists("retention_days",long(null)), content_retention_days=column_ifexists("content_retention_days",long(null))'
                if settings_view
                else 'captured_at=ts, cpu_percent=column_ifexists("host_cpu_percent",real(null)),'
                ' memory_used_mb=column_ifexists("host_memory_used_mb",real(null)),'
                ' memory_total_mb=column_ifexists("host_memory_total_mb",real(null)), active_sessions=live_sessions,'
                ' active_processes=iff(isnotnull(column_ifexists("daemon_pid",long(null))),active_processes,long(null)),'
                ' daemon_pid=column_ifexists("daemon_pid",long(null))'
            )
            # Do not let a tombstone resurface an older version of the same sample.
            latest = (
                samples
                + " | project node_id, ts, _v, _deleted, "
                + projection
                + ("" if settings_view else ', counter_sample=column_ifexists("node_health_counters","")')
                + " | summarize arg_max(_v, *) by node_id, ts | where not(_deleted)"
                + (" | summarize arg_max(captured_at, *) by node_id" if settings_view else
                   " | summarize arg_max(captured_at, " + ", ".join(health_cols) + "),"
                   " arg_max(iff(isnotempty(counter_sample), ts, real(null)), counter_sample) by node_id")
            )
            if scope == "fleet":
                # Nodes with session history but no samples have no observed health/settings.
                latest = (
                    f"let reported = materialize({latest});\nunion (reported), "
                    f"({histories} | distinct node_id | join kind=leftanti (reported | project node_id) on node_id)"
                )
            rows = read(settings, latest + f" | order by node_id asc | take {MAX_NODES + 1}")
        else:
            cursor = db._conn().execute(
                "SELECT ts AS captured_at, NULL AS cpu_percent,NULL AS memory_used_mb,NULL AS memory_total_mb,"
                "live_sessions AS active_sessions,active_processes FROM system_snapshots ORDER BY ts DESC LIMIT 1"
            )
            rows = [dict(zip((c[0] for c in cursor.description), r, strict=True)) | {"node_id": local} for r in cursor]
        if node is not None and not rows:
            rows = [{"node_id": node, "captured_at": None}]
        return {
            **out,
            "rows": [
                _fields(r, cols)
                | {
                    "node_id": r["node_id"] or "legacy",
                    "captured_at": r["captured_at"],
                    "status": _status(r["captured_at"], now),
                }
                | ({} if settings_view else {"client_sample": _client_sample(r, now)})
                for r in rows[:MAX_NODES]
            ],
            "truncated": len(rows) > MAX_NODES,
        }

    if settings and not getattr(db, "current_history", False):
        raise NodeViewError(
            "This database retains unresolved observations; canonical session totals are unavailable", 409
        )
    if settings:
        if view == "session":
            sessions += f" | where session_id == {json.dumps(sid)}"
        sessions += f" | project node_id, _v, _deleted, {SESSION_FIELDS} | summarize arg_max(_v, *) by node_id, session_id | where not(_deleted)"
        if view == "session":
            details = read(settings, sessions + f" | project node_id, {SESSION_FIELDS} | take 1")
        else:
            # Compute totals before bounding lists; neither a session list cap nor
            # a fleet larger than the node list cap changes the totals.
            q = (
                f"let s = materialize({sessions} | where started_at >= {since!r} and started_at < {until!r}"
                " | project-away _v, _deleted);\n"
                "let grouped = s | summarize sessions=count(), requests=sum(request_count), input_tokens=sum(input_tokens),"
                " output_tokens=sum(output_tokens), cost_usd=sum(cost_usd) by node_id;\n"
                f"union (grouped | order by node_id asc | take {MAX_NODES + 1} | extend row_type='node'),"
                "(grouped | summarize " + ", ".join(f"{m}=sum({m})" for m in METRICS) + " | extend row_type='total'),"
                f"(s | order by started_at desc, node_id asc, session_id asc | take {MAX_SESSIONS + 1}"
                f" | project node_id, {SESSION_FIELDS} | extend row_type='session')"
            )
            rows = read(settings, q)
            summaries = [_fields(r, ("node_id", *METRICS)) for r in rows if r["row_type"] == "node"]
            totals = [_fields(r, METRICS) for r in rows if r["row_type"] == "total"]
            if len(totals) != 1:
                raise NodeViewError("Incomplete session totals", 503)
            details = [_fields(r, ("node_id", *SESSION_FIELDS.split(", "))) for r in rows if r["row_type"] == "session"]
    else:
        read_scope = getattr(db, "read_scope", None)
        with (
            read_scope(session=sid or None, since=None if sid else since, until=None if sid else until)
            if read_scope
            else contextlib.nullcontext()
        ):
            conn = db._conn()
            where, args = (
                ("session_id=?", (sid,)) if view == "session" else ("started_at>=? AND started_at<?", (since, until))
            )
            c = conn.execute(
                f"SELECT {SESSION_FIELDS} FROM sessions WHERE {where} ORDER BY started_at DESC, session_id LIMIT {MAX_SESSIONS + 1}",
                args,
            )
            details = [dict(zip((col[0] for col in c.description), r, strict=True)) | {"node_id": local} for r in c]
            if view == "overview":
                c = conn.execute(
                    f"SELECT COUNT(*),SUM(request_count),SUM(input_tokens),SUM(output_tokens),SUM(cost_usd) FROM sessions WHERE {where}",
                    args,
                )
                totals = [dict(zip(METRICS, (v or 0 for v in c.fetchone()), strict=True))]
                summaries = [{"node_id": local, **totals[0]}]
    for row in details:
        row["node_id"] = row["node_id"] or "legacy"
    if view == "session":
        if not details:
            raise NodeViewError("Session not found on the selected node", 404)
        return {**out, "rows": details}
    return {
        **out,
        "rows": [r | {"node_id": r["node_id"] or "legacy"} for r in summaries[:MAX_NODES]],
        "sessions": details[:MAX_SESSIONS],
        "totals": totals[0],
        "since": since,
        "until": until,
        "truncated": len(details) > MAX_SESSIONS or len(summaries) > MAX_NODES,
    }
