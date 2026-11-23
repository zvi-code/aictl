// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import AfterFailure from '../../src/panels/insights/AfterFailure'
import ContextCarry from '../../src/panels/insights/ContextCarry'
import PauseTax from '../../src/panels/insights/PauseTax'
import Rereads from '../../src/panels/insights/Rereads'
import Subagents from '../../src/panels/insights/Subagents'
import TimeSplit from '../../src/panels/insights/TimeSplit'
import { fmtHours } from '../../src/design/format'
import {
  carryFinding, failureFinding, flowBands, insightWindow, learnToolLabels, pauseFinding, toolLabel, rereadFinding, subagentFinding,
  timeFinding, type CarryBody, type FailureBody, type InsightBody, type PauseBody, type RereadBody, type SubagentBody,
  type TimeBody,
} from '../../src/panels/insights/insightsModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { drawerPatch, nextAddress } from '../../src/shell/viewState'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const base = {
  view: 'insights.x', range: { since: 1_700_000_000, until: 1_700_086_400 },
  data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 }, computed_at: 1_700_086_000,
  query: { view: 'insights.x', kql: '// aictl view insights.x\nrequests | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
}
const cell = (bucket: string, requests: number, avg: number | null, hit: number | null) =>
  ({ bucket, requests, priced: requests, cache_hit_share: hit, avg_cost_usd: avg, cost_usd: avg == null ? null : avg * requests })
