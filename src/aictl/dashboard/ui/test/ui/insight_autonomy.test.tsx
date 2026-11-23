// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import WorkPerInstruction from '../../src/panels/insights/WorkPerInstruction'
import {
  autonomyFinding, autonomyHero, binWait, pickedTool, trend, waitFigure, type AutonomyBin, type AutonomyBody, type AutonomyTool,
} from '../../src/panels/insights/autonomyModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const NOV_12 = 1_699_747_200, NOV_19 = 1_700_352_000, NOV_26 = 1_700_956_800
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
const cli: AutonomyTool = {
  ...counts, ...none, tool: 'copilot-cli', reported: true, active: 80, prompted: 70, scripted: 2, store_only: 9, sessions: 20,
  instructions: 26, calls: 300, one_instruction: 17, multi_sessions: 3, p50_longest: 8, p90_longest: 30, mean_longest: 12,
  p50_multi: 14, p90_multi: 30, mean_multi: 16, turns_answered: 6, waits: 2, queued: 0,
}
const codex: AutonomyTool = { ...counts, ...none, tool: 'codex-cli', reported: false, active: 4 }
const bin = (tool: string, bin_ts: number, multi: number, p50: number | null, extra: Partial<AutonomyBin> = {}): AutonomyBin =>
  ({ ...none, tool, bin_ts, sessions: multi + 2, multi_sessions: multi, p50_longest: 10, p90_longest: 40, p50_multi: p50,
    p90_multi: p50 == null ? null : p50 * 3, ...extra })
const body: AutonomyBody = {
  card: 'autonomy', view: 'insights.work_per_instruction', range: { since: 1_699_700_000, until: 1_701_000_000 },
  data_range: { first_ts: 1_699_750_000, last_ts: 1_700_990_000 }, computed_at: 1_701_000_000,
  query: { view: 'insights.work_per_instruction', kql: '// aictl view insights.work_per_instruction\nsession_prompts | take 1',
    kusto_url: 'https://c.kusto.windows.net/db' },
  tools: [claude, cli, codex],
  bins: [
    bin('claude-code', NOV_12, 10, 20, { waits: 30, p50_wait_s: 90 }), bin('claude-code', NOV_19, 3, 25, { waits: 4, p50_wait_s: 50 }),
    bin('claude-code', NOV_26, 12, 32, { waits: 12, p50_wait_s: null }), bin('copilot-cli', NOV_19, 3, 14),
  ],
  bin_unit: 'week', prompts_from: 1_699_800_000,
  summary: { lead: 'claude-code', sessions: 50, multi_sessions: 15, one_instruction: 35, not_reported: ['codex-cli'] },
  sessions: [{ session_id: 's-long', node_id: 'n', tool: 'claude-code', longest: 400, instructions: 1, calls: 410, delegated: 3,
    waits: 0, queued: 0, p50_wait_s: null, first_ts: 1_700_000_000, single: true }],
}
const label = (tool: string) => tool

