import { createMemo, For, untrack } from 'solid-js'
import type { DetailAgent, DetailSamples } from '../data/contract.gen'
import { fmtN } from '../design/format'
import { buckets } from './overviewModel'
import { path, Resource, Series, Stats, type TabProps } from './shared'

const metrics = [
  { id: 'process.cpu.utilization', label: 'CPU', unit: '%', scale: 100, sum: false },
  { id: 'process.memory.usage', label: 'Memory', unit: 'MB', scale: 1 / 1048576, sum: false },
  { id: 'process.network.io', label: 'Network', unit: 'B', scale: 1, sum: true },
] as const

function Trend(props: { tab: TabProps; bounds: readonly [number, number]; metric: typeof metrics[number] }) {
  const ctx = untrack(() => props.tab.shell.ctx)
  const start = () => props.bounds[0]
  const end = () => props.bounds[1]
  const query = () => ({ metric: props.metric.id, since: start(), limit: 1000 })
  const session = ctx.detail<DetailSamples>(createMemo(() => ctx.scope() === 'local' && props.tab.session()
    ? path(ctx, '/api/samples', { ...query(), 'tag.session_id': props.tab.session() }) : undefined))
  const tool = ctx.detail<DetailSamples>(createMemo(() => session()?.status === 'ready' && !session()?.data?.some(row => row.ts <= end()) && props.tab.agent()?.tool ?
    path(ctx, '/api/samples', { ...query(), 'tag.aictl.tool': props.tab.agent()?.tool }) : undefined))
  const read = Object.assign(createMemo(() => tool() ?? session()), { retry: () => (tool() ? tool : session).retry() })
  return <Resource read={read}>{rows => {
    const label = () => `${props.metric.label}${tool() ? ' (tool, not session)' : ''}`
    const chart = createMemo(() => buckets(rows().map(row => ({ ts: row.ts, value: row.value == null ? null : row.value * props.metric.scale })),
      start(), end(), props.metric.sum))
    const points = () => chart().values.filter((value): value is number => value != null)
    return <div>
      <Stats items={[{ label: `${label()} peak`, value: points().length ? fmtN(Math.max(...points())) : undefined, unit: props.metric.unit }]} />
      <Series label={label()} time x={chart().starts} values={chart().values} unit={props.metric.unit} />
    </div>
  }}</Resource>
}

export function ResourceCharts(props: { tab: TabProps; data: DetailAgent; bounds: readonly [number, number] }) {
  const rate = createMemo(() => buckets(props.data.turns.map(turn => ({
    ts: turn.ts, value: turn.input == null && turn.output == null ? null : (turn.input ?? 0) + (turn.output ?? 0),
  })), ...props.bounds, true))
  return <>
    <For each={metrics}>{metric => <Trend tab={props.tab} bounds={props.bounds} metric={metric} />}</For>
    <Series label="Tokens per minute" time x={rate().starts}
      values={rate().values.map(value => value == null ? null : value * 60 / rate().step)} />
  </>
}
