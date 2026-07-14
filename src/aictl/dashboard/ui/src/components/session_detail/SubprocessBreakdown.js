import { useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import * as api from '../../api.js';
import { esc } from '../../utils.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';

/**
 * Horizontal bar chart showing the top-N subprocesses spawned by the
 * session. Data lives in the live correlator snapshot only — historical
 * sessions render an empty-state message.
 */
export default function SubprocessBreakdown({ sessionId, topN = 10 }) {
  const { data, loading, error } = useAsyncResource(
    () => api.getSessionSubprocesses(sessionId),
    [sessionId],
    { enabled: !!sessionId },
  );

  const top = useMemo(() => {
    if (!data || !Array.isArray(data.counts)) return [];
    return data.counts.slice(0, topN);
  }, [data, topN]);

  if (loading) {
    return html`<div class="text-xs text-muted loading-state" style="padding:0">Loading subprocesses\u2026</div>`;
  }
  if (error) {
    return html`<div class="error-state text-xs" style="padding:0">Failed to load subprocess breakdown${error.message ? ` (${error.message})` : ''}.</div>`;
  }
  if (!top.length) {
    return html`<div class="text-xs text-muted">No subprocess activity recorded
      (live correlator data only; not available for ended sessions).</div>`;
  }

  const max = Math.max(1, ...top.map(c => c.count));
  return html`<div class="subprocess-breakdown" aria-label="Top subprocesses by count">
    <div class="text-xs text-muted mb-sm">Top ${Math.min(topN, top.length)} subprocesses
      <span class="text-muted">\u00b7 total ${data.total}</span></div>
    <div class="subprocess-rows">
      ${top.map(c => {
        const pct = (c.count / max) * 100;
        return html`<div key=${c.name} class="subprocess-row">
          <span class="subprocess-name mono text-xs" title=${c.name}>${esc(c.name)}</span>
          <div class="subprocess-bar-track">
            <div class="subprocess-bar" style=${'width:' + pct + '%'}></div>
          </div>
          <span class="subprocess-count text-xs mono">${c.count}</span>
        </div>`;
      })}
    </div>
  </div>`;
}
