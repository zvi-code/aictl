import { ago, fmtAge } from '../../design/format'
import type { HealthLocal, HealthStore, MachineMonitor, MachinePipeline, QueryCpu } from '../../data/contract.gen'
import type { NodeReport, WriterReport } from './scopedHealth'

type Write = NonNullable<MachinePipeline['self']>['writes'][number]
type Ingester = MachinePipeline['ingesters'][number]
type StoreObjects = 'reads' | 'writes' | 'commands' | 'ingestion_traffic' | 'ingestion_capacity' | 'ingestion_details'
export type StoreView = Omit<Partial<HealthStore>, StoreObjects> & Partial<Record<StoreObjects, Record<string, unknown> | null>>

export type HealthView = {
  generated_at: HealthLocal['generated_at']
  store?: StoreView | null
  monitor?: Partial<MachineMonitor>
  pipeline?: {
    [K in keyof MachinePipeline]?: MachinePipeline[K] extends Array<infer Item>
      ? Partial<Item>[] : Partial<MachinePipeline[K]>
  }
  resources?: Partial<HealthLocal['resources']>
  node_report?: NodeReport
  writers?: WriterReport[]
  queryCpuByNode?: (Partial<QueryCpu> & { node_id: string })[]
}

export const MODES = ['queued', 'streaming', 'inline'] as const
export const MISSING = 'Not available from this source'
export const STALE_AFTER_S = 60
export const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
export const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
export const entries = (value: unknown) => Object.entries(record(value) ?? {})
export const objects = (value: unknown): Record<string, unknown>[] | undefined =>
  Array.isArray(value) ? value.map(record).filter(row => row !== undefined) : undefined
export const text = (value: unknown) => typeof value === 'string' && value !== '' ? value : undefined

export function writeWarning(writes?: readonly Write[] | null, kind?: string | null) {
  const longest = writes?.reduce<Write | undefined>((a, b) =>
    finite(b.age_s) && (!finite(a?.age_s) || b.age_s > a.age_s) ? b : a, undefined);
  if (!finite(longest?.age_s) || longest.age_s < 60 || kind === 'kusto') return null;
  return `History write (${longest.name}) has run for ${fmtAge(longest.age_s)}.`;
}

export function ingesterState(i: Partial<Ingester>) {
  const state = i.status ?? ''
  if (i.status === 'off') return { status: 'off', cls: null };
  if (['error', 'failed'].includes(state) || i.error && ['ok', 'running', 'waiting'].includes(state)) {
    return { status: i.status === 'running' ? 'retrying after error' : 'failed', cls: 'crit' };
  }
  if (i.status === 'running' || i.poll_in_flight && ['ok', 'waiting'].includes(state)) return { status: 'running', cls: null };
  if (i.status === 'ok' && !i.last_ok) return { status: 'awaiting success', cls: null };
  if (['ok', 'waiting'].includes(state)) return { status: state, cls: null };
  return { status: i.status || 'unknown', cls: 'warn' };
}

const pollSuccess = (i: Partial<Ingester>, nowS: number) => i.last_ok ? 'Last success ' + ago(i.last_ok, nowS)
  : i.last_ok === null ? 'No successful poll yet' : 'Last success not reported';

export function qualityContext(q: Partial<MachinePipeline['data_quality'][number]>, ingesters: Partial<Ingester>[]) {
  const ingester = ingesters.find(i => q.component === `ingester:${i.name}` || q.component === i.name);
  if (ingester?.status === 'off' && ['source_missing', 'missing', 'no source'].includes(q.status ?? '')) return 'Ingester off';
  if (ingester && ['ok', 'running'].includes(ingester.status ?? '') && !ingester.error && q.ts && finite(ingester.last_ok) && ingester.last_ok > q.ts
    && (!q.source || !ingester.source_path || q.source === ingester.source_path)) return 'A later poll succeeded';
  return null;
}

export function otelConfig(pipe: HealthView['pipeline'], tool: string, nowS: number) {
  const setup = pipe?.otel_setup?.[tool];
  if (!setup) return null;
  const last = pipe?.otel_receiver?.by_tool?.[tool]?.last_at;
  const recent = finite(last) && last > 0 && nowS - last < 300;
  const status = setup.status || 'unknown';
  const detail = `Local OTel config: ${status}` + (setup.variable ? ` (${setup.variable})` : '')
    + (setup.source ? ` in ${setup.source}` : '') + (recent ? '. The receiver saw this tool in the last 5 min.' : '.');
  return { status, detail, warning: status !== 'ok' && !recent };
}

