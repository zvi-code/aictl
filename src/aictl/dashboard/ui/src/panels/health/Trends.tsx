import { createEffect, createMemo, createSignal, For, Show, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { DetailNodes } from '../../data/contract.gen'
import { fmtDur, stamp } from '../../design/format'
import type { DetailResource, PanelContext, PanelProps, Read } from '../types'
import { Chart } from '../../ui/Chart'
import { PanelState } from '../../ui/PanelState'
import { Segmented } from '../../ui/Segmented'
import { States } from '../kinds/States'
import { Detail, field, HealthBox, HealthTable, time } from './HealthParts'
import { StatTiles } from './HealthVisuals'
import {
  axisTicks, axisUnit, bucketTimes, confirmedSeries, formatValue, lastIndex, METRICS, metricPlot, nodeIds, nodeSummaries, RANGES,
  seriesPath, seriesWindow, windowTotals, type Metric, type Plot, type RangeId, type Scope, type SeriesRow, type SeriesView,
  type TrendView, type Unit,
} from './trendModel'
import {
  backendPlot, backendTotals, confirmedBackend, confirmedFlows, flowLossPlot, flowTotals, groupPlot, nodeFlowSummaries, nodeRowsPlot,
  otelPlot, tablePlot, tableSummaries, WORK, type BackendView, type FlowsView,
} from './flowTrends'
import {
  droppedEvents, droppedRows, failedCommands, failedIngestion, failedRequests, receivingTables, restartCount, restartList, restartText,
} from './windowFacts'
import styles from './Health.module.css'
import { nodeNoun, nodeTag, nodeTitle } from '../../data/nodeNames'

const REFRESH_MS = 30_000
const NO_STORE = 'Health history needs a Kusto store.'
const views = [{ id: 'chart', label: 'Charts' }, { id: 'table', label: 'Data table' }]
const fromMiB = (value: number | null) => value == null ? null : value * 1048576
const warn = (value: number | null | undefined) => value ? 'warning' as const : 'neutral' as const
const decimal = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 3 })

