import { createEffect, createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { defaultRangeExtractor, elementScroll, observeElementOffset, observeElementRect, Virtualizer } from '@tanstack/virtual-core'
import type { SortingState } from '@tanstack/table-core'
import { createTableModel, formatField, makeColumns, updateTableModel, type Field, type RowIdentity } from './tableModel'
import { PanelState } from './PanelState'
import styles from './Table.module.css'

type TableProps<T> = {
  label: string
  fields: readonly Field<T>[]
  rows: readonly T[]
  rowId: (row: T) => RowIdentity
  action?: { label: (row: T) => string; run: (row: T) => void }
}

export function Table<T extends object>(props: TableProps<T>): JSX.Element {
  return <Show when={props.rows.length > 0} fallback={<PanelState state="empty" />}>
    <VirtualTable {...props} />
  </Show>
}

function VirtualTable<T extends object>(props: TableProps<T>): JSX.Element {
  const [sorting, setSorting] = createSignal<SortingState>([])
  const [revision, refresh] = createSignal(0)
  const model = createTableModel<T>(row => props.rowId(row))
  const columns = createMemo(() => makeColumns(props.fields))
  const input = createMemo(() => Array.from(props.rows))
  const rows = createMemo(() => {
    const data = input(), defs = columns(), order = sorting()
    // The row model tracks structure. Read live display values in each cell.
    return untrack(() => updateTableModel(model, data, defs, order))
  })
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
    const focusedIndex = focus == null ? -1 : data.findIndex(row => row.id === focus)
    virtual.setOptions({
      ...virtual.options,
      count: data.length,
      getScrollElement: () => element ?? null,
      getItemKey: index => data[index].id,
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
  const changeSort = (field: Field<T>) => {
    setSorting(previous => {
      const active = previous[0]
      if (active?.id !== field.id) return [{ id: field.id, desc: false }]
      return active.desc ? [] : [{ id: field.id, desc: true }]
    })
    const element = scroll()
    if (element) element.scrollTop = 0
  }
  return (
    <div ref={setScroll} class={styles.viewport} role="region" aria-label={`${props.label} scroll area`} tabindex={0}>
      <span class={styles.ruler} data-row-ruler aria-hidden="true" />
      <table class={styles.table} aria-label={props.label} aria-rowcount={rows().length + 1}>
        <thead>
          <tr aria-rowindex={1}>
            <For each={props.fields} keyed={field => field.id}>{field =>
              <th scope="col" aria-sort={sorting()[0]?.id === field().id
                ? (sorting()[0].desc ? 'descending' : 'ascending') : undefined}>
                <Show when={field().sortable !== false} fallback={field().label}>
                  <button type="button" class={styles.sort} onClick={() => changeSort(field())}>
                    {field().label}<span aria-hidden="true">{sorting()[0]?.id === field().id
                      ? (sorting()[0].desc ? ' ↓' : ' ↑') : ' ↕'}</span>
                  </button>
                </Show>
              </th>
            }</For>
                  <Show when={props.action}><th scope="col">Actions</th></Show>
          </tr>
        </thead>
        <tbody>
          <For each={visible()} keyed={item => item.key}>{(item, index) => {
            const row = createMemo(() => item().row.original)
            const gap = () => item().start - (visible()[index() - 1]?.end ?? height())
            return <>
              <Show when={gap() > 0}>
                <tr aria-hidden="true" class={styles.spacer}>
                  <td colspan={colSpan()} style={{ height: `${gap()}px` }} />
                </tr>
              </Show>
              <tr aria-rowindex={item().index + 2} data-row-id={item().key}>
                <For each={props.fields} keyed={field => field.id}>{field => {
                  const display = () => formatField(field(), row())
                  return <td class={styles.cell}>
                    <Show when={field().action?.label(row())} fallback={display()}>{label =>
                      <button type="button" class={styles.action} aria-label={label()}
                        onFocus={() => setFocusedRow(item().row.id)} onBlur={() => setFocusedRow(undefined)}
                        onClick={() => field().action?.run(row())}>{display()}</button>}
                    </Show>
                  </td>
                }}</For>
                <Show when={props.action}>{action =>
                  <td class={styles.cell}><Show when={action().label(row())}><button type="button" class={styles.action}
                    onFocus={() => setFocusedRow(item().row.id)} onBlur={() => setFocusedRow(undefined)}
                    onClick={() => action().run(row())}>{action().label(row())}</button></Show></td>
                }</Show>
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