function context(state: DetailState<unknown> | undefined, opened: string[] = []) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    openAgent(id: string, tab = 'flow') { opened.push(`${id}:${tab}`) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-autonomy'), since: body.range.since, until: body.range.until })

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('INS-11 · Work per instruction states its figures from the response', () => {
  it('leads with the multi-instruction median, its trend over bins with enough sessions, and the wait', () => {
    const tool = pickedTool(body, undefined)!
    expect(tool.tool).toBe('claude-code')
    expect(autonomyHero(body, tool, label)).toEqual({ value: '25 calls', label: "median longest run of tool calls between a " +
      "person's turns, claude-code sessions with 2 or more instructions (n=18); 90th percentile 110 calls" })
    expect(autonomyFinding(body, tool, label)).toBe('In claude-code sessions with two or more instructions (18), the longest run ' +
      "of tool calls between a person's turns had a median of 25 calls (90th percentile 110 calls); the median went from 20 calls " +
      'in the week starting Nov 12 to 32 calls in the week starting Nov 26. People answered in a median 1 min 50 s (24 of 80 over 5 minutes; ' +
      '9 prompts were queued while the agent worked).')
    expect(waitFigure(tool)).toBe('1 min 50 s · 24 of 80 over 5 min · 9 queued')
    expect(autonomyFinding(body, { ...tool, queued: 1 }, label)).toContain('1 prompt was queued while the agent worked')
  })

  it('states a trend from first to last only when the bins between move the same way, and the range otherwise', () => {
    const at = (p50s: number[]) => ({ ...body, bin_unit: 'month' as const,
      bins: p50s.map((p50, i) => bin('claude-code', NOV_12 + i * 2_678_400, 12, p50)) })
    expect(trend(at([110, 91, 71, 36, 66]), 'claude-code')).toBe('the median per month ranged from 36 calls to 110 calls with no ' +
      'steady change (110 calls in the month starting Nov 12, 66 calls in the month starting Mar 15)')
    expect(trend(at([46, 46]), 'claude-code')).toBe('the median stayed at 46 calls in each month')
    // A month between with too few sessions still breaks a steady change: 46, 85 (n=6), 38 is not a decline.
    const between = { ...body, bin_unit: 'month' as const, bins: [bin('copilot-vscode', NOV_12, 20, 46),
      bin('copilot-vscode', NOV_12 + 2_678_400, 6, 85), bin('copilot-vscode', NOV_12 + 2 * 2_678_400, 12, 38)] }
    expect(trend(between, 'copilot-vscode')).toBe('the median per month ranged from 38 calls to 85 calls with no steady change ' +
      '(46 calls in the month starting Nov 12, 38 calls in the month starting Jan 13; months with fewer than 10 such sessions included)')
    expect(trend(at([20, 25, 30]), 'claude-code')).toBe('the median went from 20 calls in the month starting Nov 12 to 30 calls in ' +
      'the month starting Jan 13')
  })

  it('states a wait median only over 10 waits', () => {
    const few = { ...claude, waits: 5, queued: 1, p50_wait_s: 143, over_5m: 2 }
    expect(waitFigure(few)).toBe('too few waits (n=5) · 1 queued')
    expect(autonomyFinding(body, few, label)).toContain('Too few measured waits for a median wait (n=5).')
    expect(autonomyFinding(body, few, label)).not.toContain('People answered')
  })

  it('reads too few sessions under 10 multi-instruction sessions, and names single-instruction sessions as maybe scripted', () => {
    const tool = pickedTool(body, 'copilot-cli')!
    expect(autonomyHero(body, tool, label)).toEqual({ value: 'too few sessions (n=3)', label: 'copilot-cli sessions with 2 or more ' +
      'instructions. All 20 sessions: median 8 calls, including single-instruction sessions, which may be scripted' })
    expect(autonomyFinding(body, tool, label)).toBe('copilot-cli had too few sessions with two or more instructions for a median ' +
      "(n=3); across all 20 sessions the longest run of tool calls between a person's turns had a median of 8 calls (90th " +
      "percentile 30 calls). The wait for a person's answer is not reported. Most sessions had a single instruction and may be " +
      'scripted (17 of 20).')
    expect(trend(body, 'copilot-cli')).toBe('too few sessions per week to show a trend')
    expect(waitFigure(tool)).toBe('not reported')
  })

  it('says a tool whose prompts aictl does not read is not reported and has no lead figure', () => {
    const few = { ...cli, multi_sessions: 8, p50_multi: 7, p90_multi: 97 }
    expect(autonomyHero({ ...body, tools: [few] }, few, label)!.value).toBe('too few sessions (n=8)')
    const silent = { ...body, tools: [codex], bins: [], summary: { ...body.summary, lead: null, sessions: 0 } }
    expect(pickedTool(silent, undefined)).toBeUndefined()
    expect(autonomyHero(silent, undefined, label)).toBeUndefined()
    expect(autonomyFinding(silent, undefined, label)).toBe('aictl reads no prompts for the tools in this period (codex-cli), so ' +
      'work per instruction is not reported.')
    const empty = { ...silent, tools: [], summary: { ...silent.summary, not_reported: [] } }
    expect(autonomyFinding(empty, undefined, label)).toBe("No session with a person's instruction and a recorded tool call in this period.")
  })

  it('shows a bin wait only over 10 waits and when the view reported it', () => {
    expect(body.bins.map(binWait)).toEqual(['1 min 30 s', '–', '–', '–'])
  })
})

describe('INS-11 · Work per instruction draws one row per tool on a shared axis', () => {
  it('joins bins with 10 or more multi-instruction sessions, labels the others and lists unreported tools', () => {
    const { host, dispose } = mount(() => <WorkPerInstruction {...props(context({ data: body, status: 'ready', error: null }))} />)
    const card = host.querySelector('[data-box="insight-autonomy"]')!
    const rows = card.querySelectorAll('[data-tool]')
    expect([...rows].map(row => row.getAttribute('data-tool'))).toEqual(['claude-code', 'copilot-cli'])
    const claudeRow = rows[0]
    expect([...claudeRow.querySelectorAll('[data-multi]')].map(dot => dot.getAttribute('data-multi'))).toEqual(['joined', 'few', 'joined'])
    expect(claudeRow.querySelector('[data-trend]')!.getAttribute('points')!.split(' ')).toHaveLength(2)
    expect(claudeRow.textContent).toContain('n=3')
    expect(claudeRow.querySelectorAll('[data-all]')).toHaveLength(3)
    expect([...claudeRow.querySelectorAll('[data-waits] span')].map(cell => cell.textContent)).toEqual(['wait', '1 min 30 s', '–', '–'])
    expect([...rows[1].querySelectorAll('[data-waits] span')].map(cell => cell.textContent)).toEqual(['wait', '–', '–', '–'])
    expect(card.querySelector('[data-silent="codex-cli"]')!.textContent).toBe("codex-cli: not reported (aictl does not read this tool's prompts)")
    expect(card.querySelector('[data-hero]')!.textContent).toContain('25 calls')
    expect(card.querySelector('[data-wait]')!.textContent).toContain('1 min 50 s · 24 of 80 over 5 min · 9 queued')
    dispose()
  })

  it('switches the lead figure and finding to another tool', () => {
    const { host, dispose } = mount(() => <WorkPerInstruction {...props(context({ data: body, status: 'ready', error: null }))} />)
    const card = host.querySelector('[data-box="insight-autonomy"]')!
    const option = [...card.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(button => button.textContent === 'copilot-cli')!
    option.click()
    flush()
    expect(card.querySelector('[data-hero]')!.textContent).toContain('too few sessions (n=3)')
    expect(card.querySelector('[data-finding]')!.textContent).toContain('copilot-cli had too few sessions')
    expect(card.querySelector('[data-wait]')!.textContent).toContain('not reported')
    dispose()
  })

  it('shows unreported figures as not reported in the table and opens a session', () => {
    const opened: string[] = []
    const { host, dispose } = mount(() => <WorkPerInstruction {...props(context({ data: body, status: 'ready', error: null }, opened))} />)
    const card = host.querySelector('[data-box="insight-autonomy"]')!
    for (const details of card.querySelectorAll<HTMLDetailsElement>('details')) details.open = true
    flush()
    const codexRow = [...card.querySelectorAll('tr')].find(row => row.textContent!.startsWith('codex-cli'))!
    expect(codexRow.textContent).toContain("not reported (aictl does not read this tool's prompts)")
    for (const col of ['p50_multi', 'sessions', 'instructions', 'delegated', 'answered', 'waits', 'queued', 'resumed']) {
      expect(codexRow.querySelector(`[data-col="${col}"]`)!.textContent).toBe('not reported')
    }
    expect(codexRow.querySelector('[data-col="unread_sessions"]')!.textContent).toBe('0')
    const claudeRow = [...card.querySelectorAll('tr')].find(row => row.textContent!.startsWith('claude-code'))!
    expect(claudeRow.querySelector('[data-col="delegated"]')!.textContent).toBe('40')
    const sessions = card.querySelector('[data-sessions]')!
    expect(sessions.textContent).toContain('single instruction')
    expect(sessions.textContent).toContain('not reported · 0 queued')
    sessions.querySelector<HTMLButtonElement>('button[aria-label="Open session s-long"]')!.click()
    flush()
    expect(opened).toEqual(['s-long:flow'])
    dispose()
  })
})
