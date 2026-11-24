import type { DetailNodes } from '../../data/contract.gen'
import { MAX_LINES, type Plot, type SeriesRow } from './trendModel'
import { nodeTag } from '../../data/nodeNames'

export type FlowsView = Extract<DetailNodes, { view: 'flows' }>
export type BackendView = Extract<DetailNodes, { view: 'backend' }>
export type FlowTableRow = FlowsView['tables'][number]
export type FlowNodeRow = FlowsView['nodes'][number]
export type BackendWork = BackendView['series'][number]['work']
type Scope = 'local' | 'node' | 'fleet'
type Entry = { group: string; t: number; value: number | null | undefined }

export const WORK: readonly { id: BackendWork; label: string }[] = [
  { id: 'aictl_queries', label: 'aictl queries' }, { id: 'other_queries', label: 'Other queries' },
  { id: 'ingestion', label: 'Ingestion' }, { id: 'maintenance', label: 'Maintenance' },
]

export function confirmedFlows(value: DetailNodes | undefined, scope: Scope, nodeId?: string | null): value is FlowsView {
  return value?.view === 'flows' && value.scope === scope && value.step > 0 && Array.isArray(value.tables)
    && Array.isArray(value.nodes) && value.nodes.every(row => typeof row?.table === 'string'
      && (scope !== 'node' || row.node_id === nodeId))
}

export function confirmedBackend(value: DetailNodes | undefined, scope: Scope): value is BackendView {
  return value?.view === 'backend' && value.scope === scope && value.step > 0 && Array.isArray(value.series)
    && Array.isArray(value.views)
}

const finite = (value: number | null | undefined): value is number => value != null && Number.isFinite(value)

/**
 * A stacked plot of the largest groups. When there are more groups than chart colors, the smaller
 * ones are summed into one "Other" band, so the total stays correct for any number of nodes or tables.
 * A bucket that has a row for some group shows zero for the others; a bucket without rows is a gap.
 */
export function groupPlot(entries: Iterable<Entry>, times: readonly number[], options: {
  order?: readonly string[]; present?: (t: number) => boolean; noun?: string
} = {}): Plot {
  const totals = new Map<string, number>(), cells = new Map<string, Map<number, number>>(), seen = new Set<number>()
  for (const { group, t, value } of entries) {
    seen.add(t)
    if (!finite(value)) continue
    totals.set(group, (totals.get(group) ?? 0) + value)
    const row = cells.get(group) ?? new Map<number, number>()
    row.set(t, (row.get(t) ?? 0) + value)
    cells.set(group, row)
  }
  const ranked = options.order ? options.order.filter(group => totals.has(group))
    : [...totals].filter(([, total]) => total > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([group]) => group)
  const shown = ranked.length > MAX_LINES ? ranked.slice(0, MAX_LINES - 1) : ranked
  const rest = ranked.slice(shown.length)
  const present = options.present ?? (t => seen.has(t))
  const points = times.map(t => {
    if (!present(t)) return { x: t, values: [...shown, ...rest.slice(0, 1)].map(() => null) }
    const values: (number | null)[] = shown.map(group => cells.get(group)?.get(t) ?? 0)
    if (rest.length) values.push(rest.reduce((total, group) => total + (cells.get(group)?.get(t) ?? 0), 0))
    return { x: t, values }
  })
  const labels = rest.length ? [...shown, `Other ${rest.length}`] : shown
  return {
    series: labels.map((label, i) => ({ label, color: i as 0 | 1 | 2 | 3 })),
    points,
    note: rest.length ? `${shown.length} largest of ${ranked.length} ${options.noun ?? 'groups'}; the others are summed as Other` : undefined,
  }
}

