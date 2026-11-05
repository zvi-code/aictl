// Hook tests — exercise each extracted hook in isolation.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';

// Vitest's jsdom `localStorage` ships as an empty object in this project
// (see test/setup.js — the clear() call is in a try/catch for exactly
// this reason). Install a minimal in-memory polyfill so persistence
// assertions below have a real surface to observe.
(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
})();
beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '/'); });

import { useRange, RANGE_SECONDS } from '../src/hooks/useRange.js';
import { useTools } from '../src/hooks/useTools.js';
import { useTabs } from '../src/hooks/useTabs.js';
import { useTheme } from '../src/hooks/useTheme.js';
import { useDensity } from '../src/hooks/useDensity.js';

// ─── useRange ──────────────────────────────────────────────────
describe('useRange', () => {
  it('defaults to live preset', () => {
    const { result } = renderHook(() => useRange());
    expect(result.current.range.id).toBe('live');
    expect(result.current.range.until).toBeNull();
  });

  it('setPreset updates id and persists to localStorage', () => {
    const { result } = renderHook(() => useRange());
    act(() => { result.current.setPreset('24h'); });
    expect(result.current.range.id).toBe('24h');
    const secs = RANGE_SECONDS['24h'];
    expect(Date.now() / 1000 - result.current.range.since).toBeGreaterThan(secs - 5);
    expect(JSON.parse(localStorage.getItem('aictl-pref-range'))).toBe('24h');
  });

  it('setCustom builds a custom range', () => {
    const { result } = renderHook(() => useRange());
    act(() => { result.current.setCustom(1000, 2000); });
    expect(result.current.range).toEqual({ id: 'custom', since: 1000, until: 2000 });
  });

  it('restores from localStorage on mount', () => {
    localStorage.setItem('aictl-pref-range', JSON.stringify('6h'));
    const { result } = renderHook(() => useRange());
    expect(result.current.range.id).toBe('6h');
  });
});

// ─── useTools ──────────────────────────────────────────────────
describe('useTools', () => {
  const VERIFIED = ['claude-code', 'copilot', 'cursor'];

  it('starts with null (all enabled)', () => {
    const { result } = renderHook(() => useTools(VERIFIED));
    expect(result.current.selectedTools).toBeNull();
  });

  it('toggleTool from all→one removes one', () => {
    const { result } = renderHook(() => useTools(VERIFIED));
    act(() => { result.current.toggleTool('copilot'); });
    expect(result.current.selectedTools).toEqual(['claude-code', 'cursor']);
  });

  it('toggleTool re-enabling the last one collapses back to null', () => {
    const { result } = renderHook(() => useTools(VERIFIED));
    act(() => { result.current.toggleTool('copilot'); });
    act(() => { result.current.toggleTool('copilot'); });
    expect(result.current.selectedTools).toBeNull();
  });

  it('setTools persists and round-trips', () => {
    const { result } = renderHook(() => useTools(VERIFIED));
    act(() => { result.current.setTools(['claude-code']); });
    expect(JSON.parse(localStorage.getItem('aictl-pref-tool_filter'))).toEqual(['claude-code']);
  });
});

// ─── useTabs ───────────────────────────────────────────────────
describe('useTabs', () => {
  it('defaults to overview', () => {
    const { result } = renderHook(() => useTabs());
    expect(result.current.activeTab).toBe('overview');
  });

  it('responds to keyboard shortcut "3"', () => {
    const { result } = renderHook(() => useTabs());
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    });
    expect(result.current.activeTab).toBe('procs');
    expect(JSON.parse(localStorage.getItem('aictl-pref-active_tab'))).toBe('procs');
  });

  it('ignores shortcuts while typing in an input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const { result } = renderHook(() => useTabs());
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });
    expect(result.current.activeTab).toBe('overview');
    document.body.removeChild(input);
  });

  it('setActiveTab works directly', () => {
    const { result } = renderHook(() => useTabs());
    act(() => { result.current.setActiveTab('budget'); });
    expect(result.current.activeTab).toBe('budget');
  });

  it('recovers from a persisted tab id that no longer exists', () => {
    // Regression: 'retired-tab' was removed from the tab registry but could
    // still be persisted in localStorage, leaving users on "Unknown tab".
    localStorage.setItem('aictl-pref-active_tab', JSON.stringify('retired-tab'));
    const { result } = renderHook(() => useTabs());
    expect(result.current.activeTab).toBe('overview');
  });

  it('keeps a persisted tab id that is still registered', () => {
    localStorage.setItem('aictl-pref-active_tab', JSON.stringify('explorer'));
    const { result } = renderHook(() => useTabs());
    expect(result.current.activeTab).toBe('explorer');
  });
});

