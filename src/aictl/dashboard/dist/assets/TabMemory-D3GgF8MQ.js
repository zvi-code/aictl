import{x as T,S,w as M,z as B,m as t,T as L,d as c,y as G,B as F,D as E,b as y,e as d,M as I,q as j,c as D,h as g,a as H,i as h}from"./index-Br-2tUvY.js";function N({mem:e}){var C;const[s,a]=c(!1),[r,n]=c(!1),[o,l]=c(null),[b,k]=c(null),[O,x]=c(!1),$=T(S),z=(e.file||"").replace(/\\/g,"/").split("/").pop(),A=j(async()=>{if(s){a(!1);return}a(!0),x(!0),k(null);try{const i=await D(e.file);l(i)}catch(i){k(i.message)}finally{x(!1)}},[s,e.file]),w=(i,p)=>i.map((v,m)=>t`<span class="pline"><span class="ln">${p+m}</span>${d(v)||" "}</span>`),P=()=>{if(O)return t`<span class="loading-state">Loading...</span>`;if(b)return t`<span class="error-state">${b}</span>`;if(!o)return null;const i=o.split(`
`),p=i.length;if(p<=h*3||r)return t`${w(i,1)}
        <div class="prev-actions">
          ${r&&t`<button class="prev-btn" onClick=${()=>n(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>$.openViewer(e.file)}>open in viewer</button>
        </div>`;const v=i.slice(-h),m=p-h+1;return t`${w(v,m)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>n(!0)}>show all (${p} lines)</button>
        <button class="prev-btn" onClick=${()=>$.openViewer(e.file)}>open in viewer</button>
      </div>`},_=e.mtime&&Date.now()/1e3-e.mtime<300,f=(C=$.recentFiles)==null?void 0:C.get(e.file),u=!!f;return t`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${A}
      aria-expanded=${s} title=${e.file}>
      ${u?t`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${g(f.ts)}">●</span>`:_?t`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${g(e.mtime)}">●</span>`:t`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${d(z)}</span>
      <span class="fmeta">${H(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${_||u?t` <span style="color:${u?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${g(u?f.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${s&&t`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${P()}</div>`}
  </div>`}function V({profile:e,items:s}){const[a,r]=c(s.length<=5),n=s.reduce((o,l)=>o+l.tokens,0);return t`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${a?"mem-profile-head open":"mem-profile-head"} onClick=${()=>r(!a)} aria-expanded=${a}>
      <span class="carrow" aria-hidden="true">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${d(e)}</span>
      <span class="badge">${s.length} files</span>
      <span class="badge">${y(n)} tok</span>
    </button>
    ${a&&t`<div>${s.map(o=>t`<${N} key=${o.file} mem=${o}/>`)}</div>`}
  </div>`}function q({source:e,entries:s}){const[a,r]=c(!1),n=L(()=>{const o={};return s.forEach(l=>{(o[l.profile]=o[l.profile]||[]).push(l)}),Object.entries(o)},[s]);return t`<div class="mem-group">
    <button class=${"mem-group-head"+(a?" open":"")} onClick=${()=>r(!a)} aria-expanded=${a}>
      <span class="carrow" aria-hidden="true">\u25B6</span>
      ${d(I[e]||e)} <span class="badge">${s.length}</span>
      <span class="badge">${y(s.reduce((o,l)=>o+l.tokens,0))} tok</span>
    </button>
    ${a&&t`<div>${n.map(([o,l])=>t`<${V} key=${o} profile=${o} items=${l}/>`)}</div>`}
  </div>`}function K({allToolsOnly:e=!1}){const[s,a]=c(null);if(G(()=>{F().then(n=>{n&&n.ts&&n.ts.length>=2&&a(n)}).catch(()=>{})},[]),!s)return null;const r=s.memory_entries&&s.memory_entries.some(n=>n>0);return t`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth${e?" (all tools: the history has no per-tool split)":""}</div>
    <div class="es-charts">
      <${E} label="Memory Tokens" value=${y(s.mem_tokens[s.mem_tokens.length-1]||0)}
        data=${[s.ts,s.mem_tokens]} chartColor="var(--accent)" smooth />
      ${r&&t`<${E} label="Memory Entries" value=${s.memory_entries[s.memory_entries.length-1]||0}
        data=${[s.ts,s.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function Q(){const{snap:e,enabledTools:s=null}=T(S);if(e&&!e.agent_memory.length&&M(s))return t`<${B} enabledTools=${s} snap=${e} what="agent memory"/>`;if(!e||!e.agent_memory.length)return t`<div class="empty-state">
    No agent memory found.
    <small class="empty-state-source">/api/snapshot · agent_memory[]</small>
  </div>`;const a=L(()=>{const r={};return e.agent_memory.forEach(n=>{(r[n.source]=r[n.source]||[]).push(n)}),Object.entries(r)},[e.agent_memory]);return t`<${K} allToolsOnly=${M(s)}/>
    ${a.map(([r,n])=>t`<${q} key=${r} source=${r} entries=${n}/>`)}`}export{Q as default};
