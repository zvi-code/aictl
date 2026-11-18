import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import BoardScreen from '../src/components/board/BoardScreen.js';
import TranscriptTab from '../src/components/board/agent/TranscriptTab.js';
import Drawer from '../src/components/board/Drawer.js';
import { useBoardData } from '../src/components/board/useBoardData.js';
import { LiveProvider } from '../src/live/context.js';
import { createLiveController } from '../src/live/controller.js';
import { canonicalScope } from '../src/live/model.js';
import { boardFixture, machineFixture, NOW } from './fixtures/board.fixture.js';
import { ControlledEventSource, liveBootstrap, liveCapabilities, liveEntity, liveEnvelope, liveField } from './fixtures/live.fixture.js';

const json = body => new Response(JSON.stringify(body), { status: 200 });
const queryOf = source => canonicalScope(new URL(source.url, 'http://x').search.slice(1));
const runtimeAgent = { id: 'native-1', session_id: 'native-1', tool: 'copilot', title: 'Live native agent', running: true, status: 'running', native_activity: 'working', cpu_percent: 5, mem_mb: 12, pids: [10] };
const runtimeStatus = liveEntity('source.status', 'collector', { producer: 'runtime-collector', ready: true, process_count: 1, observed_at: NOW });
const runtime = () => [
  liveEntity('runtime.agent', 'native-1', runtimeAgent),
  liveEntity('runtime.machine', 'local', { generated_at: NOW, cpu_per_core: [5] }),
  runtimeStatus,
];

function controller(capabilities = liveCapabilities) {
  return createLiveController({ getCapabilities: async () => capabilities, EventSourceClass: ControlledEventSource });
}
async function sourceOf() {
  await waitFor(() => expect(ControlledEventSource.instances.length).toBeGreaterThan(0));
  return ControlledEventSource.instances.at(-1);
}
async function bootstrap(source, entities) {
  await act(async () => {
    source.open();
    source.emit('bootstrap', liveBootstrap(entities, queryOf(source)));
  });
}
const historyStatus = (query, ready, revision = 1, extra = {}) => liveEntity('source.status', 'history:scope', { scope: query, component: 'history', topic: 'history.board', ready, pending: !ready, error: null, ...extra }, revision);

