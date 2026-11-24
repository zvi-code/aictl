// ─── Where session time goes as a view: the rows its charts draw, coloured by kind or by repository ─
import { fmtHours, fmtMs, fmtNum, fmtShare } from '../../design/format'
import type { BarPart, BarRow, LegendItem } from './Bars'
import type { ColourMode } from './charts/ColourBy'
import type { StripChart, StripMark, StripRow } from './charts/PercentileStrip'
import { notSplitNote, repoColour } from './repoSplit'
import {
  durationFinding, durationFirstChangeRange, durationSessionRange, medianNote, modelRange, modelTimeChart, rowRepoNote, SHOWN, splitRows,
  toolRange, toolTimeChart, TOOLS_SHOWN, type BarChart, type DurationBody, type DurationRepo, type RangeChart,
} from './workModel'

const hours = (value: number | null) => value == null ? 'not reported' : fmtHours(value)
const pct = (value: number | null) => value == null ? 'not reported' : fmtShare(value)

/** The one line under the title: what is measured, in what unit, over what; or why nothing is drawn. */
export function durationLine(body: DurationBody): string {
  const s = body.summary
  if (!s.sessions || !s.timed || s.agent_ms == null) return durationFinding(body)
  return 'Agent working time and waiting time between turns per repository (hours), and the duration of model requests and ' +
    'tool calls, summed and per call.'
}

/** Whether the answer splits any bar by repository: the view then offers "Colour by: Repository". */
export const durationSplit = (body: DurationBody) => !!body.repo_order?.length &&
  [...body.repos, ...body.tools, ...body.models].some(row => row.repos?.length)

export const SESSION_LEGEND: LegendItem[] = [{ label: 'Agent working time', tone: 2 }, { label: 'Waiting for a person between turns', tone: 1 }]
export const MODEL_TOOL_LEGEND: LegendItem[] = [{ label: 'Model requests', tone: 0 }, { label: 'Tool calls', tone: 3 }]

/** The colour of a repository's own row: its rank colour, or grey when not among the 8 (or the answer carries no split). */
const ownColour = (repo: DurationRepo, body: DurationBody) => repo.repos?.length ? repoColour(body.repo_order, repo.repos[0].repo) : -1

/**
 * Per repository one bar of two parts on one scale for every row. By kind, each part in its kind's colour (grey when
 * the repository has too few sessions); by repository, both in the repository's colour, the second lighter.
 */
function pairRows(body: DurationBody, mode: ColourMode, pick: (repo: DurationRepo) => {
  sub: string; parts: [{ key: string; label: string; value: number | null; tone: number; hover: string },
    { key: string; label: string; value: number | null; tone: number; hover: string }]
}): BarRow[] {
  return body.repos.slice(0, SHOWN).map(repo => {
    const pair = pick(repo)
    const colour = ownColour(repo, body)
    const note = mode === 'repo' ? rowRepoNote(repo, body.repo_order) : ''
    const parts: BarPart[] = pair.parts.map((part, i) => ({
      key: part.key, label: part.label, value: part.value, text: hours(part.value), hover: part.hover + note,
      tone: repo.small ? 7 : part.tone, ...(mode === 'repo' ? { repo: colour, light: i === 1 } : {}),
    }))
    const sum = pair.parts.reduce((total, part) => total + (part.value ?? 0), 0)
    return { key: repo.name, label: repo.name, sub: pair.sub, total: hours(sum), parts }
  })
}

const workTotal = (body: DurationBody) => body.repos.reduce((sum, repo) => sum + (repo.agent_ms ?? 0), 0)

/** Working and waiting time per repository. */
export function sessionTimeRows(body: DurationBody, mode: ColourMode): BarRow[] {
  const all = workTotal(body)
  return pairRows(body, mode, repo => {
    const small = repo.small ? ' Too few to compare (fewer than 5 sessions with turn times): drawn grey.' : ''
    return {
      sub: `${repo.kind} · ${fmtNum(repo.timed)} of ${fmtNum(repo.sessions)} sessions timed`,
      parts: [
        { key: 'working', label: 'agent working time', value: repo.agent_ms, tone: 2,
          hover: `${repo.name}, agent working time: ${hours(repo.agent_ms)}, ${pct(repo.agent_share)} of ${fmtHours(all)}, in ` +
            `${fmtNum(repo.timed)} sessions with turn times (of ${fmtNum(repo.sessions)}); the sum of turns from first to last line.${small}` },
        { key: 'waiting', label: 'waiting for a person', value: repo.wait_ms, tone: 1,
          hover: `${repo.name}, waiting for a person between turns: ${hours(repo.wait_ms)} over ${fmtNum(repo.waits)} waits; from ` +
            `the end of a turn to the next turn a person started.${small}` },
      ],
    }
  })
}

