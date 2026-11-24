import { createSignal } from 'solid-js'

/** Nodes are shown by a short number instead of their host name: [0] is the node that serves this dashboard, the
    others follow in the order of their ids. The host name stays on hover and in the node list. One order for the
    whole page, set by the shell from the node list. */
const [order, setOrder] = createSignal<readonly string[]>([])

const clean = (id: string) => id.trim().toLowerCase()

/** The numbering: the serving node first, then the other ids in ascending order, each once. */
export function nodeOrder(local: string | null | undefined, ids: readonly string[]): string[] {
  const first = local ? [clean(local)] : []
  const rest = [...new Set(ids.map(clean))].filter(id => id && id !== first[0] && id !== 'legacy').sort()
  return [...first, ...rest]
}

export const setNodes = (local: string | null | undefined, ids: readonly string[]) => { setOrder(nodeOrder(local, ids)) }

/** `[n]` for a node of the list; the id as it is for one the list does not hold (yet). */
export function nodeTag(id: string | null | undefined): string {
  if (!id) return ''
  const index = order().indexOf(clean(id))
  return index < 0 ? id : `[${index}]`
}

/** The number with the host name, for a hover text or a list that introduces the numbers: `[1] host`. */
export function nodeTitle(id: string | null | undefined): string {
  const tag = nodeTag(id)
  return !id || tag === id ? tag : `${tag} ${id}`
}

/** Several nodes in number order: `[0], [2]`. */
export function nodeTags(ids: readonly string[]): string {
  const list = order()
  return [...ids].sort((a, b) => list.indexOf(clean(a)) - list.indexOf(clean(b)) || a.localeCompare(b)).map(nodeTag).join(', ')
}

/** A node in a sentence or a button name: `node [1]`. */
export const nodeNoun = (id: string | null | undefined) => `node ${nodeTag(id)}`

/** A table column of nodes: the cell reads the number, so the column also sorts in number order, and its hover gives
    the number with the host name. A row without a node reads nothing. */
export function nodeCell<T>(id: (row: T) => unknown) {
  const text = (row: T) => { const value = id(row); return typeof value === 'string' && value ? value : undefined }
  return {
    read: (row: T) => { const value = text(row); return value && nodeTag(value) },
    hint: (row: T) => { const value = text(row); return value && nodeTitle(value) },
  }
}
