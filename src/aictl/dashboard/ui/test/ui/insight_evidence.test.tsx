// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import ProblemSessions from '../../src/panels/insights/ProblemSessions'
import { EVIDENCE, evidenceNote, fewText, MODEL_SESSIONS, withEvidence } from '../../src/panels/insights/evidence'
import {
  failureFinding, fixedFinding, fixedHero, pauseFinding, subagentFinding, timeFinding,
  type FailureBody, type FixedBody, type PauseBody, type ProblemBody, type SubagentBody, type TimeBody,
} from '../../src/panels/insights/insightsModel'
import { modelFinding, modelHero, type ModelBody } from '../../src/panels/insights/modelReportModel'
import { signalToolGrid } from '../../src/panels/insights/problemsModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { installDom, layoutHeaders, mount } from './dom'

// One large group (copilot-cli) and one group of 2 sessions (copilot-desktop) whose figures are the extreme ones, so a
// rule that picked the largest value would pick it.
const BIG = 'copilot-cli', SMALL = 'copilot-desktop'
const label = (tool: string) => tool
const cells = (requests: number, avg: number) => ['under_1m', '1_5m', '5_60m', 'over_60m'].map(bucket =>
  ({ bucket, requests, priced: requests, cache_hit_share: 0.5, avg_cost_usd: avg, cost_usd: avg * requests }))
const side = (requests: number, cost: number) => ({ requests, priced: requests, cost_usd: cost })
const signals = (sessions: number, share: number) => ['compaction', 'failure_streak', 'failed_delegation', 'api_error', 'open_todos',
  'hook_failure'].map(signal => ({ signal, reported: true, sessions: Math.round(sessions * share), share, cost_usd: 1 }))
const kinds = [{ kind: 'instruction_file', reported: true, sessions: 2, session_share: 1, p50_tokens: 1, avg_tokens: 1, p50_items: 1, estimated: true }]
const model = (tool: string, name: string, sessions: number, cost: number) => ({
  tool, model: name, requests: 100 * sessions, sessions, priced: 100 * sessions, cost_usd: cost * 100 * sessions, cost_per_request: cost,
  first_ts: 0, last_ts: 10, calls: null, failures: null, failure_share: null, at_least: false, helper: false, failing: [], efforts: [],
  recorded_sessions: sessions,
})

/** Per card: the tool rows of a fixture with the large group first. */
const TOOLS: Record<string, [Record<string, unknown>, Record<string, unknown>]> = {
  pause: [{ tool: BIG, cache_reported: true, buckets: cells(500, 0.1) }, { tool: SMALL, cache_reported: true, buckets: cells(1, 9) }],
  carry: [{ tool: BIG, calls: 5000, reported: 5000, output_bytes: 1e6, carried_bytes: 1e8 }, { tool: SMALL, calls: 3, reported: 3, output_bytes: 1e9, carried_bytes: 1e12 }],
  subagents: [{ tool: BIG, main: side(900, 90), subagents: { ...side(300, 30), agents: 20 }, subagent_share: 0.25 },
    { tool: SMALL, main: side(1, 0.1), subagents: { ...side(4, 50), agents: 2 }, subagent_share: 0.99 }],
  failures: [{ tool: BIG, calls: 9000, failures: 400, outcomes: { identical_failed: 10 } }, { tool: SMALL, calls: 6, failures: 6, outcomes: { identical_failed: 6 } }],
  rereads: [{ tool: BIG, reads: 4000, repeat_reads: 400, repeat_share: 0.1 }, { tool: SMALL, reads: 4, repeat_reads: 4, repeat_share: 1 }],
  time: [{ tool: BIG, requests: 5000, model_ms: 1e6, thinking_ms: null, calls: 9000, tool_ms: 1e6 },
    { tool: SMALL, requests: 8, model_ms: 1e9, thinking_ms: 1e9, calls: 8, tool_ms: 1e9 }],
  context: [{ tool: BIG, requests: 5000, reported: 5000 }, { tool: SMALL, requests: 9, reported: 9 }],
  orientation: [{ tool: BIG, sessions: 5484 }, { tool: SMALL, sessions: 2 }],
  fixed: [{ tool: BIG, sessions: 5484, p50_tokens: 12_000, kinds }, { tool: SMALL, sessions: 2, p50_tokens: 99_000, kinds }],
  problems: [{ tool: BIG, sessions: 5484, reports: true, flagged: 549, signals: signals(5484, 0.1) }, { tool: SMALL, sessions: 2, reports: true, signals: signals(2, 0.5) }],
  autonomy: [{ tool: BIG, sessions: 5484, reported: true }, { tool: SMALL, sessions: 2, reported: true }],
  verified: [{ tool: BIG, commits: 506 }, { tool: SMALL, commits: 2 }],
  models: [{ tool: BIG, requests: 50_000, sessions: 5484, models: [model(BIG, 'big-a', 4000, 0.1), model(BIG, 'big-b', 1400, 0.05),
    model(BIG, 'rare', 4, 0.9)] }, { tool: SMALL, requests: 200, sessions: 2, models: [model(SMALL, 'desk', 2, 3)] }],
}

