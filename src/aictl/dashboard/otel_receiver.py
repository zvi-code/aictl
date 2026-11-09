# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""OTel (OpenTelemetry) protobuf parsing and metric mapping.

Parses OTLP JSON and protobuf payloads for metrics, logs, and traces,
producing Sample and EventRow objects for storage.
"""

from __future__ import annotations

import dataclasses
import json
import logging
import time
from dataclasses import dataclass, field

from ..data.token_usage import TokenUsage
from ..storage import EventRow, RequestRow, ToolInvocationRow
from ..storage import Sample as _Sample

logger = logging.getLogger(__name__)


# ── OtelReceiver ────────────────────────────────────────────────────

# Maps tool-specific OTel metric names → unified aictl internal names.
# Unknown metrics fall through as ``otel.<original_name>``.

METRIC_MAP: dict[str, str] = {
    # ── Claude Code ──────────────────────────────────────────
    "claude_code.token.usage": "otel.token.usage",
    "claude_code.cost.usage": "otel.cost.usage",
    "claude_code.session.count": "otel.session.count",
    "claude_code.active_time.total": "otel.active_time",
    "claude_code.lines_of_code.count": "otel.loc.count",
    "claude_code.commit.count": "otel.commit.count",
    "claude_code.pull_request.count": "otel.pr.count",
    "claude_code.code_edit_tool.decision": "otel.code_edit.decision",
    # ── VS Code Copilot (GenAI semantic conventions) ─────────
    "gen_ai.client.token.usage": "otel.token.usage",
    "gen_ai.client.operation.duration": "otel.operation.duration",
    "copilot_chat.session.count": "otel.session.count",
    "copilot_chat.agent.invocation.duration": "otel.agent.duration",
    "copilot_chat.tool.call.count": "otel.tool.call.count",
    "copilot_chat.tool.call.duration": "otel.tool.call.duration",
    # ── Codex CLI ────────────────────────────────────────────
    "codex.token.usage": "otel.token.usage",
    "codex.session.count": "otel.session.count",
    "codex.cost.usage": "otel.cost.usage",
}

# Events recognised for API-call tracking (all tools).
API_REQUEST_EVENTS = frozenset(
    {
        "api_request",  # Claude Code (current format)
        "claude_code.api_request",  # Claude Code (legacy format)
        "gen_ai.client.inference.operation.details",
        "copilot_chat.api_request",
        "codex.api_request",
    }
)

API_ERROR_EVENTS = frozenset(
    {
        "api_error",  # Claude Code (current format — unqualified, like api_request)
        "claude_code.api_error",  # Claude Code (legacy/qualified format)
        "copilot_chat.api_error",
        "codex.api_error",
    }
)

# OTLP AggregationTemporality enum: 1 = DELTA, 2 = CUMULATIVE. JSON encodes
# it either as the int or the enum name depending on the exporter.
_CUMULATIVE_TEMPORALITY = frozenset({2, "2", "AGGREGATION_TEMPORALITY_CUMULATIVE"})
_MAX_CUMULATIVE_SERIES = 20_000

# OTel log events that represent a *completed* tool invocation — they carry
# ``tool_name`` + ``duration_ms`` + ``tool_parameters``.  ``tool_decision`` is
# intentionally excluded: it is the permission gate, not an execution, so it
# has no duration/result and would double-count every real invocation.
TOOL_INVOCATION_EVENTS = frozenset(
    {
        "tool_result",  # Claude Code (current format)
        "claude_code.tool_result",  # Claude Code (legacy/qualified format)
    }
)

# Service-name → tool label for auto-detection when service.name is
# set but doesn't match a known tool verbatim.
SERVICE_NAME_ALIASES: dict[str, str] = {
    "claude-code": "claude-code",
    "claude_code": "claude-code",
    "anthropic-claude": "claude-code",
    # Copilot CLI's own resource name (its OTel code sets service.name "github-copilot").
    "github-copilot": "copilot-cli",
    "github-copilot-cli": "copilot-cli",
    "copilot-cli": "copilot-cli",
    "github-copilot-desktop": "copilot-desktop",
    "copilot-desktop": "copilot-desktop",
    # VS Code's Copilot Chat sets service.name "copilot-chat" unless OTEL_SERVICE_NAME is set.
    "github-copilot-chat": "copilot-vscode",
    "copilot": "copilot-vscode",
    "copilot-chat": "copilot-vscode",
    "codex-cli": "codex-cli",
    "codex": "codex-cli",
}


def _resolve_tool(service_name: str) -> str:
    """Map an OTLP service.name to an aictl tool identifier."""
    if not service_name:
        return "unknown"
    lower = service_name.lower().strip()
    if lower in SERVICE_NAME_ALIASES:
        return SERVICE_NAME_ALIASES[lower]
    # Heuristic fallback
    if "copilot" in lower:
        if "cli" in lower.split("-"):
            return "copilot-cli"
        if "desktop" in lower.split("-"):
            return "copilot-desktop"
        return "copilot-vscode"
    if "claude" in lower:
        return "claude-code"
    if "codex" in lower:
        return "codex-cli"
    return service_name


@dataclass
class OtelStats:
    """Receiver health counters."""

    metrics_received: int = 0
    events_received: int = 0
    last_receive_at: float = 0.0
    errors: int = 0
    api_calls_total: int = 0
    api_errors_total: int = 0
    # Per-item malformed attributes / data points skipped during parsing.
    # These were previously discarded silently; the counter makes the loss
    # visible in ``status()`` (and the Monitoring Health UI).
    dropped: int = 0
    # Per tool: {"metrics": n, "events": n, "last_at": ts}, so a tool that stopped
    # exporting shows, whatever the other tools send.
    by_tool: dict[str, dict] = field(default_factory=dict)

    def note(self, samples: list, events: list) -> None:
        """Count what one export brought, in total and per tool."""
        self.metrics_received += len(samples)
        self.events_received += len(events)
        if not samples and not events:
            return
        now = time.time()
        self.last_receive_at = now
        for kind, items in (("metrics", samples), ("events", events)):
            for item in items:
                tool = (
                    (getattr(item, "tags", None) or {}).get("tool") if kind == "metrics" else getattr(item, "tool", "")
                )
                row = self.by_tool.setdefault(tool or "unknown", {"metrics": 0, "events": 0, "last_at": 0.0})
                row[kind] += 1
                row["last_at"] = now


class OtelReceiver:
    """Parses OTLP JSON and produces Sample/EventRow objects."""

    def __init__(self) -> None:
        self.stats = OtelStats()
        # Last seen value per cumulative-Sum series, for delta conversion.
        self._cumulative_last: dict[tuple, float] = {}
        # Trace id -> session id, for spans and log records that do not name their
        # session themselves (Copilot CLI's execute_tool spans): a span of the same
        # trace that does (gen_ai.conversation.id) names it for the whole trace.
        self._trace_sessions: dict[str, str] = {}
        # Traces stored with no session id because no span of them named one yet.
        self._orphan_traces: set[str] = set()
        # Traces of _orphan_traces whose session a later export named: (trace id, session id).
        self._late_traces: list[tuple[str, str]] = []

    # ── Session of a trace ────────────────────────────────────

    def _note_trace(self, trace_id: str, session_id: str) -> None:
        if not trace_id or not session_id or self._trace_sessions.get(trace_id) == session_id:
            return
        if len(self._trace_sessions) >= _MAX_TRACES and trace_id not in self._trace_sessions:
            self._trace_sessions.clear()  # pathological; start over
        self._trace_sessions[trace_id] = session_id
        if trace_id in self._orphan_traces:
            self._orphan_traces.discard(trace_id)
            self._late_traces.append((trace_id, session_id))

    def _session_of_trace(self, attrs: dict, trace_id: str) -> str:
        """The session id of a span or log record: its own, else its trace's. Notes an orphan."""
        sid = str(attrs.get("session_id") or "")
        if sid:
            return sid
        sid = self._trace_sessions.get(trace_id, "") if trace_id else ""
        if sid:
            attrs["session_id"] = sid
        elif trace_id:
            if len(self._orphan_traces) >= _MAX_TRACES:
                self._orphan_traces.clear()
            self._orphan_traces.add(trace_id)
        return sid

    def take_late_traces(self) -> list[tuple[str, str]]:
        """(trace id, session id) of traces stored earlier without a session, now known. Clears the list."""
        late, self._late_traces = self._late_traces, []
        return late

    # ── Metrics ───────────────────────────────────────────────

    def _cumulative_to_delta(self, tool: str, name: str, tags: dict, value: float) -> float:
        """Convert a CUMULATIVE Sum point to the increment since its previous point.

        Stored samples are summed downstream (per-session token totals, cost
        charts), which is only correct for DELTA temporality. Claude Code
        exports delta by default, but Copilot, Gemini and Codex SDKs default
        to cumulative, and ``OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE
        =cumulative`` flips Claude Code too — a 10k-token session alive for an
        hour used to be stored as ~60 growing rows summing to ~300k.

        The first point of a series is stored as-is (it is the total since the
        process started); a value below the previous one means the process
        restarted, so the new value is again a fresh total.
        """
        key = (tool, name, tuple(sorted((k, str(v)) for k, v in tags.items() if k != "otel_metric")))
        last = self._cumulative_last.get(key)
        if len(self._cumulative_last) >= _MAX_CUMULATIVE_SERIES and key not in self._cumulative_last:
            self._cumulative_last.clear()  # pathological cardinality; start over
        self._cumulative_last[key] = value
        if last is None or value < last:
            return value
        return value - last

    def parse_metrics(self, body: dict) -> list[_Sample]:
        """Parse OTLP JSON ``/v1/metrics`` payload."""
        samples: list[_Sample] = []
        for rm in _iter_otel_dicts(body, "resourceMetrics"):
            resource_attrs = _parse_otel_attributes(
                (rm.get("resource") or {}).get("attributes", []),
                self.stats,
            )
            tool = _resolve_tool(resource_attrs.get("service.name", ""))

            for sm in _iter_otel_dicts(rm, "scopeMetrics"):
                for metric in _iter_otel_dicts(sm, "metrics"):
                    name = metric.get("name", "")
                    mapped = METRIC_MAP.get(name, f"otel.{name}")
                    sum_body = metric.get("sum")
                    cumulative = (
                        isinstance(sum_body, dict) and sum_body.get("aggregationTemporality") in _CUMULATIVE_TEMPORALITY
                    )

                    for dp in _extract_otel_data_points(metric, self.stats):
                        ts = _nano_to_epoch(dp.get("timeUnixNano", "0"))
                        value = _extract_otel_value(dp)
                        tags = _parse_otel_attributes(dp.get("attributes", []), self.stats)
                        tags["tool"] = tool
                        tags["otel_metric"] = name
                        _promote_session_id(tags, resource_attrs)
                        _promote_pid(tags, resource_attrs)
                        if cumulative:
                            value = self._cumulative_to_delta(tool, name, tags, value)
                            tags["otel_temporality"] = "cumulative"
                        samples.append(
                            _Sample(
                                ts=ts,
                                metric=mapped,
                                value=value,
                                tags=tags,
                            )
                        )

        self.stats.note(samples, [])
        return samples

    # ── Logs / events ─────────────────────────────────────────

    def parse_logs(self, body: dict) -> list[EventRow]:
        """Parse OTLP JSON ``/v1/logs`` payload."""
        events: list[EventRow] = []
        for rl in _iter_otel_dicts(body, "resourceLogs"):
            resource_attrs = _parse_otel_attributes(
                (rl.get("resource") or {}).get("attributes", []),
                self.stats,
            )
            tool = _resolve_tool(resource_attrs.get("service.name", ""))

            for sl in _iter_otel_dicts(rl, "scopeLogs"):
                for record in _iter_otel_dicts(sl, "logRecords"):
                    ts = _nano_to_epoch(record.get("timeUnixNano", "0"))
                    attrs = _parse_otel_attributes(
                        record.get("attributes", []),
                        self.stats,
                    )
                    # Record-level span/trace ids (when the exporter sets them)
                    # anchor tool-invocation dedup via source_event_id.
                    span_id = record.get("spanId") or record.get("span_id")
                    if span_id:
                        attrs["otel.span_id"] = span_id
                    trace_id = str(record.get("traceId") or record.get("trace_id") or "")
                    if trace_id:
                        attrs["otel.trace_id"] = trace_id

                    event_name = attrs.pop("event.name", "") or attrs.pop("name", "")
                    if not event_name:
                        body_val = record.get("body", {})
                        if isinstance(body_val, dict):
                            event_name = body_val.get(
                                "stringValue",
                                "otel_log",
                            )
                        else:
                            event_name = "otel_log"

                    kind = f"otel:{event_name}"
                    attrs["tool"] = tool
                    _promote_session_id(attrs, resource_attrs)
                    _promote_conversation_id(attrs)
                    _promote_pid(attrs, resource_attrs)
                    self._note_trace(trace_id, str(attrs.get("session_id") or ""))
                    self._session_of_trace(attrs, trace_id)

                    # Track API call stats
                    if event_name in API_REQUEST_EVENTS:
                        self.stats.api_calls_total += 1
                    elif event_name in API_ERROR_EVENTS:
                        self.stats.api_errors_total += 1

                    events.append(
                        EventRow(
                            ts=ts,
                            tool=tool,
                            kind=kind,
                            detail=attrs,
                            session_id=attrs.get("session_id", ""),
                            pid=int(attrs.get("pid", 0) or 0),
                        )
                    )

        self.stats.note([], events)
        return events

    @staticmethod
    def extract_requests(events: list[EventRow]) -> list[RequestRow]:
        """Extract RequestRow objects from OTel log events that represent API calls."""
        requests: list[RequestRow] = []
        for e in events:
            if not e.kind.startswith("otel:"):
                continue
            event_name = e.kind[5:]  # strip "otel:" prefix
            if event_name not in API_REQUEST_EVENTS:
                continue
            d = e.detail if isinstance(e.detail, dict) else {}
            usage = TokenUsage.from_dict(d)
            # e.ts is derived from OTel timeUnixNano — it IS the embedded
            # source timestamp, so pass it as source_ts for correct dedup.
            requests.append(
                RequestRow(
                    ts=e.ts,
                    source_ts=e.ts,  # OTel always has an embedded timestamp
                    session_id=e.session_id or d.get("session_id", ""),
                    pid=e.pid or int(d.get("pid", 0) or 0),
                    tool=e.tool,
                    model=(d.get("gen_ai.request.model") or d.get("gen_ai.response.model") or d.get("model", "")),
                    input_tokens=usage.input,
                    output_tokens=usage.output,
                    cache_read_tokens=usage.cache_read,
                    cache_creation_tokens=usage.cache_write,
                    cost_usd=float(d.get("cost_usd", 0) or 0),
                    duration_ms=float(d.get("duration_ms", 0) or 0),
                    finish_reason=_coerce_str(d.get("gen_ai.response.finish_reasons", "")),
                    is_error=1 if d.get("error") or d.get("is_error") else 0,
                    source="otel",
                    prompt_id=d.get("prompt.id", ""),
                )
            )
        return requests

    @staticmethod
    def extract_tool_invocations(events: list[EventRow]) -> list[ToolInvocationRow]:
        """Extract ToolInvocationRow objects from hook and OTel tool events.

        Two shapes feed this:

        * hook events (``hook:PostToolUse`` etc.) carrying ``tool_name``.
        * OTel ``tool_result`` log events (Claude Code telemetry): these carry
          ``tool_name`` + ``duration_ms`` + ``tool_parameters`` and are the
          *only* thing the OTel logs path (``parse_logs``) produces.  The old
          ``hook:``-only filter meant every OTel-derived tool invocation was
          silently discarded — this now persists them, populating
          ``source_event_id`` from the record span id / ``event.sequence`` so
          dedup treats repeated identical calls as distinct rows.
        """
        invocations: list[ToolInvocationRow] = []
        for e in events:
            d = e.detail if isinstance(e.detail, dict) else {}
            if e.kind.startswith("hook:"):
                tool_name = d.get("tool_name", "")
                if not tool_name:
                    continue
                # Hook events: source_ts is the timestamp embedded in the hook
                # payload, if present.  If absent, source_ts stays 0 and dedup
                # falls back to value-based comparison — every hook invocation
                # is an independent event.
                hook_ts = float(d.get("timestamp", 0) or d.get("ts", 0) or 0)
                invocations.append(
                    ToolInvocationRow(
                        ts=e.ts,
                        source_ts=hook_ts,
                        session_id=d.get("session_id", ""),
                        tool=e.tool,
                        tool_name=tool_name,
                        pid=int(d.get("pid", 0) or 0),
                        is_error=1 if d.get("is_error") else 0,
                        duration_ms=float(d.get("duration_ms", 0) or 0),
                        input=d.get("input", {}) if isinstance(d.get("input"), dict) else {},
                        result_summary=str(d.get("result", ""))[:500],
                        source="hook",
                    )
                )
                continue

            if not e.kind.startswith("otel:"):
                continue
            event_name = e.kind[5:]  # strip "otel:" prefix
            if event_name not in TOOL_INVOCATION_EVENTS:
                continue
            tool_name = d.get("tool_name", "")
            if not tool_name:
                continue
            invocations.append(
                ToolInvocationRow(
                    ts=e.ts,
                    source_ts=e.ts,  # OTel ts IS the embedded source timestamp
                    session_id=e.session_id or d.get("session_id", ""),
                    tool=e.tool,
                    tool_name=tool_name,
                    pid=e.pid or int(d.get("pid", 0) or 0),
                    is_error=0 if _otel_success(d.get("success")) else 1,
                    duration_ms=_num(d.get("duration_ms", 0)),
                    input=_otel_tool_input(d),
                    result_summary=str(d.get("tool_response", d.get("result", "")))[:500],
                    source="otel",
                    source_event_id=_otel_tool_event_id(d),
                )
            )
        return invocations

    # ── Traces (spans) ───────────────────────────────────────

    def parse_traces(self, body: dict) -> tuple[list[_Sample], list[EventRow]]:
        """Parse OTLP JSON ``/v1/traces`` payload."""
        samples: list[_Sample] = []
        events: list[EventRow] = []
        for rs in _iter_otel_dicts(body, "resourceSpans"):
            resource_attrs = _parse_otel_attributes(
                (rs.get("resource") or {}).get("attributes", []),
                self.stats,
            )
            tool = _resolve_tool(resource_attrs.get("service.name", ""))

            scope_spans = list(_iter_otel_dicts(rs, "scopeSpans"))
            # First pass: the session each trace belongs to, from any of its spans
            # that names it, so a span that comes before that one in the export gets it too.
            for ss in scope_spans:
                for span in _iter_otel_dicts(ss, "spans"):
                    named = _parse_otel_attributes(span.get("attributes", []))
                    _promote_session_id(named, resource_attrs)
                    _promote_conversation_id(named)
                    self._note_trace(str(span.get("traceId") or ""), str(named.get("session_id") or ""))

            for ss in scope_spans:
                for span in _iter_otel_dicts(ss, "spans"):
                    attrs = _parse_otel_attributes(span.get("attributes", []), self.stats)
                    name = span.get("name", "")
                    trace_id = str(span.get("traceId") or "")
                    span_id = str(span.get("spanId") or "")
                    parent_id = str(span.get("parentSpanId") or "")
                    start_ts = _nano_to_epoch(span.get("startTimeUnixNano", "0"))
                    end_ts = _nano_to_epoch(span.get("endTimeUnixNano", "0"))
                    duration_ms = (end_ts - start_ts) * 1000 if end_ts > start_ts else 0

                    attrs["tool"] = tool
                    attrs["span.name"] = name
                    for key, value in (
                        ("otel.trace_id", trace_id),
                        ("otel.span_id", span_id),
                        ("otel.parent_span_id", parent_id),
                    ):
                        if value:
                            attrs[key] = value
                    _promote_session_id(attrs, resource_attrs)
                    _promote_conversation_id(attrs)
                    _promote_pid(attrs, resource_attrs)
                    self._session_of_trace(attrs, trace_id)
                    if duration_ms > 0:
                        attrs["duration_ms"] = round(duration_ms, 1)

                    # Extract token usage from span attributes
                    for token_key in (
                        "gen_ai.usage.input_tokens",
                        "gen_ai.usage.output_tokens",
                        "gen_ai.usage.prompt_tokens",
                        "gen_ai.usage.completion_tokens",
                    ):
                        val = attrs.get(token_key)
                        if val is not None:
                            try:
                                mapped = METRIC_MAP.get("gen_ai.client.token.usage", "otel.token.usage")
                                tok_type = "input" if "input" in token_key or "prompt" in token_key else "output"
                                samples.append(
                                    _Sample(
                                        ts=start_ts,
                                        metric=mapped,
                                        value=float(val),
                                        tags={
                                            "tool": tool,
                                            "gen_ai.token.type": tok_type,
                                            "otel_metric": token_key,
                                            "gen_ai.request.model": attrs.get("gen_ai.request.model", ""),
                                        },
                                    )
                                )
                            except (ValueError, TypeError):
                                pass

                    # Extract duration as metric
                    if duration_ms > 0 and any(
                        k in name.lower() for k in ("inference", "chat", "api", "request", "completion")
                    ):
                        samples.append(
                            _Sample(
                                ts=start_ts,
                                metric=METRIC_MAP.get("gen_ai.client.operation.duration", "otel.operation.duration"),
                                value=duration_ms / 1000,
                                tags={"tool": tool, "span.name": name},
                            )
                        )

                    # Track API call events
                    kind = f"otel:{name}"
                    if any(k in name.lower() for k in ("api_request", "inference", "chat.completion")):
                        self.stats.api_calls_total += 1
                    status_code = span.get("status", {}).get("code", 0)
                    if status_code == 2:  # OTLP StatusCode ERROR
                        self.stats.api_errors_total += 1

                    otel_sid = attrs.get("session_id", "")
                    otel_pid = int(attrs.get("pid", 0) or 0)
                    events.append(
                        EventRow(
                            ts=start_ts,
                            tool=tool,
                            kind=kind,
                            detail=attrs,
                            session_id=otel_sid,
                            pid=otel_pid,
                        )
                    )

                    # Span-level events (e.g. exceptions)
                    for span_event in span.get("events", []):
                        ev_ts = _nano_to_epoch(span_event.get("timeUnixNano", "0"))
                        ev_attrs = _parse_otel_attributes(span_event.get("attributes", []), self.stats)
                        ev_attrs["tool"] = tool
                        ev_attrs["parent_span"] = name
                        # A span event belongs to its span: same session, same trace.
                        for key, value in (("otel.trace_id", trace_id), ("otel.span_id", span_id)):
                            if value:
                                ev_attrs[key] = value
                        if otel_sid:
                            ev_attrs["session_id"] = otel_sid
                        ev_name = span_event.get("name", "span_event")
                        events.append(
                            EventRow(
                                ts=ev_ts,
                                tool=tool,
                                kind=f"otel:{ev_name}",
                                detail=ev_attrs,
                                session_id=otel_sid,
                                pid=otel_pid,
                            )
                        )

        self.stats.note(samples, events)
        return samples, events

    # ── Status ────────────────────────────────────────────────

    def status(self) -> dict:
        """Return receiver health as a JSON-serializable dict."""
        now = time.time()
        return {**dataclasses.asdict(self.stats), "active": self.stats.last_receive_at > now - 300}


