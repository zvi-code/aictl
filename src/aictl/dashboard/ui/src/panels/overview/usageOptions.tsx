import { createMemo, untrack } from 'solid-js'
import { keyedRows } from '../kinds/model'
import type { VisualRowOptions } from '../kinds/Rows'
import type { PanelProps } from '../types'
import { Measures } from './aControls'
import { cost, count, field, tokens } from './aFields'
import { fmtN } from '../../design/format'
import { knownSum, leftOutText } from './overviewMath'
import { usageSplit } from './usageSplit'
import { promptSummary } from './RowSummaries'
import { copilotBilledText } from './copilotCost'
import css from './overviewA.module.css'

// The model first: a split by tool sets one front end of the same assistant against another.
export function costOptions({ ctx, def }: PanelProps) {
  const { read, columns, controls } = usageSplit(ctx, { source: def.sources[0], measure: 'cost',
    datapoint: 'board.series.cost', label: 'Split cost by' })
  const credits = () => ctx.board('credits')
  const unpriced = () => ctx.board('unpriced')
  return { read, columns, controls,
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
/** Messages per group are the model requests: a prompt or a tool call is not made by a model. The roles
 * (user, assistant, tool) stay the last choice. */
export function messagesOptions({ ctx, def }: PanelProps) {
  const kpis = () => ctx.board('kpis')
  const turns = () => knownSum(ctx.board('series')?.messages?.user ?? [])
  const { read, columns, controls } = usageSplit(ctx, { source: def.sources[1], measure: 'requests',
    datapoint: 'board.series.messages', label: 'Split messages by',
    fallback: { id: 'role', name: 'Role', read: () => ctx.read(def.sources[0]), columns: () => def.columns } })
  return { read, columns, controls, summary: <Measures ctx={ctx} items={[
    { field: count('per_agent', 'Messages per agent'), value: ratio(kpis()?.messages, ctx.board('scope')?.shown_agents) },
    { field: count('per_turn', 'Tool calls per turn', 'board.kpi.tool_calls'), value: ratio(kpis()?.tool_calls, turns()) },
    { field: tokens('per_message', 'Tokens per message'), value: ratio(kpis()?.tokens, kpis()?.messages) },
  ]} /> }
}

/** Tokens per group, or by kind (cache read, input, cache write, output) as the last choice. */
export function tokenOptions({ ctx, def }: PanelProps) {
  return usageSplit(ctx, { source: def.sources[1], measure: 'tokens', datapoint: 'board.kpi.tokens',
    label: 'Split tokens by',
    fallback: { id: 'kind', name: 'Kind', read: () => ctx.read(def.sources[0]), columns: () => def.columns } })
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
