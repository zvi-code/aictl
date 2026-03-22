import { useState, useEffect, useMemo, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, fmtK, fmtSz, fmtPct, esc } from '../utils.js';
import MiniChart from './MiniChart.js';

const MODEL_PALETTE = ['var(--green)','var(--model-7)','var(--orange)','var(--red)','var(--model-5)','var(--yellow)','var(--accent)','var(--model-8)'];

// Common model context windows — falls back to 200K for unknown models
const MODEL_WINDOWS = {
  'claude-opus-4-6':1000000, 'claude-opus-4-5':1000000,
  'claude-sonnet-4-6':1000000, 'claude-sonnet-4-5':1000000, 'claude-sonnet-4':200000,
  'claude-haiku-4-5':200000, 'claude-3-5-sonnet':200000,
  'gpt-4.1':1000000, 'gpt-4.1-mini':1000000, 'gpt-4o':128000, 'gpt-4o-mini':128000,
  'o3':200000, 'o4-mini':200000,
  'gemini-2.5-pro':1000000, 'gemini-2.5-flash':1000000,
};

function TokenBar({always, onDemand, conditional, never, total}) {
  if(!total) return null;
  const w = v => (v/total*100).toFixed(1)+'%';
  return html`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${always>0 && html`<div style="width:${w(always)};height:100%;background:var(--green)" title="Always loaded: ${fmtK(always)}"></div>`}
    ${onDemand>0 && html`<div style="width:${w(onDemand)};height:100%;background:var(--yellow)" title="On-demand: ${fmtK(onDemand)}"></div>`}
    ${conditional>0 && html`<div style="width:${w(conditional)};height:100%;background:var(--orange)" title="Conditional: ${fmtK(conditional)}"></div>`}
    ${never>0 && html`<div style="width:${w(never)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${fmtK(never)}"></div>`}
  </div>`;
}

