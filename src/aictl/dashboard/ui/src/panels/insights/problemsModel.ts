// ─── Problem sessions at full width: the line under the title and the heat grids of the view ─
// The payload and the hover of each figure are in insightsModel.ts (ProblemBody, problemSignalHover, problemPairHover, …).
import { fmtNum, fmtShare, fmtUsd, projectName } from '../../design/format'
import type { HeatColumn, HeatRow } from './charts/HeatGrid'
import { EVIDENCE } from './evidence'
import {
  money, plural, problemCellHover, problemPairHover, problemSignalHover, share, SIGNAL_LABELS, signalName, SIGNALS,
  type Label, type ProblemBody, type Signal,
} from './insightsModel'
import { repoName, type RepoSegment } from './repoSplit'

/** The one line under the title: what is counted, over which sessions; no figure. */
export function problemLine(body: ProblemBody) {
  if (!body.summary.sessions) return 'No session in this period is of a tool that reports a problem signal.'
  return 'Sessions of the period counted by the signals they recorded (repeated compaction, failure streak, failed delegation, ' +
    'API error, open todos, hook failure), per tool, per pair of signals and per project.'
}

/**
 * " By repository: shop 5 (83% of these, 20% of its own; $10.00), blog 1 (17% of these; $2.00)." for the sessions of a
 * mark's segments, with each one's list price; '' without a split.
 */
export function problemRepos(body: ProblemBody, segments: readonly RepoSegment[] | undefined) {
  const parts = (segments ?? []).flatMap(segment => {
    const sessions = segment.sessions
    if (typeof sessions !== 'number' || sessions <= 0) return []
    const part = segment.share?.sessions, own = segment.of_repo?.sessions
    const shares = [part == null ? '' : `${fmtShare(part)} of these`, own == null ? '' : `${fmtShare(own)} of its own`].filter(Boolean)
    const cost = typeof segment.cost_usd === 'number' ? fmtUsd(segment.cost_usd) : ''
    const more = [shares.join(', '), cost].filter(Boolean).join('; ')
    return [`${repoName(body.repo_order, segment.repo)} ${fmtNum(sessions)}${more ? ` (${more})` : ''}`]
  })
  return parts.length ? ` By repository: ${parts.join(', ')}.` : ''
}

/** Signals down, the tools that record signals across: the sessions each signal flags, and their share of the tool's sessions. */
export function signalToolGrid(body: ProblemBody, label: Label): { columns: HeatColumn[]; rows: HeatRow[] } {
  const tools = body.tools.filter(tool => tool.reports)
  return {
    columns: tools.map(tool => ({ key: tool.tool, name: label(tool.tool), sub: plural(tool.sessions, 'session') })),
    rows: SIGNALS.map(signal => ({
      key: signal, name: SIGNAL_LABELS[signal],
      cells: tools.map(tool => {
        const cell = tool.signals.find(item => item.signal === signal)
        if (!cell) return null
        if (!cell.reported) return { key: `${tool.tool}:${signal}`, text: 'not recorded', level: null, hatched: true,
          hover: problemSignalHover(tool, cell, label) }
        return { key: `${tool.tool}:${signal}`, text: fmtNum(cell.sessions ?? 0), sub: share(cell.share), level: cell.share ?? 0,
          hover: problemSignalHover(tool, cell, label) + problemRepos(body, cell.repos) }
      }),
    })),
  }
}

/**
 * The six signals against each other: each pair once, above the diagonal (rows: every signal but the last; columns: every
 * signal but the first), with the sessions that recorded both, shaded against the largest pair.
 */
export function pairGrid(body: ProblemBody): { columns: HeatColumn[]; rows: HeatRow[] } {
  const find = (a: Signal, b: Signal) => body.pairs.find(pair => (pair.signals[0] === a && pair.signals[1] === b) ||
    (pair.signals[0] === b && pair.signals[1] === a))
  const largest = Math.max(0, ...body.pairs.map(pair => pair.sessions))
  const across = SIGNALS.slice(1)
  return {
    columns: across.map(signal => ({ key: signal, name: SIGNAL_LABELS[signal] })),
    rows: SIGNALS.slice(0, -1).map((row, r) => ({
      key: row, name: SIGNAL_LABELS[row],
      cells: across.map((column, c) => {
        if (c + 1 <= r) return null
        const pair = find(row, column)
        if (!pair) return { key: `${row}+${column}`, text: '0', level: 0,
          hover: `${SIGNAL_LABELS[row]} and ${signalName(column)} in the same session: no session in this period.` }
        return { key: `${row}+${column}`, text: fmtNum(pair.sessions), sub: money(pair.cost_usd), level: largest ? pair.sessions / largest : 0,
          hover: problemPairHover(pair, body.summary.flagged) + problemRepos(body, pair.repos) }
      }),
    })),
  }
}
/** What a blank cell of the pair grid is. */
export const pairBlank = (row: HeatRow, column: HeatColumn) => row.key === column.key
  ? `${row.name}: a signal with itself is not a pair.` : `${column.name} and ${signalName(row.key as Signal)}: the cell above the diagonal.`

/** A column of the project grid: one project, or every other flagged session summed (no share, so no shade). */
type Column = { id: string; name: string; title: string; sessions: number; all: number | null; cost: number | null; cells: Partial<Record<Signal, number>> }

/** The projects the grid draws: those with the view's minimum of sessions; smaller ones are summed into the rest. */
export function projectColumns(body: ProblemBody): { shown: Column[]; few: ProblemBody['projects'] } {
  const least = EVIDENCE.problems.minimum
  const shown = body.projects.filter(row => row.all_sessions >= least && row.signals)
  const few = body.projects.filter(row => !shown.includes(row))
  const other = body.other_projects
  const rest: Column | null = other ? {
    id: 'other', name: 'Other projects', title: 'Every other flagged session, and sessions with no project, summed',
    sessions: other.sessions + few.reduce((sum, row) => sum + row.sessions, 0),
    all: null, cost: other.cost_usd == null ? null : other.cost_usd + few.reduce((sum, row) => sum + (row.cost_usd ?? 0), 0),
    cells: Object.fromEntries(SIGNALS.map(signal => [signal, (other.signals[signal] ?? 0) +
      few.reduce((sum, row) => sum + (row.signals?.[signal] ?? 0), 0)])),
  } : null
  return {
    shown: [...shown.map((row): Column => ({ id: row.project, name: projectName(row.project), title: row.project, sessions: row.sessions,
      all: row.all_sessions, cost: row.cost_usd, cells: row.signals ?? {} })), ...(rest && rest.sessions > 0 ? [rest] : [])],
    few,
  }
}

/** Signals down, the projects whose flagged sessions cost the most across: sessions, and the share of the project's sessions. */
export function projectGrid(body: ProblemBody): { columns: HeatColumn[]; rows: HeatRow[] } {
  const { shown } = projectColumns(body)
  return {
    columns: shown.map(column => ({ key: column.id, name: column.name, title: column.title,
      sub: `${column.all == null ? `${plural(column.sessions, 'session')} flagged` : `${fmtNum(column.sessions)} of ${plural(column.all, 'session')}`} · ` +
        money(column.cost) })),
    rows: SIGNALS.map(signal => ({
      key: signal, name: SIGNAL_LABELS[signal],
      cells: shown.map(column => {
        const sessions = column.cells[signal] ?? 0
        const part = column.all ? sessions / column.all : null
        return { key: `${column.id}:${signal}`, text: fmtNum(sessions), sub: part == null ? undefined : share(part), level: part,
          hover: problemCellHover(column.name, signal, sessions, column.all) }
      }),
    })),
  }
}
