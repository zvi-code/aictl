import { useState, useMemo, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, VENDOR_LABELS, VENDOR_COLORS, HOST_LABELS, GROUP_MODES, fmtK, esc } from '../utils.js';
import ToolCard from './ToolCard.js';

function ToolGroup({groupKey, groupLabel, groupColor, tools, root}) {
  const [isOpen, setOpen] = useState(true);
  const totalFiles = tools.reduce((a,t)=>a+t.files.length,0);
  const totalTok = tools.reduce((a,t)=>a+t.files.reduce((b,f)=>b+f.tokens,0),0);
  return html`<div class="mb-md">
    <button onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}
      class="flex-row gap-sm cursor-ptr" style="background:none;border:none;padding:var(--sp-3) 0;font:inherit;color:var(--fg);width:100%">
      <span style="font-size:var(--fs-xs);transition:transform 0.15s;${isOpen?'transform:rotate(90deg)':''}">\u25B6</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${groupColor};flex-shrink:0"></span>
      <span class="text-bolder" style="font-size:var(--fs-lg)">${groupLabel}</span>
      <span class="badge">${tools.length} tools</span>
      <span class="badge">${totalFiles} files</span>
      <span class="badge">${fmtK(totalTok)} tok</span>
    </button>
    ${isOpen && html`<div class="tool-grid" style="margin-top:var(--sp-3)">
      ${tools.map(t=>html`<${ToolCard} key=${t.tool} tool=${t} root=${root}/>`)}
    </div>`}
  </div>`;
}

export default function TabOverview() {
  const {snap: s} = useContext(SnapContext);
  const [groupBy, setGroupBy] = useState('product');

  const hasData = t => t.files.length || t.processes.length || t.mcp_servers.length || t.live;
  const sortScore = (a, b) => {
    const scoreA = (a.files.length*2) + a.processes.length + a.mcp_servers.length;
    const scoreB = (b.files.length*2) + b.processes.length + b.mcp_servers.length;
    return scoreB - scoreA || a.tool.localeCompare(b.tool);
  };

  const tools = useMemo(()=>{
    if(!s) return [];
    return s.tools.filter(t=>!t.meta && hasData(t)).sort(sortScore);
  },[s]);

  // project-env has its own dedicated tab — exclude it from Overview entirely
  const metaTools = useMemo(()=>{
    if(!s) return [];
    return s.tools.filter(t=>t.meta && t.tool!=='project-env' && hasData(t)).sort(sortScore);
  },[s]);

  const grouped = useMemo(()=>{
    if(groupBy === 'product' || !tools.length) return null;
    const groups = {};
    tools.forEach(t=>{
      if(groupBy === 'vendor') {
        const key = t.vendor || 'community';
        const label = VENDOR_LABELS[key] || key;
        const color = VENDOR_COLORS[key] || 'var(--fg2)';
        if(!groups[key]) groups[key] = {label, color, tools:[]};
        groups[key].tools.push(t);
      } else {
        const hosts = (t.host||'any').split(',');
        for (const h of hosts) {
          const key = h.trim();
          const label = HOST_LABELS[key] || key;
          const color = 'var(--fg2)';
          if(!groups[key]) groups[key] = {label, color, tools:[]};
          groups[key].tools.push(t);
        }
      }
    });
    return Object.entries(groups).sort((a,b)=>{
      const fa = a[1].tools.reduce((s,t)=>s+t.files.length,0);
      const fb = b[1].tools.reduce((s,t)=>s+t.files.length,0);
      return fb - fa;
    });
  },[tools, groupBy]);

  if(!s) return html`<p class="loading-state">Loading...</p>`;
  if(!tools.length && !metaTools.length) return html`<p class="empty-state">No AI tool resources found.</p>`;

  return html`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${GROUP_MODES.map(m=>html`<button key=${m.id}
        class=${groupBy===m.id?'range-btn active':'range-btn'}
        onClick=${()=>setGroupBy(m.id)}>${m.label}</button>`)}
    </div>
    ${tools.length > 0 && (grouped ? grouped.map(([key, g])=>html`<${ToolGroup} key=${key}
      groupKey=${key} groupLabel=${g.label} groupColor=${g.color}
      tools=${g.tools} root=${s.root}/>`)
    : html`<div class="tool-grid">
        ${tools.map(t=>html`<${ToolCard} key=${t.tool} tool=${t} root=${s.root}/>`)}
      </div>`)}
    ${metaTools.length > 0 && html`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)">▶</span>
        <span>Project Context</span>
        <span class="badge">${metaTools.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${metaTools.map(t=>html`<${ToolCard} key=${t.tool} tool=${t} root=${s.root}/>`)}
      </div>
    </details>`}
  </div>`;
}
