// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import ContextWeight from '../../src/panels/insights/ContextWeight'
import FixedContext from '../../src/panels/insights/FixedContext'
import Orientation from '../../src/panels/insights/Orientation'
import Rereads from '../../src/panels/insights/Rereads'
import type { ContextBody, FixedBody, OrientationBody, RereadBody } from '../../src/panels/insights/insightsModel'
import { OTHER, OTHER_REPOS, type RepoRef, type RepoSegment } from '../../src/panels/insights/repoSplit'
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
const REPOS: [string, string | null][] = [['/src/app', 'app'], ['/src/docs', 'docs'], ['', null]]

/** Three segments (app, docs, other) of a bar: each measure's values in that order, their shares of the bar, of_repo null. */
function segments(values: Record<string, [number, number, number]>, ofRepo: Record<string, [number, number, number]> = {}): RepoSegment[] {
  return REPOS.map(([repo, name], i) => {
    const segment: RepoSegment = { repo, name, share: {}, of_repo: {} }
    for (const [key, triple] of Object.entries(values)) {
      const whole = triple.reduce((sum, value) => sum + value, 0)
      segment[key] = triple[i]
      segment.share[key] = whole ? triple[i] / whole : null
      segment.of_repo[key] = ofRepo[key]?.[i] ?? null
    }
    return segment
  })
}

const cell = (bucket: string, requests: number, cost: number, repos?: RepoSegment[]) => ({
  bucket, requests, priced: requests, cost_usd: cost, request_share: requests / 1000, cost_share: cost / 100, repos,
})
const context = {
  ...base, card: 'context', repo_order: order, repo_others: others,
  tools: [{ tool: 'claude-code', requests: 1000, reported: 1000, p50_context: 150_000, p90_context: 400_000, cost_usd: 100,
    buckets: [cell('under_50k', 600, 40, segments({ requests: [400, 150, 50], cost_usd: [30, 8, 2] })),
      cell('50_100k', 400, 60, segments({ requests: [300, 60, 40], cost_usd: [45, 10, 5] })),
      cell('100_200k', 0, 0), cell('200_500k', 0, 0), cell('over_500k', 0, 0)],
    heavy_requests: 0, heavy_cost_usd: 0, small_requests: 200, small_cost_usd: 10,
    repos: segments({ reported: [700, 210, 90], cost_usd: [75, 18, 7] }, { reported: [0.8, 1, 1] }),
    small_repos: segments({ small_requests: [120, 60, 20], small_cost_usd: [6, 3, 1] }) }],
  summary: { reported: 1000, heavy_requests: 0, heavy_share: 0, cost_usd: 100, heavy_cost_usd: 0, heavy_cost_share: 0,
    small_requests: 200, small_cost_usd: 10, not_reported: [] },
  sessions: [],
} as unknown as ContextBody

const orientation = {
  ...base, card: 'orientation', repo_order: order, repo_others: others,
  projects: [
    { project_path: '/src/app', sessions: 20, tools: ['claude-code'], p50_requests: 12, p50_cost_usd: 1.5 },
    { project_path: '/elsewhere/tool', sessions: 5, tools: ['claude-code'], p50_requests: 8, p50_cost_usd: 0.5 },
  ],
  tools: [{ tool: 'claude-code', sessions: 40, edited: 30, no_project: 0, p50_requests: 10, never: 10, never_requests: 100,
    never_cost_usd: 20, repos: segments({ sessions: [25, 10, 5], edited: [20, 7, 3], never: [5, 3, 2], never_requests: [50, 30, 20],
      never_cost_usd: [10, 6, 4] }) }],
  summary: { sessions: 40, edited: 30, projects: 2, never: 10, never_cost_usd: 20, no_project: 0 },
  sessions: [],
} as unknown as OrientationBody

const rereads = {
  ...base, card: 'rereads', repo_order: order, repo_others: others,
  tools: [{ tool: 'claude-code', reads: 1000, repeat_reads: 400, repeat_share: 0.4, files: 300, files_5plus: 20, most_reads: 30,
    repeat_bytes: 4_000_000, unmatched: 0,
    repos: segments({ reads: [700, 200, 100], repeat_reads: [300, 60, 40], files: [200, 70, 30], files_5plus: [15, 4, 1],
      repeat_bytes: [3_000_000, 600_000, 400_000] }) }],
  summary: { reads: 1000, repeat_reads: 400, repeat_share: 0.4, files_5plus: 20, repeat_bytes: 4_000_000, unmatched: 0 },
  sessions: [],
} as unknown as RereadBody

