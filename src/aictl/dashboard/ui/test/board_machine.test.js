// The board's Machine section and data-pipeline panels.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';

import BoardScreen from '../src/components/board/BoardScreen.js';
import Table from '../src/components/board/Table.js';
import { parseFilters } from '../src/components/board/filters.js';
import { DEFAULT_LAYOUT, TITLES, sanitizeLayout } from '../src/components/board/layout.js';
import { buildPanel, coreBars, procTree } from '../src/components/board/panels.js';
import { sectionSummary, streamPill } from '../src/components/board/summary.js';
import { EMPTY_MACHINE, normalizeBoard, normalizeMachine } from '../src/components/board/useBoardData.js';
import { NOW, boardFixture, machineFixture } from './fixtures/board.fixture.js';
import { boardEventSource, ControlledEventSource } from './fixtures/live.fixture.js';

if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function stubFetch(machine = machineFixture(), board = boardFixture()) {
  vi.stubGlobal('EventSource', boardEventSource({ board: () => board, machine: () => machine }));
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.startsWith('/api/context-audit')) return jsonResponse({ findings: [], sources: [], counts: {} });
    return jsonResponse({});
  }));
  return calls;
}
beforeEach(() => {
  ControlledEventSource.instances = [];
  window.history.replaceState(null, '', '/');
  localStorage.clear?.();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const local = (over = {}) => ({ mode: (k, d) => (over[k] !== undefined ? over[k] : d), tableView: false, folded: over.folded || {}, setFold: over.setFold || (() => {}) });
function ctxWith(machine = machineFixture(), board = boardFixture(), actions = {}) {
  const data = { ...normalizeBoard(board), machine: normalizeMachine(machine) };
  return { data, series: {}, range: data.range, chartRange: data.range, sel: null, filters: parseFilters(''), tools: null, toolIds: [], settingToolIds: [], toolName: id => id, nowS: NOW, stopped: {}, findings: { list: [], settings: [] }, actions };
}

describe('layout of the Machine section', () => {
  it('is named Machine, keeps the id resources, and holds the new panels', () => {
    const sec = DEFAULT_LAYOUT.find(s => s.id === 'resources');
    expect(sec.title).toBe('Machine');
    expect(sec.panels.map(p => p[0])).toEqual(['cpu', 'ram', 'alerts', 'procs', 'traffic', 'daemon']);
    expect(DEFAULT_LAYOUT.find(s => s.id === 'sources').panels.map(p => p[0])).toEqual(['coverage']);
    expect(DEFAULT_LAYOUT.find(s => s.id === 'health').panels.map(p => p[0])).toEqual(['storeHealth', 'self', 'sources', 'collectors', 'quality']);
    expect(TITLES.alerts).toBe('Needs a look');
  });
  it('adds the new panels to a layout stored before they existed', () => {
    const stored = [{ id: 'resources', open: false, panels: [{ id: 'procs', span: 8, open: true }, { id: 'cpu', span: 6, open: true }] }];
    const res = sanitizeLayout(stored).find(s => s.id === 'resources');
    expect(res.open).toBe(false);
    expect(res.panels.map(p => p.id)).toEqual(['procs', 'cpu', 'ram', 'alerts', 'traffic', 'daemon']);
    expect(res.panels[0].span).toBe(8);
  });
});

describe('normalizeMachine', () => {
  it('fills what an answer leaves out, so no panel can crash', () => {
    const m = normalizeMachine({ monitor: { collectors: null }, pipeline: { ingesters: 'x' } });
    expect(m.monitor.collectors).toEqual([]);
    expect(m.pipeline.ingesters).toEqual([]);
    expect(m.alerts).toEqual([]);
    expect(normalizeMachine(null)).toBe(EMPTY_MACHINE);
  });
  it('builds every machine panel from an empty answer', () => {
    const ctx = ctxWith({}, {});
    for (const id of ['cpu', 'alerts', 'procs', 'traffic', 'sources', 'self', 'collectors', 'quality']) expect(() => buildPanel(id, ctx, local(), { id })).not.toThrow();
    // A context without machine data at all, as older callers build it.
    const bare = { ...ctx, data: { ...ctx.data, machine: undefined } };
    expect(buildPanel('alerts', bare, local(), { id: 'alerts' }).table.rows).toEqual([]);
  });
});

describe('processes panel', () => {
  it('shows type, parent, anomaly chips, zombie risk and a cleanup command', () => {
    const copies = [];
    const p = buildPanel('procs', ctxWith(undefined, undefined, { copy: (t, d) => copies.push([t, d]) }), local(), { id: 'procs' });
    expect(p.table.cols.map(c => c.l)).toEqual(['Process', 'PID', 'Tool', 'Agent', 'Type', 'Parent', 'Anomalies', 'Zombie risk', 'CPU', 'RAM', 'Cleanup']);
    const c = p.table.rows[0].cells;
    expect(c.type.v).toBe('mcp-server');
    expect(c.parent.v).toBe('tool-a (4000)');
    expect(c.anom.chips).toEqual([{ text: 'High memory', title: 'High memory: 180 MB, expected 60 MB', sev: 'warn' }]);
    expect(c.zr).toMatchObject({ v: 'High', cls: 'crit' });
    expect(c.name.title).toContain('node server.js --port 3000');
    expect(c.act.v).toBe('Copy cleanup command');
    c.act.go();
    expect(copies).toEqual([['pkill -f server.js', 'Copied: pkill -f server.js']]);
    expect(p.sub).toContain('1 with anomalies');
  });
  it('shows None and n/a when the machine answer has nothing for a process', () => {
    const p = buildPanel('procs', ctxWith({ processes: [] }), local(), { id: 'procs' });
    const c = p.table.rows[0].cells;
    expect([c.type.v, c.parent.v, c.anom.v, c.zr.v, c.act.v]).toEqual(['n/a', 'n/a', 'None', 'None', '']);
  });
  it('renders chips with their hover text in the table', () => {
    const p = buildPanel('procs', ctxWith(), local(), { id: 'procs' });
    const { container } = render(html`<${Table} def=${p.table}/>`);
    const chip = container.querySelector('.bd-tag.bd-tag-warn');
    expect(chip.textContent).toBe('High memory');
    expect(chip.getAttribute('title')).toBe('High memory: 180 MB, expected 60 MB');
  });
  it('indents children under their parents in the tree view, at every depth', () => {
    const board = boardFixture({
      processes: [
        { name: 'grandchild', pid: 3, tool: 'tool-a', cpu_percent: 9, mem_mb: 1 },
        { name: 'root', pid: 1, tool: 'tool-a', cpu_percent: 1, mem_mb: 1 },
        { name: 'child', pid: 2, tool: 'tool-a', cpu_percent: 5, mem_mb: 1 },
        { name: 'other', pid: 9, tool: 'tool-a', cpu_percent: 3, mem_mb: 1 },
      ],
    });
    const machine = machineFixture({ processes: [{ pid: 2, ppid: 1, anomalies: [] }, { pid: 3, ppid: 2, anomalies: [] }, { pid: 1, ppid: 0, anomalies: [] }, { pid: 9, ppid: 1234, anomalies: [] }] });
    const ctx = ctxWith(machine, board);
    const flat = buildPanel('procs', ctx, local(), { id: 'procs' });
    expect(flat.table.tree).toBe(false);
    const tree = buildPanel('procs', ctx, local({ view: 'tree' }), { id: 'procs' });
    expect(tree.table.tree).toBe(true);
    const { container } = render(html`<${Table} def=${tree.table}/>`);
    const names = [...container.querySelectorAll('tbody tr')].map(tr => tr.querySelector('td').textContent);
    // Roots sort by CPU; a child stays under its root whatever its own CPU.
    expect(names).toEqual(['other', 'root', 'child', 'grandchild']);
    const byName = Object.fromEntries(tree.table.rows.map(r => [r.cells.name.v, r]));
    expect(byName.child.level).toBe(1);
    expect(byName.grandchild.parentId).toBe(byName.root.id);
    expect(byName.grandchild.cells.name.pad).toBe(28);
  });
  it('keeps a loop of parents in the list', () => {
    const items = [{ pid: 1, pp: 2 }, { pid: 2, pp: 1 }];
    expect(procTree(items, x => x.pid, x => x.pp).map(r => r.x.pid).sort()).toEqual([1, 2]);
  });
});

describe('needs a look panel', () => {
  it('lists machine-wide alerts, most severe first, with a command to copy', () => {
    const copies = [];
    const p = buildPanel('alerts', ctxWith(undefined, undefined, { copy: t => copies.push(t) }), local(), { id: 'alerts' });
    const { container } = render(html`<${Table} def=${p.table}/>`);
    const rows = [...container.querySelectorAll('tbody tr')];
    expect(rows[0].textContent).toContain('Critical');
    expect(rows[0].textContent).toContain('Subagents use 2.7 GB of RAM');
    expect(rows[1].textContent).toContain('Note');
    const info = p.table.rows.find(r => r.id.startsWith('headless'));
    expect(info.cells.n.v).toBe('4300');
    expect(info.cells.what.title).toContain('chrome (PID 4300, 300 MB)');
    info.cells.act.go();
    expect(copies).toEqual(['kill 4300']);
    expect(p.table.rows.find(r => r.id.startsWith('subagent')).cells.act.v).toBe('');
    expect(p.sub).toBe('2 open, whole machine');
  });
  it('says what it checks when nothing needs a look', () => {
    const p = buildPanel('alerts', ctxWith({ alerts: [] }), local(), { id: 'alerts' });
    expect(p.sub).toBe('Nothing to look at');
    expect(p.table.none).toContain('subagents over 2 GB of RAM');
  });
});

describe('traffic, CPU cores, sources, self, collectors and quality', () => {
  it('shows each tool rates, the token estimate with its confidence, and the MCP loop flag', () => {
    const r = buildPanel('traffic', ctxWith(), local(), { id: 'traffic' }).table.rows[0].cells;
    expect(r.in.v).toBe('2 KB/s');
    expect(r.tok).toMatchObject({ v: '12 k', sub: '42% confidence' });
    expect(r.tok.title).toContain('does not report');
    expect(r.mcp).toMatchObject({ v: 'Loop, 3', warn: true });
    expect(r.ws.v).toBe('2 MB');
    expect(r.cpu.sub).toBe('peak 40%');
  });
  it('puts one bar per core under the CPU chart', () => {
    const p = buildPanel('cpu', ctxWith(), local(), { id: 'cpu' });
    expect(p.cores.list.map(c => c.level)).toEqual(['ok', 'warn', 'crit', 'ok']);
    expect(p.cores.label).toBe('4 cores, 40% on average, 1 over 80%');
    expect(coreBars([])).toBeNull();
    expect(buildPanel('cpu', ctxWith(), { ...local(), tableView: true }, { id: 'cpu' }).cores).toBeUndefined();
  });
  it('adds freshness and errors to the data sources', () => {
    const p = buildPanel('sources', ctxWith(), local(), { id: 'sources' });
    expect(p.table.cols.map(c => c.l)).toEqual(['Tool', 'Data from', 'Last data', 'Freshness', 'Hooks', 'OTel received', 'Local OTel config', 'Tool/session errors']);
    const a = p.table.rows.find(r => r.id === 'tool-a').cells;
    expect(a.f).toMatchObject({ v: '5 s ago', sub: '90%' });
    expect(a.e).toMatchObject({ v: '2', cls: 'dim', title: 'overloaded' });
    expect(p.table.rows.find(r => r.id === 'tool-b').cells.f.v).toBe('n/a');
  });
  it('shows the pipeline counters of aictl itself, and a data-loss warning on flood', () => {
    const p = buildPanel('self', ctxWith(), local(), { id: 'self' });
    const stat = label => p.stats.find(s => s.label === label);
    expect(stat('Uptime').value).toBe('2 h 0 min');
    expect(stat('Threads').value).toBe('14');
    expect(stat('History rows (cached)').title).toContain('requests: 1.00 M');
    expect(stat('Dropped (total)')).toMatchObject({ value: '0', cls: null });
    expect(stat('OTel model calls')).toMatchObject({ value: '30', sub: 'Since daemon start' });
    expect(stat('OTel model errors').value).toBe('1');
    expect(stat('Viewers').value).toBe('1');
    expect(stat('Snapshot').value).toBe('3 s');
    expect(p.banner).toBeNull();
    const flood = machineFixture();
    flood.pipeline.sink = { ...flood.pipeline.sink, flood: true, dropped: 250 };
    const f = buildPanel('self', ctxWith(flood), local(), { id: 'self' });
    expect(f.banner).toContain('Data loss');
    expect(f.stats.find(s => s.label === 'Dropped (total)')).toMatchObject({ value: '250', cls: 'crit' });
  });
  it('names the writes that run now, and warns when one has run for a minute', () => {
    expect(buildPanel('self', ctxWith(), local(), { id: 'self' }).stats.find(s => s.label === 'Writing')).toMatchObject({ value: 'Nothing', cls: null });
    const busy = machineFixture();
    busy.pipeline.self = { ...busy.pipeline.self, writes: [{ name: 'flush', age_s: 249 }, { name: 'compact', age_s: 4 }] };
    const p = buildPanel('self', ctxWith(busy), local(), { id: 'self' });
    expect(p.stats.find(s => s.label === 'Writing')).toMatchObject({ value: 'flush, 4 min; compact, 4 s', cls: 'warn' });
    expect(p.banner).toContain('(flush) has run for 4 min');
    const ctx = ctxWith(busy);
    ctx.data.health = { store: { kind: 'kusto', volume: { status: 'cached', checked_at: NOW, rows: 2400 } } };
    ctx.data.machine.pipeline.otel_receiver.api_calls_total = 0;
    const kusto = buildPanel('self', ctx, local(), { id: 'self' });
    expect(kusto.banner).toBeNull();
    expect(kusto.stats.find(s => s.label === 'Writing')).toMatchObject({ value: 'flush, 4 min; compact, 4 s', cls: null });
    expect(kusto.stats.find(s => s.label === 'OTel model calls').value).toBe('0');
    expect(kusto.stats.find(s => s.label === 'History rows (cached)').value).toBe('2.4 k');
    busy.pipeline.self.writes = [{ name: 'flush', age_s: 12 }];
    const short = buildPanel('self', ctxWith(busy), local(), { id: 'self' });
    expect(short.stats.find(s => s.label === 'Writing')).toMatchObject({ value: 'flush, 12 s', cls: null });
    expect(short.banner).toBeNull();
  });
  it('lists the collectors, with the monitored folders folded', () => {
    const folded = buildPanel('collectors', ctxWith(), local(), { id: 'collectors' });
    expect(folded.table.rows.map(r => r.id)).toEqual(['c:network', 'c:files', 'roots']);
    expect(folded.sub).toBe('2 collectors, 1 not active');
    expect(folded.table.rows[2].cells.d.title).toContain('state: /home/me/.tool-a');
    const open = buildPanel('collectors', ctxWith(), local({ folded: { 'roots-open': true } }), { id: 'collectors' });
    expect(open.table.rows.filter(r => r.level === 1).map(r => r.cells.d.v)).toEqual(['/work/alpha', '/home/me/.tool-a']);
  });
  it('shows ingesters with their state and data-quality events newest first, folded past 10', () => {
    const many = machineFixture();
    many.pipeline.data_quality = Array.from({ length: 14 }, (_, i) => ({ ts: NOW - i * 60, component: 'c' + i, source: '', kind: 'k', status: 'failed', severity: i ? 'info' : 'error', text: 'm' + i, count: 1 }));
    const p = buildPanel('quality', ctxWith(many), local(), { id: 'quality' });
    expect(p.stats.map(s => [s.label, s.value, s.cls])).toEqual([['copilot-session-store', 'ok', null], ['cursor', 'failed', 'crit']]);
    expect(p.stats[1].title).toContain('disk gone');
    const { container } = render(html`<${Table} def=${p.table}/>`);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(container.querySelector('tbody tr').textContent).toContain('c0');
    expect(container.querySelector('.bd-more').textContent).toBe('Showing 10 of 14. Show all');
    expect(p.sub).toBe('2 ingesters, 14 data-quality events, 1 need a look');
  });
  it('summarizes the sections in the rail', () => {
    const ctx = ctxWith();
    expect(sectionSummary('resources', ctx.data, {}, 0)).toBe('2.2% CPU, 180 MB, 2 alerts');
    expect(sectionSummary('sources', ctx.data, {}, 0)).toBe('1 of 2 tools report data, 1 data problems');
  });
});

describe('stale and disconnected pill', () => {
  it('names a lost stream, an old snapshot, and nothing when current or not live', () => {
    expect(streamPill({ live: true, connected: false, everConnected: true, ageS: 3 })).toMatchObject({ sev: 'crit', text: 'Live stream disconnected' });
    expect(streamPill({ live: true, connected: true, everConnected: true, ageS: 75 })).toMatchObject({ sev: 'warn', text: 'Data is 75 s old' });
    expect(streamPill({ live: true, connected: true, everConnected: true, ageS: 600 }).text).toBe('Data is 10 min old');
    expect(streamPill({ live: true, connected: true, everConnected: true, ageS: 3 })).toBeNull();
    // A stream that has not opened yet is not a lost one.
    expect(streamPill({ live: true, connected: false, everConnected: false, ageS: null })).toBeNull();
    expect(streamPill({ live: false, connected: false, everConnected: true, ageS: 900 })).toBeNull();
  });
  it('shows in the KPI strip when the snapshot is old, and when the stream drops', async () => {
    const machine = machineFixture();
    machine.pipeline.stream = { connected_clients: 1, snapshot_ts: NOW - 120, snapshot_age_s: 120 };
    const calls = stubFetch(machine);
    const view = render(html`<${BoardScreen}/>`);
    await waitFor(() => expect(view.container.querySelector('.bd-kpis .bd-kpipill')).toBeTruthy());
    const pill = view.container.querySelector('.bd-kpipill');
    expect(pill.textContent).toBe('Data is 2 min old');
    expect(pill.getAttribute('role')).toBe('status');
    expect(view.container.querySelectorAll('.bd-kpi')).toHaveLength(9);
    expect(calls.some(c => c.startsWith('/api/board/machine'))).toBe(false);
    await act(async () => ControlledEventSource.instances.at(-1).fail());
    await waitFor(() => expect(view.container.querySelector('.bd-kpipill').textContent).toBe('Live stream disconnected'));
  });
});

describe('board screen with machine data', () => {
  it('draws the Machine section, its panels and the core bars, and asks with the tool filter', async () => {
    window.history.replaceState(null, '', '/?tools=tool-a');
    const calls = stubFetch();
    const view = render(html`<${BoardScreen}/>`);
    await waitFor(() => expect(view.container.querySelector('#p-alerts tbody tr')).toBeTruthy());
    expect(view.container.querySelector('#sec-resources .bd-sect').textContent).toBe('Machine');
    for (const id of ['alerts', 'traffic', 'daemon']) expect(view.container.querySelector('#p-' + id), id).toBeTruthy();
    for (const id of ['collectors', 'quality', 'self']) expect(view.container.querySelector('#p-' + id), id).toBeNull();
    expect(view.container.querySelectorAll('#p-cpu .bd-core')).toHaveLength(4);
    const processes = view.container.querySelector('#p-procs tbody');
    expect(processes).toHaveTextContent('mcp-server');
    expect(processes).toHaveTextContent('High memory');
    expect(processes).toHaveTextContent('Fix retry logic');
    fireEvent.click(view.getByRole('button', { name: 'Tree' }));
    expect(view.container.querySelector('#p-procs .bd-note').textContent).toContain('under its parent');
    expect(new URL(ControlledEventSource.instances.at(-1).url, location.href).searchParams.get('tool')).toBe('tool-a');
    expect(calls.some(c => c.startsWith('/api/board/machine'))).toBe(false);
  });
});
