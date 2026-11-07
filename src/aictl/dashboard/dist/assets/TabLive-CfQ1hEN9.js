import{x as $,m as a}from"./index-0APVtqay.js";import{S as f}from"./app-DoCkKEKd.js";import{ai as b,y as n,M as g,J as _,x as y,D as r,w as v}from"./useSse-Dcx1BuKe.js";import{D as k}from"./DataTable-PCQcMsZF.js";import{T as x}from"./ToolScopeEmpty-CzCb5Yvm.js";import"./platform-F0jTv3XI.js";import"./Icon-1my9WQDm.js";import"./TextView-DKtsDjbG.js";function h(e){return typeof e=="number"&&!isNaN(e)?e:0}const w=[{accessorKey:"label",header:"Tool",cell:e=>n(e)},{accessorKey:"sessions_total",header:"Sessions",align:"right",cell:(e,o)=>{var t,s;return a`${((t=o.live)==null?void 0:t.session_count)||0} sess / ${((s=o.live)==null?void 0:s.pid_count)||0} pid`}},{accessorKey:"traffic_total",header:"Traffic",align:"right",cell:(e,o)=>{const t=o.live||{};return a`\u2191 ${_(t.outbound_rate_bps||0)}<br/>\u2193 ${_(t.inbound_rate_bps||0)}`}},{accessorKey:"tokens_total",header:"Tokens",align:"right",cell:(e,o)=>{var s;const t=((s=o.live)==null?void 0:s.token_estimate)||{};return a`${y(e)}<br/><span class="text-muted">${n(t.source||"network-inference")} @ ${r((t.confidence||0)*100)}</span>`}},{accessorKey:"mcp_detected",header:"MCP",align:"right",cell:(e,o)=>{var s;const t=((s=o.live)==null?void 0:s.mcp)||{};return a`${t.detected?"YES":"NO"}<br/><span class="text-muted">${t.loops||0} loops @ ${r((t.confidence||0)*100)}</span>`}},{accessorKey:"files_touched",header:"Files",align:"right",cell:(e,o)=>{var t;return a`${e||0} touched<br/><span class="text-muted">${((t=o.live)==null?void 0:t.file_events)||0} events</span>`}},{accessorKey:"cpu_percent",header:"CPU",align:"right",cell:(e,o)=>{var t;return a`${r(e||0)}<br/><span class="text-muted">peak ${r(((t=o.live)==null?void 0:t.peak_cpu_percent)||0)}</span>`}},{accessorKey:"workspace_size_mb",header:"Workspace",align:"right",cell:(e,o)=>{var t;return a`${v((e||0)*1048576)}<br/><span class="mono text-muted text-xs">${n((((t=o.live)==null?void 0:t.workspaces)||[]).slice(0,2).join(" | ")||"no workspace reported")}</span>`}}];function T(e){var t;const o=((t=e.live)==null?void 0:t.processes)||[];return o.length?a`<div class="text-mono" style="font-size:var(--fs-base)">
    ${o.slice().sort((s,c)=>(c.cpu_pct||0)-(s.cpu_pct||0)).map(s=>a`<div key=${s.pid} style="display:flex;gap:var(--sp-5);padding:var(--sp-1) 0">
        <span class="text-muted" style="min-width:5ch">${s.pid}</span>
        <span class="flex-1 text-ellipsis">${s.name}</span>
        <span class="text-right" style="color:${s.cpu_pct>5?"var(--orange)":"var(--fg2)"};min-width:5ch">${s.cpu_pct}%</span>
        <span class="text-right" style="min-width:6ch">${s.mem_mb?v(s.mem_mb*1048576):""}</span>
      </div>`)}
  </div>`:a`<div class="text-muted">No processes</div>`}function P(){var c,p,d,m;const{snap:e,enabledTools:o=null}=$(f);if(!e)return a`<p class="loading-state" role="status">Loading live data...</p>`;const t=e.tools.filter(l=>l.live).map(l=>{var u;const i=l.live||{};return{...l,live:i,sessions_total:(i.session_count||0)+(i.pid_count||0)*.001,traffic_total:h(i.outbound_rate_bps)+h(i.inbound_rate_bps),tokens_total:b(i),mcp_detected:(u=i.mcp)!=null&&u.detected?1:0,files_touched:i.files_touched||0,cpu_percent:i.cpu_percent||0,workspace_size_mb:i.workspace_size_mb||0}}),s=Object.entries(e.live_monitor&&e.live_monitor.diagnostics||{});return a`<div class="live-stack">
    ${s.length>0&&a`<div class="diag-card">
      <h3>Collector Health <span class="text-muted" style="font-weight:400">(all collectors, not per tool)</span></h3>
      <table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${s.map(([l,i])=>a`<tr key=${l}>
          <td class="mono">${l}</td>
          <td>${n(i.status||"unknown")}</td>
          <td>${n(i.mode||"unknown")}</td>
          <td>${n(i.detail||"")}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      ${t.length===0&&g(o)?a`<${x} enabledTools=${o} snap=${e} what="live sessions"/>`:a`<${k}
        ariaLabel="Live tool sessions"
        data=${t}
        columns=${w}
        rowKey="tool"
        persistKey="live-tools"
        initialSort=${{id:"traffic_total",desc:!0}}
        emptyState="No active AI-tool sessions detected yet."
        expandable=${{renderSubRow:T}}
      />`}
    </div>

    <div class="diag-card">
      <h3>Monitor Roots</h3>
      <div class="stack-list">
        ${(((c=e.live_monitor)==null?void 0:c.workspace_paths)||[]).map(l=>a`<span class="pill mono" key=${"ws-"+l}>workspace: ${l}</span>`)}
        ${(((p=e.live_monitor)==null?void 0:p.state_paths)||[]).map(l=>a`<span class="pill mono" key=${"state-"+l}>state: ${l}</span>`)}
        ${!(((d=e.live_monitor)==null?void 0:d.workspace_paths)||[]).length&&!(((m=e.live_monitor)==null?void 0:m.state_paths)||[]).length&&a`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`}export{P as default};
