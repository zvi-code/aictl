import { at, object } from '../data'
import type { FieldRef, KeyedRow, NodeScope, PanelContext, PanelDef, Read, Row } from '../types'
import { fmtBps, fmtBytes, fmtDur, fmtMoney, fmtNum, fmtPct } from '../../design/format'

export const scalar = (value: unknown) =>
  typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) ? value : undefined

export function presentation(ctx: PanelContext, field: FieldRef) {
  const metadata = ctx.metadata(field.datapoint ?? field.path)
  const unit = metadata?.unit
  const format = (value: string | number | boolean) => {
    if (typeof value !== 'number') return String(value)
    value *= field.scale ?? 1
    if (metadata?.format === 'datetime' || unit === 'epoch_s' || (!metadata?.format && field.format === 'timestamp')) {
      return new Date(value * 1000).toLocaleString()
    }
    if (unit === 'ratio' || metadata?.format === 'percent') return fmtPct(value * 100)
    if (unit === 'usd') return fmtMoney(value)
    if (unit === 'percent') return fmtPct(value)
    if (unit === 'bytes') return fmtBytes(value)
    if (unit === 'rate_bps') return fmtBps(value)
    if (unit === 'seconds') return fmtDur(value)
    return fmtNum(value)
  }
  return { label: field.label ?? metadata?.label ?? field.path.split('.').at(-1)!.replaceAll('_', ' '), unit, format }
}

export function keyedRows(result: Read, identity?: readonly string[]): KeyedRow[] {
  const seen = new Set<string>()
  if (!Array.isArray(result.value)) return []
  return result.value.flatMap((entry, index) => {
    const row = object(entry)
    if (!row) return []
    const parts = identity?.map(field => { const value = at(row, field.split('|').find(path => at(row, path) != null) ?? field); return value === null ? value : scalar(value) })
    const id = result.rowKeys?.[index] ?? (parts?.length && parts.every(part => part !== undefined) ?
      JSON.stringify(Object.hasOwn(row, 'node_id') ? [row.node_id, ...parts] : parts) : undefined)
    if (id === undefined || seen.has(id)) return []
    seen.add(id)
    return [{ id, row }]
  })
}

export function nodeColumn(scope: NodeScope, rows: readonly {row: Row}[]) {
  return scope !== 'local' && rows.some(({ row }) => Object.hasOwn(row, 'node_id'))
}

export function rowAction(def: PanelDef, ctx: PanelContext, row: Row) {
  for (const action of def.actions) {
    const id = at(row, action.field)
    if (typeof id !== 'string' || !id) continue
    if (action.kind === 'agent') {
      if (action.when && !action.when(row)) continue
      return { label: action.label ?? `Open ${row.title ?? id}`, run: () => {
        const tab = action.tabs?.values[String(at(row, action.tabs.field))] ?? action.tab
        ctx.openAgent(id, tab)
      } }
    }
    if (action.kind === 'detail') {
      if (action.localOnly && ctx.scope() !== 'local') continue
      return { label: `Open ${action.type === 'prompt' ? 'prompt' : row.name ?? id}`, run: () => {
        if (action.type === 'prompt') {
          const ts = at(row, action.timestamp ?? 'ts')
          if (typeof ts === 'number') ctx.openDetail({ type: 'prompt', session_id: id, ts })
        } else if (action.type === 'skill') ctx.openDetail({ type: 'skill', name: id })
        else {
          const project = typeof row.project === 'string' && row.project ? row.project.replace(/[\\/]+$/, '') : ''
          const fullPath = project && !id.startsWith('/') && !id.startsWith('~') && !/^[A-Za-z]:[\\/]/.test(id)
            ? `${project}/${id}` : id
          ctx.openDetail({ type: 'file', path: fullPath, line: 1 })
        }
      } }
    }
    // A value the source did not report ("Model not reported") is a label, not a value to filter by.
    if (row[`${action.field}_reported`] === false) continue
    return { label: action.label, run: () => ctx.navigate({ [action.filter]: ctx.filters()[action.filter] === id ? null : id }) }
  }
}
