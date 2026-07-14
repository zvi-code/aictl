import { html } from 'htm/preact';
import { fmtK } from '../../utils.js';
import * as api from '../../api.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';

export default function ProjectCostPanel({project}) {
  const { data: costs, loading, error } = useAsyncResource(
    () => api.getProjectCosts(7).then(data => {
      const match = Array.isArray(data) ? data.find(p => p.project === project) : null;
      return match || null;
    }),
    [project],
    { enabled: !!project },
  );

  if (loading) return html`<p class="loading-state">Loading project costs...</p>`;
  if (error) return html`<p class="error-state">Failed to load project costs${error.message ? ` (${error.message})` : ''}.</p>`;
  if (!costs) return html`<p class="empty-state">No cost data available for this project.</p>`;

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${costs.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${fmtK(costs.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${fmtK(costs.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value">$${costs.cost_usd.toFixed(2)}</div></div>
    </div>
    ${costs.daily && costs.daily.length > 0 && html`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${costs.daily.map(d => {
        const total = d.input_tokens + d.output_tokens;
        const maxTok = Math.max(...costs.daily.map(dd => dd.input_tokens + dd.output_tokens), 1);
        const pct = (total / maxTok * 100).toFixed(1);
        const lbl = new Date(d.date + 'T12:00:00').toLocaleDateString([], {weekday: 'short', month: 'numeric', day: 'numeric'});
        return html`<div key=${d.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${lbl}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${pct}%;background:var(--green);border-radius:3px"
              title="${fmtK(total)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${fmtK(total)}</span>
        </div>`;
      })}
    </div>`}
  </div>`;
}
