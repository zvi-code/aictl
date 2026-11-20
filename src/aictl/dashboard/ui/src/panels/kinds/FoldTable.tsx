import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { defaultRangeExtractor, elementScroll, observeElementOffset, observeElementRect, Virtualizer } from '@tanstack/virtual-core'
import { formatField, type Field } from '../../ui/tableModel'
import type { KeyedRow } from '../types'
import table from '../../ui/Table.module.css'
import styles from './kinds.module.css'

const collator = new Intl.Collator(undefined, { numeric: true })

export default function FoldTable(props: {
  label: string; fields: readonly Field<KeyedRow>[]; rows: readonly KeyedRow[]
  action: (row: KeyedRow) => { label: string; run: () => void } | undefined
}) {
  const [sort, setSort] = createSignal<{ id: string; desc: boolean }>()
  const [folds, setFolds] = createSignal<ReadonlyMap<string, boolean>>(new Map())
  const [element, setElement] = createSignal<HTMLDivElement>()
  const [height, setHeight] = createSignal(1)
  const [focus, setFocus] = createSignal<string>()
  const [revision, refresh] = createSignal(0)
  const ordered = createMemo(() => {
    const sortKey = sort(), folded = folds(), byId = new Set(props.rows.map(row => row.id))
    const field = props.fields.find(field => field.id === sortKey?.id)
    const children = new Map<string | undefined, KeyedRow[]>()
    for (const row of props.rows) {
      const parent = row.parent && byId.has(row.parent) ? row.parent : undefined
      const list = children.get(parent) ?? []
      list.push(row)
      children.set(parent, list)
    }
    const visible: { row: KeyedRow; depth: number; folded: boolean }[] = []
    const visit = (parent: string | undefined, depth: number) => {
      const members = children.get(parent) ?? []
      if (field) members.sort((a, b) => {
        const x = field.read(a), y = field.read(b)
        if (x == null || y == null) return Number(x == null) - Number(y == null)
        const result = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y))
        return sortKey?.desc ? -result : result
      })
      for (const row of members) {
        const closed = folded.get(row.id) ?? row.folded ?? false
        visible.push({ row, depth, folded: closed })
        if (!closed) visit(row.id, depth + 1)
      }
    }
    visit(undefined, 0)
    return visible
  })
  const virtual = new Virtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: 0, getScrollElement: () => null, estimateSize: height, scrollToFn: elementScroll,
    observeElementOffset, observeElementRect, overscan: 4, onChange: () => refresh(x => x + 1),
  })
  createEffect(element, host => {
    if (!host) return
    const ruler = host.querySelector<HTMLElement>('[data-row-ruler]')!
    const measure = () => setHeight(Math.max(1, ruler.getBoundingClientRect().height))
    const observer = new ResizeObserver(measure)
    observer.observe(ruler)
    measure()
    const dispose = virtual._didMount()
    return () => { observer.disconnect(); dispose() }
  })
  let current: ReturnType<typeof ordered> = []
  createEffect(() => ({ rows: ordered(), host: element(), size: height(), focused: focus() }), (value, before) => {
    current = value.rows
    const index = value.focused == null ? -1 : current.findIndex(item => item.row.id === value.focused)
    virtual.setOptions({ ...virtual.options, count: current.length, getScrollElement: () => value.host ?? null,
      getItemKey: i => value.rows[i].row.id, estimateSize: () => value.size, scrollMargin: value.size,
      rangeExtractor: range => {
        const items = defaultRangeExtractor(range)
        if (index >= 0 && !items.includes(index)) {
          if (index < items[0]) items.unshift(index)
          else items.push(index)
        }
        return items
      },
    })
    if (before?.size !== value.size) virtual.measure()
    virtual._willUpdate()
    refresh(x => x + 1)
  })
  const items = createMemo(() => {
    revision()
    return virtual.getVirtualItems().map(item => ({ ...item, entry: current[item.index] }))
  })
  const total = () => { revision(); return virtual.getTotalSize() }
  return <div ref={setElement} class={table.viewport} role="region" aria-label={`${props.label} scroll area`} tabindex={0}>
    <span class={table.ruler} data-row-ruler aria-hidden="true" />
    <table class={table.table} style={{ 'min-inline-size': `calc(${props.fields.length} * var(--space-8) * 2)` }}
      aria-label={props.label} aria-rowcount={ordered().length + 1}>
      <thead><tr aria-rowindex={1}><For each={props.fields} keyed={field => field.id}>{field =>
        <th scope="col" aria-sort={sort()?.id === field().id ? (sort()?.desc ? 'descending' : 'ascending') : undefined}>
          <button type="button" class={table.sort} onClick={() => {
            setSort(old => old?.id === field().id ? old.desc ? undefined : { id: field().id, desc: true } :
              { id: field().id, desc: false })
            if (element()) element()!.scrollTop = 0
          }}>{field().label}</button>
        </th>}</For></tr></thead>
      <tbody>
        <For each={items()} keyed={item => item.key}>{(item, i) => {
          const entry = () => item().entry
          const gap = () => item().start - (items()[i() - 1]?.end ?? height())
          return <>
            <Show when={gap() > 0}><tr aria-hidden="true" class={table.spacer}>
              <td colspan={props.fields.length} style={{ height: `${gap()}px` }} />
            </tr></Show>
            <tr data-row-id={item().key} aria-rowindex={item().index + 2}
              onFocusIn={() => setFocus(entry().row.id)} onFocusOut={() => setFocus(undefined)}>
              <For each={props.fields} keyed={field => field.id}>{(field, index) => {
                const text = () => formatField(field(), entry().row)
                return <td class={table.cell} title={text()}>
                  <Show when={index() === 0} fallback={text()}>
                    <span class={styles.treeCell} style={{ 'padding-inline-start': `calc(${entry().depth} * var(--space-4))` }}>
                      <Show when={entry().row.folded !== undefined}>
                        <button class={table.action} type="button" aria-expanded={entry().folded ? 'false' : 'true'}
                          aria-label={`${entry().folded ? 'Unfold' : 'Fold'} ${text()}`}
                          onClick={() => setFolds(old => new Map(old).set(entry().row.id, !entry().folded))}>
                          {entry().folded ? '▸' : '▾'}
                        </button>
                      </Show>
                      <Show when={props.action(entry().row)} fallback={text()}>{action =>
                        <button class={table.action} type="button" aria-label={action().label}
                          onClick={() => action().run()}>{text()}</button>
                      }</Show>
                    </span>
                  </Show>
                </td>
              }}</For>
            </tr>
          </>
        }}</For>
        <tr aria-hidden="true" class={table.spacer}><td colspan={props.fields.length}
          style={{ height: `${Math.max(0, total() - ((items().at(-1)?.end ?? height()) - height()))}px` }} /></tr>
      </tbody>
    </table>
  </div>
}
