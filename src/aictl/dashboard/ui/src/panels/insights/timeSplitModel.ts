// ─── Where the time goes as a view: the rows its charts draw, coloured by kind or by repository ─
import { fmtMs, fmtN, fmtNum } from '../../design/format'
import type { BarRow, LegendItem } from './Bars'
import type { ColourMode } from './charts/ColourBy'
import type { StripChart } from './charts/PercentileStrip'
import {
  hours, millis, modelRest, plural, programHover, programName, reasoningHover, reasoningText, share, timePartHover,
  type Label, type TimeBody,
} from './insightsModel'
import { hasOther, notSplitNote, repoParts } from './repoSplit'

export const NO_THINKING = 'thinking time not recorded by this tool'
export const KIND_LEGEND: LegendItem[] = [
  { label: 'Model: thinking', tone: 3 }, { label: 'Model: rest of the request', tone: 2 }, { label: 'Tool calls', tone: 1 },
]

/** The one line under the title: what is measured, in what unit, over what. */
export function timeLine(body: TimeBody): string {
  if (body.summary.model_ms == null && body.summary.tool_ms == null) return 'No request or tool call with a recorded duration in this period.'
  return 'Summed durations of model requests and tool calls (hours), per tool and per program a command call ran.'
}

/** Whether the answer splits any bar by repository: the view then offers "Colour by: Repository". */
export const timeSplit = (body: TimeBody) => !!body.repo_order?.length && [...body.tools, ...body.programs].some(row => row.repos?.length)
export const timeOther = (body: TimeBody) => hasOther([...body.tools, ...body.programs])

/** Per tool one bar on a shared scale, its parts thinking, the rest of the model time, and tool calls. */
export function timeRows(body: TimeBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool),
    sub: `${plural(tool.requests, 'request')} · ${plural(tool.calls, 'call')}${tool.thinking_ms == null ? ` · ${NO_THINKING}` : ''}`,
    total: hours((tool.model_ms ?? 0) + (tool.tool_ms ?? 0)),
    parts: [
      { key: 'thinking', label: 'model, thinking', value: tool.thinking_ms, tone: 3, text: hours(tool.thinking_ms),
        hover: timePartHover(tool, 'thinking', label) },
      { key: 'model', label: 'model, rest of the request', value: modelRest(tool), tone: 2, text: hours(modelRest(tool)),
        hover: timePartHover(tool, 'model', label) },
      { key: 'tools', label: 'tool calls', value: tool.tool_ms, tone: 1, text: hours(tool.tool_ms), hover: timePartHover(tool, 'tools', label) },
    ],
  }))
}

/** Per tool the same bar (model + tool calls), its parts the repositories; a tool the answer did not split is one grey part. */
export function repoTimeRows(body: TimeBody, label: Label): BarRow[] {
  return body.tools.map(tool => {
    const total = tool.time_ms ?? ((tool.model_ms ?? 0) + (tool.tool_ms ?? 0))
    const detail = `${label(tool.tool)}: model ${hours(tool.model_ms)} + tool calls ${hours(tool.tool_ms)} = ${hours(total)}.`
    return {
      key: tool.tool, label: label(tool.tool), sub: `${plural(tool.requests, 'request')} · ${plural(tool.calls, 'call')}`,
      total: hours(total),
      parts: tool.repos?.length
        ? repoParts(tool.repos, 'time_ms', body.repo_order, value => hours(value), `${label(tool.tool)}, summed time`, 'summed time', detail)
        : [{ key: 'whole', label: 'summed time', value: total, tone: 7, text: hours(total), hover: `${detail} Not split by repository in this answer.` }],
    }
  })
}

