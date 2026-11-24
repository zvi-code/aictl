// @vitest-environment jsdom
import type { JSX } from '@solidjs/web'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CardProps } from '../../src/panels/insights/InsightCard'
import PauseTax from '../../src/panels/insights/PauseTax'
import Subagents from '../../src/panels/insights/Subagents'
import { sumRepos, type PauseBody, type SubagentBody } from '../../src/panels/insights/insightsModel'
import { notSplitNote, OTHER, OTHER_REPOS, type RepoRef, type RepoSegment } from '../../src/panels/insights/repoSplit'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const base = {
  view: 'insights.x', range: { since: 1_700_000_000, until: 1_700_086_400 },
  data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 }, computed_at: 1_700_086_000,
  query: { view: 'insights.x', kql: '// aictl view insights.x\nrequests | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
}
const order: RepoRef[] = [
  { repo: '/src/app', name: 'app', cost_usd: 300, requests: 900, sessions: 30 },
  { repo: '/src/docs', name: 'docs', cost_usd: 100, requests: 200, sessions: 5 },
]
const others = { repos: 3, cost_usd: 20, requests: 40, sessions: 4 }
const OTHER_TEXT = String(OTHER)

/** One segment of a bar: its measures, each one's share of `whole` and of the repository's own total (`own`). */
function seg(repo: string, values: Record<string, number>, whole: Record<string, number>, own: Record<string, number | null> = {}): RepoSegment {
  const name = order.find(item => item.repo === repo)?.name ?? null
  return {
    repo, name, ...values,
    share: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, whole[key] ? value / whole[key] : null])),
    of_repo: Object.fromEntries(Object.keys(values).map(key => [key, own[key] ?? null])),
  }
}

function context(state: DetailState<unknown>) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [] }), tools: () => [], openAgent() {},
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-repo-failures'), since: base.range.since, until: base.range.until })
/** Draw one card with an answer; the props are made outside the render, as a page passes them. */
function draw(Card: (p: CardProps) => JSX.Element, card: string, data: unknown) {
  const given = props(context({ data, status: 'ready', error: null }))
  const { host, dispose } = mount(() => <Card {...given} />)
  return { box: host.querySelector(`[data-box="insight-${card}"]`)!, dispose }
}
const texts = (nodes: Iterable<Element>, read: (node: Element) => string | null) => [...nodes].map(read)
const repos = (row: Element) => texts(row.querySelectorAll('[data-part]'), part => part.getAttribute('data-repo'))
const written = (row: Element) => texts(row.querySelectorAll('[data-part] button'), part => part.textContent)
const tip = (row: Element, part: string) => row.querySelector(`[data-part="${part}"] [role="tooltip"]`)!.textContent

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

// ─── Pause tax ───────────────────────────────────────────────────────────────────────────────────────────────────────
const shortWhole = { requests: 100, priced: 100, cost_usd: 10 }
const longWhole = { requests: 10, priced: 10, cost_usd: 3, estimate_usd: 1 }
const pause = {
  ...base, card: 'pause', repo_order: order, repo_others: others, sessions: [],
  tools: [{
    tool: 'claude-code', cache_reported: true,
    buckets: [
      { bucket: 'under_1m', requests: 100, priced: 100, cache_hit_share: 0.9, avg_cost_usd: 0.1, cost_usd: 10,
        repos: [seg('/src/app', { requests: 60, priced: 60, cost_usd: 6 }, shortWhole, { requests: 0.8, cost_usd: 0.7 }),
          seg('/src/docs', { requests: 30, priced: 30, cost_usd: 3 }, shortWhole, { requests: 1, cost_usd: 1 }),
          seg('', { requests: 10, priced: 10, cost_usd: 1 }, shortWhole, { requests: 0.9, cost_usd: 0.6 })] },
      { bucket: '1_5m', requests: 120, priced: 120, cache_hit_share: 0.8, avg_cost_usd: 0.1, cost_usd: 12, repos: [] },
      { bucket: '5_60m', requests: 10, priced: 10, cache_hit_share: 0.2, avg_cost_usd: 0.3, cost_usd: 3,
        repos: [seg('/src/app', { requests: 8, priced: 8, cost_usd: 2.4 }, { requests: 10, priced: 10, cost_usd: 3 }),
          seg('', { requests: 2, priced: 2, cost_usd: 0.6 }, { requests: 10, priced: 10, cost_usd: 3 })] },
      { bucket: 'over_60m', requests: 0, priced: 0, cache_hit_share: null, avg_cost_usd: null, cost_usd: null, repos: [] },
    ],
    long_pause: { ...longWhole, repos: [seg('/src/app', { requests: 8, priced: 8, cost_usd: 2.4, estimate_usd: 0.8 }, longWhole,
      { cost_usd: 0.3, estimate_usd: 0.2 }), seg('', { requests: 2, priced: 2, cost_usd: 0.6, estimate_usd: 0.2 }, longWhole)] },
  }],
  projects: [{ project: '/src/app', tool: 'claude-code', requests: 8, sessions: 2, cost_usd: 2.4, extra_usd: 1.6,
    repos: [seg('/src/app', { requests: 8, sessions: 2, cost_usd: 2.4, extra_usd: 1.6 }, { requests: 8, sessions: 2, cost_usd: 2.4, extra_usd: 1.6 })] }],
  causes: [{ tool: 'claude-code', cause: 'tool_running', requests: 10, priced: 10, cost_usd: 3, share: 1, buckets: [],
    repos: [seg('/src/app', { requests: 8, priced: 8, cost_usd: 2.4 }, longWhole), seg('', { requests: 2, priced: 2, cost_usd: 0.6 }, longWhole)] }],
  cause_tools: [{ tool: 'claude-code', tool_name: 'Bash', program: 'cargo', requests: 4, cost_usd: 1.2, p50_call_s: 60, max_call_s: 600,
    repos: [seg('/src/app', { requests: 4, cost_usd: 1.2 }, { requests: 4, cost_usd: 1.2 })] }],
  summary: { tools: ['claude-code'], requests: 10, cost_usd: 3, baseline_usd: 1, extra_usd: 2, not_reported: [] },
} as unknown as PauseBody

