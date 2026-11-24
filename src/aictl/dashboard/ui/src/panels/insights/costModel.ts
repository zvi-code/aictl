// ─── The marks of the cost views (Pause tax, Context carry, Context weight, Fixed context overhead) ─
// Pure functions: each builds the columns, rows or marks of one chart and the hover of every mark, in one of two
// encodings: coloured by the view's own parts, or a segment per repository (repoSplit.ts). Tests read them directly.
import { fmtDur, fmtN, fmtNum, fmtShare, fmtTimes, projectName, toolDisplayName } from '../../design/format'
import type { BarPart, BarRow } from './Bars'
import type { Column } from './charts/Columns'
import type { Opens } from './charts/Open'
import type { PairedRow } from './charts/PairedBars'
import type { StripRow } from './charts/MarkStrip'
import {
  BUCKET_LABELS, bytes, CAUSE_LABELS, carryHover, carryToolHover, causeText, CONTEXT_LABELS, contextCellHover, contextPercentileHover, count,
  leftOut, money, pauseBucketHover, pauseCallHover, pauseCauseBars, pauseCauseHover, pauseEstimate, pauseEstimateHover, pauseMeasuredHover,
  pauseProjectHover, pauseProjects, plural, repoPartsWith, segmentValue, share, SMALL_STEP_OUTPUT, smallRepoMore, smallStepHover, tokens,
  type Bucket, type CarryBody, type ContextBody, type ContextBucket, type ContextTool, type Label, type PauseBody, type PauseCause,
  FIXED_KINDS, FIXED_LABELS, fixedFileHover, fixedKindHover, fixedListingHover, fixedRepoMore, fixedSkillHover, fixedToolHover,
  NOT_REPORTED, NOT_SPLIT, type FixedBody,
} from './insightsModel'
import { notSplitNote, repoParts, type RepoSegment } from './repoSplit'
import type { ColourMode } from './charts/ColourBy'

const ratio = (part: number | null, whole: number | null) => part != null && whole != null && whole > 0 ? part / whole : null
const sum = (values: readonly (number | null | undefined)[]) => values.some(value => value != null)
  ? values.reduce<number>((total, value) => total + (value ?? 0), 0) : null
const anyRepos = (rows: readonly ({ repos?: readonly RepoSegment[] } | undefined)[]) => rows.some(row => row?.repos?.length)

// ─── What a name opens ────────────────────────────────────────────────────────────────
// A row that names a coding tool carries its id (`tool`), one that names a tool by its stored name `toolName`, a skill
// `skill`, a project folder `project`: the view turns these into what the name opens (charts/Open).

/** A row that names a coding tool: its id, for the page narrowed to it. */
export type ToolNamed = { tool?: string }

/** A data-table field's action: the coding tool whose id the row holds in `key` narrows the page to it. */
export function toolAction<T extends object>(open: Opens, label: Label, key: string) {
  const of = (row: T) => { const tool = String((row as Record<string, unknown>)[key] ?? ''); return open.product(tool, label(tool)) }
  return { label: (row: T) => of(row)?.label ?? '', run: (row: T) => of(row)?.run() }
}

// ─── Pause tax ───────────────────────────────────────────────────────────────────────

/** The one line under the title: what is measured, over what. */
export function pauseLine(body: PauseBody) {
  return 'Model requests and their cost at list price, by the pause before each request: the time since the previous request ' +
    `of the same session and agent.${leftOut(body.summary.unpriced_requests)}`
}

/** Pauses under 5 minutes in one tone, 5 minutes or more (past the prompt cache's 5 minutes) in another. */
export const PAUSE_TONE: Record<Bucket, number> = { under_1m: 6, '1_5m': 6, '5_60m': 1, over_60m: 1 }
export const PAUSE_LEGEND = [{ label: 'Pause under 5 min', tone: 6 }, { label: 'Pause of 5 min or more', tone: 1 }]
export const CAUSE_TONE: Record<PauseCause, number> = {
  tool_running: 1, other_agent_working: 5, person_asked: 4, new_prompt: 0, tool_short_or_untimed: 3, nothing_recorded: 7,
}

/** Whether any mark of the view has a split by repository: the switch is drawn only then. */
export const pauseSplit = (body: PauseBody) => anyRepos([...body.tools.flatMap(tool => [...tool.buckets, tool.long_pause]),
  ...(body.projects ?? []), ...(body.causes ?? []), ...(body.cause_tools ?? [])])

