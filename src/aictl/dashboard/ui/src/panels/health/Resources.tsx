import { createMemo, For, Show, untrack } from 'solid-js'
import type { PanelProps } from '../types'
import { PanelState } from '../../ui/PanelState'
import { date, Detail, fact, Facts, field, HealthBody, HealthTable, time } from './HealthParts'
import { useHealth } from './healthData'
import { finite } from './healthModel'
import { HealthMeter, HealthComparison, StatTiles, percentOf, totalOf } from './HealthVisuals'
import styles from './Health.module.css'
import { nodeNoun, nodeTag, nodeTitle } from '../../data/nodeNames'

const resourceFields = [
  field('node_id', 'Reporting node'), field('status', 'Host status'), time('captured_at', 'Last report'),
  field('cpu_percent', 'Host CPU', 'percent'), field('memory_used_bytes', 'Host memory used', 'bytes'),
  field('memory_total_bytes', 'Host memory total', 'bytes'), field('active_sessions', 'Sessions'), field('active_processes', 'Processes'),
  field('daemon_pid', 'Daemon PID'), field('daemon.cpu_percent', 'Daemon CPU', 'percent', 'self.cpu_percent'),
  field('daemon.rss_bytes', 'Daemon RSS', 'bytes', 'self.memory_rss'), field('daemon.threads', 'Daemon threads', undefined, 'self.threads'),
]
const networkFields = [
  field('node_id', 'Reporting node'), time('activity_at', 'Sample time'), field('status', 'Host status'),
  field('inbound_bps', 'Inbound', 'rate_bps', 'events.tool.live.inbound_rate_bps'),
  field('outbound_bps', 'Outbound', 'rate_bps', 'events.tool.live.outbound_rate_bps'),
]
const number = (value: unknown) => finite(value) ? value : null
const fromMiB = (value: unknown) => finite(value) ? value * 1048576 : undefined

export default function Resources(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  const health = useHealth()
  return <HealthBody ctx={ctx} def={props.def} select={value => value.node_report ?? value.resources}>{data => {
    const cluster = () => data().resources?.cluster
    const rows = createMemo<(Record<string, unknown> & { node_id: string })[] | undefined>(() => {
      const report = data().node_report
      if (report) return report.rows.map(row => ({ ...row,
        memory_used_bytes: fromMiB(row.memory_used_mb), memory_total_bytes: fromMiB(row.memory_total_mb),
        active_sessions: row.status === 'reported' ? row.active_sessions : undefined,
        active_processes: row.status === 'reported' ? row.active_processes : undefined,
        inbound_bps: row.status === 'reported' ? row.inbound_bps : undefined,
        outbound_bps: row.status === 'reported' ? row.outbound_bps : undefined,
      }))
      const host = data().resources?.host
      if (!host) return
      const at = host.activity_at
      const status = !finite(at) || at <= 0 || at > data().generated_at + 60 ? 'unknown'
        : data().generated_at - at > 300 ? 'stale' : 'reported'
      return [{ ...host, captured_at: host.activity_at ?? host.checked_at, status,
        active_sessions: status === 'reported' ? host.active_sessions : undefined, active_processes: status === 'reported' ? host.active_processes : undefined,
        inbound_bps: status === 'reported' ? host.inbound_bps : undefined, outbound_bps: status === 'reported' ? host.outbound_bps : undefined,
        daemon: data().resources?.daemon, daemon_pid: data().pipeline?.self?.pid }]
    })
    const active = createMemo(() => rows()?.filter(row => row.status === 'reported'))
    const one = () => rows()?.length === 1 ? active()?.[0] : undefined
    const azureSample = (key: string) => cluster()?.samples?.[key]
    const azureMetric = (key: string) => {
      const sample = azureSample(key)
      return cluster()?.monitor_status !== 'stale' && finite(sample?.at) && finite(sample?.value)
        && sample.at >= health.now() - 1200 && sample.at <= health.now() + 60 ? sample.value : undefined
    }
    return <>
      <StatTiles items={[
        { label: 'Reporting hosts', value: active()?.length },
        { label: 'Active sessions', value: active()?.length ? totalOf(active()?.map(row => row.active_sessions)) : undefined },
        { label: 'Active processes', value: active()?.length ? totalOf(active()?.map(row => row.active_processes)) : undefined },
        { label: 'Recent read latency', value: number(data().store?.reads?.recent_avg_ms), unit: 'ms' },
      ]} />
      <Show when={ctx.scope() === 'fleet'} fallback={
        <div class={styles.meters}>
          <HealthMeter label="Host CPU" value={number(one()?.cpu_percent)} />
          <HealthMeter label="Host memory in use" value={percentOf(one()?.memory_used_bytes, one()?.memory_total_bytes)} />
        </div>
      }>
        <HealthComparison id="host-cpu" label="CPU by reporting host" unit="%"
          items={active()?.map(row => ({ id: row.node_id, label: nodeTag(row.node_id), title: nodeTitle(row.node_id), value: number(row.cpu_percent) }))} />
      </Show>
      <Show when={cluster()}>
        <div class={styles.meters}>
          <For each={[['Shared cluster CPU', 'cpu_percent'], ['Shared hot cache in use', 'cache_percent'],
            ['Shared ingestion utilization', 'ingestion_percent']] as const} keyed={([, key]) => key}>{item =>
            <Show when={azureMetric(item()[1]) !== undefined}><HealthMeter label={item()[0]} value={azureMetric(item()[1])} /></Show>}</For>
        </div>
        <Show when={['cpu_percent', 'cache_percent', 'ingestion_percent'].every(key => azureMetric(key) === undefined)}>
          <StatTiles items={[{ label: 'Shared cluster metrics', detail: 'no recent sample' }]} />
        </Show>
      </Show>
      <HealthTable ctx={ctx} label="Reported node runtime" fields={resourceFields} rows={rows()} rowId={row => row.node_id}
        empty="No nodes reported host measurements."
        action={ctx.scope() === 'fleet' ? {
          label: row => row.node_id === 'legacy' ? '' : `View ${nodeNoun(row.node_id)}`,
          run: row => ctx.navigate({ scope: 'node', node_id: row.node_id }),
        } : undefined} />
      <HealthTable ctx={ctx} label="Network traffic by node" fields={networkFields} rows={rows()} rowId={row => row.node_id}
        empty="No node traffic samples." />
      <Detail label="Shared cluster resources">
        <Show when={cluster()} fallback={<PanelState state="unavailable" inline />}>{value =>
          <Facts ctx={ctx} items={[
            fact('Cluster status', value().status), fact('Measurement source', value().source), date('Last measured', value().checked_at),
            fact('Last error', value().last_error), fact('Cluster nodes', value().native?.nodes), fact('Offline nodes', value().native?.offline_nodes),
            fact('Active ingestions', value().native?.ingestions), fact('Active merges', value().native?.merges),
            fact('Hot extent storage', value().native?.hot_extent_bytes, 'bytes'),
            ...[['CPU', 'cpu_percent'], ['Hot-cache utilization', 'cache_percent'], ['Ingestion utilization', 'ingestion_percent'],
              ['Streaming utilization', 'streaming_percent']].flatMap(([label, key]) => [
                fact(label, azureSample(key)?.value, 'percent'), date(`${label} measured`, azureSample(key)?.at),
              ]),
          ]} />
        }</Show>
      </Detail>
    </>
  }}</HealthBody>
}
