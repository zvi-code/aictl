// @vitest-environment jsdom
// Every name on the views of the work by repository is a way in: a repository narrows the page to its root, a project
// to its folder, a coding tool or a model to it, a rewritten file opens the file, a session its flow. A kind of file, a
// bin and a total stay text. Rows are invented.
import { beforeEach, describe, expect, it } from 'vitest'
import Changes from '../../src/panels/insights/Changes'
import type { OrientationBody } from '../../src/panels/insights/insightsModel'
import ModelReport from '../../src/panels/insights/ModelReport'
import type { ModelBody, ModelFigures, ModelRow } from '../../src/panels/insights/modelReportModel'
import Orientation from '../../src/panels/insights/Orientation'
import Repositories from '../../src/panels/insights/Repositories'
import type { RepoRef, RepoSegment } from '../../src/panels/insights/repoSplit'
import VerifiedCommits from '../../src/panels/insights/VerifiedCommits'
import type { VerifiedBody, VerifiedTool } from '../../src/panels/insights/verifiedModel'
import type { ChangeBody, ChangeRepo, Repo, RepoBody } from '../../src/panels/insights/workModel'
import type { Detail, DetailState, PanelContext } from '../../src/panels/types'
import { installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

type Went = { details: Detail[]; agents: string[]; patches: Record<string, unknown>[] }
function context(data: unknown) {
  const went: Went = { details: [], agents: [], patches: [] }
  const state: DetailState<unknown> = { data, status: 'ready', error: null }
  const ctx = {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [], model: 'all' }), tools: () => [],
    openAgent(id: string, tab = 'flow') { went.agents.push(`${id}:${tab}`) },
    openDetail(detail: Detail) { went.details.push(detail) },
    navigate(patch: Record<string, unknown>) { went.patches.push(patch) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
  return { ctx, went }
}
const range = { since: 1_700_000_000, until: 1_700_604_800 }
const base = { range, data_range: { first_ts: range.since + 100, last_ts: range.until - 100 }, computed_at: range.until,
  query: { view: 'insights.x', kql: '// aictl view insights.x\nrequests | take 1', kusto_url: 'https://c.kusto.windows.net/db' } }
const show = (ctx: PanelContext) => ({ ctx, since: range.since, until: range.until })

/** Clicks an element, an SVG text included. */
const press = (node: Element | null | undefined) => {
  expect(node).toBeTruthy()
  node!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}
/** The buttons whose accessible name holds `label`: in the charts (`where` 'chart') or in the data table. A table cell's
 * name starts with the cell's text when the label does not contain it. */
const labelled = (host: Element, label: string, where: 'chart' | 'table') => [...host.querySelectorAll('[aria-label]')]
  .filter(node => node.getAttribute('aria-label')!.endsWith(label) && !!node.closest('table') === (where === 'table'))
const repoPatch = (root: string) => ({ repo: [root], project: null, sel: null })
const repoLabel = (name: string, root: string) => `Show only the repository ${name} (${root}) on every view`

function segments(rows: [string, Record<string, number>][]): RepoSegment[] {
  return rows.map(([repo, values]) => ({ repo, name: repo.split('/').at(-1) ?? null, ...values,
    share: Object.fromEntries(Object.keys(values).map(key => [key, 1])), of_repo: Object.fromEntries(Object.keys(values).map(key => [key, null])) }))
}
const order: RepoRef[] = [{ repo: '/work/alpha', name: 'alpha', cost_usd: 90 }, { repo: '/work/beta', name: 'beta', cost_usd: 30 }]

// ─── What the agents changed ───────────────────────────────────────────────────────────────────────────────────
const kinds = { source: 8, tests: 2, docs: 1, config: 0, memory: 0, other: 0 }
const changeRepo = (repo: string, name: string, values: Partial<ChangeRepo> = {}): ChangeRepo => ({
  repo, name, kind: 'repository', sessions: 10, change_sessions: 8, commit_sessions: 4, uncommitted_sessions: 4, writes: 60, committed_writes: 40,
  committed_share: 2 / 3, files: 11, files_share: 0.5, reworked: 1, kinds, lines_added: 300, lines_removed: 50, lines_unknown: 0,
  commits: 6, commit_days: 3, cost_usd: 60, agent_ms: 3_600_000, cost_per_commit: 10, time_per_commit_ms: 600_000, small: false, ...values,
})
const alpha = changeRepo('/work/alpha', 'alpha', { repos: segments([['/work/alpha', { files: 11, writes: 60 }]]) })
const beta = changeRepo('/work/beta', 'alpha', { repos: segments([['/work/beta', { files: 11, writes: 60 }]]) })
const rewritten = { repo: '/work/alpha', repo_name: 'alpha', path: '/work/alpha/src/parse.ts', kind: 'source', writes: 9, sessions: 3,
  most_in_session: 4, repos: segments([['/work/alpha', { writes: 9 }]]) }
const changes = {
  ...base, card: 'changes', view: 'insights.changes', repo_order: order, repos: [alpha, beta], files: [rewritten],
  bins: [{ start: range.since, commits: 3, writes: 50 }], sessions: [],
  summary: { repos: 2, writes: 120, files: 22, committed_writes: 80, committed_share: 2 / 3, commits: 12, change_sessions: 16,
    uncommitted_sessions: 8, lines_added: 600, lines_removed: 100, reworked: 1, kinds: { source: 16, tests: 4, docs: 2, config: 0, memory: 0, other: 0 },
    top: null, most_uncommitted: null, dearest_per_commit: null, cheapest_per_commit: null, top_file: rewritten, small: [],
    kind_repos: { source: segments([['/work/alpha', { files: 8 }], ['/work/beta', { files: 8 }]]) } },
} as unknown as ChangeBody

describe('INS-OPEN · What the agents changed', () => {
  it('a repository row narrows the page to its root on every chart and in the table, even when two share a short name', () => {
    const { ctx, went } = context(changes)
    const { host, dispose } = mount(() => <Changes {...show(ctx)} />)
    // Two repositories named "alpha": each row opens its own root.
    for (const chart of ['files', 'writes', 'sessions']) {
      const rows = [...host.querySelectorAll(`[data-chart="${chart}"] [data-bar="alpha"] [data-open]`)]
      expect(rows, chart).toHaveLength(2)
      for (const row of rows) press(row.closest('button'))
    }
    press(host.querySelector('[data-dots="per-commit"] [data-row="alpha"] [data-open]'))
    expect(went.patches).toEqual([...Array(3).fill(null).flatMap(() => [repoPatch('/work/alpha'), repoPatch('/work/beta')]), repoPatch('/work/alpha')])
    press(labelled(host, repoLabel('beta', '/work/beta'), 'table')[0])
    expect(went.patches.at(-1)).toEqual(repoPatch('/work/beta'))
    dispose()
  })

  it('a rewritten file opens the file; a kind of file and the total of the period stay text', () => {
    const { ctx, went } = context(changes)
    const { host, dispose } = mount(() => <Changes {...show(ctx)} />)
    press(host.querySelector('[data-chart="reworked"] [data-bar="parse.ts"] [data-open]')?.closest('button'))
    expect(went.details).toEqual([{ type: 'file', path: '/work/alpha/src/parse.ts' }])
    expect(host.querySelector('[data-chart="kind-total"] [data-open]')).toBeNull()
    expect(host.querySelector('[data-chart="commits"] [data-open]')).toBeNull()
    dispose()
  })

  it('coloured by repository: the split rewritten-file bar still opens the file, the split kinds stay text', () => {
    history.replaceState(null, '', '/?screen=insights&range=all&by=repo')
    const { ctx, went } = context(changes)
    const { host, dispose } = mount(() => <Changes {...show(ctx)} />)
    press(host.querySelector('[data-chart="reworked"] [data-open]'))
    expect(went.details).toEqual([{ type: 'file', path: '/work/alpha/src/parse.ts' }])
    expect(host.querySelector('[data-chart="kinds"] [data-open]')).toBeNull()
    press(host.querySelectorAll('[data-chart="files"] [data-bar="alpha"] [data-open]')[1]?.closest('button'))
    expect(went.patches).toEqual([repoPatch('/work/beta')])
    dispose()
  })
})

// ─── Verified before commit ────────────────────────────────────────────────────────────────────────────────────
const zero = {
  passed: 0, unreported: 0, failed: 0, changed_after: 0, never_tested: 0, no_change: 0, unknown_change: 0, not_recorded: 0, by_subagent: 0,
  own_unseen: 0, commit_sessions: 1, top_session_commits: 2, edit_sessions: 4, untested_sessions: 1, commands: 10, commands_with_text: 10,
  test_runs: 2, test_results: 0, remote_commits: 0, edits_no_file: 0, sessions_no_text: 0, sessions_edits_unrecorded: 0, unchecked: 0,
  classified: 4, unseen: 1, checked: true, unseen_share: 0.25, own_unseen_share: null, pass_tool: false,
}
const vtool = (tool: string, values: Partial<VerifiedTool>): VerifiedTool => ({ ...zero, tool, commits: 4, ...values } as VerifiedTool)
const verified = {
  ...base, card: 'verified', view: 'insights.verified_commits', repo_order: order,
  tools: [vtool('copilot-cli', { commits: 12, never_tested: 1, no_change: 11, classified: 12, unseen_share: 1 / 12,
    repos: segments([['/work/alpha', { commits: 12 }]]),
    session_repos: segments([['/work/alpha', { edit_sessions: 4, untested_sessions: 1 }]]) }),
  vtool('claude-code', { commits: 0, classified: 0, unseen: 0, unseen_share: null })],
  summary: { commits: 4, classified: 4, unseen: 1, unseen_share: 0.25, own_unseen: 0, own_unseen_share: null, changed_after: 0, never_tested: 1,
    no_change: 3, failed: 0, passed: 0, unchecked: 0, edit_sessions: 8, untested_sessions: 2, remote_commits: 0, sessions_no_text: 0,
    checked_tools: ['copilot-cli'], not_reported: [], not_classified: [], one_session: [] },
  sessions: [],
} as unknown as VerifiedBody

describe('INS-OPEN · Verified before commit', () => {
  it('a coding tool narrows the page to it: bars by class, sessions bars, the note of tools with no commit and the table', () => {
    const { ctx, went } = context(verified)
    const { host, dispose } = mount(() => <VerifiedCommits {...show(ctx)} />)
    press(host.querySelector('[data-chart="verified-commits"] [data-tool="copilot-cli"] [data-open]'))
    press(host.querySelector('[data-chart="verified-sessions"] [data-sessions-tool="claude-code"] [data-open]'))
    expect(host.querySelector('[data-idle]')!.textContent).toBe('No commit in this period by claude-code.')
    press(host.querySelector('[data-idle] [data-open]'))
    press(labelled(host, 'Show only copilot-cli on every view', 'table')[0])
    expect(went.patches.map(patch => JSON.stringify(patch))).toEqual(['copilot-cli', 'claude-code', 'claude-code', 'copilot-cli']
      .map(tool => expect.stringContaining(tool) as unknown as string))
    // A class of commit is not a name: its segment opens nothing.
    expect(host.querySelector('[data-segment] [data-open]')).toBeNull()
    dispose()
  })

  it('coloured by repository, the tool rows of the split bars narrow the page to the tool', () => {
    history.replaceState(null, '', '/?screen=insights&range=all&by=repo')
    const { ctx, went } = context(verified)
    const { host, dispose } = mount(() => <VerifiedCommits {...show(ctx)} />)
    press(host.querySelector('[data-chart="verified-commits-repos"] [data-open]'))
    press(host.querySelector('[data-chart="verified-sessions-repos"] [data-open]'))
    expect(went.patches).toHaveLength(2)
    expect(went.patches.every(patch => JSON.stringify(patch).includes('copilot-cli'))).toBe(true)
    dispose()
  })
})

// ─── Orientation cost ──────────────────────────────────────────────────────────────────────────────────────────
const orientation = {
  ...base, card: 'orientation', view: 'insights.orientation', repo_order: order, sessions: [],
  projects: [{ project_path: '/work/alpha/api', sessions: 5, tools: ['claude-code'], p50_requests: 6, p50_cost_usd: 0.6 }],
  tools: [{ tool: 'claude-code', sessions: 12, edited: 9, no_project: 0, p50_requests: 6, never: 3, never_requests: 20, never_cost_usd: 2,
    repos: segments([['/work/alpha', { sessions: 12, edited: 9, never: 3, never_requests: 20, never_cost_usd: 2 }]]) }],
  summary: { sessions: 12, edited: 9, projects: 1, never: 3, never_cost_usd: 2, no_project: 0, unpriced_requests: 0 },
} as unknown as OrientationBody

describe('INS-OPEN · Orientation cost', () => {
  it('a project narrows the page to its folder, a coding tool to the tool, in the charts and the table', () => {
    const { ctx, went } = context(orientation)
    const { host, dispose } = mount(() => <Orientation {...show(ctx)} />)
    press(host.querySelector('[data-dots="orientation-projects"] [data-open]'))
    press(host.querySelector('[data-chart="orientation-tools"] [data-open]'))
    press(host.querySelector('[data-chart="orientation-never"] [data-open]'))
    const project = 'Show only the project api (/work/alpha/api) on every view'
    expect(labelled(host, project, 'table')).toHaveLength(2)
    for (const cell of labelled(host, project, 'table')) press(cell)
    const project_ = { project: ['/work/alpha/api'], repo: null, sel: null }
    expect(went.patches[0]).toEqual(project_)
    expect(JSON.stringify(went.patches[1])).toContain('claude-code')
    expect(JSON.stringify(went.patches[2])).toContain('claude-code')
    expect(went.patches.slice(3)).toEqual([project_, project_])
    // The tools of a project, a list in one cell, stay text.
    expect([...host.querySelectorAll('table td')].some(cell => cell.textContent === 'claude-code' && !cell.querySelector('button'))).toBe(true)
    dispose()
  })

  it('coloured by repository, the split bars per tool still narrow the page to the tool', () => {
    history.replaceState(null, '', '/?screen=insights&range=all&by=repo')
    const { ctx, went } = context(orientation)
    const { host, dispose } = mount(() => <Orientation {...show(ctx)} />)
    press(host.querySelector('[data-chart="orientation-tools-repos"] [data-open]'))
    press(host.querySelector('[data-chart="orientation-never-repos"] [data-open]'))
    expect(went.patches.map(patch => JSON.stringify(patch).includes('claude-code'))).toEqual([true, true])
    dispose()
  })
})

// ─── Work by repository ────────────────────────────────────────────────────────────────────────────────────────
const repo = (root: string, name: string, values: Partial<Repo> = {}): Repo => ({
  repo: root, name, kind: 'repository', projects: 1, nodes: 1, sessions: 10, scripted: 2, person: 8, unclassified: 0, cost_usd: 100,
  cost_share: 0.5, priced: 200, requests: 200, unpriced: 0, agent_ms: 3_600_000, timed_sessions: 10, calls: 50, failed: 2, failed_share: 0.04,
  test_runs: 3, writes: 20, files: 10, lines_added: 100, lines_removed: 10, lines_unknown: 0, commits: 4, commit_sessions: 2, idle_sessions: 1,
  cost_per_commit: 25, cost_per_file: 10, small: false,
  models: [{ model: 'claude-opus-5-5', requests: 150, cost_usd: 90 }, { model: null, requests: 50, cost_usd: 10 }],
  top_sessions: [{ session_id: '["n1","s-top"]', node_id: 'n1', tool: 'copilot-cli', repo: root, cost_usd: 40, requests: 60, agent_ms: 600_000,
    files: 3, commits: 1, calls: 20, failed: 0, scripted: false, started_at: range.since + 60 }],
  bins: [{ start: range.since, cost_usd: 100, commits: 4, sessions: 10 }], ...values,
})
const repos = {
  ...base, card: 'repos', view: 'insights.repositories', repo_order: order,
  repos: [repo('/work/alpha', 'alpha'), repo('/work/beta', 'alpha')], sessions: [],
  summary: { repos: 2, sessions: 20, cost_usd: 200, commits: 8, files: 20, scripted: 4, person: 16, idle_sessions: 2, agent_ms: 7_200_000,
    unpriced: 0, top: null, dearest_per_commit: null, cheapest_per_commit: null, cost_per_commit: 25, small: [], folders: 0 },
} as unknown as RepoBody

describe('INS-OPEN · Work by repository', () => {
  it('a repository narrows the page to its root from the grid, the fold and the table', () => {
    const { ctx, went } = context(repos)
    const { host, dispose } = mount(() => <Repositories {...show(ctx)} />)
    const grid = [...host.querySelectorAll('[data-row="alpha"] [data-open]')].filter(node => !node.closest('details'))
    expect(grid).toHaveLength(2)
    for (const name of grid) press(name)
    press(host.querySelectorAll('details[data-repo="alpha"] summary [data-open]')[1])
    press(labelled(host, repoLabel('alpha', '/work/alpha'), 'table')[0])
    expect(went.patches).toEqual([repoPatch('/work/alpha'), repoPatch('/work/beta'), repoPatch('/work/beta'), repoPatch('/work/alpha')])
    // The totals row of the grid names no repository.
    expect(host.querySelector('[data-row="all"] [data-open]')).toBeNull()
    dispose()
  })

  it('in a repository: a model narrows the page to it, a session opens its flow by its whole id, a coding tool narrows the page', () => {
    const { ctx, went } = context(repos)
    const { host, dispose } = mount(() => <Repositories {...show(ctx)} />)
    const detail = host.querySelector('details[data-repo="alpha"] [data-repo-detail]')!
    press(detail.querySelector('[data-chart="models"] [data-bar="claude-opus-5-5"] [data-open]')?.closest('button'))
    expect(went.patches).toEqual([{ model: 'claude-opus-5-5' }])
    // A model the source did not report names nothing.
    expect(detail.querySelector('[data-chart="models"] [data-bar="model not reported"] [data-open]')).toBeNull()
    press(detail.querySelector('[data-sessions] li > button'))
    expect(went.agents).toEqual(['["n1","s-top"]:flow'])
    press(detail.querySelector('[data-sessions] [data-open]'))
    expect(JSON.stringify(went.patches.at(-1))).toContain('copilot-cli')
    dispose()
  })
})

// ─── Model report ──────────────────────────────────────────────────────────────────────────────────────────────
const figures = (values: Partial<ModelFigures>): ModelFigures => ({
  requests: 100, sessions: 10, priced: 100, cost_usd: 10, cost_per_request: 0.1, cache_reported: 100, cache_write_reported: 100,
  input_per_request: 50, cache_write_per_request: 900, cache_read_per_request: 40_000, output_per_request: 600, unsplit_prompt_per_request: null,
  thinking_reported: 0, p50_thinking_ms: null, reasoning_reported: 0, reasoning_per_request: null, first_ts: range.since, last_ts: range.until,
  calls: 1000, failures: 20, refused: 0, exit_unknown: 0, call_sessions: 9, failure_share: 0.02, at_least: false, ...values,
})
const model = (name: string, values: Partial<ModelRow> = {}): ModelRow => ({
  tool: 'copilot-cli', model: name, recorded_sessions: 10, helper: false, failing: [], efforts: [], ...figures(values), ...values,
})
const models = {
  ...base, card: 'models', view: 'insights.model_report',
  tools: [{ tool: 'copilot-cli', requests: 200, sessions: 20, models: [model('gpt-6-astra', { cost_per_request: 0.3 }),
    model('gemini-4-argon', { efforts: [{ effort: 'high', ...figures({}) }] })] }],
  summary: { lead: null, not_reported: { cost: [], token_split: [], cache_write: [], thinking: ['copilot-cli'], reasoning: [], effort: [],
    model: [], calls: [] } },
  sessions: [],
} as unknown as ModelBody

describe('INS-OPEN · Model report', () => {
  it('a model narrows the page to it from its grid row, its dot and the table; the tool heading narrows to the tool', () => {
    const { ctx, went } = context(models)
    const { host, dispose } = mount(() => <ModelReport {...show(ctx)} />)
    const astra = 'Show only the model gpt-6-astra on every view'
    const inCharts = labelled(host, astra, 'chart')
    expect(inCharts).toHaveLength(2)
    for (const name of inCharts) press(name)
    press(labelled(host, astra, 'table')[0])
    expect(went.patches).toEqual(Array(3).fill({ model: 'gpt-6-astra' }))
    // A row per effort opens its model; the tool total opens no model.
    const argon = labelled(host, 'Show only the model gemini-4-argon on every view', 'table')
    expect(argon.map(button => button.textContent)).toEqual(['gemini-4-argon', 'gemini-4-argon · high'])
    press(argon[1])
    expect([...host.querySelectorAll('table button')].filter(button => (button.getAttribute('aria-label') ?? '').includes('Show only the model'))).toHaveLength(3)
    expect(went.patches.at(-1)).toEqual({ model: 'gemini-4-argon' })
    press(host.querySelector('section[data-tool="copilot-cli"] h3 [data-open]'))
    expect(JSON.stringify(went.patches.at(-1))).toContain('copilot-cli')
    expect(labelled(host, 'Show only copilot-cli on every view', 'table').length).toBeGreaterThan(0)
    // The line of measures a tool does not record names tools in a sentence: it stays text.
    expect(host.querySelector('[data-not-reported] [data-open]')).toBeNull()
    dispose()
  })
})
