import { useEffect, useRef, useState } from 'preact/hooks';
import { fetchJson } from '../../api.js';
import { normalizeMachine, TICK_MS } from './useBoardData.js';
import { useLiveState } from '../../live/context.js';
import { topicData } from '../../live/model.js';
import { readScopedHealth } from './scopedHealth.js';

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function normalizeHealth(raw) {
  const data = object(raw);
  const store = object(data.store);
  return {
    ...normalizeMachine(data),
    resources: object(data.resources),
    store: {
      ...store,
      kind: store.kind ?? null,
      destination: store.destination ?? null,
      cluster_url: store.cluster_url ?? null,
      database: store.database ?? null,
      ingestion_mode: store.ingestion_mode ?? null,
      reads: store.reads == null ? null : object(store.reads),
      writes: store.writes == null ? null : object(store.writes),
      ingestion_capacity: store.ingestion_capacity == null ? null : object(store.ingestion_capacity),
      health: { state: 'unknown', ...object(store.health) },
    },
  };
}

/** Health reads never wait for history reads, overlap, or run in a hidden tab. */
export function useBoardHealth({ enabled, live, scope = 'local', nodeId = null }) {
  const { state: subscription } = useLiveState();
  const scoped = scope !== 'local';
  const legacy = scoped || subscription.mode === 'legacy';
  const [state, setState] = useState({ data: null, error: null, busy: false, nowS: Date.now() / 1000 });
  const current = useRef(null);
  const key = JSON.stringify([scope, nodeId]);
  const requested = useRef(null);
  useEffect(() => {
    if (!enabled || !legacy) { setState(s => s.busy ? { ...s, busy: false } : s); return undefined; }
    let active = true;
    const load = () => {
      if (document.hidden || current.current) return;
      const controller = new AbortController();
      current.current = controller;
      requested.current = key;
      setState(s => ({ data: s.key === key ? s.data : null, error: null, key, busy: true, nowS: Date.now() / 1000 }));
      const opts = { signal: controller.signal };
      (scoped ? readScopedHealth(scope, nodeId, opts) : fetchJson('/api/board/health', opts)).then(
        raw => { if (active && !controller.signal.aborted) setState({ data: normalizeHealth(raw), key, error: null, busy: false, nowS: Date.now() / 1000 }); },
        error => { if (active && !controller.signal.aborted) setState(s => ({ ...s, error, busy: false, nowS: Date.now() / 1000 })); },
      ).finally(() => { if (current.current === controller) current.current = null; });
    };
    if (live || requested.current !== key) load();
    else setState(s => s.busy ? { ...s, busy: false } : s);
    const visibility = () => {
      if (document.hidden) {
        current.current?.abort();
        current.current = null;
        setState(s => s.busy ? { ...s, busy: false } : s);
      } else       if (live || requested.current !== key) load();
    };
    document.addEventListener('visibilitychange', visibility);
    const timer = live ? setInterval(() => {
      if (document.hidden) return;
      setState(s => ({ ...s, nowS: Date.now() / 1000 }));
      load();
    }, scoped ? 30_000 : TICK_MS) : null;
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      current.current?.abort();
      current.current = null;
    };
  }, [enabled, live, legacy, scope, nodeId, scoped, key]);
  useEffect(() => {
    if (!enabled || subscription.mode !== 'incremental' || !live) return undefined;
    const timer = setInterval(() => { if (!document.hidden) setState(s => ({ ...s, nowS: Date.now() / 1000 })); }, TICK_MS);
    return () => clearInterval(timer);
  }, [enabled, live, subscription.mode]);
  if (subscription.mode === 'incremental') {
    const source = topicData(subscription, 'source.status', 'health');
    const error = subscription.error || (source?.error || source?.stale ? new Error(source.error || source.reason || 'Health source is stale.') : null);
    const streamed = !error && (!subscription.ready || source?.pending || source?.ready === false) ? null : topicData(subscription, 'runtime.health', 'local');
    const inventory = topicData(subscription, 'runtime.health', 'table_inventory')?.inventory;
    const data = streamed ? normalizeHealth(streamed) : null;
    if (data && inventory) data.store.table_inventory = inventory;
    return { data, error, busy: !streamed && !error, nowS: state.nowS };
  }
  if (subscription.mode === 'unavailable') return { ...state, error: subscription.error, busy: false };
  return state.key === key ? state : { data: null, error: null, busy: enabled, nowS: state.nowS };
}
