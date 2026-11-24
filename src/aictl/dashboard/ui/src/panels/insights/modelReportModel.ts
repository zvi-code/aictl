// ─── The model report card — /api/board/insights/models ─
// Per tool and model: requests, cost per priced request, tokens per request, thinking or reasoning, effort and
// the failure share of the tool calls the model's requests asked for. It describes the work recorded here, not a
// controlled comparison. A figure a tool does not record is null and reads "not reported" or "not recorded".
import { dayLabel, fmtMs, fmtN, fmtNum, fmtRate, fmtShare, fmtTimes, fmtUsdEach } from '../../design/format'
import type { BarPart } from './Bars'
import { gridLength, type GridColumn, type GridPart, type GridRow } from './charts/BarGrid'
import type { ScatterPoint } from './charts/Scatter'
import { MODEL_SESSIONS, withEvidence } from './evidence'
import { money, NOT_REPORTED, plural, type Base, type Hero, type Label } from './insightsModel'
import { repoFill } from './reposModel'
import { repoColour, repoHover, repoName, repoParts, type RepoRef, type RepoSegment } from './repoSplit'

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
  /** The model's bars per repository (repoSplit.ts): requests, each per-request figure and the failure share. */
  repos?: RepoSegment[]
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

const NOT_A_COMPARISON = 'Each model worked on its own tasks: the figures describe the work recorded here, not the models.'
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

/**
 * The comparison the card leads with, over the models the card compares (evidence.ts: tools and models below the
 * minimum are taken out first): in the busiest tool, its dearest and cheapest models by cost per priced request, or the
 * one; with none priced, the busiest tool's requests. The rule of the server's _model_lead, applied to what is shown.
 */
export function leadOf(body: ModelBody): ModelLead | null {
  const tools = [...withEvidence(body).body.tools].sort((a, b) => (b.requests ?? 0) - (a.requests ?? 0))
  for (const tool of tools) {
    const priced = tool.models.filter(model => model.cost_per_request != null && !model.helper)
      .sort((a, b) => b.cost_per_request! - a.cost_per_request!)
    if (priced.length) {
      const high = priced[0], low = priced[priced.length - 1]
      return priced.length > 1 ? { kind: 'ratio', tool: tool.tool, high, low, ratio: high.cost_per_request! / low.cost_per_request! }
        : { kind: 'cost', tool: tool.tool, high, low, ratio: null }
    }
  }
  return tools[0]?.requests ? { kind: 'requests', tool: tools[0].tool, requests: tools[0].requests } : null
}

/** Two models whose periods in the data do not overlap: one was used only after the other. */
export const apart = (a: ModelFigures, b: ModelFigures) => a.first_ts != null && a.last_ts != null && b.first_ts != null &&
  b.last_ts != null && (a.last_ts < b.first_ts || b.last_ts < a.first_ts)

/** The lead tool records no model name at all (Codex CLI): every request of it has no model. */
const namesNoModel = (body: ModelBody, tool: string, requests: number) =>
  requests > 0 && body.tools.find(item => item.tool === tool)?.no_model === requests

export function modelFinding(body: ModelBody, label: Label, lead = leadOf(body)) {
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
  const dates = datesText(high) === datesText(low) ? '' : ` (${high.model} ${datesText(high)}, ${low.model} ${datesText(low)}` +
    `${apart(high, low) ? '; the periods do not overlap' : ''})`
  return `In ${label(lead.tool)}, ${high.model} cost ${fmtTimes(lead.ratio)} as much per priced request as ${low.model} at list price ` +
    `(${perRequest(high.cost_per_request)} against ${perRequest(low.cost_per_request)})${dates}` +
    `${failureClause(high, low)} ${NOT_A_COMPARISON}`
}

