import { useState, useEffect, useMemo, useRef, useCallback } from 'preact/hooks';
import { useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtSz, fmtK, esc, fetchFileContent, PREVIEW_LINES } from '../utils.js';

export default function FileViewer({path, onClose}) {
  const {snap: s} = useContext(SnapContext);
  const [text, setText] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  // Resize state
  const [width, setWidth] = useState(() => {
    try { return parseInt(localStorage.getItem('aictl-viewer-width')) || 55; } catch { return 55; }
  });
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback(e => {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    e.preventDefault();
  }, [width]);

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;  // drag left = wider
      const vw = window.innerWidth;
      const newW = Math.min(90, Math.max(20, startW.current + (delta / vw * 100)));
      setWidth(newW);
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        try { localStorage.setItem('aictl-viewer-width', String(Math.round(width))); } catch {}
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [width]);

  // Focus trap: capture focus on open, restore on close
  useEffect(()=>{
    if(!path) return;
    previousFocus.current = document.activeElement;
    const timer = setTimeout(()=>{
      const close = dialogRef.current?.querySelector('button');
      if(close) close.focus();
    }, 50);
    const trapFocus = e => {
      if(e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if(!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length-1];
      if(e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trapFocus);
    return ()=>{
      clearTimeout(timer);
      document.removeEventListener('keydown', trapFocus);
      if(previousFocus.current && previousFocus.current.focus) previousFocus.current.focus();
    };
  },[path]);

  useEffect(()=>{
    if(!path) return;
    setExpanded(false); setError(null);
    fetchFileContent(path).then(setText).catch(e=>setError(e.message));
  },[path]);
  if(!path) return null;
  const meta = useMemo(()=>{
    if(!s) return '';
    for(const t of s.tools) for(const f of t.files) if(f.path===path)
      return (f.kind||'')+' | '+fmtSz(f.size)+' | ~'+fmtK(f.tokens)+'tok | scope:'+(f.scope||'?')+' | sent_to_llm:'+(f.sent_to_llm||'?')+' | loaded:'+(f.loaded_when||'?');
    for(const m of s.agent_memory) if(m.file===path)
      return m.source+' | '+m.profile+' | '+m.tokens+'tok | '+m.lines+'ln';
    return '';
  },[s,path]);
  const lines = text ? text.split('\n') : [];
  const total = lines.length;
  const canCollapse = total > PREVIEW_LINES*2;
  const buildLines = (arr, start) => arr.map((line,i)=>
    html`<div class="fv-line"><span class="fv-ln">${start+i}</span><span class="fv-code">${esc(line)||' '}</span></div>`);
  return html`<div class="fv" ref=${dialogRef} role="dialog" aria-modal="true" aria-label="File viewer" style=${'width:'+width+'vw'}>
    <div class="file-viewer__resize-handle" onMouseDown=${onMouseDown}/>
    <div class="fv-head">
      <span class="path">${path}</span>
      <button onClick=${onClose} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${meta}</div>
    <div class="fv-body">
      ${error ? html`<p class="text-red" style="padding:var(--sp-10)">${error}</p>` :
        !text ? html`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>` :
        (!canCollapse||expanded) ?
          html`<div class="fv-lines">${buildLines(lines,1)}</div>` :
          html`<div class="fv-lines">${buildLines(lines.slice(0,PREVIEW_LINES),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>setExpanded(true)}>\u25BC ${total-PREVIEW_LINES*2} more lines \u25BC</div>
            <div class="fv-lines">${buildLines(lines.slice(-PREVIEW_LINES),total-PREVIEW_LINES+1)}</div>`}
    </div>
    <div class="fv-toolbar">
      <span>${total} lines${canCollapse&&!expanded?' (showing '+PREVIEW_LINES*2+' of '+total+')':''}</span>
      ${canCollapse && html`<button onClick=${()=>setExpanded(!expanded)}>${expanded?'Collapse':'Show all'}</button>`}
    </div>
  </div>`;
}
