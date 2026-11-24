// ─── The work itself — the payloads of /api/board/insights/{repos,durations,changes}, what each card states and draws ─
// The primary split is the repository (or the folder, where no repository is known). A figure the source does
// not report is null and reads "not reported", never 0. A repository marked `small` has too little data to compare:
// it is drawn grey and named in one line. Text states what is shown; every mark's hover text is built here.
import { dayLabel, fmtHours, fmtLines, fmtMs, fmtNum, fmtShare, fmtUsd } from '../../design/format'
import type { BarRow as SplitRow } from './Bars'
import type { Base, Hero } from './insightsModel'
import { notSplitNote, OTHER, repoColour, repoName as repoLabel, repoParts, type RepoRef, type RepoSegment } from './repoSplit'
import type { Open } from './charts/Open'

type Num = number | null
export type WorkCardId = 'repos' | 'durations' | 'changes'

export type RepoSession = {
  session_id: string; node_id?: string | null; tool?: string | null; repo: string; cost_usd: Num; requests: number
  agent_ms: Num; files: number; commits: number; calls: number; failed: number; scripted: boolean | null; started_at: Num
}
export type RepoModel = { model: string | null; requests: number; cost_usd: Num }
export type RepoBin = { start: number; cost_usd: number; commits: number; sessions: number }
export type Repo = {
  repo: string; name: string; kind: 'repository' | 'folder'; projects: number; nodes: number; sessions: number
  scripted: number; person: number; unclassified: number; cost_usd: Num; cost_share: Num; priced: number; requests: number
  unpriced: number; agent_ms: Num; timed_sessions: number; calls: number; failed: number; failed_share: Num; test_runs: number
  writes: number; files: number; lines_added: number; lines_removed: number; lines_unknown: number; commits: number
  commit_sessions: number; idle_sessions: number; cost_per_commit: Num; cost_per_file: Num; small: boolean
  models: RepoModel[]; top_sessions: RepoSession[]; bins: RepoBin[]
}
export type RepoBrief = Pick<Repo, 'repo' | 'name' | 'kind' | 'sessions' | 'cost_usd' | 'cost_share' | 'commits' | 'files'
  | 'cost_per_commit' | 'cost_per_file' | 'idle_sessions'>
export type RepoBody = Base<'repos'> & {
  repos: Repo[]
  summary: {
    repos: number; sessions: number; cost_usd: Num; commits: number; files: number; scripted: number; person: number
    idle_sessions: number; agent_ms: Num; unpriced: number; top: RepoBrief | null; dearest_per_commit: RepoBrief | null
    cheapest_per_commit: RepoBrief | null; cost_per_commit: Num; small: string[]; folders: number
  }
}
export type WorkBody = RepoBody | DurationBody | ChangeBody

const usd = (value: Num) => value == null ? 'not reported' : fmtUsd(value)
const pct = (value: Num) => value == null ? 'not reported' : fmtShare(value)
const plural = (n: number, one: string, many = `${one}s`) => `${fmtNum(n)} ${n === 1 ? one : many}`
const places = (n: number) => plural(n, 'repository or folder', 'repositories or folders')
/** A repository's name with what it is: "aictl" or "the folder scratch". */
export const repoName = (repo: { name: string; kind: string }) => repo.kind === 'folder' ? `the folder ${repo.name}` : repo.name

// ─── Chart rows: what each mark draws, the value written on it, and its hover text ────────────────────────────
/** A colour of a mark: the chart tokens, a lighter first token, and grey for too little data. */
export type Tone = 'c1' | 'c2' | 'c3' | 'c4' | 'c1soft' | 'muted'
/** `repo`: the colour index of the repository the part is (repoSplit.ts), drawn instead of `tone`. */
export type Part = { value: number; tone: Tone; label: string; repo?: number }
/** One bar of a row: its stacked parts and the value written beside it. */
export type Track = { parts: Part[]; text: string }
/** `repo`: the row is one repository, marked with its colour (repoSplit.ts). */
/** `open`: what a click on the row opens (a session, a repository filter). */
export type BarRow = { key: string; name: string; sub: string; tracks: Track[]; hover: string; small: boolean; repo?: number; open?: Open }
/** Horizontal bars, linear; `tops[i]` is the scale end of the i-th bar of every row. */
export type BarChart = { id: string; title: string; axis: string; legend: { tone: Tone; label: string }[]; tops: number[]; rows: BarRow[] }
/** A distribution per row: a bar to the median, a line on to the upper percentile, a tick at the longest. */
export type RangeRow = {
  key: string; name: string; sub: string; mid: Num; high: Num; max: Num; text: string; hover: string; small: boolean; repo?: number; open?: Open
}
export type RangeChart = { id: string; title: string; axis: string; legend: string; top: number; rows: RangeRow[] }
/** Columns over time bins, one per bin, value written on top and a second line under it. */
/** `parts`: the column stacked per repository (repoSplit.ts), each with its colour index and hover. */
export type ColumnPart = { key: string; value: number; repo: number; hover: string }
export type Column = { key: string; label: string; value: number; text: string; under: string; hover: string; parts?: ColumnPart[] }
export type ColumnChart = { id: string; title: string; axis: string; top: number; columns: Column[] }

const sumParts = (track: Track) => track.parts.reduce((total, part) => total + Math.max(0, part.value), 0)
/** The scale end of each bar position over the rows; `shared` puts every bar of a row on one scale. */
export function tops(rows: BarRow[], shared = false): number[] {
  const width = Math.max(0, ...rows.map(row => row.tracks.length))
  const each = Array.from({ length: width }, (_, i) => Math.max(0, ...rows.map(row => row.tracks[i] ? sumParts(row.tracks[i]) : 0)))
  return shared ? each.map(() => Math.max(0, ...each)) : each
}
const linear = (end: string) => `Linear scale from 0 to ${end}.`

