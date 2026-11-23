import { createEffect, createMemo, createSignal, For, Show, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { defaultRangeExtractor, elementScroll, observeElementOffset, observeElementRect, Virtualizer } from '@tanstack/virtual-core'
import type { SortingState } from '@tanstack/table-core'
import { actionName, createTableModel, formatValue, makeColumns, updateTableModel, type Field, type RowIdentity } from './tableModel'
import { createColumnLayout, tableKey, type LegacyKeys } from './columnState'
import { columnStyles, createColumnControls } from './ColumnControls'
import { PanelState } from './PanelState'
import styles from './Table.module.css'

/** The column id of the trailing Actions column in the saved layout. */
export const actionColumnId = '@actions'

export type TableProps<T> = {
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
  /** Saves the column layout under this id instead of the label, for a label that changes. */
  tableId?: string
  /** Columns hidden until the user shows them. */
  defaultHidden?: readonly string[]
  /** Keys an earlier column control saved under, read once when this table has no saved layout. */
  legacyKeys?: LegacyKeys
}

type Column<T> = { id: string; label: string; pin?: 'start' | 'end'; field?: Field<T> }

function useColumns<T extends object>(props: TableProps<T>) {
  const columns = createMemo((): Column<T>[] => [
    ...props.fields.map((field, index): Column<T> => ({
      id: field.id, label: field.label, field, pin: index === 0 && props.primaryCell ? 'start' : undefined,
    })),
    ...(props.action ? [{ id: actionColumnId, label: 'Actions', pin: 'end' as const }] : []),
  ])
  const control = createColumnLayout({
    key: () => tableKey(props.tableId ?? props.label),
    columns,
    defaultHidden: () => props.defaultHidden,
    legacy: () => props.legacyKeys,
  })
  const controls = createColumnControls({ control, label: () => props.label, columns })
  const fields = createMemo(() => control.visible().flatMap(column => column.field ?? []))
  const showAction = () => control.visible().some(column => column.id === actionColumnId)
  return { control, controls, fields, showAction }
}

type Columns<T extends object> = ReturnType<typeof useColumns<T>>

export function Table<T extends object>(props: TableProps<T>): JSX.Element {
  const [sort, setSort] = createSignal<SortingState[number]>()
  const active = createMemo(() => props.sorted ? props.sorted.sort
    : props.fields.some(field => field.id === sort()?.id) ? sort() : undefined)
  const changeSort = (field: Field<T>) => props.sorted ? props.sorted.onSort(field) : setSort(previous => previous?.id !== field.id
    ? { id: field.id, desc: false } : previous.desc ? undefined : { id: field.id, desc: true })
  const columns = useColumns(props)
  return <Show when={props.rows.length > 0} fallback={<PanelState state="empty" />}>
    <Show when={props.pageSize} fallback={<VirtualTable {...props} sort={active()} changeSort={changeSort} columns={columns} />}>
      <PagedTable {...props} sort={active()} changeSort={changeSort} columns={columns} />
    </Show>
  </Show>
}

type SortedTableProps<T extends object> = TableProps<T> & {
  sort: SortingState[number] | undefined
  changeSort: (field: Field<T>) => void
  columns: Columns<T>
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
  const controls = () => props.columns.controls
  return <thead><tr aria-rowindex={1}>
    <For each={props.columns.control.visible()} keyed={column => column.id}>{column =>
      <th scope="col" class={columnStyles.header} data-col={column().id} data-pinned={column().pin ? '' : undefined}
        data-drop={controls().dropSide(column().id)} data-dragging={controls().dragging(column().id)}
        data-numeric={props.pageSize && column().field?.numeric ? '' : undefined}
        aria-sort={props.sort?.id === column().id ? (props.sort.desc ? 'descending' : 'ascending') : undefined}
        onPointerDown={event => controls().onHeaderPointerDown(column(), event)}
        onKeyDown={event => controls().onHeaderKeyDown(column(), event)}>
        <Show when={column().field && column().field!.sortable !== false} fallback={column().label}>
          <button type="button" class={styles.sort} data-sort aria-keyshortcuts={controls().sortKeys(column())}
            onClick={() => { if (!controls().takeDragClick()) props.changeSort(column().field!) }}>
            {column().label}<span aria-hidden="true">{props.sort?.id === column().id
              ? (props.sort.desc ? ' ↓' : ' ↑') : props.pageSize ? '' : ' ↕'}</span>
          </button>
        </Show>
        <props.columns.controls.Tools column={column()} />
      </th>
    }</For>
  </tr></thead>
}

function Cells<T extends object>(props: SortedTableProps<T> & { row: T }) {
  const row = () => props.row
  return <>
    <For each={props.columns.fields()} keyed={field => field.id}>{(field, index) => {
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
      // A narrowed column cuts its text; the full value shows on hover.
      return <td class={styles.cell} data-col={field().id} data-numeric={props.pageSize && (typeof value() === 'number' || field().numeric) ? '' : undefined}
        title={field().hint?.(props.row) ?? (!props.pageSize ? display() : undefined)}>
        <Show when={index() === 0 && props.primaryCell && props.fields[0]?.id === field().id} fallback={
          <Show when={field().action?.label(props.row)} fallback={text}>{label =>
            <button type="button" class={styles.action} aria-label={actionName(display(), label())}
              onClick={() => field().action?.run(props.row)}>{text}</button>}
          </Show>}>
          {props.primaryCell!(row, display, text)}
        </Show>
      </td>
    }}</For>
    <Show when={props.columns.showAction() && props.action}>{action =>
      <td class={styles.cell} data-col={actionColumnId}><Show when={action().label(props.row)}><button type="button" class={styles.action}
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
  const controls = () => props.columns.controls
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
    <div class={columnStyles.frame}>
      <div ref={setHost} class={styles.pageViewport} role={overflow() ? 'region' : undefined}
        aria-label={overflow() ? `${props.label} scroll area` : undefined} tabindex={overflow() ? 0 : undefined}>
        <table ref={element => { setTable(element); controls().setTable(element) }} class={styles.paged} aria-label={props.label}
          aria-rowcount={rows().length + 1} data-sized={controls().sized() ? '' : undefined} style={controls().tableStyle()}>
          <props.columns.controls.ColGroup />
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
      <props.columns.controls.Menu />
      <props.columns.controls.Status />
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
  const colSpan = () => props.columns.control.visible().length
  const controls = () => props.columns.controls
  return (
    <div class={columnStyles.frame}>
      <div ref={setScroll} class={styles.viewport} role="region" aria-label={`${props.label} scroll area`} tabindex={0}>
        <span class={styles.ruler} data-row-ruler aria-hidden="true" />
        <table ref={element => controls().setTable(element)} class={styles.table} aria-label={props.label} aria-rowcount={rows().length + 1}
          data-sized={controls().sized() ? '' : undefined} style={controls().tableStyle(props.minWidth)}>
          <props.columns.controls.ColGroup />
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
      <props.columns.controls.Menu />
      <props.columns.controls.Status />
    </div>
  )
}
