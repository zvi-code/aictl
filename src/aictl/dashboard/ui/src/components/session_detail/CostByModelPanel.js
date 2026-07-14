import { html } from 'htm/preact';
import { fmtK, esc } from '../../utils.js';
import * as api from '../../api.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';

// Per-session cost broken down by model. Surfaces the per-model attribution
// the session-level cost_usd aggregate hides — e.g. how much was spent on the
// expensive lead model vs. the cheap subagent model.
export default function CostByModelPanel({sessionId}) {
  const { data, loading, error } = useAsyncResource(
    () => api.getSessionCostByModel(sessionId),
    [sessionId],
    { enabled: !!sessionId },
  );

  // A falsy sessionId never fetches \u2014 keep showing the loading state, as before.
  if (loading || !sessionId) return html`<p class="loading-state">Loading cost breakdown\u2026</p>`;
  if (error) return html`<p class="empty-state">Failed to load cost data.</p>`;
  if (!data || !data.models || !data.models.length) {
    return html`<p class="empty-state">No per-model cost data recorded for this session.</p>`;
  }

  const {models, totals} = data;
  const maxCost = Math.max(...models.map(m => m.cost_usd || 0), 1e-9);

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Models</div><div class="value">${models.length}</div></div>
      <div class="es-kv-card"><div class="label">Requests</div><div class="value">${totals.requests}</div></div>
      <div class="es-kv-card"><div class="label">Total Cost</div><div class="value">$${(totals.cost_usd || 0).toFixed(4)}</div></div>
    </div>
    <div style="margin-top:var(--sp-2)">
      ${models.map((m, i) => {
        const pct = ((m.cost_usd || 0) / maxCost * 100).toFixed(1);
        const tot = (m.input_tokens || 0) + (m.output_tokens || 0);
        return html`<div key=${i} style="margin-bottom:var(--sp-2)">
          <div class="flex-row gap-sm" style="align-items:baseline;margin-bottom:2px">
            <span class="mono text-xs text-ellipsis" style="flex:1;min-width:0" title=${m.model}>${esc(m.model)}</span>
            <span class="text-xs text-muted" style="flex-shrink:0">${m.requests} req \u00b7 ${fmtK(tot)} tok</span>
            <span class="text-xs mono" style="flex-shrink:0;width:64px;text-align:right">$${(m.cost_usd || 0).toFixed(4)}</span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:3px"
              title="$${(m.cost_usd || 0).toFixed(4)}"></div>
          </div>
          <div class="text-muted" style="font-size:var(--fs-xs);margin-top:2px">
            ${fmtK(m.input_tokens || 0)} in \u00b7 ${fmtK(m.output_tokens || 0)} out
            ${m.cache_read_tokens > 0 ? html` \u00b7 ${fmtK(m.cache_read_tokens)} cache-read` : ''}
          </div>
        </div>`;
      })}
    </div>
  </div>`;
}