// ─── useTheme ──────────────────────────────────────────────────
describe('useTheme', () => {
  afterEach(() => { document.documentElement.removeAttribute('data-theme'); });

  it('applies data-theme attribute on mount', () => {
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('auto');
  });

  it('setTheme updates attribute + storage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.setTheme('dark'); });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('aictl-theme')).toBe('dark');
  });

  it('cycleTheme walks auto→dark→light→auto, editorial stays palette-only', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('dark');
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('light');
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('auto');
  });

  it('cycleTheme leaves editorial for the first cycle entry', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.setTheme('editorial'); });
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('auto');
  });

  it('rejects unknown theme values', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.setTheme('hotpink'); });
    expect(result.current.theme).toBe('auto');
  });
});

// ─── useDensity ────────────────────────────────────────────────
describe('useDensity', () => {
  afterEach(() => { document.documentElement.removeAttribute('data-density'); });

  it('defaults to normal and applies data-density attribute', () => {
    const { result } = renderHook(() => useDensity());
    expect(result.current.density).toBe('normal');
    expect(document.documentElement.getAttribute('data-density')).toBe('normal');
  });

  it('setDensity updates attribute and persists', () => {
    const { result } = renderHook(() => useDensity());
    act(() => { result.current.setDensity('compact'); });
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    expect(localStorage.getItem('aictl-density')).toBe('compact');
  });

  it('rejects unknown density values', () => {
    const { result } = renderHook(() => useDensity());
    act(() => { result.current.setDensity('huge'); });
    expect(result.current.density).toBe('normal');
  });
});

// ─── useDashboard ──────────────────────────────────────────────
// Mock the api + inject a fake EventSource to exercise merge semantics.
vi.mock('../src/api.js', () => ({
  getSnapshot: vi.fn(() => Promise.resolve({
    total_files: 5, total_tokens: 100, tools: [{ tool: 'claude-code', label: 'Claude' }],
  })),
  getHistory: vi.fn(() => Promise.resolve({
    ts: [1], files: [5], tokens: [100], cpu: [1], mem_mb: [1], mcp: [0], mem_tokens: [0],
    live_sessions: [0], live_tokens: [0], live_in_rate: [0], live_out_rate: [0],
    by_tool: {},
  })),
  streamUrl: () => '/events',
}));

