import { html } from 'htm/preact';
import { sourceStatuses } from './selectors.js';

export default function LiveStatus({ state, history = false }) {
  const statuses = sourceStatuses(state);
  const pending = statuses.some(source => source.id.startsWith('history:') && source.ready !== true
    && source.pending !== false && source.retryable !== false);
  const failed = statuses.filter(source => source.stale || source.error || source.last_error);
  const label = source => source.producer || source.component || source.id;
  return html`<div class="bd-live-sources">
    ${state.error ? html`<div class="bd-banner" role="alert">${state.error.message}</div>` : null}
    ${history && pending ? html`<p class="bd-note" role="status">Queryable history is not ready. Runtime fields update independently; missing history is not zero usage.</p>` : null}
    ${failed.length ? html`<div class="bd-banner" role="alert">${failed.map(source => `${label(source)}: ${source.error || source.last_error || source.reason || 'stale; showing the last queryable values'}`).join(' · ')}</div>` : null}
    ${state.orderedGap ? html`<div class="bd-banner" role="status">Native output was resynchronized from a bounded tail. Earlier output may be missing; this is not a continuous transcript.</div>` : null}
    <details class="bd-note">
      <summary>Source freshness${!state.connected ? ' · disconnected' : ''}</summary>
      <p>CPU, memory and presence come from runtime collectors. Native output and local configuration are separate from queryable history. Historical hook, OpenTelemetry and usage totals come from Kusto. Health also shows this daemon’s OTel receiver counters.</p>
      ${statuses.length ? html`<ul>${statuses.map(source => html`<li key=${source.id}>
        ${label(source)}: ${source.incomplete && source.retryable === false ? 'unavailable' : source.stale ? 'stale' : source.ready === true ? 'ready' : source.ready === false ? 'pending' : 'unknown'}.
        ${source.reason || ''}
        ${source.computed_at || source.updated_at || source.observed_at ? ' Last update: ' + new Date((source.computed_at || source.updated_at || source.observed_at) * 1000).toLocaleString() + '.' : ' Update time not reported.'}
      </li>`)}</ul>` : html`<p>Source freshness has not been reported.</p>`}
    </details>
  </div>`;
}
