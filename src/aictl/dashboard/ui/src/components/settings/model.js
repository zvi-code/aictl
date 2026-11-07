// ─── Settings workspace data ─────────────────────────────────────
// Turns snap.tool_configs, /api/settings/files and the context audit into the
// rows, files, matrix and finding groups the four pivots show. Pure functions,
// so every rule here is testable without rendering.
import { rowTip, TIPS } from './tips.js';
import { baseName, isWindowsPath } from '../../utils/paths.js';
import { toolLabel } from '../../utils/tools.js';
import { isConfigSelected, isToolSelected } from '../../utils/toolScope.js';

// ─── Sections ────────────────────────────────────────────────────
export const SECTION_ORDER = ['model', 'agents', 'telemetry', 'autonomy', 'context', 'hooks', 'mcp', 'extensions', 'startup', 'other'];
export const SECTION_TITLES = {
  model: 'Model',
  agents: 'Agents',
  telemetry: 'Telemetry',
  autonomy: 'Autonomy and safety',
  context: 'Context files',
  hooks: 'Hooks',
  mcp: 'MCP servers',
  extensions: 'Extensions and plugins',
  startup: 'Updates and startup',
  other: 'Other settings',
};

const GROUP_SECTION = {
  'Agent': 'autonomy', 'Agent Mode': 'autonomy', 'Code (Agent)': 'autonomy',
  'Cowork (Autonomous)': 'autonomy', 'Safety': 'autonomy', 'Claude (Anthropic)': 'autonomy',
  'Hooks': 'hooks',
  'Context Files': 'context', 'File Locations': 'context',
  'MCP': 'mcp',
};

// Keys that remove a human confirmation step when they are on (older servers
// send no `danger`; newer ones decide it from the value).
const DANGER_KEYS = new Set([
  'globalAutoApprove', 'autoApprove', 'autoReply', 'autopilot', 'skipPermissions',
  'allowAllBrowserActions', 'autoCommit', 'dangerouslySkipPermissions', 'yolo',
]);

export const DASH = '—';

function lastSegment(key) {
  const parts = String(key || '').split('.');
  return parts[parts.length - 1];
}