# ── OTLP JSON helpers ─────────────────────────────────────────────


def _iter_otel_dicts(container, key: str):
    """Yield dict children at ``container[key]``, tolerating malformed input.

    OTLP payloads arrive from untrusted clients; a non-dict container or a
    non-list child collection yields nothing instead of raising.
    """
    if not isinstance(container, dict):
        return
    children = container.get(key, [])
    if not isinstance(children, list):
        return
    for child in children:
        if isinstance(child, dict):
            yield child


def _parse_otel_attributes(attrs: list[dict], stats: OtelStats | None = None) -> dict:
    """Convert OTLP ``KeyValue[]`` to a flat Python dict.

    Defensive against malformed payloads from untrusted OTLP clients: a
    non-list ``attrs``, a non-dict entry, or a malformed ``arrayValue`` is
    skipped rather than raising, so one bad attribute never poisons the
    whole batch.  When *stats* is supplied, each per-attribute skip bumps
    ``stats.dropped`` so the silent loss is observable.
    """
    result: dict = {}
    if not isinstance(attrs, list):
        return result
    for kv in attrs:
        if not isinstance(kv, dict):
            if stats is not None:
                stats.dropped += 1
            continue
        key = kv.get("key", "")
        v = kv.get("value", {})
        if not isinstance(v, dict):
            if stats is not None:
                stats.dropped += 1
            continue
        if "stringValue" in v:
            result[key] = v["stringValue"]
        elif "intValue" in v:
            try:
                result[key] = int(v["intValue"])
            except (ValueError, TypeError):
                if stats is not None:
                    stats.dropped += 1
                continue
        elif "doubleValue" in v:
            try:
                result[key] = float(v["doubleValue"])
            except (ValueError, TypeError):
                if stats is not None:
                    stats.dropped += 1
                continue
        elif "boolValue" in v:
            result[key] = bool(v["boolValue"])
        elif "arrayValue" in v:
            arr = v["arrayValue"]
            values = arr.get("values", []) if isinstance(arr, dict) else []
            result[key] = [_extract_any_otel_value(x) for x in values if isinstance(x, dict)]
    return result


