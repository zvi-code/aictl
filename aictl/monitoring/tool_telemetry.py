# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tool-specific telemetry parsers driven by telemetry-sources.yaml.

Each tool's parser reads native session/stats files to extract verified
token usage data.  The YAML schema defines tool name, source_id,
confidence, and state directory; the parser handles the tool-specific
JSON structure.

Parsers are registered in _PARSER_REGISTRY by tool name.
collect_tool_telemetry() iterates over YAML entries and dispatches
to the registered parser — no hardcoded tool names in the collection
loop.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from ..platforms import claude_global_dir, claude_projects_dir, codex_global_dir, cursor_user_dir
from ..fsutil import safe_iterdir, safe_glob
from ..data.schema import load_telemetry_sources

log = logging.getLogger(__name__)


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


# ─── Agent team detection (file-based) ──────────────────────────


def scan_agent_teams(root: Path) -> list[dict]:
    """Scan Claude Code session directories for subagent JSONL files.

    Returns a list of session dicts, each with agent metadata extracted
    from the first line of each ``subagents/agent-*.jsonl`` file.
    This is authoritative — one file per agent, with identity, model,
    and token data.
    """
    projects_dir = claude_projects_dir()
    if not projects_dir.is_dir():
        return []

    results: list[dict] = []
    cutoff = time.time() - 7 * 86400  # last 7 days

    for proj_dir in safe_iterdir(projects_dir):
        if not proj_dir.is_dir():
            continue
        for sess_dir in safe_iterdir(proj_dir):
            if not sess_dir.is_dir():
                continue
            subagents_dir = sess_dir / "subagents"
            if not subagents_dir.is_dir():
                continue
            try:
                if subagents_dir.stat().st_mtime < cutoff:
                    continue
            except OSError:
                continue

            agents: list[dict] = []
            for jf in safe_glob(subagents_dir, "agent-*.jsonl"):
                agent = _parse_agent_file(jf)
                if agent:
                    agents.append(agent)

            if agents:
                _disambiguate_conversations(agents)
                total_in = sum(a["input_tokens"] for a in agents)
                total_out = sum(a["output_tokens"] for a in agents)
                all_tools = sorted(set(t for a in agents for t in a["tools_used"]))
                models = {}
                for a in agents:
                    m = a.get("model") or "unknown"
                    models[m] = models.get(m, 0) + 1
                results.append({
                    "session_id": sess_dir.name,
                    "project_dir": proj_dir.name,
                    "agent_count": len(agents),
                    "total_input_tokens": total_in,
                    "total_output_tokens": total_out,
                    "total_messages": sum(a["messages"] for a in agents),
                    "tools_used": all_tools,
                    "models": models,
                    "agents": agents,
                })

    return results


def _parse_agent_file(path: Path) -> dict | None:
    """Parse an agent JSONL file to extract identity, work summary, and cost.

    Reads the full file to extract:
    - Identity: agentId, slug, model, session, cwd, branch
    - Task: the first user message (prompt given to the agent)
    - Token usage: input, output, cache read/creation totals
    - Tools: set of tools the agent called
    - Duration: first to last timestamp
    - Message count: total messages exchanged
    - Outcome: whether the agent completed (has a final assistant message)
    """
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return None
    if not lines:
        return None

    # Parse first line for identity
    try:
        first = json.loads(lines[0])
    except json.JSONDecodeError:
        return None

    result = {
        "agent_id": first.get("agentId", ""),
        "slug": first.get("slug", ""),
        "model": "",
        "session_id": first.get("sessionId", ""),
        "is_sidechain": first.get("isSidechain", False),
        "cwd": first.get("cwd", ""),
        "branch": first.get("gitBranch", ""),
        # Work summary
        "task": "",
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_read_tokens": 0,
        "cache_creation_tokens": 0,
        "tools_used": [],
        "messages": len(lines),
        "started_at": first.get("timestamp", ""),
        "ended_at": "",
        "completed": False,
    }

    tools = set()
    tool_use_count = 0
    last_type = ""
    for line in lines:
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue

        msg_type = obj.get("type", "")
        last_type = msg_type
        result["ended_at"] = obj.get("timestamp", result["ended_at"])
        msg = obj.get("message", {})
        if not isinstance(msg, dict):
            continue

        # Model (from assistant messages)
        if msg.get("model") and not result["model"]:
            result["model"] = msg["model"]

        # Token usage (cumulative from usage fields)
        usage = msg.get("usage", {})
        if usage:
            result["input_tokens"] += int(usage.get("input_tokens", 0))
            result["output_tokens"] += int(usage.get("output_tokens", 0))
            result["cache_read_tokens"] += int(usage.get("cache_read_input_tokens", 0))
            result["cache_creation_tokens"] += int(usage.get("cache_creation_input_tokens", 0))

        # Task (first user message content)
        if msg_type == "user" and not result["task"]:
            content = msg.get("content", "")
            if isinstance(content, str):
                result["task"] = content[:200]
            elif isinstance(content, list):
                for c in content:
                    if isinstance(c, dict) and c.get("type") == "text":
                        result["task"] = (c.get("text") or "")[:200]
                        break

        # Tools used (from tool_use content blocks)
        content = msg.get("content", [])
        if isinstance(content, list):
            for c in content:
                if isinstance(c, dict) and c.get("type") == "tool_use":
                    tools.add(c.get("name", ""))
                    tool_use_count += 1

    result["tools_used"] = sorted(tools)
    result["tool_use_count"] = tool_use_count
    result["completed"] = last_type == "assistant"
    return result


