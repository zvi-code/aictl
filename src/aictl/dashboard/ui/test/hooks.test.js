// Hook tests — exercise each extracted hook in isolation.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

import { useTools } from '../src/hooks/useTools.js';
import { useTheme } from '../src/hooks/useTheme.js';

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

  it('cycleTheme walks auto→dark→light→auto', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('dark');
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('light');
    act(() => { result.current.cycleTheme(); });
    expect(result.current.theme).toBe('auto');
  });

  it('rejects unknown theme values', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.setTheme('hotpink'); });
    act(() => { result.current.setTheme('editorial'); });
    expect(result.current.theme).toBe('auto');
  });
});
