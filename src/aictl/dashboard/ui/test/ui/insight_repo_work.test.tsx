// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Flows from '../../src/panels/insights/Flows'
import type { FlowsBody } from '../../src/panels/insights/flowsModel'
import type { AutonomyBody } from '../../src/panels/insights/autonomyModel'
import VerifiedCommits from '../../src/panels/insights/VerifiedCommits'
import type { VerifiedBody } from '../../src/panels/insights/verifiedModel'
import WorkPerInstruction from '../../src/panels/insights/WorkPerInstruction'
import Changes from '../../src/panels/insights/Changes'
import Durations from '../../src/panels/insights/Durations'
import type { ChangeBody, DurationBody } from '../../src/panels/insights/workModel'
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
/** Whether a value is a list of segments (repoSplit), not a card's own `repos` rows or count. */
const segments = (value: unknown) => Array.isArray(value) && value.every(item => item && typeof item === 'object' && 'share' in item)
/** Strip every split (and the ranking) from a body: what an older server answers. */
function unsplit<T>(body: T): T {
  return JSON.parse(JSON.stringify(body, (key, value) => (key === 'repos' || key === 'session_repos') && segments(value)
    || key === 'kind_repos' ? undefined : key === 'repo_order' ? [] : key === 'repo_others' ? null : value)) as T
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
    const box = host.querySelector('#insight-flows')!
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
    const box = host.querySelector('#insight-flows')!
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
    const box = host.querySelector('#insight-flows')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-chart="endings-repos"]')).toBeNull()
    expect(box.querySelector('[data-chart="projects-repos"]')).toBeNull()
    expect([...box.querySelectorAll('[data-chart="tools"] [data-part]')].map(part => part.getAttribute('data-part'))).toEqual(['c1'])
    expect(box.querySelector('[data-chart="tools"] p')!.textContent).not.toContain('repository')
    dispose()
  })
})

// ─── Work per instruction ───────────────────────────────────────────────────────────────────────────────────────
const claudeTool = {
  tool: 'claude-code', reported: true, active: 40, prompted: 38, scripted: 0, store_only: 0, start_unread: 0, no_calls: 0, unread: 0,
  unread_sessions: 0, sessions: 30, instructions: 120, calls: 2400, delegated: 0, one_instruction: 12, multi_sessions: 18,
  p50_longest: 20, p90_longest: 90, mean_longest: 31.5, p50_multi: 25, p90_multi: 110, mean_multi: 40,
  turns_answered: 90, waits: 80, queued: 9, p50_wait_s: 110, over_5m: 24, over_5m_share: 0.3, resumed: 1, no_stop: 0,
  repos: split([['/src/app', { waits: 50, over_5m: 10 }], ['/src/docs', { waits: 20, over_5m: 9 }], ['', { waits: 10, over_5m: 5 }]],
    { '/src/app:waits': 1 }),
}
const autonomy = {
  ...base, card: 'autonomy', view: 'insights.work_per_instruction', query: query('insights.work_per_instruction'),
  repo_order: order, repo_others: others, tools: [claudeTool], bins: [], bin_unit: 'week', prompts_from: null,
  summary: { lead: 'claude-code', sessions: 30, multi_sessions: 18, one_instruction: 12, not_reported: [] }, sessions: [],
} as unknown as AutonomyBody

