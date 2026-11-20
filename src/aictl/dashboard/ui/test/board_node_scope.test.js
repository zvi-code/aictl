import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import Root from '../src/root.js';
import { agentDetailFixture, boardFixture } from './fixtures/board.fixture.js';
import { scopedHealth } from '../src/components/board/scopedHealth.js';

const ENDPOINT = '/api/board/nodes';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const envelope = (q, extra = {}) => ({ view: q.view, scope: q.scope, local_node: { node_id: 'local-only', source: 'AICTL_NODE_ID' },
  fleet_available: true, rows: [], generated_at: null, ...extra });
const nodeContract = q => ({ node_scope: { kind: q.scope, node_id: q.node_id || null } });
const rowID = (id, node = 'node-a') => JSON.stringify([node, id]);
function report(q) {
  const ids = q.scope === 'node' ? [q.node_id] : ['node-a', 'legacy'];
  switch (q.view) {
    case 'nodes': return envelope(q, { rows: [{ node_id: 'node-a', captured_at: null }] });
    case 'health': return envelope(q, { rows: ids.map(node_id => ({ node_id, captured_at: null, status: 'unknown', cpu_percent: 8.5 })),
      shared_kusto: { scope: 'shared', database: 'fleet-db', cluster: 'fleet.example', capacity_total: 16,
        capacity_available: 0, capacity_checked_at: null, capacity_status: 'cached' } });
    case 'settings': return envelope(q, { rows: ids.map(node_id => ({ node_id, status: 'stale', capture: 'metadata', node_source: 'hostname', retention_days: 0 })),
      read_only: true });
    default: return envelope(q);
  }
}

function mount(search, intercept = () => undefined) {
  window.history.replaceState(null, '', '/' + search);
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
    const { pathname, searchParams } = new URL(url, window.location.href);
    const q = Object.fromEntries(searchParams);
    calls.push({ path: pathname, q, signal: opts.signal, method: opts.method || 'GET' });
    if (pathname === ENDPOINT) return intercept(q, opts) ?? json(report(q));
    const response = intercept(q, opts, pathname);
    if (response !== undefined) return response;
    if (pathname === '/api/board') {
      const fixture = boardFixture();
      if (q.scope) {
        Object.assign(fixture, nodeContract(q));
        fixture.agents = fixture.agents.map(r => ({
          ...r, id: rowID(r.id, q.node_id), node_id: q.node_id || 'node-a',
          parent_id: r.parent_id && rowID(r.parent_id, q.node_id),
        }));
      }
      return json(fixture);
    }
    if (pathname === '/api/board/agent') {
      const fixture = agentDetailFixture();
      return json({ ...fixture, agent: { ...fixture.agent, id: q.id, node_id: q.node_id || 'node-a' }, ...nodeContract(q) });
    }
    if (pathname === '/api/board/agent/flow') return json({ turns: [], summary: {}, ...nodeContract(q) });
    if (q.scope && pathname === '/api/board/context') return json({ ...nodeContract(q), nodes: (q.scope === 'node' ? [q.node_id] : ['node-a', 'node-b']).map((id, i) => ({
      node_id: id, files: [{ tool: 'copilot-cli', count: i + 1, files: [{ path: '/same.md', name: id + '-file', tool: 'copilot-cli', kind: 'memory', tokens: i + 1 }] }],
    })) });
    if (q.scope && pathname === '/api/board/machine') return json({ ...nodeContract(q), hosts: [], recorded_processes: [], recorded_total: 0 });
    if (q.scope && pathname === '/api/board/sessions') return json({ ...nodeContract(q), rows: [], total: 0, by_node: [] });
    if (pathname === '/api/settings/tools') return json({ tools: [], tool_configs: [{ tool: 'vscode', config_files: ['/local/private.json'], sections: [] }], monitor: {} });
    if (pathname === '/api/settings/files') return json({ files: [] });
    return json({});
  }));
  return { ...render(html`<${Root}/>`), calls };
}
const picker = ui => ui.getByRole('button', { name: /Node scope:/ });
function choose(ui, name) {
  fireEvent.click(picker(ui));
  fireEvent.click(within(ui.getByRole('group', { name: 'Choose node scope' })).getByRole('button', { name, exact: true }));
}
const query = () => Object.fromEntries(new URLSearchParams(location.search));
const reportsOnly = calls => expect(calls.every(c => c.path === ENDPOINT && c.method === 'GET')).toBe(true);

