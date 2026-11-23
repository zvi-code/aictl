// @vitest-environment jsdom
import { createRoot, flush } from 'solid-js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseFilters } from '../../src/data/filters'
import { createLiveClient } from '../../src/data/live'
import { panelData } from '../../src/panels/data'
import Kpis from '../../src/panels/overview/Kpis'
import { overviewA } from '../../src/panels/overview/a'
import type { PanelContext } from '../../src/panels/types'
import { liveBootstrap, liveEntity, liveEnvelope, liveField } from '../fixtures/live.fixture'
import { frameClock } from '../data/harness'
import { installDom, mount } from './dom'

class Source {
  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  private listeners = new Map<string, (event: MessageEvent<string>) => void>()
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) { this.listeners.set(type, listener) }
  close() {}
  emit(type: string, message: unknown) { this.listeners.get(type)?.(new MessageEvent(type, { data: JSON.stringify(message) })) }
}

const kpis = { messages: 1200, tokens: 345_000, cached_share: 0.5, cost_usd: 1.5, tool_calls: 80, failures: 2,
  fail_rate: 0.025, p50_ms: 900, p95_ms: 2400, loops: 1, subagents_running: 0, spark: {} }
const status = (revision: number, extra: Record<string, unknown>) => liveEntity('source.status', 'history:scope', {
  component: 'history', topic: 'history.board', scope: '', error: null, stale: false, reason: null, ...extra,
}, revision)

/** A board on the live stream, with the panel context the dashboard builds from it. */
function liveBoard() {
  const clock = frameClock()
  let source: Source | undefined
  const client = createLiveClient({ frames: clock.frames, eventSource: () => (source = new Source()) })
  client.start()
  const root = createRoot(dispose => {
    const base = {
      client, scope: () => 'local' as const, nodeId: () => null, filters: () => parseFilters('?range=24h'),
      tools: () => null, paused: () => false, startedAt: 0, revision: () => 0,
      navigate() {}, jump() {}, select() {}, openAgent() {}, openDetail() {},
      stopped: () => false, stopAgent() {}, runCommand() {}, copy() {}, refresh() {},
    }
    const ctx = { ...base, ...panelData(base, () => 'board') } as PanelContext
    return { ctx, dispose }
  })
  const send = (type: 'bootstrap' | 'change', message: unknown) => { source!.emit(type, message); clock.tick(); flush() }
  return { ...root, send }
}

let board: ReturnType<typeof liveBoard>
beforeEach(() => { installDom(); board = liveBoard() })
afterEach(() => { board.dispose(); board.ctx.client.stop() })

const firstPart = () => liveBootstrap([
  liveField('kpis', kpis), liveField('generated_at', 1000),
  status(1, { ready: false, pending: true, refresh_pending: true, pending_fields: ['loops', 'changes', 'kpis.prev'] }),
])

describe('BOARD-STAGED-01 · a first load shows each field when it is read', () => {
  it('shows a field that is there as final and the fields still to come as loading', () => {
    board.send('bootstrap', firstPart())
    const { ctx } = board
    expect(ctx.read({ field: 'kpis' })).toMatchObject({ state: 'ready', value: kpis })
    expect(ctx.read({ field: 'kpis', path: 'tokens' })).toMatchObject({ state: 'ready', value: 345_000 })
    expect(ctx.read({ field: 'loops' }).state).toBe('loading')
    expect(ctx.read({ field: 'kpis', path: 'prev' }).state).toBe('loading')
    expect(ctx.read({ field: 'kpis', path: 'prev.tokens' }).state).toBe('loading')
  })

  it('names the reason of a field the server could not read and shows the others', () => {
    board.send('bootstrap', firstPart())
    board.send('change', liveEnvelope(2, { upserts: [
      liveField('loops', [], '', 2, { collection: true }),
      status(2, { ready: true, pending: false, refresh_pending: false,
        field_errors: { changes: 'Kusto view board.changes failed: timeout', 'kpis.prev': 'Kusto view board.previous failed: timeout' } }),
    ] }))
    const { ctx } = board
    expect(ctx.read({ field: 'changes' })).toEqual({ state: 'error', message: 'Kusto view board.changes failed: timeout' })
    expect(ctx.read({ field: 'kpis', path: 'prev' })).toEqual({ state: 'error', message: 'Kusto view board.previous failed: timeout' })
    expect(ctx.read({ field: 'kpis' }).state).toBe('ready')
    expect(ctx.read({ field: 'loops' }).state).toBe('empty')
  })

  it('keeps a paused board open while the first load has fields to come', () => {
    const clock = frameClock()
    let source: Source | undefined
    let closed = false
    const client = createLiveClient({ live: false, frames: clock.frames, eventSource: () => {
      source = new Source(); source.close = () => { closed = true }; return source
    } })
    client.start()
    source!.emit('bootstrap', firstPart())
    clock.tick()
    expect(closed).toBe(false)
    // A status that says ready while it still names pending fields is not a whole board either.
    source!.emit('change', liveEnvelope(2, { upserts: [status(2, { ready: true, pending: true, pending_fields: ['loops'] })] }))
    clock.tick()
    expect(closed).toBe(false)
    source!.emit('change', liveEnvelope(3, { upserts: [status(3, { ready: true, pending: false })] }))
    clock.tick()
    expect(closed).toBe(true)
    client.stop()
  })
})

describe('BOARD-STAGED-02 · KPI tiles before the period before is read', () => {
  const def = overviewA.find(panel => panel.id === 'kpis')!

  it('shows the tile values at once and says the comparison is still being read, never a number for it', () => {
    board.send('bootstrap', firstPart())
    const { host, dispose } = mount(() => <Kpis ctx={board.ctx} def={def} params={{}} />)
    const text = host.textContent!
    expect(text).toContain('345')
    expect(text).toContain('reading the period before…')
    expect(text).not.toMatch(/vs before/)
    dispose()
  })

  it('says the period before was not read, with the reason on hover', () => {
    board.send('bootstrap', firstPart())
    board.send('change', liveEnvelope(2, { upserts: [
      status(2, { ready: true, pending: false, field_errors: { 'kpis.prev': 'Kusto view board.previous failed: timeout' } }),
    ] }))
    const { host, dispose } = mount(() => <Kpis ctx={board.ctx} def={def} params={{}} />)
    const said = Array.from(host.querySelectorAll('span[title]')).filter(span => span.textContent === 'period before not read')
    expect(said).toHaveLength(4)
    expect(said[0].getAttribute('title')).toBe('Kusto view board.previous failed: timeout')
    dispose()
  })
})
