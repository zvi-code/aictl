"""Build copyable session KQL without running it or reading retained text."""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping
from dataclasses import dataclass

from ..data.model_pricing import canonical_model_id
from ..stores.kusto.tables import TABLES

_VERSION = "_v:datetime _deleted:bool"
_SESSION = "session_id:string ts:datetime"
_SCHEMA = {
    "session_steps": f"step_key:string {_SESSION} ['kind']:string phase:string name:string turn_id:string "
    f"agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long {_VERSION}",
    "requests": f"rowid:long {_SESSION} model:string input_tokens:long output_tokens:long cache_read_tokens:long "
    f"cache_creation_tokens:long cost_usd:real {_VERSION}",
    "tool_invocations": f"rowid:long {_SESSION} tool_name:string is_error:bool duration_ms:real {_VERSION}",
    "OTELTraces": "StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string "
    "OperationName:string InputTokens:long OutputTokens:long",
    "agents": f"agent_id:string session_id:string model:string started_at:datetime ended_at:datetime description:string "
    f"status:string resolved_model:string parent_agent_id:string spawn_depth:long completed:bool {_VERSION}",
    "turn_request_links": f"request_key:string {_SESSION} agent_id:string turn_id:string root_session_id:string "
    f"root_turn_id:string basis:string {_VERSION}",
    # The text of a step: a column of its session_steps row, null while text is not kept.
    "session_step_text": f"step_key:string session_id:string ['text']:string {_VERSION}",
    "sessions": f"session_id:string started_at:datetime {_VERSION}",
}
_PROMPT = f"step_key:string {_SESSION} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string {_VERSION}"
_COMMAND = f"{_PROMPT} name:string tool_call_id:string agent_id:string exit_code:long"
_COST = f"rowid:long dedup_key:string {_SESSION} agent_id:string cost_usd:real {_VERSION}"
_RECENT = "| top 500 by ts desc\n| order by ts asc, step_key asc"
_TIME = "event_time=unixtime_seconds_todatetime(ts)"


@dataclass(frozen=True)
class _Preset:
    label: str
    title: str
    table: str
    description: str
    body: str = ""
    fields: str = ""
    model: str = ""
    tool: str = ""
    key: str = ""
    clock: str = ""
    project: str = ""
    retained: str = ""
    cost: str = ""


