import { createMemo, type Accessor } from 'solid-js'
import type { DetailAgent, DetailAgentFlow, DetailAgentTranscript, TopicHistoryAgent } from '../data/contract.gen'
import type { LiveClient } from '../data/live'
import type { DetailResource, DetailState, PanelContext } from '../panels/types'

interface Views { detail: DetailAgent; flow: DetailAgentFlow; transcript: DetailAgentTranscript }
type View = keyof Views

let watch = ''

export function drawerEventSource(url: string) {
  const [route, search] = url.split('?', 2)
  const params = new URLSearchParams(search)
  if (!watch || params.get('history') === '0') return new EventSource(url)
  params.set('agent_watch', watch)
  return new EventSource(`${route}?${params}`)
}

export function supportsLiveAgent(client: LiveClient) {
  const topics = client.store.meta.capabilities?.topics
  return topics != null && typeof topics === 'object' && 'history.agent' in topics
}

export function agentView(tab?: string): View {
  return tab === 'transcript' ? 'transcript' : tab === 'flow' || tab === 'timeline' || tab === 'kql' || !tab ? 'flow' : 'detail'
}

export function selectAgentWatch(client: LiveClient, agentId?: string, tab?: string) {
  const next = agentId ? `${agentView(tab)}:${agentId}` : ''
  if (next === watch) return
  watch = next
  client.resync()
}

export function watchedDetail<V extends View>(
  ctx: PanelContext, view: V, id: Accessor<string>, endpoint: Accessor<string | undefined>, live: Accessor<boolean>,
): DetailResource<Views[V]> & { streaming: Accessor<boolean> } {
  const useStream = () => ctx.scope() === 'local' && live() &&
    (supportsLiveAgent(ctx.client) || (!ctx.client.store.meta.capabilities && !ctx.client.status.error))
  const received = createMemo(() => {
    if (!useStream()) return
    for (const entity of ctx.client.store.topic('history.agent')?.values() ?? []) {
      const current = entity.data as TopicHistoryAgent
      if (current.agent_id === id() && current.view === view) return current
    }
  })
  const useRead = () => !useStream() || received()?.status === 413
  const read = ctx.detail<Views[V]>(createMemo(() => useRead() ? endpoint() : undefined))
  return Object.assign(createMemo((): DetailState<Views[V]> | undefined => {
    if (useRead()) return read()
    const data = received()
    if (data?.value != null) return { status: ctx.client.status.connected ? 'ready' : 'stale', data: data.value as Views[V], error: null }
    if (data != null) return { status: 'error', data: undefined, error: `HTTP ${data.status}` }
    return { status: 'loading', data: undefined, error: null }
  }), { retry: () => { if (useRead()) read.retry(); else ctx.client.resync() }, streaming: () => !useRead() })
}
