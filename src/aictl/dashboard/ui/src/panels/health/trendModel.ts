import type { DetailNodes } from '../../data/contract.gen'
import { fmtBps, fmtCpu, fmtMs } from '../../design/format'
import type { ChartPoint } from '../../ui/chartData'
import { nodeTag } from '../../data/nodeNames'

export type SeriesView = Extract<DetailNodes, { view: 'series' }>
export type SeriesRow = SeriesView['rows'][number]
export type SeriesField = Exclude<keyof SeriesRow, 'node_id' | 't'>
export type TrendView = 'series' | 'flows' | 'backend'
export type Scope = 'local' | 'node' | 'fleet'

export const RANGES = [
  { id: '1h', label: '1 h', seconds: 3600 },
  { id: '6h', label: '6 h', seconds: 6 * 3600 },
  { id: '24h', label: '24 h', seconds: 86400 },
  { id: '7d', label: '7 d', seconds: 7 * 86400 },
] as const
export type RangeId = typeof RANGES[number]['id']

// The same bucket rule as node_views.series_window, so the requested window
// stays the same until the next bucket starts.
const BUCKETS = 240, MIN_STEP = 30
export function seriesWindow(now: number, seconds: number) {
  const step = Math.max(MIN_STEP, Math.ceil(seconds / BUCKETS / MIN_STEP) * MIN_STEP)
  const until = Math.ceil(now / step) * step
  return { since: until - seconds, until, step }
}

export function seriesPath(scope: Scope, nodeId: string | null, since: number, until: number, view: TrendView = 'series') {
  const query = new URLSearchParams({ view, scope })
  if (scope === 'node') {
    if (!nodeId) return
    query.set('node_id', nodeId)
  }
  query.set('since', String(since))
  query.set('until', String(until))
  return '/api/board/nodes?' + query
}

export function confirmedSeries(value: DetailNodes | undefined, scope: Scope, nodeId?: string | null): value is SeriesView {
  return value?.view === 'series' && value.scope === scope && Array.isArray(value.rows) && value.step > 0
    && value.rows.every(row => typeof row?.node_id === 'string' && Number.isFinite(row.t)
      && (scope !== 'node' || row.node_id === nodeId))
}

export type Unit = 'percent' | 'gib' | 'mib' | 'per_s' | 'ms' | 'count' | 'bytes_per_s' | 'cpu_s'
type Combine = 'sum' | 'max' | 'mean'
type Line = { label: string; field: SeriesField; combine: Combine }
export type Metric = {
  id: string; title: string; description: string; unit: Unit; lines: readonly Line[]; stack?: boolean
  // The Health trends section that shows the chart.
  section: 'flows' | 'backend' | 'hosts'
  // Fleet charts with this field show one line per node instead of a combined value.
  byNode?: SeriesField
}

const line = (label: string, field: SeriesField, combine: Combine = 'sum'): Line => ({ label, field, combine })

export const METRICS: readonly Metric[] = [
  { id: 'ingestion', title: 'Rows by mode', description: 'Rows per second submitted by ingestion mode (stacked)', unit: 'per_s',
    stack: true, section: 'flows',
    lines: [line('Streaming', 'streaming_rows_per_s'), line('Queued DM', 'queued_rows_per_s'), line('Inline', 'inline_rows_per_s')] },
  { id: 'query-cpu', title: 'aictl query CPU by node', description: 'Cluster CPU seconds per second that each daemon\'s queries used',
    unit: 'cpu_s', section: 'backend', lines: [line('Query CPU', 'query_cpu')], byNode: 'query_cpu' },
  { id: 'host-cpu', title: 'Host CPU', description: 'Mean and peak of host samples in each bucket', unit: 'percent', section: 'hosts',
    lines: [line('Mean', 'host_cpu', 'mean'), line('Peak', 'host_cpu_max', 'max')], byNode: 'host_cpu' },
  { id: 'host-memory', title: 'Host memory', description: 'Mean memory in use and installed memory', unit: 'gib', section: 'hosts',
    lines: [line('In use', 'host_mem_mb'), line('Installed', 'host_mem_total_mb')], byNode: 'host_mem_mb' },
  { id: 'daemon-cpu', title: 'Daemon CPU', description: 'aictl daemon process, mean and peak', unit: 'percent', section: 'hosts',
    lines: [line('Mean', 'daemon_cpu', 'mean'), line('Peak', 'daemon_cpu_max', 'max')], byNode: 'daemon_cpu' },
  { id: 'daemon-memory', title: 'Daemon memory', description: 'Mean resident memory of the aictl daemon', unit: 'mib', section: 'hosts',
    lines: [line('Resident', 'daemon_rss_mb')], byNode: 'daemon_rss_mb' },
  { id: 'store-requests', title: 'Store requests', description: 'Completed client requests per second', unit: 'per_s', section: 'hosts',
    lines: [line('Reads', 'reads_per_s'), line('Writes', 'writes_per_s'), line('Commands', 'commands_per_s')] },
  { id: 'latency', title: 'Request latency', description: 'Recent mean reported by the daemon, mean and peak in each bucket', unit: 'ms',
    section: 'hosts', lines: [line('Read mean', 'read_ms', 'mean'), line('Read peak', 'read_ms_max', 'max'),
      line('Write mean', 'write_ms', 'mean'), line('Write peak', 'write_ms_max', 'max')] },
  { id: 'writer-queue', title: 'Writer queue', description: 'Peak rows waiting in the writer queue', unit: 'count', section: 'hosts',
    lines: [line('Queued rows', 'queue_depth')] },
  { id: 'failures', title: 'Failures', description: 'Failed requests counted in each bucket', unit: 'count', section: 'hosts',
    lines: [line('Reads', 'read_failures'), line('Writes', 'write_failures'), line('Commands', 'command_failures'),
      line('Ingestion', 'ingest_failures')] },
  { id: 'drops', title: 'Dropped and rejected', description: 'Rows and telemetry lost in each bucket', unit: 'count', section: 'hosts',
    lines: [line('Writer rows', 'rows_dropped'), line('Sink events', 'sink_dropped'), line('OTel dropped', 'otel_dropped'),
      line('OTel errors', 'otel_errors')] },
  { id: 'activity', title: 'Sessions and processes', description: 'Peak live sessions and monitored processes', unit: 'count',
    section: 'hosts', lines: [line('Sessions', 'sessions'), line('Processes', 'processes')] },
  { id: 'network', title: 'Tool network traffic', description: 'Mean inbound and outbound bytes per second', unit: 'bytes_per_s',
    section: 'hosts', lines: [line('Inbound', 'in_rate'), line('Outbound', 'out_rate')] },
]

