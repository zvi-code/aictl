import { html } from 'htm/preact';
import { useMemo } from 'preact/hooks';
import { useLiveState } from './context.js';

export function ConfigurationEvidence({ records = [] }) {
  return html`<p>These are observed launch flags and native runtime reports, not the current file configuration. Launch flags describe the original arguments; they do not prove the currently applied value after runtime changes. Unreported current values remain unknown.</p>
    ${records.length ? html`<ul>${records.map(record => html`<li key=${record.id}>
      <b>${record.tool || 'Agent'}${record.session_id ? ' · ' + record.session_id : ''}</b>
      ${record.effective_known && record.evidence?.length ? html`<ul>${record.evidence.map(evidence => html`<li key=${evidence.key}>
        ${evidence.key}: ${['string', 'number', 'boolean'].includes(typeof evidence.value) ? String(evidence.value) : 'unknown'} · ${evidence.source || 'source not reported'}
        · ${Number.isFinite(evidence.observed_at) ? 'Observed ' + new Date(evidence.observed_at * 1000).toLocaleString() : 'Observation time not reported'}
      </li>`)}</ul>` : html`<span> · No effective value reported.</span>`}
      ${record.unknown?.length ? html`<p>Unknown: ${record.unknown.join(', ')}.</p>` : null}
    </li>`)}</ul>` : html`<p>No effective runtime settings have been reported.</p>`}`;
}

export default function LoadedConfiguration({ sessionId }) {
  const { state } = useLiveState();
  const topic = state.topics?.get('configuration.loaded');
  const records = useMemo(() => [...(topic?.values() || [])]
    .filter(entity => entity.data?.session_id === sessionId || entity.data?.native_session_id === sessionId)
    .map(entity => ({ id: entity.id, ...entity.data })), [topic, sessionId]);
  if (state.mode !== 'incremental') return null;
  const known = records.some(record => record.effective_known);
  return html`<details class="bd-panel bd-ag-top" aria-label="Effective runtime settings">
    <summary class="bd-ph"><h3>Effective runtime settings</h3><span class="bd-psub">${known ? 'Runtime evidence' : 'Unknown until the runtime reports evidence'}</span></summary>
    <div class="bd-pb"><${ConfigurationEvidence} records=${records}/></div>
  </details>`;
}
