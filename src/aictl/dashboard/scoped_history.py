"""Kusto-backed Board routes for a remote node or the whole fleet."""

import json
import logging
import math
import threading
import time
from datetime import datetime, timezone
from types import SimpleNamespace

from ..stores import UnresolvedObservationsError, has_history
from ..stores.base import StoreError
from ..tool_scope import is_selected, normalize_selection, stored_ids_for
from .history_scope import ScopeError, identity, label, parse_identity
from .projections.history import HistoryScope, complete_rows, configured_reader, node_scope, scoped_records
from .session_evidence import EvidenceInputError, session_evidence

logger = logging.getLogger(__name__)
_aux_locks = {name: threading.Lock() for name in ("machine", "context")}
_aux_cache: dict[str, dict[tuple, tuple[float, bytes]]] = {name: {} for name in _aux_locks}


def _reported_context(history, tools, now):
    from . import context_projection
    from .queryable_context import inventory_rows, inventory_snapshot, telemetry_rows

    inventory = history.read("files.inventory")
    telemetry = history.read("context.telemetry")
    daily = context_projection._read_context_daily(history, tools, now)
    growth = history.read("context.growth", since=now - context_projection.CONTEXT_GROWTH_S, until=now,
                          growth_points=context_projection.CONTEXT_GROWTH_POINTS, calendar_bins=True)
    nodes = {r["node_id"] for rows in (inventory, telemetry, daily, growth) for r in rows}
    # Each node's sample is the latest in its calendar bin; at the bin's start, the nodes share one
    # time axis, so a chart draws one line per node, not dots scattered between the others' times.
    width = context_projection.CONTEXT_GROWTH_S / context_projection.CONTEXT_GROWTH_POINTS
    parts = []
    for node in sorted(nodes, key=lambda n: (label(n) == "legacy", label(n))):
        reports = telemetry_rows([r for r in telemetry if r["node_id"] == node])
        for report in reports:
            report["as_of"] = datetime.fromtimestamp(report["ts"], timezone.utc).isoformat(timespec="seconds")
        snapshot = inventory_snapshot(inventory_rows([r for r in inventory if r["node_id"] == node]), reports, reported=True)
        snapshot.agent_memory = [r for r in snapshot.agent_memory if is_selected(r["tool"], tools)]
        data = context_projection._context_from_snapshot(snapshot, tools, now, True, {
            "daily": context_projection._daily_from_rows([r for r in daily if r["node_id"] == node], now),
            "observed": context_projection.observed_models([r for r in daily if r["node_id"] == node]),
            "growth": [{"ts": math.floor(r["ts"] / width) * width, "mem_tokens": r["mem_tokens"],
                        "memory_entries": r["memory_entries"]} for r in growth if r["node_id"] == node],
        }, global_budget=True)
        parts.append({**data, "node_id": label(node)})
    return {"generated_at": now, "nodes": parts}


def _reported_machine(history, tools, now):
    from .node_views import _status

    reports = history.require_reader().read("nodes.reports", {
        **node_scope(history.node), "report_mode": "machine", "limit": 20_000,
    })
    hosts = [
        {"node_id": label(r["node_id"]), "status": _status(r["ts"], now, stale=reports.stale), "ts": r["ts"],
         "host_cpu_percent": r["cpu_percent"], "host_memory_used_mb": r["memory_used_mb"],
         "host_memory_total_mb": r["memory_total_mb"], "live_sessions": r["active_sessions"],
         "active_processes": r["active_processes"] if r["daemon_pid"] else None,
         "daemon_pid": r["daemon_pid"], "files": r["files"], "live_in_rate": r["inbound_bps"],
         "live_out_rate": r["outbound_bps"], "ai_token_rate": r["ai_token_rate"]}
        for r in complete_rows(reports)
    ]
    rows = history.read("runtime.processes", limit=1001, restrict_tools=tools is not None,
                        requested_tools=list(stored_ids_for(tools)) if tools is not None else [])
    procs = [
        {k: r[k] for k in ("session_id", "pid", "tool", "role", "joined_at")} | {"node_id": label(r["node_id"])}
        for r in rows if r["row_type"] == "process"
    ]
    total, = (r["total"] for r in rows if r["row_type"] == "total")
    return {"generated_at": now, "hosts": hosts, "recorded_processes": procs, "recorded_total": total}


# The store of a node history request. One object keeps the flows built for these requests,
# keyed by reader and node, so the windows of a long flow do not read the session again.
_REPORTED = SimpleNamespace(_reported_history=True, capture="full", _keeps_text=lambda: True)


