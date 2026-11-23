// ─── Insights — the payloads of /api/board/insights/* and the finding each card states ─
// The server returns None for a figure the source does not report; every sentence here says
// "not reported" for it and never reads it as zero.
import { createSignal, untrack } from 'solid-js'
import { fmtBytes, fmtHours, fmtMs, fmtN, fmtNum, fmtShare, fmtTimes, fmtUsd, projectName } from '../../design/format'
import { parseFilters, RANGES, windowOf } from '../../data/filters'
import type { QueryBlock } from '../overview/b/patternsModel'

export type { QueryBlock }
export type CardId = 'pause' | 'carry' | 'subagents' | 'failures' | 'rereads' | 'time' | 'context' | 'orientation'
export type Bucket = 'under_1m' | '1_5m' | '5_60m' | 'over_60m'
export type Outcome = 'identical_failed' | 'identical_succeeded' | 'changed_failed' | 'changed_succeeded' | 'other_tool'
type Num = number | null
export type InsightSession = { session_id: string; node_id?: string | null; tool?: string | null } & Record<string, unknown>

type Base<C extends CardId> = {
  card: C; view: string; range: { since: number; until: number }
  data_range: { first_ts: Num; last_ts: Num }; computed_at: number; query: QueryBlock
  sessions: InsightSession[]; tool_labels?: Record<string, string>; node_scope?: { kind: string; node_id: string | null }
}
export type PauseCell = { bucket: Bucket; requests: number; priced: number; cache_hit_share: Num; avg_cost_usd: Num; cost_usd: Num }
export type PauseBody = Base<'pause'> & {
  tools: { tool: string; cache_reported: boolean; buckets: PauseCell[] }[]
  summary: { tools: string[]; requests: number; cost_usd: Num; baseline_usd: Num; extra_usd: Num; not_reported: string[] }
}
export type CarryName = { tool: string; tool_name: string; calls: number; output_bytes: number; carried_bytes: number; avg_later_requests: Num }
export type CarryBody = Base<'carry'> & {
  tool_names: CarryName[]
  tools: { tool: string; calls: number; reported: number; output_bytes: Num; carried_bytes: Num }[]
  summary: { output_bytes: Num; carried_bytes: Num; top: CarryName | null; not_reported: string[] }
}
type Side = { requests: number; priced: number; cost_usd: Num }
export type SubagentTool = { tool: string; main: Side; subagents: Side & { agents: number }; subagent_share: Num }
export type SubagentBody = Base<'subagents'> & {
  tools: SubagentTool[]
  summary: { main_cost_usd: Num; subagent_cost_usd: Num; subagent_share: Num; subagents: number; subagent_requests: number }
}
export type FailureTool = {
  tool: string; calls: number; failures: number; last_failures: number; outcomes: Record<Outcome, number>
  streaks: number; streak_calls: number; longest: Num
}
export type FailureBody = Base<'failures'> & {
  tools: FailureTool[]
  summary: { failures: number; followed: number; streaks: number; streak_calls: number; longest: Num } & Record<Outcome, number>
}
export type RereadTool = {
  tool: string; reads: number; repeat_reads: number; repeat_share: Num; files: number; files_5plus: number
  most_reads: number; repeat_bytes: Num; unmatched: number
}
export type RereadBody = Base<'rereads'> & {
  tools: RereadTool[]
  summary: { reads: number; repeat_reads: number; repeat_share: Num; files_5plus: number; repeat_bytes: Num; unmatched: number }
}
export type TimeTool = {
  tool: string; requests: number; untimed_requests: number; overlong_requests: number; model_ms: Num; thinking_ms: Num
  calls: number; untimed_calls: number; overlong_calls: number; overlong_ms: number; tool_ms: Num
}
export type ProgramGroup = 'program' | 'shell' | 'waiting' | 'unrecorded'
export type TimeProgram = {
  group: ProgramGroup; program: string | null; calls: number; untimed: number; overlong: number
  duration_ms: Num; p50_ms: Num; p95_ms: Num; failure_share: Num
}
export type TimeBody = Base<'time'> & {
  tools: TimeTool[]; programs: TimeProgram[]
  summary: {
    model_ms: Num; thinking_ms: Num; tool_ms: Num; thinking_reported: string[]; untimed_requests: number
    untimed_calls: number; overlong: number; overlong_ms: number; top_program: TimeProgram | null
  }
}
export type ContextBucket = 'under_50k' | '50_100k' | '100_200k' | '200_500k' | 'over_500k'
export type ContextCell = { bucket: ContextBucket; requests: number; priced: number; cost_usd: Num; request_share: Num; cost_share: Num }
export type ContextTool = {
  tool: string; requests: number; reported: number; p50_context: Num; p90_context: Num; cost_usd: Num; buckets: ContextCell[]
  heavy_requests: number; heavy_cost_usd: Num; small_requests: Num; small_cost_usd: Num
}
export type ContextBody = Base<'context'> & {
  tools: ContextTool[]
  summary: {
    reported: number; heavy_requests: number; heavy_share: Num; cost_usd: Num; heavy_cost_usd: Num; heavy_cost_share: Num
    small_requests: Num; small_cost_usd: Num; not_reported: string[]
  }
}
export type OrientationProject = { project_path: string; sessions: number; tools: string[]; p50_requests: Num; p50_cost_usd: Num }
export type OrientationTool = {
  tool: string; sessions: number; edited: number; no_project: number; p50_requests: Num; never: number; never_requests: number
  never_cost_usd: Num
}
export type OrientationBody = Base<'orientation'> & {
  projects: OrientationProject[]; tools: OrientationTool[]
  summary: { sessions: number; edited: number; projects: number; never: number; never_cost_usd: Num; no_project: number }
}
export type InsightBody = PauseBody | CarryBody | SubagentBody | FailureBody | RereadBody | TimeBody | ContextBody | OrientationBody