export default function TabBudget() {
  const {snap: s, history: hist, enabledTools} = useContext(SnapContext);
  const [budget, setBudget] = useState(null);
  const [error, setError] = useState(false);
  useEffect(()=>{
    setBudget(null); setError(false);
    fetch('/api/budget').then(r=>r.json()).then(setBudget).catch(()=>setError(true));
  },[]);
  if(error) return html`<p class="error-state">Failed to load budget.</p>`;
  if(!budget) return html`<p class="loading-state">Loading...</p>`;

  const toolMatch = (t) => enabledTools === null || enabledTools.includes(t);

  // Detect model — prefer Claude Code or Copilot (the tools that define the context window)
  const detectedModel = useMemo(() => {
    const configs = s?.tool_configs || [];
    // Prefer claude-code, then copilot, then any tool with a known model
    for (const pref of ['claude-code', 'copilot', 'copilot-vscode']) {
      const c = configs.find(cfg => cfg.tool === pref && cfg.model);
      if (c) return c.model;
    }
    // Fall back to any config whose model is in our known window map
    for (const c of configs) {
      if (c.model && MODEL_WINDOWS[c.model]) return c.model;
    }
    return '';
  }, [s]);
  const contextWindow = MODEL_WINDOWS[detectedModel] || 200000;
  const alwaysLoaded = budget.always_loaded_tokens || 0;
  const totalPotential = budget.total_potential_tokens || 0;
  const pctAlways = alwaysLoaded/contextWindow*100;
  const pctTotal = totalPotential/contextWindow*100;

  // Per-tool file-based token breakdowns (for distribution bars)
  const toolBreakdowns = useMemo(()=>{
    if(!s) return {};
    const out = {};
    s.tools.forEach(t => {
      if(t.tool==='aictl' || !t.token_breakdown || !t.token_breakdown.total) return;
      out[t.tool] = t.token_breakdown;
    });
    return out;
  },[s]);

  // Verified telemetry — merge with file-based distribution
  const telemetry = useMemo(()=>{
    if(!s?.tool_telemetry) return [];
    return s.tool_telemetry.filter(t => toolMatch(t.tool));
  },[s, enabledTools]);

  const catBreakdown = useMemo(()=>{
    if(!s) return [];
    const bk={};
    s.tools.forEach(t=>{
      if(t.tool==='aictl' || !toolMatch(t.tool)) return;
      (t.files||[]).forEach(f=>{
        const k=f.kind||'other';
        if(!bk[k]) bk[k]={kind:k,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0};
        bk[k].count++;
        bk[k].tokens+=f.tokens;
        bk[k].size+=f.size;
        const v=(f.sent_to_llm||'').toLowerCase();
        if(v==='yes') bk[k].always+=f.tokens;
        else if(v==='on-demand') bk[k].onDemand+=f.tokens;
        else if(v==='conditional'||v==='partial') bk[k].conditional+=f.tokens;
        else bk[k].never+=f.tokens;
      });
    });
    return Object.values(bk).sort((a,b)=>b.tokens-a.tokens);
  },[s, enabledTools]);

  // Daily chart — only last 7 consecutive days (no stale gaps)
  const dailyChart = useMemo(()=>{
    if(!s?.tool_telemetry) return null;
    const byDate={}, byDateModel={};
    s.tool_telemetry.filter(t => toolMatch(t.tool)).forEach(t=>{
      (t.daily||[]).forEach(d=>{
        if(!d.date) return;
        if(!byDate[d.date]) byDate[d.date]={};
        if(!byDateModel[d.date]) byDateModel[d.date]={};
        if(d.tokens_by_model) {
          Object.entries(d.tokens_by_model).forEach(([m,v])=>{
            byDate[d.date][m]=(byDate[d.date][m]||0)+v;
          });
        }
        if(d.model) {
          const m=d.model, total=(d.input_tokens||0)+(d.output_tokens||0);
          byDate[d.date][m]=(byDate[d.date][m]||0)+total;
          if(!byDateModel[d.date][m]) byDateModel[d.date][m]={input:0,output:0,cache_read:0,cache_creation:0};
          byDateModel[d.date][m].input+=(d.input_tokens||0);
          byDateModel[d.date][m].output+=(d.output_tokens||0);
          byDateModel[d.date][m].cache_read+=(d.cache_read_tokens||0);
          byDateModel[d.date][m].cache_creation+=(d.cache_creation_tokens||0);
        }
      });
    });
    // Build last 7 consecutive days from today
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    // Only keep dates that have data, but maintain order
    const activeDates = dates.filter(d => byDate[d] && Object.values(byDate[d]).some(v => v > 0));
    if(!activeDates.length) return null;
    const models=[...new Set(activeDates.flatMap(d=>Object.keys(byDate[d]||{})))];
    const maxTotal=Math.max(...activeDates.map(d=>models.reduce((s,m)=>s+((byDate[d]||{})[m]||0),0)),1);
    const hasDetail=activeDates.some(d=>Object.keys(byDateModel[d]||{}).length>0);
    return {dates: activeDates, models, byDate, byDateModel, maxTotal, hasDetail};
  },[s, enabledTools]);

  const tokenHistData = hist && hist.ts && hist.ts.length >= 2
    ? [hist.ts, hist.live_tokens || hist.ts.map(()=>0)]
    : null;

  // Totals for telemetry
  const totIn = telemetry.reduce((s,t)=>s+(t.input_tokens||0),0);
  const totOut = telemetry.reduce((s,t)=>s+(t.output_tokens||0),0);
  const totCR = telemetry.reduce((s,t)=>s+(t.cache_read_tokens||0),0);
  const totCW = telemetry.reduce((s,t)=>s+(t.cache_creation_tokens||0),0);
  const totSess = telemetry.reduce((s,t)=>s+(t.total_sessions||0),0);
  const totCost = telemetry.reduce((s,t)=>s+(t.cost_usd||0),0);

  return html`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${tokenHistData ? html`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${MiniChart} data=${tokenHistData} color="var(--green)" height=${60}/>
        <div class="text-muted" style="font-size:var(--fs-base);margin-top:var(--sp-2)">
          Current: ${fmtK(s?.total_live_estimated_tokens||0)} estimated tokens
        </div>
      </div>` : html`<div></div>`}
      <div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Context Window${detectedModel ? html` <span class="badge">${detectedModel}</span>` : ''}</h3>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Always loaded: ${fmtK(alwaysLoaded)} of ${fmtK(contextWindow)}</span>
            <span class="text-bolder" style="color:${pctAlways>80?'var(--orange)':pctAlways>50?'var(--yellow)':'var(--green)'}">${fmtPct(pctAlways)}</span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:4px;background:var(--border)">
            <div style="height:100%;width:${Math.min(pctAlways,100).toFixed(1)}%;background:var(--green);border-radius:4px"></div>
          </div>
        </div>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Max potential: ${fmtK(totalPotential)}</span>
            <span class="text-bolder" style="color:${pctTotal>100?'var(--red)':'var(--fg2)'}">${fmtPct(pctTotal)}${pctTotal>100?' \u26A0':''}</span>
          </div>
          <div class="overflow-hidden" style="height:6px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${Math.min(pctTotal,100).toFixed(1)}%;background:${pctTotal>100?'var(--red)':'var(--fg2)'};opacity:0.5;border-radius:3px"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-1);font-size:var(--fs-sm)">
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:4px"></span>Always: ${fmtK(budget.always_loaded_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--yellow);margin-right:4px"></span>On-demand: ${fmtK(budget.on_demand_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--orange);margin-right:4px"></span>Conditional: ${fmtK(budget.conditional_tokens||0)}</span>
          <span class="text-muted">Cacheable: ${fmtK(budget.cacheable_tokens||0)}</span>
        </div>
        ${(budget.project_count||0) > 1 ? html`<div class="text-muted" style="font-size:var(--fs-xs);margin-top:var(--sp-2);border-top:1px solid var(--border);padding-top:var(--sp-1)">
          Estimate for largest project (${budget.largest_project||'?'}): ${fmtK(budget.largest_project_tokens||0)} + ${fmtK(budget.global_tokens||0)} global.
          ${(budget.raw_total_all_projects||0) > (budget.total_potential_tokens||0)
            ? html` Raw total across all ${budget.project_count} projects: ${fmtK(budget.raw_total_all_projects)}.`
            : null}
        </div>` : null}
      </div>
    </div>

    <!-- Daily token usage -->
    ${dailyChart && html`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">Daily Token Usage (last 7 days)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-6);font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        ${dailyChart.models.map((m,i)=>html`<span key=${m}>
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${MODEL_PALETTE[i%MODEL_PALETTE.length]};margin-right:3px"></span>${m}
        </span>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
        ${dailyChart.dates.map(d=>{
          const dayTotal=dailyChart.models.reduce((s,m)=>s+((dailyChart.byDate[d]||{})[m]||0),0);
          const lbl=new Date(d+'T12:00:00').toLocaleDateString([],{weekday:'short',month:'numeric',day:'numeric'});
          return html`<div key=${d} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${lbl}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${d}: ${fmtK(dayTotal)} tokens">
              ${dailyChart.models.map((m,i)=>{
                const v=(dailyChart.byDate[d]||{})[m]||0;
                if(!v) return null;
                return html`<div key=${m} style="width:${(v/dailyChart.maxTotal*100).toFixed(1)}%;height:100%;background:${MODEL_PALETTE[i%MODEL_PALETTE.length]}" title="${m}: ${fmtK(v)}"></div>`;
              })}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${fmtK(dayTotal)}</span>
          </div>`;
        })}
      </div>
      ${dailyChart.hasDetail && html`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${dailyChart.dates.flatMap(d=>{
            const lbl=new Date(d+'T12:00:00').toLocaleDateString([],{weekday:'short',month:'numeric',day:'numeric'});
            const dm=dailyChart.byDateModel[d]||{};
            const mods=Object.keys(dm).sort();
            if(!mods.length) return [];
            return mods.map((m,mi)=>{
              const r=dm[m];
              return html`<tr key=${d+'-'+m}>
                <td>${mi===0?lbl:''}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${MODEL_PALETTE[dailyChart.models.indexOf(m)%MODEL_PALETTE.length]};margin-right:3px"></span>${m}</td>
                <td>${fmtK(r.input)}</td><td>${fmtK(r.output)}</td>
                <td class="text-muted">${fmtK(r.cache_read)}</td>
                <td class="text-muted">${fmtK(r.cache_creation)}</td>
                <td class="text-bold">${fmtK(r.input+r.output)}</td>
              </tr>`;
            });
          })}</tbody>
        </table>
      </details>`}
    </div>`}

    <!-- Verified token usage (main table) -->
    ${telemetry.length>0 && html`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">Token Usage by Tool</h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Tool telemetry" style="width:100%">
          <thead><tr>
            <th>Tool</th><th>Source</th>
            <th style="text-align:right">Input</th><th style="text-align:right">Output</th>
            <th style="text-align:right">Cache R</th><th style="text-align:right">Cache W</th>
            <th style="text-align:right">Sessions</th><th style="text-align:right">Cost</th>
            <th style="width:100px">Context Split</th>
          </tr></thead>
          <tbody>${telemetry.map(t=>{
            const tb = toolBreakdowns[t.tool];
            return html`<tr key=${t.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${'background:'+(COLORS[t.tool]||'var(--fg2)')+';margin-right:var(--sp-2)'}></span>${esc(t.tool)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${t.source}</span> <span class="text-muted">${fmtPct(t.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${fmtK(t.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${fmtK(t.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${fmtK(t.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${fmtK(t.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${fmtK(t.total_sessions||0)}</td>
              <td style="text-align:right">${t.cost_usd > 0 ? '$'+t.cost_usd.toFixed(2) : '\u2014'}</td>
              <td>${tb ? html`<${TokenBar} always=${tb.always_loaded||0} onDemand=${tb.on_demand||0}
                conditional=${tb.conditional||0} never=${tb.never_sent||0} total=${tb.total||1}/>` : null}</td>
            </tr>`;})}
          ${telemetry.length>1 && html`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${fmtK(totIn)}</td>
            <td style="text-align:right">${fmtK(totOut)}</td>
            <td style="text-align:right" class="text-muted">${fmtK(totCR)}</td>
            <td style="text-align:right" class="text-muted">${fmtK(totCW)}</td>
            <td style="text-align:right">${fmtK(totSess)}</td>
            <td style="text-align:right">${totCost>0?'$'+totCost.toFixed(2):'\u2014'}</td>
            <td></td>
          </tr>`}</tbody>
        </table>
      </div>
    </div>`}

    <!-- By category -->
    ${catBreakdown.length>0 && html`<div class="budget-card budget-full">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">By Category</h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Per-category tokens" style="width:100%">
          <thead><tr><th>Category</th><th style="text-align:right">Files</th><th style="text-align:right">Tokens</th><th style="text-align:right">Size</th><th style="width:120px">Distribution</th></tr></thead>
          <tbody>${catBreakdown.map(c=>html`<tr key=${c.kind}>
            <td>${esc(c.kind)}</td>
            <td style="text-align:right">${c.count}</td>
            <td style="text-align:right" class="text-bold">${fmtK(c.tokens)}</td>
            <td style="text-align:right">${fmtSz(c.size)}</td>
            <td><${TokenBar} always=${c.always} onDemand=${c.onDemand} conditional=${c.conditional} never=${c.never} total=${c.tokens||1}/></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>`}
  </div>`;
}