def route(db, scope, path, query, params, now, *, reader=None):
    from . import (
        artifact_details,
        board_filters,
        flow_projection,
        insights,
        memory_views,
        projection_utils,
        session_details,
        thinking,
    )
    from .session_record import _reader_search, finder_query

    def one(name):
        values = params.get(name, [""])
        if len(values) != 1 or len(values[0]) > 4096:
            raise ScopeError(f"Invalid {name}")
        return values[0]

    def number(name):
        value = one(name)
        if not value:
            return None
        try:
            result = float(value)
            if math.isfinite(result) and result >= 0:
                return result
        except ValueError:
            pass
        raise ScopeError(f"Invalid {name}")

    def integer(name, default, maximum):
        value = number(name)
        if value is None:
            return default
        if not value.is_integer() or value > maximum:
            raise ScopeError(f"{name} must be an integer between 0 and {maximum}")
        return int(value)

    def position(name):
        """A flow position: older events, read on demand, have negative positions."""
        value = one(name)
        if not value:
            return None
        try:
            result = int(value)
        except ValueError:
            raise ScopeError(f"Invalid {name}") from None
        if abs(result) > 10**9:
            raise ScopeError(f"{name} is out of range")
        return result

    def selected():
        return normalize_selection(p for v in params["tool"] for p in v.split(",")) if "tool" in params else None

    contract = {"kind": scope.kind, "node_id": label(scope.node) if scope.node is not None else None}

    def result(status, body):
        if status == 200:
            body = {**body, "node_scope": contract}
        return status, json.dumps(body).encode()

    endpoint = path.removeprefix("/api/board/") if path.startswith("/api/board/") else path
    if endpoint in {"excerpt", "health", "action"}:
        raise ScopeError("This route is available only on This node", 422, "local_only")
    reader = reader if reader is not None else configured_reader(db)
    if not has_history(reader):
        raise ScopeError("Node history requires a shared Kusto store", 422, "unsupported_scope")

    history = HistoryScope(reader, scope.node, qualified=True)
    try:
        lo, hi = number("since"), number("until")
        if lo is not None and hi is not None and lo >= hi:
            raise ScopeError("since must be earlier than until")
        if endpoint in _aux_locks:
            tools = selected()
            key = (reader, scope, tools)
            cache = _aux_cache[endpoint]
            with _aux_locks[endpoint]:
                hit = cache.get(key)
                if hit and time.monotonic() - hit[0] < (300 if endpoint == "context" else 45):
                    return 200, hit[1]
                project = _reported_context if endpoint == "context" else _reported_machine
                status, body = result(200, project(history, tools, now))
                cache[key] = (time.monotonic(), body)
                if len(cache) > 6:
                    cache.pop(next(iter(cache)))
                return status, body
        if endpoint == "projects":
            from .project_filter import catalog

            return result(200, catalog(history))
        if endpoint == "session/records":
            node, raw = parse_identity(one("session_id"), scope)
            part = one("part")
            if part not in {"events", "processes", "mcp", "calls"}:
                raise ScopeError("Unknown session record type")
            records = scoped_records(HistoryScope(reader, node), raw, part)
            if part == "calls":
                for call in records["calls"]:
                    call["session_id"] = identity(node, raw)
            return result(200, {"node_id": label(node), **records})
        if path in insights.ROUTES:
            return result(*insights.insight(insights.ROUTES[path], board_filters.parse_filters(query, now), now,
                                            history=history))
        if endpoint in {"mcp", "mcp/server", "convergence"}:
            from .board_routes import _pattern_view

            return result(*_pattern_view(path, params, query, now, history))
        if endpoint == "session/convergence":
            from .convergence import session_convergence

            node, raw = parse_identity(one("session_id"), scope)
            return result(*session_convergence(identity(node, raw), now, history=HistoryScope(reader, node, qualified=True)))
        if endpoint in {"tool", "error"}:
            name = one("name" if endpoint == "tool" else "key")
            if not name:
                raise ScopeError("Missing detail identifier")
            filters = board_filters.parse_filters(query, now)
            if abs(filters.until - now) <= 10:
                filters = board_filters._clock_range(filters)
            detail = artifact_details.tool_detail if endpoint == "tool" else artifact_details.error_detail
            return result(*detail(db, name, now, filters=filters, history=history))
        if endpoint == "sessions":
            try:
                finder = finder_query({**params, "limit": [str(integer("limit", 50, 200) or 1)]}, max_limit=200)
            except ValueError as exc:
                raise ScopeError(str(exc)) from exc
            return result(200, _reader_search(None, history, finder, now=now))
        if endpoint == "prompt":
            node, raw = parse_identity(one("session_id"), scope)
            ts = number("ts")
            if ts is None:
                raise ScopeError("Missing ts")
            return result(*artifact_details.prompt_detail(db, ts, identity(node, raw), now,
                                               history=HistoryScope(reader, node, qualified=True)))
        if endpoint == "skill":
            name = one("name")
            if not name:
                raise ScopeError("Missing detail identifier")
            return result(*artifact_details.skill_detail(db, name, now, lo, hi, selected(), history=history))
        if endpoint == "file":
            name = one("path")
            if not name:
                raise ScopeError("Missing detail identifier")
            node = scope.node
            if record := one("record"):
                node, raw_path = parse_identity(record, scope, max_length=4096)
                if raw_path != name:
                    raise ScopeError("The record does not match the requested path")
            elif node is None:
                raise ScopeError("A fleet file detail requires a node-qualified record")
            return result(*artifact_details.file_detail(db, name, now, since=lo, until=hi,
                                             history=HistoryScope(reader, node, qualified=True)))
        if path == "/api/board/thinking/search":
            return result(*thinking.handle(path, one, db, history, now, reported=True, query=query))
        if path in thinking.ROUTES:
            node, raw = parse_identity(one("session_id"), scope)
            return result(*thinking.handle(path, one, db, HistoryScope(reader, node, qualified=True), now, reported=True,
                                           session=identity(node, raw)))
        if path in memory_views.ROUTES:
            if endpoint.startswith("agent/"):
                node, raw = parse_identity(one("id"), scope)
                return result(*memory_views.handle(path, one, db, HistoryScope(reader, node, qualified=True), now,
                                                   agent=identity(node, raw)))
            node = scope.node
            if endpoint == "memory/versions" and (record := one("record")):
                node, raw_path = parse_identity(record, scope, max_length=4096)
                if raw_path != one("path"):
                    raise ScopeError("The record does not match the requested path")
            return result(*memory_views.handle(path, one, db, HistoryScope(reader, node, qualified=True), now))
        if endpoint in {"agent", "agent/flow", "agent/transcript", "/api/session-evidence"}:
            is_agent = endpoint.startswith("agent")
            node, raw = parse_identity(one("id" if is_agent else "session_id"), scope)
            history = HistoryScope(reader, node, qualified=True)
            aid = identity(node, raw)
            if is_agent:
                session_key, _ = projection_utils._resolve_agent(history, aid)
                if not history.split(session_key)[1]:
                    return result(404, {"error": "No such agent"})
            reported = _REPORTED
            if endpoint == "agent":
                return result(*session_details.agent_detail(reported, aid, now=now, history=history))
            if endpoint == "agent/flow":
                failed = one("failed")
                if failed not in {"", "0", "1"}:
                    raise ScopeError("failed must be 0 or 1")
                whole = one("whole")
                if whole not in {"", "0", "1"}:
                    raise ScopeError("whole must be 0 or 1")
                status, body = flow_projection.agent_flow(
                    reported, aid, lo, hi, now=now, limit=integer("limit", flow_projection.FLOW_DEFAULT_EVENTS, flow_projection.MAX_FLOW_EVENTS),
                    offset=position("offset"), failed=failed == "1", history=history, whole=whole == "1",
                    **{k: one(k) for k in ("q", "category", "tool_name", "flow_agent", "skill_name", "skill_phase")},
                )
                return result(status, {**body, "node_id": label(node)})
            if endpoint == "agent/transcript":
                return result(*flow_projection.agent_transcript(
                    reported, aid, now=now, turn=number("turn"), brief=one("full") not in {"1", "true", "yes"}, history=history,
                ))
            return result(200, session_evidence(reported, params, history=history))
        return result(404, {"error": "No such route"})
    except EvidenceInputError as exc:
        raise ScopeError(str(exc)) from exc
    except StoreError as exc:
        raise ScopeError(str(exc), 503, "query_failed") from exc
    except (ScopeError, UnresolvedObservationsError, board_filters.BoardRequestError):
        raise
    except Exception as exc:
        logger.exception("Historical dashboard query failed")
        raise ScopeError("Could not read the selected node history", 503, "query_failed") from exc
