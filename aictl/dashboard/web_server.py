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

from .collector import DashboardSnapshot
from ..discovery import compute_token_budget
from ..store import SnapshotStore, AllowedPaths

logger = logging.getLogger(__name__)

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
        "agent_memory": [dataclasses.asdict(m) if dataclasses.is_dataclass(m) else m
                         for m in snap.agent_memory],
        "mcp_detail": [dataclasses.asdict(s) if dataclasses.is_dataclass(s) else s
                       for s in snap.mcp_detail],
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
        "agent_teams": snap.agent_teams or [],
        "_sse_summary": True,
    }


# ─── HTTP handler ────────────────────────────────────────────────

class _DashboardHandler(BaseHTTPRequestHandler):
    """Routes requests to the appropriate handler."""

    server: _DashboardHTTPServer  # type hint for IDE

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

        # Store as event in the database
        db = self.server.store._db
        if db:
            from ..storage import EventRow
            db.append_event(EventRow(
                ts=ts, tool=tool, kind=f"hook:{event_name}",
                detail={"session_id": session_id, "cwd": cwd, **{
                    k: v for k, v in data.items()
                    if k not in ("event", "hook_event_name", "session_id", "tool", "cwd", "ts")
                }},
            ))

        # Feed into entity state tracker
        self.server.entity_tracker.process_event({
            "ts": ts, "tool": tool, "kind": f"hook:{event_name}",
            "detail": {"session_id": session_id, "cwd": cwd, **{
                k: v for k, v in data.items()
                if k not in ("event", "hook_event_name", "session_id", "tool", "cwd", "ts")
            }},
        })

        logger.debug("Hook event received: %s session=%s", event_name, session_id)

        # Respond with success
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

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
        data = self._read_post_otlp("metrics")
        if data is None:
            return
        try:
            receiver = self.server.otel_receiver
            samples = receiver.parse_metrics(data)
            db = self.server.store._db
            if db and samples:
                db.append_samples(samples)
            logger.debug("OTel metrics received: %d samples", len(samples))
        except Exception:
            logger.exception("Error processing OTel metrics")
            self.server.otel_receiver.stats.errors += 1
            self.send_error(500, "Internal error")
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def _receive_otel_logs(self) -> None:
        """Receive OTLP logs/events (JSON or protobuf)."""
        data = self._read_post_otlp("logs")
        if data is None:
            return
        try:
            receiver = self.server.otel_receiver
            events = receiver.parse_logs(data)
            db = self.server.store._db
            if db and events:
                db.append_events(events)
            logger.debug("OTel log events received: %d events", len(events))
        except Exception:
            logger.exception("Error processing OTel logs")
            self.server.otel_receiver.stats.errors += 1
            self.send_error(500, "Internal error")
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def _receive_otel_traces(self) -> None:
        """Receive OTLP traces/spans (JSON or protobuf)."""
        data = self._read_post_otlp("traces")
        if data is None:
            return
        try:
            receiver = self.server.otel_receiver
            samples, events = receiver.parse_traces(data)
            db = self.server.store._db
            if db and samples:
                db.append_samples(samples)
            if db and events:
                db.append_events(events)
            logger.debug("OTel traces received: %d samples, %d events",
                         len(samples), len(events))
        except Exception:
            logger.exception("Error processing OTel traces")
            self.server.otel_receiver.stats.errors += 1
            self.send_error(500, "Internal error")
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def _serve_self_status(self) -> None:
        """Return aictl's own resource usage and DB stats."""
        import os
        result = {}
        try:
            import psutil
            proc = psutil.Process(os.getpid())
            mem = proc.memory_info()
            # interval=0.5 captures collection cycle spikes (blocks 500ms)
            cpu = proc.cpu_percent(interval=0.5)
            result["pid"] = os.getpid()
            result["cpu_percent"] = round(cpu, 1)
            result["memory_rss_bytes"] = mem.rss
            result["memory_vms_bytes"] = mem.vms
            result["threads"] = proc.num_threads()
            result["uptime_s"] = round(time.time() - proc.create_time(), 1)
        except Exception:
            result["pid"] = os.getpid()
        db = self.server.store._db
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
        qs = parse_qs(urlparse(self.path).query)
        session_id = (qs.get("session_id") or [None])[0]
        if not session_id:
            self._json_response({"error": "session_id required", "turns": []})
            return

        db = self.server.store._db
        if not db:
            self._json_response({"turns": [], "summary": {}})
            return

        since = float(qs.get("since", [str(time.time() - 86400 * 7)])[0])
        until = float(qs.get("until", [str(time.time())])[0])
        # Extract tool from correlator session_id (format: "tool:pid:ts")
        tool = None
        if ":" in session_id:
            tool = session_id.split(":")[0]

        # Fetch all events for this session by session_id match
        all_events = db.query_events(
            since=since, until=until,
            session_id=session_id,
            limit=5000,
        )

        # Fetch OTel events by time window + tool (correlator session_id
        # differs from OTel session.id UUID, so we match by time window).
        # Use a wider window for OTel since tool processes may have been
        # running before the correlator detected the session.
        otel_since = since - 7200  # look 2h before session start
        otel_events = db.query_events(
            since=otel_since, until=until,
            tool=tool,
            limit=5000,
        )
        # Filter to OTel event kinds only
        api_by_session = [
            e for e in otel_events
            if (e.kind or "").startswith("otel:")
        ]

        # Sort chronologically (query_events returns DESC)
        all_events.sort(key=lambda e: e.ts)
        api_by_session.sort(key=lambda e: e.ts)

        # Check if we have UserPromptSubmit events
        has_prompts = any(
            (e.kind or "") == "hook:UserPromptSubmit" for e in all_events
        )

        if has_prompts:
            turns = self._build_turns_from_hooks(all_events, api_by_session)
        else:
            turns = self._build_turns_from_otel(
                all_events, api_by_session, session_id)

        # Build summary — count from api_call events for accurate totals
        api_turns = [t for t in turns
                     if t["type"] == "api_call" and t.get("tokens")]
        user_msgs = [t for t in turns if t["type"] == "user_message"]
        total_input = sum(t["tokens"]["input"] for t in api_turns)
        total_output = sum(t["tokens"]["output"] for t in api_turns)
        total_cache = sum(t["tokens"]["cache_read"] for t in api_turns)
        compactions = sum(1 for t in turns if t["type"] == "compaction")
        tool_uses = sum(1 for t in turns if t["type"] == "tool_use")
        first_ts = turns[0]["ts"] if turns else 0
        last_ts = turns[-1].get("end_ts", turns[-1]["ts"]) if turns else 0

        summary = {
            "total_turns": len(user_msgs),
            "total_api_calls": len(api_turns),
            "total_tool_uses": tool_uses,
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_cache_tokens": total_cache,
            "total_tokens": total_input + total_output,
            "avg_tokens_per_call": (
                round((total_input + total_output) / len(api_turns))
                if api_turns else 0),
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
        """Attribute OTel API call data to the matching user-message turns."""
        for api_ev in api_by_session:
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
        db = self.server.store._db
        if not db:
            self._json_response({"calls": [], "summary": {}})
            return

        qs = parse_qs(urlparse(self.path).query)
        since = float(qs.get("since", [str(time.time() - 3600)])[0])
        until = float(qs.get("until", [str(time.time())])[0])
        limit = min(int(qs.get("limit", ["500"])[0]), 2000)

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
        models = {}
        for c in ok_calls:
            m = c.get("model", "unknown")
            models[m] = models.get(m, 0) + 1

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
        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return
        etag = f'"{self.server.store.version}"'
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.end_headers()
            return
        body = snap.to_json().encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("ETag", etag)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self) -> None:
        qs = parse_qs(urlparse(self.path).query)
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
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.end_headers()
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
        from urllib.parse import parse_qs, urlparse
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        range_str = (qs.get("range") or [None])[0]
        since_str = (qs.get("since") or [None])[0]
        until_str = (qs.get("until") or [None])[0]
        tool_filter = (qs.get("tool") or [None])[0]

        use_db = (range_str or since_str) and self.server.store._db
        if use_db:
            import time as _time
            if since_str:
                since = float(since_str)
            else:
                range_map = {"1h": 3600, "6h": 21600, "24h": 86400, "7d": 604800}
                secs = range_map.get(range_str, 3600)
                since = _time.time() - secs
            until = float(until_str) if until_str else None
            data = self.server.store._db.query_metrics(since=since, until=until)
            tool_data = self.server.store._db.query_tool_metrics(
                tool=tool_filter, since=since, until=until)
            data["by_tool"] = tool_data
            body = json.dumps(data).encode("utf-8")
        else:
            body = self.server.store.history_json().encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_samples(self) -> None:
        """Serve universal samples.

        Params: ?metric=X&prefix=X&since=<ts>&tag.tool=X&limit=N
        Or: ?list=1&prefix=X  to list distinct metric names.
        Or: ?series=X&since=<ts>  to get a single metric as time-series.
        """
        from urllib.parse import parse_qs, urlparse
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        db = self.server.store._db
        if not db:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b"[]")
            return

        import time as _time
        # Mode: list metrics
        if "list" in qs:
            prefix = (qs.get("prefix") or [""])[0]
            result = db.list_metrics(prefix=prefix)
            body = json.dumps(result)
        # Mode: single metric series
        elif "series" in qs:
            metric = qs["series"][0]
            since = float((qs.get("since") or [str(_time.time() - 3600)])[0])
            result = db.query_samples_series(metric, since=since)
            body = json.dumps(result)
        # Mode: query samples
        else:
            metric = (qs.get("metric") or [None])[0]
            prefix = (qs.get("prefix") or [None])[0]
            since = float((qs.get("since") or [str(_time.time() - 3600)])[0])
            limit = int((qs.get("limit") or ["1000"])[0])
            # Extract tag filters from tag.X=Y params
            tag_filter = {}
            for k, v in qs.items():
                if k.startswith("tag."):
                    tag_filter[k[4:]] = v[0]
            rows = db.query_samples(
                metric=metric, metric_prefix=prefix,
                since=since, tag_filter=tag_filter or None, limit=limit,
            )
            result = [{"ts": s.ts, "metric": s.metric, "value": s.value, "tags": s.tags}
                      for s in rows]
            body = json.dumps(result)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def _serve_project_costs(self) -> None:
        """Serve per-project cumulative token/cost data.

        Params: ?since=<unix_ts>&days=<N>
        Returns: [{project, sessions, input_tokens, output_tokens, total_tokens,
                   cost_usd, daily: [{date, input_tokens, output_tokens}]}]
        """
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        days = int((qs.get("days") or ["7"])[0])
        since = float((qs.get("since") or [str(time.time() - days * 86400)])[0])

        projects: dict[str, dict] = {}  # project -> aggregate

        # 1. Active sessions from correlator
        snap = self.server.store.latest_snapshot()
        if snap:
            for s in snap.get("sessions") or []:
                proj = s.get("project") or "(unknown)"
                if proj not in projects:
                    projects[proj] = {"sessions": 0, "input_tokens": 0,
                                      "output_tokens": 0, "daily": {}}
                p = projects[proj]
                p["sessions"] += 1
                p["input_tokens"] += s.get("exact_input_tokens") or 0
                p["output_tokens"] += s.get("exact_output_tokens") or 0

        # 2. Historical session_end events from SQLite
        db = self.server.store._db
        if db:
            rows = db.query_events(since=since, kind="session_end", limit=5000)
            for ev in rows:
                detail = ev.detail or {}
                proj = detail.get("project") or "(unknown)"
                if proj not in projects:
                    projects[proj] = {"sessions": 0, "input_tokens": 0,
                                      "output_tokens": 0, "daily": {}}
                p = projects[proj]
                p["sessions"] += 1
                in_tok = detail.get("input_tokens") or 0
                out_tok = detail.get("output_tokens") or 0
                p["input_tokens"] += in_tok
                p["output_tokens"] += out_tok
                # Daily bucketing
                from datetime import datetime, timezone
                day = datetime.fromtimestamp(ev.ts, tz=timezone.utc).strftime("%Y-%m-%d")
                if day not in p["daily"]:
                    p["daily"][day] = {"input_tokens": 0, "output_tokens": 0}
                p["daily"][day]["input_tokens"] += in_tok
                p["daily"][day]["output_tokens"] += out_tok

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

        body = json.dumps(result).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_session_runs(self) -> None:
        """Serve historical session runs grouped by project+tool for trend analysis.

        Params: ?project=<path>&tool=<name>&days=<N>&limit=<N>
        Returns: [{session_id, ts, project, tool, duration_s, input_tokens,
                   output_tokens, total_tokens}] sorted by ts desc.
        Enables run-over-run comparison for scheduled/recurring sessions.
        """
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        project = (qs.get("project") or [None])[0]
        tool = (qs.get("tool") or [None])[0]
        days = int((qs.get("days") or ["30"])[0])
        limit = int((qs.get("limit") or ["50"])[0])
        since = time.time() - days * 86400

        runs = []
        db = self.server.store._db
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

        body = json.dumps(runs).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_events(self) -> None:
        """Serve recent events from SQLite.

        Params: ?since=<unix_ts>&until=<unix_ts>&tool=<name>&kind=<type>&session_id=<id>&limit=<n>
        """
        from urllib.parse import parse_qs, urlparse
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        events_list = []
        db = self.server.store._db
        if db:
            import time as _time
            since = float((qs.get("since") or [str(_time.time() - 3600)])[0])
            until_str = (qs.get("until") or [None])[0]
            until = float(until_str) if until_str else None
            tool = (qs.get("tool") or [None])[0]
            kind = (qs.get("kind") or [None])[0]
            session_id = (qs.get("session_id") or [None])[0]
            limit = int((qs.get("limit") or ["200"])[0])
            rows = db.query_events(since=since, until=until, tool=tool,
                                   kind=kind, session_id=session_id,
                                   limit=limit)
            events_list = [
                {"ts": r.ts, "tool": r.tool, "kind": r.kind, "detail": r.detail}
                for r in rows
            ]

        body = json.dumps(events_list).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_datapoint_catalog(self) -> None:
        """Serve the datapoint catalog.

        Params: ?tab=<tab>&key=<key>&source_type=<raw|deduced|aggregated>
        """
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        tab = (qs.get("tab") or [None])[0]
        key = (qs.get("key") or [None])[0]
        source_type = (qs.get("source_type") or [None])[0]

        entries = []
        db = self.server.store._db
        if db:
            entries = db.query_datapoint_catalog(
                tab=tab, key=key, source_type=source_type
            )

        body = json.dumps(entries).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_sessions(self) -> None:
        """Serve active and historical sessions.

        Params: ?tool=X&active=true&since=<ts>&limit=N
        """
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        tool = (qs.get("tool") or [None])[0]
        active_only = (qs.get("active") or [""])[0].lower() == "true"
        limit = int((qs.get("limit") or ["100"])[0])

        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return

        # Active sessions from live snapshot
        sessions = list(snap.sessions)

        # Filter by tool
        if tool:
            sessions = [s for s in sessions if s.get("tool") == tool]

        # If not active_only, also include historical sessions from events
        if not active_only:
            db = self.server.store._db
            if db:
                since = float((qs.get("since") or [str(time.time() - 86400)])[0])
                # Reconstruct ended sessions from session_end events
                ended = db.query_events(since=since, kind="session_end", limit=limit)
                active_ids = {s.get("session_id") for s in sessions}
                for ev in ended:
                    sid = ev.detail.get("session_id", "") if isinstance(ev.detail, dict) else ""
                    if sid and sid not in active_ids:
                        sessions.append({
                            "session_id": sid,
                            "tool": ev.tool,
                            "ended_at": ev.ts,
                            "duration_s": ev.detail.get("duration_s", 0) if isinstance(ev.detail, dict) else 0,
                            "active": False,
                        })

        # Mark active sessions
        for s in sessions:
            if "active" not in s:
                s["active"] = True

        sessions = sessions[:limit]
        body = json.dumps(sessions).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_session_stats(self) -> None:
        """Serve deduced session metrics from entity state + JSONL enrichment.

        Params: ?session_id=X (optional — omit for all sessions)
        Returns per-session deduced stats: tool calls, skill calls, prompt
        count, tool call rate, agent stats with token/tool breakdown.
        """
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        session_id = (qs.get("session_id") or [None])[0]

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
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        db = self.server.store._db
        if not db:
            self._json_response([])
            return

        since = float((qs.get("since") or [str(time.time() - 86400)])[0])
        until_str = (qs.get("until") or [None])[0]
        until = float(until_str) if until_str else None

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
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        db = self.server.store._db
        if not db:
            self._json_response([])
            return

        tool = (qs.get("tool") or [None])[0]
        category = (qs.get("category") or [None])[0]
        changed_since = None
        if "changed_since" in qs:
            changed_since = float(qs["changed_since"][0])

        files = db.list_files(tool=tool, category=category, changed_since=changed_since)
        result = [{
            "path": f.path, "tool": f.tool, "category": f.category,
            "scope": f.scope, "content_hash": f.content_hash,
            "size_bytes": f.size_bytes, "tokens": f.tokens, "lines": f.lines,
            "mtime": f.mtime, "first_seen": f.first_seen,
            "last_read": f.last_read, "last_changed": f.last_changed,
            "meta": f.meta,
        } for f in files]
        self._json_response(result)

    def _serve_file_history(self) -> None:
        """Serve file change history.

        Params: ?path=X&limit=N
        Or: ?path=X&ts=<unix_ts> to get content at a point in time.
        """
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        file_path = (qs.get("path") or [None])[0]

        if not file_path:
            self.send_error(400, "Missing path parameter")
            return

        db = self.server.store._db
        if not db:
            self._json_response([])
            return

        # Content at timestamp mode
        if "ts" in qs:
            ts = float(qs["ts"][0])
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
        limit = int((qs.get("limit") or ["50"])[0])
        history = db.file_history(file_path, limit=limit)
        self._json_response(history)

    def _serve_telemetry(self) -> None:
        """Serve historical telemetry data.

        Params: ?tool=X&since=<ts>&until=<ts>
        """
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        db = self.server.store._db
        if not db:
            self._json_response([])
            return

        tool = (qs.get("tool") or [None])[0]
        since = float((qs.get("since") or [str(time.time() - 86400)])[0])
        until = float((qs.get("until") or [str(time.time())])[0])

        rows = db.query_telemetry(tool=tool, since=since, until=until)
        result = [{
            "ts": r.ts, "tool": r.tool, "source": r.source,
            "confidence": r.confidence,
            "input_tokens": r.input_tokens, "output_tokens": r.output_tokens,
            "cache_read_tokens": r.cache_read_tokens,
            "cache_creation_tokens": r.cache_creation_tokens,
            "total_sessions": r.total_sessions,
            "total_messages": r.total_messages,
            "cost_usd": r.cost_usd, "model": r.model,
            "by_model": r.by_model,
        } for r in rows]
        self._json_response(result)

    def _json_response(self, data) -> None:
        """Send a JSON response."""
        body = json.dumps(data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

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
        body = json.dumps(budget, indent=2).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

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
        from ..monitoring.entity_state import EntityStateTracker
        self.entity_tracker: EntityStateTracker = EntityStateTracker()
        # OTel OTLP receiver for Claude Code telemetry
        from ..otel_receiver import OtelReceiver
        self.otel_receiver: OtelReceiver = OtelReceiver()



# ─── Inline HTML dashboard ───────────────────────────────────────

from ..registry import (
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
