import { useState, useContext, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, fmtK, fmtPct, fmtSz, fmtRate } from '../utils.js';

// Per-tool color — uses injected COLORS map, falls back to CSS variable.
function toolColor(t) {
  return COLORS[t] || 'var(--fg2)';
}

// "Active" = running processes or live session
function isActive(tool) {
  const l = tool.live || {};
  return (l.pid_count > 0) || (l.session_count > 0) || (tool.processes || []).length > 0;
}

// ─── Section divider matching the editorial c-rule style ────────
function Rule({ label }) {
  return html`<div class="cagents-rule">
    <div class="cagents-rule-line"></div>
    <div class="cagents-rule-label">${label}</div>
    <div class="cagents-rule-line"></div>
  </div>`;
}

// ─── Single stat cell ────────────────────────────────────────────
function Stat({ label, value }) {
  return html`<div class="cagents-stat">
    <div class="cagents-stat-label">${label}</div>
    <div class="cagents-stat-value">${value}</div>
  </div>`;
}

// ─── Permissions/meta row ────────────────────────────────────────
function KV({ label, value, i, total }) {
  const isLast = i >= total - 2;
  return html`<div class=${'cagents-kv' + (isLast ? '' : '') + (i % 2 === 0 ? ' cagents-kv--left' : '')}>
    <div class="cagents-kv-key">${label}</div>
    <div class="cagents-kv-val">${value}</div>
  </div>`;
}

// ─── Detail panel ────────────────────────────────────────────────
function AgentDetail({ tool: t }) {
  const l = t.live || {};
  const procs = t.processes || [];
  const mcps = t.mcp_servers || [];
  const files = t.files || [];

  const totalCpu = procs.reduce((a, p) => a + (parseFloat(p.cpu_pct) || 0), 0);
  const configFiles = files.filter(f => f.kind === 'config' || f.kind === 'credentials');

  const stats = [
    ['Live sessions', l.session_count ?? 0],
    ['Processes', l.pid_count ?? procs.length],
    ['Est. tokens', fmtK(l.token_estimate || 0)],
    ['Files touched', l.files_touched ?? 0],
    ['CPU', fmtPct(totalCpu)],
    ['MCP servers', mcps.length],
  ];

  const kvPairs = [
    ['Vendor', t.vendor || '\u2014'],
    ['Host', t.host || '\u2014'],
    ['Meta agent', t.meta ? 'yes' : 'no'],
    ['Config files', configFiles.length],
  ];

  return html`<div class="cagents-detail">
    <div class="cagents-detail-overline">Agent profile</div>
    <div class="cagents-detail-headline">
      <span class="cagents-detail-title" style="color:var(--fg)">${t.label}</span>
      <span class="cagents-detail-id">${t.tool}</span>
    </div>

    <div class="cagents-detail-section"><${Rule} label="Stats"/></div>
    <div class="cagents-stats-grid">
      ${stats.map(([k, v]) => html`<${Stat} key=${k} label=${k} value=${v}/>`)}
    </div>

    <div class="cagents-detail-section"><${Rule} label="Permissions"/></div>
    <div class="cagents-kv-grid">
      ${kvPairs.map(([k, v], i) => html`<${KV} key=${k} label=${k} value=${v} i=${i} total=${kvPairs.length}/>`)}
    </div>

    <div class="cagents-detail-section"><${Rule} label="Configuration"/></div>
    <div class="cagents-config-block">
      <div><span class="cagents-config-key">tool</span> = ${t.tool}</div>
      <div><span class="cagents-config-key">vendor</span> = ${t.vendor || '\u2014'}</div>
      <div><span class="cagents-config-key">host</span> = ${t.host || '\u2014'}</div>
      <div><span class="cagents-config-key">processes</span> = ${procs.length}</div>
      <div><span class="cagents-config-key">mcp_servers</span> = ${mcps.length}</div>
      <div><span class="cagents-config-key">files</span> = ${files.length}</div>
    </div>
  </div>`;
}

// ─── Agent list row ──────────────────────────────────────────────
function AgentRow({ tool: t, selected, onSelect }) {
  const l = t.live || {};
  const color = toolColor(t.tool);
  const active = isActive(t);
  const isSel = selected === t.tool;
  return html`<div class=${'cagents-row' + (isSel ? ' is-selected' : '')}
    onClick=${() => onSelect(t.tool)}
    role="button"
    tabIndex=${0}
    aria-pressed=${isSel ? 'true' : 'false'}
    onKeyDown=${e => e.key === 'Enter' && onSelect(t.tool)}>
    <div class="cagents-row-head">
      <span class="cagents-row-dot" style="background:${color}"></span>
      <span class="cagents-row-label">${t.label}</span>
      <span class=${'cagents-row-status' + (active ? ' is-on' : '')}>
        ${active ? '\u25CF on' : 'off'}
      </span>
    </div>
    <div class="cagents-row-meta">
      ${fmtK(l.token_estimate || 0)} tok \u00b7 ${l.session_count || 0} sessions
    </div>
  </div>`;
}

// ─── Inactive (detected) row ─────────────────────────────────────
function InactiveRow({ tool: t }) {
  return html`<div class="cagents-row cagents-row--inactive">
    <div class="cagents-row-head">
      <span class="cagents-row-dot cagents-row-dot--empty"></span>
      <span class="cagents-row-label" style="color:var(--fg2)">${t.label}</span>
    </div>
  </div>`;
}

// ─── CAgentsTab ──────────────────────────────────────────────────
export default function CAgentsTab() {
  const ctx = useContext(SnapContext);
  const snap = ctx?.snap;

  const { active, inactive } = useMemo(() => {
    const tools = (snap?.tools || []).filter(t => t.tool !== 'aictl');
    return {
      active:   tools.filter(isActive),
      inactive: tools.filter(t => !isActive(t)),
    };
  }, [snap]);

  const [selected, setSelected] = useState(null);

  // Auto-select first active tool when snap arrives
  const selectedId = selected ?? active[0]?.tool ?? null;
  const selectedTool = (active).find(t => t.tool === selectedId)
    ?? (inactive).find(t => t.tool === selectedId);

  return html`<div class="cagents-shell">
    <div class="cagents-toolbar">
      <span class="cagents-toolbar-count">
        ${active.length} of ${active.length + inactive.length} agents active
      </span>
    </div>
    <div class="cagents-body">
      <div class="cagents-list" role="list">
        ${active.length > 0 && html`<div class="cagents-list-heading">Instrumented</div>`}
        ${active.map(t => html`<${AgentRow} key=${t.tool}
          tool=${t} selected=${selectedId} onSelect=${setSelected}/>`)}

        ${inactive.length > 0 && html`<div class="cagents-list-heading">Detected, not active</div>`}
        ${inactive.map(t => html`<${InactiveRow} key=${t.tool} tool=${t}/>`)}
      </div>
      <div class="cagents-detail-pane">
        ${selectedTool
          ? html`<${AgentDetail} tool=${selectedTool}/>`
          : html`<div class="cagents-empty">Select an agent to view its profile.</div>`}
      </div>
    </div>
  </div>`;
}
