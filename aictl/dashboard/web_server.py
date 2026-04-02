# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Live web dashboard server with REST + SSE API.

Serves a self-contained HTML dashboard at / with real-time updates via
Server-Sent Events, plus REST endpoints for snapshot data, file content
inspection, and token budget analysis.

The frontend is built with Vite from ui/src/ into dist/.
"""

from __future__ import annotations

import dataclasses
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
import email.utils
import json
import logging
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .models import DashboardSnapshot, _slim_agent_teams
from ..tools import compute_token_budget
from ..orchestrator import SnapshotStore, AllowedPaths
from ..storage import EventRow, RequestRow, SessionRow, ToolInvocationRow, Sample as _Sample

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


# ─── SSE client limit ────────────────────────────────────────────

_MAX_SSE_CLIENTS = 10
_sse_client_count = 0
_sse_client_lock = threading.Lock()

# ─── Budget cache ────────────────────────────────────────────────

_budget_cache: tuple[int, dict] | None = None


# ─── Analytics background cache ──────────────────────────────────

class _AnalyticsCache:
    """Pre-computes analytics in a background thread so the HTTP endpoint
    never blocks on database queries.  Follows the same pattern as the
    SSE snapshot system: compute in background, serve from memory."""

    _INTERVAL = 15  # seconds between recomputes

    def start(self, store) -> None:
        self._store = store
        self._thread = threading.Thread(target=self._loop, daemon=True,
                                        name="analytics-cache")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()

    def request_range(self, since: float, until: float) -> None:
        """Update the time range; wake the background thread if it changed."""
        old = self._requested_range
        self._requested_range = (since, until)
        if old != (since, until):
            self._wake.set()

    def get(self, since: float, until: float) -> dict:
        """Return cached analytics instantly.  If the range changed, the
        background thread will recompute within seconds."""
        self.request_range(since, until)
        with self._lock:
            return self._result

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._result: dict = {}
        self._range_key: tuple[float, float] = (0.0, 0.0)
        self._store = None
        self._stop = threading.Event()
        self._wake = threading.Event()
        self._thread: threading.Thread | None = None
        self._requested_range: tuple[float, float] | None = None

    def _loop(self) -> None:
        # Initial computation on startup
        try:
            self._recompute()
        except Exception:
            logger.exception("Analytics cache initial compute error")
        while not self._stop.is_set():
            # Wait for either the interval or a wake signal
            self._wake.wait(timeout=self._INTERVAL)
            self._wake.clear()
            if self._stop.is_set():
                break
            try:
                self._recompute()
            except Exception:
                logger.exception("Analytics cache recompute error")

    def _recompute(self) -> None:
        db = getattr(self._store, '_db', None) if self._store else None
        if not db:
            return
        rng = self._requested_range
        if not rng:
            rng = (time.time() - 86400, time.time())
        since, until = rng
        if until <= 0:
            until = time.time()

        result = {}
        result["response_time"] = _compute_response_time(db, since, until)
        result["tools"] = _compute_tools(db, since, until)
        result["files"] = _compute_files(db, since, until)

        with self._lock:
            self._result = result
            self._range_key = (since, until)


def _compute_response_time(db, since: float, until: float, limit: int = 2000) -> dict:
    """Build response-time analytics (runs in background thread)."""
    rows = db.query_requests_analytics(since=since, until=until, limit=limit)
    if not rows:
        return {"requests": [], "by_model": []}

    by_session: dict[str, list] = {}
    for r in rows:
        by_session.setdefault(r.get("session_id", ""), []).append(r)

    requests_out = []
    for sid, reqs in by_session.items():
        reqs.sort(key=lambda r: r["ts"])
        for seq, r in enumerate(reqs, 1):
            requests_out.append({
                "ts": r["ts"], "duration_ms": r.get("duration_ms", 0),
                "input_tokens": r.get("input_tokens", 0),
                "output_tokens": r.get("output_tokens", 0),
                "cache_read_tokens": r.get("cache_read_tokens", 0),
                "model": r.get("model", ""),
                "session_id": sid, "agent_id": r.get("agent_id", ""),
                "finish_reason": r.get("finish_reason", ""),
                "cost_usd": r.get("cost_usd", 0),
                "is_error": r.get("is_error", 0), "seq": seq,
            })

    model_groups: dict[str, list[float]] = {}
    model_tokens: dict[str, int] = {}
    for req in requests_out:
        m = req["model"] or "(unknown)"
        model_groups.setdefault(m, []).append(req["duration_ms"])
        model_tokens[m] = model_tokens.get(m, 0) + req["input_tokens"] + req["output_tokens"]

    by_model = []
    for m, durations in sorted(model_groups.items()):
        ds = sorted(durations)
        n = len(ds)
        by_model.append({
            "model": m, "count": n,
            "avg_ms": round(sum(ds) / n, 1) if n else 0,
            "p50_ms": round(ds[n // 2], 1) if n else 0,
            "p95_ms": round(ds[min(int(n * 0.95), n - 1)], 1) if n else 0,
            "total_tokens": model_tokens.get(m, 0),
        })

    requests_out.sort(key=lambda r: r["ts"])
    return {"requests": requests_out, "by_model": by_model}


def _compute_tools(db, since: float, until: float) -> dict:
    """Build tool-usage analytics (runs in background thread).

    Primary source: Pre/PostToolUse event pairs in the events table (joined
    by tool_use_id).  This gives accurate counts and real durations.
    Fallback: tool_invocations table (for OTel-sourced invocations that
    don't go through hooks).
    """
    # Try event-based analytics first (accurate durations from Pre/Post matching)
    agg = db.query_tool_analytics_from_events(since=since, until=until)

    if not agg:
        # Fallback to tool_invocations table
        agg = db.query_tool_invocations_agg(since=since, until=until)

    if not agg:
        # Check if there's data outside this range
        all_time = db.query_tool_analytics_from_events()
        if not all_time:
            all_time = db.query_tool_invocations_agg()
        total_all_time = sum(r["count"] for r in all_time) if all_time else 0
        return {"invocations": [], "total_all_time": total_all_time}

    # Determine which query path we used (events have avg_ms pre-computed)
    use_events = "avg_ms" in agg[0]

    # Get per-tool breakdown by CLI tool (e.g. claude-code vs codex)
    breakdown: dict[str, list[dict]] = {}
    if use_events:
        breakdown = db.query_tool_breakdown_from_events(since=since, until=until)

    invocations = []
    for row in agg[:30]:
        name = row["tool_name"] or "(unknown)"
        count = row["count"]
        total_ms = row.get("total_ms") or 0
        avg_ms = row.get("avg_ms") or (round(total_ms / count, 1) if count else 0)

        # Get per-invocation durations for percentile calculation
        if use_events:
            durations = sorted(db.query_tool_durations_from_events(
                name, since=since, until=until, limit=500))
        else:
            durations = sorted(db.query_tool_invocations_durations(
                name, since=since, until=until, limit=500))
        n = len(durations)
        p95 = round(durations[min(int(n * 0.95), n - 1)], 1) if n else 0

        entry: dict = {
            "tool_name": name, "count": count,
            "avg_ms": avg_ms, "p95_ms": p95,
            "error_count": row.get("error_count", 0),
        }
        if name in breakdown:
            entry["by_cli"] = breakdown[name]
        invocations.append(entry)

    # Collect all unique CLI tools across all invocations for consistent coloring
    cli_tools = sorted({s["cli_tool"] for segs in breakdown.values() for s in segs})
    return {"invocations": invocations, "cli_tools": cli_tools}


def _compute_files(db, since: float, until: float) -> dict:
    """Build file-write analytics (runs in background thread)."""
    # Try structured file_history first
    memory_files = db.list_files(category="memory")
    if memory_files:
        memory_files.sort(key=lambda f: f.last_changed or 0, reverse=True)
        paths = [f.path for f in memory_files[:20]]
        bulk = db.file_history_bulk(paths, since=since, until=until)
        memory_timeline = {}
        for p, entries in bulk.items():
            if entries:
                memory_timeline[p] = {
                    "ts": [e["ts"] for e in entries],
                    "size_bytes": [e["size_bytes"] for e in entries],
                    "tokens": [e.get("tokens", 0) for e in entries],
                }
        memory_events = []
        for p, entries in bulk.items():
            prev_size = 0
            for e in entries:
                sz = e["size_bytes"]
                memory_events.append({
                    "ts": e["ts"], "path": p, "size_bytes": sz,
                    "prev_size": prev_size, "delta": sz - prev_size,
                    "tokens": e.get("tokens", 0),
                })
                prev_size = sz
        memory_events.sort(key=lambda e: e["ts"], reverse=True)
        return {"memory_timeline": memory_timeline, "memory_events": memory_events[:50]}

    # Fallback: single-scan file_modified events
    conn = db._conn()
    rows = conn.execute(
        "SELECT ts, json_extract(detail, '$.path'),"
        " CAST(json_extract(detail, '$.growth_bytes') AS INTEGER)"
        " FROM events WHERE kind = 'file_modified' AND ts >= ? AND ts <= ?"
        " ORDER BY ts LIMIT 5000",
        (since, until),
    ).fetchall()
    if not rows:
        return {"memory_timeline": {}, "memory_events": []}

    path_growth: dict[str, int] = {}
    path_events: dict[str, list] = {}
    for ts_val, path, growth in rows:
        if not path:
            continue
        gb = max(growth or 0, 0)
        path_growth[path] = path_growth.get(path, 0) + gb
        path_events.setdefault(path, []).append((ts_val, gb))

    top_paths = sorted(path_growth.items(), key=lambda x: -x[1])[:8]
    memory_timeline = {}
    for path, total in top_paths:
        if total <= 0:
            continue
        events = path_events[path][:200]
        if len(events) < 2:
            continue
        ts_list, cumulative = [], []
        running = 0
        for ts_val, gb in events:
            running += gb
            ts_list.append(ts_val)
            cumulative.append(running)
        memory_timeline[path] = {
            "ts": ts_list, "size_bytes": cumulative, "tokens": [c // 4 for c in cumulative],
        }

    memory_events = []
    for ts_val, path, growth in reversed(rows):
        if growth and growth > 0:
            memory_events.append({
                "ts": ts_val, "path": path or "", "size_bytes": growth,
                "prev_size": 0, "delta": growth, "tokens": growth // 4,
            })
            if len(memory_events) >= 50:
                break

    return {"memory_timeline": memory_timeline, "memory_events": memory_events}


# ─── Safe file reading ───────────────────────────────────────────

_MAX_FILE_SIZE = 200_000


def _num(v) -> float:
    """Coerce value to float (OTel attributes may arrive as strings)."""
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _read_file_safe(path_str: str) -> str | None:
    """Read file content with safety limits."""
    try:
        p = Path(path_str)
        if not p.is_file():
            return None
        size = p.stat().st_size
        if size > _MAX_FILE_SIZE:
            with open(p, "r", errors="replace") as f:
                f.seek(max(0, size - _MAX_FILE_SIZE))
                f.readline()  # skip partial line
                tail = f.read()
            return f"[... truncated, showing last {len(tail)} chars of {size} ...]\n{tail}"
        return p.read_text(errors="replace")
    except OSError:
        return None


def _asdict_list(items) -> list:
    """Convert a mixed list of dataclasses or dicts to a list of dicts."""
    return [dataclasses.asdict(m) if dataclasses.is_dataclass(m) else m for m in items]


# ─── SSE summary builder ─────────────────────────────────────────

def build_sse_summary(snap: DashboardSnapshot) -> dict:
    """Build lightweight SSE summary from a full snapshot.

    Keeps SSE messages small (~2-5KB) while covering all top-level keys
    from DashboardSnapshot.to_dict().  Per-tool detail (files, processes)
    is omitted — the frontend re-fetches the full snapshot periodically.
    """
    return {
        "timestamp": snap.timestamp,
        "root": snap.root,
        "cpu_cores": snap.cpu_cores,
        "cpu_per_core": snap.cpu_per_core,
        "total_files": snap.total_files,
        "total_tokens": snap.total_tokens,
        "total_size": snap.total_size,
        "total_processes": snap.total_processes,
        "total_cpu": snap.total_cpu,
        "total_mem_mb": snap.total_mem_mb,
        "total_mcp_servers": snap.total_mcp_servers,
        "total_memory_entries": snap.total_memory_entries,
        "total_memory_tokens": snap.total_memory_tokens,
        "total_live_sessions": snap.total_live_sessions,
        "total_live_tools": snap.total_live_tools,
        "total_live_inbound_bytes": snap.total_live_inbound_bytes,
        "total_live_outbound_bytes": snap.total_live_outbound_bytes,
        "total_live_inbound_rate_bps": snap.total_live_inbound_rate_bps,
        "total_live_outbound_rate_bps": snap.total_live_outbound_rate_bps,
        "total_live_estimated_tokens": snap.total_live_estimated_tokens,
        "total_live_files_touched": snap.total_live_files_touched,
        # Per-tool summary (no files, just aggregates + live)
        "tools": [{
            "tool": t.tool, "label": t.label,
            "vendor": t.vendor, "host": t.host,
            "files_count": len(t.files), "tokens": sum(f.tokens for f in t.files),
            "processes_count": len(t.processes),
            "mcp_count": len(t.mcp_servers),
            "live": t.live,
        } for t in snap.tools if t.tool != "aictl"],
        # Enrichment data (small enough for SSE)
        "agent_memory": _asdict_list(snap.agent_memory),
        "mcp_detail": _asdict_list(snap.mcp_detail),
        "live_monitor": snap.live_monitor or {},
        "tool_telemetry": snap.tool_telemetry,
        "tool_configs": snap.tool_configs,
        # Events (lightweight)
        "events": snap.events[-50:] if snap.events else [],
        # Active sessions (compact: id, tool, duration, tokens)
        "sessions": [{
            "session_id": s.get("session_id", ""),
            "tool": s.get("tool", ""),
            "project": s.get("project", ""),
            "duration_s": s.get("duration_s", 0),
            "cpu_percent": s.get("cpu_percent", 0),
            "exact_input_tokens": s.get("exact_input_tokens", 0),
            "exact_output_tokens": s.get("exact_output_tokens", 0),
            "file_events": s.get("file_events", 0),
            "pids": len(s.get("pids", [])),
        } for s in (snap.sessions or [])],
        "agent_teams": _slim_agent_teams(snap.agent_teams or []),
        "_sse_summary": True,
    }


# ─── HTTP handler ────────────────────────────────────────────────

class _DashboardHandler(BaseHTTPRequestHandler):
    """Routes requests to the appropriate handler."""

    server: _DashboardHTTPServer  # type hint for IDE
    timeout = 30  # per-connection socket timeout (read by StreamRequestHandler.setup)

    def handle_one_request(self) -> None:
        """Wrap parent to suppress BrokenPipeError from client disconnects."""
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            self.close_connection = True

    @property
    def _qs(self) -> dict[str, list[str]]:
        """Parsed query-string parameters for the current request."""
        return parse_qs(urlparse(self.path).query)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/":
            self._serve_html()
        elif path == "/api/snapshot":
            self._serve_snapshot()
        elif path == "/api/file":
            self._serve_file()
        elif path == "/api/stream":
            self._serve_sse()
        elif path == "/api/budget":
            self._serve_budget()
        elif path == "/api/history":
            self._serve_history()
        elif path.startswith("/api/samples"):
            self._serve_samples()
        elif path == "/api/session-timeline":
            self._serve_session_timeline()
        elif path.startswith("/api/sessions"):
            self._serve_sessions()
        elif path.startswith("/api/files/history"):
            self._serve_file_history()
        elif path.startswith("/api/files"):
            self._serve_files()
        elif path.startswith("/api/telemetry"):
            self._serve_telemetry()
        elif path.startswith("/api/project-costs"):
            self._serve_project_costs()
        elif path.startswith("/api/session-runs"):
            self._serve_session_runs()
        elif path.startswith("/api/session-stats"):
            self._serve_session_stats()
        elif path.startswith("/api/session-flow"):
            self._serve_session_flow()
        elif path.startswith("/api/otel-status"):
            self._serve_otel_status()
        elif path.startswith("/api/api-calls"):
            self._serve_api_calls()
        elif path.startswith("/api/events"):
            self._serve_events()
        elif path.startswith("/api/datapoints"):
            self._serve_datapoint_catalog()
        elif path.startswith("/api/analytics"):
            self._serve_analytics()
        elif path.startswith("/api/agent-teams"):
            self._serve_agent_teams()
        elif path.startswith("/api/self-status"):
            self._serve_self_status()
        elif path.startswith("/assets/"):
            self._serve_static(path)
        else:
            self.send_error(404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/hooks":
            self._receive_hook()
        elif path == "/v1/metrics":
            self._receive_otel_metrics()
        elif path == "/v1/logs":
            self._receive_otel_logs()
        elif path == "/v1/traces":
            self._receive_otel_traces()
        else:
            self.send_error(404)

    def _receive_hook(self) -> None:
        """Receive Claude Code hook events via HTTP POST.

        Stores them as events in HistoryDB and forwards to SSE clients.
        Expected body: JSON with at minimum {event, session_id} plus
        event-specific fields from the Claude Code hook system.
        """
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 1_000_000:
            self.send_error(413, "Payload too large")
            return
        try:
            body = self.rfile.read(content_length)
            data = json.loads(body)
        except (json.JSONDecodeError, OSError):
            self.send_error(400, "Invalid JSON")
            return

        event_name = data.get("event") or data.get("hook_event_name") or "unknown"
        session_id = data.get("session_id", "")
        cwd = data.get("cwd", "")

        # Derive tool from explicit field, or session_id pattern "tool:pid:ts",
        # or fall back to "claude-code" (the most common hook source).
        tool = data.get("tool", "")
        if not tool and session_id and ":" in session_id:
            tool = session_id.split(":")[0]
        if not tool:
            tool = "claude-code"
        ts = data.get("ts") or time.time()

        hook_pid = int(data.get("pid", 0) or 0)
        _HOOK_SKIP = {"event", "hook_event_name", "session_id", "tool", "cwd", "ts", "pid"}
        detail = {"session_id": session_id, "cwd": cwd,
                  **{k: v for k, v in data.items() if k not in _HOOK_SKIP}}
        if hook_pid:
            detail["pid"] = hook_pid

        event_record = {"ts": ts, "tool": tool, "kind": f"hook:{event_name}", "detail": detail}

        # Store as event in the database
        db = self._db
        if db:
            db.append_event(EventRow(
                ts=ts, tool=tool, kind=f"hook:{event_name}", detail=detail,
                session_id=session_id, pid=hook_pid,
            ))

            # Also write to structured tables
            if event_name in ("Init", "SessionStart"):
                db.upsert_session(SessionRow(
                    session_id=session_id,
                    tool=tool,
                    pid=hook_pid,
                    project_path=cwd,
                    model=detail.get("model", ""),
                    started_at=ts,
                    source="hook",
                ))
                db.link_session_process(session_id, hook_pid, tool=tool)
            elif event_name in ("Stop", "SessionEnd"):
                db.update_session_end(
                    session_id, ended_at=ts,
                    input_tokens=int(detail.get("input_tokens", 0) or 0),
                    output_tokens=int(detail.get("output_tokens", 0) or 0),
                )
            elif event_name in ("PreToolUse", "PostToolUse"):
                tool_name = detail.get("tool_name", "")
                tool_use_id = detail.get("tool_use_id", "")
                if tool_name:
                    if event_name == "PreToolUse":
                        # Store the invocation (duration unknown yet).
                        # Use tool_use_id in dedup key so Pre and Post don't collide.
                        db.append_tool_invocation(ToolInvocationRow(
                            ts=ts, source_ts=0, session_id=session_id, tool=tool,
                            tool_name=tool_name,
                            is_error=0,
                            duration_ms=0,
                            input=detail.get("input", detail.get("tool_input", {})),
                            result_summary="",
                            source="hook",
                        ))
                        # Cache pre-event info so PostToolUse can compute duration.
                        if tool_use_id:
                            # Compute dedup key matching what flush() will produce.
                            # flush() uses _dedup_key(session_id, tool_name, input_sig, is_error, source)
                            # when source_ts == 0.
                            input_val = detail.get("input", detail.get("tool_input", {}))
                            input_sig = json.dumps(input_val, sort_keys=True) if isinstance(input_val, dict) else str(input_val)
                            from ..storage import _dedup_key
                            dk = _dedup_key(session_id, tool_name, input_sig, "0", "hook")
                            self.server.pending_tool_use[tool_use_id] = (ts, dk)
                            # Evict stale entries (older than 10 minutes)
                            cutoff = time.time() - 600
                            stale = [k for k, (t, _) in self.server.pending_tool_use.items() if t < cutoff]
                            for k in stale:
                                del self.server.pending_tool_use[k]
                    else:
                        # PostToolUse: compute duration and update existing row.
                        if tool_use_id and tool_use_id in self.server.pending_tool_use:
                            pre_ts, dk = self.server.pending_tool_use.pop(tool_use_id)
                            duration_ms = (ts - pre_ts) * 1000
                            is_err = 1 if detail.get("is_error") else 0
                            result = str(detail.get("tool_response", detail.get("result", "")))[:500]
                            db.update_tool_invocation_duration(dk, duration_ms, is_err, result)
                        else:
                            # No matching Pre — store as standalone invocation.
                            db.append_tool_invocation(ToolInvocationRow(
                                ts=ts, source_ts=0, session_id=session_id, tool=tool,
                                tool_name=tool_name,
                                is_error=1 if detail.get("is_error") else 0,
                                duration_ms=0,
                                input=detail.get("input", detail.get("tool_input", {})),
                                result_summary=str(detail.get("tool_response", detail.get("result", "")))[:500],
                                source="hook",
                            ))

        # Feed into entity state tracker
        self.server.entity_tracker.process_event(event_record)

        logger.debug("Hook event received: %s session=%s", event_name, session_id)

        # Respond with success
        self._json_response_raw(b'{"ok":true}')

    # ── OTel OTLP receivers ──────────────────────────────────────

    def _read_chunked_body(self, max_size: int) -> bytes:
        """Read a chunked Transfer-Encoding body."""
        buf = bytearray()
        while True:
            line = self.rfile.readline(65537)
            chunk_size = int(line.strip(), 16)
            if chunk_size == 0:
                self.rfile.readline()  # trailing CRLF
                break
            if len(buf) + chunk_size > max_size:
                raise ValueError("Payload too large")
            buf.extend(self.rfile.read(chunk_size))
            self.rfile.readline()  # CRLF after chunk data
        return bytes(buf)

    def _read_post_otlp(self, signal: str,
                        max_size: int = 2_000_000) -> dict | None:
        """Read OTLP POST body, auto-detecting JSON vs protobuf."""
        transfer_encoding = self.headers.get("Transfer-Encoding", "")
        content_length = 0
        try:
            if "chunked" in transfer_encoding.lower():
                body = self._read_chunked_body(max_size)
            else:
                content_length = int(self.headers.get("Content-Length", 0))
                if content_length > max_size:
                    self.send_error(413, "Payload too large")
                    return None
                body = self.rfile.read(content_length)
        except ValueError:
            self.send_error(413, "Payload too large")
            return None
        except OSError:
            self.server.otel_receiver.stats.errors += 1
            self.send_error(400, "Read error")
            return None

        content_type = self.headers.get("Content-Type", "")

        # ── Protobuf ──
        if "protobuf" in content_type or "grpc" in content_type:
            proto_classes = _load_otlp_proto()
            if not proto_classes:
                logger.error(
                    "OTel protobuf payload received but opentelemetry-proto "
                    "not installed. Run: pip install 'aictl[otel]'",
                )
                self.server.otel_receiver.stats.errors += 1
                self.send_error(
                    415, "Install opentelemetry-proto: pip install 'aictl[otel]'",
                )
                return None
            cls = proto_classes.get(signal)
            if cls is None:
                self.server.otel_receiver.stats.errors += 1
                self.send_error(400, f"Unknown OTLP signal: {signal}")
                return None
            try:
                from google.protobuf.json_format import MessageToDict
                msg = cls()
                msg.ParseFromString(body)
                return MessageToDict(msg)
            except Exception as exc:
                logger.warning("OTel protobuf decode error: %s", exc)
                self.server.otel_receiver.stats.errors += 1
                self.send_error(400, "Protobuf decode error")
                return None

        # ── Try JSON, fall back to protobuf auto-detect ──
        try:
            return json.loads(body)
        except (json.JSONDecodeError, ValueError):
            pass

        # Body wasn't valid JSON — try protobuf before giving up
        proto_classes = _load_otlp_proto()
        cls = proto_classes.get(signal) if proto_classes else None
        if cls is not None:
            try:
                from google.protobuf.json_format import MessageToDict
                msg = cls()
                msg.ParseFromString(body)
                return MessageToDict(msg)
            except Exception:
                pass

        logger.warning(
            "OTel: invalid body (Content-Type: %s, %d bytes)",
            content_type, len(body),
        )
        self.server.otel_receiver.stats.errors += 1
        self.send_error(400, "Invalid JSON")
        return None

    def _receive_otel_metrics(self) -> None:
        """Receive OTLP metrics (JSON or protobuf)."""
        self._receive_otel_signal("metrics", "parse_metrics", "append_samples", "samples")

    def _receive_otel_logs(self) -> None:
        """Receive OTLP logs/events (JSON or protobuf).

        In addition to writing events, also extracts RequestRow and
        ToolInvocationRow objects from API request and hook events.
        """
        data = self._read_post_otlp("logs")
        if data is None:
            return
        try:
            receiver = self.server.otel_receiver
            events = receiver.parse_logs(data)
            db = self._db
            if db and events:
                db.append_events(events)
                # Extract and persist structured request/invocation data
                requests = receiver.extract_requests(events)
                for r in requests:
                    db.append_request(r)
                invocations = receiver.extract_tool_invocations(events)
                for inv in invocations:
                    db.append_tool_invocation(inv)
                # Batch-link sessions and PIDs (one commit instead of N*2)
                db.batch_link_sessions(
                    [(r.session_id, r.tool, r.pid, r.source_ts or r.ts, "otel")
                     for r in requests if r.session_id])
            logger.debug("OTel logs received: %d events, %d requests, %d invocations",
                         len(events),
                         len(requests) if events else 0,
                         len(invocations) if events else 0)
        except Exception:
            logger.exception("Error processing OTel logs")
            self.server.otel_receiver.stats.errors += 1
            self.send_error(500, "Internal error")
            return
        self._json_response_raw(b'{"ok":true}')

    def _receive_otel_traces(self) -> None:
        """Receive OTLP traces/spans (JSON or protobuf)."""
        data = self._read_post_otlp("traces")
        if data is None:
            return
        try:
            receiver = self.server.otel_receiver
            samples, events = receiver.parse_traces(data)
            db = self._db
            if db and samples:
                db.append_samples(samples)
            if db and events:
                db.append_events(events)
                # Extract requests from trace events too
                requests = receiver.extract_requests(events)
                for r in requests:
                    db.append_request(r)
                # Batch-link sessions and PIDs (one commit instead of N*2)
                db.batch_link_sessions(
                    [(r.session_id, r.tool, r.pid, r.source_ts or r.ts, "otel")
                     for r in requests if r.session_id])
            logger.debug("OTel traces received: %d samples, %d events",
                         len(samples), len(events))
        except Exception:
            logger.exception("Error processing OTel traces")
            self.server.otel_receiver.stats.errors += 1
            self.send_error(500, "Internal error")
            return
        self._json_response_raw(b'{"ok":true}')

    def _serve_agent_teams(self) -> None:
        """Return full agent detail for a specific team (lazy-loaded by frontend).

        Usage: GET /api/agent-teams?session_id=<id>
        Without session_id, returns slim summaries for all teams.
        """
        snap = self.server.store.snapshot
        if snap is None or not snap.agent_teams:
            self._json_response([])
            return
        session_id = self._qs_get("session_id")
        if session_id:
            for team in snap.agent_teams:
                if team.get("session_id") == session_id:
                    self._json_response(team)
                    return
            self.send_error(404, "Team not found")
        else:
            self._json_response(_slim_agent_teams(snap.agent_teams))

    def _serve_self_status(self) -> None:
        """Return aictl's own resource usage and DB stats."""
        import os
        result = {}
        try:
            import psutil
            proc = psutil.Process(os.getpid())
            mem = proc.memory_info()
            # interval=0 returns since last call — non-blocking.
            # CollectorHealth polls every 15s so the measurement window is fine.
            cpu = proc.cpu_percent(interval=0)
            result["pid"] = os.getpid()
            result["cpu_percent"] = round(cpu, 1)
            result["memory_rss_bytes"] = mem.rss
            result["memory_vms_bytes"] = mem.vms
            result["threads"] = proc.num_threads()
            result["uptime_s"] = round(time.time() - proc.create_time(), 1)
        except Exception:
            result["pid"] = os.getpid()
        db = self._db
        if db:
            try:
                result["db"] = db.stats()
            except Exception:
                result["db"] = {}
        # Sink stats (emission rates, flood protection)
        sink = getattr(self.server.store, '_sink', None)
        if sink:
            try:
                result["sink"] = sink.stats()
            except Exception:
                result["sink"] = {}
        self._json_response(result)

    def _serve_session_flow(self) -> None:
        """Return conversation-turn-level data for a session.

        Correlates hook events (UserPromptSubmit, PreToolUse, PostToolUse,
        PreCompact, PostCompact) and OTel API request events into an ordered
        list of conversation turns for the session flow waterfall view.

        When no UserPromptSubmit hooks are available, falls back to building
        turns from OTel API request events grouped by time gaps.

        Params: ?session_id=<id>&since=<unix_ts>
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self._json_response({"error": "session_id required", "turns": []})
            return

        db = self._db
        if not db:
            self._json_response({"turns": [], "summary": {}})
            return

        since = self._qs_float("since", time.time() - 86400 * 7)
        until = self._qs_float("until", time.time())

        # Parse structured fields from session_id
        tool = None
        session_pid = 0
        if ":" in session_id:
            parts = session_id.split(":")
            tool = parts[0]
            if len(parts) >= 3:
                try:
                    session_pid = int(parts[1])
                except ValueError:
                    pass

        # Step 1: Direct events for this session_id
        all_events = db.query_events(
            since=since, until=until,
            session_id=session_id,
            limit=5000,
        )

        # Step 2: Find related sessions via PID (session_processes table).
        # This bridges the correlator "tool:pid:ts" ↔ OTel/hook UUID gap:
        # both session types record their PID in session_processes during
        # ingestion, so a PID lookup finds all session_ids for that process.
        api_by_session: list[EventRow] = []
        related_sids: set[str] = set()

        if session_pid:
            related_sids = set(db.find_session_ids_by_pid(session_pid))
            related_sids.discard(session_id)

        # Fetch OTel/hook events from related sessions
        for rel_sid in related_sids:
            rel_events = db.query_events(
                since=since - 7200, until=until,
                session_id=rel_sid,
                limit=5000,
            )
            all_events.extend(rel_events)
            api_by_session.extend(
                e for e in rel_events if (e.kind or "").startswith("otel:"))

        # Step 3: If no PID-based matches yet, try direct PID filter on events
        if not api_by_session and session_pid:
            pid_events = db.query_events(
                since=since - 7200, until=until,
                tool=tool, pid=session_pid,
                limit=5000,
            )
            all_events.extend(pid_events)
            api_by_session.extend(
                e for e in pid_events if (e.kind or "").startswith("otel:"))

        # Step 4: For non-correlator sessions (UUID), OTel events are already
        # in all_events via direct session_id match — extract them.
        if not session_pid:
            api_by_session.extend(
                e for e in all_events if (e.kind or "").startswith("otel:"))

        # Step 5: Last-resort fallback — tool + time window (pre-migration DBs
        # or when PID bridge has no entries yet).  Adds OTel events to
        # api_by_session AND hook events to all_events so that
        # has_prompts can detect hook-based sessions.
        if not api_by_session and tool:
            fallback_events = db.query_events(
                since=since - 7200, until=until,
                tool=tool, limit=5000,
            )
            for e in fallback_events:
                kind = e.kind or ""
                if kind.startswith("otel:"):
                    api_by_session.append(e)
                    all_events.append(e)

        # Deduplicate and sort
        seen_keys: set[tuple] = set()
        deduped: list[EventRow] = []
        for e in all_events:
            key = (e.ts, e.tool, e.kind)
            if key not in seen_keys:
                seen_keys.add(key)
                deduped.append(e)
        all_events = sorted(deduped, key=lambda e: e.ts)

        seen_keys.clear()
        deduped_api: list[EventRow] = []
        for e in api_by_session:
            key = (e.ts, e.tool, e.kind)
            if key not in seen_keys:
                seen_keys.add(key)
                deduped_api.append(e)
        api_by_session = sorted(deduped_api, key=lambda e: e.ts)

        # Check if we have UserPromptSubmit events
        has_prompts = any(
            (e.kind or "") == "hook:UserPromptSubmit" for e in all_events
        )

        if has_prompts:
            turns = self._build_turns_from_hooks(all_events, api_by_session)
        else:
            turns = self._build_turns_from_otel(
                all_events, api_by_session, session_id)

        # Build summary — count tokens from api_call turns (OTel mode) or
        # user_message turns (hook mode, where _attribute_api_to_turns puts
        # the tokens on user_message entries).
        api_turns = [t for t in turns
                     if t["type"] == "api_call" and t.get("tokens")]
        user_msgs = [t for t in turns if t["type"] == "user_message"]
        token_source = api_turns if api_turns else user_msgs
        total_input = sum(t.get("tokens", {}).get("input", 0)
                          for t in token_source)
        total_output = sum(t.get("tokens", {}).get("output", 0)
                           for t in token_source)
        total_cache = sum(t.get("tokens", {}).get("cache_read", 0)
                          for t in token_source)
        total_api_calls = (len(api_turns) if api_turns
                           else sum(t.get("api_calls", 0) for t in user_msgs))
        compactions = sum(1 for t in turns if t["type"] == "compaction")
        tool_uses = sum(1 for t in turns if t["type"] == "tool_use")
        first_ts = turns[0]["ts"] if turns else 0
        last_ts = turns[-1].get("end_ts", turns[-1]["ts"]) if turns else 0

        summary = {
            "total_turns": len(user_msgs),
            "total_api_calls": total_api_calls,
            "total_tool_uses": tool_uses,
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_cache_tokens": total_cache,
            "total_tokens": total_input + total_output,
            "avg_tokens_per_call": (
                round((total_input + total_output) / total_api_calls)
                if total_api_calls else 0),
            "compactions": compactions,
            "duration_s": round(last_ts - first_ts, 1) if first_ts else 0,
            "source": "hooks" if has_prompts else "otel",
            "event_count": len(turns),
        }

        self._json_response({"turns": turns, "summary": summary})

    def _build_turns_from_hooks(self, all_events, api_by_session):
        """Build turns from hook events (UserPromptSubmit splits turns)."""
        turns = []
        current_turn = None
        compaction_start_ts = None

        for ev in all_events:
            kind = ev.kind or ""
            detail = ev.detail if isinstance(ev.detail, dict) else {}

            if kind == "hook:UserPromptSubmit":
                if current_turn:
                    turns.append(current_turn)
                msg = detail.get("message", detail.get("content", ""))
                preview = msg[:200] if msg else ""
                current_turn = {
                    "ts": ev.ts,
                    "type": "user_message",
                    "message": msg,
                    "preview": preview,
                    "tokens": {"input": 0, "output": 0,
                               "cache_read": 0, "cache_creation": 0},
                    "tools": [],
                    "model": "",
                    "api_calls": 0,
                    "duration_ms": 0,
                    "end_ts": ev.ts,
                }
                continue

            if kind == "hook:PreCompact":
                if current_turn:
                    turns.append(current_turn)
                    current_turn = None
                compaction_start_ts = ev.ts
                continue

            if kind == "hook:PostCompact":
                turns.append({
                    "ts": compaction_start_ts or ev.ts,
                    "type": "compaction",
                    "end_ts": ev.ts,
                    "duration_ms": round(
                        (ev.ts - (compaction_start_ts or ev.ts)) * 1000),
                    "compaction_count": detail.get("compaction_count",
                                                   detail.get("count", 0)),
                })
                compaction_start_ts = None
                continue

            if kind == "hook:SubagentStart" and current_turn is not None:
                agent_id = detail.get("agent_id",
                                      detail.get("subagent_id", ""))
                task = detail.get("task", detail.get("description", ""))
                current_turn["tools"].append({
                    "name": "Agent",
                    "args_summary": task or agent_id,
                    "ts": ev.ts,
                    "duration_ms": 0,
                    "is_agent": True,
                })
                continue

            if kind == "hook:PreToolUse" and current_turn is not None:
                tool_name = detail.get("tool_name", detail.get("name", ""))
                tool_input = detail.get("input",
                                        detail.get("tool_input", ""))
                args_summary = ""
                if isinstance(tool_input, dict):
                    for key in ("file_path", "command", "pattern", "query",
                                "path", "url", "description"):
                        if key in tool_input:
                            args_summary = str(tool_input[key])[:120]
                            break
                elif isinstance(tool_input, str):
                    args_summary = tool_input[:120]
                current_turn["tools"].append({
                    "name": tool_name,
                    "args_summary": args_summary,
                    "ts": ev.ts,
                    "duration_ms": 0,
                })
                current_turn["end_ts"] = ev.ts
                continue

            if kind == "hook:PostToolUse" and current_turn is not None:
                tool_name = detail.get("tool_name", detail.get("name", ""))
                for t in reversed(current_turn["tools"]):
                    if t["name"] == tool_name and t["duration_ms"] == 0:
                        t["duration_ms"] = round((ev.ts - t["ts"]) * 1000)
                        break
                current_turn["end_ts"] = ev.ts
                continue

            if kind == "hook:SessionStart":
                turns.append({
                    "ts": ev.ts, "type": "session_start",
                    "tool": ev.tool,
                    "cwd": detail.get("cwd", ""),
                })
                continue

            if kind == "hook:SessionEnd":
                if current_turn:
                    turns.append(current_turn)
                    current_turn = None
                turns.append({
                    "ts": ev.ts, "type": "session_end",
                    "tool": ev.tool,
                })
                continue

        if current_turn:
            turns.append(current_turn)

        # Attribute API call tokens to turns
        turn_user_msgs = [t for t in turns if t["type"] == "user_message"]
        self._attribute_api_to_turns(turn_user_msgs, api_by_session)
        return turns

    def _build_turns_from_otel(self, all_events, otel_events, session_id):
        """Build sequence diagram events from OTel and correlator events.

        Produces a flat list of typed events suitable for rendering as a
        UML sequence diagram:
        - user_message: user → tool (from otel:user_prompt)
        - api_call: tool → API (from otel:api_request or otel:chat*)
        - tool_use: tool → skill (from otel:tool_decision / otel:tool_result)
        - session_start / session_end: from correlator events
        - compaction: from hook:PreCompact / PostCompact
        - file_modified: from correlator events
        """
        turns = []
        compaction_start_ts = None

        # Process correlator events (session_start/end, file_modified)
        for ev in all_events:
            kind = ev.kind or ""
            detail = ev.detail if isinstance(ev.detail, dict) else {}

            if kind == "session_start":
                turns.append({
                    "ts": ev.ts, "type": "session_start",
                    "tool": ev.tool,
                    "cwd": detail.get("cwd", ""),
                })
            elif kind == "session_end":
                turns.append({
                    "ts": ev.ts, "type": "session_end",
                    "tool": ev.tool,
                })
            elif kind == "hook:PreCompact":
                compaction_start_ts = ev.ts
            elif kind == "hook:PostCompact":
                turns.append({
                    "ts": compaction_start_ts or ev.ts,
                    "type": "compaction",
                    "end_ts": ev.ts,
                    "duration_ms": round(
                        (ev.ts - (compaction_start_ts or ev.ts)) * 1000),
                    "compaction_count": detail.get("compaction_count",
                                                   detail.get("count", 0)),
                })
                compaction_start_ts = None
            elif kind.startswith("hook:"):
                # Pass through any hook events as-is for the diagram
                turns.append({
                    "ts": ev.ts, "type": "hook",
                    "hook_name": kind[5:],
                    "detail": detail,
                    "tool": ev.tool,
                })

        # Process OTel events into sequence diagram entries
        for ev in otel_events:
            kind = ev.kind or ""
            detail = ev.detail if isinstance(ev.detail, dict) else {}

            # ── User prompt events ────────────────────────────
            if kind in ("otel:user_prompt", "otel:user_message"):
                # Claude Code: "prompt" key (may be <REDACTED>)
                # Copilot: "copilot_chat.user_request" or body
                msg = (detail.get("prompt")
                       or detail.get("copilot_chat.user_request")
                       or detail.get("message")
                       or detail.get("content")
                       or detail.get("body") or "")
                if isinstance(msg, dict):
                    msg = msg.get("stringValue", str(msg))
                msg = str(msg).strip() if msg else ""
                redacted = (not msg
                            or msg in ("<REDACTED>", "REDACTED")
                            or "REDACTED" in msg.upper())
                prompt_len = detail.get("prompt_length", "")
                prompt_id = detail.get("prompt.id", "")
                turns.append({
                    "ts": ev.ts,
                    "type": "user_message",
                    "from": "user",
                    "to": ev.tool,
                    "message": "" if redacted else msg[:2000],
                    "preview": "" if redacted else msg[:120],
                    "redacted": redacted,
                    "prompt_length": prompt_len,
                    "prompt_id": prompt_id,
                    "tokens": {"input": 0, "output": 0,
                               "cache_read": 0, "cache_creation": 0},
                    "model": "",
                    "api_calls": 0,
                    "duration_ms": 0,
                })

            # ── API call / chat span events ──────────────────
            # TODO: tighten "inference" to explicit kind values
            elif ("api_request" in kind
                  or kind.startswith("otel:chat ")
                  or "inference" in kind):
                model = (detail.get("model")
                         or detail.get("gen_ai.request.model")
                         or detail.get("gen_ai.response.model")
                         or detail.get("span.name") or "")
                in_tok = int(_num(detail.get("input_tokens",
                    detail.get("gen_ai.usage.input_tokens",
                    detail.get("gen_ai.usage.prompt_tokens", 0)))))
                out_tok = int(_num(detail.get("output_tokens",
                    detail.get("gen_ai.usage.output_tokens",
                    detail.get("gen_ai.usage.completion_tokens", 0)))))
                cache_r = int(_num(
                    detail.get("cache_read_tokens",
                    detail.get("gen_ai.usage.cache_read.input_tokens", 0))))
                cache_c = int(_num(detail.get("cache_creation_tokens", 0)))
                dur = int(_num(detail.get("duration_ms",
                               detail.get("duration", 0))))
                ttft = int(_num(
                    detail.get("copilot_chat.time_to_first_token", 0)))
                agent_name = detail.get("gen_ai.agent.name", "")
                # Extract user request from chat spans (Copilot embeds it)
                user_req = detail.get("copilot_chat.user_request", "")
                # Extract response text from output messages
                resp_text = ""
                out_msgs = detail.get("gen_ai.output.messages")
                if isinstance(out_msgs, list) and out_msgs:
                    for om in out_msgs:
                        if isinstance(om, dict):
                            for part in (om.get("parts") or []):
                                if isinstance(part, dict) and \
                                        part.get("type") == "text":
                                    resp_text = str(
                                        part.get("content", ""))[:500]
                                    break
                        if resp_text:
                            break
                finish = detail.get("gen_ai.response.finish_reasons", [])
                is_error = ("error" in finish
                            or detail.get("error.type", ""))

                # If this span has a user request and no user_message
                # event was emitted, synthesize one
                if user_req:
                    turns.append({
                        "ts": ev.ts - 0.001,  # just before the API call
                        "type": "user_message",
                        "from": "user",
                        "to": ev.tool,
                        "message": str(user_req)[:2000],
                        "preview": str(user_req)[:120],
                        "redacted": False,
                        "tokens": {"input": 0, "output": 0,
                                   "cache_read": 0, "cache_creation": 0},
                        "model": "",
                        "api_calls": 0,
                        "duration_ms": 0,
                    })

                # Request arrow: tool → API
                turns.append({
                    "ts": ev.ts,
                    "type": "api_call",
                    "from": ev.tool,
                    "to": "api",
                    "model": model,
                    "agent_name": agent_name,
                    "tokens": {"input": in_tok, "output": out_tok,
                               "cache_read": cache_r,
                               "cache_creation": cache_c},
                    "duration_ms": dur,
                    "ttft_ms": ttft,
                    "is_error": is_error,
                    "error_type": detail.get("error.type", ""),
                })
                # Response arrow: API → tool (with output tokens + text)
                if out_tok > 0 or resp_text:
                    resp_ts = ev.ts + (dur / 1000 if dur else 0.1)
                    turns.append({
                        "ts": resp_ts,
                        "type": "api_response",
                        "from": "api",
                        "to": ev.tool,
                        "model": model,
                        "tokens": {"output": out_tok},
                        "duration_ms": dur,
                        "response_preview": resp_text[:200] if resp_text
                                            else "",
                        "finish_reason": (finish[0] if finish
                                          else ""),
                    })

            # ── Agent invocation (Copilot) ───────────────────
            elif kind.startswith("otel:invoke_agent"):
                agent_name = kind.replace("otel:invoke_agent ", "").strip()
                turns.append({
                    "ts": ev.ts,
                    "type": "subagent",
                    "from": ev.tool,
                    "to": agent_name or "agent",
                    "detail": {k: v for k, v in detail.items()
                               if k not in ("tool", "session_id")},
                })

            # ── Copilot session/turn events ──────────────────
            elif kind == "otel:copilot_chat.session.start":
                turns.append({
                    "ts": ev.ts, "type": "session_start",
                    "tool": ev.tool,
                    "cwd": detail.get("cwd", ""),
                })
            elif kind == "otel:copilot_chat.agent.turn":
                agent_name = detail.get("gen_ai.agent.name", "agent")
                turns.append({
                    "ts": ev.ts,
                    "type": "subagent",
                    "from": ev.tool,
                    "to": agent_name,
                    "detail": detail,
                })

            # ── Exception events ─────────────────────────────
            elif kind == "otel:exception":
                err_type = detail.get("exception.type", "error")
                err_msg = detail.get("exception.message", "")
                parent = detail.get("parent_span", "")
                turns.append({
                    "ts": ev.ts,
                    "type": "error",
                    "from": "api",
                    "to": ev.tool,
                    "error_type": err_type,
                    "error_message": err_msg[:200],
                    "parent_span": parent,
                })
            elif "tool_decision" in kind or "tool_result" in kind:
                tool_name = detail.get("tool_name",
                             detail.get("name",
                             detail.get("span.name", kind)))
                is_result = "tool_result" in kind
                # Extract tool parameters/args for display
                params = detail.get("tool_parameters", "")
                if isinstance(params, str) and len(params) > 200:
                    params = params[:200] + "..."
                success = detail.get("success", "")
                result_size = detail.get("tool_result_size_bytes", "")
                turns.append({
                    "ts": ev.ts,
                    "type": "tool_use",
                    "from": ev.tool,
                    "to": tool_name,
                    "subtype": "result" if is_result else "decision",
                    "decision": detail.get("decision", ""),
                    "success": success,
                    "params": params,
                    "result_size": result_size,
                    "prompt_id": detail.get("prompt.id", ""),
                    "duration_ms": int(_num(
                        detail.get("duration_ms", 0))),
                })
            elif kind == "otel:SubagentStart" or "subagent" in kind.lower():
                agent_id = detail.get("agent_id",
                            detail.get("subagent_id", ""))
                turns.append({
                    "ts": ev.ts,
                    "type": "subagent",
                    "from": ev.tool,
                    "to": agent_id or "subagent",
                    "detail": detail,
                })

        # Sort all events chronologically
        turns.sort(key=lambda t: t["ts"])

        # Build per-turn token aggregation: group API calls between
        # user_messages so we can show round-trip totals
        current_round = None
        for t in turns:
            if t["type"] == "user_message":
                current_round = t
            elif t["type"] == "api_call" and current_round:
                tok = current_round.get("tokens", {})
                tok["input"] += t["tokens"]["input"]
                tok["output"] += t["tokens"]["output"]
                tok["cache_read"] += t["tokens"]["cache_read"]
                tok["cache_creation"] += t["tokens"]["cache_creation"]
                current_round["api_calls"] = \
                    current_round.get("api_calls", 0) + 1
                current_round["duration_ms"] = \
                    current_round.get("duration_ms", 0) + t["duration_ms"]
                if not current_round.get("model") and t.get("model"):
                    current_round["model"] = t["model"]

        return turns

    @staticmethod
    def _attribute_api_to_turns(turn_user_msgs, api_by_session):
        """Attribute OTel API call data to the matching user-message turns.

        Only processes otel:api_request (and chat/inference spans) — skips
        otel:tool_decision, otel:tool_result, otel:user_prompt which carry
        no token data.
        """
        _API_KINDS = ("otel:api_request", "otel:claude_code.api_request")
        for api_ev in api_by_session:
            kind = api_ev.kind or ""
            # TODO: tighten "inference" to explicit kind values
            if not (kind in _API_KINDS
                    or kind.startswith("otel:chat ")
                    or "inference" in kind):
                continue
            d = api_ev.detail if isinstance(api_ev.detail, dict) else {}
            best_turn = None
            for t in turn_user_msgs:
                if t["ts"] <= api_ev.ts:
                    best_turn = t
                else:
                    break
            if best_turn:
                best_turn["tokens"]["input"] += int(_num(
                    d.get("input_tokens", 0)))
                best_turn["tokens"]["output"] += int(_num(
                    d.get("output_tokens", 0)))
                best_turn["tokens"]["cache_read"] += int(_num(
                    d.get("cache_read_tokens", 0)))
                best_turn["tokens"]["cache_creation"] += int(_num(
                    d.get("cache_creation_tokens", 0)))
                best_turn["api_calls"] += 1
                model = d.get("model", "")
                if model and not best_turn["model"]:
                    best_turn["model"] = model
                dur = _num(d.get("duration_ms", d.get("duration", 0)))
                best_turn["duration_ms"] += int(dur)
                if api_ev.ts > best_turn["end_ts"]:
                    best_turn["end_ts"] = api_ev.ts
        # Compute wall-clock duration
        for t in turn_user_msgs:
            if t["end_ts"] > t["ts"]:
                t["wall_ms"] = round((t["end_ts"] - t["ts"]) * 1000)
            else:
                t["wall_ms"] = t["duration_ms"]

    def _serve_otel_status(self) -> None:
        """Return OTel receiver health status."""
        status = self.server.otel_receiver.status()
        self._json_response(status)

    def _serve_api_calls(self) -> None:
        """Return API call data from OTel events.

        Queries events with kind 'otel:claude_code.api_request' and
        'otel:claude_code.api_error' for latency/frequency analysis.
        """
        db = self._db
        if not db:
            self._json_response({"calls": [], "summary": {}})
            return

        since = self._qs_float("since", time.time() - 3600)
        until = self._qs_float("until", time.time())
        limit = min(int(self._qs_get("limit", "500")), 2000)

        # Query API request events
        api_events = db.query_events(
            since=since, until=until,
            kind="otel:claude_code.api_request",
            limit=limit,
        )
        error_events = db.query_events(
            since=since, until=until,
            kind="otel:claude_code.api_error",
            limit=limit,
        )

        calls = []
        for ev in api_events:
            d = ev.detail if isinstance(ev.detail, dict) else {}
            calls.append({
                "ts": ev.ts,
                "model": d.get("model", ""),
                "duration_ms": _num(d.get("duration_ms", d.get("duration", 0))),
                "input_tokens": _num(d.get("input_tokens", 0)),
                "output_tokens": _num(d.get("output_tokens", 0)),
                "cache_read_tokens": _num(d.get("cache_read_tokens", 0)),
                "prompt_id": d.get("prompt.id", d.get("prompt_id", "")),
                "status": "ok",
            })
        for ev in error_events:
            d = ev.detail if isinstance(ev.detail, dict) else {}
            calls.append({
                "ts": ev.ts,
                "model": d.get("model", ""),
                "error": d.get("error", d.get("message", "unknown")),
                "error_type": d.get("error_type", d.get("type", "")),
                "prompt_id": d.get("prompt.id", d.get("prompt_id", "")),
                "status": "error",
            })
        calls.sort(key=lambda c: c["ts"], reverse=True)

        # Build summary
        ok_calls = [c for c in calls if c["status"] == "ok"]
        durations = [c["duration_ms"] for c in ok_calls if c.get("duration_ms")]
        models = Counter(c.get("model", "unknown") for c in ok_calls)

        summary = {
            "total_calls": len(ok_calls),
            "total_errors": len(calls) - len(ok_calls),
            "avg_latency_ms": round(sum(durations) / len(durations), 1) if durations else 0,
            "p95_latency_ms": round(sorted(durations)[int(len(durations) * 0.95)] if durations else 0, 1),
            "by_model": models,
        }

        self._json_response({"calls": calls[:limit], "summary": summary})

    def _serve_html(self) -> None:
        html = _load_template()
        html = html.replace("%%TOOL_COLORS_JS%%", _make_js_colors())
        html = html.replace("%%TOOL_ICONS_JS%%", _make_js_icons())
        html = html.replace("%%TAXONOMY_JS%%", _make_js_taxonomy())
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _serve_static(self, path: str) -> None:
        """Serve static assets from the dist/ directory."""
        import mimetypes
        rel = path.lstrip("/")
        candidates = [
            Path(__file__).parent / "dist",
            Path(__file__).parent / "ui" / "dist",
        ]
        file_path = None
        for dist_dir in candidates:
            fp = dist_dir / rel
            if fp.is_file():
                file_path = fp
                break
        if file_path is None:
            checked = [str(d / rel) for d in candidates]
            _log.warning("Static 404: %s — checked: %s", path, checked)
            self.send_error(404, "Not found")
            return
        mime, _ = mimetypes.guess_type(str(file_path))
        body = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers()
        self.wfile.write(body)

    def _serve_snapshot(self) -> None:
        snap_bytes = self.server.store.snapshot_json_bytes
        if not snap_bytes:
            self.send_error(503, "No data yet")
            return
        etag = f'"{self.server.store.version}"'
        if self._check_etag(etag):
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("ETag", etag)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(snap_bytes)

    def _serve_file(self) -> None:
        qs = self._qs
        file_path = qs.get("path", [None])[0]
        if not file_path:
            self.send_error(400, "Missing path parameter")
            return
        if not self.server.allowed.is_allowed(file_path):
            self.send_error(403, "Path not in discovered resource set")
            return
        p = Path(file_path)
        try:
            mtime = p.stat().st_mtime
        except OSError:
            self.send_error(404, "File not readable")
            return
        etag = f'"{int(mtime)}"'
        if self._check_etag(etag):
            return
        content = _read_file_safe(file_path)
        if content is None:
            self.send_error(404, "File not readable")
            return
        body = content.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("ETag", etag)
        self.send_header("Last-Modified",
                         email.utils.formatdate(mtime, usegmt=True))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_sse(self) -> None:
        global _sse_client_count

        # Enforce max SSE client limit to avoid thread exhaustion
        with _sse_client_lock:
            if _sse_client_count >= _MAX_SSE_CLIENTS:
                logger.warning("SSE client limit reached (%d), rejecting connection",
                               _MAX_SSE_CLIENTS)
                self.send_error(503, "Too many SSE clients")
                return
            _sse_client_count += 1

        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            version = 0
            # Send current snapshot immediately
            snap = self.server.store.snapshot
            if snap:
                self._write_sse(snap)
                version = self.server.store.version

            while True:
                try:
                    snap, version = self.server.store.wait_for_update(
                        version, timeout=30.0)
                    if snap:
                        self._write_sse(snap)
                    else:
                        self.wfile.write(b": keepalive\n\n")
                        self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError, OSError):
                    break
        finally:
            with _sse_client_lock:
                _sse_client_count -= 1

    def _write_sse(self, snap: DashboardSnapshot) -> None:
        # Use pre-serialized SSE JSON if available (avoids per-client serialization)
        data = self.server.store.sse_json
        if not data:
            # Fallback: serialize now (first push before store has SSE cached)
            summary = build_sse_summary(snap)
            data = json.dumps(summary)
        self.wfile.write(f"data: {data}\n\n".encode("utf-8"))
        self.wfile.flush()

    def _serve_history(self) -> None:
        """Serve time-series history.

        Without ?range or ?since, returns in-memory ring buffer (fast, ~35 min).
        With ?range=1h|6h|24h|7d, queries SQLite for longer history.
        With ?since=<ts>[&until=<ts>][&tool=<name>], queries SQLite for custom range.
        """
        range_str = self._qs_get("range")
        since_str = self._qs_get("since")
        tool_filter = self._qs_get("tool")

        use_db = (range_str or since_str) and self._db
        if use_db:
            import time as _time
            if since_str:
                since = float(since_str)
            else:
                range_map = {"1h": 3600, "6h": 21600, "24h": 86400, "7d": 604800}
                secs = range_map.get(range_str, 3600)
                since = _time.time() - secs
            until = self._qs_float_opt("until")
            data = self._db.query_metrics(since=since, until=until)
            tool_data = self._db.query_tool_metrics(
                tool=tool_filter, since=since, until=until)
            data["by_tool"] = tool_data
            body = json.dumps(data).encode("utf-8")
        else:
            body = self.server.store.history_json().encode("utf-8")

        self._json_response_raw(body)

    def _serve_samples(self) -> None:
        """Serve universal samples.

        Params: ?metric=X&prefix=X&since=<ts>&tag.tool=X&limit=N
        Or: ?list=1&prefix=X  to list distinct metric names.
        Or: ?series=X&since=<ts>  to get a single metric as time-series.
        """
        db = self._require_db()
        if not db:
            return

        qs = self._qs
        # Mode: list metrics
        if "list" in qs:
            prefix = self._qs_get("prefix", "")
            result = db.list_metrics(prefix=prefix)
        # Mode: single metric series
        elif "series" in qs:
            metric = qs["series"][0]
            since = self._qs_float("since", time.time() - 3600)
            result = db.query_samples_series(metric, since=since)
        # Mode: query samples
        else:
            metric = self._qs_get("metric")
            prefix = self._qs_get("prefix")
            since = self._qs_float("since", time.time() - 3600)
            limit = int(self._qs_get("limit", "1000"))
            # Extract tag filters from tag.X=Y params
            tag_filter = {k[4:]: v[0] for k, v in qs.items() if k.startswith("tag.")}
            rows = db.query_samples(
                metric=metric, metric_prefix=prefix,
                since=since, tag_filter=tag_filter or None, limit=limit,
            )
            result = [{"ts": s.ts, "metric": s.metric, "value": s.value, "tags": s.tags}
                      for s in rows]

        self._json_response(result)

    def _serve_project_costs(self) -> None:
        """Serve per-project cumulative token/cost data.

        Params: ?since=<unix_ts>&days=<N>
        Returns: [{project, sessions, input_tokens, output_tokens, total_tokens,
                   cost_usd, daily: [{date, input_tokens, output_tokens}]}]
        """
        days = int(self._qs_get("days", "7"))
        since = self._qs_float("since", time.time() - days * 86400)

        _empty = lambda: {"sessions": 0, "input_tokens": 0, "output_tokens": 0, "daily": {}}
        projects: dict[str, dict] = {}  # project -> aggregate

        # 1. Active sessions from correlator
        snap = self.server.store.latest_snapshot()
        if snap:
            for s in snap.get("sessions") or []:
                proj = s.get("project") or "(unknown)"
                p = projects.setdefault(proj, _empty())
                p["sessions"] += 1
                p["input_tokens"] += s.get("exact_input_tokens") or 0
                p["output_tokens"] += s.get("exact_output_tokens") or 0

        # 2. Historical session_end events from SQLite
        db = self._db
        if db:
            rows = db.query_events(since=since, kind="session_end", limit=5000)
            for ev in rows:
                detail = ev.detail or {}
                proj = detail.get("project") or "(unknown)"
                p = projects.setdefault(proj, _empty())
                p["sessions"] += 1
                in_tok = detail.get("input_tokens") or 0
                out_tok = detail.get("output_tokens") or 0
                p["input_tokens"] += in_tok
                p["output_tokens"] += out_tok
                # Daily bucketing
                day = datetime.fromtimestamp(ev.ts, tz=timezone.utc).strftime("%Y-%m-%d")
                daily = p["daily"].setdefault(day, {"input_tokens": 0, "output_tokens": 0})
                daily["input_tokens"] += in_tok
                daily["output_tokens"] += out_tok

        # Build response
        result = []
        for proj, data in sorted(projects.items(), key=lambda x: x[1]["input_tokens"] + x[1]["output_tokens"], reverse=True):
            total = data["input_tokens"] + data["output_tokens"]
            # Rough cost estimate: $3/Mtok input, $15/Mtok output (Opus-class)
            cost_usd = data["input_tokens"] / 1e6 * 3.0 + data["output_tokens"] / 1e6 * 15.0
            daily = [{"date": d, **v} for d, v in sorted(data["daily"].items())]
            result.append({
                "project": proj,
                "sessions": data["sessions"],
                "input_tokens": data["input_tokens"],
                "output_tokens": data["output_tokens"],
                "total_tokens": total,
                "cost_usd": round(cost_usd, 2),
                "daily": daily,
            })

        self._json_response(result)

    def _serve_session_runs(self) -> None:
        """Serve historical session runs grouped by project+tool for trend analysis.

        Params: ?project=<path>&tool=<name>&days=<N>&limit=<N>
        Returns: [{session_id, ts, project, tool, duration_s, input_tokens,
                   output_tokens, total_tokens}] sorted by ts desc.
        Enables run-over-run comparison for scheduled/recurring sessions.
        """
        project = self._qs_get("project")
        tool = self._qs_get("tool")
        days = int(self._qs_get("days", "30"))
        limit = int(self._qs_get("limit", "50"))
        since = time.time() - days * 86400

        runs = []
        db = self._db
        if db:
            rows = db.query_events(since=since, kind="session_end", limit=5000)
            for ev in rows:
                detail = ev.detail or {}
                ev_project = detail.get("project") or ""
                if project and ev_project != project:
                    continue
                if tool and ev.tool != tool:
                    continue
                in_tok = detail.get("input_tokens") or 0
                out_tok = detail.get("output_tokens") or 0
                runs.append({
                    "session_id": detail.get("session_id", ""),
                    "ts": ev.ts,
                    "project": ev_project,
                    "tool": ev.tool,
                    "duration_s": detail.get("duration_s") or 0,
                    "input_tokens": in_tok,
                    "output_tokens": out_tok,
                    "total_tokens": in_tok + out_tok,
                })
        # Sort by timestamp descending (most recent first), apply limit
        runs.sort(key=lambda r: r["ts"], reverse=True)
        runs = runs[:limit]

        self._json_response(runs)

    # ── Analytics endpoint ─────────────────────────────────────────

    def _serve_analytics(self) -> None:
        """Serve pre-computed analytics from the background cache.

        Zero SQL on the request path — the background thread recomputes
        every 15 seconds.  Response time: <1ms.

        Params: ?since=<ts>&until=<ts>
        """
        since = self._qs_float("since", time.time() - 86400)
        until = self._qs_float("until", time.time())
        result = self.server.analytics_cache.get(since, until)
        self._json_response(result)

    def _serve_events(self) -> None:
        """Serve recent events from SQLite.

        Params: ?since=<unix_ts>&until=<unix_ts>&tool=<name>&kind=<type>&session_id=<id>&limit=<n>
        """
        events_list = []
        db = self._db
        if db:
            since = self._qs_float("since", time.time() - 3600)
            until = self._qs_float_opt("until")
            tool = self._qs_get("tool")
            kind = self._qs_get("kind")
            session_id = self._qs_get("session_id")
            limit = int(self._qs_get("limit", "200"))
            rows = db.query_events(since=since, until=until, tool=tool,
                                   kind=kind, session_id=session_id,
                                   limit=limit)
            events_list = [dataclasses.asdict(r) for r in rows]

        self._json_response(events_list)

    def _serve_datapoint_catalog(self) -> None:
        """Serve the datapoint catalog.

        Params: ?tab=<tab>&key=<key>&source_type=<raw|deduced|aggregated>
        """
        tab = self._qs_get("tab")
        key = self._qs_get("key")
        source_type = self._qs_get("source_type")

        entries = []
        db = self._db
        if db:
            entries = db.query_datapoint_catalog(
                tab=tab, key=key, source_type=source_type
            )

        self._json_response(entries)

    def _serve_sessions(self) -> None:
        """Serve active and historical sessions.

        Params: ?tool=X&active=true&since=<ts>&limit=N

        Queries both the live snapshot (for active sessions) and the sessions
        table (for historical/ended sessions).
        """
        tool = self._qs_get("tool")
        active_only = (self._qs_get("active", "")).lower() == "true"
        limit = int(self._qs_get("limit", "100"))

        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return

        # Active sessions from live snapshot
        sessions = list(snap.sessions)

        # Filter by tool
        if tool:
            sessions = [s for s in sessions if s.get("tool") == tool]

        # If not active_only, also include historical sessions
        if not active_only:
            db = self._db
            if db:
                since = self._qs_float("since", time.time() - 86400)
                active_ids = {s.get("session_id") for s in sessions}

                # Query sessions table (v20)
                db_sessions = db.query_sessions(
                    since=since, tool=tool or None,
                    active=None, limit=limit,
                )
                for s in db_sessions:
                    sid = s.get("session_id", "")
                    if sid and sid not in active_ids:
                        sessions.append({
                            "session_id": sid,
                            "tool": s.get("tool", ""),
                            "started_at": s.get("started_at"),
                            "ended_at": s.get("ended_at"),
                            "duration_s": (round(s["ended_at"] - s["started_at"], 1)
                                          if s.get("ended_at") and s.get("started_at")
                                          else None),
                            "active": s.get("ended_at") is None,
                            "model": s.get("model", ""),
                            "input_tokens": s.get("input_tokens", 0),
                            "output_tokens": s.get("output_tokens", 0),
                            "cost_usd": s.get("cost_usd", 0),
                        })
                        active_ids.add(sid)

                # Also fall back to event-based reconstruction for sessions
                # not yet in the sessions table
                ended = db.query_events(since=since, kind="session_end", limit=limit)
                for ev in ended:
                    d = ev.detail if isinstance(ev.detail, dict) else {}
                    sid = d.get("session_id", "")
                    if sid and sid not in active_ids:
                        sessions.append({
                            "session_id": sid,
                            "tool": ev.tool,
                            "ended_at": ev.ts,
                            "duration_s": d.get("duration_s", 0),
                            "active": False,
                        })
                        active_ids.add(sid)

        # Mark active sessions
        for s in sessions:
            if "active" not in s:
                s["active"] = True

        self._json_response(sessions[:limit])

    def _serve_session_stats(self) -> None:
        """Serve deduced session metrics from entity state + JSONL enrichment.

        Params: ?session_id=X (optional — omit for all sessions)
        Returns per-session deduced stats: tool calls, skill calls, prompt
        count, tool call rate, agent stats with token/tool breakdown.
        """
        session_id = self._qs_get("session_id")
        tracker = self.server.entity_tracker
        snap = self.server.store.snapshot

        # Enrich agent states with JSONL data when available
        if snap and snap.agent_teams:
            tracker.enrich_from_agent_teams(snap.agent_teams)

        if session_id:
            sess = tracker.get_session_state(session_id)
            if not sess:
                self._json_response({"error": "session not found"})
                return
            self._json_response(sess.to_dict())
        else:
            # All sessions with deduced metrics
            result = tracker.all_sessions()
            # Add global aggregates
            totals = {
                "total_tool_calls": sum(s.get("tool_calls", 0) for s in result),
                "total_skill_calls": sum(s.get("skill_calls", 0) for s in result),
                "total_prompts": sum(s.get("prompt_count", 0) for s in result),
                "sessions": result,
            }
            self._json_response(totals)

    def _serve_session_timeline(self) -> None:
        """Serve enriched session profiles for the timeline bar.

        Params: ?since=<unix_ts>&until=<unix_ts>
        Returns list of session profiles with conversations, agents, file stats.
        """
        db = self._require_db()
        if not db:
            return

        since = self._qs_float("since", time.time() - 86400)
        until = self._qs_float_opt("until")

        profiles = db.query_session_profiles(since=since, until=until)

        # Filter to meaningful sessions (have file activity or >60s duration)
        profiles = [
            p for p in profiles
            if p["files_modified"] > 0
            or (p.get("duration_s") and p["duration_s"] > 60)
        ]

        # Merge live session data for active sessions
        snap = self.server.store.snapshot
        if snap:
            active_map = {s.get("session_id"): s for s in snap.sessions}
            for p in profiles:
                live = active_map.get(p["session_id"])
                if live:
                    p["active"] = True
                    p["project"] = p.get("project") or live.get("project", "")
                    p["cpu_percent"] = live.get("cpu_percent", 0)
                    p["input_tokens"] = live.get("exact_input_tokens", 0)
                    p["output_tokens"] = live.get("exact_output_tokens", 0)

        self._json_response(profiles)

    def _serve_files(self) -> None:
        """Serve tracked files from the file store.

        Params: ?tool=X&category=Y&changed_since=<ts>
        """
        db = self._require_db()
        if not db:
            return

        tool = self._qs_get("tool")
        category = self._qs_get("category")
        changed_since_str = self._qs_get("changed_since")
        changed_since = float(changed_since_str) if changed_since_str else None

        files = db.list_files(tool=tool, category=category, changed_since=changed_since)
        self._json_response([{k: v for k, v in dataclasses.asdict(f).items() if k != "content"}
                              for f in files])

    def _serve_file_history(self) -> None:
        """Serve file change history.

        Params: ?path=X&limit=N
        Or: ?path=X&ts=<unix_ts> to get content at a point in time.
        """
        file_path = self._qs_get("path")

        if not file_path:
            self.send_error(400, "Missing path parameter")
            return

        db = self._require_db()
        if not db:
            return

        # Content at timestamp mode
        ts_str = self._qs_get("ts")
        if ts_str:
            ts = float(ts_str)
            content = db.file_content_at(file_path, ts)
            if content is None:
                self.send_error(404, "No content at that timestamp")
                return
            body = content.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return

        # History timeline mode
        limit = int(self._qs_get("limit", "50"))
        history = db.file_history(file_path, limit=limit)
        self._json_response(history)

    def _serve_telemetry(self) -> None:
        """Serve historical telemetry data.

        Params: ?tool=X&since=<ts>&until=<ts>
        """
        db = self._require_db()
        if not db:
            return

        tool = self._qs_get("tool")
        since = self._qs_float("since", time.time() - 86400)
        until = self._qs_float("until", time.time())

        rows = db.query_telemetry(tool=tool, since=since, until=until)
        self._json_response([dataclasses.asdict(r) for r in rows])

    @property
    def _db(self):
        """Shortcut to the HistoryDB instance (may be None if not yet initialised)."""
        return self.server.store._db

    def _check_etag(self, etag: str) -> bool:
        """Send 304 if client ETag matches. Returns True when 304 was sent."""
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.end_headers()
            return True
        return False

    def _qs_get(self, key: str, default=None):
        """Return the first value for *key* in the query-string, or *default*."""
        v = self._qs.get(key)
        return v[0] if v else default

    def _json_response(self, data, indent=None) -> None:
        """Send a JSON response."""
        self._json_response_raw(json.dumps(data, indent=indent).encode("utf-8"))

    def _require_db(self, empty=None):
        """Return db if available; otherwise send an empty JSON response and return None."""
        db = self._db
        if not db:
            self._json_response([] if empty is None else empty)
        return db

    def _qs_float(self, key: str, default: float) -> float:
        """Parse a float from query string, returning default if absent."""
        v = self._qs_get(key)
        return float(v) if v else default

    def _qs_float_opt(self, key: str) -> float | None:
        """Parse an optional float from query string, returning None if absent."""
        v = self._qs_get(key)
        return float(v) if v else None

    def _json_response_raw(self, body: bytes) -> None:
        """Send pre-encoded JSON bytes as a response."""
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _receive_otel_signal(
        self,
        signal: str,
        parse_method: str,
        append_method: str,
        log_unit: str,
    ) -> None:
        """Shared boilerplate for single-type OTel signal receivers."""
        data = self._read_post_otlp(signal)
        if data is None:
            return
        try:
            receiver = self.server.otel_receiver
            items = getattr(receiver, parse_method)(data)
            if (db := self._db) and items:
                getattr(db, append_method)(items)
            logger.debug("OTel %s received: %d %s", signal, len(items), log_unit)
        except Exception:
            logger.exception("Error processing OTel %s", signal)
            self.server.otel_receiver.stats.errors += 1
            self.send_error(500, "Internal error")
            return
        self._json_response_raw(b'{"ok":true}')

    def _serve_budget(self) -> None:
        global _budget_cache
        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return
        version = self.server.store.version
        if _budget_cache is None or _budget_cache[0] != version:
            _budget_cache = (version, compute_token_budget(snap.tools, snap.root))
        budget = _budget_cache[1]
        self._json_response(budget, indent=2)

    def log_message(self, fmt, *args) -> None:
        # Suppress noisy SSE keepalive logs
        msg = fmt % args if args else fmt
        if "/api/stream" in str(msg):
            return
        print(f"  {msg}", file=sys.stderr)


# ─── HTTP server ─────────────────────────────────────────────────

class _DashboardHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, addr, handler, store, allowed, root):
        super().__init__(addr, handler)
        self.store: SnapshotStore = store
        self.allowed: AllowedPaths = allowed
        self.root: Path = root
        # Entity state tracker for hook events (Phase 3.3)
        from ..monitoring.correlator import EntityStateTracker
        self.entity_tracker: EntityStateTracker = EntityStateTracker()
        # OTel OTLP receiver for Claude Code telemetry
        self.otel_receiver: OtelReceiver = OtelReceiver()
        # Background analytics cache — no SQL on request path
        self.analytics_cache: _AnalyticsCache = _AnalyticsCache()
        self.analytics_cache.start(store)
        # In-memory cache for matching PreToolUse → PostToolUse by tool_use_id.
        # Maps tool_use_id → (pre_ts, dedup_key).  Entries auto-expire on access.
        self.pending_tool_use: dict[str, tuple[float, str]] = {}



# ─── Inline HTML dashboard ───────────────────────────────────────

from ..tools import (
    TOOL_COLORS as _REG_COLORS,
    TOOL_ICONS as _REG_ICONS,
    VENDOR_LABELS as _REG_VENDOR_LABELS,
    VENDOR_COLORS as _REG_VENDOR_COLORS,
    HOST_LABELS as _REG_HOST_LABELS,
    TOOL_RELATIONSHIPS as _REG_RELATIONSHIPS,
)
import json as _json

def _make_js_colors() -> str:
    """Generate the JavaScript COLORS const from the registry."""
    return f"window.COLORS = {_json.dumps(_REG_COLORS)};"

def _make_js_icons() -> str:
    """Generate the JavaScript ICONS const from the registry."""
    return f"window.ICONS = {_json.dumps(_REG_ICONS)};"

def _make_js_taxonomy() -> str:
    """Generate vendor/host label and color constants."""
    return (
        f"window.VENDOR_LABELS = {_json.dumps(_REG_VENDOR_LABELS)};\n"
        f"window.VENDOR_COLORS = {_json.dumps(_REG_VENDOR_COLORS)};\n"
        f"window.HOST_LABELS = {_json.dumps(_REG_HOST_LABELS)};\n"
        f"window.TOOL_RELATIONSHIPS = {_json.dumps(_REG_RELATIONSHIPS)};"
    )

_TEMPLATE_CACHE: str | None = None
_TEMPLATE_MTIME: float = 0.0
_DEV_MODE: bool = False


def set_dev_mode(enabled: bool) -> None:
    """Enable or disable dev mode (disables template caching)."""
    global _DEV_MODE
    _DEV_MODE = enabled


def _load_template() -> str:
    """Load the HTML template from dist/index.html (built Vite output).

    Auto-builds if npm is available and dist/ is missing.
    Automatically reloads when the file changes on disk (after rebuild).
    """
    global _TEMPLATE_CACHE, _TEMPLATE_MTIME
    ui_dist_path = Path(__file__).parent / "ui" / "dist" / "index.html"
    dist_path = Path(__file__).parent / "dist" / "index.html"

    # Pick whichever exists (prefer dist_path in prod, ui_dist_path in dev)
    if _DEV_MODE and ui_dist_path.exists():
        tpl_path = ui_dist_path
    elif dist_path.exists():
        tpl_path = dist_path
    elif ui_dist_path.exists():
        tpl_path = ui_dist_path
    else:
        tpl_path = None

    # Auto-build if dist is missing or any source file is newer than the build output
    ui_dir = Path(__file__).parent / "ui"
    needs_build = tpl_path is None
    if not needs_build and ui_dir.exists():
        src_dir = ui_dir / "src"
        if src_dir.is_dir():
            build_mtime = tpl_path.stat().st_mtime
            needs_build = any(
                f.stat().st_mtime > build_mtime
                for f in src_dir.rglob("*") if f.is_file()
            )

    if needs_build and (ui_dir / "package.json").exists():
        import subprocess
        try:
            if not (ui_dir / "node_modules").exists():
                subprocess.run(["npm", "install"], cwd=ui_dir, check=True,
                               capture_output=True, timeout=120)
            subprocess.run(["npm", "run", "build"], cwd=ui_dir, check=True,
                           capture_output=True, timeout=60)
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            pass
        # Re-check after build
        if dist_path.exists():
            tpl_path = dist_path
        elif ui_dist_path.exists():
            tpl_path = ui_dist_path

    if tpl_path is None:
        raise FileNotFoundError(
            "Dashboard not found. Run 'npm install && npm run build' in "
            f"{Path(__file__).parent / 'ui'}"
        )

    # Reload if file changed on disk (one stat() call — negligible cost)
    mtime = tpl_path.stat().st_mtime
    if _TEMPLATE_CACHE is None or mtime != _TEMPLATE_MTIME:
        _TEMPLATE_CACHE = tpl_path.read_text(encoding="utf-8")
        _TEMPLATE_MTIME = mtime

    return _TEMPLATE_CACHE
