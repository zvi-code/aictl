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

import itertools
import json
import logging
import re
import sqlite3
import time
from collections import Counter
from collections.abc import Callable, Iterator
from dataclasses import asdict, dataclass, field
from pathlib import Path

from ..data.model_pricing import cost_usd as usd_cost_of
from ..data.provenance import COPILOT_COST_REASON
from ..data.schema import load_telemetry_sources
from ..fsutil import safe_glob, safe_iterdir
from ..ingesters._common import open_readonly
from ..platforms import (
    IS_WINDOWS,
    claude_global_dir,
    claude_projects_dir,
    codex_global_dir,
    cursor_user_dir,
)

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

    # Provenance of the headline numbers above (see aictl.data.provenance).
    # token_quality: "exact" | "partial". cost_quality: "reported" | "unknown"
    # | "estimated". as_of: last date a cached source was computed, if any.
    token_quality: str = "exact"
    cost_quality: str = "unknown"
    cost_reason: str = ""
    as_of: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        d["daily"] = d["daily"][-7:]  # last 7 days only
        d["errors"] = d["errors"][-20:]  # last 20 errors
        return d


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
                agent = _parse_agent_file_cached(jf)
                if agent:
                    agents.append(agent)

            if agents:
                _disambiguate_conversations(agents)
                total_in = sum(a["input_tokens"] for a in agents)
                total_out = sum(a["output_tokens"] for a in agents)
                all_tools = sorted(set(t for a in agents for t in a["tools_used"]))
                models = dict(Counter(a.get("model") or "unknown" for a in agents))
                results.append(
                    {
                        "session_id": sess_dir.name,
                        "project_dir": proj_dir.name,
                        "agent_count": len(agents),
                        "total_input_tokens": total_in,
                        "total_output_tokens": total_out,
                        "total_messages": sum(a["messages"] for a in agents),
                        "tools_used": all_tools,
                        "models": models,
                        "agents": agents,
                    }
                )

    return results


# path -> (mtime_ns, size, parsed). The scan runs every refresh and re-reading
# every transcript was 39% of daemon CPU; these files only grow.
_agent_file_cache: dict[str, tuple[int, int, dict | None]] = {}
_AGENT_FILE_CACHE_MAX = 5000


def _parse_agent_file_cached(path: Path) -> dict | None:
    """``_parse_agent_file`` with a stat-validated cache; returns a private copy."""
    try:
        st = path.stat()
    except OSError:
        return None
    key = str(path)
    hit = _agent_file_cache.get(key)
    if hit is None or hit[0] != st.st_mtime_ns or hit[1] != st.st_size:
        if len(_agent_file_cache) >= _AGENT_FILE_CACHE_MAX:
            _agent_file_cache.clear()
        hit = (st.st_mtime_ns, st.st_size, _parse_agent_file(path))
        _agent_file_cache[key] = hit
    # Callers set per-scan keys on the dict (conversation disambiguation).
    return dict(hit[2]) if hit[2] is not None else None


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
    # One line at a time: an agent file can be tens of MB, and the whole scan ran in one piece.
    try:
        fh = open(path, encoding="utf-8", errors="replace")
    except OSError:
        return None
    with fh:
        first_line = fh.readline()
        if not first_line:
            return None
        try:
            first = json.loads(first_line)
        except json.JSONDecodeError:
            return None
        return _parse_agent_lines(first, first_line, fh)


