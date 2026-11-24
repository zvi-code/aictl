import { createStore, type StoreSetter } from 'solid-js'
import type { AppliedLiveChange, LiveStore } from './store'

interface ResourceState<Value> {
  status: 'loading' | 'ready' | 'refreshing' | 'error' | 'stale'
  data: Value | undefined
  error: unknown
}

interface Entry<Value> {
  state: Readonly<ResourceState<Value>>
  setState: StoreSetter<ResourceState<Value>>
  consumers: number
  request?: AbortController
  hasData: boolean
  invalidated: boolean
  /** What the answer was read for (acquire's *token*); with keepAnswers, the same token reads nothing again. */
  token?: unknown
}

interface ResourceOptions<Key extends string, Value> {
  load: (key: Key, signal: AbortSignal, fetch: typeof globalThis.fetch) => Promise<Value>
  fetch?: typeof globalThis.fetch
  /** How many released keys are kept with their last answer (default IDLE_KEYS). */
  idleKeys?: number
  /** A released key that is acquired again with the token its answer was read for shows that answer and
   * reads nothing: the page shows what it showed before, until its source says the data changed. */
  keepAnswers?: boolean
  live?: {
    store: Pick<LiveStore, 'subscribeApplied'>
    relatesTo: (key: Key, change: AppliedLiveChange) => boolean
  }
}

/** Released keys kept, with their read in flight or their last answer. Few, so released reads
 * cannot take the browser's few connections to the server from the reads on screen. */
export const IDLE_KEYS = 4
/** The token of an answer whose newer read was stopped: no acquire matches it, so the key is read again. */
const STOPPED = Symbol('stopped')

export function createResourceCache<Key extends string, Value>({
  load, fetch = (input, init) => globalThis.fetch(input, init), live, idleKeys = IDLE_KEYS, keepAnswers = false,
}: ResourceOptions<Key, Value>) {
  const entries = new Map<Key, Entry<Value>>()
  let unsubscribe: (() => void) | undefined

  async function read(key: Key, entry: Entry<Value>) {
    if (entry.request || entry.consumers === 0) return
    const request = new AbortController()
    entry.request = request
    entry.setState(draft => {
      draft.status = entry.hasData ? 'refreshing' : 'loading'
      draft.error = null
    })
    try {
      const data = await load(key, request.signal, fetch)
      if (request.signal.aborted) return
      entry.hasData = true
      entry.setState(draft => {
        draft.status = 'ready'
        draft.data = data
      })
    } catch (error) {
      if (request.signal.aborted) return
      entry.setState(draft => {
        draft.status = entry.hasData ? 'stale' : 'error'
        draft.error = error
      })
    } finally {
      // A read stopped by stopRead has already given its place away.
      if (entry.request !== request) return
      entry.request = undefined
      // If the source changed during this read, make one more read after it ends.
      if (entry.invalidated) {
        entry.invalidated = false
        void read(key, entry)
      }
    }
  }

  function onApplied(changes: readonly AppliedLiveChange[]) {
    if (!live || !changes.length) return
    for (const [key, entry] of entries) {
      if (!changes.some(change => live.relatesTo(key, change))) continue
      if (entry.request) entry.invalidated = true
      else void read(key, entry)
    }
  }

  // Keys no panel reads now, oldest first. A panel that scrolls away and back within these keys
  // joins its read still in flight, or shows its last answer while it reads again, instead of
  // aborting a slow read and starting it over each time it comes into view.
  const idle = new Set<Key>()

  function drop(key: Key) {
    const entry = entries.get(key)
    idle.delete(key)
    entries.delete(key)
    entry?.request?.abort()
    if (entries.size === 0) {
      unsubscribe?.()
      unsubscribe = undefined
    }
  }

  /** Stop a released key's read in flight. Its last answer stays; without one the key is dropped. */
  function stopRead(key: Key, entry: Entry<Value>) {
    if (!entry.hasData) { drop(key); return }
    entry.request?.abort()
    entry.request = undefined
    entry.invalidated = false
    entry.token = STOPPED
    entry.setState(draft => { draft.status = 'ready' })
  }

  return {
    // Release the handle when its panel hides, unmounts, or changes key. *token* names what the answer
    // is read for (a refresh count, for example): see keepAnswers.
    acquire(key: Key, token?: unknown) {
      let entry = entries.get(key)
      if (!entry) {
        const [state, setState] = createStore<ResourceState<Value>>({ status: 'loading', data: undefined, error: null })
        entry = { state, setState, consumers: 0, hasData: false, invalidated: false }
        entries.set(key, entry)
      }
      idle.delete(key)
      const mine = entry
      mine.consumers++
      unsubscribe ??= live?.store.subscribeApplied(onApplied)
      const kept = keepAnswers && mine.hasData && mine.token === token && mine.state.status === 'ready'
      if (mine.consumers === 1 && !kept) {
        mine.token = token
        void read(key, mine)
      }
      let released = false
      return {
        state: mine.state,
        refetch(next?: unknown) {
          if (released) return
          mine.token = next
          return read(key, mine)
        },
        release() {
          if (released) return
          released = true
          if (--mine.consumers !== 0) return
          idle.add(key)
          while (idle.size > idleKeys) drop(idle.values().next().value!)
          // Reads no panel waits for: only a few go on, oldest stopped first, so they cannot take the
          // browser's few connections from the reads on screen.
          const reading = [...idle].filter(other => entries.get(other)?.request)
          for (const other of reading.slice(0, Math.max(0, reading.length - IDLE_KEYS))) stopRead(other, entries.get(other)!)
        },
      }
    },
  }
}