export function normKey(key) {
  return String(key || '').replace(/^github\.copilot\./, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function shortKey(key) {
  const parts = String(key || '').split(/[._]/).filter(Boolean);
  return normKey(parts[parts.length - 1]);
}

export function normText(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function humanize(key) {
  const s = String(key || '')
    .replace(/^github\.copilot\./, '')
    .replace(/^chat\./, '')
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\?+$/, '')
    .trim()
    .toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

export function inferKind(v) {
  if (typeof v === 'boolean') return 'flag';
  if (typeof v === 'number') return 'number';
  if (Array.isArray(v)) return 'list';
  if (v && typeof v === 'object') return 'map';
  if (typeof v === 'string' && /^(~|\/|[A-Za-z]:\\)/.test(v)) return 'path';
  return 'text';
}

/** True when a value turns its setting on: true, a non-empty list or map, a positive number, or an "on" word. */
export function isOn(v) {
  if (v === true) return true;
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === 'object') return Object.keys(v).length > 0;
  if (typeof v === 'number') return v > 0;
  if (typeof v === 'string') return !!v && !['false', 'off', 'no', '0', 'none', 'default', 'never'].includes(v.toLowerCase());
  return false;
}

function settingSection(key) {
  const k = String(key).toLowerCase();
  if (/otel|telemetry/.test(k)) return 'telemetry';
  if (/model|effort|thinking|reasoning/.test(k)) return 'model';
  if (/hook/.test(k)) return 'hooks';
  if (/mcp/.test(k)) return 'mcp';
  if (/update|startup|launch/.test(k)) return 'startup';
  return 'other';
}

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  return JSON.stringify(v ?? null);
}

function makeRow(key, value, extra = {}) {
  const v = value === undefined ? null : value;
  return {
    key,
    label: extra.label || humanize(key),
    value: v,
    kind: extra.kind || inferKind(value),
    source: extra.source || '',
    danger: extra.danger ?? (DANGER_KEYS.has(lastSegment(key)) && isOn(v)),
    note: extra.note || '',
    group: extra.group,
  };
}

/** The `sections` shape built from the fields an older server sends. */
export function buildSections(cfg) {
  const files = cfg.config_files || [];
  const src = files[0] || '';
  const buckets = Object.fromEntries(SECTION_ORDER.map(id => [id, []]));
  const seen = new Set();
  const shown = new Map();
  const add = (id, row) => {
    const n = normKey(row.key);
    if (n && seen.has(n)) return;
    if (n) seen.add(n);
    shown.set(shortKey(row.key) + '=' + stable(row.value), true);
    buckets[id].push(row);
  };

  if (cfg.model) add('model', makeRow('model', cfg.model, { label: 'Model', kind: 'text', source: src }));
  for (const m of cfg.configurable_models || []) {
    if (!m || !m.key) continue;
    const set = m.source && m.source !== 'default';
    const file = m.source === 'workspace'
      ? (files.find(f => /[\\/]\.vscode[\\/]/.test(f)) || src)
      : (files.find(f => !/[\\/]\.vscode[\\/]/.test(f)) || src);
    add('model', makeRow(m.key, set ? m.value : null, {
      label: m.label, kind: 'text', source: set ? file : '',
      note: [m.description, set ? '' : (m.default_hint ? `Default: ${m.default_hint}` : '')].filter(Boolean).join(' '),
    }));
  }

  const otel = cfg.otel || {};
  if (otel.enabled !== undefined || otel.source) {
    add('telemetry', makeRow('otel.enabled', !!otel.enabled, { label: 'OpenTelemetry export', kind: 'flag', note: TIPS.OTel.enabled }));
    if (otel.exporter) add('telemetry', makeRow('otel.exporter', otel.exporter, { label: 'Exporter', kind: 'text', group: 'OTel' }));
    if (otel.endpoint) add('telemetry', makeRow('otel.endpoint', otel.endpoint, { label: 'Endpoint', kind: 'text', group: 'OTel' }));
    if (otel.file_path) add('telemetry', makeRow('otel.file_path', otel.file_path, { label: 'Output file', kind: 'path', group: 'OTel' }));
    if (otel.capture_content !== undefined) add('telemetry', makeRow('otel.capture_content', !!otel.capture_content, { label: 'Capture content', kind: 'flag', group: 'OTel' }));
  }

  for (const [group, items] of Object.entries(cfg.feature_groups || {})) {
    const id = GROUP_SECTION[group] || 'other';
    for (const [k, v] of Object.entries(items || {})) add(id, makeRow(k, v, { source: src, group }));
  }

  const hasOtel = otel.enabled !== undefined || !!otel.source;
  for (const [k, v] of Object.entries(cfg.settings || {})) {
    const id = settingSection(k);
    if (id === 'telemetry' && hasOtel) continue;
    // The same setting read twice under two names (vimMode / vim_mode) shows once.
    if (shown.has(shortKey(k) + '=' + stable(v))) continue;
    add(id, makeRow(k, v, { source: src }));
  }

  if ((cfg.mcp_servers || []).length) add('mcp', makeRow('mcp_servers', cfg.mcp_servers, { label: 'Servers', kind: 'list', source: src }));
  if ((cfg.extensions || []).length) add('extensions', makeRow('extensions', cfg.extensions, { label: 'Installed', kind: 'list' }));
  if (cfg.auto_update === true || cfg.auto_update === false) add('startup', makeRow('auto_update', cfg.auto_update, { label: 'Automatic updates', kind: 'flag' }));
  if (cfg.launch_at_startup === true || cfg.launch_at_startup === false) add('startup', makeRow('launch_at_startup', cfg.launch_at_startup, { label: 'Start at login', kind: 'flag' }));

  return SECTION_ORDER.filter(id => buckets[id].length)
    .map(id => ({ id, title: SECTION_TITLES[id], rows: buckets[id] }));
}

function rank(id) {
  const i = SECTION_ORDER.indexOf(id);
  return i < 0 ? SECTION_ORDER.length : i;
}

/** The sections of one record, in the fixed order, with empty ones dropped. */
export function getSections(cfg) {
  const raw = Array.isArray(cfg?.sections) ? cfg.sections : buildSections(cfg || {});
  return raw
    .filter(s => s && Array.isArray(s.rows) && s.rows.length)
    .map(s => ({ ...s, title: s.title || SECTION_TITLES[s.id] || humanize(s.id) }))
    .sort((a, b) => rank(a.id) - rank(b.id));
}

// ─── Paths ───────────────────────────────────────────────────────
const HOME_RE = /^(\/Users\/[^/]+|\/home\/[^/]+|\/root|[A-Za-z]:\/Users\/[^/]+)(?=\/|$)/i;

/** Forward slashes, no trailing slash. One character per character, so indexes map back. */
export function normPath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/(.)\/+$/, '$1');
}

export function samePath(a, b) {
  return !!a && !!b && normPath(a) === normPath(b);
}

/** The home folder a path is in, in the path's own spelling, or ''. */
export function homeOf(p) {
  const s = String(p || '');
  if (s.startsWith('~')) return '~';
  const m = HOME_RE.exec(normPath(s));
  return m ? s.slice(0, m[1].length) : '';
}

function under(path, root) {
  const a = normPath(path);
  const b = normPath(root);
  return !!b && (a === b || a.startsWith(b + '/'));
}

/** `~` for the home folder of a POSIX path; Windows paths keep their drive. */
export function tildePath(p) {
  const s = String(p || '');
  const home = homeOf(s);
  if (!home || home === '~' || isWindowsPath(s)) return s;
  return '~' + s.slice(home.length);
}

/** Project folders: the snapshot root and the workspaces the tools have open, never a home folder itself. */
export function projectRoots(snap) {
  const raw = [snap?.root, ...(snap?.live_monitor?.workspace_paths || [])];
  const out = [];
  for (const r of raw) {
    if (!r || typeof r !== 'string') continue;
    const n = normPath(r);
    if (n === '/' || normPath(homeOf(r)) === n || /^[A-Za-z]:$/.test(n)) continue;
    if (!out.some(o => normPath(o) === n)) out.push(r);
  }
  return out;
}

