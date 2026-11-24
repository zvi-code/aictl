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
    if (action.filter === 'project') {
      // The page's project filter: a row chooses its project, and a chosen row clears it.
      return { label: action.label, run: () => {
        const chosen = ctx.filters().projects
        ctx.navigate({ project: chosen.includes(id) ? chosen.filter(p => p !== id) : [id] })
      } }
    }
    const key = action.filter
    return { label: action.label, run: () => ctx.navigate({ [key]: ctx.filters()[key] === id ? null : id }) }
  }
}

type ShownField<T> = { id: string; label: string; read: (row: T) => unknown; clip?: 'start'; title?: string }

const isPath = (value: unknown) => typeof value === 'string' && /[\\/]/.test(value) && !/\s/.test(value.trim())
const empty = (value: unknown) => value == null || value === '' || value === 'Not available from this source'

/** The columns of a panel table as shown, by one rule for every table:
 * - a column that no row has a value for is left out (the first column always stays);
 * - a first word that three or more later columns repeat ("Lifetime input", "Lifetime output") is
 *   left out of their headers, and the full name stays on hover;
 * - a column whose every value is a path clips at its start, so the file name stays visible. */
export function presentFields<T, F extends ShownField<T>>(fields: readonly F[], rows: readonly T[]): F[] {
  const kept = rows.length ? fields.filter((field, index) => index === 0 || rows.some(row => !empty(field.read(row)))) : [...fields]
  const words = new Map<string, number>()
  for (const field of kept.slice(1)) {
    const first = field.label.split(' ')[0]
    if (field.label.includes(' ')) words.set(first, (words.get(first) ?? 0) + 1)
  }
  return kept.map((field, index) => {
    let label = field.label
    const first = label.split(' ')[0]
    if (index > 0 && label.includes(' ') && (words.get(first) ?? 0) >= 3) {
      const rest = label.slice(first.length + 1)
      label = rest.charAt(0).toUpperCase() + rest.slice(1)
    }
    const values = rows.map(row => field.read(row)).filter(value => !empty(value))
    const clip = field.clip ?? (values.length && values.every(isPath) ? 'start' as const : undefined)
    return { ...field, label, title: field.title ?? field.label, ...(clip ? { clip } : {}) }
  })
}
