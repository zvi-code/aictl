import { createEffect, createMemo, createSignal, For, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { defaultRangeExtractor, elementScroll, observeElementOffset, observeElementRect, Virtualizer } from '@tanstack/virtual-core'
import styles from './drawer.module.css'

export function VirtualList<T>(props: {
  label: string; rows: readonly T[]; identity: (row: T) => string; estimate: number
  children: (row: Accessor<T>, index: Accessor<number>) => JSX.Element
  /** Keep the newest rows in view: hold the scroll position when older rows are added above and follow new rows at the end. */
  end?: boolean
  /** Called while the reader scrolls back to the first rows. */
  onStart?: () => void
  onRange?: (first: number, last: number) => void
  /** A row to scroll into view; pass a new object to scroll to the same row again. */
  reveal?: { id: string }
  class?: string
  /** Shown above the rows inside the scroll area, so a sticky header scrolls sideways with them. */
  header?: JSX.Element
  /** The row to open at, at the top of the view, when the list first has rows; the newest row when absent. */
  initial?: (rows: readonly T[]) => number | undefined
}) {
  const [element, setElement] = createSignal<HTMLDivElement>()
  const [version, bump] = createSignal(0)
  const [focus, setFocus] = createSignal<string>()
  let rows: readonly T[] = []
  let shown = ''
  let started = false
  // The anchoring mode is fixed when the list is created.
  const end = untrack(() => !!props.end)
  const virtual = new Virtualizer<HTMLDivElement, HTMLDivElement>({
    count: 0, getScrollElement: () => null, estimateSize: () => props.estimate,
    scrollToFn: elementScroll, observeElementRect, observeElementOffset, overscan: 3,
    anchorTo: end ? 'end' : 'start', followOnAppend: end,
    onChange: instance => {
      bump(tick => tick + 1)
      const range = instance.range
      if (!range) return
      const next = `${range.startIndex}:${range.endIndex}`
      if (next !== shown) { shown = next; props.onRange?.(range.startIndex, range.endIndex) }
      if (instance.isScrolling && instance.scrollDirection === 'backward' && range.startIndex <= 3) props.onStart?.()
    },
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
    if (!rows.length) started = false
    else if (props.end && !started && current.element) {
      started = true
      const index = props.initial?.(rows)
      if (index == null) virtual.scrollToIndex(rows.length - 1, { align: 'end' })
      else virtual.scrollToIndex(index, { align: 'start' })
    }
  })
  let revealed: { id: string } | undefined
  createEffect(() => ({ reveal: props.reveal, rows: props.rows, element: element() }), current => {
    if (!current.reveal || !current.element || current.reveal === revealed) return
    const target = current.reveal.id
    const index = current.rows.findIndex(row => props.identity(row) === target)
    if (index < 0) return
    revealed = current.reveal
    virtual.scrollToIndex(index, { align: 'center' })
  })
  const items = createMemo(() => {
    version()
    return virtual.getVirtualItems().map(item => ({ ...item, row: rows[item.index] }))
  })
  const total = createMemo(() => { version(); return virtual.getTotalSize() })
  return <div ref={setElement} class={props.class ?? styles.scroll} role="region" aria-label={`${props.label} scroll area`} tabindex={0}>
    {props.header}
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
