import { createMemo } from 'solid-js'
import type { DetailContext } from '../../data/contract.gen'
import { at, detailPath, detailRead, scopeConfirmed } from '../data'
import type { PanelContext, Read, Row } from '../types'

type Split = { always: number; on_demand: number; conditional: number }
const loads = [['always', 'every call'], ['on_demand', 'on demand'], ['conditional', 'conditional']] as const
/** How the tokens of a file set reach the model, largest share first; parts with no tokens are left out. */
export function loadSplit(split: Split, format: (value: number) => string) {
  const parts = loads.filter(([key]) => split[key] > 0).sort(([a], [b]) => split[b] - split[a])
  return parts.length ? parts.map(([key, label]) => `${format(split[key])} ${label}`).join(' · ') : 'no tokens'
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