def _parse_agent_lines(first: dict, first_line: str, rest: Iterator[str]) -> dict:
    lines = itertools.chain([first_line], rest)
    messages = 0

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
        "messages": 0,
        "started_at": first.get("timestamp", ""),
        "ended_at": "",
        "completed": False,
    }

    tools = set()
    tool_use_count = 0
    last_type = ""
    turns: list[dict] = []
    for line in lines:
        messages += 1
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue

        msg_type = obj.get("type", "")
        last_type = msg_type
        line_ts = obj.get("timestamp", "")
        result["ended_at"] = line_ts or result["ended_at"]
        msg = obj.get("message", {})
        if not isinstance(msg, dict):
            continue

        # Model (from assistant messages)
        if msg.get("model") and not result["model"]:
            result["model"] = msg["model"]

        # Token usage (cumulative from usage fields)
        usage = msg.get("usage", {})
        if usage:
            in_tok = int(usage.get("input_tokens", 0))
            out_tok = int(usage.get("output_tokens", 0))
            cache_r = int(usage.get("cache_read_input_tokens", 0))
            cache_c = int(usage.get("cache_creation_input_tokens", 0))
            result["input_tokens"] += in_tok
            result["output_tokens"] += out_tok
            result["cache_read_tokens"] += cache_r
            result["cache_creation_tokens"] += cache_c

            # Per-turn request record (assistant messages with usage are API calls)
            if msg_type == "assistant":
                turns.append(
                    {
                        "source_ts": _parse_iso_ts(line_ts),
                        "model": msg.get("model", ""),
                        "input_tokens": in_tok,
                        "output_tokens": out_tok,
                        "cache_read_tokens": cache_r,
                        "cache_creation_tokens": cache_c,
                    }
                )

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
    result["turns"] = turns
    result["messages"] = messages
    return result


# ─── Conversation disambiguation ────────────────────────────────


def _parse_iso_ts(ts_str: str) -> float:
    """Parse an ISO 8601 timestamp to epoch seconds.  Returns 0.0 on failure."""
    if not ts_str or not isinstance(ts_str, str):
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

        if i == 0 or all(agents[j].get("is_sidechain") for j in range(i)):
            # First non-sidechain agent is the primary
            agent["relationship"] = "primary"
            continue

        overlaps = any(
            agent["_start_epoch"] < agents[j]["_end_epoch"] for j in range(i) if not agents[j].get("is_sidechain")
        )
        agent["relationship"] = "parallel" if overlaps else "sequential"

    # Clean up temporary fields
    for agent in agents:
        agent.pop("_start_epoch", None)
        agent.pop("_end_epoch", None)


# ─── Claude Code ────────────────────────────────────────────────


def parse_claude_telemetry(
    root: Path, tool: str = "claude-code", source: str = "stats-cache", confidence: float = 0.95
) -> ToolTelemetryReport | None:
    """Parse Claude Code telemetry from stats-cache.json + active session JSONL."""
    report = ToolTelemetryReport(tool=tool, source=source, confidence=confidence)

    # 1. Aggregated stats from stats-cache.json
    stats_file = claude_global_dir() / "stats-cache.json"
    if stats_file.is_file():
        try:
            data = json.loads(stats_file.read_text(encoding="utf-8", errors="replace"))
            report.total_sessions = int(data.get("totalSessions", 0))
            report.total_messages = int(data.get("totalMessages", 0))
            # Claude Code refreshes this cache rarely, so it can lag by months.
            report.as_of = str(data.get("lastComputedDate", "") or "")
            report.token_quality = "partial"
            report.cost_reason = "stats-cache records no cost for this plan"

            model_usage = data.get("modelUsage", {})
            for model, usage in model_usage.items():
                m = {
                    "input_tokens": int(usage.get("inputTokens", 0)),
                    "output_tokens": int(usage.get("outputTokens", 0)),
                    "cache_read_tokens": int(usage.get("cacheReadInputTokens", 0)),
                    "cache_creation_tokens": int(usage.get("cacheCreationInputTokens", 0)),
                    "cost_usd": float(usage.get("costUSD", 0)),
                }
                report.input_tokens += m["input_tokens"]
                report.output_tokens += m["output_tokens"]
                report.cache_read_tokens += m["cache_read_tokens"]
                report.cache_creation_tokens += m["cache_creation_tokens"]
                report.cost_usd += m["cost_usd"]
                if m["cost_usd"]:
                    report.cost_quality = "reported"
                    report.cost_reason = "stats-cache costUSD"
                report.by_model[model] = m

            # Daily token data
            daily_tokens = data.get("dailyModelTokens", [])
            if isinstance(daily_tokens, list):
                for entry in daily_tokens:
                    if isinstance(entry, dict) and "date" in entry:
                        report.daily.append(
                            {
                                "date": entry["date"],
                                "tokens_by_model": entry.get("tokensByModel", {}),
                            }
                        )
        except (json.JSONDecodeError, OSError, KeyError):
            pass

    # 2. Active session — find the most recent JSONL for this project
    _parse_claude_active_session(root, report)

    if report.input_tokens or report.output_tokens or report.active_session_input:
        return report
    return None


