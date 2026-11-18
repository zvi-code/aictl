"""Filters for session Flow, applied to all events in the selected window before paging."""

from __future__ import annotations

import json
import math
from urllib.parse import quote, urlencode, urlsplit

_CATEGORY = {
    "user_message": "messages", "api_response": "messages", "api_call": "models", "error": "models",
    "tool_use": "tools", "subagent": "agents", "subagent_end": "agents", "compaction": "context",
    "hook": "hooks", "session_start": "lifecycle", "session_end": "lifecycle",
    "session_command": "lifecycle", "context_update": "context", "skill_event": "tools",
}
_META = ("type", "subtype", "agent_id", "agent_name", "model", "from", "to", "hook_name", "source", "name", "phase",
         "error_type", "finish_reason", "decision", "turn_id", "tool_call_id", "exit_code")
_TEXT = ("message", "preview", "prompt", "response", "response_preview", "target", "params", "input_preview",
         "request_preview", "result_summary", "result_preview", "error_message", "hook_input", "hook_output")


def select_events(events, *, q="", category="", tool_name="", flow_agent="", failed=False, allow_text=True):
    if category and category not in _CATEGORY.values():
        raise ValueError("Unknown Flow event category")
    if any(len(s) > maximum or any(ord(c) < 32 for c in s)
           for s, maximum in ((q, 160), (tool_name, 256), (flow_agent, 384))):
        raise ValueError("Invalid Flow filter")
    terms = q.casefold().split()
    visible = []
    tools, agents, models = set(), set(), set()
    for event in events:
        kind = event["type"]
        tool = event.get("to") if kind == "tool_use" else None
        agent = event.get("agent_id")
        if tool:
            tools.add(tool)
        if agent:
            agents.add(agent)
        if event.get("model"):
            models.add(event["model"])
        if (category and _CATEGORY.get(kind) != category) or (tool_name and tool != tool_name) or (flow_agent and agent != flow_agent):
            continue
        if failed and not (kind == "error" or event.get("is_error") in (True, "true")
                           or event.get("success") in (False, "false")):
            continue
        if terms:
            values = " ".join(str(event[k]) for k in (*_META, *(_TEXT if allow_text else ())) if event.get(k) is not None).casefold()
            if not all(term in values for term in terms):
                continue
        visible.append(event)
    return visible, {"total": len(events), "matched": len(visible),
                     "start": events[0]["ts"] if events else None,
                     "end": max((e.get("end_ts") or e["ts"] for e in events), default=None),
                     "tools": sorted(tools, key=str.casefold), "agents": sorted(agents), "models": sorted(models)}


def session_kql_url(settings, sid: str, since: float | None, until: float | None) -> str | None:
    """Only session identity and explicit time bounds leave the dashboard. No search terms or captured text."""
    if not settings:
        return None
    cluster = urlsplit(settings.cluster)
    if cluster.scheme != "https" or not cluster.hostname or cluster.username or cluster.password:
        return None
    bounds = "".join(
        f" | where ts {op} {float(t)!r}" for t, op in ((since, ">="), (until, "<")) if t is not None and math.isfinite(t)
    )
    query = (
        f"let sid = {json.dumps(sid)};\n"
        "// Recorded session steps (no prompt or command text). Times are UTC.\n"
        f"session_steps\n| where session_id == sid{bounds}\n"
        "| summarize arg_max(_v, *) by step_key\n| where not(_deleted)\n"
        "| project event_time=unixtime_seconds_todatetime(ts), kind, phase, name, agent_id, turn_id, round_id, "
        "tool_call_id, trace_id, context_tokens, context_limit, input_tokens, output_tokens, source_order\n"
        "| top 500 by event_time desc"
    )
    return f"https://{cluster.netloc}/{quote(settings.database, safe='')}?" + urlencode({"web": "1", "autorun": "false", "query": query})
