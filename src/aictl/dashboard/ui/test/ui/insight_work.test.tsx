// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Repositories from '../../src/panels/insights/Repositories'
import { repoFinding, repoHero, smallText, type Repo, type RepoBody } from '../../src/panels/insights/workModel'
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
