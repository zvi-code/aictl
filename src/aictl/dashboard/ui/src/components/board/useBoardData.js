// ─── Board data for the current filters ───────────────────────────
// Kusto consumes one shared, scoped live projection; messages never refetch the board.
// SQLite and older daemons retain stream-triggered REST reads and polling.
// With a selected time there are two fetches: the whole range feeds the charts,
// and the selected time feeds everything else.
// /api/board/machine (processes, collectors, pipeline health) is fetched with each
// board fetch and on every tick while live, so a stalled collector still shows.
// /api/board/context (context budget, files, memory, lifetime telemetry) changes
// slowly: it is fetched when the Tool filter changes and at most every 30 s.
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as api from '../../api.js';
import { useSse } from '../../useSse.js';
import { useLiveState } from '../../live/context.js';
import { historyFailure, historyReady, mergeRuntimeAgents, projectedBoard, runtimeReady, topicData, topicEntities } from '../../live/model.js';
import { isStoredToolSelected } from '../../utils/toolScope.js';
import { boardQuery, windowOf } from './filters.js';

export const TICK_MS = 5000;
export const MESSAGE_FETCH_GAP_MS = 1500;
const POLL_WITHOUT_STREAM_MS = 30000;
export const CONTEXT_REFRESH_MS = 30000;

export const EMPTY_MACHINE = {
  generated_at: null,
  reported: { hooks: false },
  monitor: { collectors: [], roots: [], per_tool: [] },
  processes: [], cpu_per_core: [], alerts: [],
  pipeline: { self: {}, sink: null, otel_receiver: null, hooks: {}, ingesters: [], data_quality: [], freshness: [], stream: {} },
};

export const EMPTY_CONTEXT = {
  generated_at: null, root: null,
  budget: { tools: [], totals: {} },
  categories: [],
  map: { total: 0, policy: {}, rows: [], items: [] },
  memory: { entries: [], tokens: 0, growth: [] },
  files: [], telemetry: [],
  daily: { days: [], since: null, models: [], rows: [] },
  workflows: [],
  loaded: false,
};

/** Fill what an /api/board/context answer leaves out. */
export function normalizeContext(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY_CONTEXT;
  const list = v => (Array.isArray(v) ? v : []);
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const budget = obj(raw.budget);
  const map = obj(raw.map);
  const memory = obj(raw.memory);
  const daily = obj(raw.daily);
  if (Array.isArray(raw.nodes)) {
    const nodes = raw.nodes.map(n => ({ ...normalizeContext(n), node_id: n.node_id }));
    const tagged = pick => nodes.flatMap(n => pick(n).map(row => ({ ...row, node_id: n.node_id })));
    const total = (list, key) => list.reduce((sum, row) => sum + (row[key] || 0), 0);
    const policies = {};
    for (const n of nodes) for (const [k, v] of Object.entries(n.map.policy)) {
      policies[k] = (policies[k] || 0) + v;
    }
    return {
      ...EMPTY_CONTEXT, loaded: true, generated_at: raw.generated_at,
      budget: { tools: tagged(n => n.budget.tools) },
      categories: tagged(n => n.categories),
      map: { total: nodes.reduce((sum, n) => sum + n.map.total, 0), policy: policies,
        rows: tagged(n => n.map.rows), items: tagged(n => n.map.items) },
      memory: { entries: tagged(n => n.memory.entries), tokens: total(nodes.map(n => n.memory), 'tokens'), growth: tagged(n => n.memory.growth) },
      files: nodes.flatMap(n => n.files.map(f => ({ ...f, node_id: n.node_id, files: f.files.map(row => ({ ...row, node_id: n.node_id })) }))),
      telemetry: tagged(n => n.telemetry),
      daily: { days: [...new Set(nodes.flatMap(n => n.daily.days))].sort(), rows: tagged(n => n.daily.rows),
        models: [...new Map(nodes.flatMap(n => n.daily.models.map(m => [m.model, m]))).values()] },
      workflows: tagged(n => n.workflows),
    };
  }
  return {
    generated_at: raw.generated_at ?? null,
    root: raw.root ?? null,
    budget: { tools: list(budget.tools).map(b => ({ ...b, projects: list(b.projects) })), totals: obj(budget.totals) },
    categories: list(raw.categories).map(c => ({ ...c, kinds: list(c.kinds) })),
    map: { total: map.total || 0, policy: obj(map.policy), rows: list(map.rows), items: list(map.items) },
    memory: { entries: list(memory.entries), tokens: memory.tokens || 0, growth: list(memory.growth) },
    files: list(raw.files).map(f => ({ ...f, files: list(f.files) })),
    telemetry: list(raw.telemetry).map(t => ({ ...t, by_model: list(t.by_model), errors: list(t.errors), quota: obj(t.quota) })),
    daily: { ...daily, days: list(daily.days), since: daily.since ?? null, models: list(daily.models), rows: list(daily.rows) },
    workflows: list(raw.workflows),
    loaded: true,
  };
}

