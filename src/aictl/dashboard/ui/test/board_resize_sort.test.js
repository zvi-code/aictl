// Every board table sorts by any column it shows, column borders and the side panel's
// edge can be dragged, and the widths stay in this browser.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/preact';
import { html } from 'htm/preact';
import Drawer from '../src/components/board/Drawer.js';
import Table from '../src/components/board/Table.js';
import { parseFilters } from '../src/components/board/filters.js';
import { PANEL_IDS, buildPanel } from '../src/components/board/panels.js';
import { sortValue, tableModel } from '../src/components/board/tableModel.js';
import { normalizeBoard } from '../src/components/board/useBoardData.js';
import { NOW, boardFixture, machineFixture } from './fixtures/board.fixture.js';

// jsdom's localStorage is an empty object in this project's vitest setup.
if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const def = () => ({
  cols: [{ k: 'name', l: 'Name', w: '120px' }, { k: 'n', l: 'Count', n: true, w: '60px' }, { k: 'note', l: 'Note' }, { k: 'spark', l: 'Trend', w: '70px' }],
  rows: [
    { id: 'a', sort: { name: 'alpha', n: 3 }, cells: { name: { v: 'alpha' }, n: { v: '3' }, note: { v: 'Zulu' }, spark: { spark: 'M0 0' } } },
    { id: 'b', sort: { name: 'beta', n: 10 }, cells: { name: { v: 'beta' }, n: { v: '10' }, note: { v: 'echo' }, spark: { spark: 'M0 0' } } },
    { id: 'c', sort: { name: 'gamma', n: 1 }, cells: { name: { v: 'gamma' }, n: { v: '1' }, note: { v: '' }, spark: { spark: 'M0 0' } } },
  ],
});

const order = container => [...container.querySelectorAll('tbody tr')].map(tr => tr.querySelector('td').textContent);

