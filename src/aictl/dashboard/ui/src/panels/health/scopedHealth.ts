import type { DetailNodes, HealthLocal, HealthStore } from '../../data/contract.gen'
import { entries, finite, MODES, objects, operationFailing, record, text, type HealthView, type StoreView } from './healthModel'

export type HealthNodeView = Extract<DetailNodes, { view: 'health' }>
type NodeRow = HealthNodeView['rows'][number]
type Counters = Record<string, unknown>
type Daemon = Partial<HealthLocal['resources']['daemon']>
type Scope = 'local' | 'node' | 'fleet'

export type NodeReport = {
  scope: string
  nodeId: string | null | undefined
  localNode: string | undefined
  servingOnly: boolean
  rows: (NodeRow & { daemon?: Daemon })[]
  contributors: string[]
  metricNodes: Record<string, number>
  truncated?: boolean
  supplementError: string | null
}

export type WriterReport = {
  node_id?: string
  status?: string
  warning?: string
  tables?: Counters
}

const sums = ['total', 'successful_requests', 'failed', 'recent_failures', 'in_flight', 'rate_per_s',
  'rows', 'bytes', 'rows_per_s', 'bytes_per_s', 'requests', 'pending', 'pending_history_rows', 'recent_completed']

function sum(rows: Counters[], field: string) {
  const values = rows.map(row => row[field]).filter(finite)
  return values.length ? values.reduce((a, b) => a + b, 0) : null
}

function combine(values: unknown[]): Counters | null {
  const rows = values.map(record).filter(row => row !== undefined)
  if (!rows.length) return null
  if (rows.length === 1) return rows[0]
  const out: Counters = Object.fromEntries(sums.map(field => [field, sum(rows, field)]))
  const requests = sum(rows, 'successful_requests')
  if (requests && rows.every(row => finite(row.successful_requests))) {
    for (const [field, mean] of [['rows', 'avg_rows'], ['bytes', 'avg_bytes']]) {
      const total = sum(rows, field)
      if (total !== null && rows.every(row => finite(row[field]))) out[mean] = total / requests
    }
  }
  const weighted = (key: string, count: (row: Counters) => number | undefined) => {
    if (!rows.every(row => finite(count(row)) && (!count(row) || finite(row[key])))) return null
    const n = rows.reduce((value, row) => value + (count(row) ?? 0), 0)
    return n ? rows.reduce((value, row) => value + (finite(row[key]) ? row[key] : 0) * (count(row) ?? 0), 0) / n : null
  }
  out.avg_ms = weighted('avg_ms', row =>
    finite(row.successful_requests) && finite(row.failed) ? row.successful_requests + row.failed : undefined)
  out.recent_avg_ms = weighted('recent_avg_ms', row => finite(row.recent_completed) ? row.recent_completed : undefined)
  for (const key of ['last_success_at', 'last_error_at']) {
    const dates = rows.map(row => row[key]).filter(finite)
    out[key] = dates.length ? Math.max(...dates) : null
  }
  if (finite(out.last_error_at)) out.last_error = rows.find(row => row.last_error_at === out.last_error_at)?.last_error
  return out
}

function modeTraffic(stores: Counters[], mode: (typeof MODES)[number]) {
  const samples = stores.map(store => record(record(store.ingestion_traffic)?.[mode])).filter(row => row !== undefined)
  if (!samples.length) return null
  const groups = new Map<string, Counters[]>()
  for (const sample of samples) for (const group of objects(sample.groups) ?? []) {
    const id = text(group.id)
    if (!id) continue
    const rows = groups.get(id) ?? []
    rows.push({ ...group, requests: group.requests ?? group.total })
    groups.set(id, rows)
  }
  const reportedGroups = samples.some(sample => Array.isArray(sample.groups))
  return { ...combine(samples), groups: reportedGroups ? [...groups].map(([id, rows]) => ({
    ...combine(rows), id, label: rows[0].label,
    tables: rows.some(row => Array.isArray(row.tables))
      ? [...new Set(rows.flatMap(row => Array.isArray(row.tables) ? row.tables.filter(item => typeof item === 'string') : []))]
      : undefined,
  })) : undefined }
}

function sameStore(report: HealthNodeView, live?: HealthLocal | null) {
  const shared = report.shared_kusto, store = live?.store
  if (!shared || !store?.cluster_url || store.database !== shared.database) return false
  try { return new URL(store.cluster_url).hostname === shared.cluster } catch { return false }
}