export function modelHero(body: ModelBody, label: Label, lead = leadOf(body)): Hero | undefined {
  if (!lead) return undefined
  const tool = label(lead.tool)
  if (lead.kind === 'requests') {
    return { value: fmtNum(lead.requests), label: namesNoModel(body, lead.tool, lead.requests)
      ? `requests in ${tool}, which records no model name` : `requests in ${tool}; no model has ${PER_REQUEST} priced requests` }
  }
  if (lead.kind === 'cost') return { value: perRequest(lead.high.cost_per_request), label: `per priced request of ${lead.high.model} in ${tool}, at list price` }
  const { high, low } = lead
  return { value: fmtTimes(lead.ratio), label: `the cost per priced request of ${high.model} against ${low.model} in ${tool}, at list ` +
    `price: ${perRequest(high.cost_per_request)} against ${perRequest(low.cost_per_request)}; ${high.model} cost ${money(high.cost_usd)} ` +
    `in ${plural(high.sessions, 'session')}, ${low.model} ${money(low.cost_usd)} in ${plural(low.sessions, 'session')}` +
    (apart(high, low) ? '. Their periods do not overlap: one was used only after the other' : '') }
}

/** A bar's length on a linear scale from 0 to the largest value of its chart: "42.50%". */
export const barWidth = (value: number, top: number) => `${(top > 0 ? Math.max(0, Math.min(1, value / top)) * 100 : 0).toFixed(2)}%`

const used = (row: ModelFigures) => datesText(row) === NOT_REPORTED ? '' : `; used ${datesText(row)}`

/** The hover of a model's cost bar: the cost per priced request, the total, how many requests are priced, and the rule. */
export function costHover(row: ModelRow, tool: string) {
  const head = `${row.model} in ${tool}: `
  if (!row.priced) return `${head}not priced (no request of it has a known list price); ${plural(row.requests, 'request')}` +
    ` in ${plural(row.sessions, 'session')}${used(row)}.`
  return `${head}${perRequest(row.cost_per_request)} per priced request at list price; ${money(row.cost_usd)} over ` +
    `${fmtNum(row.priced)} priced of ${plural(row.requests, 'request')} (${fmtShare(row.priced / row.requests)}) in ` +
    `${plural(row.sessions, 'session')}${used(row)}. A cost per request needs ${PER_REQUEST} priced requests; list price, not a bill.`
}

/** The hover of a model's failure bar: failed of all calls, the floor note, refused and unknown calls, the sessions and the rule. */
export function rateHover(row: ModelRow, tool: string) {
  const head = `${row.model} in ${tool}: `
  if (row.calls == null) return `${head}tool calls not recorded (calls recorded in ${fmtNum(row.recorded_sessions)} of ` +
    `${plural(row.sessions, 'session')}).`
  const share = row.failure_share == null ? `no failure share (${rateText(row)})`
    : `${fmtNum(row.failures ?? 0)} of ${plural(row.calls, 'tool call')} marked failed (${row.at_least ? 'at least ' : ''}${fmtRate(row.failure_share)})`
  const floor = row.at_least ? '; a floor: shell commands without an exit code count as failed only when the tool said so' : ''
  const failing = row.failing.length ? ` Most failed: ${row.failing.map(item => `${item.tool_name} ${fmtNum(item.failures)}`).join(', ')}.` : ''
  return `${head}${share}${floor}; ${fmtNum(row.refused ?? 0)} refused, ${fmtNum(row.exit_unknown ?? 0)} with no exit code; calls in ` +
    `${fmtNum(row.call_sessions ?? 0)} of ${plural(row.recorded_sessions, 'session')} with recorded calls.${failing} A failure share ` +
    `needs ${RATE_CALLS} calls in ${RATE_SESSIONS} sessions.`
}

/** "556 requests · 10 sessions", written at a model's request bar. */
export const volumeText = (row: ModelRow) => `${plural(row.requests, 'request')} · ${plural(row.sessions, 'session')}`

/** The hover of a model's request bar: its requests against the tool's, sessions, priced requests, dates, thinking and the rule. */
export function volumeHover(row: ModelRow, tool: ModelTool, label: string) {
  const thought = thoughtText(row)
  return `${row.model} in ${label}: ${fmtNum(row.requests)} of the tool's ${plural(tool.requests, 'request')} ` +
    `(${fmtShare(tool.requests ? row.requests / tool.requests : null)}) in ${plural(row.sessions, 'session')}; ` +
    `${fmtNum(row.priced)} priced${used(row)}${thought ? `; ${thought}` : ''}` +
    `${row.helper ? '; tagged helper: 2 or fewer requests per session and no tool call' : ''}. A model is compared when it ` +
    `was seen in ${fmtNum(MODEL_SESSIONS)} or more sessions.`
}

