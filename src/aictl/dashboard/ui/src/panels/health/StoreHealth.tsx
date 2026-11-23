import { createMemo, For, Show, untrack } from 'solid-js'
import type { PanelProps } from '../types'
import { PanelState } from '../../ui/PanelState'
import { entries, finite, measuredValue, measurementState, record, sinceStart, storeOperations, text } from './healthModel'
import { writerReports, writerRows } from './scopedHealth'
import { date, Detail, fact, Facts, field, HealthBody, HealthTable, rowId, time } from './HealthParts'
import { HealthMeter, HealthComparison, StatTiles, percentOf, perMinute, totalOf } from './HealthVisuals'
import { Membership, mode } from './Traffic'
import { StoreLinks } from './Highlights'
import styles from './Health.module.css'

const requestFields = [
  field('operation', 'Client operation'), field('total', 'Requests'), field('rate_per_s', 'Requests/s', 'per_s'),
  field('in_flight', 'In flight'), field('failed', 'Failures since start'), field('avg_ms', 'Average latency', 'ms'),
  time('last_success_at', 'Last success'), field('last_error', 'Last error'), time('last_error_at', 'Last error at'),
]
const queryCpuFields = [
  time('started_at', 'Counting since'), field('queries', 'Completed attempts'), field('failed', 'Failed attempts'),
  field('reported', 'Attempts with CPU'), field('total_cpu_s', 'Reported query CPU', 'seconds'),
]
const writerFields = [
  field('name', 'Table'), field('mode', 'Mode'), field('queue_depth', 'Queue depth'), field('queue_bytes', 'Queue bytes', 'bytes'),
  field('in_flight', 'In flight'), field('rows_sent', 'Rows sent'), field('rows_dropped', 'Rows dropped'),
  field('lost_at_exit', 'Lost at exit'), field('ingest_requests', 'Requests'), field('ingest_failures', 'Failures'),
  field('bytes_sent', 'Bytes sent', 'bytes'), time('last_sent_at', 'Last sent'), field('last_error', 'Last error'), time('last_error_at', 'Last error at'),
]

