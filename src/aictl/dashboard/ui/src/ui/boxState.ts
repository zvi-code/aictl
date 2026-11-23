/**
 * The state of the boxes on a screen: which are folded to their header line, expanded to the room
 * of their container, shown full screen, or hidden. Pure, so every rule is tested alone; the
 * component in Box.tsx applies it. Full screen is never stored: a reload starts in the page.
 */

export type BoxAction = 'fold' | 'expand' | 'full' | 'hide'

export interface BoxState {
  folded: readonly string[]
  expanded: readonly string[]
  hidden: readonly string[]
  /** The one box shown full screen. */
  full?: string
}

export type BoxEvent = { type: BoxAction | 'restore'; id: string } | { type: 'escape' }

export const emptyBoxes = (): BoxState => ({ folded: [], expanded: [], hidden: [] })

const toggle = (list: readonly string[], id: string) => list.includes(id) ? list.filter(item => item !== id) : [...list, id]
const without = (list: readonly string[], id: string) => list.filter(item => item !== id)

export function reduceBoxes(state: BoxState, event: BoxEvent): BoxState {
  if (event.type === 'escape') return state.full == null ? state : { ...state, full: undefined }
  const { id } = event
  switch (event.type) {
    // Folding a full-screen box first returns it to the page.
    case 'fold': return { ...state, folded: toggle(state.folded, id), full: state.full === id ? undefined : state.full }
    case 'expand': return { ...state, expanded: toggle(state.expanded, id) }
    // Full screen shows the box open; only one box is full screen at a time.
    case 'full': return state.full === id ? { ...state, full: undefined } : { ...state, full: id, folded: without(state.folded, id) }
    case 'hide': return { ...state, hidden: state.hidden.includes(id) ? state.hidden : [...state.hidden, id], full: state.full === id ? undefined : state.full }
    case 'restore': return { ...state, hidden: without(state.hidden, id) }
  }
}

const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

/** Read the stored state; anything malformed is dropped, never trusted. */
export function readBoxes(storage: Pick<Storage, 'getItem'> | undefined, key: string): BoxState {
  try {
    const raw = storage?.getItem(key)
    if (!raw) return emptyBoxes()
    const parsed = JSON.parse(raw) as Partial<Record<keyof BoxState, unknown>> | null
    if (!parsed || typeof parsed !== 'object') return emptyBoxes()
    return { folded: strings(parsed.folded), expanded: strings(parsed.expanded), hidden: strings(parsed.hidden) }
  } catch {
    return emptyBoxes()
  }
}

export function writeBoxes(storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined, key: string, state: BoxState) {
  try {
    const { folded, expanded, hidden } = state
    if (!folded.length && !expanded.length && !hidden.length) storage?.removeItem(key)
    else storage?.setItem(key, JSON.stringify({ folded, expanded, hidden }))
  } catch { /* a per-viewer convenience: not kept when storage is unavailable */ }
}

/** The hidden boxes with their labels, in the order they were hidden, for the restore control. */
export const hiddenBoxes = (state: BoxState, labels: ReadonlyMap<string, string>) =>
  state.hidden.filter(id => labels.has(id)).map(id => ({ id, label: labels.get(id)! }))