def _otel_success(val) -> bool:
    """Interpret an OTel ``tool_result`` ``success`` attribute as a boolean.

    Claude Code sends ``"true"``/``"false"`` strings; be tolerant of bools
    and ints. Absent/unknown is treated as success (no error).
    """
    if val is None:
        return True
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in ("true", "1", "yes", "ok", "success")


def _otel_tool_input(d: dict) -> dict:
    """Extract the tool-input dict from an OTel ``tool_result`` event.

    Claude Code carries the invocation args as a JSON string in
    ``tool_parameters`` (e.g. the Bash command line); parse it to a dict,
    else wrap the raw value so nothing is lost.
    """
    raw = d.get("tool_parameters")
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw:
        try:
            parsed = json.loads(raw)
        except (ValueError, TypeError):
            return {"tool_parameters": raw}
        return parsed if isinstance(parsed, dict) else {"tool_parameters": raw}
    inp = d.get("input")
    return inp if isinstance(inp, dict) else {}


def _otel_tool_event_id(d: dict) -> str:
    """Best-effort stable id for a tool invocation, anchoring dedup.

    Prefers a captured OTel span id; falls back to ``session:event.sequence``
    (both present on Claude Code ``tool_result`` logs); else empty (dedup
    falls back to value-based comparison).
    """
    span_id = d.get("otel.span_id") or d.get("span_id")
    if span_id:
        return str(span_id)
    seq = d.get("event.sequence")
    if seq not in (None, ""):
        return f"{d.get('session_id', '')}:{seq}"
    return ""