const EMPTY = {
  generated_at: null, capture_mode: null,
  range: { since: 0, until: 0, bucket_s: 0, bucket_starts: [] },
  options: { tools: [], projects: [], models: [] },
  scope: { shown_agents: 0, all_agents: 0 },
  kpis: { prev: {}, spark: {} },
  attention: [], agents: [], by_model: [], by_role: [], series: {}, saved_usd: null, unpriced: null, credits: null, projects: [], prompts: [], project_prompts: [], project_prompts_searched: [],
  skills: [], tools: [], confirms: { pending: [], by_tool: [] }, errors: [], latency: [], loops: [],
  changes: { files: [], totals: {} }, tests: [], memory_files: [], processes: [], sources: [], coverage: { rows: [] }, self: {},
  machine: EMPTY_MACHINE,
};

/** Fill what an /api/board/machine answer leaves out. */
export function normalizeMachine(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY_MACHINE;
  const list = v => (Array.isArray(v) ? v : []);
  const mon = raw.monitor || {};
  const pipe = raw.pipeline || {};
  return {
    ...EMPTY_MACHINE,
    ...raw,
    reported: { hooks: pipe.hooks != null },
    monitor: { collectors: list(mon.collectors), roots: list(mon.roots), per_tool: list(mon.per_tool) },
    processes: list(raw.processes),
    cpu_per_core: list(raw.cpu_per_core),
    alerts: list(raw.alerts),
    pipeline: {
      ...EMPTY_MACHINE.pipeline,
      ...pipe,
      self: pipe.self || {},
      ingesters: list(pipe.ingesters),
      data_quality: list(pipe.data_quality),
      freshness: list(pipe.freshness),
      stream: pipe.stream || {},
      hooks: pipe.hooks && typeof pipe.hooks === 'object' ? pipe.hooks : {},
    },
  };
}

/** Fill what /api/board/agent leaves out, so an older server still renders the new tabs. */
export function normalizeAgentDetail(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const list = v => (Array.isArray(v) ? v : []);
  return {
    ...raw,
    artifacts: list(raw.artifacts),
    artifacts_total: Number.isFinite(raw.artifacts_total) ? raw.artifacts_total : list(raw.artifacts).length,
    artifacts_bytes: Number.isFinite(raw.artifacts_bytes) ? raw.artifacts_bytes : null,
    commits: list(raw.commits).map(c => ({ ...c, prs: list(c.prs) })),
    prs_note: typeof raw.prs_note === 'string' ? raw.prs_note : '',
  };
}

/** Fill what /api/board/sessions leaves out. */
export function normalizeSessions(raw) {
  const rows = Array.isArray(raw?.rows) ? raw.rows : [];
  return { rows, total: Number.isFinite(raw?.total) ? raw.total : rows.length, ...(Array.isArray(raw?.by_node) ? { by_node: raw.by_node } : {}) };
}

/** Fill any key a response leaves out, so one missing list cannot blank the screen. */
export function normalizeBoard(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const out = { ...EMPTY, ...raw };
  out.range = { ...EMPTY.range, ...raw.range };
  out.options = { ...EMPTY.options, ...raw.options };
  out.scope = { ...EMPTY.scope, ...raw.scope };
  out.kpis = { ...EMPTY.kpis, ...raw.kpis };
  out.confirms = { ...EMPTY.confirms, ...raw.confirms };
  out.changes = { ...EMPTY.changes, ...raw.changes };
  out.coverage = { ...EMPTY.coverage, ...raw.coverage };
  for (const k of Object.keys(EMPTY)) {
    if (Array.isArray(EMPTY[k]) && !Array.isArray(out[k])) out[k] = [];
  }
  return out;
}