const pause = {
  ...base, card: 'pause',
  tools: [
    { tool: 'claude-code', cache_reported: true, buckets: [cell('under_1m', 1000, 0.12, 0.95), cell('1_5m', 50, 0.2, 0.9),
      cell('5_60m', 20, 0.66, 0.5), cell('over_60m', 5, 3.71, 0.1)] },
    { tool: 'copilot-vscode', cache_reported: false, buckets: [cell('under_1m', 10, 0.3, null), cell('1_5m', 2, 0.3, null),
      cell('5_60m', 1, 0.4, null), cell('over_60m', 1, 0.4, null)] },
  ],
  summary: { tools: ['claude-code'], requests: 25, cost_usd: 31.75, baseline_usd: 3, extra_usd: 28.75, not_reported: ['copilot-vscode'] },
  sessions: [{ session_id: 's-pause', node_id: 'n', tool: 'claude-code', requests: 25, cost_usd: 31.75 }],
} as unknown as PauseBody
const carry = {
  ...base, card: 'carry',
  tool_names: [{ tool: 'claude-code', tool_name: 'Bash', calls: 10, output_bytes: 457_000_000, carried_bytes: 74e9, avg_later_requests: 162 }],
  tools: [{ tool: 'claude-code', calls: 10, reported: 10, output_bytes: 457_000_000, carried_bytes: 74e9 },
    { tool: 'codex-cli', calls: 4, reported: 0, output_bytes: null, carried_bytes: null }],
  summary: { output_bytes: 457_000_000, carried_bytes: 74e9,
    top: { tool: 'claude-code', tool_name: 'Bash', calls: 10, output_bytes: 457_000_000, carried_bytes: 74e9, avg_later_requests: 162 },
    not_reported: ['codex-cli'] },
  sessions: [],
} as unknown as CarryBody
const subagents = {
  ...base, card: 'subagents',
  tools: [{ tool: 'claude-code', main: { requests: 10, priced: 10, cost_usd: 37 }, subagents: { requests: 30, priced: 30, cost_usd: 63, agents: 4 }, subagent_share: 0.63 },
    { tool: 'codex-cli', main: { requests: 3, priced: 0, cost_usd: null }, subagents: { requests: 0, priced: 0, cost_usd: null, agents: 0 }, subagent_share: null }],
  summary: { main_cost_usd: 37, subagent_cost_usd: 63, subagent_share: 0.63, subagents: 4, subagent_requests: 30 },
  sessions: [{ session_id: 's-sub', node_id: 'n', tool: 'claude-code', requests: 30, cost_usd: 63, main_cost: 37, agents: 4 }],
} as unknown as SubagentBody
const outcomes = { identical_failed: 1233, identical_succeeded: 400, changed_failed: 300, changed_succeeded: 2000, other_tool: 1000 }
const failures = {
  ...base, card: 'failures',
  tools: [{ tool: 'claude-code', calls: 9000, failures: 5000, last_failures: 67, outcomes, streaks: 71, streak_calls: 245, longest: 8 }],
  summary: { failures: 5000, followed: 4933, ...outcomes, streaks: 71, streak_calls: 245, longest: 8 },
  sessions: [{ session_id: 's-fail', node_id: 'n', tool: 'claude-code', longest: 8, streaks: 2, streak_calls: 11 }],
} as unknown as FailureBody
const rereads = {
  ...base, card: 'rereads',
  tools: [{ tool: 'copilot-cli', reads: 100, repeat_reads: 42, repeat_share: 0.42, files: 58, files_5plus: 3, most_reads: 9, repeat_bytes: null, unmatched: 0 }],
  summary: { reads: 100, repeat_reads: 42, repeat_share: 0.42, files_5plus: 3, repeat_bytes: null, unmatched: 0 },
  sessions: [],
} as unknown as RereadBody
const H = 3_600_000
const time = {
  ...base, card: 'time',
  tools: [
    { tool: 'claude-code', requests: 100, untimed_requests: 0, overlong_requests: 0, model_ms: 732 * H, thinking_ms: 175 * H,
      calls: 200, untimed_calls: 4, overlong_calls: 3, overlong_ms: 815 * H, tool_ms: 377 * H },
    { tool: 'copilot-cli', requests: 50, untimed_requests: 0, overlong_requests: 0, model_ms: 450 * H, thinking_ms: null,
      calls: 60, untimed_calls: 0, overlong_calls: 0, overlong_ms: 0, tool_ms: 152 * H },
    { tool: 'codex-cli', requests: 3, untimed_requests: 3, overlong_requests: 0, model_ms: null, thinking_ms: null,
      calls: 0, untimed_calls: 0, overlong_calls: 0, overlong_ms: 0, tool_ms: null },
  ],
  programs: [
    { group: 'shell', program: null, calls: 24000, untimed: 0, overlong: 1, duration_ms: 89 * H, p50_ms: 997, p95_ms: 46_400, failure_share: 0.065 },
    { group: 'program', program: 'cargo', calls: 5812, untimed: 0, overlong: 0, duration_ms: 63.4 * H, p50_ms: 8372, p95_ms: 175_864, failure_share: 0.009 },
    { group: 'waiting', program: null, calls: 3367, untimed: 0, overlong: 0, duration_ms: 56 * H, p50_ms: 3440, p95_ms: 385_259, failure_share: 0.13 },
  ],
  summary: { model_ms: 1182 * H, thinking_ms: 175 * H, tool_ms: 529 * H, thinking_reported: ['claude-code'], untimed_requests: 3,
    untimed_calls: 4, overlong: 3, overlong_ms: 815 * H,
    top_program: { group: 'program', program: 'cargo', calls: 5812, untimed: 0, overlong: 0, duration_ms: 63.4 * H, p50_ms: 8372, p95_ms: 175_864, failure_share: 0.009 } },
  sessions: [{ session_id: 's-time', node_id: 'n', tool: 'claude-code', tool_ms: 78 * H, calls: 36000, model_ms: 96 * H, requests: 34000 }],
} as unknown as TimeBody
const bodies: Record<string, InsightBody> = { pause, carry, subagents, failures, rereads, time }

