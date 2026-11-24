// ─── Insights — the payloads of /api/board/insights/* and the finding each card states ─
// The server returns None for a figure the source does not report; every sentence here says
// "not reported" for it and never reads it as zero.
import { createSignal, untrack } from 'solid-js'
import { fmtBytes, fmtDur, fmtHours, fmtMs, fmtN, fmtNum, fmtShare, fmtTimes, fmtUsd, projectName } from '../../design/format'
import { parseFilters, PERIODS, windowOf } from '../../data/filters'
import type { QueryBlock } from '../overview/b/patternsModel'
import type { AutonomyBody } from './autonomyModel'
import type { VerifiedBody } from './verifiedModel'
import type { ModelBody } from './modelReportModel'
import type { WorkBody, WorkCardId } from './workModel'
import type { FlowsBody } from './flowsModel'
import type { SkillsBody } from './skillsModel'
import type { McpBody } from './mcpModel'
import type { KqlBody } from './kqlModel'
import type { RepoSegment, RepoSplit } from './repoSplit'
import { sessionName } from './sessionName'

export type { QueryBlock }
export type CardId = 'pause' | 'carry' | 'subagents' | 'failures' | 'rereads' | 'time' | 'context' | 'orientation' | 'fixed' | 'problems'
  | 'autonomy' | 'verified' | 'models'
  | WorkCardId
  | 'flows'
  | 'skills'
  | 'mcp'
  | 'kql'
export type Bucket = 'under_1m' | '1_5m' | '5_60m' | 'over_60m'
export type Outcome = 'identical_failed' | 'identical_succeeded' | 'changed_failed' | 'changed_succeeded' | 'other_tool'
type Num = number | null
export type InsightSession = { session_id: string; node_id?: string | null; tool?: string | null } & Record<string, unknown>

export type Base<C extends CardId> = {
  card: C; view: string; range: { since: number; until: number }
  data_range: { first_ts: Num; last_ts: Num }; computed_at: number; query: QueryBlock
  sessions: InsightSession[]; tool_labels?: Record<string, string>; node_scope?: { kind: string; node_id: string | null }
} & RepoSplit
/** What every card's answer carries, for a card whose own types live in its own model file. */
export type InsightBase<C extends CardId> = Base<C>
export type PauseCell = {
  bucket: Bucket; requests: number; priced: number; cache_hit_share: Num; avg_cost_usd: Num; cost_usd: Num
  /** Its parts per repository (requests, priced, cost_usd), repoSplit.ts. */
  repos?: RepoSegment[]
}
export type PauseProject = {
  project: string | null; tool: string; requests: number; sessions: number; cost_usd: Num; extra_usd: Num
  /** Its parts per repository (requests, sessions, cost_usd, extra_usd), repoSplit.ts. */
  repos?: RepoSegment[]
}
export type PauseCause = 'tool_running' | 'other_agent_working' | 'person_asked' | 'new_prompt' | 'tool_short_or_untimed' | 'nothing_recorded'
/** A cause of the long pauses: its requests and cost, and its share of the long-pause cost (of one tool, or of all). */
export type PauseCauseRow = { cause: PauseCause; requests: number; priced: number; cost_usd: Num; share: Num }
/** The largest cause by cost, and the parts of the long-pause cost when the agent was busy and when it waited for the person. */
export type PauseCauseLead = {
  top: PauseCause; top_usd: number; top_share: number; cost_usd: number; busy_usd: number; busy_share: number; person_usd: number; person_share: number
}
/** A call that ran longest in a pause where a call was still running: its tool name and, for a command, its program. */
export type PauseCauseTool = {
  tool: string; tool_name: string | null; program: string | null; requests: number; cost_usd: Num; p50_call_s: Num; max_call_s: Num
  /** Its parts per repository (requests, cost_usd), repoSplit.ts. */
  repos?: RepoSegment[]
}
/**
 * A tool's requests after a pause of 5 minutes or more: measured cost and the estimate at its under-1-minute average, with
 * their parts per repository (requests, priced, cost_usd, estimate_usd: a repository's priced requests × the tool's average).
 */
