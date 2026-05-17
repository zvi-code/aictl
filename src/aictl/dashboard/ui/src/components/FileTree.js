import { useState, useMemo, useCallback, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import {
  fmtK, fmtSz, fmtAgo, esc, s2lColor, groupByDir, fetchFileContent,
  TAIL_LINES,
} from '../utils.js';

// ─── FileItem Component ────────────────────────────────────────
function FileItem({file, dirPrefix}) {
  const [showPreview, setShowPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const ctx = useContext(SnapContext);
  const name = (file.path||'').replace(/\\/g,'/').split('/').pop();
  const s2l = (file.sent_to_llm||'').toLowerCase();
  const recentlyModified = file.mtime && (Date.now()/1000 - file.mtime) < 300;
  const liveActivity = ctx.recentFiles?.get(file.path);
  const isLiveActive = !!liveActivity;
  const toggle = useCallback(async ()=>{
    if(showPreview) { setShowPreview(false); return; }
    setShowPreview(true);
    setLoading(true); setError(null);
    try { const t=await fetchFileContent(file.path); setText(t); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  },[showPreview, file.path]);
  const numbered = (arr, start) => arr.map((l,i)=>
    html`<span class="pline"><span class="ln">${start+i}</span>${esc(l)||' '}</span>`);
  const renderPreview = () => {
    if(loading) return html`<span class="text-muted">loading...</span>`;
    if(error) return html`<span class="text-red">${error}</span>`;
    if(!text) return null;
    const lines = text.split('\n'), total = lines.length;
    const isSmall = total <= TAIL_LINES*3;
    if(isSmall || expanded) {
      return html`${numbered(lines,1)}
        <div class="prev-actions">
          ${expanded && html`<button class="prev-btn" onClick=${()=>setExpanded(false)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>ctx.openViewer(file.path)}>open in viewer</button>
        </div>`;
    }
    const tail = lines.slice(-TAIL_LINES), tailStart = total-TAIL_LINES+1;
    return html`${numbered(tail,tailStart)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>setExpanded(true)}>show all (${total} lines)</button>
        <button class="prev-btn" onClick=${()=>ctx.openViewer(file.path)}>open in viewer</button>
      </div>`;
  };
  const estLines = file.size > 0 ? Math.round(file.size / 60) : 0;
  return html`<div>
    <button class="fitem" onClick=${toggle} aria-expanded=${showPreview} title=${file.path}>
      ${isLiveActive
        ? html`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${fmtAgo(liveActivity.ts)}${liveActivity.growth>0?' +'+fmtSz(liveActivity.growth):''}">●</span>`
        : recentlyModified
        ? html`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${fmtAgo(file.mtime)}">●</span>`
        : html`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${dirPrefix ? html`<span class="text-muted">${dirPrefix}/</span>` : ''}${esc(name)}</span>
      <span class="fmeta">
        ${s2l && s2l!=='no' && html`<span style="color:${s2lColor(s2l)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${s2l}">${s2l==='yes'?'\u25C6':s2l==='on-demand'?'\u25C7':'\u25CB'}</span>`}
        ${fmtSz(file.size)}${estLines ? html` <span class="text-muted">${estLines}ln</span>` : ''}${file.tokens ? html` <span class="text-muted">${fmtK(file.tokens)}t</span>` : ''}
        ${file.mtime && recentlyModified ? html` <span class="text-orange text-xs">${fmtAgo(file.mtime)}</span>` : ''}
      </span>
    </button>
    ${showPreview && html`<div class="inline-preview">${renderPreview()}</div>`}
  </div>`;
}

// ─── DirGroup Component ────────────────────────────────────────
function DirGroup({dir, files}) {
  const [isOpen, setOpen] = useState(false);
  const dirTok = files.reduce((a,f)=>a+f.tokens,0);
  const dirSz = files.reduce((a,f)=>a+f.size,0);
  return html`<div class="cat-group" style=${{marginLeft:'var(--sp-5)'}}>
    <button class=${isOpen?'mem-profile-head open':'mem-profile-head'} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-muted" title=${dir}>${esc(dir)}</span>
      <span class="badge">${files.length}</span>
      <span class="badge">${fmtSz(dirSz)}</span>
      <span class="badge">${fmtK(dirTok)}t</span>
    </button>
    ${isOpen && html`<div style=${{paddingLeft:'var(--sp-8)'}}>${files.map(f=>html`<${FileItem} key=${f.path} file=${f}/>`)}</div>`}
  </div>`;
}

// ─── CatGroup Component ───────────────────────────────────────
export default function CatGroup({label, files, root, badge, style, startOpen}) {
  const [isOpen, setOpen] = useState(!!startOpen);
  const dirGroups = useMemo(()=>groupByDir(files,root),[files,root]);
  const totalTok = useMemo(()=>files.reduce((a,f)=>a+f.tokens,0),[files]);
  const totalSz = useMemo(()=>files.reduce((a,f)=>a+f.size,0),[files]);
  const dominantS2l = useMemo(()=>{
    const counts={};
    files.forEach(f=>{const v=(f.sent_to_llm||'no').toLowerCase();counts[v]=(counts[v]||0)+1;});
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'no';
  },[files]);
  const renderFiles = () => {
    if(dirGroups.length===1 && dirGroups[0][1].length<=3) {
      return dirGroups[0][1].map(f=>html`<${FileItem} key=${f.path} file=${f}/>`);
    }
    return dirGroups.map(([dir, dfiles])=>{
      if(dfiles.length===1) {
        return html`<div style=${{marginLeft:'var(--sp-5)'}}><${FileItem} key=${dfiles[0].path} file=${dfiles[0]} dirPrefix=${dir}/></div>`;
      }
      return html`<${DirGroup} key=${dir} dir=${dir} files=${dfiles}/>`;
    });
  };
  return html`<div class="cat-group" style=${style||''}>
    <button class=${'cat-head'+(isOpen?' open':'')} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${s2lColor(dominantS2l)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${dominantS2l}"></span>
      <span class="cat-label" title=${label}>${esc(label)}</span>
      <span class="badge" style="flex-shrink:0">${badge||files.length}</span>
      <span class="badge">${fmtSz(totalSz)}</span>
      <span class="badge">${fmtK(totalTok)}t</span>
    </button>
    ${isOpen && html`<div style=${{paddingLeft:'var(--sp-8)'}}>${renderFiles()}</div>`}
  </div>`;
}
