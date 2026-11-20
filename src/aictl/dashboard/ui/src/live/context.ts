import { createContext, h, type ComponentChildren } from 'preact'
import { useContext, useEffect, useMemo, useState } from 'preact/hooks'
import { createEffect, createRoot } from 'solid-js'
import type { LiveEntity } from '../data/store'
import { createLiveClient, type LiveClient } from '../data/live'

const LiveContext = createContext<LiveClient | null>(null)

export function LiveProvider({ children, controller, enabled = true, initial, manageConnection = true }: {
  children?: ComponentChildren
  controller?: LiveClient
  enabled?: boolean
  initial?: Parameters<typeof createLiveClient>[0]
  manageConnection?: boolean
}) {
  const client = useMemo(() => controller ?? createLiveClient(initial), [controller]) // Initial URL only.
  useEffect(() => {
    if (enabled && manageConnection) {
      client.start()
      return () => client.stop()
    }
  }, [client, enabled, manageConnection])
  return h(LiveContext.Provider, { value: enabled ? client : null }, children)
}

type Topic = ReadonlyMap<string, LiveEntity>
const topicSnapshot = (client: LiveClient, topic: string): Topic =>
  new Map(Array.from(client.store.topic(topic)?.values() ?? [], entity => [entity.id, entity]))

function metadata(client: LiveClient | null) {
  const store = client?.store.meta
  const status = client?.status
  return {
    ready: store?.ready ?? false, capabilities: store?.capabilities ?? null,
    orderedGap: store?.orderedGap ?? false, retention: store?.retention ?? null,
    connected: status?.connected ?? false, everConnected: status?.everConnected ?? false, error: status?.error ?? null,
  }
}

function snapshot(client: LiveClient | null, topics: readonly string[]) {
  return {
    ...metadata(client),
    topics: new Map(topics.flatMap(topic => client ? [[topic, topicSnapshot(client, topic)] as const] : [])),
  }
}

const NO_TOPICS: readonly string[] = []

// Keep immutable references for Preact. Unrelated topics and cursor updates do not redraw a consumer.
export function useLiveState(topics: readonly string[] = NO_TOPICS) {
  const client = useContext(LiveContext)
  const read = () => ({ client, topics, state: snapshot(client, topics) })
  const [value, setValue] = useState(read)
  useEffect(() => {
    let current = read()
    setValue(current)
    if (!client) return
    const put = (patch: Partial<typeof current.state>) => {
      current = { ...current, state: { ...current.state, ...patch } }
      setValue(current)
    }
    const unsubscribe = client.store.subscribeApplied(changes => {
      const changed = new Set(changes.map(change => change.entity.topic))
      const affected = topics.filter(topic => changed.has(topic))
      if (!affected.length) return
      const next = new Map(current.state.topics)
      for (const topic of affected) next.set(topic, topicSnapshot(client, topic))
      put({ topics: next })
    })
    const dispose = createRoot(dispose => {
      createEffect(() => metadata(client), next => put(next))
      return dispose
    })
    return () => { unsubscribe(); dispose() }
  }, [client, topics])
  return { client, state: value.client === client && value.topics === topics ? value.state : read().state }
}
