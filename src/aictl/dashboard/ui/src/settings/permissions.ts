// ─── Permissions per capability ──────────────────────────────────
// What each tool lets its agent do without asking, in five capabilities
// (MCP, read files, write files, shell, web), worked out from the setting rows
// of one tool: Claude Code allow/deny/ask rules and default mode, Copilot CLI
// permission mode and rules, VS Code auto-approve settings, Codex approval
// policy and sandbox, Gemini approval mode and tool lists. Pure functions.
import { isLockedEntry, scopeLabel, type Entry, type Scope, type Setting } from './model';

export const CAPABILITIES = [
  { id: 'mcp', label: 'MCP' },
  { id: 'read', label: 'Read files' },
  { id: 'write', label: 'Write files' },
  { id: 'shell', label: 'Shell' },
  { id: 'web', label: 'Web' },
] as const;

type Capability = typeof CAPABILITIES[number];
type Effect = 'allowed' | 'asks' | 'denied';
type Base = { state: Effect; why: string; key?: string };
type Bases = Record<Capability['id'], Base>;
type Rows = ReadonlyMap<string, Setting>;
type Rule = { id?: string; rule: string; effect: Effect; cap: string; whole: boolean; where: string[]; key: string };
type Family = {
  tools: string[]; applies: (rows: Rows) => boolean; base: (rows: Rows) => Bases;
  rules: (rows: Rows, scopes: readonly Scope[]) => Rule[]; notes?: (rows: Rows) => string[];
};
const EFFECT_WORD = { allowed: 'allow', asks: 'ask', denied: 'deny' };
const EFFECT = { allow: 'allowed', deny: 'denied', ask: 'asks' } as const;
const BUCKETS = ['allow', 'deny', 'ask'] as const;
// When rules for the whole tool disagree, the strictest one applies.
const STRICTNESS = { denied: 3, asks: 2, allowed: 1 };

const ALL = (state: Effect, why: string, key = '') =>
  Object.fromEntries(CAPABILITIES.map(c => [c.id, { state, why, key }])) as Bases;

function lastSegment(key: string) {
  const parts = String(key || '').split('.');
  return parts[parts.length - 1];
}

/** The tool's rows by key, only rows that have a value (set, or a default the server reports). */
function rowsByKey(entry: Entry) {
  const m = new Map<string, Setting>();
  for (const r of entry?.rows || []) if (!m.has(r.key)) m.set(r.key, r);
  return m;
}

const valueOf = (r?: Setting) => r?.value != null && r.value !== '' ? r.value : undefined;
const asList = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : [];
const asMap = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : undefined;

/** `Name(spec)` split into a lowercased tool name and its specifier. */
function splitRule(rule: string) {
  const m = /^\s*([^()\s]+)\s*(?:\((.*)\))?\s*$/.exec(String(rule));
  if (!m) return { name: String(rule).toLowerCase(), spec: null };
  return { name: m[1].toLowerCase(), spec: m[2] === undefined ? null : m[2].trim() };
}

const WHOLE_SPECS = new Set(['', '*', ':*', '**']);

// ─── Rule sources per tool ───────────────────────────────────────
const CLAUDE_TOOLS = {
  read: ['read', 'glob', 'grep', 'ls', 'notebookread'],
  write: ['write', 'edit', 'multiedit', 'notebookedit'],
  shell: ['bash', 'powershell'],
  web: ['webfetch', 'websearch'],
};

function claudeCap(name: string) {
  if (name === 'mcp' || name.startsWith('mcp__')) return 'mcp';
  for (const [cap, names] of Object.entries(CLAUDE_TOOLS)) if (names.includes(name)) return cap;
  return '';
}

function claudeWhole(name: string, spec: string | null) {
  if (name.startsWith('mcp__')) return name === 'mcp__*';
  return spec === null || WHOLE_SPECS.has(spec);
}

