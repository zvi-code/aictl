import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reducer, initialState } from '../src/app.js';

// ─── Initial state shape ───────────────────────────────────────
describe('initialState', () => {
  it('has expected keys', () => {
    expect(initialState).toHaveProperty('snap', null);
    expect(initialState).toHaveProperty('history', null);
    expect(initialState).toHaveProperty('connected', false);
    expect(initialState).toHaveProperty('activeTab');
    expect(initialState).toHaveProperty('globalRange');
    expect(initialState).toHaveProperty('searchQuery', '');
    expect(initialState).toHaveProperty('theme');
    expect(initialState).toHaveProperty('viewerPath', null);
    expect(initialState).toHaveProperty('events');
    expect(initialState).toHaveProperty('enabledTools');
  });

  it('defaults activeTab to overview', () => {
    // localStorage was cleared in setup, so default applies
    expect(initialState.activeTab).toBe('overview');
  });

  it('globalRange has id, since, until', () => {
    expect(initialState.globalRange).toHaveProperty('id');
    expect(initialState.globalRange).toHaveProperty('since');
    expect(typeof initialState.globalRange.since).toBe('number');
  });
});

// ─── Reducer actions ───────────────────────────────────────────
describe('reducer', () => {
  const baseState = {
    snap: null,
    history: null,
    connected: false,
    activeTab: 'overview',
    globalRange: { id: 'live', since: 0, until: null },
    searchQuery: '',
    theme: 'auto',
    viewerPath: null,
    events: [],
    enabledTools: null,
  };

  it('SNAP_REPLACE sets snap', () => {
    const snap = { total_tokens: 100, tools: [] };
    const result = reducer(baseState, { type: 'SNAP_REPLACE', payload: snap });
    expect(result.snap).toBe(snap);
  });

  it('HISTORY_INIT sets history', () => {
    const history = { ts: [1, 2], files: [10, 20] };
    const result = reducer(baseState, { type: 'HISTORY_INIT', payload: history });
    expect(result.history).toBe(history);
  });

  it('EVENTS_INIT sets events', () => {
    const events = [{ type: 'session_start' }];
    const result = reducer(baseState, { type: 'EVENTS_INIT', payload: events });
    expect(result.events).toBe(events);
  });

  it('SET_CONNECTED updates connected', () => {
    const result = reducer(baseState, { type: 'SET_CONNECTED', payload: true });
    expect(result.connected).toBe(true);
  });

  it('SET_TAB updates activeTab', () => {
    const result = reducer(baseState, { type: 'SET_TAB', payload: 'budget' });
    expect(result.activeTab).toBe('budget');
  });

  it('SET_RANGE updates globalRange', () => {
    const range = { id: '24h', since: 1000, until: null };
    const result = reducer(baseState, { type: 'SET_RANGE', payload: range });
    expect(result.globalRange).toBe(range);
  });

  it('SET_SEARCH updates searchQuery', () => {
    const result = reducer(baseState, { type: 'SET_SEARCH', payload: 'test' });
    expect(result.searchQuery).toBe('test');
  });

  it('SET_THEME updates theme', () => {
    const result = reducer(baseState, { type: 'SET_THEME', payload: 'dark' });
    expect(result.theme).toBe('dark');
  });

  it('SET_VIEWER updates viewerPath', () => {
    const result = reducer(baseState, { type: 'SET_VIEWER', payload: '/src/main.py' });
    expect(result.viewerPath).toBe('/src/main.py');
  });

  it('SET_TOOL_FILTER updates enabledTools', () => {
    const result = reducer(baseState, { type: 'SET_TOOL_FILTER', payload: ['claude-code'] });
    expect(result.enabledTools).toEqual(['claude-code']);
  });

  it('SSE_UPDATE with no prior snap uses data as snap', () => {
    const data = { total_tokens: 100, tools: [], timestamp: 1000 };
    const result = reducer(baseState, { type: 'SSE_UPDATE', payload: data });
    expect(result.snap).toBe(data);
    expect(result.connected).toBe(true);
  });

  it('SSE_UPDATE merges with existing snap', () => {
    const state = {
      ...baseState,
      snap: { total_tokens: 100, tools: [{ tool: 'claude-code', live: { cpu_percent: 5 } }] },
    };
    const data = { total_tokens: 200, tools: [{ tool: 'claude-code', live: { cpu_percent: 15 } }] };
    const result = reducer(state, { type: 'SSE_UPDATE', payload: data });
    expect(result.snap.total_tokens).toBe(200);
    expect(result.snap.tools[0].live.cpu_percent).toBe(15);
  });

  it('unknown action returns state unchanged', () => {
    const result = reducer(baseState, { type: 'UNKNOWN' });
    expect(result).toBe(baseState);
  });
});