# Error pattern keywords for scanning session content
def _recent_files(
    directory: Path,
    pattern: str,
    *,
    days: int = 7,
    max_files: int = 10,
) -> list[Path]:
    """Return up to max_files files matching pattern, modified within days, newest first.

    Stats each entry exactly once and sorts on the cached mtime — files can
    vanish between the filter and the sort, and a second ``stat()`` on a
    deleted file would raise mid-scan.
    """
    cutoff = time.time() - days * 86400
    files: list[tuple[float, Path]] = []
    for f in directory.glob(pattern):
        try:
            mtime = f.stat().st_mtime
        except OSError:
            continue  # vanished mid-scan
        if mtime >= cutoff:
            files.append((mtime, f))
    files.sort(key=lambda pair: pair[0], reverse=True)
    return [f for _, f in files[:max_files]]


def _first_int(d: dict, *keys: str) -> int:
    """Return the first non-zero integer value from d for the given keys, or 0."""
    for key in keys:
        if v := d.get(key):
            return int(v)
    return 0


def _iter_jsonl(path: Path) -> Iterator[dict]:
    """Yield parsed JSON objects from a JSONL file. Never raises."""
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if line.strip():
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError:
                        pass
    except OSError:
        pass


# Whole words only: "429" also occurs inside ids and timestamps.
_ERROR_PATTERNS = {
    re.compile(pattern, re.IGNORECASE): error_type
    for pattern, error_type in (
        (r"\boverloaded\b", "overloaded"),
        (r"\brate[_ ]limit", "rate_limit"),
        (r"\b429\b", "rate_limit"),
        (r"\bcapacity\b", "overloaded"),
        (r"\bquota\b", "quota"),
        (r"\btimeout\b", "timeout"),
        (r"\btimed out\b", "timeout"),
    )
}

# How much of a session file's end is read, and how many other recent sessions
# are checked for errors. A live session can be hundreds of megabytes.
_CLAUDE_TAIL_BYTES = 4 * 1024 * 1024
_CLAUDE_RECENT_S = 1800
_CLAUDE_ERROR_SESSIONS = 10
_claude_error_cache: dict[Path, tuple[tuple[int, int], list[dict]]] = {}


def _tail_objects(path: Path) -> Iterator[dict]:
    """Parsed JSON lines from the end of a file, without reading the whole file."""
    try:
        with open(path, "rb") as fh:
            size = fh.seek(0, 2)
            start = max(0, size - _CLAUDE_TAIL_BYTES)
            fh.seek(start)
            if start:
                fh.readline()  # the first line read is cut short
            for line in fh:
                try:
                    obj = json.loads(line)
                except ValueError:
                    continue
                if isinstance(obj, dict):
                    yield obj
    except OSError:
        return


