import{x as U,m as n,T as w}from"./index-DZBTpxgk.js";import{S as V,u as q,P as X,p as G,s as J,M as Q,a as Y,C as j}from"./app-jlgwiEcc.js";import{aq as Z,ar as tt,as as et,at,ae as st,r as s,z as M,X as ot,C as nt,U as lt,v as rt,L as it,O as dt}from"./useSse-DO4sSx-p.js";import{D as ct}from"./DataTable-fEKRmfXo.js";import{i as pt,c as ht}from"./models-DHnW0Za4.js";const gt="The server answered for a different tool selection. Restart the aictl server so it applies the tool filter.",$=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"];function z({always:a,onDemand:y,conditional:p,never:h,total:d}){if(!d)return null;const v=f=>(f/d*100).toFixed(1)+"%";return n`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${a>0&&n`<div style="width:${v(a)};height:100%;background:var(--green)" title="Always loaded: ${s(a)}"></div>`}
    ${y>0&&n`<div style="width:${v(y)};height:100%;background:var(--yellow)" title="On-demand: ${s(y)}"></div>`}
    ${p>0&&n`<div style="width:${v(p)};height:100%;background:var(--orange)" title="Conditional: ${s(p)}"></div>`}
    ${h>0&&n`<div style="width:${v(h)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${s(h)}"></div>`}
  </div>`}function K(){const a=(y,p)=>`display:inline-block;width:8px;height:8px;border-radius:2px;background:${y};${p||""}`;return n`<span class="text-muted" style="display:inline-flex;gap:var(--sp-3);align-items:center;font-size:var(--fs-xs);font-weight:400">
    <span><span style=${a("var(--green)")}></span> always</span>
    <span><span style=${a("var(--yellow)")}></span> on-demand</span>
    <span><span style=${a("var(--orange)")}></span> conditional</span>
    <span><span style=${a("var(--fg2)","opacity:0.3")}></span> never sent</span>
  </span>`}function xt(){const{snap:a,history:y,enabledTools:p}=U(V),h=q(()=>tt(et(p)),[Z(p)],{pollMs:6e4}),d=h.data&&at(h.data,p)?h.data:null;if(!d){const t=!!h.data;return n`<${X} status=${t?h.loading?"loading":"error":G(h)}
      error=${t&&!h.error?gt:h.error} onRetry=${h.reload}
      label="token budget" skeletonHeight="240px" emptyTitle="No budget data"
      emptyHint="The server returned nothing for /api/budget. It fills after the first scan of AI context files."/>`}const v=it(p),f=t=>dt(t,p),T=w(()=>{const t=(a==null?void 0:a.tool_configs)||[];for(const e of(a==null?void 0:a.tools)||[]){const r=t.find(l=>l.tool===e.tool&&l.model);if(r)return r.model}for(const e of t)if(e.model&&pt(e.model))return e.model;return""},[a]),C=ht(T),E=d.always_loaded_tokens||0,L=d.total_potential_tokens||0,_=E/C*100,k=L/C*100,A=w(()=>{if(!a)return{};const t={};return a.tools.forEach(e=>{e.tool==="aictl"||!e.token_breakdown||!e.token_breakdown.total||(t[e.tool]=e.token_breakdown)}),t},[a]),m=w(()=>a!=null&&a.tool_telemetry?a.tool_telemetry.filter(t=>f(t.tool)):[],[a,p]),D=w(()=>{if(!a)return[];const t={};return a.tools.forEach(e=>{e.tool==="aictl"||!f(e.tool)||(e.files||[]).forEach(r=>{const l=r.kind||"other";t[l]||(t[l]={kind:l,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),t[l].count++,t[l].tokens+=r.tokens,t[l].size+=r.size;const i=(r.sent_to_llm||"").toLowerCase();i==="yes"?t[l].always+=r.tokens:i==="on-demand"?t[l].onDemand+=r.tokens:i==="conditional"||i==="partial"?t[l].conditional+=r.tokens:t[l].never+=r.tokens})}),Object.values(t).sort((e,r)=>r.tokens-e.tokens)},[a,p]),g=w(()=>{if(!(a!=null&&a.tool_telemetry))return null;const t={},e={};a.tool_telemetry.filter(c=>f(c.tool)).forEach(c=>{(c.daily||[]).forEach(o=>{if(o.date&&(t[o.date]||(t[o.date]={}),e[o.date]||(e[o.date]={}),o.tokens_by_model&&Object.entries(o.tokens_by_model).forEach(([u,O])=>{t[o.date][u]=(t[o.date][u]||0)+O}),o.model)){const u=o.model,O=(o.input_tokens||0)+(o.output_tokens||0);t[o.date][u]=(t[o.date][u]||0)+O,e[o.date][u]||(e[o.date][u]={input:0,output:0,cache_read:0,cache_creation:0}),e[o.date][u].input+=o.input_tokens||0,e[o.date][u].output+=o.output_tokens||0,e[o.date][u].cache_read+=o.cache_read_tokens||0,e[o.date][u].cache_creation+=o.cache_creation_tokens||0}})});const r=new Date,l=[];for(let c=6;c>=0;c--){const o=new Date(r);o.setDate(o.getDate()-c),l.push(o.toLocaleDateString("en-CA"))}const i=l.filter(c=>t[c]&&Object.values(t[c]).some(o=>o>0));if(!i.length)return null;const b=[...new Set(i.flatMap(c=>Object.keys(t[c]||{})))],x=Math.max(...i.map(c=>b.reduce((o,u)=>o+((t[c]||{})[u]||0),0)),1),H=i.some(c=>Object.keys(e[c]||{}).length>0);return{dates:i,models:b,byDate:t,byDateModel:e,maxTotal:x,hasDetail:H}},[a,p]),S=!v&&y&&y.ts&&y.ts.length>=2?[y.ts,y.live_tokens||y.ts.map(()=>0)]:null,B=v?((a==null?void 0:a.tools)||[]).filter(t=>t.tool!=="aictl").reduce((t,e)=>t+st(e.live),0):(a==null?void 0:a.total_live_estimated_tokens)||0,I=m.reduce((t,e)=>t+(e.input_tokens||0),0),P=m.reduce((t,e)=>t+(e.output_tokens||0),0),R=m.reduce((t,e)=>t+(e.cache_read_tokens||0),0),F=m.reduce((t,e)=>t+(e.cache_creation_tokens||0),0),N=m.reduce((t,e)=>t+(e.total_sessions||0),0),W=J(m);return n`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${S||v?n`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        ${S&&n`<${Q} data=${S} color="var(--green)" height=${60}
          ariaLabel="Live token usage chart"/>`}
        <div class="text-muted" style="font-size:var(--fs-base);margin-top:var(--sp-2)">
          Current: ${s(B)} estimated tokens${v?" (selected tools; the trend chart has no per-tool split, so it shows with All tools)":""}
        </div>
      </div>`:n`<div></div>`}
      <div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Context Window${T?n` <span class="badge">${T}</span>`:""}</h3>
        ${v&&n`<div class="text-muted" style="font-size:var(--fs-xs);margin-bottom:var(--sp-2)" data-testid="budget-selection">
          Context files of the selected tools only.
        </div>`}
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Always loaded: ${s(E)} of ${s(C)}</span>
            <span class="text-bolder" style="color:${_>80?"var(--orange)":_>50?"var(--yellow)":"var(--green)"}">${M(_)}</span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:4px;background:var(--border)">
            <div style="height:100%;width:${Math.min(_,100).toFixed(1)}%;background:var(--green);border-radius:4px"></div>
          </div>
        </div>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Max potential: ${s(L)}</span>
            <span class="text-bolder" style="color:${k>100?"var(--red)":"var(--fg2)"}">${M(k)}${k>100?" ⚠":""}</span>
          </div>
          <div class="overflow-hidden" style="height:6px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${Math.min(k,100).toFixed(1)}%;background:${k>100?"var(--red)":"var(--fg2)"};opacity:0.5;border-radius:3px"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-1);font-size:var(--fs-sm)">
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:4px"></span>Always: ${s(d.always_loaded_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--yellow);margin-right:4px"></span>On-demand: ${s(d.on_demand_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--orange);margin-right:4px"></span>Conditional: ${s(d.conditional_tokens||0)}</span>
          <span class="text-muted">Cacheable: ${s(d.cacheable_tokens||0)}</span>
        </div>
        ${(d.project_count||0)>1?n`<div class="text-muted" style="font-size:var(--fs-xs);margin-top:var(--sp-2);border-top:1px solid var(--border);padding-top:var(--sp-1)">
          Estimate for largest project (${d.largest_project||"?"}): ${s(d.largest_project_tokens||0)} + ${s(d.global_tokens||0)} global.
          ${(d.raw_total_all_projects||0)>(d.total_potential_tokens||0)?n` Raw total across all ${d.project_count} projects: ${s(d.raw_total_all_projects)}.`:null}
        </div>`:null}
      </div>
    </div>

    ${v&&!m.length&&!D.length&&!g&&n`<${Y} enabledTools=${p} snap=${a} what="token usage and categories"/>`}

    <!-- Daily token usage -->
    ${g&&n`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">Daily Token Usage (last 7 days)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-6);font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        ${g.models.map((t,e)=>n`<span key=${t}>
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${$[e%$.length]};margin-right:3px"></span>${t}
        </span>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
        ${g.dates.map(t=>{const e=g.models.reduce((l,i)=>l+((g.byDate[t]||{})[i]||0),0),r=new Date(t+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return n`<div key=${t} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${r}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${t}: ${s(e)} tokens">
              ${g.models.map((l,i)=>{const b=(g.byDate[t]||{})[l]||0;return b?n`<div key=${l} style="width:${(b/g.maxTotal*100).toFixed(1)}%;height:100%;background:${$[i%$.length]}" title="${l}: ${s(b)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${s(e)}</span>
          </div>`})}
      </div>
      ${g.hasDetail&&n`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${g.dates.flatMap(t=>{const e=new Date(t+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),r=g.byDateModel[t]||{},l=Object.keys(r).sort();return l.length?l.map((i,b)=>{const x=r[i];return n`<tr key=${t+"-"+i}>
                <td>${b===0?e:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${$[g.models.indexOf(i)%$.length]};margin-right:3px"></span>${i}</td>
                <td>${s(x.input)}</td><td>${s(x.output)}</td>
                <td class="text-muted">${s(x.cache_read)}</td>
                <td class="text-muted">${s(x.cache_creation)}</td>
                <td class="text-bold">${s(x.input+x.output)}</td>
              </tr>`}):[]})}</tbody>
        </table>
      </details>`}
    </div>`}

    <!-- Verified token usage (main table) -->
    ${m.length>0&&n`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4);display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-4);flex-wrap:wrap">Token Usage by Tool <${K}/></h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Tool telemetry" style="width:100%">
          <thead><tr>
            <th>Tool</th><th>Source</th>
            <th style="text-align:right">Input</th><th style="text-align:right">Output</th>
            <th style="text-align:right">Cache R</th><th style="text-align:right">Cache W</th>
            <th style="text-align:right">Sessions</th><th style="text-align:right" title=${ot}>Est. cost</th>
            <th style="width:100px">Context Split</th>
          </tr></thead>
          <tbody>${m.map(t=>{const e=A[t.tool];return n`<tr key=${t.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(nt[t.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${lt(t.tool,a)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${t.source}</span> <span class="text-muted">${M(t.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${s(t.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${s(t.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${s(t.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${s(t.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${s(t.total_sessions||0)}</td>
              <td style="text-align:right"><${j} row=${t}/></td>
              <td>${e?n`<${z} always=${e.always_loaded||0} onDemand=${e.on_demand||0}
                conditional=${e.conditional||0} never=${e.never_sent||0} total=${e.total||1}/>`:null}</td>
            </tr>`})}
          ${m.length>1&&n`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${s(I)}</td>
            <td style="text-align:right">${s(P)}</td>
            <td style="text-align:right" class="text-muted">${s(R)}</td>
            <td style="text-align:right" class="text-muted">${s(F)}</td>
            <td style="text-align:right">${s(N)}</td>
            <td style="text-align:right"><${j} row=${W}/></td>
            <td></td>
          </tr>`}</tbody>
        </table>
      </div>
    </div>`}

    <!-- By category -->
    ${D.length>0&&n`<div class="budget-card budget-full">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4);display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-4);flex-wrap:wrap">By Category <${K}/></h3>
      <${ct}
        ariaLabel="Per-category tokens"
        rowKey="kind"
        persistKey="budget-categories"
        data=${D}
        columns=${[{accessorKey:"kind",header:"Category",cell:t=>rt(t)},{accessorKey:"count",header:"Files",align:"right"},{accessorKey:"always",header:"Always",align:"right",cell:t=>s(t||0)},{accessorKey:"onDemand",header:"On-Demand",align:"right",cell:t=>s(t||0)},{accessorKey:"conditional",header:"Conditional",align:"right",cell:t=>s(t||0)},{accessorKey:"never",header:"Never",align:"right",cell:t=>s(t||0)},{accessorKey:"tokens",header:"Total",align:"right",cell:t=>n`<span class="text-bold">${s(t||0)}</span>`},{accessorKey:"_dist",header:"Distribution",sortable:!1,cell:(t,e)=>n`<${z} always=${e.always} onDemand=${e.onDemand} conditional=${e.conditional} never=${e.never} total=${e.tokens||1}/>`,width:140}]}
        initialSort=${{id:"tokens",desc:!0}}
      />
    </div>`}
  </div>`}export{xt as default};
