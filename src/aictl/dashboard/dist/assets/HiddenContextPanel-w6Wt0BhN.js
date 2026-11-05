import{d as g,m as o,ap as x}from"./index-bTWi6ueq.js";import{u as w}from"./useAsyncResource-BHqQN3Us.js";const S=600,B={high:"var(--red)",medium:"var(--orange)",low:"var(--yellow)",info:"var(--fg2)"},r={padding:"2px 8px",borderBottom:"1px solid var(--border)",textAlign:"left"},i={fontFamily:"var(--font-mono, monospace)",wordBreak:"break-all"};function T(t){return t?t<1024?`${t} B`:t<1024*1024?`${(t/1024).toFixed(1)} KB`:`${(t/1024/1024).toFixed(1)} MB`:"0 B"}function R(t){return t<90?`${Math.round(t)} s ago`:t<5400?`${Math.round(t/60)} min ago`:`${Math.round(t/3600)} h ago`}function f({severity:t,count:e}){return o`<span
    data-severity=${t}
    title=${`${t} severity`}
    style=${{color:B[t],fontWeight:600,marginRight:"10px"}}
  >${e===void 0?t:`${e} ${t}`}</span>`}function A({finding:t}){const e=t.path+(t.line?`:${t.line}`:"");return o`<details data-rule=${t.rule} style=${{borderBottom:"1px solid var(--border)",padding:"4px 0"}}>
    <summary style=${{cursor:"pointer"}} title=${t.why}>
      <${f} severity=${t.severity} />
      <span style=${i}>${t.rule}</span>
      ${t.count>1?o` <span style=${{color:"var(--fg2)"}}>x${t.count}</span>`:null}
      <div style=${{...i,color:"var(--fg2)"}}>${e}</div>
      ${t.snippet?o`<div style=${i}>${t.snippet}</div>`:null}
    </summary>
    <div style=${{padding:"4px 0 4px 12px"}}>
      <div><b>Why:</b> ${t.why}</div>
      ${t.action?o`<div><b>What to do:</b> ${t.action}</div>`:null}
      ${t.session_id?o`<div><b>Session:</b> <span style=${i}>${t.session_id}</span></div>`:null}
      ${t.tools&&t.tools.length?o`<div><b>Tools:</b> ${t.tools.join(", ")}</div>`:null}
    </div>
  </details>`}function C({sources:t}){return o`<table style=${{width:"100%",borderCollapse:"collapse"}}>
    <thead><tr>
      ${["Tool","Scope","Loading","Size","Tokens","Git","Path"].map(e=>o`<th key=${e} style=${r}>${e}</th>`)}
    </tr></thead>
    <tbody>
      ${t.map(e=>o`<tr key=${`${e.tool}|${e.path}`} title=${e.note||e.origin}>
        <td style=${r}>${e.tool}</td>
        <td style=${r}>${e.scope}</td>
        <td style=${r}>${e.readable?e.loading:`${e.loading} (no file shows this)`}</td>
        <td style=${r}>${T(e.bytes)}</td>
        <td style=${r}>${e.est_tokens?`~${e.est_tokens}`:"0"}</td>
        <td style=${r}>${e.git_state||"n/a"}</td>
        <td style=${{...r,...i}}>
          ${e.path}${e.symlink_target?` -> ${e.symlink_target}`:""}
          ${e.note?o`<div style=${{color:"var(--fg2)"}}>${e.note}</div>`:null}
        </td>
      </tr>`)}
    </tbody>
  </table>`}function E({drift:t}){if(!t)return null;if(t.baseline_created)return o`<div data-testid="drift">Baseline created now. Later changes will show here.</div>`;const e=[...t.new.map(n=>["new",n]),...t.changed.map(n=>["changed",n]),...t.removed.map(n=>["removed",n])];return o`<details data-testid="drift">
    <summary style=${{cursor:"pointer"}}>
      Drift: ${t.new.length} new, ${t.changed.length} changed, ${t.removed.length} removed,
      ${" "}${t.agent_writes.length} agent writes
    </summary>
    ${e.map(([n,l])=>o`<div key=${`${n}|${l.path}`} style=${i} title=${l.tool}>${n}: ${l.path}</div>`)}
    ${t.agent_writes.map(n=>o`<div key=${`w|${n.path}|${n.session_id}`} style=${i}>
      agent write: ${n.path} (session ${n.session_id}, via ${n.via})
    </div>`)}
  </details>`}function j({row:t}){return o`<div data-testid="unattributed" title=${t.method}>
    ${t.tool}: about ${t.residual_tokens} of ${t.first_request_tokens_median} first-request tokens are not
    explained, after ~${t.inventory_always_tokens} inventory, ~${t.dynamic_tokens} dynamic and a
    ${" "}${t.builtin_allowance_tokens} built-in allowance. Estimate from ${t.sessions_sampled} sessions.
  </div>`}function M(){const[t,e]=g(0),[n,l]=g(!1),{data:s,loading:b,error:d}=w(()=>x("/api/context-audit"),[t]),u=o`<button type="button" onClick=${()=>e(a=>a+1)}>Rescan</button>`;if(b&&!s)return o`<div data-state="loading" style=${{color:"var(--fg2)"}}>Scanning context sources...</div>`;if(d)return o`<div data-state="error" style=${{color:"var(--red)"}}>
      Context audit failed: ${String(d.message||d)} ${u}
    </div>`;const $=s&&s.sources||[],c=s&&s.findings||[];if(!$.length&&!c.length)return o`<div data-state="empty" style=${{color:"var(--fg2)"}}>
      No context sources found for ${s&&s.project||"this project"}. ${u}
    </div>`;const m=Date.now()/1e3-(s.scanned_at||0),p=m>S,y=s.counts||{},h=n?c:c.filter(a=>a.severity!=="info"),_=$.filter(a=>a.loading==="always").reduce((a,v)=>a+(v.est_tokens||0),0),k=Object.entries(s.sources_per_tool||{});return o`<div data-state=${p?"stale":"ready"}>
    <div style=${{display:"flex",flexWrap:"wrap",gap:"8px",alignItems:"baseline"}}>
      ${["high","medium","low","info"].map(a=>o`<${f} key=${a} severity=${a} count=${y[a]||0} />`)}
      <span title=${k.map(([a,v])=>`${a}: ${v}`).join(`
`)}>${$.length} sources</span>
      <span title="Estimated at four characters per token">~${_} always-loaded tokens</span>
      <span style=${{color:p?"var(--orange)":"var(--fg2)"}} data-testid="scan-age">
        ${p?"Stale: ":""}scanned ${R(m)} in ${s.duration_ms} ms
      </span>
      ${u}
    </div>
    <${E} drift=${s.drift} />
    ${(s.unattributed||[]).map(a=>o`<${j} key=${a.tool} row=${a} />`)}
    <div style=${{marginTop:"8px"}}>
      ${h.length?h.map(a=>o`<${A} key=${`${a.rule}|${a.path}|${a.line}|${a.session_id}`} finding=${a} />`):o`<div data-testid="no-findings" style=${{color:"var(--fg2)"}}>No findings above info level.</div>`}
      ${y.info?o`<button type="button" onClick=${()=>l(a=>!a)}>
        ${n?"Hide":"Show"} ${y.info} info findings
      </button>`:null}
    </div>
    <details style=${{marginTop:"8px"}}>
      <summary style=${{cursor:"pointer"}}>All ${$.length} sources</summary>
      <${C} sources=${$} />
    </details>
  </div>`}export{M as HiddenContextPanel,S as STALE_AFTER_S,M as default};
