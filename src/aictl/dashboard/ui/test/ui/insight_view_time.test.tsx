// @vitest-environment jsdom
// The time and spend views as stand-alone views: one chart per question, one switch "Colour by", one line under the title.
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import Subagents from '../../src/panels/insights/Subagents'
import TimeSplit from '../../src/panels/insights/TimeSplit'
import { readColourBy } from '../../src/panels/insights/charts/ColourBy'
import type { SubagentBody, TimeBody } from '../../src/panels/insights/insightsModel'
import { OTHER, type RepoRef, type RepoSegment } from '../../src/panels/insights/repoSplit'
import { sessionRows, sideRepoRows, sideRows, subagentLine } from '../../src/panels/insights/subagentsModel'
import { countedText, programStrip, timeLine } from '../../src/panels/insights/timeSplitModel'
import Durations from '../../src/panels/insights/Durations'
import { durationLine, sessionStrip, sessionTimeRows, toolStrip } from '../../src/panels/insights/durationsModel'
import type { DurationBody } from '../../src/panels/insights/workModel'
import WorkPerInstruction from '../../src/panels/insights/WorkPerInstruction'
import { runStrip, trendPoints, trendTicks, waitRows, type AutonomyBody } from '../../src/panels/insights/autonomyModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const base = {
  range: { since: 1_700_000_000, until: 1_700_086_400 }, data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 },
  computed_at: 1_700_086_000,
}
const query = (view: string) => ({ view, kql: `// aictl view ${view}\nrequests | take 1`, kusto_url: 'https://c.kusto.windows.net/db' })
const order: RepoRef[] = [
  { repo: '/w/alpha', name: 'alpha', cost_usd: 300, requests: 900, sessions: 30 },
  { repo: '/w/beta', name: 'beta', cost_usd: 100, requests: 200, sessions: 5 },
]
const others = { repos: 2, cost_usd: 20, requests: 40, sessions: 4 }
const label = (tool: string) => tool

/** Segments of one bar: per repository its measures; shares are of the bar's whole. */
function split(rows: [string, Record<string, number>][]): RepoSegment[] {
  const total: Record<string, number> = {}
  for (const [, values] of rows) for (const [key, value] of Object.entries(values)) total[key] = (total[key] ?? 0) + value
  return rows.map(([repo, values]) => ({
    repo, name: repo ? repo.split('/').at(-1)! : null, ...values,
    share: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / total[key]])),
    of_repo: Object.fromEntries(Object.keys(values).map(key => [key, null])),
  }))
}
/** What an older server answers: no split and no ranking. */
function unsplit<T>(body: T): T {
  return JSON.parse(JSON.stringify(body, (key, value) => key === 'repos' && Array.isArray(value) && value.every(item => 'share' in item)
    ? undefined : key === 'repo_order' ? [] : key === 'repo_others' ? null : value)) as T
}

function context(state: DetailState<unknown>) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [], model: 'all' }), tools: () => [], openAgent() {},
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (data: unknown) => ({ ctx: context({ data, status: 'ready', error: null }), boxes: createBoxes('test-view-time'),
  since: base.range.since, until: base.range.until })
