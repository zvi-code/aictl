// @vitest-environment jsdom
// The names on the time views are ways in: a coding tool narrows the page, a repository narrows the page, a tool by the
// name agents call it opens its detail, a model narrows the page. A shell program, a group of calls and the bar of all
// tools name nothing to open and stay text.
import { beforeEach, describe, expect, it } from 'vitest'
import AfterFailure from '../../src/panels/insights/AfterFailure'
import type { AutonomyBody } from '../../src/panels/insights/autonomyModel'
import Durations from '../../src/panels/insights/Durations'
import type { FailureBody, RereadBody, TimeBody } from '../../src/panels/insights/insightsModel'
import Rereads from '../../src/panels/insights/Rereads'
import TimeSplit from '../../src/panels/insights/TimeSplit'
import WorkPerInstruction from '../../src/panels/insights/WorkPerInstruction'
import type { DurationBody } from '../../src/panels/insights/workModel'
import type { Detail, DetailState, PanelContext } from '../../src/panels/types'
import { installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

type Went = { details: Detail[]; agents: string[]; patches: Record<string, unknown>[] }
function context(data: unknown) {
  const state: DetailState<unknown> = { data, status: 'ready', error: null }
  const went: Went = { details: [], agents: [], patches: [] }
  const ctx = {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined, tools: () => [],
    filters: () => ({ projects: [], repos: [], model: 'all' }),
    openAgent(id: string, tab = 'flow') { went.agents.push(`${id}:${tab}`) },
    openDetail(detail: Detail) { went.details.push(detail) },
    navigate(patch: Record<string, unknown>) { went.patches.push(patch) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
  return { ctx, went }
}
const base = {
  range: { since: 1_700_000_000, until: 1_700_086_400 }, data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 },
  computed_at: 1_700_086_000, repo_order: [], repo_others: null, sessions: [],
}
const query = (view: string) => ({ view, kql: `// aictl view ${view}\nrequests | take 1`, kusto_url: 'https://c.kusto.windows.net/db' })
/** The name of row `row` on chart `chart`, when it is a way in. */
const opener = (host: Element, chart: string, row: string) =>
  host.querySelector<HTMLElement>(`[data-chart="${chart}"] [data-row="${row}"] [data-open]`)
/** A button of the data table (not a chart name) by its accessible name. */
const inTable = (host: Element, label: string) =>
  [...host.querySelectorAll<HTMLElement>('button:not([data-open])')].find(button => button.getAttribute('aria-label') === label)
const narrowedTo = (tool: string) => (patch: Record<string, unknown>) => JSON.stringify(patch).includes(tool)
const H = 3_600_000

// ─── Where the time goes ─────────────────────────────────────────────────────────────────────────────────────────────
const timeTool = { untimed_requests: 0, overlong_requests: 0, untimed_calls: 0, overlong_calls: 0, overlong_ms: 0 }
const time = {
  ...base, card: 'time', view: 'insights.time_split', query: query('insights.time_split'),
  tools: [
    { ...timeTool, tool: 'claude-code', requests: 900, model_ms: 30 * H, thinking_ms: 6 * H, calls: 700, tool_ms: 10 * H, time_ms: 40 * H },
    { ...timeTool, tool: 'copilot-cli', requests: 400, model_ms: 8 * H, thinking_ms: null, calls: 300, tool_ms: 2 * H, time_ms: 10 * H,
      reasoning_requests: 50, reasoning_tokens: 2_000, reasoning_output_tokens: 8_000, reasoning_share: 0.25 },
  ],
  programs: [{ group: 'program', program: 'make', calls: 120, untimed: 0, overlong: 0, duration_ms: 5 * H, p50_ms: 30_000, p95_ms: 600_000,
    failure_share: 0.05 }],
  summary: { model_ms: 38 * H, thinking_ms: 6 * H, tool_ms: 12 * H, thinking_reported: ['claude-code'], untimed_requests: 0, untimed_calls: 0,
    overlong: 0, overlong_ms: 0, top_program: null },
} as unknown as TimeBody

describe('INS-OPEN · Where the time goes', () => {
  it('narrows the page to a coding tool from its bars and from the data table; a program stays text', () => {
    const { ctx, went } = context(time)
    const { host, dispose } = mount(() => <TimeSplit ctx={ctx} since={base.range.since} until={base.range.until} />)
    opener(host, 'time-tools', 'claude-code')!.click()
    opener(host, 'time-reasoning', 'copilot-cli')!.click()
    expect(went.patches).toHaveLength(2)
    expect(narrowedTo('claude-code')(went.patches[0])).toBe(true)
    expect(narrowedTo('copilot-cli')(went.patches[1])).toBe(true)
    expect(host.querySelector('[data-chart="time-programs"] [data-open]')).toBeNull()
    expect(host.querySelector('[data-chart="time-program-calls"] [data-open]')).toBeNull()
    inTable(host, 'Show only claude-code on every view')!.click()
    expect(narrowedTo('claude-code')(went.patches[2])).toBe(true)
    expect([...host.querySelectorAll('button')].some(button => button.textContent === 'make')).toBe(false)
    expect(went.details).toEqual([])
    dispose()
  })
})

// ─── Where session time goes ─────────────────────────────────────────────────────────────────────────────────────────
const times = {
  sessions: 20, timed: 20, walled: 18, changed: 12, waits: 40, requests: 1000, calls: 3000, model_ms: 8 * H, tool_ms: 2 * H,
  agent_ms: 20 * H, wait_ms: 5 * H, p50_agent_ms: 600_000, p90_agent_ms: 2 * H, max_agent_ms: 4 * H, p50_wall_ms: 900_000,
  p90_wall_ms: 2 * H, max_wall_ms: 10 * H, p50_first_change_ms: 120_000, p90_first_change_ms: 600_000,
}
const callTool = { calls: 200, timed: 200, p50_ms: 6_000, p95_ms: 120_000, failed: 4, failed_share: 0.02, repo: null, repo_name: null,
  repo_ms: null, small: false }
const durations = {
  ...base, card: 'durations', view: 'insights.durations', query: query('insights.durations'),
  repos: [
    { ...times, repo: '/w/alpha', name: 'alpha', kind: 'repository', agent_share: 0.8, small: false },
    { ...times, repo: '/x/notes', name: 'notes', kind: 'folder', agent_share: 0.2, small: false },
  ],
  tools: [{ ...callTool, name: 'Bash', program: false, total_ms: 3 * H }, { ...callTool, name: 'make', program: true, total_ms: 2 * H }],
  models: [{ model: 'model-x', requests: 1000, timed: 1000, total_ms: 10 * H, p50_ms: 9_000, p95_ms: 60_000, small: false }],
  summary: { ...times, agent_ms: 40 * H, model_ms: 16 * H, tool_ms: 5 * H, top: null, top_tool: null, slowest_tool: null,
    slowest_model: null, small: [] },
} as unknown as DurationBody

describe('INS-OPEN · Where session time goes', () => {
  it('narrows the page to a repository from every chart that ranks repositories, the list and the data table', () => {
    const { ctx, went } = context(durations)
    const { host, dispose } = mount(() => <Durations ctx={ctx} since={base.range.since} until={base.range.until} />)
    for (const chart of ['work', 'model-tool', 'session-range', 'first-change']) opener(host, chart, 'alpha')!.click()
    opener(host, 'work', 'notes')!.click()
    host.querySelector<HTMLElement>('[data-repo="alpha"] [data-open]')!.click()
    inTable(host, 'Show only the repository alpha (/w/alpha) on every view')!.click()
    const alpha = { repo: ['/w/alpha'], project: null, sel: null }
    expect(went.patches).toEqual([alpha, alpha, alpha, alpha, { repo: ['/x/notes'], project: null, sel: null }, alpha, alpha])
    dispose()
  })

  it('opens a tool by its name and narrows the page to a model; a program stays text', () => {
    const { ctx, went } = context(durations)
    const { host, dispose } = mount(() => <Durations ctx={ctx} since={base.range.since} until={base.range.until} />)
    opener(host, 'tools', 'Bash')!.click()
    opener(host, 'tool-range', 'Bash')!.click()
    expect(went.details).toEqual([{ type: 'tool', name: 'Bash' }, { type: 'tool', name: 'Bash' }])
    expect(opener(host, 'tools', 'make')).toBeNull()
    expect(opener(host, 'tool-range', 'make')).toBeNull()
    opener(host, 'models', 'model-x')!.click()
    opener(host, 'model-range', 'model-x')!.click()
    expect(went.patches).toEqual([{ model: 'model-x' }, { model: 'model-x' }])
    dispose()
  })
})

// ─── After a failure ─────────────────────────────────────────────────────────────────────────────────────────────────
const outcomes = { identical_failed: 10, identical_succeeded: 20, changed_failed: 5, changed_succeeded: 25, other_tool: 20 }
const failures = {
  ...base, card: 'failures', view: 'insights.after_failure', query: query('insights.after_failure'),
  tools: [
    { tool: 'claude-code', calls: 1000, failures: 100, last_failures: 20, outcomes, streaks: 4, streak_calls: 15, longest: 6 },
    { tool: 'codex', calls: 200, failures: 10, last_failures: 2, outcomes: { ...outcomes, identical_failed: 1, identical_succeeded: 2,
      changed_failed: 1, changed_succeeded: 2, other_tool: 2 }, streaks: 0, streak_calls: 0, longest: null },
  ],
  summary: { failures: 110, followed: 88, streaks: 4, streak_calls: 15, longest: 6, identical_failed: 11, identical_succeeded: 22,
    changed_failed: 6, changed_succeeded: 27, other_tool: 22 },
} as unknown as FailureBody

describe('INS-OPEN · After a failure', () => {
  it('narrows the page to a coding tool from each chart and the data table; the bar of all tools stays text', () => {
    const { ctx, went } = context(failures)
    const { host, dispose } = mount(() => <AfterFailure ctx={ctx} since={base.range.since} until={base.range.until} />)
    for (const chart of ['failure-next', 'failure-calls', 'failure-runs']) opener(host, chart, 'claude-code')!.click()
    opener(host, 'failure-next', 'codex')!.click()
    expect(host.querySelector('[data-chart="failure-next"] [data-row="all"]')).not.toBeNull()
    expect(opener(host, 'failure-next', 'all')).toBeNull()
    inTable(host, 'Show only codex on every view')!.click()
    expect(went.patches.map(patch => narrowedTo('claude-code')(patch))).toEqual([true, true, true, false, false])
    expect(narrowedTo('codex')(went.patches[3]) && narrowedTo('codex')(went.patches[4])).toBe(true)
    dispose()
  })
})

// ─── Repeated file reads ─────────────────────────────────────────────────────────────────────────────────────────────
const rereads = {
  ...base, card: 'rereads', view: 'insights.rereads', query: query('insights.rereads'),
  tools: [
    { tool: 'claude-code', reads: 1000, repeat_reads: 400, repeat_share: 0.4, files: 300, files_5plus: 20, most_reads: 30,
      repeat_bytes: 4_000_000, unmatched: 0 },
    { tool: 'copilot-cli', reads: 200, repeat_reads: 0, repeat_share: 0, files: 150, files_5plus: 0, most_reads: 1, repeat_bytes: null,
      unmatched: 0 },
  ],
  summary: { reads: 1200, repeat_reads: 400, repeat_share: 1 / 3, files_5plus: 20, repeat_bytes: 4_000_000, unmatched: 0 },
} as unknown as RereadBody

describe('INS-OPEN · Repeated file reads', () => {
  it('narrows the page to a coding tool from each chart and the data table; the bar of all tools stays text', () => {
    const { ctx, went } = context(rereads)
    const { host, dispose } = mount(() => <Rereads ctx={ctx} since={base.range.since} until={base.range.until} />)
    for (const chart of ['reread-reads', 'reread-bytes', 'reread-files']) opener(host, chart, 'claude-code')!.click()
    opener(host, 'reread-files', 'copilot-cli')!.click()
    expect(opener(host, 'reread-reads', 'all')).toBeNull()
    inTable(host, 'Show only claude-code on every view')!.click()
    expect(went.patches.map(patch => narrowedTo('claude-code')(patch))).toEqual([true, true, true, false, true])
    expect(narrowedTo('copilot-cli')(went.patches[3])).toBe(true)
    expect(went.details).toEqual([])
    dispose()
  })
})

// ─── Work per instruction ────────────────────────────────────────────────────────────────────────────────────────────
const blank = { p50_longest: null, p90_longest: null, mean_longest: null, p50_multi: null, p90_multi: null, mean_multi: null,
  turns_answered: 0, waits: 0, queued: 0, p50_wait_s: null, over_5m: null, over_5m_share: null }
const tally = { active: 0, prompted: 0, scripted: 0, store_only: 0, start_unread: 0, no_calls: 0, unread: 0, unread_sessions: 0,
  instructions: 0, calls: 0, delegated: 0, one_instruction: 0, resumed: 0, no_stop: 0, sessions: 0, multi_sessions: 0 }
const autonomy = {
  ...base, card: 'autonomy', view: 'insights.work_per_instruction', query: query('insights.work_per_instruction'),
  tools: [
    { ...tally, ...blank, tool: 'claude-code', reported: true, sessions: 40, multi_sessions: 20, instructions: 120, calls: 1600,
      p50_longest: 28, p90_longest: 110, mean_longest: 30, p50_multi: 30, p90_multi: 120, mean_multi: 35, turns_answered: 64, waits: 60,
      queued: 3, p50_wait_s: 90, over_5m: 15, over_5m_share: 0.25 },
    { ...tally, ...blank, tool: 'codex-cli', reported: false, active: 4 },
  ],
  bins: [], bin_unit: 'day', prompts_from: null,
  summary: { lead: 'claude-code', sessions: 40, multi_sessions: 20, one_instruction: 20, not_reported: ['codex-cli'] },
} as unknown as AutonomyBody

describe('INS-OPEN · Work per instruction', () => {
  it('narrows the page to a coding tool from the run strip, the waits, the trend, a silent tool and the data table', () => {
    const { ctx, went } = context(autonomy)
    const { host, dispose } = mount(() => <WorkPerInstruction ctx={ctx} since={base.range.since} until={base.range.until} />)
    opener(host, 'autonomy-runs', 'claude-code')!.click()
    opener(host, 'autonomy-waits', 'claude-code')!.click()
    host.querySelector<HTMLElement>('[data-trend="claude-code"] [data-open]')!.click()
    host.querySelector<HTMLElement>('[data-silent="codex-cli"] [data-open]')!.click()
    inTable(host, 'Show only claude-code on every view')!.click()
    expect(went.patches.map(patch => narrowedTo('claude-code')(patch))).toEqual([true, true, true, false, true])
    expect(narrowedTo('codex-cli')(went.patches[3])).toBe(true)
    expect(host.querySelector('[data-silent="codex-cli"]')!.textContent).toBe('codex-cli: not reported (aictl does not read this tool\'s prompts)')
    dispose()
  })
})