export type PauseLong = { requests: number; priced: number; cost_usd: Num; estimate_usd: Num; repos?: RepoSegment[] }
export type PauseBody = Base<'pause'> & {
  tools: { tool: string; cache_reported: boolean; buckets: PauseCell[]; long_pause?: PauseLong }[]; projects?: PauseProject[]
  causes?: (PauseCauseRow & { tool: string; buckets: { bucket: Bucket; requests: number; sessions: number; cost_usd: Num }[]; repos?: RepoSegment[] })[]
  cause_tools?: PauseCauseTool[]
  summary: {
    sessions?: number; tools: string[]; requests: number; cost_usd: Num; baseline_usd: Num; extra_usd: Num; not_reported: string[]; unpriced_requests?: number
    causes?: PauseCauseRow[]; cause?: PauseCauseLead | null
  }
}
export type CarryName = {
  tool: string; tool_name: string; calls: number; output_bytes: number; carried_bytes: number; avg_later_requests: Num
  /** Its parts per repository (output_bytes, carried_bytes), repoSplit.ts. */
  repos?: RepoSegment[]
}
export type CarryBody = Base<'carry'> & {
  tool_names: CarryName[]
  tools: { tool: string; calls: number; reported: number; output_bytes: Num; carried_bytes: Num; repos?: RepoSegment[] }[]
  summary: { output_bytes: Num; carried_bytes: Num; top: CarryName | null; not_reported: string[] }
}
/** One side of a tool's requests, with its parts per repository (requests, priced, cost_usd; agents for subagents), repoSplit.ts. */
type Side = { requests: number; priced: number; cost_usd: Num; repos?: RepoSegment[] }
export type SubagentTool = { tool: string; main: Side; subagents: Side & { agents: number }; subagent_share: Num }
export type SubagentBody = Base<'subagents'> & {
  tools: SubagentTool[]
  summary: { main_cost_usd: Num; subagent_cost_usd: Num; subagent_share: Num; subagents: number; subagent_requests: number; unpriced_requests?: number }
}
export type FailureTool = {
  tool: string; calls: number; failures: number; last_failures: number; outcomes: Record<Outcome, number>
  streaks: number; streak_calls: number; longest: Num
  /** Its parts per repository (calls, failures, last_failures, streaks, streak_calls and the five outcomes), repoSplit.ts. */
  repos?: RepoSegment[]
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
  /** Requests that report reasoning tokens (0 when none), their reasoning and output tokens, and reasoning / output. */
  reasoning_requests?: number; reasoning_tokens?: Num; reasoning_output_tokens?: Num; reasoning_share?: Num
  /** Model plus tool-call time, and its parts per repository (time_ms, model_ms, tool_ms), repoSplit.ts. */
  time_ms?: Num; repos?: RepoSegment[]
}
export type ProgramGroup = 'program' | 'shell' | 'waiting' | 'unrecorded'
export type TimeProgram = {
  group: ProgramGroup; program: string | null; calls: number; untimed: number; overlong: number
  duration_ms: Num; p50_ms: Num; p95_ms: Num; failure_share: Num
  /** Its summed time per repository (duration_ms), repoSplit.ts. */
  repos?: RepoSegment[]
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
    small_requests: Num; small_cost_usd: Num; not_reported: string[]; unpriced_requests?: number
  }
}
export type OrientationProject = { project_path: string; sessions: number; tools: string[]; p50_requests: Num; p50_cost_usd: Num }
export type OrientationTool = {
  tool: string; sessions: number; edited: number; no_project: number; p50_requests: Num; never: number; never_requests: number
  never_cost_usd: Num
}
export type OrientationBody = Base<'orientation'> & {
  projects: OrientationProject[]; tools: OrientationTool[]
  summary: { sessions: number; edited: number; projects: number; never: number; never_cost_usd: Num; no_project: number; unpriced_requests?: number }
}
export type FixedKind = 'instruction_file' | 'memory_file' | 'system_prompt_other' | 'skills' | 'mcp_instructions' | 'custom_agents' | 'tools_listed'
export type FixedCell = {
  kind: FixedKind; reported: boolean; sessions: Num; session_share: Num; p50_tokens: Num; avg_tokens: Num; p50_items: Num; estimated: boolean
}
export type FixedTool = {
  tool: string; sessions: number; p50_tokens: Num; p90_tokens: Num; avg_tokens: Num; p50_skills: Num; estimated: boolean; kinds: FixedCell[]
}
export type FixedSkills = {
  tool: string; listed: Num; used: Num; listing_tokens: Num; unused_tokens: Num; uses: number; skills_used: number; triggers: string[]
}
export type FixedSkill = { tool: string; name: string; sessions: number; tokens: number; uses: number }
export type FixedFile = { tool: string; file: string; sessions: number; loads: number; avg_tokens: Num; max_tokens: Num; tokens: number }
export type FixedBody = Base<'fixed'> & {
  tools: FixedTool[]; skills: FixedSkills[]; top_skills: FixedSkill[]; files: FixedFile[]
  summary: {
    sessions: number; heaviest: { tool: string; p50_tokens: number } | null; listed: Num; never_used: Num; never_used_share: Num
    listing_tokens: Num; unused_tokens: Num; listing_not_reported: string[]
  }
}
export type Signal = 'compaction' | 'failure_streak' | 'failed_delegation' | 'api_error' | 'open_todos' | 'hook_failure'
export type SignalCell = {
  signal: Signal; reported: boolean; sessions: Num; share: Num; cost_usd: Num
  /** Its parts per repository (sessions, cost_usd); empty for a signal the tool does not report. */
  repos?: RepoSegment[]
}
export type ProblemTool = {
  tool: string; sessions: number; reports: boolean; flagged: Num; multi: Num; flagged_cost_usd: Num; cost_usd: Num; signals: SignalCell[]
  /** Its parts per repository (sessions, flagged, multi, cost_usd, flagged_cost_usd), repoSplit.ts. */
  repos?: RepoSegment[]
}
export type ProblemPair = { signals: [Signal, Signal]; sessions: number; cost_usd: Num; repos?: RepoSegment[] }
export type ProblemProject = {
  project: string; sessions: number; all_sessions: number; tools: string[]; cost_usd: Num; signals?: Record<Signal, number>
}
/** Every flagged session outside the card's top projects (other projects and sessions with no project), summed. */
export type ProblemOther = { sessions: number; cost_usd: Num; signals: Partial<Record<Signal, number>> }
export type ProblemBody = Base<'problems'> & {
  tools: ProblemTool[]; signals: { signal: Signal; tools: string[]; sessions: Num; share: Num }[]
  pairs: ProblemPair[]; projects: ProblemProject[]; other_projects?: ProblemOther
  summary: { sessions: number; flagged: number; flagged_share: Num; multi: number; flagged_cost_usd: Num; not_reporting: string[] }
}
export type InsightBody = PauseBody | CarryBody | SubagentBody | FailureBody | RereadBody | TimeBody | ContextBody | OrientationBody | FixedBody
  | ProblemBody
  | AutonomyBody
  | VerifiedBody
  | ModelBody
  | WorkBody
  | FlowsBody
  | SkillsBody
  | McpBody
  | KqlBody

export const BUCKET_LABELS: Record<Bucket, string> = {
  under_1m: 'under 1 min', '1_5m': '1–5 min', '5_60m': '5–60 min', over_60m: 'over 60 min',
}
export const OUTCOME_LABELS: Record<Outcome, string> = {
  identical_failed: 'Identical call, failed',
  identical_succeeded: 'Identical call, succeeded',
  changed_failed: 'Changed call, failed',
  changed_succeeded: 'Changed call, succeeded',
  other_tool: 'Another tool',
}
export const OUTCOMES = Object.keys(OUTCOME_LABELS) as Outcome[]
export const NOT_REPORTED = 'not reported'

/** The range choices of the Insights screen: the board's choices, all stored history among them. */
export const INSIGHT_RANGES = PERIODS
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

/** What a cost in a card's sentence leaves out: requests whose model had no list price when they were stored. */
export function leftOut(requests: number | undefined) {
  return requests ? ` ${fmtNum(requests)} ${requests === 1 ? 'request' : 'requests'} with no known cost ${requests === 1 ? 'is' : 'are'} left out of the cost.` : ''
}

export const PAUSE_CAUSES: readonly PauseCause[] = ['tool_running', 'other_agent_working', 'person_asked', 'new_prompt',
  'tool_short_or_untimed', 'nothing_recorded']
/** What the session recorded in a long pause, in the order the view tests it: the first that holds is the cause. */
export const CAUSE_LABELS: Record<PauseCause, string> = {
  tool_running: 'A call still running', other_agent_working: 'Another agent working', person_asked: 'Waiting for an approval or answer',
  new_prompt: 'A new prompt', tool_short_or_untimed: 'Short or untimed calls', nothing_recorded: 'Nothing recorded',
}
/** What the session recorded in a pause for each cause, in one plain sentence part. */
export const CAUSE_MEANING: Record<PauseCause, string> = {
  tool_running: 'a call of the agent ran for at least half the pause', other_agent_working: 'another agent of the session made requests',
  person_asked: 'a call waited for an approval or an answer', new_prompt: 'a prompt arrived',
  tool_short_or_untimed: 'the calls recorded ran for less than half the pause, or have no duration',
  nothing_recorded: 'no call, prompt or other agent was recorded in the pause',
}
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/** The long-pause cost by what was recorded in the pause, as the card and the findings list both word it; empty without one. */
export function causeText(cause: PauseCauseLead | null | undefined) {
  if (!cause) return ''
  return ` Of the ${money(cause.cost_usd)} after these pauses, the largest part by what the pause recorded is ` +
    `${lower(CAUSE_LABELS[cause.top])}: ${money(cause.top_usd)} (${fmtShare(cause.top_share)}). Pauses with a call running ` +
    `or another agent working: ${money(cause.busy_usd)} (${fmtShare(cause.busy_share)}); pauses with a new prompt, an ` +
    `approval or an answer: ${money(cause.person_usd)} (${fmtShare(cause.person_share)}).`
}

