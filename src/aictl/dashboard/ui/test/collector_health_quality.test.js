// Data-quality strip in CollectorHealth (/api/data-quality wiring).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';

vi.mock('../src/api.js', () => ({
  getOtelStatus: vi.fn().mockResolvedValue({ active: false }),
  getSelfStatus: vi.fn().mockResolvedValue(null),
  getDataQuality: vi.fn(),
}));

import * as api from '../src/api.js';
import { SnapContext } from '../src/context.js';
import CollectorHealth from '../src/components/CollectorHealth.js';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const NOW = Math.floor(Date.now() / 1000);
const SNAP = { tools: [], tool_telemetry: [], live_monitor: {} };

function renderPanel() {
  return render(html`
    <${SnapContext.Provider} value=${{ snap: SNAP }}>
      <${CollectorHealth}/>
    </${SnapContext.Provider}>
  `);
}

describe('CollectorHealth data-quality strip', () => {
  it('renders recent quality events with severity chip, source, message and age', async () => {
    api.getDataQuality.mockResolvedValue({
      items: [
        {
          component: 'sink', source: 'aictl', kind: 'sink', status: 'degraded',
          severity: 'error', message: 'Flood protection active — dropping samples',
          updated_at: NOW - 120, count: 3,
        },
        {
          component: 'analytics', source: 'background', kind: 'analytics', status: 'failed',
          severity: 'warning', message: 'Analytics background recompute failed (1x): OperationalError',
          updated_at: NOW - 30, count: 1,
        },
      ],
      summary: { degraded: 1, failed: 1 },
    });
    const { container, findByText } = renderPanel();
    await findByText('Data Quality');
    await findByText('Flood protection active — dropping samples');

    // Severity chips render verbatim (error red / warning orange by style).
    expect(await findByText('error')).toBeInTheDocument();
    expect(await findByText('warning')).toBeInTheDocument();

    // Source column shows component · source.
    expect(await findByText('sink · aictl')).toBeInTheDocument();

    // Age comes from updated_at via fmtAgo.
    expect(container.textContent).toContain('2m ago');

    // Full message is available on hover (title) even when truncated.
    const msg = [...container.querySelectorAll('[title]')]
      .find(el => (el.getAttribute('title') || '').includes('Flood protection active'));
    expect(msg).toBeTruthy();

    // Fetch used the panel's own limit.
    expect(api.getDataQuality).toHaveBeenCalledWith({ limit: 20 });
  });

  it('shows a single muted line when there are no quality events', async () => {
    api.getDataQuality.mockResolvedValue({ items: [], summary: {} });
    const { findByText } = renderPanel();
    await findByText('No data-quality events');
  });

  it('renders nothing for the strip until the first fetch resolves', () => {
    api.getDataQuality.mockReturnValue(new Promise(() => {}));
    const { queryByText } = renderPanel();
    expect(queryByText('Data Quality')).toBeNull();
  });
});
