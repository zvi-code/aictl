import { html } from 'htm/preact';
import { fmtDurMs, fmtHHMMSS } from '../../utils.js';

export default function SessionSelector({ sessions, activeId, onSelect, loading, error = null }) {
  if (loading) return html`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions\u2026</div>`;
  if (error) return html`<div class="error-state" style="padding:var(--sp-3);font-size:var(--fs-sm)">Failed to load sessions${error.message ? ` (${error.message})` : ''}</div>`;
  if (!sessions.length) return html`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`;
  return html`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${sessions.slice(0, 20).map(s => {
      const isActive = s.session_id === activeId;
      const duration = s.ended_at ? Math.round(s.ended_at - s.started_at) : 0;
      const durLabel = duration > 0 ? fmtDurMs(duration * 1000) : '\u23F3 live';
      const timeLabel = fmtHHMMSS(s.started_at);
      return html`<button key=${s.session_id}
        class="tr-sess-btn ${isActive ? 'tr-sess-active' : ''}"
        onClick=${() => onSelect(s.session_id)}
        title=${s.session_id}>
        <span class="tr-sess-time">${timeLabel}</span>
        <span class="tr-sess-dur">${durLabel}</span>
        ${s.is_live ? html`<span class="tr-sess-live">\u25CF</span>` : null}
      </button>`;
    })}
  </div>`;
}
