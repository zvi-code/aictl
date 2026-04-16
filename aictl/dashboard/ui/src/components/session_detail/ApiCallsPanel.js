import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtK, esc } from '../../utils.js';
import * as api from '../../api.js';

export default function ApiCallsPanel({sessionId}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const since = Math.floor(Date.now() / 1000) - 3600;
    api.getApiCalls(since, 100)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) return html`<p class="loading-state">Loading API call data...</p>`;
  if (!data || !data.calls || !data.calls.length) {
    return html`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;
  }

  const {calls, summary} = data;

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">API Calls</div><div class="value">${summary.total_calls}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${summary.total_errors > 0 ? 'var(--red)' : 'var(--fg)'}">${summary.total_errors}</div>
      </div>
      <div class="es-kv-card"><div class="label">Avg Latency</div><div class="value">${summary.avg_latency_ms}ms</div></div>
      <div class="es-kv-card"><div class="label">P95 Latency</div><div class="value">${summary.p95_latency_ms}ms</div></div>
    </div>
    ${summary.by_model && Object.keys(summary.by_model).length > 0 && html`
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By model</div>
      <div class="flex-row gap-sm flex-wrap" style="margin-bottom:var(--sp-3)">
        ${Object.entries(summary.by_model).map(([model, count]) => html`
          <span key=${model} class="badge text-xs">${model}: ${count}</span>
        `)}
      </div>
    `}
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${calls.slice(0, 30).map((c, i) => {
        const isErr = c.status === 'error';
        const date = new Date(c.ts * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
        return html`<div key=${i} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${date}</span>
          <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${isErr ? 'var(--red)' : 'var(--green)'}"></span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${c.model || '\u2014'}</span>
          ${!isErr && html`<span style="width:50px;flex-shrink:0;text-align:right">${c.duration_ms || 0}ms</span>`}
          ${!isErr && html`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${fmtK(c.input_tokens || 0)}in</span>`}
          ${isErr && html`<span style="color:var(--red)">${esc(c.error || 'error')}</span>`}
        </div>`;
      })}
    </div>
  </div>`;
}