def _claude_session_errors(path: Path, st_key: tuple[int, int]) -> list[dict]:
    """API errors in one session file. Cached, since a finished session does not change."""
    cached = _claude_error_cache.get(path)
    if cached is not None and cached[0] == st_key:
        return cached[1]
    holder = ToolTelemetryReport(tool="", source="")
    for obj in _tail_objects(path):
        _detect_claude_errors(obj, str(obj.get("type", "")), holder)
    if len(_claude_error_cache) > 200:
        _claude_error_cache.clear()
    _claude_error_cache[path] = (st_key, holder.errors)
    return holder.errors


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

    # Find the most recently modified JSONL.  Stat once per entry — a file
    # deleted mid-scan must be skipped, not raise into the caller.
    jsonl_files: list[tuple[float, Path]] = []
    for f in proj_dir.glob("*.jsonl"):
        try:
            if f.is_file():
                jsonl_files.append((f.stat().st_mtime, f))
        except OSError:
            continue  # vanished mid-scan
    if not jsonl_files:
        return

    latest_mtime, latest = max(jsonl_files, key=lambda pair: pair[0])
    now = time.time()
    # Only parse if modified recently (within 30 minutes — likely active)
    if now - latest_mtime > _CLAUDE_RECENT_S:
        return

    # Several sessions can run at once, and an error in any of them matters.
    recent = sorted(
        (pair for pair in jsonl_files if now - pair[0] <= _CLAUDE_RECENT_S), key=lambda pair: pair[0], reverse=True
    )
    for mtime, path in recent[:_CLAUDE_ERROR_SESSIONS]:
        try:
            size = path.stat().st_size
        except OSError:
            continue
        report.errors.extend(_claude_session_errors(path, (int(mtime * 1000), size)))

    # Streaming writes one line per content block, each repeating the
    # message's usage. Keep the last per request; summing tripled output.
    requests: dict[tuple[str, str], dict] = {}
    for obj in _tail_objects(latest):
        msg = obj.get("message", {})
        usage = msg.get("usage") if isinstance(msg, dict) else None
        if usage and isinstance(usage, dict):
            key = (str(msg.get("id") or obj.get("uuid") or ""), str(obj.get("requestId") or ""))
            requests[key] = usage

    for usage in requests.values():
        report.active_session_input += int(usage.get("input_tokens", 0) or 0)
        report.active_session_output += int(usage.get("output_tokens", 0) or 0)
        report.active_session_messages += 1


def _detect_claude_errors(obj: dict, obj_type: str, report: ToolTelemetryReport) -> None:
    """Detect API errors, overloaded states, and rate limits in Claude session entries."""
    timestamp = obj.get("timestamp", "")
    model = ""

    # Check message content for error patterns
    msg = obj.get("message", {})
    if isinstance(msg, dict):
        model = msg.get("model", "")
        # The form this tool writes now: a placeholder assistant line marked as an API error.
        if obj.get("isApiErrorMessage"):
            report.errors.append(
                {
                    "type": str(obj.get("error") or "api_error"),
                    "message": _claude_text(msg.get("content"))[:200],
                    "timestamp": timestamp,
                    "model": model,
                }
            )
            return
        error_obj = msg.get("error", {})
        if isinstance(error_obj, dict) and error_obj.get("type"):
            report.errors.append(
                {
                    "type": error_obj["type"],
                    "message": str(error_obj.get("message", ""))[:200],
                    "timestamp": timestamp,
                    "model": model,
                }
            )
            return

    # Check for error in toolUseResult
    tool_result = obj.get("toolUseResult", "")
    if isinstance(tool_result, str) and tool_result.startswith("Error:"):
        # Tool errors are common and not API issues — skip
        pass

    # Scan what the event says for API-level error patterns. Not the whole event:
    # its ids and timestamps can contain "429", and tool output can say anything.
    if obj_type in ("system", "progress"):
        said = " ".join(
            str(obj[key]) for key in ("content", "message", "error", "subtype") if isinstance(obj.get(key), (str, dict))
        )
        for pattern, error_type in _ERROR_PATTERNS.items():
            if pattern.search(said):
                report.errors.append(
                    {
                        "type": error_type,
                        "message": f"Detected '{error_type}' in {obj_type} event",
                        "timestamp": timestamp,
                        "model": model,
                    }
                )
                break  # One error per entry


def _claude_text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(str(b.get("text") or "") for b in content if isinstance(b, dict))
    return ""


# ─── Copilot CLI ────────────────────────────────────────────────


_copilot_report_cache: dict[str, tuple[tuple, ToolTelemetryReport | None]] | None = None
_copilot_app_sessions_cache: tuple[tuple, set[str]] | None = None


