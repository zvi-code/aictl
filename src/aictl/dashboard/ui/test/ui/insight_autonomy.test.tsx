// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import WorkPerInstruction from '../../src/panels/insights/WorkPerInstruction'
import {
  autonomyFinding, autonomyHero, canTrend, figuresText, leadTool, queuedText, runText, runTop, trend, waitText,
  type AutonomyBin, type AutonomyBody, type AutonomyTool,
} from '../../src/panels/insights/autonomyModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const WEEK = 604_800
const NOV_12 = 1_699_747_200, NOV_19 = NOV_12 + WEEK, NOV_26 = NOV_12 + 2 * WEEK, DEC_3 = NOV_12 + 3 * WEEK
const none = { p50_longest: null, p90_longest: null, mean_longest: null, p50_multi: null, p90_multi: null, mean_multi: null,
  turns_answered: 0, waits: 0, queued: 0, p50_wait_s: null, over_5m: null, over_5m_share: null }
const counts = { active: 0, prompted: 0, scripted: 0, store_only: 0, start_unread: 0, no_calls: 0, unread: 0, unread_sessions: 0,
  instructions: 0,
  calls: 0, delegated: 0, one_instruction: 0, resumed: 0, no_stop: 0, sessions: 0, multi_sessions: 0 }
const claude: AutonomyTool = {
  ...counts, ...none, tool: 'claude-code', reported: true, active: 40, prompted: 38, scripted: 3, unread: 2, no_calls: 1,
  sessions: 30, instructions: 120, calls: 2400, delegated: 40, one_instruction: 12, multi_sessions: 18,
  p50_longest: 20, p90_longest: 90, mean_longest: 31.5, p50_multi: 25, p90_multi: 110, mean_multi: 40,
  turns_answered: 90, waits: 80, queued: 9, p50_wait_s: 110, over_5m: 24, over_5m_share: 0.3, resumed: 1,
}
// Enough sessions to be shown, too few with 2 or more instructions for their own median, and no recorded waits.
const cli: AutonomyTool = {
  ...counts, ...none, tool: 'copilot-cli', reported: true, active: 80, prompted: 70, scripted: 2, store_only: 9, sessions: 20,
  instructions: 26, calls: 300, one_instruction: 17, multi_sessions: 3, p50_longest: 8, p90_longest: 30, mean_longest: 12,
  p50_multi: 14, p90_multi: 30, mean_multi: 16, turns_answered: 6, waits: 2, queued: 0,
}
// Under the card's evidence minimum of 10 sessions: named in one line, never charted.
const vscode: AutonomyTool = {
  ...counts, ...none, tool: 'copilot-vscode', reported: true, sessions: 4, instructions: 9, calls: 90, multi_sessions: 2,
  p50_longest: 60, p90_longest: 500, waits: 5, p50_wait_s: 30, over_5m: 1,
}
const codex: AutonomyTool = { ...counts, ...none, tool: 'codex-cli', reported: false, active: 4 }
const bin = (tool: string, bin_ts: number, multi: number, p50: number | null, extra: Partial<AutonomyBin> = {}): AutonomyBin =>
  ({ ...none, tool, bin_ts, sessions: multi + 2, multi_sessions: multi, p50_longest: 10, p90_longest: 40, p50_multi: p50,
    p90_multi: p50 == null ? null : p50 * 3, ...extra })
const body: AutonomyBody = {
  card: 'autonomy', view: 'insights.work_per_instruction', range: { since: 1_699_700_000, until: 1_702_000_000 },
  data_range: { first_ts: 1_699_750_000, last_ts: 1_701_990_000 }, computed_at: 1_702_000_000,
  query: { view: 'insights.work_per_instruction', kql: '// aictl view insights.work_per_instruction\nsession_prompts | take 1',
    kusto_url: 'https://c.kusto.windows.net/db' },
  tools: [claude, cli, vscode, codex],
  bins: [
    // Nov 19 has 3 sessions with 2 or more instructions: below 5, left out of the trend.
    bin('claude-code', NOV_12, 6, 20), bin('claude-code', NOV_19, 3, 90), bin('claude-code', NOV_26, 7, 32), bin('claude-code', DEC_3, 5, 40),
    bin('copilot-cli', NOV_19, 3, 14), bin('copilot-vscode', NOV_19, 2, 60),
  ],
  bin_unit: 'week', prompts_from: 1_699_800_000,
  summary: { lead: 'claude-code', sessions: 54, multi_sessions: 23, one_instruction: 29, not_reported: ['codex-cli'] },
  sessions: [{ session_id: 's-long', node_id: 'n', tool: 'claude-code', longest: 400, instructions: 1, calls: 410, delegated: 3,
    waits: 0, queued: 0, p50_wait_s: null, first_ts: 1_700_000_000, single: true }],
}
const label = (tool: string) => tool

