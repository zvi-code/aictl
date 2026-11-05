// ─── Overview selectors: running sessions, cost, and what is broken ──
// Pure, so every issue kind and its exact fix is pinned in test/health.test.js.

import { fmtSz } from '../utils.js';

const RANK = { error: 0, warn: 1, info: 2 };

/** `aictl enable --tool` takes a family name, not a tool id. */
function enableCommand(tool, port) {
  if (tool === 'claude-code') return `aictl hooks install --port ${port}`;
  const family = ['copilot', 'gemini', 'codex'].find(f => String(tool).startsWith(f));
  return `aictl enable${family ? ' --tool ' + family : ''} --port ${port}`;
}

/** Same product family: copilot-cli and copilot-vscode share one hook file. */
function toolFamily(tool) {
  return String(tool || '').split('-')[0];
}

function hookIssues(hooks, runningTools) {
  if (!hooks?.tools) return [];
  const out = [];
  const port = hooks.server_port;
  const runningFamilies = runningTools ? new Set([...runningTools].map(toolFamily)) : null;
  for (const t of Object.values(hooks.tools)) {
    if (t.status === 'missing') {
      // No hooks for a tool that is not running is not a problem to act on now.
      if (runningFamilies && !runningFamilies.has(toolFamily(t.tool))) continue;
      // `hooks install` configures Claude Code only; `enable` covers the rest.
      const fix = enableCommand(t.tool, port);
      out.push({
        id: 'hooks:' + t.tool, level: 'warn',
        title: `${t.tool}: hooks not installed`,
        detail: 'No per-tool-call events, so the tool, skill and subagent panels stay empty.',
        fix,
      });
    } else if (t.status === 'disabled') {
      const reason = (t.sources || []).find(s => s.host_reason && !s.host_enabled)?.host_reason
        || 'The host tool has hooks turned off.';
      out.push({
        id: 'hooks:' + t.tool, level: 'warn',
        title: `${t.tool}: hooks disabled by host`,
        detail: reason,
        fix: reason.startsWith('chat.hookFilesLocations')
          ? `Set ${reason.replace(/ is false$/, '')} to true in VS Code settings`
          : null,
      });
    } else if (t.status === 'misconfigured' || t.status === 'fail') {
      const first = t.warnings?.[0];
      const more = t.warnings?.length > 1 ? `, +${t.warnings.length - 1} more` : '';
      out.push({
        id: 'hooks:' + t.tool, level: 'error',
        title: `${t.tool}: hooks misconfigured`,
        detail: first ? `${first.message} (${first.path}${more})` : 'Hook checks failed.',
        fix: enableCommand(t.tool, port),
      });
    }
  }
  if (hooks.total_configured > 0 && hooks.total_fired_24h === 0 && out.length === 0) {
    out.push({
      id: 'hooks:silent', level: 'warn',
      title: `${hooks.total_configured} hooks configured, 0 fired in 24 h`,
      detail: 'Hooks are installed but no event has reached this dashboard.',
      fix: null,
    });
  }
  return out;
}

function qualityIssues(quality) {
  const out = [];
  for (const q of quality?.items || []) {
    if (q.status === 'ok' || q.severity === 'info') continue;
    // The tool keeps no store on this machine, usually because it is not installed.
    if (q.status === 'source_missing') continue;
    out.push({
      id: 'quality:' + q.component,
      level: q.severity === 'error' ? 'error' : 'warn',
      title: `${q.component}: ${q.status}`,
      detail: q.message + (q.source ? ` (${q.source})` : ''),
      fix: null,
    });
  }
  return out;
}

/**
 * @param {object} h
 * @param {boolean} h.connected  SSE connection state
 * @param {number|null} h.snapAgeS  age of the newest snapshot
 * @param {object|null} h.hooks  /api/hooks-status
 * @param {object|null} h.quality  /api/data-quality
 * @param {boolean|null} h.otelActive  null while unknown
 * @param {Array} h.alerts  process alerts ({level, msg})
 */