const scale: Partial<Record<Unit, number>> = { gib: 1 / 1024 }
export const axisUnit: Record<Unit, string> = {
  percent: '%', gib: ' GiB', mib: ' MiB', per_s: '/s', ms: ' ms', count: '', bytes_per_s: ' B/s', cpu_s: ' s/s',
}
const decimal = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 3 })
const whole = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const tick = new Intl.NumberFormat(undefined, { notation: 'compact', maximumSignificantDigits: 3 })
const byteUnits = [[1e9, 'GB'], [1e6, 'MB'], [1e3, 'KB'], [1, 'B']] as const

/** Axis labels in one unit chosen from the largest tick, so "5 s" replaces "5K ms". */
export function axisTicks(unit: Unit): ((ticks: readonly number[]) => string[]) | undefined {
  const largest = (ticks: readonly number[]) => Math.max(0, ...ticks.map(Math.abs))
  if (unit === 'ms') return ticks => {
    const seconds = largest(ticks) >= 1000
    return ticks.map(value => seconds ? `${tick.format(value / 1000)} s` : `${tick.format(value)} ms`)
  }
  if (unit === 'bytes_per_s') return ticks => {
    const [size, name] = byteUnits.find(([size]) => largest(ticks) >= size) ?? byteUnits[3]
    return ticks.map(value => `${tick.format(value / size)} ${name}/s`)
  }
}

/** Format a charted value. The value is already in the chart unit. */
export function formatValue(value: number | null | undefined, unit: Unit) {
  if (value == null || !Number.isFinite(value)) return undefined
  if (unit === 'percent') return fmtCpu(value)
  if (unit === 'ms') return fmtMs(value)
  if (unit === 'bytes_per_s') return fmtBps(value)
  if (unit === 'count') return whole.format(value)
  return decimal.format(value) + axisUnit[unit]
}

function combine(values: readonly (number | null | undefined)[], how: Combine) {
  const known = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (!known.length) return null
  if (how === 'max') return Math.max(...known)
  const total = known.reduce((a, b) => a + b, 0)
  return how === 'mean' ? total / known.length : total
}

/** Every bucket start in the window. A bucket without a row is a gap in the chart. */
export function bucketTimes(view: Pick<SeriesView, 'since' | 'until' | 'step'>) {
  const times: number[] = []
  for (let t = view.since; t < view.until && times.length <= 2000; t += view.step) times.push(t)
  return times
}

export function nodeIds(rows: readonly SeriesRow[]) {
  return [...new Set(rows.map(row => row.node_id))].sort()
}

export type Plot = { series: { label: string; color: 0 | 1 | 2 | 3 }[]; points: ChartPoint[]; note?: string }
export const MAX_LINES = 4

