import { createEffect, createMemo, createSignal, For, onCleanup, Show, untrack } from 'solid-js'
import type { DetailSessions } from '../../data/contract.gen'
import { writeUrl } from '../../data/urlState'
import { fmtN } from '../../design/format'
import { detailPath, detailRead, scopeConfirmed } from '../data'
import { keyedRows } from '../kinds/model'
import { RowTable } from '../kinds/Rows'
import { States } from '../kinds/States'
import type { FieldRef, PanelProps, Read } from '../types'
import { field, stamp } from './aFields'
import {
  clearAll, emptyReason, FIND_EVENT, finderChips, finderRequest, finderToParams, NAME_LABELS, parseFinder, RANGE_LABELS, rowState,
  SORT_COLUMNS, SORT_LABELS, sortByColumn, STATUS_LABELS, summaryItems,
  type FinderRange, type FinderSort, type FinderState, type FinderStatus, type NameSource,
} from './sessionFinder'
import css from './overviewA.module.css'
import styles from './sessionFinder.module.css'

const pageSize = 50
const matchLabels: Record<string, string> = {
  title: 'Title', prompt: 'Prompt', artifact: 'Artifact', file: 'Written file', commit: 'Commit', project: 'Project',
  id: 'Session id', source: 'Session file',
}
const namedBy: Record<string, string> = { user: 'You', tool: 'The tool', prompt: 'First prompt' }
const sortable: ReadonlySet<string> = new Set(Object.keys(SORT_COLUMNS))
const columnOf = Object.fromEntries(Object.entries(SORT_COLUMNS).map(([column, sort]) => [sort, column])) as Record<FinderSort, string>

/** The first characters of a session id, enough to tell two sessions of one name apart. */
export const shortId = (id: string) => id.length > 12 ? id.slice(0, 8) : id
const counted = (value: number | undefined) => typeof value === 'number' ? value.toLocaleString() : '…'

