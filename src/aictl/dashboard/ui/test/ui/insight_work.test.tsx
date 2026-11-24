// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Changes from '../../src/panels/insights/Changes'
import { changeLine, filesByKind, kindTotal, perCommitDots } from '../../src/panels/insights/changesModel'
import Durations from '../../src/panels/insights/Durations'
import Repositories from '../../src/panels/insights/Repositories'
import {
  binUnit, binWidth, changeBinChart, changeFilesChart, changeHero, changeKindChart, changeSessionsChart,
  changeWritesChart, durationFinding, durationFirstChangeRange, durationHero, durationSessionRange, durationWorkChart, modelRange,
  modelTimeChart, repoBinChart, repoFinding, repoHero, repoModelChart, repoOutputChart, repoPerCommitChart, repoSpendChart,
  repoStartChart, reworkedChart, smallText, toolRange, toolTimeChart,
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
const scratch = repo({ repo: '/tmp/scratch', name: 'scratch', kind: 'folder', cost_usd: 50, cost_share: 0.1, priced: 12, requests: 12, small: true,
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
  it('states the sessions, spend and output it covers, with no ranking or verdict', () => {
    expect(repoFinding(body)).toBe('30 sessions in 3 repositories or folders: $500 at list price, 34 commits, 60 changed files and ' +
      '6 h of agent working time. 3 of the 30 sessions changed no file and made no commit; 18 were started by a script and 9 by a person.')
    expect(repoHero(body)).toEqual({ value: '$500', label: 'spend at list price in 30 sessions across 3 repositories or folders' })
    const unpriced = { ...body, summary: { ...body.summary, unpriced: 4 } } as RepoBody
    expect(repoFinding(unpriced)).toContain(' 4 requests had no price and are not in the spend.')
    expect(smallText(['a', 'b'])).toBe('Too small to compare (fewer than 50 model requests): a, b.')
    expect(smallText([])).toBe('')
  })

  it('never reads an unreported spend as zero', () => {
    const none = { ...body, summary: { ...body.summary, cost_usd: null, top: null } } as RepoBody
    expect(repoFinding(none)).toMatch(/^30 sessions in 3 repositories or folders: spend not reported, 34 commits/)
    expect(repoHero(none)).toBeUndefined()
    const empty = { ...body, repos: [], summary: { ...body.summary, sessions: 0, top: null } } as RepoBody
    expect(repoFinding(empty)).toBe('No agent session made a model request or a tool call in this period.')
  })

  it('builds the hover text of every kind of mark from the figures behind it', () => {
    const spend = repoSpendChart(body)
    expect(spend.rows.map(row => row.tracks[0].text)).toEqual(['$300 · 60%', '$150 · 30%', '$50.00 · 10%'])
    expect(spend.rows[0].hover).toBe('app: $300 at list price, 60% of $500; 500 priced requests of 500; 10 sessions.')
    expect(spend.rows[2].hover).toBe('the folder scratch: $50.00 at list price, 10% of $500; 12 priced requests of 12; 10 sessions. ' +
      'Too few to compare (fewer than 50 model requests): drawn grey.')
    expect(spend.rows[2].tracks[0].parts[0].tone).toBe('muted')
    expect(spend.axis).toBe('Linear scale from 0 to $300.')
    const output = repoOutputChart(body)
    expect(output.rows[0].tracks.map(track => track.text)).toEqual(['4 commits', '20 files'])
    expect(output.rows[0].hover).toBe('app: 4 commits in 4 sessions; 20 changed files in 30 writes, lines +400 −100; 2 of 10 sessions ' +
      'changed no file and made no commit.')
    expect(output.axis).toBe('Each bar on its own linear scale: commits 0 to 30, files 0 to 20.')
    const perCommit = repoPerCommitChart(body)
    expect(perCommit.rows.map(row => row.key)).toEqual(['app', 'docs'])
    expect(perCommit.left).toEqual(['scratch'])
    expect(perCommit.rows[0].hover).toBe('app: $300 ÷ 4 commits = $75.00 per commit; $5.00 per changed file (20 files).')
    expect(repoStartChart(body).rows[0].tracks[0].text).toBe('6 script · 3 person · 1 not known')
    const models = repoModelChart(app)
    expect(models.rows[0].tracks[0].text).toBe('500 requests · $100')
    expect(models.rows[0].hover).toBe("gpt-5 in app: 500 requests of 500, $100 at list price (33% of the repository's $300).")
    const bins = repoBinChart(app, body.range)
    expect(bins.title).toBe('Spend per week in app (US dollars; commits under each column)')
    expect(bins.columns.map(column => [column.text, column.under])).toEqual([['$60.00', '6 commits'], ['$40.00', '4 commits']])
    expect(bins.columns[0].hover).toBe('app, Nov 14 to Nov 20: $60.00 at list price, 6 commits, 6 sessions.')
  })

  it('cuts time bins as the server does: weeks up to 8 bins, days up to 31', () => {
    expect(binWidth({ since: 0, until: 1 }, 7 * 86400, 8)).toBe(7 * 7 * 86400)
    expect(binUnit(7 * 86400)).toBe('week')
    expect(binUnit(14 * 86400)).toBe('2 weeks')
    expect(binUnit(86400)).toBe('day')
    expect(binUnit(12 * 86400)).toBe('12 days')
  })

  it('draws titled charts with the value on every bar and the hover on it, then a row per repository with its detail', () => {
    const requested: string[] = [], opened: string[] = []
    const ctx = context({ data: { ...body, node_scope: { kind: 'fleet', node_id: null } }, status: 'ready', error: null }, requested, opened)
    const { host, dispose } = mount(() => <Repositories {...props(ctx)} />)
    const box = host.querySelector('#insight-repos')!
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('$500')
    // One grid of every measure; the grid's own tests are in insight_view_repos.test.tsx.
    const grid = box.querySelector('[data-grid="repos"]')!
    expect([...grid.querySelectorAll('[data-col="spend"] [data-value]')].map(value => value.textContent))
      .toEqual(['$300 · 60%', '$150 · 30%', '$50.00 · 10%', '$500'])
    expect(grid.querySelector('[data-row="app"] [data-col="spend"] [role="tooltip"]')!.textContent).toMatch(/^app: \$300 at list price, 60% of \$500/)
    expect(grid.querySelector('[data-row="scratch"]')!.hasAttribute('data-faded')).toBe(true)
    expect(grid.querySelector('[data-row="docs"] [data-col="commits"] [data-value]')!.textContent).toBe('30')
    expect(grid.querySelector('[data-row="app"] [data-col="per-commit"] [data-value]')!.textContent).toBe('$75.00')
    expect(grid.querySelector('[data-row="scratch"] [data-col="per-commit"] [data-value]')!.textContent).toBe('fewer than 3 commits')
    expect(box.querySelector('[data-small-list]')!.textContent).toBe('Too small to compare (fewer than 50 model requests): scratch.')
    const rows = [...box.querySelectorAll('[data-repo]')]
    expect(rows.map(row => row.getAttribute('data-repo'))).toEqual(['app', 'docs', 'scratch'])
    expect(rows[2].hasAttribute('data-small')).toBe(true)
    expect(rows[0].querySelector('summary')!.textContent).toContain('$300 · 10 sessions · 4 commits')
    const detail = rows[0].querySelector('[data-repo-detail]')!
    expect(detail.textContent).toContain('Spend per commit$75.00')
    expect(detail.textContent).toContain('Sessions started6 by a script, 3 by a person, 1 not known')
    expect(detail.querySelector('[data-chart="models"] [data-value]')!.textContent).toBe('500 requests · $100')
    const column = detail.querySelector('[data-chart="bins"] [data-column] rect title')!
    expect(column.textContent).toBe('app, Nov 14 to Nov 20: $60.00 at list price, 6 commits, 6 sessions.')
    expect(detail.querySelector('[data-chart="bins"] svg')!.textContent).toContain('$60.00')
    ;(detail.querySelector('[data-sessions] button') as HTMLButtonElement).click()
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
  it('states working time, its distribution, waiting and the summed model and tool time', () => {
    expect(durationFinding(durations)).toBe('Agents worked 25 h in 20 sessions with turn times. Per session: median 10 min, 90th ' +
      'percentile 1 h, longest 4 h. Waiting for a person between turns: 5 h over 30 waits. Summed model request time 10 h over ' +
      '2,000 requests; summed tool-call time 2 h over 4,000 calls.')
    expect(durationHero(durations)).toEqual({ value: '25 h', label: 'of agent working time in 20 sessions with turn times' })
    const partly = { ...durations, summary: { ...durations.summary, sessions: 26 } } as DurationBody
    expect(durationHero(partly)!.label).toBe('of agent working time in 20 sessions with turn times (of 26 sessions)')
    const untimed = { ...durations, summary: { ...durations.summary, timed: 0, agent_ms: null } } as DurationBody
    expect(durationFinding(untimed)).toBe('20 sessions in this period, but no tool recorded when their turns started and ended, so ' +
      'working time is not reported.')
    expect(durationHero(untimed)).toBeUndefined()
  })

  it('builds the hover text of bars and percentile rows from the figures behind them', () => {
    const work = durationWorkChart(durations)
    expect(work.rows[0].tracks.map(track => track.text)).toEqual(['worked 20 h · 80%', 'waited 5 h'])
    expect(work.rows[0].hover).toBe('loop: agent working time 20 h, 80% of 25 h, in 20 sessions with turn times (of 20); waiting for a ' +
      'person 5 h over 30 waits.')
    expect(work.tops).toEqual([72_000_000, 72_000_000])
    const range = durationSessionRange(durations)
    expect(range.rows.map(row => row.text)).toEqual(['median 10 min · 90th 1 h · longest 4 h', 'fewer than 5 sessions with turn times'])
    expect(range.rows[1].mid).toBeNull()
    expect(range.rows[1].hover).toBe('the folder t: agent working time per session over 2 sessions with turn times; not drawn: a median ' +
      'needs 5 or more sessions with turn times.')
    expect(durationFirstChangeRange(durations).rows[0].text).toBe('median 2 min · 90th 15 min')
    const tools = toolTimeChart(durations)
    expect(tools.rows[0].tracks[0].text).toBe('1 h · 50%')
    expect(tools.rows[0].hover).toBe('pytest (program): 1 h summed over 300 timed calls of 300 (50% of all tool-call time, 2 h); ' +
      'median 4 s, 95th percentile 1 min; 30 failed calls (10%); most time in loop: 50 min.')
    expect(toolRange(durations).rows[0].text).toBe('median 4 s · 95th 1 min')
    expect(modelTimeChart(durations).rows[0].tracks[0].text).toBe('10 h · 100%')
    expect(modelRange(durations).rows[0].text).toBe('median 8 s · 95th 1 min 30 s')
  })

  it('draws working and waiting time, percentiles, tools and models, and keeps wall-clock length in the detail', () => {
    const ctx = context({ data: { ...durations, node_scope: { kind: 'fleet', node_id: null } }, status: 'ready', error: null })
    const { host, dispose } = mount(() => <Durations {...props(ctx)} />)
    const box = host.querySelector('#insight-durations')!
    const work = box.querySelector('[data-chart="work"]')!
    expect(work.querySelector('figcaption span')!.textContent).toBe('Working and waiting time per repository (hours)')
    expect([...work.querySelectorAll('[data-row="loop"] [data-part] button')].map(value => value.textContent)).toEqual(['20 h', '5 h'])
    expect(work.querySelector('[data-row="loop"] [data-part="working"] [role="tooltip"]')!.textContent).toMatch(/^loop, agent working time: 20 h, 80% of/)
    const range = box.querySelector('[data-chart="session-range"]')!
    expect(range.querySelector('[data-row="loop"] [data-text]')!.textContent).toBe('median 10 min · 90th 1 h · longest 4 h')
    expect(range.querySelector('[data-row="loop"] [data-mark="p50"]')).not.toBeNull()
    expect(range.querySelector('[data-row="loop"] [data-mark="max"]')).not.toBeNull()
    expect(range.querySelector('[data-row="t"] [data-mark]')).toBeNull()
    expect(box.querySelector('[data-chart="tools"] [data-row="pytest"] [data-total]')!.textContent).toBe('1 h · 50%')
    expect(box.querySelector('[data-chart="tool-range"] [data-row="pytest"] [data-mark="p95"] [role="tooltip"]')!.textContent).toContain('95th percentile 1 min')
    expect(box.querySelector('[data-chart="model-range"] [data-row="gpt-5"] [data-text]')!.textContent).toBe('median 8 s · 95th 1 min 30 s')
    expect(box.querySelector('[data-small-list]')!.textContent).toBe('Too small to compare (fewer than 5 sessions with turn times): t.')
    const rows = [...box.querySelectorAll('[data-repo]')]
    expect(rows.map(row => row.getAttribute('data-repo'))).toEqual(['loop', 't'])
    expect(rows[0].querySelector('summary')!.textContent).not.toContain('Wall-clock')
    expect(rows[0].querySelector('[data-repo-detail]')!.textContent).toContain('Wall-clock length (open time, not work)median 15 min')
    expect(rows[1].hasAttribute('data-small')).toBe(true)
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
  files_share: 0.02, commits: 0, cost_per_commit: null, time_per_commit_ms: null, small: true })
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
  it('says under the title what is counted, and leads with the changed files', () => {
    expect(changeLine(changes)).toBe('File writes and git commits made by agents in the period, per repository or folder; a file is one ' +
      'distinct path.')
    expect(changeHero(changes)).toEqual({ value: '101', label: 'files changed by agents: 505 file writes in 46 sessions' })
    const none = { ...changes, summary: { ...changes.summary, writes: 0, commits: 0, committed_share: null } } as ChangeBody
    expect(changeLine(none)).toBe('No agent changed a file or made a commit in this period.')
    expect(changeHero(none)).toBeUndefined()
    // The period's totals the old sentence stated are in the hover of the bar of all changed files.
    expect(kindTotal(changes).rows[0].hover).toBe('All repositories: 59 changed files: source 40 (68%), tests 10 (17%), docs 5 (8%), ' +
      'config and data 3 (5%), memory and instructions 1 (2%), other 0 (0%). 505 file writes in 46 sessions, lines +6.0 k −1.6 k; a ' +
      'commit of the same session followed 150 (30%); 12 commits; 41 sessions changed files and made no commit; 9 files written in ' +
      '3 or more sessions or 5 or more times in one.')
  })

  it('builds the hover text of bars, stacked parts, dots, columns and rewritten files from the figures behind them', () => {
    const files = changeFilesChart(changes)
    expect(files.rows.map(row => row.tracks[0].text)).toEqual(['59 · 50%', '40 · 34%', '2 · 2%'])
    expect(files.rows[0].hover).toBe('svc: 59 distinct files changed, 50% of 101; 200 writes, lines +3.0 k −800; kinds: 40 source · ' +
      '10 tests · 5 docs · 3 config and data · 1 memory and instructions.')
    expect(filesByKind(changes).rows[0].tracks[0].parts.map(part => part.value)).toEqual([40, 10, 5, 3, 1, 0])
    const kindRows = changeKindChart(changes).rows
    expect(kindRows[0].tracks[0].text).toBe('40 · 68%')
    expect(kindRows[0].hover).toBe('source: 40 files, 68% of 59 changed files. Kind by path: code, query, style and markup files by extension.')
    const writes = changeWritesChart(changes)
    expect(writes.rows.map(row => row.tracks[0].text)).toEqual(['150 committed · 50 not', '0 committed · 300 not', '0 committed · 5 not'])
    expect(writes.rows[0].hover).toBe('svc: 200 writes; a commit of the same session followed 150 (75%), none followed 50; 12 commits on ' +
      '6 days in 5 sessions.')
    expect(changeSessionsChart(changes).rows[0].tracks[0].text).toBe('5 · 10 · 5')
    const dots = perCommitDots(changes, changes.repos, false)
    expect(dots.rows.map(row => row.values.map(item => item.text))).toEqual([['$10.00', '50 min'], ['fewer than 3 commits', ''],
      ['fewer than 3 commits', '']])
    expect(dots.rows[0].values.map(item => item.hover)).toEqual(['svc: $120 at list price ÷ 12 commits = $10.00.',
      'svc: agent working time 10 h ÷ 12 commits = 50 min.'])
    expect(dots.rows[1].values[0].hover).toBe('loop: 0 commits, fewer than 3, so no figure per commit.')
    const commits = changeBinChart(changes, 'commits')
    expect(commits.title).toBe('Commits per day')
    expect(commits.columns.map(column => column.text)).toEqual(['4', '8'])
    expect(commits.columns[0].hover).toBe('Nov 14: 4 commits, 100 file writes.')
    expect(changeBinChart(changes, 'writes').columns.map(column => column.text)).toEqual(['100', '405'])
    const reworked = reworkedChart(changes)
    expect(reworked.rows[0].tracks[0].text).toBe('90 writes · 12 sessions')
    expect(reworked.rows[0].hover).toBe('/src/loop/docs/plan.md (docs, loop): 90 writes in 12 sessions, at most 20 in one session.')
  })

  it('draws titled charts with values and hovers, greys a small repository and names it under the charts', () => {
    const ctx = context({ data: { ...changes, node_scope: { kind: 'fleet', node_id: null } }, status: 'ready', error: null })
    const { host, dispose } = mount(() => <Changes {...props(ctx)} />)
    const box = host.querySelector('#insight-changes')!
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('101')
    const writes = box.querySelector('[data-chart="writes"]')!
    expect(writes.querySelector('figcaption')!.textContent).toBe('File writes per repository, by whether a commit of the same session followed')
    expect(writes.querySelector('[data-bar="svc"] [data-value]')!.textContent).toBe('150 committed · 50 not')
    expect(writes.querySelector('[data-bar="svc"] [role="tooltip"]')!.textContent).toMatch(/^svc: 200 writes/)
    expect(writes.querySelector('[data-bar="t"]')!.hasAttribute('data-small')).toBe(true)
    expect(box.querySelector('[data-chart="files"] [data-bar="svc"] [data-value]')!.textContent).toBe('59 · 50%')
    expect(box.querySelectorAll('[data-chart="files"] [data-bar="svc"] [data-part]').length).toBe(6)
    const commits = box.querySelector('[data-chart="commits"]')!
    expect(commits.querySelector('svg')!.textContent).toContain('8')
    expect(commits.querySelector('[data-column] rect title')!.textContent).toBe('Nov 14: 4 commits, 100 file writes.')
    expect(box.querySelector('[data-chart="reworked"] [data-bar="plan.md"] [role="tooltip"]')!.textContent)
      .toBe('/src/loop/docs/plan.md (docs, loop): 90 writes in 12 sessions, at most 20 in one session.')
    expect(box.querySelector('[data-small-list]')!.textContent).toBe('Too small to compare (fewer than 20 file writes and 3 commits): t.')
    expect([...box.querySelectorAll('[data-dots="per-commit"] [data-row]')].map(row => row.getAttribute('data-row'))).toEqual(['svc', 'loop', 't'])
    expect(box.querySelector('[data-repo-detail]')).toBeNull()
    dispose()
  })
})
