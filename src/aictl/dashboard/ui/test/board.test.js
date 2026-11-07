import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import axe from 'axe-core';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import BoardScreen from '../src/components/board/BoardScreen.js';
import Chart from '../src/components/board/Chart.js';
import Table from '../src/components/board/Table.js';
import { bucketTotals, chartModel, indexToSel, selToIndex, tipFor } from '../src/components/board/chartModel.js';
import { boardQuery, canClear, filtersToParams, listedTools, parseFilters, toolFilterLabel, windowOf } from '../src/components/board/filters.js';
import { buildFindings, buildSettings, tailPath } from '../src/components/board/findings.js';
import { fmtDur, fmtLines, fmtMs, fmtN, fmtRate, fmtShare, fmtUsd, sparkPath } from '../src/components/board/format.js';
import {
  LS_KEY, freshLayout, freshUi, isDefaultLayout, loadUi, movePanel, moveSection, sanitizeLayout, saveUi, stepPanel,
} from '../src/components/board/layout.js';
import { PANEL_IDS, buildPanel, splitSeries } from '../src/components/board/panels.js';
import { kpiList, sectionSummary } from '../src/components/board/summary.js';
import { nextSort, tableModel } from '../src/components/board/tableModel.js';
import { normalizeBoard } from '../src/components/board/useBoardData.js';
import { nextTools } from '../src/hooks/useBoardFilters.js';
import { redirectOf } from '../src/root.js';
import { NOW, agentDetailFixture, boardFixture, fileDetailFixture, machineFixture } from './fixtures/board.fixture.js';

// jsdom's localStorage is an empty object in this project's vitest setup (see hooks.test.js).
if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

