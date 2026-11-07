// ─── Board panels — one builder per panel, from /api/board to a description ─
// A builder returns {sub, modes, stats, segbar, chart, canTable, table, hasCols,
// actions, note, text}. Panel.js draws that. A value the API does not have is
// null, which the formatters show as n/a.
import { GROWS } from './layout.js';
import {
  NA, OTHER_COLOR, UNIT, ago, baseName, colorFor, fmtAge, fmtBps, fmtBytes, fmtCpu, fmtDur, fmtLines, fmtMem, fmtMs, fmtN, fmtRate,
  fmtCredits, fmtShare, fmtUsd, isLive, projectName, sparkPath, stamp, statusMeta, NO_MODEL, errorLabel, toolDisplayName, relPath,
} from './format.js';
import { bucketLabel } from './chartModel.js';
import { STALE_AFTER_S } from './summary.js';
import { CONTEXT_BUILDERS } from './contextPanels.js';
import { EMPTY_MACHINE } from './useBoardData.js';

const num = v => (v === null || v === undefined ? -1 : v);
const sumOf = list => list.reduce((s, v) => s + (v || 0), 0);
const pctBar = (v, mx) => (v && mx ? (v / mx) * 100 : 0);
const lastVal = vals => { for (let i = vals.length - 1; i >= 0; i--) if (vals[i] !== null && vals[i] !== undefined) return vals[i]; return null; };
const OVER_SERIES = 5;

/** The /api/board/machine answer the board holds, or an empty one. */
export const machineOf = ctx => ctx.data?.machine || EMPTY_MACHINE;
const pctOf = v => (v == null ? NA : Math.round(v * 100) + '%');
const SEVERITY = {
  crit: { label: 'Critical', dot: 'var(--crit)', rank: 0 },
  warn: { label: 'Warning', dot: 'var(--warn)', rank: 1 },
  info: { label: 'Note', dot: 'var(--ink3)', rank: 2 },
};
const severityOf = s => SEVERITY[s] || SEVERITY.info;
const ZOMBIE_RANK = { high: 3, medium: 2, low: 1 };
const copyAction = (ctx, command) => () => ctx.actions.copy?.(command, 'Copied: ' + command);

/** A model name without its vendor prefix; the full name stays in the hover text. */
export const shortModel = m => String(m || '').replace(/^claude-/, '');

export const openAgent = (ctx, id, tab = 'overview', reset = true) => () => ctx.actions.openDrawer({ type: 'agent', id, tab }, reset);

function agentCell(ctx, a, level, foldOn, foldOpen, onFold) {
  return {
    v: a.parent_id ? (a.role || a.title) : a.title,
    sub: a.short,
    title: (a.parent_id ? 'Subagent ' + (a.role || a.title) : a.title) + ', ' + a.id,
    pad: level ? 16 : 0,
    foldOn, foldOpen, foldLabel: foldOpen ? 'Fold subagents' : 'Unfold subagents', fold: onFold, foldSp: !foldOn,
    sw: level ? null : colorFor('tool', a.tool),
  };
}
export function statusCell(a, stopped) {
  const st = stopped && stopped[a.id] ? 'stopped' : a.status;
  const s = statusMeta(st);
  const p = a.pending;
  const wait = p && st === 'waiting' ? 'Waits for confirmation of ' + p.name + ': ' + p.target : s.label;
  return { v: s.label, dot: s.dot, title: wait };
}

function panelAttention(ctx) {
  const items = ctx.data.attention;
  const now = ctx.nowS;
  const rows = items.filter(i => !ctx.stopped[i.agent_id]).map((i, idx) => {
    const loop = i.kind === 'loop';
    return {
      id: i.kind + ':' + i.agent_id + ':' + idx,
      go: openAgent(ctx, i.agent_id, loop ? 'errors' : 'tools'),
      sort: { kind: loop ? 'Loop' : 'Waiting for you' },
      cells: {
        kind: { v: loop ? 'Loop' : 'Waiting for you', warn: true },
        title: { v: i.title },
        what: { v: i.detail, cls: 'dim' },
        cost: { v: loop ? (i.tokens == null ? NA : fmtN(i.tokens) + ' tokens, ' + fmtUsd(i.cost_usd)) : (i.since_ts ? 'For ' + fmtDur(now - i.since_ts) : NA), cls: 'dim' },
      },
    };
  });
  return {
    sub: rows.length ? rows.length + ' open' : 'Nothing needs you',
    table: {
      cols: [{ k: 'kind', l: 'What', w: '150px' }, { k: 'title', l: 'Agent', w: '310px' }, { k: 'what', l: 'Detail' }, { k: 'cost', l: 'Cost so far', w: '170px' }],
      rows, none: 'Nothing needs you right now.',
    },
  };
}

function panelAgents(ctx, local, pid) {
  const group = local.mode('group', 'none');
  // A tool process with no session data is listed under Processes, not as an agent.
  const noData = ctx.data.agents.filter(a => a.placeholder).length;
  const agents = ctx.data.agents.filter(a => !a.placeholder);
  const folded = local.folded;
  const setFold = local.setFold;
  const nowS = ctx.nowS;
  const roots = agents.filter(a => !a.parent_id);
  const kids = new Map();
  agents.filter(a => a.parent_id).forEach(a => { if (!kids.has(a.parent_id)) kids.set(a.parent_id, []); kids.get(a.parent_id).push(a); });
  const rootOf = id => agents.find(a => a.id === id);
  const makeRow = (a, level) => {
    const hasKids = !level && kids.has(a.id);
    const open = !folded[a.id];
    const st = ctx.stopped[a.id] ? 'stopped' : a.status;
    const meta = statusMeta(st);
    const live = isLive(st);
    const age = (a.ended_at || nowS) - (a.started_at || nowS);
    const key = group === 'tool' ? ctx.toolName(a.tool) : group === 'project' ? projectName(a.project) : group === 'model' ? ((a2 => a2?.primary_model || a2?.models?.[0] || NA)(level ? rootOf(a.parent_id) : a)) : null;
    const pendingOn = a.pending && st === 'waiting';
    const models = (a.models || []).join(', ');
    return {
      id: a.id, parentId: a.parent_id, level, go: a.placeholder ? null : openAgent(ctx, a.id), groupKey: key,
      sort: {
        _cr: a.cache_read, _in: num(a.cache_read) + num(a.input) + num(a.cache_write),
        name: a.title, st: meta.rank + (a.started_at ? (nowS - a.started_at) / 1e9 : 0), tool: a.tool, project: a.project, model: models,
        msgs: a.msgs ? a.msgs.user + a.msgs.assistant + a.msgs.tool : null, input: a.input, output: a.output, cr: a.cached_share, cost: a.cost_usd,
        calls: a.tool_calls, fails: a.failures, asked: a.confirms_asked, cpu: a.cpu_percent, mem: a.mem_mb, dur: age,
      },
      cells: {
        name: agentCell(ctx, a, level, hasKids, open, () => setFold(a.id, open)),
        st: statusCell(a, ctx.stopped),
        tool: { v: ctx.toolName(a.tool), cls: 'dim' },
        project: { v: projectName(a.project), cls: 'dim', title: a.project || NA },
        model: { v: (a.models || []).map(shortModel).join(', ') || NA, title: models },
        msgs: { v: a.msgs ? fmtN(a.msgs.user + a.msgs.assistant + a.msgs.tool) : NA, title: a.msgs ? a.msgs.user + ' user, ' + a.msgs.assistant + ' assistant, ' + a.msgs.tool + ' tool' : NA },
        input: { v: fmtN(a.input), title: 'Input without cache' },
        output: { v: fmtN(a.output) },
        cr: { v: fmtShare(a.cached_share), title: fmtN(a.cache_read) + ' cache read, ' + fmtN(a.cache_write) + ' cache write' },
        cost: { v: fmtUsd(a.cost_usd) },
        calls: { v: fmtN(a.tool_calls) },
        fails: { v: a.failures == null ? NA : String(a.failures), cls: a.failures ? 'crit' : 'dim' },
        asked: { v: pendingOn ? a.confirms_asked + ' +1' : (a.confirms_asked == null ? NA : String(a.confirms_asked)), cls: pendingOn ? 'warn' : 'dim', title: a.confirms_asked + ' asked, ' + a.confirms_denied + ' denied' },
        cpu: { v: fmtCpu(a.cpu_percent), cls: a.cpu_percent == null || !live ? 'dim' : '' },
        mem: { v: fmtMem(a.mem_mb), cls: a.mem_mb == null || !live ? 'dim' : '' },
        dur: { v: fmtDur(age), title: 'Started ' + stamp(a.started_at, true) },
        spark: { spark: sparkPath(a.activity, 60, 16), sparkC: 'var(--ink2)', title: 'Activity in this range' },
      },
    };
  };
  const rows = [];
  roots.forEach(a => {
    rows.push(makeRow(a, 0));
    if (!folded[a.id]) (kids.get(a.id) || []).forEach(k => rows.push(makeRow(k, 1)));
  });
  const cols = [
    { k: 'name', l: 'Agent', w: '226px', fixed: true }, { k: 'st', l: 'Status', w: '84px' }, { k: 'tool', l: 'Tool', w: '104px' }, { k: 'project', l: 'Project', w: '92px' }, { k: 'model', l: 'Model', w: '92px' },
    { k: 'msgs', l: 'Msgs', n: true, w: '48px', t: 'User, assistant and tool messages' }, { k: 'input', l: 'Input', n: true, w: '56px', t: 'Input tokens without cache' }, { k: 'output', l: 'Output', n: true, w: '56px' },
    { k: 'cr', l: 'Cached', n: true, w: '54px', t: 'Cache read as a share of all input' }, { k: 'cost', l: 'Cost', n: true, w: '58px' }, { k: 'calls', l: 'Tools', n: true, w: '46px', t: 'Tool calls' },
    { k: 'fails', l: 'Fail', n: true, w: '38px', t: 'Failed tool calls' }, { k: 'asked', l: 'Asked', n: true, w: '46px', t: 'Confirmations asked' }, { k: 'cpu', l: 'CPU', n: true, w: '44px' }, { k: 'mem', l: 'RAM', n: true, w: '62px' }, { k: 'dur', l: 'Time', n: true, w: '70px', t: 'Duration' }, { k: 'spark', l: 'Activity', w: '56px' },
  ];
  const groupRow = group === 'none' ? null : (k, members) => {
    const top = members.filter(m => !m.level);
    const sum = key => sumOf(top.map(m => m.sort[key]));
    const fid = 'g:' + k;
    const isFolded = !!folded[fid];
    const cr = sum('_cr');
    const inp = sum('_in');
    return {
      id: fid, group: true, folded: isFolded, sort: {},
      cells: {
        name: { v: k, sub: top.length + ' agents', foldOn: true, foldOpen: !isFolded, foldLabel: isFolded ? 'Unfold this group' : 'Fold this group', fold: () => setFold(fid, !isFolded) },
        msgs: { v: fmtN(sum('msgs')) }, input: { v: fmtN(sum('input')) }, output: { v: fmtN(sum('output')) },
        cr: { v: cr ? Math.round((cr / inp) * 100) + '%' : NA }, cost: { v: fmtUsd(sum('cost')) }, calls: { v: fmtN(sum('calls')) },
        fails: { v: sum('fails') }, asked: { v: sum('asked') }, cpu: { v: sum('cpu') ? fmtCpu(sum('cpu')) : '' }, mem: { v: sum('mem') ? fmtMem(sum('mem')) : '' },
      },
    };
  };
  const statusOf = a => (ctx.stopped[a.id] ? 'stopped' : a.status);
  const idleN = roots.filter(a => statusOf(a) === 'idle').length;
  const liveN = roots.filter(a => isLive(statusOf(a))).length - idleN;
  // The list is capped, so the count comes from the totals when the server gives them.
  const scope = ctx.data.scope || {};
  const kidCount = scope.shown_sessions != null ? scope.shown_agents - scope.shown_sessions : agents.length - roots.length;
  return {
    sub: liveN + ' running, ' + (idleN ? idleN + ' idle, ' : '') + (roots.length - liveN - idleN) + ' ended, ' + kidCount + ' subagents' + (noData ? ', ' + noData + ' with processes only' : ''),
    modes: [{ key: 'group', label: 'Group agents by', def: 'none', items: [['none', 'No groups'], ['project', 'Project'], ['tool', 'Tool'], ['model', 'Model']] }],
    hasCols: true,
    table: { cols, rows, tree: true, sort: { k: 'st', dir: 'asc' }, columns: true, limit: 60, groupRow, none: 'No agents match these filters.', pid },
    note: 'Click a row for the full detail. CPU and RAM are live values, so ended agents show n/a. 100% CPU is one full core. An agent row includes its subagents.',
  };
}

