/**
 * Columns of the Flow chart: their widths in `ch`, their order and which are hidden, kept per browser. Pure, so the
 * limits, the arrangement and the persistence are tested alone.
 */

export const COL_MIN = 4
export const COL_MAX = 80

/** `order` is the order the reader put the columns in, `hidden` the columns taken out. Both are absent until changed. */
export interface WidthState { widths: Record<string, number>; order?: string[]; hidden?: string[] }

export interface Column { id: string; width: number; min?: number; max?: number; flex?: boolean }

export const emptyWidths = (): WidthState => ({ widths: {} })

export const isDefault = (state: WidthState) => !Object.keys(state.widths).length && !state.order?.length && !state.hidden?.length

export function clampWidth(width: number, min = COL_MIN, max = COL_MAX) {
  return Math.round(Math.min(max, Math.max(min, Number.isFinite(width) ? width : min)))
}

/** The width of each column: the stored width within its limits, else its own default. */
export function resolveWidths(columns: readonly Column[], state: WidthState) {
  const widths: Record<string, number> = {}
  for (const column of columns) widths[column.id] = clampWidth(state.widths[column.id] ?? column.width, column.min, column.max)
  return widths
}

/**
 * The columns in the reader's order, split into the shown and the hidden ones. Columns the reader has moved keep their
 * stored order in the places such columns take; a column seen for the first time keeps its default place.
 */
export function arrangeColumns<T extends { id: string }>(columns: readonly T[], state: WidthState) {
  const stored = new Map((state.order ?? []).map((id, index) => [id, index]))
  const slots = columns.map((column, index) => stored.has(column.id) ? index : -1).filter(index => index >= 0)
  const moved = columns.filter(column => stored.has(column.id)).sort((a, b) => stored.get(a.id)! - stored.get(b.id)!)
  const arranged = [...columns]
  slots.forEach((slot, index) => { arranged[slot] = moved[index] })
  const hidden = new Set(state.hidden ?? [])
  return { shown: arranged.filter(column => !hidden.has(column.id)), hidden: arranged.filter(column => hidden.has(column.id)) }
}

/** Move column `id` to position `to` among the columns in their current order `ids`. */
export function moveColumn(state: WidthState, ids: readonly string[], id: string, to: number): WidthState {
  const from = ids.indexOf(id)
  if (from < 0) return state
  const order = ids.filter(item => item !== id)
  order.splice(Math.max(0, Math.min(order.length, to)), 0, id)
  // Columns not in view keep their stored place after the ones in view.
  const rest = (state.order ?? []).filter(item => !order.includes(item))
  return { ...state, order: [...order, ...rest] }
}

/** Take a column out of the chart, or bring it back. */
export function hideColumn(state: WidthState, id: string, hide = true): WidthState {
  const hidden = (state.hidden ?? []).filter(item => item !== id)
  return { ...state, hidden: hide ? [...hidden, id] : hidden }
}

/** The grid of the shown columns: fixed widths in `ch`, the flexible column taking what is left but never less than its width. */
export function columnGrid(shown: readonly Column[], widths: Record<string, number>) {
  let total = 0
  const parts = shown.map(column => {
    const width = widths[column.id] ?? column.width
    total += width
    return column.flex ? `minmax(${width}ch, 1fr)` : `${width}ch`
  })
  return { template: parts.join(' '), total: `${total}ch` }
}

/** Read the stored widths; anything malformed is dropped, never trusted. */
export function readWidths(storage: Pick<Storage, 'getItem'> | undefined, key: string): WidthState {
  try {
    const raw = storage?.getItem(key)
    if (!raw) return emptyWidths()
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return emptyWidths()
    const { widths, order, hidden } = parsed as Partial<Record<'widths' | 'order' | 'hidden', unknown>>
    const clean: Record<string, number> = {}
    for (const [id, width] of Object.entries(widths && typeof widths === 'object' ? widths : {})) {
      if (typeof width === 'number' && Number.isFinite(width)) clean[id] = clampWidth(width)
    }
    const strings = (value: unknown) => Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
    return { widths: clean, ...strings(order).length ? { order: strings(order) } : {}, ...strings(hidden).length ? { hidden: strings(hidden) } : {} }
  } catch {
    return emptyWidths()
  }
}

export function writeWidths(storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined, key: string, state: WidthState) {
  try {
    if (isDefault(state)) storage?.removeItem(key)
    else storage?.setItem(key, JSON.stringify(state))
  } catch { /* a per-viewer convenience: not kept when storage is unavailable */ }
}
