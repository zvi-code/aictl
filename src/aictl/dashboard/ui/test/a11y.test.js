// Axe-core accessibility ratchet. Renders App with mocked data and asserts
// there are no SERIOUS or CRITICAL a11y violations.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import axe from 'axe-core';

// Mock SSE + API so App stays in "connected + snapshot" ready state.
vi.mock('../src/useSse.js', () => ({
  useSse: () => ({ connected: true }),
}));

vi.mock('../src/api.js', () => {
  const empty = { tools: [], sparklines: {}, total_live_sessions: 0 };
  return {
    getSnapshot: () => Promise.resolve(empty),
    getHistory:  () => Promise.resolve({ timestamps: [], series: {} }),
    getEvents:   () => Promise.resolve([]),
    getOtelStatus: () => Promise.resolve({ active: false }),
    streamUrl:   () => 'about:blank',
    getFile:     () => Promise.resolve({ content: '' }),
  };
});

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});
afterEach(() => cleanup());

describe('axe a11y ratchet', () => {
  it('App renders with no serious/critical violations', async () => {
    const { default: App } = await import('../src/app.js');
    const { container } = render(html`<${App}/>`);
    // Wait for initial snapshot fetch + skeleton → real content.
    await waitFor(() => {
      expect(container.querySelector('header[role="banner"]')).toBeTruthy();
    });

    const results = await axe.run(container, {
      // Limit to rules jsdom can evaluate meaningfully.
      rules: {
        'color-contrast': { enabled: false }, // jsdom has no layout
        'region': { enabled: false },         // false positive in partial mount
      },
    });
    const serious = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical',
    );
    if (serious.length) {
      // eslint-disable-next-line no-console
      console.error('Axe violations:\n' + serious.map(v =>
        `  [${v.impact}] ${v.id}: ${v.description}\n    ${v.nodes.map(n => n.html).join('\n    ')}`
      ).join('\n'));
    }
    expect(serious).toEqual([]);
  }, 15000);
});
