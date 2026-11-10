import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import BoardScreen, { readScreen } from '../src/components/board/BoardScreen.js';
import { healthSources, healthStatus, ingestionDetailsTable, modeGroupTable, modeTrafficTable, panelStoreHealth, trafficGroupTable } from '../src/components/board/health.js';
import { normalizeHealth, useBoardHealth } from '../src/components/board/useBoardHealth.js';
import { sanitizeLayout } from '../src/components/board/layout.js';
import { boardFixture, machineFixture, NOW } from './fixtures/board.fixture.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
function fixture() {
  const machine = machineFixture();
  return {
    generated_at: Date.now() / 1000, pipeline: machine.pipeline, monitor: machine.monitor,
    store: {
      kind: 'kusto', destination: 'https://example.kusto.windows.net / aictl',
      cluster_url: 'https://example.kusto.windows.net', database: 'aictl', ingestion_mode: 'queued',
      health: { state: 'ok', checked_at: NOW, last_success_at: NOW },
      reads: { total: 25, rate_per_s: 0.25, in_flight: 1, failed: 0, avg_ms: 20, last_success_at: NOW },
      writes: { total: 4, rows: 300, bytes: 2048, rate_per_s: 0.5, rows_per_s: 3, bytes_per_s: 20, in_flight: 0, failed: 0 },
      volume: { rows: 90, bytes: 1000, checked_at: NOW },
      ingestion_capacity: { total: 8, in_use: null, available: null },
    },
  };
}
class FakeES { close() {} }
beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES);
  window.history.replaceState(null, '', '/?screen=health');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('live Health screen', () => {
  it('loads independently of history and reuses the pipeline panels without machine CPU panels', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async url => {
      calls.push(String(url));
      if (String(url) === '/api/board/health') return json(fixture());
      return new Promise(() => {});
    }));
    const { container, findByRole } = render(html`<${BoardScreen}/>`);
    await findByRole('heading', { name: 'aictl Health', level: 1 });
    await waitFor(() => expect(container.querySelector('#p-storeHealth').textContent).toContain('kusto'));
    expect(calls).toEqual(['/api/board/health']);
    for (const id of ['self', 'sources', 'collectors', 'quality']) expect(container.querySelector('#p-' + id)).toBeTruthy();
    for (const id of ['cpu', 'procs', 'daemon', 'agentsT']) expect(container.querySelector('#p-' + id)).toBeNull();
    expect(container.querySelector('a[href="?screen=health"]').getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('.bd-rail').textContent).toContain('Not loaded');
    expect(container.querySelector('.bd-rail').textContent).not.toContain('0 prompts, 0 skills');
    expect(container.querySelector('[aria-label="Filters"]')).toBeNull();
    expect(container.querySelector('#p-storeHealth').textContent).toContain('0.25/s');
    expect(container.querySelector('#p-storeHealth').textContent).toContain('Stored rows (cached)');
    expect(container.querySelector('a[href*="?web=1"]').href).toBe('https://example.kusto.windows.net/aictl?web=1');
    expect(readScreen('?screen=health')).toBe('health');
  });

  it('keeps Health discoverable from the board and returns through section links', async () => {
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url) === '/api/board/health') return json(fixture());
      if (String(url).startsWith('/api/board/machine')) return json(machineFixture());
      if (String(url).startsWith('/api/board?')) return json(boardFixture());
      return json({});
    }));
    window.history.replaceState(null, '', '/');
    const { container } = render(html`<${BoardScreen}/>`);
    await waitFor(() => expect(container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
    expect(container.querySelector('#p-collectors')).toBeNull();
    expect(container.querySelector('#p-daemon')).toBeTruthy();
    fireEvent.click(container.querySelector('a[href="?screen=health"]'));
    await waitFor(() => expect(container.querySelector('#p-collectors')).toBeTruthy());
    expect(window.location.search).toContain('screen=health');
    fireEvent.click(container.querySelector('a[href="#sec-resources"]'));
    await waitFor(() => expect(container.querySelector('#p-cpu')).toBeTruthy());
    expect(container.querySelector('#p-collectors')).toBeNull();
  });

  it('reports an older daemon endpoint as unavailable, not healthy or zero', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'Not found' }, 404)));
    const { container, findByRole } = render(html`<${BoardScreen}/>`);
    const alert = await findByRole('alert');
    expect(alert.textContent).toContain('does not provide /api/board/health');
    expect(container.querySelector('#p-storeHealth').textContent).toContain('unknown');
    expect(container.querySelector('#p-storeHealth').textContent).toContain('n/a');
    expect(container.querySelector('#main-area .bd-good')).toBeNull();
  });

  it('never overlaps reads, pauses while hidden or paused, and aborts on unmount', async () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const pending = [];
    vi.stubGlobal('fetch', vi.fn((url, opts) => new Promise(resolve => pending.push({ resolve, signal: opts.signal }))));
    const Probe = ({ live }) => { useBoardHealth({ enabled: true, live }); return null; };
    const view = render(html`<${Probe} live=${true}/>`);
    await act(async () => { vi.advanceTimersByTime(15000); });
    expect(pending).toHaveLength(1);
    await act(async () => { pending[0].resolve(json(fixture())); });
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    await act(async () => { vi.advanceTimersByTime(15000); });
    expect(pending).toHaveLength(1);
    hidden.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    expect(pending).toHaveLength(2);
    await act(async () => { pending[1].resolve(json(fixture())); });
    view.rerender(html`<${Probe} live=${false}/>`);
    await act(async () => { vi.advanceTimersByTime(15000); });
    expect(pending).toHaveLength(2);
    view.rerender(html`<${Probe} live=${true}/>`);
    expect(pending).toHaveLength(3);
    view.unmount();
    expect(pending[2].signal.aborted).toBe(true);
  });
});