const jsonResponse = (body, status = 200, headers = {}) => new Response(status === 304 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function stubFetch(board = boardFixture()) {
  const calls = [];
  const fn = vi.fn(async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.startsWith('/api/board/agent')) return jsonResponse(agentDetailFixture(new URL(u, 'http://x').searchParams.get('id')));
    if (u.startsWith('/api/board/file')) return jsonResponse(fileDetailFixture());
    if (u.startsWith('/api/board/tool')) return jsonResponse({ name: 'read_file', calls: [{ ts: NOW, target: 'a.py', agent_id: 'run00001aaaa', title: 'Fix', duration_ms: 100, failed: false, confirm: 'auto' }] });
    if (u.startsWith('/api/board/error')) return jsonResponse({ key: 'x', items: [{ ts: NOW, detail: 'boom', agent_id: 'run00001aaaa', title: 'Fix' }] });
    if (u.startsWith('/api/board/prompt')) return jsonResponse({ text: '', prompt_file: '', project: 'alpha', title: 'Fix', input: null, output: 1, cache_read: 2, reply_ms: 3, tool_calls: 0 });
    if (u.startsWith('/api/board/action')) return jsonResponse({ ok: true });
    if (u.startsWith('/api/session-kill')) return jsonResponse({ ok: true });
    if (u.startsWith('/api/board/machine')) return jsonResponse(machineFixture());
    if (u.startsWith('/api/board')) return jsonResponse(board);
    if (u.startsWith('/api/context-audit')) return jsonResponse({ findings: [], sources: [], counts: {} });
    return jsonResponse({});
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}
class FakeES { constructor() { FakeES.last = this; } close() {} }

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES);
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function mountBoard(board) {
  const calls = stubFetch(board);
  const view = render(html`<${BoardScreen}/>`);
  await waitFor(() => expect(view.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
  return { ...view, calls };
}

describe('layout save and restore', () => {
  it('restores what was saved', () => {
    const ui = freshUi();
    ui.layout = stepPanel(ui.layout, 'byRole', -1);
    ui.hidden = ['skills'];
    ui.density = 'comfortable';
    saveUi(ui);
    const back = loadUi();
    expect(back.layout[0].panels.map(p => p.id)).toEqual(['attention', 'agentsT', 'byRole', 'byModel']);
    expect(back.hidden).toEqual(['skills']);
    expect(back.density).toBe('comfortable');
  });
  it('falls back to the default on broken storage and when storage throws', () => {
    localStorage.setItem(LS_KEY, '{not json');
    expect(loadUi().layout).toEqual(freshLayout());
    const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    expect(loadUi(bad).layout).toEqual(freshLayout());
    expect(saveUi(freshUi(), bad)).toBe(false);
  });
  it('adds panels a stored layout does not know and drops ones that are gone', () => {
    const fresh = freshLayout();
    fresh[0].panels = fresh[0].panels.filter(p => p.id !== 'byRole').concat({ id: 'gone', span: 4, open: true });
    const out = sanitizeLayout(fresh);
    const ids = out.flatMap(s => s.panels.map(p => p.id));
    expect(ids).toContain('byRole');
    expect(ids).not.toContain('gone');
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('moves panels across sections, steps them, and moves sections', () => {
    let l = freshLayout();
    l = movePanel(l, 'skills', 'attention', false);
    expect(l[0].panels[0].id).toBe('skills');
    l = movePanel(l, 'skills', null, false, 'sources');
    expect(l.find(s => s.id === 'sources').panels.at(-1).id).toBe('skills');
    const m = moveSection(freshLayout(), 'usage', -1);
    expect(m[0].id).toBe('usage');
    expect(moveSection(freshLayout(), 'agents', -1)[0].id).toBe('agents');
  });
  it('tells the default layout from a changed one', () => {
    const ui = freshUi();
    expect(isDefaultLayout(ui)).toBe(true);
    expect(isDefaultLayout({ ...ui, hidden: ['skills'] })).toBe(false);
    expect(isDefaultLayout({ ...ui, layout: stepPanel(ui.layout, 'byRole', -1) })).toBe(false);
  });
});

describe('table', () => {
  const cols = [{ k: 'a', l: 'Name' }, { k: 'n', l: 'Count', n: true, w: '40px' }, { k: 'x', l: 'Extra', w: '40px' }];
  const row = (id, n, extra = {}) => ({ id, sort: { a: id, n }, cells: { a: { v: id }, n: { v: n ?? 'n/a' }, x: { v: 'e' } }, ...extra });
  it('sorts with null last in both directions', () => {
    const rows = [row('a', 2), row('b', null), row('c', 9)];
    expect(tableModel({ cols, rows, sort: { k: 'n', dir: 'desc' } }).rows.map(r => r.id)).toEqual(['c', 'a', 'b']);
    expect(tableModel({ cols, rows, sort: { k: 'n', dir: 'asc' } }).rows.map(r => r.id)).toEqual(['a', 'c', 'b']);
  });
  it('keeps children under their parent when sorted', () => {
    const rows = [row('p1', 1), row('k1', 99, { level: 1, parentId: 'p1' }), row('p2', 5)];
    expect(tableModel({ cols, rows, tree: true, sort: { k: 'n', dir: 'desc' } }).rows.map(r => r.id)).toEqual(['p2', 'p1', 'k1']);
  });
  it('groups and folds', () => {
    const rows = [row('a', 1, { groupKey: 'g1' }), row('b', 2, { groupKey: 'g2' })];
    const groupRow = (k) => ({ id: k, group: true, folded: k === 'g2', sort: {}, cells: { a: { v: k } } });
    expect(tableModel({ cols, rows, groupRow }).rows.map(r => r.id)).toEqual(['g1', 'a', 'g2']);
  });
  it('limits and reports the total', () => {
    const rows = [row('a', 1), row('b', 2), row('c', 3)];
    const m = tableModel({ cols, rows, limit: 2 });
    expect(m.rows).toHaveLength(2);
    expect(m.limited).toBe(true);
    expect(m.total).toBe(3);
    expect(tableModel({ cols, rows, limit: 2 }, { showAll: true }).rows).toHaveLength(3);
  });
  it('hides columns and keeps headers wide enough for the label', () => {
    const m = tableModel({ cols, rows: [], columns: true }, { hidden: { x: 1 } });
    expect(m.cols.map(c => c.k)).toEqual(['a', 'n']);
    expect(m.cols[1].width).toBe(Math.ceil(5 * 6.6) + 12 + 'px');
    expect(m.colMenu.find(c => c.k === 'x').on).toBe(false);
  });
  it('starts numbers high to low and text low to high', () => {
    expect(nextSort({ k: 'n', n: true }, null).dir).toBe('desc');
    expect(nextSort({ k: 'a' }, null).dir).toBe('asc');
    expect(nextSort({ k: 'n', n: true }, { k: 'n', dir: 'desc' }).dir).toBe('asc');
  });
  it('renders aria-sort, sorts on click, and gives a row a real button', () => {
    const go = vi.fn();
    const def = { cols, rows: [row('a', 1, { go }), row('b', 5, { go })], sort: { k: 'n', dir: 'desc' } };
    const { container, getByRole } = render(html`<${Table} def=${def}/>`);
    const th = container.querySelector('th:nth-child(2)');
    expect(th.getAttribute('aria-sort')).toBe('descending');
    expect(container.querySelector('tbody tr td').textContent).toBe('b');
    fireEvent.click(th.querySelector('button'));
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    expect(container.querySelector('tbody tr td').textContent).toBe('a');
    fireEvent.click(getByRole('button', { name: 'a' }));
    expect(go).toHaveBeenCalledTimes(1);
  });
  it('shows the empty message with no table', () => {
    const { container, getByText } = render(html`<${Table} def=${{ cols, rows: [], none: 'Nothing here.' }}/>`);
    expect(getByText('Nothing here.')).toBeTruthy();
    expect(container.querySelector('table')).toBeNull();
  });
});

describe('chart', () => {
  const starts = [100, 200, 300, 400];
  const base = { starts, bucketS: 100, h: 100, width: 400 };
  it('breaks a line at null', () => {
    const m = chartModel({ ...base, kind: 'line', unit: 'n', series: [{ label: 'x', c: 'c', vals: [1, 2, null, 4] }] });
    expect(m.lines).toHaveLength(2);
    expect(m.lines[0].pts.split(' ')).toHaveLength(2);
    expect(m.lines[1].pts.split(' ')).toHaveLength(2);
  });
  it('stacks without inventing a bar for null', () => {
    const m = chartModel({ ...base, kind: 'stack', unit: 'n', series: [{ label: 'a', c: 'a', vals: [1, null, 3, 4] }, { label: 'b', c: 'b', vals: [1, null, 0, 4] }] });
    expect(m.bars.map(b => b.i)).toEqual([0, 2, 3]);
    expect(m.bars[0].segs).toHaveLength(2);
    expect(bucketTotals('stack', [{ vals: [null, 1] }], 2)).toEqual([null, 1]);
  });
  it('totals the legend over the selected time only, and shows n/a for all null', () => {
    const m = chartModel({ ...base, kind: 'stack', unit: 'n', sel: { a: 2, b: 3 }, series: [{ label: 'a', c: 'a', vals: [10, 10, 3, 4] }, { label: 'b', c: 'b', vals: [null, null, null, null] }] });
    expect(m.legend[0].value).toBe('7');
    expect(m.legend[1].value).toBe('n/a');
    expect(m.bars.find(b => b.i === 0).on).toBe(false);
    expect(m.bars.find(b => b.i === 2).on).toBe(true);
  });
  it('converts between a selected time and bucket indexes', () => {
    expect(indexToSel(2, 1, starts, 100)).toEqual({ since: 200, until: 400 });
    expect(selToIndex({ since: 200, until: 400 }, starts, 100)).toEqual({ a: 1, b: 2 });
    expect(selToIndex({ since: 900, until: 1000 }, starts, 100)).toBeNull();
  });
  it('selects by dragging, and has a keyboard route for the same', () => {
    const onSelect = vi.fn();
    const series = [{ label: 'a', c: 'var(--s1)', vals: [1, 2, 3, 4] }];
    const { container } = render(html`<${Chart} kind="stack" series=${series} unit="n" h=${80} range=${{ bucket_starts: starts, bucket_s: 100 }} sel=${null} onSelect=${onSelect} aria="Tokens"/>`);
    const plot = container.querySelector('.bd-plot');
    plot.getBoundingClientRect = () => ({ left: 0, width: 400, top: 0, height: 80, right: 400, bottom: 80 });
    fireEvent.mouseDown(plot, { clientX: 10, button: 0 });
    fireEvent.mouseMove(plot, { clientX: 250 });
    fireEvent.mouseUp(window);
    expect(onSelect).toHaveBeenLastCalledWith({ since: 100, until: 400 });
    fireEvent.keyDown(plot, { key: 'ArrowLeft' });
    fireEvent.keyDown(plot, { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(plot, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});

describe('filters in the URL', () => {
  it('round trips every filter', () => {
    const f = parseFilters('?range=7d&project=alpha&model=m&status=failed&q=retry&sel=100-200&tools=a,b');
    expect(f).toMatchObject({ range: { id: '7d' }, project: 'alpha', model: 'm', status: 'failed', q: 'retry', sel: { since: 100, until: 200 } });
    expect(filtersToParams(f)).toMatchObject({ range: '7d', project: 'alpha', model: 'm', status: 'failed', q: 'retry', sel: '100-200' });
  });
  it('leaves the default out of the URL and ignores unknown values', () => {
    const f = parseFilters('?range=live&status=nonsense&sel=9-1');
    expect(f.range.id).toBe('24h');
    expect(f.status).toBe('all');
    expect(f.sel).toBeNull();
    expect(filtersToParams(f)).toMatchObject({ range: null, status: null, sel: null });
  });
  it('keeps a custom range', () => {
    const f = parseFilters('?range=custom&since=100&until=500');
    expect(f.range).toEqual({ id: 'custom', since: 100, until: 500 });
    expect(windowOf(f.range)).toMatchObject({ since: 100, until: 500 });
  });
  it('asks the API with the contract names, and none selected selects nothing', () => {
    const f = parseFilters('?project=alpha&q=x');
    const q = new URLSearchParams(boardQuery(f, ['a', 'b'], { since: 1, until: 2, buckets: 3 }));
    expect(Object.fromEntries(q)).toEqual({ since: '1', until: '2', buckets: '3', tool: 'a,b', project: 'alpha', q: 'x' });
    expect(new URLSearchParams(boardQuery(f, [], { since: 1, until: 2 })).get('tool')).toBe('-');
    expect(new URLSearchParams(boardQuery(f, null, { since: 1, until: 2 })).has('tool')).toBe(false);
  });
  it('rounds a preset window so repeat calls can match', () => {
    expect(windowOf({ id: '24h' }, 1000)).toEqual(windowOf({ id: '24h' }, 1001));
    expect(windowOf({ id: '24h' }, 1000).until - windowOf({ id: '24h' }, 1000).since).toBe(86400);
  });
  it('uses the shared tool rule: all selected collapses to no filter', () => {
    expect(nextTools(null, 'a', ['a', 'b'])).toEqual(['b']);
    expect(nextTools(['b'], 'a', ['a', 'b'])).toBeNull();
    expect(canClear(parseFilters(''), null)).toBe(false);
    expect(canClear(parseFilters(''), ['a'])).toBe(true);
  });
  it('sends a chosen filter to the API and the URL, and Back undoes it', async () => {
    const { container, calls } = await mountBoard();
    const projectBtn = () => container.querySelector('[aria-label="Filters"] .bd-anch:nth-child(2) .bd-ctl');
    fireEvent.click(projectBtn());
    fireEvent.click(container.querySelector('.bd-menu').querySelectorAll('button')[1]);
    expect(window.location.search).toContain('project=alpha');
    await waitFor(() => expect(calls.some(c => c.startsWith('/api/board?') && c.includes('project=alpha'))).toBe(true));
    window.history.back();
    await waitFor(() => expect(window.location.search).not.toContain('project='));
    await waitFor(() => expect(projectBtn().textContent).toContain('All'));
  });
  it('clears filters, and Undo brings them back', async () => {
    window.history.replaceState(null, '', '/?project=alpha');
    const { getByText, findByText } = await mountBoard();
    fireEvent.click(getByText('Clear filters'));
    expect(window.location.search).not.toContain('project=');
    fireEvent.click(await findByText('Undo'));
    expect(window.location.search).toContain('project=alpha');
  });
  it('has no second screen: the old shell is gone from the source tree', () => {
    // Guard: the old `?tab=` screens were deleted; nothing may bring them back.
    const src = readdirSync(join(process.cwd(), 'src'));
    expect(src).not.toContain('app.js');
    expect(src).not.toContain('context.js');
    expect(src).not.toContain('dashboard.css');
    expect(src).not.toContain('layoutConfig.js');
    expect(readdirSync(join(process.cwd(), 'src/components')).filter(f => f.endsWith('.js'))).toEqual([]);
  });
  it('routes old links: every `?tab=` lands on the board', () => {
    expect(redirectOf('')).toBeNull();
    expect(redirectOf('?tab=overview')).toBe('');
    expect(redirectOf('?tab=dashboard&range=1h')).toBe('?range=1h');
    expect(redirectOf('?tab=nonsense')).toBe('');
    expect(redirectOf('?tab=explorer')).toBe('');
    expect(redirectOf('?tab=sessions')).toBe('');
    expect(redirectOf('?tab=budget')).toBe('');
  });
});

describe('null display', () => {
  it('formats null as n/a and never as zero', () => {
    for (const f of [fmtN, fmtUsd, fmtMs, fmtDur, fmtShare, fmtRate]) {
      expect(f(null)).toBe('n/a');
      expect(f(undefined)).toBe('n/a');
    }
    expect(fmtLines(null, null)).toBe('n/a');
    expect(fmtN(0)).toBe('0');
    expect(fmtUsd(0)).toBe('$0.00');
  });
  it('leaves a gap in a small trend for null', () => {
    expect(sparkPath([1, null, 3], 60, 16).match(/M/g)).toHaveLength(2);
    expect(sparkPath(null, 60, 16)).toBe('');
  });
  it('shows n/a in KPIs and rows when the API sends null', async () => {
    const board = boardFixture();
    board.kpis.cost_usd = null;
    board.kpis.p95_ms = null;
    const list = kpiList(board);
    expect(list.find(k => k.label === 'Cost').value).toBe('n/a');
    expect(list.find(k => k.label === 'p95 reply').value).toBe('n/a');
    const { container } = await mountBoard(board);
    const done = [...container.querySelectorAll('#p-agentsT tbody tr')].find(tr => tr.textContent.includes('Draft the release notes'));
    expect(done.textContent).toContain('n/a');
  });
  it('fills a response that leaves keys out, so a panel cannot crash', () => {
    const b = normalizeBoard({ kpis: { running: 1 }, agents: null });
    expect(b.agents).toEqual([]);
    expect(b.kpis.prev).toEqual({});
    expect(normalizeBoard(null).projects).toEqual([]);
  });
  it('builds every panel from an empty response', () => {
    const data = normalizeBoard({});
    const ctx = { data, series: {}, range: data.range, chartRange: data.range, sel: null, filters: parseFilters(''), tools: null, toolIds: [], settingToolIds: [], toolName: id => id, nowS: NOW, stopped: {}, findings: { list: [], settings: [] }, actions: {}, query: '' };
    const local = { mode: (k, d) => d, tableView: false, folded: {}, setFold() {} };
    for (const id of PANEL_IDS) expect(() => buildPanel(id, ctx, local, { id })).not.toThrow();
    expect(sectionSummary('usage', data, {}, 0)).toContain('n/a');
  });
  it('puts small series together in one Other series', () => {
    const map = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((k, i) => [k, [i + 1, null]]));
    const s = splitSeries(map, 'project', id => id);
    expect(s).toHaveLength(6);
    expect(s[5].label).toBe('Other (2)');
    expect(s[5].vals).toEqual([3, null]);
  });
});

describe('drawer stack', () => {
  it('opens from a row, goes deeper, and comes back', async () => {
    const { container, findByRole, getByRole, queryByLabelText, findByText } = await mountBoard();
    fireEvent.click(getByRole('button', { name: 'Fix retry logic' }));
    await findByRole('heading', { name: 'Fix retry logic' });
    expect(queryByLabelText('Back')).toBeNull();
    fireEvent.click(await findByRole('tab', { name: 'Changes' }));
    fireEvent.click(await within(container.querySelector('#drawer')).findByRole('button', { name: 'src/client.py' }));
    await findByRole('heading', { name: 'src/client.py' });
    await findByText('deadline = now()');
    expect(container.querySelector('#dr-diff .bd-code')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Back' }));
    await findByRole('heading', { name: 'Fix retry logic' });
    fireEvent.click(getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(container.querySelector('#drawer')).toBeNull());
  });
  it('shows a stop command before it runs, and runs it only on confirm', async () => {
    const { calls, findByRole, getByRole, findByText } = await mountBoard();
    fireEvent.click(getByRole('button', { name: 'Fix retry logic' }));
    fireEvent.click(await findByRole('button', { name: 'Stop' }));
    await findByText('aictl session kill run00001aaaa');
    expect(calls.some(c => c.includes('session-kill'))).toBe(false);
    fireEvent.click(getByRole('button', { name: 'Cancel' }));
    expect(calls.some(c => c.includes('session-kill'))).toBe(false);
    fireEvent.click(await findByRole('button', { name: 'Stop' }));
    fireEvent.click(await findByRole('button', { name: 'Stop agent' }));
    await waitFor(() => expect(calls.some(c => c.includes('session-kill'))).toBe(true));
  });
  it('has no Stop for a subagent', async () => {
    const { findByRole, getByRole, queryByRole } = await mountBoard();
    fireEvent.click(getByRole('button', { name: 'test-runner' }));
    await findByRole('heading', { name: 'test-runner (subagent)' });
    expect(queryByRole('button', { name: 'Stop' })).toBeNull();
  });
  it('Escape closes the top of the stack', async () => {
    const { container, findByRole, getByRole } = await mountBoard();
    fireEvent.click(getByRole('button', { name: 'Fix retry logic' }));
    await findByRole('heading', { name: 'Fix retry logic' });
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(container.querySelector('#drawer')).toBeNull());
  });
  it('says n/a when no diff is stored, and when a prompt text is not stored', async () => {
    const board = boardFixture({ capture_mode: 'metadata' });
    const { findByRole, getByRole, findByText } = await mountBoard(board);
    vi.stubGlobal('fetch', vi.fn(async (u) => (String(u).startsWith('/api/board/file')
      ? jsonResponse({ path: 'x', edits: [], diff: null })
      : jsonResponse({ text: '', project: 'alpha', title: 'Fix', input: null, output: 1, cache_read: 2, reply_ms: 3, tool_calls: 0 }))));
    fireEvent.click(getByRole('button', { name: /^Fix retry logic\. Run/ }));
    await findByText(/not stored, because the capture mode is metadata/);
    await findByRole('heading', { name: 'Prompt' });
    fireEvent.click(getByRole('button', { name: 'src/client.py' }));
    await findByText(/No diff is stored/);
  });
});

describe('findings', () => {
  const audit = {
    counts: { high: 1, medium: 1 },
    sources: [{ tool: 'tool-a', path: 'a.md', loading: 'always', est_tokens: 2100, in_project: false }],
    findings: [
      { rule: 'drift.changed-source', severity: 'medium', tool: 'tool-a', path: 'a.md', why: 'Sent with each call' },
      { rule: 'dynamic.mcp-server', severity: 'high', tool: 'tool-b', path: 'b.json', line: 3, why: 'Adds a server' },
      { rule: 'x.quiet', severity: 'info', tool: 'tool-a', path: 'c' },
    ],
  };
  const effective = { 'tool-a': { tool: 'tool-a', value: 'model-a', source: '~/s.json', line: 88, in_project: false, why_in_effect: 'pin', conflicts: [{ requested: ['model-b'], requested_at: 'r.md:3', pinned: 'model-a' }] } };
  it('keeps the audit rules: info stays out, and the tool filter applies', () => {
    expect(buildFindings({ audit }).filter(f => f.path !== '~/s.json').map(f => f.path)).toEqual(['a.md', 'b.json']);
    expect(buildFindings({ audit, tools: ['tool-b'] }).map(f => f.path)).toEqual(['b.json']);
  });
  it('offers a command only where one exists, and names it', () => {
    const list = buildFindings({ audit, effective, hooks: { tools: { 'tool-a': { tool: 'tool-a', warnings: ['Written by an older aictl'], sources: [{ path: 'h.json' }] } } }, otel: { active: false, last_receive_at: 0 } });
    expect(list.find(f => f.path === 'a.md').command).toBe('aictl ctx audit --update-baseline');
    expect(tailPath('/a/b/c/d/e.md')).toBe('…/c/d/e.md');
    expect(tailPath('x/y.md')).toBe('x/y.md');
    expect(list.find(f => f.path === 'b.json').command).toBeUndefined();
    expect(list.find(f => f.path === '~/s.json').effect).toContain('r.md:3');
    expect(list.find(f => f.id === 'hook|tool-a').command).toBe('aictl hooks repair');
    expect(list.find(f => f.id === 'hook|tool-a').what).toBe('Hook from an older aictl');
    expect(list.find(f => f.id === 'otel').command).toBe('aictl otel enable');
  });
  it('shows a pin conflict once when the audit and the effective models both report it', () => {
    const withConflict = { findings: [{ rule: 'model.pin-conflicts-request', severity: 'high', tools: ['tool-a'], path: 'r.md', line: 3, why: 'Two models' }] };
    const list = buildFindings({ audit: withConflict, effective });
    expect(list.map(f => f.path)).toEqual(['r.md']);
    expect(list[0].what).toBe('Model set elsewhere overrides what this file asks for');
  });
  it('builds values in force from the same data', () => {
    const { rows, note } = buildSettings({ audit, effective, hooks: null, otel: null, toolIds: ['tool-a', 'tool-b'] });
    expect(rows.map(r => r.label)).toEqual(['Model', 'Instructions sent each call']);
    expect(rows[0].values['tool-a'].warn).toBe(true);
    expect(rows[1].values['tool-a'].v).toBe('1 file, ~2.1 k tokens');
    expect(note).toContain('r.md:3');
  });
  it('counts instructions registered under the generic copilot tool for every Copilot tool', () => {
    const sources = [
      { tool: 'copilot', path: '/p/.github/copilot-instructions.md', loading: 'always', est_tokens: 2227, in_project: true },
      { tool: 'copilot-cli', path: '/h/.copilot/copilot-instructions.md', loading: 'always', est_tokens: 253, in_project: false },
      { tool: 'copilot', path: '/p/.github/instructions/a.instructions.md', loading: 'conditional', est_tokens: 300, in_project: true },
    ];
    const { rows } = buildSettings({ audit: { sources }, toolIds: ['copilot-cli', 'copilot-vscode', 'claude-code'] });
    const row = rows.find(r => r.label === 'Instructions sent each call');
    expect(row.values['copilot-cli'].v).toBe('2 files, ~2.5 k tokens');
    expect(row.values['copilot-vscode'].v).toBe('1 file, ~2.2 k tokens');
    expect(row.values['claude-code']).toBeUndefined();
    expect(row.values['copilot-cli'].v).toMatch(/~.*tokens$/);
  });
  it('shows the Claude model with the Copilot models, and a missing pin as no pin', () => {
    const eff = {
      'claude-code': { tool: 'claude-code', value: 'opus', source: '/h/.claude/settings.json', line: 4, conflicts: [] },
      'copilot-cli': { tool: 'copilot-cli', value: '', source: '', line: 0, why_in_effect: 'No file pins a model', conflicts: [] },
    };
    const { rows } = buildSettings({ effective: eff, toolIds: [] });
    const model = rows.find(r => r.label === 'Model').values;
    expect(model['claude-code'].v).toBe('opus');
    expect(model['copilot-cli'].v).toBe('No pin');
  });
});

describe('prompt files and coverage notes', () => {
  const ctxFor = (data) => ({ data, series: {}, range: data.range, chartRange: data.range, sel: null, filters: parseFilters(''), tools: null, toolIds: ['copilot-vscode', 'copilot365'], settingToolIds: [], toolName: x => x, nowS: NOW, stopped: {}, findings: { list: [], settings: [] }, actions: {} });
  it('names the folders it searched when it finds no prompt file', () => {
    const data = boardFixture();
    data.project_prompts = [];
    data.project_prompts_searched = ['/p/.github/prompts', '~/.claude/commands'];
    const { table } = buildPanel('pprompts', ctxFor(data));
    expect(table.none).toContain('/p/.github/prompts');
    expect(table.none).toContain('~/.claude/commands');
  });
  it('says plainly when there is no folder to search', () => {
    const data = boardFixture();
    data.project_prompts = [];
    data.project_prompts_searched = [];
    expect(buildPanel('pprompts', ctxFor(data)).table.none).toContain('No project folder');
  });
  it('shows the history limit of the tools on screen in the coverage note', () => {
    const data = boardFixture();
    data.coverage = { rows: [], notes: [{ tool: 'copilot-vscode', text: 'VS Code limit text.' }, { tool: 'claude-code', text: 'Not shown.' }] };
    const { note } = buildPanel('coverage', ctxFor(data));
    expect(note).toContain('VS Code limit text.');
    expect(note).not.toContain('Not shown.');
  });
});

describe('guards', () => {
  const dir = join(process.cwd(), 'src/components/board');
  const files = readdirSync(dir).filter(f => f.endsWith('.js'));
  it('has no hardcoded color in a component', () => {
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(/);
    }
  });
  it('does not load ECharts or uPlot on this screen', () => {
    for (const f of files) expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/echarts|uplot/i);
  });
  it('keeps old links resolving', () => {
    expect(redirectOf('?tab=events-stats')).toBe('');
    // Configuration became the board's Settings screen, under its old names too.
    expect(redirectOf('?tab=configuration')).toBe('?screen=settings');
    expect(redirectOf('?tab=config')).toBe('?screen=settings');
  });
  it('opens a skill from its row and shows its scope', () => {
    const opened = [];
    const data = boardFixture();
    data.skills = [{ name: 'run-tests', uses: 4, tokens: 7000, agents: 2, scope: 'user', path: '/home/me/.claude/skills/run-tests/SKILL.md', description: 'Runs tests' }, { name: 'gone', uses: 1, tokens: null, agents: 1, scope: null, path: null, description: null }];
    const ctx = { data, series: {}, range: data.range, chartRange: data.range, sel: null, filters: parseFilters(''), tools: null, toolIds: [], settingToolIds: [], toolName: x => x, nowS: NOW, stopped: {}, findings: { list: [], settings: [] }, actions: { openDrawer: d => opened.push(d) } };
    const { table } = buildPanel('skills', ctx);
    table.rows[0].go();
    expect(opened[0]).toMatchObject({ type: 'skill', name: 'run-tests' });
    expect(table.rows[0].cells.sc.v).toBe('user');
    expect(table.rows[0].cells.s.title).toContain('Runs tests');
    expect(table.rows[1].cells.sc.v).toBe('No file');
  });
  it('shows hidden context on the board, not on an old screen', () => {
    expect(redirectOf('?tab=hidden')).toBeNull();
  });
  it('counts only listed tools when a saved choice names more', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(toolFilterLabel(six, ['a'], x => x)).toBe('All 1');
    expect(listedTools(six, ['a'])).toBe(null);
    expect(toolFilterLabel(['a', 'd'], ['a', 'b'], x => x)).toBe('a');
    expect(toolFilterLabel(['z'], ['a', 'b'], x => x)).toBe('None');
    expect(toolFilterLabel(null, ['a', 'b'], x => x)).toBe('All 2');
    expect(nextTools(['a', 'z'], 'b', ['a', 'b'])).toBe(null);
  });
});

describe('board screen', () => {
  it('renders all panels of the default layout in order, with the rail summaries', async () => {
    const { container, getByText } = await mountBoard();
    for (const sec of freshLayout()) for (const p of sec.panels) expect(container.querySelector('#p-' + p.id), p.id).toBeTruthy();
    expect(container.querySelector('a[href^="?tab="]')).toBeNull();
    expect(container.querySelector('.bd-navi.bd-alert').textContent).toContain('2 running, 1 subagents');
    expect(container.querySelector('#sec-resources .bd-sect').textContent).toBe('Machine');
    expect(container.querySelector('.bd-navi[href="#sec-resources"]').textContent).toContain('2 alerts');
    expect(container.querySelectorAll('.bd-kpi')).toHaveLength(9);
    expect(container.querySelector('canvas')).toBeNull();
  });
  it('folds a panel, hides it, restores it, and resets with Undo', async () => {
    const { container, findByText, getByRole, getByText } = await mountBoard();
    fireEvent.click(container.querySelector('#p-skills [aria-label="Fold this panel"]'));
    expect(container.querySelector('#p-skills .bd-pb')).toBeNull();
    fireEvent.click(getByRole('button', { name: 'Options for Skills used' }));
    fireEvent.click(getByText('Hide this panel'));
    expect(container.querySelector('#p-skills')).toBeNull();
    fireEvent.click(await findByText('Undo'));
    expect(container.querySelector('#p-skills')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Options for Skills used' }));
    fireEvent.click(getByText('Move earlier'));
    expect(container.querySelector('.bd-ctl[aria-expanded]').textContent).toContain('Layout');
    expect(getByText('Changed')).toBeTruthy();
    fireEvent.click(getByText('Changed').closest('button'));
    fireEvent.click(getByText('Reset to the default layout'));
    expect(container.querySelector('#p-skills .bd-pb')).toBeTruthy();
    fireEvent.click(await findByText('Undo'));
    expect(container.querySelector('#p-skills .bd-pb')).toBeNull();
  });
  it('moves a panel by dragging its header, across sections', async () => {
    const { container } = await mountBoard();
    const head = container.querySelector('#p-skills .bd-ph');
    const target = container.querySelector('#p-attention');
    const dataTransfer = { setData() {}, effectAllowed: '' };
    fireEvent.dragStart(head, { dataTransfer });
    await act(async () => {});
    fireEvent.dragOver(target, { dataTransfer, clientX: 0 });
    await waitFor(() => expect(target.className).toContain('bd-over-before'));
    fireEvent.drop(target, { dataTransfer, clientX: 0 });
    await waitFor(() => expect(container.querySelector('#sec-agents #p-skills')).toBeTruthy());
  });
  it('has a keyboard route to another section and to a taller panel', async () => {
    const { container, getByRole, getByText } = await mountBoard();
    fireEvent.click(getByRole('button', { name: 'Options for Skills used' }));
    fireEvent.click(getByRole('button', { name: 'Make taller' }));
    expect(container.querySelector('#p-skills .bd-pb').style.height).not.toBe('auto');
    expect(getByText('Move to a section')).toBeTruthy();
    fireEvent.click(within(container.querySelector('#p-skills .bd-menu')).getByRole('button', { name: 'Agents' }));
    await waitFor(() => expect(container.querySelector('#sec-agents #p-skills')).toBeTruthy());
  });
  it('remembers column choices and shows columns chosen', async () => {
    const { container, getByRole } = await mountBoard();
    expect(container.querySelector('#p-agentsT').textContent).not.toContain('Activity');
    fireEvent.click(getByRole('button', { name: 'Options for Agents and subagents' }));
    fireEvent.click(getByRole('menuitemcheckbox', { name: 'Activity' }));
    expect(container.querySelector('#p-agentsT thead').textContent).toContain('Activity');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(LS_KEY)).hiddenCols.agentsT.spark).toBe(0));
  });
  it('groups agents, and folds subagents', async () => {
    const { container, getByRole, findByText } = await mountBoard();
    expect(container.querySelector('#p-agentsT').textContent).toContain('test-runner');
    fireEvent.click(getByRole('button', { name: 'Fold subagents' }));
    expect(container.querySelector('#p-agentsT tbody').textContent).not.toContain('test-runner');
    const seg = container.querySelector('#p-agentsT .bd-seg');
    fireEvent.click(seg.querySelectorAll('button')[1]);
    await findByText('alpha', { selector: '.bd-group .bd-lnk, .bd-group .bd-tx' });
  });
  it('shows a chart as a table, with No data for a null bucket', async () => {
    const { container, getByRole } = await mountBoard();
    fireEvent.click(getByRole('button', { name: 'Options for Cache hit rate' }));
    fireEvent.click(getByRole('button', { name: 'Show as table' }));
    await waitFor(() => expect(container.querySelector('#p-cacheRate table')).toBeTruthy());
    expect(container.querySelector('#p-cacheRate .bd-chart')).toBeNull();
    await within(container.querySelector('#p-cacheRate')).findAllByText('No data');
  });
  it('keeps the old data on screen and says so when a refresh fails', async () => {
    const { container, getByRole } = await mountBoard();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 500)));
    fireEvent.click(getByRole('button', { name: '7 d' }));
    await waitFor(() => expect(container.querySelector('.bd-banner')).toBeTruthy());
    expect(container.querySelector('#p-agentsT tbody').textContent).toContain('Fix retry logic');
  });
  it('turns stream messages into at most one fetch per tick, and none when paused', async () => {
    const { calls } = await mountBoard();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      cleanup();
      const view = render(html`<${BoardScreen}/>`);
      await waitFor(() => expect(view.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
      const es = FakeES.last;
      await act(async () => { es.onopen(); });
      const boardCalls = () => calls.filter(c => c.startsWith('/api/board?')).length;
      const before = boardCalls();
      await act(async () => { vi.advanceTimersByTime(5000); });
      expect(boardCalls()).toBe(before);
      await act(async () => {
        for (let i = 0; i < 5; i++) es.onmessage({ data: '{}' });
        vi.advanceTimersByTime(5000);
      });
      expect(boardCalls()).toBe(before + 1);
      await act(async () => { vi.advanceTimersByTime(5000); });
      expect(boardCalls()).toBe(before + 1);
      fireEvent.click(view.getByRole('button', { name: 'Live' }));
      await act(async () => { es.onmessage({ data: '{}' }); vi.advanceTimersByTime(15000); });
      expect(boardCalls()).toBe(before + 1);
    } finally {
      vi.useRealTimers();
    }
  });
  it('makes a conditional request, and a 304 keeps the data', async () => {
    const seen = [];
    const fn = vi.fn(async (url, opts) => {
      const u = String(url);
      if (!u.startsWith('/api/board')) return jsonResponse({});
      seen.push(opts?.headers?.['If-None-Match'] || null);
      return seen.length > 1 ? new Response(null, { status: 304 }) : jsonResponse(boardFixture(), 200, { ETag: '"abc"' });
    });
    vi.stubGlobal('fetch', fn);
    const view = render(html`<${BoardScreen}/>`);
    await waitFor(() => expect(view.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
    const { getBoard } = await import('../src/api.js');
    expect((await getBoard('q', { etag: '"abc"' })).status).toBe(304);
    expect(seen.at(-1)).toBe('"abc"');
    expect(view.container.querySelector('#p-agentsT tbody').textContent).toContain('Fix retry logic');
  });
  it('passes the accessibility rules that apply without a browser', async () => {
    const { container } = await mountBoard();
    const res = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'landmark-unique': { enabled: false }, 'scrollable-region-focusable': { enabled: false } } });
    expect(res.violations.map(v => v.id + ': ' + v.nodes[0].html.slice(0, 120))).toEqual([]);
  }, 30000);
});

