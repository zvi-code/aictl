import { createEffect, createMemo, createSignal, Show, untrack } from 'solid-js'
import type { DetailSessions } from '../../data/contract.gen'
import { detailPath, detailRead, scopeConfirmed } from '../data'
import { keyedRows } from '../kinds/model'
import { RowTable } from '../kinds/Rows'
import { States } from '../kinds/States'
import type { PanelProps, Read } from '../types'
import { field } from './aFields'
import { Bars, bins, measured, StatStrip, usable } from './Summary'
import css from './overviewA.module.css'

const pageSize = 50
const matchLabels: Record<string, string> = {
  title: 'Title', prompt: 'Prompt', artifact: 'Artifact', file: 'Written file', commit: 'Commit', project: 'Project',
  id: 'Session id',
}
const namedBy: Record<string, string> = { user: 'You', tool: 'The tool', prompt: 'First prompt' }

/** The first characters of a session id, enough to tell two sessions of one name apart. */
export const shortId = (id: string) => id.length > 12 ? id.slice(0, 8) : id

export default function Sessions(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const [text, setText] = createSignal('')
  const [q, setQ] = createSignal('')
  createEffect(text, value => {
    const timer = setTimeout(() => setQ(value.trim()), 250)
    return () => clearTimeout(timer)
  })
  const noTools = () => ctx.tools()?.length === 0
  const path = (offset: number) => {
    const query = new URLSearchParams({ q: q() })
    const tools = ctx.tools()
    if (tools?.length) query.set('tool', tools.join(','))
    query.set('limit', String(pageSize))
    query.set('offset', String(offset))
    return detailPath(ctx, '/api/board/sessions', query)
  }
  const key = () => noTools() ? undefined : path(0)
  const first = untrack(() => ctx.detail<DetailSessions>(key))
  const [more, setMore] = createSignal<{ key: string; offset: number }>()
  const request = () => more()?.key === key() ? more() : undefined
  const pagePath = createMemo(() => request() ? path(request()!.offset) : undefined)
  const next = untrack(() => ctx.detail<DetailSessions>(pagePath))
  const [extra, setExtra] = createSignal<{ key: string; rows: DetailSessions['rows']; total: number | undefined }>()
  const valid = (data: DetailSessions | undefined) => data && scopeConfirmed(ctx, data.node_scope) ? data : undefined
  const initial = () => valid(first()?.data)
  const appended = () => extra()?.key === key() ? extra() : undefined
  createEffect(() => key(), () => { setMore(undefined); setExtra(undefined) })
  createEffect(() => ({ active: request(), page: valid(next()?.data), status: next()?.status }), ({ active, page, status }) => {
    if (!active || !page || status !== 'ready' || !Array.isArray(page.rows)) return
    setExtra(previous => ({
      key: active.key,
      rows: [...(previous?.key === active.key ? previous.rows : []), ...page.rows],
      total: page.rows.length ? page.total : active.offset,
    }))
    setMore(undefined)
  })
  const loaded = createMemo(() => [
    ...(Array.isArray(initial()?.rows) ? initial()!.rows : []), ...(appended()?.rows ?? []),
  ])
  const rows = createMemo(() => keyedRows({ state: 'ready', value: loaded().map(row => ({
    ...row, title: row.title || row.session_id || row.id,
    named_by: namedBy[row.title_source ?? ''],
    short_id: shortId(row.session_id || row.id),
    tool: ctx.board('tool_labels')?.[row.tool] ?? row.tool,
    duration: typeof row.ended_at === 'number' && typeof row.started_at === 'number' ? row.ended_at - row.started_at : undefined,
    matched: row.match && row.match_text != null ? `${matchLabels[row.match] ?? row.match}: ${row.match_text}` : undefined,
  })) }, ['id']))
  const total = () => appended()?.total ?? initial()?.total
  const busy = () => request() && (!next() || next()?.status === 'loading' || next()?.status === 'refreshing')
  const pageError = () => request() && (next()?.status === 'error' || next()?.status === 'stale' ||
    (next()?.status === 'ready' && !Array.isArray(valid(next()?.data)?.rows)))
  const result = (): Read => {
    if (noTools()) return { state: 'empty', message: 'No tools are selected.' }
    if (first()?.data && !initial()) return { state: 'error', message: 'The server did not confirm the requested node scope.' }
    const read = detailRead(first(), initial()?.rows, ctx.paused())
    return read.state === 'error' ? { ...read, message: `Could not load sessions: ${read.message ?? 'The request failed.'}` } : read
  }
  const hasRows = () => usable(result()) && Array.isArray(initial()?.rows)
  const tools = createMemo(() => hasRows() ? bins(loaded().map(row => row.tool), id => ctx.board('tool_labels')?.[id] ?? id) : undefined)
  const loadMore = () => {
    const current = key()
    if (!current) return
    if (pageError()) next.retry()
    else setMore({ key: current, offset: loaded().length })
  }
  return <>
    <StatStrip label="Session search summary" items={[
      { label: 'Matching sessions', value: hasRows() ? measured(total()) : undefined },
      { label: 'Sessions loaded', value: hasRows() ? loaded().length : undefined },
    ]} />
    <Bars label="Top tools among loaded sessions" items={tools()} max={hasRows() ? loaded().length : undefined} />
    <div class={css.controls}>
      <input type="search" class={css.input} aria-label="Search all past sessions" value={text()}
        placeholder="Search stored sessions" title="Search all dates. The Tool filter applies."
        onInput={event => setText(event.currentTarget.value)} />
    </div>
    <States result={result} empty={q() ? 'No session matches this text.' : 'No session is stored yet.'} retry={first.retry} reserveStaleSpace>
      <Show when={rows().length}>
        <RowTable panel={props} rows={rows()} columns={q() ? [...def.columns, field('matched', 'Matched in')] : def.columns} />
      </Show>
      <Show when={pageError()}><p role="alert">Could not load more sessions: {next()?.error instanceof Error
        ? (next()?.error as Error).message : 'The response did not contain a session page.'}</p></Show>
      <Show when={total() != null && loaded().length < total()!}>
        <button type="button" class={css.button} disabled={Boolean(busy())} onClick={loadMore}>
          {busy() ? 'Loading more sessions…' : `Show ${Math.min(pageSize, total()! - loaded().length)} more`}
        </button>
      </Show>
    </States>
  </>
}