_PRESETS = {
    "steps": _Preset("Steps", "Session steps timeline", "session_steps", "Latest 500 steps, oldest first; no message text.",
                     f"{_RECENT}\n| project {_TIME}, step_key, ['kind'], phase, name, agent_id, turn_id"),
    "nodes": _Preset("Fleet nodes", "Sessions by reporting node", "sessions", "Compare nodes in the selected window."),
    "requests": _Preset("Requests & USD", "Requests and tokens by model", "requests",
                        "Requests, reported tokens (cache reads and writes apart) and positive recorded USD. Missing and zero prices are unpriced.",
                        """| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=iff(countif(isnotnull(input_tokens))>0, sum(input_tokens), long(null)),
    output_tokens=iff(countif(isnotnull(output_tokens))>0, sum(output_tokens), long(null)),
    cache_read_tokens=iff(countif(isnotnull(cache_read_tokens))>0, sum(cache_read_tokens), long(null)),
    cache_creation_tokens=iff(countif(isnotnull(cache_creation_tokens))>0, sum(cache_creation_tokens), long(null)),
    recorded_usd=iff(countif(priced)>0, sumif(cost_usd, priced), real(null)),
    unpriced_requests=countif(not(priced)) by model
| order by request_count desc""", model="model"),
    "tools": _Preset("Tool activity", "Tool activity and failures", "tool_invocations", "Reported calls, outcomes and durations.",
                     """| summarize calls=count(), failures=countif(is_error == 1), unknown_outcomes=countif(isnull(is_error)),
    mean_duration_ms=avg(duration_ms) by tool_name
| order by calls desc""", tool="tool_name"),
    "failures": _Preset("Failed tools", "Failed tool calls", "tool_invocations", "Latest 500 explicit tool failures.",
                        f"| where is_error == 1\n| top 500 by ts desc\n| project {_TIME}, rowid, tool_name, duration_ms", tool="tool_name"),
    "context": _Preset("Context & reset", "Context changes, compaction and reset", "session_steps",
                       "Reported events and requests; a dispatched command is not proof of a context change.",
                       '''| where ['kind'] == "context" or (['kind'] == "session_command" and name in
    ("model_change", "model", "clear", "reset", "new", "compact", "rewind"))
''' + _RECENT + f"\n| project {_TIME}, ['kind'], name, phase, agent_id, turn_id, context_tokens, context_limit, before_tokens, after_tokens"),
    "spans": _Preset("OTel spans", "OpenTelemetry spans", "OTELTraces", "Latest 500 identified spans on the selected node.",
                     "| top 500 by StartTime desc\n| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens, "
                     "ai_credits=CopilotNanoAiu / 1e9",
                     fields=f"{_SCHEMA['OTELTraces']} CopilotNanoAiu:long", model="Model", tool="ToolName"),
    "prompts": _Preset("User prompts", "User input prompts", "session_steps",
                       "Search retained user messages; Kusto returns a preview of up to 240 characters.", fields=_PROMPT, retained="user"),
    "assistant": _Preset("Assistant text", "Public assistant text and visible commentary", "session_steps",
                         "Search retained public messages, not hidden reasoning.", fields=_PROMPT, retained="assistant"),
    "commands": _Preset("Commands", "Commands: requests, starts and results", "session_steps",
                        "Command requests, starts and results remain separate even without retained text.", fields=_COMMAND, retained="commands"),
    "longest": _Preset("Longest turn", "Longest completed turn", "session_steps",
                       "Only native turns with one start and one end inside the bounds.",
                       """| where ['kind'] == "turn" and isnotempty(turn_id)
| where (['source'] == "assistant.turn_start" and phase == "started") or (['source'] == "assistant.turn_end" and phase == "ended")
| summarize starts=countif(phase == "started"), ends=countif(phase == "ended"),
    start_ts=minif(ts, phase == "started"), end_ts=maxif(ts, phase == "ended") by session_id, agent_id, turn_id
| where starts == 1 and ends == 1 and end_ts >= start_ts
| extend duration_seconds=end_ts - start_ts
| order by duration_seconds desc, start_ts asc, agent_id asc, turn_id asc
| take 1
| project session_id, agent_id, turn_id, duration_seconds, started=unixtime_seconds_todatetime(start_ts), ended=unixtime_seconds_todatetime(end_ts)""",
                       fields=f"{_SCHEMA['session_steps']} ['source']:string"),
    "subagents": _Preset("Subagents", "All session subagents", "agents", "Recorded subagents: description, status, model and times; no task text.",
                         """| where isnotempty(agent_id) and agent_id != session_id
| project session_id, agent_id, description, status, model, resolved_model, parent_agent_id, spawn_depth, completed,
    started=unixtime_seconds_todatetime(started_at), ended=unixtime_seconds_todatetime(ended_at)
| order by started asc nulls last, agent_id asc""", model="model", key="agent_id", clock="started_at"),
    "sizes": _Preset("Response bytes", "Tool response sizes in bytes", "tool_invocations", "Percentiles use recorded nonnegative bytes.",
                     """| extend bytes=iff(output_bytes >= 0, output_bytes, long(null))
| summarize calls=count(), known=countif(isnotnull(bytes)), unknown=countif(isnull(bytes)),
    p50_bytes=percentile(bytes, 50), p95_bytes=percentile(bytes, 95), p99_bytes=percentile(bytes, 99)""",
                     fields=f"{_SCHEMA['tool_invocations']} output_bytes:long", tool="tool_name"),
    "mcp": _Preset("MCP calls", "MCP tool calls", "tool_invocations", "Names indicate calls, not server configuration.",
                   r'''| where tool_name matches regex @"^mcp(__|_|\.|:)|^[\w.-]+/[\w.-]+$"'''
                   f"\n| top 500 by ts desc\n| project {_TIME}, tool_name, agent_id, source_event_id, duration_ms, is_error",
                   fields=f"{_SCHEMA['tool_invocations']} source_event_id:string agent_id:string", tool="tool_name"),
    "reasoning": _Preset("Reasoning tokens", "Reported reasoning token counts", "OTELTraces", "Numeric telemetry only; no reasoning text.",
                         "| where isnotnull(reasoning_tokens) and reasoning_tokens >= 0\n| top 500 by StartTime desc\n"
                         "| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens", model="Model",
                         fields=f"{_SCHEMA['OTELTraces']} ReasoningOutputTokens:long TraceAttributes:dynamic",
                         project='StartTime, SessionId, TraceID, SpanID, Model, OperationName, '
                         'reasoning_tokens=coalesce(ReasoningOutputTokens, tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"]))'),
    "costMain": _Preset("Turn cost (main)", "Highest recorded main-agent turn cost", "requests",
                        "Ranks attributed main-agent turns by positive recorded USD and reports coverage.", cost="main"),
    "costTree": _Preset("Turn cost (tree)", "Highest recorded session and descendant cost", "requests",
                        "Ranks explicit root-turn links, including descendants; incomplete attribution remains visible.", cost="tree"),
    "costAll": _Preset("Turn cost (all)", "Highest recorded turn cost across sessions", "requests",
                       "Explicit opt-in for this node and time range. Missing bounds use a seven-day window.", cost="all"),
}


