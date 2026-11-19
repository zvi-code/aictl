import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { getSessionEvidence } from '../../../api.js';
import { FixedPanel, useDetail } from '../Drawer.js';
import { stamp } from '../format.js';
import { Seg, Wait } from './common.js';

const groups = [['measurements', 'Measurements'], ['usage', 'Model input'], ['inputs', 'Skills and MCP'], ['changes', 'Changes']];
const help = {
  measurements: 'Context snapshots and compactions reported by the source. A prompt-size estimate is not a measured context window.',
  usage: 'Per-call observations, newest first. Cache reads and writes describe input; reasoning tokens describe output. Do not add them again or sum transcript and OTel observations.',
  inputs: 'Named inputs reported on a span or observed in a skill event. A name does not establish a token count or prove that the entire file was sent.',
  changes: 'Reported compaction, truncation, reset and model changes. A requested command is not confirmation that it took effect.',
};
const number = v => typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString() : 'Not reported';

function Rows({ sid, agent, group, ctx }) {
  const [offset, setOffset] = useState(0);
  const [attempt, retry] = useState(0);
  const flowRef = agent ? { field: 'agent_id', id: agent } : null;
  const { data, error } = useDetail(o => getSessionEvidence(sid, { contextGroup: group, flowRef, offset }, { ...o, nodeScope: ctx?.nodeScope, nodeId: ctx?.nodeId }),
    JSON.stringify([sid, agent, group, offset, attempt]));
  if (!data) return html`<${Wait} what="context history" error=${error}/>
    ${error && html`<button type="button" class="bd-btn" onClick=${() => retry(attempt + 1)}>Retry</button>`}`;
  const rows = data.rows;
  return html`${!rows.length ? html`<p class="bd-empty" role="status">No records reported for this selection.</p>` : html`
    <ol class="bd-ag-tl" aria-label="Context history, newest first">${rows.map(r => html`
      <li key=${r.step_key} class="bd-context-history-item">
        <div><time>${stamp(r.ts, true)}</time> · <b>${r.source || 'Source not reported'}</b>
          ${r.agent_id || r.agent_name ? ` · Agent: ${r.agent_id || r.agent_name}` : ''}</div>
        ${group === 'usage' ? html`
          <div>${r.model || r.name || 'Model not reported'} · Input: ${number(r.input_tokens)} · Output: ${number(r.output_tokens)}</div>
          <small>Cache read: ${number(r.cache_read_tokens)} · Cache write: ${number(r.cache_write_tokens)} · Reasoning output: ${number(r.reasoning_tokens)}</small>`
          : group === 'inputs' ? html`${r.kind === 'skill' ? html`<div>Skill ${r.phase}: ${r.name || 'Name not reported'}</div>` : html`
            ${r.reported_skills?.length > 0 && html`<div><b>Reported skills:</b> ${r.reported_skills.join(', ')}</div>`}
            ${r.reported_mcp_servers?.length > 0 && html`<div><b>Reported MCP servers:</b> ${r.reported_mcp_servers.join(', ')}</div>`}`}`
          : html`<div>${[r.phase, r.name].filter(Boolean).join(' · ') || r.kind}</div>
            ${r.name === 'model_change' && r.text_preview ? html`<small>${r.text_preview.split('\n').join(' · ')}</small>` : null}
            ${r.before_tokens != null || r.after_tokens != null ? html`<small>Before: ${number(r.before_tokens)} · After: ${number(r.after_tokens)} tokens</small>` : null}`}
      </li>`)}</ol>`}
    ${(offset > 0 || data.has_more) && html`<div class="bd-ag-bar">
      <button type="button" class="bd-btn" disabled=${!offset} onClick=${() => setOffset(Math.max(0, offset - data.limit))}>Newer records</button>
      <button type="button" class="bd-btn" disabled=${!data.has_more} onClick=${() => setOffset(offset + data.limit)}>Older records</button>
    </div>`}`;
}

export default function ContextHistory({ sid, agent, children, ctx }) {
  const [group, setGroup] = useState('measurements');
  return html`<${FixedPanel} id="agcontextsources" title="Context sources" sub="Reported by transcripts and OpenTelemetry">
    <${Seg} label="Context evidence view" value=${group} onPick=${setGroup} items=${groups}/>
    <p class="bd-note">${help[group]}</p>
    ${group !== 'measurements' && (sid ? html`<${Rows} key=${JSON.stringify([sid, agent, group])} sid=${sid} agent=${agent} group=${group} ctx=${ctx}/>`
      : html`<p class="bd-empty">No native session ID is available.</p>`)}
  </${FixedPanel}>${group === 'measurements' && children}`;
}