describe('INS-RW · Work per instruction split by repository', () => {
  it('coloured by repository, draws the waits per repository; the run strip stays whole', () => {
    history.replaceState(null, '', '/?screen=insights&view=autonomy&by=repo')
    const { host, dispose } = mount(() => <WorkPerInstruction {...props(ready(autonomy))} />)
    const box = host.querySelector('#insight-autonomy')!
    expect(legend(box)).toEqual(['app', 'docs', OTHER_REPOS])
    const row = box.querySelector('[data-chart="autonomy-waits"] [data-row="claude-code"]')!
    expect([...row.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1', String(OTHER)])
    expect([...row.querySelectorAll('[data-part] button')].map(part => part.textContent)).toEqual(['50 waits', '20 waits', '10 waits'])
    expect(row.querySelector('[data-total]')!.textContent).toBe('80 · 24 over 5 min')
    expect(row.querySelector('[data-part="repo:/src/docs"] [role="tooltip"]')!.textContent).toBe('claude-code, answered waits — docs ' +
      '(/src/docs): 20 waits · 25% of this bar. 9 of them after more than 5 minutes. claude-code: 80 answered waits in all, 24 after ' +
      'more than 5 minutes. A wait runs from the agent\'s stop to the person\'s next prompt.')
    expect(box.querySelector('[data-chart="autonomy-runs"] [data-row="claude-code"] [data-mark="median"] [role="tooltip"]')!.textContent)
      .toMatch(/Not split by repository: the median of a whole is not the sum of the medians of its parts\.$/)
    dispose()
  })

  it('draws the wait bar split at 5 minutes, no switch and no legend, without a split', () => {
    history.replaceState(null, '', '/?screen=insights&view=autonomy&by=repo')
    const { host, dispose } = mount(() => <WorkPerInstruction {...props(ready(unsplit(autonomy)))} />)
    const box = host.querySelector('#insight-autonomy')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect([...box.querySelectorAll('[data-chart="autonomy-waits"] [data-row="claude-code"] [data-part]')].map(part => part.getAttribute('data-part')))
      .toEqual(['under', 'over'])
    expect(box.querySelector('[data-chart="autonomy-runs"] [data-mark="median"] [role="tooltip"]')!.textContent).not.toContain('Not split')
    dispose()
  })
})

// ─── Verified before commit ─────────────────────────────────────────────────────────────────────────────────────
const classes = (passed: number | null, unreported: number, never: number, notRecorded: number, unknown: number) => ({
  commits: (passed ?? 0) + unreported + never + notRecorded + unknown, passed, unreported, failed: 0, changed_after: 0,
  never_tested: never, no_change: 0, unknown_change: unknown, not_recorded: notRecorded,
})
const verifiedTool = {
  tool: 'claude-code', commits: 10, passed: null, unreported: 4, failed: 0, changed_after: 0, never_tested: 3, no_change: 0,
  unknown_change: 1, not_recorded: 2, by_subagent: 0, own_unseen: 1, commit_sessions: 4, top_session_commits: 3, edit_sessions: 6,
  untested_sessions: 2, commands: 50, commands_with_text: 50, test_runs: 9, test_results: 0, remote_commits: 0, edits_no_file: 0,
  sessions_no_text: 0, sessions_edits_unrecorded: 0, classified: 7, unseen: 3, checked: true, unseen_share: 3 / 7,
  own_unseen_share: 1 / 7, unchecked: 3, pass_tool: false,
  repos: split([['/src/app', classes(null, 3, 2, 1, 1)], ['/src/docs', classes(null, 1, 1, 1, 0)]]),
  session_repos: split([['/src/app', { edit_sessions: 4, untested_sessions: 1 }], ['', { edit_sessions: 2, untested_sessions: 1 }]]),
}
const verified = {
  ...base, card: 'verified', view: 'insights.verified_commits', query: query('insights.verified_commits'),
  repo_order: order, repo_others: others, tools: [verifiedTool],
  summary: { commits: 10, classified: 7, unseen: 3, unseen_share: 3 / 7, own_unseen: 1, own_unseen_share: 1 / 7, changed_after: 0,
    never_tested: 3, no_change: 0, failed: 0, passed: null, unchecked: 3, edit_sessions: 6, untested_sessions: 2, remote_commits: 0,
    sessions_no_text: 0, checked_tools: ['claude-code'], not_reported: [], not_classified: [], one_session: [] },
  sessions: [],
} as unknown as VerifiedBody

describe('INS-RW · Verified before commit split by repository', () => {
  it('keeps the bars by class and by test, and adds a commit bar and a session bar by repository', () => {
    const { host, dispose } = mount(() => <VerifiedCommits {...props(ready(verified))} />)
    const box = host.querySelector('#insight-verified')!
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    expect(legend(box)).toEqual(['app', 'docs', OTHER_REPOS])
    expect([...box.querySelectorAll('[data-tool="claude-code"] [data-segment]')].map(part => part.getAttribute('data-segment')))
      .toEqual(['unreported', 'never_tested', 'unclassified'])
    const commits = box.querySelector('[data-chart="verified-commits-repos"] [data-row="claude-code"]')!
    expect([...commits.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1'])
    expect([...commits.querySelectorAll('[data-part] button')].map(part => part.textContent)).toEqual(['7 commits', '3 commits'])
    expect(commits.querySelector('[data-total]')!.textContent).toBe('10 commits')
    expect(commits.querySelector('[data-part="repo:/src/app"] [role="tooltip"]')!.textContent).toBe('claude-code, agent commits — app ' +
      '(/src/app): 7 commits · 70% of this bar. By what test runs saw: Tested, passed not reported · Tested, result not recorded 3 · ' +
      'Tested, failed 0 · Changed after last test 0 · Never tested 2 · No code change 0 · Not classified 2. claude-code: 10 commits in all.')
    const sessions = box.querySelector('[data-chart="verified-sessions-repos"] [data-row="claude-code"]')!
    expect([...sessions.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', String(OTHER)])
    expect(sessions.querySelector('[data-part="repo:"] [role="tooltip"]')!.textContent).toBe('claude-code, sessions that changed source ' +
      'files — Other repositories (every repository outside the 8 with the highest cost, summed): 2 sessions · 33% of this bar. 1 of ' +
      'them ran no recognised test. claude-code: 2 of 6 sessions that changed source files never tested.')
    dispose()
  })

  it('draws no bar by repository for a tool with commits not reported, nor without a split', () => {
    const missing = { ...verified, tools: [{ ...verifiedTool, commits: null, repos: [], session_repos: [] }] } as unknown as VerifiedBody
    const one = mount(() => <VerifiedCommits {...props(ready(missing))} />)
    expect(one.host.querySelector('[data-chart="verified-commits-repos"]')).toBeNull()
    one.dispose()
    const { host, dispose } = mount(() => <VerifiedCommits {...props(ready(unsplit(verified)))} />)
    const box = host.querySelector('#insight-verified')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-chart="verified-commits-repos"]')).toBeNull()
    expect(box.querySelector('[data-chart="verified-sessions-repos"]')).toBeNull()
    expect(box.querySelectorAll('[data-tool="claude-code"] [data-segment]').length).toBe(3)
    dispose()
  })
})

// ─── Where session time goes ────────────────────────────────────────────────────────────────────────────────────
const H = 3_600_000
const times = {
  sessions: 20, timed: 20, walled: 18, changed: 15, waits: 30, requests: 2000, calls: 4000, model_ms: 10 * H, tool_ms: 2 * H,
  agent_ms: 20 * H, wait_ms: 5 * H, p50_agent_ms: 600_000, p90_agent_ms: H, max_agent_ms: 4 * H, p50_wall_ms: 900_000,
  p90_wall_ms: 2 * H, max_wall_ms: 24 * H, p50_first_change_ms: 120_000, p90_first_change_ms: 900_000,
}
const ownRow = (repo: string) => split([[repo, { agent_ms: 20 * H, wait_ms: 5 * H, model_ms: 10 * H, tool_ms: 2 * H }]],
  { [`${repo}:agent_ms`]: 1 })
const durations = {
  ...base, card: 'durations', view: 'insights.durations', query: query('insights.durations'), repo_order: order, repo_others: others,
  repos: [{ ...times, repo: '/src/app', name: 'app', kind: 'repository', agent_share: 0.8, small: false, repos: ownRow('/src/app') },
    { ...times, repo: '/x/scratch', name: 'scratch', kind: 'folder', agent_share: 0.2, small: false, repos: ownRow('') }],
  tools: [{ name: 'pytest', program: true, calls: 300, timed: 300, total_ms: 4 * H, p50_ms: 4000, p95_ms: 60_000, failed: 30,
    failed_share: 0.1, repo: '/src/app', repo_name: 'app', repo_ms: 3 * H, small: false,
    repos: split([['/src/app', { total_ms: 3 * H }], ['/src/docs', { total_ms: 0.5 * H }], ['', { total_ms: 0.5 * H }]],
      { '/src/app:total_ms': 0.25 }) }],
  models: [{ model: 'gpt-5', requests: 2000, timed: 2000, total_ms: 10 * H, p50_ms: 8000, p95_ms: 90_000, small: false,
    repos: split([['/src/app', { total_ms: 10 * H }]]) }],
  sessions: [],
  summary: { ...times, agent_ms: 25 * H, top: null, top_tool: null, slowest_tool: null, slowest_model: null, small: [] },
} as unknown as DurationBody

describe('INS-RW · Where session time goes split by repository', () => {
  it('coloured by repository, draws each repository row in its colour and splits the tool and model time by repository', () => {
    history.replaceState(null, '', '/?screen=insights&view=durations&by=repo')
    const { host, dispose } = mount(() => <Durations {...props(ready(durations))} />)
    const box = host.querySelector('#insight-durations')!
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    expect(legend(box)).toEqual(['app', 'docs', OTHER_REPOS])
    // Working and waiting in the repository's colour, waiting lighter; the hover says which colour.
    const work = box.querySelector('[data-chart="work"]')!
    expect([...work.querySelectorAll('[data-row] [data-part="working"]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', String(OTHER)])
    expect(work.querySelector('[data-row="app"] [data-part="working"] [role="tooltip"]')!.textContent)
      .toMatch(/ Marked in the colour of app on every card: rank 1 by list-price cost\.$/)
    expect(work.querySelector('[data-row="scratch"] [data-part="waiting"] [role="tooltip"]')!.textContent)
      .toMatch(/ Marked grey: not among the 8 repositories with the highest list-price cost\.$/)
    expect([...box.querySelectorAll('[data-chart="session-range"] [data-repo-mark]')].length).toBe(2)
    const tool = box.querySelector('[data-chart="tools"] [data-row="pytest"]')!
    expect([...tool.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1', String(OTHER)])
    expect([...tool.querySelectorAll('[data-part] button')].map(part => part.textContent)).toEqual(['3 h', '30 min', '30 min'])
    expect(tool.querySelector('[data-total]')!.textContent).toBe('4 h · 200%')
    expect(tool.querySelector('[data-part="repo:/src/app"] [role="tooltip"]')!.textContent).toBe('pytest (program) — app (/src/app): ' +
      '3 h · 75% of this bar · 25% of app own summed time. pytest (program): 4 h summed over 300 timed calls of 300 (200% of all ' +
      'tool-call time, 2 h); median 4 s, 95th percentile 1 min; 30 failed calls (10%); most time in app: 3 h. Not split by ' +
      'repository: the median of a whole is not the sum of the medians of its parts.')
    expect(box.querySelector('[data-chart="tools"] [data-axis]')!.textContent).toContain('A segment per repository.')
    expect([...box.querySelectorAll('[data-chart="models"] [data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0'])
    expect(box.querySelector('[data-chart="tool-range"] [data-row="pytest"] [data-mark="p50"] [role="tooltip"]')!.textContent).toContain('Not split by repository')
    dispose()
  })

  it('draws the bars by kind, with no switch, without a split', () => {
    history.replaceState(null, '', '/?screen=insights&view=durations&by=repo')
    const { host, dispose } = mount(() => <Durations {...props(ready(unsplit(durations)))} />)
    const box = host.querySelector('#insight-durations')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(box.querySelector('[data-repo-mark]')).toBeNull()
    expect(box.querySelector('[data-chart="tools"] [data-row="pytest"] [data-total]')!.textContent).toBe('4 h · 200%')
    expect(box.querySelector('[data-chart="tool-range"] [role="tooltip"]')!.textContent).not.toContain('Not split')
    dispose()
  })
})

// ─── What the agents changed ────────────────────────────────────────────────────────────────────────────────────
const kinds = { source: 40, tests: 10, docs: 5, config: 3, memory: 1, other: 0 }
const changeRepo = (repo: string, name: string) => ({
  repo, name, kind: 'repository', sessions: 20, change_sessions: 15, commit_sessions: 5, uncommitted_sessions: 10, writes: 200,
  committed_writes: 150, committed_share: 0.75, files: 59, files_share: 0.5, reworked: 4, kinds, lines_added: 3000, lines_removed: 800,
  lines_unknown: 0, commits: 12, commit_days: 6, cost_usd: 120, agent_ms: 36_000_000, cost_per_commit: 10, time_per_commit_ms: 3_000_000,
  small: false, repos: split([[repo === '/src/app' ? repo : '', { files: 59, writes: 200, committed_writes: 150, sessions: 20,
    change_sessions: 15, uncommitted_sessions: 10, commit_sessions: 5, commits: 12 }]]),
})
const changes = {
  ...base, card: 'changes', view: 'insights.changes', query: query('insights.changes'), repo_order: order, repo_others: others,
  repos: [changeRepo('/src/app', 'app'), changeRepo('/x/scratch', 'scratch')],
  files: [{ repo: '/src/docs', repo_name: 'docs', path: '/src/docs/plan.md', kind: 'docs', writes: 90, sessions: 12, most_in_session: 20,
    repos: split([['/src/docs', { writes: 90 }]], { '/src/docs:writes': 0.3 }) }],
  bins: [{ start: 1_700_000_000, commits: 4, writes: 100, repos: split([['/src/app', { commits: 3, writes: 60 }], ['', { commits: 1, writes: 40 }]]) },
    { start: 1_700_086_400, commits: 8, writes: 300, repos: split([['/src/app', { commits: 8, writes: 300 }]]) }],
  sessions: [],
  summary: { repos: 2, writes: 400, files: 118, committed_writes: 300, committed_share: 0.75, commits: 24, change_sessions: 30,
    uncommitted_sessions: 20, lines_added: 6000, lines_removed: 1600, reworked: 8, kinds, top: null, most_uncommitted: null,
    dearest_per_commit: null, cheapest_per_commit: null, top_file: null, small: [],
    kind_repos: { source: split([['/src/app', { files: 30 }], ['/src/docs', { files: 6 }], ['', { files: 4 }]]),
      tests: split([['/src/app', { files: 10 }]]), docs: split([['/src/docs', { files: 5 }]]), config: split([['', { files: 3 }]]),
      memory: split([['/src/app', { files: 1 }]]), other: [] } },
} as unknown as ChangeBody

describe('INS-RW · What the agents changed split by repository', () => {
  it('colours the files bar of each repository, splits kinds, rewritten files and bins by repository', () => {
    const { host, dispose } = mount(() => <Changes {...props(ready(changes))} />)
    const box = host.querySelector('#insight-changes')!
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    expect(legend(box)).toEqual(['app', 'docs', OTHER_REPOS])
    const files = box.querySelector('[data-chart="files"]')!
    expect([...files.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', String(OTHER)])
    expect([...files.querySelectorAll('[data-value]')].map(value => value.textContent)).toEqual(['59 · 50%', '59 · 50%'])
    for (const chart of ['repo-kinds', 'writes', 'sessions', 'per-commit']) {
      expect([...box.querySelectorAll(`[data-chart="${chart}"] [data-repo-mark]`)].map(mark => mark.getAttribute('data-repo-mark')), chart)
        .toEqual(['0', String(OTHER)])
    }
    // The bars by kind of file within a repository keep their kind colours.
    expect([...box.querySelectorAll('[data-chart="repo-kinds"] [data-bar="app"] [data-part]')].map(part => part.getAttribute('data-part')))
      .toEqual(['source', 'tests', 'docs', 'config and data', 'memory and instructions', 'other'])
    const source = box.querySelector('[data-chart="kinds"] [data-row="source"]')!
    expect([...source.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1', String(OTHER)])
    expect([...source.querySelectorAll('[data-part] button')].map(part => part.textContent)).toEqual(['30 files', '6 files', ''])
    expect(source.querySelector('[data-part="repo:/src/docs"] [role="tooltip"]')!.textContent).toBe('source — docs (/src/docs): 6 files · ' +
      '15% of this bar. source: 40 files, 68% of 59 changed files. Kind by path: code, query, style and markup files by extension.')
    // A kind the server split into no segment keeps its single bar.
    expect([...box.querySelectorAll('[data-chart="kinds"] [data-row="other"] [data-part]')].map(part => part.getAttribute('data-part'))).toEqual([])
    const reworked = box.querySelector('[data-chart="reworked"] [data-row="plan.md"]')!
    expect(reworked.querySelector('[data-part]')!.getAttribute('data-repo')).toBe('1')
    expect(reworked.querySelector('[role="tooltip"]')!.textContent).toBe('plan.md — docs (/src/docs): 90 writes · 100% of this bar · ' +
      '30% of docs own writes. /src/docs/plan.md (docs, docs): 90 writes in 12 sessions, at most 20 in one session.')
    const day = box.querySelector('[data-chart="commits"] [data-column="1700000000"]')!
    expect([...day.querySelectorAll('rect')].map(rect => rect.getAttribute('data-repo'))).toEqual(['0', String(OTHER)])
    expect(day.querySelector('rect title')!.textContent).toMatch(/^.+ — app \(\/src\/app\): 3 commits · 75% of this bar\. .+: 4 commits, 100 file writes\.$/)
    expect(day.querySelector('text')!.textContent).toBe('4')
    dispose()
  })

  it('draws the old bars and columns without a split', () => {
    const { host, dispose } = mount(() => <Changes {...props(ready(unsplit(changes)))} />)
    const box = host.querySelector('#insight-changes')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-repo-mark]')).toBeNull()
    expect(box.querySelector('[data-chart="kinds"] [data-bar="source"]')).not.toBeNull()
    expect(box.querySelectorAll('[data-chart="commits"] [data-column="1700000000"] rect').length).toBe(1)
    dispose()
  })
})
