// ─── Flows — the payload of /api/board/insights/flows, the sentence it states and the rows of its charts ─
// A group with too little data is listed by the server as too small and never gets its own bar.
import { fmtNum, fmtShare, projectName } from '../../design/format'
import type { FlowLink, FlowNode } from './charts/FlowDiagram'
import type { HeatColumn, HeatRow } from './charts/HeatGrid'
import { axisText, barTop, type BarLegend, type BarPart, type BarRow, type BarTone } from './flowBarModel'
import { hours, money, plural, share, type Base, type Label } from './insightsModel'
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

/** The one line under the title: what the view measures, in technical terms; no figure, no comparison. */
export function flowsFinding(body: FlowsBody) {
  if (!body.summary.sessions) return 'No tool call in this period.'
  return 'Each tool call is one step (read, edit, test run, commit, …); counts are sessions, calls and working time of the ' +
    'sessions with a tool call in the period.'
}

/** Under the charts when the period has too few sessions to compare: the count and the minimum. */
export const fewSessions = (body: FlowsBody) => body.summary.sessions && !body.summary.enough
  ? `${plural(body.summary.sessions, 'session')} in this period, fewer than the ${MIN_SESSIONS} the view needs to compare.` : ''

const endedTotal = (body: FlowsBody) => OUTCOMES.reduce((sum, outcome) => sum + body.endings[outcome].sessions, 0)

