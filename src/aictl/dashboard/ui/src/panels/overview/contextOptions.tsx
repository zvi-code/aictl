import { createMemo, createSignal, lazy, Show, untrack } from 'solid-js'
import type { ContextLocal } from '../../data/contract.gen'
import { keyedRows } from '../kinds/model'
import type { VisualRowOptions } from '../kinds/Rows'
import type { KeyedRow, PanelProps, Read, Row } from '../types'
import { Choice, Measures } from './aControls'
import { cost, count, field, tokens } from './aFields'
import { useContext } from './contextData'
import { dailyValues, knownSum, pricedCost, type DailyMetric } from './overviewMath'
import { fmtN } from '../../design/format'
import { workflowSummary } from './RowSummaries'
import css from './overviewA.module.css'

const RowTable = lazy(() => import('../kinds/Rows').then(module => ({ default: module.RowTable })))

const workflowTypes = [['all', 'All'], ['workflow', 'Workflows'], ['prompt', 'Prompt files']] as const
export function workflowOptions({ ctx, def }: PanelProps) {
  const [type, setType] = createSignal<typeof workflowTypes[number][0]>('all')
  const context = useContext(ctx)
  const read = createMemo(() => context.rows<Row>('workflows'))
  const result = () => {
    const state = read(), mode = type()
    if (!state.value || mode === 'all') return state
    const value = state.value.filter(row => row.type === mode)
    return { ...state, value }
  }
  return { result, empty: () => def.empty, retry: context.retry,
    summary: workflowSummary, controls: <Choice label="Show workflow items" items={workflowTypes} value={type} change={setType} />,
    description: <p class={css.note}>{ctx.scope() === 'local' ? 'Open a file to read its text.' : 'Recorded metadata only. File text is available on This node.'}</p>,
  } satisfies VisualRowOptions
}

type ToolBudget = ContextLocal['budget']['tools'][number]
/** A tool with no token in any file it loads into the model says nothing in the budget. */
export const budgetSays = (tool: Pick<ToolBudget, 'always' | 'on_demand' | 'conditional'>) =>
  tool.always > 0 || tool.on_demand > 0 || tool.conditional > 0

/** One line: the tools left out of the budget, and the shown tools whose share cannot be given. */
export function budgetNote(tools: readonly Pick<ToolBudget, 'label' | 'tool' | 'always' | 'on_demand' | 'conditional' | 'window' | 'model'>[],
  hostWide = false) {
  const names = (list: typeof tools) => [...new Set(list.map(tool => tool.label || tool.tool))].join(', ')
  const left = tools.filter(tool => !budgetSays(tool))
  const unlimited = tools.filter(tool => budgetSays(tool) && tool.window == null)
  return [
    left.length ? `Not shown: ${names(left)} (no ${hostWide ? 'host-wide ' : ''}file they load into the model was reported).` : '',
    unlimited.length ? `No share for ${names(unlimited)}: no context limit is known for ${
      [...new Set(unlimited.map(tool => tool.model ?? 'an unreported model'))].join(', ')}.` : '',
  ].filter(Boolean).join(' ') || undefined
}

export function budgetOptions({ ctx }: PanelProps) {
  const context = useContext(ctx)
  const all = createMemo(() => context.rows<ToolBudget>('budget.tools'))
  const result = createMemo(() => {
    const state = all()
    return state.value ? { ...state, value: state.value.filter(budgetSays) } : state
  })
  const note = createMemo(() => budgetNote(all().value ?? [], ctx.scope() !== 'local'))
  const rows = createMemo(() => keyedRows(result(), ['tool']).flatMap(entry => {
    const tool = entry.row as ToolBudget & { node_id?: string }
    const children: KeyedRow[] = (Array.isArray(tool.projects) ? tool.projects : []).map(project => ({
      id: JSON.stringify([entry.id, project.project]), parent: entry.id,
      row: { ...project, label: project.project, model: tool.model, window: tool.window,
        always_share: typeof tool.window === 'number' && tool.window > 0 && project.always != null ? project.always / tool.window : undefined,
        max_potential: project.estimate, potential_share: project.share, node_id: tool.node_id },
    }))
    return [{ ...entry, folded: children.length ? true : undefined, row: { ...tool, label: tool.label ?? tool.tool,
      // The limit is never assumed: with none known the row says why; the models the calls used follow.
      policy: [tool.window != null ? tool.model_from : tool.window_note,
        tool.models_observed?.length ? `observed: ${tool.models_observed.map(item =>
          `${item.model} (${item.window != null ? `${fmtN(item.window)} limit` : 'limit not known'})`).join(', ')}` : undefined,
      ].filter(Boolean).join(' · ') || undefined } }, ...children]
  }))
  return { rows, result, retry: context.retry, description: <>
    <p class={css.note}>
      {ctx.scope() === 'local'
        ? 'File token estimates. Always loaded includes global files and the largest project. It excludes the system prompt and conversation.'
        : 'Reported host-wide files with a known loading policy only. These estimates are not project or session budgets.'}
    </p>
    <Show when={note()}>{text => <p class={css.note}>{text()}</p>}</Show>
  </> }
}

