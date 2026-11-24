// @vitest-environment jsdom
// The session views of Insights at full width: Flows, Problem sessions, What the agents changed, Verified before commit
// and Orientation cost. Per view: the marks of the main chart, the colour switch, one hover per kind of mark, the line
// under the title, and a body without a split by repository. Invented rows only.
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { flowLayout } from '../../src/panels/insights/charts/FlowDiagram'
import { heatFill } from '../../src/panels/insights/charts/HeatGrid'
import { readColourBy } from '../../src/panels/insights/charts/ColourBy'
import Flows from '../../src/panels/insights/Flows'
import { endingFlow, flowsFinding, transitionGrid, type FlowsBody } from '../../src/panels/insights/flowsModel'
import type { RepoRef, RepoSegment } from '../../src/panels/insights/repoSplit'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const base = {
  range: { since: 1_700_000_000, until: 1_700_086_400 }, data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 },
  computed_at: 1_700_086_000,
}
const query = (view: string) => ({ view, kql: `// aictl view ${view}\nrequests | take 1`, kusto_url: 'https://c.kusto.windows.net/db' })
const order: RepoRef[] = [{ repo: '/src/shop', name: 'shop', cost_usd: 90 }, { repo: '/src/blog', name: 'blog', cost_usd: 30 }]

