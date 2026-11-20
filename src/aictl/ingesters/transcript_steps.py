"""Typed steps from Copilot CLI events.jsonl. A step is evidence, not a billable call.

The CLI/SDK event envelope identifies a record; messageId, apiCallId and toolCallId
identify different, sometimes shared entities. None is a trace or span ID.
"""

from __future__ import annotations

import hashlib
import re
from collections import deque
from collections.abc import Callable
from dataclasses import replace
from typing import TYPE_CHECKING, Any

from ..context_audit import _redact

if TYPE_CHECKING:
    from ..records import SessionStepRow, TurnRequestLink

_LABEL = re.compile(r"[A-Za-z0-9_][A-Za-z0-9_.:+-]{0,255}\Z")
_CREDENTIAL = re.compile(
    r"(?i)\b(bearer[ \t]+)[\w.~+/-]+=*|\bgithub_pat_[a-z0-9_]+"
    r"|\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{4,}"
    r"|-----BEGIN ([A-Z ]*PRIVATE KEY)-----[\s\S]*?(?:-----END \2-----|\Z)"
    r"|(--(?:api[-_]key|token|password|secret)(?:[ \t]+|=))(?:\"[^\"\n]*\"|'[^'\n]*'|[^\s;&|]+)"
)
_SHELLS = {"bash", "powershell"}
_LIFECYCLE_COMMANDS = {"/clear", "/new", "/reset", "/compact", "/model", "/models"}
_MODEL_ARG = re.compile(r"(?:gpt-|claude-|gemini-|grok-|o[134](?:-|$))[a-z0-9._-]*", re.I)
_SOURCES = frozenset({
    "user.message", "assistant.message", "assistant.turn_start", "assistant.turn_end",
    "session.usage_record", "assistant.usage", "tool.execution_start", "tool.execution_complete",
    "subagent.started", "subagent.completed", "subagent.failed", "skill.invoked", "session.skills_loaded",
    "session.usage_info", "session.shutdown", "session.compaction_start", "session.compaction_complete",
    "session.truncation", "session.context_cleared", "session.model_change", "session.snapshot_rewind",
    "command.queued", "command.execute",
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


def _api_id(value: Any) -> str:
    """Some provider completion IDs are long opaque strings with slashes, not display labels."""
    if not isinstance(value, str) or not value:
        return ""
    return _label(value) or "opaque:" + hashlib.sha256(value.encode("utf-8", "surrogatepass")).hexdigest()


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


def _session_command(text: Any, *, dispatch: bool = False) -> str:
    """A dispatch is explicit. In an ordinary message, accept only unambiguous CLI syntax."""
    if not isinstance(text, str) or not text.startswith("/") or (not dispatch and len(text) > 256):
        return ""
    if len(text.splitlines()) != 1:
        return ""
    words = text.split()
    if not words or words[0] not in _LIFECYCLE_COMMANDS:
        return ""
    cmd, args = words[0][1:], words[1:]
    if cmd == "new" and args[:1] == ["worktree"]:
        # Starts a different session; does not clear this one.
        return "new_worktree" if dispatch or len(args) == 1 else ""
    if dispatch or not args:
        return cmd
    if cmd == "model":
        if args[0] in ("--session", "-s", "--global", "--repo", "--local"):
            args = args[1:]
        if not args or (len(args) == 1 and (args[0] == "auto" or _MODEL_ARG.fullmatch(args[0]))):
            return cmd
        if len(args) == 2 and args[0] == "auto" and args[1] in ("efficiency", "balance", "intelligence"):
            return cmd
    # /clear [PROMPT] and /compact [FOCUS] accept arbitrary prose. A user.message
    # without explicit dispatch evidence cannot distinguish that prose from a mention.
    return ""


class CopilotSteps:
    """One reader per file; reset with CopilotFacts when replay starts from the beginning."""

    def __init__(self, sid: str, add: Callable[[SessionStepRow], None], add_link: Callable[[TurnRequestLink], None]) -> None:
        self.sid = sid
        self.add = add
        self.add_link = add_link
        self.record = 0
        self.order = 0
        # Only exact call IDs carry attribution across records. Never retain arguments or output.
        self.calls: dict[str, dict[str, str]] = {}
        self.children: dict[str, str] = {}
        self.open_turns: dict[str, set[str]] = {}
        self.spawn_roots: dict[str, str] = {}
        self.api_turns: dict[tuple[str, str], str] = {}
        self.waiting: dict[tuple[str, str], deque[TurnRequestLink]] = {}

    def _only_open(self, agent: str) -> str:
        turns = self.open_turns.get(agent)
        return next(iter(turns)) if turns and len(turns) == 1 else ""

    def _root(self, agent: str, turn: str) -> str:
        return self.spawn_roots.get(agent, "") if agent else turn

    def usage_link(self, obj: dict, data: dict, usage: dict, ts: float, cwd: str, *, allow_open: bool = True) -> TurnRequestLink:
        from ..records import TurnRequestLink

        """Snapshot at the usage record, not at flush. Envelope parentId is chronology, not causality."""
        parent = data.get("parentToolCallId") or usage.get("parentToolCallId")
        raw_agent = obj.get("agentId") or data.get("agentId")
        agent = _label(raw_agent) or self.children.get(_label(parent), "")
        local = ""
        if obj.get("checkpoint") is True:
            return TurnRequestLink(request_key="", ts=ts, session_id=self.sid, agent_id=agent, basis="checkpoint", project_path=cwd)
        if not agent and (raw_agent or parent):
            basis = "unknown_agent"
        elif local := _label(data.get("turnId") or usage.get("turnId")):
            basis = "explicit_turn"
        elif local := self.api_turns.get((agent, _api_id(usage.get("apiCallId"))), ""):
            basis = "api_call_id"
        elif allow_open and (local := self._only_open(agent)):
            basis = "open_turn"
        else:
            basis = "unattributed"
        root = self._root(agent, local)
        return TurnRequestLink(
            request_key="", ts=ts, session_id=self.sid, agent_id=agent, turn_id=local,
            root_session_id=self.sid if root else "", root_turn_id=root,
            basis="spawn_tool" if root and not local else basis, project_path=cwd,
        )

    def link_request(self, link: TurnRequestLink, request_key: str, api_id: Any) -> None:
        link = replace(link, request_key=request_key)
        api = _api_id(api_id)
        if api and link.basis not in ("explicit_turn", "api_call_id", "unknown_agent", "checkpoint"):
            # Usage often precedes the message carrying the definitive (apiCallId, turnId).
            # Unmatched requests already have a durable link, possibly explicitly unattributed.
            key = (link.agent_id, api)
            if turn := self.api_turns.get(key):
                link = self._from_api(link, turn)
            else:
                self.waiting.setdefault(key, deque(maxlen=16)).append(link)
                if len(self.waiting) > 1024:
                    del self.waiting[next(iter(self.waiting))]
        self.add_link(link)

    def _from_api(self, link: TurnRequestLink, turn: str) -> TurnRequestLink:
        root = link.root_turn_id if link.agent_id else turn
        return replace(link, turn_id=turn, root_turn_id=root, root_session_id=self.sid if root else "", basis="api_call_id")

    def _message_turn(self, agent: str, api: str, turn: str) -> None:
        if not api or not turn:
            return
        key = (agent, api)
        self.api_turns[key] = turn
        if len(self.api_turns) > 1024:
            del self.api_turns[next(iter(self.api_turns))]
        for link in self.waiting.pop(key, ()):
            self.add_link(self._from_api(link, turn))

    def feed(self, obj: dict, data: dict, ts: float, cwd: str) -> None:
        self.record += 1
        source = obj.get("type")
        if source in ("session.start", "session.resume", "session.shutdown") and not obj.get("checkpoint"):
            self.open_turns.clear()
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
            "round_id": _api_id(data.get("apiCallId")), "tool_call_id": _label(data.get("toolCallId")),
        }
        call = links["tool_call_id"]
        known_agent = bool(agent) or not (obj.get("agentId") or data.get("agentId") or data.get("parentToolCallId"))

        def emit(kind: str, phase: str = "", *, slot: str = "", body: Any = None, **fields: Any) -> None:
            # Key by the envelope, not the entity whose lifecycle this record describes. The
            # old format lacks event IDs; its 1-based position distinguishes even identical lines.
            event = _label(obj.get("id"))
            identity = event or f"#{self.record}:{ts}"
            from ..records import SessionStepRow, _dedup_key

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
            if not from_agent and not agent and not parent_call and not data.get("parentAgentTaskId"):
                if cmd := _session_command(data.get("content")):
                    emit("session_command", "requested", name=cmd, role="user")
        elif source in ("command.queued", "command.execute"):
            # Even command.execute is a *dispatch request*, not proof of a state change.
            if cmd := _session_command(data.get("command"), dispatch=True):
                emit("session_command", "queued" if source == "command.queued" else "dispatched", name=cmd)
        elif source == "session.model_change":
            # A fallback or host selection can change models without a user command.
            old, new = _label(data.get("previousModel")), _label(data.get("newModel"))
            transition = "\n".join(f"{key}: {value}" for key, value in (("previousModel", old), ("newModel", new)) if value)
            emit("session_command", "applied", name="model_change", body=transition)
        elif source == "session.context_cleared":
            # The RPC or runtime can clear history. No command, token count or actor is implied.
            if known_agent:
                self.open_turns.pop(agent, None)
            emit("context", "applied", name="reset", text_status="omitted" if data.get("initialMessage") else "")
        elif source == "session.snapshot_rewind":
            emit("session_command", "applied", name="rewind")
        elif source == "assistant.message":
            if known_agent:
                self._message_turn(agent, links["round_id"], links["turn_id"])
            phase = data.get("phase")
            public = phase in (None, "", "commentary", "response", "final", "final_answer")
            emit("message", (phase or "") if public else "", role="assistant", body=data.get("content") if public else None,
                 text_status="" if public else "omitted")
            requests = data.get("toolRequests")
            for i, req in enumerate(requests if isinstance(requests, list) else ()):
                if not isinstance(req, dict):
                    continue
                tool_id = _label(req.get("toolCallId"))
                name = _tool_name(req, "name")
                request = links | {"tool_call_id": tool_id, "name": name}
                if tool_id:
                    self.calls[tool_id] = request | {"turn_id": (links["turn_id"] or self._only_open(agent)) if known_agent else ""}
                args = req.get("arguments")
                body = _dict(args).get("command") if name in _SHELLS else _dict(args).get("prompt") if name == "task" else None
                emit("tool_call", "requested", slot=str(i), body=body,
                     text_status="omitted" if args and not body else "", **request)
        elif source in ("assistant.turn_start", "assistant.turn_end"):
            if known_agent and links["turn_id"]:
                turns = self.open_turns.setdefault(agent, set())
                if source == "assistant.turn_start":
                    turns.add(links["turn_id"])
                else:
                    turns.discard(links["turn_id"])
            elif known_agent and source == "assistant.turn_end":
                self.open_turns.pop(agent, None)
            emit("turn", "started" if source.endswith("_start") else "ended", name=_label(data.get("model")))
        elif source in ("session.usage_record", "assistant.usage"):
            usage = _dict(data.get("usage")) if source == "session.usage_record" else data
            if usage:
                attribution = self.usage_link(obj, data, usage, ts, cwd)
                # Input includes cached tokens here: this is reported model input, not a
                # measurement of the session's current context (nor an extra charge).
                emit("round", "usage", name=_label(usage.get("model")), turn_id=attribution.turn_id, agent_id=attribution.agent_id,
                     request_id=_label(usage.get("requestId") or usage.get("providerCallId")),
                     round_id=_api_id(usage.get("apiCallId")), input_tokens=_count(usage.get("inputTokens")),
                     output_tokens=_count(usage.get("outputTokens")),
                     tool_tokens=_count(usage.get("toolTokenCount")), estimated=0)
        elif source in ("tool.execution_start", "tool.execution_complete"):
            prior = self.calls.get(call, {})
            links = prior | {k: v for k, v in links.items() if v}
            name = _tool_name(data, "toolName") or prior.get("name", "")
            links["name"] = name
            if source == "tool.execution_start":
                if call:
                    self.calls[call] = links | {"turn_id": (links.get("turn_id") or self._only_open(links.get("agent_id", ""))) if known_agent else ""}
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
                spawning = self.calls.get(call, {})
                # The originating call belongs to the sender; this lifecycle record belongs
                # to the child. Never interpret the child's local turn ID in the root agent.
                sender = spawning.get("agent_id", "")
                self.spawn_roots[agent] = self._root(sender, spawning["turn_id"]) if spawning.get("turn_id") and owner == sender else ""
            if source != "subagent.started" and (ended := agent or self.children.get(call, "")):
                self.open_turns.pop(ended, None)
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
            emit("context", "truncation", name="truncation", before_tokens=_count(data.get("preTruncationTokensInMessages")),
                 after_tokens=_count(data.get("postTruncationTokensInMessages")),
                 context_limit=_count(data.get("tokenLimit")), estimated=0)
        elif source in ("session.usage_info", "session.shutdown", "session.compaction_start", "session.compaction_complete"):
            counts = _context(data)
            estimated: int | None = 0
            name = "snapshot"
            if source == "session.compaction_complete":
                counts.update(before_tokens=_count(data.get("preCompactionTokens")), after_tokens=_count(data.get("postCompactionTokens")))
                name = "compaction"
                outcome = _label(data.get("outcome"))
                phase = f"compaction_{outcome}" if outcome else ("compaction_failed" if data.get("success") is False else "compaction_complete")
                estimated = 1 if data.get("tokenAccountingBasis") == "local_full_context_estimate" else None
            elif source == "session.compaction_start":
                name = "compaction"
                phase = "compaction_start"
            else:
                if not any(n is not None for n in counts.values()):
                    return
                phase = "shutdown" if source == "session.shutdown" else "snapshot"
            emit("context", phase, name=name, estimated=estimated, text_status="omitted" if data.get("summaryContent") else "", **counts)
