import { useEffect, useMemo, useState } from 'preact/hooks';
import { html } from 'htm/preact';
import * as api from '../../api.js';
import { esc } from '../../utils.js';

function fmtTs(ts) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
}

function previewDetail(detail, max = 140) {
  if (detail == null) return '';
  let s;
  try {
    s = typeof detail === 'string' ? detail : JSON.stringify(detail);
  } catch {
    s = String(detail);
  }
  if (s.length <= max) return s;
  return s.slice(0, max) + '...';
}

function fullDetail(detail) {
  try {
    return JSON.stringify(detail ?? {}, null, 2);
  } catch {
    return String(detail ?? '');
  }
}

export default function EventsPanel({ sessionId, since, until }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    api.getSessionEvents(sessionId, { since, until, limit: 500 })
      .then(rows => {
        const list = Array.isArray(rows) ? rows : [];
        list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        setEvents(list);
      })
      .catch(e => setError(e?.message || 'Failed to load events'))
      .finally(() => setLoading(false));
  }, [sessionId, since, until]);

  const rows = useMemo(() => events.map((ev, idx) => {
    const kind = String(ev.kind || '');
    const isWarn = /permission|error|fail/i.test(kind);
    const key = `${ev.ts || 0}:${ev.kind || ''}:${ev.tool || ''}:${idx}`;
    return {
      key,
      time: fmtTs(ev.ts),
      kind,
      tool: ev.tool || '-',
      preview: previewDetail(ev.detail),
      detailText: fullDetail(ev.detail),
      isWarn,
    };
  }), [events]);

  const toggleRow = (key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!sessionId) {
    return html`<p class="empty-state">Select a session to view events.</p>`;
  }

  if (loading) {
    return html`<p class="empty-state">Loading events...</p>`;
  }

  if (error) {
    return html`<p class="error-state">Error: ${error}</p>`;
  }

  if (!rows.length) {
    return html`<p class="empty-state">No events for this session in the selected range.</p>`;
  }

  return html`<div class="es-events-wrap">
    <table class="es-events-table" aria-label="Session events">
      <thead>
        <tr>
          <th style="width:90px">Time</th>
          <th style="width:240px">Kind</th>
          <th style="width:120px">Tool</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => html`
          <tr key=${r.key}
            class=${`es-events-row ${r.isWarn ? 'is-alert' : ''}`}
            onClick=${() => toggleRow(r.key)}>
            <td class="mono text-xs">
              <button type="button" class="es-events-toggle"
                aria-expanded=${expanded.has(r.key)}
                aria-label=${'Toggle detail for ' + (r.kind || 'event') + ' at ' + r.time}
                onClick=${(e) => { e.stopPropagation(); toggleRow(r.key); }}>${r.time}</button>
            </td>
            <td class="mono text-xs">${esc(r.kind)}</td>
            <td class="text-xs">${esc(r.tool)}</td>
            <td class="mono text-xs" title=${r.preview}>${esc(r.preview)}</td>
          </tr>
          ${expanded.has(r.key) && html`
            <tr key=${r.key + ':detail'} class="es-events-detail-row">
              <td colspan="4">
                <pre class="es-events-detail">${esc(r.detailText)}</pre>
              </td>
            </tr>
          `}
        `)}
      </tbody>
    </table>
  </div>`;
}
