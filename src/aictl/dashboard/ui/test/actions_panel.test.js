import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';

vi.mock('../src/api.js', () => ({
  getEvents: vi.fn(),
}));

import * as api from '../src/api.js';
import ActionsPanel from '../src/components/session_detail/ActionsPanel.js';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('ActionsPanel — tool input/result expansion', () => {
  it('renders collapsed input preview, expands on click', async () => {
    api.getEvents.mockResolvedValue([
      {
        ts: 1_700_000_000,
        kind: 'tool_call',
        detail: { tool_name: 'Read', tool_input: { file_path: '/x/y' }, result: 'done' },
      },
    ]);

    const { container } = render(html`<${ActionsPanel} sessionId="s1"/>`);

    const toggle = await waitFor(() => {
      const btn = container.querySelector('.sd-event-toggle');
      if (!btn) throw new Error('toggle not rendered');
      return btn;
    });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    // Collapsed preview should contain the file_path from tool_input.
    expect(toggle.textContent).toContain('/x/y');
    // Full body <pre> should not yet be visible.
    expect(container.querySelector('.sd-event-detail pre')).toBeNull();

    fireEvent.click(toggle);

    await waitFor(() => {
      const pre = container.querySelector('.sd-event-detail pre');
      expect(pre).not.toBeNull();
      expect(pre.textContent).toContain('/x/y');
      expect(pre.textContent).toContain('done');
    });
    expect(container.querySelector('.sd-event-toggle').getAttribute('aria-expanded')).toBe('true');
  });

  it('does not render expansion region when no input/result present', async () => {
    api.getEvents.mockResolvedValue([
      { ts: 1_700_000_001, kind: 'session_start', detail: { cwd: '/tmp' } },
    ]);
    const { container } = render(html`<${ActionsPanel} sessionId="s2"/>`);
    await waitFor(() => {
      expect(container.querySelector('.sd-event-row')).not.toBeNull();
    });
    expect(container.querySelector('.sd-event-toggle')).toBeNull();
  });

  it('coalesces consecutive identical detail-less events into one row with ×N badge', async () => {
    // Newest-first (API order): six file_modified events on the same path,
    // then a session_start. The panel should show 2 rows, not 7.
    const runs = Array.from({ length: 6 }, (_, i) => ({
      ts: 1_700_000_010 + (5 - i),
      kind: 'file_modified',
      detail: { path: '/Users/x/.claude/projects/p/session.jsonl' },
    }));
    api.getEvents.mockResolvedValue([...runs,
      { ts: 1_700_000_001, kind: 'session_start', detail: { cwd: '/tmp' } },
    ]);
    const { container } = render(html`<${ActionsPanel} sessionId="s4"/>`);
    await waitFor(() => {
      expect(container.querySelectorAll('.sd-event-row').length).toBe(2);
    });
    expect(container.textContent).toContain('×6');
    // Distinct events (different path) must NOT be coalesced.
  });

  it('does not coalesce consecutive events with different descriptions', async () => {
    api.getEvents.mockResolvedValue([
      { ts: 1_700_000_011, kind: 'file_modified', detail: { path: '/b' } },
      { ts: 1_700_000_010, kind: 'file_modified', detail: { path: '/a' } },
    ]);
    const { container } = render(html`<${ActionsPanel} sessionId="s5"/>`);
    await waitFor(() => {
      expect(container.querySelectorAll('.sd-event-row').length).toBe(2);
    });
    expect(container.textContent).not.toContain('×2');
  });

  it('merges adjacent hook:PreToolUse + hook:PostToolUse for same tool into one row', async () => {
    // Real-session-shaped pair: Pre carries tool_input, Post carries result.
    // The panel reverses the API response, so supply newest-first here so
    // the component observes them chronologically (Pre before Post).
    api.getEvents.mockResolvedValue([
      {
        ts: 1_700_000_011,
        kind: 'hook:PostToolUse',
        detail: { tool_name: 'Read', result_summary: 'file contents here' },
      },
      {
        ts: 1_700_000_010,
        kind: 'hook:PreToolUse',
        detail: { tool_name: 'Read', tool_input: { file_path: '/a/b.py' } },
      },
    ]);
    const { container } = render(html`<${ActionsPanel} sessionId="s3"/>`);

    await waitFor(() => {
      expect(container.querySelector('.sd-event-toggle')).not.toBeNull();
    });
    // Merged: one toggle (one row), not two.
    expect(container.querySelectorAll('.sd-event-toggle').length).toBe(1);
    // Merged kind label reflects the composite row.
    const kinds = Array.from(container.querySelectorAll('.sd-event-kind')).map(
      (n) => n.textContent
    );
    expect(kinds).toContain('hook:tool_use');

    // Expand and verify both input and result visible in one expansion.
    fireEvent.click(container.querySelector('.sd-event-toggle'));
    await waitFor(() => {
      const pre = container.querySelector('.sd-event-detail pre');
      expect(pre).not.toBeNull();
      expect(pre.textContent).toContain('/a/b.py');
      expect(pre.textContent).toContain('file contents here');
    });
  });
});
