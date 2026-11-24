// ─── Flows — the payload of /api/board/insights/flows, the sentence it states and the rows of its charts ─
// A group with too little data is listed by the server as too small and never gets its own bar.
import { fmtNum, projectName } from '../../design/format'
import { axisText, barTop, type BarLegend, type BarPart, type BarRow, type BarTone } from './flowBarModel'
import { hours, money, plural, share, type Base, type Hero, type Label } from './insightsModel'
import { repoColour, repoHover, repoName, type RepoSegment } from './repoSplit'

type Num = number | null
export type Step = 'read' | 'search' | 'edit' | 'command' | 'test' | 'commit' | 'mcp' | 'skill' | 'delegate' | 'web' | 'ask' | 'finish'
  | 'other'
export type FlowOutcome = 'committed' | 'changed' | 'no_change'
/** `repos` (repoSplit.ts): the bar's parts per repository, where the server split it. */
type Split = { repos?: RepoSegment[] }
export type FlowLastStep = { step: Step; sessions: number; cost_usd: Num } & Split
export type FlowEnding = { sessions: number; cost_usd: Num; last_steps: FlowLastStep[] } & Split
export type FlowCycle = { pair: Step[]; loops: number; sessions: number; calls: number; rounds: number; seconds: number; time_share: Num } & Split
export type FlowPath = { steps: Step[]; sessions: number } & Split
export type FlowProject = {
  project: string; sessions: number; committed: number; changed: number; no_change: number; no_change_share: Num
  cost_usd: Num; no_change_cost: Num; loops: number; cycle_seconds: number; tools: string[]
} & Split
export type FlowTool = { tool: string; calls: number; sessions: number; seconds: number; test_runs: number; unflagged_tests: number } & Split
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
    no_change_cost_share: Num; no_change_last: FlowLastStep | null
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
/** The parts of a bar per repository for one measure of its segments, each with repoHover, `extra` (that segment's
 * other figures) and `detail` (the bar's own hover); none when the answer carries no split. */
export function flowRepoParts(body: FlowsBody, segments: readonly RepoSegment[] | undefined, key: string, format: (value: number) => string,
  bar: string, measure: string, detail: string, extra?: (segment: RepoSegment) => string): BarPart[] {
  return (segments ?? []).flatMap(segment => {
    const value = segment[key]
    if (typeof value !== 'number' || value <= 0) return []
    const name = repoName(body.repo_order, segment.repo)
    return [{ value, tone: 'muted' as const, key: `repo:${segment.repo}`, repo: repoColour(body.repo_order, segment.repo),
      hover: repoHover({ bar, repo: segment.repo, name, value: format(value), share: segment.share?.[key] ?? null,
        ofRepo: segment.of_repo?.[key] ?? null, measure }) + (extra ? ` ${extra(segment)}` : '') + (detail ? ` ${detail}` : '') }]
  })
}
const segmentCost = (segment: RepoSegment) =>
  `${money(typeof segment.cost_usd === 'number' ? segment.cost_usd : null)} at list price.`
const sessions = (value: number) => plural(value, 'session')

/** Per outcome, its sessions in a segment per repository: the second bar under "how sessions ended". */
export function endingRepoRows(body: FlowsBody): BarRow[] {
  return OUTCOMES.filter(outcome => body.endings[outcome].repos?.length && body.endings[outcome].sessions).map(outcome => {
    const ending = body.endings[outcome], hover = outcomeHover(body, outcome)
    return { key: outcome, name: OUTCOME_LABELS[outcome], sub: money(ending.cost_usd),
      parts: flowRepoParts(body, ending.repos, 'sessions', sessions, OUTCOME_LABELS[outcome], 'sessions', `${hover}.`, segmentCost),
      text: plural(ending.sessions, 'session'), hover }
  })
}
export const endingLegend: BarLegend = OUTCOMES.map(outcome => ({ tone: OUTCOME_TONES[outcome], label: OUTCOME_LABELS[outcome] }))

/** Per outcome, the main agent's last step: sessions and list price. */
export function lastStepRows(body: FlowsBody, outcome: FlowOutcome): BarRow[] {
  const ending = body.endings[outcome]
  return ending.last_steps.slice(0, SHOWN).map(item => {
    const hover = `${OUTCOME_LABELS[outcome]}, last step ${step(item.step)}: ${fmtNum(item.sessions)} of ${plural(ending.sessions, 'session')} ` +
      `(${share(ratio(item.sessions, ending.sessions))}), ${money(item.cost_usd)} at list price`
    const parts = item.repos?.length
      ? flowRepoParts(body, item.repos, 'sessions', sessions, `${OUTCOME_LABELS[outcome]}, last step ${step(item.step)}`, 'sessions',
        `${hover}.`, segmentCost)
      : [{ value: item.sessions, tone: OUTCOME_TONES[outcome], hover }]
    return { key: item.step, name: step(item.step), parts,
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
      parts: cycle.repos?.length ? flowRepoParts(body, cycle.repos, 'seconds', workTime, cycleName(cycle.pair), 'working time', hover)
        : [{ value: cycle.seconds, tone: 'c1', hover }],
      text: `${workTime(cycle.seconds)} (${share(cycle.time_share)})`, hover }
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
    const parts = path.repos?.length ? flowRepoParts(body, path.repos, 'sessions', sessions, stepPath(path.steps), 'sessions', `${hover}.`)
      : [{ value: path.sessions, tone: which === 'first' ? 'c1' as const : 'c2' as const, hover }]
    return { key: path.steps.join('-'), name: stepPath(path.steps), parts,
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

/** Per project, its sessions in a segment per repository: the second chart under the split by how they ended. */
export function projectRepoRows(body: FlowsBody): BarRow[] {
  return projectRows(body).flatMap(row => {
    const project = body.projects.find(item => item.project === row.key)
    if (!project?.repos?.length) return []
    const extra = (segment: RepoSegment) => `Of them ${fmtNum(Number(segment.committed ?? 0))} committed, ${fmtNum(Number(segment.changed ?? 0))} ` +
      `changed files without a commit, ${fmtNum(Number(segment.no_change ?? 0))} changed no file.`
    return [{ ...row, parts: flowRepoParts(body, project.repos, 'sessions', sessions, row.name, 'sessions', `${row.hover}.`, extra),
      text: plural(project.sessions, 'session') }]
  })
}

/** Per tool: its calls, sessions, working time and recognised test runs. */
export function flowToolRows(body: FlowsBody, label: Label): BarRow[] {
  return body.tools.map(tool => {
    const hover = `${label(tool.tool)}: ${plural(tool.calls, 'tool call')} in ${plural(tool.sessions, 'session')}, working time ` +
      `${workTime(tool.seconds)}, ${plural(tool.test_runs, 'recognised test run')}`
    const parts = tool.repos?.length ? flowRepoParts(body, tool.repos, 'calls', value => plural(value, 'tool call'), label(tool.tool),
      'tool calls', `${hover}.`, segment => `Working time ${workTime(typeof segment.seconds === 'number' ? segment.seconds : null)}.`)
      : [{ value: tool.calls, tone: 'c1' as const, hover }]
    return { key: tool.tool, name: label(tool.tool), sub: plural(tool.sessions, 'session'), parts,
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