/** Summed model request time and tool-call time per repository. */
export function modelToolRows(body: DurationBody, mode: ColourMode): BarRow[] {
  return pairRows(body, mode, repo => ({
    sub: `${fmtNum(repo.requests)} requests · ${fmtNum(repo.calls)} calls`,
    parts: [
      { key: 'model', label: 'model requests', value: repo.model_ms, tone: 0,
        hover: `${repo.name}, model request time: ${hours(repo.model_ms)} summed over ${fmtNum(repo.requests)} requests.` },
      { key: 'tools', label: 'tool calls', value: repo.tool_ms, tone: 3,
        hover: `${repo.name}, tool-call time: ${hours(repo.tool_ms)} summed over ${fmtNum(repo.calls)} calls. Parallel calls overlap, ` +
          'so sums can exceed elapsed time.' },
    ],
  }))
}

/** A ranking of summed time (tools or models): one plain bar each by kind, a part per repository by repository. */
export function rankRows(chart: BarChart, items: DurationBody['tools'] | DurationBody['models'], body: DurationBody, mode: ColourMode,
  tone: number): BarRow[] {
  const split = mode === 'repo' ? splitRows(chart, items, 'total_ms', body.repo_order, fmtHours, 'summed time', medianNote(body.repo_order)) : null
  if (split) return split
  return chart.rows.map(row => ({
    key: row.key, label: row.name, sub: row.sub || undefined, total: row.tracks[0]?.text ?? '',
    parts: [{ key: 'time', label: 'summed time', value: row.tracks[0]?.parts[0]?.value ?? 0, tone: row.small ? 7 : tone,
      text: row.tracks[0]?.text ?? '', hover: row.hover }],
  }))
}

export const toolRankRows = (body: DurationBody, mode: ColourMode) => rankRows(toolTimeChart(body), body.tools.slice(0, TOOLS_SHOWN), body, mode, 3)
export const modelRankRows = (body: DurationBody, mode: ColourMode) => rankRows(modelTimeChart(body), body.models, body, mode, 0)

/**
 * A range chart (median, upper percentile, longest) as a percentile strip: a mark per figure the row has, each with its
 * name and the row's hover; a row with too little data keeps its line and no marks. `repo`: the swatch of each row's
 * repository (the per-repository strips when coloured by repository).
 */
export function rangeStrip(chart: RangeChart, upper: string, note: string, repos?: (number | undefined)[]): StripChart {
  const rows = chart.rows.map((row, i): StripRow => {
    const mark = (key: string, shape: StripMark['shape'], label: string, value: number | null): StripMark[] => value == null ? []
      : [{ key, shape, label, value, text: fmtMs(value), hover: `${label[0].toUpperCase()}${label.slice(1)}: ${fmtMs(value)}. ${row.hover}${note}` }]
    return {
      key: row.key, label: row.name, sub: row.sub, text: row.text, muted: row.small, repo: repos?.[i],
      marks: [...mark('p50', 'mid', 'median', row.mid), ...mark(upper, 'high', `${upper === 'p90' ? '90th' : '95th'} percentile`, row.high),
        ...mark('max', 'max', 'longest', row.max)],
    }
  })
  const top = chart.top
  return { name: chart.id, title: chart.title, rows, top, start: '0', end: fmtMs(top),
    axis: 'Position: duration, one linear scale from 0 for every row.',
    legend: [{ shape: 'mid', label: 'Median' }, { shape: 'high', label: `${upper === 'p90' ? '90th' : '95th'} percentile` },
      ...(chart.rows.some(row => row.max != null) ? [{ shape: 'max' as const, label: 'Longest' }] : [])] }
}

/** The per-repository strips: working time per session, and time to the first file change. */
export function sessionStrip(body: DurationBody, mode: ColourMode): StripChart {
  const repos = mode === 'repo' ? body.repos.slice(0, SHOWN).map(repo => repo.repos?.length ? ownColour(repo, body) : undefined) : undefined
  return rangeStrip(durationSessionRange(body), 'p90', '', repos)
}
export function firstChangeStrip(body: DurationBody, mode: ColourMode): StripChart {
  const repos = mode === 'repo' ? body.repos.slice(0, SHOWN).map(repo => repo.repos?.length ? ownColour(repo, body) : undefined) : undefined
  return rangeStrip(durationFirstChangeRange(body), 'p90', '', repos)
}
const splitNote = (body: DurationBody) => body.repo_order?.length ? ` ${notSplitNote('median')}` : ''
export const toolStrip = (body: DurationBody) => rangeStrip(toolRange(body), 'p95', splitNote(body))
export const modelStrip = (body: DurationBody) => rangeStrip(modelRange(body), 'p95', splitNote(body))