const DAY = 86400
const WEEK = 7 * DAY
/** The width of a time bin as the server cuts it: `unit` or whole multiples, so the period has at most `most` bins. */
export function binWidth(range: { since: number; until: number }, unit: number, most: number): number {
  const length = range.since > 0 ? range.until - range.since : 365 * DAY
  return unit * Math.max(1, Math.ceil(length / (most * unit)))
}
/** "day", "3 days", "week", "2 weeks". */
export function binUnit(seconds: number): string {
  if (seconds % WEEK === 0) return seconds === WEEK ? 'week' : `${fmtNum(seconds / WEEK)} weeks`
  return seconds === DAY ? 'day' : `${fmtNum(seconds / DAY)} days`
}
/** A bin's first day, as a UTC day (bins are cut on UTC days). */
export const binDay = (ts: number) => dayLabel(ts + new Date(ts * 1000).getTimezoneOffset() * 60)
const binSpan = (start: number, width: number) => width === DAY ? binDay(start) : `${binDay(start)} to ${binDay(start + width - DAY)}`

// ─── Work by repository ───────────────────────────────────────────────────────────────────────────────────────
export const SHOWN = 15
export const agentTime = (value: Num) => value == null ? 'not reported' : fmtHours(value)
export const repoLines = (repo: Pick<Repo, 'lines_added' | 'lines_removed'>) => fmtLines(repo.lines_added, repo.lines_removed)
export const startedText = (repo: Pick<Repo, 'scripted' | 'person' | 'unclassified'>) => repo.scripted + repo.person === 0 ? 'start not known'
  : `${fmtNum(repo.scripted)} by a script, ${fmtNum(repo.person)} by a person` +
    (repo.unclassified ? `, ${fmtNum(repo.unclassified)} not known` : '')

export function repoHero(body: RepoBody): Hero | undefined {
  const s = body.summary
  if (!s.sessions || s.cost_usd == null) return undefined
  return { value: fmtUsd(s.cost_usd), label: `spend at list price in ${plural(s.sessions, 'session')} across ${places(s.repos)}` }
}

/** What the card covers: sessions, spend, what they produced, and how they started. */
export function repoFinding(body: RepoBody): string {
  const s = body.summary
  if (!s.sessions) return 'No agent session made a model request or a tool call in this period.'
  let text = `${plural(s.sessions, 'session')} in ${places(s.repos)}: ` +
    (s.cost_usd == null ? 'spend not reported' : `${fmtUsd(s.cost_usd)} at list price`) +
    `, ${plural(s.commits, 'commit')}, ${plural(s.files, 'changed file')} and ${agentTime(s.agent_ms)} of agent working time.`
  text += ` ${fmtNum(s.idle_sessions)} of the ${plural(s.sessions, 'session')} changed no file and made no commit; ` +
    `${fmtNum(s.scripted)} were started by a script and ${fmtNum(s.person)} by a person.`
  if (s.unpriced) text += ` ${plural(s.unpriced, 'request')} had no price and are not in the spend.`
  return text
}

/** One line for the groups too small to compare, or ''. */
export function smallText(names: readonly string[], rule = 'fewer than 50 model requests'): string {
  if (!names.length) return ''
  const shown = names.slice(0, 6).join(', ')
  return `Too small to compare (${rule}): ${shown}${names.length > 6 ? ` and ${names.length - 6} more` : ''}.`
}
const tooFew = (small: boolean, rule: string) => small ? ` Too few to compare (${rule}): drawn grey.` : ''

/** Spend at list price per repository, with its share of the period's spend. */
export function repoSpendChart(body: RepoBody): BarChart {
  const total = body.summary.cost_usd
  const rows = body.repos.slice(0, SHOWN).map((repo): BarRow => ({
    key: repo.name, name: repo.name, sub: `${repo.kind} · ${plural(repo.sessions, 'session')}`, small: repo.small,
    tracks: [{ parts: [{ value: repo.cost_usd ?? 0, tone: repo.small ? 'muted' : 'c1', label: 'spend' }],
      text: `${usd(repo.cost_usd)} · ${pct(repo.cost_share)}` }],
    hover: `${repoName(repo)}: ${usd(repo.cost_usd)} at list price, ${pct(repo.cost_share)} of ${usd(total)}; ` +
      `${plural(repo.priced, 'priced request')} of ${fmtNum(repo.requests)}` +
      (repo.unpriced ? `, ${fmtNum(repo.unpriced)} unpriced (not counted)` : '') + `; ${plural(repo.sessions, 'session')}.` +
      tooFew(repo.small, 'fewer than 50 model requests'),
  }))
  const top = tops(rows)
  return { id: 'spend', title: 'Spend at list price per repository (US dollars)', axis: linear(fmtUsd(top[0] ?? 0)), legend: [], tops: top, rows }
}

/** Commits and changed files per repository, each on its own scale. */
export function repoOutputChart(body: RepoBody): BarChart {
  const rows = body.repos.slice(0, SHOWN).map((repo): BarRow => ({
    key: repo.name, name: repo.name, sub: `${plural(repo.sessions, 'session')}`, small: repo.small,
    tracks: [
      { parts: [{ value: repo.commits, tone: repo.small ? 'muted' : 'c3', label: 'commits' }], text: plural(repo.commits, 'commit') },
      { parts: [{ value: repo.files, tone: repo.small ? 'muted' : 'c4', label: 'changed files' }], text: plural(repo.files, 'file') },
    ],
    hover: `${repoName(repo)}: ${plural(repo.commits, 'commit')} in ${plural(repo.commit_sessions, 'session')}; ` +
      `${plural(repo.files, 'changed file')} in ${plural(repo.writes, 'write')}, lines ${repoLines(repo)}` +
      (repo.lines_unknown ? ` (${plural(repo.lines_unknown, 'write')} without a line count)` : '') +
      `; ${fmtNum(repo.idle_sessions)} of ${plural(repo.sessions, 'session')} changed no file and made no commit.` +
      tooFew(repo.small, 'fewer than 50 model requests'),
  }))
  const top = tops(rows)
  return { id: 'output', title: 'Commits and changed files per repository', legend: [{ tone: 'c3', label: 'Commits' }, { tone: 'c4', label: 'Changed files' }],
    axis: `Each bar on its own linear scale: commits 0 to ${fmtNum(top[0] ?? 0)}, files 0 to ${fmtNum(top[1] ?? 0)}.`, tops: top, rows }
}