export const BUCKET_LABELS: Record<Bucket, string> = {
  under_1m: 'under 1 min', '1_5m': '1–5 min', '5_60m': '5–60 min', over_60m: 'over 60 min',
}
export const OUTCOME_LABELS: Record<Outcome, string> = {
  identical_failed: 'Identical call, failed again',
  identical_succeeded: 'Identical call, succeeded',
  changed_failed: 'Same tool changed, failed again',
  changed_succeeded: 'Same tool changed, succeeded',
  other_tool: 'Different tool',
}
export const OUTCOMES = Object.keys(OUTCOME_LABELS) as Outcome[]
export const NOT_REPORTED = 'not reported'

/** The range choices of the Insights screen: the board's ranges and all stored history. */
export const INSIGHT_RANGES = [...RANGES.map(range => ({ id: range.id, label: range.label })), { id: 'all', label: 'All history' }]
const HOUR = 3600

/** The period of the screen from the URL key `range`: the board's window, or all history up to the next hour. */
export function insightWindow(search: string, nowS: number) {
  const id = new URLSearchParams(search).get('range')
  if (id === 'all') return { id, since: 0, until: Math.ceil(nowS / HOUR) * HOUR }
  const range = parseFilters(search).range
  const win = windowOf(range, nowS)
  return { id: range.id, since: win.since, until: win.until }
}

export const money = (value: Num) => value == null ? NOT_REPORTED : fmtUsd(value)
export const bytes = (value: Num) => value == null ? NOT_REPORTED : fmtBytes(value)
export const share = (value: Num) => value == null ? NOT_REPORTED : fmtShare(value)
export const count = (value: Num) => value == null ? NOT_REPORTED : fmtNum(value)
const list = (items: readonly string[]) => items.length < 2 ? items.join('') :
  `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
export type Label = (tool: string) => string

const [toolLabels, setToolLabels] = createSignal<Record<string, string>>({})
/** The tool labels a card's answer carried: the board's labels are not loaded on this screen. */
export function learnToolLabels(labels: Record<string, string> | undefined) {
  if (labels && Object.entries(labels).some(([tool, label]) => untrack(toolLabels)[tool] !== label)) setToolLabels(known => ({ ...known, ...labels }))
}
export const toolLabel: Label = tool => toolLabels()[tool] ?? tool

export function pauseFinding(body: PauseBody, label: Label) {
  const s = body.summary
  if (!s.tools.length) {
    return s.not_reported.length && body.tools.every(tool => !tool.cache_reported)
      ? `The sources in this period do not report cache writes (${list(s.not_reported.map(label))}), so the cost of a lapsed cache cannot be shown.`
      : 'No priced request followed a pause in this period.'
  }
  const sentence = `${fmtNum(s.requests)} ${list(s.tools.map(label))} requests followed a pause of over 5 minutes and cost ` +
    `${money(s.cost_usd)} at list price; the same number at each tool's under-1-minute average would cost ${money(s.baseline_usd)}.`
  return s.requests ? sentence : `No ${list(s.tools.map(label))} request followed a pause of over 5 minutes in this period.`
}

export function carryFinding(body: CarryBody, label: Label) {
  const s = body.summary
  if (s.carried_bytes == null || !s.top) return 'No tool result with a reported size in this period.'
  const top = s.top
  return `Tool results of ${bytes(s.output_bytes)} were sent again with later requests, up to ${bytes(s.carried_bytes)} in all; ` +
    `${top.tool_name} (${label(top.tool)}) alone produced ${bytes(top.output_bytes)} and carried up to ${bytes(top.carried_bytes)}.`
}