// A read in flight for the same query is left to finish: a slow server answered
// no tick at all when each tick aborted the read before it. One more read follows
// it when a tick asked meanwhile. A new query aborts the read of the old one.
function createLoader(onData, onError) {
  let ctrl = null;
  let pending = null;
  let again = false;
  let last = { query: null, etag: null };
  const loader = {
    pending: () => ctrl !== null,
    load(query) {
      if (ctrl && pending === query) { again = true; return undefined; }
      if (ctrl) ctrl.abort();
      const mine = new AbortController();
      ctrl = mine;
      pending = query;
      again = false;
      const etag = last.query === query ? last.etag : null;
      const done = () => { ctrl = null; pending = null; if (again) { again = false; loader.load(query); } };
      return api.getBoard(query, { signal: mine.signal, etag }).then((res) => {
        if (ctrl !== mine) return;
        if (res.status === 304) { onData(null, query); done(); return; }
        last = { query, etag: res.etag };
        onData(normalizeBoard(res.data), query);
        done();
      }).catch((e) => {
        if (e?.name === 'AbortError' || ctrl !== mine) return;
        onError(e);
        done();
      });
    },
    stop() { if (ctrl) { ctrl.abort(); ctrl = null; pending = null; again = false; } },
  };
  return loader;
}

/** /api/board/machine for the tool filter. A failed read keeps the last answer.
 * An answer equal to the last one, apart from generated_at, is not passed on, so the
 * board does not rebuild every panel for it. */
function toolsQuery(tools) {
  return tools ? 'tool=' + (tools.length ? tools.map(encodeURIComponent).join(',') : '-') : '';
}

function createMachineLoader(onData) {
  let ctrl = null;
  let pending = null;
  let last = {};
  return {
    load(tools, nodeScope = 'local', nodeId = null) {
      const q = toolsQuery(tools);
      const key = api.withNodeScope(q, nodeScope, nodeId);
      if (ctrl && pending === key) return;
      if (ctrl) ctrl.abort();
      const mine = new AbortController();
      ctrl = mine;
      pending = key;
      return (nodeScope === 'local' ? api.fetchJson('/api/board/machine' + (q ? '?' + q : ''), { signal: mine.signal })
        : api.getBoardMachine(q, { signal: mine.signal, nodeScope, nodeId })).then((d) => {
        if (ctrl !== mine) return;
        ctrl = null;
        const text = JSON.stringify(d && typeof d === 'object' ? { ...d, generated_at: null } : d);
        if (last.key === key && last.text === text) return;
        last = { key, text };
        onData({ key, data: normalizeMachine(d) });
      }).catch(e => { if (ctrl === mine) { ctrl = null; if (nodeScope !== 'local') { last = {}; onData({ key, data: { ...EMPTY_MACHINE, unavailable: e.message } }); } } });
    },
    stop() { if (ctrl) { ctrl.abort(); ctrl = null; } },
  };
}

/** /api/board/context for the tool filter, at most every CONTEXT_REFRESH_MS for the same filter. */
function createContextLoader(onData, onError = () => {}) {
  let ctrl = null;
  let last = { key: null, at: 0 };
  return {
    load(tools, nodeScope = 'local', nodeId = null) {
      const q = toolsQuery(tools);
      const key = api.withNodeScope(q, nodeScope, nodeId);
      const now = Date.now();
      if (last.key === key && (ctrl || now - last.at < CONTEXT_REFRESH_MS)) return undefined;
      if (ctrl) ctrl.abort();
      const mine = new AbortController();
      ctrl = mine;
      last = { key, at: now };
      return (nodeScope === 'local' ? api.fetchJson('/api/board/context' + (q ? '?' + q : ''), { signal: mine.signal })
        : api.getBoardContext(q, { signal: mine.signal, nodeScope, nodeId })).then((d) => {
        if (ctrl !== mine) return;
        ctrl = null;
        onData({ key, data: normalizeContext(d) });
      }).catch(error => {
        if (ctrl !== mine) return;
        ctrl = null;
        last = { key: null, at: 0 };
        if (error?.name !== 'AbortError') onError({ key, error });
      });
    },
    stop() { if (ctrl) { ctrl.abort(); ctrl = null; last = { key: null, at: 0 }; } },
  };
}

