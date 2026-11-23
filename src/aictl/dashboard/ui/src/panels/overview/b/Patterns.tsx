import { createEffect, createMemo, createSignal, For, Show, untrack } from 'solid-js'
import { fmtBytes, fmtMs, fmtN, stamp } from '../../../design/format'
import { kustoLink } from '../../../drawer/kqlLink'
import { CodeView } from '../../../ui/CodeView'
import { Table } from '../../../ui/Table'
import type { Field } from '../../../ui/tableModel'
import { detailPath, detailRead } from '../../data'
import FoldTable from '../../kinds/FoldTable'
import { States } from '../../kinds/States'
import type { KeyedRow, PanelContext, PanelProps, Read } from '../../types'
import {
  mcpRows, share, signalText, windowQuery, type ConvergenceBody, type ConvergenceRow, type McpBody, type QueryBlock,
} from './patternsModel'
import styles from './patterns.module.css'

const approx = (value: number) => `≈ ${fmtMs(value)}`

/** "Show query": the KQL the panel ran with its values, a copy button and a link that opens it unrun. */
export function QueryDetails(props: { query: QueryBlock | undefined; copy: (text: string) => void }) {
  return <Show when={props.query}>{query => <details class={styles.query}>
    <summary>Show query ({query().view})</summary>
    <CodeView label={`KQL of the ${query().view} view`} text={query().kql} wrap />
    <div class={styles.queryActions}>
      <button type="button" onClick={() => props.copy(query().kql)}>Copy query</button>
      <Show when={kustoLink(query().kusto_url, query().kql)}>{href =>
        <a href={href()} target="_blank" rel="noopener noreferrer">Open in Kusto</a>}</Show>
      <span>Opening the link does not run the query.</span>
    </div>
  </details>}</Show>
}

export function Definitions(props: { items: Record<string, string> | undefined; labels?: Record<string, string>; title?: string }) {
  return <Show when={props.items && Object.keys(props.items).length}>
    <details class={styles.definitions}>
      <summary>{props.title ?? 'What the numbers mean'}</summary>
      <dl><For each={Object.entries(props.items!)}>{entry => <>
        <dt>{props.labels?.[entry[0]] ?? entry[0].replaceAll('_', ' ')}</dt><dd>{entry[1]}</dd>
      </>}</For></dl>
    </details>
  </Show>
}

function useBoardDetail<T extends { node_scope?: { kind: string; node_id: string | null } }>(ctx: PanelContext, route: string) {
  const path = createMemo(() => ctx.tools()?.length === 0 ? undefined : detailPath(ctx, route, windowQuery(ctx)))
  const read = untrack(() => ctx.detail<T>(path))
  const data = () => {
    const value = read()?.data
    if (!value || ctx.scope() === 'local') return value
    return value.node_scope?.kind === ctx.scope() && (ctx.scope() !== 'node' || value.node_scope?.node_id === ctx.nodeId()) ? value : undefined
  }
  // When this page last received a current answer, so a stale one says how old it is.
  const [received, setReceived] = createSignal<number>()
  createEffect(() => read()?.status === 'ready' && data() ? data() : undefined, value => {
    if (value) setReceived(Date.now() / 1000)
  })
  const stamped = (value: Read): Read => value.state === 'stale' && received() ? { ...value, updatedAt: received() } : value
  return { read, data, stamped, noTools: () => ctx.tools()?.length === 0 }
}

const mcpLabels: Record<string, string> = {
  calls: 'Calls', sessions: 'Sessions', failures: 'Failures', fail_rate: 'Failure rate', total_ms: 'Total time',
  p50_ms: 'p50', p95_ms: 'p95', output_bytes: 'Result bytes', est_tokens: 'Tokens (estimate)', time_share: 'Share of tool time',
  server: 'MCP server',
}

