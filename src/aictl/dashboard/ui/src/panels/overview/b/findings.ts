// ─── Board findings — settings and text that no prompt shows ──────
// The audit stays where it is: /api/context-audit finds, utils/auditScope.js scopes
// to the tool filter. This file only turns those results into table rows.
import type { DetailContextAudit, DetailEffectiveModels, DetailHooksStatus, DetailOtelStatus } from '../../../data/contract.gen';
import { scopeAudit } from '../../../utils/auditScope.js';
import { tailPath } from '../../../design/format';

type Audit = Extract<DetailContextAudit, { findings: unknown }>;
type Inputs = {
  audit?: DetailContextAudit | null;
  effective?: DetailEffectiveModels | null;
  hooks?: DetailHooksStatus | null;
  otel?: DetailOtelStatus | null;
};
type Finding = {
  id: string; what: string; tool: string; where: string; effect: string; fix: string;
  severity?: string; whereFull?: string; path?: string | null; line?: number | null;
  command?: string; action?: string; lead?: string; done?: string;
};
type Value = { v: string; sub?: string; warn?: boolean; title?: string; path?: string | null; line?: number | null };
type Setting = { label: string; values: Record<string, Value>; path?: string | null; line?: number | null };
const text = (value: unknown) => typeof value === 'string' ? value : '';
const warning = (value: unknown) => typeof value === 'string' ? value
  : value && typeof value === 'object' && 'text' in value ? text(value.text) : '';

const WHAT: Record<string, string> = {
  'drift.changed-source': 'Instruction file changed, and no agent wrote to it',
  'drift.new-source': 'New instruction file found',
  'drift.removed-source': 'Instruction file removed',
  'drift.agent-write': 'An agent changed an instruction file',
  'dynamic.auto-approve': 'Tool calls approved without asking',
  'dynamic.location-override': 'Instruction location moved by a setting',
  'dynamic.mcp-server': 'Tool server added by a setting',
  'dynamic.policy-override': 'Policy set outside the project',
  'dynamic.base-url-redirect': 'Model calls go to another address',
  'dynamic.base-url-loopback': 'Model calls go to a local address',
  'dynamic.system-prompt-replacement': 'System prompt replaced',
  'dynamic.hook-stdout': 'Hook adds text to the prompt',
  'dynamic.credential-helper': 'Credential helper set',
  'dynamic.cli-system-prompt': 'System prompt replaced on the command line',
  'dynamic.cli-append-prompt': 'Text added to the prompt on the command line',
  'source.import-outside-project': 'Instruction file imports a file outside the project',
  'source.binary': 'Binary file in the instructions',
  'source.oversized': 'Very large instruction file',
  'source.untracked-always': 'Instruction file is not in git, and is always sent',
  'source.symlink-escape': 'Instruction file links outside the project',
  'model.pin-conflicts-request': 'Model set elsewhere overrides what this file asks for',
  'model.outside-project': 'Model set in the user folder',
  'model.unrecognized': 'Model id aictl does not know',
  'visibility.unknown-loaded-source': 'A file was loaded that the inventory does not list',
  'visibility.unattributed-context': 'Input tokens that no source explains',
};
const humanize = (rule: string) => {
  const last = (rule || 'finding').split('.').at(-1)!.replace(/-/g, ' ');
  return last.charAt(0).toUpperCase() + last.slice(1);
};
const ACCEPT = new Set(['drift.changed-source', 'drift.new-source', 'drift.removed-source']);
const at = (path: unknown, line: unknown) => (line ? text(path) + ':' + line : text(path));
/** The end of a path says which file it is. The title of the cell has the rest. */
export { tailPath };
const tailAt = (path: unknown, line: unknown) => at(tailPath(path), line);

