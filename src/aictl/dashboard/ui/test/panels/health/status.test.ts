import { describe, expect, it } from 'vitest'
import { healthStatus, type HealthView } from '../../../src/panels/health/healthModel'
import type { BackendView, FlowsView } from '../../../src/panels/health/flowTrends'
import type { SeriesView } from '../../../src/panels/health/trendModel'
import { droppedRows, failedCommands, failedRequests, inventoryCounts, restartList, restartText } from '../../../src/panels/health/windowFacts'
import type { HealthWindow } from '../../../src/panels/health/windowFacts'
import { healthPanels } from '../../../src/panels/health'
import { otelPlot, tablePlot } from '../../../src/panels/health/flowTrends'
import { METRICS } from '../../../src/panels/health/trendModel'

const now = 100_000
const clean: HealthView = {
  generated_at: now,
  store: { health: { state: 'ok', last_success_at: now - 5 }, reads: { total: 100, failed: 0 }, writes: { total: 50, failed: 0 } },
  monitor: { collectors: [{ name: 'proc', status: 'active', mode: null, detail: null }] },
  pipeline: { self: { uptime_s: 3600 }, ingesters: [], data_quality: [], freshness: [] },
}
const base = { scope: 'local', local_node: { node_id: 'a' }, fleet_available: true, generated_at: now, read_only: true, since: 0, until: now, step: 360 }
const flows = (dropped: number, failures = 0): FlowsView => ({
  ...base, view: 'flows', truncated: false, tables: [],
  nodes: [{ node_id: 'a', table: 'events', mode: 'streaming', rows: 10, bytes: 1, requests: 1, failures, rows_dropped: dropped,
    peak_rows_per_s: 1, queue_depth: 0, last_at: now }],
} as unknown as FlowsView)
const backend = (failed: number): BackendView => ({
  ...base, view: 'backend', database: 'db', checked_at: now, measurement_scope: '',
  series: [{ t: 0, work: 'ingestion', commands: 100, failed, cpu_s: 1, memory_peak: null }], views: [],
} as unknown as BackendView)
const series = (rows: object[]): SeriesView => ({ ...base, view: 'series', truncated: false, rows } as unknown as SeriesView)
const window = (parts: Partial<HealthWindow>): HealthWindow => ({ label: 'last 24 h', ...parts })

describe('Health status', () => {
  it('is OK only when nothing at all is reported', () => {
    const status = healthStatus(clean, null, now, window({ flows: flows(0), backend: backend(0) }))
    expect(status).toMatchObject({ label: 'OK', issues: [], pending: [], limitations: [], reasons: [] })
  })

  it('counts rows dropped in the window even when the live counters are clean', () => {
    const status = healthStatus(clean, null, now, window({ flows: flows(9876) }))
    expect(status.label).toBe('Needs attention')
    expect(status.issues).toContain('9,876 rows dropped in the last 24 h')
  })

  it('names failed Kusto commands and failed requests with the window', () => {
    const rows = [{ node_id: 'a', t: 0, samples: 1, restarts: 0, read_failures: 4, write_failures: 1, command_failures: null, ingest_failures: 2 }]
    const status = healthStatus(clean, null, now, window({ backend: backend(68), series: series(rows) }))
    expect(status.issues).toContain('68 Kusto commands failed in the last 24 h')
    expect(status.issues.some(text => /5 store requests failed in the last 24 h \(reads 4, writes 1, commands 0\)/.test(text))).toBe(true)
  })

  it('reports throttling and failed requests since the daemon started, with the start time', () => {
    const store = { ...clean.store, health: { state: 'ok', last_success_at: now }, reads: {
      total: 5000, failed: 61, last_error: 'HTTP 429 Too Many Requests', last_error_at: now - 100, last_success_at: now - 1 } }
    const status = healthStatus({ ...clean, store }, null, now)
    const text = status.issues.join('\n')
    expect(text).toMatch(/Read requests: 61 of 5,000 requests failed since daemon start at .*; the cluster throttled requests \(HTTP 429\)/)
    expect(status.label).not.toBe('OK')
  })

  it('lists a source warning and a backlog from the status records', () => {
    const pipe = { ...clean.pipeline, freshness: [{ tool: 'x', label: 'Tool X', errors: 2, last_error: 'Tool X: 37.6 s latency' }],
      data_quality: [{ component: 'transcript-usage', ts: 5, files_waiting: { 'claude-code': 3000, codex: 200 } }] } as HealthView['pipeline']
    const status = healthStatus({ ...clean, pipeline: pipe }, null, now)
    expect(status.issues).toContain('Tool X: 2 errors — Tool X: 37.6 s latency')
    expect(status.issues).toContain('transcript-usage: 3,200 session files waiting (claude-code 3,000, codex 200)')
  })

  it('never shows a status other than OK without naming a reason', () => {
    const variants: [HealthView | null, unknown, HealthWindow | undefined][] = [
      [null, undefined, undefined], [null, new Error('x'), undefined], [{ generated_at: now }, null, undefined],
      [{ ...clean, generated_at: now - 500 }, null, undefined], [clean, null, window({ flows: flows(1) })],
      [{ ...clean, monitor: { collectors: [{ name: 'c', status: 'failed', mode: null, detail: 'boom' }] } }, null, undefined],
      [{ ...clean, pipeline: { ...clean.pipeline, ingesters: [{ name: 'i', status: 'waiting', last_ok: null }] } }, null, undefined],
      [{ ...clean, store: undefined }, null, undefined],
    ]
    for (const [data, error, win] of variants) {
      const status = healthStatus(data, error, now, win)
      const reasons = status.issues.length + status.pending.length + status.limitations.length
      expect(status.reasons.length).toBe(reasons)
      if (status.label === 'OK') expect(reasons).toBe(0)
      else expect(reasons, `${status.label} has no reason`).toBeGreaterThan(0)
    }
  })
})

