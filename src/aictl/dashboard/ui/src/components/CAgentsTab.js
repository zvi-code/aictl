import { useState, useContext, useEffect, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, fmtK, liveTokenTotal } from '../utils.js';
import { ToolIcon } from './ui/index.js';
import * as api from '../api.js';
import Dialog from './ui/Dialog.js';
import { toast } from './ui/Toast.js';

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

function fmtHookTs(ts) {
  if (!ts) return '\u2014';
  return new Date(ts * 1000).toLocaleString();
}

function hookStatusLabel(status) {
  return {
    active: 'active',
    configured: 'configured',
    disabled: 'host-disabled',
    observed: 'observed',
    missing: 'missing',
  }[status] || status || 'unknown';
}

function warningConfig(warning) {
  if (!warning?.message) return '';
  if (warning.message.includes('~/.copilot/hooks')) return '"chat.hookFilesLocations": { "~/.copilot/hooks": true }';
  if (warning.message.includes('.github/hooks')) return '"chat.hookFilesLocations": { ".github/hooks": true }';
  if (warning.message.includes('chat.useHooks')) return '"chat.useHooks": true';
  return warning.message;
}

function listToText(items) {
  return (items || []).join('\n');
}

function parseLines(text) {
  return text.split('\n').map(line => line.trim()).filter(Boolean);
}

function listDiff(before, after) {
  const beforeSet = new Set(before || []);
  const afterSet = new Set(after || []);
  return {
    added: [...afterSet].filter(item => !beforeSet.has(item)),
    removed: [...beforeSet].filter(item => !afterSet.has(item)),
  };
}

function DiffChips({ title, diff }) {
  const hasDiff = diff.added.length || diff.removed.length;
  return html`<div class="cagents-editor-diff-row">
    <span>${title}</span>
    <div>
      ${hasDiff
        ? html`${diff.added.map(item => html`<code key=${'a' + item} class="is-added">+ ${item}</code>`)}
          ${diff.removed.map(item => html`<code key=${'r' + item} class="is-removed">- ${item}</code>`)}`
        : html`<code>no change</code>`}
    </div>
  </div>`;
}

function ConfigEditorModal({ tool, label, onClose }) {
  const [config, setConfig] = useState(null);
  const [allowText, setAllowText] = useState('');
  const [denyText, setDenyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedBackup, setSavedBackup] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    setSavedBackup('');
    api.getToolConfig(tool)
      .then(data => {
        if (!live) return;
        setConfig(data);
        setAllowText(listToText(data.permissions?.allow));
        setDenyText(listToText(data.permissions?.deny));
        setLoading(false);
      })
      .catch(err => {
        if (!live) return;
        setError(err.message || 'Failed to load config');
        setLoading(false);
      });
    return () => { live = false; };
  }, [tool]);

  const nextAllow = parseLines(allowText);
  const nextDeny = parseLines(denyText);
  const currentAllow = config?.permissions?.allow || [];
  const currentDeny = config?.permissions?.deny || [];
  const allowDiff = listDiff(currentAllow, nextAllow);
  const denyDiff = listDiff(currentDeny, nextDeny);
  const hasChanges = JSON.stringify(currentAllow) !== JSON.stringify(nextAllow)
    || JSON.stringify(currentDeny) !== JSON.stringify(nextDeny);
  const preview = JSON.stringify({ permissions: { allow: nextAllow, deny: nextDeny } }, null, 2);

  const save = () => {
    setSaving(true);
    setError('');
    setSavedBackup('');
    api.updateToolConfig(tool, {
      expected_mtime: config?.mtime,
      permissions: { allow: nextAllow, deny: nextDeny },
    })
      .then(data => {
        setConfig(data);
        setAllowText(listToText(data.permissions?.allow));
        setDenyText(listToText(data.permissions?.deny));
        setSavedBackup(data.backup_path || '');
        setSaving(false);
        toast.success('Configuration saved');
      })
      .catch(err => {
        setError(err.message || 'Failed to save config');
        setSaving(false);
        toast.error('Configuration save failed');
      });
  };

  return html`<${Dialog} open=${true} onClose=${onClose} ariaLabel=${'Edit ' + label + ' configuration'} class="cagents-editor-dialog">
    <div class="cagents-editor-head">
      <div>
        <div class="cagents-detail-overline">Project configuration</div>
        <div class="cagents-editor-title">${label} permissions</div>
        ${config?.path && html`<div class="cagents-editor-path">${config.path}</div>`}
      </div>
      <button class="cagents-editor-close" onClick=${onClose} aria-label="Close">x</button>
    </div>
    ${loading
      ? html`<div class="cagents-editor-state">Loading...</div>`
      : error && !config
        ? html`<div class="cagents-editor-error">${error}</div>`
        : html`<div class="cagents-editor-body">
          ${error && html`<div class="cagents-editor-error">${error}</div>`}
          ${savedBackup && html`<div class="cagents-editor-saved">Saved - backup ${savedBackup}</div>`}
          <div class="cagents-editor-fields">
            <label>
              <span>Allowed tools</span>
              <textarea value=${allowText} onInput=${e => setAllowText(e.target.value)} spellcheck="false" rows="7"></textarea>
            </label>
            <label>
              <span>Denied tools</span>
              <textarea value=${denyText} onInput=${e => setDenyText(e.target.value)} spellcheck="false" rows="7"></textarea>
            </label>
          </div>
          <div class="cagents-editor-preview">
            <div class="cagents-editor-subtitle">Pending diff</div>
            <${DiffChips} title="allow" diff=${allowDiff}/>
            <${DiffChips} title="deny" diff=${denyDiff}/>
            <pre>${preview}</pre>
          </div>
        </div>`}
    <div class="cagents-editor-actions">
      <button class="cagents-btn" onClick=${onClose}>Cancel</button>
      <button class="cagents-btn cagents-btn--primary" onClick=${save} disabled=${loading || saving || !hasChanges}>
        ${saving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  </${Dialog}>`;
}