export type TokenPart = { id: 'input' | 'write' | 'read' | 'output' | 'prompt'; label: string; value: number }
/** A model's average tokens per request, split by the cache where the tool reports the split, else the whole prompt. */
export function tokenParts(row: ModelFigures): TokenPart[] {
  const parts: (TokenPart | null)[] = row.cache_reported > 0 ? [
    row.input_per_request == null ? null : { id: 'input', label: 'Input not from cache', value: row.input_per_request },
    row.cache_write_per_request == null ? null : { id: 'write', label: 'Cache write', value: row.cache_write_per_request },
    row.cache_read_per_request == null ? null : { id: 'read', label: 'Cache read', value: row.cache_read_per_request },
  ] : [row.unsplit_prompt_per_request == null ? null : { id: 'prompt', label: 'Whole prompt (no cache split)', value: row.unsplit_prompt_per_request }]
  parts.push(row.output_per_request == null ? null : { id: 'output', label: 'Output', value: row.output_per_request })
  return parts.filter((part): part is TokenPart => part != null)
}
export const tokenTotal = (row: ModelFigures) => tokenParts(row).reduce((sum, part) => sum + part.value, 0)

/** "50 input · 900 cache write · 40 k cache read · 600 output", written at a model's token bar. */
export const tokenText = (row: ModelFigures) => tokenParts(row).length
  ? tokenParts(row).map(part => `${fmtN(part.value)} ${part.label.toLowerCase()}`).join(' · ') : NOT_REPORTED

/** The hover of one part of a model's token bar. */
export function tokenHover(row: ModelRow, part: TokenPart, tool: string) {
  const total = tokenTotal(row)
  const over = row.cache_reported > 0 ? `${plural(row.cache_reported, 'request')} that report the cache split`
    : `${plural(row.requests, 'request')}`
  const write = row.cache_reported > 0 && !row.cache_write_reported ? ' Cache writes are not reported by this tool.' : ''
  return `${row.model} in ${tool}: ${part.label.toLowerCase()} ${fmtN(part.value)} tokens per request, ${fmtShare(total ? part.value / total : null)} ` +
    `of ${fmtN(total)}; averaged over ${over}.${write}`
}

/** Every measure a tool does not record, in words, for the line under the visual. */
export function notReportedText(body: ModelBody, label: Label) {
  return (Object.keys(MEASURE_LABELS) as Measure[])
    .filter(measure => body.summary.not_reported[measure]?.length)
    .map(measure => `${MEASURE_LABELS[measure]} by ${body.summary.not_reported[measure].map(label).join(', ')}`)
    .join('; ')
}

// ─── The view: per tool, one grid of the models' measures and a scatter of cost against failure share ─
/** The line under the title: what the view measures, in technical terms. */
export const MODELS_LINE = 'Per tool and model: requests, list-price cost per priced request, share of tool calls marked failed, ' +
  'average tokens per request. Each column has its own linear scale from 0.'

/** The colour of a single-measure bar when the bars are not coloured by repository. */
const SINGLE = 'color-mix(in srgb, var(--color-accent) 70%, var(--color-surface))'
/** The colours of the token kinds (tokens only). */
export const TOKEN_FILLS: Record<TokenPart['id'], string> = {
  input: 'var(--color-chart-1)', write: 'var(--color-chart-4)', read: 'color-mix(in srgb, var(--color-chart-3) 55%, var(--color-surface))',
  prompt: 'var(--color-muted)', output: 'var(--color-chart-2)',
}
/** The token kinds as the store answer names them in a repository segment. */
const TOKEN_KEYS: Record<TokenPart['id'], string> = {
  input: 'input_per_request', write: 'cache_write_per_request', read: 'cache_read_per_request', prompt: 'unsplit_prompt_per_request',
  output: 'output_per_request',
}