beforeEach(() => {
  ControlledEventSource.instances = [];
  vi.stubGlobal('EventSource', ControlledEventSource);
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Kusto incremental board integration', () => {
  it.each([
    ['board', 'history.board'],
    ['health', 'runtime.health'],
    ['settings', 'configuration.file'],
  ])('keeps initially paused %s subscribed until its requested baseline arrives without a board GET', async (screen, topic) => {
    window.history.replaceState(null, '', '/?screen=' + screen);
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async url => { calls.push(String(url)); return json({ files: [] }); }));
    const client = controller();
    const view = render(html`<${BoardScreen} liveController=${client}/>`);
    const source = await sourceOf();
    fireEvent.click(view.getByRole('button', { name: 'Live' }));
    const query = queryOf(source);
    await bootstrap(source, screen === 'board' ? [historyStatus(query, false)] : []);
    expect(source.closed).toBe(false);
    const upserts = screen === 'board'
      ? [...runtime(), liveField('kpis', { tokens: 42 }, query, 2), historyStatus(query, true, 2)]
      : screen === 'health'
        ? [liveEntity(topic, 'local', { generated_at: NOW, store: { kind: 'kusto', health: { state: 'ok' } } }, 2)]
        : [liveEntity(topic, 'current', { configured_only: true, tool_configs: [] }, 2)];
    await act(async () => source.emit('change', liveEnvelope(2, { upserts }, query)));
    expect(source.closed).toBe(true);
    expect(client.getState().topics.get(topic)?.size).toBeGreaterThan(0);
    expect(calls.some(url => url.startsWith('/api/board?'))).toBe(false);
    expect(ControlledEventSource.instances).toHaveLength(1);
  });

  it('shows runtime before slow history and never fetches a full board on live messages', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async url => { calls.push(String(url)); return json({}); }));
    const view = render(html`<${BoardScreen} liveController=${controller()}/>`);
    const source = await sourceOf();
    const query = queryOf(source);
    await bootstrap(source, [...runtime(), historyStatus(query, false)]);
    await waitFor(() => expect(view.container.querySelector('#p-agentsT tbody').textContent).toContain('Live native agent'));
    expect(view.container.textContent).toContain('missing history is not zero usage');
    const tokens = () => [...view.container.querySelectorAll('.bd-kpi')].find(kpi => kpi.querySelector('.bd-l')?.textContent === 'Tokens').querySelector('.bd-v').textContent;
    expect(tokens()).toBe('n/a');
    await act(async () => source.emit('change', liveEnvelope(2, { upserts: [
      liveField('kpis', { tokens: 10, cost_usd: 0.1 }, query, 2),
      liveField('agents', [], query, 2, { collection: true }),
      liveField('agents', { id: 'native-1', title: 'Queryable agent', status: 'unknown', input: 10, cost_usd: 0.1, activity: [1, 2] }, query, 2, { key: 'native-1' }),
      historyStatus(query, true, 2),
      liveEntity('runtime.output', 'out', { session_id: 'native-1', entry_id: 'out', order: 1, text: 'Not a historical token total', tokens: 900 }, 2),
    ] }, query)));
    await waitFor(() => expect(tokens()).toBe('10'));
    await act(async () => source.emit('change', liveEnvelope(3, { upserts: [
      liveEntity('runtime.agent', 'native-1', { ...runtimeAgent, cpu_percent: 9, input: 999, cost_usd: 999 }, 3),
      liveEntity('runtime.output', 'out-2', { session_id: 'native-1', entry_id: 'out-2', order: 2, text: 'Still separate' }, 3),
    ] }, query)));
    expect(tokens()).toBe('10');
    expect(calls.some(url => url.startsWith('/api/board?'))).toBe(false);
    expect(calls.some(url => url.startsWith('/api/board/machine'))).toBe(false);
    expect(calls.some(url => url.startsWith('/api/hooks-status') || url.startsWith('/api/otel-status'))).toBe(false);
    expect(ControlledEventSource.instances.filter(instance => !instance.closed)).toHaveLength(1);
  });

  it('requests a fresh subscription baseline on filter changes instead of a notification-triggered GET', async () => {
    const fetch = vi.fn(async () => json({}));
    vi.stubGlobal('fetch', fetch);
    const view = render(html`<${BoardScreen} liveController=${controller()}/>`);
    const source = await sourceOf();
    await bootstrap(source, runtime());
    fireEvent.click(view.getByRole('button', { name: '7 d' }));
    await waitFor(() => expect(ControlledEventSource.instances.length).toBe(2));
    const next = ControlledEventSource.instances.at(-1);
    expect(source.closed).toBe(true);
    expect(new URL(next.url, 'http://x').searchParams.has('cursor')).toBe(false);
    expect(queryOf(next)).not.toBe(queryOf(source));
    await bootstrap(next, [...runtime(), liveField('kpis', { tokens: 42 }, queryOf(next)), historyStatus(queryOf(next), true)]);
    await waitFor(() => expect(view.container.querySelector('.bd-kpis').textContent).toContain('42'));
    expect(fetch.mock.calls.some(([url]) => String(url).startsWith('/api/board?'))).toBe(false);
  });

  it('keeps the last queryable values visible and marks source and stream failures explicitly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({})));
    const view = render(html`<${BoardScreen} liveController=${controller()}/>`);
    const source = await sourceOf();
    const query = queryOf(source);
    await bootstrap(source, [...runtime(), liveField('kpis', { tokens: 42 }, query), historyStatus(query, true)]);
    await act(async () => source.emit('change', liveEnvelope(2, { upserts: [
      historyStatus(query, true, 2, { component: 'history', stale: true, reason: 'Kusto query denied' }),
    ] }, query)));
    await view.findByText(/history: Kusto query denied/);
    expect(view.container.querySelector('.bd-kpis').textContent).toContain('42');
    expect(view.container.textContent).not.toContain('Loading the board');
    await act(async () => source.fail());
    await view.findByText(/Live subscription disconnected\. Showing the last received values/);
    expect(view.container.querySelector('.bd-kpis').textContent).toContain('42');
  });

  it('does not apply an old filter response to the selected-time whole-range chart baseline', async () => {
    const pending = [];
    vi.stubGlobal('fetch', vi.fn((url, opts) => String(url).startsWith('/api/board?')
      ? new Promise(resolve => pending.push({ resolve, signal: opts.signal }))
      : Promise.resolve(json({}))));
    const client = controller();
    const wrapper = ({ children }) => html`<${LiveProvider} controller=${client}>${children}<//>`;
    const filters = { range: { id: 'custom', since: 100, until: 200 }, sel: { since: 120, until: 130 }, project: 'all', model: 'all', status: 'all', q: '' };
    const view = renderHook(({ filters: current }) => useBoardData({ filters: current, tools: null, live: true }), { initialProps: { filters }, wrapper });
    await waitFor(() => expect(pending).toHaveLength(1));
    view.rerender({ filters: { ...filters, project: 'two' } });
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0].signal.aborted).toBe(true);
    await act(async () => pending[0].resolve(json(boardFixture({ series: { tokens: { input: [1] } } }))));
    expect(view.result.current.chartSeries).toEqual({});
    await act(async () => pending[1].resolve(json(boardFixture({ series: { tokens: { input: [9] } } }))));
    await waitFor(() => expect(view.result.current.chartSeries.tokens.input).toEqual([9]));
    const source = ControlledEventSource.instances.at(-1);
    await bootstrap(source, runtime());
    await act(async () => source.emit('change', liveEnvelope(2, { upserts: [
      liveEntity('runtime.output', 'out', { session_id: 'native-1', entry_id: 'out', order: 1, text: 'live' }, 2),
    ] }, queryOf(source))));
    expect(pending).toHaveLength(2);
  });

  it('reports an on-demand history failure without delaying or replacing live runtime fields', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"context unavailable"}', { status: 503 })));
    const view = render(html`<${BoardScreen} liveController=${controller()}/>`);
    const source = await sourceOf();
    await bootstrap(source, runtime());
    await view.findByText(/Could not read on-demand historical data/);
    expect(view.container.querySelector('#p-agentsT tbody').textContent).toContain('Live native agent');
  });

  it('settles unavailable history without a permanent loading state or stopping runtime updates', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({})));
    const view = render(html`<${BoardScreen} liveController=${controller()}/>`);
    const source = await sourceOf();
    const query = queryOf(source);
    await bootstrap(source, [...runtime(), historyStatus(query, false, 1, {
      pending: false, stale: true, incomplete: true, retryable: false,
      reason: 'unresolved_observations',
      error: 'Canonical results are incomplete; observations are retained.',
      unresolved_families: ['requests'],
    })]);
    await waitFor(() => expect(view.container.textContent).not.toContain('Loading the board'));
    expect(view.container.textContent).toContain('observations are retained');
    expect(view.container.textContent).not.toContain('Queryable history is not ready');
    expect(view.container.querySelector('#p-agentsT tbody').textContent).toContain('Live native agent');
    expect(source.closed).toBe(false);
    await act(async () => source.emit('change', liveEnvelope(2, { upserts: [
      liveEntity('runtime.agent', 'native-1', { ...runtimeAgent, title: 'Still receiving runtime updates' }, 2),
    ] }, query)));
    await waitFor(() => expect(view.container.querySelector('#p-agentsT tbody').textContent).toContain('Still receiving runtime updates'));
    expect(view.container.querySelector('.bd-kpis').textContent).toContain('n/a');
    expect(ControlledEventSource.instances).toHaveLength(1);
  });

  it('keeps SQLite on its existing stream-triggered REST behavior', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async url => {
      calls.push(String(url));
      if (String(url).startsWith('/api/board/machine')) return json(machineFixture());
      if (String(url).startsWith('/api/board?')) return json(boardFixture());
      return json({});
    }));
    const view = render(html`<${BoardScreen} liveController=${controller({ ...liveCapabilities, enabled: false })}/>`);
    await waitFor(() => expect(view.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
    const source = ControlledEventSource.instances.at(-1);
    expect(source.url).toBe('/api/stream');
    const before = calls.filter(url => url.startsWith('/api/board?')).length;
    await act(async () => { source.open(); source.onmessage({ data: '{}' }); });
    expect(calls.filter(url => url.startsWith('/api/board?'))).toHaveLength(before + 1);
    expect(ControlledEventSource.instances).toHaveLength(1);
  });

  it('shares Health operational data without history requests and preserves DM/queryable disclosures', async () => {
    window.history.replaceState(null, '', '/?screen=health');
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async url => { calls.push(String(url)); return json({}); }));
    const view = render(html`<${BoardScreen} liveController=${controller()}/>`);
    const source = await sourceOf();
    expect(new URL(source.url, 'http://x').searchParams.get('history')).toBe('0');
    await bootstrap(source, [liveEntity('runtime.health', 'local', {
      ...machineFixture(), generated_at: Date.now() / 1000,
      store: {
        kind: 'kusto', database: 'aictl', health: { state: 'ok' },
        ingestion_traffic: { queued: { rows: 900, pending_history_rows: 8, rows_per_s: 9 } },
        volume: { rows: 7, checked_at: NOW },
      },
    }), liveEntity('runtime.health', 'table_inventory', { inventory: {
      scope: 'Physical extent summary', status: 'cached', checked_at: NOW, tables: [{ name: 'sessions', rows: 73 }],
    } })]);
    expect(await view.findByRole('table', { name: 'Measured tables' })).toHaveTextContent('sessions73');
    const allMetrics = await view.findByRole('checkbox', { name: 'Show all metrics' });
    fireEvent.click(allMetrics);
    const dm = await view.findByRole('region', { name: 'Queued ingestion / DM — not confirmed queryable' });
    expect(dm.textContent).toContain('8');
    const queryable = view.getByRole('region', { name: 'Queryable store / reads' });
    expect(queryable.textContent).toContain('7');
    expect(queryable.textContent).not.toContain('900');
    expect(view.container.querySelector('#health-store-details').open).toBe(false);
    expect(view.container.querySelector('#health-source-details').open).toBe(false);
    expect(calls).toEqual([]);
    expect(ControlledEventSource.instances).toHaveLength(1);
  });

  it('does not present a retained Health snapshot as current while its producer is pending or unavailable', async () => {
    window.history.replaceState(null, '', '/?screen=health');
    const view = render(html`<${BoardScreen} liveController=${controller()}/>`);
    const source = await sourceOf();
    const producer = (revision, state) => liveEntity('source.status', 'health', { component: 'health', topic: 'runtime.health', ...state }, revision);
    await bootstrap(source, [liveEntity('runtime.health', 'local', {
      generated_at: Date.now() / 1000, store: { health: { state: 'ok', last_success_at: NOW } }, monitor: { collectors: [{ name: 'files', status: 'active' }] },
    }), producer(1, { ready: false, pending: true })]);
    const headline = () => view.container.querySelector('.bd-healthheader [role="status"]').textContent;
    expect(headline()).not.toBe('OK');
    await act(async () => source.emit('change', liveEnvelope(2, { upserts: [producer(2, { ready: true, pending: false })] }, queryOf(source))));
    await waitFor(() => expect(headline()).toBe('OK'));
    await act(async () => source.emit('change', liveEnvelope(3, { upserts: [producer(3, { ready: true, stale: true, error: 'Health read failed' })] }, queryOf(source))));
    await waitFor(() => expect(headline()).toBe('Degraded'));
    expect(view.getByRole('alert').textContent).toContain('Health read failed');
  });

  it('streams current file configuration and displays loaded evidence without equating them', async () => {
    window.history.replaceState(null, '', '/?screen=settings');
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async url => { calls.push(String(url)); return json({ files: [] }); }));
    const view = render(html`<${BoardScreen} liveController=${controller()}/>`);
    const source = await sourceOf();
    await bootstrap(source, [
      liveEntity('configuration.file', 'current', {
        configured_only: true, tools: [{ tool: 'copilot', label: 'Copilot' }],
        tool_configs: [{ tool: 'copilot', config_files: ['config.json'], sections: [{ id: 'model', title: 'Model', rows: [
          { key: 'model', label: 'Model', value: 'configured-model', kind: 'text', source: 'config.json', scope: 'user' },
        ] }] }],
      }),
      liveEntity('configuration.loaded', 'native-1', {
        session_id: 'native-1', tool: 'copilot', configured_on_disk: false, effective_known: true,
        evidence: [{ key: 'model', value: 'running-model', source: 'process-flag', observed_at: NOW }],
        unknown: ['reasoning_effort', 'approval_policy', 'sandbox_policy'],
      }),
    ]);
    const evidence = await view.findByRole('region', { name: 'Loaded configuration evidence' });
    expect(evidence.textContent).toContain('running-model');
    expect(evidence.textContent).toContain('process-flag');
    expect(evidence.textContent).toContain('Unknown: reasoning_effort');
    expect(evidence.textContent).not.toContain('configured-model');
    expect(view.container.querySelector('.st-row[data-key="model"]').textContent).toContain('configured-model');
    expect(calls.some(url => url.startsWith('/api/settings/tools') || url.startsWith('/api/board?'))).toBe(false);
    expect(new URL(source.url, 'http://x').searchParams.get('history')).toBe('0');
  });
});