/** The long-pause cost of each compared tool by cause, in the order of the causes, with the tool's total. */
export function pauseCauseBars(body: PauseBody) {
  const rows = body.causes ?? []
  return body.tools.map(tool => {
    const mine = rows.filter(row => row.tool === tool.tool)
    const total = mine.reduce((sum, row) => sum + (row.cost_usd ?? 0), 0)
    const requests = mine.reduce((sum, row) => sum + row.requests, 0)
    const causes = PAUSE_CAUSES.map(cause => mine.find(row => row.cause === cause)).filter(row => row != null)
    return { tool: tool.tool, total, requests, causes }
  }).filter(row => row.requests > 0)
}

export function pauseFinding(body: PauseBody, label: Label) {
  const s = body.summary
  if (!s.tools.length) {
    return s.not_reported.length && body.tools.every(tool => !tool.cache_reported)
      ? `The sources in this period do not report cache writes (${list(s.not_reported.map(label))}); their cost after a pause is not compared.`
      : 'No priced request followed a pause in this period.'
  }
  const named = s.tools.filter(tool => body.tools.some(row => row.tool === tool))
  const sentence = `${fmtNum(s.requests)} ${list(named.map(label))} requests followed a pause of 5 minutes or more and cost ` +
    `${money(s.cost_usd)} at list price. Estimate for the same requests at each tool's average cost per request after a pause ` +
    `under 1 minute: ${money(s.baseline_usd)}, a difference of ${money(s.extra_usd)}.`
  return s.requests ? sentence + leftOut(s.unpriced_requests) + causeText(s.cause)
    : `No ${list(named.map(label))} request followed a pause of 5 minutes or more in this period.`
}

export const BUCKETS = Object.keys(BUCKET_LABELS) as Bucket[]
/** The rule that puts a request in a pause bucket. */
export const BUCKET_RULES: Record<Bucket, string> = {
  under_1m: 'pause under 1 minute', '1_5m': 'pause from 1 to under 5 minutes', '5_60m': 'pause from 5 to under 60 minutes',
  over_60m: 'pause of 60 minutes or more',
}
const LONG_BUCKETS: readonly Bucket[] = ['5_60m', 'over_60m']
type PauseTool = PauseBody['tools'][number]
const sumOf = <T,>(rows: readonly T[], read: (row: T) => Num) => rows.some(row => read(row) != null)
  ? rows.reduce((sum, row) => sum + (read(row) ?? 0), 0) : null

/** The hover of one pause bucket of one tool: its requests and cost with their shares of the tool, its average and cache hits. */
export function pauseBucketHover(tool: PauseTool, cell: PauseCell, label: Label) {
  const requests = tool.buckets.reduce((sum, row) => sum + row.requests, 0)
  const cost = sumOf(tool.buckets, row => row.cost_usd)
  return `${label(tool.tool)}, ${BUCKET_RULES[cell.bucket]}: ${plural(cell.requests, 'request')} (${share(ratio(cell.requests, requests))} of ` +
    `${fmtNum(requests)}), ${money(cell.cost_usd)} at list price (${share(ratio(cell.cost_usd, cost))} of ${money(cost)}), ` +
    `${money(cell.avg_cost_usd)} per request over ${fmtNum(cell.priced)} priced, cache hits ${share(cell.cache_hit_share)} of input` +
    (tool.cache_reported ? '.' : '; this source reports no cache writes.')
}

/** One tool's requests after a pause of 5 minutes or more: measured cost, and the estimate at its under-1-minute average. */
export function pauseEstimate(tool: PauseTool) {
  const long = tool.buckets.filter(cell => LONG_BUCKETS.includes(cell.bucket))
  const priced = long.reduce((sum, cell) => sum + cell.priced, 0)
  const average = tool.buckets.find(cell => cell.bucket === 'under_1m')?.avg_cost_usd ?? null
  const cost = sumOf(long, cell => cell.cost_usd)
  const estimate = average == null ? null : priced * average
  return { requests: long.reduce((sum, cell) => sum + cell.requests, 0), priced, average, cost, estimate,
    difference: cost == null || estimate == null ? null : cost - estimate }
}

/** The estimate of one tool with its formula: the what-if is not measured, so the hover says how it is computed. */
export function pauseEstimateHover(tool: PauseTool, label: Label) {
  const e = pauseEstimate(tool)
  return `${label(tool.tool)}, estimate: ${fmtNum(e.priced)} priced requests after a pause of 5 minutes or more × ${money(e.average)}, ` +
    `the tool's average cost per request after a pause under 1 minute = ${money(e.estimate)}. Measured cost of the same requests: ` +
    `${money(e.cost)}; difference ${money(e.difference)}.`
}
export function pauseMeasuredHover(tool: PauseTool, label: Label) {
  const e = pauseEstimate(tool)
  return `${label(tool.tool)}, measured: ${plural(e.requests, 'request')} after a pause of 5 minutes or more (${fmtNum(e.priced)} priced) ` +
    `cost ${money(e.cost)} at list price.`
}

/** The hover of one cause of one tool: its requests and cost, its share of the tool's long-pause cost, per bucket, and its rule. */
export function pauseCauseHover(row: NonNullable<PauseBody['causes']>[number], total: number, label: Label) {
  const buckets = row.buckets.filter(cell => cell.requests > 0).map(cell => `${BUCKET_LABELS[cell.bucket]}: ` +
    `${plural(cell.requests, 'request')} in ${plural(cell.sessions, 'session')}, ${money(cell.cost_usd)}`)
  return `${label(row.tool)}, ${CAUSE_LABELS[row.cause]}: ${plural(row.requests, 'request')} (${fmtNum(row.priced)} priced), ` +
    `${money(row.cost_usd)} at list price, ${share(row.share)} of the tool's ${money(total)} after pauses of 5 minutes or more.` +
    (buckets.length ? ` ${buckets.join('; ')}.` : '') + ` Recorded in the pause: ${CAUSE_MEANING[row.cause]}.`
}

