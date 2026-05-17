// ─── useDashboard — snapshot + SSE lifecycle + merge ────────────
// Owns: initial /snapshot fetch, /history fetch, SSE stream with auto-reconnect,
// merging of SSE deltas into the current snapshot and running history arrays,
// and a 30s snapshot-refresh safety net.
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import * as api from '../api.js';
import { mergeSseSummary, appendHistory } from '../selectors.js';
import { useSse } from '../useSse.js';

export function useDashboard(opts = {}) {
  const { EventSourceClass, refreshMs = 30000 } = opts;
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

  const handleMessage = useCallback((data) => {
    setSnapshot(prev => (prev ? mergeSseSummary(prev, data) : data));
    setHistory(prev => appendHistory(prev, data));
    setLastUpdateAt(Date.now());
  }, []);

  const { connected } = useSse(
    api.streamUrl(),
    handleMessage,
    EventSourceClass ? { EventSourceClass } : {},
  );

  // Periodic snapshot refresh — safety net if SSE stalls silently.
  useEffect(() => {
    if (!refreshMs) return undefined;
    const id = setInterval(refresh, refreshMs);
    return () => clearInterval(id);
  }, [refresh, refreshMs]);

  return { snapshot, history, connected, lastUpdateAt, refresh, setHistory };
}