export function subagentFinding(body: SubagentBody, label: Label) {
  const s = body.summary
  if (!s.subagents) return 'No subagent ran in this period.'
  const top = [...body.tools].filter(tool => tool.subagents.agents).sort((a, b) =>
    (b.subagents.cost_usd ?? 0) - (a.subagents.cost_usd ?? 0))[0]
  return `${fmtNum(s.subagents)} subagents made ${fmtNum(s.subagent_requests)} requests costing ${money(s.subagent_cost_usd)} at list price, ` +
    `${share(s.subagent_share)} of all cost` +
    (top ? `; in ${label(top.tool)}, subagents were ${share(top.subagent_share)} of its cost.` : '.')
}

export function failureFinding(body: FailureBody, label: Label) {
  const s = body.summary
  if (!s.failures) return 'No tool call failed in this period.'
  const most = body.tools.filter(tool => tool.outcomes.identical_failed > 0)
    .sort((a, b) => b.outcomes.identical_failed - a.outcomes.identical_failed).slice(0, 2)
    .map(tool => `${label(tool.tool)} ${fmtNum(tool.outcomes.identical_failed)}`)
  return `After ${fmtNum(s.followed)} failed calls, the next call repeated the identical call ${fmtNum(s.identical_failed + s.identical_succeeded)} times ` +
    `and it failed again ${fmtNum(s.identical_failed)} times${most.length ? ` (${most.join(', ')})` : ''}; ` +
    `${fmtNum(s.streaks)} runs of 3 or more failures in a row, the longest ${count(s.longest)} calls.`
}

export function rereadFinding(body: RereadBody) {
  const s = body.summary
  if (!s.reads) return 'No file read with a recorded path in this period.'
  return `${share(s.repeat_share)} of file reads (${fmtNum(s.repeat_reads)} of ${fmtNum(s.reads)}) read a file the same agent had already read; ` +
    `${fmtNum(s.files_5plus)} files were read 5 times or more, and the repeated reads returned ${bytes(s.repeat_bytes)}.`
}

export const hours = (value: Num) => value == null ? NOT_REPORTED : fmtHours(value)
export const millis = (value: Num) => value == null ? NOT_REPORTED : fmtMs(value)

/** What a program row of the time card names: a program, or a group whose program is not one. */
export const PROGRAM_GROUPS: Record<Exclude<ProgramGroup, 'program'>, string> = {
  shell: 'Shell construct, program not identified',
  waiting: 'Waiting or polling (sleep, until, while, wait)',
  unrecorded: 'Command not recorded',
}
export const programName = (row: TimeProgram) => row.group === 'program' ? row.program ?? NOT_REPORTED : PROGRAM_GROUPS[row.group]

export function timeFinding(body: TimeBody, label: Label) {
  const s = body.summary
  if (s.model_ms == null && s.tool_ms == null) return 'No request or tool call with a recorded duration in this period.'
  const top = [...body.tools].sort((a, b) => ((b.model_ms ?? 0) + (b.tool_ms ?? 0)) - ((a.model_ms ?? 0) + (a.tool_ms ?? 0)))[0]
  const thinking = top.thinking_ms == null ? 'thinking not reported' : `${hours(top.thinking_ms)} of it thinking`
  const program = s.top_program
  return `Agents spent ${hours(s.model_ms)} in model requests and ${hours(s.tool_ms)} in their own tool calls (summed durations); ` +
    `${label(top.tool)}: ${hours(top.model_ms)} model (${thinking}) against ${hours(top.tool_ms)} tools.` +
    (program ? ` The program with the most time is ${programName(program)}: ${hours(program.duration_ms)} over ${fmtNum(program.calls)} calls, ` +
      `95th percentile ${millis(program.p95_ms)}.` : '')
}

export const CONTEXT_LABELS: Record<ContextBucket, string> = {
  under_50k: 'under 50k', '50_100k': '50k–100k', '100_200k': '100k–200k', '200_500k': '200k–500k', over_500k: '500k and more',
}
export const CONTEXT_BUCKETS = Object.keys(CONTEXT_LABELS) as ContextBucket[]
/** The small-step limit the view applies, stated wherever the figure is shown. */
export const SMALL_STEP_OUTPUT = 150
export const tokens = (value: Num) => value == null ? NOT_REPORTED : `${fmtN(value)} tokens`

export function contextFinding(body: ContextBody, label: Label) {
  const s = body.summary
  if (!s.reported) {
    return s.not_reported.length ? `The sources in this period do not report token counts (${list(s.not_reported.map(label))}).`
      : 'No model request in this period.'
  }
  const heavy = `${share(s.heavy_share)} of requests (${fmtNum(s.heavy_requests)} of ${fmtNum(s.reported)}) read a context of 200k tokens or more ` +
    `and carried ${share(s.heavy_cost_share)} of the cost (${money(s.heavy_cost_usd)} of ${money(s.cost_usd)} at list price).`
  return `${heavy} Small steps, requests with under ${SMALL_STEP_OUTPUT} output tokens and no thinking time, were ` +
    `${count(s.small_requests)} requests costing ${money(s.small_cost_usd)}.`
}