function panelByModel(ctx, local) {
  const rows = [];
  const list = ctx.data.by_model;
  const mx = Math.max(1, ...list.map(m => m.tokens || 0));
  const byId = new Map(ctx.data.agents.map(a => [a.id, a]));
  const line = (x, c) => ({
    sort: { msgs: x.msgs, tokens: x.tokens, input: x.input, output: x.output, cr: x.cache_read, cw: x.cache_write, sh: x.cached_share, cost: x.cost_usd, p95: x.p95_ms, ag: x.agents },
    cells: {
      ag: { v: x.agents == null ? NA : x.agents }, msgs: { v: fmtN(x.msgs) }, tokens: { barOn: true, bar: pctBar(x.tokens, mx), barC: c, v: fmtN(x.tokens) }, input: { v: fmtN(x.input) }, output: { v: fmtN(x.output) },
      cr: { v: fmtN(x.cache_read) }, cw: { v: fmtN(x.cache_write) }, sh: { v: fmtShare(x.cached_share) }, cost: { v: fmtUsd(x.cost_usd) }, p95: { v: fmtMs(x.p95_ms) },
    },
  });
  list.forEach(m => {
    const open = !!local.folded['m:' + m.model];
    const c = colorFor('model', m.model);
    const r = line(m, c);
    r.cells.m = { v: m.model ? shortModel(m.model) : NO_MODEL, cls: m.model ? '' : 'dim', sw: c, foldOn: true, foldOpen: open, foldLabel: open ? 'Fold the agents' : 'Unfold the agents', fold: () => local.setFold('m:' + m.model, !open), title: 'Click to filter by ' + m.model };
    r.sort.m = m.model;
    rows.push({ ...r, id: m.model, go: () => ctx.actions.toggleFilter('model', m.model) });
    if (open) {
      (m.agent_ids || []).forEach(id => {
        const a = byId.get(id);
        if (!a) return;
        // An agent row carries its total. With one model that total is this model's share.
        const single = (a.models || []).length <= 1;
        const x = single
          ? { agents: 1, msgs: a.msgs ? a.msgs.user + a.msgs.assistant + a.msgs.tool : null, tokens: sumOf([a.input, a.output, a.cache_read, a.cache_write]), input: a.input, output: a.output, cache_read: a.cache_read, cache_write: a.cache_write, cached_share: a.cached_share, cost_usd: a.cost_usd, p95_ms: null }
          : { agents: 1, msgs: null, tokens: null, input: null, output: null, cache_read: null, cache_write: null, cached_share: null, cost_usd: null, p95_ms: null };
        const k = line(x, c);
        k.cells.m = { v: a.parent_id ? (a.role || a.title) + ' (subagent)' : a.title, pad: 16, foldSp: true, title: a.title + (single ? '' : '. This agent used more than one model, so its share of this model is not known.') };
        k.sort.m = a.title;
        rows.push({ ...k, id: m.model + ':' + id, parentId: m.model, level: 1, go: openAgent(ctx, id) });
      });
    }
  });
  return {
    sub: list.length + ' models. Click a row to filter, or unfold it for the agents',
    table: {
      cols: [{ k: 'm', l: 'Model' }, { k: 'ag', l: 'Agents', n: true, w: '48px' }, { k: 'msgs', l: 'Calls', n: true, w: '48px', t: 'Calls to this model' }, { k: 'tokens', l: 'Tokens', n: true, w: '104px' }, { k: 'input', l: 'Input', n: true, w: '56px' }, { k: 'output', l: 'Output', n: true, w: '56px' }, { k: 'cr', l: 'Cache read', n: true, w: '68px' }, { k: 'cw', l: 'Cache write', n: true, w: '72px' }, { k: 'sh', l: 'Cached', n: true, w: '52px' }, { k: 'cost', l: 'Cost', n: true, w: '58px' }, { k: 'p95', l: 'p95 reply', n: true, w: '62px' }],
      rows, tree: true, sort: { k: 'tokens', dir: 'desc' },
    },
  };
}

function panelByRole(ctx) {
  const rows = ctx.data.by_role.map(r => ({
    id: r.kind,
    sort: { k: r.kind, runs: r.runs, tokens: r.tokens, cost: r.cost_usd, msgs: r.msgs, fail: r.fail_rate },
    cells: { k: { v: r.kind }, runs: { v: r.runs }, msgs: { v: fmtN(r.msgs) }, tokens: { v: fmtN(r.tokens) }, cost: { v: fmtUsd(r.cost_usd) }, fail: { v: fmtRate(r.fail_rate), cls: r.fail_rate ? 'crit' : 'dim' } },
  }));
  return {
    sub: 'Runs and cost by kind',
    table: { cols: [{ k: 'k', l: 'Kind of agent' }, { k: 'runs', l: 'Runs', n: true, w: '40px' }, { k: 'msgs', l: 'Msgs', n: true, w: '46px' }, { k: 'tokens', l: 'Tokens', n: true, w: '56px' }, { k: 'cost', l: 'Cost', n: true, w: '58px' }, { k: 'fail', l: 'Fail', n: true, w: '50px', t: 'Share of tool calls that failed' }], rows, sort: { k: 'tokens', dir: 'desc' } },
  };
}

function chartTable(ctx, ch) {
  const { bucket_starts: starts = [], bucket_s: bucketS } = ctx.range;
  const fmt = UNIT[ch.unit] || fmtN;
  const rows = starts.map((_, i) => {
    const cells = { b: { v: bucketLabel(i, starts, bucketS) + (i === ctx.range.partial_bucket ? ' (not over yet)' : '') } };
    const sort = { b: i };
    ch.series.forEach((s, j) => {
      cells['s' + j] = { v: s.vals[i] == null ? 'No data' : fmt(s.vals[i]) };
      sort['s' + j] = s.vals[i];
    });
    return { id: i, cells, sort };
  });
  return { cols: [{ k: 'b', l: 'Time', w: '130px' }].concat(ch.series.map((s, i) => ({ k: 's' + i, l: s.label, n: true, minw: 90 }))), rows, sort: { k: 'b', dir: 'desc' } };
}

function chartPanel(ctx, local, pid, pn, chart, sub) {
  const h = pn?.h && GROWS[pid] ? Math.max(60, chart.h + pn.h - (pn.h0 || pn.h)) : chart.h;
  const ch = { ...chart, h };
  if (local.tableView) return { sub, table: chartTable(ctx, ch), canTable: true };
  return { sub, chart: ch, canTable: true };
}

function panelTokens(ctx, local, pid, pn) {
  const t = ctx.series.tokens || {};
  const series = [
    { label: 'Cache read', c: 'var(--s1)', vals: t.cache_read || [] },
    { label: 'Input, not cached', c: 'var(--s2)', vals: t.input || [] },
    { label: 'Cache write', c: 'var(--s3)', vals: t.cache_write || [] },
    { label: 'Output', c: 'var(--s4)', vals: t.output || [] },
  ];
  return chartPanel(ctx, local, pid, pn, { kind: 'stack', series, unit: 'n', h: 170, aria: 'Tokens: cached and not cached, over time' }, 'Drag across the chart to select a time. All panels follow.');
}

function panelCacheRate(ctx, local, pid, pn) {
  const vals = (ctx.series.cached_share || []).map(v => (v == null ? null : v * 100));
  const out = chartPanel(ctx, local, pid, pn, { kind: 'line', series: [{ label: 'Cached share of input', c: 'var(--s1)', vals }], unit: 'pct', h: 118, max: 100, aria: 'Cache hit rate' }, 'Share of input served from cache');
  out.stats = [
    { label: 'Cached', value: fmtShare(ctx.data.kpis.cached_share), title: 'Cache read as a share of all input' },
    { label: 'Saved by cache', value: fmtUsd(ctx.data.saved_usd), title: 'Cache reads at the full input rate, minus the same reads at the cache rate. The extra cost of cache writes is not taken off.' },
  ];
  return out;
}

