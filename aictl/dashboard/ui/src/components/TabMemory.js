import { useState, useEffect, useMemo, useCallback, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, fmtSz, fmtAgo, esc, fileCache, fetchFileContent, MEM_LABELS, TAIL_LINES } from '../utils.js';
import ChartCard from './ChartCard.js';

function MemItem({mem}) {
  const [showPreview, setShowPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const ctx = useContext(SnapContext);
  const name = (mem.file||'').replace(/\\/g,'/').split('/').pop();
  const toggle = useCallback(async ()=>{
    if(showPreview) { setShowPreview(false); return; }
    setShowPreview(true);
    if(fileCache.has(mem.file)) { setText(fileCache.get(mem.file)); return; }
    setLoading(true); setError(null);
    try { const t=await fetchFileContent(mem.file); setText(t); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  },[showPreview, mem.file]);
  const numbered = (arr, start) => arr.map((l,i)=>
    html`<span class="pline"><span class="ln">${start+i}</span>${esc(l)||' '}</span>`);
  const renderPreview = () => {
    if(loading) return html`<span class="loading-state">Loading...</span>`;
    if(error) return html`<span class="error-state">${error}</span>`;
    if(!text) return null;
    const lines = text.split('\n'), total = lines.length;
    if(total<=TAIL_LINES*3||expanded) {
      return html`${numbered(lines,1)}
        <div class="prev-actions">
          ${expanded && html`<button class="prev-btn" onClick=${()=>setExpanded(false)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>ctx.openViewer(mem.file)}>open in viewer</button>
        </div>`;
    }
    const tail=lines.slice(-TAIL_LINES), tailStart=total-TAIL_LINES+1;
    return html`${numbered(tail,tailStart)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>setExpanded(true)}>show all (${total} lines)</button>
        <button class="prev-btn" onClick=${()=>ctx.openViewer(mem.file)}>open in viewer</button>
      </div>`;
  };
  const recentMod = mem.mtime && (Date.now()/1000 - mem.mtime) < 300;
  const liveActivity = ctx.recentFiles?.get(mem.file);
  const isLiveActive = !!liveActivity;
  return html`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${toggle}
      aria-expanded=${showPreview} title=${mem.file}>
      ${isLiveActive
        ? html`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${fmtAgo(liveActivity.ts)}">●</span>`
        : recentMod
        ? html`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${fmtAgo(mem.mtime)}">●</span>`
        : html`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${esc(name)}</span>
      <span class="fmeta">${fmtSz(mem.tokens*4)} ${mem.tokens}tok ${mem.lines}ln${recentMod || isLiveActive ? html` <span style="color:${isLiveActive?'var(--green)':'var(--orange)'};font-size:var(--fs-sm)">${fmtAgo(isLiveActive ? liveActivity.ts : mem.mtime)}</span>` : ''}</span>
    </button>
    ${showPreview && html`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${renderPreview()}</div>`}
  </div>`;
}

function MemProfileGroup({profile, items}) {
  const [isOpen, setOpen] = useState(items.length<=5);
  const profTok = items.reduce((a,m)=>a+m.tokens,0);
  return html`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${isOpen?'mem-profile-head open':'mem-profile-head'} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${profile}>${esc(profile)}</span>
      <span class="badge">${items.length} files</span>
      <span class="badge">${fmtK(profTok)} tok</span>
    </button>
    ${isOpen && html`<div>${items.map(m=>html`<${MemItem} key=${m.file} mem=${m}/>`)}</div>`}
  </div>`;
}

function MemSourceGroup({source, entries}) {
  const [isOpen, setOpen] = useState(false);
  const byProfile = useMemo(()=>{
    const bp={};
    entries.forEach(m=>{(bp[m.profile]=bp[m.profile]||[]).push(m);});
    return Object.entries(bp);
  },[entries]);
  return html`<div class="mem-group">
    <button class=${'mem-group-head'+(isOpen?' open':'')} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}>
      <span class="carrow">\u25B6</span>
      ${esc(MEM_LABELS[source]||source)} <span class="badge">${entries.length}</span>
      <span class="badge">${fmtK(entries.reduce((a,m)=>a+m.tokens,0))} tok</span>
    </button>
    ${isOpen && html`<div>${byProfile.map(([prof,items])=>
      html`<${MemProfileGroup} key=${prof} profile=${prof} items=${items}/>`)}</div>`}
  </div>`;
}

// ─── 5.3 Memory Growth Chart ───────────────────────────────────
function MemoryGrowthChart() {
  const [hist, setHist] = useState(null);
  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(data => {
        if (data && data.ts && data.ts.length >= 2) setHist(data);
      })
      .catch(() => {});
  }, []);
  if (!hist) return null;
  const hasME = hist.memory_entries && hist.memory_entries.some(v => v > 0);
  return html`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${ChartCard} label="Memory Tokens" value=${fmtK(hist.mem_tokens[hist.mem_tokens.length - 1] || 0)}
        data=${[hist.ts, hist.mem_tokens]} chartColor="var(--accent)" smooth />
      ${hasME && html`<${ChartCard} label="Memory Entries" value=${hist.memory_entries[hist.memory_entries.length - 1] || 0}
        data=${[hist.ts, hist.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`;
}

export default function TabMemory() {
  const {snap: s} = useContext(SnapContext);
  if(!s||!s.agent_memory.length) return html`<p class="empty-state">No agent memory found.</p>`;
  const groups = useMemo(()=>{
    const g={};
    s.agent_memory.forEach(m=>{(g[m.source]=g[m.source]||[]).push(m);});
    return Object.entries(g);
  },[s.agent_memory]);
  return html`<${MemoryGrowthChart}/>
    ${groups.map(([src,entries])=>
    html`<${MemSourceGroup} key=${src} source=${src} entries=${entries}/>`)}`;
}
