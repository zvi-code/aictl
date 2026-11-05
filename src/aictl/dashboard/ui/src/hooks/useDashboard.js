// ─── useDashboard — snapshot + SSE lifecycle + merge ────────────
// Owns: initial /snapshot fetch, /history fetch, SSE stream with auto-reconnect,
// merging of SSE deltas into the current snapshot and running history arrays,
// and a 30s snapshot-refresh safety net.
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import * as api from '../api.js';
import { mergeSseSummary, appendHistory } from '../selectors.js';
import { useSse } from '../useSse.js';

const MAX_QUEUED = 720;

export function useDashboard(opts = {}) {
  const { EventSourceClass, refreshMs = 30000, applyMs = 1000 } = opts;
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState(null);
  const [lastUpdateAt, setLastUpdateAt] = useState(null);
  const snapInflightRef = useRef(false);

  const refresh = useCallback(() => {
    if (snapInflightRef.current) return Promise.resolve();
    snapInflightRef.current = true;
    return api.getSnapshot()
      .then(data => { setSnapshot(data); setLastUpdateAt(Date.now()); })
      .catch(() => { /* silent — SSE or next tick will recover */ })
      .finally(() => { snapInflightRef.current = false; });
  }, []);

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
    if (!batch.length) return;
    queueRef.current = [];
    lastApplyRef.current = Date.now();
    const last = batch[batch.length - 1];
    // An SSE summary is a partial payload (tools carry no files/processes
    // arrays). It must never be adopted as the authoritative snapshot — wait
    // for the full /snapshot fetch to seed state, otherwise consumers crash on
    // undefined tool.files. The 30s refresh + initial fetch guarantee seeding.
    setSnapshot(prev => (prev ? mergeSseSummary(prev, last) : prev));
    setHistory(prev => batch.reduce(appendHistory, prev));
    setLastUpdateAt(Date.now());
  }, []);

  const handleMessage = useCallback((data) => {
    queueRef.current.push(data);
    if (queueRef.current.length > MAX_QUEUED) queueRef.current.shift();
    if (typeof document !== 'undefined' && document.hidden) return;
    const wait = applyMs - (Date.now() - lastApplyRef.current);
    if (wait <= 0) flush();
    else if (!timerRef.current) timerRef.current = setTimeout(flush, wait);
  }, [applyMs, flush]);

  useEffect(() => {
    const onVisible = () => { if (!document.hidden) flush(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush]);

  const { connected } = useSse(
    api.streamUrl(),
    handleMessage,
    EventSourceClass ? { EventSourceClass } : {},
  );

  // Periodic snapshot refresh — safety net if SSE stalls silently.
  useEffect(() => {
    if (!refreshMs) return undefined;
    const id = setInterval(() => { if (!document.hidden) refresh(); }, refreshMs);
    return () => clearInterval(id);
  }, [refresh, refreshMs]);

  return { snapshot, history, connected, lastUpdateAt, refresh, setHistory };
}