/** The biggest series keep a color. The rest join in one Other series. */
export function splitSeries(map, kind, labelOf) {
  const ids = Object.keys(map || {});
  const total = id => sumOf(map[id]);
  const keep = ids.filter(id => total(id) > 0).sort((a, b) => total(b) - total(a));
  const top = keep.slice(0, OVER_SERIES);
  const rest = keep.slice(OVER_SERIES);
  const series = top.map(id => ({ label: labelOf(id), c: colorFor(kind, id), vals: map[id] }));
  if (rest.length) {
    const n = Math.max(...rest.map(id => map[id].length));
    const vals = Array.from({ length: n }, (_, i) => {
      let s = null;
      for (const id of rest) if (map[id][i] != null) s = (s || 0) + map[id][i];
      return s;
    });
    series.push({ label: 'Other (' + rest.length + ')', c: OTHER_COLOR, vals });
  }
  return series;
}

function panelCost(ctx, local, pid, pn) {
  const by = local.mode('by', 'tool');
  const cost = ctx.series.cost || {};
  const series = by === 'tool' ? splitSeries(cost.by_tool, 'tool', ctx.toolName)
    : by === 'project' ? splitSeries(cost.by_project, 'project', projectName)
      : splitSeries(cost.by_model, 'model', id => id);
  const un = ctx.data.unpriced;
  const cr = ctx.data.credits;
  const noPrice = un && un.tokens > 0;
  const sub = fmtUsd(ctx.data.kpis.cost_usd) + ' at list price. Not a bill.' + (noPrice ? ' Leaves out ' + fmtN(un.tokens) + ' tokens that have no price.' : '');
  const out = chartPanel(ctx, local, pid, pn, { kind: 'stack', series, unit: 'usd', h: 130, aria: 'Cost' }, sub);
  const stats = [];
  if (noPrice) {
    stats.push({
      label: 'No price', value: fmtN(un.tokens),
      sub: un.models.length === 1 ? un.models[0].model : un.models.length + ' models',
      title: 'Tokens of models with no known price. The cost leaves them out: ' + un.models.map(m => m.model + ' ' + fmtN(m.tokens)).join(', '),
    });
  }
  if (cr) {
    stats.push({
      label: 'Copilot credits', value: fmtCredits(cr.amount), sub: cr.approximate ? 'whole days' : null,
      title: 'AI credits GitHub Copilot reports. Credits, not dollars, and not part of the cost above.' + (cr.approximate ? ' The time cuts through a day, and that day counts whole.' : ''),
    });
  }
  if (stats.length) out.stats = stats;
  out.modes = [{ key: 'by', label: 'Split by', def: 'tool', items: [['tool', 'Tool'], ['project', 'Project'], ['model', 'Model']] }];
  return out;
}

function panelMessages(ctx, local, pid, pn) {
  const m = ctx.series.messages || {};
  const k = ctx.data.kpis;
  const series = [{ label: 'User', c: 'var(--s1)', vals: m.user || [] }, { label: 'Assistant', c: 'var(--s2)', vals: m.assistant || [] }, { label: 'Tool', c: 'var(--s3)', vals: m.tool || [] }];
  const out = chartPanel(ctx, local, pid, pn, { kind: 'stack', series, unit: 'n', h: 102, aria: 'Messages' }, fmtN(k.messages) + ' in this time');
  const shown = ctx.data.scope?.shown_agents || 0;
  const turns = sumOf(m.user || []);
  out.stats = [
    { label: 'Per agent', value: shown && k.messages != null ? (k.messages / shown).toFixed(0) : NA },
    { label: 'Tool calls per turn', value: turns && k.tool_calls != null ? fmtN(k.tool_calls / turns) : NA, title: 'Tool calls divided by prompts: a turn starts at a prompt' },
    { label: 'Tokens per message', value: k.messages ? fmtN(k.tokens / k.messages) : NA },
  ];
  return out;
}

function panelProjects(ctx) {
  const list = ctx.data.projects;
  const mx = Math.max(0.01, ...list.map(p => p.cost_usd || 0));
  const rows = list.map(p => {
    const c = colorFor('project', p.project);
    const testsLabel = p.test_runs ? p.test_passed + ' of ' + p.test_runs : (p.test_runs === 0 ? 'none' : NA);
    return {
      id: p.project, go: () => ctx.actions.toggleFilter('project', p.project),
      sort: { p: p.project, ag: p.agents, msgs: p.msgs, tokens: p.tokens, sh: p.cached_share, cost: p.cost_usd, calls: p.tool_calls, fail: p.fail_rate, tests: p.test_runs ? p.test_passed / p.test_runs : null, add: (p.lines_added ?? 0) + (p.lines_removed ?? 0), errs: p.api_errors, loops: p.loops, p95: p.p95_ms, prompts: p.prompts },
      cells: {
        p: { v: projectName(p.project), sw: c, title: 'Click to filter by ' + p.project }, ag: { v: p.agents ?? NA }, prompts: { v: p.prompts ?? NA }, msgs: { v: fmtN(p.msgs) }, tokens: { v: fmtN(p.tokens) }, sh: { v: fmtShare(p.cached_share) },
        cost: { barOn: true, bar: pctBar(p.cost_usd, mx), barC: c, v: fmtUsd(p.cost_usd) }, calls: { v: fmtN(p.tool_calls) }, fail: { v: fmtRate(p.fail_rate), cls: p.fail_rate ? 'crit' : 'dim' },
        tests: { v: testsLabel, cls: p.test_runs && p.test_passed < p.test_runs ? 'warn' : 'dim' }, add: { v: fmtLines(p.lines_added, p.lines_removed) }, errs: { v: p.api_errors ?? NA }, loops: { v: p.loops ?? NA, cls: p.loops ? 'warn' : 'dim' }, p95: { v: fmtMs(p.p95_ms) },
      },
    };
  });
  return {
    sub: 'Click a project to filter every panel',
    table: {
      cols: [{ k: 'p', l: 'Project', w: '130px' }, { k: 'ag', l: 'Agents', n: true, w: '56px' }, { k: 'prompts', l: 'Prompts', n: true, w: '60px' }, { k: 'msgs', l: 'Msgs', n: true, w: '56px' }, { k: 'tokens', l: 'Tokens', n: true, w: '66px' }, { k: 'sh', l: 'Cached', n: true, w: '58px' }, { k: 'cost', l: 'Cost', n: true, w: '130px' }, { k: 'calls', l: 'Tool calls', n: true, w: '66px' }, { k: 'fail', l: 'Tool fail', n: true, w: '62px' }, { k: 'tests', l: 'Test runs passed', n: true, w: '104px' }, { k: 'add', l: 'Lines', n: true, w: '96px', t: 'Lines added and removed' }, { k: 'errs', l: 'API errors', n: true, w: '70px' }, { k: 'loops', l: 'Loops', n: true, w: '50px' }, { k: 'p95', l: 'p95 reply', n: true, w: '68px' }],
      rows, sort: { k: 'cost', dir: 'desc' },
    },
  };
}

function panelPrompts(ctx) {
  const metadata = ctx.data.capture_mode === 'metadata';
  const rows = ctx.data.prompts.map((p, idx) => {
    const text = p.text || (metadata ? 'Text not stored' : NA);
    return {
      id: p.ts + ':' + idx, go: () => ctx.actions.openDrawer({ type: 'prompt', ts: p.ts, agent_id: p.agent_id, summary: p }, true),
      sort: { at: p.ts, tokens: p.tokens, project: p.project },
      cells: {
        at: { v: stamp(p.ts), cls: 'dim' },
        text: { v: text, cls: p.text ? '' : 'dim', sub: p.prompt_file ? baseName(p.prompt_file) : '', title: text + (p.prompt_file ? '\nUses ' + p.prompt_file : '') },
        project: { v: projectName(p.project), cls: 'dim', title: p.project || NA }, tokens: { v: fmtN(p.tokens) },
      },
    };
  });
  return {
    sub: (ctx.data.prompts_total > rows.length ? 'Newest ' + rows.length + ' of ' + ctx.data.prompts_total + ' prompts' : rows.length + ' prompts') + '. Click one for the full text',
    table: { cols: [{ k: 'at', l: 'Time', w: '96px' }, { k: 'text', l: 'Prompt' }, { k: 'project', l: 'Project', w: '96px' }, { k: 'tokens', l: 'Tokens', n: true, w: '60px' }], rows, sort: { k: 'at', dir: 'desc' }, limit: 60, primary: 'text' },
  };
}

function panelProjectPrompts(ctx) {
  const rows = ctx.data.project_prompts.map(f => ({
    id: f.project + '|' + f.file, sort: { f: f.file, n: f.uses, p: f.project },
    cells: { f: { v: baseName(f.file), title: f.project + ': ' + f.file }, p: { v: f.project ? projectName(f.project) : 'User', cls: 'dim', title: f.project || 'User folder' }, n: { v: f.uses ?? NA, cls: f.uses ? '' : 'dim', title: f.uses ? 'Last used ' + stamp(f.last_ts, true) : 'Not used in this time' } },
  }));
  const searched = ctx.data.project_prompts_searched || [];
  const none = searched.length
    ? 'No prompt files found. Searched ' + searched.slice(0, 6).join(', ') + (searched.length > 6 ? ' and ' + (searched.length - 6) + ' more folders' : '')
    : 'No prompt files found. No project folder is known to search.';
  return { sub: 'Files in each project, its parent folders and the user folders', table: { cols: [{ k: 'f', l: 'Prompt file' }, { k: 'p', l: 'Project', w: '92px' }, { k: 'n', l: 'Uses', n: true, w: '44px' }], rows, sort: { k: 'n', dir: 'desc' }, none } };
}

