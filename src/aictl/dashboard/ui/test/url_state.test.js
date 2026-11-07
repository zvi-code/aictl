// The time range and tool filter live in the URL so a link reproduces a view.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import {
  mergeSearch, parseUrlState, rangeToParams, toolsToParams,
} from '../src/hooks/urlState.js';
import { useTools } from '../src/hooks/useTools.js';

// jsdom's localStorage is an empty object here (see test/setup.js).
(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
})();

const setUrl = (s) => window.history.replaceState(null, '', '/' + s);

beforeEach(() => { localStorage.clear(); setUrl(''); });
afterEach(() => setUrl(''));

describe('parseUrlState', () => {
  it('reads preset range and tools', () => {
    expect(parseUrlState('?range=24h&tools=claude-code,codex-cli')).toEqual({
      range: { id: '24h' }, tools: ['claude-code', 'codex-cli'],
    });
  });
  it('treats an empty tools param as "none selected", not "all"', () => {
    expect(parseUrlState('?tools=').tools).toEqual([]);
  });
  it('rejects a custom range with a bad window', () => {
    expect(parseUrlState('?range=custom&since=20&until=10').range).toBeUndefined();
    expect(parseUrlState('?range=custom&since=10&until=20').range).toEqual({ id: 'custom', since: 10, until: 20 });
  });
});

describe('mergeSearch', () => {
  it('sets, removes, and keeps unrelated keys, with readable commas', () => {
    expect(mergeSearch('?x=1&agent=a', { agent: null, tools: 'a,b' })).toBe('?x=1&tools=a,b');
    expect(mergeSearch('?agent=a', { agent: null })).toBe('');
  });
});

describe('serializers', () => {
  it('omit defaults so a plain view has a plain URL', () => {
    expect(rangeToParams({ id: 'live' }).range).toBeNull();
    expect(toolsToParams(null).tools).toBeNull();
  });
  it('round-trip a custom range', () => {
    const p = rangeToParams({ id: 'custom', since: 100.7, until: 200.2 });
    expect(p).toEqual({ range: 'custom', since: 100, until: 200 });
  });
});

describe('global filters in the URL', () => {
  it('useTools loads from the URL and writes back', () => {
    setUrl('?tools=claude-code');
    const { result } = renderHook(() => useTools(['claude-code', 'codex-cli']));
    expect(result.current.selectedTools).toEqual(['claude-code']);
    act(() => result.current.toggleTool('codex-cli'));
    expect(result.current.selectedTools).toBeNull();
    expect(window.location.search).toBe('');
  });
});
