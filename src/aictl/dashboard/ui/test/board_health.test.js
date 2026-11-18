import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import axe from 'axe-core';
import BoardScreen, { readScreen } from '../src/components/board/BoardScreen.js';
import { HealthOverview, healthSources, healthStatus, healthTrafficGroups, ingestionDetailsTable, modeGroupTable, modeTrafficTable, panelStoreHealth, trafficGroupTable } from '../src/components/board/health.js';
import { stamp } from '../src/components/board/format.js';
import { normalizeHealth, useBoardHealth } from '../src/components/board/useBoardHealth.js';
import { updateTrend } from '../src/components/board/HealthMeasurements.js';
import { freshUi, LS_KEY, sanitizeLayout } from '../src/components/board/layout.js';
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
      volume: { rows: 90, bytes: 1000, checked_at: NOW, status: 'cached' },
      ingestion_capacity: { total: 8, in_use: null, available: null, checked_at: NOW, status: 'cached' },
      ingestion_details: { policies: { status: 'cached', checked_at: NOW } },
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
  it('loads independently of history with one overview and expandable pipeline details, not machine CPU panels', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async url => {
      calls.push(String(url));
      if (String(url) === '/api/live/capabilities') return json({ enabled: false, protocol: 1 });
      if (String(url) === '/api/board/health') return json(fixture());
      return new Promise(() => {});
    }));
    const { container, findByRole, getByRole } = render(html`<${BoardScreen}/>`);
    await findByRole('heading', { name: 'aictl Health', level: 1 });
    await waitFor(() => expect(container.querySelector('#health-overview').textContent).toContain('kusto'));
    expect(container.querySelector('#health-store-details')).toBeNull();
    expect(container.querySelector('#health-overview').textContent).not.toContain('n/a');
    fireEvent.click(getByRole('checkbox', { name: 'Show all metrics' }));
    expect(calls).toEqual(['/api/live/capabilities', '/api/board/health']);
    for (const id of ['self', 'sources', 'collectors', 'quality']) expect(container.querySelector('#p-' + id)).toBeTruthy();
    for (const id of ['cpu', 'procs', 'daemon', 'agentsT']) expect(container.querySelector('#p-' + id)).toBeNull();
    expect(container.querySelector('a[href="?screen=health"]').getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('.bd-rail').textContent).not.toContain('Not loaded');
    expect(container.querySelector('.bd-rail').textContent).not.toContain('0 prompts, 0 skills');
    expect(container.querySelector('[aria-label="Filters"]')).toBeNull();
    expect(container.querySelector('#health-stages').textContent).toContain('0.25/s');
    expect(container.querySelector('#health-stages').textContent).toContain('Stored rows (cached)');
    expect(container.querySelectorAll('#health-stages > section')).toHaveLength(4);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('#health-store-details').open).toBe(false);
    expect(container.querySelector('#health-source-details').open).toBe(false);
    expect(container.querySelector('[aria-label="Health controls"]').textContent).not.toContain('Layout');
    fireEvent.click(container.querySelector('#health-store-details > summary'));
    expect(container.querySelector('#health-store-details').open).toBe(true);
    fireEvent.click(container.querySelector('#health-source-details > summary'));
    expect(container.querySelector('#health-source-details').open).toBe(true);
    expect(container.querySelector('#p-collectors').textContent).toContain('FSEvents not available');
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
    fireEvent.click(await within(container).findByRole('checkbox', { name: 'Show all metrics' }));
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
    expect(container.querySelector('#health-stages')).toBeNull();
    expect(container.querySelector('#health-overview').textContent).toContain('Unavailable');
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

  it('ignores legacy Health panel sizes and visibility without changing board layout or display preferences', async () => {
    const saved = freshUi();
    saved.density = 'comfortable';
    saved.hidden = ['storeHealth', 'collectors'];
    saved.layout.find(section => section.id === 'health').open = false;
    saved.layout.find(section => section.id === 'resources').panels.find(panel => panel.id === 'cpu').span = 8;
    const storage = new Map([[LS_KEY, JSON.stringify(saved)]]);
    vi.stubGlobal('localStorage', {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    });
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url) === '/api/board/health') return json(fixture());
      if (String(url).startsWith('/api/board/machine')) return json(machineFixture());
      if (String(url).startsWith('/api/board?')) return json(boardFixture());
      return json({});
    }));
    const { container } = render(html`<${BoardScreen}/>`);
    fireEvent.click(await within(container).findByRole('checkbox', { name: 'Show all metrics' }));
    await waitFor(() => expect(container.querySelector('#p-collectors')).toBeTruthy());
    expect(container.querySelector('.bd-app').dataset.density).toBe('comfortable');
    expect(container.querySelector('.bd-rail.bd-mini')).toBeNull();
    expect(container.querySelectorAll('#health-stages > section')).toHaveLength(4);
    expect(container.querySelector('#p-collectors')).toBeTruthy();
    expect(JSON.parse(storage.get(LS_KEY))).toEqual(saved);
    fireEvent.click(container.querySelector('[aria-label="Open the command palette"]'));
    const search = container.querySelector('[aria-label="Search commands"]');
    fireEvent.input(search, { target: { value: 'Reset layout' } });
    expect(container.querySelectorAll('[role="listbox"] [role="option"]')).toHaveLength(0);
    fireEvent.keyDown(search, { key: 'Escape' });
    fireEvent.click(container.querySelector('a[href="#sec-resources"]'));
    await waitFor(() => expect(container.querySelector('#p-cpu')).toBeTruthy());
    expect(container.querySelector('#p-cpu').style.gridColumn).toBe('span 8');
    expect(container.querySelector('#health-overview')).toBeNull();
  });

  it('passes the non-visual accessibility rules with closed and expanded details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(fixture())));
    const { container } = render(html`<${BoardScreen}/>`);
    await waitFor(() => expect(container.querySelector('.bd-healthledger')?.textContent).toContain('90'));
    const rules = { 'color-contrast': { enabled: false }, region: { enabled: false }, 'landmark-unique': { enabled: false }, 'scrollable-region-focusable': { enabled: false } };
    expect((await axe.run(container, { rules })).violations.map(item => item.id)).toEqual([]);
    fireEvent.click(within(container).getByRole('checkbox', { name: 'Show all metrics' }));
    fireEvent.click(container.querySelector('#health-store-details > summary'));
    fireEvent.click(container.querySelector('#health-source-details > summary'));
    expect((await axe.run(container, { rules })).violations.map(item => item.id)).toEqual([]);
  }, 30000);
});

