// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import ContextCarry from '../../src/panels/insights/ContextCarry'
import TimeSplit from '../../src/panels/insights/TimeSplit'
import type { CarryBody, TimeBody } from '../../src/panels/insights/insightsModel'
import {
  hasOther, notSplitNote, OTHER, OTHER_REPOS, repoColour, repoColourVar, repoHover, repoLegend, repoName, repoParts,
  type RepoRef, type RepoSegment,
} from '../../src/panels/insights/repoSplit'
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
const segment = (repo: string, name: string | null, output: number, carried: number, whole: [number, number],
  own: [number | null, number | null]): RepoSegment => ({
  repo, name, output_bytes: output, carried_bytes: carried, share: { output_bytes: output / whole[0], carried_bytes: carried / whole[1] },
  of_repo: { output_bytes: own[0], carried_bytes: own[1] },
})
const bashRepos = [segment('/src/app', 'app', 700_000, 7_000_000, [1_000_000, 10_000_000], [0.875, 0.7]),
  segment('/src/docs', 'docs', 200_000, 2_000_000, [1_000_000, 10_000_000], [1, 1]),
  segment('', null, 100_000, 1_000_000, [1_000_000, 10_000_000], [1, 1])]
const carry = {
  ...base, card: 'carry', repo_order: order, repo_others: others,
  tool_names: [{ tool: 'claude-code', tool_name: 'Bash', calls: 100, output_bytes: 1_000_000, carried_bytes: 10_000_000,
    avg_later_requests: 10, repos: bashRepos }],
  tools: [{ tool: 'claude-code', calls: 120, reported: 100, output_bytes: 1_000_000, carried_bytes: 10_000_000, repos: bashRepos }],
  summary: { output_bytes: 1_000_000, carried_bytes: 10_000_000, not_reported: [],
    top: { tool: 'claude-code', tool_name: 'Bash', calls: 100, output_bytes: 1_000_000, carried_bytes: 10_000_000, avg_later_requests: 10 } },
  sessions: [],
} as unknown as CarryBody

const H = 3_600_000
const timeSegment = (repo: string, name: string | null, model: number, tool: number, own: number | null): RepoSegment => ({
  repo, name, time_ms: model + tool, model_ms: model, tool_ms: tool,
  share: { time_ms: (model + tool) / (10 * H), model_ms: model / (6 * H), tool_ms: tool / (4 * H) },
  of_repo: { time_ms: own, model_ms: own, tool_ms: own },
})
const cargoRepos: RepoSegment[] = [
  { repo: '/src/app', name: 'app', duration_ms: 3 * H, share: { duration_ms: 0.75 }, of_repo: { duration_ms: null } },
  { repo: '', name: null, duration_ms: 1 * H, share: { duration_ms: 0.25 }, of_repo: { duration_ms: null } },
]
const time = {
  ...base, card: 'time', repo_order: order, repo_others: others,
  tools: [{ tool: 'claude-code', requests: 1000, untimed_requests: 0, overlong_requests: 0, model_ms: 6 * H, thinking_ms: 1 * H,
    calls: 500, untimed_calls: 0, overlong_calls: 0, overlong_ms: 0, tool_ms: 4 * H, time_ms: 10 * H,
    repos: [timeSegment('/src/app', 'app', 4 * H, 3 * H, 1), timeSegment('/src/docs', 'docs', 1.5 * H, 0.5 * H, 1),
      timeSegment('', null, 0.5 * H, 0.5 * H, 1)] }],
  programs: [{ group: 'program', program: 'cargo', calls: 40, untimed: 0, overlong: 0, duration_ms: 4 * H, p50_ms: 1000, p95_ms: 9000,
    failure_share: 0.1, repos: cargoRepos }],
  summary: { model_ms: 6 * H, thinking_ms: 1 * H, tool_ms: 4 * H, thinking_reported: ['claude-code'], untimed_requests: 0, untimed_calls: 0,
    overlong: 0, overlong_ms: 0, top_program: null },
  sessions: [],
} as unknown as TimeBody