/** Hover text of one outcome: its sessions with their share of all ended sessions, and their list price. */
export function outcomeHover(body: FlowsBody, outcome: FlowOutcome) {
  const ending = body.endings[outcome], total = endedTotal(body)
  return `${OUTCOME_LABELS[outcome]}: ${fmtNum(ending.sessions)} of ${plural(total, 'session')} (${share(ratio(ending.sessions, total))}), ` +
    `${money(ending.cost_usd)} at list price`
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
      `All cycles together: ${workTime(body.summary.cycle_seconds)} (${share(body.summary.cycle_share)}). ` +
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

// ─── The full-width view: the flow from last step to ending, the transition grid, and one encoding at a time ─

/**
 * "By repository: app 20 (71% of these, 80% of its own; $120), docs 8 (29% of these; $30)." for one measure of a mark's
 * segments, with each segment's list price where it carries one; '' when the mark is not split.
 */
export function repoBreakdown(body: FlowsBody, segments: readonly RepoSegment[] | undefined, key: string, format: (value: number) => string) {
  const parts = (segments ?? []).flatMap(segment => {
    const value = segment[key]
    if (typeof value !== 'number' || value <= 0) return []
    const part = segment.share?.[key], own = segment.of_repo?.[key]
    const shares = [part == null ? '' : `${fmtShare(part)} of these`, own == null ? '' : `${fmtShare(own)} of its own`].filter(Boolean)
    const cost = typeof segment.cost_usd === 'number' ? money(segment.cost_usd) : ''
    const more = [shares.join(', '), cost].filter(Boolean).join('; ')
    return [`${repoName(body.repo_order, segment.repo)} ${format(value)}${more ? ` (${more})` : ''}`]
  })
  return parts.length ? ` By repository: ${parts.join(', ')}.` : ''
}

/** The answer with no split by repository on the bars that are drawn in one colour when the view colours by its own parts. */
export function withoutRepos(body: FlowsBody): FlowsBody {
  const strip = <T extends Split>(rows: T[]) => rows.map(row => ({ ...row, repos: undefined }))
  return { ...body, cycles: strip(body.cycles), first_paths: strip(body.first_paths), last_paths: strip(body.last_paths), tools: strip(body.tools) }
}

/** Whether any bar of the answer is split by repository: the view then offers the colour switch. */
export const flowsSplit = (body: FlowsBody) => OUTCOMES.some(outcome => body.endings[outcome].repos?.length) ||
  [...body.cycles, ...body.first_paths, ...body.last_paths, ...body.projects, ...body.tools].some(row => row.repos?.length)

const OUTCOME_COLOURS: Record<FlowOutcome, string> = {
  committed: 'var(--color-chart-3)', changed: 'var(--color-chart-1)', no_change: 'var(--color-chart-4)',
}
const OTHER_STEP = 'other'

/**
 * The sessions as a flow from the main agent's last step (left) to how the session ended (right). The server lists the
 * most frequent last steps of each ending; the rest of an ending's sessions flow from "other last steps".
 */
export function endingFlow(body: FlowsBody): { left: FlowNode[]; right: FlowNode[]; links: FlowLink[] } {
  const total = endedTotal(body)
  const links: FlowLink[] = OUTCOMES.flatMap(outcome => {
    const ending = body.endings[outcome], name = OUTCOME_LABELS[outcome].toLowerCase()
    const listed = ending.last_steps.slice(0, SHOWN)
    const rest = ending.sessions - listed.reduce((sum, item) => sum + item.sessions, 0)
    const rows = listed.map((item): FlowLink => ({
      from: item.step, to: outcome, value: item.sessions, colour: OUTCOME_COLOURS[outcome],
      hover: `Last step ${step(item.step)} → ${name}: ${fmtNum(item.sessions)} of ${plural(ending.sessions, 'session')} ` +
        `(${share(ratio(item.sessions, ending.sessions))}), ${share(ratio(item.sessions, total))} of all ${plural(total, 'session')}; ` +
        `${money(item.cost_usd)} at list price.` + repoBreakdown(body, item.repos, 'sessions', fmtNum),
    }))
    return rest > 0 ? [...rows, { from: OTHER_STEP, to: outcome, value: rest, colour: OUTCOME_COLOURS[outcome],
      hover: `Another last step → ${name}: ${fmtNum(rest)} of ${plural(ending.sessions, 'session')} ` +
        `(${share(ratio(rest, ending.sessions))}); last steps not among the ${fmtNum(listed.length)} listed for this ending.` }] : rows
  })
  const sum = (from: string) => links.filter(link => link.from === from).reduce((all, link) => all + link.value, 0)
  const steps = [...new Set(links.map(link => link.from))]
  const ordered = [...steps.filter(item => item !== OTHER_STEP).sort((a, b) => sum(b) - sum(a)), ...steps.filter(item => item === OTHER_STEP)]
  const left = ordered.map((item): FlowNode => {
    const n = sum(item), name = item === OTHER_STEP ? 'other last steps' : step(item as Step)
    const by = OUTCOMES.flatMap(outcome => {
      const value = links.find(link => link.from === item && link.to === outcome)?.value ?? 0
      return value ? [`${OUTCOME_LABELS[outcome].toLowerCase()} ${fmtNum(value)}`] : []
    })
    return { key: item, name, text: plural(n, 'session'),
      hover: `Last step ${name}: ${fmtNum(n)} of ${plural(total, 'session')} (${share(ratio(n, total))}); ${by.join(', ')}.` }
  })
  const right = OUTCOMES.filter(outcome => body.endings[outcome].sessions).map((outcome): FlowNode => {
    const ending = body.endings[outcome]
    const of = ending.cost_usd != null && body.summary.cost_usd ? ` (${share(ending.cost_usd / body.summary.cost_usd)} of ${money(body.summary.cost_usd)})` : ''
    return { key: outcome, name: OUTCOME_LABELS[outcome], colour: OUTCOME_COLOURS[outcome],
      text: `${fmtNum(ending.sessions)} · ${share(ratio(ending.sessions, total))} · ${money(ending.cost_usd)}`,
      hover: `${outcomeHover(body, outcome)}${of}.${repoBreakdown(body, ending.repos, 'sessions', fmtNum)}` }
  })
  return { left, right, links }
}

/** The transition matrix as heat-grid rows: share of the row's calls written in the cell, the count under it. */
export function transitionGrid(body: FlowsBody): { columns: HeatColumn[]; rows: HeatRow[] } {
  const matrix = transitionMatrix(body)
  return {
    columns: matrix.columns.map(column => ({ key: column, name: columnName(column),
      title: column === 'rest' ? 'Next steps not among the 4 most frequent of the row, summed' : undefined })),
    rows: matrix.rows.map(row => ({
      key: row.from, name: step(row.from), sub: plural(row.calls, 'call'),
      cells: row.cells.map(cell => cell ? { key: `${row.from}:${cell.to}`, text: fmtShare(cell.share), sub: fmtNum(cell.calls),
        level: cell.share, hover: `${cell.hover}.` } : null),
    })),
  }
}
