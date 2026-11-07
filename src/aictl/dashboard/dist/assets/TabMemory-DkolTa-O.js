import{x as S,m as s,T as L,d as c,y as G,q as F}from"./index-DyDyJAkK.js";import{S as O,a as I,b as M}from"./app-CcuDFzdW.js";import{L as T,l as V,r as y,v as u,an as j,o as q,B as g,q as H,ad as h}from"./useSse-DFs1a0pz.js";import{T as E}from"./TextView-DRRCCuem.js";function N({mem:e}){var C;const[t,o]=c(!1),[r,n]=c(!1),[a,l]=c(null),[b,x]=c(null),[A,k]=c(!1),d=S(O),z=(e.file||"").replace(/\\/g,"/").split("/").pop(),P=F(async()=>{if(t){o(!1);return}o(!0),k(!0),x(null);try{const i=await q(e.file);l(i)}catch(i){x(i.message)}finally{k(!1)}},[t,e.file]),w=(i,p)=>i.map((v,m)=>s`<span class="pline"><span class="ln">${p+m}</span>${u(v)||" "}</span>`),B=()=>{if(A)return s`<span class="loading-state">Loading...</span>`;if(b)return s`<span class="error-state">${b}</span>`;if(!a)return null;const i=a.split(`
`),p=i.length;if(p<=h*3||r)return s`<${E} text=${a} path=${e.file} source=${s`${w(i,1)}`}/>
        <div class="prev-actions">
          ${r&&s`<button class="prev-btn" onClick=${()=>n(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>d.openViewer(e.file)}>open in viewer</button>
        </div>`;const v=i.slice(-h),m=p-h+1;return s`<${E} text=${a} path=${e.file} source=${s`${w(v,m)}`}/>
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>n(!0)}>show all (${p} lines)</button>
        <button class="prev-btn" onClick=${()=>d.openViewer(e.file)}>open in viewer</button>
      </div>`},_=e.mtime&&Date.now()/1e3-e.mtime<300,f=(C=d.recentFiles)==null?void 0:C.get(e.file),$=!!f;return s`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${P}
      aria-expanded=${t} title=${e.file}>
      ${$?s`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${g(f.ts)}">●</span>`:_?s`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${g(e.mtime)}">●</span>`:s`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${u(z)}</span>
      <span class="fmeta">${H(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${_||$?s` <span style="color:${$?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${g($?f.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${t&&s`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${B()}</div>`}
  </div>`}function D({profile:e,items:t}){const[o,r]=c(t.length<=5),n=t.reduce((a,l)=>a+l.tokens,0);return s`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${o?"mem-profile-head open":"mem-profile-head"} onClick=${()=>r(!o)} aria-expanded=${o}>
      <span class="carrow" aria-hidden="true">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${u(e)}</span>
      <span class="badge">${t.length} files</span>
      <span class="badge">${y(n)} tok</span>
    </button>
    ${o&&s`<div>${t.map(a=>s`<${N} key=${a.file} mem=${a}/>`)}</div>`}
  </div>`}function K({source:e,entries:t}){const[o,r]=c(!1),n=L(()=>{const a={};return t.forEach(l=>{(a[l.profile]=a[l.profile]||[]).push(l)}),Object.entries(a)},[t]);return s`<div class="mem-group">
    <button class=${"mem-group-head"+(o?" open":"")} onClick=${()=>r(!o)} aria-expanded=${o}>
      <span class="carrow" aria-hidden="true">\u25B6</span>
      ${u(j[e]||e)} <span class="badge">${t.length}</span>
      <span class="badge">${y(t.reduce((a,l)=>a+l.tokens,0))} tok</span>
    </button>
    ${o&&s`<div>${n.map(([a,l])=>s`<${D} key=${a} profile=${a} items=${l}/>`)}</div>`}
  </div>`}function J({allToolsOnly:e=!1}){const[t,o]=c(null);if(G(()=>{V().then(n=>{n&&n.ts&&n.ts.length>=2&&o(n)}).catch(()=>{})},[]),!t)return null;const r=t.memory_entries&&t.memory_entries.some(n=>n>0);return s`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth${e?" (all tools: the history has no per-tool split)":""}</div>
    <div class="es-charts">
      <${M} label="Memory Tokens" value=${y(t.mem_tokens[t.mem_tokens.length-1]||0)}
        data=${[t.ts,t.mem_tokens]} chartColor="var(--accent)" smooth />
      ${r&&s`<${M} label="Memory Entries" value=${t.memory_entries[t.memory_entries.length-1]||0}
        data=${[t.ts,t.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function X(){const{snap:e,enabledTools:t=null}=S(O);if(e&&!e.agent_memory.length&&T(t))return s`<${I} enabledTools=${t} snap=${e} what="agent memory"/>`;if(!e||!e.agent_memory.length)return s`<div class="empty-state">
    No agent memory found.
    <small class="empty-state-source">/api/snapshot · agent_memory[]</small>
  </div>`;const o=L(()=>{const r={};return e.agent_memory.forEach(n=>{(r[n.source]=r[n.source]||[]).push(n)}),Object.entries(r)},[e.agent_memory]);return s`<${J} allToolsOnly=${T(t)}/>
    ${o.map(([r,n])=>s`<${K} key=${r} source=${r} entries=${n}/>`)}`}export{X as default};