describe('native output and historical transcript separation', () => {
  it('updates active-agent configuration evidence even while its historical detail request is pending', async () => {
    const fetch = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetch);
    const client = controller();
    const actions = { openDrawer: vi.fn(), setDrawerTab: vi.fn(), drawerBack: vi.fn(), drawerClose: vi.fn(), copy: vi.fn(), stopAgent: vi.fn() };
    const ctx = { data: { agents: [runtimeAgent], capture_mode: 'full' }, stopped: {}, toolName: value => value, refreshKey: 0 };
    const view = render(html`<${LiveProvider} controller=${client}><${Drawer} stack=${[{ type: 'agent', id: 'native-1', tab: 'overview' }]} ctx=${ctx} act=${actions}/><//>`);
    const source = await sourceOf();
    const evidence = value => liveEntity('configuration.loaded', 'native-1', {
      session_id: 'native-1', tool: 'copilot', effective_known: true,
      evidence: [{ key: 'model', value, source: 'native-session-report' }], unknown: ['reasoning_effort'],
    }, value === 'initial-model' ? 1 : 2);
    await bootstrap(source, [evidence('initial-model')]);
    const detail = await view.findByRole('group', { name: 'Effective runtime settings' });
    fireEvent.click(detail.querySelector('summary'));
    expect(detail.textContent).toContain('initial-model');
    await act(async () => source.emit('change', liveEnvelope(2, { upserts: [evidence('updated-model')] })));
    await waitFor(() => expect(detail.textContent).toContain('updated-model'));
    expect(detail.textContent).not.toContain('initial-model');
    expect(detail.textContent).toContain('Unknown: reasoning_effort');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(ControlledEventSource.instances).toHaveLength(1);
  });

  it('renders ordered native output while history is pending, does not poll it, and honors capture suppression', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const fetch = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetch);
    const client = controller();
    const a = { id: 'native-1', session_id: 'native-1' };
    const ctx = { data: { capture_mode: 'full' } };
    const view = render(html`<${LiveProvider} controller=${client}><${TranscriptTab} a=${a} st="running" ctx=${ctx}/><//>`);
    const source = await sourceOf();
    await bootstrap(source, [
      liveEntity('runtime.output', 'second', { session_id: 'native-1', entry_id: 'second', order: 2, kind: 'assistant', text: 'Second reply', content_retained: true }),
      liveEntity('runtime.output', 'first', { session_id: 'native-1', entry_id: 'first', order: 1, kind: 'assistant', text: 'First reply', content_retained: true }),
    ]);
    const output = await view.findByRole('list', { name: 'Ordered native output' });
    expect([...output.children].map(element => element.querySelector('.bd-ag-text').textContent)).toEqual(['First reply', 'Second reply']);
    await act(async () => { vi.advanceTimersByTime(15000); });
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => source.emit('change', liveEnvelope(2, { upserts: [
      liveEntity('runtime.output', 'second', { session_id: 'native-1', entry_id: 'second', order: 2, kind: 'assistant', text: 'Second reply extended', content_retained: true, text_truncated: true }, 2),
    ] })));
    expect(output.children).toHaveLength(2);
    expect(output.textContent).toContain('Second reply extended');
    expect(view.container.textContent).toContain('Some retained native text is truncated');
    view.rerender(html`<${LiveProvider} controller=${client}><${TranscriptTab} a=${a} st="running" ctx=${{ data: { capture_mode: 'metadata' } }}/><//>`);
    expect(output.textContent).not.toContain('First reply');
    expect(within(output).getAllByText('Text not retained.')).toHaveLength(2);
    expect(ControlledEventSource.instances).toHaveLength(1);
  });
});