/** Spend per commit, for the repositories with 3 or more commits. */
export function repoPerCommitChart(body: RepoBody): BarChart & { left: string[] } {
  const shown = body.repos.slice(0, SHOWN)
  const rows = shown.filter(repo => repo.cost_per_commit != null).map((repo): BarRow => ({
    key: repo.name, name: repo.name, sub: plural(repo.commits, 'commit'), small: repo.small,
    tracks: [{ parts: [{ value: repo.cost_per_commit!, tone: repo.small ? 'muted' : 'c2', label: 'spend per commit' }],
      text: `${usd(repo.cost_per_commit)} per commit` }],
    hover: `${repoName(repo)}: ${usd(repo.cost_usd)} ÷ ${plural(repo.commits, 'commit')} = ${usd(repo.cost_per_commit)} per commit; ` +
      (repo.cost_per_file == null ? 'per changed file: fewer than 5 files.' : `${usd(repo.cost_per_file)} per changed file (${plural(repo.files, 'file')}).`) +
      tooFew(repo.small, 'fewer than 50 model requests'),
  }))
  const top = tops(rows)
  return { id: 'per-commit', title: 'Spend per commit (US dollars, repositories with 3 or more commits)', legend: [],
    axis: linear(fmtUsd(top[0] ?? 0)), tops: top, rows, left: shown.filter(repo => repo.cost_per_commit == null).map(repo => repo.name) }
}

/** Sessions per repository by how they started; and how many changed nothing. */
export function repoStartChart(body: RepoBody): BarChart {
  const rows = body.repos.slice(0, SHOWN).map((repo): BarRow => ({
    key: repo.name, name: repo.name, sub: `${fmtNum(repo.idle_sessions)} changed nothing`, small: repo.small,
    tracks: [{ parts: [
      { value: repo.scripted, tone: 'c2', label: 'by a script' }, { value: repo.person, tone: 'c1', label: 'by a person' },
      { value: repo.unclassified, tone: 'muted', label: 'not known' },
    ], text: `${fmtNum(repo.scripted)} script · ${fmtNum(repo.person)} person` + (repo.unclassified ? ` · ${fmtNum(repo.unclassified)} not known` : '') }],
    hover: `${repoName(repo)}: ${plural(repo.sessions, 'session')}, ${startedText(repo)}; ` +
      `${fmtNum(repo.idle_sessions)} changed no file and made no commit; ${plural(repo.nodes, 'machine')}, ${plural(repo.projects, 'folder')}.`,
  }))
  const top = tops(rows)
  return { id: 'started', title: 'Sessions per repository by how they started',
    legend: [{ tone: 'c2', label: 'Started by a script' }, { tone: 'c1', label: 'Started by a person' }, { tone: 'muted', label: 'Not known' }],
    axis: linear(plural(top[0] ?? 0, 'session')), tops: top, rows }
}

/** One repository's models: requests per model, with the spend written beside it. */
export function repoModelChart(repo: Repo): BarChart {
  const rows = repo.models.map((model): BarRow => {
    const name = model.model ?? 'model not reported'
    return {
      key: name, name, sub: '', small: false,
      tracks: [{ parts: [{ value: model.requests, tone: 'c1', label: 'requests' }], text: `${plural(model.requests, 'request')} · ${usd(model.cost_usd)}` }],
      hover: `${name} in ${repoName(repo)}: ${plural(model.requests, 'request')} of ${fmtNum(repo.requests)}, ${usd(model.cost_usd)} at list price` +
        (model.cost_usd != null && repo.cost_usd ? ` (${fmtShare(model.cost_usd / repo.cost_usd)} of the repository's ${fmtUsd(repo.cost_usd)})` : '') + '.',
    }
  })
  const top = tops(rows)
  return { id: 'models', title: `Model requests per model in ${repo.name}`, legend: [], axis: linear(plural(top[0] ?? 0, 'request')), tops: top, rows }
}

/** One repository's spend per time bin, with its commits written under each column. */
export function repoBinChart(repo: Repo, range: { since: number; until: number }): ColumnChart {
  const width = binWidth(range, WEEK, 8)
  const unit = binUnit(width)
  const columns = repo.bins.map((bin): Column => ({
    key: String(bin.start), label: binDay(bin.start), value: bin.cost_usd, text: fmtUsd(bin.cost_usd), under: plural(bin.commits, 'commit'),
    hover: `${repoName(repo)}, ${binSpan(bin.start, width)}: ${fmtUsd(bin.cost_usd)} at list price, ${plural(bin.commits, 'commit')}, ` +
      `${plural(bin.sessions, 'session')}.`,
  }))
  const top = Math.max(0, ...columns.map(column => column.value))
  return { id: 'bins', title: `Spend per ${unit} in ${repo.name} (US dollars; commits under each column)`, axis: linear(fmtUsd(top)), top, columns }
}

// ─── Bars split by repository (durations and changes) ────────────────────────────────────────────────────────
type Split = { repos?: RepoSegment[] }
type Order = readonly RepoRef[] | undefined
/** The colour of a repository's own row (its one segment), or undefined when the answer carries no split. */
export const rowRepo = (row: Split, order: Order) => row.repos?.length ? repoColour(order, row.repos[0].repo) : undefined
/** What a repository row's hover adds: the colour it is drawn in on every card. */
export function rowRepoNote(row: Split, order: Order): string {
  if (!row.repos?.length) return ''
  const repo = row.repos[0].repo, colour = repoColour(order, repo)
  return colour === OTHER ? ' Marked grey: not among the 8 repositories with the highest list-price cost.'
    : ` Marked in the colour of ${repoLabel(order, repo)} on every card: rank ${colour + 1} by list-price cost.`
}
/** Marks each row of a chart whose rows are repositories with the repository's colour. */
export function markRepos<R extends BarRow | RangeRow>(rows: R[], items: readonly Split[], order: Order): R[] {
  return rows.map((row, i) => ({ ...row, repo: rowRepo(items[i] ?? {}, order), hover: row.hover + rowRepoNote(items[i] ?? {}, order) }))
}
/**
 * A one-measure chart as bars split by repository (Bars.tsx): row i is `items[i]`, its parts per repository of `key`, each
 * hover followed by the row's own hover (and `note`). A row the server did not split keeps one part. Null when no row is
 * split: the chart is drawn as before.
 */