/** The hover of a call that ran through pauses. */
export function pauseCallHover(row: PauseCauseTool, label: Label) {
  return `${row.tool_name ?? 'unnamed call'}${row.program ? ` (${row.program})` : ''} in ${label(row.tool)}: the longest-running call ` +
    `in ${plural(row.requests, 'pause')} of 5 minutes or more with a call still running; the requests after them cost ` +
    `${money(row.cost_usd)} at list price; the call ran ${fmtDur(row.p50_call_s)} at the median, ${fmtDur(row.max_call_s)} at most.`
}

/** The hover of a project's difference between the measured cost after long pauses and the estimate. */
export function pauseProjectHover(row: { project: string; sessions: number; requests: number; extra: number } | null, rest: number) {
  return row ? `${row.project}: measured cost minus the estimate at its tool's under-1-minute average = ${money(row.extra)}, over ` +
    `${plural(row.requests, 'request')} after a pause of 5 minutes or more in ${plural(row.sessions, 'session')}.`
    : `Every other project and the requests with no project, summed: ${money(rest)} measured cost minus the estimate.`
}

/** The card's primary split: the projects whose long pauses cost the most extra, five at most, every other one summed. */
export function pauseProjects(body: PauseBody, shown = 5) {
  const named = new Map<string, { project: string; sessions: number; requests: number; extra: number; lists: RepoSegment[][] }>()
  for (const row of body.projects ?? []) {
    if (!row.project || row.extra_usd == null || !body.tools.some(tool => tool.tool === row.tool)) continue
    const found = named.get(row.project) ?? { project: row.project, sessions: 0, requests: 0, extra: 0, lists: [] }
    named.set(row.project, { ...found, sessions: found.sessions + row.sessions, requests: found.requests + row.requests,
      extra: found.extra + row.extra_usd, lists: row.repos?.length ? [...found.lists, row.repos] : found.lists })
  }
  const top = [...named.values()].filter(row => row.extra > 0).sort((a, b) => b.extra - a.extra).slice(0, shown)
    .map(({ lists, ...row }) => ({ ...row, repos: sumRepos(lists, PROJECT_MEASURES, body.repo_order) }))
  const rest = (body.summary.extra_usd ?? 0) - top.reduce((sum, row) => sum + row.extra, 0)
  return { top, rest: rest > 0.005 ? rest : 0 }
}
const PROJECT_MEASURES = ['requests', 'sessions', 'cost_usd', 'extra_usd'] as const

/**
 * The segments of several rows of one bar (a project's rows of each tool) summed by repository, in repo_order order with
 * every other repository last. A share of the bar is taken again of the summed bar; a share of the repository's own total
 * is summed too (the same total under every row), and is null where one of the rows has none.
 */
export function sumRepos(lists: readonly (readonly RepoSegment[])[], measures: readonly string[], order: RepoSplit['repo_order']): RepoSegment[] {
  const merged = new Map<string, RepoSegment>()
  for (const segment of lists.flat()) {
    const found = merged.get(segment.repo)
    if (!found) {
      merged.set(segment.repo, { ...segment, share: {}, of_repo: { ...segment.of_repo } })
      continue
    }
    for (const key of measures) {
      const a = found[key], b = segment[key]
      found[key] = typeof a === 'number' || typeof b === 'number' ? (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0) : null
      const ownA = found.of_repo[key], ownB = segment.of_repo?.[key]
      found.of_repo[key] = ownA == null || ownB == null ? null : ownA + ownB
    }
  }
  const rank = (repo: string) => { const at = repo ? (order ?? []).findIndex(item => item.repo === repo) : -1; return at < 0 ? Infinity : at }
  const rows = [...merged.values()].sort((a, b) => rank(a.repo) - rank(b.repo))
  for (const key of measures) {
    const whole = rows.reduce((sum, row) => sum + (typeof row[key] === 'number' ? row[key] as number : 0), 0)
    for (const row of rows) row.share[key] = typeof row[key] === 'number' && whole > 0 ? (row[key] as number) / whole : null
  }
  return rows
}

export function carryFinding(body: CarryBody, label: Label) {
  const s = body.summary
  if (s.carried_bytes == null || !s.top) return 'No tool result with a reported size in this period.'
  const top = s.top
  return `Tool results in the period: ${bytes(s.output_bytes)}. Estimate of the bytes sent again with later requests of the same ` +
    `agent (upper bound): ${bytes(s.carried_bytes)}. ${top.tool_name} (${label(top.tool)}), the tool name with the largest estimate: ` +
    `${bytes(top.output_bytes)} of results, up to ${bytes(top.carried_bytes)} sent again.`
}

/** The hover of a tool name's bars: its results and the upper-bound estimate with its formula. */
export function carryHover(row: CarryName, label: Label) {
  return `${row.tool_name} (${label(row.tool)}): ${plural(row.calls, 'call')} returned ${bytes(row.output_bytes)}. Estimate, upper bound: ` +
    `each result × the later requests of the same session and agent (${count(row.avg_later_requests)} on average) = ` +
    `${bytes(row.carried_bytes)}; compaction and truncation are not taken into account.`
}
export function carryToolHover(row: CarryBody['tools'][number], label: Label) {
  return row.output_bytes == null ? `${label(row.tool)}: ${plural(row.calls, 'call')}; result size not reported.`
    : `${label(row.tool)}: ${plural(row.calls, 'call')}, ${fmtNum(row.reported)} with a size, ${bytes(row.output_bytes)} of results; ` +
      `up to ${bytes(row.carried_bytes)} sent again (estimate, upper bound).`
}

export function subagentFinding(body: SubagentBody, label: Label) {
  const s = body.summary
  if (!s.subagents) return 'No subagent ran in this period.'
  const top = [...body.tools].filter(tool => tool.subagents.agents).sort((a, b) =>
    (b.main.requests + b.subagents.requests) - (a.main.requests + a.subagents.requests))[0]
  return `${fmtNum(s.subagents)} subagents made ${fmtNum(s.subagent_requests)} requests; they cost ${money(s.subagent_cost_usd)} at list ` +
    `price, ${share(s.subagent_share)} of the cost of all requests (main agents and subagents)` +
    (top ? `. ${label(top.tool)} (the tool with the most requests): subagents ${share(top.subagent_share)} of its cost.` : '.') +
    leftOut(s.unpriced_requests)
}

export function subagentSessionHover(row: InsightSession, label: Label) {
  return `Session ${sessionName(row)} (${label(String(row.tool ?? ''))}): ${plural(Number(row.agents ?? 0), 'subagent')} made ` +
    `${plural(Number(row.requests ?? 0), 'request')} costing ${money(typeof row.cost_usd === 'number' ? row.cost_usd : null)} at list ` +
    `price; its main agent cost ${money(typeof row.main_cost === 'number' ? row.main_cost : null)}.`
}

