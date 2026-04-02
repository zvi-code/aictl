# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""OTel (OpenTelemetry) protobuf parsing and metric mapping.

Parses OTLP JSON and protobuf payloads for metrics, logs, and traces,
producing Sample and EventRow objects for storage.
"""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass
import logging
import time

from ..storage import EventRow, RequestRow, ToolInvocationRow, Sample as _Sample

logger = logging.getLogger(__name__)


# ── OtelReceiver ────────────────────────────────────────────────────

# Maps tool-specific OTel metric names → unified aictl internal names.
# Unknown metrics fall through as ``otel.<original_name>``.

METRIC_MAP: dict[str, str] = {
    # ── Claude Code ──────────────────────────────────────────
    "claude_code.token.usage":            "otel.token.usage",
    "claude_code.cost.usage":             "otel.cost.usage",
    "claude_code.session.count":          "otel.session.count",
    "claude_code.active_time.total":      "otel.active_time",
    "claude_code.lines_of_code.count":    "otel.loc.count",
    "claude_code.commit.count":           "otel.commit.count",
    "claude_code.pull_request.count":     "otel.pr.count",
    "claude_code.code_edit_tool.decision": "otel.code_edit.decision",

    # ── VS Code Copilot (GenAI semantic conventions) ─────────
    "gen_ai.client.token.usage":              "otel.token.usage",
    "gen_ai.client.operation.duration":       "otel.operation.duration",
    "copilot_chat.session.count":             "otel.session.count",
    "copilot_chat.agent.invocation.duration": "otel.agent.duration",
    "copilot_chat.tool.call.count":           "otel.tool.call.count",
    "copilot_chat.tool.call.duration":        "otel.tool.call.duration",

    # ── Codex CLI ────────────────────────────────────────────
    "codex.token.usage":     "otel.token.usage",
    "codex.session.count":   "otel.session.count",
    "codex.cost.usage":      "otel.cost.usage",
}

# Events recognised for API-call tracking (all tools).
API_REQUEST_EVENTS = frozenset({
    "api_request",               # Claude Code (current format)
    "claude_code.api_request",   # Claude Code (legacy format)
    "gen_ai.client.inference.operation.details",
    "copilot_chat.api_request",
    "codex.api_request",
})

API_ERROR_EVENTS = frozenset({
    "claude_code.api_error",
    "copilot_chat.api_error",
    "codex.api_error",
})

# Service-name → tool label for auto-detection when service.name is
# set but doesn't match a known tool verbatim.
SERVICE_NAME_ALIASES: dict[str, str] = {
    "claude-code":          "claude-code",
    "claude_code":          "claude-code",
    "anthropic-claude":     "claude-code",
    "github-copilot-chat":  "copilot-vscode",
    "github-copilot":       "copilot-vscode",
    "copilot":              "copilot-vscode",
    "copilot-chat":         "copilot-vscode",
    "codex-cli":            "codex-cli",
    "codex":                "codex-cli",
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


class OtelReceiver:
    """Parses OTLP JSON and produces Sample/EventRow objects."""

    def __init__(self) -> None:
        self.stats = OtelStats()

    # ── Metrics ───────────────────────────────────────────────

    def parse_metrics(self, body: dict) -> list[_Sample]:
        """Parse OTLP JSON ``/v1/metrics`` payload."""
        samples: list[_Sample] = []
        for rm in body.get("resourceMetrics", []):
            resource_attrs = _parse_otel_attributes(
                rm.get("resource", {}).get("attributes", []),
            )
            tool = _resolve_tool(resource_attrs.get("service.name", ""))

            for sm in rm.get("scopeMetrics", []):
                for metric in sm.get("metrics", []):
                    name = metric.get("name", "")
                    mapped = METRIC_MAP.get(name, f"otel.{name}")

                    for dp in _extract_otel_data_points(metric):
                        ts = _nano_to_epoch(dp.get("timeUnixNano", "0"))
                        value = _extract_otel_value(dp)
                        tags = _parse_otel_attributes(dp.get("attributes", []))
                        tags["tool"] = tool
                        tags["otel_metric"] = name
                        _promote_session_id(tags, resource_attrs)
                        _promote_pid(tags, resource_attrs)
                        samples.append(_Sample(
                            ts=ts, metric=mapped,
                            value=value, tags=tags,
                        ))

        self.stats.metrics_received += len(samples)
        if samples:
            self.stats.last_receive_at = time.time()
        return samples

    # ── Logs / events ─────────────────────────────────────────

    def parse_logs(self, body: dict) -> list[EventRow]:
        """Parse OTLP JSON ``/v1/logs`` payload."""
        events: list[EventRow] = []
        for rl in body.get("resourceLogs", []):
            resource_attrs = _parse_otel_attributes(
                rl.get("resource", {}).get("attributes", []),
            )
            tool = _resolve_tool(resource_attrs.get("service.name", ""))

            for sl in rl.get("scopeLogs", []):
                for record in sl.get("logRecords", []):
                    ts = _nano_to_epoch(record.get("timeUnixNano", "0"))
                    attrs = _parse_otel_attributes(
                        record.get("attributes", []),
                    )

                    event_name = (
                        attrs.pop("event.name", "")
                        or attrs.pop("name", "")
                    )
                    if not event_name:
                        body_val = record.get("body", {})
                        if isinstance(body_val, dict):
                            event_name = body_val.get(
                                "stringValue", "otel_log",
                            )
                        else:
                            event_name = "otel_log"

                    kind = f"otel:{event_name}"
                    attrs["tool"] = tool
                    _promote_session_id(attrs, resource_attrs)
                    _promote_pid(attrs, resource_attrs)

                    # Track API call stats
                    if event_name in API_REQUEST_EVENTS:
                        self.stats.api_calls_total += 1
                    elif event_name in API_ERROR_EVENTS:
                        self.stats.api_errors_total += 1

                    events.append(EventRow(
                        ts=ts, tool=tool, kind=kind, detail=attrs,
                        session_id=attrs.get("session_id", ""),
                        pid=int(attrs.get("pid", 0) or 0),
                    ))

        self.stats.events_received += len(events)
        if events:
            self.stats.last_receive_at = time.time()
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
            # e.ts is derived from OTel timeUnixNano — it IS the embedded
            # source timestamp, so pass it as source_ts for correct dedup.
            requests.append(RequestRow(
                ts=e.ts,
                source_ts=e.ts,  # OTel always has an embedded timestamp
                session_id=e.session_id or d.get("session_id", ""),
                pid=e.pid or int(d.get("pid", 0) or 0),
                tool=e.tool,
                model=(d.get("gen_ai.request.model")
                       or d.get("gen_ai.response.model")
                       or d.get("model", "")),
                input_tokens=int(d.get("gen_ai.usage.input_tokens",
                                       d.get("input_tokens", 0)) or 0),
                output_tokens=int(d.get("gen_ai.usage.output_tokens",
                                        d.get("output_tokens", 0)) or 0),
                cache_read_tokens=int(d.get("gen_ai.usage.cache_read_input_tokens",
                                            d.get("cache_read_tokens", 0)) or 0),
                cache_creation_tokens=int(d.get("gen_ai.usage.cache_creation_input_tokens",
                                                d.get("cache_creation_tokens", 0)) or 0),
                cost_usd=float(d.get("cost_usd", 0) or 0),
                duration_ms=float(d.get("duration_ms", 0) or 0),
                finish_reason=_coerce_str(d.get("gen_ai.response.finish_reasons", "")),
                is_error=1 if d.get("error") or d.get("is_error") else 0,
                source="otel",
                prompt_id=d.get("prompt.id", ""),
            ))
        return requests

    @staticmethod
    def extract_tool_invocations(events: list[EventRow]) -> list[ToolInvocationRow]:
        """Extract ToolInvocationRow objects from hook events."""
        invocations: list[ToolInvocationRow] = []
        for e in events:
            if not e.kind.startswith("hook:"):
                continue
            d = e.detail if isinstance(e.detail, dict) else {}
            tool_name = d.get("tool_name", "")
            if not tool_name:
                continue
            # Hook events: source_ts is the timestamp embedded in the hook
            # payload, if present.  If the hook payload has no timestamp,
            # source_ts stays 0 and dedup falls back to value-based comparison
            # (Case B) — every hook invocation is an independent event.
            hook_ts = float(d.get("timestamp", 0) or d.get("ts", 0) or 0)
            invocations.append(ToolInvocationRow(
                ts=e.ts,
                source_ts=hook_ts,  # 0 if hook payload had no embedded timestamp
                session_id=d.get("session_id", ""),
                tool=e.tool,
                tool_name=tool_name,
                pid=int(d.get("pid", 0) or 0),
                is_error=1 if d.get("is_error") else 0,
                duration_ms=float(d.get("duration_ms", 0) or 0),
                input=d.get("input", {}),
                result_summary=str(d.get("result", ""))[:500],
                source="hook",
            ))
        return invocations

    # ── Traces (spans) ───────────────────────────────────────

    def parse_traces(self, body: dict) -> tuple[list[_Sample], list[EventRow]]:
        """Parse OTLP JSON ``/v1/traces`` payload."""
        samples: list[_Sample] = []
        events: list[EventRow] = []
        for rs in body.get("resourceSpans", []):
            resource_attrs = _parse_otel_attributes(
                rs.get("resource", {}).get("attributes", []),
            )
            tool = _resolve_tool(resource_attrs.get("service.name", ""))

            for ss in rs.get("scopeSpans", []):
                for span in ss.get("spans", []):
                    attrs = _parse_otel_attributes(span.get("attributes", []))
                    name = span.get("name", "")
                    start_ts = _nano_to_epoch(span.get("startTimeUnixNano", "0"))
                    end_ts = _nano_to_epoch(span.get("endTimeUnixNano", "0"))
                    duration_ms = (end_ts - start_ts) * 1000 if end_ts > start_ts else 0

                    attrs["tool"] = tool
                    attrs["span.name"] = name
                    _promote_session_id(attrs, resource_attrs)
                    _promote_pid(attrs, resource_attrs)
                    if duration_ms > 0:
                        attrs["duration_ms"] = round(duration_ms, 1)

                    # Extract token usage from span attributes
                    for token_key in ("gen_ai.usage.input_tokens",
                                      "gen_ai.usage.output_tokens",
                                      "gen_ai.usage.prompt_tokens",
                                      "gen_ai.usage.completion_tokens"):
                        val = attrs.get(token_key)
                        if val is not None:
                            try:
                                mapped = METRIC_MAP.get("gen_ai.client.token.usage",
                                                         "otel.token.usage")
                                tok_type = "input" if "input" in token_key or "prompt" in token_key else "output"
                                samples.append(_Sample(
                                    ts=start_ts, metric=mapped,
                                    value=float(val),
                                    tags={"tool": tool, "gen_ai.token.type": tok_type,
                                          "otel_metric": token_key,
                                          "gen_ai.request.model": attrs.get("gen_ai.request.model", "")},
                                ))
                            except (ValueError, TypeError):
                                pass

                    # Extract duration as metric
                    if duration_ms > 0 and any(k in name.lower() for k in
                                                ("inference", "chat", "api", "request", "completion")):
                        samples.append(_Sample(
                            ts=start_ts,
                            metric=METRIC_MAP.get("gen_ai.client.operation.duration",
                                                   "otel.operation.duration"),
                            value=duration_ms / 1000,
                            tags={"tool": tool, "span.name": name},
                        ))

                    # Track API call events
                    kind = f"otel:{name}"
                    if any(k in name.lower() for k in ("api_request", "inference", "chat.completion")):
                        self.stats.api_calls_total += 1
                    status_code = span.get("status", {}).get("code", 0)
                    if status_code == 2:  # OTLP StatusCode ERROR
                        self.stats.api_errors_total += 1

                    otel_sid = attrs.get("session_id", "")
                    otel_pid = int(attrs.get("pid", 0) or 0)
                    events.append(EventRow(
                        ts=start_ts, tool=tool, kind=kind, detail=attrs,
                        session_id=otel_sid, pid=otel_pid,
                    ))

                    # Span-level events (e.g. exceptions)
                    for span_event in span.get("events", []):
                        ev_ts = _nano_to_epoch(span_event.get("timeUnixNano", "0"))
                        ev_attrs = _parse_otel_attributes(span_event.get("attributes", []))
                        ev_attrs["tool"] = tool
                        ev_attrs["parent_span"] = name
                        ev_name = span_event.get("name", "span_event")
                        events.append(EventRow(
                            ts=ev_ts, tool=tool,
                            kind=f"otel:{ev_name}", detail=ev_attrs,
                            session_id=otel_sid, pid=otel_pid,
                        ))

        self.stats.metrics_received += len(samples)
        self.stats.events_received += len(events)
        if samples or events:
            self.stats.last_receive_at = time.time()
        return samples, events

    # ── Status ────────────────────────────────────────────────

    def status(self) -> dict:
        """Return receiver health as a JSON-serializable dict."""
        now = time.time()
        return {**dataclasses.asdict(self.stats), "active": self.stats.last_receive_at > now - 300}




# ── OTLP JSON helpers ─────────────────────────────────────────────

def _parse_otel_attributes(attrs: list[dict]) -> dict:
    """Convert OTLP ``KeyValue[]`` to a flat Python dict."""
    result: dict = {}
    for kv in attrs:
        key = kv.get("key", "")
        v = kv.get("value", {})
        if "stringValue" in v:   result[key] = v["stringValue"]
        elif "intValue" in v:    result[key] = int(v["intValue"])
        elif "doubleValue" in v: result[key] = float(v["doubleValue"])
        elif "boolValue" in v:   result[key] = bool(v["boolValue"])
        elif "arrayValue" in v:  result[key] = [_extract_any_otel_value(x)
                                                 for x in v["arrayValue"].get("values", [])]
    return result


# Well-known OTel attribute names that carry session identifiers.
_SESSION_ID_KEYS = ("session.id", "sessionId", "session_id")


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
    """Extract numeric value from an OTLP data point."""
    for key in ("asInt", "asDouble"):
        if key in data_point:
            try:
                return float(data_point[key])
            except (ValueError, TypeError):
                pass
    return 0.0


def _extract_otel_data_points(metric: dict) -> list[dict]:
    """Extract data points from any OTLP metric type (sum, gauge, etc.)."""
    for mtype in ("sum", "gauge", "histogram", "summary"):
        if mtype in metric:
            return metric[mtype].get("dataPoints", [])
    return []



# ─── OTLP protobuf support (lazy-loaded) ────────────────────────

_otlp_proto_classes: dict | None = None


def _load_otlp_proto() -> dict:
    """Load OTLP protobuf message classes.  Returns empty dict if not installed."""
    global _otlp_proto_classes
    if _otlp_proto_classes is not None:
        return _otlp_proto_classes
    try:
        from opentelemetry.proto.collector.metrics.v1.metrics_service_pb2 import (
            ExportMetricsServiceRequest,
        )
        from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
            ExportLogsServiceRequest,
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