// ─── Scope and override chain ────────────────────────────────────
export const SCOPES = ['default', 'user', 'project', 'workspace', 'env', 'policy', 'managed'];

export const SCOPE_LABELS = {
  default: 'Default', system: 'System', managed: 'Managed', policy: 'Policy', user: 'User', profile: 'Profile',
  project: 'Project', 'project-local': 'Project local', workspace: 'Workspace', env: 'Env', cli: 'CLI',
};

// Precedence used when a record has no `scopes` list: lowest first, the last one wins when set.
const SCOPE_RANK = ['system', 'user', 'profile', 'project', 'project-local', 'workspace', 'env', 'cli', 'managed', 'policy'];
// Scopes a person cannot change from this machine, used when a record has no `scopes` list.
const LOCKED_SCOPES = new Set(['system', 'managed', 'policy']);

export function scopeLabel(id, scopes = []) {
  const s = (scopes || []).find(x => x.id === id);
  return (s && s.label) || SCOPE_LABELS[id] || humanize(id || 'default');
}

/**
 * The configuration layers of one tool, lowest precedence first: the record's
 * `scopes`, or, without them, the scopes its rows carry. Each layer has the
 * files it was seen in (`paths`). Empty when the record has neither.
 */
export function toolScopes(cfg, rows) {
  const given = (rows || []).filter(r => r.scopeGiven && r.scope !== 'default');
  if (Array.isArray(cfg?.scopes) && cfg.scopes.length) {
    return cfg.scopes.filter(s => s && s.id).map(s => ({
      id: s.id, label: s.label || scopeLabel(s.id), path: s.path || '', paths: s.path ? [s.path] : [],
      exists: s.exists !== false, changeable: s.changeable !== false, note: s.note || '', given: true,
    }));
  }
  const ids = [...new Set(given.map(r => r.scope))];
  const at = id => { const i = SCOPE_RANK.indexOf(id); return i < 0 ? SCOPE_RANK.indexOf('cli') : i; };
  ids.sort((a, b) => at(a) - at(b));
  return ids.map(id => {
    const paths = [];
    for (const r of given) if (r.scope === id && r.source && !paths.some(p => samePath(p, r.source))) paths.push(r.source);
    return {
      id, label: scopeLabel(id), path: paths[0] || '', paths, exists: true,
      changeable: !LOCKED_SCOPES.has(id) && !given.some(r => r.scope === id && r.locked), note: '', given: false,
    };
  });
}

/** True when a chain entry comes from a layer the person cannot change. */
export function isLockedEntry(c, scopes = []) {
  if (!c) return false;
  if (c.locked === true) return true;
  const s = (scopes || []).find(x => x.id === c.scope);
  return !!s && s.changeable === false;
}

/** The highest layer a person can change that has a file, or null. */
export function writableScope(scopes = []) {
  for (let i = scopes.length - 1; i >= 0; i -= 1) {
    const s = scopes[i];
    if (s.changeable !== false && s.path) return s;
  }
  return null;
}

/** Scope from where the file is: user under the home folder, workspace in .vscode, project otherwise. */
export function deriveScope(source, roots = []) {
  const s = String(source || '');
  if (!s) return 'default';
  if (/[\\/]\.vscode[\\/]/.test(s)) return 'workspace';
  if (roots.some(r => under(s, r))) return 'project';
  if (homeOf(s)) return 'user';
  return 'project';
}

export function rowScope(row, roots = []) {
  return row && typeof row.scope === 'string' && row.scope ? row.scope : deriveScope(row?.source, roots);
}

export function rowLine(row) {
  const n = Number(row?.line);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** A chain entry with no value at its level. */
export function isUnset(c) {
  return !c || c.set === false || c.value === undefined;
}

/** The override chain, lowest level first, and the index of the entry that wins. */
export function rowChain(row, scope) {
  const chain = Array.isArray(row?.chain) ? row.chain.filter(c => c && typeof c === 'object') : [];
  if (!chain.length) {
    return { chain: [{ scope, value: row?.value, source: row?.source || '', line: rowLine(row) }], wins: 0 };
  }
  let wins = Number.isInteger(row.wins) && row.wins >= 0 && row.wins < chain.length ? row.wins : -1;
  if (wins < 0) wins = chain.findIndex(c => c.wins === true);
  if (wins < 0) wins = chain.findIndex(c => c.scope === scope && samePath(c.source, row.source));
  if (wins < 0) {
    for (let i = chain.length - 1; i >= 0; i -= 1) if (!isUnset(chain[i])) { wins = i; break; }
  }
  return { chain, wins: wins < 0 ? chain.length - 1 : wins };
}

function joinList(items, word) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' ' + word + ' ' + items[items.length - 1];
}

