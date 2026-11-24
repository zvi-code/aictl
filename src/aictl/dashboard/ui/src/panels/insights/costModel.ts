// ─── The marks of the cost views (Pause tax, Context carry, Context weight, Fixed context overhead) ─
// Pure functions: each builds the columns, rows or marks of one chart and the hover of every mark, in one of two
// encodings: coloured by the view's own parts, or a segment per repository (repoSplit.ts). Tests read them directly.
import { fmtDur, fmtNum, projectName } from '../../design/format'
import type { BarPart, BarRow } from './Bars'
import type { Column } from './charts/Columns'
import type { PairedRow } from './charts/PairedBars'
import {
  BUCKET_LABELS, CAUSE_LABELS, causeText, leftOut, money, pauseBucketHover, pauseCallHover, pauseCauseBars, pauseCauseHover, pauseEstimate,
  pauseEstimateHover, pauseMeasuredHover, pauseProjectHover, pauseProjects, plural, share, type Bucket, type Label, type PauseBody,
  type PauseCause,
} from './insightsModel'
import { notSplitNote, repoParts, type RepoSegment } from './repoSplit'
import type { ColourBy } from './charts/ColourBy'

const ratio = (part: number | null, whole: number | null) => part != null && whole != null && whole > 0 ? part / whole : null
const sum = (values: readonly (number | null | undefined)[]) => values.some(value => value != null)
  ? values.reduce<number>((total, value) => total + (value ?? 0), 0) : null
const anyRepos = (rows: readonly ({ repos?: readonly RepoSegment[] } | undefined)[]) => rows.some(row => row?.repos?.length)

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
export function pauseCauseRows(body: PauseBody, by: ColourMode, label: Label): BarRow[] {
  const all = causeText(body.summary.cause).trim()
  const bars = pauseCauseBars(body)
  if (by === 'repo') {
    return bars.flatMap(bar => bar.causes.filter(row => row.repos?.length).map(row => ({
      key: `${bar.tool}:${row.cause}`, label: `${label(bar.tool)}: ${CAUSE_LABELS[row.cause]}`,
      sub: `${plural(row.requests, 'request')} (${fmtNum(row.priced)} priced)`, total: money(row.cost_usd),
      parts: repoParts(row.repos, 'cost_usd', body.repo_order, value => money(value), `${label(bar.tool)}, ${CAUSE_LABELS[row.cause]}, cost`,
        'cost after pauses with this cause', pauseCauseHover(row, bar.total, label)),
    })))
  }
  return bars.map(bar => ({
    key: bar.tool, label: label(bar.tool), sub: plural(bar.requests, 'request'), total: money(bar.total),
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
export function pauseEstimateRows(body: PauseBody, by: ColourMode, label: Label): PairedRow[] {
  const totals = pauseTotalsText(body)
  return body.tools.filter(tool => tool.cache_reported && pauseEstimate(tool).requests > 0).map(tool => {
    const e = pauseEstimate(tool)
    const repos = by === 'repo' ? tool.long_pause?.repos : undefined
    const name = `${label(tool.tool)}, after pauses of 5 minutes or more`
    const measured = `${pauseMeasuredHover(tool, label)} ${totals}`
    const estimate = `${pauseEstimateHover(tool, label)} ${totals}`
    return {
      key: tool.tool, label: label(tool.tool), sub: `${plural(e.requests, 'request')} · estimate ${fmtNum(e.priced)} × ${money(e.average)}`,
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
export function pauseProjectRows(body: PauseBody, by: ColourMode): BarRow[] {
  const split = pauseProjects(body)
  const repo = by === 'repo' && split.top.some(row => row.repos.length)
  return [
    ...split.top.map((row): BarRow => ({
      key: row.project, label: projectName(row.project), title: row.project, sub: `${plural(row.sessions, 'session')} · ${plural(row.requests, 'request')}`,
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
export function pauseCallRows(body: PauseBody, by: ColourMode, label: Label): BarRow[] {
  return (body.cause_tools ?? []).map((row, i) => {
    const name = `${row.tool_name ?? 'unnamed call'}${row.program ? ` (${row.program})` : ''}`
    return {
      key: `${row.tool}:${row.tool_name ?? ''}:${row.program ?? ''}:${i}`, label: name,
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
