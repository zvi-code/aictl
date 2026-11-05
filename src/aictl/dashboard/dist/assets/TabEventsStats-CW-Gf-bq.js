import{x as G,d as p,T as M,y as D,m as t,k as P}from"./index-BTCnpwvT.js";import{S as K,a as X,c as Y,T as R,b as m,P as h,C as Q}from"./app-D6pbvQ4J.js";import{ap as Z,a0 as ee,l as se,L as te,ah as ae,C as ie,aj as le,z as k,q as A,ae as r,G as y,Y as ne,r as I,aq as oe}from"./useSse-CGriGT3A.js";const H=60;function de(s){if(s==null)return String(s);let i;if(typeof s=="object")try{i=JSON.stringify(s)}catch{i=String(s)}else i=String(s);return i.length>H?i.slice(0,H)+"…":i}function ce(s){return!s||typeof s!="object"?s==null?"":String(s):Object.entries(s).map(([i,$])=>i+"="+de($)).join(", ")}function re(s){try{return JSON.stringify(s,null,2)}catch{return String(s)}}function $e(){var L,j,N,z;const{snap:s,globalRange:i,enabledTools:$=null}=G(K),[_,V]=p(null),[b,S]=p([]),[o,T]=p(null),[W,C]=p(()=>new Set),u=M(()=>s?s.tools.filter(e=>!e.meta&&(e.files.length||e.processes.length||e.live)).sort((e,l)=>e.label.localeCompare(l.label)):[],[s]),d=M(()=>Z(u.map(e=>e.tool),_),[u,_]),[E,O]=p(null);D(()=>{!d||!i||(C(new Set),ee({tool:d,since:i.since,limit:500,until:i.until}).then(e=>{S(e),O(null)}).catch(e=>{S([]),O(e)}))},[d,i]);const U=e=>{C(l=>{const v=new Set(l);return v.has(e)?v.delete(e):v.add(e),v})};if(D(()=>{!d||!i||se({since:i.since,tool:d,until:i.until}).then(e=>{var l;return T(((l=e==null?void 0:e.by_tool)==null?void 0:l[d])||null)}).catch(()=>T(null))},[d,i]),!s)return t`<p class="loading-state">Loading...</p>`;if(!u.length&&te($))return t`<${X} enabledTools=${$} snap=${s} what="events"/>`;const a=u.find(e=>e.tool===d);if(ae(a,s))return t`<${Y} tool=${a}/>`;const n=(L=s.tool_telemetry)==null?void 0:L.find(e=>e.tool===d),c=a==null?void 0:a.live,q=ie[d]||"var(--fg2)",x={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},w=i.until!=null?new Date(i.since*1e3).toLocaleString(void 0,x)+" – "+new Date(i.until*1e3).toLocaleString(void 0,x):"";return t`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${u.map(e=>t`<button key=${e.tool}
        class=${d===e.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>V(e.tool)}>
        <${R} tool=${e.tool} size="1em"/>
        ${e.label}
        ${e.live?t`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${d&&t`<${P}>
        <h3 class="flex-row mb-sm gap-sm">
          <${R} tool=${d} size="1em"/>
          ${(a==null?void 0:a.label)||d}
          ${a!=null&&a.vendor?t`<span class="badge">${le[a.vendor]||a.vendor}</span>`:""}
          ${n!=null&&n.model?t`<span class="badge mono">${n.model}</span>`:""}
        </h3>

        ${o&&((j=o.ts)==null?void 0:j.length)>=2?t`<div class="es-section">
          <div class="es-section-title">Time Series${w?t` <span class="badge">${w}</span>`:""}</div>
          <div class="es-charts">
            <${m} label="CPU %" value=${((N=a==null?void 0:a.live)==null?void 0:N.cpu_percent)!=null?k(a.live.cpu_percent||0):"-"}
              data=${[o.ts,o.cpu]} chartColor=${q} smooth />
            <${m} label="Memory (MB)" value=${((z=a==null?void 0:a.live)==null?void 0:z.mem_mb)!=null?A((a.live.mem_mb||0)*1048576):"-"}
              data=${[o.ts,o.mem_mb]} chartColor="var(--green)" smooth />
            <${m} label="Context (tok)" value=${r(o.tokens[o.tokens.length-1]||0)}
              data=${[o.ts,o.tokens]} chartColor="var(--accent)" />
            <${m} label="Network (B/s)"
              value=${y(c?(c.outbound_rate_bps||0)+(c.inbound_rate_bps||0):o.traffic[o.traffic.length-1]||0)}
              valColor=${c?"var(--orange)":void 0}
              data=${[o.ts,o.traffic]} chartColor="var(--orange)" />
          </div>
        </div>`:t`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <${h} status="empty" emptyTitle="No samples in this range"
            emptyHint="Widen the time range in the header. Live mode shows samples since this page opened."/>
        </div>`}

        ${n?t`<div class="es-section">
          <div class="es-section-title">Telemetry
            <span class="badge" style="margin-left:var(--sp-3)">${n.source}</span>
            <span class="badge">${k(n.confidence*100)}</span>
          </div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${r(n.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${r(n.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${r(n.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${r(n.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${I(n.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${I(n.total_messages||0)}</div></div>
            <div class="es-kv-card" title=${ne}><div class="label">Est. cost</div><div class="value"><${Q} row=${n}/></div></div>
          </div>
          ${Object.keys(n.by_model||{}).length>0&&t`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(n.by_model).map(([e,l])=>t`<div key=${e}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${e}</span>
              <span>in: ${r(l.input||l.input_tokens||0)} tok \u00B7 out: ${r(l.output||l.output_tokens||0)} tok${l.cache_read_tokens?" · cR:"+r(l.cache_read_tokens):""}${l.cache_creation_tokens?" · cW:"+r(l.cache_creation_tokens):""}${l.cost_usd?" · $"+l.cost_usd.toFixed(2):""}</span>
            </div>`)}
          </div>`}
        </div>`:""}

        ${c?t`<div class="es-section">
          <div class="es-section-title">Live Monitor</div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${c.session_count||0}</div></div>
            <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${c.pid_count||0}</div></div>
            <div class="es-kv-card"><div class="label">CPU</div><div class="value">${k(c.cpu_percent||0)}</div></div>
            <div class="es-kv-card"><div class="label">Memory</div><div class="value">${A((c.mem_mb||0)*1048576)}</div></div>
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${y(c.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${y(c.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">Events (${b.length})</div>
          ${b.length?t`<div class="es-feed">
            ${b.map((e,l)=>{const v=oe[e.kind]||"var(--fg2)",F=new Date(e.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),B=ce(e.detail),J=e.detail!=null&&(typeof e.detail!="object"||Object.keys(e.detail).length>0),g=e.ts+"-"+e.tool+"-"+l,f=W.has(g);return t`<div key=${g}>
                <div class="es-event">
                  <span class="es-event-time">${F}</span>
                  <span class="es-event-kind" style="color:${v}">${e.kind}</span>
                  ${J?t`<button type="button" class="es-event-detail"
                        aria-expanded=${f?"true":"false"}
                        title=${B}
                        onClick=${()=>U(g)}
                        style="background:none;border:none;padding:0;cursor:pointer;color:var(--fg2);font-size:var(--fs-sm);text-align:left;font-family:inherit">
                        <span style="display:inline-block;width:1em" aria-hidden="true">${f?"˅":"›"}</span>${B}
                      </button>`:t`<span class="es-event-detail">-</span>`}
                </div>
                ${f&&t`<pre class="mono" style="font-size:var(--fs-xs);max-height:16rem;overflow:auto;white-space:pre-wrap;margin:0 var(--sp-5) var(--sp-2);padding:var(--sp-2);background:var(--bg);border-radius:var(--radius-sm, 4px)">${re(e.detail)}</pre>`}
              </div>`})}
          </div>`:E?t`<${h} status="error" error=${E} label="events"/>`:t`<${h} status="empty" emptyTitle="No events for this tool in the selected range"
              emptyHint="Widen the time range in the header, or pick another tool."/>`}
        </div>
      </${P}>`}
    </div>
  </div>`}export{$e as default};
