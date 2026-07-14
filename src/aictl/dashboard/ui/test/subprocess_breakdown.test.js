import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import SubprocessBreakdown from '../src/components/session_detail/SubprocessBreakdown.js';
import * as api from '../src/api.js';

beforeEach(() => cleanup());
afterEach(() => vi.restoreAllMocks());

describe('SubprocessBreakdown', () => {
  it('renders top-N bars sorted by count with a width proportional to max', async () => {
    vi.spyOn(api, 'getSessionSubprocesses').mockResolvedValue({
      session_id: 's1',
      total: 30,
      counts: [
        { name: 'git', count: 10 },
        { name: 'node', count: 7 },
        { name: 'rg', count: 5 },
        { name: 'bash', count: 4 },
        { name: 'ls', count: 2 },
        { name: 'cat', count: 2 },
      ],
      recent: [],
    });
    const { container } = render(html`<${SubprocessBreakdown} sessionId="s1" topN=${3}/>`);
    await waitFor(() => expect(container.querySelectorAll('.subprocess-row').length).toBe(3));
    const names = [...container.querySelectorAll('.subprocess-name')].map(n => n.textContent);
    expect(names).toEqual(['git', 'node', 'rg']);
    const bars = [...container.querySelectorAll('.subprocess-bar')].map(b => b.style.width);
    expect(bars[0]).toBe('100%');
    // 7/10 = 70%
    expect(bars[1]).toBe('70%');
  });

  it('renders an empty-state message when there are no subprocesses', async () => {
    vi.spyOn(api, 'getSessionSubprocesses').mockResolvedValue({
      session_id: 's2', total: 0, counts: [], recent: [],
    });
    render(html`<${SubprocessBreakdown} sessionId="s2"/>`);
    await waitFor(() => {
      expect(screen.getByText(/No subprocess activity/)).toBeTruthy();
    });
  });

  // Representative coverage for the panel error/cancellation pattern that
  // ActionsPanel, ApiCallsPanel, McpUsagePanel, ProjectCostPanel and
  // RunHistoryPanel now share (see UI consolidation batch).
  it('shows an error-state (not the empty-state) when the API call fails', async () => {
    vi.spyOn(api, 'getSessionSubprocesses')
      .mockRejectedValue(new Error('HTTP 500 /api/session-subprocesses: db locked'));
    const { container } = render(html`<${SubprocessBreakdown} sessionId="s3"/>`);
    await waitFor(() => {
      expect(container.querySelector('.error-state')).toBeTruthy();
    });
    const err = container.querySelector('.error-state');
    expect(err.textContent).toMatch(/subprocess breakdown/i);
    expect(err.textContent).toMatch(/db locked/);
    expect(container.textContent).not.toMatch(/No subprocess activity/);
  });

  it('shows a loading state while the fetch is in flight', async () => {
    let resolveIt;
    vi.spyOn(api, 'getSessionSubprocesses')
      .mockReturnValue(new Promise(res => { resolveIt = res; }));
    const { container } = render(html`<${SubprocessBreakdown} sessionId="s4"/>`);
    expect(container.querySelector('.loading-state')).toBeTruthy();
    resolveIt({ session_id: 's4', total: 0, counts: [], recent: [] });
    await waitFor(() => {
      expect(container.querySelector('.loading-state')).toBeFalsy();
    });
  });

  it('does not commit stale data after a rapid session switch', async () => {
    let resolveSlow;
    const slow = new Promise(res => { resolveSlow = res; });
    const spy = vi.spyOn(api, 'getSessionSubprocesses')
      .mockReturnValueOnce(slow) // first session — never finishes in time
      .mockResolvedValueOnce({
        session_id: 's-new', total: 3,
        counts: [{ name: 'node', count: 3 }], recent: [],
      });

    const { container, rerender } = render(html`<${SubprocessBreakdown} sessionId="s-old"/>`);
    // Switch session while the first fetch is still pending.
    rerender(html`<${SubprocessBreakdown} sessionId="s-new"/>`);

    await waitFor(() => {
      expect(container.textContent).toContain('node');
    });

    // Old fetch resolves late with different data — it must be discarded.
    resolveSlow({
      session_id: 's-old', total: 99,
      counts: [{ name: 'stale-proc', count: 99 }], recent: [],
    });
    await new Promise(r => setTimeout(r, 0));
    expect(container.textContent).toContain('node');
    expect(container.textContent).not.toContain('stale-proc');
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
