// SequenceInspector — right-side detail pane for a single timeline event.
//
// Renders an editorial-style header (lane + label) plus a meta grid and
// pretty-printed Input / Output sections. Driven by SeqVerticalTimeline
// row selection in TabSessionFlow.
import { html } from 'htm/preact';
import { fmtK, esc } from '../../utils.js';
import { fmtDur, fmtHHMMSS, shortModel } from './helpers.js';

function _bytes(ev) {
  // Heuristic byte-traffic line (best-effort, falls back to "—").
  const tok = ev.tokens || {};
  if (ev.type === 'api_call')      return fmtK(tok.input || 0) + 't in';
  if (ev.type === 'api_response')  return fmtK(tok.output || 0) + 't out';
  if (ev.type === 'tool_use')      return (ev.result_size ? ev.result_size + 'B out' : '—');
  if (ev.type === 'user_message')  return (ev.prompt_length ? ev.prompt_length + ' chars in' : '—');
  return '—';
}

function _pretty(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    // Try JSON first; fall back to raw string.
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function _input(ev) {
  if (ev.type === 'user_message') return ev.message || ev.preview || '';
  if (ev.type === 'api_call')     return ev.request_preview || ev.prompt_preview || '';
  if (ev.type === 'tool_use')     return ev.params || ev.input_preview || '';
  if (ev.type === 'hook')         return ev.hook_input || '';
  return '';
}

function _output(ev) {
  if (ev.type === 'api_response') return ev.response_preview || '';
  if (ev.type === 'api_call' && ev.is_error) return ev.error_message || '';
  if (ev.type === 'tool_use')     return ev.result_summary || ev.result_preview || '';
  if (ev.type === 'error')        return ev.error_message || '';
  if (ev.type === 'hook')         return ev.hook_output || '';
  return '';
}

export default function SequenceInspector({event, onClose}) {
  if (!event) {
    return html`<div class="sv-insp sv-insp--empty">
      <div class="sv-insp-empty-tag">No selection</div>
      <div class="sv-insp-empty-msg">
        Choose any event in the timeline to read its full payload.
      </div>
    </div>`;
  }

  const meta = [
    ['Type',       event.type || ''],
    ['Started',    fmtHHMMSS(event.ts)],
    ['Duration',   event.duration_ms ? fmtDur(event.duration_ms) : '—'],
    ['Bytes',      _bytes(event)],
    ['Model',      shortModel(event.model || '') || '—'],
    ['Decision',   event.decision || (event.success === false ? 'failed' : event.success === true ? 'ok' : '—')],
  ];

  const inText = _pretty(_input(event));
  const outText = _pretty(_output(event));
  const title = event.agent_name
    || event.to
    || event.hook_name
    || event.preview
    || event.type
    || 'Event';

  return html`<div class="sv-insp" role="complementary" aria-label="Event details">
    <div class="sv-insp-head">
      <div>
        <div class="sv-insp-overline">Event \u00B7 ${event.type || ''}</div>
        <div class="sv-insp-title">${esc(title)}</div>
      </div>
      ${onClose && html`<button class="sv-insp-close" onClick=${onClose} aria-label="Close inspector">\u00D7</button>`}
    </div>

    <div class="sv-insp-meta">
      ${meta.map(([k, v]) => html`<div class="sv-insp-meta-row" key=${k}>
        <span class="sv-insp-meta-k">${k}</span>
        <span class="sv-insp-meta-v">${esc(String(v || '—'))}</span>
      </div>`)}
    </div>

    ${inText && html`<div class="sv-insp-section">
      <div class="sv-insp-rule"><span>Input</span></div>
      <pre class="sv-insp-pre">${esc(inText)}</pre>
    </div>`}

    ${outText && html`<div class="sv-insp-section">
      <div class="sv-insp-rule"><span>Output</span></div>
      <pre class="sv-insp-pre">${esc(outText)}</pre>
    </div>`}
  </div>`;
}
