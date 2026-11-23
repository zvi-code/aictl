// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import AfterFailure from '../../src/panels/insights/AfterFailure'
import ContextCarry from '../../src/panels/insights/ContextCarry'
import PauseTax from '../../src/panels/insights/PauseTax'
import Rereads from '../../src/panels/insights/Rereads'
import Subagents from '../../src/panels/insights/Subagents'
import TimeSplit from '../../src/panels/insights/TimeSplit'
import ContextWeight from '../../src/panels/insights/ContextWeight'
import Orientation from '../../src/panels/insights/Orientation'
import FixedContext from '../../src/panels/insights/FixedContext'
import ProblemSessions from '../../src/panels/insights/ProblemSessions'
import { fmtHours } from '../../src/design/format'
import {
  carryFinding, failureFinding, flowBands, insightWindow, learnToolLabels, pauseFinding, toolLabel, rereadFinding, subagentFinding,
  contextFinding, fixedFinding, fixedHero, orientationFinding, problemFinding, problemHero, timeFinding, type FixedBody,
  type ProblemBody, type CarryBody, type ContextBody, type OrientationBody, type FailureBody, type InsightBody, type PauseBody, type RereadBody, type SubagentBody,
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
const ctxCell = (bucket: string, requests: number, cost: number | null, reported: number, total: number | null) =>
  ({ bucket, requests, priced: cost == null ? 0 : requests, cost_usd: cost, request_share: requests / reported, cost_share: cost == null || !total ? null : cost / total })
const contextBody = {
  ...base, card: 'context',
  tools: [
    { tool: 'claude-code', requests: 1000, reported: 1000, p50_context: 193_526, p90_context: 416_710, cost_usd: 100,
      buckets: [ctxCell('under_50k', 30, 1, 1000, 100), ctxCell('50_100k', 150, 7, 1000, 100), ctxCell('100_200k', 340, 23, 1000, 100),
        ctxCell('200_500k', 430, 52, 1000, 100), ctxCell('over_500k', 50, 17, 1000, 100)],
      heavy_requests: 480, heavy_cost_usd: 69, small_requests: 150, small_cost_usd: 14.6 },
    { tool: 'codex-cli', requests: 83, reported: 0, p50_context: null, p90_context: null, cost_usd: null,
      buckets: ['under_50k', '50_100k', '100_200k', '200_500k', 'over_500k'].map(bucket => ({ bucket, requests: 0, priced: 0, cost_usd: null, request_share: null, cost_share: null })),
      heavy_requests: 0, heavy_cost_usd: null, small_requests: null, small_cost_usd: null },
  ],
  summary: { reported: 1000, heavy_requests: 480, heavy_share: 0.48, cost_usd: 100, heavy_cost_usd: 69, heavy_cost_share: 0.69,
    small_requests: 150, small_cost_usd: 14.6, not_reported: ['codex-cli'] },
  sessions: [{ session_id: 's-ctx', node_id: 'n', tool: 'claude-code', requests: 300, cost_usd: 40 }],
} as unknown as ContextBody
const orientation = {
  ...base, card: 'orientation',
  projects: [
    { project_path: '/work/alpha', sessions: 89, tools: ['copilot-cli'], p50_requests: 4, p50_cost_usd: 0.21 },
    { project_path: '/work/beta/', sessions: 22, tools: ['claude-code', 'copilot-vscode'], p50_requests: 35, p50_cost_usd: null },
  ],
  tools: [
    { tool: 'claude-code', sessions: 378, edited: 106, no_project: 0, p50_requests: 16, never: 272, never_requests: 2207, never_cost_usd: 159.47 },
    { tool: 'codex-cli', sessions: 1, edited: 0, no_project: 0, p50_requests: null, never: 1, never_requests: 83, never_cost_usd: null },
  ],
  summary: { sessions: 379, edited: 106, projects: 2, never: 273, never_cost_usd: 159.47, no_project: 0 },
  sessions: [{ session_id: 's-orient', node_id: 'n', tool: 'claude-code', requests: 399, before_cost: 86.64 }],
} as unknown as OrientationBody
const kinds = (found: Record<string, [number, number, number, number]>, sessions: number) =>
  ['instruction_file', 'memory_file', 'system_prompt_other', 'skills', 'mcp_instructions', 'custom_agents', 'tools_listed'].map(kind => {
    const cell = found[kind]
    return cell ? { kind, reported: true, sessions: cell[0], session_share: cell[0] / sessions, p50_tokens: cell[1], avg_tokens: cell[2],
      p50_items: cell[3], estimated: true }
      : { kind, reported: false, sessions: null, session_share: null, p50_tokens: null, avg_tokens: null, p50_items: null, estimated: false }
  })
const fixed = {
  ...base, card: 'fixed',
  tools: [
    { tool: 'copilot-desktop', sessions: 362, p50_tokens: 51_176, p90_tokens: 53_552, avg_tokens: 50_292, p50_skills: null, estimated: true,
      kinds: kinds({ instruction_file: [362, 37_677, 36_772, 2], system_prompt_other: [362, 13_499, 13_520, 25] }, 362) },
    { tool: 'claude-code', sessions: 364, p50_tokens: 7260, p90_tokens: 16_715, avg_tokens: 9109, p50_skills: 63, estimated: true,
      kinds: kinds({ memory_file: [198, 3530, 1767, 3], skills: [247, 6215, 3721, 63], mcp_instructions: [348, 1856, 1576, 3],
        custom_agents: [251, 1748, 1115, 14], tools_listed: [253, 1583, 931, 171] }, 364) },
  ],
  skills: [
    { tool: 'claude-code', listed: 135, used: 22, listing_tokens: 1_354_622, unused_tokens: 980_051, uses: 57, skills_used: 23, triggers: ['agent-invoked'] },
    { tool: 'copilot-cli', listed: null, used: null, listing_tokens: null, unused_tokens: null, uses: 1885, skills_used: 35, triggers: ['context-load'] },
  ],
  top_skills: [{ tool: 'claude-code', name: 'dataviz', sessions: 237, tokens: 82_830, uses: 5 },
    { tool: 'claude-code', name: 'office:xlsx', sessions: 242, tokens: 50_188, uses: 0 }],
  files: [{ tool: 'copilot-desktop', file: 'CLAUDE.md', sessions: 357, loads: 357, avg_tokens: 29_617, max_tokens: 31_961, tokens: 10_573_400 }],
  summary: { sessions: 726, heaviest: { tool: 'copilot-desktop', p50_tokens: 51_176 }, listed: 135, never_used: 113, never_used_share: 113 / 135,
    listing_tokens: 1_354_622, unused_tokens: 980_051, listing_not_reported: ['copilot-cli'] },
  sessions: [{ session_id: 's-fixed', node_id: 'n', tool: 'copilot-desktop', tokens: 53_971, skills: 0 }],
} as unknown as FixedBody
const signalCells = (found: Record<string, [number, number, number]>) =>
  ['compaction', 'failure_streak', 'failed_delegation', 'api_error', 'open_todos', 'hook_failure'].map(signal => {
    const cell = found[signal]
    return cell ? { signal, reported: true, sessions: cell[0], share: cell[1], cost_usd: cell[2] }
      : { signal, reported: false, sessions: null, share: null, cost_usd: null }
  })
const problems = {
  ...base, card: 'problems',
  tools: [
    { tool: 'copilot-cli', sessions: 2159, reports: true, flagged: 802, multi: 683, flagged_cost_usd: 6014.21, cost_usd: 16_304.07,
      signals: signalCells({ compaction: [48, 0.022, 344.6], failure_streak: [742, 0.344, 1591.4], failed_delegation: [428, 0.198, 1399.9],
        open_todos: [15, 0.007, 4198.4], hook_failure: [675, 0.313, 463.6] }) },
    { tool: 'claude-code', sessions: 378, reports: true, flagged: 66, multi: 26, flagged_cost_usd: 29_947.3, cost_usd: 31_759.24,
      signals: signalCells({ compaction: [20, 0.053, 19_457.6], failure_streak: [39, 0.103, 23_122], failed_delegation: [9, 0.024, 7974.9],
        api_error: [32, 0.085, 21_599.6], hook_failure: [0, 0, 0] }) },
    { tool: 'codex-cli', sessions: 1, reports: false, flagged: null, multi: null, flagged_cost_usd: null, cost_usd: 0, signals: signalCells({}) },
  ],
  signals: [],
  pairs: [{ signals: ['failure_streak', 'hook_failure'], sessions: 670, cost_usd: 437.7 },
    { signals: ['failed_delegation', 'failure_streak'], sessions: 430, cost_usd: null }],
  projects: [{ project: 'alpha', sessions: 673, all_sessions: 836, tools: ['copilot-cli'], cost_usd: 632.02 }],
  summary: { sessions: 2537, flagged: 868, flagged_share: 868 / 2537, multi: 709, flagged_cost_usd: 35_961.51, not_reporting: ['codex-cli'] },
  sessions: [{ session_id: 's-prob', node_id: 'n', tool: 'claude-code', signals: 3, names: ['compaction', 'failure_streak', 'api_error'],
    project_name: 'alpha', cost_usd: 1200 }],
} as unknown as ProblemBody
const bodies: Record<string, InsightBody> = { pause, carry, subagents, failures, rereads, time, context: contextBody, orientation, fixed, problems }

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

  it('says next to each cost how many requests it leaves out because their model has no list price', () => {
    const label = (tool: string) => tool
    expect(pauseFinding({ ...pause, summary: { ...pause.summary, unpriced_requests: 3 } }, label))
      .toMatch(/would cost \$3\.00\. 3 requests with no known cost are left out of the cost\.$/)
    expect(subagentFinding({ ...subagents, summary: { ...subagents.summary, unpriced_requests: 1 } }, label))
      .toMatch(/of its cost\. 1 request with no known cost is left out of the cost\.$/)
    expect(contextFinding({ ...contextBody, summary: { ...contextBody.summary, unpriced_requests: 12 } }, label))
      .toMatch(/ 12 requests with no known cost are left out of the cost\.$/)
    expect(orientationFinding({ ...orientation, summary: { ...orientation.summary, never: 2, unpriced_requests: 4 } }))
      .toMatch(/ 4 requests with no known cost are left out of the cost\.$/)
    expect(subagentFinding({ ...subagents, summary: { ...subagents.summary, unpriced_requests: 0 } }, label)).not.toContain('left out')
  })

  it('renders each card with its sentence, its visual, its KQL and its period', () => {
    const { ctx, requested } = context(ready)
    const { host, dispose } = mount(() => <>
      <PauseTax {...props(ctx)} /><ContextCarry {...props(ctx)} /><Subagents {...props(ctx)} />
      <AfterFailure {...props(ctx)} /><Rereads {...props(ctx)} /><TimeSplit {...props(ctx)} />
      <ContextWeight {...props(ctx)} /><Orientation {...props(ctx)} /><FixedContext {...props(ctx)} />
      <ProblemSessions {...props(ctx)} />
    </>)
    for (const id of Object.keys(bodies)) {
      const box = card(host, id)
      expect(box.querySelector('[data-finding]')?.textContent?.length, id).toBeGreaterThan(20)
      // Each card leads with one figure and says what it is a figure of; the method is folded away.
      expect(box.querySelector('[data-hero] strong')?.textContent, id).toMatch(/\d/)
      expect(box.querySelector('[data-hero] span')?.textContent?.length, id).toBeGreaterThan(10)
      // One closed line holds the sessions, the data table, the KQL and the method, each closed inside it.
      expect(box.querySelectorAll(':scope details[data-more]:not([open])').length, id).toBe(1)
      expect(box.querySelectorAll('details[data-more] > details:not([open])').length, id).toBe(4)
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

describe('INS-06 · Context weight', () => {
  it('states the share of heavy requests, the share of cost they carry and the small steps with their limit', () => {
    expect(contextFinding(contextBody, tool => tool)).toBe('48% of requests (480 of 1,000) read a context of 200k tokens or more and ' +
      'carried 69% of the cost ($69.00 of $100 at list price). Small steps, requests with under 150 output tokens and no ' +
      'thinking time, were 150 requests costing $14.60.')
    const none = { ...contextBody, tools: [contextBody.tools[1]], summary: { ...contextBody.summary, reported: 0, heavy_requests: 0,
      heavy_share: null, cost_usd: null, heavy_cost_usd: null, heavy_cost_share: null, small_requests: null, small_cost_usd: null } } as ContextBody
    expect(contextFinding(none, tool => tool)).toBe('The sources in this period do not report token counts (codex-cli).')
  })

  it('draws a request bar and a cost bar over the same buckets, and a tool without token counts as not reported', () => {
    const { ctx } = context(ready)
    const { host, dispose } = mount(() => <ContextWeight {...props(ctx)} />)
    const box = card(host, 'context')
    const claude = box.querySelector('[data-tool="claude-code"]')!
    const bars = claude.querySelectorAll('[role="img"]')
    expect(bars).toHaveLength(2)
    expect(bars[0].getAttribute('aria-label')).toBe('claude-code, share of requests by context: under 50k 3%, 50k–100k 15%, ' +
      '100k–200k 34%, 200k–500k 43%, 500k and more 5%')
    expect(bars[1].getAttribute('aria-label')).toContain('200k–500k 52%, 500k and more 17%')
    for (const bar of bars) expect(bar.children).toHaveLength(5)
    expect(claude.textContent).toContain('median 194 k tokens · 90th percentile 417 k tokens')
    const codex = box.querySelector('[data-tool="codex-cli"]')!
    expect(codex.querySelectorAll('[role="img"]')).toHaveLength(0)
    expect(codex.textContent).toContain('token counts not reported')
    expect(box.textContent).toContain('Small steps: under 150 output tokens and no thinking time')
    expect(box.querySelector('[data-small]')!.textContent).toContain('codex-cli: not reported')
    dispose()
  })

  it('keeps its own loading and error state', () => {
    const { ctx } = context(id => id === 'context' ? { data: undefined, status: 'error', error: new Error('Kusto view insights.context_weight failed') } : ready(id))
    const { host, dispose } = mount(() => <><ContextWeight {...props(ctx)} /><TimeSplit {...props(ctx)} /></>)
    expect(card(host, 'context').textContent).toContain('Could not load Context weight: Kusto view insights.context_weight failed')
    expect(card(host, 'time').querySelector('[data-finding]')).not.toBeNull()
    dispose()
  })
})

describe('INS-07 · Orientation cost by repository', () => {
  it('names the project with the most sessions that edit, the range of medians and the sessions that never edit', () => {
    expect(orientationFinding(orientation)).toBe('alpha has the most sessions that edit (89); the median one made 4 requests ' +
      'costing $0.21 before its first edit. Across 2 projects the median runs from 4 to 35 requests. 273 sessions never edited; ' +
      'they cost $159.')
    const none = { ...orientation, projects: [] } as OrientationBody
    expect(orientationFinding(none)).toBe('No project has 3 or more sessions that edit in this period. 273 sessions never edited; they cost $159.')
  })

  it('draws one bar per project with its median cost, and an unpriced cost as not reported', () => {
    const { ctx } = context(ready)
    const { host, dispose } = mount(() => <Orientation {...props(ctx)} />)
    const box = card(host, 'orientation')
    expect(box.querySelectorAll('[data-project]')).toHaveLength(2)
    expect(box.querySelector('[aria-label="alpha: median 4 requests, $0.21 before the first edit"]')).not.toBeNull()
    expect(box.querySelector('[aria-label="beta: median 35 requests, not reported before the first edit"]')).not.toBeNull()
    expect(box.querySelector('[title="/work/alpha"]')).not.toBeNull()
    const never = box.querySelector('[data-never]')!.textContent!
    expect(never).toContain('claude-code: 272 of 378 sessions, $159')
    expect(never).toContain('codex-cli: 1 of 1 sessions, not reported')
    dispose()
  })

  it('opens a session from its list and keeps its own error state', () => {
    const opened: string[] = []
    const { ctx } = context(ready, opened)
    const { host, dispose } = mount(() => <Orientation {...props(ctx)} />)
    const sessions = host.querySelector<HTMLDetailsElement>('[data-sessions]')!
    sessions.open = true
    flush()
    host.querySelector<HTMLButtonElement>('button[aria-label="Open session s-orient"]')!.click()
    flush()
    expect(opened).toEqual(['s-orient:flow'])
    dispose()
    const failing = context(id => id === 'orientation' ? { data: undefined, status: 'error', error: new Error('Kusto view insights.orientation failed') } : ready(id))
    const second = mount(() => <><Orientation {...props(failing.ctx)} /><ContextWeight {...props(failing.ctx)} /></>)
    expect(card(second.host, 'orientation').textContent).toContain('Could not load Orientation cost by repository: Kusto view insights.orientation failed')
    expect(card(second.host, 'context').querySelector('[data-finding]')).not.toBeNull()
    second.dispose()
  })
})

describe('INS-08 · Fixed context overhead', () => {
  it('states the heaviest fixed context, the skills never used and the costliest file from the response', () => {
    expect(fixedFinding(fixed, tool => tool)).toBe('copilot-desktop sessions carry the most fixed context: a median 51 k tokens ' +
      'before any work over 362 sessions, instruction files a median 38 k tokens of it (estimated). Of 135 skills claude-code listed, ' +
      '113 were never used in the period; listing them took 980 k tokens of 1.35 M tokens. The costliest instruction or memory file ' +
      'is CLAUDE.md in copilot-desktop: 30 k tokens per load in 357 sessions.')
    expect(fixedHero(fixed)).toEqual({ value: '84%',
      label: "of the 135 skills listed in sessions' fixed context were never used in the period" })
    // No tool lists its skills: the sentence says so and the figure falls back to the heaviest median, never to 0%.
    const unlisted = { ...fixed, top_skills: [], skills: [fixed.skills[1]], summary: { ...fixed.summary, listed: null, never_used: null,
      never_used_share: null, listing_tokens: null, unused_tokens: null } } as FixedBody
    expect(fixedFinding(unlisted, tool => tool)).toContain('No tool in this period reports the skills it lists.')
    expect(fixedHero(unlisted)?.value).toBe('51 k tokens')
    const empty = { ...unlisted, tools: [], files: [], summary: { ...unlisted.summary, sessions: 0, heaviest: null } } as FixedBody
    expect(fixedFinding(empty, tool => tool)).toBe('No session in this period records its fixed context.')
    expect(fixedHero(empty)).toBeUndefined()
  })

  it('stacks each tool by kind on one scale and names the kinds a tool does not report', () => {
    const { ctx } = context(ready)
    const { host, dispose } = mount(() => <FixedContext {...props(ctx)} />)
    const box = card(host, 'fixed')
    const desktop = box.querySelector('[data-tool="copilot-desktop"]')!
    const bar = desktop.querySelector('[role="img"]')!
    expect(bar.getAttribute('aria-label')).toBe('copilot-desktop, average fixed context by kind: Instruction files 37 k tokens, ' +
      'Other system prompt 14 k tokens')
    expect(bar.children).toHaveLength(2)
    expect(desktop.textContent).toContain('not reported: Memory files, Skill listing, MCP instructions, Custom agents, Deferred tool list')
    expect(desktop.textContent).toContain('median 51 k tokens · 90th percentile 54 k tokens · 362 sessions · estimated')
    const claude = box.querySelector('[data-tool="claude-code"]')!
    expect(claude.querySelector('[role="img"]')!.children).toHaveLength(5)
    expect(claude.textContent).toContain('not reported: Instruction files, Other system prompt')
    expect(box.querySelector('[data-files]')!.textContent).toContain('CLAUDE.md copilot-desktop30 k tokens per load · largest 32 k tokens · 357 sessions')
    const skills = box.querySelectorAll('[data-skills] li')
    expect(skills[0].textContent).toContain('5 uses')
    expect(skills[1].textContent).toContain('never used')
    expect(box.textContent).toContain('Skill listing not reported by copilot-cli; their uses are not compared.')
    dispose()
  })

  it('keeps its own loading and error state', () => {
    const { ctx } = context(id => id === 'fixed' ? { data: undefined, status: 'error', error: new Error('Kusto view insights.fixed_context failed') }
      : id === 'orientation' ? { data: undefined, status: 'loading', error: null } : ready(id))
    const { host, dispose } = mount(() => <><FixedContext {...props(ctx)} /><Orientation {...props(ctx)} /><ContextWeight {...props(ctx)} /></>)
    expect(card(host, 'fixed').textContent).toContain('Could not load Fixed context overhead: Kusto view insights.fixed_context failed')
    expect(card(host, 'orientation').querySelector('[data-finding]')).toBeNull()
    expect(card(host, 'context').querySelector('[data-finding]')).not.toBeNull()
    dispose()
  })
})

describe('INS-09 · Problem sessions', () => {
  it('states the flagged share, the most frequent pair and the most frequent signal from the response', () => {
    expect(problemFinding(problems, tool => tool)).toBe('868 of 2,537 sessions (34%) showed at least one problem signal, costing ' +
      '$36 k at list price; 709 showed two or more, most often failure streak with hook failure (670 sessions). The most ' +
      'frequent is failure streak in copilot-cli: 742 sessions, 34% of its sessions.')
    expect(problemHero(problems)).toEqual({ value: '34%', label: 'of the sessions of tools that report a problem signal showed at least one' })
    const none = { ...problems, tools: [problems.tools[2]], pairs: [], projects: [],
      summary: { sessions: 0, flagged: 0, flagged_share: null, multi: 0, flagged_cost_usd: null, not_reporting: ['codex-cli'] } } as ProblemBody
    expect(problemFinding(none, tool => tool)).toBe('No session in this period is of a tool that reports a problem signal.')
    expect(problemHero(none)).toBeUndefined()
  })

  it('draws signals by tools with counts and shares, and a signal a tool cannot show as not reported', () => {
    const { ctx } = context(ready)
    const { host, dispose } = mount(() => <ProblemSessions {...props(ctx)} />)
    const box = card(host, 'problems')
    const header = [...box.querySelectorAll('[role="table"] [data-head] [role="columnheader"]')].map(th => th.textContent)
    expect(header).toEqual(['Signal', 'copilot-cli2,159 sessions', 'claude-code378 sessions'])
    const api = box.querySelectorAll('[data-signal="api_error"] [role="cell"]')
    expect(api[0].getAttribute('data-cell')).toBe('not-reported')
    expect(api[0].textContent).toBe('not reported')
    expect(api[1].textContent).toBe('329%')
    const hooks = box.querySelectorAll('[data-signal="hook_failure"] [role="cell"]')
    expect(hooks[1].textContent).toBe('00%')
    expect(hooks[0].getAttribute('style')).toContain('color-mix(in srgb, var(--color-danger) 16%, var(--color-surface))')
    expect(box.textContent).toContain('No signal is recorded by codex-cli; left out.')
    const pairs = box.querySelectorAll('[data-pairs] li')
    expect(pairs[0].textContent).toBe('Failure streak + hook failure670 sessions · $438')
    expect(pairs[1].textContent).toContain('430 sessions · not reported')
    expect(box.querySelector('[data-projects]')!.textContent).toContain('alpha copilot-cli673 of 836 sessions · $632')
    dispose()
  })

  it('opens a flagged session in the drawer and keeps its own error state', () => {
    const opened: string[] = []
    const { ctx } = context(ready, opened)
    const { host, dispose } = mount(() => <ProblemSessions {...props(ctx)} />)
    const sessions = host.querySelector<HTMLDetailsElement>('[data-sessions]')!
    sessions.open = true
    flush()
    expect(sessions.textContent).toContain('Repeated compaction, Failure streak, Ended on an API error')
    host.querySelector<HTMLButtonElement>('button[aria-label="Open session s-prob"]')!.click()
    flush()
    expect(opened).toEqual(['s-prob:errors'])
    dispose()
    const failing = context(id => id === 'problems' ? { data: undefined, status: 'error', error: new Error('Kusto view insights.problem_sessions failed') }
      : id === 'fixed' ? { data: undefined, status: 'loading', error: null } : ready(id))
    const second = mount(() => <><ProblemSessions {...props(failing.ctx)} /><FixedContext {...props(failing.ctx)} /><Orientation {...props(failing.ctx)} /></>)
    expect(card(second.host, 'problems').textContent).toContain('Could not load Problem sessions: Kusto view insights.problem_sessions failed')
    expect(card(second.host, 'fixed').querySelector('[data-finding]')).toBeNull()
    expect(card(second.host, 'orientation').querySelector('[data-finding]')).not.toBeNull()
    second.dispose()
  })
})
