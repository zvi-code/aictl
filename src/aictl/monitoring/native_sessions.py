"""Bounded current-output adapters for runtime-identified native session files.

These adapters do not calculate usage, cost, prompts, tool arguments, or stored
history. The history ingester and these active tails share JSONL framing.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from collections import OrderedDict
from collections.abc import Callable
from pathlib import Path

from ..dashboard.live.protocol import stable_id
from ..dashboard.projection_utils import mask_secrets
from ..ingesters._common import coerce_ts
from ..ingesters.transcript_tail import records

INITIAL_TAIL_BYTES = 128 * 1024
MAX_PASS_BYTES = 512 * 1024
MAX_LINE_BYTES = 256 * 1024
MAX_TEXT_CHARS = 8000
MAX_SEEN_EVENTS = 2048
_TYPES = frozenset(
    value.encode()
    for value in (
        "session.start",
        "session.resume",
        "session.shutdown",
        "session.model_change",
        "assistant.message",
        "assistant.turn_start",
        "assistant.turn_end",
        "tool.execution_start",
        "tool.execution_complete",
        "permission.requested",
        "permission.completed",
        "subagent.started",
        "subagent.completed",
        "subagent.failed",
        "session_meta",
        "turn_context",
        "response_item",
        "event_msg",
        "assistant",
    )
)
_END_REASONS = frozenset({"end_turn", "stop", "stop_sequence"})
_COPILOT_TYPES = frozenset(value.decode() for value in _TYPES if b"." in value)
_CONTEXT_PROMPT = re.compile(
    rb'([,{])\s*"(?:base_instructions|developer_instructions|user_instructions|instructions|system_prompt|systemPrompt)"\s*:'
)


def _scalar(value: object, limit: int = 160) -> str:
    return mask_secrets(value)[:limit] if isinstance(value, str) else ""


def _text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            block["text"]
            for block in content
            if isinstance(block, dict)
            and block.get("type") in ("text", "output_text")
            and isinstance(block.get("text"), str)
        )
    return ""


def _fingerprint(value: object) -> str:
    raw = json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.blake2b(raw, digest_size=16).hexdigest()


class NativeSessionTail:
    """Follow only a bounded suffix and subsequent complete appended records."""

    def __init__(
        self,
        path: Path,
        tool: str,
        session_id: str,
        *,
        process_started_at: float | None = None,
    ) -> None:
        self.path = path
        self.tool = tool
        self.session_id = session_id
        self.process_started_at = process_started_at
        self.offset = 0
        self.order = 0
        self.tail_truncated = False
        self.discarded_lines = 0
        self.order_gaps = 0
        self.rewrites = 0
        self.metadata_limited = False
        self.project_path = ""
        self.status = "unknown"
        self.native_activity = "unknown"
        self.last_native_at: float | None = None
        self.evidence: dict[str, dict] = {}
        self._file_identity: tuple[int, int] | None = None
        self._initialized = False
        self._anchor = b""
        self._discarding = False
        self._seen: OrderedDict[str, str] = OrderedDict()
        self._turns: set[str] = set()
        self._calls: set[str] = set()
        self._permissions: set[str] = set()
        self._baseline_end = 0

    def _decode(self, raw: bytes, kind: bytes | None) -> object:
        if self.tool == "codex-cli" and kind in (b"session_meta", b"turn_context"):
            # Codex puts instruction bodies in metadata records. Decode only
            # the preceding payload metadata with the existing JSON decoder;
            # fields after an instruction body remain unknown.
            prompt = _CONTEXT_PROMPT.search(raw, 0, 16 * 1024)
            if prompt is not None:
                end = prompt.start() + (1 if prompt.group(1) == b"{" else 0)
                raw = raw[:end] + b"}}"
                self.metadata_limited = True
            elif len(raw) > 16 * 1024:
                self.metadata_limited = True
                return None
        return json.loads(raw)

    def _loaded(self, key: str, value: object, ts: float | None) -> None:
        if isinstance(value, (str, bool, int, float)) and value != "":
            self.evidence[key] = {
                "key": key,
                "value": _scalar(value) if isinstance(value, str) else value,
                "source": "native-session-report",
                "observed_at": ts,
            }

    def _adapt(self, obj: dict, *, appended: bool) -> dict | None:
        kind = obj.get("type")
        ts = coerce_ts(obj.get("timestamp")) or None
        if ts and self.process_started_at and ts < self.process_started_at:
            return None
        if self.process_started_at and ts is None and not appended:
            return None
        data = obj.get("data") if isinstance(obj.get("data"), dict) else {}
        message = obj.get("message") if isinstance(obj.get("message"), dict) else {}
        text = ""
        evidence: dict[str, object] = {}
        project = ""
        agent_id = ""
        event_id = obj.get("id")
        progress = ""
        state = ""
        if self.tool.startswith("copilot"):
            if kind not in _COPILOT_TYPES:
                return None
            agent_id = _scalar(
                obj.get("agentId") or data.get("parentAgentTaskId") or data.get("parentToolCallId"), 120
            )
            if kind in ("session.start", "session.resume"):
                evidence["model"] = data.get("selectedModel")
                context = data.get("context") if isinstance(data.get("context"), dict) else {}
                project = _scalar(context.get("gitRoot") or context.get("cwd"), 1000)
                state = "unknown"
            elif kind == "session.model_change":
                evidence["model"] = data.get("newModel")
            elif kind == "assistant.message":
                text = _text(data.get("content"))
                event_id = event_id or data.get("messageId")
                evidence["model"] = data.get("model")
            elif kind == "assistant.turn_start":
                if not agent_id and not data.get("parentToolCallId"):
                    self._turns.add(str(data.get("turnId") or event_id or ""))
                    state = "working"
            elif kind == "assistant.turn_end":
                if not agent_id and not data.get("parentToolCallId"):
                    self._turns.discard(str(data.get("turnId") or ""))
                    state = "working" if self._turns or self._calls else "idle"
            elif kind == "tool.execution_start":
                if not agent_id:
                    self._calls.add(str(data.get("toolCallId") or event_id or ""))
                    state = "working"
                progress = _scalar(data.get("toolName"), 80)
            elif kind == "tool.execution_complete":
                if not agent_id:
                    self._calls.discard(str(data.get("toolCallId") or ""))
            elif kind == "permission.requested":
                if not agent_id:
                    self._permissions.add(str(data.get("requestId") or event_id or ""))
                    state = "waiting"
            elif kind == "permission.completed":
                if not agent_id:
                    self._permissions.discard(str(data.get("requestId") or ""))
                    state = "working" if self._turns or self._calls else "unknown"
            elif kind == "session.shutdown":
                if not agent_id:
                    self._turns.clear()
                    self._calls.clear()
                    self._permissions.clear()
                    state = "ended"
            elif kind == "subagent.started":
                # The report belongs to this agent, not the parent's loaded model.
                agent_id = _scalar(obj.get("agentId") or data.get("toolCallId"), 120)
                progress = _scalar(data.get("agentName"), 80)
            elif kind in ("subagent.completed", "subagent.failed"):
                agent_id = _scalar(obj.get("agentId") or data.get("toolCallId"), 120)
            else:
                return None
        elif self.tool == "codex-cli":
            payload = obj.get("payload") if isinstance(obj.get("payload"), dict) else {}
            if kind == "session_meta":
                project = _scalar(payload.get("cwd"), 1000)
            elif kind == "turn_context":
                for key, native in (
                    ("model", "model"),
                    ("reasoning_effort", "effort"),
                    ("approval_policy", "approval_policy"),
                ):
                    evidence[key] = payload.get(native)
                sandbox = payload.get("sandbox_policy")
                evidence["sandbox_policy"] = sandbox.get("type") if isinstance(sandbox, dict) else sandbox
            elif (
                kind == "response_item"
                and payload.get("type") == "message"
                and payload.get("role") == "assistant"
                and payload.get("channel") in (None, "final", "commentary")
            ):
                text = _text(payload.get("content"))
                event_id = payload.get("id") or event_id
            elif kind == "event_msg" and payload.get("type") == "task_started":
                progress = "task_started"
                state = "working"
            else:
                return None
        elif self.tool == "claude-code":
            if kind != "assistant":
                return None
            text = _text(message.get("content"))
            event_id = message.get("id") or event_id or obj.get("uuid")
            evidence["model"] = message.get("model")
            project = _scalar(obj.get("cwd"), 1000)
            state = "idle" if message.get("stop_reason") in _END_REASONS else "working"
        else:
            return None

        meaningful = {key: value for key, value in evidence.items() if isinstance(value, (str, bool, int, float))}
        identity = str(event_id or _fingerprint([kind, ts, agent_id, text, meaningful, state, progress]))
        fingerprint = _fingerprint([kind, ts, agent_id, text, meaningful, state, progress])
        duplicate = self._seen.get(identity) == fingerprint
        if project and not agent_id:
            self.project_path = project
        if not agent_id:
            for key, value in meaningful.items():
                self._loaded(key, value, ts)
            if state:
                self.status = state
                self.native_activity = state if state in ("working", "idle") else "unknown"
            if self._permissions:
                self.status = "waiting"
                self.native_activity = "unknown"
        self.last_native_at = max(self.last_native_at or 0, ts or 0) or None
        if duplicate:
            return None
        self._seen[identity] = fingerprint
        self._seen.move_to_end(identity)
        while len(self._seen) > MAX_SEEN_EVENTS:
            self._seen.popitem(last=False)
        self.order += 1
        return {
            "session_id": self.session_id,
            "native_session_id": self.session_id,
            "entry_id": stable_id(self.session_id, self.tool, identity),
            "event_id": _scalar(identity, 160),
            "order": self.order,
            "kind": str(kind),
            "text": text,
            "ts": ts,
            "tool": self.tool,
            "agent_id": agent_id or None,
            "progress": progress,
        }

    def refresh(self, *, capture: str = "metadata", emit: Callable[[dict], None]) -> int:
        """Publish supported native records without storage/query dependencies."""
        count = 0
        with self.path.open("rb") as stream:
            stat = os.fstat(stream.fileno())
            identity = (stat.st_dev, stat.st_ino)
            rewritten = self._file_identity is not None and (
                identity != self._file_identity or stat.st_size < self.offset
            )
            if self._anchor and not rewritten:
                stream.seek(self.offset - len(self._anchor))
                rewritten = stream.read(len(self._anchor)) != self._anchor
            if rewritten:
                self.rewrites += 1
                if stat.st_size > INITIAL_TAIL_BYTES:
                    self.order_gaps += 1
                self._initialized = False
                self._anchor = b""
                self._discarding = False
                self._turns.clear()
                self._calls.clear()
                self._permissions.clear()
                self.status = self.native_activity = "unknown"
                self.evidence.clear()
            self._file_identity = identity
            if not self._initialized:
                self._baseline_end = stat.st_size
                self.offset = max(0, stat.st_size - INITIAL_TAIL_BYTES)
                self.tail_truncated = self.tail_truncated or bool(self.offset)
                stream.seek(self.offset)
                if self.offset:
                    # The bounded suffix can begin inside a JSON record. Do not
                    # expose or parse that fragment, including request blobs.
                    stream.readline(INITIAL_TAIL_BYTES)
                    self.offset = stream.tell()
                self._initialized = True
            stream.seek(self.offset)
            stop_at = min(stat.st_size, self.offset + MAX_PASS_BYTES)
            if self._discarding:
                while stream.tell() < stop_at:
                    line = stream.readline(min(64 * 1024, stop_at - stream.tell()))
                    self.offset = stream.tell()
                    if line.endswith(b"\n"):
                        self._discarding = False
                        break
                    if not line:
                        break
            if not self._discarding:
                for record in records(
                    stream,
                    max_line_bytes=MAX_LINE_BYTES,
                    allowed_types=_TYPES,
                    stop_at=stop_at,
                    decode=self._decode,
                ):
                    self.offset = record.offset
                    if record.discarded:
                        self.discarded_lines += 1
                        self.tail_truncated = True
                        self._discarding = not record.complete
                        if record.kind is None or record.kind in _TYPES:
                            self.order_gaps += 1
                            self.status = self.native_activity = "unknown"
                            self.evidence.clear()
                            self._turns.clear()
                            self._calls.clear()
                            self._permissions.clear()
                    if record.data is None:
                        continue
                    update = self._adapt(record.data, appended=record.offset > self._baseline_end)
                    if update is None:
                        continue
                    original = update["text"]
                    retained = capture == "full"
                    update.update(
                        text=mask_secrets(original)[:MAX_TEXT_CHARS] if retained else "",
                        content_retained=retained,
                        text_suppressed=bool(original) and not retained,
                        text_truncated=len(original) > MAX_TEXT_CHARS,
                        tail_truncated=self.tail_truncated,
                    )
                    emit(update)
                    count += 1
            if self.offset:
                stream.seek(max(0, self.offset - 64))
                self._anchor = stream.read(self.offset - stream.tell())
        return count