const tableFields = [
  field('table', 'Table'), field('modes', 'Mode'), field('nodes', 'Sending nodes'), field('rows', 'Rows sent'),
  field('mean_rows_per_s', 'Mean rate', 'per_s'), field('peak_rows_per_s', 'Peak rate', 'per_s'), field('bytes', 'Bytes sent', 'bytes'),
  field('requests', 'Requests'), field('failures', 'Failed requests'), field('rows_dropped', 'Rows dropped'),
  field('queue_depth', 'Rows waiting'), time('last_at', 'Last snapshot'),
]
const flowNodeFields = [
  field('node_id', 'Node'), field('tables', 'Tables'), field('top_table', 'Largest table'), field('rows', 'Rows sent'),
  field('mean_rows_per_s', 'Mean rate', 'per_s'), field('bytes', 'Bytes sent', 'bytes'), field('requests', 'Requests'),
  field('failures', 'Failed requests'), field('rows_dropped', 'Rows dropped'), field('queue_depth', 'Rows waiting'),
  time('last_at', 'Last snapshot'),
]
const flowBucketFields = [
  time('t', 'Bucket start'), field('table', 'Table'), field('rows_per_s', 'Rows', 'per_s'), field('bytes_per_s', 'Bytes', 'rate_bps'),
  field('requests_per_s', 'Requests', 'per_s'), field('failures', 'Failed requests'), field('rows_dropped', 'Rows dropped'),
  field('queue_depth', 'Rows waiting'), field('nodes', 'Sending nodes'),
]
const viewFields = [
  field('view', 'aictl view'), field('commands', 'Queries'), field('failed', 'Failed'), field('cpu_s', 'CPU time', 'seconds'),
  field('mean_ms', 'Mean duration', 'ms'), field('max_ms', 'Longest', 'ms'), field('memory_peak', 'Memory peak', 'bytes'),
]
const backendBucketFields = [
  time('t', 'Bucket start'), field('work', 'Work'), field('commands', 'Commands'), field('failed', 'Failed'),
  field('cpu_s', 'CPU time', 'seconds'), field('memory_peak', 'Memory peak', 'bytes'),
]
const summaryFields = [
  field('node_id', 'Node'), time('last_at', 'Last bucket'), field('samples', 'Samples'), field('restarts', 'Restarts'),
  field('host_cpu', 'Host CPU mean', 'percent'), field('host_cpu_max', 'Host CPU peak', 'percent'),
  field('host_mem_bytes', 'Host memory mean', 'bytes'), field('daemon_cpu', 'Daemon CPU mean', 'percent'),
  field('daemon_cpu_max', 'Daemon CPU peak', 'percent'), field('daemon_rss_bytes', 'Daemon memory peak', 'bytes'),
  field('reads_per_s', 'Reads', 'per_s'), field('read_ms', 'Read latency mean', 'ms'), field('read_ms_max', 'Read latency peak', 'ms'),
  field('failures', 'Failed requests'), field('dropped', 'Dropped rows and events'), field('queue_depth', 'Writer queue peak'),
]
const bucketFields = [
  time('t', 'Bucket start'), field('node_id', 'Node'), field('samples', 'Samples'), field('restarts', 'Restarts'),
  field('host_cpu', 'Host CPU mean', 'percent'), field('host_cpu_max', 'Host CPU peak', 'percent'),
  field('host_mem_bytes', 'Host memory', 'bytes'), field('daemon_cpu', 'Daemon CPU', 'percent'),
  field('daemon_rss_bytes', 'Daemon memory', 'bytes'), field('reads_per_s', 'Reads', 'per_s'), field('writes_per_s', 'Writes', 'per_s'),
  field('read_ms', 'Read latency', 'ms'), field('write_ms', 'Write latency', 'ms'),
  field('streaming_rows_per_s', 'Streaming rows', 'per_s'), field('queued_rows_per_s', 'Queued DM rows', 'per_s'),
  field('inline_rows_per_s', 'Inline rows', 'per_s'), field('queue_depth', 'Writer queue'), field('read_failures', 'Read failures'),
  field('write_failures', 'Write failures'), field('ingest_failures', 'Ingestion failures'), field('rows_dropped', 'Writer rows dropped'),
  field('query_cpu', 'Query CPU (s/s)'), field('sessions', 'Sessions'), field('processes', 'Processes'),
]

type Card = { id: string; title: string; description: string; unit: Unit; stack?: boolean; plot: Plot }
type Window = ReturnType<typeof seriesWindow>
type Confirm = (value: DetailNodes | undefined, scope: Scope, nodeId: string | null) => boolean

const card = (item: Metric, plot: Plot): Card =>
  ({ id: item.id, title: item.title, description: item.description, unit: item.unit, stack: item.stack, plot })

function seriesCard(item: Metric, rows: readonly SeriesRow[], times: readonly number[]): Card {
  // Query CPU adds up across nodes, so many nodes are stacked with an Other band instead of showing only the busiest few.
  if (item.id === 'query-cpu' && nodeIds(rows).length > 1) {
    return { ...card(item, groupPlot(rows.map(row => ({ group: nodeTag(row.node_id), t: row.t, value: row.query_cpu })), times, { noun: 'nodes' })),
      stack: true }
  }
  return card(item, metricPlot(item, rows, times))
}

/** Read one view of the window and keep its last confirmed answer for the same scope and range while the next window loads. */
function useTrend<T extends DetailNodes>(ctx: PanelContext, view: TrendView, window: Accessor<Window>, selection: Accessor<string>,
  confirm: Confirm) {
  const path = createMemo(() => seriesPath(ctx.scope(), ctx.nodeId(), window().since, window().until, view))
  const remote = untrack(() => ctx.detail<DetailNodes>(path))
  const [kept, setKept] = createSignal<{ key: string; data: T }>()
  createEffect(() => remote()?.data, data => {
    if (confirm(data, untrack(ctx.scope), untrack(ctx.nodeId))) setKept({ key: untrack(selection), data: data as T })
  })
  const data = createMemo(() => {
    const value = kept()
    return value?.key === selection() ? value.data : undefined
  })
  return { path, remote, data }
}