/** Per tool that reports them: its reasoning tokens inside the output tokens of the same requests (100% bar). */
export function reasoningRows(body: TimeBody, label: Label): BarRow[] {
  return body.tools.filter(tool => (tool.reasoning_requests ?? 0) > 0).map(tool => {
    const reasoning = tool.reasoning_tokens ?? null, output = tool.reasoning_output_tokens ?? null
    const rest = reasoning != null && output != null ? Math.max(0, output - reasoning) : null
    return {
      key: tool.tool, label: label(tool.tool), sub: tool.thinking_ms == null ? NO_THINKING : undefined, total: reasoningText(tool),
      parts: [
        { key: 'reasoning', label: 'reasoning tokens', value: reasoning, tone: 3, text: reasoning == null ? '' : `${fmtN(reasoning)}`,
          hover: reasoningHover(tool, label) },
        { key: 'output', label: 'other output tokens', value: rest, tone: 6, text: rest == null ? '' : `${fmtN(rest)}`,
          hover: reasoningHover(tool, label) },
      ],
    }
  })
}

const programTotal = (body: TimeBody) => body.programs.reduce((sum, row) => sum + (row.duration_ms ?? 0), 0)

/** The programs ranked by summed time: one plain bar each (grey for a group that is not one program), or split by repository. */
export function programRows(body: TimeBody, mode: ColourMode): BarRow[] {
  const total = programTotal(body)
  return body.programs.map(row => ({
    key: `${row.group}:${row.program ?? ''}`, label: programName(row),
    sub: `${plural(row.calls, 'call')} · ${share(row.failure_share)} failed`,
    total: hours(row.duration_ms),
    parts: mode === 'repo' && row.repos?.length
      ? repoParts(row.repos, 'duration_ms', body.repo_order, value => hours(value), `${programName(row)}, summed time`, 'summed time',
        `${programHover(row, total)} The median and 95th percentile are of all the row's calls, not split by repository.`)
      : [{ key: 'time', label: 'summed time', value: row.duration_ms, tone: mode === 'repo' || row.group !== 'program' ? 7 : 1,
        text: hours(row.duration_ms), hover: programHover(row, total) }],
  }))
}

/** The duration of one call per program: the median (dot) and the 95th percentile (ring) on one axis. */
export function programStrip(body: TimeBody): StripChart {
  const total = programTotal(body)
  const note = body.repo_order?.length ? ` ${notSplitNote('median')}` : ''
  const rows = body.programs.filter(row => row.p50_ms != null || row.p95_ms != null).map(row => {
    const hover = programHover(row, total) + note
    const marks = [
      ...(row.p50_ms == null ? [] : [{ key: 'p50', shape: 'mid' as const, label: 'median', value: row.p50_ms, text: millis(row.p50_ms),
        hover: `Median call: ${millis(row.p50_ms)}. ${hover}` }]),
      ...(row.p95_ms == null ? [] : [{ key: 'p95', shape: 'high' as const, label: '95th percentile', value: row.p95_ms, text: millis(row.p95_ms),
        hover: `95th percentile call: ${millis(row.p95_ms)} (1 call in 20 took longer). ${hover}` }]),
    ]
    return { key: `${row.group}:${row.program ?? ''}`, label: programName(row), marks, muted: row.group !== 'program',
      text: `median ${millis(row.p50_ms)} · p95 ${millis(row.p95_ms)}` }
  })
  const top = Math.max(0, ...rows.flatMap(row => row.marks.map(mark => mark.value)))
  return { name: 'time-program-calls', title: 'Duration of one call, per program', rows, top, start: '0', end: fmtMs(top),
    axis: 'Position: seconds of one call, one linear scale from 0 for every program.',
    legend: [{ shape: 'mid', label: 'Median' }, { shape: 'high', label: '95th percentile' }] }
}

/** The muted lines that say what was not counted: requests and calls without a duration, recording errors, no thinking time. */
export function countedText(body: TimeBody, label: Label): string {
  const s = body.summary
  const parts = [`Not counted: ${fmtNum(s.untimed_requests)} requests and ${fmtNum(s.untimed_calls)} calls without a recorded duration`]
  if (s.overlong) parts.push(`${fmtNum(s.overlong)} requests or calls recorded as over 24 hours (${hours(s.overlong_ms)} in all)`)
  const silent = body.tools.filter(tool => tool.thinking_ms == null).map(tool => label(tool.tool))
  return `${parts.join('; ')}.${silent.length ? ` Thinking time not recorded by: ${silent.join(', ')}.` : ''}`
}