/** Audit, effective models and hook status to rows for the findings panel. */
export function buildFindings({ audit, effective, hooks, otel, tools }: Inputs & { tools?: readonly string[] | null }) {
  const list: Finding[] = [];
  const scoped = audit && 'findings' in audit ? scopeAudit(audit, tools) as Audit : undefined;
  for (const f of scoped?.findings || []) {
    if (f.severity === 'info') continue;
    const rule = text(f.rule);
    const accept = ACCEPT.has(rule);
    const row: Finding = {
      id: [f.rule, f.path, f.line, f.session_id].join('|'),
      what: WHAT[rule] || humanize(rule),
      tool: text(f.tool) || (Array.isArray(f.tools) && f.tools.length === 1 ? text(f.tools[0]) : ''),
      where: tailAt(f.path, f.line), whereFull: at(f.path, f.line),
      path: text(f.path), line: typeof f.line === 'number' ? f.line : undefined,
      effect: text(f.why),
      severity: text(f.severity),
      fix: accept ? 'Accept the change' : 'Show the line',
    };
    if (accept) {
      Object.assign(row, { command: 'aictl ctx audit --update-baseline', action: 'baseline-update', lead: 'This records the current file as the expected one. The file does not change.', done: 'Accepted the change' });
    }
    list.push(row);
  }
  // The audit may report a pin conflict too. One row per conflict.
  const auditConflicts = new Set((scoped?.findings || []).filter(f => f.rule === 'model.pin-conflicts-request')
    .flatMap(f => Array.isArray(f.tools) && f.tools.length ? f.tools : [f.tool]));
  const eff = effective && !effective.error ? effective : {};
  for (const id of Object.keys(eff)) {
    const e = eff[id];
    if ((tools && !tools.includes(e.tool || id)) || auditConflicts.has(e.tool || id)) continue;
    for (const c of e.conflicts || []) {
      list.push({
        id: 'pin|' + id + '|' + c.requested_at,
        what: e.in_project ? 'Model set in the project' : 'Model set in the user folder',
        tool: e.tool || id,
        where: tailAt(e.source, e.line), whereFull: at(e.source, e.line), path: e.source, line: e.line,
        effect: 'Overrides ' + tailPath(c.requested_at) + ', which asks for ' + (Array.isArray(c.requested) ? c.requested.join(', ') : ''),
        fix: 'Show the line',
      });
    }
  }
  for (const b of Object.values(hooks?.tools || {})) {
    if (tools && !tools.includes(b.tool)) continue;
    const why = warning(b.warnings?.[0]);
    if (why) {
      list.push({
        id: 'hook|' + b.tool,
        what: /older|legacy/i.test(why) ? 'Hook from an older aictl' : 'Hook needs a repair',
        tool: b.tool,
        where: tailPath(b.sources?.[0]?.path) || 'Hook settings', whereFull: b.sources?.[0]?.path || '',
        effect: why,
        fix: 'Repair hooks',
        command: 'aictl hooks repair', action: 'hooks-repair',
        lead: 'This replaces the old hook entry. Other hooks stay as they are.', done: 'Repaired hooks',
      });
    }
  }
  if (otel && !otel.active && !otel.last_receive_at) {
    list.push({
      id: 'otel',
      what: 'Telemetry is off',
      tool: '',
      where: 'No telemetry has reached aictl',
      effect: 'Token figures for tools without session files are estimates',
      fix: 'Turn on telemetry',
      command: 'aictl otel enable', action: 'otel-enable',
      lead: 'This turns on the local telemetry export. The data stays on this machine.', done: 'Turned on telemetry',
    });
  }
  return list;
}

/** The rows of "Values in force". A value with no source is left out. */
// A file registered for 'copilot' is read by each Copilot tool.
const alwaysSources = (sources: Audit['sources'], id: string) =>
  sources.filter(s => (s.tool === id || (s.tool === 'copilot' && id.startsWith('copilot'))) && s.loading === 'always');
const sum = (sources: Audit['sources'], key: string) =>
  sources.length && sources.every(s => typeof s[key] === 'number')
    ? sources.reduce((n, s) => n + (s[key] as number), 0) : null;