export default function StoreHealth(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  return <HealthBody ctx={ctx} def={props.def} select={value => value.store}>{data => {
    const store = () => data().store
    const capacity = () => store()?.ingestion_capacity
    const volume = () => store()?.volume
    const config = () => store()?.ingestion_details
    const policy = () => record(config()?.policies)
    const writers = createMemo(() => data().writers ?? writerReports(store()))
    const tables = createMemo(() => writers().some(writer => writer.tables) ? writerRows(writers()) : undefined)
    const requests = createMemo(() => storeOperations(store()).flatMap(([operation, counts]) => counts ? [{ ...counts, operation }] : []))
    const isLocal = () => ctx.scope() === 'local'
    const queryCpu = () => isLocal() ? store()?.query_cpu : data().queryCpuByNode?.length === 1 ? data().queryCpuByNode?.[0] : undefined
    const queryRows = () => isLocal() ? (queryCpu() ? [{ ...queryCpu(), node_id: 'local' }] : undefined) : data().queryCpuByNode
    const available = () => measuredValue(capacity(), 'available')
    const slots = () => measuredValue(capacity(), 'total')
    const stale = (metric: Record<string, unknown> | undefined | null) =>
      Boolean(metric?.checked_at) && ['stale', 'error', 'pending'].includes(measurementState(metric))
    const capacityStale = () => stale(capacity())
    const slotFill = () => {
      const free = available(), total = slots()
      return finite(free) && finite(total) ? percentOf(total - free, total) : undefined
    }
    const failedShare = () => percentOf(queryCpu()?.failed, queryCpu()?.queries)
    const writerBars = (key: 'queue_depth' | 'rows_dropped') => tables()?.map(row => {
      const value = record(row)?.[key]
      return { id: rowId(row, 'node_id', 'name'), label: row.node_id ? `${row.node_id} · ${row.name}` : row.name,
        value: finite(value) ? value : undefined }
    })
    return <>
      <StatTiles items={[
        ...(ctx.scope() === 'fleet'
          ? [{ label: 'Daemons with query CPU', value: queryRows()?.filter(row => finite(row.total_cpu_s)).length }]
          : [{ label: 'Kusto query CPU', value: queryCpu()?.total_cpu_s, unit: 's', detail: sinceStart(data()) }]),
        { label: 'Read requests/min', value: perMinute(store()?.reads?.rate_per_s), detail: 'last 60 s' },
        { label: 'Writer queue depth', value: totalOf(tables()?.map(row => record(row)?.queue_depth)), unit: 'rows', detail: 'waiting now' },
        { label: 'Writer rows dropped', value: totalOf(tables()?.map(row => record(row)?.rows_dropped)), detail: sinceStart(data()) },
        { label: 'Stored rows', value: measuredValue(volume(), 'rows'), detail: stale(volume()) ? 'Stale' : 'current logical rows' },
        { label: 'Cluster slots available', value: available(), detail: capacityStale() ? 'Stale' : undefined },
        { label: 'Cluster slots total', value: slots(), detail: capacityStale() ? 'Stale' : undefined },
      ]} />
      <div class={styles.meters}>
        <HealthMeter label="Cluster slots in use" value={slotFill()} stale={capacityStale()}
          tone={capacityStale() || slotFill() === 100 ? 'warning' : 'neutral'} />
        <Show when={ctx.scope() !== 'fleet'}>
          <HealthMeter label="Failed share since client start" value={failedShare()} tone={(failedShare() ?? 0) > 0 ? 'warning' : 'positive'} />
        </Show>
      </div>
      <Show when={ctx.scope() === 'fleet'}>
        <HealthComparison id="query-cpu" label="Kusto query CPU per daemon" unit="s" window="Since each client started"
          items={queryRows()?.map(row => ({ id: row.node_id, label: row.node_id, value: row.total_cpu_s }))} />
      </Show>
      <div class={styles.chartGroup}>
        <HealthComparison id="writer-queue" label="Writer queue depth by table" unit="rows" items={writerBars('queue_depth')} />
        <HealthComparison id="writer-drops" label="Writer dropped rows by table" unit="rows" window="Since writer start" items={writerBars('rows_dropped')} />
      </div>
      <Detail label="Store details">
        <Facts ctx={ctx} items={[
          fact('Destination', text(store()?.destination) ?? text(store()?.cluster_url)), fact('Database', store()?.database),
          fact('Ingestion mode', store()?.ingestion_mode), fact('Client counter scope', store()?.counter_scope ?? store()?.measurement_scope),
          date('Checked at', store()?.health?.checked_at), date('Last success', store()?.health?.last_success_at),
          fact('Client last error', store()?.health?.last_error), fact('Management request scope', store()?.commands_scope),
        ]} />
        <StoreLinks cluster={store()?.cluster_url} database={store()?.database} />
        <h4>Store stages</h4>
        <Facts ctx={ctx} items={[
          fact('1. Collection buffer', data().pipeline?.sink?.buffered),
          fact('2. Queued DM submissions', mode(store(), 'queued')?.rows_per_s, 'per_s'),
          fact('3. Streaming submissions', mode(store(), 'streaming')?.rows_per_s, 'per_s'),
          fact('3. Inline submissions', mode(store(), 'inline')?.rows_per_s, 'per_s'),
          fact('4. Queryable rows', measuredValue(volume(), 'rows')),
        ]} />
        <h4 title="Client counters reset when the daemon restarts. Rates cover up to 60 seconds.">Client requests {sinceStart(data())}</h4>
        <Show when={requests().length} fallback={<PanelState state="unavailable" inline />}>
          <HealthTable ctx={ctx} label="Client requests since daemon start" rows={requests()} rowId={row => row.operation} fields={requestFields} />
          <Show when={requests().every(row => record(row)?.total === 0)}><PanelState state="empty" inline message="No measured requests." /></Show>
        </Show>
        <Facts ctx={ctx} items={[
          fact('Reader status', store()?.reader?.status), fact('Reader queries', store()?.reader?.queries),
          fact('Reader query failures', store()?.reader?.query_failures), fact('Last reader latency', store()?.reader?.last_latency_ms, 'ms'),
          fact('Last reader error', store()?.reader?.last_error),
          fact('OTel rows buffered', store()?.otel_sink?.pending_rows),
          fact('OTel bytes buffered', store()?.otel_sink?.pending_bytes, 'bytes'),
          fact('Tracked history receipts', store()?.queued_history_rows_unconfirmed),
        ]} />
        <h4 title="Totals start when each daemon creates its query client. CPU includes only attempts for which Kusto reported it.">Kusto query CPU per daemon</h4>
        <HealthTable ctx={ctx} label="Kusto query CPU per daemon"
          fields={isLocal() ? queryCpuFields : [field('node_id', 'Node'), ...queryCpuFields]}
          rows={queryRows()}
          rowId={row => row.node_id} />
        <h4>Stored volume and cluster capacity</h4>
        <Facts ctx={ctx} items={[
          fact('Stored rows', measuredValue(volume(), 'rows'), undefined, 'self.db_rows'),
          fact('Stored bytes', measuredValue(volume(), 'bytes'), 'bytes', 'self.db_size'),
          fact('Storage budget', store()?.storage_budget_bytes, 'bytes'),
          fact('Volume scope', volume()?.scope ?? store()?.write_volume_scope),
          fact('Volume status', measurementState(volume())), date('Volume measured', volume()?.checked_at),
          date('Volume last attempted', volume()?.attempted_at), fact('Volume read error', volume()?.last_error),
          fact('Slots available', measuredValue(capacity(), 'available')), fact('Slots in use', measuredValue(capacity(), 'in_use')),
          fact('Slots total', measuredValue(capacity(), 'total')), fact('Capacity scope', capacity()?.scope ?? store()?.capacity_scope),
          fact('Capacity status', measurementState(capacity())), date('Capacity measured', capacity()?.checked_at),
          fact('Capacity read error', capacity()?.last_error),
        ]} />
        <h4 title="These are database policies, not table policies. Client overrides select the ingestion route.">Database ingestion policy and client routing</h4>
        <Facts ctx={ctx} items={[
          fact('Policy read status', policy()?.status), date('Policy checked', policy()?.checked_at),
          date('Policy last attempted', policy()?.attempted_at), fact('Policy read error', policy()?.last_error),
          fact('Default mode', config()?.default_mode),
          fact('Queued batching time', record(policy()?.batching)?.MaximumBatchingTimeSpan),
          fact('Queued batching item limit', record(policy()?.batching)?.MaximumNumberOfItems),
          fact('Queued batching size (MB)', record(policy()?.batching)?.MaximumRawDataSizeMB),
          fact('Streaming enabled', record(policy()?.streaming)?.IsEnabled),
          fact('Streaming allocated rate hint', record(policy()?.streaming)?.HintAllocatedRate),
          fact('Queued client limit', record(config()?.client_limits)?.queued_max_bytes, 'bytes'),
          fact('Streaming client limit', record(config()?.client_limits)?.streaming_max_bytes, 'bytes'),
          fact('Inline client limit', record(config()?.client_limits)?.inline_max_bytes, 'bytes'),
          fact('Queued pending-row limit', record(config()?.client_limits)?.queued_pending_rows),
        ]} />
        <HealthTable ctx={ctx} label="Client table overrides" fields={[field('table', 'Table'), field('mode', 'Mode')]}
          rows={record(config()?.table_overrides) ? entries(config()?.table_overrides).map(([table, mode]) => ({ table, mode })) : undefined}
          rowId={row => row.table} empty="No table overrides." />
        <h4 title="Rows sent are not confirmed queryable. Queue and drop counters are per reporting writer.">Writer counters by table</h4>
        <For each={writers()} keyed={writer => writer.node_id ?? ''}>{writer => <Facts ctx={ctx} items={[
          fact(writer().node_id ? `${writer().node_id} writer status` : 'Writer status', writer().status),
          fact('Writer warning', writer().warning),
        ]} />}</For>
        <HealthTable ctx={ctx} label="Writer counters by table" fields={ctx.scope() === 'local' ? writerFields : [field('node_id', 'Node'), ...writerFields]}
          rows={tables()}
          rowId={row => rowId(row, 'node_id', 'name')} empty="No table counters reported." />
        <h4>Reported table membership by mode</h4>
        <Membership ctx={ctx} store={store()} />
      </Detail>
    </>
  }}</HealthBody>
}
