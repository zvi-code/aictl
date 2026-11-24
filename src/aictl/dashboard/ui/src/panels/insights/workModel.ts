// ─── The work itself — the payloads of /api/board/insights/{repos,...} and the finding each card states ─
// The primary split is the repository (or the folder, where no repository is known). A figure the source does
// not report is null and reads "not reported", never 0. A repository marked `small` has too little data to compare:
// it never drives a headline or a coloured cell.
import { fmtHours, fmtLines, fmtNum, fmtShare, fmtUsd } from '../../design/format'
import type { Base, Hero } from './insightsModel'

type Num = number | null
export type WorkCardId = 'repos'

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
export type WorkBody = RepoBody

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
