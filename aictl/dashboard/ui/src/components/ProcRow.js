import { html } from 'htm/preact';
import { fmtPct, fmtSz, esc } from '../utils.js';
import { describeAnomaly } from '../anomalyMeta.js';

/**
 * ProcRow — renders a single process with memory bar, anomaly indicators,
 * and cleanup command. Shared between ToolCard and TabProcesses.
 */
export default function ProcRow({proc: p, maxMem}) {
  const mem=parseFloat(p.mem_mb)||0, pct=Math.min(mem/maxMem*100,100);
  const cpuVal = parseFloat(p.cpu_pct)||0;
  const barColor=(p.anomalies&&p.anomalies.length)?'var(--red)':mem>200?'var(--orange)':'var(--green)';
  const cpuColor = cpuVal>100?'var(--red)':cpuVal>50?'var(--orange)':'inherit';
  const hasAnom = p.anomalies && p.anomalies.length;
  const zr = p.zombie_risk && p.zombie_risk!=='none' ? p.zombie_risk : null;
  const zrColor = zr==='high'?'var(--red)':zr==='medium'?'var(--orange)':'var(--yellow)';
  return html`<div>
    <div class="prow">
      <span class="pid">${p.pid}</span>
      <span class="pname" title=${p.cmdline}>${esc(p.name)}</span>
      ${zr && html`<span class="badge" style=${'font-size:var(--fs-sm);padding:0.05rem var(--sp-2);background:'+zrColor+';color:var(--bg)'}>zombie:${zr}</span>`}
      <span class="pcpu" style=${'color:'+cpuColor}>${fmtPct(cpuVal)}</span>
      <div class="mem-bar"><div class="mem-bar-fill" style=${'width:'+pct.toFixed(0)+'%;background:'+barColor}></div></div>
      <span class="pmem">${fmtSz(mem*1048576)}</span>
      <span class="anomaly-icon">${hasAnom?html`<span class="text-red">\u26A0</span>`:''}</span>
    </div>
    ${hasAnom && html`<div class="anomaly-list" style="padding:0.1rem var(--sp-3) 0.2rem 2.5rem">
      ${p.anomalies.map((a,i)=>{
        const { label, detail, severity } = describeAnomaly(a, p);
        return html`<div key=${(a.type||a)+'-'+i} class="anomaly-item">
          <span class="anomaly-item__icon" style=${'color:var(--'+severity+')'}>⚠</span>
          <span class="anomaly-item__label">${label}</span>
          ${detail && html`<span class="anomaly-item__detail">${detail}</span>`}
        </div>`;
      })}
    </div>`}
    ${hasAnom && p.cleanup_cmd && html`<div class="flex-row" style="padding:0.1rem var(--sp-3) 0.2rem 2.5rem;gap:var(--sp-3)">
      <code class="text-mono" style="font-size:var(--fs-base);background:var(--bg2);padding:0.2rem var(--sp-4);border-radius:3px">${esc(p.cleanup_cmd)}</code>
      <button class="badge cursor-ptr" style="border:none;font-size:var(--fs-sm)" onClick=${()=>navigator.clipboard.writeText(p.cleanup_cmd)}>copy</button>
    </div>`}
  </div>`;
}
