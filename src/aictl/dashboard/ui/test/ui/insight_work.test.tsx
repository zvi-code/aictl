// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Changes from '../../src/panels/insights/Changes'
import Durations from '../../src/panels/insights/Durations'
import Repositories from '../../src/panels/insights/Repositories'
import {
  changeFinding, changeHero, durationFinding, durationHero, repoFinding, repoHero, smallText,
  type ChangeBody, type ChangeRepo, type DurationBody, type DurationRepo, type DurationTool, type Repo, type RepoBody, type SessionTimes,
} from '../../src/panels/insights/workModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const base = {
  view: 'insights.repositories', range: { since: 1_700_000_000, until: 1_702_592_000 },
  data_range: { first_ts: 1_700_000_100, last_ts: 1_702_500_000 }, computed_at: 1_702_592_000,
  query: { view: 'insights.repositories', kql: '// aictl view insights.repositories\nrequests | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
}
const repo = (values: Partial<Repo> & { repo: string; name: string }): Repo => ({
  kind: 'repository', projects: 1, nodes: 1, sessions: 10, scripted: 6, person: 3, unclassified: 1, cost_usd: 100, cost_share: 0.5,
  priced: 500, requests: 500, unpriced: 0, agent_ms: 7_200_000, timed_sessions: 10, calls: 200, failed: 10, failed_share: 0.05,
  test_runs: 4, writes: 30, files: 20, lines_added: 400, lines_removed: 100, lines_unknown: 0, commits: 10, commit_sessions: 4,
  idle_sessions: 2, cost_per_commit: 10, cost_per_file: 5, small: false, models: [{ model: 'gpt-5', requests: 500, cost_usd: 100 }],
  top_sessions: [{ session_id: 's-top', node_id: 'n', tool: 'copilot-cli', repo: values.repo, cost_usd: 40, requests: 90,
    agent_ms: 600_000, files: 5, commits: 2, calls: 40, failed: 1, scripted: true, started_at: 1_700_000_200 }],
  bins: [{ start: 1_700_000_000, cost_usd: 60, commits: 6, sessions: 6 }, { start: 1_700_604_800, cost_usd: 40, commits: 4, sessions: 4 }],
  ...values,
})
const app = repo({ repo: '/src/app', name: 'app', cost_usd: 300, cost_share: 0.6, commits: 4, cost_per_commit: 75 })
const docs = repo({ repo: '/src/docs', name: 'docs', cost_usd: 150, cost_share: 0.3, commits: 30, cost_per_commit: 5, idle_sessions: 0 })
const scratch = repo({ repo: '/tmp/scratch', name: 'scratch', kind: 'folder', cost_usd: 50, cost_share: 0.1, requests: 12, small: true,
  commits: 0, cost_per_commit: null, idle_sessions: 1 })
const brief = (r: Repo) => ({ repo: r.repo, name: r.name, kind: r.kind, sessions: r.sessions, cost_usd: r.cost_usd, cost_share: r.cost_share,
  commits: r.commits, files: r.files, cost_per_commit: r.cost_per_commit, cost_per_file: r.cost_per_file, idle_sessions: r.idle_sessions })
const body = {
  ...base, card: 'repos', repos: [app, docs, scratch], sessions: [...app.top_sessions],
  summary: { repos: 3, sessions: 30, cost_usd: 500, commits: 34, files: 60, scripted: 18, person: 9, idle_sessions: 3, agent_ms: 21_600_000,
    unpriced: 0, top: brief(app), dearest_per_commit: brief(app), cheapest_per_commit: brief(docs), cost_per_commit: 14.7,
    small: ['scratch'], folders: 1 },
} as unknown as RepoBody

function context(state: DetailState<unknown> | undefined, requested: string[] = [], opened: string[] = []) {
  return {
    scope: () => 'fleet', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [], model: 'claude-opus-5-5' }), tools: () => ['copilot-cli'],
    openAgent(id: string, tab = 'flow') { opened.push(`${id}:${tab}`) },
    detail: (path: () => string | undefined) => Object.assign(() => {
      const value = path()
      if (value) requested.push(value)
      return value ? state : undefined
    }, { retry() {} }),
  } as unknown as PanelContext
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-work'), since: base.range.since, until: base.range.until })

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights') })

