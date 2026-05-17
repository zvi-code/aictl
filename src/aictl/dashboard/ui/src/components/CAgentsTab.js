import { useState, useContext, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, fmtK, liveTokenTotal } from '../utils.js';

function toolColor(t) {
  return COLORS[t] || 'var(--fg2)';
}

function isActive(tool) {
  const l = tool.live || {};
  return (l.pid_count > 0) || (l.session_count > 0) || (tool.processes || []).length > 0;
}

function Rule({ label }) {
  return html`<div class="cagents-rule">
    <div class="cagents-rule-line"></div>
    <div class="cagents-rule-label">${label}</div>
    <div class="cagents-rule-line"></div>
  </div>`;
}

function Stat({ label, value }) {
  return html`<div class="cagents-stat">
    <div class="cagents-stat-label">${label}</div>
    <div class="cagents-stat-value">${value}</div>
  </div>`;
}

// Color-coded permission badge (auto=green, ask=orange, deny=red, n/a=muted)
const PERM_STYLE = {
  auto: { color: 'var(--green)',  bg: 'var(--green-soft, #E6EFE3)', border: 'var(--green)' },
  ask:  { color: '#B26B1B',       bg: '#FBEFD9',                    border: '#B26B1B'       },
  deny: { color: 'var(--accent)', bg: 'var(--accent-soft)',          border: 'var(--accent)' },
  'n/a':{ color: 'var(--fg3)',    bg: 'transparent',                 border: 'var(--border)' },
};

function PermBadge({ val }) {
  const s = PERM_STYLE[val] || PERM_STYLE['n/a'];
  return html`<span class="cagents-perm-badge"
    style="color:${s.color};background:${s.bg};border-color:${s.border}">${val}</span>`;
}

// Classify each of 6 permission categories from the tool_config allow/deny arrays.
// Claude Code permission strings look like: "Bash(*)", "Read(*)", "WebFetch(*)", etc.
function derivePermissions(toolConfig) {
  const features = toolConfig?.features || {};
  if (features.global_autoApprove) {
    return [
      ['MCP Servers', 'auto'], ['File Reads', 'auto'],
      ['File Writes', 'auto'], ['Shell',       'auto'],
      ['Web Fetch',   'auto'], ['Network',     'auto'],
    ];
  }
  const settings = toolConfig?.settings || {};
  const perms = settings.permissions || {};
  const allow = (perms.allow || []).map(s => s.toLowerCase());
  const deny  = (perms.deny  || []).map(s => s.toLowerCase());

  const classify = (...prefixes) => {
    if (prefixes.some(p => deny.some(d  => d.startsWith(p)))) return 'deny';
    if (prefixes.some(p => allow.some(a => a.startsWith(p)))) return 'auto';
    if (allow.length === 0 && deny.length === 0)               return 'n/a';
    return 'ask';
  };

  return [
    ['MCP Servers', classify('mcp')],
    ['File Reads',  classify('read', 'glob', 'grep', 'ls')],
    ['File Writes', classify('write', 'edit', 'create', 'multiedit')],
    ['Shell',       classify('bash', 'execute')],
    ['Web Fetch',   classify('webfetch', 'fetch')],
    ['Network',     'n/a'],
  ];
}