export function splitRows(chart: BarChart, items: readonly Split[], key: string, order: Order, format: (value: number) => string,
  measure: string, note = ''): SplitRow[] | null {
  if (!items.some(item => item.repos?.length)) return null
  return chart.rows.map((row, i) => {
    const track = row.tracks[0], detail = row.hover + note
    return {
      key: row.key, label: row.name, sub: row.sub || undefined, total: track?.text ?? '',
      parts: items[i]?.repos?.length ? repoParts(items[i].repos, key, order, format, row.name, measure, detail)
        : [{ key: 'whole', label: measure, value: track ? sumParts(track) : 0, text: track?.text ?? '', tone: 7, hover: detail }],
    }
  })
}
/** What the hover of a median or percentile adds on a card whose other bars are split by repository. */
export const medianNote = (order: Order) => order?.length ? ` ${notSplitNote('median')}` : ''
/** A chart's hovers with `note` added. */
export const withNote = <C extends { rows: { hover: string }[] }>(chart: C, note: string): C =>
  note ? { ...chart, rows: chart.rows.map(row => ({ ...row, hover: row.hover + note })) } : chart

// ─── Durations ─────────────────────────────────────────────────────────────────────────────────────────────────
export type SessionTimes = {
  sessions: number; timed: number; walled: number; changed: number; waits: number; requests: number; calls: number
  model_ms: Num; tool_ms: Num; agent_ms: Num; wait_ms: Num; p50_agent_ms: Num; p90_agent_ms: Num; max_agent_ms: Num
  p50_wall_ms: Num; p90_wall_ms: Num; max_wall_ms: Num; p50_first_change_ms: Num; p90_first_change_ms: Num
}
export type DurationRepo = SessionTimes & {
  repo: string; name: string; kind: 'repository' | 'folder'; agent_share: Num; small: boolean
  /** One segment, the repository itself ('' when not ranked): `agent_ms`, `wait_ms`, `model_ms`, `tool_ms`. */
  repos?: RepoSegment[]
}
export type DurationTool = {
  name: string | null; program: boolean; calls: number; timed: number; total_ms: Num; p50_ms: Num; p95_ms: Num; failed: number
  failed_share: Num; repo: string | null; repo_name: string | null; repo_ms: Num; small: boolean; repos?: RepoSegment[]
}
export type DurationModel = {
  model: string | null; requests: number; timed: number; total_ms: Num; p50_ms: Num; p95_ms: Num; small: boolean; repos?: RepoSegment[]
}
export type DurationBody = Base<'durations'> & {
  repos: DurationRepo[]; tools: DurationTool[]; models: DurationModel[]
  summary: SessionTimes & {
    top: Pick<DurationRepo, 'repo' | 'name' | 'kind' | 'sessions' | 'agent_ms' | 'agent_share' | 'p50_agent_ms'> | null
    top_tool: (DurationTool & { share: Num }) | null; slowest_tool: DurationTool | null; slowest_model: DurationModel | null
    small: string[]
  }
}

/** Medians of a repository need this many sessions; a 95th percentile this many calls or requests (the server's rule). */
export const MIN_TIMED_SESSIONS = 5
export const MIN_CALLS = 20
export const TOOLS_SHOWN = 10

export const toolName = (tool: Pick<DurationTool, 'name' | 'program'>) =>
  tool.name ? (tool.program ? `${tool.name} (program)` : tool.name) : 'command with no program recorded'
export const span = (value: Num) => value == null ? 'not reported' : fmtMs(value)
const hours = (value: Num) => value == null ? 'not reported' : fmtHours(value)

export function durationHero(body: DurationBody): Hero | undefined {
  const s = body.summary
  if (!s.agent_ms) return undefined
  return { value: fmtHours(s.agent_ms), label: `of agent working time in ${plural(s.timed, 'session')} with turn times` +
    (s.timed < s.sessions ? ` (of ${plural(s.sessions, 'session')})` : '') }
}

/** What the card covers: working time and its distribution, waiting, and the summed model and tool time. */
export function durationFinding(body: DurationBody): string {
  const s = body.summary
  if (!s.sessions) return 'No agent session made a model request or a tool call in this period.'
  if (!s.timed || s.agent_ms == null) {
    return `${plural(s.sessions, 'session')} in this period, but no tool recorded when their turns started and ended, so working time is not reported.`
  }
  let text = `Agents worked ${fmtHours(s.agent_ms)} in ${plural(s.timed, 'session')} with turn times. Per session: median ${span(s.p50_agent_ms)}, ` +
    `90th percentile ${span(s.p90_agent_ms)}, longest ${span(s.max_agent_ms)}.`
  text += ` Waiting for a person between turns: ${hours(s.wait_ms)} over ${plural(s.waits, 'wait')}.`
  text += ` Summed model request time ${hours(s.model_ms)} over ${plural(s.requests, 'request')}; summed tool-call time ${hours(s.tool_ms)} ` +
    `over ${plural(s.calls, 'call')}.`
  return text
}

const durationSmall = 'fewer than 5 sessions with turn times'

