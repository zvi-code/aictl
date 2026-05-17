import { useState, useMemo, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, ICONS, CAT_ORDER, fmtK, fmtSz, fmtRate, fmtPct, esc, liveTokenTotal, TOOL_RELATIONSHIPS } from '../utils.js';
import CatGroup from './FileTree.js';
import { TinySparkline, ProcSection, ConfigSection, TelemetrySection, LiveSection } from './ToolCardSections.js';

// ─── ToolCard Component ────────────────────────────────────────
export default function ToolCard({tool: t, root}) {
  const [isOpen, setOpen] = useState(false);
  const {snap: snapCtx, history: hist} = useContext(SnapContext);
  const toolConfig = useMemo(()=>(snapCtx?.tool_configs||[]).find(c=>c.tool===t.tool),[snapCtx,t.tool]);
  const toolHist = useMemo(()=>hist?.by_tool?.[t.tool],[hist, t.tool]);
  const c = COLORS[t.tool]||'var(--fg2)';
  const icon = ICONS[t.tool]||'\u{1F539}';
  const tok = t.files.reduce((a,f)=>a+f.tokens,0);
  const anom = t.processes.filter(p=>p.anomalies&&p.anomalies.length).length;
  const liveTok = liveTokenTotal(t.live);
  const liveTraffic = (t.live?.outbound_rate_bps||0) + (t.live?.inbound_rate_bps||0);
  const totalCpu = t.processes.reduce((a,p)=>a+(parseFloat(p.cpu_pct)||0),0);
  const totalMem = t.processes.reduce((a,p)=>a+(parseFloat(p.mem_mb)||0),0);
  const maxMem = useMemo(()=>Math.max(...t.processes.map(p=>parseFloat(p.mem_mb)||0),100),[t.processes]);
  const telErrors = (t.token_breakdown?.telemetry?.errors||[]).length;
  const cats = useMemo(()=>{
    const c={};
    t.files.forEach(f=>{const k=f.kind||'other';(c[k]=c[k]||[]).push(f);});
    return Object.keys(c).sort((a,b)=>{
      const ai=CAT_ORDER.indexOf(a),bi=CAT_ORDER.indexOf(b);
      return (ai<0?99:ai)-(bi<0?99:bi);
    }).map(k=>({kind:k, files:c[k]}));
  },[t.files]);
  const cls = 'tcard'+(isOpen?' open':'')+(anom||telErrors?' has-anomaly':'');
  return html`<div class=${cls}>
    <button class="tcard-head" onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)">${icon}</span>${esc(t.label)}</h2>
      <span class="badge" data-dp="procs.tool.files">${t.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${fmtK(tok)} tok</span>
      ${t.processes.length>0 && html`<span class="badge" data-dp="procs.tool.process_count">${t.processes.length} proc ${fmtPct(totalCpu)} ${fmtSz(totalMem*1048576)}</span>`}
      ${t.mcp_servers.length>0 && html`<span class="badge" data-dp="procs.tool.mcp_server_count">${t.mcp_servers.length} MCP</span>`}
      ${anom>0 && html`<span class="badge warn" data-dp="procs.tool.anomaly">${anom} anomaly</span>`}
      ${telErrors>0 && html`<span class="badge" style="background:var(--red);color:var(--bg)">${telErrors} error${telErrors>1?'s':''}</span>`}
      ${t.live && html`<span class="badge" style="background:var(--accent);color:var(--bg)">${t.live.session_count||0} live \u00B7 ${fmtRate(liveTraffic)}${liveTok>0?' \u00B7 '+fmtK(liveTok)+'tok':''}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${cats.map(({kind,files:cf})=>html`<span class="text-muted" style="font-size:var(--fs-xs)">${kind}:${cf.length}</span>`)}
      </div>
      ${toolHist && toolHist.ts.length>2 && !isOpen && html`<div role="img" aria-label=${'Sparkline charts for '+t.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${e=>e.stopPropagation()}>
        <${TinySparkline} label="CPU" data=${toolHist.cpu} color=${c}/>
        <${TinySparkline} label="MEM" data=${toolHist.mem_mb} color=${'var(--green)'}/>
        <${TinySparkline} label=${t.live?'Traffic':'Tokens'} data=${t.live ? toolHist.traffic : toolHist.tokens} color=${'var(--orange)'}/>
      </div>`}
    </button>
    ${isOpen && html`<div class="tcard-body">
      ${TOOL_RELATIONSHIPS[t.tool]?.length > 0 && html`<div class="tool-relationships">
        ${TOOL_RELATIONSHIPS[t.tool].map(r => html`<span key=${r.label} class="rel-badge rel-${r.type}"
          title=${r.label}>${r.label}</span>`)}
      </div>`}
      <${ConfigSection} config=${toolConfig}/>
      <${TelemetrySection} telemetry=${t.token_breakdown?.telemetry}/>
      <${LiveSection} live=${t.live}/>
      ${cats.map(({kind,files})=>html`<${CatGroup} key=${kind} label=${kind} files=${files} root=${root}/>`)}
      <${ProcSection} processes=${t.live?.processes?.length ? t.live.processes : t.processes} maxMem=${maxMem}/>
      ${t.mcp_servers.length>0 && html`<div class="proc-section"><h3>MCP Servers</h3>
        ${t.mcp_servers.map(m=>html`<div key=${m.name||m.pid||''} class="fitem" style="cursor:default">
          <span class="fpath text-green">${esc(m.name)}</span>
          <span class="fmeta">${esc((m.config||{}).command||'')} ${((m.config||{}).args||[]).join(' ').slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`;
}
