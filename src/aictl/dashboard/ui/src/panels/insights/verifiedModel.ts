// ─── Verified before commit — the payload of /api/board/insights/verified and its sentence ─
// A count the tool does not record is null and reads "not reported", never 0.
import { fmtNum, fmtShare } from '../../design/format'
import type { BarRow } from './Bars'
import { NOT_REPORTED, plural, type Base, type Hero, type Label } from './insightsModel'
import { repoParts, type RepoSegment } from './repoSplit'

type Num = number | null
export type VerifiedTool = {
  tool: string
  commits: Num; passed: Num; unreported: Num; failed: Num; changed_after: Num; never_tested: Num; no_change: Num
  unknown_change: Num; not_recorded: Num; by_subagent: Num; own_unseen: Num; commit_sessions: Num; top_session_commits: Num
  edit_sessions: Num; untested_sessions: Num; commands: Num; commands_with_text: Num; test_runs: Num; test_results: Num
  remote_commits: Num; edits_no_file: Num; sessions_no_text: Num; sessions_edits_unrecorded: Num
  classified: Num; unseen: Num; checked: boolean; unseen_share: Num; own_unseen_share: Num; unchecked: Num
  /** Whether the tool records an exit code of 0, so that it can report a pass at all. */
  pass_tool: boolean
  /** The commit bar per repository (repoSplit.ts): `commits` and every class count; [] when commits are not reported. */
  repos?: RepoSegment[]
  /** The session bar per repository: `edit_sessions`, `untested_sessions`. */
  session_repos?: RepoSegment[]
}
export type VerifiedBody = Base<'verified'> & {
  tools: VerifiedTool[]
  summary: {
    commits: Num; classified: Num; unseen: Num; unseen_share: Num; own_unseen: Num; own_unseen_share: Num
    changed_after: Num; never_tested: Num; no_change: Num; failed: Num; passed: Num; unchecked: Num; edit_sessions: Num; untested_sessions: Num
    remote_commits: Num; sessions_no_text: Num; checked_tools: string[]; not_reported: string[]; not_classified: string[]
    one_session: string[]
  }
}

/** The parts of a tool's bar, left to right; each count is a field of the tool's row, and the rule that puts a commit in it. */
export type Segment = { id: string; label: string; count: (tool: VerifiedTool) => Num; rule: string; classified: boolean }
export const SEGMENTS: Segment[] = [
  { id: 'passed', label: 'Tested, passed', count: tool => tool.passed, classified: true,
    rule: 'a test run saw every source change before the commit, and the last such run exited 0' },
  { id: 'unreported', label: 'Tested, result not recorded', count: tool => tool.unreported, classified: true,
    rule: 'a test run saw every source change before the commit, and the last such run has no recorded result' },
  { id: 'failed', label: 'Tested, failed', count: tool => tool.failed, classified: true,
    rule: 'a test run saw every source change before the commit, and the last such run failed' },
  { id: 'changed_after', label: 'Changed after last test', count: tool => tool.changed_after, classified: true,
    rule: 'a test run came before the commit, and a source file changed after it' },
  { id: 'never_tested', label: 'Never tested', count: tool => tool.never_tested, classified: true,
    rule: 'a source file changed before the commit, and no test run came before it' },
  { id: 'no_change', label: 'No code change', count: tool => tool.no_change, classified: true,
    rule: 'no source file changed since the commit before it' },
  { id: 'unclassified', label: 'Not classified', classified: false,
    count: tool => tool.commits == null ? null : (tool.not_recorded ?? 0) + (tool.unknown_change ?? 0),
    rule: 'the tool did not record the session\'s edits, or the deciding change names no file' },
]

/** "211 · 42%": a segment's commits and their share of the tool's commits, written on the segment. */
export const segmentText = (tool: VerifiedTool, n: number) => `${fmtNum(n)} · ${fmtShare(tool.commits ? n / tool.commits : null)}`

/** The hover of one segment: its commits, their share of the tool's commits and of the classified ones, and the rule. */
export function segmentHover(tool: VerifiedTool, segment: Segment, label: Label) {
  const n = segment.count(tool) ?? 0
  const all = tool.commits ?? 0
  const classified = segment.classified && tool.checked && tool.classified
    ? `; ${fmtShare(n / tool.classified)} of the ${fmtNum(tool.classified)} classified ${tool.classified === 1 ? 'commit' : 'commits'}` : ''
  const parts = segment.classified ? '' : ` (edits not recorded ${fmtNum(tool.not_recorded ?? 0)}, file unknown ` +
    `${fmtNum(tool.unknown_change ?? 0)})`
  const sessions = !tool.commit_sessions ? '' : ` The tool's commits come from ${plural(tool.commit_sessions, 'session')}; ` +
    `the largest has ${commits(tool.top_session_commits ?? 0)}.`
  return `${label(tool.tool)} · ${segment.label}: ${fmtNum(n)} of ${commits(all)} (${fmtShare(all ? n / all : null)})${classified}` +
    `${parts}. Rule: ${segment.rule}.${sessions}`
}