export function liveBoardData(subscription, filters, tools, context = EMPTY_CONTEXT) {
  const raw = projectedBoard(subscription);
  const board = normalizeBoard(raw);
  const agents = mergeRuntimeAgents(board.agents, subscription, filters, tools);
  const runtimeMachine = topicData(subscription, 'runtime.machine');
  const operational = topicData(subscription, 'runtime.health', 'local');
  const machine = normalizeMachine({
    ...runtimeMachine,
    pipeline: {
      ...runtimeMachine?.pipeline,
      self: operational?.pipeline?.self || runtimeMachine?.pipeline?.self,
      stream: operational?.pipeline?.stream || runtimeMachine?.pipeline?.stream,
    },
  });
  const ownProcess = machine.pipeline.self;
  const runtimeAgents = topicEntities(subscription, 'runtime.agent');
  const processes = topicEntities(subscription, 'runtime.process').map(entity => {
    const process = entity.data || {};
    const owners = runtimeAgents.filter(agent => agent.data?.pids?.includes(process.pid));
    return {
      ...process,
      cpu_pct: process.cpu_percent ?? process.cpu_pct ?? null,
      cpu_percent: process.cpu_percent ?? process.cpu_pct ?? null,
      mem_mb: process.mem_mb ?? (process.memory_rss_bytes == null ? null : process.memory_rss_bytes / 1048576),
      agent_id: owners.length === 1 ? owners[0].data.session_id || owners[0].data.id : null,
    };
  }).filter(process => isStoredToolSelected(process.tool, tools));
  const running = agents.filter(agent => agent.runtime_present && !agent.parent_id);
  const children = agents.filter(agent => agent.runtime_present && agent.parent_id);
  const knownRuntime = runtimeReady(subscription);
  return {
    ...board, agents,
    source_policy: subscription.capabilities?.source_policy,
    kpis: {
      ...board.kpis,
      running: knownRuntime ? running.filter(agent => agent.running === true && agent.status !== 'idle').length : null,
      idle: knownRuntime ? running.filter(agent => agent.status === 'idle').length : null,
      subagents_running: knownRuntime ? children.filter(agent => agent.running === true && agent.status !== 'idle').length : null,
      activity_unknown: knownRuntime ? running.filter(agent => agent.running === true && agent.native_activity === 'unknown').length : null,
    },
    processes,
    machine: { ...machine, processes: subscription.capabilities?.topics?.['runtime.process'] ? processes : machine.processes },
    self: {
      ...board.self,
      ...(runtimeMachine?.self || {}),
      cpu_percent: ownProcess.cpu ?? runtimeMachine?.self?.cpu_percent ?? null,
      memory_rss_bytes: ownProcess.rss ?? runtimeMachine?.self?.memory_rss_bytes ?? null,
    },
    contextData: raw.contextData ? normalizeContext(raw.contextData) : context,
  };
}