export default function Sessions(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const fromUrl = () => parseFinder(location.search, { filters: untrack(ctx.filters), tools: untrack(ctx.tools) })
  const [state, setState] = createSignal<FinderState>(fromUrl())
  const [text, setText] = createSignal(untrack(state).q)
  const apply = (next: FinderState) => {
    setState(next)
    setText(next.q)
    writeUrl(finderToParams(next))
  }
  const change = (patch: Partial<FinderState>) => apply({ ...state(), ...patch })
  createEffect(text, value => {
    if (value === untrack(state).q) return
    const timer = setTimeout(() => change({ q: value }), 250)
    return () => clearTimeout(timer)
  })
  const onPop = () => { const next = fromUrl(); setState(next); setText(next.q) }
  const onFind = (event: Event) => {
    const q = (event as CustomEvent<{ q?: string }>).detail?.q
    if (typeof q === 'string') apply({ ...clearAll(state()), q })
  }
  window.addEventListener('popstate', onPop)
  document.addEventListener(FIND_EVENT, onFind)
  onCleanup(() => { window.removeEventListener('popstate', onPop); document.removeEventListener(FIND_EVENT, onFind) })

  const noTools = () => state().tools?.length === 0
  // The time of a preset range is taken when the filters change, so later pages read the same window.
  const asked = createMemo(() => ({ state: state(), now: Date.now() / 1000 }))
  const path = (offset: number) => detailPath(ctx, '/api/board/sessions', finderRequest(asked().state, asked().now, offset, pageSize))
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
  const toolLabel = (id: string) => ctx.board('tool_labels')?.[id] ?? id
  const rows = createMemo(() => keyedRows({ state: 'ready', value: loaded().map(row => {
    const view = rowState(row)
    return {
      ...row, title: row.title || row.session_id || row.id,
      named_by: namedBy[row.title_source ?? ''],
      short_id: shortId(row.session_id || row.id),
      tool: toolLabel(row.tool),
      status_label: view.label,
      history: view.history,
      history_hint: [row.import_evidence, row.import?.source_file].filter(Boolean).join(' · '),
      title_hint: view.reason ?? row.import?.source_file ?? undefined,
      matched: row.match && row.match_text != null ? `${matchLabels[row.match] ?? row.match}: ${row.match_text}` : undefined,
    }
  }) }, ['id']))
  const columns = createMemo((): FieldRef[] => [
    { ...def.columns[0], hint: 'title_hint' },
    { path: 'status_label', label: 'Status', hint: 'status_evidence' },
    { path: 'history', label: 'History', hint: 'history_hint' },
    stamp('last_activity_at', 'Last active'),
    ...def.columns.slice(1),
    field('errors', 'Errors'),
    ...(state().q ? [field('matched', 'Matched in')] : []),
  ])
  const total = () => appended()?.total ?? initial()?.total
  const busy = () => request() && (!next() || next()?.status === 'loading' || next()?.status === 'refreshing')
  const pageError = () => request() && (next()?.status === 'error' || next()?.status === 'stale' ||
    (next()?.status === 'ready' && !Array.isArray(valid(next()?.data)?.rows)))
  const chips = createMemo(() => finderChips(state(), toolLabel))
  const result = (): Read => {
    if (noTools()) return { state: 'empty', message: 'No tools are selected in the Tool filter of this finder.' }
    if (first()?.data && !initial()) return { state: 'error', message: 'The server did not confirm the requested node scope.' }
    const read = detailRead(first(), initial()?.rows, ctx.paused(), { reading: 'sessions' })
    return read.state === 'error' ? { ...read, message: `Could not load sessions: ${read.message ?? 'The request failed.'}` } : read
  }
  const loadMore = () => {
    const current = key()
    if (!current) return
    if (pageError()) next.retry()
    else setMore({ key: current, offset: loaded().length })
  }
  const onSort = (column: string) => { const sorted = sortByColumn(state(), column); if (sorted) apply(sorted) }
  const tools = () => ctx.board('options')?.tools ?? []
  const toolValue = () => {
    const chosen = state().tools
    return chosen === null ? '' : chosen.length === 1 ? chosen[0] : '__several'
  }
  return <>
    <div class={styles.summary} role="group" aria-label="Sessions by status">
      <For each={summaryItems(initial()?.facets)} keyed={item => item.status}>{(item, index) => <>
        <Show when={index() > 0}><span aria-hidden="true">·</span></Show>
        <button type="button" class={styles.count} aria-pressed={state().status === item().status ? 'true' : 'false'}
          title={item().status ? `Show only sessions that are ${STATUS_LABELS[item().status as Exclude<FinderStatus, ''>].toLowerCase()}`
            : 'Show sessions of every status'}
          onClick={() => change({ status: state().status === item().status ? '' : item().status })}>
          <strong>{fmtN(item().count)}</strong> {item().label}
        </button>
      </>}</For>
    </div>
    <div class={styles.search}>
      <input type="search" class={css.input} aria-label="Search all past sessions" value={text()}
        placeholder="Name, id, project, prompt, file path or commit"
        title="Searches every stored session and every session file found on disk."
        onInput={event => setText(event.currentTarget.value)} />
      <label>
        <span class={styles.shown}>Sort </span>
        <select class={styles.field} aria-label="Sort sessions by" value={state().sort}
          onChange={event => change({ sort: event.currentTarget.value as FinderSort })}>
          <For each={Object.entries(SORT_LABELS)}>{entry => <option value={entry[0]}>{entry[1]}</option>}</For>
        </select>
      </label>
      <button type="button" class={css.button}
        title={state().order === 'desc' ? 'Largest or newest first. Select to reverse.' : 'Smallest or oldest first. Select to reverse.'}
        onClick={() => change({ order: state().order === 'desc' ? 'asc' : 'desc' })}>
        <span aria-hidden="true">{state().order === 'desc' ? '↓ ' : '↑ '}</span>{state().order === 'desc' ? 'Descending' : 'Ascending'}
      </button>
    </div>
    <details class={styles.filters}>
      <summary>Filters{chips().length ? ` (${chips().length} in use)` : ''}</summary>
      <div class={styles.grid}>
        <label>Status
          <select class={styles.field} value={state().status} onChange={event => change({ status: event.currentTarget.value as FinderStatus })}>
            <option value="">Any status</option>
            <For each={Object.entries(STATUS_LABELS)}>{entry => <option value={entry[0]}>{entry[1]}</option>}</For>
          </select>
        </label>
        <label>Active in
          <select class={styles.field} value={state().range}
            onChange={event => change({ range: event.currentTarget.value as FinderRange, since: undefined, until: undefined })}>
            <For each={Object.entries(RANGE_LABELS).filter(([id]) => id !== 'custom' || state().range === 'custom')}>{entry =>
              <option value={entry[0]}>{entry[1]}</option>}</For>
          </select>
        </label>
        <label>Tool
          <select class={styles.field} value={toolValue()}
            onChange={event => { const value = event.currentTarget.value; if (value !== '__several') change({ tools: value ? [value] : null }) }}>
            <option value="">All tools</option>
            <Show when={toolValue() === '__several'}><option value="__several">{`${state().tools?.length ?? 0} tools`}</option></Show>
            <For each={tools()}>{tool => <option value={tool.id}>{tool.label || tool.id}</option>}</For>
          </select>
        </label>
        <label>Name
          <select class={styles.field} value={state().name} onChange={event => change({ name: event.currentTarget.value as NameSource })}>
            <option value="">Any name</option>
            <For each={Object.entries(NAME_LABELS)}>{entry => <option value={entry[0]}>{entry[1]}</option>}</For>
          </select>
        </label>
        <label>Model
          <input class={styles.field} value={state().model} list="finder-models"
            onChange={event => change({ model: event.currentTarget.value.trim() })} />
          <datalist id="finder-models">
            <For each={ctx.board('options')?.models ?? []}>{model => <option value={model.id} />}</For>
          </datalist>
        </label>
        <label>At least tokens
          <input class={styles.field} type="number" min="0" step="1000" value={state().minTokens || ''}
            onChange={event => change({ minTokens: Math.max(0, Math.floor(Number(event.currentTarget.value) || 0)) })} />
        </label>
        <label>At least cost (USD)
          <input class={styles.field} type="number" min="0" step="0.1" value={state().minCost || ''}
            onChange={event => change({ minCost: Math.max(0, Number(event.currentTarget.value) || 0) })} />
        </label>
        <label data-check>
          <input type="checkbox" checked={state().errors} onChange={event => change({ errors: event.currentTarget.checked })} />
          Has errors
        </label>
      </div>
    </details>
    <Show when={chips().length}>
      <div class={styles.chips} role="group" aria-label="Filters in use">
        <For each={chips()} keyed={chip => chip.key}>{chip =>
          <button type="button" class={styles.chip} aria-label={`Remove filter ${chip().label}: ${chip().value}`}
            onClick={() => change(chip().clear)}>{chip().label}: {chip().value} <span aria-hidden="true">×</span></button>
        }</For>
        <button type="button" class={css.button} onClick={() => apply(clearAll(state()))}>Clear all</button>
      </div>
    </Show>
    <States result={result} empty={emptyReason(state(), initial(), chips())} retry={first.retry} reserveStaleSpace>
      <p class={styles.shown} role="status">
        Showing {loaded().length.toLocaleString()} of {counted(total())} sessions · sorted by {SORT_LABELS[state().sort].toLowerCase()},
        {' '}{state().order === 'desc' ? 'descending' : 'ascending'}
        {state().sort === 'last_activity' && state().order === 'desc' ? ' (running first)' : ''}
      </p>
      <Show when={rows().length}>
        <RowTable panel={props} rows={rows()} columns={columns()}
          action={entry => entry.row.openable === false ? undefined
            : { label: `Open ${String(entry.row.title)}`, run: () => ctx.openAgent(String(entry.row.id), 'flow') }}
          sorted={{ sort: { id: columnOf[state().sort], desc: state().order === 'desc' }, onSort, columns: sortable }}
          minWidth={`${Math.max(40, columns().length * 7)}rem`} />
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