const dailyChoices = [['tokens', 'Tokens'], ['cost_usd', 'Cost'], ['requests', 'Calls']] as const
type DailyRow = ContextLocal['daily']['rows'][number]
export function dailyOptions(props: PanelProps) {
  const { ctx } = untrack(() => props)
  const [metric, setMetric] = createSignal<DailyMetric>('tokens')
  const context = useContext(ctx)
  const read = createMemo(() => context.rows<DailyRow>('daily.rows'))
  const days = createMemo(() => [...new Set(context.nodes()?.flatMap(node => node.daily?.days ?? []))].sort())
  const models = createMemo(() => dailyValues(days(), read().value ?? [], metric()))
  const axis = () => context.read(context.nodes()?.some(node => Array.isArray(node.daily?.days)) || context.nodes()?.length === 0
    ? days().map(day => Date.parse(`${day}T00:00:00Z`) / 1000) : undefined)
  const result = (): Read => {
    const state = read()
    const problems = context.nodes()?.flatMap(node => node.daily?.error ? [node.daily.error] : []) ?? []
    const incomplete = context.nodes()?.some(node => node.daily?.incomplete || node.daily?.available === false)
    if (!state.value?.length && problems.length) return { state: 'error', message: problems.join(' · ') }
    if (!state.value?.length && incomplete) return { state: 'unavailable', message: 'Daily usage is not available from this source.' }
    if (state.state !== 'ready' && state.state !== 'stale') return state
    const value = Object.fromEntries(models().map(({ values }, i) => [i, values]))
    return incomplete || problems.length ? { state: 'stale', value, message: problems.join(' · ') || 'Daily usage is incomplete.' } : { ...state, value }
  }
  const rows = createMemo(() => keyedRows(read(), ['date', 'model']))
  const total = (key: DailyMetric) => context.nodes()?.some(node => !node.daily || node.daily.incomplete || node.daily.available === false)
    ? undefined : knownSum(read().value?.map(row => row[key]) ?? [])
  const priced = createMemo(() => context.nodes()?.some(node => !node.daily || node.daily.incomplete || node.daily.available === false)
    ? { cost: undefined, unpriced: [] } : pricedCost(read().value ?? []))
  return {
    axis, read: result, retry: context.retry,
    columns: () => models().map(({ label }, i) => field(String(i), label,
      metric() === 'cost_usd' ? 'board.series.cost' : metric() === 'requests' ? 'board.kpi.messages' : 'board.context.daily_row')),
    controls: <Choice label="Daily usage measure" items={dailyChoices} value={metric} change={setMetric} />,
    summary: <><p class={css.note}>Last seven days. The board time range does not apply.</p>
      <Measures ctx={ctx} items={[
        { field: tokens('tokens', 'Tokens'), value: total('tokens') },
        { field: count('requests', 'Calls'), value: total('requests') },
        { field: cost(), value: priced().cost, detail: priced().unpriced.length
          ? `excludes ${priced().unpriced.map(item => `${item.model} (${fmtN(item.tokens)} tokens)`).join(', ')}: no list price`
          : undefined },
      ]} /></>,
    table: () => <RowTable panel={props} label="Daily usage by model data" rows={rows()} />,
  }
}
