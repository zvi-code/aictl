import { html } from 'htm/preact';
import { fmtK } from '../../utils.js';
import { fmtHHMM, fmtDurSec, shortSid } from './helpers.js';

export default function SessionTabs({sessions, activeId, onSelect, loading}) {
  if (loading) return html`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`;
  if (!sessions.length) return html`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`;

  return html`<div class="sf-sess-tabs">
    ${sessions.map(s => {
      const inTok = s.exact_input_tokens || s.input_tokens || 0;
      const outTok = s.exact_output_tokens || s.output_tokens || 0;
      const tok = inTok + outTok;
      const dur = s.duration_s || (s.ended_at && s.started_at ? s.ended_at - s.started_at : 0);
      const isActive = s.session_id === activeId;
      const isLive = !s.ended_at;

      return html`<button key=${s.session_id}
        title=${s.session_id}
        class="sf-sess-tab ${isActive ? 'active' : ''}"
        onClick=${() => onSelect(s.session_id)}>
        <span class="sf-stab-time">${fmtHHMM(s.started_at)}</span>
        <span class="sf-stab-sid">${shortSid(s.session_id)}</span>
        <span class="sf-stab-dur">${fmtDurSec(dur)}</span>
        ${tok > 0 && html`<span class="sf-stab-tok">${fmtK(tok)}t</span>`}
        ${(s.files_modified || 0) > 0 && html`<span class="sf-stab-files">${s.files_modified}f</span>`}
        ${isLive && html`<span class="sf-stab-live">\u25CF</span>`}
      </button>`;
    })}
  </div>`;
}
