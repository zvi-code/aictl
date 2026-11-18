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
};
const promptFields = `step_key:string ${session} ['kind']:string role:string ['source']:string turn_id:string text_status:string ${version}`;
const textFields = `step_key:string session_id:string ['text']:string ${version}`;
const columns = fields => fields.split(' ').map(field => field.split(':')[0]);
const tableSource = (table, fields) => `union isfuzzy=true (datatable(${fields.split(' ').join(', ')})[]), ${table}`;
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
  requests: {
    label: 'Requests and tokens by model', table: 'requests', model: 'model',
    description: 'Request counts and sums of reported tokens and cost. A blank total means no value was reported.',
    body: `| summarize request_count=count(),\n    input_tokens=${reportedSum('input_tokens', 'long')},\n    output_tokens=${reportedSum('output_tokens', 'long')},\n    cost_usd=${reportedSum('cost_usd', 'real')}\n  by model\n| order by request_count desc`,
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
    label: 'User input prompts', table: 'session_steps', fields: promptFields,
    description: 'The latest 500 recorded user messages with retained text, oldest first. Running this query in Kusto shows up to 240 characters per prompt.',
    body: userPrompts,
  },
};

function userPrompts(steps) {
  // Limit text lookup to identified user-message keys. Don't filter blank previews
  // or tombstones until after arg_max: a cleared prompt must not reappear.
  return `let prompt_steps = materialize(
${steps}
| where ['kind'] == "message" and role == "user" and ['source'] == "user.message"
| where isnotempty(step_key) and text_status in ("captured", "truncated")
| project session_id, step_key, ts, turn_id, text_status);
prompt_steps
| join kind=inner (
    ${tableSource('session_step_text', textFields)}
    | where step_key in (prompt_steps | project step_key)
    | project session_id, step_key, _v, _deleted, prompt_preview=substring(trim(@"\\s+", ['text']), 0, 240)
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(prompt_preview)
    | project session_id, step_key, prompt_preview
) on session_id, step_key
${recentSteps}
| project ${timeColumn}, step_key, turn_id, text_status, prompt_preview`;
}

const text = value => typeof value === 'string' ? value : '';
const literal = value => JSON.stringify(text(value)).replace(/[\u007f-\u009f\u2028\u2029]/g,
  c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

function timeFilter(value, operator, spans) {
  if (value == null || value === '') return '';
  const seconds = typeof value === 'number' ? value : text(value).trim() ? Number(value) : NaN;
  if (!Number.isFinite(seconds)) return '\n| where false // Invalid Flow time bound';
  return '\n| where ' + (spans ? `StartTime ${operator} unixtime_seconds_todatetime(${seconds})` : `ts ${operator} ${seconds}`);
}

function buildQuery({ table, fields = schema[table], model, tool, body }, params) {
  const spans = table === 'OTELTraces';
  const key = table === 'session_steps' ? 'step_key' : 'rowid';
  const sid = spans ? 'SessionId' : 'session_id';
  let query = tableSource(table, fields);
  // Don't pull payload columns into arg_max. Pick the current row *before* filtering
  // mutable fields: an older version could match even though its replacement does not.
  query += `\n| project ${columns(fields).join(', ')}`;
  if (spans) {
    query += `\n| where isnotempty(sid) and ${sid} == sid and isnotempty(TraceID) and isnotempty(SpanID)`;
    query += '\n| summarize arg_max(StartTime, *) by TraceID, SpanID';
  } else {
    query += `\n| summarize arg_max(_v, *) by ${key}\n| where not(coalesce(_deleted, false))`;
    query += `\n| where isnotempty(sid) and ${sid} == sid`;
  }
  query += timeFilter(params.since, '>=', spans) + timeFilter(params.until, '<', spans);
  if (model && text(params.model)) query += `\n| where ${model} == ${literal(params.model)}`;
  if (tool && text(params.tool)) query += `\n| where ${tool} == ${literal(params.tool)}`;
  return `let sid = ${literal(params.sessionId)};\n` + (typeof body === 'function' ? body(query) : query + '\n' + body);
}

/** Generate the same standalone KQL as the editor, without rendering or contacting ADX.
 *  Params: { sessionId, model?, tool?, since?, until? }; bounds are Unix seconds [since, until).
 */
export function sessionKqlExamples(params = {}) {
  return Object.entries(examples).map(([id, example]) => ({
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
  ...[...Object.values(schema), promptFields].flatMap(columns).map(col => col.replace(/^\['(.+)'\]$/, '$1')),
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

function Builder({ base, url, sessionId, sessions, models, tools, since, until }) {
  const [id, setId] = useState('steps');
  const [sid, setSid] = useState(text(sessionId));
  const [model, setModel] = useState('');
  const [tool, setTool] = useState('');
  const hint = base + '-hint';
  const example = examples[id];
  const generated = buildQuery(example, { sessionId: sid, model, tool, since, until });
  return html`<div class="bd-kql-body">
    <label class="bd-kql-field">Example<select value=${id} onChange=${e => setId(e.currentTarget.value)}>
      ${Object.entries(examples).map(([key, ex]) => html`<option value=${key} key=${key}>${ex.label}</option>`)}
    </select></label>
    <p><code>${example.table}</code> · ${example.description}</p>
    <div class="bd-kql-filters">
      <${Complete} id=${base + '-sid'} label="Session ID" value=${sid} options=${choices([sessionId, ...observed(sessions)])} onChange=${setSid} hint=${hint} placeholder="Enter a session ID"/>
      ${example.model && html`<${Complete} id=${base + '-model'} key="model" label="Model (optional)" value=${model} options=${choices(observed(models))} onChange=${setModel} hint=${hint} placeholder="Any model"/>`}
      ${example.tool && html`<${Complete} id=${base + '-tool'} key="tool" label="Tool name (optional)" value=${tool} options=${choices(observed(tools))} onChange=${setTool} hint=${hint} placeholder="Any tool"/>`}
    </div>
    ${!sid && html`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    <p id=${hint}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    <${Editor} id=${base + '-editor'} key=${generated} generated=${generated} url=${url}/>
  </div>`;
}

export default function SessionKql({ url, sessionId, sessions, models, tools, since, until }) {
  const [visited, setVisited] = useState(false);
  const base = 'session-kql-' + useId();
  return html`<details class="bd-kql" onToggle=${e => { if (e.currentTarget.open) setVisited(true); }}>
    <summary>Query in Kusto</summary>
    ${visited && html`<${Builder} key=${sessionId} ...${{ base, url, sessionId, sessions, models, tools, since, until }}/>`}
  </details>`;
}
