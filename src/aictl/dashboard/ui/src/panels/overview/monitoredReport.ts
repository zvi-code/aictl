import { createMemo } from 'solid-js'
import type { DetailNodes } from '../../data/contract.gen'
import { detailPath } from '../data'
import type { PanelContext } from '../types'

/** Counts from the selected nodes' own recent monitor reports, independent of historical filters. */
export function monitoredReport(ctx: PanelContext) {
  const report = ctx.detail<Extract<DetailNodes, { view: 'runtime' }>>(() =>
    ctx.scope() === 'local' ? undefined : detailPath(ctx, '/api/board/nodes', new URLSearchParams({ view: 'runtime' })))
  return createMemo(() => {
    const data = report()?.data
    if (ctx.scope() === 'local' || data?.view !== 'runtime' || data.scope !== ctx.scope() ||
      !Array.isArray(data.rows) || (ctx.scope() === 'node' && data.rows.some(row => row.node_id !== ctx.nodeId()))) return
    const now = Date.now() / 1000
    const rows = data.rows.filter(row => row.activity_at != null && now - row.activity_at <= 300 && row.activity_at <= now + 60 &&
      Number.isSafeInteger(row.active_sessions) && row.active_sessions! >= 0)
    if (rows.length) return { count: rows.reduce((sum, row) => sum + row.active_sessions!, 0), hosts: rows.length }
  })
}