beforeEach(() => {
  vi.stubGlobal('EventSource', class { close() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('node scope across the board', () => {
  it('combines only fresh reporting clients, weights read latency, and counts shared slots once', () => {
    const sample = (id, rate, count, ms, status = 'reported') => ({
      node_id: id, daemon_pid: 11, status, client_sample: { at: 1000, pid: 11, store: {
        reads: { total: count, recent_completed: count, recent_avg_ms: ms },
        ingestion_traffic: { streaming: { rows_per_s: rate, groups: [{ id: 'otel', rows_per_s: rate }] } },
      } },
    });
    const data = scopedHealth({ scope: 'fleet', generated_at: 1005, rows: [
      sample('a', 100, 2, 20), sample('b', 60, 6, 40), sample('c', 3000, 1000, 900, 'stale'),
    ], shared_kusto: { scope: 'shared', database: 'test', cluster: 'example.test', capacity_total: 12, capacity_available: 0 } });
    expect(data.store.reads.recent_avg_ms).toBe(35);
    expect(data.store.ingestion_traffic.streaming.groups[0].rows_per_s).toBe(160);
    expect(data.store.ingestion_capacity).toMatchObject({ total: 12, available: 0 });
    expect(data.node_report.contributors).toEqual(['a', 'b']);
  });

  it('uses the live monitor counts even when there are no historical agent records', async () => {
      const now = Math.floor(Date.now() / 1000);
      const own = { node_id: 'local-only', activity_at: now, active_sessions: 6, active_processes: 15,
        agents: { captured_at: now, total: 1, rows: [
          { session_id: 'live-only', running: true, status: 'unknown', tool: 'copilot-cli' },
        ] } };
      const peer = { node_id: 'node-a', activity_at: now, active_sessions: 9, active_processes: 25, agents: null };
      const ui = mount('?scope=fleet', (q, _opts, path = ENDPOINT) => {
        if (path === ENDPOINT && q.view === 'runtime') return json(envelope(q, { generated_at: now, rows: q.scope === 'fleet' ? [own, peer] : [peer] }));
        if (path === '/api/board') {
          return json({ ...boardFixture(), ...nodeContract(q), agents: [], kpis: { running: 0 },
            scope: { shown_agents: 0, all_agents: 0 } });
        }
      });
      const kpi = ui.getByRole('link', { name: /Monitored sessions/ });
      await waitFor(() => expect(kpi.querySelector('.bd-v')).toHaveTextContent(/^15$/));
      const agents = within(ui.container.querySelector('#p-agentsT'));
      expect(agents.getByText(/Agent lists reported by 1 of 2 nodes/)).toBeVisible();
      expect(agents.getByRole('columnheader', { name: /^Node\b/ })).toBeVisible();
      expect(agents.getByRole('row', { name: /Monitored session.*local-only/ })).toBeVisible();
      expect(ui.queryByRole('table', { name: 'Agents by node' })).toBeNull();
      expect(ui.getByText(/No historical agent records in the selected time range/)).toBeVisible();
      fireEvent.click(picker(ui));
      fireEvent.click(await within(ui.getByRole('group', { name: 'Choose node scope' })).findByRole('button', { name: 'node-a', exact: true }));
      await waitFor(() => expect(kpi.querySelector('.bd-v')).toHaveTextContent(/^9$/));
      expect(agents.getByText(/Agent lists reported by 0 of 1 node/)).toBeVisible();
      expect(agents.queryByText('Monitored session', { exact: true })).toBeNull();
  }, 15000);

  it('uses the local Health monitor for the Sessions and Processes cells', async () => {
      const at = Date.now() / 1000;
      const ui = mount('?screen=health', (_q, _opts, path) => path === '/api/board/health'
        ? json({ generated_at: at, pipeline: { self: { pid: 7 } }, resources: {
          host: { node_id: 'local-only', activity_at: at - 5, active_sessions: 4, active_processes: 16,
            inbound_bps: 2048, outbound_bps: 0 },
          daemon: { cpu_percent: 8, rss_bytes: 4096 },
        } }) : undefined);
      const table = await ui.findByRole('table', { name: 'Reported node runtime' });
      const row = within(table).getByRole('row', { name: /^local-only/ });
      expect(within(row).getAllByRole('cell').map(cell => cell.textContent).slice(3, 5)).toEqual(['4', '16']);
      const traffic = ui.getByRole('table', { name: 'Reported node network traffic' });
      expect(within(traffic).getAllByRole('cell').map(cell => cell.textContent).slice(1)).toEqual(['2 KB/s', '0 B/s']);
  });
  it('keeps the same Settings workspace and pivot while dropping local file data', async () => {
    const ui = mount('?tab=config&scope=project-local&pivot=files&row=%2Flocal%2Fprivate.json', (q, _opts, path = ENDPOINT) => {
      if (path !== ENDPOINT) return undefined;
      if (q.view === 'identity' || q.view === 'nodes' || q.view === 'settings' && q.scope === 'local') return json(envelope(q, { fleet_available: false }));
      return json({ error: 'Fleet history requires a shared Kusto store' }, 409);
    });
    await waitFor(() => expect(ui.container.querySelector('.st-ws')).toBeTruthy());
    expect(await ui.findByText('local-only')).toBeVisible();
    const workspace = ui.container.querySelector('.st-ws');
    expect(query()).toMatchObject({ scope: 'project-local', screen: 'settings', pivot: 'files' });
    expect(ui.calls.some(c => c.path === ENDPOINT && c.q.view === 'nodes')).toBe(false);
    fireEvent.click(picker(ui));
    await ui.findByText('Fleet history requires a shared Kusto store.');
    fireEvent.click(ui.getByRole('button', { name: 'All nodes', exact: true }));
    await ui.findByText('Tool configuration files and policy findings are not reported for this scope.');
    expect(query()).toMatchObject({ scope: 'fleet', screen: 'settings' });
    expect(query().row).toBeUndefined();
    expect(ui.calls.find(c => c.path === '/api/settings/files').signal.aborted).toBe(true);
    expect(ui.container.querySelector('.st-ws')).toBe(workspace);
    expect(workspace).toHaveAttribute('data-view', 'files');
    expect(within(workspace).getByRole('radiogroup', { name: 'Settings view' })).toBeVisible();
    expect(ui.container).not.toHaveTextContent('local-only');
    window.history.back();
    await waitFor(() => expect(picker(ui)).toHaveTextContent('This node'));
    expect(ui.container.querySelector('.st-ws')).toBe(workspace);
    expect(query()).toMatchObject({ scope: 'project-local', pivot: 'files' });
    expect(query().row).toBe('/local/private.json');
    expect(picker(ui)).toHaveTextContent('This node');
  });

  it('keeps the full board and all query dimensions for fleet and named-node scope', async () => {
    const ui = mount('?scope=fleet&range=custom&since=1000&until=2000&project=local-project');
    expect((await ui.findAllByText('Fix retry logic')).length).toBeGreaterThan(0);
    expect(ui.container.querySelector('#p-agentsT')).toBeTruthy();
    expect(ui.container).toHaveTextContent('Historical fleet data');
    expect(ui.container).not.toHaveTextContent('Reading the context files...');
    expect(ui.container).not.toHaveTextContent('Reading the settings...');
    const inventory = within(ui.container.querySelector('#p-inventory'));
    expect(await inventory.findByText('node-b-file')).toBeVisible();
    expect(inventory.getByText('node-a-file')).toBeVisible();
    expect(inventory.getByRole('columnheader', { name: /^Node\b/ })).toBeVisible();
    expect(inventory.queryByRole('button', { name: 'node-b', exact: true })).toBeNull();
    fireEvent.click(inventory.getByText('node-b-file'));
    expect(ui.calls.some(c => c.path === '/api/file')).toBe(false);
    expect(ui.container).toHaveTextContent('Settings files and local policy findings are available only on This node.');
    for (const name of ['Usage by node', 'Context inventory by node', 'Reported daemon settings', 'Reported node network traffic']) {
      expect(ui.queryByRole('table', { name })).toBeNull();
    }
    const fleetBoard = ui.calls.find(c => c.path === '/api/board' && c.q.scope === 'fleet');
    expect(fleetBoard.q).toMatchObject({ scope: 'fleet', since: '1000', until: '2000', project: 'local-project' });
    fireEvent.click(picker(ui));
    const choices = within(ui.getByRole('group', { name: 'Choose node scope' }));
    fireEvent.click(await choices.findByRole('button', { name: 'node-a', exact: true }));
    await waitFor(() => expect(picker(ui)).toHaveTextContent('node-a'));
    await waitFor(() => expect(ui.calls.some(c => c.path === '/api/board'
      && c.q.scope === 'node' && c.q.node_id === 'node-a')).toBe(true));
    expect(ui.container.querySelector('#p-agentsT')).toBeTruthy();
    expect(ui.container).toHaveTextContent('Historical node-a data');
    expect(await inventory.findByText('node-a-file')).toBeVisible();
    expect(inventory.queryByText('node-b-file')).toBeNull();
    expect(inventory.getByRole('columnheader', { name: /^Node\b/ })).toBeVisible();
    window.history.back();
    await waitFor(() => expect(picker(ui)).toHaveTextContent('All nodes'));
    expect(ui.container.querySelector('#p-agentsT')).toBeTruthy();
  });

  it('keeps the normal Health sidebar and measured panels on the fleet and named Health URLs', async () => {
      const now = Math.floor(Date.now() / 1000);
      const node = (node_id, cpu_percent, daemon_pid) => ({ node_id, cpu_percent, daemon_pid, captured_at: now, activity_at: now,
        status: 'reported', active_sessions: 3, active_processes: 7, inbound_bps: daemon_pid, memory_total_mb: 8192, memory_used_mb: 1024 });
      const local = node('local-only', 21, 100), peer = node('node-a', 37, 200);
      const shared = { scope: 'shared', database: 'fleet-db', cluster: 'fleet.example', capacity_total: 12, capacity_available: 0,
        capacity_checked_at: now, capacity_status: 'cached' };
      const runtime = { generated_at: now, store: { kind: 'kusto', database: shared.database, cluster_url: 'https://fleet.example',
        ingestion_traffic: { streaming: { rows_per_s: 983, groups: [] } }, reads: { total: 17, recent_avg_ms: 700 },
        table_inventory: { status: 'cached', checked_at: now, tables: [{ name: 'metrics', rows: 131, extent_bytes: 4096 }] } },
        resources: { cluster: { checked_at: now, native: { nodes: 2 } } }, pipeline: { self: { pid: 100 } } };
      const ui = mount('?scope=fleet&screen=health', (q, _opts, path = ENDPOINT) => {
        if (path !== ENDPOINT || q.view !== 'health') return undefined;
        return json(envelope(q, { generated_at: now, rows: q.scope === 'fleet' ? [local, peer] : q.scope === 'node' ? [peer] : [local],
          shared_kusto: shared, ...(q.scope === 'local' ? { local_runtime: runtime } : {}) }));
      });
      const rail = ui.getByRole('navigation', { name: 'Sections of this screen' });
      expect(within(rail).getByRole('link', { name: /Agents/ })).toHaveAttribute('href', expect.stringContaining('scope=fleet'));
      for (const title of ['Sessions', 'Usage and cost', 'Prompts and skills', 'Machine']) {
        expect(within(rail).getByRole('link', { name: new RegExp(title) })).toBeVisible();
      }
      expect(await ui.findByText('983 rows/s')).toBeVisible();
      expect(ui.getByRole('heading', { name: 'Live activity' })).toBeVisible();
      expect(ui.getByRole('heading', { name: 'Traffic by destination' })).toBeVisible();
      expect(ui.getByRole('table', { name: 'Measured tables' })).toHaveTextContent('metrics');
      expect(ui.getByRole('table', { name: 'Reported node runtime' })).toHaveTextContent('37%');
      const traffic = ui.getByRole('table', { name: 'Reported node network traffic' });
      expect(traffic).toHaveTextContent('100 B/s');
      expect(traffic).toHaveTextContent('200 B/s');
      expect(ui.container).toHaveTextContent('1 of 2 nodes');
      fireEvent.click(ui.getByLabelText('Show all metrics'));
      expect(ui.getByRole('table', { name: 'Destination traffic by physical ingestion mode' })).toBeVisible();
      fireEvent.click(picker(ui));
      fireEvent.click(await ui.findByRole('button', { name: 'node-a', exact: true }));
      await waitFor(() => expect(ui.getByRole('table', { name: 'Reported node runtime' })).toHaveTextContent('node-a'));
      expect(ui.getByLabelText('Show all metrics')).toBeChecked();
      expect(ui.getByRole('table', { name: 'Reported node runtime' })).not.toHaveTextContent('local-only');
      const rates = within(ui.getByRole('table', { name: 'Reported node network traffic' }))
        .getAllByRole('cell').map(cell => cell.textContent).slice(1);
      expect(rates).toEqual(['200 B/s', '—']);
      expect(ui.container).not.toHaveTextContent('983 rows/s');
      fireEvent.click(ui.getByLabelText('Show all metrics'));
      expect(ui.getByRole('heading', { name: 'Live activity' })).toBeVisible();
      expect(ui.getByText('Streaming ingestion', { exact: true })).toBeVisible();
      expect(ui.container).toHaveTextContent('3 monitored sessions');
      expect(ui.getByRole('table', { name: 'Measured tables' })).toHaveTextContent('metrics');
      expect(ui.container).toHaveTextContent('0 / 12');
      expect(ui.getByRole('navigation', { name: 'Sections of this screen' })).toHaveTextContent('Changes and testing');
      window.history.back();
      await waitFor(() => expect(picker(ui)).toHaveTextContent('All nodes'));
      expect(await ui.findByText('983 rows/s')).toBeVisible();
  });

  it('accepts undiscovered nodes, drops late answers and keeps discovery failures separate from the report', async () => {
    let finish;
    const ui = mount('?scope=node&node_id=first&screen=health', q => {
      if (q.view === 'nodes') return json({}, 503);
      if (q.node_id !== 'first') return undefined;
      return new Promise(resolve => { finish = () => resolve(json(report(q))); });
    });
    fireEvent.click(picker(ui));
    await ui.findByText(/Could not list nodes/);
    fireEvent.input(ui.getByRole('textbox', { name: 'Node ID' }), { target: { value: ' Not-Listed ' } });
    fireEvent.click(ui.getByRole('button', { name: 'Open node' }));
    const table = await ui.findByRole('table', { name: 'Reported node runtime' });
    expect(ui.calls[0].signal.aborted).toBe(true);
    await act(async () => finish());
    expect(table).toHaveTextContent('not-listed');
    expect(ui.container).not.toHaveTextContent('first');
    fireEvent.click(picker(ui));
    await ui.findByText(/Could not list nodes/);
    expect(ui.getByRole('button', { name: 'not-listed', exact: true })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(ui.getByRole('button', { name: 'All nodes', exact: true }));
    fireEvent.click(picker(ui));
    expect(ui.getByRole('button', { name: 'not-listed', exact: true })).toBeVisible();
    reportsOnly(ui.calls);
  });

  it('does not fall back to the limited report for a node-scoped overview deep link', async () => {
    const ui = mount('?tab=explorer&session=private&scope=node&node_id=legacy');
    await waitFor(() => expect(ui.container.querySelector('#p-agentsT')).toBeTruthy());
    expect(ui.queryByRole('table', { name: 'Reported session totals' })).toBeNull();
    const request = ui.calls.find(c => c.path === '/api/board');
    expect(request.q).toMatchObject({ scope: 'node', node_id: 'legacy' });
  });

  it('uses the qualified agent and same scope for flow, drawer Back, and a reopened deep link', async () => {
    const ui = mount('?scope=fleet&range=24h');
    const row = await ui.findByText('node-a · run00001');
    const agentButton = within(row.closest('tr')).getByRole('button', { name: /Fix retry logic/i });
    fireEvent.click(agentButton);
    const id = rowID('run00001aaaa');
    await waitFor(() => expect(ui.calls.some(c => c.path === '/api/board/agent/flow' && c.q.id === id && c.q.scope === 'fleet')).toBe(true));
    const deepLink = location.search;
    expect(query()).toMatchObject({ scope: 'fleet', agent: id });
    expect(ui.calls.some(c => c.path === '/api/board/agent' && c.q.id === id && c.q.scope === 'fleet')).toBe(true);
    expect(ui.queryByRole('button', { name: 'Stop', exact: true })).toBeNull();
    window.history.back();
    await waitFor(() => expect(query().agent).toBeUndefined());
    expect(picker(ui)).toHaveTextContent('All nodes');
    expect(ui.container.querySelector('#drawer')).toBeNull();
    ui.unmount();
    const reopened = mount(deepLink);
    await waitFor(() => expect(reopened.calls.some(c => c.path === '/api/board/agent' && c.q.id === id && c.q.scope === 'fleet')).toBe(true));
    expect(reopened.calls.every(c => c.q.scope === 'fleet')).toBe(true);
  });

  it('does not display an unscoped success response from an old daemon', async () => {
    const ui = mount('?scope=fleet', (_q, _opts, path) => path === '/api/board' ? json(boardFixture()) : undefined);
    expect(await ui.findByRole('alert')).toHaveTextContent('did not confirm the requested node scope');
    expect(ui.container).not.toHaveTextContent('Fix retry logic');
    expect(ui.calls.every(c => c.q.scope === 'fleet')).toBe(true);
  });

  it('keeps the normal board mounted while a node scope changes', async () => {
    const ui = mount('?range=1h');
    await waitFor(() => expect(ui.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
    const area = ui.container.querySelector('#main-area');
    const panels = [...area.querySelectorAll('.bd-panel')];
    const processControls = within(area.querySelector('#p-procs')).getByRole('group', { name: 'Show processes as' });
    fireEvent.click(within(processControls).getByRole('button', { name: 'Tree' }));
    expect(ui.container).toHaveTextContent('Fix retry logic');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await ui.findByRole('dialog');
    choose(ui, 'All nodes');
    expect((await ui.findAllByText('Fix retry logic')).length).toBeGreaterThan(0);
    expect(ui.container.querySelector('#p-agentsT')).toBeTruthy();
    expect(within(area.querySelector('#p-agentsT')).getByRole('columnheader', { name: /^Node\b/ })).toBeVisible();
    expect(ui.container.querySelector('#main-area')).toBe(area);
    expect([...area.querySelectorAll('.bd-panel')].every((p, i) => p === panels[i])).toBe(true);
    expect(within(processControls).getByRole('button', { name: 'Tree' })).toHaveAttribute('aria-pressed', 'true');
    expect(ui.container.querySelector('[role=dialog], #drawer')).toBeNull();
    expect(ui.container).toHaveTextContent('Fix retry logic');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(ui.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(ui.getByRole('button', { name: '7 d' }));
    await waitFor(() => expect(ui.calls.filter(c => c.path === '/api/board').at(-1).q.until - ui.calls.filter(c => c.path === '/api/board').at(-1).q.since).toBe(7 * 86400));
    choose(ui, 'This node');
    await waitFor(() => expect(ui.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
    expect(query().range).toBe('7d');
  });

  it('does not attach live CPU, RAM or counters to a previous daemon PID', () => {
    const report = { scope: 'fleet', generated_at: 100, local_node: { node_id: 'node-a' },
      rows: [{ node_id: 'node-a', daemon_pid: 11, activity_at: 97, status: 'reported', inbound_bps: 7 }],
      shared_kusto: { cluster: 'fleet.example', database: 'fleet-db' } };
    const live = { store: { kind: 'kusto', cluster_url: 'https://fleet.example', database: 'fleet-db', reads: { total: 25 } },
      pipeline: { self: { pid: 22 } }, resources: {
        daemon: { cpu_percent: 28, rss_bytes: 555 }, host: { activity_at: 98, inbound_bps: 12, outbound_bps: 0 },
      } };
    const mismatch = scopedHealth(report, live);
    expect(mismatch.node_report.rows[0]).toMatchObject({ daemon_pid: 11, daemon: undefined, inbound_bps: 7 });
    expect(mismatch.node_report.contributors).toEqual([]);
    report.rows[0].daemon_pid = 22;
    expect(scopedHealth(report, live).node_report.rows[0]).toMatchObject({
      daemon: { cpu_percent: 28 }, inbound_bps: 12, outbound_bps: 0, activity_at: 98,
    });
  });

  it('does not mount the normal board for an invalid node scope', async () => {
    const ui = mount('?scope=node&screen=health');
    await ui.findByRole('alert');
    expect(ui.calls).toEqual([]);
    expect(ui.container.querySelector('.st-ws, #drawer, #p-agentsT')).toBeNull();
  });
});
