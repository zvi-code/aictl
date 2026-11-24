// @vitest-environment jsdom
// A node or fleet board is read in sections (GET /api/history/board/section): each panel asks for the
// sections of its fields while it is on screen, shows each figure when its own section answers, keeps the
// figures of the earlier selection on a change, and shows the reason and a retry where a section failed.
import { createRoot, createSignal, flush } from 'solid-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseFilters, type Screen } from '../../src/data/filters'
import { createLiveClient } from '../../src/data/live'
import DockScreen from '../../src/panels/DockScreen'
import SECTION_PATHS from '../../src/panels/boardSections.json'
import { EARLIER_SELECTION, panelData, sectionsOf } from '../../src/panels/data'
import Kpis from '../../src/panels/overview/Kpis'
import { overviewA } from '../../src/panels/overview/a'
import { overviewB } from '../../src/panels/overview/b'
import { shownInScope } from '../../src/panels/scopeRules'
import type { PanelContext, PanelDef } from '../../src/panels/types'
import { installDom, mount } from './dom'

const scope = { kind: 'fleet', node_id: null }
const answer = (url: URL, fields: Record<string, unknown>) =>
  Response.json({ node_scope: scope, section: url.searchParams.get('section'), generated_at: 1000, fields })
const failed = (reason: string) => Response.json({ error: reason, reason: 'query_failed' }, { status: 503 })
/** An answer the test releases itself, as a slow read would. */
function held() {
  let release!: (response: Response) => void
  const response = new Promise<Response>(resolve => { release = resolve })
  return { response, release }
}

function fleet(respond: (url: URL) => Response | Promise<Response>) {
  const asked: URL[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async path => {
    const url = new URL(String(path), location.origin)
    if (url.pathname === '/api/datapoints') return Response.json([])
    asked.push(url)
    return respond(url)
  }))
  const [range, setRange] = createSignal('24h')
  const [revision, setRevision] = createSignal(0)
  const [screen, setScreen] = createSignal<Screen>('board')
  const root = createRoot(dispose => {
    const base = {
      client: createLiveClient(), scope: () => 'fleet' as const, nodeId: () => null,
      filters: () => parseFilters(`?range=${range()}`), tools: () => null, paused: () => false, startedAt: 86_400 * 10,
      revision, navigate() {}, jump() {}, select() {}, openAgent() {}, openDetail() {},
      stopped: () => false, stopAgent() {}, runCommand() {}, copy() {}, refresh: () => setRevision(n => n + 1),
    }
    return { ctx: { ...base, ...panelData(base, screen) } as PanelContext, dispose }
  })
  const sections = () => asked.map(url => url.searchParams.get('section'))
  return { ...root, asked, sections, setRange: (value: string) => { setRange(value); flush() },
    setScreen: (value: Screen) => { setScreen(value); flush() } }
}

/** What a panel on screen does: it asks for its sources' sections until it is gone. */
function onScreen(ctx: PanelContext, sources: PanelDef['sources']) {
  return createRoot(dispose => { ctx.need(sources); return dispose })
}

beforeEach(() => installDom())
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('BOARD-SECTIONS-01 · the page reads each field from the sections that answer it', () => {
  it('names the same sections as the server, each field from exactly one', () => {
    const owners = new Map<string, string>()
    for (const [id, paths] of Object.entries(SECTION_PATHS)) {
      for (const path of paths) {
        expect(owners.has(path), path).toBe(false)
        owners.set(path, id)
      }
    }
    expect(sectionsOf('kpis', 'tokens')).toEqual(['usage'])
    expect(sectionsOf('kpis', 'spark.loops')).toEqual(['status'])
    expect(sectionsOf('kpis')).toEqual(['usage', 'tools', 'status', 'speed'])
    expect(sectionsOf('series', 'failures')).toEqual(['tools', 'errors'])
    expect(sectionsOf('series', 'tokens')).toEqual(['usage'])
    expect(sectionsOf('loops')).toEqual(['loops'])
    // Every field a node or fleet board panel reads is answered by some section, but this node's own
    // process list and aictl's own usage, which a node or fleet board does not have.
    for (const def of [...overviewA, ...overviewB].filter(def => shownInScope(def, 'fleet'))) {
      for (const source of def.sources) {
        if ('field' in source && !['self', 'processes'].includes(source.field)) {
          expect(sectionsOf(source.field, source.path), def.id).not.toEqual([])
        }
      }
    }
  })
})