function panelSkills(ctx) {
  const list = ctx.data.skills;
  const mx = Math.max(1, ...list.map(s => s.uses || 0));
  const rows = list.map(s => ({
    id: s.name, go: () => ctx.actions.openDrawer({ type: 'skill', name: s.name, summary: s }, true),
    sort: { s: s.name, sc: s.scope, ag: s.agents, n: s.uses, tokens: s.tokens },
    cells: { s: { v: s.name, title: [s.name, s.description, s.path, s.file_tokens != null ? 'File is about ' + fmtN(s.file_tokens) + ' tokens' : '', s.agents != null ? s.agents + ' agents' : ''].filter(Boolean).join('\n') }, ag: { v: s.agents ?? NA, cls: 'dim' }, sc: { v: s.scope || 'No file', cls: 'dim', title: s.path || 'aictl found no file with this name for this skill' }, n: { barOn: true, bar: pctBar(s.uses, mx), barC: 'var(--s1)', v: s.uses ?? NA }, tokens: { v: fmtN(s.tokens) } },
  }));
  return { sub: 'Click a skill to see who can see it, its uses and its text', table: { cols: [{ k: 's', l: 'Skill' }, { k: 'sc', l: 'Scope', w: '70px' }, { k: 'ag', l: 'Agents', n: true, w: '48px' }, { k: 'n', l: 'Uses', n: true, w: '112px' }, { k: 'tokens', l: 'Turn tokens', n: true, w: '76px', t: 'All tokens of every agent in the turns where this skill ran. Skills used in one turn each show that turn, so do not add these up.' }], rows, sort: { k: 'n', dir: 'desc' }, none: 'No skill was used in this time.' } };
}

function panelToolCalls(ctx) {
  const list = ctx.data.tools;
  const mx = Math.max(1, ...list.map(t => t.calls || 0));
  const rows = list.map(t => ({
    id: t.name, go: () => ctx.actions.openDrawer({ type: 'tool', name: t.name }, true),
    sort: { k: t.name, n: t.calls, f: t.failed, fp: t.fail_rate, p50: t.p50_ms, p95: t.p95_ms, max: t.max_ms },
    cells: {
      k: { v: toolDisplayName(t.name), title: t.name, sub: t.server ? 'server' : '' }, n: { barOn: true, bar: pctBar(t.calls, mx), barC: 'var(--s1)', v: fmtN(t.calls) }, f: { v: t.failed ?? NA, cls: t.failed ? 'crit' : 'dim' }, fp: { v: fmtRate(t.fail_rate), cls: t.failed ? 'crit' : 'dim' },
      p50: { v: fmtMs(t.p50_ms) }, p95: { v: fmtMs(t.p95_ms) }, max: { v: fmtMs(t.max_ms) }, spark: { spark: sparkPath(t.trend, 60, 16), sparkC: 'var(--ink2)', title: 'Calls in this range' },
    },
  }));
  // Some tools report a count with no tool names, so those calls have no row here.
  const unnamed = (ctx.data.kpis.tool_calls || 0) - list.reduce((a, t) => a + (t.calls || 0), 0);
  return {
    sub: 'Click a tool to see its calls' + (unnamed > 0 ? '. ' + fmtN(unnamed) + ' more calls come from tools that report only a total' : ''),
    table: { cols: [{ k: 'k', l: 'Tool', w: '170px' }, { k: 'n', l: 'Calls', n: true, w: '112px' }, { k: 'f', l: 'Failed', n: true, w: '50px' }, { k: 'fp', l: 'Rate', n: true, w: '50px' }, { k: 'p50', l: 'p50', n: true, w: '58px' }, { k: 'p95', l: 'p95', n: true, w: '58px' }, { k: 'max', l: 'Max', n: true, w: '60px' }, { k: 'spark', l: 'Trend', w: '70px' }], rows, sort: { k: 'n', dir: 'desc' }, none: 'No tool calls in this time.' },
  };
}

function panelConfirms(ctx) {
  const c = ctx.data.confirms;
  const pend = c.pending || [];
  const total = (c.auto || 0) + (c.approved || 0) + (c.denied || 0) + (c.blocked || 0);
  const share = v => (total && v ? Math.round((v / total) * 100) + '%' : '');
  const rows = pend.map((p, i) => ({
    id: 'p' + i, go: openAgent(ctx, p.agent_id, 'tools'), sort: { k: 'zz', auto: 1e9 },
    cells: { k: { v: p.name, warn: true, title: p.target }, auto: { v: '' }, approved: { v: '' }, denied: { v: '' }, w: { v: 'waiting ' + fmtDur(ctx.nowS - p.since_ts), cls: 'warn' } },
  })).concat((c.by_tool || []).map(t => ({
    id: t.name, go: () => ctx.actions.openDrawer({ type: 'tool', name: t.name }, true),
    sort: { k: t.name, auto: t.auto, approved: t.approved, denied: t.denied, blocked: t.blocked, w: t.median_wait_s },
    cells: { k: { v: toolDisplayName(t.name), title: t.name }, auto: { v: t.auto ?? NA }, approved: { v: t.approved ?? NA }, denied: { v: t.denied ?? NA, cls: t.denied ? 'crit' : 'dim' }, blocked: { v: t.blocked ?? NA, cls: 'dim', title: 'A rule or hook stopped the call, and nobody was asked' }, w: { v: t.median_wait_s == null ? NA : Math.round(t.median_wait_s) + ' s', cls: 'dim' } },
  })));
  return {
    sub: pend.length ? pend.length + ' waiting now' : 'None waiting',
    stats: [{ label: 'Asked you', value: c.asked ?? NA, title: 'A person answered these, or still has to' }, { label: 'Auto approved', value: c.auto ?? NA, title: 'A rule or an earlier "always" let these through' }, { label: 'You denied', value: c.denied ?? NA }, { label: 'Blocked by a rule', value: c.blocked ?? NA, title: 'A rule or hook stopped these, and nobody was asked' }, { label: 'p95 wait', value: c.p95_wait_s == null ? NA : Math.round(c.p95_wait_s) + ' s', title: 'Only tools that record the wait report this' }],
    segbar: total ? { parts: [
      { label: 'Auto approved', w: c.auto || 0, c: 'var(--s1)', text: share(c.auto), title: c.auto + ' auto approved' },
      { label: 'You approved', w: c.approved || 0, c: 'var(--s3)', text: share(c.approved), title: c.approved + ' approved' },
      { label: 'You denied', w: Math.max(c.denied || 0, 0.001), c: 'var(--s2)', text: '', title: c.denied + ' denied' },
      { label: 'Blocked by a rule', w: c.blocked || 0, c: 'var(--s4)', text: '', title: (c.blocked || 0) + ' blocked by a rule' },
    ] } : null,
    table: { cols: [{ k: 'k', l: 'Tool' }, { k: 'auto', l: 'Auto', n: true, w: '44px' }, { k: 'approved', l: 'Yes', n: true, w: '40px' }, { k: 'denied', l: 'No', n: true, w: '36px' }, { k: 'blocked', l: 'Rule', n: true, w: '40px' }, { k: 'w', l: 'Median wait', n: true, w: '100px' }], rows, sort: { k: 'auto', dir: 'desc' }, none: 'No confirmations in this time.' },
  };
}

function panelErrors(ctx, local, pid, pn) {
  const list = ctx.data.errors;
  const f = ctx.series.failures || {};
  const series = [{ label: 'Tool failures', c: 'var(--s2)', vals: f.tool || [] }, { label: 'API errors', c: 'var(--s1)', vals: f.api || [] }];
  const out = chartPanel(ctx, local, pid, pn, { kind: 'stack', series, unit: 'n', h: 74, aria: 'Failures and errors' }, sumOf(list.map(e => e.count)) + ' in this time');
  const rows = list.map(e => ({
    id: e.key, go: () => ctx.actions.openDrawer({ type: 'error', key: e.key }, true),
    sort: { k: e.key, n: e.count, last: e.last_ts, kind: e.kind, ag: e.agents },
    cells: { k: { v: errorLabel(e.key), title: (e.sample ? e.sample + '\n' : '') + e.key }, kind: { v: e.kind, cls: 'dim' }, n: { v: e.count ?? NA, cls: 'crit' }, ag: { v: e.agents ?? NA }, last: { v: stamp(e.last_ts), cls: 'dim' } },
  }));
  out.table = { cols: [{ k: 'k', l: 'Error', t: 'Tool and message. # stands for a number that changes from call to call' }, { k: 'kind', l: 'Kind', w: '44px' }, { k: 'n', l: 'Count', n: true, w: '48px' }, { k: 'ag', l: 'Agents', n: true, w: '52px' }, { k: 'last', l: 'Last', w: '84px' }], rows, sort: { k: 'n', dir: 'desc' }, none: 'No failures in this time.' };
  if (local.tableView) out.chart = null;
  return out;
}

function panelLatency(ctx, local, pid, pn) {
  const l = ctx.series.latency || {};
  const series = [{ label: 'p50 reply', c: 'var(--s1)', vals: l.p50 || [] }, { label: 'p95 reply', c: 'var(--s2)', vals: l.p95 || [] }];
  const out = chartPanel(ctx, local, pid, pn, { kind: 'line', series, unit: 'ms', h: 110, legendFmt: NO_LEGEND_VALUE, aria: 'Latency and durations' }, 'Model reply time over the range');
  const rows = ctx.data.latency.map(r => ({
    id: r.what, sort: { k: r.what, n: r.count, p50: r.p50_ms, p95: r.p95_ms, p99: r.p99_ms, max: r.max_ms },
    cells: { k: { v: r.what }, n: { v: fmtN(r.count), cls: 'dim' }, p50: { v: fmtMs(r.p50_ms) }, p95: { v: fmtMs(r.p95_ms) }, p99: { v: fmtMs(r.p99_ms) }, max: { v: fmtMs(r.max_ms) } },
  }));
  out.table = { cols: [{ k: 'k', l: 'What' }, { k: 'n', l: 'Count', n: true, w: '58px' }, { k: 'p50', l: 'p50', n: true, w: '84px' }, { k: 'p95', l: 'p95', n: true, w: '84px' }, { k: 'p99', l: 'p99', n: true, w: '84px' }, { k: 'max', l: 'Max', n: true, w: '84px' }], rows };
  if (local.tableView) out.chart = null;
  return out;
}
const NO_LEGEND_VALUE = () => '';