function context(state: DetailState<unknown> | undefined, opened: string[] = []) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined, filters: () => ({ projects: [], repos: [] }),
    openAgent(id: string, tab = 'flow') { opened.push(`${id}:${tab}`) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-autonomy'), since: body.range.since, until: body.range.until })
const card = (data: AutonomyBody = body, opened: string[] = []) => {
  const mounted = mount(() => <WorkPerInstruction {...props(context({ data, status: 'ready', error: null }, opened))} />)
  return { ...mounted, card: mounted.host.querySelector('[data-box="insight-autonomy"]')! }
}

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('INS-11 · Work per instruction states its figures from the response', () => {
  it('leads with the tool with the most sessions, its multi-instruction median, the trend and the wait', () => {
    // The card's evidence rule takes the small tool out before the lead is chosen; the most sessions lead, not the server's pick.
    const shown = { ...body, tools: [cli, claude, codex], summary: { ...body.summary, lead: 'copilot-cli' } }
    expect(leadTool(shown)!.tool).toBe('claude-code')
    expect(leadTool({ ...shown, tools: [claude, { ...cli, sessions: 45 }] })!.tool).toBe('copilot-cli')
    expect(autonomyHero(shown, claude, label)).toEqual({ value: '25 calls', label: "median longest run of tool calls between a " +
      "person's turns, claude-code sessions with 2 or more instructions (n=18); 90th percentile 110 calls" })
    expect(autonomyFinding(shown, claude, label)).toBe('In claude-code sessions with two or more instructions (18), the longest run ' +
      "of tool calls between a person's turns had a median of 25 calls (90th percentile 110 calls); the median went from 20 calls " +
      'in the week starting Nov 12 to 40 calls in the week starting Dec 3. People answered in a median 1 min 50 s (24 of 80 over 5 minutes; ' +
      '9 prompts were queued while the agent worked).')
    expect(autonomyFinding(shown, { ...claude, queued: 1 }, label)).toContain('1 prompt was queued while the agent worked')
  })

  it('writes the run, the plain figures, the wait and the queued count of a tool', () => {
    expect(runText(claude)).toBe('median 25 · 90th pct 110 tool calls in a row without you')
    expect(figuresText(claude)).toBe('20 tool calls per instruction · 120 instructions in 30 sessions · 12 sessions ran on one ' +
      'instruction · 40 calls started a subagent')
    expect(waitText(claude)).toBe('56 answered within 5 min · 24 after more than 5 min (30%) · median wait 1 min 50 s')
    expect(queuedText(claude)).toBe('9 instructions were typed while the agent was still working')
    expect(runText(cli)).toBe('all sessions: median 8 · 90th pct 30 tool calls in a row without you (too few sessions with 2 or ' +
      'more instructions for their own median: 3, 10 needed)')
    expect(figuresText(cli)).toBe('11.5 tool calls per instruction · 26 instructions in 20 sessions · 17 sessions ran on one instruction')
    expect(waitText(cli)).toBe('not reported')
    expect(queuedText(cli)).toBe('')
    expect(runText({ ...cli, p50_longest: null, p50_multi: null })).toBe('not reported')
    expect(runTop([claude, cli])).toBe(110)
    expect(waitText({ ...claude, waits: 5, over_5m: 2 })).toBe('only 5 waits measured, too few for a median (10 needed)')
  })

  it('states a trend only over bins with 5 or more such sessions, and only from 3 of them', () => {
    const at = (p50s: number[], multi = 12) => ({ ...body, bin_unit: 'month' as const,
      bins: p50s.map((p50, i) => bin('claude-code', NOV_12 + i * 2_678_400, multi, p50)) })
    expect(trend(at([110, 91, 71, 36, 66]), 'claude-code')).toBe('the median per month ranged from 36 calls to 110 calls with no ' +
      'steady change (110 calls in the month starting Nov 12, 66 calls in the month starting Mar 15)')
    expect(trend(at([46, 46, 46]), 'claude-code')).toBe('the median stayed at 46 calls in each month')
    expect(trend(at([46, 46]), 'claude-code')).toBe('too few sessions per month to show a trend')
    expect(trend(at([20, 25, 30], 4), 'claude-code')).toBe('too few sessions per month to show a trend')
    expect(canTrend(at([20, 25, 30], 5), 'claude-code')).toBe(true)
    // A month with too few sessions is left out: 46, (85 over 4 sessions), 38, 30 is a steady decline.
    const between = { ...body, bin_unit: 'month' as const, bins: [bin('copilot-vscode', NOV_12, 20, 46),
      bin('copilot-vscode', NOV_12 + 2_678_400, 4, 85), bin('copilot-vscode', NOV_12 + 2 * 2_678_400, 12, 38),
      bin('copilot-vscode', NOV_12 + 3 * 2_678_400, 8, 30)] }
    expect(trend(between, 'copilot-vscode')).toMatch(/^the median went from 46 calls in the month starting Nov 12 to 30 calls in the month starting /)
    expect(trend(body, 'copilot-cli')).toBe('too few sessions per week to show a trend')
  })

  it('reads too few sessions under 10 multi-instruction sessions, and names single-instruction sessions as maybe scripted', () => {
    expect(autonomyHero(body, cli, label)).toEqual({ value: 'too few sessions (n=3)', label: 'copilot-cli sessions with 2 or more ' +
      'instructions. All 20 sessions: median 8 calls, including single-instruction sessions, which may be scripted' })
    expect(autonomyFinding(body, cli, label)).toBe('copilot-cli had too few sessions with two or more instructions for a median ' +
      "(n=3); across all 20 sessions the longest run of tool calls between a person's turns had a median of 8 calls (90th " +
      "percentile 30 calls). The wait for a person's answer is not reported. Most sessions had a single instruction and may be " +
      'scripted (17 of 20).')
  })

  it('says a tool whose prompts aictl does not read is not reported, and when every tool was too small', () => {
    const silent = { ...body, tools: [codex], bins: [], summary: { ...body.summary, lead: null, sessions: 0 } }
    expect(leadTool(silent)).toBeUndefined()
    expect(autonomyHero(silent, undefined, label)).toBeUndefined()
    expect(autonomyFinding(silent, undefined, label)).toBe('aictl reads no prompts for the tools in this period (codex-cli), so ' +
      'work per instruction is not reported.')
    const empty = { ...silent, tools: [], summary: { ...silent.summary, not_reported: [] } }
    expect(autonomyFinding(empty, undefined, label)).toBe("No session with a person's instruction and a recorded tool call in this period.")
    expect(autonomyFinding({ ...empty, summary: { ...empty.summary, sessions: 4 } }, undefined, label))
      .toBe('Every tool had too few sessions in this period to compare (fewer than 10 each).')
  })
})

describe('INS-11 · Work per instruction draws one bar per tool on a shared linear axis', () => {
  it('draws the median bar and the line to the 90th percentile with their values written out', () => {
    const { card: root, dispose } = card()
    const runs = [...root.querySelectorAll('[data-run]')]
    expect(runs.map(row => row.getAttribute('data-run'))).toEqual(['claude-code', 'copilot-cli'])
    const [first, second] = runs
    expect(first.querySelector<HTMLElement>('[data-median]')!.style.inlineSize).toBe('22.7%')
    expect(first.querySelector<HTMLElement>('[data-p90]')!.style.insetInlineStart).toBe('22.7%')
    expect(first.querySelector<HTMLElement>('[data-p90]')!.style.inlineSize).toBe('77.3%')
    expect(first.querySelector('[data-run-text]')!.textContent).toBe('median 25 · 90th pct 110 tool calls in a row without you')
    expect(first.querySelector('[data-figures]')!.textContent).toBe('20 tool calls per instruction · 120 instructions in 30 sessions · ' +
      '12 sessions ran on one instruction · 40 calls started a subagent')
    expect(second.querySelector<HTMLElement>('[data-median]')!.style.inlineSize).toBe('7.3%')
    expect(second.querySelector('[data-run-text]')!.textContent).toContain('all sessions: median 8 · 90th pct 30')
    expect(root.querySelector('[data-hero]')!.textContent).toContain('25 calls')
    expect(root.querySelector('[data-finding]')!.textContent).toContain('In claude-code sessions with two or more instructions (18)')
    dispose()
  })

  it('splits the answered waits at 5 minutes and writes the queued count; a tool without waits reads not reported', () => {
    const { card: root, dispose } = card()
    const claudeWait = root.querySelector('[data-wait="claude-code"]')!
    expect(claudeWait.querySelector<HTMLElement>('[data-under]')!.style.flexGrow).toBe('56')
    expect(claudeWait.querySelector<HTMLElement>('[data-over]')!.style.flexGrow).toBe('24')
    expect(claudeWait.querySelector('[data-wait-text]')!.textContent).toBe('56 answered within 5 min · 24 after more than 5 min (30%) · ' +
      'median wait 1 min 50 s')
    expect(claudeWait.querySelector('[data-queued]')!.textContent).toBe('9 instructions were typed while the agent was still working')
    const cliWait = root.querySelector('[data-wait="copilot-cli"]')!
    expect(cliWait.querySelector('[data-under]')).toBeNull()
    expect(cliWait.querySelector('[data-wait-text]')!.textContent).toBe('not reported')
    expect(cliWait.querySelector('[data-queued]')).toBeNull()
    dispose()
  })

  it('draws a trend only from bins with enough sessions, with every value written, and says so when it cannot', () => {
    const { card: root, dispose } = card()
    const line = root.querySelector('[data-trend="claude-code"]')!
    expect([...line.querySelectorAll('[data-point]')].map(point => point.getAttribute('data-point'))).toEqual([NOV_12, NOV_26, DEC_3].map(String))
    expect([...line.querySelectorAll('[data-point] text')].map(text => text.textContent)).toEqual(['20', '32', '40'])
    expect(root.querySelector('[data-trend="copilot-cli"] [data-no-trend]')!.textContent).toContain('Too few sessions per week to draw a trend')
    expect(root.querySelector('[data-trend="copilot-cli"] svg')).toBeNull()
    // No log axis, hollow dots or "n=" labels on the marks.
    for (const svg of root.querySelectorAll('svg')) expect(svg.textContent).not.toContain('n=')
    dispose()
  })

  it('marks the first, last, lowest and highest bin when a trend has more than 12', () => {
    const p50s = [30, 31, 32, 33, 80, 34, 35, 36, 12, 37, 38, 39, 40, 41]
    const many = { ...body, bins: p50s.map((p50, i) => bin('claude-code', NOV_12 + i * WEEK, 6, p50)) }
    const { card: root, dispose } = card(many)
    expect([...root.querySelectorAll('[data-trend="claude-code"] [data-point] text')].map(text => text.textContent))
      .toEqual(['30', '80', '12', '41'])
    dispose()
  })

  it('names a tool under the evidence minimum in one line and lists unreported tools', () => {
    const { card: root, dispose } = card()
    expect(root.querySelector('[data-run="copilot-vscode"]')).toBeNull()
    expect(root.querySelector('[data-wait="copilot-vscode"]')).toBeNull()
    expect(root.querySelector('[data-trend="copilot-vscode"]')).toBeNull()
    expect(root.querySelector('[data-few]')!.textContent).toBe('copilot-vscode: 4 sessions, too few to compare.')
    expect(root.querySelector('[data-silent="codex-cli"]')!.textContent).toBe("codex-cli: not reported (aictl does not read this tool's prompts)")
    dispose()
  })

  it('shows unreported figures as not reported in the table and opens a session', () => {
    const opened: string[] = []
    const { card: root, dispose } = card(body, opened)
    for (const details of root.querySelectorAll<HTMLDetailsElement>('details')) details.open = true
    flush()
    const codexRow = [...root.querySelectorAll('tr')].find(row => row.textContent!.startsWith('codex-cli'))!
    expect(codexRow.textContent).toContain("not reported (aictl does not read this tool's prompts)")
    for (const col of ['p50_multi', 'sessions', 'instructions', 'delegated', 'answered', 'waits', 'queued', 'resumed']) {
      expect(codexRow.querySelector(`[data-col="${col}"]`)!.textContent).toBe('not reported')
    }
    expect(codexRow.querySelector('[data-col="unread_sessions"]')!.textContent).toBe('0')
    const claudeRow = [...root.querySelectorAll('tr')].find(row => row.textContent!.startsWith('claude-code'))!
    expect(claudeRow.querySelector('[data-col="delegated"]')!.textContent).toBe('40')
    const sessions = root.querySelector('[data-sessions]')!
    expect(sessions.textContent).toContain('single instruction')
    expect(sessions.textContent).toContain('not reported · 0 queued')
    sessions.querySelector<HTMLButtonElement>('button[aria-label="Open session s-long"]')!.click()
    flush()
    expect(opened).toEqual(['s-long:flow'])
    dispose()
  })
})
