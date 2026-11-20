import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLiveClient } from '../../src/data/live'
import { nativeOutput } from '../../src/data/store'
import { liveBootstrap, liveCapabilities, liveEntity, liveEnvelope, liveField } from '../fixtures/live.fixture.js'
import { dataOf, frameClock } from './harness'

class Source {
  closed = false
  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  private listeners = new Map<string, (event: MessageEvent<string>) => void>()
  constructor(readonly url: string) {}
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) { this.listeners.set(type, listener) }
  open() { this.onopen?.(new Event('open')) }
  fail() { this.onerror?.(new Event('error')) }
  close() { this.closed = true }
  raw(type: string, data: string) { this.listeners.get(type)?.(new MessageEvent(type, { data })) }
  emit(type: string, message: unknown) { this.raw(type, JSON.stringify(message)) }
  get params() { return new URL(this.url, 'http://localhost').searchParams }
}

const output = (id: string, order: number) => liveEntity('runtime.output', id, { session_id: 'a', order })
const historyStatus = (scope: string, ready: boolean, revision = 1, extra = {}) => liveEntity('source.status', 'history:scope', {
  component: 'history', topic: 'history.board', scope, ready, pending: !ready, ...extra,
}, revision)

describe('live transport', () => {
  let client: ReturnType<typeof createLiveClient> | undefined
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { client?.stop(); vi.useRealTimers() })

  function start(options: Parameters<typeof createLiveClient>[0] = {}) {
    const clock = frameClock()
    const sources: Source[] = []
    client = createLiveClient({
      ...options, frames: clock.frames,
      eventSource(url) { const source = new Source(url); sources.push(source); return source },
    })
    client.start()
    return { client, sources, tick: clock.tick, source: sources[0] }
  }

  it('opens one stream directly without a capability probe or board request', () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    try {
      const { source, sources, client, tick } = start()
      client.start()
      const one = vi.fn()
      const two = vi.fn()
      client.store.subscribeApplied(one)
      client.store.subscribeApplied(two)
      source.open()
      expect(client.status).toMatchObject({ connected: true, everConnected: true, error: null })
      source.emit('bootstrap', liveBootstrap([]))
      for (let i = 2; i < 12; i++) {
        source.emit('change', liveEnvelope(i, { upserts: [liveEntity('runtime.agent', 'a', { cpu_percent: i }, i)] }))
      }
      for (let i = 12; i < 15; i++) source.emit('change', liveEnvelope(i, { upserts: [output(String(i), i)] }))
      expect(one).not.toHaveBeenCalled()
      tick()
      expect(one).toHaveBeenCalledTimes(1)
      expect(two).toHaveBeenCalledTimes(1)
      expect(dataOf(client.store, 'runtime.agent', 'a')?.cpu_percent).toBe(11)
      expect(nativeOutput(client.store, 'a').map(entity => entity.id)).toEqual(['12', '13', '14'])
      expect(source.url).toBe('/api/live/stream')
      expect(sources).toHaveLength(1)
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      fetch.mockRestore()
    }
  })

  it('resumes with the accepted cursor before a frame and does not duplicate replayed output', () => {
    const query = 'since=1&until=9'
    const { source, sources, client, tick } = start({ query })
    source.emit('bootstrap', liveBootstrap([output('one', 1)], query))
    source.emit('change', liveEnvelope(2, { upserts: [output('two', 2)] }, query))
    source.fail()
    expect(source.closed).toBe(true)
    expect(client.status.error?.message).toContain('Showing the last received values')
    vi.advanceTimersByTime(1000)
    const resumed = sources[1]
    expect(resumed.params.get('cursor')).toBe('daemon:2')
    resumed.emit('change', liveEnvelope(3, { upserts: [output('one', 1)] }, query))
    tick()
    expect(nativeOutput(client.store, 'a').map(entity => entity.id)).toEqual(['one', 'two'])
    resumed.emit('bootstrap', liveBootstrap([], query, 4, { reason: 'overflow', ordered_gap: true }))
    tick()
    expect(nativeOutput(client.store, 'a')).toEqual([])
    expect(client.store.meta).toMatchObject({ orderedGap: true, resetReason: 'overflow' })
  })

  it('replaces a filter baseline, keeps independent runtime, and ignores old source callbacks', () => {
    const { source, sources, client, tick } = start({ query: 'project=one' })
    source.emit('bootstrap', liveBootstrap([
      liveField('kpis', { tokens: 1 }, 'project=one'),
      liveEntity('runtime.agent', 'a', { id: 'a' }), historyStatus('project=one', true),
    ], 'project=one'))
    tick()
    source.emit('change', liveEnvelope(2, { upserts: [liveEntity('runtime.agent', 'a', { id: 'a', cpu_percent: 5 }, 2)] }, 'project=one'))
    client.configure({ query: 'project=two' })
    const replacement = sources[1]
    expect(source.closed).toBe(true)
    expect(replacement.params.has('cursor')).toBe(false)
    expect(replacement.params.get('project')).toBe('two')
    source.emit('change', liveEnvelope(3, { upserts: [liveField('kpis', { tokens: 99 }, 'project=one', 3)] }, 'project=one'))
    source.fail()
    tick()
    expect(client.store.boardField('kpis').present).toBe(false)
    expect(dataOf(client.store, 'runtime.agent', 'a')?.cpu_percent).toBe(5)
    expect(dataOf(client.store, 'source.status', 'history:scope')).toBeUndefined()
    expect(client.store.meta).toMatchObject({ scope: 'project=two', ready: false })
    replacement.emit('bootstrap', liveBootstrap([liveField('kpis', { tokens: 2 }, 'project=two')], 'project=two', 4))
    tick()
    expect(client.store.boardField('kpis').value).toEqual({ tokens: 2 })
    expect(sources.filter(instance => !instance.closed)).toEqual([replacement])
  })

  it('replaces omitted tools with an explicit empty filter but ignores equivalent scopes', () => {
    const { source, sources, client, tick } = start()
    source.emit('bootstrap', liveBootstrap([]))
    tick()
    client.configure({ query: 'tool=' })
    expect(source.closed).toBe(true)
    expect(sources[1].params.get('tool')).toBe('')
    expect(sources[1].params.has('cursor')).toBe(false)
    client.configure({ query: 'history=0&tool=&cursor=ignored' })
    tick()
    expect(sources).toHaveLength(2)
    expect(client.store.meta.scope).toBe('tool=')
  })

  it('keeps a paused board open until both its history and runtime baselines settle', () => {
    const { source, client, tick } = start({ live: false, requiredTopics: ['history.board', 'runtime.machine'] })
    source.emit('bootstrap', liveBootstrap([historyStatus('', false)]))
    tick()
    expect(source.closed).toBe(false)
    source.emit('change', liveEnvelope(2, { upserts: [liveField('kpis', { tokens: 42 }, '', 2), historyStatus('', true, 2)] }))
    tick()
    expect(source.closed).toBe(false)
    source.emit('change', liveEnvelope(3, { upserts: [
      liveEntity('runtime.machine', 'local', { cpu_per_core: [5] }, 3),
      liveEntity('source.status', 'health', { topic: 'runtime.health', topics: ['runtime.health', 'runtime.machine'], ready: true }, 3),
    ] }))
    tick()
    expect(source.closed).toBe(true)
    expect(client.store.boardField('kpis').value).toEqual({ tokens: 42 })
  })

  it.each([
    ['runtime.health', 'health', 'local', { store: { kind: 'kusto' } }],
    ['configuration.file', 'configuration', 'current', { configured_only: true, tool_configs: [] }],
  ] as const)('waits for a paused %s baseline without requesting history', (topic, component, id, data) => {
    const { source, client, tick } = start({ history: false, live: false, requiredTopics: [topic] })
    expect(source.params.get('history')).toBe('0')
    source.emit('bootstrap', liveBootstrap([]))
    tick()
    expect(source.closed).toBe(false)
    source.emit('change', liveEnvelope(2, { upserts: [
      liveEntity('source.status', component, { topic, ready: false, pending: true }, 2),
    ] }))
    tick()
    expect(source.closed).toBe(false)
    source.emit('change', liveEnvelope(3, { upserts: [
      liveEntity(topic, id, data, 3),
      liveEntity('source.status', component, { topic, ready: true, pending: false }, 3),
    ] }))
    tick()
    expect(source.closed).toBe(true)
    expect(dataOf(client.store, topic, id)).toEqual(data)
  })

  it.each([
    ['history.board', { component: 'history', scope: '' }],
    ['runtime.health', { topic: 'runtime.health' }],
    ['runtime.machine', { topic: 'runtime.health', topics: ['runtime.health', 'runtime.machine'] }],
    ['configuration.file', { topic: 'configuration.file' }],
  ] as const)('finishes a paused %s baseline on its explicit failure, not on unrelated failures or staleness', (topic, data) => {
    const { source, tick } = start({ live: false, requiredTopics: [topic] })
    source.emit('bootstrap', liveBootstrap([
      liveEntity('source.status', 'producer', { ...data, ready: false, pending: true, stale: true }),
      liveEntity('source.status', 'other', { topic: 'unrelated', ready: false, pending: false, error: 'unrelated' }),
      liveEntity('source.status', 'other-scope', { topic, scope: 'project=other', ready: true }),
    ]))
    tick()
    expect(source.closed).toBe(false)
    source.emit('change', liveEnvelope(2, { upserts: [
      liveEntity('source.status', 'producer', { ...data, ready: false, pending: false, stale: true, error: 'unavailable' }, 2),
    ] }))
    tick()
    expect(source.closed).toBe(true)
  })

  it('reconnects a paused pending baseline by cursor and uses topic presence when no producer status exists', () => {
    const { source, sources, tick } = start({ history: false, live: false, requiredTopics: ['runtime.health'] })
    source.emit('bootstrap', liveBootstrap([]))
    tick()
    source.fail()
    vi.advanceTimersByTime(1000)
    const resumed = sources[1]
    expect(resumed.params.get('cursor')).toBe('daemon:1')
    resumed.emit('change', liveEnvelope(2, { upserts: [liveEntity('runtime.health', 'local', {}, 2)] }))
    tick()
    expect(resumed.closed).toBe(true)
  })

  it('keeps runtime visible through a late history baseline, stale producer status and disconnect', () => {
    const { source, client, tick } = start()
    source.emit('bootstrap', liveBootstrap([historyStatus('', false), liveEntity('runtime.agent', 'a', { cpu_percent: 0 })]))
    tick()
    expect(dataOf(client.store, 'runtime.agent', 'a')?.cpu_percent).toBe(0)
    expect(client.store.boardField('kpis').present).toBe(false)
    source.emit('change', liveEnvelope(2, { upserts: [
      historyStatus('', false, 2, { pending: false, error: 'unresolved observations' }),
    ] }))
    tick()
    expect(source.closed).toBe(false)
    expect(dataOf(client.store, 'source.status', 'history:scope')?.error).toBe('unresolved observations')
    source.emit('change', liveEnvelope(3, { upserts: [historyStatus('', true, 3), liveField('kpis', { tokens: 42 }, '', 3)] }))
    source.emit('change', liveEnvelope(4, { upserts: [historyStatus('', true, 4, { stale: true, error: 'query denied' })] }))
    tick()
    source.fail()
    expect(client.status.connected).toBe(false)
    expect(client.store.boardField('kpis').value).toEqual({ tokens: 42 })
    expect(dataOf(client.store, 'source.status', 'history:scope')).toMatchObject({ stale: true, error: 'query denied' })
  })

  it.each([
    ['protocol', (source: Source) => source.raw('change', '{'), /JSON|property name/],
    ['authority', (source: Source) => source.emit('change', liveEnvelope(2, {
      upserts: [liveEntity('history.board', 'bad', {}, 2, 'runtime.native')],
    })), /source authority/],
    ['epoch', (source: Source) => source.emit('change', liveEnvelope(2, { epoch: 'other', cursor: 'other:2' })), /new snapshot/],
  ] as const)('requests a cursorless snapshot after a %s error and retains the valid state', (_, invalid, message) => {
    const { source, sources, client, tick } = start()
    source.emit('bootstrap', liveBootstrap([output('one', 1)]))
    invalid(source)
    tick()
    expect(source.closed).toBe(true)
    expect(client.store.meta.ready).toBe(false)
    expect(client.status.error?.message).toMatch(message)
    expect(nativeOutput(client.store, 'a')).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(sources[1].params.has('cursor')).toBe(false)
    sources[1].emit('bootstrap', liveBootstrap([], '', 2))
    tick()
    expect(client.status.error).toBeNull()
    expect(client.store.meta.ready).toBe(true)
  })

  it.each([{ enabled: false }, { protocol: 2 }])('rejects invalid capabilities without falling back: %j', patch => {
    const { source, sources, client, tick } = start()
    source.emit('bootstrap', liveBootstrap([], '', 1, { capabilities: { ...liveCapabilities, ...patch } }))
    tick()
    expect(source.closed).toBe(true)
    expect(client.status.error?.message).toContain('capabilities')
    expect(client.store.meta.ready).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(sources[1].url).toBe('/api/live/stream')
  })

  it('backs off after transient errors, caps the delay, and resets it after open', () => {
    const { source, sources } = start({ retryMs: 100, maxRetryMs: 200 })
    source.fail()
    vi.advanceTimersByTime(99)
    expect(sources).toHaveLength(1)
    vi.advanceTimersByTime(1)
    sources[1].fail()
    vi.advanceTimersByTime(200)
    sources[2].fail()
    vi.advanceTimersByTime(199)
    expect(sources).toHaveLength(3)
    vi.advanceTimersByTime(1)
    sources[3].open()
    sources[3].fail()
    vi.advanceTimersByTime(100)
    expect(sources).toHaveLength(5)
  })

  it('pauses a complete baseline, resumes by cursor, resyncs without it, and cancels retries on stop', () => {
    const { source, sources, client, tick } = start()
    source.emit('bootstrap', liveBootstrap([historyStatus('', true)]))
    tick()
    client.configure({ live: false })
    expect(source.closed).toBe(true)
    client.configure({ live: true })
    expect(sources[1].params.get('cursor')).toBe('daemon:1')
    client.resync()
    expect(sources[1].closed).toBe(true)
    expect(sources[2].params.has('cursor')).toBe(false)
    sources[2].fail()
    client.stop()
    vi.advanceTimersByTime(30000)
    expect(sources).toHaveLength(3)
  })
})
