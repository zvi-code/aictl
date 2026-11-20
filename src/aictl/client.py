# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""HTTP client for the daemon's live stream and dashboard details."""

from __future__ import annotations

import json
import urllib.request
from collections.abc import Callable, Iterator, Mapping
from contextlib import closing
from dataclasses import dataclass
from http.client import HTTPException
from typing import Any, BinaryIO, NotRequired, TypedDict
from urllib.parse import urlencode

from .dashboard.contract import CONTRACT_VERSION

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8484
LIVE_PROTOCOL = 1
LIVE_STREAM = "/api/live/stream"

Row = dict[str, Any]


class BoardNodes(TypedDict, total=False):
    local_node: dict[str, str]
    totals: Row | None
    shared_kusto: Row | None
    rows: list[Row]
    sessions: list[Row]
    truncated: bool


class TerminalResources(TypedDict):
    timestamp: float
    root: str
    tools: list[Row]
    agent_memory: list[Row]
    mcp_detail: list[Row]
    tool_configs: list[Row]
    tool_telemetry: list[Row]
    live_monitor: Row
    agent_teams: NotRequired[list[Row]]
    cpu_cores: int
    cpu_per_core: list[float]


class EventRow(TypedDict):
    ts: float
    tool: str
    kind: str
    detail: Row
    session_id: str
    pid: int


class SessionDetail(TypedDict):
    session_id: str
    tool: str
    pids: list[int]
    duration_s: NotRequired[float]
    file_events: NotRequired[int]
    exact_input_tokens: NotRequired[int]
    exact_output_tokens: NotRequired[int]
    inbound_bytes: NotRequired[int]
    outbound_bytes: NotRequired[int]
    state_bytes_written: NotRequired[int]


class MetricRow(TypedDict):
    metric: str
    count: int
    last_value: float | None


class MetricSeries(TypedDict):
    ts: list[float]
    value: list[float]


class FilePreview(TypedDict):
    text: str
    truncated: bool


class LiveProtocolError(ValueError):
    """The stream could not be applied without losing state."""


@dataclass(frozen=True)
class LiveState:
    """One applied cursor and its entities, keyed by topic then wire ID."""

    scope: str
    history: bool
    cursor: str
    epoch: str
    sequence: int
    entities: Mapping[str, Mapping[str, Row]]

    def values(self, topic: str) -> Iterator[Row]:
        return (entity["data"] for entity in self.entities.get(topic, {}).values())


def _sse_frames(response: BinaryIO, cancelled: Callable[[], bool]) -> Iterator[tuple[str, str, str]]:
    event = cursor = ""
    data: list[str] = []
    while not cancelled() and (raw := response.readline()):
        line = raw.decode("utf-8").rstrip("\r\n")
        if not line:
            if data:
                yield event, cursor, "\n".join(data)
            event = cursor = ""
            data.clear()
            continue
        field, sep, value = line.partition(":")
        if not sep or not field:
            continue
        value = value.removeprefix(" ")
        if field == "event":
            event = value
        elif field == "id":
            cursor = value
        elif field == "data":
            data.append(value)


def _apply_frame(
    state: LiveState | None, event: str, cursor: str, raw: str, scope: str, history: bool
) -> LiveState | None:
    if event not in {"bootstrap", "resync", "reset", "change"}:
        return state
    try:
        payload = json.loads(raw)
        epoch, sequence = payload["epoch"], payload["sequence"]
        if (
            payload["protocol"] != LIVE_PROTOCOL or payload["scope"] != scope
            or type(sequence) is not int or sequence < 0 or not isinstance(epoch, str)
            or not cursor or payload["cursor"] != cursor
        ):
            raise LiveProtocolError("Incompatible live stream envelope")

        if event != "change":
            if event in {"resync", "reset"} and "entities" not in payload:
                return None  # Wait for the replacement bootstrap.
            topics: dict[str, Mapping[str, Row]] = {}
            upserts, removals = payload["entities"], []
        else:
            if state is None or state.epoch != epoch:
                raise LiveProtocolError("Live change has no matching bootstrap")
            if sequence <= state.sequence:
                return state
            topics = dict(state.entities)
            upserts, removals = payload["upserts"], payload["removals"]

        changed: dict[str, dict[str, Row]] = {}
        for records, remove in ((removals, True), (upserts, False)):
            for record in records:
                topic, entity_id = record["topic"], record["id"]
                if topic not in changed:
                    changed[topic] = dict(topics.get(topic, {}))
                if remove:
                    changed[topic].pop(entity_id, None)
                else:
                    if not isinstance(record["data"], dict):
                        raise LiveProtocolError("Invalid live entity data")
                    changed[topic][entity_id] = record
        topics.update(changed)
        return LiveState(scope, history, cursor, epoch, sequence, topics)
    except (KeyError, TypeError, json.JSONDecodeError) as exc:
        raise LiveProtocolError("Invalid live stream frame") from exc