type PauseTool = PauseBody['tools'][number]
export type PauseMeasure = 'requests' | 'cost' | 'average'

/** One tool's columns over the four pause lengths, for one measure; a segment per repository for requests and cost when `by` is repo. */
export function pauseColumns(body: PauseBody, tool: PauseTool, measure: PauseMeasure, by: ColourMode, label: Label): Column[] {
  const requests = tool.buckets.reduce((total, cell) => total + cell.requests, 0)
  const cost = sum(tool.buckets.map(cell => cell.cost_usd))
  return tool.buckets.map(cell => {
    const hover = pauseBucketHover(tool, cell, label)
    const value = measure === 'requests' ? cell.requests : measure === 'cost' ? cell.cost_usd : cell.avg_cost_usd
    const text = measure === 'requests' ? fmtNum(cell.requests) : money(value)
    const sub = measure === 'requests' ? share(ratio(cell.requests, requests)) : measure === 'cost' ? share(ratio(cell.cost_usd, cost))
      : `${fmtNum(cell.priced)} priced`
    const name = `${label(tool.tool)}, pause ${BUCKET_LABELS[cell.bucket]}`
    const split = by === 'repo' && measure !== 'average' && cell.repos?.length
    const parts: BarPart[] = split
      ? repoParts(cell.repos, measure === 'requests' ? 'requests' : 'cost_usd', body.repo_order,
        measure === 'requests' ? fmtNum : value => money(value), `${name}, ${measure === 'requests' ? 'requests' : 'cost'}`,
        measure === 'requests' ? 'requests after any pause' : 'cost after any pause', hover)
      // Coloured by repository, a mark that is not split is grey: a pause-length colour would read as a repository's.
      : [{ key: cell.bucket, label: measure === 'average' ? 'average cost per request' : measure, value, text,
        tone: by === 'repo' ? 7 : PAUSE_TONE[cell.bucket],
        hover: hover + (by === 'repo' && measure === 'average' ? ` ${notSplitNote('average')}` : '') }]
    return { key: cell.bucket, label: BUCKET_LABELS[cell.bucket], sub, total: text, parts }
  })
}

/** Per tool, its cost after pauses of 5 minutes or more by recorded cause (100% bars), or per tool and cause by repository. */
export function pauseCauseRows(body: PauseBody, by: ColourMode, label: Label): (BarRow & ToolNamed)[] {
  const all = causeText(body.summary.cause).trim()
  const bars = pauseCauseBars(body)
  if (by === 'repo') {
    return bars.flatMap(bar => bar.causes.filter(row => row.repos?.length).map(row => ({
      key: `${bar.tool}:${row.cause}`, label: `${label(bar.tool)}: ${CAUSE_LABELS[row.cause]}`, tool: bar.tool,
      sub: `${plural(row.requests, 'request')} (${fmtNum(row.priced)} priced)`, total: money(row.cost_usd),
      parts: repoParts(row.repos, 'cost_usd', body.repo_order, value => money(value), `${label(bar.tool)}, ${CAUSE_LABELS[row.cause]}, cost`,
        'cost after pauses with this cause', pauseCauseHover(row, bar.total, label)),
    })))
  }
  return bars.map(bar => ({
    key: bar.tool, label: label(bar.tool), tool: bar.tool, sub: plural(bar.requests, 'request'), total: money(bar.total),
    parts: bar.causes.map(row => ({
      key: row.cause, label: CAUSE_LABELS[row.cause], value: row.cost_usd, tone: CAUSE_TONE[row.cause],
      text: `${money(row.cost_usd)} · ${share(row.share)}`, hover: [pauseCauseHover(row, bar.total, label), all].filter(Boolean).join(' '),
    })),
  }))
}

/** The hover line of every estimate mark: the totals over all compared tools, as the store summed them. */
export function pauseTotalsText(body: PauseBody) {
  const s = body.summary
  return `All compared tools: ${plural(s.requests, 'request')} after a pause of 5 minutes or more, measured ${money(s.cost_usd)}, ` +
    `estimate ${money(s.baseline_usd)}, difference ${money(s.extra_usd)}.`
}