type TableField = 'rows_per_s' | 'bytes_per_s' | 'queue_depth'
type Present = (t: number) => boolean
const subject: Record<TableField, string> = {
  rows_per_s: 'tables that sent rows', bytes_per_s: 'tables that sent bytes', queue_depth: 'tables with rows waiting',
}
/** The flows view omits idle table buckets, so `present` says which buckets have node snapshots and count as zero. */
export const tablePlot = (view: FlowsView, times: readonly number[], field: TableField, present?: Present) =>
  groupPlot(view.tables.map(row => ({ group: row.table, t: row.t, value: row[field] })), times, { noun: subject[field], present })

export const isOtelTable = (name: string) => name.toUpperCase().startsWith('OTEL')

/** Raw OpenTelemetry rows sent to Kusto per second, by export table: the counters of the writers that ingest the exports. */
export const otelPlot = (view: FlowsView, times: readonly number[], present?: Present) =>
  groupPlot(view.tables.filter(row => isOtelTable(row.table)).map(row => ({ group: row.table, t: row.t, value: row.rows_per_s })),
    times, { noun: 'OTel tables that received rows', present })

/** Rows each node submitted per second, from the node snapshots in the series view. */
export const nodeRowsPlot = (rows: readonly SeriesRow[], times: readonly number[]) => groupPlot(rows.map(row => {
  const parts = [row.streaming_rows_per_s, row.queued_rows_per_s, row.inline_rows_per_s].filter(finite)
  return { group: nodeTag(row.node_id), t: row.t, value: parts.length ? parts.reduce((a, b) => a + b, 0) : null }
}), times, { noun: 'nodes' })

export function flowLossPlot(view: FlowsView, times: readonly number[], present?: Present): Plot {
  const byTime = new Map<number, [number, number]>()
  for (const row of view.tables) {
    const cell = byTime.get(row.t) ?? [0, 0]
    cell[0] += row.failures ?? 0
    cell[1] += row.rows_dropped ?? 0
    byTime.set(row.t, cell)
  }
  return {
    series: [{ label: 'Failed requests', color: 0 }, { label: 'Rows dropped', color: 1 }],
    points: times.map(t => ({ x: t, values: byTime.get(t) ?? (present?.(t) ? [0, 0] : [null, null]) })),
  }
}

type BackendField = 'cpu_s' | 'commands' | 'failed'
/** Backend work in each bucket. CPU and commands are divided by the bucket size to give a rate. */
export function backendPlot(view: BackendView, times: readonly number[], field: BackendField, perSecond: boolean) {
  const label = new Map(WORK.map(item => [item.id, item.label]))
  const last = Math.min(view.until, view.checked_at)
  return groupPlot(view.series.map(row => ({
    group: label.get(row.work) ?? row.work, t: row.t, value: finite(row[field]) ? row[field]! / (perSecond ? view.step : 1) : null,
  })), times, { order: WORK.map(item => item.label), present: t => t >= view.since && t < last })
}

const sum = (values: readonly (number | null | undefined)[]) => values.reduce<number>((total, value) => total + (finite(value) ? value : 0), 0)
function groupBy<T>(rows: readonly T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const list = groups.get(key(row))
    if (list) list.push(row)
    else groups.set(key(row), [row])
  }
  return groups
}
const span = (view: Pick<FlowsView, 'since' | 'until' | 'generated_at'>) =>
  Math.max(1, Math.min(view.until, view.generated_at) - view.since)

export type FlowTableSummary = {
  table: string; modes: string; nodes: number; rows: number; bytes: number; requests: number; failures: number
  rows_dropped: number; mean_rows_per_s: number; peak_rows_per_s: number | null; queue_depth: number; last_at: number | null
}