/** Working time and waiting time per repository, both bars on one scale. */
export function durationWorkChart(body: DurationBody): BarChart {
  const total = body.repos.reduce((sum, repo) => sum + (repo.agent_ms ?? 0), 0)
  const rows = body.repos.slice(0, SHOWN).map((repo): BarRow => ({
    key: repo.name, name: repo.name, sub: `${repo.kind} · ${fmtNum(repo.timed)} of ${plural(repo.sessions, 'session')} timed`, small: repo.small,
    tracks: [
      { parts: [{ value: repo.agent_ms ?? 0, tone: repo.small ? 'muted' : 'c3', label: 'working' }], text: `worked ${hours(repo.agent_ms)} · ${pct(repo.agent_share)}` },
      { parts: [{ value: repo.wait_ms ?? 0, tone: repo.small ? 'muted' : 'c2', label: 'waiting' }], text: `waited ${hours(repo.wait_ms)}` },
    ],
    hover: `${repoName(repo)}: agent working time ${hours(repo.agent_ms)}, ${pct(repo.agent_share)} of ${fmtHours(total)}, ` +
      `in ${plural(repo.timed, 'session')} with turn times (of ${fmtNum(repo.sessions)}); waiting for a person ${hours(repo.wait_ms)} ` +
      `over ${plural(repo.waits, 'wait')}.` + tooFew(repo.small, durationSmall),
  }))
  const top = tops(rows, true)
  return { id: 'work', title: 'Agent working time and waiting time per repository (hours)',
    legend: [{ tone: 'c3', label: 'Agent working time' }, { tone: 'c2', label: 'Waiting for a person between turns' }],
    axis: linear(fmtHours(top[0] ?? 0)) + ' Both bars on the same scale.', tops: top, rows }
}

/** Summed model request time and tool-call time per repository, on one scale. */
export function durationModelToolChart(body: DurationBody): BarChart {
  const rows = body.repos.slice(0, SHOWN).map((repo): BarRow => ({
    key: repo.name, name: repo.name, sub: `${plural(repo.requests, 'request')} · ${plural(repo.calls, 'call')}`, small: repo.small,
    tracks: [
      { parts: [{ value: repo.model_ms ?? 0, tone: repo.small ? 'muted' : 'c1', label: 'model' }], text: `model ${hours(repo.model_ms)}` },
      { parts: [{ value: repo.tool_ms ?? 0, tone: repo.small ? 'muted' : 'c4', label: 'tools' }], text: `tools ${hours(repo.tool_ms)}` },
    ],
    hover: `${repoName(repo)}: model request time ${hours(repo.model_ms)} summed over ${plural(repo.requests, 'request')}; ` +
      `tool-call time ${hours(repo.tool_ms)} summed over ${plural(repo.calls, 'call')}. Parallel calls overlap, so sums can exceed elapsed time.`,
  }))
  const top = tops(rows, true)
  return { id: 'model-tool', title: 'Summed model request time and tool-call time per repository (hours)',
    legend: [{ tone: 'c1', label: 'Model requests' }, { tone: 'c4', label: 'Tool calls' }],
    axis: linear(fmtHours(top[0] ?? 0)) + ' Both bars on the same scale.', tops: top, rows }
}

const rangeTop = (rows: RangeRow[]) => Math.max(0, ...rows.map(row => row.max ?? row.high ?? row.mid ?? 0))

/** Working time per session per repository: median, 90th percentile and the longest session. */
export function durationSessionRange(body: DurationBody): RangeChart {
  const rows = body.repos.slice(0, SHOWN).map((repo): RangeRow => {
    const drawn = !repo.small && repo.p50_agent_ms != null
    return {
      key: repo.name, name: repo.name, sub: plural(repo.timed, 'timed session'), small: !drawn,
      mid: drawn ? repo.p50_agent_ms : null, high: drawn ? repo.p90_agent_ms : null, max: drawn ? repo.max_agent_ms : null,
      text: drawn ? `median ${span(repo.p50_agent_ms)} · 90th ${span(repo.p90_agent_ms)} · longest ${span(repo.max_agent_ms)}` : durationSmall,
      hover: `${repoName(repo)}: agent working time per session over ${plural(repo.timed, 'session')} with turn times; ` +
        (drawn ? `median ${span(repo.p50_agent_ms)}, 90th percentile ${span(repo.p90_agent_ms)}, longest ${span(repo.max_agent_ms)}.`
          : `not drawn: a median needs ${MIN_TIMED_SESSIONS} or more sessions with turn times.`),
    }
  })
  const top = rangeTop(rows)
  return { id: 'session-range', title: 'Agent working time per session, per repository', axis: linear(fmtMs(top)),
    legend: 'Bar: median. Line: on to the 90th percentile. Tick: the longest session.', top, rows }
}

/** Time from the session start to its first file write, per repository: median and 90th percentile. */
export function durationFirstChangeRange(body: DurationBody): RangeChart {
  const rows = body.repos.slice(0, SHOWN).map((repo): RangeRow => {
    const drawn = repo.changed >= MIN_TIMED_SESSIONS && repo.p50_first_change_ms != null
    return {
      key: repo.name, name: repo.name, sub: `${fmtNum(repo.changed)} changed a file`, small: !drawn,
      mid: drawn ? repo.p50_first_change_ms : null, high: drawn ? repo.p90_first_change_ms : null, max: null,
      text: drawn ? `median ${span(repo.p50_first_change_ms)} · 90th ${span(repo.p90_first_change_ms)}` : `${plural(repo.changed, 'session')} changed a file`,
      hover: `${repoName(repo)}: time from session start to the first file write, over ${plural(repo.changed, 'session')} that changed a file; ` +
        (drawn ? `median ${span(repo.p50_first_change_ms)}, 90th percentile ${span(repo.p90_first_change_ms)}.`
          : `not drawn: needs ${MIN_TIMED_SESSIONS} or more such sessions.`),
    }
  })
  const top = rangeTop(rows)
  return { id: 'first-change', title: 'Time to the first file change, per repository', axis: linear(fmtMs(top)),
    legend: 'Bar: median. Line: on to the 90th percentile.', top, rows }
}