export function orientationFinding(body: OrientationBody) {
  const s = body.summary
  const never = s.never ? ` ${fmtNum(s.never)} sessions never edited; they cost ${money(s.never_cost_usd)}.` : ''
  if (!s.sessions) return 'No session started in this period.'
  const top = body.projects[0]
  if (!top) return `No project has 3 or more sessions that edit in this period.${never}`
  const medians = body.projects.map(row => row.p50_requests).filter((value): value is number => value != null)
  const range = body.projects.length > 1 && medians.length
    ? ` Across ${fmtNum(body.projects.length)} projects the median runs from ${fmtNum(Math.min(...medians))} to ${fmtNum(Math.max(...medians))} requests.` : ''
  return `${projectName(top.project_path)} has the most sessions that edit (${fmtNum(top.sessions)}); the median one made ` +
    `${count(top.p50_requests)} requests costing ${money(top.p50_cost_usd)} before its first edit.${range}${never}`
}

/** The wider bar of a pair sets the scale: a share from 0 to 1 of the largest value. */
export const scaled = (value: Num, largest: number) => value == null || largest <= 0 ? 0 : Math.max(0, value / largest)

export const OUTCOME_SHORT: Record<Outcome, string> = {
  identical_failed: 'Same call, failed again', identical_succeeded: 'Same call, succeeded',
  changed_failed: 'Changed, failed again', changed_succeeded: 'Changed, succeeded', other_tool: 'Other tool',
}
export type FlowBand = { outcome: Outcome; index: number; calls: number; left: [number, number]; right: [number, number]; labelY: number }

/**
 * The bands of a flow from failed calls (left) to what came next (right): one band per outcome with calls,
 * the same thickness on both sides, outcomes apart by *gap* on the right and labels at least *line* apart.
 */
export function flowBands(outcomes: Record<Outcome, number>, top: number, height: number, gap = 6, line = 13): FlowBand[] {
  const present = OUTCOMES.map((outcome, index) => ({ outcome, index, calls: outcomes[outcome] ?? 0 })).filter(item => item.calls > 0)
  const total = present.reduce((sum, item) => sum + item.calls, 0)
  if (!total) return []
  const scale = Math.max(0, height - gap * (present.length - 1)) / total
  let left = top + (height - total * scale) / 2, right = top, label = -Infinity
  return present.map(item => {
    const size = item.calls * scale
    const band: FlowBand = { ...item, left: [left, left + size], right: [right, right + size],
      labelY: Math.max(right + size / 2 + 4, label + line) }
    label = band.labelY
    left += size
    right += size + gap
    return band
  })
}

/** The one figure a card leads with, and what it is a figure of; none when the source does not report its parts. */
export type Hero = { value: string; label: string }
const ratio = (part: Num, whole: Num) => part != null && whole != null && whole > 0 ? part / whole : null
const hero = (value: Num, format: (value: number) => string, label: string): Hero | undefined =>
  value == null ? undefined : { value: format(value), label }

export const pauseHero = (body: PauseBody) => hero(ratio(body.summary.cost_usd, body.summary.baseline_usd), fmtTimes,
  'the cost of requests that followed a pause of over 5 minutes, against the same requests with no pause')
export const carryHero = (body: CarryBody) => hero(ratio(body.summary.carried_bytes, body.summary.output_bytes), fmtTimes,
  'how often a byte of a tool result was sent again with later requests (upper bound)')
export const subagentHero = (body: SubagentBody) => hero(body.summary.subagent_share, fmtShare,
  'of the cost was spent in subagents')
export const failureHero = (body: FailureBody) => body.summary.failures
  ? hero(body.summary.streaks, fmtNum, 'runs of 3 or more failed calls in a row') : undefined
export const rereadHero = (body: RereadBody) => hero(body.summary.repeat_share, fmtShare,
  'of file reads read a file the same agent had already read')
export const timeHero = (body: TimeBody) => hero(
  body.summary.model_ms == null || body.summary.tool_ms == null ? null
    : ratio(body.summary.tool_ms, body.summary.model_ms + body.summary.tool_ms), fmtShare,
  'of agent time went to its own tool calls, the rest to the model (summed durations)')
export const contextHero = (body: ContextBody) => hero(body.summary.heavy_cost_share, fmtShare,
  'of the cost is in requests that read a context of 200k tokens or more')
export function orientationHero(body: OrientationBody) {
  const most = body.projects.map(project => project.p50_requests).filter((value): value is number => value != null)
  return most.length ? hero(Math.max(...most), fmtNum,
    'requests before the first edit in the median session of the repository that takes longest to start in') : undefined
}