def _session_first(table: str) -> bool:
    """Whether a view of *table* may filter on the session before it reduces versions: the table has no
    tombstones, or its tombstones keep the session (in the key or the tombstone scope, tables.py)."""
    stored = TABLES.get(table)
    return stored is not None and (stored.tombstone is None or "session_id" in {*stored.key, *stored.tombstone_scope})


def _literal(value: str) -> str:
    return json.dumps(value, ensure_ascii=True)


def _canonical_model(column: str) -> str:
    """The KQL of ``canonical_model_id`` on *column*: tools spell one Claude model with a dash or a dot."""
    lower = f'tolower(trim(@"\\s+", {column}))'
    return f'iff({lower} startswith "claude-", replace_string({lower}, ".", "-"), {column})'


# Stored times are UTC datetimes and flags bools (docs/storage-schema.md); the queries below read the
# times as epoch seconds, like the time bounds they are given, and the flags as 0/1.
_EPOCH = ("ts", "started_at", "ended_at")
_FLAGS = ("is_error",)


def _source(table: str, fields: str, node: str | None = None) -> str:
    union = f"union isfuzzy=true (datatable(node_id:string, {', '.join(fields.split())})[]), {table}"
    names = _columns(fields)
    read = [f"{c}=({c} - datetime(1970-01-01)) / 1s" for c in _EPOCH if c in names]
    read += [f"{c}=tolong({c})" for c in _FLAGS if c in names]
    if read:
        union += "\n| extend " + ", ".join(read)
    return union if node is None else f"{union}\n| where node_id == {_literal(node)}"


def _columns(fields: str) -> list[str]:
    return [field.split(":", 1)[0] for field in fields.split()]


@dataclass(frozen=True)
class _Params:
    node: str
    session: str
    model: str
    tool: str
    keyword: str
    since: float | None
    until: float | None

    def time(self, clock: str = "ts") -> str:
        def date(value: float) -> str:
            return f"unixtime_seconds_todatetime({value:g})" if clock == "StartTime" else str(value)
        return "".join(f"\n| where {clock} {op} {date(value)}"
                       for op, value in ((">=", self.since), ("<", self.until)) if value is not None)

    def window(self) -> str:
        if self.since is not None:
            end = "window_start + 7d" if self.until is None else f"unixtime_seconds_todatetime({self.until!r})"
            return f"let window_start = unixtime_seconds_todatetime({self.since!r});\nlet window_end = {end};"
        end = "now()" if self.until is None else f"unixtime_seconds_todatetime({self.until!r})"
        return f"let window_end = {end};\nlet window_start = window_end - 7d;"


def _retained(steps: str, params: _Params, kind: str) -> str:
    command = kind == "commands"
    fields = ", ['kind'], name, phase, agent_id, tool_call_id, exit_code" if command else ", phase"
    if command:
        predicate = """| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))"""
    else:
        predicate = f"""| where ['kind'] == "message" and role == "{kind}" and ['source'] == "{kind}.message"\n"""
        if kind == "assistant":
            predicate += '| where phase in ("", "commentary", "response", "final", "final_answer")\n'
        predicate += '| where text_status in ("captured", "truncated")'
    needle = "" if command else f"let needle = {_literal(params.keyword)};\n"
    matched = "" if command else ", matched=isempty(needle) or ['text'] contains needle"
    return rf"""{needle}let selected_steps = materialize(
{steps}
{predicate}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status{fields});
selected_steps
| join kind={'leftouter' if command else 'inner'} (
    {_source('session_steps', _SCHEMA['session_step_text'], params.node)}
    | where isnotnull(['text']) and step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\s+", ['text']), 0, 240){matched}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview){'' if command else ' and matched'}
    | project session_id, step_key, text_preview
) on session_id, step_key
{_RECENT}
| project {_TIME}, step_key, turn_id{fields}, text_status, {'prompt_preview=text_preview' if kind == 'user' else 'text_preview'}"""


