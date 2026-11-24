// @vitest-environment jsdom
// The session views of Insights at full width: Flows, Problem sessions, What the agents changed, Verified before commit
// and Orientation cost. Per view: the marks of the main chart, the colour switch, one hover per kind of mark, the line
// under the title, and a body without a split by repository. Invented rows only.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { flowLayout } from '../../src/panels/insights/charts/FlowDiagram'
import { heatFill } from '../../src/panels/insights/charts/HeatGrid'
import { readColourBy } from '../../src/panels/insights/charts/ColourBy'
import Changes from '../../src/panels/insights/Changes'
import { changeLine } from '../../src/panels/insights/changesModel'
import Flows from '../../src/panels/insights/Flows'
import { endingFlow, flowsFinding, transitionGrid, type FlowsBody } from '../../src/panels/insights/flowsModel'
import type { OrientationBody, ProblemBody } from '../../src/panels/insights/insightsModel'
import Orientation from '../../src/panels/insights/Orientation'
import { neverCostRows, orientationLine, projectDots } from '../../src/panels/insights/orientationModel'
import ProblemSessions from '../../src/panels/insights/ProblemSessions'
import { pairBlank, pairGrid, problemLine, projectGrid, signalToolGrid } from '../../src/panels/insights/problemsModel'
import type { RepoRef, RepoSegment } from '../../src/panels/insights/repoSplit'
import VerifiedCommits from '../../src/panels/insights/VerifiedCommits'
import { verifiedLine, type VerifiedBody } from '../../src/panels/insights/verifiedModel'
import type { ChangeBody } from '../../src/panels/insights/workModel'
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
/** Whether a value is a list of segments (repoSplit), not a view's own `repos` rows. */
const segments = (value: unknown) => Array.isArray(value) && value.every(item => item && typeof item === 'object' && 'share' in item)
/** A body as an older server answers it: no split, no ranking. */
function unsplit<T>(body: T): T {
  return JSON.parse(JSON.stringify(body, (key, value) => (key === 'repos' || key === 'session_repos') && segments(value)
    || key === 'kind_repos' ? undefined : key === 'repo_order' ? [] : value)) as T
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

// ─── What the agents changed ────────────────────────────────────────────────────────────────────────────────────
const kinds = (source: number, tests: number, docs: number) => ({ source, tests, docs, config: 0, memory: 0, other: 0 })
const changeRepo = (repo: string, name: string, files: number, writes: number, commits: number, extra: Record<string, unknown> = {}) => ({
  repo, name, kind: 'repository', sessions: 10, change_sessions: 8, commit_sessions: commits ? 4 : 0, uncommitted_sessions: commits ? 4 : 8,
  writes, committed_writes: commits ? writes / 2 : 0, committed_share: commits ? 0.5 : 0, files, files_share: files / 30, reworked: 1,
  kinds: kinds(files - 4, 3, 1), lines_added: 100, lines_removed: 20, lines_unknown: 0, commits, commit_days: commits ? 2 : 0,
  cost_usd: 60, agent_ms: 3_600_000, cost_per_commit: commits >= 3 ? 60 / commits : null, time_per_commit_ms: commits >= 3 ? 3_600_000 / commits : null,
  small: false, repos: split([[repo, { files, writes, committed_writes: commits ? writes / 2 : 0, commits }]]), ...extra,
})
const changes = {
  ...base, card: 'changes', view: 'insights.changes', query: query('insights.changes'), repo_order: order, sessions: [],
  repos: [changeRepo('/src/shop', 'shop', 20, 80, 6), changeRepo('/src/blog', 'blog', 10, 30, 1)],
  files: [{ repo: '/src/shop', repo_name: 'shop', path: '/src/shop/app.ts', kind: 'source', writes: 12, sessions: 4, most_in_session: 5,
    repos: split([['/src/shop', { writes: 12 }]]) }],
  bins: [{ start: 1_700_000_000, commits: 3, writes: 50, repos: split([['/src/shop', { commits: 2, writes: 40 }], ['/src/blog', { commits: 1, writes: 10 }]]) },
    { start: 1_700_086_400, commits: 4, writes: 60 }],
  summary: { repos: 2, writes: 110, files: 30, committed_writes: 55, committed_share: 0.5, commits: 7, change_sessions: 16, uncommitted_sessions: 12,
    lines_added: 200, lines_removed: 40, reworked: 1, kinds: kinds(22, 6, 2), top: null, most_uncommitted: null, dearest_per_commit: null,
    cheapest_per_commit: null, top_file: null, small: [] },
} as unknown as ChangeBody

describe('What the agents changed view', () => {
  it('draws the changed files per repository split by kind, in order, with files and share written beside', () => {
    const { host, dispose } = mount(() => <Changes {...props(context(changes))} />)
    const box = host.querySelector('#insight-changes')!
    expect(box.querySelector('[data-finding]')!.textContent).toBe(changeLine(changes))
    const rows = box.querySelectorAll('[data-chart="files"] [data-bar]')
    expect([...rows].map(row => row.getAttribute('data-bar'))).toEqual(['shop', 'blog'])
    expect(texts(box.querySelectorAll('[data-chart="files"] [data-value]'))).toEqual(['20 · 67%', '10 · 33%'])
    expect([...rows[0].querySelectorAll('[data-part]')].map(part => part.getAttribute('data-part')))
      .toEqual(['source', 'tests', 'docs', 'config and data', 'memory and instructions', 'other'])
    expect(texts(box.querySelectorAll('[data-dots="per-commit"] [data-value]'))).toEqual(['$10.00', '10 min', 'fewer than 3 commits', ''])
    dispose()
  })

  it('gives every kind of mark its exact figures on hover', () => {
    const { host, dispose } = mount(() => <Changes {...props(context(changes))} />)
    const box = host.querySelector('#insight-changes')!
    expect(box.querySelector('[data-chart="files"] [data-bar="shop"] [role="tooltip"]')!.textContent).toBe('shop: 20 distinct files changed, ' +
      '67% of 30; 80 writes, lines +100 −20; kinds: 16 source · 3 tests · 1 docs.')
    expect(box.querySelector('[data-chart="kind-total"] [role="tooltip"]')!.textContent).toMatch(/^All repositories: 30 changed files: source 22 \(73%\)/)
    expect(box.querySelector('[data-dots="per-commit"] [data-row="shop"] [data-dot="spend"]')!.getAttribute('title'))
      .toBe('shop: $60.00 at list price ÷ 6 commits = $10.00.')
    expect(box.querySelector('[data-dots="per-commit"] [data-row="blog"] [data-dot]')).toBeNull()
    expect(box.querySelector('[data-chart="commits"] [data-column="1700000000"] rect title')!.textContent).toBe('Nov 14: 3 commits, 50 file writes.')
    expect(box.querySelector('[data-chart="reworked"] [data-bar="app.ts"] [role="tooltip"]')!.textContent)
      .toBe('/src/shop/app.ts (source, shop): 12 writes in 4 sessions, at most 5 in one session.')
    dispose()
  })

  it('switches between kind of file and repository', () => {
    const navigated: unknown[] = []
    const { host, dispose } = mount(() => <Changes {...props(context(changes, navigated))} />)
    const box = host.querySelector('#insight-changes')!
    option(box, 'Repository').click()
    flush()
    expect([...box.querySelectorAll('[data-chart="files"] [data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1'])
    expect(box.querySelector('[data-chart="files"] [data-bar="shop"] [role="tooltip"]')!.textContent)
      .toContain('Marked in the colour of shop on every card: rank 1 by list-price cost.')
    expect([...box.querySelectorAll('[data-chart="commits"] [data-column="1700000000"] rect')].map(rect => rect.getAttribute('data-repo'))).toEqual(['0', '1'])
    expect(box.querySelector('[data-chart="kind-total"]')).toBeNull()
    option(box, 'Kind of file and commit').click()
    flush()
    expect(box.querySelector('[data-chart="kind-total"]')).not.toBeNull()
    expect(navigated).toEqual([{ by: 'repo' }, { by: null }])
    dispose()
  })

  it('draws without a split and offers no switch', () => {
    const { host, dispose } = mount(() => <Changes {...props(context(unsplit(changes)))} />)
    const box = host.querySelector('#insight-changes')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(box.querySelectorAll('[data-chart="files"] [data-bar]').length).toBe(2)
    expect(box.querySelectorAll('[data-chart="commits"] [data-column] rect').length).toBe(2)
    dispose()
  })
})

// ─── Verified before commit ─────────────────────────────────────────────────────────────────────────────────────
const verifiedTool = (tool: string, values: Record<string, unknown>) => ({
  tool, commits: 10, passed: null, unreported: 4, failed: 1, changed_after: 2, never_tested: 2, no_change: 1, unknown_change: 0,
  not_recorded: 0, by_subagent: 0, own_unseen: 3, commit_sessions: 4, top_session_commits: 4, edit_sessions: 8, untested_sessions: 3,
  commands: 50, commands_with_text: 50, test_runs: 9, test_results: 0, remote_commits: 0, edits_no_file: 0, sessions_no_text: 0,
  sessions_edits_unrecorded: 0, classified: 10, unseen: 4, checked: true, unseen_share: 0.4, own_unseen_share: 0.3, unchecked: 0,
  pass_tool: false, ...values,
})
const verified = {
  ...base, card: 'verified', view: 'insights.verified_commits', query: query('insights.verified_commits'), repo_order: order, sessions: [],
  tools: [verifiedTool('claude-code', {
    repos: split([['/src/shop', { commits: 6, unreported: 3, never_tested: 2, failed: 1 }], ['/src/blog', { commits: 4, unreported: 1, changed_after: 2, no_change: 1 }]]),
    session_repos: split([['/src/shop', { edit_sessions: 5, untested_sessions: 2 }], ['/src/blog', { edit_sessions: 3, untested_sessions: 1 }]]) }),
  verifiedTool('copilot-cli', { commits: 0, edit_sessions: 2, untested_sessions: 2, classified: 0, unseen: 0, unseen_share: null })],
  summary: { commits: 10, classified: 10, unseen: 4, unseen_share: 0.4, own_unseen: 3, own_unseen_share: 0.3, changed_after: 2, never_tested: 2,
    no_change: 1, failed: 1, passed: null, unchecked: 0, edit_sessions: 10, untested_sessions: 5, remote_commits: 0, sessions_no_text: 0,
    checked_tools: ['claude-code'], not_reported: [], not_classified: [], one_session: [] },
} as unknown as VerifiedBody

describe('Verified before commit view', () => {
  it('draws a 100% bar per tool by what test runs saw, in the order of the classes, with count and share written', () => {
    const { host, dispose } = mount(() => <VerifiedCommits {...props(context(verified))} />)
    const box = host.querySelector('#insight-verified')!
    expect(box.querySelector('[data-finding]')!.textContent).toBe(verifiedLine(verified))
    const row = box.querySelector('[data-chart="verified-commits"] [data-tool="claude-code"]')!
    expect([...row.querySelectorAll('[data-segment]')].map(segment => segment.getAttribute('data-segment')))
      .toEqual(['unreported', 'failed', 'changed_after', 'never_tested', 'no_change'])
    expect(texts(row.querySelectorAll('[data-segment] button'))).toEqual(['4 · 40%', '1 · 10%', '2 · 20%', '2 · 20%', '1 · 10%'])
    expect(box.querySelector('[data-chart="verified-commits"] [data-tool="copilot-cli"]')).toBeNull()
    expect(texts(box.querySelectorAll('[data-chart="verified-sessions"] [data-sessions-tool="claude-code"] [data-part] button')))
      .toEqual(['5 · 63%', '3 · 38%'])
    dispose()
  })

  it('gives each kind of mark its exact figures on hover', () => {
    const { host, dispose } = mount(() => <VerifiedCommits {...props(context(verified))} />)
    const box = host.querySelector('#insight-verified')!
    expect(box.querySelector('[data-segment="failed"] [role="tooltip"]')!.textContent).toBe('claude-code · Tested, failed: 1 of 10 commits ' +
      '(10%); 10% of the 10 classified commits. Rule: a test run saw every source change before the commit, and the last such run ' +
      'failed. The tool\'s commits come from 4 sessions; the largest has 4 commits.')
    expect(box.querySelector('[data-sessions-tool="claude-code"] [data-part="untested"] [role="tooltip"]')!.textContent).toBe('claude-code: ' +
      '3 of 8 sessions that changed source files (38%) ran no recognised test in the period. A source change is an edit-tool write or ' +
      'an in-place shell edit of a file that is not documentation or data.')
    dispose()
  })

  it('switches between what test runs saw and repository', () => {
    const navigated: unknown[] = []
    const { host, dispose } = mount(() => <VerifiedCommits {...props(context(verified, navigated))} />)
    const box = host.querySelector('#insight-verified')!
    option(box, 'Repository').click()
    flush()
    expect(box.querySelector('[data-chart="verified-commits"]')).toBeNull()
    const commits = box.querySelector('[data-chart="verified-commits-repos"] [data-row="claude-code"]')!
    expect([...commits.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1'])
    expect(commits.querySelector('[data-part="repo:/src/blog"] [role="tooltip"]')!.textContent).toContain('By what test runs saw: ' +
      'Tested, passed not reported · Tested, result not recorded 1 · Tested, failed not reported · Changed after last test 2')
    expect([...box.querySelectorAll('[data-chart="verified-sessions-repos"] [data-row]')].map(row => row.getAttribute('data-row'))).toEqual(['claude-code'])
    option(box, 'What test runs saw').click()
    flush()
    expect(box.querySelector('[data-chart="verified-commits"]')).not.toBeNull()
    expect(navigated).toEqual([{ by: 'repo' }, { by: null }])
    dispose()
  })

  it('draws without a split and offers no switch', () => {
    const { host, dispose } = mount(() => <VerifiedCommits {...props(context(unsplit(verified)))} />)
    const box = host.querySelector('#insight-verified')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(box.querySelectorAll('[data-chart="verified-commits"] [data-segment]').length).toBe(5)
    expect(box.querySelector('[data-idle]')!.textContent).toBe('No commit in this period by copilot-cli.')
    dispose()
  })
})

// ─── Orientation cost by repository ─────────────────────────────────────────────────────────────────────────────
const orientation = {
  ...base, card: 'orientation', view: 'insights.orientation', query: query('insights.orientation'), repo_order: order, sessions: [],
  projects: [
    { project_path: '/src/shop', sessions: 30, tools: ['claude-code'], p50_requests: 6, p50_cost_usd: 0.6 },
    { project_path: '/work/notes', sessions: 12, tools: ['copilot-cli'], p50_requests: 12, p50_cost_usd: null },
  ],
  tools: [
    { tool: 'claude-code', sessions: 50, edited: 35, no_project: 0, p50_requests: 7, never: 15, never_requests: 90, never_cost_usd: 9,
      repos: split([['/src/shop', { sessions: 40, edited: 30, never: 10, never_requests: 60, never_cost_usd: 6 }],
        ['/src/blog', { sessions: 10, edited: 5, never: 5, never_requests: 30, never_cost_usd: 3 }]]) },
    { tool: 'copilot-cli', sessions: 20, edited: 20, no_project: 0, p50_requests: 12, never: 0, never_requests: 0, never_cost_usd: 0 },
  ],
  summary: { sessions: 70, edited: 55, projects: 2, never: 15, never_cost_usd: 9, no_project: 0, unpriced_requests: 2 },
} as unknown as OrientationBody

describe('Orientation cost view', () => {
  it('draws a dot row per project in the order of the answer, its two medians written, and the line under the title', () => {
    const { host, dispose } = mount(() => <Orientation {...props(context(orientation))} />)
    const box = host.querySelector('#insight-orientation')!
    expect(box.querySelector('[data-finding]')!.textContent).toBe(orientationLine(orientation))
    expect(box.querySelector('[data-hero]')).toBeNull()
    const rows = box.querySelectorAll('[data-dots="orientation-projects"] [data-row]')
    expect([...rows].map(row => row.getAttribute('data-row'))).toEqual(['/src/shop', '/work/notes'])
    expect(texts(box.querySelectorAll('[data-dots="orientation-projects"] [data-value]'))).toEqual(['6 requests', '$0.60', '12 requests', 'not reported'])
    expect(texts(box.querySelectorAll('[data-dots="orientation-projects"] [data-measure] small'))).toEqual(['0 to 12', '0 to $0.60'])
    expect(rows[0].querySelector('[data-dot="requests"]')!.getAttribute('style')).toContain('inset-inline-start: 50.00%')
    expect(box.querySelector('[data-unpriced]')!.textContent).toBe('2 requests with no known cost are left out of the cost.')
    dispose()
  })

  it('gives each kind of mark its exact figures on hover', () => {
    const dots = projectDots(orientation, tool => tool, false)
    expect(dots.rows[0].values[1].hover).toBe('/src/shop: median 6 main-agent requests costing $0.60 at list price before the first ' +
      'edit, over 30 sessions that edit (claude-code).')
    expect(neverCostRows(orientation, tool => tool).map(row => row.key)).toEqual(['claude-code'])
    const { host, dispose } = mount(() => <Orientation {...props(context(orientation))} />)
    const box = host.querySelector('#insight-orientation')!
    expect(box.querySelector('[data-chart="orientation-tools"] [data-row="claude-code"] [data-part="edited"] [role="tooltip"]')!.textContent)
      .toBe('claude-code: 35 of 50 sessions (70%) recorded an edit; the median one made 7 requests before it.')
    expect(box.querySelector('[data-chart="orientation-never"] [role="tooltip"]')!.textContent).toBe('claude-code: 15 of 50 sessions (30%) ' +
      'recorded no edit; their main agents made 90 requests costing $9.00 at list price. All tools: 15 sessions with no edit, $9.00 at list price.')
    dispose()
  })

  it('switches between edit and repository', () => {
    const navigated: unknown[] = []
    const { host, dispose } = mount(() => <Orientation {...props(context(orientation, navigated))} />)
    const box = host.querySelector('#insight-orientation')!
    option(box, 'Repository').click()
    flush()
    expect([...box.querySelectorAll('[data-chart="orientation-tools-repos"] [data-row] [data-part]')].map(part => part.getAttribute('data-repo')))
      .toEqual(['0', '1'])
    expect([...box.querySelectorAll('[data-dots="orientation-projects"] [data-row]')].map(row => row.querySelector('[data-swatch]') != null))
      .toEqual([true, false])
    option(box, 'Edit').click()
    flush()
    expect(box.querySelector('[data-chart="orientation-tools"]')).not.toBeNull()
    expect(navigated).toEqual([{ by: 'repo' }, { by: null }])
    dispose()
  })

  it('gives the value column of the dot rows one width in every row, so that the axes of a measure line up', () => {
    // Each row's cell is a grid of its own: a value column sized by its content made each row's axis a different length.
    const css = readFileSync(join(__dirname, '../../src/panels/insights/charts/DotRows.module.css'), 'utf8')
    const cell = /^\.cell \{([^}]*)\}/m.exec(css)![1]
    expect(cell).toMatch(/grid-template-columns: minmax\(4rem, 1fr\) \d+(\.\d+)?rem;/)
  })

  it('draws without a split and offers no switch', () => {
    const { host, dispose } = mount(() => <Orientation {...props(context(unsplit(orientation)))} />)
    const box = host.querySelector('#insight-orientation')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(box.querySelectorAll('[data-dots="orientation-projects"] [data-row]').length).toBe(2)
    expect(box.querySelectorAll('[data-chart="orientation-tools"] [data-row]').length).toBe(2)
    dispose()
  })
})
