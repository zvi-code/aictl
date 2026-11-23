import { createEffect, createMemo, createSignal, For, Show, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { defaultRangeExtractor, elementScroll, observeElementOffset, observeElementRect, Virtualizer } from '@tanstack/virtual-core'
import type { SortingState } from '@tanstack/table-core'
import { actionName, createTableModel, formatValue, makeColumns, updateTableModel, type Field, type RowIdentity } from './tableModel'
import { PanelState } from './PanelState'
import styles from './Table.module.css'

type TableProps<T> = {
  label: string
  fields: readonly Field<T>[]
  rows: readonly T[]
  rowId: (row: T) => RowIdentity
  action?: { label: (row: T) => string; run: (row: T) => void }
  pageSize?: number
  orderRows?: (sort: SortingState[number] | undefined) => readonly T[]
  primaryCell?: (row: Accessor<T>, value: Accessor<string>, content: JSX.Element) => JSX.Element
  minWidth?: string
  /** A sort the caller applies, such as a server-side order: the rows arrive sorted and a header click calls onSort. */
  sorted?: { sort: SortingState[number] | undefined; onSort: (field: Field<T>) => void }
}

export function Table<T extends object>(props: TableProps<T>): JSX.Element {
  const [sort, setSort] = createSignal<SortingState[number]>()
  const active = createMemo(() => props.sorted ? props.sorted.sort
    : props.fields.some(field => field.id === sort()?.id) ? sort() : undefined)
  const changeSort = (field: Field<T>) => props.sorted ? props.sorted.onSort(field) : setSort(previous => previous?.id !== field.id
    ? { id: field.id, desc: false } : previous.desc ? undefined : { id: field.id, desc: true })
  return <Show when={props.rows.length > 0} fallback={<PanelState state="empty" />}>
    <Show when={props.pageSize} fallback={<VirtualTable {...props} sort={active()} changeSort={changeSort} />}>
      <PagedTable {...props} sort={active()} changeSort={changeSort} />
    </Show>
  </Show>
}

type SortedTableProps<T> = TableProps<T> & {
  sort: SortingState[number] | undefined
  changeSort: (field: Field<T>) => void
}

function sortedRows<T extends object>(props: SortedTableProps<T>) {
  const model = createTableModel<T>(row => props.rowId(row))
  const columns = createMemo(() => makeColumns(props.fields))
  const input = createMemo(() => Array.from(props.rows))
  return createMemo(() => {
    if (props.orderRows) return props.orderRows(props.sort)
    if (!props.sort || props.sorted) return input()
    const data = input(), defs = columns(), order = [props.sort]
    // The row model tracks structure. Read live display values in each cell.
    return untrack(() => updateTableModel(model, data, defs, order).map(row => row.original))
  })
}

function Header<T extends object>(props: SortedTableProps<T>) {
  return <thead><tr aria-rowindex={1}>
    <For each={props.fields} keyed={field => field.id}>{field =>
      <th scope="col" data-numeric={props.pageSize && field().numeric ? '' : undefined}
        aria-sort={props.sort?.id === field().id ? (props.sort.desc ? 'descending' : 'ascending') : undefined}>
        <Show when={field().sortable !== false} fallback={field().label}>
          <button type="button" class={styles.sort} onClick={() => props.changeSort(field())}>
            {field().label}<span aria-hidden="true">{props.sort?.id === field().id
              ? (props.sort.desc ? ' ↓' : ' ↑') : props.pageSize ? '' : ' ↕'}</span>
          </button>
        </Show>
      </th>
    }</For>
    <Show when={props.action}><th scope="col">Actions</th></Show>
  </tr></thead>
}

function Cells<T extends object>(props: TableProps<T> & { row: T }) {
  const row = () => props.row
  return <>
    <For each={props.fields} keyed={field => field.id}>{(field, index) => {
      const value = createMemo(() => field().read(props.row))
      const display = () => formatValue(field(), value())
      const short = () => {
        const raw = value()
        if (!props.pageSize) return
        if (raw == null) return 'N/A'
        if (typeof raw === 'number') return field().compact?.(raw)
      }
      const text = <Show when={short()} fallback={<Show when={field().clip && !props.pageSize} fallback={display()}>
        <span class={styles.clipStart} title={display()}><span dir="ltr">{display()}</span></span>
      </Show>}>{compact => <>
        <span title={display()} class={value() == null ? styles.missing : undefined} aria-hidden="true">{compact()}</span>
        <span class={styles.visuallyHidden}>{display()}</span>
      </>}</Show>
      return <td class={styles.cell} data-numeric={props.pageSize && (typeof value() === 'number' || field().numeric) ? '' : undefined}
        title={field().hint?.(props.row) ?? (!props.pageSize && props.primaryCell ? display() : undefined)}>
        <Show when={index() === 0 && props.primaryCell} fallback={
          <Show when={field().action?.label(props.row)} fallback={text}>{label =>
            <button type="button" class={styles.action} aria-label={actionName(display(), label())}
              onClick={() => field().action?.run(props.row)}>{text}</button>}
          </Show>}>
          {render => render()(row, display, text)}
        </Show>
      </td>
    }}</For>
    <Show when={props.action}>{action =>
      <td class={styles.cell}><Show when={action().label(props.row)}><button type="button" class={styles.action}
        onClick={() => action().run(props.row)}>{action().label(props.row)}</button></Show></td>
    }</Show>
  </>
}

function PagedTable<T extends object>(props: SortedTableProps<T>) {
  const rows = sortedRows(props)
  const [page, setPage] = createSignal(0)
  const size = () => props.pageSize!
  const last = () => Math.max(0, Math.ceil(rows().length / size()) - 1)
  const index = () => Math.min(page(), last())
  const start = () => index() * size()
  const visible = createMemo(() => rows().slice(start(), start() + size()))
  const [overflow, setOverflow] = createSignal(false)
  const [hostRef, setHost] = createSignal<HTMLDivElement>()
  const [tableRef, setTable] = createSignal<HTMLTableElement>()
  createEffect(() => ({ host: hostRef(), table: tableRef() }), ({ host, table }) => {
    if (!host || !table) return
    const measure = () => setOverflow(host.scrollWidth > host.clientWidth)
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    observer.observe(table)
    measure()
    return () => observer.disconnect()
  })
  createEffect(last, end => { setPage(current => Math.min(current, end)) })
  return <>
    <Show when={last() > 0}>
      <div class={styles.pager} role="group" aria-label={`${props.label} pages`}>
        <button type="button" class={styles.pageButton} aria-disabled={index() === 0 ? 'true' : undefined}
          onClick={() => { if (index() > 0) setPage(index() - 1) }}>Previous page</button>
        <span role="status">{start() + 1}–{Math.min(start() + size(), rows().length)} of {rows().length}</span>
        <button type="button" class={styles.pageButton} aria-disabled={index() === last() ? 'true' : undefined}
          onClick={() => { if (index() < last()) setPage(index() + 1) }}>Next page</button>
      </div>
    </Show>
    <div ref={setHost} class={styles.pageViewport} role={overflow() ? 'region' : undefined}
      aria-label={overflow() ? `${props.label} scroll area` : undefined} tabindex={overflow() ? 0 : undefined}>
      <table ref={setTable} class={styles.paged} aria-label={props.label} aria-rowcount={rows().length + 1}>
        <Header {...props} changeSort={field => { setPage(0); props.changeSort(field) }} />
        <tbody>
          <For each={visible()} keyed={row => props.rowId(row)}>{(row, i) =>
            <tr data-row-id={props.rowId(row())} aria-rowindex={start() + i() + 2}>
              <Cells {...props} row={row()} />
            </tr>}
          </For>
        </tbody>
      </table>
    </div>
  </>
}

function VirtualTable<T extends object>(props: SortedTableProps<T>): JSX.Element {
  const [revision, refresh] = createSignal(0)
  const rows = sortedRows(props)
  const [scroll, setScroll] = createSignal<HTMLDivElement>()
  const [rowHeight, setRowHeight] = createSignal(1)
  const [focusedRow, setFocusedRow] = createSignal<string>()
  let currentRows: ReturnType<typeof rows> = []
  const virtual = new Virtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: 0,
    getScrollElement: () => null,
    estimateSize: rowHeight,
    scrollToFn: elementScroll,
    observeElementRect,
    observeElementOffset,
    onChange: () => refresh(x => x + 1),
    overscan: 4,
  })
  createEffect(scroll, element => {
    if (!element) return
    const ruler = element.querySelector<HTMLElement>('[data-row-ruler]')!
    const resize = new ResizeObserver(() => setRowHeight(Math.max(1, ruler.getBoundingClientRect().height)))
    resize.observe(ruler)
    setRowHeight(Math.max(1, ruler.getBoundingClientRect().height))
    const dispose = virtual._didMount()
    return () => { resize.disconnect(); dispose() }
  })
  createEffect(() => ({
    data: rows(), element: scroll(), height: rowHeight(), focus: focusedRow(),
  }), ({ data, element, height, focus }, previous) => {
    currentRows = data
    const focusedIndex = focus == null ? -1 : data.findIndex(row => props.rowId(row) === focus)
    virtual.setOptions({
      ...virtual.options,
      count: data.length,
      getScrollElement: () => element ?? null,
      getItemKey: index => props.rowId(data[index]),
      estimateSize: () => height,
      scrollMargin: height,
      scrollPaddingStart: height,
      rangeExtractor: range => {
        const indexes = defaultRangeExtractor(range)
        // Keep the focused action mounted when the user scrolls with the pointer.
        if (focusedIndex >= 0 && !indexes.includes(focusedIndex)) {
          if (focusedIndex < indexes[0]) indexes.unshift(focusedIndex)
          else indexes.push(focusedIndex)
        }
        return indexes
      },
    })
    if (previous?.height !== height) virtual.measure()
    virtual._willUpdate()
    refresh(x => x + 1)
  })
  const visible = createMemo(() => {
    revision()
    return virtual.getVirtualItems().map(item => ({ ...item, row: currentRows[item.index] }))
  })
  const total = () => { revision(); return virtual.getTotalSize() }
  const height = () => rowHeight()
  const colSpan = () => props.fields.length + (props.action ? 1 : 0)
  return (
    <div ref={setScroll} class={styles.viewport} role="region" aria-label={`${props.label} scroll area`} tabindex={0}>
      <span class={styles.ruler} data-row-ruler aria-hidden="true" />
      <table class={styles.table} aria-label={props.label} aria-rowcount={rows().length + 1}
        style={{ 'min-inline-size': props.minWidth }}>
        <Header {...props} changeSort={field => {
          props.changeSort(field)
          const element = scroll()
          if (element) element.scrollTop = 0
        }} />
        <tbody>
          <For each={visible()} keyed={item => item.key}>{(item, index) => {
            const gap = () => item().start - (visible()[index() - 1]?.end ?? height())
            return <>
              <Show when={gap() > 0}>
                <tr aria-hidden="true" class={styles.spacer}>
                  <td colspan={colSpan()} style={{ height: `${gap()}px` }} />
                </tr>
              </Show>
              <tr aria-rowindex={item().index + 2} data-row-id={item().key}
                onFocusIn={() => setFocusedRow(props.rowId(item().row))} onFocusOut={() => setFocusedRow(undefined)}>
                <Cells {...props} row={item().row} />
              </tr>
            </>
          }}</For>
          <tr aria-hidden="true" class={styles.spacer}>
            <td colspan={colSpan()} style={{ height: `${Math.max(0, total() - ((visible().at(-1)?.end ?? height()) - height()))}px` }} />
          </tr>
        </tbody>
      </table>
    </div>
  )
}
