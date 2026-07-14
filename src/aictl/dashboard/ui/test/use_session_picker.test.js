// Tests for the shared useSessionPicker hook — the fetch + dedupe +
// tool/session auto-select block that used to be copy-pasted across
// TabExplorer, TabSessionFlow, TabTranscript and TabTimelineChart.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/preact';

vi.mock('../src/api.js', () => ({
  getSessionTimeline: vi.fn(),
}));

import * as api from '../src/api.js';
import useSessionPicker from '../src/hooks/useSessionPicker.js';

const S = (id, tool, startedAt, extra = {}) => ({
  session_id: id,
  tool,
  started_at: startedAt,
  ended_at: startedAt + 100,
  ...extra,
});

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.clearAllMocks(); });

describe('useSessionPicker', () => {
  it('fetches, dedupes and sorts sessions newest-first', async () => {
    api.getSessionTimeline.mockResolvedValue([
      S('a', 'claude-code', 100),
      S('b', 'claude-code', 300),
      S('a', 'claude-code', 100), // exact duplicate id — must be merged
    ]);
    const { result } = renderHook(() => useSessionPicker({}));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sessions.map(s => s.session_id)).toEqual(['b', 'a']);
    expect(result.current.error).toBeNull();
  });

  it('auto-selects the first tool and its newest session', async () => {
    api.getSessionTimeline.mockResolvedValue([
      S('c1', 'copilot', 400),
      S('a1', 'claude-code', 300),
      S('a2', 'claude-code', 200),
    ]);
    const { result } = renderHook(() => useSessionPicker({}));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // tools sorted alphabetically → claude-code first
    expect(result.current.tools).toEqual(['claude-code', 'copilot']);
    await waitFor(() => expect(result.current.activeTool).toBe('claude-code'));
    await waitFor(() => expect(result.current.activeSessionId).toBe('a1'));
    expect(result.current.toolSessions.map(s => s.session_id)).toEqual(['a1', 'a2']);
  });

  it('filters by enabledTools and re-selects when the active tool drops out', async () => {
    api.getSessionTimeline.mockResolvedValue([
      S('a1', 'claude-code', 300),
      S('c1', 'copilot', 400),
    ]);
    const { result, rerender } = renderHook(
      (props) => useSessionPicker(props),
      { initialProps: { enabledTools: null } },
    );
    await waitFor(() => expect(result.current.activeTool).toBe('claude-code'));

    rerender({ enabledTools: ['copilot'] });
    await waitFor(() => expect(result.current.activeTool).toBe('copilot'));
    await waitFor(() => expect(result.current.activeSessionId).toBe('c1'));
    expect(result.current.tools).toEqual(['copilot']);
  });

  it('applies an externally-requested session over the auto-select', async () => {
    api.getSessionTimeline.mockResolvedValue([
      S('new', 'claude-code', 500),
      S('old', 'copilot', 100),
    ]);
    const onRequestApplied = vi.fn();
    const { result } = renderHook(() => useSessionPicker({
      requestedSession: { sessionId: 'old', tool: 'copilot' },
      onRequestApplied,
    }));

    await waitFor(() => expect(result.current.activeSessionId).toBe('old'));
    expect(result.current.activeTool).toBe('copilot');
    expect(onRequestApplied).toHaveBeenCalled();
  });

  it('keeps a requested session pending until the list contains it', async () => {
    api.getSessionTimeline.mockResolvedValue([S('only', 'claude-code', 100)]);
    const onRequestApplied = vi.fn();
    const { result } = renderHook(() => useSessionPicker({
      requestedSession: { sessionId: 'not-there' },
      onRequestApplied,
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    // auto-select proceeds; the unknown request never applies
    await waitFor(() => expect(result.current.activeSessionId).toBe('only'));
    expect(onRequestApplied).not.toHaveBeenCalled();
  });

  it('surfaces fetch errors via the error state', async () => {
    api.getSessionTimeline.mockRejectedValue(new Error('HTTP 500 /api/session-timeline'));
    const { result } = renderHook(() => useSessionPicker({}));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toContain('500');
    expect(result.current.sessions).toEqual([]);
  });

  it('refetches when globalRange changes and does not commit stale results', async () => {
    let resolveFirst;
    const first = new Promise(res => { resolveFirst = res; });
    api.getSessionTimeline
      .mockReturnValueOnce(first)                                   // slow old-range fetch
      .mockResolvedValueOnce([S('fresh', 'claude-code', 900)]);     // fast new-range fetch

    const { result, rerender } = renderHook(
      (props) => useSessionPicker(props),
      { initialProps: { globalRange: { since: 0, until: 1000 } } },
    );

    rerender({ globalRange: { since: 500, until: 2000 } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions.map(s => s.session_id)).toEqual(['fresh']);

    // Old fetch resolves late — its result must be discarded (cancelled).
    await act(async () => { resolveFirst([S('stale', 'claude-code', 100)]); });
    expect(result.current.sessions.map(s => s.session_id)).toEqual(['fresh']);
  });

  it('exposes setters that drive the picker', async () => {
    api.getSessionTimeline.mockResolvedValue([
      S('a1', 'claude-code', 300),
      S('a2', 'claude-code', 200),
    ]);
    const { result } = renderHook(() => useSessionPicker({}));
    await waitFor(() => expect(result.current.activeSessionId).toBe('a1'));

    act(() => { result.current.setActiveSessionId('a2'); });
    expect(result.current.activeSessionId).toBe('a2');
  });
});
