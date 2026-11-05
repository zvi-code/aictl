import{x as W,S as U,L as H,N as V,P as J,O as Q,m as n,T as w,Q as q,R as G,b as a,f as C,J as X,C as M,n as Y,U as Z,e as tt}from"./index-DWqDLmU7.js";import{D as et}from"./DataTable-4w3cUqws.js";import{i as at,c as st}from"./models-DHnW0Za4.js";const $=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"];function E({always:s,onDemand:h,conditional:u,never:v,total:d}){if(!d)return null;const m=f=>(f/d*100).toFixed(1)+"%";return n`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${s>0&&n`<div style="width:${m(s)};height:100%;background:var(--green)" title="Always loaded: ${a(s)}"></div>`}
    ${h>0&&n`<div style="width:${m(h)};height:100%;background:var(--yellow)" title="On-demand: ${a(h)}"></div>`}
    ${u>0&&n`<div style="width:${m(u)};height:100%;background:var(--orange)" title="Conditional: ${a(u)}"></div>`}
    ${v>0&&n`<div style="width:${m(v)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${a(v)}"></div>`}
  </div>`}function z(){const s=(h,u)=>`display:inline-block;width:8px;height:8px;border-radius:2px;background:${h};${u||""}`;return n`<span class="text-muted" style="display:inline-flex;gap:var(--sp-3);align-items:center;font-size:var(--fs-xs);font-weight:400">
    <span><span style=${s("var(--green)")}></span> always</span>
    <span><span style=${s("var(--yellow)")}></span> on-demand</span>
    <span><span style=${s("var(--orange)")}></span> conditional</span>
    <span><span style=${s("var(--fg2)","opacity:0.3")}></span> never sent</span>
  </span>`}function rt(){const{snap:s,history:h,enabledTools:u}=W(U),v=H(()=>V(),[],{pollMs:6e4}),d=v.data;if(!d)return n`<${J} status=${Q(v)} error=${v.error} onRetry=${v.reload}
    label="token budget" skeletonHeight="240px" emptyTitle="No budget data"
    emptyHint="The server returned nothing for /api/budget. It fills after the first scan of AI context files."/>`;const m=t=>u===null||u.includes(t),f=w(()=>{const t=(s==null?void 0:s.tool_configs)||[];for(const e of(s==null?void 0:s.tools)||[]){const r=t.find(l=>l.tool===e.tool&&l.model);if(r)return r.model}for(const e of t)if(e.model&&at(e.model))return e.model;return""},[s]),D=st(f),O=d.always_loaded_tokens||0,S=d.total_potential_tokens||0,_=O/D*100,k=S/D*100,K=w(()=>{if(!s)return{};const t={};return s.tools.forEach(e=>{e.tool==="aictl"||!e.token_breakdown||!e.token_breakdown.total||(t[e.tool]=e.token_breakdown)}),t},[s]),y=w(()=>s!=null&&s.tool_telemetry?s.tool_telemetry.filter(t=>m(t.tool)):[],[s,u]),j=w(()=>{if(!s)return[];const t={};return s.tools.forEach(e=>{e.tool==="aictl"||!m(e.tool)||(e.files||[]).forEach(r=>{const l=r.kind||"other";t[l]||(t[l]={kind:l,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),t[l].count++,t[l].tokens+=r.tokens,t[l].size+=r.size;const i=(r.sent_to_llm||"").toLowerCase();i==="yes"?t[l].always+=r.tokens:i==="on-demand"?t[l].onDemand+=r.tokens:i==="conditional"||i==="partial"?t[l].conditional+=r.tokens:t[l].never+=r.tokens})}),Object.values(t).sort((e,r)=>r.tokens-e.tokens)},[s,u]),g=w(()=>{if(!(s!=null&&s.tool_telemetry))return null;const t={},e={};s.tool_telemetry.filter(c=>m(c.tool)).forEach(c=>{(c.daily||[]).forEach(o=>{if(o.date&&(t[o.date]||(t[o.date]={}),e[o.date]||(e[o.date]={}),o.tokens_by_model&&Object.entries(o.tokens_by_model).forEach(([p,T])=>{t[o.date][p]=(t[o.date][p]||0)+T}),o.model)){const p=o.model,T=(o.input_tokens||0)+(o.output_tokens||0);t[o.date][p]=(t[o.date][p]||0)+T,e[o.date][p]||(e[o.date][p]={input:0,output:0,cache_read:0,cache_creation:0}),e[o.date][p].input+=o.input_tokens||0,e[o.date][p].output+=o.output_tokens||0,e[o.date][p].cache_read+=o.cache_read_tokens||0,e[o.date][p].cache_creation+=o.cache_creation_tokens||0}})});const r=new Date,l=[];for(let c=6;c>=0;c--){const o=new Date(r);o.setDate(o.getDate()-c),l.push(o.toLocaleDateString("en-CA"))}const i=l.filter(c=>t[c]&&Object.values(t[c]).some(o=>o>0));if(!i.length)return null;const b=[...new Set(i.flatMap(c=>Object.keys(t[c]||{})))],x=Math.max(...i.map(c=>b.reduce((o,p)=>o+((t[c]||{})[p]||0),0)),1),N=i.some(c=>Object.keys(e[c]||{}).length>0);return{dates:i,models:b,byDate:t,byDateModel:e,maxTotal:x,hasDetail:N}},[s,u]),L=h&&h.ts&&h.ts.length>=2?[h.ts,h.live_tokens||h.ts.map(()=>0)]:null,A=y.reduce((t,e)=>t+(e.input_tokens||0),0),B=y.reduce((t,e)=>t+(e.output_tokens||0),0),R=y.reduce((t,e)=>t+(e.cache_read_tokens||0),0),P=y.reduce((t,e)=>t+(e.cache_creation_tokens||0),0),F=y.reduce((t,e)=>t+(e.total_sessions||0),0),I=q(y);return n`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${L?n`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${G} data=${L} color="var(--green)" height=${60}
          ariaLabel="Live token usage chart"/>
        <div class="text-muted" style="font-size:var(--fs-base);margin-top:var(--sp-2)">
          Current: ${a((s==null?void 0:s.total_live_estimated_tokens)||0)} estimated tokens
        </div>
      </div>`:n`<div></div>`}
      <div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Context Window${f?n` <span class="badge">${f}</span>`:""}</h3>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Always loaded: ${a(O)} of ${a(D)}</span>
            <span class="text-bolder" style="color:${_>80?"var(--orange)":_>50?"var(--yellow)":"var(--green)"}">${C(_)}</span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:4px;background:var(--border)">
            <div style="height:100%;width:${Math.min(_,100).toFixed(1)}%;background:var(--green);border-radius:4px"></div>
          </div>
        </div>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Max potential: ${a(S)}</span>
            <span class="text-bolder" style="color:${k>100?"var(--red)":"var(--fg2)"}">${C(k)}${k>100?" ⚠":""}</span>
          </div>
          <div class="overflow-hidden" style="height:6px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${Math.min(k,100).toFixed(1)}%;background:${k>100?"var(--red)":"var(--fg2)"};opacity:0.5;border-radius:3px"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-1);font-size:var(--fs-sm)">
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:4px"></span>Always: ${a(d.always_loaded_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--yellow);margin-right:4px"></span>On-demand: ${a(d.on_demand_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--orange);margin-right:4px"></span>Conditional: ${a(d.conditional_tokens||0)}</span>
          <span class="text-muted">Cacheable: ${a(d.cacheable_tokens||0)}</span>
        </div>
        ${(d.project_count||0)>1?n`<div class="text-muted" style="font-size:var(--fs-xs);margin-top:var(--sp-2);border-top:1px solid var(--border);padding-top:var(--sp-1)">
          Estimate for largest project (${d.largest_project||"?"}): ${a(d.largest_project_tokens||0)} + ${a(d.global_tokens||0)} global.
          ${(d.raw_total_all_projects||0)>(d.total_potential_tokens||0)?n` Raw total across all ${d.project_count} projects: ${a(d.raw_total_all_projects)}.`:null}
        </div>`:null}
      </div>
    </div>

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
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${t}: ${a(e)} tokens">
              ${g.models.map((l,i)=>{const b=(g.byDate[t]||{})[l]||0;return b?n`<div key=${l} style="width:${(b/g.maxTotal*100).toFixed(1)}%;height:100%;background:${$[i%$.length]}" title="${l}: ${a(b)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${a(e)}</span>
          </div>`})}
      </div>
      ${g.hasDetail&&n`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${g.dates.flatMap(t=>{const e=new Date(t+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),r=g.byDateModel[t]||{},l=Object.keys(r).sort();return l.length?l.map((i,b)=>{const x=r[i];return n`<tr key=${t+"-"+i}>
                <td>${b===0?e:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${$[g.models.indexOf(i)%$.length]};margin-right:3px"></span>${i}</td>
                <td>${a(x.input)}</td><td>${a(x.output)}</td>
                <td class="text-muted">${a(x.cache_read)}</td>
                <td class="text-muted">${a(x.cache_creation)}</td>
                <td class="text-bold">${a(x.input+x.output)}</td>
              </tr>`}):[]})}</tbody>
        </table>
      </details>`}
    </div>`}

    <!-- Verified token usage (main table) -->
    ${y.length>0&&n`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4);display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-4);flex-wrap:wrap">Token Usage by Tool <${z}/></h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Tool telemetry" style="width:100%">
          <thead><tr>
            <th>Tool</th><th>Source</th>
            <th style="text-align:right">Input</th><th style="text-align:right">Output</th>
            <th style="text-align:right">Cache R</th><th style="text-align:right">Cache W</th>
            <th style="text-align:right">Sessions</th><th style="text-align:right" title=${X}>Est. cost</th>
            <th style="width:100px">Context Split</th>
          </tr></thead>
          <tbody>${y.map(t=>{const e=K[t.tool];return n`<tr key=${t.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(Y[t.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${Z(t.tool,s)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${t.source}</span> <span class="text-muted">${C(t.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${a(t.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${a(t.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${a(t.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${a(t.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${a(t.total_sessions||0)}</td>
              <td style="text-align:right"><${M} row=${t}/></td>
              <td>${e?n`<${E} always=${e.always_loaded||0} onDemand=${e.on_demand||0}
                conditional=${e.conditional||0} never=${e.never_sent||0} total=${e.total||1}/>`:null}</td>
            </tr>`})}
          ${y.length>1&&n`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${a(A)}</td>
            <td style="text-align:right">${a(B)}</td>
            <td style="text-align:right" class="text-muted">${a(R)}</td>
            <td style="text-align:right" class="text-muted">${a(P)}</td>
            <td style="text-align:right">${a(F)}</td>
            <td style="text-align:right"><${M} row=${I}/></td>
            <td></td>
          </tr>`}</tbody>
        </table>
      </div>
    </div>`}

    <!-- By category -->
    ${j.length>0&&n`<div class="budget-card budget-full">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4);display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-4);flex-wrap:wrap">By Category <${z}/></h3>
      <${et}
        ariaLabel="Per-category tokens"
        rowKey="kind"
        persistKey="budget-categories"
        data=${j}
        columns=${[{accessorKey:"kind",header:"Category",cell:t=>tt(t)},{accessorKey:"count",header:"Files",align:"right"},{accessorKey:"always",header:"Always",align:"right",cell:t=>a(t||0)},{accessorKey:"onDemand",header:"On-Demand",align:"right",cell:t=>a(t||0)},{accessorKey:"conditional",header:"Conditional",align:"right",cell:t=>a(t||0)},{accessorKey:"never",header:"Never",align:"right",cell:t=>a(t||0)},{accessorKey:"tokens",header:"Total",align:"right",cell:t=>n`<span class="text-bold">${a(t||0)}</span>`},{accessorKey:"_dist",header:"Distribution",sortable:!1,cell:(t,e)=>n`<${E} always=${e.always} onDemand=${e.onDemand} conditional=${e.conditional} never=${e.never} total=${e.tokens||1}/>`,width:140}]}
        initialSort=${{id:"tokens",desc:!0}}
      />
    </div>`}
  </div>`}export{rt as default};