/** Every allow/deny/ask rule of the Claude Code rows, with the scope it is set at. */
function claudeRules(rows: Rows, scopes: readonly Scope[]) {
  const out: Rule[] = [];
  const add = (bucket: typeof BUCKETS[number], rule: string, scope: string | undefined, key: string) => {
    const effect = EFFECT[bucket];
    const id = bucket + '\u0001' + rule;
    const where = scope ? scopeLabel(scope, scopes) : '';
    const prior = out.find(r => r.id === id);
    if (prior) {
      if (where && !prior.where.includes(where)) prior.where.push(where);
      return;
    }
    const { name, spec } = splitRule(rule);
    out.push({ id, rule, effect, cap: claudeCap(name), whole: claudeWhole(name, spec), where: where ? [where] : [], key });
  };
  const fromMap = (v: unknown, scope: string | undefined, key: string) => {
    const map = asMap(v);
    if (!map) return;
    for (const bucket of BUCKETS) for (const rule of asList(map[bucket])) add(bucket, rule, scope, key);
  };
  const perms = rows.get('permissions');
  if (perms) {
    const layered = (perms.chain || []).filter(c => c && c.value && typeof c.value === 'object' && c.set !== false);
    if (layered.length) for (const c of layered) fromMap(c.value, c.scope, 'permissions');
    else fromMap(valueOf(perms), perms.scope, 'permissions');
  }
  for (const bucket of BUCKETS) {
    const r = rows.get('permissions.' + bucket);
    if (!r) continue;
    for (const rule of asList(valueOf(r))) add(bucket, rule, r.scope, r.key);
  }
  return out;
}

const COPILOT_CLI_CAP: Record<string, string> = { shell: 'shell', write: 'write', read: 'read', url: 'web', fetch: 'web', web_fetch: 'web' };

function copilotCliRules(rows: Rows) {
  const out: Rule[] = [];
  for (const bucket of BUCKETS) {
    const r = rows.get('permissions.' + bucket);
    if (!r) continue;
    for (const rule of asList(valueOf(r))) {
      const { name, spec } = splitRule(rule);
      out.push({
        rule, effect: EFFECT[bucket], cap: COPILOT_CLI_CAP[name] || 'mcp',
        whole: spec === null || WHOLE_SPECS.has(spec), where: r.scope ? [scopeLabel(r.scope)] : [], key: r.key,
      });
    }
  }
  return out;
}

/** VS Code auto-approve maps: terminal commands, URLs and file edits, each entry a rule. */
function vscodeRules(rows: Rows) {
  const out: Rule[] = [];
  for (const r of rows.values()) {
    const v = asMap(valueOf(r));
    if (!v) continue;
    const k = r.key;
    let cap = '';
    if (/(^|\.)urls\.autoApprove$/.test(k)) cap = 'web';
    else if (/(^|\.)edits\.autoApprove$/.test(k)) cap = 'write';
    else if (k === 'autoApprove' || /(^|\.)terminal\.autoApprove$/.test(k)) cap = 'shell';
    if (!cap) continue;
    for (const [pattern, setting] of Object.entries(v)) {
      let effect: Effect | undefined;
      const settingMap = asMap(setting);
      if (cap === 'web') effect = setting === true || settingMap?.approveRequest === true ? 'allowed' : 'asks';
      else if (cap === 'write') effect = setting === false ? 'asks' : 'allowed';
      else if (setting === true || settingMap?.approve === true) effect = 'allowed';
      else if (setting === false || settingMap?.approve === false) effect = 'denied';
      if (!effect) continue;
      const whole = cap === 'write' ? pattern === '**/*' || pattern === '**' : false;
      out.push({ rule: pattern, effect, cap, whole, where: r.scope ? [scopeLabel(r.scope)] : [], key: k });
    }
  }
  return out;
}

const GEMINI_TOOLS = {
  read: ['read_file', 'read_many_files', 'glob', 'grep', 'search_file_content', 'list_directory', 'readfiletool', 'readmanyfilestool', 'globtool', 'greptool', 'lstool'],
  write: ['write_file', 'replace', 'edit', 'writefiletool', 'edittool'],
  shell: ['run_shell_command', 'shelltool'],
  web: ['web_fetch', 'google_web_search', 'webfetchtool', 'websearchtool'],
};

function geminiRules(rows: Rows) {
  const out: Rule[] = [];
  for (const [key, effect] of [['tools.allowed', 'allowed'], ['tools.exclude', 'denied']] as const) {
    const r = rows.get(key);
    if (!r) continue;
    for (const rule of asList(valueOf(r))) {
      const { name, spec } = splitRule(rule);
      let cap = Object.entries(GEMINI_TOOLS).find(([, names]) => names.includes(name))?.[0] || '';
      if (!cap && name.includes('__')) cap = 'mcp';
      if (!cap) continue;
      out.push({ rule, effect, cap, whole: spec === null, where: r.scope ? [scopeLabel(r.scope)] : [], key });
    }
  }
  return out;
}

