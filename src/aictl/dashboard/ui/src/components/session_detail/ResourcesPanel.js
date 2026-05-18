import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtK, fmtSz, fmtPct } from '../../utils.js';
import * as api from '../../api.js';
import RateLimitGauge from './RateLimitGauge.js';
import SubprocessBreakdown from './SubprocessBreakdown.js';

export default function ResourcesPanel({session}) {
  const inTok = session.exact_input_tokens || 0;
  const outTok = session.exact_output_tokens || 0;
  const [avgData, setAvgData] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);

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

  useEffect(() => {
    if (!session.session_id) return;
    api.getSessionStats(session.session_id)
      .then(d => setSessionStats(d && !d.error ? d : null))
      .catch(() => setSessionStats(null));
  }, [session.session_id]);

  const curDur = session.duration_s || 0;
  const ratio = avgData && avgData.avgDuration > 0 ? curDur / avgData.avgDuration : null;
  const lmUsage = sessionStats?.vscode_lm_usage || null;
  const skillBreakdown = sessionStats?.skill_call_breakdown || {};
  const skillRows = Object.entries(skillBreakdown).sort((a, b) => b[1] - a[1]);
  const agents = sessionStats?.agents || [];

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
    ${sessionStats && html`<div class="session-agent-report" style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted mb-sm">Skills and subagents</div>
      <div class="es-kv" style="gap:var(--sp-3)">
        <div class="es-kv-card"><div class="label">Skill Calls</div><div class="value">${sessionStats.skill_calls || 0}</div></div>
        <div class="es-kv-card"><div class="label">Subagents</div><div class="value">${agents.length}</div></div>
        <div class="es-kv-card"><div class="label">Tool Calls</div><div class="value">${sessionStats.tool_calls || 0}</div></div>
      </div>
      ${skillRows.length > 0 && html`<div class="lm-usage-breakdown" style="margin-top:var(--sp-2)">
        ${skillRows.map(([skill, count]) => html`<div key=${skill} class="lm-usage-row flex-row gap-sm"
          style="align-items:center;padding:var(--sp-1) 0">
          <span class="mono text-xs" style="flex:1">${skill}</span>
          <span class="text-xs mono">${count}</span>
        </div>`)}
      </div>`}
      ${agents.length > 0 && html`<div class="lm-usage-breakdown" style="margin-top:var(--sp-2)">
        ${agents.slice(0, 8).map(agent => html`<div key=${agent.agent_id} class="lm-usage-row flex-row gap-sm"
          style="align-items:center;padding:var(--sp-1) 0">
          <span class="mono text-xs" style="flex:1" title=${agent.task || ''}>${agent.agent_id || 'subagent'}</span>
          <span class="text-xs text-muted">${agent.state || ''}</span>
        </div>`)}
      </div>`}
    </div>`}
    ${lmUsage && Object.keys(lmUsage.by_extension || {}).length > 0 && html`
      <div class="lm-usage-breakdown" style="margin-top:var(--sp-3)">
        <div class="text-xs text-muted mb-sm">VS Code Language-Model tokens by extension
          <span class="text-muted">\u00b7 total ${fmtK(lmUsage.total_tokens || 0)}</span></div>
        <div>
          ${Object.entries(lmUsage.by_extension)
            .sort((a, b) => (b[1].total_tokens || 0) - (a[1].total_tokens || 0))
            .map(([ext, stats]) => {
              const total = lmUsage.total_tokens || 1;
              const pct = ((stats.total_tokens || 0) / total) * 100;
              return html`<div key=${ext} class="lm-usage-row flex-row gap-sm"
                style="align-items:center;padding:var(--sp-1) 0">
                <span class="mono text-xs" style="flex:1" title=${ext}>${ext}</span>
                <div style="width:80px;height:6px;background:var(--bg-alt);border-radius:3px;overflow:hidden">
                  <div style=${'width:' + pct.toFixed(1) + '%;height:100%;background:var(--accent)'}></div>
                </div>
                <span class="text-xs mono">${fmtK(stats.total_tokens || 0)}</span>
                <span class="text-xs text-muted mono">(${stats.calls || 0})</span>
              </div>`;
            })}
        </div>
      </div>`}
    <div style="margin-top:var(--sp-3)">
      <${SubprocessBreakdown} sessionId=${session.session_id} topN=${10}/>
    </div>
  </div>`;
}
