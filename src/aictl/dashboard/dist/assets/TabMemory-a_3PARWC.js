import{x as E,S,m as s,T as L,d as l,y as P,w as G,z as _,b,e as d,M as B,q as I,c as j,h as g,a as F,i as h}from"./index-D-7_bwBz.js";function H({mem:e}){var M;const[a,t]=l(!1),[n,c]=l(!1),[o,r]=l(null),[y,k]=l(null),[z,x]=l(!1),$=E(S),A=(e.file||"").replace(/\\/g,"/").split("/").pop(),O=I(async()=>{if(a){t(!1);return}t(!0),x(!0),k(null);try{const i=await j(e.file);r(i)}catch(i){k(i.message)}finally{x(!1)}},[a,e.file]),w=(i,p)=>i.map((v,m)=>s`<span class="pline"><span class="ln">${p+m}</span>${d(v)||" "}</span>`),T=()=>{if(z)return s`<span class="loading-state">Loading...</span>`;if(y)return s`<span class="error-state">${y}</span>`;if(!o)return null;const i=o.split(`
`),p=i.length;if(p<=h*3||n)return s`${w(i,1)}
        <div class="prev-actions">
          ${n&&s`<button class="prev-btn" onClick=${()=>c(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>$.openViewer(e.file)}>open in viewer</button>
        </div>`;const v=i.slice(-h),m=p-h+1;return s`${w(v,m)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>c(!0)}>show all (${p} lines)</button>
        <button class="prev-btn" onClick=${()=>$.openViewer(e.file)}>open in viewer</button>
      </div>`},C=e.mtime&&Date.now()/1e3-e.mtime<300,f=(M=$.recentFiles)==null?void 0:M.get(e.file),u=!!f;return s`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${O}
      aria-expanded=${a} title=${e.file}>
      ${u?s`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${g(f.ts)}">●</span>`:C?s`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${g(e.mtime)}">●</span>`:s`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${d(A)}</span>
      <span class="fmeta">${F(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${C||u?s` <span style="color:${u?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${g(u?f.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${a&&s`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${T()}</div>`}
  </div>`}function N({profile:e,items:a}){const[t,n]=l(a.length<=5),c=a.reduce((o,r)=>o+r.tokens,0);return s`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${t?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!t)} aria-expanded=${t}>
      <span class="carrow" aria-hidden="true">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${d(e)}</span>
      <span class="badge">${a.length} files</span>
      <span class="badge">${b(c)} tok</span>
    </button>
    ${t&&s`<div>${a.map(o=>s`<${H} key=${o.file} mem=${o}/>`)}</div>`}
  </div>`}function V({source:e,entries:a}){const[t,n]=l(!1),c=L(()=>{const o={};return a.forEach(r=>{(o[r.profile]=o[r.profile]||[]).push(r)}),Object.entries(o)},[a]);return s`<div class="mem-group">
    <button class=${"mem-group-head"+(t?" open":"")} onClick=${()=>n(!t)} aria-expanded=${t}>
      <span class="carrow" aria-hidden="true">\u25B6</span>
      ${d(B[e]||e)} <span class="badge">${a.length}</span>
      <span class="badge">${b(a.reduce((o,r)=>o+r.tokens,0))} tok</span>
    </button>
    ${t&&s`<div>${c.map(([o,r])=>s`<${N} key=${o} profile=${o} items=${r}/>`)}</div>`}
  </div>`}function q(){const[e,a]=l(null);if(P(()=>{G().then(n=>{n&&n.ts&&n.ts.length>=2&&a(n)}).catch(()=>{})},[]),!e)return null;const t=e.memory_entries&&e.memory_entries.some(n=>n>0);return s`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${_} label="Memory Tokens" value=${b(e.mem_tokens[e.mem_tokens.length-1]||0)}
        data=${[e.ts,e.mem_tokens]} chartColor="var(--accent)" smooth />
      ${t&&s`<${_} label="Memory Entries" value=${e.memory_entries[e.memory_entries.length-1]||0}
        data=${[e.ts,e.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function K(){const{snap:e}=E(S);if(!e||!e.agent_memory.length)return s`<div class="empty-state">
    No agent memory found.
    <small class="empty-state-source">/api/snapshot · agent_memory[]</small>
  </div>`;const a=L(()=>{const t={};return e.agent_memory.forEach(n=>{(t[n.source]=t[n.source]||[]).push(n)}),Object.entries(t)},[e.agent_memory]);return s`<${q}/>
    ${a.map(([t,n])=>s`<${V} key=${t} source=${t} entries=${n}/>`)}`}export{K as default};