/** A tool's sessions that changed source files, split by whether any recognised test ran in them; null when not reported. */
export function sessionSplit(tool: VerifiedTool): { tested: number; untested: number; total: number } | null {
  if (tool.untested_sessions == null || tool.edit_sessions == null || !tool.edit_sessions) return null
  return { tested: Math.max(0, tool.edit_sessions - tool.untested_sessions), untested: tool.untested_sessions, total: tool.edit_sessions }
}

/** The hover of one part of a tool's session bar. */
export function sessionHover(tool: VerifiedTool, part: 'tested' | 'untested', label: Label) {
  const split = sessionSplit(tool)
  if (!split) return `${label(tool.tool)}: ${untestedText(tool)}`
  const n = split[part]
  const what = part === 'tested' ? 'ran a recognised test' : 'ran no recognised test'
  return `${label(tool.tool)}: ${fmtNum(n)} of ${plural(split.total, 'session')} that changed source files ` +
    `(${fmtShare(n / split.total)}) ${what} in the period. A source change is an edit-tool write or an in-place shell edit ` +
    'of a file that is not documentation or data.'
}

const list = (items: readonly string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
const commits = (n: number) => `${fmtNum(n)} ${n === 1 ? 'commit' : 'commits'}`
/** "13 of 59 sessions that changed source files never tested", or why a tool has no such figure. */
export function untestedText(tool: VerifiedTool) {
  if (tool.untested_sessions == null) return 'sessions that never tested: not reported'
  if (!tool.edit_sessions) return 'no session changed source files'
  return `${fmtNum(tool.untested_sessions)} of ${fmtNum(tool.edit_sessions)} sessions that changed source files never tested`
}

/** Why a tool's bar has no pass count: the tool never records one, or no test run of the period has a result. */
export function passMissingText(tool: VerifiedTool) {
  return tool.pass_tool ? 'no test run with a recorded result in this period' : 'pass not recorded by this tool'
}

/** Per tool, "13 of the 59 Copilot CLI sessions": only tools that report sessions that changed source files. */
function untestedSessions(body: VerifiedBody, label: Label) {
  const parts = body.tools.filter(tool => tool.untested_sessions != null && tool.edit_sessions)
    .map(tool => `${fmtNum(tool.untested_sessions ?? 0)} of the ${fmtNum(tool.edit_sessions ?? 0)} ${label(tool.tool)} ${tool.edit_sessions === 1 ? 'session' : 'sessions'}`)
  return parts.length ? `${list(parts)} that changed source files never ran a recognised test` : ''
}

/** The share on a tool's bar: commits no test run saw, or why there is none. */
export function shareText(tool: VerifiedTool) {
  if (tool.commits == null) return 'commits not reported: command text not kept'
  if (!tool.commits) return 'no commit'
  if (!tool.checked) return 'not classified: edits not recorded'
  const own = tool.own_unseen_share == null ? '' : ` (own agent ${fmtShare(tool.own_unseen_share)})`
  return `${fmtShare(tool.unseen_share)} no test saw${own} · ${fmtNum(tool.unseen)} of ${fmtNum(tool.classified)} classified`
}

export function verifiedFinding(body: VerifiedBody, label: Label) {
  const s = body.summary
  if (s.commits == null) {
    return s.not_reported.length ? `The sources in this period keep no command text (${list(s.not_reported.map(label))}), so their commits cannot be seen.`
      : 'No agent commit in this period.'
  }
  // Per tool: a total would credit the untested sessions of a tool that is not named to the tools that are.
  const untested = untestedSessions(body, label)
  if (!s.commits) return untested ? `No agent commit in this period; ${untested}.` : 'No agent commit in this period.'
  const names = s.checked_tools.length && s.checked_tools.length <= 2 ? `${list(s.checked_tools.map(label))} ` : ''
  const own = s.own_unseen_share == null ? '' : ` (${fmtShare(s.own_unseen_share)} with the committing agent's own edits and tests alone)`
  const noChange = s.no_change ?? 0
  const main = !s.classified ? `None of the ${commits(s.commits)} in this period is classified`
    : noChange >= s.classified
      ? `None of the ${fmtNum(s.classified)} ${names}${s.classified === 1 ? 'commit' : 'commits'} that can be checked followed a source change`
      : `${fmtNum(s.unseen ?? 0)} of the ${fmtNum(s.classified)} ${names}commits that can be checked (${fmtShare(s.unseen_share)}) ` +
        `were made after source changes no test run had seen${own}`
  // When most checked commits followed no source change, the share rests on the few that did.
  const unchanged = s.classified && noChange && noChange < s.classified && noChange * 2 >= s.classified
    ? ` ${fmtNum(noChange)} of the ${fmtNum(s.classified)} checked commits followed no source change.` : ''
  const more = s.classified && s.unchecked
    ? ` ${fmtNum(s.unchecked)} more ${s.unchecked === 1 ? 'commit is' : 'commits are'} not classified: the tool did not record what ${s.unchecked === 1 ? 'it' : 'they'} changed.`
    : ''
  const why = !s.classified ? ' (the tool did not record what they changed)' : ''
  const failed = s.failed ? ` ${commits(s.failed)} followed a failing test run with no source change in between.` : ''
  const one = s.one_session.map(name => {
    const row = body.tools.find(tool => tool.tool === name)
    return row?.commits && row.top_session_commits != null
      ? ` ${fmtNum(row.top_session_commits)} of ${label(name)}'s ${commits(row.commits)} come from one session.`
      : ` Most of ${label(name)}'s commits come from one session.`
  }).join('')
  return `${main}${untested ? `${why}, and ${untested}` : why}.${unchanged}${more}${failed}${one}`
}

export function verifiedHero(body: VerifiedBody): Hero | undefined {
  const s = body.summary
  if (s.unseen_share == null || s.classified == null || s.unseen == null) return undefined
  // No checked commit followed a source change: a 0% would read as "all tested".
  if ((s.no_change ?? 0) >= s.classified) return undefined
  return { value: fmtShare(s.unseen_share),
    label: `of classified agent commits were made after source changes no test run saw (${fmtNum(s.unseen)} of ${fmtNum(s.classified)})` }
}

const segmentCount = (segment: RepoSegment, key: string) => typeof segment[key] === 'number' ? segment[key] as number : null
/** One repository's commits by class, in the order of the bar above: "Tested, passed 3 · … · Not classified 1". A class the
 * tool does not record reads "not reported". */
export function repoClasses(segment: RepoSegment) {
  return SEGMENTS.map(item => {
    const n = item.id === 'unclassified'
      ? (segmentCount(segment, 'not_recorded') ?? 0) + (segmentCount(segment, 'unknown_change') ?? 0) : segmentCount(segment, item.id)
    return `${item.label} ${n == null ? NOT_REPORTED : fmtNum(n)}`
  }).join(' · ')
}

/** Each repository's part of a bar, with `extra` (that repository's other figures) before `detail` (the bar's own). */
function splitParts(segments: RepoSegment[], key: string, body: VerifiedBody, unit: string, bar: string, measure: string,
  extra: (segment: RepoSegment) => string, detail: string) {
  return repoParts(segments, key, body.repo_order, value => plural(value, unit), bar, measure).map(part => {
    const segment = segments.find(item => `repo:${item.repo}` === part.key)!
    return { ...part, hover: `${part.hover} ${extra(segment)} ${detail}` }
  })
}

/** Per tool with commits, its commits in a segment per repository: the second bar under the bar by class. */
export function commitRepoRows(body: VerifiedBody, label: Label): BarRow[] {
  return body.tools.filter(tool => tool.commits && tool.repos?.length).map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: shareText(tool), total: commits(tool.commits ?? 0),
    parts: splitParts(tool.repos!, 'commits', body, 'commit', `${label(tool.tool)}, agent commits`, 'agent commits',
      segment => `By what test runs saw: ${repoClasses(segment)}.`,
      `${label(tool.tool)}: ${commits(tool.commits ?? 0)} in all.`),
  }))
}

/** Per tool, its sessions that changed source files in a segment per repository: the second bar under tested / untested. */
export function sessionRepoRows(body: VerifiedBody, label: Label): BarRow[] {
  return body.tools.filter(tool => tool.edit_sessions && tool.session_repos?.length).map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: untestedText(tool), total: plural(tool.edit_sessions ?? 0, 'session'),
    parts: splitParts(tool.session_repos!, 'edit_sessions', body, 'session', `${label(tool.tool)}, sessions that changed source files`,
      'sessions that changed source files', segment => {
        const untested = segmentCount(segment, 'untested_sessions')
        return `${untested == null ? NOT_REPORTED : fmtNum(untested)} of them ran no recognised test.`
      }, `${label(tool.tool)}: ${untestedText(tool)}.`),
  }))
}