// ─── What applies without a rule, per tool ───────────────────────
function claudeBase(rows: Rows): Bases {
  const r = rows.get('permissions.defaultMode');
  const mode = valueOf(r) ?? 'default';
  const key = r && valueOf(r) !== undefined ? r.key : '';
  const m = `default mode ${mode}`;
  if (mode === 'bypassPermissions') return ALL('allowed', m + ': no permission prompts', key);
  const base: Bases = {
    mcp: { state: 'asks', why: 'Claude Code asks before an MCP tool runs', key },
    read: { state: 'allowed', why: 'Claude Code reads files without asking', key },
    write: { state: 'asks', why: 'Claude Code asks before it edits a file', key },
    shell: { state: 'asks', why: 'Claude Code asks before it runs a command', key },
    web: { state: 'asks', why: 'Claude Code asks before it fetches a URL', key },
  };
  if (mode === 'acceptEdits') base.write = { state: 'allowed', why: m + ': edits apply without asking', key };
  if (mode === 'plan') {
    base.write = { state: 'denied', why: m + ': read-only, no edits', key };
    base.shell = { state: 'denied', why: m + ': read-only, no commands that change anything', key };
  }
  if (mode === 'dontAsk') {
    for (const c of ['mcp', 'write', 'shell', 'web'] as const) base[c] = { state: 'denied', why: m + ': anything not allowed by a rule is refused', key };
  }
  return base;
}

function copilotCliBase(rows: Rows): Bases {
  const r = rows.get('defaultPermissionMode');
  const mode = valueOf(r) ?? 'manual';
  const key = r && valueOf(r) !== undefined ? r.key : '';
  if (mode === 'allow-all') return ALL('allowed', 'defaultPermissionMode allow-all: every tool call is allowed', key);
  const ask = mode === 'assisted' ? 'asks; in assisted mode a model answers the request' : 'asks before it runs';
  return {
    mcp: { state: 'asks', why: 'an MCP tool ' + ask, key },
    read: { state: 'allowed', why: 'reads in trusted folders run without asking', key },
    write: { state: 'asks', why: 'a file write ' + ask, key },
    shell: { state: 'asks', why: 'a shell command ' + ask, key },
    web: { state: 'asks', why: 'a URL fetch ' + ask, key },
  };
}

function vscodeBase(rows: Rows): Bases {
  for (const r of rows.values()) {
    const v = valueOf(r);
    const last = lastSegment(r.key);
    if ((last === 'globalAutoApprove' || r.key === 'chat.tools.global.autoApprove') && v === true) {
      return ALL('allowed', r.label + ' is on: every tool call runs without asking', r.key);
    }
    if (r.key === 'skipPermissions' && v === true) return ALL('allowed', r.label + ' is on: no permission checks', r.key);
    if (r.key === 'chat.permissions.default' && typeof v === 'string' && ['autoApprove', 'autopilot', 'bypass'].includes(v)) {
      return ALL('allowed', `chat.permissions.default ${v}: sessions start without approval prompts`, r.key);
    }
  }
  return {
    mcp: { state: 'asks', why: 'VS Code asks before an MCP tool runs' },
    read: { state: 'allowed', why: 'VS Code reads workspace files without asking' },
    write: { state: 'allowed', why: 'VS Code applies edits in the workspace without asking' },
    shell: { state: 'asks', why: 'VS Code asks before a terminal command runs' },
    web: { state: 'asks', why: 'VS Code asks before it fetches a URL' },
  };
}

