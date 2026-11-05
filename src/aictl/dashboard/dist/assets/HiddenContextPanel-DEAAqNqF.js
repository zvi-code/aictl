import{d as f,m as n,ap as x}from"./index-D-7_bwBz.js";import{u as S}from"./useAsyncResource-rXacruJh.js";const j=600,B={high:"var(--red)",medium:"var(--orange)",low:"var(--yellow)",info:"var(--fg2)"},r={padding:"2px 8px",borderBottom:"1px solid var(--border)",textAlign:"left"},l={fontFamily:"var(--font-mono, monospace)",wordBreak:"break-all"};function T(t){return t?t<1024?`${t} B`:t<1024*1024?`${(t/1024).toFixed(1)} KB`:`${(t/1024/1024).toFixed(1)} MB`:"0 B"}function E(t){return t<90?`${Math.round(t)} s ago`:t<5400?`${Math.round(t/60)} min ago`:`${Math.round(t/3600)} h ago`}function b({severity:t,count:e}){return n`<span
    data-severity=${t}
    title=${`${t} severity`}
    style=${{color:B[t],fontWeight:600,marginRight:"10px"}}
  >${e===void 0?t:`${e} ${t}`}</span>`}function R({finding:t}){const e=t.path+(t.line?`:${t.line}`:"");return n`<details data-rule=${t.rule} style=${{borderBottom:"1px solid var(--border)",padding:"4px 0"}}>
    <summary style=${{cursor:"pointer"}} title=${t.why}>
      <${b} severity=${t.severity} />
      <span style=${l}>${t.rule}</span>
      ${t.count>1?n` <span style=${{color:"var(--fg2)"}}>x${t.count}</span>`:null}
      <div style=${{...l,color:"var(--fg2)"}}>${e}</div>
      ${t.snippet?n`<div style=${l}>${t.snippet}</div>`:null}
    </summary>
    <div style=${{padding:"4px 0 4px 12px"}}>
      <div><b>Why:</b> ${t.why}</div>
      ${t.action?n`<div><b>What to do:</b> ${t.action}</div>`:null}
      ${t.session_id?n`<div><b>Session:</b> <span style=${l}>${t.session_id}</span></div>`:null}
      ${t.tools&&t.tools.length?n`<div><b>Tools:</b> ${t.tools.join(", ")}</div>`:null}
    </div>
  </details>`}function q({sources:t}){return n`<table style=${{width:"100%",borderCollapse:"collapse"}}>
    <thead><tr>
      ${["Tool","Scope","Loading","Size","Tokens","Git","Path"].map(e=>n`<th key=${e} style=${r}>${e}</th>`)}
    </tr></thead>
    <tbody>
      ${t.map(e=>n`<tr key=${`${e.tool}|${e.path}`} title=${e.note||e.origin}>
        <td style=${r}>${e.tool}</td>
        <td style=${r}>${e.scope}</td>
        <td style=${r}>${e.readable?e.loading:`${e.loading} (no file shows this)`}</td>
        <td style=${r}>${T(e.bytes)}</td>
        <td style=${r}>${e.est_tokens?`~${e.est_tokens}`:"0"}</td>
        <td style=${r}>${e.git_state||"n/a"}</td>
        <td style=${{...r,...l}}>
          ${e.path}${e.symlink_target?` -> ${e.symlink_target}`:""}
          ${e.note?n`<div style=${{color:"var(--fg2)"}}>${e.note}</div>`:null}
          ${e.why_in_effect&&!e.in_project?n`<div data-testid="outside-project" style=${{color:"var(--orange)"}}>${e.why_in_effect}</div>`:null}
        </td>
      </tr>`)}
    </tbody>
  </table>`}function C({drift:t}){if(!t)return null;if(t.baseline_created)return n`<div data-testid="drift">Baseline created now. Later changes will show here.</div>`;const e=[...t.new.map(s=>["new",s]),...t.changed.map(s=>["changed",s]),...t.removed.map(s=>["removed",s])];return n`<details data-testid="drift">
    <summary style=${{cursor:"pointer"}}>
      Drift: ${t.new.length} new, ${t.changed.length} changed, ${t.removed.length} removed,
      ${" "}${t.agent_writes.length} agent writes
    </summary>
    ${e.map(([s,o])=>n`<div key=${`${s}|${o.path}`} style=${l} title=${o.tool}>${s}: ${o.path}</div>`)}
    ${t.agent_writes.map(s=>n`<div key=${`w|${s.path}|${s.session_id}`} style=${l}>
      agent write: ${s.path} (session ${s.session_id}, via ${s.via})
    </div>`)}
  </details>`}function A({row:t}){return n`<div data-testid="unattributed" title=${t.method}>
    ${t.tool}: about ${t.residual_tokens} of ${t.first_request_tokens_median} first-request tokens are not
    explained, after ~${t.inventory_always_tokens} inventory, ~${t.dynamic_tokens} dynamic and a
    ${" "}${t.builtin_allowance_tokens} built-in allowance. Estimate from ${t.sessions_sampled} sessions.
  </div>`}function $(t,e){return e?`${t}:${e}`:t}function M({eff:t}){const e=t.conflicts||[],s=t.limited||[];return n`<div data-testid="effective-model" data-tool=${t.tool} data-conflict=${e.length?"yes":"no"}
    style=${{borderBottom:"1px solid var(--border)",padding:"4px 0"}}>
    ${e.map(o=>n`<div key=${$(o.request.path,o.request.line)} data-testid="effective-conflict"
      style=${{color:"var(--red)",fontWeight:600}}>
      Conflict: ${o.request.values.join(", ")} requested at <span style=${l}>${$(o.request.path,o.request.line)}</span>,
      ${" "}but ${o.pin.value} is pinned at <span style=${l}>${$(o.pin.path,o.pin.line)}</span>
    </div>`)}
    <div><b>${t.tool}:</b> <span style=${l}>${t.value||"no pin"}</span>
      ${t.value&&!t.verified?n` <span style=${{color:"var(--orange)"}}>(order unverified)</span>`:null}
    </div>
    ${t.value?n`<div style=${{...l,color:"var(--fg2)"}}>${$(t.source,t.line)} (${t.scope})</div>`:null}
    <div style=${{color:t.in_project?"var(--fg2)":"var(--orange)"}}>${t.why_in_effect}</div>
    ${(t.overrides||[]).map(o=>n`<div key=${$(o.path,o.line)} style=${l}>
      overrides ${o.value} at ${$(o.path,o.line)} (${o.scope})
    </div>`)}
    ${s.length?n`<details>
      <summary style=${{cursor:"pointer"}}>${s.length} pins limited to one agent, prompt or setting</summary>
      ${s.map(o=>n`<div key=${`${o.path}|${o.setting}|${o.line}`} style=${l}
        title=${o.why_in_effect}>${o.applies}: ${o.value} at ${$(o.path,o.line)} (${o.in_project?"in this project":"not in this project"})</div>`)}
    </details>`:null}
  </div>`}function W({models:t}){const e=Object.values(t||{});if(!e.length)return null;const s=[...e].sort((o,i)=>(i.conflicts||[]).length-(o.conflicts||[]).length);return n`<section data-testid="effective-models" style=${{marginBottom:"8px"}}>
    <h4 style=${{margin:"0 0 4px"}}>Effective model</h4>
    ${s.map(o=>n`<${M} key=${o.tool} eff=${o} />`)}
  </section>`}function O(){const[t,e]=f(0),[s,o]=f(!1),{data:i,loading:_,error:u}=S(()=>x("/api/context-audit"),[t]),c=n`<button type="button" onClick=${()=>e(a=>a+1)}>Rescan</button>`;if(_&&!i)return n`<div data-state="loading" style=${{color:"var(--fg2)"}}>Scanning context sources...</div>`;if(u)return n`<div data-state="error" style=${{color:"var(--red)"}}>
      Context audit failed: ${String(u.message||u)} ${c}
    </div>`;const d=i&&i.sources||[],p=i&&i.findings||[];if(!d.length&&!p.length)return n`<div data-state="empty" style=${{color:"var(--fg2)"}}>
      No context sources found for ${i&&i.project||"this project"}. ${c}
    </div>`;const h=Date.now()/1e3-(i.scanned_at||0),v=h>j,y=i.counts||{},g=s?p:p.filter(a=>a.severity!=="info"),w=d.filter(a=>a.loading==="always").reduce((a,m)=>a+(m.est_tokens||0),0),k=Object.entries(i.sources_per_tool||{});return n`<div data-state=${v?"stale":"ready"}>
    <${W} models=${i.effective_models} />
    <div style=${{display:"flex",flexWrap:"wrap",gap:"8px",alignItems:"baseline"}}>
      ${["high","medium","low","info"].map(a=>n`<${b} key=${a} severity=${a} count=${y[a]||0} />`)}
      <span title=${k.map(([a,m])=>`${a}: ${m}`).join(`
`)}>${d.length} sources</span>
      <span title="Estimated at four characters per token">~${w} always-loaded tokens</span>
      <span style=${{color:v?"var(--orange)":"var(--fg2)"}} data-testid="scan-age">
        ${v?"Stale: ":""}scanned ${E(h)} in ${i.duration_ms} ms
      </span>
      ${c}
    </div>
    <${C} drift=${i.drift} />
    ${(i.unattributed||[]).map(a=>n`<${A} key=${a.tool} row=${a} />`)}
    <div style=${{marginTop:"8px"}}>
      ${g.length?g.map(a=>n`<${R} key=${`${a.rule}|${a.path}|${a.line}|${a.session_id}`} finding=${a} />`):n`<div data-testid="no-findings" style=${{color:"var(--fg2)"}}>No findings above info level.</div>`}
      ${y.info?n`<button type="button" onClick=${()=>o(a=>!a)}>
        ${s?"Hide":"Show"} ${y.info} info findings
      </button>`:null}
    </div>
    <details style=${{marginTop:"8px"}}>
      <summary style=${{cursor:"pointer"}}>All ${d.length} sources</summary>
      <${q} sources=${d} />
    </details>
  </div>`}export{O as HiddenContextPanel,j as STALE_AFTER_S,O as default};
