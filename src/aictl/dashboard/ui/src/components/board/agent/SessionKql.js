import { html } from 'htm/preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import './SessionKql.css';

// An empty, typed union leg keeps an example usable when its source hasn't been ingested.
const version = '_v:datetime _deleted:bool';
const session = 'session_id:string ts:real';
const schema = {
  session_steps: `step_key:string ${session} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${version}`,
  requests: `rowid:long ${session} model:string input_tokens:long output_tokens:long cost_usd:real ${version}`,
  tool_invocations: `rowid:long ${session} tool_name:string is_error:long duration_ms:real ${version}`,
  OTELTraces: 'StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long',
  agents: `agent_id:string session_id:string model:string started_at:real ended_at:real ${version}`,
  turn_request_links: `request_key:string ${session} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${version}`,
};
const promptFields = `step_key:string ${session} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${version}`;
const textFields = `step_key:string session_id:string ['text']:string ${version}`;
const costFields = `rowid:long dedup_key:string ${session} agent_id:string cost_usd:real ${version}`;
const columns = fields => fields.split(' ').map(field => field.split(':')[0]);
const source = (table, fields) => `union isfuzzy=true (datatable(node_id:string, ${fields.split(' ').join(', ')})[]), ${table}`;
const tableSource = (table, fields, params) => {
  const node = text(params.nodeId).trim().toLowerCase();
  return source(table, fields) + `\n| where node_id == ${literal(node === 'legacy' ? '' : node)}`;
};
const recentSteps = '| top 500 by ts desc\n| order by ts asc, step_key asc';
const timeColumn = 'event_time=unixtime_seconds_todatetime(ts)';
const reportedSum = (col, type) =>
  `iff(countif(isnotnull(${col})) > 0, sum(${col}), ${type}(null))`;

