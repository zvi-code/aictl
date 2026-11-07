import { useContext, useMemo, useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS } from '../utils.js';
import { Icon, ToolIcon } from './ui/index.js';
import ToolScopeEmpty from './ui/ToolScopeEmpty.js';
import { isFiltered } from '../utils/toolScope.js';

// ─── Tooltip descriptions ────────────────────────────────────────
// Group-scoped tips: outer key is the settings-group name the setting is
// rendered under (matching feature_groups from the backend, plus "OTel" for
// the OTel block). Short keys like `enabled`, `webSearch`, or `temperature`
// mean different things in different groups, so group entries win over the
// flat fallback below.
const TIPS = {
  OTel: {
    enabled:            'Whether OpenTelemetry export is active. Required for verified token counts and session traces.',
    exporter:           'Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.',
    endpoint:           'OTLP collector endpoint receiving telemetry data.',
    file_path:          'Local file path for telemetry output (file exporter).',
    capture_content:    'When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.',
    source:             'How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).',
  },
  // Copilot agent mode
  'Agent Mode': {
    enabled:            'Whether agent/agentic mode is active.',
  },
  // VS Code platform agent (chat.agent.*)
  Agent: {
    enabled:            'Whether agent/agentic mode is active.',
  },
  'Claude (Anthropic)': {
    temperature:        'Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.',
    webSearch:          'Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.',
  },
  'Cowork (Autonomous)': {
    webSearch:          'Allows Cowork mode to perform live web searches as part of autonomous tasks.',
    scheduledTasks:     'Enables Cowork mode to schedule and run tasks on a timer.',
    allowAllBrowserActions: 'Grants Cowork mode permission to take any browser action without per-action confirmation.',
  },
};

// Flat fallback — setting keys whose meaning is unambiguous across groups.
const TIPS_FLAT = {
  // Agent Mode
  autoFix:              'When on, the agent automatically attempts to fix errors it detects during a run without asking.',
  editorContext:        'Ensures the agent always includes your active editor file as primary context for every request.',
  largeResultsToDisk:   'Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.',
  historySummarizationMode: 'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',
  maxRequests:          'Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.',
  plugins:              'Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.',
  // Debug Logging
  fileLogging:          'Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.',
  requestLoggerMaxEntries: 'Number of recent LLM requests retained in the in-memory request logger for debugging.',
  // CLI Mode
  mcp:                  'Enables MCP server support when running in CLI/autonomous mode.',
  worktreeIsolation:    'When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.',
  autoCommit:           'The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.',
  branchSupport:        'Allows the CLI agent to create and switch git branches during a task.',
  // Memory
  local:                'Local in-process memory tool — agent can store and recall facts within a session.',
  github:               'GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).',
  viewImage:            'Allows the agent to read and process image files (requires a multimodal model).',
  // Session targets / agent
  claudeTarget:         'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',
  autopilot:            'Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.',
  autoReply:            'Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.',
  // Safety
  terminalSandbox:      'Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.',
  terminalAutoApprove:  'Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.',
  autoApproveNpmScripts:'Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.',
  globalAutoApprove:    'YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.',
  autoApprove:          'Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.',
  terminal_sandbox:     'Runs terminal commands in a sandboxed environment to prevent destructive operations.',
  // Context Files
  applyingInstructions: 'Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.',
  claudeMd:             'Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.',
  agentsMd:             'Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.',
  nestedAgentsMd:       'When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.',
  // File Locations
  instructions:         'Search locations for .instructions.md files that are automatically attached to matching requests.',
  agents:               'Search locations for .agent.md custom agent definition files.',
  skills:               'Search locations for SKILL.md agent skill files.',
  prompts:              'Search locations for .prompt.md reusable prompt files.',
  // MCP
  access:               'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',
  autostart:            '"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',
  discovery:            'Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).',
  // Hooks
  claudeHooks:          'When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).',
  customAgentHooks:     'When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.',
  locations:            'File paths where hook configuration files are loaded from. Relative to workspace root.',
  // Claude (Anthropic)
  thinkingBudget:       'Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.',
  thinkingEffort:       'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',
  skipPermissions:      'Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.',
  // Claude Code settings
  effortLevel:          'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',
  hooks:                'Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).',
  installMethod:        'How Claude Code was installed (native, npm, homebrew, etc.).',
  hasCompletedOnboarding: 'Whether the initial Claude Code onboarding flow has been completed.',
  project_settings:     'A .claude/settings.json exists in this project with project-specific configuration.',
  project_permissions:  'Project settings include a permissions block controlling tool access.',
  // Gemini CLI
  vimMode:              'Enables Vim-style keybindings in the Gemini CLI.',
  approvalMode:         'Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).',
  notifications:        'Enables OS notifications for prompt alerts and session completion.',
  respectGeminiIgnore:  'Controls whether the CLI respects patterns in .geminiignore files.',
  additionalIgnores:    'Number of extra patterns added to the global file ignore list.',
  lineNumbers:          'Shows line numbers in code blocks within the chat interface.',
  alternateScreen:      'Uses the terminal alternate buffer to preserve shell scrollback history.',
  hideContext:          'Hides the summary of attached files/context above the input prompt.',
  // Gemini CLI - Thinking
  effort:               'Reasoning effort level for the model (e.g., standard, high).',
  temperature:          'Sampling temperature for model requests. 0 = deterministic; higher = more creative.',
  budget:               'Maximum token budget for reasoning/extended thinking.',
  // Gemini CLI - Agent
  coreTools:            'Number of built-in tools explicitly enabled for the agent.',
  excludeTools:         'Number of tools explicitly disabled for safety or cost control.',
  customAgents:         'Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).',
  // Claude Desktop modes
  sidebarMode:          'Controls whether Claude Desktop opens as a sidebar or full window.',
  trustedFolders:       'Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.',
  livePreview:          'Enables the live preview pane that shows rendered output during Code mode tasks.',
};