def _copilot_app_session_ids(copilot_home: Path) -> set[str]:
    """Sessions the desktop app owns: rows of its ``data.db`` other than ``cli_session``.

    The same rule as the transcript usage reader, so both report one attribution.
    Only the two named columns are read: this file also holds a credential.
    """
    global _copilot_app_sessions_cache
    db_path = copilot_home / "data.db"
    try:
        st = db_path.stat()
    except OSError:
        return set()
    key = (str(db_path), st.st_mtime_ns, st.st_size)
    if _copilot_app_sessions_cache is not None and _copilot_app_sessions_cache[0] == key:
        return _copilot_app_sessions_cache[1]
    conn = open_readonly(db_path, "copilot telemetry")
    if conn is None:
        return set()
    try:
        ids = {str(r[0]) for r in conn.execute("SELECT id FROM sessions WHERE session_type != 'cli_session'")}
    except sqlite3.Error as exc:
        log.debug("copilot telemetry: cannot read app sessions: %s", exc)
        return set()
    finally:
        conn.close()
    _copilot_app_sessions_cache = (key, ids)
    return ids


def parse_copilot_telemetry(
    root: Path | None = None, tool: str = "copilot-cli", source: str = "events-jsonl", confidence: float = 0.90
) -> ToolTelemetryReport | None:
    """Parse Copilot telemetry from session-state events.jsonl files.

    The CLI and the desktop app share this directory. *tool* selects which of the
    two sessions to read, ``copilot-cli`` or ``copilot-desktop``.
    """
    from ..platforms import copilot_global_dir, copilot_session_dir

    copilot_home = copilot_global_dir()
    session_dir = copilot_session_dir()
    if not session_dir.is_dir():
        return None
    app_ids = _copilot_app_session_ids(copilot_home)
    want_app = tool == "copilot-desktop"

    report = ToolTelemetryReport(tool=tool, source=source, confidence=confidence)
    # At most 10 sessions from 7 days: a sample, not a total. /api/usage has totals.
    report.token_quality = "partial"

    # Find recent session directories (modified in last 7 days).
    # Stat once per entry and sort on the cached value — directories can
    # vanish between iterdir() and a later stat().
    cutoff = time.time() - 7 * 86400
    candidates: list[tuple[float, Path]] = []
    for d in safe_iterdir(session_dir):
        if (d.name in app_ids) != want_app:
            continue
        try:
            if not d.is_dir():
                continue
            candidates.append((d.stat().st_mtime, d))
        except OSError:
            continue  # vanished mid-scan
    candidates.sort(key=lambda pair: pair[0], reverse=True)
    sessions = [d for _, d in candidates]

    selected: list[Path] = []
    signature: list[tuple[str, int, int]] = [(tool, 0, 0)]
    for sess_dir in sessions[:10]:  # Max 10 most recent sessions
        events_file = sess_dir / "events.jsonl"
        try:
            st = events_file.stat()
        except OSError:
            continue
        if st.st_mtime < cutoff:
            continue
        selected.append(events_file)
        signature.append((str(events_file), st.st_mtime_ns, st.st_size))

    # The result only depends on these files, so with no change there is nothing
    # to read. Rescanning whole logs each cycle cost 40 ms of CPU every time.
    global _copilot_report_cache
    key = tuple(signature)
    if _copilot_report_cache is None:
        _copilot_report_cache = {}
    cached = _copilot_report_cache.get(tool)
    if cached is not None and cached[0] == key:
        return cached[1]

    for events_file in selected:
        report.total_sessions += 1
        _parse_copilot_events(events_file, report)

    result = report if report.input_tokens or report.output_tokens else None
    _copilot_report_cache[tool] = (key, result)
    return result


def usd_cost(model: str, classes: tuple[int, int, int, int]) -> float | None:
    """List-price USD for (input, output, cache_read, cache_write), or None if unknown."""
    return usd_cost_of(model, *classes)