const rows = (chart: Element | null) => [...chart!.querySelectorAll('[data-row]')].map(row => row.getAttribute('data-row'))
const parts = (row: Element) => [...row.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-part'))
const written = (row: Element) => [...row.querySelectorAll('[data-part] button')].map(part => part.textContent)
const tip = (node: Element, selector: string) => node.querySelector(`${selector} [role="tooltip"]`)!.textContent
/** Clicks "Colour by: Repository" (or the view's own parts) and returns the address after it. */
function colourBy(box: Element, choice: 'parts' | 'repo') {
  box.querySelector<HTMLButtonElement>(`[data-colour-by] button:nth-child(${choice === 'repo' ? 2 : 1})`)!.click()
  flush()
  return location.search
}

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&view=x') })

describe('INS-VIEW · Colour by', () => {
  it('reads the choice from the address: by=repo, anything else the view\'s own parts', () => {
    expect(readColourBy('?view=time&by=repo')).toBe('repo')
    expect(readColourBy('?view=time&by=kind')).toBe('parts')
    expect(readColourBy('')).toBe('parts')
  })
})

// ─── Spend in subagents ──────────────────────────────────────────────────────────────────────────────────────────────
const H = 3_600_000
const subagents = {
  ...base, card: 'subagents', view: 'insights.subagents', query: query('insights.subagents'), repo_order: order, repo_others: others,
  tools: [
    { tool: 'tool-a', subagent_share: 0.6,
      main: { requests: 400, priced: 400, cost_usd: 40, repos: split([['/w/alpha', { requests: 300, cost_usd: 30 }], ['/w/beta', { requests: 100, cost_usd: 10 }]]) },
      subagents: { requests: 600, priced: 600, cost_usd: 60, agents: 12,
        repos: split([['/w/alpha', { requests: 500, cost_usd: 50 }], ['', { requests: 100, cost_usd: 10 }]]) } },
    { tool: 'tool-b', subagent_share: 0.2,
      main: { requests: 240, priced: 240, cost_usd: 8, repos: split([['/w/beta', { requests: 240, cost_usd: 8 }]]) },
      subagents: { requests: 60, priced: 60, cost_usd: 2, agents: 3, repos: split([['/w/beta', { requests: 60, cost_usd: 2 }]]) } },
  ],
  sessions: [
    { session_id: 's-one', node_id: 'n', tool: 'tool-a', title: 'Draft the parser', git_branch: 'feat/parse', agents: 5, requests: 200,
      cost_usd: 25, main_cost: 9, repos: split([['/w/alpha', { cost_usd: 25, requests: 200 }]]) },
    { session_id: 's-two', node_id: 'n', tool: 'tool-a', title: 'Tidy the tests', agents: 2, requests: 50, cost_usd: 40, main_cost: 4,
      repos: split([['', { cost_usd: 40, requests: 50 }]]) },
  ],
  summary: { main_cost_usd: 48, subagent_cost_usd: 62, subagent_share: 62 / 110, subagents: 15, subagent_requests: 660, unpriced_requests: 3 },
} as unknown as SubagentBody

describe('INS-VIEW · Spend in subagents', () => {
  it('says in one line what is measured, and keeps the headline share with its denominator', () => {
    const { host, dispose } = mount(() => <Subagents {...props(subagents)} />)
    const box = host.querySelector('#insight-subagents')!
    expect(box.querySelector('[data-finding]')!.textContent).toBe(subagentLine(subagents))
    expect(subagentLine(subagents)).toBe('Model requests per tool and their cost at list price (US dollars), split by who made them: ' +
      'a session\'s main agent or its subagents.')
    expect(box.querySelector('[data-hero]')!.textContent).toBe('56%of the cost at list price is in subagent requests: $62.00 of $110')
    expect(box.querySelector('[data-note]')!.textContent).toBe('Cost is list price, not a bill. 3 requests with no known cost are left ' +
      'out of the cost.')
    expect(subagentLine({ ...subagents, summary: { ...subagents.summary, subagents: 0 } })).toBe('No subagent ran in this period.')
    dispose()
  })

  it('draws one bar per tool by side, cost on one scale and requests as 100%, with every figure written', () => {
    const { host, dispose } = mount(() => <Subagents {...props(subagents)} />)
    const box = host.querySelector('#insight-subagents')!
    const cost = box.querySelector('[data-chart="subagent-cost"]')
    expect(rows(cost)).toEqual(['tool-a', 'tool-b'])
    const a = cost!.querySelector('[data-row="tool-a"]')!
    expect([parts(a), written(a), a.querySelector('[data-total]')!.textContent]).toEqual([['main', 'subagents'], ['$40.00', '$60.00'], '$100'])
    // tool-b's bar is a tenth of tool-a's on the shared scale.
    expect(cost!.querySelector<HTMLElement>('[data-row="tool-b"] [role="group"]')!.style.inlineSize).toBe('10.00%')
    expect(box.querySelector<HTMLElement>('[data-chart="subagent-requests"] [data-row="tool-b"] [role="group"]')!.style.inlineSize).toBe('100.00%')
    expect(tip(a, '[data-part="subagents"]')).toBe('tool-a, subagents (12 subagents): 600 requests (60% of 1,000; 600 priced), $60.00 at ' +
      'list price (60% of $100).')
    expect([...box.querySelectorAll('[data-side-legend] li')].map(item => item.textContent)).toEqual(['Main agent', 'Subagents'])
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    // Sessions ranked by subagent cost, named by title and branch, coloured as subagents.
    const sessions = box.querySelector('[data-chart="subagent-sessions"]')
    expect(rows(sessions)).toEqual(['s-two', 's-one'])
    expect(sessions!.querySelector('[data-row="s-one"] > span')!.firstChild!.textContent).toBe('tool-a · Draft the parser · on feat/parse')
    expect(tip(sessions!, '[data-row="s-one"] [data-part="cost"]')).toBe('Session Draft the parser (tool-a): 5 subagents made 200 requests ' +
      'costing $25.00 at list price; its main agent cost $9.00.')
    dispose()
  })

  it('switches every chart to the repositories and back, one legend at a time, and keeps the choice in the address', () => {
    const { host, dispose } = mount(() => <Subagents {...props(subagents)} />)
    const box = host.querySelector('#insight-subagents')!
    expect(colourBy(box, 'repo')).toContain('by=repo')
    expect(box.querySelector('[data-side-legend]')).toBeNull()
    expect([...box.querySelectorAll('[data-repo-legend] li')].map(item => item.textContent)).toEqual(['alpha', 'beta', 'Other repositories'])
    const cost = box.querySelector('[data-chart="subagent-cost"]')
    expect(rows(cost)).toEqual(['tool-a:main', 'tool-a:subagents', 'tool-b:main', 'tool-b:subagents'])
    const sub = cost!.querySelector('[data-row="tool-a:subagents"]')!
    expect([...sub.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', String(OTHER)])
    expect(tip(sub, '[data-part="repo:/w/alpha"]')).toBe('tool-a, subagents, cost — alpha (/w/alpha): $50.00 · 83% of this bar. ' +
      'tool-a, subagents (12 subagents): 600 requests (60% of 1,000; 600 priced), $60.00 at list price (60% of $100).')
    expect(box.querySelector('[data-chart="subagent-sessions"] [data-row="s-one"] [data-part]')!.getAttribute('data-repo')).toBe('0')
    expect(colourBy(box, 'parts')).not.toContain('by=')
    expect(parts(box.querySelector('[data-chart="subagent-cost"] [data-row="tool-a"]')!)).toEqual(['main', 'subagents'])
    dispose()
  })

  it('draws a side the answer did not split as one grey part, and draws without repos at all', () => {
    const half = { ...subagents, tools: [{ ...subagents.tools[0], main: { ...subagents.tools[0].main, repos: undefined } }] } as SubagentBody
    const main = sideRepoRows(half, label, 'cost')[0]
    expect(main.parts.map(part => [part.key, part.tone, part.text])).toEqual([['whole', 7, '$40.00']])
    expect(main.parts[0].hover).toMatch(/Not split by repository in this answer\.$/)
    expect(sideRows(half, label, 'requests')[0].total).toBe('1,000 requests')
    expect(sessionRows(half, label, 'repo').map(row => row.key)).toEqual(['s-two', 's-one'])
    history.replaceState(null, '', '/?screen=insights&view=subagents&by=repo')
    const { host, dispose } = mount(() => <Subagents {...props(unsplit(subagents))} />)
    const box = host.querySelector('#insight-subagents')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(rows(box.querySelector('[data-chart="subagent-cost"]'))).toEqual(['tool-a', 'tool-b'])
    expect(parts(box.querySelector('[data-chart="subagent-sessions"] [data-row="s-one"]')!)).toEqual(['cost'])
    dispose()
  })
})

// ─── Where the time goes ────────────────────────────────────────────────────────────────────────────────────────────
const timeSeg = (repo: string, model: number, tool: number): [string, Record<string, number>] =>
  [repo, { time_ms: model + tool, model_ms: model, tool_ms: tool }]
const time = {
  ...base, card: 'time', view: 'insights.time_split', query: query('insights.time_split'), repo_order: order, repo_others: others,
  tools: [
    { tool: 'tool-a', requests: 900, untimed_requests: 2, overlong_requests: 1, model_ms: 30 * H, thinking_ms: 6 * H, calls: 700,
      untimed_calls: 5, overlong_calls: 0, overlong_ms: 30 * H, tool_ms: 10 * H, time_ms: 40 * H,
      repos: split([timeSeg('/w/alpha', 20 * H, 8 * H), timeSeg('/w/beta', 10 * H, 2 * H)]) },
    { tool: 'tool-b', requests: 400, untimed_requests: 0, overlong_requests: 0, model_ms: 8 * H, thinking_ms: null, calls: 300,
      untimed_calls: 0, overlong_calls: 0, overlong_ms: 0, tool_ms: 2 * H, time_ms: 10 * H, repos: split([timeSeg('', 8 * H, 2 * H)]),
      reasoning_requests: 50, reasoning_tokens: 2_000, reasoning_output_tokens: 8_000, reasoning_share: 0.25 },
  ],
  programs: [
    { group: 'program', program: 'make', calls: 120, untimed: 0, overlong: 0, duration_ms: 5 * H, p50_ms: 30_000, p95_ms: 600_000,
      failure_share: 0.05, repos: split([['/w/alpha', { duration_ms: 4 * H }], ['', { duration_ms: H }]]) },
    { group: 'waiting', program: null, calls: 40, untimed: 0, overlong: 0, duration_ms: 2 * H, p50_ms: 120_000, p95_ms: 300_000,
      failure_share: 0 },
  ],
  summary: { model_ms: 38 * H, thinking_ms: 6 * H, tool_ms: 12 * H, thinking_reported: ['tool-a'], untimed_requests: 2, untimed_calls: 5,
    overlong: 1, overlong_ms: 30 * H, top_program: null },
  sessions: [],
} as unknown as TimeBody

describe('INS-VIEW · Where the time goes', () => {
  it('says in one line what is measured, and keeps what was not counted in one muted line', () => {
    const { host, dispose } = mount(() => <TimeSplit {...props(time)} />)
    const box = host.querySelector('#insight-time')!
    expect(box.querySelector('[data-finding]')!.textContent).toBe('Summed durations of model requests and tool calls (hours), per tool ' +
      'and per program a command call ran.')
    expect(box.querySelector('[data-counted]')!.textContent).toBe(countedText(time, label))
    expect(countedText(time, label)).toBe('Not counted: 2 requests and 5 calls without a recorded duration; 1 requests or calls ' +
      'recorded as over 24 hours (30 h in all). Thinking time not recorded by: tool-b.')
    expect(timeLine({ ...time, summary: { ...time.summary, model_ms: null, tool_ms: null } })).toBe('No request or tool call with a ' +
      'recorded duration in this period.')
    dispose()
  })

  it('draws one bar per tool by kind on one scale, the programs ranked, and their call durations on a strip', () => {
    const { host, dispose } = mount(() => <TimeSplit {...props(time)} />)
    const box = host.querySelector('#insight-time')!
    const tools = box.querySelector('[data-chart="time-tools"]')
    expect(rows(tools)).toEqual(['tool-a', 'tool-b'])
    const a = tools!.querySelector('[data-row="tool-a"]')!
    expect([parts(a), written(a), a.querySelector('[data-total]')!.textContent]).toEqual([['thinking', 'model', 'tools'], ['6 h', '24 h', '10 h'], '40 h'])
    expect(parts(tools!.querySelector('[data-row="tool-b"]')!)).toEqual(['model', 'tools'])
    expect(tip(a, '[data-part="tools"]')).toBe('tool-a, tool calls: 10 h, 25% of its summed 40 h (model 30 h + tool calls 10 h), over ' +
      '700 calls; 5 without a duration and 0 over 24 hours not counted.')
    const programs = box.querySelector('[data-chart="time-programs"]')
    expect(rows(programs)).toEqual(['program:make', 'waiting:'])
    expect(programs!.querySelector('[data-row="program:make"] [data-total]')!.textContent).toBe('5 h')
    const strip = programStrip(time)
    expect([strip.top, strip.end]).toEqual([600_000, '10 min'])
    const make = box.querySelector('[data-chart="time-program-calls"] [data-row="program:make"]')!
    expect(make.querySelector<HTMLElement>('[data-mark="p50"]')!.style.insetInlineStart).toBe('5%')
    expect(make.querySelector<HTMLElement>('[data-mark="p95"]')!.style.insetInlineStart).toBe('100%')
    expect(make.querySelector('[data-text]')!.textContent).toBe('median 30 s · p95 10 min')
    expect(tip(make, '[data-mark="p95"]')).toMatch(/^95th percentile call: 10 min \(1 call in 20 took longer\)\. make: 5 h summed over 120 calls/)
    expect(box.querySelector('[data-chart="time-program-calls"] [data-row="waiting:"]')!.hasAttribute('data-muted')).toBe(true)
    const reasoning = box.querySelector('[data-chart="time-reasoning"] [data-row="tool-b"]')!
    expect(written(reasoning)).toEqual(['2.0 k', '6.0 k'])
    dispose()
  })

  it('switches the tool and program bars to the repositories, with the repository legend only', () => {
    const { host, dispose } = mount(() => <TimeSplit {...props(time)} />)
    const box = host.querySelector('#insight-time')!
    expect(box.querySelector('[data-kind-legend]')).not.toBeNull()
    colourBy(box, 'repo')
    expect(box.querySelector('[data-kind-legend]')).toBeNull()
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    const a = box.querySelector('[data-chart="time-tools"] [data-row="tool-a"]')!
    expect([...a.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1'])
    expect(written(a)).toEqual(['28 h', '12 h'])
    const make = box.querySelector('[data-chart="time-programs"] [data-row="program:make"]')!
    expect([...make.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', String(OTHER)])
    // A row the answer did not split stays one grey part.
    expect(parts(box.querySelector('[data-chart="time-programs"] [data-row="waiting:"]')!)).toEqual(['time'])
    dispose()
  })

  it('draws without repos: no switch, the bars by kind', () => {
    history.replaceState(null, '', '/?screen=insights&view=time&by=repo')
    const { host, dispose } = mount(() => <TimeSplit {...props(unsplit(time))} />)
    const box = host.querySelector('#insight-time')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(parts(box.querySelector('[data-chart="time-tools"] [data-row="tool-a"]')!)).toEqual(['thinking', 'model', 'tools'])
    expect(rows(box.querySelector('[data-chart="time-program-calls"]'))).toEqual(['program:make', 'waiting:'])
    dispose()
  })
})

// ─── Where session time goes ────────────────────────────────────────────────────────────────────────────────────────
const sessionTimes = (scale: number) => ({
  sessions: 20, timed: 20, walled: 18, changed: 12, waits: 40, requests: 1000, calls: 3000, model_ms: 8 * scale * H, tool_ms: 2 * scale * H,
  agent_ms: 20 * scale * H, wait_ms: 5 * scale * H, p50_agent_ms: 600_000, p90_agent_ms: 2 * H, max_agent_ms: 4 * H, p50_wall_ms: 900_000,
  p90_wall_ms: 2 * H, max_wall_ms: 10 * H, p50_first_change_ms: 120_000, p90_first_change_ms: 600_000,
})
const ownSplit = (repo: string, scale: number) =>
  split([[repo, { agent_ms: 20 * scale * H, wait_ms: 5 * scale * H, model_ms: 8 * scale * H, tool_ms: 2 * scale * H }]])
const durations = {
  ...base, card: 'durations', view: 'insights.durations', query: query('insights.durations'), repo_order: order, repo_others: others,
  repos: [
    { ...sessionTimes(1), repo: '/w/alpha', name: 'alpha', kind: 'repository', agent_share: 0.8, small: false, repos: ownSplit('/w/alpha', 1) },
    { ...sessionTimes(0.25), repo: '/x/notes', name: 'notes', kind: 'folder', agent_share: 0.2, small: true, timed: 3,
      p50_agent_ms: null, p90_agent_ms: null, max_agent_ms: null, repos: ownSplit('', 0.25) },
  ],
  tools: [{ name: 'make', program: true, calls: 200, timed: 200, total_ms: 2 * H, p50_ms: 6_000, p95_ms: 120_000, failed: 4,
    failed_share: 0.02, repo: '/w/alpha', repo_name: 'alpha', repo_ms: 1.5 * H, small: false,
    repos: split([['/w/alpha', { total_ms: 1.5 * H }], ['/w/beta', { total_ms: 0.5 * H }]]) }],
  models: [{ model: 'model-x', requests: 1000, timed: 1000, total_ms: 10 * H, p50_ms: 9_000, p95_ms: 60_000, small: false,
    repos: split([['/w/alpha', { total_ms: 10 * H }]]) }],
  sessions: [],
  summary: { ...sessionTimes(1.25), agent_ms: 25 * H, model_ms: 10 * H, tool_ms: 2.5 * H, top: null, top_tool: null, slowest_tool: null,
    slowest_model: null, small: ['notes'] },
} as unknown as DurationBody

describe('INS-VIEW · Where session time goes', () => {
  it('says in one line what is measured, or why nothing is drawn', () => {
    const { host, dispose } = mount(() => <Durations {...props(durations)} />)
    expect(host.querySelector('#insight-durations [data-finding]')!.textContent).toBe('Agent working time and waiting time between ' +
      'turns per repository (hours), and the duration of model requests and tool calls, summed and per call.')
    expect(host.querySelector('#insight-durations [data-hero]')!.textContent).toBe('25 hof agent working time in 20 sessions with turn times')
    dispose()
    expect(durationLine({ ...durations, summary: { ...durations.summary, timed: 0, agent_ms: null } })).toBe('20 sessions in this ' +
      'period, but no tool recorded when their turns started and ended, so working time is not reported.')
  })

  it('draws working and waiting as one bar per repository on one scale, and the per-session figures on a strip', () => {
    const { host, dispose } = mount(() => <Durations {...props(durations)} />)
    const box = host.querySelector('#insight-durations')!
    const work = box.querySelector('[data-chart="work"]')
    expect(rows(work)).toEqual(['alpha', 'notes'])
    const alpha = work!.querySelector('[data-row="alpha"]')!
    expect([parts(alpha), written(alpha), alpha.querySelector('[data-total]')!.textContent]).toEqual([['working', 'waiting'], ['20 h', '5 h'], '25 h'])
    expect(work!.querySelector<HTMLElement>('[data-row="notes"] [role="group"]')!.style.inlineSize).toBe('25.00%')
    expect(tip(alpha, '[data-part="waiting"]')).toBe('alpha, waiting for a person between turns: 5 h over 40 waits; from the end ' +
      'of a turn to the next turn a person started.')
    // Too few sessions: the bar is grey and its hover says why.
    expect(sessionTimeRows(durations, 'parts')[1].parts.map(part => part.tone)).toEqual([7, 7])
    expect(rows(box.querySelector('[data-chart="model-tool"]'))).toEqual(['alpha', 'notes'])
    const strip = box.querySelector('[data-chart="session-range"] [data-row="alpha"]')!
    expect([...strip.querySelectorAll('[data-mark]')].map(mark => mark.getAttribute('data-mark'))).toEqual(['p50', 'p90', 'max'])
    expect(strip.querySelector<HTMLElement>('[data-mark="p90"]')!.style.insetInlineStart).toBe('50%')
    expect(tip(strip, '[data-mark="max"]')).toBe('Longest: 4 h. alpha: agent working time per session over 20 sessions with turn ' +
      'times; median 10 min, 90th percentile 2 h, longest 4 h.')
    expect(box.querySelector('[data-chart="session-range"] [data-row="notes"]')!.hasAttribute('data-muted')).toBe(true)
    expect(sessionStrip(durations, 'parts').end).toBe('4 h')
    expect(toolStrip(durations).rows[0].marks.map(mark => mark.text)).toEqual(['6 s', '2 min'])
    expect(rows(box.querySelector('[data-chart="tools"]'))).toEqual(['make'])
    expect(rows(box.querySelector('[data-chart="model-range"]'))).toEqual(['model-x'])
    dispose()
  })

  it('switches to the repositories: each repository row in its colour, waiting lighter, tools split by repository', () => {
    const { host, dispose } = mount(() => <Durations {...props(durations)} />)
    const box = host.querySelector('#insight-durations')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(colourBy(box, 'repo')).toContain('by=repo')
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    expect(box.querySelector('[data-chart="work"] ul')).toBeNull()
    const alpha = box.querySelector('[data-chart="work"] [data-row="alpha"]')!
    expect([...alpha.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '0'])
    expect(sessionTimeRows(durations, 'repo')[0].parts.map(part => part.light)).toEqual([false, true])
    expect(box.querySelector('[data-chart="session-range"] [data-row="notes"] [data-repo-mark]')!.getAttribute('data-repo-mark')).toBe(String(OTHER))
    expect([...box.querySelectorAll('[data-chart="tools"] [data-row="make"] [data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1'])
    colourBy(box, 'parts')
    expect(box.querySelector('[data-chart="work"] [data-row="alpha"] [data-part]')!.hasAttribute('data-repo')).toBe(false)
    dispose()
  })

  it('draws without repos: no switch, the bars by kind', () => {
    history.replaceState(null, '', '/?screen=insights&view=durations&by=repo')
    const { host, dispose } = mount(() => <Durations {...props(unsplit(durations))} />)
    const box = host.querySelector('#insight-durations')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(parts(box.querySelector('[data-chart="work"] [data-row="alpha"]')!)).toEqual(['working', 'waiting'])
    expect(parts(box.querySelector('[data-chart="tools"] [data-row="make"]')!)).toEqual(['time'])
    dispose()
  })
})

// ─── Work per instruction ───────────────────────────────────────────────────────────────────────────────────────────
const DAY = 86_400
const blank = { p50_longest: null, p90_longest: null, mean_longest: null, p50_multi: null, p90_multi: null, mean_multi: null,
  turns_answered: 0, waits: 0, queued: 0, p50_wait_s: null, over_5m: null, over_5m_share: null }
const tally = { active: 0, prompted: 0, scripted: 0, store_only: 0, start_unread: 0, no_calls: 0, unread: 0, unread_sessions: 0,
  instructions: 0, calls: 0, delegated: 0, one_instruction: 0, resumed: 0, no_stop: 0, sessions: 0, multi_sessions: 0 }
const runTool = (tool: string, sessions: number, multi: number, p50: number, p90: number, waits: number, over: number) => ({
  ...tally, ...blank, tool, reported: true, sessions, multi_sessions: multi, instructions: sessions * 3, calls: sessions * 40,
  one_instruction: sessions - multi, p50_longest: p50 - 2, p90_longest: p90 - 10, mean_longest: p50, p50_multi: p50, p90_multi: p90,
  mean_multi: p50 + 5, turns_answered: waits + 4, waits, queued: 3, p50_wait_s: 90, over_5m: over, over_5m_share: over / waits,
  repos: split([['/w/alpha', { waits: waits - 10, over_5m: over - 2 }], ['/w/beta', { waits: 10, over_5m: 2 }]]),
})
const trendBin = (tool: string, day: number, p50: number) => ({ ...blank, tool, bin_ts: 1_700_006_400 + day * DAY, sessions: 9,
  multi_sessions: 6, p50_longest: p50, p90_longest: p50 * 2, p50_multi: p50, p90_multi: p50 * 2 })
const autonomy = {
  ...base, card: 'autonomy', view: 'insights.work_per_instruction', query: query('insights.work_per_instruction'), repo_order: order,
  repo_others: others,
  tools: [runTool('tool-a', 40, 20, 30, 120, 60, 15), runTool('tool-b', 25, 12, 60, 90, 20, 10)],
  bins: [trendBin('tool-a', 0, 20), trendBin('tool-a', 1, 40), trendBin('tool-a', 3, 30)],
  bin_unit: 'day', prompts_from: null,
  summary: { lead: 'tool-a', sessions: 65, multi_sessions: 32, one_instruction: 33, not_reported: [] }, sessions: [],
} as unknown as AutonomyBody

describe('INS-VIEW · Work per instruction', () => {
  it('says in one line what is measured, with no headline number', () => {
    const { host, dispose } = mount(() => <WorkPerInstruction {...props(autonomy)} />)
    const box = host.querySelector('#insight-autonomy')!
    expect(box.querySelector('[data-finding]')!.textContent).toBe('Per session, the longest run of main-agent tool calls between two ' +
      'turns of a person (tool calls); per tool, the answered waits for a person, split at 5 minutes.')
    expect(box.querySelector('[data-hero]')).toBeNull()
    dispose()
  })

  it('draws the runs on one strip, the waits as 100% bars and the trend with its bins named', () => {
    const { host, dispose } = mount(() => <WorkPerInstruction {...props(autonomy)} />)
    const box = host.querySelector('#insight-autonomy')!
    const strip = box.querySelector('[data-chart="autonomy-runs"]')
    expect(rows(strip)).toEqual(['tool-a', 'tool-b'])
    expect(runStrip(autonomy, label).top).toBe(120)
    const b = strip!.querySelector('[data-row="tool-b"]')!
    expect(b.querySelector<HTMLElement>('[data-mark="median"]')!.style.insetInlineStart).toBe('50%')
    expect(b.querySelector('[data-text]')!.textContent).toBe('median 60 · p90 90')
    expect(tip(b, '[data-mark="p90"]')).toMatch(/^90th percentile: 90 tool calls\. tool-b: longest run of main-agent tool calls/)
    expect(tip(b, '[data-mark="p90"]')).toContain('13.3 tool calls per instruction · 75 instructions in 25 sessions')
    const waits = box.querySelector('[data-chart="autonomy-waits"]')
    expect(rows(waits)).toEqual(['tool-a', 'tool-b'])
    const a = waits!.querySelector('[data-row="tool-a"]')!
    expect([parts(a), written(a), a.querySelector('[data-total]')!.textContent]).toEqual([['under', 'over'], ['45 · 75%', '15 · 25%'],
      'median wait 1 min 30 s'])
    expect(tip(a, '[data-part="under"]')).toMatch(/^tool-a: 45 of 60 answered waits \(75%\) ended within 5 minutes\./)
    const trend = box.querySelector('[data-trend="tool-a"]')!
    expect([...trend.querySelectorAll('[data-point] [data-value]')].map(value => value.textContent)).toEqual(['20', '40', '30'])
    expect(trendPoints(autonomy, 'tool-a').points.map(point => [point.x, point.y])).toEqual([[0, 0.5], [1 / 3, 1], [1, 0.75]])
    expect(tip(trend, `[data-point="${1_700_006_400 + DAY}"]`)).toMatch(/^Nov 16 \(UTC day\): median 40, 90th percentile 80 tool calls/)
    expect(trendTicks(trendPoints(autonomy, 'tool-a').points)).toHaveLength(3)
    expect(box.querySelector('[data-trend="tool-b"] [data-no-trend]')).not.toBeNull()
    dispose()
  })

  it('switches the waits to the repositories and back; the run strip stays whole', () => {
    const { host, dispose } = mount(() => <WorkPerInstruction {...props(autonomy)} />)
    const box = host.querySelector('#insight-autonomy')!
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(colourBy(box, 'repo')).toContain('by=repo')
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    const a = box.querySelector('[data-chart="autonomy-waits"] [data-row="tool-a"]')!
    expect([...a.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', '1'])
    expect(a.querySelector('[data-total]')!.textContent).toBe('60 · 15 over 5 min')
    expect(box.querySelectorAll('[data-chart="autonomy-runs"] [data-mark]').length).toBe(4)
    colourBy(box, 'parts')
    expect(parts(box.querySelector('[data-chart="autonomy-waits"] [data-row="tool-a"]')!)).toEqual(['under', 'over'])
    dispose()
  })

  it('draws without repos, and keeps a tool the answer did not split as one grey part', () => {
    const half = { ...autonomy, tools: [autonomy.tools[0], { ...autonomy.tools[1], repos: undefined }] } as AutonomyBody
    expect(waitRows(half, label, 'repo')[1].parts.map(part => [part.key, part.tone])).toEqual([['whole', 7]])
    history.replaceState(null, '', '/?screen=insights&view=autonomy&by=repo')
    const { host, dispose } = mount(() => <WorkPerInstruction {...props(unsplit(autonomy))} />)
    const box = host.querySelector('#insight-autonomy')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(parts(box.querySelector('[data-chart="autonomy-waits"] [data-row="tool-a"]')!)).toEqual(['under', 'over'])
    dispose()
  })
})
