import { createEffect, createMemo, createSignal, untrack } from 'solid-js'
import type { BoardFields, DetailResponses, LiveTopicData, TopicSourceStatus } from '../data/contract.gen'
import { createResourceCache } from '../data/resource'
import { boardQuery, windowOf, withProjects, type Screen } from '../data/filters'
import type { DetailState, PanelContext, Read, Row, Source } from './types'

export function object(value: unknown): Row | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : undefined
}

export function at(value: unknown, path?: string): unknown {
  return path ? path.split('.').reduce<unknown>((entry, key) => {
    const row = object(entry)
    return row && Object.hasOwn(row, key) ? row[key] : undefined
  }, value) : value
}

export async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`)
  }
  return response.json()
}

export function topic<K extends keyof LiveTopicData>(client: PanelContext['client'], name: K, id: string) {
  return client.store.topic(name)?.get(id)?.data as LiveTopicData[K] | undefined
}

export function statuses(client: PanelContext['client']) {
  return [...(client.store.topic('source.status')?.values() ?? [])]
    .map(entity => entity.data as TopicSourceStatus)
    .filter(status => !('scope' in status) || !status.scope || status.scope === client.store.meta.scope)
}

function useRead<T>(cache: ReturnType<typeof createResourceCache<string, T>>, key: () => string | undefined, revision: () => number) {
  const [handle, setHandle] = createSignal<{ key: string; resource: ReturnType<typeof cache.acquire> }>()
  createEffect(key, path => {
    if (!path) { setHandle(undefined); return }
    const resource = cache.acquire(path)
    setHandle({ key: path, resource })
    return () => resource.release()
  })
  const current = () => {
    const value = handle()
    return value?.key === key() ? value?.resource : undefined
  }
  createEffect(revision, value => { if (value) void current()?.refetch() })
  const state = () => current()?.state
  const retry = () => untrack(() => { void current()?.refetch() })
  return untrack(() => Object.assign(state, { retry }))
}

type HistoryBoard = DetailResponses['/api/history/board']
/** How long a staged board waits before it asks for the fields still to come. */
export const STAGE_POLL_MS = 1000
/** What a panel says while it shows the board of the earlier range or filter. */
export const EARLIER_SELECTION = 'from the earlier selection, while the new one is read'

export function panelData(ctx: Omit<PanelContext, 'board' | 'read' | 'metadata' | 'detail'>, screen: () => Screen) {
  const historyCache = createResourceCache({
    load: async (path, signal) => {
      const data = await json<DetailResponses['/api/history/board']>(path, { signal })
      const request = new URL(path, location.origin).searchParams
      const scope = request.get('scope') ?? 'local'
      if (data.node_scope?.kind !== scope ||
          (scope === 'node' && data.node_scope.node_id !== request.get('node_id'))) {
        throw new Error('The server did not confirm the requested node scope.')
      }
      return data
    },
  })
  const path = (whole: boolean) => {
    if (screen() !== 'board' || (ctx.scope() === 'local' && !(whole && ctx.filters().sel))) return
    const filters = ctx.filters()
    const win = !whole && filters.sel ? filters.sel : windowOf(filters.range, ctx.startedAt)
    const query = new URLSearchParams(boardQuery(filters, ctx.tools(), win))
    if (whole) query.set('view', 'charts')
    if (ctx.scope() !== 'local') query.set('scope', ctx.scope())
    if (ctx.scope() === 'node') query.set('node_id', ctx.nodeId() ?? '')
    return `/api/history/board?${query}`
  }
  const remote = useRead(historyCache, () => path(false), ctx.revision)
  const whole = useRead(historyCache, () => ctx.filters().sel ? path(true) : undefined, ctx.revision)
  // A board answered in stages names the fields still to come: ask again until none is.
  createEffect(() => {
    const state = remote()
    return state?.status === 'ready' && state.data?.pending_fields?.length ? state.data : undefined
  }, staged => {
    if (!staged) return
    const timer = setTimeout(() => remote.retry(), STAGE_POLL_MS)
    return () => clearTimeout(timer)
  })
  // The board read last stays on screen, marked as the earlier selection, until the first answer
  // for a new range or filter arrives: a change never blanks the board.
  let shown: { key: string; data: HistoryBoard } | undefined
  const board = createMemo(() => {
    const state = remote(), key = path(false)
    if (state?.data && key) shown = { key, data: state.data }
    if (shown && key && shown.key !== key && (!state || state.status === 'loading')) {
      return { state: { status: 'stale' as const, data: shown.data, error: null }, earlier: true }
    }
    return { state, earlier: false }
  })
  const detailCache = createResourceCache({ load: (path, signal) => json<unknown>(path, { signal }) })
  const textCache = createResourceCache<string, unknown>({ load: async (path, signal) => {
    const response = await fetch(path, { signal })
    if (!response.ok) throw new Error(response.status === 403 ? 'aictl may not read this file.' : `Could not read the file (HTTP ${response.status}).`)
    return response.text()
  } })
  // Every panel's own route carries the project filter of the page, whichever helper built its path.
  const detail: PanelContext['detail'] = <T>(path: () => string | undefined, format?: 'text') => {
    const scoped = () => {
      const value = path()
      return value && withProjects(value, ctx.filters())
    }
    const state = useRead(format === 'text' ? textCache : detailCache, scoped, ctx.revision)
    return Object.assign(() => state() as DetailState<T> | undefined, { retry: state.retry })
  }
  const catalog = detail<unknown[]>(() => {
    const route = ctx.client.store.meta.capabilities?.datapoint_catalog
    return screen() !== 'settings' && (route === '/api/datapoints' || ctx.scope() !== 'local') ? '/api/datapoints' : undefined
  })
  const entries = createMemo(() => new Map((Array.isArray(catalog()?.data) ? catalog()!.data! : []).flatMap(entry => {
    const row = object(entry)
    return typeof row?.key === 'string' ? [[row.key, row] as const] : []
  })))
  const sourceStatuses = createMemo(() => statuses(ctx.client))
  const read = (source: Source): Read => {
    if ('route' in source) return { state: 'unavailable' }
    let value: unknown, rowKeys: readonly string[] | undefined
    let updatedAt: number | undefined
    let stale = ctx.paused(), pending = false, fault: string | undefined, fieldFault: string | undefined
    let coming = false, note: string | undefined
    // A field the server names as failed, such as "kpis.prev", covers its own path and the paths under it.
    const fieldPath = 'field' in source ? [source.field, source.path].filter(Boolean).join('.') : ''
    const covers = (listed: string) => fieldPath === listed || fieldPath.startsWith(listed + '.')
    const failedField = (errors: Record<string, string> | undefined) =>
      Object.entries(errors ?? {}).find(([listed]) => covers(listed))?.[1]
    if ('field' in source && (ctx.scope() !== 'local' || (source.wholeRange && ctx.filters().sel))) {
      const shownBoard = board()
      const wholeRange = source.wholeRange && ctx.filters().sel
      const resource = wholeRange ? whole() : shownBoard.state
      value = at(at(resource?.data, source.field), source.path)
      updatedAt = resource?.data?.generated_at
      pending = !resource || resource.status === 'loading'
      // A stage of the board is final for the fields it has: asking for the rest does not make them stale.
      const staged = Boolean(resource?.data?.pending_fields?.length)
      stale ||= resource?.status === 'stale' || (resource?.status === 'refreshing' && !staged)
      if (resource?.error) fault = String(resource.error)
      fieldFault = failedField(resource?.data?.field_errors)
      if (!wholeRange && shownBoard.earlier) note = EARLIER_SELECTION
      else coming = (resource?.data?.pending_fields ?? []).some(covers)
    } else if (ctx.scope() !== 'local') {
      return { state: 'unavailable' }
    } else {
      const name = 'field' in source ? 'history.board' : source.topic
      const store = ctx.client.store
      if ('field' in source) {
        const field = store.boardField(source.field)
        value = at(field.value, source.path)
        rowKeys = source.path ? undefined : field.rowKeys
      } else {
        const index = store.topic(source.topic)
        if (source.entity) value = at(index?.get(source.entity)?.data, source.path)
        else if (index) {
          const entities = [...index.values()]
          value = entities.map(entity => at(entity.data, source.path))
          rowKeys = entities.map(entity => entity.id)
        }

      }
      const relevant = sourceStatuses().filter(status => ('topic' in status && status.topic === name) ||
        ('topics' in status && status.topics.includes(name)))
      const history = 'field' in source ? relevant.find((status): status is Extract<TopicSourceStatus, { component: 'history' }> =>
        'component' in status && status.component === 'history') : undefined
      // A first load names the fields still to come: a field that is already there is final, not stale.
      const staged = history?.pending && Array.isArray(history.pending_fields)
      const waiting = (status: TopicSourceStatus) => 'pending' in status && status.pending &&
        (status !== history || !staged || history.pending_fields!.some(covers))
      if ('field' in source) {
        const generated = store.boardField('generated_at').value
        updatedAt = typeof generated === 'number' ? generated : history?.computed_at
        fieldFault = failedField(history?.field_errors)
      }
      pending = !store.meta.ready || relevant.some(waiting)
      fault = relevant.flatMap(status => 'error' in status && status.error ? [status.error] : [])[0] ?? ctx.client.status.error?.message
      stale ||= Boolean(fault) || relevant.some(status => ('stale' in status && status.stale) || waiting(status))
    }
    // A field the server is still reading says so, never 0.
    if (value == null && coming) return { state: 'loading' }
    // A field the server could not read while the rest of the board was read shows its own reason.
    if (value == null && fieldFault) return { state: 'error', message: fieldFault }
    if (value == null) return { state: fault ? 'error' : pending ? 'loading' : 'unavailable', message: fault ?? note }
    if (stale) return { state: 'stale', value, rowKeys, updatedAt, ...(note ? { message: note } : {}) }
    if (Array.isArray(value) && !value.length) return { state: 'empty', value, rowKeys, updatedAt }
    return { state: 'ready', value, rowKeys, updatedAt }
  }
  return {
    read,
    detail,
    board<K extends keyof BoardFields>(field: K, wholeRange = false) {
      return read({ field, wholeRange }).value as BoardFields[K] | undefined
    },
    metadata(key: string) {
      const entry = entries().get(key)
      if (!entry) return
      return {
        label: typeof entry.label === 'string' ? entry.label : key.split('.').at(-1)?.replaceAll('_', ' '),
        unit: typeof entry.unit === 'string' ? entry.unit : undefined,
        format: typeof entry.format === 'string' ? entry.format : undefined,
      }
    },
  }
}

/** A panel's state from its own route. *waiting* says what a slow load waits for: `{ reading }` names in plain
 * words what it reads, such as "sessions" (a board panel keeps the view name only where it shows the query);
 * a string is what the load waits for, such as an Insights card's query. */
export function detailRead<T>(resource: DetailState<T> | undefined, value: unknown, paused = false,
  waiting?: string | { reading: string }): Read {
  const message = resource?.error instanceof Error ? resource.error.message :
    resource?.error ? String(resource.error) : undefined
  if (!resource || resource.status === 'loading') return { state: 'loading', message: waiting &&
    (typeof waiting === 'string' ? `Waiting for ${waiting}…` : `Reading ${waiting.reading}…`) }
  if (resource.status === 'error') return { state: 'error', message }
  if (value == null) return { state: 'unavailable' }
  if (paused || resource.status === 'refreshing' || resource.status === 'stale') return { state: 'stale', value, message }
  return { state: Array.isArray(value) && !value.length ? 'empty' : 'ready', value }
}

export function detailPath(ctx: PanelContext, route: string, query = new URLSearchParams()) {
  if (ctx.scope() !== 'local') query.set('scope', ctx.scope())
  if (ctx.scope() === 'node') query.set('node_id', ctx.nodeId() ?? '')
  return withProjects(query.size ? `${route}?${query}` : route, ctx.filters())
}

export function scopeConfirmed(ctx: PanelContext, scope: BoardFields['node_scope'] | undefined) {
  return ctx.scope() === 'local' ||
    (scope?.kind === ctx.scope() && (scope.kind !== 'node' || scope.node_id === ctx.nodeId()))
}
