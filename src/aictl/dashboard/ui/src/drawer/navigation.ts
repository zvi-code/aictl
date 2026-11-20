import type { DrawerEntry } from '../shell/islandTypes'
import { drawerPatch, readDrawer } from '../shell/viewState'

export function drawerStack(search: string, state: unknown): readonly DrawerEntry[] {
  const entry = readDrawer(search)
  if (!entry) return []
  if (state && typeof state === 'object' && 'boardDrawers' in state && Array.isArray(state.boardDrawers)) {
    const stack = state.boardDrawers as readonly DrawerEntry[]
    const top = stack.at(-1)
    if (top && JSON.stringify(drawerPatch(top)) === JSON.stringify(drawerPatch(entry))) return stack
  }
  return [entry]
}