function codexBase(rows: Rows): Bases {
  const ar = rows.get('approval_policy');
  const sr = rows.get('sandbox_mode');
  const net = valueOf(rows.get('sandbox_workspace_write.network_access')) === true;
  let approval = valueOf(ar);
  if (approval && typeof approval === 'object') approval = 'granular';
  approval = approval || 'on-request';
  const sandbox = valueOf(sr) || 'read-only';
  const ak = ar && valueOf(ar) !== undefined ? ar.key : '';
  const sk = sr && valueOf(sr) !== undefined ? sr.key : '';
  const a = `approval_policy ${approval}${valueOf(ar) === undefined ? ' (not set)' : ''}`;
  const s = `sandbox_mode ${sandbox}${valueOf(sr) === undefined ? ' (not set)' : ''}`;
  const never = approval === 'never';
  const full = sandbox === 'danger-full-access';
  const write: Base = full ? { state: 'allowed', why: s + ': no sandbox' }
    : sandbox === 'workspace-write' ? { state: 'allowed', why: s + ': writes in the workspace run without asking' }
    : never ? { state: 'denied', why: `${s}, ${a}: no writes and no way to ask` }
    : { state: 'asks', why: `${s}: a write needs your approval` };
  const shell: Base = never ? { state: 'allowed', why: a + ': commands never ask' }
    : approval === 'untrusted' ? { state: 'asks', why: a + ': commands outside the trusted set ask' }
    : { state: 'allowed', why: `${a}: commands run in the sandbox (${sandbox}) and ask to leave it` };
  const web: Base = full || (sandbox === 'workspace-write' && net) ? { state: 'allowed', why: full ? s + ': network open' : 'sandbox_workspace_write.network_access is on' }
    : never ? { state: 'denied', why: `${s}, ${a}: no network and no way to ask` }
    : { state: 'asks', why: `${s}: network access needs your approval` };
  return {
    mcp: { state: never ? 'allowed' : 'asks', why: never ? a + ': MCP tools never ask' : a + ': MCP tool calls ask', key: ak },
    read: { state: 'allowed', why: s + ': reads are allowed', key: sk },
    write: { ...write, key: sk || ak },
    shell: { ...shell, key: ak || sk },
    web: { ...web, key: sk || ak },
  };
}

function geminiBase(rows: Rows): Bases {
  const r = rows.get('general.defaultApprovalMode') || rows.get('approvalMode') || rows.get('approval_mode') || rows.get('general.approvalMode');
  const mode = valueOf(r) ?? 'default';
  const key = r && valueOf(r) !== undefined ? r.key : '';
  const m = 'approval mode ' + mode;
  if (mode === 'yolo') return ALL('allowed', m + ': every tool call runs without asking', key);
  const base: Bases = {
    mcp: { state: 'asks', why: m + ': MCP tools ask', key },
    read: { state: 'allowed', why: 'reads run without asking', key },
    write: { state: 'asks', why: m + ': edits ask', key },
    shell: { state: 'asks', why: m + ': shell commands ask', key },
    web: { state: 'asks', why: m + ': web fetches ask', key },
  };
  if (mode === 'auto_edit') base.write = { state: 'allowed', why: m + ': edits run without asking', key };
  if (mode === 'plan') {
    base.write = { state: 'denied', why: m + ': read-only', key };
    base.shell = { state: 'denied', why: m + ': read-only', key };
  }
  return base;
}

// ─── Families ────────────────────────────────────────────────────
const has = (rows: Rows, re: RegExp) => [...rows.keys()].some(k => re.test(k));

const FAMILIES: Family[] = [
  {
    tools: ['claude-code'],
    applies: rows => has(rows, /^permissions(\.(allow|deny|ask|defaultMode))?$/),
    base: claudeBase, rules: claudeRules,
  },
  {
    tools: ['copilot-cli', 'copilot-desktop'],
    applies: rows => has(rows, /^(defaultPermissionMode|savedToolApprovals|permissions\.(allow|deny|ask))$/),
    base: copilotCliBase, rules: copilotCliRules,
    notes: rows => {
      const v = asMap(valueOf(rows.get('savedToolApprovals')));
      if (!v) return [];
      const n = Object.values(v).reduce<number>((a, x) => a + (Number(x) || 0), 0);
      const folders = Object.keys(v).length;
      return n ? [`${n} saved tool ${n === 1 ? 'approval' : 'approvals'} in ${folders} ${folders === 1 ? 'folder' : 'folders'} (permissions-config.json)`] : [];
    },
  },
  {
    tools: ['vscode', 'copilot'],
    applies: rows => has(rows, /(autoApprove|^chat\.permissions\.default$|^skipPermissions$)/i),
    base: vscodeBase, rules: vscodeRules,
  },
  {
    tools: ['codex-cli', 'codex'],
    applies: rows => has(rows, /^(approval_policy|sandbox_mode)$/),
    base: codexBase, rules: () => [],
  },
  {
    tools: ['gemini-cli', 'gemini'],
    applies: rows => has(rows, /(^|\.)(defaultApprovalMode|approvalMode|approval_mode)$|^tools\.(allowed|exclude)$/),
    base: geminiBase, rules: geminiRules,
  },
];

function stateText(state: Effect | 'mixed', n: number) {
  return state === 'mixed' ? `mixed (${n} ${n === 1 ? 'rule' : 'rules'})` : state;
}

function ruleLine(r: Rule) {
  return `${EFFECT_WORD[r.effect]} ${r.rule}${r.where.length ? ' (' + r.where.join(', ') + ')' : ''}`;
}

