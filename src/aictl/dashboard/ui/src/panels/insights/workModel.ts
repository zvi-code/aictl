// ─── The work itself — the payloads of /api/board/insights/{repos,...} and the finding each card states ─
// The primary split is the repository (or the folder, where no repository is known). A figure the source does
// not report is null and reads "not reported", never 0. A repository marked `small` has too little data to compare:
// it never drives a headline or a coloured cell.
import { fmtHours, fmtLines, fmtMs, fmtNum, fmtShare, fmtUsd } from '../../design/format'
import type { Base, Hero } from './insightsModel'

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
const plural = (n: number, one: string, many = `${one}s`) => `${fmtNum(n)} ${n === 1 ? one : many}`
/** A repository's name with what it is: "aictl" or "the folder scratch". */
export const repoName = (repo: { name: string; kind: string }) => repo.kind === 'folder' ? `the folder ${repo.name}` : repo.name

export function repoHero(body: RepoBody): Hero | undefined {
  const top = body.summary.top
  if (!top || top.cost_share == null) return undefined
  return { value: fmtShare(top.cost_share), label: `of the period's spend went to ${repoName(top)}` }
}

/** The finding: which repository took what share of the spend and what it produced; who pays most per commit. */
export function repoFinding(body: RepoBody): string {
  const s = body.summary
  if (!s.sessions) return 'No agent session made a model request or a tool call in this period.'
  if (!s.top || s.cost_usd == null) {
    return `${plural(s.sessions, 'session')} in ${plural(s.repos, 'repository or folder', 'repositories or folders')}; ` +
      'no spend is reported for them, so no repository can be ranked by spend.'
  }
  const top = s.top
  let text = `${repoName(top)} took ${usd(top.cost_usd)} of ${usd(s.cost_usd)} at list price (${fmtShare(top.cost_share ?? 0)}) ` +
    `in ${plural(top.sessions, 'session')}, and produced ${plural(top.commits, 'commit')} and ${plural(top.files, 'changed file')}.`
  if (top.commits === 0) text += ' None of that spend ended in a commit.'
  const dear = s.dearest_per_commit, cheap = s.cheapest_per_commit
  if (dear && cheap && dear.repo !== cheap.repo && dear.cost_per_commit != null && cheap.cost_per_commit != null) {
    text += ` Per commit, ${repoName(dear)} spent ${usd(dear.cost_per_commit)} against ${usd(cheap.cost_per_commit)} in ${repoName(cheap)}` +
      ` (${(dear.cost_per_commit / cheap.cost_per_commit).toFixed(1)} times as much).`
  }
  if (s.idle_sessions) text += ` ${plural(s.idle_sessions, 'session')} changed no file and made no commit.`
  return text
}

/** One line for the repositories too small to compare, or ''. */
export function smallText(names: readonly string[]): string {
  if (!names.length) return ''
  const shown = names.slice(0, 6).join(', ')
  return `Too small to compare (fewer than 50 model requests): ${shown}${names.length > 6 ? ` and ${names.length - 6} more` : ''}.`
}

export const repoLines = (repo: Repo) => fmtLines(repo.lines_added, repo.lines_removed)
export const startedText = (repo: Repo) => repo.scripted + repo.person === 0 ? 'start not known'
  : `${fmtNum(repo.scripted)} by a script, ${fmtNum(repo.person)} by a person` +
    (repo.unclassified ? `, ${fmtNum(repo.unclassified)} not known` : '')
export const agentTime = (value: Num) => value == null ? 'not reported' : fmtHours(value)