# Well-known OTel attribute names that carry session identifiers.
_SESSION_ID_KEYS = ("session.id", "sessionId", "session_id")
# The OpenTelemetry GenAI convention names the conversation a span or log record
# belongs to with this attribute: Copilot CLI and Copilot Chat set it to their
# session id. Metrics do not carry it (it would split every series per session).
CONVERSATION_ID_KEY = "gen_ai.conversation.id"
# At most this many traces are remembered for their session.
_MAX_TRACES = 20_000


def _promote_conversation_id(attrs: dict) -> None:
    """``gen_ai.conversation.id`` is the session id when no session attribute names one."""
    if attrs.get("session_id"):
        return
    val = attrs.get(CONVERSATION_ID_KEY)
    if isinstance(val, str) and val:
        attrs["session_id"] = val


def _promote_session_id(attrs: dict, resource_attrs: dict | None = None) -> None:
    """Promote well-known session ID attributes to ``session_id``."""
    if "session_id" in attrs:
        return
    for source in (resource_attrs, attrs) if resource_attrs else (attrs,):
        if source is None:
            continue
        for key in _SESSION_ID_KEYS:
            val = source.get(key)
            if val:
                attrs["session_id"] = val
                return


# Well-known OTel attribute names that carry a process identifier.
_PID_KEYS = ("process.pid", "os.process.id", "pid")