describe('health data and status', () => {
  it('keeps the problem fold and active-writes disclosure stable across live updates', () => {
    const prefs = new Map();
    vi.stubGlobal('localStorage', { getItem: k => prefs.get(k), setItem: (k, v) => prefs.set(k, v) });
    const health = normalizeHealth(fixture());
    const project = () => html`<${HealthOverview} health=${health} status=${healthStatus(health, null, NOW)} nowS=${NOW}/>`;
    const view = render(project());
    fireEvent.click(view.getByRole('button', { name: 'Hide problems' }));
    const work = view.container.querySelector('.bd-healthwork');
    fireEvent.click(work.querySelector('summary'));
    health.pipeline.self.writes = [{ name: 'Import', age_s: 30 }, { name: 'Flush', age_s: 3 }];
    view.rerender(project());
    expect(view.getByRole('button', { name: 'Show problems' })).toHaveAttribute('aria-expanded', 'false');
    expect(view.container.querySelector('#health-problem-body')).not.toBeVisible();
    expect(work.open).toBe(true);
    expect(work).toHaveTextContent('2 running');
    health.pipeline.self.writes = [];
    view.rerender(project());
    expect(view.container.querySelector('.bd-healthwork')).toBe(work);
    expect(work).toHaveTextContent('No writes in progress');
    view.unmount();
    const next = render(project());
    expect(next.getByRole('button', { name: 'Show problems' })).toBeVisible();
  });

  it('bounds measured trend history and resets it for a new process', () => {
    const h = normalizeHealth(fixture());
    let history = { id: null, points: [] };
    for (let t = 0; t < 1800; t++) history = updateTrend(history, { ...h, generated_at: t });
    expect(history.points).toHaveLength(90);
    expect(history.points.at(-1).streaming).toBeUndefined();
    h.pipeline.self.pid = 9999;
    expect(updateTrend(history, { ...h, generated_at: 1800 }).points).toHaveLength(1);
  });

  it('searches and sorts actual table metadata locally, including a deliberately searched empty table', () => {
    const h = normalizeHealth(fixture());
    h.store.table_inventory = { status: 'cached', checked_at: NOW, tables: [
      { name: 'trace_data', rows: 71, extent_bytes: 100 }, { name: 'sample_data', rows: 2, extent_bytes: 800 }, { name: 'empty_table', rows: 0 },
    ], scope: 'Physical extent summary' };
    const view = render(html`<${HealthOverview} health=${h} status=${healthStatus(h, null, NOW)} nowS=${NOW}/>`);
    const table = view.getByRole('table', { name: 'Measured tables' });
    expect(table.querySelector('tbody th').textContent).toBe('trace_data');
    fireEvent.change(view.getByLabelText('Order by'), { target: { value: 'extent_bytes' } });
    expect(table.querySelector('tbody th').textContent).toBe('sample_data');
    fireEvent.input(view.getByLabelText('Find a table'), { target: { value: 'empty_' } });
    expect(table.querySelector('tbody th').textContent).toBe('empty_table');
  });
  it('shows only nonzero measurements by default, ordered by bytes, and restores all raw counters on demand', () => {
    const health = normalizeHealth(fixture());
    health.store.ingestion_traffic = {
      streaming: { rows_per_s: 15, bytes_per_s: 4096, failed: 0, groups: [
        { id: 'hooks', rows_per_s: 0, bytes_per_s: 0, failed: 0 },
        { id: 'otel', rows_per_s: 15, bytes_per_s: 4096, failed: 0 },
      ] },
      inline: { groups: [{ id: 'monitoring', rows_per_s: 0.001, bytes_per_s: 12, pending: null }] },
      queued: { groups: [{ id: 'files-config', rows_per_s: 0, bytes_per_s: 0, pending: 9 }] },
    };
    const view = render(html`<${HealthOverview} health=${health} status=${healthStatus(health, null, NOW)} nowS=${NOW}/>`);
    const table = view.getByRole('table', { name: 'Active destination metrics' });
    expect([...table.querySelectorAll('tbody th')].map(e => e.textContent)).toEqual(['OTel', 'Monitoring', 'Files / configuration']);
    expect(table.textContent).toContain('<0.01/s');
    expect(table.textContent).toContain('9 pending');
    expect(table.textContent).not.toContain('Failures since start');
    expect(table.textContent).not.toContain('n/a');
    const toggle = view.getByRole('checkbox', { name: 'Show all metrics' });
    fireEvent.click(toggle);
    expect(view.getByRole('table', { name: 'Destination traffic by physical ingestion mode' }).textContent).toContain('0/s');
    fireEvent.click(toggle);
    expect(view.queryByRole('table', { name: 'Destination traffic by physical ingestion mode' })).toBeNull();
  });

  it('preserves a measured capacity warning and distinguishes idle traffic from unavailable measurements', () => {
    const health = normalizeHealth(fixture());
    health.store.ingestion_capacity = { checked_at: NOW, status: 'cached', total: 8, in_use: 8, available: 0 };
    const project = () => html`<${HealthOverview} health=${health} status=${healthStatus(health, null, NOW)} nowS=${NOW}/>`;
    const view = render(project());
    expect(view.getByRole('complementary').textContent).toContain('No ingestion slots were available');
    expect(view.getByRole('region', { name: 'Destination activity' }).textContent).toContain('No per-mode traffic measurements');
    health.store.ingestion_capacity.available = null;
    health.store.ingestion_traffic = { streaming: { groups: [{ id: 'otel', rows_per_s: 0, bytes_per_s: 0 }] } };
    view.rerender(project());
    expect(view.getByRole('complementary').textContent).not.toContain('No ingestion slots were available');
    expect(view.getByRole('region', { name: 'Destination activity' }).textContent).toContain('No nonzero traffic');
  });

  it('separates local input, DM, engine traffic and cached queryable rows without mixed-mode guesses', () => {
    const health = normalizeHealth(fixture());
    health.store.writes.rows = 999999;
    health.store.otel_sink = { pending_rows: 13, pending_bytes: 4096 };
    health.store.ingestion_traffic = {
      queued: { requests: 4, rows: 300, rows_per_s: 30, pending_history_rows: 7, avg_rows: 75, last_rows: 80, groups: [{ id: 'otel', label: 'OTel', rows: 300, requests: 4 }] },
      streaming: { requests: 2, rows: 20, rows_per_s: 2, groups: [{ id: 'otel', label: 'OTel', rows: 20, requests: 2 }] },
      inline: { requests: 1, rows: 5, groups: [] },
    };
    const panel = panelStoreHealth({ data: { health }, nowS: NOW });
    const { getByRole, container } = render(html`<${panel.view.C} ...${panel.view.props}/>`);
    const input = getByRole('region', { name: 'Collection / input' });
    const dm = getByRole('region', { name: 'Queued ingestion / DM — not confirmed queryable' });
    const engine = getByRole('region', { name: 'Engine ingestion' });
    const queryable = getByRole('region', { name: 'Queryable store / reads' });
    expect(within(input).getByText('13')).toBeTruthy();
    expect(within(dm).getByText('30/s')).toBeTruthy();
    expect(within(dm).getByText('7')).toBeTruthy();
    expect(dm.textContent).toContain('Some may already be queryable');
    expect(within(engine).getByText('2/s')).toBeTruthy();
    expect(container.querySelector('#health-store-details').textContent).toContain('300');
    expect(container.querySelector('#health-store-details').textContent).toContain('20');
    expect(within(queryable).getByText('90')).toBeTruthy();
    expect(within(dm).queryByText('Stored rows (cached)')).toBeNull();
    expect(within(queryable).queryByText('300')).toBeNull();
    expect(container.textContent).not.toContain('999999');
    expect(modeTrafficTable({ writes: { rows: 999999 } }, ['queued']).rows[0].cells.rows.v).toBe('n/a');
    expect(modeGroupTable({ traffic_groups: [{ id: 'mixed', rows: 999999 }] }, ['queued']).rows).toEqual([]);
    expect(container.querySelector('a[href="https://example.kusto.windows.net/aictl?web=1"]')).toBeTruthy();
  });

  it('keeps six destination groups in one matrix, preserves mode-specific units, and never substitutes mixed totals', () => {
    const health = normalizeHealth(fixture());
    health.store.traffic_groups = [{ id: 'hooks', rows_per_s: 9999, pending: 9999, failed: 9999 }];
    health.store.ingestion_traffic = {
      queued: { groups: [{ id: 'otel', rows_per_s: 12.5, bytes_per_s: 2048, pending: 7, failed: 2, tables: ['OTELLogs'] }] },
      streaming: { groups: [{ id: 'otel', rows_per_s: 0, bytes_per_s: 0, pending: null, failed: 0 }] },
      inline: { groups: [{ id: 'otel', rows_per_s: 3, bytes_per_s: 512, pending: null, failed: 1 }] },
    };
    const { container, getByRole } = render(html`<${HealthOverview} health=${health} status=${healthStatus(health, null, NOW)} nowS=${NOW}/>`);
    fireEvent.click(getByRole('checkbox', { name: 'Show all metrics' }));
    const matrix = getByRole('table', { name: 'Destination traffic by physical ingestion mode' });
    expect(matrix.querySelectorAll('tbody tr')).toHaveLength(6);
    const otel = matrix.querySelector('[data-group="otel"]');
    expect(otel.querySelector('[data-mode="queued"]').textContent).toBe('12.5/s2 KB/s');
    expect(otel.querySelector('[data-mode="streaming"]').textContent).toBe('0/s0 B/s');
    expect(otel.querySelector('[data-mode="inline"]').textContent).toBe('3/s512 B/s');
    expect(otel.textContent).toContain('7 / n/a / n/a');
    expect(otel.textContent).toContain('2 / 0 / 1');
    expect(matrix.querySelector('[data-group="hooks"]').textContent).toContain('n/a');
    expect(matrix.textContent).not.toContain('9999');
    expect(healthTrafficGroups(health.store).map(group => group.id)).toEqual(['otel', 'hooks', 'live-session', 'monitoring', 'files-config', 'other']);
    fireEvent.click(container.querySelector('#health-store-details > summary'));
    expect(container.querySelector('#health-store-details').open).toBe(true);
    expect(container.querySelector('.bd-healthmembers').textContent).toContain('queued: OTELLogs');
  });

  it('shows top issues and source, collector and ingester summaries beside traffic with complete disclosures', () => {
    const health = normalizeHealth(fixture());
    health.store.volume.last_error = 'Count refresh failed';
    health.pipeline.sink.flood = true;
    const status = healthStatus(health, null, NOW);
    const { container, getByRole } = render(html`<${HealthOverview} health=${health} status=${status} nowS=${NOW}/>`);
    const diagnostics = getByRole('complementary', { name: 'Collection health and issues' });
    expect(diagnostics.querySelectorAll('.bd-healthissuebody > .bd-healthissues > li')).toHaveLength(3);
    const inventory = getByRole('region', { name: 'Collection status' });
    expect(inventory.textContent).toContain('Sources');
    expect(inventory.textContent).toContain('Collectors');
    expect(inventory.textContent).toContain('Ingesters');
    const issues = container.querySelector('#health-all-issues');
    expect(issues.open).toBe(false);
    fireEvent.click(issues.querySelector('summary'));
    expect(issues.open).toBe(true);
    expect(issues.querySelectorAll('li')).toHaveLength(status.issues.length - 3);
    fireEvent.click(inventory.querySelector('.bd-healthstatus summary'));
    expect(inventory.querySelector('.bd-healthstatus').open).toBe(true);
    expect(inventory.textContent).toContain('overloaded');
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
    expect(getByRole('table', { name: 'Client requests since daemon start' }).textContent).toContain('n/a');
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

  it('distinguishes a first poll, a routine poll, and an optional missing source from current failures', () => {
    const health = normalizeHealth(fixture());
    health.generated_at = NOW;
    health.monitor.collectors = [{ name: 'files', status: 'active' }];
    const cursor = { name: 'cursor-conversations', status: 'off', last_ok: null };
    const poll = { name: 'transcript-usage', status: 'running', poll_in_flight: true, last_poll: NOW, last_ok: null };
    health.pipeline.ingesters = [cursor, poll];
    health.pipeline.data_quality = [{ component: 'ingester:cursor-conversations', status: 'source_missing', severity: 'warning' }];
    health.pipeline.self.writes = [{ name: 'transcript-backfill', age_s: 7200 }];
    let status = healthStatus(health, null, NOW);
    expect(status.issues).toEqual([]);
    expect(status.label).not.toBe('OK');
    const view = render(html`<${HealthOverview} health=${health} status=${status} nowS=${NOW}/>`);
    const inventory = view.getByRole('region', { name: 'Collection status' }).textContent;
    expect(inventory).toContain('1 off');
    expect(inventory).toContain('1 running');
    expect(view.getByRole('complementary').textContent).toContain('First poll in progress');
    poll.last_ok = NOW - 60;
    expect(healthStatus(health, null, NOW).label).toBe('OK');
    health.monitor.collectors[0] = { name: 'network', status: 'degraded', detail: 'ETW unavailable; polling' };
    status = healthStatus(health, null, NOW);
    expect(status.issues).toEqual(['network: degraded — ETW unavailable; polling']);
    cursor.status = 'failed';
    cursor.error = 'permission denied';
    expect(healthStatus(health, null, NOW).issues[0]).toContain('permission denied');
    cursor.status = 'off';
    health.pipeline.data_quality[0] = { component: 'ingester:cursor-conversations', status: 'query_failed', severity: 'error', text: 'Read failed' };
    expect(healthStatus(health, null, NOW).issues).toContain('ingester:cursor-conversations: Read failed');
  });

  it('keeps receiver evidence separate from local config, tool errors and transcript requests', () => {
    const health = normalizeHealth(fixture());
    health.generated_at = NOW;
    health.monitor.collectors = [{ name: 'network', status: 'active' }];
    health.pipeline.ingesters = [];
    health.pipeline.data_quality = [];
    const id = 'copilot-cli';
    health.pipeline.otel_setup = { [id]: { status: 'missing', text: 'Copilot CLI sends no OTel to aictl.' } };
    health.pipeline.otel_receiver = { active: true, errors: 4, dropped: 2, api_errors_total: 5, api_calls_total: 0, by_tool: { [id]: { last_at: NOW - 10, metrics: 30, events: 0 } } };
    health.pipeline.freshness = [{ tool: id, last_seen: NOW - 7200, errors: 1, last_error: 'Slow powershell' }];
    const status = healthStatus(health, null, NOW);
    expect(status.label).toBe('OK');
    const view = render(html`<${HealthOverview} health=${health} status=${status} nowS=${NOW}/>`);
    const sources = view.getByRole('region', { name: 'Collection status' }).querySelector('.bd-healthstatus').textContent;
    expect(sources).toContain('Local OTel config: missing');
    expect(sources).toContain('receiver saw this tool');
    expect(sources).toContain('Tool/session errors: 1 — Slow powershell');
    expect(sources).not.toContain('sends no OTel');
    health.pipeline.otel_receiver.by_tool[id].last_at = NOW - 301;
    expect(healthStatus(health, null, NOW).issues).toEqual([expect.stringContaining('Local OTel config: missing')]);
  });

  it('keeps lifetime counters after recovery without clearing a different operation’s current error', () => {
    const health = normalizeHealth({ generated_at: NOW, pipeline: { sink: { flood: false, dropped: 250 } },
      monitor: { collectors: [{ name: 'files', status: 'active' }] },
      store: { health: { state: 'ok', last_success_at: NOW }, reads: { failed: 3, last_error: 'read timeout', last_error_at: NOW - 30, last_success_at: NOW } } });
    const status = healthStatus(health, null, NOW);
    expect(status.label).toBe('OK');
    const view = render(html`<${HealthOverview} health=${health} status=${status} nowS=${NOW}/>`);
    expect(view.container.querySelector('.bd-crit')).toBeNull();
    fireEvent.click(view.getByRole('checkbox', { name: 'Show all metrics' }));
    expect(view.getByRole('table', { name: 'Client requests since daemon start' }).textContent).toContain('read timeout');
    expect(view.container.querySelector('[data-stage="collection"]').textContent).toContain('Drops since start250');
    health.store.writes = { failed: 1, last_success_at: NOW - 50, last_error_at: NOW - 20, last_error: 'write denied' };
    expect(healthStatus(health, null, NOW)).toMatchObject({ label: 'Degraded', issues: ['Write requests: write denied'] });
    health.pipeline.sink.flood = true;
    expect(healthStatus(health, null, NOW).issues.join(' ')).toContain('dropping collector samples');
  });

  it('deduplicates the live collector warning without hiding an independent or more severe quality failure', () => {
    const h = normalizeHealth(fixture());
    const detail = 'Using weighted fallback sampling';
    h.monitor.collectors = [{ name: 'network:windows-etw', status: 'degraded', detail }];
    const q = { component: 'collector:network:windows-etw', status: 'degraded', severity: 'warning', text: detail };
    h.pipeline.data_quality = [q];
    expect(healthStatus(h, null, NOW).issues.filter(s => s.includes(detail))).toEqual([`network:windows-etw: degraded — ${detail}`]);
    h.pipeline.data_quality = [{ ...q, severity: 'error' }];
    expect(healthStatus(h, null, NOW).cls).toBe('crit');
    h.pipeline.data_quality = [{ ...q, text: 'Separate collection problem' }];
    expect(healthStatus(h, null, NOW).issues).toContain('collector:network:windows-etw: Separate collection problem');
  });

  it('keeps active sources in the overview and reveals never-observed sources in full diagnostics', () => {
    const h = normalizeHealth(fixture());
    h.monitor.per_tool = [];
    h.pipeline.freshness = [{ tool: 'using', last_seen: NOW }, { tool: 'unused', last_seen: null }];
    const view = render(html`<${HealthOverview} health=${h} status=${healthStatus(h, null, NOW)} nowS=${NOW}/>`);
    const inventory = view.getByRole('region', { name: 'Collection status' });
    fireEvent.click(inventory.querySelector('summary'));
    expect(within(inventory).getByText('using', { exact: true })).toBeVisible();
    expect(within(inventory).queryByText('unused', { exact: true })).toBeNull();
    expect(inventory.textContent).toContain('1 inactive or unobserved');
    fireEvent.click(view.getByRole('checkbox', { name: 'Show all metrics' }));
    fireEvent.click(view.getByRole('complementary').querySelector('summary.bd-healthstatus, .bd-healthstatus summary'));
    expect(within(view.getByRole('complementary')).getByText('unused', { exact: true })).toBeVisible();
  });

  it('retains the successful scan interval on error and distinguishes unknown cluster slots from zero', () => {
    const health = normalizeHealth(fixture());
    const started = NOW - 3700, checked = NOW - 3600, attempted = NOW - 60;
    health.store.volume = { status: 'stale', rows: 8242, tables: { requests: 8200 }, bytes: null, started_at: started, checked_at: checked, attempted_at: attempted, last_error: 'Scan failed' };
    health.store.ingestion_capacity = { status: 'cached', total: 8, in_use: 0, available: null, checked_at: checked, scope: 'cluster' };
    const project = () => html`<${HealthOverview} health=${health} status=${healthStatus(health, null, NOW)} nowS=${NOW}/>`;
    const view = render(project());
    fireEvent.click(view.getByRole('checkbox', { name: 'Show all metrics' }));
    const volumeText = () => view.getByRole('table', { name: 'Queryable store — cached stored volume and client health' }).textContent;
    expect(volumeText()).toContain('Last successful scan started' + stamp(started, true));
    expect(volumeText()).toContain('Last successful scan finished' + stamp(checked, true));
    expect(volumeText()).toContain('Last scan attempted' + stamp(attempted, true));
    expect(volumeText()).toContain('Volume read errorScan failed');
    expect(volumeText()).toContain('Stored request rows (cached)8.2 k');
    expect(view.container.querySelector('[data-stage="store"]').textContent).toContain('Stored rows (cached)8.2 k');
    expect(view.container.querySelector('[data-stage="queued"]').textContent).toContain('0 in use · n/a available · 8 total');
    health.store.volume = { status: 'pending', rows: 0, checked_at: null };
    health.store.ingestion_capacity = { status: 'error', total: null, checked_at: null, last_error: 'Capacity permission denied' };
    view.rerender(project());
    expect(volumeText()).toContain('Stored rows (cached)n/a');
    expect(volumeText()).toContain('Volume statuspending');
    expect(healthStatus(health, null, NOW).issues.join(' ')).toContain('Capacity permission denied');
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