type State = DetailState<unknown> | undefined
function context(states: (card: string) => State, opened: string[] = []) {
  const requested: string[] = []
  const ctx = {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    openAgent(id: string, tab = 'flow') {
      opened.push(`${id}:${tab}`)
      history.pushState(null, '', nextAddress(drawerPatch({ type: 'agent', id, tab })))
    },
    detail: (path: () => string | undefined) => {
      const read = () => {
        const value = path()
        if (!value) return undefined
        requested.push(value)
        return states(/insights\/(\w+)/.exec(value)![1])
      }
      return Object.assign(read, { retry() {} })
    },
  } as unknown as PanelContext
  return { ctx, requested }
}
const ready = (card: string): State => ({ data: bodies[card], status: 'ready', error: null })
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-insights'), since: base.range.since, until: base.range.until })
const card = (host: Element, id: string) => host.querySelector(`[data-box="insight-${id}"]`)!

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('INS-01 · Each card states its finding from the numbers of its own response', () => {
  it('builds every sentence from the summary and never reads a missing figure as zero', () => {
    const label = (tool: string) => tool
    expect(pauseFinding(pause, label)).toBe('25 claude-code requests followed a pause of over 5 minutes and cost $31.75 at list price; ' +
      "the same number at each tool's under-1-minute average would cost $3.00.")
    expect(carryFinding(carry, label)).toContain('up to 74 GB in all; Bash (claude-code) alone produced 457 MB')
    expect(subagentFinding(subagents, label)).toBe('4 subagents made 30 requests costing $63.00 at list price, 63% of all cost; ' +
      'in claude-code, subagents were 63% of its cost.')
    expect(failureFinding(failures, label)).toContain('and it failed again 1,233 times (claude-code 1,233)')
    expect(rereadFinding(rereads)).toContain('42% of file reads (42 of 100)')
    expect(rereadFinding(rereads)).toContain('the repeated reads returned not reported')
    const unreported = { ...pause, tools: [pause.tools[1]], summary: { ...pause.summary, tools: [], requests: 0, cost_usd: null } }
    expect(pauseFinding(unreported, label)).toContain('do not report cache writes (copilot-vscode)')
  })

  it('renders each card with its sentence, its visual, its KQL and its period', () => {
    const { ctx, requested } = context(ready)
    const { host, dispose } = mount(() => <>
      <PauseTax {...props(ctx)} /><ContextCarry {...props(ctx)} /><Subagents {...props(ctx)} />
      <AfterFailure {...props(ctx)} /><Rereads {...props(ctx)} /><TimeSplit {...props(ctx)} />
    </>)
    for (const id of Object.keys(bodies)) {
      const box = card(host, id)
      expect(box.querySelector('[data-finding]')?.textContent?.length, id).toBeGreaterThan(20)
      expect(box.querySelector('[data-period]')?.textContent, id).toMatch(/^Period: .* · computed at /)
      expect(box.textContent, id).toContain('Show KQL (insights.x)')
      expect(box.querySelector('a[href^="https://c.kusto.windows.net/db?"]'), id).not.toBeNull()
    }
    expect(new Set(requested.map(path => path.split('?')[0]))).toEqual(new Set(Object.keys(bodies).map(id => `/api/board/insights/${id}`)))
    expect(requested[0]).toContain(`since=${base.range.since}&until=${base.range.until}`)
    // Pause: one chart per tool with the cache limit; the tool without cache writes says so.
    const pauseBox = card(host, 'pause')
    expect(pauseBox.querySelectorAll('svg[role="img"]')).toHaveLength(2)
    expect(pauseBox.textContent).toContain('5 min: cache lapses')
    expect(pauseBox.textContent).toContain('copilot-vscode · cache not reported')
    expect(pauseBox.textContent).toContain('$3.71')
    // Carry: a produced and a carried bar per tool name; a tool without sizes is named, not drawn as zero.
    const carryBox = card(host, 'carry')
    expect(carryBox.textContent).toContain('457 MB')
    expect(carryBox.textContent).toContain('74 GB')
    expect(carryBox.textContent).toContain('Result size not reported by: codex-cli.')
    expect(carryBox.textContent).toContain('upper bound')
    // Subagents: a split bar; an unpriced tool says not reported.
    const subBox = card(host, 'subagents')
    expect(subBox.querySelector('[aria-label="claude-code: main agent $37.00, subagents $63.00"]')).not.toBeNull()
    expect(subBox.textContent).toContain('main not reported')
    // Failures: a flow with one band per outcome that has calls.
    const flow = card(host, 'failures')
    expect(flow.querySelectorAll('svg[role="img"] path')).toHaveLength(5)
    expect(flow.textContent).toContain('Same call, failed again · 1,233')
    // Rereads: bytes not reported stays not reported.
    expect(card(host, 'rereads').textContent).toContain('42% repeated · not reported returned again')
    dispose()
  })
})

