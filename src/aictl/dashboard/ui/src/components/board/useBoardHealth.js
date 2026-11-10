import { useEffect, useRef, useState } from 'preact/hooks';
import { fetchJson } from '../../api.js';
import { normalizeMachine, TICK_MS } from './useBoardData.js';
import { useLiveState } from '../../live/context.js';
import { topicData } from '../../live/model.js';

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function normalizeHealth(raw) {
  const data = object(raw);
  const store = object(data.store);
  return {
    ...normalizeMachine(data),
    reported: { hooks: data.pipeline?.hooks != null, otel_receiver: data.pipeline?.otel_receiver != null },
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
export function useBoardHealth({ enabled, live }) {
  const { state: subscription } = useLiveState();
  const legacy = subscription.mode === 'legacy';
  const [state, setState] = useState({ data: null, error: null, busy: false, nowS: Date.now() / 1000 });
  const current = useRef(null);
  const requested = useRef(false);
  useEffect(() => {
    if (!enabled || !legacy) { setState(s => s.busy ? { ...s, busy: false } : s); return undefined; }
    let active = true;
    const load = () => {
      if (document.hidden || current.current) return;
      const controller = new AbortController();
      current.current = controller;
      requested.current = true;
      setState(s => ({ ...s, busy: true, nowS: Date.now() / 1000 }));
      fetchJson('/api/board/health', { signal: controller.signal }).then(
        raw => { if (active && !controller.signal.aborted) setState({ data: normalizeHealth(raw), error: null, busy: false, nowS: Date.now() / 1000 }); },
        error => { if (active && !controller.signal.aborted) setState(s => ({ ...s, error, busy: false, nowS: Date.now() / 1000 })); },
      ).finally(() => { if (current.current === controller) current.current = null; });
    };
    if (live || !requested.current) load();
    else setState(s => s.busy ? { ...s, busy: false } : s);
    const visibility = () => {
      if (document.hidden) {
        current.current?.abort();
        current.current = null;
        setState(s => s.busy ? { ...s, busy: false } : s);
      } else if (live) load();
    };
    document.addEventListener('visibilitychange', visibility);
    const timer = live ? setInterval(() => {
      if (document.hidden) return;
      setState(s => ({ ...s, nowS: Date.now() / 1000 }));
      load();
    }, TICK_MS) : null;
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      current.current?.abort();
      current.current = null;
    };
  }, [enabled, live, legacy]);
  useEffect(() => {
    if (!enabled || subscription.mode !== 'incremental' || !live) return undefined;
    const timer = setInterval(() => { if (!document.hidden) setState(s => ({ ...s, nowS: Date.now() / 1000 })); }, TICK_MS);
    return () => clearInterval(timer);
  }, [enabled, live, subscription.mode]);
  const streamed = topicData(subscription, 'runtime.health', 'local');
  if (subscription.mode === 'incremental') return {
    data: streamed ? normalizeHealth(streamed) : null,
    error: subscription.error, busy: !streamed && !subscription.error, nowS: state.nowS,
  };
  if (subscription.mode === 'unavailable') return { ...state, error: subscription.error, busy: false };
  return state;
}
