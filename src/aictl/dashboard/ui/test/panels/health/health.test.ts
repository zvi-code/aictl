import { describe, expect, it } from 'vitest'
import type { TableInventory } from '../../../src/data/contract.gen'
import { inventoryRead } from '../../../src/panels/health/healthData'
import { healthSources } from '../../../src/panels/health/healthModel'
import { confirmedHealth, scopedHealth, writerRows, type HealthNodeView } from '../../../src/panels/health/scopedHealth'
import { axisTicks, bucketTimes, METRICS, metricPlot, nodeSummaries, seriesWindow, type SeriesRow } from '../../../src/panels/health/trendModel'
import {
  backendPlot, backendTotals, flowTotals, groupPlot, nodeFlowSummaries, tablePlot, tableSummaries, type BackendView, type FlowsView,
} from '../../../src/panels/health/flowTrends'

const now = 1000
const inventory: TableInventory = {
  attempted_at: now, checked_at: null, last_error: null, limit: 500, refresh_interval_s: 300,
  scope: 'shared', size_scope: 'sealed extents', status: 'pending', truncated: false, tables: [],
}

describe('Health inventory', () => {
  it('distinguishes a first inventory attempt from zero measured rows', () => {
    expect(inventoryRead(inventory, { state: 'ready' }).state).toBe('loading')
    expect(inventoryRead({ ...inventory, status: 'error' }, { state: 'ready' }).state).toBe('error')
    expect(inventoryRead(undefined, { state: 'ready' }).state).toBe('unavailable')
    expect(inventoryRead({ ...inventory, status: 'cached', checked_at: now }, { state: 'ready' }).state).toBe('empty')
  })

  it('keeps the last measured table after a read error and preserves zero', () => {
    const tables = [{ name: 'measured', rows: 0, extent_count: 0, compressed_bytes: null, extent_bytes: null, hot_bytes: null, original_bytes: null }]
    expect(inventoryRead({ ...inventory, status: 'error', last_error: 'Timeout', checked_at: now - 60, tables }, { state: 'ready' }))
      .toMatchObject({ state: 'stale', value: tables, message: expect.stringContaining('Timeout') })
  })
})

describe('Scoped Health', () => {
  const sample = (node: string, pid: number, at: number, readRate: number): HealthNodeView['rows'][number] => ({
    node_id: node, captured_at: now, status: 'reported', cpu_percent: 5, memory_total_mb: null, memory_used_mb: null,
    active_sessions: 0, active_processes: 0, daemon_pid: pid, activity_at: now,
    client_sample: { at, pid, store: { reads: { rate_per_s: readRate }, ingestion_traffic: {
      queued: { groups: [{ id: 'events', tables: [node], rows_per_s: readRate }] },
    } } },
  })
  const report: HealthNodeView = {
    scope: 'fleet', view: 'health', rows: [sample('a', 1, now, 0), sample('b', 2, now, 8), sample('c', 3, 500, 300)],
    generated_at: now, read_only: true, fleet_available: true, local_node: { node_id: 'other', source: 'hostname' },
    shared_kusto: { scope: 'shared', cluster: 'store.example.test', database: 'example',
      capacity_total: 12, capacity_available: 0, capacity_checked_at: now, table_inventory: inventory },
  }

  it('combines only fresh client counters and keeps one shared inventory', () => {
    const value = scopedHealth(report)
    expect(value.node_report?.contributors).toEqual(['a', 'b'])
    expect(value.store?.reads?.rate_per_s).toBe(8)
    expect(value.store?.ingestion_capacity).toMatchObject({ total: 12, available: 0, in_use: 12 })
    expect(value.store?.table_inventory).toBe(inventory)
    expect(value.store?.ingestion_traffic).toMatchObject({
      queued: { groups: [{ id: 'events', tables: ['a', 'b'], rows_per_s: 8 }] },
    })
    expect(value.store?.ingestion_traffic?.inline).toBeUndefined()
    expect(value.writers).toEqual([])
  })

  it('rejects a node response with a row from another scope', () => {
    expect(confirmedHealth({ ...report, scope: 'node' }, 'node', 'a')).toBe(false)
    expect(confirmedHealth({ ...report, scope: 'node', rows: [report.rows[0]] }, 'node', 'a')).toBe(true)
  })

  it('keeps zero drops and does not invent a missing queue value', () => {
    const rows = writerRows([{ node_id: 'a', tables: { events: { rows_dropped: 0 } } }, { node_id: 'b', tables: { events: { queue_depth: 7 } } }])
    expect(rows).toEqual([{ name: 'events', node_id: 'a', rows_dropped: 0 }, { name: 'events', node_id: 'b', queue_depth: 7 }])
  })

  it('keeps a hook-only tool and does not invent receiver counts', () => {
    expect(healthSources({ generated_at: now, pipeline: { hooks: { 'hook-tool': { count: 0, last_fire_ts: null } } } }))
      .toMatchObject([{ tool: 'hook-tool', hook_count: 0, metrics: undefined, last_data_ts: null }])
  })
})