def _promote_pid(attrs: dict, resource_attrs: dict | None = None) -> None:
    """Promote well-known PID attributes to ``pid`` (int)."""
    if attrs.get("pid"):
        return
    for source in (resource_attrs, attrs) if resource_attrs else (attrs,):
        if source is None:
            continue
        for key in _PID_KEYS:
            val = source.get(key)
            if val:
                try:
                    attrs["pid"] = int(val)
                except (ValueError, TypeError):
                    continue
                return


def _extract_any_otel_value(value: dict):
    """Extract a single OTLP AnyValue."""
    for vtype in ("stringValue", "intValue", "doubleValue", "boolValue"):
        if vtype in value:
            return value[vtype]
    return None


def _coerce_str(val) -> str:
    """Coerce a value to string — joins lists with comma, passes strings through."""
    if isinstance(val, list):
        return ",".join(str(v) for v in val)
    return str(val) if val is not None else ""


def _nano_to_epoch(nano_str: str | int) -> float:
    """Convert nanosecond timestamp string to epoch seconds."""
    try:
        return int(nano_str) / 1_000_000_000
    except (ValueError, TypeError):
        return time.time()


def _extract_otel_value(data_point: dict) -> float:
    """Extract a numeric value from an OTLP data point.

    Sum/gauge points carry ``asInt``/``asDouble`` (``asInt`` is a string in
    OTLP JSON). Histogram/summary points carry ``sum`` + ``count`` instead;
    for those the stored scalar is the mean over the export interval, which
    is the meaningful per-sample value for duration histograms such as
    ``gen_ai.client.operation.duration``. Storing 0.0 for them (the old
    behavior) made every Copilot duration metric read as zero while the
    receiver's health counters stayed green.
    """
    for key in ("asInt", "asDouble"):
        if key in data_point:
            try:
                return float(data_point[key])
            except (ValueError, TypeError):
                pass
    if "sum" in data_point and "count" in data_point:
        try:
            total = float(data_point["sum"])
            count = float(data_point["count"])
        except (ValueError, TypeError):
            return 0.0
        return total / count if count > 0 else 0.0
    return 0.0