describe('rows with no session data', () => {
  const placeholder = { id: 'live:t:/p', title: 't, no session data yet', status: 'running', tool: 't', project: '/p', placeholder: true };
  const ctxWith = (agents, processes = []) => ({
    data: { agents, processes }, stopped: {}, nowS: 1000, toolName: id => id, actions: { openDrawer: () => {} }, filters: {},
  });
  const local = { mode: (_k, d) => d, folded: {}, setFold: () => {} };

  it('stay out of the agents table and are counted in its subtitle', () => {
    const p = buildPanel('agentsT', ctxWith([placeholder]), local, { id: 'agentsT' });
    expect(p.table.rows).toHaveLength(0);
    expect(p.sub).toContain('1 with processes only');
  });

  it('have no detail to open from the processes table', () => {
    const proc = { name: 'node', pid: 1, tool: 't', agent_id: placeholder.id, title: placeholder.title, cpu_percent: 1, mem_mb: 1 };
    const p = buildPanel('procs', ctxWith([placeholder], [proc]), local, { id: 'procs' });
    expect(p.table.rows[0].go).toBeNull();
  });
});

describe('hidden-context scan', () => {
  it('keeps asking while the scan runs, and reports each step', async () => {
    const { getContextAudit } = await import('../src/api.js');
    const answers = [{ status: 'scanning', step: 'project tree', elapsed_s: 1 }, { status: 'scanning', step: 'models in force', elapsed_s: 2 }, { findings: [] }];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(answers.shift()), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const seen = [];
    const result = await getContextAudit(true, s => seen.push(s.step), { pollMs: 1 });
    vi.unstubAllGlobals();
    expect(result).toEqual({ findings: [] });
    expect(seen).toEqual(['project tree', 'models in force']);
    expect(fetchMock.mock.calls[0][0]).toContain('nowait=1&refresh=1');
    expect(fetchMock.mock.calls[1][0]).not.toContain('refresh=1');
  });

  it('turns a failed scan into an error', async () => {
    const { getContextAudit } = await import('../src/api.js');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'OSError: disk gone' }), { headers: { 'Content-Type': 'application/json' } })));
    await expect(getContextAudit()).rejects.toThrow('disk gone');
    vi.unstubAllGlobals();
  });
});