export function healthNodePath(scope: Scope, nodeId?: string | null) {
  const query = new URLSearchParams({ view: 'health', scope })
  if (scope === 'node') {
    if (!nodeId) return
    query.set('node_id', nodeId)
  }
  return '/api/board/nodes?' + query
}

export function confirmedHealth(value: DetailNodes | undefined, scope: Scope, nodeId?: string | null): value is HealthNodeView {
  return value?.view === 'health' && 'rows' in value && value.scope === scope && Array.isArray(value.rows)
    && value.rows.every(row => typeof row?.node_id === 'string' && row.node_id.length > 0
      && (scope !== 'node' || row.node_id === nodeId))
}

export function needsSupplement(report: HealthNodeView) {
  return report.rows.some(row => row.node_id === report.local_node?.node_id)
    || Boolean(report.shared_kusto && !Object.hasOwn(report.shared_kusto, 'table_inventory'))
}

function writer(value: unknown, nodeId?: string): WriterReport[] {
  const row = record(value)
  return row ? [{ node_id: nodeId, status: text(row.status), warning: text(row.warning), tables: record(row.tables) }] : []
}

export function writerReports(store?: StoreView | null, nodeId?: string) {
  return writer(store?.writer, nodeId)
}

// Combine reporters' client counters. Keep shared database and cluster measurements separate.
export function scopedHealth(report: HealthNodeView, localRuntime?: HealthLocal | null, supplementError: string | null = null): HealthView {
  const shared = report.shared_kusto
  const own = report.local_node?.node_id
  const live = sameStore(report, localRuntime) && localRuntime?.store ? localRuntime : undefined
  const liveFor = (row: NodeRow) => row.node_id === own && live && row.daemon_pid != null && row.daemon_pid === live.pipeline?.self?.pid
  const samples = report.rows.flatMap(row => {
    if (live && liveFor(row)) return [{ id: row.node_id, store: live.store as Counters, queryCpu: live.store?.query_cpu, runtime: {
      daemon: live.resources?.daemon, sink: live.pipeline?.sink, otel_receiver: live.pipeline?.otel_receiver,
      collectors: live.monitor?.collectors, ingesters: live.pipeline?.ingesters,
    } as Counters }]
    const sample = row.client_sample
    const store = record(sample?.store)
    return row.status === 'reported' && store && row.daemon_pid != null && sample?.pid === row.daemon_pid
      && finite(sample.at) && sample.at >= report.generated_at - 300 && sample.at <= report.generated_at + 60
      ? [{ id: row.node_id, store, queryCpu: sample.store?.query_cpu, runtime: record(sample.runtime) ?? {} }] : []
  })
  const byNode = new Map(samples.map(sample => [sample.id, sample]))
  const queryCpuByNode = report.rows.map(({ node_id }) => ({ ...byNode.get(node_id)?.queryCpu, node_id }))
  const contributors = samples.filter(sample => ['reads', 'writes', 'commands', 'ingestion_traffic', 'writer', 'reader', 'query_cpu']
    .some(field => record(sample.store[field])))
  const namedLocal = report.scope === 'node' && report.rows.length === 1 && liveFor(report.rows[0])
  const provenance: NodeReport = {
    scope: report.scope, nodeId: report.scope === 'node' ? report.rows[0]?.node_id : null, localNode: own, servingOnly: !!namedLocal,
    rows: report.rows.map(row => {
      const host = liveFor(row) ? live?.resources?.host : null
      const at = host?.activity_at
      const current = host && finite(at) && at >= (row.activity_at ?? row.captured_at ?? 0)
        && at >= report.generated_at - 300 && at <= report.generated_at + 60
      return { ...row, ...(current ? { active_sessions: host.active_sessions, active_processes: host.active_processes,
        inbound_bps: host.inbound_bps, outbound_bps: host.outbound_bps, activity_at: at, status: 'reported' } : {}),
        daemon: record(byNode.get(row.node_id)?.runtime.daemon) as Daemon | undefined }
    }),
    contributors: contributors.map(item => item.id),
    metricNodes: Object.fromEntries([...MODES, 'read'].map(mode => [mode, contributors.filter(({ store }) => mode === 'read'
      ? finite(record(store.reads)?.recent_avg_ms) : finite(record(record(store.ingestion_traffic)?.[mode])?.rows_per_s)).length])),
    truncated: report.truncated, supplementError,
  }
  if (namedLocal && live) return { ...live, node_report: provenance, writers: writer(live.store?.writer, own), queryCpuByNode }

  const stores = contributors.map(sample => sample.store)
  const reads = combine(stores.map(store => store.reads))
  const writes = combine(stores.map(store => store.writes))
  const commands = combine(stores.map(store => store.commands))
  const traffic = Object.fromEntries(MODES.flatMap(mode => {
    const metrics = modeTraffic(stores, mode)
    return metrics ? [[mode, metrics]] : []
  }))
  const capacity = shared && {
    total: shared.capacity_total, available: shared.capacity_available, checked_at: shared.capacity_checked_at,
    status: shared.capacity_status, scope: shared.scope,
    in_use: finite(shared.capacity_total) && finite(shared.capacity_available) ? shared.capacity_total - shared.capacity_available : null,
  }
  const policies = shared?.policies ?? live?.store?.ingestion_details?.policies
  const counters = (field: string, keys: string[]) => {
    const rows = samples.map(sample => record(sample.runtime[field])).filter(row => row !== undefined)
    return rows.length ? Object.fromEntries(keys.map(key => [key, sum(rows, key)])) : undefined
  }
  const lists = (field: string) => {
    const reported = samples.filter(sample => Array.isArray(sample.runtime[field]))
    return reported.length ? reported.flatMap(sample => (objects(sample.runtime[field]) ?? []).flatMap(item => {
      const name = text(item.name)
      return name ? [{ ...item, name: report.scope === 'fleet' ? `${sample.id} · ${name}` : name }] : []
    })) : undefined
  }
  const readers = stores.map(store => record(store.reader)).filter(row => row !== undefined)
  const lastReaderError = readers.map(row => text(row.last_error)).find(Boolean)
  return {
    generated_at: report.generated_at, node_report: provenance, queryCpuByNode,
    resources: { cluster: (shared?.cluster_resources ?? live?.resources?.cluster) as HealthLocal['resources']['cluster'] },
    monitor: { collectors: lists('collectors') as NonNullable<HealthView['monitor']>['collectors'] },
    pipeline: {
      sink: counters('sink', ['emitted', 'flushed', 'dropped', 'buffered', 'flood_drops', 'tracked']) as NonNullable<HealthView['pipeline']>['sink'],
      otel_receiver: counters('otel_receiver', ['metrics_received', 'events_received', 'dropped', 'errors', 'api_calls_total', 'api_errors_total']) as NonNullable<HealthView['pipeline']>['otel_receiver'],
      ingesters: lists('ingesters'),
    },
    writers: contributors.flatMap(sample => writer(sample.store.writer, sample.id)),
    store: {
      kind: shared ? 'kusto' : null, database: shared?.database, cluster_url: shared?.cluster ? 'https://' + shared.cluster : null,
      counter_scope: 'Selected reporting daemons. Database and cluster measurements are shared.',
      reads, writes, commands, ingestion_traffic: Object.keys(traffic).length ? traffic : undefined, ingestion_capacity: capacity,
      table_inventory: shared?.table_inventory ?? live?.store?.table_inventory,
      ingestion_details: policies ? { policies } : null,
      volume: live?.store?.volume,
      reader: readers.length === 1 ? readers[0] as NonNullable<HealthStore['reader']> : readers.length ? {
        status: readers.some(row => row.status !== 'ok') ? 'Check reporting clients' : 'ok',
        queries: sum(readers, 'queries') ?? undefined, query_failures: sum(readers, 'query_failures') ?? undefined,
        last_error: lastReaderError,
      } : undefined,
      health: { state: stores.some(store => [store.reads, store.writes, store.commands].some(op => operationFailing(record(op)))) ? 'degraded'
        : [reads, writes, commands].some(operation => operation?.last_success_at) ? 'ok' : 'unknown',
        scope: 'Selected reporting clients; database and cluster measurements are shared.' },
    },
  }
}

export function writerRows(reports: WriterReport[]) {
  return reports.flatMap(report => entries(report.tables).flatMap(([name, value]) => {
    const row = record(value)
    return row ? [{ ...row, name, node_id: report.node_id }] : []
  }))
}
