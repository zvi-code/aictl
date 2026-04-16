import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { esc, fmtAgo } from '../../utils.js';
import * as api from '../../api.js';

const KIND_COLOR = {
  tool_call: 'var(--accent)', file_modified: 'var(--green)',
  error: 'var(--red)', anomaly: 'var(--orange)',
  session_start: 'var(--blue)', session_end: 'var(--fg3)',
};

export default function ActionsPanel({sessionId}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    const since = Math.floor(Date.now() / 1000) - 86400;
    api.getEvents({ sessionId, limit: 200, since })
      .then(data => { setEvents(data.reverse()); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) return html`<p class="loading-state">Loading events...</p>`;
  if (!events.length) return html`<p class="empty-state">No events recorded for this session.</p>`;

  return html`<div class="sd-events">
    ${events.map((ev, i) => {
      const c = KIND_COLOR[ev.kind] || 'var(--fg3)';
      const detail = ev.detail || {};
      const desc = detail.path || detail.name || detail.tool_name || ev.kind;
      return html`<div key=${i} class="sd-event-row">
        <span class="sd-event-time">${fmtAgo(ev.ts)}</span>
        <span class="sd-event-dot" style="background:${c}"></span>
        <span class="sd-event-kind">${ev.kind}</span>
        <span class="sd-event-desc mono text-muted">${esc(String(desc))}</span>
      </div>`;
    })}
  </div>`;
}
