import * as api from '../api.js';
import { canonicalScope, initialLiveState, reduceLiveEnvelope, requestedBaselinesReady } from './model.js';

export const GAUGE_FLUSH_MS = 40;

/** One connection and cursor for every topic consumer in a mounted dashboard. */
export function createLiveController({
  getCapabilities = api.getLiveCapabilities,
  streamUrl = api.liveStreamUrl,
  EventSourceClass = typeof EventSource === 'undefined' ? null : EventSource,
  retryMs = 1000, maxRetryMs = 30000,
} = {}) {
  let state = initialLiveState();
  let request = { query: '', history: false, live: true, requiredTopics: [] };
  let active = false;
  let source = null;
  let probe = null;
  let retry = retryMs;
  let timer = null;
  let flush = null;
  const listeners = new Set();
  const baselineComplete = () => requestedBaselinesReady(state, request.requiredTopics);
  const notify = () => {
    clearTimeout(flush);
    flush = null;
    for (const listener of listeners) listener(state);
  };
  const publish = patch => { state = { ...state, ...patch }; notify(); };
  const disconnect = () => {
    clearTimeout(timer);
    timer = null;
    const previous = source;
    source = null;
    previous?.close();
  };
  const retryConnection = () => {
    if (!active || (!request.live && baselineComplete())) return;
    timer = setTimeout(connect, retry);
    retry = Math.min(retry * 2, maxRetryMs);
  };
  const discover = () => {
    if (!active) return;
    const mine = new AbortController();
    probe = mine;
    getCapabilities({ signal: mine.signal }).then(capabilities => {
      if (!active || probe !== mine) return;
      if (capabilities?.enabled === true && capabilities.protocol !== 1) {
        publish({ mode: 'unavailable', error: new Error('The live source protocol is not supported by this UI.') });
        return;
      }
      const mode = capabilities?.enabled === true ? 'incremental' : 'legacy';
      publish({ capabilities, mode, error: null });
      retry = retryMs;
      connect();
    }).catch(error => {
      if (!active || probe !== mine || error?.name === 'AbortError') return;
      // A missing endpoint is an older daemon, not a second streaming protocol.
      const legacy = [404, 405].includes(error.status);
      publish({ mode: legacy ? 'legacy' : 'unavailable', error });
      if (!legacy) {
        timer = setTimeout(discover, retry);
        retry = Math.min(retry * 2, maxRetryMs);
      }
    });
  };
  const accept = (type, event) => {
    try {
      const message = JSON.parse(event.data);
      const next = reduceLiveEnvelope(state, type, message);
      if (next === state) return;
      state = next;
      const changed = type === 'bootstrap' ? message.entities : message.upserts || [];
      const immediate = type === 'bootstrap' || message.removals?.length
        || changed.some(entity => state.capabilities?.topics?.[entity.topic]?.delivery !== 'latest');
      if (immediate) notify();
      else if (!flush) flush = setTimeout(notify, GAUGE_FLUSH_MS);
      if (!request.live && baselineComplete()) { disconnect(); publish({ connected: false }); }
    } catch (error) {
      disconnect();
      publish({ ready: false, cursor: null, connected: false, error });
      retryConnection();
    }
  };
  function connect() {
    timer = null;
    if (!active || state.mode !== 'incremental' || source || (!request.live && baselineComplete())) return;
    if (!EventSourceClass) { publish({ error: new Error('This browser does not support live event subscriptions.') }); return; }
    const es = new EventSourceClass(streamUrl(request.query, {
      history: request.history, cursor: state.ready ? state.cursor : null,
    }));
    source = es;
    es.onopen = () => {
      if (source !== es) return;
      retry = retryMs;
      publish({ connected: true, everConnected: true, error: null });
    };
    const receive = type => event => { if (source === es) accept(type, event); };
    es.addEventListener('bootstrap', receive('bootstrap'));
    es.addEventListener('change', receive('change'));
    es.onerror = () => {
      if (source !== es) return;
      disconnect();
      publish({ connected: false, error: new Error('Live subscription disconnected. Showing the last received values.') });
      retryConnection();
    };
  }
  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    start() {
      if (active) return;
      active = true;
      if (state.capabilities) { connect(); return; }
      discover();
    },
    configure(next) {
      const scope = canonicalScope(next.query);
      const changed = scope !== state.scope || !!next.history !== !!request.history;
      const resumed = !request.live && next.live;
      const requiredTopics = next.requiredTopics ?? (next.history === undefined ? request.requiredTopics : next.history ? ['history.board'] : []);
      request = { ...request, ...next, requiredTopics };
      if (changed) {
        disconnect();
        const entities = new Map([...state.entities].filter(([, entity]) => !['history.board', 'configuration.board', 'catalog.board'].includes(entity.topic) && !(entity.topic === 'source.status' && entity.id.startsWith('history:'))));
        const revisions = new Map([...entities].map(([key, entity]) => [key, entity.revision]));
        const topics = new Map();
        for (const [key, entity] of entities) {
          if (!topics.has(entity.topic)) topics.set(entity.topic, new Map());
          topics.get(entity.topic).set(key, entity);
        }
        publish({ scope, entities, revisions, topics, board: {}, boardFields: new Map(), epoch: null, sequence: -1, cursor: null, ready: false, connected: false });
      } else if (!request.live && baselineComplete()) {
        disconnect();
        publish({ connected: false });
      }
      if (changed || resumed || !baselineComplete()) connect();
    },
    resync() {
      disconnect();
      publish({ ready: false, cursor: null, connected: false });
      connect();
    },
    stop() {
      active = false;
      probe?.abort();
      disconnect();
      clearTimeout(flush);
      flush = null;
      state = { ...state, connected: false };
    },
  };
}
