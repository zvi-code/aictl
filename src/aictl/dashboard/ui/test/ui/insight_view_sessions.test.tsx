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
import type { ProblemBody } from '../../src/panels/insights/insightsModel'
import ProblemSessions from '../../src/panels/insights/ProblemSessions'
import { pairBlank, pairGrid, problemLine, projectGrid, signalToolGrid } from '../../src/panels/insights/problemsModel'
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

// ─── Problem sessions ───────────────────────────────────────────────────────────────────────────────────────────
const cellOf = (signal: string, sessions: number | null, share: number | null, cost: number | null, repos?: RepoSegment[]) =>
  ({ signal, reported: sessions != null, sessions, share, cost_usd: cost, repos })
const problems = {
  ...base, card: 'problems', view: 'insights.problem_sessions', query: query('insights.problem_sessions'), repo_order: order, sessions: [],
  tools: [
    { tool: 'claude-code', sessions: 50, reports: true, flagged: 20, multi: 5, flagged_cost_usd: 40, cost_usd: 100,
      repos: split([['/src/shop', { sessions: 30, flagged: 15, multi: 4 }], ['/src/blog', { sessions: 20, flagged: 5, multi: 1 }]]),
      signals: [cellOf('compaction', 8, 0.16, 20, split([['/src/shop', { sessions: 6 }], ['/src/blog', { sessions: 2 }]])),
        cellOf('failure_streak', 12, 0.24, 30), cellOf('failed_delegation', 0, 0, 0), cellOf('api_error', 3, 0.06, 5),
        cellOf('open_todos', null, null, null), cellOf('hook_failure', 1, 0.02, 1)] },
    { tool: 'copilot-cli', sessions: 30, reports: true, flagged: 6, multi: 0, flagged_cost_usd: 9, cost_usd: 30,
      signals: [cellOf('compaction', 2, 0.07, 3), cellOf('failure_streak', 4, 0.13, 6), cellOf('failed_delegation', 0, 0, 0),
        cellOf('api_error', null, null, null), cellOf('open_todos', 0, 0, 0), cellOf('hook_failure', null, null, null)] },
  ],
  signals: [],
  pairs: [{ signals: ['compaction', 'failure_streak'], sessions: 4, cost_usd: 15 }, { signals: ['failure_streak', 'api_error'], sessions: 2, cost_usd: 4 }],
  projects: [{ project: '/src/shop', sessions: 15, all_sessions: 30, tools: ['claude-code'], cost_usd: 30,
    signals: { compaction: 6, failure_streak: 9, failed_delegation: 0, api_error: 2, open_todos: 0, hook_failure: 1 } }],
  other_projects: { sessions: 11, cost_usd: 19, signals: { compaction: 4, failure_streak: 7 } },
  summary: { sessions: 80, flagged: 26, flagged_share: 26 / 80, multi: 5, flagged_cost_usd: 49, not_reporting: [] },
} as unknown as ProblemBody

