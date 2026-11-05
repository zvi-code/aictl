import{x as U,S as F,d as p,T as K,y as f,D as X,w as q,m as t,t as G,E as Q,n as Y,p as D,F as M,V as Z,z as $,f as h,a as P,j as v,k,P as y,J as ee,C as se,b as R,K as te}from"./index-D-7_bwBz.js";const I=60;function ae(s){if(s==null)return String(s);let i;if(typeof s=="object")try{i=JSON.stringify(s)}catch{i=String(s)}else i=String(s);return i.length>I?i.slice(0,I)+"…":i}function ie(s){return!s||typeof s!="object"?s==null?"":String(s):Object.entries(s).map(([i,n])=>i+"="+ae(n)).join(", ")}function le(s){try{return JSON.stringify(s,null,2)}catch{return String(s)}}function oe(){var L,j,N,z;const{snap:s,globalRange:i}=U(F),[n,_]=p(null),[m,S]=p([]),[d,C]=p(null),[V,E]=p(()=>new Set),u=K(()=>s?s.tools.filter(e=>!e.meta&&(e.files.length||e.processes.length||e.live)).sort((e,l)=>e.label.localeCompare(l.label)):[],[s]);f(()=>{!n&&u.length&&_(u[0].tool)},[u,n]);const[T,O]=p(null);f(()=>{!n||!i||(E(new Set),X({tool:n,since:i.since,limit:500,until:i.until}).then(e=>{S(e),O(null)}).catch(e=>{S([]),O(e)}))},[n,i]);const A=e=>{E(l=>{const r=new Set(l);return r.has(e)?r.delete(e):r.add(e),r})};if(f(()=>{!n||!i||q({since:i.since,tool:n,until:i.until}).then(e=>{var l;return C(((l=e==null?void 0:e.by_tool)==null?void 0:l[n])||null)}).catch(()=>C(null))},[n,i]),!s)return t`<p class="loading-state">Loading...</p>`;const a=u.find(e=>e.tool===n);if(G(a,s))return t`<${Q} tool=${a}/>`;const o=(L=s.tool_telemetry)==null?void 0:L.find(e=>e.tool===n),c=a==null?void 0:a.live,H=Y[n]||"var(--fg2)",x={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},w=i.until!=null?new Date(i.since*1e3).toLocaleString(void 0,x)+" – "+new Date(i.until*1e3).toLocaleString(void 0,x):"";return t`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${u.map(e=>t`<button key=${e.tool}
        class=${n===e.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>_(e.tool)}>
        <${D} tool=${e.tool} size="1em"/>
        ${e.label}
        ${e.live?t`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${n&&t`<${M}>
        <h3 class="flex-row mb-sm gap-sm">
          <${D} tool=${n} size="1em"/>
          ${(a==null?void 0:a.label)||n}
          ${a!=null&&a.vendor?t`<span class="badge">${Z[a.vendor]||a.vendor}</span>`:""}
          ${o!=null&&o.model?t`<span class="badge mono">${o.model}</span>`:""}
        </h3>

        ${d&&((j=d.ts)==null?void 0:j.length)>=2?t`<div class="es-section">
          <div class="es-section-title">Time Series${w?t` <span class="badge">${w}</span>`:""}</div>
          <div class="es-charts">
            <${$} label="CPU %" value=${((N=a==null?void 0:a.live)==null?void 0:N.cpu_percent)!=null?h(a.live.cpu_percent||0):"-"}
              data=${[d.ts,d.cpu]} chartColor=${H} smooth />
            <${$} label="Memory (MB)" value=${((z=a==null?void 0:a.live)==null?void 0:z.mem_mb)!=null?P((a.live.mem_mb||0)*1048576):"-"}
              data=${[d.ts,d.mem_mb]} chartColor="var(--green)" smooth />
            <${$} label="Context (tok)" value=${v(d.tokens[d.tokens.length-1]||0)}
              data=${[d.ts,d.tokens]} chartColor="var(--accent)" />
            <${$} label="Network (B/s)"
              value=${k(c?(c.outbound_rate_bps||0)+(c.inbound_rate_bps||0):d.traffic[d.traffic.length-1]||0)}
              valColor=${c?"var(--orange)":void 0}
              data=${[d.ts,d.traffic]} chartColor="var(--orange)" />
          </div>
        </div>`:t`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <${y} status="empty" emptyTitle="No samples in this range"
            emptyHint="Widen the time range in the header. Live mode shows samples since this page opened."/>
        </div>`}

        ${o?t`<div class="es-section">
          <div class="es-section-title">Telemetry
            <span class="badge" style="margin-left:var(--sp-3)">${o.source}</span>
            <span class="badge">${h(o.confidence*100)}</span>
          </div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${v(o.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${v(o.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${v(o.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${v(o.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${R(o.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${R(o.total_messages||0)}</div></div>
            <div class="es-kv-card" title=${ee}><div class="label">Est. cost</div><div class="value"><${se} row=${o}/></div></div>
          </div>
          ${Object.keys(o.by_model||{}).length>0&&t`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(o.by_model).map(([e,l])=>t`<div key=${e}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${e}</span>
              <span>in: ${v(l.input||l.input_tokens||0)} tok \u00B7 out: ${v(l.output||l.output_tokens||0)} tok${l.cache_read_tokens?" · cR:"+v(l.cache_read_tokens):""}${l.cache_creation_tokens?" · cW:"+v(l.cache_creation_tokens):""}${l.cost_usd?" · $"+l.cost_usd.toFixed(2):""}</span>
            </div>`)}
          </div>`}
        </div>`:""}

        ${c?t`<div class="es-section">
          <div class="es-section-title">Live Monitor</div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${c.session_count||0}</div></div>
            <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${c.pid_count||0}</div></div>
            <div class="es-kv-card"><div class="label">CPU</div><div class="value">${h(c.cpu_percent||0)}</div></div>
            <div class="es-kv-card"><div class="label">Memory</div><div class="value">${P((c.mem_mb||0)*1048576)}</div></div>
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${k(c.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${k(c.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">Events (${m.length})</div>
          ${m.length?t`<div class="es-feed">
            ${m.map((e,l)=>{const r=te[e.kind]||"var(--fg2)",W=new Date(e.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),B=ie(e.detail),J=e.detail!=null&&(typeof e.detail!="object"||Object.keys(e.detail).length>0),b=e.ts+"-"+e.tool+"-"+l,g=V.has(b);return t`<div key=${b}>
                <div class="es-event">
                  <span class="es-event-time">${W}</span>
                  <span class="es-event-kind" style="color:${r}">${e.kind}</span>
                  ${J?t`<button type="button" class="es-event-detail"
                        aria-expanded=${g?"true":"false"}
                        title=${B}
                        onClick=${()=>A(b)}
                        style="background:none;border:none;padding:0;cursor:pointer;color:var(--fg2);font-size:var(--fs-sm);text-align:left;font-family:inherit">
                        <span style="display:inline-block;width:1em" aria-hidden="true">${g?"˅":"›"}</span>${B}
                      </button>`:t`<span class="es-event-detail">-</span>`}
                </div>
                ${g&&t`<pre class="mono" style="font-size:var(--fs-xs);max-height:16rem;overflow:auto;white-space:pre-wrap;margin:0 var(--sp-5) var(--sp-2);padding:var(--sp-2);background:var(--bg);border-radius:var(--radius-sm, 4px)">${le(e.detail)}</pre>`}
              </div>`})}
          </div>`:T?t`<${y} status="error" error=${T} label="events"/>`:t`<${y} status="empty" emptyTitle="No events for this tool in the selected range"
              emptyHint="Widen the time range in the header, or pick another tool."/>`}
        </div>
      </${M}>`}
    </div>
  </div>`}export{oe as default};