function trendRead<T extends DetailNodes>(trend: { path: Accessor<string | undefined>; remote: DetailResource<DetailNodes>; data: Accessor<T | undefined> },
  what: string, empty: (value: T) => boolean, unavailable?: RegExp) {
  return createMemo<Read>(() => {
    if (!trend.path()) return { state: 'unavailable', message: 'Choose a node ID to read its health history.' }
    const response = trend.remote(), value = trend.data()
    if (!value) {
      const error = response?.error
      if (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (/requires a Kusto store/i.test(message)) return { state: 'unavailable', message: NO_STORE }
        if (unavailable?.test(message)) return { state: 'unavailable', message }
        return { state: 'error', message: `Could not read ${what}. ${message}` }
      }
      if (response?.data) return { state: 'error', message: `The server did not return the requested ${what}.` }
      return { state: 'loading' }
    }
    if (empty(value)) return { state: 'empty' }
    if (response?.status === 'stale' || (response?.error && response.data === undefined)) {
      return { state: 'stale', value, updatedAt: value.generated_at, message: `The newest ${what} could not be read.` }
    }
    return { state: 'ready', value, updatedAt: value.generated_at }
  })
}

export default function Trends(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  const [range, setRange] = createSignal<RangeId>('24h')
  const [view, setView] = createSignal('chart')
  const [pinned, setPinned] = createSignal<number | null>(null)
  const seconds = () => RANGES.find(item => item.id === range())!.seconds
  const [window, setWindow] = createSignal(seriesWindow(Date.now() / 1000, untrack(seconds)))
  const selection = () => JSON.stringify([ctx.scope(), ctx.nodeId(), range()])
  const seriesTrend = useTrend<SeriesView>(ctx, 'series', window, selection, confirmedSeries)
  const flowsTrend = useTrend<FlowsView>(ctx, 'flows', window, selection, confirmedFlows)
  const backendTrend = useTrend<BackendView>(ctx, 'backend', window, selection, confirmedBackend)
  const remotes = [seriesTrend, flowsTrend, backendTrend].map(item => item.remote)
  const series = seriesTrend.data, flows = flowsTrend.data, backend = backendTrend.data
  const choose = (id: string) => {
    const next = RANGES.find(item => item.id === id)
    if (!next) return
    setRange(next.id)
    setPinned(null)
    setWindow(seriesWindow(Date.now() / 1000, next.seconds))
  }
  // Move the window when a new bucket starts; otherwise refresh the newest bucket.
  createEffect(seriesTrend.path, key => {
    if (!key) return
    const tick = () => {
      if (document.hidden) return
      const next = seriesWindow(Date.now() / 1000, untrack(seconds))
      if (next.until !== untrack(window).until) setWindow(next)
      else for (const remote of remotes) remote.retry()
    }
    const timer = setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  })
  const seriesResult = trendRead(seriesTrend, 'health history', value => !value.rows.length)
  const flowsResult = trendRead(flowsTrend, 'ingestion flows', value => !value.tables.length && !value.nodes.length)
  const backendResult = trendRead(backendTrend, 'Kusto backend usage', value => !value.series.length,
    /command history is unavailable|management client is not ready/i)
  // Without a Kusto store every view answers the same way, so say it once.
  const noStore = () => [seriesResult, flowsResult, backendResult].some(read => read().message === NO_STORE)

  const times = createMemo(() => bucketTimes(window()))
  // Buckets with a node snapshot. A table without a row in such a bucket sent nothing, which is zero rather than a gap.
  const active = createMemo(() => new Set([...(series()?.rows ?? []).map(row => row.t), ...(flows()?.tables ?? []).map(row => row.t)]))
  const latest = createMemo(() => {
    let newest = -Infinity
    for (const t of active()) newest = Math.max(newest, t)
    const i = times().indexOf(newest)
    return i >= 0 ? i : times().length - 1
  })
  const index = () => {
    const value = pinned()
    return value != null && value >= 0 && value < times().length ? value : latest()
  }
  const bucketLabel = () => {
    const t = times()[index()], step = window().step
    return t == null ? 'No bucket' : `${stamp(t, true)} – ${stamp(t + step)}`
  }
  const step = (by: number) => setPinned(Math.max(0, Math.min(times().length - 1, index() + by)))

  const flowCards = createMemo<Card[]>(() => {
    const value = flows(), rows = series()?.rows ?? [], at = times(), present = (t: number) => active().has(t)
    if (!value) return []
    return [
      { id: 'flow-rows', title: 'Rows by table', description: 'Rows per second sent to each table (stacked)', unit: 'per_s', stack: true,
        plot: tablePlot(value, at, 'rows_per_s', present) },
      { id: 'flow-bytes', title: 'Bytes by table', description: 'Bytes per second sent to each table (stacked)', unit: 'bytes_per_s',
        stack: true, plot: tablePlot(value, at, 'bytes_per_s', present) },
      ...nodeIds(rows).length > 1 ? [{ id: 'flow-nodes', title: 'Rows by node', description: 'Rows per second each node sent (stacked)',
        unit: 'per_s' as const, stack: true, plot: nodeRowsPlot(rows, at) }] : [],
      ...METRICS.filter(item => item.section === 'flows').map(item => seriesCard(item, rows, at)),
      { id: 'flow-otel', title: 'OpenTelemetry received', description: 'Raw OTel rows per second sent to Kusto, by export table (stacked)',
        unit: 'per_s', stack: true, plot: otelPlot(value, at, present) },
      { id: 'flow-queue', title: 'Queue by table', description: 'Peak rows waiting in writer queues for each table (stacked)',
        unit: 'count', stack: true, plot: tablePlot(value, at, 'queue_depth', present) },
      { id: 'flow-loss', title: 'Failures and drops', description: 'Failed ingestion requests and dropped rows in each bucket',
        unit: 'count', plot: flowLossPlot(value, at, present) },
    ]
  })
  const flowTotal = createMemo(() => flowTotals(flows()))
  const tables = createMemo(() => flows() ? tableSummaries(flows()!) : [])
  const flowNodes = createMemo(() => flows() ? nodeFlowSummaries(flows()!) : [])
  const flowBuckets = createMemo(() => [...(flows()?.tables ?? [])].sort((a, b) => b.t - a.t || a.table.localeCompare(b.table)))

  const backendCards = createMemo<Card[]>(() => {
    const value = backend(), at = times()
    const cards: Card[] = value ? [
      { id: 'backend-cpu', title: 'Cluster CPU by work', unit: 'cpu_s', stack: true, plot: backendPlot(value, at, 'cpu_s', true),
        description: 'CPU seconds per second the cluster used for this database, by kind of work (stacked)' },
      { id: 'backend-commands', title: 'Commands by work', unit: 'per_s', stack: true, plot: backendPlot(value, at, 'commands', true),
        description: 'Commands and queries per second, by kind of work (stacked)' },
      { id: 'backend-failed', title: 'Failed commands', unit: 'count', stack: true, plot: backendPlot(value, at, 'failed', false),
        description: 'Failed commands and queries in each bucket, by kind of work (stacked)' },
    ] : []
    const rows = series()?.rows
    return rows ? [...cards, ...METRICS.filter(item => item.section === 'backend').map(item => seriesCard(item, rows, at))] : cards
  })
  const backendTotal = createMemo(() => backendTotals(backend()))
  const backendViews = createMemo(() => [...(backend()?.views ?? [])].sort((a, b) => (b.cpu_s ?? 0) - (a.cpu_s ?? 0)))
  const workLabel = new Map(WORK.map(item => [item.id, item.label]))
  const backendBuckets = createMemo(() => [...(backend()?.series ?? [])].sort((a, b) => b.t - a.t
    || WORK.findIndex(item => item.id === a.work) - WORK.findIndex(item => item.id === b.work))
    .map(row => ({ ...row, work: workLabel.get(row.work) ?? row.work })))

  const hostCards = createMemo(() => {
    const rows = series()?.rows ?? [], at = times()
    return METRICS.filter(item => item.section === 'hosts').map(item => seriesCard(item, rows, at))
  })
  const totals = createMemo(() => windowTotals(series()?.rows ?? []))
  const rangeText = () => `last ${RANGES.find(item => item.id === range())!.label}`
  const windowOf = () => ({ label: rangeText(), series: series(), flows: flows(), backend: backend() })
  const restarts = createMemo(() => restartList(series()?.rows, window().step))
  const summaries = createMemo(() => nodeSummaries(series()?.rows ?? []).map(row => ({
    ...row, host_mem_bytes: fromMiB(row.host_mem_mb), daemon_rss_bytes: fromMiB(row.daemon_rss_mb),
  })))
  const hostBuckets = createMemo(() => [...(series()?.rows ?? [])].sort((a, b) => b.t - a.t || a.node_id.localeCompare(b.node_id))
    .map(row => ({ ...row, host_mem_bytes: fromMiB(row.host_mem_mb), daemon_rss_bytes: fromMiB(row.daemon_rss_mb) })))
  const fleet = () => ctx.scope() === 'fleet'
  const viewNodeAction = {
    label: (row: { node_id: string }) => row.node_id === 'legacy' ? '' : `View ${nodeNoun(row.node_id)}`,
    run: (row: { node_id: string }) => ctx.navigate({ scope: 'node', node_id: row.node_id }),
  }
  const viewNode = () => fleet() ? viewNodeAction : undefined
  const grid = (cards: Accessor<readonly Card[]>) =>
    <CardGrid cards={cards()} index={index()} onHover={setPinned} />

  return <HealthBox def={props.def}><div class={styles.flow}>
    <div class={styles.trendControls}>
      <Segmented label="Health history range" options={RANGES.map(({ id, label }) => ({ id, label }))} value={range()} onChange={choose} />
      <Segmented label="Health history view" options={views} value={view()} onChange={setView} />
      <Show when={view() === 'chart' && times().length}>
        <button type="button" class={styles.bucket} aria-label={`Bucket ${bucketLabel()}. Use the arrow keys to move.`}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              step(event.key === 'ArrowLeft' ? -1 : 1)
            } else if (event.key === 'End' || event.key === 'Escape') {
              event.preventDefault()
              setPinned(null)
            } else if (event.key === 'Home') {
              event.preventDefault()
              setPinned(0)
            }
          }}><span class={styles.bucketLabel}>Bucket</span>{' '}{bucketLabel()}</button>
        <Show when={pinned() != null}>
          <button type="button" class={styles.bucket} onClick={() => setPinned(null)}>Show newest</button>
        </Show>
      </Show>
    </div>

    <Show when={!noStore()} fallback={<PanelState state="unavailable" message={NO_STORE} />}>
    <TrendSection id="flows" title="Ingestion flows">
      <States result={flowsResult} retry={() => flowsTrend.remote.retry()} reserveStaleSpace
        empty="No node sent rows to Kusto in this window.">
        <div class={styles.trendStats}><StatTiles items={[
          { label: 'Rows sent', value: flowTotal()?.rows, detail: rangeText() },
          { label: 'Mean rate', value: formatValue(flowTotal()?.meanRowsPerS, 'per_s'), detail: `rows per second, ${rangeText()}` },
          { label: 'Peak rate', value: formatValue(flowTotal()?.peakRowsPerS, 'per_s'), detail: `busiest bucket, ${rangeText()}` },
          { label: 'Tables receiving rows', value: receivingTables(windowOf()), detail: `logical tables, ${rangeText()}` },
          { label: 'Sending nodes', value: flowTotal()?.nodes, detail: rangeText() },
          { label: 'Failed ingestion requests', value: failedIngestion(windowOf()), tone: warn(failedIngestion(windowOf())), detail: rangeText() },
          { label: 'Rows dropped', value: droppedRows(windowOf()), tone: warn(droppedRows(windowOf())), detail: `writer queues, ${rangeText()}` },
          { label: 'Rows waiting', value: flowTotal()?.queued, detail: 'at the last snapshot' },
        ]} /></div>
        <Show when={view() === 'chart'} fallback={
          <HealthTable ctx={ctx} label="Ingestion flow buckets" fields={flowBucketFields} rows={flowBuckets()}
            rowId={row => JSON.stringify([row.table, row.t])} empty="No node sent rows to Kusto in this window." />
        }>{grid(flowCards)}</Show>
        <HealthTable ctx={ctx} label="Destination tables" fields={tableFields} rows={tables()} rowId={row => row.table} />
        <Show when={fleet() || flowNodes().length > 1}>
          <HealthTable ctx={ctx} label="Sending nodes" fields={flowNodeFields} rows={flowNodes()} rowId={row => row.node_id}
            action={viewNode()} />
        </Show>
        <Show when={flows()?.truncated}><p class={styles.note}>Incomplete: the row limit was reached.</p></Show>
      </States>
    </TrendSection>

    <TrendSection id="backend" title="Kusto backend">
      <States result={backendResult} retry={() => backendTrend.remote.retry()}
        empty="The cluster recorded no commands for this database in this window.">
        <div class={styles.trendStats}><StatTiles items={[
          { label: 'Cluster CPU time', value: backendTotal() ? fmtDur(backendTotal()!.cpu) : undefined, detail: rangeText() },
          { label: 'Mean cores', value: backendTotal() ? decimal.format(backendTotal()!.cores) : undefined, detail: 'CPU time ÷ window' },
          { label: 'aictl share', value: backendTotal()?.aictlShare == null ? undefined : `${Math.round(backendTotal()!.aictlShare!)}%`,
            detail: 'of cluster CPU time' },
          { label: 'Commands', value: backendTotal()?.commands, detail: rangeText() },
          { label: 'Failed commands', value: failedCommands(windowOf()), tone: warn(failedCommands(windowOf())), detail: `cluster record, ${rangeText()}` },
          { label: 'Busiest aictl view', value: backendTotal()?.top?.view,
            detail: backendTotal()?.top?.cpu_s != null ? `${fmtDur(backendTotal()!.top!.cpu_s!)} CPU` : undefined },
        ]} /></div>
      </States>
      <Show when={view() === 'chart'} fallback={
        <Show when={backend()}>
          <HealthTable ctx={ctx} label="Kusto backend buckets" fields={backendBucketFields} rows={backendBuckets()}
            rowId={row => JSON.stringify([row.work, row.t])} />
        </Show>
      }>
        <Show when={backendCards().length}>{grid(backendCards)}</Show>
      </Show>
      <Show when={backend()}>{value => <>
        <HealthTable ctx={ctx} label="aictl views by cluster CPU" fields={viewFields} rows={backendViews()} rowId={row => row.view}
          empty="No aictl queries were recorded in this window." />
        <p class={styles.note} title={value().measurement_scope}>Database {value().database}</p>
      </>}</Show>
    </TrendSection>

    <TrendSection id="hosts" title="Hosts and daemons">
      <States result={seriesResult} retry={() => seriesTrend.remote.retry()} empty="No health samples were recorded in this window.">
        <div class={styles.trendStats}><StatTiles items={[
          { label: 'Reporting nodes', value: totals().nodes, detail: rangeText() },
          { label: 'Daemon restarts', value: restartCount(windowOf()), tone: warn(restartCount(windowOf())),
            detail: restarts()?.[0] ? `latest ${restartText(restarts()![0], false)}` : rangeText() },
          { label: 'Failed store requests', value: failedRequests(windowOf())?.total, tone: warn(failedRequests(windowOf())?.total),
            detail: `reads, writes, commands, ${rangeText()}` },
          { label: 'Rows dropped', value: droppedRows(windowOf()), tone: warn(droppedRows(windowOf())), detail: `writer queues, ${rangeText()}` },
          { label: 'Events dropped', value: droppedEvents(windowOf()), tone: warn(droppedEvents(windowOf())), detail: `sink and OTel, ${rangeText()}` },
          { label: 'Peak host CPU', value: formatValue(totals().hostCpuPeak, 'percent'), detail: rangeText() },
          { label: 'Peak read latency', value: formatValue(totals().readPeak, 'ms'), detail: rangeText() },
        ]} /></div>
        <Show when={restarts()?.length}>
          <Detail label={`Daemon restarts (${restarts()!.length} buckets)`}>
            <ul><For each={restarts()} keyed={item => `${item.node_id}:${item.at}`}>{item =>
              <li title={nodeTitle(item().node_id)}>{restartText(item(), fleet() || summaries().length > 1)}</li>}</For></ul>
          </Detail>
        </Show>
        <Show when={view() === 'chart'} fallback={
          <HealthTable ctx={ctx} label="Health history buckets" fields={fleet() ? bucketFields
            : bucketFields.filter(item => item.path !== 'node_id')} rows={hostBuckets()}
            rowId={row => JSON.stringify([row.node_id, row.t])} empty="No health samples were recorded in this window." />
        }>{grid(hostCards)}</Show>
        <Show when={fleet() || summaries().length > 1}>
          <HealthTable ctx={ctx} label="Nodes over the selected range" fields={summaryFields} rows={summaries()} rowId={row => row.node_id}
            action={viewNode()} />
        </Show>
      </States>
    </TrendSection>

    <p class={styles.note} title="Node charts come from saved node snapshots; rates are computed between snapshots of the same daemon process, so a restart starts a new count.">
      Bucket size {formatStep(window().step)}<Show when={series()?.truncated}>. Incomplete: the row limit was reached.</Show>
    </p>
    </Show>
  </div></HealthBox>
}