const examples = {
  steps: {
    label: 'Session steps timeline', table: 'session_steps',
    description: 'The latest 500 recorded steps, oldest first. No prompt or command text.',
    body: `${recentSteps}\n| project ${timeColumn}, step_key, ['kind'], phase, name, agent_id, turn_id`,
  },
  nodes: {
    label: 'Sessions by reporting node', table: 'sessions', fleet: true,
    description: 'Compare nodes with sessions started in the time range. Legacy means the reporting node was not recorded.',
  },
  requests: {
    label: 'Requests and tokens by model', table: 'requests', model: 'model',
    description: 'Request counts, reported tokens and positive recorded USD. A zero or missing price is counted as unpriced, not free.',
    body: `| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=${reportedSum('input_tokens', 'long')},
    output_tokens=${reportedSum('output_tokens', 'long')},
    recorded_usd=iff(countif(priced) > 0, sumif(cost_usd, priced), real(null)),
    unpriced_requests=countif(not(priced))
  by model
| order by request_count desc`,
  },
  tools: {
    label: 'Tool activity and failures', table: 'tool_invocations', tool: 'tool_name',
    description: 'Calls, reported failures, missing outcomes, and mean reported duration by tool name.',
    body: '| summarize calls=count(), failures=countif(is_error == 1),\n    unknown_outcomes=countif(isnull(is_error)), mean_duration_ms=avg(duration_ms)\n  by tool_name\n| order by calls desc',
  },
  failures: {
    label: 'Failed tool calls', table: 'tool_invocations', tool: 'tool_name',
    description: 'The latest 500 calls explicitly marked as errors, newest first.',
    body: `| where is_error == 1\n| top 500 by ts desc\n| project ${timeColumn}, rowid, tool_name, duration_ms`,
  },
  context: {
    label: 'Context changes, compaction and reset', table: 'session_steps',
    description: 'The latest 500 context events and related session commands, oldest first. A requested or dispatched command is not proof of a change; check its phase.',
    body: `| where ['kind'] == "context" or (['kind'] == "session_command" and name in ("model_change", "model", "clear", "reset", "new", "compact", "rewind"))\n${recentSteps}\n| project ${timeColumn}, ['kind'], name, phase, agent_id, turn_id,\n    context_tokens, context_limit, before_tokens, after_tokens`,
  },
  spans: {
    label: 'OpenTelemetry spans', table: 'OTELTraces', model: 'Model', tool: 'ToolName',
    description: 'The latest 500 identified spans, newest first. Model and tool filters apply to the same span.',
    body: '| top 500 by StartTime desc\n| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens',
  },
  prompts: {
    label: 'User input prompts', table: 'session_steps', fields: promptFields, keyword: true,
    description: 'Search retained user messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, oldest first. Missing text is not searchable.',
    body: (steps, params) => retainedSteps(steps, params, 'user'),
  },
  assistant: {
    label: 'Public assistant text and visible commentary', table: 'session_steps', fields: promptFields, keyword: true,
    description: 'Search retained public assistant messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, not private reasoning.',
    body: (steps, params) => retainedSteps(steps, params, 'assistant'),
  },
  commands: {
    label: 'Commands: requests, starts and results', table: 'session_steps',
    fields: `${promptFields} name:string tool_call_id:string agent_id:string exit_code:long`,
    description: 'Shell requests, native starts and tool results are separate events. Session command requests and dispatches are not proof of execution. A preview is shown only when retained.',
    body: (steps, params) => retainedSteps(steps, params, 'commands'),
  },
  longest: {
    label: 'Longest completed turn', table: 'session_steps', fields: `${schema.session_steps} ['source']:string`,
    description: 'Requires one native start and one end for the same session, agent and turn, both in the time range. Incomplete or ambiguous pairs are excluded.',
    body: `| where ['kind'] == "turn" and isnotempty(turn_id)
| where (['source'] == "assistant.turn_start" and phase == "started") or (['source'] == "assistant.turn_end" and phase == "ended")
| summarize starts=countif(phase == "started"), ends=countif(phase == "ended"),
    start_ts=minif(ts, phase == "started"), end_ts=maxif(ts, phase == "ended") by session_id, agent_id, turn_id
| where starts == 1 and ends == 1 and end_ts >= start_ts
| extend duration_seconds=end_ts - start_ts
| order by duration_seconds desc, start_ts asc, agent_id asc, turn_id asc
| take 1
| project session_id, agent_id, turn_id, duration_seconds, started=unixtime_seconds_todatetime(start_ts), ended=unixtime_seconds_todatetime(end_ts)`,
  },
  subagents: {
    label: 'All session subagents', table: 'agents', model: 'model', key: 'agent_id', clock: 'started_at',
    description: 'All recorded subagent IDs for this session, by start time when a time range is set. No task text.',
    body: `| where isnotempty(agent_id) and agent_id != session_id
| project session_id, agent_id, model, started=unixtime_seconds_todatetime(started_at), ended=unixtime_seconds_todatetime(ended_at)
| order by started asc nulls last, agent_id asc`,
  },
  sizes: {
    label: 'Tool response sizes in bytes', table: 'tool_invocations', tool: 'tool_name', fields: `${schema.tool_invocations} output_bytes:long`,
    description: 'Percentiles use recorded, nonnegative output byte counts, including measured zeros. Calls without measurements count as unknown.',
    body: `| extend bytes=iff(output_bytes >= 0, output_bytes, long(null))
| summarize calls=count(), known=countif(isnotnull(bytes)), unknown=countif(isnull(bytes)),
    p50_bytes=percentile(bytes, 50), p95_bytes=percentile(bytes, 95), p99_bytes=percentile(bytes, 99)`,
  },
  mcp: {
    label: 'MCP tool calls', table: 'tool_invocations', tool: 'tool_name', fields: `${schema.tool_invocations} source_event_id:string agent_id:string`,
    description: 'The latest 500 recorded invocations with MCP-style tool names (mcp prefix or server/tool). Names do not establish which servers were configured.',
    body: `| where tool_name matches regex @"^mcp(__|_|\\.|:)|^[\\w.-]+/[\\w.-]+$"
| top 500 by ts desc
| project ${timeColumn}, tool_name, agent_id, source_event_id, duration_ms, is_error`,
  },
  reasoning: {
    label: 'Reported reasoning token counts', table: 'OTELTraces', model: 'Model',
    fields: 'StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string OperationName:string ReasoningOutputTokens:long TraceAttributes:dynamic',
    project: 'StartTime, SessionId, TraceID, SpanID, Model, OperationName, reasoning_tokens=coalesce(ReasoningOutputTokens, tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"]))',
    description: 'The latest 500 identified spans with a reported reasoning token count. Missing counts are not zero. Reads the numeric metric, not reasoning text.',
    body: `| where isnotnull(reasoning_tokens) and reasoning_tokens >= 0
| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`,
  },
  costMain: {
    label: 'Highest recorded turn cost: selected session, main agent', table: 'requests', cost: 'main',
    description: 'Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests.',
  },
  costTree: {
    label: 'Highest recorded turn cost: session and linked descendants', table: 'requests', cost: 'tree',
    description: 'Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned.',
  },
  costAll: {
    label: 'Highest recorded turn cost: all sessions', table: 'requests', cost: 'all',
    description: 'Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing.',
  },
};

