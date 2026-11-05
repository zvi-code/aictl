import{f as C,a as _,d as x,T as y,g as X,s as Z,e as O,b as S,m as e,x as V,S as U,q as ss,c as es,h as I,i as N,A as as,y as ts,r as ns,C as os,j as w,l as Q,k as D,n as ls,o as J,p as rs,t as is,u as Y,V as cs,v as ps,H as ds,P as us,G as ms,I as vs}from"./index-DA8PvNXQ.js";const $s={high_memory:{label:"High memory",detail:s=>{const a=s.actual_mb!=null?_(s.actual_mb*1048576):null,l=s.expected_mb!=null?_(s.expected_mb*1048576):null;return a&&l?`${a} >> expected ${l}`:a},severity:"orange"},cpu_spike:{label:"CPU spike",detail:(s,a)=>a.cpu_pct!=null?C(parseFloat(a.cpu_pct)):null,severity:"orange"},zombie:{label:"Zombie process",detail:s=>`ppid=${s.ppid}, risk=${s.risk}`,severity:"red"},known_leak:{label:"Known leak",detail:s=>s.pattern,severity:"red"},high_file_count:{label:"High file count",detail:(s,a)=>a.file_count?`${a.file_count} open files`:null,severity:"yellow"},long_running:{label:"Long running",detail:(s,a)=>a.uptime_s?`${Math.round(a.uptime_s/60)}min`:null,severity:"yellow"}};function gs(s,a){const l=$s[s.type];return l?{label:l.label,detail:l.detail(s,a||{}),severity:l.severity}:{label:s.type,detail:null,severity:"orange"}}function G({file:s,dirPrefix:a}){var L;const[l,m]=x(!1),[r,o]=x(!1),[i,n]=x(null),[t,c]=x(null),[d,g]=x(!1),u=V(U),v=(s.path||"").replace(/\\/g,"/").split("/").pop(),$=(s.sent_to_llm||"").toLowerCase(),k=s.mtime&&Date.now()/1e3-s.mtime<300,h=(L=u.recentFiles)==null?void 0:L.get(s.path),z=!!h,M=ss(async()=>{if(l){m(!1);return}m(!0),g(!0),c(null);try{const f=await es(s.path);n(f)}catch(f){c(f.message)}finally{g(!1)}},[l,s.path]),A=(f,T)=>f.map((B,E)=>e`<span class="pline"><span class="ln">${T+E}</span>${O(B)||" "}</span>`),j=()=>{if(d)return e`<span class="text-muted">loading...</span>`;if(t)return e`<span class="text-red">${t}</span>`;if(!i)return null;const f=i.split(`
`),T=f.length;if(T<=N*3||r)return e`${A(f,1)}
        <div class="prev-actions">
          ${r&&e`<button class="prev-btn" onClick=${()=>o(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>u.openViewer(s.path)}>open in viewer</button>
        </div>`;const E=f.slice(-N),F=T-N+1;return e`${A(E,F)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>o(!0)}>show all (${T} lines)</button>
        <button class="prev-btn" onClick=${()=>u.openViewer(s.path)}>open in viewer</button>
      </div>`},P=s.size>0?Math.round(s.size/60):0;return e`<div>
    <button class="fitem" onClick=${M} aria-expanded=${l} title=${s.path}>
      ${z?e`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${I(h.ts)}${h.growth>0?" +"+_(h.growth):""}">●</span>`:k?e`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${I(s.mtime)}">●</span>`:e`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${a?e`<span class="text-muted">${a}/</span>`:""}${O(v)}</span>
      <span class="fmeta">
        ${$&&$!=="no"&&e`<span style="color:${Z($)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${$}">${$==="yes"?"◆":$==="on-demand"?"◇":"○"}</span>`}
        ${_(s.size)}${P?e` <span class="text-muted">${P}ln</span>`:""}${s.tokens?e` <span class="text-muted">${S(s.tokens)}t</span>`:""}
        ${s.mtime&&k?e` <span class="text-orange text-xs">${I(s.mtime)}</span>`:""}
      </span>
    </button>
    ${l&&e`<div class="inline-preview">${j()}</div>`}
  </div>`}function bs({dir:s,files:a}){const[l,m]=x(!1),r=a.reduce((i,n)=>i+n.tokens,0),o=a.reduce((i,n)=>i+n.size,0);return e`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${l?"mem-profile-head open":"mem-profile-head"} onClick=${()=>m(!l)} aria-expanded=${l}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow" aria-hidden="true">\u25B6</span>
      <span class="cat-label text-muted" title=${s}>${O(s)}</span>
      <span class="badge">${a.length}</span>
      <span class="badge">${_(o)}</span>
      <span class="badge">${S(r)}t</span>
    </button>
    ${l&&e`<div style=${{paddingLeft:"var(--sp-8)"}}>${a.map(i=>e`<${G} key=${i.path} file=${i}/>`)}</div>`}
  </div>`}function hs({label:s,files:a,root:l,badge:m,style:r,startOpen:o}){const[i,n]=x(!!o),t=y(()=>X(a,l),[a,l]),c=y(()=>a.reduce((v,$)=>v+$.tokens,0),[a]),d=y(()=>a.reduce((v,$)=>v+$.size,0),[a]),g=y(()=>{var $;const v={};return a.forEach(k=>{const h=(k.sent_to_llm||"no").toLowerCase();v[h]=(v[h]||0)+1}),(($=Object.entries(v).sort((k,h)=>h[1]-k[1])[0])==null?void 0:$[0])||"no"},[a]),u=()=>t.length===1&&t[0][1].length<=3?t[0][1].map(v=>e`<${G} key=${v.path} file=${v}/>`):t.map(([v,$])=>$.length===1?e`<div style=${{marginLeft:"var(--sp-5)"}}><${G} key=${$[0].path} file=${$[0]} dirPrefix=${v}/></div>`:e`<${bs} key=${v} dir=${v} files=${$}/>`);return e`<div class="cat-group" style=${r||""}>
    <button class=${"cat-head"+(i?" open":"")} onClick=${()=>n(!i)} aria-expanded=${i}>
      <span class="carrow" aria-hidden="true">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${Z(g)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${g}"></span>
      <span class="cat-label" title=${s}>${O(s)}</span>
      <span class="badge" style="flex-shrink:0">${m||a.length}</span>
      <span class="badge">${_(d)}</span>
      <span class="badge">${S(c)}t</span>
    </button>
    ${i&&e`<div style=${{paddingLeft:"var(--sp-8)"}}>${u()}</div>`}
  </div>`}function q({label:s,data:a,color:l}){const m=as(null);return ts(()=>{const r=m.current;if(!r||!a||a.length<2)return;const o=r.getContext("2d"),i=r.width=r.offsetWidth*(window.devicePixelRatio||1),n=r.height=r.offsetHeight*(window.devicePixelRatio||1);o.clearRect(0,0,i,n);const t=a.slice(-60),c=Math.max(...t)*1.1||1,d=i/(t.length-1);o.beginPath(),o.strokeStyle=ns(l),o.lineWidth=1.5*(window.devicePixelRatio||1),t.forEach((g,u)=>{const v=u*d,$=n-g/c*n*.85;u===0?o.moveTo(v,$):o.lineTo(v,$)}),o.stroke()},[a,l]),e`<div style="display:flex;align-items:center;gap:var(--sp-2);height:25px">
    <span class="text-muted" style="font-size:var(--fs-2xs);flex:0 0 34px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s}</span>
    <canvas ref=${m} aria-hidden="true" style="flex:1;min-width:0;height:100%;display:block"/>
  </div>`}function fs({processes:s,maxMem:a}){if(!s||!s.length)return null;const l=s.reduce((i,n)=>i+(parseFloat(n.mem_mb)||0),0),m=s.reduce((i,n)=>i+(parseFloat(n.cpu_pct)||0),0),r={};s.forEach(i=>{const n=i.process_type||"process";(r[n]=r[n]||[]).push(i)});const o=Object.keys(r).length>1;return e`<div class="proc-section">
    <h3>Processes <span class="badge">${s.length}</span>
      <span class="badge">CPU ${C(m)}</span>
      <span class="badge">MEM ${_(l*1048576)}</span></h3>
    ${Object.entries(r).map(([i,n])=>{const t={};return n.forEach(c=>(t[c.name||"unknown"]=t[c.name||"unknown"]||[]).push(c)),e`<div style="margin-bottom:var(--sp-2)">
        ${o?e`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${O(i)}</div>`:null}
        ${Object.entries(t).map(([c,d])=>{const g=d.sort((u,v)=>(parseFloat(v.mem_mb)||0)-(parseFloat(u.mem_mb)||0));return e`<div key=${c} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${o?"":e`<span style="text-transform:uppercase;letter-spacing:0.03em">${O(i)}</span>${" · "}`}${O(c)} <span style="opacity:0.6">(${d.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${g.map(u=>{const v=parseFloat(u.cpu_pct)||0,$=parseFloat(u.mem_mb)||0,k=Math.max(2,Math.min(v,100)),h=v>80?"var(--red)":v>50?"var(--orange)":v>5?"var(--green)":"var(--fg2)",z=u.anomalies&&u.anomalies.length,M=u.zombie_risk&&u.zombie_risk!=="none";return e`<div key=${u.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${z?"border-left:2px solid var(--red);":""}${M?"border-left:2px solid var(--orange);":""}"
                  title=${u.cmdline||u.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${k}%;height:100%;background:${h};border-radius:2px"></div>
                    </div>
                    <span style="color:${h};min-width:3ch;text-align:right">${C(v)}</span>
                  </div>
                  <div class="mono text-muted">${u.pid}</div>
                  <div>${_($*1048576)}</div>
                  ${z?e`<div class="text-red">\u26A0${u.anomalies.length}</div>`:null}
                </div>`})}
            </div>
          </div>`})}
      </div>`})}
  </div>`}function ys({config:s}){if(!s)return null;const a=Object.entries(s.settings||{}),l=Object.entries(s.features||{}),m=(s.mcp_servers||[]).length>0,r=(s.extensions||[]).length>0,o=s.otel||{},i=s.hints||[];return!a.length&&!l.length&&!m&&!r&&!o.enabled&&!i.length&&s.model==null&&s.launch_at_startup==null?null:e`<div class="live-section">
    <h3>Configuration
      ${s.launch_at_startup===!0&&e`<span class="badge" style="background:var(--green);color:var(--on-status)">auto-start</span>`}
      ${s.launch_at_startup===!1&&e`<span class="badge">no auto-start</span>`}
      ${s.auto_update===!0&&e`<span class="badge">auto-update</span>`}
      ${s.model&&e`<span class="badge">${s.model}</span>`}
      ${o.enabled&&e`<span class="badge" style="background:var(--green);color:var(--on-status)">OTel ${o.exporter||"on"}</span>`}
      ${!o.enabled&&o.source&&e`<span class="badge" style="background:var(--orange);color:var(--on-status)">OTel off</span>`}
    </h3>
    <div class="metric-grid">
      ${o.enabled&&e`<div class="metric-chip" style="border-color:var(--green)">
        <span class="mlabel text-green">OpenTelemetry</span>
        <div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Exporter:</span> <span class="mono">${o.exporter}</span>
        </div>
        ${o.endpoint&&e`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Endpoint:</span> <span class="mono">${o.endpoint}</span>
        </div>`}
        ${o.file_path&&e`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">File:</span> <span class="mono">${o.file_path}</span>
        </div>`}
        ${o.capture_content&&e`<div class="text-orange" style="font-size:var(--fs-base);padding:0.05rem 0">\u26A0 Content capture enabled</div>`}
      </div>`}
      ${a.length>0&&e`<div class="metric-chip">
        <span class="mlabel">Settings</span>
        ${a.map(([n,t])=>e`<div key=${n} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${n}</span>
          <span class="mono">${typeof t=="object"?JSON.stringify(t):String(t)}</span>
        </div>`)}
      </div>`}
      ${Object.entries(s.feature_groups||{}).map(([n,t])=>e`<div key=${n} class="metric-chip">
        <span class="mlabel">${n}</span>
        ${Object.entries(t).map(([c,d])=>e`<div key=${c} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${c}</span>
          <span style="color:${d===!0?"var(--green)":d===!1?"var(--red)":"var(--fg)"}">${typeof d=="object"?JSON.stringify(d):String(d)}</span>
        </div>`)}
      </div>`)}
      ${l.length>0&&!Object.keys(s.feature_groups||{}).length&&e`<div class="metric-chip">
        <span class="mlabel">Features</span>
        ${l.map(([n,t])=>e`<div key=${n} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${n}</span>
          <span style="color:${t===!0?"var(--green)":t===!1?"var(--red)":"var(--fg)"}">${String(t)}</span>
        </div>`)}
      </div>`}
      ${m&&e`<div class="metric-chip">
        <span class="mlabel">MCP Servers</span>
        <div class="stack-list">${s.mcp_servers.map((n,t)=>e`<span class="pill mono" key=${n||t}>${n}</span>`)}</div>
      </div>`}
      ${r&&e`<div class="metric-chip">
        <span class="mlabel">Extensions</span>
        <div class="stack-list">${s.extensions.map(n=>e`<span class="pill mono" key=${n}>${n}</span>`)}</div>
      </div>`}
    </div>
    ${i.length>0&&e`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
      ${i.map(n=>e`<div class="text-orange" style="font-size:var(--fs-base);padding:0.15rem 0">
        <span style="margin-right:var(--sp-3)">\u{1F4A1}</span>${n}
      </div>`)}
    </div>`}
  </div>`}function _s({telemetry:s}){if(!s)return null;const a=s,l=(a.input_tokens||0)+(a.output_tokens||0),m=a.errors||[],r=a.quota_state||{};if(!l&&!a.active_session_input&&!m.length)return null;const[o,i]=x(!1);return e`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${a.source}</span> <span class="badge">${C(a.confidence*100)} confidence</span>
      ${m.length>0&&e`<button type="button" class="badge warn cursor-ptr"
        aria-expanded=${o}
        aria-label=${"Toggle detail for "+m.length+" telemetry error"+(m.length>1?"s":"")}
        style="border:none;font:inherit"
        onClick=${n=>{n.stopPropagation(),i(!o)}}>${m.length} error${m.length>1?"s":""}</button>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${w(a.input_tokens||0)} tok</span>
        <span class="msub">cache read: ${w(a.cache_read_tokens||0)} tok \u00B7 creation: ${w(a.cache_creation_tokens||0)} tok</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${w(a.output_tokens||0)} tok</span>
        <span class="msub">${S(a.total_sessions||0)} sessions \u00B7 ${S(a.total_messages||0)} messages</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">${a.billing_unit?"Billed":"Estimated cost"}</span>
        <span class="mvalue"><${os} row=${a} showSub=${!1}/></span>
      </div>
      ${(r.premium_requests_used>0||r.total_api_duration_ms>0)&&e`<div class="metric-chip">
        <span class="mlabel">Operational</span>
        ${r.premium_requests_used>0&&e`<div style="font-size:var(--fs-base)">Premium requests: <span class="mono">${r.premium_requests_used}</span></div>`}
        ${r.total_api_duration_ms>0&&e`<div style="font-size:var(--fs-base)">API time: <span class="mono">${Math.round(r.total_api_duration_ms/1e3)}s</span></div>`}
        ${r.current_model&&e`<div style="font-size:var(--fs-base)">Model: <span class="mono">${r.current_model}</span></div>`}
        ${r.code_changes&&e`<div class="text-green" style="font-size:var(--fs-base)">+${r.code_changes.lines_added} -${r.code_changes.lines_removed} (${r.code_changes.files_modified} files)</div>`}
      </div>`}
      ${a.active_session_input>0||a.active_session_output>0?e`<div class="metric-chip" style="border-color:var(--accent)">
        <span class="mlabel">Active Session</span>
        <span class="mvalue">${w((a.active_session_input||0)+(a.active_session_output||0))} tok</span>
        <span class="msub">in: ${w(a.active_session_input||0)} \u00B7 out: ${w(a.active_session_output||0)} \u00B7 ${a.active_session_messages||0} msgs</span>
      </div>`:null}
      ${Object.keys(a.by_model||{}).length>0?e`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(a.by_model).map(([n,t])=>e`<div key=${n} class="flex-between flex-wrap" style="font-size:var(--fs-md);padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${n}</span>
          <span>in:${w(t.input_tokens||0)} tok out:${w(t.output_tokens||0)} tok${t.cache_read_tokens?" cR:"+w(t.cache_read_tokens)+" tok":""}${t.requests?" · "+t.requests+"req":""}${t.cost_usd?" · $"+t.cost_usd.toFixed(2):""}</span>
        </div>`)}
      </div>`:null}
    </div>
    ${o&&m.length>0&&e`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--red);background:color-mix(in srgb,var(--red) 8%,transparent);border-radius:0 4px 4px 0;max-height:10rem;overflow-y:auto">
      <div class="text-red text-bold" style="font-size:var(--fs-base);margin-bottom:0.2rem">Recent Errors</div>
      ${m.map(n=>e`<div class="flex-row gap-sm" style="font-size:var(--fs-sm);padding:0.1rem 0">
        <span class="mono text-muted text-nowrap">${(n.timestamp||"").slice(11,19)}</span>
        <span class="badge" style="font-size:var(--fs-xs);background:var(--red);color:var(--on-status);padding:0.05rem var(--sp-2)">${n.type}</span>
        <span class="text-muted">${n.message}</span>
        ${n.model&&e`<span class="mono text-muted">${n.model}</span>`}
      </div>`)}
    </div>`}
  </div>`}function xs({live:s}){if(!s)return null;const a=s.token_estimate||{},l=s.mcp||{},m=Q(s);return e`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${s.session_count||0} sess</span>
      <span class="badge">${s.pid_count||0} pid</span>
      <span class="badge">${C((s.confidence||0)*100)} conf</span>
      ${l.detected&&e`<span class="badge warn">${l.loops||0} MCP loop${(l.loops||0)===1?"":"s"}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">\u2191 ${D(s.outbound_rate_bps||0)}</span>
        <span class="msub">\u2193 ${D(s.inbound_rate_bps||0)} total ${_((s.outbound_bytes||0)+(s.inbound_bytes||0))}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Tokens</span>
        <span class="mvalue">${S(m)}</span>
        <span class="msub">${a.source||"network-inference"} at ${C((a.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">MCP</span>
        <span class="mvalue">${l.detected?"Detected":"No loop"}</span>
        <span class="msub">${l.loops||0} loops at ${C((l.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Context</span>
        <span class="mvalue">${s.files_touched||0} files</span>
        <span class="msub">${s.file_events||0} events \u00B7 repo ${_((s.workspace_size_mb||0)*1048576)}</span>
      </div>
      ${(s.state_bytes_written||0)>0&&e`<div class="metric-chip">
        <span class="mlabel">State Writes</span>
        <span class="mvalue">${_(s.state_bytes_written||0)}</span>
      </div>`}
      <div class="metric-chip">
        <span class="mlabel">CPU</span>
        <span class="mvalue">${C(s.cpu_percent||0)}</span>
        <span class="msub">peak ${C(s.peak_cpu_percent||0)}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Workspaces</span>
        <span class="mvalue">${(s.workspaces||[]).length||0}</span>
        <span class="msub mono">${(s.workspaces||[]).slice(0,2).join(" | ")||"no workspace reported"}</span>
      </div>
    </div>
  </div>`}function H({tool:s,root:a}){var j,P,L,f,T,B,E,F;const[l,m]=x(!1),{snap:r,history:o}=V(U),i=y(()=>((r==null?void 0:r.tool_configs)||[]).find(p=>p.tool===s.tool),[r,s.tool]),n=y(()=>{var p;return(p=o==null?void 0:o.by_tool)==null?void 0:p[s.tool]},[o,s.tool]),t=ls[s.tool]||"var(--fg2)",c=s.files.reduce((p,b)=>p+b.tokens,0),d=s.processes.filter(p=>p.anomalies&&p.anomalies.length).length,g=y(()=>[...new Set(s.processes.flatMap(p=>(p.anomalies||[]).map(b=>gs(b,p).label)))],[s.processes]),u=Q(s.live),v=(((j=s.live)==null?void 0:j.outbound_rate_bps)||0)+(((P=s.live)==null?void 0:P.inbound_rate_bps)||0),$=s.processes.reduce((p,b)=>p+(parseFloat(b.cpu_pct)||0),0),k=s.processes.reduce((p,b)=>p+(parseFloat(b.mem_mb)||0),0),h=y(()=>Math.max(...s.processes.map(p=>parseFloat(p.mem_mb)||0),100),[s.processes]),z=(((f=(L=s.token_breakdown)==null?void 0:L.telemetry)==null?void 0:f.errors)||[]).length,M=y(()=>{const p={};return s.files.forEach(b=>{const R=b.kind||"other";(p[R]=p[R]||[]).push(b)}),Object.keys(p).sort((b,R)=>{const W=J.indexOf(b),K=J.indexOf(R);return(W<0?99:W)-(K<0?99:K)}).map(b=>({kind:b,files:p[b]}))},[s.files]),A="tcard"+(l?" open":"")+(d||z?" has-anomaly":"");return e`<div class=${A}>
    <button class="tcard-head" onClick=${()=>m(!l)} aria-expanded=${l}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow" aria-hidden="true">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)"><${rs} tool=${s.tool} size="1em"/></span>${O(s.label)}</h2>
      ${is(s,r)?e`<span class="badge badge--muted">Not available from this machine</span>`:e`<span class="badge" data-dp="procs.tool.files">${s.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${S(c)} tok</span>`}
      ${s.processes.length>0&&e`<span class="badge" data-dp="procs.tool.process_count">${s.processes.length} proc ${C($)} ${_(k*1048576)}</span>`}
      ${s.mcp_servers.length>0&&e`<span class="badge" data-dp="procs.tool.mcp_server_count">${s.mcp_servers.length} MCP</span>`}
      ${d>0&&e`<span class="badge warn" data-dp="procs.tool.anomaly"
        title=${g.join(" · ")}>${d} ${d===1?"anomaly":"anomalies"}</span>`}
      ${z>0&&e`<span class="badge" style="background:var(--red);color:var(--on-status)">${z} error${z>1?"s":""}</span>`}
      ${s.live&&e`<span class="badge" style="background:var(--accent);color:var(--on-status)">${s.live.session_count||0} live \u00B7 ${D(v)}${u>0?" · "+S(u)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${M.map(({kind:p,files:b})=>e`<span class="text-muted" style="font-size:var(--fs-xs)">${p}:${b.length}</span>`)}
      </div>
      ${n&&n.ts.length>2&&!l&&e`<div role="img" aria-label=${"Sparkline charts for "+s.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${p=>p.stopPropagation()}>
        <${q} label="CPU" data=${n.cpu} color=${t}/>
        <${q} label="MEM" data=${n.mem_mb} color=${"var(--green)"}/>
        <${q} label=${s.live?"Traffic":"Tokens"} data=${s.live?n.traffic:n.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${l&&e`<div class="tcard-body">
      ${((T=Y[s.tool])==null?void 0:T.length)>0&&e`<div class="tool-relationships">
        ${Y[s.tool].map(p=>e`<span key=${p.label} class="rel-badge rel-${p.type}"
          title=${p.label}>${p.label}</span>`)}
      </div>`}
      <${ys} config=${i}/>
      <${_s} telemetry=${(B=s.token_breakdown)==null?void 0:B.telemetry}/>
      <${xs} live=${s.live}/>
      ${M.map(({kind:p,files:b})=>e`<${hs} key=${p} label=${p} files=${b} root=${a}/>`)}
      <${fs} processes=${(F=(E=s.live)==null?void 0:E.processes)!=null&&F.length?s.live.processes:s.processes} maxMem=${h}/>
      ${s.mcp_servers.length>0&&e`<div class="proc-section"><h3>MCP Servers</h3>
        ${s.mcp_servers.map(p=>e`<div key=${p.name||p.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${O(p.name)}</span>
          <span class="fmeta">${O((p.config||{}).command||"")} ${((p.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function ks({groupKey:s,groupLabel:a,groupColor:l,tools:m,root:r}){const[o,i]=x(!0),n=m.reduce((c,d)=>c+d.files.length,0),t=m.reduce((c,d)=>c+d.files.reduce((g,u)=>g+u.tokens,0),0);return e`<div class="mb-md">
    <button onClick=${()=>i(!o)} aria-expanded=${o}
      class="flex-row gap-sm cursor-ptr" style="background:none;border:none;padding:var(--sp-3) 0;font:inherit;color:var(--fg);width:100%">
      <span aria-hidden="true" style="font-size:var(--fs-xs);transition:transform 0.15s;${o?"transform:rotate(90deg)":""}">\u25B6</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${l};flex-shrink:0"></span>
      <span class="text-bolder" style="font-size:var(--fs-lg)">${a}</span>
      <span class="badge">${m.length} tools</span>
      <span class="badge">${n} files</span>
      <span class="badge">${S(t)} tok</span>
    </button>
    ${o&&e`<div class="tool-grid" style="margin-top:var(--sp-3)">
      ${m.map(c=>e`<${H} key=${c.tool} tool=${c} root=${r}/>`)}
    </div>`}
  </div>`}function Cs(){const{snap:s}=V(U),[a,l]=x("product"),m=t=>t.files.length||t.processes.length||t.mcp_servers.length||t.live,r=(t,c)=>{const d=t.files.length*2+t.processes.length+t.mcp_servers.length;return c.files.length*2+c.processes.length+c.mcp_servers.length-d||t.tool.localeCompare(c.tool)},o=y(()=>s?s.tools.filter(t=>!t.meta&&m(t)).sort(r):[],[s]),i=y(()=>s?s.tools.filter(t=>t.meta&&t.tool!=="project-env"&&m(t)).sort(r):[],[s]),n=y(()=>{if(a==="product"||!o.length)return null;const t={};return o.forEach(c=>{if(a==="vendor"){const d=c.vendor||"community",g=cs[d]||d,u=ps[d]||"var(--fg2)";t[d]||(t[d]={label:g,color:u,tools:[]}),t[d].tools.push(c)}else{const d=(c.host||"any").split(",");for(const g of d){const u=g.trim(),v=ds[u]||u,$="var(--fg2)";t[u]||(t[u]={label:v,color:$,tools:[]}),t[u].tools.push(c)}}}),Object.entries(t).sort((c,d)=>{const g=c[1].tools.reduce((v,$)=>v+$.files.length,0);return d[1].tools.reduce((v,$)=>v+$.files.length,0)-g})},[o,a]);return s?!o.length&&!i.length?e`<p class="empty-state">No AI tool resources found for this tool filter. Widen it in the header, or run aictl doctor.</p>`:e`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${ms.map(t=>e`<button key=${t.id}
        class=${a===t.id?"range-btn active":"range-btn"}
        onClick=${()=>l(t.id)}>${t.label}</button>`)}
    </div>
    ${o.length>0&&(n?n.map(([t,c])=>e`<${ks} key=${t}
      groupKey=${t} groupLabel=${c.label} groupColor=${c.color}
      tools=${c.tools} root=${s.root}/>`):e`<div class="tool-grid">
        ${o.map(t=>e`<${H} key=${t.tool} tool=${t} root=${s.root}/>`)}
      </div>`)}
    ${i.length>0&&e`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)"><${vs} name="chevron-right" size="0.8em"/></span>
        <span>Project Context</span>
        <span class="badge">${i.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${i.map(t=>e`<${H} key=${t.tool} tool=${t} root=${s.root}/>`)}
      </div>
    </details>`}
  </div>`:e`<${us} status="loading" label="processes"/>`}export{Cs as default};