const toolSmall = `fewer than ${MIN_CALLS} timed calls`

/** The tools and programs with the most summed call time. */
export function toolTimeChart(body: DurationBody): BarChart {
  const all = body.summary.tool_ms
  const rows = body.tools.slice(0, TOOLS_SHOWN).map((tool): BarRow => ({
    key: tool.name ?? '', name: toolName(tool), sub: `${plural(tool.calls, 'call')} · ${pct(tool.failed_share)} failed`, small: tool.small,
    tracks: [{ parts: [{ value: tool.total_ms ?? 0, tone: tool.small ? 'muted' : 'c4', label: 'call time' }],
      text: `${hours(tool.total_ms)}` + (tool.total_ms != null && all ? ` · ${fmtShare(tool.total_ms / all)}` : '') }],
    hover: toolHover(tool, all),
  }))
  const top = tops(rows)
  return { id: 'tools', title: 'Tools and programs by summed call time (hours)', legend: [], axis: linear(fmtHours(top[0] ?? 0)), tops: top, rows }
}

export function toolHover(tool: DurationTool, all: Num): string {
  return `${toolName(tool)}: ${hours(tool.total_ms)} summed over ${plural(tool.timed, 'timed call')} of ${fmtNum(tool.calls)}` +
    (tool.total_ms != null && all ? ` (${fmtShare(tool.total_ms / all)} of all tool-call time, ${fmtHours(all)})` : '') +
    `; median ${span(tool.p50_ms)}, 95th percentile ${tool.small ? `not shown (${toolSmall})` : span(tool.p95_ms)}; ` +
    `${plural(tool.failed, 'failed call')} (${pct(tool.failed_share)})` +
    (tool.repo_name ? `; most time in ${tool.repo_name}: ${hours(tool.repo_ms)}` : '') + '.'
}

/** Call duration per tool or program: median and 95th percentile. */
export function toolRange(body: DurationBody): RangeChart {
  const rows = body.tools.slice(0, TOOLS_SHOWN).map((tool): RangeRow => ({
    key: tool.name ?? '', name: toolName(tool), sub: plural(tool.timed, 'timed call'), small: tool.small,
    mid: tool.p50_ms, high: tool.small ? null : tool.p95_ms, max: null,
    text: `median ${span(tool.p50_ms)}` + (tool.small ? ` · 95th not shown (${toolSmall})` : ` · 95th ${span(tool.p95_ms)}`),
    hover: toolHover(tool, body.summary.tool_ms),
  }))
  const top = rangeTop(rows)
  return { id: 'tool-range', title: 'Duration of one call, per tool or program', axis: linear(fmtMs(top)),
    legend: 'Bar: median. Line: on to the 95th percentile (1 call in 20 took longer).', top, rows }
}

const modelName = (model: DurationModel) => model.model ?? 'model not reported'
export function modelHover(model: DurationModel, all: Num): string {
  return `${modelName(model)}: ${hours(model.total_ms)} summed over ${plural(model.timed, 'timed request')} of ${fmtNum(model.requests)}` +
    (model.total_ms != null && all ? ` (${fmtShare(model.total_ms / all)} of all model request time, ${fmtHours(all)})` : '') +
    `; median ${span(model.p50_ms)}, 95th percentile ${model.small ? `not shown (fewer than ${MIN_CALLS} timed requests)` : span(model.p95_ms)}.`
}

/** Summed request time per model. */
export function modelTimeChart(body: DurationBody): BarChart {
  const all = body.summary.model_ms
  const rows = body.models.map((model): BarRow => ({
    key: model.model ?? '', name: modelName(model), sub: plural(model.requests, 'request'), small: model.small,
    tracks: [{ parts: [{ value: model.total_ms ?? 0, tone: model.small ? 'muted' : 'c1', label: 'request time' }],
      text: `${hours(model.total_ms)}` + (model.total_ms != null && all ? ` · ${fmtShare(model.total_ms / all)}` : '') }],
    hover: modelHover(model, all),
  }))
  const top = tops(rows)
  return { id: 'models', title: 'Model requests by summed request time (hours)', legend: [], axis: linear(fmtHours(top[0] ?? 0)), tops: top, rows }
}

/** Duration of one request per model: median and 95th percentile. */
export function modelRange(body: DurationBody): RangeChart {
  const rows = body.models.map((model): RangeRow => ({
    key: model.model ?? '', name: modelName(model), sub: plural(model.timed, 'timed request'), small: model.small,
    mid: model.p50_ms, high: model.small ? null : model.p95_ms, max: null,
    text: `median ${span(model.p50_ms)}` + (model.small ? ` · 95th not shown (fewer than ${MIN_CALLS} timed requests)` : ` · 95th ${span(model.p95_ms)}`),
    hover: modelHover(model, body.summary.model_ms),
  }))
  const top = rangeTop(rows)
  return { id: 'model-range', title: 'Duration of one model request, per model', axis: linear(fmtMs(top)),
    legend: 'Bar: median. Line: on to the 95th percentile (1 request in 20 took longer).', top, rows }
}