/** Per tool: measured cost after pauses of 5 minutes or more, beside the estimate (not measured), on one scale. */
export function pauseEstimateRows(body: PauseBody, by: ColourMode, label: Label): (PairedRow & ToolNamed)[] {
  const totals = pauseTotalsText(body)
  return body.tools.filter(tool => tool.cache_reported && pauseEstimate(tool).requests > 0).map(tool => {
    const e = pauseEstimate(tool)
    const repos = by === 'repo' ? tool.long_pause?.repos : undefined
    const name = `${label(tool.tool)}, after pauses of 5 minutes or more`
    const measured = `${pauseMeasuredHover(tool, label)} ${totals}`
    const estimate = `${pauseEstimateHover(tool, label)} ${totals}`
    return {
      key: tool.tool, label: label(tool.tool), tool: tool.tool, sub: `${plural(e.requests, 'request')} · estimate ${fmtNum(e.priced)} × ${money(e.average)}`,
      cells: [
        { total: money(e.cost), parts: repos?.length
          ? repoParts(repos, 'cost_usd', body.repo_order, value => money(value), `${name}, measured cost`,
            'measured cost after pauses of 5 minutes or more', measured)
          : [{ key: 'measured', label: 'measured cost', value: e.cost, tone: 1, text: money(e.cost), hover: measured }] },
        { total: `${money(e.estimate)} (estimate)`, parts: repos?.length
          ? repoParts(repos, 'estimate_usd', body.repo_order, value => money(value),
            `${name}, estimate (not measured: the repository's priced requests × ${money(e.average)})`, 'estimate', estimate)
          : [{ key: 'estimate', label: 'estimate (not measured)', value: e.estimate, tone: 6, text: money(e.estimate), hover: estimate }] },
      ],
    }
  })
}

/** The projects with the largest measured cost minus the estimate after long pauses, every other project summed. */
export function pauseProjectRows(body: PauseBody, by: ColourMode): (BarRow & { project?: string })[] {
  const split = pauseProjects(body)
  const repo = by === 'repo' && split.top.some(row => row.repos.length)
  return [
    ...split.top.map((row): BarRow & { project?: string } => ({
      key: row.project, label: projectName(row.project), title: row.project, project: row.project, sub: `${plural(row.sessions, 'session')} · ${plural(row.requests, 'request')}`,
      total: money(row.extra), parts: repo && row.repos.length ? repoParts(row.repos, 'extra_usd', body.repo_order, value => money(value),
        `${projectName(row.project)}, measured cost minus the estimate`, 'measured cost minus the estimate', pauseProjectHover(row, 0))
        : [{ key: 'difference', label: 'measured minus estimate', value: row.extra, tone: 1, text: money(row.extra), hover: pauseProjectHover(row, 0) }],
    })),
    ...(split.rest ? [{ key: 'rest', label: 'Other projects', sub: 'summed', total: money(split.rest),
      parts: [{ key: 'difference', label: 'measured minus estimate', value: split.rest, tone: 7, text: money(split.rest),
        hover: pauseProjectHover(null, split.rest) + (repo ? ' Not split by repository: this bar is the view\'s total difference ' +
          'less the projects drawn above.' : '') }] }] : []),
  ]
}

/** The calls still running through a pause of 5 minutes or more, by the cost of the requests after those pauses. */
export function pauseCallRows(body: PauseBody, by: ColourMode, label: Label): (BarRow & { toolName: string })[] {
  return (body.cause_tools ?? []).map((row, i) => {
    const name = `${row.tool_name ?? 'unnamed call'}${row.program ? ` (${row.program})` : ''}`
    return {
      key: `${row.tool}:${row.tool_name ?? ''}:${row.program ?? ''}:${i}`, label: name, toolName: row.tool_name ?? '',
      sub: `${label(row.tool)} · ${plural(row.requests, 'pause')} · ran ${fmtDur(row.p50_call_s)} median, ${fmtDur(row.max_call_s)} at most`,
      total: money(row.cost_usd),
      parts: by === 'repo' && row.repos?.length ? repoParts(row.repos, 'cost_usd', body.repo_order, value => money(value),
        `${name}, cost after the pauses`, 'cost after these pauses',
        `${pauseCallHover(row, label)} The median and longest call durations are of all the row's calls, not split by repository.`)
        : [{ key: 'cost', label: 'cost after the pauses', value: row.cost_usd, tone: CAUSE_TONE.tool_running, text: money(row.cost_usd),
          hover: pauseCallHover(row, label) }],
    }
  })
}

