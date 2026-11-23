/**
 * Column widths of the swim-lane view, in `ch`: the step column (`GUTTER`), one width per lane, and
 * lanes collapsed to an icon strip. Pure, so the limits, fitting and persistence are tested alone.
 */

export const GUTTER = '#gutter'
/** A lane can be narrowed to about its icon; the step column to its number and time. */
export const LANE_MIN = 4
export const LANE_MAX = 60
export const GUTTER_MIN = 7
export const GUTTER_MAX = 24
export const GUTTER_DEFAULT = 11
/** Fitting keeps each lane in view at least this wide when the room allows. */
export const FIT_MIN = 12
/** A collapsed lane: an icon-only strip. */
export const COLLAPSED = 3
/** The step column on the right ("what happened · numbers") keeps at least this much when fitting. */
export const STEP_MIN = 28

export interface WidthState { widths: Record<string, number>; collapsed: string[] }

export const emptyWidths = (): WidthState => ({ widths: {}, collapsed: [] })

export function clampWidth(id: string, width: number) {
  const [min, max] = id === GUTTER ? [GUTTER_MIN, GUTTER_MAX] : [LANE_MIN, LANE_MAX]
  return Math.round(Math.min(max, Math.max(min, Number.isFinite(width) ? width : min)))
}

/** The width of each column: collapsed, else the stored width, else the lane's own default. */
export function resolveWidths(lanes: readonly { id: string; width: number }[], state: WidthState) {
  const collapsed = new Set(state.collapsed)
  const columns: Record<string, number> = { [GUTTER]: clampWidth(GUTTER, state.widths[GUTTER] ?? GUTTER_DEFAULT) }
  for (const lane of lanes) {
    columns[lane.id] = collapsed.has(lane.id) ? COLLAPSED : clampWidth(lane.id, state.widths[lane.id] ?? lane.width)
  }
  return columns
}

/**
 * Widths that fit `available` ch: lanes with no step in view collapse to a strip, the others share
 * what is left after the step column and the right-hand column keep their minimum, in proportion to
 * their current widths, never below LANE_MIN. When even the minimums do not fit, every lane is LANE_MIN.
 */
export function fitWidths(lanes: readonly { id: string; width: number }[], state: WidthState, available: number,
  used: ReadonlySet<string> = new Set(lanes.map(lane => lane.id))): WidthState {
  const current = resolveWidths(lanes, { ...state, collapsed: [] })
  const gutter = Math.min(current[GUTTER], GUTTER_DEFAULT)
  const shown = lanes.filter(lane => used.has(lane.id))
  const hidden = lanes.filter(lane => !used.has(lane.id))
  const room = available - gutter - STEP_MIN - hidden.length * COLLAPSED
  // Every shown lane keeps a readable floor when there is room for it; the rest is shared in proportion.
  const floor = Math.max(LANE_MIN, Math.min(FIT_MIN, Math.floor(room / Math.max(1, shown.length))))
  const excess = shown.reduce((total, lane) => total + Math.max(0, current[lane.id] - floor), 0)
  const share = excess > 0 ? Math.min(1, Math.max(0, room - floor * shown.length) / excess) : 0
  const widths: Record<string, number> = { [GUTTER]: gutter }
  for (const lane of shown) {
    widths[lane.id] = clampWidth(lane.id, floor + Math.floor(Math.max(0, current[lane.id] - floor) * share))
  }
  return { widths, collapsed: hidden.map(lane => lane.id) }
}

/** Read the stored widths; anything malformed is dropped, never trusted. */
export function readWidths(storage: Pick<Storage, 'getItem'> | undefined, key: string): WidthState {
  try {
    const raw = storage?.getItem(key)
    if (!raw) return emptyWidths()
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return emptyWidths()
    const { widths, collapsed } = parsed as Partial<WidthState>
    const clean: Record<string, number> = {}
    for (const [id, width] of Object.entries(widths && typeof widths === 'object' ? widths : {})) {
      if (typeof width === 'number' && Number.isFinite(width)) clean[id] = clampWidth(id, width)
    }
    return { widths: clean, collapsed: Array.isArray(collapsed) ? collapsed.filter((id): id is string => typeof id === 'string') : [] }
  } catch {
    return emptyWidths()
  }
}

export function writeWidths(storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined, key: string, state: WidthState) {
  try {
    if (!Object.keys(state.widths).length && !state.collapsed.length) storage?.removeItem(key)
    else storage?.setItem(key, JSON.stringify(state))
  } catch { /* a per-viewer convenience: not kept when storage is unavailable */ }
}

/**
 * How a text of `length` characters shows in `width` ch: on one line, wrapped to a second line, or
 * clipped with an ellipsis after two lines (the full text is then on hover and in the side panel).
 */
export function textFit(length: number, width: number, lines = 2): 'line' | 'wrap' | 'clip' {
  const usable = Math.max(1, width - 2)
  if (length <= usable) return 'line'
  return length <= usable * lines ? 'wrap' : 'clip'
}
