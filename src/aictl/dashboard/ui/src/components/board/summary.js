// ─── Board summary — the KPI strip and the one line per section in the rail ─
import { fmtCpu, fmtMem, fmtMs, fmtN, fmtRate, fmtShare, fmtUsd, fmtLines, sparkPath } from './format.js';

const delta = (a, b) => {
  if (a === null || a === undefined || !b) return 'No earlier data';
  const x = ((a - b) / b) * 100;
  return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(0) + '% vs before';
};

export function kpiList(data) {
  const k = data.kpis;
  const p = k.prev || {};
  const s = k.spark || {};
  const sp = v => sparkPath(v, 54, 16);
  const read = data.by_model.length ? data.by_model.reduce((a, m) => a + (m.cache_read || 0), 0) : null;
  return [
    { label: 'Agents running', value: k.running ?? 'n/a', delta: k.subagents_running == null ? 'n/a' : '+' + k.subagents_running + ' subagents', spark: sp(s.running), href: '#sec-agents', title: 'Go to Agents' },
    { label: 'Messages', value: fmtN(k.messages), delta: delta(k.messages, p.messages), spark: sp(s.messages), href: '#sec-usage', title: 'Go to Usage and cost' },
    { label: 'Tokens', value: fmtN(k.tokens), delta: delta(k.tokens, p.tokens), spark: sp(s.tokens), href: '#sec-usage', title: 'Go to Usage and cost' },
    { label: 'Cached', value: fmtShare(k.cached_share), delta: read == null ? 'n/a' : fmtN(read) + ' read', spark: sp(s.cached), href: '#sec-usage', title: 'Share of input served from cache' },
    { label: 'Cost', value: fmtUsd(k.cost_usd), delta: delta(k.cost_usd, p.cost_usd), spark: sp(s.cost), href: '#sec-usage', title: 'List price, not a bill' },
    { label: 'Tool calls', value: fmtN(k.tool_calls), delta: delta(k.tool_calls, p.tool_calls), spark: sp(s.tool_calls), href: '#sec-tools', title: 'Includes calls that a tool reports only as a total, so this can be above the sum of the Tools panel' },
    { label: 'Failures', value: fmtN(k.failures), delta: fmtRate(k.fail_rate) + ' of calls', spark: sp(s.failures), href: '#sec-tools', title: 'Failed tool calls. API errors are in the Failures panel.' },
    { label: 'p95 reply', value: fmtMs(k.p95_ms), delta: 'p50 ' + fmtMs(k.p50_ms), spark: sp(s.p95), href: '#sec-tools', title: 'Model reply time' },
    { label: 'Loops', value: k.loops ?? 'n/a', delta: k.loops ? 'Needs a look' : 'None', spark: sp(s.loops), href: '#sec-tools', title: 'Repeated failing work' },
  ];
}

const lastOf = vals => { for (let i = (vals || []).length - 1; i >= 0; i--) if (vals[i] != null) return vals[i]; return null; };
const sumLast = map => {
  let s = null;
  for (const id of Object.keys(map || {})) { const v = lastOf(map[id]); if (v != null) s = (s || 0) + v; }
  return s;
};

export function sectionSummary(id, data, series, findingsCount) {
  const k = data.kpis;
  switch (id) {
    case 'agents': return (k.running ?? 'n/a') + ' running, ' + (k.subagents_running ?? 'n/a') + ' subagents';
    case 'usage': return fmtUsd(k.cost_usd) + ', ' + fmtN(k.tokens) + ', ' + fmtShare(k.cached_share) + ' cached';
    case 'prompts': return data.prompts.length + ' prompts, ' + data.skills.length + ' skills';
    case 'tools': return fmtN(k.tool_calls) + ' calls, ' + fmtRate(k.fail_rate) + ' failed';
    case 'changes': {
      const t = data.changes.totals;
      const runs = data.tests.reduce((a, x) => a + (x.runs || 0), 0);
      const failed = data.tests.reduce((a, x) => a + (x.failed || 0), 0);
      return fmtLines(t.lines_added, t.lines_removed) + ', tests ' + (runs - failed) + ' of ' + runs;
    }
    case 'resources': return fmtCpu(sumLast(series.cpu)) + ' CPU, ' + fmtMem(sumLast(series.mem));
    case 'effect': return findingsCount + (findingsCount === 1 ? ' finding' : ' findings');
    case 'sources': {
      const all = data.sources.length;
      const live = data.sources.filter(s => s.last_data_ts != null).length;
      return live + ' of ' + all + ' tools report data';
    }
    default: return '';
  }
}