// ─── Context carry ──────────────────────────────────────────────────────────────────

export function carryLine() {
  return 'Bytes of tool results as the sources recorded them, and an estimate (upper bound) of those bytes sent again with ' +
    'later requests of the same session and agent.'
}

export const carrySplit = (body: CarryBody) => anyRepos([...body.tool_names, ...body.tools])

/** The hover line of every estimate mark: the whole period, and how many times a result byte was sent again at most. */
export function carryTotalsText(body: CarryBody) {
  const s = body.summary
  const times = ratio(s.carried_bytes, s.output_bytes)
  return `All tools: ${bytes(s.output_bytes)} of results, up to ${bytes(s.carried_bytes)} sent again ` +
    `(${times == null ? 'not reported' : `${fmtTimes(times)} the result bytes`}, estimate).`
}

export const NOT_REPORTED_SIZE = 'result size not reported'
const MEASURE = { output: 'result bytes', carried: 'bytes sent again (upper bound)' }
type CarrySizes = { output_bytes: number | null; carried_bytes: number | null; repos?: RepoSegment[] }

/** One lane of a carry row: result bytes, or the estimate; a segment per repository when `by` is repo and the row is split. */
function carryCell(body: CarryBody, row: CarrySizes, of: 'output' | 'carried', by: ColourMode, name: string, hover: string) {
  const key = of === 'output' ? 'output_bytes' : 'carried_bytes'
  const value = row[key]
  if (value == null) return { parts: [], total: NOT_REPORTED_SIZE }
  return {
    total: of === 'output' ? bytes(value) : `up to ${bytes(value)}`,
    parts: by === 'repo' && row.repos?.length
      ? repoParts(row.repos, key, body.repo_order, value => bytes(value), `${name}, ${MEASURE[of]}`, MEASURE[of], hover)
      : [{ key: of, label: MEASURE[of], tone: of === 'output' ? 2 : 0, value, text: bytes(value), hover }],
  }
}

/** Per tool name (the 10 with the largest estimate): result bytes beside the bytes sent again, each lane on its own scale. */
export function carryNameRows(body: CarryBody, by: ColourMode, label: Label): (PairedRow & { toolName: string })[] {
  const totals = carryTotalsText(body)
  return body.tool_names.map(row => {
    const name = `${toolDisplayName(row.tool_name)} (${label(row.tool)})`
    return {
      key: `${row.tool}:${row.tool_name}`, label: toolDisplayName(row.tool_name), toolName: row.tool_name,
      sub: `${label(row.tool)} · ${plural(row.calls, 'call')} · ≈ ${count(row.avg_later_requests)} later requests`,
      cells: [carryCell(body, row, 'output', by, name, carryHover(row, label)),
        carryCell(body, row, 'carried', by, name, `${carryHover(row, label)} ${totals}`)],
    }
  })
}

/** Per tool: result bytes beside the bytes sent again; a tool that reports no result size is a row with no bar. */
export function carryToolRows(body: CarryBody, by: ColourMode, label: Label): (PairedRow & ToolNamed)[] {
  const totals = carryTotalsText(body)
  return body.tools.map(row => ({
    key: row.tool, label: label(row.tool), tool: row.tool, sub: `${fmtNum(row.reported)} of ${plural(row.calls, 'call')} with a size`,
    cells: [carryCell(body, row, 'output', by, label(row.tool), carryToolHover(row, label)),
      carryCell(body, row, 'carried', by, label(row.tool), `${carryToolHover(row, label)} ${totals}`)],
  }))
}

// ─── Context weight ─────────────────────────────────────────────────────────────────

export function contextLine(body: ContextBody) {
  return 'Model requests with token counts and their cost at list price, by the context each request read: input + cache ' +
    `read + cache write tokens.${leftOut(body.summary.unpriced_requests)}`
}

const HEAVY: readonly ContextBucket[] = ['200_500k', 'over_500k']
export const CONTEXT_TONE = (bucket: ContextBucket) => HEAVY.includes(bucket) ? 1 : 6
export const CONTEXT_LEGEND = [{ label: 'Context under 200k tokens', tone: 6 }, { label: 'Context of 200k tokens or more', tone: 1 }]
/** The reference lines of the percentile strip: the bucket boundaries. */
export const CONTEXT_REFS = [{ value: 50_000, label: '50k' }, { value: 100_000, label: '100k' }, { value: 200_000, label: '200k' },
  { value: 500_000, label: '500k' }]

