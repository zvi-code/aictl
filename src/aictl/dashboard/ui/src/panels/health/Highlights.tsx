import { createMemo, For, Show } from 'solid-js'
import type { PanelProps } from '../types'
import { finite, healthStatus, text } from './healthModel'
import { healthNodePath } from './scopedHealth'
import { date, Detail, fact, Facts, HealthBody } from './HealthParts'
import { Meter } from '../../ui/Meter'
import { StatTiles, percentOf, perMinute } from './HealthVisuals'
import { useHealth } from './healthData'
import styles from './Health.module.css'

export function storeLinks(cluster: unknown, database: unknown) {
  if (typeof cluster !== 'string') return []
  try {
    const url = new URL(cluster)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return []
    const links = [{ label: 'Open Kusto cluster', href: url.href }]
    if (typeof database === 'string' && database && database !== '.' && database !== '..') {
      const explorer = new URL('/' + encodeURIComponent(database), url)
      explorer.searchParams.set('web', '1')
      links.push({ label: 'Open Kusto Explorer', href: explorer.href })
      explorer.searchParams.set('query', '.show capacity ingestions')
      explorer.searchParams.set('autorun', 'false')
      links.push({ label: 'Cluster capacity query', href: explorer.href })
    }
    return links
  } catch { return [] }
}

export function StoreLinks(props: { cluster: unknown; database: unknown }) {
  const links = createMemo(() => storeLinks(props.cluster, props.database))
  return <Show when={links().length}><nav aria-label="Store links" class={styles.links}>
    <For each={links()} keyed={link => link.label}>{link => <a href={link().href}>{link().label}</a>}</For>
  </nav></Show>
}

export default function Highlights(props: PanelProps) {
  const health = useHealth()
  return <HealthBody ctx={props.ctx}>{data => {
    const status = createMemo(() => healthStatus(data(), null, health.now()))
    const store = () => data().store
    const report = () => data().node_report
    return <>
      <StatTiles items={[
        { label: 'Health status', value: status().label, tone: status().issues.length ? 'warning' : 'neutral' },
        { label: 'Actionable issues', value: status().issues.length, tone: status().issues.length ? 'warning' : 'positive' },
        { label: 'Read requests/min', value: perMinute(store()?.reads?.rate_per_s) },
        props.ctx.scope() === 'fleet'
          ? { label: 'Daemons with query CPU', value: data().queryCpuByNode?.filter(row => finite(row.total_cpu_s)).length }
          : { label: 'Kusto query CPU', unit: 's', detail: 'Since client start',
            value: report() ? data().queryCpuByNode?.[0]?.total_cpu_s : store()?.query_cpu?.total_cpu_s },
      ]} />
      <Facts ctx={props.ctx} items={[
        date('Health updated', data().generated_at || undefined),
      ]} />
      <Show when={report()}>{node => <>
          <Meter label={`Client counters: ${node().contributors.length} of ${node().rows.length} nodes`}
            value={percentOf(node().contributors.length, node().rows.length)} />
          <nav aria-label="Node measurements" class={styles.links}>
            <Show when={healthNodePath(props.ctx.scope(), props.ctx.nodeId())}><a href={healthNodePath(props.ctx.scope(), props.ctx.nodeId())}>Node measurements</a></Show>
            <Show when={node().localNode && node().contributors.includes(node().localNode!)}><a href={healthNodePath('local')}>Serving-node counters</a></Show>
          </nav></>}
      </Show>
      <Detail label="Scope and source">
        <Facts ctx={props.ctx} items={[
          fact('Store destination', text(store()?.destination) ?? text(store()?.cluster_url)),
          fact('Database', store()?.database),
          fact('Counter scope', report() ? 'Selected reporting daemons' : 'Local daemon'),
          fact('Capacity scope', 'Shared cluster'),
        ]} />
        <StoreLinks cluster={store()?.cluster_url} database={store()?.database} />
      </Detail>
    </>
  }}</HealthBody>
}
