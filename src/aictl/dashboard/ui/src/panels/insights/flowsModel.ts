// ─── Flows — the payload of /api/board/insights/flows, the sentence it states and the rows of its charts ─
// A group with too little data is listed by the server as too small and never gets its own bar.
import { fmtNum, projectName } from '../../design/format'
import { axisText, barTop, type BarLegend, type BarRow, type BarTone } from './flowBarModel'
import { hours, money, plural, share, type Base, type Hero, type Label } from './insightsModel'

type Num = number | null
export type Step = 'read' | 'search' | 'edit' | 'command' | 'test' | 'commit' | 'mcp' | 'skill' | 'delegate' | 'web' | 'ask' | 'finish'
  | 'other'
export type FlowOutcome = 'committed' | 'changed' | 'no_change'
export type FlowEnding = { sessions: number; cost_usd: Num; last_steps: { step: Step; sessions: number; cost_usd: Num }[] }
export type FlowCycle = { pair: Step[]; loops: number; sessions: number; calls: number; rounds: number; seconds: number; time_share: Num }
export type FlowPath = { steps: Step[]; sessions: number }
export type FlowProject = {
  project: string; sessions: number; committed: number; changed: number; no_change: number; no_change_share: Num
  cost_usd: Num; no_change_cost: Num; loops: number; cycle_seconds: number; tools: string[]
}
export type FlowTool = { tool: string; calls: number; sessions: number; seconds: number; test_runs: number; unflagged_tests: number }
export type FlowsBody = Base<'flows'> & {
  transitions: { from_step: Step; calls: number; next: { to_step: Step; calls: number; share: number }[] }[]
  endings: Record<FlowOutcome, FlowEnding>
  first_paths: FlowPath[]
  last_paths: FlowPath[]
  cycles: FlowCycle[]
  projects: FlowProject[]
  tools: FlowTool[]
  summary: {
    sessions: number; cost_usd: Num; enough: boolean; no_change: number; no_change_share: Num; no_change_cost: Num
    no_change_cost_share: Num; no_change_last: { step: Step; sessions: number; cost_usd: Num } | null
    committed: number; changed: number; working_seconds: number; cycle_seconds: number; cycle_share: Num
    top_cycle: FlowCycle | null; no_test_tools: string[]; unflagged_tests: number
    small_steps: Step[]; small_paths: number; small_cycles: number; small_projects: string[]
  }
}

export const STEPS: Step[] = ['read', 'search', 'edit', 'command', 'test', 'commit', 'mcp', 'skill', 'delegate', 'web', 'ask', 'finish', 'other']
export const STEP_LABELS: Record<Step, string> = {
  read: 'read', search: 'search', edit: 'edit', command: 'command', test: 'test run', commit: 'commit', mcp: 'MCP tool',
  skill: 'skill', delegate: 'subagent', web: 'web fetch', ask: 'ask the person', finish: 'report done', other: 'other',
}
export const OUTCOMES: FlowOutcome[] = ['committed', 'changed', 'no_change']
export const OUTCOME_LABELS: Record<FlowOutcome, string> = {
  committed: 'Committed', changed: 'Changed files, no commit', no_change: 'Changed no file',
}
export const OUTCOME_TONES: Record<FlowOutcome, BarTone> = { committed: 'c3', changed: 'c1', no_change: 'c4' }
export const step = (value: Step) => STEP_LABELS[value] ?? value
export const stepPath = (steps: readonly Step[]) => steps.map(step).join(' → ')
export const cycleName = (pair: readonly Step[]) => pair.map(step).join(' ⇄ ')
/** Working time in seconds, as hours or minutes. */
export const workTime = (seconds: Num) => hours(seconds == null ? null : seconds * 1000)
const ratio = (part: number, whole: number) => whole ? part / whole : null

export const MIN_SESSIONS = 10
const SHOWN_FROM = 8
const SHOWN = 6

/** The sessions by how they ended, their list price, and the working time in cycles: counts only. */
export function flowsFinding(body: FlowsBody) {
  const s = body.summary
  if (!s.sessions) return 'No tool call in this period.'
  if (!s.enough) return `${plural(s.sessions, 'session')} in this period; the card states its figures from ${MIN_SESSIONS} sessions. ` +
    'The charts show the sessions there are.'
  return `${plural(s.sessions, 'session')} in this period: ${fmtNum(s.committed)} committed, ${fmtNum(s.changed)} changed files ` +
    `without a commit, ${fmtNum(s.no_change)} (${share(s.no_change_share)}) changed no file. The sessions that changed no file ` +
    `cost ${money(s.no_change_cost)} at list price (${share(s.no_change_cost_share)} of ${money(s.cost_usd)}). Working time in ` +
    `cycles of two alternating steps: ${workTime(s.cycle_seconds)} of ${workTime(s.working_seconds)} (${share(s.cycle_share)}).`
}