export const contextSplit = (body: ContextBody) =>
  anyRepos([...body.tools, ...body.tools.flatMap(tool => tool.buckets), ...body.tools.map(tool => ({ repos: tool.small_repos }))])

/** The hover line of the columns of 200k tokens or more: those requests over all tools, as the store summed them. */
export function contextHeavyText(body: ContextBody) {
  const s = body.summary
  return `All tools, context of 200k tokens or more: ${fmtNum(s.heavy_requests)} of ${plural(s.reported, 'request')} ` +
    `(${share(s.heavy_share)}), ${money(s.heavy_cost_usd)} of ${money(s.cost_usd)} at list price (${share(s.heavy_cost_share)}).`
}

/** A repository's whole of one tool (every bucket), named in the hover of its segment in each bucket. */
function contextRepoMore(tool: ContextTool, of: 'requests' | 'cost') {
  return (segment: RepoSegment) => {
    const whole = tool.repos?.find(item => item.repo === segment.repo)
    if (!whole) return ''
    const key = of === 'requests' ? 'reported' : 'cost_usd'
    const value = of === 'requests' ? plural(segmentValue(whole, key) ?? 0, 'request') : `${money(segmentValue(whole, key))} at list price`
    const own = whole.of_repo?.[key]
    return `This repository in every context size: ${value} · ${share(whole.share?.[key] ?? null)} of the tool's` +
      `${own == null ? '' : ` · ${fmtShare(own)} of its own ${of === 'requests' ? 'requests' : 'cost'}`}.`
  }
}

/** One tool's columns over the five context sizes, for requests or cost; a segment per repository when `by` is repo. */
export function contextColumns(body: ContextBody, tool: ContextTool, of: 'requests' | 'cost', by: ColourMode, label: Label): Column[] {
  const heavy = contextHeavyText(body)
  return tool.buckets.map(cell => {
    const hover = contextCellHover(tool, cell, label) + (HEAVY.includes(cell.bucket) ? ` ${heavy}` : '')
    const value = of === 'requests' ? cell.requests : cell.cost_usd
    const text = of === 'requests' ? fmtNum(cell.requests) : money(cell.cost_usd)
    const measure = of === 'requests' ? 'requests' : 'cost at list price'
    return {
      key: cell.bucket, label: CONTEXT_LABELS[cell.bucket], sub: share(of === 'requests' ? cell.request_share : cell.cost_share), total: text,
      parts: by === 'repo' && cell.repos?.length
        ? repoPartsWith(cell.repos, of === 'requests' ? 'requests' : 'cost_usd', body.repo_order,
          of === 'requests' ? value => plural(value, 'request') : value => money(value),
          `${label(tool.tool)}, context ${CONTEXT_LABELS[cell.bucket]} tokens, ${measure}`, measure, hover, contextRepoMore(tool, of))
        : [{ key: cell.bucket, label: `${CONTEXT_LABELS[cell.bucket]} tokens`, value, text, hover,
          tone: by === 'repo' ? 7 : CONTEXT_TONE(cell.bucket) }],
    }
  })
}

/** Per tool with token counts: its median and 90th percentile context on one axis of tokens. */
export function contextStripRows(body: ContextBody, by: ColourMode, label: Label): (StripRow & ToolNamed)[] {
  return body.tools.filter(tool => tool.reported).map(tool => ({
    key: tool.tool, label: label(tool.tool), tool: tool.tool, sub: plural(tool.reported, 'request'),
    total: `${tool.p50_context == null ? 'not reported' : fmtN(tool.p50_context)} · ${tool.p90_context == null ? 'not reported' : fmtN(tool.p90_context)}`,
    marks: (['p50', 'p90'] as const).map(which => {
      const value = which === 'p50' ? tool.p50_context : tool.p90_context
      return { key: which, label: which === 'p50' ? 'median' : '90th percentile', value, text: tokens(value), shape: which === 'p50' ? 'dot' : 'tick',
        hover: contextPercentileHover(tool, which, label) + (by === 'repo' ? ` ${notSplitNote(which === 'p50' ? 'median' : '90th percentile')}` : '') }
    }),
  }))
}