describe('Work by repository', () => {
  it('states which repository took what share of the spend, what it produced, and who pays most per commit', () => {
    expect(repoFinding(body)).toBe('app took $300 of $500 at list price (60%) in 10 sessions, and produced 4 commits and 20 changed ' +
      'files. Per commit, app spent $75.00 against $5.00 in docs (15.0 times as much). 3 sessions changed no file and made no commit.')
    expect(repoHero(body)).toEqual({ value: '60%', label: "of the period's spend went to app" })
  })

  it('names a folder as a folder and the repositories too small to compare in one line', () => {
    const folderTop = { ...body, summary: { ...body.summary, top: brief(scratch), dearest_per_commit: null, cheapest_per_commit: null } } as RepoBody
    expect(repoFinding(folderTop)).toMatch(/^the folder scratch took \$50\.00 of \$500/)
    expect(repoFinding(folderTop)).toContain('None of that spend ended in a commit.')
    expect(smallText(['a', 'b'])).toBe('Too small to compare (fewer than 50 model requests): a, b.')
    expect(smallText([])).toBe('')
  })

  it('never reads an unreported spend as zero', () => {
    const none = { ...body, summary: { ...body.summary, cost_usd: null, top: null } } as RepoBody
    expect(repoFinding(none)).toBe('30 sessions in 3 repositories or folders; no spend is reported for them, so no repository can be ranked by spend.')
    expect(repoHero(none)).toBeUndefined()
    const empty = { ...body, repos: [], summary: { ...body.summary, sessions: 0, top: null } } as RepoBody
    expect(repoFinding(empty)).toBe('No agent session made a model request or a tool call in this period.')
  })

  it('draws a row per repository, a small one in grey, opens to its figures and sessions, and sends the page filters', () => {
    const requested: string[] = [], opened: string[] = []
    const ctx = context({ data: { ...body, node_scope: { kind: 'fleet', node_id: null } }, status: 'ready', error: null }, requested, opened)
    const { host, dispose } = mount(() => <Repositories {...props(ctx)} />)
    const box = host.querySelector('[data-box="insight-repos"]')!
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('60%')
    const rows = [...box.querySelectorAll('[data-repo]')]
    expect(rows.map(row => row.getAttribute('data-repo'))).toEqual(['app', 'docs', 'scratch'])
    expect(rows[2].hasAttribute('data-small')).toBe(true)
    expect(rows[2].querySelector('summary')!.textContent).toContain('folder')
    expect(rows[0].querySelector('summary')!.textContent).toContain('$300 · 60%')
    expect(rows[0].querySelector('summary')!.textContent).toContain('4 commits · 20 files +400 −100 · 2 h working')
    expect(box.querySelector('[data-small-list]')!.textContent).toBe('Too small to compare (fewer than 50 model requests): scratch.')
    const detail = rows[0].querySelector('[data-repo-detail]')!
    expect(detail.textContent).toContain('Spend per commit$75.00')
    expect(detail.textContent).toContain('Sessions started6 by a script, 3 by a person, 1 not known')
    ;(detail.querySelector('button') as HTMLButtonElement).click()
    expect(opened).toEqual(['s-top:flow'])
    expect(requested[0]).toContain('tool=copilot-cli')
    expect(requested[0]).toContain('model=claude-opus-5-5')
    expect(requested[0]).toContain('scope=fleet')
    dispose()
  })
})

const times = (values: Partial<SessionTimes> = {}): SessionTimes => ({
  sessions: 20, timed: 20, walled: 18, changed: 15, waits: 30, requests: 2000, calls: 4000, model_ms: 36_000_000, tool_ms: 7_200_000,
  agent_ms: 72_000_000, wait_ms: 18_000_000, p50_agent_ms: 600_000, p90_agent_ms: 3_600_000, max_agent_ms: 14_400_000,
  p50_wall_ms: 900_000, p90_wall_ms: 7_200_000, max_wall_ms: 86_400_000, p50_first_change_ms: 120_000, p90_first_change_ms: 900_000,
  ...values,
})
const loopRepo: DurationRepo = { ...times(), repo: '/src/loop', name: 'loop', kind: 'repository', agent_share: 0.8, small: false }
const tinyRepo: DurationRepo = { ...times({ sessions: 2, timed: 2, agent_ms: 18_000_000 }), repo: '/tmp/t', name: 't', kind: 'folder',
  agent_share: 0.2, small: true }