describe('Health window facts', () => {
  it('has one dropped-rows count, from the writer counters, whatever the host series says', () => {
    const win = window({ flows: flows(9876), series: series([{ node_id: 'a', t: 0, samples: 1, restarts: 0, rows_dropped: 0 }]) })
    expect(droppedRows(win)).toBe(9876)
    expect(droppedRows(window({}))).toBeUndefined()
    expect(failedCommands(window({}))).toBeUndefined()
    expect(failedRequests(window({}))).toBeUndefined()
  })

  it('lists the buckets in which a daemon restarted, newest first, and says the reason is not recorded', () => {
    const rows = [{ node_id: 'a', t: 360, restarts: 1 }, { node_id: 'a', t: 720, restarts: 0 }, { node_id: 'a', t: 1080, restarts: 2 }] as never
    const list = restartList(rows, 360)!
    expect(list.map(item => item.at)).toEqual([1080, 360])
    expect(restartText(list[0], false)).toMatch(/reason not recorded/)
    expect(restartList(undefined, 360)).toBeUndefined()
  })

  it('counts logical and physical tables of an inventory separately', () => {
    expect(inventoryCounts(['events__a_1', 'events__b_2', 'legacy__events', 'sessions__a_1', 'schema_version']))
      .toEqual({ physical: 5, logical: 3 })
    expect(inventoryCounts(undefined)).toBeUndefined()
  })
})

describe('Health panels and charts', () => {
  it('draws every Health panel itself, so each one has the shared fold, full screen and hide controls', () => {
    expect(healthPanels.filter(def => def.kind !== 'custom').map(def => def.id)).toEqual([])
  })

  it('feeds the OpenTelemetry chart from the rows the writers sent to the export tables', () => {
    expect(METRICS.some(item => item.id === 'otel')).toBe(false)
    const view = flows(0)
    const table = (name: string, rows: number) => ({ table: name, t: 0, rows_per_s: rows, bytes_per_s: null, requests_per_s: null,
      failures: 0, rows_dropped: 0, queue_depth: 0, nodes: 1 })
    view.tables = [table('OTELLogs', 5), table('OTELMetrics', 7), table('session_steps', 40)] as FlowsView['tables']
    const plot = otelPlot(view, [0], () => true)
    expect(plot.series.map(item => item.label)).toEqual(['OTELMetrics', 'OTELLogs'])
    expect(plot.points[0].values).toEqual([7, 5])
    expect(otelPlot({ ...view, tables: [] }, [0], () => true).points[0].values).toEqual([])
  })

  it('says which tables a chart counts, so 48 tables that sent rows and 46 with rows waiting do not look like a disagreement', () => {
    const view = flows(0)
    view.tables = Array.from({ length: 6 }, (_, i) => ({ table: `t${i}`, t: 0, rows_per_s: 1, bytes_per_s: 1, requests_per_s: 1,
      failures: 0, rows_dropped: 0, queue_depth: i < 5 ? 1 : 0, nodes: 1 })) as FlowsView['tables']
    expect(tablePlot(view, [0], 'rows_per_s').note).toBe('3 largest of 6 tables that sent rows; the others are summed as Other')
    expect(tablePlot(view, [0], 'queue_depth').note).toBe('3 largest of 5 tables with rows waiting; the others are summed as Other')
  })
})
