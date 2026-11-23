"""Filters for session Flow, applied to all events in the selected window before paging."""

from __future__ import annotations

import json
import math
from urllib.parse import quote, urlencode, urlsplit

from ..data.model_pricing import canonical_model_id

_CATEGORY = {
    "user_message": "messages", "api_response": "messages", "api_call": "models", "error": "models",
    "tool_use": "tools", "subagent": "agents", "subagent_end": "agents", "task_prompt": "agents", "compaction": "context",
    "hook": "hooks", "session_start": "lifecycle", "session_end": "lifecycle",
    "session_command": "lifecycle", "context_update": "context", "skill_event": "skills",
}
_META = ("type", "subtype", "agent_id", "agent_name", "model", "from", "to", "hook_name", "source", "name", "phase",
         "error_type", "finish_reason", "decision", "turn_id", "tool_call_id", "exit_code")
_TEXT = ("message", "preview", "prompt", "response", "response_preview", "target", "params", "input_preview",
         "request_preview", "result_summary", "result_preview", "error_message", "hook_input", "hook_output")


def select_events(events, *, q="", category="", tool_name="", flow_agent="", failed=False, allow_text=True, skill_name="", skill_phase=""):
    if category and category != "prompts" and category not in _CATEGORY.values():
        raise ValueError("Unknown Flow event category")
    if any(len(s) > maximum or any(ord(c) < 32 for c in s)
           for s, maximum in ((q, 160), (tool_name, 256), (flow_agent, 384), (skill_name, 256))):
        raise ValueError("Invalid Flow filter")
    if skill_phase not in ("", "loaded", "invoked", "resolved", "reported"):
        raise ValueError("Unknown skill evidence phase")
    terms = q.casefold().split()
    visible = []
    tools, agents, models, skills = set(), set(), set(), set()
    for event in events:
        kind = event["type"]
        tool = event.get("to") if kind == "tool_use" else None
        agent = event.get("agent_id")
        skill = event.get("name") if kind == "skill_event" else None
        if skill:
            skills.add(skill)
        if tool:
            tools.add(tool)
        if agent:
            agents.add(agent)
        if event.get("model"):
            # One entry per model, whichever tool spelled its id; the events keep the stored spelling.
            models.add(canonical_model_id(event["model"]))
        category_match = kind == "user_message" if category == "prompts" else not category or _CATEGORY.get(kind) == category
        if (not category_match or (tool_name and tool != tool_name) or (flow_agent and agent != flow_agent)
                or (skill_name and (skill or "").casefold() != skill_name.casefold())
                or (skill_phase and (not skill or event.get("phase") != skill_phase))):
            continue
        if failed and not (kind == "error" or event.get("is_error") in (True, "true")
                           or event.get("success") in (False, "false")):
            continue
        if terms:
            keys = ("message",) if category == "prompts" and allow_text else () if category == "prompts" else (*_META, *(_TEXT if allow_text else ()))
            values = " ".join(str(event[k]) for k in keys if event.get(k) is not None)
            if "model" in keys and event.get("model"):
                values += " " + canonical_model_id(event["model"])
            values = values.casefold()
            if not all(term in values or canonical_model_id(term) in values for term in terms):
                continue
        visible.append(event)
    return visible, {"total": len(events), "matched": len(visible),
                     "start": events[0]["ts"] if events else None,
                     "end": max((e.get("end_ts") or e["ts"] for e in events), default=None),
                     "tools": sorted(tools, key=str.casefold), "agents": sorted(agents), "models": sorted(models),
                     "skills": sorted(skills, key=str.casefold)}


def session_kql_url(settings, sid: str, since: float | None, until: float | None) -> str | None:
    """Only node/session identity and explicit time bounds leave the dashboard."""
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
        f"session_steps\n| where node_id == {json.dumps(settings.node_id)} and session_id == sid{bounds}\n"
        # `_deleted` is null on rows written before tombstones, so a bare not(_deleted) would drop them.
        "| summarize arg_max(_v, *) by step_key\n| where not(coalesce(column_ifexists('_deleted', false), false))\n"
        "| top 500 by ts desc\n| order by ts asc, step_key asc\n"
        "| project event_time=unixtime_seconds_todatetime(ts), node_id, ['kind'], phase, name, agent_id, turn_id, round_id, "
        "tool_call_id, trace_id, context_tokens, context_limit, input_tokens, output_tokens, source_order"
    )
    return f"https://{cluster.netloc}/{quote(settings.database, safe='')}?" + urlencode({"web": "1", "autorun": "false", "query": query})
