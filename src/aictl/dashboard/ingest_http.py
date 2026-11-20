"""Receive local hook events and OTLP exports over HTTP."""

from __future__ import annotations

import gzip
import hashlib
import json
import logging
import math
import threading
import time
import zlib
from pathlib import Path

from ..records import EventRow, FileWriteRow, HookCallRow, SessionRow, ToolInvocationRow
from .otel_receiver import (
    _load_otlp_proto,
)

logger = logging.getLogger(__name__)


# Keys the hook handler always sets on the payload; the keys it set only when the
# tool left them out are listed in ``aictl_hook.added`` (format version 1).
_HOOK_ADDED_KEYS = ("event", "aictl_hook", "_aictl_truncated")


def _sane_ts(value: object) -> float | None:
    """*value* as a time stamp when it is a finite positive number, else None."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    ts = float(value)
    return ts if math.isfinite(ts) and ts > 0 else None


def _first_str(data: dict, *keys: str) -> str:
    """The first of *keys* that holds a non-empty string (Claude snake_case, Copilot camelCase)."""
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def _int_of(value: object) -> int:
    try:
        return int(value) if not isinstance(value, bool) else 0
    except (TypeError, ValueError):
        return 0


def _hook_decision(stdout: object, exit_code: int | None) -> str:
    """What a wrapped hook told the tool: its JSON decision, else ``block`` for exit 2."""
    parsed: object = None
    if isinstance(stdout, str) and stdout.strip():
        try:
            parsed = json.loads(stdout)
        except ValueError:
            parsed = None
    if isinstance(parsed, dict):
        specific = parsed.get("hookSpecificOutput")
        if isinstance(specific, dict) and isinstance(specific.get("permissionDecision"), str):
            return specific["permissionDecision"]
        if isinstance(parsed.get("decision"), str):
            return parsed["decision"]
        if parsed.get("continue") is False:
            return "stop"
    return "block" if exit_code == 2 else ""


def _hook_call_row(
    data: dict, *, tool: str, event: str, session_id: str, cwd: str, pid: int, received_at: float
) -> HookCallRow:
    """The ``hook_calls`` row of one hook POST: the envelope's fields typed, the tool's payload as it sent it.

    A POST without the v1 envelope (an older wrapper, another client) gets format
    version 0 and a call id derived from its body, so an identical retry is stored once.
    """
    meta = data.get("aictl_hook")
    meta = meta if isinstance(meta, dict) else {}
    version = _int_of(meta.get("v"))
    call_id = meta.get("call_id")
    if not isinstance(call_id, str) or not call_id or len(call_id) > 128:
        canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)
        call_id = "body:" + hashlib.sha256(canonical.encode("utf-8", "surrogatepass")).hexdigest()[:32]
    ts = _sane_ts(meta.get("ts")) or _sane_ts(data.get("ts")) or received_at
    added = meta.get("added") if isinstance(meta.get("added"), list) else []
    drop = {*_HOOK_ADDED_KEYS, *(k for k in added if isinstance(k, str))}
    payload = {k: v for k, v in data.items() if k not in drop}
    wrapped = meta.get("wrapped")
    row = HookCallRow(
        call_id=call_id,
        ts=ts,
        received_at=received_at,
        format_version=version,
        tool=tool,
        event=event,
        hook_event_name=_first_str(data, "hook_event_name", "hookEventName"),
        source=str(meta.get("source") or data.get("source") or ""),
        session_id=session_id,
        agent_id=_first_str(data, "agent_id", "agentId"),
        project_path=cwd,
        pid=pid,
        hook_pid=_int_of(meta.get("pid")),
        hook_ppid=_int_of(meta.get("ppid")),
        tool_name=_first_str(data, "tool_name", "toolName"),
        tool_use_id=_first_str(data, "tool_use_id", "toolUseId", "toolCallId"),
        permission_mode=_first_str(data, "permission_mode", "permissionMode"),
        payload_bytes=_int_of(meta.get("payload_bytes")),
        truncated=1 if meta.get("truncated") is True or data.get("_aictl_truncated") is True else 0,
        payload=payload,
    )
    if isinstance(wrapped, dict):
        command = wrapped.get("command") if isinstance(wrapped.get("command"), str) else ""
        exit_code = wrapped.get("exit_code")
        exit_code = exit_code if isinstance(exit_code, int) and not isinstance(exit_code, bool) else None
        stdout = wrapped.get("stdout")
        row.wrapped = 1
        row.command = command
        row.command_hash = hashlib.sha256(command.encode("utf-8", "surrogatepass")).hexdigest()[:16]
        row.exit_code = exit_code
        row.duration_ms = float(_sane_ts(wrapped.get("duration_ms")) or 0.0)
        row.overhead_ms = float(_sane_ts(wrapped.get("overhead_ms")) or 0.0)
        row.stdout_bytes = _int_of(wrapped.get("stdout_bytes"))
        row.stderr_bytes = _int_of(wrapped.get("stderr_bytes"))
        row.decision = _hook_decision(stdout, exit_code)
        row.output = stdout if isinstance(stdout, str) else ""
    return row


def _is_claude_hook(data: dict) -> bool:
    """True when the hook payload came from a Claude Code user/project hook."""
    sources: list[str] = []
    src = data.get("source")
    if isinstance(src, str):
        sources.append(src)
    meta = data.get("aictl_hook") or {}
    if isinstance(meta, dict):
        inner = meta.get("source")
        if isinstance(inner, str):
            sources.append(inner)
    return any(s.endswith((".claude-user", ".claude-project")) for s in sources)


def _tool_from_hook_source(data: dict) -> str:
    meta = data.get("aictl_hook") or {}
    source = data.get("source") or (meta.get("source") if isinstance(meta, dict) else "") or ""
    if source.endswith((".claude-user", ".claude-project")):
        return "claude-code"
    if source.endswith((".gemini-user", ".gemini-project")):
        return "gemini-cli"
    if source.endswith((".vscode-user", ".vscode-project", ".copilot-user", ".copilot-project")):
        return _copilot_surface(data) or "copilot-vscode"
    return ""


_COPILOT_SURFACES = frozenset({"copilot-cli", "copilot-desktop", "copilot-vscode"})


def _copilot_surface(data: dict) -> str:
    """Which Copilot surface sent a hook. They share one hook file, so the file's
    location says nothing: read the transcript path, then the calling processes."""
    transcript = str(data.get("transcript_path") or data.get("transcriptPath") or "")
    transcript = transcript.replace("\\", "/").lower()
    if "github.copilot-chat" in transcript or "/workspacestorage/" in transcript:
        return "copilot-vscode"
    pid = data.get("pid")
    return _copilot_surface_of_process(int(pid)) if pid else ""


def _copilot_surface_of_process(pid: int, max_depth: int = 6) -> str:
    """Nearest Copilot surface among a process and its ancestors; "" when unknown."""
    try:
        import psutil

        from ..monitoring.collectors.process import classify_process
        from ..monitoring.session import ProcessInfo

        process = psutil.Process(pid)
        for _ in range(max_depth):
            if process is None:
                break
            with process.oneshot():
                info = ProcessInfo(
                    pid=process.pid,
                    ppid=process.ppid(),
                    name=process.name(),
                    exe=process.exe(),
                    cmdline=tuple(process.cmdline()),
                )
            tool = classify_process(info).tool
            if tool in _COPILOT_SURFACES:
                return tool
            process = process.parent()
    except Exception:  # noqa: BLE001 — attribution is best-effort; never fail a hook
        logger.debug("Could not classify hook process %s", pid, exc_info=True)
    return ""


def _derive_claude_project_hash(cwd: str) -> str | None:
    """Locate the Claude projects/<hash> dir for ``cwd``; return the hash."""
    if not cwd:
        return None
    try:
        from ..memory import _find_project_dir

        p = _find_project_dir(Path(cwd))
        return p.name if p else None
    except Exception:  # noqa: BLE001 — best-effort; never crash hooks
        return None


def _snapshot_worker(evidence, session_id: str, project_hash: str | None, phase: str, ts: float, cwd: str) -> None:
    """Read memory files and hand off a snapshot."""
    try:
        evidence.memory(session_id, project_hash, phase, ts, cwd)
    except Exception as exc:  # noqa: BLE001 — best-effort; never crash hooks
        logger.debug("memory snapshot (%s) failed for %s: %s", phase, session_id, exc)


def _maybe_snapshot_claude_memory(evidence, data: dict, session_id: str, cwd: str, phase: str, ts: float) -> None:
    """Spawn a background thread to snapshot Claude memory for this session.

    No-op unless the hook payload came from a Claude user/project hook.
    """
    if evidence.writer is None or not session_id or not _is_claude_hook(data):
        return
    project_hash = _derive_claude_project_hash(cwd)
    threading.Thread(
        target=_snapshot_worker,
        args=(evidence, session_id, project_hash, phase, ts, cwd),
        daemon=True,
        name=f"mem-snap-{phase}-{session_id[:8]}",
    ).start()


_WRITE_TOOL_OPERATIONS = {
    "Write": "write",
    "Edit": "edit",
    "MultiEdit": "multi_edit",
    "NotebookEdit": "edit",
}


def _normalise_write_path(raw_path: str, cwd: str) -> str:
    path = Path(raw_path)
    if not path.is_absolute() and cwd:
        path = Path(cwd) / path
    return str(path)


def _extract_file_write_row(
    *,
    ts: float,
    session_id: str,
    tool: str,
    tool_name: str,
    detail: dict,
    tool_input: object,
) -> FileWriteRow | None:
    operation = _WRITE_TOOL_OPERATIONS.get(tool_name)
    if not operation:
        return None
    input_data = tool_input if isinstance(tool_input, dict) else {}
    raw_path = input_data.get("file_path") or input_data.get("path") or detail.get("file_path") or detail.get("path")
    if not raw_path:
        return None
    content = input_data.get("content") or input_data.get("new_string") or input_data.get("text") or ""
    content_hash = ""
    size_bytes = 0
    if isinstance(content, str) and content:
        content_bytes = content.encode("utf-8", errors="replace")
        content_hash = hashlib.sha256(content_bytes).hexdigest()[:16]
        size_bytes = len(content_bytes)
    cwd = str(detail.get("cwd", ""))
    return FileWriteRow(
        ts=ts,
        session_id=session_id,
        tool=tool,
        tool_name=tool_name,
        operation=operation,
        path=_normalise_write_path(str(raw_path), cwd),
        project_path=cwd,
        pid=int(detail.get("pid", 0) or 0),
        source_event_kind="hook:PostToolUse",
        source_event_id=str(detail.get("tool_use_id", "")),
        content_hash=content_hash,
        size_bytes=size_bytes,
        detail={"tool_use_id": detail.get("tool_use_id", ""), "input_keys": sorted(input_data.keys())},
    )


class IngestRoutes:
    def _receive_hook(self) -> None:
        """Receive Claude Code hook events via HTTP POST.

        Stores them as history events and forwards to SSE clients.
        Expected body: JSON with at minimum {event, session_id} plus
        event-specific fields from the Claude Code hook system.
        """
        content_length = self._content_length()
        if content_length is None:
            return
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

        if data.get("_aictl_verify"):
            # `aictl hooks verify` pings every event with a synthetic payload
            # (session_id "aictl-verify"). It only needs the HTTP round-trip;
            # persisting it would create a phantom session in every session
            # list and skew analytics.
            logger.debug("Hook verify ping received: %s", event_name)
            self._json_response_raw(b'{"ok":true,"verify":true}')
            return

        received_at = time.time()
        # Derive tool from explicit field, or session_id pattern "tool:pid:ts",
        # or fall back to "claude-code" (the most common hook source).
        tool = data.get("tool", "") or _tool_from_hook_source(data)
        if not tool and session_id and ":" in session_id:
            tool = session_id.split(":")[0]
        if not tool:
            tool = "claude-code"
        ts = _sane_ts(data.get("ts")) or received_at

        hook_pid = int(data.get("pid", 0) or 0)
        facts = self.server.store.session_facts
        evidence = self.server.store.session_evidence
        hook_call = _hook_call_row(
            data, tool=tool, event=event_name, session_id=session_id, cwd=cwd, pid=hook_pid, received_at=received_at
        )
        ts = facts.hook_time(hook_call.call_id, ts)
        meta = data.get("aictl_hook")
        if isinstance(meta, dict) and isinstance(meta.get("wrapped"), dict):
            # A user's own hook, run through the wrapper: aictl's hook on the same
            # event reports the event itself, so only the call is stored.
            facts.hook(hook_call)
            self._json_response_raw(b'{"ok":true}')
            return
        _HOOK_SKIP = {"event", "hook_event_name", "session_id", "tool", "cwd", "ts", "pid"}
        detail = {"session_id": session_id, "cwd": cwd, **{k: v for k, v in data.items() if k not in _HOOK_SKIP}}
        if hook_pid:
            detail["pid"] = hook_pid

        event_record = {"ts": ts, "tool": tool, "kind": f"hook:{event_name}", "detail": detail}

        facts.events([EventRow(ts, tool, event_record["kind"], detail, session_id, hook_pid)],
                     source="hook", source_key=hook_call.call_id)
        facts.hook(hook_call)
        if event_name in ("Init", "SessionStart"):
            facts.session(SessionRow(session_id, tool, hook_pid, cwd, model=detail.get("model", ""),
                                     started_at=ts, source="hook"), activity=ts)
            facts.link(session_id, hook_pid, tool, ts, "lead", cwd)
            _maybe_snapshot_claude_memory(evidence, data, session_id, cwd, "start", ts)
        elif event_name in ("Stop", "SessionEnd"):
            terminal = event_name == "SessionEnd"
            started_at = facts.started_at(session_id)
            facts.session(SessionRow(
                session_id, tool, project_path=cwd, model=detail.get("model", ""),
                started_at=started_at or ts, ended_at=ts if terminal else None, source="hook",
                input_tokens=int(detail.get("input_tokens", 0) or 0),
                output_tokens=int(detail.get("output_tokens", 0) or 0),
                cache_read_tokens=int(detail.get("cache_read_tokens", 0) or 0),
                cache_creation_tokens=int(detail.get("cache_creation_tokens", 0) or 0),
                cost_usd=float(detail.get("cost_usd", 0) or 0),
            ), activity=ts, terminal=terminal)
            _maybe_snapshot_claude_memory(evidence, data, session_id, cwd, "end", ts)
            if evidence.writer is not None and terminal and cwd and started_at:
                threading.Thread(
                    target=evidence.commits, args=(session_id, cwd, started_at, ts),
                    daemon=True, name=f"git-attr-{session_id[:8]}",
                ).start()
        if event_name in ("PreToolUse", "PostToolUse", "PostToolUseFailure"):
            tool_name = detail.get("tool_name", "")
            if tool_name:
                start = event_name == "PreToolUse"
                failed = event_name == "PostToolUseFailure" or bool(detail.get("is_error"))
                raw_result = detail.get("tool_response") or detail.get("result") or detail.get("error") or ""
                input_val = self.server.store.tool_calls.hook(
                    ToolInvocationRow(
                        ts=ts, session_id=session_id, tool=tool, tool_name=tool_name, pid=hook_pid,
                        project_path=cwd, is_error=int(not start and failed),
                        input=detail.get("input", detail.get("tool_input", {})),
                        result_summary=str(raw_result)[:500] if not start else "",
                        source="hook", source_event_id=detail.get("tool_use_id") or "",
                    ),
                    start=start,
                )
                if not start and not failed:
                    file_write = _extract_file_write_row(
                        ts=ts, session_id=session_id, tool=tool, tool_name=tool_name,
                        detail=detail, tool_input=input_val,
                    )
                    if file_write:
                        facts.file_writes([file_write], transcript=False)

        # Feed into entity state tracker
        self.server.entity_tracker.process_event(event_record)

        logger.debug("Hook event received: %s session=%s", event_name, session_id)

        # Respond with success
        self.server.store.request_refresh()
        self._json_response_raw(b'{"ok":true}')

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

    def _read_post_otlp(self, signal: str, max_size: int = 2_000_000) -> dict | None:
        """Read OTLP POST body, auto-detecting JSON vs protobuf."""
        transfer_encoding = self.headers.get("Transfer-Encoding", "")
        try:
            if "chunked" in transfer_encoding.lower():
                body = self._read_chunked_body(max_size)
            else:
                # Shared validator: a negative/garbage Content-Length is a 400,
                # not an rfile.read(-N) that blocks until the socket timeout.
                content_length = self._content_length()
                if content_length is None:
                    return None
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

        # OTLP exporters honour OTEL_EXPORTER_OTLP_COMPRESSION=gzip (often set
        # org-wide); a compressed body used to fail json.loads and be dropped
        # as a 400, or worse decode as an empty protobuf and return 200.
        encoding = self.headers.get("Content-Encoding", "").lower()
        if "gzip" in encoding or "deflate" in encoding:
            try:
                decoder = gzip.decompress if "gzip" in encoding else zlib.decompress
                body = decoder(body)
            except (OSError, EOFError, zlib.error):
                self.server.otel_receiver.stats.errors += 1
                self.send_error(400, "Bad Content-Encoding payload")
                return None
            if len(body) > max_size:
                self.send_error(413, "Payload too large")
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
                    415,
                    "Install opentelemetry-proto: pip install 'aictl[otel]'",
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
            except Exception as exc:  # noqa: BLE001 — reject invalid vendor protobuf
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
            except Exception as exc:  # noqa: BLE001 — reject invalid vendor protobuf
                logger.debug("Protobuf parse failed: %s", exc)

        logger.warning(
            "OTel: invalid body (Content-Type: %s, %d bytes)",
            content_type,
            len(body),
        )
        self.server.otel_receiver.stats.errors += 1
        self.send_error(400, "Invalid JSON")
        return None

    def _capture_otlp(self, signal: str, data: dict) -> bool:
        """Acknowledge exports accepted by the writer queue."""
        store = self.server.store
        sink = store.history_store.otlp
        if sink is None:
            return True
        try:
            sink.ingest(signal, data, keep_text=store.session_facts.keeps_text(),
                        admit_metrics=self.server.raw_otel_metrics.accept)
        except ValueError:
            logger.exception("Kusto rejected malformed OTel %s data", signal)
            self.send_error(400, "Invalid OTel export")
            return False
        except Exception:
            logger.exception("Kusto did not accept the OTel %s export", signal)
            self.send_error(503, "Kusto ingestion unavailable; retry the export")
            return False
        return True

    def _receive_otel_metrics(self) -> None:
        self._receive_otel("metrics")

    def _receive_otel_logs(self) -> None:
        self._receive_otel("logs")

    def _receive_otel_traces(self) -> None:
        self._receive_otel("traces")

    def _receive_otel(self, signal: str) -> None:
        data = self._read_post_otlp(signal)
        if data is None or not self._capture_otlp(signal, data):
            return
        store = self.server.store
        receiver = self.server.otel_receiver
        facts = store.session_facts

        def samples_received(samples):
            sink = store._sink
            if sink is not None:
                sink.emit_otel(samples)

        try:
            if signal == "metrics":
                receiver.ingest_metrics(data, samples_received)
            else:
                if signal == "traces":
                    samples, events = receiver.parse_traces(data)
                    samples_received(samples)
                else:
                    events = receiver.parse_logs(data)
                    store.tool_calls.record(receiver.extract_tool_invocations(events))
                facts.events(events, source=signal)
                requests = receiver.extract_requests(events)
                facts.requests(requests)
                for request in requests:
                    sid, ts = request.session_id, request.source_ts or request.ts
                    if sid:
                        facts.session(SessionRow(sid, request.tool, request.pid, started_at=ts, source="otel"))
                        facts.link(sid, request.pid, request.tool, ts, "lead")
                links = receiver.take_trace_links()
                try:
                    facts.trace_links(links)
                except Exception:
                    receiver.restore_trace_links(links)
                    raise
                if signal == "logs" and events:
                    store.request_refresh()
        except Exception:
            logger.exception("Error processing OTel %s", signal)
            self.server.otel_receiver.stats.errors += 1
            self.send_error(503 if facts.writer is not None else 500, "OTel processing failed; retry the export")
            return
        self._json_response_raw(b'{"ok":true}')
