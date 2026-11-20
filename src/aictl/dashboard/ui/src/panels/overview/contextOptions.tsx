import { createMemo, createSignal, lazy, untrack } from 'solid-js'
import type { ContextLocal } from '../../data/contract.gen'
import { keyedRows } from '../kinds/model'
import type { VisualRowOptions } from '../kinds/Rows'
import type { KeyedRow, PanelProps, Read, Row } from '../types'
import { Choice, Measures } from './aControls'
import { cost, count, field, tokens } from './aFields'
import { useContext } from './contextData'
import { dailyValues, knownSum, type DailyMetric } from './overviewMath'
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
export function budgetOptions({ ctx }: PanelProps) {
  const context = useContext(ctx)
  const result = createMemo(() => context.rows<ToolBudget>('budget.tools'))
  const rows = createMemo(() => keyedRows(result(), ['tool']).flatMap(entry => {
    const tool = entry.row as ToolBudget & { node_id?: string }
    const children: KeyedRow[] = (Array.isArray(tool.projects) ? tool.projects : []).map(project => ({
      id: JSON.stringify([entry.id, project.project]), parent: entry.id,
      row: { ...project, label: project.project, model: tool.model, window: tool.window,
        always_share: typeof tool.window === 'number' && tool.window > 0 && project.always != null ? project.always / tool.window : undefined,
        max_potential: project.estimate, potential_share: project.share, node_id: tool.node_id },
    }))
    return [{ ...entry, folded: children.length ? true : undefined, row: { ...tool, label: tool.label ?? tool.tool,
      policy: tool.window_assumed ? 'Window assumed' : tool.window != null ? tool.model_from : undefined } }, ...children]
  }))
  return { rows, result, retry: context.retry, description: <p class={css.note}>
    {ctx.scope() === 'local'
      ? 'File token estimates. Always loaded includes global files and the largest project. It excludes the system prompt and conversation.'
      : 'Reported host-wide files with a known loading policy only. These estimates are not project or session budgets.'}
  </p> }
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
  return {
    axis, read: result, retry: context.retry,
    columns: () => models().map(({ label }, i) => field(String(i), label,
      metric() === 'cost_usd' ? 'board.series.cost' : metric() === 'requests' ? 'board.kpi.messages' : 'board.context.daily_row')),
    controls: <Choice label="Daily usage measure" items={dailyChoices} value={metric} change={setMetric} />,
    summary: <><p class={css.note}>Last seven days. The board time range does not apply.</p>
      <Measures ctx={ctx} items={[
        { field: tokens('tokens', 'Tokens'), value: total('tokens') },
        { field: count('requests', 'Calls'), value: total('requests') },
        { field: cost(), value: total('cost_usd') },
      ]} /></>,
    table: () => <RowTable panel={props} label="Daily usage by model data" rows={rows()} />,
  }
}
