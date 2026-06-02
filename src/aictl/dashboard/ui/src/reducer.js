// Legacy reducer + initialState (pre-hooks).
//
// The active App component no longer uses this reducer — state management
// was split into composable hooks under ./hooks/. This module is kept
// so existing unit tests (test/reducer.test.js) remain a meaningful pin
// on the data-shape contract and merge semantics that those hooks
// inherited. New code should use the hooks directly.

import { mergeSseSummary, appendHistory } from './selectors.js';

function loadPref(key, fallback) {
  try {
    const v = localStorage.getItem('aictl-pref-' + key);
    return v != null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

const RANGE_SECONDS = { live: 3600, '1h': 3600, '6h': 21600, '24h': 86400, '7d': 604800 };

export const initialState = {
  snap: null,
  history: null,
  connected: false,
  activeTab: loadPref('active_tab', 'overview'),
  globalRange: (() => {
    const id = loadPref('range', 'live');
    const secs = RANGE_SECONDS[id] || 3600;
    return { id, since: Date.now() / 1000 - secs, until: null };
  })(),
  searchQuery: '',
  theme: (() => { try { return localStorage.getItem('aictl-theme') || 'auto'; } catch { return 'auto'; } })(),
  viewerPath: null,
  events: [],
  enabledTools: loadPref('tool_filter', null),
};

export function reducer(state, action) {
  switch (action.type) {
    case 'SSE_UPDATE': {
      const data = action.payload;
      // Partial SSE summary must not become the snapshot before a full one is
      // seeded (its tools lack files/processes). Keep null until /snapshot lands.
      const snap = state.snap ? mergeSseSummary(state.snap, data) : state.snap;
      const history = appendHistory(state.history, data);
      return { ...state, snap, history, connected: true };
    }
    case 'SNAP_REPLACE':    return { ...state, snap: action.payload };
    case 'HISTORY_INIT':    return { ...state, history: action.payload };
    case 'EVENTS_INIT':     return { ...state, events: action.payload };
    case 'SET_CONNECTED':   return { ...state, connected: action.payload };
    case 'SET_TAB':         return { ...state, activeTab: action.payload };
    case 'SET_RANGE':       return { ...state, globalRange: action.payload };
    case 'SET_SEARCH':      return { ...state, searchQuery: action.payload };
    case 'SET_THEME':       return { ...state, theme: action.payload };
    case 'SET_VIEWER':      return { ...state, viewerPath: action.payload };
    case 'SET_TOOL_FILTER': return { ...state, enabledTools: action.payload };
    default: return state;
  }
}