/** Whether the answer splits any model by repository: the switch is drawn only then. */
export const modelsSplit = (body: ModelBody) => !!body.repo_order?.length && body.tools.some(tool => tool.models.some(model => model.repos?.length))

/** The scale end of each column of a tool's grid. */
function modelTops(tool: ModelTool) {
  const top = (read: (model: ModelRow) => Num) => Math.max(0, ...tool.models.map(model => read(model) ?? 0))
  return { requests: top(model => model.requests), cost: top(model => model.cost_per_request), rate: top(model => model.failure_share),
    tokens: top(model => tokenTotal(model)) }
}

/** The columns of a tool's grid, each with its unit and its scale end. */
export function modelColumns(tool: ModelTool): GridColumn[] {
  const top = modelTops(tool)
  return [
    { id: 'requests', label: 'Requests', scale: `0 to ${fmtNum(top.requests)}; sessions after the value` },
    { id: 'cost', label: 'Cost per priced request', scale: top.cost ? `$ at list price, 0 to ${fmtUsdEach(top.cost)}` : 'no model priced' },
    { id: 'rate', label: 'Tool calls marked failed', scale: top.rate ? `share of calls, 0% to ${fmtRate(top.rate)}; striped: a floor`
      : 'no model has a failure share' },
    { id: 'tokens', label: 'Tokens per request', scale: top.tokens ? `average, 0 to ${fmtN(top.tokens)}` : NOT_REPORTED },
    { id: 'thought', label: 'Thinking, by effort', scale: 'median per request; not split by repository', text: true },
  ]
}

/** The text of a model's failure share in its cell: "2.9% of 4,000 calls", or why there is none. */
export const rateCell = (row: ModelFigures) => row.failure_share == null ? rateText(row)
  : `${row.at_least ? 'at least ' : ''}${fmtRate(row.failure_share)} of ${plural(row.calls ?? 0, 'call')}`

/** What every repository segment of a per-request bar or of the failure share adds: how it is made. */
export function segmentRule(model: ModelRow, measure: 'cost' | 'rate' | 'tokens') {
  if (measure === 'cost') return `A segment is the repository's list-price cost divided by all ${plural(model.priced, 'priced request')} of ` +
    `${model.model}, so the segments add up to the bar (${perRequest(model.cost_per_request)}).`
  if (measure === 'rate') return `A segment is the repository's failed calls divided by all ${plural(model.calls ?? 0, 'call')} of ` +
    `${model.model}, so the segments add up to the bar (${model.at_least ? 'at least ' : ''}${fmtRate(model.failure_share)}).` +
    (model.at_least ? ' A floor: shell commands without an exit code count as failed only when the tool said so.' : '')
  return `Each token kind of a segment is the repository's tokens divided by all requests of ${model.model} that report that kind, ` +
    `so the segments add up to the bar (${fmtN(tokenTotal(model))}).`
}

/** A model's token bar split by repository: per segment the sum of the kinds the bar draws, its kinds in the hover. */
export function tokenRepoParts(model: ModelRow, tool: string, order: RepoRef[] | undefined): GridPart[] {
  const kinds = tokenParts(model), total = tokenTotal(model)
  return (model.repos ?? []).flatMap(segment => {
    const values = kinds.map(kind => ({ kind, value: Number(segment[TOKEN_KEYS[kind.id]] ?? 0) }))
    const value = values.reduce((sum, item) => sum + item.value, 0)
    if (value <= 0) return []
    const name = repoName(order, segment.repo), colour = repoColour(order, segment.repo)
    const each = values.map(item => `${item.kind.label.toLowerCase()} ${fmtN(item.value)}`).join(' · ')
    return [{
      key: `repo:${segment.repo}`, label: name, value, fill: repoFill(colour), repo: colour, text: fmtN(value),
      hover: repoHover({ bar: `${model.model} in ${tool}, tokens per request`, repo: segment.repo, name, value: `${fmtN(value)} tokens per request`,
        share: total ? value / total : null, measure: 'tokens per request' }) + ` ${each}. ${segmentRule(model, 'tokens')}`,
    }]
  })
}

