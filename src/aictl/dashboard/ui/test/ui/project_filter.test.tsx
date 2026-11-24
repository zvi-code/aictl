// @vitest-environment jsdom
// The project filter of the whole page: chosen once in the top bar, it reaches the request of every screen.
import { createRoot, flush } from 'solid-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boardLiveRequest, canClear, clearedFilters, filtersToParams, parseFilters, withProjects } from '../../src/data/filters'
import { createLiveClient } from '../../src/data/live'
import { mergeSearch } from '../../src/data/urlState'
import { detailPath, panelData } from '../../src/panels/data'
import PauseTax from '../../src/panels/insights/PauseTax'
import { DEFAULT_FINDER, finderRequest } from '../../src/panels/overview/sessionFinder'
import type { PanelContext } from '../../src/panels/types'
import { matchProjects, ProjectChips, type ProjectEntry } from '../../src/shell/ProjectPicker'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const ALPHA = '/work/alpha', BETA = '/work/beta'
const CHOSEN = `?range=24h&project=${encodeURIComponent(BETA)}&project=${encodeURIComponent(ALPHA)}`
const projectsOf = (path: string) => new URL(path, 'http://x').searchParams.getAll('project')

beforeEach(() => installDom())
afterEach(() => vi.unstubAllGlobals())

describe('PRJ-01 · The address holds the chosen projects', () => {
  it('reads each project once, writes one key per project, and clears them with the other filters', () => {
    const filters = parseFilters(CHOSEN + `&project=${encodeURIComponent(ALPHA)}&project=all`)
    expect(filters.projects).toEqual([ALPHA, BETA])
    expect(mergeSearch('?screen=insights', filtersToParams(filters))).toBe(
      `?screen=insights&project=${encodeURIComponent(ALPHA)}&project=${encodeURIComponent(BETA)}`)
    expect(canClear(filters, null)).toBe(true)
    expect(clearedFilters(filters).projects).toEqual([])
    expect(mergeSearch(CHOSEN, filtersToParams(clearedFilters(filters)))).toBe('')
    expect(parseFilters('?range=24h').projects).toEqual([])
  })

  it('adds the projects to a per-project route only, and never twice', () => {
    expect(projectsOf(withProjects('/api/board/tool?name=Read', [ALPHA, BETA]))).toEqual([ALPHA, BETA])
    expect(withProjects('/api/board/tool?name=Read', [])).toBe('/api/board/tool?name=Read')
    expect(withProjects('/api/board/projects?scope=fleet', [ALPHA])).toBe('/api/board/projects?scope=fleet')
    expect(withProjects('/api/board/nodes?view=health', [ALPHA])).toBe('/api/board/nodes?view=health')
    expect(withProjects('/api/settings/files', [ALPHA])).toBe('/api/settings/files')
    expect(projectsOf(withProjects(`/api/board/sessions?project=${encodeURIComponent(BETA)}`, [ALPHA]))).toEqual([BETA])
  })
})

function context(search: string, scope: 'local' | 'fleet' = 'local') {
  const fetched: string[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async path => {
    fetched.push(String(path))
    const url = new URL(String(path), location.origin)
    if (url.pathname === '/api/history/board') return Response.json({ node_scope: { kind: scope, node_id: null }, generated_at: 1 })
    return Response.json(url.pathname === '/api/datapoints' ? [] : {})
  }))
  return createRoot(dispose => {
    const base = {
      client: createLiveClient(), scope: () => scope, nodeId: () => null,
      filters: () => parseFilters(search), tools: () => null, paused: () => false, startedAt: 86_400,
      revision: () => 0, navigate() {}, jump() {}, select() {}, openAgent() {}, openDetail() {},
      stopped: () => false, stopAgent() {}, runCommand() {}, copy() {}, refresh() {},
    }
    return { ctx: { ...base, ...panelData(base, () => 'board') } as PanelContext, fetched, dispose }
  })
}

