"""Projections for session identity, usage, and activity."""

import json
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any

from ...stores import local_node_id, normalize_node_id, store_for
from ...stores.base import Reader, ReadResult, StoreError

NODE_METRICS = ("sessions", "requests", "input_tokens", "output_tokens", "cost_usd")
NODE_SESSION_FIELDS = (
    "node_id", "session_id", "tool", "model", "project_path", "started_at", "ended_at",
    "request_count", "input_tokens", "output_tokens", "cost_usd",
)


def configured_reader(store: Any) -> Reader:
    return store_for(store).history_reader()


def capture_mode(owner: Any, *, default: str = "off") -> str:
    if mode := getattr(owner, "capture", None):
        return mode
    callback = getattr(getattr(owner, "_persistence", None), "capture_mode", None)
    if callback is not None and (mode := callback()):
        return mode
    facts = getattr(owner, "session_facts", None)
    return ("full" if facts.keeps_text() else "off") if facts is not None else default


def text_floor(owner: Any, now: float) -> float:
    facts = getattr(owner, "session_facts", None)
    if facts is not None:
        return facts.text_floor()
    days = getattr(owner, "_content_retention_days", None)
    return now - days * 86400 if days is not None else 0.0

def node_scope(node: str | None) -> dict:
    return {} if node is None else {"all_nodes": False, "requested_node": node}


def local_scope() -> dict:
    return node_scope(normalize_node_id(local_node_id()))


def complete_rows(result: ReadResult) -> list[dict]:
    if result.truncated:
        raise StoreError("History result is incomplete; narrow the filters")
    return result.rows


def _fields(row: dict, fields: tuple[str, ...]) -> dict:
    return {name: row.get(name) for name in fields}


def node_session(row: dict) -> dict:
    return _fields(row, NODE_SESSION_FIELDS) | {"node_id": row["node_id"] or "legacy"}


def node_overview(result: ReadResult, *, max_nodes: int, max_sessions: int) -> dict:
    totals = [_fields(r, NODE_METRICS) for r in result.rows if r["row_type"] == "total"]
    if len(totals) != 1:
        raise StoreError("Incomplete session totals")
    nodes = [
        _fields(r, NODE_METRICS) | {"node_id": r["node_id"] or "legacy"}
        for r in result.rows if r["row_type"] == "node"
    ]
    sessions = [node_session(r) for r in result.rows if r["row_type"] == "session"]
    return {
        "rows": nodes[:max_nodes], "sessions": sessions[:max_sessions], "totals": totals[0],
        "truncated": result.truncated or len(nodes) > max_nodes or len(sessions) > max_sessions,
    }


def _json_object(value: Any) -> dict:
    try:
        data = json.loads(value) if isinstance(value, str) else value
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


def event_rows(result: ReadResult) -> list[dict]:
    return [
        {
            "ts": r["ts"], "tool": r["tool"], "kind": r["kind"], "detail": _json_object(r["detail"]),
            "session_id": r["session_id"] or "", "pid": r["pid"] or 0,
        }
        for r in result.rows
    ]


def session_events(reader: Reader, sid: str, scope: dict, *, limit: int = 2000, raw_session: bool = False,
                   view: str = "events.page"):
    rows = event_rows(reader.read(view, {
        **scope, "requested_session": sid, "limit": limit, "raw_session": raw_session,
    }))
    return (SimpleNamespace(**row) for row in rows)


def event_params(*, since=None, until=None, tool=None, kinds=(), session_id=None) -> dict:
    return {
        key: value
        for key, value in {
            "since": since, "until": until, "requested_tool": tool, "requested_kinds": kinds,
            "requested_session": session_id,
        }.items()
        if value is not None
    }


def session_row(reader: Reader, sid: str, scope: dict, *, fragment: str = "") -> dict | None:
    result = reader.read("sessions.lookup", {
        **scope, "requested_session": sid, "session_fragment": fragment, "limit": 1,
    })
    return next(iter(result.rows), None)


def session_processes(sid: str, result: ReadResult) -> dict:
    rows = complete_rows(result)
    roles = {r["role"]: r["count"] for r in rows if r["row_type"] == "count"}
    return {
        "session_id": sid, "total": sum(roles.values()), "by_role": roles,
        "processes": [_fields(r, ("pid", "tool", "role", "joined_at")) for r in rows if r["row_type"] == "process"],
    }