// ─── Changes and commits ───────────────────────────────────────────────────────────────────────────────────────
export const FILE_KINDS = [
  { id: 'source', label: 'source', tone: 'c1', rule: 'code, query, style and markup files by extension' },
  { id: 'tests', label: 'tests', tone: 'c3', rule: 'a tests, test, __tests__ or spec folder, or a test_, _test., .test. or .spec. name' },
  { id: 'docs', label: 'docs', tone: 'c4', rule: '.md, .mdx, .rst, .txt, .adoc or a docs folder' },
  { id: 'config', label: 'config and data', tone: 'c2', rule: '.json, .yaml, .toml, .ini, .cfg, .conf, .lock, .env, .xml, dotfiles, Dockerfile, Makefile' },
  { id: 'memory', label: 'memory and instructions', tone: 'c1soft', rule: 'an instruction or memory file the store recognizes' },
  { id: 'other', label: 'other', tone: 'muted', rule: 'any other path' },
] as const satisfies readonly { id: string; label: string; tone: Tone; rule: string }[]
export type FileKind = typeof FILE_KINDS[number]['id']
export type ChangeRepo = {
  repo: string; name: string; kind: 'repository' | 'folder'; sessions: number; change_sessions: number; commit_sessions: number
  uncommitted_sessions: number; writes: number; committed_writes: number; committed_share: Num; files: number; files_share: Num
  reworked: number; kinds: Record<FileKind, number>; lines_added: number; lines_removed: number; lines_unknown: number
  commits: number; commit_days: number; cost_usd: Num; agent_ms: Num; cost_per_commit: Num; time_per_commit_ms: Num; small: boolean
  /** One segment, the repository itself: `files`, `writes`, `committed_writes`, the session counts and `commits`. */
  repos?: RepoSegment[]
}
export type ChangeBrief = Pick<ChangeRepo, 'repo' | 'name' | 'kind' | 'files' | 'files_share' | 'writes' | 'committed_writes'
  | 'committed_share' | 'commits' | 'reworked' | 'cost_per_commit' | 'time_per_commit_ms' | 'change_sessions' | 'uncommitted_sessions'>
export type ReworkedFile = {
  repo: string; repo_name: string; path: string; kind: string; writes: number; sessions: number; most_in_session: number; repos?: RepoSegment[]
}
export type ChangeBin = { start: number; commits: number; writes: number; repos?: RepoSegment[] }
export type ChangeBody = Base<'changes'> & {
  repos: ChangeRepo[]; files: ReworkedFile[]; bins: ChangeBin[]
  summary: {
    repos: number; writes: number; files: number; committed_writes: number; committed_share: Num; commits: number
    change_sessions: number; uncommitted_sessions: number; lines_added: number; lines_removed: number; reworked: number
    kinds: Record<FileKind, number>; top: ChangeBrief | null; most_uncommitted: ChangeBrief | null
    dearest_per_commit: ChangeBrief | null; cheapest_per_commit: ChangeBrief | null; top_file: ReworkedFile | null; small: string[]
    /** Per kind of file, its changed files per repository. */
    kind_repos?: Partial<Record<FileKind, RepoSegment[]>>
  }
}

export const CHANGE_SMALL = 'fewer than 20 file writes and 3 commits'
export const fileName = (path: string) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
export const kindsText = (repo: Pick<ChangeRepo, 'kinds'>) =>
  FILE_KINDS.filter(kind => repo.kinds[kind.id]).map(kind => `${fmtNum(repo.kinds[kind.id])} ${kind.label}`).join(' · ') || 'no file'

export function changeHero(body: ChangeBody): Hero | undefined {
  const s = body.summary
  if (!s.writes) return undefined
  return { value: fmtNum(s.files), label: `files changed by agents: ${plural(s.writes, 'file write')} in ${plural(s.change_sessions, 'session')}` }
}

/** Distinct changed files per repository, with the share of all changed files. */
export function changeFilesChart(body: ChangeBody): BarChart {
  const rows = active(body).map((repo): BarRow => ({
    key: repo.name, name: repo.name, sub: `${repo.kind} · ${plural(repo.change_sessions, 'session')}`, small: repo.small,
    tracks: [{ parts: [{ value: repo.files, tone: repo.small ? 'muted' : 'c1', label: 'files', repo: rowRepo(repo, body.repo_order) }],
      text: `${fmtNum(repo.files)} · ${pct(repo.files_share)}` }],
    hover: `${repoName(repo)}: ${plural(repo.files, 'distinct file')} changed, ${pct(repo.files_share)} of ${fmtNum(body.summary.files)}; ` +
      `${plural(repo.writes, 'write')}, lines ${fmtLines(repo.lines_added, repo.lines_removed)}` +
      (repo.lines_unknown ? ` (${plural(repo.lines_unknown, 'write')} without a line count)` : '') + `; kinds: ${kindsText(repo)}.` +
      tooFew(repo.small, CHANGE_SMALL),
  }))
  const top = tops(rows)
  return { id: 'files', title: 'Changed files per repository (distinct paths)', legend: [], axis: linear(plural(top[0] ?? 0, 'file')), tops: top, rows }
}
const active = (body: ChangeBody) => body.repos.filter(repo => repo.writes || repo.commits).slice(0, SHOWN)

/** Changed files by kind of file, over all repositories. */
export function changeKindChart(body: ChangeBody): BarChart {
  const total = FILE_KINDS.reduce((sum, kind) => sum + body.summary.kinds[kind.id], 0)
  const rows = FILE_KINDS.map((kind): BarRow => {
    const value = body.summary.kinds[kind.id]
    return {
      key: kind.id, name: kind.label, sub: '', small: false,
      tracks: [{ parts: [{ value, tone: kind.tone, label: kind.label }], text: `${fmtNum(value)} · ${total ? fmtShare(value / total) : 'not reported'}` }],
      hover: `${kind.label}: ${plural(value, 'file')}, ${total ? fmtShare(value / total) : 'not reported'} of ${plural(total, 'changed file')}. ` +
        `Kind by path: ${kind.rule}.`,
    }
  })
  const top = tops(rows)
  return { id: 'kinds', title: 'Changed files by kind of file', legend: [], axis: linear(plural(top[0] ?? 0, 'file')), tops: top, rows }
}

/** Each repository's changed files split by kind of file. */
export function changeRepoKindChart(body: ChangeBody): BarChart {
  const rows = active(body).map((repo): BarRow => ({
    key: repo.name, name: repo.name, sub: plural(repo.files, 'file'), small: repo.small,
    tracks: [{ parts: FILE_KINDS.map(kind => ({ value: repo.kinds[kind.id], tone: kind.tone, label: kind.label })), text: kindsText(repo) }],
    hover: `${repoName(repo)}: ${plural(repo.files, 'changed file')}: ` +
      FILE_KINDS.map(kind => `${kind.label} ${fmtNum(repo.kinds[kind.id])}`).join(', ') + '.',
  }))
  const top = tops(rows)
  return { id: 'repo-kinds', title: 'Changed files per repository by kind of file',
    legend: FILE_KINDS.map(kind => ({ tone: kind.tone, label: kind.label })), axis: linear(plural(top[0] ?? 0, 'file')), tops: top, rows }
}