const FIXED_KINDS = ['instruction_file', 'memory_file', 'system_prompt_other', 'skills', 'mcp_instructions', 'custom_agents', 'tools_listed']
const fixed = {
  ...base, card: 'fixed', repo_order: order, repo_others: others,
  tools: [{ tool: 'claude-code', sessions: 100, p50_tokens: 9000, p90_tokens: 15_000, avg_tokens: 10_000, p50_skills: 40, estimated: true,
    repos: segments({ sessions: [60, 30, 10], avg_tokens: [6000, 3000, 1000] }),
    kinds: FIXED_KINDS.map(kind => kind === 'instruction_file'
      ? { kind, reported: true, sessions: 100, session_share: 1, p50_tokens: 4000, avg_tokens: 4000, p50_items: 2, estimated: true,
        repos: segments({ sessions: [60, 30, 10], avg_tokens: [2400, 1200, 400] }) }
      : kind === 'skills'
        ? { kind, reported: true, sessions: 100, session_share: 1, p50_tokens: 5000, avg_tokens: 6000, p50_items: 40, estimated: true,
          repos: segments({ sessions: [60, 30, 10], avg_tokens: [3600, 1800, 600] }) }
        : { kind, reported: false, sessions: null, session_share: null, p50_tokens: null, avg_tokens: null, p50_items: null, estimated: true }),
  }],
  skills: [{ tool: 'claude-code', listed: 40, used: 10, listing_tokens: 600_000, unused_tokens: 450_000, uses: 30, skills_used: 10, triggers: [] }],
  top_skills: [{ tool: 'claude-code', name: 'dataviz', sessions: 100, tokens: 50_000, uses: 3 }],
  files: [{ tool: 'claude-code', file: 'CLAUDE.md', sessions: 100, loads: 100, avg_tokens: 3000, max_tokens: 3500, tokens: 300_000 }],
  summary: { sessions: 100, heaviest: { tool: 'claude-code', p50_tokens: 9000 }, listed: 40, never_used: 30, never_used_share: 0.75,
    listing_tokens: 600_000, unused_tokens: 450_000, listing_not_reported: [] },
  sessions: [],
} as unknown as FixedBody

function ctxOf(state: DetailState<unknown>) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [] }), tools: () => [], openAgent() {},
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (data: unknown) => ({ ctx: ctxOf({ data, status: 'ready', error: null }), boxes: createBoxes('test-repo-context'),
  since: base.range.since, until: base.range.until })
const legend = (box: Element) => [...box.querySelectorAll('[data-repo-legend] li')].map(item => item.textContent)
const repoAttrs = (row: Element) => [...row.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))
const texts = (row: Element) => [...row.querySelectorAll('[data-part] button')].map(part => part.textContent)
const hover = (row: Element, part: string) => row.querySelector(`[data-part="${part}"] [role="tooltip"]`)!.textContent
const ALL = ['0', '1', String(OTHER)]

