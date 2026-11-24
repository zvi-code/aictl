// @vitest-environment jsdom
// The views of the group "repos": Work by repository (one grid of every measure). Invented rows only.
import { beforeEach, describe, expect, it } from 'vitest'
import Repositories from '../../src/panels/insights/Repositories'
import { PLAIN_FILL, repoColumns, repoGridFoot, repoGridRows, REPOS_LINE } from '../../src/panels/insights/reposModel'
import type { Repo, RepoBody } from '../../src/panels/insights/workModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const SINCE = 1_700_000_000, UNTIL = 1_702_592_000
const base = {
  range: { since: SINCE, until: UNTIL }, data_range: { first_ts: SINCE + 100, last_ts: UNTIL - 100 }, computed_at: UNTIL,
  query: { view: 'insights.x', kql: 'requests | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
}

function context(state: DetailState<unknown> | undefined, navigated: Record<string, unknown>[] = []) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [], model: 'all' }), tools: () => null, openAgent() {},
    navigate(patch: Record<string, unknown>) { navigated.push(patch) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const ready = (data: unknown) => ({ data, status: 'ready', error: null }) as DetailState<unknown>
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-view-repos'), since: SINCE, until: UNTIL })
const tip = (host: Element, selector: string) => host.querySelector(`${selector} [role="tooltip"]`)?.textContent

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&view=repos') })

// ─── Work by repository ──────────────────────────────────────────────────────────────────────────────────────────
const repo = (values: Partial<Repo> & { repo: string; name: string }): Repo => ({
  kind: 'repository', projects: 1, nodes: 1, sessions: 10, scripted: 6, person: 3, unclassified: 1, cost_usd: 100, cost_share: 0.5,
  priced: 500, requests: 500, unpriced: 0, agent_ms: 7_200_000, timed_sessions: 10, calls: 200, failed: 10, failed_share: 0.05,
  test_runs: 4, writes: 30, files: 20, lines_added: 400, lines_removed: 100, lines_unknown: 0, commits: 10, commit_sessions: 4,
  idle_sessions: 2, cost_per_commit: 10, cost_per_file: 5, small: false, models: [{ model: 'model-a', requests: 500, cost_usd: 100 }],
  top_sessions: [], bins: [], ...values,
})
const alpha = repo({ repo: '/w/alpha', name: 'alpha', cost_usd: 300, cost_share: 0.6, commits: 4, cost_per_commit: 75, files: 40,
  agent_ms: 14_400_000 })
const beta = repo({ repo: '/w/beta', name: 'beta', cost_usd: 150, cost_share: 0.3, commits: 30, cost_per_commit: 5, idle_sessions: 0,
  sessions: 20, scripted: 0, person: 20, unclassified: 0 })
const gamma = repo({ repo: '/w/gamma', name: 'gamma', kind: 'folder', cost_usd: 50, cost_share: 0.1, priced: 12, requests: 12,
  small: true, commits: 0, cost_per_commit: null, agent_ms: null })
const repoBody = {
  ...base, card: 'repos', view: 'insights.repositories', repos: [alpha, beta, gamma], sessions: [],
  repo_order: [{ repo: '/w/alpha', name: 'alpha', cost_usd: 300 }, { repo: '/w/beta', name: 'beta', cost_usd: 150 }],
  repo_others: { repos: 1, cost_usd: 50, requests: 12, sessions: 10 },
  summary: { repos: 3, sessions: 40, cost_usd: 500, commits: 34, files: 80, scripted: 12, person: 26, idle_sessions: 4,
    agent_ms: 21_600_000, unpriced: 4, top: null, dearest_per_commit: null, cheapest_per_commit: null, cost_per_commit: 14.7,
    small: ['gamma'], folders: 1 },
} as unknown as RepoBody

describe('Work by repository · one grid, a row per repository in its colour of the screen', () => {
  it('says what is measured in one line under the title, and keeps the spend total as the headline', () => {
    const { host, dispose } = mount(() => <Repositories {...props(context(ready(repoBody)))} />)
    expect(host.querySelector('[data-finding]')?.textContent).toBe(REPOS_LINE)
    expect(REPOS_LINE.split(/\s+/).length).toBeLessThanOrEqual(28)
    expect(host.querySelector('[data-hero]')?.textContent).toBe('$500spend at list price in 40 sessions across 3 repositories or folders')
    dispose()
  })

  it('draws a row per repository in spend order with every measure written, and the totals under them', () => {
    const { host, dispose } = mount(() => <Repositories {...props(context(ready(repoBody)))} />)
    const grid = host.querySelector('[data-grid="repos"]')!
    expect([...grid.querySelectorAll('[data-head] [role="columnheader"]')].map(th => th.childNodes[0].textContent))
      .toEqual(['Repository or folder', 'Spend', 'Sessions', 'Agent working time', 'Commits', 'Files changed', 'Spend per commit'])
    expect([...grid.querySelectorAll('[role="row"][data-row]:not([data-row="all"])')].map(tr => tr.getAttribute('data-row'))).toEqual(['alpha', 'beta', 'gamma'])
    const written = (row: string) => [...grid.querySelectorAll(`[data-row="${row}"] [data-value]`)].map(cell => cell.textContent)
    expect(written('alpha')).toEqual(['$300 · 60%', '10 · 2 changed nothing', '4 h', '4', '40', '$75.00'])
    expect(written('gamma')).toEqual(['$50.00 · 10%', '10 · 2 changed nothing', 'not reported', '0', '20', 'fewer than 3 commits'])
    expect(written('all')).toEqual(['$500', '40 · 4 changed nothing', '6 h', '34', '80', '$14.70'])
    expect(grid.querySelector('[data-row="all"]')!.textContent).toContain('4 requests unpriced, not counted')
    expect(grid.querySelector('[data-row="all"]')!.textContent).toContain('26 by a person, 12 by a script')
    // Each column on its own scale: the largest value fills its column.
    const width = (row: string, col: string) => (grid.querySelector(`[data-row="${row}"] [data-col="${col}"] [style*="inline-size"]`) as HTMLElement | null)?.style.inlineSize
    expect(width('alpha', 'spend')).toBe('100.00%')
    expect(width('beta', 'spend')).toBe('50.00%')
    expect(width('beta', 'commits')).toBe('100.00%')
    expect(width('beta', 'sessions')).toBe('100.00%')
    expect(width('gamma', 'per-commit')).toBeUndefined()
    expect(width('gamma', 'agent')).toBeUndefined()
    dispose()
  })

  it('colours a ranked repository\'s row in its colour, any other grey, and fades a repository with too few requests', () => {
    const { host, dispose } = mount(() => <Repositories {...props(context(ready(repoBody)))} />)
    const grid = host.querySelector('[data-grid="repos"]')!
    const mark = (row: string) => (grid.querySelector(`[data-row="${row}"] [data-mark]`) as HTMLElement).style.background
    expect(mark('alpha')).toContain('var(--color-chart-1)')
    expect(mark('beta')).toContain('var(--color-chart-2)')
    expect(mark('gamma')).toBe('var(--color-border)')
    const fill = (row: string, col: string) => (grid.querySelector(`[data-row="${row}"] [data-col="${col}"] [data-part]`) as HTMLElement).style.background
    expect(fill('beta', 'commits')).toContain('var(--color-chart-2)')
    expect(grid.querySelector('[data-row="gamma"]')!.hasAttribute('data-faded')).toBe(true)
    expect(grid.querySelector('[data-row="gamma"] [data-tag]')!.textContent).toBe('too few requests')
    // The sessions bar: solid by a person, striped by a script, grey not known.
    const parts = [...grid.querySelectorAll('[data-row="alpha"] [data-col="sessions"] [data-part]')] as HTMLElement[]
    expect(parts.map(part => part.getAttribute('data-part'))).toEqual(['person', 'script', 'unknown'])
    expect(parts.map(part => part.style.flexGrow)).toEqual(['30', '60', '10'])
    expect(parts[1].style.background).toContain('repeating-linear-gradient')
    expect(parts[2].style.background).toBe('var(--color-border)')
    dispose()
  })

  it('gives every kind of bar a hover with its exact figures, its denominator and the colour rule', () => {
    const { host, dispose } = mount(() => <Repositories {...props(context(ready(repoBody)))} />)
    expect(tip(host, '[data-row="alpha"] [data-col="spend"]')).toBe('alpha: $300 at list price, 60% of $500; 500 priced requests of 500; ' +
      '10 sessions. Marked in the colour of alpha on every card: rank 1 by list-price cost.')
    expect(tip(host, '[data-row="alpha"] [data-col="sessions"] [data-part="script"]')).toMatch(
      /^alpha, sessions started by a script: 6 of 10 sessions \(60%\)\. alpha: 10 sessions, 6 by a script, 3 by a person, 1 not known;/)
    expect(tip(host, '[data-row="alpha"] [data-col="agent"]')).toBe('alpha: 4 h of agent working time in 10 timed of 10 sessions; ' +
      'the sum of each turn from its first to its last line. Marked in the colour of alpha on every card: rank 1 by list-price cost.')
    expect(tip(host, '[data-row="beta"] [data-col="commits"]')).toMatch(/^beta: 30 commits in 4 sessions; 20 changed files in 30 writes/)
    expect(tip(host, '[data-row="alpha"] [data-col="per-commit"]')).toMatch(/^alpha: \$300 ÷ 4 commits = \$75\.00 per commit;/)
    expect(tip(host, '[data-row="gamma"] [data-col="spend"]')).toContain('Too few to compare (fewer than 50 model requests): drawn grey. ' +
      'Marked grey: not among the 8 repositories with the highest list-price cost.')
    dispose()
  })

  it('draws without repo_order: no colour marks, one plain colour', () => {
    const plain = { ...repoBody, repo_order: undefined, repo_others: undefined }
    const rows = repoGridRows(plain as RepoBody)
    expect(rows.map(row => row.mark)).toEqual([undefined, undefined, undefined])
    expect(rows[0].cells.spend!.parts[0].fill).toBe(PLAIN_FILL)
    expect(rows[0].cells.spend!.parts[0].hover).not.toContain('colour')
    const { host, dispose } = mount(() => <Repositories {...props(context(ready(plain)))} />)
    expect(host.querySelectorAll('[data-grid="repos"] [role="row"][data-row]:not([data-row="all"])').length).toBe(3)
    expect(host.querySelector('[data-grid="repos"] [data-mark]')).toBeNull()
    dispose()
  })

  it('names each column\'s unit and scale end, and folds rows past the first 15 into the data table', () => {
    expect(repoColumns(repoBody).map(column => column.scale)).toEqual(['$ at list price, 0 to $300',
      '0 to 20; solid by a person, striped by a script, grey not known', 'hours, 0 to 4 h', '0 to 30', '0 to 40',
      '$, 0 to $75.00; needs 3 commits'])
    expect(repoGridFoot(repoBody).label).toBe('All 3 repositories or folders')
    const many = { ...repoBody, repos: Array.from({ length: 17 }, (_, i) => repo({ repo: `/w/r${i}`, name: `r${i}` })) } as RepoBody
    const { host, dispose } = mount(() => <Repositories {...props(context(ready(many)))} />)
    expect(host.querySelectorAll('[data-grid="repos"] [role="row"][data-row]:not([data-row="all"])').length).toBe(15)
    expect(host.querySelector('[data-more-repos]')?.textContent).toBe('2 more in the data table.')
    dispose()
  })
})