/** Bar parts per repository (repoSplit.repoParts) as grid parts, in the colours of the screen. */
const repoGrid = (parts: BarPart[]): GridPart[] => parts.map(part => ({
  key: part.key, label: part.label, value: part.value ?? 0, hover: part.hover, repo: part.repo, fill: repoFill(part.repo), text: part.text,
}))

/** The rows of a tool's grid: per model its requests, cost, failure share, tokens and thinking, coloured by `mode`. */
export function modelGridRows(tool: ModelTool, label: string, mode: 'own' | 'repo', order: RepoRef[] | undefined): GridRow[] {
  const top = modelTops(tool)
  return tool.models.map(model => {
    const split = mode === 'repo' && !!model.repos?.length
    const bar = (measure: string) => `${model.model} in ${label}, ${measure}`
    const whole = (key: string, value: number, hover: string, hatch = false): GridPart[] =>
      value > 0 ? [{ key, label: key, value, fill: SINGLE, hover, hatch }] : []
    const thought = thoughtText(model)
    const efforts = shownEfforts(model).length >= 2 ? shownEfforts(model) : []
    return {
      key: model.model, label: model.model, sub: datesText(model), tag: model.helper ? 'helper' : undefined,
      cells: {
        requests: { length: gridLength(model.requests, top.requests), text: volumeText(model),
          parts: split ? repoGrid(repoParts(model.repos, 'requests', order, fmtNum, bar('requests'), 'requests', `Whole: ${volumeText(model)}.`))
            : whole('requests', model.requests, volumeHover(model, tool, label)) },
        cost: { length: gridLength(model.cost_per_request, top.cost), text: costText(model), muted: model.cost_per_request == null,
          parts: model.cost_per_request == null ? [] : split
            ? repoGrid(repoParts(model.repos, 'cost_per_request', order, fmtUsdEach, bar('cost per priced request'), 'cost per priced request',
              segmentRule(model, 'cost')))
            : whole('cost', model.cost_per_request, costHover(model, label)) },
        rate: { length: gridLength(model.failure_share, top.rate), text: rateCell(model), muted: model.failure_share == null,
          parts: model.failure_share == null ? [] : split
            ? repoGrid(repoParts(model.repos, 'failure_share', order, fmtRate, bar('failure share'), 'failure share', segmentRule(model, 'rate')))
              .map(part => ({ ...part, hatch: model.at_least }))
            : whole('rate', model.failure_share, rateHover(model, label), model.at_least) },
        tokens: { length: gridLength(tokenTotal(model), top.tokens), text: tokenTotal(model) ? fmtN(tokenTotal(model)) : NOT_REPORTED,
          muted: !tokenTotal(model),
          parts: split ? tokenRepoParts(model, label, order) : tokenParts(model).map(part => ({
            key: part.id, label: part.label, value: part.value, fill: TOKEN_FILLS[part.id], hover: tokenHover(model, part, label) })) },
        thought: { length: 0, parts: [], text: thought || NOT_REPORTED, muted: !thought,
          lines: efforts.map(effort => `${effort.effort} ${effortCost(effort)}${thoughtText(effort) ? ` · ${thoughtText(effort)}` : ''}`) },
      },
    }
  })
}

/** The hover of a model's dot: its cost per priced request and its failure share, with their counts. */
export function scatterHover(model: ModelRow, tool: string) {
  return `${model.model} in ${tool}: ${perRequest(model.cost_per_request)} per priced request at list price over ` +
    `${plural(model.priced, 'priced request')}; ${model.at_least ? 'at least ' : ''}${fmtRate(model.failure_share)} of ` +
    `${plural(model.calls ?? 0, 'tool call')} marked failed${model.at_least ? ' (a floor: hollow dot)' : ''}. A dot is the model's whole, ` +
    'not split by repository.'
}

/** The dots of a tool's scatter: the models with both a cost per priced request and a failure share. */
export function scatterPoints(tool: ModelTool, label: string): ScatterPoint[] {
  return tool.models.filter(model => model.cost_per_request != null && model.failure_share != null).map(model => ({
    key: model.model, x: model.cost_per_request!, y: model.failure_share!, label: model.model, hollow: model.at_least,
    hover: scatterHover(model, label),
  }))
}