const seriesFields = ['host_cpu', 'host_cpu_max', 'host_mem_mb', 'host_mem_total_mb', 'tools_cpu', 'tools_mem_mb', 'daemon_cpu',
  'daemon_cpu_max', 'daemon_rss_mb', 'daemon_threads', 'sessions', 'processes', 'in_rate', 'out_rate', 'reads_per_s', 'writes_per_s',
  'commands_per_s', 'read_ms', 'read_ms_max', 'write_ms', 'write_ms_max', 'reads_in_flight', 'writes_in_flight', 'query_cpu',
  'bytes_per_s', 'streaming_rows_per_s', 'queued_rows_per_s', 'inline_rows_per_s', 'otel_metrics_per_s', 'otel_events_per_s',
  'queue_depth', 'queue_bytes', 'read_failures', 'write_failures', 'command_failures', 'ingest_failures', 'rows_dropped',
  'otel_errors', 'otel_dropped', 'sink_dropped'] as const
const seriesRow = (node_id: string, t: number, values: Partial<SeriesRow> = {}): SeriesRow => ({
  ...Object.fromEntries(seriesFields.map(name => [name, null])) as Omit<SeriesRow, 'node_id' | 't' | 'samples' | 'restarts'>,
  node_id, t, samples: 1, restarts: 0, ...values,
})
const metric = (id: string) => METRICS.find(item => item.id === id)!

describe('Health trends', () => {
  it('keeps the requested window until the next bucket starts', () => {
    const first = seriesWindow(86_400 * 100 + 1, 86_400)
    expect(first.step).toBe(360)
    expect(seriesWindow(86_400 * 100 + 359, 86_400)).toEqual(first)
    expect(seriesWindow(86_400 * 100 + 361, 86_400).until).toBe(first.until + 360)
    expect(first.until - first.since).toBe(86_400)
  })

  it('leaves a gap for a bucket without a sample and keeps zero', () => {
    const times = bucketTimes({ since: 0, until: 90, step: 30 })
    const plot = metricPlot(metric('writer-queue'), [seriesRow('a', 0, { queue_depth: 0 }), seriesRow('a', 60, { queue_depth: 5 })], times)
    expect(plot.points.map(point => point.values[0])).toEqual([0, null, 5])
  })

  it('combines nodes by the rule of each line and draws one line per node where a metric is per node', () => {
    const rows = [seriesRow('a', 0, { host_cpu: 10, host_cpu_max: 20, reads_per_s: 1 }),
      seriesRow('b', 0, { host_cpu: 30, host_cpu_max: 90, reads_per_s: 2 })]
    expect(metricPlot(metric('store-requests'), rows, [0]).points[0].values[0]).toBe(3)
    const cpu = metricPlot(metric('host-cpu'), rows, [0])
    expect(cpu.series.map(item => item.label)).toEqual(['b', 'a'])
    expect(cpu.points[0].values).toEqual([30, 10])
    const one = metricPlot(metric('host-cpu'), [rows[0]], [0])
    expect(one.points[0].values).toEqual([10, 20])
  })

  it('weights a node mean by samples and adds failures without inventing missing ones', () => {
    const [summary] = nodeSummaries([seriesRow('a', 0, { samples: 1, host_cpu: 10, read_failures: 2 }),
      seriesRow('a', 60, { samples: 3, host_cpu: 50 })])
    expect(summary).toMatchObject({ samples: 4, host_cpu: 40, failures: 2, dropped: null, last_at: 60 })
  })

  it('labels a value axis in one unit chosen from the largest tick', () => {
    expect(axisTicks('ms')!([0, 2500, 5000])).toEqual(['0 s', '2.5 s', '5 s'])
    expect(axisTicks('ms')!([0, 250, 500])).toEqual(['0 ms', '250 ms', '500 ms'])
    expect(axisTicks('bytes_per_s')!([0, 50_000, 150_000])).toEqual(['0 KB/s', '50 KB/s', '150 KB/s'])
    expect(axisTicks('percent')).toBeUndefined()
  })
})