# ─── Conversation disambiguation ────────────────────────────────


def _parse_iso_ts(ts_str: str) -> float:
    """Parse an ISO 8601 timestamp to epoch seconds.  Returns 0.0 on failure."""
    if not ts_str:
        return 0.0
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.timestamp()
    except (ValueError, TypeError):
        return 0.0


def _disambiguate_conversations(agents: list[dict]) -> None:
    """Add relationship metadata to agents based on temporal overlap analysis.

    For each agent in the list, sets:
      - ``relationship``: ``"primary"`` (first non-sidechain by start time),
        ``"sequential"`` (starts after all earlier non-sidechain agents end),
        ``"parallel"`` (overlaps with an earlier non-sidechain agent),
        or ``"sidechain"`` (``is_sidechain`` flag set).
      - ``parent_conversation_id``: ``None`` — stub for when Claude Code
        emits ``parent_conversation_id`` in SubagentStart hook events.

    Modifies *agents* in-place and re-sorts by start time.
    """
    if not agents:
        return

    for agent in agents:
        start = _parse_iso_ts(agent.get("started_at", ""))
        end = _parse_iso_ts(agent.get("ended_at", ""))
        agent["_start_epoch"] = start
        # If no end time, assume still running (infinite overlap window)
        agent["_end_epoch"] = end if end > 0 else float("inf")
        # Stub — Claude Code does not yet emit parent_conversation_id
        agent["parent_conversation_id"] = None

    agents.sort(key=lambda a: a["_start_epoch"])

    for i, agent in enumerate(agents):
        if agent.get("is_sidechain"):
            agent["relationship"] = "sidechain"
            continue

        if i == 0 or all(
            agents[j].get("is_sidechain") for j in range(i)
        ):
            # First non-sidechain agent is the primary
            agent["relationship"] = "primary"
            continue

        overlaps = any(
            agent["_start_epoch"] < agents[j]["_end_epoch"]
            for j in range(i)
            if not agents[j].get("is_sidechain")
        )
        agent["relationship"] = "parallel" if overlaps else "sequential"

    # Clean up temporary fields
    for agent in agents:
        agent.pop("_start_epoch", None)
        agent.pop("_end_epoch", None)


# ─── Claude Code ────────────────────────────────────────────────


def parse_claude_telemetry(root: Path, tool: str = "claude-code",
                           source: str = "stats-cache",
                           confidence: float = 0.95) -> ToolTelemetryReport | None:
    """Parse Claude Code telemetry from stats-cache.json + active session JSONL."""
    report = ToolTelemetryReport(tool=tool, source=source, confidence=confidence)

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
    root_slug = str(root.resolve()).replace("\\", "/").replace("/", "-").lstrip("-")
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


def parse_copilot_telemetry(tool: str = "copilot-cli",
                            source: str = "events-jsonl",
                            confidence: float = 0.90) -> ToolTelemetryReport | None:
    """Parse GitHub Copilot CLI telemetry from session-state events.jsonl files."""
    session_dir = Path.home() / ".copilot" / "session-state"
    if not session_dir.is_dir():
        return None

    report = ToolTelemetryReport(tool=tool, source=source, confidence=confidence)

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