class ServerClient:
    """HTTP client for a running aictl daemon."""

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    @classmethod
    def try_connect(
        cls, host: str = DEFAULT_HOST, port: int = DEFAULT_PORT, timeout: float = 1.5
    ) -> ServerClient | None:
        client = cls(f"http://{host}:{port}")
        return client if client.is_alive(timeout=timeout) else None

    def is_alive(self, *, timeout: float = 1.5) -> bool:
        try:
            caps = self._get_json("/api/live/capabilities", timeout=timeout)
        except (OSError, ValueError, HTTPException):
            return False
        return (
            isinstance(caps, dict)
            and caps.get("enabled") is True
            and type(caps.get("protocol")) is int
            and caps["protocol"] == LIVE_PROTOCOL
            and type(caps.get("contract_version")) is int
            and caps["contract_version"] == CONTRACT_VERSION
            and caps.get("stream") == LIVE_STREAM
        )

    def _url(self, path: str, params: Mapping[str, str | int | float] | None = None) -> str:
        return self.base_url + path + ("?" + urlencode(params) if params else "")

    def _get_json(
        self, path: str, params: Mapping[str, str | int | float] | None = None, *, timeout: float = 10.0
    ) -> Any:
        req = urllib.request.Request(self._url(path, params), headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.load(resp)

    def get_board_nodes(
        self,
        view: str,
        *,
        scope: str = "local",
        node_id: str | None = None,
        session_id: str | None = None,
        since: float | None = None,
        until: float | None = None,
    ) -> BoardNodes:
        params = {"view": view, "scope": scope}
        params.update({k: str(v) for k, v in (
            ("node_id", node_id), ("session_id", session_id), ("since", since), ("until", until)
        ) if v is not None})
        return self._get_json("/api/board/nodes", params, timeout=25.0)

    def get_terminal_resources(self, *, export: bool = False) -> TerminalResources:
        return self._get_json("/api/board/terminal/resources", {"export": 1} if export else None)

    def get_terminal_sessions(self) -> list[SessionDetail]:
        return self._get_json("/api/board/terminal/sessions")

    def get_terminal_events(self, *, limit: int = 100) -> list[EventRow]:
        return self._get_json("/api/board/terminal/events", {"limit": limit})

    def get_metric_inventory(self) -> list[MetricRow]:
        return self._get_json("/api/board/terminal/metrics")

    def get_metric_series(self, metric: str, *, since: float) -> MetricSeries:
        return self._get_json("/api/board/terminal/metrics", {"metric": metric, "since": since})

    def get_file_preview(self, path: str) -> FilePreview:
        return self._get_json("/api/board/terminal/file", {"path": path})

    def stream(
        self,
        query: Mapping[str, str] | None = None,
        *,
        history: bool = True,
        resume: LiveState | None = None,
        timeout: float = 35.0,
        cancelled: Callable[[], bool] = lambda: False,
    ) -> Iterator[LiveState]:
        """Yield applied states. Pass the last state as ``resume`` after a disconnect."""
        params = {key: value for key, value in (query or {}).items() if key not in {"cursor", "history"}}
        scope = urlencode(sorted(params.items()))
        if resume is not None and (resume.scope != scope or resume.history != history):
            raise ValueError("Cannot resume a different live subscription")
        params["history"] = "1" if history else "0"
        if resume is not None:
            params["cursor"] = resume.cursor
        req = urllib.request.Request(self._url(LIVE_STREAM, params), headers={"Accept": "text/event-stream"})
        state = resume
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            for event, cursor, raw in _sse_frames(resp, cancelled):
                updated = _apply_frame(state, event, cursor, raw, scope, history)
                if updated is not state and updated is not None:
                    yield updated
                state = updated

    def read_live(self, *, history: bool = False, timeout: float = 5.0) -> LiveState:
        """Read one bootstrap and close the connection."""
        with closing(self.stream(history=history, timeout=timeout)) as stream:
            state = next(stream, None)
        if state is None:
            raise LiveProtocolError("Daemon closed the stream before the live bootstrap")
        return state

    def kill_session(self, session_id: str, signal: str = "TERM") -> Row:
        req = urllib.request.Request(
            self._url("/api/session-kill"),
            data=json.dumps({"session_id": session_id, "confirm": True, "signal": signal}).encode("utf-8"),
            method="POST",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            return json.load(resp)

    def __repr__(self) -> str:
        return f"ServerClient({self.base_url!r})"
