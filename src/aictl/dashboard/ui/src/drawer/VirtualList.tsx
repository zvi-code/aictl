import { createEffect, createMemo, createSignal, For, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { defaultRangeExtractor, elementScroll, observeElementOffset, observeElementRect, Virtualizer } from '@tanstack/virtual-core'
import styles from './drawer.module.css'

export function VirtualList<T>(props: {
  label: string; rows: readonly T[]; identity: (row: T) => string; estimate: number
  children: (row: Accessor<T>, index: Accessor<number>) => JSX.Element
}) {
  const [element, setElement] = createSignal<HTMLDivElement>()
  const [version, bump] = createSignal(0)
  const [focus, setFocus] = createSignal<string>()
  let rows: readonly T[] = []
  const virtual = new Virtualizer<HTMLDivElement, HTMLDivElement>({
    count: 0, getScrollElement: () => null, estimateSize: () => props.estimate,
    scrollToFn: elementScroll, observeElementRect, observeElementOffset, overscan: 3,
    onChange: () => bump(tick => tick + 1),
  })
  createEffect(element, node => { if (node) return virtual._didMount() })
  createEffect(() => ({ rows: props.rows, element: element(), focus: focus() }), current => {
    rows = current.rows
    const pinned = current.focus == null ? -1 : rows.findIndex(row => props.identity(row) === current.focus)
    virtual.setOptions({
      ...virtual.options, count: rows.length, getScrollElement: () => current.element ?? null,
      getItemKey: index => props.identity(rows[index]),
      rangeExtractor: range => {
        const indexes = defaultRangeExtractor(range)
        if (pinned >= 0 && !indexes.includes(pinned)) {
          if (pinned < indexes[0]) indexes.unshift(pinned)
          else indexes.push(pinned)
        }
        return indexes
      },
    })
    virtual._willUpdate()
    bump(tick => tick + 1)
  })
  const items = createMemo(() => {
    version()
    return virtual.getVirtualItems().map(item => ({ ...item, row: rows[item.index] }))
  })
  const total = createMemo(() => { version(); return virtual.getTotalSize() })
  return <div ref={setElement} class={styles.scroll} role="region" aria-label={`${props.label} scroll area`} tabindex={0}>
    <div role="list" aria-label={props.label} class={styles.virtual} style={{ height: `${total()}px` }}>
      <For each={items()} keyed={item => item.key}>{item =>
        <div ref={node => { queueMicrotask(() => { if (node.isConnected) virtual.measureElement(node) }) }}
          role="listitem" aria-posinset={item().index + 1} aria-setsize={props.rows.length} data-index={item().index}
          data-row-id={item().key} class={styles.virtualRow} style={{ transform: `translateY(${item().start}px)` }}
          onFocusIn={() => setFocus(String(item().key))}
          onFocusOut={event => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFocus(undefined)
          }}>
          {props.children(() => item().row, () => item().index)}
        </div>
      }</For>
    </div>
  </div>
}