/** One sentence saying why the winning entry of a chain applies. */
export function whyWins(chain, wins) {
  const w = chain?.[wins];
  if (!w) return '';
  const name = w.scope === 'default' ? 'The default' : `The ${w.scope} ${w.source ? 'file' : 'value'}`;
  if (chain.length === 1) {
    return w.scope === 'default'
      ? 'No file sets this, so the default applies.'
      : `Only the ${w.scope} level sets this, so its value applies.`;
  }
  const above = chain.slice(wins + 1);
  const aboveSet = above.filter(c => !isUnset(c));
  const belowSet = chain.slice(0, wins).filter(c => !isUnset(c)).map(c => c.scope);
  if (!above.length) {
    return `${name} wins: ${w.scope} is the highest level that sets it${belowSet.length ? ', above ' + joinList(belowSet, 'and') : ''}.`;
  }
  if (!aboveSet.length) return `${name} wins because no ${joinList(above.map(c => c.scope), 'or')} value is set.`;
  return `${name} wins over the ${joinList(aboveSet.map(c => c.scope), 'and')} value: ${w.scope} takes precedence for this setting.`;
}

// ─── Values ──────────────────────────────────────────────────────
export function valueText(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v === true) return 'on true';
  if (v === false) return 'off false';
  if (Array.isArray(v)) return v.map(valueText).join(' ');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => k + ' ' + valueText(x)).join(' ');
  return String(v);
}

/** Short text of a value for labels: on/off, "N items", or the value. */
export function plainValue(v) {
  if (v === null || v === undefined || v === '') return DASH;
  if (v === true) return 'on';
  if (v === false) return 'off';
  if (Array.isArray(v)) return v.length + (v.length === 1 ? ' item' : ' items');
  if (typeof v === 'object') {
    const n = Object.keys(v).length;
    return n + (n === 1 ? ' item' : ' items');
  }
  return String(v);
}

// Text settings that take one of a few values, shown as a select box.
const OPTIONS = [
  [/exporter$/i, ['otlp-http', 'otlp-grpc', 'console', 'file']],
  [/effort(level)?$/i, ['minimal', 'low', 'medium', 'high', 'xhigh', 'max']],
  [/approval[._]?policy$|askforapproval$/i, ['untrusted', 'on-failure', 'on-request', 'never']],
  [/approval[._]?mode$/i, ['default', 'auto_edit', 'plan', 'yolo']],
  [/sandbox[._]?mode$/i, ['read-only', 'workspace-write', 'danger-full-access']],
  [/(^|\.)access$/i, ['all', 'registry', 'none']],
  [/autostart$/i, ['never', 'onlyNew', 'newAndOutdated']],
];

/** The values a text setting can take, or null when it is free text. */
export function optionsFor(row) {
  if (!row) return null;
  if (Array.isArray(row.options) && row.options.length) return row.options.map(String);
  const kind = row.kind || inferKind(row.value);
  if (kind !== 'text' || typeof row.value !== 'string' || !row.value) return null;
  const key = String(row.key || '');
  const label = String(row.label || '').replace(/\s+/g, '');
  for (const [re, opts] of OPTIONS) {
    if (re.test(key) || re.test(label)) return opts.includes(row.value) ? opts : [row.value, ...opts];
  }
  return null;
}

// ─── Tools ───────────────────────────────────────────────────────
export function labelOf(id, snap) {
  if (id === 'vscode') return 'VS Code';
  if (id === 'aictl') return 'aictl';
  return toolLabel(id, snap);
}

/** One row with everything the views need: scope, line, chain, risk and help text. */
export function enrichRow(row, tool, section, roots) {
  const scope = rowScope(row, roots);
  const agent = row.agent && typeof row.agent === 'object' ? row.agent : null;
  const { chain, wins } = rowChain(row, scope);
  return {
    ...row,
    uid: tool + '\u0001' + row.key,
    tool,
    sec: section.id,
    secTitle: section.title,
    label: row.label || humanize(row.key),
    kind: row.kind || inferKind(row.value),
    source: row.source || '',
    line: rowLine(row),
    scope,
    chain,
    wins,
    risky: !!row.danger,
    tip: rowTip(row, section.id),
    scopeGiven: typeof row.scope === 'string' && !!row.scope,
    locked: row.locked === true,
    // A row without `set` counts as set; one without `documented` as documented.
    unset: row.set === false,
    undocumented: row.documented === false,
    agent: agent ? { ...agent, tools: Array.isArray(agent.tools) ? agent.tools.map(String) : [] } : null,
  };
}

// ─── Agents ──────────────────────────────────────────────────────
export function isAgentRow(row) {
  return !!row && row.kind === 'agent' && !!row.agent;
}

/** True when the agent names no model of its own and runs on the session model. */
export function agentInherits(row) {
  const a = row?.agent;
  if (a && typeof a.inherits === 'boolean') return a.inherits;
  return row?.value === 'inherits' || row?.value === null || row?.value === undefined || row?.value === '';
}

/** True when a model pin in a settings file decides the agent's model. */
export function pinWins(row) {
  const a = row?.agent;
  if (!a || !a.pinned_in || agentInherits(row)) return false;
  const win = row.chain?.[row.wins];
  const src = (win && win.source) || row.source;
  return !src || samePath(src, a.pinned_in);
}

