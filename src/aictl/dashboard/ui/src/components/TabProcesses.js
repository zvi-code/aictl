import { useState, useMemo, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, fmtPct, fmtSz, esc } from '../utils.js';
import ProcRow from './ProcRow.js';

function ProcToolGroup({tool, label, procs, maxMem}) {
  const [isOpen, setOpen] = useState(false);
  const c = COLORS[tool]||'var(--fg2)';
  const totalMem = procs.reduce((a,p)=>a+(parseFloat(p.mem_mb)||0),0);
  const totalCpu = procs.reduce((a,p)=>a+(parseFloat(p.cpu_pct)||0),0);
  const anomCount = procs.filter(p=>p.anomalies&&p.anomalies.length).length;
  const zombieCount = procs.filter(p=>p.zombie_risk&&p.zombie_risk!=='none').length;
  const byType = useMemo(()=>{
    const bt={};
    procs.forEach(p=>{const t=p.process_type||'process';(bt[t]=bt[t]||[]).push(p);});
    return bt;
  },[procs]);
  return html`<div class="cat-group" style=${{marginBottom:'var(--sp-5)'}}>
    <button class=${'cat-head'+(isOpen?' open':'')} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}
      style="padding:var(--sp-4) var(--sp-5);font-size:var(--fs-lg);display:grid;grid-template-columns:0.8rem 0.5rem 1fr auto auto auto auto auto;align-items:center;gap:var(--sp-4)">
      <span class="carrow">\u25B6</span>
      <span class="dot" style=${'background:'+c}></span>
      <strong class="text-ellipsis">${esc(label)}</strong>
      <span class="badge">${procs.length} proc</span>
      <span class="badge text-right" style="min-width:65px">CPU ${fmtPct(totalCpu)}</span>
      <span class="badge text-right" style="min-width:75px">MEM ${fmtSz(totalMem*1048576)}</span>
      ${anomCount>0?html`<span class="badge warn">${anomCount} anomaly</span>`:html`<span></span>`}
      ${zombieCount>0?html`<span class="badge warn">${zombieCount} zombie</span>`:null}
    </button>
    ${isOpen && html`<div style="padding:0 var(--sp-3)">
      ${Object.entries(byType).map(([type,typeProcs])=>{
        const sorted=typeProcs.sort((a,b)=>(parseFloat(b.mem_mb)||0)-(parseFloat(a.mem_mb)||0));
        if(Object.keys(byType).length===1) return sorted.map(p=>html`<${ProcRow} key=${p.pid} proc=${p} maxMem=${maxMem}/>`);
        return html`<div style="margin:var(--sp-3) 0">
          <div class="text-muted" style="font-size:var(--fs-base);padding:var(--sp-1) 0;text-transform:uppercase;letter-spacing:0.03em">${esc(type)}</div>
          ${sorted.map(p=>html`<${ProcRow} key=${p.pid} proc=${p} maxMem=${maxMem}/>`)}
        </div>`;
      })}
    </div>`}
  </div>`;
}

function ProcTreeGroup({tool, label, procs, maxMem}) {
  const [isOpen, setOpen] = useState(false);
  const c = COLORS[tool]||'var(--fg2)';
  const totalMem = procs.reduce((a,p)=>a+(parseFloat(p.mem_mb)||0),0);
  const totalCpu = procs.reduce((a,p)=>a+(parseFloat(p.cpu_pct)||0),0);

  const pidSet = new Set(procs.map(p=>p.pid));
  const children = {};
  const roots = [];
  procs.forEach(p => {
    if(p.ppid && pidSet.has(p.ppid)) {
      (children[p.ppid] = children[p.ppid] || []).push(p);
    } else {
      roots.push(p);
    }
  });

  const renderNode = (p, depth) => {
    const kids = children[p.pid] || [];
    const indent = depth * 1.2;
    return html`<div key=${p.pid}>
      <div class="proc-row" style=${'padding-left:'+indent+'rem'}>
        <span class="mono text-muted" style="min-width:4ch">${p.pid}</span>
        <span class="flex-1 text-ellipsis">${depth>0?'\u2514 ':''}${esc(p.name)}</span>
        <span class="text-right" style="min-width:5ch;color:${p.cpu_pct>5?'var(--orange)':'var(--fg2)'}">${fmtPct(parseFloat(p.cpu_pct)||0)}</span>
        <span class="text-right" style="min-width:6ch">${p.mem_mb?fmtSz(p.mem_mb*1048576):''}</span>
      </div>
      ${kids.map(kid => renderNode(kid, depth+1))}
    </div>`;
  };

  return html`<div class="cat-group" style=${{marginBottom:'var(--sp-5)'}}>
    <button class=${'cat-head'+(isOpen?' open':'')} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}
      style="padding:var(--sp-4) var(--sp-5);font-size:var(--fs-lg);display:grid;grid-template-columns:0.8rem 0.5rem 1fr auto auto auto;align-items:center;gap:var(--sp-4)">
      <span class="carrow">\u25B6</span>
      <span class="dot" style=${'background:'+c}></span>
      <strong class="text-ellipsis">${esc(label)}</strong>
      <span class="badge">${procs.length} proc</span>
      <span class="badge text-right" style="min-width:65px">CPU ${fmtPct(totalCpu)}</span>
      <span class="badge text-right" style="min-width:75px">MEM ${fmtSz(totalMem*1048576)}</span>
    </button>
    ${isOpen && html`<div class="text-sm text-mono" style="padding:var(--sp-1) var(--sp-3)">
      ${roots.sort((a,b)=>(b.cpu_pct||0)-(a.cpu_pct||0)).map(p => renderNode(p, 0))}
    </div>`}
  </div>`;
}

function CoreBars({perCore}) {
  if(!perCore||!perCore.length) return null;
  const maxVal = 100;
  return html`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${perCore.map((pct,i)=>{
      const h = Math.max(1, (pct/maxVal)*100);
      const color = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--orange)' : pct > 20 ? 'var(--green)' : 'var(--fg2)';
      return html`<div key=${i} title=${'Core '+i+': '+fmtPct(pct)}
        style=${'flex:1;min-width:3px;background:'+color+';height:'+h+'%;border-radius:1px;opacity:0.8;transition:height 0.3s'}/>`;
    })}
  </div>`;
}

export default function TabProcesses() {
  const {snap: s} = useContext(SnapContext);
  if(!s) return null;
  const byTool = [];
  s.tools.forEach(t=>{
    const liveProcs = t.live?.processes || [];
    const procs = liveProcs.length > 0 ? liveProcs : t.processes;
    if(procs.length) byTool.push({tool:t.tool, label:t.label, procs, hasTree: liveProcs.length > 0});
  });
  if(!byTool.length) return html`<p class="empty-state">No processes detected.</p>`;
  const allProcs = byTool.flatMap(g=>g.procs);
  const maxMem = Math.max(...allProcs.map(p=>parseFloat(p.mem_mb)||0),100);
  return html`<div>
    ${byTool.map(({tool,label,procs,hasTree})=>
      hasTree
        ? html`<${ProcTreeGroup} key=${tool} tool=${tool} label=${label} procs=${procs} maxMem=${maxMem}/>`
        : html`<${ProcToolGroup} key=${tool} tool=${tool} label=${label} procs=${procs} maxMem=${maxMem}/>`)}
  </div>`;
}

// Export CoreBars for use in app.js
export { CoreBars };