function panelLoops(ctx) {
  const byId = new Map(ctx.data.agents.map(a => [a.id, a]));
  const rows = ctx.data.loops.map((x, i) => {
    const a = byId.get(x.agent_id);
    return {
      id: x.agent_id + ':' + i, go: openAgent(ctx, x.agent_id, 'errors'),
      sort: { a: x.title, n: x.repeats, tokens: x.tokens, cost: x.cost_usd },
      cells: {
        a: { v: x.title, sw: a ? colorFor('tool', a.tool) : null }, st: statusCell({ id: x.agent_id, status: x.status }, ctx.stopped), pat: { v: x.pattern, cls: 'm' },
        n: { v: x.repeats == null ? NA : x.repeats + ' times' }, tokens: { v: fmtN(x.tokens) }, cost: { v: fmtUsd(x.cost_usd) }, since: { v: stamp(x.since_ts, true), cls: 'dim' },
      },
    };
  });
  return {
    sub: 'The same failing call or edit and test cycle, repeated 3 or more times',
    table: { cols: [{ k: 'a', l: 'Agent', w: '280px' }, { k: 'st', l: 'Status', w: '100px' }, { k: 'pat', l: 'What repeats' }, { k: 'n', l: 'Repeats', n: true, w: '70px' }, { k: 'tokens', l: 'Tokens spent', n: true, w: '86px' }, { k: 'cost', l: 'Cost', n: true, w: '58px' }, { k: 'since', l: 'Since', w: '90px' }], rows, sort: { k: 'tokens', dir: 'desc' }, none: 'No loops in this time.' },
  };
}

function panelChanges(ctx) {
  const { files, totals } = ctx.data.changes;
  const mx = Math.max(1, ...files.map(f => (f.lines_added || 0) + (f.lines_removed || 0)));
  const rows = files.map(f => ({
    id: f.path, go: () => ctx.actions.openDrawer({ type: 'file', path: f.path }, true),
    sort: { f: f.path, ch: f.lines_added == null && f.lines_removed == null ? null : (f.lines_added || 0) + (f.lines_removed || 0), edits: f.edits, last: f.last_ts, ag: f.agents },
    cells: { f: { v: relPath(f.path, f.project, 4), title: f.project + ': ' + f.path }, ch: { barOn: true, bar: pctBar((f.lines_added || 0) + (f.lines_removed || 0), mx), barC: 'var(--s1)', v: fmtLines(f.lines_added, f.lines_removed) }, edits: { v: f.edits ?? NA }, ag: { v: f.agents ?? NA }, last: { v: stamp(f.last_ts), cls: 'dim' } },
  }));
  return {
    sub: 'Click a file for its diff',
    stats: [{ label: 'Files', value: totals.files ?? NA }, { label: 'Lines added', value: totals.lines_added == null ? NA : '+' + fmtN(totals.lines_added) }, { label: 'Lines removed', value: totals.lines_removed == null ? NA : '−' + fmtN(totals.lines_removed) }, { label: 'Edits', value: fmtN(totals.edits) }],
    table: { cols: [{ k: 'f', l: 'File', w: '230px' }, { k: 'ch', l: 'Lines changed', n: true, w: '148px' }, { k: 'edits', l: 'Edits', n: true, w: '44px' }, { k: 'ag', l: 'Agents', n: true, w: '50px' }, { k: 'last', l: 'Last', w: '84px' }], rows, sort: { k: 'ch', dir: 'desc' }, limit: 40, none: 'No file changes in this time.' },
  };
}

function panelTests(ctx, local, pid, pn) {
  const t = ctx.series.tests || {};
  const series = [{ label: 'Runs passed', c: 'var(--s1)', vals: t.passed || [] }, { label: 'Runs failed', c: 'var(--s2)', vals: t.failed || [] }];
  const list = ctx.data.tests;
  // The list below is capped, so the totals come from the series.
  const passedRuns = sumOf(t.passed || []);
  const failedRuns = sumOf(t.failed || []);
  const out = chartPanel(ctx, local, pid, pn, { kind: 'stack', series, unit: 'n', h: 74, aria: 'Testing' }, passedRuns + ' of ' + (passedRuns + failedRuns) + ' runs passed');
  if (ctx.data.tests_piped) out.note = ctx.data.tests_piped + ' passed runs end in a pipe with no pipefail, so the exit code is that of the last command. A failed test can count as passed.';
  const stateCls = { Failing: 'crit', Flaky: 'warn', Passing: 'dim' };
  const rows = list.map(x => ({
    id: x.command, sort: { k: x.command, n: x.runs, f: x.failed, d: x.median_ms },
    cells: { k: { v: x.command, cls: 'm' }, n: { v: x.runs ?? NA }, f: { v: x.failed ?? NA, cls: x.failed ? 'crit' : 'dim' }, d: { v: fmtMs(x.median_ms) }, flaky: { v: x.state || NA, cls: stateCls[x.state] || 'dim' }, last: { v: stamp(x.last_ts), cls: 'dim' } },
  }));
  out.table = { cols: [{ k: 'k', l: 'Command' }, { k: 'n', l: 'Runs', n: true, w: '44px' }, { k: 'f', l: 'Failed', n: true, w: '50px' }, { k: 'd', l: 'Median', n: true, w: '58px' }, { k: 'flaky', l: 'Now', w: '62px' }, { k: 'last', l: 'Last', w: '80px' }], rows, sort: { k: 'n', dir: 'desc' }, none: 'No test runs in this time.' };
  if (local.tableView) out.chart = null;
  return out;
}

function panelMemFiles(ctx) {
  const byId = new Map(ctx.data.agents.map(a => [a.id, a]));
  const rows = ctx.data.memory_files.map(f => {
    const changed = f.changed_ts != null;
    const by = f.changed_by ? byId.get(f.changed_by) : null;
    return {
      id: f.path, go: () => ctx.actions.openDrawer({ type: 'file', path: f.path }, true),
      sort: { path: f.path, tokens: f.tokens, ch: changed ? (f.lines_added || 0) + (f.lines_removed || 0) : null },
      cells: {
        path: { v: f.path, path: true }, tool: { v: f.read_by || NA, cls: 'dim' }, scope: { v: f.scope || NA, cls: 'dim' }, tokens: { v: fmtN(f.tokens) },
        ch: { v: changed ? fmtLines(f.lines_added, f.lines_removed) : 'No change', cls: changed ? '' : 'dim' },
        by: { v: by ? by.short : (f.changed_by || ''), cls: 'dim', title: by ? by.title : (f.changed_by || '') },
        at: { v: changed ? stamp(f.changed_ts, true) : '', cls: 'dim' },
      },
    };
  });
  return {
    sub: 'Instruction and memory files, and what changed in this time',
    table: { cols: [{ k: 'path', l: 'File' }, { k: 'tool', l: 'Read by', w: '100px' }, { k: 'scope', l: 'Where', w: '90px' }, { k: 'tokens', l: 'Tokens each call', n: true, w: '104px' }, { k: 'ch', l: 'Change', n: true, w: '86px' }, { k: 'by', l: 'Changed by', w: '84px' }, { k: 'at', l: 'When', w: '90px' }], rows, sort: { k: 'ch', dir: 'desc' }, none: 'No instruction or memory files found.' },
  };
}

function panelResource(ctx, local, pid, pn, kind) {
  const map = ctx.series[kind] || {};
  const unit = kind === 'cpu' ? 'cpu' : 'mem';
  const fmt = UNIT[unit];
  const series = Object.keys(map).filter(id => map[id].some(v => v)).map(id => ({ label: ctx.toolName(id), c: colorFor('tool', id), vals: map[id] }));
  const procs = ctx.data.processes || [];
  const liveSum = procs.length ? sumOf(procs.map(p => (kind === 'cpu' ? p.cpu_percent : p.mem_mb))) : null;
  const nowSum = liveSum != null ? liveSum : sumOf(series.map(s => lastVal(s.vals)));
  const legendFmt = kind === 'cpu' ? LAST_CPU : LAST_MEM;
  const out = chartPanel(ctx, local, pid, pn, { kind: 'line', series, unit, h: 120, legendFmt, aria: kind === 'cpu' ? 'CPU by tool' : 'Memory by tool' }, 'Now ' + (series.length || liveSum != null ? fmt(nowSum) : NA) + ' across tools');
  const f = ctx.filters;
  if (f.project !== 'all' || f.model !== 'all' || f.status !== 'all') out.note = 'This chart follows the Tool filter and the time only.';
  if (kind === 'cpu' && !local.tableView) out.cores = coreBars(machineOf(ctx).cpu_per_core);
  return out;
}

/** Bars for each core of the whole machine, now. Null when the monitor reports no cores. */
export function coreBars(perCore) {
  const list = (perCore || []).filter(v => typeof v === 'number');
  if (!list.length) return null;
  const avg = sumOf(list) / list.length;
  const busy = list.filter(v => v > 80).length;
  return {
    label: list.length + ' cores, ' + Math.round(avg) + '% on average' + (busy ? ', ' + busy + ' over 80%' : ''),
    list: list.map((v, i) => ({
      i, h: Math.max(2, Math.min(100, v)), level: v > 80 ? 'crit' : v > 50 ? 'warn' : 'ok',
      title: 'Core ' + i + ': ' + Math.round(v) + '% busy. Whole machine, every program.',
    })),
  };
}
const LAST_CPU = s => fmtCpu(lastVal(s.vals));
const LAST_MEM = s => fmtMem(lastVal(s.vals));

function procRow(ctx, p, i, m, noDetail, level, rootId, depth) {
  const anomalies = (m && m.anomalies) || [];
  const zr = m?.zombie_risk || null;
  const ppid = m?.ppid ?? null;
  const parent = ppid == null ? NA : (m.parent_name ? m.parent_name + ' (' + ppid + ')' : 'PID ' + ppid);
  const worst = anomalies.reduce((r, a) => Math.min(r, severityOf(a.severity).rank), 3);
  return {
    id: p.pid + ':' + i, parentId: rootId, level, go: p.agent_id && !noDetail.has(p.agent_id) ? openAgent(ctx, p.agent_id) : null,
    sort: {
      name: p.name, cpu: p.cpu_percent, mem: p.mem_mb, a: p.title, pid: p.pid, type: m?.process_type || null, parent: ppid,
      anom: anomalies.length ? anomalies.length + (3 - worst) / 10 : null, zr: zr ? ZOMBIE_RANK[zr] || 0 : null,
    },
    cells: {
      name: { v: p.name, cls: 'm', title: (m?.cmdline || p.name) + (ppid != null ? '\nParent: ' + parent : ''), pad: depth ? depth * 14 : 0 },
      pid: { v: p.pid ?? NA, cls: 'dim' },
      tool: { v: ctx.toolName(p.tool), sw: colorFor('tool', p.tool) },
      a: { v: p.title || NA, cls: 'dim' },
      type: { v: m?.process_type || NA, cls: 'dim', title: m?.process_type ? 'Kind of process, from the process catalog: ' + m.process_type : 'Not in the process catalog' },
      parent: { v: parent, cls: 'dim', title: ppid == null ? 'Parent not known' : 'Started by ' + parent + (ppid === 0 || ppid === 1 ? '. Its own parent is gone, so the system adopted it.' : '') },
      anom: anomalies.length
        ? { v: '', chips: anomalies.map(a => ({ text: a.label, title: a.text, sev: a.severity })), title: anomalies.map(a => a.text).join('\n') }
        : { v: 'None', cls: 'dim', title: 'No anomalies found' },
      zr: { v: zr ? zr[0].toUpperCase() + zr.slice(1) : 'None', cls: zr === 'high' ? 'crit' : zr === 'medium' ? 'warn' : 'dim', title: zr ? 'Zombie risk in the process catalog: ' + zr + '. A process of this kind can outlive the tool that started it.' : 'No zombie risk in the process catalog' },
      cpu: { v: fmtCpu(p.cpu_percent) },
      mem: { v: fmtMem(p.mem_mb) },
      act: m?.cleanup_cmd ? { v: 'Copy cleanup command', cls: 'lk', title: m.cleanup_cmd, go: copyAction(ctx, m.cleanup_cmd) } : { v: '', title: 'No cleanup command for this process' },
    },
  };
}