describe('BOARD-SECTIONS-02 · a tile shows its figure when its own section answers; a failed one says why', () => {
  const def = overviewA.find(panel => panel.id === 'kpis')!
  const reason = 'Kusto view tools.series failed: timeout'

  it('shows usage at once, the running count as being read, and the tool calls with the reason and a retry', async () => {
    const status = held()
    let toolsFail = true
    const board = fleet(url => {
      switch (url.searchParams.get('section')) {
        case 'usage': return answer(url, { kpis: { messages: 1200, tokens: 345_000, cached_share: 0.5, cost_usd: 1.5 }, credits: null })
        case 'tools': return toolsFail ? failed(reason) : answer(url, { kpis: { tool_calls: 80, failures: 2, fail_rate: 0.025 } })
        case 'speed': return answer(url, { kpis: { p50_ms: 900, p95_ms: 2400 }, by_model: [] })
        case 'status': return status.response
        // The tiles' monitored-session count reads the node reports: none here.
        default: return Response.json({ nodes: [] })
      }
    })
    try {
      const { host, dispose } = mount(() => { board.ctx.need(def.sources); return <Kpis ctx={board.ctx} def={def} params={{}} /> })
      await vi.waitFor(() => expect(host.textContent).toContain('345'))
      await vi.waitFor(() => expect(host.textContent).toContain('Could not be read'))
      const tile = (label: string) => [...host.querySelectorAll('dl')].find(dl => dl.querySelector('dt')?.textContent === label)!
      expect(tile('Agents running').textContent).toContain('Reading…')
      expect(tile('Tool calls').textContent).toContain(reason)
      expect(board.ctx.read({ field: 'kpis', path: 'tool_calls' })).toEqual({ state: 'error', message: reason })
      expect(board.ctx.read({ field: 'kpis', path: 'p95_ms' })).toMatchObject({ state: 'ready', value: 2400 })
      // The retry reads the failed section again; the others are answered by the server's selection.
      toolsFail = false
      tile('Tool calls').querySelector('button')!.click()
      flush()
      await vi.waitFor(() => expect(tile('Tool calls').textContent).toContain('80'))
      status.release(answer(new URL('/?section=status', location.origin), { kpis: { running: 3, idle: 1, subagents_running: 0, loops: 0 } }))
      await vi.waitFor(() => expect(tile('Agents running').textContent).toContain('3'))
      dispose()
    } finally { board.dispose() }
  })
})

describe('BOARD-SECTIONS-03 · a section no panel on screen needs is not asked for', () => {
  it('asks for nothing until a panel needs it, then for that panel\'s sections only', async () => {
    const board = fleet(url => answer(url, { loops: [] }))
    try {
      flush()
      await Promise.resolve()
      expect(board.asked).toEqual([])
      const gone = onScreen(board.ctx, [{ field: 'loops' }])
      flush()
      await vi.waitFor(() => expect(board.sections()).toEqual(['loops']))
      await vi.waitFor(() => expect(board.ctx.read({ field: 'loops' }).state).toBe('empty'))
      // Scrolled away and back, the panel shows the answer it had without asking again.
      gone()
      flush()
      const back = onScreen(board.ctx, [{ field: 'loops' }])
      flush()
      expect([board.ctx.read({ field: 'loops' }), board.sections()]).toEqual([{ state: 'empty', value: [], updatedAt: 1000 }, ['loops']])
      back()
      // Gone from the screen, the panel's section is not read for a new selection.
      board.setRange('7d')
      await Promise.resolve()
      expect(board.sections()).toEqual(['loops'])
    } finally { board.dispose() }
  })

  it('keeps the whole board while another screen is open, and reads it again only after Refresh', async () => {
    // More sections than a cache keeps by default: every one of them must still be there on return.
    const sources = ['loops', 'agents', 'projects', 'attention', 'options', 'kpis.running', 'kpis.p50_ms']
      .map(name => name.includes('.') ? { field: name.split('.')[0], path: name.split('.')[1] } : { field: name }) as PanelDef['sources']
    const board = fleet(url => answer(url, { loops: [], agents: [], projects: [], attention: [], options: {}, kpis: { running: 1, p50_ms: 2 } }))
    try {
      const gone = onScreen(board.ctx, sources)
      flush()
      await vi.waitFor(() => expect(board.ctx.read({ field: 'loops' }).state).toBe('empty'))
      await vi.waitFor(() => expect(board.ctx.read({ field: 'kpis', path: 'running' }).value).toBe(1))
      const asked = board.sections().length
      expect(asked).toBeGreaterThan(4)
      // The Thinking screen is opened: the board's panels are gone. Then the board is opened again.
      gone()
      board.setScreen('thinking')
      board.setScreen('board')
      const back = onScreen(board.ctx, sources)
      flush()
      expect(board.ctx.read({ field: 'loops' })).toEqual({ state: 'empty', value: [], updatedAt: 1000 })
      expect(board.ctx.read({ field: 'kpis', path: 'running' }).value).toBe(1)
      await Promise.resolve()
      expect(board.sections().length).toBe(asked)
      // Refresh reads every section on screen again, and shows the kept figures meanwhile.
      board.ctx.refresh()
      flush()
      expect(board.ctx.read({ field: 'kpis', path: 'running' }).value).toBe(1)
      await vi.waitFor(() => expect(board.sections().length).toBe(2 * asked))
      back()
    } finally { board.dispose() }
  })

  it('on the board, asks only for the sections of the panels near the viewport', async () => {
    const near = new Set(['p-kpis', 'p-loops'])
    class Near {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        if (near.has(target.id)) this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
      unobserve() {}
      disconnect() {}
    }
    Object.assign(globalThis, { IntersectionObserver: Near })
    const board = fleet(url => answer(url, {}))
    const view = () => Promise.resolve({ default: () => <p>panel</p> })
    const definitions = [...overviewA, ...overviewB].map(def => ({ ...def, kind: 'custom', load: view }) as PanelDef)
    try {
      const { dispose } = mount(() => <DockScreen screen="board" definitions={definitions} ctx={board.ctx}
        order={() => {}} shown={def => shownInScope(def, 'fleet')} />)
      const expected = new Set([...overviewA, ...overviewB].filter(def => near.has(`p-${def.id}`))
        .flatMap(def => def.sources.flatMap(source => 'field' in source ? sectionsOf(source.field, source.path) : [])))
      await vi.waitFor(() => expect(new Set(board.sections())).toEqual(expected))
      expect(expected).toEqual(new Set(['usage', 'tools', 'status', 'speed', 'loops']))
      dispose()
    } finally { board.dispose() }
  })
})