/** The hover of one side of a tool's bar: its requests, agents and cost, and its share of the tool's cost or requests. */
export function subagentHover(tool: SubagentTool, side: 'main' | 'subagents', label: Label) {
  const part = side === 'main' ? tool.main : tool.subagents
  const cost = (tool.main.cost_usd ?? 0) + (tool.subagents.cost_usd ?? 0)
  const requests = tool.main.requests + tool.subagents.requests
  const who = side === 'main' ? 'main agent' : `subagents (${plural(tool.subagents.agents, 'subagent')})`
  return `${label(tool.tool)}, ${who}: ${plural(part.requests, 'request')} (${share(ratio(part.requests, requests))} of ${fmtNum(requests)}; ` +
    `${fmtNum(part.priced)} priced), ${money(part.cost_usd)} at list price (${share(ratio(part.cost_usd, cost))} of ${money(cost)}).`
}

export function failureFinding(body: FailureBody, label: Label) {
  const s = body.summary
  if (!s.failures) return 'No tool call failed in this period.'
  const tools = body.tools.length ? ` (${list(body.tools.map(tool => label(tool.tool)))})` : ''
  return `Of ${plural(s.failures, 'failed tool call')}${tools}, ${fmtNum(s.followed)} had a next call by the same agent: ` +
    OUTCOMES.map(outcome => `${lower(OUTCOME_LABELS[outcome])}: ${count(s[outcome] ?? null)}`).join('; ') + '. ' +
    `${plural(s.streaks, 'run')} of 3 or more failed calls in a row, ${plural(s.streak_calls ?? 0, 'call')} in all, the longest ` +
    `${count(s.longest)} calls.`
}

/** What each outcome of the next call means, as the view tests it. */
const OUTCOME_RULES: Record<Outcome, string> = {
  identical_failed: 'same tool name and same target (command, path or URL), and it failed',
  identical_succeeded: 'same tool name and same target, and it succeeded',
  changed_failed: 'same tool name with another target, and it failed',
  changed_succeeded: 'same tool name with another target, and it succeeded',
  other_tool: 'another tool name',
}
/** The hover of one outcome of one tool: its calls, their share of the failures followed and of all failures, and the rule. */
export function failureOutcomeHover(tool: FailureTool, outcome: Outcome | 'last', label: Label) {
  const followed = OUTCOMES.reduce((sum, key) => sum + (tool.outcomes[key] ?? 0), 0)
  if (outcome === 'last') {
    return `${label(tool.tool)}, no next call: ${plural(tool.last_failures, 'failed call')} (${share(ratio(tool.last_failures, tool.failures))} ` +
      `of ${fmtNum(tool.failures)} failed calls) were the last call of their agent in the period.`
  }
  const calls = tool.outcomes[outcome] ?? 0
  return `${label(tool.tool)}, ${lower(OUTCOME_LABELS[outcome])}: ${plural(calls, 'call')}, ${share(ratio(calls, followed))} of the ` +
    `${fmtNum(followed)} failed calls with a next call, ${share(ratio(calls, tool.failures))} of all ${fmtNum(tool.failures)} failed calls. ` +
    `Next call: ${OUTCOME_RULES[outcome]}.`
}
export function failureShareHover(tool: FailureTool, label: Label) {
  return `${label(tool.tool)}: ${plural(tool.failures, 'failed call')} of ${plural(tool.calls, 'tool call')} in the period ` +
    `(${share(ratio(tool.failures, tool.calls))}).`
}
export function failureStreakHover(tool: FailureTool, label: Label) {
  return `${label(tool.tool)}: ${plural(tool.streaks, 'run')} of 3 or more failed calls in a row by one agent, ` +
    `${plural(tool.streak_calls, 'call')} in them (${share(ratio(tool.streak_calls, tool.failures))} of ${fmtNum(tool.failures)} failed calls); ` +
    `the longest ${count(tool.longest)} calls.`
}

export function rereadFinding(body: RereadBody) {
  const s = body.summary
  if (!s.reads) return 'No file read with a recorded path in this period.'
  return `${share(s.repeat_share)} of file reads (${fmtNum(s.repeat_reads)} of ${fmtNum(s.reads)}) read a file the same agent had already read; ` +
    `${fmtNum(s.files_5plus)} files were read 5 times or more; ` +
    (s.repeat_bytes == null ? 'the size of the repeated reads is not reported.' : `the repeated reads returned ${bytes(s.repeat_bytes)}.`)
}

/** The hover of a part of a tool's reads: first reads or reads again, their share of the tool's reads. */
export function rereadHover(tool: RereadTool, part: 'first' | 'again', label: Label) {
  const n = part === 'first' ? tool.reads - tool.repeat_reads : tool.repeat_reads
  return `${label(tool.tool)}, ${part === 'first' ? 'first read of a file by its agent' : 'read of a file the same agent had already read'}: ` +
    `${plural(n, 'read')}, ${share(ratio(n, tool.reads))} of ${plural(tool.reads, 'read')} with a recorded path over ${plural(tool.files, 'file')}` +
    (part === 'again' ? `; ${bytes(tool.repeat_bytes)} returned again.` : '.') +
    (tool.unmatched ? ` ${plural(tool.unmatched, 'read')} without a path not counted.` : '')
}
export function rereadFilesHover(tool: RereadTool, label: Label) {
  return `${label(tool.tool)}: ${plural(tool.files_5plus, 'file')} read 5 times or more by one agent, of ${plural(tool.files, 'file')} read; ` +
    `the most reads of one file: ${fmtNum(tool.most_reads)}.`
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
  const top = [...body.tools].sort((a, b) => b.requests - a.requests)[0]
  if (!top) return 'No tool has enough requests in this period to compare.'
  const thinking = top.thinking_ms == null ? 'thinking time not recorded' : `of it thinking ${hours(top.thinking_ms)}`
  const program = s.top_program
  return `Summed durations in the period: model requests ${hours(s.model_ms)}, tool calls ${hours(s.tool_ms)}. ` +
    `${label(top.tool)} (${plural(top.requests, 'request')}, ${plural(top.calls, 'call')}): model ${hours(top.model_ms)}, ${thinking}; ` +
    `tool calls ${hours(top.tool_ms)}.` +
    (program ? ` Program with the largest summed time: ${programName(program)}, ${hours(program.duration_ms)} over ` +
      `${fmtNum(program.calls)} calls, 95th percentile ${millis(program.p95_ms)}.` : '')
}