def parse_codex_telemetry(tool: str = "codex-cli",
                          source: str = "token-count",
                          confidence: float = 0.85) -> ToolTelemetryReport | None:
    """Parse OpenAI Codex CLI telemetry from session JSONL files."""
    sessions_dir = codex_global_dir() / "sessions"
    if not sessions_dir.is_dir():
        return None

    report = ToolTelemetryReport(tool=tool, source=source, confidence=confidence)

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


# ─── Cursor (SQLite state.vscdb) ─────────────────────────────────


def parse_cursor_telemetry(tool: str = "cursor",
                           source: str = "state-vscdb",
                           confidence: float = 0.70) -> ToolTelemetryReport | None:
    """Parse Cursor telemetry from state.vscdb SQLite database.

    Cursor stores session/usage state in a vscdb (SQLite) database in
    its globalStorage directory.  We read token counters and model info
    from the ``ItemTable`` key-value store.
    """
    import sqlite3

    vscdb = cursor_user_dir() / "globalStorage" / "state.vscdb"
    if not vscdb.is_file():
        return None

    report = ToolTelemetryReport(tool=tool, source=source, confidence=confidence)

    try:
        # On Windows, VS Code/Cursor holds an exclusive lock on the vscdb.
        # Copy to temp file to avoid "file handle in use" errors.
        import platform
        if platform.system() == "Windows":
            import shutil, tempfile
            tmp = Path(tempfile.gettempdir()) / f"aictl-{tool}-state.vscdb"
            try:
                shutil.copy2(vscdb, tmp)
            except (OSError, PermissionError) as exc:
                log.debug("cursor vscdb copy failed: %s", exc)
                return None
            db_path = str(tmp)
        else:
            db_path = f"file:{vscdb}?mode=ro"
        conn = sqlite3.connect(db_path if "file:" in db_path else db_path,
                               uri="file:" in db_path, timeout=3)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                "SELECT key, value FROM ItemTable WHERE key LIKE '%usage%' "
                "OR key LIKE '%token%' OR key LIKE '%cost%' OR key LIKE '%model%' "
                "OR key LIKE '%session%' OR key LIKE '%copilot%'"
            ).fetchall()
        except sqlite3.OperationalError:
            # Table doesn't exist or schema is different
            conn.close()
            return None

        for row in rows:
            key, raw = row["key"], row["value"]
            if not raw:
                continue
            try:
                val = json.loads(raw) if isinstance(raw, str) and raw.startswith(("{", "[", '"')) else raw
            except (json.JSONDecodeError, TypeError):
                val = raw

            if not isinstance(val, dict):
                continue

            # Extract token data from any nested usage dict
            for usage_key in ("usage", "tokenUsage", "token_usage"):
                usage = val.get(usage_key, {})
                if isinstance(usage, dict):
                    inp = int(usage.get("inputTokens", 0) or usage.get("input_tokens", 0) or 0)
                    out = int(usage.get("outputTokens", 0) or usage.get("output_tokens", 0) or 0)
                    if inp or out:
                        report.input_tokens += inp
                        report.output_tokens += out

            # Extract model info
            model = val.get("model", "") or val.get("modelId", "")
            if model and model not in report.by_model:
                report.by_model[model] = {"input_tokens": 0, "output_tokens": 0}

        conn.close()
    except (sqlite3.Error, OSError) as exc:
        log.debug("cursor vscdb: %s", exc)
        return None

    if report.input_tokens or report.output_tokens:
        return report
    return None


# ─── Continue IDE Extension ──────────────────────────────────────


def _continue_sessions_dir() -> Path:
    """Continue extension session directory."""
    return Path.home() / ".continue" / "sessions"


