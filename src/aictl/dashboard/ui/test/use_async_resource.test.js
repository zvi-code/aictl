// useAsyncResource — shared fetch/loading/error hook used by the
// session-detail panels. Covers the resolve/reject paths plus the
// cancellation guard (unmount + stale dep-set) and the enabled gate.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';

import { useAsyncResource } from '../src/hooks/useAsyncResource.js';

afterEach(() => { vi.restoreAllMocks(); });

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Flush microtasks + a macrotask so .then/.catch chains settle and Preact
// re-renders before we assert.
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

describe('useAsyncResource', () => {
  it('starts loading, then sets data when the fetch resolves', async () => {
    const d = deferred();
    const fetchFn = vi.fn(() => d.promise);
    const { result } = renderHook(() => useAsyncResource(fetchFn, ['s1']));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    d.resolve({ ok: true });
    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ ok: true });
    expect(result.current.error).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('sets error (and clears data) when the fetch rejects', async () => {
    const boom = new Error('boom');
    const { result } = renderHook(() => useAsyncResource(() => Promise.reject(boom), ['s1']));

    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(boom);
  });

  it('ignores a result that arrives after unmount (no setState, no warning)', async () => {
    const d = deferred();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useAsyncResource(() => d.promise, ['s1']));

    expect(result.current.loading).toBe(true);
    unmount();

    d.resolve('too late');
    await flush();

    expect(errSpy).not.toHaveBeenCalled();
    // State was frozen at unmount — the late resolve never committed.
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('discards a stale result when deps change while a fetch is in flight', async () => {
    const first = deferred();
    const second = deferred();
    const fetchFn = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(
      ({ id }) => useAsyncResource(fetchFn, [id]),
      { initialProps: { id: 'a' } },
    );

    // Switch dep-set while the first fetch is still pending.
    rerender({ id: 'b' });
    second.resolve('fresh');
    await flush();
    expect(result.current.data).toBe('fresh');

    // The first fetch resolves late — it must not overwrite the newer data.
    first.resolve('stale');
    await flush();
    expect(result.current.data).toBe('fresh');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('a stale rejection is also ignored after deps change', async () => {
    const first = deferred();
    const second = deferred();
    const fetchFn = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(
      ({ id }) => useAsyncResource(fetchFn, [id]),
      { initialProps: { id: 'a' } },
    );

    rerender({ id: 'b' });
    second.resolve('fresh');
    await flush();

    first.reject(new Error('old fetch failed'));
    await flush();
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('fresh');
  });

  it('does not fetch when enabled is false and settles at the idle state', async () => {
    const fetchFn = vi.fn();
    const { result } = renderHook(() =>
      useAsyncResource(fetchFn, ['s1'], { enabled: false }));

    await flush();

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current).toEqual({ data: null, loading: false, error: null });
  });

  it('fetches when enabled flips to true and resets when it flips back', async () => {
    const fetchFn = vi.fn(() => Promise.resolve('hello'));
    const { result, rerender } = renderHook(
      ({ enabled }) => useAsyncResource(fetchFn, ['s1'], { enabled }),
      { initialProps: { enabled: false } },
    );

    await flush();
    expect(fetchFn).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await flush();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('hello');

    rerender({ enabled: false });
    await flush();
    expect(result.current).toEqual({ data: null, loading: false, error: null });
  });

  it('clears a previous error when deps change and the refetch succeeds', async () => {
    const fetchFn = vi.fn()
      .mockReturnValueOnce(Promise.reject(new Error('first failed')))
      .mockReturnValueOnce(Promise.resolve('recovered'));
    const { result, rerender } = renderHook(
      ({ id }) => useAsyncResource(fetchFn, [id]),
      { initialProps: { id: 'a' } },
    );

    await flush();
    expect(result.current.error).toBeTruthy();

    rerender({ id: 'b' });
    await flush();
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('recovered');
  });
});
