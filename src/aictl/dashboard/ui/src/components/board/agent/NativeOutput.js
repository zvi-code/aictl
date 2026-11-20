import { html } from 'htm/preact';
import { useMemo } from 'preact/hooks';
import { useLiveState } from '../../../live/context.ts';
import { orderedNativeOutput } from '../../../data/store.ts';
import { clock } from './common.js';

const TOPICS = ['runtime.output'];

/** Native text is never folded into historical turn, token, cost or tool-call totals. */
export default function NativeOutput({ a, captureMode }) {
  const { client, state } = useLiveState(TOPICS);
  const sessionId = a.session_id || a.native_session_id || a.parent_id || a.id;
  const output = state.topics?.get('runtime.output');
  const entries = useMemo(() => orderedNativeOutput(output?.values(), sessionId), [output, sessionId]);
  if (!client) return null;
  const mode = state.capabilities?.capture_mode ?? captureMode;
  const withheld = mode != null && mode !== 'full';
  return html`<section class="bd-panel bd-ag-top" id="dr-native-output" aria-label="Live native output">
    <div class="bd-ph bd-ph-fixed"><h3>Live native output</h3><span class="bd-psub">Native session adapter · ordered retained output</span></div>
    <div class="bd-pb">
      <p class="bd-note">This live output is separate from the Kusto transcript below. It does not add to historical usage, cost or activity totals.</p>
      ${state.orderedGap || state.retention?.native_output?.evicted_entries > 0 || entries.some(entity => entity.data.tail_truncated) ? html`<p class="bd-banner" role="status">Only a bounded tail is available; earlier output may be missing.</p>` : null}
      ${entries.some(entity => entity.data.text_truncated) ? html`<p class="bd-note">Some retained native text is truncated.</p>` : null}
      ${withheld ? html`<p class="bd-note">Native text is not retained in the current capture mode.</p>` : null}
      ${entries.length ? html`<ol class="bd-ag-turnl" aria-label="Ordered native output">${entries.map(entity => {
        const entry = entity.data;
        const hidden = withheld || entry.content_retained === false || (entry.capture_mode != null && entry.capture_mode !== 'full');
        return html`<li key=${entity.id} class="bd-ag-turn" data-entry-id=${entry.entry_id || entity.id}>
          <div class="bd-ag-turnh"><span>${clock(entry.ts)}</span><b>${entry.kind || 'Output'}</b></div>
          <div class="bd-ag-text">${hidden ? 'Text not retained.' : (typeof entry.text === 'string' ? entry.text : 'No text reported.')}</div>
        </li>`;
      })}</ol>` : html`<div class="bd-empty" role="status">${state.ready ? 'No retained native output is available for this session.' : 'Waiting for native output.'}</div>`}
    </div>
  </section>`;
}