describe('INS-RS-F · Pause tax: bars split by repository', () => {
  it('keeps the bars by pause and adds a bar per tool and pause split by repository, with the legend once', () => {
    const { box, dispose } = draw(PauseTax, 'pause', pause)
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    expect(texts(box.querySelectorAll('[data-repo-legend] li'), item => item.textContent)).toEqual(['app', 'docs', OTHER_REPOS])
    expect(texts(box.querySelectorAll('[data-chart="pause-requests"] [data-part]'), part => part.getAttribute('data-part')))
      .toEqual(['under_1m', '1_5m', '5_60m'])
    // A bucket with no split (empty `repos`) has no row; a zero bucket none either.
    const chart = box.querySelector('[data-chart="pause-requests-repos"]')!
    expect(texts(chart.querySelectorAll('[data-row]'), row => row.getAttribute('data-row'))).toEqual(['claude-code:under_1m', 'claude-code:5_60m'])
    const short = chart.querySelector('[data-row="claude-code:under_1m"]')!
    expect(repos(short)).toEqual(['0', '1', OTHER_TEXT])
    // The "other" segment (10% of the longest row) writes its value on hover only.
    expect(written(short)).toEqual(['60', '30', ''])
    expect(short.querySelector('[data-total]')!.textContent).toBe('100 requests')
    expect(tip(short, 'repo:/src/app')).toMatch(/^claude-code, pause under 1 min, requests — app \(\/src\/app\): 60 · 60% of this bar · 80% of app own requests after any pause\. claude-code, pause under 1 minute: 100 requests/)
    const cost = box.querySelector('[data-chart="pause-cost-repos"] [data-row="claude-code:5_60m"]')!
    expect(repos(cost)).toEqual(['0', OTHER_TEXT])
    // One scale for every row: $0.60 is 6% of the $10 row, so it is written on hover only.
    expect(written(cost)).toEqual(['$2.40', ''])
    // The average per bucket is not a sum: whole, and its hover says so.
    expect(tip(box.querySelector('[data-chart="pause-average-claude-code"] [data-row="under_1m"]')!, 'under_1m')).toContain(notSplitNote('average'))
    dispose()
  })

  it('splits the measured cost and the estimate after long pauses, the estimate still named as one', () => {
    const { box, dispose } = draw(PauseTax, 'pause', pause)
    const measured = box.querySelector('[data-chart="pause-estimate"] [data-row="claude-code:measured"]')!
    const estimate = box.querySelector('[data-chart="pause-estimate"] [data-row="claude-code:estimate"]')!
    expect([repos(measured), repos(estimate)]).toEqual([['0', OTHER_TEXT], ['0', OTHER_TEXT]])
    expect(written(measured)).toEqual(['$2.40', '$0.60'])
    expect(estimate.querySelector('[data-total]')!.textContent).toBe('$1.00')
    expect(tip(estimate, 'repo:/src/app')).toMatch(new RegExp('^claude-code, after pauses of 5 minutes or more, estimate \\(not measured: ' +
      'the repository\'s priced requests × \\$0\\.10\\) — app \\(/src/app\\): \\$0\\.80 · 80% of this bar · 20% of app own estimate\\. ' +
      'claude-code, estimate: 10 priced requests'))
    expect(box.querySelector('[data-chart="pause-estimate"] [data-axis]')!.textContent).toContain('a segment per repository')
    dispose()
  })

  it('splits the projects, the causes and the calls through pauses, and leaves the summed "Other projects" bar whole', () => {
    const { box, dispose } = draw(PauseTax, 'pause', pause)
    expect(repos(box.querySelector('[data-chart="pause-projects"] [data-row="/src/app"]')!)).toEqual(['0'])
    const rest = box.querySelector('[data-chart="pause-projects"] [data-row="rest"]')!
    expect(texts(rest.querySelectorAll('[data-part]'), part => part.getAttribute('data-part'))).toEqual(['difference'])
    expect(tip(rest, 'difference')).toContain('Not split by repository')
    const cause = box.querySelector('[data-chart="pause-causes-repos"] [data-row="claude-code:tool_running"]')!
    expect(repos(cause)).toEqual(['0', OTHER_TEXT])
    expect(box.querySelector('[data-chart="pause-causes"] [data-part="tool_running"]')).not.toBeNull()
    const call = box.querySelector('[data-chart="pause-calls"] [data-row]')!
    expect(repos(call)).toEqual(['0'])
    expect(tip(call, 'repo:/src/app')).toContain('The median and longest call durations are of all the row\'s calls, not split by repository.')
    dispose()
  })

  it('draws the old bars when the answer carries no split', () => {
    const plain = { ...pause, repo_order: [], repo_others: null,
      tools: pause.tools.map(tool => ({ ...tool, long_pause: undefined, buckets: tool.buckets.map(cell => ({ ...cell, repos: undefined })) })),
      projects: pause.projects!.map(row => ({ ...row, repos: undefined })), causes: pause.causes!.map(row => ({ ...row, repos: undefined })),
      cause_tools: pause.cause_tools!.map(row => ({ ...row, repos: undefined })) } as unknown as PauseBody
    const { box, dispose } = draw(PauseTax, 'pause', plain)
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-chart="pause-requests-repos"]')).toBeNull()
    expect(box.querySelector('[data-chart="pause-causes-repos"]')).toBeNull()
    expect(texts(box.querySelectorAll('[data-chart="pause-estimate"] [data-part]'), part => part.getAttribute('data-part'))).toEqual(['measured', 'estimate'])
    expect(texts(box.querySelectorAll('[data-chart="pause-projects"] [data-part]'), part => part.getAttribute('data-part'))).toEqual(['difference', 'difference'])
    expect(tip(box.querySelector('[data-chart="pause-average-claude-code"] [data-row="under_1m"]')!, 'under_1m')).not.toContain('Not split')
    dispose()
  })

  it('sums a project\'s segments of each tool by repository, in repo_order order with every other repository last', () => {
    const a = [seg('', { extra_usd: 1 }, { extra_usd: 3 }, { extra_usd: 0.5 }), seg('/src/docs', { extra_usd: 2 }, { extra_usd: 3 }, { extra_usd: 0.2 })]
    const b = [seg('/src/app', { extra_usd: 3 }, { extra_usd: 4 }, { extra_usd: 0.1 }), seg('/src/docs', { extra_usd: 1 }, { extra_usd: 4 }, { extra_usd: null })]
    const merged = sumRepos([a, b], ['extra_usd'], order)
    expect(merged.map(row => [row.repo, row.extra_usd, row.share.extra_usd, row.of_repo.extra_usd])).toEqual([
      ['/src/app', 3, 3 / 7, 0.1], ['/src/docs', 3, 3 / 7, null], ['', 1, 1 / 7, 0.5]])
  })
})