@dataclass(frozen=True)
class HistoryScope:
    reader: Reader
    node: str | None
    qualified: bool = False

    @classmethod
    def local(cls, store: Any) -> "HistoryScope":
        return cls(configured_reader(store), normalize_node_id(local_node_id()))

    def require_reader(self) -> Reader:
        return self.reader

    def split(self, value: str) -> tuple[str | None, str]:
        if not self.qualified:
            return self.node, value
        from ..history_scope import identity_parts

        parts = identity_parts(value)
        if parts is None or (self.node is not None and parts[0] != self.node):
            raise StoreError("Invalid history scope for this session")
        return parts

    def keys(self, values) -> list[str]:
        scoped = (self.split(v) for v in values)
        return sorted({f"{len(node or '')}:{node or ''}{value}" for node, value in scoped})

    def read(self, view: str, *, sid: str = "", limit: int = 20_000, page: bool = False, **params) -> list[dict]:
        node, sid = self.split(sid) if sid else (self.node, "")
        query = {**node_scope(node), **({"requested_session": sid} if sid else {}), **params, "limit": limit}
        reader = self.require_reader()
        result = reader.read(view, query)
        if page or not result.truncated:
            return self.identify(result.rows)
        rows = list(result.rows)
        seen: set[str] = set()
        while result.truncated:
            cursor = result.next_page
            if not cursor or not result.rows or cursor in seen:
                raise StoreError(f"History result for {view} is incomplete: no advancing continuation")
            seen.add(cursor)
            result = reader.read(view, {**query, "after_row": cursor})
            rows.extend(result.rows)
        return self.identify(rows)

    def identify(self, rows: list[dict]) -> list[dict]:
        if not self.qualified:
            return rows
        from ..history_scope import identity

        return [
            row | {name: identity(row["node_id"], row[name]) for name in ("session_id", "agent_id") if row.get(name)}
            for row in rows
        ]


def project_usage(row: dict) -> dict:
    return row | {"daily": _json_object(row.get("daily_json")), "models": _json_object(row.get("models_json"))}


def exact_values(row: dict, values: str, count: str) -> list:
    items = row[values]
    if len(items) != row[count]:
        raise StoreError("History distribution is incomplete; narrow the filters")
    return items


def typed_rows(rows: list[dict]) -> dict[str, list[tuple]]:
    grouped: dict[str, list[tuple]] = {}
    for row in rows:
        grouped.setdefault(row["row_type"], []).append(tuple(row["values"]))
    return grouped


def scoped_records(history: HistoryScope, sid: str, part: str) -> dict:
    from .. import projection_utils

    reader = history.require_reader()
    scope = node_scope(history.node)
    if part == "events":
        params = {**scope, "requested_session": sid, "raw_session": True}
        total, = complete_rows(reader.read("events.count", {**params, "limit": 1}))
        rows = reader.read("events.page", {**params, "limit": 500}).rows
        columns = ("ts", "kind", "tool", "seq")
        return {"total": total["count"], "rows": [_fields(r, columns) | {"detail": projection_utils.mask_secrets(r["detail"])} for r in rows]}
    if part == "processes":
        body = session_processes(sid, reader.read("sessions.processes", {**scope, "requested_session": sid, "limit": 20_000}))
        return {"total": body["total"], "processes": body["processes"]}
    if part == "mcp":
        from ...analysis.mcp_usage import mcp_calls

        observed: dict[str, dict] = {}
        tool_history = HistoryScope(reader, history.node)
        for row in tool_history.read("tools.totals", sid=sid):
            server = projection_utils.mcp_server_of(row["tool_name"])
            if not server:
                continue
            data = observed.setdefault(server, {
                "server_name": server, "call_count": 0, "err_count": 0, "total_duration_ms": None, "last_ts": row["last_ts"],
            })
            data["call_count"] += row["calls"]
            data["err_count"] += row["failures"]
            if row["total_duration"]:
                data["total_duration_ms"] = (data["total_duration_ms"] or 0) + row["total_duration"]
            data["last_ts"] = max(data["last_ts"], row["last_ts"])
        for row in mcp_calls(session_events(reader, sid, scope, limit=20_000, raw_session=True)):
            observed.setdefault(row["server_name"], row)
        return {"servers": list(observed.values()), "total_calls": sum(r["call_count"] for r in observed.values())}
    if part == "calls":
        rows = complete_rows(reader.read("requests.records", {**scope, "requested_session": sid, "limit": 20_000}))
        totals = [r for r in rows if r["row_type"] == "model"]
        latency, = (r for r in rows if r["row_type"] == "latency")
        times = sorted(exact_values(latency, "times", "timed"))
        columns = ("ts", "session_id", "model", "input_tokens", "output_tokens", "duration_ms", "is_error", "error_type",
                   "http_status", "finish_reason")
        return {
            "calls": [_fields(r, columns) | {"session_id": sid, "status": "error" if r["is_error"] else "ok"}
                      for r in rows if r["row_type"] == "example"],
            "summary": {
                "total_calls": sum(r["calls"] for r in totals),
                "total_errors": sum(r["errors"] for r in totals),
                "by_model": {r["model"]: r["calls"] for r in totals},
                "avg_latency_ms": sum(times) / len(times) if times else None,
                "p95_latency_ms": projection_utils._percentile(times, 0.95),
            },
        }
    raise ValueError(f"Unknown session record type: {part}")
