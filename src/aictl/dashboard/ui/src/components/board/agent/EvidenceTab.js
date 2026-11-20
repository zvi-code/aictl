// Session steps are source records, not additional usage to add to board totals.
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { getSessionEvidence } from '../../../api.js';
import { FixedPanel, useDetail } from '../Drawer.js';
import { stamp } from '../../../design/format.ts';
import { SessionNote, Wait } from './common.js';

const UNKNOWN = 'Not reported';
const has = v => v != null && v !== '';
const count = n => Number.isFinite(n) ? n.toLocaleString() : UNKNOWN;
const basis = value => value === true || value === 1 ? 'Estimated'
  : value === false || value === 0 ? 'Measured' : 'Basis not reported';
const plain = v => has(v) ? v : UNKNOWN;
const captureLabels = {
  captured: 'Captured', truncated: 'Truncated (partial text)', withheld: 'Withheld by capture policy',
  expired: 'Expired', not_reported: 'Text not reported', redacted: 'Redacted',
};
const captureLabel = row => captureLabels[row.text_status] || 'Text status not reported';
const mayRead = row => row.text_status === 'captured' || row.text_status === 'truncated';
const kinds = {
  user_message: 'User message', assistant_message: 'Assistant message', agent_prompt: 'Agent prompt',
  tool_call: 'Tool call', tool_result: 'Tool result', command: 'Command', skill: 'Skill',
  agent: 'Agent', turn: 'Turn', round: 'Round', context: 'Context', model_call: 'Model call', span: 'Span',
};
const kindOf = row => row.kind === 'message'
  ? ({ user: 'User message', assistant: 'Assistant message' }[row.role] || 'Message')
  : kinds[row.kind] || row.kind || 'Step';
const contextSummary = r => [
  `${basis(r.estimated)} · Context: ${count(r.context_tokens)} / capacity: ${count(r.context_limit)}`,
  has(r.before_tokens) || has(r.after_tokens) || /compact/i.test([r.phase, r.name].join(' '))
    ? `Compaction: ${count(r.before_tokens)} → ${count(r.after_tokens)}` : '',
].filter(Boolean).join(' · ');

const ID_FIELDS = [
  ['turn_id', 'Turn', ['turn']], ['round_id', 'Round', ['round']],
  ['agent_id', 'Agent', ['agent']], ['parent_agent_id', 'Parent agent', ['agent'], 'agent_id'],
  ['message_id', 'Message', ['message', 'user_message', 'assistant_message', 'agent_prompt']],
  ['request_id', 'Request'], ['tool_call_id', 'Tool call', ['tool_call']],
  ['trace_id', 'Trace'], ['span_id', 'Span'], ['parent_span_id', 'Parent span', null, 'span_id'],
];

function Facts({ entries, label }) {
  return html`<dl class="bd-ag-kv bd-evidence-facts" aria-label=${label}>${entries.map(([key, value]) => html`
    <div key=${key}><dt>${key}</dt><dd>${plain(value)}</dd></div>`)}</dl>`;
}