/** Per tool: its small steps (under the output limit, no thinking time); a segment per repository when `by` is repo. */
export function contextSmallRows(body: ContextBody, by: ColourMode, label: Label): (BarRow & ToolNamed)[] {
  const s = body.summary
  const all = `All tools: ${count(s.small_requests)} small steps, ${money(s.small_cost_usd)} at list price.`
  return body.tools.map(tool => {
    const hover = `${smallStepHover(tool, label)} ${all}`
    return {
      key: tool.tool, label: label(tool.tool), tool: tool.tool,
      total: tool.small_requests == null ? 'not reported' : `${plural(tool.small_requests, 'request')} · ${money(tool.small_cost_usd)}`,
      parts: tool.small_requests == null ? [] : by === 'repo' && tool.small_repos?.length
        ? repoPartsWith(tool.small_repos, 'small_requests', body.repo_order, value => plural(value, 'request'),
          `${label(tool.tool)}, small steps`, 'small-step requests', hover, smallRepoMore)
        : [{ key: 'small', label: 'requests', value: tool.small_requests, tone: 3, text: fmtNum(tool.small_requests), hover }],
    }
  })
}
export const SMALL_TITLE = `Requests under ${SMALL_STEP_OUTPUT} output tokens, no thinking time`

// ─── Fixed context overhead ─────────────────────────────────────────────────────────

export function fixedLine() {
  return 'Tokens each tool puts in a session\'s main-agent context before any work, by kind; estimated from item sizes, ' +
    'per session over the tool\'s sessions.'
}

export const FIXED_TONE = [0, 2, 4, 1, 3, 6, 5]
export const FIXED_LEGEND = FIXED_KINDS.map((kind, i) => ({ label: FIXED_LABELS[kind], tone: FIXED_TONE[i] }))
const short = (value: number | null) => value == null ? '' : fmtN(value)

export const fixedSplit = (body: FixedBody) => anyRepos([...body.tools, ...body.tools.flatMap(tool => tool.kinds)])

/**
 * Per tool, its average fixed context per session stacked by kind on one scale; or, coloured by repository, per tool its
 * average in a segment per repository, then each kind's average the same way (a repository's tokens / all the tool's sessions).
 */
export function fixedKindRows(body: FixedBody, by: ColourMode, label: Label): (BarRow & ToolNamed)[] {
  if (by === 'repo') {
    return body.tools.filter(tool => tool.repos?.length).flatMap(tool => [
      { key: tool.tool, label: label(tool.tool), tool: tool.tool, sub: `all kinds · ${plural(tool.sessions, 'session')}`, total: `average ${tokens(tool.avg_tokens)}`,
        parts: repoPartsWith(tool.repos, 'avg_tokens', body.repo_order, value => tokens(value), `${label(tool.tool)}, average fixed context`,
          'average fixed context', fixedToolHover(tool, label), segment => fixedRepoMore(tool, segment)) },
      ...tool.kinds.filter(cell => cell.reported && cell.repos?.length).map(cell => ({
        key: `${tool.tool}:${cell.kind}`, label: `${label(tool.tool)}: ${FIXED_LABELS[cell.kind]}`, tool: tool.tool, total: `average ${tokens(cell.avg_tokens)}`,
        parts: repoPartsWith(cell.repos, 'avg_tokens', body.repo_order, value => tokens(value),
          `${label(tool.tool)}, ${FIXED_LABELS[cell.kind].toLowerCase()}, average per session`, 'average per session',
          `${fixedKindHover(tool, cell, label)} ${notSplitNote('median')}`, segment => fixedRepoMore(tool, segment)),
      })),
    ])
  }
  return body.tools.map(tool => {
    const missing = tool.kinds.filter(cell => !cell.reported).map(cell => FIXED_LABELS[cell.kind])
    return {
      key: tool.tool, label: label(tool.tool), tool: tool.tool,
      sub: plural(tool.sessions, 'session') + (tool.estimated ? ' · estimated' : '') +
        (missing.length ? ` · ${NOT_REPORTED}: ${missing.join(', ')}` : ''),
      total: `average ${tokens(tool.avg_tokens)}`,
      parts: tool.kinds.filter(cell => cell.reported).map(cell => ({
        key: cell.kind, label: FIXED_LABELS[cell.kind], value: cell.avg_tokens, tone: FIXED_TONE[FIXED_KINDS.indexOf(cell.kind)],
        text: short(cell.avg_tokens), hover: fixedKindHover(tool, cell, label),
      })),
    }
  })
}

