// ─── The model report card — /api/board/insights/models ─
// Per tool and model: requests, cost per priced request, tokens per request, thinking or reasoning, effort and
// the failure share of the tool calls the model's requests asked for. It describes the work recorded here, not a
// controlled comparison. A figure a tool does not record is null and reads "not reported" or "not recorded".
import { dayLabel, fmtMs, fmtN, fmtNum, fmtRate, fmtTimes, fmtUsdEach } from '../../design/format'
import { NOT_REPORTED, plural, type Base, type Hero, type Label } from './insightsModel'

type Num = number | null
/** The thresholds the server applies (insights.py): a share needs RATE_CALLS calls in RATE_SESSIONS sessions. */
export const RATE_CALLS = 100
export const RATE_SESSIONS = 3
export const PER_REQUEST = 20

export type ModelFigures = {
  requests: number; sessions: number; priced: number; cost_usd: Num; cost_per_request: Num
  cache_reported: number; cache_write_reported: number; input_per_request: Num; cache_write_per_request: Num; cache_read_per_request: Num
  output_per_request: Num; unsplit_prompt_per_request: Num
  thinking_reported: number; p50_thinking_ms: Num; reasoning_reported: number; reasoning_per_request: Num
  first_ts: Num; last_ts: Num
  calls: Num; failures: Num; refused: Num; exit_unknown: Num; call_sessions: Num; failure_share: Num; at_least: boolean
}
export type ModelEffort = ModelFigures & { effort: string }
export type FailingName = { tool_name: string; failures: number; share: Num }
export type ModelRow = ModelFigures & {
  tool: string; model: string; recorded_sessions: number; helper: boolean; failing: FailingName[]; efforts: ModelEffort[]
}
export type ModelTool = {
  tool: string; requests: number; sessions?: number; no_model?: number; priced?: number; cache_reported?: number
  cache_write_reported?: number
  effort_reported?: number; thinking_reported?: number; reasoning_reported?: number; recorded_sessions?: number
  recorded_calls?: number; calls?: Num; failures?: Num; refused?: Num; exit_unknown?: Num; unattributed?: Num
  call_sessions?: number; call_only_sessions?: number; store_calls?: number; store_sessions?: number
  unsplit_calls?: number; unsplit_sessions?: number; models: ModelRow[]
}
export type ModelLead =
  | { kind: 'ratio' | 'cost'; tool: string; high: ModelRow; low: ModelRow; ratio: Num }
  | { kind: 'requests'; tool: string; requests: number }
export type Measure = 'cost' | 'token_split' | 'cache_write' | 'thinking' | 'reasoning' | 'effort' | 'model' | 'calls'
export type ModelBody = Base<'models'> & {
  tools: ModelTool[]
  summary: { lead: ModelLead | null; not_reported: Record<Measure, string[]> }
}

export const MEASURE_LABELS: Record<Measure, string> = {
  cost: 'list price', token_split: 'cache split of tokens', cache_write: 'cache writes', thinking: 'thinking time', reasoning: 'reasoning tokens',
  effort: 'effort', model: 'model name', calls: 'tool calls',
}

export const perRequest = (value: Num) => value == null ? NOT_REPORTED : fmtUsdEach(value)
export const tokensEach = (value: Num) => value == null ? NOT_REPORTED : fmtN(value)

/** The cost of a model in words: per priced request, how many of its requests are priced, or that none is. */
export function costText(row: ModelFigures) {
  if (!row.priced) return 'not priced'
  if (row.cost_per_request == null) return `${plural(row.priced, 'priced request')}, too few for a cost per request`
  return perRequest(row.cost_per_request) + (row.priced < row.requests ? ` · priced ${fmtNum(row.priced)} of ${fmtNum(row.requests)}` : '')
}

/** The cost of one effort in a strip: per priced request, or why there is none. */
export const effortCost = (row: ModelFigures) => row.cost_per_request != null ? perRequest(row.cost_per_request)
  : row.priced ? 'too few priced' : 'not priced'

/** Enough calls for a failure share, but in too few sessions: the share would describe one or two sessions. */
const fewSessions = (row: ModelFigures) => row.calls != null && row.calls >= RATE_CALLS && (row.call_sessions ?? 0) < RATE_SESSIONS

/** Why a model with recorded calls has no failure share: too few calls, or too few sessions. */
export function tooFewText(row: ModelFigures & { calls: number }) {
  return fewSessions(row)
    ? `${plural(row.calls, 'call')} in ${plural(row.call_sessions ?? 0, 'session')}, too few sessions for a failure share`
    : `${plural(row.calls, 'call')}, too few for a failure share`
}

/** The failure share of a model's tool calls, a floor when shell outcomes are unknown, or why there is none. */
export function rateText(row: ModelFigures) {
  if (row.calls == null) return 'calls not recorded'
  if (row.failure_share == null) return fewSessions(row) ? tooFewText({ ...row, calls: row.calls }) : plural(row.calls, 'call')
  return `${row.at_least ? 'at least ' : ''}${fmtRate(row.failure_share)} of ${plural(row.calls, 'call')} failed`
}

