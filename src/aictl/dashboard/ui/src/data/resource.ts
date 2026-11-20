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
}

interface ResourceOptions<Key extends string, Value> {
  load: (key: Key, signal: AbortSignal, fetch: typeof globalThis.fetch) => Promise<Value>
  fetch?: typeof globalThis.fetch
  live?: {
    store: Pick<LiveStore, 'subscribeApplied'>
    relatesTo: (key: Key, change: AppliedLiveChange) => boolean
  }
}

export function createResourceCache<Key extends string, Value>({
  load, fetch = (input, init) => globalThis.fetch(input, init), live,
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

  return {
    // Release the handle when its panel hides, unmounts, or changes key.
    acquire(key: Key) {
      let entry = entries.get(key)
      if (!entry) {
        const [state, setState] = createStore<ResourceState<Value>>({ status: 'loading', data: undefined, error: null })
        entry = { state, setState, consumers: 0, hasData: false, invalidated: false }
        entries.set(key, entry)
      }
      const mine = entry
      mine.consumers++
      unsubscribe ??= live?.store.subscribeApplied(onApplied)
      if (mine.consumers === 1) void read(key, mine)
      let released = false
      return {
        state: mine.state,
        refetch() { if (!released) return read(key, mine) },
        release() {
          if (released) return
          released = true
          if (--mine.consumers !== 0) return
          entries.delete(key)
          if (entries.size === 0) {
            unsubscribe?.()
            unsubscribe = undefined
          }
          mine.request?.abort()
        },
      }
    },
  }
}