const flowsView = (tables: FlowsView['tables'], nodes: FlowsView['nodes']): FlowsView => ({
  scope: 'fleet', local_node: { node_id: 'a' } as FlowsView['local_node'], fleet_available: true, generated_at: 120, read_only: true,
  since: 0, until: 120, step: 60, truncated: false, view: 'flows', tables, nodes,
})
const flowTable = (table: string, t: number, rows_per_s: number | null): FlowsView['tables'][number] => ({
  table, t, rows_per_s, bytes_per_s: null, requests_per_s: null, failures: 0, rows_dropped: 0, queue_depth: 0, nodes: 1,
})
const flowNode = (node_id: string, table: string, rows: number, extra: Partial<FlowsView['nodes'][number]> = {}): FlowsView['nodes'][number] => ({
  node_id, table, mode: 'streaming', rows, bytes: rows * 10, requests: 1, failures: 0, rows_dropped: 0, peak_rows_per_s: null,
  queue_depth: 0, last_at: 100, ...extra,
})

describe('Ingestion flows and backend trends', () => {
  it('stacks the largest groups and sums the rest as Other so the total stays correct for many nodes', () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({ group: `node-${String(i).padStart(2, '0')}`, t: 0, value: 12 - i }))
    const plot = groupPlot(entries, [0, 60])
    expect(plot.series.map(item => item.label)).toEqual(['node-00', 'node-01', 'node-02', 'Other 9'])
    expect(plot.points[0].values).toEqual([12, 11, 10, 45])
    expect(plot.points[0].values.reduce((a, b) => a! + b!, 0)).toBe(78)
    expect(plot.points[1].values).toEqual([null, null, null, null])
    expect(plot.note).toMatch(/3 largest of 12/)
  })

  it('shows zero for a table that sent nothing in a bucket where its node reported', () => {
    const view = flowsView([flowTable('Events', 0, 5)], [flowNode('a', 'Events', 300)])
    expect(tablePlot(view, [0, 60], 'rows_per_s', t => t === 0 || t === 60).points.map(point => point.values[0])).toEqual([5, 0])
    expect(tablePlot(view, [0, 60], 'rows_per_s').points.map(point => point.values[0])).toEqual([5, null])
  })

  it('sums each table and node over the window from per-node counter changes', () => {
    const view = flowsView([flowTable('Events', 0, 5), flowTable('Events', 60, 8), flowTable('Logs', 0, 1)], [
      flowNode('a', 'Events', 300, { failures: 2 }), flowNode('b', 'Events', 180, { mode: 'queued', queue_depth: 4 }),
      flowNode('a', 'Logs', 60), flowNode('c', 'Logs', 0, { rows_dropped: 3 }),
    ])
    const [events, logs] = tableSummaries(view)
    expect(events).toMatchObject({ table: 'Events', modes: 'queued, streaming', nodes: 2, rows: 480, failures: 2, queue_depth: 4,
      peak_rows_per_s: 8, mean_rows_per_s: 4 })
    expect(logs).toMatchObject({ table: 'Logs', nodes: 1, rows: 60, rows_dropped: 3 })
    expect(nodeFlowSummaries(view).map(row => [row.node_id, row.rows, row.tables, row.top_table]))
      .toEqual([['a', 360, 2, 'Events'], ['b', 180, 1, 'Events'], ['c', 0, 0, null]])
    expect(flowTotals(view)).toMatchObject({ rows: 540, nodes: 2, tables: 2, peakRowsPerS: 8, failures: 2, dropped: 3, queued: 4 })
  })

  it('divides backend CPU by the bucket size and leaves buckets after the last check as gaps', () => {
    const view: BackendView = {
      scope: 'fleet', local_node: { node_id: 'a' } as BackendView['local_node'], fleet_available: true, generated_at: 150,
      read_only: true, since: 0, until: 180, step: 60, view: 'backend', database: 'db', checked_at: 100, measurement_scope: '',
      series: [{ t: 0, work: 'ingestion', commands: 6, failed: 0, cpu_s: 30, memory_peak: null },
        { t: 0, work: 'aictl_queries', commands: 12, failed: 1, cpu_s: 90, memory_peak: null }],
      views: [{ view: 'aictl.small', commands: 1, failed: 0, cpu_s: 5, mean_ms: 1, max_ms: 1, memory_peak: null },
        { view: 'aictl.live.keys', commands: 11, failed: 1, cpu_s: 85, mean_ms: 1, max_ms: 1, memory_peak: null }],
    }
    const cpu = backendPlot(view, [0, 60, 120], 'cpu_s', true)
    expect(cpu.series.map(item => item.label)).toEqual(['aictl queries', 'Ingestion'])
    expect(cpu.points.map(point => point.values)).toEqual([[1.5, 0.5], [0, 0], [null, null]])
    expect(backendTotals(view)).toMatchObject({ cpu: 120, aictl: 90, aictlShare: 75, cores: 1.2, commands: 18, failed: 1,
      top: { view: 'aictl.live.keys' } })
  })
})