describe('cost panel and partial bucket', () => {
  const ctxFor = (extra) => {
    const data = normalizeBoard({ kpis: { cost_usd: 12.5 }, ...extra });
    return { data, series: { cost: { by_tool: {} } }, range: data.range, chartRange: data.range, sel: null, filters: parseFilters(''), tools: null, toolIds: [], settingToolIds: [], toolName: id => id, nowS: NOW, stopped: {}, findings: { list: [], settings: [] }, actions: {}, query: '' };
  };
  const local = { mode: (k, d) => d, tableView: false, folded: {}, setFold() {} };

  it('shows the tokens that have no price next to the cost, with the model names on hover', () => {
    const p = buildPanel('cost', ctxFor({ unpriced: { tokens: 105000, share: 0.1, models: [{ model: 'no-such-model', tokens: 100000 }, { model: 'other', tokens: 5000 }] } }), local, { id: 'cost' });
    expect(p.sub).toContain('105 k tokens that have no price');
    const stat = p.stats.find(s => s.label === 'No price');
    expect(stat.value).toBe('105 k');
    expect(stat.sub).toBe('2 models');
    expect(stat.title).toContain('no-such-model 100 k');
  });
  it('says nothing about prices when every token has one', () => {
    const p = buildPanel('cost', ctxFor({ unpriced: { tokens: 0, share: 0, models: [] } }), local, { id: 'cost' });
    expect(p.sub).not.toContain('no price');
    expect(p.stats).toBeUndefined();
  });
  it('shows Copilot credits as credits, not dollars, and n/a when they are not known', () => {
    const shown = buildPanel('cost', ctxFor({ credits: { amount: 5423.85, unit: 'ai_credits', by_tool: {}, approximate: false } }), local, { id: 'cost' });
    const stat = shown.stats.find(s => s.label === 'Copilot credits');
    expect(stat.value).toBe('5,423.85');
    expect(stat.value).not.toContain('$');
    const unknown = buildPanel('cost', ctxFor({ credits: { amount: null, unit: 'ai_credits', by_tool: {}, approximate: false } }), local, { id: 'cost' });
    expect(unknown.stats.find(s => s.label === 'Copilot credits').value).toBe('n/a');
    expect(buildPanel('cost', ctxFor({ credits: null }), local, { id: 'cost' }).stats).toBeUndefined();
  });
  it('marks the last bucket as not over yet in the bars, the tooltip and the table view', () => {
    const starts = [100, 200, 300];
    const series = [{ label: 'a', c: 'var(--s1)', vals: [1, 2, 3] }];
    const m = chartModel({ starts, bucketS: 100, h: 100, width: 300, kind: 'stack', unit: 'n', series, partial: 2 });
    expect(m.bars.map(b => b.partial)).toEqual([false, false, true]);
    expect(tipFor(2, 'stack', series, starts, 100, m.fmt, m.totals, 2).title).toContain('(not over yet)');
    expect(tipFor(1, 'stack', series, starts, 100, m.fmt, m.totals, 2).title).not.toContain('not over yet');
    const ctx = ctxFor({ range: { since: 100, until: 400, bucket_s: 100, bucket_starts: starts, partial_bucket: 2 } });
    ctx.series = { tokens: { cache_read: [1, 2, 3], input: [1, 2, 3], cache_write: [1, 2, 3], output: [1, 2, 3] } };
    const table = buildPanel('tokens', ctx, { ...local, tableView: true }, { id: 'tokens' }).table;
    expect(table.rows.map(r => r.cells.b.v.endsWith('(not over yet)'))).toEqual([false, false, true]);
  });
  it('draws the partial bar with the partial class', () => {
    const starts = [100, 200];
    const series = [{ label: 'a', c: 'var(--s1)', vals: [1, 2] }];
    const { container } = render(html`<${Chart} kind="stack" series=${series} unit="n" h=${80} range=${{ bucket_starts: starts, bucket_s: 100, partial_bucket: 1 }} sel=${null} aria="Tokens"/>`);
    expect(container.querySelectorAll('g.bd-partial')).toHaveLength(1);
  });
});