function HookStatusSection({ tool, hooksStatus }) {
  const h = hooksStatus?.tools?.[tool.tool] || null;
  const counts = hooksStatus?.counts_by_tool_kind?.[tool.tool] || {};
  const warnings = h?.warnings || [];
  const events = h?.configured_events || [];
  return html`<div>
    <div class="cagents-hook-summary">
      <div class=${'cagents-hook-status ' + (h?.status === 'active' ? 'is-active' : h?.status === 'disabled' ? 'is-disabled' : '')}>
        ${hookStatusLabel(h?.status)}
      </div>
      <div class="cagents-hook-metrics">
        <span>${h?.configured_count || 0} configured</span>
        <span>${h?.fired_24h || 0} fired / 24h</span>
        <span>last ${fmtHookTs(h?.last_fire_ts)}</span>
      </div>
    </div>
    ${warnings.map(w => html`<div key=${w.path + w.message} class="cagents-hook-warning">
      ${w.message}<br/>
      <code>${warningConfig(w)}</code>
    </div>`)}
    <div class="cagents-hook-events">
      ${events.length > 0
        ? events.slice(0, 10).map(ev => html`<span key=${ev} class="cagents-hook-chip">${ev}</span>`)
        : html`<span class="cagents-hook-muted">no aictl-owned hooks configured</span>`}
    </div>
    ${Object.keys(counts).length > 0 && html`<div class="cagents-hook-counts">
      ${Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([kind, count]) => html`<span key=${kind}>${kind} ${count}</span>`)}
    </div>`}
    ${h?.sources?.length > 0 && html`<div class="cagents-hook-sources">
      ${h.sources.map(src => html`<div key=${src.path} class="cagents-hook-source">
        <span>${src.scope}</span>
        <span>${src.configured_count || 0} events</span>
        <span class=${src.host_enabled ? '' : 'is-disabled'}>${src.host_enabled ? 'loaded' : 'ignored'}</span>
      </div>`)}
    </div>`}
  </div>`;
}