/** Per tool: the median, 90th percentile and average of a session's whole fixed context on one axis of tokens. */
export function fixedStripRows(body: FixedBody, by: ColourMode, label: Label): (StripRow & ToolNamed)[] {
  return body.tools.filter(tool => tool.p50_tokens != null || tool.avg_tokens != null).map(tool => {
    const whole = fixedToolHover(tool, label)
    const marks = [
      { key: 'p50', label: 'median', value: tool.p50_tokens, shape: 'dot' as const },
      { key: 'p90', label: '90th percentile', value: tool.p90_tokens, shape: 'tick' as const },
      { key: 'avg', label: 'average', value: tool.avg_tokens, shape: 'ring' as const },
    ]
    return {
      key: tool.tool, label: label(tool.tool), tool: tool.tool, sub: plural(tool.sessions, 'session'),
      total: `${short(tool.p50_tokens) || NOT_REPORTED} · ${short(tool.p90_tokens) || NOT_REPORTED}`,
      marks: marks.map(mark => ({ ...mark, text: tokens(mark.value),
        hover: `${label(tool.tool)}, ${mark.label} fixed context per session: ${tokens(mark.value)}${tool.estimated ? ' (estimated)' : ''}. ` +
          (by === 'repo' ? whole : whole.replace(` ${notSplitNote('median')}`, '')) })),
    }
  })
}

const unsplit = (on: boolean, hover: string) => on ? `${hover} ${NOT_SPLIT}` : hover

/** Per tool reporting its skill listing: the listing tokens of the skills used and not used in the period (100%). */
export function fixedListingRows(body: FixedBody, by: ColourMode, label: Label): (BarRow & ToolNamed)[] {
  const repo = by === 'repo'
  return body.skills.filter(row => row.listing_tokens != null).map(row => ({
    key: row.tool, label: label(row.tool), tool: row.tool, sub: `${count(row.used)} of ${count(row.listed)} skills used`, total: tokens(row.listing_tokens),
    parts: [
      { key: 'used', label: 'skills used', value: row.listing_tokens! - (row.unused_tokens ?? 0), tone: 2,
        text: short(row.listing_tokens! - (row.unused_tokens ?? 0)), hover: unsplit(repo, fixedListingHover(row, 'used', label)) },
      { key: 'unused', label: 'skills not used', value: row.unused_tokens, tone: 7, text: short(row.unused_tokens),
        hover: unsplit(repo, fixedListingHover(row, 'unused', label)) },
    ],
  }))
}

export function fixedFileRows(body: FixedBody, by: ColourMode, label: Label): BarRow[] {
  return body.files.map(row => ({
    key: `${row.tool}:${row.file}`, label: row.file, sub: `${label(row.tool)} · largest ${tokens(row.max_tokens)} · ${plural(row.sessions, 'session')}`,
    total: `${tokens(row.avg_tokens)} per load`,
    // Coloured by repository, a bar that is not split is grey: a chart colour would read as a repository's.
    parts: [{ key: 'avg', label: 'tokens per load', value: row.avg_tokens, tone: by === 'repo' ? 7 : 0, text: short(row.avg_tokens),
      hover: unsplit(by === 'repo', fixedFileHover(row, label)) }],
  }))
}

export function fixedSkillRows(body: FixedBody, by: ColourMode, label: Label): (BarRow & { skill: string })[] {
  return body.top_skills.map(row => ({
    key: `${row.tool}:${row.name}`, label: row.name, skill: row.name, sub: `${label(row.tool)} · ${plural(row.sessions, 'session')}`,
    total: `${tokens(row.tokens)} · ${row.uses ? plural(row.uses, 'use') : 'no use in the period'}`,
    parts: [{ key: 'tokens', label: 'listing tokens', value: row.tokens, tone: row.uses && by !== 'repo' ? 1 : 7, text: short(row.tokens),
      hover: unsplit(by === 'repo', fixedSkillHover(row, label)) }],
  }))
}