// ─── Durations ─────────────────────────────────────────────────────────────────────────────────────────────────
export type SessionTimes = {
  sessions: number; timed: number; walled: number; changed: number; waits: number; requests: number; calls: number
  model_ms: Num; tool_ms: Num; agent_ms: Num; wait_ms: Num; p50_agent_ms: Num; p90_agent_ms: Num; max_agent_ms: Num
  p50_wall_ms: Num; p90_wall_ms: Num; max_wall_ms: Num; p50_first_change_ms: Num; p90_first_change_ms: Num
}
export type DurationRepo = SessionTimes & { repo: string; name: string; kind: 'repository' | 'folder'; agent_share: Num; small: boolean }
export type DurationTool = {
  name: string | null; program: boolean; calls: number; timed: number; total_ms: Num; p50_ms: Num; p95_ms: Num; failed: number
  failed_share: Num; repo: string | null; repo_name: string | null; repo_ms: Num; small: boolean
}
export type DurationModel = { model: string | null; requests: number; timed: number; total_ms: Num; p50_ms: Num; p95_ms: Num; small: boolean }
export type DurationBody = Base<'durations'> & {
  repos: DurationRepo[]; tools: DurationTool[]; models: DurationModel[]
  summary: SessionTimes & {
    top: Pick<DurationRepo, 'repo' | 'name' | 'kind' | 'sessions' | 'agent_ms' | 'agent_share' | 'p50_agent_ms'> | null
    top_tool: (DurationTool & { share: Num }) | null; slowest_tool: DurationTool | null; slowest_model: DurationModel | null
    small: string[]
  }
}

export const toolName = (tool: Pick<DurationTool, 'name' | 'program'>) =>
  tool.name ? (tool.program ? `${tool.name} (program)` : tool.name) : 'command with no program recorded'
export const span = (value: Num) => value == null ? 'not reported' : fmtMs(value)

export function durationHero(body: DurationBody): Hero | undefined {
  const s = body.summary
  if (!s.agent_ms) return undefined
  return { value: fmtHours(s.agent_ms), label: `of agent working time in ${plural(s.timed, 'session')}` +
    (s.top?.agent_share != null ? `, ${fmtShare(s.top.agent_share)} of it in ${repoName(s.top)}` : '') }
}

/** The finding: where the working time went, how long a session works, what waited, and the slowest thing to wait for. */
export function durationFinding(body: DurationBody): string {
  const s = body.summary
  if (!s.sessions) return 'No agent session made a model request or a tool call in this period.'
  if (!s.timed || s.agent_ms == null) {
    return `${plural(s.sessions, 'session')} in this period, but no tool recorded when their turns started and ended, so working time is not reported.`
  }
  let text = `Agents worked ${fmtHours(s.agent_ms)} in ${plural(s.timed, 'session')}`
  text += s.top ? `; ${repoName(s.top)} took ${fmtShare(s.top.agent_share ?? 0)} of it (${fmtHours(s.top.agent_ms)} in ${plural(s.top.sessions, 'session')}).`
    : '.'
  text += ` A session worked ${span(s.p50_agent_ms)} at the median and ${span(s.p90_agent_ms)} at the 90th percentile.`
  if (s.wait_ms) text += ` Between turns, sessions waited ${fmtHours(s.wait_ms)} for a person.`
  const tool = s.top_tool
  if (tool?.total_ms) {
    text += ` The most tool time went to ${toolName(tool)}: ${fmtHours(tool.total_ms)}` +
      (tool.share != null ? `, ${fmtShare(tool.share)} of all tool-call time` : '') +
      (tool.repo_name ? `, most of it in ${tool.repo_name}` : '') + '.'
  }
  const slow = s.slowest_model
  if (slow?.p95_ms != null) text += ` The slowest model was ${slow.model ?? 'not reported'}: 1 request in 20 took over ${span(slow.p95_ms)}.`
  return text
}