def _parse_copilot_events(events_file: Path, report: ToolTelemetryReport) -> None:
    """Parse a single Copilot CLI events.jsonl for token data, metrics, and errors.

    Token accounting uses exactly one source per session: when a
    ``session.shutdown`` event carries ``modelMetrics``, those metrics feed
    BOTH the report totals and the per-model breakdown (so the two always
    agree); per-message ``assistant.message`` output counts are only a
    fallback for sessions without shutdown metrics (still live / crashed).
    """
    fallback_output_tokens = 0
    shutdown_usage: dict[str, dict] = {}
    record_usage: dict[str, dict] = {}
    tools_started: dict[str, tuple[str, float]] = {}
    for obj in _iter_jsonl(events_file):
        event_type = obj.get("type", "")
        data = obj.get("data", {}) if isinstance(obj.get("data"), dict) else {}
        timestamp = obj.get("timestamp", "")

        # assistant.message has outputTokens (under data)
        if event_type == "assistant.message":
            fallback_output_tokens += int(data.get("outputTokens", 0))
            report.total_messages += 1

        # Per-request usage; the only numbers a still-running session has.
        elif event_type == "session.usage_record":
            usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
            model = str(usage.get("model") or data.get("model") or "")
            read = int(usage.get("cacheReadTokens", 0) or 0)
            write = int(usage.get("cacheWriteTokens", 0) or 0)
            rec = record_usage.setdefault(
                model,
                {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cache_read_tokens": 0,
                    "cache_creation_tokens": 0,
                    "requests": 0,
                    "cost_usd": 0.0,
                    "premium_requests": 0.0,
                },
            )
            rec["input_tokens"] += max(0, int(usage.get("inputTokens", 0) or 0) - read - write)
            rec["output_tokens"] += int(usage.get("outputTokens", 0) or 0)
            rec["cache_read_tokens"] += read
            rec["cache_creation_tokens"] += write
            rec["requests"] += 1
            rec["premium_requests"] += float(usage.get("cost", 0) or 0)
            report.cost_reason = COPILOT_COST_REASON

        # session.shutdown has comprehensive modelMetrics
        elif event_type == "session.shutdown":
            shutdown_type = data.get("shutdownType", "routine")

            # Error detection: non-routine shutdowns
            if shutdown_type != "routine":
                report.errors.append(
                    {
                        "type": "shutdown_error",
                        "message": f"Session shutdown: {shutdown_type}",
                        "timestamp": timestamp,
                        "model": data.get("currentModel", ""),
                    }
                )

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
                req_data = model_data.get("requests", {})
                req_count = int(req_data.get("count", 0))

                mu = shutdown_usage.setdefault(
                    model,
                    {
                        "input_tokens": 0,
                        "output_tokens": 0,
                        "cache_read_tokens": 0,
                        "cache_creation_tokens": 0,
                        "requests": 0,
                        "cost_usd": 0.0,
                        "premium_requests": 0.0,
                    },
                )
                # Copilot's inputTokens INCLUDES cache reads and writes; classes
                # are disjoint everywhere in aictl, so take the uncached part.
                read = int(usage.get("cacheReadTokens", 0))
                write = int(usage.get("cacheWriteTokens", 0))
                mu["input_tokens"] += max(0, int(usage.get("inputTokens", 0)) - read - write)
                mu["output_tokens"] += int(usage.get("outputTokens", 0))
                mu["cache_read_tokens"] += read
                mu["cache_creation_tokens"] += write
                mu["requests"] += req_count
                # requests.cost is premium requests (a count), not dollars.
                mu["premium_requests"] += float(req_data.get("cost", 0))
                report.cost_reason = COPILOT_COST_REASON

                # Detect potential timeouts: high latency per request
                if req_count > 0 and api_dur > 0:
                    avg_ms = api_dur / req_count
                    if avg_ms > 30000:  # >30s per request
                        report.errors.append(
                            {
                                "type": "timeout",
                                "message": f"High avg API latency: {avg_ms / 1000:.1f}s/req ({model})",
                                "timestamp": timestamp,
                                "model": model,
                            }
                        )

        # The name is only on the start event and the duration on neither, so
        # both come from pairing start and complete by their call id.
        elif event_type == "tool.execution_start":
            tools_started[str(data.get("toolCallId", ""))] = (str(data.get("toolName", "")), _parse_iso_ts(timestamp))
        elif event_type == "tool.execution_complete":
            tool_name, started = tools_started.pop(str(data.get("toolCallId", "")), ("", 0.0))
            duration_s = _parse_iso_ts(timestamp) - started if started else 0.0
            if tool_name and duration_s > 60:  # >60s tool execution
                report.errors.append(
                    {
                        "type": "timeout",
                        "message": f"Slow tool: {tool_name} ({duration_s:.1f}s)",
                        "timestamp": timestamp,
                        "model": "",
                    }
                )

    # A session with a shutdown reports the same totals as its records, so one
    # source is used for each session and they are never added together.
    shutdown_usage = shutdown_usage or record_usage
    if shutdown_usage:
        # Shutdown metrics are authoritative: totals and breakdown from
        # the same source, so their sums always match.
        for model, mu in shutdown_usage.items():
            report.input_tokens += mu["input_tokens"]
            report.output_tokens += mu["output_tokens"]
            report.cache_read_tokens += mu["cache_read_tokens"]
            report.cache_creation_tokens += mu["cache_creation_tokens"]
            report.cost_usd += mu["cost_usd"]

            mb = report.by_model.setdefault(
                model,
                {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cache_read_tokens": 0,
                    "requests": 0,
                    "cost_usd": 0.0,
                },
            )
            mb["input_tokens"] += mu["input_tokens"]
            mb["output_tokens"] += mu["output_tokens"]
            mb["cache_read_tokens"] += mu["cache_read_tokens"]
            mb["requests"] += mu["requests"]
            mb["cost_usd"] += mu["cost_usd"]
            mb["premium_requests"] = mb.get("premium_requests", 0.0) + mu["premium_requests"]
    else:
        report.output_tokens += fallback_output_tokens
        report.token_quality = "partial"