/**
 * What each tool sends with every call from its instruction files: one row per tool, biggest
 * first. Tools do not share a context, so the rows do not add up to anything. `tokens` is null
 * when no file of the tool could be read.
 */
export function instructionsByTool(sources: Audit['sources'], toolIds: readonly string[]) {
  const ids = [...new Set([...toolIds, ...sources.map(s => text(s.tool)).filter(Boolean)])];
  const shown = ids.filter(id => id !== 'copilot' || !ids.some(x => x.startsWith('copilot-')));
  return shown.map((tool) => {
    const list = alwaysSources(sources, tool);
    const read = list.filter(s => s.readable !== false);
    return {
      tool,
      files: list.length,
      unread: list.length - read.length,
      bytes: sum(read, 'bytes'),
      tokens: sum(read, 'est_tokens'),
    };
  }).filter(r => r.files).sort((a, b) => (b.tokens ?? -1) - (a.tokens ?? -1));
}

export function buildSettings({ audit, effective, hooks, otel, toolIds }: Inputs & { toolIds: readonly string[] }) {
  const rows: Setting[] = [];
  const eff = effective && !effective.error ? effective : {};
  const model: Record<string, Value> = {};
  let path: string | null = null;
  let line: number | null = null;
  let note = '';
  for (const id of Object.keys(eff)) {
    const e = eff[id];
    const conflict = (e.conflicts || []).length > 0;
    model[e.tool || id] = { v: e.value || 'No pin', sub: e.value ? tailAt(e.source, e.line) : (e.why_in_effect || ''),
      warn: conflict, path: e.source, line: e.line };
    if (conflict && !path) {
      path = e.source;
      line = e.line;
      const request = e.conflicts[0].requested;
      note = (e.tool || id) + ': a setting at ' + tailAt(e.source, e.line) + ' overrides ' + tailPath(e.conflicts[0].requested_at) + ', which asks for ' + (Array.isArray(request) ? request.join(', ') : '') + '.';
    }
  }
  if (Object.keys(model).length) rows.push({ label: 'Model', values: model, path, line });
  const sources = audit && 'sources' in audit ? audit.sources : [];
  if (sources.length) {
    const inst: Record<string, Value> = {};
    for (const id of toolIds) {
      const list = alwaysSources(sources, id);
      if (!list.length) continue;
      const tokens = sum(list, 'est_tokens');
      const outside = list.filter(s => s.in_project === false).length;
      inst[id] = { v: list.length + (list.length === 1 ? ' file, ' : ' files, ') +
        (tokens == null ? 'tokens not available from this source' : '~' + (tokens >= 1000 ? (tokens / 1000).toFixed(1) + ' k' : tokens) + ' tokens'),
        title: 'Estimate at four characters per token, for these instruction files only', sub: outside ? outside + ' from the user folder' : '' };
    }
    if (Object.keys(inst).length) rows.push({ label: 'Instructions sent each call', values: inst });
  }
  const hookList = Object.values(hooks?.tools || {});
  if (hookList.length) {
    const h: Record<string, Value> = {};
    for (const b of hookList) {
      const why = warning(b.warnings?.[0]);
      const label = b.status === 'active' ? b.configured_count + ' active'
        : b.status === 'configured' ? b.configured_count + ' set, none fired'
          : b.status === 'observed' ? 'Fired, not in settings'
            : b.status === 'missing' ? "aictl's hooks not installed" : b.status;
      h[b.tool] = { v: label, sub: why, warn: Boolean(why), path: b.sources?.find(source => source.configured)?.path };
    }
    rows.push({ label: 'Hooks', values: h });
  }
  if (otel) {
    const t: Record<string, Value> = {};
    const on = !!otel.active || !!otel.last_receive_at;
    for (const id of toolIds) t[id] = { v: on ? 'On' : 'Off', sub: on ? '' : 'Tokens are estimates', warn: !on };
    rows.push({ label: 'Telemetry receiver', values: t });
  }
  return { rows, note };
}
