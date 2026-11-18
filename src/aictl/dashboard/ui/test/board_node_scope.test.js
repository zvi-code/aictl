import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import Root from '../src/root.js';
import { boardFixture } from './fixtures/board.fixture.js';

const ENDPOINT = '/api/board/nodes';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const envelope = (q, extra = {}) => ({ view: q.view, scope: q.scope, local_node: { node_id: 'local-only', source: 'AICTL_NODE_ID' },
  fleet_available: true, rows: [], generated_at: null, ...extra });
const metrics = { sessions: 2, requests: 17, input_tokens: 300, output_tokens: 12, cost_usd: 0.25 };
const sid = 'same/session + id';
const record = id => ({ node_id: id, session_id: sid, tool: 'reported-tool', model: 'reported-model', project_path: '/reported/path', ended_at: null });
function report(q) {
  const ids = q.scope === 'node' ? [q.node_id] : ['node-a', 'legacy'];
  switch (q.view) {
    case 'nodes': return envelope(q, { rows: [{ node_id: 'node-a', captured_at: null }] });
    case 'overview': return envelope(q, { rows: ids.map(node_id => ({ node_id, ...metrics })), totals: { ...metrics, sessions: 103 },
      sessions: ids.map(record), truncated: true });
    case 'session': return envelope(q, { rows: [record(q.node_id)] });
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
    if (pathname === '/api/board') return json(boardFixture());
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
  it('keeps old local Settings links and identity working without Kusto; discovers nodes only on demand', async () => {
    const ui = mount('?tab=config&scope=project-local&pivot=files&row=%2Flocal%2Fprivate.json', q => {
      if (q.view === 'identity' || q.view === 'nodes') return json(envelope(q, { fleet_available: false }));
      return json({ error: 'Fleet history requires a shared Kusto store' }, 409);
    });
    await waitFor(() => expect(ui.container.querySelector('.st-ws')).toBeTruthy());
    expect(await ui.findByText('local-only')).toBeVisible();
    expect(ui.container.querySelector('.bd-identity')).toHaveTextContent('Source: AICTL_NODE_ID');
    expect(query()).toMatchObject({ scope: 'project-local', screen: 'settings', pivot: 'files' });
    expect(ui.calls.filter(c => c.path === ENDPOINT).map(c => c.q.view)).toEqual(['identity']);
    fireEvent.click(picker(ui));
    await ui.findByText('Fleet history requires a shared Kusto store.');
    fireEvent.click(ui.getByRole('button', { name: 'All nodes', exact: true }));
    await ui.findByRole('alert');
    expect(query()).toMatchObject({ scope: 'fleet', screen: 'settings' });
    expect(query().row).toBeUndefined();
    expect(ui.calls.find(c => c.path === '/api/settings/files').signal.aborted).toBe(true);
    expect(ui.container.querySelector('.st-ws, .bd-identity')).toBeNull();
    expect(ui.container).not.toHaveTextContent('local-only');
    window.history.back();
    await waitFor(() => expect(ui.container.querySelector('.st-ws')).toBeTruthy());
    expect(query()).toMatchObject({ scope: 'project-local', pivot: 'files' });
    expect(query().row).toBe('/local/private.json');
    expect(picker(ui)).toHaveTextContent('This node');
  });

  it('uses the composite session key, preserves time and node across links and Back, and never opens a local drawer', async () => {
    const ui = mount('?scope=fleet&range=custom&since=1000&until=2000&project=local-project');
    const table = await ui.findByRole('table', { name: 'Sessions' });
    expect(ui.getByText('103')).toBeVisible();
    expect(ui.container).toHaveTextContent('Totals include all matching sessions');
    expect(ui.container).toHaveTextContent(/current session records by start time: at or after the start, but before the end/);
    expect(ui.container).toHaveTextContent(/recorded totals for those sessions, not just activity during the interval/);
    expect(ui.calls[0].q).toEqual({ view: 'overview', scope: 'fleet', since: '1000', until: '2000' });
    const details = within(table).getByRole('link', { name: `Session ${sid} on legacy` });
    expect(new URL(details.href).searchParams.get('node_id')).toBe('legacy');
    fireEvent.click(details);
    expect(await ui.findByText('/reported/path')).toBeVisible();
    expect(ui.queryByRole('link', { name: '/reported/path' })).toBeNull();
    expect(query()).toMatchObject({ scope: 'node', node_id: 'legacy', session_id: sid, until: '2000' });
    expect(ui.calls.at(-1).q).toEqual({ view: 'session', scope: 'node', node_id: 'legacy', session_id: sid });
    window.history.back();
    await ui.findByRole('table', { name: 'Sessions' });
    fireEvent.click(within(ui.getByRole('table', { name: 'Usage by node' })).getByRole('link', { name: 'node-a' }));
    await waitFor(() => expect(picker(ui)).toHaveTextContent('node-a'));
    fireEvent.click(ui.getByRole('link', { name: 'aictl Health' }));
    expect(await ui.findByText('fleet-db')).toBeVisible();
    const runtime = ui.getByRole('table', { name: 'Reported node runtime' });
    expect(runtime).toHaveTextContent('Unknown');
    expect(runtime).toHaveTextContent('8.5%');
    expect(runtime).not.toHaveTextContent('fleet-db');
    expect(runtime).not.toHaveTextContent('ingestion slots');
    const shared = within(ui.getByRole('region', { name: 'Shared Kusto store' }));
    expect(shared.getByText('Total ingestion slots').nextElementSibling).toHaveTextContent('16');
    expect(shared.getByText('Available ingestion slots').nextElementSibling).toHaveTextContent('0');
    expect(shared.getByText('Capacity last checked').nextElementSibling).toHaveTextContent('Unknown');
    expect(shared.getByText('Capacity status').nextElementSibling).toHaveTextContent('cached');
    fireEvent.click(ui.getByRole('link', { name: 'Settings' }));
    expect(await ui.findByText('metadata')).toBeVisible();
    expect(ui.calls.at(-1).q).toEqual({ view: 'settings', scope: 'node', node_id: 'node-a' });
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(ui.container.querySelector('#drawer, [role=dialog], .st-ws')).toBeNull();
    expect(ui.container).not.toHaveTextContent('local-only');
    reportsOnly(ui.calls);
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

  it('rejects a mismatched session response instead of showing the other node or falling back locally', async () => {
    const ui = mount('?tab=explorer&session=private&scope=node&node_id=legacy', q => json(envelope(q, {
      rows: [{ ...record('local-only'), session_id: 'private', project_path: '/local/private' }],
    })));
    expect(await ui.findByRole('alert')).toHaveTextContent('did not return the requested node view');
    expect(ui.container).not.toHaveTextContent('local-only');
    expect(ui.container).not.toHaveTextContent('/local/private');
    expect(ui.calls.map(c => c.q)).toEqual([{ view: 'session', scope: 'node', node_id: 'legacy', session_id: 'private' }]);
    reportsOnly(ui.calls);
  });

  it('unmounts the local board and its shortcuts even if a local dialog is open', async () => {
    const ui = mount('?range=1h');
    await waitFor(() => expect(ui.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
    expect(ui.container).toHaveTextContent('Fix retry logic');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await ui.findByRole('dialog');
    choose(ui, 'All nodes');
    await ui.findByRole('table', { name: 'Usage by node' });
    const afterSwitch = ui.calls.length;
    expect(ui.container.querySelector('#p-agentsT, [role=dialog], #drawer')).toBeNull();
    expect(ui.container).not.toHaveTextContent('Fix retry logic');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(ui.queryByRole('dialog')).toBeNull();
    fireEvent.click(ui.getByRole('button', { name: '7 d' }));
    await waitFor(() => expect(ui.calls.at(-1).q.until - ui.calls.at(-1).q.since).toBe(7 * 86400));
    reportsOnly(ui.calls.slice(afterSwitch));
    choose(ui, 'This node');
    await waitFor(() => expect(ui.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
    expect(query().range).toBe('7d');
  });

  it.each(['?scope=node&screen=health', '?scope=fleet&session_id=unqualified'])('does not use a local fallback for an incomplete scope: %s', async search => {
    const ui = mount(search);
    await ui.findByRole('alert');
    expect(ui.calls).toEqual([]);
    expect(ui.container.querySelector('.st-ws, #drawer, #p-agentsT')).toBeNull();
  });
});