def _cost(preset: _Preset, params: _Params) -> str:
    all_sessions, main, tree = (preset.cost == name for name in ("all", "main", "tree"))
    start = params.window() if all_sessions else f"let sid = {_literal(params.session)};"
    descendants = ("let possible_descendants = link_versions | where root_session_id == sid "
                   "and isnotempty(request_key) | distinct request_key;\n") if tree else ""
    scope = "" if all_sessions else "\n| where isnotempty(sid) and " + (
        "session_id == sid and isempty(agent_id)" if main else "(session_id == sid or dedup_key in (possible_descendants))")
    bounds = ("\n| where ts >= (window_start - datetime(1970-01-01)) / 1s "
              "and ts < (window_end - datetime(1970-01-01)) / 1s") if all_sessions else params.time()
    filters = scope + bounds
    linked_filter = "| where isempty(link_agent)\n" if main else "| where session_id == sid or root_session_id == sid\n" if tree else ""
    linked = ("isnotempty(turn_id)" if main else "isnotempty(root_turn_id) and " +
              ("root_session_id == sid" if tree else "isnotempty(root_session_id)"))
    keys = "session_id, turn_id" if main else "root_session_id, root_turn_id"
    order = "session_id asc, turn_id asc" if main else "root_session_id asc, root_turn_id asc"
    return f"""{start}
let link_versions = {_source('turn_request_links', _SCHEMA['turn_request_links'], params.node)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
{descendants}let request_versions = {_source('requests', _COST, params.node)}
| project rowid, _v, _deleted, ts, session_id, agent_id, dedup_key, cost_usd;
let candidate_ids = request_versions{filters}
| distinct rowid;
let candidates = materialize(request_versions
| join kind=leftsemi (candidate_ids) on rowid
| summarize arg_max(_v, *) by rowid
| where not(coalesce(_deleted, false)){filters}
| project session_id, dedup_key, agent_id, cost_usd);
let relevant_links = materialize(link_versions
| join kind=leftsemi (candidates | where isnotempty(dedup_key) | distinct dedup_key) on $left.request_key == $right.dedup_key);
let links = relevant_links | summarize link_version=max(_v) by request_key
| join kind=inner (relevant_links) on request_key, $left.link_version == $right._v
| distinct request_key, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis, _deleted
| summarize variants=count(), take_any(session_id, agent_id, turn_id, root_session_id, root_turn_id, basis, _deleted) by request_key
| where variants == 1 and not(coalesce(_deleted, false)) and isnotempty(session_id)
    and isnotempty(basis) and basis !in~ ("ambiguous", "conflict", "unknown", "unknown_agent", "unattributed")
| project request_key, session_id, link_agent=agent_id, turn_id, root_session_id, root_turn_id;
let duplicate_keys = candidates | where isnotempty(dedup_key)
| summarize physical_rows=count() by session_id, dedup_key | where physical_rows > 1;
let facts = materialize(candidates
| join kind=leftouter (links) on session_id, $left.dedup_key == $right.request_key
{linked_filter}| join kind=leftouter (duplicate_keys) on session_id, dedup_key
| extend attributed=isnull(physical_rows) and (isempty(agent_id) or agent_id == link_agent) and {linked},
    priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0);
let coverage = facts
| summarize eligible_requests=count(), attributed_requests=countif(attributed), unpriced_requests=countif(not(priced)),
    attributed_priced_requests=countif(attributed and priced)
| extend row_type="Coverage", status=case(eligible_requests == 0, "No eligible requests", attributed_requests == 0, "No attributable turns",
    attributed_priced_requests == 0, "No positive recorded USD on attributed requests", "Ranking uses positive recorded USD only");
let winner = facts | where attributed
| summarize turn_requests=count(), turn_unpriced_requests=countif(not(priced)), recorded_usd=sumif(cost_usd, priced)
    by {keys}
| where turn_requests > turn_unpriced_requests
| order by recorded_usd desc, {order}
| take 1
| extend row_type="Highest recorded cost";
union coverage, winner
| order by row_type asc"""


