// ─── Board findings — settings and text that no prompt shows ──────
// The audit stays where it is: /api/context-audit finds, utils/auditScope.js scopes
// to the tool filter. This file only turns those results into table rows.
import { scopeAudit } from '../../utils/auditScope.js';

const WHAT = {
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
const humanize = rule => {
  const last = String(rule || 'finding').split('.').pop().replace(/-/g, ' ');
  return last.charAt(0).toUpperCase() + last.slice(1);
};
const ACCEPT = new Set(['drift.changed-source', 'drift.new-source', 'drift.removed-source']);
const at = (path, line) => (line ? path + ':' + line : path);
/** The end of a path says which file it is. The title of the cell has the rest. */
export function tailPath(path, keep = 3) {
  const parts = String(path || '').split(/[\\/]/);
  return parts.length > keep + 1 ? '…/' + parts.slice(-keep).join('/') : String(path || '');
}
const tailAt = (path, line) => at(tailPath(path), line);

/** Audit, effective models and hook status to rows for the findings panel. */
export function buildFindings({ audit, effective, hooks, otel, tools }) {
  const list = [];
  const scoped = scopeAudit(audit, tools) || {};
  for (const f of scoped.findings || []) {
    if (f.severity === 'info') continue;
    const accept = ACCEPT.has(f.rule);
    const row = {
      id: [f.rule, f.path, f.line, f.session_id].join('|'),
      what: WHAT[f.rule] || humanize(f.rule),
      tool: f.tool || (f.tools && f.tools.length === 1 ? f.tools[0] : ''),
      where: tailAt(f.path, f.line), whereFull: at(f.path, f.line),
      path: f.path, line: f.line,
      effect: f.why || '',
      severity: f.severity,
      fix: accept ? 'Accept the change' : 'Show the line',
    };
    if (accept) {
      Object.assign(row, { command: 'aictl ctx audit --update-baseline', action: 'baseline-update', lead: 'This records the current file as the expected one. The file does not change.', done: 'Accepted the change' });
    }
    list.push(row);
  }
  // The audit may report a pin conflict too. One row per conflict.
  const auditConflicts = new Set((scoped.findings || []).filter(f => f.rule === 'model.pin-conflicts-request').flatMap(f => f.tools || [f.tool]));
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
        effect: 'Overrides ' + tailPath(c.requested_at) + ', which asks for ' + (c.requested || []).join(', '),
        fix: 'Show the line',
      });
    }
  }
  for (const b of Object.values(hooks?.tools || {})) {
    if (tools && !tools.includes(b.tool)) continue;
    if ((b.warnings || []).length) {
      list.push({
        id: 'hook|' + b.tool,
        what: /older|legacy/i.test(b.warnings[0]) ? 'Hook from an older aictl' : 'Hook needs a repair',
        tool: b.tool,
        where: tailPath(b.sources?.[0]?.path) || 'Hook settings', whereFull: b.sources?.[0]?.path || '',
        effect: b.warnings[0],
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
export function buildSettings({ audit, effective, hooks, otel, toolIds }) {
  const rows = [];
  const eff = effective && !effective.error ? effective : {};
  const model = {};
  let path = null;
  let line = null;
  let note = '';
  for (const id of Object.keys(eff)) {
    const e = eff[id];
    const conflict = (e.conflicts || []).length > 0;
    model[e.tool || id] = { v: e.value || 'No pin', sub: e.value ? tailAt(e.source, e.line) : (e.why_in_effect || ''), warn: conflict };
    if (conflict && !path) {
      path = e.source;
      line = e.line;
      note = (e.tool || id) + ': a setting at ' + tailAt(e.source, e.line) + ' overrides ' + tailPath(e.conflicts[0].requested_at) + ', which asks for ' + (e.conflicts[0].requested || []).join(', ') + '.';
    }
  }
  if (Object.keys(model).length) rows.push({ label: 'Model', values: model, path, line });
  const sources = audit?.sources || [];
  if (sources.length) {
    const inst = {};
    for (const id of toolIds) {
      // A file registered for 'copilot' is read by each Copilot tool.
      const list = sources.filter(s => (s.tool === id || (s.tool === 'copilot' && id.startsWith('copilot'))) && s.loading === 'always');
      if (!list.length) continue;
      const tokens = list.reduce((a, s) => a + (s.est_tokens || 0), 0);
      const outside = list.filter(s => s.in_project === false).length;
      inst[id] = { v: list.length + (list.length === 1 ? ' file, ' : ' files, ') + '~' + (tokens >= 1000 ? (tokens / 1000).toFixed(1) + ' k' : tokens) + ' tokens', title: 'Estimate at four characters per token, for these instruction files only', sub: outside ? outside + ' from the user folder' : '' };
    }
    if (Object.keys(inst).length) rows.push({ label: 'Instructions sent each call', values: inst });
  }
  const hookList = Object.values(hooks?.tools || {});
  if (hookList.length) {
    const h = {};
    for (const b of hookList) {
      const warn = (b.warnings || []).length > 0;
      const label = b.status === 'active' ? b.configured_count + ' active'
        : b.status === 'configured' ? b.configured_count + ' set, none fired'
          : b.status === 'observed' ? 'Fired, not in settings'
            : b.status === 'missing' ? "aictl's hooks not installed" : b.status;
      h[b.tool] = { v: label, sub: warn ? b.warnings[0] : '', warn };
    }
    rows.push({ label: 'Hooks', values: h });
  }
  if (otel) {
    const t = {};
    const on = !!otel.active || !!otel.last_receive_at;
    for (const id of toolIds) t[id] = { v: on ? 'On' : 'Off', sub: on ? '' : 'Tokens are estimates', warn: !on };
    rows.push({ label: 'Telemetry receiver', values: t });
  }
  return { rows, note };
}
