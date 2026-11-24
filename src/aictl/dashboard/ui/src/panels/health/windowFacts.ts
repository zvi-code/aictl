import { stamp } from '../../design/format'
import { nodeTag } from '../../data/nodeNames'
import { flowTotals, type BackendView, type FlowsView } from './flowTrends'
import { windowTotals, type SeriesRow, type SeriesView } from './trendModel'

/** What the saved snapshots say about one window. Every quantity has one function here; panels never recount it. */
export type HealthWindow = {
  /** For example "last 24 h". */
  label: string
  series?: SeriesView
  flows?: FlowsView
  backend?: BackendView
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const total = (values: readonly (number | null | undefined)[]) => {
  const known = values.filter(finite)
  return known.length ? known.reduce((a, b) => a + b, 0) : undefined
}

/** Rows the writers dropped in the window: the per-table counter changes of the flows view. */
export const droppedRows = (window?: Pick<HealthWindow, 'flows'>) => {
  const flows = flowTotals(window?.flows)
  return flows ? flows.dropped : undefined
}

/** Ingestion requests that failed in the window, from the per-table counter changes. */
export const failedIngestion = (window?: Pick<HealthWindow, 'flows'>) => {
  const flows = flowTotals(window?.flows)
  return flows ? flows.failures : undefined
}

/** Commands and queries the cluster recorded as failed for this database in the window. */
export const failedCommands = (window?: Pick<HealthWindow, 'backend'>) =>
  window?.backend ? total(window.backend.series.map(row => row.failed)) ?? 0 : undefined

/** Client requests that failed in the window, by kind, from the node snapshots. */
export function failedRequests(window?: Pick<HealthWindow, 'series'>) {
  const rows = window?.series?.rows
  if (!rows) return undefined
  const kinds = {
    reads: total(rows.map(row => row.read_failures)), writes: total(rows.map(row => row.write_failures)),
    commands: total(rows.map(row => row.command_failures)),
  }
  const sum = total(Object.values(kinds)) ?? 0
  return { total: sum, ...kinds }
}

/** Events the sink and the OTel receiver discarded in the window. */
export const droppedEvents = (window?: Pick<HealthWindow, 'series'>) =>
  window?.series ? total(window.series.rows.flatMap(row => [row.sink_dropped, row.otel_dropped])) ?? 0 : undefined

export type Restart = { node_id: string; at: number; step: number }

/** The buckets of the window in which a daemon restarted, newest first. The time is the start of the bucket. */
export function restartList(rows: readonly SeriesRow[] | undefined, step: number): Restart[] | undefined {
  if (!rows) return undefined
  return rows.filter(row => row.restarts > 0).map(row => ({ node_id: row.node_id, at: row.t, step }))
    .sort((a, b) => b.at - a.at || a.node_id.localeCompare(b.node_id))
}

export const restartCount = (window?: Pick<HealthWindow, 'series'>) =>
  window?.series ? windowTotals(window.series.rows).restarts : undefined

export function restartText(restart: Restart, withNode: boolean) {
  const when = `${stamp(restart.at, true)} – ${stamp(restart.at + restart.step)}`
  return `${withNode ? `Node ${nodeTag(restart.node_id)}: ` : ''}${when} (reason not recorded)`
}

/** The logical table of a stored name: `T__<node key>` and `legacy__T` are physical tables of `T`. */
export function logicalTableName(name: string) {
  if (name.startsWith('legacy__')) return name.slice('legacy__'.length)
  const cut = name.lastIndexOf('__')
  return cut > 0 ? name.slice(0, cut) : name
}

/** Logical tables that received rows in the window. */
export const receivingTables = (window?: Pick<HealthWindow, 'flows'>) => flowTotals(window?.flows)?.tables

/** Logical and physical table counts of an inventory; the physical count includes per-node and legacy copies. */
export function inventoryCounts(names: readonly string[] | undefined) {
  if (!names) return undefined
  return { physical: names.length, logical: new Set(names.map(logicalTableName)).size }
}