describe('Problem sessions view', () => {
  it('draws a 100% bar per tool by number of signals, in order, with the counts written on it, and the line under the title', () => {
    const { host, dispose } = mount(() => <ProblemSessions {...props(context(problems))} />)
    const box = host.querySelector('#insight-problems')!
    expect(box.querySelector('[data-finding]')!.textContent).toBe(problemLine(problems))
    expect(box.querySelector('[data-hero]')!.textContent).toBe('33%of 80 sessions recorded one or more signals (26; 5 two or more) · $49.00 at list price')
    const rows = box.querySelectorAll('[data-chart="problem-counts"] [data-row]')
    expect([...rows].map(row => row.getAttribute('data-row'))).toEqual(['claude-code', 'copilot-cli'])
    expect(texts(rows[0].querySelectorAll('[data-part] button'))).toEqual(['5', '15', '30'])
    expect(texts(rows[1].querySelectorAll('[data-part] button'))).toEqual(['6', '24'])
    expect(texts(box.querySelectorAll('[data-chart="problem-counts"] [data-total]'))).toEqual(['50 sessions', '30 sessions'])
    dispose()
  })

  it('gives every kind of cell its exact figures on hover', () => {
    const tools = signalToolGrid(problems, tool => tool)
    expect(tools.rows.map(row => row.key)).toEqual(['compaction', 'failure_streak', 'failed_delegation', 'api_error', 'open_todos', 'hook_failure'])
    expect(tools.rows[0].cells[0]!.hover).toBe('claude-code, repeated compaction: 8 of 50 sessions (16%); their requests cost $20.00 at ' +
      'list price. Rule: 3 or more compactions in the session. By repository: shop 6 (75% of these), blog 2 (25% of these).')
    expect(tools.rows[3].cells[1]).toMatchObject({ text: 'not recorded', hatched: true,
      hover: 'copilot-cli, ended on an API error: not recorded by this tool, so not counted.' })
    const pairs = pairGrid(problems)
    expect(pairs.rows.map(row => row.key)).toEqual(['compaction', 'failure_streak', 'failed_delegation', 'api_error', 'open_todos'])
    expect(pairs.columns.map(column => column.key)).toEqual(['failure_streak', 'failed_delegation', 'api_error', 'open_todos', 'hook_failure'])
    expect(pairs.rows[0].cells[0]).toMatchObject({ text: '4', sub: '$15.00', level: 1 })
    expect(pairs.rows[1].cells[2]).toMatchObject({ text: '2', level: 0.5 })
    expect(pairs.rows[0].cells[1]).toMatchObject({ text: '0', hover: 'Repeated compaction and failed delegation in the same session: ' +
      'no session in this period.' })
    expect(pairs.rows[1].cells[0]).toBeNull()
    expect(pairBlank(pairs.rows[2], pairs.columns[0])).toBe('Failure streak and failed delegation: the cell above the diagonal.')
    expect(pairBlank(pairs.rows[1], pairs.columns[0])).toBe('Failure streak: a signal with itself is not a pair.')
    const projects = projectGrid(problems)
    expect(projects.columns.map(column => column.name)).toEqual(['shop', 'Other projects'])
    expect(projects.rows[1].cells.map(cell => [cell!.text, cell!.sub ?? null])).toEqual([['9', '30%'], ['7', null]])
    expect(projects.rows[1].cells[0]!.hover).toBe('shop, failure streak: 9 sessions, 30% of its 30 sessions. Rule: 3 or more failed ' +
      'tool calls in a row by one agent.')
  })

  it('switches the counts between number of signals and repository', () => {
    const navigated: unknown[] = []
    const { host, dispose } = mount(() => <ProblemSessions {...props(context(problems, navigated))} />)
    const box = host.querySelector('#insight-problems')!
    option(box, 'Repository').click()
    flush()
    expect(box.querySelector('[data-chart="problem-counts"]')).toBeNull()
    expect([...box.querySelectorAll('[data-chart="problem-counts-repos"] [data-row]')].map(row => row.getAttribute('data-row')))
      .toEqual(['claude-code:multi', 'claude-code:one', 'claude-code:none'])
    option(box, 'Number of signals').click()
    flush()
    expect(box.querySelector('[data-chart="problem-counts"]')).not.toBeNull()
    expect(navigated).toEqual([{ by: 'repo' }, { by: null }])
    dispose()
  })

  it('draws without a split and offers no switch', () => {
    const { host, dispose } = mount(() => <ProblemSessions {...props(context(unsplit(problems)))} />)
    const box = host.querySelector('#insight-problems')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(box.querySelectorAll('[data-chart="problem-counts"] [data-row]').length).toBe(2)
    expect(box.querySelectorAll('[data-heat="problem-pairs"] [data-cell]').length).toBe(15)
    dispose()
  })
})
