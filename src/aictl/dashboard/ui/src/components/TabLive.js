import { useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtRate, fmtK, fmtPct, fmtSz, esc, liveTokenTotal } from '../utils.js';
import DataTable from './ui/DataTable.js';

function num(v) { return typeof v === 'number' && !isNaN(v) ? v : 0; }

const LIVE_COLUMNS = [
  { accessorKey: 'label', header: 'Tool', cell: (v) => esc(v) },
  {
    accessorKey: 'sessions_total', header: 'Sessions', align: 'right',
    cell: (_v, row) => html`${row.live?.session_count || 0} sess / ${row.live?.pid_count || 0} pid`,
  },
  {
    accessorKey: 'traffic_total', header: 'Traffic', align: 'right',
    cell: (_v, row) => {
      const live = row.live || {};
      return html`\u2191 ${fmtRate(live.outbound_rate_bps || 0)}<br/>\u2193 ${fmtRate(live.inbound_rate_bps || 0)}`;
    },
  },
  {
    accessorKey: 'tokens_total', header: 'Tokens', align: 'right',
    cell: (v, row) => {
      const tok = row.live?.token_estimate || {};
      return html`${fmtK(v)}<br/><span class="text-muted">${esc(tok.source || 'network-inference')} @ ${fmtPct((tok.confidence || 0) * 100)}</span>`;
    },
  },
  {
    accessorKey: 'mcp_detected', header: 'MCP', align: 'right',
    cell: (_v, row) => {
      const mcp = row.live?.mcp || {};
      return html`${mcp.detected ? 'YES' : 'NO'}<br/><span class="text-muted">${mcp.loops || 0} loops @ ${fmtPct((mcp.confidence || 0) * 100)}</span>`;
    },
  },
  {
    accessorKey: 'files_touched', header: 'Files', align: 'right',
    cell: (v, row) => html`${v || 0} touched<br/><span class="text-muted">${row.live?.file_events || 0} events</span>`,
  },
  {
    accessorKey: 'cpu_percent', header: 'CPU', align: 'right',
    cell: (v, row) => html`${fmtPct(v || 0)}<br/><span class="text-muted">peak ${fmtPct(row.live?.peak_cpu_percent || 0)}</span>`,
  },
  {
    accessorKey: 'workspace_size_mb', header: 'Workspace', align: 'right',
    cell: (v, row) => html`${fmtSz((v || 0) * 1048576)}<br/><span class="mono text-muted text-xs">${esc((row.live?.workspaces || []).slice(0, 2).join(' | ') || '(unknown)')}</span>`,
  },
];

function renderProcesses(row) {
  const procs = row.live?.processes || [];
  if (!procs.length) return html`<div class="text-muted">No processes</div>`;
  return html`<div class="text-mono" style="font-size:var(--fs-base)">
    ${procs.slice().sort((a, b) => (b.cpu_pct || 0) - (a.cpu_pct || 0)).map(p =>
      html`<div key=${p.pid} style="display:flex;gap:var(--sp-5);padding:var(--sp-1) 0">
        <span class="text-muted" style="min-width:5ch">${p.pid}</span>
        <span class="flex-1 text-ellipsis">${p.name}</span>
        <span class="text-right" style="color:${p.cpu_pct > 5 ? 'var(--orange)' : 'var(--fg2)'};min-width:5ch">${p.cpu_pct}%</span>
        <span class="text-right" style="min-width:6ch">${p.mem_mb ? fmtSz(p.mem_mb * 1048576) : ''}</span>
      </div>`)}
  </div>`;
}

export default function TabLive() {
  const { snap: s } = useContext(SnapContext);
  if (!s) return html`<p class="empty-state">Loading...</p>`;

  const liveTools = s.tools.filter(t => t.live).map(t => {
    const live = t.live || {};
    return {
      ...t,
      live,
      sessions_total: (live.session_count || 0) + (live.pid_count || 0) * 0.001,
      traffic_total: num(live.outbound_rate_bps) + num(live.inbound_rate_bps),
      tokens_total: liveTokenTotal(live),
      mcp_detected: live.mcp?.detected ? 1 : 0,
      files_touched: live.files_touched || 0,
      cpu_percent: live.cpu_percent || 0,
      workspace_size_mb: live.workspace_size_mb || 0,
    };
  });

  const diagnostics = Object.entries((s.live_monitor && s.live_monitor.diagnostics) || {});

  return html`<div class="live-stack">
    ${diagnostics.length > 0 && html`<div class="diag-card">
      <h3>Collector Health</h3>
      <table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${diagnostics.map(([name, detail]) => html`<tr key=${name}>
          <td class="mono">${name}</td>
          <td>${esc(detail.status || 'unknown')}</td>
          <td>${esc(detail.mode || 'unknown')}</td>
          <td>${esc(detail.detail || '')}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      <${DataTable}
        ariaLabel="Live tool sessions"
        data=${liveTools}
        columns=${LIVE_COLUMNS}
        rowKey="tool"
        persistKey="live-tools"
        initialSort=${{ id: 'traffic_total', desc: true }}
        emptyState="No active AI-tool sessions detected yet."
        expandable=${{ renderSubRow: renderProcesses }}
      />
    </div>

    <div class="diag-card">
      <h3>Monitor Roots</h3>
      <div class="stack-list">
        ${(s.live_monitor?.workspace_paths || []).map(path => html`<span class="pill mono" key=${'ws-' + path}>workspace: ${path}</span>`)}
        ${(s.live_monitor?.state_paths || []).map(path => html`<span class="pill mono" key=${'state-' + path}>state: ${path}</span>`)}
        ${!(s.live_monitor?.workspace_paths || []).length && !(s.live_monitor?.state_paths || []).length && html`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`;
}
