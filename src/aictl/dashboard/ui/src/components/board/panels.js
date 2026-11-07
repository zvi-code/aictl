// ─── Board panels — one builder per panel, from /api/board to a description ─
// A builder returns {sub, modes, stats, segbar, chart, canTable, table, hasCols,
// actions, note, text}. Panel.js draws that. A value the API does not have is
// null, which the formatters show as n/a.
import { GROWS } from './layout.js';
import {
  NA, OTHER_COLOR, UNIT, ago, baseName, colorFor, fmtBytes, fmtCpu, fmtDur, fmtLines, fmtMem, fmtMs, fmtN, fmtRate,
  fmtCredits, fmtShare, fmtUsd, isLive, projectName, sparkPath, stamp, statusMeta,
} from './format.js';
import { bucketLabel } from './chartModel.js';

const num = v => (v === null || v === undefined ? -1 : v);
const sumOf = list => list.reduce((s, v) => s + (v || 0), 0);
const pctBar = (v, mx) => (v && mx ? (v / mx) * 100 : 0);
const lastVal = vals => { for (let i = vals.length - 1; i >= 0; i--) if (vals[i] !== null && vals[i] !== undefined) return vals[i]; return null; };
const OVER_SERIES = 5;

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
  const liveN = roots.filter(a => isLive(ctx.stopped[a.id] ? 'stopped' : a.status)).length;
  // The list is capped, so the count comes from the totals when the server gives them.
  const scope = ctx.data.scope || {};
  const kidCount = scope.shown_sessions != null ? scope.shown_agents - scope.shown_sessions : agents.length - roots.length;
  return {
    sub: liveN + ' running, ' + (roots.length - liveN) + ' ended, ' + kidCount + ' subagents' + (noData ? ', ' + noData + ' with processes only' : ''),
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
    r.cells.m = { v: shortModel(m.model), sw: c, foldOn: true, foldOpen: open, foldLabel: open ? 'Fold the agents' : 'Unfold the agents', fold: () => local.setFold('m:' + m.model, !open), title: 'Click to filter by ' + m.model };
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
  const turns = sumOf(m.assistant || []);
  out.stats = [
    { label: 'Per agent', value: shown && k.messages != null ? (k.messages / shown).toFixed(0) : NA },
    { label: 'Tool calls per turn', value: turns && k.tool_calls != null ? (k.tool_calls / turns).toFixed(1) : NA },
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
    table: { cols: [{ k: 'at', l: 'Time', w: '62px' }, { k: 'text', l: 'Prompt' }, { k: 'project', l: 'Project', w: '96px' }, { k: 'tokens', l: 'Tokens', n: true, w: '60px' }], rows, sort: { k: 'at', dir: 'desc' }, limit: 60, primary: 'text' },
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
  return { sub: 'Click a skill to see who can see it, its uses and its text', table: { cols: [{ k: 's', l: 'Skill' }, { k: 'sc', l: 'Scope', w: '70px' }, { k: 'ag', l: 'Agents', n: true, w: '48px' }, { k: 'n', l: 'Uses', n: true, w: '76px' }, { k: 'tokens', l: 'Turn tokens', n: true, w: '76px', t: 'All tokens of every agent in the turns where this skill ran. Skills used in one turn each show that turn, so do not add these up.' }], rows, sort: { k: 'n', dir: 'desc' }, none: 'No skill was used in this time.' } };
}

function panelToolCalls(ctx) {
  const list = ctx.data.tools;
  const mx = Math.max(1, ...list.map(t => t.calls || 0));
  const rows = list.map(t => ({
    id: t.name, go: () => ctx.actions.openDrawer({ type: 'tool', name: t.name }, true),
    sort: { k: t.name, n: t.calls, f: t.failed, fp: t.fail_rate, p50: t.p50_ms, p95: t.p95_ms, max: t.max_ms },
    cells: {
      k: { v: t.name, sub: t.server ? 'server' : '' }, n: { barOn: true, bar: pctBar(t.calls, mx), barC: 'var(--s1)', v: fmtN(t.calls) }, f: { v: t.failed ?? NA, cls: t.failed ? 'crit' : 'dim' }, fp: { v: fmtRate(t.fail_rate), cls: t.failed ? 'crit' : 'dim' },
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
    cells: { k: { v: t.name }, auto: { v: t.auto ?? NA }, approved: { v: t.approved ?? NA }, denied: { v: t.denied ?? NA, cls: t.denied ? 'crit' : 'dim' }, blocked: { v: t.blocked ?? NA, cls: 'dim', title: 'A rule or hook stopped the call, and nobody was asked' }, w: { v: t.median_wait_s == null ? NA : Math.round(t.median_wait_s) + ' s', cls: 'dim' } },
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
    cells: { k: { v: e.key, title: e.sample || e.key }, kind: { v: e.kind, cls: 'dim' }, n: { v: e.count ?? NA, cls: 'crit' }, ag: { v: e.agents ?? NA }, last: { v: stamp(e.last_ts), cls: 'dim' } },
  }));
  out.table = { cols: [{ k: 'k', l: 'Error' }, { k: 'kind', l: 'Kind', w: '44px' }, { k: 'n', l: 'Count', n: true, w: '48px' }, { k: 'ag', l: 'Agents', n: true, w: '52px' }, { k: 'last', l: 'Last', w: '84px' }], rows, sort: { k: 'n', dir: 'desc' }, none: 'No failures in this time.' };
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
  out.table = { cols: [{ k: 'k', l: 'What' }, { k: 'n', l: 'Count', n: true, w: '58px' }, { k: 'p50', l: 'p50', n: true, w: '70px' }, { k: 'p95', l: 'p95', n: true, w: '70px' }, { k: 'p99', l: 'p99', n: true, w: '70px' }, { k: 'max', l: 'Max', n: true, w: '70px' }], rows };
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
    cells: { f: { v: f.path, title: f.project + ': ' + f.path }, ch: { barOn: true, bar: pctBar((f.lines_added || 0) + (f.lines_removed || 0), mx), barC: 'var(--s1)', v: fmtLines(f.lines_added, f.lines_removed) }, edits: { v: f.edits ?? NA }, ag: { v: f.agents ?? NA }, last: { v: stamp(f.last_ts), cls: 'dim' } },
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
        path: { v: f.path }, tool: { v: f.read_by || NA, cls: 'dim' }, scope: { v: f.scope || NA, cls: 'dim' }, tokens: { v: fmtN(f.tokens) },
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
  const nowSum = sumOf(series.map(s => lastVal(s.vals)));
  const legendFmt = kind === 'cpu' ? LAST_CPU : LAST_MEM;
  const out = chartPanel(ctx, local, pid, pn, { kind: 'line', series, unit, h: 120, legendFmt, aria: kind === 'cpu' ? 'CPU by tool' : 'Memory by tool' }, 'Now ' + (series.length ? fmt(nowSum) : NA) + ' across tools');
  const f = ctx.filters;
  if (f.project !== 'all' || f.model !== 'all' || f.status !== 'all') out.note = 'This chart follows the Tool filter and the time only.';
  return out;
}
const LAST_CPU = s => fmtCpu(lastVal(s.vals));
const LAST_MEM = s => fmtMem(lastVal(s.vals));

function panelProcs(ctx) {
  const list = ctx.data.processes;
  // A process with no session data has no detail to open.
  const noDetail = new Set(ctx.data.agents.filter(a => a.placeholder).map(a => a.id));
  const rows = list.map((p, i) => ({
    id: p.pid + ':' + i, go: p.agent_id && !noDetail.has(p.agent_id) ? openAgent(ctx, p.agent_id) : null,
    sort: { name: p.name, cpu: p.cpu_percent, mem: p.mem_mb, a: p.title, pid: p.pid },
    cells: { name: { v: p.name, cls: 'm' }, pid: { v: p.pid ?? NA, cls: 'dim' }, tool: { v: ctx.toolName(p.tool), sw: colorFor('tool', p.tool) }, a: { v: p.title || NA, cls: 'dim' }, cpu: { v: fmtCpu(p.cpu_percent) }, mem: { v: fmtMem(p.mem_mb) } },
  }));
  const cpu = sumOf(list.map(p => p.cpu_percent));
  const mem = sumOf(list.map(p => p.mem_mb));
  return {
    sub: 'Live now: ' + rows.length + ' processes, ' + fmtCpu(cpu) + ' CPU (100% is one full core), ' + fmtMem(mem) + '. The time range does not apply',
    table: { cols: [{ k: 'name', l: 'Process', w: '170px' }, { k: 'pid', l: 'PID', n: true, w: '60px' }, { k: 'tool', l: 'Tool', w: '140px' }, { k: 'a', l: 'Agent' }, { k: 'cpu', l: 'CPU', n: true, w: '60px' }, { k: 'mem', l: 'RAM', n: true, w: '76px' }], rows, sort: { k: 'cpu', dir: 'desc' }, none: 'No live processes.' },
  };
}

function panelFindings(ctx) {
  const rows = ctx.findings.list.map(f => ({
    id: f.id, go: () => ctx.actions.runFinding(f),
    sort: { what: f.what, tool: f.tool },
    cells: {
      what: { v: f.what, warn: true }, tool: f.tool ? { v: ctx.toolName(f.tool), sw: colorFor('tool', f.tool) } : { v: 'All tools', cls: 'dim' },
      where: { v: f.where, cls: 'm', title: f.whereFull || f.where }, effect: { v: f.effect, cls: 'dim' }, act: { v: f.fix, cls: 'lk', go: () => ctx.actions.runFinding(f) },
    },
  }));
  return {
    sub: 'Settings and text that change what the model gets, and that no prompt shows',
    table: {
      cols: [{ k: 'what', l: 'Finding', w: '330px' }, { k: 'tool', l: 'Tool', w: '130px' }, { k: 'where', l: 'Where', w: '240px' }, { k: 'effect', l: 'What it does' }, { k: 'act', l: 'Action', w: '124px' }],
      rows, none: ctx.findings.loading ? 'Reading the settings...' + (ctx.findings.scan ? ' ' + ctx.findings.scan.step + ', ' + Math.round(ctx.findings.scan.elapsed_s) + ' s' : '') : (ctx.findings.error ? 'Could not read the settings: ' + ctx.findings.error : 'No open findings.'),
    },
    note: [
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
    actions: ctx.findings.settings.length ? [{ label: 'See all settings on the configuration screen', href: '?tab=config' }] : null,
    note: ctx.findings.note || '',
  };
}

function panelSources(ctx) {
  const rows = ctx.data.sources.map(s => ({
    id: s.tool, sort: { t: s.label || s.tool, s: s.data_from },
    cells: { t: { v: s.label || ctx.toolName(s.tool), sw: colorFor('tool', s.tool) }, s: { v: s.data_from || NA, cls: 'dim', sub: (s.locations || []).map(h => h.path + ' (' + h.found_by + ')').join(', '), title: (s.locations || []).map(h => h.path + ': ' + h.found_by).join('\n') }, l: { v: ago(s.last_data_ts, ctx.nowS), cls: 'dim' } },
  }));
  return { sub: 'Where each tool leaves its data', table: { cols: [{ k: 't', l: 'Tool', w: '140px' }, { k: 's', l: 'Data from' }, { k: 'l', l: 'Last data', w: '84px' }], rows } };
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
  return {
    sub: 'What this monitoring costs',
    stats: [
      { label: 'CPU, with helpers', value: fmtCpu(s.cpu_percent) }, { label: 'RAM', value: fmtBytes(s.memory_rss_bytes) },
      { label: 'History data', value: fmtBytes(s.history_live_bytes ?? s.history_bytes), sub: s.history_limit_bytes ? 'Limit ' + fmtBytes(s.history_limit_bytes) : '' },
      { label: 'File on disk', value: fmtBytes(s.history_bytes), sub: s.history_live_bytes != null && s.history_bytes > s.history_live_bytes ? fmtBytes(s.history_bytes - s.history_live_bytes) + ' can be freed' : '' },
      { label: 'Kept for', value: s.retention_days == null ? NA : s.retention_days + ' d' },
    ],
    table: { cols: [{ k: 'n', l: 'Process' }, { k: 'c', l: 'CPU', n: true, w: '56px' }, { k: 'm', l: 'RAM', n: true, w: '64px' }], rows, sort: { k: 'c', dir: 'desc' } },
    actions: [{ label: 'Compact the history', go: () => ctx.actions.runCommand({ title: 'Compact the history', lead: 'This removes records older than the retention time, then rewrites the history file to free its empty space. On a large file this can take minutes, and new data waits until it ends.', command: 'aictl db compact', applyLabel: 'Run this command', action: 'db-compact', done: 'Compacted the history' }) }],
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
  cpu: (c, l, p, n) => panelResource(c, l, p, n, 'cpu'), ram: (c, l, p, n) => panelResource(c, l, p, n, 'mem'), procs: panelProcs,
  findings: panelFindings, settings: panelSettings, sources: panelSources, self: panelSelf, coverage: panelCoverage,
};
export const PANEL_IDS = Object.keys(BUILDERS);

/** Build one panel. pn is the layout entry, for the chart height after a resize. */
export function buildPanel(id, ctx, local, pn) {
  const b = BUILDERS[id];
  if (!b) return {};
  return b(ctx, local, id, pn);
}
