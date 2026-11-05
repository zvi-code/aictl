// The tab, time range and tool filter live in the URL so a link reproduces a view.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import {
  mergeSearch, parseUrlState, rangeToParams, resolveTabId, toolsToParams,
} from '../src/hooks/urlState.js';
import { useRange } from '../src/hooks/useRange.js';
import { useTabs } from '../src/hooks/useTabs.js';
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
  it('reads tab, preset range and tools', () => {
    expect(parseUrlState('?tab=budget&range=24h&tools=claude-code,codex-cli')).toEqual({
      tab: 'budget', range: { id: '24h' }, tools: ['claude-code', 'codex-cli'],
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
    expect(mergeSearch('?x=1&tab=a', { tab: null, tools: 'a,b' })).toBe('?x=1&tools=a,b');
    expect(mergeSearch('?tab=a', { tab: null })).toBe('');
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

describe('deep links', () => {
  it('old tab names redirect to their current id', () => {
    const ids = ['overview', 'explorer', 'procs'];
    expect(resolveTabId('sessions', ids)).toBe('explorer');
    expect(resolveTabId('dashboard', ids)).toBe('overview');
    expect(resolveTabId('gone', ids)).toBeNull();
  });
  it('useTabs prefers the URL over localStorage and pushes changes', () => {
    localStorage.setItem('aictl-pref-active_tab', JSON.stringify('config'));
    setUrl('?tab=budget');
    const { result } = renderHook(() => useTabs());
    expect(result.current.activeTab).toBe('budget');
    act(() => result.current.setActiveTab('live'));
    expect(window.location.search).toBe('?tab=live');
    act(() => result.current.setActiveTab('overview'));
    expect(window.location.search).toBe('');
  });
  it('Back restores the previous tab', () => {
    setUrl('?tab=budget');
    const { result } = renderHook(() => useTabs());
    act(() => result.current.setActiveTab('live'));
    setUrl('?tab=budget');
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(result.current.activeTab).toBe('budget');
  });
  it('[ and ] step through views in nav order', () => {
    setUrl('?tab=overview');
    const { result } = renderHook(() => useTabs());
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: ']' })); });
    expect(result.current.activeTab).toBe('hidden');
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: '[' })); });
    expect(result.current.activeTab).toBe('overview');
  });
});

describe('global filters in the URL', () => {
  it('useRange loads from the URL and writes back', () => {
    setUrl('?range=7d');
    const { result } = renderHook(() => useRange());
    expect(result.current.range.id).toBe('7d');
    act(() => result.current.setPreset('1h'));
    expect(window.location.search).toBe('?range=1h');
    act(() => result.current.setPreset('live'));
    expect(window.location.search).toBe('');
  });
  it('useRange ignores an unknown preset', () => {
    setUrl('?range=bogus');
    const { result } = renderHook(() => useRange());
    expect(result.current.range.id).toBe('live');
  });
  it('useTools loads from the URL and writes back', () => {
    setUrl('?tools=claude-code');
    const { result } = renderHook(() => useTools(['claude-code', 'codex-cli']));
    expect(result.current.selectedTools).toEqual(['claude-code']);
    act(() => result.current.toggleTool('codex-cli'));
    expect(result.current.selectedTools).toBeNull();
    expect(window.location.search).toBe('');
  });
});