function context(state: DetailState<unknown>) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [] }), tools: () => [], openAgent() {},
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-repo-split'), since: base.range.since, until: base.range.until })

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('INS-RS · Bars split by repository, one colour per repository for the screen', () => {
  it('gives a repository its position in repo_order as its colour, and every other repository grey', () => {
    expect(order.map(item => repoColour(order, item.repo))).toEqual([0, 1])
    expect(repoColour(order, '/elsewhere')).toBe(OTHER)
    expect(repoColour(order, '')).toBe(OTHER)
    expect(repoColour(undefined, '/src/app')).toBe(OTHER)
    // A ninth repository has no colour of its own.
    const nine = Array.from({ length: 9 }, (_, i) => ({ repo: `/r${i}`, name: `r${i}` }))
    expect(repoColour(nine, '/r8')).toBe(OTHER)
    expect([repoColourVar(0), repoColourVar(7), repoColourVar(OTHER)]).toEqual(['var(--color-chart-1)', 'var(--color-chart-8)', 'var(--color-border)'])
    expect([repoName(order, '/src/docs'), repoName(order, '/x/y/'), repoName(order, '')]).toEqual(['docs', 'y', OTHER_REPOS])
  })

  it('lists the legend in rank order with "Other repositories" last, only when there is another one', () => {
    expect(repoLegend({ repo_order: order, repo_others: others }).map(item => [item.label, item.colour])).toEqual([
      ['app', 0], ['docs', 1], [OTHER_REPOS, OTHER]])
    expect(repoLegend({ repo_order: order, repo_others: others }).at(-1)!.title)
      .toBe('3 repositories outside the 2 with the highest list-price cost, summed; sessions with no folder are counted here too')
    expect(repoLegend({ repo_order: order, repo_others: null }).map(item => item.label)).toEqual(['app', 'docs'])
    expect(repoLegend({ repo_order: order, repo_others: null }, true).map(item => item.label)).toEqual(['app', 'docs', OTHER_REPOS])
    expect(hasOther([{ repos: bashRepos }])).toBe(true)
    expect(hasOther([{ repos: bashRepos.slice(0, 2) }, {}])).toBe(false)
  })

  it('builds one part per repository whose values sum to the bar, each with its hover', () => {
    const parts = repoParts(bashRepos, 'output_bytes', order, value => `${value / 1000} kB`, 'Bash, result bytes', 'result bytes')
    expect(parts.map(part => [part.key, part.label, part.value, part.text, part.repo])).toEqual([
      ['repo:/src/app', 'app', 700_000, '700 kB', 0], ['repo:/src/docs', 'docs', 200_000, '200 kB', 1],
      ['repo:', OTHER_REPOS, 100_000, '100 kB', OTHER]])
    expect(parts.reduce((sum, part) => sum + (part.value ?? 0), 0)).toBe(1_000_000)
    expect(parts[0].hover).toBe('Bash, result bytes — app (/src/app): 700 kB · 70% of this bar · 88% of app own result bytes.')
    expect(parts[2].hover).toBe('Bash, result bytes — Other repositories (every repository outside the 8 with the highest cost, ' +
      'summed): 100 kB · 10% of this bar · 100% of their own result bytes.')
    // Where the repository's own total is not known, the hover leaves that share out; a zero segment is not drawn.
    const unknown = repoParts([{ ...bashRepos[1], of_repo: { output_bytes: null } }, { ...bashRepos[0], output_bytes: 0 }], 'output_bytes',
      order, String, 'Bar', 'bytes', 'Whole bar: 1 MB.')
    expect(unknown.map(part => part.hover)).toEqual(['Bar — docs (/src/docs): 200000 · 20% of this bar. Whole bar: 1 MB.'])
    expect(repoHover({ bar: 'B', repo: '/a', name: 'a', value: '1 h', share: null, measure: 'time' })).toBe('B — a (/a): 1 h.')
    expect(notSplitNote('median')).toBe('Not split by repository: the median of a whole is not the sum of the medians of its parts.')
  })

  it('draws Context carry with a segment per repository on each bar and the legend once above the charts', () => {
    history.replaceState(null, '', '/?screen=insights&range=all&view=carry&by=repo')
    const ctx = context({ data: carry, status: 'ready', error: null })
    const { host, dispose } = mount(() => <ContextCarry {...props(ctx)} />)
    const box = host.querySelector('#insight-carry')!
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    expect([...box.querySelectorAll('[data-repo-legend] li')].map(item => item.textContent)).toEqual(['app', 'docs', OTHER_REPOS])
    for (const chart of ['carry-names', 'carry-tools']) for (const lane of ['0', '1']) {
      const parts = [...box.querySelectorAll(`[data-chart="${chart}"] [data-row] [data-lane="${lane}"] [data-part]`)]
      expect(parts.map(part => part.getAttribute('data-repo')), `${chart} ${lane}`).toEqual(['0', '1', String(OTHER)])
    }
    const carried = box.querySelector('[data-chart="carry-names"] [data-row] [data-lane="1"]')!
    expect(carried.querySelector('[data-total]')!.textContent).toBe('up to 10 MB')
    expect(carried.querySelector('[data-part="repo:/src/app"] [role="tooltip"]')!.textContent).toBe('Bash (claude-code), bytes sent ' +
      'again (upper bound) — app (/src/app): 7 MB · 70% of this bar · 70% of app own bytes sent again (upper bound). Bash ' +
      '(claude-code): 100 calls returned 1 MB. Estimate, upper bound: each result × the later requests of the same session and ' +
      'agent (10 on average) = 10 MB; compaction and truncation are not taken into account. All tools: 1 MB of results, up to ' +
      '10 MB sent again (10× the result bytes, estimate).')
    dispose()
  })

  it('keeps a bar whole when the answer carries no split', () => {
    history.replaceState(null, '', '/?screen=insights&range=all&view=carry&by=repo')
    const plain = { ...carry, repo_order: [], repo_others: null,
      tool_names: carry.tool_names.map(row => ({ ...row, repos: undefined })),
      tools: carry.tools.map(row => ({ ...row, repos: undefined })) } as unknown as CarryBody
    const { host, dispose } = mount(() => <ContextCarry {...props(context({ data: plain, status: 'ready', error: null }))} />)
    const box = host.querySelector('#insight-carry')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect([...box.querySelectorAll('[data-chart="carry-names"] [data-part]')].map(part => part.getAttribute('data-part'))).toEqual(['output', 'carried'])
    dispose()
  })

  it('draws Where the time goes once per tool, by kind or, with by=repo, by repository', () => {
    const byKind = mount(() => <TimeSplit {...props(context({ data: time, status: 'ready', error: null }))} />)
    // By kind: the bar by kind, the kind legend, no repository legend.
    expect([...byKind.host.querySelectorAll('#insight-time [data-chart="time-tools"] [data-part]')].map(part => part.getAttribute('data-part')))
      .toEqual(['thinking', 'model', 'tools'])
    expect(byKind.host.querySelector('#insight-time [data-repo-legend]')).toBeNull()
    byKind.dispose()
    history.replaceState(null, '', '/?screen=insights&view=time&by=repo')
    const { host, dispose } = mount(() => <TimeSplit {...props(context({ data: time, status: 'ready', error: null }))} />)
    const box = host.querySelector('#insight-time')!
    expect([...box.querySelectorAll('[data-repo-legend] li')].map(item => item.textContent)).toEqual(['app', 'docs', OTHER_REPOS])
    expect(box.querySelector('[data-kind-legend]')).toBeNull()
    const repos = box.querySelector('[data-chart="time-tools"] [data-row="claude-code"]')!
    expect(repos.querySelector('[data-total]')!.textContent).toBe('10 h')
    expect([...repos.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1', String(OTHER)])
    expect([...repos.querySelectorAll('[data-part] button')].map(part => part.textContent)).toEqual(['7 h', '2 h', ''])
    expect(repos.querySelector('[data-part="repo:/src/docs"] [role="tooltip"]')!.textContent).toBe('claude-code, summed time — docs ' +
      '(/src/docs): 2 h · 20% of this bar · 100% of docs own summed time. claude-code: model 6 h + tool calls 4 h = 10 h.')
    const cargo = box.querySelector('[data-chart="time-programs"] [data-row="program:cargo"]')!
    expect([...cargo.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', String(OTHER)])
    expect(cargo.querySelector('[data-part="repo:"] [role="tooltip"]')!.textContent).toMatch(new RegExp('^cargo, summed time — Other ' +
      'repositories \\(every repository outside the 8 with the highest cost, summed\\): 1 h · 25% of this bar\\. cargo: .* The ' +
      'median and 95th percentile are of all the row\'s calls, not split by repository\\.$'))
    expect(box.querySelector('[data-chart="time-programs"] [data-axis]')!.textContent).toContain('a segment per repository')
    dispose()
  })
})
