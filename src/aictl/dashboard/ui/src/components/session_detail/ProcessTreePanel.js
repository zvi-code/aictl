import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { esc, fmtHHMMSS } from '../../utils.js';
import * as api from '../../api.js';

const ROLE_COLOR = {
  lead: 'var(--accent)',
  subagent: 'var(--green)',
  unknown: 'var(--fg-muted)',
};

// Persisted process genealogy. Unlike the live subprocess snapshot, this reads
// the session_processes table so the process tree survives after a session ends
// — useful for post-mortem "who spawned what" inspection of agent teams.
export default function ProcessTreePanel({sessionId}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(false);
    api.getSessionProcesses(sessionId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [sessionId]);

  if (loading) return html`<p class="loading-state">Loading process tree\u2026</p>`;
  if (error) return html`<p class="empty-state">Failed to load process data.</p>`;
  if (!data || !data.processes || !data.processes.length) {
    return html`<p class="empty-state">No persisted processes recorded for this session.</p>`;
  }

  const {processes, by_role, total} = data;

  return html`<div>
    <div class="flex-row gap-sm flex-wrap mb-sm">
      <span class="badge text-xs">${total} process${total === 1 ? '' : 'es'}</span>
      ${Object.entries(by_role).map(([role, n]) => html`
        <span key=${role} class="badge text-xs" style="color:${ROLE_COLOR[role] || 'var(--fg-muted)'}">
          ${esc(role)}: ${n}
        </span>`)}
    </div>
    <div class="mono text-xs">
      ${processes.map((p, i) => {
        const color = ROLE_COLOR[p.role] || 'var(--fg-muted)';
        const t = p.joined_at ? fmtHHMMSS(p.joined_at) : '\u2014';
        return html`<div key=${i} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${color}"></span>
          <span style="width:64px;flex-shrink:0;text-align:right">${p.pid}</span>
          <span style="width:80px;flex-shrink:0;color:${color}">${esc(p.role || 'unknown')}</span>
          <span class="text-ellipsis" style="flex:1;min-width:0">${esc(p.tool || '')}</span>
          <span class="text-muted" style="flex-shrink:0">${t}</span>
        </div>`;
      })}
    </div>
  </div>`;
}
