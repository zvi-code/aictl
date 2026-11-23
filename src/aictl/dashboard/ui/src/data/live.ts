import { createStore } from 'solid-js'
import { canonicalScope, createLiveStore, type FrameScheduler, type LiveStore } from './store'

interface LiveSource {
  onopen: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
  addEventListener(type: 'bootstrap' | 'change', listener: (event: MessageEvent<string>) => void): void
  close(): void
}

interface LiveRequest {
  query: string
  history: boolean
  live: boolean
  requiredTopics: readonly string[]
}

interface LiveOptions extends Partial<LiveRequest> {
  frames?: FrameScheduler
  eventSource?: (url: string) => LiveSource
  retryMs?: number
  maxRetryMs?: number
}

function requestedBaselinesReady(store: LiveStore, requiredTopics: readonly string[]) {
  if (!store.meta.ready) return false
  const statuses = [...(store.topic('source.status')?.values() ?? [])]
    .filter(({ data }) => !data.scope || data.scope === store.meta.scope)
  return requiredTopics.every(topic => {
    let matched = false
    for (const { data } of statuses) {
      if (data.topic === topic || (Array.isArray(data.topics) && data.topics.includes(topic))
          || (topic === 'history.board' && data.component === 'history' && data.scope === store.meta.scope)) {
        matched = true
        // A first load published in parts is not a baseline until its last part, which lists no pending fields.
        if (Array.isArray(data.pending_fields) && data.pending_fields.length && data.pending !== false) continue
        if (data.ready === true || (data.pending === false && data.error)) return true
      }
    }
    if (matched) return false
    return (store.topic(topic)?.size ?? 0) > 0
  })
}

/** Create one client per browser tab. Call start before loading the screen. */
export function createLiveClient({
  query = '', history = true, live = true, requiredTopics = history ? ['history.board'] : [],
  frames, eventSource = url => new EventSource(url),
  retryMs = 1000, maxRetryMs = 30000,
}: LiveOptions = {}) {
  const store = createLiveStore({ query, frames })
  const [status, setStatus] = createStore({
    connected: false, everConnected: false, error: null as Error | null,
  })
  let request: LiveRequest = { query: canonicalScope(query), history, live, requiredTopics }
  let active = false
  let source: LiveSource | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let retry = retryMs
  let unsubscribe: (() => void) | undefined

  const baselineComplete = () => !request.live && store.cursor !== null && store.meta.cursor === store.cursor
    && requestedBaselinesReady(store, request.requiredTopics)

  function disconnect() {
    clearTimeout(timer)
    timer = undefined
    const old = source
    source = undefined
    old?.close()
    setStatus(draft => { draft.connected = false })
  }

  function retryConnection() {
    if (!active || baselineComplete()) return
    timer = setTimeout(() => { timer = undefined; connect() }, retry)
    retry = Math.min(retry * 2, maxRetryMs)
  }

  function fail(error: Error, resync: boolean) {
    disconnect()
    if (resync) store.requireSnapshot()
    setStatus(draft => { draft.error = error })
    retryConnection()
  }

  function connect() {
    if (!active || source || timer !== undefined || baselineComplete()) return
    const params = new URLSearchParams(request.query)
    if (!request.history) params.set('history', '0')
    if (store.cursor !== null) params.set('cursor', store.cursor)
    const search = params.toString()
    let es: LiveSource
    try {
      es = eventSource('/api/live/stream' + (search ? '?' + search : ''))
    } catch (error) {
      fail(asError(error), false)
      return
    }
    source = es
    es.onopen = () => {
      if (source !== es) return
      retry = retryMs
      setStatus(draft => {
        draft.connected = true
        draft.everConnected = true
        draft.error = null
      })
    }
    const receive = (type: 'bootstrap' | 'change') => (event: MessageEvent<string>) => {
      if (source !== es) return
      try {
        if (store.receive(type, JSON.parse(event.data))) setStatus(draft => { draft.error = null })
      } catch (error) {
        fail(asError(error), true)
      }
    }
    es.addEventListener('bootstrap', receive('bootstrap'))
    es.addEventListener('change', receive('change'))
    es.onerror = () => {
      if (source !== es) return
      fail(new Error('Live subscription disconnected. Showing the last received values.'), false)
    }
  }

  return {
    store,
    status: status as Readonly<typeof status>,
    start() {
      if (active) return
      active = true
      unsubscribe = store.subscribeApplied(() => { if (baselineComplete()) disconnect() })
      connect()
    },
    configure(next: Partial<LiveRequest>) {
      const scope = canonicalScope(next.query ?? request.query)
      const newHistory = next.history ?? request.history
      const changed = scope !== request.query || newHistory !== request.history
      const resumed = !request.live && next.live === true
      request = {
        ...request, ...next, query: scope, history: newHistory,
        requiredTopics: next.requiredTopics ?? (next.history === undefined ? request.requiredTopics : newHistory ? ['history.board'] : []),
      }
      if (changed) {
        disconnect()
        store.resetScope(scope)
      } else if (baselineComplete()) {
        disconnect()
      } else if (resumed) {
        clearTimeout(timer)
        timer = undefined
      }
      connect()
    },
    resync() {
      disconnect()
      store.requireSnapshot()
      connect()
    },
    stop() {
      active = false
      unsubscribe?.()
      unsubscribe = undefined
      disconnect()
    },
  }
}

export type LiveClient = ReturnType<typeof createLiveClient>

function asError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error))
}