const pytest: DurationTool = { name: 'pytest', program: true, calls: 300, timed: 300, total_ms: 3_600_000, p50_ms: 4000, p95_ms: 60_000,
  failed: 30, failed_share: 0.1, repo: '/src/loop', repo_name: 'loop', repo_ms: 3_000_000, small: false }
const durations = {
  ...base, card: 'durations', view: 'insights.durations', repos: [loopRepo, tinyRepo], tools: [pytest],
  models: [{ model: 'gpt-5', requests: 2000, timed: 2000, total_ms: 36_000_000, p50_ms: 8000, p95_ms: 90_000, small: false }],
  sessions: [],
  summary: { ...times({ agent_ms: 90_000_000 }), top: { repo: '/src/loop', name: 'loop', kind: 'repository', sessions: 20,
    agent_ms: 72_000_000, agent_share: 0.8, p50_agent_ms: 600_000 }, top_tool: { ...pytest, share: 0.5 }, slowest_tool: pytest,
    slowest_model: { model: 'gpt-5', requests: 2000, timed: 2000, total_ms: 36_000_000, p50_ms: 8000, p95_ms: 90_000, small: false },
    small: ['t'] },
} as unknown as DurationBody

describe('Where session time goes', () => {
  it('leads with working time and where it went, then the median session, waiting and the slowest things', () => {
    expect(durationFinding(durations)).toBe('Agents worked 25 h in 20 sessions; loop took 80% of it (20 h in 20 sessions). A session ' +
      'worked 10 min at the median and 1 h at the 90th percentile. Between turns, sessions waited 5 h for a person. The most tool ' +
      'time went to pytest (program): 1 h, 50% of all tool-call time, most of it in loop. The slowest model was gpt-5: 1 request ' +
      'in 20 took over 1 min 30 s.')
    expect(durationHero(durations)).toEqual({ value: '25 h', label: 'of agent working time in 20 sessions, 80% of it in loop' })
    const untimed = { ...durations, summary: { ...durations.summary, timed: 0, agent_ms: null } } as DurationBody
    expect(durationFinding(untimed)).toBe('20 sessions in this period, but no tool recorded when their turns started and ended, so ' +
      'working time is not reported.')
    expect(durationHero(untimed)).toBeUndefined()
  })

  it('draws working and waiting time per repository and keeps wall-clock length in the detail', () => {
    const ctx = context({ data: { ...durations, node_scope: { kind: 'fleet', node_id: null } }, status: 'ready', error: null })
    const { host, dispose } = mount(() => <Durations {...props(ctx)} />)
    const box = host.querySelector('[data-box="insight-durations"]')!
    const rows = [...box.querySelectorAll('[data-repo]')]
    expect(rows.map(row => row.getAttribute('data-repo'))).toEqual(['loop', 't'])
    expect(rows[0].querySelector('summary')!.textContent).toContain('worked 20 h')
    expect(rows[0].querySelector('summary')!.textContent).toContain('median session 10 min · 90th percentile 1 h')
    expect(rows[0].querySelector('summary')!.textContent).not.toContain('Wall-clock')
    expect(rows[0].querySelector('[data-repo-detail]')!.textContent).toContain('Wall-clock length (open time, not work)median 15 min')
    expect(rows[1].hasAttribute('data-small')).toBe(true)
    expect(rows[1].querySelector('summary')!.textContent).toContain('too few sessions for a median')
    expect(box.querySelector('[data-tool-name="pytest"]')!.textContent).toContain('1 h · median 4 s · p95 1 min')
    dispose()
  })
})

const kinds = { source: 40, tests: 10, docs: 5, config: 3, memory: 1, other: 0 }
const changeRepo = (values: Partial<ChangeRepo> & { repo: string; name: string }): ChangeRepo => ({
  kind: 'repository', sessions: 20, change_sessions: 15, commit_sessions: 5, uncommitted_sessions: 10, writes: 200, committed_writes: 150,
  committed_share: 0.75, files: 59, files_share: 0.5, reworked: 4, kinds, lines_added: 3000, lines_removed: 800, lines_unknown: 0,
  commits: 12, commit_days: 6, cost_usd: 120, agent_ms: 36_000_000, cost_per_commit: 10, time_per_commit_ms: 3_000_000, small: false,
  ...values,
})
const svc = changeRepo({ repo: '/src/svc', name: 'svc' })
const loop = changeRepo({ repo: '/src/loop', name: 'loop', writes: 300, committed_writes: 0, committed_share: 0, files: 40, files_share: 0.34,
  commits: 0, commit_days: 0, cost_per_commit: null, time_per_commit_ms: null, uncommitted_sessions: 30, change_sessions: 30 })