function ActivityReport({ tool, hooksStatus }) {
  const skillUsage = hooksStatus?.skill_usage || {};
  const subagents = hooksStatus?.subagents || {};
  const toolCalls = hooksStatus?.tool_calls || {};
  const skillRows = skillUsage.by_skill || [];
  const toolSkillCount = skillUsage.by_tool?.[tool.tool] || 0;
  const toolSubagents = subagents.by_tool?.[tool.tool] || { starts: 0, stops: 0 };
  const toolCallCount = toolCalls.by_tool?.[tool.tool] || 0;
  const toolCallNames = Object.entries(toolCalls.by_tool_name?.[tool.tool] || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const noActivity = toolSkillCount === 0 && (toolSubagents.starts || 0) === 0 && toolCallCount === 0;
  return html`<div class="cagents-activity-report">
    <div class="cagents-activity-row">
      <span>Tool calls</span>
      <strong>${toolCallCount}</strong>
      <span class="cagents-hook-muted">${toolCalls.total_calls_24h || 0} all tools / 24h</span>
    </div>
    <div class="cagents-activity-row">
      <span>Skill calls</span>
      <strong>${toolSkillCount}</strong>
      <span class="cagents-hook-muted">${skillUsage.total_calls_24h || 0} all tools / 24h</span>
    </div>
    <div class="cagents-activity-row">
      <span>Subagents</span>
      <strong>${toolSubagents.starts || 0}</strong>
      <span class="cagents-hook-muted">${subagents.starts_24h || 0} starts / 24h</span>
    </div>
    ${toolCallNames.length > 0 && html`<div class="cagents-skill-list">
      ${toolCallNames.map(([name, count]) => html`<span key=${name}>${name} ${count}</span>`)}
    </div>`}
    ${skillRows.length > 0 && html`<div class="cagents-skill-list">
      ${skillRows.slice(0, 6).map(row => html`<span key=${row.skill}>${row.skill} ${row.count}</span>`)}
    </div>`}
    ${noActivity && html`<div class="cagents-hook-muted" style="margin-top:8px">
      No hook activity in the last 24h. Tool, skill, and subagent counts require
      aictl lifecycle hooks — agents that report only via OTel will show zero here.
    </div>`}
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
  const ask   = (perms.ask   || []).map(s => s.toLowerCase());

  const classify = (...prefixes) => {
    if (prefixes.some(p => deny.some(d  => d.startsWith(p)))) return 'deny';
    if (prefixes.some(p => allow.some(a => a.startsWith(p)))) return 'auto';
    if (prefixes.some(p => ask.some(a   => a.startsWith(p)))) return 'ask';
    if (allow.length === 0 && deny.length === 0 && ask.length === 0) return 'n/a';
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
function AgentDetail({ tool: t, toolConfig, hooksStatus, onViewSessions, onViewConfig, onEditConfig }) {
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

    <div class="cagents-detail-section"><${Rule} label="Hooks"/></div>
    <${HookStatusSection} tool=${t} hooksStatus=${hooksStatus}/>

    <div class="cagents-detail-section"><${Rule} label="Tool & skill activity"/></div>
    <${ActivityReport} tool=${t} hooksStatus=${hooksStatus}/>

    <div class="cagents-actions">
      ${t.tool === 'claude-code'
        ? html`<button class="cagents-btn cagents-btn--primary" onClick=${onEditConfig}>Edit permissions</button>`
        : html`<button class="cagents-btn cagents-btn--primary" onClick=${onViewConfig}>Open configuration</button>`}
      <button class="cagents-btn"
        onClick=${onViewSessions}>View sessions</button>
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
      <${ToolIcon} tool=${t.tool} size="12px"/>
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
function InactiveRow({ tool: t, selected, onSelect }) {
  const isSel = selected === t.tool;
  return html`<div class=${'cagents-row cagents-row--inactive' + (isSel ? ' is-selected' : '')}
    onClick=${() => onSelect(t.tool)}
    role="button" tabIndex=${0} aria-pressed=${isSel ? 'true' : 'false'}
    onKeyDown=${e => e.key === 'Enter' && onSelect(t.tool)}>
    <div class="cagents-row-head">
      <span class="cagents-row-dot cagents-row-dot--empty"></span>
      <span class="cagents-row-label" style="color:var(--fg2)">${t.label}</span>
      <span class="cagents-row-status">view</span>
    </div>
  </div>`;
}

// ─── CAgentsTab ──────────────────────────────────────────────────
export default function CAgentsTab({ onViewSessions, onViewConfig }) {
  const ctx  = useContext(SnapContext);
  const snap = ctx?.snap;
  const [hooksStatus, setHooksStatus] = useState(null);

  useEffect(() => {
    let running = true;
    const poll = () => {
      api.getHooksStatus()
        .then(d => { if (running) setHooksStatus(d); })
        .catch(() => { if (running) setHooksStatus(null); });
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { running = false; clearInterval(id); };
  }, []);

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
  const [editTool, setEditTool] = useState(null);

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
        ${active.length > 0 && html`<div class="cagents-list-heading">Active</div>`}
        ${active.map(t => html`<${AgentRow} key=${t.tool}
          tool=${t} selected=${selectedId} onSelect=${setSelected}/>`)}

        ${inactive.length > 0 && html`<div class="cagents-list-heading">Detected, not active</div>`}
        ${inactive.map(t => html`<${InactiveRow} key=${t.tool}
          tool=${t} selected=${selectedId} onSelect=${setSelected}/>`)}
      </div>
      <div class="cagents-detail-pane">
        ${selectedTool
          ? html`<${AgentDetail}
              tool=${selectedTool}
              toolConfig=${selectedConfig}
              hooksStatus=${hooksStatus}
              onViewSessions=${onViewSessions ?? (() => {})}
              onViewConfig=${onViewConfig ?? (() => {})}
              onEditConfig=${() => setEditTool({ tool: selectedTool.tool, label: selectedTool.label })}
            />`
          : html`<div class="cagents-empty">Select an agent to view its profile.</div>`}
      </div>
    </div>
    ${editTool && html`<${ConfigEditorModal}
      tool=${editTool.tool}
      label=${editTool.label}
      onClose=${() => setEditTool(null)}/>`}
  </div>`;
}