/** The body without any `repos`: what an older server answers. */
function strip<T>(body: T): T {
  return JSON.parse(JSON.stringify(body, (key, value) => key === 'repos' || key === 'small_repos' || key === 'repo_order' ? undefined : value))
}

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('INS-RS · Context group cards split by repository', () => {
  it('Context weight: keeps the bucket bars, adds per-tool and per-bucket bars by repository, splits small steps', () => {
    const { host, dispose } = mount(() => <ContextWeight {...props(context)} />)
    const box = host.querySelector('[data-box="insight-context"]')!
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    expect(legend(box)).toEqual(['app', 'docs', OTHER_REPOS])
    expect([...box.querySelectorAll('[data-chart="context-requests"] [data-part]')].map(part => part.getAttribute('data-part')))
      .toEqual(['under_50k', '50_100k'])
    const rows = [...box.querySelectorAll('[data-chart="context-requests-repos"] [data-row]')]
    expect(rows.map(row => row.getAttribute('data-row'))).toEqual(['claude-code', 'claude-code:under_50k', 'claude-code:50_100k'])
    expect(repoAttrs(rows[0])).toEqual(ALL)
    expect(rows[0].querySelector('[data-total]')!.textContent).toBe('1,000 requests')
    expect(texts(rows[0])).toEqual(['700 requests', '210 requests', ''])
    expect(hover(rows[0], 'repo:/src/app')).toBe('claude-code, requests — app (/src/app): 700 requests · 70% of this bar · 80% of app ' +
      'own requests. claude-code: 1,000 requests with token counts, $100 at list price.')
    const cost = box.querySelector('[data-chart="context-cost-repos"] [data-row="claude-code:50_100k"]')!
    expect(repoAttrs(cost)).toEqual(ALL)
    expect(hover(cost, 'repo:/src/docs')).toMatch(/^claude-code, context 50k–100k tokens, cost at list price — docs \(\/src\/docs\): \$10\.00 · 17% of this bar\. claude-code, context 50k–100k tokens: 400 requests/)
    const small = box.querySelector('[data-chart="context-small"] [data-row="claude-code"]')!
    expect(repoAttrs(small)).toEqual(ALL)
    expect(hover(small, 'repo:')).toMatch(/^claude-code, small steps — Other repositories \(.*\): 20 requests · 10% of this bar\. Their cost: \$1\.00 at list price\. claude-code: 200 requests/)
    expect(hover(box.querySelector('[data-chart="context-percentiles"] [data-row="claude-code:p50"]')!, 'p50'))
      .toContain('Not split by repository: the median of a whole is not the sum of the medians of its parts.')
    dispose()
  })

  it('Context weight: a body without repos draws the old bars only', () => {
    const { host, dispose } = mount(() => <ContextWeight {...props(strip(context))} />)
    const box = host.querySelector('[data-box="insight-context"]')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-chart="context-requests-repos"]')).toBeNull()
    expect([...box.querySelectorAll('[data-chart="context-small"] [data-part]')].map(part => part.getAttribute('data-part'))).toEqual(['small'])
    dispose()
  })

  it('Orientation: keeps the edit bar, adds sessions and no-edit cost by repository, colours a project that is a repository', () => {
    const { host, dispose } = mount(() => <Orientation {...props(orientation)} />)
    const box = host.querySelector('[data-box="insight-orientation"]')!
    expect(legend(box)).toEqual(['app', 'docs', OTHER_REPOS])
    expect([...box.querySelectorAll('[data-chart="orientation-tools"] [data-part]')].map(part => part.getAttribute('data-part')))
      .toEqual(['edited', 'never'])
    const sessions = box.querySelector('[data-chart="orientation-tools-repos"] [data-row="claude-code"]')!
    expect(repoAttrs(sessions)).toEqual(ALL)
    expect(sessions.querySelector('[data-total]')!.textContent).toBe('40 sessions')
    expect(hover(sessions, 'repo:/src/app')).toBe('claude-code, sessions — app (/src/app): 25 sessions · 63% of this bar. Of them 20 ' +
      'recorded an edit and 5 no edit; the main agents of those with no edit made 50 requests costing $10.00 at list price. ' +
      'claude-code: 30 of 40 sessions (75%) recorded an edit; the median one made 10 requests before it.')
    const never = box.querySelector('[data-chart="orientation-never-repos"] [data-row="claude-code"]')!
    expect(texts(never)).toEqual(['$10.00', '$6.00', '$4.00'])
    // The project that is the ranked repository "app" takes its colour; the other project keeps its own.
    const projects = [...box.querySelectorAll('[data-chart="orientation-requests"] [data-row]')]
    expect(projects.map(row => repoAttrs(row)[0])).toEqual(['0', null])
    expect(hover(projects[0], 'requests')).toMatch(/Coloured as the repository app in the legend\.$/)
    dispose()
  })

  it('Orientation: a body without repos draws the old bars only', () => {
    const { host, dispose } = mount(() => <Orientation {...props(strip(orientation))} />)
    const box = host.querySelector('[data-box="insight-orientation"]')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-chart="orientation-tools-repos"]')).toBeNull()
    expect(repoAttrs(box.querySelector('[data-chart="orientation-requests"] [data-row]')!)).toEqual([null])
    dispose()
  })

  it('Repeated file reads: keeps the first/again bar, adds reads and reads again by repository, splits files read 5+ times', () => {
    const { host, dispose } = mount(() => <Rereads {...props(rereads)} />)
    const box = host.querySelector('[data-box="insight-rereads"]')!
    expect(legend(box)).toEqual(['app', 'docs', OTHER_REPOS])
    expect([...box.querySelectorAll('[data-chart="reread-reads"] [data-part]')].map(part => part.getAttribute('data-part')))
      .toEqual(['first', 'again'])
    const reads = box.querySelector('[data-chart="reread-reads-repos"] [data-row="claude-code"]')!
    expect(repoAttrs(reads)).toEqual(ALL)
    expect(texts(reads)).toEqual(['700 reads', '200 reads', ''])
    expect(hover(reads, 'repo:/src/app')).toBe('claude-code, file reads — app (/src/app): 700 reads · 70% of this bar. First reads 400, ' +
      'read again 300, over 200 files; 3 MB returned again. claude-code: 1,000 reads with a recorded path over 300 files, 400 of them ' +
      'of a file the same agent had already read (40%).')
    const again = box.querySelector('[data-chart="reread-again-repos"] [data-row="claude-code"]')!
    expect(again.querySelector('[data-total]')!.textContent).toBe('400 reads again')
    expect(repoAttrs(again)).toEqual(ALL)
    const files = box.querySelector('[data-chart="reread-files"] [data-row="claude-code"]')!
    expect(repoAttrs(files)).toEqual(ALL)
    expect(hover(files, 'repo:/src/docs')).toMatch(/^claude-code, files read 5 times or more — docs \(\/src\/docs\): 4 files · 20% of this bar\. Of 70 files read in this repository\. .* Not split by repository: the maximum of a whole/)
    dispose()
  })

  it('Repeated file reads: a body without repos draws the old bars only', () => {
    const { host, dispose } = mount(() => <Rereads {...props(strip(rereads))} />)
    const box = host.querySelector('[data-box="insight-rereads"]')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-chart="reread-reads-repos"]')).toBeNull()
    expect([...box.querySelectorAll('[data-chart="reread-files"] [data-part]')].map(part => part.getAttribute('data-part'))).toEqual(['files'])
    dispose()
  })

  it('Fixed context overhead: keeps the kind bar, adds per-tool and per-kind averages by repository, says what is not split', () => {
    const { host, dispose } = mount(() => <FixedContext {...props(fixed)} />)
    const box = host.querySelector('[data-box="insight-fixed"]')!
    expect(legend(box)).toEqual(['app', 'docs', OTHER_REPOS])
    expect([...box.querySelectorAll('[data-chart="fixed-kinds"] [data-part]')].map(part => part.getAttribute('data-part')))
      .toEqual(['instruction_file', 'skills'])
    const rows = [...box.querySelectorAll('[data-chart="fixed-kinds-repos"] [data-row]')]
    expect(rows.map(row => row.getAttribute('data-row'))).toEqual(['claude-code', 'claude-code:instruction_file', 'claude-code:skills'])
    expect(repoAttrs(rows[0])).toEqual(ALL)
    expect(hover(rows[0], 'repo:/src/app')).toBe('claude-code, average fixed context — app (/src/app): 6.0 k tokens · 60% of this bar. 60 ' +
      'sessions in this repository; its tokens divided by all 100 sessions of the tool, so the segments add up to the bar\'s average. ' +
      'claude-code: average 10 k tokens per session over 100 sessions (estimated); median 9.0 k tokens, 90th percentile 15 k tokens. Not ' +
      'split by repository: the median of a whole is not the sum of the medians of its parts.')
    expect(box.querySelector('[data-not-split]')!.textContent).toContain('Not split by repository')
    for (const chart of ['fixed-listing', 'fixed-files', 'fixed-skills']) {
      const tips = [...box.querySelectorAll(`[data-chart="${chart}"] [role="tooltip"]`)]
      expect(tips.length, chart).toBeGreaterThan(0)
      for (const tip of tips) expect(tip.textContent, chart).toMatch(/ Not split by repository\.$/)
    }
    dispose()
  })

  it('Fixed context overhead: a body without repos draws the old bars only', () => {
    const { host, dispose } = mount(() => <FixedContext {...props(strip(fixed))} />)
    const box = host.querySelector('[data-box="insight-fixed"]')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-chart="fixed-kinds-repos"]')).toBeNull()
    expect(box.querySelector('[data-not-split]')).toBeNull()
    expect(box.querySelector('[data-chart="fixed-files"] [role="tooltip"]')!.textContent).not.toContain('Not split')
    dispose()
  })
})
