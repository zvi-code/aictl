// ─── Flows — the payload of /api/board/insights/flows and the finding it states ─
// A group with too little data is listed by the server as too small and never drives the finding or a chart.
import { fmtNum } from '../../design/format'
import { hours, money, plural, share, type Base, type Hero, type Label } from './insightsModel'

type Num = number | null
export type Step = 'read' | 'search' | 'edit' | 'command' | 'test' | 'commit' | 'mcp' | 'skill' | 'delegate' | 'web' | 'ask' | 'finish'
  | 'other'
export type FlowOutcome = 'committed' | 'changed' | 'no_change'
export type FlowEnding = { sessions: number; cost_usd: Num; last_steps: { step: Step; sessions: number; cost_usd: Num }[] }
export type FlowCycle = { pair: Step[]; loops: number; sessions: number; calls: number; rounds: number; seconds: number; time_share: Num }
export type FlowProject = {
  project: string; sessions: number; committed: number; changed: number; no_change: number; no_change_share: Num
  cost_usd: Num; no_change_cost: Num; loops: number; cycle_seconds: number; tools: string[]
}
export type FlowsBody = Base<'flows'> & {
  transitions: { from_step: Step; calls: number; next: { to_step: Step; calls: number; share: number }[] }[]
  endings: Record<FlowOutcome, FlowEnding>
  first_paths: { steps: Step[]; sessions: number }[]
  last_paths: { steps: Step[]; sessions: number }[]
  cycles: FlowCycle[]
  projects: FlowProject[]
  tools: { tool: string; calls: number; sessions: number; seconds: number; test_runs: number; unflagged_tests: number }[]
  summary: {
    sessions: number; cost_usd: Num; enough: boolean; no_change: number; no_change_share: Num; no_change_cost: Num
    no_change_cost_share: Num; no_change_last: { step: Step; sessions: number; cost_usd: Num } | null
    committed: number; changed: number; working_seconds: number; cycle_seconds: number; cycle_share: Num
    top_cycle: FlowCycle | null; no_test_tools: string[]; unflagged_tests: number
    small_steps: Step[]; small_paths: number; small_cycles: number; small_projects: string[]
  }
}

export const STEP_LABELS: Record<Step, string> = {
  read: 'read', search: 'search', edit: 'edit', command: 'command', test: 'test run', commit: 'commit', mcp: 'MCP tool',
  skill: 'skill', delegate: 'subagent', web: 'web fetch', ask: 'ask the person', finish: 'report done', other: 'other',
}
export const OUTCOME_LABELS: Record<FlowOutcome, string> = {
  committed: 'Committed', changed: 'Changed files, no commit', no_change: 'Changed nothing',
}
export const stepPath = (steps: readonly Step[]) => steps.map(step => STEP_LABELS[step] ?? step).join(' → ')
export const cycleName = (pair: readonly Step[]) => pair.map(step => STEP_LABELS[step] ?? step).join(' ⇄ ')
/** Working time in seconds, as hours or minutes. */
export const workTime = (seconds: Num) => hours(seconds == null ? null : seconds * 1000)

const MIN_SESSIONS = 10

/** The share of sessions that changed nothing, with its cost and the step they stop on; then the costliest cycle. */
export function flowsFinding(body: FlowsBody) {
  const s = body.summary
  if (!s.sessions) return 'No tool call in this period.'
  if (!s.enough) return `Only ${plural(s.sessions, 'session')} in this period: too few to state a finding (the card needs ${MIN_SESSIONS}).`
  const last = s.no_change_last
  const stop = s.no_change
    ? `${fmtNum(s.no_change)} of ${plural(s.sessions, 'session')} (${share(s.no_change_share)}) ended without changing a file, ` +
      `costing ${money(s.no_change_cost)} at list price (${share(s.no_change_cost_share)} of the period's cost)` +
      (last ? `; ${fmtNum(last.sessions)} of them stopped on a ${STEP_LABELS[last.step] ?? last.step}.` : '.')
    : `Every one of the ${plural(s.sessions, 'session')} changed a file.`
  const top = s.top_cycle
  const cycle = top ? ` The costliest cycle is ${cycleName(top.pair)}: ${plural(top.rounds, 'round')} in ${plural(top.sessions, 'session')}, ` +
    `${workTime(top.seconds)} of working time (${share(top.time_share)} of all).` : ''
  return stop + cycle
}

export const flowsHero = (body: FlowsBody): Hero | undefined => body.summary.enough && body.summary.no_change_share != null
  ? { value: share(body.summary.no_change_share), label: 'of sessions changed nothing' } : undefined

/** The groups too small to compare, in one line; "" when none. */
export function tooSmall(body: FlowsBody, label: Label) {
  const s = body.summary
  const parts = [
    s.small_projects.length ? `${plural(s.small_projects.length, 'project')} with fewer than 5 sessions` : '',
    s.small_cycles ? `${plural(s.small_cycles, 'cycle')} seen in fewer than 3 sessions` : '',
    s.small_paths ? `${plural(s.small_paths, 'path')} of fewer than 3 sessions` : '',
    s.small_steps.length ? `steps after ${s.small_steps.map(step => STEP_LABELS[step] ?? step).join(', ')} (fewer than 30 calls)` : '',
  ].filter(Boolean)
  const tests = s.no_test_tools.length ? ` ${s.no_test_tools.map(label).join(', ')} ${s.no_test_tools.length === 1 ? 'has' : 'have'} ` +
    'no recognised test run, so no test step is shown for it.' : ''
  const unflagged = s.unflagged_tests ? ` ${plural(s.unflagged_tests, 'command line')} named a test runner but did not start ` +
    'with one, so they count as commands, not test runs.' : ''
  return ((parts.length ? `Too small to compare: ${parts.join('; ')}.` : '') + tests + unflagged).trim()
}