function Detail({ row, rows, sid, a, turns, act, select, hidden, ctx }) {
  const { step_key: key } = row;
  const [attempt, retry] = useState(0);
  const { data, error } = useDetail(o => getSessionEvidence(sid, { stepKey: key }, { ...o, nodeScope: ctx?.nodeScope, nodeId: ctx?.nodeId }), JSON.stringify([sid, key, attempt]));
  if (!data) return html`<${Wait} what="step detail" error=${error}/>
    ${error && html`<button class="bd-btn" type="button" onClick=${() => retry(attempt + 1)}>Retry detail</button>`}`;
  const r = data.rows.find(x => x.step_key === key);
  if (!r) return html`<div class="bd-empty" role="status">This step is no longer available.</div>`;
  const open = (tab, props = {}) => act.openDrawer({ type: 'agent', id: a.parent_id || a.id, sessionId: sid, tab, ...props });
  const ids = ID_FIELDS.map(([field, label, types, targetField = field]) => {
    const id = r[field];
    if (!has(id)) return [label, UNKNOWN];
    const matches = rows.filter(x => x.step_key && x.step_key !== key && x[targetField] === id
      && (types?.includes(x.kind) || (field === 'parent_span_id' && has(r.trace_id) && x.trace_id === r.trace_id)));
    const go = field === 'turn_id' && turns.some(t => t.turn_id === id) ? () => open('turns', { id: a.id, turnId: id })
      : matches.length === 1 ? () => select(matches[0]) : null;
    const title = go ? `Open ${label.toLowerCase()} ${id}` : `Find ${label.toLowerCase()} ${id} in session flow`;
    const flowRef = { field: targetField, id, label, traceId: targetField === 'span_id' ? r.trace_id : null };
    return [label, html`<button type="button" class="bd-lnk" aria-label=${title} title=${title}
      onClick=${go || (() => open('flow', { flowRef }))}>${id}</button>`];
  });
  const text = !hidden && mayRead(row) && mayRead(r) ? r.text : null;
  const isContext = r.kind === 'context' || ['context_tokens', 'context_limit', 'before_tokens', 'after_tokens',
    'system_tokens', 'conversation_tokens', 'tool_tokens'].some(field => has(r[field]));
  return html`<article class="bd-ag-insp" aria-label="Step detail">
    <div class="bd-ag-insph"><b>${kindOf(r)}${r.name ? ': ' + r.name : ''}</b></div>
    <${Facts} label="Source record" entries=${[
      ['Time', has(r.ts) ? stamp(r.ts, true) : UNKNOWN], ['Source', r.source], ['Source order', r.source_order],
      ['Step key', r.step_key], ['Tool', r.tool], ['Role', r.role], ['Phase', r.phase],
      ['Exit code', r.exit_code], ['Text capture', captureLabel(r)],
      ...(r.agent_name ? [['Agent name', r.agent_name]] : []), ...(r.model ? [['Model', r.model]] : []),
    ]}/>
    ${text != null && text !== '' ? html`<pre class="bd-ag-pre">${text}</pre>`
      : html`<p class="bd-note">${hidden ? 'Text is hidden by the current capture mode.' : mayRead(r) && mayRead(row) ? 'No retained text returned.' : captureLabel(!mayRead(r) ? r : row)}</p>`}
    ${(isContext || has(r.input_tokens) || has(r.output_tokens)) && html`
      <div class="bd-ag-sect">Token counts</div>
      <${Facts} label="Token counts" entries=${[
        ...(isContext ? [
          ['Measurement', basis(r.estimated)], ['Context used', count(r.context_tokens)], ['Context capacity', count(r.context_limit)],
          ['System', count(r.system_tokens)], ['Conversation', count(r.conversation_tokens)], ['Tools', count(r.tool_tokens)],
          ['Before compaction', count(r.before_tokens)], ['After compaction', count(r.after_tokens)],
        ] : []), ['Input', count(r.input_tokens)], ['Output', count(r.output_tokens)],
      ]}/>`}
    <div class="bd-ag-sect">Source IDs</div>
    <${Facts} label="Source IDs" entries=${[['Session', html`<button type="button" class="bd-lnk" aria-label=${'Open session ' + sid} onClick=${() => open('overview')}>${sid}</button>`], ...ids]}/>
    <div class="bd-ag-bar"><button type="button" class="bd-btn" onClick=${() => open('flow')}>Open session flow</button></div>
  </article>`;
}

