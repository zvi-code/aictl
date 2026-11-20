import { createContext, h, type ComponentChildren } from 'preact'
import { useContext, useEffect, useMemo, useState } from 'preact/hooks'
import { createEffect, createRoot } from 'solid-js'
import type { LiveEntity } from '../data/store'
import { projectBoard } from './boardProjection'
import { createLiveClient, type LiveClient } from '../data/live'

const LiveContext = createContext<LiveClient | null>(null)

export function LiveProvider({ children, controller, enabled = true, initial }: {
  children?: ComponentChildren
  controller?: LiveClient
  enabled?: boolean
  initial?: Parameters<typeof createLiveClient>[0]
}) {
  const client = useMemo(() => controller ?? createLiveClient(initial), [controller]) // Initial URL only.
  useEffect(() => {
    if (enabled) {
      client.start()
      return () => client.stop()
    }
  }, [client, enabled])
  return h(LiveContext.Provider, { value: enabled ? client : null }, children)
}

type Topic = ReadonlyMap<string, LiveEntity>
const topicSnapshot = (client: LiveClient, topic: string): Topic =>
  new Map(Array.from(client.store.topic(topic)?.values() ?? [], entity => [entity.id, entity]))

function metadata(client: LiveClient | null, includeBoard: boolean) {
  const store = client?.store.meta
  const status = client?.status
  return {
    scope: store?.scope ?? '', ready: store?.ready ?? false, capabilities: store?.capabilities ?? null,
    historyPresent: includeBoard && !!client?.store.topic('history.board')?.size,
    orderedGap: store?.orderedGap ?? false, retention: store?.retention ?? null,
    connected: status?.connected ?? false, everConnected: status?.everConnected ?? false, error: status?.error ?? null,
  }
}

function snapshot(client: LiveClient | null, topics: readonly string[], includeBoard: boolean) {
  return {
    ...metadata(client, includeBoard),
    topics: new Map(topics.flatMap(topic => client ? [[topic, topicSnapshot(client, topic)] as const] : [])),
    board: client && includeBoard ? projectBoard(client.store) : {},
  }
}

const NO_TOPICS: readonly string[] = []

// Keep immutable references for Preact. Unrelated topics and cursor updates do not redraw a consumer.
export function useLiveState(topics: readonly string[] = NO_TOPICS, includeBoard = false) {
  const client = useContext(LiveContext)
  const read = () => ({ client, topics, state: snapshot(client, topics, includeBoard) })
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
      const board = includeBoard ? projectBoard(client.store, current.state.board, changes) : current.state.board
      const affected = topics.filter(topic => changed.has(topic))
      if (!affected.length && board === current.state.board) return
      const next = new Map(current.state.topics)
      for (const topic of affected) next.set(topic, topicSnapshot(client, topic))
      put({ topics: next, board })
    })
    const dispose = createRoot(dispose => {
      createEffect(() => metadata(client, includeBoard), next => put(next))
      return dispose
    })
    return () => { unsubscribe(); dispose() }
  }, [client, topics, includeBoard])
  return { client, state: value.client === client && value.topics === topics ? value.state : read().state }
}