export type TimePart = 'thinking' | 'model' | 'tools'
/** The model time of a tool without its thinking: all of it when thinking is not recorded. */
export const modelRest = (tool: TimeTool) => tool.model_ms == null ? null : tool.model_ms - (tool.thinking_ms ?? 0)
/** The hover of one part of a tool's time bar: its hours, its share of the tool's summed time, and what it was counted over. */
export function timePartHover(tool: TimeTool, part: TimePart, label: Label) {
  const total = (tool.model_ms ?? 0) + (tool.tool_ms ?? 0)
  const value = part === 'thinking' ? tool.thinking_ms : part === 'model' ? modelRest(tool) : tool.tool_ms
  const name = part === 'thinking' ? 'model, thinking' : part === 'model'
    ? (tool.thinking_ms == null ? 'model (thinking time not recorded by this tool)' : 'model, rest of the request') : 'tool calls'
  const over = part === 'tools'
    ? `${plural(tool.calls, 'call')}; ${fmtNum(tool.untimed_calls)} without a duration and ${fmtNum(tool.overlong_calls)} over 24 hours not counted`
    : `${plural(tool.requests, 'request')}; ${fmtNum(tool.untimed_requests)} without a duration and ${fmtNum(tool.overlong_requests)} over 24 hours not counted`
  return `${label(tool.tool)}, ${name}: ${hours(value)}, ${share(ratio(value, total))} of its summed ${hours(total)} ` +
    `(model ${hours(tool.model_ms)} + tool calls ${hours(tool.tool_ms)}), over ${over}.`
}

/** Reasoning tokens as a token measure, never time: the figures of the requests that report them. */
export function reasoningText(tool: TimeTool) {
  if (!tool.reasoning_requests) return ''
  return `Reasoning tokens: ${count(tool.reasoning_tokens ?? null)} of ${count(tool.reasoning_output_tokens ?? null)} output tokens` +
    (tool.reasoning_share == null ? '' : ` (${fmtShare(tool.reasoning_share)})`) +
    ` in ${plural(tool.reasoning_requests, 'request')} that report them`
}
export function reasoningHover(tool: TimeTool, label: Label) {
  return `${label(tool.tool)}: ${count(tool.reasoning_tokens ?? null)} reasoning tokens and ${count(tool.reasoning_output_tokens ?? null)} ` +
    `output tokens in ${plural(tool.reasoning_requests ?? 0, 'request')} that report reasoning tokens` +
    (tool.reasoning_share == null ? '; share not computed (reasoning exceeds output or is not reported).'
      : `; reasoning is ${fmtShare(tool.reasoning_share)} of their output.`) +
    ` The share covers only requests that report reasoning tokens, not all ${plural(tool.requests, 'request')} of the tool.`
}

/** The hover of a program row: its summed time and share, the calls it rests on, its percentiles and failures. */
export function programHover(row: TimeProgram, total: number) {
  return `${programName(row)}: ${hours(row.duration_ms)} summed over ${plural(row.calls, 'call')} (${share(ratio(row.duration_ms, total))} of ` +
    `the ${hours(total)} of the programs listed); median ${millis(row.p50_ms)}, 95th percentile ${millis(row.p95_ms)}; ` +
    `${share(row.failure_share)} failed; ${fmtNum(row.untimed)} without a duration and ${fmtNum(row.overlong)} over 24 hours not counted.`
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
  const heavy = `${share(s.heavy_share)} of requests with token counts (${fmtNum(s.heavy_requests)} of ${fmtNum(s.reported)}) read a ` +
    `context of 200k tokens or more; they cost ${money(s.heavy_cost_usd)} of ${money(s.cost_usd)} at list price (${share(s.heavy_cost_share)}).`
  return `${heavy} Requests with under ${SMALL_STEP_OUTPUT} output tokens and no thinking time: ${count(s.small_requests)}, costing ` +
    `${money(s.small_cost_usd)}.${leftOut(s.unpriced_requests)}`
}

/** The hover of one context bucket of one tool: its requests and cost with their shares of the tool. */
export function contextCellHover(tool: ContextTool, cell: ContextCell, label: Label) {
  return `${label(tool.tool)}, context ${CONTEXT_LABELS[cell.bucket]} tokens: ${plural(cell.requests, 'request')} (${share(cell.request_share)} ` +
    `of ${fmtNum(tool.reported)} with token counts), ${money(cell.cost_usd)} at list price (${share(cell.cost_share)} of ` +
    `${money(tool.cost_usd)}), ${fmtNum(cell.priced)} priced.`
}
export function contextPercentileHover(tool: ContextTool, which: 'p50' | 'p90', label: Label) {
  return `${label(tool.tool)}: ${which === 'p50' ? 'median' : '90th percentile'} context ${tokens(which === 'p50' ? tool.p50_context : tool.p90_context)} ` +
    `(input + cache read + cache write) over ${plural(tool.reported, 'request')} with token counts.`
}
export function smallStepHover(tool: ContextTool, label: Label) {
  return tool.small_requests == null ? `${label(tool.tool)}: small steps not reported (no token counts).`
    : `${label(tool.tool)}: ${plural(tool.small_requests, 'request')} with under ${SMALL_STEP_OUTPUT} output tokens and no thinking time ` +
      `(${share(ratio(tool.small_requests, tool.reported))} of ${fmtNum(tool.reported)}), ${money(tool.small_cost_usd)} at list price.`
}

export function orientationFinding(body: OrientationBody) {
  const s = body.summary
  const never = s.never ? ` ${fmtNum(s.never)} sessions recorded no edit; their main agents' requests cost ${money(s.never_cost_usd)}.` +
    leftOut(s.unpriced_requests) : ''
  if (!s.sessions) return 'No session started in this period.'
  const top = body.projects[0]
  if (!top) return `No project has 3 or more sessions that edit in this period.${never}`
  const medians = body.projects.map(row => row.p50_requests).filter((value): value is number => value != null)
  const range = body.projects.length > 1 && medians.length
    ? ` Across ${fmtNum(body.projects.length)} projects the median runs from ${fmtNum(Math.min(...medians))} to ${fmtNum(Math.max(...medians))} requests.` : ''
  return `${projectName(top.project_path)} has the most sessions that edit (${fmtNum(top.sessions)}); the median one made ` +
    `${count(top.p50_requests)} requests costing ${money(top.p50_cost_usd)} before its first edit.${range}${never}`
}

export function orientationProjectHover(row: OrientationProject, label: Label) {
  return `${row.project_path}: median ${count(row.p50_requests)} main-agent requests costing ${money(row.p50_cost_usd)} at list price ` +
    `before the first edit, over ${plural(row.sessions, 'session')} that edit (${row.tools.map(label).join(', ')}).`
}
export function orientationToolHover(tool: OrientationTool, part: 'edited' | 'never', label: Label) {
  if (part === 'edited') {
    return `${label(tool.tool)}: ${fmtNum(tool.edited)} of ${plural(tool.sessions, 'session')} (${share(ratio(tool.edited, tool.sessions))}) ` +
      `recorded an edit; the median one made ${count(tool.p50_requests)} requests before it.`
  }
  return `${label(tool.tool)}: ${fmtNum(tool.never)} of ${plural(tool.sessions, 'session')} (${share(ratio(tool.never, tool.sessions))}) ` +
    `recorded no edit; their main agents made ${plural(tool.never_requests, 'request')} costing ${money(tool.never_cost_usd)} at list price.`
}

