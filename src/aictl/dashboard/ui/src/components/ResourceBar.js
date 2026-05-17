import { html } from 'htm/preact';
import { COLORS, fmtRate } from '../utils.js';

export default function ResourceBar({snap: s, mode}) {
  if(!s) return null;
  const showFiles = !mode || mode === 'files';
  const showTraffic = !mode || mode === 'traffic';
  const fileTools = s.tools.filter(t=>t.tool!=='aictl'&&t.files.length);
  const fileTotal = fileTools.reduce((a,t)=>a+t.files.length,0)||1;
  const liveTools = s.tools.filter(t=>t.tool!=='aictl'&&t.live&&(t.live.outbound_rate_bps||t.live.inbound_rate_bps));
  const liveTotal = liveTools.reduce((a,t)=>a+(t.live.outbound_rate_bps||0)+(t.live.inbound_rate_bps||0),0)||1;
  return html`
    ${showFiles && fileTools.length>0 && html`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${'CSV footprint: '+fileTools.map(t=>t.label+' '+t.files.length+' files').join(', ')}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${fileTools.map(t=>html`
        <div class="rbar-seg" style=${'width:'+(t.files.length/fileTotal*100).toFixed(1)+'%;background:'+(COLORS[t.tool]||'var(--fg2)')}
          title="${t.label}: ${t.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${fileTools.map(t=>html`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${'background:'+(COLORS[t.tool]||'var(--fg2)')}></span>
          ${t.label} <span class="text-muted">${t.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${showTraffic && html`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${'Live traffic: '+(liveTools.length?liveTools.map(t=>t.label).join(', '):'no active traffic')}>
      <div class="rbar-title">Live Traffic${liveTools.length===0?' — no active traffic':''}</div>
      <div class="rbar">${liveTools.map(t=>{
        const weight=(t.live.outbound_rate_bps||0)+(t.live.inbound_rate_bps||0);
        return html`<div class="rbar-seg" style=${'width:'+(weight/liveTotal*100).toFixed(1)+'%;background:'+(COLORS[t.tool]||'var(--fg2)')}
          title="${t.label}: ${fmtRate(weight)}"></div>`;
      })}
      </div>
      <div class="rbar-legend">${liveTools.map(t=>{
        const weight=(t.live.outbound_rate_bps||0)+(t.live.inbound_rate_bps||0);
        return html`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${'background:'+(COLORS[t.tool]||'var(--fg2)')}></span>
          ${t.label} <span class="text-muted">${fmtRate(weight)}</span>
        </span>`;
      })}
      </div>
    </div>`}
    ${!mode && !fileTools.length && !liveTools.length && html`<div class="empty-state">No AI tool resources found yet.</div>`}`;
}
