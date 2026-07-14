import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtK, fmtDurSec } from '../../utils.js';
import * as api from '../../api.js';

export default function RunHistoryPanel({project, tool}) {
  const [runs, setRuns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!project || !tool) { setRuns(null); setLoading(false); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getSessionRuns(project, tool, 30, 20)
      .then(data => {
        if (!cancelled) { setRuns(Array.isArray(data) ? data : []); setLoading(false); }
      })
      .catch(e => { if (!cancelled) { setRuns(null); setError(e); setLoading(false); } });
    return () => { cancelled = true; };
  }, [project, tool]);

  if (loading) return html`<p class="loading-state">Loading run history...</p>`;
  if (error) return html`<p class="error-state">Failed to load run history${error.message ? ` (${error.message})` : ''}.</p>`;
  if (!runs || runs.length < 2) return html`<p class="empty-state">Not enough session history for trend analysis.</p>`;

  const maxTok = Math.max(...runs.map(r => r.total_tokens), 1);
  const avgDur = runs.reduce((s, r) => s + r.duration_s, 0) / runs.length;
  const avgTok = runs.reduce((s, r) => s + r.total_tokens, 0) / runs.length;

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${runs.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${fmtDurSec(avgDur)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${fmtK(avgTok)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${runs.map(r => {
        const pct = (r.total_tokens / maxTok * 100).toFixed(1);
        const date = new Date(r.ts * 1000).toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
        const durRatio = avgDur > 0 ? r.duration_s / avgDur : 1;
        return html`<div key=${r.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${date}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${pct}%;border-radius:3px;background:${
              durRatio > 1.5 ? 'var(--orange)' : durRatio < 0.7 ? 'var(--green)' : 'var(--accent)'
            }" title="${fmtK(r.total_tokens)} tok, ${fmtDurSec(r.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${fmtK(r.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${fmtDurSec(r.duration_s)}</span>
        </div>`;
      })}
    </div>
  </div>`;
}