def _extract_otel_data_points(metric: dict, stats: OtelStats | None = None) -> list[dict]:
    """Extract data points from any OTLP metric type (sum, gauge, etc.).

    Defensive: a malformed metric body (non-dict ``sum``/``gauge``/... or a
    non-list ``dataPoints``) yields no points instead of raising.  When
    *stats* is supplied, each non-dict data point skipped bumps
    ``stats.dropped``.
    """
    if not isinstance(metric, dict):
        return []
    for mtype in ("sum", "gauge", "histogram", "summary"):
        body = metric.get(mtype)
        if isinstance(body, dict):
            points = body.get("dataPoints", [])
            if not isinstance(points, list):
                return []
            kept = [p for p in points if isinstance(p, dict)]
            if stats is not None and len(kept) != len(points):
                stats.dropped += len(points) - len(kept)
            return kept
    return []


# ─── OTLP protobuf support (lazy-loaded) ────────────────────────

_otlp_proto_classes: dict | None = None


def _load_otlp_proto() -> dict:
    """Load OTLP protobuf message classes.  Returns empty dict if not installed."""
    global _otlp_proto_classes
    if _otlp_proto_classes is not None:
        return _otlp_proto_classes
    try:
        from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
            ExportLogsServiceRequest,
        )
        from opentelemetry.proto.collector.metrics.v1.metrics_service_pb2 import (
            ExportMetricsServiceRequest,
        )
        from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import (
            ExportTraceServiceRequest,
        )

        _otlp_proto_classes = {
            "metrics": ExportMetricsServiceRequest,
            "logs": ExportLogsServiceRequest,
            "traces": ExportTraceServiceRequest,
        }
    except ImportError:
        _otlp_proto_classes = {}
    return _otlp_proto_classes


def _num(v) -> float:
    """Coerce value to float (OTel attributes may arrive as strings)."""
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0
