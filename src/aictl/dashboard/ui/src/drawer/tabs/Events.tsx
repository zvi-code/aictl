import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { DetailEvents, DetailEventsCount, DetailSessionRecords } from '../../data/contract.gen'
import { CodeView } from '../../ui/CodeView'
import { PanelState } from '../../ui/PanelState'
import { Resource, rowId, Rows, Section, sessionPath, Stats, type TabProps } from '../shared'
import styles from '../drawer.module.css'

const limit = 500
type EventsPage = Extract<DetailSessionRecords, { rows: unknown }>
type EventRow = DetailEvents[number] | EventsPage['rows'][number]

/** The tool an event is about: the one it names in its detail, a hook's tools joined, or none. */
export function calledTool(detail: unknown): string | undefined {
  const fields = typeof detail === 'object' && detail !== null && !Array.isArray(detail) ? detail as Record<string, unknown> : {}
  for (const key of ['gen_ai.tool.name', 'tool_name', 'tool.name']) {
    const value = fields[key]
    if (typeof value === 'string' && value) return value
  }
  const hooked = fields['github.copilot.hook.tool_names']
  try {
    const names = typeof hooked === 'string' ? JSON.parse(hooked) : hooked
    if (Array.isArray(names) && names.length) return names.filter((name): name is string => typeof name === 'string').join(', ') || undefined
  } catch { /* a value that is no list names no tool */ }
  return undefined
}

function EventsList(props: { rows: DetailEvents | EventsPage['rows']; total?: number }) {
  const [kind, setKind] = createSignal('')
  const [selected, select] = createSignal('')
  const keyOf = (row: EventRow) => rowId(row.seq, row.ts, row.kind, row.tool)
  const counts = createMemo(() => {
    const counts = new Map<string, number>()
    for (const row of props.rows) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1)
    return [...counts]
  })
  const details = () => props.rows.find(row => keyOf(row) === selected())?.detail
  const rows = createMemo(() => props.rows.filter(row => !kind() || row.kind === kind()).map(row => ({ ...row, called_tool: calledTool(row.detail) ?? '' })))
  // A column no row fills is not shown; an event about no tool leaves its called tool empty.
  const sequenced = () => props.rows.some(row => row.seq != null)
  return <Section title={`OTel events (${props.total ?? props.rows.length})`}>
    <Stats items={[{ label: 'Shown', value: props.rows.length }, { label: 'Total events', value: props.total }]} />
    <div class={styles.bar}><For each={counts()}>{([value, count]) =>
      <button type="button" class={styles.button} aria-pressed={kind() === value ? 'true' : 'false'} onClick={() => {
        setKind(current => current === value ? '' : value); select('')
      }}>{value} · {count}</button>
    }</For></div>
    <Rows label="OTel events" rows={rows()}
      identity={['seq', 'ts', 'kind', 'tool']}
      columns={[['ts', 'Time', 'time'], 'kind', ['called_tool', 'Called tool'], ['tool', 'Product'], ...(sequenced() ? [['seq', 'Sequence']] as const : [])]}
      action={{ label: row => `Inspect ${row.kind}`, run: row => select(keyOf(row)) }} />
    <Show when={selected()}><Show when={details() != null} fallback={<PanelState state="unavailable" />}>
      <CodeView label="Event details" text={typeof details() === 'string' ? String(details()) : JSON.stringify(details(), null, 2)} wrap />
    </Show></Show>
  </Section>
}

export default function Events(props: TabProps) {
  const local = () => props.shell.ctx.scope() === 'local'
  const range = () => ({ since: props.agent()?.started_at, until: props.agent()?.ended_at })
  const ctx = untrack(() => props.shell.ctx)
  const read = ctx.detail<DetailEvents>(createMemo(() => local() ? sessionPath(props, '/api/events', { ...range(), limit }) : undefined))
  const count = ctx.detail<DetailEventsCount>(createMemo(() => local() ? sessionPath(props, '/api/events/count', range()) : undefined))
  const scoped = ctx.detail<EventsPage>(createMemo(() => local() ? undefined : sessionPath(props, '/api/board/session/records', { part: 'events', limit })))
  return <Show when={local()} fallback={<Resource read={scoped}>{data => <EventsList rows={data().rows} total={data().total} />}</Resource>}>
    <Resource read={read}>{data => <EventsList rows={data()} total={count()?.data?.count} />}</Resource>
  </Show>
}