function formatStep(seconds: number) {
  return seconds % 3600 === 0 ? `${seconds / 3600} h` : seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`
}

function TrendSection(props: { id: string; title: string; children: JSX.Element }) {
  return <section class={styles.trendSection} data-health-section={props.id} aria-labelledby={`health-trends-${props.id}`}>
    <h4 id={`health-trends-${props.id}`}>{props.title}</h4>
    {props.children}
  </section>
}

function CardGrid(props: { cards: readonly Card[]; index: number; onHover: (index: number) => void }) {
  return <div class={styles.trendGrid}>
    <For each={props.cards} keyed={item => item.id}>{item =>
      <TrendCard card={item()} index={props.index} onHover={props.onHover} />
    }</For>
  </div>
}

function TrendCard(props: { card: Card; index: number; onHover: (index: number) => void }) {
  const [hidden, setHidden] = createSignal(new Set<number>())
  const plot = () => props.card.plot
  const hasData = createMemo(() => lastIndex(plot().points) >= 0)
  const series = createMemo(() => plot().series.map((item, i) => ({ ...item, visible: !hidden().has(i) })), {
    equals: (a, b) => a.length === b.length && a.every((item, i) => item.label === b[i].label && item.visible === b[i].visible),
  })
  const points = createMemo(() => props.card.stack ? plot().points.map(point => {
    let total = 0
    return { x: point.x, values: point.values.map((value, i) => value == null ? null : total += hidden().has(i) ? 0 : value) }
  }) : plot().points)
  const readout = createMemo(() => plot().points[props.index]?.values.map(value => formatValue(value, props.card.unit)) ?? [])
  const toggle = (i: number) => setHidden(old => {
    const next = new Set(old)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    return next
  })
  return <section class={styles.trendCard} data-health-chart={props.card.id} aria-label={props.card.title}>
    <h5>{props.card.title}</h5>
    <Show when={hasData()} fallback={<PanelState state="empty" inline message="No samples in this range." />}>
      <div class={styles.trendPlot}>
        <Chart label={props.card.title} description={plot().note ? `${props.card.description} · ${plot().note}` : props.card.description}
          series={series()} points={points()} xAxis="time" unit={axisUnit[props.card.unit]} ticks={axisTicks(props.card.unit)}
          stack={props.card.stack}
          sync="health-trends" readout={readout()} onHover={props.onHover} onToggleSeries={toggle} />
      </div>
    </Show>
  </section>
}
