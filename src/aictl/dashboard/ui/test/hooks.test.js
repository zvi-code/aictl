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
beforeEach(() => { localStorage.clear(); });

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

  it('responds to keyboard shortcut "2"', () => {
    const { result } = renderHook(() => useTabs());
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
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
    // Regression: 'sessions' was removed from the tab registry but could
    // still be persisted in localStorage, leaving users on "Unknown tab".
    localStorage.setItem('aictl-pref-active_tab', JSON.stringify('sessions'));
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

  it('cycleTheme walks auto→dark→light→editorial→auto', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('dark');
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('light');
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('editorial');
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('auto');
  });

  it('cycleTheme returns to starting theme after themes.length calls', () => {
    // Invariant guard: any future theme addition only requires updating the
    // ordered test above; this length check stays correct automatically.
    const { result } = renderHook(() => useTheme());
    const start = result.current.theme;
    const n = result.current.themes.length;
    for (let i = 0; i < n; i++) act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe(start);
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
});