// ─── Detail panel ────────────────────────────────────────────────
function AgentDetail({ tool: t, toolConfig, onViewSessions }) {
  const l      = t.live || {};
  const procs  = t.processes || [];
  const mcps   = t.mcp_servers || [];

  const totalCpu  = procs.reduce((a, p) => a + (parseFloat(p.cpu_pct) || 0), 0);
  const binaryRaw = procs.length > 0 ? (procs[0].cmdline || procs[0].name || '') : '';
  const binary    = binaryRaw.split(' ')[0] || null;
  const version   = toolConfig?.version || null;
  const notes     = toolConfig?.notes   || null;

  // Captured fields: derive from otel config
  const otel = toolConfig?.otel || {};
  const capturedFields = otel.enabled
    ? ['events', 'tokens', 'timing', ...(otel.capture_content ? ['prompts', 'responses'] : [])]
    : [];

  const stats = [
    ['Sessions',         l.session_count ?? 0],
    ['Tokens',           fmtK(liveTokenTotal(l))],
    ['Processes',        l.pid_count ?? procs.length],
    ['MCP servers',      mcps.length],
    ['Captured fields',  capturedFields.length > 0 ? capturedFields.length : '\u2014'],
    ['OTel',             otel.enabled ? 'active' : 'off'],
  ];

  const perms = derivePermissions(toolConfig);

  const configLines = [
    binary  ? ['binary',  binary]  : null,
    version ? ['version', version] : null,
    capturedFields.length > 0
      ? ['capture', '[' + capturedFields.map(f => `"${f}"`).join(', ') + ']']
      : ['capture', '\u2014'],
    ['enabled', isActive(t) ? 'true' : 'false'],
  ].filter(Boolean);

  return html`<div class="cagents-detail">
    <div class="cagents-detail-overline">Agent profile</div>
    <div class="cagents-detail-headline">
      <span class="cagents-detail-title">${t.label}</span>
      ${version && html`<span class="cagents-detail-version">v${version}</span>`}
      <span class="cagents-detail-id">${t.tool}</span>
    </div>
    ${notes && html`<div class="cagents-detail-notes">${notes}</div>`}

    <div class="cagents-detail-section"><${Rule} label="Stats"/></div>
    <div class="cagents-stats-grid">
      ${stats.map(([k, v]) => html`<${Stat} key=${k} label=${k} value=${v}/>`)}
    </div>

    <div class="cagents-detail-section"><${Rule} label="Permissions"/></div>
    <div class="cagents-perms-grid">
      ${perms.map(([k, v], i) => html`<div key=${k}
        class=${'cagents-perm-row' + (i >= 2 ? ' cagents-perm-row--top' : '')
          + (i % 2 === 0 ? ' cagents-perm-row--left' : '')}>
        <span class="cagents-perm-key">${k}</span>
        <${PermBadge} val=${v}/>
      </div>`)}
    </div>

    <div class="cagents-detail-section"><${Rule} label="Configuration"/></div>
    <div class="cagents-config-block">
      ${configLines.map(([k, v]) => html`<div key=${k}>
        <span class="cagents-config-key">${k}</span> = ${v}
      </div>`)}
    </div>

    <div class="cagents-actions">
      <button class="cagents-btn cagents-btn--primary" disabled
        title="Not yet available">Edit config</button>
      <button class="cagents-btn"
        onClick=${onViewSessions}>View sessions</button>
      <button class="cagents-btn cagents-btn--danger" disabled
        title="Not yet available">Disable capture</button>
    </div>
  </div>`;
}

// ─── Agent list row ──────────────────────────────────────────────
function AgentRow({ tool: t, selected, onSelect }) {
  const l      = t.live || {};
  const color  = toolColor(t.tool);
  const active = isActive(t);
  const isSel  = selected === t.tool;
  return html`<div class=${'cagents-row' + (isSel ? ' is-selected' : '')}
    onClick=${() => onSelect(t.tool)}
    role="button" tabIndex=${0} aria-pressed=${isSel ? 'true' : 'false'}
    onKeyDown=${e => e.key === 'Enter' && onSelect(t.tool)}>
    <div class="cagents-row-head">
      <span class="cagents-row-dot" style="background:${color}"></span>
      <span class="cagents-row-label">${t.label}</span>
      <span class=${'cagents-row-status' + (active ? ' is-on' : '')}>
        ${active ? '\u25CF on' : 'off'}
      </span>
    </div>
    <div class="cagents-row-meta">
      ${fmtK(liveTokenTotal(l))} tok \u00b7 ${l.session_count || 0} sessions
    </div>
  </div>`;
}

// ─── Inactive (detected) row ─────────────────────────────────────
function InactiveRow({ tool: t }) {
  return html`<div class="cagents-row cagents-row--inactive">
    <div class="cagents-row-head">
      <span class="cagents-row-dot cagents-row-dot--empty"></span>
      <span class="cagents-row-label" style="color:var(--fg2)">${t.label}</span>
      <button class="cagents-btn-enable" disabled
        title="Not yet available">Enable</button>
    </div>
  </div>`;
}

// ─── CAgentsTab ──────────────────────────────────────────────────
export default function CAgentsTab({ onViewSessions }) {
  const ctx  = useContext(SnapContext);
  const snap = ctx?.snap;

  // Build a quick lookup from tool_configs (top-level key in snapshot)
  const toolConfigMap = useMemo(() => {
    const m = {};
    for (const c of (snap?.tool_configs || [])) {
      if (c.tool) m[c.tool] = c;
    }
    return m;
  }, [snap]);

  const { active, inactive } = useMemo(() => {
    const tools = (snap?.tools || []).filter(t => t.tool !== 'aictl');
    return {
      active:   tools.filter(isActive),
      inactive: tools.filter(t => !isActive(t)),
    };
  }, [snap]);

  const [selected, setSelected] = useState(null);

  const selectedId   = selected ?? active[0]?.tool ?? null;
  const selectedTool = active.find(t => t.tool === selectedId)
                    ?? inactive.find(t => t.tool === selectedId);
  const selectedConfig = selectedId ? toolConfigMap[selectedId] : null;

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
          ? html`<${AgentDetail}
              tool=${selectedTool}
              toolConfig=${selectedConfig}
              onViewSessions=${onViewSessions ?? (() => {})}
            />`
          : html`<div class="cagents-empty">Select an agent to view its profile.</div>`}
      </div>
    </div>
  </div>`;
}
