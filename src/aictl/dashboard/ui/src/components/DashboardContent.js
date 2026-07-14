// ─── Dashboard overview content (sparklines, metrics, bars) ──
// Extracted from app.js in the hooks refactor — pure presentation driven
// by {snap, history}; no cross-cutting state. Layout configuration comes
// from layoutConfig.js.
import { useState, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { LAYOUT } from '../layoutConfig.js';
import { fmtValue, evalExpr, SC, esc, toolColor } from '../utils.js';
import ChartCard from './ChartCard.js';
import Metric from './Metric.js';
import ResourceBar from './ResourceBar.js';
import { CoreBars } from './TabProcesses.js';

function McpPanel({ mcpDetail }) {
  if (!mcpDetail?.length)
    return html`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`;
  return html`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${mcpDetail.map(m => {
      const dotColor = SC[m.status] || 'var(--fg3)';
      return html`<div key=${m.name + m.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${m.status + (m.pid ? ' PID ' + m.pid : '') + (m.transport ? ' · ' + m.transport : '')}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${dotColor}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${toolColor(m.tool)};white-space:nowrap;flex-shrink:0">${esc(m.tool)}</span>
      </div>`;
    })}
  </div>`;
}

function McpMetric({ label, value, mcpDetail }) {
  const [show, setShow] = useState(false);
  return html`<div style="position:relative;cursor:default"
    tabindex="0"
    onMouseEnter=${() => setShow(true)} onMouseLeave=${() => setShow(false)}
    onFocusIn=${() => setShow(true)} onFocusOut=${() => setShow(false)}>
    <${Metric} label=${label} value=${value} sm=${true}/>
    ${show && html`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      <${McpPanel} mcpDetail=${mcpDetail}/>
    </div>`}
  </div>`;
}

export default function DashboardContent({ snap, history }) {
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('aictl-header-expanded') !== 'false'; } catch { return true; }
  });
  const toggleExpanded = useCallback(() => {
    setExpanded(v => {
      const next = !v;
      try { localStorage.setItem('aictl-header-expanded', String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const sparkFor = (key) => (history?.ts && history.ts.length >= 2 ? [history.ts, history[key]] : null);
  const cores = snap?.cpu_cores || 1;
  const exprVars = { cores };

  return html`
    <div class="grid-sparklines">
      ${LAYOUT.sparklines.map(cfg => {
        const raw = snap ? snap['total_' + cfg.field] ?? snap[cfg.field] ?? '' : '';
        const fmt = fmtValue(raw, cfg.format, cfg.suffix, cfg.multiply);
        const yMax = cfg.yMaxExpr ? evalExpr(cfg.yMaxExpr, exprVars) : undefined;
        const refLines = (cfg.refLines || []).map(r => ({
          value: evalExpr(r.valueExpr, exprVars),
          label: (r.label || '').replace('{cores}', cores),
        })).filter(r => r.value != null);
        return html`<${ChartCard} key=${cfg.field} label=${cfg.label} value=${fmt}
          data=${sparkFor(cfg.field)} chartColor=${cfg.color || 'var(--accent)'}
          smooth=${!!cfg.smooth} refLines=${refLines.length ? refLines : undefined}
          yMax=${yMax} dp=${cfg.dp} iconName=${cfg.iconName}/>`;
      })}
    </div>

    <div class=${expanded ? 'header-sections header-sections--expanded' : 'header-sections header-sections--collapsed'}>
      <div class="mb-sm header-top-row">
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${CoreBars} perCore=${snap?.cpu_per_core || []}/>
          <div style="margin-top:var(--sp-3)"><${ResourceBar} snap=${snap} mode="traffic"/></div>
        </div>
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${LAYOUT.liveMetrics.map(cfg => {
              const raw = snap ? snap[cfg.field] ?? '' : '';
              const fmt = fmtValue(raw, cfg.format, cfg.suffix, cfg.multiply);
              return html`<${Metric} key=${cfg.field} label=${cfg.label} value=${fmt}
                accent=${!!cfg.accent} dp=${cfg.dp} sm=${true}/>`;
            })}
          </div>
        </div>
      </div>
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div class="grid-inventory">
          ${LAYOUT.inventory.map(cfg => {
            const raw = snap ? snap[cfg.field] ?? '' : '';
            const fmt = fmtValue(raw, cfg.format, cfg.suffix, cfg.multiply);
            if (cfg.field === 'total_mcp_servers')
              return html`<${McpMetric} key=${cfg.field} label=${cfg.label} value=${fmt}
                mcpDetail=${snap?.mcp_detail || []}/>`;
            return html`<${Metric} key=${cfg.field} label=${cfg.label} value=${fmt}
              accent=${!!cfg.accent} dp=${cfg.dp} sm=${true}/>`;
          })}
        </div>
      </div>
      <div class="mb-sm"><${ResourceBar} snap=${snap} mode="files"/></div>
    </div>
    <button class="header-toggle" onClick=${toggleExpanded} aria-label="Toggle details"
      aria-expanded=${expanded}>
      <span aria-hidden="true">${expanded ? '\u25B2' : '\u25BC'}</span> ${expanded ? 'less' : 'more'}
    </button>
  `;
}
