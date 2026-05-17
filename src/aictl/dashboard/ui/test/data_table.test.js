import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';

import DataTable from '../src/components/ui/DataTable.js';

// Node 22's native localStorage is unconfigured under vitest 4 — polyfill.
beforeAll(() => {
  if (typeof window === 'undefined') return;
  if (typeof window.localStorage?.setItem !== 'function') {
    const store = new Map();
    const fake = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      clear: () => store.clear(),
      key: (i) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    };
    try { Object.defineProperty(window, 'localStorage', { value: fake, configurable: true }); } catch { /* ignore */ }
  }
});

afterEach(() => cleanup());

const sampleCols = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age',  header: 'Age', align: 'right' },
];
const sampleData = [
  { id: 'a', name: 'Alice', age: 30 },
  { id: 'b', name: 'Bob',   age: 25 },
  { id: 'c', name: 'Carol', age: 40 },
];

describe('DataTable — rendering', () => {
  it('renders rows from data', () => {
    const { getAllByRole, getByText } = render(html`<${DataTable} data=${sampleData} columns=${sampleCols}/>`);
    // header row + 3 body rows
    expect(getAllByRole('row').length).toBe(4);
    expect(getByText('Alice')).toBeInTheDocument();
    expect(getByText('Bob')).toBeInTheDocument();
    expect(getByText('Carol')).toBeInTheDocument();
  });

  it('renders cell via custom cell fn', () => {
    const cols = [
      { accessorKey: 'name', header: 'Name', cell: (v) => html`<b>${v}!</b>` },
    ];
    const { getByText } = render(html`<${DataTable} data=${sampleData} columns=${cols}/>`);
    expect(getByText('Alice!')).toBeInTheDocument();
  });
});

describe('DataTable — sort', () => {
  it('clicks header to sort asc then desc then unsorted', () => {
    const { getAllByRole, getByText } = render(
      html`<${DataTable} data=${sampleData} columns=${sampleCols}/>`
    );
    const ageHeader = getByText('Age');
    // First click -> asc
    fireEvent.click(ageHeader);
    let rows = getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Bob');    // 25
    expect(rows[2].textContent).toContain('Carol');  // 40
    // asc aria-sort on th
    const th = getAllByRole('columnheader')[1];
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    // Second click -> desc
    fireEvent.click(ageHeader);
    rows = getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Carol');
    expect(getAllByRole('columnheader')[1].getAttribute('aria-sort')).toBe('descending');
    // Third click -> unsorted
    fireEvent.click(ageHeader);
    expect(getAllByRole('columnheader')[1].getAttribute('aria-sort')).toBe('none');
  });
});

describe('DataTable — onRowClick', () => {
  it('fires onRowClick with row original', () => {
    const fn = vi.fn();
    const { getAllByRole } = render(
      html`<${DataTable} data=${sampleData} columns=${sampleCols} onRowClick=${fn}/>`
    );
    fireEvent.click(getAllByRole('row')[1]);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0][0]).toEqual(sampleData[0]);
  });
});

describe('DataTable — empty state', () => {
  it('renders emptyState when data is empty', () => {
    const { getByText } = render(
      html`<${DataTable} data=${[]} columns=${sampleCols} emptyState="Nothing here"/>`
    );
    expect(getByText('Nothing here')).toBeInTheDocument();
  });
});

describe('DataTable — loading', () => {
  it('renders skeleton rows when loading', () => {
    const { container } = render(
      html`<${DataTable} data=${[]} columns=${sampleCols} loading=${true}/>`
    );
    const skels = container.querySelectorAll('.aictl-dt__skel-row');
    expect(skels.length).toBeGreaterThan(0);
  });
});

describe('DataTable — expandable', () => {
  it('expander click renders sub-row', () => {
    const renderSubRow = (row) => html`<div>sub-${row.name}</div>`;
    const { getAllByRole, queryByText } = render(
      html`<${DataTable} data=${sampleData} columns=${sampleCols}
        expandable=${{ renderSubRow }}/>`
    );
    expect(queryByText('sub-Alice')).toBeNull();
    const expanders = getAllByRole('button').filter(b =>
      b.getAttribute('aria-label')?.includes('xpand')
    );
    expect(expanders.length).toBe(3);
    fireEvent.click(expanders[0]);
    expect(queryByText('sub-Alice')).toBeInTheDocument();
  });
});

describe('DataTable — keyboard', () => {
  it('ArrowDown moves focus to next row and Enter fires onRowClick', () => {
    const fn = vi.fn();
    const { getAllByRole } = render(
      html`<${DataTable} data=${sampleData} columns=${sampleCols} onRowClick=${fn}/>`
    );
    const rows = getAllByRole('row').slice(1);
    rows[0].focus();
    fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
    // Our handler calls rowRefs.current[1].focus(); assert the 2nd row is focused
    expect(document.activeElement).toBe(rows[1]);
    fireEvent.keyDown(rows[1], { key: 'Enter' });
    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0][0]).toEqual(sampleData[1]);
  });
});

describe('DataTable — column resize persistence', () => {
  beforeEach(() => {
    try { window.localStorage.removeItem('aictl-dt:test-key'); } catch { /* noop */ }
  });
  it('drag on resizer persists width to localStorage when persistKey set', () => {
    const { container } = render(
      html`<${DataTable} data=${sampleData} columns=${sampleCols} persistKey="test-key"/>`
    );
    const resizer = container.querySelector('.aictl-dt__resizer');
    expect(resizer).toBeTruthy();
    fireEvent.mouseDown(resizer, { clientX: 100 });
    fireEvent(window, new MouseEvent('mousemove', { clientX: 180 }));
    fireEvent(window, new MouseEvent('mouseup', {}));
    const persisted = JSON.parse(window.localStorage.getItem('aictl-dt:test-key') || '{}');
    expect(persisted.columnSizing).toBeTruthy();
    const widths = Object.values(persisted.columnSizing);
    expect(widths.length).toBeGreaterThan(0);
    expect(widths[0]).toBeGreaterThan(40);
  });
});
