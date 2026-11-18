"""Typed steps from Copilot CLI events.jsonl. A step is evidence, not a billable call.

The CLI/SDK event envelope identifies a record; messageId, apiCallId and toolCallId
identify different, sometimes shared entities. None is a trace or span ID.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from typing import Any

from ..context_audit import _redact
from ..storage import SessionStepRow, _dedup_key

_LABEL = re.compile(r"[A-Za-z0-9_][A-Za-z0-9_.:+-]{0,255}\Z")
_CREDENTIAL = re.compile(
    r"(?i)\b(bearer[ \t]+)[\w.~+/-]+=*|\bgithub_pat_[a-z0-9_]+"
    r"|\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{4,}"
    r"|-----BEGIN ([A-Z ]*PRIVATE KEY)-----[\s\S]*?(?:-----END \2-----|\Z)"
    r"|(--(?:api[-_]key|token|password|secret)(?:[ \t]+|=))(?:\"[^\"\n]*\"|'[^'\n]*'|[^\s;&|]+)"
)
_SHELLS = {"bash", "powershell"}
_SOURCES = frozenset({
    "user.message", "assistant.message", "assistant.turn_start", "assistant.turn_end",
    "session.usage_record", "assistant.usage", "tool.execution_start", "tool.execution_complete",
    "subagent.started", "subagent.completed", "subagent.failed", "skill.invoked", "session.skills_loaded",
    "session.usage_info", "session.shutdown", "session.compaction_start", "session.compaction_complete",
    "session.truncation",
})


def redact_step_text(value: str) -> str:
    return _redact(_CREDENTIAL.sub(lambda m: (m[1] or m[3] or "") + "<redacted>", value))


def _label(value: Any) -> str:
    """IDs and names are metadata even with capture off. Never use freeform display titles or argv."""
    if isinstance(value, str) and _LABEL.fullmatch(value) and redact_step_text(value) == value:
        return value
    return ""


def _dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _tool_name(data: dict, field: str) -> str:
    if data.get("mcpServerName"):
        server = _label(data["mcpServerName"])
        tool = _label(data.get("mcpToolName") or data.get(field))
        return f"mcp__{server}__{tool}" if server and tool else "mcp"
    return _label(data.get(field))


def _count(value: Any, *, signed: bool = False) -> int | None:
    if type(value) is int and (-(2**63) if signed else 0) <= value < 2**63:
        return value
    return None


def _context(data: dict) -> dict:
    return {field: _count(data.get(key)) for field, key in (
        ("context_tokens", "currentTokens"), ("context_limit", "tokenLimit"),
        ("system_tokens", "systemTokens"), ("conversation_tokens", "conversationTokens"),
        ("tool_tokens", "toolDefinitionsTokens"),
    )}


class CopilotSteps:
    """One reader per file; reset with CopilotFacts when replay starts from the beginning."""

    def __init__(self, sid: str, add: Callable[[SessionStepRow], None]) -> None:
        self.sid = sid
        self.add = add
        self.record = 0
        self.order = 0
        # Only exact call IDs carry attribution across records. Never retain arguments or output.
        self.calls: dict[str, dict[str, str]] = {}
        self.children: dict[str, str] = {}

    def feed(self, obj: dict, data: dict, ts: float, cwd: str) -> None:
        self.record += 1
        source = obj.get("type")
        if not isinstance(source, str) or source not in _SOURCES or obj.get("checkpoint") is True:
            return
        agent = _label(obj.get("agentId")) or _label(data.get("agentId"))
        parent_call = _label(data.get("parentToolCallId"))
        is_agent_event = source.startswith("subagent.")
        if not agent and not is_agent_event:
            agent = self.children.get(parent_call, "")
        links = {
            "agent_id": agent, "turn_id": _label(data.get("turnId")),
            "message_id": _label(data.get("messageId")), "request_id": _label(data.get("requestId")),
            "round_id": _label(data.get("apiCallId")), "tool_call_id": _label(data.get("toolCallId")),
        }
        call = links["tool_call_id"]

        def emit(kind: str, phase: str = "", *, slot: str = "", body: Any = None, **fields: Any) -> None:
            # Key by the envelope, not the entity whose lifecycle this record describes. The
            # old format lacks event IDs; its 1-based position distinguishes even identical lines.
            event = _label(obj.get("id"))
            identity = event or f"#{self.record}:{ts}"
            key = _dedup_key("\0".join(("copilot-step", self.sid, identity, source, kind, slot)))
            self.order += 1
            if isinstance(body, str) and body:
                fields["text"] = body
            elif body is not None and not isinstance(body, str):
                fields["text_status"] = "omitted"
            self.add(SessionStepRow(
                step_key=key, ts=ts, session_id=self.sid, tool="copilot-cli", project_path=cwd,
                source=source, source_order=self.order, kind=kind, phase=phase, **(links | fields),
            ))

        if source == "user.message":
            origin = data.get("source")
            from_agent = (
                bool(data.get("isAutopilotContinuation"))
                or origin == "autopilot" or (isinstance(origin, str) and origin.startswith("agent-"))
            )
            # Other sources can be hidden skill/system injections. Do not retain them or transformedContent.
            if origin not in (None, "", "user", "autopilot") and not (isinstance(origin, str) and origin.startswith("agent-")):
                return
            emit("agent_prompt" if from_agent else "message", role="user", body=data.get("content"))
        elif source == "assistant.message":
            public = data.get("phase") in (None, "", "commentary", "response", "final", "final_answer")
            emit("message", role="assistant", body=data.get("content") if public else None,
                 text_status="" if public else "omitted")
            requests = data.get("toolRequests")
            for i, req in enumerate(requests if isinstance(requests, list) else ()):
                if not isinstance(req, dict):
                    continue
                tool_id = _label(req.get("toolCallId"))
                name = _tool_name(req, "name")
                request = links | {"tool_call_id": tool_id, "name": name}
                if tool_id:
                    self.calls[tool_id] = request
                args = req.get("arguments")
                body = _dict(args).get("command") if name in _SHELLS else _dict(args).get("prompt") if name == "task" else None
                emit("tool_call", "requested", slot=str(i), body=body,
                     text_status="omitted" if args and not body else "", **request)
        elif source in ("assistant.turn_start", "assistant.turn_end"):
            emit("turn", "started" if source.endswith("_start") else "ended", name=_label(data.get("model")))
        elif source in ("session.usage_record", "assistant.usage"):
            usage = _dict(data.get("usage")) if source == "session.usage_record" else data
            if usage:
                # Input includes cached tokens here: this is reported model input, not a
                # measurement of the session's current context (nor an extra charge).
                emit("round", "usage", name=_label(usage.get("model")),
                     request_id=_label(usage.get("requestId") or usage.get("providerCallId")),
                     round_id=_label(usage.get("apiCallId")), input_tokens=_count(usage.get("inputTokens")),
                     output_tokens=_count(usage.get("outputTokens")),
                     tool_tokens=_count(usage.get("toolTokenCount")), estimated=0)
        elif source in ("tool.execution_start", "tool.execution_complete"):
            prior = self.calls.get(call, {})
            links = prior | {k: v for k, v in links.items() if v}
            name = _tool_name(data, "toolName") or prior.get("name", "")
            links["name"] = name
            if source == "tool.execution_start":
                if call:
                    self.calls[call] = links
                args = _dict(data.get("arguments"))
                emit("tool_call", "started", text_status="omitted" if data.get("arguments") else "")
                if name in _SHELLS and isinstance(args.get("command"), str):
                    emit("command", "started", body=args["command"])
                elif name == "task" and isinstance(args.get("prompt"), str):
                    # The sender is known now; the child (if started) reports this same toolCallId.
                    emit("agent_prompt", "delegated", role="assistant", body=args["prompt"])
            else:
                self.calls.pop(call, None)
                code = _count(_dict(data.get("shellExecution")).get("exitCode"), signed=True)
                failed = data.get("success") is False or code not in (0, None)
                result = data.get("result")
                body = result if isinstance(result, str) else _dict(result).get("content")
                if not body and failed:
                    body = _dict(data.get("error")).get("message")
                emit("tool_result", "failed" if failed else "completed", role="tool", body=body, exit_code=code,
                     text_status="omitted" if result and not body else "")
                metrics = _dict(_dict(data.get("toolTelemetry")).get("metrics"))
                current = _count(metrics.get("context_current_tokens"))
                limit = _count(metrics.get("context_token_limit"))
                if current is not None or limit is not None:
                    emit("context", "snapshot", context_tokens=current, context_limit=limit, estimated=0)
        elif source in ("subagent.started", "subagent.completed", "subagent.failed"):
            # The envelope's parentId is the preceding *event*, not the parent agent.
            owner = _label(data.get("parentId")) or self.children.get(parent_call, "") or self.calls.get(call, {}).get("agent_id", "")
            if source == "subagent.started" and call and agent:
                self.children[call] = agent
            emit("agent", source.split(".")[1], agent_id=agent or self.children.get(call, ""),
                 parent_agent_id=owner, name=_label(data.get("agentName")))
        elif source == "skill.invoked":
            emit("skill", "loaded" if data.get("trigger") == "context-load" else "invoked",
                 name=_label(data.get("name")), text_status="omitted" if data.get("content") else "")
        elif source == "session.skills_loaded":
            skills = data.get("skills")
            for i, skill in enumerate(skills if isinstance(skills, list) else ()):
                if name := _label(_dict(skill).get("name")):
                    emit("skill", "resolved", slot=str(i), name=name)
        elif source == "session.truncation":
            # These are message tokens only, not a full context snapshot.
            emit("context", "truncation", before_tokens=_count(data.get("preTruncationTokensInMessages")),
                 after_tokens=_count(data.get("postTruncationTokensInMessages")),
                 context_limit=_count(data.get("tokenLimit")), estimated=0)
        elif source in ("session.usage_info", "session.shutdown", "session.compaction_start", "session.compaction_complete"):
            counts = _context(data)
            if source == "session.compaction_complete":
                counts.update(before_tokens=_count(data.get("preCompactionTokens")), after_tokens=_count(data.get("postCompactionTokens")))
                phase = "compaction_failed" if data.get("success") is False else "compaction_complete"
            elif source == "session.compaction_start":
                phase = "compaction_start"
            else:
                if not any(n is not None for n in counts.values()):
                    return
                phase = "shutdown" if source == "session.shutdown" else "snapshot"
            emit("context", phase, estimated=0, text_status="omitted" if data.get("summaryContent") else "", **counts)
