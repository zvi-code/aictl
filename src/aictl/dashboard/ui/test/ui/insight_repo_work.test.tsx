// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Flows from '../../src/panels/insights/Flows'
import type { FlowsBody } from '../../src/panels/insights/flowsModel'
import { OTHER, OTHER_REPOS, type RepoRef, type RepoSegment } from '../../src/panels/insights/repoSplit'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const base = {
  range: { since: 1_700_000_000, until: 1_700_086_400 }, data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 },
  computed_at: 1_700_086_000,
}
const query = (view: string) => ({ view, kql: `// aictl view ${view}\nrequests | take 1`, kusto_url: 'https://c.kusto.windows.net/db' })
const order: RepoRef[] = [
  { repo: '/src/app', name: 'app', cost_usd: 300, requests: 900, sessions: 30 },
  { repo: '/src/docs', name: 'docs', cost_usd: 100, requests: 200, sessions: 5 },
]
const others = { repos: 3, cost_usd: 20, requests: 40, sessions: 4 }

/** Segments of one bar: per repository its measures; shares are of the bar's whole (the first measure's total). */
function split(rows: [string, Record<string, number | null>][], own: Record<string, number | null> = {}): RepoSegment[] {
  const total: Record<string, number> = {}
  for (const [, values] of rows) for (const [key, value] of Object.entries(values)) total[key] = (total[key] ?? 0) + (value ?? 0)
  return rows.map(([repo, values]) => ({
    repo, name: repo ? repo.split('/').at(-1)! : null, ...values,
    share: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value == null ? null : value / total[key]])),
    of_repo: Object.fromEntries(Object.keys(values).map(key => [key, own[`${repo}:${key}`] ?? null])),
  }))
}

function context(state: DetailState<unknown>) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [] }), tools: () => [], openAgent() {},
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-repo-work'), since: base.range.since, until: base.range.until })
const ready = (data: unknown) => context({ data, status: 'ready', error: null })
const legend = (box: Element) => [...box.querySelectorAll('[data-repo-legend] li')].map(item => item.textContent)
/** Strip every `repos` field (and the ranking) from a body: what an older server answers. */
function unsplit<T>(body: T): T {
  return JSON.parse(JSON.stringify(body, (key, value) => key === 'repos' || key === 'session_repos' || key === 'kind_repos'
    ? undefined : key === 'repo_order' ? [] : key === 'repo_others' ? null : value)) as T
}

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

// ─── Flows ──────────────────────────────────────────────────────────────────────────────────────────────────────
const cycle = { pair: ['edit', 'test'], loops: 9, sessions: 6, calls: 120, rounds: 40, seconds: 3600, time_share: 0.2,
  repos: split([['/src/app', { seconds: 2700 }], ['', { seconds: 900 }]]) }
const flows = {
  ...base, card: 'flows', view: 'insights.flows', query: query('insights.flows'), repo_order: order, repo_others: others,
  transitions: [{ from_step: 'edit', calls: 50, next: [{ to_step: 'test', calls: 30, share: 0.6 }] }],
  endings: {
    committed: { sessions: 28, cost_usd: 150, last_steps: [{ step: 'finish', sessions: 28, cost_usd: 150,
      repos: split([['/src/app', { sessions: 20, cost_usd: 120 }], ['/src/docs', { sessions: 8, cost_usd: 30 }]],
        { '/src/app:sessions': 0.8 }) }],
      repos: split([['/src/app', { sessions: 20, cost_usd: 120 }], ['/src/docs', { sessions: 8, cost_usd: 30 }]]) },
    changed: { sessions: 0, cost_usd: null, last_steps: [], repos: [] },
    no_change: { sessions: 12, cost_usd: 50, last_steps: [{ step: 'read', sessions: 12, cost_usd: 50,
      repos: split([['/src/app', { sessions: 5, cost_usd: 20 }], ['', { sessions: 7, cost_usd: 30 }]]) }],
      repos: split([['/src/app', { sessions: 5, cost_usd: 20 }], ['', { sessions: 7, cost_usd: 30 }]]) },
  },
  first_paths: [{ steps: ['skill', 'read'], sessions: 20, repos: split([['/src/app', { sessions: 15 }], ['/src/docs', { sessions: 5 }]]) }],
  last_paths: [],
  cycles: [cycle],
  projects: [{ project: '/work/alpha', sessions: 30, committed: 20, changed: 2, no_change: 8, no_change_share: 8 / 30, cost_usd: 180,
    no_change_cost: 45, loops: 9, cycle_seconds: 3600, tools: ['copilot-cli'],
    repos: split([['/src/app', { sessions: 24, committed: 18, changed: 2, no_change: 4 }],
      ['', { sessions: 6, committed: 2, changed: 0, no_change: 4 }]]) }],
  tools: [{ tool: 'copilot-cli', calls: 900, sessions: 35, seconds: 18_000, test_runs: 0, unflagged_tests: 0,
    repos: split([['/src/app', { calls: 600, seconds: 12_000 }], ['/src/docs', { calls: 200, seconds: 4000 }], ['', { calls: 100, seconds: 2000 }]]) }],
  summary: {
    sessions: 40, cost_usd: 200, enough: true, no_change: 12, no_change_share: 0.3, no_change_cost: 50, no_change_cost_share: 0.25,
    no_change_last: null, committed: 28, changed: 0, working_seconds: 18_000, cycle_seconds: 3600, cycle_share: 0.2, top_cycle: cycle,
    no_test_tools: [], unflagged_tests: 0, small_steps: [], small_paths: 0, small_cycles: 0, small_projects: [],
  },
  sessions: [],
} as unknown as FlowsBody

