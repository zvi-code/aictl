import{x as Q,d as p,T as B,y as I,m as a,k as D}from"./index-C_ub8iES.js";import{S as Y,a as Z,c as ee,T as P,b as m,l as f,P as k,C as se}from"./app-Cf1eevD3.js";import{ap as te,$ as ae,aq as ie,l as ne,L as le,ah as oe,C as de,aj as ce,z as _,q as R,ae as r,G as T,X as re,r as H,ar as ve}from"./useSse-C2BhVkiD.js";const V=60;function ue(s){if(s==null)return String(s);let t;if(typeof s=="object")try{t=JSON.stringify(s)}catch{t=String(s)}else t=String(s);return t.length>V?t.slice(0,V)+"…":t}function pe(s){return!s||typeof s!="object"?s==null?"":String(s):Object.entries(s).map(([t,v])=>t+"="+ue(v)).join(", ")}function $e(s){try{return JSON.stringify(s,null,2)}catch{return String(s)}}const W=500;function me(s,t,v=W){return t!=null?t>s?`Events (newest ${s} of ${t})`:`Events (${t})`:s>=v?`Events (newest ${s}; total not known)`:`Events (${s})`}function he(){var M,N,j;const{snap:s,globalRange:t,enabledTools:v=null}=Q(Y),[S,U]=p(null),[b,E]=p([]),[o,C]=p(null),[q,O]=p(()=>new Set),$=B(()=>s?s.tools.filter(e=>!e.meta&&(e.files.length||e.processes.length||e.live)).sort((e,n)=>e.label.localeCompare(n.label)):[],[s]),d=B(()=>te($.map(e=>e.tool),S),[$,S]),[x,w]=p(null),[F,g]=p(null);I(()=>{!d||!t||(O(new Set),g(null),ae({tool:d,since:t.since,limit:W,until:t.until}).then(e=>{E(e),w(null)}).catch(e=>{E([]),w(e)}),ie({tool:d,since:t.since,until:t.until}).then(e=>g(typeof(e==null?void 0:e.count)=="number"?e.count:null)).catch(()=>g(null)))},[d,t]);const J=e=>{O(n=>{const u=new Set(n);return u.has(e)?u.delete(e):u.add(e),u})};if(I(()=>{!d||!t||ne({since:t.since,tool:d,until:t.until}).then(e=>{var n;return C(((n=e==null?void 0:e.by_tool)==null?void 0:n[d])||null)}).catch(()=>C(null))},[d,t]),!s)return a`<p class="loading-state">Loading...</p>`;if(!$.length&&le(v))return a`<${Z} enabledTools=${v} snap=${s} what="events"/>`;const i=$.find(e=>e.tool===d);if(oe(i,s))return a`<${ee} tool=${i}/>`;const l=(M=s.tool_telemetry)==null?void 0:M.find(e=>e.tool===d),c=i==null?void 0:i.live,X=de[d]||"var(--fg2)",L={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},A=t.until!=null?new Date(t.since*1e3).toLocaleString(void 0,L)+" – "+new Date(t.until*1e3).toLocaleString(void 0,L):"";return a`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${$.map(e=>a`<button key=${e.tool}
        class=${d===e.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>U(e.tool)}>
        <${P} tool=${e.tool} size="1em"/>
        ${e.label}
        ${e.live?a`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${d&&a`<${D}>
        <h3 class="flex-row mb-sm gap-sm">
          <${P} tool=${d} size="1em"/>
          ${(i==null?void 0:i.label)||d}
          ${i!=null&&i.vendor?a`<span class="badge">${ce[i.vendor]||i.vendor}</span>`:""}
          ${l!=null&&l.model?a`<span class="badge mono">${l.model}</span>`:""}
        </h3>

        ${o&&((N=o.ts)==null?void 0:N.length)>=2?a`<div class="es-section">
          <div class="es-section-title">Time Series${A?a` <span class="badge">${A}</span>`:""}</div>
          <div class="es-charts">
            <${m} label="CPU %" value=${((j=i==null?void 0:i.live)==null?void 0:j.cpu_percent)!=null?_(i.live.cpu_percent||0):"-"}
              data=${[o.ts,o.cpu]} chartColor=${X} smooth />
            <${m} label="Memory (MB)" value=${f(i==null?void 0:i.live)!=null?R(f(i.live)*1048576):"-"}
              data=${[o.ts,o.mem_mb]} chartColor="var(--green)" smooth />
            ${Array.isArray(o.tokens)&&a`<${m} label="Context (tok)" value=${r(o.tokens[o.tokens.length-1]||0)}
              data=${[o.ts,o.tokens]} chartColor="var(--accent)" />`}
            ${(c||Array.isArray(o.traffic))&&a`<${m} label="Network (B/s)"
              value=${T(c?(c.outbound_rate_bps||0)+(c.inbound_rate_bps||0):o.traffic[o.traffic.length-1]||0)}
              valColor=${c?"var(--orange)":void 0}
              data=${Array.isArray(o.traffic)?[o.ts,o.traffic]:null} chartColor="var(--orange)" />`}
          </div>
        </div>`:a`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <${k} status="empty" emptyTitle="No samples in this range"
            emptyHint="Widen the time range in the header. Live mode shows samples since this page opened."/>
        </div>`}

        ${l?a`<div class="es-section">
          <div class="es-section-title">Telemetry
            <span class="badge" style="margin-left:var(--sp-3)">${l.source}</span>
            <span class="badge">${_(l.confidence*100)}</span>
            ${l.as_of?a`<span class="badge" data-testid="telemetry-as-of" title="This source is a cache; it was last computed on this date, so later usage is not in these totals.">as of ${l.as_of}</span>`:""}
          </div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${r(l.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${r(l.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${r(l.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${r(l.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${H(l.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${H(l.total_messages||0)}</div></div>
            <div class="es-kv-card" title=${re}><div class="label">Est. cost</div><div class="value"><${se} row=${l}/></div></div>
          </div>
          ${Object.keys(l.by_model||{}).length>0&&a`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(l.by_model).map(([e,n])=>a`<div key=${e}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${e}</span>
              <span>in: ${r(n.input||n.input_tokens||0)} tok \u00B7 out: ${r(n.output||n.output_tokens||0)} tok${n.cache_read_tokens?" · cR:"+r(n.cache_read_tokens):""}${n.cache_creation_tokens?" · cW:"+r(n.cache_creation_tokens):""}${n.cost_usd?" · $"+n.cost_usd.toFixed(2):""}</span>
            </div>`)}
          </div>`}
        </div>`:""}

        ${c?a`<div class="es-section">
          <div class="es-section-title">Live Monitor</div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${c.session_count||0}</div></div>
            <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${c.pid_count||0}</div></div>
            <div class="es-kv-card"><div class="label">CPU</div><div class="value">${_(c.cpu_percent||0)}</div></div>
            <div class="es-kv-card"><div class="label">Memory</div><div class="value">${f(c)!=null?R(f(c)*1048576):"n/a"}</div></div>
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${T(c.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${T(c.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">${me(b.length,F)}</div>
          ${b.length?a`<div class="es-feed">
            ${b.map((e,n)=>{const u=ve[e.kind]||"var(--fg2)",G=new Date(e.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),z=pe(e.detail),K=e.detail!=null&&(typeof e.detail!="object"||Object.keys(e.detail).length>0),h=e.ts+"-"+e.tool+"-"+n,y=q.has(h);return a`<div key=${h}>
                <div class="es-event">
                  <span class="es-event-time">${G}</span>
                  <span class="es-event-kind" style="color:${u}">${e.kind}</span>
                  ${K?a`<button type="button" class="es-event-detail"
                        aria-expanded=${y?"true":"false"}
                        title=${z}
                        onClick=${()=>J(h)}
                        style="background:none;border:none;padding:0;cursor:pointer;color:var(--fg2);font-size:var(--fs-sm);text-align:left;font-family:inherit">
                        <span style="display:inline-block;width:1em" aria-hidden="true">${y?"˅":"›"}</span>${z}
                      </button>`:a`<span class="es-event-detail">-</span>`}
                </div>
                ${y&&a`<pre class="mono" style="font-size:var(--fs-xs);max-height:16rem;overflow:auto;white-space:pre-wrap;margin:0 var(--sp-5) var(--sp-2);padding:var(--sp-2);background:var(--bg);border-radius:var(--radius-sm, 4px)">${$e(e.detail)}</pre>`}
              </div>`})}
          </div>`:x?a`<${k} status="error" error=${x} label="events"/>`:a`<${k} status="empty" emptyTitle="No events for this tool in the selected range"
              emptyHint="Widen the time range in the header, or pick another tool."/>`}
        </div>
      </${D}>`}
    </div>
  </div>`}export{he as default,me as eventsHeading};