/** Children under their parents. Each descendant row points at its top parent and is indented by its depth. */
export function procTree(items, pidOf, ppidOf) {
  const byPid = new Map(items.map(x => [pidOf(x), x]));
  const kids = new Map();
  const roots = [];
  for (const x of items) {
    const pp = ppidOf(x);
    if (pp != null && pp !== pidOf(x) && byPid.has(pp)) {
      if (!kids.has(pp)) kids.set(pp, []);
      kids.get(pp).push(x);
    } else roots.push(x);
  }
  const out = [];
  const seen = new Set();
  const walk = (x, depth, root) => {
    if (seen.has(pidOf(x))) return;
    seen.add(pidOf(x));
    out.push({ x, depth, root });
    for (const k of kids.get(pidOf(x)) || []) walk(k, depth + 1, root);
  };
  for (const r of roots) walk(r, 0, r);
  // A loop of parents has no root: list what is left at the top.
  for (const x of items) if (!seen.has(pidOf(x))) walk(x, 0, x);
  return out;
}

function panelProcs(ctx, local) {
  const list = ctx.data.processes;
  const info = new Map(machineOf(ctx).processes.map(p => [p.pid, p]));
  const tree = local.mode('view', 'list') === 'tree';
  // A process with no session data has no detail to open.
  const noDetail = new Set(ctx.data.agents.filter(a => a.placeholder).map(a => a.id));
  const items = list.map((p, i) => ({ p, i, m: info.get(p.pid) || null }));
  let rows;
  if (tree) {
    rows = procTree(items, x => x.p.pid, x => x.m?.ppid ?? null).map(({ x, depth, root }) => (
      procRow(ctx, x.p, x.i, x.m, noDetail, depth ? 1 : 0, depth ? root.p.pid + ':' + root.i : null, depth)));
  } else rows = items.map(x => procRow(ctx, x.p, x.i, x.m, noDetail, 0, null, 0));
  const cpu = sumOf(list.map(p => p.cpu_percent));
  const mem = sumOf(list.map(p => p.mem_mb));
  const flagged = items.filter(x => x.m?.anomalies?.length).length;
  return {
    sub: 'Live now: ' + rows.length + ' processes, ' + fmtCpu(cpu) + ' CPU (100% is one full core), ' + fmtMem(mem) + (flagged ? ', ' + flagged + ' with anomalies' : '') + '. The time range does not apply',
    modes: [{ key: 'view', label: 'Show processes as', def: 'list', items: [['list', 'List'], ['tree', 'Tree']] }],
    hasCols: true,
    table: {
      cols: [
        { k: 'name', l: 'Process', w: '170px', fixed: true }, { k: 'pid', l: 'PID', n: true, w: '60px' }, { k: 'tool', l: 'Tool', w: '130px' }, { k: 'a', l: 'Agent' },
        { k: 'type', l: 'Type', w: '90px', t: 'Kind of process, from the process catalog' }, { k: 'parent', l: 'Parent', w: '130px', t: 'The process that started this one' },
        { k: 'anom', l: 'Anomalies', n: true, w: '190px', t: 'What the process scan found: memory far over the expected, a dead parent, a known leak' },
        { k: 'zr', l: 'Zombie risk', n: true, w: '84px', t: 'How likely this kind of process is to outlive its tool, from the process catalog' },
        { k: 'cpu', l: 'CPU', n: true, w: '60px' }, { k: 'mem', l: 'RAM', n: true, w: '76px' }, { k: 'act', l: 'Cleanup', w: '150px', t: 'Copy the command that ends this process' },
      ],
      rows, tree, columns: true, sort: { k: 'cpu', dir: 'desc' }, none: 'No live processes.',
    },
    note: tree ? 'A child process is listed under its parent when both are in this list.' : null,
  };
}

function panelAlerts(ctx) {
  const rows = machineOf(ctx).alerts.map((a, i) => {
    const sev = severityOf(a.severity);
    const pids = a.pids || [];
    return {
      id: a.kind + ':' + i,
      sort: { sev: sev.rank, what: a.text, tool: a.tool || null, n: pids.length },
      cells: {
        sev: { v: sev.label, dot: sev.dot, title: sev.label },
        what: { v: a.text, warn: a.severity !== 'info', title: a.text + (a.detail ? '\n' + a.detail : '') },
        detail: { v: a.detail || '', cls: 'dim', title: a.detail || '' },
        tool: a.tool ? { v: ctx.toolName(a.tool), sw: colorFor('tool', a.tool) } : { v: 'Several tools', cls: 'dim' },
        n: { v: pids.length ? (pids.length > 3 ? pids.slice(0, 3).join(', ') + ' +' + (pids.length - 3) : pids.join(', ')) : NA, cls: 'dim', title: pids.length ? 'PIDs ' + pids.join(', ') : 'No process' },
        act: a.action ? { v: 'Copy command', cls: 'lk', title: a.action, go: copyAction(ctx, a.action) } : { v: '', title: 'Nothing to run' },
      },
    };
  });
  return {
    sub: rows.length ? rows.length + ' open, whole machine' : 'Nothing to look at',
    table: {
      cols: [{ k: 'sev', l: 'Severity', w: '92px' }, { k: 'what', l: 'Finding', w: '330px' }, { k: 'detail', l: 'Detail' }, { k: 'tool', l: 'Tool', w: '120px' }, { k: 'n', l: 'PIDs', w: '120px' }, { k: 'act', l: 'Action', w: '120px' }],
      rows, sort: { k: 'sev', dir: 'asc' },
      none: 'Nothing to look at. This checks for subagents over 2 GB of RAM, MCP servers whose parent is gone, headless browsers, and more than 5 process anomalies.',
    },
  };
}

function panelTraffic(ctx) {
  const per = machineOf(ctx).monitor.per_tool;
  const rows = per.map(t => {
    const loop = t.mcp_loop;
    const conf = t.est_confidence;
    return {
      id: t.tool,
      sort: {
        tool: t.label || t.tool, sess: t.sessions, in: t.inbound_bps, out: t.outbound_bps, tok: t.est_tokens,
        mcp: loop ? (loop.detected ? 1 + (loop.loops || 0) : 0) : null, fev: t.file_events, files: t.files_touched, cpu: t.cpu_pct, ws: t.workspace_bytes,
      },
      cells: {
        tool: { v: t.label || ctx.toolName(t.tool), sw: colorFor('tool', t.tool) },
        sess: { v: (t.sessions ?? NA) + ' / ' + (t.pids ?? NA), title: (t.sessions ?? NA) + ' sessions, ' + (t.pids ?? NA) + ' processes' },
        in: { v: fmtBps(t.inbound_bps), title: 'Received now' },
        out: { v: fmtBps(t.outbound_bps), title: 'Sent now' },
        tok: { v: fmtN(t.est_tokens), sub: conf == null ? null : pctOf(conf) + ' confidence', title: 'Estimated from network traffic' + (t.est_source ? ' (' + t.est_source + ')' : '') + ', confidence ' + pctOf(conf) + '. The tool does not report this number.' },
        mcp: loop
          ? { v: loop.detected ? 'Loop, ' + (loop.loops || 0) : 'No', warn: !!loop.detected, cls: loop.detected ? '' : 'dim', title: (loop.detected ? 'Repeated MCP traffic that looks like an agent loop: ' + (loop.loops || 0) + ' loops' : 'No MCP loop seen') + ', confidence ' + pctOf(loop.confidence) }
          : { v: NA, cls: 'dim', title: 'The monitor reports no MCP traffic for this tool' },
        fev: { v: fmtN(t.file_events), title: 'File changes the monitor saw' },
        files: { v: fmtN(t.files_touched), title: 'Different files touched' },
        cpu: { v: fmtCpu(t.cpu_pct), sub: t.cpu_peak == null ? null : 'peak ' + fmtCpu(t.cpu_peak) },
        ws: { v: fmtBytes(t.workspace_bytes), title: (t.workspaces || []).join('\n') || 'No workspace reported' },
      },
    };
  });
  return {
    sub: 'Live, from the network and file monitor. Tokens here are an estimate',
    table: {
      cols: [
        { k: 'tool', l: 'Tool', w: '140px' }, { k: 'sess', l: 'Sessions', n: true, w: '76px', t: 'Sessions and processes' }, { k: 'in', l: 'In', n: true, w: '76px', t: 'Bytes received per second' },
        { k: 'out', l: 'Out', n: true, w: '76px', t: 'Bytes sent per second' }, { k: 'tok', l: 'Tokens (estimate)', n: true, w: '128px' }, { k: 'mcp', l: 'MCP loop', w: '84px' },
        { k: 'fev', l: 'File events', n: true, w: '80px' }, { k: 'files', l: 'Files', n: true, w: '56px' }, { k: 'cpu', l: 'CPU', n: true, w: '104px' }, { k: 'ws', l: 'Workspace', n: true },
      ],
      rows, sort: { k: 'in', dir: 'desc' }, none: 'The live monitor reports no tool right now.',
    },
  };
}
/** Findings of one kind fold under one row once they are this many. */
export const FOLD_FINDINGS = 3;

