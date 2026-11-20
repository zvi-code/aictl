import { createEffect, createMemo, createSignal, untrack } from 'solid-js'
import type { BoardFields, LiveTopicData, TopicSourceStatus } from '../data/contract.gen'
import { createResourceCache } from '../data/resource'
import { boardQuery, windowOf, type Screen } from '../data/filters'
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

export function panelData(ctx: Omit<PanelContext, 'board' | 'read' | 'metadata' | 'detail'>, screen: () => Screen) {
  const historyCache = createResourceCache({
    load: async (path, signal) => {
      const data = await json<Partial<BoardFields>>(path, { signal })
      const request = new URL(path, location.origin).searchParams
      const scope = request.get('scope')
      if (scope && (data.node_scope?.kind !== scope ||
          (scope === 'node' && data.node_scope?.node_id !== request.get('node_id')))) {
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
    if (ctx.scope() !== 'local') query.set('scope', ctx.scope())
    if (ctx.scope() === 'node') query.set('node_id', ctx.nodeId() ?? '')
    return `/api/board?${query}`
  }
  const remote = useRead(historyCache, () => path(false), ctx.revision)
  const whole = useRead(historyCache, () => ctx.filters().sel ? path(true) : undefined, ctx.revision)
  const detailCache = createResourceCache({ load: (path, signal) => json<unknown>(path, { signal }) })
  const textCache = createResourceCache<string, unknown>({ load: async (path, signal) => {
    const response = await fetch(path, { signal })
    if (!response.ok) throw new Error(response.status === 403 ? 'aictl may not read this file.' : `Could not read the file (HTTP ${response.status}).`)
    return response.text()
  } })
  const detail: PanelContext['detail'] = <T>(path: () => string | undefined, format?: 'text') => {
    const state = useRead(format === 'text' ? textCache : detailCache, path, ctx.revision)
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
    let stale = ctx.paused(), pending = false, fault: string | undefined
    if ('field' in source && (ctx.scope() !== 'local' || (source.wholeRange && ctx.filters().sel))) {
      const resource = source.wholeRange && ctx.filters().sel ? whole() : remote()
      value = at(resource?.data?.[source.field], source.path)
      pending = !resource || resource.status === 'loading'
      stale ||= resource?.status === 'stale' || resource?.status === 'refreshing'
      if (resource?.error) fault = String(resource.error)
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
      pending = !store.meta.ready || relevant.some(status => 'pending' in status && status.pending)
      fault = relevant.flatMap(status => 'error' in status && status.error ? [status.error] : [])[0] ?? ctx.client.status.error?.message
      stale ||= Boolean(fault) || relevant.some(status => ('stale' in status && status.stale) || ('pending' in status && status.pending))
    }
    if (value == null) return { state: fault ? 'error' : pending ? 'loading' : 'unavailable', message: fault }
    if (stale) return { state: 'stale', value, rowKeys }
    if (Array.isArray(value) && !value.length) return { state: 'empty', value, rowKeys }
    return { state: 'ready', value, rowKeys }
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

export function detailRead<T>(resource: DetailState<T> | undefined, value: unknown, paused = false): Read {
  const message = resource?.error instanceof Error ? resource.error.message :
    resource?.error ? String(resource.error) : undefined
  if (!resource || resource.status === 'loading') return { state: 'loading' }
  if (resource.status === 'error') return { state: 'error', message }
  if (value == null) return { state: 'unavailable' }
  if (paused || resource.status === 'refreshing' || resource.status === 'stale') return { state: 'stale', value, message }
  return { state: Array.isArray(value) && !value.length ? 'empty' : 'ready', value }
}

export function detailPath(ctx: PanelContext, route: string, query = new URLSearchParams()) {
  if (ctx.scope() !== 'local') query.set('scope', ctx.scope())
  if (ctx.scope() === 'node') query.set('node_id', ctx.nodeId() ?? '')
  return query.size ? `${route}?${query}` : route
}

export function scopeConfirmed(ctx: PanelContext, scope: BoardFields['node_scope'] | undefined) {
  return ctx.scope() === 'local' ||
    (scope?.kind === ctx.scope() && (scope.kind !== 'node' || scope.node_id === ctx.nodeId()))
}