// SDK counters and last_error survive a successful retry. Compare within the same operation.
export function operationFailing(op?: Record<string, unknown> | null) {
  if (finite(op?.last_error_at)) return !finite(op.last_success_at) || op.last_error_at > op.last_success_at;
  return !!op?.last_error && op.last_success_at == null;
}

function clientState(store?: StoreView | null) {
  const health = store?.health;
  if (health?.state === 'degraded' || health?.last_error) return 'degraded';
  if (health?.last_success_at === null && ['ok', 'unknown'].includes(health.state ?? '')) return 'no success yet';
  return health?.state || 'unknown';
}

export function measurementState(metric?: Record<string, unknown> | null) {
  return text(metric?.status) ?? (metric?.checked_at ? 'cached' : 'not reported');
}

export function measuredValue(metric: Record<string, unknown> | null | undefined, key: string) {
  // An unsuccessful first measurement has no values. A failed refresh can retain a real sample.
  return metric?.status && !metric.checked_at && metric.status !== 'cached' ? null : metric?.[key];
}

export function storeOperations(store?: StoreView | null) {
  return [
    ['Read requests', store?.reads],
    ['Write requests', store?.writes],
    ...((store?.commands || store?.commands_scope) ? [['Management requests', store.commands] as const] : []),
  ] as const
}

export function healthStatus(data?: HealthView | null, error?: unknown, nowS = Date.now() / 1000) {
  const severe: string[] = [], warnings: string[] = [], pending: string[] = [], limitations: string[] = []
  if (!data) return error ? { label: 'Unavailable', cls: 'crit', issues: ['Could not read live health.'], pending, limitations }
    : { label: 'Unknown', cls: 'warn', issues: [], pending: ['Waiting for live health.'], limitations }
  const { pipeline: pipe, store, node_report: report } = data
  const collectors = data.monitor?.collectors ?? []
  const ingesters = pipe?.ingesters ?? []
  const add = (message: string, critical = false) => (critical ? severe : warnings).push(message)
  if (error) add('Could not update health; showing the last response.', true)
  if (report) {
    const stale = report.rows.filter(row => row.status === 'stale')
    if (stale.length) add(`Stale host reports: ${stale.map(row => row.node_id).join(', ')}.`)
    if (!report.rows.length || report.rows.some(row => row.status === 'unknown')) pending.push('Some selected hosts have not reported measurements.')
    if (report.supplementError) limitations.push(report.supplementError)
    if (report.contributors.length < report.rows.length) limitations.push('Not every selected node reports SDK counters.')
    if (report.truncated) limitations.push('Not all reporting nodes are listed.')
  }
  if (!data.generated_at) add('The server does not report a health timestamp.')
  else if (nowS - data.generated_at > STALE_AFTER_S) add('Health response is stale.')
  if (finite(pipe?.stream?.snapshot_age_s) && pipe.stream.snapshot_age_s > STALE_AFTER_S) add('Collector snapshot is stale.')
  const write = writeWarning(pipe?.self?.writes, store?.kind)
  if (write) add(write)
  if (pipe?.sink?.flood) add('Flood protection is dropping collector samples.', true)
  const capacity = store?.ingestion_capacity
  if (capacity?.status === 'cached' && capacity.checked_at && finite(capacity.total) && capacity.total > 0 && capacity.available === 0)
    add('No ingestion slots were available at the last cluster capacity check.')
  const failures = storeOperations(store).filter(([, operation]) => operationFailing(operation))
  for (const [label, operation] of failures) add(`${label}: ${operation?.last_error || 'last request failed'}`, true)
  const state = clientState(store)
  if (state === 'degraded' && (!failures.length || store?.health?.last_error && !failures.some(([, op]) => op?.last_error === store.health?.last_error))) {
    add(`Store client: ${store?.health?.last_error || 'degraded'}`, true)
  } else if (state !== 'degraded' && state !== 'ok' && (!report || report.contributors.length)) pending.push(`Store client: ${state}.`)
  for (const [label, metric] of [
    ['Stored volume', store?.volume], ['Cluster ingestion capacity', capacity], ['Kusto ingestion policies', record(store?.ingestion_details?.policies)],
  ] as const) {
    const status = measurementState(metric)
    if (metric?.last_error || ['stale', 'error'].includes(status)) add(`${label}: ${metric?.last_error || status}.`)
    else if (status === 'pending') pending.push(`${label}: measurement pending.`)
    else if (status === 'not reported' && store?.cluster_url && !(report && label === 'Stored volume')) pending.push(`${label}: measurement status not reported.`)
  }
  for (const collector of collectors) {
    if (['active', 'ok'].includes(collector.status)) continue
    const detail = `${collector.name}: ${collector.status || 'unknown'}${collector.detail ? ` — ${collector.detail}` : ''}`
    if (collector.mode === 'etw-fallback' && collector.status === 'degraded' && collector.name.split(' · ').at(-1) === 'network:windows-etw')
      limitations.push(detail)
    else add(detail, ['failed', 'error'].includes(collector.status))
  }
  for (const ingester of ingesters) {
    const { status, cls } = ingesterState(ingester)
    if (cls) add(`${ingester.name}: ${status}${ingester.error ? ` — ${ingester.error}` : ''}`, cls === 'crit')
    else if (status !== 'off' && !ingester.last_ok) pending.push(`${ingester.name}: ${pollSuccess(ingester, nowS)}.`)
  }
  for (const tool of Object.keys(pipe?.otel_setup ?? {})) {
    const config = otelConfig(pipe, tool, nowS)
    if (config?.warning) add(`${tool}: ${config.detail}`)
  }
  if (pipe?.otel_receiver?.active === false) add('OTel receiver has no traffic in the last 5 min.')
  for (const q of pipe?.data_quality ?? []) {
    if (q.severity !== 'warning' && q.severity !== 'error' || qualityContext(q, ingesters)) continue
    if (collectors.some(c => q.component === `collector:${c.name}` && q.status === c.status
      && q.text === c.detail && (!q.error || q.error === c.detail)
      && (q.severity === 'warning' || ['failed', 'error'].includes(c.status)))) continue
    if (ingesters.some(i => q.component === `ingester:${i.name}` && q.status === i.status && i.error && i.error === (q.error || q.text)
      && (q.severity === 'warning' || ingesterState(i).cls === 'crit'))) continue
    add(`${q.component || 'Data quality'}: ${q.text || q.error || q.status || q.severity}`, q.severity === 'error')
  }
  if (!report && !collectors.length && !ingesters.some(i => i.status !== 'off') && pipe?.otel_receiver?.active == null)
    pending.push('No active collection health is reported.')
  const issues = [...new Set([...severe, ...warnings])]
  return { label: severe.length ? 'Degraded' : issues.length ? 'Needs attention' : pending.length ? 'Not ready' : limitations.length ? 'Limited coverage' : 'OK',
    cls: severe.length ? 'crit' : issues.length || pending.length || limitations.length ? 'warn' : 'good', issues, pending, limitations }
}

