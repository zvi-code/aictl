import{d as w,x as B,T as E,m as o,w as R,z as q,S as C,as as A,aS as F}from"./index-cRmfUh63.js";import{u as M}from"./useAsyncResource-DDP0JkIM.js";const W=600,I={high:"var(--red)",medium:"var(--orange)",low:"var(--yellow)",info:"var(--fg2)"},$={padding:"2px 8px",borderBottom:"1px solid var(--border)",textAlign:"left"},l={fontFamily:"var(--font-mono, monospace)",wordBreak:"break-all"};function L(t){return t?t<1024?`${t} B`:t<1024*1024?`${(t/1024).toFixed(1)} KB`:`${(t/1024/1024).toFixed(1)} MB`:"0 B"}function O(t){return t<90?`${Math.round(t)} s ago`:t<5400?`${Math.round(t/60)} min ago`:`${Math.round(t/3600)} h ago`}function k({severity:t,count:e}){return o`<span
    data-severity=${t}
    title=${`${t} severity`}
    style=${{color:I[t],fontWeight:600,marginRight:"10px"}}
  >${e===void 0?t:`${e} ${t}`}</span>`}function D({finding:t}){const e=t.path+(t.line?`:${t.line}`:"");return o`<details data-rule=${t.rule} style=${{borderBottom:"1px solid var(--border)",padding:"4px 0"}}>
    <summary style=${{cursor:"pointer"}} title=${t.why}>
      <${k} severity=${t.severity} />
      <span style=${l}>${t.rule}</span>
      ${t.count>1?o` <span style=${{color:"var(--fg2)"}}>x${t.count}</span>`:null}
      <div style=${{...l,color:"var(--fg2)"}}>${e}</div>
      ${t.snippet?o`<div style=${l}>${t.snippet}</div>`:null}
    </summary>
    <div style=${{padding:"4px 0 4px 12px"}}>
      <div><b>Why:</b> ${t.why}</div>
      ${t.action?o`<div><b>What to do:</b> ${t.action}</div>`:null}
      ${t.session_id?o`<div><b>Session:</b> <span style=${l}>${t.session_id}</span></div>`:null}
      ${t.tools&&t.tools.length?o`<div><b>Tools:</b> ${t.tools.join(", ")}</div>`:null}
    </div>
  </details>`}function z({sources:t}){return o`<table style=${{width:"100%",borderCollapse:"collapse"}}>
    <thead><tr>
      ${["Tool","Scope","Loading","Size","Tokens","Git","Path"].map(e=>o`<th key=${e} style=${$}>${e}</th>`)}
    </tr></thead>
    <tbody>
      ${t.map(e=>o`<tr key=${`${e.tool}|${e.path}`} title=${e.note||e.origin}>
        <td style=${$}>${e.tool}</td>
        <td style=${$}>${e.scope}</td>
        <td style=${$}>${e.readable?e.loading:`${e.loading} (no file shows this)`}</td>
        <td style=${$}>${L(e.bytes)}</td>
        <td style=${$}>${e.est_tokens?`~${e.est_tokens}`:"0"}</td>
        <td style=${$}>${e.git_state||"n/a"}</td>
        <td style=${{...$,...l}}>
          ${e.path}${e.symlink_target?` -> ${e.symlink_target}`:""}
          ${e.note?o`<div style=${{color:"var(--fg2)"}}>${e.note}</div>`:null}
          ${e.why_in_effect&&!e.in_project?o`<div data-testid="outside-project" style=${{color:"var(--orange)"}}>${e.why_in_effect}</div>`:null}
        </td>
      </tr>`)}
    </tbody>
  </table>`}function G({drift:t}){if(!t)return null;if(t.baseline_created)return o`<div data-testid="drift">Baseline created now. Later changes will show here.</div>`;const e=[...t.new.map(s=>["new",s]),...t.changed.map(s=>["changed",s]),...t.removed.map(s=>["removed",s])];return o`<details data-testid="drift">
    <summary style=${{cursor:"pointer"}}>
      Drift: ${t.new.length} new, ${t.changed.length} changed, ${t.removed.length} removed,
      ${" "}${t.agent_writes.length} agent writes
    </summary>
    ${e.map(([s,n])=>o`<div key=${`${s}|${n.path}`} style=${l} title=${n.tool}>${s}: ${n.path}</div>`)}
    ${t.agent_writes.map(s=>o`<div key=${`w|${s.path}|${s.session_id}`} style=${l}>
      agent write: ${s.path} (session ${s.session_id}, via ${s.via})
    </div>`)}
  </details>`}function H({row:t}){return o`<div data-testid="unattributed" title=${t.method}>
    ${t.tool}: about ${t.residual_tokens} of ${t.first_request_tokens_median} first-request tokens are not
    explained, after ~${t.inventory_always_tokens} inventory, ~${t.dynamic_tokens} dynamic and a
    ${" "}${t.builtin_allowance_tokens} built-in allowance. Estimate from ${t.sessions_sampled} sessions.
  </div>`}function d(t,e){return e?`${t}:${e}`:t}function N({eff:t}){const e=t.conflicts||[],s=t.limited||[];return o`<div data-testid="effective-model" data-tool=${t.tool} data-conflict=${e.length?"yes":"no"}
    style=${{borderBottom:"1px solid var(--border)",padding:"4px 0"}}>
    ${e.map(n=>o`<div key=${d(n.request.path,n.request.line)} data-testid="effective-conflict"
      style=${{color:"var(--red)",fontWeight:600}}>
      Conflict: ${n.request.values.join(", ")} requested at <span style=${l}>${d(n.request.path,n.request.line)}</span>,
      ${" "}but ${n.pin.value} is pinned at <span style=${l}>${d(n.pin.path,n.pin.line)}</span>
    </div>`)}
    <div><b>${t.tool}:</b> <span style=${l}>${t.value||"no pin"}</span>
      ${t.value&&!t.verified?o` <span style=${{color:"var(--orange)"}}>(order unverified)</span>`:null}
    </div>
    ${t.value?o`<div style=${{...l,color:"var(--fg2)"}}>${d(t.source,t.line)} (${t.scope})</div>`:null}
    <div style=${{color:t.in_project?"var(--fg2)":"var(--orange)"}}>${t.why_in_effect}</div>
    ${(t.overrides||[]).map(n=>o`<div key=${d(n.path,n.line)} style=${l}>
      overrides ${n.value} at ${d(n.path,n.line)} (${n.scope})
    </div>`)}
    ${s.length?o`<details>
      <summary style=${{cursor:"pointer"}}>${s.length} pins limited to one agent, prompt or setting</summary>
      ${s.map(n=>o`<div key=${`${n.path}|${n.setting}|${n.line}`} style=${l}
        title=${n.why_in_effect}>${n.applies}: ${n.value} at ${d(n.path,n.line)} (${n.in_project?"in this project":"not in this project"})</div>`)}
    </details>`:null}
  </div>`}function P({models:t}){const e=Object.values(t||{});if(!e.length)return null;const s=[...e].sort((n,r)=>(r.conflicts||[]).length-(n.conflicts||[]).length);return o`<section data-testid="effective-models" style=${{marginBottom:"8px"}}>
    <h4 style=${{margin:"0 0 4px"}}>Effective model</h4>
    ${s.map(n=>o`<${N} key=${n.tool} eff=${n} />`)}
  </section>`}function V(){const[t,e]=w(0),[s,n]=w(!1),r=B(C),p=(r==null?void 0:r.enabledTools)??null,{data:c,loading:x,error:y}=M(()=>A("/api/context-audit"),[t]),i=E(()=>F(c,p),[c,p]),m=o`<button type="button" onClick=${()=>e(a=>a+1)}>Rescan</button>`;if(x&&!i)return o`<div data-state="loading" style=${{color:"var(--fg2)"}}>Scanning context sources...</div>`;if(y)return o`<div data-state="error" style=${{color:"var(--red)"}}>
      Context audit failed: ${String(y.message||y)} ${m}
    </div>`;const u=i&&i.sources||[],v=i&&i.findings||[],S=!!c&&((c.sources||[]).length||(c.findings||[]).length);if(!u.length&&!v.length&&R(p)&&S)return o`<${q} enabledTools=${p} snap=${r==null?void 0:r.snap} what="hidden context"/>`;if(!u.length&&!v.length)return o`<div data-state="empty" style=${{color:"var(--fg2)"}}>
      No context sources found for ${i&&i.project||"this project"}. ${m}
    </div>`;const b=Date.now()/1e3-(i.scanned_at||0),h=b>W,g=i.counts||{},_=s?v:v.filter(a=>a.severity!=="info"),T=u.filter(a=>a.loading==="always").reduce((a,f)=>a+(f.est_tokens||0),0),j=Object.entries(i.sources_per_tool||{});return o`<div data-state=${h?"stale":"ready"}>
    <${P} models=${i.effective_models} />
    <div style=${{display:"flex",flexWrap:"wrap",gap:"8px",alignItems:"baseline"}}>
      ${["high","medium","low","info"].map(a=>o`<${k} key=${a} severity=${a} count=${g[a]||0} />`)}
      <span title=${j.map(([a,f])=>`${a}: ${f}`).join(`
`)}>${u.length} sources</span>
      <span title="Estimated at four characters per token">~${T} always-loaded tokens</span>
      <span style=${{color:h?"var(--orange)":"var(--fg2)"}} data-testid="scan-age">
        ${h?"Stale: ":""}scanned ${O(b)} in ${i.duration_ms} ms
      </span>
      ${m}
    </div>
    <${G} drift=${i.drift} />
    ${(i.unattributed||[]).map(a=>o`<${H} key=${a.tool} row=${a} />`)}
    <div style=${{marginTop:"8px"}}>
      ${_.length?_.map(a=>o`<${D} key=${`${a.rule}|${a.path}|${a.line}|${a.session_id}`} finding=${a} />`):o`<div data-testid="no-findings" style=${{color:"var(--fg2)"}}>No findings above info level.</div>`}
      ${g.info?o`<button type="button" onClick=${()=>n(a=>!a)}>
        ${s?"Hide":"Show"} ${g.info} info findings
      </button>`:null}
    </div>
    <details style=${{marginTop:"8px"}}>
      <summary style=${{cursor:"pointer"}}>All ${u.length} sources</summary>
      <${z} sources=${u} />
    </details>
  </div>`}export{V as HiddenContextPanel,W as STALE_AFTER_S,V as default};