# ─── Codex CLI ──────────────────────────────────────────────────


def parse_codex_telemetry(
    root: Path | None = None, tool: str = "codex-cli", source: str = "token-count", confidence: float = 0.85
) -> ToolTelemetryReport | None:
    """Parse OpenAI Codex CLI telemetry from session JSONL files."""
    sessions_dir = codex_global_dir() / "sessions"
    if not sessions_dir.is_dir():
        return None

    report = ToolTelemetryReport(tool=tool, source=source, confidence=confidence)

    for sess_file in _recent_files(sessions_dir, "**/*.jsonl"):
        report.total_sessions += 1
        _parse_codex_session(sess_file, report)

    if report.input_tokens or report.output_tokens:
        return report
    return None


def _parse_codex_session(sess_file: Path, report: ToolTelemetryReport) -> None:
    """Parse a single Codex CLI session JSONL for token_count events.

    ``token_count`` totals are cumulative for the whole session, so they
    are attributed to the *last-seen* model only — adding them to every
    model the session touched would multiply the counts.  The provider
    name (``model_provider``) is never a model and is not recorded.
    """
    last_total = None
    last_model = ""
    for obj in _iter_jsonl(sess_file):
        payload = obj.get("payload") if isinstance(obj.get("payload"), dict) else {}
        # {"type": "event_msg", "payload": {"type": "token_count",
        #  "info": {"total_token_usage": {...}}}}; older rollouts had no "info".
        if obj.get("type") == "event_msg" and payload.get("type") == "token_count":
            info = payload.get("info") if isinstance(payload.get("info"), dict) else {}
            total_usage = info.get("total_token_usage") or payload.get("total_token_usage")
            if total_usage:
                last_total = total_usage
                report.total_messages += 1
        # turn_context names the model in use; session_meta only in old rollouts.
        elif obj.get("type") in ("session_meta", "turn_context"):
            if model := payload.get("model", ""):
                last_model = model

    # Use the last cumulative total (most accurate)
    if last_total:
        cached = int(last_total.get("cached_input_tokens", 0) or 0)
        write = int(last_total.get("cache_write_input_tokens", 0) or 0)
        # OpenAI's input_tokens includes cached tokens; aictl's classes are disjoint.
        inp = max(0, int(last_total.get("input_tokens", 0) or 0) - cached - write)
        out = int(last_total.get("output_tokens", 0) or 0)
        report.input_tokens += inp
        report.output_tokens += out
        report.cache_read_tokens += cached
        report.cache_creation_tokens += write
        # Attribute the session's totals to the last-seen model only
        if last_model:
            mb = report.by_model.setdefault(last_model, {"input_tokens": 0, "output_tokens": 0})
            mb["input_tokens"] += inp
            mb["output_tokens"] += out
            cost = usd_cost(last_model, (inp, out, cached, write))
            if cost is None:
                report.cost_quality = "unknown"
                report.cost_reason = f"no list price for: {last_model}"
            else:
                report.cost_usd += cost
                if report.cost_quality != "unknown":
                    report.cost_quality = "estimated"
                    report.cost_reason = "list price x last model; see /api/usage for per-request pricing"
        else:
            report.cost_quality = "unknown"
            report.cost_reason = "rollout names no model"