describe('sorting', () => {
  it('sorts a column with no sort value by the text its cells show, empty last', () => {
    const m = tableModel(def(), { sort: { k: 'note', dir: 'asc' } });
    expect(m.rows.map(r => r.id)).toEqual(['b', 'a', 'c']);
    expect(sortValue(def().rows[0], 'note')).toBe('zulu');
  });

  it('sorts by the number behind a formatted cell, not its text', () => {
    const m = tableModel(def(), { sort: { k: 'n', dir: 'desc' } });
    expect(m.rows.map(r => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('a click on any header sorts by it and a second click reverses', () => {
    const { container, getByRole } = render(html`<${Table} def=${def()} label="T"/>`);
    fireEvent.click(getByRole('button', { name: /Note/ }));
    expect(order(container)).toEqual(['beta', 'alpha', 'gamma']);
    fireEvent.click(getByRole('button', { name: /Note/ }));
    expect(order(container)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('a column of pictures only says it does not sort instead of doing nothing', () => {
    const { container, queryByRole } = render(html`<${Table} def=${def()} label="T"/>`);
    expect(queryByRole('button', { name: /Trend/ })).toBeNull();
    expect(container.querySelector('th[data-col="spark"] .bd-thx').title).toContain('does not sort');
  });

  it('every column of every board table sorts, except trend pictures', () => {
    const data = normalizeBoard({ ...boardFixture(), machine: machineFixture() });
    const ctx = { data, series: {}, range: data.range, chartRange: data.range, sel: null, filters: parseFilters(''), tools: null, toolIds: [], settingToolIds: [], toolName: x => x, nowS: NOW, stopped: {}, findings: { list: [], settings: [] }, actions: {}, query: '' };
    const local = { mode: (k, d) => d, tableView: false, folded: {}, setFold() {} };
    const unsortable = [];
    for (const id of PANEL_IDS) {
      const t = buildPanel(id, ctx, local, { id })?.table;
      if (!t || !t.rows.length) continue;
      for (const c of tableModel(t).cols) {
        if (!c.sortable && c.k !== 'spark') unsortable.push(id + '.' + c.k);
      }
    }
    expect(unsortable).toEqual([]);
  });
});

describe('column widths', () => {
  it('a saved width lays the table out at exactly the saved widths', () => {
    localStorage.setItem('aictl.colw.T', JSON.stringify({ name: 200, n: 50, note: 90, spark: 70 }));
    const { container } = render(html`<${Table} def=${def()} label="T"/>`);
    const table = container.querySelector('table');
    expect(table.style.tableLayout).toBe('fixed');
    expect(table.style.width).toBe('410px');
    expect(container.querySelector('th[data-col="name"]').style.width).toBe('200px');
  });

  it('the arrow keys on a column border change its width and keep it', () => {
    const { container } = render(html`<${Table} def=${def()} label="T"/>`);
    const grip = container.querySelector('th[data-col="name"] .bd-colgrip');
    fireEvent.keyDown(grip, { key: 'ArrowRight' });
    const saved = JSON.parse(localStorage.getItem('aictl.colw.T'));
    // jsdom draws nothing, so the first change starts from the fallback width.
    expect(saved.name).toBe(110);
    expect(container.querySelector('th[data-col="name"]').style.width).toBe('110px');
  });

  it('dragging a column border changes its width', () => {
    const { container } = render(html`<${Table} def=${def()} label="T"/>`);
    const grip = container.querySelector('th[data-col="n"] .bd-colgrip');
    fireEvent.pointerDown(grip, { button: 0, clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 160 });
    fireEvent.pointerUp(window, { clientX: 160 });
    expect(JSON.parse(localStorage.getItem('aictl.colw.T')).n).toBe(160);
  });

  it('a double-click on a border resets the widths of the table', () => {
    localStorage.setItem('aictl.colw.T', JSON.stringify({ name: 200 }));
    const { container } = render(html`<${Table} def=${def()} label="T"/>`);
    fireEvent.dblClick(container.querySelector('th[data-col="name"] .bd-colgrip'));
    expect(localStorage.getItem('aictl.colw.T')).toBeNull();
    expect(container.querySelector('table').style.tableLayout).toBe('');
  });

  it('a click on a border does not sort the column', () => {
    const { container } = render(html`<${Table} def=${def()} label="T"/>`);
    const before = order(container);
    fireEvent.click(container.querySelector('th[data-col="note"] .bd-colgrip'));
    expect(order(container)).toEqual(before);
  });
});

describe('side panel width', () => {
  const mount = () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ path: '/p/a.md', edits: [], diff: null }), text: async () => '{}', headers: new Headers() })));
    const act = { openDrawer: vi.fn(), drawerBack: vi.fn(), drawerClose: vi.fn(), copy: vi.fn(), runCommand: vi.fn() };
    const ctx = { data: { agents: [], capture_mode: 'full' }, stopped: {}, toolName: x => x, refreshKey: 1, query: '' };
    return render(html`<${Drawer} stack=${[{ type: 'file', path: '/p/a.md' }]} ctx=${ctx} act=${act}/>`);
  };

  it('opens at the width saved last time', () => {
    localStorage.setItem('aictl.drawerWidth', '700');
    vi.stubGlobal('innerWidth', 1600);
    const { container } = mount();
    expect(container.querySelector('aside').style.getPropertyValue('--drw')).toBe('700px');
  });

  it('the arrow keys on its edge widen it and keep the width; a double-click resets it', () => {
    vi.stubGlobal('innerWidth', 1600);
    localStorage.setItem('aictl.drawerWidth', '600');
    const { container, getByRole } = mount();
    const grip = getByRole('separator', { name: /side panel/ });
    fireEvent.keyDown(grip, { key: 'ArrowLeft' });
    expect(localStorage.getItem('aictl.drawerWidth')).toBe('620');
    expect(container.querySelector('aside').style.getPropertyValue('--drw')).toBe('620px');
    fireEvent.dblClick(grip);
    expect(localStorage.getItem('aictl.drawerWidth')).toBeNull();
    expect(container.querySelector('aside').style.getPropertyValue('--drw')).toBe('');
  });

  it('never leaves the board narrower than it can show', () => {
    vi.stubGlobal('innerWidth', 1000);
    localStorage.setItem('aictl.drawerWidth', '900');
    const { container } = mount();
    expect(container.querySelector('aside').style.getPropertyValue('--drw')).toBe('640px');
  });
});

describe('grip placement', () => {
  // A sticky header cell is its own layer: a grip that reaches into the next cell sits
  // under that cell and cannot be grabbed. jsdom does no layout, so check the rules.
  it('keeps every column grip inside its own header cell', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = join(__dirname, '..', 'src', 'components');
    for (const file of ['board/board.css', 'settings/settings.css']) {
      const css = readFileSync(join(root, file), 'utf8');
      const rules = css.split('}').filter(r => r.includes('.bd-colgrip') && /\bright\s*:/.test(r));
      expect(rules.length, file).toBeGreaterThan(0);
      for (const r of rules) expect(r, file).not.toMatch(/right\s*:\s*-/);
    }
  });
});
