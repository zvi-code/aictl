import{x as h,S as $,m as o,l as b,e as n,k as m,b as f,f as r,a as v}from"./index-DA8PvNXQ.js";import{D as g}from"./DataTable-CvSlDJga.js";function u(e){return typeof e=="number"&&!isNaN(e)?e:0}const k=[{accessorKey:"label",header:"Tool",cell:e=>n(e)},{accessorKey:"sessions_total",header:"Sessions",align:"right",cell:(e,a)=>{var t,s;return o`${((t=a.live)==null?void 0:t.session_count)||0} sess / ${((s=a.live)==null?void 0:s.pid_count)||0} pid`}},{accessorKey:"traffic_total",header:"Traffic",align:"right",cell:(e,a)=>{const t=a.live||{};return o`\u2191 ${m(t.outbound_rate_bps||0)}<br/>\u2193 ${m(t.inbound_rate_bps||0)}`}},{accessorKey:"tokens_total",header:"Tokens",align:"right",cell:(e,a)=>{var s;const t=((s=a.live)==null?void 0:s.token_estimate)||{};return o`${f(e)}<br/><span class="text-muted">${n(t.source||"network-inference")} @ ${r((t.confidence||0)*100)}</span>`}},{accessorKey:"mcp_detected",header:"MCP",align:"right",cell:(e,a)=>{var s;const t=((s=a.live)==null?void 0:s.mcp)||{};return o`${t.detected?"YES":"NO"}<br/><span class="text-muted">${t.loops||0} loops @ ${r((t.confidence||0)*100)}</span>`}},{accessorKey:"files_touched",header:"Files",align:"right",cell:(e,a)=>{var t;return o`${e||0} touched<br/><span class="text-muted">${((t=a.live)==null?void 0:t.file_events)||0} events</span>`}},{accessorKey:"cpu_percent",header:"CPU",align:"right",cell:(e,a)=>{var t;return o`${r(e||0)}<br/><span class="text-muted">peak ${r(((t=a.live)==null?void 0:t.peak_cpu_percent)||0)}</span>`}},{accessorKey:"workspace_size_mb",header:"Workspace",align:"right",cell:(e,a)=>{var t;return o`${v((e||0)*1048576)}<br/><span class="mono text-muted text-xs">${n((((t=a.live)==null?void 0:t.workspaces)||[]).slice(0,2).join(" | ")||"no workspace reported")}</span>`}}];function y(e){var t;const a=((t=e.live)==null?void 0:t.processes)||[];return a.length?o`<div class="text-mono" style="font-size:var(--fs-base)">
    ${a.slice().sort((s,c)=>(c.cpu_pct||0)-(s.cpu_pct||0)).map(s=>o`<div key=${s.pid} style="display:flex;gap:var(--sp-5);padding:var(--sp-1) 0">
        <span class="text-muted" style="min-width:5ch">${s.pid}</span>
        <span class="flex-1 text-ellipsis">${s.name}</span>
        <span class="text-right" style="color:${s.cpu_pct>5?"var(--orange)":"var(--fg2)"};min-width:5ch">${s.cpu_pct}%</span>
        <span class="text-right" style="min-width:6ch">${s.mem_mb?v(s.mem_mb*1048576):""}</span>
      </div>`)}
  </div>`:o`<div class="text-muted">No processes</div>`}function K(){var s,c,d,p;const{snap:e}=h($);if(!e)return o`<p class="loading-state" role="status">Loading live data...</p>`;const a=e.tools.filter(l=>l.live).map(l=>{var _;const i=l.live||{};return{...l,live:i,sessions_total:(i.session_count||0)+(i.pid_count||0)*.001,traffic_total:u(i.outbound_rate_bps)+u(i.inbound_rate_bps),tokens_total:b(i),mcp_detected:(_=i.mcp)!=null&&_.detected?1:0,files_touched:i.files_touched||0,cpu_percent:i.cpu_percent||0,workspace_size_mb:i.workspace_size_mb||0}}),t=Object.entries(e.live_monitor&&e.live_monitor.diagnostics||{});return o`<div class="live-stack">
    ${t.length>0&&o`<div class="diag-card">
      <h3>Collector Health</h3>
      <table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${t.map(([l,i])=>o`<tr key=${l}>
          <td class="mono">${l}</td>
          <td>${n(i.status||"unknown")}</td>
          <td>${n(i.mode||"unknown")}</td>
          <td>${n(i.detail||"")}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      <${g}
        ariaLabel="Live tool sessions"
        data=${a}
        columns=${k}
        rowKey="tool"
        persistKey="live-tools"
        initialSort=${{id:"traffic_total",desc:!0}}
        emptyState="No active AI-tool sessions detected yet."
        expandable=${{renderSubRow:y}}
      />
    </div>

    <div class="diag-card">
      <h3>Monitor Roots</h3>
      <div class="stack-list">
        ${(((s=e.live_monitor)==null?void 0:s.workspace_paths)||[]).map(l=>o`<span class="pill mono" key=${"ws-"+l}>workspace: ${l}</span>`)}
        ${(((c=e.live_monitor)==null?void 0:c.state_paths)||[]).map(l=>o`<span class="pill mono" key=${"state-"+l}>state: ${l}</span>`)}
        ${!(((d=e.live_monitor)==null?void 0:d.workspace_paths)||[]).length&&!(((p=e.live_monitor)==null?void 0:p.state_paths)||[]).length&&o`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`}export{K as default};