// ─── Spend in subagents ──────────────────────────────────────────────────────────────────────────────────────────────
const mainWhole = { requests: 300, priced: 300, cost_usd: 30 }
const subWhole = { requests: 100, priced: 100, cost_usd: 20, agents: 10 }
const subagents = {
  ...base, card: 'subagents', repo_order: order, repo_others: others,
  tools: [{
    tool: 'claude-code', subagent_share: 0.4,
    main: { ...mainWhole, repos: [seg('/src/app', { requests: 200, priced: 200, cost_usd: 20 }, mainWhole, { requests: 0.7, cost_usd: 0.6 }),
      seg('/src/docs', { requests: 100, priced: 100, cost_usd: 10 }, mainWhole, { requests: 0.9, cost_usd: 0.8 })] },
    subagents: { ...subWhole, repos: [seg('/src/app', { requests: 80, priced: 80, cost_usd: 15, agents: 8 }, subWhole, { cost_usd: 0.4 }),
      seg('', { requests: 20, priced: 20, cost_usd: 5, agents: 2 }, subWhole, { cost_usd: 0.2 })] },
  }],
  sessions: [{ session_id: 's-sub-0001-aaaa', tool: 'claude-code', agents: 4, requests: 40, cost_usd: 8, main_cost: 3,
    repos: [seg('/src/docs', { requests: 40, cost_usd: 8, agents: 4 }, { requests: 40, cost_usd: 8, agents: 4 }, { cost_usd: 0.25 })] }],
  summary: { main_cost_usd: 30, subagent_cost_usd: 20, subagent_share: 0.4, subagents: 10, subagent_requests: 100 },
} as unknown as SubagentBody

