# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Session analyzer — builds live transcripts from streaming events.

The analyzer maintains an in-memory cache of active :class:`SessionTranscript`
objects and exposes :meth:`ingest_event` for incremental updates.  It is
independent of any UI layer and can be consumed by the dashboard, CLI, or
external tools.
"""

from __future__ import annotations

import logging
import time
from collections import OrderedDict
from typing import Any

from ..storage import EventRow
from .session_id import SessionIdentity, resolve_session_id, can_merge, merge_identities
from .transcript import Action, ActionKind, Turn, SessionTranscript

log = logging.getLogger(__name__)

# Keep at most this many completed transcripts in memory
_MAX_CACHED = 200
# Transcript is "done" when no event for this many seconds
_STALE_SECONDS = 600


def _num(v: Any) -> float:
    """Coerce a value to float, defaulting to 0."""
    if v is None or v == "":
        return 0.0
    try:
        return float(v)
    except (ValueError, TypeError):
        return 0.0


def _extract_tool_args_summary(detail: dict) -> str:
    """Extract a short summary of tool invocation arguments."""
    tool_input = detail.get("input", detail.get("tool_input", ""))
    if isinstance(tool_input, dict):
        for key in ("file_path", "command", "pattern", "query",
                     "path", "url", "description"):
            if key in tool_input:
                return str(tool_input[key])[:200]
    if isinstance(tool_input, str):
        return tool_input[:200]
    params = detail.get("tool_parameters", "")
    if isinstance(params, str):
        return params[:200]
    return ""


def _extract_prompt(detail: dict) -> str:
    """Extract user prompt text from event detail."""
    msg = (detail.get("message")
           or detail.get("content")
           or detail.get("prompt")
           or detail.get("copilot_chat.user_request")
           or detail.get("body") or "")
    if isinstance(msg, dict):
        msg = msg.get("stringValue", str(msg))
    msg = str(msg).strip() if msg else ""
    if msg in ("<REDACTED>", "REDACTED") or "REDACTED" in msg.upper():
        return ""
    return msg


def _extract_api_tokens(detail: dict) -> tuple[int, int, int, int]:
    """Extract (input, output, cache_read, cache_creation) tokens."""
    in_tok = int(_num(detail.get("input_tokens",
                 detail.get("gen_ai.usage.input_tokens",
                 detail.get("gen_ai.usage.prompt_tokens", 0)))))
    out_tok = int(_num(detail.get("output_tokens",
                  detail.get("gen_ai.usage.output_tokens",
                  detail.get("gen_ai.usage.completion_tokens", 0)))))
    cache_r = int(_num(detail.get("cache_read_tokens",
                  detail.get("gen_ai.usage.cache_read.input_tokens", 0))))
    cache_c = int(_num(detail.get("cache_creation_tokens", 0)))
    return in_tok, out_tok, cache_r, cache_c


def _extract_model(detail: dict) -> str:
    """Extract model name from event detail."""
    return (detail.get("model")
            or detail.get("gen_ai.request.model")
            or detail.get("gen_ai.response.model")
            or detail.get("span.name") or "")


class SessionAnalyzer:
    """Incremental session transcript builder.

    Feed events via :meth:`ingest_event`.  Retrieve transcripts via
    :meth:`get_transcript` or :meth:`get_active_transcripts`.

    The analyzer resolves session identity automatically, merging
    correlator/hook/OTel IDs that refer to the same session.
    """

    def __init__(self, *, max_cached: int = _MAX_CACHED,
                 stale_seconds: float = _STALE_SECONDS):
        # canonical_id → SessionTranscript
        self._transcripts: OrderedDict[str, SessionTranscript] = OrderedDict()
        # alias → canonical_id (for fast lookup by any known ID)
        self._id_map: dict[str, str] = {}
        # pid → canonical_id (for PID-based lookups)
        self._pid_map: dict[int, str] = {}
        # canonical_id → SessionIdentity
        self._identities: dict[str, SessionIdentity] = {}
        self._max_cached = max_cached
        self._stale_seconds = stale_seconds

    # ── Public API ──────────────────────────────────────

    def ingest_event(self, event: EventRow) -> SessionTranscript | None:
        """Process a single event and update the relevant transcript.

        Returns the updated transcript, or None if the event couldn't be
        attributed to a session.
        """
        session_id = event.session_id or ""
        detail = event.detail if isinstance(event.detail, dict) else {}
        pid = event.pid or int(detail.get("pid", 0) or 0)
        tool = event.tool or ""
        kind = event.kind or ""

        # Resolve identity
        transcript = self._resolve_transcript(
            session_id=session_id, tool=tool, pid=pid, ts=event.ts,
            detail=detail, kind=kind,
        )
        if not transcript:
            return None

        transcript.last_updated = event.ts

        # Dispatch to handler
        if kind.startswith("hook:"):
            self._handle_hook(transcript, event, kind[5:], detail)
        elif kind.startswith("otel:"):
            self._handle_otel(transcript, event, kind[5:], detail)
        elif kind in ("session_start", "session_end", "file_modified"):
            self._handle_correlator(transcript, event, kind, detail)

        return transcript

    def get_transcript(self, session_id: str) -> SessionTranscript | None:
        """Retrieve transcript by any known ID (canonical, alias, or correlator)."""
        canonical = self._id_map.get(session_id, session_id)
        return self._transcripts.get(canonical)

    def get_transcript_by_pid(self, pid: int) -> SessionTranscript | None:
        """Retrieve transcript by process ID."""
        canonical = self._pid_map.get(pid)
        return self._transcripts.get(canonical) if canonical else None

    def get_active_transcripts(self, cutoff_seconds: float = 300) -> list[SessionTranscript]:
        """Return transcripts active within the last *cutoff_seconds*."""
        cutoff = time.time() - cutoff_seconds
        return [
            t for t in self._transcripts.values()
            if t.last_updated >= cutoff
        ]

    def get_all_transcripts(self) -> list[SessionTranscript]:
        """Return all cached transcripts (active + recent)."""
        return list(self._transcripts.values())

    def gc(self) -> int:
        """Garbage-collect stale transcripts. Returns count removed."""
        cutoff = time.time() - self._stale_seconds
        stale = [
            sid for sid, t in self._transcripts.items()
            if t.last_updated < cutoff and not t.is_live
        ]
        for sid in stale:
            self._remove_transcript(sid)
        # LRU eviction if still over limit
        while len(self._transcripts) > self._max_cached:
            oldest_id, _ = self._transcripts.popitem(last=False)
            self._cleanup_maps(oldest_id)
        return len(stale)

    # ── Transcript resolution ───────────────────────────

    def _resolve_transcript(self, *, session_id: str, tool: str,
                            pid: int, ts: float,
                            detail: dict,
                            kind: str = "") -> SessionTranscript | None:
        """Find or create the transcript for this event."""
        # Try direct lookup by session_id
        if session_id:
            canonical = self._id_map.get(session_id)
            if canonical and canonical in self._transcripts:
                t = self._transcripts[canonical]
                if pid:
                    t.pids.add(pid)
                    self._pid_map[pid] = canonical
                return t

        # Try PID lookup
        if pid:
            canonical = self._pid_map.get(pid)
            if canonical and canonical in self._transcripts:
                t = self._transcripts[canonical]
                if session_id:
                    t.source_ids.append(session_id)
                    self._id_map[session_id] = canonical
                return t

        # No match — create new
        if not session_id and not pid:
            return None

        # Determine source from event kind
        is_hook = kind.startswith("hook:")
        is_otel = kind.startswith("otel:")

        identity = resolve_session_id(
            hook_id=session_id if is_hook else "",
            otel_id=session_id if is_otel else "",
            correlator_id=session_id if (not is_hook and not is_otel) else "",
            tool=tool,
            pid=pid,
            start_ts=ts,
            workspace=detail.get("cwd", detail.get("project_path", "")),
        )

        transcript = SessionTranscript(
            session_id=identity.canonical_id,
            tool=tool,
            project=identity.project,
            workspace=identity.workspace,
            started_at=ts,
            last_updated=ts,
            source_ids=identity.source_ids[:],
            pids=set(identity.pids),
        )
        self._register_transcript(transcript, identity)
        # Also map the original session_id if it differs from canonical
        if session_id and session_id != identity.canonical_id:
            self._id_map[session_id] = identity.canonical_id
        return transcript

    def _register_transcript(self, transcript: SessionTranscript,
                             identity: SessionIdentity) -> None:
        """Register a new transcript and its identity mappings."""
        cid = transcript.session_id
        self._transcripts[cid] = transcript
        self._identities[cid] = identity
        self._id_map[cid] = cid
        for alias in identity.source_ids:
            self._id_map[alias] = cid
        for pid in identity.pids:
            self._pid_map[pid] = cid

    def _remove_transcript(self, canonical_id: str) -> None:
        self._transcripts.pop(canonical_id, None)
        self._cleanup_maps(canonical_id)

    def _cleanup_maps(self, canonical_id: str) -> None:
        identity = self._identities.pop(canonical_id, None)
        if identity:
            for alias in identity.source_ids:
                self._pid_map.pop(alias, None)  # type: ignore
                self._id_map.pop(alias, None)
            for pid in identity.pids:
                if self._pid_map.get(pid) == canonical_id:
                    del self._pid_map[pid]
        self._id_map.pop(canonical_id, None)

    # ── Hook event handlers ─────────────────────────────

    def _handle_hook(self, transcript: SessionTranscript, event: EventRow,
                     hook_name: str, detail: dict) -> None:
        if hook_name == "UserPromptSubmit":
            prompt = _extract_prompt(detail)
            transcript.start_turn(event.ts, prompt)

        elif hook_name in ("Init", "SessionStart"):
            transcript.add_lifecycle_event({
                "ts": event.ts, "type": "session_start",
                "source": "hook", "tool": event.tool,
                "cwd": detail.get("cwd", ""),
                "model": detail.get("model", ""),
            })
            if detail.get("model"):
                transcript.model = detail["model"]
            transcript.is_live = True

        elif hook_name == "SessionEnd":
            transcript.add_lifecycle_event({
                "ts": event.ts, "type": "session_end",
                "source": "hook", "tool": event.tool,
            })
            transcript.ended_at = event.ts
            transcript.is_live = False

        elif hook_name == "PreToolUse":
            turn = transcript.current_turn
            if turn is None:
                turn = transcript.start_turn(event.ts)
            tool_name = detail.get("tool_name", detail.get("name", ""))
            turn.add_action(Action(
                ts=event.ts,
                kind=ActionKind.TOOL_USE,
                name=tool_name,
                input_summary=_extract_tool_args_summary(detail),
                detail={"tool_use_id": detail.get("tool_use_id", "")},
            ))

        elif hook_name == "PostToolUse":
            turn = transcript.current_turn
            if turn and turn.actions:
                tool_name = detail.get("tool_name", detail.get("name", ""))
                for action in reversed(turn.actions):
                    if (action.kind == ActionKind.TOOL_USE
                            and action.name == tool_name
                            and action.duration_ms == 0):
                        action.duration_ms = round(
                            (event.ts - action.ts) * 1000)
                        result = detail.get("result", detail.get("output", ""))
                        if isinstance(result, str):
                            action.output_summary = result[:200]
                        break

        elif hook_name == "PreCompact":
            transcript.add_lifecycle_event({
                "ts": event.ts, "type": "compaction_start",
                "source": "hook",
            })

        elif hook_name == "PostCompact":
            transcript.add_lifecycle_event({
                "ts": event.ts, "type": "compaction",
                "source": "hook",
                "compaction_count": detail.get(
                    "compaction_count", detail.get("count", 0)),
            })

        elif hook_name == "SubagentStart":
            turn = transcript.current_turn
            if turn is None:
                turn = transcript.start_turn(event.ts)
            agent_id = detail.get("agent_id",
                                  detail.get("subagent_id", ""))
            task = detail.get("task", detail.get("description", ""))
            turn.add_action(Action(
                ts=event.ts,
                kind=ActionKind.SUBAGENT,
                name=agent_id or "subagent",
                input_summary=task[:200] if task else "",
            ))

    # ── OTel event handlers ─────────────────────────────

    def _handle_otel(self, transcript: SessionTranscript, event: EventRow,
                     otel_name: str, detail: dict) -> None:
        if otel_name in ("user_prompt", "user_message"):
            prompt = _extract_prompt(detail)
            transcript.start_turn(event.ts, prompt)

        elif ("api_request" in otel_name
              or otel_name.startswith("chat ")
              or "inference" in otel_name):
            model = _extract_model(detail)
            in_tok, out_tok, cache_r, cache_c = _extract_api_tokens(detail)
            dur = int(_num(detail.get("duration_ms",
                           detail.get("duration", 0))))

            turn = transcript.current_turn
            if turn is None:
                # Synthesize user message from Copilot's embedded request
                user_req = detail.get("copilot_chat.user_request", "")
                turn = transcript.start_turn(
                    event.ts, str(user_req)[:2000] if user_req else "")

            turn.add_action(Action(
                ts=event.ts,
                kind=ActionKind.API_CALL,
                name=model,
                tokens_in=in_tok,
                tokens_out=out_tok,
                cache_read=cache_r,
                cache_creation=cache_c,
                duration_ms=dur,
                detail={
                    k: v for k, v in {
                        "ttft_ms": int(_num(
                            detail.get("copilot_chat.time_to_first_token", 0))),
                        "agent_name": detail.get("gen_ai.agent.name", ""),
                        "finish_reasons": detail.get(
                            "gen_ai.response.finish_reasons", []),
                    }.items() if v
                },
            ))

            # Also extract response text if available
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
            if resp_text or out_tok > 0:
                turn.add_action(Action(
                    ts=event.ts + (dur / 1000 if dur else 0.1),
                    kind=ActionKind.API_RESPONSE,
                    name=model,
                    output_summary=resp_text[:200],
                    tokens_out=out_tok,
                    duration_ms=dur,
                ))

        elif "tool_decision" in otel_name or "tool_result" in otel_name:
            turn = transcript.current_turn
            if turn is None:
                turn = transcript.start_turn(event.ts)
            tool_name = detail.get("tool_name",
                         detail.get("name",
                         detail.get("span.name", otel_name)))
            is_result = "tool_result" in otel_name
            turn.add_action(Action(
                ts=event.ts,
                kind=ActionKind.TOOL_USE,
                name=tool_name,
                input_summary=_extract_tool_args_summary(detail),
                success=(detail.get("success") == "true"
                         if "success" in detail else None),
                duration_ms=int(_num(detail.get("duration_ms", 0))),
                detail={
                    "subtype": "result" if is_result else "decision",
                    "decision": detail.get("decision", ""),
                    "result_size": detail.get("tool_result_size_bytes", ""),
                },
            ))

        elif otel_name == "exception":
            turn = transcript.current_turn
            if turn is None:
                turn = transcript.start_turn(event.ts)
            turn.add_action(Action(
                ts=event.ts,
                kind=ActionKind.ERROR,
                name=detail.get("exception.type", "error"),
                output_summary=detail.get("exception.message", "")[:200],
                success=False,
            ))

        elif otel_name.startswith("invoke_agent") or "subagent" in otel_name.lower():
            turn = transcript.current_turn
            if turn is None:
                turn = transcript.start_turn(event.ts)
            agent_name = (otel_name.replace("invoke_agent ", "").strip()
                          or detail.get("agent_id", "agent"))
            turn.add_action(Action(
                ts=event.ts,
                kind=ActionKind.SUBAGENT,
                name=agent_name,
            ))

        elif otel_name == "copilot_chat.session.start":
            transcript.add_lifecycle_event({
                "ts": event.ts, "type": "session_start",
                "source": "otel", "tool": event.tool,
            })

    # ── Correlator event handlers ───────────────────────

    def _handle_correlator(self, transcript: SessionTranscript,
                           event: EventRow, kind: str,
                           detail: dict) -> None:
        if kind == "session_start":
            transcript.add_lifecycle_event({
                "ts": event.ts, "type": "session_start",
                "source": "correlator", "tool": event.tool,
                "pid": detail.get("pid", 0),
            })
            transcript.is_live = True

        elif kind == "session_end":
            transcript.add_lifecycle_event({
                "ts": event.ts, "type": "session_end",
                "source": "correlator", "tool": event.tool,
            })
            transcript.ended_at = event.ts
            transcript.is_live = False

        elif kind == "file_modified":
            turn = transcript.current_turn
            if turn:
                turn.add_action(Action(
                    ts=event.ts,
                    kind=ActionKind.FILE_EDIT,
                    name=detail.get("path", detail.get("file", "")),
                    input_summary=detail.get("change", ""),
                ))