describe('PRJ-02 · Every screen sends the chosen projects', () => {
  it('board, this node: the live query of the board carries them', () => {
    const request = boardLiveRequest(parseFilters(CHOSEN), null, 'board', 86_400)
    expect(projectsOf('/?' + request.query)).toEqual([ALPHA, BETA])
  })

  it('board, all nodes: the history read carries them', async () => {
    const board = context(CHOSEN, 'fleet')
    try {
      board.ctx.read({ field: 'kpis' })
      await vi.waitFor(() => expect(board.fetched.some(path => path.startsWith('/api/history/board'))).toBe(true))
      expect(projectsOf(board.fetched.find(path => path.startsWith('/api/history/board'))!)).toEqual([ALPHA, BETA])
    } finally { board.dispose() }
  })

  it('a detail panel or drawer: its own route carries them, whatever built the path', async () => {
    const board = context(CHOSEN)
    try {
      createRoot(dispose => {
        board.ctx.detail(() => '/api/board/tool?name=Read&since=1&until=2')
        board.ctx.detail(() => '/api/board/projects')
        return dispose
      })
      flush()
      await vi.waitFor(() => expect(board.fetched.length).toBeGreaterThanOrEqual(2))
      expect(projectsOf(board.fetched.find(path => path.startsWith('/api/board/tool'))!)).toEqual([ALPHA, BETA])
      expect(board.fetched.find(path => path.startsWith('/api/board/projects'))).toBe('/api/board/projects')
    } finally { board.dispose() }
  })

  it('the session finder: its request carries the page projects and no project of its own', () => {
    const ctx = { scope: () => 'fleet', nodeId: () => null, filters: () => parseFilters(CHOSEN) } as unknown as PanelContext
    const path = detailPath(ctx, '/api/board/sessions', finderRequest(DEFAULT_FINDER, 86_400, 0, 50))
    expect(path.startsWith('/api/board/sessions?')).toBe(true)
    expect(projectsOf(path)).toEqual([ALPHA, BETA])
    expect(new URL(path, 'http://x').searchParams.get('scope')).toBe('fleet')
  })

  it('Insights: each card asks for its figures for the chosen projects', () => {
    const requested: string[] = []
    const ctx = {
      scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
      filters: () => parseFilters(CHOSEN),
      detail: (path: () => string | undefined) => Object.assign(() => {
        const value = path()
        if (value) requested.push(value)
        return { status: 'error', data: undefined, error: new Error('not answered in this test') }
      }, { retry() {} }),
    } as unknown as PanelContext
    layoutHeaders()
    history.replaceState(null, '', '/?screen=insights&range=all')
    const boxes = createBoxes('test-project-filter')
    const { dispose } = mount(() => <PauseTax ctx={ctx} boxes={boxes} since={0} until={100} />)
    try {
      const card = requested.find(path => path.startsWith('/api/board/insights/pause'))
      expect(card).toBeDefined()
      expect(projectsOf(card!)).toEqual([ALPHA, BETA])
    } finally { dispose() }
  })
})

describe('PRJ-03 · The picker and the chips', () => {
  const entries: ProjectEntry[] = [
    { project: ALPHA, name: 'alpha', sessions: 12, last_ts: 2000, nodes: 1 },
    { project: '/src/Beta-Service', name: 'Beta-Service', sessions: 3, last_ts: 1000, nodes: 2 },
  ]
  it('finds a project by any part of its path, in the order listed', () => {
    expect(matchProjects(entries, '').map(entry => entry.name)).toEqual(['alpha', 'Beta-Service'])
    expect(matchProjects(entries, 'beta SERV').map(entry => entry.name)).toEqual(['Beta-Service'])
    expect(matchProjects(entries, 'work')).toEqual([entries[0]])
    expect(matchProjects(entries, 'nothing')).toEqual([])
  })

  it('names each chosen project on the screen, with its full path on hover, and says where it does not apply', () => {
    const navigated: unknown[] = []
    const ctx = { filters: () => parseFilters(CHOSEN), navigate: (patch: unknown) => navigated.push(patch) } as unknown as PanelContext
    const board = mount(() => <ProjectChips ctx={ctx} applies />)
    try {
      const chips = [...board.host.querySelectorAll('[title]')].filter(element => element.getAttribute('title')?.startsWith('/'))
      expect(chips.map(chip => chip.getAttribute('title'))).toEqual([ALPHA, BETA])
      expect(board.host.textContent).toContain('Project: alpha')
      expect(board.host.textContent).toContain('for the chosen projects only')
      board.host.querySelector<HTMLButtonElement>(`[aria-label="Remove the project ${ALPHA} from the filter"]`)!.click()
      expect(navigated).toEqual([{ project: [BETA] }])
    } finally { board.dispose() }
    const health = mount(() => <ProjectChips ctx={ctx} applies={false} />)
    try { expect(health.host.textContent).toContain('does not apply here') } finally { health.dispose() }
    const none = mount(() => <ProjectChips ctx={{ ...ctx, filters: () => parseFilters('?range=24h') } as PanelContext} applies />)
    try { expect(none.host.textContent).toBe('') } finally { none.dispose() }
  })
})