export function metricPlot(metric: Metric, rows: readonly SeriesRow[], times: readonly number[]): Plot {
  const factor = scale[metric.unit] ?? 1
  const at = (value: number | null | undefined) => value == null ? null : value * factor
  const byTime = new Map<number, SeriesRow[]>()
  for (const row of rows) {
    const list = byTime.get(row.t) ?? []
    list.push(row)
    byTime.set(row.t, list)
  }
  const nodes = nodeIds(rows)
  if (metric.byNode && nodes.length > 1) {
    const field = metric.byNode
    const peak = (node: string) => Math.max(-Infinity, ...rows.filter(row => row.node_id === node)
      .map(row => row[field]).filter((value): value is number => value != null && Number.isFinite(value)))
    const shown = [...nodes].sort((a, b) => peak(b) - peak(a) || a.localeCompare(b)).slice(0, MAX_LINES)
    return {
      series: shown.map((node, i) => ({ label: nodeTag(node), color: i as 0 | 1 | 2 | 3 })),
      points: times.map(t => ({ x: t, values: shown.map(node => at(byTime.get(t)?.find(row => row.node_id === node)?.[field])) })),
      note: nodes.length > shown.length ? `${shown.length} of ${nodes.length} nodes with the highest peak` : undefined,
    }
  }
  return {
    series: metric.lines.map((item, i) => ({ label: item.label, color: i as 0 | 1 | 2 | 3 })),
    points: times.map(t => ({ x: t, values: metric.lines.map(item =>
      at(combine((byTime.get(t) ?? []).map(row => row[item.field]), item.combine))) })),
  }
}

/** The newest bucket index that has a value, for the default readout. */
export function lastIndex(points: readonly ChartPoint[]) {
  for (let i = points.length - 1; i >= 0; i--) if (points[i].values.some(value => value != null)) return i
  return -1
}

const known = (values: readonly (number | null | undefined)[]) =>
  values.filter((value): value is number => value != null && Number.isFinite(value))
const sumOf = (values: readonly (number | null | undefined)[]) => {
  const list = known(values)
  return list.length ? list.reduce((a, b) => a + b, 0) : null
}
const maxOf = (values: readonly (number | null | undefined)[]) => {
  const list = known(values)
  return list.length ? Math.max(...list) : null
}
// Weight bucket means by their sample counts, so a short bucket counts less.
const meanOf = (rows: readonly SeriesRow[], field: SeriesField) => {
  let total = 0, weight = 0
  for (const row of rows) {
    const value = row[field]
    if (value == null || !Number.isFinite(value)) continue
    total += value * row.samples
    weight += row.samples
  }
  return weight ? total / weight : null
}

export type NodeSummary = {
  node_id: string; samples: number; restarts: number; last_at: number
  host_cpu: number | null; host_cpu_max: number | null; host_mem_mb: number | null; daemon_cpu: number | null
  daemon_cpu_max: number | null; daemon_rss_mb: number | null; reads_per_s: number | null; read_ms: number | null
  read_ms_max: number | null; failures: number | null; dropped: number | null; queue_depth: number | null; query_cpu: number | null
}

/** One row per node over the whole window. */
export function nodeSummaries(rows: readonly SeriesRow[]): NodeSummary[] {
  return nodeIds(rows).map(node_id => {
    const own = rows.filter(row => row.node_id === node_id)
    const values = (field: SeriesField) => own.map(row => row[field])
    return {
      node_id, samples: own.reduce((n, row) => n + row.samples, 0), restarts: own.reduce((n, row) => n + row.restarts, 0),
      last_at: Math.max(...own.map(row => row.t)),
      host_cpu: meanOf(own, 'host_cpu'), host_cpu_max: maxOf(values('host_cpu_max')), host_mem_mb: meanOf(own, 'host_mem_mb'),
      daemon_cpu: meanOf(own, 'daemon_cpu'), daemon_cpu_max: maxOf(values('daemon_cpu_max')), daemon_rss_mb: maxOf(values('daemon_rss_mb')),
      reads_per_s: meanOf(own, 'reads_per_s'), read_ms: meanOf(own, 'read_ms'), read_ms_max: maxOf(values('read_ms_max')),
      failures: sumOf(own.flatMap(row => [row.read_failures, row.write_failures, row.command_failures, row.ingest_failures])),
      dropped: sumOf(own.flatMap(row => [row.rows_dropped, row.sink_dropped, row.otel_dropped])),
      queue_depth: maxOf(values('queue_depth')), query_cpu: meanOf(own, 'query_cpu'),
    }
  })
}

export function windowTotals(rows: readonly SeriesRow[]) {
  const all = (field: SeriesField) => rows.map(row => row[field])
  return {
    nodes: nodeIds(rows).length,
    restarts: rows.reduce((n, row) => n + row.restarts, 0),
    failures: sumOf(rows.flatMap(row => [row.read_failures, row.write_failures, row.command_failures, row.ingest_failures])),
    hostCpuPeak: maxOf(all('host_cpu_max')),
    readPeak: maxOf(all('read_ms_max')),
    lastAt: rows.length ? Math.max(...rows.map(row => row.t)) : null,
  }
}