/** The model every agent in the list runs on, when they all name the same one; '' otherwise. */
export function commonModel(rows) {
  if (!rows.length || rows.some(agentInherits)) return '';
  const models = new Set(rows.map(r => String(r.value)));
  return models.size === 1 ? [...models][0] : '';
}

/** The agent's model decision: the agent file, the settings pin and the result, with the entry that wins and why. */
export function agentDecision(row) {
  const a = row.agent || {};
  const inherits = agentInherits(row);
  const pinned = pinWins(row);
  const pinEntry = a.pinned_in ? (row.chain || []).find(c => samePath(c.source, a.pinned_in)) : null;
  const pinValue = pinEntry && !isUnset(pinEntry) ? pinEntry.value : (pinned ? row.value : undefined);
  const steps = [
    { id: 'file', label: 'Agent file', value: a.model || undefined, source: a.defined_in || '', line: Number(a.defined_line) > 0 ? Number(a.defined_line) : 0 },
    { id: 'pin', label: 'Settings pin', value: pinValue, source: a.pinned_in || '', line: Number(a.pinned_line) > 0 ? Number(a.pinned_line) : 0, present: !!a.pinned_in },
    { id: 'effective', label: 'Effective', value: inherits ? 'inherits' : row.value },
  ];
  let wins = 2;
  let why;
  if (inherits) {
    why = 'Neither the agent file nor a settings pin names a model, so the agent runs on the session model.';
  } else if (pinned) {
    wins = 1;
    why = `The pin in ${baseName(a.pinned_in)} wins over ${a.model ? 'the model in the agent file' : 'the agent file, which names no model'}.`;
  } else {
    wins = 0;
    why = a.pinned_in
      ? (a.model_policy === 'required'
        ? 'The agent file requires its model, so it wins over the settings pin.'
        : `The model in the agent file applies; the pin in ${baseName(a.pinned_in)} does not decide it.`)
      : 'The agent file names the model and no settings pin applies.';
  }
  if (row.note) why += ' ' + row.note;
  return { steps, wins, why };
}

/** One entry per tool record, ordered like snap.tools (most active first); tools the snapshot does not list follow. */
export function toolEntries(snap) {
  const configs = Array.isArray(snap?.tool_configs) ? snap.tool_configs : [];
  const order = (snap?.tools || []).map(t => t.tool);
  const roots = projectRoots(snap);
  const entries = configs.filter(c => c && c.tool).map(cfg => {
    const sections = getSections(cfg).map(s => ({
      id: s.id, title: s.title, rows: s.rows.map(r => enrichRow(r, cfg.tool, s, roots)),
    }));
    const rows = sections.flatMap(s => s.rows);
    const files = [];
    for (const f of [...(cfg.config_files || []), ...rows.map(r => r.source)]) {
      if (f && !files.some(x => samePath(x, f))) files.push(f);
    }
    return {
      id: cfg.tool, label: labelOf(cfg.tool, snap), cfg, sections, rows, files,
      risky: rows.filter(r => r.risky).length, hints: cfg.hints || [],
      scopes: toolScopes(cfg, rows),
    };
  });
  const at = id => {
    const i = order.indexOf(id);
    return i < 0 ? order.length + (id === 'vscode' ? 1 : 0) : i;
  };
  return entries.map((e, i) => ({ e, i })).sort((a, b) => at(a.e.id) - at(b.e.id) || a.i - b.i).map(x => x.e);
}

/**
 * The snapshot shape the functions here read, built from a settings source: the
 * tool records under the tool filter, the tool names, aictl's collectors and the project root.
 */
export function snapOf({ toolConfigs, tools, monitor, root = '', enabledTools = null } = {}) {
  if (!Array.isArray(toolConfigs)) return null;
  return {
    root,
    tools: Array.isArray(tools) ? tools : [],
    tool_configs: toolConfigs.filter(c => isConfigSelected(c, enabledTools)),
    live_monitor: monitor || {},
  };
}

/** Counts for a summary line: settings a file sets, unset knobs, risky rows and agents. */
export function settingsSummary(entries) {
  const rows = entries.flatMap(e => e.rows);
  return {
    set: rows.filter(r => !r.unset).length,
    unset: rows.filter(r => r.unset).length,
    // The unset count means something once the server says, per row, whether a file sets it.
    knowsSet: rows.some(r => typeof r.set === 'boolean'),
    risky: entries.reduce((n, e) => n + e.risky, 0),
    agents: rows.filter(isAgentRow).length,
  };
}

/** The aictl engine: its collectors and the folders it watches. Null when there is neither. */
export function aictlEntry(snap) {
  const lm = snap?.live_monitor || {};
  const collectors = Object.entries(lm.diagnostics || {}).map(([name, d]) => ({
    name, mode: d?.mode || '', status: d?.status || 'unknown', detail: d?.detail || '',
  }));
  const roots = [...(lm.workspace_paths || []), ...(lm.state_paths || [])].filter(Boolean);
  if (!collectors.length && !roots.length) return null;
  return { id: 'aictl', label: 'aictl', collectors, roots };
}