// ─── Changes and commits ───────────────────────────────────────────────────────────────────────────────────────
export const FILE_KINDS = [
  { id: 'source', label: 'source' }, { id: 'tests', label: 'tests' }, { id: 'docs', label: 'docs' },
  { id: 'config', label: 'config and data' }, { id: 'memory', label: 'memory and instructions' }, { id: 'other', label: 'other' },
] as const
export type FileKind = typeof FILE_KINDS[number]['id']
export type ChangeRepo = {
  repo: string; name: string; kind: 'repository' | 'folder'; sessions: number; change_sessions: number; commit_sessions: number
  uncommitted_sessions: number; writes: number; committed_writes: number; committed_share: Num; files: number; files_share: Num
  reworked: number; kinds: Record<FileKind, number>; lines_added: number; lines_removed: number; lines_unknown: number
  commits: number; commit_days: number; cost_usd: Num; agent_ms: Num; cost_per_commit: Num; time_per_commit_ms: Num; small: boolean
}
export type ChangeBrief = Pick<ChangeRepo, 'repo' | 'name' | 'kind' | 'files' | 'files_share' | 'writes' | 'committed_writes'
  | 'committed_share' | 'commits' | 'reworked' | 'cost_per_commit' | 'time_per_commit_ms' | 'change_sessions' | 'uncommitted_sessions'>
export type ReworkedFile = { repo: string; repo_name: string; path: string; kind: string; writes: number; sessions: number; most_in_session: number }
export type ChangeBody = Base<'changes'> & {
  repos: ChangeRepo[]; files: ReworkedFile[]; bins: { start: number; commits: number; writes: number }[]
  summary: {
    repos: number; writes: number; files: number; committed_writes: number; committed_share: Num; commits: number
    change_sessions: number; uncommitted_sessions: number; lines_added: number; lines_removed: number; reworked: number
    kinds: Record<FileKind, number>; top: ChangeBrief | null; most_uncommitted: ChangeBrief | null
    dearest_per_commit: ChangeBrief | null; cheapest_per_commit: ChangeBrief | null; top_file: ReworkedFile | null; small: string[]
  }
}

export const fileName = (path: string) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path

export function changeHero(body: ChangeBody): Hero | undefined {
  const s = body.summary
  if (!s.writes || s.committed_share == null) return undefined
  return { value: fmtShare(s.committed_share), label: `of ${plural(s.writes, 'file write')} by agents ended in a commit in the same session` }
}

/** The finding: how much was changed, what share was committed, where it was never committed, and what was redone. */
export function changeFinding(body: ChangeBody): string {
  const s = body.summary
  if (!s.writes) {
    return s.commits ? `Agents made ${plural(s.commits, 'commit')} but no file write is recorded in this period.`
      : 'No agent changed a file or made a commit in this period.'
  }
  let text = `Agents changed ${plural(s.files, 'file')} (${plural(s.writes, 'write')}, ${fmtLines(s.lines_added, s.lines_removed)} lines) ` +
    `in ${plural(s.change_sessions, 'session')}; ${fmtShare(s.committed_share ?? 0)} of the writes ended in a commit in the same session.`
  if (s.top) text += ` ${repoName(s.top)} holds ${fmtShare(s.top.files_share ?? 0)} of the changed files.`
  const open = s.most_uncommitted
  if (open && open.writes > open.committed_writes) {
    text += ` The most changes never committed are in ${repoName(open)}: ${plural(open.writes - open.committed_writes, 'write')}` +
      `, ${plural(open.uncommitted_sessions, 'session')} changed files and made no commit.`
  }
  const file = s.top_file
  if (s.reworked && file) {
    text += ` ${plural(s.reworked, 'file')} were written again and again; the most, ${fileName(file.path)}, ` +
      `${plural(file.writes, 'time')} in ${plural(file.sessions, 'session')}.`
  }
  return text
}

export const perCommit = (repo: Pick<ChangeRepo, 'cost_per_commit' | 'time_per_commit_ms' | 'commits'>) =>
  repo.cost_per_commit == null ? `${fmtNum(repo.commits)} commits, too few for a cost per commit`
    : `${fmtUsd(repo.cost_per_commit)} and ${repo.time_per_commit_ms == null ? 'working time not reported' : `${fmtMs(repo.time_per_commit_ms)} of working time`} per commit`