beforeEach(() => { installDom(); layoutHeaders() })

describe('INS-EVID · A group below its card\'s minimum is named in one line, never compared', () => {
  it('has a minimum for every card, stated in the card\'s measurement text', () => {
    expect(Object.keys(TOOLS).sort()).toEqual(Object.keys(EVIDENCE).sort())
    for (const card of Object.keys(EVIDENCE)) expect(evidenceNote(card), card).toContain(`fewer than ${EVIDENCE[card].minimum}`)
    expect(evidenceNote('models')).toContain(`seen in ${MODEL_SESSIONS} sessions or more`)
  })

  for (const [card, tools] of Object.entries(TOOLS)) {
    it(`${card}: keeps the large group and names the small one`, () => {
      const { body, few } = withEvidence({ card, tools, tool_names: tools.map(tool => ({ tool: tool.tool })), bins: tools.map(tool => ({ tool: tool.tool })) })
      const kept = body.tools as unknown as { tool: string }[]
      expect(kept.map(tool => tool.tool)).toEqual([BIG])
      expect((body as { tool_names: { tool: string }[] }).tool_names.map(row => row.tool)).toEqual([BIG])
      expect(few[0]).toMatchObject({ tool: SMALL, unit: EVIDENCE[card].unit, minimum: EVIDENCE[card].minimum })
      expect(fewText(few, label)).toContain(`${card === 'models' ? 'rare (copilot-cli): 4 sessions' : SMALL + ':'}`)
    })
  }

  it('words every headline from the group with the most evidence', () => {
    const shown = <T,>(card: string, extra: Record<string, unknown>) => withEvidence({ card, tools: TOOLS[card], ...extra } as never).body as T
    expect(subagentFinding(shown<SubagentBody>('subagents', { summary: { subagents: 22, subagent_requests: 304, subagent_cost_usd: 80,
      subagent_share: 0.4 } }), label)).not.toContain(SMALL)
    expect(failureFinding(shown<FailureBody>('failures', { summary: { failures: 406, followed: 400, identical_failed: 16, identical_succeeded: 0,
      streaks: 1, longest: 3 } }), label)).not.toContain(SMALL)
    expect(timeFinding(shown<TimeBody>('time', { summary: { model_ms: 1e9, tool_ms: 1e9, top_program: null } }), label)).toContain(BIG)
    const fixed = shown<FixedBody>('fixed', { skills: [], files: [], summary: { sessions: 5486, heaviest: { tool: SMALL, p50_tokens: 99_000 },
      listed: null } })
    expect(fixedFinding(fixed, label)).toContain(`${BIG} sessions carry a median 12 k tokens`)
    expect(fixedHero(fixed)?.label).toContain(BIG)
    expect(signalToolGrid(shown<ProblemBody>('problems', { pairs: [], projects: [], summary: { sessions: 5486, flagged: 549, flagged_share: 0.1,
      multi: 0, flagged_cost_usd: 1 } }), label).columns.map(column => column.key)).toEqual([BIG])
    expect(pauseFinding(shown<PauseBody>('pause', { summary: { tools: [BIG, SMALL], requests: 1000, cost_usd: 100, baseline_usd: 50 } }), label))
      .not.toContain(SMALL)
    // Models: only models seen in the minimum of sessions are compared, and the headline states the stake behind its ratio.
    const models = { card: 'models', tools: TOOLS.models, summary: { lead: null, not_reported: {} } } as unknown as ModelBody
    expect(modelFinding(models, label)).toContain('big-a cost 2.0× as much per priced request as big-b')
    expect(modelHero(models, label)?.label).toContain('big-a cost $40 k in 4,000 sessions, big-b $7,000 in 1,400 sessions')
    const later = { ...models, tools: [{ ...TOOLS.models[0], models: [model(BIG, 'big-a', 4000, 0.1), { ...model(BIG, 'big-b', 1400, 0.05),
      first_ts: 20, last_ts: 30 }] }] } as unknown as ModelBody
    expect(modelHero(later, label)?.label).toContain('Their periods do not overlap')
  })

  it('takes the small group out of the pause causes and the calls that ran through a pause', () => {
    const rows = TOOLS.pause.map(tool => ({ tool: tool.tool }))
    const { body } = withEvidence({ card: 'pause', tools: TOOLS.pause, causes: rows, cause_tools: rows })
    expect((body as { causes: { tool: string }[] }).causes.map(row => row.tool)).toEqual([BIG])
    expect((body as { cause_tools: { tool: string }[] }).cause_tools.map(row => row.tool)).toEqual([BIG])
  })

  it('leaves a card without an entry as it came: its lists are not rows per tool', () => {
    const body = { card: 'skills', tools: [{ tool: BIG, uses: 9 }], skills: [{ name: 'review', uses: 9 }] }
    expect(withEvidence(body)).toEqual({ body, few: [] })
  })

  it('draws no cell and no column for the small group and names it under the chart', () => {
    const body = {
      card: 'problems', view: 'insights.problem_sessions', range: { since: 0, until: 10 }, data_range: { first_ts: 1, last_ts: 2 }, computed_at: 3,
      query: { view: 'insights.problem_sessions', kql: 'x', kusto_url: null }, tools: TOOLS.problems, signals: [], pairs: [], projects: [],
      other_projects: { sessions: 549, cost_usd: 1, signals: {} },
      summary: { sessions: 5486, flagged: 549, flagged_share: 0.1, multi: 0, flagged_cost_usd: 1, not_reporting: [] }, sessions: [],
    }
    const ctx = {
      scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined, filters: () => ({ projects: [], repos: [] }),
      openAgent() {}, detail: (path: () => string | undefined) => Object.assign(() => path()
        ? { data: body, status: 'ready', error: null } as DetailState<unknown> : undefined, { retry() {} }),
    } as unknown as PanelContext
    const { host, dispose } = mount(() => <ProblemSessions ctx={ctx} since={0} until={10} />)
    flush()
    const box = host.querySelector('#insight-problems')!
    expect([...box.querySelectorAll('[data-chart="problem-counts"] [data-row]')].map(row => row.getAttribute('data-row'))).toEqual([BIG])
    expect(box.querySelector('[data-hero]')!.textContent).not.toContain(SMALL)
    expect(box.querySelector('[data-finding]')!.textContent).not.toContain(SMALL)
    expect(box.querySelector('[data-few]')!.textContent).toBe(`${SMALL}: 2 sessions, too few to compare.`)
    expect(box.querySelector('[data-method]')!.textContent).toContain('a tool with fewer than 10 sessions in the period is not compared')
    dispose()
  })
})
