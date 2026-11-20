import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { DetailEvents, DetailEventsCount, DetailSessionRecords } from '../../data/contract.gen'
import { CodeView } from '../../ui/CodeView'
import { PanelState } from '../../ui/PanelState'
import { Resource, rowId, Rows, Section, sessionPath, Stats, type TabProps } from '../shared'
import styles from '../drawer.module.css'

const limit = 500
type EventsPage = Extract<DetailSessionRecords, { rows: unknown }>

function EventsList(props: { rows: DetailEvents | EventsPage['rows']; total?: number }) {
  const [kind, setKind] = createSignal('')
  const [selected, select] = createSignal('')
  const keyOf = (row: DetailEvents[number]) => rowId(row.seq, row.ts, row.kind, row.tool)
  const counts = createMemo(() => {
    const counts = new Map<string, number>()
    for (const row of props.rows) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1)
    return [...counts]
  })
  const details = () => props.rows.find(row => keyOf(row) === selected())?.detail
  return <Section title="Events">
    <Stats items={[{ label: 'Shown', value: props.rows.length }, { label: 'Total events', value: props.total }]} />
    <div class={styles.bar}><For each={counts()}>{([value, count]) =>
      <button type="button" class={styles.button} aria-pressed={kind() === value ? 'true' : 'false'} onClick={() => {
        setKind(current => current === value ? '' : value); select('')
      }}>{value} · {count}</button>
    }</For></div>
    <Rows label="Events" rows={props.rows.filter(row => !kind() || row.kind === kind())}
      identity={['seq', 'ts', 'kind', 'tool']} columns={[[ 'ts', 'Time', 'time' ], 'kind', 'tool', 'seq']}
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
