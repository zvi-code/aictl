import { useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtRate, fmtK, fmtPct, fmtSz, esc, liveTokenTotal } from '../utils.js';

export default function TabLive() {
  const {snap: s} = useContext(SnapContext);
  if(!s) return html`<p class="empty-state">Loading...</p>`;
  const liveTools = s.tools.filter(t=>t.live).sort((a,b)=>
    ((b.live?.outbound_rate_bps||0)+(b.live?.inbound_rate_bps||0)) -
    ((a.live?.outbound_rate_bps||0)+(a.live?.inbound_rate_bps||0))
  );
  const diagnostics = Object.entries((s.live_monitor&&s.live_monitor.diagnostics)||{});
  return html`<div class="live-stack">
    ${diagnostics.length>0 && html`<div class="diag-card">
      <h3>Collector Health</h3>
      <table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${diagnostics.map(([name,detail])=>html`<tr key=${name}>
          <td class="mono">${name}</td>
          <td>${esc(detail.status||'unknown')}</td>
          <td>${esc(detail.mode||'unknown')}</td>
          <td>${esc(detail.detail||'')}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      ${liveTools.length ? html`<table role="table" aria-label="Live tool sessions">
        <thead><tr><th>Tool</th><th>Sessions</th><th>Traffic</th><th>Tokens</th><th>MCP</th><th>Files</th><th>CPU</th><th>Workspace</th><th>State</th></tr></thead>
        <tbody>${liveTools.map(t=>{
          const live=t.live||{}, tok=live.token_estimate||{}, mcp=live.mcp||{};
          return html`<tr key=${t.tool}>
            <td>${esc(t.label)}</td>
            <td>${live.session_count||0} sess / ${live.pid_count||0} pid</td>
            <td>\u2191 ${fmtRate(live.outbound_rate_bps||0)}<br/>\u2193 ${fmtRate(live.inbound_rate_bps||0)}</td>
            <td>${fmtK(liveTokenTotal(live))}<br/><span class="text-muted">${esc(tok.source||'network-inference')} @ ${fmtPct((tok.confidence||0)*100)}</span></td>
            <td>${mcp.detected ? 'YES' : 'NO'}<br/><span class="text-muted">${mcp.loops||0} loops @ ${fmtPct((mcp.confidence||0)*100)}</span></td>
            <td>${live.files_touched||0} touched<br/><span class="text-muted">${live.file_events||0} events</span></td>
            <td>${fmtPct(live.cpu_percent||0)}<br/><span class="text-muted">peak ${fmtPct(live.peak_cpu_percent||0)}</span></td>
            <td>${fmtSz((live.workspace_size_mb||0)*1048576)}<br/><span class="mono text-muted text-xs">${esc((live.workspaces||[]).slice(0,2).join(' | ') || '(unknown)')}</span></td>
            <td>${(live.state_bytes_written||0) > 0 ? fmtSz(live.state_bytes_written||0) : '\u2014'}</td>
          </tr>
          ${(live.processes||[]).length>0 && html`<tr key=${t.tool+'-procs'}>
            <td colspan="9" style="padding:var(--sp-1) var(--sp-5);background:var(--bg)">
              <details style="font-size:var(--fs-base)">
                <summary class="cursor-ptr text-muted">${live.processes.length} processes</summary>
                <div class="text-mono" style="margin-top:var(--sp-1);font-size:0.7rem">
                  ${live.processes.sort((a,b)=>(b.cpu_pct||0)-(a.cpu_pct||0)).map(p=>
                    html`<div key=${p.pid} style="display:flex;gap:var(--sp-5);padding:var(--sp-1) 0">
                      <span class="text-muted" style="min-width:5ch">${p.pid}</span>
                      <span class="flex-1 text-ellipsis">${p.name}</span>
                      <span class="text-right" style="color:${p.cpu_pct>5?'var(--orange)':'var(--fg2)'};min-width:5ch">${p.cpu_pct}%</span>
                      <span class="text-right" style="min-width:6ch">${p.mem_mb?fmtSz(p.mem_mb*1048576):''}</span>
                    </div>`)}
                </div>
              </details>
            </td>
          </tr>`}`;
        })}</tbody>
      </table>` : html`<p class="empty-state">No active AI-tool sessions detected yet.</p>`}
    </div>

    <div class="diag-card">
      <h3>Monitor Roots</h3>
      <div class="stack-list">
        ${(s.live_monitor?.workspace_paths||[]).map(path=>html`<span class="pill mono" key=${'ws-'+path}>workspace: ${path}</span>`)}
        ${(s.live_monitor?.state_paths||[]).map(path=>html`<span class="pill mono" key=${'state-'+path}>state: ${path}</span>`)}
        ${!(s.live_monitor?.workspace_paths||[]).length && !(s.live_monitor?.state_paths||[]).length && html`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`;
}