describe('health data and status', () => {
  it('separates local input, DM, engine traffic and cached queryable rows without mixed-mode guesses', () => {
    const health = normalizeHealth(fixture());
    health.store.writes.rows = 999999;
    health.store.otel_sink = { pending_rows: 13, pending_bytes: 4096 };
    health.store.ingestion_traffic = {
      queued: { requests: 4, rows: 300, pending_history_rows: 7, avg_rows: 75, last_rows: 80, groups: [{ id: 'otel', label: 'OTel', rows: 300, requests: 4 }] },
      streaming: { requests: 2, rows: 20, groups: [{ id: 'otel', label: 'OTel', rows: 20, requests: 2 }] },
      inline: { requests: 1, rows: 5, groups: [] },
    };
    const panel = panelStoreHealth({ data: { health }, nowS: NOW });
    const { getByRole, container } = render(html`<${panel.view.C} ...${panel.view.props}/>`);
    const input = getByRole('region', { name: 'Collection / input' });
    const dm = getByRole('region', { name: 'Queued ingestion / DM — not confirmed queryable' });
    const engine = getByRole('region', { name: 'Engine ingestion' });
    const queryable = getByRole('region', { name: 'Queryable store / reads' });
    expect(within(input).getByText('13')).toBeTruthy();
    expect(within(dm).getAllByText('300').length).toBeGreaterThan(0);
    expect(dm.textContent).toContain('Some may already be queryable');
    expect(within(engine).getAllByText('20').length).toBeGreaterThan(0);
    expect(within(queryable).getByText('90')).toBeTruthy();
    expect(within(dm).queryByText('Stored rows (cached)')).toBeNull();
    expect(within(queryable).queryByText('300')).toBeNull();
    expect(container.textContent).not.toContain('999999');
    expect(modeTrafficTable({ writes: { rows: 999999 } }, ['queued']).rows[0].cells.rows.v).toBe('n/a');
    expect(modeGroupTable({ traffic_groups: [{ id: 'mixed', rows: 999999 }] }, ['queued']).rows).toEqual([]);
    expect(within(queryable).getByRole('link', { name: 'Open Kusto Explorer' })).toBeTruthy();
  });

  it('shows configured batching, streaming, client routing and actual acknowledged batch sizes', () => {
    const table = ingestionDetailsTable({
      mode: 'auto', default_mode: 'queued', table_overrides: { otel_logs: 'streaming' },
      policies: { batching: { MaximumBatchingTimeSpan: '00:00:30', MaximumNumberOfItems: 500, MaximumRawDataSizeMB: 128 }, streaming: { IsEnabled: false, HintAllocatedRate: 0.1 } },
      client_limits: { inline_max_bytes: 4096, queued_pending_rows: 300, otel_linger_s: 2 },
      batches: { successful_requests: 20, avg_rows: 12.5, avg_bytes: 1024, last_rows: 8, last_bytes: 512 },
    });
    const value = setting => table.rows.find(row => row.cells.setting.v === setting)?.cells.value.v;
    expect(value('Maximum batching time')).toBe('00:00:30');
    expect(value('Maximum items')).toBe('500');
    expect(value('Maximum raw size (MB)')).toBe(128);
    expect(value('Streaming enabled')).toBe('Disabled');
    expect(value('otel_logs')).toBe('streaming');
    expect(value('Streaming payload limit')).toBe('n/a');
    expect(value('Inline payload limit')).toBe('4 KB');
    expect(value('Average rows per request')).toBe('12.5');
    expect(value('Last request rows')).toBe('8');
    expect(value('Last request bytes')).toBe('512 B');
    expect(ingestionDetailsTable(null).rows).toEqual([]);
  });

  it('renders policy read errors and stale cached values without inventing policy defaults', () => {
    const store = fixture().store;
    store.ingestion_details = {
      policies: { status: 'error', checked_at: NOW - 300, age_s: 300, last_error: 'Policy permission denied', batching: { MaximumNumberOfItems: 200 }, streaming: null },
    };
    const panel = panelStoreHealth({ data: { health: { store } }, nowS: NOW });
    const { container, getByRole } = render(html`<${panel.view.C} ...${panel.view.props}/>`);
    expect(getByRole('alert').textContent).toContain('Policy permission denied');
    expect(container.textContent).toContain('Showing cached policy values');
    expect(container.textContent).toContain('Cache age: 300 s');
    expect(container.textContent).toContain('200');
    const table = ingestionDetailsTable(store.ingestion_details);
    expect(table.rows.find(row => row.cells.setting.v === 'Streaming enabled').cells.value.v).toBe('n/a');
    expect(container.textContent).toContain('not server-merged queued batches');
  });

  it('shows group request, row and byte traffic separately, with membership and missing values', () => {
    const table = trafficGroupTable({ traffic_groups: [
      { id: 'otel', label: 'OTel', tables: ['otel_metrics', 'otel_logs'], ingestion_modes: ['streaming', 'queued'], requests: 4, rate_per_s: 0.25, rows: 300, rows_per_s: 25, bytes: 2048, bytes_per_s: 1024, failed: 1, pending: 6 },
      { id: 'hooks', label: 'Hooks', tables: ['hook_events'], ingestion_modes: ['inline'], requests: null, rows: null, bytes: null, failed: null, pending: null },
    ] });
    const otel = table.rows[0].cells;
    expect(otel.group.title).toContain('otel_logs');
    expect(otel.modes.v).toBe('streaming, queued');
    expect([otel.requestRate.v, otel.rowRate.v, otel.byteRate.v]).toEqual(['0.25/s', '25/s', '1 KB/s']);
    expect([otel.requests.v, otel.rows.v, otel.bytes.v, otel.failed.v, otel.pending.v]).toEqual(['4', '300', '2 KB', '1', '6']);
    const hooks = table.rows[1].cells;
    expect([hooks.requests.v, hooks.rows.v, hooks.bytes.v, hooks.failed.v, hooks.pending.v]).toEqual(['n/a', 'n/a', 'n/a', 'n/a', 'n/a']);
    expect(trafficGroupTable({}).rows).toEqual([]);
  });

  it('keeps missing store measurements null and sources available without session history', () => {
    const health = normalizeHealth(fixture());
    expect(healthSources(health).map(s => s.tool)).toContain('tool-a');
    const empty = normalizeHealth({ pipeline: { ingesters: null }, store: { reads: null } });
    expect(empty.pipeline.ingesters).toEqual([]);
    expect(empty.store.reads).toBeNull();
    expect(empty.store.writes).toBeNull();
    expect(empty.store.ingestion_capacity).toBeNull();
    const panel = panelStoreHealth({ data: { health: empty }, nowS: NOW });
    const { getByRole } = render(html`<${panel.view.C} ...${panel.view.props}/>`);
    expect(getByRole('table', { name: 'Store read queries' }).textContent).toContain('n/a');
    expect(getByRole('table', { name: 'Queued history receipts and ingestion capacity' }).textContent).toContain('Slots available');
    expect(getByRole('table', { name: 'Queued history receipts and ingestion capacity' }).textContent).toContain('n/a');
  });

  it('does not turn disabled sources, stale data, failures or missing data green', () => {
    const current = normalizeHealth({ generated_at: NOW, monitor: { collectors: [{ name: 'cpu', status: 'active' }] }, store: { health: { state: 'ok' } } });
    expect(healthStatus(current, null, NOW).label).toBe('OK');
    expect(healthStatus(current, null, NOW + 120).label).toBe('Needs attention');
    current.monitor.collectors[0].status = 'off';
    expect(healthStatus(current, null, NOW).label).toBe('Needs attention');
    current.store.writes = { failed: 1, last_error: 'Timeout' };
    expect(healthStatus(current, null, NOW).label).toBe('Degraded');
    expect(healthStatus(normalizeHealth({}), null, NOW).cls).not.toBe('good');
  });

  it('moves stored health panels out of Machine while preserving their widths', () => {
    const layout = sanitizeLayout([{ id: 'resources', panels: [{ id: 'self', span: 8, open: false }, { id: 'cpu', span: 6 }] }]);
    expect(layout.find(s => s.id === 'resources').panels.some(p => p.id === 'self')).toBe(false);
    expect(layout.find(s => s.id === 'health').panels.find(p => p.id === 'self')).toMatchObject({ span: 8, open: false });
  });

  it('rejects unsafe cluster links and distinguishes submission from queryability', () => {
    const health = normalizeHealth(fixture());
    health.store.cluster_url = 'javascript:alert(1)';
    const panel = panelStoreHealth({ data: { health }, nowS: NOW });
    expect(panel.view.props.links).toEqual([]);
    expect(panel.stats).toBeUndefined();
    expect(panel.table).toBeUndefined();
    expect(panel.note).toContain('not cluster-wide');
  });
});