/** One row per destination table over the window. Counts are the sums of each node's counter changes. */
export function tableSummaries(view: FlowsView): FlowTableSummary[] {
  const peaks = new Map<string, number>()
  for (const row of view.tables) if (finite(row.rows_per_s)) peaks.set(row.table, Math.max(peaks.get(row.table) ?? 0, row.rows_per_s))
  const groups = groupBy(view.nodes, row => row.table)
  return [...groups].map(([table, rows]) => {
    const total = sum(rows.map(row => row.rows))
    return {
      table, modes: [...new Set(rows.map(row => row.mode).filter(Boolean))].sort().join(', '),
      nodes: rows.filter(row => (row.rows ?? 0) > 0).length, rows: total, bytes: sum(rows.map(row => row.bytes)),
      requests: sum(rows.map(row => row.requests)), failures: sum(rows.map(row => row.failures)),
      rows_dropped: sum(rows.map(row => row.rows_dropped)), mean_rows_per_s: total / span(view),
      peak_rows_per_s: peaks.get(table) ?? null, queue_depth: sum(rows.map(row => row.queue_depth)),
      last_at: Math.max(...rows.map(row => row.last_at ?? -Infinity)),
    }
  }).map(row => ({ ...row, last_at: Number.isFinite(row.last_at) ? row.last_at : null }))
    .sort((a, b) => b.rows - a.rows || b.failures - a.failures || a.table.localeCompare(b.table))
}

export type FlowNodeSummary = {
  node_id: string; tables: number; top_table: string | null; rows: number; bytes: number; requests: number
  failures: number; rows_dropped: number; mean_rows_per_s: number; queue_depth: number; last_at: number | null
}

/** One row per reporting node over the window. */
export function nodeFlowSummaries(view: FlowsView): FlowNodeSummary[] {
  return [...groupBy(view.nodes, row => row.node_id)].map(([node_id, rows]) => {
    const total = sum(rows.map(row => row.rows))
    const top = [...rows].sort((a, b) => (b.rows ?? 0) - (a.rows ?? 0))[0]
    const last = Math.max(...rows.map(row => row.last_at ?? -Infinity))
    return {
      node_id, tables: rows.filter(row => (row.rows ?? 0) > 0).length, top_table: (top?.rows ?? 0) > 0 ? top.table : null,
      rows: total, bytes: sum(rows.map(row => row.bytes)), requests: sum(rows.map(row => row.requests)),
      failures: sum(rows.map(row => row.failures)), rows_dropped: sum(rows.map(row => row.rows_dropped)),
      mean_rows_per_s: total / span(view), queue_depth: sum(rows.map(row => row.queue_depth)),
      last_at: Number.isFinite(last) ? last : null,
    }
  }).sort((a, b) => b.rows - a.rows || b.failures - a.failures || a.node_id.localeCompare(b.node_id))
}

export function flowTotals(view: FlowsView | undefined) {
  if (!view) return undefined
  const perBucket = new Map<number, number>()
  for (const row of view.tables) if (finite(row.rows_per_s)) perBucket.set(row.t, (perBucket.get(row.t) ?? 0) + row.rows_per_s)
  const rows = sum(view.nodes.map(row => row.rows))
  return {
    rows, bytes: sum(view.nodes.map(row => row.bytes)), meanRowsPerS: rows / span(view),
    peakRowsPerS: perBucket.size ? Math.max(...perBucket.values()) : null,
    tables: new Set(view.nodes.filter(row => (row.rows ?? 0) > 0).map(row => row.table)).size,
    nodes: new Set(view.nodes.filter(row => (row.rows ?? 0) > 0).map(row => row.node_id)).size,
    failures: sum(view.nodes.map(row => row.failures)), dropped: sum(view.nodes.map(row => row.rows_dropped)),
    queued: sum(view.nodes.map(row => row.queue_depth)),
  }
}

export function backendTotals(view: BackendView | undefined) {
  if (!view) return undefined
  const cpu = sum(view.series.map(row => row.cpu_s))
  const aictl = sum(view.series.filter(row => row.work === 'aictl_queries').map(row => row.cpu_s))
  const seconds = Math.max(1, Math.min(view.until, view.checked_at) - view.since)
  return {
    cpu, aictl, aictlShare: cpu > 0 ? 100 * aictl / cpu : null, cores: cpu / seconds,
    commands: sum(view.series.map(row => row.commands)), failed: sum(view.series.map(row => row.failed)),
    top: [...view.views].sort((a, b) => (b.cpu_s ?? 0) - (a.cpu_s ?? 0))[0],
  }
}
