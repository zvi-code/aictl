import { html } from 'htm/preact';
import { fmtPct } from '../../utils.js';

export default function RateLimitGauge({rateLimits}) {
  if (!rateLimits || !Object.keys(rateLimits).length) return null;
  return html`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(rateLimits).map(([window, data]) => {
        const pct = data.used_pct || data.used_percentage || 0;
        const color = pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--orange)' : 'var(--green)';
        const resets = data.resets_at || '';
        return html`<div key=${window} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${window} window</span>
            <span style="color:${color};font-weight:600">${fmtPct(pct)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(pct, 100)}%;background:${color};border-radius:4px"></div>
          </div>
          ${resets && html`<div class="text-xs text-muted" style="margin-top:2px">resets ${resets}</div>`}
        </div>`;
      })}
    </div>
  </div>`;
}