describe('BOARD-SECTIONS-04 · a change keeps each section\'s earlier figures until its own answer arrives', () => {
  it('marks the earlier figures as such, shows each new section as it answers, and ignores late answers of the earlier one', async () => {
    const later = held(), lateStatus = held()
    let second = false
    const board = fleet(url => {
      const section = url.searchParams.get('section')
      if (section === 'usage') return second ? later.response : answer(url, { kpis: { tokens: 345_000 } })
      if (section === 'tools') return answer(url, { kpis: { tool_calls: second ? 99 : 80 } })
      if (section === 'status') return second ? answer(url, { kpis: { running: 1 } }) : lateStatus.response
      return answer(url, {})
    })
    try {
      const gone = onScreen(board.ctx, [{ field: 'kpis' }])
      flush()
      await vi.waitFor(() => expect(board.ctx.read({ field: 'kpis', path: 'tool_calls' })).toMatchObject({ state: 'ready', value: 80 }))
      await vi.waitFor(() => expect(board.ctx.read({ field: 'kpis', path: 'tokens' })).toMatchObject({ state: 'ready', value: 345_000 }))
      second = true
      board.setRange('7d')
      await vi.waitFor(() => expect(board.ctx.read({ field: 'kpis', path: 'tool_calls' })).toMatchObject({ state: 'ready', value: 99 }))
      // Never blank, and never taken for a figure of the new range.
      expect(board.ctx.read({ field: 'kpis', path: 'tokens' }))
        .toMatchObject({ state: 'stale', value: 345_000, message: EARLIER_SELECTION })
      // An answer of the earlier selection that comes late is not shown for the new one.
      lateStatus.release(answer(new URL('/?section=status', location.origin), { kpis: { running: 5 } }))
      await vi.waitFor(() => expect(board.ctx.read({ field: 'kpis', path: 'running' })).toMatchObject({ state: 'ready', value: 1 }))
      later.release(answer(new URL('/?section=usage', location.origin), { kpis: { tokens: 999_000 } }))
      await vi.waitFor(() => expect(board.ctx.read({ field: 'kpis', path: 'tokens' })).toMatchObject({ state: 'ready', value: 999_000 }))
      // Every request of one lane names the same page, so the server can drop the selection this page left.
      const viewers = new Set(board.asked.map(url => url.searchParams.get('viewer')))
      expect(viewers.size).toBe(1)
      gone()
    } finally { board.dispose() }
  })
})