/** Thinking time where Claude Code records it, reasoning tokens per request where Copilot does. */
export function thoughtText(row: ModelFigures) {
  if (row.p50_thinking_ms != null) return `thinking ${fmtMs(row.p50_thinking_ms)}`
  if (row.reasoning_per_request != null) return `${fmtN(row.reasoning_per_request)} reasoning tokens`
  return row.thinking_reported || row.reasoning_reported ? 'too few to state thinking' : ''
}

/** The efforts a model ran at with enough requests each; a strip is drawn only for two or more. */
export const shownEfforts = (row: ModelRow) => row.efforts.filter(effort => effort.requests >= PER_REQUEST)

export const datesText = (row: ModelFigures) => row.first_ts == null || row.last_ts == null ? NOT_REPORTED
  : dayLabel(row.first_ts) === dayLabel(row.last_ts) ? dayLabel(row.first_ts) : `${dayLabel(row.first_ts)}–${dayLabel(row.last_ts)}`

const NOT_A_COMPARISON = 'They worked on different tasks, so this describes the work recorded here, not the models.'
const REAL_WORK = 'This describes real work, not a controlled comparison.'

function failureClause(high: ModelRow, low: ModelRow) {
  if (high.failure_share != null && low.failure_share != null) {
    return `, and ${high.at_least ? 'at least ' : ''}${fmtRate(high.failure_share)} of its tool calls were marked failed against ` +
      `${low.at_least ? 'at least ' : ''}${fmtRate(low.failure_share)}.`
  }
  const one = (row: ModelRow) => row.calls == null ? 'calls not recorded'
    : row.failure_share == null ? tooFewText({ ...row, calls: row.calls })
      : `${row.at_least ? 'at least ' : ''}${fmtRate(row.failure_share)} of calls marked failed`
  return `; tool calls: ${high.model} ${one(high)}, ${low.model} ${one(low)}.`
}

/** The lead tool records no model name at all (Codex CLI): every request of it has no model. */
const namesNoModel = (body: ModelBody, tool: string, requests: number) =>
  requests > 0 && body.tools.find(item => item.tool === tool)?.no_model === requests

export function modelFinding(body: ModelBody, label: Label) {
  const lead = body.summary.lead
  if (!lead) return 'No model request in this period.'
  if (lead.kind === 'requests') {
    if (namesNoModel(body, lead.tool, lead.requests)) {
      return `${label(lead.tool)} made ${plural(lead.requests, 'request')} and records no model name, so no cost per request is ` +
        `stated. ${REAL_WORK}`
    }
    return `${label(lead.tool)} made ${plural(lead.requests, 'request')}; no model has ${PER_REQUEST} priced requests, so no cost per ` +
      `request is stated. ${REAL_WORK}`
  }
  const { high, low } = lead
  if (lead.kind === 'cost') {
    const rate = high.calls == null ? 'its tool calls were not recorded' : high.failure_share == null
      ? fewSessions(high) ? `its ${plural(high.calls, 'tool call')} in ${plural(high.call_sessions ?? 0, 'session')} are too few ` +
        'sessions for a failure share' : `its ${plural(high.calls, 'tool call')} are too few for a failure share`
      : `${high.at_least ? 'at least ' : ''}${fmtRate(high.failure_share)} of its tool calls were marked failed`
    return `In ${label(lead.tool)}, ${high.model} cost ${perRequest(high.cost_per_request)} per priced request at list price over ` +
      `${plural(high.priced, 'priced request')}, and ${rate}. ${REAL_WORK}`
  }
  const dates = datesText(high) === datesText(low) ? '' : ` (${high.model} ${datesText(high)}, ${low.model} ${datesText(low)})`
  return `In ${label(lead.tool)}, ${high.model} cost ${fmtTimes(lead.ratio)} as much per priced request as ${low.model} at list price ` +
    `(${perRequest(high.cost_per_request)} against ${perRequest(low.cost_per_request)})${dates}` +
    `${failureClause(high, low)} ${NOT_A_COMPARISON}`
}

export function modelHero(body: ModelBody, label: Label): Hero | undefined {
  const lead = body.summary.lead
  if (!lead) return undefined
  const tool = label(lead.tool)
  if (lead.kind === 'requests') {
    return { value: fmtNum(lead.requests), label: namesNoModel(body, lead.tool, lead.requests)
      ? `requests in ${tool}, which records no model name` : `requests in ${tool}; no model has ${PER_REQUEST} priced requests` }
  }
  if (lead.kind === 'cost') return { value: perRequest(lead.high.cost_per_request), label: `per priced request of ${lead.high.model} in ${tool}, at list price` }
  return { value: fmtTimes(lead.ratio), label: `the cost per priced request of ${lead.high.model} against ${lead.low.model} in ${tool}, at list price` }
}

/** Where a model's dot sits on a log scale from the cheapest to the dearest cost per request on the card: 0 to 1. */
export function logPlace(value: number, low: number, high: number) {
  if (!(low > 0) || !(high > low)) return 0.5
  return (Math.log(value) - Math.log(low)) / (Math.log(high) - Math.log(low))
}

/** Every measure a tool does not record, in words, for the line under the visual. */
export function notReportedText(body: ModelBody, label: Label) {
  return (Object.keys(MEASURE_LABELS) as Measure[])
    .filter(measure => body.summary.not_reported[measure]?.length)
    .map(measure => `${MEASURE_LABELS[measure]} by ${body.summary.not_reported[measure].map(label).join(', ')}`)
    .join('; ')
}
