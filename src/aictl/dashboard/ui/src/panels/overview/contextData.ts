import { createMemo } from 'solid-js'
import type { DetailContext } from '../../data/contract.gen'
import { at, detailPath, detailRead, scopeConfirmed } from '../data'
import { fmtNum } from '../../design/format'
import type { PanelContext, Read, Row } from '../types'

type Split = { always: number; on_demand: number; conditional: number }
const loads = [['always', 'every call'], ['on_demand', 'on demand'], ['conditional', 'conditional']] as const
/** How the tokens of a file set reach the model, largest share first; parts with no tokens are left out. */
export function loadSplit(split: Split, format: (value: number) => string) {
  const parts = loads.filter(([key]) => split[key] > 0).sort(([a], [b]) => split[b] - split[a])
  return parts.length ? parts.map(([key, label]) => `${format(split[key])} ${label}`).join(' · ') : 'no tokens'
}

type Excluded = { kind: string; policy: 'no' | 'unknown'; files: number }
/** The files tools keep that are not model context, as one line of counts by kind, largest first. */
export function excludedSummary(sets: readonly { excluded?: readonly Excluded[] }[]) {
  const kinds = new Map<string, number>()
  for (const set of sets) for (const row of set.excluded ?? []) {
    const key = row.policy === 'unknown' ? `${row.kind} (loading not known)` : row.kind
    kinds.set(key, (kinds.get(key) ?? 0) + row.files)
  }
  const ranked = [...kinds].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
  return { files: ranked.reduce((sum, [, files]) => sum + files, 0), kinds: ranked.map(([kind, files]) => ({ kind, files })) }
}

/** One line for the tools whose context list is cut to the largest files. */
export function truncationNote(sets: readonly { tool: string; count: number; files: readonly unknown[]; truncated: boolean; node_id?: string }[],
  name: (tool: string) => string) {
  const cut = sets.filter(set => set.truncated)
  if (!cut.length) return
  const limit = Math.max(...cut.map(set => set.files.length))
  return `Each tool lists its ${fmtNum(limit)} largest context files; ${cut.map(set =>
    `${name(set.tool)}${set.node_id ? ` (${set.node_id})` : ''} has ${fmtNum(set.count)}`).join(', ')}.`
}

/** A memory group row's figures from its files: lines summed (unknown if any file's is), the latest
 *  change, and in fleet scope the node or the number of nodes the files come from. */
export function groupFigures(items: readonly { lines?: number | null; mtime?: number | null; node_id?: string }[]) {
  const lines = items.every(item => typeof item.lines === 'number') ? items.reduce((sum, item) => sum + item.lines!, 0) : undefined
  const times = items.flatMap(item => typeof item.mtime === 'number' ? [item.mtime] : [])
  const nodes = [...new Set(items.flatMap(item => item.node_id ? [item.node_id] : []))]
  return {
    lines, mtime: times.length ? Math.max(...times) : undefined,
    ...(nodes.length ? { node_id: nodes.length === 1 ? nodes[0] : `${fmtNum(nodes.length)} nodes` } : {}),
  }
}

export const loadLabel = (load: unknown) => loads.find(([key]) => key === load)?.[1]

/** A row that names a file opens the file's drawer; the drawer itself says what this scope can show. */
export function openFile(ctx: Pick<PanelContext, 'openDetail'>, row: Row, path = 'path') {
  const file = row[path]
  if (typeof file !== 'string' || !file) return
  const name = typeof row.name === 'string' && row.name ? row.name : file
  return { label: `Open ${name}`, run: () => ctx.openDetail({ type: 'file', path: file, line: 1 }) }
}

export function useContext(ctx: PanelContext) {
  const resource = ctx.detail<DetailContext>(() => {
    const tools = ctx.tools()
    return detailPath(ctx, '/api/board/context', new URLSearchParams(tools ? { tool: tools.join(',') || '-' } : {}))
  })
  const nodes = createMemo(() => {
    const data = resource()?.data
    if (!data) return
    if (ctx.scope() === 'local') return 'nodes' in data ? undefined : [data]
    return 'nodes' in data && scopeConfirmed(ctx, data.node_scope) &&
      data.nodes.every(node => node.node_id && (ctx.scope() !== 'node' || node.node_id === ctx.nodeId())) ? data.nodes : undefined
  })
  const read = (value: unknown): Read => resource()?.data && !nodes()
    ? { state: 'error', message: 'The server did not confirm the requested context scope.' }
    : detailRead(resource(), value, ctx.paused())
  function rows<T extends object>(path: string): Read & { value?: (T & { node_id?: string })[] } {
    const sources = nodes()
    const arrays = sources?.map(node => ({ node, rows: at(node, path) }))
    const reported = arrays?.filter(entry => Array.isArray(entry.rows))
    const value = reported?.length || sources?.length === 0 ? reported?.flatMap(({ node, rows }) =>
      (rows as T[]).map(row => 'node_id' in node ? { ...row, node_id: String(node.node_id) } : row)) ?? [] : undefined
    const state = read(value)
    if (state.state === 'ready' && reported!.length < arrays!.length) {
      return { state: 'stale', value, message: 'Some nodes did not report this field.' }
    }
    return { ...state, value }
  }
  return { nodes, read, rows, retry: resource.retry }
}
