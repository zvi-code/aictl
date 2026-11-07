import{d as k,T as _,m as e,x as H,q as ss,A as es,y as as}from"./index-vv_D0zX4.js";import{S as U,C as ts,T as ns,P as os,a as ls,I as rs}from"./app-9z-oBkOS.js";import{z as C,q as x,ab as is,ac as Q,v as z,r as T,o as cs,B as I,ad as q,F as ps,ae as w,af as X,G as D,C as ds,ag as J,ah as us,ai as Y,aj as ms,ak as $s,al as vs,L as gs,am as bs}from"./useSse-Choi4ZDH.js";import{T as Z}from"./TextView-Dhv-JKH_.js";const hs={high_memory:{label:"High memory",detail:s=>{const a=s.actual_mb!=null?x(s.actual_mb*1048576):null,o=s.expected_mb!=null?x(s.expected_mb*1048576):null;return a&&o?`${a} >> expected ${o}`:a},severity:"orange"},cpu_spike:{label:"CPU spike",detail:(s,a)=>a.cpu_pct!=null?C(parseFloat(a.cpu_pct)):null,severity:"orange"},zombie:{label:"Zombie process",detail:s=>`ppid=${s.ppid}, risk=${s.risk}`,severity:"red"},known_leak:{label:"Known leak",detail:s=>s.pattern,severity:"red"},high_file_count:{label:"High file count",detail:(s,a)=>a.file_count?`${a.file_count} open files`:null,severity:"yellow"},long_running:{label:"Long running",detail:(s,a)=>a.uptime_s?`${Math.round(a.uptime_s/60)}min`:null,severity:"yellow"}};function fs(s,a){const o=hs[s.type];return o?{label:o.label,detail:o.detail(s,a||{}),severity:o.severity}:{label:s.type,detail:null,severity:"orange"}}function G({file:s,dirPrefix:a}){var P;const[o,m]=k(!1),[i,l]=k(!1),[r,n]=k(null),[c,t]=k(null),[d,g]=k(!1),$=H(U),u=(s.path||"").replace(/\\/g,"/").split("/").pop(),v=(s.sent_to_llm||"").toLowerCase(),h=s.mtime&&Date.now()/1e3-s.mtime<300,f=(P=$.recentFiles)==null?void 0:P.get(s.path),O=!!f,M=ss(async()=>{if(o){m(!1);return}m(!0),g(!0),t(null);try{const y=await cs(s.path);n(y)}catch(y){t(y.message)}finally{g(!1)}},[o,s.path]),A=(y,S)=>y.map((B,E)=>e`<span class="pline"><span class="ln">${S+E}</span>${z(B)||" "}</span>`),j=()=>{if(d)return e`<span class="text-muted">loading...</span>`;if(c)return e`<span class="text-red">${c}</span>`;if(!r)return null;const y=r.split(`
`),S=y.length;if(S<=q*3||i)return e`<${Z} text=${r} path=${s.path} source=${e`${A(y,1)}`}/>
        <div class="prev-actions">
          ${i&&e`<button class="prev-btn" onClick=${()=>l(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>$.openViewer(s.path)}>open in viewer</button>
        </div>`;const E=y.slice(-q),F=S-q+1;return e`<${Z} text=${r} path=${s.path} source=${e`${A(E,F)}`}/>
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>l(!0)}>show all (${S} lines)</button>
        <button class="prev-btn" onClick=${()=>$.openViewer(s.path)}>open in viewer</button>
      </div>`},L=s.size>0?Math.round(s.size/60):0;return e`<div>
    <button class="fitem" onClick=${M} aria-expanded=${o} title=${s.path}>
      ${O?e`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${I(f.ts)}${f.growth>0?" +"+x(f.growth):""}">●</span>`:h?e`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${I(s.mtime)}">●</span>`:e`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${a?e`<span class="text-muted">${a}/</span>`:""}${z(u)}</span>
      <span class="fmeta">
        ${v&&v!=="no"&&e`<span style="color:${Q(v)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${v}">${v==="yes"?"◆":v==="on-demand"?"◇":"○"}</span>`}
        ${x(s.size)}${L?e` <span class="text-muted">${L}ln</span>`:""}${s.tokens?e` <span class="text-muted">${T(s.tokens)}t</span>`:""}
        ${s.mtime&&h?e` <span class="text-orange text-xs">${I(s.mtime)}</span>`:""}
      </span>
    </button>
    ${o&&e`<div class="inline-preview">${j()}</div>`}
  </div>`}function ys({dir:s,files:a}){const[o,m]=k(!1),i=a.reduce((r,n)=>r+n.tokens,0),l=a.reduce((r,n)=>r+n.size,0);return e`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${o?"mem-profile-head open":"mem-profile-head"} onClick=${()=>m(!o)} aria-expanded=${o}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow" aria-hidden="true">\u25B6</span>
      <span class="cat-label text-muted" title=${s}>${z(s)}</span>
      <span class="badge">${a.length}</span>
      <span class="badge">${x(l)}</span>
      <span class="badge">${T(i)}t</span>
    </button>
    ${o&&e`<div style=${{paddingLeft:"var(--sp-8)"}}>${a.map(r=>e`<${G} key=${r.path} file=${r}/>`)}</div>`}
  </div>`}function _s({label:s,files:a,root:o,badge:m,style:i,startOpen:l}){const[r,n]=k(!!l),c=_(()=>is(a,o),[a,o]),t=_(()=>a.reduce((u,v)=>u+v.tokens,0),[a]),d=_(()=>a.reduce((u,v)=>u+v.size,0),[a]),g=_(()=>{var v;const u={};return a.forEach(h=>{const f=(h.sent_to_llm||"no").toLowerCase();u[f]=(u[f]||0)+1}),((v=Object.entries(u).sort((h,f)=>f[1]-h[1])[0])==null?void 0:v[0])||"no"},[a]),$=()=>c.length===1&&c[0][1].length<=3?c[0][1].map(u=>e`<${G} key=${u.path} file=${u}/>`):c.map(([u,v])=>v.length===1?e`<div style=${{marginLeft:"var(--sp-5)"}}><${G} key=${v[0].path} file=${v[0]} dirPrefix=${u}/></div>`:e`<${ys} key=${u} dir=${u} files=${v}/>`);return e`<div class="cat-group" style=${i||""}>
    <button class=${"cat-head"+(r?" open":"")} onClick=${()=>n(!r)} aria-expanded=${r}>
      <span class="carrow" aria-hidden="true">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${Q(g)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${g}"></span>
      <span class="cat-label" title=${s}>${z(s)}</span>
      <span class="badge" style="flex-shrink:0">${m||a.length}</span>
      <span class="badge">${x(d)}</span>
      <span class="badge">${T(t)}t</span>
    </button>
    ${r&&e`<div style=${{paddingLeft:"var(--sp-8)"}}>${$()}</div>`}
  </div>`}function N({label:s,data:a,color:o}){const m=es(null);return as(()=>{const i=m.current;if(!i||!a||a.length<2)return;const l=i.getContext("2d"),r=i.width=i.offsetWidth*(window.devicePixelRatio||1),n=i.height=i.offsetHeight*(window.devicePixelRatio||1);l.clearRect(0,0,r,n);const c=a.slice(-60),t=Math.max(...c)*1.1||1,d=r/(c.length-1);l.beginPath(),l.strokeStyle=ps(o),l.lineWidth=1.5*(window.devicePixelRatio||1),c.forEach((g,$)=>{const u=$*d,v=n-g/t*n*.85;$===0?l.moveTo(u,v):l.lineTo(u,v)}),l.stroke()},[a,o]),e`<div style="display:flex;align-items:center;gap:var(--sp-2);height:25px">
    <span class="text-muted" style="font-size:var(--fs-2xs);flex:0 0 34px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s}</span>
    <canvas ref=${m} aria-hidden="true" style="flex:1;min-width:0;height:100%;display:block"/>
  </div>`}function xs({processes:s,maxMem:a}){if(!s||!s.length)return null;const o=s.reduce((r,n)=>r+(parseFloat(n.mem_mb)||0),0),m=s.reduce((r,n)=>r+(parseFloat(n.cpu_pct)||0),0),i={};s.forEach(r=>{const n=r.process_type||"process";(i[n]=i[n]||[]).push(r)});const l=Object.keys(i).length>1;return e`<div class="proc-section">
    <h3>Processes <span class="badge">${s.length}</span>
      <span class="badge">CPU ${C(m)}</span>
      <span class="badge">MEM ${x(o*1048576)}</span></h3>
    ${Object.entries(i).map(([r,n])=>{const c={};return n.forEach(t=>(c[t.name||"unknown"]=c[t.name||"unknown"]||[]).push(t)),e`<div style="margin-bottom:var(--sp-2)">
        ${l?e`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${z(r)}</div>`:null}
        ${Object.entries(c).map(([t,d])=>{const g=d.sort(($,u)=>(parseFloat(u.mem_mb)||0)-(parseFloat($.mem_mb)||0));return e`<div key=${t} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${l?"":e`<span style="text-transform:uppercase;letter-spacing:0.03em">${z(r)}</span>${" · "}`}${z(t)} <span style="opacity:0.6">(${d.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${g.map($=>{const u=parseFloat($.cpu_pct)||0,v=parseFloat($.mem_mb)||0,h=Math.max(2,Math.min(u,100)),f=u>80?"var(--red)":u>50?"var(--orange)":u>5?"var(--green)":"var(--fg2)",O=$.anomalies&&$.anomalies.length,M=$.zombie_risk&&$.zombie_risk!=="none";return e`<div key=${$.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${O?"border-left:2px solid var(--red);":""}${M?"border-left:2px solid var(--orange);":""}"
                  title=${$.cmdline||$.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${h}%;height:100%;background:${f};border-radius:2px"></div>
                    </div>
                    <span style="color:${f};min-width:3ch;text-align:right">${C(u)}</span>
                  </div>
                  <div class="mono text-muted">${$.pid}</div>
                  <div>${x(v*1048576)}</div>
                  ${O?e`<div class="text-red">\u26A0${$.anomalies.length}</div>`:null}
                </div>`})}
            </div>
          </div>`})}
      </div>`})}
  </div>`}function ks({config:s}){if(!s)return null;const a=Object.entries(s.settings||{}),o=Object.entries(s.features||{}),m=(s.mcp_servers||[]).length>0,i=(s.extensions||[]).length>0,l=s.otel||{},r=s.hints||[];return!a.length&&!o.length&&!m&&!i&&!l.enabled&&!r.length&&s.model==null&&s.launch_at_startup==null?null:e`<div class="live-section">
    <h3>Configuration
      ${s.launch_at_startup===!0&&e`<span class="badge" style="background:var(--green);color:var(--on-status)">auto-start</span>`}
      ${s.launch_at_startup===!1&&e`<span class="badge">no auto-start</span>`}
      ${s.auto_update===!0&&e`<span class="badge">auto-update</span>`}
      ${s.model&&e`<span class="badge">${s.model}</span>`}
      ${l.enabled&&e`<span class="badge" style="background:var(--green);color:var(--on-status)">OTel ${l.exporter||"on"}</span>`}
      ${!l.enabled&&l.source&&e`<span class="badge" style="background:var(--orange);color:var(--on-status)">OTel off</span>`}
    </h3>
    <div class="metric-grid">
      ${l.enabled&&e`<div class="metric-chip" style="border-color:var(--green)">
        <span class="mlabel text-green">OpenTelemetry</span>
        <div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Exporter:</span> <span class="mono">${l.exporter}</span>
        </div>
        ${l.endpoint&&e`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Endpoint:</span> <span class="mono">${l.endpoint}</span>
        </div>`}
        ${l.file_path&&e`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">File:</span> <span class="mono">${l.file_path}</span>
        </div>`}
        ${l.capture_content&&e`<div class="text-orange" style="font-size:var(--fs-base);padding:0.05rem 0">\u26A0 Content capture enabled</div>`}
      </div>`}
      ${a.length>0&&e`<div class="metric-chip">
        <span class="mlabel">Settings</span>
        ${a.map(([n,c])=>e`<div key=${n} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${n}</span>
          <span class="mono">${typeof c=="object"?JSON.stringify(c):String(c)}</span>
        </div>`)}
      </div>`}
      ${Object.entries(s.feature_groups||{}).map(([n,c])=>e`<div key=${n} class="metric-chip">
        <span class="mlabel">${n}</span>
        ${Object.entries(c).map(([t,d])=>e`<div key=${t} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${t}</span>
          <span style="color:${d===!0?"var(--green)":d===!1?"var(--red)":"var(--fg)"}">${typeof d=="object"?JSON.stringify(d):String(d)}</span>
        </div>`)}
      </div>`)}
      ${o.length>0&&!Object.keys(s.feature_groups||{}).length&&e`<div class="metric-chip">
        <span class="mlabel">Features</span>
        ${o.map(([n,c])=>e`<div key=${n} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${n}</span>
          <span style="color:${c===!0?"var(--green)":c===!1?"var(--red)":"var(--fg)"}">${String(c)}</span>
        </div>`)}
      </div>`}
      ${m&&e`<div class="metric-chip">
        <span class="mlabel">MCP Servers</span>
        <div class="stack-list">${s.mcp_servers.map((n,c)=>e`<span class="pill mono" key=${n||c}>${n}</span>`)}</div>
      </div>`}
      ${i&&e`<div class="metric-chip">
        <span class="mlabel">Extensions</span>
        <div class="stack-list">${s.extensions.map(n=>e`<span class="pill mono" key=${n}>${n}</span>`)}</div>
      </div>`}
    </div>
    ${r.length>0&&e`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
      ${r.map(n=>e`<div class="text-orange" style="font-size:var(--fs-base);padding:0.15rem 0">
        <span style="margin-right:var(--sp-3)">\u{1F4A1}</span>${n}
      </div>`)}
    </div>`}
  </div>`}function ws({telemetry:s}){if(!s)return null;const a=s,o=(a.input_tokens||0)+(a.output_tokens||0),m=a.errors||[],i=a.quota_state||{};if(!o&&!a.active_session_input&&!m.length)return null;const[l,r]=k(!1);return e`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${a.source}</span> <span class="badge">${C(a.confidence*100)} confidence</span>
      ${m.length>0&&e`<button type="button" class="badge warn cursor-ptr"
        aria-expanded=${l}
        aria-label=${"Toggle detail for "+m.length+" telemetry error"+(m.length>1?"s":"")}
        style="border:none;font:inherit"
        onClick=${n=>{n.stopPropagation(),r(!l)}}>${m.length} error${m.length>1?"s":""}</button>`}
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
        <span class="msub">${T(a.total_sessions||0)} sessions \u00B7 ${T(a.total_messages||0)} messages</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">${a.billing_unit?"Billed":"Estimated cost"}</span>
        <span class="mvalue"><${ts} row=${a} showSub=${!1}/></span>
      </div>
      ${(i.premium_requests_used>0||i.total_api_duration_ms>0)&&e`<div class="metric-chip">
        <span class="mlabel">Operational</span>
        ${i.premium_requests_used>0&&e`<div style="font-size:var(--fs-base)">Premium requests: <span class="mono">${i.premium_requests_used}</span></div>`}
        ${i.total_api_duration_ms>0&&e`<div style="font-size:var(--fs-base)">API time: <span class="mono">${Math.round(i.total_api_duration_ms/1e3)}s</span></div>`}
        ${i.current_model&&e`<div style="font-size:var(--fs-base)">Model: <span class="mono">${i.current_model}</span></div>`}
        ${i.code_changes&&e`<div class="text-green" style="font-size:var(--fs-base)">+${i.code_changes.lines_added} -${i.code_changes.lines_removed} (${i.code_changes.files_modified} files)</div>`}
      </div>`}
      ${a.active_session_input>0||a.active_session_output>0?e`<div class="metric-chip" style="border-color:var(--accent)">
        <span class="mlabel">Active Session</span>
        <span class="mvalue">${w((a.active_session_input||0)+(a.active_session_output||0))} tok</span>
        <span class="msub">in: ${w(a.active_session_input||0)} \u00B7 out: ${w(a.active_session_output||0)} \u00B7 ${a.active_session_messages||0} msgs</span>
      </div>`:null}
      ${Object.keys(a.by_model||{}).length>0?e`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(a.by_model).map(([n,c])=>e`<div key=${n} class="flex-between flex-wrap" style="font-size:var(--fs-md);padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${n}</span>
          <span>in:${w(c.input_tokens||0)} tok out:${w(c.output_tokens||0)} tok${c.cache_read_tokens?" cR:"+w(c.cache_read_tokens)+" tok":""}${c.requests?" · "+c.requests+"req":""}${c.cost_usd?" · $"+c.cost_usd.toFixed(2):""}</span>
        </div>`)}
      </div>`:null}
    </div>
    ${l&&m.length>0&&e`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--red);background:color-mix(in srgb,var(--red) 8%,transparent);border-radius:0 4px 4px 0;max-height:10rem;overflow-y:auto">
      <div class="text-red text-bold" style="font-size:var(--fs-base);margin-bottom:0.2rem">Recent Errors</div>
      ${m.map(n=>e`<div class="flex-row gap-sm" style="font-size:var(--fs-sm);padding:0.1rem 0">
        <span class="mono text-muted text-nowrap">${(n.timestamp||"").slice(11,19)}</span>
        <span class="badge" style="font-size:var(--fs-xs);background:var(--red);color:var(--on-status);padding:0.05rem var(--sp-2)">${n.type}</span>
        <span class="text-muted">${n.message}</span>
        ${n.model&&e`<span class="mono text-muted">${n.model}</span>`}
      </div>`)}
    </div>`}
  </div>`}function Cs({live:s}){if(!s)return null;const a=s.token_estimate||{},o=s.mcp||{},m=X(s);return e`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${s.session_count||0} sess</span>
      <span class="badge">${s.pid_count||0} pid</span>
      <span class="badge">${C((s.confidence||0)*100)} conf</span>
      ${o.detected&&e`<span class="badge warn">${o.loops||0} MCP loop${(o.loops||0)===1?"":"s"}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">\u2191 ${D(s.outbound_rate_bps||0)}</span>
        <span class="msub">\u2193 ${D(s.inbound_rate_bps||0)} total ${x((s.outbound_bytes||0)+(s.inbound_bytes||0))}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Tokens</span>
        <span class="mvalue">${T(m)}</span>
        <span class="msub">${a.source||"network-inference"} at ${C((a.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">MCP</span>
        <span class="mvalue">${o.detected?"Detected":"No loop"}</span>
        <span class="msub">${o.loops||0} loops at ${C((o.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Context</span>
        <span class="mvalue">${s.files_touched||0} files</span>
        <span class="msub">${s.file_events||0} events \u00B7 repo ${x((s.workspace_size_mb||0)*1048576)}</span>
      </div>
      ${(s.state_bytes_written||0)>0&&e`<div class="metric-chip">
        <span class="mlabel">State Writes</span>
        <span class="mvalue">${x(s.state_bytes_written||0)}</span>
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
  </div>`}function V({tool:s,root:a}){var j,L,P,y,S,B,E,F;const[o,m]=k(!1),{snap:i,history:l}=H(U),r=_(()=>((i==null?void 0:i.tool_configs)||[]).find(p=>p.tool===s.tool),[i,s.tool]),n=_(()=>{var p;return(p=l==null?void 0:l.by_tool)==null?void 0:p[s.tool]},[l,s.tool]),c=ds[s.tool]||"var(--fg2)",t=s.files.reduce((p,b)=>p+b.tokens,0),d=s.processes.filter(p=>p.anomalies&&p.anomalies.length).length,g=_(()=>[...new Set(s.processes.flatMap(p=>(p.anomalies||[]).map(b=>fs(b,p).label)))],[s.processes]),$=X(s.live),u=(((j=s.live)==null?void 0:j.outbound_rate_bps)||0)+(((L=s.live)==null?void 0:L.inbound_rate_bps)||0),v=s.processes.reduce((p,b)=>p+(parseFloat(b.cpu_pct)||0),0),h=s.processes.reduce((p,b)=>p+(parseFloat(b.mem_mb)||0),0),f=_(()=>Math.max(...s.processes.map(p=>parseFloat(p.mem_mb)||0),100),[s.processes]),O=(((y=(P=s.token_breakdown)==null?void 0:P.telemetry)==null?void 0:y.errors)||[]).length,M=_(()=>{const p={};return s.files.forEach(b=>{const R=b.kind||"other";(p[R]=p[R]||[]).push(b)}),Object.keys(p).sort((b,R)=>{const W=J.indexOf(b),K=J.indexOf(R);return(W<0?99:W)-(K<0?99:K)}).map(b=>({kind:b,files:p[b]}))},[s.files]),A="tcard"+(o?" open":"")+(d||O?" has-anomaly":"");return e`<div class=${A}>
    <button class="tcard-head" onClick=${()=>m(!o)} aria-expanded=${o}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow" aria-hidden="true">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)"><${ns} tool=${s.tool} size="1em"/></span>${z(s.label)}</h2>
      ${us(s,i)?e`<span class="badge badge--muted">Not available from this machine</span>`:e`<span class="badge" data-dp="procs.tool.files">${s.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens"
        title="Estimated size of this tool's files at about 4 bytes per token. It includes files that are never sent to the model, such as transcripts and logs; it is not the context window.">${T(t)} file tok</span>`}
      ${s.processes.length>0&&e`<span class="badge" data-dp="procs.tool.process_count">${s.processes.length} proc ${C(v)} ${x(h*1048576)}</span>`}
      ${s.mcp_servers.length>0&&e`<span class="badge" data-dp="procs.tool.mcp_server_count">${s.mcp_servers.length} MCP</span>`}
      ${d>0&&e`<span class="badge warn" data-dp="procs.tool.anomaly"
        title=${g.join(" · ")}>${d} ${d===1?"anomaly":"anomalies"}</span>`}
      ${O>0&&e`<span class="badge" style="background:var(--red);color:var(--on-status)">${O} error${O>1?"s":""}</span>`}
      ${s.live&&e`<span class="badge" style="background:var(--accent);color:var(--on-status)">${s.live.session_count||0} live \u00B7 ${D(u)}${$>0?" · "+T($)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${M.map(({kind:p,files:b})=>e`<span class="text-muted" style="font-size:var(--fs-xs)">${p}:${b.length}</span>`)}
      </div>
      ${n&&n.ts.length>2&&!o&&e`<div role="img" aria-label=${"Sparkline charts for "+s.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${p=>p.stopPropagation()}>
        <${N} label="CPU" data=${n.cpu} color=${c}/>
        <${N} label="MEM" data=${n.mem_mb} color=${"var(--green)"}/>
        <${N} label=${s.live?"Traffic":"Tokens"} data=${s.live?n.traffic:n.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${o&&e`<div class="tcard-body">
      ${((S=Y[s.tool])==null?void 0:S.length)>0&&e`<div class="tool-relationships">
        ${Y[s.tool].map(p=>e`<span key=${p.label} class="rel-badge rel-${p.type}"
          title=${p.label}>${p.label}</span>`)}
      </div>`}
      <${ks} config=${r}/>
      <${ws} telemetry=${(B=s.token_breakdown)==null?void 0:B.telemetry}/>
      <${Cs} live=${s.live}/>
      ${M.map(({kind:p,files:b})=>e`<${_s} key=${p} label=${p} files=${b} root=${a}/>`)}
      <${xs} processes=${(F=(E=s.live)==null?void 0:E.processes)!=null&&F.length?s.live.processes:s.processes} maxMem=${f}/>
      ${s.mcp_servers.length>0&&e`<div class="proc-section"><h3>MCP Servers</h3>
        ${s.mcp_servers.map(p=>e`<div key=${p.name||p.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${z(p.name)}</span>
          <span class="fmeta">${z((p.config||{}).command||"")} ${((p.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function zs({groupKey:s,groupLabel:a,groupColor:o,tools:m,root:i}){const[l,r]=k(!0),n=m.reduce((t,d)=>t+d.files.length,0),c=m.reduce((t,d)=>t+d.files.reduce((g,$)=>g+$.tokens,0),0);return e`<div class="mb-md">
    <button onClick=${()=>r(!l)} aria-expanded=${l}
      class="flex-row gap-sm cursor-ptr" style="background:none;border:none;padding:var(--sp-3) 0;font:inherit;color:var(--fg);width:100%">
      <span aria-hidden="true" style="font-size:var(--fs-xs);transition:transform 0.15s;${l?"transform:rotate(90deg)":""}">\u25B6</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${o};flex-shrink:0"></span>
      <span class="text-bolder" style="font-size:var(--fs-lg)">${a}</span>
      <span class="badge">${m.length} tools</span>
      <span class="badge">${n} files</span>
      <span class="badge">${T(c)} tok</span>
    </button>
    ${l&&e`<div class="tool-grid" style="margin-top:var(--sp-3)">
      ${m.map(t=>e`<${V} key=${t.tool} tool=${t} root=${i}/>`)}
    </div>`}
  </div>`}function Es(){const{snap:s,enabledTools:a=null}=H(U),[o,m]=k("product"),i=t=>t.files.length||t.processes.length||t.mcp_servers.length||t.live,l=(t,d)=>{const g=t.files.length*2+t.processes.length+t.mcp_servers.length;return d.files.length*2+d.processes.length+d.mcp_servers.length-g||t.tool.localeCompare(d.tool)},r=_(()=>s?s.tools.filter(t=>!t.meta&&i(t)).sort(l):[],[s]),n=_(()=>s?s.tools.filter(t=>t.meta&&t.tool!=="project-env"&&i(t)).sort(l):[],[s]),c=_(()=>{if(o==="product"||!r.length)return null;const t={};return r.forEach(d=>{if(o==="vendor"){const g=d.vendor||"community",$=ms[g]||g,u=$s[g]||"var(--fg2)";t[g]||(t[g]={label:$,color:u,tools:[]}),t[g].tools.push(d)}else{const g=(d.host||"any").split(",");for(const $ of g){const u=$.trim(),v=vs[u]||u,h="var(--fg2)";t[u]||(t[u]={label:v,color:h,tools:[]}),t[u].tools.push(d)}}}),Object.entries(t).sort((d,g)=>{const $=d[1].tools.reduce((v,h)=>v+h.files.length,0);return g[1].tools.reduce((v,h)=>v+h.files.length,0)-$})},[r,o]);return s?!r.length&&!n.length&&gs(a)?e`<${ls} enabledTools=${a} snap=${s} what="tool resources"/>`:!r.length&&!n.length?e`<p class="empty-state">No AI tool resources found. Run aictl doctor.</p>`:e`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${bs.map(t=>e`<button key=${t.id}
        class=${o===t.id?"range-btn active":"range-btn"}
        onClick=${()=>m(t.id)}>${t.label}</button>`)}
    </div>
    ${r.length>0&&(c?c.map(([t,d])=>e`<${zs} key=${t}
      groupKey=${t} groupLabel=${d.label} groupColor=${d.color}
      tools=${d.tools} root=${s.root}/>`):e`<div class="tool-grid">
        ${r.map(t=>e`<${V} key=${t.tool} tool=${t} root=${s.root}/>`)}
      </div>`)}
    ${n.length>0&&e`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)"><${rs} name="chevron-right" size="0.8em"/></span>
        <span>Project Context</span>
        <span class="badge">${n.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${n.map(t=>e`<${V} key=${t.tool} tool=${t} root=${s.root}/>`)}
      </div>
    </details>`}
  </div>`:e`<${os} status="loading" label="processes"/>`}export{Es as default};