function Browser({ sid, a, turns, contextOnly, flowRef, act, hidden, ctx }) {
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, select] = useState(null);
  const [attempt, retry] = useState(0);
  const kind = contextOnly ? 'context' : '';
  const { data, error } = useDetail(o => getSessionEvidence(sid, { kind, q, offset, flowRef }, { ...o, nodeScope: ctx?.nodeScope, nodeId: ctx?.nodeId }), JSON.stringify([sid, kind, q, offset, flowRef, attempt]));
  const search = e => { e.preventDefault(); setQ(draft.trim()); setOffset(0); select(null); };
  // Message, trace and span IDs may not be indexed filters. Inspect only this
  // bounded page and keep paging available even when it contains no match.
  const rows = flowRef ? data?.rows.filter(r => r[flowRef.field] === flowRef.id && (!flowRef.traceId || r.trace_id === flowRef.traceId)) : data?.rows;
  if (selected) return html`<div class="bd-ag-bar"><button type="button" class="bd-btn" onClick=${() => select(null)}>Back to results</button></div>
    <${Detail} key=${selected.step_key} row=${selected} rows=${rows} sid=${sid} a=${a} turns=${turns} act=${act} select=${select} hidden=${hidden} ctx=${ctx}/>`;
  return html`
    ${!contextOnly && !flowRef && !hidden && html`<form class="bd-srchrow" role="search" aria-label="Session evidence" onSubmit=${search}>
      <input type="search" class="bd-sessq" maxlength="160" aria-label="Search retained text in this session" placeholder="Search messages and commands, e.g. pytest" value=${draft} onInput=${e => setDraft(e.currentTarget.value)}/>
      <button type="submit" class="bd-btn">Search</button>
      ${q && html`<button type="button" class="bd-btn" onClick=${() => { setDraft(''); setQ(''); setOffset(0); }}>Clear search</button>`}
    </form>`}
    ${hidden && html`<p class="bd-note">The current capture mode hides text. Source IDs and recorded values are still shown.</p>`}
    ${!rows ? html`<${Wait} what=${contextOnly ? 'context evidence' : 'execution evidence'} error=${error}/>
      ${error && html`<button type="button" class="bd-btn" onClick=${() => retry(attempt + 1)}>Retry</button>`}`
      : !rows.length ? html`<div class="bd-empty" role="status">${flowRef ? 'No source step on this page reports the linked ID.' : offset ? 'No more steps on this page.' : q ? `No steps match “${q}” in this session.` : contextOnly ? 'No context steps reported for this session.' : 'No execution steps reported for this session.'}</div>`
        : html`<div class="bd-note" role="status">${flowRef ? `Matching steps on this page: ${rows.length}` : `Steps ${offset + 1}–${offset + rows.length}${q ? ` matching “${q}”` : ''}`}${data.has_more ? ' · More available' : ''}</div>
        <ol class="bd-ag-tl" aria-label=${contextOnly ? 'Context steps' : 'Execution steps'}>${rows.map((r, i) => html`
          <li key=${r.step_key ?? i}><button type="button" class="bd-evidence-row" disabled=${!r.step_key} onClick=${() => select(r)}>
            <span class="bd-ag-when">${has(r.ts) ? stamp(r.ts, true) : 'Time not reported'}</span>
            <span class="bd-ag-body"><b class="bd-ag-lbl">${[kindOf(r), r.name, r.phase].filter(Boolean).join(' · ')}</b>
              ${r.kind === 'context' ? html`<span>${contextSummary(r)}</span>` : null}
              ${!hidden && mayRead(r) && r.text_preview ? html`<span class="bd-ag-lbl">${r.text_preview}</span>` : null}
              <span class="bd-ag-meta">${[captureLabel(r), r.source, r.tool, has(r.turn_id) && 'Turn: ' + r.turn_id, has(r.agent_id) && 'Agent: ' + r.agent_id,
                (r.kind === 'command' || has(r.exit_code)) && 'Exit code: ' + plain(r.exit_code)].filter(Boolean).join(' · ')}</span>
            </span></button></li>`)}</ol>`}
    ${(offset > 0 || data?.has_more) && html`<div class="bd-ag-bar" aria-label="Evidence pages">
      <button type="button" class="bd-btn" disabled=${!offset} onClick=${() => setOffset(Math.max(0, offset - (data?.limit || 100)))}>Previous page</button>
      <button type="button" class="bd-btn" disabled=${!data?.has_more} onClick=${() => setOffset(offset + (data.limit || 100))}>Next page</button>
    </div>`}`;
}

export default function EvidenceTab({ a, sid, data, act, captureMode, contextOnly = false, flowRef, inline = false, ctx }) {
  const hidden = captureMode != null && captureMode !== 'full';
  const browser = sid ? html`<${Browser} key=${JSON.stringify([sid, contextOnly, hidden, flowRef])} sid=${sid} a=${a} act=${act} flowRef=${flowRef}
    turns=${data?.turns || []} contextOnly=${contextOnly} hidden=${hidden} ctx=${ctx}/>`
    : html`<div class="bd-empty" role="status">No session ID is available for this record.</div>`;
  if (inline) return html`<div role="region" aria-label="Source steps">${browser}</div>`;
  return html`<${SessionNote} a=${a}/>
    <${FixedPanel} id="agevidence" title=${flowRef ? 'Linked source steps' : contextOnly ? 'Recorded context steps' : 'Execution evidence'}
      sub=${flowRef ? `${flowRef.label} ID: ${flowRef.id}` : contextOnly ? 'Context measurements and compactions reported by the source' : 'Source records for this session'}
      go=${contextOnly || flowRef ? { label: 'All evidence', pick: () => act.setDrawerTab('evidence') } : null}>
      ${browser}
    </${FixedPanel}>`;
}
