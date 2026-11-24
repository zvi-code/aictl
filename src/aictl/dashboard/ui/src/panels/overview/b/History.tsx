import { createMemo, Show, untrack } from 'solid-js'
import type { BoardConfirms, BoardErrors, BoardTools } from '../../../data/contract.gen'
import { Table } from '../../../ui/Table'
import type { Field } from '../../../ui/tableModel'
import { at } from '../../data'
import { nodeColumn, presentFields, scalar } from '../../kinds/model'
import Series from '../../kinds/Series'
import type { FieldRef, PanelContext, PanelDef, PanelProps } from '../../types'
import { breakdown, field, metric, stamp } from '../b'
import { Bars, FieldStats, fileName, measured, StatStrip, topRows, usable } from '../Summary'
import { displayField, entries, type Entry, identity, Metrics, number, rowsFrom, styles, text, View } from './View'
import { fmtN } from '../../../design/format'
import { nodeCell } from '../../../data/nodeNames'

export const OUTSIDE_PROJECTS = 'Outside any project'
export const OUTSIDE_HINT = 'not under a known project folder, so in no row of Projects'

type RowAction = { label: (entry: Entry) => string; run: (entry: Entry) => void }
/**
 * A table whose first column opens the row: its cell is the button, named in full for assistive
 * technology, so no separate action column cuts the label to "Open t…".
 */
export function LinkTable(props: {
  ctx: PanelContext; label: string; columns: readonly FieldRef[]; rows: readonly Entry[]; action?: RowAction
  hints?: Record<string, (entry: Entry) => string | undefined>
}) {
  const fields = createMemo(() => presentFields([
    ...(nodeColumn(props.ctx.scope(), props.rows) ? [{ path: 'node_id', label: 'Node' }] : []),
    ...props.columns,
  ].map<Field<Entry>>(column => {
    const { label, format } = displayField(props.ctx, column)
    const action = column.path === props.columns[0]?.path ? props.action : undefined
    return { id: column.path, label, read: ({ row }: Entry) => scalar(at(row, column.path)), format,
      hint: props.hints?.[column.path] ?? (column.hint
        ? ({ row }: Entry) => { const value = at(row, column.hint!); return typeof value === 'string' && value ? value : undefined }
        : undefined), action,
      ...column.path === 'node_id' ? nodeCell<Entry>(({ row }) => at(row, column.path)) : {} }
  }), props.rows))
  return <Table label={props.label} fields={fields()} rows={props.rows} rowId={entry => entry.id}
    legacyKeys={{ hidden: `aictl-panel-columns-${props.label}` }} />
}

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
      <LinkTable ctx={ctx} label={def.title} columns={def.columns} rows={rows()} action={toolAction(ctx)} />
    </Show>
  </View>
}

const toolAction = (ctx: PanelContext): RowAction => ({
  label: ({ row }) => `Open tool ${row.name}`,
  run: ({ row }) => { const name = text(row.name); if (name) ctx.openDetail({ type: 'tool', name }) },
})

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

/** The totals the source reports, each as a label with its value; the rest are named once as not reported. */
export function reportedTotals(columns: readonly FieldRef[], value: unknown) {
  const shown = columns.filter(column => number(at(value, column.path)) != null)
  const missing = columns.filter(column => number(at(value, column.path)) == null).map(column => column.label ?? column.path)
  return { shown, missing }
}

export function Confirmations(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = () => ctx.read(def.sources[0])
  const data = () => result().value as BoardConfirms | undefined
  const pending = createMemo(() => rowsFrom((data()?.pending ?? []).filter(item => !ctx.stopped(item.agent_id)),
    row => identity(row.agent_id, row.name, row.since_ts, row.target)))
  const tools = createMemo(() => rowsFrom(data()?.by_tool ?? [], row => identity(row.name)))
  const totals = createMemo(() => reportedTotals(confirmTotals, data()))
  return <View result={result} retry={ctx.refresh} empty={def.empty}>
    <Show when={totals().shown.length}>
      <FieldStats label="Confirmation outcomes" ctx={ctx} columns={totals().shown} value={data()} />
    </Show>
    <Show when={totals().missing.length}>
      <p class={styles.note}>Not reported by this source: {totals().missing.join(', ')}.</p>
    </Show>
    <p class={styles.note}>A rule or hook can block a call without asking you.</p>
    <Show when={pending().length} fallback={<p>{data()?.pending ? 'No pending confirmations.' : 'Pending confirmations are not available from this source.'}</p>}>
      <LinkTable ctx={ctx} label="Pending confirmations" columns={pendingColumns} rows={pending()} action={{
        label: ({ row }) => `Open waiting agent for ${row.name}`,
        run: ({ row }) => { const id = text(row.agent_id); if (id) ctx.openAgent(id, 'tools') },
      }} />
    </Show>
    <Show when={tools().length} fallback={<p>{data()?.by_tool ? def.empty : 'Per-tool confirmations are not available from this source.'}</p>}>
      <LinkTable ctx={ctx} label={def.title} columns={def.columns} rows={tools()} action={toolAction(ctx)} />
    </Show>
  </View>
}

