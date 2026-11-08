// ─── Sort and column widths shared by every settings table ─
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { nextSort } from '../board/tableModel.js';
import { useColumnWidths } from '../board/colWidths.js';

// A column is {k, l, get, n?, cls?}: k its key, l its header, get(row) the value
// to sort by (number, timestamp or plain text; undefined when there is none).
// A column with no get is not sortable. Rows with no value go last either way.
const noValue = v => v == null || v === '' || (typeof v === 'number' && Number.isNaN(v));

/** True when every value that exists is a number: such a column starts high to low. */
export function numeric(rows, get) {
  const vals = rows.map(get).filter(v => !noValue(v));
  return vals.length > 0 && vals.every(v => typeof v === 'number');
}

/** *rows* in the order *sort* asks for by column *col*; the same list when it asks for another column. */
export function sortRows(rows, col, sort) {
  if (!sort || !col || !col.get || sort.k !== col.k) return rows;
  const d = sort.dir === 'asc' ? 1 : -1;
  const keyed = rows.map((r, i) => ({ r, i, v: col.get(r) }));
  keyed.sort((a, b) => {
    const ea = noValue(a.v);
    const eb = noValue(b.v);
    if (ea || eb) return ea && eb ? a.i - b.i : (ea ? 1 : -1);
    const c = typeof a.v === 'number' && typeof b.v === 'number' ? a.v - b.v
      : String(a.v).localeCompare(String(b.v), undefined, { numeric: true, sensitivity: 'base' });
    return c ? c * d : a.i - b.i;
  });
  return keyed.map(x => x.r);
}

/** Widths and sort state for several tables that show the same columns, such as one tool's runs of sections. */
export function useShared(id) {
  const cw = useColumnWidths(id);
  const [sort, setSort] = useState(null);
  return { cw, sort, setSort };
}

/** Sort state and dragged widths of one table with columns *cols*: {order(rows), th(col), tableProps}.
 * Pass the result of useShared for *shared* when several tables must sort and resize together. */
export function useGrid(id, cols, shared = null) {
  const own = useShared(id);
  const { cw, sort, setSort } = shared || own;
  const by = sort && cols.find(c => c.k === sort.k);
  const order = rows => sortRows(rows, by, sort);
  const style = cw.set ? { tableLayout: 'fixed', width: cols.reduce((s, c) => s + (cw.widths[c.k] || 120), 0) + 'px' } : undefined;
  const th = c => {
    const on = !!sort && sort.k === c.k && !!c.get;
    const w = cw.widths[c.k];
    return html`<th key=${c.k} scope="col" class=${c.cls || undefined} data-col=${c.k} ...${c.attrs}
      style=${w ? { width: w + 'px' } : undefined} aria-sort=${c.get ? (on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}>
      ${c.get
        ? html`<button type="button" class=${'st-sort' + (on ? ' is-on' : '')} onClick=${() => setSort(nextSort({ k: c.k, n: !!c.n }, sort))}>${c.l}<span aria-hidden="true">${on ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</span></button>`
        : c.l}${cw.grip(c.k)}</th>`;
  };
  return { order, th, sort, tableProps: { style, class: cw.set ? 'st-fixed' : '' } };
}