export function deriveIssues({
  connected, snapAgeS, hooks, quality, otelActive, alerts = [], storage = null, hiddenContext, runningTools = null,
}) {
  const out = [];
  // Unseen context is listed ahead of other warnings, and the answer stays
  // honest when no detector has run (null) rather than implying "none found".
  if (hiddenContext?.count > 0) {
    out.push({
      id: 'hidden-context', level: 'warn', tab: 'hidden',
      title: `${hiddenContext.count} unseen context source${hiddenContext.count === 1 ? '' : 's'} found`,
      detail: hiddenContext.detail || 'Text reaches a model without appearing in its visible configuration.',
      fix: null,
    });
  } else if (hiddenContext === null) {
    out.push({
      id: 'hidden-context', level: 'info', tab: 'hidden',
      title: 'Hidden context not checked',
      detail: 'No detector has reported for this build.',
      fix: null,
    });
  }
  if (storage?.degraded) {
    out.push({
      id: 'storage', level: 'error', title: 'Storage degraded: capture is being reduced',
      detail: `${storageText(storage)}. New data may lose text or be dropped until disk use is under budget.`,
      fix: null,
    });
  } else if (storage?.pct >= 90) {
    out.push({
      id: 'storage', level: 'warn', title: `Storage at ${storage.pct}% of budget`,
      detail: storageText(storage), fix: null,
    });
  }
  if (connected === false) {
    out.push({
      id: 'sse', level: 'error', title: 'Live stream disconnected',
      detail: 'Figures show the last received values. Retrying automatically.',
      fix: 'aictl daemon serve',
    });
  } else if (snapAgeS != null && snapAgeS > 60) {
    out.push({
      id: 'stale', level: 'warn', title: `Snapshot is ${Math.round(snapAgeS)} s old`,
      detail: 'The stream is connected but the collector stopped publishing.',
      fix: 'aictl doctor',
    });
  }
  for (const a of alerts) {
    out.push({
      id: 'alert:' + a.msg, level: a.level === 'red' ? 'error' : 'warn',
      title: a.msg, detail: 'The Processes tab lists the affected PIDs.', fix: null, tab: 'procs',
    });
  }
  out.push(...hookIssues(hooks, runningTools), ...qualityIssues(quality));
  if (otelActive === false) {
    out.push({
      id: 'otel', level: 'info', title: 'OTel receiver has no data',
      detail: 'Exact token and cost figures need it. Estimates are used until then.',
      fix: 'aictl otel enable',
    });
  }
  return out.sort((a, b) => RANK[a.level] - RANK[b.level]);
}

/** Capture mode and disk use from /api/self-status. All fields may be absent. */
export function storageSummary(self) {
  if (!self) return null;
  const used = self.storage_bytes ?? self.db?.file_size_bytes ?? null;
  const budget = self.storage_budget_bytes || null;
  return {
    mode: self.capture_mode || null,
    used,
    budget,
    pct: used != null && budget ? Math.round((used / budget) * 100) : null,
    degraded: !!self.storage_degraded,
  };
}

export function storageText(s) {
  if (!s || s.used == null) return 'Disk use not reported';
  const used = fmtSz(s.used);
  return s.budget ? `${used} of ${fmtSz(s.budget)} (${s.pct}%)` : `${used}, no budget set`;
}

/** Live sessions for the "running now" panel, honouring the tool filter. */
export function runningSessions(snap, enabledTools) {
  const rows = (snap?.sessions || []).filter(s =>
    s.tool && (enabledTools === null || enabledTools === undefined || enabledTools.includes(s.tool)));
  return rows.sort((a, b) =>
    (b.cpu_percent || 0) - (a.cpu_percent || 0) || (b.last_seen_at || 0) - (a.last_seen_at || 0));
}

/** The process collector's rows have ids like tool:pid:ts: one process tree, not a conversation. */
export function isProcessDerived(row) {
  return /^[^:]+:\d+:\d+$/.test(row?.session_id || '');
}

/** "3 sessions, 50 process trees in 6 tools": never calls a helper process a session. */
export function runningSummary(rows) {
  const trees = rows.filter(isProcessDerived).length;
  const sessions = rows.length - trees;
  const tools = new Set(rows.map(r => r.tool)).size;
  const treeWord = `process tree${trees === 1 ? '' : 's'}`;
  const sessionWord = `session${sessions === 1 ? '' : 's'}`;
  const what = trees && sessions ? `${sessions} ${sessionWord} and ${trees} ${treeWord}` : trees ? treeWord : sessionWord;
  return `${what} in ${tools} tool${tools === 1 ? '' : 's'}`;
}

export function sessionMemMb(s) {
  let total = 0;
  const walk = (nodes) => { for (const n of nodes || []) { total += n.mem_mb || 0; walk(n.children); } };
  walk(s.process_tree);
  return total;
}

/** Totals from /api/project-costs. Top rows carry what the headline hides. */
export function summarizeCosts(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const top = list.slice().sort((a, b) => (b.cost_usd || 0) - (a.cost_usd || 0));
  return {
    cost: list.reduce((n, r) => n + (r.cost_usd || 0), 0),
    tokens: list.reduce((n, r) => n + (r.total_tokens || 0), 0),
    sessions: list.reduce((n, r) => n + (r.sessions || 0), 0),
    top: top.filter(r => (r.cost_usd || 0) > 0).slice(0, 3),
  };
}
