import { createEffect, createMemo, For, Show, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { stamp } from '../../design/format'
import { kustoLink } from '../../drawer/kqlLink'
import { CodeView } from '../../ui/CodeView'
import { Table } from '../../ui/Table'
import type { Field } from '../../ui/tableModel'
import { detailPath, detailRead } from '../data'
import { States } from '../kinds/States'
import type { PanelContext, Read } from '../types'
import { learnToolLabels, toolLabel, type CardId, type Hero, type InsightBody, type InsightSession, type QueryBlock } from './insightsModel'
import { evidenceNote, fewText, withEvidence } from './evidence'
import { sessionBranch, sessionHover, sessionName } from './sessionName'
import { insightView, TOOL_FILTERED } from './views'
import styles from './Insights.module.css'
import { Name, opens, OpensContext } from './charts/Open'

export type CardProps = { ctx: PanelContext; since: number; until: number }

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

/** One analysis as a view of its own: its request, its loading and error state, its chart and its details. */
export function InsightCard<T extends InsightBody>(props: CardProps & {
  card: CardId; tab: string
  finding: (body: T) => string
  hero?: (body: T) => Hero | undefined
  visual: (body: T) => JSX.Element
  note: string
  table: { label: string; fields: Field<Record<string, unknown>>[]; rows: (body: T) => Record<string, unknown>[] }
  sessionFields: Field<InsightSession>[]
  /** The card's view takes the page's tool and model filters (the work cards). */
  filtered?: boolean
}) {
  const { ctx } = untrack(() => props)
  const title = untrack(() => insightView(props.card).title)
  const path = createMemo(() => {
    const query = new URLSearchParams({ since: String(props.since), until: String(props.until) })
    const tools = props.filtered ? ctx.tools() : null
    if (tools) query.set('tool', tools.length ? tools.join(',') : '-')
    if (props.filtered && ctx.filters().model !== 'all') query.set('model', ctx.filters().model)
    return detailPath(ctx, `/api/board/insights/${props.card}`, query)
  })
  const read = untrack(() => ctx.detail<T>(path))
  const data = () => {
    const value = read()?.data
    if (!value || ctx.scope() === 'local') return value
    return value.node_scope?.kind === ctx.scope() && (ctx.scope() !== 'node' || value.node_scope?.node_id === ctx.nodeId()) ? value : undefined
  }
  const result = (): Read => {
    if (read()?.data && !data()) return { state: 'error', message: 'The server did not confirm the requested node scope.' }
    const value = detailRead(read(), data(), false, `the ${title} query`)
    return value.state === 'error' ? { ...value, message: `Could not load ${title}: ${value.message ?? 'The request failed.'}` }
      : value.state === 'stale' ? { ...value, updatedAt: data()?.computed_at } : value
  }
  createEffect(() => data()?.tool_labels, labels => { learnToolLabels(labels) })
  const body = () => data()!
  // What the headline, the visual and its coloured cells may use: groups below the card's minimum are taken out.
  const shown = createMemo(() => data() ? withEvidence(data()!) : undefined)
  const open = opens(ctx)
  const sessionFields = createMemo((): Field<InsightSession>[] => [{
    id: 'session_id', label: 'Session', read: row => sessionName(row), hint: row => sessionHover(row),
    action: { label: row => `Open session ${sessionName(row)}`, run: row => ctx.openAgent(row.session_id, props.tab) },
  }, { id: 'git_branch', label: 'Branch', read: row => sessionBranch(row) || undefined }, ...props.sessionFields])
  return <section class={styles.view} id={`insight-${props.card}`} aria-labelledby={`insight-${props.card}-title`}>
    <h1 id={`insight-${props.card}-title`} data-insight={props.card}>{title}</h1>
    <States result={result} retry={read.retry}>
      <p class={styles.meta} data-period>{periodText(body())}</p>
      {/* A coding tool or model filter the view's query does not take: said here, with the views that do take it. */}
      <Show when={!props.filtered && (ctx.tools() != null || ctx.filters().model !== 'all')}>
        <p class={styles.note} data-unfiltered>The coding tool and model filters do not narrow this view: it shows every tool and
          model. They narrow <For each={TOOL_FILTERED}>{(id, i) => <>{i() ? ', ' : ''}<Name text={insightView(id).title}
            open={{ label: `Open ${insightView(id).title} with the filter applied`, run: () => ctx.navigate({ view: id }) }} /></>}</For>.</p>
      </Show>
      <Show when={props.hero?.(shown()!.body)}>{hero => <p class={styles.hero} data-hero>
        <strong>{hero().value}</strong><span>{hero().label}</span></p>}</Show>
      <p class={styles.finding} data-finding>{props.finding(shown()!.body)}</p>
      <OpensContext value={open}>{props.visual(shown()!.body)}</OpensContext>
      <Show when={shown()!.few.length}>
        <p class={styles.note} data-few>{fewText(shown()!.few, toolLabel)}</p>
      </Show>
      <details class={styles.more} data-more>
        <summary>Details: sessions ({body().sessions.length}), data table, KQL, how this is measured</summary>
      <details class={styles.disclosure} data-method>
        <summary>How this is measured</summary>
        <p class={styles.note}>{props.note}{evidenceNote(props.card)}</p>
      </details>
      <details class={styles.disclosure} data-sessions>
        <summary>Open sessions ({body().sessions.length})</summary>
        <Show when={body().sessions.length} fallback={<p class={styles.note}>No session in this period.</p>}>
          <Table label={`${title}: sessions`} fields={sessionFields()} rows={body().sessions} pageSize={10}
            rowId={row => `${row.node_id ?? ''}\u0000${row.session_id}`} />
        </Show>
      </details>
      <details class={styles.disclosure}>
        <summary>Show data table</summary>
        <Table label={props.table.label} fields={props.table.fields} rows={props.table.rows(body())} pageSize={25}
          rowId={row => String(row.id)} />
      </details>
      <KqlDisclosure query={body().query} copy={ctx.copy} />
      </details>
    </States>
  </section>
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
