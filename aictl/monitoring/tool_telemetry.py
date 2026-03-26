"""Tool-specific telemetry parsers for Claude Code, Copilot CLI, and Codex CLI.

Each parser reads native session/stats files to extract verified token usage data.
This produces higher-confidence token estimates (0.90-0.95) than the generic
StructuredTelemetryCollector (which relies on pattern matching) or network
inference (0.1-0.4).

Results are integrated into DashboardSnapshot as `tool_telemetry` dicts.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path

from ..platforms import claude_global_dir, claude_projects_dir, codex_global_dir


@dataclass
class ToolTelemetryReport:
    """Aggregated telemetry for one AI tool."""

    tool: str
    source: str  # "stats-cache" | "session-jsonl" | "events-jsonl" | "token-count"
    confidence: float = 0.0

    # Token totals (lifetime or session)
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0

    # Session info
    total_sessions: int = 0
    total_messages: int = 0

    # Model breakdown: {model_name: {input_tokens, output_tokens, ...}}
    by_model: dict = field(default_factory=dict)

    # Daily: [{date, tokens_by_model: {model: count}}]
    daily: list = field(default_factory=list)

    # Cost (if available)
    cost_usd: float = 0.0

    # Active session token counts (from live JSONL)
    active_session_input: int = 0
    active_session_output: int = 0
    active_session_messages: int = 0

    # Errors and operational health
    errors: list[dict] = field(default_factory=list)
    # Each: {"type": "overloaded"|"rate_limit"|"timeout"|"api_error"|"shutdown_error",
    #        "message": str, "timestamp": str, "model": str}

    quota_state: dict = field(default_factory=dict)
    # {"premium_requests_used": int, "total_api_duration_ms": int,
    #  "code_changes": {"lines_added": int, "lines_removed": int, "files_modified": int}}

    def to_dict(self) -> dict:
        return {
            "tool": self.tool,
            "source": self.source,
            "confidence": self.confidence,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_read_tokens": self.cache_read_tokens,
            "cache_creation_tokens": self.cache_creation_tokens,
            "total_sessions": self.total_sessions,
            "total_messages": self.total_messages,
            "by_model": self.by_model,
            "daily": self.daily[-7:],  # Last 7 days only
            "cost_usd": self.cost_usd,
            "active_session_input": self.active_session_input,
            "active_session_output": self.active_session_output,
            "active_session_messages": self.active_session_messages,
            "errors": self.errors[-20:],  # Last 20 errors
            "quota_state": self.quota_state,
        }


# ─── Claude Code ────────────────────────────────────────────────


def parse_claude_telemetry(root: Path) -> ToolTelemetryReport | None:
    """Parse Claude Code telemetry from stats-cache.json + active session JSONL."""
    report = ToolTelemetryReport(tool="claude-code", source="stats-cache", confidence=0.95)

    # 1. Aggregated stats from stats-cache.json
    stats_file = claude_global_dir() / "stats-cache.json"
    if stats_file.is_file():
        try:
            data = json.loads(stats_file.read_text(errors="replace"))
            report.total_sessions = int(data.get("totalSessions", 0))
            report.total_messages = int(data.get("totalMessages", 0))

            model_usage = data.get("modelUsage", {})
            for model, usage in model_usage.items():
                inp = int(usage.get("inputTokens", 0))
                out = int(usage.get("outputTokens", 0))
                cr = int(usage.get("cacheReadInputTokens", 0))
                cc = int(usage.get("cacheCreationInputTokens", 0))
                cost = float(usage.get("costUSD", 0))
                report.input_tokens += inp
                report.output_tokens += out
                report.cache_read_tokens += cr
                report.cache_creation_tokens += cc
                report.cost_usd += cost
                report.by_model[model] = {
                    "input_tokens": inp,
                    "output_tokens": out,
                    "cache_read_tokens": cr,
                    "cache_creation_tokens": cc,
                    "cost_usd": cost,
                }

            # Daily token data
            daily_tokens = data.get("dailyModelTokens", [])
            if isinstance(daily_tokens, list):
                for entry in daily_tokens:
                    if isinstance(entry, dict) and "date" in entry:
                        report.daily.append({
                            "date": entry["date"],
                            "tokens_by_model": entry.get("tokensByModel", {}),
                        })
        except (json.JSONDecodeError, OSError, KeyError):
            pass

    # 2. Active session — find the most recent JSONL for this project
    _parse_claude_active_session(root, report)

    if report.input_tokens or report.output_tokens or report.active_session_input:
        return report
    return None


# Error pattern keywords for scanning session content
_ERROR_PATTERNS = {
    "overloaded": "overloaded",
    "rate_limit": "rate_limit",
    "rate limit": "rate_limit",
    "429": "rate_limit",
    "capacity": "overloaded",
    "quota": "quota",
    "timeout": "timeout",
    "timed out": "timeout",
}


def _parse_claude_active_session(root: Path, report: ToolTelemetryReport) -> None:
    """Parse the most recent Claude Code session JSONL for active token counts and errors."""
    projects_dir = claude_projects_dir()
    if not projects_dir.is_dir():
        return

    # Find the project directory matching root
    root_slug = str(root.resolve()).replace("/", "-").lstrip("-")
    proj_dir = projects_dir / root_slug
    if not proj_dir.is_dir():
        return

    # Find the most recently modified JSONL
    jsonl_files = sorted(
        (f for f in proj_dir.glob("*.jsonl") if f.is_file()),
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )
    if not jsonl_files:
        return

    latest = jsonl_files[0]
    # Only parse if modified recently (within 30 minutes — likely active)
    if time.time() - latest.stat().st_mtime > 1800:
        return

    # Read last 500 lines (tail) to catch errors + recent tokens
    try:
        text = latest.read_text(errors="replace")
        lines = text.splitlines()
        tail = lines[-500:] if len(lines) > 500 else lines
        for line in tail:
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            obj_type = obj.get("type", "")

            # Claude JSONL: assistant messages have .message.usage
            msg = obj.get("message", {})
            usage = msg.get("usage") if isinstance(msg, dict) else None
            if usage and isinstance(usage, dict):
                report.active_session_input += int(usage.get("input_tokens", 0))
                report.active_session_output += int(usage.get("output_tokens", 0))
                report.active_session_messages += 1

            # Error detection: check for API errors in system messages and error responses
            _detect_claude_errors(obj, obj_type, report)

    except OSError:
        pass


def _detect_claude_errors(obj: dict, obj_type: str, report: ToolTelemetryReport) -> None:
    """Detect API errors, overloaded states, and rate limits in Claude session entries."""
    timestamp = obj.get("timestamp", "")
    model = ""

    # Check message content for error patterns
    msg = obj.get("message", {})
    if isinstance(msg, dict):
        model = msg.get("model", "")
        error_obj = msg.get("error", {})
        if isinstance(error_obj, dict) and error_obj.get("type"):
            report.errors.append({
                "type": error_obj["type"],
                "message": str(error_obj.get("message", ""))[:200],
                "timestamp": timestamp,
                "model": model,
            })
            return

    # Check for error in toolUseResult
    tool_result = obj.get("toolUseResult", "")
    if isinstance(tool_result, str) and tool_result.startswith("Error:"):
        # Tool errors are common and not API issues — skip
        pass

    # Scan serialized content for API-level error patterns
    if obj_type in ("system", "progress"):
        content = json.dumps(obj).lower()
        for pattern, error_type in _ERROR_PATTERNS.items():
            if pattern in content:
                report.errors.append({
                    "type": error_type,
                    "message": f"Detected '{pattern}' in {obj_type} event",
                    "timestamp": timestamp,
                    "model": model,
                })
                break  # One error per entry


# ─── Copilot CLI ────────────────────────────────────────────────


def parse_copilot_telemetry() -> ToolTelemetryReport | None:
    """Parse GitHub Copilot CLI telemetry from session-state events.jsonl files."""
    session_dir = Path.home() / ".copilot" / "session-state"
    if not session_dir.is_dir():
        return None

    report = ToolTelemetryReport(tool="copilot-cli", source="events-jsonl", confidence=0.90)

    # Find recent session directories (modified in last 7 days)
    cutoff = time.time() - 7 * 86400
    sessions = sorted(
        (d for d in session_dir.iterdir() if d.is_dir()),
        key=lambda d: d.stat().st_mtime,
        reverse=True,
    )

    for sess_dir in sessions[:10]:  # Max 10 most recent sessions
        events_file = sess_dir / "events.jsonl"
        if not events_file.is_file():
            continue
        try:
            if events_file.stat().st_mtime < cutoff:
                continue
        except OSError:
            continue

        report.total_sessions += 1
        _parse_copilot_events(events_file, report)

    if report.input_tokens or report.output_tokens:
        return report
    return None


def _parse_copilot_events(events_file: Path, report: ToolTelemetryReport) -> None:
    """Parse a single Copilot CLI events.jsonl for token data, metrics, and errors."""
    try:
        text = events_file.read_text(errors="replace")
        for line in text.splitlines():
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            event_type = obj.get("type", "")
            data = obj.get("data", {}) if isinstance(obj.get("data"), dict) else {}
            timestamp = obj.get("timestamp", "")

            # assistant.message has outputTokens (under data)
            if event_type == "assistant.message":
                out_tok = int(data.get("outputTokens", 0))
                report.output_tokens += out_tok
                report.total_messages += 1

            # session.shutdown has comprehensive modelMetrics
            elif event_type == "session.shutdown":
                shutdown_type = data.get("shutdownType", "routine")

                # Error detection: non-routine shutdowns
                if shutdown_type != "routine":
                    report.errors.append({
                        "type": "shutdown_error",
                        "message": f"Session shutdown: {shutdown_type}",
                        "timestamp": timestamp,
                        "model": data.get("currentModel", ""),
                    })

                # Quota/operational state
                premium = int(data.get("totalPremiumRequests", 0))
                api_dur = int(data.get("totalApiDurationMs", 0))
                code_changes = data.get("codeChanges", {})
                if premium or api_dur or code_changes:
                    report.quota_state = {
                        "premium_requests_used": report.quota_state.get("premium_requests_used", 0) + premium,
                        "total_api_duration_ms": report.quota_state.get("total_api_duration_ms", 0) + api_dur,
                        "current_model": data.get("currentModel", ""),
                    }
                    if isinstance(code_changes, dict) and any(code_changes.values()):
                        report.quota_state["code_changes"] = {
                            "lines_added": int(code_changes.get("linesAdded", 0)),
                            "lines_removed": int(code_changes.get("linesRemoved", 0)),
                            "files_modified": len(code_changes.get("filesModified", [])),
                        }

                # Timeout detection: API duration > 30s per request suggests timeouts
                metrics = data.get("modelMetrics", {})
                for model, model_data in metrics.items():
                    usage = model_data.get("usage", {})
                    inp = int(usage.get("inputTokens", 0))
                    out = int(usage.get("outputTokens", 0))
                    cr = int(usage.get("cacheReadTokens", 0))
                    cw = int(usage.get("cacheWriteTokens", 0))
                    report.input_tokens += inp
                    report.cache_read_tokens += cr
                    report.cache_creation_tokens += cw

                    if model not in report.by_model:
                        report.by_model[model] = {
                            "input_tokens": 0, "output_tokens": 0,
                            "cache_read_tokens": 0, "requests": 0, "cost_usd": 0.0,
                        }
                    report.by_model[model]["input_tokens"] += inp
                    report.by_model[model]["output_tokens"] += out
                    report.by_model[model]["cache_read_tokens"] += cr

                    req_data = model_data.get("requests", {})
                    req_count = int(req_data.get("count", 0))
                    cost = float(req_data.get("cost", 0))
                    report.by_model[model]["requests"] += req_count
                    report.by_model[model]["cost_usd"] += cost
                    report.cost_usd += cost

                    # Detect potential timeouts: high latency per request
                    if req_count > 0 and api_dur > 0:
                        avg_ms = api_dur / req_count
                        if avg_ms > 30000:  # >30s per request
                            report.errors.append({
                                "type": "timeout",
                                "message": f"High avg API latency: {avg_ms/1000:.1f}s/req ({model})",
                                "timestamp": timestamp,
                                "model": model,
                            })

            # tool.execution_complete: track tool usage
            elif event_type == "tool.execution_complete":
                tool_name = data.get("toolName", "")
                duration = int(data.get("durationMs", 0))
                if tool_name and duration > 60000:  # >60s tool execution
                    report.errors.append({
                        "type": "timeout",
                        "message": f"Slow tool: {tool_name} ({duration/1000:.1f}s)",
                        "timestamp": timestamp,
                        "model": "",
                    })

    except OSError:
        pass


# ─── Codex CLI ──────────────────────────────────────────────────


def parse_codex_telemetry() -> ToolTelemetryReport | None:
    """Parse OpenAI Codex CLI telemetry from session JSONL files."""
    sessions_dir = codex_global_dir() / "sessions"
    if not sessions_dir.is_dir():
        return None

    report = ToolTelemetryReport(tool="codex-cli", source="token-count", confidence=0.95)

    # Find recent session files (last 7 days)
    cutoff = time.time() - 7 * 86400
    session_files = []
    for jsonl in sessions_dir.rglob("*.jsonl"):
        try:
            if jsonl.stat().st_mtime >= cutoff:
                session_files.append(jsonl)
        except OSError:
            continue

    session_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    for sess_file in session_files[:10]:  # Max 10 most recent
        report.total_sessions += 1
        _parse_codex_session(sess_file, report)

    if report.input_tokens or report.output_tokens:
        return report
    return None


def _parse_codex_session(sess_file: Path, report: ToolTelemetryReport) -> None:
    """Parse a single Codex CLI session JSONL for token_count events."""
    try:
        text = sess_file.read_text(errors="replace")
        last_total = None
        for line in text.splitlines():
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            # Codex events: {"type": "event_msg", "payload": {"type": "token_count", ...}}
            if obj.get("type") == "event_msg":
                payload = obj.get("payload", {})
                if payload.get("type") == "token_count":
                    total_usage = payload.get("total_token_usage", {})
                    if total_usage:
                        last_total = total_usage
                        report.total_messages += 1

            # Also check for session_meta to get model info
            elif obj.get("type") == "session_meta":
                payload = obj.get("payload", {}) if isinstance(obj.get("payload"), dict) else {}
                model = payload.get("model", "") or payload.get("model_provider", "")
                if model and model not in report.by_model:
                    report.by_model[model] = {"input_tokens": 0, "output_tokens": 0}

        # Use the last cumulative total (most accurate)
        if last_total:
            inp = int(last_total.get("input_tokens", 0))
            out = int(last_total.get("output_tokens", 0))
            cached = int(last_total.get("cached_input_tokens", 0))
            reasoning = int(last_total.get("reasoning_output_tokens", 0))
            report.input_tokens += inp
            report.output_tokens += out
            report.cache_read_tokens += cached
            # Distribute to model if known
            for model in report.by_model:
                report.by_model[model]["input_tokens"] += inp
                report.by_model[model]["output_tokens"] += out

    except OSError:
        pass


# ─── Public API ─────────────────────────────────────────────────


def collect_tool_telemetry(root: Path) -> list[ToolTelemetryReport]:
    """Collect telemetry from all supported AI tools. Safe — never raises."""
    reports = []
    for parser in (
        lambda: parse_claude_telemetry(root),
        parse_copilot_telemetry,
        parse_codex_telemetry,
    ):
        try:
            report = parser()
            if report:
                reports.append(report)
        except Exception:
            pass  # Never crash the dashboard for telemetry
    return reports
