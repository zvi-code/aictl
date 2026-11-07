// ─── useBoardData — /api/board for the current filters ────────────
// A filter change fetches at once and aborts the fetch before it. Stream messages
// fetch at most once per TICK_MS. The last good data stays on screen meanwhile.
// With a selected time there are two fetches: the whole range feeds the charts,
// and the selected time feeds everything else.
// /api/board/machine (processes, collectors, pipeline health) is fetched with each
// board fetch and on every tick while live, so a stalled collector still shows.
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as api from '../../api.js';
import { useSse } from '../../useSse.js';
import { boardQuery, windowOf } from './filters.js';

export const TICK_MS = 5000;
const POLL_WITHOUT_STREAM_MS = 30000;

export const EMPTY_MACHINE = {
  generated_at: null,
  monitor: { collectors: [], roots: [], per_tool: [] },
  processes: [], cpu_per_core: [], alerts: [],
  pipeline: { self: {}, sink: null, otel_receiver: null, ingesters: [], data_quality: [], freshness: [], stream: {} },
};

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
    },
  };
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

function createLoader(onData, onError) {
  let ctrl = null;
  let last = { query: null, etag: null };
  return {
    load(query) {
      if (ctrl) ctrl.abort();
      const mine = new AbortController();
      ctrl = mine;
      const etag = last.query === query ? last.etag : null;
      return api.getBoard(query, { signal: mine.signal, etag }).then((res) => {
        if (ctrl !== mine) return;
        ctrl = null;
        if (res.status === 304) { onData(null); return; }
        last = { query, etag: res.etag };
        onData(normalizeBoard(res.data));
      }).catch((e) => {
        if (e?.name === 'AbortError' || ctrl !== mine) return;
        ctrl = null;
        onError(e);
      });
    },
    stop() { if (ctrl) { ctrl.abort(); ctrl = null; } },
  };
}

/** /api/board/machine for the tool filter. A failed read keeps the last answer. */
function createMachineLoader(onData) {
  let ctrl = null;
  return {
    load(tools) {
      if (ctrl) ctrl.abort();
      const mine = new AbortController();
      ctrl = mine;
      const q = tools ? '?tool=' + (tools.length ? tools.map(encodeURIComponent).join(',') : '-') : '';
      return api.fetchJson('/api/board/machine' + q, { signal: mine.signal }).then((d) => {
        if (ctrl !== mine) return;
        ctrl = null;
        onData(normalizeMachine(d));
      }).catch(() => { if (ctrl === mine) ctrl = null; });
    },
    stop() { if (ctrl) { ctrl.abort(); ctrl = null; } },
  };
}

export function useBoardData({ filters, tools, live, pausedRef, enabled = true }) {
  const [main, setMain] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [machine, setMachine] = useState(EMPTY_MACHINE);
  const stateRef = useRef({ filters, tools });
  stateRef.current = { filters, tools };
  const dirty = useRef(false);

  const loaders = useRef(null);
  if (!loaders.current) {
    const mark = () => { try { performance.mark('board-data'); } catch { /* no timing api */ } };
    loaders.current = {
      main: createLoader((d) => { setBusy(false); setError(null); if (d) { mark(); setMain(d); } }, (e) => { setBusy(false); setError(e); }),
      sel: createLoader((d) => { setError(null); if (d) { mark(); setSelected(d); } }, (e) => setError(e)),
      machine: createMachineLoader(setMachine),
    };
  }

  const fetchNow = useCallback(() => {
    const { filters: f, tools: t } = stateRef.current;
    setBusy(true);
    loaders.current.main.load(boardQuery(f, t, windowOf(f.range)));
    loaders.current.machine.load(t);
    if (f.sel) loaders.current.sel.load(boardQuery(f, t, { since: Math.floor(f.sel.since), until: Math.floor(f.sel.until) }));
    else { loaders.current.sel.stop(); setSelected(null); }
  }, []);

  const toolKey = tools ? tools.join(',') : '*';
  const filterKey = JSON.stringify([filters.range, filters.project, filters.model, filters.status, filters.q, filters.sel]);
  useEffect(() => { if (enabled) fetchNow(); }, [filterKey, toolKey, enabled, fetchNow]);
  useEffect(() => () => { loaders.current.main.stop(); loaders.current.sel.stop(); loaders.current.machine.stop(); }, []);

  const onMessage = useCallback(() => { dirty.current = true; }, []);
  const { connected } = useSse(enabled && live ? api.streamUrl() : null, onMessage);

  const lastFetch = useRef(0);
  useEffect(() => {
    if (!enabled || !live) return undefined;
    const id = setInterval(() => {
      if (document.hidden || pausedRef?.current) return;
      const now = Date.now();
      const stale = !connected && now - lastFetch.current >= POLL_WITHOUT_STREAM_MS;
      if (!dirty.current && !stale) { loaders.current.machine.load(stateRef.current.tools); return; }
      dirty.current = false;
      lastFetch.current = now;
      fetchNow();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [enabled, live, connected, fetchNow, pausedRef]);

  // A stream that was up and is down now, as against one that has not opened yet.
  const everConnected = useRef(false);
  if (connected) everConnected.current = true;

  const refresh = fetchNow;
  const sourceMain = main || EMPTY;
  // A selected time keeps the charts on the whole range.
  const withSel = filters.sel && selected;
  const data = useMemo(() => {
    const base = withSel
      ? { ...selected, series: sourceMain.series, range: sourceMain.range, options: sourceMain.options.tools.length ? sourceMain.options : selected.options, scope: selected.scope }
      : sourceMain;
    return { ...base, machine };
  }, [withSel, selected, sourceMain, machine]);
  return { data, machine, chartSeries: sourceMain.series, chartRange: sourceMain.range, loaded: !!main, busy, error, refresh, connected, everConnected: everConnected.current };
}
