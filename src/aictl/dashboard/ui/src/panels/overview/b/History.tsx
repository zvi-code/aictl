import { createMemo, For, Show, untrack } from 'solid-js'
import type { BoardConfirms, BoardErrors, BoardTools } from '../../../data/contract.gen'
import { at } from '../../data'
import Series from '../../kinds/Series'
import type { PanelDef, PanelProps } from '../../types'
import { breakdown, field, metric, stamp } from '../b'
import { Bars, FieldStats, fileName, measured, StatStrip, topRows, usable } from '../Summary'
import { DataTable, displayField, entries, identity, Metrics, number, rowsFrom, styles, text, View } from './View'
import { fmtN } from '../../../design/format'

export const OUTSIDE_PROJECTS = 'Outside any project'

export function ToolCalls(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = () => ctx.read(def.sources[0])
  const total = () => number(ctx.read(def.sources[1]).value)
  const rows = createMemo(() => entries(result(), ['name']).map(entry => ({
    ...entry, row: { ...entry.row, mcp_server: entry.row.mcp_server === '' ? 'Unknown server' : entry.row.mcp_server,
      trend: Array.isArray(entry.row.trend)
      ? entry.row.trend.map(value => number(value) ?? 'Not available').join(', ') : undefined },
  })))
  const unnamed = () => {
    const calls = total()
    const tools = result().value as BoardTools | undefined
    if (calls == null || !Array.isArray(tools) || tools.some(tool => number(tool.calls) == null)) return
    return Math.max(0, calls - tools.reduce((sum, tool) => sum + tool.calls, 0))
  }
  const state = () => result().state === 'empty' && (unnamed() ?? 0) > 0 ? { state: 'ready' } as const : result()
  return <View result={state} retry={ctx.refresh} empty={def.empty}>
    <Metrics ctx={ctx} columns={[
      metric('total', 'board.kpi.tool_calls', 'Total calls'), metric('unnamed', 'board.kpi.tool_calls', 'Calls without a tool name'),
    ]} value={{ total: total(), unnamed: unnamed() }} />
    <Show when={rows().length} fallback={<p>No named tool calls in this time.</p>}>
      <DataTable ctx={ctx} label={def.title} columns={def.columns} rows={rows()} action={{
        label: ({ row }) => `Open tool ${row.name}`,
        run: ({ row }) => { const name = text(row.name); if (name) ctx.openDetail({ type: 'tool', name }) },
      }} />
    </Show>
  </View>
}

const pendingColumns = [field('name', 'Tool'), field('target', 'Target'), stamp('since_ts', 'Waiting since')]
const confirmTotals = [
  metric('asked', 'board.confirm.row', 'Asked you'),
  metric('auto', 'board.confirm.row', 'Auto approved'),
  metric('approved', 'board.confirm.row', 'You approved'),
  metric('denied', 'board.confirm.row', 'You denied'),
  metric('blocked', 'board.confirm.row', 'Blocked by a rule'),
  // Calls whose stored row carries no permission decision: with it the parts add up to the tool calls.
  metric('not_reported', 'board.confirm.row', 'Confirmation not reported'),
  field('p95_wait_s', 'p95 wait (s)'),
]

export function Confirmations(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = () => ctx.read(def.sources[0])
  const data = () => result().value as BoardConfirms | undefined
  const pending = createMemo(() => rowsFrom((data()?.pending ?? []).filter(item => !ctx.stopped(item.agent_id)),
    row => identity(row.agent_id, row.name, row.since_ts, row.target)))
  const tools = createMemo(() => rowsFrom(data()?.by_tool ?? [], row => identity(row.name)))
  const outcomes = confirmTotals.slice(1, 6)
  const total = () => {
    const values = outcomes.map(({ path }) => number(at(data(), path)))
    return values.every(value => value != null) ? values.reduce<number>((sum, value) => sum + value!, 0) : undefined
  }
  return <View result={result} retry={ctx.refresh} empty={def.empty}>
    <Metrics ctx={ctx} columns={confirmTotals} value={data()} />
    <Show when={(total() ?? 0) > 0}>
      <div class={styles.cores} role="group" aria-label="Confirmation outcomes">
        <For each={outcomes}>{outcome =>
          <label>{outcome.label}<meter min={0} max={total()} value={number(at(data(), outcome.path))!} /></label>}
        </For>
      </div>
    </Show>
    <p class={styles.note}>A rule or hook can block a call without asking you.</p>
    <Show when={pending().length} fallback={<p>{data()?.pending ? 'No pending confirmations.' : 'Pending confirmations are not available from this source.'}</p>}>
      <DataTable ctx={ctx} label="Pending confirmations" columns={pendingColumns} rows={pending()} action={{
        label: ({ row }) => `Open waiting agent for ${row.name}`,
        run: ({ row }) => { const id = text(row.agent_id); if (id) ctx.openAgent(id, 'tools') },
      }} />
    </Show>
    <Show when={tools().length} fallback={<p>{data()?.by_tool ? def.empty : 'Per-tool confirmations are not available from this source.'}</p>}>
      <DataTable ctx={ctx} label={def.title} columns={def.columns} rows={tools()} action={{
        label: ({ row }) => `Open tool ${row.name}`,
        run: ({ row }) => { const name = text(row.name); if (name) ctx.openDetail({ type: 'tool', name }) },
      }} />
    </Show>
  </View>
}