export const flowsHero = (body: FlowsBody): Hero | undefined => body.summary.enough && body.summary.no_change_share != null
  ? { value: share(body.summary.no_change_share), label: `of ${plural(body.summary.sessions, 'session')} changed no file` } : undefined

const endedTotal = (body: FlowsBody) => OUTCOMES.reduce((sum, outcome) => sum + body.endings[outcome].sessions, 0)

/** Hover text of one outcome: its sessions with their share of all ended sessions, and their list price. */
export function outcomeHover(body: FlowsBody, outcome: FlowOutcome) {
  const ending = body.endings[outcome], total = endedTotal(body)
  return `${OUTCOME_LABELS[outcome]}: ${fmtNum(ending.sessions)} of ${plural(total, 'session')} (${share(ratio(ending.sessions, total))}), ` +
    `${money(ending.cost_usd)} at list price`
}

/** One stacked bar of all sessions, split by how they ended. */
export function endingRows(body: FlowsBody): BarRow[] {
  const total = endedTotal(body)
  if (!total) return []
  return [{
    key: 'all', name: 'All sessions', sub: plural(total, 'session'),
    parts: OUTCOMES.map(outcome => ({ value: body.endings[outcome].sessions, tone: OUTCOME_TONES[outcome], hover: outcomeHover(body, outcome) })),
    text: OUTCOMES.map(outcome => `${fmtNum(body.endings[outcome].sessions)} ${OUTCOME_LABELS[outcome].toLowerCase()}`).join(' · '),
    hover: OUTCOMES.map(outcome => outcomeHover(body, outcome)).join('; '),
  }]
}
export const endingLegend: BarLegend = OUTCOMES.map(outcome => ({ tone: OUTCOME_TONES[outcome], label: OUTCOME_LABELS[outcome] }))

/** Per outcome, the main agent's last step: sessions and list price. */
export function lastStepRows(body: FlowsBody, outcome: FlowOutcome): BarRow[] {
  const ending = body.endings[outcome]
  return ending.last_steps.slice(0, SHOWN).map(item => {
    const hover = `${OUTCOME_LABELS[outcome]}, last step ${step(item.step)}: ${fmtNum(item.sessions)} of ${plural(ending.sessions, 'session')} ` +
      `(${share(ratio(item.sessions, ending.sessions))}), ${money(item.cost_usd)} at list price`
    return { key: item.step, name: step(item.step), parts: [{ value: item.sessions, tone: OUTCOME_TONES[outcome], hover }],
      text: `${plural(item.sessions, 'session')} · ${money(item.cost_usd)}`, hover }
  })
}

export type MatrixCell = { to: Step | 'rest'; calls: number; share: number; hover: string }
export type MatrixRow = { from: Step; calls: number; cells: (MatrixCell | null)[] }

/** What follows each kind of step: rows are the step kinds, columns the next step kinds the server lists (its 4 most frequent
 * per step), and a last column for the calls of the other next steps. A cell holds the share of the row's calls and its count. */
export function transitionMatrix(body: FlowsBody): { columns: (Step | 'rest')[]; rows: MatrixRow[] } {
  const shown = body.transitions.slice(0, SHOWN_FROM)
  const used = new Set(shown.flatMap(row => row.next.map(next => next.to_step)))
  const rest = shown.some(row => row.calls > row.next.reduce((sum, next) => sum + next.calls, 0))
  const columns: (Step | 'rest')[] = [...STEPS.filter(item => used.has(item)), ...(rest ? ['rest' as const] : [])]
  return {
    columns,
    rows: shown.map(row => ({
      from: row.from_step, calls: row.calls,
      cells: columns.map(column => {
        if (column === 'rest') {
          const calls = row.calls - row.next.reduce((sum, next) => sum + next.calls, 0)
          return calls > 0 ? { to: column, calls, share: calls / row.calls, hover: transitionHover(row.from_step, row.calls, null, calls) } : null
        }
        const next = row.next.find(item => item.to_step === column)
        return next ? { to: column, calls: next.calls, share: next.share, hover: transitionHover(row.from_step, row.calls, column, next.calls) } : null
      }),
    })),
  }
}

/** Hover text of one transition: the count, its share of the step's calls and the step's calls. */
export function transitionHover(from: Step, calls: number, to: Step | null, count: number) {
  const next = to ? `the next call was ${step(to)}` : 'the next call was another step kind (not among the 4 listed)'
  return `After ${step(from)}: ${next} ${plural(count, 'time')}, ${share(ratio(count, calls))} of ${plural(calls, 'call')} of ${step(from)}`
}
export const columnName = (column: Step | 'rest') => column === 'rest' ? 'other' : step(column)

