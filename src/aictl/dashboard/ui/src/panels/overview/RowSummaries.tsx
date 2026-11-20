import { createMemo } from 'solid-js'
import { presentation } from '../kinds/model'
import type { VisualRowOptions } from '../kinds/Rows'
import type { PanelProps } from '../types'
import { cost, tokens } from './aFields'
import { Bars, bins, DailySummary, FieldStats, fileName, measured, StatStrip, sum, topRows } from './Summary'

type Summary = NonNullable<VisualRowOptions['summary']>

export const attentionOptions = ({ ctx, def }: PanelProps): VisualRowOptions => ({
  result: () => ctx.read(def.sources[0]),
  summary: rows => {
    const kinds = createMemo(() => rows() && bins(rows()!.map(({ row }) => row.kind === 'wait' ? 'waiting' : row.kind),
      id => ({ waiting: 'Waiting', loop: 'Loop' })[id] ?? id,
      id => id === 'waiting' ? 'warning' : id === 'loop' ? 'danger' : 'neutral'))
    return <>
      <FieldStats label="Attention summary" ctx={ctx} columns={[
        { path: 'count', label: 'Needs attention' }, tokens('tokens', 'Tokens'), cost('cost_usd', 'Listed cost'),
      ]} value={{ count: rows()?.length, tokens: sum(rows(), 'tokens'), cost_usd: sum(rows(), 'cost_usd') }} />
      <Bars label="Attention by kind" items={kinds()} max={rows()?.length} />
    </>
  },
})

export const promptSummary = ({ ctx }: PanelProps): Summary => rows => <>
  <FieldStats label="Prompt summary" ctx={ctx} columns={[
    { path: 'retained', label: 'Listed prompts', datapoint: 'board.prompt.total' },
    { path: 'total', label: 'Total prompts', datapoint: 'board.prompt.total' },
    tokens('tokens', 'Listed prompt tokens'),
  ]} value={{ retained: rows()?.length, total: measured(ctx.read({ field: 'prompts_total' }).value), tokens: sum(rows(), 'tokens') }} />
  <DailySummary label="Listed prompts by day" rows={rows()} path="ts" />
</>

export const projectPromptSummary = ({ ctx, def }: PanelProps): Summary => rows => {
  const top = createMemo(() => topRows(rows(), 'uses', ({ row }) => fileName(row.file)))
  const format = () => presentation(ctx, def.columns[2]).format
  return <>
    <FieldStats label="Project prompt summary" ctx={ctx} columns={[
      { path: 'files', label: 'File references' }, def.columns[2],
    ]} value={{ files: rows()?.length, uses: sum(rows(), 'uses') }} />
    <Bars label="Top prompt files by uses" items={top()} format={format()} />
  </>
}

export const workflowSummary: Summary = rows => {
  const types = createMemo(() => rows() && bins(rows()!.map(({ row }) => row.type)))
  return <>
    <StatStrip label="Workflow summary" items={[{ label: 'Matching items', value: rows()?.length }]} />
    <Bars label="Items by type" items={types()} max={rows()?.length} />
  </>
}

export const loopOptions = ({ ctx, def }: PanelProps): VisualRowOptions => ({
  result: () => ctx.read(def.sources[0]),
  summary: rows => <>
    <FieldStats label="Loop summary" ctx={ctx} columns={[
      { path: 'count', label: 'Loops' }, ...def.columns.slice(3, 6),
    ]} value={{ count: rows()?.length, repeats: sum(rows(), 'repeats'),
      tokens: sum(rows(), 'tokens'), cost_usd: sum(rows(), 'cost_usd') }} />
    <DailySummary label="Listed loops by start day" rows={rows()} path="since_ts" />
  </>,
})
