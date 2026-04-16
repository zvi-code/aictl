import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtK, fmtSz, fmtPct } from '../../utils.js';
import * as api from '../../api.js';
import RateLimitGauge from './RateLimitGauge.js';

export default function ResourcesPanel({session}) {
  const inTok = session.exact_input_tokens || 0;
  const outTok = session.exact_output_tokens || 0;
  const [avgData, setAvgData] = useState(null);

  useEffect(() => {
    if (!session.tool) return;
    api.getSessions({ tool: session.tool, active: false, limit: 20 })
      .then(data => {
        if (data.length > 1) {
          const durations = data.filter(s => s.duration_s > 0).map(s => s.duration_s);
          const avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
          setAvgData({ avgDuration: avgDur, sampleCount: data.length });
        }
      })
      .catch(() => {});
  }, [session.tool]);

  const curDur = session.duration_s || 0;
  const ratio = avgData && avgData.avgDuration > 0 ? curDur / avgData.avgDuration : null;

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${fmtK(inTok)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${fmtK(outTok)}</div></div>
      <div class="es-kv-card"><div class="label">Total Tokens</div><div class="value">${fmtK(inTok + outTok)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${fmtPct(session.cpu_percent || 0)}</div></div>
      <div class="es-kv-card"><div class="label">Peak CPU</div><div class="value">${fmtPct(session.peak_cpu_percent || 0)}</div></div>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Inbound</div><div class="value">${fmtSz(session.inbound_bytes || 0)}</div></div>
      <div class="es-kv-card"><div class="label">Outbound</div><div class="value">${fmtSz(session.outbound_bytes || 0)}</div></div>
      <div class="es-kv-card"><div class="label">State Writes</div><div class="value">${fmtSz(session.state_bytes_written || 0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(session.pids) ? session.pids.length : (session.pids || 0)}</div></div>
    </div>
    ${ratio != null && html`<div class="text-xs text-muted" style="margin-top:var(--sp-3)">
      vs average (${avgData.sampleCount} sessions):
      duration ${ratio > 1.2 ? html`<span class="text-orange">${(ratio).toFixed(1)}x longer</span>`
        : ratio < 0.8 ? html`<span class="text-green">${(1/ratio).toFixed(1)}x shorter</span>`
        : html`<span>similar</span>`}
    </div>`}
    ${session.entity_state && html`<${RateLimitGauge} rateLimits=${session.entity_state.rate_limits}/>`}
  </div>`;
}
