// ─── useBoardData — /api/board for the current filters ────────────
// A filter change fetches at once and aborts the fetch before it. Stream messages
// fetch at most once per TICK_MS. The last good data stays on screen meanwhile.
// With a selected time there are two fetches: the whole range feeds the charts,
// and the selected time feeds everything else.
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import * as api from '../../api.js';
import { useSse } from '../../useSse.js';
import { boardQuery, windowOf } from './filters.js';

export const TICK_MS = 5000;
const POLL_WITHOUT_STREAM_MS = 30000;

const EMPTY = {
  generated_at: null, capture_mode: null,
  range: { since: 0, until: 0, bucket_s: 0, bucket_starts: [] },
  options: { tools: [], projects: [], models: [] },
  scope: { shown_agents: 0, all_agents: 0 },
  kpis: { prev: {}, spark: {} },
  attention: [], agents: [], by_model: [], by_role: [], series: {}, saved_usd: null, unpriced: null, credits: null, projects: [], prompts: [], project_prompts: [], project_prompts_searched: [],
  skills: [], tools: [], confirms: { pending: [], by_tool: [] }, errors: [], latency: [], loops: [],
  changes: { files: [], totals: {} }, tests: [], memory_files: [], processes: [], sources: [], coverage: { rows: [] }, self: {},
};

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

export function useBoardData({ filters, tools, live, pausedRef, enabled = true }) {
  const [main, setMain] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const stateRef = useRef({ filters, tools });
  stateRef.current = { filters, tools };
  const dirty = useRef(false);

  const loaders = useRef(null);
  if (!loaders.current) {
    const mark = () => { try { performance.mark('board-data'); } catch { /* no timing api */ } };
    loaders.current = {
      main: createLoader((d) => { setBusy(false); setError(null); if (d) { mark(); setMain(d); } }, (e) => { setBusy(false); setError(e); }),
      sel: createLoader((d) => { setError(null); if (d) { mark(); setSelected(d); } }, (e) => setError(e)),
    };
  }

  const fetchNow = useCallback(() => {
    const { filters: f, tools: t } = stateRef.current;
    setBusy(true);
    loaders.current.main.load(boardQuery(f, t, windowOf(f.range)));
    if (f.sel) loaders.current.sel.load(boardQuery(f, t, { since: Math.floor(f.sel.since), until: Math.floor(f.sel.until) }));
    else { loaders.current.sel.stop(); setSelected(null); }
  }, []);

  const toolKey = tools ? tools.join(',') : '*';
  const filterKey = JSON.stringify([filters.range, filters.project, filters.model, filters.status, filters.q, filters.sel]);
  useEffect(() => { if (enabled) fetchNow(); }, [filterKey, toolKey, enabled, fetchNow]);
  useEffect(() => () => { loaders.current.main.stop(); loaders.current.sel.stop(); }, []);

  const onMessage = useCallback(() => { dirty.current = true; }, []);
  const { connected } = useSse(enabled && live ? api.streamUrl() : null, onMessage);

  const lastFetch = useRef(0);
  useEffect(() => {
    if (!enabled || !live) return undefined;
    const id = setInterval(() => {
      if (document.hidden || pausedRef?.current) return;
      const now = Date.now();
      const stale = !connected && now - lastFetch.current >= POLL_WITHOUT_STREAM_MS;
      if (!dirty.current && !stale) return;
      dirty.current = false;
      lastFetch.current = now;
      fetchNow();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [enabled, live, connected, fetchNow, pausedRef]);

  const refresh = fetchNow;
  const sourceMain = main || EMPTY;
  // A selected time keeps the charts on the whole range.
  const data = filters.sel && selected
    ? { ...selected, series: sourceMain.series, range: sourceMain.range, options: sourceMain.options.tools.length ? sourceMain.options : selected.options, scope: selected.scope }
    : sourceMain;
  return { data, chartSeries: sourceMain.series, chartRange: sourceMain.range, loaded: !!main, busy, error, refresh, connected };
}