export function useBoardData({ filters, tools, live, pausedRef, enabled = true, history = enabled, requiredTopics = history ? ['history.board'] : [], scope = 'local', nodeId = null }) {
  const { client, state: subscription } = useLiveState();
  const remote = scope !== 'local';
  const incremental = !remote && subscription.mode === 'incremental';
  const legacy = remote || subscription.mode === 'legacy';
  const [main, setMain] = useState(null);
  const [mainQuery, setMainQuery] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [error, setError] = useState(null);
  const [selectionError, setSelectionError] = useState(null);
  const [contextError, setContextError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [machineResult, setMachine] = useState(null);
  const [contextResult, setContext] = useState(null);
  const auxKey = api.withNodeScope(toolsQuery(tools), scope, nodeId);
  const machine = machineResult?.key === auxKey ? machineResult.data : EMPTY_MACHINE;
  const context = contextResult?.key === auxKey ? contextResult.data : EMPTY_CONTEXT;
  const currentContextError = contextError?.key === auxKey ? contextError.error : null;
  const stateRef = useRef({ filters, tools });
  stateRef.current = { filters, tools, incremental, legacy, subscription, remote, scope, nodeId };
  const dirty = useRef(false);

  const loaders = useRef(null);
  if (!loaders.current) {
    const mark = () => { try { performance.mark('board-data'); } catch { /* no timing api */ } };
    loaders.current = {
      main: createLoader((d, query) => { setBusy(false); setError(null); if (d) { mark(); setMain(d); setMainQuery(query); } }, (e) => { setBusy(false); setError(e); }),
      sel: createLoader((d, query) => { setSelectionError(null); if (d) { mark(); setSelected(d); setSelectedQuery(query); } }, setSelectionError),
      machine: createMachineLoader(setMachine),
      context: createContextLoader(data => { setContext(data); setContextError(null); }, setContextError),
    };
  }

  const lastFetch = useRef(0);
  const fetchNow = useCallback(() => {
    const { filters: f, tools: t, incremental: stream, legacy: rest, remote: reported, scope: nodeScope, nodeId: requestedNode } = stateRef.current;
    if (stream) { client?.resync(); return; }
    if (!rest) return;
    setBusy(true);
    if (reported) lastFetch.current = Date.now();
    const scoped = q => api.withNodeScope(q, nodeScope, requestedNode);
    const mainLoad = loaders.current.main.load(scoped(boardQuery(f, t, windowOf(f.range))));
    loaders.current.machine.load(t, nodeScope, requestedNode);
    loaders.current.context.load(t, nodeScope, requestedNode);
    if (f.sel) loaders.current.sel.load(scoped(boardQuery(f, t, { since: Math.floor(f.sel.since), until: Math.floor(f.sel.until) })));
    else { loaders.current.sel.stop(); setSelected(null); setSelectedQuery(null); setSelectionError(null); }
    return mainLoad;
  }, [client]);

  const toolKey = tools ? tools.join(',') : '*';
  const filterKey = JSON.stringify([filters.range, filters.project, filters.model, filters.status, filters.q, filters.sel, scope, nodeId]);
  // Keep the scope stable across gauge updates. Only a user filter change replaces it.
  const liveQuery = useMemo(() => {
    const { filters: f, tools: t } = stateRef.current;
    return boardQuery(f, t, f.sel
      ? { since: Math.floor(f.sel.since), until: Math.floor(f.sel.until) }
      : windowOf(f.range));
  }, [filterKey, toolKey]);
  const wholeRangeQuery = useMemo(() => {
    const { filters: f, tools: t } = stateRef.current;
    return boardQuery(f, t, windowOf(f.range));
  }, [filterKey, toolKey]);
  const requirementKey = JSON.stringify(requiredTopics);
  useEffect(() => {
    if (!remote) client?.configure({ query: liveQuery, history, live, requiredTopics: JSON.parse(requirementKey) });
  }, [client, liveQuery, history, live, requirementKey, remote]);
  useEffect(() => { if (enabled && legacy) fetchNow(); }, [filterKey, toolKey, enabled, legacy, fetchNow]);
  useEffect(() => {
    if (!incremental || !history) return;
    // Historical context and whole-range charts are baseline queries, never stream invalidations.
    const { filters: f, tools: t } = stateRef.current;
    loaders.current.context.load(t);
    if (f.sel && mainQuery !== wholeRangeQuery) loaders.current.main.load(wholeRangeQuery);
    else loaders.current.main.stop();
  }, [incremental, history, filterKey, toolKey, wholeRangeQuery, mainQuery]);
  useEffect(() => {
    if (enabled && (legacy || incremental)) return;
    for (const loader of Object.values(loaders.current)) loader.stop();
    setBusy(false);
  }, [enabled, legacy, incremental]);
  useEffect(() => () => { loaders.current.main.stop(); loaders.current.sel.stop(); loaders.current.machine.stop(); loaders.current.context.stop(); }, []);

  // A stream message is a change on the server: fetch at once, unless a fetch began less
  // than MESSAGE_FETCH_GAP_MS ago or the page is hidden or paused; then the tick fetches.
  const onMessage = useCallback(() => {
    if (!stateRef.current.legacy || !live) return;
    const now = Date.now();
    if (document.hidden || pausedRef?.current || now - lastFetch.current < MESSAGE_FETCH_GAP_MS) { dirty.current = true; return; }
    dirty.current = false;
    lastFetch.current = now;
    fetchNow();
  }, [fetchNow, pausedRef, live]);
  const { connected: legacyConnected } = useSse(enabled && legacy && live && !remote ? api.streamUrl() : null, onMessage);
  const connected = incremental ? subscription.connected : legacyConnected;

  useEffect(() => {
    if (!enabled || !legacy || !live) return undefined;
    const id = setInterval(() => {
      if (document.hidden || pausedRef?.current) return;
      if (remote && (loaders.current.main.pending() || loaders.current.sel.pending())) return;
      const now = Date.now();
      const stale = !connected && now - lastFetch.current >= POLL_WITHOUT_STREAM_MS;
      if (!dirty.current && !stale) {
        if (!stateRef.current.remote) loaders.current.machine.load(stateRef.current.tools);
        return;
      }
      dirty.current = false;
      lastFetch.current = now;
      fetchNow();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [enabled, legacy, live, connected, fetchNow, pausedRef, remote]);

  // A stream that was up and is down now, as against one that has not opened yet.
  const everConnected = useRef(false);
  if (connected) everConnected.current = true;

  const refresh = fetchNow;
  const mainParams = new URLSearchParams(mainQuery || '');
  const mainMatches = !!main && (mainParams.get('scope') || 'local') === scope && mainParams.get('node_id') === (nodeId || null);
  const sourceMain = mainMatches ? main : EMPTY;
  const projection = subscription.board;
  const agentTopic = subscription.topics?.get('runtime.agent');
  const processTopic = subscription.topics?.get('runtime.process');
  const machineTopic = subscription.topics?.get('runtime.machine');
  const healthTopic = subscription.topics?.get('runtime.health');
  const sourceTopic = subscription.topics?.get('source.status');
  const incrementalData = useMemo(() => incremental
    ? liveBoardData(stateRef.current.subscription, stateRef.current.filters, stateRef.current.tools, context)
    : null, [incremental, projection, agentTopic, processTopic, machineTopic, healthTopic, sourceTopic, filters, tools, context]);
  // A selected time keeps the charts on the whole range.
  const currentSelection = filters.sel ? api.withNodeScope(boardQuery(filters, tools, {
    since: Math.floor(filters.sel.since), until: Math.floor(filters.sel.until),
  }), scope, nodeId) : null;
  const withSel = currentSelection && selectedQuery === currentSelection && selected;
  const data = useMemo(() => {
    if (incremental) {
      if (!filters.sel) return incrementalData;
      const current = main && mainQuery === wholeRangeQuery;
      return { ...incrementalData, series: current ? main.series : {}, range: current ? main.range : EMPTY.range };
    }
    const base = withSel
      ? { ...selected, series: sourceMain.series, range: sourceMain.range, options: sourceMain.options.tools.length ? sourceMain.options : selected.options, scope: selected.scope }
      : sourceMain;
    return { ...base, machine, contextData: remote && currentContextError ? { ...EMPTY_CONTEXT, loaded: true, unavailable: currentContextError.message } : context };
  }, [incremental, incrementalData, filters.sel, main, mainQuery, wholeRangeQuery, withSel, selected, sourceMain, machine, context, currentContextError, remote]);
  const failure = incremental ? historyFailure(subscription) : null;
  return {
    data, machine: data.machine,
    chartSeries: incremental ? data.series : sourceMain.series,
    chartRange: incremental ? data.range : sourceMain.range,
    loaded: incremental ? historyReady(subscription) : mainMatches,
    busy: incremental ? !subscription.ready : busy,
    error: incremental || subscription.mode === 'unavailable'
      ? subscription.error || (failure ? new Error(failure.error) : null) : error || (filters.sel ? selectionError : null),
    refresh, connected, everConnected: incremental ? subscription.everConnected : everConnected.current,
    subscription,
    analyticsError: incremental ? error || currentContextError : null,
  };
}
