import { useState, useMemo, useRef, useEffect, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
} from '@tanstack/table-core';
import EmptyState from './EmptyState.js';
import Skeleton from './Skeleton.js';
import Icon from './Icon.js';
import './DataTable.css';

// ─── localStorage helpers ─────────────────────────────────────────
function _ls() {
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const s = w?.localStorage;
    if (s && typeof s.getItem === 'function') return s;
  } catch { /* ignore */ }
  return null;
}
function loadPersist(key) {
  if (!key) return {};
  const s = _ls(); if (!s) return {};
  try { return JSON.parse(s.getItem('aictl-dt:' + key) || '{}'); }
  catch { return {}; }
}
function savePersist(key, obj) {
  if (!key) return;
  const s = _ls(); if (!s) return;
  try { s.setItem('aictl-dt:' + key, JSON.stringify(obj)); } catch { /* ignore */ }
}

// ─── resolver for { accessorKey } ─────────────────────────────────
function buildColumns(cols) {
  return cols.map(c => ({
    id: c.id || c.accessorKey,
    accessorKey: c.accessorKey,
    header: c.header,
    enableSorting: c.sortable !== false,
    sortDescFirst: false,
    size: c.width,
    meta: { align: c.align, sticky: c.sticky, cell: c.cell, rawHeader: c.header },
  }));
}

