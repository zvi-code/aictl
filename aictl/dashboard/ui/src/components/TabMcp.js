import { useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { SC, esc, fmtPct, fmtSz } from '../utils.js';

export default function TabMcp() {
  const {snap: s} = useContext(SnapContext);
  if(!s||!s.mcp_detail.length) return html`<p class="empty-state">No MCP servers configured.</p>`;
  return html`<table role="table" aria-label="MCP Servers">
    <thead><tr><th></th><th>Server</th><th>Tool</th><th>Transport</th><th>Endpoint</th><th>CPU</th><th>Mem</th><th>Status</th></tr></thead>
    <tbody>${s.mcp_detail.map(m=>{const run=m.status==='running'&&m.pid,cpu=parseFloat(m.cpu_pct)||0,cpuC=cpu>80?'var(--red)':cpu>50?'var(--orange)':'inherit';return html`<tr key=${m.name+m.tool}>
      <td><span class="status-dot" style=${'background:'+SC[m.status]||'var(--fg2)'}></span></td>
      <td>${esc(m.name)}</td><td>${esc(m.tool)}</td><td>${esc(m.transport)}</td>
      <td class="text-ellipsis" style="max-width:300px" title=${m.endpoint}>${esc((m.endpoint||'').slice(0,80))}</td>
      <td style=${'color:'+cpuC}>${run&&m.cpu_pct?fmtPct(m.cpu_pct):'\u2014'}</td>
      <td>${run&&m.mem_mb?fmtSz(parseFloat(m.mem_mb)*1048576):'\u2014'}</td>
      <td>${m.status}${m.pid?' (PID '+m.pid+')':''}</td>
    </tr>`})}</tbody>
  </table>`;
}