/** Segments of one bar, shares of the bar's whole per measure. */
function split(rows: [string, Record<string, number>][]): RepoSegment[] {
  const total: Record<string, number> = {}
  for (const [, values] of rows) for (const [key, value] of Object.entries(values)) total[key] = (total[key] ?? 0) + value
  return rows.map(([repo, values]) => ({ repo, name: repo ? repo.split('/').at(-1)! : null, ...values,
    share: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / total[key]])),
    of_repo: Object.fromEntries(Object.keys(values).map(key => [key, null])) }))
}
/** A body as an older server answers it: no split, no ranking. */
function unsplit<T>(body: T): T {
  return JSON.parse(JSON.stringify(body, (key, value) => key === 'repos' || key === 'session_repos' || key === 'kind_repos' ? undefined
    : key === 'repo_order' ? [] : value)) as T
}
function context(data: unknown, navigated: unknown[] = []) {
  const state: DetailState<unknown> = { data, status: 'ready', error: null }
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined, tools: () => [],
    filters: () => ({ projects: [], repos: [], model: 'all' }), openAgent() {}, navigate: (patch: unknown) => navigated.push(patch),
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-view-sessions'), since: base.range.since, until: base.range.until })
const texts = (nodes: Iterable<Element>) => [...nodes].map(node => node.textContent)
const option = (box: Element, name: string) =>
  [...box.querySelectorAll('[data-colour-by] button')].find(button => button.textContent === name) as HTMLButtonElement

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('Colour by, heat grid and flow: the shared chart pieces', () => {
  it('reads the colour choice from the address, the shade from the level, and lays a flow on one scale', () => {
    expect(readColourBy('?by=repo')).toBe('repo')
    expect(readColourBy('?by=kind')).toBe('parts')
    expect(heatFill(0)).toBe('color-mix(in srgb, var(--color-chart-1) 6%, var(--color-surface))')
    expect(heatFill(1)).toBe('color-mix(in srgb, var(--color-chart-1) 60%, var(--color-surface))')
    const layout = flowLayout([{ key: 'a', name: 'A', text: '', hover: '' }, { key: 'b', name: 'B', text: '', hover: '' }],
      [{ key: 'x', name: 'X', text: '', hover: '' }],
      [{ from: 'a', to: 'x', value: 30, hover: '', colour: '' }, { from: 'b', to: 'x', value: 10, hover: '', colour: '' }])
    expect(layout.left.map(node => node.key)).toEqual(['a', 'b'])
    // Bands enter the right node one under the other, as thick as their counts on the shared scale.
    const [a, b] = layout.bands
    expect(b.y1).toBeCloseTo(a.y1 + a.thick)
    expect(a.thick / b.thick).toBeCloseTo(3)
  })
})

// ─── Flows ──────────────────────────────────────────────────────────────────────────────────────────────────────
const flows = {
  ...base, card: 'flows', view: 'insights.flows', query: query('insights.flows'), repo_order: order,
  transitions: [
    { from_step: 'read', calls: 100, next: [{ to_step: 'read', calls: 50, share: 0.5 }, { to_step: 'edit', calls: 30, share: 0.3 }] },
    { from_step: 'edit', calls: 40, next: [{ to_step: 'test', calls: 40, share: 1 }] },
  ],
  endings: {
    committed: { sessions: 10, cost_usd: 60, repos: split([['/src/shop', { sessions: 10 }]]), last_steps: [
      { step: 'commit', sessions: 8, cost_usd: 50, repos: split([['/src/shop', { sessions: 6 }], ['/src/blog', { sessions: 2 }]]) }] },
    changed: { sessions: 4, cost_usd: 20, last_steps: [{ step: 'edit', sessions: 4, cost_usd: 20 }] },
    no_change: { sessions: 6, cost_usd: 10, last_steps: [{ step: 'read', sessions: 6, cost_usd: 10 }] },
  },
  first_paths: [], last_paths: [], cycles: [],
  projects: [{ project: '/src/shop', sessions: 12, committed: 8, changed: 2, no_change: 2, no_change_share: 1 / 6, cost_usd: 70,
    no_change_cost: 5, loops: 0, cycle_seconds: 0, tools: ['claude-code'],
    repos: split([['/src/shop', { sessions: 12, committed: 8, changed: 2, no_change: 2 }]]) }],
  tools: [{ tool: 'claude-code', calls: 140, sessions: 20, seconds: 3600, test_runs: 3, unflagged_tests: 0 }],
  summary: { sessions: 20, cost_usd: 90, enough: true, no_change: 6, no_change_share: 0.3, no_change_cost: 10, no_change_cost_share: 0.11,
    no_change_last: null, committed: 10, changed: 4, working_seconds: 3600, cycle_seconds: 0, cycle_share: 0, top_cycle: null,
    no_test_tools: [], unflagged_tests: 0, small_steps: [], small_paths: 0, small_cycles: 0, small_projects: [] },
  sessions: [],
} as unknown as FlowsBody

describe('Flows view', () => {
  it('draws one band per last step and ending, in order, with the endings written at the right', () => {
    const { host, dispose } = mount(() => <Flows {...props(context(flows))} />)
    const box = host.querySelector('#insight-flows')!
    expect(box.querySelector('[data-finding]')!.textContent).toBe(flowsFinding(flows))
    expect(box.querySelector('[data-finding]')!.textContent).not.toMatch(/\d/)
    expect([...box.querySelectorAll('[data-flow="endings"] [data-band]')].map(band => band.getAttribute('data-band')))
      .toEqual(['commit:committed', 'read:no_change', 'edit:changed', 'other:committed'])
    expect(texts(box.querySelectorAll('[data-flow="endings"] [data-node^="left:"] [data-value]')))
      .toEqual(['8 sessions', '6 sessions', '4 sessions', '2 sessions'])
    expect(texts(box.querySelectorAll('[data-flow="endings"] [data-node^="right:"] [data-value]')))
      .toEqual(['10 · 50% · $60.00', '4 · 20% · $20.00', '6 · 30% · $10.00'])
    dispose()
  })

  it('gives every kind of mark its exact figures on hover', () => {
    const flow = endingFlow(flows)
    expect(flow.links.find(link => link.from === 'other')!.hover).toBe('Another last step → committed: 2 of 10 sessions (20%); ' +
      'last steps not among the 1 listed for this ending.')
    expect(flow.left[0].hover).toBe('Last step commit: 8 of 20 sessions (40%); committed 8.')
    expect(flow.right[0].hover).toBe('Committed: 10 of 20 sessions (50%), $60.00 at list price (67% of $90.00). ' +
      'By repository: shop 10 (100% of these).')
    const grid = transitionGrid(flows)
    expect(grid.columns.map(column => column.key)).toEqual(['read', 'edit', 'test', 'rest'])
    expect(grid.rows[0].cells.map(cell => cell?.text ?? null)).toEqual(['50%', '30%', null, '20%'])
    expect(grid.rows[0].cells[3]!.hover).toBe('After read: the next call was another step kind (not among the 4 listed) 20 times, ' +
      '20% of 100 calls of read.')
    const { host, dispose } = mount(() => <Flows {...props(context(flows))} />)
    const blank = host.querySelector('[data-heat="transitions"] [data-row="read"] [data-blank]')!
    expect(blank.getAttribute('title')).toBe('After read: test run is not among its 4 most frequent next steps.')
    dispose()
  })

  it('switches the colour of the bars between ending and repository', () => {
    const navigated: unknown[] = []
    const { host, dispose } = mount(() => <Flows {...props(context(flows, navigated))} />)
    const box = host.querySelector('#insight-flows')!
    expect([...box.querySelectorAll('[data-chart="projects"] [data-part]')].map(part => part.getAttribute('data-part'))).toEqual(['c3', 'c1', 'c4'])
    option(box, 'Repository').click()
    flush()
    expect(box.querySelector('[data-chart="projects"]')).toBeNull()
    expect([...box.querySelectorAll('[data-chart="projects-repos"] [data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0'])
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    expect(new URLSearchParams(location.search).get('by')).toBe('repo')
    dispose()
  })

  it('draws without a split and offers no switch', () => {
    const { host, dispose } = mount(() => <Flows {...props(context(unsplit(flows)))} />)
    const box = host.querySelector('#insight-flows')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(box.querySelectorAll('[data-flow="endings"] [data-band]').length).toBe(4)
    expect(box.querySelector('[data-node="right:committed"] rect title')!.textContent).not.toContain('By repository')
    dispose()
  })
})