const breakdownIds = {
  errors: ['key'], latency: ['what'], tests: ['project', 'command'],
} as const
const breakdownLabels = { errors: 'Grouped errors', latency: 'Duration distributions', tests: 'Test commands' }

export function HistoryBreakdown(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const id = def.id as keyof typeof breakdown
  const chartDef: PanelDef = { ...def, columns: breakdown[id] }
  const result = () => ctx.read(def.sources[1])
  const rows = createMemo(() => {
    const read = result()
    const values = id === 'tests' && Array.isArray(read.value)
      ? read.value.map(row => ({ ...row, project: row.project ?? null })) : read.value
    return entries({ ...read, value: values }, breakdownIds[id])
  })
  const piped = () => id === 'tests' ? number(ctx.read(def.sources[3]).value) : undefined
  const openError = (row: BoardErrors[number]) => ctx.openDetail({ type: 'error', key: row.key })
  return <div class={styles.stack}>
    <Series {...props} def={chartDef} />
    <Show when={(piped() ?? 0) > 0}>
      <p class={styles.note}>{piped()} passed runs use a pipe without pipefail. A failed test can count as passed.</p>
    </Show>
    <View result={result} retry={ctx.refresh} empty={def.empty}>
      <DataTable ctx={ctx} label={breakdownLabels[id]} columns={def.columns} rows={rows()} action={id === 'errors' ? {
        label: ({ row }) => `Open error ${row.key}`,
        run: ({ row }) => openError(row as BoardErrors[number]),
      } : undefined} />
    </View>
  </div>
}

const fileAction = (ctx: PanelProps['ctx']) => ({
  label: ({ row }: { row: Readonly<Record<string, unknown>> }) => `Open file ${row.path}`,
  run: ({ row }: { row: Readonly<Record<string, unknown>> }) => {
    const path = text(row.path)
    if (path) ctx.openDetail({ type: 'file', path, record: text(row.record) ?? text(row.id) })
  },
})

export function Changes(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = () => ctx.read(def.sources[0])
  const files = () => ctx.board('changes')?.files
  // A file under no known project is said to be so; the board never guesses its project from the session.
  const rows = createMemo(() => rowsFrom((files() ?? []).slice(0, 40).map(row => row.project ? row : { ...row, project: OUTSIDE_PROJECTS }),
    row => identity(row.node_id, row.record ?? row.path, row.project)))
  const totals = () => at(result().value, 'totals')
  const outside = () => at(totals(), 'outside_projects') as { files?: number; lines_added?: number | null; lines_removed?: number | null } | undefined
  const counts = createMemo(() => {
    const items = ['lines_added', 'lines_removed'].flatMap((id, i) => {
      const value = measured(at(totals(), id))
      return value == null ? [] : [{ id, label: i ? 'Removed' : 'Added', value, tone: i ? 'warning' as const : 'positive' as const }]
    })
    return items.length ? items : undefined
  })
  return <div class={styles.stack}>
    <FieldStats label="Change summary" ctx={ctx} columns={[metric('files', 'board.change.file', 'Files'), ...def.columns.slice(2, 5)]}
      value={totals()} />
    <Bars label="Reported line changes" items={counts()} />
    <Show when={outside()?.files}>{n => <p class={styles.note}>
      {OUTSIDE_PROJECTS}: {fmtN(n())} files
      {outside()?.lines_added != null ? `, +${fmtN(outside()!.lines_added!)}` : ''}
      {outside()?.lines_removed != null ? ` −${fmtN(outside()!.lines_removed!)}` : ''}
      {' '}(not in any row of Projects)</p>}</Show>
    <View result={result} retry={ctx.refresh} empty={def.empty}>
      <Show when={(files()?.length ?? 0) > 40}><p class={styles.note}>Showing the first 40 reported files.</p></Show>
      <Show when={rows().length} fallback={<p>{files() ? def.empty : 'Files are not available from this source.'}</p>}>
        <DataTable ctx={ctx} label="Changed files" columns={def.columns} rows={rows()} action={fileAction(ctx)} />
      </Show>
    </View>
  </div>
}

export function MemoryFiles(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = () => ctx.read(def.sources[0])
  const agents = createMemo(() => new Map((ctx.board('agents') ?? []).map(agent => [agent.id, agent.title])))
  const rows = createMemo(() => entries(result(), ['path', 'read_by']).map(entry => {
    const id = text(entry.row.changed_by)
    return { ...entry, row: { ...entry.row, editor: id ? agents().get(id) ?? id : undefined } }
  }))
  const reported = () => usable(result()) && Array.isArray(result().value) ? rows() : undefined
  const ranked = createMemo(() => topRows(reported(), 'tokens', ({ row }) => fileName(row.path)))
  return <div class={styles.stack}>
    <StatStrip label="Memory and instruction file summary" items={[{ label: 'Listed file records', value: reported()?.length }]} />
    <Bars label="Top listed files by tokens per call" items={ranked()} format={displayField(ctx, def.columns[3]).format} />
    <View result={result} retry={ctx.refresh} empty={def.empty}>
      <DataTable ctx={ctx} label={def.title} columns={def.columns} rows={rows()} action={fileAction(ctx)} />
    </View>
  </div>
}