export function healthSources(health: HealthView) {
  const pipe = health.pipeline
  const hooks = pipe?.hooks, otel = pipe?.otel_receiver?.by_tool, setup = pipe?.otel_setup
  const tools = new Map((health.monitor?.per_tool ?? []).flatMap(row => row.tool ? [[row.tool, row] as const] : []))
  const fresh = new Map((pipe?.freshness ?? []).flatMap(row => row.tool ? [[row.tool, row] as const] : []))
  const names = new Set([...tools.keys(), ...fresh.keys(), ...Object.keys(hooks ?? {}), ...Object.keys(otel ?? {}), ...Object.keys(setup ?? {})])
  return [...names].map(tool => {
    const monitor = tools.get(tool), f = fresh.get(tool), h = hooks?.[tool], o = otel?.[tool]
    const seen = [monitor?.last_seen, f?.last_seen, h?.last_fire_ts, o?.last_at].filter(n => finite(n) && n > 0) as number[]
    return {
      tool, label: f?.label ?? monitor?.label, data_from: f?.source, last_data_ts: seen.length ? Math.max(...seen) : null,
      last_seen: f?.last_seen ?? monitor?.last_seen, workspaces: monitor?.workspaces?.join(', '), confidence: f?.confidence,
      errors: f?.errors, last_error: f?.last_error, hook_count: h?.count, last_hook_at: h?.last_fire_ts,
      metrics: o?.metrics, events: o?.events, last_otel_at: o?.last_at, config: setup?.[tool]?.status,
      config_source: setup?.[tool]?.source, config_variable: setup?.[tool]?.variable,
    }
  })
}
