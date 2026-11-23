"""Source authority and wire identities for the live dashboard."""

from __future__ import annotations

import hashlib
import json
from urllib.parse import parse_qsl, urlencode

PROTOCOL_VERSION = 1
STREAM_PATH = "/api/live/stream"

AGENT_RUNTIME_FIELDS = (
    "id",
    "session_id",
    "native_session_id",
    "monitor_session_id",
    "tool",
    "project",
    "project_path",
    "pids",
    "running",
    "native_activity",
    "status",
    "cpu_percent",
    "mem_mb",
    "title",
    "parent_id",
    "started_at",
    "last_native_at",
    "status_evidence",
    "unlinked_reason",
)
_OUTPUT_FIELDS = (
    "session_id",
    "native_session_id",
    "tool",
    "entry_id",
    "event_id",
    "order",
    "kind",
    "text",
    "ts",
    "agent_id",
    "progress",
    "content_retained",
    "text_suppressed",
    "text_truncated",
    "tail_truncated",
)
_PROCESS_FIELDS = (
    "pid",
    "ppid",
    "created_at",
    "name",
    "tool",
    "cwd",
    "cpu_percent",
    "memory_rss_bytes",
    "present",
    "session_id",
)

# These are delivery/authority rules, not another discovery or datapoint registry.
TOPICS = {
    "runtime.process": {"sources": ["runtime.collector"], "delivery": "latest", "fields": list(_PROCESS_FIELDS)},
    "runtime.agent": {
        "sources": ["runtime.collector"],
        "delivery": "latest",
        "fields": list(AGENT_RUNTIME_FIELDS),
    },
    "runtime.machine": {"sources": ["runtime.collector"], "delivery": "latest"},
    "runtime.health": {"sources": ["runtime.operational"], "delivery": "latest"},
    "runtime.output": {"sources": ["runtime.native"], "delivery": "ordered", "fields": list(_OUTPUT_FIELDS)},
    "configuration.file": {"sources": ["filesystem.config"], "delivery": "latest"},
    "configuration.loaded": {"sources": ["runtime.evidence", "runtime.native"], "delivery": "latest"},
    "configuration.board": {"sources": ["filesystem.config"], "delivery": "latest"},
    "history.board": {"sources": ["kusto.queryable"], "delivery": "latest"},
    "history.agent": {"sources": ["kusto.queryable"], "delivery": "latest"},
    "catalog.board": {"sources": ["catalog"], "delivery": "latest"},
    "source.status": {"sources": ["runtime.operational"], "delivery": "latest"},
}

SOURCE_POLICY = {
    "cpu": "runtime.collector",
    "memory": "runtime.collector",
    "process_presence": "runtime.collector",
    "agent_state": "runtime.collector",
    "native_output": "runtime.native",
    "configured_on_disk": "filesystem.config",
    "loaded_configuration": ["runtime.evidence", "runtime.native"],
    "historical_sessions": "kusto.queryable",
    "files": "kusto.queryable",
    "hooks": "kusto.queryable",
    "otel": "kusto.queryable",
    "usage": "kusto.queryable",
    "cost": "kusto.queryable",
    "activity": "kusto.queryable",
}

_CONTROL_PARAMS = frozenset({"cursor", "history", "agent_watch"})
AGENT_VIEWS = frozenset({"detail", "flow", "transcript"})


def stable_id(*parts: object) -> str:
    """Unambiguous identity from native, host-scoped identity parts."""
    raw = json.dumps(parts, ensure_ascii=True, separators=(",", ":"), sort_keys=True).encode()
    return hashlib.blake2b(raw, digest_size=16).hexdigest()


def canonical_scope(query: str) -> str:
    """The board query is the scope; transport controls never change its identity."""
    if len(query) > 8192:
        raise ValueError("Live query is too long")
    return urlencode(
        sorted((key, value) for key, value in parse_qsl(query, keep_blank_values=True) if key not in _CONTROL_PARAMS)
    )


def parse_agent_watch(query: str) -> tuple[str, str] | None:
    watches = [value for key, value in parse_qsl(query, keep_blank_values=True) if key == "agent_watch"]
    if not watches:
        return None
    view, sep, agent_id = watches[0].partition(":")
    if (len(watches) != 1 or view not in AGENT_VIEWS or not sep or not agent_id or
            len(agent_id) > 512 or any(ord(char) < 32 for char in agent_id)):
        raise ValueError("Invalid agent watch")
    return view, agent_id


def watched_agent_id(watch: tuple[str, str]) -> str:
    return stable_id(*watch)


def validate_source(topic: str, source: str) -> None:
    spec = TOPICS.get(topic)
    if spec is None or source not in spec["sources"]:
        raise ValueError(f"{source!r} is not authoritative for {topic!r}")


def validate_data(topic: str, data: dict) -> None:
    if topic in {"runtime.agent", "runtime.output", "runtime.process"}:
        extra = set(data) - set(TOPICS[topic]["fields"])
        if extra:
            raise ValueError(
                "Runtime entities cannot publish historical fields or raw payloads: " + ", ".join(sorted(extra))
            )


def capabilities() -> dict:
    """Cheap capability discovery: no history, filesystem scan, or SDK request."""
    from ..contract import CONTRACT_VERSION

    return {
        "enabled": True,
        "protocol": PROTOCOL_VERSION,
        "contract_version": CONTRACT_VERSION,
        "stream": STREAM_PATH,
        "source_policy": SOURCE_POLICY,
        "topics": TOPICS,
        "datapoint_catalog": "/api/datapoints",
        "history": "queryable Kusto only",
        "configuration": "configured-on-disk is not evidence of loaded configuration",
        "sequence": "monotonic, not contiguous after filtering or latest-value coalescing",
    }


def entity_visible(entity: dict, scope: str, history: bool, agent_entity: str | None = None) -> bool:
    topic = entity["topic"]
    if topic == "history.agent":
        return history and entity["id"] == agent_entity
    data = entity.get("data") or {}
    entity_scope = data.get("scope", entity.get("scope"))
    if entity_scope is not None and (not history or entity_scope != scope):
        return False
    return history or not topic.startswith(("history.", "catalog.board", "configuration.board"))


def sse_bytes(event: str, payload: dict) -> bytes:
    data = json.dumps(payload, ensure_ascii=True, separators=(",", ":"), allow_nan=False)
    return f"id: {payload['cursor']}\nevent: {event}\ndata: {data}\n\n".encode()