/** A count and its noun: 1 session, 2 sessions. */
export const plural = (n: number, noun: string) => `${fmtNum(n)} ${n === 1 ? noun : `${noun}s`}`

export const FIXED_LABELS: Record<FixedKind, string> = {
  instruction_file: 'Instruction files', memory_file: 'Memory files', system_prompt_other: 'Other system prompt',
  skills: 'Skill listing', mcp_instructions: 'MCP instructions', custom_agents: 'Custom agents', tools_listed: 'Deferred tool list',
}
export const FIXED_KINDS = Object.keys(FIXED_LABELS) as FixedKind[]

/** The kind with the largest median in a tool's fixed context, among the kinds it reports. */
export const heaviestKind = (tool: FixedTool) => tool.kinds.filter(cell => cell.p50_tokens != null)
  .sort((a, b) => (b.p50_tokens ?? 0) - (a.p50_tokens ?? 0))[0]

/** The tool a fixed-context headline is about: the one with the most sessions among those with a median. */
export const fixedLead = (body: FixedBody) => [...body.tools].filter(tool => tool.p50_tokens != null)
  .sort((a, b) => b.sessions - a.sessions)[0]

export function fixedFinding(body: FixedBody, label: Label) {
  const s = body.summary
  if (!s.sessions) return 'No session in this period records its fixed context.'
  const top = fixedLead(body)
  const kind = top && heaviestKind(top)
  const heavy = top ? `${label(top.tool)} sessions carry a median ${tokens(top.p50_tokens)} before any work ` +
    `over ${plural(top.sessions, 'session')}` +
    (kind ? `, ${FIXED_LABELS[kind.kind].toLowerCase()} a median ${tokens(kind.p50_tokens)} of it` : '') + ' (estimated).' : ''
  const listing = body.skills.filter(row => row.listed != null)
  const skills = s.listed == null
    ? ' No tool in this period reports the skills it lists.'
    : ` Of ${fmtNum(s.listed)} skills ${list(listing.map(row => label(row.tool)))} listed, ${count(s.never_used)} were never used in the period; ` +
      `listing them took ${tokens(s.unused_tokens)} of ${tokens(s.listing_tokens)}.`
  const file = body.files[0]
  const files = file ? ` Instruction or memory file with the most tokens in all: ${file.file} in ${label(file.tool)}, ` +
    `${tokens(file.avg_tokens)} per load in ${plural(file.sessions, 'session')}.` : ''
  return `${heavy}${skills}${files}`.trim()
}

export function fixedKindHover(tool: FixedTool, cell: FixedCell, label: Label) {
  if (!cell.reported) return `${label(tool.tool)}, ${FIXED_LABELS[cell.kind].toLowerCase()}: not recorded by this tool.`
  return `${label(tool.tool)}, ${FIXED_LABELS[cell.kind].toLowerCase()}: average ${tokens(cell.avg_tokens)} per session ` +
    `(${plural(tool.sessions, 'session')} of the tool); median ${tokens(cell.p50_tokens)} and ${count(cell.p50_items)} items in the ` +
    `${fmtNum(cell.sessions ?? 0)} sessions that record it (${share(cell.session_share)})${cell.estimated ? '; estimated from item sizes' : ''}.`
}
export function fixedFileHover(row: FixedFile, label: Label) {
  return `${row.file} (${label(row.tool)}): ${tokens(row.avg_tokens)} per load on average, largest ${tokens(row.max_tokens)}; ` +
    `${plural(row.loads, 'load')} in ${plural(row.sessions, 'session')}, ${tokens(row.tokens)} in all (estimated).`
}
export function fixedSkillHover(row: FixedSkill, label: Label) {
  return `${row.name} (${label(row.tool)}): listed in ${plural(row.sessions, 'session')}, ${tokens(row.tokens)} of listing in all ` +
    `(estimated); ${row.uses ? plural(row.uses, 'use') : 'no use'} in the period.`
}
export function fixedListingHover(row: FixedSkills, part: 'used' | 'unused', label: Label) {
  const used = row.listing_tokens == null || row.unused_tokens == null ? null : row.listing_tokens - row.unused_tokens
  return part === 'used'
    ? `${label(row.tool)}: listing of the ${count(row.used)} skills used in the period, ${tokens(used)} of ${tokens(row.listing_tokens)} (estimated).`
    : `${label(row.tool)}: listing of the ${count(row.listed == null || row.used == null ? null : row.listed - row.used)} skills listed and ` +
      `not used in the period, ${tokens(row.unused_tokens)} of ${tokens(row.listing_tokens)} (estimated).`
}

export const SIGNAL_LABELS: Record<Signal, string> = {
  compaction: 'Repeated compaction', failure_streak: 'Failure streak', failed_delegation: 'Failed delegation',
  api_error: 'Ended on an API error', open_todos: 'Open todos', hook_failure: 'Hook failure',
}
export const SIGNALS = Object.keys(SIGNAL_LABELS) as Signal[]

export function problemFinding(body: ProblemBody, label: Label) {
  const s = body.summary
  if (!s.sessions) return 'No session in this period is of a tool that reports a problem signal.'
  const pair = body.pairs[0]
  const lead = [...body.tools].filter(tool => tool.reports).sort((a, b) => b.sessions - a.sessions)[0]
  const top = (lead ? lead.signals.filter(cell => cell.reported && cell.sessions).map(cell => ({ tool: lead, cell })) : [])
    .sort((a, b) => (b.cell.sessions ?? 0) - (a.cell.sessions ?? 0))[0]
  const flagged = `${fmtNum(s.flagged)} of ${plural(s.sessions, 'session')} (${share(s.flagged_share)}) of the tools that record the ` +
    `signals recorded at least one of the six; their requests cost ${money(s.flagged_cost_usd)} at list price. ` +
    `${fmtNum(s.multi)} recorded two or more` +
    (pair ? `; the pair in the most sessions is ${SIGNAL_LABELS[pair.signals[0]].toLowerCase()} with ` +
      `${SIGNAL_LABELS[pair.signals[1]].toLowerCase()} (${plural(pair.sessions, 'session')})` : '') + '.'
  const most = top ? ` Signal in the most sessions of ${label(top.tool.tool)} (the tool with the most sessions): ` +
    `${SIGNAL_LABELS[top.cell.signal].toLowerCase()}, ${plural(top.cell.sessions ?? 0, 'session')}, ${share(top.cell.share)} of its sessions.` : ''
  const project = body.projects[0]
  const where = project && project.cost_usd != null ? ` Project with the largest cost of flagged sessions: ${projectName(project.project)}, ` +
    `${plural(project.sessions, 'session')}, ${money(project.cost_usd)}` +
    (s.flagged_cost_usd ? ` (${share(project.cost_usd / s.flagged_cost_usd)} of the flagged cost).` : '.') : ''
  return flagged + where + most
}