function panelFindings(ctx, local) {
  const rowOf = (f, level) => ({
    id: f.id, level, parentId: level ? 'w:' + f.what : undefined, go: () => ctx.actions.runFinding(f),
    sort: { what: f.what, tool: f.tool },
    cells: {
      what: { v: f.what, warn: true, pad: level ? 14 : 0 }, tool: f.tool ? { v: ctx.toolName(f.tool), sw: colorFor('tool', f.tool) } : { v: 'All tools', cls: 'dim' },
      where: { v: f.where, cls: 'm', title: f.whereFull || f.where }, effect: { v: f.effect, cls: 'dim' }, act: { v: f.fix, cls: 'lk', go: () => ctx.actions.runFinding(f) },
    },
  });
  const byWhat = new Map();
  for (const f of ctx.findings.list) {
    if (!byWhat.has(f.what)) byWhat.set(f.what, []);
    byWhat.get(f.what).push(f);
  }
  const rows = [];
  for (const [what, items] of byWhat) {
    if (items.length < FOLD_FINDINGS) { items.forEach(f => rows.push(rowOf(f, 0))); continue; }
    const fid = 'w:' + what;
    const open = local.folded[fid] === false;
    const fold = () => local.setFold(fid, open);
    const tools = [...new Set(items.map(f => f.tool || ''))];
    rows.push({
      id: fid, sort: { what, tool: tools[0] || null },
      cells: {
        what: { v: what, warn: true, sub: items.length + ' places', foldOn: true, foldOpen: open, foldLabel: open ? 'Fold these findings' : 'Unfold these findings', fold },
        tool: tools.length === 1 && tools[0] ? { v: ctx.toolName(tools[0]), sw: colorFor('tool', tools[0]) } : { v: tools.length === 1 ? 'All tools' : tools.length + ' tools', cls: 'dim' },
        where: { v: items.length + ' places', cls: 'dim', title: items.map(f => f.whereFull || f.where).join('\n') },
        effect: { v: items[0].effect, cls: 'dim' },
        act: { v: open ? 'Fold' : 'Show all ' + items.length, cls: 'lk', go: fold },
      },
    });
    if (open) items.forEach(f => rows.push(rowOf(f, 1)));
  }
  return {
    sub: 'Settings and text that change what the model gets, and that no prompt shows',
    table: {
      cols: [{ k: 'what', l: 'Finding', w: '330px' }, { k: 'tool', l: 'Tool', w: '130px' }, { k: 'where', l: 'Where', w: '240px' }, { k: 'effect', l: 'What it does' }, { k: 'act', l: 'Action', w: '124px' }],
      rows, tree: true, none: ctx.findings.loading ? 'Reading the settings...' + (ctx.findings.scan ? ' ' + ctx.findings.scan.step + ', ' + Math.round(ctx.findings.scan.elapsed_s) + ' s' : '') : (ctx.findings.error ? 'Could not read the settings: ' + ctx.findings.error : 'No open findings.'),
    },
    note: [
      byWhat.size < ctx.findings.list.length ? 'Findings of one kind are folded under one row. Unfold a row for each place.' : '',
      ctx.findings.incomplete?.length ? 'The scan reached its time limit and skipped: ' + ctx.findings.incomplete.join(', ') + '.' : '',
      ctx.findings.failed?.length ? 'The scan could not read: ' + ctx.findings.failed.map(f => f.step + ' (' + f.error + ')').join(', ') + '.' : '',
    ].filter(Boolean).join(' ') || null,
    actions: ctx.findings.loading ? null : [{ label: 'See every source', go: () => ctx.actions.openDrawer({ type: 'hidden' }, true) }],
  };
}

function panelSettings(ctx) {
  const shown = ctx.settingToolIds.filter(id => !ctx.tools || ctx.tools.includes(id));
  const rows = ctx.findings.settings.map(s => {
    const cells = { k: { v: s.label } };
    const sort = { k: s.label };
    shown.forEach(id => {
      const x = s.values[id] || { v: 'No data' };
      cells[id] = { v: x.v, sub: x.sub, warn: !!x.warn, title: x.v + (x.sub ? ', ' + x.sub : ''), cls: x.v === 'No data' ? 'dim' : '' };
      sort[id] = x.v;
    });
    return { id: s.label, cells, sort, go: s.path ? () => ctx.actions.openDrawer({ type: 'file', path: s.path, line: s.line }, true) : null };
  });
  return {
    sub: 'Value in force for each tool, and where it comes from',
    table: { cols: [{ k: 'k', l: 'Setting', w: '180px' }].concat(shown.map(id => ({ k: id, l: ctx.toolName(id), minw: 112 }))), rows, none: ctx.findings.loading ? 'Reading the settings...' : 'No settings read yet.' },
    actions: [{ label: 'Open the Settings screen', go: () => ctx.actions.setScreen('settings') }],
    note: ctx.findings.note || '',
  };
}

function panelSources(ctx) {
  const fresh = new Map(machineOf(ctx).pipeline.freshness.map(f => [f.tool, f]));
  const rows = ctx.data.sources.map((s) => {
    const f = fresh.get(s.tool);
    return {
      id: s.tool, sort: { t: s.label || s.tool, s: s.data_from, l: s.last_data_ts, f: f?.last_seen ?? null, e: f ? f.errors : null },
      cells: {
        t: { v: s.label || ctx.toolName(s.tool), sw: colorFor('tool', s.tool) },
        s: { v: s.data_from || NA, cls: 'dim', sub: (s.locations || []).map(h => h.path + ' (' + h.found_by + ')').join(', '), title: (s.locations || []).map(h => h.path + ': ' + h.found_by).join('\n') },
        l: { v: ago(s.last_data_ts, ctx.nowS), cls: 'dim', title: 'Newest record in the history: ' + stamp(s.last_data_ts, true) },
        f: f
          ? { v: f.last_seen ? ago(f.last_seen, ctx.nowS) : 'Not live', sub: f.confidence == null ? null : pctOf(f.confidence), cls: f.last_seen && ctx.nowS - f.last_seen > 3600 ? 'warn' : 'dim', title: 'Live monitor: ' + (f.last_seen ? 'last saw this tool ' + stamp(f.last_seen, true) : 'not running now') + '. Telemetry from ' + (f.source || NA) + ', confidence ' + pctOf(f.confidence) + '.' }
          : { v: NA, cls: 'dim', title: 'The monitor does not report this tool' },
        e: f ? { v: String(f.errors), cls: f.errors ? 'crit' : 'dim', title: f.last_error || 'No errors reported' } : { v: NA, cls: 'dim' },
      },
    };
  });
  return {
    sub: 'Where each tool leaves its data, and how fresh it is',
    table: { cols: [{ k: 't', l: 'Tool', w: '140px' }, { k: 's', l: 'Data from' }, { k: 'l', l: 'Last data', n: true, w: '84px', t: 'Newest record in the history' }, { k: 'f', l: 'Freshness', n: true, w: '104px', t: 'When the live monitor last saw the tool, and how sure the telemetry is' }, { k: 'e', l: 'Errors', n: true, w: '56px', t: 'API errors the tool logged' }], rows },
  };
}

function panelSelf(ctx) {
  const s = ctx.data.self || {};
  const kids = (s.children || []).map(c => ({ name: c.name, cpu: c.cpu_percent, rss: c.memory_rss_bytes }));
  const kidCpu = sumOf(kids.map(k => k.cpu));
  const kidRss = sumOf(kids.map(k => k.rss));
  const list = [{ name: 'aictl daemon', cpu: s.cpu_percent == null ? null : Math.max(0, s.cpu_percent - kidCpu), rss: s.memory_rss_bytes == null ? null : Math.max(0, s.memory_rss_bytes - kidRss) }, ...kids];
  const rows = list.map((r, i) => ({
    id: r.name + i, sort: { n: r.name, c: r.cpu, m: r.rss },
    cells: { n: { v: r.name, cls: 'm' }, c: { v: fmtCpu(r.cpu) }, m: { v: fmtBytes(r.rss) } },
  }));
  const pipe = machineOf(ctx).pipeline;
  const me = pipe.self || {};
  const sink = pipe.sink;
  const otel = pipe.otel_receiver;
  const stream = pipe.stream || {};
  const tables = Object.entries(me.db_tables || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ': ' + fmtN(v)).join('\n');
  const pipeline = [
    { label: 'Uptime', value: fmtDur(me.uptime_s), title: 'Since the aictl daemon started' + (me.pid ? ', PID ' + me.pid : '') },
    { label: 'Threads', value: me.threads == null ? NA : String(me.threads) },
    { label: 'Rows', value: fmtN(me.db_rows), title: tables ? 'Rows in each table, read once a minute:\n' + tables : 'Not read yet' },
    { label: 'Viewers', value: stream.connected_clients == null ? NA : String(stream.connected_clients), title: 'Browser windows that follow the live stream' },
    { label: 'Snapshot', value: stream.snapshot_age_s == null ? NA : fmtAge(stream.snapshot_age_s), cls: stream.snapshot_age_s > STALE_AFTER_S ? 'warn' : null, title: 'Time since the collector published its last snapshot' },
  ];
  if (sink) {
    pipeline.push(
      { label: 'Samples', value: fmtN(sink.emitted), title: 'Samples the collectors sent to the store' + (sink.tracked != null ? '. ' + fmtN(sink.tracked) + ' metrics tracked' : '') },
      { label: 'Written', value: fmtN(sink.flushed), title: 'Samples written to the history' + (sink.buffered != null ? '. ' + fmtN(sink.buffered) + ' waiting' : '') },
      { label: 'Dropped', value: fmtN(sink.dropped), cls: sink.dropped ? 'crit' : null, title: sink.dropped ? 'Samples lost before they reached the history' : 'No samples lost' },
    );
  }
  if (otel) {
    pipeline.push(
      { label: 'Metrics in', value: fmtN(otel.metrics_received), sub: otel.active ? 'Active' : 'No data for 5 min', title: 'OpenTelemetry metrics received' + (otel.last_receive_at ? ', last ' + stamp(otel.last_receive_at, true) : '') },
      { label: 'Events in', value: fmtN(otel.events_received), title: 'OpenTelemetry log events received' },
      { label: 'Model calls', value: fmtN(otel.api_calls_total), sub: otel.api_errors_total ? otel.api_errors_total + ' errors' : '', cls: otel.api_errors_total ? 'warn' : null, title: 'Model API calls the tools reported, and how many failed' },
      { label: 'Rejected', value: fmtN((otel.errors || 0) + (otel.dropped || 0)), cls: otel.errors || otel.dropped ? 'warn' : null, title: (otel.errors || 0) + ' payloads that could not be read, ' + (otel.dropped || 0) + ' bad attributes or data points skipped' },
    );
  }
  return {
    sub: 'What this monitoring costs, and how its data pipeline runs',
    banner: sink?.flood ? 'Data loss: flood protection is on and drops samples. ' + fmtN(sink.dropped) + ' lost so far.' : null,
    stats: [
      { label: 'CPU', value: fmtCpu(s.cpu_percent), title: 'The aictl daemon and its helper processes together. 100% is one full core' }, { label: 'RAM', value: fmtBytes(s.memory_rss_bytes) },
      { label: 'History', value: fmtBytes(s.history_live_bytes ?? s.history_bytes), sub: s.history_limit_bytes ? 'Limit ' + fmtBytes(s.history_limit_bytes) : '', title: 'Live data in the history store' },
      { label: 'File on disk', value: fmtBytes(s.history_bytes), sub: s.history_live_bytes != null && s.history_bytes > s.history_live_bytes ? fmtBytes(s.history_bytes - s.history_live_bytes) + ' can be freed' : '' },
      { label: 'Kept for', value: s.retention_days == null ? NA : s.retention_days + ' d' },
      ...pipeline,
    ],
    table: { cols: [{ k: 'n', l: 'Process' }, { k: 'c', l: 'CPU', n: true, w: '56px' }, { k: 'm', l: 'RAM', n: true, w: '64px' }], rows, sort: { k: 'c', dir: 'desc' } },
    actions: [{ label: 'Compact the history', go: () => ctx.actions.runCommand({ title: 'Compact the history', lead: 'This removes records older than the retention time, then rewrites the history file to free its empty space. On a large file this can take minutes, and new data waits until it ends.', command: 'aictl db compact', applyLabel: 'Run this command', action: 'db-compact', done: 'Compacted the history' }) }],
  };
}

