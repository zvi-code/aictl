import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import EventsPanel from '../src/components/session_detail/EventsPanel.js';
import * as api from '../src/api.js';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EventsPanel', () => {
  it('renders rows and expands full JSON on click, highlighting error-like kinds', async () => {
    const getSessionEvents = vi.spyOn(api, 'getSessionEvents').mockResolvedValue([
      { ts: 1700001000, kind: 'permission_request', tool: 'claude-code', detail: { action: 'read', path: '/tmp/a' } },
      { ts: 1700000000, kind: 'session_start', tool: 'claude-code', detail: { note: 'ok' } },
    ]);

    const { container } = render(html`<${EventsPanel} sessionId="sess-1" since=${0} until=${null} />`);

    await waitFor(() => expect(getSessionEvents).toHaveBeenCalledWith('sess-1', { since: 0, until: null, limit: 500 }));
    expect(screen.getByText('permission_request')).toBeTruthy();
    expect(screen.getByText('session_start')).toBeTruthy();

    const alertRow = container.querySelector('.es-events-row.is-alert');
    expect(alertRow).toBeTruthy();

    fireEvent.click(alertRow);
    await waitFor(() => {
      const pre = container.querySelector('.es-events-detail');
      expect(pre).toBeTruthy();
      expect(pre.textContent).toContain('"action": "read"');
    });
  });
});