describe('INS-02 · A card loads and fails on its own', () => {
  it('shows loading on one card and an error on another while the others are ready', () => {
    const { ctx } = context(id => id === 'carry' ? { data: undefined, status: 'loading', error: null }
      : id === 'failures' ? { data: undefined, status: 'error', error: new Error('Kusto view insights.after_failure failed') } : ready(id))
    const { host, dispose } = mount(() => <>
      <PauseTax {...props(ctx)} /><ContextCarry {...props(ctx)} /><Subagents {...props(ctx)} />
      <AfterFailure {...props(ctx)} /><Rereads {...props(ctx)} />
    </>)
    expect(card(host, 'carry').textContent).toContain('Waiting for the Context carry query')
    expect(card(host, 'carry').querySelector('[data-finding]')).toBeNull()
    expect(card(host, 'failures').textContent).toContain('Could not load After a failure: Kusto view insights.after_failure failed')
    for (const id of ['pause', 'subagents', 'rereads']) expect(card(host, id).querySelector('[data-finding]'), id).not.toBeNull()
    dispose()
  })
})

describe('INS-03 · Open sessions opens the drawer for a listed session', () => {
  it('writes the agent and the tab of the card to the URL', () => {
    const opened: string[] = []
    const { ctx } = context(ready, opened)
    const { host, dispose } = mount(() => <AfterFailure {...props(ctx)} />)
    const sessions = host.querySelector<HTMLDetailsElement>('[data-sessions]')!
    expect(sessions.querySelector('summary')?.textContent).toBe('Open sessions (1)')
    sessions.open = true
    flush()
    host.querySelector<HTMLButtonElement>('button[aria-label="Open session s-fail"]')!.click()
    flush()
    expect(opened).toEqual(['s-fail:errors'])
    const url = new URLSearchParams(location.search)
    expect([url.get('agent'), url.get('tab'), url.get('screen')]).toEqual(['s-fail', 'errors', 'insights'])
    dispose()
  })
})

describe('INS-04 · The period and the flow geometry', () => {
  it('names a tool by the label the answer carried, and by its id until one arrives', () => {
    expect(toolLabel('invented-tool')).toBe('invented-tool')
    learnToolLabels({ 'invented-tool': 'Invented Tool' })
    flush()
    expect(toolLabel('invented-tool')).toBe('Invented Tool')
    expect(pauseFinding({ ...pause, tools: pause.tools.map(tool => ({ ...tool, tool: 'invented-tool' })),
      summary: { ...pause.summary, tools: ['invented-tool'] } } as PauseBody, toolLabel)).toContain('Invented Tool requests')
  })

  it('reads all history or the board range from the URL key range', () => {
    expect(insightWindow('?range=all', 1000)).toEqual({ id: 'all', since: 0, until: 3600 })
    const day = insightWindow('?range=24h', 86_400 * 10)
    expect([day.id, day.until - day.since]).toEqual(['24h', 86_400])
    expect(insightWindow('', 86_400 * 10).id).toBe('24h')
  })

  it('gives each outcome the same thickness on both sides and keeps labels apart', () => {
    const bands = flowBands({ identical_failed: 1, identical_succeeded: 0, changed_failed: 1, changed_succeeded: 98, other_tool: 0 }, 0, 100)
    expect(bands.map(band => band.outcome)).toEqual(['identical_failed', 'changed_failed', 'changed_succeeded'])
    for (const band of bands) expect(band.left[1] - band.left[0]).toBeCloseTo(band.right[1] - band.right[0])
    expect(bands[1].labelY - bands[0].labelY).toBeGreaterThanOrEqual(13)
    expect(flowBands({ identical_failed: 0, identical_succeeded: 0, changed_failed: 0, changed_succeeded: 0, other_tool: 0 }, 0, 100)).toEqual([])
  })
})