# ─── Cursor (SQLite state.vscdb) ─────────────────────────────────


def parse_cursor_telemetry(
    root: Path | None = None, tool: str = "cursor", source: str = "state-vscdb", confidence: float = 0.70
) -> ToolTelemetryReport | None:
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
        if IS_WINDOWS:
            import shutil
            import tempfile

            tmp = Path(tempfile.gettempdir()) / f"aictl-{tool}-state.vscdb"
            try:
                shutil.copy2(vscdb, tmp)
            except (OSError, PermissionError) as exc:
                log.debug("cursor vscdb copy failed: %s", exc)
                return None
            db_path = str(tmp)
        else:
            db_path = f"file:{vscdb}?mode=ro"
        conn = sqlite3.connect(db_path if "file:" in db_path else db_path, uri="file:" in db_path, timeout=3)
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
                    inp = _first_int(usage, "inputTokens", "input_tokens")
                    out = _first_int(usage, "outputTokens", "output_tokens")
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


def parse_continue_telemetry(
    root: Path | None = None, tool: str = "continue", source: str = "session-json", confidence: float = 0.75
) -> ToolTelemetryReport | None:
    """Parse Continue IDE extension telemetry from session JSON files.

    Continue stores session data as ``~/.continue/sessions/{uuid}.json``
    with message objects containing token usage.
    """
    sessions_dir = _continue_sessions_dir()
    if not sessions_dir.is_dir():
        return None

    report = ToolTelemetryReport(tool=tool, source=source, confidence=confidence)

    for sess_file in _recent_files(sessions_dir, "*.json", max_files=20):
        report.total_sessions += 1
        _parse_continue_session(sess_file, report)

    if report.input_tokens or report.output_tokens:
        return report
    return None


def _parse_continue_session(sess_file: Path, report: ToolTelemetryReport) -> None:
    """Parse a single Continue session JSON for token data."""
    try:
        data = json.loads(sess_file.read_text(encoding="utf-8", errors="replace"))
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
            report.input_tokens += _first_int(usage, "inputTokens", "input_tokens", "promptTokens", "prompt_tokens")
            report.output_tokens += _first_int(
                usage, "outputTokens", "output_tokens", "completionTokens", "completion_tokens"
            )

        # Direct token fields on message
        report.input_tokens += _first_int(msg, "promptTokens", "prompt_tokens", "inputTokens", "input_tokens")
        report.output_tokens += _first_int(
            msg, "completionTokens", "completion_tokens", "outputTokens", "output_tokens"
        )

        # Model info
        if model := msg.get("model", "") or msg.get("modelTitle", ""):
            report.by_model.setdefault(model, {"input_tokens": 0, "output_tokens": 0})


# ─── Public API ─────────────────────────────────────────────────


# ─── Parser registry (tool name → parser function) ──────────────
# Parsers receive (root, tool, source, confidence) from YAML config.
# The root param is the project root (only used by claude parser).

_PARSER_REGISTRY: dict[str, Callable] = {
    "claude-code": parse_claude_telemetry,
    "copilot-cli": parse_copilot_telemetry,
    "copilot-desktop": parse_copilot_telemetry,
    "codex-cli": parse_codex_telemetry,
    "cursor": parse_cursor_telemetry,
    "continue": parse_continue_telemetry,
}


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
            report = parser(
                root,
                tool=tool_name,
                source=config.get("source_id", "unknown"),
                confidence=config.get("confidence", 0.5),
            )
            if report:
                reports.append(report)
        except Exception as exc:
            log.warning("Telemetry parser %s failed: %s", tool_name, exc)
    return reports
