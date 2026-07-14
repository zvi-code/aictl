// Analytics thread-health banner: /api/analytics carries a `_health` block
// from the background recompute thread; a failing thread must be surfaced
// instead of rendering stale cache as fresh.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';

import * as api from '../src/api.js';
import { SnapContext } from '../src/context.js';
import TabAnalytics from '../src/components/TabAnalytics.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const NOW = Math.floor(Date.now() / 1000);
const CTX = { globalRange: { id: '1h', since: NOW - 3600, until: null } };

function renderTab(payload) {
  vi.spyOn(api, 'getAnalytics').mockResolvedValue(payload);
  vi.spyOn(api, 'getSamplesList').mockResolvedValue([]);
  return render(html`
    <${SnapContext.Provider} value=${CTX}>
      <${TabAnalytics}/>
    </${SnapContext.Provider}>
  `);
}

describe('TabAnalytics health banner', () => {
  it('warns when the background thread is failing, with detail and age', async () => {
    const { container, findByText } = renderTab({
      _health: {
        ok: false,
        consecutive_errors: 3,
        last_error: 'OperationalError: database is locked',
        last_success_ts: NOW - 300,
      },
      response_time: null, tools: null, files: null,
    });
    await findByText(/Analytics data may be stale/);
    const banner = container.querySelector('.analytics-health-warning');
    expect(banner).toBeTruthy();
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('OperationalError: database is locked');
    expect(banner.textContent).toContain('updated 5m ago');
  });

  it('notes when there was never a successful recompute', async () => {
    const { container, findByText } = renderTab({
      _health: { ok: false, consecutive_errors: 1, last_error: 'boom', last_success_ts: null },
      response_time: null, tools: null, files: null,
    });
    await findByText(/Analytics data may be stale/);
    expect(container.querySelector('.analytics-health-warning').textContent)
      .toContain('no successful update yet');
  });

  it('renders no banner when the thread is healthy', async () => {
    const { container, findByText } = renderTab({
      _health: { ok: true, consecutive_errors: 0, last_error: null, last_success_ts: NOW },
      response_time: null, tools: null, files: null,
    });
    // Wait for load to finish (sections render their empty states).
    await findByText('Response Time Analysis');
    expect(container.querySelector('.analytics-health-warning')).toBeNull();
  });
});