describe('INS-RS-F · Spend in subagents: bars split by repository', () => {
  it('keeps the bars by side and adds a row per tool and side split by repository', () => {
    const { box, dispose } = draw(Subagents, 'subagents', subagents)
    expect(texts(box.querySelectorAll('[data-repo-legend] li'), item => item.textContent)).toEqual(['app', 'docs', OTHER_REPOS])
    expect(texts(box.querySelectorAll('[data-chart="subagent-cost"] [data-part]'), part => part.getAttribute('data-part'))).toEqual(['main', 'subagents'])
    const cost = box.querySelector('[data-chart="subagent-cost-repos"]')!
    expect(texts(cost.querySelectorAll('[data-row]'), row => row.getAttribute('data-row'))).toEqual(['claude-code:main', 'claude-code:subagents'])
    const main = cost.querySelector('[data-row="claude-code:main"]')!
    expect([repos(main), written(main)]).toEqual([['0', '1'], ['$20.00', '$10.00']])
    expect(main.querySelector('[data-total]')!.textContent).toBe('$30.00')
    const sub = cost.querySelector('[data-row="claude-code:subagents"]')!
    expect(repos(sub)).toEqual(['0', OTHER_TEXT])
    expect(tip(sub, 'repo:/src/app')).toBe('claude-code, subagents, cost — app (/src/app): $15.00 · 75% of this bar · 40% of app own ' +
      'cost in subagents. claude-code, subagents (10 subagents): 100 requests (25% of 400; 100 priced), $20.00 at list price (40% of $50.00).')
    const requests = box.querySelector('[data-chart="subagent-requests-repos"] [data-row="claude-code:main"]')!
    expect(written(requests)).toEqual(['200', '100'])
    dispose()
  })

  it('colours a session bar by its repository', () => {
    const { box, dispose } = draw(Subagents, 'subagents', subagents)
    const row = box.querySelector('[data-chart="subagent-sessions"] [data-row="s-sub-0001-aaaa"]')!
    expect([repos(row), written(row)]).toEqual([['1'], ['$8.00']])
    expect(tip(row, 'repo:/src/docs')).toBe('Session s-sub-00, subagent cost — docs (/src/docs): $8.00 · 100% of this bar · 25% of docs own ' +
      'subagent cost. Session s-sub-0001-aaaa (claude-code): 4 subagents made 40 requests costing $8.00 at list price; its main agent cost $3.00.')
    dispose()
  })

  it('draws the old bars when the answer carries no split', () => {
    const plain = { ...subagents, repo_order: [], repo_others: null,
      tools: subagents.tools.map(tool => ({ ...tool, main: { ...tool.main, repos: undefined }, subagents: { ...tool.subagents, repos: undefined } })),
      sessions: subagents.sessions.map(row => ({ ...row, repos: undefined })) } as unknown as SubagentBody
    const { box, dispose } = draw(Subagents, 'subagents', plain)
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-chart="subagent-cost-repos"]')).toBeNull()
    expect(texts(box.querySelectorAll('[data-chart="subagent-sessions"] [data-part]'), part => part.getAttribute('data-part'))).toEqual(['cost'])
    dispose()
  })
})
