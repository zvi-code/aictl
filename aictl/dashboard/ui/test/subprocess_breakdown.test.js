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
});