/** One cell: the state from rules for the whole tool, else the base; partial rules that differ make it mixed. */
function cellOf(cap: Capability, base: Base, rules: Rule[]) {
  const own = rules.filter(r => r.cap === cap.id);
  const whole = own.filter(r => r.whole);
  let state = base.state;
  let why = base.why;
  if (whole.length) {
    const top = whole.reduce((a, r) => (STRICTNESS[r.effect] > STRICTNESS[a.effect] ? r : a));
    state = top.effect;
    why = 'rule ' + ruleLine(top);
  }
  const differs = own.some(r => !r.whole && r.effect !== state);
  const final = differs ? 'mixed' : state;
  const text = stateText(final, own.length);
  const lines = [`${cap.label}: ${text}`];
  if (!own.length || !whole.length) lines.push('Without a rule: ' + base.state + ' (' + base.why + ')');
  else lines.push((differs ? 'For the whole tool: ' : 'Decided by: ') + state + ' (' + why + ')');
  if (own.length) lines.push(...own.map(r => '• ' + ruleLine(r)));
  return {
    cap: cap.id, label: cap.label, state: final, text, title: lines.join('\n'),
    rules: own.map(r => ({ rule: r.rule, effect: r.effect, where: r.where })),
    key: own[0]?.key || base.key || '',
  };
}

/**
 * The permission matrix of one tool entry, or null when the tool has no
 * permission settings this screen knows: `{ tool, cells: [{cap, label, state, text, title, rules, key}], notes }`.
 * A state is allowed, asks, denied or mixed; `key` is the row that decides the cell.
 */
export function derivePermissions(entry: Entry | undefined) {
  if (!entry) return null;
  const fam = FAMILIES.find(f => f.tools.includes(entry.id));
  if (!fam) return null;
  const rows = rowsByKey(entry);
  if (!fam.applies(rows)) return null;
  const base = fam.base(rows);
  const rules = fam.rules(rows, entry.scopes || []);
  return {
    tool: entry.id,
    cells: CAPABILITIES.map(c => cellOf(c, base[c.id], rules)),
    notes: fam.notes ? fam.notes(rows) : [],
  };
}

/** The matrix of every entry that has one, in entry order. */
// ─── Editing Claude Code permissions ─────────────────────────────
const EDITABLE_SCOPES = ['project', 'project-local'];
const CLAUDE_PERMISSION_KEYS = new Set(['permissions', 'permissions.allow', 'permissions.deny', 'permissions.ask', 'project_permissions']);
export const NOT_SUPPORTED = 'No form for this value. Open the file and use Edit file';

function isPermissionRow(row: Setting) {
  return !!row && row.tool === 'claude-code' && CLAUDE_PERMISSION_KEYS.has(row.key);
}

/** The scope whose value wins for a row: the winning chain entry, else the row's own scope. */
function winningScope(row: Setting) {
  return row.chain[row.wins]?.scope || row.scope;
}

/**
 * Whether the inspector can change a row: `{ ok: true, scope, path }` for a Claude Code
 * permission row whose winning scope is project or project-local and not locked;
 * otherwise `{ ok: false, hint }` with the reason shown next to the disabled button.
 */
export function permissionEdit(row: Setting, scopes: readonly Scope[] = []) {
  const win = row.chain[row.wins];
  if (row.locked || isLockedEntry(win, scopes) || scopes.some(s => s.id === row.scope && s.changeable === false)) {
    return { ok: false as const, hint: 'Locked by ' + scopeLabel(win?.scope ?? row.scope, scopes) };
  }
  if (!isPermissionRow(row)) return { ok: false as const, hint: NOT_SUPPORTED };
  const scope = winningScope(row);
  if (!scope || !EDITABLE_SCOPES.includes(scope)) {
    return { ok: false as const, hint: `The value comes from ${scopeLabel(scope, scopes)}. Project and Project local permissions have a form here; for another file, open it and use Edit file.` };
  }
  const s = (scopes || []).find(x => x.id === scope);
  return { ok: true as const, scope, label: scopeLabel(scope, scopes), path: win?.source || s?.path || row.source || '' };
}

// ─── The editor's list arithmetic ────────────────────────────────
export const parseLines = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean);

export function listDiff(before: readonly string[], after: readonly string[]) {
  const b = new Set(before);
  const a = new Set(after);
  return { added: [...a].filter(x => !b.has(x)), removed: [...b].filter(x => !a.has(x)) };
}
