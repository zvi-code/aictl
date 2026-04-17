import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';

vi.mock('../src/api.js', () => ({
  getSessionMemoryDiff: vi.fn(),
}));

import * as api from '../src/api.js';
import { SnapContext } from '../src/context.js';
import MemoryPanel from '../src/components/session_detail/MemoryPanel.js';

const ctxValue = { snap: { agent_memory: [] } };

function renderPanel(session) {
  return render(html`<${SnapContext.Provider} value=${ctxValue}>
    <${MemoryPanel} session=${session}/>
  </${SnapContext.Provider}>`);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('MemoryPanel — session memory diff', () => {
  it('renders added / modified / removed files with counts', async () => {
    api.getSessionMemoryDiff.mockResolvedValue({
      files: [
        { path: 'a.md', change: 'modified', added_lines: 2, removed_lines: 1, unified_diff: '--- a/a.md\n+++ b/a.md\n@@\n-old\n+new1\n+new2\n' },
        { path: 'c.md', change: 'added', added_lines: 3, removed_lines: 0, unified_diff: '+one\n+two\n+three\n' },
        { path: 'b.md', change: 'removed', added_lines: 0, removed_lines: 4, unified_diff: '-a\n-b\n-c\n-d\n' },
      ],
      summary: { added: 1, modified: 1, removed: 1 },
    });

    const { container } = renderPanel({session_id: 's1', project: ''});

    await waitFor(() => {
      expect(container.querySelectorAll('.sd-memdiff-row').length).toBe(3);
    });

    // Summary line present
    expect(container.textContent).toContain('1 added');
    expect(container.textContent).toContain('1 modified');
    expect(container.textContent).toContain('1 removed');

    // +/- counts visible for a.md row
    const rowA = Array.from(container.querySelectorAll('.sd-memdiff-row'))
      .find((n) => n.textContent.includes('a.md'));
    expect(rowA).toBeTruthy();
    expect(rowA.textContent).toContain('+2');
    expect(rowA.textContent).toContain('-1');

    // Click to expand inline diff
    const toggle = rowA.querySelector('[role="button"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    await waitFor(() => {
      const pre = rowA.querySelector('pre.diff');
      expect(pre).not.toBeNull();
      expect(pre.textContent).toContain('+new1');
    });
  });

  it('shows empty state when no memory changes recorded', async () => {
    api.getSessionMemoryDiff.mockResolvedValue({
      files: [],
      summary: { added: 0, modified: 0, removed: 0 },
    });
    const { container } = renderPanel({session_id: 's2', project: ''});
    await waitFor(() => {
      expect(container.querySelector('.empty-state')).not.toBeNull();
      expect(container.textContent).toContain('No memory changes recorded');
    });
    expect(container.querySelectorAll('.sd-memdiff-row').length).toBe(0);
  });

  it('tolerates a rejected API call and still renders empty state', async () => {
    api.getSessionMemoryDiff.mockRejectedValue(new Error('boom'));
    const { container } = renderPanel({session_id: 's3', project: ''});
    await waitFor(() => {
      expect(container.textContent).toContain('No memory changes recorded');
    });
  });
});
