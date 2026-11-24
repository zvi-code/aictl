import { createMemo, createSignal, untrack } from 'solid-js'
import { at, object } from '../data'
import { keyedRows } from '../kinds/model'
import type { VisualRowOptions } from '../kinds/Rows'
import type { PanelProps, Read } from '../types'
import { Choice, Measures } from './aControls'
import { cost, count, field, tokens } from './aFields'
import { fmtN } from '../../design/format'
import { knownSum, leftOutText, rankedSeries } from './overviewMath'
import { promptSummary } from './RowSummaries'
import { copilotBilledText } from './copilotCost'
import css from './overviewA.module.css'

// The model first: a split by tool sets one front end of the same assistant against another.
const splits = [['model', 'Model'], ['project', 'Project'], ['tool', 'Tool']] as const
export function costOptions({ ctx, def }: PanelProps) {
  const [split, setSplit] = createSignal<typeof splits[number][0]>('model')
  const base = createMemo(() => ctx.read(def.sources[0]))
  const entries = createMemo(() => rankedSeries(object(at(base().value, `by_${split()}`))))
  const columns = createMemo(() => {
    const labels = split() === 'tool' ? ctx.board('tool_labels') : undefined
    return entries().map(({ key, label }, index) => field(String(index), labels?.[key] ?? label, 'board.series.cost'))
  })
  const read = (): Read => {
    if (base().state !== 'ready' && base().state !== 'stale') return base()
    if (!object(at(base().value, `by_${split()}`))) return { state: 'unavailable' }
    return { ...base(), value: Object.fromEntries(entries().map(({ values }, i) => [i, values])) }
  }
  const credits = () => ctx.board('credits')
  const unpriced = () => ctx.board('unpriced')
  return { read, columns,
    controls: <Choice label="Split cost by" items={splits} value={split} change={setSplit} />,
    summary: <><Measures ctx={ctx} items={[
      { field: cost('cost_usd', 'List price'), value: ctx.board('kpis')?.cost_usd, detail: 'Not a bill' },
      { field: field('tokens', 'Unpriced tokens', 'board.unpriced'), value: unpriced()?.tokens,
        detail: leftOutText(unpriced()?.models ?? [], fmtN)?.replace(/^excludes /, '') },
      { field: count('amount', 'Copilot credits', 'board.credits'), value: credits()?.amount,
        detail: copilotBilledText(credits()) ?? (credits()?.approximate ? 'Whole days' : undefined) },
    ]} /></>,
  }
}

const ratio = (value: number | null | undefined, denominator: number | null | undefined) =>
  value != null && denominator != null && denominator > 0 ? value / denominator : undefined
export function messagesOptions({ ctx }: PanelProps) {
  const kpis = () => ctx.board('kpis')
  const turns = () => knownSum(ctx.board('series')?.messages?.user ?? [])
  return { summary: <Measures ctx={ctx} items={[
    { field: count('per_agent', 'Messages per agent'), value: ratio(kpis()?.messages, ctx.board('scope')?.shown_agents) },
    { field: count('per_turn', 'Tool calls per turn', 'board.kpi.tool_calls'), value: ratio(kpis()?.tool_calls, turns()) },
    { field: tokens('per_message', 'Tokens per message'), value: ratio(kpis()?.tokens, kpis()?.messages) },
  ]} /> }
}

export function promptOptions(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = createMemo(() => ctx.read(def.sources[0]))
  const captured = () => ctx.board('capture_mode') === 'metadata'
  const rows = createMemo(() => keyedRows(result(), ['id', 'session_id', 'agent_id']).map(entry => ({
    ...entry, row: { ...entry.row, text: entry.row.text || (captured() ? 'Text not stored in metadata mode' : undefined) },
  })))
  return { result, rows, summary: promptSummary(props) } satisfies VisualRowOptions
}

export const skillOptions = ({ ctx, def }: PanelProps) => ({
  result: () => ctx.read(def.sources[0]),
  description: <p class={css.note}>Turn tokens can overlap when several skills ran in the same turn. Do not add them together.</p>,
})
