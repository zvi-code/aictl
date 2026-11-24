import { createEffect, createMemo, createSignal, untrack } from 'solid-js'
import type { BoardFields, DetailResponses, LiveTopicData, TopicSourceStatus } from '../data/contract.gen'
import { createResourceCache } from '../data/resource'
import { boardQuery, windowOf, withProjects, type Screen } from '../data/filters'
import SECTION_PATHS from './boardSections.json'
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

function useRead<T>(cache: ReturnType<typeof createResourceCache<string, T>>, asked: () => string | undefined, revision: () => number) {
  // The same key asked again is the same read: it is neither released nor read again.
  const key = createMemo(asked)
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

type SectionAnswer = DetailResponses['/api/history/board/section']
export type SectionId = keyof typeof SECTION_PATHS
const SECTION_IDS = Object.keys(SECTION_PATHS) as SectionId[]
/** What a panel says while it shows the board of the earlier range or filter. */
export const EARLIER_SELECTION = 'from the earlier selection, while the new one is read'
/** The window a board field is read for: the one shown (a selected interval when there is one), or the whole range. */
type Lane = 'shown' | 'whole'

/** The sections of a node or fleet board that answer a board field, or one key of it: the section that holds
 * it, or each section that holds a key of it (``board_sections.SECTIONS`` on the server). */
export function sectionsOf(field: string, path?: string): SectionId[] {
  const name = path ? `${field}.${path}` : field
  return SECTION_IDS.filter(id => (SECTION_PATHS[id] as readonly string[]).some(owned =>
    owned === name || owned.startsWith(`${name}.`) || name.startsWith(`${owned}.`)))
}

/** A field split between sections, joined key by key; a value that is not split is taken as it is. */
function join(a: unknown, b: unknown): unknown {
  const left = object(a), right = object(b)
  if (a === undefined) return b
  if (!left || !right) return a
  const out: Record<string, unknown> = { ...left }
  for (const [key, value] of Object.entries(right)) out[key] = join(out[key], value)
  return out
}

function scopeCheck(path: string, scope: { kind?: string; node_id?: string | null } | undefined) {
  const request = new URL(path, location.origin).searchParams
  const asked = request.get('scope') ?? 'local'
  if (scope?.kind !== asked || (asked === 'node' && scope.node_id !== request.get('node_id'))) {
    throw new Error('The server did not confirm the requested node scope.')
  }
}

export function panelData(ctx: Omit<PanelContext, 'board' | 'read' | 'metadata' | 'detail' | 'need'>, screen: () => Screen) {
  // This node's board comes from the live stream; with an interval selected, its whole-range charts are one read.
  const historyCache = createResourceCache({
    load: async (path, signal) => {
      const data = await json<DetailResponses['/api/history/board']>(path, { signal })
      scopeCheck(path, data.node_scope)
      return data
    },
  })
  const localWhole = useRead(historyCache, () => {
    const filters = ctx.filters()
    if (screen() !== 'board' || ctx.scope() !== 'local' || !filters.sel) return
    const query = new URLSearchParams(boardQuery(filters, ctx.tools(), windowOf(filters.range, ctx.startedAt)))
    query.set('view', 'charts')
    return `/api/history/board?${query}`
  }, ctx.revision)

  // A node or fleet board is read in sections, each by its own request, and only while a panel on screen
  // needs it (``need``). The page names itself and the window it reads (``viewer``), so the server starts
  // no more reads for a selection this page moved away from.
  const viewer = Math.random().toString(36).slice(2, 12)
  const sectionCache = createResourceCache({
    load: async (path, signal) => {
      const data = await json<SectionAnswer>(path, { signal })
      scopeCheck(path, data.node_scope)
      return data
    },
  })
  const sectionPath = (lane: Lane, id: SectionId) => {
    const filters = ctx.filters()
    if (screen() !== 'board' || ctx.scope() === 'local' || (lane === 'whole' && !filters.sel)) return
    const win = lane === 'shown' && filters.sel ? filters.sel : windowOf(filters.range, ctx.startedAt)
    const query = new URLSearchParams(boardQuery(filters, ctx.tools(), win))
    query.set('scope', ctx.scope())
    if (ctx.scope() === 'node') query.set('node_id', ctx.nodeId() ?? '')
    query.set('section', id)
    query.set('viewer', `${viewer}-${lane}`)
    return `/api/history/board/section?${query}`
  }
  // How many panels on screen need each section, by lane and section.
  const needs = new Map<string, number>()
  const [needed, setNeeded] = createSignal(0)
  // A section asked for stays held for its selection while the page scrolls: a panel that leaves and comes
  // back shows its answer without asking again. A section no panel has needed is never asked for.
  const asked = new Set<string>()
  const wanted = (lane: Lane, id: SectionId) => {
    needed()
    const path = sectionPath(lane, id)
    if (!path) return false
    if ((needs.get(`${lane}:${id}`) ?? 0) > 0) {
      if (asked.size > 4 * SECTION_IDS.length) asked.clear()
      asked.add(path)
    }
    return asked.has(path)
  }
  const lanes = { shown: {}, whole: {} } as Record<Lane, Record<SectionId, ReturnType<typeof useRead<SectionAnswer>>>>
  for (const lane of ['shown', 'whole'] as const) {
    for (const id of SECTION_IDS) {
      lanes[lane][id] = useRead(sectionCache, () => wanted(lane, id) ? sectionPath(lane, id) : undefined, ctx.revision)
    }
  }
  // Each section read last stays on screen, marked as the earlier selection, until its own answer for a
  // new range or filter arrives: a change never blanks a section.
  const shown = new Map<string, { key: string; data: SectionAnswer }>()
  const section = (lane: Lane, id: SectionId) => {
    const state = lanes[lane][id](), key = sectionPath(lane, id), slot = `${lane}:${id}`
    if (state?.data && key) shown.set(slot, { key, data: state.data })
    const before = shown.get(slot)
    if (before && key && before.key !== key && (!state || state.status === 'loading')) {
      return { state: { status: 'stale' as const, data: before.data, error: null }, earlier: true }
    }
    return { state, earlier: false }
  }
  const need: PanelContext['need'] = sources => {
    createEffect(() => {
      const keys = new Set<string>()
      for (const source of sources) {
        if (!('field' in source)) continue
        const lane: Lane = source.wholeRange && ctx.filters().sel ? 'whole' : 'shown'
        for (const id of sectionsOf(source.field, source.path)) keys.add(`${lane}:${id}`)
      }
      return [...keys]
    }, keys => {
      for (const key of keys) needs.set(key, (needs.get(key) ?? 0) + 1)
      setNeeded(n => n + 1)
      return () => {
        for (const key of keys) needs.set(key, (needs.get(key) ?? 1) - 1)
        setNeeded(n => n + 1)
      }
    })
  }
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
    let note: string | undefined
    // A field the server names as failed, such as "kpis.prev", covers its own path and the paths under it.
    const fieldPath = 'field' in source ? [source.field, source.path].filter(Boolean).join('.') : ''
    const covers = (listed: string) => fieldPath === listed || fieldPath.startsWith(listed + '.')
    const failedField = (errors: Record<string, string> | undefined) =>
      Object.entries(errors ?? {}).find(([listed]) => covers(listed))?.[1]
    if ('field' in source && ctx.scope() !== 'local') {
      // Each section that answers the field gives its part; a part still to come or failed is absent, never 0.
      const lane: Lane = source.wholeRange && ctx.filters().sel ? 'whole' : 'shown'
      for (const id of sectionsOf(source.field, source.path)) {
        const { state, earlier } = section(lane, id)
        if (state?.data) {
          value = join(value, at(at(state.data.fields, source.field), source.path))
          updatedAt ??= state.data.generated_at
          stale ||= !earlier && (state.status === 'stale' || state.status === 'refreshing')
          if (earlier) note = EARLIER_SELECTION
        } else if (state?.status === 'error') {
          fault ??= state.error instanceof Error ? state.error.message : String(state.error)
        } else pending = true
      }
      stale ||= note !== undefined
    } else if ('field' in source && source.wholeRange && ctx.filters().sel) {
      const resource = localWhole()
      value = at(at(resource?.data, source.field), source.path)
      updatedAt = resource?.data?.generated_at
      pending = !resource || resource.status === 'loading'
      stale ||= resource?.status === 'stale' || resource?.status === 'refreshing'
      if (resource?.error) fault = String(resource.error)
      fieldFault = failedField(resource?.data?.field_errors)
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
    // A field the server could not read while the rest of the board was read shows its own reason.
    if (value == null && fieldFault) return { state: 'error', message: fieldFault }
    if (value == null) return { state: fault ? 'error' : pending ? 'loading' : 'unavailable', message: fault ?? note }
    if (stale) return { state: 'stale', value, rowKeys, updatedAt, ...(note ? { message: note } : {}) }
    if (Array.isArray(value) && !value.length) return { state: 'empty', value, rowKeys, updatedAt }
    return { state: 'ready', value, rowKeys, updatedAt }
  }
  return {
    read,
    need,
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