describe('INS-RW · Flows split by repository', () => {
  it('draws the legend once, keeps the ending bar by outcome and adds a bar per ending split by repository', () => {
    const { host, dispose } = mount(() => <Flows {...props(ready(flows))} />)
    const box = host.querySelector('[data-box="insight-flows"]')!
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    expect(legend(box)).toEqual(['app', 'docs', OTHER_REPOS])
    // The bar by outcome stays as it was.
    expect([...box.querySelectorAll('[data-chart="endings"] [data-part]')].map(part => part.getAttribute('data-part'))).toEqual(['c3', 'c4'])
    const ended = box.querySelector('[data-chart="endings-repos"]')!
    expect([...ended.querySelectorAll('[data-row]')].map(row => row.getAttribute('data-row'))).toEqual(['committed', 'no_change'])
    const committed = ended.querySelector('[data-row="committed"]')!
    expect([...committed.querySelectorAll('[data-part]')].map(part => [part.getAttribute('data-part'), part.getAttribute('data-repo')]))
      .toEqual([['repo:/src/app', '0'], ['repo:/src/docs', '1']])
    expect(committed.querySelector('[data-value]')!.textContent).toBe('28 sessions')
    expect(committed.querySelector('[data-part="repo:/src/app"] title')!.textContent).toBe('Committed — app (/src/app): 20 sessions · ' +
      '71% of this bar. $120 at list price. Committed: 28 of 40 sessions (70%), $150 at list price.')
    expect(ended.querySelector('.axis, p')!.textContent).toContain('A segment per repository.')
    dispose()
  })

  it('splits the last steps, paths, cycles and tools by repository, and adds a project bar by repository', () => {
    const { host, dispose } = mount(() => <Flows {...props(ready(flows))} />)
    const box = host.querySelector('[data-box="insight-flows"]')!
    const repos = (chart: string) => [...box.querySelectorAll(`[data-chart="${chart}"] [data-row] [data-part]`)].map(part => part.getAttribute('data-repo'))
    expect(repos('last-committed')).toEqual(['0', '1'])
    expect(repos('last-no_change')).toEqual(['0', String(OTHER)])
    expect(repos('first-paths')).toEqual(['0', '1'])
    expect(repos('cycles')).toEqual(['0', String(OTHER)])
    expect(repos('tools')).toEqual(['0', '1', String(OTHER)])
    expect(box.querySelector('[data-chart="last-committed"] [data-part="repo:/src/app"] title')!.textContent).toBe('Committed, last step ' +
      'report done — app (/src/app): 20 sessions · 71% of this bar · 80% of app own sessions. $120 at list price. Committed, last step ' +
      'report done: 28 of 28 sessions (100%), $150 at list price.')
    expect(box.querySelector('[data-chart="tools"] [data-part="repo:"] title')!.textContent).toMatch(/^copilot-cli — Other repositories \(every repository outside the 8 with the highest cost, summed\): 100 tool calls · 11% of this bar\. Working time 33 min\. /)
    // The project bar by outcome stays; its counts are written beside it; the second bar splits its sessions.
    expect([...box.querySelectorAll('[data-chart="projects"] [data-part]')].map(part => part.getAttribute('data-part'))).toEqual(['c3', 'c1', 'c4'])
    expect(box.querySelector('[data-chart="projects"] [data-value]')!.textContent).toBe('20 · 2 · 8')
    expect(repos('projects-repos')).toEqual(['0', String(OTHER)])
    expect(box.querySelector('[data-chart="projects-repos"] [data-part="repo:/src/app"] title')!.textContent).toContain(
      'alpha — app (/src/app): 24 sessions · 80% of this bar. Of them 18 committed, 2 changed files without a commit, 4 changed no file.')
    // The transition matrix is not split.
    expect(box.querySelector('[data-transitions]')!.textContent).toContain('Not split by repository.')
    dispose()
  })

  it('draws the old single bars when the answer carries no split', () => {
    const { host, dispose } = mount(() => <Flows {...props(ready(unsplit(flows)))} />)
    const box = host.querySelector('[data-box="insight-flows"]')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-chart="endings-repos"]')).toBeNull()
    expect(box.querySelector('[data-chart="projects-repos"]')).toBeNull()
    expect([...box.querySelectorAll('[data-chart="tools"] [data-part]')].map(part => part.getAttribute('data-part'))).toEqual(['c1'])
    expect(box.querySelector('[data-chart="tools"] p')!.textContent).not.toContain('repository')
    dispose()
  })
})
