import{d as _,x as R,T as C,m as o}from"./index-COdGgaml.js";import{S as q}from"./app-2zqrKZhA.js";import{s as A,K as M,i as F}from"./useSse-BA3xgPtb.js";import{T as W}from"./ToolScopeEmpty-sHZab3hi.js";import{u as I}from"./useAsyncResource-CXdpHQIv.js";import"./TextView-BEN-kPtl.js";const L=600,O={high:"var(--red)",medium:"var(--orange)",low:"var(--yellow)",info:"var(--fg2)"},$={padding:"2px 8px",borderBottom:"1px solid var(--border)",textAlign:"left"},l={fontFamily:"var(--font-mono, monospace)",wordBreak:"break-all"};function D(t){return t?t<1024?`${t} B`:t<1024*1024?`${(t/1024).toFixed(1)} KB`:`${(t/1024/1024).toFixed(1)} MB`:"0 B"}function G(t){return t<90?`${Math.round(t)} s ago`:t<5400?`${Math.round(t/60)} min ago`:`${Math.round(t/3600)} h ago`}function x({severity:t,count:e}){return o`<span
    data-severity=${t}
    title=${`${t} severity`}
    style=${{color:O[t],fontWeight:600,marginRight:"10px"}}
  >${e===void 0?t:`${e} ${t}`}</span>`}function H({finding:t}){const e=t.path+(t.line?`:${t.line}`:"");return o`<details data-rule=${t.rule} style=${{borderBottom:"1px solid var(--border)",padding:"4px 0"}}>
    <summary style=${{cursor:"pointer"}} title=${t.why}>
      <${x} severity=${t.severity} />
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
  </details>`}function K({sources:t}){return o`<table style=${{width:"100%",borderCollapse:"collapse"}}>
    <thead><tr>
      ${["Tool","Scope","Loading","Size","Tokens","Git","Path"].map(e=>o`<th key=${e} style=${$}>${e}</th>`)}
    </tr></thead>
    <tbody>
      ${t.map(e=>o`<tr key=${`${e.tool}|${e.path}`} title=${e.note||e.origin}>
        <td style=${$}>${e.tool}</td>
        <td style=${$}>${e.scope}</td>
        <td style=${$}>${e.readable?e.loading:`${e.loading} (no file shows this)`}</td>
        <td style=${$}>${D(e.bytes)}</td>
        <td style=${$}>${e.est_tokens?`~${e.est_tokens}`:"0"}</td>
        <td style=${$}>${e.git_state||"n/a"}</td>
        <td style=${{...$,...l}}>
          ${e.path}${e.symlink_target?` -> ${e.symlink_target}`:""}
          ${e.note?o`<div style=${{color:"var(--fg2)"}}>${e.note}</div>`:null}
          ${e.why_in_effect&&!e.in_project?o`<div data-testid="outside-project" style=${{color:"var(--orange)"}}>${e.why_in_effect}</div>`:null}
        </td>
      </tr>`)}
    </tbody>
  </table>`}function N({drift:t}){if(!t)return null;if(t.baseline_created)return o`<div data-testid="drift">Baseline created now. Later changes will show here.</div>`;const e=[...t.new.map(a=>["new",a]),...t.changed.map(a=>["changed",a]),...t.removed.map(a=>["removed",a])];return o`<details data-testid="drift">
    <summary style=${{cursor:"pointer"}}>
      Drift: ${t.new.length} new, ${t.changed.length} changed, ${t.removed.length} removed,
      ${" "}${t.agent_writes.length} agent writes
    </summary>
    ${e.map(([a,n])=>o`<div key=${`${a}|${n.path}`} style=${l} title=${n.tool}>${a}: ${n.path}</div>`)}
    ${t.agent_writes.map(a=>o`<div key=${`w|${a.path}|${a.session_id}`} style=${l}>
      agent write: ${a.path} (session ${a.session_id}, via ${a.via})
    </div>`)}
  </details>`}function P({row:t}){return o`<div data-testid="unattributed" title=${t.method}>
    ${t.tool}: about ${t.residual_tokens} of ${t.first_request_tokens_median} first-request tokens are not
    explained, after ~${t.inventory_always_tokens} inventory, ~${t.dynamic_tokens} dynamic and a
    ${" "}${t.builtin_allowance_tokens} built-in allowance. Estimate from ${t.sessions_sampled} sessions.
  </div>`}function d(t,e){return e?`${t}:${e}`:t}function z({eff:t}){const e=t.conflicts||[],a=t.limited||[];return o`<div data-testid="effective-model" data-tool=${t.tool} data-conflict=${e.length?"yes":"no"}
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
    ${a.length?o`<details>
      <summary style=${{cursor:"pointer"}}>${a.length} pins limited to one agent, prompt or setting</summary>
      ${a.map(n=>o`<div key=${`${n.path}|${n.setting}|${n.line}`} style=${l}
        title=${n.why_in_effect}>${n.applies}: ${n.value} at ${d(n.path,n.line)} (${n.in_project?"in this project":"not in this project"})</div>`)}
    </details>`:null}
  </div>`}function U({models:t}){const e=Object.values(t||{});if(!e.length)return null;const a=[...e].sort((n,r)=>(r.conflicts||[]).length-(n.conflicts||[]).length);return o`<section data-testid="effective-models" style=${{marginBottom:"8px"}}>
    <h4 style=${{margin:"0 0 4px"}}>Effective model</h4>
    ${a.map(n=>o`<${z} key=${n.tool} eff=${n} />`)}
  </section>`}function et(){const[t,e]=_(0),[a,n]=_(!1),r=R(q),p=(r==null?void 0:r.enabledTools)??null,[y,S]=_(null),{data:c,loading:T,error:m}=I(()=>F(t>0,S),[t]),i=C(()=>A(c,p),[c,p]),h=o`<button type="button" onClick=${()=>e(s=>s+1)}>Rescan</button>`;if(T&&!i)return o`<div data-state="loading" style=${{color:"var(--fg2)"}}>Scanning context sources...${y?" "+y.step+", "+Math.round(y.elapsed_s)+" s":""}</div>`;if(m)return o`<div data-state="error" style=${{color:"var(--red)"}}>
      Context audit failed: ${String(m.message||m)} ${h}
    </div>`;const u=i&&i.sources||[],v=i&&i.findings||[],j=!!c&&((c.sources||[]).length||(c.findings||[]).length);if(!u.length&&!v.length&&M(p)&&j)return o`<${W} enabledTools=${p} snap=${r==null?void 0:r.snap} what="hidden context"/>`;if(!u.length&&!v.length)return o`<div data-state="empty" style=${{color:"var(--fg2)"}}>
      No context sources found for ${i&&i.project||"this project"}. ${h}
    </div>`;const w=Date.now()/1e3-(i.scanned_at||0),g=w>L,f=i.counts||{},k=a?v:v.filter(s=>s.severity!=="info"),B=u.filter(s=>s.loading==="always").reduce((s,b)=>s+(b.est_tokens||0),0),E=Object.entries(i.sources_per_tool||{});return o`<div data-state=${g?"stale":"ready"}>
    <${U} models=${i.effective_models} />
    <div style=${{display:"flex",flexWrap:"wrap",gap:"8px",alignItems:"baseline"}}>
      ${["high","medium","low","info"].map(s=>o`<${x} key=${s} severity=${s} count=${f[s]||0} />`)}
      <span title=${E.map(([s,b])=>`${s}: ${b}`).join(`
`)}>${u.length} sources</span>
      <span title="Estimated at four characters per token">~${B} always-loaded tokens</span>
      <span style=${{color:g?"var(--orange)":"var(--fg2)"}} data-testid="scan-age">
        ${g?"Stale: ":""}scanned ${G(w)} in ${i.duration_ms} ms
      </span>
      ${h}
    </div>
    <${N} drift=${i.drift} />
    ${(i.unattributed||[]).map(s=>o`<${P} key=${s.tool} row=${s} />`)}
    <div style=${{marginTop:"8px"}}>
      ${k.length?k.map(s=>o`<${H} key=${`${s.rule}|${s.path}|${s.line}|${s.session_id}`} finding=${s} />`):o`<div data-testid="no-findings" style=${{color:"var(--fg2)"}}>No findings above info level.</div>`}
      ${f.info?o`<button type="button" onClick=${()=>n(s=>!s)}>
        ${a?"Hide":"Show"} ${f.info} info findings
      </button>`:null}
    </div>
    <details style=${{marginTop:"8px"}}>
      <summary style=${{cursor:"pointer"}}>All ${u.length} sources</summary>
      <${K} sources=${u} />
    </details>
  </div>`}export{et as HiddenContextPanel,L as STALE_AFTER_S,et as default};