/** Each repository's writes: followed by a commit of the same session, and not. */
export function changeWritesChart(body: ChangeBody): BarChart {
  const rows = active(body).map((repo): BarRow => {
    const open = repo.writes - repo.committed_writes
    return {
      key: repo.name, name: repo.name, sub: plural(repo.writes, 'write'), small: repo.small,
      tracks: [{ parts: [{ value: repo.committed_writes, tone: repo.small ? 'muted' : 'c3', label: 'followed by a commit' },
        { value: open, tone: repo.small ? 'muted' : 'c2', label: 'no commit followed' }],
      text: `${fmtNum(repo.committed_writes)} committed · ${fmtNum(open)} not` }],
      hover: `${repoName(repo)}: ${plural(repo.writes, 'write')}; a commit of the same session followed ${fmtNum(repo.committed_writes)} ` +
        `(${pct(repo.committed_share)}), none followed ${fmtNum(open)}; ${plural(repo.commits, 'commit')} on ${plural(repo.commit_days, 'day')} ` +
        `in ${plural(repo.commit_sessions, 'session')}.` + tooFew(repo.small, CHANGE_SMALL),
    }
  })
  const top = tops(rows)
  return { id: 'writes', title: 'File writes per repository, by whether a commit of the same session followed',
    legend: [{ tone: 'c3', label: 'A commit followed' }, { tone: 'c2', label: 'No commit of the session followed' }],
    axis: linear(plural(top[0] ?? 0, 'write')), tops: top, rows }
}

/** Each repository's sessions: changed files and committed, changed files with no commit, changed nothing. */
export function changeSessionsChart(body: ChangeBody): BarChart {
  const rows = active(body).map((repo): BarRow => {
    const committed = Math.max(0, repo.change_sessions - repo.uncommitted_sessions)
    const none = Math.max(0, repo.sessions - repo.change_sessions)
    return {
      key: repo.name, name: repo.name, sub: plural(repo.sessions, 'session'), small: repo.small,
      tracks: [{ parts: [{ value: committed, tone: 'c3', label: 'changed files, committed' },
        { value: repo.uncommitted_sessions, tone: 'c2', label: 'changed files, no commit' }, { value: none, tone: 'muted', label: 'changed no file' }],
      text: `${fmtNum(committed)} · ${fmtNum(repo.uncommitted_sessions)} · ${fmtNum(none)}` }],
      hover: `${repoName(repo)}: ${plural(repo.sessions, 'session')}; ${fmtNum(repo.change_sessions)} changed files, ` +
        `${fmtNum(repo.uncommitted_sessions)} of them made no commit; ${fmtNum(none)} changed no file; ` +
        `${plural(repo.commit_sessions, 'session')} made a commit.`,
    }
  })
  const top = tops(rows)
  return { id: 'sessions', title: 'Sessions per repository by what they changed and committed',
    legend: [{ tone: 'c3', label: 'Changed files and committed' }, { tone: 'c2', label: 'Changed files, no commit' }, { tone: 'muted', label: 'Changed no file' }],
    axis: linear(plural(top[0] ?? 0, 'session')), tops: top, rows }
}

/** Commits, or file writes, per day (or longer bin) of the period. */
export function changeBinChart(body: ChangeBody, what: 'commits' | 'writes'): ColumnChart {
  const width = binWidth(body.range, DAY, 31)
  const unit = binUnit(width)
  const columns = body.bins.map((bin): Column => ({
    key: String(bin.start), label: binDay(bin.start), value: bin[what], text: fmtNum(bin[what]),
    under: what === 'commits' ? plural(bin.writes, 'write') : plural(bin.commits, 'commit'),
    hover: `${binSpan(bin.start, width)}: ${plural(bin.commits, 'commit')}, ${plural(bin.writes, 'file write')}.`,
    parts: bin.repos?.length ? repoParts(bin.repos, what, body.repo_order, value => plural(value, what === 'commits' ? 'commit' : 'write'),
      binSpan(bin.start, width), what === 'commits' ? 'commits' : 'file writes', `${binSpan(bin.start, width)}: ${plural(bin.commits, 'commit')}, ` +
      `${plural(bin.writes, 'file write')}.`).map(part => ({ key: part.key, value: part.value ?? 0, repo: part.repo ?? OTHER, hover: part.hover }))
      : undefined,
  }))
  const top = Math.max(0, ...columns.map(column => column.value))
  return { id: what, title: what === 'commits' ? `Commits per ${unit}` : `File writes per ${unit}`,
    axis: linear(what === 'commits' ? plural(top, 'commit') : plural(top, 'write')), top, columns }
}

/** The files written in 3 or more sessions or 5 or more times in one. */
export function reworkedChart(body: ChangeBody): BarChart {
  const rows = body.files.slice(0, SHOWN).map((file): BarRow => ({
    key: fileName(file.path), name: fileName(file.path), sub: `${file.kind} · ${file.repo_name}`, small: false,
    tracks: [{ parts: [{ value: file.writes, tone: 'c4', label: 'writes' }], text: `${plural(file.writes, 'write')} · ${plural(file.sessions, 'session')}` }],
    hover: `${file.path} (${file.kind}, ${file.repo_name}): ${plural(file.writes, 'write')} in ${plural(file.sessions, 'session')}, ` +
      `at most ${fmtNum(file.most_in_session)} in one session.`,
  }))
  const top = tops(rows)
  return { id: 'reworked', title: 'Files written in 3 or more sessions, or 5 or more times in one (writes per file)', legend: [],
    axis: linear(plural(top[0] ?? 0, 'write')), tops: top, rows }
}