def _query(preset: _Preset, params: _Params) -> str:
    table = preset.table
    if table == "sessions":
        return f"""{params.window()}
{_source(table, _SCHEMA[table])}
| project node_id, session_id, started_at, _v, _deleted
| summarize arg_max(_v, *) by node_id, session_id
| where not(coalesce(_deleted, false))
| extend started=unixtime_seconds_todatetime(started_at)
| where started >= window_start and started < window_end
| summarize sessions=count(), last_session_start=max(started) by reporting_node=iff(isempty(node_id), "legacy", node_id)
| order by sessions desc, reporting_node asc"""
    if preset.cost:
        return _cost(preset, params)
    fields = preset.fields or _SCHEMA[table]
    query = _source(table, fields, params.node)
    query += "\n| project " + (preset.project or ", ".join(_columns(fields)))
    if table == "OTELTraces":
        query += ("\n| where isnotempty(sid) and SessionId == sid and isnotempty(TraceID) and isnotempty(SpanID)"
                  "\n| summarize arg_max(StartTime, *) by TraceID, SpanID")
    else:
        key = preset.key or ("step_key" if table == "session_steps" else "rowid")
        # The session first, so the dedup reads this session's versions and not the node's whole table; only
        # where a tombstone keeps the column. Any other filter must follow the dedup.
        early = _session_first(table)
        session = "\n| where isnotempty(sid) and session_id == sid"
        query += (session if early else "") + f"\n| summarize arg_max(_v, *) by {key}\n| where not(coalesce(_deleted, false))"
        query += "" if early else session
    query += params.time(preset.clock or ("StartTime" if table == "OTELTraces" else "ts"))
    if preset.model and params.model:
        query += f"\n| where {_canonical_model(preset.model)} == {_literal(canonical_model_id(params.model))}"
    if preset.tool and params.tool:
        query += f"\n| where {preset.tool} == {_literal(params.tool)}"
    return f"let sid = {_literal(params.session)};\n" + (_retained(query, params, preset.retained) if preset.retained else f"{query}\n{preset.body}")


def _time_bound(value: str | None) -> float | None:
    if value in ("", None):
        return None
    seconds = float(value)
    if not math.isfinite(seconds) or seconds < 0 or seconds > 253402300799:
        raise ValueError("Invalid Unix time bound")
    return seconds


def kql_templates(args: Mapping[str, str]) -> dict:
    """Return preset metadata or one generated query. Incoming strings are data literals only."""
    identifier = args.get("preset")
    if not identifier:
        fields = sorted({col.strip("[]'") for spec in (*_SCHEMA.values(), _COST, *(p.fields for p in _PRESETS.values()))
                     for col in _columns(spec)} | {"node_id"})
        return {
            "presets": [{"id": name, "label": p.label, "title": p.title, "description": p.description,
                         "model": bool(p.model), "tool": bool(p.tool), "keyword": p.retained in {"user", "assistant"},
                         "fleet": name == "nodes", "all_sessions": p.cost == "all"} for name, p in _PRESETS.items()],
            "tables": sorted(_SCHEMA), "fields": fields,
            "operators": ["where", "project", "summarize", "order by", "top", "extend", "take", "distinct", "count", "countif",
                          "sum", "avg", "arg_max", "isnotempty", "isnotnull", "unixtime_seconds_todatetime"],
        }
    preset = _PRESETS.get(identifier)
    if not preset:
        raise ValueError("Unknown KQL preset")
    node = args.get("reporting_node", "").strip().lower()
    session = args.get("session", "").strip()
    model, tool, keyword = (args.get(key, "") for key in ("model", "tool", "keyword"))
    if max(map(len, (session, model, tool, keyword))) > 512:
        raise ValueError("KQL parameter is too long")
    if identifier != "nodes" and not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,255}", node):
        raise ValueError("Select a reporting node")
    if preset.cost == "all" and args.get("include_all_sessions") != "1":
        raise ValueError("All sessions requires explicit consent for the selected node and window")
    if not session and identifier != "nodes" and preset.cost != "all":
        raise ValueError("Select a session")
    since, until = _time_bound(args.get("since")), _time_bound(args.get("until"))
    if since is not None and until is not None and since >= until:
        raise ValueError("The end must be after the start")
    params = _Params("" if node == "legacy" else node, session, model, tool, keyword, since, until)
    return {"query": _query(preset, params)}
