import { createEffect, createMemo, createSignal, Show, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { stamp } from '../../design/format'
import { kustoLink } from '../../drawer/kqlLink'
import { Box, type Boxes } from '../../ui/Box'
import { CodeView } from '../../ui/CodeView'
import { Table } from '../../ui/Table'
import type { Field } from '../../ui/tableModel'
import { detailPath, detailRead } from '../data'
import { States } from '../kinds/States'
import type { PanelContext, Read } from '../types'
import { learnToolLabels, type CardId, type Hero, type InsightBody, type InsightSession, type QueryBlock } from './insightsModel'
import styles from './Insights.module.css'

export type CardProps = { ctx: PanelContext; boxes: Boxes; since: number; until: number }

/** "Show KQL": the view's text with the values the card used, and a link that opens it unrun. */
export function KqlDisclosure(props: { query: QueryBlock; copy: (text: string) => void }) {
  return <Show when={props.query}>{query => <details class={styles.disclosure}>
    <summary>Show KQL ({query().view})</summary>
    <CodeView label={`KQL of the ${query().view} view`} text={query().kql} wrap />
    <div class={styles.actions}>
      <button type="button" onClick={() => props.copy(query().kql)}>Copy KQL</button>
      <Show when={kustoLink(query().kusto_url, query().kql)}>{href =>
        <a href={href()} target="_blank" rel="noopener noreferrer">Open in Kusto</a>}</Show>
      <span>Opening the link does not run the query.</span>
    </div>
  </details>}</Show>
}

/** The period a card covers, as the server stated it, and when the view ran. */
export function periodText(body: InsightBody) {
  const since = body.range.since <= 0 ? 'all stored history' : `${stamp(body.range.since, true)} to ${stamp(body.range.until, true)}`
  const data = body.data_range.first_ts != null && body.data_range.last_ts != null
    ? `, data from ${stamp(body.data_range.first_ts, true)} to ${stamp(body.data_range.last_ts, true)}` : ', no data'
  return `Period: ${since}${data} · computed at ${stamp(body.computed_at, true)}`
}

/**
 * One finding: its own request, loaded when the card first comes into view, with its own loading and
 * error state, so one slow or failed card never holds up another.
 */
export function InsightCard<T extends InsightBody>(props: CardProps & {
  card: CardId; title: string; tab: string
  finding: (body: T) => string
  hero?: (body: T) => Hero | undefined
  visual: (body: T) => JSX.Element
  note: string
  table: { label: string; fields: Field<Record<string, unknown>>[]; rows: (body: T) => Record<string, unknown>[] }
  sessionFields: Field<InsightSession>[]
}) {
  const { ctx } = untrack(() => props)
  const [seen, setSeen] = createSignal(typeof IntersectionObserver === 'undefined')
  let element: HTMLHeadingElement | undefined
  createEffect(seen, already => {
    if (already || !element) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setSeen(true)
    }, { rootMargin: '200px' })
    observer.observe(element)
    return () => observer.disconnect()
  })
  const path = createMemo(() => {
    if (!seen()) return undefined
    return detailPath(ctx, `/api/board/insights/${props.card}`,
      new URLSearchParams({ since: String(props.since), until: String(props.until) }))
  })
  const read = untrack(() => ctx.detail<T>(path))
  const data = () => {
    const value = read()?.data
    if (!value || ctx.scope() === 'local') return value
    return value.node_scope?.kind === ctx.scope() && (ctx.scope() !== 'node' || value.node_scope?.node_id === ctx.nodeId()) ? value : undefined
  }
  const result = (): Read => {
    if (!seen()) return { state: 'loading', message: 'Loads when the card comes into view.' }
    if (read()?.data && !data()) return { state: 'error', message: 'The server did not confirm the requested node scope.' }
    const value = detailRead(read(), data(), false, `the ${props.title} query`)
    return value.state === 'error' ? { ...value, message: `Could not load ${props.title}: ${value.message ?? 'The request failed.'}` }
      : value.state === 'stale' ? { ...value, updatedAt: data()?.computed_at } : value
  }
  createEffect(() => data()?.tool_labels, labels => { learnToolLabels(labels) })
  const body = () => data()!
  const sessionFields = createMemo((): Field<InsightSession>[] => [{
    id: 'session_id', label: 'Session', read: row => row.session_id,
    action: { label: row => `Open session ${row.session_id}`, run: row => ctx.openAgent(row.session_id, props.tab) },
  }, ...props.sessionFields])
  return <Box boxes={props.boxes} id={`insight-${props.card}`} label={props.title} class={styles.card} corner
    controls={['fold', 'full', 'hide']} head={<h2 ref={element} data-insight={props.card}>{props.title}</h2>}>
    <States result={result} retry={read.retry}>
      <p class={styles.meta} data-period>{periodText(body())}</p>
      <Show when={props.hero?.(body())}>{hero => <p class={styles.hero} data-hero>
        <strong>{hero().value}</strong><span>{hero().label}</span></p>}</Show>
      <p class={styles.finding} data-finding>{props.finding(body())}</p>
      {props.visual(body())}
      <details class={styles.disclosure} data-method>
        <summary>How this is measured</summary>
        <p class={styles.note}>{props.note}</p>
      </details>
      <details class={styles.disclosure} data-sessions>
        <summary>Open sessions ({body().sessions.length})</summary>
        <Show when={body().sessions.length} fallback={<p class={styles.note}>No session in this period.</p>}>
          <Table label={`${props.title}: sessions`} fields={sessionFields()} rows={body().sessions} pageSize={10}
            rowId={row => `${row.node_id ?? ''}\u0000${row.session_id}`} />
        </Show>
      </details>
      <details class={styles.disclosure}>
        <summary>Show data table</summary>
        <Table label={props.table.label} fields={props.table.fields} rows={props.table.rows(body())} pageSize={25}
          rowId={row => String(row.id)} />
      </details>
      <KqlDisclosure query={body().query} copy={ctx.copy} />
    </States>
  </Box>
}

/** A numeric table column that shows a value the source does not report as not reported. */
export function numberField<T extends Record<string, unknown>>(id: string, label: string, format: (value: number) => string): Field<T> {
  return {
    id, label, numeric: true,
    read: row => typeof row[id] === 'number' ? row[id] as number : undefined,
    format: value => typeof value === 'number' ? format(value) : String(value),
  }
}

export function textField<T extends Record<string, unknown>>(id: string, label: string, read?: (row: T) => string): Field<T> {
  return { id, label, read: row => read ? read(row) : String(row[id] ?? '') }
}
