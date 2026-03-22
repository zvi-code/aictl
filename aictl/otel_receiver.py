# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""OTLP HTTP receiver for AI coding tool telemetry.

Parses OTLP JSON-encoded metrics and logs from multiple tools, maps
them to aictl's internal Sample and Event types for storage and
dashboard display.

Supported tools:

  **Claude Code** — 8 metrics + 5 events via ``CLAUDE_CODE_ENABLE_TELEMETRY=1``
  **VS Code Copilot** — GenAI semantic-convention metrics + events via
      ``github.copilot.chat.otel.enabled``
  **Codex CLI** — OTLP export via ``~/.codex/config.toml`` ``[otel]`` section

Metrics are mapped to unified ``otel.*`` internal names so the
dashboard renders all tools consistently.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from .storage import EventRow, Sample


# ── Metric mapping ────────────────────────────────────────────────
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
    "claude_code.api_request",
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


# ── Stats ─────────────────────────────────────────────────────────

@dataclass
class OtelStats:
    """Receiver health counters."""
    metrics_received: int = 0
    events_received: int = 0
    last_receive_at: float = 0.0
    errors: int = 0
    api_calls_total: int = 0
    api_errors_total: int = 0


# ── Receiver ──────────────────────────────────────────────────────

class OtelReceiver:
    """Parses OTLP JSON and produces Sample/EventRow objects."""

    def __init__(self) -> None:
        self.stats = OtelStats()

    # ── Metrics ───────────────────────────────────────────────

    def parse_metrics(self, body: dict) -> list[Sample]:
        """Parse OTLP JSON ``/v1/metrics`` payload.

        Returns a list of Sample objects ready for
        ``HistoryDB.append_samples()``.
        """
        samples: list[Sample] = []
        for rm in body.get("resourceMetrics", []):
            resource_attrs = _parse_attributes(
                rm.get("resource", {}).get("attributes", []),
            )
            tool = _resolve_tool(resource_attrs.get("service.name", ""))

            for sm in rm.get("scopeMetrics", []):
                for metric in sm.get("metrics", []):
                    name = metric.get("name", "")
                    mapped = METRIC_MAP.get(name, f"otel.{name}")

                    for dp in _extract_data_points(metric):
                        ts = _nano_to_epoch(dp.get("timeUnixNano", "0"))
                        value = _extract_value(dp)
                        tags = _parse_attributes(dp.get("attributes", []))
                        tags["tool"] = tool
                        tags["otel_metric"] = name
                        _promote_session_id(tags, resource_attrs)
                        samples.append(Sample(
                            ts=ts, metric=mapped,
                            value=value, tags=tags,
                        ))

        self.stats.metrics_received += len(samples)
        if samples:
            self.stats.last_receive_at = time.time()
        return samples

    # ── Logs / events ─────────────────────────────────────────

    def parse_logs(self, body: dict) -> list[EventRow]:
        """Parse OTLP JSON ``/v1/logs`` payload.

        Events are encoded as log records.  Returns a list of EventRow
        objects ready for ``HistoryDB.append_events()``.
        """
        events: list[EventRow] = []
        for rl in body.get("resourceLogs", []):
            resource_attrs = _parse_attributes(
                rl.get("resource", {}).get("attributes", []),
            )
            tool = _resolve_tool(resource_attrs.get("service.name", ""))

            for sl in rl.get("scopeLogs", []):
                for record in sl.get("logRecords", []):
                    ts = _nano_to_epoch(record.get("timeUnixNano", "0"))
                    attrs = _parse_attributes(
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

                    # Track API call stats
                    if event_name in API_REQUEST_EVENTS:
                        self.stats.api_calls_total += 1
                    elif event_name in API_ERROR_EVENTS:
                        self.stats.api_errors_total += 1

                    events.append(EventRow(
                        ts=ts, tool=tool, kind=kind, detail=attrs,
                    ))

        self.stats.events_received += len(events)
        if events:
            self.stats.last_receive_at = time.time()
        return events

    # ── Traces (spans) ───────────────────────────────────────

    def parse_traces(self, body: dict) -> tuple[list[Sample], list[EventRow]]:
        """Parse OTLP JSON ``/v1/traces`` payload.

        Spans carry token usage in attributes and timing data in
        start/endTimeUnixNano.  Returns (samples, events) so both
        the metrics and events tables get populated.
        """
        samples: list[Sample] = []
        events: list[EventRow] = []
        for rs in body.get("resourceSpans", []):
            resource_attrs = _parse_attributes(
                rs.get("resource", {}).get("attributes", []),
            )
            tool = _resolve_tool(resource_attrs.get("service.name", ""))

            for ss in rs.get("scopeSpans", []):
                for span in ss.get("spans", []):
                    attrs = _parse_attributes(span.get("attributes", []))
                    name = span.get("name", "")
                    start_ts = _nano_to_epoch(span.get("startTimeUnixNano", "0"))
                    end_ts = _nano_to_epoch(span.get("endTimeUnixNano", "0"))
                    duration_ms = (end_ts - start_ts) * 1000 if end_ts > start_ts else 0

                    attrs["tool"] = tool
                    attrs["span.name"] = name
                    _promote_session_id(attrs, resource_attrs)
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
                                samples.append(Sample(
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
                        samples.append(Sample(
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

                    events.append(EventRow(
                        ts=start_ts, tool=tool, kind=kind, detail=attrs,
                    ))

                    # Span-level events (e.g. exceptions)
                    for span_event in span.get("events", []):
                        ev_ts = _nano_to_epoch(span_event.get("timeUnixNano", "0"))
                        ev_attrs = _parse_attributes(span_event.get("attributes", []))
                        ev_attrs["tool"] = tool
                        ev_attrs["parent_span"] = name
                        ev_name = span_event.get("name", "span_event")
                        events.append(EventRow(
                            ts=ev_ts, tool=tool,
                            kind=f"otel:{ev_name}", detail=ev_attrs,
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
        return {
            "active": self.stats.last_receive_at > now - 300,
            "metrics_received": self.stats.metrics_received,
            "events_received": self.stats.events_received,
            "api_calls_total": self.stats.api_calls_total,
            "api_errors_total": self.stats.api_errors_total,
            "last_receive_at": self.stats.last_receive_at,
            "errors": self.stats.errors,
        }


# ── OTLP JSON helpers ─────────────────────────────────────────────

def _parse_attributes(attrs: list[dict]) -> dict:
    """Convert OTLP ``KeyValue[]`` to a flat Python dict."""
    result: dict = {}
    for kv in attrs:
        key = kv.get("key", "")
        value = kv.get("value", {})
        if "stringValue" in value:
            result[key] = value["stringValue"]
        elif "intValue" in value:
            result[key] = int(value["intValue"])
        elif "doubleValue" in value:
            result[key] = float(value["doubleValue"])
        elif "boolValue" in value:
            result[key] = bool(value["boolValue"])
        elif "arrayValue" in value:
            result[key] = [
                _extract_any_value(v) for v in value["arrayValue"].get("values", [])
            ]
    return result


# Well-known OTel attribute names that carry session identifiers.
# Mapped to the canonical ``session_id`` key used by the dashboard.
_SESSION_ID_KEYS = ("session.id", "sessionId", "session_id")


def _promote_session_id(attrs: dict, resource_attrs: dict | None = None) -> None:
    """Promote well-known session ID attributes to ``session_id``.

    Checks resource-level attributes first (higher precedence), then
    span/datapoint-level.  The dashboard queries
    ``json_extract(detail, '$.session_id')`` for correlation.
    """
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


def _extract_any_value(value: dict):
    """Extract a single OTLP AnyValue."""
    for vtype in ("stringValue", "intValue", "doubleValue", "boolValue"):
        if vtype in value:
            return value[vtype]
    return None


def _nano_to_epoch(nano_str: str | int) -> float:
    """Convert nanosecond timestamp string to epoch seconds."""
    try:
        return int(nano_str) / 1_000_000_000
    except (ValueError, TypeError):
        return time.time()


def _extract_value(data_point: dict) -> float:
    """Extract numeric value from an OTLP data point."""
    for key in ("asInt", "asDouble"):
        if key in data_point:
            try:
                return float(data_point[key])
            except (ValueError, TypeError):
                pass
    return 0.0


def _extract_data_points(metric: dict) -> list[dict]:
    """Extract data points from any OTLP metric type (sum, gauge, etc.)."""
    for mtype in ("sum", "gauge", "histogram", "summary"):
        if mtype in metric:
            return metric[mtype].get("dataPoints", [])
    return []
