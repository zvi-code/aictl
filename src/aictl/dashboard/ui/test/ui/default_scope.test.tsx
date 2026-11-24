// @vitest-environment jsdom
// An address with no scope shows All nodes, so every screen's request must say scope=fleet; the server answers
// a request without scope as This node.
import { createRoot, flush } from 'solid-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseFilters } from '../../src/data/filters'
import { createLiveClient } from '../../src/data/live'
import { boardNodeScope, setDefaultNodeScope } from '../../src/data/urlState'
import { detailPath, panelData } from '../../src/panels/data'
import { healthNodePath } from '../../src/panels/health/scopedHealth'
import { seriesPath } from '../../src/panels/health/trendModel'
import PauseTax from '../../src/panels/insights/PauseTax'
import { DEFAULT_FINDER, finderRequest } from '../../src/panels/overview/sessionFinder'
import type { PanelContext } from '../../src/panels/types'
import Index from '../../src/shell/Index'
import { installDom, layoutHeaders, mount } from './dom'

const scopeOf = (path: string) => new URL(path, 'http://x').searchParams.get('scope')

/** A context that takes its scope from the address, as the shell does. */
function context(asked: string[]) {
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async path => {
    asked.push(String(path))
    const url = new URL(String(path), location.origin)
    if (url.pathname === '/api/history/board') return Response.json({ node_scope: { kind: boardNodeScope(location.search), node_id: null }, generated_at: 1 })
    return Response.json(url.pathname === '/api/datapoints' ? [] : {})
  }))
  return createRoot(dispose => {
    const base = {
      client: createLiveClient(), scope: () => boardNodeScope(location.search), nodeId: () => null,
      filters: () => parseFilters(location.search), tools: () => null, paused: () => false, startedAt: 86_400,
      revision: () => 0, navigate() {}, jump() {}, select() {}, openAgent() {}, openDetail() {},
      stopped: () => false, stopAgent() {}, runCommand() {}, copy() {}, refresh() {},
    }
    return { ctx: { ...base, ...panelData(base, () => 'board') } as PanelContext, dispose }
  })
}

/** A detail reader that records each path it is asked for and never answers. */
function recording(asked: string[]) {
  return (path: () => string | undefined) => Object.assign(() => {
    const value = path()
    if (value) asked.push(value)
    return { status: 'error', data: undefined, error: new Error('not answered in this test') }
  }, { retry() {} })
}

beforeEach(() => { installDom(); layoutHeaders() })
afterEach(() => { vi.unstubAllGlobals(); setDefaultNodeScope('fleet') })

describe('SCOPE-01 · With no scope in the address every screen asks for All nodes', () => {
  it('Overview: the history read of the board', async () => {
    history.replaceState(null, '', '/?range=24h')
    const asked: string[] = []
    const board = context(asked)
    try {
      createRoot(dispose => { board.ctx.need([{ field: 'kpis' }]); return dispose })
      flush()
      await vi.waitFor(() => expect(asked.some(path => path.startsWith('/api/history/board/section'))).toBe(true))
      expect(scopeOf(asked.find(path => path.startsWith('/api/history/board/section'))!)).toBe('fleet')
    } finally { board.dispose() }
  })

  it('Sessions: the finder', () => {
    history.replaceState(null, '', '/')
    const board = context([])
    try { expect(scopeOf(detailPath(board.ctx, '/api/board/sessions', finderRequest(DEFAULT_FINDER, 86_400, 0, 50)))).toBe('fleet') }
    finally { board.dispose() }
  })

  it('Insights: a card', () => {
    history.replaceState(null, '', '/?screen=insights&range=all')
    const asked: string[] = []
    const board = context([])
    const ctx = { ...board.ctx, detail: recording(asked) } as PanelContext
    const view = mount(() => <PauseTax ctx={ctx} since={0} until={100} />)
    try {
      const card = asked.find(path => path.startsWith('/api/board/insights/pause'))
      expect(card).toBeDefined()
      expect(scopeOf(card!)).toBe('fleet')
    } finally { view.dispose(); board.dispose() }
  })

  it('Index', () => {
    history.replaceState(null, '', '/?screen=index')
    const asked: string[] = []
    const board = context([])
    const view = mount(() => <Index ctx={{ ...board.ctx, detail: recording(asked) } as PanelContext} />)
    try { expect(scopeOf(asked.find(path => path.startsWith('/api/board/index'))!)).toBe('fleet') }
    finally { view.dispose(); board.dispose() }
  })

  it('Health: the node report and the trend series', () => {
    history.replaceState(null, '', '/?screen=health')
    const scope = boardNodeScope(location.search)
    expect(scopeOf(healthNodePath(scope)!)).toBe('fleet')
    expect(scopeOf(seriesPath(scope, null, 1, 2)!)).toBe('fleet')
  })

  it('Settings: shows All nodes, which has no settings of its own', () => {
    history.replaceState(null, '', '/?screen=settings')
    expect(boardNodeScope(location.search)).toBe('fleet')
  })

  it('an explicit This node sends no scope, and the page shows This node', () => {
    history.replaceState(null, '', '/?scope=local')
    const board = context([])
    try {
      expect(board.ctx.scope()).toBe('local')
      expect(scopeOf(detailPath(board.ctx, '/api/board/sessions'))).toBeNull()
    } finally { board.dispose() }
  })
})