class FakeEventSource {
  constructor() { FakeEventSource.last = this; this.onopen = null; this.onmessage = null; this.onerror = null; setTimeout(() => this.onopen?.(), 0); }
  emit(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
  close() { this.closed = true; }
}

describe('useDashboard', () => {
  beforeEach(() => { FakeEventSource.last = null; });

  it('fetches initial snapshot and merges an SSE update', async () => {
    const { useDashboard } = await import('../src/hooks/useDashboard.js');
    const { result } = renderHook(() => useDashboard({ EventSourceClass: FakeEventSource, refreshMs: 0 }));

    await act(async () => { await new Promise(r => setTimeout(r, 5)); });
    expect(result.current.snapshot).toBeTruthy();
    expect(result.current.snapshot.total_tokens).toBe(100);

    await act(async () => {
      FakeEventSource.last.emit({
        timestamp: 2, total_files: 6, total_tokens: 150, total_cpu: 2.5, total_mem_mb: 10,
        total_mcp_servers: 1, total_memory_tokens: 0, total_live_sessions: 0,
        total_live_estimated_tokens: 0,
        tools: [{ tool: 'claude-code', live: { cpu_percent: 1 } }],
      });
      await new Promise(r => setTimeout(r, 5));
    });

    expect(result.current.snapshot.total_tokens).toBe(150);
    expect(result.current.history.ts).toContain(2);
    expect(result.current.lastUpdateAt).toBeGreaterThan(0);
  });

  const tick = (n, extra = {}) => ({
    timestamp: n, total_files: 5, total_tokens: 100, total_cpu: 0, total_mem_mb: 0, total_mcp_servers: 0,
    total_memory_tokens: 0, total_live_sessions: 0, total_live_estimated_tokens: 0,
    tools: [{ tool: 'claude-code', live: { cpu_percent: n } }], ...extra,
  });
  const wait = ms => act(async () => { await new Promise(r => setTimeout(r, ms)); });

  it('does not fetch the snapshot again on a timer while the stream is healthy', async () => {
    const api = await import('../src/api.js');
    const { useDashboard } = await import('../src/hooks/useDashboard.js');
    api.getSnapshot.mockClear();
    renderHook(() => useDashboard({ EventSourceClass: FakeEventSource, refreshMs: 15, stallMs: 400, applyMs: 0 }));
    await wait(10);
    for (let n = 1; n <= 8; n++) { await act(async () => { FakeEventSource.last.emit(tick(n)); }); await wait(20); }
    expect(api.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it('fetches the snapshot again when the stream has stalled', async () => {
    const api = await import('../src/api.js');
    const { useDashboard } = await import('../src/hooks/useDashboard.js');
    api.getSnapshot.mockClear();
    renderHook(() => useDashboard({ EventSourceClass: FakeEventSource, refreshMs: 15, stallMs: 40 }));
    await wait(150);
    expect(api.getSnapshot.mock.calls.length).toBeGreaterThan(1);
  });

  it('fetches the snapshot again when the stream reports other file lists', async () => {
    const api = await import('../src/api.js');
    const { useDashboard } = await import('../src/hooks/useDashboard.js');
    api.getSnapshot.mockClear();
    api.getSnapshot.mockResolvedValueOnce({ total_tokens: 1, tools: [{ tool: 'claude-code' }], tools_rev: 'r1' });
    renderHook(() => useDashboard({ EventSourceClass: FakeEventSource, refreshMs: 0, applyMs: 0, minRefetchGapMs: 0 }));
    await wait(10);
    await act(async () => { FakeEventSource.last.emit(tick(1, { tools_rev: 'r1' })); });
    await wait(20);
    expect(api.getSnapshot).toHaveBeenCalledTimes(1);
    await act(async () => { FakeEventSource.last.emit(tick(2, { tools_rev: 'r2' })); });
    await wait(30);
    expect(api.getSnapshot).toHaveBeenCalledTimes(2);
  });

  it('fetches the snapshot again when a hidden tab lost queued messages', async () => {
    const api = await import('../src/api.js');
    const { useDashboard } = await import('../src/hooks/useDashboard.js');
    api.getSnapshot.mockClear();
    renderHook(() => useDashboard({ EventSourceClass: FakeEventSource, refreshMs: 0, applyMs: 0, maxQueued: 2 }));
    await wait(10);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await act(async () => { for (let n = 1; n <= 3; n++) FakeEventSource.last.emit(tick(n)); });
    hidden.mockReturnValue(false);
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    await wait(10);
    expect(api.getSnapshot).toHaveBeenCalledTimes(2);
    hidden.mockRestore();
  });

  it('does not fetch again when a hidden tab kept all its messages', async () => {
    const api = await import('../src/api.js');
    const { useDashboard } = await import('../src/hooks/useDashboard.js');
    api.getSnapshot.mockClear();
    renderHook(() => useDashboard({ EventSourceClass: FakeEventSource, refreshMs: 0, applyMs: 0, maxQueued: 5 }));
    await wait(10);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await act(async () => { for (let n = 1; n <= 3; n++) FakeEventSource.last.emit(tick(n)); });
    hidden.mockReturnValue(false);
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    await wait(10);
    expect(api.getSnapshot).toHaveBeenCalledTimes(1);
    hidden.mockRestore();
  });

  it('merges every message of a batch, so an omitted key does not hide an earlier change', async () => {
    const { useDashboard } = await import('../src/hooks/useDashboard.js');
    const { result } = renderHook(() => useDashboard({ EventSourceClass: FakeEventSource, refreshMs: 0, applyMs: 200 }));
    await wait(10);
    await act(async () => {
      FakeEventSource.last.emit(tick(1, { events: [{ kind: 'new' }], sessions: [{ session_id: 'a' }] }));
      FakeEventSource.last.emit(tick(2, { sessions_delta: { upsert: [{ session_id: 'b' }], remove: [] } }));
    });
    await wait(300);
    expect(result.current.snapshot.events).toEqual([{ kind: 'new' }]);
    expect(result.current.snapshot.sessions.map(s => s.session_id)).toEqual(['a', 'b']);
  });
});
