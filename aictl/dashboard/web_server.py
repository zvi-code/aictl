# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Live web dashboard server with REST + SSE API.

Serves a self-contained HTML dashboard at / with real-time updates via
Server-Sent Events, plus REST endpoints for snapshot data, file content
inspection, and token budget analysis.

The frontend is built with Vite from ui/src/ into dist/.

Implementation is split across focused modules:
- otel_receiver: OTel protobuf parsing and metric mapping
- analytics: background cache and aggregate computation
- session_flow: session timeline reconstruction
- api_handlers: REST endpoint handler methods
"""

from __future__ import annotations

import dataclasses
import email.utils
import json
import logging
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .models import DashboardSnapshot, _slim_agent_teams
from ..orchestrator import SnapshotStore, AllowedPaths
from ..storage import EventRow, SessionRow, ToolInvocationRow

# ── Re-exports for backward compatibility ────────────────────────
# Other modules (tests, orchestrator) import these from web_server.
from .otel_receiver import (  # noqa: F401 — re-exports
    METRIC_MAP,
    OtelReceiver,
    OtelStats,
    _extract_otel_data_points,
    _extract_otel_value,
    _load_otlp_proto,
    _nano_to_epoch,
    _num,
    _parse_otel_attributes,
    _promote_session_id,
)
from .analytics import (  # noqa: F401 — re-exports
    _AnalyticsCache,
    _compute_files,
    _compute_response_time,
    _compute_tools,
)
from .api_handlers import _APIHandlersMixin

logger = logging.getLogger(__name__)
_log = logger  # alias used by _serve_static

# ─── SSE client limit ────────────────────────────────────────────

_MAX_SSE_CLIENTS = 10
_sse_client_count = 0
_sse_client_lock = threading.Lock()


# ─── Safe file reading ───────────────────────────────────────────

_MAX_FILE_SIZE = 200_000


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

class _DashboardHandler(_APIHandlersMixin, BaseHTTPRequestHandler):
    """Routes requests to the appropriate handler.

    REST API endpoint implementations live in _APIHandlersMixin
    (api_handlers.py).  This class provides routing, SSE, HTML serving,
    OTel ingestion, and shared helper methods.
    """

    # Re-export for backward compatibility (tests call this as a classmethod)
    from .session_flow import attribute_api_to_turns as _attribute_api_to_turns

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
        elif path.startswith("/api/transcript/"):
            self._serve_transcript()
        elif path.startswith("/api/transcripts"):
            self._serve_transcripts()
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
            except Exception as exc:
                logger.debug("Protobuf parse failed: %s", exc)

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

    # ── Shared helpers (used by _APIHandlersMixin and core) ──

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
        # Session analyzer — independent live transcript builder
        from ..analysis.analyzer import SessionAnalyzer
        self.session_analyzer: SessionAnalyzer = SessionAnalyzer()
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
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as exc:
            logger.warning("npm build failed (dashboard UI may be stale): %s", exc)
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
