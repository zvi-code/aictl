// Column order, visibility and widths for every dashboard table, saved per browser.
// The shared Table and the agents tree read the same layout through createColumnLayout.
import { createMemo, createSignal, type Accessor } from 'solid-js'

export const storagePrefix = 'aictl-table-v1:'
export const minWidth = 32
export const maxWidth = 1600
export const widthStep = 16

export type ColumnLayout = { order: string[]; hidden: string[]; widths: Record<string, number> }
/** A pinned column stays at its edge and stays visible: a tree's first column, the actions column. */
export type ColumnSpec = { id: string; label: string; pin?: 'start' | 'end' }
export type LegacyKeys = {
  /** A JSON list of hidden column ids. */
  hidden?: string
  /** A JSON list of visible column ids; the first column was always visible. */
  visible?: string
  /** A JSON list of pixel widths by position, for the ids in widthIds. */
  widths?: string
  widthIds?: readonly string[]
}
export type LayoutOptions = { defaultHidden?: readonly string[]; legacy?: LegacyKeys }

export const tableKey = (id: string) => `${storagePrefix}${id}`
export const clampWidth = (width: number) => Math.min(maxWidth, Math.max(minWidth, Math.round(width)))

const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const object = (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined

export function emptyLayout(columns: readonly ColumnSpec[], defaultHidden: readonly string[] = []): ColumnLayout {
  return normalizeLayout({ hidden: defaultHidden }, columns)
}

/** Fit any stored value to the current columns: unknown ids drop out, new columns join at the end. */
export function normalizeLayout(value: unknown, columns: readonly ColumnSpec[]): ColumnLayout {
  const raw = object(value) ?? {}
  const known = new Map(columns.map(column => [column.id, column]))
  const order = [...new Set(strings(raw.order).filter(id => known.has(id)))]
  for (const column of columns) if (!order.includes(column.id)) order.push(column.id)
  const hidden = [...new Set(strings(raw.hidden).filter(id => known.has(id) && !known.get(id)!.pin))]
  if (hidden.length && columns.every(column => hidden.includes(column.id))) hidden.splice(hidden.indexOf(order[0]), 1)
  const widths: Record<string, number> = {}
  for (const [id, width] of Object.entries(object(raw.widths) ?? {})) {
    if (known.has(id) && typeof width === 'number' && Number.isFinite(width)) widths[id] = clampWidth(width)
  }
  return { order, hidden, widths }
}

/** All columns in display order, and the visible ones: start pins, ordered columns, end pins. */
export function arrangeColumns<C extends ColumnSpec>(columns: readonly C[], layout: ColumnLayout) {
  const byId = new Map(columns.map(column => [column.id, column]))
  const ordered = layout.order.flatMap(id => byId.get(id) ?? [])
  for (const column of columns) if (!ordered.includes(column)) ordered.push(column)
  const all = [
    ...columns.filter(column => column.pin === 'start'),
    ...ordered.filter(column => !column.pin),
    ...columns.filter(column => column.pin === 'end'),
  ]
  const hidden = new Set(layout.hidden)
  let visible = all.filter(column => column.pin || !hidden.has(column.id))
  if (!visible.length && all.length) visible = [all[0]]
  return { all, visible }
}

const canHide = (columns: readonly ColumnSpec[], layout: ColumnLayout, id: string) => {
  const column = columns.find(item => item.id === id)
  if (!column || column.pin || layout.hidden.includes(id)) return false
  return arrangeColumns(columns, layout).visible.length > 1
}

export function hideColumn(layout: ColumnLayout, columns: readonly ColumnSpec[], id: string): ColumnLayout {
  return canHide(columns, layout, id) ? { ...layout, hidden: [...layout.hidden, id] } : layout
}

export function showColumn(layout: ColumnLayout, _columns: readonly ColumnSpec[], id: string): ColumnLayout {
  return layout.hidden.includes(id) ? { ...layout, hidden: layout.hidden.filter(item => item !== id) } : layout
}

/** Put a column before or after another visible, unpinned column. */
export function placeColumn(layout: ColumnLayout, columns: readonly ColumnSpec[], id: string, target: string, side: 'before' | 'after'): ColumnLayout {
  const pinned = (key: string) => columns.find(column => column.id === key)?.pin
  if (id === target || pinned(id) || pinned(target) || !columns.some(column => column.id === target)) return layout
  const order = layout.order.filter(item => item !== id)
  const at = order.indexOf(target)
  if (at < 0) return layout
  order.splice(side === 'before' ? at : at + 1, 0, id)
  return order.every((item, index) => item === layout.order[index]) ? layout : { ...layout, order }
}

/** Swap a column with its next visible neighbour in the given direction. */
export function moveColumn(layout: ColumnLayout, columns: readonly ColumnSpec[], id: string, delta: -1 | 1): ColumnLayout {
  const visible = arrangeColumns(columns, layout).visible
  const index = visible.findIndex(column => column.id === id)
  const neighbour = visible[index + delta]
  if (index < 0 || !neighbour) return layout
  return placeColumn(layout, columns, id, neighbour.id, delta > 0 ? 'after' : 'before')
}

function read(key: string): unknown {
  try {
    const text = localStorage.getItem(key)
    return text == null ? undefined : JSON.parse(text)
  } catch { return undefined }
}

function legacyLayout(columns: readonly ColumnSpec[], legacy: LegacyKeys | undefined): Partial<ColumnLayout> | undefined {
  if (!legacy) return
  const result: Partial<ColumnLayout> = {}
  if (legacy.hidden) {
    const hidden = read(legacy.hidden)
    if (Array.isArray(hidden)) result.hidden = strings(hidden)
  }
  if (legacy.visible) {
    const visible = read(legacy.visible)
    if (Array.isArray(visible)) {
      const shown = new Set([columns[0]?.id, ...strings(visible)])
      result.hidden = columns.filter(column => !shown.has(column.id)).map(column => column.id)
    }
  }
  if (legacy.widths && legacy.widthIds) {
    const widths = read(legacy.widths)
    if (Array.isArray(widths) && widths.length === legacy.widthIds.length) {
      result.widths = Object.fromEntries(legacy.widthIds.flatMap((id, index) => typeof widths[index] === 'number' ? [[id, widths[index]]] : []))
    }
  }
  return Object.keys(result).length ? result : undefined
}

export function loadLayout(key: string, columns: readonly ColumnSpec[], options: LayoutOptions = {}): ColumnLayout {
  const saved = read(key)
  if (object(saved)) return normalizeLayout(saved, columns)
  const legacy = legacyLayout(columns, options.legacy)
  return normalizeLayout({ hidden: options.defaultHidden ?? [], ...legacy }, columns)
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((item, index) => item === b[index])

export function isDefaultLayout(layout: ColumnLayout, columns: readonly ColumnSpec[], defaultHidden: readonly string[] = []) {
  const base = emptyLayout(columns, defaultHidden)
  return same(layout.order, base.order) && same([...layout.hidden].sort(), [...base.hidden].sort()) && !Object.keys(layout.widths).length
}

export function saveLayout(key: string, layout: ColumnLayout, columns: readonly ColumnSpec[], defaultHidden: readonly string[] = []) {
  try {
    if (isDefaultLayout(layout, columns, defaultHidden)) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(layout))
  } catch { /* The table still works without storage. */ }
}

export type ColumnLayoutControl<C extends ColumnSpec> = ReturnType<typeof createColumnLayout<C>>

export function createColumnLayout<C extends ColumnSpec>(options: {
  key: Accessor<string>
  columns: Accessor<readonly C[]>
  defaultHidden?: Accessor<readonly string[] | undefined>
  legacy?: Accessor<LegacyKeys | undefined>
}) {
  const defaults = () => options.defaultHidden?.() ?? []
  const loaded = createMemo(() => ({
    key: options.key(), layout: loadLayout(options.key(), options.columns(), { defaultHidden: defaults(), legacy: options.legacy?.() }),
  }))
  const [edited, setEdited] = createSignal<{ key: string; layout: ColumnLayout }>()
  const layout = createMemo(() => {
    const own = edited()
    const base = own && own.key === loaded().key ? own.layout : loaded().layout
    return normalizeLayout(base, options.columns())
  })
  const arranged = createMemo(() => arrangeColumns(options.columns(), layout()))
  // Event handlers read the newest layout, even before the next flush.
  let latest: { key: string; layout: ColumnLayout } | undefined
  const current = () => latest?.key === options.key() ? normalizeLayout(latest.layout, options.columns()) : layout()
  const commit = (base: ColumnLayout, next: ColumnLayout) => {
    const key = options.key()
    if (next === base) return false
    latest = { key, layout: next }
    setEdited(latest)
    saveLayout(key, next, options.columns(), defaults())
    return true
  }
  const change = (update: (base: ColumnLayout) => ColumnLayout) => {
    const base = current()
    return commit(base, update(base))
  }
  const columns = () => options.columns()
  return {
    layout,
    all: () => arranged().all,
    visible: () => arranged().visible,
    hidden: (id: string) => layout().hidden.includes(id),
    hiddenCount: () => arranged().all.length - arranged().visible.length,
    canHide: (id: string) => canHide(columns(), layout(), id),
    width: (id: string): number | undefined => layout().widths[id],
    sized: () => arranged().visible.some(column => layout().widths[column.id] != null),
    hide: (id: string) => change(base => hideColumn(base, columns(), id)),
    show: (id: string) => change(base => showColumn(base, columns(), id)),
    move: (id: string, delta: -1 | 1) => change(base => moveColumn(base, columns(), id, delta)),
    place: (id: string, target: string, side: 'before' | 'after') => change(base => placeColumn(base, columns(), id, target, side)),
    /** Set several widths at once, so the first resize can fix every visible column. */
    setWidths: (widths: Record<string, number>) => change(base => {
      const next = { ...base.widths }
      for (const [id, width] of Object.entries(widths)) next[id] = clampWidth(width)
      return { ...base, widths: next }
    }),
    setWidth: (id: string, width: number) => change(base => ({ ...base, widths: { ...base.widths, [id]: clampWidth(width) } })),
    reset: () => change(() => emptyLayout(columns(), defaults())),
  }
}
