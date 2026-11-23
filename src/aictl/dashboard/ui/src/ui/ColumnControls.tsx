// Header controls for every table: drag the edge to resize, drag the header to move,
// hide from the header, and one corner menu to show columns again and reset them.
import { createSignal, createUniqueId, flush, For, Show, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Check, Columns3, EyeOff, RotateCcw } from 'lucide'
import { arrangeColumns, clampWidth, maxWidth, minWidth, widthStep, type ColumnLayoutControl, type ColumnSpec } from './columnState'
import { Icon } from './Icon'
import { moveFocus } from './keyboard'
import styles from './ColumnControls.module.css'

export { styles as columnStyles }
/** The width a column gets when other columns have widths and it has none yet (a new column). */
const fallbackWidth = 120
const dragThreshold = 4
const modified = (event: KeyboardEvent | PointerEvent) => event.altKey || event.ctrlKey || event.metaKey || event.shiftKey

type Drop = { id: string; side: 'before' | 'after' }

export function createColumnControls<C extends ColumnSpec>(options: {
  control: ColumnLayoutControl<C>
  label: Accessor<string>
  columns: Accessor<readonly C[]>
}) {
  const { control } = options
  const [drop, setDrop] = createSignal<Drop>()
  const [dragging, setDragging] = createSignal<string>()
  const [message, setMessage] = createSignal('')
  let table: HTMLTableElement | undefined
  let corner: HTMLButtonElement | undefined
  let swallowClick = false

  const cell = (id: string) => table?.querySelector<HTMLTableCellElement>(`thead th[data-col="${CSS.escape(id)}"]`) ?? undefined
  const headers = () => Array.from(table?.querySelectorAll<HTMLTableCellElement>('thead th[data-col]') ?? [])
  const labelOf = (id: string) => options.columns().find(column => column.id === id)?.label ?? id
  const direction = () => table && getComputedStyle(table).direction === 'rtl' ? -1 : 1

  /** Widths the columns have now, measured from the header cells. */
  const measure = () => Object.fromEntries(headers().map(th => [th.dataset.col!, clampWidth(th.getBoundingClientRect().width)]))
  /** Widths the columns get from the table's own layout, with no stored widths. */
  const natural = () => {
    if (!table) return {}
    const cols = Array.from(table.querySelectorAll<HTMLElement>('colgroup col'))
    const saved = { cols: cols.map(col => col.style.inlineSize), width: table.style.inlineSize, min: table.style.minInlineSize, sized: table.getAttribute('data-sized') }
    for (const col of cols) col.style.inlineSize = ''
    table.style.inlineSize = ''
    table.style.minInlineSize = ''
    table.removeAttribute('data-sized')
    const widths = measure()
    cols.forEach((col, index) => { col.style.inlineSize = saved.cols[index] })
    table.style.inlineSize = saved.width
    table.style.minInlineSize = saved.min
    if (saved.sized != null) table.setAttribute('data-sized', saved.sized)
    return widths
  }
  /** Every visible column needs a width once one has: the stored ones, else the measured ones. */
  const currentWidths = () => {
    const visible = control.visible()
    if (!control.sized()) return measure()
    return Object.fromEntries(visible.map(column => [column.id, control.width(column.id) ?? fallbackWidth]))
  }
  const width = (id: string) => control.sized() ? control.width(id) ?? fallbackWidth : undefined
  const total = () => control.visible().reduce((sum, column) => sum + (width(column.id) ?? 0), 0)
  /** Paint widths straight onto the colgroup during a drag, so no row renders again. */
  const paint = (widths: Record<string, number>) => {
    if (!table) return
    for (const col of Array.from(table.querySelectorAll<HTMLElement>('colgroup col'))) {
      const value = widths[col.dataset.col!]
      if (value != null) col.style.inlineSize = `${value}px`
    }
    table.style.inlineSize = `${Object.values(widths).reduce((sum, value) => sum + value, 0)}px`
    table.style.minInlineSize = '0'
    table.setAttribute('data-sized', '')
  }
  const restore = () => {
    if (!table) return
    if (control.sized()) { paint(currentWidths()); return }
    for (const col of Array.from(table.querySelectorAll<HTMLElement>('colgroup col'))) col.style.inlineSize = ''
    table.style.inlineSize = ''
    table.style.minInlineSize = ''
    table.removeAttribute('data-sized')
  }
  const say = (text: string) => setMessage(text)
  const resetWidth = (id: string) => {
    const widths = control.sized() ? currentWidths() : measure()
    control.setWidths({ ...widths, [id]: natural()[id] ?? widths[id] })
    flush()
    say(`${labelOf(id)} width reset`)
  }

  function startResize(id: string, event: PointerEvent) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    ;(event.target as Element).closest<HTMLElement>('[role="separator"]')?.focus({ preventScroll: true })
    const start = currentWidths()
    const from = event.clientX, rtl = direction()
    let next: Record<string, number> | undefined
    const move = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return
      const delta = (e.clientX - from) * rtl
      if (!delta && !next) return
      next = { ...start, [id]: clampWidth((start[id] ?? fallbackWidth) + delta) }
      paint(next)
    }
    const end = (commit: boolean) => (e: Event) => {
      const pointer = e.type.startsWith('pointer') ? e as PointerEvent : undefined
      if (pointer && pointer.pointerId !== event.pointerId) return
      if (pointer && commit) move(pointer)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', cancel)
      document.removeEventListener('keydown', escape, true)
      if (commit && next) { control.setWidths(next); flush() } else restore()
    }
    const up = end(true), cancel = end(false)
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(e) } }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', cancel)
    document.addEventListener('keydown', escape, true)
  }

  function resizeKey(id: string, event: KeyboardEvent) {
    const step = event.key === 'ArrowLeft' ? -widthStep : event.key === 'ArrowRight' ? widthStep : 0
    if ((!step && event.key !== 'Home') || modified(event)) return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Home') { resetWidth(id); return }
    const widths = currentWidths()
    control.setWidths({ ...widths, [id]: (widths[id] ?? fallbackWidth) + step * direction() })
    flush()
  }

  const focusAgain = (id: string, selector: string) => {
    const target = cell(id)?.querySelector<HTMLElement>(selector) ?? cell(id)
    target?.focus()
  }
  const announceMove = (id: string) => {
    const visible = arrangeColumns(options.columns(), control.layout()).visible
    say(`${labelOf(id)} moved to position ${visible.findIndex(column => column.id === id) + 1} of ${visible.length}`)
  }

  function headerKey(column: C, event: KeyboardEvent) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    if (column.pin) { say(`${column.label} stays in place`); return }
    const delta = (event.key === 'ArrowLeft' ? -1 : 1) * direction() as -1 | 1
    const from = (event.target as Element).closest('[data-sort], [data-hide], [role="separator"]')
    const selector = from?.matches('[data-sort]') ? '[data-sort]' : from?.matches('[data-hide]') ? '[data-hide]' : '[role="separator"]'
    if (!control.move(column.id, delta)) { say(`${column.label} cannot move further`); return }
    flush()
    announceMove(column.id)
    focusAgain(column.id, selector)
  }

  function startMove(column: C, event: PointerEvent) {
    swallowClick = false
    if (event.button !== 0 || column.pin || modified(event)) return
    if ((event.target as Element).closest('[role="separator"], [data-hide]')) return
    const from = event.clientX
    let moving = false
    const target = (x: number): Drop | undefined => {
      const over = headers().find(th => { const r = th.getBoundingClientRect(); return x >= r.left && x < r.right })
      const id = over?.dataset.col
      if (!over || !id || id === column.id || options.columns().find(item => item.id === id)?.pin) return
      const r = over.getBoundingClientRect()
      const before = (x < r.left + r.width / 2) === (direction() > 0)
      return { id, side: before ? 'before' : 'after' }
    }
    const move = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return
      if (!moving && Math.abs(e.clientX - from) < dragThreshold) return
      if (!moving) { moving = true; setDragging(column.id) }
      e.preventDefault()
      const next = target(e.clientX)
      const now = drop()
      if (next?.id !== now?.id || next?.side !== now?.side) setDrop(next)
    }
    const end = (commit: boolean) => (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', cancel)
      if (!moving) return
      swallowClick = true
      const place = commit ? target(e.clientX) : undefined
      setDrop(undefined)
      setDragging(undefined)
      if (place && control.place(column.id, place.id, place.side)) { flush(); announceMove(column.id) }
      flush()
    }
    const up = end(true), cancel = end(false)
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', cancel)
  }

  const hide = (column: C) => {
    if (!control.hide(column.id)) return
    flush()
    say(`${column.label} hidden`)
    corner?.focus()
  }

  return {
    setTable: (element: HTMLTableElement) => { table = element },
    /** Where a dragged header would land, for the drop indicator on one header cell. */
    dropSide: (id: string) => drop()?.id === id ? drop()!.side : undefined,
    dragging: (id: string) => dragging() === id ? '' : undefined,
    onHeaderPointerDown: (column: C, event: PointerEvent) => startMove(column, event),
    onHeaderKeyDown: (column: C, event: KeyboardEvent) => headerKey(column, event),
    /** True once for the click that ends a header drag, so the drag does not sort. */
    takeDragClick: () => { const value = swallowClick; swallowClick = false; return value },
    sortKeys: (column: C) => column.pin ? undefined : 'Alt+ArrowLeft Alt+ArrowRight',
    width,
    tableStyle: (narrowest?: string): JSX.CSSProperties => control.sized()
      ? { 'inline-size': `${total()}px`, 'min-inline-size': '0' } : { 'min-inline-size': narrowest },
    sized: () => control.sized(),
    /** The hide button and the resize edge inside a header cell. */
    Tools: (props: { column: C }) => <>
      <Show when={control.canHide(props.column.id)}>
        <button type="button" class={styles.hide} data-hide aria-label={`Hide ${props.column.label} column`}
          title={`Hide ${props.column.label} column`} onClick={() => hide(props.column)}><Icon data={EyeOff} small /></button>
      </Show>
      <span class={styles.grip} role="separator" tabindex={0} aria-orientation="vertical"
        aria-label={`Resize ${props.column.label} column`} title={`Resize ${props.column.label} column`}
        aria-valuemin={minWidth} aria-valuemax={maxWidth} aria-valuenow={width(props.column.id) ?? 0}
        aria-valuetext={width(props.column.id) == null ? 'Automatic width' : `${width(props.column.id)} pixels`}
        onPointerDown={event => startResize(props.column.id, event)}
        onKeyDown={event => resizeKey(props.column.id, event)}
        onDblClick={event => { event.stopPropagation(); resetWidth(props.column.id) }} />
    </>,
    ColGroup: () => <colgroup>
      <For each={control.visible()} keyed={column => column.id}>{column =>
        <col data-col={column().id} style={{ 'inline-size': width(column().id) == null ? undefined : `${width(column().id)}px` }} />
      }</For>
    </colgroup>,
    /** The corner button: every column with its visibility, and reset. */
    Menu: () => {
      const id = createUniqueId()
      const [open, setOpen] = createSignal(false)
      let surface!: HTMLDivElement
      const items = () => Array.from(surface.querySelectorAll<HTMLElement>('[role^="menuitem"]'))
      const close = (focus: boolean) => { surface.hidePopover(); if (focus) corner?.focus() }
      const name = () => `${options.label()} columns${control.hiddenCount() ? `, ${control.hiddenCount()} hidden` : ''}`
      const locked = (column: C) => !!column.pin || (!control.hidden(column.id) && !control.canHide(column.id))
      return <>
        <button ref={element => { corner = element }} type="button" class={styles.corner} data-columns
          aria-label={name()} title={control.hiddenCount() ? `Columns: ${control.hiddenCount()} hidden` : 'Columns'}
          aria-haspopup="menu" aria-expanded={open() ? 'true' : 'false'} aria-controls={id}
          onClick={event => {
            event.preventDefault()
            if (surface.matches(':popover-open')) { close(true); return }
            surface.showPopover({ source: corner })
            items()[0]?.focus()
          }}
          onKeyDown={event => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
            event.preventDefault()
            surface.showPopover({ source: corner })
            items().at(event.key === 'ArrowUp' ? -1 : 0)?.focus()
          }}>
          <Icon data={Columns3} small />
          <Show when={control.hiddenCount()}>{count => <span class={styles.badge} data-hidden-count aria-hidden="true">{count()}</span>}</Show>
        </button>
        <div ref={surface} id={id} class={styles.menu} popover="auto" role="menu" aria-label={`${options.label()} columns`}
          onToggle={event => setOpen(event.newState === 'open')}
          onFocusOut={event => {
            if (event.relatedTarget instanceof Node && !surface.contains(event.relatedTarget) && event.relatedTarget !== corner) close(false)
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
            moveFocus(event, items(), 'ArrowUp', 'ArrowDown')
          }}>
          <For each={control.all()} keyed={column => column.id}>{column =>
            <button type="button" role="menuitemcheckbox" class={styles.item} tabindex={-1}
              aria-checked={control.hidden(column().id) ? 'false' : 'true'}
              aria-disabled={locked(column()) ? 'true' : undefined}
              title={column().pin ? `${column().label} always shows` : locked(column()) ? 'One column always shows' : undefined}
              onClick={() => {
                if (locked(column())) return
                const shown = !control.hidden(column().id)
                if (shown ? control.hide(column().id) : control.show(column().id)) {
                  flush()
                  say(`${column().label} ${shown ? 'hidden' : 'shown'}`)
                }
              }}>
              <span class={styles.check} aria-hidden="true">
                <Show when={!control.hidden(column().id)}><Icon data={Check} small /></Show>
              </span>{column().label}
            </button>
          }</For>
          <hr class={styles.rule} />
          <button type="button" role="menuitem" class={styles.item} tabindex={-1} data-reset onClick={() => {
            control.reset()
            flush()
            restore()
            say('Columns reset')
            close(true)
          }}><span class={styles.check} aria-hidden="true"><Icon data={RotateCcw} small /></span>Reset columns</button>
        </div>
      </>
    },
    Status: () => <span class={styles.status} aria-live="polite" data-columns-status>{message()}</span>,
  }
}