function retainedSteps(steps, params, type) {
  const command = type === 'commands';
  const fields = command ? ", ['kind'], name, phase, agent_id, tool_call_id, exit_code" : ', phase';
  const predicate = command ? `| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))`
    : `| where ['kind'] == "message" and role == "${type}" and ['source'] == "${type}.message"
${type === 'assistant' ? '| where phase in ("", "commentary", "response", "final", "final_answer")\n' : ''}| where text_status in ("captured", "truncated")`;
  // Match the whole retained value, not just its preview. Keep the match flag with
  // its version so an older match cannot resurrect a cleared or replaced record.
  return `${command ? '' : `let needle = ${literal(params.keyword)};\n`}let selected_steps = materialize(
${steps}
${predicate}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status${fields});
selected_steps
| join kind=${command ? 'leftouter' : 'inner'} (
    ${tableSource('session_step_text', textFields, params)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${command ? '' : ", matched=isempty(needle) or ['text'] contains needle"}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${command ? '' : ' and matched'}
    | project session_id, step_key, text_preview
) on session_id, step_key
${recentSteps}
| project ${timeColumn}, step_key, turn_id${fields}, text_status, ${type === 'user' ? 'prompt_preview=text_preview' : 'text_preview'}`;
}

const text = value => typeof value === 'string' ? value : '';
const literal = value => JSON.stringify(text(value)).replace(/[\u007f-\u009f\u2028\u2029]/g,
  c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const secondsOf = value => typeof value === 'number' ? value : text(value).trim() ? Number(value) : NaN;
function timeFilter(value, operator, clock) {
  if (value == null || value === '') return '';
  const seconds = secondsOf(value);
  if (!Number.isFinite(seconds)) return '\n| where false // Invalid Flow time bound';
  return `\n| where ${clock} ${operator} ` + (clock === 'StartTime' ? `unixtime_seconds_todatetime(${seconds})` : seconds);
}

function globalBounds({ since, until }) {
  const bound = value => Number.isFinite(secondsOf(value)) ? `unixtime_seconds_todatetime(${secondsOf(value)})` : 'datetime(null)';
  const hasStart = since != null && since !== '';
  const hasEnd = until != null && until !== '';
  if (hasStart) return `let window_start = ${bound(since)};\nlet window_end = ${hasEnd ? bound(until) : 'window_start + 7d'};`;
  return `let window_end = ${hasEnd ? bound(until) : 'now()'};\nlet window_start = window_end - 7d;`;
}

function costQuery(scope, params) {
  const all = scope === 'all';
  if (all && params.includeAllSessions !== true) return '';
  const tree = scope === 'tree';
  const main = scope === 'main';
  const bounds = all ? '\n| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s'
    : timeFilter(params.since, '>=', 'ts') + timeFilter(params.until, '<', 'ts');
  const scopeFilter = all ? '' : main ? '\n| where isnotempty(sid) and session_id == sid and isempty(agent_id)'
    : '\n| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))';
  const filter = scopeFilter + bounds;
  // Find candidate identities in range, then read their current versions. A moved,
  // deleted or repriced request must not revive an older in-window version.
  return `${all ? globalBounds(params) : `let sid = ${literal(params.sessionId)};`}
let link_versions = ${tableSource('turn_request_links', schema.turn_request_links, params)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${tree ? 'let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;\n' : ''}let request_versions = ${tableSource('requests', costFields, params)}
| project rowid, _v, _deleted, ts, session_id, agent_id, dedup_key, cost_usd;
let candidate_ids = request_versions${filter}
| distinct rowid;
let candidates = materialize(request_versions
| join kind=leftsemi (candidate_ids) on rowid
| summarize arg_max(_v, *) by rowid
| where not(coalesce(_deleted, false))${filter}
| project session_id, dedup_key, agent_id, cost_usd);
let relevant_links = materialize(link_versions
| join kind=leftsemi (candidates | where isnotempty(dedup_key) | distinct dedup_key) on $left.request_key == $right.dedup_key);
// Identical retries agree; competing assignments or tombstones at the latest version do not.
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
${main ? '| where isempty(link_agent)\n' : tree ? '| where session_id == sid or root_session_id == sid\n' : ''}| join kind=leftouter (duplicate_keys) on session_id, dedup_key
| extend attributed=isnull(physical_rows) and (isempty(agent_id) or agent_id == link_agent) and ${main ? 'isnotempty(turn_id)' : `isnotempty(root_turn_id) and ${tree ? 'root_session_id == sid' : 'isnotempty(root_session_id)'}`},
    priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0);
let coverage = facts
| summarize eligible_requests=count(), attributed_requests=countif(attributed), unpriced_requests=countif(not(priced)),
    attributed_priced_requests=countif(attributed and priced)
| extend row_type="Coverage", status=case(eligible_requests == 0, "No eligible requests", attributed_requests == 0, "No attributable turns",
    attributed_priced_requests == 0, "No positive recorded USD on attributed requests", "Ranking uses positive recorded USD only");
let winner = facts | where attributed
| summarize turn_requests=count(), turn_unpriced_requests=countif(not(priced)), recorded_usd=sumif(cost_usd, priced)
    by ${main ? 'session_id, turn_id' : 'root_session_id, root_turn_id'}
| where turn_requests > turn_unpriced_requests
| order by recorded_usd desc, ${main ? 'session_id asc, turn_id' : 'root_session_id asc, root_turn_id'} asc
| take 1
| extend row_type="Highest recorded cost";
union coverage, winner
| order by row_type asc`;
}

function buildQuery({ table, fields = schema[table], project, key = table === 'session_steps' ? 'step_key' : 'rowid',
  clock = table === 'OTELTraces' ? 'StartTime' : 'ts', model, tool, body, cost, fleet }, params) {
  if (fleet) return `${globalBounds(params)}
${source('sessions', `session_id:string started_at:real ${version}`)}
| project node_id, session_id, started_at, _v, _deleted
| summarize arg_max(_v, *) by node_id, session_id
| where not(coalesce(_deleted, false))
| extend started=unixtime_seconds_todatetime(started_at)
| where started >= window_start and started < window_end
| summarize sessions=count(), last_session_start=max(started) by reporting_node=iff(isempty(node_id), "legacy", node_id)
| order by sessions desc, reporting_node asc`;
  if (cost) return costQuery(cost, params);
  const spans = table === 'OTELTraces';
  const sid = spans ? 'SessionId' : 'session_id';
  let query = tableSource(table, fields, params);
  // Don't pull payload columns into arg_max. Pick the current row *before* filtering
  // mutable fields: an older version could match even though its replacement does not.
  query += `\n| project ${project || columns(fields).join(', ')}`;
  if (spans) {
    query += `\n| where isnotempty(sid) and ${sid} == sid and isnotempty(TraceID) and isnotempty(SpanID)`;
    query += '\n| summarize arg_max(StartTime, *) by TraceID, SpanID';
  } else {
    query += `\n| summarize arg_max(_v, *) by ${key}\n| where not(coalesce(_deleted, false))`;
    query += `\n| where isnotempty(sid) and ${sid} == sid`;
  }
  query += timeFilter(params.since, '>=', clock) + timeFilter(params.until, '<', clock);
  if (model && text(params.model)) query += `\n| where ${model} == ${literal(params.model)}`;
  if (tool && text(params.tool)) query += `\n| where ${tool} == ${literal(params.tool)}`;
  return `let sid = ${literal(params.sessionId)};\n` + (typeof body === 'function' ? body(query, params) : query + '\n' + body);
}

/** Generate the same standalone KQL as the editor, without rendering or contacting ADX.
 *  Params: { sessionId, model?, tool?, keyword?, since?, until?, includeAllSessions? }.
 *  Bounds are Unix seconds [since, until). The global example requires explicit opt-in.
 */
export function sessionKqlExamples(params = {}) {
  return Object.entries(examples).filter(([, ex]) => ex.cost !== 'all' || params.includeAllSessions === true).map(([id, example]) => ({
    id, label: example.label, query: buildQuery(example, params),
  }));
}

function destination(url, query) {
  if (!/^https:\/\//i.test(text(url)) || !query.trim()) return null;
  try {
    const target = new URL(url);
    if (target.username || target.password || !/^\/[^/]+$/.test(target.pathname)) return null;
    target.hash = '';
    target.search = new URLSearchParams({ web: '1', autorun: 'false', query }).toString();
    return target.href;
  } catch { return null; }
}

const words = [...new Set([
  ...Object.keys(schema), 'where', 'project', 'summarize', 'order by', 'top', 'extend', 'take',
  'distinct', 'count', 'countif', 'sum', 'avg', 'arg_max', 'isnotempty', 'isnotnull', 'unixtime_seconds_todatetime',
  ...[...Object.values(schema), ...Object.values(examples).map(e => e.fields).filter(Boolean), costFields]
    .flatMap(columns).map(col => col.replace(/^\['(.+)'\]$/, '$1')),
])];
const choices = values => [...new Set(values.filter(v => text(v).length > 0))];
const observed = values => Array.isArray(values) ? values : [];
const maxOptions = 10;

function tokenAt(input) {
  const { value, selectionStart: start, selectionEnd: end } = input;
  if (start !== end) return { prefix: '', start, end };
  const prefix = value.slice(0, start).match(/[a-z_]\w*$/i)?.[0] || '';
  const suffix = value.slice(end).match(/^\w+/)?.[0] || '';
  return { prefix, start: start - prefix.length, end: end + suffix.length };
}

/** An editable field: arrow keys select a suggestion; Tab always leaves the field.
 *  Parameter choices replace the whole value. KQL completions replace only the token at the caret.
 */
function Complete({ id, label, value, options, onChange, editorRef, hint, placeholder }) {
  const ownRef = useRef(null);
  const ref = editorRef || ownRef;
  const [range, setRange] = useState(null);
  const [active, setActive] = useState(-1);
  const prefix = range?.prefix.toLowerCase();
  const matches = range ? options.filter(s => s.toLowerCase().startsWith(prefix)).slice(0, maxOptions) : [];
  const expanded = matches.length > 0;
  const optionId = i => `${id}-opt-${i}`;
  const activeId = matches[active] ? optionId(active) : undefined;
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);
  function show(next) { setRange(next); setActive(-1); }
  function pick(word) {
    const input = ref.current;
    if (editorRef) {
      input.setRangeText(word === 'kind' ? "['kind']" : word, range.start, range.end, 'end');
      onChange(input.value);
    } else {
      onChange(word);
    }
    show(null);
  }
  function input(e) {
    const target = e.currentTarget;
    onChange(target.value);
    const next = editorRef ? tokenAt(target) : { prefix: target.value };
    show(!e.isComposing && (!editorRef || next.prefix) ? next : null);
  }
  function keydown(e) {
    if (e.isComposing) return;
    if (editorRef && e.ctrlKey && e.key === ' ') {
      e.preventDefault(); show(tokenAt(e.currentTarget)); return;
    }
    if (e.key === 'Escape' && range) {
      e.preventDefault(); e.stopPropagation(); show(null); return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!range && !editorRef && options.length) {
        e.preventDefault(); show({ prefix: '' }); setActive(0);
      } else if (expanded) {
        e.preventDefault();
        const n = matches.length;
        setActive(e.key === 'ArrowDown' ? (active + 1) % n : (active < 0 ? n - 1 : (active + n - 1) % n));
      }
    } else if (e.key === 'Enter' && activeId) {
      e.preventDefault(); pick(matches[active]);
    } else if (['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      show(null);
    }
  }
  const attrs = {
    id, ref, value, placeholder, 'aria-describedby': hint, 'aria-autocomplete': 'list',
    'aria-controls': id + '-list', 'aria-activedescendant': activeId, autocomplete: 'off', spellcheck: false,
    onInput: input, onKeyDown: keydown, onBlur: () => show(null),
  };
  return html`<div class="bd-kql-field">
    <label for=${id}>${label}</label>
    ${editorRef
      ? html`<textarea ...${attrs} rows="9" onClick=${() => show(null)}/>`
      : html`<input ...${attrs} role="combobox" aria-expanded=${expanded} onFocus=${() => show({ prefix: '' })}/>`}
    <ul class="bd-kql-options" id=${id + '-list'} role="listbox" aria-label=${label + ' suggestions'} hidden=${!expanded}>
      ${matches.map((word, i) => html`<li key=${word} id=${optionId(i)} role="option" aria-selected=${i === active}
        onMouseDown=${e => e.preventDefault()} onClick=${() => pick(word)}>${word}</li>`)}
    </ul>
    ${range && !editorRef && !expanded && html`<small role="status">${value ? 'No matching suggestion. Using the value you typed.' : 'No observed values.'}</small>`}
  </div>`;
}

function Editor({ id, generated, url }) {
  const [query, setQuery] = useState(generated);
  const [message, setMessage] = useState('');
  const ref = useRef(null);
  const hint = id + '-hint';
  const href = destination(url, query);
  const change = value => { setMessage(''); setQuery(value); };
  async function copy() {
    try {
      await navigator.clipboard.writeText(query);
      setMessage('Query copied.');
    } catch {
      ref.current.focus();
      ref.current.select();
      setMessage('Query selected. Use your device’s Copy command.');
    }
  }
  return html`<p id=${hint}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${Complete} id=${id} label="KQL query" value=${query} options=${words} onChange=${change} editorRef=${ref} hint=${hint}/>
    <div class="bd-kql-actions">
      ${href && html`<a class="bd-btn bd-p" href=${href} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!query.trim()} onClick=${copy}>Copy query</button>
      ${query !== generated && html`<button type="button" class="bd-btn" onClick=${() => change(generated)}>Restore example</button>`}
      <span role="status">${message}</span>
    </div>
    <p>${href ? 'Opens in Azure Data Explorer without running the query.' : query.trim() ? 'No Kusto database link is available. You can still copy the query.' : 'Enter a query to copy or open it.'}</p>`;
}

const SHORT_LABELS = {
  nodes: 'Fleet nodes',
  steps: 'Steps',
  requests: 'Requests & USD',
  tools: 'Tool activity',
  failures: 'Failed tools',
  context: 'Context & reset',
  spans: 'OTel spans',
  prompts: 'User prompts',
  assistant: 'Assistant text',
  commands: 'Commands',
  longest: 'Longest turn',
  subagents: 'Subagents',
  sizes: 'Response bytes',
  mcp: 'MCP calls',
  reasoning: 'Reasoning tok',
  costMain: 'Turn cost (main)',
  costTree: 'Turn cost (tree)',
  costAll: 'Turn cost (all)',
};

function Builder({ base, url, sessionId, nodeId, sessions, models, tools, since, until, flowFilters }) {
  const [id, setId] = useState('steps');
  const [sid, setSid] = useState(text(sessionId));
  const [node, setNode] = useState(text(nodeId) || 'legacy');
  const [model, setModel] = useState('');
  const [tool, setTool] = useState('');
  const [keyword, setKeyword] = useState('');
  const [allowedWindow, setAllowedWindow] = useState(null);
  const hint = base + '-hint';
  const example = examples[id];
  const global = example.cost === 'all';
  const windowKey = JSON.stringify([since, until, node]);
  const includeAllSessions = global && allowedWindow === windowKey;
  const generated = (example.fleet || node.trim()) && buildQuery(example, { sessionId: sid, nodeId: node, model, tool, keyword, since, until, includeAllSessions });
  const hasFlowSync = Boolean(flowFilters && (flowFilters.tool_name || flowFilters.category || flowFilters.failed || flowFilters.q));
  const syncFromFlow = () => {
    if (!flowFilters) return;
    let nextId = id;
    if (flowFilters.failed) nextId = 'failures';
    else if (flowFilters.category === 'tools' || flowFilters.tool_name) nextId = 'tools';
    else if (flowFilters.category === 'prompts') nextId = 'prompts';
    else if (flowFilters.category === 'models') nextId = 'requests';
    else if (flowFilters.category === 'agents') nextId = 'subagents';
    else if (flowFilters.category === 'context') nextId = 'context';
    setId(nextId);
    setAllowedWindow(null);
    if (flowFilters.tool_name) setTool(flowFilters.tool_name);
    if (flowFilters.q && (nextId === 'prompts' || nextId === 'assistant')) setKeyword(flowFilters.q);
  };
  return html`<div class="bd-kql-body">
    ${hasFlowSync && html`<div class="bd-kql-sync">
      <span>Active Flow filters detected (${[
        flowFilters.category && `category=${flowFilters.category}`,
        flowFilters.tool_name && `tool=${flowFilters.tool_name}`,
        flowFilters.failed && 'failures only',
        flowFilters.q && `q="${flowFilters.q}"`,
      ].filter(Boolean).join(' · ')})</span>
      <button type="button" class="bd-btn bd-kql-syncbtn" onClick=${syncFromFlow}>Sync with Flow filters</button>
    </div>`}
    <div class="bd-kql-pills" role="group" aria-label="KQL preset shortcuts">
      ${Object.entries(examples).map(([key, ex]) => html`<button type="button" key=${key}
        class=${'bd-kql-pill' + (id === key ? ' bd-on' : '')} title=${ex.label}
        onClick=${() => { setId(key); setAllowedWindow(null); setKeyword(''); }}>${SHORT_LABELS[key] || key}</button>`)}
    </div>
    <label class="bd-kql-field">Example<select value=${id} onChange=${e => { setId(e.currentTarget.value); setAllowedWindow(null); setKeyword(''); }}>
      ${Object.entries(examples).map(([key, ex]) => html`<option value=${key} key=${key}>${ex.label}</option>`)}
    </select></label>
    <p><code>${example.table}</code> · ${example.description}</p>
    <div class="bd-kql-filters">
      ${!example.fleet && html`<${Complete} id=${base + '-node'} label="Reporting node" value=${node} options=${choices([nodeId, 'legacy'])} onChange=${setNode} hint=${hint} placeholder="Enter a node ID"/>`}
      ${global ? html`<label><input type="checkbox" checked=${includeAllSessions}
        onChange=${e => setAllowedWindow(e.currentTarget.checked ? windowKey : null)}/> Include all sessions in this date range</label>`
        : !example.fleet && html`<${Complete} id=${base + '-sid'} label="Session ID" value=${sid} options=${choices([sessionId, ...observed(sessions)])} onChange=${setSid} hint=${hint} placeholder="Enter a session ID"/>`}
      ${example.model && html`<${Complete} id=${base + '-model'} key="model" label="Model (optional)" value=${model} options=${choices(observed(models))} onChange=${setModel} hint=${hint} placeholder="Any model"/>`}
      ${example.tool && html`<${Complete} id=${base + '-tool'} key="tool" label="Tool name (optional)" value=${tool} options=${choices(observed(tools))} onChange=${setTool} hint=${hint} placeholder="Any tool"/>`}
      ${example.keyword && html`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${keyword} onInput=${e => setKeyword(e.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!example.fleet && !node.trim() && html`<p>Enter a reporting node, or select Fleet nodes to compare nodes.</p>`}
    ${!sid && !global && !example.fleet && html`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${example.keyword && html`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${hint}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${generated && html`<${Editor} id=${base + '-editor'} key=${generated} generated=${generated} url=${url}/>`}
  </div>`;
}

export default function SessionKql({ url, sessionId, nodeId, sessions, models, tools, since, until, flowFilters }) {
  const [visited, setVisited] = useState(false);
  const base = 'session-kql-' + useId();
  return html`<details class="bd-kql" onToggle=${e => { if (e.currentTarget.open) setVisited(true); }}>
    <summary>Query in Kusto</summary>
    ${visited && html`<${Builder} key=${JSON.stringify([nodeId, sessionId])} ...${{ base, url, sessionId, nodeId, sessions, models, tools, since, until, flowFilters }}/>`}
  </details>`;
}
