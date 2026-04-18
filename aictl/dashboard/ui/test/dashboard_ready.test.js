// Regression: once the snapshot has loaded, the dashboard must render
// real content even if the SSE stream is disconnected. Otherwise a
// transient SSE drop flashes a skeleton across every tab and looks like
// "all tabs stuck at loading".
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';

vi.mock('../src/useSse.js', () => ({
  // Simulate SSE never connecting.
  useSse: () => ({ connected: false, close: () => {} }),
}));

vi.mock('../src/api.js', () => {
  const snap = {
    timestamp: 1,
    root: '/tmp',
    tools: [],
    sparklines: {},
    total_live_sessions: 0,
  };
  return {
    getSnapshot:  () => Promise.resolve(snap),
    getHistory:   () => Promise.resolve({ timestamps: [], series: {} }),
    getEvents:    () => Promise.resolve([]),
    getOtelStatus: () => Promise.resolve({ active: false }),
    streamUrl:    () => 'about:blank',
    getFile:      () => Promise.resolve({ content: '' }),
  };
});

beforeEach(() => { try { localStorage.clear(); } catch { /* noop */ } });
afterEach(() => cleanup());

describe('App ready gate', () => {
  it('renders tab content after snapshot loads, even while SSE is disconnected', async () => {
    const { default: App } = await import('../src/app.js');
    const { container } = render(html`<${App}/>`);

    // Tabs should render and the body should NOT remain a skeleton once the
    // snapshot has arrived — even though `connected` is stuck at false.
    await waitFor(() => {
      expect(container.querySelector('nav.tab-nav')).toBeTruthy();
      expect(container.querySelector('.tab-skeleton')).toBeFalsy();
    }, { timeout: 2000 });
  });
});