// ─── Filters ─────────────────────────────────────────────────────
export function matchRow(row, q) {
  if (!q) return true;
  const parts = [row.label, row.key, valueText(row.value), baseName(row.source)];
  const a = row.agent;
  if (a) parts.push(a.name, a.model, ...(a.tools || []), baseName(a.defined_in), baseName(a.pinned_in));
  return parts.filter(Boolean).join('\n').toLowerCase().includes(q.toLowerCase());
}

/** Row filter from the search box and the toggles. Unset rows show only with `unset`. */
export function rowFilter({ q = '', nonDefault = false, risky = false, unset = false } = {}) {
  const query = q.trim().toLowerCase();
  return row => matchRow(row, query)
    && (!nonDefault || (row.scope !== 'default' && !row.unset && !(isAgentRow(row) && agentInherits(row))))
    && (!risky || row.risky)
    && (unset || !row.unset);
}

// ─── By topic ────────────────────────────────────────────────────
/** One matrix for a section: columns are the tools with rows there, rows merge settings that share a label or key. */
export function topicMatrix(entries, secId, pass = () => true) {
  const tools = entries.filter(e => e.rows && e.rows.some(r => r.sec === secId));
  const groups = [];
  const byLabel = new Map();
  const byKey = new Map();
  for (const e of tools) {
    for (const r of e.rows) {
      if (r.sec !== secId) continue;
      const lk = normText(r.label);
      const kk = normKey(r.key);
      let g = byLabel.get(lk) || byKey.get(kk);
      if (g && g.cells[e.id]) g = null;
      if (!g) {
        g = { id: 'g' + groups.length, label: r.label, keys: [], cells: {} };
        groups.push(g);
      }
      if (!byLabel.has(lk)) byLabel.set(lk, g);
      if (!byKey.has(kk)) byKey.set(kk, g);
      g.cells[e.id] = r;
      if (!g.keys.includes(r.key)) g.keys.push(r.key);
    }
  }
  const rows = groups.filter(g => Object.values(g.cells).some(pass));
  return { tools, rows };
}

// ─── Files ───────────────────────────────────────────────────────
export const LOCATIONS = [
  { id: 'home', label: 'Home folder' },
  { id: 'tool-home', label: 'Tool folders' },
  { id: 'project', label: 'This project' },
  { id: 'vscode-user', label: 'VS Code user folder' },
  { id: 'other', label: 'Other' },
];
export const LOCATION_LABELS = Object.fromEntries(LOCATIONS.map(l => [l.id, l.label]));
/** Short location names, for the columns of the Files summary. */
export const LOCATION_SHORT = { home: 'Home', 'tool-home': 'Tool folders', project: 'This project', 'vscode-user': 'VS Code user', other: 'Other' };

/** What a file is for, from its `kind`. Any other kind counts as Other. */
export const PURPOSES = [
  { id: 'settings', label: 'Settings' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'agents', label: 'Agents' },
  { id: 'skills', label: 'Skills' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'memory', label: 'Memory' },
  { id: 'hooks', label: 'Hooks' },
  { id: 'mcp', label: 'MCP' },
  { id: 'other', label: 'Other' },
];
export const PURPOSE_LABELS = Object.fromEntries(PURPOSES.map(p => [p.id, p.label]));

export function purposeOf(f) {
  return PURPOSE_LABELS[f?.kind] ? f.kind : 'other';
}

/** Git states the Files filter offers, in this order. */
export const GIT_STATES = [
  { id: 'tracked', label: 'Tracked' },
  { id: 'ignored', label: 'Ignored' },
  { id: 'untracked', label: 'Untracked' },
  { id: 'outside', label: 'Outside a repository' },
];

/** The Git filter value of a file, or '' when git says nothing about it. */
export function gitCategory(f) {
  const g = String(f?.git_state || '').toLowerCase();
  if (!g) return '';
  if (g.includes('ignored')) return 'ignored';
  if (g.includes('untracked') || g.includes('not tracked')) return 'untracked';
  if (g.includes('outside')) return 'outside';
  if (g.includes('tracked') || g.includes('modified')) return 'tracked';
  return '';
}

/** True when git leaves the file out of review while a tool always loads it. */
export function gitRisk(f) {
  const g = gitCategory(f);
  return (g === 'ignored' || g === 'untracked') && f?.loading === 'always';
}

const CONFIG_DIRS = new Set(['.claude', '.github', '.vscode', '.cursor', '.codex', '.gemini', '.copilot', '.windsurf']);

export function dirOf(s) {
  const i = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
  return i > 0 ? s.slice(0, i) : s;
}

