import { createMemo, For, Show, untrack } from 'solid-js'
import { Stat } from '../../ui/Stat'
import type { BoardKpis } from '../../data/contract.gen'
import { fmtMs, sparkPath } from '../../design/format'
import { at } from '../data'
import type { PanelProps } from '../types'
import { presentation, scalar } from '../kinds/model'
import { States } from '../kinds/States'
import { monitoredReport } from './monitoredReport'
import { runtimeSummary } from '../../data/runtimeAgents'
import { runningDetail, unlinkedText } from './agentTree'
import { previousText } from './kpiCompare'
import styles from '../kinds/kinds.module.css'

const metrics = [
  ['running', 'Agents running', 'agents', 'running'],
  ['messages', 'Messages', 'usage', 'messages'],
  ['tokens', 'Tokens', 'usage', 'tokens'],
  ['cached_share', 'Cached', 'usage', 'cached'],
  ['cost_usd', 'Cost (not a bill)', 'usage', 'cost'],
  ['tool_calls', 'Tool calls', 'tools', 'tool_calls'],
  ['failures', 'Failures', 'tools', 'failures'],
  ['p95_ms', 'p95 reply', 'tools', 'p95'],
  ['loops', 'Loops', 'tools', 'loops'],
] as const
/** The tiles the board reads a previous period for. */
const comparable = new Set<string>(['messages', 'tokens', 'cost_usd', 'tool_calls'])

function Spark(props: { values: readonly (number | null)[] }) {
  const path = createMemo(() => sparkPath(props.values, 60, 18))
  return <svg class={styles.spark} viewBox="0 0 60 18" preserveAspectRatio="none" aria-hidden="true">
    <path d={path() ?? undefined} stroke="currentColor" fill="none" vector-effect="non-scaling-stroke" />
  </svg>
}

export default function Kpis(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  const history = createMemo(() => ctx.read({ field: 'kpis' }))
  const data = () => history().value as BoardKpis | undefined
  const report = monitoredReport(ctx)
  const runtime = createMemo(() => {
    if (ctx.scope() !== 'local') return
    const index = ctx.client.store.topic('runtime.agent')
    if (!index) return
    return runtimeSummary([...index.values()], ctx.tools())
  })
  const monitored = createMemo(() => {
    if (ctx.scope() !== 'local') return report()
    return runtime() ? { count: runtime()!.sessions, hosts: 1 } : undefined
  })
  const format = (key: string, value: unknown) => {
    const item = scalar(value)
    if (item == null) return null
    if (typeof item === 'number' && (key === 'p95_ms' || key === 'p50_ms')) return fmtMs(item)
    return presentation(ctx, { path: key, datapoint: `board.kpi.${key}` }).format(item)
  }
  return <>
    <Show when={history().state === 'loading' || history().state === 'error' || history().state === 'unavailable'}>
      <Stat label="Sessions live now" value={monitored()?.count} detail="Independent of the selected history range." />
    </Show>
    <States result={history} retry={ctx.refresh} reserveStaleSpace>
      <div class={`${styles.stats} ${styles.kpiStats}`}>
        <Stat label="Sessions live now" value={monitored()?.count}
          detail={ctx.scope() === 'local' ? [ctx.paused() ? 'Last received runtime data' : 'Live runtime, independent of filters',
            runtime()?.unlinked ? unlinkedText(runtime()!.unlinked) : ''].filter(Boolean).join(' · ') :
            monitored() ? `${monitored()!.hosts} reporting ${monitored()!.hosts === 1 ? 'node' : 'nodes'}` : 'No fresh monitor report'} />
        <For each={metrics}>{([key, label, section, spark]) => {
        const detail = () => {
          const compared = comparable.has(key) ? previousText(data()?.prev, at(data()?.prev, key), data()?.[key]) : undefined
          if (compared) return <span title={compared.title}>{compared.text}</span>
          if (key === 'running') return runningDetail(runtime(), data() as Parameters<typeof runningDetail>[1])
          if (key === 'failures') return format('fail_rate', data()?.fail_rate)
          if (key === 'p95_ms') return `p50: ${format('p50_ms', data()?.p50_ms) ?? 'Not available from this source'}`
          if (key === 'cached_share') {
            const read = ctx.board('by_model')?.flatMap(row => row.cache_read == null ? [] : [row.cache_read])
            if (read?.length) return `${format('tokens', read.reduce((sum, n) => sum + n, 0))} read`
          }
          return null
        }
        return <a href={`#sec-${section}`} onClick={event => { event.preventDefault(); ctx.jump(section) }}>
          <Stat label={label} value={format(key, (key === 'running' ? runtime()?.running : undefined) ?? data()?.[key])}
            detail={<div class={styles.kpiDetail}>
              <span>{detail()}</span><Spark values={data()?.spark?.[spark] ?? []} />
            </div>} />
        </a>
      }}</For></div>
    </States>
  </>
}
