import { createMemo, createSignal, For, lazy, Show, untrack } from 'solid-js'
import type { BoardRange, BoardSeries } from '../../data/contract.gen'
import { fmtN } from '../../design/format'
import { Chart } from '../../ui/Chart'
import { Meter } from '../../ui/Meter'
import { PanelState } from '../../ui/PanelState'
import { Stat } from '../../ui/Stat'
import { at } from '../data'
import { keyedRows, presentation, rowAction } from '../kinds/model'
import type { PanelProps, Read } from '../types'
import { count, field, tokens } from './aFields'
import { messageBuckets } from './overviewMath'
import { measured, topRows, usable } from './Summary'
import styles from './AgentActivity.module.css'

type Bucket = ReturnType<typeof messageBuckets>[number]
const BucketTable = lazy(() => import('../../ui/Table').then(m => ({ default: m.Table<Bucket> })))
const date = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
const modelLimit = 4

function Messages(props: { range?: BoardRange; messages?: BoardSeries['messages']; panel: PanelProps }) {
  const [values, setValues] = createSignal(false)
  const fields = createMemo(() => props.panel.def.columns.map(column => ({ ...presentation(props.panel.ctx, column), id: column.path })))
  const series = createMemo(() => fields().map(({ label }) => ({ label })))
  const points = createMemo(() => messageBuckets(props.range, props.messages))
  const partial = () => props.range?.bucket_starts?.[props.range.partial_bucket ?? -1]
  const description = () => {
    const s = props.range?.bucket_s
    const duration = s && s > 0 ? s >= 3600 && s % 900 === 0 ? `${s / 3600} h` : s % 60 === 0 ? `${s / 60} min` : `${s} s` : 'Time'
    if (partial() == null) return `${duration} buckets`
    return `${duration} buckets · ${partial() === props.range?.bucket_starts.at(-1) ? 'Final bucket partial' : `Partial bucket at ${date.format(partial()! * 1000)}`}`
  }
  const available = () => points().some(p => p.values.some(v => v !== null))
  return <section class={styles.trend} aria-label="Message activity">
    <div class={styles.trendHead}>
      <h4>Message activity</h4>
      <Show when={available()}>
        <button type="button" class={styles.switch} onClick={() => setValues(!values())}>
          {values() ? 'Show message chart' : 'Show bucket values'}
        </button>
      </Show>
    </div>
    <Show when={available()} fallback={<p class={styles.note}>{props.range?.bucket_starts?.length === 0
      ? 'No time buckets in this range.' : 'Message counts by time are not available from this source.'}</p>}>
      <Show when={!values()} fallback={
        <BucketTable label="Message counts by bucket" pageSize={6} rows={points()} rowId={row => String(row.x)}
          fields={[{ id: 'bucket', label: 'Bucket start', read: row => row.x,
            format: value => `${date.format(Number(value) * 1000)}${value === partial() ? ' (partial)' : ''}` },
            ...fields().map(({ id, label, format }, i) => ({ id, label, format,
              numeric: true, read: (row: Bucket) => row.values[i] }))]} />
      }>
        <div class={styles.plot}><Chart label="Messages by role" description={description()}
          series={series()} points={points()} xAxis="time" /></div>
      </Show>
    </Show>
  </section>
}

export default function AgentActivity(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const [messages, range, models, population, kpis] = def.sources.map(source => createMemo(() => ctx.read(source)))
  // These are all fields of the same selected board result. A missing field must not hide its siblings.
  const history = createMemo(() => {
    const reads = [messages(), range(), models(), population(), kpis()]
    return reads.find(read => read.state === 'stale') ?? reads.find(usable) ?? reads.find(read => read.state === 'error') ?? reads[0]
  })
  const ranked = createMemo(() => {
    const read = models()
    if (!Array.isArray(read.value)) return
    return topRows(keyedRows(read, ['model']), 'tokens', ({ row }) => typeof row.model === 'string' ? row.model : '')
  })
  const metric = (read: Read, key: string) => measured(at(read.value, key))
  const modelFormat = () => presentation(ctx, tokens('tokens', 'Tokens')).format
  const window = () => range().value as BoardRange | undefined
  const period = () => {
    const v = window()
    if (v && Number.isFinite(v.since) && Number.isFinite(v.until) && v.until >= v.since) return date.formatRange(v.since * 1000, v.until * 1000)
  }
  const calls = () => metric(kpis(), 'tool_calls')
  const rate = () => metric(kpis(), 'fail_rate')
  return <Show when={usable(history())} fallback={
    <PanelState state={history().state as 'loading' | 'error' | 'unavailable'} message={history().message}
      onRetry={history().state === 'error' ? ctx.refresh : undefined} inline />
  }>
    <div class={styles.activity}>
      <div class={styles.context}>
        <span><strong>{metric(population(), 'shown_agents')?.toLocaleString() ?? 'N/A'}</strong> recorded agents
          {' · '}<strong>{metric(population(), 'shown_sessions')?.toLocaleString() ?? 'N/A'}</strong> sessions
          <Show when={period()}>{label => <span class={styles.period}>{label()}</span>}</Show></span>
        <Show when={history().state === 'stale'}>
          <PanelState state="stale" inline message="Recorded history is stale." updatedAt={history().updatedAt} />
        </Show>
      </div>
      <div class={styles.visuals}>
        <Messages range={window()} messages={messages().value as BoardSeries['messages'] | undefined} panel={props} />
        <section class={styles.ranking} aria-label="Tokens by model">
          <h4>Tokens by model</h4>
          <Show when={ranked()?.length} fallback={<p class={styles.note}>{ranked()?.length === 0
            ? 'No model usage reported.' : 'Model token counts are not available from this source.'}</p>}>
            <p class={styles.note}>Top {Math.min(modelLimit, ranked()!.length)} of {ranked()!.length} reported totals · Bars relative to largest</p>
            <ol class={styles.models}><For each={ranked()?.slice(0, modelLimit)} keyed={item => item.id}>{item => {
              const model = () => item().label
              const selected = () => ctx.filters().model === model()
              const action = () => rowAction(def, ctx, { model: model() })
              const name = () => `${selected() ? 'Clear filter for' : 'Filter by'} model ${model()}`
              return <li><Meter label={model() || 'Unreported model'} value={item().value} max={ranked()![0].value}
                display={fmtN(item().value)} exactDisplay={`${modelFormat()(item().value)} tokens`}
                labelContent={<Show when={action()} fallback="Unreported model">{command =>
                  <button type="button" class={styles.filter} aria-pressed={selected() ? 'true' : 'false'} aria-label={name()} title={name()}
                    onClick={() => command().run()}>{model()}</button>
                }</Show>} /></li>
            }}</For></ol>
            <p class={styles.note}>Select a model to filter. Select again to clear.</p>
          </Show>
        </section>
        <section class={styles.failures} aria-label="Tool call outcomes">
          <Stat label="Failed tool calls" value={metric(kpis(), 'failures')} tone={metric(kpis(), 'failures') ? 'warning' : 'neutral'}
            detail={calls() == null ? 'Total tool calls not reported' : `of ${presentation(ctx, count('tool_calls', 'Tool calls', 'board.kpi.tool_calls')).format(calls()!)} tool calls`} />
          <Meter label="Failure rate" value={rate()} max={1} tone={rate() ? 'warning' : 'neutral'}
            display={rate() == null ? undefined : presentation(ctx, field('fail_rate', 'Failure rate', 'board.kpi.fail_rate')).format(rate()!)} />
        </section>
      </div>
    </div>
  </Show>
}