const tiny = changeRepo({ repo: '/tmp/t', name: 't', kind: 'folder', writes: 5, committed_writes: 0, committed_share: 0, files: 2,
  files_share: 0.02, commits: 0, small: true })
const changeBrief = (r: ChangeRepo) => ({ repo: r.repo, name: r.name, kind: r.kind, files: r.files, files_share: r.files_share, writes: r.writes,
  committed_writes: r.committed_writes, committed_share: r.committed_share, commits: r.commits, reworked: r.reworked,
  cost_per_commit: r.cost_per_commit, time_per_commit_ms: r.time_per_commit_ms, change_sessions: r.change_sessions,
  uncommitted_sessions: r.uncommitted_sessions })
const changes = {
  ...base, card: 'changes', view: 'insights.changes', repos: [svc, loop, tiny],
  files: [{ repo: '/src/loop', repo_name: 'loop', path: '/src/loop/docs/plan.md', kind: 'docs', writes: 90, sessions: 12, most_in_session: 20 }],
  bins: [{ start: 1_700_000_000, commits: 4, writes: 100 }, { start: 1_700_086_400, commits: 8, writes: 405 }],
  sessions: [],
  summary: { repos: 3, writes: 505, files: 101, committed_writes: 150, committed_share: 150 / 505, commits: 12, change_sessions: 46,
    uncommitted_sessions: 41, lines_added: 6000, lines_removed: 1600, reworked: 9, kinds, top: changeBrief(svc),
    most_uncommitted: changeBrief(loop), dearest_per_commit: null, cheapest_per_commit: null,
    top_file: { repo: '/src/loop', repo_name: 'loop', path: '/src/loop/docs/plan.md', kind: 'docs', writes: 90, sessions: 12, most_in_session: 20 },
    small: ['t'] },
} as unknown as ChangeBody

describe('What the agents changed', () => {
  it('states what was changed, the committed share, where changes were never committed and what was redone', () => {
    expect(changeFinding(changes)).toBe('Agents changed 101 files (505 writes, +6.0 k −1.6 k lines) in 46 sessions; 30% of the writes ' +
      'ended in a commit in the same session. svc holds 50% of the changed files. The most changes never committed are in loop: ' +
      '300 writes, 30 sessions changed files and made no commit. 9 files were written again and again; the most, plan.md, 90 times ' +
      'in 12 sessions.')
    expect(changeHero(changes)).toEqual({ value: '30%', label: 'of 505 file writes by agents ended in a commit in the same session' })
    const none = { ...changes, summary: { ...changes.summary, writes: 0, commits: 0, committed_share: null } } as ChangeBody
    expect(changeFinding(none)).toBe('No agent changed a file or made a commit in this period.')
    expect(changeHero(none)).toBeUndefined()
  })

  it('splits each repository\'s writes into committed and not, greys a small one, and points to the commit check', () => {
    const ctx = context({ data: { ...changes, node_scope: { kind: 'fleet', node_id: null } }, status: 'ready', error: null })
    const { host, dispose } = mount(() => <Changes {...props(ctx)} />)
    const box = host.querySelector('[data-box="insight-changes"]')!
    const rows = [...box.querySelectorAll('[data-repo]')]
    expect(rows.map(row => row.getAttribute('data-repo'))).toEqual(['svc', 'loop', 't'])
    expect(rows[0].querySelector('summary')!.textContent).toContain('200 writes · 75% committed')
    expect(rows[0].querySelector('summary')!.textContent).toContain('40 source · 10 tests · 5 docs · 3 config and data · 1 memory and instructions')
    expect(rows[0].querySelector('[data-repo-detail]')!.textContent).toContain('Per commit$10.00 and 50 min of working time per commit')
    expect(rows[1].querySelector('[data-repo-detail]')!.textContent).toContain('0 commits, too few for a cost per commit')
    expect(rows[2].hasAttribute('data-small')).toBe(true)
    expect(box.querySelector('[data-file="plan.md"]')!.textContent).toContain('90 writes in 12 sessions, at most 20 in one')
    expect(box.textContent).toContain('see the card "Verified before commit"')
    dispose()
  })
})