def parse_continue_telemetry(tool: str = "continue",
                             source: str = "session-json",
                             confidence: float = 0.75) -> ToolTelemetryReport | None:
    """Parse Continue IDE extension telemetry from session JSON files.

    Continue stores session data as ``~/.continue/sessions/{uuid}.json``
    with message objects containing token usage.
    """
    sessions_dir = _continue_sessions_dir()
    if not sessions_dir.is_dir():
        return None

    report = ToolTelemetryReport(tool=tool, source=source, confidence=confidence)

    cutoff = time.time() - 7 * 86400
    session_files = []
    for jf in sessions_dir.glob("*.json"):
        try:
            if jf.stat().st_mtime >= cutoff:
                session_files.append(jf)
        except OSError:
            continue

    session_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    for sess_file in session_files[:20]:
        report.total_sessions += 1
        _parse_continue_session(sess_file, report)

    if report.input_tokens or report.output_tokens:
        return report
    return None


def _parse_continue_session(sess_file: Path, report: ToolTelemetryReport) -> None:
    """Parse a single Continue session JSON for token data."""
    try:
        data = json.loads(sess_file.read_text(errors="replace"))
    except (json.JSONDecodeError, OSError):
        return

    if not isinstance(data, dict):
        return

    # Continue sessions have a "history" or "messages" array
    messages = data.get("history", data.get("messages", []))
    if not isinstance(messages, list):
        return

    for msg in messages:
        if not isinstance(msg, dict):
            continue
        report.total_messages += 1

        # Token usage can be in .usage, .tokenCount, or .promptTokens/.completionTokens
        usage = msg.get("usage", {})
        if isinstance(usage, dict):
            report.input_tokens += int(usage.get("inputTokens", 0) or usage.get("input_tokens", 0)
                                       or usage.get("promptTokens", 0) or usage.get("prompt_tokens", 0) or 0)
            report.output_tokens += int(usage.get("outputTokens", 0) or usage.get("output_tokens", 0)
                                        or usage.get("completionTokens", 0) or usage.get("completion_tokens", 0) or 0)

        # Direct token fields on message
        for inp_key in ("promptTokens", "prompt_tokens", "inputTokens", "input_tokens"):
            if inp_key in msg:
                report.input_tokens += int(msg[inp_key] or 0)
                break
        for out_key in ("completionTokens", "completion_tokens", "outputTokens", "output_tokens"):
            if out_key in msg:
                report.output_tokens += int(msg[out_key] or 0)
                break

        # Model info
        model = msg.get("model", "") or msg.get("modelTitle", "")
        if model and model not in report.by_model:
            report.by_model[model] = {"input_tokens": 0, "output_tokens": 0}


# ─── Public API ─────────────────────────────────────────────────


# ─── Parser registry (tool name → parser function) ──────────────
# Parsers receive (root, tool, source, confidence) from YAML config.
# The root param is the project root (only used by claude parser).

_PARSER_REGISTRY: dict[str, Callable] = {}


def _register_parser(tool: str) -> Callable:
    """Decorator to register a telemetry parser for a tool name."""
    def decorator(fn: Callable) -> Callable:
        _PARSER_REGISTRY[tool] = fn
        return fn
    return decorator


# Register existing parsers
_PARSER_REGISTRY["claude-code"] = parse_claude_telemetry
_PARSER_REGISTRY["copilot-cli"] = parse_copilot_telemetry
_PARSER_REGISTRY["codex-cli"] = parse_codex_telemetry
_PARSER_REGISTRY["cursor"] = parse_cursor_telemetry
_PARSER_REGISTRY["continue"] = parse_continue_telemetry


def collect_tool_telemetry(root: Path) -> list[ToolTelemetryReport]:
    """Collect telemetry from all tools defined in telemetry-sources.yaml.

    Iterates YAML entries, dispatches to registered parsers.
    Tool names, source IDs, and confidence levels come from YAML.
    Safe — never raises.
    """
    sources = load_telemetry_sources()
    reports = []
    for tool_name, config in sources.items():
        parser = _PARSER_REGISTRY.get(tool_name)
        if parser is None:
            log.debug("No parser registered for tool %s", tool_name)
            continue
        try:
            # Build kwargs from YAML config
            kwargs = {
                "tool": tool_name,
                "source": config.get("source_id", "unknown"),
                "confidence": config.get("confidence", 0.5),
            }
            # Claude parser needs root param
            import inspect
            sig = inspect.signature(parser)
            if "root" in sig.parameters:
                kwargs["root"] = root
            report = parser(**kwargs)
            if report:
                reports.append(report)
        except Exception:
            pass  # Never crash the dashboard for telemetry
    return reports
