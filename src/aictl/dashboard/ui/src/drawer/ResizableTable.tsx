import { createEffect, createMemo } from 'solid-js'
import { Table } from '../ui/Table'
import styles from './resizableTable.module.css'

const minimum = 40
const maximum = 1600
const step = 10
const clamp = (width: number) => Math.min(maximum, Math.max(minimum, Math.round(width)))

function storedWidths(key: string, count: number): number[] | undefined {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (Array.isArray(stored) && stored.length === count && stored.every(n => typeof n === 'number' && Number.isFinite(n))) {
      return stored.map(clamp)
    }
  } catch { /* Widths still work without storage. */ }
}

function enableResize(table: HTMLTableElement, label: string, names: readonly string[], key: string) {
  const headers = Array.from(table.tHead?.rows[0]?.cells ?? [])
  if (!headers.length || headers.length !== names.length) return
  const cols = document.createElement('colgroup')
  const controller = new AbortController()
  const listeners = { signal: controller.signal }
  let widths = storedWidths(key, headers.length)
  let drag: { pointer: number; index: number; x: number; rtl: number; start: number[]; next?: number[] } | undefined
  let frame = 0

  const parts = headers.map((header, index) => {
    const col = document.createElement('col')
    cols.append(col)
    const headerLabel = header.getAttribute('aria-label')
    const grip = document.createElement('span')
    grip.className = styles.grip
    grip.tabIndex = 0
    grip.setAttribute('role', 'separator')
    grip.setAttribute('aria-orientation', 'vertical')
    grip.setAttribute('aria-label', `Resize ${names[index]} column in ${label}`)
    grip.setAttribute('aria-valuemin', '0')
    grip.setAttribute('aria-valuemax', String(maximum))
    grip.title = 'Drag or use Left/Right. Double-click or press Home to reset this table.'
    header.classList.add(styles.header)
    header.setAttribute('aria-label', headerLabel ?? names[index])
    header.append(grip)
    return { col, grip, headerLabel }
  })
  table.prepend(cols)

  function paint(next?: readonly number[]) {
    table.style.inlineSize = next ? `${next.reduce((sum, width) => sum + width, 0)}px` : ''
    table.classList.toggle(styles.fixed, !!next)
    for (const [index, { col, grip }] of parts.entries()) {
      const width = next?.[index]
      col.style.inlineSize = width == null ? '' : `${width}px`
      grip.setAttribute('aria-valuenow', String(width ?? 0))
      grip.setAttribute('aria-valuetext', width == null ? 'Automatic width' : `${width} pixels`)
    }
  }
  function save(next?: number[]) {
    widths = next
    paint(next)
    try {
      if (next) localStorage.setItem(key, JSON.stringify(next))
      else localStorage.removeItem(key)
    } catch { /* Widths still work without storage. */ }
  }
  const measure = () => widths?.slice() ?? headers.map(header => clamp(header.getBoundingClientRect().width))
  const direction = () => getComputedStyle(table).direction === 'rtl' ? -1 : 1
  const stop = (commit: boolean) => {
    if (!drag) return
    const { next, index, pointer } = drag
    drag = undefined
    cancelAnimationFrame(frame)
    frame = 0
    const grip = parts[index].grip
    if (grip.hasPointerCapture(pointer)) grip.releasePointerCapture(pointer)
    if (commit && next) save(next)
    else paint(widths)
  }
  for (const [index, { grip }] of parts.entries()) {
    grip.addEventListener('keydown', event => {
      const delta = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
      if ((!delta && event.key !== 'Home') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      event.preventDefault()
      event.stopPropagation()
      stop(false)
      if (event.key === 'Home') { save(); return }
      const next = measure()
      next[index] = clamp(next[index] + delta * direction())
      save(next)
    }, listeners)
    grip.addEventListener('pointerdown', event => {
      if (event.button !== 0 || drag) return
      event.preventDefault()
      grip.focus({ preventScroll: true })
      grip.setPointerCapture(event.pointerId)
      drag = { pointer: event.pointerId, index, x: event.clientX, rtl: direction(), start: measure() }
    }, listeners)
    const update = (event: PointerEvent) => {
      const current = drag
      if (!current || current.pointer !== event.pointerId || current.index !== index) return
      const delta = (event.clientX - current.x) * current.rtl
      if (!delta && !current.next) return
      current.next = current.start.slice()
      current.next[index] = clamp(current.start[index] + delta)
    }
    grip.addEventListener('pointermove', event => {
      update(event)
      if (!drag?.next || frame) return
      frame = requestAnimationFrame(() => { frame = 0; paint(drag?.next ?? widths) })
    }, listeners)
    grip.addEventListener('pointerup', event => {
      if (drag?.pointer !== event.pointerId) return
      update(event)
      stop(true)
    }, listeners)
    const cancel = (event: PointerEvent) => { if (drag?.pointer === event.pointerId) stop(false) }
    grip.addEventListener('pointercancel', cancel, listeners)
    grip.addEventListener('lostpointercapture', cancel, listeners)
    grip.addEventListener('dblclick', () => { stop(false); save() }, listeners)
  }
  paint(widths)
  return () => {
    controller.abort()
    stop(false)
    paint()
    for (const [index, { grip, headerLabel }] of parts.entries()) {
      grip.remove()
      const header = headers[index]
      header.classList.remove(styles.header)
      if (headerLabel == null) header.removeAttribute('aria-label')
      else header.setAttribute('aria-label', headerLabel)
    }
    cols.remove()
  }
}

export function ResizableTable<T extends object>(props: Parameters<typeof Table<T>>[0]) {
  let host: HTMLDivElement | undefined
  const schema = createMemo(() => JSON.stringify([props.label, props.fields.map(field => [field.id, field.label]), !!props.action]))
  // Decorate only the header. The shared table still owns sorting, row identity and virtualization.
  createEffect(schema, () => {
    const table = host?.querySelector('table')
    if (!table) return
    const names = props.fields.map(field => field.label)
    if (props.action) names.push('Actions')
    const key = `aictl.drawer.columns.v1:${JSON.stringify([props.label, props.fields.map(field => field.id), !!props.action])}`
    return enableResize(table, props.label, names, key)
  })
  return <div ref={host} class={styles.host}><Table {...props} /></div>
}