/** Where a file lives, and the folder it is grouped under. */
export function deriveLocation(path, roots = []) {
  const s = String(path || '');
  const n = normPath(s);
  const vs = n.indexOf('/.vscode/');
  const root = roots.find(r => under(n, r));
  if (root) return { location: 'project', location_root: root };
  if (vs > 0) return { location: 'project', location_root: s.slice(0, vs) };
  const code = /^(.*\/(?:Code|Code - Insiders|VSCodium)\/User)(\/|$)/.exec(n);
  if (code) return { location: 'vscode-user', location_root: s.slice(0, code[1].length) };
  const home = homeOf(s);
  if (home) {
    const rest = n.slice(normPath(home).length + 1).split('/').filter(Boolean);
    if (rest.length > 1 && rest[0].startsWith('.')) {
      return { location: 'tool-home', location_root: s.slice(0, home.length + 1 + rest[0].length) };
    }
    if (rest.length > 3 && (rest[0] === 'Library' || rest[0] === 'AppData')) {
      const len = home.length + 1 + rest.slice(0, 3).join('/').length;
      return { location: 'tool-home', location_root: s.slice(0, len) };
    }
    if (rest.length <= 1) return { location: 'home', location_root: home };
  }
  let dir = dirOf(s);
  while (CONFIG_DIRS.has(baseName(dir)) && dirOf(dir) !== dir) dir = dirOf(dir);
  return { location: 'other', location_root: dir };
}

function guessKind(path) {
  const name = baseName(path).toLowerCase();
  if (/mcp/.test(name)) return 'mcp';
  if (/^(agents|claude|gemini|copilot-instructions)\.md$|\.instructions\.md$/.test(name)) return 'instructions';
  if (/\.agent\.md$/.test(name)) return 'agents';
  if (/\.prompt\.md$/.test(name)) return 'prompts';
  if (/\.md$/.test(name)) return 'memory';
  return 'settings';
}

/**
 * Files from /api/settings/files, merged with every file the tool records name
 * (config_files and row sources), so the view works before that endpoint exists.
 * A file is kept when it names no tool or a selected tool.
 */
export function mergeFiles(apiFiles, entries, roots = [], enabledTools = null) {
  const out = [];
  const find = p => out.find(f => samePath(f.path, p));
  const add = (f) => {
    const have = find(f.path);
    if (have) {
      for (const t of f.tools || []) if (!have.tools.includes(t)) have.tools.push(t);
      return have;
    }
    const loc = deriveLocation(f.path, roots);
    const rec = {
      name: baseName(f.path), location: loc.location, location_root: loc.location_root,
      scope: deriveScope(f.path, roots), kind: guessKind(f.path), settings: null,
      bytes: null, mtime: null, git_state: '', exists: true,
      ...f,
      tools: [...(f.tools || [])],
    };
    if (!rec.location_root) rec.location_root = loc.location_root;
    if (!LOCATION_LABELS[rec.location]) rec.location = 'other';
    out.push(rec);
    return rec;
  };
  for (const f of Array.isArray(apiFiles) ? apiFiles : []) if (f && f.path) add(f);
  for (const e of entries) {
    for (const p of e.files) add({ path: p, tools: [e.id] });
  }
  for (const f of out) {
    const rows = entries.flatMap(e => e.rows.filter(r => samePath(r.source, f.path)));
    f.rows = rows;
    if (f.settings === null || f.settings === undefined) f.settings = rows.length;
  }
  return out.filter(f => !f.tools.length || f.tools.some(t => isToolSelected(t, enabledTools)))
    .map(f => ({ ...f, tools: f.tools.filter(t => isToolSelected(t, enabledTools)) }));
}

/** Managed layers a record lists that are absent on this machine: where a policy would come from. Needs `scopes`. */
export function absentManaged(entries) {
  const out = [];
  for (const e of entries || []) {
    for (const s of e.scopes || []) {
      if (!s.given || s.exists || s.changeable || !s.path) continue;
      const have = out.find(x => samePath(x.path, s.path));
      if (have) { if (!have.tools.includes(e.id)) have.tools.push(e.id); continue; }
      out.push({ path: s.path, name: baseName(s.path), scope: s.id, label: s.label, note: s.note, tools: [e.id] });
    }
  }
  return out;
}

export function matchFile(f, q) {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  return !s || [f.name, f.path, f.kind, ...(f.rows || []).map(r => r.label)].join('\n').toLowerCase().includes(s);
}