/** What puts a session under each signal, as the view records it. */
export const SIGNAL_RULES: Record<Signal, string> = {
  compaction: '3 or more compactions in the session', failure_streak: '3 or more failed tool calls in a row by one agent',
  failed_delegation: 'a failed call that starts or collects a subagent or task', api_error: 'a turn that ended on an API error',
  open_todos: 'a todo list with items left open', hook_failure: 'a hook that failed',
}
/** The hover of one signal of one tool: its sessions, their share of the tool's sessions, their cost, and the rule. */
export function problemSignalHover(tool: ProblemTool, cell: SignalCell, label: Label) {
  if (!cell.reported) return `${label(tool.tool)}, ${SIGNAL_LABELS[cell.signal].toLowerCase()}: not recorded by this tool, so not counted.`
  return `${label(tool.tool)}, ${SIGNAL_LABELS[cell.signal].toLowerCase()}: ${fmtNum(cell.sessions ?? 0)} of ${plural(tool.sessions, 'session')} ` +
    `(${share(cell.share)}); their requests cost ${money(cell.cost_usd)} at list price. Rule: ${SIGNAL_RULES[cell.signal]}.`
}
/** A tool's sessions by how many signals they recorded: none, one, two or more. */
export function problemCounts(tool: ProblemTool) {
  const flagged = tool.flagged ?? 0, multi = tool.multi ?? 0
  return { none: Math.max(0, tool.sessions - flagged), one: Math.max(0, flagged - multi), multi }
}
export function problemCountHover(tool: ProblemTool, part: 'none' | 'one' | 'multi', label: Label) {
  const n = problemCounts(tool)[part]
  const what = part === 'none' ? 'no signal' : part === 'one' ? 'exactly one signal' : 'two or more signals'
  return `${label(tool.tool)}: ${plural(n, 'session')} with ${what}, ${share(ratio(n, tool.sessions))} of its ${plural(tool.sessions, 'session')}` +
    (part === 'none' ? '.' : `; all its flagged sessions cost ${money(tool.flagged_cost_usd)} of ${money(tool.cost_usd)} at list price.`)
}
export function problemPairHover(pair: ProblemPair, flagged: number) {
  return `${SIGNAL_LABELS[pair.signals[0]]} and ${SIGNAL_LABELS[pair.signals[1]].toLowerCase()} in the same session: ` +
    `${plural(pair.sessions, 'session')} (${share(ratio(pair.sessions, flagged))} of the ${fmtNum(flagged)} flagged sessions), ` +
    `their requests cost ${money(pair.cost_usd)} at list price.`
}
/** The hover of a grid cell: one signal in one project (or every other project summed). */
export function problemCellHover(project: string, signal: Signal, sessions: number, all: number | null) {
  return `${project}, ${SIGNAL_LABELS[signal].toLowerCase()}: ${plural(sessions, 'session')}` +
    (all == null ? ' (summed; no session total to take a share of).' : `, ${share(ratio(sessions, all))} of its ${plural(all, 'session')}.`) +
    ` Rule: ${SIGNAL_RULES[signal]}.`
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

export const pauseHero = (body: PauseBody) => body.summary.requests ? hero(body.summary.cost_usd, fmtUsd,
  `at list price for the ${plural(body.summary.requests, 'request')} that followed a pause of 5 minutes or more` +
  (body.summary.sessions ? ` in ${plural(body.summary.sessions, 'session')}` : '') +
  `; estimate at each tool's under-1-minute average: ${money(body.summary.baseline_usd)}, difference ${money(body.summary.extra_usd)}`) : undefined
export const carryHero = (body: CarryBody) => hero(ratio(body.summary.carried_bytes, body.summary.output_bytes), fmtTimes,
  `estimate (upper bound) of how many times a byte of a tool result was sent again with later requests: ` +
  `${bytes(body.summary.output_bytes)} of results, up to ${bytes(body.summary.carried_bytes)} sent again`)
export const subagentHero = (body: SubagentBody) => hero(body.summary.subagent_share, fmtShare,
  `of the cost at list price is in subagent requests: ${money(body.summary.subagent_cost_usd)} of ` +
  `${money(body.summary.main_cost_usd == null ? null : body.summary.main_cost_usd + (body.summary.subagent_cost_usd ?? 0))}`)
export const failureHero = (body: FailureBody) => body.summary.failures
  ? hero(body.summary.streaks, fmtNum, `runs of 3 or more failed calls in a row, among ${plural(body.summary.failures, 'failed tool call')} ` +
    'in the period') : undefined
export const rereadHero = (body: RereadBody) => hero(body.summary.repeat_share, fmtShare,
  `of file reads read a file the same agent had already read: ${fmtNum(body.summary.repeat_reads)} of ${fmtNum(body.summary.reads)}`)
export const timeHero = (body: TimeBody) => hero(
  body.summary.model_ms == null || body.summary.tool_ms == null ? null
    : ratio(body.summary.tool_ms, body.summary.model_ms + body.summary.tool_ms), fmtShare,
  `of the summed durations of model requests and tool calls is tool calls: ${hours(body.summary.tool_ms)} tool calls, ` +
  `${hours(body.summary.model_ms)} model requests`)
export const contextHero = (body: ContextBody) => hero(body.summary.heavy_cost_share, fmtShare,
  `of the cost is in requests that read a context of 200k tokens or more: ${money(body.summary.heavy_cost_usd)} of ${money(body.summary.cost_usd)}`)
export const fixedHero = (body: FixedBody) => body.summary.never_used_share != null
  ? hero(body.summary.never_used_share, fmtShare, `of the ${fmtNum(body.summary.listed)} skills listed in sessions' fixed context were never ` +
    `used in the period: listing them took ${tokens(body.summary.unused_tokens)}`)
  : fixedLead(body) ? hero(fixedLead(body)!.p50_tokens, value => `${fmtN(value)} tokens`,
    `median fixed context of a ${toolLabel(fixedLead(body)!.tool)} session before any work (estimated)`) : undefined
export const problemHero = (body: ProblemBody) => hero(body.summary.flagged_share, fmtShare,
  `of the sessions of tools that record the six signals recorded at least one: ${fmtNum(body.summary.flagged)} of ` +
  `${plural(body.summary.sessions, 'session')}, ${money(body.summary.flagged_cost_usd)} at list price`)
export function orientationHero(body: OrientationBody) {
  // The project with the most sessions that edit leads, not the one with the largest median.
  const top = body.projects.find(project => project.p50_requests != null)
  return top ? hero(top.p50_requests, fmtNum, `requests before the first edit in the median session of ${projectName(top.project_path)}, ` +
    `the repository with the most sessions that edit (${fmtNum(top.sessions)}); costing ${money(top.p50_cost_usd)}`) : undefined
}
