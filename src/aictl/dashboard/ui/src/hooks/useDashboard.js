// ─── useDashboard — snapshot + SSE lifecycle + merge ────────────
// Owns: initial /snapshot fetch, /history fetch, SSE stream with auto-reconnect,
// merging of SSE deltas into the current snapshot and running history arrays.
// The snapshot is fetched again only when the stream says the per-tool lists
// changed (tools_rev), after a reconnect, or when the stream has stalled.
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import * as api from '../api.js';
import { mergeSseSummary, appendHistory, fillToolLive } from '../selectors.js';
import { useSse } from '../useSse.js';

const MAX_QUEUED = 720;

export function useDashboard(opts = {}) {
  // refreshMs: how often to check the stream; stallMs: silence that counts as stalled;
  // minRefetchGapMs: least time between two fetches caused by a changed tools_rev, so
  // a machine whose processes change all the time costs at most 2 fetches per minute.
  const { EventSourceClass, refreshMs = 30000, applyMs = 1000, stallMs = 60000, minRefetchGapMs = 30000, maxQueued = MAX_QUEUED } = opts;
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState(null);
  const [lastUpdateAt, setLastUpdateAt] = useState(null);
  const snapInflightRef = useRef(false);
  const snapRevRef = useRef(null);       // tools_rev of the snapshot held
  const loadedRef = useRef(false);       // a snapshot has been stored
  const lastFetchRef = useRef(0);
  const lastMsgRef = useRef(Date.now());
  const flushRef = useRef(() => {});
  const refetchTimerRef = useRef(null);
  const liveRef = useRef({});            // last live block of each tool
  const droppedRef = useRef(false);      // the queue lost messages while the tab was hidden

  const refresh = useCallback(() => {
    if (snapInflightRef.current) return Promise.resolve();
    snapInflightRef.current = true;
    lastFetchRef.current = Date.now();
    return api.getSnapshot()
      .then(data => {
        snapRevRef.current = data?.tools_rev || null;
        loadedRef.current = true;
        setSnapshot(data);
        setLastUpdateAt(Date.now());
        flushRef.current();   // updates that arrived before the snapshot
      })
      .catch(() => { /* silent — SSE or next tick will recover */ })
      .finally(() => { snapInflightRef.current = false; });
  }, []);

  // The stream reports a different tools_rev: the file, process or MCP lists in
  // the held snapshot are out of date. Fetch it again, at most once per gap.
  const refreshSoon = useCallback(() => {
    if (refetchTimerRef.current || snapInflightRef.current) return;
    const wait = Math.max(0, minRefetchGapMs - (Date.now() - lastFetchRef.current));
    refetchTimerRef.current = setTimeout(() => { refetchTimerRef.current = null; refresh(); }, wait);
  }, [refresh, minRefetchGapMs]);

  // One-shot initial fetches.
  useEffect(() => {
    refresh();
    api.getHistory().then(setHistory).catch(() => {});
  }, [refresh]);

  // Ticks are coalesced: at most one state update per applyMs, none while the
  // page is hidden (flushed on return). History still receives every sample.
  const queueRef = useRef([]);
  const lastApplyRef = useRef(0);
  const timerRef = useRef(null);
  const flush = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const batch = queueRef.current;
    // Keep updates until a snapshot exists to merge them into.
    if (!batch.length || !loadedRef.current) return;
    queueRef.current = [];
    lastApplyRef.current = Date.now();
    // An SSE summary is a partial payload (tools carry no files/processes
    // arrays). It must never be adopted as the authoritative snapshot — wait
    // for the full /snapshot fetch to seed state, otherwise consumers crash on
    // undefined tool.files. Every message of the batch is merged in order: a
    // message may omit a key (unchanged) or carry only session row changes.
    setSnapshot(prev => (prev ? batch.reduce((acc, m) => mergeSseSummary(acc, m), prev) : prev));
    setHistory(prev => batch.reduce(appendHistory, prev));
    setLastUpdateAt(Date.now());
  }, []);

  flushRef.current = flush;

  const handleMessage = useCallback((raw) => {
    lastMsgRef.current = Date.now();
    const data = fillToolLive(raw, liveRef.current);
    queueRef.current.push(data);
    // A lost message can hold the only copy of a change, so the state must be fetched again.
    if (queueRef.current.length > maxQueued) { queueRef.current.shift(); droppedRef.current = true; }
    if (typeof document !== 'undefined' && document.hidden) return;
    if (data.tools_rev && snapRevRef.current && data.tools_rev !== snapRevRef.current) refreshSoon();
    const wait = applyMs - (Date.now() - lastApplyRef.current);
    if (wait <= 0) flush();
    else if (!timerRef.current) timerRef.current = setTimeout(flush, wait);
  }, [applyMs, flush, refreshSoon, maxQueued]);

  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      if (droppedRef.current) { droppedRef.current = false; refresh(); }
      flush();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, [flush, refresh]);

  const { connected } = useSse(
    api.streamUrl(),
    handleMessage,
    EventSourceClass ? { EventSourceClass } : {},
  );

  const connectedRef = useRef(connected);
  connectedRef.current = connected;

  // A stream that reconnects may have missed list changes: fetch once.
  const everConnectedRef = useRef(false);
  useEffect(() => {
    if (!connected) return;
    if (everConnectedRef.current) refresh();
    everConnectedRef.current = true;
  }, [connected, refresh]);

  // Safety net for a stream that has stalled or is down. While messages keep
  // arriving the snapshot is not fetched again on a timer.
  useEffect(() => {
    if (!refreshMs) return undefined;
    const id = setInterval(() => {
      if (document.hidden) return;
      const stalled = !loadedRef.current || !connectedRef.current || Date.now() - lastMsgRef.current > stallMs;
      if (stalled) refresh();
    }, refreshMs);
    return () => clearInterval(id);
  }, [refresh, refreshMs, stallMs]);

  return { snapshot, history, connected, lastUpdateAt, refresh, setHistory };
}
