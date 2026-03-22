import { useState, useRef, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtK, fmtTok, fmtSz, fmtRate, fmtPct, esc, liveTokenTotal } from '../utils.js';
import ProcRow from './ProcRow.js';

// ─── TinySparkline ─────────────────────────────────────────────
export function TinySparkline({label, data, color}) {
  const ref = useRef(null);
  useEffect(()=>{
    const canvas = ref.current;
    if(!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * (window.devicePixelRatio||1);
    const h = canvas.height = canvas.offsetHeight * (window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);
    const vals = data.slice(-60);
    const max = Math.max(...vals) * 1.1 || 1;
    const step = w / (vals.length - 1);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * (window.devicePixelRatio||1);
    vals.forEach((v,i)=>{
      const x = i * step, y = h - (v / max) * h * 0.85;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  },[data, color]);
  return html`<div style="position:relative;height:25px">
    <span class="text-muted" style="position:absolute;top:0;left:0;font-size:var(--fs-2xs);z-index:1">${label}</span>
    <canvas ref=${ref} aria-hidden="true" style="width:100%;height:100%;display:block"/>
  </div>`;
}

// ─── ProcSection (within ToolCard) ─────────────────────────────
export function ProcSection({processes, maxMem}) {
  if(!processes||!processes.length) return null;
  const totalMem = processes.reduce((a,p)=>a+(parseFloat(p.mem_mb)||0),0);
  const totalCpu = processes.reduce((a,p)=>a+(parseFloat(p.cpu_pct)||0),0);
  const byType = {};
  processes.forEach(p=>{const t=p.process_type||'process';(byType[t]=byType[t]||[]).push(p);});
  const multiType = Object.keys(byType).length > 1;
  return html`<div class="proc-section">
    <h3>Processes <span class="badge">${processes.length}</span>
      <span class="badge">CPU ${fmtPct(totalCpu)}</span>
      <span class="badge">MEM ${fmtSz(totalMem*1048576)}</span></h3>
    ${Object.entries(byType).map(([type, typeProcs]) => {
      const byName = {};
      typeProcs.forEach(p => (byName[p.name||'unknown'] = byName[p.name||'unknown'] || []).push(p));
      return html`<div style="margin-bottom:var(--sp-2)">
        ${multiType ? html`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${esc(type)}</div>` : null}
        ${Object.entries(byName).map(([name, procs]) => {
          const sorted = procs.sort((a,b) => (parseFloat(b.mem_mb)||0) - (parseFloat(a.mem_mb)||0));
          return html`<div key=${name} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${multiType ? '' : html`<span style="text-transform:uppercase;letter-spacing:0.03em">${esc(type)}</span>${' \u00B7 '}`}${esc(name)} <span style="opacity:0.6">(${procs.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${sorted.map(p => {
                const cpu = parseFloat(p.cpu_pct)||0;
                const mem = parseFloat(p.mem_mb)||0;
                const cpuW = Math.max(2, Math.min(cpu, 100));
                const cpuColor = cpu>80?'var(--red)':cpu>50?'var(--orange)':cpu>5?'var(--green)':'var(--fg2)';
                const hasAnom = p.anomalies&&p.anomalies.length;
                const zr = p.zombie_risk&&p.zombie_risk!=='none';
                return html`<div key=${p.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${hasAnom?'border-left:2px solid var(--red);':''}${zr?'border-left:2px solid var(--orange);':''}"
                  title=${p.cmdline||p.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${cpuW}%;height:100%;background:${cpuColor};border-radius:2px"></div>
                    </div>
                    <span style="color:${cpuColor};min-width:3ch;text-align:right">${fmtPct(cpu)}</span>
                  </div>
                  <div class="mono text-muted">${p.pid}</div>
                  <div>${fmtSz(mem*1048576)}</div>
                  ${hasAnom?html`<div class="text-red">\u26A0${p.anomalies.length}</div>`:null}
                </div>`;
              })}
            </div>
          </div>`;
        })}
      </div>`;
    })}
  </div>`;
}

// ─── ConfigSection (within ToolCard) ───────────────────────────
export function ConfigSection({config}) {
  if(!config) return null;
  const entries = Object.entries(config.settings||{});
  const features = Object.entries(config.features||{});
  const hasMcp = (config.mcp_servers||[]).length > 0;
  const hasExt = (config.extensions||[]).length > 0;
  const otel = config.otel||{};
  const hints = config.hints||[];
  if(!entries.length && !features.length && !hasMcp && !hasExt && !otel.enabled && !hints.length && config.model==null && config.launch_at_startup==null) return null;
  return html`<div class="live-section">
    <h3>Configuration
      ${config.launch_at_startup===true && html`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${config.launch_at_startup===false && html`<span class="badge">no auto-start</span>`}
      ${config.auto_update===true && html`<span class="badge">auto-update</span>`}
      ${config.model && html`<span class="badge">${config.model}</span>`}
      ${otel.enabled && html`<span class="badge" style="background:var(--green);color:var(--bg)">OTel ${otel.exporter||'on'}</span>`}
      ${!otel.enabled && otel.source && html`<span class="badge" style="background:var(--orange);color:var(--bg)">OTel off</span>`}
    </h3>
    <div class="metric-grid">
      ${otel.enabled && html`<div class="metric-chip" style="border-color:var(--green)">
        <span class="mlabel text-green">OpenTelemetry</span>
        <div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Exporter:</span> <span class="mono">${otel.exporter}</span>
        </div>
        ${otel.endpoint && html`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Endpoint:</span> <span class="mono">${otel.endpoint}</span>
        </div>`}
        ${otel.file_path && html`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">File:</span> <span class="mono">${otel.file_path}</span>
        </div>`}
        ${otel.capture_content && html`<div class="text-orange" style="font-size:var(--fs-base);padding:0.05rem 0">\u26A0 Content capture enabled</div>`}
      </div>`}
      ${entries.length>0 && html`<div class="metric-chip">
        <span class="mlabel">Settings</span>
        ${entries.map(([k,v])=>html`<div key=${k} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${k}</span>
          <span class="mono">${typeof v==='object'?JSON.stringify(v):String(v)}</span>
        </div>`)}
      </div>`}
      ${Object.entries(config.feature_groups||{}).map(([group, items])=>html`<div key=${group} class="metric-chip">
        <span class="mlabel">${group}</span>
        ${Object.entries(items).map(([k,v])=>html`<div key=${k} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${k}</span>
          <span style="color:${v===true?'var(--green)':v===false?'var(--red)':'var(--fg)'}">${typeof v==='object'?JSON.stringify(v):String(v)}</span>
        </div>`)}
      </div>`)}
      ${features.length>0 && !Object.keys(config.feature_groups||{}).length && html`<div class="metric-chip">
        <span class="mlabel">Features</span>
        ${features.map(([k,v])=>html`<div key=${k} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${k}</span>
          <span style="color:${v===true?'var(--green)':v===false?'var(--red)':'var(--fg)'}">${String(v)}</span>
        </div>`)}
      </div>`}
      ${hasMcp && html`<div class="metric-chip">
        <span class="mlabel">MCP Servers</span>
        <div class="stack-list">${config.mcp_servers.map((s,i)=>html`<span class="pill mono" key=${s||i}>${s}</span>`)}</div>
      </div>`}
      ${hasExt && html`<div class="metric-chip">
        <span class="mlabel">Extensions</span>
        <div class="stack-list">${config.extensions.map(e=>html`<span class="pill mono" key=${e}>${e}</span>`)}</div>
      </div>`}
    </div>
    ${hints.length>0 && html`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
      ${hints.map(h=>html`<div class="text-orange" style="font-size:var(--fs-base);padding:0.15rem 0">
        <span style="margin-right:var(--sp-3)">\u{1F4A1}</span>${h}
      </div>`)}
    </div>`}
  </div>`;
}

// ─── TelemetrySection (within ToolCard) ────────────────────────
export function TelemetrySection({telemetry}) {
  if(!telemetry) return null;
  const t = telemetry;
  const totalTok = (t.input_tokens||0) + (t.output_tokens||0);
  const errors = t.errors||[];
  const quota = t.quota_state||{};
  if(!totalTok && !t.active_session_input && !errors.length) return null;
  const [showErrors, setShowErrors] = useState(false);
  return html`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${t.source}</span> <span class="badge">${fmtPct(t.confidence*100)} confidence</span>
      ${errors.length>0 && html`<span class="badge warn cursor-ptr" onClick=${(e)=>{e.stopPropagation();setShowErrors(!showErrors)}}>${errors.length} error${errors.length>1?'s':''}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${fmtTok(t.input_tokens||0)} tok</span>
        <span class="msub">cache read: ${fmtTok(t.cache_read_tokens||0)} tok \u00B7 creation: ${fmtTok(t.cache_creation_tokens||0)} tok</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${fmtTok(t.output_tokens||0)} tok</span>
        <span class="msub">${fmtK(t.total_sessions||0)} sessions \u00B7 ${fmtK(t.total_messages||0)} messages</span>
      </div>
      ${t.cost_usd > 0 ? html`<div class="metric-chip">
        <span class="mlabel">Estimated Cost</span>
        <span class="mvalue">$${t.cost_usd.toFixed(2)}</span>
      </div>` : null}
      ${(quota.premium_requests_used>0 || quota.total_api_duration_ms>0) && html`<div class="metric-chip">
        <span class="mlabel">Operational</span>
        ${quota.premium_requests_used>0 && html`<div style="font-size:var(--fs-base)">Premium requests: <span class="mono">${quota.premium_requests_used}</span></div>`}
        ${quota.total_api_duration_ms>0 && html`<div style="font-size:var(--fs-base)">API time: <span class="mono">${Math.round(quota.total_api_duration_ms/1000)}s</span></div>`}
        ${quota.current_model && html`<div style="font-size:var(--fs-base)">Model: <span class="mono">${quota.current_model}</span></div>`}
        ${quota.code_changes && html`<div class="text-green" style="font-size:var(--fs-base)">+${quota.code_changes.lines_added} -${quota.code_changes.lines_removed} (${quota.code_changes.files_modified} files)</div>`}
      </div>`}
      ${(t.active_session_input>0||t.active_session_output>0) ? html`<div class="metric-chip" style="border-color:var(--accent)">
        <span class="mlabel">Active Session</span>
        <span class="mvalue">${fmtTok((t.active_session_input||0)+(t.active_session_output||0))} tok</span>
        <span class="msub">in: ${fmtTok(t.active_session_input||0)} \u00B7 out: ${fmtTok(t.active_session_output||0)} \u00B7 ${t.active_session_messages||0} msgs</span>
      </div>` : null}
      ${Object.keys(t.by_model||{}).length > 0 ? html`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(t.by_model).map(([model,u])=>html`<div key=${model} class="flex-between flex-wrap" style="font-size:0.75rem;padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${model}</span>
          <span>in:${fmtTok(u.input_tokens||0)} tok out:${fmtTok(u.output_tokens||0)} tok${u.cache_read_tokens?' cR:'+fmtTok(u.cache_read_tokens)+' tok':''}${u.requests?' \u00B7 '+u.requests+'req':''}${u.cost_usd?' \u00B7 $'+u.cost_usd.toFixed(2):''}</span>
        </div>`)}
      </div>` : null}
    </div>
    ${showErrors && errors.length>0 && html`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--red);background:color-mix(in srgb,var(--red) 8%,transparent);border-radius:0 4px 4px 0;max-height:10rem;overflow-y:auto">
      <div class="text-red text-bold" style="font-size:var(--fs-base);margin-bottom:0.2rem">Recent Errors</div>
      ${errors.map(e=>html`<div class="flex-row gap-sm" style="font-size:0.68rem;padding:0.1rem 0">
        <span class="mono text-muted text-nowrap">${(e.timestamp||'').slice(11,19)}</span>
        <span class="badge" style="font-size:var(--fs-xs);background:var(--red);color:var(--bg);padding:0.05rem var(--sp-2)">${e.type}</span>
        <span class="text-muted">${e.message}</span>
        ${e.model && html`<span class="mono text-muted">${e.model}</span>`}
      </div>`)}
    </div>`}
  </div>`;
}

// ─── LiveSection (within ToolCard) ─────────────────────────────
export function LiveSection({live}) {
  if(!live) return null;
  const tokenEstimate = live.token_estimate || {};
  const mcp = live.mcp || {};
  const tokenTotal = liveTokenTotal(live);
  return html`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${live.session_count||0} sess</span>
      <span class="badge">${live.pid_count||0} pid</span>
      <span class="badge">${fmtPct((live.confidence||0)*100)} conf</span>
      ${mcp.detected && html`<span class="badge warn">${mcp.loops||0} MCP loop${(mcp.loops||0)===1?'':'s'}</span>`}
    </h3>
    <div class="metric-grid" aria-live="polite" aria-relevant="text" aria-atomic="false">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">\u2191 ${fmtRate(live.outbound_rate_bps||0)}</span>
        <span class="msub">\u2193 ${fmtRate(live.inbound_rate_bps||0)} total ${fmtSz((live.outbound_bytes||0)+(live.inbound_bytes||0))}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Tokens</span>
        <span class="mvalue">${fmtK(tokenTotal)}</span>
        <span class="msub">${tokenEstimate.source||'network-inference'} at ${fmtPct((tokenEstimate.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">MCP</span>
        <span class="mvalue">${mcp.detected ? 'Detected' : 'No loop'}</span>
        <span class="msub">${mcp.loops||0} loops at ${fmtPct((mcp.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Context</span>
        <span class="mvalue">${live.files_touched||0} files</span>
        <span class="msub">${live.file_events||0} events \u00B7 repo ${fmtSz((live.workspace_size_mb||0)*1048576)}</span>
      </div>
      ${(live.state_bytes_written||0) > 0 && html`<div class="metric-chip">
        <span class="mlabel">State Writes</span>
        <span class="mvalue">${fmtSz(live.state_bytes_written||0)}</span>
      </div>`}
      <div class="metric-chip">
        <span class="mlabel">CPU</span>
        <span class="mvalue">${fmtPct(live.cpu_percent||0)}</span>
        <span class="msub">peak ${fmtPct(live.peak_cpu_percent||0)}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Workspaces</span>
        <span class="mvalue">${(live.workspaces||[]).length || 0}</span>
        <span class="msub mono">${(live.workspaces||[]).slice(0,2).join(' | ') || '(unknown)'}</span>
      </div>
    </div>
  </div>`;
}