export default function DataTable({
  data = [],
  columns = [],
  onRowClick,
  rowKey,
  density,
  emptyState,
  loading = false,
  initialSort,
  onSortChange,
  persistKey,
  expandable,
  striped = false,
  virtualScroll = false,
  ariaLabel,
}) {
  const persisted = useMemo(() => loadPersist(persistKey), [persistKey]);
  const [sorting, setSorting] = useState(() => persisted.sorting || (initialSort ? [initialSort] : []));
  const [expanded, setExpanded] = useState({});
  const [columnSizing, setColumnSizing] = useState(() => persisted.columnSizing || {});
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef(null);
  const rowRefs = useRef([]);

  // Persist sort + column sizing
  useEffect(() => {
    if (!persistKey) return;
    savePersist(persistKey, { sorting, columnSizing });
  }, [persistKey, sorting, columnSizing]);

  // Apply updater pattern from @tanstack/table-core
  const applyUpdater = useCallback((setter, updater) => {
    setter(prev => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const tableColumns = useMemo(() => buildColumns(columns), [columns]);

  const table = useMemo(() => {
    const t = createTable({
      data,
      columns: tableColumns,
      state: {
        sorting,
        expanded,
        columnSizing,
        columnSizingInfo: { startOffset: null, startSize: null, deltaOffset: null, deltaPercentage: null, isResizingColumn: false, columnSizingStart: [] },
        columnPinning: { left: [], right: [] },
        columnOrder: [],
        columnVisibility: {},
        columnFilters: [],
        globalFilter: '',
        grouping: [],
        rowSelection: {},
        rowPinning: { top: [], bottom: [] },
        pagination: { pageIndex: 0, pageSize: 10000 },
      },
      onSortingChange: (u) => {
        applyUpdater(setSorting, u);
        if (onSortChange) onSortChange(typeof u === 'function' ? u(sorting) : u);
      },
      onExpandedChange: (u) => applyUpdater(setExpanded, u),
      onColumnSizingChange: (u) => applyUpdater(setColumnSizing, u),
      enableSorting: true,
      enableExpanding: !!expandable,
      getRowCanExpand: expandable ? () => true : undefined,
      enableColumnResizing: true,
      columnResizeMode: 'onChange',
      getRowId: rowKey ? (row, idx) => String(typeof rowKey === 'function' ? rowKey(row, idx) : row[rowKey] ?? idx) : undefined,
      getSubRows: () => undefined,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
      renderFallbackValue: null,
    });
    return t;
  }, [data, tableColumns, sorting, expanded, columnSizing, expandable, rowKey, onSortChange, applyUpdater]);

  const rows = table.getRowModel().rows;
  const headers = table.getHeaderGroups()[0]?.headers || [];

  // Virtualization (simple windowed) when enabled + >200 rows
  const ROW_HEIGHT = density === 'compact' ? 28 : density === 'spacious' ? 44 : 36;
  const virtualize = virtualScroll && rows.length > 200;
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  useEffect(() => {
    if (!virtualize) return;
    const el = containerRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [virtualize]);
  const windowStart = virtualize ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 10) : 0;
  const windowEnd = virtualize ? Math.min(rows.length, windowStart + Math.ceil(viewportHeight / ROW_HEIGHT) + 20) : rows.length;
  const visibleRows = rows.slice(windowStart, windowEnd);
  const padTop = virtualize ? windowStart * ROW_HEIGHT : 0;
  const padBottom = virtualize ? (rows.length - windowEnd) * ROW_HEIGHT : 0;

  // Keyboard nav
  const onKeyDown = useCallback((e, row, idx) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(rows.length - 1, idx + 1);
      setFocusIdx(next);
      rowRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(0, idx - 1);
      setFocusIdx(next);
      rowRefs.current[next]?.focus();
    } else if (e.key === 'Enter') {
      if (onRowClick) { e.preventDefault(); onRowClick(row.original, row); }
    } else if (e.key === ' ') {
      if (expandable && row.getCanExpand && row.getCanExpand()) {
        e.preventDefault();
        row.toggleExpanded();
      }
    }
  }, [rows.length, onRowClick, expandable]);

  // Column resize drag
  const resizeRef = useRef(null);
  const onResizeMouseDown = (colId, startX, startWidth) => (e) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { colId, startX, startWidth };
    const onMove = (ev) => {
      const r = resizeRef.current; if (!r) return;
      const delta = ev.clientX - r.startX;
      const next = Math.max(40, r.startWidth + delta);
      setColumnSizing(prev => ({ ...prev, [r.colId]: next }));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Loading state
  if (loading) {
    return html`<div class="aictl-dt aictl-dt--loading" data-density=${density || ''}>
      <table role="table" aria-label=${ariaLabel || 'Loading'}>
        <thead><tr>${columns.map((c, i) => html`<th key=${i}>${c.header}</th>`)}</tr></thead>
        <tbody>${Array.from({ length: 5 }).map((_, i) => html`<tr key=${i} class="aictl-dt__skel-row">
          ${columns.map((_c, j) => html`<td key=${j}><${Skeleton} height="12px"/></td>`)}
        </tr>`)}</tbody>
      </table>
    </div>`;
  }

  // Empty state
  if (!rows.length) {
    if (emptyState) {
      return html`<div class="aictl-dt aictl-dt--empty">
        ${typeof emptyState === 'string'
          ? html`<${EmptyState} title=${emptyState}/>`
          : emptyState}
      </div>`;
    }
    return html`<div class="aictl-dt aictl-dt--empty"><${EmptyState} title="No data"/></div>`;
  }

  const cls = ['aictl-dt', striped && 'aictl-dt--striped', virtualize && 'aictl-dt--virtual'].filter(Boolean).join(' ');

  return html`<div class=${cls} data-density=${density || ''} ref=${containerRef}
    style=${virtualize ? 'overflow:auto;max-height:70vh' : ''}>
    <table role="table" aria-label=${ariaLabel || 'Data table'}>
      <thead>
        <tr role="row">${headers.map(h => {
          const col = h.column;
          const meta = col.columnDef.meta || {};
          const canSort = col.getCanSort();
          const sortDir = col.getIsSorted();
          const sizing = columnSizing[col.id];
          const w = sizing || col.columnDef.size;
          const style = [
            meta.align ? `text-align:${meta.align}` : '',
            w ? `width:${w}px;min-width:${w}px` : '',
            meta.sticky ? 'position:sticky;left:0;z-index:2;background:var(--bg2)' : '',
          ].filter(Boolean).join(';');
          return html`<th key=${col.id} role="columnheader"
            aria-sort=${sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none'}
            style=${style}
            class=${canSort ? 'aictl-dt__th aictl-dt__th--sortable' : 'aictl-dt__th'}>
            <span class="aictl-dt__th-inner"
              onClick=${canSort ? () => col.toggleSorting() : undefined}>
              ${meta.rawHeader}
              ${canSort && html`<span class="aictl-dt__sort-ind" aria-hidden="true">${
                sortDir === 'asc' ? '\u25B4'
                : sortDir === 'desc' ? '\u25BE'
                : '\u21C5'
              }</span>`}
            </span>
            <span class="aictl-dt__resizer" role="separator" aria-orientation="vertical"
              onMouseDown=${(e) => onResizeMouseDown(col.id, e.clientX, w || 120)(e)}></span>
          </th>`;
        })}</tr>
      </thead>
      <tbody>
        ${padTop > 0 && html`<tr style="height:${padTop}px" aria-hidden="true"><td colspan=${headers.length}></td></tr>`}
        ${visibleRows.map((row, i) => {
          const absIdx = windowStart + i;
          const isExpanded = row.getIsExpanded && row.getIsExpanded();
          const canExpand = expandable && row.getCanExpand && row.getCanExpand();
          return html`<${RowFrag} key=${row.id}
            row=${row} absIdx=${absIdx} rowRefs=${rowRefs}
            onKeyDown=${onKeyDown} onRowClick=${onRowClick}
            focusIdx=${focusIdx} setFocusIdx=${setFocusIdx}
            expandable=${expandable} isExpanded=${isExpanded} canExpand=${canExpand}
            columnSizing=${columnSizing}
          />`;
        })}
        ${padBottom > 0 && html`<tr style="height:${padBottom}px" aria-hidden="true"><td colspan=${headers.length}></td></tr>`}
      </tbody>
    </table>
  </div>`;
}

// ─── Row + optional sub-row ───────────────────────────────────────
function RowFrag({ row, absIdx, rowRefs, onKeyDown, onRowClick, focusIdx, setFocusIdx, expandable, isExpanded, canExpand, columnSizing }) {
  const cells = row.getVisibleCells();
  return html`${[
    html`<tr key=${row.id} role="row" tabIndex="0"
      ref=${(el) => { rowRefs.current[absIdx] = el; }}
      data-idx=${absIdx}
      class=${'aictl-dt__row' + (focusIdx === absIdx ? ' aictl-dt__row--focus' : '')}
      onClick=${onRowClick ? () => onRowClick(row.original, row) : undefined}
      onFocus=${() => setFocusIdx(absIdx)}
      onKeyDown=${(e) => onKeyDown(e, row, absIdx)}>
      ${expandable && html`<td class="aictl-dt__expander-cell">
        ${canExpand ? html`<button type="button" class="aictl-dt__expander"
          aria-label=${isExpanded ? 'Collapse row' : 'Expand row'}
          aria-expanded=${isExpanded}
          onClick=${(e) => { e.stopPropagation(); row.toggleExpanded(); }}>
          <${Icon} name=${isExpanded ? 'chevron-down' : 'chevron-right'} size="0.9em"/>
        </button>` : null}
      </td>`}
      ${cells.map(cell => {
        const meta = cell.column.columnDef.meta || {};
        const w = columnSizing[cell.column.id] || cell.column.columnDef.size;
        const style = [
          meta.align ? `text-align:${meta.align}` : '',
          w ? `width:${w}px;min-width:${w}px` : '',
          meta.sticky ? 'position:sticky;left:0;z-index:1;background:var(--bg)' : '',
        ].filter(Boolean).join(';');
        const val = cell.getValue();
        const rendered = typeof meta.cell === 'function'
          ? meta.cell(val, row.original, row)
          : (val == null ? '' : val);
        return html`<td key=${cell.id} role="cell" style=${style}>${rendered}</td>`;
      })}
    </tr>`,
    isExpanded && expandable?.renderSubRow ? html`<tr key=${row.id + ':sub'} class="aictl-dt__subrow" role="row">
      <td colspan=${cells.length + (expandable ? 1 : 0)}>
        ${expandable.renderSubRow(row.original, row)}
      </td>
    </tr>` : null,
  ]}`;
}