const breakdownIds = {
  errors: ['key'], latency: ['what'], tests: ['project', 'command'],
} as const
const breakdownLabels = { errors: 'Grouped errors', latency: 'Duration distributions', tests: 'Test commands' }

export const NO_ERROR_TEXT = 'no error text recorded'
const httpWords: Record<string, string> = {
  400: 'bad request', 401: 'not authorized', 403: 'forbidden', 404: 'not found', 408: 'timed out', 413: 'request too large',
  429: 'rate limited', 500: 'server error', 502: 'bad gateway', 503: 'service unavailable', 504: 'gateway timeout',
  529: 'overloaded',
}
const words = (id: string) => {
  const text = id.replaceAll('_', ' ').replace(/\bapi\b/gi, 'API').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
// Markup a tool wraps its error in, such as <tool_use_error>, is not part of the reason.
const plain = (value: unknown) => typeof value === 'string' ? value.replace(/<\/?[A-Za-z_][\w-]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''

/**
 * A grouped error in words: what failed (the tool by its name, or the model API) and why. The
 * grouping key (`tool:<name>:<text>` or `api:<type>:<status>`) stays in the row for the drawer.
 */
export function errorView(row: { key: string; kind?: string; sample?: string | null }) {
  if (row.key.startsWith('api:')) {
    const [, type = '', status = ''] = row.key.split(':')
    const http = status ? `HTTP ${status}${httpWords[status] ? ` (${httpWords[status]})` : ''}` : ''
    return { source: 'Model API', reason: [type ? words(type) : 'API error', http].filter(Boolean).join(', ') }
  }
  const rest = row.key.startsWith('tool:') ? row.key.slice(5) : row.key
  const cut = rest.indexOf(':')
  const name = cut < 0 ? rest : rest.slice(0, cut)
  return { source: name || 'Unnamed tool', reason: plain(row.sample) || plain(cut < 0 ? '' : rest.slice(cut + 1)) || NO_ERROR_TEXT }
}

export function HistoryBreakdown(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const id = def.id as keyof typeof breakdown
  const chartDef: PanelDef = { ...def, columns: breakdown[id] }
  const result = () => ctx.read(def.sources[1])
  const rows = createMemo(() => {
    const read = result()
    const values = !Array.isArray(read.value) ? read.value
      : id === 'tests' ? read.value.map(row => ({ ...row, project: row.project ?? null }))
        : id === 'errors' ? read.value.map(row => ({ ...row, ...errorView(row) })) : read.value
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
      <LinkTable ctx={ctx} label={breakdownLabels[id]} columns={def.columns} rows={rows()} action={id === 'errors' ? {
        label: ({ row }) => `Open failures of ${row.source}: ${row.reason}`,
        run: ({ row }) => openError(row as BoardErrors[number]),
      } : undefined} />
    </View>
  </div>
}

const fileAction = (ctx: PanelProps['ctx']): RowAction => ({
  label: ({ row }) => `Open file ${row.path}`,
  run: ({ row }) => {
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
      {' '}({OUTSIDE_HINT})</p>}</Show>
    <View result={result} retry={ctx.refresh} empty={def.empty}>
      <Show when={(files()?.length ?? 0) > 40}><p class={styles.note}>Showing the first 40 reported files.</p></Show>
      <Show when={rows().length} fallback={<p>{files() ? def.empty : 'Files are not available from this source.'}</p>}>
        <LinkTable ctx={ctx} label="Changed files" columns={def.columns} rows={rows()} action={fileAction(ctx)}
          hints={{ project: ({ row }) => row.project === OUTSIDE_PROJECTS ? `${OUTSIDE_PROJECTS}: ${OUTSIDE_HINT}.` : undefined }} />
      </Show>
    </View>
  </div>
}

export function MemoryFiles(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = () => ctx.read(def.sources[0])
  const agents = createMemo(() => new Map((ctx.board('agents') ?? []).map(agent => [agent.id, agent.title])))
  const rows = createMemo(() => entries(result(), ['path', 'declared_for']).map(entry => {
    const id = text(entry.row.changed_by)
    // Read only when a session's own record shows the load; else the file is only declared for a tool.
    const sessions = number(entry.row.loaded_sessions)
    const tools = Array.isArray(entry.row.loaded_by) ? entry.row.loaded_by.join(', ') : ''
    return { ...entry, row: { ...entry.row, editor: id ? agents().get(id) ?? id : undefined,
      loaded_text: sessions ? `${sessions} ${sessions === 1 ? 'session' : 'sessions'}${tools ? ` (${tools})` : ''}` : 'no load recorded' } }
  }))
  const reported = () => usable(result()) && Array.isArray(result().value) ? rows() : undefined
  const ranked = createMemo(() => topRows(reported(), 'tokens', ({ row }) => fileName(row.path)))
  return <div class={styles.stack}>
    <StatStrip label="Memory and instruction file summary" items={[{ label: 'Listed file records', value: reported()?.length }]} />
    <Bars label="Top listed files by tokens per call" items={ranked()} format={displayField(ctx, def.columns[3]).format} />
    <View result={result} retry={ctx.refresh} empty={def.empty}>
      <LinkTable ctx={ctx} label={def.title} columns={def.columns} rows={rows()} action={fileAction(ctx)} />
    </View>
  </div>
}