/** The cycles of two alternating steps, by working time. */
export function cycleRows(body: FlowsBody): BarRow[] {
  return body.cycles.slice(0, SHOWN).map(cycle => {
    const hover = `${cycleName(cycle.pair)}: ${plural(cycle.loops, 'cycle')} in ${plural(cycle.sessions, 'session')}, ` +
      `${plural(cycle.rounds, 'round')} and ${plural(cycle.calls, 'call')} in all; working time ${workTime(cycle.seconds)}, ` +
      `${share(cycle.time_share)} of the working time of all tool calls (${workTime(body.summary.working_seconds)}). ` +
      'A cycle is two steps taking turns 3 rounds or more.'
    return { key: cycle.pair.join('-'), name: cycleName(cycle.pair), sub: `${plural(cycle.rounds, 'round')} · ${plural(cycle.sessions, 'session')}`,
      parts: [{ value: cycle.seconds, tone: 'c1', hover }], text: `${workTime(cycle.seconds)} (${share(cycle.time_share)})`, hover }
  })
}
export const cycleAxis = (body: FlowsBody) => axisText('working time in the cycle', workTime(barTop(cycleRows(body))))

/** The first or last steps of the main agent shared by 3 or more sessions. */
export function pathRows(body: FlowsBody, which: 'first' | 'last'): BarRow[] {
  const paths = which === 'first' ? body.first_paths : body.last_paths
  const total = body.summary.sessions
  return paths.slice(0, SHOWN).map(path => {
    const hover = `${which === 'first' ? 'First' : 'Last'} ${which === 'first' ? 4 : 3} steps ${stepPath(path.steps)}: ` +
      `${fmtNum(path.sessions)} of ${plural(total, 'session')} (${share(ratio(path.sessions, total))}); repeats of one step count once`
    return { key: path.steps.join('-'), name: stepPath(path.steps), parts: [{ value: path.sessions, tone: which === 'first' ? 'c1' : 'c2', hover }],
      text: `${plural(path.sessions, 'session')} (${share(ratio(path.sessions, total))})`, hover }
  })
}

/** Per project with 5 or more sessions: the sessions by how they ended. */
export function projectRows(body: FlowsBody): BarRow[] {
  return body.projects.slice(0, 8).map(row => {
    const part = (outcome: FlowOutcome, value: number) => ({ value, tone: OUTCOME_TONES[outcome],
      hover: `${projectName(row.project)}, ${OUTCOME_LABELS[outcome].toLowerCase()}: ${fmtNum(value)} of ${plural(row.sessions, 'session')} ` +
        `(${share(ratio(value, row.sessions))})` + (outcome === 'no_change' ? `, ${money(row.no_change_cost)} at list price` : '') })
    const hover = `${projectName(row.project)}: ${plural(row.sessions, 'session')}, ${money(row.cost_usd)} at list price; ` +
      `${fmtNum(row.committed)} committed, ${fmtNum(row.changed)} changed files without a commit, ${fmtNum(row.no_change)} changed no file ` +
      `(${money(row.no_change_cost)}); ${plural(row.loops, 'cycle')} with ${workTime(row.cycle_seconds)} of working time`
    return { key: row.project, name: projectName(row.project) ?? row.project, sub: `${plural(row.sessions, 'session')} · ${money(row.cost_usd)}`,
      parts: [part('committed', row.committed), part('changed', row.changed), part('no_change', row.no_change)],
      text: `${fmtNum(row.committed)} · ${fmtNum(row.changed)} · ${fmtNum(row.no_change)}`, hover }
  })
}

/** Per tool: its calls, sessions, working time and recognised test runs. */
export function flowToolRows(body: FlowsBody, label: Label): BarRow[] {
  return body.tools.map(tool => {
    const hover = `${label(tool.tool)}: ${plural(tool.calls, 'tool call')} in ${plural(tool.sessions, 'session')}, working time ` +
      `${workTime(tool.seconds)}, ${plural(tool.test_runs, 'recognised test run')}`
    return { key: tool.tool, name: label(tool.tool), sub: plural(tool.sessions, 'session'), parts: [{ value: tool.calls, tone: 'c1', hover }],
      text: `${plural(tool.calls, 'call')} · ${workTime(tool.seconds)}`, hover }
  })
}

/** The groups too small to compare, and what the step rules leave out, in one line; "" when none. */
export function tooSmall(body: FlowsBody, label: Label) {
  const s = body.summary
  const parts = [
    s.small_projects.length ? `${plural(s.small_projects.length, 'project')} with fewer than 5 sessions` : '',
    s.small_cycles ? `${plural(s.small_cycles, 'cycle')} seen in fewer than 3 sessions` : '',
    s.small_paths ? `${plural(s.small_paths, 'path')} of fewer than 3 sessions` : '',
    s.small_steps.length ? `steps after ${s.small_steps.map(step).join(', ')} (fewer than 30 calls)` : '',
  ].filter(Boolean)
  const tests = s.no_test_tools.length ? ` No recognised test run: ${s.no_test_tools.map(label).join(', ')}.` : ''
  const unflagged = s.unflagged_tests ? ` ${plural(s.unflagged_tests, 'command line')} named a test runner without starting with one; ` +
    'they count as commands, not test runs.' : ''
  return ((parts.length ? `Too small to compare: ${parts.join('; ')}.` : '') + tests + unflagged).trim()
}