/** Files under one group, by the folder each is in: the folder once, then its files. */
export function fileFolders(files) {
  const by = new Map();
  for (const f of files) {
    const d = dirOf(f.path);
    if (!by.has(d)) by.set(d, { dir: d, files: [] });
    by.get(d).files.push(f);
  }
  const out = [...by.values()].sort((a, b) => a.dir.localeCompare(b.dir));
  for (const g of out) g.files.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Files grouped by purpose, in the PURPOSES order. */
export function purposeGroups(files) {
  return PURPOSES.map(p => ({ id: p.id, label: p.label, files: files.filter(f => purposeOf(f) === p.id) }))
    .filter(g => g.files.length);
}

/** Counts by purpose (rows) and location (columns), for the Files summary. */
export function fileMatrix(files) {
  const cells = {};
  for (const f of files) {
    const p = purposeOf(f);
    const l = LOCATION_LABELS[f.location] ? f.location : 'other';
    cells[p] = cells[p] || {};
    cells[p][l] = (cells[p][l] || 0) + 1;
  }
  const rows = PURPOSES.filter(p => cells[p.id]).map(p => ({
    ...p, cells: cells[p.id], total: Object.values(cells[p.id]).reduce((a, b) => a + b, 0),
  }));
  return { rows, cols: LOCATIONS.map(l => ({ id: l.id, label: LOCATION_SHORT[l.id] })) };
}

/** Files grouped by the folder they live in, groups in location order. */
export function fileGroups(files) {
  const by = new Map();
  for (const f of files) {
    const k = f.location_root || dirOf(f.path);
    if (!by.has(k)) by.set(k, { root: k, location: f.location, files: [] });
    by.get(k).files.push(f);
  }
  const at = id => LOCATIONS.findIndex(l => l.id === id);
  return [...by.values()].sort((a, b) => at(a.location) - at(b.location) || a.root.localeCompare(b.root));
}

// ─── Findings ────────────────────────────────────────────────────
export const SEVERITY_RANK = { high: 0, medium: 1, low: 2, info: 3 };

export function findingId(f) {
  return [f.rule || '', f.path || '', f.line || 0, f.tool || '', f.session_id || ''].join('|');
}

/** Each finding with an `id` that is unique in the list and stable across renders. */
export function withFindingIds(findings) {
  const seen = new Map();
  return (findings || []).map(f => {
    const base = findingId(f);
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return { ...f, id: n ? base + '#' + n : base };
  });
}

export function findingTools(f) {
  if (Array.isArray(f?.tools) && f.tools.length) return f.tools;
  return f?.tool ? [f.tool] : [];
}

export function ruleLabel(rule) {
  const s = String(rule || 'other').replace(/[_-]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : 'Other';
}

export function matchFinding(f, q) {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  return !s || [f.rule, ruleLabel(f.rule), f.path, f.why, f.action, baseName(f.path)].join('\n').toLowerCase().includes(s);
}

/** Findings grouped by rule, worst severity first, with the reason the group shares. */
export function findingGroups(findings) {
  const by = new Map();
  for (const f of findings || []) {
    const k = f.rule || 'other';
    if (!by.has(k)) by.set(k, { rule: k, label: ruleLabel(k), items: [] });
    by.get(k).items.push(f.id ? f : { ...f, id: findingId(f) });
  }
  return [...by.values()].map(g => {
    const whys = [...new Set(g.items.map(f => f.why || ''))];
    const tools = [...new Set(g.items.flatMap(findingTools))];
    const severity = g.items.reduce((s, f) => ((SEVERITY_RANK[f.severity] ?? 9) < (SEVERITY_RANK[s] ?? 9) ? f.severity : s), 'info');
    return { ...g, count: g.items.length, why: whys.length === 1 ? whys[0] : '', tools, severity, alarm: severity === 'high' || severity === 'medium' };
  }).sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) || b.count - a.count);
}

// ─── URL state ───────────────────────────────────────────────────
// ?tab=config&pivot=topic&tool=vscode&sec=autonomy&row=<key>&scope=user&unset=1
// sec is a section id (by tool, by topic), a location (files) or a rule (findings);
// row is a setting key, a file path or a finding id; tool is the "Read by" filter in files;
// scope filters By tool to the rows set at one layer; unset shows the knobs no file sets.
export const PIVOTS = ['tool', 'topic', 'files', 'findings'];

// In Files, tool and sec are comma lists (Read by, Location), and these narrow it further:
// group (location | purpose), purpose, fscope, git (comma lists), recent (changed in 24 h)
// and cell (one summary cell, "purpose:location").
export const FILE_PARAMS = ['purpose', 'fscope', 'git', 'recent', 'cell'];

export function readSettingsUrl(search) {
  const q = new URLSearchParams(search || '');
  const view = q.get('pivot');
  return {
    view: PIVOTS.includes(view) ? view : 'tool',
    tool: q.get('tool') || '',
    sec: q.get('sec') || '',
    row: q.get('row') || '',
    scope: q.get('scope') || '',
    unset: q.get('unset') === '1',
    group: q.get('group') === 'purpose' ? 'purpose' : 'location',
    purpose: q.get('purpose') || '',
    fscope: q.get('fscope') || '',
    git: q.get('git') || '',
    recent: q.get('recent') === '1',
    cell: q.get('cell') || '',
  };
}

export function settingsParams(st) {
  return {
    pivot: st.view && st.view !== 'tool' ? st.view : null,
    tool: st.tool || null,
    sec: st.sec || null,
    row: st.row || null,
    scope: st.scope || null,
    unset: st.unset ? '1' : null,
    group: st.group === 'purpose' ? 'purpose' : null,
    purpose: st.purpose || null,
    fscope: st.fscope || null,
    git: st.git || null,
    recent: st.recent ? '1' : null,
    cell: st.cell || null,
  };
}

/** A comma list from the URL as an array, and back. */
export const listOf = s => (s ? String(s).split(',').filter(Boolean) : []);
export const listParam = a => a.join(',');

export const CLEAR_PARAMS = {
  pivot: null, tool: null, sec: null, row: null, scope: null, unset: null,
  group: null, purpose: null, fscope: null, git: null, recent: null, cell: null,
};