function tip(key, group) {
  return (group && TIPS[group] && TIPS[group][key]) || TIPS_FLAT[key] || '';
}

// ─── Sections ────────────────────────────────────────────────────
// Every tool card shows the same sections, in this order, with the rows the
// server sends in `sections`. An older server sends only feature_groups and
// settings; buildSections turns those into the same shape.
export const SECTION_ORDER = ['model', 'telemetry', 'autonomy', 'context', 'hooks', 'mcp', 'extensions', 'startup', 'other'];
export const SECTION_TITLES = {
  model: 'Model',
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

// Keys that remove a human confirmation step when they are on.
const DANGER_KEYS = new Set([
  'globalAutoApprove', 'autoApprove', 'autoReply', 'autopilot', 'skipPermissions',
  'allowAllBrowserActions', 'autoCommit', 'dangerouslySkipPermissions', 'yolo',
]);

function lastSegment(key) {
  const parts = String(key || '').split('.');
  return parts[parts.length - 1];
}

function normKey(key) {
  return String(key || '').replace(/^github\.copilot\./, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function shortKey(key) {
  const parts = String(key || '').split(/[._]/).filter(Boolean);
  return normKey(parts[parts.length - 1]);
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

function inferKind(v) {
  if (typeof v === 'boolean') return 'flag';
  if (typeof v === 'number') return 'number';
  if (Array.isArray(v)) return 'list';
  if (v && typeof v === 'object') return 'map';
  if (typeof v === 'string' && /^(~|\/|[A-Za-z]:\\)/.test(v)) return 'path';
  return 'text';
}

// True when a value turns its setting on: true, a non-empty list or map, a
// positive number, or a string other than an "off" word.
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

function makeRow(key, value, extra = {}) {
  return {
    key,
    label: extra.label || humanize(key),
    value: value === undefined ? null : value,
    kind: extra.kind || inferKind(value),
    source: extra.source || '',
    danger: extra.danger ?? DANGER_KEYS.has(lastSegment(key)),
    note: extra.note || '',
    group: extra.group,
  };
}

// Builds the `sections` shape from the fields an older server sends.
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
    // A setting already shown under the same name with the same value is the
    // same setting read twice (vimMode / vim_mode, maxRequests / agent_maxRequests).
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

// The sections of one record, in the fixed order, with empty ones dropped.
export function getSections(cfg) {
  const raw = Array.isArray(cfg?.sections) ? cfg.sections : buildSections(cfg || {});
  return raw
    .filter(s => s && Array.isArray(s.rows) && s.rows.length)
    .map(s => ({ ...s, title: s.title || SECTION_TITLES[s.id] || humanize(s.id) }))
    .sort((a, b) => rank(a.id) - rank(b.id));
}

function rank(id) {
  const i = SECTION_ORDER.indexOf(id);
  return i < 0 ? SECTION_ORDER.length : i;
}

function sectionRows(sections, id) {
  return (sections.find(s => s.id === id) || {}).rows || [];
}

function allRows(sections) {
  return sections.flatMap(s => s.rows);
}

function rowCount(v) {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === 'object') return Object.keys(v).length;
  return 0;
}

// ─── Glance values ───────────────────────────────────────────────
const DASH = '—';

function plain(v) {
  if (v === null || v === undefined || v === '') return DASH;
  if (v === true) return 'on';
  if (v === false) return 'off';
  return String(v);
}

function dangerOn(row) {
  return !!row.danger && isOn(row.value);
}

// "skipped" or "approve all" when an autonomy danger row is on, else null.
export function permissionState(sections) {
  const on = sectionRows(sections, 'autonomy').filter(dangerOn);
  if (!on.length) return null;
  return on.some(r => /skip|bypass|dangerous|yolo/i.test(r.key)) ? 'skipped' : 'approve all';
}

export function glance(cfg, sections) {
  const model = sectionRows(sections, 'model');
  const rows = allRows(sections);
  const modelRow = model.find(r => !/effort|thinking|reasoning|budget/i.test(r.key) && r.value !== null && r.value !== '');
  const effortRow = model.find(r => /effort|reasoning/i.test(r.key)) || rows.find(r => /effort|reasoning/i.test(r.key));

  const tel = sectionRows(sections, 'telemetry');
  const telFlag = tel.find(r => r.kind === 'flag' && /enabled|otel|telemetry/i.test(r.key));
  const telOn = cfg.otel?.enabled ?? (telFlag ? telFlag.value === true : undefined);
  const endpoint = cfg.otel?.endpoint || (tel.find(r => /endpoint/i.test(r.key)) || {}).value;
  const telemetry = telOn === true ? (endpoint || cfg.otel?.exporter || 'on') : telOn === false ? 'off' : DASH;

  const hooks = sectionRows(sections, 'hooks');
  let hooksText = DASH;
  if (hooks.length) {
    const counted = hooks.filter(r => r.kind === 'list' || r.kind === 'map');
    if (counted.length) hooksText = String(counted.reduce((n, r) => n + rowCount(r.value), 0));
    else {
      const flags = hooks.filter(r => r.kind === 'flag');
      hooksText = flags.length ? (flags.some(r => r.value === true) ? 'on' : 'off') : String(hooks.length);
    }
  }

  const mcpRows = sectionRows(sections, 'mcp');
  const mcpCounted = mcpRows.filter(r => r.kind === 'list' || r.kind === 'map');
  const mcp = mcpCounted.length
    ? mcpCounted.reduce((n, r) => n + rowCount(r.value), 0)
    : (cfg.mcp_servers || []).length;

  const startupRows = sectionRows(sections, 'startup');
  const startFlag = cfg.launch_at_startup ?? (startupRows.find(r => r.kind === 'flag' && /startup|launch|login/i.test(r.key)) || {}).value;
  const updFlag = cfg.auto_update ?? (startupRows.find(r => r.kind === 'flag' && /update/i.test(r.key)) || {}).value;

  const files = [...new Set([...(cfg.config_files || []), ...rows.map(r => r.source).filter(Boolean)])];

  return {
    model: plain(modelRow ? modelRow.value : cfg.model),
    effort: plain(effortRow && effortRow.value),
    telemetry,
    telemetryOn: telOn === true,
    permission: permissionState(sections),
    hooks: hooksText,
    mcp,
    startup: startFlag === true ? 'yes' : startFlag === false ? 'no' : DASH,
    updates: updFlag === true ? 'auto' : updFlag === false ? 'off' : DASH,
    files,
  };
}

// ─── Merging tools that read the same files ──────────────────────
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  return JSON.stringify(v ?? null);
}

// Groups records whose config_files and settings are identical; each group
// becomes one card. Records with no config files are never merged.
export function groupConfigs(configs) {
  const groups = [];
  const bySig = new Map();
  for (const cfg of configs) {
    const files = cfg.config_files || [];
    const sig = files.length ? stable([[...files].sort(), cfg.settings || {}]) : null;
    if (sig && bySig.has(sig)) { bySig.get(sig).push(cfg); continue; }
    const g = [cfg];
    groups.push(g);
    if (sig) bySig.set(sig, g);
  }
  return groups;
}

// ─── Value rendering ─────────────────────────────────────────────
const SHOW = 6;

function baseName(p) {
  const parts = String(p).split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || String(p);
}

function itemText(v) {
  if (v === null || v === undefined) return DASH;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function MoreButton({ hidden, open, onToggle }) {
  return html`<button type="button" class="cfg-more" aria-expanded=${open ? 'true' : 'false'}
    onClick=${onToggle}>${open ? 'show less' : `+${hidden} more`}</button>`;
}

function ListValue({ items }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, SHOW);
  const hidden = items.length - SHOW;
  if (!items.length) return html`<span class="cfg-val--none">none</span>`;
  return html`<span class="cfg-pills">
    ${shown.map((it, i) => html`<span key=${i} class="cfg-pill mono" title=${itemText(it)}>${itemText(it)}</span>`)}
    ${hidden > 0 && html`<${MoreButton} hidden=${hidden} open=${open} onToggle=${() => setOpen(!open)}/>`}
  </span>`;
}

function MapValue({ map }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(map);
  const shown = open ? entries : entries.slice(0, SHOW);
  const hidden = entries.length - SHOW;
  if (!entries.length) return html`<span class="cfg-val--none">none</span>`;
  return html`<span class="cfg-map">
    ${shown.map(([k, v]) => html`<span key=${k} class="cfg-map__line mono" title=${`${k}: ${itemText(v)}`}>
      <span class="cfg-map__key">${k}:</span> ${itemText(v)}</span>`)}
    ${hidden > 0 && html`<${MoreButton} hidden=${hidden} open=${open} onToggle=${() => setOpen(!open)}/>`}
  </span>`;
}

function PathValue({ path }) {
  const s = String(path);
  const cut = Math.max(0, s.length - 24);
  return html`<span class="cfg-path mono" title=${s}>
    <span class="cfg-path__head">${s.slice(0, cut)}</span><span class="cfg-path__tail">${s.slice(cut)}</span>
  </span>`;
}

export function Value({ row }) {
  const v = row.value;
  const kind = row.kind || inferKind(v);
  if (kind === 'flag') {
    if (v === null || v === undefined) return html`<span class="cfg-val--none">${DASH}</span>`;
    return isOn(v)
      ? html`<span class="cfg-flag cfg-flag--on">on</span>`
      : html`<span class="cfg-flag cfg-flag--off">off</span>`;
  }
  if (v === null || v === undefined || v === '') return html`<span class="cfg-val--none">${DASH}</span>`;
  if (kind === 'list' || Array.isArray(v)) return html`<${ListValue} items=${Array.isArray(v) ? v : [v]}/>`;
  if (kind === 'map' || (v && typeof v === 'object')) {
    return html`<${MapValue} map=${v && typeof v === 'object' ? v : { value: v }}/>`;
  }
  if (kind === 'path') return html`<${PathValue} path=${v}/>`;
  return html`<span class="cfg-text mono" title=${String(v)}>${String(v)}</span>`;
}

function rowTip(row, sectionId) {
  const k = lastSegment(row.key);
  return row.note
    || (row.group && TIPS[row.group] && TIPS[row.group][k])
    || (sectionId === 'telemetry' && TIPS.OTel[k.replace(/^otel_?/, '')])
    || tip(k, row.group)
    || '';
}

function SettingRow({ row, sectionId }) {
  const t = rowTip(row, sectionId);
  const alarm = dangerOn(row);
  // The tooltip ends with the setting's own key, so the row can be found in its file.
  const tip = [t, row.key && row.key !== row.label ? 'Setting: ' + row.key : ''].filter(Boolean).join('\n');
  return html`<div class=${'cfg-row' + (alarm ? ' cfg-row--danger' : '')}>
    <div class="cfg-row__label">
      <span class=${tip ? 'cfg-help' : ''} title=${tip || undefined}>${row.label || humanize(row.key)}${t && html`<span class="cfg-help__mark" aria-hidden="true">?</span>`}</span>
      ${alarm && t && html`<div class="cfg-row__note">${t}</div>`}
    </div>
    <div class="cfg-row__value"><${Value} row=${row}/></div>
    <div class="cfg-row__source mono" title=${row.source || undefined}>${row.source ? baseName(row.source) : ''}</div>
  </div>`;
}

function SectionBlock({ section }) {
  return html`<section class="cfg-section" data-section=${section.id}>
    <h4 class="cfg-section__title">${section.title}</h4>
    <div class="cfg-rows">
      ${section.rows.map((r, i) => html`<${SettingRow} key=${r.key + ':' + i} row=${r} sectionId=${section.id}/>`)}
    </div>
  </section>`;
}

function Hints({ hints }) {
  if (!hints || !hints.length) return null;
  return html`<div class="cfg-note">
    ${hints.map((h, i) => html`<p key=${i} class="cfg-note__line">${h}</p>`)}
  </div>`;
}

// ─── Card ────────────────────────────────────────────────────────
function dangerBadge(sections) {
  const perm = permissionState(sections);
  const on = allRows(sections).filter(dangerOn);
  if (!on.length) return null;
  const text = perm === 'skipped' ? 'Permission checks skipped'
    : perm === 'approve all' ? 'Approve all' : 'Risky setting on';
  return html`<span class="badge cfg-badge--danger" title=${on.map(r => r.label || humanize(r.key)).join(', ')}>
    <${Icon} name="alert-triangle" size="0.9em"/> ${text}</span>`;
}

function ToolCard({ group, labelMap }) {
  const cfg = group[0];
  const sections = getSections(cfg);
  const hints = cfg.hints || [];
  if (!sections.length && !hints.length) return null;
  const labels = group.map(c => labelMap[c.tool] || (c.tool === 'vscode' ? 'VS Code' : c.tool));
  const title = labels.length > 1
    ? labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1]
    : labels[0];
  const g = glance(cfg, sections);
  const color = COLORS[cfg.tool] || 'var(--fg2)';
  const slim = !sections.length;
  return html`<article class=${'cfg-card' + (slim ? ' cfg-card--slim' : '')} id=${'cfg-' + cfg.tool}
      style=${'--cfg-tool:' + color} aria-label=${title + ' configuration'}>
    ${group.slice(1).map(c => html`<span key=${c.tool} id=${'cfg-' + c.tool} class="cfg-anchor"></span>`)}
    <header class="cfg-card__head">
      <span class="cfg-card__icon">${group.map(c => html`<${ToolIcon} key=${c.tool} tool=${c.tool} size="1em"/>`)}</span>
      <h3 class="cfg-card__title">${title}</h3>
      <span class="cfg-card__badges">
        ${g.model !== DASH && html`<span class="badge mono">${g.model}</span>`}
        ${dangerBadge(sections)}
      </span>
    </header>
    ${cfg.tool === 'vscode' && html`<p class="cfg-card__sub">chat.* settings, used by every AI tool in VS Code</p>`}
    ${group.length > 1 && html`<p class="cfg-card__sub">${group.length === 2 ? 'Both' : 'All'} read the same files</p>`}
    <div class="cfg-card__body">
      ${sections.map(s => html`<${SectionBlock} key=${s.id} section=${s}/>`)}
      <${Hints} hints=${hints}/>
    </div>
  </article>`;
}

// ─── At a glance ─────────────────────────────────────────────────
function scrollToCard(tool) {
  const el = typeof document !== 'undefined' && document.getElementById('cfg-' + tool);
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function GlanceTable({ configs, labelMap }) {
  if (!configs.length) return null;
  return html`<section class="cfg-glance" aria-labelledby="cfg-glance-title">
    <h3 class="cfg-glance__title" id="cfg-glance-title">At a glance</h3>
    <div class="cfg-glance__scroll">
      <table class="cfg-glance__table">
        <thead><tr>
          <th scope="col">Tool</th><th scope="col">Model</th><th scope="col">Reasoning effort</th>
          <th scope="col">Telemetry</th><th scope="col">Permission checks</th><th scope="col">Hooks</th>
          <th scope="col">MCP servers</th><th scope="col">Startup</th><th scope="col">Updates</th>
          <th scope="col">Settings files</th>
        </tr></thead>
        <tbody>
          ${configs.map(cfg => {
            const g = glance(cfg, getSections(cfg));
            const label = labelMap[cfg.tool] || (cfg.tool === 'vscode' ? 'VS Code' : cfg.tool);
            return html`<tr key=${cfg.tool} class="cfg-glance__row" data-tool=${cfg.tool} onClick=${() => scrollToCard(cfg.tool)}>
              <th scope="row">
                <button type="button" class="cfg-glance__tool" onClick=${e => { e.stopPropagation(); scrollToCard(cfg.tool); }}>
                  <${ToolIcon} tool=${cfg.tool} size="1em"/> ${label}
                </button>
              </th>
              <td class="mono">${g.model}</td>
              <td class="mono">${g.effort}</td>
              <td class=${'mono ' + (g.telemetryOn ? 'cfg-flag--on' : '')} title=${g.telemetry}>${g.telemetry}</td>
              <td>${g.permission
                ? html`<span class="badge cfg-badge--danger">${g.permission}</span>`
                : html`<span class="cfg-glance__ok">asked</span>`}</td>
              <td class="mono">${g.hooks}</td>
              <td class="mono">${g.mcp}</td>
              <td>${g.startup}</td>
              <td>${g.updates}</td>
              <td class="mono" title=${g.files.join('\n') || undefined}>${g.files.length}</td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>
  </section>`;
}

// ─── aictl card ──────────────────────────────────────────────────
function AictlCard({ snap }) {
  const diag = Object.entries((snap?.live_monitor?.diagnostics) || {});
  const paths = [...(snap?.live_monitor?.workspace_paths || []), ...(snap?.live_monitor?.state_paths || [])];
  if (!diag.length && !paths.length) return null;
  const color = COLORS['aictl'] || 'var(--fg2)';
  return html`<article class="cfg-card" id="cfg-aictl" style=${'--cfg-tool:' + color} aria-label="aictl configuration">
    <header class="cfg-card__head">
      <span class="cfg-card__icon"><${Icon} name="settings" size="1em"/></span>
      <h3 class="cfg-card__title">aictl</h3>
      <span class="cfg-card__badges"><span class="badge badge--muted">monitoring engine</span></span>
    </header>
    <div class="cfg-card__body">
      ${diag.length > 0 && html`<section class="cfg-section">
        <h4 class="cfg-section__title">Collectors</h4>
        <div class="cfg-rows">
          ${diag.map(([name, d]) => {
            const ok = d.status === 'active';
            return html`<div key=${name} class="cfg-row">
              <div class="cfg-row__label mono"><span class=${d.detail ? 'cfg-help' : ''} title=${d.detail || undefined}>${name}</span></div>
              <div class="cfg-row__value"><span class=${'cfg-flag ' + (ok ? 'cfg-flag--on' : 'cfg-flag--warn')}>${d.status || 'unknown'}</span></div>
              <div class="cfg-row__source">${d.mode || ''}</div>
            </div>`;
          })}
        </div>
      </section>`}
      ${paths.length > 0 && html`<section class="cfg-section">
        <h4 class="cfg-section__title">Monitored roots</h4>
        <div class="cfg-rows">
          ${paths.map((p, i) => html`<div key=${i} class="cfg-row cfg-row--wide">
            <div class="cfg-row__value"><${PathValue} path=${p}/></div>
          </div>`)}
        </div>
      </section>`}
    </div>
  </article>`;
}

// ─── Tab ─────────────────────────────────────────────────────────
export default function TabToolConfig() {
  const { snap: s, enabledTools = null } = useContext(SnapContext);

  const configs = useMemo(() => (s?.tool_configs ? s.tool_configs : []), [s]);

  const labelMap = useMemo(() => {
    const m = {};
    (s?.tools || []).forEach(t => { m[t.tool] = t.label; });
    return m;
  }, [s]);

  const groups = useMemo(() => groupConfigs(configs), [configs]);

  if (!s) return html`<p class="loading-state">Loading...</p>`;
  const toolCfgs = configs.filter(c => c.tool !== 'vscode');
  const hasVscode = configs.some(c => c.tool === 'vscode');

  // The VS Code card ("all AI tools") and the aictl card belong to no single
  // tool, so they stay under any filter.
  if (!toolCfgs.length && !hasVscode && !isFiltered(enabledTools)) {
    return html`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;
  }

  return html`<div class="cfg-screen">
    <${GlanceTable} configs=${configs} labelMap=${labelMap}/>
    <div class="cfg-grid">
      ${!toolCfgs.length && isFiltered(enabledTools) && html`<div class="cfg-grid__full">
        <${ToolScopeEmpty} enabledTools=${enabledTools} snap=${s} what="tool configuration cards"/>
      </div>`}
      ${groups.map(g => html`<${ToolCard} key=${g[0].tool} group=${g} labelMap=${labelMap}/>`)}
      <${AictlCard} snap=${s}/>
    </div>
  </div>`;
}