describe('INS-05 · Where the time goes', () => {
  it('states model against tool time, the thinking inside it and the program with the most time', () => {
    expect(timeFinding(time, tool => tool)).toBe('Agents spent 1,182 h in model requests and 529 h in their own tool calls (summed durations); ' +
      'claude-code: 732 h model (175 h of it thinking) against 377 h tools. The program with the most time is cargo: ' +
      '63.4 h over 5,812 calls, 95th percentile 2 min 56 s.')
    const unreported = { ...time, tools: [time.tools[1]] } as TimeBody
    expect(timeFinding(unreported, tool => tool)).toContain('copilot-cli: 450 h model (thinking not reported) against 152 h tools')
    const empty = { ...time, tools: [], programs: [], summary: { ...time.summary, model_ms: null, tool_ms: null, top_program: null } } as TimeBody
    expect(timeFinding(empty, tool => tool)).toBe('No request or tool call with a recorded duration in this period.')
  })

  it('draws one split bar per tool, the program rows with their p95, and says what was not counted', () => {
    const { ctx } = context(ready)
    const { host, dispose } = mount(() => <TimeSplit {...props(ctx)} />)
    const box = card(host, 'time')
    expect(box.querySelectorAll('[role="img"]')).toHaveLength(3)
    expect(box.querySelector('[aria-label="claude-code: model 732 h, thinking 175 h, tool calls 377 h"]')).not.toBeNull()
    // A tool that reports no thinking and a tool with no durations are named, not drawn as zero.
    expect(box.querySelector('[aria-label="copilot-cli: model 450 h, thinking not reported, tool calls 152 h"]')).not.toBeNull()
    expect(box.querySelector('[aria-label="codex-cli: model not reported, thinking not reported, tool calls not reported"]')).not.toBeNull()
    const rows = [...box.querySelectorAll('[data-group]')].map(row => row.getAttribute('data-group'))
    expect(rows).toEqual(['shell', 'program', 'waiting'])
    expect(box.textContent).toContain('Shell construct, program not identified')
    expect(box.textContent).toContain('Waiting or polling (sleep, until, while, wait)')
    expect(box.textContent).toContain('63.4 h · median 8.4 s · p95 2 min 56 s')
    const counted = box.querySelector('[data-counted]')!.textContent!
    expect(counted).toContain('Without a recorded duration: 3 requests and 4 calls.')
    expect(counted).toContain('3 requests or calls recorded as over 24 hours (815 h in all)')
    expect(counted).toContain('Thinking not reported by: copilot-cli, codex-cli.')
    dispose()
  })

  it('keeps its own loading and error state', () => {
    const { ctx } = context(id => id === 'time' ? { data: undefined, status: 'error', error: new Error('Kusto view insights.time_split failed') } : ready(id))
    const { host, dispose } = mount(() => <><TimeSplit {...props(ctx)} /><Rereads {...props(ctx)} /></>)
    expect(card(host, 'time').textContent).toContain('Could not load Where the time goes: Kusto view insights.time_split failed')
    expect(card(host, 'rereads').querySelector('[data-finding]')).not.toBeNull()
    dispose()
    const loading = context(id => id === 'time' ? { data: undefined, status: 'loading', error: null } : ready(id))
    const second = mount(() => <TimeSplit {...props(loading.ctx)} />)
    expect(card(second.host, 'time').textContent).toContain('Waiting for the Where the time goes query')
    second.dispose()
  })

  it('shows summed time in hours, never in days', () => {
    expect(fmtHours(732 * H)).toBe('732 h')
    expect(fmtHours(1200 * H)).toBe('1,200 h')
    expect(fmtHours(63.44 * H)).toBe('63.4 h')
    expect(fmtHours(30 * 60_000)).toBe('30 min')
    expect(fmtHours(null)).toBe('n/a')
  })
})