const COLLECTOR_DOT = { active: 'var(--good)', ok: 'var(--good)', degraded: 'var(--warn)', failed: 'var(--crit)', error: 'var(--crit)' };

function panelCollectors(ctx, local) {
  const mon = machineOf(ctx).monitor;
  const open = !!local.folded['roots-open'];
  const rows = mon.collectors.map(c => ({
    id: 'c:' + c.name, sort: { n: c.name, st: c.status, mode: c.mode },
    cells: {
      n: { v: c.name, cls: 'm' },
      st: { v: c.status, dot: COLLECTOR_DOT[c.status] || 'var(--ink3)', title: c.status + (c.detail ? ': ' + c.detail : '') },
      mode: { v: c.mode || NA, cls: 'dim' },
      d: { v: c.detail || '', cls: 'dim', title: c.detail || '' },
    },
  }));
  if (mon.roots.length) {
    rows.push({
      id: 'roots', sort: {},
      cells: { n: { v: 'Monitored folders', sub: mon.roots.length + '', foldOn: true, foldOpen: open, foldLabel: open ? 'Fold the monitored folders' : 'Unfold the monitored folders', fold: () => local.setFold('roots-open', !open), title: 'Folders the monitor watches for file events' }, d: { v: open ? '' : mon.roots.map(r => baseName(r.path)).join(', '), cls: 'dim', title: mon.roots.map(r => r.kind + ': ' + r.path).join('\n') } },
    });
    if (open) {
      mon.roots.forEach((r, i) => rows.push({
        id: 'r:' + i, parentId: 'roots', level: 1, sort: {},
        cells: { n: { v: r.kind === 'state' ? 'Tool state' : 'Workspace', pad: 16, cls: 'dim' }, d: { v: r.path, cls: 'm', title: r.path } },
      }));
    }
  }
  const down = mon.collectors.filter(c => c.status !== 'active' && c.status !== 'ok').length;
  return {
    sub: mon.collectors.length ? mon.collectors.length + ' collectors' + (down ? ', ' + down + ' not active' : ', all active') : 'The live monitor is off',
    table: { cols: [{ k: 'n', l: 'Collector', w: '170px' }, { k: 'st', l: 'Status', w: '92px' }, { k: 'mode', l: 'Mode', w: '96px' }, { k: 'd', l: 'Detail' }], rows, tree: true, none: 'No collector reports. The live monitor is off or has not started.' },
  };
}

// An ingester that is off or has no source on this machine is not a fault.
const QUIET_INGESTER = new Set(['ok', 'off', 'waiting', 'no source']);

function panelQuality(ctx) {
  const pipe = machineOf(ctx).pipeline;
  const now = ctx.nowS;
  const stats = pipe.ingesters.map(i => ({
    label: i.name, value: i.status, cls: QUIET_INGESTER.has(i.status) ? null : 'crit',
    sub: i.last_ok ? 'OK ' + ago(i.last_ok, now) : (i.last_poll ? 'Read ' + ago(i.last_poll, now) : 'Never read'),
    title: i.name + ': ' + i.status + (i.error ? '. ' + i.error : '') + (i.source ? '\nReads ' + i.source : '') + (i.rows != null ? '\n' + i.rows + ' rows on the last read' : '') + (i.rows_total != null ? ', ' + fmtN(i.rows_total) + ' in all' : ''),
  }));
  const rows = pipe.data_quality.map((q, i) => {
    const sev = q.severity === 'error' ? SEVERITY.crit : q.severity === 'warning' ? SEVERITY.warn : SEVERITY.info;
    return {
      id: q.component + ':' + q.source + ':' + i,
      sort: { ts: q.ts, sev: sev.rank, c: q.component, st: q.status, n: q.count },
      cells: {
        ts: { v: ago(q.ts, now), cls: 'dim', title: stamp(q.ts, true) + (q.last_ok ? '. Last OK ' + stamp(q.last_ok, true) : '') },
        sev: { v: q.severity || q.status || 'info', dot: sev.dot },
        c: { v: q.component || NA, cls: 'm', sub: q.source ? baseName(q.source) : null, title: [q.component, q.source, q.kind ? 'kind ' + q.kind : ''].filter(Boolean).join('\n') },
        st: { v: q.status || NA, cls: q.status === 'ok' ? 'dim' : '' },
        t: { v: q.text || NA, cls: 'dim', title: (q.text || '') + (q.error ? '\n' + q.error : '') },
        n: { v: q.count == null ? NA : String(q.count), cls: 'dim', title: 'Times seen' },
      },
    };
  });
  const bad = pipe.data_quality.filter(q => q.severity === 'error' || q.severity === 'warning').length;
  return {
    sub: pipe.ingesters.length + ' ingesters, ' + rows.length + ' data-quality events' + (bad ? ', ' + bad + ' need a look' : ''),
    stats: stats.length ? stats : [{ label: 'Ingesters', value: 'None', title: 'No ingester runs in this daemon' }],
    table: {
      cols: [{ k: 'ts', l: 'When', n: true, w: '76px' }, { k: 'sev', l: 'Severity', w: '84px' }, { k: 'c', l: 'Component', w: '190px' }, { k: 'st', l: 'Status', w: '96px' }, { k: 't', l: 'Message' }, { k: 'n', l: 'Seen', n: true, w: '48px' }],
      rows, sort: { k: 'ts', dir: 'desc' }, limit: 10, none: 'No data-quality events.',
    },
  };
}

const COVERAGE_HELP = { Exact: 'The tool reports this value.', Partial: 'The tool reports this value for some calls only.', Estimate: 'aictl computes this value. The tool does not report it.', 'Needs hooks': 'Available only when aictl hooks or telemetry are on.', 'Not reported': 'The tool does not report this value.', 'Not checked': 'Nobody has checked this tool for this value yet.', 'Totals only': 'The tool reports a total, not a value for each session.', 'No line counts': 'aictl gets the file names but not the line counts.', 'No data': 'aictl found no data for this tool.' };

function panelCoverage(ctx) {
  const shown = ctx.toolIds.filter(id => !ctx.tools || ctx.tools.includes(id));
  const rows = (ctx.data.coverage?.rows || []).map(r => {
    const cells = { k: { v: r.label } };
    const sort = { k: r.label };
    shown.forEach(id => {
      const c = r.cells?.[id] || { state: 'No data' };
      cells[id] = { v: c.state, warn: c.state !== 'Exact', cls: c.state === 'Exact' ? 'dim' : '', title: c.why || COVERAGE_HELP[c.state] || c.state };
      sort[id] = c.state;
    });
    return { id: r.key, cells, sort };
  });
  return {
    sub: 'What aictl can collect for each tool, and how exact it is',
    table: { cols: [{ k: 'k', l: 'Data', w: '260px' }].concat(shown.map(id => ({ k: id, l: ctx.toolName(id), minw: 112 }))), rows },
    note: ['Some Exact items still need new collection work. Cost is always an estimate from list prices.']
      .concat((ctx.data.coverage?.notes || []).filter(n => shown.includes(n.tool)).map(n => n.text)).join(' '),
  };
}

const BUILDERS = {
  attention: panelAttention, agentsT: panelAgents, byModel: panelByModel, byRole: panelByRole,
  tokens: panelTokens, cacheRate: panelCacheRate, cost: panelCost, messages: panelMessages, projects: panelProjects,
  promptsL: panelPrompts, pprompts: panelProjectPrompts, skills: panelSkills,
  toolCalls: panelToolCalls, confirms: panelConfirms, errors: panelErrors, latency: panelLatency, loops: panelLoops,
  changesT: panelChanges, tests: panelTests, memfiles: panelMemFiles,
  cpu: (c, l, p, n) => panelResource(c, l, p, n, 'cpu'), ram: (c, l, p, n) => panelResource(c, l, p, n, 'mem'), alerts: panelAlerts, procs: panelProcs, traffic: panelTraffic,
  findings: panelFindings, settings: panelSettings, sources: panelSources, self: panelSelf, collectors: panelCollectors, quality: panelQuality, coverage: panelCoverage,
  ...CONTEXT_BUILDERS,
};
export const PANEL_IDS = Object.keys(BUILDERS);

/** Build one panel. pn is the layout entry, for the chart height after a resize. */
export function buildPanel(id, ctx, local, pn) {
  const b = BUILDERS[id];
  if (!b) return {};
  return b(ctx, local, id, pn);
}