export function McpServers(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const { read, data, stamped, noTools } = useBoardDetail<McpBody>(ctx, '/api/board/mcp')
  const result = (): Read => {
    if (noTools()) return { state: 'empty', message: 'No tools are selected.' }
    if (read()?.data && !data()) return { state: 'error', message: 'The server did not confirm the requested node scope.' }
    const value = detailRead(read(), data()?.groups, ctx.paused(), { reading: 'MCP tool calls' })
    return value.state === 'error' ? { ...value, message: `Could not load MCP usage: ${value.message ?? 'The request failed.'}` } : stamped(value)
  }
  const rows = createMemo(() => mcpRows(data()))
  const number = (key: string, format: (value: number) => string = fmtN): Field<KeyedRow> => ({
    id: key, label: mcpLabels[key] ?? key, numeric: true,
    read: entry => { const value = entry.row[key]; return typeof value === 'number' ? value : undefined },
    format: value => typeof value === 'number' ? format(value) : String(value),
  })
  const fields: Field<KeyedRow>[] = [
    { id: 'name', label: 'Server or tool', read: entry => String(entry.row.name ?? '') },
    { id: 'tools', label: 'Tools', numeric: true, read: entry => typeof entry.row.tools === 'number' ? entry.row.tools : undefined },
    number('calls'),
    { id: 'sessions', label: 'Sessions', numeric: true, read: entry => entry.row.sessions_text as string | undefined },
    number('failures'), number('fail_rate', value => share(value) ?? ''), number('total_ms', fmtMs),
    number('p50_ms', approx), number('p95_ms', approx), number('output_bytes', fmtBytes),
    number('est_tokens', value => `≈ ${fmtN(value)}`), number('time_share', value => share(value) ?? ''),
  ]
  const totals = () => data()?.totals
  const servers = () => data()?.groups.filter(group => group.kind === 'mcp').length ?? 0
  const count = (value: number | null | undefined, one: string, many: string) =>
    value == null ? undefined : `${fmtN(value)} ${value === 1 ? one : many}`
  const summary = () => [
    servers() ? count(servers(), 'MCP server', 'MCP servers') : 'No MCP server used',
    count(totals()?.calls, 'tool call', 'tool calls'), count(totals()?.sessions, 'session', 'sessions'),
    totals()?.total_ms != null ? `total tool time ${fmtMs(totals()!.total_ms!)}` : undefined,
  ].filter(Boolean).join(' · ')
  return <States result={result} empty={def.empty} retry={read.retry} reserveStaleSpace>
    <div class={styles.strip}>
      <p class={styles.summary}>
        {summary()}
        <Show when={(totals()?.tool_names ?? 0) > (totals()?.tool_names_shown ?? 0)}>
          {' '}· showing the {totals()!.tool_names_shown} of {totals()!.tool_names} tool names with the most calls
        </Show>
      </p>
      <FoldTable label={def.title} fields={fields} rows={rows()} action={entry => entry.row.type === 'group'
        ? { label: `Open server ${String(entry.row.name)}`, run: () => ctx.openDetail({ type: 'mcp', name: entry.id }) }
        : { label: `Open tool ${String(entry.row.name)}`, run: () => ctx.openDetail({ type: 'tool', name: String(entry.row.name) }) }} />
      <p class={styles.summary}>{rows().some(entry => entry.folded) ? 'Expand a server for its tools. ' : ''}Tokens are an
        estimate: result bytes divided by 4. Percentiles come from a log-scale histogram and are within 6 %.</p>
      <Definitions items={data()?.definitions} labels={mcpLabels} />
      <QueryDetails query={data()?.query} copy={ctx.copy} />
    </div>
  </States>
}

