// Event feed detail rendering in TabEventsStats: nested objects must render
// as JSON (never "[object Object]") and rows expand to the full payload.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';

vi.mock('../src/api.js', () => ({
  getEvents: vi.fn(),
  getHistory: vi.fn(),
}));

import * as api from '../src/api.js';
import { SnapContext } from '../src/context.js';
import TabEventsStats from '../src/components/TabEventsStats.js';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const NOW = Math.floor(Date.now() / 1000);

const SNAP = {
  tools: [{
    tool: 'claude-code', label: 'Claude Code', vendor: null,
    files: [{ path: '/tmp/x', tokens: 1 }], processes: [], live: null,
  }],
  tool_telemetry: [],
};

const CTX = {
  snap: SNAP,
  globalRange: { id: '1h', since: NOW - 3600, until: null },
};

function renderTab(events) {
  api.getEvents.mockResolvedValue(events);
  api.getHistory.mockResolvedValue({ by_tool: {} });
  return render(html`
    <${SnapContext.Provider} value=${CTX}>
      <${TabEventsStats}/>
    </${SnapContext.Provider}>
  `);
}

describe('TabEventsStats event detail', () => {
  it('renders nested detail values as truncated JSON, not [object Object]', async () => {
    const { container, findByText } = renderTab([{
      ts: NOW - 10, tool: 'claude-code', kind: 'hook:PreToolUse',
      detail: { tool_name: 'Bash', tool_input: { command: 'ls -la' } },
    }]);
    await findByText('Events (1)');
    await waitFor(() => expect(container.querySelector('.es-event-detail')).toBeTruthy());
    const detail = container.querySelector('.es-event-detail');
    expect(detail.textContent).toContain('tool_name=Bash');
    expect(detail.textContent).toContain('tool_input={"command":"ls -la"}');
    expect(detail.textContent).not.toContain('[object Object]');
  });

  it('expands a row to pretty-printed full JSON via an aria-expanded button', async () => {
    const { container, findByText } = renderTab([{
      ts: NOW - 10, tool: 'claude-code', kind: 'hook:PreToolUse',
      detail: { tool_name: 'Bash', tool_input: { command: 'ls -la' } },
    }]);
    await findByText('Events (1)');
    await waitFor(() => expect(container.querySelector('button.es-event-detail')).toBeTruthy());

    const btn = container.querySelector('button.es-event-detail');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.es-feed pre.mono')).toBeNull();

    fireEvent.click(btn);
    await waitFor(() => expect(btn.getAttribute('aria-expanded')).toBe('true'));
    const pre = container.querySelector('.es-feed pre.mono');
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('"command": "ls -la"');

    fireEvent.click(btn);
    await waitFor(() => expect(btn.getAttribute('aria-expanded')).toBe('false'));
    expect(container.querySelector('.es-feed pre.mono')).toBeNull();
  });

  it('renders flat detail values as before and no expand affordance without detail', async () => {
    const { container, findByText } = renderTab([
      { ts: NOW - 20, tool: 'claude-code', kind: 'file_modified', detail: { path: '/tmp/a.py' } },
      { ts: NOW - 30, tool: 'claude-code', kind: 'session_start', detail: null },
    ]);
    await findByText('Events (2)');
    await waitFor(() => expect(container.querySelectorAll('.es-event').length).toBe(2));
    expect(container.textContent).toContain('path=/tmp/a.py');
    // Event without detail renders the plain dash, not a button.
    const spans = [...container.querySelectorAll('span.es-event-detail')];
    expect(spans.some(s => s.textContent === '-')).toBe(true);
  });
});