const convergenceFields = (open: (row: ConvergenceRow) => void): Field<ConvergenceRow>[] => {
  const n = (id: keyof ConvergenceRow, label: string, format: (value: number) => string = fmtN): Field<ConvergenceRow> => ({
    id, label, numeric: true, read: row => typeof row[id] === 'number' ? row[id] as number : undefined,
    format: value => typeof value === 'number' ? format(value) : String(value),
  })
  return [
    // The session cell opens the session, so no separate action column cuts its label.
    { id: 'title', label: 'Session', read: row => row.title || row.session_id,
      action: { label: row => `Open session ${row.title || row.session_id}`, run: open } },
    n('score', 'Score'),
    { id: 'evidence', label: 'Evidence (heuristic)', read: row => signalText(row) },
    n('requests', 'Requests'), n('top_repeat', 'Repeats of one call'), n('retries', 'Retries after errors'),
    n('top_file_edits', 'Most edits to one file'), n('longest_dry', 'Longest run without a change'),
    n('tail_dry', 'Requests since the last change'), n('compactions', 'Compactions'),
    n('tokens_per_change', 'Tokens per accepted change'), n('tokens', 'Tokens'),
    { id: 'last_ts', label: 'Last request', read: row => row.last_ts, format: value => stamp(Number(value), true) },
  ]
}

/** The agent id the drawer opens: across nodes a session is named with its node, as the session finder names it. */
export function agentKey(ctx: PanelContext, row: Pick<ConvergenceRow, 'session_id' | 'node_id'>) {
  if (ctx.scope() === 'local' || !row.node_id || row.session_id.startsWith('[')) return row.session_id
  return JSON.stringify([row.node_id, row.session_id])
}

export function Convergence(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const { read, data, stamped, noTools } = useBoardDetail<ConvergenceBody>(ctx, '/api/board/convergence')
  const [only, setOnly] = createSignal<string>()
  const result = (): Read => {
    if (noTools()) return { state: 'empty', message: 'No tools are selected.' }
    if (read()?.data && !data()) return { state: 'error', message: 'The server did not confirm the requested node scope.' }
    const value = detailRead(read(), data()?.rows, ctx.paused(), { reading: 'session requests' })
    return value.state === 'error' ? { ...value, message: `Could not load convergence: ${value.message ?? 'The request failed.'}` } : stamped(value)
  }
  const rows = createMemo(() => (data()?.rows ?? []).filter(row => !only() || row.signals.some(signal => signal.id === only())))
  const counts = createMemo(() => {
    const out = new Map<string, number>()
    for (const row of data()?.rows ?? []) for (const signal of row.signals) out.set(signal.id, (out.get(signal.id) ?? 0) + 1)
    return out
  })
  const labels = () => Object.fromEntries((data()?.signals ?? []).map(signal => [signal.id, signal.label]))
  return <States result={result} empty={def.empty} retry={read.retry} reserveStaleSpace>
    <div class={styles.strip}>
      <p class={styles.summary}>
        {fmtN(data()?.flagged ?? 0)} of {fmtN(data()?.checked ?? 0)} sessions with 5 or more requests show a sign of not
        converging{data()?.checked_capped ? ' (read the first 1,000 by a rough order)' : ''}.
        Showing {rows().length} of {only() ? counts().get(only()!) ?? 0 : data()?.flagged ?? 0}. All signals are heuristics.
      </p>
      <div class={styles.chips} role="group" aria-label="Show only sessions with this signal">
        <For each={data()?.signals ?? []}>{signal =>
          <button type="button" class={styles.chip} title={signal.definition} aria-pressed={only() === signal.id ? 'true' : 'false'}
            onClick={() => setOnly(current => current === signal.id ? undefined : signal.id)}>
            {signal.label}: {counts().get(signal.id) ?? 0}
          </button>}</For>
      </div>
      <Table label={def.title} fields={convergenceFields(row => ctx.openAgent(agentKey(ctx, row), 'convergence'))} rows={rows()}
        rowId={row => `${row.node_id ?? ''}\u0000${row.session_id}`} />
      <Definitions items={data()?.definitions} labels={labels()} title="How each signal is defined" />
      <QueryDetails query={data()?.query} copy={ctx.copy} />
    </div>
  </States>
}
